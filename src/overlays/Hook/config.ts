export type HookConfig = {
  // Vertical centre of the hook as a percentage of the video frame.
  // 0 = top edge, 50 = centre, 100 = bottom edge.
  yPct: number;
  // Internal layout band centred around yPct. Increase this only when a hook
  // needs more vertical room; yPct remains the single positioning control.
  bandHeightPct: number;
  // Extra steady reading time inserted between the unchanged entrance and
  // exit animations. The effective window is capped before the next caption
  // and at the end of the video.
  extraHoldSeconds: number;
};

export const hookConfig: HookConfig = {
  yPct: 65,
  bandHeightPct: 24,
  extraHoldSeconds: 2,
};
