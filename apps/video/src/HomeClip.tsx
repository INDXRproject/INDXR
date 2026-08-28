import React from 'react'
import {
  AbsoluteFill,
  OffthreadVideo,
  Sequence,
  staticFile,
  interpolate,
  useCurrentFrame,
} from 'remotion'
import { loadFont } from '@remotion/google-fonts/IBMPlexSans'
import { tokensFor, type Theme, type Tokens } from './tokens'

const { fontFamily } = loadFont()

// The raw recording (tests/playwright/capture/recordings/core-flow{,-dark}.webm) is copied into public/
// so staticFile can serve it. Source ≈ 26.36 s; we play it at 1.25× for a tighter homepage tempo.
export const SOURCE_SECONDS = 26.36
export const PLAYBACK_RATE = 1.25
export const FPS = 30
export const WIDTH = 1280
export const HEIGHT = 720
export const DURATION_IN_FRAMES = Math.ceil((SOURCE_SECONDS / PLAYBACK_RATE) * FPS) // 633

// Theme is the composition's only input prop: it selects BOTH the token set (tokensFor) and the
// matching recording (the light or dark webm). defaultProps in Root.tsx keeps studio on light.
export type HomeClipProps = {
  theme: Theme
}

// Captions timed to the beats (see recordings/core-flow.beats.md). comp_frame = src_seconds / rate * fps.
const CAPTIONS: { from: number; durationInFrames: number; text: string }[] = [
  { from: 36, durationInFrames: 96, text: 'Paste a YouTube link' },
  { from: 216, durationInFrames: 84, text: 'Captions, or AI when there are none' },
  { from: 372, durationInFrames: 120, text: 'It transcribes on its own' },
  { from: 540, durationInFrames: 93, text: 'Ready to read, edit, and export' },
]

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
  return (
    <AbsoluteFill style={{ background: tokens.bg }}>
      {/* Gentle crop: scale a touch so the outer edges tuck in, keeping the workbench the focus. */}
      <AbsoluteFill style={{ transform: 'scale(1.04)', transformOrigin: 'center center' }}>
        <OffthreadVideo src={staticFile(recording)} playbackRate={PLAYBACK_RATE} />
      </AbsoluteFill>

      {CAPTIONS.map((c, i) => (
        <Sequence key={i} from={c.from} durationInFrames={c.durationInFrames}>
          <Caption text={c.text} durationInFrames={c.durationInFrames} tokens={tokens} />
        </Sequence>
      ))}
    </AbsoluteFill>
  )
}
