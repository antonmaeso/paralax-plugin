import { CameraSession } from './camera-session'
import type {
  FaceMeshTrackerOptions,
  FaceTrackingListener,
  FaceTrackingMetric,
  NormalizedPoint
} from './types'

const DEFAULT_DETECTION_FPS = 15
const DEFAULT_MAX_FACES = 1
const DEFAULT_CONSTRAINTS: MediaTrackConstraints = { facingMode: 'user' }

const NO_SUPPORT_MESSAGE =
  'Face mesh tracking is not supported: missing MediaDevices API or WebGL backend.'

type FaceLandmarksModule = typeof import('@tensorflow-models/face-landmarks-detection')
type FaceLandmarksDetector = import('@tensorflow-models/face-landmarks-detection').FaceLandmarksDetector
type Face = import('@tensorflow-models/face-landmarks-detection').Face
type TfjsModelConfig = import('@tensorflow-models/face-landmarks-detection').MediaPipeFaceMeshTfjsModelConfig

let tfReadyPromise: Promise<void> | null = null
let faceMeshModulePromise: Promise<FaceLandmarksModule> | null = null

async function ensureTensorflowBackend(): Promise<void> {
  if (!tfReadyPromise) {
    tfReadyPromise = (async () => {
      const tf = await import('@tensorflow/tfjs-core')
      await Promise.all([import('@tensorflow/tfjs-converter'), import('@tensorflow/tfjs-backend-webgl')])
      try {
        if (tf.getBackend() !== 'webgl') {
          await tf.setBackend('webgl')
        }
      } catch (error) {
        console.warn('[FaceMeshTracker] Failed to set WebGL backend, continuing with default backend.', error)
      }
      await tf.ready()
    })()
  }

  await tfReadyPromise
}

async function loadFaceMeshModule(): Promise<FaceLandmarksModule> {
  if (!faceMeshModulePromise) {
    faceMeshModulePromise = (async () => {
      await ensureTensorflowBackend()
      return import('@tensorflow-models/face-landmarks-detection')
    })()
  }

  return faceMeshModulePromise
}

export class FaceMeshTracker {
  private readonly listeners: Set<FaceTrackingListener>
  private readonly options: Required<
    Pick<FaceMeshTrackerOptions, 'detectionFps' | 'maxFaces' | 'refineLandmarks'>
  > & { cameraConstraints: MediaTrackConstraints }
  private session: CameraSession | null
  private detector: FaceLandmarksDetector | null
  private detectorLoad: Promise<FaceLandmarksDetector> | null
  private running: boolean
  private frameHandle: number | null
  private lastDetectionTimestamp: number

  constructor(options: FaceMeshTrackerOptions = {}) {
    this.listeners = new Set()
    this.options = {
      detectionFps: options.detectionFps ?? DEFAULT_DETECTION_FPS,
      maxFaces: options.maxFaces ?? DEFAULT_MAX_FACES,
      refineLandmarks: options.refineLandmarks ?? false,
      cameraConstraints: { ...DEFAULT_CONSTRAINTS, ...(options.cameraConstraints ?? {}) }
    }
    this.session = null
    this.detector = null
    this.detectorLoad = null
    this.running = false
    this.frameHandle = null
    this.lastDetectionTimestamp = 0
  }

  static isSupported(): boolean {
    const hasWindow = typeof window !== 'undefined'
    if (!hasWindow) {
      return false
    }

    const hasMediaDevices = Boolean(navigator.mediaDevices?.getUserMedia)
    if (!hasMediaDevices) {
      return false
    }

    const hasWebGL = (() => {
      if (typeof document === 'undefined') {
        return false
      }

      try {
        const canvas = document.createElement('canvas')
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
        return Boolean(gl)
      } catch (_error) {
        return false
      }
    })()

    return hasWebGL
  }

  get isRunning(): boolean {
    return this.running
  }

  subscribe(listener: FaceTrackingListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  async start(): Promise<void> {
    if (!FaceMeshTracker.isSupported()) {
      throw new Error(NO_SUPPORT_MESSAGE)
    }

    if (this.running) {
      return
    }

    const session = this.session ?? new CameraSession({
      constraints: this.options.cameraConstraints
    })
    this.session = session

    await session.open()
    await this.ensureDetector()

    this.running = true
    this.lastDetectionTimestamp = 0
    this.scheduleDetection()
  }

  stop(): void {
    if (!this.running) {
      return
    }

    this.running = false
    if (this.frameHandle !== null) {
      cancelAnimationFrame(this.frameHandle)
      this.frameHandle = null
    }

    this.emit(null)
    this.session?.stop()
  }

  dispose(): void {
    this.stop()
    this.listeners.clear()
    this.detector?.dispose()
    this.detector = null
    this.detectorLoad = null
    if (this.session) {
      this.session.dispose()
      this.session = null
    }
  }

  private async ensureDetector(): Promise<void> {
    if (this.detector) {
      return
    }

    if (!this.detectorLoad) {
      this.detectorLoad = (async () => {
        const module = await loadFaceMeshModule()
        const config: TfjsModelConfig = {
          runtime: 'tfjs',
          refineLandmarks: this.options.refineLandmarks,
          maxFaces: this.options.maxFaces
        }
        return module.createDetector(module.SupportedModels.MediaPipeFaceMesh, config)
      })()
    }

    this.detector = await this.detectorLoad
  }

  private scheduleDetection(): void {
    if (!this.running) {
      return
    }

    this.frameHandle = requestAnimationFrame(() => {
      void this.runDetection()
    })
  }

  private async runDetection(): Promise<void> {
    if (!this.running) {
      return
    }

    const detector = this.detector
    if (!detector) {
      this.scheduleDetection()
      return
    }

    const video = this.session?.getVideo()
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      this.scheduleDetection()
      return
    }

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
    const minInterval = 1000 / this.options.detectionFps
    if (now - this.lastDetectionTimestamp < minInterval) {
      this.scheduleDetection()
      return
    }

    this.lastDetectionTimestamp = now

    try {
      const faces = await detector.estimateFaces(video, {
        flipHorizontal: true,
        staticImageMode: false
      })

      if (!faces.length) {
        this.emit(null)
        this.scheduleDetection()
        return
      }

      const metric = createMetricFromFace(faces[0], video, now)
      this.emit(metric)
    } catch (error) {
      console.warn('[FaceMeshTracker] Detection error', error)
      this.emit(null)
    }

    this.scheduleDetection()
  }

  private emit(metric: FaceTrackingMetric | null): void {
    for (const listener of this.listeners) {
      try {
        listener(metric)
      } catch (error) {
        console.error('[FaceMeshTracker] listener error', error)
      }
    }
  }
}

function createMetricFromFace(face: Face, video: HTMLVideoElement, timestamp: number): FaceTrackingMetric {
  const videoWidth = video.videoWidth || video.width || 1
  const videoHeight = video.videoHeight || video.height || 1

  const box = face.box
  const xMin = box.xMin ?? 0
  const xMax = box.xMax ?? xMin
  const yMin = box.yMin ?? 0
  const yMax = box.yMax ?? yMin
  const width = Math.max(0, xMax - xMin)
  const height = Math.max(0, yMax - yMin)
  const centerX = xMin + width / 2
  const centerY = yMin + height / 2

  const normalize = (value: number, max: number): number => {
    if (!Number.isFinite(value) || max <= 0) {
      return 0
    }
    return clamp(value / max, 0, 1)
  }

  const relativeBox = {
    x: normalize(xMin, videoWidth),
    y: normalize(yMin, videoHeight),
    width: normalize(width, videoWidth),
    height: normalize(height, videoHeight)
  }

  const center: NormalizedPoint = {
    x: normalize(centerX, videoWidth),
    y: normalize(centerY, videoHeight)
  }

  return {
    timestamp,
    box: {
      x: xMin,
      y: yMin,
      width,
      height
    },
    relativeBox,
    center,
    landmarks: [],
    eyes: {}
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
