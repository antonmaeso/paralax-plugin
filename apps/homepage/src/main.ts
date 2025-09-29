import './style.css'
import { renderHome } from './pages/home'
import { createFaceTrackingPage } from './pages/tracker'
import { createParallaxPage } from './pages/parallax'

interface NavigablePage {
  mount(container: HTMLElement): void
  destroy(): void
}

type RouteKey = 'home' | 'tracker' | 'parallax'

type PageFactory = () => NavigablePage

const ROUTES: Record<RouteKey, PageFactory> = {
  home: createHomePage,
  tracker: createFaceTrackingPage,
  parallax: createParallaxPage
}

const appRoot = document.querySelector<HTMLDivElement>('#app')
if (!appRoot) {
  throw new Error('Unable to find #app container')
}

template(appRoot)

const content = appRoot.querySelector<HTMLElement>('[data-content]')
const tabs = Array.from(appRoot.querySelectorAll<HTMLButtonElement>('[data-route]'))

if (!content || tabs.length === 0) {
  throw new Error('Malformed homepage template')
}

let currentRoute: RouteKey = getInitialRoute()
let controller: NavigablePage | null = null

for (const tab of tabs) {
  tab.addEventListener('click', () => {
    const route = tab.dataset.route as RouteKey | undefined
    if (!route || route === currentRoute) {
      return
    }
    navigate(route, true)
  })
}

window.addEventListener('popstate', (event) => {
  const route = (event.state as RouteKey | undefined) ?? 'home'
  navigate(route, false)
})

navigate(currentRoute, false)
history.replaceState(currentRoute, '', window.location.pathname + window.location.search + window.location.hash)

function navigate(route: RouteKey, pushHistory: boolean): void {
  if (!content) {
    return
  }

  if (controller) {
    controller.destroy()
    controller = null
  }

  content.innerHTML = ''

  if (route === 'home') {
    renderHome(content)
  } else {
    controller = ROUTES[route]()
    controller.mount(content)
  }

  currentRoute = route
  updateTabs(route)

  if (pushHistory) {
    history.pushState(route, '', route === 'home' ? '/' : `/${route}`)
  }
}

function updateTabs(active: RouteKey): void {
  for (const tab of tabs) {
    const route = tab.dataset.route as RouteKey | undefined
    if (!route) {
      continue
    }
    tab.setAttribute('aria-current', route === active ? 'page' : 'false')
  }
}

function getInitialRoute(): RouteKey {
  const state = history.state as RouteKey | null
  if (state) {
    return state
  }

  const path = window.location.pathname.replace(/\/+$/, '')
  if (path.endsWith('/tracker')) {
    return 'tracker'
  }
  if (path.endsWith('/parallax')) {
    return 'parallax'
  }
  return 'home'
}

function template(root: HTMLElement): void {
  root.innerHTML = `
    <div class="layout">
      <header>
        <nav>
          <div class="brand">
            <span>Paralax</span>
            <span>Face-driven experiments</span>
          </div>
          <div class="tabs">
            <button class="tab" data-route="home" aria-current="page">Overview</button>
            <button class="tab" data-route="tracker" aria-current="false">Face Tracking Demo</button>
            <button class="tab" data-route="parallax" aria-current="false">Parallax Playground</button>
          </div>
        </nav>
      </header>
      <main data-content></main>
    </div>
  `
}

function createHomePage(): NavigablePage {
  return {
    mount(container: HTMLElement) {
      renderHome(container)
    },
    destroy() {
      /* no-op */
    }
  }
}
