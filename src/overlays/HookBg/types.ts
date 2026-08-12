export type HookBgSettings = {
  enabled: boolean;
  // Size relative to the Hook layout band, not the full composition.
  widthPct: number;
  heightPct: number;
  // CSS backdrop blur applied only inside the soft elliptical veil.
  backdropBlurPx: number;
  navyOpacityPct: number;
  goldGlowOpacityPct: number;
  // Entry duration is expressed as frames at 30fps and scales with fps.
  entryFrames: number;
  translateYPx: number;
  scaleFrom: number;
};
