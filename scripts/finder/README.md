# Finder PostgreSQL boundary

`001-finder.sql` is a **fresh-install** migration for PostgreSQL 18. It creates only `finder_private`, `finder_api` and the three new NOLOGIN roles `finder_owner`, `finder_runtime`, `finder_importer`. Existing names abort installation instead of silently reusing unknown privileges. There are no credentials, Supabase tables, customer tables or network requests in this migration. All data is initially inaccessible: `finder_private.control.enabled = false`.

The scripts do not run on application startup. Run the migration deliberately with a schema/role administrator. Do not replay it against an existing installation; future changes need a reviewed upgrade migration.

## Runtime contract

```sql
finder_api.entry(p_ip_hash text) returns jsonb
finder_api.search(
  p_budget_hash text, p_session_hash text, p_ip_hash text,
  p_budget_issued_at timestamptz, p_session_issued_at timestamptz,
  p_postcode text, p_radius_km integer,
  p_after text default null, p_snapshot text default null
) returns jsonb
```

Hashes must be 64 lowercase hexadecimal characters. The application, not the browser, creates them using a dedicated persistent HMAC key. Normalize IPs before hashing; use the verified platform header and the agreed IPv6 /64 scope. Keep that key stable over the quota horizon: rotation resets recognizable IP buckets. Signed, HttpOnly cookie timestamps must be supplied unchanged. The database checks both lifetime and consistency; old cookies cannot recreate an expired budget after cleanup. These identifiers are pseudonymous security data, not anonymous analytics.

Call `entry` **before** body parsing and BotID verification. It independently limits global admissions to 300/minute and 10,000/24 hours, plus 120/minute per IP. Never treat a failure, timeout, lock conflict or malformed result as permission. Exact-host/origin checks, BotID verification, cookie signing, IP trust, encrypted cursor validation and HTTP DTO allowlisting remain the application's responsibility.

A denial is `{allowed:false, reason, retryAfterSeconds}`. `reason` is `limited`, `unavailable`, `invalid_query`, `unknown_postcode` or `invalid_cursor`. No candidates/count are included. Suggested retry delays are deliberately conservative, not exact reset timestamps.

A successful search returns `{allowed:true, candidates:PublicCandidate[], origin:{lat,lon}, snapshot:string, nextAfter:'2'|null}`. **This is an internal adapter response, never the browser DTO.** Run `evaluateEligibility` again immediately before output. Strip canonical IDs, versions, evidence, coordinates and all other non-public fields. Only the existing small result DTO leaves the server. Encrypt `snapshot` and `nextAfter` in the existing query/session-bound cursor. Do not return a total count. An unsuccessful adapter/HTTP serialization after SQL success may consume a budget; fail closed rather than refund an unproven non-disclosure.

Snapshot rows hold only up to twenty canonical IDs/versions for five minutes. Page two is bound again inside the DB to budget, session, PLZ and radius. Only exact `after='2'` is valid; it never yields a third page. Repeated page-two requests still consume request quota. Expired, revoked or superseded units disappear without backfilling with previously unseen units.

## Atomic limits

One transaction-level `pg_try_advisory_xact_lock` serializes entry, search, import and revocation. Contention returns an unavailable response immediately; no application-local counters or region-local assumptions are used. This intentionally restricts the pilot to **one active Finder DB operation globally**, below the concept's ceiling of twenty. It can reduce availability during a burst. All statements that change source eligibility/control must honor the same lock.

Each search independently checks 300/minute and 10,000/24 hours globally, 120/minute per IP, and 6/minute, 30/hour, 60/24 hours per session. New sessions are counted by database first-use time: ten per IP per ten minutes. New searches and three distinct PLZ values are counted against the 30-day budget identifier (eight new searches/24 hours), so renewing a session does not renew them.

First disclosure of a canonical unit is reserved for every applicable dimension in the same transaction as selection: budget 20/24 hours and 60/lifetime; IP 40/24 hours and 120/30 days; global 30,000 first disclosures across budget principals/24 hours. These are **first-exposure** records. Repeating an already known canonical unit, including a new version, does not consume another unit; requests always count. Budget identity lasts at most thirty days, session at most twenty-four hours. Cookie deletion/IP rotation are not person-proof identity controls. No free-account or allowlist quota bypass exists.

The DB uses its own clock and rolling intervals, not UTC calendar resets. PostgreSQL transaction locks are shared across connections and released at transaction end. [PostgreSQL locking documentation](https://www.postgresql.org/docs/current/explicit-locking.html)

## Import contract

Only the separate importer can call:

```sql
finder_api.import_batch(p_candidates jsonb, p_revoked_ids jsonb default '[]') returns jsonb
finder_api.import_postcodes(p_rows jsonb) returns integer
finder_api.cleanup() returns void
finder_api.previous_batch() returns jsonb -- additive 002-previous-batch.sql
finder_api.suspend_source() returns jsonb -- additive 004-suspend-source.sql, disable only
```

Apply `002-previous-batch.sql` after the fresh migration to add `previous_batch()`. It returns `{candidates:[...]}` only to the importer, including revoked units with the actual revocation flag, so an absent seed can be revoked conservatively on the next refresh. It rejects an unexpected inventory larger than 1,000 instead of silently truncating. The job must never publish this internal batch as an artifact, feed or web response.

`import_batch` accepts up to 100 exact `PublicCandidate` objects and 100 canonical revocation IDs, bounded to 2 MB per call. It rejects extra raw/contact fields, wrong JSON types, results/awards, unknown lifecycle, missing provenance approvals, buyer geometry, uncertain deadline fields and noncanonical source URLs. This pilot only accepts `sourceId='ted'` and `https://ted.europa.eu/{de|en}/notice/-/detail/{number}-{year}`. Import policy still has to establish lawful reuse, real cleaning relevance, current versions, original exact deadline/timezone and verified performance location. SQL flags do not independently prove those facts.

Projection capacity is deliberately 1,000 units and 1,000 revocation tombstones. A whole invalid/oversized batch rolls back. Revocations win within a batch and tombstones also block a late import of a previously unknown unit using older evidence. A later genuine source revalidation must be newer than the tombstone before reactivation. Never import result announcements as candidates; they can only drive canonical, lot-specific revocation.

At every search, the source evidence must be at most 24 hours old, or one hour old when the deadline is within 48 hours; the explicit eligibility expiry must honor that tighter bound. A source-check timestamp is not the scraper's insert/update time. Future-dated evidence, expired/deadline-crossed, revoked and changed snapshot versions do not become results.

`import_postcodes` accepts at most 1,000 rows per batch, **only** `{postcode,lat,lon,provenance,license}`. Project a broader GeoNames artifact onto those five fields before import. No buyer-coordinate fallback exists. Performance postcode reference points remain approximate; frontend wording must say so.

## Least-privileged login setup

The administrator separately creates fresh LOGIN roles without membership in owner/superuser roles and without CREATE/CREATEROLE/BYPASSRLS powers. Set passwords using a secret-safe procedure, never committed SQL or shell argument output. Grant the web login only `finder_runtime`, and the job login only `finder_importer`. The NOLOGIN owner role must never be granted to either.

Set `statement_timeout = '1500ms'`, `lock_timeout = '500ms'` and `idle_in_transaction_session_timeout = '5s'` on the actual web **LOGIN** role; role configuration is not automatically inherited through membership. Set a suitable finite timeout on the import login. The importer also needs no direct SELECT/UPDATE on Finder tables. Verify the actual database's unrelated PUBLIC schema/function privileges before calling either login least privileged; the migration intentionally does not change unrelated app ACLs.

The admin enables or disables the pilot only after import/source/runtime acceptance, in a transaction using `pg_advisory_xact_lock(1936028270,1718183012)` followed by the single `finder_private.control` update. Source suspension uses `source_enabled=false` under the same lock. This is a kill switch for new DB disclosures; data already sent cannot be recalled.

Security rows expire logically after their applicable window: snapshots five minutes, request/session records twenty-four hours, budget/IP exposure state at most thirty days. Entry/search/import opportunistically clean old rows. An independent scheduled `cleanup()` job is still required for **physical deletion while there is no traffic**; physical deletion can lag logical expiry by the job interval. Do not claim a continuously running TTL mechanism or a strict physical thirty-day maximum without that operational evidence. No perpetual user history, raw IP, browser fingerprint or analytics identifier is stored by this schema.

## Local verification

```sh
node --test tests/finder-database.test.mjs
```

The test file starts and removes its own PostgreSQL cluster using a Unix socket with TCP disabled. It never reads `DATABASE_URL` and never falls back to a remote DB. Supply `FINDER_TEST_PG_BIN` only to point at local PostgreSQL executables. Missing binaries skip the database tests visibly. The suite proves schema execution and real concurrent connections locally; it does not prove deployed credentials, BotID, provider-header trust, regional routing, scheduling or browser privacy.

## Private refresh operation (manual until live acceptance)

`refresh.mjs` is the only orchestration entry point. Install additive `003-refresh-claim.sql` and `004-suspend-source.sql` after 001/002. `finder_api.claim_refresh()` is executable only by the importer and atomically permits one accepted attempt per rolling hour across all runners. Failed attempts also consume that hour; a new GitHub run does not reset it. The workflow's concurrency group additionally prevents overlapping workflow runs without cancelling the active run.

```sh
node scripts/finder/refresh.mjs
# Optional replay of a previously downloaded, validated local geodata artifact:
node scripts/finder/refresh.mjs --geodata /absolute/private/geodata.json
```

The job requires exactly these credentials, supplied privately at execution:

- `FINDER_IMPORT_DATABASE_URL`: PostgreSQL URL for the dedicated `merkalku_finder_job` login, on a `.neon.tech` host with `sslmode=require`, granted only `finder_importer` and finite login/query timeouts. Never use an owner/runtime credential here.
- `FINDER_SOURCE_TOKEN`: dedicated 64-character lowercase hexadecimal token for the seed RPC.
- `FINDER_SOURCE_ANON_KEY`: the Supabase publishable/anon API key. No Supabase service-role key is used.

The source is fixed in code to `https://smgjidsruiasmbqepagn.supabase.co/rest/v1/rpc/finder_source_export_v1`; POST body contains only `p_token`, never a token in a URL. Redirects are rejected. The response is capped at 1 MB, 500 rows and exactly `source_portal`, `external_id`, `source_url`, `procedure_identifier`. These are identity seeds, not a claim that a notice remains open. The source token is not a Vercel runtime variable; only the separate job receives it. No credential values are printed by the runner or child processes.

Execution order is claim → read `previous_batch()` → fetch seeds → download/validate GeoNames → TED source revalidation → apply all exclusions → check capacity → import current candidates. The private temporary directory uses mode 0700 and JSON files mode 0600. GeoNames and TED subprocesses receive no Finder/database/source secrets. Their raw stdout/stderr is suppressed. Temporary files are removed in `finally`; no Actions artifact-upload or public feed is configured.

The fresh GeoNames artifact is used for source-performance-location validation. This refresh does not re-import the database's query-origin postcode table; its initial `import_postcodes` bootstrap and any later coordinated update remain separate operator steps. That table must be populated before live search.

TED exit **2** still produces a safe partial batch: all its canonical exclusions are imported first, in chunks of at most 100, followed by accepted candidates in chunks of at most 100. Exit 2 then deliberately marks the workflow incomplete for monitoring. Before any candidate import, the union of prior retained units (including revoked units) and the new candidate IDs must be at most 1,000. Above that capacity, no candidate is admitted and all reachable known prior units are excluded. Retained revoked records still occupy projection capacity until cleanup; capacity is not an invitation to purge history automatically.

TED exit **1**, malformed output or a later import failure never synthesizes a new source-check timestamp. The runner stops candidate imports and attempts to revoke all known/attempted units, including a chunk whose commit acknowledgement may have been lost. If any defensive revocation fails, including a full tombstone store or missing import permission, the runner independently calls importer-only `suspend_source()`. This bounded function takes the same transaction lock and sets `source_enabled=false` without touching inventory capacity. It cannot enable the source. Successful suspension is reported as `sourceSuspended:true`; both runtime entry and search then deny all results. If the database or suspension function is itself unreachable, `sourceSuspended:false` is explicit and requires operator intervention; no successful kill is claimed. `cleanup()` is attempted in `finally`, including fatal and hourly-skip paths. Cleanup failure is reported as an error. The TED CLI also writes a private temporary report. The runner copies only bounded aggregate seed/request/accepted/duration counters, numeric HTTP-status counts, known content-type counts and fixed error-code counts into stdout. Unknown content types or error strings become `other`; malformed metrics are omitted and marked. Identifiers, URLs and raw report fields are never copied. If no readable report exists, `diagnostics.available=false` is explicit. The raw report is deleted with the private directory. The runner's stdout never contains candidate identifiers, raw source payloads, tokens or connection URLs.

Exit statuses: **0** means complete or skipped by the hourly claim; **2** means a safe partial batch was applied; **1** means a fatal/import/cleanup failure. A summary's `revoked` is the number of exclusion requests, including defensive repeats; it is not a count of awards or cancellations. Treat `partial`, `revocationFailed`, `sourceSuspended:false`, `cleanupFailed` and `privateCleanupFailed` as operational events. After any successful source suspension, fix the underlying import/capacity/permission issue and revalidate the intended projection. Only the database owner may deliberately re-enable `source_enabled=true` under the shared advisory transaction lock after that review. No refresh, successful retry, runtime endpoint or importer function automatically re-enables it. A browser may still receive a safe subset while source coverage is partial; never describe this as a full-market search.

`.github/workflows/finder-refresh.yml` currently has **only `workflow_dispatch`**. Its hourly schedule is commented out until end-to-end live acceptance. It uses Node 22, Python 3.12, pinned `lxml==6.1.0`, pinned official Actions commits, `npm ci --ignore-scripts`, `contents:read`, one concurrency group and a 20-minute workflow timeout. The three secrets are exposed only to the final refresh step. Dependency setup and offline tests have no production secrets. There are no cache/artifact uploads containing projection data; the npm cache contains dependencies only. The pinned lxml release is the same version used for local parser tests and is [published on PyPI](https://pypi.org/project/lxml/6.1.0/).

The TED subprocess has a 600-second budget and up to 500 seeds/3,000 requests with four workers and globally paced 350ms requests. These are ceilings, not a promise to complete 500 notices: a simple eligible seed typically needs six requests. An interrupted or incomplete pass must remain visibly partial and may reduce the projection. Rate-limit/circuit responses do not justify increasing request pressure or refreshing timestamps without proof.

Until the schedule is explicitly enabled, there is **no automatic hourly refresh or cleanup guarantee**. Existing candidates expire according to their original evidence, so a successful preview today does not prove tomorrow's availability. After deployment, verify a real manual run, role ACLs/timeouts, a second hourly-denied run, partial/fatal behavior and the aggregate Actions result before enabling the commented schedule. The workflow does not itself grant production deployment permission.

Offline verification:

```sh
node --test tests/finder-refresh.test.mjs tests/finder-ted.test.mjs tests/finder-geodata.test.mjs
node --test tests/finder-database.test.mjs
```

Refresh tests use only injected source/DB/CLI fixtures, including partial output, fatal cleanup, lost import acknowledgement, retained capacity, hourly denial and secret-safe summaries. Database tests independently exercise 003 on their isolated socket-only PostgreSQL cluster.
