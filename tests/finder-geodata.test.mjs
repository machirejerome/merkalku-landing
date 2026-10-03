import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { parsePostalText, unpackPostalArchive, buildGeodata, downloadArchive, MAX_BYTES, GEONAMES_URL } from '../scripts/finder/geodata.mjs';

const row = (postcode = '18569', city = 'Gingst', lat = '54.4565', lon = '13.2574') => ['DE', postcode, city, '', '', '', '', '', '', lat, lon, '4'].join('\t');
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
