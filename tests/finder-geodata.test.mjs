import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parsePostalText, unpackPostalArchive, buildGeodata, downloadArchive, MAX_BYTES, GEONAMES_URL } from '../scripts/finder/geodata.mjs';

const row = (postcode = '18569', city = 'Gingst', lat = '54.4565', lon = '13.2574') => ['DE', postcode, city, '', '', '', '', '', '', lat, lon, '4'].join('\t');
test('scheduled public GeoNames reference matches reviewed artifact, original archive and attribution',async()=>{
  const bytes=await readFile(new URL('../scripts/finder/data/geonames-de-2026-10-03.json',import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),'c377aa44a9b57c91e9867d9d7acb843a3e8877c0382ec1617cdc1defca3d095b');
  const data=JSON.parse(bytes);
  assert.equal(data.sourceArchiveSha256,'d86c76d5ec2e4e8df3bb450cd136f5cfae28da4ed7d84b473257b0ef7314e853');
  assert.equal(data.sourceUrl,GEONAMES_URL);assert.equal(data.license.url,'https://creativecommons.org/licenses/by/4.0/');
  assert.match(data.license.attribution,/GeoNames/);assert.equal(data.schemaVersion,1);
  assert.equal(data.postalCodes.length,10813);assert.equal(data.performancePlaces.length,23297);
  assert.equal(data.inputRowCount,23297);assert.equal(data.rejectedRowCount,0);
  assert.equal(data.performancePlaces.filter(place=>place.sourceAccuracy===null).length,8247);
});
function archive(entries) {
  const result = spawnSync('python3', ['-c', "import sys,json,io,zipfile\ndata=json.load(sys.stdin); b=io.BytesIO()\nwith zipfile.ZipFile(b,'w') as z:\n for name,value in data: z.writestr(name,value)\nsys.stdout.buffer.write(b.getvalue())"], { input: JSON.stringify(entries) });
  assert.equal(result.status, 0); return result.stdout;
}
test('ZIP reads only exact expected files and strict Unicode without extracting paths', async () => {
  const data = await unpackPostalArchive(archive([['DE.txt', row()], ['readme.txt', 'Creative Commons Attribution 4.0']]));
  assert.equal(parsePostalText(data['DE.txt'])[0].city, 'Gingst');
  await assert.rejects(unpackPostalArchive(archive([['../DE.txt', row()], ['readme.txt', 'license']])));
  await assert.rejects(unpackPostalArchive(archive([['DE.txt', row()], ['DE.txt', row()], ['readme.txt', 'license']])));
  await assert.rejects(unpackPostalArchive(Buffer.from('not a zip')));
});
test('postcode, country, row shape and geographic coordinates fail closed', () => {
  for (const value of [row('00000'), row('1234'), row('12A45'), row('18569', 'Gingst', 'NaN'), row('18569', 'Gingst', '0'), row().replace(/^DE/, 'GB'), row()+'\tunexpected']) assert.throws(() => parsePostalText(value));
});
test('blank real GeoNames accuracy stays unknown rather than aborting the whole archive or inferring precision',()=>{
  const blank=row().replace(/\t4$/,'\t');
  const places=parsePostalText(blank+'\n'+row());
  assert.equal(places[0].sourceAccuracy,null);assert.equal(places[1].sourceAccuracy,4);
  for (const accuracy of ['0','7','NaN',' ']) assert.throws(()=>parsePostalText(row().replace(/\t4$/,'\t'+accuracy)),/invalid_postal_row/);
});
test('reference point averages unique place coordinates and preserves accuracy and attribution', () => {
  const places = parsePostalText([row(), row('18569', 'Other', '54.5000', '13.3000'), row()].join('\n'));
  const data = buildGeodata(places, 'Creative Commons Attribution 4.0', 'a'.repeat(64), { now: '2026-10-03T00:00:00Z' });
  assert.equal(data.postalCodes.length, 1); assert.equal(data.postalCodes[0].lat, 54.47825); assert.equal(data.postalCodes[0].placeCount, 3);
  assert.equal(data.performancePlaces[0].sourceAccuracy, 4); assert.equal(data.license.url, 'https://creativecommons.org/licenses/by/4.0/');
  assert.match(data.transformation, /not a boundary-derived centroid/);
  assert.throws(() => buildGeodata(places, 'unknown license', 'a'.repeat(64)));
});
test('download is fixed-origin, bounded and has no redirects or credentials', async () => {
  const result = await downloadArchive(async (url, options) => { assert.equal(url, GEONAMES_URL); assert.equal(options.redirect, 'error'); assert.equal(options.credentials, 'omit'); assert.ok(options.signal); return new Response('abc'); });
  assert.equal(result.bytes.toString(), 'abc');
  await assert.rejects(downloadArchive(async () => new Response('error', { status: 429 })));
  await assert.rejects(downloadArchive(async () => new Response('small', { headers: { 'content-length': String(MAX_BYTES+1) } })));
  await assert.rejects(downloadArchive(async () => new Response(new Uint8Array(MAX_BYTES+1))));
});
