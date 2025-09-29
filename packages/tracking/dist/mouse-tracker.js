const DEFAULT_SMOOTHING = 0.25;
const DEFAULT_DEPTH_STRATEGY = 'radial';
const DEFAULT_CONSTANT_DEPTH = 0.5;
const DEFAULT_RADIAL_NEAR = 0.85;
const DEFAULT_RADIAL_FAR = 0.35;
export class MouseTracker {
    listeners;
    config;
    running;
    usingPointerEvents;
    currentCenterX;
    currentCenterY;
    currentDepth;
    constructor(options = {}) {
        this.listeners = new Set();
        this.config = resolveConfig(options);
        this.running = false;
        this.usingPointerEvents = supportsPointerEvents();
        this.currentCenterX = 0.5;
        this.currentCenterY = 0.5;
        this.currentDepth = this.config.depthStrategy === 'constant' ? this.config.constantDepth : 0.5;
    }
    static isSupported() {
        const hasWindow = typeof window !== 'undefined';
        if (!hasWindow) {
            return false;
        }
        return typeof window.addEventListener === 'function';
    }
    get isRunning() {
        return this.running;
    }
    subscribe(listener) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }
    async start() {
        if (!MouseTracker.isSupported()) {
            throw new Error('Mouse tracking is not supported in this environment.');
        }
        if (this.running) {
            return;
        }
        const target = this.config.element;
        if (this.usingPointerEvents) {
            target.addEventListener('pointermove', this.onPointerMove);
            target.addEventListener('pointerdown', this.onPointerMove);
            target.addEventListener('pointerup', this.onPointerMove);
            target.addEventListener('pointerleave', this.onPointerLeave);
            target.addEventListener('pointercancel', this.onPointerLeave);
        }
        else {
            target.addEventListener('mousemove', this.onPointerMove);
            target.addEventListener('mousedown', this.onPointerMove);
            target.addEventListener('mouseup', this.onPointerMove);
            target.addEventListener('mouseleave', this.onPointerLeave);
            target.addEventListener('mouseout', this.onPointerLeave);
        }
        this.running = true;
    }
    stop() {
        if (!this.running) {
            return;
        }
        const target = this.config.element;
        if (this.usingPointerEvents) {
            target.removeEventListener('pointermove', this.onPointerMove);
            target.removeEventListener('pointerdown', this.onPointerMove);
            target.removeEventListener('pointerup', this.onPointerMove);
            target.removeEventListener('pointerleave', this.onPointerLeave);
            target.removeEventListener('pointercancel', this.onPointerLeave);
        }
        else {
            target.removeEventListener('mousemove', this.onPointerMove);
            target.removeEventListener('mousedown', this.onPointerMove);
            target.removeEventListener('mouseup', this.onPointerMove);
            target.removeEventListener('mouseleave', this.onPointerLeave);
            target.removeEventListener('mouseout', this.onPointerLeave);
        }
        this.running = false;
        this.emit(null);
    }
    dispose() {
        this.stop();
        this.listeners.clear();
    }
    onPointerMove = (event) => {
        if (!this.running) {
            return;
        }
        const pointerEvent = event;
        const position = resolvePosition(pointerEvent, this.config.element);
        const normalizedX = clamp(position.normalizedX, 0, 1);
        const normalizedY = clamp(position.normalizedY, 0, 1);
        const smoothing = clamp(this.config.smoothing, 0, 1);
        this.currentCenterX = lerp(this.currentCenterX, normalizedX, smoothing);
        this.currentCenterY = lerp(this.currentCenterY, normalizedY, smoothing);
        const depth = this.computeDepth(normalizedX, normalizedY);
        this.currentDepth = lerp(this.currentDepth, depth, smoothing);
        const metric = {
            timestamp: typeof performance !== 'undefined' ? performance.now() : Date.now(),
            box: {
                x: position.offsetX,
                y: position.offsetY,
                width: 0,
                height: 0
            },
            relativeBox: {
                x: normalizedX,
                y: normalizedY,
                width: this.currentDepth,
                height: this.currentDepth
            },
            center: {
                x: this.currentCenterX,
                y: this.currentCenterY
            },
            landmarks: [],
            eyes: {}
        };
        this.emit(metric);
    };
    onPointerLeave = () => {
        if (!this.running) {
            return;
        }
        this.emit(null);
    };
    computeDepth(normalizedX, normalizedY) {
        if (this.config.depthStrategy === 'constant') {
            return this.config.constantDepth;
        }
        const dx = normalizedX - 0.5;
        const dy = normalizedY - 0.5;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDistance = Math.SQRT1_2;
        const normalizedDistance = clamp(maxDistance === 0 ? 0 : distance / maxDistance, 0, 1);
        const closeness = 1 - normalizedDistance;
        const { radialNear, radialFar } = this.config;
        return clamp(radialFar + (radialNear - radialFar) * closeness, 0, 1);
    }
    emit(metric) {
        for (const listener of this.listeners) {
            try {
                listener(metric);
            }
            catch (error) {
                console.error('[MouseTracker] listener error', error);
            }
        }
    }
}
function resolveConfig(options) {
    const element = options.element ?? inferDefaultElement();
    const smoothing = options.smoothing ?? DEFAULT_SMOOTHING;
    const depthStrategy = options.depthStrategy ?? DEFAULT_DEPTH_STRATEGY;
    const constantDepth = clamp(options.constantDepth ?? DEFAULT_CONSTANT_DEPTH, 0, 1);
    const radialNear = clamp(options.radialDepth?.near ?? DEFAULT_RADIAL_NEAR, 0, 1);
    const radialFar = clamp(options.radialDepth?.far ?? DEFAULT_RADIAL_FAR, 0, 1);
    return {
        element,
        smoothing,
        depthStrategy,
        constantDepth,
        radialNear: Math.max(radialNear, radialFar),
        radialFar: Math.min(radialNear, radialFar)
    };
}
function resolvePosition(event, element) {
    if (element instanceof Window) {
        const width = element.innerWidth || 1;
        const height = element.innerHeight || 1;
        const offsetX = event.clientX;
        const offsetY = event.clientY;
        return {
            normalizedX: offsetX / width,
            normalizedY: offsetY / height,
            offsetX,
            offsetY
        };
    }
    const rect = element.getBoundingClientRect();
    const width = rect.width || 1;
    const height = rect.height || 1;
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    return {
        normalizedX: offsetX / width,
        normalizedY: offsetY / height,
        offsetX,
        offsetY
    };
}
function supportsPointerEvents() {
    return typeof window !== 'undefined' && 'PointerEvent' in window;
}
function inferDefaultElement() {
    if (typeof window !== 'undefined') {
        return window;
    }
    throw new Error('MouseTracker requires a browser environment or an explicit element option.');
}
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
function lerp(start, end, amount) {
    return start + (end - start) * amount;
}
//# sourceMappingURL=mouse-tracker.js.map