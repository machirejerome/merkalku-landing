-- Dedicated seed-only RPC for the private refresh job. No service-role key required.
-- Run once in the linked MerKalku Supabase project. Configure token hash separately.
BEGIN;
CREATE SCHEMA finder_source_private AUTHORIZATION postgres;
REVOKE ALL ON SCHEMA finder_source_private FROM PUBLIC, anon, authenticated;
CREATE TABLE finder_source_private.config (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  enabled boolean NOT NULL DEFAULT false,
  token_sha256 text NOT NULL CHECK (token_sha256 ~ '^[a-f0-9]{64}$')
);
REVOKE ALL ON finder_source_private.config FROM PUBLIC, anon, authenticated;
CREATE FUNCTION public.finder_source_export_v1(p_token text)
RETURNS TABLE(source_portal text, external_id text, source_url text, procedure_identifier text)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog
SET statement_timeout = '3s'
AS $function$
BEGIN
  IF p_token IS NULL OR p_token !~ '^[a-f0-9]{64}$' THEN RETURN; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM finder_source_private.config c
    WHERE c.enabled AND c.token_sha256 = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
  ) THEN RETURN; END IF;
  -- IDs are seeds, not proof of openness, geography, eligibility or current version.
  RETURN QUERY SELECT 'ted'::text, a.external_id::text, a.source_url::text, a.procedure_identifier::text
  FROM public.ausschreibungen a
  WHERE lower(btrim(a.source_portal)) = 'ted'
    AND a.notice_form_type = 'competition'
    AND a.abgabefrist_art IN ('tender','request') AND a.abgabefrist > now()
    AND a.source_url ~ '^https://ted[.]europa[.]eu/(de|en)/notice/-/detail/[0-9]{1,8}-[0-9]{4}$'
    AND a.procedure_identifier IS NOT NULL AND a.external_id IS NOT NULL
  ORDER BY a.abgabefrist, a.external_id
  LIMIT 500;
END
$function$;
REVOKE ALL ON FUNCTION public.finder_source_export_v1(text) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.finder_source_export_v1(text) TO anon;
COMMENT ON FUNCTION public.finder_source_export_v1(text) IS
  'Private finder refresh job: 256-bit token-gated public TED identity seeds only; no tenant, contacts, documents or raw payload.';
COMMIT;
