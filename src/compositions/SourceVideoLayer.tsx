import React from "react";
import {
  AbsoluteFill,
  Easing,
  OffthreadVideo,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { outroConfig } from "../overlays";
import type { HookBgTheme } from "../overlays/HookBg/themes";
import {
  duckGainAtFrame,
  soundIdentityConfig,
  type DuckWindow,
} from "../sound-identity";
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
  duckWindows?: DuckWindow[];
}> = ({ src, durationInFrames, reduced, theme, duckWindows = [] }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sourceGain = duckGainAtFrame({
    frame,
    fps,
    windows: duckWindows,
    attackSeconds: soundIdentityConfig.duckAttackSeconds,
    releaseSeconds: soundIdentityConfig.duckReleaseSeconds,
  });
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
        <OffthreadVideo
          src={staticFile(src)}
          pauseWhenBuffering
          volume={fade * sourceGain}
        />
      </VideoIntroReveal>
    </AbsoluteFill>
  );
};
