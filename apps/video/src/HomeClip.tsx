import React from 'react'
import {
  AbsoluteFill,
  OffthreadVideo,
  Img,
  Sequence,
  staticFile,
  interpolate,
  Easing,
  useCurrentFrame,
} from 'remotion'
import { loadFont } from '@remotion/google-fonts/IBMPlexSans'
import { tokensFor, type Theme, type Tokens } from './tokens'

const { fontFamily } = loadFont()

// A simulated walkthrough, rebuilt as fifteen self-contained moments. Each moment is one coherent
// unit — the cursor MOVES to the control, ARRIVES, the click pulse fires on that exact frame, the
// screen switches to the result, then a real HOLD lets it read before the next move begins. Cursor
// and screen never run on separate clocks: a move phase keeps its screen fixed, and every screen
// change lands on a frame where the cursor has already come to rest. Bookended by a brand frame (the
// core-flow recording full-frame at the open — the beat-1 edge fix — and a wordmark card at the
// close), and the export beat keeps the full-page → menu zoom. Only remotion interpolate/Easing — no
// extra package.
export const FPS = 30
export const WIDTH = 1280
export const HEIGHT = 720
export const PLAYBACK_RATE = 1.25 // the intro recording plays a touch faster
const XFADE = 6                   // quick cross-dissolve, only ever while the cursor is at rest
const SETTLE = 0                  // the move ends exactly on the phase boundary, so the arrival frame IS the
                                  // pulse/change frame, and the cursor is at rest from that frame on (it won't move next frame)

export type HomeClipProps = { theme: Theme }

// Cursor rest points on each screen (fraction of the frame), aimed at the real control being clicked.
const POS: Record<string, [number, number]> = {
  FIELD: [0.43, 0.44],
  EXTRACT_A: [0.77, 0.44],
  EXTRACT_D: [0.55, 0.66],
  VIEWLIB: [0.76, 0.50],
  ROW: [0.25, 0.12],
  DIALOG: [0.55, 0.55],
  EXPORT: [0.66, 0.30],
}
const V = '__video'
const CARD = '__card'

// The scenario as phases. A `move` phase glides the cursor to POS[move] over its duration (keeping its
// screen fixed); a `pulse` phase fires the click ring on its FIRST frame, at the point the cursor just
// reached, and shows the click's result screen; plain phases are holds. Screen changes only ever occur
// at a phase boundary where the cursor is at rest.
type Phase = { d: number; s: string; move?: keyof typeof POS; pulse?: boolean; zoom?: boolean }
const PHASES: Phase[] = [
  { d: 30, s: V },                                             // brand intro (recording, full frame)
  { d: 20, s: 'input-empty' },                                 // m1/m2: cursor appears at the field, types (no empty-field rest)
  { d: 28, s: 'input-empty', move: 'EXTRACT_A' },              // m3: move to Extract
  { d: 44, s: 'progress-downloading', pulse: true },           // m3 click → m4 loading (pulse on arrival)
  { d: 54, s: 'error-no_captions' },                           // m5: no-captions error
  { d: 54, s: 'cost-card-ai' },                                // m6: AI chosen → cost card
  { d: 28, s: 'cost-card-ai', move: 'EXTRACT_D' },             // m7: move to Extract
  { d: 44, s: 'progress-downloading', pulse: true },           // m7 click → m8 AI loading
  { d: 54, s: 'success-card' },                                // m9: success
  { d: 28, s: 'success-card', move: 'VIEWLIB' },               // m10: move to View in Library
  { d: 54, s: 'library-unread', pulse: true },                 // m10 click → m11 library
  { d: 28, s: 'library-unread', move: 'ROW' },                 // m11: move to the unread row
  { d: 54, s: 'transcript-speakers', pulse: true },            // m11 click → m12 viewer
  { d: 28, s: 'transcript-speakers', move: 'DIALOG' },         // reposition for the dialog
  { d: 48, s: 'speaker-dialog' },                              // m13: rename-speakers dialog
  { d: 54, s: 'timestamps-on' },                               // m14: timestamps view
  { d: 22, s: 'export-page' },                                 // m15: export page appears
  { d: 28, s: 'export-page', move: 'EXPORT' },                 // m15: move to Export
  { d: 54, s: 'export-page', pulse: true, zoom: true },        // m15 click → zoom into the menu
  { d: 24, s: 'export-page' },                                 // m15: hold on the framed menu
  { d: 42, s: CARD },                                          // brand outro (wordmark)
]

type Seg = { from: number; dur: number; s: string; zoomFrom: number; zoomTo: number }
type KF = { f: number; x: number; y: number }
const SEGMENTS: Seg[] = []
const CUR_KF: KF[] = []
const PULSES: { f: number; x: number; y: number }[] = []
;(() => {
  let t = 0
  let pos: [number, number] = POS.FIELD
  CUR_KF.push({ f: 0, x: pos[0] * WIDTH, y: pos[1] * HEIGHT })
  let zoomFrom = -1
  let zoomTo = -1
  PHASES.forEach((p) => {
    const from = t
    if (p.move) {
      const target = POS[p.move]
      CUR_KF.push({ f: from, x: pos[0] * WIDTH, y: pos[1] * HEIGHT })
      CUR_KF.push({ f: from + p.d - SETTLE, x: target[0] * WIDTH, y: target[1] * HEIGHT })
      pos = target
    }
    if (p.pulse) PULSES.push({ f: from, x: pos[0] * WIDTH, y: pos[1] * HEIGHT })
    if (p.zoom) { zoomFrom = from; zoomTo = from + p.d }
    const last = SEGMENTS[SEGMENTS.length - 1]
    if (last && last.s === p.s) last.dur += p.d
    else SEGMENTS.push({ from, dur: p.d, s: p.s, zoomFrom: -1, zoomTo: -1 })
    t += p.d
  })
  const k = SEGMENTS.find((sg) => sg.s === 'export-page')!
  k.zoomFrom = zoomFrom
  k.zoomTo = zoomTo
})()
export const DURATION_IN_FRAMES = SEGMENTS.reduce((m, s) => Math.max(m, s.from + s.dur), 0)
const CURSOR_APPEAR = PHASES[0].d
const EXPORT_PULSE = PULSES[PULSES.length - 1].f

// Ease only when the two keyframes differ (a real move); a same-point pair stays perfectly still.
function cursorAt(frame: number): [number, number] {
  if (frame <= CUR_KF[0].f) return [CUR_KF[0].x, CUR_KF[0].y]
  for (let i = 0; i < CUR_KF.length - 1; i++) {
    const a = CUR_KF[i]
    const b = CUR_KF[i + 1]
    if (frame >= a.f && frame <= b.f) {
      if (a.x === b.x && a.y === b.y) return [a.x, a.y]
      const raw = (frame - a.f) / (b.f - a.f)
      const e = Easing.inOut(Easing.ease)(raw)
      return [a.x + (b.x - a.x) * e, a.y + (b.y - a.y) * e]
    }
  }
  const last = CUR_KF[CUR_KF.length - 1]
  return [last.x, last.y]
}

// ── export-page zoom (unchanged geometry) ──
const EXPORT_PAGE_W = 1280
const EXPORT_PAGE_H = 800
const MENU = { x: 808.5, y: 309.5, w: 224, h: 457 }
const zoomFit = Math.min(WIDTH / EXPORT_PAGE_W, HEIGHT / EXPORT_PAGE_H)
const menuCx = (WIDTH - EXPORT_PAGE_W * zoomFit) / 2 + (MENU.x + MENU.w / 2) * zoomFit
const menuCy = (HEIGHT - EXPORT_PAGE_H * zoomFit) / 2 + (MENU.y + MENU.h / 2) * zoomFit
const ZOOM_END = (HEIGHT / (MENU.h * zoomFit)) * 0.92
const ZOOM_TX = WIDTH / 2 - ZOOM_END * menuCx
const ZOOM_TY = HEIGHT / 2 - ZOOM_END * menuCy

const Still: React.FC<{ src: string; tokens: Tokens }> = ({ src, tokens }) => (
  <AbsoluteFill style={{ background: tokens.bg, justifyContent: 'center', alignItems: 'center' }}>
    <Img src={staticFile(src)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
  </AbsoluteFill>
)

const ExportZoom: React.FC<{ theme: Theme; tokens: Tokens; zoomStart: number; zoomEnd: number }> = ({ theme, tokens, zoomStart, zoomEnd }) => {
  const frame = useCurrentFrame()
  const p = interpolate(frame, [zoomStart, zoomEnd], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return (
    <AbsoluteFill style={{ background: tokens.bg }}>
      <AbsoluteFill style={{ transformOrigin: '0 0', transform: `translate(${ZOOM_TX * p}px, ${ZOOM_TY * p}px) scale(${1 + (ZOOM_END - 1) * p})` }}>
        <Img src={staticFile(`export-page-${theme}.png`)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

const BrandVideo: React.FC<{ theme: Theme; tokens: Tokens }> = ({ theme, tokens }) => (
  <AbsoluteFill style={{ background: tokens.bg }}>
    <OffthreadVideo src={staticFile(theme === 'dark' ? 'core-flow-dark.webm' : 'core-flow.webm')} playbackRate={PLAYBACK_RATE} trimBefore={55} />
  </AbsoluteFill>
)

const BrandCard: React.FC<{ tokens: Tokens }> = ({ tokens }) => (
  <AbsoluteFill style={{ background: tokens.bg, justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 14 }}>
    <div style={{ fontFamily, fontSize: 68, fontWeight: 800, letterSpacing: '-0.03em', color: tokens.fgStrong }}>
      INDXR<span style={{ color: tokens.accent }}>.AI</span>
    </div>
    <div style={{ fontFamily, fontSize: 24, fontWeight: 500, color: tokens.fgMuted }}>One library for everything you read instead of watch</div>
  </AbsoluteFill>
)

const FadeIn: React.FC<{ xfade: number; children: React.ReactNode }> = ({ xfade, children }) => {
  const frame = useCurrentFrame()
  const opacity = xfade > 0 ? interpolate(frame, [0, xfade], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>
}

const Ring: React.FC<{ p: { f: number; x: number; y: number }; accent: string }> = ({ p, accent }) => {
  const frame = useCurrentFrame()
  if (frame < p.f - 1 || frame > p.f + 20) return null
  const t = interpolate(frame, [p.f, p.f + 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return (
    <div style={{ position: 'absolute', left: p.x, top: p.y, width: 60, height: 60, marginLeft: -30, marginTop: -30, borderRadius: '50%', border: `3px solid ${accent}`, transform: `scale(${0.4 + t * 1.4})`, opacity: interpolate(t, [0, 1], [0.55, 0]) }} />
  )
}

const Cursor: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame()
  const [x, y] = cursorAt(frame)
  const opacity = interpolate(frame, [CURSOR_APPEAR + 4, CURSOR_APPEAR + 12, EXPORT_PULSE + 8, EXPORT_PULSE + 24], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const press = PULSES.reduce((m, p) => Math.min(m, interpolate(frame, [p.f - 4, p.f, p.f + 6], [1, 0.82, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })), 1)
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {PULSES.map((p, i) => <Ring key={i} p={p} accent={accent} />)}
      <div style={{ position: 'absolute', left: x, top: y, transform: `scale(${press})`, transformOrigin: '4px 3px', opacity, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.45))' }}>
        <svg width="27" height="27" viewBox="0 0 26 26" style={{ display: 'block' }}>
          <path d="M5 2 L5 20 L10 15.5 L13 22 L16 20.5 L13 14.5 L19.5 14.5 Z" fill="#ffffff" stroke="#111111" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      </div>
    </AbsoluteFill>
  )
}

function renderSeg(seg: Seg, theme: Theme, tokens: Tokens): React.ReactNode {
  if (seg.s === V) return <BrandVideo theme={theme} tokens={tokens} />
  if (seg.s === CARD) return <BrandCard tokens={tokens} />
  // The export-page Sequence starts XFADE frames early (cross-dissolve lead), so its local clock is
  // shifted by +XFADE relative to the segment start.
  if (seg.s === 'export-page') return <ExportZoom theme={theme} tokens={tokens} zoomStart={seg.zoomFrom - seg.from + XFADE} zoomEnd={seg.zoomTo - seg.from + XFADE} />
  return <Still src={`${seg.s}-${theme}.png`} tokens={tokens} />
}

export const HomeClip: React.FC<HomeClipProps> = ({ theme }) => {
  const tokens = tokensFor(theme)
  return (
    <AbsoluteFill style={{ background: tokens.bg }}>
      {SEGMENTS.map((seg, i) => (
        <Sequence key={i} from={i === 0 ? 0 : seg.from - XFADE} durationInFrames={i === 0 ? seg.dur : seg.dur + XFADE}>
          <FadeIn xfade={i === 0 ? 0 : XFADE}>{renderSeg(seg, theme, tokens)}</FadeIn>
        </Sequence>
      ))}
      <Sequence from={0} durationInFrames={DURATION_IN_FRAMES}>
        <Cursor accent={tokens.accent} />
      </Sequence>
    </AbsoluteFill>
  )
}
