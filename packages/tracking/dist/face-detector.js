export function resolveFaceDetectorCtor() {
    if (typeof window === 'undefined') {
        return null;
    }
    const ctor = window.FaceDetector;
    return typeof ctor === 'function' ? ctor : null;
}
export function isFaceDetectionSupported() {
    return Boolean(resolveFaceDetectorCtor() && navigator.mediaDevices?.getUserMedia);
}
//# sourceMappingURL=face-detector.js.map