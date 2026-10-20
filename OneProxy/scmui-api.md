# OneProxy SCMUI API v1

This API supplies public card metadata and direct original artwork downloads. It creates no ZIPs and no second copy of local artwork. There is one shared SCMUI bearer credential, generated in Admin > Partner API. All routes require it, including HEAD and conditional/range requests. Keys identify the integration, not an authenticated individual or a verified application binary.

## Setup and production rollout

1. Rebuild/restart the OneProxy container through the normal deployment workflow. Existing mounts already persist `admin/`; no new volume, dependency, or environment variable is required.
2. Open Admin > Partner API. Generate a credential and save its one-time value. The API defaults to disabled.
3. Select Refresh catalog. The first pass reads local artwork once to calculate SHA-256 checksums; it does not copy it. Subsequent passes reuse checksums when size, modification time, and change time are unchanged. Recheck all checksums is available for externally preserved timestamps.
4. Review coverage and unavailable entries. Remote-only database artwork is fetched once into the small `admin/partner-api/fallbacks/` cache; refreshes recheck it after 24 hours. Errors leave entries explicitly unavailable or retain an existing cached fallback. No arbitrary client URL is fetched. Cancel refresh stops background work.
5. Set the bandwidth/concurrency/request settings and enable the API. Supply the developer's credential separately from public documentation. Replacing/revoking it affects every SCMUI installation.
6. Verify downloads through the live reverse proxy: preserve Authorization, Range, If-Range, ETag, Content-Length and 206/304/416 responses; bypass shared caching for `/api/v1/`; honor `X-Accel-Buffering: no` or disable buffering there. Long downloads need suitable proxy timeouts.
7. Test the developer's SCMUI build and the attribution screenshot before broader distribution. Production rebuild/restart is manual; the local source edit is not deployment.

An hourly incremental catalog refresh is scheduled only while API access is enabled. The boot check waits 60 seconds. Admin refresh also works while the API is disabled for preparation. Existing source card data and the website's card index are not rewritten by this publisher. Changes made outside the API become visible on the next successful refresh; changed files are rejected with 409 until reindexed. A failed/cancelled refresh retains the last good catalog.

## Connection

Base URL: `https://oneproxy.torforge.dev/api/v1/`

Send `Authorization: Bearer <credential>`. Optional diagnostic header: `X-SCMUI-Version: 1.2.3`. Browser-based desktop clients can use the documented CORS preflight, but native requests are suitable too. Credentials are not sent in URLs. The API does not require user registration, cookies, activation, or print reporting.

| Method and path | Response |
| --- | --- |
| GET status | Readiness, schema version, current limits, website/badge links and current donation configuration |
| GET catalog | Complete public card, asset and set index |
| GET sets | Set codes, card/asset counts and total file bytes |
| GET sets/OP01/manifest | Complete inventory for OP01 |
| GET cards/OP01-001_P1 | One card and its asset record; case-insensitive card IDs |
| GET or HEAD assets/{assetId} | Original artwork bytes or headers |

All JSON endpoints also support HEAD. OPTIONS supports desktop browser preflight. No archives endpoint exists.

## Catalog schema

The complete catalog has `schemaVersion: 1`, `revision`, `publishedAt`, `cards`, `assets`, `sets`, and `unavailable`.

Each card contains `cardId`, `baseCardId`, `setCode`, `assetId`, `availability` (ready/unavailable), and `metadata`. Metadata retains the project's names: `cardNumber`, `name`, `rarity`, `cardType`, `color`, `cost`, `life`, `attribute`, `power`, `counter`, `type`, `effect`, `trigger`, `illustrator`, `cardSets`, `artVariant`, `spoilerEnabled`, `spoilerText`, `tournamentStatus`, `block`, `blockIcon`, and other public source fields. Numeric-looking source fields remain strings/null; clients should not assume integers. Metadata uses persisted source values plus manual overrides. It excludes internal overrides and upstream/local source paths.

Assets contain `assetId`, `cardId`, `setCode`, `fileName`, `relativePath`, `source`, `sha256`, `bytes`, `contentType`, and `downloadUrl`. `source` is local-original or remote-fallback. Download URLs are protected relative paths on the same origin. Preserve `relativePath` for your cache; do not infer filenames/extensions from card numbers. Asset IDs change when file bytes change. Backs are in BACK; DON and custom variants are included under their corresponding identities/sets. Hidden cards and suppressed reprints follow the existing public visibility rules.

Revision/ETag changes detect metadata edits, additions, removals, and changed artwork. The full catalog is a complete snapshot, so compare inventories to find removals. Do not infer deletion from a failed or partial response. Only remove files your application previously managed; preserve user-added/modified files.

## Efficient cache synchronization

Fetch metadata conditionally with If-None-Match. Retain the returned ETag and complete response. A 304 has no body and means no changes. Gzip is available with Accept-Encoding: gzip. Automatic background checks should be at most daily, plus a manual refresh action.

Download selected sets by queueing the asset records in their manifests; no ZIP is needed. Use one or two workers per installation. Compare asset hashes and local inventory to skip unchanged files. Download into a partial file, verify bytes and SHA-256, then atomically replace the final file. Search/filter/printing run locally and remain usable offline.

For resumption, send `Range: bytes=<offset>-` and `If-Range: "<sha256>"`. A matching unchanged file returns 206 with Content-Range. If the validator differs the server returns a complete 200 response; truncate the partial file rather than appending. HEAD returns Content-Length without occupying a file-transfer slot. Single byte ranges are supported; multiple ranges are ignored and return the full representation. Unsatisfiable ranges return 416.

Local originals are not versioned/copied. If an original changes, refresh metadata and restart that file if necessary. Checksums protect the local cache from a mid-transfer edit. API disable/revocation cancels active file transfers; partial files can resume once valid access is restored and the same asset still exists.

## Limits and errors

Defaults: **25 MB/s (25,000,000 payload bytes/sec) aggregate**, four simultaneous file downloads, and 120 metadata requests/minute with a small burst allowance. Image requests do not consume the metadata allowance. JSON and image bodies share the byte scheduler, with at most a 64 KiB initial burst. These settings are live-editable in admin. One API-serving Node process is supported; multiple replicas/processes require a shared limiter before claiming one global budget.

JSON errors use `error: { code, message }`:

- 401: invalid/missing credential. Update the credential; do not repeatedly retry.
- 403: API/integration disabled. Preserve local cache and stop background retries until a later user action/check.
- 404: unknown/removed card, set, or asset. Refresh the catalog.
- 409: artwork changed since publication. Refresh metadata before retrying.
- 429: metadata allowance or download concurrency reached. Honor Retry-After with jitter.
- 503: catalog not ready or temporary error. Honor Retry-After and use bounded retries.
- 416: invalid/unsatisfiable byte range. Check the current size/revision before restarting.

## Statistics, storage and attribution

Admin > Partner API shows SCMUI-labelled requests, served bytes, completed/interrupted file transfers, throttling, errors, and recent activity. These do not increment website visitor/printed-card statistics. Bytes count server-emitted payload, not proof that an import or print completed. App version is self-reported. API usage is a compact daily summary (90 days) and at most 100 recent events, not an unbounded request log. Writes are batched; the last second may be lost on a crash.

Additional storage is generated JSON indexes/checksums/usage plus the small remote fallback cache, not a second 28 GB library or archive store. Deleted source art is never removed by this API. Cached fallbacks are retained in their dedicated folder; admin can review them before removal.

Use the OneProxy badge/logo and link `https://oneproxy.torforge.dev/?utm_source=scmui&utm_medium=desktop_app`. Donation destination/copy should match the site's current public donation configuration. An export popup or print telemetry is not required by this API.

## Example and checks

`examples/scmui/sync.py` is a dependency-free Python 3.10+ example. Set ONEPROXY_SCMUI_KEY, then run `python sync.py --sets OP01 ST01 --output ./OneProxy` or `--all`. `--list-sets` shows available sets. It retries throttling, resumes partial files, verifies hashes, caches metadata and only skips files whose local inventory still matches. `--prune` is explicitly optional and only manages tracked, unmodified files.

Run `node --test tests/partner-api.test.cjs` from build/web for isolated fixtures. Run the existing lint and type/build checks in an isolated copy, not against the active production output. Production pilot: verify one metadata fetch/304, one small image/HEAD/range, a limited concurrent transfer, switches, revocation and usage through the real proxy before release.
