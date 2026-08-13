import React from "react";
import {
  AbsoluteFill,
  Easing,
  OffthreadVideo,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { outroConfig } from "../overlays";
import type { HookBgTheme } from "../overlays/HookBg/themes";
import { VideoIntroReveal } from "../video-intro";

// The one place the source video is rendered in burn mode. Shared by
// AuthoredReel and AsrCaptioned so both get identical behaviour:
//   - the opening materialization (video-intro), video pixels only —
//     overlays live in their own stack and are never wrapped by it
//   - the audio+video fade into the outro at the end of the clip
export const SourceVideoLayer: React.FC<{
  src: string;
  durationInFrames: number;
  reduced: boolean;
  theme: HookBgTheme;
}> = ({ src, durationInFrames, reduced, theme }) => {
  const frame = useCurrentFrame();
  const fade = interpolate(
    frame,
    [
      Math.max(0, durationInFrames - outroConfig.transitionFadeFrames),
      Math.max(1, durationInFrames - 1),
    ],
    [1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    },
  );

  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <VideoIntroReveal reduced={reduced} theme={theme}>
        <OffthreadVideo src={staticFile(src)} pauseWhenBuffering volume={fade} />
      </VideoIntroReveal>
    </AbsoluteFill>
  );
};
