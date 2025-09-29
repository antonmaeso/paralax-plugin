import { FaceParallaxController, type ControllerOptions } from './controller'
import {
  DEPTH_CLASS_PREFIX,
  GENERIC_DEPTH_CLASS_PREFIX,
  ParallaxLayer,
  type ParallaxLayerOptions
} from './layer'
import type { FaceMetric, Subscribable } from './types'

const DEFAULT_LAYER_ATTRIBUTE = 'data-parallax-layer'
const DEFAULT_BOUND_ATTRIBUTE = 'data-parallax-bound'

export type MetricAdapter = (metric: unknown) => FaceMetric | null

interface TrackerLifecycle {
  start?: () => Promise<void> | void
  stop?: () => void
  dispose?: () => void
  isRunning?: () => boolean
}

interface TrackerLike extends TrackerLifecycle {
  subscribe(listener: (metric: unknown | null) => void): () => void
}

export type TrackerInput = TrackerLike | Subscribable<FaceMetric>

interface NormalisedTracker {
  subscribable: Subscribable<FaceMetric>
  lifecycle: TrackerLifecycle
}

interface LayerDetectionConfig {
  selector: string | false
  layerAttribute?: string | undefined
  depthAttribute?: string | undefined
  depthClassPrefix: string
  genericDepthClassPrefix: string
}

export interface ParallaxSceneOptions {
  tracker: TrackerInput
  root?: ParentNode | Document | DocumentFragment | string | null
  selector?: string | false | undefined
  layerAttribute?: string | false | undefined
  boundAttribute?: string | undefined
  depthAttribute?: string | undefined
  directionAttribute?: string | undefined
  depthClassPrefix?: string | undefined
  genericDepthClassPrefix?: string | undefined
  observeMutations?: boolean | undefined
  autoStart?: boolean | undefined
  updateBoundsOnResize?: boolean | undefined
  controller?: FaceParallaxController<FaceMetric> | undefined
  controllerOptions?: ControllerOptions | undefined
  metricAdapter?: MetricAdapter | undefined
  maxOffsetX?: number | undefined
  maxOffsetY?: number | undefined
  smoothing?: number | undefined
  distanceSmoothing?: number | undefined
}

export interface ParallaxScene {
  controller: FaceParallaxController<FaceMetric>
  layers: ReadonlySet<ParallaxLayer>
  root: ParentNode | Document | DocumentFragment
  refresh(): void
  start(): Promise<void>
  stop(): void
  destroy(): void
  isRunning(): boolean
}

export interface ParallaxAutoInitOptions
  extends Omit<ParallaxSceneOptions, 'autoStart' | 'metricAdapter'> {
  autoConnect?: boolean
  metricAdapter?: MetricAdapter
}

export interface ParallaxAutoInstance {
  controller: FaceParallaxController<FaceMetric>
  layers: ReadonlySet<ParallaxLayer>
  root: ParentNode | Document | DocumentFragment
  refresh(): void
  start(): Promise<void>
  stop(): void
  disconnect(): void
  destroy(): void
  isRunning(): boolean
}

export function createParallaxScene(options: ParallaxSceneOptions): ParallaxScene {
  if (typeof document === 'undefined') {
    return createServerScene(options)
  }

  const rootNode = resolveRoot(options.root)
  const depthClassPrefix = options.depthClassPrefix ?? DEPTH_CLASS_PREFIX
  const genericDepthClassPrefix = options.genericDepthClassPrefix ?? GENERIC_DEPTH_CLASS_PREFIX
  const layerAttribute = options.layerAttribute === false ? undefined : options.layerAttribute ?? DEFAULT_LAYER_ATTRIBUTE
  const boundAttribute = options.boundAttribute ?? DEFAULT_BOUND_ATTRIBUTE
  const detection: LayerDetectionConfig = {
    selector:
      options.selector === false
        ? false
        : options.selector ?? buildDefaultSelector(layerAttribute, depthClassPrefix, genericDepthClassPrefix),
    layerAttribute,
    depthAttribute: options.depthAttribute,
    depthClassPrefix,
    genericDepthClassPrefix
  }

  const layerOptions: ParallaxLayerOptions = {
    depthAttribute: options.depthAttribute,
    directionAttribute: options.directionAttribute
  }

  const tracker = normaliseTracker(options.tracker, options.metricAdapter)
  const controllerOptions = resolveControllerOptions(options)
  const controller =
    options.controller ?? new FaceParallaxController(tracker.subscribable, controllerOptions)
  const ownsController = !options.controller

  const elementToLayer = new Map<HTMLElement, ParallaxLayer>()
  const registeredLayers = new Set<ParallaxLayer>()

  const bindElement = (element: HTMLElement): void => {
    if (elementToLayer.has(element)) {
      return
    }
    if (!isLayerCandidate(element, detection)) {
      return
    }

    const layer = new ParallaxLayer(element, undefined, undefined, layerOptions)
    controller.addLayer(layer)
    elementToLayer.set(element, layer)
    registeredLayers.add(layer)
    element.setAttribute(boundAttribute, 'true')
  }

  const unbindElement = (element: HTMLElement): void => {
    const layer = elementToLayer.get(element)
    if (!layer) {
      return
    }

    controller.removeLayer(layer)
    elementToLayer.delete(element)
    registeredLayers.delete(layer)
    element.removeAttribute(boundAttribute)
  }

  const refresh = (): void => {
    const candidates = collectCandidates(rootNode, detection)
    for (const candidate of candidates) {
      bindElement(candidate)
    }
  }

  const configureBoundsForRoot = (): void => {
    if (typeof window === 'undefined') {
      return
    }

    if (rootNode instanceof Element) {
      const rect = rootNode.getBoundingClientRect()
      controller.configureBounds(rect.width, rect.height)
      return
    }

    controller.configureBounds(window.innerWidth, window.innerHeight)
  }

  refresh()
  configureBoundsForRoot()

  let disconnectResize: (() => void) | null = null
  if (options.updateBoundsOnResize ?? true) {
    if (typeof window !== 'undefined') {
      const handleResize = () => configureBoundsForRoot()
      window.addEventListener('resize', handleResize)
      disconnectResize = () => window.removeEventListener('resize', handleResize)
    }
  }

  let observer: MutationObserver | null = null
  if (options.observeMutations ?? false) {
    if (typeof MutationObserver !== 'undefined') {
      observer = new MutationObserver((records) => {
        for (const record of records) {
          for (const added of record.addedNodes) {
            for (const element of collectCandidates(added, detection)) {
              bindElement(element)
            }
          }
          for (const removed of record.removedNodes) {
            for (const element of collectBoundElements(removed, boundAttribute, elementToLayer)) {
              unbindElement(element)
            }
          }
        }
      })

      if (rootNode instanceof Node) {
        observer.observe(rootNode, { childList: true, subtree: true })
      }
    }
  }

  let running = false
  let pendingStart: Promise<void> | null = null
  let startToken = 0

  const start = async (): Promise<void> => {
    if (running) {
      return
    }

    const token = ++startToken

    if (pendingStart) {
      return pendingStart
    }

    pendingStart = (async () => {
      try {
        if (tracker.lifecycle.start) {
          await tracker.lifecycle.start()
        }
        if (token !== startToken) {
          return
        }
        controller.connect()
        running = true
      } finally {
        pendingStart = null
      }
    })()

    return pendingStart
  }

  const stop = (): void => {
    startToken++

    if (!running && !pendingStart && !tracker.lifecycle.stop) {
      return
    }

    controller.disconnect()

    try {
      tracker.lifecycle.stop?.()
    } finally {
      running = false
    }
  }

  const destroy = (): void => {
    stop()

    observer?.disconnect()
    observer = null

    disconnectResize?.()
    disconnectResize = null

    for (const element of Array.from(elementToLayer.keys())) {
      unbindElement(element)
    }

    if (ownsController) {
      controller.disconnect()
    }

    tracker.lifecycle.dispose?.()
  }

  if (options.autoStart ?? true) {
    void start()
  }

  return {
    controller,
    layers: registeredLayers,
    root: rootNode,
    refresh,
    start,
    stop,
    destroy,
    isRunning: () => running
  }
}

export function initParallaxLayers(options: ParallaxAutoInitOptions): ParallaxAutoInstance {
  const scene = createParallaxScene({
    tracker: options.tracker,
    root: options.root ?? null,
    selector: options.selector,
    layerAttribute: options.layerAttribute,
    boundAttribute: options.boundAttribute,
    depthAttribute: options.depthAttribute,
    directionAttribute: options.directionAttribute,
    depthClassPrefix: options.depthClassPrefix,
    genericDepthClassPrefix: options.genericDepthClassPrefix,
    observeMutations: options.observeMutations,
    autoStart: options.autoConnect ?? true,
    updateBoundsOnResize: options.updateBoundsOnResize,
    controller: options.controller,
    controllerOptions: options.controllerOptions,
    metricAdapter: options.metricAdapter,
    maxOffsetX: options.maxOffsetX,
    maxOffsetY: options.maxOffsetY,
    smoothing: options.smoothing,
    distanceSmoothing: options.distanceSmoothing
  })

  return {
    controller: scene.controller,
    layers: scene.layers,
    root: scene.root,
    refresh: scene.refresh,
    start: scene.start,
    stop: scene.stop,
    disconnect: scene.stop,
    destroy: scene.destroy,
    isRunning: scene.isRunning
  }
}

function createServerScene(options: ParallaxSceneOptions): ParallaxScene {
  const passiveTracker: Subscribable<FaceMetric> = {
    subscribe: () => () => {}
  }
  const controller =
    options.controller ?? new FaceParallaxController(passiveTracker, resolveControllerOptions(options))
  const ownsController = !options.controller

  return {
    controller,
    layers: new Set<ParallaxLayer>(),
    root: options.root && typeof options.root !== 'string' ? options.root : ({} as Document),
    refresh: () => {},
    start: async () => {
      if (ownsController) {
        controller.connect()
      }
    },
    stop: () => {
      if (ownsController) {
        controller.disconnect()
      }
    },
    destroy: () => {
      if (ownsController) {
        controller.disconnect()
      }
    },
    isRunning: () => false
  }
}

function resolveRoot(
  root: ParallaxSceneOptions['root']
): ParentNode | Document | DocumentFragment {
  if (root == null) {
    return document
  }

  if (typeof root === 'string') {
    const resolved = document.querySelector(root)
    if (!resolved) {
      throw new Error(`[parallax] Unable to find root element for selector "${root}".`)
    }
    return resolved
  }

  return root
}

function normaliseTracker(tracker: TrackerInput, adapter?: MetricAdapter): NormalisedTracker {
  const lifecycle = resolveLifecycle(tracker)

  const subscribable: Subscribable<FaceMetric> = {
    subscribe(listener) {
      const unsubscribe = (tracker as TrackerLike).subscribe((raw) => {
        if (raw == null) {
          listener(null)
          return
        }

        const adapted = adapter ? safeAdapt(adapter, raw) : null
        const metric = adapted ?? coerceFaceMetric(raw)
        if (!metric) {
          if (typeof console !== 'undefined' && console.warn) {
            console.warn('[parallax] Ignoring tracker metric that cannot be normalised.', raw)
          }
          return
        }

        listener(metric)
      })

      return unsubscribe
    }
  }

  return { subscribable, lifecycle }
}

function safeAdapt(adapter: MetricAdapter, metric: unknown): FaceMetric | null {
  try {
    return adapter(metric)
  } catch (error) {
    if (typeof console !== 'undefined' && console.error) {
      console.error('[parallax] metricAdapter threw an error. Ignoring metric.', error)
    }
  }
  return null
}

function resolveLifecycle(source: TrackerInput): TrackerLifecycle {
  const lifecycle: TrackerLifecycle = {}
  const candidate = source as TrackerLike & { isRunning?: (() => boolean) | boolean }

  if (typeof candidate.start === 'function') {
    lifecycle.start = candidate.start.bind(candidate)
  }
  if (typeof candidate.stop === 'function') {
    lifecycle.stop = candidate.stop.bind(candidate)
  }
  if (typeof candidate.dispose === 'function') {
    lifecycle.dispose = candidate.dispose.bind(candidate)
  }
  if (typeof candidate.isRunning === 'function') {
    const fn = candidate.isRunning.bind(candidate) as () => unknown
    lifecycle.isRunning = () => Boolean(fn())
  } else if (candidate.isRunning !== undefined) {
    const holder = candidate as unknown as { isRunning?: unknown }
    lifecycle.isRunning = () => Boolean(holder.isRunning)
  }

  return lifecycle
}

function coerceFaceMetric(metric: unknown): FaceMetric | null {
  if (!metric || typeof metric !== 'object') {
    return null
  }

  const candidate = metric as {
    center?: { x?: unknown; y?: unknown }
    relativeBox?: { width?: unknown }
  }

  const center = candidate.center
  const relativeBox = candidate.relativeBox

  if (
    center &&
    typeof center.x === 'number' &&
    typeof center.y === 'number' &&
    relativeBox &&
    typeof relativeBox.width === 'number'
  ) {
    return {
      center: { x: center.x, y: center.y },
      relativeBox: { width: relativeBox.width }
    }
  }

  return null
}

function resolveControllerOptions(options: ParallaxSceneOptions): ControllerOptions | undefined {
  if (options.controllerOptions) {
    return options.controllerOptions
  }

  const hasOverrides =
    options.maxOffsetX !== undefined ||
    options.maxOffsetY !== undefined ||
    options.smoothing !== undefined ||
    options.distanceSmoothing !== undefined

  if (!hasOverrides) {
    return undefined
  }

  const overrides: ControllerOptions = {}
  if (options.maxOffsetX !== undefined) {
    overrides.maxOffsetX = options.maxOffsetX
  }
  if (options.maxOffsetY !== undefined) {
    overrides.maxOffsetY = options.maxOffsetY
  }
  if (options.smoothing !== undefined) {
    overrides.smoothing = options.smoothing
  }
  if (options.distanceSmoothing !== undefined) {
    overrides.distanceSmoothing = options.distanceSmoothing
  }

  return overrides
}

function buildDefaultSelector(
  layerAttribute: string | undefined,
  depthClassPrefix: string,
  genericDepthClassPrefix: string
): string {
  const selectors: string[] = []
  if (layerAttribute) {
    selectors.push(`[${layerAttribute}]`)
  }
  selectors.push(`[class*="${depthClassPrefix}"]`)
  if (genericDepthClassPrefix && genericDepthClassPrefix !== depthClassPrefix) {
    selectors.push(`[class*="${genericDepthClassPrefix}"]`)
  }
  return selectors.join(', ')
}

function collectCandidates(
  node: ParentNode | Document | DocumentFragment | Node,
  detection: LayerDetectionConfig
): HTMLElement[] {
  const selector = detection.selector
  const elements: HTMLElement[] = []

  if (node instanceof HTMLElement) {
    if (isLayerCandidate(node, detection)) {
      elements.push(node)
    }
    if (selector) {
      elements.push(...node.querySelectorAll<HTMLElement>(selector))
    }
    return dedupe(elements)
  }

  if (selector && (node instanceof Document || node instanceof DocumentFragment)) {
    elements.push(...node.querySelectorAll<HTMLElement>(selector))
  }

  return dedupe(elements.filter((element) => isLayerCandidate(element, detection)))
}

function collectBoundElements(
  node: Node,
  boundAttribute: string,
  lookup: Map<HTMLElement, ParallaxLayer>
): HTMLElement[] {
  const elements: HTMLElement[] = []

  if (node instanceof HTMLElement) {
    if (lookup.has(node)) {
      elements.push(node)
    }
    elements.push(...node.querySelectorAll<HTMLElement>(`[${boundAttribute}]`))
  } else if (node instanceof DocumentFragment) {
    elements.push(...node.querySelectorAll<HTMLElement>(`[${boundAttribute}]`))
  }

  return elements.filter((element) => lookup.has(element))
}

function isLayerCandidate(element: Element, detection: LayerDetectionConfig): element is HTMLElement {
  if (!(element instanceof HTMLElement)) {
    return false
  }

  if (detection.layerAttribute && element.hasAttribute(detection.layerAttribute)) {
    return true
  }

  if (detection.depthAttribute && element.hasAttribute(detection.depthAttribute)) {
    return true
  }

  for (const token of element.classList) {
    if (token.startsWith(detection.depthClassPrefix) || token.startsWith(detection.genericDepthClassPrefix)) {
      return true
    }
  }

  return false
}

function dedupe(elements: Iterable<HTMLElement>): HTMLElement[] {
  const seen = new Set<HTMLElement>()
  const result: HTMLElement[] = []
  for (const element of elements) {
    if (seen.has(element)) {
      continue
    }
    seen.add(element)
    result.push(element)
  }
  return result
}
