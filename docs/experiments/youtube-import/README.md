# Browser-only YouTube import: feasibility failed

Tested on 16 October 2026. The planned feasibility gate failed, so the YouTube editor, downloader and FFmpeg integration are deferred. Existing file imports and the application dependency tree are unchanged.

## Results

Twelve independent attempts ran in clean Chromium contexts: three video IDs × two YouTube.js initialization modes × two origins. All failed before retrieving media bytes.

| Origin                    | Default initialization          | Locally generated session        | Same-origin worker control  |
| ------------------------- | ------------------------------- | -------------------------------- | --------------------------- |
| `http://127.0.0.1:4187`   | 3/3 failed during session setup | 3/3 failed requesting video info | HTTP 200; 45 bytes read     |
| `https://balisong.deu.tz` | 3/3 failed during session setup | 3/3 failed requesting video info | HTTP 200; 16,705 bytes read |

The Pages entry URL, `https://megravity.github.io/bali-driller/`, redirected to `https://balisong.deu.tz/`. Hosted probes therefore executed with the custom domain's actual origin. Nothing was deployed to run them.

Default initialization attempted YouTube's `/sw.js_data`, `/youtubei/v1/config`, and `/iframe_api` endpoints. Generating a session locally and skipping configuration/player retrieval reached `/youtubei/v1/player`, which also failed. The worker reported `TypeError: Failed to fetch`; Playwright recorded `net::ERR_FAILED` for the requests.

A separate page-level fetch to the same `/iframe_api` endpoint captured Chromium's explicit diagnosis from both origins:

```text
Access to fetch at 'https://www.youtube.com/iframe_api' from origin '…'
has been blocked by CORS policy: No 'Access-Control-Allow-Origin'
header is present on the requested resource.
```

The positive controls fetched each origin's own page from a Web Worker and successfully read its bytes. This distinguishes the YouTube access failure from an inability to create workers or perform worker networking.

## Method and validation boundary

- Chromium `156.0.8078.4`, driven by the repository's Playwright installation, with normal browser security and fresh isolated contexts.
- YouTube.js `18.1.0`, using its `youtubei.js/web` entry point; bundled locally with esbuild `0.28.2` as an ES module worker.
- Video IDs: `M7lc1UVf-VE` (YouTube IFrame API sample), `jNQXAC9IVRw` (Me at the zoo), and `aqz-KE-bpKQ` (Big Buck Bunny). Failure occurred before video-specific availability could be established.
- Default initialization used `enable_session_cache: false`. The second mode additionally set `generate_session_locally: true`, `retrieve_innertube_config: false`, and `retrieve_player: false`, to test whether skipping initial network setup changed the result.
- Every library request used native browser `fetch`, CORS mode and `credentials: omit`. No proxy, extension, cookies, authorization, browser-security flags, intercepted responses, or custom JavaScript interpreter were supplied.
- The locally bundled worker was injected as a Blob module into each page. Blob workers inherit the creating page's origin. This exercised actual hosted-origin browser access without modifying the deployed application.
- The harness was prepared to download a progressive 360p MP4, abort above 200 MiB, and verify browser decoding if retrieval succeeded. None reached that branch: no playable bytes, decoding, trimming or clip-import success was demonstrated.
- Dependency installation and executable probes stayed in `/tmp/bali-youtube-probe`; no experimental runtime dependency was added to the app. Worker instances, Blob URLs and isolated browser contexts were released after use.

See [raw worker results](results.json) and [control results with browser diagnostics](controls.json). These are live integration observations, not mocked tests or a claim that every possible future YouTube client will fail.

## Decision

Stop at the feasibility gate, as agreed. Do not ship an import button that cannot retrieve a recording, and do not replace a requested local clip with an embedded reference. A later attempt would need new evidence that direct browser retrieval works, or a change to the no-proxy/no-backend constraint.

The library's own [browser example](https://github.com/LuanRT/YouTube.js/tree/main/examples/browser) documents a server proxy; its [initialization guide](https://ytjs.dev/guide/getting-started) describes the session options tested here. The observed failures are consistent with that documented boundary.
