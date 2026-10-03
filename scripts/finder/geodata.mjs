#!/usr/bin/env node
/** Reproducible GeoNames DE postal reference import. No database writes.
 * Node22+ and Python3 standard library required; no API key or runtime installation.
 * --zip replays an existing archive without a network request. Output stays server-side.
 */
import { readFile, writeFile, rename, unlink, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { resolve, dirname, basename } from 'node:path';
import { pathToFileURL } from 'node:url';

export const GEONAMES_URL = 'https://download.geonames.org/export/zip/DE.zip';
export const MAX_BYTES = 25_000_000;
const sha = (value) => createHash('sha256').update(value).digest('hex');
const PYTHON = String.raw`
import sys,io,json,zipfile,stat
raw=sys.stdin.buffer.read(25000001)
if len(raw)>25000000: raise ValueError('archive_too_large')
with zipfile.ZipFile(io.BytesIO(raw)) as z:
 infos=z.infolist()
 if sorted(i.filename for i in infos)!=['DE.txt','readme.txt']: raise ValueError('unexpected_zip_paths')
 if sum(i.file_size for i in infos)>25000000: raise ValueError('expanded_archive_too_large')
 out={}
 for i in infos:
  if i.is_dir() or stat.S_ISLNK(i.external_attr>>16) or i.flag_bits&1: raise ValueError('unsafe_zip_entry')
  with z.open(i) as f: data=f.read(25000001)
  if len(data)>25000000: raise ValueError('expanded_entry_too_large')
  out[i.filename]=data.decode('utf-8',errors='strict')
 print(json.dumps(out,ensure_ascii=False))
`;

export function unpackPostalArchive(bytes, { python = 'python3', timeoutMs = 15000 } = {}) {
  if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > MAX_BYTES) return Promise.reject(new Error('invalid_archive_size'));
  return new Promise((resolvePromise, reject) => {
    const child = spawn(python, ['-c', PYTHON], { stdio: ['pipe', 'pipe', 'pipe'], env: { PATH: process.env.PATH, LANG: 'en_US.UTF-8' } });
    let output = '', settled = false;
    const finish = (error, value) => { if (settled) return; settled = true; clearTimeout(timer); if (error) { child.kill('SIGKILL'); reject(error); } else resolvePromise(value); };
    const timer = setTimeout(() => finish(new Error('zip_parser_timeout')), timeoutMs);
    child.on('error', () => finish(new Error('python3_required')));
    child.stdin.on('error', () => finish(new Error('invalid_postal_archive')));
    child.stdout.on('data', (chunk) => { output += chunk.toString('utf8'); if (Buffer.byteLength(output) > 2 * MAX_BYTES) finish(new Error('zip_projection_too_large')); });
    child.stderr.resume();
    child.on('close', (code) => { if (code !== 0) return finish(new Error('invalid_postal_archive')); try { finish(null, JSON.parse(output)); } catch { finish(new Error('invalid_zip_projection')); } });
    child.stdin.end(bytes);
  });
}

export function parsePostalText(input) {
  if (typeof input !== 'string' || !input.trim() || Buffer.byteLength(input) > MAX_BYTES) throw new Error('invalid_postal_text');
  const places = [];
  for (const line of input.split(/\r?\n/)) {
    if (!line) continue;
    const row = line.split('\t');
    if (row.length !== 12 || row[0] !== 'DE' || !/^[0-9]{5}$/.test(row[1]) || row[1] === '00000' || !row[2].trim() || row[2].length > 180
      || !/^-?\d+(?:\.\d+)?$/.test(row[9]) || !/^-?\d+(?:\.\d+)?$/.test(row[10]) || !/^[1-6]?$/.test(row[11])) throw new Error('invalid_postal_row');
    const lat = Number(row[9]), lon = Number(row[10]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < 47 || lat > 55.5 || lon < 5 || lon > 16) throw new Error('invalid_german_coordinate');
    // GeoNames leaves accuracy empty for some places. Preserve uncertainty; the
    // tender eligibility policy independently requires numeric accuracy >= 4.
    places.push({ postcode: row[1], city: row[2], lat, lon, sourceAccuracy: row[11] === '' ? null : Number(row[11]) });
    if (places.length > 100000) throw new Error('postal_row_limit');
  }
  if (!places.length) throw new Error('empty_postal_data');
  return places;
}

export function buildGeodata(places, readme, archiveSha256, { lastModified = null, now = new Date().toISOString() } = {}) {
  if (!/Creative Commons Attribution 4\.0/i.test(readme) || !/^[a-f0-9]{64}$/.test(archiveSha256)) throw new Error('unverified_postal_license');
  const groups = new Map();
  for (const place of places) { if (!groups.has(place.postcode)) groups.set(place.postcode, []); groups.get(place.postcode).push(place); }
  const postalCodes = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([postcode, items]) => {
    const points = [...new Map(items.map((point) => [`${point.lat}:${point.lon}`, point])).values()];
    return { postcode, lat: Number((points.reduce((sum, p) => sum + p.lat, 0) / points.length).toFixed(6)), lon: Number((points.reduce((sum, p) => sum + p.lon, 0) / points.length).toFixed(6)), referencePointMethod: 'mean_of_unique_geonames_place_coordinates', placeCount: items.length };
  });
  return { schemaVersion: 1, retrievedAt: now, sourceUrl: GEONAMES_URL, sourceLastModified: lastModified, sourceArchiveSha256: archiveSha256,
    license: { name: 'Creative Commons Attribution 4.0', url: 'https://creativecommons.org/licenses/by/4.0/', sourceReadme: 'https://download.geonames.org/export/zip/readme.txt', sourceAbout: 'https://www.geonames.org/about.html', attribution: 'Postleitzahl- und Ortsreferenzdaten: GeoNames, CC BY 4.0. Für die Suche zu PLZ-Referenzpunkten zusammengefasst.', attributionUrl: 'https://www.geonames.org/', readmeCaveat: 'Postal readme names4.0 but retains an old3.0 hyperlink; official about page links4.0. Attribution is required.', readmeSha256: sha(readme) },
    transformation: 'Country DE and valid five-digit postcodes only. postalCodes is the arithmetic mean of unique valid place coordinates per postcode, not a boundary-derived centroid. performancePlaces preserves GeoNames place reference coordinates for exact postcode/city matching. No claim of object coordinates or complete official postal geography.',
    inputRowCount: places.length, rejectedRowCount: 0, postalCodes, performancePlaces: places };
}

export async function downloadArchive(fetcher = fetch) {
  const response = await fetcher(GEONAMES_URL, { redirect: 'error', credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(30000) });
  if (!response.ok || !response.body) throw new Error('geonames_download_failed');
  const declared = response.headers.get('content-length');
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > MAX_BYTES)) { await response.body.cancel(); throw new Error('archive_too_large'); }
  const reader = response.body.getReader(), chunks = []; let length = 0;
  try { while (true) { const chunk = await reader.read(); if (chunk.done) break; length += chunk.value.byteLength; if (length > MAX_BYTES) { await reader.cancel(); throw new Error('archive_too_large'); } chunks.push(Buffer.from(chunk.value)); } }
  finally { reader.releaseLock(); }
  return { bytes: Buffer.concat(chunks), lastModified: response.headers.get('last-modified') };
}

export async function main(args = process.argv.slice(2)) {
  if (args.length === 1 && args[0] === '--help') { console.log('Usage: node scripts/finder/geodata.mjs --output SERVER_ONLY.json [--zip EXISTING_DE.zip]\nWithout --zip: one fixed GeoNames DE.zip download, max25MB/30s. Python3 stdlib reads exactly DE.txt and readme.txt in memory (max25MB expanded); no extraction. Strict TSV validation, CC BY4.0 attribution, approximate reference coordinates. No DB writes.'); return; }
  const flags = new Map();
  for (let i = 0; i < args.length; i += 2) { if (!['--output', '--zip'].includes(args[i]) || !args[i + 1] || args[i + 1].startsWith('--') || flags.has(args[i])) throw new Error('invalid_arguments'); flags.set(args[i], resolve(args[i + 1])); }
  const target = flags.get('--output');
  if (!target || target.split('/').includes('public') || target === flags.get('--zip')) throw new Error('unsafe_output_path');
  let archive;
  if (flags.has('--zip')) { if ((await stat(flags.get('--zip'))).size > MAX_BYTES) throw new Error('archive_too_large'); archive = { bytes: await readFile(flags.get('--zip')), lastModified: null }; }
  else archive = await downloadArchive();
  const files = await unpackPostalArchive(archive.bytes);
  const data = buildGeodata(parsePostalText(files['DE.txt']), files['readme.txt'], sha(archive.bytes), { lastModified: archive.lastModified });
  const temporary = resolve(dirname(target), `.${basename(target)}.${randomUUID()}.tmp`);
  try { await writeFile(temporary, JSON.stringify(data) + '\n', { mode: 0o600, flag: 'wx' }); await rename(temporary, target); }
  finally { await unlink(temporary).catch(() => {}); }
  console.log(JSON.stringify({ output: target, postcodes: data.postalCodes.length, places: data.performancePlaces.length, sourceArchiveSha256: data.sourceArchiveSha256 }));
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main().catch((error) => { console.error(/^[a-z0-9_]+$/.test(error?.message || '') ? error.message : 'geodata_import_failed'); process.exitCode = 1; });
