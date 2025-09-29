import { createParallaxScene } from './auto';
export function createUseParallaxScene(hooks) {
    const { ref, onMounted, onBeforeUnmount, watch } = hooks;
    return function useParallaxScene(options, sources = []) {
        const element = ref(null);
        const scene = ref(null);
        const rebuildScene = () => {
            const target = element.value;
            if (!target) {
                if (scene.value) {
                    scene.value.destroy();
                    scene.value = null;
                }
                return;
            }
            if (scene.value) {
                scene.value.destroy();
            }
            scene.value = createParallaxScene({ ...options, root: target });
        };
        let stopWatcher = null;
        onMounted(() => {
            const watchSources = [() => element.value, ...sources];
            stopWatcher = watch(watchSources, () => {
                rebuildScene();
            }, { immediate: true, deep: false });
        });
        onBeforeUnmount(() => {
            stopWatcher?.();
            stopWatcher = null;
            if (scene.value) {
                scene.value.destroy();
                scene.value = null;
            }
        });
        const start = () => scene.value?.start() ?? Promise.resolve();
        const stop = () => {
            scene.value?.stop();
        };
        const isRunning = () => Boolean(scene.value?.isRunning());
        return {
            element,
            scene,
            start,
            stop,
            isRunning
        };
    };
}
//# sourceMappingURL=vue.js.map