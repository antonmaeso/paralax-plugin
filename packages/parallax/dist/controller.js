import { ParallaxLayer } from './layer';
export class FaceParallaxController {
    tracker;
    baseMaxOffsetX;
    baseMaxOffsetY;
    maxOffsetX;
    maxOffsetY;
    smoothing;
    distanceSmoothing;
    layers = new Set;
    workingOffset = { x: 0, y: 0 };
    targetOffset = { x: 0, y: 0 };
    currentDistance = 0;
    targetDistance = 0;
    unsubscribe = null;
    constructor(tracker, options = {}) {
        this.tracker = tracker;
        this.baseMaxOffsetX = options.maxOffsetX ?? 240;
        this.baseMaxOffsetY = options.maxOffsetY ?? 120;
        this.maxOffsetX = this.baseMaxOffsetX;
        this.maxOffsetY = this.baseMaxOffsetY;
        this.smoothing = options.smoothing ?? 0.22;
        this.distanceSmoothing = options.distanceSmoothing ?? 0.2;
    }
    addLayer(layer) {
        this.layers.add(layer);
        layer.reset();
    }
    removeLayer(layer) {
        this.layers.delete(layer);
    }
    configureBounds(width, height) {
        if (!Number.isFinite(width) || !Number.isFinite(height)) {
            this.maxOffsetX = this.baseMaxOffsetX;
            this.maxOffsetY = this.baseMaxOffsetY;
            return;
        }
        const targetX = width * 0.18;
        const targetY = height * 0.22;
        const minX = Math.max(40, this.baseMaxOffsetX * 0.25);
        const maxX = this.baseMaxOffsetX * 1.6;
        const minY = Math.max(28, this.baseMaxOffsetY * 0.25);
        const maxY = this.baseMaxOffsetY * 1.6;
        this.maxOffsetX = clamp(targetX, minX, maxX);
        this.maxOffsetY = clamp(targetY, minY, maxY);
    }
    subscribe(listener) {
        return this.tracker.subscribe(listener);
    }
    connect() {
        if (this.unsubscribe) {
            return;
        }
        this.unsubscribe = this.tracker.subscribe((metric) => {
            this.onMetric(metric);
        });
    }
    disconnect() {
        if (!this.unsubscribe) {
            return;
        }
        this.unsubscribe();
        this.unsubscribe = null;
        this.targetOffset.x = 0;
        this.targetOffset.y = 0;
        this.targetDistance = 0;
        this.applyUpdate();
    }
    onMetric(metric) {
        if (!metric) {
            this.targetOffset.x = 0;
            this.targetOffset.y = 0;
            this.targetDistance = 0;
            this.applyUpdate();
            return;
        }
        const offsetX = (0.5 - metric.center.x) * this.maxOffsetX;
        const offsetY = (metric.center.y - 0.5) * this.maxOffsetY;
        this.targetOffset.x = clamp(offsetX, -this.maxOffsetX, this.maxOffsetX);
        this.targetOffset.y = clamp(offsetY, -this.maxOffsetY, this.maxOffsetY);
        this.targetDistance = clamp(metric.relativeBox.width, 0, 1);
        this.applyUpdate();
    }
    applyUpdate() {
        this.workingOffset.x = lerp(this.workingOffset.x, this.targetOffset.x, this.smoothing);
        this.workingOffset.y = lerp(this.workingOffset.y, this.targetOffset.y, this.smoothing);
        this.currentDistance = lerp(this.currentDistance, this.targetDistance, this.distanceSmoothing);
        for (const layer of this.layers) {
            layer.update(this.workingOffset, this.currentDistance);
        }
    }
}
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
function lerp(start, end, amount) {
    return start + (end - start) * amount;
}
//# sourceMappingURL=controller.js.map