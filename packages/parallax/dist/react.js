import { createParallaxScene } from './auto';
export function createUseParallaxScene(hooks) {
    const { useEffect, useRef, useState, useCallback } = hooks;
    return function useParallaxScene(options, deps = []) {
        const [root, setRoot] = useState(null);
        const sceneRef = useRef(null);
        const attachRef = useCallback((element) => {
            setRoot(element);
        }, []);
        useEffect(() => {
            if (!root) {
                return;
            }
            const scene = createParallaxScene({ ...options, root });
            sceneRef.current = scene;
            return () => {
                scene.destroy();
                if (sceneRef.current === scene) {
                    sceneRef.current = null;
                }
            };
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [root, ...deps]);
        useEffect(() => {
            if (root) {
                return;
            }
            const scene = sceneRef.current;
            if (!scene) {
                return;
            }
            scene.destroy();
            sceneRef.current = null;
        }, [root]);
        const start = useCallback(() => sceneRef.current?.start() ?? Promise.resolve(), []);
        const stop = useCallback(() => {
            sceneRef.current?.stop();
        }, []);
        const isRunning = useCallback(() => Boolean(sceneRef.current?.isRunning()), []);
        return {
            ref: attachRef,
            scene: sceneRef.current,
            start,
            stop,
            isRunning
        };
    };
}
//# sourceMappingURL=react.js.map