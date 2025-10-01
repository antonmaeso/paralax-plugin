# Tracking Demo App

Standalone Vite + TypeScript playground that exercises the `tracking` package’s face-detection APIs. It is a lightweight diagnostic tool for verifying camera access, inspecting metric output, and tuning tracker options outside of the full homepage experience.

---

## Features

- **One-click camera setup** – start/stop buttons request permission and drive `FaceTracker`.
- **Live telemetry** – pretty-printed `FaceTrackingMetric` payloads with pixel and normalized values.
- **Canvas overlay** – renders the hidden video feed and draws bounding boxes + eye landmarks in real time.
- **Graceful fallbacks** – surfaces informative status messages when the FaceDetector API is unavailable, permissions are denied, or detection pauses.

Use it while developing new tracker features or confirming that the environment supports face detection.

---

## Prerequisites

- Node.js 20+
- pnpm 10+
- Chrome (with `chrome://flags/#enable-experimental-web-platform-features` enabled) or a browser that supports the FaceDetector API. Without that flag the demo will display support warnings and refuse to start.

If you want to test the mesh fallback, tweak the source to instantiate `FaceMeshTracker` instead of `FaceTracker`.

---

## Getting Started

Install dependencies from the monorepo root, then run:

```bash
pnpm install
pnpm --filter tracking-app dev
```

Visit [http://localhost:5173](http://localhost:5173) and grant camera permission when prompted.

### Build & Preview

```bash
pnpm --filter tracking-app build
pnpm --filter tracking-app preview
```

Bundles land in `apps/tracking/dist/` (ignored by git).

---

## Project Structure

```
apps/tracking/
├── src/
│   ├── main.ts      # UI + tracker wiring + canvas overlay
│   ├── style.css    # Minimal styling
│   └── typescript.svg
├── index.html
├── tsconfig.json
└── vite.config.ts
```

Key modules in `main.ts`:

- `DemoUI` sets up DOM elements and exposes helpers for toggling buttons/status.
- `OverlayRenderer` manages the `<canvas>` used to draw the camera frame, bounding box, and eye markers.
- `FaceTrackingDemo` orchestrates the tracker lifecycle, handles errors, and updates UI metrics.

---

## Customising the Demo

- **Switch trackers**: replace `new FaceTracker()` with `new FaceMeshTracker()` or `new MouseTracker()` to test alternative inputs.
- **Adjust layout**: modify `style.css` or the template in `DemoUI.mount` for branding.
- **Log raw metrics**: extend `updateMetrics` to push data to your own logging pipeline.

---

## Troubleshooting

| Symptom | Remedy |
| --- | --- |
| Console shows `FaceTracker.isSupported() false` | Enable Chrome’s experimental Web Platform features or swap to `FaceMeshTracker` (requires WebGL). |
| Camera preview remains black | Verify permission prompts, ensure no other app is locking the webcam. |
| Metrics freeze after minimising tab | Chromium throttles background tabs; keep the window focused when testing. |
| `start()` rejects with permission errors | Revoke and re-grant camera access in browser privacy settings, then retry. |

---

## License

MIT © Paralax Labs
