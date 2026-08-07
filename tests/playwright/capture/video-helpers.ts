/**
 * Video-recording helpers for the capture machine — what a moving recording needs and a still didn't.
 *
 * Playwright records the raw frames (via recordVideo on the context), but it draws NO cursor and it
 * fires input instantly. A recording of instant jumps reads as a machine, not a person. These helpers
 * add the three things the RECORDING STANDARD (screenshot-machine.md) asks for:
 *   • a visible cursor that tracks the real mouse position (injected; Playwright renders none)
 *   • human-tempo motion — the mouse travels in steps instead of teleporting, typing is delayed
 *   • deliberate pauses (beat) on the moments that matter, so a viewer can follow
 *
 * Deterministic by construction: no timing randomness (Math.random is banned in this repo's scripts and
 * would make two runs differ) — every delay is a fixed constant so the same drive produces the same clip.
 */
import type { Page, Locator } from '@playwright/test'

/** Tempo constants — one place to tune the feel of every recording. */
export const TEMPO = {
  moveSteps: 26,   // how many intermediate points the mouse travels through (higher = smoother/slower)
  typeDelay: 55,   // ms between keystrokes
  preClick: 260,   // settle after the cursor arrives, before the click lands
  beatShort: 500,  // a small "let it register" pause
  beatLong: 1100,  // a "look at this" pause on the moments that matter
} as const

/**
 * Inject a cursor that follows page.mouse. Playwright's mouse.move dispatches real mousemove events, so
 * a capturing listener can track them. The node lives on <html> (not the React tree) so client-side SPA
 * navigations never wipe it, and it re-installs on every navigation via addInitScript.
 */
export async function installCursor(page: Page) {
  await page.addInitScript(() => {
    const install = () => {
      if (document.getElementById('__cursor')) return
      const c = document.createElement('div')
      c.id = '__cursor'
      Object.assign(c.style, {
        position: 'fixed', left: '-40px', top: '-40px', width: '24px', height: '24px',
        zIndex: '2147483647', pointerEvents: 'none', willChange: 'left, top',
        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.45))',
      })
      // A simple pointer arrow — theme-neutral (white fill, dark outline reads on light and dark).
      c.innerHTML =
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M5 3 L5 18.5 L9 14.5 L11.6 20.4 L14 19.3 L11.4 13.5 L17 13.5 Z" ' +
        'fill="#ffffff" stroke="#111111" stroke-width="1.3" stroke-linejoin="round"/></svg>'
      document.documentElement.appendChild(c)

      const ring = document.createElement('div')
      ring.id = '__cursor_ring'
      Object.assign(ring.style, {
        position: 'fixed', left: '-40px', top: '-40px', width: '0px', height: '0px',
        borderRadius: '9999px', border: '2px solid rgba(80,80,80,0.6)', zIndex: '2147483646',
        pointerEvents: 'none', transform: 'translate(-50%,-50%)', opacity: '0',
      })
      document.documentElement.appendChild(ring)

      let x = -40, y = -40
      window.addEventListener('mousemove', (e) => {
        x = e.clientX; y = e.clientY
        c.style.left = x + 'px'; c.style.top = y + 'px'
      }, true)
      // A soft click pulse so a click is legible in the video.
      window.addEventListener('mousedown', () => {
        ring.style.left = x + 'px'; ring.style.top = y + 'px'
        ring.animate(
          [
            { width: '6px', height: '6px', opacity: 0.9 },
            { width: '34px', height: '34px', opacity: 0 },
          ],
          { duration: 380, easing: 'ease-out' },
        )
      }, true)
    }
    if (document.body) install()
    else document.addEventListener('DOMContentLoaded', install)
  })
}

/** Move the real mouse to a locator's centre, travelling through intermediate points (not a teleport). */
export async function moveMouseTo(page: Page, locator: Locator, steps = TEMPO.moveSteps) {
  await locator.scrollIntoViewIfNeeded().catch(() => {})
  const box = await locator.boundingBox()
  if (!box) return
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps })
}

/** Park the cursor at an absolute point (travelling there), e.g. a neutral resting spot before we begin. */
export async function moveMouseXY(page: Page, x: number, y: number, steps = TEMPO.moveSteps) {
  await page.mouse.move(x, y, { steps })
}

/** Move to a control, settle, then click — the way a hand does it. */
export async function clickLikeHuman(page: Page, locator: Locator, pause = TEMPO.preClick) {
  await moveMouseTo(page, locator)
  await page.waitForTimeout(pause)
  await locator.click()
}

/** Focus a field the human way, then type with per-key delay. */
export async function typeLikeHuman(page: Page, locator: Locator, text: string, delay = TEMPO.typeDelay) {
  await clickLikeHuman(page, locator, 160)
  await locator.pressSequentially(text, { delay })
}

/** A deliberate pause on a moment that matters, so the viewer can follow. */
export function beat(page: Page, ms: number = TEMPO.beatShort) {
  return page.waitForTimeout(ms)
}
