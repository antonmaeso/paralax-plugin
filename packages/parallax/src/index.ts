export {
  ParallaxLayer,
  depthLevelFromDistance,
  DEPTH_CLASS_PREFIX,
  GENERIC_DEPTH_CLASS_PREFIX,
  DIRECTION_CLASS_PREFIX,
  GENERIC_DIRECTION_CLASS_PREFIX,
  type ParallaxLayerOptions
} from './layer'
export { FaceParallaxController, type ControllerOptions } from './controller'
export {
  initParallaxLayers,
  createParallaxScene,
  type ParallaxAutoInitOptions,
  type ParallaxAutoInstance,
  type ParallaxScene,
  type ParallaxSceneOptions,
  type TrackerInput,
  type MetricAdapter
} from './auto'
export {
  createUseParallaxScene as createReactParallaxHook,
  type ReactHookPrimitives,
  type DependencyList as ReactDependencyList,
  type UseParallaxSceneResult as UseReactParallaxResult
} from './react'
export {
  createUseParallaxScene as createVueParallaxComposable,
  type VueHookPrimitives,
  type UseVueParallaxResult,
  type VueWatchOptions
} from './vue'
export type {
  LayerUpdateDetail,
  DepthLevel,
  ParallaxOffsets,
  ParallaxDirection,
  FaceMetric,
  MetricListener,
  Subscribable
} from './types'
