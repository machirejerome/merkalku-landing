-- One accepted refresh attempt per rolling hour, shared across manual/CI runners.
BEGIN;
SET LOCAL ROLE finder_owner;
ALTER TABLE finder_private.control ADD COLUMN last_refresh_started_at timestamptz;
CREATE FUNCTION finder_api.claim_refresh() RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog, finder_private
AS $function$
DECLARE t timestamptz := clock_timestamp(); previous timestamptz;
BEGIN
  IF NOT finder_private.try_lock() THEN RETURN finder_private.denied('unavailable', 1); END IF;
  SELECT last_refresh_started_at INTO previous FROM finder_private.control WHERE singleton;
  IF NOT FOUND THEN RETURN finder_private.denied('unavailable'); END IF;
  IF previous IS NOT NULL AND previous > t - interval '1 hour' THEN
    RETURN finder_private.denied('limited', greatest(1,ceil(extract(epoch FROM previous + interval '1 hour' - t))::integer));
  END IF;
  UPDATE finder_private.control SET last_refresh_started_at=t WHERE singleton;
  RETURN jsonb_build_object('allowed',true);
END
$function$;
REVOKE ALL ON FUNCTION finder_api.claim_refresh() FROM PUBLIC, finder_runtime;
GRANT EXECUTE ON FUNCTION finder_api.claim_refresh() TO finder_importer;
RESET ROLE;
COMMIT;
