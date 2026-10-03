-- Additive migration after 001. Import-job state only; never grant to the web login.
BEGIN;
SET LOCAL ROLE finder_owner;
CREATE FUNCTION finder_api.previous_batch() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, finder_private
AS $function$
DECLARE batch jsonb;
BEGIN
  -- An unexpected oversized projection must not silently truncate the revocation universe.
  IF (SELECT count(*) FROM finder_private.units) > 1000 THEN
    RAISE EXCEPTION 'Pilot projection capacity exceeded';
  END IF;
  SELECT jsonb_build_object('candidates', coalesce(jsonb_agg(
    jsonb_set(u.candidate, '{revoked}', to_jsonb(u.revoked)) ORDER BY u.canonical_id
  ), '[]'::jsonb)) INTO batch FROM finder_private.units u;
  RETURN batch;
END
$function$;
REVOKE ALL ON FUNCTION finder_api.previous_batch() FROM PUBLIC, finder_runtime;
GRANT EXECUTE ON FUNCTION finder_api.previous_batch() TO finder_importer;
RESET ROLE;
COMMIT;
