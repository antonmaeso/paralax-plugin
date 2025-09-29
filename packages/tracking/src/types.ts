export interface FaceTrackerOptions {
  maxDetectedFaces?: number
  detectionFps?: number
  cameraConstraints?: MediaTrackConstraints
}

export interface FaceMeshTrackerOptions {
  detectionFps?: number
  maxFaces?: number
  refineLandmarks?: boolean
  cameraConstraints?: MediaTrackConstraints
}

export interface NormalizedPoint {
  x: number
  y: number
}

export interface FaceTrackingMetric {
  timestamp: number
  box: {
    x: number
    y: number
    width: number
    height: number
  }
  relativeBox: {
    x: number
    y: number
    width: number
    height: number
  }
  center: NormalizedPoint
  landmarks: ReadonlyArray<{
    type?: string
    points: ReadonlyArray<NormalizedPoint>
  }>
  eyes: {
    left?: NormalizedPoint
    right?: NormalizedPoint
  }
}

export type FaceTrackingListener = (metric: FaceTrackingMetric | null) => void

export interface MouseTrackerOptions {
  element?: HTMLElement | Window
  smoothing?: number
  depthStrategy?: 'constant' | 'radial'
  constantDepth?: number
  radialDepth?: {
    near: number
    far: number
  }
}
