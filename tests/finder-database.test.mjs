import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import { execFileSync, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';

// Always starts an isolated, socket-only synthetic cluster. Never consumes DATABASE_URL.
const bin = process.env.FINDER_TEST_PG_BIN || ['/opt/homebrew/opt/postgresql@18/bin', '/opt/homebrew/opt/postgresql/bin', '/usr/lib/postgresql/18/bin', '/usr/lib/postgresql/17/bin'].find(p => existsSync(join(p, 'postgres')));
const enabled = !!bin;
const run = promisify(execFile);
let dir, env, started = false;
const hash = value => createHash('sha256').update(value).digest('hex');
const quote = value => `'${String(value).replaceAll("'", "''")}'`;
const json = value => `${quote(JSON.stringify(value))}::jsonb`;
const issued = new Date(Date.now() - 5000).toISOString();
function sql(source, role) {
  return execFileSync(join(bin,'psql'), ['-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-c', `${role ? `SET ROLE ${role};` : ''}${source}`], {env,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
}
function value(source, role='finder_runtime') { return JSON.parse(sql(source,role)); }
function search({budget='budget1',session='session1',ip='ip1',postcode='76275',radius=50,after=null,snapshot=null,budgetIssued=issued,sessionIssued=issued}={}) {
  return `SELECT finder_api.search(${quote(hash(budget))},${quote(hash(session))},${quote(hash(ip))},${quote(budgetIssued)},${quote(sessionIssued)},${quote(postcode)},${radius},${after===null?'NULL':quote(after)},${snapshot===null?'NULL':quote(snapshot)});`;
}
function candidate(index=1, overrides={}) {
  return {publicId:`opaque_public_notice_${String(index).padStart(5,'0')}`,canonicalUnitId:`procedure/lot-${String(index).padStart(5,'0')}`,version:'v1',title:`Synthetic cleaning notice ${index}`,serviceLabel:'Unterhaltsreinigung',sourceId:'ted',sourceUrl:`https://ted.europa.eu/de/notice/-/detail/${index}-2026`,publicProvenance:true,redistributionApproved:true,cleaningRelevanceApproved:true,noticeFormType:'competition',lifecycle:'open',isCurrentVersion:true,unresolvedChangeOrClosure:false,deadline:{kind:'tender',at:new Date(Date.now()+10*86400000).toISOString(),accuracy:'source_explicit_datetime',sourceVerified:true,timezoneKnown:true},sourceStatusCheckedAt:new Date(Date.now()-60000).toISOString(),sourceEvidenceDigest:'a'.repeat(64),eligibilityExpiresAt:new Date(Date.now()+12*3600000).toISOString(),revoked:false,locations:[{lat:49,lon:8.4,label:'Synthetic performance location',role:'performance',provenanceVerified:true,accuracy:'verified_performance_postcode_centroid'}],...overrides};
}
function reset(n=20) {
  sql('TRUNCATE finder_private.requests,finder_private.exposures,finder_private.snapshots,finder_private.sessions,finder_private.budgets,finder_private.units,finder_private.revocations RESTART IDENTITY; UPDATE finder_private.control SET enabled=true,source_enabled=true;');
  if(n) sql(`SELECT finder_api.import_batch(${json(Array.from({length:n},(_,i)=>candidate(i+1)))},'[]');`,'finder_importer');
}
const dbtest = (name, fn) => test(name,{skip: !enabled && 'Local PostgreSQL binaries unavailable; no remote fallback'},fn);
before(()=>{
  if(!enabled) return;
  dir=mkdtempSync(join(tmpdir(),'finder-pg-'));
  const data=join(dir,'data');
  execFileSync(join(bin,'initdb'),['-D',data,'-A','trust','-U','finder_test','--no-sync','--locale=C','-E','UTF8'],{stdio:'pipe'});
  execFileSync(join(bin,'pg_ctl'),['-D',data,'-l',join(dir,'postgres.log'),'-o',`-c listen_addresses='' -k ${dir} -p 55492 -c fsync=off -c shared_buffers=16MB`,'-w','start'],{stdio:'pipe'});
  started=true;
  env={...Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('PG'))),PGHOST:dir,PGPORT:'55492',PGDATABASE:'postgres',PGUSER:'finder_test'};
  execFileSync(join(bin,'psql'),['-X','-q','-v','ON_ERROR_STOP=1','-f',resolve('scripts/finder/001-finder.sql')],{env,stdio:'pipe'});
  execFileSync(join(bin,'psql'),['-X','-q','-v','ON_ERROR_STOP=1','-f',resolve('scripts/finder/002-previous-batch.sql')],{env,stdio:'pipe'});
  execFileSync(join(bin,'psql'),['-X','-q','-v','ON_ERROR_STOP=1','-f',resolve('scripts/finder/003-refresh-claim.sql')],{env,stdio:'pipe'});
  execFileSync(join(bin,'psql'),['-X','-q','-v','ON_ERROR_STOP=1','-f',resolve('scripts/finder/004-suspend-source.sql')],{env,stdio:'pipe'});
  sql(`SELECT finder_api.import_postcodes(${json(['76275','76276','76277','76278'].map(postcode=>({postcode,lat:49,lon:8.4,provenance:'Synthetic test coordinate',license:'Test-only invented data'})))});`,'finder_importer');
});
after(()=>{
  if(started) execFileSync(join(bin,'pg_ctl'),['-D',join(dir,'data'),'-m','immediate','-w','stop'],{stdio:'pipe'});
  if(dir) rmSync(dir,{recursive:true,force:true});
});

dbtest('fresh migration starts disabled and keeps runtime/anonymous away from tables and import',()=>{
  assert.equal(value(search()).reason,'unavailable');
  for(const command of ['SELECT * FROM finder_private.units;',"SELECT finder_api.import_batch('[]','[]');",'UPDATE finder_private.control SET enabled=true;']) assert.throws(()=>sql(command,'finder_runtime'),/permission denied/);
  sql('CREATE ROLE finder_unrelated NOLOGIN;');
  assert.throws(()=>sql(`SELECT finder_api.entry(${quote(hash('ip'))});`,'finder_unrelated'),/permission denied/);
  const publicGrants=sql("SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE n.nspname IN ('finder_api','finder_private') AND a.grantee=0 AND a.privilege_type='EXECUTE';");
  assert.equal(publicGrants,'0');
});

dbtest('bounded import rejects result notices, buyer geometry and unknown/raw/contact fields atomically',()=>{
  reset(0);
  for(const bad of [candidate(1,{noticeFormType:'result'}),candidate(1,{raw_data:{contact:'private'}}),candidate(1,{locations:[{...candidate().locations[0],role:'buyer'}]}),candidate(1,{sourceUrl:'https://ted.europa.eu/de/notice/-/detail/1-2026?token=secret'}),candidate(1,{publicProvenance:'true'}),candidate(1,{deadline:{...candidate().deadline,at:'2026-12-01'}})]) assert.throws(()=>sql(`SELECT finder_api.import_batch(${json([candidate(2),bad])},'[]');`,'finder_importer'),/Invalid public candidate/);
  assert.equal(sql('SELECT count(*) FROM finder_private.units;'),'0');
});

dbtest('ten plus ten snapshot items, query/session binding, replay request count and no third page',()=>{
  reset(25);
  const first=value(search()); assert.equal(first.allowed,true); assert.equal(first.candidates.length,10); assert.equal(first.nextAfter,'2'); assert.deepEqual(first.origin,{lat:49,lon:8.4});
  const second=value(search({after:'2',snapshot:first.snapshot})); assert.equal(second.candidates.length,10); assert.equal(second.nextAfter,null);
  assert.equal(new Set([...first.candidates,...second.candidates].map(c=>c.canonicalUnitId)).size,20);
  const repeated=value(search({after:'2',snapshot:first.snapshot})); assert.equal(repeated.allowed,true);
  assert.equal(sql("SELECT count(*) FROM finder_private.exposures WHERE scope='budget';"),'20');
  assert.equal(sql("SELECT count(*) FROM finder_private.requests WHERE kind='search';"),'3');
  for(const input of [{after:'3',snapshot:first.snapshot},{after:'2',snapshot:first.snapshot,postcode:'76276'},{after:'2',snapshot:first.snapshot,session:'other'}]) assert.equal(value(search(input)).reason,'invalid_cursor');
});

dbtest('budget daily exposure is atomic and repeated canonical versions do not reset it',()=>{
  reset(30); const a=value(search()); value(search({after:'2',snapshot:a.snapshot}));
  sql("UPDATE finder_private.units SET revoked=true WHERE canonical_id <= 'procedure/lot-00020';");
  const denied=value(search({session:'renewed'})); assert.equal(denied.reason,'limited'); assert.ok(!('candidates' in denied));
  assert.equal(sql("SELECT count(*) FROM finder_private.exposures WHERE scope='budget';"),'20');
});

dbtest('separate IP exposure budget survives new signed budgets and sessions',()=>{
  reset(50);
  for(let b=1;b<=2;b++) { const q={budget:`budget${b}`,session:`session${b}`}; const a=value(search(q)); assert.equal(a.allowed,true); assert.equal(value(search({...q,after:'2',snapshot:a.snapshot})).allowed,true); sql(`UPDATE finder_private.units SET revoked=true WHERE canonical_id <= 'procedure/lot-${String(20*b).padStart(5,'0')}';`); }
  assert.equal(value(search({budget:'budget3',session:'session3'})).reason,'limited');
  assert.equal(sql("SELECT count(*) FROM finder_private.exposures WHERE scope='ip';"),'40');
});

dbtest('rolling daily exposure expires, lifetime sixty does not; old cookies cannot reinitialize',()=>{
  reset(10);
  sql(`INSERT INTO finder_private.exposures SELECT 'budget',${quote(hash('budget1'))},'old-'||i,clock_timestamp()-interval '25 hours' FROM generate_series(1,60) i;`);
  assert.equal(value(search()).reason,'limited');
  sql("DELETE FROM finder_private.exposures;");
  sql(`INSERT INTO finder_private.exposures SELECT 'budget',${quote(hash('budget1'))},'old-'||i,clock_timestamp()-interval '25 hours' FROM generate_series(1,20) i;`);
  assert.equal(value(search()).allowed,true);
  assert.equal(value(search({budget:'expired',session:'expired',budgetIssued:new Date(Date.now()-31*86400000).toISOString()})).reason,'unavailable');
});

dbtest('strict request, new-search and distinct postcode limits survive session renewal',()=>{
  reset(0);
  for(let i=0;i<6;i++) assert.equal(value(search()).allowed,true);
  assert.equal(value(search()).reason,'limited');
  for(let i=0;i<2;i++) assert.equal(value(search({session:'renewed'})).allowed,true);
  assert.equal(value(search({session:'renewed'})).reason,'limited');
  reset(0);
  for(const postcode of ['76275','76276','76277']) assert.equal(value(search({postcode})).allowed,true);
  assert.equal(value(search({postcode:'76278',session:'renewed'})).reason,'limited');
});

dbtest('source freshness, exact deadline, changed snapshot version and revocation fail closed',()=>{
  reset(20); const a=value(search());
  sql("UPDATE finder_private.units SET revoked=true WHERE canonical_id='procedure/lot-00011'; UPDATE finder_private.units SET version='v2' WHERE canonical_id='procedure/lot-00012'; UPDATE finder_private.units SET expires_at=clock_timestamp()-interval '1 second' WHERE canonical_id='procedure/lot-00013';");
  const b=value(search({after:'2',snapshot:a.snapshot})); assert.equal(b.candidates.length,7);
  reset(1); sql("UPDATE finder_private.units SET checked_at=clock_timestamp()-interval '25 hours';"); assert.equal(value(search()).candidates.length,0);
  reset(1); sql("UPDATE finder_private.units SET deadline_at=clock_timestamp()-interval '1 second';"); assert.equal(value(search()).candidates.length,0);
  reset(1); sql("UPDATE finder_private.units SET deadline_at=clock_timestamp()+interval '3 hours',checked_at=clock_timestamp()-interval '2 hours';"); assert.equal(value(search()).candidates.length,0);
  reset(1); sql("UPDATE finder_private.control SET source_enabled=false;"); assert.equal(value(search()).reason,'unavailable');
});

dbtest('global quotas are independent of IP/session; invalid queries cannot bypass entry',()=>{
  reset(0);
  sql("INSERT INTO finder_private.requests(happened_at,kind,ip_hash) SELECT clock_timestamp(),'entry',repeat('a',64) FROM generate_series(1,300);");
  assert.equal(value(`SELECT finder_api.entry(${quote(hash('freshIp'))});`).reason,'limited');
  sql("TRUNCATE finder_private.requests; INSERT INTO finder_private.requests(happened_at,kind,ip_hash) SELECT clock_timestamp()-interval '2 minutes','search',repeat('a',64) FROM generate_series(1,10000);");
  assert.equal(value(search({ip:'otherIp'})).reason,'limited');
});

dbtest('independent concurrent DB connections never exceed shared request/exposure caps',async()=>{
  reset(10);
  const results=await Promise.all(Array.from({length:20},async()=>{
    const out=await run(join(bin,'psql'),['-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-c',`SET ROLE finder_runtime;${search()}`],{env});
    return JSON.parse(out.stdout.trim());
  }));
  assert.ok(results.some(r=>r.allowed));
  assert.ok(results.filter(r=>r.allowed).length<=6);
  assert.ok(results.every(r=>r.allowed || ['limited','unavailable'].includes(r.reason)));
  assert.ok(Number(sql("SELECT count(*) FROM finder_private.requests WHERE kind='search';"))<=6);
  assert.equal(sql("SELECT count(*) FROM finder_private.exposures WHERE scope='budget';"),'10');
});

dbtest('cleanup has a bounded identity horizon; unknown postcode/expired snapshot is not empty-success',()=>{
  reset(20);
  assert.equal(value(search({postcode:'99999'})).reason,'unknown_postcode');
  const a=value(search()); sql("UPDATE finder_private.snapshots SET created_at=clock_timestamp()-interval '6 minutes';");
  assert.equal(value(search({after:'2',snapshot:a.snapshot})).reason,'invalid_cursor');
  sql(`INSERT INTO finder_private.budgets VALUES(${quote(hash('oldBudget'))},clock_timestamp()-interval '31 days'); INSERT INTO finder_private.exposures VALUES('ip',${quote(hash('oldIp'))},'old',clock_timestamp()-interval '31 days');`);
  sql('SELECT finder_api.cleanup();','finder_importer');
  assert.equal(sql(`SELECT count(*) FROM finder_private.budgets WHERE id=${quote(hash('oldBudget'))};`),'0');
  assert.equal(sql(`SELECT count(*) FROM finder_private.exposures WHERE subject=${quote(hash('oldIp'))};`),'0');
});


dbtest('revocations of not-yet-imported units reject delayed stale feed imports',()=>{
  reset(0);
  sql(`SELECT finder_api.import_batch('[]',${json([candidate().canonicalUnitId])});`,'finder_importer');
  assert.throws(()=>sql(`SELECT finder_api.import_batch(${json([candidate()])},'[]');`,'finder_importer'),/Stale candidate/);
  assert.equal(sql('SELECT count(*) FROM finder_private.units;'),'0');
});

dbtest('IP thirty-day cap and global first-exposure cap fail independently before release',()=>{
  reset(1);
  sql(`INSERT INTO finder_private.exposures SELECT 'ip',${quote(hash('ip1'))},'old-'||i,clock_timestamp()-interval '25 hours' FROM generate_series(1,120) i;`);
  assert.equal(value(search()).reason,'limited');
  sql("UPDATE finder_private.exposures SET first_seen=clock_timestamp()-interval '31 days';");
  assert.equal(value(search()).allowed,true);
  reset(1);
  sql("INSERT INTO finder_private.exposures SELECT 'budget','synthetic-global-'||i,'other-unit',clock_timestamp() FROM generate_series(1,30000) i;");
  assert.equal(value(search()).reason,'limited');
  assert.equal(sql(`SELECT count(*) FROM finder_private.exposures WHERE scope='budget' AND subject=${quote(hash('budget1'))};`),'0');
});

dbtest('session creation rate uses database first-use time, and same IDs cannot change issuance',()=>{
  reset(0);
  const past=new Date(Date.now()-3600000).toISOString();
  for(let i=0;i<10;i++) assert.equal(value(search({budget:`budget-${i}`,session:`session-${i}`,budgetIssued:past,sessionIssued:past})).allowed,true);
  assert.equal(value(search({budget:'eleventh',session:'eleventh',budgetIssued:past,sessionIssued:past})).reason,'limited');
  assert.equal(value(search({budget:'budget-0',session:'session-0',budgetIssued:issued,sessionIssued:issued})).reason,'unavailable');
});

dbtest('rolled-back exposure never consumes a budget',()=>{
  reset(10);
  const command=`BEGIN; SET ROLE finder_runtime; ${search()} ROLLBACK;`;
  assert.equal(JSON.parse(sql(command)).allowed,true);
  assert.equal(sql('SELECT count(*) FROM finder_private.exposures;'),'0');
});


dbtest('an independent connection holding the shared lock causes immediate fail-closed admission',async()=>{
  reset(1);
  const holding=run(join(bin,'psql'),['-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-c',"BEGIN; SELECT pg_advisory_xact_lock(1936028270,1718183012); SELECT pg_sleep(1); COMMIT;"],{env});
  try {
    for(let i=0;i<30;i++) {
      if(sql("SELECT count(*) FROM pg_locks WHERE locktype='advisory' AND classid=1936028270 AND objid=1718183012 AND granted;")==='1') break;
      await new Promise(r=>setTimeout(r,10));
    }
    const result=value(search()); assert.equal(result.allowed,false); assert.equal(result.reason,'unavailable'); assert.ok(!('candidates' in result));
  } finally { await holding; }
  assert.equal(sql('SELECT count(*) FROM finder_private.exposures;'),'0');
});


dbtest('previous batch is importer-only and retains revoked canonical state for absent-feed cleanup',()=>{
  reset(2);
  const id=candidate(1).canonicalUnitId;
  sql(`SELECT finder_api.import_batch('[]',${json([id])});`,'finder_importer');
  assert.throws(()=>sql('SELECT finder_api.previous_batch();','finder_runtime'),/permission denied/);
  assert.throws(()=>sql('SELECT finder_api.previous_batch();','finder_unrelated'),/permission denied/);
  const previous=value('SELECT finder_api.previous_batch();','finder_importer');
  assert.equal(previous.candidates.length,2);
  assert.equal(previous.candidates.find(c=>c.canonicalUnitId===id).revoked,true);
  assert.deepEqual(Object.keys(previous),['candidates']);
});


dbtest('refresh claim is importer-only and persists a rolling one-hour attempt limit',()=>{
  assert.throws(()=>sql('SELECT finder_api.claim_refresh();','finder_runtime'),/permission denied/);
  assert.throws(()=>sql('SELECT finder_api.claim_refresh();','finder_unrelated'),/permission denied/);
  assert.equal(value('SELECT finder_api.claim_refresh();','finder_importer').allowed,true);
  const denied=value('SELECT finder_api.claim_refresh();','finder_importer');
  assert.equal(denied.allowed,false); assert.equal(denied.reason,'limited'); assert.ok(denied.retryAfterSeconds>3500 && denied.retryAfterSeconds<=3600);
  sql("UPDATE finder_private.control SET last_refresh_started_at=clock_timestamp()-interval '61 minutes';");
  assert.equal(value('SELECT finder_api.claim_refresh();','finder_importer').allowed,true);
});


dbtest('full tombstone store cannot prevent importer suspension of all entry/search results',()=>{
  reset(1);
  assert.equal(value(search()).candidates.length,1);
  sql("INSERT INTO finder_private.revocations SELECT 'retained-revocation-'||i,clock_timestamp() FROM generate_series(1,1000) i;");
  assert.throws(()=>sql(`SELECT finder_api.import_batch('[]',${json([candidate(1).canonicalUnitId])});`,'finder_importer'),/Pilot projection capacity exceeded/);
  assert.equal(sql('SELECT revoked FROM finder_private.units;'),'f'); // Failed import rolled back its attempted revocation.
  assert.throws(()=>sql('SELECT finder_api.suspend_source();','finder_runtime'),/permission denied/);
  assert.throws(()=>sql('SELECT finder_api.suspend_source();','finder_unrelated'),/permission denied/);
  assert.deepEqual(value('SELECT finder_api.suspend_source();','finder_importer'),{suspended:true});
  assert.equal(value(`SELECT finder_api.entry(${quote(hash('ip1'))});`).reason,'unavailable');
  assert.equal(value(search()).reason,'unavailable');
  assert.throws(()=>sql('UPDATE finder_private.control SET source_enabled=true;','finder_importer'),/permission denied/);
  assert.deepEqual(value('SELECT finder_api.suspend_source();','finder_importer'),{suspended:true}); // Idempotent disable only.
  sql('BEGIN; SELECT pg_advisory_xact_lock(1936028270,1718183012); UPDATE finder_private.control SET source_enabled=true; COMMIT;');
  assert.equal(value(search()).candidates.length,1); // Explicit test-owner re-enable, never an importer function.
});
