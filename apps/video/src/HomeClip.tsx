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

// One continuous camera through one app. Every screen is a FULL-VIEWPORT still of the same source —
// the Michael Sandel "Justice" lecture (Harvard) — captured at 2560x1440. Per moment the camera starts
// wide (the whole screen), zooms into the action region, plays the cursor's move → arrive →
// pulse-on-that-frame → screen-change → hold sequence, then pulls back out to the full screen before the
// next change. Twelve moments, NO error step. Bookend brand frames kept. Only remotion interpolate/Easing.
export const FPS = 30
export const WIDTH = 1280
export const HEIGHT = 720
export const PLAYBACK_RATE = 1.25

// Per-beat camera timing (frames): wide hold, zoom-in, focus hold (transition happens here), zoom-out.
const H = 30
const ZI = 22
const M = 16
const ZO = 22
const BEAT = H + ZI + M + ZO // 90
const APEX = H + ZI          // 52 — cursor arrival, pulse, screen change all land here
const XF = 8                 // screen cross-dissolve at the apex
const INTRO = 30
const OUTRO = 40

export type HomeClipProps = { theme: Theme }

type Beat = { s: string; f: [number, number, number]; cur?: [number, number]; pulse?: boolean; endZoom?: boolean }
// Twelve Justice moments — no error step. Same app chrome as the DW pass, so the focus/cursor fractions
// carry over screen-for-screen; the pulses land on the same controls (AI method card, Extract, View in
// Library, the top library row, Export). Screens 3–4 are the two loading phases (download → transcribe).
const BEATS: Beat[] = [
  { s: 'justice-empty', f: [0.6, 0.42, 1.5] },                                          // establish the workbench
  { s: 'justice-paste', f: [0.62, 0.5, 1.7], cur: [0.72, 0.56], pulse: true },          // choose AI transcription
  { s: 'justice-cost', f: [0.58, 0.6, 1.85], cur: [0.6, 0.62], pulse: true },           // click Extract — 55 credits
  { s: 'justice-download', f: [0.5, 0.56, 1.7] },                                       // downloading audio
  { s: 'justice-transcribe', f: [0.5, 0.56, 1.7] },                                     // transcribing
  { s: 'justice-success', f: [0.66, 0.31, 1.85], cur: [0.82, 0.31], pulse: true },      // click View in Library
  { s: 'justice-library', f: [0.4, 0.4, 1.75], cur: [0.33, 0.4], pulse: true },         // click the top (Justice) row
  { s: 'justice-viewer', f: [0.5, 0.5, 1.7] },                                          // reading pane + speaker labels
  { s: 'justice-speakers', f: [0.5, 0.5, 1.45] },                                       // rename dialog (2 speakers)
  { s: 'justice-timestamps', f: [0.5, 0.45, 1.7] },                                     // timestamps view
  { s: 'justice-summary', f: [0.55, 0.55, 1.7] },                                       // AI chapter summary
  { s: 'justice-export', f: [0.64, 0.42, 2.0], cur: [0.7, 0.3], pulse: true, endZoom: true }, // click Export → menu
]
const WALK_START = INTRO
const WALK_END = WALK_START + BEATS.length * BEAT
export const DURATION_IN_FRAMES = WALK_END + OUTRO

// Beat index + local frame. `frame` here is already WALK-LOCAL (the Walk/Cursor sequences start at
// WALK_START, so useCurrentFrame is 0 at the walk's first frame).
function beatOf(frame: number) {
  const i = Math.min(BEATS.length - 1, Math.max(0, Math.floor(frame / BEAT)))
  return { i, local: frame - i * BEAT }
}
// Camera trapezoid: 0 (wide) → 1 (focus) → 1 → 0 (wide). endZoom beats stay at focus (no pull-back).
function camP(i: number, local: number) {
  const b = BEATS[i]
  if (local < H) return 0
  if (local < APEX) return interpolate(local, [H, APEX], [0, 1], { easing: Easing.inOut(Easing.ease) })
  if (b.endZoom) return 1
  if (local < APEX + M) return 1
  return interpolate(local, [APEX + M, BEAT], [1, 0], { easing: Easing.inOut(Easing.ease) })
}
// Camera transform (lerp identity → focus) for a beat at progress p.
function camState(i: number, p: number) {
  const [fx, fy, fs] = BEATS[i].f
  const S = 1 + (fs - 1) * p
  const tx = (WIDTH / 2 - fs * fx * WIDTH) * p
  const ty = (HEIGHT / 2 - fs * fy * HEIGHT) * p
  return { S, tx, ty }
}
const applyCam = (px: number, py: number, c: { S: number; tx: number; ty: number }) => [c.S * px + c.tx, c.S * py + c.ty]

// Cursor: only on pulse beats. It glides in to the control (in still-space) and arrives exactly at the
// apex, where the pulse fires; then it fades as the camera pulls back.
type Pulse = { f: number; bi: number }
const PULSES: Pulse[] = BEATS.map((b, i) => (b.pulse ? { f: i * BEAT + APEX, bi: i } : null)).filter(Boolean) as Pulse[]

// ── screens ──
const Screen: React.FC<{ src: string; theme: Theme; c: { S: number; tx: number; ty: number }; opacity: number }> = ({ src, theme, c, opacity }) => (
  <AbsoluteFill style={{ opacity }}>
    <AbsoluteFill style={{ transformOrigin: '0 0', transform: `translate(${c.tx}px, ${c.ty}px) scale(${c.S})` }}>
      <Img src={staticFile(`${src}-${theme}.png`)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </AbsoluteFill>
  </AbsoluteFill>
)

const Walk: React.FC<{ theme: Theme; tokens: Tokens }> = ({ theme, tokens }) => {
  const frame = useCurrentFrame()
  const { i, local } = beatOf(frame)
  const p = camP(i, local)
  const c = camState(i, p)
  const b = BEATS[i]
  const nextSrc = i < BEATS.length - 1 ? BEATS[i + 1].s : null
  // At the apex the base screen cross-dissolves to the next screen (then the camera pulls back onto it).
  const xfO = nextSrc && !b.endZoom ? interpolate(local, [APEX, APEX + XF], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0
  return (
    <AbsoluteFill style={{ background: tokens.bg }}>
      <Screen src={b.s} theme={theme} c={c} opacity={1} />
      {nextSrc && xfO > 0 ? <Screen src={nextSrc} theme={theme} c={c} opacity={xfO} /> : null}
    </AbsoluteFill>
  )
}

const Ring: React.FC<{ x: number; y: number; pf: number; accent: string }> = ({ x, y, pf, accent }) => {
  const frame = useCurrentFrame()
  if (frame < pf - 1 || frame > pf + 20) return null
  const t = interpolate(frame, [pf, pf + 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return <div style={{ position: 'absolute', left: x, top: y, width: 60, height: 60, marginLeft: -30, marginTop: -30, borderRadius: '50%', border: `3px solid ${accent}`, transform: `scale(${0.4 + t * 1.4})`, opacity: interpolate(t, [0, 1], [0.55, 0]) }} />
}

const CursorLayer: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame()
  const { i, local } = beatOf(frame)
  const b = BEATS[i]
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {PULSES.map((pl) => {
        const beat = BEATS[pl.bi]
        const p = camP(pl.bi, APEX) // p=1 at apex
        const c = camState(pl.bi, p)
        const [rx, ry] = applyCam(beat.cur![0] * WIDTH, beat.cur![1] * HEIGHT, c)
        return <Ring key={pl.bi} x={rx} y={ry} pf={pl.f} accent={accent} />
      })}
      {b.pulse && b.cur ? (() => {
        // glide in over the zoom-in, arriving at the control exactly at the apex
        const prog = interpolate(local, [H, APEX], [0, 1], { easing: Easing.inOut(Easing.ease), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
        const startX = b.cur[0] + 0.13, startY = b.cur[1] + 0.09
        const fracX = startX + (b.cur[0] - startX) * prog
        const fracY = startY + (b.cur[1] - startY) * prog
        const c = camState(i, camP(i, local))
        const [x, y] = applyCam(fracX * WIDTH, fracY * HEIGHT, c)
        const opacity = interpolate(local, [H - 6, H + 2, APEX + M, APEX + M + 8], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
        const press = interpolate(local, [APEX - 4, APEX, APEX + 6], [1, 0.82, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
        return (
          <div style={{ position: 'absolute', left: x, top: y, transform: `scale(${press})`, transformOrigin: '4px 3px', opacity, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.45))' }}>
            <svg width="27" height="27" viewBox="0 0 26 26" style={{ display: 'block' }}>
              <path d="M5 2 L5 20 L10 15.5 L13 22 L16 20.5 L13 14.5 L19.5 14.5 Z" fill="#ffffff" stroke="#111111" strokeWidth="1.4" strokeLinejoin="round" />
            </svg>
          </div>
        )
      })() : null}
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

export const HomeClip: React.FC<HomeClipProps> = ({ theme }) => {
  const tokens = tokensFor(theme)
  return (
    <AbsoluteFill style={{ background: tokens.bg }}>
      <Sequence from={0} durationInFrames={INTRO + 6}>
        <BrandVideo theme={theme} tokens={tokens} />
      </Sequence>
      <Sequence from={WALK_START} durationInFrames={WALK_END - WALK_START}>
        <FadeIn xfade={XF}>
          <Walk theme={theme} tokens={tokens} />
        </FadeIn>
      </Sequence>
      <Sequence from={WALK_START} durationInFrames={WALK_END - WALK_START}>
        <CursorLayer accent={tokens.accent} />
      </Sequence>
      <Sequence from={WALK_END - XF} durationInFrames={OUTRO + XF}>
        <FadeIn xfade={XF}>
          <BrandCard tokens={tokens} />
        </FadeIn>
      </Sequence>
    </AbsoluteFill>
  )
}
