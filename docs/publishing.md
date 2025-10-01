# Publishing Packages

This repository contains two publishable workspaces:

- `packages/parallax`
- `packages/tracking`

Both ship ESM + type definitions compiled with TypeScript. Follow the steps below whenever you need to release to the package registry (GitHub Packages by default).

---

## Prerequisites

1. **Node & pnpm** – Use the versions defined in `.nvmrc`/`packageManager` (`Node 20+, pnpm 10+`).
2. **Auth token** – Create a GitHub personal access token (classic) with the `write:packages` scope and add it to your local config:
   ```bash
   npm config set @antonmaeso:registry https://npm.pkg.github.com
   npm config set //npm.pkg.github.com/:_authToken <TOKEN>
   ```
3. **Clean workspace** – Ensure `git status` is clean and all tests pass.

---

## Release Checklist

1. **Install & build**
   ```bash
   pnpm install
   pnpm --filter @antonmaeso/parallax build
   pnpm --filter @antonmaeso/tracking build
   ```
2. **Run unit tests**
   ```bash
   pnpm --filter @antonmaeso/parallax test
   pnpm --filter @antonmaeso/tracking test
   ```
3. **Version bump** – Update the package version in `packages/<name>/package.json`. Stick to semantic versioning. If publishing both packages, bump them together.
4. **Changelog / docs** – Update the relevant README or CHANGELOG with release notes.
5. **Commit and tag**
   ```bash
   git add packages/parallax/package.json packages/tracking/package.json docs/publishing.md
   git commit -m "release: <package>@<version>"
   git tag <package>@<version>
   git push origin main --tags
   ```

---

## Publishing

From the repo root run:

```bash
cd packages/parallax
pnpm publish --access public

cd ../tracking
pnpm publish --access public
```

pnpm will use the `publishConfig.registry` or the registry configured via npm config. If you need to publish to npm instead of GitHub Packages remove/update the `publishConfig` entry and re-run `pnpm publish`.

**Dry run first:**
```bash
pnpm publish --dry-run
```

---

## Troubleshooting

| Issue | Fix |
| --- | --- |
| `401 Unauthorized` | Check PAT scopes, `npm config get //npm.pkg.github.com/:_authToken`. |
| Dist files missing | Rerun `pnpm --filter <pkg> build` before publishing. Ensure `files` in `package.json` includes `dist`. |
| Version already exists | Bump `version` in `package.json` and retry. |
| Registry mismatch | Confirm `publishConfig.registry` and local npm settings point to the desired registry. |

---

## Post Publish

1. Verify the package appears in the GitHub Packages UI (or npm registry).
2. Update consumers (internal apps) to the new version via `pnpm up @antonmaeso/parallax@latest @antonmaeso/tracking@latest`.
3. Announce the release with the changelog summary.

