import { describe, expect, it, afterEach, vi } from 'vitest'
import { MouseTracker } from '../mouse-tracker'

const originalWindow = globalThis.window

afterEach(() => {
  if (originalWindow) {
    globalThis.window = originalWindow
  } else {
    // @ts-expect-error delete for tests
    delete globalThis.window
  }
})

describe('MouseTracker.isSupported', () => {
  it('returns false when window is undefined', () => {
    const cachedWindow = globalThis.window
    // @ts-expect-error delete for tests
    delete globalThis.window

    expect(MouseTracker.isSupported()).toBe(false)

    if (cachedWindow) {
      globalThis.window = cachedWindow
    }
  })

  it('returns true when window listeners are available', () => {
    expect(MouseTracker.isSupported()).toBe(true)
  })
})

describe('MouseTracker behaviour', () => {
  it('emits metrics on pointer movement', async () => {
    const element = document.createElement('div')
    element.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 200,
      height: 100,
      right: 200,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => ({})
    })
    document.body.appendChild(element)

    const tracker = new MouseTracker({
      element,
      smoothing: 1,
      depthStrategy: 'constant',
      constantDepth: 0.4
    })

    const listener = vi.fn()
    tracker.subscribe(listener)

    await tracker.start()

    const event = new window.PointerEvent('pointermove', {
      clientX: 100,
      clientY: 50
    })

    element.dispatchEvent(event)

    expect(listener).toHaveBeenCalled()
    const metric = listener.mock.calls[listener.mock.calls.length - 1][0]
    expect(metric).not.toBeNull()
    expect(metric!.center.x).toBeCloseTo(0.5)
    expect(metric!.center.y).toBeCloseTo(0.5)
    expect(metric!.relativeBox.width).toBeCloseTo(0.4)

    tracker.stop()
    expect(listener).toHaveBeenCalledWith(null)

    tracker.dispose()
    element.remove()
  })
})
