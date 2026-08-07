import React from 'react'
import { Composition } from 'remotion'
import { HomeClip, DURATION_IN_FRAMES, FPS, WIDTH, HEIGHT } from './HomeClip'

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="HomeClip"
      component={HomeClip}
      durationInFrames={DURATION_IN_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  )
}
