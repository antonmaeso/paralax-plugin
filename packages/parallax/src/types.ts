export interface ParallaxOffsets {
  x: number
  y: number
}

export const DEPTH_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const
export type DepthLevel = (typeof DEPTH_LEVELS)[number]
export type ParallaxDirection = 'inverse' | 'same'

export interface LayerUpdateDetail {
  offset: ParallaxOffsets
  depth: number
  distance: number
  depthLevel: DepthLevel
  direction: ParallaxDirection
}

export type FaceMetric = {
  center: { x: number; y: number }
  relativeBox: { width: number }
}

export type MetricListener<TMetric> = (metric: TMetric | null) => void

export interface Subscribable<TMetric> {
  subscribe(listener: MetricListener<TMetric>): () => void
}
