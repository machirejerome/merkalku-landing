import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as crypto from 'node:crypto';
import * as net from 'node:net';
import { loadTs } from './route-test-harness.mjs';

const globals={Request,Response,Headers,URL,Buffer,TextDecoder,AbortController,setTimeout,clearTimeout};
const schema=loadTs('../src/lib/finder/schema.ts',{},globals);
const eligibility=loadTs('../src/lib/finder/eligibility.ts',{},globals);
const cursor=loadTs('../src/lib/finder/cursor.ts',{'server-only':{},'node:crypto':crypto},globals);
const identity=loadTs('../src/lib/finder/identity.ts',{'server-only':{},'node:crypto':crypto,'node:net':net},globals);
const server=loadTs('../src/lib/finder/server.ts',{'server-only':{},'./cursor':cursor,'./eligibility':eligibility,'./schema':schema},globals);
const live=loadTs('../src/lib/finder/live.ts',{'server-only':{},'./cursor':cursor,'./eligibility':eligibility,'./identity':identity,'./schema':schema,'./server':server},globals);
const key=new Uint8Array(32).fill(24), now=Date.parse('2026-10-03T12:00:00Z');
const query={postcode:'18569',radiusKm:50};
const post=(extraHeaders={},body=query)=>new Request('https://www.merkalku.de/api/ausschreibungsfinder',{method:'POST',headers:{'content-type':'application/json',origin:'https://www.merkalku.de','x-forwarded-for':'192.0.2.10',...extraHeaders},body:JSON.stringify(body)});
function fixture(){
 const calls=[];
 const candidate={publicId:'a_safe_public_identity_001',canonicalUnitId:'ted:procedure:lot1',version:'001',title:'Gingst Gebäudereinigung',serviceLabel:'Unterhaltsreinigung',sourceId:'ted',sourceUrl:'https://ted.europa.eu/de/notice/-/detail/681115-2026',publicProvenance:true,redistributionApproved:true,cleaningRelevanceApproved:true,noticeFormType:'competition',lifecycle:'open',isCurrentVersion:true,unresolvedChangeOrClosure:false,deadline:{kind:'tender',at:'2026-11-01T12:00:00Z',accuracy:'source_explicit_datetime',sourceVerified:true,timezoneKnown:true},sourceStatusCheckedAt:'2026-10-03T11:00:00Z',sourceEvidenceDigest:'verified-test-evidence',eligibilityExpiresAt:'2026-10-04T11:00:00Z',revoked:false,locations:[{lat:54.4565,lon:13.2574,label:'18569 Gingst',role:'performance',provenanceVerified:true,accuracy:'verified_performance_postcode_reference'}],raw_data:'MUST_NOT_LEAK',contact_email:'MUST_NOT_LEAK'};
 const result={allowed:true,candidates:[candidate],origin:{lat:54.4565,lon:13.2574},snapshot:'a-snapshot',nextAfter:null};
 const deps={key,origins:['https://www.merkalku.de'],onVercel:true,now:()=>now,entry:async()=>{calls.push('entry');return {allowed:true}},verifyBot:async()=>{calls.push('bot');return {isHuman:true,isBot:false,isVerifiedBot:false,bypassed:false}},search:async(input)=>{calls.push('search');assert.match(input.ipHash,/^[a-f0-9]{64}$/);assert.equal(input.ipHash.includes('192.'),false);return result}};
 return {deps,calls,result,candidate};
}
test('signed identity keeps 30-day budget when 24-hour session renews',()=>{
 const start=identity.renewIdentity(null,now);const token=identity.signIdentity(start,key);
 const parsed=identity.readIdentity(`${identity.FINDER_COOKIE}=${token}`,key,now+86400001);
 const renewed=identity.renewIdentity(parsed,now+86400001);
 assert.equal(renewed.budget,start.budget);assert.equal(renewed.budgetAt,start.budgetAt);assert.notEqual(renewed.session,start.session);
 assert.match(identity.identityCookie(renewed,key,now+86400001),/HttpOnly; Secure; SameSite=Strict; Max-Age=2505599/);
 assert.equal(identity.readIdentity(`${identity.FINDER_COOKIE}=${token}`,key,now+30*86400000),null);
 const tampered=`${token.slice(0,-1)}${token.endsWith('0')?'1':'0'}`;
 assert.equal(identity.readIdentity(`${identity.FINDER_COOKIE}=${tampered}`,key,now),null);
});
test('tampered and duplicate identity cookies are rejected',()=>{
 const token=identity.signIdentity(identity.renewIdentity(null,now),key),cookie=`${identity.FINDER_COOKIE}=${token}`;
 assert.equal(identity.readIdentity(cookie.replace(token,`X${token.slice(1)}`),key,now),null);
 assert.equal(identity.readIdentity(`${cookie}; ${cookie}`,key,now),null);
 assert.equal(identity.readIdentity(cookie,new Uint8Array(32).fill(1),now),null);
});
test('trusted IP normalization rejects spoofable lists and collapses IPv6 privacy addresses',()=>{
 assert.equal(identity.normalizedClientIp(post(),false),null);
 assert.equal(identity.normalizedClientIp(post({'x-forwarded-for':'1.2.3.4, 192.0.2.10'}),true),null);
 const a=identity.normalizedClientIp(post({'x-forwarded-for':'2001:db8:abcd:12::1'}),true);
 const b=identity.normalizedClientIp(post({'x-forwarded-for':'2001:0db8:abcd:0012:ffff:ffff:ffff:ffff'}),true);
 assert.equal(a,b);assert.equal(identity.normalizedClientIp(post({'x-forwarded-for':'::ffff:192.0.2.10'}),true),'192.0.2.10');
});
test('live handler returns only public DTO after bot and atomic DB admission',async()=>{
 const {deps,calls}=fixture();const response=await live.createDatabaseFinderHandler(deps)(post());const body=await response.json();
 assert.equal(response.status,200);assert.deepEqual(calls,['entry','bot','search']);assert.equal(body.items.length,1);
 assert.equal(JSON.stringify(body).includes('MUST_NOT_LEAK'),false);assert.equal(Object.hasOwn(body.items[0],'locations'),false);assert.equal(Object.hasOwn(body.items[0],'canonicalUnitId'),false);
 assert.match(response.headers.get('set-cookie'),/__Host-merkalku_finder=/);assert.match(response.headers.get('cache-control'),/no-store/);assert.match(response.headers.get('x-robots-tag'),/noindex/);
});
test('missing config or database outage never falls back to examples',async()=>{
 assert.equal((await live.createDatabaseFinderHandler(null)(post())).status,503);
 const {deps,calls}=fixture();deps.entry=async()=>{throw new Error('outage')};
 const response=await live.createDatabaseFinderHandler(deps)(post());assert.equal(response.status,503);assert.deepEqual(calls,[]);assert.equal(Object.hasOwn(await response.json(),'items'),false);
});
test('invalid origin and deployment hostname disclose no inventory',async()=>{
 for(const origin of ['https://other.example','null','https://merkalku.de']){const {deps,calls}=fixture();assert.equal((await live.createDatabaseFinderHandler(deps)(post({origin}))).status,403);assert.deepEqual(calls,[]);}
});
test('raw bots, verified bots and bypassed checks cannot access the projection',async()=>{
 for(const verdict of [{isHuman:false,isBot:true,isVerifiedBot:false,bypassed:false},{isHuman:true,isBot:false,isVerifiedBot:true,bypassed:false},{isHuman:true,isBot:false,isVerifiedBot:false,bypassed:true}]){
  const {deps,calls}=fixture();deps.verifyBot=async()=>verdict;assert.equal((await live.createDatabaseFinderHandler(deps)(post())).status,403);assert.deepEqual(calls,['entry']);
 }
});
test('malformed requests still consume entry limit before parsing',async()=>{
 const {deps,calls}=fixture();const response=await live.createDatabaseFinderHandler(deps)(post({}, {...query,limit:500}));assert.equal(response.status,400);assert.deepEqual(calls,['entry']);
});
test('quota denial is a real 429, retains identity and does not pretend empty results',async()=>{
 const {deps}=fixture();deps.search=async()=>({allowed:false,reason:'limited',retryAfterSeconds:3600});const response=await live.createDatabaseFinderHandler(deps)(post());
 assert.equal(response.status,429);assert.equal(response.headers.get('retry-after'),'3600');assert.ok(response.headers.get('set-cookie'));assert.equal(Object.hasOwn(await response.json(),'items'),false);
});
test('expired, result and buyer-only candidates cannot be serialized even if importer errs',async()=>{
 for(const patch of [{noticeFormType:'result'},{eligibilityExpiresAt:'2026-10-03T11:59:00Z'},{locations:[{lat:54.4565,lon:13.2574,label:'Buyer',role:'buyer',provenanceVerified:true,accuracy:'verified_performance_postcode_reference'}]}]){
  const {deps,result,candidate}=fixture();result.candidates=[{...candidate,...patch}];const response=await live.createDatabaseFinderHandler(deps)(post());assert.equal((await response.json()).items.length,0);
 }
});
test('page two cursor is cookie and query bound; cannot be replayed by another browser',async()=>{
 const {deps,result}=fixture();result.nextAfter='2';const response=await live.createDatabaseFinderHandler(deps)(post());const body=await response.json();
 assert.ok(body.nextCursor);const response2=await live.createDatabaseFinderHandler(deps)(post({}, {...query,cursor:body.nextCursor}));assert.equal(response2.status,400);
 const cookie=response.headers.get('set-cookie').split(';')[0];result.nextAfter=null;
 const response3=await live.createDatabaseFinderHandler(deps)(post({cookie},{...query,cursor:body.nextCursor}));assert.equal(response3.status,200);assert.equal((await response3.json()).nextCursor,null);
});
