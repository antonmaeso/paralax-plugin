import './style.css'
import { FaceTracker, type FaceTrackingMetric } from 'tracking'

class DemoUI {
  readonly canvas: HTMLCanvasElement
  private statusEl: HTMLElement
  private startButton: HTMLButtonElement
  private stopButton: HTMLButtonElement
  private metricsEl: HTMLPreElement

  private constructor(
    statusEl: HTMLElement,
    startButton: HTMLButtonElement,
    stopButton: HTMLButtonElement,
    metricsEl: HTMLPreElement,
    canvas: HTMLCanvasElement
  ) {
    this.statusEl = statusEl
    this.startButton = startButton
    this.stopButton = stopButton
    this.metricsEl = metricsEl
    this.canvas = canvas
  }

  static mount(root: HTMLElement): DemoUI {
    root.innerHTML = `
      <main>
        <header>
          <h1>Face Tracking Demo</h1>
          <p class="status" data-status data-state="idle">Initialising…</p>
        </header>
        <section class="controls">
          <button type="button" data-action="start">Start tracking</button>
          <button type="button" data-action="stop" data-variant="secondary" disabled>Stop tracking</button>
        </section>
        <section class="metrics">
          <h2>Metrics</h2>
          <pre data-metrics>Waiting for tracker…</pre>
        </section>
        <section class="preview">
          <h2>Live preview</h2>
          <canvas data-overlay width="640" height="480"></canvas>
        </section>
      </main>
    `

    const statusEl = root.querySelector<HTMLElement>('[data-status]')
    const startButton = root.querySelector<HTMLButtonElement>('button[data-action="start"]')
    const stopButton = root.querySelector<HTMLButtonElement>('button[data-action="stop"]')
    const metricsEl = root.querySelector<HTMLPreElement>('[data-metrics]')
    const canvas = root.querySelector<HTMLCanvasElement>('canvas[data-overlay]')

    if (!statusEl || !startButton || !stopButton || !metricsEl || !canvas) {
      throw new Error('Demo UI failed to initialise')
    }

    return new DemoUI(statusEl, startButton, stopButton, metricsEl, canvas)
  }

  onStart(handler: () => void): void {
    this.startButton.addEventListener('click', handler)
  }

  onStop(handler: () => void): void {
    this.stopButton.addEventListener('click', handler)
  }

  setStatus(message: string, state: 'idle' | 'running' | 'error'): void {
    this.statusEl.textContent = message
    this.statusEl.dataset.state = state
  }

  setMetrics(message: string): void {
    this.metricsEl.textContent = message
  }

  setStartEnabled(enabled: boolean): void {
    this.startButton.disabled = !enabled
  }

  setStopEnabled(enabled: boolean): void {
    this.stopButton.disabled = !enabled
  }
}

class OverlayRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D

  private constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas
    this.ctx = ctx
  }

  static fromCanvas(canvas: HTMLCanvasElement): OverlayRenderer {
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Canvas 2D context is not supported in this browser')
    }

    return new OverlayRenderer(canvas, context)
  }

  draw(video: HTMLVideoElement | null, metric: FaceTrackingMetric | null): void {
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      this.drawPlaceholder('Camera stream is preparing…')
      return
    }

    if (this.canvas.width !== video.videoWidth || this.canvas.height !== video.videoHeight) {
      this.canvas.width = video.videoWidth
      this.canvas.height = video.videoHeight
    }

    this.ctx.drawImage(video, 0, 0, this.canvas.width, this.canvas.height)

    if (metric) {
      this.drawBoundingBox(metric)
      this.drawEyes(metric)
      return
    }

    this.drawPlaceholder('No face detected', false)
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  private drawBoundingBox(metric: FaceTrackingMetric): void {
    const x = metric.relativeBox.x * this.canvas.width
    const y = metric.relativeBox.y * this.canvas.height
    const width = metric.relativeBox.width * this.canvas.width
    const height = metric.relativeBox.height * this.canvas.height

    this.ctx.save()
    this.ctx.strokeStyle = '#22c55e'
    this.ctx.lineWidth = Math.max(2, this.canvas.width * 0.005)
    this.ctx.shadowColor = 'rgba(34, 197, 94, 0.35)'
    this.ctx.shadowBlur = 24
    this.ctx.strokeRect(x, y, width, height)
    this.ctx.restore()
  }

  private drawEyes(metric: FaceTrackingMetric): void {
    const { eyes } = metric
    if (eyes.left) {
      this.drawEyeMarker(eyes.left)
    }
    if (eyes.right) {
      this.drawEyeMarker(eyes.right)
    }
  }

  private drawEyeMarker(point: { x: number; y: number }): void {
    const radius = Math.max(4, this.canvas.width * 0.01)
    const cx = point.x * this.canvas.width
    const cy = point.y * this.canvas.height

    this.ctx.save()
    this.ctx.beginPath()
    this.ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    this.ctx.fillStyle = '#38bdf8'
    this.ctx.shadowColor = 'rgba(56, 189, 248, 0.45)'
    this.ctx.shadowBlur = 18
    this.ctx.fill()
    this.ctx.lineWidth = Math.max(1, radius * 0.35)
    this.ctx.strokeStyle = '#0ea5e9'
    this.ctx.stroke()
    this.ctx.restore()
  }

  private drawPlaceholder(label: string, fill = true): void {
    this.ctx.save()
    if (fill) {
      this.ctx.fillStyle = 'rgba(15, 23, 42, 0.35)'
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    }
    this.ctx.fillStyle = '#e2e8f0'
    this.ctx.font = `${Math.max(18, this.canvas.width * 0.035)}px Inter, system-ui, sans-serif`
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillText(label, this.canvas.width / 2, this.canvas.height / 2)
    this.ctx.restore()
  }
}

class FaceTrackingDemo {
  private ui: DemoUI
  private overlay: OverlayRenderer
  private tracker: FaceTracker | null
  private unsubscribe: (() => void) | null
  private latestMetric: FaceTrackingMetric | null
  private drawHandle: number | null

  constructor(ui: DemoUI, overlay: OverlayRenderer) {
    this.ui = ui
    this.overlay = overlay
    this.tracker = null
    this.unsubscribe = null
    this.latestMetric = null
    this.drawHandle = null

    this.ui.onStart(() => {
      void this.start()
    })
    this.ui.onStop(() => {
      this.stop()
    })

    window.addEventListener('beforeunload', () => {
      this.dispose()
    })
  }

  initialise(): void {
    const supported = FaceTracker.isSupported()
    console.info('[FaceTrackingDemo] FaceTracker.isSupported()', supported)

    if (!supported) {
      this.ui.setStatus('Face tracking is not supported in this browser.', 'error')
      this.ui.setStartEnabled(false)
      this.ui.setStopEnabled(false)
      this.ui.setMetrics('The FaceDetector API or camera access is unavailable.')
      return
    }

    this.tracker = new FaceTracker()
    console.info('[FaceTrackingDemo] Tracker initialised; enabling Start button.')
    this.ui.setStatus('Ready when you are.', 'idle')
    this.ui.setMetrics('Click "Start tracking" to begin.')
    this.ui.setStartEnabled(true)
  }

  private async start(): Promise<void> {
    if (!this.tracker || this.tracker.isRunning) {
      console.warn('[FaceTrackingDemo] Start requested but tracker is missing or already running.', {
        hasTracker: Boolean(this.tracker),
        isRunning: this.tracker?.isRunning ?? false
      })
      return
    }

    this.ui.setStartEnabled(false)
    this.ui.setStopEnabled(false)
    this.ui.setStatus('Requesting camera access…', 'idle')
    console.info('[FaceTrackingDemo] Requesting camera access via tracker.start()')

    try {
      await this.tracker.start()

      if (!this.unsubscribe) {
        this.unsubscribe = this.tracker.subscribe((metric) => {
          this.latestMetric = metric
          this.updateMetrics(metric)
        })
      }

      this.ui.setStatus('Tracking in progress.', 'running')
      this.ui.setStopEnabled(true)
      this.startOverlayLoop()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      this.ui.setStatus(`Unable to start tracking: ${message}`, 'error')
      console.error('[FaceTrackingDemo] Failed to start tracker', error)
      this.ui.setStartEnabled(true)
      this.stopOverlayLoop()
    }
  }

  private stop(): void {
    if (!this.tracker || !this.tracker.isRunning) {
      console.warn('[FaceTrackingDemo] Stop requested but tracker is missing or already stopped.', {
        hasTracker: Boolean(this.tracker),
        isRunning: this.tracker?.isRunning ?? false
      })
      return
    }

    this.tracker.stop()
    this.ui.setStatus('Tracking stopped.', 'idle')
    this.ui.setStartEnabled(true)
    this.ui.setStopEnabled(false)
    this.stopOverlayLoop()
    this.latestMetric = null
    this.ui.setMetrics('Awaiting face detection…')
  }

  private dispose(): void {
    if (this.tracker) {
      this.tracker.dispose()
    }
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }
    this.stopOverlayLoop()
  }

  private updateMetrics(metric: FaceTrackingMetric | null): void {
    if (!metric) {
      this.ui.setMetrics('Awaiting face detection…')
      return
    }

    const percent = (value: number) => `${(value * 100).toFixed(1)}%`
    const formatNumber = (value: number) => value.toFixed(1)
    const formatPoint = (point?: { x: number; y: number }) => {
      if (!point) {
        return 'n/a'
      }
      return `(${percent(point.x)}, ${percent(point.y)})`
    }

    const lines = [
      `timestamp: ${metric.timestamp.toFixed(0)} ms`,
      `center (normalized): (${percent(metric.center.x)}, ${percent(metric.center.y)})`,
      `box (px): x=${formatNumber(metric.box.x)}, y=${formatNumber(metric.box.y)}, w=${formatNumber(metric.box.width)}, h=${formatNumber(metric.box.height)}`,
      `box (normalized): x=${percent(metric.relativeBox.x)}, y=${percent(metric.relativeBox.y)}, w=${percent(metric.relativeBox.width)}, h=${percent(metric.relativeBox.height)}`,
      `landmarks: ${metric.landmarks.length}`,
      `eyes (normalized): left=${formatPoint(metric.eyes.left)}, right=${formatPoint(metric.eyes.right)}`
    ]

    this.ui.setMetrics(lines.join('\n'))
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
      this.overlay.draw(video ?? null, this.latestMetric)
      this.drawHandle = requestAnimationFrame(draw)
    }

    this.drawHandle = requestAnimationFrame(draw)
  }

  private stopOverlayLoop(): void {
    if (this.drawHandle !== null) {
      cancelAnimationFrame(this.drawHandle)
      this.drawHandle = null
    }
    this.overlay.clear()
  }
}

function bootstrap(): void {
  const root = document.querySelector<HTMLDivElement>('#app')
  if (!root) {
    throw new Error('Unable to locate #app container')
  }

  const ui = DemoUI.mount(root)
  const overlay = OverlayRenderer.fromCanvas(ui.canvas)
  const demo = new FaceTrackingDemo(ui, overlay)
  demo.initialise()
}

bootstrap()
