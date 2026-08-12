export const clamp01 = (value: number): number =>
  Math.min(1, Math.max(0, value));

export const normalizedReelProgress = (
  frame: number,
  durationInFrames: number,
): number =>
  durationInFrames <= 1 ? 1 : clamp01(frame / (durationInFrames - 1));

// A centered Facebook Feed-safe region has aspect ratio width / height.
// 4:5 inside 1080×1920 => height 1350, top 285px (14.84375%).
export const facebookSafeRegionTopPx = (
  width: number,
  height: number,
  safeAspectRatio: number,
): number => {
  if (width <= 0 || height <= 0 || safeAspectRatio <= 0) {
    return 0;
  }
  const safeRegionHeight = Math.min(height, width / safeAspectRatio);
  return Math.max(0, (height - safeRegionHeight) / 2);
};

export const facebookSafeRegionTopPct = (
  width: number,
  height: number,
  safeAspectRatio: number,
): number =>
  height <= 0
    ? 0
    : (facebookSafeRegionTopPx(width, height, safeAspectRatio) / height) * 100;

export const facebookSafeRegionBottomPx = (
  width: number,
  height: number,
  safeAspectRatio: number,
): number => height - facebookSafeRegionTopPx(width, height, safeAspectRatio);

export const facebookSafeRegionBottomPct = (
  width: number,
  height: number,
  safeAspectRatio: number,
): number =>
  height <= 0
    ? 0
    : (facebookSafeRegionBottomPx(width, height, safeAspectRatio) / height) * 100;

export const captionBottomOffsetAboveProgressPx = ({
  width,
  height,
  safeAspectRatio,
  safeAreaInsetPx,
  ringSizePx,
  clearancePx,
}: {
  width: number;
  height: number;
  safeAspectRatio: number;
  safeAreaInsetPx: number;
  ringSizePx: number;
  clearancePx: number;
}): number => {
  const scale = width / 1080;
  const ringCenterY =
    facebookSafeRegionBottomPx(width, height, safeAspectRatio) - safeAreaInsetPx * scale;
  const ringTop = ringCenterY - (ringSizePx * scale) / 2;
  return height - ringTop + clearancePx * scale;
};
