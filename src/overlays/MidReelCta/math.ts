import type { OverlayWindow } from "../types";
import { midReelCtaConfig } from "./config";

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const findMidReelCtaWindow = ({
  durationInFrames,
  fps,
}: {
  durationInFrames: number;
  fps: number;
  // Kept in the public signature for backwards compatibility. The CTA lives
  // beside the lower identity circle and may intentionally coexist with text
  // overlays elsewhere in the frame.
  occupiedWindows: OverlayWindow[];
}): OverlayWindow | null => {
  const windowLength = Math.max(
    1,
    Math.round(midReelCtaConfig.durationSeconds * fps),
  );
  const rangeStart = Math.round(midReelCtaConfig.minimumStartSeconds * fps);
  const rangeEnd =
    durationInFrames - Math.round(midReelCtaConfig.endClearanceSeconds * fps);

  if (rangeEnd - rangeStart < windowLength) {
    return null;
  }

  const targetCenter = durationInFrames / 2;
  const idealStart = Math.round(targetCenter - windowLength / 2);
  const startFrame = clamp(idealStart, rangeStart, rangeEnd - windowLength);
  return { startFrame, endFrame: startFrame + windowLength };
};
