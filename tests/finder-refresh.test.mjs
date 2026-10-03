import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import { configFromEnvironment, fetchSeedExport, runRefresh, SOURCE_RPC, safeDiagnostics, selectPilotRefresh } from '../scripts/finder/refresh.mjs';

const id = n => `ted:14c6fcb3-6d30-4df4-a366-a658870a7004:LOT-${String(n).padStart(4,'0')}`;
const candidate = n => ({canonicalUnitId:id(n)});
const seed = {schemaVersion:1,kind:'supabase_ted_seed_export',candidates:[{source_portal:'ted',external_id:'a79d0d9b-ba08-470b-a5cf-0a705109dc00',source_url:'https://ted.europa.eu/de/notice/-/detail/679270-2026',procedure_identifier:'14c6fcb3-6d30-4df4-a366-a658870a7004'}]};
const env = {FINDER_IMPORT_DATABASE_URL:'postgresql://merkalku_finder_job:synthetic-password@synthetic.neon.tech/neondb?sslmode=require',FINDER_SOURCE_TOKEN:'a'.repeat(64),FINDER_SOURCE_ANON_KEY:'synthetic-publishable-key'};
const procedure = n => `14c6fcb3-6d30-4df4-a366-${String(n).padStart(12,'0')}`;
const sourceRow = n => ({...seed.candidates[0],external_id:procedure(n+1000),procedure_identifier:procedure(n),source_url:`https://ted.europa.eu/de/notice/-/detail/${n+100000}-2026`});
const storedRow = (n, extra={}) => ({canonicalUnitId:`ted:${procedure(n)}:LOT-0001`,revoked:false,eligibilityExpiresAt:new Date(n*3600000).toISOString(),...extra});
const sourceExport = rows => ({schemaVersion:1,kind:'supabase_ted_seed_export',candidates:rows});
function fixture({previous=[candidate(1)],batch={candidates:[candidate(2)],revokedCanonicalUnitIds:[id(1)]},exit=0}={}) {
  const calls=[]; let directory;
  const db={
    async claim(){calls.push({kind:'claim'});return {allowed:true};},
    async previous(){calls.push({kind:'previous'});return {candidates:previous};},
    async importBatch(candidates,revoked){calls.push({kind:'import',candidates,revoked});return {imported:candidates.length,revoked:revoked.length};},
    async cleanup(){calls.push({kind:'cleanup'});},
    async suspend(){calls.push({kind:'suspend'});return {suspended:true};},
  };
  const deps={db,async fetchSeeds(){calls.push({kind:'source'});return seed;},async runCli(name,args){
    calls.push({kind:'cli',name});const output=args[args.indexOf('--output')+1];directory=dirname(output);
    assert.equal((await stat(directory)).mode & 0o777,0o700);
    assert.equal((await stat(`${directory}/previous.json`)).mode & 0o777,0o600);
    if(name==='geodata.mjs'){await writeFile(output,'{}',{mode:0o600});return 0;}
    if(exit===0||exit===2){
      await writeFile(output,JSON.stringify(batch),{mode:0o600});
      await writeFile(args[args.indexOf('--report')+1],JSON.stringify({seedCount:1,requests:6,acceptedCount:batch.candidates.length,durationMs:123,http:{statusCounts:{200:6},responseContentTypes:{'application/json':5,'application/xml':1}},seedFailures:[],rejectedLots:[]}),{mode:0o600});
    }return exit;
  }};
  return {calls,deps,getDirectory:()=>directory};
}

test('job configuration rejects owner credentials and redirects source token only to fixed RPC',async()=>{
  assert.equal(configFromEnvironment(env).sourceToken,env.FINDER_SOURCE_TOKEN);
  for(const databaseUrl of [env.FINDER_IMPORT_DATABASE_URL.replace('merkalku_finder_job','neondb_owner'),env.FINDER_IMPORT_DATABASE_URL.replace('.neon.tech','.evil.example'),env.FINDER_IMPORT_DATABASE_URL.replace('sslmode=require','sslmode=disable')]) assert.throws(()=>configFromEnvironment({...env,FINDER_IMPORT_DATABASE_URL:databaseUrl}));
  let sent;
  const output=await fetchSeedExport(configFromEnvironment(env),async(url,options)=>{sent={url,options};return new Response(JSON.stringify(seed.candidates),{headers:{'content-type':'application/json'}});});
  assert.deepEqual(output,seed);assert.equal(sent.url,SOURCE_RPC);assert.equal(sent.options.redirect,'error');assert.equal(sent.options.credentials,'omit');assert.equal(sent.options.headers.apikey,env.FINDER_SOURCE_ANON_KEY);
  assert.deepEqual(JSON.parse(sent.options.body),{p_token:env.FINDER_SOURCE_TOKEN});
});

test('seed export fails closed on private fields, oversized data or HTTP errors',async()=>{
  for(const response of [new Response(JSON.stringify([{...seed.candidates[0],raw_data:'PRIVATE'}]),{headers:{'content-type':'application/json'}}),new Response('x'.repeat(1000001),{headers:{'content-type':'application/json'}}),new Response('{}',{status:401,headers:{'content-type':'application/json'}})]) await assert.rejects(fetchSeedExport(configFromEnvironment(env),async()=>response),/source_export_failed/);
});

test('pilot refresh prioritizes evidence expiry, caps 12 procedures and rotates two discovery seeds',()=>{
  const previous={candidates:Array.from({length:20},(_,i)=>storedRow(i+1))};
  const input=sourceExport(Array.from({length:50},(_,i)=>sourceRow(i+1)));
  const selected=selectPilotRefresh(input,previous,0);
  assert.deepEqual(selected.seeds.candidates.slice(0,10).map(row=>row.procedure_identifier),Array.from({length:10},(_,i)=>procedure(i+1)));
  assert.deepEqual(selected.seeds.candidates.slice(10).map(row=>row.procedure_identifier),[procedure(21),procedure(22)]);
  assert.equal(selected.previous.candidates.length,10);
  assert.deepEqual(selected.stats,{availableSeeds:50,selectedSeeds:12,retainedProcedures:10,discoverySeeds:2,absentPreviousUnits:0,deferredPreviousUnits:10});
  const next=selectPilotRefresh(input,previous,3600000);
  assert.deepEqual(next.seeds.candidates.slice(10).map(row=>row.procedure_identifier),[procedure(23),procedure(24)]);
  assert.equal(previous.candidates[0].eligibilityExpiresAt,new Date(3600000).toISOString());
});

test('absent procedures enter the revocation scope but deliberately deferred procedures do not',()=>{
  const previous={candidates:[...Array.from({length:15},(_,i)=>storedRow(i+1)),storedRow(99)]};
  const input=sourceExport(Array.from({length:15},(_,i)=>sourceRow(i+1)));
  const selected=selectPilotRefresh(input,previous,0);
  assert.equal(selected.seeds.candidates.length,12);assert.equal(selected.stats.discoverySeeds,0);
  assert.equal(selected.previous.candidates.length,13);assert.equal(selected.stats.deferredPreviousUnits,3);
  assert.equal(selected.stats.absentPreviousUnits,1);assert.deepEqual(selected.absentIds,[storedRow(99).canonicalUnitId]);
  assert.ok(selected.previous.candidates.some(row=>row.canonicalUnitId===storedRow(99).canonicalUnitId));
  const renewed=previous.candidates.map(row=>row.canonicalUnitId===storedRow(1).canonicalUnitId?{...row,eligibilityExpiresAt:new Date(100*3600000).toISOString()}:row);
  assert.equal(selectPilotRefresh(input,{candidates:renewed},0).seeds.candidates[0].procedure_identifier,procedure(2));
});

test('missing source seeds require conservative revocation without validating them as candidates',async()=>{
  for (const omitRevocation of [false,true]) {
    const absent=storedRow(99);
    const f=fixture({previous:[candidate(1),absent],batch:{candidates:[candidate(2)],revokedCanonicalUnitIds:omitRevocation?[id(1)]:[id(1),absent.canonicalUnitId]}});
    const result=await runRefresh(f.deps);
    assert.equal(result.exitCode,omitRevocation?1:0);
    if(omitRevocation) assert.equal(result.code,'invalid_revalidation_batch');
    assert.ok(f.calls.filter(call=>call.kind==='import').flatMap(call=>call.revoked).includes(absent.canonicalUnitId));
  }
});

test('duplicate procedure seeds and revoked stored lots cannot consume maintenance slots',()=>{
  const previous={candidates:[storedRow(1,{revoked:true}),storedRow(2),{...storedRow(2),canonicalUnitId:`ted:${procedure(2)}:LOT-0002`}]};
  const input=sourceExport([sourceRow(1),sourceRow(2),{...sourceRow(2),source_url:'https://ted.europa.eu/de/notice/-/detail/999999-2026'},sourceRow(3)]);
  const selected=selectPilotRefresh(input,previous,0);
  assert.equal(selected.seeds.candidates.length,3);assert.equal(selected.stats.retainedProcedures,1);
  assert.equal(selected.seeds.candidates[0].procedure_identifier,procedure(2));
  assert.equal(new Set(selected.seeds.candidates.map(row=>row.procedure_identifier)).size,3);
});

test('fatal pilot run excludes only attempted procedures and preserves deferred freshness unchanged',async()=>{
  const previous=Array.from({length:20},(_,i)=>storedRow(i+1));
  const f=fixture({previous,exit:1});f.deps.fetchSeeds=async()=>sourceExport(Array.from({length:30},(_,i)=>sourceRow(i+1)));
  const original=f.deps.runCli;let passedPrevious,passedSeeds;
  f.deps.runCli=async(name,args)=>{
    if(name==='ted-revalidate.mjs') {
      assert.equal(args[0],'--pilot');
      passedPrevious=JSON.parse(await readFile(args[args.indexOf('--previous')+1],'utf8'));
      passedSeeds=JSON.parse(await readFile(args[args.indexOf('--input')+1],'utf8'));
    }
    return original(name,args);
  };
  const result=await runRefresh(f.deps,{now:0});assert.equal(result.exitCode,1);
  assert.equal(passedSeeds.candidates.length,12);assert.equal(passedPrevious.candidates.length,10);
  assert.deepEqual(f.calls.filter(call=>call.kind==='import').flatMap(call=>call.revoked),previous.slice(0,10).map(row=>row.canonicalUnitId));
  assert.equal(result.selection.deferredPreviousUnits,10);
});

test('revocations precede bounded candidate chunks; temp files disappear; no inventory in summary',async()=>{
  const f=fixture({batch:{candidates:Array.from({length:205},(_,i)=>candidate(i+10)),revokedCanonicalUnitIds:[id(1)]}});
  const result=await runRefresh(f.deps);
  assert.equal(result.exitCode,0);assert.equal(result.imported,205);
  const imports=f.calls.filter(c=>c.kind==='import');assert.deepEqual(imports.map(c=>[c.candidates.length,c.revoked.length]),[[0,1],[100,0],[100,0],[5,0]]);
  assert.equal(f.calls.at(-1).kind,'cleanup');await assert.rejects(stat(f.getDirectory()),{code:'ENOENT'});
  assert.ok(!JSON.stringify(result).includes('canonical'));assert.ok(!JSON.stringify(result).includes('ted:'));
});

test('TED exit two still applies safe partial candidates and revokes old units',async()=>{
  const f=fixture({exit:2});const result=await runRefresh(f.deps);
  assert.equal(result.exitCode,2);assert.equal(result.status,'partial');assert.equal(result.imported,1);assert.equal(result.revoked,1);
  assert.deepEqual(f.calls.filter(c=>c.kind==='import').map(c=>c.candidates.length),[0,1]);
});

test('TED fatal exit creates no freshness, revokes known state and always cleans up',async()=>{
  const f=fixture({exit:1});const result=await runRefresh(f.deps);
  assert.equal(result.exitCode,1);assert.equal(result.code,'ted_revalidation_fatal');
  assert.ok(f.calls.filter(c=>c.kind==='import').every(c=>c.candidates.length===0));
  assert.deepEqual(f.calls.find(c=>c.kind==='import').revoked,[id(1)]);assert.equal(f.calls.at(-1).kind,'cleanup');await assert.rejects(stat(f.getDirectory()),{code:'ENOENT'});
});

test('union with retained revoked units is checked before candidate import at capacity',async()=>{
  const previous=Array.from({length:1000},(_,i)=>candidate(i+1));
  const f=fixture({previous,batch:{candidates:[candidate(1001)],revokedCanonicalUnitIds:[id(1)]}});const result=await runRefresh(f.deps);
  assert.equal(result.code,'projection_capacity_exceeded');assert.equal(result.exitCode,1);assert.equal(result.imported,0);
  const imports=f.calls.filter(c=>c.kind==='import');assert.ok(imports.every(c=>c.candidates.length===0 && c.revoked.length<=100));
  assert.equal(new Set(imports.flatMap(c=>c.revoked)).size,1000);assert.equal(f.calls.at(-1).kind,'cleanup');
});

test('failed later import stops further chunks and revokes attempted chunk even after lost ACK',async()=>{
  const f=fixture({batch:{candidates:Array.from({length:205},(_,i)=>candidate(i+10)),revokedCanonicalUnitIds:[id(1)]}});
  const original=f.deps.db.importBatch;let candidateCalls=0;
  f.deps.db.importBatch=async(candidates,revoked)=>{
    if(candidates.length && ++candidateCalls===2){f.calls.push({kind:'import',candidates,revoked});throw new Error('postgresql://DO_NOT_LOG_SECRET');}
    return original(candidates,revoked);
  };
  const result=await runRefresh(f.deps);assert.equal(result.exitCode,1);assert.equal(candidateCalls,2);
  const revoked=new Set(f.calls.filter(c=>c.kind==='import').flatMap(c=>c.revoked));assert.ok(revoked.has(id(209)));assert.ok(!revoked.has(id(214)));
  assert.equal(JSON.stringify(result).includes('SECRET'),false);assert.equal(f.calls.at(-1).kind,'cleanup');
});

test('revocation failure stops candidates and suspends the source before cleanup',async()=>{
  const f=fixture();f.deps.db.importBatch=async()=>{throw new Error('secret-source-token');};
  const result=await runRefresh(f.deps);assert.equal(result.exitCode,1);assert.equal(result.imported,0);assert.equal(result.revocationFailed,true);assert.equal(result.sourceSuspended,true);assert.deepEqual(f.calls.slice(-2),[{kind:'suspend'},{kind:'cleanup'}]);
});

test('hourly claim denies before all source/network work but cleanup still runs',async()=>{
  const f=fixture();f.deps.db.claim=async()=>({allowed:false,reason:'limited',retryAfterSeconds:3600});
  const result=await runRefresh(f.deps);assert.equal(result.status,'skipped');assert.equal(result.exitCode,0);assert.deepEqual(f.calls,[{kind:'cleanup'}]);
});

test('source failure and cleanup failure are reported safely even on a skipped run',async()=>{
  const f=fixture();f.deps.fetchSeeds=async()=>{throw new Error(env.FINDER_SOURCE_TOKEN);};const result=await runRefresh(f.deps);
  assert.equal(result.exitCode,1);assert.equal(result.code,'refresh_failed');assert.ok(!JSON.stringify(result).includes(env.FINDER_SOURCE_TOKEN));assert.equal(f.calls.at(-1).kind,'cleanup');
  assert.deepEqual(f.calls.filter(call=>call.kind==='import').flatMap(call=>call.revoked),[id(1)]);
  const g=fixture();g.deps.db.claim=async()=>({allowed:false,reason:'limited'});g.deps.db.cleanup=async()=>{throw new Error('private');};
  const skipped=await runRefresh(g.deps);assert.equal(skipped.exitCode,1);assert.equal(skipped.cleanupFailed,true);
});


test('diagnostic allowlist emits only bounded aggregates and suppresses identifiers/URLs/unknown error strings',()=>{
  const report={seedCount:263,requests:8,acceptedCount:2,durationMs:12000,sourceUrl:'https://private.example/SECRET',http:{statusCounts:{200:7,429:1},responseContentTypes:{'application/json':7,'https://private.example/SECRET':1}},seedFailures:[{publicationNumber:'SECRET',reason:'ted_http_429'},{procedure:'SECRET',reason:'run_budget_exceeded_unprocessed'},{reason:'https://private.example/SECRET'}],rejectedLots:[{canonicalUnitId:'SECRET',reason:'invalid_performance_location'}]};
  const out=safeDiagnostics(report);assert.deepEqual(out.httpStatusCounts,{'200':7,'429':1});assert.deepEqual(out.contentTypeCounts,{'application/json':7,other:1});
  assert.equal(out.errorCodeCounts.ted_http_429,1);assert.equal(out.errorCodeCounts.run_budget_exceeded_unprocessed,1);assert.equal(out.errorCodeCounts.other,1);assert.equal(out.errorCodeCounts.invalid_performance_location,1);
  assert.equal(out.seedCount,263);assert.equal(JSON.stringify(out).includes('SECRET'),false);assert.equal(JSON.stringify(out).includes('https:'),false);
  const crowded=safeDiagnostics({...report,seedFailures:Array.from({length:200},(_,i)=>({reason:`ted_http_${100+i}`})),rejectedLots:[]});
  assert.ok(Object.keys(crowded.errorCodeCounts).length<=64);assert.equal(Object.values(crowded.errorCodeCounts).reduce((a,b)=>a+b,0),200);
  const bad=safeDiagnostics({...report,requests:3001,http:{statusCounts:{200:-1},responseContentTypes:{'application/json':999999}}});
  assert.equal(bad.rejectedFields,true);assert.equal(Object.hasOwn(bad,'requests'),false);assert.deepEqual(bad.httpStatusCounts,{});assert.deepEqual(bad.contentTypeCounts,{});
});

test('private TED report contributes aggregate counters while raw report is removed',async()=>{
  const f=fixture({exit:2});const result=await runRefresh(f.deps);
  assert.equal(result.exitCode,2);assert.equal(result.diagnostics.available,true);assert.equal(result.diagnostics.requests,6);assert.equal(result.diagnostics.acceptedCount,1);
  assert.deepEqual(result.diagnostics.httpStatusCounts,{'200':6});await assert.rejects(stat(f.getDirectory()),{code:'ENOENT'});
});


test('failed or malformed suspension is explicit and never prevents cleanup',async()=>{
  for(const suspend of [async()=>{throw new Error('private_db_failure');},async()=>({suspended:false}),async()=>null]) {
    const f=fixture();f.deps.db.importBatch=async()=>{throw new Error('revocation_failed');};f.deps.db.suspend=suspend;
    const result=await runRefresh(f.deps);assert.equal(result.exitCode,1);assert.equal(result.revocationFailed,true);assert.equal(result.sourceSuspended,false);assert.equal(f.calls.at(-1).kind,'cleanup');
    assert.equal(JSON.stringify(result).includes('private_db_failure'),false);
  }
});
