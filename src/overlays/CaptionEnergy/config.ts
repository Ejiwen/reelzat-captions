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
  oneLineRadiusPx: number;
  twoLineRadiusPx: number;
  exitFrames: number;
  launchScaleFrom: number;
  launchOpacityFrom: number;
  circlePulseFrames: number;
  circlePulseScale: number;
  circlePulseGlowOpacity: number;
};

export const captionEnergyConfig: CaptionEnergyConfig = {
  enabled: true,
  ignitionFrames: 3,
  travelFrames: 9,
  revealFrames: 9,
  textDelayFrames: 14,
  beamWidthPx: 4,
  beamGlowWidthPx: 18,
  beamOpacity: 0.72,
  pathCurvePx: 32,
  headRadiusPx: 8,
  sourcePulseRadiusPx: 103,
  sourcePulseOpacity: 0.48,
  impactRadiusPx: 105,
  impactOpacity: 0.58,
  surfaceOpacity: 0.88,
  surfaceBlurPx: 18,
  surfacePaddingInlinePx: 34,
  surfacePaddingBlockPx: 10,
  oneLineRadiusPx: 999,
  twoLineRadiusPx: 34,
  exitFrames: 8,
  launchScaleFrom: 0.16,
  launchOpacityFrom: 0.2,
  circlePulseFrames: 12,
  circlePulseScale: 1.075,
  circlePulseGlowOpacity: 0.72,
};
