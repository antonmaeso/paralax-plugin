export class DetectionLoop {
    detector;
    fps;
    emit;
    active;
    frameHandle;
    lastDetectionTimestamp;
    constructor(detector, fps, emit) {
        this.detector = detector;
        this.fps = fps;
        this.emit = emit;
        this.active = false;
        this.frameHandle = null;
        this.lastDetectionTimestamp = 0;
    }
    start(videoProvider, metricBuilder) {
        if (this.active) {
            return;
        }
        this.active = true;
        this.lastDetectionTimestamp = 0;
        this.schedule(videoProvider, metricBuilder);
    }
    stop() {
        this.active = false;
        if (this.frameHandle !== null) {
            cancelAnimationFrame(this.frameHandle);
            this.frameHandle = null;
        }
    }
    schedule(videoProvider, metricBuilder) {
        if (!this.active) {
            return;
        }
        this.frameHandle = requestAnimationFrame(() => {
            void this.detect(videoProvider, metricBuilder);
        });
    }
    async detect(videoProvider, metricBuilder) {
        if (!this.active) {
            return;
        }
        const video = videoProvider();
        if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
            this.schedule(videoProvider, metricBuilder);
            return;
        }
        const now = performance.now();
        const minInterval = 1000 / this.fps;
        if (now - this.lastDetectionTimestamp < minInterval) {
            this.schedule(videoProvider, metricBuilder);
            return;
        }
        this.lastDetectionTimestamp = now;
        try {
            const detections = await this.detector.detect(video);
            if (!detections.length) {
                this.emit(null);
                this.schedule(videoProvider, metricBuilder);
                return;
            }
            const metric = metricBuilder(detections[0], video, now);
            this.emit(metric);
        }
        catch (error) {
            console.warn('Face detection failed', error);
            this.emit(null);
        }
        this.schedule(videoProvider, metricBuilder);
    }
}
//# sourceMappingURL=detection-loop.js.map