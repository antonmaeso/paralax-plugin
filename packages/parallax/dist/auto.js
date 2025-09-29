import { FaceParallaxController } from './controller';
import { DEPTH_CLASS_PREFIX, GENERIC_DEPTH_CLASS_PREFIX, ParallaxLayer } from './layer';
const DEFAULT_LAYER_ATTRIBUTE = 'data-parallax-layer';
const DEFAULT_BOUND_ATTRIBUTE = 'data-parallax-bound';
export function createParallaxScene(options) {
    if (typeof document === 'undefined') {
        return createServerScene(options);
    }
    const rootNode = resolveRoot(options.root);
    const depthClassPrefix = options.depthClassPrefix ?? DEPTH_CLASS_PREFIX;
    const genericDepthClassPrefix = options.genericDepthClassPrefix ?? GENERIC_DEPTH_CLASS_PREFIX;
    const layerAttribute = options.layerAttribute === false ? undefined : options.layerAttribute ?? DEFAULT_LAYER_ATTRIBUTE;
    const boundAttribute = options.boundAttribute ?? DEFAULT_BOUND_ATTRIBUTE;
    const detection = {
        selector: options.selector === false
            ? false
            : options.selector ?? buildDefaultSelector(layerAttribute, depthClassPrefix, genericDepthClassPrefix),
        layerAttribute,
        depthAttribute: options.depthAttribute,
        depthClassPrefix,
        genericDepthClassPrefix
    };
    const layerOptions = {
        depthAttribute: options.depthAttribute,
        directionAttribute: options.directionAttribute
    };
    const tracker = normaliseTracker(options.tracker, options.metricAdapter);
    const controllerOptions = resolveControllerOptions(options);
    const controller = options.controller ?? new FaceParallaxController(tracker.subscribable, controllerOptions);
    const ownsController = !options.controller;
    const elementToLayer = new Map();
    const registeredLayers = new Set();
    const bindElement = (element) => {
        if (elementToLayer.has(element)) {
            return;
        }
        if (!isLayerCandidate(element, detection)) {
            return;
        }
        const layer = new ParallaxLayer(element, undefined, undefined, layerOptions);
        controller.addLayer(layer);
        elementToLayer.set(element, layer);
        registeredLayers.add(layer);
        element.setAttribute(boundAttribute, 'true');
    };
    const unbindElement = (element) => {
        const layer = elementToLayer.get(element);
        if (!layer) {
            return;
        }
        controller.removeLayer(layer);
        elementToLayer.delete(element);
        registeredLayers.delete(layer);
        element.removeAttribute(boundAttribute);
    };
    const refresh = () => {
        const candidates = collectCandidates(rootNode, detection);
        for (const candidate of candidates) {
            bindElement(candidate);
        }
    };
    const configureBoundsForRoot = () => {
        if (typeof window === 'undefined') {
            return;
        }
        if (rootNode instanceof Element) {
            const rect = rootNode.getBoundingClientRect();
            controller.configureBounds(rect.width, rect.height);
            return;
        }
        controller.configureBounds(window.innerWidth, window.innerHeight);
    };
    refresh();
    configureBoundsForRoot();
    let disconnectResize = null;
    if (options.updateBoundsOnResize ?? true) {
        if (typeof window !== 'undefined') {
            const handleResize = () => configureBoundsForRoot();
            window.addEventListener('resize', handleResize);
            disconnectResize = () => window.removeEventListener('resize', handleResize);
        }
    }
    let observer = null;
    if (options.observeMutations ?? false) {
        if (typeof MutationObserver !== 'undefined') {
            observer = new MutationObserver((records) => {
                for (const record of records) {
                    for (const added of record.addedNodes) {
                        for (const element of collectCandidates(added, detection)) {
                            bindElement(element);
                        }
                    }
                    for (const removed of record.removedNodes) {
                        for (const element of collectBoundElements(removed, boundAttribute, elementToLayer)) {
                            unbindElement(element);
                        }
                    }
                }
            });
            if (rootNode instanceof Node) {
                observer.observe(rootNode, { childList: true, subtree: true });
            }
        }
    }
    let running = false;
    let pendingStart = null;
    let startToken = 0;
    const start = async () => {
        if (running) {
            return;
        }
        const token = ++startToken;
        if (pendingStart) {
            return pendingStart;
        }
        pendingStart = (async () => {
            try {
                if (tracker.lifecycle.start) {
                    await tracker.lifecycle.start();
                }
                if (token !== startToken) {
                    return;
                }
                controller.connect();
                running = true;
            }
            finally {
                pendingStart = null;
            }
        })();
        return pendingStart;
    };
    const stop = () => {
        startToken++;
        if (!running && !pendingStart && !tracker.lifecycle.stop) {
            return;
        }
        controller.disconnect();
        try {
            tracker.lifecycle.stop?.();
        }
        finally {
            running = false;
        }
    };
    const destroy = () => {
        stop();
        observer?.disconnect();
        observer = null;
        disconnectResize?.();
        disconnectResize = null;
        for (const element of Array.from(elementToLayer.keys())) {
            unbindElement(element);
        }
        if (ownsController) {
            controller.disconnect();
        }
        tracker.lifecycle.dispose?.();
    };
    if (options.autoStart ?? true) {
        void start();
    }
    return {
        controller,
        layers: registeredLayers,
        root: rootNode,
        refresh,
        start,
        stop,
        destroy,
        isRunning: () => running
    };
}
export function initParallaxLayers(options) {
    const scene = createParallaxScene({
        tracker: options.tracker,
        root: options.root ?? null,
        selector: options.selector,
        layerAttribute: options.layerAttribute,
        boundAttribute: options.boundAttribute,
        depthAttribute: options.depthAttribute,
        directionAttribute: options.directionAttribute,
        depthClassPrefix: options.depthClassPrefix,
        genericDepthClassPrefix: options.genericDepthClassPrefix,
        observeMutations: options.observeMutations,
        autoStart: options.autoConnect ?? true,
        updateBoundsOnResize: options.updateBoundsOnResize,
        controller: options.controller,
        controllerOptions: options.controllerOptions,
        metricAdapter: options.metricAdapter,
        maxOffsetX: options.maxOffsetX,
        maxOffsetY: options.maxOffsetY,
        smoothing: options.smoothing,
        distanceSmoothing: options.distanceSmoothing
    });
    return {
        controller: scene.controller,
        layers: scene.layers,
        root: scene.root,
        refresh: scene.refresh,
        start: scene.start,
        stop: scene.stop,
        disconnect: scene.stop,
        destroy: scene.destroy,
        isRunning: scene.isRunning
    };
}
function createServerScene(options) {
    const passiveTracker = {
        subscribe: () => () => { }
    };
    const controller = options.controller ?? new FaceParallaxController(passiveTracker, resolveControllerOptions(options));
    const ownsController = !options.controller;
    return {
        controller,
        layers: new Set(),
        root: options.root && typeof options.root !== 'string' ? options.root : {},
        refresh: () => { },
        start: async () => {
            if (ownsController) {
                controller.connect();
            }
        },
        stop: () => {
            if (ownsController) {
                controller.disconnect();
            }
        },
        destroy: () => {
            if (ownsController) {
                controller.disconnect();
            }
        },
        isRunning: () => false
    };
}
function resolveRoot(root) {
    if (root == null) {
        return document;
    }
    if (typeof root === 'string') {
        const resolved = document.querySelector(root);
        if (!resolved) {
            throw new Error(`[parallax] Unable to find root element for selector "${root}".`);
        }
        return resolved;
    }
    return root;
}
function normaliseTracker(tracker, adapter) {
    const lifecycle = resolveLifecycle(tracker);
    const subscribable = {
        subscribe(listener) {
            const unsubscribe = tracker.subscribe((raw) => {
                if (raw == null) {
                    listener(null);
                    return;
                }
                const adapted = adapter ? safeAdapt(adapter, raw) : null;
                const metric = adapted ?? coerceFaceMetric(raw);
                if (!metric) {
                    if (typeof console !== 'undefined' && console.warn) {
                        console.warn('[parallax] Ignoring tracker metric that cannot be normalised.', raw);
                    }
                    return;
                }
                listener(metric);
            });
            return unsubscribe;
        }
    };
    return { subscribable, lifecycle };
}
function safeAdapt(adapter, metric) {
    try {
        return adapter(metric);
    }
    catch (error) {
        if (typeof console !== 'undefined' && console.error) {
            console.error('[parallax] metricAdapter threw an error. Ignoring metric.', error);
        }
    }
    return null;
}
function resolveLifecycle(source) {
    const lifecycle = {};
    const candidate = source;
    if (typeof candidate.start === 'function') {
        lifecycle.start = candidate.start.bind(candidate);
    }
    if (typeof candidate.stop === 'function') {
        lifecycle.stop = candidate.stop.bind(candidate);
    }
    if (typeof candidate.dispose === 'function') {
        lifecycle.dispose = candidate.dispose.bind(candidate);
    }
    if (typeof candidate.isRunning === 'function') {
        const fn = candidate.isRunning.bind(candidate);
        lifecycle.isRunning = () => Boolean(fn());
    }
    else if (candidate.isRunning !== undefined) {
        const holder = candidate;
        lifecycle.isRunning = () => Boolean(holder.isRunning);
    }
    return lifecycle;
}
function coerceFaceMetric(metric) {
    if (!metric || typeof metric !== 'object') {
        return null;
    }
    const candidate = metric;
    const center = candidate.center;
    const relativeBox = candidate.relativeBox;
    if (center &&
        typeof center.x === 'number' &&
        typeof center.y === 'number' &&
        relativeBox &&
        typeof relativeBox.width === 'number') {
        return {
            center: { x: center.x, y: center.y },
            relativeBox: { width: relativeBox.width }
        };
    }
    return null;
}
function resolveControllerOptions(options) {
    if (options.controllerOptions) {
        return options.controllerOptions;
    }
    const hasOverrides = options.maxOffsetX !== undefined ||
        options.maxOffsetY !== undefined ||
        options.smoothing !== undefined ||
        options.distanceSmoothing !== undefined;
    if (!hasOverrides) {
        return undefined;
    }
    const overrides = {};
    if (options.maxOffsetX !== undefined) {
        overrides.maxOffsetX = options.maxOffsetX;
    }
    if (options.maxOffsetY !== undefined) {
        overrides.maxOffsetY = options.maxOffsetY;
    }
    if (options.smoothing !== undefined) {
        overrides.smoothing = options.smoothing;
    }
    if (options.distanceSmoothing !== undefined) {
        overrides.distanceSmoothing = options.distanceSmoothing;
    }
    return overrides;
}
function buildDefaultSelector(layerAttribute, depthClassPrefix, genericDepthClassPrefix) {
    const selectors = [];
    if (layerAttribute) {
        selectors.push(`[${layerAttribute}]`);
    }
    selectors.push(`[class*="${depthClassPrefix}"]`);
    if (genericDepthClassPrefix && genericDepthClassPrefix !== depthClassPrefix) {
        selectors.push(`[class*="${genericDepthClassPrefix}"]`);
    }
    return selectors.join(', ');
}
function collectCandidates(node, detection) {
    const selector = detection.selector;
    const elements = [];
    if (node instanceof HTMLElement) {
        if (isLayerCandidate(node, detection)) {
            elements.push(node);
        }
        if (selector) {
            elements.push(...node.querySelectorAll(selector));
        }
        return dedupe(elements);
    }
    if (selector && (node instanceof Document || node instanceof DocumentFragment)) {
        elements.push(...node.querySelectorAll(selector));
    }
    return dedupe(elements.filter((element) => isLayerCandidate(element, detection)));
}
function collectBoundElements(node, boundAttribute, lookup) {
    const elements = [];
    if (node instanceof HTMLElement) {
        if (lookup.has(node)) {
            elements.push(node);
        }
        elements.push(...node.querySelectorAll(`[${boundAttribute}]`));
    }
    else if (node instanceof DocumentFragment) {
        elements.push(...node.querySelectorAll(`[${boundAttribute}]`));
    }
    return elements.filter((element) => lookup.has(element));
}
function isLayerCandidate(element, detection) {
    if (!(element instanceof HTMLElement)) {
        return false;
    }
    if (detection.layerAttribute && element.hasAttribute(detection.layerAttribute)) {
        return true;
    }
    if (detection.depthAttribute && element.hasAttribute(detection.depthAttribute)) {
        return true;
    }
    for (const token of element.classList) {
        if (token.startsWith(detection.depthClassPrefix) || token.startsWith(detection.genericDepthClassPrefix)) {
            return true;
        }
    }
    return false;
}
function dedupe(elements) {
    const seen = new Set();
    const result = [];
    for (const element of elements) {
        if (seen.has(element)) {
            continue;
        }
        seen.add(element);
        result.push(element);
    }
    return result;
}
//# sourceMappingURL=auto.js.map