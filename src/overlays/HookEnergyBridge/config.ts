// Controls for the visible circle -> hook light connection. Frame values are
// authored at 30fps and pixel values at 1080px composition width.
export type HookEnergyBridgeConfig = {
  enabled: boolean;

  ignitionFrames: number;
  travelFrames: number;
  expansionFrames: number;
  settleFrames: number;
  returnFrames: number;

  sourcePulseScaleTo: number;
  sourcePulseOpacity: number;
  sourcePulseRadiusPx: number;

  // Narrow beam: a soft glow around a crisp, readable centre line.
  beamWidthPx: number;
  beamGlowWidthPx: number;
  beamOpacity: number;
  beamGlowOpacity: number;
  beamHeadRadiusPx: number;
  beamHeadOpacity: number;
  // Two restrained followers around the hero beam.
  secondaryBeamDelayFrames: number;
  secondaryBeamSpreadPx: number;
  secondaryBeamCurveSpreadPx: number;
  secondaryBeamWidthScale: number;
  secondaryBeamOpacity: number;
  secondaryImpactOpacity: number;

  // Impact at the hook. It is intentionally much smaller than HookBg so it
  // reads as the point that launches the background, not another background.
  impactRadiusPx: number;
  impactOpacity: number;
  impactRingWidthPx: number;
  // Vertical destination inside HookBg: positive values move the impact below
  // the text centre. Percentage of the HookBg height.
  targetOffsetPct: number;

  // A nearly still visual memory between entrance and exit.
  holdLinkOpacity: number;
  holdSourceOpacity: number;
  holdTargetOpacity: number;

  pathCurvePx: number;
  ringPulseScaleTo: number;
  ringPulseGlowOpacity: number;
};

export const hookEnergyBridgeConfig: HookEnergyBridgeConfig = {
  enabled: true,

  ignitionFrames: 5,
  travelFrames: 15,
  expansionFrames: 10,
  settleFrames: 8,
  returnFrames: 16,

  sourcePulseScaleTo: 1.22,
  sourcePulseOpacity: 0.82,
  sourcePulseRadiusPx: 118,

  beamWidthPx: 7,
  beamGlowWidthPx: 30,
  beamOpacity: 0.92,
  beamGlowOpacity: 0.58,
  beamHeadRadiusPx: 13,
  beamHeadOpacity: 1,
  secondaryBeamDelayFrames: 3,
  secondaryBeamSpreadPx: 96,
  secondaryBeamCurveSpreadPx: 44,
  secondaryBeamWidthScale: 0.58,
  secondaryBeamOpacity: 0.64,
  secondaryImpactOpacity: 0.48,

  impactRadiusPx: 230,
  impactOpacity: 0.86,
  impactRingWidthPx: 7,
  targetOffsetPct: 29,

  holdLinkOpacity: 0.075,
  holdSourceOpacity: 0.13,
  holdTargetOpacity: 0.1,

  pathCurvePx: 72,
  ringPulseScaleTo: 1.028,
  ringPulseGlowOpacity: 0.72,
};
