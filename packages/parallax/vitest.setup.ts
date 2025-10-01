if (typeof globalThis.requestAnimationFrame === 'undefined') {
  let rafId = 0
  const callbacks = new Map<number, FrameRequestCallback>()
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback): number => {
    const id = ++rafId
    callbacks.set(id, cb)
    setTimeout(() => {
      const callback = callbacks.get(id)
      if (callback) {
        callback(performance.now())
        callbacks.delete(id)
      }
    }, 0)
    return id
  }
  globalThis.cancelAnimationFrame = (id: number) => {
    callbacks.delete(id)
  }
}

if (typeof globalThis.MutationObserver === 'undefined') {
  class MockMutationObserver {
    callback: MutationCallback
    constructor(callback: MutationCallback) {
      this.callback = callback
    }
    observe() {}
    disconnect() {}
    takeRecords(): MutationRecord[] {
      return []
    }
  }
  globalThis.MutationObserver = MockMutationObserver as unknown as typeof MutationObserver
}
