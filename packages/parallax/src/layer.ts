import {
  DEPTH_LEVELS,
  type DepthLevel,
  type LayerUpdateDetail,
  type ParallaxDirection,
  type ParallaxOffsets
} from './types'

export const DEPTH_CLASS_PREFIX = 'parallax-layer--depth-'
export const GENERIC_DEPTH_CLASS_PREFIX = 'depth-'
export const DIRECTION_CLASS_PREFIX = 'parallax-layer--direction-'
export const GENERIC_DIRECTION_CLASS_PREFIX = 'direction-'
const DEPTH_CLASS_NAMES = DEPTH_LEVELS.map((level) => `${DEPTH_CLASS_PREFIX}${level}`)
const GENERIC_DEPTH_CLASS_NAMES = DEPTH_LEVELS.map((level) => `${GENERIC_DEPTH_CLASS_PREFIX}${level}`)
const DIRECTION_CLASS_VALUES: readonly ParallaxDirection[] = ['inverse', 'same']
const DIRECTION_CLASS_NAMES = DIRECTION_CLASS_VALUES.map((value) => `${DIRECTION_CLASS_PREFIX}${value}`)
const GENERIC_DIRECTION_CLASS_NAMES = DIRECTION_CLASS_VALUES.map((value) => `${GENERIC_DIRECTION_CLASS_PREFIX}${value}`)

export interface ParallaxLayerOptions {
  depthAttribute?: string | undefined
  directionAttribute?: string | undefined
}

export class ParallaxLayer extends EventTarget {
  private readonly element: HTMLElement
  private readonly depth: number
  private readonly direction: ParallaxDirection
  private readonly directionMultiplier: number
  private readonly depthAttribute: string | undefined
  private readonly directionAttribute: string | undefined

  constructor(
    element: HTMLElement,
    depth?: number,
    direction?: ParallaxDirection,
    options: ParallaxLayerOptions = {}
  ) {
    super()
    this.element = element
    this.depthAttribute = options.depthAttribute
    this.directionAttribute = options.directionAttribute
    this.depth = depth ?? inferDepthFromElement(element, this.depthAttribute) ?? 1
    this.direction = direction ?? inferDirectionFromElement(element, this.directionAttribute) ?? 'inverse'
    this.directionMultiplier = multiplierForDirection(this.direction)
    this.ensureBaseStyles()
  }

  update(baseOffset: ParallaxOffsets, distance: number): void {
    const scaledOffset: ParallaxOffsets = {
      x: baseOffset.x * this.depth * this.directionMultiplier,
      y: baseOffset.y * this.depth * this.directionMultiplier
    }

    this.element.style.transform = `translate3d(${scaledOffset.x.toFixed(2)}px, ${scaledOffset.y.toFixed(2)}px, 0)`
    const depthLevel = this.applyDistanceState(distance)

    const detail: LayerUpdateDetail = {
      offset: scaledOffset,
      depth: this.depth,
      distance,
      depthLevel,
      direction: this.direction
    }

    const event = new CustomEvent<LayerUpdateDetail>('update', { detail })
    this.dispatchEvent(event)
  }

  reset(): void {
    this.element.style.transform = 'translate3d(0, 0, 0)'
    this.applyDistanceState(0)
  }

  private ensureBaseStyles(): void {
    this.element.classList.add('parallax-layer')
    const style = this.element.style
    if (style.position !== 'absolute') {
      style.position = 'absolute'
    }
    if (!style.willChange) {
      style.willChange = 'transform'
    }
  }

  private applyDistanceState(distance: number): DepthLevel {
    const level = depthLevelFromDistance(distance)
    this.element.classList.remove(
      ...DEPTH_CLASS_NAMES,
      ...GENERIC_DEPTH_CLASS_NAMES,
      ...DIRECTION_CLASS_NAMES,
      ...GENERIC_DIRECTION_CLASS_NAMES
    )
    this.element.classList.add(
      classNameForDepth(level),
      genericDepthClass(level),
      classNameForDirection(this.direction),
      genericDirectionClass(this.direction)
    )
    this.element.setAttribute('data-depth-state', String(level))
    this.element.setAttribute('data-depth-direction', this.direction)
    return level
  }
}

export function depthLevelFromDistance(distance: number): DepthLevel {
  const closeness = clamp(distance, 0, 1)
  const index = Math.round((1 - closeness) * 9)
  return DEPTH_LEVELS[index] ?? DEPTH_LEVELS[DEPTH_LEVELS.length - 1]
}

function classNameForDepth(level: DepthLevel): string {
  return `parallax-layer--depth-${level}`
}

function genericDepthClass(level: DepthLevel): string {
  return `depth-${level}`
}

function classNameForDirection(direction: ParallaxDirection): string {
  return `${DIRECTION_CLASS_PREFIX}${direction}`
}

function genericDirectionClass(direction: ParallaxDirection): string {
  return `${GENERIC_DIRECTION_CLASS_PREFIX}${direction}`
}

function inferDepthFromElement(element: HTMLElement, attribute?: string): number | null {
  const fromAttribute = attribute ? extractDepthFromAttribute(element, attribute) : null
  if (fromAttribute != null) {
    return fromAttribute
  }

  return inferDepthFromClass(element)
}

function inferDepthFromClass(element: HTMLElement): number | null {
  const parallaxDepth = extractDepthFromClasses(element, DEPTH_CLASS_PREFIX)
  if (parallaxDepth != null) {
    return parallaxDepth
  }

  const genericDepth = extractDepthFromClasses(element, GENERIC_DEPTH_CLASS_PREFIX)
  if (genericDepth != null) {
    return genericDepth
  }

  return null
}

function inferDirectionFromElement(element: HTMLElement, attribute?: string): ParallaxDirection | null {
  const fromAttribute = attribute ? extractDirectionFromAttribute(element, attribute) : null
  if (fromAttribute) {
    return fromAttribute
  }

  return inferDirectionFromClass(element)
}

function inferDirectionFromClass(element: HTMLElement): ParallaxDirection | null {
  const parallaxDirection = extractDirectionFromClasses(element, DIRECTION_CLASS_PREFIX)
  if (parallaxDirection) {
    return parallaxDirection
  }

  const genericDirection = extractDirectionFromClasses(element, GENERIC_DIRECTION_CLASS_PREFIX)
  if (genericDirection) {
    return genericDirection
  }

  return null
}

function extractDepthFromClasses(element: HTMLElement, prefix: string): number | null {
  for (const token of element.classList) {
    if (!token.startsWith(prefix)) {
      continue
    }

    const depthValue = Number.parseFloat(token.slice(prefix.length))
    if (Number.isFinite(depthValue)) {
      return depthValue
    }
  }

  return null
}

function extractDirectionFromClasses(element: HTMLElement, prefix: string): ParallaxDirection | null {
  for (const token of element.classList) {
    if (!token.startsWith(prefix)) {
      continue
    }

    const value = token.slice(prefix.length)
    if (isDirectionValue(value)) {
      return value
    }
  }

  return null
}

function extractDepthFromAttribute(element: HTMLElement, attribute: string): number | null {
  if (!element.hasAttribute(attribute)) {
    return null
  }
  const value = element.getAttribute(attribute)
  if (!value) {
    return null
  }
  const depth = Number.parseFloat(value)
  return Number.isFinite(depth) ? depth : null
}

function extractDirectionFromAttribute(element: HTMLElement, attribute: string): ParallaxDirection | null {
  if (!element.hasAttribute(attribute)) {
    return null
  }
  const value = element.getAttribute(attribute)
  if (!value) {
    return null
  }
  return isDirectionValue(value) ? value : null
}

function multiplierForDirection(direction: ParallaxDirection): number {
  return direction === 'inverse' ? 1 : -1
}

function isDirectionValue(value: string): value is ParallaxDirection {
  return value === 'inverse' || value === 'same'
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
