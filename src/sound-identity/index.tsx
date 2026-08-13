import React from "react";
import { Audio, Sequence, staticFile, useVideoConfig } from "remotion";
import type { OverlayWindow } from "../overlays";
import { soundIdentityConfig, type SoundIdentityConfig } from "./config";
import { audioEnvelope } from "./math";

type SoundCue = {
  key: string;
  file: string;
  startFrame: number;
  durationSeconds: number;
  volume: number;
  fadeInSeconds: number;
  fadeOutSeconds: number;
};

export type SoundIdentityProps = {
  hookWindow?: OverlayWindow | null;
  captionWindows?: OverlayWindow[];
  ctaWindow?: OverlayWindow | null;
  outroStartFrame?: number | null;
  config?: Partial<SoundIdentityConfig>;
};

export const SoundIdentity: React.FC<SoundIdentityProps> = ({
  hookWindow,
  captionWindows = [],
  ctaWindow,
  outroStartFrame,
  config: overrides,
}) => {
  const { fps } = useVideoConfig();
  const config = { ...soundIdentityConfig, ...overrides };
  if (!config.enabled) return null;

  const cues: SoundCue[] = [];
  if (hookWindow) {
    cues.push({
      key: "hook",
      file: "hook-identity.mp3",
      startFrame: hookWindow.startFrame,
      durationSeconds: 1.8,
      volume: config.hookVolume,
      fadeInSeconds: 0.04,
      fadeOutSeconds: 0.36,
    });
  }
  captionWindows.forEach((window, index) => {
    cues.push({
      key: `caption-${index}`,
      file: "caption-reveal.mp3",
      startFrame: window.startFrame,
      durationSeconds: 0.9,
      volume: config.captionVolume,
      fadeInSeconds: 0.025,
      fadeOutSeconds: 0.24,
    });
  });
  if (ctaWindow) {
    cues.push(
      {
        key: "cta-open",
        file: "cta-open.mp3",
        startFrame: ctaWindow.startFrame,
        durationSeconds: 2.1,
        volume: config.ctaOpenVolume,
        fadeInSeconds: 0.05,
        fadeOutSeconds: 0.44,
      },
      {
        key: "cta-close",
        file: "cta-close.mp3",
        startFrame: Math.max(
          ctaWindow.startFrame,
          ctaWindow.endFrame - Math.round(2.2 * fps),
        ),
        durationSeconds: 2.2,
        volume: config.ctaCloseVolume,
        fadeInSeconds: 0.12,
        fadeOutSeconds: 0.48,
      },
    );
  }
  if (outroStartFrame != null) {
    cues.push({
      key: "outro",
      file: "outro-signature.mp3",
      startFrame: outroStartFrame,
      durationSeconds: 4.4,
      volume: config.outroVolume,
      fadeInSeconds: 0.12,
      fadeOutSeconds: 0.86,
    });
  }

  return (
    <>
      {cues.map((cue) => {
        const durationInFrames = Math.max(
          1,
          Math.round(cue.durationSeconds * fps),
        );
        return (
          <Sequence
            key={cue.key}
            from={cue.startFrame}
            durationInFrames={durationInFrames}
            premountFor={Math.min(15, cue.startFrame)}
          >
            <Audio
              src={staticFile(`${config.assetDir}/${cue.file}`)}
              volume={(frame) =>
                audioEnvelope({
                  frame,
                  durationInFrames,
                  fadeInFrames: Math.round(cue.fadeInSeconds * fps),
                  fadeOutFrames: Math.round(cue.fadeOutSeconds * fps),
                  volume: cue.volume,
                })
              }
            />
          </Sequence>
        );
      })}
    </>
  );
};

export { soundIdentityConfig, type SoundIdentityConfig } from "./config";
export { audioEnvelope, duckGainAtFrame, type DuckWindow } from "./math";
