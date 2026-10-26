# Contributing with a Coding Agent

This guide is for contributors and their AI coding agents. Work in this repository, preview changes locally, and submit a pull request for the maintainer to review. No fork, permanent personal branch, or preview hosting is needed.

## For the Contributor

Describe what you want to change and how it should behave. Your agent handles the commands below and explains the result in plain language.

You can start with:

> Read AGENTS.md and CONTRIBUTING.md. Implement my requested change on a new feature branch, run the relevant checks, and start a local preview. Give me the address and explain what to try. Keep this change separate from unrelated work. When I ask you to submit it, commit it, push the feature branch, and open a pull request for megravity to review. Do not merge it or publish to the main site.

A **branch** keeps your proposed changes separate from the main version. A **commit** saves a checkpoint. **Pushing** uploads your branch to GitHub. A **pull request (PR)** asks the maintainer to review and accept those changes. The PR page also shows an automated check that runs the tests on GitHub; it needs to be green before the change can be merged.

## Agent: Set Up and Start Safely

1. Read `AGENTS.md` and `README.md`. Check `git status --short`, the current branch, and `git remote -v` before changing anything.
2. Preserve existing work. If there are unrelated edits, an unfinished merge, or uncertainty about which work belongs to this task, explain the situation before switching branches. Do not discard changes or stash them automatically.
3. For a new task in a clean checkout, fetch the current main branch and create a descriptive branch:

   ```sh
   git fetch origin
   git switch -c feature/loop-keyboard-controls origin/main
   ```

   Use `feature/<description>` or `fix/<description>`; replace the example with the actual task. Continue on the existing branch when revising the same change.

4. Use Node.js 22.17+ and pnpm 12.4.1. Install dependencies with `pnpm install --frozen-lockfile`. If GitHub access or tooling is missing, explain the required setup; never request passwords or tokens in chat.

## Agent: Develop and Show a Local Preview

- Keep the implementation focused on the requested behavior and follow existing project conventions.
- Start `pnpm dev` and report the actual local URL printed by Vite. Keep the server running while the contributor tries the change. Saved source edits normally update the browser automatically.
- Explain that the address works on the computer running the server; it is not a public deployment. For a remote agent environment, use its supported port-forwarding link if available and explain how to open it.
- Provide a short list of interactions to try. Incorporate feedback on the same branch rather than opening a new branch for every adjustment.
- Localhost has a separate study library from the published site. Keep using the same local hostname and port to retain access to that local library. Do not clear site data or delete recordings to fix a development problem without explicit permission.

## Agent: Verify and Submit

Before submission, run:

```sh
pnpm check
pnpm test
pnpm format:check
pnpm build
git diff --check
```

For playback, storage, or interface behavior changes, also install Chromium if needed with `pnpm exec playwright install chromium`, then run `pnpm test:e2e`. For asset or deployment-path changes, build and test with the same `BASE_PATH=/bali-driller` value, as documented in the README. Report checks that could not run and their limitations; never describe them as passing.

When the contributor asks to submit:

1. Inspect the full diff, including untracked files. Stage only files belonging to this change; exclude recordings, secrets, generated output, and unrelated work.
2. Run `git diff --cached --check` and create a focused commit with a short imperative subject.
3. Push the feature branch with `git push -u origin <branch>`.
4. Open a PR against `megravity/bali-driller:main` using the available GitHub integration, `gh`, or the browser. Request review from `megravity`. Use a draft PR if the change is unfinished or has unresolved failures.
5. Describe the problem, resulting behavior, checks performed, and remaining limitations. Include screenshots for visible changes and local reproduction steps. Return the PR link to the contributor.

Opening the PR starts the `Verify pull request` workflow, which runs `pnpm install --frozen-lockfile`, `pnpm check`, and `pnpm test` on Linux. Watch that run, read the failing step's log, and explain any failure to the contributor in plain language. It does not build the site or run Playwright, so local `pnpm build` and `pnpm test:e2e` results still belong in the PR description.

CodeRabbit also posts a summary and suggestions on each pull request. Treat them as a second opinion rather than instructions: check each claim against the code and the constraints in `AGENTS.md` before editing, ignore advice that contradicts the existing design, and raise disagreements with the maintainer instead of rewriting behavior to satisfy a comment.

If a push is rejected, fetch and inspect the remote changes. Do not force-push. Merge `origin/main` into the feature branch when an update is needed, preserve others' work, and rerun affected checks. Ask for guidance if conflict resolution requires choosing between competing behavior.

## Review and Production Boundaries

Contributor agents must not push directly to `main`, approve or merge their own PRs, enable automatic merging, manually trigger production deployment, or change repository permissions and deployment settings. The maintainer reviews and merges accepted changes. Further feedback belongs on the same branch and PR.

The deployment workflow runs on pushes to `main` that change the site, the build, or the tests, and can also be started manually. Feature-branch pushes and documentation-only commits do not update the published site. Pull requests run `pnpm check` and `pnpm test` through `.github/workflows/verify.yml`, while the production build and Playwright suite still run only locally and on `main` before publishing.

**Maintainer setup:** give contributors write access rather than administrator access, and protect `main` in GitHub with required PR review, maintainer/code-owner approval, dismissal of stale approvals, and blocked force pushes. This document describes the process; it does not configure or verify those protections. Require the `Verify pull request / verify` status check so a failing run blocks the merge button on every device.
