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

// Still names match the capture machine's <name>-<theme>.png assets (staged into public/ by
// copy-source). Captions are short pills, no sentences — the same style as the on-clip labels.
const BEATS: Beat[] = [
  { kind: 'video', caption: 'Paste a link' },
  { kind: 'still', name: 'library-organized', caption: 'Your library' },
  { kind: 'still', name: 'transcript-speakers', caption: 'Read it properly' },
  { kind: 'still', name: 'summary-chapter', caption: 'Chapter summaries' },
  { kind: 'still', name: 'export-menu', caption: 'Every format' },
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
              // Gentle crop: scale a touch so the outer edges tuck in, keeping the workbench the focus.
              <AbsoluteFill style={{ background: tokens.bg, transform: 'scale(1.04)', transformOrigin: 'center center' }}>
                <OffthreadVideo src={staticFile(recording)} playbackRate={PLAYBACK_RATE} />
              </AbsoluteFill>
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
