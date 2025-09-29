export function renderHome(container: HTMLElement): void {
  container.innerHTML = `
    <section class="section">
      <h1>Paralax Playground</h1>
      <p>
        Explore face driven experiences powered by the experimental FaceDetector API.
        Choose a page from the navigation above to launch an interactive demo.
      </p>
      <ul>
        <li>
          <strong>Face Tracking Demo</strong>
          Visualise bounding boxes, metrics, and camera feed overlays driven by your camera input.
        </li>
        <li>
          <strong>Parallax Playground</strong>
          Layered UI elements counter your face movement to create a depth filled parallax effect.
        </li>
      </ul>
    </section>
  `
}
