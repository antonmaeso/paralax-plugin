import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockCreateDetector = vi.fn()
const mockEstimateFaces = vi.fn()
const mockDetectorDispose = vi.fn()

vi.mock('../camera-session', () => {
  class MockCameraSession {
    opened = false
    constructor(_: unknown) {}
    async open() {
      this.opened = true
    }
    stop() {}
    dispose() {}
    getVideo() {
      return {
        readyState: 4,
        videoWidth: 640,
        videoHeight: 480
      }
    }
  }
  return { CameraSession: MockCameraSession }
})

vi.mock('@tensorflow/tfjs-core', () => ({
  getBackend: vi.fn(() => 'cpu'),
  setBackend: vi.fn(async () => {}),
  ready: vi.fn(async () => {})
}))

vi.mock('@tensorflow/tfjs-converter', () => ({}))
vi.mock('@tensorflow/tfjs-backend-webgl', () => ({}))

vi.mock('@tensorflow-models/face-landmarks-detection', () => ({
  SupportedModels: { MediaPipeFaceMesh: 'MediaPipeFaceMesh' },
  createDetector: mockCreateDetector
}))

import { FaceMeshTracker } from '../face-mesh-tracker'

const originalWindow = globalThis.window
const originalNavigator = globalThis.navigator
const originalDocument = globalThis.document
const originalRaf = globalThis.requestAnimationFrame
const originalCancelRaf = globalThis.cancelAnimationFrame
let scheduledCallback: FrameRequestCallback | null = null

function setupBrowserEnv({ webgl = true }: { webgl?: boolean } = {}) {
  globalThis.window = {
    addEventListener: () => {}
  } as unknown as typeof globalThis.window
  globalThis.navigator = {
    mediaDevices: { getUserMedia: vi.fn() }
  } as unknown as Navigator

  const canvas = {
    getContext: vi.fn(() => (webgl ? ({}) : null))
  }

  globalThis.document = {
    createElement: vi.fn(() => canvas)
  } as unknown as Document
}

function restoreEnv() {
  if (originalWindow) {
    globalThis.window = originalWindow
  } else {
    // @ts-expect-error delete for tests
    delete globalThis.window
  }
  if (originalNavigator) {
    globalThis.navigator = originalNavigator
  } else {
    // @ts-expect-error delete for tests
    delete globalThis.navigator
  }
  if (originalDocument) {
    globalThis.document = originalDocument
  } else {
    // @ts-expect-error delete for tests
    delete globalThis.document
  }

  if (originalRaf) {
    globalThis.requestAnimationFrame = originalRaf
  } else {
    // @ts-expect-error delete for tests
    delete globalThis.requestAnimationFrame
  }

  if (originalCancelRaf) {
    globalThis.cancelAnimationFrame = originalCancelRaf
  } else {
    // @ts-expect-error delete for tests
    delete globalThis.cancelAnimationFrame
  }

  scheduledCallback = null
}

beforeEach(() => {
  restoreEnv()
  mockCreateDetector.mockReset()
  mockEstimateFaces.mockReset()
  mockDetectorDispose.mockReset()
})

afterEach(() => {
  restoreEnv()
})

describe('FaceMeshTracker.isSupported', () => {
  it('returns false when window is undefined', () => {
    // @ts-expect-error delete for tests
    delete globalThis.window

    expect(FaceMeshTracker.isSupported()).toBe(false)
  })

  it('returns false when WebGL context cannot be created', () => {
    setupBrowserEnv({ webgl: false })

    expect(FaceMeshTracker.isSupported()).toBe(false)
  })

  it('returns true when browser features are available', () => {
    setupBrowserEnv({ webgl: true })

    expect(FaceMeshTracker.isSupported()).toBe(true)
  })
})

describe('FaceMeshTracker lifecycle', () => {
  beforeEach(() => {
    setupBrowserEnv({ webgl: true })
    scheduledCallback = null
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      scheduledCallback = cb
      return 1
    }) as typeof globalThis.requestAnimationFrame
    globalThis.cancelAnimationFrame = vi.fn(() => {
      scheduledCallback = null
    }) as typeof globalThis.cancelAnimationFrame

    mockCreateDetector.mockResolvedValue({
      estimateFaces: mockEstimateFaces.mockResolvedValueOnce([
        {
          box: { xMin: 0, xMax: 10, yMin: 0, yMax: 10 }
        }
      ]),
      dispose: mockDetectorDispose
    })
  })

  it('emits metrics after start when supported', async () => {
    const tracker = new FaceMeshTracker({ detectionFps: 60 })
    const listener = vi.fn()
    tracker.subscribe(listener)

    await tracker.start()

    if (scheduledCallback) {
      await scheduledCallback(0)
    }

    expect(listener).toHaveBeenCalled()
    const metric = listener.mock.calls.find(([value]) => value !== null)?.[0]
    expect(metric).toMatchObject({
      center: { x: expect.any(Number), y: expect.any(Number) },
      relativeBox: { width: expect.any(Number) }
    })
  })

  it('stop emits null and resets running state', async () => {
    const tracker = new FaceMeshTracker()
    const listener = vi.fn()
    tracker.subscribe(listener)

    await tracker.start().catch(() => {})
    tracker.stop()

    expect(listener).toHaveBeenCalledWith(null)
    expect(tracker.isRunning).toBe(false)
  })
})
