import { type DepthLevel, type ParallaxDirection, type ParallaxOffsets } from './types';
export declare const DEPTH_CLASS_PREFIX = "parallax-layer--depth-";
export declare const GENERIC_DEPTH_CLASS_PREFIX = "depth-";
export declare const DIRECTION_CLASS_PREFIX = "parallax-layer--direction-";
export declare const GENERIC_DIRECTION_CLASS_PREFIX = "direction-";
export interface ParallaxLayerOptions {
    depthAttribute?: string | undefined;
    directionAttribute?: string | undefined;
}
export declare class ParallaxLayer extends EventTarget {
    private readonly element;
    private readonly depth;
    private readonly direction;
    private readonly directionMultiplier;
    private readonly depthAttribute;
    private readonly directionAttribute;
    constructor(element: HTMLElement, depth?: number, direction?: ParallaxDirection, options?: ParallaxLayerOptions);
    update(baseOffset: ParallaxOffsets, distance: number): void;
    reset(): void;
    private ensureBaseStyles;
    private applyDistanceState;
}
export declare function depthLevelFromDistance(distance: number): DepthLevel;
//# sourceMappingURL=layer.d.ts.map