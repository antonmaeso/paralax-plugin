# Parallax package

Utilities to bind DOM elements to face- or pointer-driven parallax effects.

## Quick start

```ts
import { FaceMeshTracker, FaceTracker, MouseTracker } from 'tracking'
import { createParallaxScene } from 'parallax'

const root = document.querySelector<HTMLElement>('[data-scene]')

if (root) {
  const faceTracker =
    FaceTracker.isSupported() || !FaceMeshTracker.isSupported()
      ? new FaceTracker()
      : new FaceMeshTracker()
  const scene = createParallaxScene({
    tracker: faceTracker,
    root,
    autoStart: false
  })

  await scene.start()

  // Later on, swap to pointer control:
  const mouseTracker = new MouseTracker()
  scene.destroy()
  const pointerScene = createParallaxScene({ tracker: mouseTracker, root })
  await pointerScene.start()
}
```

Any element marked with `parallax-layer--depth-N` (for example `parallax-layer--depth-4`) will automatically become a managed layer and move relative to the viewer's head position. Use `parallax-layer--direction-inverse` (default) or `parallax-layer--direction-same` to choose whether a layer moves against or with the viewer.

When the native FaceDetector API is unavailable, `FaceMeshTracker` provides a WebGL + TensorFlow.js fallback with the same metric interface, so you can keep face-driven parallax working on browsers without experimental flags. Check `FaceMeshTracker.isSupported()` before instantiating to ensure camera and WebGL access are available.

### React

```tsx
import { createReactParallaxHook } from 'parallax'
import { useCallback, useEffect, useRef, useState } from 'react'
import { FaceTracker } from 'tracking'

const useParallaxScene = createReactParallaxHook({ useEffect, useRef, useState, useCallback })

export function ParallaxExample() {
  const tracker = useRef(new FaceTracker())
  const { ref, start, stop, isRunning } = useParallaxScene(
    { tracker: tracker.current, autoStart: false },
    [tracker.current]
  )

  useEffect(() => {
    void start()
    return () => {
      stop()
      tracker.current.dispose()
    }
  }, [start, stop])

  return <div ref={ref} data-scene data-running={isRunning()} />
}
```

### Vue

```ts
import { createVueParallaxComposable } from 'parallax'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { MouseTracker } from 'tracking'

const useParallaxScene = createVueParallaxComposable({ ref, onMounted, onBeforeUnmount, watch })

export function useParallaxExample() {
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

The legacy `initParallaxLayers` helper still ships for backwards compatibility, but `createParallaxScene` exposes tracker lifecycle management, resize handling, and framework integrations in one place.
