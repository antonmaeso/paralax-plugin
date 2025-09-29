import { CameraSession } from './camera-session'
import { DetectionLoop } from './detection-loop'
import { createMetric } from './metric-factory'
import {
  isFaceDetectionSupported,
  resolveFaceDetectorCtor,
  type FaceDetectorConstructor,
  type FaceDetectorLike
} from './face-detector'
import type {
  FaceTrackerOptions,
  FaceTrackingListener,
  FaceTrackingMetric
} from './types'

const DEFAULT_DETECTION_FPS = 15
const DEFAULT_MAX_FACES = 1
const DEFAULT_CONSTRAINTS: MediaTrackConstraints = { facingMode: 'user' }
const NO_SUPPORT_MESSAGE = 'Face tracking is not supported: missing FaceDetector API or media devices.'

export class FaceTracker {
  private readonly listeners: Set<FaceTrackingListener>
  private readonly options: Required<Pick<FaceTrackerOptions, 'detectionFps' | 'maxDetectedFaces'>> & {
    cameraConstraints: MediaTrackConstraints
  }
  private readonly detectorCtor: FaceDetectorConstructor | null

  private detector: FaceDetectorLike | null
  private session: CameraSession | null
  private loop: DetectionLoop | null
  private running: boolean

  constructor(options: FaceTrackerOptions = {}) {
    this.listeners = new Set()
    this.options = {
      detectionFps: options.detectionFps ?? DEFAULT_DETECTION_FPS,
      maxDetectedFaces: options.maxDetectedFaces ?? DEFAULT_MAX_FACES,
      cameraConstraints: { ...DEFAULT_CONSTRAINTS, ...(options.cameraConstraints ?? {}) }
    }

    this.detectorCtor = resolveFaceDetectorCtor()
    this.detector = null
    this.session = null
    this.loop = null
    this.running = false
  }

  static isSupported(): boolean {
    const hasWindow = typeof window !== 'undefined'
    if (!hasWindow) {
      console.warn('[FaceTracker] window is undefined; expected browser environment.')
      return false
    }

    const hasDetector = isFaceDetectionSupported()
    if (!hasDetector) {
      const hasFaceDetector = Boolean(resolveFaceDetectorCtor())
      if (!hasFaceDetector) {
        console.warn('[FaceTracker] FaceDetector API is unavailable; enable experimental features or use a supported browser.')
      }

      const hasMediaDevices = Boolean(navigator.mediaDevices?.getUserMedia)
      if (!hasMediaDevices) {
        console.warn('[FaceTracker] navigator.mediaDevices.getUserMedia is unavailable; camera access cannot be requested.')
      }
    }

    return hasDetector
  }

  get isRunning(): boolean {
    return this.running
  }

  subscribe(listener: FaceTrackingListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  async start(): Promise<void> {
    if (!this.detectorCtor || !navigator.mediaDevices?.getUserMedia) {
      throw new Error(NO_SUPPORT_MESSAGE)
    }

    if (this.running) {
      return
    }

    if (!this.detector) {
      this.detector = new this.detectorCtor({
        fastMode: true,
        maxDetectedFaces: this.options.maxDetectedFaces
      })
    }

    if (!this.session) {
      this.session = new CameraSession({
        constraints: this.options.cameraConstraints
      })
    }

    const session = this.session
    const detector = this.detector

    await session.open()

    this.loop = new DetectionLoop(detector, this.options.detectionFps, (metric) => {
      this.emit(metric)
    })

    this.loop.start(
      () => session.getVideo(),
      (detection, currentVideo, timestamp) => createMetric(currentVideo, detection, timestamp)
    )

    this.running = true
  }

  stop(): void {
    if (!this.running) {
      return
    }

    if (this.loop) {
      this.loop.stop()
      this.loop = null
    }

    if (this.session) {
      this.session.stop()
    }

    this.running = false
    this.emit(null)
  }

  dispose(): void {
    this.stop()
    this.listeners.clear()
    if (this.session) {
      this.session.dispose()
      this.session = null
    }
    this.detector = null
  }

  private emit(metric: FaceTrackingMetric | null): void {
    for (const listener of this.listeners) {
      try {
        listener(metric)
      } catch (error) {
        console.error('Face tracking listener error', error)
      }
    }
  }
}
