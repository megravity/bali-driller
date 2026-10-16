# Private YouTube importer POC

An isolated Cloudflare Worker and same-origin page for testing anonymous YouTube retrieval behind Cloudflare Access. It does not replace the SvelteKit app, modify its library, or add a public proxy.

## Run locally

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm importer:dev
```

Open `http://127.0.0.1:8787/`, paste a short public YouTube link, and click **Retrieve recording**. The browser must decode the returned MP4 before offering **Save MP4**. Download it and use **Add videos…** in Loop Study to import it manually.

The named `local` environment bypasses Access only for loopback hostnames. It binds to `127.0.0.1`; do not expose or deploy this environment. The deployment configuration sets `LOCAL_DEV=false`, disables `workers.dev` and version preview URLs, and refuses access if its issuer/audience is missing.

```sh
pnpm importer:check
pnpm importer:test
pnpm importer:build    # Assets + deployment dry run; does not publish
```

After changing Wrangler configuration, regenerate bindings with `pnpm --filter @bali-driller/importer-poc types`. Client TypeScript is built with esbuild into an ignored asset; generated Env declarations are kept separately from the main app's types.

## Cloudflare Access setup

1. Enable Zero Trust/Access for the account. The current team is `flat-forest-eae8.cloudflareaccess.com`.
2. Add a **Self-hosted and private → Public DNS** application for `import.balisong.deu.tz`.
3. Create an **Allow** policy including only `marvin.deutz@gmail.com` and enable One-time PIN login. Do not add an Everyone or Bypass policy.
4. Set the top-level `ACCESS_ISSUER` and `ACCESS_AUD` in `wrangler.jsonc` using the team's HTTPS origin and the application's Audience (AUD) tag. These values are public configuration, not API credentials. Keep `LOCAL_DEV=false`.
5. Add a Worker custom-domain route for `import.balisong.deu.tz`, then deploy with `pnpm --filter @bali-driller/importer-poc run deploy`. Keep alternate `workers.dev` and preview URLs disabled.
6. Verify signed-out requests to the page and API are redirected to Access or rejected. Sign in with the approved email and verify playback. A deployment dry run or a localhost success is not evidence of successful edge retrieval or Access login.

The Worker independently verifies the Access JWT's signature, issuer, audience and expiration, then checks the email allowlist. Merely supplying a forged `Cf-Access-Jwt-Assertion` header does not authorize a request. Static assets are also served through the guard (`run_worker_first`). No Access service token or custom user-account database is needed.

## Deliberate POC limits

- Public finite recordings up to five minutes; a progressive MP4 containing audio and video, at most 720p, must be directly available.
- Source size is capped at 25 MiB, including when Content-Length is absent; retrieval has a 60-second deadline. Cancellation stops the upstream stream.
- Native per-location rate limiting allows six retrieval attempts per approved identity per minute. This is an abuse guard, not a global billing cap.
- Only YouTube video IDs reach the retrieval logic. Library-originated upstream requests and redirects are restricted to expected YouTube/Google video hosts. The API accepts no arbitrary download URL and forwards no browser credentials.
- No server-side media storage, job queue, R2 bucket, signature-script execution, token/cookie injection, adaptive-stream merging, trimming, or direct library handoff is implemented.
- YouTube can refuse requests or change formats; the page reports a failure instead of returning an embed or claiming success. The Android client is used because the web client returned “Video unavailable” in the live local test.

## Verification so far

Local workerd retrieved 629,172 bytes of MP4 for `jNQXAC9IVRw` (“Me at the zoo”). The browser decoded 320 × 240 video and playback was inspected. This proves the server-side retrieval path can work locally; the earlier browser-only CORS failure remains valid.

Tests cover JWT signature/issuer/audience/expiry, fail-closed configuration, loopback boundaries, unauthenticated access to both assets and media, malformed input, rate limiting, cross-origin requests, restricted redirects, bounded streams, cancellation, and a mocked successful media response. Live YouTube success is recorded separately from deterministic tests.

## Parked experiment (2026-10-16)

The Worker was deployed at `https://import.balisong.deu.tz/` with Access audience configured and local bypass disabled. Deployment version: `55b220b0-35ff-483c-ba73-77b2fd8402bc`. The custom-domain API confirmed that the hostname was enabled and had an associated certificate ID.

Immediately after deployment, HTTPS requests failed during the TLS handshake; the hostname subsequently became reachable. A signed-out GET was verified to redirect (302) to the configured Cloudflare Access team. The user completed email verification and tested retrieval on the hosted page. YouTube returned “Sign in to confirm you’re not a bot” (`YOUTUBE_UNAVAILABLE`). This is a failed hosted retrieval gate despite the successful local test. No media was imported.

Do not extend this POC to trimming or main-app integration while hosted retrieval is blocked. Cloudflare Access authenticates the user to the importer, not the Worker to YouTube. No YouTube cookies, accounts, proxy rotation, or challenge-bypass mechanisms were added. Live edge retrieval did not succeed. The Worker was subsequently deleted at the maintainer’s request; this experiment is parked on `feature/private-importer-poc` and must not be redeployed or merged into main without a new decision. The Access application and Cloudflare-managed certificate may remain as inactive configuration; they do not run the downloader.
