import { palette } from "../../design/tokens";

export type ProgressBarConfig = {
  enabled: boolean;
  direction: "auto" | "rtl" | "ltr";
  facebookSafeAspectRatio: number;
  safeAreaInsetPx: number;
  ringSizePx: number;
  captionClearancePx: number;
  logoDiscSizePx: number;
  animatedLogoSrc: string;
  staticLogoSrc: string;
  logoSizePct: number;
  animatedLogoDurationSeconds: number;
  logoTransitionFrames: number;
  backgroundColor: string;
  backgroundOpacity: number;
  trackHeightPx: number;
  trackOpacity: number;
  trackColor: string;
  fillColorStart: string;
  fillColorEnd: string;
  indicatorSizePx: number;
  indicatorBorderWidthPx: number;
  indicatorColor: string;
  indicatorBorderColor: string;
  indicatorGlowColor: string;
  indicatorGlowOpacity: number;
  introFrames: number;
  outroFrames: number;
  introScaleFrom: number;
  outroOpacityTo: number;
};

export const progressBarConfig: ProgressBarConfig = {
  enabled: true,
  direction: "auto",
  facebookSafeAspectRatio: 4 / 5,
  safeAreaInsetPx: 12,
  ringSizePx: 152,
  captionClearancePx: 52,
  logoDiscSizePx: 122,
  animatedLogoSrc: "assets/logo/wazin-logo.webm",
  staticLogoSrc: "assets/logo/logo-final.png",
  logoSizePct: 82,
  animatedLogoDurationSeconds: 10.033,
  logoTransitionFrames: 15,
  backgroundColor: palette.navy,
  backgroundOpacity: 0.5,
  trackHeightPx: 5,
  trackOpacity: 0.3,
  trackColor: palette.ink,
  fillColorStart: palette.red,
  fillColorEnd: palette.red,
  indicatorSizePx: 12,
  indicatorBorderWidthPx: 2,
  indicatorColor: palette.ink,
  indicatorBorderColor: palette.red,
  indicatorGlowColor: palette.ink,
  indicatorGlowOpacity: 0.82,
  introFrames: 12,
  outroFrames: 8,
  introScaleFrom: 0.9,
  outroOpacityTo: 0.3,
};
