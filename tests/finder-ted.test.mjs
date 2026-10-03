import assert from 'node:assert/strict';
import { test } from 'node:test';
import { policy, revalidateSeed, revalidateBatch, createTedClient, readBounded, retryAfterMilliseconds } from '../scripts/finder/ted-revalidate.mjs';
import { parseTedXml } from '../scripts/finder/ted-xml.mjs';

const proc = '14c6fcb3-6d30-4df4-a366-a658870a7004', notice = 'a79d0d9b-ba08-470b-a5cf-0a705109dc00';
const seed = { publicationNumber: '679270-2026', noticeIdentifier: notice, procedureIdentifier: proc };
const seedInput = { schemaVersion: 1, kind: 'supabase_ted_seed_export', candidates: [{ source_portal: 'ted', external_id: notice, source_url: 'https://ted.europa.eu/de/notice/-/detail/679270-2026', procedure_identifier: proc }] };
const meta = { 'publication-number': seed.publicationNumber, 'notice-identifier': notice, 'notice-version': 1, 'procedure-identifier': proc, 'form-type': 'competition', 'notice-type': 'cn-standard', 'competition-termination-proc': false, 'procurement-relaunch-proc': false };
const geo = { sourceUrl: 'https://download.geonames.org/export/zip/DE.zip', sourceArchiveSha256: 'a'.repeat(64), license: { url: 'https://creativecommons.org/licenses/by/4.0/', attribution: 'GeoNames, CC BY 4.0. Reference coordinates.' }, performancePlaces: [{ postcode: '18569', city: 'Gingst', lat: 54.4565, lon: 13.2574, sourceAccuracy: 4 }] };
const lot = { id: 'LOT-0001', title: 'Synthetic building cleaning test', cpv: '90911200', locations: [{ postcode: '18569', city: 'Gingst', country: 'DEU' }], tenderDates: ['2026-11-02+01:00'], tenderTimes: ['10:00:00+01:00'], requestDates: [], requestTimes: [] };
const xmlFacts = { noticeIdentifier: notice, version: '01', procedureIdentifier: proc, formType: 'competition', noticeType: 'cn-standard', procedureType: 'open', rootType: 'ContractNotice', hasChangeOrClosure: false, lots: [lot] };
const checked = '2026-10-03T11:00:00.000Z', now = () => Date.parse(checked);
const clone = (v) => structuredClone(v);
function candidateFrom(overrides = {}, geoOverride = geo, at = checked) { return policy.candidatesFromVerifiedSource(seed, meta, { ...xmlFacts, ...overrides }, geoOverride, at, 'b'.repeat(64)); }
function fakeClient({ failCall = 0, finalRows, referring = [], procedureRows = [meta] } = {}) {
  let call = 0;
  return { async search(query) { if (++call === failCall) throw new Error('ted_http_failure'); if (query.startsWith('change-notice')) return referring; if (query.startsWith('procedure-identifier')) return call === 5 && finalRows ? finalRows : procedureRows; return [clone(meta)]; }, async xml() { return '<xml>not-persisted</xml>'; } };
}
const XML = `<?xml version="1.0"?><ContractNotice xmlns="urn:oasis:names:specification:ubl:schema:xsd:ContractNotice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"><cbc:ID>${notice}</cbc:ID><cbc:VersionID>01</cbc:VersionID><cbc:ContractFolderID>${proc}</cbc:ContractFolderID><cbc:NoticeTypeCode listName="competition">cn-standard</cbc:NoticeTypeCode><cac:TenderingProcess><cbc:ProcedureCode listName="procurement-procedure-type">open</cbc:ProcedureCode></cac:TenderingProcess><cac:ProcurementProjectLot><cbc:ID>LOT-0001</cbc:ID><cac:TenderingProcess><cac:TenderSubmissionDeadlinePeriod><cbc:EndDate>2026-11-02+01:00</cbc:EndDate><cbc:EndTime>10:00:00+01:00</cbc:EndTime></cac:TenderSubmissionDeadlinePeriod></cac:TenderingProcess><cac:ProcurementProject><cbc:Name languageID="DEU">Synthetic cleaning &amp; windows</cbc:Name><cac:MainCommodityClassification><cbc:ItemClassificationCode listName="cpv">90911200</cbc:ItemClassificationCode></cac:MainCommodityClassification><cac:RealizedLocation><cac:Address><cbc:CityName>Gingst</cbc:CityName><cbc:PostalZone>18569</cbc:PostalZone><cac:Country><cbc:IdentificationCode>DEU</cbc:IdentificationCode></cac:Country></cac:Address></cac:RealizedLocation></cac:ProcurementProject></cac:ProcurementProjectLot></ContractNotice>`;

test('seed export rejects extra private fields, non-TED hosts, query tokens and malformed IDs', () => {
  assert.deepEqual(policy.parseTedSeeds(seedInput), [seed]);
  for (const patch of [{ raw_data: {} }, { source_url: 'https://ted.europa.eu.evil/notice/-/detail/679270-2026' }, { source_url: 'https://ted.europa.eu/de/notice/-/detail/679270-2026?token=secret' }, { source_url: 'http://localhost/' }, { source_url: 'https://ted.europa.eu:443/de/notice/-/detail/679270-2026' }, { external_id: 'injected" OR true' }]) {
    const input = clone(seedInput); Object.assign(input.candidates[0], patch); assert.throws(() => policy.parseTedSeeds(input));
  }
  assert.throws(() => policy.parseTedSeeds({ ...seedInput, candidates: [seedInput.candidates[0], seedInput.candidates[0]] }));
});
test('complete API search excludes timeout, omitted status, truncation and continuation', () => {
  const full = { totalNoticeCount: 1, notices: [{ ...meta, links: { contact: 'must-not-leak' } }], timedOut: false, iterationNextToken: null };
  assert.deepEqual(policy.completeSearch(full), [meta]);
  for (const patch of [{ timedOut: true }, { timedOut: undefined }, { totalNoticeCount: 2 }, { iterationNextToken: 'next' }, { notices: [] }]) assert.throws(() => policy.completeSearch({ ...full, ...patch }));
});
test('changed, branched, closed and unknown-result chains fail closed', () => {
  assert.deepEqual(policy.assertSimpleCurrent(seed, [meta], [meta], [meta], []), meta);
  for (const altered of [{ ...meta, 'form-type': 'result' }, { ...meta, 'competition-termination-proc': true }, { ...meta, 'procurement-relaunch-proc': true }, { ...meta, 'notice-version': 2 }, { ...meta, 'change-notice-version-identifier': `${notice}-01` }, { ...meta, 'winner-selection-status': ['selec-w'] }]) assert.throws(() => policy.assertSimpleCurrent(seed, [meta], [altered], [meta], []));
  assert.throws(() => policy.assertSimpleCurrent(seed, [meta], [meta, { 'form-type': 'result' }], [meta], []));
  assert.throws(() => policy.assertSimpleCurrent(seed, [meta], [meta], [meta, meta], []));
  assert.throws(() => policy.assertSimpleCurrent(seed, [meta], [meta], [meta], [{ 'form-type': 'change' }]));
});
test('explicit local deadline retains source timezone with independent UTC conversion', () => {
  const deadline = policy.exactDeadline(lot);
  assert.equal(deadline.at, '2026-11-02T10:00:00+01:00');
  assert.equal(new Date(deadline.at).toISOString(), '2026-11-02T09:00:00.000Z');
  assert.equal(policy.exactDeadline({ ...lot, tenderDates: [], tenderTimes: [], requestDates: ['2026-11-02'], requestTimes: ['10:00:00Z'] }).kind, 'request');
});
test('missing, inferred, conflicting or invalid deadlines never become 23:59', () => {
  for (const patch of [{ tenderTimes: [] }, { tenderTimes: ['10:00:00'] }, { tenderTimes: ['10:00:00+02:00'] }, { tenderDates: ['2026-02-30+01:00'] }, { tenderTimes: ['24:00:00+01:00'] }, { tenderTimes: ['10:00:00+14:30'], tenderDates: ['2026-11-02'] }, { tenderDates: [], tenderTimes: [] }, { requestDates: ['2026-11-02'], requestTimes: ['10:00:00+01:00'] }, { tenderDates: ['2026-11-02', '2026-11-03'] }]) assert.throws(() => policy.exactDeadline({ ...lot, ...patch }));
});
test('candidate identity is procedure/lot based and version independent; construction sections stay distinct', () => {
  const c = candidateFrom().candidates[0]; assert.ok(c); assert.equal(c.canonicalUnitId, `ted:${proc}:LOT-0001`); assert.equal(c.locations[0].accuracy, 'verified_performance_postcode_reference');
  const updated = policy.candidatesFromVerifiedSource(seed, { ...meta, 'notice-version': 2 }, { ...xmlFacts, version: '02' }, geo, checked, 'c'.repeat(64)).candidates[0];
  assert.equal(updated.publicId, c.publicId); assert.equal(updated.canonicalUnitId, c.canonicalUnitId); assert.notEqual(updated.version, c.version);
  assert.notEqual(policy.canonicalUnitId('425a08fb-f7f8-48ea-8071-50471bd72193', lot.id), c.canonicalUnitId);
});
test('only exact performance postcode+city matching qualifies, never buyer/postcode-only/fuzzy', () => {
  for (const locations of [[], [{ postcode: '18569', city: 'Other town', country: 'DEU' }], [{ postcode: '18569', city: 'Gingst district', country: 'DEU' }], [{ postcode: '18569', city: 'Gingst', country: 'POL' }]]) assert.equal(candidateFrom({ lots: [{ ...lot, locations }] }).candidates.length, 0);
  const conflicting = { ...geo, performancePlaces: [...geo.performancePlaces, { ...geo.performancePlaces[0], lat: 54.4 }] };
  assert.equal(candidateFrom({}, conflicting).candidates.length, 0);
  assert.equal(candidateFrom({}, { ...geo, performancePlaces: [{ ...geo.performancePlaces[0], sourceAccuracy: null }] }).candidates.length, 0);
});
test('CPV, expiration, lot mapping and source mismatch cannot be silently accepted', () => {
  assert.equal(candidateFrom({ lots: [{ ...lot, cpv: '90910000' }] }).candidates.length, 0);
  assert.equal(candidateFrom({}, geo, '2026-11-02T09:00:00.000Z').rejected[0].reason, 'deadline_expired');
  for (const patch of [{ procedureIdentifier: notice }, { formType: 'result' }, { procedureType: 'restricted' }, { hasChangeOrClosure: true }, { lots: [lot, lot] }]) assert.throws(() => candidateFrom(patch));
});
test('short deadlines expire within one hour, ordinary candidates within 24 hours', () => {
  assert.equal(candidateFrom().candidates[0].eligibilityExpiresAt, '2026-10-04T11:00:00.000Z');
  assert.equal(candidateFrom({}, geo, '2026-11-02T08:30:00.000Z').candidates[0].eligibilityExpiresAt, '2026-11-02T09:00:00.000Z');
});
test('XML parser maps real namespaces and exact lot paths; public allowlist strips unrelated data', async () => {
  const facts = await parseTedXml(XML); assert.equal(facts.lots[0].title, 'Synthetic cleaning & windows'); assert.deepEqual(facts.lots[0].locations, lot.locations);
  const buyerOnly = XML.replace('<cac:RealizedLocation>', '<cac:BuyerLocation>').replace('</cac:RealizedLocation>', '</cac:BuyerLocation>');
  assert.deepEqual((await parseTedXml(buyerOnly)).lots[0].locations, []);
  await assert.rejects(parseTedXml(XML.replace('urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2', 'https://evil.invalid')));
});
test('XML rejects DTD, entities, oversized, malformed and missing dependency without retaining source', async () => {
  for (const xml of ['<!DOCTYPE a [<!ENTITY x SYSTEM "file:///etc/passwd">]><a>&x;</a>', '<!ENTITY x "boom">', '<broken>', 'x'.repeat(2000001)]) await assert.rejects(parseTedXml(xml));
  await assert.rejects(parseTedXml(XML, { python: '/does/not/exist' }), /python3_lxml_required/);
});
test('source failure or final procedure change returns no candidates, with scoped prior revocation', async () => {
  const previous = { candidates: candidateFrom().candidates };
  for (const client of [fakeClient({ failCall: 2 }), fakeClient({ finalRows: [meta, { 'form-type': 'result' }] }), fakeClient({ referring: [meta] })]) {
    const result = await revalidateBatch(seedInput, geo, previous, client, { now, parseXml: async () => xmlFacts });
    assert.equal(result.batch.candidates.length, 0); assert.deepEqual(result.batch.revokedCanonicalUnitIds, [previous.candidates[0].canonicalUnitId]); assert.equal(result.report.seedFailures.length, 1);
  }
});
test('checked timestamp occurs after validation; slow validation cannot refresh eligibility', async () => {
  let tick = Date.parse(checked);
  const result = await revalidateSeed(seed, geo, fakeClient(), { now: () => { tick += 1000; return tick; }, parseXml: async () => xmlFacts });
  assert.equal(result.candidates[0].sourceStatusCheckedAt, '2026-10-03T11:00:02.000Z');
  let step = 0; await assert.rejects(revalidateSeed(seed, geo, fakeClient(), { now: () => now() + step++ * 121000, parseXml: async () => xmlFacts }), /source_validation_too_slow/);
});
test('client always uses anonymous official ALL-scope requests, strips links, blocks XML URL injection', async () => {
  const calls = []; const client = createTedClient(async (url, opts) => { calls.push({ url, opts }); return new Response(JSON.stringify({ totalNoticeCount: 1, notices: [{ ...meta, contacts: 'private' }], timedOut: false, iterationNextToken: null })); });
  assert.deepEqual(await client.search('publication-number = "679270-2026"'), [meta]);
  const call = calls[0]; assert.equal(call.url, 'https://api.ted.europa.eu/v3/notices/search'); assert.equal(JSON.parse(call.opts.body).scope, 'ALL'); assert.equal(call.opts.credentials, 'omit'); assert.equal(call.opts.redirect, 'error'); assert.equal(call.opts.cache, 'no-store'); assert.equal(Object.hasOwn(call.opts.headers, 'authorization'), false);
  await assert.rejects(client.xml('../../metadata'), /invalid_publication_number/); assert.equal(calls.length, 1);
});
test('response actual byte cap applies without Content-Length; prior projection units absent from export are removed without claiming closure', async () => {
  await assert.rejects(readBounded(new Response('a'.repeat(1000)), 999), /ted_response_too_large/);
  assert.deepEqual(policy.priorUnits({ candidates: [{ canonicalUnitId: 'ted:425a08fb-f7f8-48ea-8071-50471bd72193:LOT-0001' }] }), ['ted:425a08fb-f7f8-48ea-8071-50471bd72193:LOT-0001']);
  assert.throws(() => policy.priorUnits({ candidates: [{ canonicalUnitId: 'not-a-public-ted-unit' }] }));
  assert.throws(() => policy.validateGeodata({ ...geo, license: { ...geo.license, url: 'unverified' } }));
});

function manySeeds(count) {
  return { ...seedInput, candidates: Array.from({ length: count }, (_, i) => ({ source_portal: 'ted', external_id: `a79d0d9b-ba08-470b-a5cf-${String(i).padStart(12, '0')}`, procedure_identifier: `14c6fcb3-6d30-4df4-a366-${String(i).padStart(12, '0')}`, source_url: `https://ted.europa.eu/de/notice/-/detail/${i + 1}-2026` })) };
}
test('batch accepts up to 500 seeds and enforces exactly four concurrent workers', async () => {
  assert.equal(policy.parseTedSeeds(manySeeds(500)).length, 500);
  assert.throws(() => policy.parseTedSeeds(manySeeds(501)));
  let active = 0, peak = 0, calls = 0;
  const client = { async search() { active++; calls++; peak = Math.max(peak, active); await new Promise((r) => setTimeout(r, 5)); active--; throw new Error('ted_http_failure'); } };
  const result = await revalidateBatch(manySeeds(12), geo, null, client);
  assert.equal(peak, 4); assert.equal(calls, 12); assert.equal(result.report.seedFailures.length, 12); assert.equal(result.report.status, 'partial'); assert.equal(result.batch.candidates.length, 0);
});
test('global abort stops new work, reports unprocessed seeds and revokes prior candidates', async () => {
  const controller = new AbortController(); let calls = 0;
  const client = { signal: controller.signal, async search() { calls++; return new Promise((_, reject) => { controller.signal.addEventListener('abort', () => reject(new Error('run_budget_exceeded')), { once: true }); }); } };
  const timer = setTimeout(() => controller.abort(), 15);
  try {
    const result = await revalidateBatch(manySeeds(500), geo, { candidates: candidateFrom().candidates }, client);
    assert.equal(calls, 4); assert.equal(result.report.unprocessedCount, 496); assert.equal(result.report.seedFailures.length, 500); assert.equal(result.batch.candidates.length, 0); assert.equal(result.batch.revokedCanonicalUnitIds.length, 1);
    assert.ok(result.report.seedFailures.every((f) => f.reason.startsWith('run_budget_exceeded')));
    await assert.rejects(parseTedXml(XML, { signal: controller.signal }), /run_budget_exceeded/);
    const boundedClient = createTedClient(async () => { throw new Error('must_not_fetch'); }, { signal: controller.signal });
    await assert.rejects(boundedClient.search('x'), /run_budget_exceeded/); assert.equal(boundedClient.requests, 0);
  } finally { clearTimeout(timer); }
});
test('empty complete seed export revokes previous projection as absent, without a closure claim', async () => {
  const result = await revalidateBatch({ ...seedInput, candidates: [] }, geo, { candidates: candidateFrom().candidates }, {});
  assert.equal(result.report.status, 'complete'); assert.equal(result.report.seedCount, 0); assert.equal(result.report.absentSeedPriorUnitCount, 1); assert.equal(result.batch.revokedCanonicalUnitIds.length, 1);
  assert.match(result.report.revocationMeaning, /not a claim of award or cancellation/);
});
test('pilot does not pretend to support participation or restricted procedures', () => {
  const requestOnly = { ...lot, tenderDates: [], tenderTimes: [], requestDates: ['2026-11-02+01:00'], requestTimes: ['10:00:00+01:00'] };
  assert.equal(candidateFrom({ lots: [requestOnly] }).rejected[0].reason, 'unsupported_open_request_deadline');
  assert.throws(() => candidateFrom({ procedureType: 'restricted', lots: [requestOnly] }));
});

test('three consecutive HTTP failures open a global circuit and retain only safe diagnostics', async () => {
  let calls = 0;
  const client = createTedClient(async () => { calls++; return new Response('do-not-record-source-body', { status: 503, headers: { 'content-type': 'text/html; charset=utf-8' } }); }, { minimumIntervalMs: 0 });
  await assert.rejects(client.search('q'), /ted_http_503/);
  await assert.rejects(client.search('q'), /ted_http_503/);
  await assert.rejects(client.search('q'), /ted_consecutive_http_failures/);
  await assert.rejects(client.search('q'), /ted_consecutive_http_failures/);
  assert.equal(calls, 3); assert.equal(client.diagnostics.statusCounts[503], 3); assert.equal(client.diagnostics.responseContentTypes['text/html'], 3);
  assert.equal(JSON.stringify(client.diagnostics).includes('do-not-record'), false);
});
test('429 Retry-After is parsed and cannot extend the global run budget', async () => {
  assert.equal(retryAfterMilliseconds('12', 0), 12000);
  assert.equal(retryAfterMilliseconds('Thu, 01 Jan 1970 00:00:12 GMT', 0), 12000);
  assert.equal(retryAfterMilliseconds(null, 0), 60000);
  const client = createTedClient(async () => new Response('', { status: 429, headers: { 'retry-after': '601' } }), { minimumIntervalMs: 0 });
  await assert.rejects(client.search('q'), /ted_retry_after_exceeds_run_budget/);
  assert.equal(client.requests, 1); assert.equal(client.diagnostics.retryAfterSeconds, 601);
});
test('request pacing is shared across concurrent workers', async () => {
  const times = [];
  const client = createTedClient(async () => { times.push(Date.now()); return new Response(JSON.stringify({ totalNoticeCount: 0, notices: [], timedOut: false, iterationNextToken: null })); }, { minimumIntervalMs: 25 });
  await Promise.all([client.search('a'), client.search('b'), client.search('c')]);
  assert.equal(times.length, 3); assert.ok(times[2] - times[0] >= 40);
});

test('workers respect Retry-After and remain paced when the shared cooldown ends', async () => {
  const times = [];
  const client = createTedClient(async () => {
    times.push(Date.now());
    return times.length === 1 ? new Response('', { status: 429, headers: { 'retry-after': '1' } }) : new Response(JSON.stringify({ totalNoticeCount: 0, notices: [], timedOut: false, iterationNextToken: null }));
  }, { minimumIntervalMs: 25 });
  await Promise.all([client.search('a'), client.search('b'), client.search('c')]);
  assert.equal(times.length, 4); assert.ok(times[1] - times[0] >= 950); assert.ok(times[2] - times[1] >= 20); assert.ok(times[3] - times[2] >= 20);
  assert.equal(client.diagnostics.statusCounts[429], 1); assert.equal(client.diagnostics.statusCounts[200], 3);
});
