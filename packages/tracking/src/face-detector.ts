export interface DetectionLandmarkLike {
  readonly locations: ReadonlyArray<DOMPointReadOnly>
  readonly type?: string
}

export interface DetectionLike {
  readonly boundingBox: DOMRectReadOnly
  readonly landmarks?: ReadonlyArray<DetectionLandmarkLike>
}

export interface FaceDetectorOptions {
  fastMode?: boolean
  maxDetectedFaces?: number
}

export type DetectorSource =
  | HTMLVideoElement
  | HTMLImageElement
  | HTMLCanvasElement
  | ImageBitmap
  | OffscreenCanvas
  | ImageData
  | Blob

export interface FaceDetectorLike {
  detect(source: DetectorSource): Promise<DetectionLike[]>
}

export interface FaceDetectorConstructor {
  new (options?: FaceDetectorOptions): FaceDetectorLike
}

declare global {
  interface Window {
    FaceDetector?: FaceDetectorConstructor
  }
}

export function resolveFaceDetectorCtor(): FaceDetectorConstructor | null {
  if (typeof window === 'undefined') {
    return null
  }

  const ctor = window.FaceDetector
  return typeof ctor === 'function' ? ctor : null
}

export function isFaceDetectionSupported(): boolean {
  return Boolean(resolveFaceDetectorCtor() && navigator.mediaDevices?.getUserMedia)
}
