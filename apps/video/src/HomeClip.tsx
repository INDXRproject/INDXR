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

// Five beats of the product, ~3 s each, ~15 s total: (1) the core-flow recording (paste a link →
// extraction), then four stills with a slow pan-and-zoom (Ken Burns) — the library, a diarised
// transcript, a chapter summary, and the export menu. Beats overlap by XFADE frames and the incoming
// beat fades in ON TOP (later beats paint last), so the outgoing stays opaque underneath until fully
// covered — a clean cross-dissolve with no background bleed, using only remotion's interpolate.
export const FPS = 30
export const WIDTH = 1280
export const HEIGHT = 720
export const PLAYBACK_RATE = 1.25 // the recording plays a touch faster for a tighter tempo

const BEAT = 105                       // frames per beat (3.5 s)
const XFADE = 18                       // cross-dissolve overlap (0.6 s)
const STEP = BEAT - XFADE              // 87 — start-to-start spacing
const CAP_DELAY = 10                   // caption appears just after a beat opens
export const DURATION_IN_FRAMES = 4 * STEP + BEAT // 453 (~15.1 s)

// Theme is the composition's only input prop: it selects the token set (tokensFor), the recording
// (light/dark webm) and the theme-correct still for every beat. defaultProps in Root.tsx keeps
// studio + the plain render script on light; dark is `--props '{"theme":"dark"}'`.
export type HomeClipProps = {
  theme: Theme
}

type Beat =
  | { kind: 'video'; caption: string }
  | { kind: 'still'; name: string; caption: string }
  | { kind: 'zoom'; name: string; caption: string }

// Still names match the capture machine's <name>-<theme>.png assets (staged into public/ by
// copy-source). Captions are short pills, no sentences — the same style as the on-clip labels.
// Beat 5 is a 'zoom': it starts on the full transcript page (Export button + open menu) and pushes
// into the menu, instead of showing a bare crop.
const BEATS: Beat[] = [
  { kind: 'video', caption: 'Paste a link' },
  { kind: 'still', name: 'library-organized', caption: 'Your library' },
  { kind: 'still', name: 'transcript-speakers', caption: 'Read it properly' },
  { kind: 'still', name: 'summary-chapter', caption: 'Chapter summaries' },
  { kind: 'zoom', name: 'export-page', caption: 'Every format' },
]

// Ken Burns: a slow zoom (1.0 → 1.06) with a small horizontal drift that alternates direction per
// beat, over the theme-correct still. objectFit contain keeps the whole UI readable; the still's own
// baked theme background blends into the beat background so the framed card floats seamlessly.
const KenBurns: React.FC<{ src: string; index: number; tokens: Tokens }> = ({ src, index, tokens }) => {
  const frame = useCurrentFrame()
  const scale = interpolate(frame, [0, BEAT], [1.0, 1.06], { extrapolateRight: 'clamp' })
  const dir = index % 2 === 0 ? 1 : -1
  const tx = interpolate(frame, [0, BEAT], [0, dir * 1.4], { extrapolateRight: 'clamp' })
  return (
    <AbsoluteFill style={{ background: tokens.bg, justifyContent: 'center', alignItems: 'center' }}>
      <Img
        src={staticFile(src)}
        style={{ width: '100%', height: '100%', objectFit: 'contain', transform: `scale(${scale}) translateX(${tx}%)` }}
      />
    </AbsoluteFill>
  )
}

// ── Beat 5: zoom the full export page INTO the open menu ──────────────────────────────────────────
// export-page is the whole transcript screen (Export button + open menu) at EXPORT_PAGE_W×EXPORT_PAGE_H,
// rendered objectFit contain in the WIDTH×HEIGHT frame. MENU is the menu's rect within that still (px,
// logged by the capture machine). We start on the full page and pan+scale so the menu ends centred and
// filling ~92% of the frame height — the same interpolate technique as the KenBurns beats.
const EXPORT_PAGE_W = 1280
const EXPORT_PAGE_H = 800
const MENU = { x: 808.5, y: 309.5, w: 224, h: 457 }
const zoomFit = Math.min(WIDTH / EXPORT_PAGE_W, HEIGHT / EXPORT_PAGE_H)
const menuCx = (WIDTH - EXPORT_PAGE_W * zoomFit) / 2 + (MENU.x + MENU.w / 2) * zoomFit // menu centre, scale 1
const menuCy = (HEIGHT - EXPORT_PAGE_H * zoomFit) / 2 + (MENU.y + MENU.h / 2) * zoomFit
const ZOOM_END = (HEIGHT / (MENU.h * zoomFit)) * 0.92 // scale so the menu fills ~92% of the frame height
const ZOOM_TX = WIDTH / 2 - ZOOM_END * menuCx          // translate that centres the menu at the end
const ZOOM_TY = HEIGHT / 2 - ZOOM_END * menuCy

const ZoomInto: React.FC<{ src: string; tokens: Tokens }> = ({ src, tokens }) => {
  const frame = useCurrentFrame()
  const p = interpolate(frame, [0, BEAT], [0, 1], { extrapolateRight: 'clamp' })
  const scale = 1 + (ZOOM_END - 1) * p
  const tx = ZOOM_TX * p
  const ty = ZOOM_TY * p
  return (
    <AbsoluteFill style={{ background: tokens.bg }}>
      <AbsoluteFill style={{ transformOrigin: '0 0', transform: `translate(${tx}px, ${ty}px) scale(${scale})` }}>
        <Img src={staticFile(src)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </AbsoluteFill>
    </AbsoluteFill>
  )
}

// Cross-dissolve wrapper: fade in over the first XFADE frames, then hold at full opacity. No
// fade-out — the next beat covers this one exactly as it ends (STEP + XFADE = BEAT).
const BeatLayer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame()
  const opacity = interpolate(frame, [0, XFADE], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>
}

const Caption: React.FC<{ text: string; durationInFrames: number; tokens: Tokens }> = ({ text, durationInFrames, tokens }) => {
  const frame = useCurrentFrame()
  const fade = 8
  const opacity = interpolate(
    frame,
    [0, fade, durationInFrames - fade, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  )
  const rise = interpolate(frame, [0, fade], [10, 0], { extrapolateRight: 'clamp' })
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 44 }}>
      <div
        style={{
          opacity,
          transform: `translateY(${rise}px)`,
          fontFamily,
          fontSize: 26,
          fontWeight: 500,
          color: tokens.fgStrong,
          background: tokens.surface,
          border: `1px solid ${tokens.border}`,
          borderRadius: 9999,
          padding: '12px 24px',
          boxShadow: '0 6px 24px rgba(0,0,0,0.10)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <span style={{ width: 9, height: 9, borderRadius: 9999, background: tokens.accent, display: 'inline-block' }} />
        {text}
      </div>
    </AbsoluteFill>
  )
}

export const HomeClip: React.FC<HomeClipProps> = ({ theme }) => {
  const tokens = tokensFor(theme)
  const recording = theme === 'dark' ? 'core-flow-dark.webm' : 'core-flow.webm'
  const capDuration = BEAT - CAP_DELAY - XFADE
  return (
    <AbsoluteFill style={{ background: tokens.bg }}>
      {BEATS.map((b, i) => (
        <Sequence key={i} from={i * STEP} durationInFrames={BEAT}>
          <BeatLayer>
            {b.kind === 'video' ? (
              // Full frame, no crop: the recording is exactly WIDTH×HEIGHT, so it fills edge to edge —
              // the whole app interface breathes (sidebar + topbar edges visible), no scale-in.
              <AbsoluteFill style={{ background: tokens.bg }}>
                <OffthreadVideo src={staticFile(recording)} playbackRate={PLAYBACK_RATE} />
              </AbsoluteFill>
            ) : b.kind === 'zoom' ? (
              <ZoomInto src={`${b.name}-${theme}.png`} tokens={tokens} />
            ) : (
              <KenBurns src={`${b.name}-${theme}.png`} index={i} tokens={tokens} />
            )}
          </BeatLayer>
          {/* Caption sits within the beat, offset so labels never collide across a cross-dissolve. */}
          <Sequence from={CAP_DELAY} durationInFrames={capDuration}>
            <Caption text={b.caption} durationInFrames={capDuration} tokens={tokens} />
          </Sequence>
        </Sequence>
      ))}
    </AbsoluteFill>
  )
}
