import { type ParallaxScene, type ParallaxSceneOptions } from './auto';
export type DependencyList = ReadonlyArray<unknown>;
export type EffectCleanup = void | (() => void);
export interface ReactHookPrimitives {
    useEffect(effect: () => EffectCleanup, deps?: DependencyList): void;
    useRef<T>(initialValue: T | null): {
        current: T | null;
    };
    useState<T>(initialValue: T | null): [T | null, (value: T | null) => void];
    useCallback<T extends (...args: any[]) => unknown>(callback: T, deps: DependencyList): T;
}
export interface UseParallaxSceneResult<TElement extends HTMLElement> {
    ref: (element: TElement | null) => void;
    scene: ParallaxScene | null;
    start(): Promise<void>;
    stop(): void;
    isRunning(): boolean;
}
export declare function createUseParallaxScene(hooks: ReactHookPrimitives): <TElement extends HTMLElement>(options: Omit<ParallaxSceneOptions, "root">, deps?: DependencyList) => UseParallaxSceneResult<TElement>;
//# sourceMappingURL=react.d.ts.map