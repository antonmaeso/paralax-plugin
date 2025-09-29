export interface DetectionLandmarkLike {
    readonly locations: ReadonlyArray<DOMPointReadOnly>;
    readonly type?: string;
}
export interface DetectionLike {
    readonly boundingBox: DOMRectReadOnly;
    readonly landmarks?: ReadonlyArray<DetectionLandmarkLike>;
}
export interface FaceDetectorOptions {
    fastMode?: boolean;
    maxDetectedFaces?: number;
}
export type DetectorSource = HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | ImageBitmap | OffscreenCanvas | ImageData | Blob;
export interface FaceDetectorLike {
    detect(source: DetectorSource): Promise<DetectionLike[]>;
}
export interface FaceDetectorConstructor {
    new (options?: FaceDetectorOptions): FaceDetectorLike;
}
declare global {
    interface Window {
        FaceDetector?: FaceDetectorConstructor;
    }
}
export declare function resolveFaceDetectorCtor(): FaceDetectorConstructor | null;
export declare function isFaceDetectionSupported(): boolean;
//# sourceMappingURL=face-detector.d.ts.map