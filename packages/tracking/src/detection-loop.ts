import type { FaceDetectorLike, DetectionLike } from './face-detector'
import type { FaceTrackingMetric } from './types'

type VideoProvider = () => HTMLVideoElement | null

export type MetricBuilder = (
  detection: DetectionLike,
  video: HTMLVideoElement,
  timestamp: number
) => FaceTrackingMetric | null

export class DetectionLoop {
  private readonly detector: FaceDetectorLike
  private readonly fps: number
  private readonly emit: (metric: FaceTrackingMetric | null) => void
  private active: boolean
  private frameHandle: number | null
  private lastDetectionTimestamp: number

  constructor(
    detector: FaceDetectorLike,
    fps: number,
    emit: (metric: FaceTrackingMetric | null) => void
  ) {
    this.detector = detector
    this.fps = fps
    this.emit = emit
    this.active = false
    this.frameHandle = null
    this.lastDetectionTimestamp = 0
  }

  start(videoProvider: VideoProvider, metricBuilder: MetricBuilder): void {
    if (this.active) {
      return
    }

    this.active = true
    this.lastDetectionTimestamp = 0
    this.schedule(videoProvider, metricBuilder)
  }

  stop(): void {
    this.active = false
    if (this.frameHandle !== null) {
      cancelAnimationFrame(this.frameHandle)
      this.frameHandle = null
    }
  }

  private schedule(videoProvider: VideoProvider, metricBuilder: MetricBuilder): void {
    if (!this.active) {
      return
    }

    this.frameHandle = requestAnimationFrame(() => {
      void this.detect(videoProvider, metricBuilder)
    })
  }

  private async detect(videoProvider: VideoProvider, metricBuilder: MetricBuilder): Promise<void> {
    if (!this.active) {
      return
    }

    const video = videoProvider()
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      this.schedule(videoProvider, metricBuilder)
      return
    }

    const now = performance.now()
    const minInterval = 1000 / this.fps
    if (now - this.lastDetectionTimestamp < minInterval) {
      this.schedule(videoProvider, metricBuilder)
      return
    }

    this.lastDetectionTimestamp = now

    try {
      const detections = await this.detector.detect(video)

      if (!detections.length) {
        this.emit(null)
        this.schedule(videoProvider, metricBuilder)
        return
      }

      const metric = metricBuilder(detections[0], video, now)
      this.emit(metric)
    } catch (error) {
      console.warn('Face detection failed', error)
      this.emit(null)
    }

    this.schedule(videoProvider, metricBuilder)
  }
}
