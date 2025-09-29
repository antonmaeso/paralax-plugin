import { createParallaxScene, type ParallaxScene, type ParallaxSceneOptions } from './auto'

export type DependencyList = ReadonlyArray<unknown>
export type EffectCleanup = void | (() => void)

export interface ReactHookPrimitives {
  useEffect(effect: () => EffectCleanup, deps?: DependencyList): void
  useRef<T>(initialValue: T | null): { current: T | null }
  useState<T>(initialValue: T | null): [T | null, (value: T | null) => void]
  useCallback<T extends (...args: any[]) => unknown>(callback: T, deps: DependencyList): T
}

export interface UseParallaxSceneResult<TElement extends HTMLElement> {
  ref: (element: TElement | null) => void
  scene: ParallaxScene | null
  start(): Promise<void>
  stop(): void
  isRunning(): boolean
}

export function createUseParallaxScene(hooks: ReactHookPrimitives) {
  const { useEffect, useRef, useState, useCallback } = hooks

  return function useParallaxScene<TElement extends HTMLElement>(
    options: Omit<ParallaxSceneOptions, 'root'>,
    deps: DependencyList = []
  ): UseParallaxSceneResult<TElement> {
    const [root, setRoot] = useState<TElement | null>(null)
    const sceneRef = useRef<ParallaxScene | null>(null)

    const attachRef = useCallback((element: TElement | null) => {
      setRoot(element)
    }, [])

    useEffect(() => {
      if (!root) {
        return
      }

      const scene = createParallaxScene({ ...options, root })
      sceneRef.current = scene

      return () => {
        scene.destroy()
        if (sceneRef.current === scene) {
          sceneRef.current = null
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [root, ...deps])

    useEffect(() => {
      if (root) {
        return
      }

      const scene = sceneRef.current
      if (!scene) {
        return
      }

      scene.destroy()
      sceneRef.current = null
    }, [root])

    const start = useCallback(() => sceneRef.current?.start() ?? Promise.resolve(), [])
    const stop = useCallback(() => {
      sceneRef.current?.stop()
    }, [])
    const isRunning = useCallback(() => Boolean(sceneRef.current?.isRunning()), [])

    return {
      ref: attachRef,
      scene: sceneRef.current,
      start,
      stop,
      isRunning
    }
  }
}
