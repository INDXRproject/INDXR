import React from 'react'
import { Composition } from 'remotion'
import { HomeClip, type HomeClipProps, DURATION_IN_FRAMES, FPS, WIDTH, HEIGHT } from './HomeClip'

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="HomeClip"
      component={HomeClip}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      // Studio + the plain `render`/`still` scripts default to light; a dark render is
      // `--props='{"theme":"dark"}'`. One composition, switched by prop (no second composition).
      defaultProps={{ theme: 'light' } satisfies HomeClipProps}
    />
  )
}
