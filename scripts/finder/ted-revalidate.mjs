#!/usr/bin/env node
/** Read-only, bounded TED pilot. Requires Node 22+, installed TypeScript, Python3 + lxml.
 * No secrets, Supabase connection, DB writes, installation, or scheduler configuration.
 * Every accepted unit must be a single-notice, open eForms procedure with exact lot facts.
 * Complex/multi-notice chains are deliberately excluded until a reviewed resolver exists.
 */
import { readFile, writeFile, rename, stat, unlink } from 'node:fs/promises';
import { resolve, dirname, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import ts from 'typescript';
import { parseTedXml } from './ted-xml.mjs';

const policyPath = new URL('../../src/lib/finder/ted-policy.ts', import.meta.url);
const source = await readFile(policyPath, 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
export const policy = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const API = 'https://api.ted.europa.eu/v3/notices/search';
const sha = (v) => createHash('sha256').update(v).digest('hex');

export async function readBounded(response, maxBytes) {
  if (!response.ok || !response.body) throw new Error('ted_http_failure');
  const declared = response.headers.get('content-length');
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > maxBytes)) { await response.body.cancel(); throw new Error('ted_response_too_large'); }
  const reader = response.body.getReader(), chunks = []; let length = 0;
  try {
    while (true) { const part = await reader.read(); if (part.done) break; length += part.value.byteLength; if (length > maxBytes) { await reader.cancel(); throw new Error('ted_response_too_large'); } chunks.push(Buffer.from(part.value)); }
    return Buffer.concat(chunks).toString('utf8');
  } finally { reader.releaseLock(); }
}
function abortReason(signal) {
  return signal?.reason instanceof Error && /^[a-z0-9_]+$/.test(signal.reason.message) ? signal.reason.message : 'run_budget_exceeded';
}
function pause(milliseconds, signal) {
  if (signal.aborted) return Promise.reject(new Error(abortReason(signal)));
  return new Promise((resolvePause, reject) => {
    const aborted = () => { clearTimeout(timer); reject(new Error(abortReason(signal))); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', aborted); resolvePause(); }, milliseconds);
    signal.addEventListener('abort', aborted, { once: true });
  });
}
export function retryAfterMilliseconds(value, now = Date.now()) {
  if (typeof value !== 'string') return 60000;
  if (/^\d+$/.test(value)) return Math.max(1000, Number(value) * 1000);
  const at = Date.parse(value);
  return Number.isFinite(at) ? Math.max(1000, at - now) : 60000;
}
export function createTedClient(fetcher = fetch, { signal: runSignal = AbortSignal.timeout(600000), minimumIntervalMs = 350 } = {}) {
  if (!Number.isInteger(minimumIntervalMs) || minimumIntervalMs < 0 || minimumIntervalMs > 60000) throw new Error('invalid_request_interval');
  const circuit = new AbortController(), signal = AbortSignal.any([runSignal, circuit.signal]);
  const deadlineAt = Date.now() + 600000;
  let requests = 0, nextRequestAt = 0, blockedUntil = 0, consecutiveFailures = 0;
  const diagnostics = { statusCounts: {}, responseContentTypes: {}, retryAfterSeconds: null, circuitReason: null, minimumIntervalMs };
  function stop(reason) { diagnostics.circuitReason = reason; circuit.abort(new Error(reason)); }
  async function paced() {
    // Reserve at actual dispatch time, including after a shared Retry-After cooldown.
    // Reserving before sleep would let all workers burst together when cooldown ends.
    while (true) {
      if (signal.aborted) throw new Error(abortReason(signal));
      const now = Date.now(), earliest = Math.max(nextRequestAt, blockedUntil);
      if (now >= earliest) { nextRequestAt = now + minimumIntervalMs; return; }
      await pause(earliest - now, signal);
    }
  }
  async function request(url, options, cap) {
    for (let attempt = 0; attempt < 2; attempt++) {
      await paced();
      if (requests >= 3000) { stop('ted_request_budget_exceeded'); throw new Error('ted_request_budget_exceeded'); }
      requests++;
      const response = await fetcher(url, { ...options, redirect: 'error', credentials: 'omit', cache: 'no-store', signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]) });
      diagnostics.statusCounts[response.status] = (diagnostics.statusCounts[response.status] || 0) + 1;
      const contentType = (response.headers.get('content-type') || 'missing').split(';')[0].slice(0, 80);
      diagnostics.responseContentTypes[contentType] = (diagnostics.responseContentTypes[contentType] || 0) + 1;
      if (response.ok) { consecutiveFailures = 0; return readBounded(response, cap); }
      await response.body?.cancel();
      consecutiveFailures++;
      if (response.status === 429) {
        const delay = retryAfterMilliseconds(response.headers.get('retry-after'));
        diagnostics.retryAfterSeconds = Math.ceil(delay / 1000);
        blockedUntil = Math.max(blockedUntil, Date.now() + delay);
        if (blockedUntil >= deadlineAt) stop('ted_retry_after_exceeds_run_budget');
      }
      if (consecutiveFailures >= 3) stop('ted_consecutive_http_failures');
      if (signal.aborted) throw new Error(abortReason(signal));
      if (response.status !== 429 || attempt === 1) throw new Error(`ted_http_${response.status}`);
    }
    throw new Error('ted_http_failure');
  }
  return {
    signal,
    diagnostics,
    async search(query) {
      const raw = await request(API, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ query, fields: policy.TED_FIELDS, scope: 'ALL', limit: 100, page: 1 }) }, 2_000_000);
      let data; try { data = JSON.parse(raw); } catch { throw new Error('invalid_ted_json'); }
      return policy.completeSearch(data);
    },
    async xml(publicationNumber) {
      if (!/^\d{1,7}-20\d{2}$/.test(publicationNumber)) throw new Error('invalid_publication_number');
      return request(`https://ted.europa.eu/en/notice/${publicationNumber}/xml`, { headers: { accept: 'application/xml' } }, 2_000_000);
    },
    get requests() { return requests; },
  };
}
export async function revalidateSeed(seed, geo, client, { now = () => Date.now(), parseXml = parseTedXml, signal } = {}) {
  if (signal?.aborted) throw new Error('run_budget_exceeded');
  const started = now();
  const publication = await client.search(`publication-number = "${seed.publicationNumber}"`);
  if (publication.length !== 1) throw new Error('missing_or_ambiguous_publication');
  const procedureQuery = `procedure-identifier = "${seed.procedureIdentifier}"`;
  const procedure = await client.search(procedureQuery);
  const versions = await client.search(`notice-identifier = "${seed.noticeIdentifier}"`);
  const ver = String(publication[0]['notice-version']).padStart(2, '0');
  if (!/^\d{2,4}$/.test(ver)) throw new Error('invalid_version');
  const referring = await client.search(`change-notice-version-identifier = "${seed.noticeIdentifier}-${ver}" OR change-notice-version-identifier = "${seed.noticeIdentifier}" OR previous-notice-id-proc = "${seed.publicationNumber}"`);
  const meta = policy.assertSimpleCurrent(seed, publication, procedure, versions, referring);
  const rawXml = await client.xml(seed.publicationNumber);
  const parsed = await parseXml(rawXml, { signal });
  // Recheck the procedure after XML retrieval. Any change during validation fails closed.
  const finalProcedure = await client.search(procedureQuery);
  policy.assertSimpleCurrent(seed, publication, finalProcedure, versions, referring);
  if (JSON.stringify(finalProcedure) !== JSON.stringify(procedure)) throw new Error('procedure_changed_during_validation');
  if (signal?.aborted) throw new Error('run_budget_exceeded');
  const completed = now();
  if (completed < started || completed - started > 120000) throw new Error('source_validation_too_slow');
  const checkedAt = new Date(completed).toISOString();
  const digest = sha(JSON.stringify({ publication, procedure, versions, referring, finalProcedure, xmlSha256: sha(rawXml), geoArchiveSha256: geo.sourceArchiveSha256, checkedAt }));
  return policy.candidatesFromVerifiedSource(seed, meta, parsed, geo, checkedAt, digest);
}
export async function revalidateBatch(seedInput, geoInput, previous, client, options = {}) {
  const seeds = policy.parseTedSeeds(seedInput), geo = policy.validateGeodata(geoInput);
  const prior = previous ? policy.priorUnits(previous) : [];
  const signal = options.signal || client.signal || AbortSignal.timeout(600000);
  const candidates = [], rejected = [], seedFailures = [];
  let nextSeed = 0, unprocessedCount = 0;
  async function worker() {
    while (nextSeed < seeds.length) {
      const seed = seeds[nextSeed++];
      if (signal.aborted) { unprocessedCount++; seedFailures.push({ publicationNumber: seed.publicationNumber, reason: `${abortReason(signal)}_unprocessed` }); continue; }
      try { const result = await revalidateSeed(seed, geo, client, { ...options, signal }); candidates.push(...result.candidates); rejected.push(...result.rejected); }
      catch (error) { seedFailures.push({ publicationNumber: seed.publicationNumber, reason: signal.aborted ? abortReason(signal) : error instanceof Error && /^[a-z0-9_]+$/.test(error.message) ? error.message : 'ted_validation_failed' }); }
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, seeds.length) }, () => worker()));
  // Different seeds must never silently compete over one procedure/lot.
  const counts = new Map(); for (const c of candidates) counts.set(c.canonicalUnitId, (counts.get(c.canonicalUnitId) || 0) + 1);
  const accepted = candidates.filter((c) => counts.get(c.canonicalUnitId) === 1);
  if (accepted.length > 10000) throw new Error('batch_candidate_limit_exceeded');
  const conflicted = candidates.filter((c) => counts.get(c.canonicalUnitId) > 1).map((c) => c.canonicalUnitId);
  const acceptedIds = new Set(accepted.map((c) => c.canonicalUnitId));
  const revokedCanonicalUnitIds = [...new Set([...prior, ...rejected.map((r) => r.canonicalUnitId), ...conflicted])].filter((id) => !acceptedIds.has(id)).sort();
  accepted.sort((a, b) => a.canonicalUnitId.localeCompare(b.canonicalUnitId));
  seedFailures.sort((a, b) => a.publicationNumber.localeCompare(b.publicationNumber));
  const absentSeedPriorUnitCount = prior.filter((id) => !seeds.some((s) => id.startsWith(`ted:${s.procedureIdentifier}:`))).length;
  return { batch: { candidates: accepted, revokedCanonicalUnitIds }, report: { status: seedFailures.length ? 'partial' : 'complete', unprocessedCount, absentSeedPriorUnitCount, revocationMeaning: 'Excluded from public projection because no current unambiguous evidence was established; not a claim of award or cancellation.', seedCount: seeds.length, acceptedCount: accepted.length, rejectedLots: rejected, seedFailures, conflictingUnitCount: new Set(conflicted).size, revokedCount: revokedCanonicalUnitIds.length, previousBatchProvided: Boolean(previous), complexProcedurePolicy: 'Pilot supports open procedures with tender deadlines only. Excluded: restricted/participation, changed, multi-notice, closed, result or incomplete procedures. No inferred deadlines or buyer locations.', sourceAttribution: 'Source: TED, Publications Office of the European Union. Metadata filtered and normalized by MerKalku; current only at the stated check time.', tedLegalUrl: 'https://ted.europa.eu/en/legal-notice', geodataAttribution: geo.license.attribution, geodataLicenseUrl: geo.license.url, geodataArchiveSha256: geo.sourceArchiveSha256, geographicLimitation: 'Approximate postcode/place reference coordinates, not object coordinates or a boundary-derived centroid.' } };
}
async function readJson(path, maxBytes) {
  if ((await stat(path)).size > maxBytes) throw new Error('local_input_too_large');
  return JSON.parse(await readFile(path, 'utf8'));
}
async function privateWrite(path, data) {
  const temporary = resolve(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`);
  try { await writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600, flag: 'wx' }); await rename(temporary, path); }
  finally { await unlink(temporary).catch(() => {}); }
}
export async function main(args = process.argv.slice(2)) {
  if (args.length === 1 && args[0] === '--help') {
    console.log('Usage: node scripts/finder/ted-revalidate.mjs --input SEED.json --geodata GEONAMES.json --output BATCH.json [--previous PRIOR_BATCH.json] [--report REPORT.json]\nRequires Node 22+, installed TypeScript, Python3 and lxml. Anonymous official TED reads only; bounded 500 seeds / 3000 requests, 4 workers, globally paced at 350ms/request, global 600-second abort; circuit opens after 3 consecutive HTTP errors and honors 429 Retry-After. No DB writes. Initial pilot accepts only single-notice open procedures with tender deadlines; restricted/participation procedures and complex chains fail closed. Pass the last batch with --previous on every refresh to generate revocations after failure, absence or closure. A batch may exceed 100 rows; chunk candidates/revocations into the importer limit of 100 per call. Exit 2 still writes a safe partial batch: apply its revocations before reporting incomplete validation. Output contains public allowlisted facts only, with private file permissions. Keep batch/report outside public/; reports carry TED and GeoNames attribution.');
    return;
  }
  const flags = new Map();
  for (let i = 0; i < args.length; i += 2) {
    if (!['--input', '--geodata', '--output', '--previous', '--report'].includes(args[i]) || !args[i + 1] || args[i + 1].startsWith('--') || flags.has(args[i])) throw new Error('invalid_arguments');
    flags.set(args[i], resolve(args[i + 1]));
  }
  for (const key of ['--input', '--geodata', '--output']) if (!flags.has(key)) throw new Error('missing_required_argument');
  const paths = [...flags.values()];
  if (new Set(paths).size !== paths.length || [flags.get('--output'), flags.get('--report')].filter(Boolean).some((p) => p.split('/').includes('public'))) throw new Error('unsafe_output_path');
  const input = await readJson(flags.get('--input'), 1000000), geo = await readJson(flags.get('--geodata'), 16000000);
  const previous = flags.has('--previous') ? await readJson(flags.get('--previous'), 20000000) : null;
  const startedAt = Date.now();
  const client = createTedClient();
  const { batch, report } = await revalidateBatch(input, geo, previous, client);
  report.http = client.diagnostics;
  report.startedAt = new Date(startedAt).toISOString();
  report.durationMs = Date.now() - startedAt;
  await privateWrite(flags.get('--output'), batch);
  if (flags.has('--report')) await privateWrite(flags.get('--report'), { ...report, generatedAt: new Date().toISOString(), requests: client.requests });
  console.log(JSON.stringify({ status: report.status, unprocessed: report.unprocessedCount, accepted: batch.candidates.length, revoked: batch.revokedCanonicalUnitIds.length, failedSeeds: report.seedFailures.length, rejectedLots: report.rejectedLots.length, requests: client.requests, output: flags.get('--output') }));
  // Partial source coverage is explicit even though its fail-closed batch must still be applied.
  if (report.seedFailures.length) process.exitCode = 2;
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => { console.error(/^[a-z0-9_]+$/.test(error?.message || '') ? error.message : 'ted_revalidation_failed'); process.exitCode = 1; });
}
