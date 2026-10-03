-- Additive fail-closed kill switch. The importer can disable, never re-enable, a source.
BEGIN;
SET LOCAL ROLE finder_owner;
CREATE FUNCTION finder_api.suspend_source() RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog, finder_private
SET lock_timeout = '500ms'
AS $function$
BEGIN
  -- Wait briefly for an existing atomic disclosure/import; do not lose a safety stop
  -- merely because an ordinary search currently owns the shared transaction lock.
  PERFORM pg_advisory_xact_lock(1936028270,1718183012);
  UPDATE finder_private.control SET source_enabled=false WHERE singleton;
  IF NOT FOUND THEN RAISE EXCEPTION 'Finder control missing'; END IF;
  RETURN jsonb_build_object('suspended',true);
END
$function$;
REVOKE ALL ON FUNCTION finder_api.suspend_source() FROM PUBLIC, finder_runtime;
GRANT EXECUTE ON FUNCTION finder_api.suspend_source() TO finder_importer;
RESET ROLE;
COMMIT;
