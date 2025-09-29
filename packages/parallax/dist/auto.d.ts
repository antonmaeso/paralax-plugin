import { FaceParallaxController, type ControllerOptions } from './controller';
import { ParallaxLayer } from './layer';
import type { FaceMetric, Subscribable } from './types';
export type MetricAdapter = (metric: unknown) => FaceMetric | null;
interface TrackerLifecycle {
    start?: () => Promise<void> | void;
    stop?: () => void;
    dispose?: () => void;
    isRunning?: () => boolean;
}
interface TrackerLike extends TrackerLifecycle {
    subscribe(listener: (metric: unknown | null) => void): () => void;
}
export type TrackerInput = TrackerLike | Subscribable<FaceMetric>;
export interface ParallaxSceneOptions {
    tracker: TrackerInput;
    root?: ParentNode | Document | DocumentFragment | string | null;
    selector?: string | false | undefined;
    layerAttribute?: string | false | undefined;
    boundAttribute?: string | undefined;
    depthAttribute?: string | undefined;
    directionAttribute?: string | undefined;
    depthClassPrefix?: string | undefined;
    genericDepthClassPrefix?: string | undefined;
    observeMutations?: boolean | undefined;
    autoStart?: boolean | undefined;
    updateBoundsOnResize?: boolean | undefined;
    controller?: FaceParallaxController<FaceMetric> | undefined;
    controllerOptions?: ControllerOptions | undefined;
    metricAdapter?: MetricAdapter | undefined;
    maxOffsetX?: number | undefined;
    maxOffsetY?: number | undefined;
    smoothing?: number | undefined;
    distanceSmoothing?: number | undefined;
}
export interface ParallaxScene {
    controller: FaceParallaxController<FaceMetric>;
    layers: ReadonlySet<ParallaxLayer>;
    root: ParentNode | Document | DocumentFragment;
    refresh(): void;
    start(): Promise<void>;
    stop(): void;
    destroy(): void;
    isRunning(): boolean;
}
export interface ParallaxAutoInitOptions extends Omit<ParallaxSceneOptions, 'autoStart' | 'metricAdapter'> {
    autoConnect?: boolean;
    metricAdapter?: MetricAdapter;
}
export interface ParallaxAutoInstance {
    controller: FaceParallaxController<FaceMetric>;
    layers: ReadonlySet<ParallaxLayer>;
    root: ParentNode | Document | DocumentFragment;
    refresh(): void;
    start(): Promise<void>;
    stop(): void;
    disconnect(): void;
    destroy(): void;
    isRunning(): boolean;
}
export declare function createParallaxScene(options: ParallaxSceneOptions): ParallaxScene;
export declare function initParallaxLayers(options: ParallaxAutoInitOptions): ParallaxAutoInstance;
export {};
//# sourceMappingURL=auto.d.ts.map