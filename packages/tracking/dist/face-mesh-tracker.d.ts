import type { FaceMeshTrackerOptions, FaceTrackingListener } from './types';
export declare class FaceMeshTracker {
    private readonly listeners;
    private readonly options;
    private session;
    private detector;
    private detectorLoad;
    private running;
    private frameHandle;
    private lastDetectionTimestamp;
    constructor(options?: FaceMeshTrackerOptions);
    static isSupported(): boolean;
    get isRunning(): boolean;
    subscribe(listener: FaceTrackingListener): () => void;
    start(): Promise<void>;
    stop(): void;
    dispose(): void;
    private ensureDetector;
    private scheduleDetection;
    private runDetection;
    private emit;
}
//# sourceMappingURL=face-mesh-tracker.d.ts.map