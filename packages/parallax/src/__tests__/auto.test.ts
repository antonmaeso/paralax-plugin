import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { createParallaxScene } from '../auto'
import type { FaceMetric } from '../types'

class MockTracker {
  listeners = new Set<(metric: unknown | null) => void>()
  started = false
  stopped = false
  disposed = false

  subscribe(listener: (metric: unknown | null) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  async start(): Promise<void> {
    this.started = true
    this.stopped = false
  }

  stop(): void {
    this.stopped = true
    this.started = false
  }

  dispose(): void {
    this.disposed = true
  }

  isRunning(): boolean {
    return this.started
  }

  emit(metric: unknown | null): void {
    for (const listener of this.listeners) {
      listener(metric)
    }
  }
}

let root: HTMLElement

beforeEach(() => {
  root = document.createElement('div')
  document.body.appendChild(root)
})

afterEach(() => {
  root.remove()
})

describe('createParallaxScene', () => {
  it('binds layers, starts tracker, and applies metrics', async () => {
    root.innerHTML = `<div class="parallax-layer--depth-2"></div>`
    const element = root.firstElementChild as HTMLElement
    const tracker = new MockTracker()

    const scene = createParallaxScene({
      tracker,
      root,
      autoStart: false,
      observeMutations: false,
      updateBoundsOnResize: false
    })

    expect(scene.layers.size).toBe(1)
    expect(element.getAttribute('data-parallax-bound')).toBe('true')

    await scene.start()
    expect(tracker.isRunning()).toBe(true)

    tracker.emit({
      center: { x: 0.25, y: 0.75 },
      relativeBox: { width: 0.4 }
    } satisfies FaceMetric)

    expect(element.style.transform).toMatch(/translate3d\(.*px, .*px, 0\)/)

    scene.stop()
    expect(tracker.isRunning()).toBe(false)

    scene.destroy()
    expect(element.getAttribute('data-parallax-bound')).toBeNull()
  })

  it('supports metric adapters for custom tracker payloads', async () => {
    root.innerHTML = `<div class="parallax-layer--depth-3"></div>`
    const element = root.firstElementChild as HTMLElement
    const tracker = new MockTracker()

    const scene = createParallaxScene({
      tracker,
      root,
      autoStart: false,
      observeMutations: false,
      updateBoundsOnResize: false,
      metricAdapter: (value) => {
        if (!value) {
          return null
        }
        const payload = value as { position: { x: number; y: number }; size: number }
        return {
          center: payload.position,
          relativeBox: { width: payload.size }
        }
      }
    })

    await scene.start()

    tracker.emit({ position: { x: 0.6, y: 0.2 }, size: 0.3 })

    expect(element.style.transform).toMatch(/translate3d\(.*px, .*px, 0\)/)

    scene.destroy()
  })

  it('refresh discovers new layers', () => {
    root.innerHTML = `<div class="parallax-layer--depth-1"></div>`
    const tracker = new MockTracker()

    const scene = createParallaxScene({
      tracker,
      root,
      autoStart: false,
      observeMutations: false,
      updateBoundsOnResize: false
    })

    expect(scene.layers.size).toBe(1)

    const extra = document.createElement('div')
    extra.className = 'parallax-layer--depth-4'
    root.appendChild(extra)

    scene.refresh()

    expect(scene.layers.size).toBe(2)

    scene.destroy()
  })
})
