# Paralax Plugin codebase overview

## Monorepo layout
- Managed with [`pnpm` workspaces](../pnpm-workspace.yaml) so every package/app has its own `package.json` but shares the lockfile.
- Two core libraries live under [`packages/`](../packages):
  - [`packages/tracking`](../packages/tracking) implements camera + input tracking primitives.
  - [`packages/parallax`](../packages/parallax) renders DOM layers that react to tracking metrics.
- Example applications sit under [`apps/`](../apps). The homepage app bundles the demos and documentation site.

## Homepage application
- Vite-powered SPA (`apps/homepage`) that swaps between the overview, tracker, and parallax demos using a tiny client-side router. [`src/main.ts`](../apps/homepage/src/main.ts) wires up navigation tabs, history state, and lifecycle-aware page controllers so each demo can mount/unmount cleanly.
- Pages are rendered on demand:
  - [`pages/home.ts`](../apps/homepage/src/pages/home.ts) is static marketing copy.
  - [`pages/tracker/index.ts`](../apps/homepage/src/pages/tracker/index.ts) creates and manages a `FaceTracker` instance, draws bounding boxes on a `<canvas>`, and streams metric updates to the UI. It handles support checks, lifecycle cleanup, and overlay rendering.
  - [`pages/parallax/index.ts`](../apps/homepage/src/pages/parallax/index.ts) lets users toggle between face or mouse tracking, bootstraps a parallax scene, and controls tracker lifecycle/start-stop interactions.
- Styling for each page lives alongside its controller (`style.css` files) to keep demos encapsulated.

## Tracking package
- Entry point (`packages/tracking/src/index.ts`) exports `FaceTracker`, `FaceMeshTracker`, and `MouseTracker`, plus shared type definitions.
- [`FaceTracker`](../packages/tracking/src/face-tracker.ts) wraps the native `FaceDetector` API: opens a camera session, runs detection on a configurable loop, normalises detections via [`metric-factory.ts`](../packages/tracking/src/metric-factory.ts), and emits `FaceTrackingMetric` updates to subscribers.
- [`FaceMeshTracker`](../packages/tracking/src/face-mesh-tracker.ts) (WebGL + TensorFlow fallback) exposes the same subscription API so consumers can swap implementations without changing UI code.
- [`MouseTracker`](../packages/tracking/src/mouse-tracker.ts) tracks pointer movement for non-camera scenarios.
- All trackers share [`types.ts`](../packages/tracking/src/types.ts) to keep metric shapes consistent across backends.

## Parallax package
- Public exports in [`src/index.ts`](../packages/parallax/src/index.ts) expose the imperative scene API, React/Vue hooks, and low-level layer utilities.
- [`createParallaxScene`](../packages/parallax/src/auto.ts) accepts any tracker with a `subscribe` method, auto-discovers elements tagged with `parallax-layer--depth-*`, and keeps them registered with the [`FaceParallaxController`](../packages/parallax/src/controller.ts).
- [`ParallaxLayer`](../packages/parallax/src/layer.ts) handles per-element transforms, smoothing, and depth-based movement calculations.
- Framework helpers [`react.ts`](../packages/parallax/src/react.ts) and [`vue.ts`](../packages/parallax/src/vue.ts) wrap the imperative API into idiomatic hooks/composables, making it easy to integrate scenes into apps.

## Working locally
- Install dependencies with `pnpm install` at the repo root. Workspace scripts (e.g. `pnpm --filter homepage dev`) run the demos.
- Trackers depend on browser APIs (camera, WebGL, FaceDetector). Use Chrome with the `#enable-experimental-web-platform-features` flag for full support, or fall back to `FaceMeshTracker`/`MouseTracker` during development.
- The parallax package is framework-agnostic; use the provided hooks for React/Vue apps or call `createParallaxScene` directly for vanilla projects.

## Next steps for new contributors
- Read through the tracking metrics types to understand the data feeding parallax layers.
- Explore `FaceMeshTracker` to see how the TensorFlow fallback is wired; it mirrors the `FaceTracker` API.
- Try extending the homepage demos—for example, add a depth inspector or additional layer effects—to get hands-on experience with trackers + scenes.
