import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'

const {
  mockIsFaceDetectionSupported,
  mockResolveFaceDetectorCtor
} = vi.hoisted(() => {
  return {
    mockIsFaceDetectionSupported: vi.fn(),
    mockResolveFaceDetectorCtor: vi.fn()
  }
})

vi.mock('../face-detector', () => ({
  isFaceDetectionSupported: mockIsFaceDetectionSupported,
  resolveFaceDetectorCtor: mockResolveFaceDetectorCtor
}))

vi.mock('../camera-session', () => {
  class MockCameraSession {
    constraints: MediaTrackConstraints
    constructor({ constraints }: { constraints: MediaTrackConstraints }) {
      this.constraints = constraints
    }
    async open() {}
    stop() {}
    dispose() {}
    getVideo() {
      return null
    }
  }
  return { CameraSession: MockCameraSession }
})

vi.mock('../detection-loop', () => {
  class MockDetectionLoop {
    start = vi.fn()
    stop = vi.fn()
    constructor() {}
  }
  return { DetectionLoop: MockDetectionLoop }
})

vi.mock('../metric-factory', () => ({
  createMetric: vi.fn()
}))

import { FaceTracker } from '../face-tracker'

const originalWindow = globalThis.window
const originalNavigator = globalThis.navigator

function resetGlobals() {
  if (originalWindow) {
    globalThis.window = originalWindow
  } else {
    // @ts-expect-error allow delete for tests
    delete globalThis.window
  }
  if (originalNavigator) {
    globalThis.navigator = originalNavigator
  } else {
    // @ts-expect-error allow delete for tests
    delete globalThis.navigator
  }
}

beforeEach(() => {
  resetGlobals()
  mockIsFaceDetectionSupported.mockReset()
  mockResolveFaceDetectorCtor.mockReset()
})

afterEach(() => {
  resetGlobals()
})

describe('FaceTracker.isSupported', () => {
  it('returns false when window is undefined', () => {
    // @ts-expect-error allow delete for tests
    delete globalThis.window

    expect(FaceTracker.isSupported()).toBe(false)
  })

  it('returns true when detector and media devices exist', () => {
    globalThis.window = {} as typeof globalThis.window
    globalThis.navigator = {
      mediaDevices: { getUserMedia: vi.fn() }
    } as unknown as Navigator
    mockIsFaceDetectionSupported.mockReturnValue(true)

    expect(FaceTracker.isSupported()).toBe(true)
  })

  it('returns false when detector support is missing', () => {
    globalThis.window = {} as typeof globalThis.window
    globalThis.navigator = {
      mediaDevices: { getUserMedia: vi.fn() }
    } as unknown as Navigator
    mockIsFaceDetectionSupported.mockReturnValue(false)
    mockResolveFaceDetectorCtor.mockReturnValue(null)

    expect(FaceTracker.isSupported()).toBe(false)
  })
})

describe('FaceTracker lifecycle', () => {
  it('throws from start when FaceDetector ctor is unavailable', async () => {
    globalThis.window = {} as typeof globalThis.window
    globalThis.navigator = {
      mediaDevices: { getUserMedia: vi.fn() }
    } as unknown as Navigator
    mockIsFaceDetectionSupported.mockReturnValue(false)
    mockResolveFaceDetectorCtor.mockReturnValue(null)

    const tracker = new FaceTracker()

    await expect(tracker.start()).rejects.toThrow(
      'Face tracking is not supported: missing FaceDetector API or media devices.'
    )
  })

  it('unsubscribe prevents listener from being invoked', () => {
    globalThis.window = {} as typeof globalThis.window
    globalThis.navigator = {
      mediaDevices: { getUserMedia: vi.fn() }
    } as unknown as Navigator
    mockIsFaceDetectionSupported.mockReturnValue(false)
    mockResolveFaceDetectorCtor.mockReturnValue(null)

    const tracker = new FaceTracker()
    const listener = vi.fn()
    const unsubscribe = tracker.subscribe(listener)

    unsubscribe()
    // Force emit via casting to access private helper for test purposes.
    ;(tracker as unknown as { emit(metric: null): void }).emit(null)

    expect(listener).not.toHaveBeenCalled()
  })
})
