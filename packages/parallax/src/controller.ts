import type { FaceMetric, ParallaxOffsets, Subscribable } from './types'
import { ParallaxLayer } from './layer'

export interface ControllerOptions {
  maxOffsetX?: number
  maxOffsetY?: number
  smoothing?: number
  distanceSmoothing?: number
}

export class FaceParallaxController<TMetric extends FaceMetric>
  implements Subscribable<TMetric>
{
  private readonly tracker: Subscribable<TMetric>
  private readonly baseMaxOffsetX: number
  private readonly baseMaxOffsetY: number
  private maxOffsetX: number
  private maxOffsetY: number
  private readonly smoothing: number
  private readonly distanceSmoothing: number
  private readonly layers = new Set<ParallaxLayer>
  private readonly workingOffset: ParallaxOffsets = { x: 0, y: 0 }
  private readonly targetOffset: ParallaxOffsets = { x: 0, y: 0 }
  private currentDistance = 0
  private targetDistance = 0
  private unsubscribe: (() => void) | null = null

  constructor(tracker: Subscribable<TMetric>, options: ControllerOptions = {}) {
    this.tracker = tracker
    this.baseMaxOffsetX = options.maxOffsetX ?? 240
    this.baseMaxOffsetY = options.maxOffsetY ?? 120
    this.maxOffsetX = this.baseMaxOffsetX
    this.maxOffsetY = this.baseMaxOffsetY
    this.smoothing = options.smoothing ?? 0.22
    this.distanceSmoothing = options.distanceSmoothing ?? 0.2
  }

  addLayer(layer: ParallaxLayer): void {
    this.layers.add(layer)
    layer.reset()
  }

  removeLayer(layer: ParallaxLayer): void {
    this.layers.delete(layer)
  }

  configureBounds(width: number, height: number): void {
    if (!Number.isFinite(width) || !Number.isFinite(height)) {
      this.maxOffsetX = this.baseMaxOffsetX
      this.maxOffsetY = this.baseMaxOffsetY
      return
    }

    const targetX = width * 0.18
    const targetY = height * 0.22
    const minX = Math.max(40, this.baseMaxOffsetX * 0.25)
    const maxX = this.baseMaxOffsetX * 1.6
    const minY = Math.max(28, this.baseMaxOffsetY * 0.25)
    const maxY = this.baseMaxOffsetY * 1.6

    this.maxOffsetX = clamp(targetX, minX, maxX)
    this.maxOffsetY = clamp(targetY, minY, maxY)
  }

  subscribe(listener: (metric: TMetric | null) => void): () => void {
    return this.tracker.subscribe(listener)
  }

  connect(): void {
    if (this.unsubscribe) {
      return
    }

    this.unsubscribe = this.tracker.subscribe((metric) => {
      this.onMetric(metric)
    })
  }

  disconnect(): void {
    if (!this.unsubscribe) {
      return
    }

    this.unsubscribe()
    this.unsubscribe = null
    this.targetOffset.x = 0
    this.targetOffset.y = 0
    this.targetDistance = 0
    this.applyUpdate()
  }

  private onMetric(metric: TMetric | null): void {
    if (!metric) {
      this.targetOffset.x = 0
      this.targetOffset.y = 0
      this.targetDistance = 0
      this.applyUpdate()
      return
    }

    const offsetX = (0.5 - metric.center.x) * this.maxOffsetX
    const offsetY = (metric.center.y - 0.5) * this.maxOffsetY

    this.targetOffset.x = clamp(offsetX, -this.maxOffsetX, this.maxOffsetX)
    this.targetOffset.y = clamp(offsetY, -this.maxOffsetY, this.maxOffsetY)
    this.targetDistance = clamp(metric.relativeBox.width, 0, 1)

    this.applyUpdate()
  }

  private applyUpdate(): void {
    this.workingOffset.x = lerp(this.workingOffset.x, this.targetOffset.x, this.smoothing)
    this.workingOffset.y = lerp(this.workingOffset.y, this.targetOffset.y, this.smoothing)
    this.currentDistance = lerp(this.currentDistance, this.targetDistance, this.distanceSmoothing)

    for (const layer of this.layers) {
      layer.update(this.workingOffset, this.currentDistance)
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount
}
