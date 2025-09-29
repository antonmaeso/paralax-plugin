interface CameraSessionOptions {
    constraints: MediaTrackConstraints;
}
export declare class CameraSession {
    private readonly options;
    private stream;
    private video;
    constructor(options: CameraSessionOptions);
    open(): Promise<HTMLVideoElement>;
    stop(): void;
    dispose(): void;
    getVideo(): HTMLVideoElement | null;
}
export {};
//# sourceMappingURL=camera-session.d.ts.map