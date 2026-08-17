// A quieter relative of HookEnergyBridge, used by both authored caption types.
// Frame values are authored at 30fps; pixel values at 1080px width.
export type CaptionEnergyConfig = {
  enabled: boolean;
  ignitionFrames: number;
  travelFrames: number;
  revealFrames: number;
  textDelayFrames: number;
  beamWidthPx: number;
  beamGlowWidthPx: number;
  beamOpacity: number;
  pathCurvePx: number;
  headRadiusPx: number;
  sourcePulseRadiusPx: number;
  sourcePulseOpacity: number;
  impactRadiusPx: number;
  impactOpacity: number;
  surfaceOpacity: number;
  surfaceBlurPx: number;
  surfacePaddingInlinePx: number;
  surfacePaddingBlockPx: number;
  // Air between the card and the caption safe-area line, on each side. The
  // card is a fixed-width plate, so this — not the text — is what sets its
  // length: it must read as long and deliberate without ever touching the
  // safe edge. The ambient glow and shadow live inside this gap.
  surfaceSafeGapPx: number;
  // The card grows upward from its bottom anchor; its top may never climb
  // past this share of frame height (percent), which is what bounds a third
  // line. Everything above belongs to the video content.
  surfaceTopLimitPct: number;
  textFitSafetyScale: number;
  // Line layout. The authored break is the display truth until it forces the
  // type below `reflowMinScale` of the base size — then the words are
  // re-balanced, and an extra line is taken only when it buys at least
  // `extraLineGain` more type size.
  maxLineCount: number;
  reflowMinScale: number;
  extraLineGain: number;
  oneLineRadiusPx: number;
  twoLineRadiusPx: number;
  edgeAccentInsetPx: number;
  edgeAccentWidthPx: number;
  edgeAccentOpacity: number;
  sheenOpacity: number;
  sheenWidthPct: number;
  exitFrames: number;
  // How much of the circle → caption vector the card actually travels. The
  // move reads as "it came from the Wazin ring" without the card flying the
  // whole height of the frame.
  launchTravelFraction: number;
  exitTravelFraction: number;
  launchScaleFrom: number;
  launchOpacityFrom: number;
  launchBlurPx: number;
  exitScaleTo: number;
  circlePulseFrames: number;
  circlePulseScale: number;
  circlePulseGlowOpacity: number;
};

export const captionEnergyConfig: CaptionEnergyConfig = {
  enabled: true,
  ignitionFrames: 3,
  travelFrames: 9,
  revealFrames: 10,
  textDelayFrames: 11,
  beamWidthPx: 4,
  beamGlowWidthPx: 18,
  beamOpacity: 0.72,
  pathCurvePx: 32,
  headRadiusPx: 8,
  sourcePulseRadiusPx: 103,
  sourcePulseOpacity: 0.48,
  impactRadiusPx: 105,
  impactOpacity: 0.58,
  surfaceOpacity: 0.94,
  surfaceBlurPx: 26,
  surfacePaddingInlinePx: 40,
  surfacePaddingBlockPx: 18,
  surfaceSafeGapPx: 44,
  surfaceTopLimitPct: 50,
  textFitSafetyScale: 0.99,
  maxLineCount: 3,
  reflowMinScale: 0.88,
  extraLineGain: 1.06,
  oneLineRadiusPx: 40,
  twoLineRadiusPx: 34,
  edgeAccentInsetPx: 20,
  edgeAccentWidthPx: 6,
  edgeAccentOpacity: 0.9,
  sheenOpacity: 0.32,
  sheenWidthPct: 22,
  exitFrames: 11,
  launchTravelFraction: 0.52,
  exitTravelFraction: 0.38,
  launchScaleFrom: 0.74,
  launchOpacityFrom: 0,
  launchBlurPx: 6,
  exitScaleTo: 0.9,
  circlePulseFrames: 12,
  circlePulseScale: 1.075,
  circlePulseGlowOpacity: 0.72,
};
