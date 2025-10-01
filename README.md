# Paralax Plugin Monorepo

A pnpm-powered monorepo that explores face-driven parallax interfaces. It bundles:

- [`packages/parallax`](packages/parallax/README.md) – DOM helpers, controller logic, and framework adapters for binding layered UIs to motion metrics.
- [`packages/tracking`](packages/tracking/README.md) – FaceDetector, face mesh, and pointer trackers that emit normalized metrics.
- [`apps/homepage`](apps/homepage/README.md) – Marketing/experience site showing off the parallax playground and tracker demos.
- [`apps/tracking`](apps/tracking/README.md) – Standalone tracker diagnostic app for verifying environment support.

Together they offer a complete toolkit for building parallax experiences that react to user movement.

---

## Repository Layout

```
.
├── apps/
│   ├── homepage/           # Vite SPA showcasing parallax + tracking
│   └── tracking/           # Tracker diagnostics playground
├── packages/
│   ├── parallax/           # Parallax scene factory + framework hooks
│   └── tracking/           # Face & pointer trackers
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
└── README.md               # You are here
```

Both packages are written in TypeScript, ship ESM output, and expose type definitions. Apps rely on Vite for local development and bundling.

---

## Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Run Example Apps

```bash
# Homepage (parallax playground + tracker demos)
pnpm --filter homepage-app dev

# Tracker diagnostic app
pnpm --filter tracking-app dev
```

Visit `http://localhost:5173` for each app (they use separate terminal sessions).

### 3. Build Packages

```bash
pnpm --filter parallax build
pnpm --filter tracking build
```

Emitted bundles live under each package’s `dist/` directory.

---

## Tooling & Scripts

- **Package builds** – `pnpm --filter parallax build`, `pnpm --filter tracking build`
- **Homepage app** – `pnpm --filter homepage-app dev|build|preview`
- **Tracking app** – `pnpm --filter tracking-app dev|build|preview`
- **Package tests** – (none yet) consider adding Vitest or Playwright as needed.

VS Code launch profiles live in `.vscode/launch.json`, with a preconfigured Arc browser target.

---

## Tracker Support Matrix

| Tracker | Dependencies | Browser Support |
| --- | --- | --- |
| `FaceTracker` | Native FaceDetector API | Chrome (with `chrome://flags/#enable-experimental-web-platform-features`), future browsers with FaceDetector |
| `FaceMeshTracker` | TensorFlow.js + MediaPipe | Modern browsers with WebGL + camera access |
| `MouseTracker` | None | Works everywhere (pointer events) |

Apps detect support automatically and fall back to mesh or mouse tracking when needed.

---

## Development Workflow

1. Implement features in the `packages/` workspaces.
2. Run `pnpm --filter <package> build` to verify typechecking and output.
3. Exercise the changes in the sample apps for regression testing.
4. Commit README updates/documentation alongside code changes.

Use `git status` to ensure generated folders (`node_modules`, `dist`, caches) remain untracked. `.gitignore` at the repo root already excludes common build artifacts.

---

## Troubleshooting Tips

- **Camera access errors** – confirm browser permissions and fall back to `MouseTracker` when necessary.
- **`FaceTracker` unsupported** – enable Chrome’s experimental flag or switch to `FaceMeshTracker`.
- **Performance issues** – lower mesh detection FPS, disable `refineLandmarks`, or use pointer tracking during development.
- **Debugger mapping mismatches** – clear Vite caches (`rm -rf apps/*/node_modules/.vite`) and restart the dev server.

More detailed guidance lives in each workspace’s README.

---

## License

MIT © Paralax Labs
