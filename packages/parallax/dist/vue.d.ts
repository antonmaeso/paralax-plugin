import { type ParallaxScene, type ParallaxSceneOptions } from './auto';
export interface VueHookPrimitives {
    ref<T>(value: T | null): {
        value: T | null;
    };
    onMounted(callback: () => void): void;
    onBeforeUnmount(callback: () => void): void;
    watch<T>(source: (() => T) | ReadonlyArray<() => unknown>, callback: (value: T, previous: T | undefined) => void, options?: VueWatchOptions): () => void;
}
export interface VueWatchOptions {
    immediate?: boolean;
    deep?: boolean;
}
export interface UseVueParallaxResult<TElement extends HTMLElement> {
    element: {
        value: TElement | null;
    };
    scene: {
        value: ParallaxScene | null;
    };
    start(): Promise<void>;
    stop(): void;
    isRunning(): boolean;
}
export declare function createUseParallaxScene(hooks: VueHookPrimitives): <TElement extends HTMLElement>(options: Omit<ParallaxSceneOptions, "root">, sources?: ReadonlyArray<() => unknown>) => UseVueParallaxResult<TElement>;
//# sourceMappingURL=vue.d.ts.map