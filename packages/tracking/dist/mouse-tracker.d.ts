import type { FaceTrackingListener, MouseTrackerOptions } from './types';
export declare class MouseTracker {
    private readonly listeners;
    private readonly config;
    private running;
    private usingPointerEvents;
    private currentCenterX;
    private currentCenterY;
    private currentDepth;
    constructor(options?: MouseTrackerOptions);
    static isSupported(): boolean;
    get isRunning(): boolean;
    subscribe(listener: FaceTrackingListener): () => void;
    start(): Promise<void>;
    stop(): void;
    dispose(): void;
    private readonly onPointerMove;
    private readonly onPointerLeave;
    private computeDepth;
    private emit;
}
//# sourceMappingURL=mouse-tracker.d.ts.map