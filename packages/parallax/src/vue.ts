import { createParallaxScene, type ParallaxScene, type ParallaxSceneOptions } from './auto'

export interface VueHookPrimitives {
  ref<T>(value: T | null): { value: T | null }
  onMounted(callback: () => void): void
  onBeforeUnmount(callback: () => void): void
  watch<T>(
    source: (() => T) | ReadonlyArray<() => unknown>,
    callback: (value: T, previous: T | undefined) => void,
    options?: VueWatchOptions
  ): () => void
}

export interface VueWatchOptions {
  immediate?: boolean
  deep?: boolean
}

export interface UseVueParallaxResult<TElement extends HTMLElement> {
  element: { value: TElement | null }
  scene: { value: ParallaxScene | null }
  start(): Promise<void>
  stop(): void
  isRunning(): boolean
}

export function createUseParallaxScene(hooks: VueHookPrimitives) {
  const { ref, onMounted, onBeforeUnmount, watch } = hooks

  return function useParallaxScene<TElement extends HTMLElement>(
    options: Omit<ParallaxSceneOptions, 'root'>,
    sources: ReadonlyArray<() => unknown> = []
  ): UseVueParallaxResult<TElement> {
    const element = ref<TElement | null>(null)
    const scene = ref<ParallaxScene | null>(null)

    const rebuildScene = () => {
      const target = element.value
      if (!target) {
        if (scene.value) {
          scene.value.destroy()
          scene.value = null
        }
        return
      }

      if (scene.value) {
        scene.value.destroy()
      }
      scene.value = createParallaxScene({ ...options, root: target })
    }

    let stopWatcher: (() => void) | null = null

    onMounted(() => {
      const watchSources: ReadonlyArray<() => unknown> = [() => element.value, ...sources]
      stopWatcher = watch(
        watchSources,
        () => {
          rebuildScene()
        },
        { immediate: true, deep: false }
      )
    })

    onBeforeUnmount(() => {
      stopWatcher?.()
      stopWatcher = null
      if (scene.value) {
        scene.value.destroy()
        scene.value = null
      }
    })

    const start = () => scene.value?.start() ?? Promise.resolve()
    const stop = () => {
      scene.value?.stop()
    }
    const isRunning = () => Boolean(scene.value?.isRunning())

    return {
      element,
      scene,
      start,
      stop,
      isRunning
    }
  }
}
