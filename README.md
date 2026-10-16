# Loop Study

> [!WARNING]
> This project is fully AI generated so expect some technical slop 👀 

A SvelteKit 3 / Svelte 5 project for studying Balisong tricks.

## Run locally

Use Node.js 22.17+ (Node 22 LTS is used in CI).

```sh
npm ci
npm run dev
```

```sh
npm run check       # Svelte diagnostics
npm test            # Model and IndexedDB persistence tests
npm run build       # Prerender into build/
npm run preview    # Preview the production build
```

Browser tests require Chromium once:

```sh
npx playwright install chromium
npm run build
npm run test:e2e
```

To verify a GitHub Pages project subpath locally, use the same base for both commands:

```sh
BASE_PATH=/bali-driller npm run build
BASE_PATH=/bali-driller npm run test:e2e
```

## GitHub Pages

1. Create a GitHub repository and push this folder on `main`.
2. In **Settings → Pages → Build and deployment**, choose **GitHub Actions**.
3. The included `.github/workflows/deploy.yml` checks, tests, builds and deploys on pushes to `main` or manual dispatch.

The workflow gets `BASE_PATH` from GitHub's Pages configuration, supporting project repositories, user/organization sites and custom domains. For a manual build, set `BASE_PATH=/your-repository` for a project site, or omit it for a domain root. Publish the contents of `build/`. `static/.nojekyll` is included.

SSR stays enabled and all routes are prerendered, with trailing slashes and no SPA fallback. Both the interface and its initial loading state are present in the generated HTML. Browser storage opens only after mounting. See [SvelteKit's static deployment guide](https://svelte.dev/docs/kit/adapter-static).

## Data and persistence

- **IndexedDB** stores imported video blobs, titles, creators, tags, thumbnails, playback speed, mirroring, nominal frame rate and saved A/B sections. Changes save automatically; the footer reports pending, successful or failed saves. A failed metadata save can be retried.
- **localStorage** remembers the last opened clip. If unavailable, the library still works through IndexedDB.
- The bundled demo is a separate `static/media/demo.mp4` asset, extracted byte-for-byte from the original HTML. It is seeded once per library; deleting it or emptying the library does not recreate it.
- Multi-file imports use one transaction. If a batch fails, none of that batch is saved. Object URLs are recreated on load and revoked on deletion or teardown.
- The app requests persistent browser storage after an import. Browsers may decline. See [MDN's persistence documentation](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist).

Data belongs to the current browser profile and origin, not to a login. It does not sync between devices, browsers, localhost and GitHub Pages, or different domains. Clearing site data removes the library; browsers can evict nonpersistent storage. Keep the original recordings. There is no cloud backup or export feature. The database retains the original `loop-study-v1` name and upgrades existing same-origin v1 data; data from a downloaded `file://` HTML page is not automatically transferred to a hosted origin.

A service worker is not needed to save data, so none is registered. The app requires a network connection to load initially; offline app-shell caching is outside this migration's scope.

## Preserved behavior and boundaries

Import MP4/MOV/M4V/WebM files through the file picker or drag and drop; search by title, creator or tag; edit properties; play/pause/restart; scrub; choose 10–100% speed; set and save A/B loops; step by nominal frame duration; mirror, mute, zoom, pan and enter fullscreen. Keyboard shortcuts and frame-rate settings are in Help. The layout also stacks on phone-sized screens.

Codec support depends on the browser. H.264 MP4 is a practical compatibility choice. Frame stepping uses the chosen nominal rate, and looping uses browser media timing rather than frame-exact editing. The original optional Electron/desktop bridge and its conversion button were removed because a static website has no desktop conversion service. Imported video content is rendered as text/media, never inserted as HTML. No videos are uploaded.

## Structure

```text
src/routes/                 SSG route and global layout
src/lib/components/         App shell, library, video player, playback, dialogs, icons
src/lib/study/model.js       Time formatting, validation and metadata normalization
src/lib/study/storage.js     IndexedDB transactions, upgrade and blob URL lifecycle
src/lib/study/player.svelte.js  Per-instance reactive playback and library controller
src/app.css                 Original XP visual styling and responsive adjustments
static/media/demo.mp4       Extracted demo recording (~13 MB)
tests/                      Model/storage tests and Playwright browser scenarios
.github/workflows/          GitHub Pages build and deployment
```

The controller owns playback state; components render it with Svelte bindings and event handlers. There are no global model objects, inline script loaders, imperative DOM-rendered lists or desktop bridge dependencies.
