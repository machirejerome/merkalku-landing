# Reviewed GeoNames reference

`geonames-de-2026-10-03.json` is the unchanged public German postal/place reference artifact retrieved on 2026-10-03 at 11:14:35 UTC. It contains 10,813 postcode reference points and 23,297 source place rows. It is committed outside `public/` for reproducible scheduled source validation, avoiding an unrelated hourly GeoNames download dependency. It contains no tender inventory, visitor information or credentials.

Source: [GeoNames DE.zip](https://download.geonames.org/export/zip/DE.zip), last modified 2026-10-03 02:15:33 GMT. Original archive SHA-256: `d86c76d5ec2e4e8df3bb450cd136f5cfae28da4ed7d84b473257b0ef7314e853`. This JSON artifact SHA-256: `c377aa44a9b57c91e9867d9d7acb843a3e8877c0382ec1617cdc1defca3d095b`. Both hashes and row counts are verified in `tests/finder-geodata.test.mjs`.

Attribution: Postleitzahl- und Ortsreferenzdaten: [GeoNames](https://www.geonames.org/), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Für die Suche zu PLZ-Referenzpunkten zusammengefasst. The artifact retains original source/license metadata and the transformation description. Its postcode coordinates average unique place coordinates; they are approximate reference points, not object coordinates or boundary-derived centroids. Performance places retain source coordinates for exact postcode/city matching.

Dataset updates are deliberate reviewed changes: preserve provenance and attribution, verify the new artifact, then update the workflow path and checksum test together. Tender deadlines and source freshness remain independently revalidated on every accepted refresh; pinning geography does not pin tender eligibility.
