# Tracking

Browser-side trackers for powering the [`parallax`](../parallax/) scene controller. Each tracker emits face-like metrics that the parallax library can transform into layered motion. The package includes:

- **FaceTracker** — wraps the experimental FaceDetector API.
- **FaceMeshTracker** — TensorFlow.js + MediaPipe fallback for browsers without FaceDetector.
- **MouseTracker** — pointer-based metrics for non-camera experiences.

Every tracker conforms to the same minimal interface, so they can be swapped at runtime based on user preference or feature detection.

---

## Installation

```bash
pnpm add tracking
```

When using the `FaceMeshTracker`, the package will also install the required TensorFlow.js and MediaPipe dependencies. The code ships as ESM with TypeScript definitions and targets modern browsers.

---

## Metric Format

All trackers emit a `FaceTrackingMetric` shape:

```ts
interface FaceTrackingMetric {
  timestamp: number
  box: { x: number; y: number; width: number; height: number }
  relativeBox: { x: number; y: number; width: number; height: number }
  center: { x: number; y: number }
  landmarks: ReadonlyArray<{ type?: string; points: ReadonlyArray<{ x: number; y: number }> }>
  eyes: { left?: { x: number; y: number }; right?: { x: number; y: number } }
}
```

The companion parallax package only needs `center` and `relativeBox.width`, but the richer data supports advanced use cases (for example, analyzing facial landmarks or eye positions).

Trackers implement:

```ts
interface Tracker {
  subscribe(listener: (metric: FaceTrackingMetric | null) => void): () => void
  start(): Promise<void>
  stop(): void
  dispose(): void
  readonly isRunning: boolean
}
```

`subscribe` returns an unsubscribe function. `null` metrics indicate tracking loss (e.g., face left the frame). `dispose` releases resources (camera, listeners). Always call `dispose` when you no longer need the tracker.

---

## FaceTracker (FaceDetector API)

Uses the [FaceDetector API](https://developer.mozilla.org/docs/Web/API/Face_Detection_API), which is currently behind the `chrome://flags/#enable-experimental-web-platform-features` flag in Chrome and unavailable in Safari/Firefox.

### Usage

```ts
import { FaceTracker } from 'tracking'

if (FaceTracker.isSupported()) {
  const tracker = new FaceTracker({ detectionFps: 15 })
  const unsubscribe = tracker.subscribe((metric) => {
    console.log(metric)
  })

  await tracker.start()
  // ... later
  tracker.stop()
  unsubscribe()
  tracker.dispose()
}
```

### Configuration (`FaceTrackerOptions`)

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `maxDetectedFaces` | `number` | `1` | Maximum faces the detector should track simultaneously. |
| `detectionFps` | `number` | `15` | Target detection rate. Higher values increase CPU usage. |
| `cameraConstraints` | `MediaTrackConstraints` | `{ facingMode: 'user' }` | Passed to `getUserMedia`. Override to choose rear cameras or control resolution. |

### Fallback Strategy

When `FaceTracker.isSupported()` is `false`, prompt the user to enable the Chrome flag or fall back to another tracker (`FaceMeshTracker`, `MouseTracker`). The tracker logs helpful warnings to the console when unavailable.

---

## FaceMeshTracker (TensorFlow.js)

Polyfills face metrics using the [MediaPipe Face Mesh](https://developers.google.com/mediapipe/solutions/vision/face_mesh) model running in TensorFlow.js. Works in modern browsers with WebGL and camera access.

### Usage

```ts
import { FaceMeshTracker } from 'tracking'

if (FaceMeshTracker.isSupported()) {
  const tracker = new FaceMeshTracker({ detectionFps: 12, refineLandmarks: true })
  tracker.subscribe((metric) => {
    if (!metric) {
      return
    }
    console.log(metric.center)
  })

  await tracker.start()
}
```

### Configuration (`FaceMeshTrackerOptions`)

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `detectionFps` | `number` | `15` | Target detection cadence. Lower values reduce GPU load. |
| `maxFaces` | `number` | `1` | Maximum simultaneous faces. |
| `refineLandmarks` | `boolean` | `false` | If `true`, predicts additional iris and facial landmarks (higher compute cost). |
| `cameraConstraints` | `MediaTrackConstraints` | `{ facingMode: 'user' }` | Forwarded to `getUserMedia`. |

### Internals & Performance Tips

- The tracker lazily loads TensorFlow.js and registers the WebGL backend at runtime. The first start incurs a download cost for the model and wasm assets.
- Consider calling `await FaceMeshTracker.isSupported()` checks during onboarding and prompting users before camera access.
- Use lower `detectionFps` or disable `refineLandmarks` for slower devices.
- Always call `dispose()` to release webcam streams and WebGL contexts.

---

## MouseTracker (Pointer)

Transforms pointer movement into face-like metrics. Works in browsers without camera access or where users decline permissions.

### Usage

```ts
import { MouseTracker } from 'tracking'

const tracker = new MouseTracker({ depthStrategy: 'radial' })
const unsubscribe = tracker.subscribe((metric) => {
  // metric behaves like a face metric, but derived from cursor position
})

await tracker.start()
// ...
tracker.stop()
tracker.dispose()
```

### Configuration (`MouseTrackerOptions`)

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `element` | `HTMLElement \| Window` | `window` | Target element whose bounds determine normalized coordinates. |
| `smoothing` | `number` | `0.25` | Interpolation factor applied to pointer updates. |
| `depthStrategy` | `'constant' \| 'radial'` | `'radial'` | How the depth value (`relativeBox.width`) is generated. |
| `constantDepth` | `number` | `0.5` | Used when `depthStrategy === 'constant'`. |
| `radialDepth.near` | `number` | `0.85` | Depth at the element’s center when using the `radial` strategy. |
| `radialDepth.far` | `number` | `0.35` | Depth at the edges when using the `radial` strategy. |

### Behaviour Notes

- The tracker responds to pointer events (`pointermove` or `mousemove`) and emits `null` when the cursor leaves the element.
- Works with touch inputs (pointer events). Provide alternate UI hints when relying on mouse-driven parallax.

---

## Integrating with `parallax`

The parallax scene factory accepts any tracker instance as its `tracker` option:

```ts
import { createParallaxScene } from 'parallax'
import { FaceTracker, FaceMeshTracker, MouseTracker } from 'tracking'

const tracker = FaceTracker.isSupported()
  ? new FaceTracker()
  : FaceMeshTracker.isSupported()
  ? new FaceMeshTracker()
  : new MouseTracker()

const scene = createParallaxScene({ tracker, root: document.body })
await scene.start()
```

Use feature detection (`isSupported`) to create a graceful progressive enhancement path.

---

## Lifecycle Guidelines

- **Start on user action**: Some browsers require user intent before camera access or pointer lock. Trigger `tracker.start()` after the user presses a button.
- **Handle `null` metrics**: Always account for the tracker emitting `null` when the target leaves view or the pointer exits bounds.
- **Stop & dispose**: Call `tracker.stop()` when pausing parallax and `tracker.dispose()` when the surrounding component unmounts or the page unloads.
- **Error handling**: `start()` rejects with informative messages (unsupported environment, permission denial). Surface these to users and offer alternate control modes.

---

## Advanced Usage

### Sharing a Tracker Across Scenes

Multiple scenes can subscribe to the same tracker instance:

```ts
const faceTracker = new FaceMeshTracker()
const sceneA = createParallaxScene({ tracker: faceTracker, root: heroEl, autoStart: false })
const sceneB = createParallaxScene({ tracker: faceTracker, root: galleryEl, autoStart: false })

await faceTracker.start()
sceneA.controller.connect()
sceneB.controller.connect()
```

Remember to manage reference counts and only dispose the tracker when all consumers are done.

### Custom Metric Transformations

Use the `metricAdapter` option in `createParallaxScene` to translate tracker output to simplified parallax metrics. Alternatively, wrap `Tracker.subscribe` to preprocess values before forwarding them.

---

## Troubleshooting

| Issue | Cause | Solution |
| --- | --- | --- |
| `FaceTracker.isSupported()` is `false` | FaceDetector API disabled or unsupported | Guide users to enable Chrome’s experimental flag or fall back to another tracker. |
| `FaceMeshTracker.start()` throws `MediaDevices API is unavailable` | Browser lacks `getUserMedia` or permissions | Request camera access, handle denial, or switch to pointer control. |
| `FaceMeshTracker` performance is poor | Model running too frequently or on low-powered device | Lower `detectionFps`, disable `refineLandmarks`, or provide pointer fallback. |
| `MouseTracker` depth feels unnatural | Default radial depth curve unsuitable for your layout | Adjust `radialDepth.near` / `radialDepth.far` or use `constant` depth. |
| Tracker never emits metrics | `subscribe` called after `start()`, or listeners removed | Ensure you subscribe before or immediately after calling `start()`. |

---

## License

MIT © Paralax Labs
