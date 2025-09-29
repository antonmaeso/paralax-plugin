import type { FaceMetric, Subscribable } from './types';
import { ParallaxLayer } from './layer';
export interface ControllerOptions {
    maxOffsetX?: number;
    maxOffsetY?: number;
    smoothing?: number;
    distanceSmoothing?: number;
}
export declare class FaceParallaxController<TMetric extends FaceMetric> implements Subscribable<TMetric> {
    private readonly tracker;
    private readonly baseMaxOffsetX;
    private readonly baseMaxOffsetY;
    private maxOffsetX;
    private maxOffsetY;
    private readonly smoothing;
    private readonly distanceSmoothing;
    private readonly layers;
    private readonly workingOffset;
    private readonly targetOffset;
    private currentDistance;
    private targetDistance;
    private unsubscribe;
    constructor(tracker: Subscribable<TMetric>, options?: ControllerOptions);
    addLayer(layer: ParallaxLayer): void;
    removeLayer(layer: ParallaxLayer): void;
    configureBounds(width: number, height: number): void;
    subscribe(listener: (metric: TMetric | null) => void): () => void;
    connect(): void;
    disconnect(): void;
    private onMetric;
    private applyUpdate;
}
//# sourceMappingURL=controller.d.ts.map