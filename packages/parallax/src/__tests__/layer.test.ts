import { describe, expect, it, vi } from 'vitest'
import { ParallaxLayer, depthLevelFromDistance } from '../layer'

function createElement(className?: string): HTMLElement {
  const element = document.createElement('div')
  if (className) {
    element.className = className
  }
  document.body.appendChild(element)
  return element
}

describe('ParallaxLayer', () => {
  it('infers depth and direction from class names and applies transforms on update', () => {
    const element = createElement('parallax-layer--depth-2 parallax-layer--direction-same')
    const layer = new ParallaxLayer(element)

    const listener = vi.fn()
    element.addEventListener('update', (event) => listener((event as CustomEvent).detail))

    layer.update({ x: 10, y: 5 }, 0.3)

    expect(element.style.transform).toBe('translate3d(-20.00px, -10.00px, 0)')
    expect(element.getAttribute('data-depth-direction')).toBe('same')
    expect(element.getAttribute('data-depth-state')).toBe(String(depthLevelFromDistance(0.3)))
    expect(listener).toHaveBeenCalled()

    layer.reset()
    expect(element.style.transform).toBe('translate3d(0, 0, 0)')
  })

  it('uses custom attributes when provided', () => {
    const element = createElement()
    element.setAttribute('data-depth', '4')
    element.setAttribute('data-direction', 'inverse')

    const layer = new ParallaxLayer(element, undefined, undefined, {
      depthAttribute: 'data-depth',
      directionAttribute: 'data-direction'
    })

    layer.update({ x: 2, y: 1 }, 0.1)
    expect(element.style.transform).toBe('translate3d(8.00px, 4.00px, 0)')
    expect(element.getAttribute('data-depth-direction')).toBe('inverse')
  })
})
