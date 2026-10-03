#!/usr/bin/env node
/** Private scheduled orchestration. Never prints credentials, inventories or child output. */
import { mkdtemp, chmod, writeFile, readFile, stat, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { neon } from '@neondatabase/serverless';
import { policy, readBounded } from './ted-revalidate.mjs';

export const SOURCE_RPC = 'https://smgjidsruiasmbqepagn.supabase.co/rest/v1/rpc/finder_source_export_v1';
const UNIT = /^ted:[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}:LOT-[0-9]{4}$/;
const CHUNK = 100, CAPACITY = 1000;
export const PILOT_SEED_LIMIT = 12, PILOT_DISCOVERY_LIMIT = 2;
class RefreshError extends Error { constructor(code) { super(code); this.code = code; } }
const fail = (code) => { throw new RefreshError(code); };
const chunks = (rows) => Array.from({ length: Math.ceil(rows.length / CHUNK) }, (_, i) => rows.slice(i * CHUNK, (i + 1) * CHUNK));

/** Prioritize retained evidence; intentionally deferred units keep their original expiry. */
export function selectPilotRefresh(seedExport, previous, now = Date.now()) {
  const seeds = policy.parseTedSeeds(seedExport);
  policy.priorUnits(previous);
  if (!Number.isSafeInteger(now) || now < 0) fail('invalid_refresh_time');
  // A procedure is validated as a whole. Multiple source seeds cannot buy extra slots.
  const byProcedure = new Map();
  seeds.forEach((seed, index) => {
    if (!byProcedure.has(seed.procedureIdentifier)) byProcedure.set(seed.procedureIdentifier, seedExport.candidates[index]);
  });
  const retained = new Map(), recovery = new Map();
  for (const row of previous.candidates) {
    const procedure = row.canonicalUnitId.split(':')[1];
    if (!byProcedure.has(procedure)) continue;
    const expires = Date.parse(row.eligibilityExpiresAt);
    const priority = Number.isFinite(expires) ? expires : 0;
    if (row.revoked === true) {
      // This grants a validation slot only, never eligibility or a new evidence timestamp.
      if (row.sourceId === 'ted' && row.noticeFormType === 'competition' && row.lifecycle === 'open'
        && row.publicProvenance === true && row.redistributionApproved === true && row.cleaningRelevanceApproved === true
        && row.deadline?.kind === 'tender' && Date.parse(row.deadline.at) > now) {
        recovery.set(procedure, Math.min(recovery.get(procedure) ?? Infinity, priority));
      }
    } else retained.set(procedure, Math.min(retained.get(procedure) ?? Infinity, priority));
  }
  const byExpiry = rows => [...rows].sort((a,b) => a[1]-b[1] || a[0].localeCompare(b[0])).map(([procedure]) => procedure);
  const active = byExpiry(retained), recovering = byExpiry(recovery).filter(procedure => !retained.has(procedure));
  const existing = [...active,...recovering];
  const discovery = [...byProcedure.keys()].filter(procedure => !retained.has(procedure) && !recovery.has(procedure));
  const discoverySlots = Math.min(PILOT_DISCOVERY_LIMIT, discovery.length);
  const selected = existing.slice(0, PILOT_SEED_LIMIT - discoverySlots);
  // Rotate discovery independently of failures, without storing another cursor or inventory.
  const offset = discovery.length ? (Math.floor(now / 3600000) * PILOT_DISCOVERY_LIMIT) % discovery.length : 0;
  for (let i=0; i<discoverySlots; i++) selected.push(discovery[(offset+i) % discovery.length]);
  const selectedSet = new Set(selected);
  const absentIds = previous.candidates.filter(row => row.revoked !== true && !byProcedure.has(row.canonicalUnitId.split(':')[1])).map(row => row.canonicalUnitId);
  const absentSet = new Set(absentIds);
  const selectedPrevious = previous.candidates.filter(row => selectedSet.has(row.canonicalUnitId.split(':')[1]) || absentSet.has(row.canonicalUnitId));
  return {
    seeds: { schemaVersion:1, kind:'supabase_ted_seed_export', candidates:selected.map(procedure => byProcedure.get(procedure)) },
    previous: { candidates:selectedPrevious },
    absentIds,
    stats: { availableSeeds:seeds.length, selectedSeeds:selected.length, retainedProcedures:Math.min(active.length,PILOT_SEED_LIMIT-discoverySlots), recoveryProcedures:selected.filter(procedure=>recovering.includes(procedure)).length, discoverySeeds:discoverySlots, absentPreviousUnits:absentIds.length, deferredPreviousUnits:previous.candidates.length-selectedPrevious.length },
  };
}

export function configFromEnvironment(env) {
  const databaseUrl = env.FINDER_IMPORT_DATABASE_URL, sourceToken = env.FINDER_SOURCE_TOKEN, anonKey = env.FINDER_SOURCE_ANON_KEY;
  if (typeof databaseUrl !== 'string' || typeof sourceToken !== 'string' || !/^[a-f0-9]{64}$/.test(sourceToken)
    || typeof anonKey !== 'string' || !anonKey || anonKey.length > 4096 || /[\s\r\n]/.test(anonKey)) fail('invalid_job_configuration');
  try {
    const url = new URL(databaseUrl);
    if (url.protocol !== 'postgresql:' || decodeURIComponent(url.username) !== 'merkalku_finder_job'
      || !url.hostname.endsWith('.neon.tech') || !url.password || url.searchParams.get('sslmode') !== 'require'
      || url.hash || !url.pathname || url.pathname === '/') fail('invalid_job_configuration');
  } catch { fail('invalid_job_configuration'); }
  return { databaseUrl, sourceToken, anonKey };
}

export async function fetchSeedExport(config, fetcher = fetch) {
  try {
    const response = await fetcher(SOURCE_RPC, {
      method: 'POST', redirect: 'error', credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(15000),
      headers: { apikey: config.anonKey, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ p_token: config.sourceToken }),
    });
    if (!(response.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) fail('source_export_failed');
    const rows = JSON.parse(await readBounded(response, 1_000_000));
    const exportData = { schemaVersion: 1, kind: 'supabase_ted_seed_export', candidates: rows };
    policy.parseTedSeeds(exportData); // Exactly four public identity fields, <=500, canonical TED URLs.
    return exportData;
  } catch { fail('source_export_failed'); }
}

const ERROR_CODES = new Set([
  'batch_candidate_limit_exceeded','invalid_publication_number','invalid_ted_json','invalid_version','missing_or_ambiguous_publication',
  'procedure_changed_during_validation','run_budget_exceeded','source_validation_too_slow','ted_http_failure','ted_request_budget_exceeded',
  'ted_response_too_large','ted_validation_failed','ted_consecutive_http_failures','ted_retry_after_exceeds_run_budget',
  'ambiguous_cpv','ambiguous_notice_type','ambiguous_title','invalid_xml_projection','missing_or_ambiguous_xml_field','python3_lxml_required',
  'unsafe_xml','unsupported_xml_root','xml_parser_failed','xml_parser_failed_or_lxml_missing','xml_parser_timeout','xml_projection_too_large',
  'ambiguous_deadline_kind','complex_or_changed_procedure','deadline_expired','duplicate_seeds','incomplete_ted_search','insufficient_georeference',
  'invalid_canonical_unit','invalid_deadline','invalid_deadline_components','invalid_evidence','invalid_lot_mapping','invalid_performance_location',
  'invalid_seed_export','invalid_seed_identity','invalid_ted_metadata','invalid_timezone','missing_or_conflicting_timezone','missing_or_multiple_deadlines',
  'missing_performance_locations','not_current_open_competition','source_version_conflict','unresolved_change_or_result','unresolved_performance_georeference',
  'unsafe_seed_fields','unsupported_open_request_deadline','unsupported_title_or_cleaning_cpv','unverified_geodata','xml_metadata_or_lifecycle_conflict',
]);
const CONTENT_TYPES = new Set(['application/json','application/xml','text/xml','text/html','application/octet-stream','missing']);
const record = v => Boolean(v && typeof v === 'object' && !Array.isArray(v));
const count = (v,max) => Number.isSafeInteger(v) && v >= 0 && v <= max;

/** Soft projection of diagnostics: unknown fields are never copied; malformed metrics are omitted. */
export function safeDiagnostics(report) {
  if (!record(report)) return { available:false };
  const out = { available:true, httpStatusCounts:{}, contentTypeCounts:{}, errorCodeCounts:{} };
  for (const [key,max] of [['seedCount',500],['requests',3000],['acceptedCount',10000],['durationMs',1200000]]) {
    if (count(report[key],max)) out[key]=report[key]; else out.rejectedFields=true;
  }
  const http=record(report.http)?report.http:{};
  for (const [field,target,isKey] of [
    ['statusCounts','httpStatusCounts',key=>/^[1-5][0-9]{2}$/.test(key)?key:null],
    ['responseContentTypes','contentTypeCounts',key=>CONTENT_TYPES.has(key)?key:'other'],
  ]) {
    const input=http[field];
    if (!record(input) || Object.keys(input).length>32 || Object.values(input).some(v=>!count(v,3000)) || Object.values(input).reduce((sum,v)=>sum+v,0)>3000) { out.rejectedFields=true; continue; }
    for (const [key,value] of Object.entries(input)) {
      const safeKey=isKey(key);
      if (!safeKey) { out.rejectedFields=true; continue; }
      out[target][safeKey]=(out[target][safeKey]||0)+value;
    }
  }
  for (const [field,max] of [['seedFailures',500],['rejectedLots',10000]]) {
    if (!Array.isArray(report[field]) || report[field].length>max) { out.rejectedFields=true; continue; }
    for (const failure of report[field]) {
      const reason=typeof failure?.reason==='string'?failure.reason:'';
      const suffix=reason.endsWith('_unprocessed')?'_unprocessed':'';
      const base=suffix?reason.slice(0,-suffix.length):reason;
      let key=ERROR_CODES.has(base)||/^ted_http_[1-5][0-9]{2}$/.test(base)?base+suffix:'other';
      if (!Object.hasOwn(out.errorCodeCounts,key) && Object.keys(out.errorCodeCounts).length>=63) key='other';
      out.errorCodeCounts[key]=(out.errorCodeCounts[key]||0)+1;
    }
  }
  return out;
}

function validateBatch(batch) {
  if (!batch || typeof batch !== 'object' || Object.keys(batch).sort().join(',') !== 'candidates,revokedCanonicalUnitIds'
    || !Array.isArray(batch.candidates) || !Array.isArray(batch.revokedCanonicalUnitIds)
    || batch.candidates.length > 10000 || batch.revokedCanonicalUnitIds.length > 10000) fail('invalid_revalidation_batch');
  const ids = batch.candidates.map(c => c?.canonicalUnitId);
  if (ids.some(id => typeof id !== 'string' || !UNIT.test(id)) || new Set(ids).size !== ids.length
    || batch.revokedCanonicalUnitIds.some(id => typeof id !== 'string' || !UNIT.test(id))
    || new Set(batch.revokedCanonicalUnitIds).size !== batch.revokedCanonicalUnitIds.length
    || batch.revokedCanonicalUnitIds.some(id => ids.includes(id))) fail('invalid_revalidation_batch');
  return batch;
}

async function readJson(path, maxBytes) {
  const info = await stat(path);
  if (!info.isFile() || info.size > maxBytes) fail('invalid_private_file');
  try { return JSON.parse(await readFile(path, 'utf8')); } catch { fail('invalid_private_file'); }
}
async function writeJson(path, value) { await writeFile(path, JSON.stringify(value), { mode: 0o600, flag: 'wx' }); }

// Child programs receive no database/source secrets and their output is never relayed.
export function runPrivateCli(name, args, timeout) {
  if (!['geodata.mjs', 'ted-revalidate.mjs'].includes(name)) return Promise.reject(new RefreshError('invalid_child_program'));
  const script = fileURLToPath(new URL(name, import.meta.url));
  const env = Object.fromEntries(['PATH', 'LANG', 'LC_ALL', 'TMPDIR', 'SSL_CERT_FILE', 'SSL_CERT_DIR'].filter(key => process.env[key]).map(key => [key, process.env[key]]));
  return new Promise((resolveChild) => {
    execFile(process.execPath, [script, ...args], { timeout, killSignal: 'SIGKILL', maxBuffer: 262144, env }, error => {
      resolveChild(!error ? 0 : error.code === 2 && !error.killed ? 2 : 1);
    });
  });
}

export function createDatabase(config) {
  const client = () => neon(config.databaseUrl, { fetchOptions: { cache: 'no-store', signal: AbortSignal.timeout(15000) } });
  return {
    async claim() { const sql = client(); const rows = await sql`SELECT finder_api.claim_refresh() AS result`; return rows[0]?.result; },
    async previous() { const sql = client(); const rows = await sql`SELECT finder_api.previous_batch() AS result`; return rows[0]?.result; },
    async importBatch(candidates, revoked) {
      const sql = client();
      const rows = await sql`SELECT finder_api.import_batch(${JSON.stringify(candidates)}::jsonb, ${JSON.stringify(revoked)}::jsonb) AS result`;
      return rows[0]?.result;
    },
    async cleanup() { const sql = client(); await sql`SELECT finder_api.cleanup()`; },
    async suspend() { const sql = client(); const rows = await sql`SELECT finder_api.suspend_source() AS result`; return rows[0]?.result; },
  };
}

/** Injectable boundaries permit offline failure tests; production always uses the fixed RPC/CLIs. */
export async function runRefresh(deps, { geodataPath, now = Date.now() } = {}) {
  let directory, claimed = false, previousIds = [], knownIds = [], previousLoaded = false;
  let result = { status: 'failed', code: 'refresh_failed', exitCode: 1, imported: 0, revoked: 0 };
  async function revoke(ids) {
    for (const group of chunks([...new Set(ids)])) {
      const response = await deps.db.importBatch([], group);
      if (!response || response.imported !== 0 || !Number.isSafeInteger(response.revoked) || response.revoked < 0 || response.revoked > group.length) fail('invalid_import_acknowledgement');
      result.revoked += group.length; // Requested exclusions, not an award/cancellation count.
    }
  }
  try {
    const claim = await deps.db.claim();
    if (claim?.allowed === false && claim.reason === 'limited') {
      result = { ...result, status: 'skipped', code: 'hourly_limit', exitCode: 0 };
      return result;
    }
    if (claim?.allowed !== true) fail('refresh_claim_failed');
    claimed = true;
    const previous = await deps.db.previous();
    try { previousIds = policy.priorUnits(previous); } catch { fail('invalid_previous_batch'); }
    previousLoaded = true; knownIds = [...previousIds];
    directory = await mkdtemp(join(tmpdir(), 'merkalku-finder-refresh-'));
    await chmod(directory, 0o700);
    const files = { input: join(directory,'seed.json'), previous: join(directory,'previous.json'), geodata: join(directory,'geodata.json'), output: join(directory,'batch.json'), report: join(directory,'report.json') };
    const seed = await deps.fetchSeeds();
    try { policy.parseTedSeeds(seed); } catch { fail('source_export_failed'); }
    const selection = selectPilotRefresh(seed, previous, now);
    result.selection = selection.stats;
    knownIds = policy.priorUnits(selection.previous);
    await writeJson(files.previous, selection.previous);
    await writeJson(files.input, selection.seeds);
    if (geodataPath) {
      const geo = await readJson(resolve(geodataPath), 16_000_000);
      try { policy.validateGeodata(geo); } catch { fail('invalid_geodata'); }
      await writeJson(files.geodata, geo);
    } else if (await deps.runCli('geodata.mjs', ['--output',files.geodata], 60000) !== 0) fail('geodata_failed');
    const code = await deps.runCli('ted-revalidate.mjs', ['--pilot','--input',files.input,'--previous',files.previous,'--geodata',files.geodata,'--output',files.output,'--report',files.report], 660000);
    try { result.diagnostics = safeDiagnostics(await readJson(files.report, 4_000_000)); }
    catch { result.diagnostics = { available:false }; }
    if (code !== 0 && code !== 2) fail('ted_revalidation_fatal');
    const batch = validateBatch(await readJson(files.output, 20_000_000));
    const selectedProcedures = new Set(selection.seeds.candidates.map(row => row.procedure_identifier));
    const absentIds = new Set(selection.absentIds);
    if (batch.candidates.some(row => !selectedProcedures.has(row.canonicalUnitId.split(':')[1]))
      || batch.revokedCanonicalUnitIds.some(id => !selectedProcedures.has(id.split(':')[1]) && !absentIds.has(id))
      || selection.absentIds.some(id => !batch.revokedCanonicalUnitIds.includes(id))) fail('invalid_revalidation_batch');
    // Apply every explicit exclusion before admitting even the first newly validated unit.
    await revoke(batch.revokedCanonicalUnitIds);
    const union = new Set([...previousIds,...batch.candidates.map(c=>c.canonicalUnitId)]);
    if (union.size > CAPACITY) fail('projection_capacity_exceeded');
    for (const group of chunks(batch.candidates)) {
      // Include before the call: a network exception can follow a committed import.
      knownIds = [...new Set([...knownIds,...group.map(c=>c.canonicalUnitId)])];
      const response = await deps.db.importBatch(group, []);
      if (!response || response.imported !== group.length || response.revoked !== 0) fail('invalid_import_acknowledgement');
      result.imported += group.length;
    }
    result.status = code === 2 ? 'partial' : 'complete';
    result.code = code === 2 ? 'partial_source_validation' : 'updated';
    result.exitCode = code;
  } catch (error) {
    result.status = 'failed'; result.code = error instanceof RefreshError ? error.code : 'refresh_failed'; result.exitCode = 1;
    // Never renew freshness on failure: all known prior units before selection, scoped units afterwards.
    if (claimed && previousLoaded) {
      try { await revoke(knownIds); } catch {
        result.revocationFailed = true;
        try { result.sourceSuspended = (await deps.db.suspend())?.suspended === true; }
        catch { result.sourceSuspended = false; }
      }
    }
  } finally {
    try { await deps.db.cleanup(); } catch { result.cleanupFailed = true; result.status = 'failed'; result.exitCode = 1; }
    if (directory) {
      try { await rm(directory, { recursive: true, force: true }); }
      catch { result.privateCleanupFailed = true; result.status = 'failed'; result.exitCode = 1; }
    }
  }
  return result;
}

export async function main(args = process.argv.slice(2), env = process.env) {
  if (args.length === 1 && args[0] === '--help') {
    console.log('Usage: node scripts/finder/refresh.mjs [--geodata PRIVATE_GEODATA.json]\nPrivate refresh; requires FINDER_IMPORT_DATABASE_URL, FINDER_SOURCE_TOKEN, FINDER_SOURCE_ANON_KEY and SQL migrations 001–004. One claimed attempt/hour, no public artifacts. Exit0 complete/skipped,2 safe partial batch applied,1 failed.');
    return 0;
  }
  if (args.length !== 0 && (args.length !== 2 || args[0] !== '--geodata' || !args[1] || args[1].startsWith('--'))) fail('invalid_arguments');
  const config = configFromEnvironment(env);
  const result = await runRefresh({ db: createDatabase(config), fetchSeeds: () => fetchSeedExport(config), runCli: runPrivateCli }, { geodataPath: args[1] });
  console.log(JSON.stringify(result));
  return result.exitCode;
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().then(code => { process.exitCode = code; }).catch(error => {
    console.error(JSON.stringify({ status:'failed',code:error instanceof RefreshError ? error.code : 'refresh_failed' })); process.exitCode=1;
  });
}
