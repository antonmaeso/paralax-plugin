import { CameraSession } from './camera-session';
import { DetectionLoop } from './detection-loop';
import { createMetric } from './metric-factory';
import { isFaceDetectionSupported, resolveFaceDetectorCtor } from './face-detector';
const DEFAULT_DETECTION_FPS = 15;
const DEFAULT_MAX_FACES = 1;
const DEFAULT_CONSTRAINTS = { facingMode: 'user' };
const NO_SUPPORT_MESSAGE = 'Face tracking is not supported: missing FaceDetector API or media devices.';
export class FaceTracker {
    listeners;
    options;
    detectorCtor;
    detector;
    session;
    loop;
    running;
    constructor(options = {}) {
        this.listeners = new Set();
        this.options = {
            detectionFps: options.detectionFps ?? DEFAULT_DETECTION_FPS,
            maxDetectedFaces: options.maxDetectedFaces ?? DEFAULT_MAX_FACES,
            cameraConstraints: { ...DEFAULT_CONSTRAINTS, ...(options.cameraConstraints ?? {}) }
        };
        this.detectorCtor = resolveFaceDetectorCtor();
        this.detector = null;
        this.session = null;
        this.loop = null;
        this.running = false;
    }
    static isSupported() {
        const hasWindow = typeof window !== 'undefined';
        if (!hasWindow) {
            console.warn('[FaceTracker] window is undefined; expected browser environment.');
            return false;
        }
        const hasDetector = isFaceDetectionSupported();
        if (!hasDetector) {
            const hasFaceDetector = Boolean(resolveFaceDetectorCtor());
            if (!hasFaceDetector) {
                console.warn('[FaceTracker] FaceDetector API is unavailable; enable experimental features or use a supported browser.');
            }
            const hasMediaDevices = Boolean(navigator.mediaDevices?.getUserMedia);
            if (!hasMediaDevices) {
                console.warn('[FaceTracker] navigator.mediaDevices.getUserMedia is unavailable; camera access cannot be requested.');
            }
        }
        return hasDetector;
    }
    get isRunning() {
        return this.running;
    }
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    async start() {
        if (!this.detectorCtor || !navigator.mediaDevices?.getUserMedia) {
            throw new Error(NO_SUPPORT_MESSAGE);
        }
        if (this.running) {
            return;
        }
        if (!this.detector) {
            this.detector = new this.detectorCtor({
                fastMode: true,
                maxDetectedFaces: this.options.maxDetectedFaces
            });
        }
        if (!this.session) {
            this.session = new CameraSession({
                constraints: this.options.cameraConstraints
            });
        }
        const session = this.session;
        const detector = this.detector;
        await session.open();
        this.loop = new DetectionLoop(detector, this.options.detectionFps, (metric) => {
            this.emit(metric);
        });
        this.loop.start(() => session.getVideo(), (detection, currentVideo, timestamp) => createMetric(currentVideo, detection, timestamp));
        this.running = true;
    }
    stop() {
        if (!this.running) {
            return;
        }
        if (this.loop) {
            this.loop.stop();
            this.loop = null;
        }
        if (this.session) {
            this.session.stop();
        }
        this.running = false;
        this.emit(null);
    }
    dispose() {
        this.stop();
        this.listeners.clear();
        if (this.session) {
            this.session.dispose();
            this.session = null;
        }
        this.detector = null;
    }
    emit(metric) {
        for (const listener of this.listeners) {
            try {
                listener(metric);
            }
            catch (error) {
                console.error('Face tracking listener error', error);
            }
        }
    }
}
//# sourceMappingURL=face-tracker.js.map