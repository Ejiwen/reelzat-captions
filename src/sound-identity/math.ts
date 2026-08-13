import type { OverlayWindow } from "../overlays";

export type DuckWindow = OverlayWindow & { gain: number };

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const smoothstep = (value: number): number => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

export const duckGainAtFrame = ({
  frame,
  fps,
  windows,
  attackSeconds,
  releaseSeconds,
}: {
  frame: number;
  fps: number;
  windows: DuckWindow[];
  attackSeconds: number;
  releaseSeconds: number;
}): number => {
  const attackFrames = Math.max(1, attackSeconds * fps);
  const releaseFrames = Math.max(1, releaseSeconds * fps);

  return windows.reduce((gain, window) => {
    const attack = smoothstep((frame - window.startFrame) / attackFrames);
    const release =
      1 -
      smoothstep((frame - (window.endFrame - releaseFrames)) / releaseFrames);
    const amount = Math.min(attack, release);
    const windowGain = 1 - (1 - window.gain) * amount;
    return Math.min(gain, windowGain);
  }, 1);
};

export const audioEnvelope = ({
  frame,
  durationInFrames,
  fadeInFrames,
  fadeOutFrames,
  volume,
}: {
  frame: number;
  durationInFrames: number;
  fadeInFrames: number;
  fadeOutFrames: number;
  volume: number;
}): number => {
  const fadeIn = smoothstep(frame / Math.max(1, fadeInFrames - 1));
  const fadeOutStart = durationInFrames - Math.max(1, fadeOutFrames);
  const fadeOut =
    1 -
    smoothstep(
      (frame - fadeOutStart) / Math.max(1, durationInFrames - 1 - fadeOutStart),
    );
  return volume * Math.min(fadeIn, fadeOut);
};
