import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { FaceParallaxController } from '../controller'
import type { FaceMetric, Subscribable } from '../types'
import type { ParallaxLayer } from '../layer'

describe('FaceParallaxController', () => {
  const listeners = new Set<(metric: FaceMetric | null) => void>()
  const tracker: Subscribable<FaceMetric> = {
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    }
  }

  const layer = {
    update: vi.fn(),
    reset: vi.fn()
  } as unknown as ParallaxLayer

  beforeEach(() => {
    listeners.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    listeners.clear()
  })

  it('invokes layer update when metrics arrive', () => {
    const controller = new FaceParallaxController(tracker, {
      smoothing: 1,
      distanceSmoothing: 1,
      maxOffsetX: 100,
      maxOffsetY: 100
    })

    controller.addLayer(layer)
    controller.connect()

    const metric: FaceMetric = {
      center: { x: 0, y: 1 },
      relativeBox: { width: 0.4 }
    }

    for (const listener of listeners) {
      listener(metric)
    }

    expect(layer.update).toHaveBeenCalledWith({ x: 50, y: 50 }, 0.4)
  })

  it('resets offsets on disconnect', () => {
    const controller = new FaceParallaxController(tracker, {
      smoothing: 1,
      distanceSmoothing: 1
    })

    controller.addLayer(layer)
    controller.connect()
    controller.disconnect()

    expect(layer.update).toHaveBeenCalledWith({ x: 0, y: 0 }, 0)
  })
})
