import './style.css'
import { createParallaxScene, type ParallaxScene } from 'parallax'
import { FaceMeshTracker, FaceTracker, MouseTracker } from 'tracking'

interface PageController {
  mount(container: HTMLElement): void
  destroy(): void
}

export function createParallaxPage(): PageController {
  return new ParallaxPage()
}

type TrackerKind = 'face' | 'mouse'
type TrackerInstance = FaceTracker | MouseTracker | FaceMeshTracker

type FaceTrackerVariant = 'native' | 'mesh'

class ParallaxPage implements PageController {
  private container: HTMLElement | null = null
  private scene: HTMLElement | null = null
  private statusEl: HTMLElement | null = null
  private startButton: HTMLButtonElement | null = null
  private stopButton: HTMLButtonElement | null = null
  private trackerSelect: HTMLSelectElement | null = null

  private tracker: TrackerInstance | null = null
  private sceneInstance: ParallaxScene | null = null
  private selectedTrackerKind: TrackerKind = 'face'
  private activeTrackerKind: TrackerKind | null = null
  private parallaxTrackerKind: TrackerKind | null = null
  private faceTrackerVariant: FaceTrackerVariant | null = null
  private nativeFaceSupported = false
  private faceMeshSupported = false
  private faceSupported = false
  private mouseSupported = false

  mount(container: HTMLElement): void {
    this.container = container
    this.render()
    this.hydrate()
    this.initialise()
  }

  destroy(): void {
    this.startButton?.removeEventListener('click', this.handleStart)
    this.stopButton?.removeEventListener('click', this.handleStop)
    this.trackerSelect?.removeEventListener('change', this.handleTrackerChange)
    this.sceneInstance?.destroy()
    this.sceneInstance = null
    this.tracker = null
    this.activeTrackerKind = null
    this.faceTrackerVariant = null
    this.parallaxTrackerKind = null
    this.resetRefs()
    this.container = null
  }

  private render(): void {
    if (!this.container) {
      return
    }

    this.container.innerHTML = `
      <div class="parallax-page">
        <section class="parallax-controls">
          <header>
            <h1>Parallax Playground</h1>
            <p>Tag any element with <code>parallax-layer--depth-N</code> and watch it respond to the viewer's head movement.</p>
          </header>
          <p class="parallax-status" data-status data-state="idle">Checking browser support…</p>
          <div class="parallax-actions">
            <button type="button" data-action="start" disabled>Start parallax</button>
            <button type="button" data-action="stop" data-variant="secondary" disabled>Stop</button>
          </div>
          <div class="parallax-trackers">
            <label class="parallax-trackers__label">
              Control source
              <select data-tracker>
                <option value="face">Face tracker</option>
                <option value="mouse">Mouse tracker</option>
              </select>
            </label>
          </div>
          <p class="parallax-hint">Pick a tracking source below. Face tracking needs camera access; mouse tracking uses cursor movement.</p>
        </section>
        <section class="parallax-scene" data-scene>
          <div class="layer layer-gradient parallax-layer--depth-1 parallax-layer--direction-inverse"></div>
          <div class="layer layer-orbit parallax-layer--depth-4 parallax-layer--direction-same"></div>
          <div class="layer layer-card parallax-layer--depth-7 parallax-layer--direction-inverse">
            <div class="card">
              <h2>Face-driven UI</h2>
              <p>Your head becomes the cursor. Each depth layer moves at a unique speed.</p>
            </div>
          </div>
        </section>
      </div>
    `
  }

  private hydrate(): void {
    if (!this.container) {
      return
    }

    this.scene = this.container.querySelector<HTMLElement>('[data-scene]')
    this.statusEl = this.container.querySelector<HTMLElement>('[data-status]')
    this.startButton = this.container.querySelector<HTMLButtonElement>('button[data-action="start"]')
    this.stopButton = this.container.querySelector<HTMLButtonElement>('button[data-action="stop"]')
    this.trackerSelect = this.container.querySelector<HTMLSelectElement>('select[data-tracker]')

    if (!this.scene || !this.statusEl || !this.startButton || !this.stopButton || !this.trackerSelect) {
      throw new Error('Parallax page failed to initialise required elements')
    }

    this.startButton.addEventListener('click', this.handleStart)
    this.stopButton.addEventListener('click', this.handleStop)
    this.trackerSelect.addEventListener('change', this.handleTrackerChange)
  }

  private initialise(): void {
    const startButton = this.startButton
    const stopButton = this.stopButton
    if (!startButton || !stopButton) {
      throw new Error('Parallax controls are not ready yet.')
    }

    this.nativeFaceSupported = FaceTracker.isSupported()
    this.faceMeshSupported = FaceMeshTracker.isSupported()
    this.faceSupported = this.nativeFaceSupported || this.faceMeshSupported
    this.mouseSupported = MouseTracker.isSupported()
    console.info('[Homepage:Parallax] Tracker support', {
      faceNative: this.nativeFaceSupported,
      faceMesh: this.faceMeshSupported,
      mouse: this.mouseSupported
    })

    this.updateTrackerSelection()

    if (!this.faceSupported && !this.mouseSupported) {
      this.setStatus('Neither face nor mouse tracking is supported in this environment.', 'error')
      startButton.disabled = true
      stopButton.disabled = true
      return
    }

    const kind = this.getSelectedTrackerKind()
    const label = kind === 'face' ? this.getFaceTrackerLabel() : 'mouse tracking'
    this.setStatus(`Ready to start. Source: ${label}.`, 'idle')
    startButton.disabled = false
  }

  private handleStart = async (): Promise<void> => {
    const startButton = this.startButton
    const stopButton = this.stopButton

    if (!startButton || !stopButton || startButton.disabled || !this.scene) {
      return
    }

    const kind = this.getSelectedTrackerKind()
    if (!this.isTrackerSupported(kind)) {
      this.setStatus(`${kind === 'face' ? 'Face' : 'Mouse'} tracker is not supported. Choose a different source.`, 'error')
      return
    }

    try {
      startButton.disabled = true
      stopButton.disabled = true
      const tracker = this.ensureTracker(kind)
      const preparingMessage =
        kind === 'face'
          ? this.faceTrackerVariant === 'mesh'
            ? 'Initialising face mesh tracker…'
            : 'Requesting camera access…'
          : 'Listening for pointer movement…'
      this.setStatus(preparingMessage, 'idle')
      const scene = this.ensureParallax(tracker, kind)
      await scene.start()
      scene.refresh()
      const activeDescription =
        kind === 'face'
          ? this.faceTrackerVariant === 'mesh'
            ? 'Move your head to explore depth. Mesh tracker active.'
            : 'Move your head to explore depth.'
          : 'Move the cursor to explore depth.'
      this.setStatus(`Parallax active. ${activeDescription}`, 'running')
      stopButton.disabled = false
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      this.setStatus(`Unable to start parallax: ${message}`, 'error')
      console.error('[Homepage:Parallax] Failed to start tracker', error)
      startButton.disabled = false
    }
  }

  private handleStop = (): void => {
    const startButton = this.startButton
    const stopButton = this.stopButton
    if (!startButton || !stopButton) {
      return
    }

    if (!this.sceneInstance || !this.sceneInstance.isRunning()) {
      return
    }

    this.sceneInstance.stop()
    this.setStatus('Parallax paused.', 'idle')
    startButton.disabled = false
    stopButton.disabled = true
  }

  private handleTrackerChange = (): void => {
    const startButton = this.startButton
    const stopButton = this.stopButton
    if (!this.trackerSelect || !startButton || !stopButton) {
      return
    }

    this.selectedTrackerKind = this.getSelectedTrackerKind()

    if (this.sceneInstance?.isRunning()) {
      this.sceneInstance.stop()
      this.setStatus('Parallax paused. Tracker changed.', 'idle')
      stopButton.disabled = true
      startButton.disabled = false
    }

    this.sceneInstance?.destroy()
    this.sceneInstance = null
    this.parallaxTrackerKind = null

    this.tracker = null
    this.activeTrackerKind = null
    this.faceTrackerVariant = null

    const kind = this.selectedTrackerKind
    const label = kind === 'face' ? this.getFaceTrackerLabel() : 'mouse tracking'
    if (!this.isTrackerSupported(kind)) {
      this.setStatus(`${label} is unavailable in this browser.`, 'error')
      startButton.disabled = true
    } else {
      this.setStatus(`Ready to start. Source: ${label}.`, 'idle')
      startButton.disabled = false
    }
  }

  private ensureTracker(kind: TrackerKind): TrackerInstance {
    if (this.tracker && this.activeTrackerKind === kind) {
      return this.tracker
    }

    this.tracker?.dispose()

    if (kind === 'face') {
      if (this.nativeFaceSupported) {
        this.tracker = new FaceTracker()
        this.faceTrackerVariant = 'native'
      } else if (this.faceMeshSupported) {
        this.tracker = new FaceMeshTracker()
        this.faceTrackerVariant = 'mesh'
      } else {
        throw new Error('Face tracking is not supported in this environment.')
      }
    } else {
      this.tracker = new MouseTracker()
      this.faceTrackerVariant = null
    }

    this.activeTrackerKind = kind
    return this.tracker
  }

  private ensureParallax(tracker: TrackerInstance, kind: TrackerKind): ParallaxScene {
    if (!this.scene) {
      throw new Error('Parallax scene is not mounted yet.')
    }

    if (this.sceneInstance && this.parallaxTrackerKind === kind) {
      return this.sceneInstance
    }

    this.sceneInstance?.destroy()

    this.sceneInstance = createParallaxScene({
      tracker,
      root: this.scene,
      observeMutations: false,
      autoStart: false,
      updateBoundsOnResize: true
    })
    this.parallaxTrackerKind = kind
    return this.sceneInstance
  }

  private setStatus(message: string, state: 'idle' | 'running' | 'error'): void {
    if (!this.statusEl) {
      return
    }
    this.statusEl.textContent = message
    this.statusEl.dataset.state = state
  }

  private resetRefs(): void {
    this.scene = null
    this.statusEl = null
    this.startButton = null
    this.stopButton = null
    this.trackerSelect = null
  }

  private getSelectedTrackerKind(): TrackerKind {
    const value = this.trackerSelect?.value === 'mouse' ? 'mouse' : 'face'
    return value
  }

  private isTrackerSupported(kind: TrackerKind): boolean {
    return kind === 'face' ? this.faceSupported : this.mouseSupported
  }

  private updateTrackerSelection(): void {
    if (!this.trackerSelect) {
      return
    }

    const faceOption = this.trackerSelect.querySelector<HTMLOptionElement>('option[value="face"]')
    const mouseOption = this.trackerSelect.querySelector<HTMLOptionElement>('option[value="mouse"]')

    if (faceOption) {
      faceOption.disabled = !this.faceSupported
    }

    if (mouseOption) {
      mouseOption.disabled = !this.mouseSupported
    }

    if (!this.faceSupported && this.mouseSupported) {
      this.trackerSelect.value = 'mouse'
      this.selectedTrackerKind = 'mouse'
    } else {
      this.trackerSelect.value = 'face'
      this.selectedTrackerKind = 'face'
    }
  }

  private getFaceTrackerLabel(): string {
    if (this.nativeFaceSupported) {
      return 'face tracking'
    }

    if (this.faceMeshSupported) {
      return 'face mesh tracking'
    }

    return 'face tracking'
  }
}
