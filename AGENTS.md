# Repository Guidelines

## Project Structure & Module Organization

`src/routes/` contains the prerendered page and layout; `src/lib/components/` contains the app shell, library, player, playback controls, and dialogs. `src/lib/study/` separates shared types, validation, IndexedDB storage, and the reactive playback controller (`player.svelte.ts`). Global XP styling lives in `src/app.css`; bundled media lives in `static/media/`.

Unit tests live in `tests/*.test.ts`, browser scenarios in `tests/e2e/*.spec.ts`, and investigation evidence in `docs/experiments/`. Generated `build/` and `.svelte-kit/` directories are not source files.

## Build, Test, and Development Commands

Use Node.js 22.17+ and the pinned pnpm 12.4.1 version.

- `pnpm install --frozen-lockfile`: install reproducible dependencies.
- `pnpm dev`: start the development server.
- `pnpm check`: run Svelte diagnostics and strict TypeScript checks.
- `pnpm test`: run Node tests through tsx.
- `pnpm build`: generate the static site in `build/`.
- `pnpm preview`: serve the production build locally.
- `pnpm test:e2e`: run Playwright against a previously built site; install Chromium with `pnpm exec playwright install chromium` first.
- `pnpm format` / `pnpm format:check`: apply or verify Prettier formatting.

For Pages subpath verification, run both build and browser tests with `BASE_PATH=/bali-driller`.

## Coding Style & Naming Conventions

Use strict TypeScript and `<script lang="ts">` in components. Follow Prettier: two-space indentation, single quotes, semicolons, and no trailing commas. Name components in PascalCase and ordinary modules in lowercase. Use `.svelte.ts` for modules containing Svelte runes, and `#lib/` imports for shared application code. Preserve the existing XP appearance and keep changes narrowly scoped.

## Testing Guidelines

Use `node:test` and `node:assert/strict` for logic, fake-indexeddb for persistence, and Playwright Chromium for user workflows. No coverage percentage is configured. Cover changed behavior, especially reload persistence, failed writes, deletion, and playback boundaries. Run checks, relevant tests, formatting verification, and the production build before review.

## Commit & Pull Request Guidelines

Follow [CONTRIBUTING.md](CONTRIBUTING.md) for branches, local previews, submission, and review boundaries. History uses short, imperative subjects; no commit prefix convention is established. Keep commits focused. PR descriptions should explain the problem, resulting behavior, validation, and limitations. Link relevant issues and include screenshots for visible changes. Run `git diff --check` before committing.

## Architecture & Data Constraints

Keep static prerendering enabled and assets compatible with `BASE_PATH`. Initialize browser APIs after mounting. IndexedDB owns video blobs and study metadata; localStorage remembers the last clip. Preserve stored data during upgrades and release object URLs on deletion or teardown. Browser-only YouTube importing failed its feasibility gate; consult the experiment evidence before revisiting it.
