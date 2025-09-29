import type { FaceTrackerOptions, FaceTrackingListener } from './types';
export declare class FaceTracker {
    private readonly listeners;
    private readonly options;
    private readonly detectorCtor;
    private detector;
    private session;
    private loop;
    private running;
    constructor(options?: FaceTrackerOptions);
    static isSupported(): boolean;
    get isRunning(): boolean;
    subscribe(listener: FaceTrackingListener): () => void;
    start(): Promise<void>;
    stop(): void;
    dispose(): void;
    private emit;
}
//# sourceMappingURL=face-tracker.d.ts.map