-- Fresh install only. Run with a role allowed to create schemas and NOLOGIN roles.
-- No credentials and no tenant/raw tables are used. The Finder starts disabled.
BEGIN;
DO $roles$
BEGIN
  IF EXISTS (SELECT FROM pg_roles WHERE rolname IN ('finder_owner', 'finder_runtime', 'finder_importer')) THEN
    RAISE EXCEPTION 'Finder roles already exist: review ownership and memberships before a fresh install';
  END IF;
  CREATE ROLE finder_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  CREATE ROLE finder_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  CREATE ROLE finder_importer NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  EXECUTE format('GRANT finder_owner TO %I', current_user);
END
$roles$;
CREATE SCHEMA finder_private AUTHORIZATION finder_owner;
CREATE SCHEMA finder_api AUTHORIZATION finder_owner;
REVOKE ALL ON SCHEMA finder_private, finder_api FROM PUBLIC;
SET LOCAL ROLE finder_owner;
ALTER DEFAULT PRIVILEGES IN SCHEMA finder_private REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA finder_api REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

CREATE TABLE finder_private.control (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  enabled boolean NOT NULL DEFAULT false,
  source_enabled boolean NOT NULL DEFAULT true
);
INSERT INTO finder_private.control DEFAULT VALUES;
CREATE TABLE finder_private.postcodes (
  postcode text PRIMARY KEY CHECK (postcode ~ '^[0-9]{5}$' AND postcode <> '00000'),
  lat double precision NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lon double precision NOT NULL CHECK (lon BETWEEN -180 AND 180),
  provenance text NOT NULL CHECK (length(provenance) BETWEEN 1 AND 240),
  license text NOT NULL CHECK (length(license) BETWEEN 1 AND 240)
);
CREATE TABLE finder_private.units (
  canonical_id text PRIMARY KEY,
  public_id text NOT NULL UNIQUE,
  version text NOT NULL,
  candidate jsonb NOT NULL,
  deadline_at timestamptz NOT NULL,
  checked_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked boolean NOT NULL DEFAULT false
);
CREATE TABLE finder_private.revocations (canonical_id text PRIMARY KEY, observed_at timestamptz NOT NULL);
CREATE INDEX revocations_expiry_idx ON finder_private.revocations (observed_at);
CREATE INDEX units_eligible_idx ON finder_private.units (expires_at, deadline_at) WHERE NOT revoked;
CREATE TABLE finder_private.budgets (id text PRIMARY KEY, issued_at timestamptz NOT NULL);
CREATE INDEX budgets_expiry_idx ON finder_private.budgets (issued_at);
CREATE TABLE finder_private.sessions (
  id text PRIMARY KEY, budget_id text NOT NULL REFERENCES finder_private.budgets(id) ON DELETE CASCADE,
  issued_at timestamptz NOT NULL, ip_hash text NOT NULL, created_at timestamptz NOT NULL
);
CREATE INDEX sessions_expiry_idx ON finder_private.sessions (issued_at);
CREATE INDEX sessions_ip_time_idx ON finder_private.sessions (ip_hash, created_at);
CREATE TABLE finder_private.requests (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  happened_at timestamptz NOT NULL,
  kind text NOT NULL CHECK (kind IN ('entry', 'search')),
  ip_hash text NOT NULL, session_id text, budget_id text,
  new_search boolean NOT NULL DEFAULT false, postcode text
);
CREATE INDEX requests_time_idx ON finder_private.requests (kind, happened_at);
CREATE INDEX requests_ip_idx ON finder_private.requests (kind, ip_hash, happened_at);
CREATE INDEX requests_session_idx ON finder_private.requests (session_id, happened_at) WHERE kind = 'search';
CREATE INDEX requests_budget_idx ON finder_private.requests (budget_id, happened_at) WHERE new_search;
CREATE TABLE finder_private.exposures (
  scope text NOT NULL CHECK (scope IN ('budget', 'ip')),
  subject text NOT NULL, canonical_id text NOT NULL, first_seen timestamptz NOT NULL,
  PRIMARY KEY (scope, subject, canonical_id)
);
CREATE INDEX exposures_window_idx ON finder_private.exposures (scope, subject, first_seen);
CREATE INDEX exposures_expiry_idx ON finder_private.exposures (first_seen);
CREATE INDEX exposures_global_idx ON finder_private.exposures (scope, first_seen);
CREATE TABLE finder_private.snapshots (
  id uuid PRIMARY KEY, budget_id text NOT NULL, session_id text NOT NULL,
  postcode text NOT NULL, radius_km integer NOT NULL, created_at timestamptz NOT NULL,
  units jsonb NOT NULL CHECK (jsonb_array_length(units) <= 20)
);
CREATE INDEX snapshots_expiry_idx ON finder_private.snapshots (created_at);

-- Every mutating function uses this one transaction-level lock, including imports/revokes.
-- Try-lock denies contention immediately: at most one active Finder DB operation globally.
CREATE FUNCTION finder_private.try_lock() RETURNS boolean LANGUAGE sql VOLATILE
SET search_path = pg_catalog, finder_private
AS $$ SELECT pg_try_advisory_xact_lock(1936028270, 1718183012) $$;
CREATE FUNCTION finder_private.denied(p_reason text, p_retry integer DEFAULT 60) RETURNS jsonb
LANGUAGE sql IMMUTABLE SET search_path = pg_catalog, finder_private
AS $$ SELECT jsonb_build_object('allowed', false, 'reason', p_reason, 'retryAfterSeconds', p_retry) $$;
CREATE FUNCTION finder_private.valid_hash(p_value text) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path = pg_catalog, finder_private
AS $$ SELECT coalesce(p_value ~ '^[a-f0-9]{64}$', false) $$;

-- Explicit shape validation prevents an import from smuggling arbitrary/raw fields through JSON.
CREATE FUNCTION finder_private.valid_candidate(c jsonb) RETURNS boolean LANGUAGE plpgsql STABLE
SET search_path = pg_catalog, finder_private
AS $function$
DECLARE loc jsonb; due_at timestamptz; checked_at timestamptz; expires_at timestamptz;
BEGIN
  IF jsonb_typeof(c) IS DISTINCT FROM 'object' OR octet_length(c::text) > 20000 THEN RETURN false; END IF;
  IF EXISTS (SELECT FROM jsonb_object_keys(c) AS k WHERE k NOT IN ('publicId','canonicalUnitId','version','title','serviceLabel','sourceId','sourceUrl','publicProvenance','redistributionApproved','cleaningRelevanceApproved','noticeFormType','lifecycle','isCurrentVersion','unresolvedChangeOrClosure','deadline','sourceStatusCheckedAt','sourceEvidenceDigest','eligibilityExpiresAt','revoked','locations')) THEN RETURN false; END IF;
  IF EXISTS (SELECT FROM unnest(ARRAY['publicId','canonicalUnitId','version','title','serviceLabel','sourceId','sourceUrl','noticeFormType','lifecycle','sourceStatusCheckedAt','sourceEvidenceDigest','eligibilityExpiresAt']) k WHERE jsonb_typeof(c->k) IS DISTINCT FROM 'string') THEN RETURN false; END IF;
  IF (c->>'publicId' ~ '^[A-Za-z0-9_-]{20,64}$'
    AND length(btrim(c->>'canonicalUnitId')) BETWEEN 1 AND 160
    AND length(btrim(c->>'version')) BETWEEN 1 AND 160
    AND length(btrim(c->>'title')) BETWEEN 1 AND 240
    AND length(btrim(c->>'serviceLabel')) BETWEEN 1 AND 100
    AND c->>'sourceId' = 'ted'
    AND c->>'sourceUrl' ~ '^https://ted[.]europa[.]eu/(de|en)/notice/-/detail/[0-9]{1,8}-[0-9]{4}$'
    AND c->'publicProvenance' = 'true'::jsonb AND c->'redistributionApproved' = 'true'::jsonb
    AND c->'cleaningRelevanceApproved' = 'true'::jsonb AND c->'isCurrentVersion' = 'true'::jsonb
    AND c->'unresolvedChangeOrClosure' = 'false'::jsonb AND c->'revoked' = 'false'::jsonb
    AND c->>'noticeFormType' = 'competition' AND c->>'lifecycle' = 'open'
    AND jsonb_typeof(c->'deadline') = 'object'
    AND c#>>'{deadline,kind}' IN ('tender', 'request')
    AND c#>>'{deadline,accuracy}' = 'source_explicit_datetime'
    AND c#>'{deadline,sourceVerified}' = 'true'::jsonb AND c#>'{deadline,timezoneKnown}' = 'true'::jsonb
    AND length(btrim(c->>'sourceEvidenceDigest')) BETWEEN 1 AND 256
    AND jsonb_typeof(c->'locations') = 'array') IS NOT TRUE THEN RETURN false; END IF;
  IF EXISTS (SELECT FROM jsonb_object_keys(c->'deadline') AS k WHERE k NOT IN ('kind','at','accuracy','sourceVerified','timezoneKnown')) THEN RETURN false; END IF;
  IF EXISTS (SELECT FROM unnest(ARRAY['kind','at','accuracy']) k WHERE jsonb_typeof(c->'deadline'->k) IS DISTINCT FROM 'string') THEN RETURN false; END IF;
  IF jsonb_array_length(c->'locations') NOT BETWEEN 1 AND 20 THEN RETURN false; END IF;
  IF (c#>>'{deadline,at}' ~ 'T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]+)?(Z|[+-][0-9]{2}:[0-9]{2})$'
    AND c->>'sourceStatusCheckedAt' ~ 'T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]+)?(Z|[+-][0-9]{2}:[0-9]{2})$'
    AND c->>'eligibilityExpiresAt' ~ 'T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]+)?(Z|[+-][0-9]{2}:[0-9]{2})$') IS NOT TRUE THEN RETURN false; END IF;
  due_at := (c#>>'{deadline,at}')::timestamptz;
  checked_at := (c->>'sourceStatusCheckedAt')::timestamptz;
  expires_at := (c->>'eligibilityExpiresAt')::timestamptz;
  IF NOT isfinite(due_at) OR NOT isfinite(checked_at) OR NOT isfinite(expires_at)
    OR expires_at > due_at OR expires_at > checked_at + interval '24 hours' OR expires_at <= checked_at THEN RETURN false; END IF;
  FOR loc IN SELECT value FROM jsonb_array_elements(c->'locations') LOOP
    IF jsonb_typeof(loc) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
    IF EXISTS (SELECT FROM jsonb_object_keys(loc) AS k WHERE k NOT IN ('lat','lon','label','role','provenanceVerified','accuracy')) THEN RETURN false; END IF;
    IF EXISTS (SELECT FROM unnest(ARRAY['label','role','accuracy']) k WHERE jsonb_typeof(loc->k) IS DISTINCT FROM 'string') THEN RETURN false; END IF;
    IF (loc->>'role' = 'performance' AND loc->'provenanceVerified' = 'true'::jsonb
      AND loc->>'accuracy' IN ('verified_object','verified_performance_postcode_centroid','verified_performance_postcode_reference')
      AND length(btrim(loc->>'label')) BETWEEN 1 AND 160
      AND jsonb_typeof(loc->'lat') = 'number' AND jsonb_typeof(loc->'lon') = 'number'
      AND (loc->>'lat')::double precision BETWEEN -90 AND 90
      AND (loc->>'lon')::double precision BETWEEN -180 AND 180) IS NOT TRUE THEN RETURN false; END IF;
  END LOOP;
  RETURN true;
EXCEPTION WHEN OTHERS THEN RETURN false;
END
$function$;
CREATE FUNCTION finder_private.current_unit(u finder_private.units, p_now timestamptz) RETURNS boolean
LANGUAGE sql STABLE SET search_path = pg_catalog, finder_private
AS $$ SELECT NOT u.revoked AND u.deadline_at > p_now AND u.checked_at <= p_now AND u.expires_at > p_now
  AND u.checked_at >= p_now - CASE WHEN u.deadline_at <= p_now + interval '48 hours' THEN interval '1 hour' ELSE interval '24 hours' END
  AND u.expires_at <= least(u.deadline_at, u.checked_at + CASE WHEN u.deadline_at <= p_now + interval '48 hours' THEN interval '1 hour' ELSE interval '24 hours' END)
  AND finder_private.valid_candidate(u.candidate) $$;
CREATE FUNCTION finder_private.distance(p_lat double precision, p_lon double precision, p_loc jsonb) RETURNS double precision
LANGUAGE sql IMMUTABLE SET search_path = pg_catalog, finder_private
AS $$ SELECT 6371.0 * 2 * asin(sqrt(least(1.0, greatest(0.0,
  power(sin(radians((p_loc->>'lat')::double precision - p_lat) / 2), 2)
  + cos(radians(p_lat)) * cos(radians((p_loc->>'lat')::double precision))
  * power(sin(radians((p_loc->>'lon')::double precision - p_lon) / 2), 2))))) $$;

-- Cleanup is also separately callable by an operator when there is no website traffic.
CREATE FUNCTION finder_private.cleanup(p_now timestamptz) RETURNS void LANGUAGE plpgsql
SET search_path = pg_catalog, finder_private
AS $function$
BEGIN
  DELETE FROM finder_private.snapshots WHERE created_at <= p_now - interval '5 minutes';
  DELETE FROM finder_private.requests WHERE happened_at <= p_now - interval '24 hours';
  DELETE FROM finder_private.sessions WHERE issued_at <= p_now - interval '24 hours';
  DELETE FROM finder_private.exposures WHERE first_seen <= p_now - interval '30 days'
    OR (scope = 'budget' AND subject IN (SELECT id FROM finder_private.budgets WHERE issued_at <= p_now - interval '30 days'));
  DELETE FROM finder_private.budgets WHERE issued_at <= p_now - interval '30 days';
  DELETE FROM finder_private.revocations WHERE observed_at <= p_now - interval '30 days';
  DELETE FROM finder_private.units WHERE expires_at <= p_now - interval '30 days';
END
$function$;

CREATE FUNCTION finder_api.entry(p_ip_hash text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, finder_private
AS $function$
DECLARE t timestamptz := clock_timestamp();
BEGIN
  IF NOT finder_private.valid_hash(p_ip_hash) THEN RETURN finder_private.denied('unavailable'); END IF;
  IF NOT finder_private.try_lock() THEN RETURN finder_private.denied('unavailable', 1); END IF;
  PERFORM finder_private.cleanup(t);
  IF NOT EXISTS (SELECT FROM finder_private.control WHERE enabled AND source_enabled) THEN RETURN finder_private.denied('unavailable'); END IF;
  IF (SELECT count(*) FROM finder_private.requests WHERE kind = 'entry' AND happened_at > t - interval '1 minute') >= 300
    OR (SELECT count(*) FROM finder_private.requests WHERE kind = 'entry' AND happened_at > t - interval '24 hours') >= 10000
    OR (SELECT count(*) FROM finder_private.requests WHERE kind = 'entry' AND ip_hash = p_ip_hash AND happened_at > t - interval '1 minute') >= 120
    THEN RETURN finder_private.denied('limited'); END IF;
  INSERT INTO finder_private.requests(happened_at, kind, ip_hash) VALUES (t, 'entry', p_ip_hash);
  RETURN jsonb_build_object('allowed', true);
END
$function$;

CREATE FUNCTION finder_api.search(
  p_budget_hash text, p_session_hash text, p_ip_hash text,
  p_budget_issued_at timestamptz, p_session_issued_at timestamptz,
  p_postcode text, p_radius_km integer, p_after text DEFAULT NULL, p_snapshot text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, finder_private
AS $function$
DECLARE
  t timestamptz := clock_timestamp(); origin finder_private.postcodes; snap finder_private.snapshots;
  refs jsonb; page_candidates jsonb; ids text[]; snap_id uuid; page_number integer;
  new_budget integer; new_ip integer; new_session boolean; next_after text := NULL;
BEGIN
  IF NOT finder_private.valid_hash(p_budget_hash) OR NOT finder_private.valid_hash(p_session_hash) OR NOT finder_private.valid_hash(p_ip_hash)
    OR p_budget_issued_at IS NULL OR p_session_issued_at IS NULL OR NOT isfinite(p_budget_issued_at) OR NOT isfinite(p_session_issued_at)
    OR p_budget_issued_at > t OR p_budget_issued_at <= t - interval '30 days'
    OR p_session_issued_at < p_budget_issued_at OR p_session_issued_at > t OR p_session_issued_at <= t - interval '24 hours'
    THEN RETURN finder_private.denied('unavailable'); END IF;
  IF (p_postcode ~ '^[0-9]{5}$' AND p_postcode <> '00000' AND p_radius_km IN (10,25,50,100)) IS NOT TRUE THEN RETURN finder_private.denied('invalid_query', 1); END IF;
  IF NOT finder_private.try_lock() THEN RETURN finder_private.denied('unavailable', 1); END IF;
  PERFORM finder_private.cleanup(t);
  IF NOT EXISTS (SELECT FROM finder_private.control WHERE enabled AND source_enabled) THEN RETURN finder_private.denied('unavailable'); END IF;
  IF EXISTS (SELECT FROM finder_private.budgets WHERE id = p_budget_hash AND issued_at <> p_budget_issued_at)
    OR EXISTS (SELECT FROM finder_private.sessions WHERE id = p_session_hash AND (budget_id <> p_budget_hash OR issued_at <> p_session_issued_at))
    THEN RETURN finder_private.denied('unavailable'); END IF;
  new_session := NOT EXISTS (SELECT FROM finder_private.sessions WHERE id = p_session_hash);
  IF new_session AND (SELECT count(*) FROM finder_private.sessions WHERE ip_hash = p_ip_hash AND created_at > t - interval '10 minutes') >= 10 THEN RETURN finder_private.denied('limited', 600); END IF;
  IF (SELECT count(*) FROM finder_private.requests WHERE kind = 'search' AND happened_at > t - interval '1 minute') >= 300
    OR (SELECT count(*) FROM finder_private.requests WHERE kind = 'search' AND happened_at > t - interval '24 hours') >= 10000
    OR (SELECT count(*) FROM finder_private.requests WHERE kind = 'search' AND ip_hash = p_ip_hash AND happened_at > t - interval '1 minute') >= 120
    OR (SELECT count(*) FROM finder_private.requests WHERE kind = 'search' AND session_id = p_session_hash AND happened_at > t - interval '1 minute') >= 6
    OR (SELECT count(*) FROM finder_private.requests WHERE kind = 'search' AND session_id = p_session_hash AND happened_at > t - interval '1 hour') >= 30
    OR (SELECT count(*) FROM finder_private.requests WHERE kind = 'search' AND session_id = p_session_hash AND happened_at > t - interval '24 hours') >= 60
    THEN RETURN finder_private.denied('limited'); END IF;
  INSERT INTO finder_private.budgets VALUES (p_budget_hash, p_budget_issued_at) ON CONFLICT DO NOTHING;
  INSERT INTO finder_private.sessions VALUES (p_session_hash, p_budget_hash, p_session_issued_at, p_ip_hash, t) ON CONFLICT DO NOTHING;
  -- Even invalid cursor/unknown postcode/denied exposure consumes a data-request budget.
  INSERT INTO finder_private.requests(happened_at,kind,ip_hash,session_id,budget_id)
    VALUES (t,'search',p_ip_hash,p_session_hash,p_budget_hash);
  SELECT * INTO origin FROM finder_private.postcodes WHERE postcode = p_postcode;
  IF NOT FOUND THEN RETURN finder_private.denied('unknown_postcode', 1); END IF;
  IF p_after IS NOT NULL OR p_snapshot IS NOT NULL THEN
    IF p_after IS DISTINCT FROM '2' OR p_snapshot IS NULL OR p_snapshot !~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$' THEN RETURN finder_private.denied('invalid_cursor', 1); END IF;
    SELECT * INTO snap FROM finder_private.snapshots WHERE id = p_snapshot::uuid AND budget_id = p_budget_hash AND session_id = p_session_hash
      AND postcode = p_postcode AND radius_km = p_radius_km AND created_at > t - interval '5 minutes';
    IF NOT FOUND OR jsonb_array_length(snap.units) <= 10 THEN RETURN finder_private.denied('invalid_cursor', 1); END IF;
    refs := snap.units; snap_id := snap.id; page_number := 2;
  ELSE
    IF (SELECT count(*) FROM finder_private.requests WHERE budget_id = p_budget_hash AND new_search AND happened_at > t - interval '24 hours') >= 8
      OR ((SELECT count(DISTINCT postcode) FROM finder_private.requests WHERE budget_id = p_budget_hash AND new_search AND happened_at > t - interval '24 hours') >= 3
        AND NOT EXISTS (SELECT FROM finder_private.requests WHERE budget_id = p_budget_hash AND new_search AND postcode = p_postcode AND happened_at > t - interval '24 hours'))
      THEN RETURN finder_private.denied('limited', 3600); END IF;
    UPDATE finder_private.requests SET new_search = true, postcode = p_postcode WHERE id = currval('finder_private.requests_id_seq'::regclass);
    SELECT coalesce(jsonb_agg(jsonb_build_object('id', chosen.canonical_id, 'version', chosen.version) ORDER BY chosen.deadline_at, chosen.canonical_id), '[]'::jsonb) INTO refs
      FROM (SELECT u.canonical_id,u.version,u.deadline_at FROM finder_private.units u
        WHERE finder_private.current_unit(u,t) AND EXISTS (SELECT FROM jsonb_array_elements(u.candidate->'locations') l WHERE finder_private.distance(origin.lat,origin.lon,l) <= p_radius_km)
        ORDER BY u.deadline_at,u.canonical_id LIMIT 20) chosen;
    snap_id := gen_random_uuid(); page_number := 1;
    INSERT INTO finder_private.snapshots VALUES (snap_id,p_budget_hash,p_session_hash,p_postcode,p_radius_km,t,refs);
    IF jsonb_array_length(refs) > 10 THEN next_after := '2'; END IF;
  END IF;
  -- No backfill on page 2: changed/revoked versions disappear instead of shifting inventory.
  SELECT coalesce(jsonb_agg(u.candidate ORDER BY r.ordinality), '[]'::jsonb), coalesce(array_agg(u.canonical_id ORDER BY r.ordinality), ARRAY[]::text[])
    INTO page_candidates, ids
    FROM jsonb_array_elements(refs) WITH ORDINALITY r(value,ordinality)
    JOIN finder_private.units u ON u.canonical_id = r.value->>'id' AND u.version = r.value->>'version'
    WHERE r.ordinality BETWEEN (page_number - 1) * 10 + 1 AND page_number * 10
      AND finder_private.current_unit(u,clock_timestamp())
      AND EXISTS (SELECT FROM jsonb_array_elements(u.candidate->'locations') l WHERE finder_private.distance(origin.lat,origin.lon,l) <= p_radius_km);
  SELECT count(*) INTO new_budget FROM unnest(ids) id WHERE NOT EXISTS (SELECT FROM finder_private.exposures e WHERE e.scope='budget' AND e.subject=p_budget_hash AND e.canonical_id=id);
  SELECT count(*) INTO new_ip FROM unnest(ids) id WHERE NOT EXISTS (SELECT FROM finder_private.exposures e WHERE e.scope='ip' AND e.subject=p_ip_hash AND e.canonical_id=id);
  IF (SELECT count(*) FROM finder_private.exposures WHERE scope='budget' AND subject=p_budget_hash AND first_seen > t - interval '24 hours') + new_budget > 20
    OR (SELECT count(*) FROM finder_private.exposures WHERE scope='budget' AND subject=p_budget_hash) + new_budget > 60
    OR (SELECT count(*) FROM finder_private.exposures WHERE scope='ip' AND subject=p_ip_hash AND first_seen > t - interval '24 hours') + new_ip > 40
    OR (SELECT count(*) FROM finder_private.exposures WHERE scope='ip' AND subject=p_ip_hash AND first_seen > t - interval '30 days') + new_ip > 120
    OR (SELECT count(*) FROM finder_private.exposures WHERE scope='budget' AND first_seen > t - interval '24 hours') + new_budget > 30000
    THEN RETURN finder_private.denied('limited', 3600); END IF;
  INSERT INTO finder_private.exposures SELECT 'budget',p_budget_hash,id,t FROM unnest(ids) id ON CONFLICT DO NOTHING;
  INSERT INTO finder_private.exposures SELECT 'ip',p_ip_hash,id,t FROM unnest(ids) id ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('allowed',true,'candidates',page_candidates,'snapshot',snap_id::text,'nextAfter',next_after,'origin',jsonb_build_object('lat',origin.lat,'lon',origin.lon));
END
$function$;

CREATE FUNCTION finder_api.import_batch(p_candidates jsonb, p_revoked_ids jsonb DEFAULT '[]'::jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, finder_private
AS $function$
DECLARE c jsonb; unit_id text; imported integer := 0; revoked_count integer := 0; changed integer;
BEGIN
  IF jsonb_typeof(p_candidates) IS DISTINCT FROM 'array' OR jsonb_typeof(p_revoked_ids) IS DISTINCT FROM 'array'
    OR jsonb_array_length(p_candidates) > 100 OR jsonb_array_length(p_revoked_ids) > 100 OR octet_length(p_candidates::text) > 2000000 THEN RAISE EXCEPTION 'Invalid bounded import'; END IF;
  IF NOT finder_private.try_lock() THEN RAISE EXCEPTION 'Finder busy'; END IF;
  PERFORM finder_private.cleanup(clock_timestamp());
  FOR c IN SELECT value FROM jsonb_array_elements(p_candidates) LOOP
    IF NOT finder_private.valid_candidate(c) THEN RAISE EXCEPTION 'Invalid public candidate'; END IF;
    -- Stale imports must never replace newer verified evidence or lift a newer revocation.
    IF EXISTS (SELECT FROM finder_private.revocations WHERE canonical_id = c->>'canonicalUnitId' AND (c->>'sourceStatusCheckedAt')::timestamptz <= observed_at)
      OR EXISTS (SELECT FROM finder_private.units WHERE canonical_id = c->>'canonicalUnitId' AND ((c->>'sourceStatusCheckedAt')::timestamptz < checked_at OR (revoked AND (c->>'sourceStatusCheckedAt')::timestamptz <= checked_at))) THEN RAISE EXCEPTION 'Stale candidate'; END IF;
    INSERT INTO finder_private.units(canonical_id,public_id,version,candidate,deadline_at,checked_at,expires_at,revoked)
      VALUES(c->>'canonicalUnitId',c->>'publicId',c->>'version',c,(c#>>'{deadline,at}')::timestamptz,(c->>'sourceStatusCheckedAt')::timestamptz,(c->>'eligibilityExpiresAt')::timestamptz,false)
      ON CONFLICT (canonical_id) DO UPDATE SET public_id=EXCLUDED.public_id,version=EXCLUDED.version,candidate=EXCLUDED.candidate,deadline_at=EXCLUDED.deadline_at,checked_at=EXCLUDED.checked_at,expires_at=EXCLUDED.expires_at,revoked=false;
    imported := imported + 1;
  END LOOP;
  FOR c IN SELECT value FROM jsonb_array_elements(p_revoked_ids) LOOP
    IF jsonb_typeof(c) IS DISTINCT FROM 'string' OR length(btrim(c#>>'{}')) NOT BETWEEN 1 AND 160 THEN RAISE EXCEPTION 'Invalid revocation ID'; END IF;
    unit_id := c#>>'{}';
    INSERT INTO finder_private.revocations VALUES (unit_id,clock_timestamp()) ON CONFLICT (canonical_id) DO UPDATE SET observed_at=EXCLUDED.observed_at;
    UPDATE finder_private.units SET revoked=true,checked_at=greatest(checked_at,clock_timestamp()) WHERE canonical_id=unit_id;
    GET DIAGNOSTICS changed = ROW_COUNT; revoked_count := revoked_count + changed;
  END LOOP;
  IF (SELECT count(*) FROM finder_private.units) > 1000 OR (SELECT count(*) FROM finder_private.revocations) > 1000 THEN RAISE EXCEPTION 'Pilot projection capacity exceeded'; END IF;
  RETURN jsonb_build_object('imported',imported,'revoked',revoked_count);
END
$function$;
CREATE FUNCTION finder_api.import_postcodes(p_rows jsonb) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, finder_private
AS $function$
DECLARE r jsonb; n integer := 0;
BEGIN
  IF jsonb_typeof(p_rows) IS DISTINCT FROM 'array' OR jsonb_array_length(p_rows) > 1000 OR octet_length(p_rows::text) > 500000 THEN RAISE EXCEPTION 'Invalid postcode batch'; END IF;
  IF NOT finder_private.try_lock() THEN RAISE EXCEPTION 'Finder busy'; END IF;
  FOR r IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
    IF jsonb_typeof(r) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid postcode'; END IF;
    IF EXISTS (SELECT FROM jsonb_object_keys(r) k WHERE k NOT IN ('postcode','lat','lon','provenance','license')) THEN RAISE EXCEPTION 'Invalid postcode fields'; END IF;
    IF EXISTS (SELECT FROM unnest(ARRAY['postcode','provenance','license']) k WHERE jsonb_typeof(r->k) IS DISTINCT FROM 'string') THEN RAISE EXCEPTION 'Invalid postcode types'; END IF;
    IF (r->>'postcode' ~ '^[0-9]{5}$' AND r->>'postcode' <> '00000' AND jsonb_typeof(r->'lat')='number' AND jsonb_typeof(r->'lon')='number'
      AND length(btrim(r->>'provenance')) BETWEEN 1 AND 240 AND length(btrim(r->>'license')) BETWEEN 1 AND 240) IS NOT TRUE THEN RAISE EXCEPTION 'Invalid postcode'; END IF;
    INSERT INTO finder_private.postcodes VALUES(r->>'postcode',(r->>'lat')::double precision,(r->>'lon')::double precision,r->>'provenance',r->>'license')
      ON CONFLICT (postcode) DO UPDATE SET lat=EXCLUDED.lat,lon=EXCLUDED.lon,provenance=EXCLUDED.provenance,license=EXCLUDED.license;
    n := n + 1;
  END LOOP;
  RETURN n;
END
$function$;
CREATE FUNCTION finder_api.cleanup() RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, finder_private
AS $function$
BEGIN
  IF NOT finder_private.try_lock() THEN RAISE EXCEPTION 'Finder busy'; END IF;
  PERFORM finder_private.cleanup(clock_timestamp());
END
$function$;

REVOKE ALL ON ALL TABLES IN SCHEMA finder_private FROM PUBLIC, finder_runtime, finder_importer;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA finder_private FROM PUBLIC, finder_runtime, finder_importer;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA finder_private, finder_api FROM PUBLIC, finder_runtime, finder_importer;
GRANT USAGE ON SCHEMA finder_api TO finder_runtime, finder_importer;
GRANT EXECUTE ON FUNCTION finder_api.entry(text), finder_api.search(text,text,text,timestamptz,timestamptz,text,integer,text,text) TO finder_runtime;
GRANT EXECUTE ON FUNCTION finder_api.import_batch(jsonb,jsonb), finder_api.import_postcodes(jsonb), finder_api.cleanup() TO finder_importer;
RESET ROLE;
COMMIT;
