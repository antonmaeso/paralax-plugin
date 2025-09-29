interface CameraSessionOptions {
  constraints: MediaTrackConstraints
}

export class CameraSession {
  private readonly options: CameraSessionOptions
  private stream: MediaStream | null
  private video: HTMLVideoElement | null

  constructor(options: CameraSessionOptions) {
    this.options = options
    this.stream = null
    this.video = null
  }

  async open(): Promise<HTMLVideoElement> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('MediaDevices API is unavailable in this environment')
    }

    if (this.video && this.stream) {
      return this.video
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: this.options.constraints
    })

    const video = this.video ?? createHiddenVideoElement()
    video.srcObject = stream
    await video.play()

    this.stream = stream
    this.video = video

    return video
  }

  stop(): void {
    if (this.video) {
      this.video.pause()
      this.video.srcObject = null
    }

    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop()
      }
    }

    this.stream = null
  }

  dispose(): void {
    this.stop()
    if (this.video?.parentNode) {
      this.video.parentNode.removeChild(this.video)
    }
    this.video = null
  }

  getVideo(): HTMLVideoElement | null {
    return this.video
  }
}

function createHiddenVideoElement(): HTMLVideoElement {
  if (typeof document === 'undefined') {
    throw new Error('CameraSession requires a browser environment')
  }

  const video = document.createElement('video')
  video.autoplay = true
  video.muted = true
  video.playsInline = true
  video.style.position = 'fixed'
  video.style.width = '0'
  video.style.height = '0'
  video.style.opacity = '0'
  video.style.pointerEvents = 'none'
  video.setAttribute('data-face-tracker', 'hidden')

  document.body.appendChild(video)
  return video
}
