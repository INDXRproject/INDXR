import React from 'react'
import {
  AbsoluteFill,
  OffthreadVideo,
  Img,
  Sequence,
  staticFile,
  interpolate,
  useCurrentFrame,
} from 'remotion'
import { loadFont } from '@remotion/google-fonts/IBMPlexSans'
import { tokensFor, type Theme, type Tokens } from './tokens'

const { fontFamily } = loadFont()

// A simulated walkthrough: a cursor clicks through the whole product story across framed stills, in
// fifteen moments. Bookended by a brand frame (the core-flow recording full-frame at the open — the
// beat-1 edge fix carried over — and a wordmark card at the close). The export beat keeps the
// full-page → menu zoom from the previous task. Only remotion's interpolate is used (cursor motion,
// click pulses, cross-dissolves, Ken-Burns-style zoom) — no extra package.
export const FPS = 30
export const WIDTH = 1280
export const HEIGHT = 720
export const PLAYBACK_RATE = 1.25 // the intro recording plays a touch faster

const XFADE = 6                    // quick cross-dissolve between screens
const HOLD = 48                    // ~1.5 s hold on a screen (twelve of these)
const CUR = 20                     // ~0.7 s for a pure cursor-click moment (no own screen)
const ZOOMD = 62                   // the export full-page → menu zoom
const INTRO = 30
const OUTRO = 30

export type HomeClipProps = { theme: Theme }

// The scenario, in order. cx/cy = where the cursor sits during the scene (fraction of the frame);
// click = fraction of the scene at which a click pulse fires. The three pure cursor-click moments
// (m3 re-Extract, m7 re-extract, m10 to-library) reuse the previous screen as background.
type Kind = 'brandVideo' | 'brandCard' | 'still' | 'zoom'
type RawScene = { id: string; kind: Kind; dur: number; asset?: string; cx?: number; cy?: number; click?: number }

const RAW: RawScene[] = [
  { id: 'intro', kind: 'brandVideo', dur: INTRO },
  // m1–m3 share the full Video-tab workbench (input-empty), which has both the URL field and the
  // Extract button, so the cursor can type at the field and then click the real Extract control.
  { id: 'm1-empty', kind: 'still', dur: HOLD, asset: 'input-empty', cx: 0.43, cy: 0.44 },
  { id: 'm2-url', kind: 'still', dur: HOLD, asset: 'input-empty', cx: 0.43, cy: 0.44 },
  { id: 'm3-extract', kind: 'still', dur: CUR, asset: 'input-empty', cx: 0.77, cy: 0.44, click: 0.5 },
  { id: 'm4-loading', kind: 'still', dur: HOLD, asset: 'progress-downloading', cx: 0.5, cy: 0.5 },
  { id: 'm5-error', kind: 'still', dur: HOLD, asset: 'error-no_captions', cx: 0.5, cy: 0.5 },
  { id: 'm6-ai', kind: 'still', dur: HOLD, asset: 'cost-card-ai', cx: 0.45, cy: 0.5 },
  { id: 'm7-reextract', kind: 'still', dur: CUR, asset: 'cost-card-ai', cx: 0.55, cy: 0.66, click: 0.5 },
  { id: 'm8-aibar', kind: 'still', dur: HOLD, asset: 'progress-downloading', cx: 0.5, cy: 0.5 },
  { id: 'm9-success', kind: 'still', dur: HOLD, asset: 'success-card', cx: 0.76, cy: 0.50 },
  { id: 'm10-tolibrary', kind: 'still', dur: CUR, asset: 'success-card', cx: 0.76, cy: 0.50, click: 0.5 },
  { id: 'm11-library', kind: 'still', dur: HOLD, asset: 'library-unread', cx: 0.25, cy: 0.11, click: 0.72 },
  { id: 'm12-viewer', kind: 'still', dur: HOLD, asset: 'transcript-speakers', cx: 0.45, cy: 0.4 },
  { id: 'm13-speakers', kind: 'still', dur: HOLD, asset: 'speaker-dialog', cx: 0.56, cy: 0.5 },
  { id: 'm14-timestamps', kind: 'still', dur: HOLD, asset: 'timestamps-on', cx: 0.4, cy: 0.3 },
  { id: 'm15-export', kind: 'zoom', dur: ZOOMD, asset: 'export-page', cx: 0.68, cy: 0.30, click: 0.18 },
  { id: 'outro', kind: 'brandCard', dur: OUTRO },
]

type Scene = RawScene & { from: number }
let _acc = 0
const SCENES: Scene[] = RAW.map((s) => {
  const scene = { ...s, from: _acc }
  _acc += s.dur
  return scene
})
export const DURATION_IN_FRAMES = _acc // 710 (~23.7 s)

const CUR_SCENES = SCENES.filter((s) => s.cx != null)
const KF_F = CUR_SCENES.map((s) => s.from + s.dur / 2)
const KF_X = CUR_SCENES.map((s) => (s.cx as number) * WIDTH)
const KF_Y = CUR_SCENES.map((s) => (s.cy as number) * HEIGHT)
const PULSES = SCENES.filter((s) => s.click != null).map((s) => ({
  f: s.from + s.dur * (s.click as number), x: (s.cx as number) * WIDTH, y: (s.cy as number) * HEIGHT,
}))
const CURSOR_START = KF_F[0]
const CURSOR_END = (() => { const m = SCENES.find((s) => s.id === 'm15-export')!; return m.from + m.dur })()

// ── Beat 15 zoom (unchanged from the previous task): export-page is 1280×800, contain-fit into the
// frame; pan+scale from the full page to the menu centred at ~92% of the frame height. ──
const EXPORT_PAGE_W = 1280
const EXPORT_PAGE_H = 800
const MENU = { x: 808.5, y: 309.5, w: 224, h: 457 }
const zoomFit = Math.min(WIDTH / EXPORT_PAGE_W, HEIGHT / EXPORT_PAGE_H)
const menuCx = (WIDTH - EXPORT_PAGE_W * zoomFit) / 2 + (MENU.x + MENU.w / 2) * zoomFit
const menuCy = (HEIGHT - EXPORT_PAGE_H * zoomFit) / 2 + (MENU.y + MENU.h / 2) * zoomFit
const ZOOM_END = (HEIGHT / (MENU.h * zoomFit)) * 0.92
const ZOOM_TX = WIDTH / 2 - ZOOM_END * menuCx
const ZOOM_TY = HEIGHT / 2 - ZOOM_END * menuCy

const ZoomInto: React.FC<{ src: string; tokens: Tokens; startAt: number }> = ({ src, tokens, startAt }) => {
  const frame = useCurrentFrame()
  const p = interpolate(frame, [startAt, startAt + ZOOMD], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return (
    <AbsoluteFill style={{ background: tokens.bg }}>
      <AbsoluteFill style={{ transformOrigin: '0 0', transform: `translate(${ZOOM_TX * p}px, ${ZOOM_TY * p}px) scale(${1 + (ZOOM_END - 1) * p})` }}>
        <Img src={staticFile(src)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

const Still: React.FC<{ src: string; tokens: Tokens }> = ({ src, tokens }) => (
  <AbsoluteFill style={{ background: tokens.bg, justifyContent: 'center', alignItems: 'center' }}>
    <Img src={staticFile(src)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
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

// Fade the incoming scene in over its first `xfade` frames; it paints on top of the still-opaque
// previous scene (a clean cross-dissolve, no background bleed). xfade 0 = hard cut (the intro).
const FadeIn: React.FC<{ xfade: number; children: React.ReactNode }> = ({ xfade, children }) => {
  const frame = useCurrentFrame()
  const opacity = xfade > 0 ? interpolate(frame, [0, xfade], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>
}

// A single click pulse: an accent ring that grows and fades once, around frame `p.f`.
const Ring: React.FC<{ p: { f: number; x: number; y: number }; accent: string }> = ({ p, accent }) => {
  const frame = useCurrentFrame()
  if (frame < p.f - 1 || frame > p.f + 20) return null
  const t = interpolate(frame, [p.f, p.f + 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const scale = 0.4 + t * 1.4
  const opacity = interpolate(t, [0, 1], [0.55, 0])
  return (
    <div style={{ position: 'absolute', left: p.x, top: p.y, width: 60, height: 60, marginLeft: -30, marginTop: -30, borderRadius: '50%', border: `3px solid ${accent}`, transform: `scale(${scale})`, opacity }} />
  )
}

const Cursor: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame()
  const x = interpolate(frame, KF_F, KF_X, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const y = interpolate(frame, KF_F, KF_Y, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const opacity = interpolate(frame, [CURSOR_START - 6, CURSOR_START + 2, CURSOR_END - 2, CURSOR_END + 5], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  // Press dip: the cursor shrinks a touch at each click.
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

function renderBg(s: Scene, theme: Theme, tokens: Tokens): React.ReactNode {
  if (s.kind === 'brandVideo') {
    const recording = theme === 'dark' ? 'core-flow-dark.webm' : 'core-flow.webm'
    // Full frame, no crop (the beat-1 edge fix): the recording is exactly WIDTH×HEIGHT. trimBefore
    // skips the recording's blank page-load so the brand open lands on the painted workbench.
    return (
      <AbsoluteFill style={{ background: tokens.bg }}>
        <OffthreadVideo src={staticFile(recording)} playbackRate={PLAYBACK_RATE} trimBefore={55} />
      </AbsoluteFill>
    )
  }
  if (s.kind === 'brandCard') return <BrandCard tokens={tokens} />
  if (s.kind === 'zoom') return <ZoomInto src={`${s.asset}-${theme}.png`} tokens={tokens} startAt={XFADE} />
  return <Still src={`${s.asset}-${theme}.png`} tokens={tokens} />
}

export const HomeClip: React.FC<HomeClipProps> = ({ theme }) => {
  const tokens = tokensFor(theme)
  return (
    <AbsoluteFill style={{ background: tokens.bg }}>
      {SCENES.map((s, i) => {
        const lead = i === 0 ? 0 : XFADE
        return (
          <Sequence key={s.id} from={s.from - lead} durationInFrames={s.dur + lead}>
            <FadeIn xfade={lead}>{renderBg(s, theme, tokens)}</FadeIn>
          </Sequence>
        )
      })}
      <Sequence from={0} durationInFrames={DURATION_IN_FRAMES}>
        <Cursor accent={tokens.accent} />
      </Sequence>
    </AbsoluteFill>
  )
}
