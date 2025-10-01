# Homepage App

Interactive landing experience that showcases the `parallax` and `tracking` packages inside a Vite + TypeScript single-page app. The site ships three tabs:

1. **Overview** – marketing copy and quick links.
2. **Face Tracking Demo** – live camera feed powered by the `FaceTracker` / `FaceMeshTracker` utilities.
3. **Parallax Playground** – layered parallax scene that reacts to face or mouse metrics.

The project is meant to live inside the monorepo, but you can run it independently if you install its workspace dependencies.

---

## Prerequisites

- Node.js 20+
- pnpm 10+
- A browser with camera access. For the native FaceDetector API (used by `FaceTracker`) enable Chrome’s `chrome://flags/#enable-experimental-web-platform-features` or fall back to the mesh/mouse trackers.

---

## Getting Started

From the monorepo root:

```bash
pnpm install
pnpm --filter homepage-app dev
```

Vite will boot on [http://localhost:5173](http://localhost:5173). Changes under `apps/homepage/src` hot-reload automatically.

### Building for Production

```bash
pnpm --filter homepage-app build
```

Outputs a Vite production bundle in `dist/`. Preview locally with:

```bash
pnpm --filter homepage-app preview
```

---

## Project Structure

```
apps/homepage/
├── src/
│   ├── main.ts                  # Simple router + tab UI
│   ├── pages/
│   │   ├── home.ts              # Overview content renderer
│   │   ├── tracker/             # Face tracking demo controller & UI
│   │   └── parallax/            # Parallax playground controller & UI
│   └── style.css                # Layout + theme styling
├── index.html
├── tsconfig.json
└── vite.config.ts
```

### Routing Model

`main.ts` wires a minimal tab-based router. Each route returns a controller with `mount`/`destroy` so that the face-tracking and parallax demos can manage lifecycles cleanly.

- `renderHome` simply injects static markup.
- `createFaceTrackingPage` and `createParallaxPage` initialise trackers, subscribe to metrics, and tear down on navigation changes.

### Parallax Playground

- Uses `createParallaxScene` with whichever tracker the user selects (native face, mesh fallback, or mouse).
- Auto-detects tracker support, surfaces status messaging, and lets users start/stop the experience.
- DOM layers are defined in `pages/parallax/index.ts` using `parallax-layer--depth-*` classes.

### Face Tracking Demo

- Directly instantiates `FaceTracker` with UI controls.
- Draws bounding boxes/eye overlays via `canvas` while streaming metrics to a sidebar.
- Falls back gracefully when permissions are denied or the API is unavailable.

---

## Development Notes

- **Debugging**: attach VS Code using the provided `.vscode/launch.json` profile (`Vite: Arc` or adjust to your browser).
- **Environment differences**: handle unsupported browsers by checking `FaceTracker.isSupported()` and `FaceMeshTracker.isSupported()` before starting trackers.
- **Hot module replacement**: Vite’s dev server keeps tracker state alive during refreshes; the controllers reset on every route navigation, so resources are cleaned up.

---

## Testing Ideas

There are no automated tests yet. Recommended manual checks:

- Smoke test each tab on Chrome, Safari, and Firefox.
- Verify parallax layers respond to mouse fallback when camera permission is denied.
- Confirm tab navigation updates history and back/forward buttons.
- Check camera stream teardown when navigating away from demos.

---

## License

MIT © Paralax Labs
