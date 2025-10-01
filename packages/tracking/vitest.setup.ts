if (typeof window !== 'undefined' && typeof window.PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    constructor(type: string, init: MouseEventInit = {}) {
      super(type, init)
    }
  }
  // @ts-expect-error allow assignment in tests
  window.PointerEvent = PointerEventPolyfill
}

if (typeof globalThis.requestAnimationFrame === 'undefined') {
  let rafId = 0
  const callbacks = new Map<number, FrameRequestCallback>()
  globalThis.requestAnimationFrame = (callback: FrameRequestCallback): number => {
    const id = ++rafId
    callbacks.set(id, callback)
    // Schedule callback for next tick to avoid synchronous recursion
    setTimeout(() => {
      const cb = callbacks.get(id)
      if (cb) {
        cb(performance.now())
        callbacks.delete(id)
      }
    }, 0)
    return id
  }
  globalThis.cancelAnimationFrame = (id: number) => {
    callbacks.delete(id)
  }
}
