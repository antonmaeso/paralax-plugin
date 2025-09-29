# Parallax

Face- and pointer-driven parallax utilities for modern web apps. The package provides:

- DOM helpers that discover and animate depth layers.
- A high-level scene factory with lifecycle management.
- Ready-made React and Vue hooks for component-based apps.
- Compatibility shims for legacy consumers of `initParallaxLayers`.

Pair it with the companion [`tracking`](../tracking/) package to use the built-in face, face mesh, or mouse trackers, or plug in your own metric source.

---

## Installation

```bash
pnpm add parallax
# Optional: install the tracking package for built-in trackers
pnpm add tracking
```

Parallax ships TypeScript types and modern ESM output. The code expects a browser environment for runtime functionality, but you can safely import the module in SSR contexts as long as you guard calls to `createParallaxScene()`.

---

## Getting Started (Vanilla JS)

```ts
import { createParallaxScene } from 'parallax'
import { FaceMeshTracker, FaceTracker, MouseTracker } from 'tracking'

const root = document.querySelector<HTMLElement>('[data-parallax-scene]')
if (!root) {
  throw new Error('Missing parallax scene root')
}

const tracker = FaceTracker.isSupported() || !FaceMeshTracker.isSupported()
  ? new FaceTracker()
  : new FaceMeshTracker()

const scene = createParallaxScene({
  tracker,
  root,
  autoStart: false,
  observeMutations: true,
  updateBoundsOnResize: true
})

await scene.start()
scene.refresh()

// Swap trackers at run time
const pointerScene = createParallaxScene({ tracker: new MouseTracker(), root })
await pointerScene.start()
```

Mark any DOM element with a depth class (for example `parallax-layer--depth-3`) and it will automatically be managed by the scene.

---

## API Reference

### `createParallaxScene(options)`

Creates and configures a parallax scene. Returns a `ParallaxScene` interface with lifecycle helpers.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `tracker` | `TrackerInput` | – | **Required.** Object with a `subscribe` method that emits face metrics. Trackers from the `tracking` package already implement this. |
| `root` | `HTMLElement \| Document \| DocumentFragment \| string \| null` | `document` | Root node or selector used to discover layers. |
| `selector` | `string \| false` | Smart selector based on depth classes | Override automatic layer discovery. Set to `false` to disable selector-based search entirely. |
| `layerAttribute` | `string \| false` | `data-parallax-layer` | Attribute that marks explicit layers. Set to `false` to ignore attribute detection. |
| `boundAttribute` | `string` | `data-parallax-bound` | Attribute added to bound elements. |
| `depthAttribute` | `string` | `undefined` | Read depth from a custom attribute instead of class names. |
| `directionAttribute` | `string` | `undefined` | Read direction from a custom attribute instead of class names. |
| `depthClassPrefix` | `string` | `parallax-layer--depth-` | Class prefix that indicates depth. |
| `genericDepthClassPrefix` | `string` | `depth-` | Additional class prefix considered a depth indicator. |
| `observeMutations` | `boolean` | `false` | Automatically bind/unbind layers when the DOM changes. |
| `autoStart` | `boolean` | `true` | Immediately start the tracker and controller when the scene is created. |
| `updateBoundsOnResize` | `boolean` | `true` | Recalculate controller bounds whenever the window resizes. |
| `controller` | `FaceParallaxController` | internal instance | Provide a preconfigured controller. Useful for testing or sharing controllers between scenes. |
| `controllerOptions` | `ControllerOptions` | defaults | Configure the automatically created controller (max offsets, smoothing). Ignored when `controller` is supplied. |
| `metricAdapter` | `(metric: unknown) => FaceMetric \| null` | `undefined` | Transform custom tracker output into the `FaceMetric` shape. |
| `maxOffsetX`, `maxOffsetY`, `smoothing`, `distanceSmoothing` | `number` | controller defaults | Shorthand to configure the controller without supplying `controllerOptions`. |

#### `ParallaxScene`

The object returned by `createParallaxScene` exposes:

- `controller`: The underlying `FaceParallaxController` instance.
- `layers`: A `ReadonlySet<ParallaxLayer>` containing discovered layers.
- `root`: The resolved root node.
- `refresh()`: Re-scan the DOM and bind any new layer candidates.
- `start()`: Start the tracker and connect the controller. Resolves once the tracker’s `start()` promise settles.
- `stop()`: Disconnect the controller and stop the tracker.
- `destroy()`: Tear down observers, unbind layers, stop the tracker, and remove listeners.
- `isRunning()`: Boolean indicating whether the controller is currently receiving metrics.

#### Legacy `initParallaxLayers`

For older consumers, `initParallaxLayers(options)` remains available. It forwards to `createParallaxScene` under the hood and returns an object with `refresh`, `disconnect`, and `destroy`. Prefer the newer API for richer lifecycle control and compatibility with frameworks.

---

## Trackers

The parallax controller expects metrics shaped like:

```ts
interface FaceMetric {
  center: { x: number; y: number }
  relativeBox: { width: number }
}
```

Any source that emits this structure (or can be adapted via `metricAdapter`) can drive the scene. The `tracking` package provides:

### `FaceTracker`

Wraps the experimental [FaceDetector API](https://developer.mozilla.org/docs/Web/API/Face_Detection_API). Requires Chrome with the `chrome://flags/#enable-experimental-web-platform-features` flag or other browsers that ship the API. Fails gracefully when unsupported.

### `FaceMeshTracker`

TensorFlow.js + MediaPipe-based fallback that runs entirely in the browser using WebGL. Works without the experimental flag and supplies the same metric shape. Requires camera access and WebGL support.

### `MouseTracker`

Pointer-driven tracker that maps cursor movement to the parallax metric, allowing users to experience depth effects without a camera.

### Adapting your own tracker

If you already have a face-detection solution, wrap it as a `TrackerInput`:

```ts
const tracker = {
  subscribe(listener) {
    const stop = faceDetector.onResult((result) => {
      if (!result) {
        listener(null)
        return
      }

      listener({
        center: result.center,
        relativeBox: { width: result.size }
      })
    })
    return () => stop()
  },
  async start() {
    await faceDetector.start()
  },
  stop() {
    faceDetector.stop()
  }
}
```

---

## Layer Styling & Semantics

Layers are ordinary DOM nodes tagged with metadata:

- **Depth classes**: `parallax-layer--depth-N` or the generic `depth-N` (N can be fractional). The depth value scales the offset.
- **Direction classes**: `parallax-layer--direction-inverse` (default) or `parallax-layer--direction-same` to control drift.
- **Data attributes**: Prefer `data-parallax-layer`, optionally coupled with `data-depth` and `data-direction` when using custom attributes via `depthAttribute` / `directionAttribute`.

The `ParallaxLayer` helper injects base styles (`position: absolute` and `will-change: transform`) and emits an `update` event with details:

```ts
layer.addEventListener('update', (event) => {
  const detail = event.detail // offset, depth, distance, depthLevel, direction
})
```

You can use this to drive custom animations or debug values.

---

## Controller Behaviour

`FaceParallaxController` smooths metric updates and clamps offsets:

- Offsets are scaled by configurable `maxOffsetX` / `maxOffsetY`. The controller automatically recalculates bounds based on the root element’s dimensions when `updateBoundsOnResize` is enabled.
- Exponential smoothing (`smoothing` and `distanceSmoothing`) reduces jitter between frames.
- When no face is detected, offsets ease back to zero and every layer emits its neutral state.

To customize the feel of the movement, adjust the controller options:

```ts
const scene = createParallaxScene({
  tracker,
  root,
  maxOffsetX: 160,
  maxOffsetY: 120,
  smoothing: 0.18,
  distanceSmoothing: 0.12
})
```

---

## React Integration

The package exports a factory that wires the scene into React’s hooks:

```ts
import { createReactParallaxHook } from 'parallax'
import { useCallback, useEffect, useRef, useState } from 'react'
import { FaceMeshTracker } from 'tracking'

const useParallaxScene = createReactParallaxHook({ useEffect, useRef, useState, useCallback })

export function Hero() {
  const trackerRef = useRef(new FaceMeshTracker())
  const { ref, start, stop, isRunning } = useParallaxScene(
    { tracker: trackerRef.current, autoStart: false },
    []
  )

  useEffect(() => {
    void start()
    return () => {
      stop()
      trackerRef.current.dispose()
    }
  }, [start, stop])

  return (
    <section className="hero" data-running={isRunning()}>
      <div ref={ref} className="hero__scene">
        <div className="layer parallax-layer--depth-2" />
        <div className="layer parallax-layer--depth-6 parallax-layer--direction-same" />
      </div>
    </section>
  )
}
```

- Pass the standard React hooks into `createReactParallaxHook` so the library stays framework-agnostic.
- The hook manages scene creation, cleanup, and dependency tracking.
- `deps` controls when the scene is rebuilt; include values that influence tracker configuration.

---

## Vue Integration

`createVueParallaxComposable` produces a composable that respects Vue’s lifecycle:

```ts
import { createVueParallaxComposable } from 'parallax'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { MouseTracker } from 'tracking'

const useParallaxScene = createVueParallaxComposable({ ref, onMounted, onBeforeUnmount, watch })

export function useParallaxHero() {
  const tracker = new MouseTracker()
  const { element, start, stop, scene } = useParallaxScene({ tracker, autoStart: false })

  onMounted(() => {
    void start()
  })

  onBeforeUnmount(() => {
    stop()
    tracker.dispose()
  })

  return { element, scene }
}
```

Bind `element.value` to the scene container (`ref="parallaxScene"`). Any reactive sources listed in the second argument to the composable trigger scene rebuilds when they change.

---

## Server-Side Rendering & Non-Browser Environments

`createParallaxScene` returns a no-op stub when `document` is unavailable. You can safely import the module during SSR, but defer scene creation until the component mounts on the client:

```ts
if (typeof window !== 'undefined') {
  const scene = createParallaxScene({ tracker, root })
  void scene.start()
}
```

This guard applies to the React and Vue helpers as well—they only create the scene after the DOM is ready.

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
| --- | --- | --- |
| `FaceTracker.isSupported()` returns `false` | FaceDetector API disabled (e.g. Chrome without experimental flag, Safari, Firefox) | Enable `chrome://flags/#enable-experimental-web-platform-features` or use `FaceMeshTracker` / `MouseTracker`. |
| Tracker start rejects with camera errors | User denied permission or device lacks a camera | Prompt user again, fall back to pointer tracking. |
| Scene never discovers layers | Missing depth classes/attributes or incorrect `selector` configuration | Ensure elements have `parallax-layer--depth-N`, `depth-N`, or the custom attribute you configured. |
| Performance issues on low-end devices | Mesh model running too often or high smoothing values | Lower `detectionFps`, reduce mesh complexity, or consider pointer tracking for constrained devices. |
| Debugger sourcemaps look misaligned | Vite build caching existing outputs | Clear `.vite` cache and rebuild (`rm -rf node_modules/.vite`). |

---

## Migration Notes (from `initParallaxLayers` only)

- Replace `initParallaxLayers({ tracker: metricSource, root })` with `createParallaxScene({ tracker, root })` and keep a handle to the returned object.
- Call `scene.start()` instead of relying on implicit auto-connects.
- Use `scene.stop()` / `scene.destroy()` for cleanup.
- The old helper still exists, but new options (`autoStart`, `layerAttribute`, React/Vue hooks) are only available through the new API.

---
