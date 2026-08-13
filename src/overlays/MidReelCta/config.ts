export type MidReelCtaConfig = {
  enabled: boolean;
  durationSeconds: number;
  minimumStartSeconds: number;
  endClearanceSeconds: number;
  lineReachPx: number;
  branchLengthPx: number;
  circleClearancePx: number;
  textOffsetPx: number;
  fontSizePx: number;
};

export const midReelCtaConfig: MidReelCtaConfig = {
  enabled: true,
  durationSeconds: 6.2,
  minimumStartSeconds: 3.5,
  endClearanceSeconds: 1.5,
  lineReachPx: 490,
  branchLengthPx: 370,
  circleClearancePx: 108,
  textOffsetPx: 66,
  fontSizePx: 36,
};
