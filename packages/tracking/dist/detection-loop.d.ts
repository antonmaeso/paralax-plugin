import type { FaceDetectorLike, DetectionLike } from './face-detector';
import type { FaceTrackingMetric } from './types';
type VideoProvider = () => HTMLVideoElement | null;
export type MetricBuilder = (detection: DetectionLike, video: HTMLVideoElement, timestamp: number) => FaceTrackingMetric | null;
export declare class DetectionLoop {
    private readonly detector;
    private readonly fps;
    private readonly emit;
    private active;
    private frameHandle;
    private lastDetectionTimestamp;
    constructor(detector: FaceDetectorLike, fps: number, emit: (metric: FaceTrackingMetric | null) => void);
    start(videoProvider: VideoProvider, metricBuilder: MetricBuilder): void;
    stop(): void;
    private schedule;
    private detect;
}
export {};
//# sourceMappingURL=detection-loop.d.ts.map