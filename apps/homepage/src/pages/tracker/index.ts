import './style.css'
import { FaceTracker, type FaceTrackingMetric } from 'tracking'

interface PageController {
  mount(container: HTMLElement): void
  destroy(): void
}

export function createFaceTrackingPage(): PageController {
  return new FaceTrackingPage()
}

class FaceTrackingPage implements PageController {
  private container: HTMLElement | null = null
  private tracker: FaceTracker | null = null
  private unsubscribe: (() => void) | null = null
  private drawHandle: number | null = null
  private latestMetric: FaceTrackingMetric | null = null

  private statusEl: HTMLElement | null = null
  private startButton: HTMLButtonElement | null = null
  private stopButton: HTMLButtonElement | null = null
  private metricsEl: HTMLPreElement | null = null
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null

  mount(container: HTMLElement): void {
    this.container = container
    this.render()
    this.hydrate()
    this.initialise()
  }

  destroy(): void {
    window.removeEventListener('beforeunload', this.handleBeforeUnload)
    this.startButton?.removeEventListener('click', this.handleStart)
    this.stopButton?.removeEventListener('click', this.handleStop)
    this.stopOverlayLoop()
    if (this.tracker) {
      this.tracker.dispose()
    }
    this.unsubscribe?.()
    this.resetRefs()
    this.container = null
  }

  private render(): void {
    if (!this.container) {
      return
    }

    this.container.innerHTML = `
      <div class="tracker-root">
        <section class="tracker-card">
          <header>
            <h1>Face Tracking Demo</h1>
            <p>Visualise camera feed, metrics, and face landmarks detected in real time.</p>
          </header>
          <p class="tracker-status" data-status data-state="idle">Initialising…</p>
          <div class="tracker-actions">
            <button type="button" data-action="start" disabled>Start tracking</button>
            <button type="button" data-action="stop" data-variant="secondary" disabled>Stop tracking</button>
          </div>
          <pre class="metrics-block" data-metrics>Preparing tracker…</pre>
        </section>
        <section class="tracker-canvas">
          <canvas data-overlay width="640" height="480"></canvas>
        </section>
      </div>
    `
  }

  private hydrate(): void {
    if (!this.container) {
      return
    }

    this.statusEl = this.container.querySelector<HTMLElement>('[data-status]')
    this.startButton = this.container.querySelector<HTMLButtonElement>('button[data-action="start"]')
    this.stopButton = this.container.querySelector<HTMLButtonElement>('button[data-action="stop"]')
    this.metricsEl = this.container.querySelector<HTMLPreElement>('[data-metrics]')
    this.canvas = this.container.querySelector<HTMLCanvasElement>('canvas[data-overlay]')

    if (!this.statusEl || !this.startButton || !this.stopButton || !this.metricsEl || !this.canvas) {
      throw new Error('Failed to initialise face tracking page UI')
    }

    this.ctx = this.canvas.getContext('2d')
    if (!this.ctx) {
      throw new Error('Canvas 2D context not available in this browser')
    }

    this.startButton.addEventListener('click', this.handleStart)
    this.stopButton.addEventListener('click', this.handleStop)
    window.addEventListener('beforeunload', this.handleBeforeUnload)
  }

  private initialise(): void {
    const supported = FaceTracker.isSupported()
    console.info('[Homepage:Tracker] FaceTracker.isSupported()', supported)

    if (!supported) {
      this.setStatus('Face tracking is not supported in this browser.', 'error')
      this.startButton!.disabled = true
      this.stopButton!.disabled = true
      this.metricsEl!.textContent = 'Enable FaceDetector API in your browser to try the demo.'
      return
    }

    this.tracker = new FaceTracker()
    this.setStatus('Ready when you are.', 'idle')
    this.metricsEl!.textContent = 'Click "Start tracking" to begin.'
    this.startButton!.disabled = false
  }

  private handleStart = async (): Promise<void> => {
    if (!this.tracker || this.tracker.isRunning) {
      console.warn('[Homepage:Tracker] Start ignored. Tracker missing or already running.', {
        hasTracker: Boolean(this.tracker),
        running: this.tracker?.isRunning ?? false
      })
      return
    }

    this.startButton!.disabled = true
    this.stopButton!.disabled = true
    this.setStatus('Requesting camera access…', 'idle')

    try {
      await this.tracker.start()
      if (!this.unsubscribe) {
        this.unsubscribe = this.tracker.subscribe((metric) => {
          this.latestMetric = metric
          this.updateMetrics(metric)
        })
      }

      this.setStatus('Tracking in progress.', 'running')
      this.stopButton!.disabled = false
      this.startOverlayLoop()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      this.setStatus(`Unable to start tracking: ${message}`, 'error')
      this.startButton!.disabled = false
      this.stopOverlayLoop()
      console.error('[Homepage:Tracker] Failed to start tracker', error)
    }
  }

  private handleStop = (): void => {
    if (!this.tracker || !this.tracker.isRunning) {
      console.warn('[Homepage:Tracker] Stop ignored. Tracker missing or not running.', {
        hasTracker: Boolean(this.tracker),
        running: this.tracker?.isRunning ?? false
      })
      return
    }

    this.tracker.stop()
    this.setStatus('Tracking stopped.', 'idle')
    this.startButton!.disabled = false
    this.stopButton!.disabled = true
    this.stopOverlayLoop()
    this.metricsEl!.textContent = 'Awaiting face detection…'
  }

  private handleBeforeUnload = (): void => {
    if (this.tracker) {
      this.tracker.dispose()
    }
    this.unsubscribe?.()
    this.stopOverlayLoop()
  }

  private setStatus(message: string, state: 'idle' | 'running' | 'error'): void {
    if (!this.statusEl) {
      return
    }

    this.statusEl.textContent = message
    this.statusEl.dataset.state = state
  }

  private startOverlayLoop(): void {
    if (this.drawHandle !== null) {
      return
    }

    const draw = () => {
      if (!this.tracker || !this.tracker.isRunning) {
        this.drawHandle = null
        return
      }

      const video = document.querySelector<HTMLVideoElement>('video[data-face-tracker="hidden"]')
      if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        this.drawHandle = requestAnimationFrame(draw)
        return
      }

      if (!this.canvas || !this.ctx) {
        this.drawHandle = null
        return
      }

      const width = video.videoWidth
      const height = video.videoHeight

      if (this.canvas.width !== width || this.canvas.height !== height) {
        this.canvas.width = width
        this.canvas.height = height
      }

      this.ctx.drawImage(video, 0, 0, this.canvas.width, this.canvas.height)

      if (this.latestMetric) {
        this.drawBoundingBox(this.latestMetric)
      } else {
        this.drawPlaceholder()
      }

      this.drawHandle = requestAnimationFrame(draw)
    }

    this.drawHandle = requestAnimationFrame(draw)
  }

  private stopOverlayLoop(): void {
    if (this.drawHandle !== null) {
      cancelAnimationFrame(this.drawHandle)
      this.drawHandle = null
    }

    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    }
  }

  private drawBoundingBox(metric: FaceTrackingMetric): void {
    if (!this.ctx || !this.canvas) {
      return
    }

    this.ctx.save()
    this.ctx.strokeStyle = '#22c55e'
    this.ctx.lineWidth = Math.max(2, this.canvas.width * 0.005)
    this.ctx.shadowColor = 'rgba(34, 197, 94, 0.35)'
    this.ctx.shadowBlur = 24

    const x = metric.relativeBox.x * this.canvas.width
    const y = metric.relativeBox.y * this.canvas.height
    const width = metric.relativeBox.width * this.canvas.width
    const height = metric.relativeBox.height * this.canvas.height

    this.ctx.strokeRect(x, y, width, height)
    this.ctx.restore()
  }

  private drawPlaceholder(): void {
    if (!this.ctx || !this.canvas) {
      return
    }

    this.ctx.save()
    this.ctx.fillStyle = 'rgba(15, 23, 42, 0.35)'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    this.ctx.fillStyle = '#e2e8f0'
    this.ctx.font = `${Math.max(18, this.canvas.width * 0.035)}px Inter, system-ui, sans-serif`
    this.ctx.textAlign = 'center'
    this.ctx.fillText('No face detected', this.canvas.width / 2, this.canvas.height / 2)
    this.ctx.restore()
  }

  private updateMetrics(metric: FaceTrackingMetric | null): void {
    if (!this.metricsEl) {
      return
    }

    if (!metric) {
      this.metricsEl.textContent = 'Awaiting face detection…'
      return
    }

    const percent = (value: number) => `${(value * 100).toFixed(1)}%`
    const formatNumber = (value: number) => value.toFixed(1)

    const lines = [
      `timestamp: ${metric.timestamp.toFixed(0)} ms`,
      `center (normalized): (${percent(metric.center.x)}, ${percent(metric.center.y)})`,
      `box (px): x=${formatNumber(metric.box.x)}, y=${formatNumber(metric.box.y)}, w=${formatNumber(metric.box.width)}, h=${formatNumber(metric.box.height)}`,
      `box (normalized): x=${percent(metric.relativeBox.x)}, y=${percent(metric.relativeBox.y)}, w=${percent(metric.relativeBox.width)}, h=${percent(metric.relativeBox.height)}`,
      `landmarks: ${metric.landmarks.length}`,
      `eyes (normalized): left=${formatPoint(metric.eyes.left)}, right=${formatPoint(metric.eyes.right)}`
    ]

    this.metricsEl.textContent = lines.join('\n')
  }

  private resetRefs(): void {
    this.statusEl = null
    this.startButton = null
    this.stopButton = null
    this.metricsEl = null
    this.canvas = null
    this.ctx = null
    this.latestMetric = null
  }
}

function formatPoint(point?: { x: number; y: number }): string {
  if (!point) {
    return 'n/a'
  }
  const percent = (value: number) => `${(value * 100).toFixed(1)}%`
  return `(${percent(point.x)}, ${percent(point.y)})`
}
