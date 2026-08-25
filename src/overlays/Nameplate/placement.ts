export type NameplateSide = "left";

export type NameplateAvoidanceLayout = {
  width: number;
  height: number;
  leftAnchorXPx: number;
  // Kept for source compatibility with older callers. Timed choreography
  // never moves the rail away from its left editorial home.
  rightAnchorXPx: number;
  defaultCenterYPx: number;
  safeTopPx: number;
  safeBottomPx: number;
  fullLengthPx: number;
  compactLengthPx: number;
  railThicknessPx: number;
};

export type NameplateAvoidanceConfig = {
  introVisibleSeconds: number;
  closingLeadSeconds: number;
  mergeGapSeconds: number;
  transitionFrames: number;
  edgeTravelPx: number;
  blurPx: number;
};

export const nameplateAvoidanceConfig: NameplateAvoidanceConfig = {
  introVisibleSeconds: 13,
  closingLeadSeconds: 7,
  // Avoid an inelegant one-second disappearance in clips near 20 seconds.
  mergeGapSeconds: 2,
  transitionFrames: 18,
  edgeTravelPx: 14,
  blurPx: 2.6,
};

type RawPlacement = {
  centerYPx: number;
  mode: "full" | "hidden";
  side: NameplateSide;
};

export type NameplatePlacement = {
  anchorXPx: number;
  centerYPx: number;
  fullMix: number;
  opacity: number;
  scale: number;
  blurPx: number;
  edgeOffsetPx: number;
  mode: RawPlacement["mode"];
  side: NameplateSide;
  moment: "intro" | "closing" | null;
  momentStartFrame: number;
  momentEndFrame: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const timing = ({
  windowStartFrame,
  windowEndFrame,
  fps,
  config,
}: {
  windowStartFrame: number;
  windowEndFrame: number;
  fps: number;
  config: NameplateAvoidanceConfig;
}) => {
  const introEndFrame = Math.min(
    windowEndFrame,
    windowStartFrame + Math.round(config.introVisibleSeconds * fps),
  );
  const closingStartFrame = Math.max(
    windowStartFrame,
    windowEndFrame - Math.round(config.closingLeadSeconds * fps),
  );
  const gapFrames = closingStartFrame - introEndFrame;
  const merged = gapFrames <= Math.round(config.mergeGapSeconds * fps);
  return { introEndFrame, closingStartFrame, merged };
};

const rawDecision = ({
  frame,
  windowStartFrame,
  windowEndFrame,
  fps,
  enabled,
  config,
}: {
  frame: number;
  windowStartFrame: number;
  windowEndFrame: number;
  fps: number;
  enabled: boolean;
  config: NameplateAvoidanceConfig;
}): {
  visible: boolean;
  moment: NameplatePlacement["moment"];
  momentStartFrame: number;
  momentEndFrame: number;
  changeFrame: number | null;
  appearing: boolean;
} => {
  if (!enabled) {
    return {
      visible: true,
      moment: "intro",
      momentStartFrame: windowStartFrame,
      momentEndFrame: windowEndFrame,
      changeFrame: null,
      appearing: false,
    };
  }
  const { introEndFrame, closingStartFrame, merged } = timing({
    windowStartFrame,
    windowEndFrame,
    fps,
    config,
  });
  if (merged || frame < introEndFrame) {
    return {
      visible: true,
      moment: "intro",
      momentStartFrame: windowStartFrame,
      momentEndFrame: merged ? windowEndFrame : introEndFrame,
      changeFrame: null,
      appearing: false,
    };
  }
  if (frame >= closingStartFrame) {
    return {
      visible: true,
      moment: "closing",
      momentStartFrame: closingStartFrame,
      momentEndFrame: windowEndFrame,
      changeFrame: closingStartFrame,
      appearing: true,
    };
  }
  return {
    visible: false,
    moment: null,
    momentStartFrame: introEndFrame,
    momentEndFrame: closingStartFrame,
    changeFrame: introEndFrame,
    appearing: false,
  };
};

export const rawNameplatePlacementAtFrame = ({
  frame,
  windowStartFrame = 0,
  windowEndFrame = 3600,
  fps = 30,
  enabled = true,
  layout,
  config = nameplateAvoidanceConfig,
}: {
  frame: number;
  windowStartFrame?: number;
  windowEndFrame?: number;
  fps?: number;
  enabled?: boolean;
  // Deprecated inputs remain accepted so generated packages compiled against
  // the earlier face-aware API do not fail during a rolling update.
  faces?: unknown[];
  busyWindows?: unknown[];
  maxReturns?: number;
  layout: NameplateAvoidanceLayout;
  config?: NameplateAvoidanceConfig;
}): RawPlacement => {
  const decision = rawDecision({
    frame,
    windowStartFrame,
    windowEndFrame,
    fps,
    enabled,
    config,
  });
  return {
    centerYPx: layout.defaultCenterYPx,
    mode: decision.visible ? "full" : "hidden",
    side: "left",
  };
};

const criticalDamped = (t: number) => {
  const response = (x: number) => 1 - (1 + 7 * x) * Math.exp(-7 * x);
  return response(t) / response(1);
};

export const nameplatePlacementAtFrame = ({
  frame,
  windowStartFrame = 0,
  windowEndFrame = 3600,
  fps = 30,
  enabled = true,
  layout,
  config = nameplateAvoidanceConfig,
}: {
  frame: number;
  windowStartFrame?: number;
  windowEndFrame?: number;
  fps?: number;
  enabled?: boolean;
  faces?: unknown[];
  busyWindows?: unknown[];
  maxReturns?: number;
  layout: NameplateAvoidanceLayout;
  config?: NameplateAvoidanceConfig;
}): NameplatePlacement => {
  const decision = rawDecision({
    frame,
    windowStartFrame,
    windowEndFrame,
    fps,
    enabled,
    config,
  });
  const base = {
    anchorXPx: layout.leftAnchorXPx,
    centerYPx: layout.defaultCenterYPx,
    fullMix: 1,
    mode: decision.visible ? ("full" as const) : ("hidden" as const),
    side: "left" as const,
    moment: decision.moment,
    momentStartFrame: decision.momentStartFrame,
    momentEndFrame: decision.momentEndFrame,
  };
  if (
    decision.changeFrame === null ||
    config.transitionFrames <= 0 ||
    frame - decision.changeFrame >= config.transitionFrames
  ) {
    return {
      ...base,
      opacity: decision.visible ? 1 : 0,
      scale: 1,
      blurPx: 0,
      edgeOffsetPx: 0,
    };
  }

  const linear = clamp(
    (frame - decision.changeFrame) / config.transitionFrames,
    0,
    1,
  );
  const progress = criticalDamped(linear);
  const visibility = decision.appearing ? progress : 1 - progress;
  const retreat = decision.appearing ? 1 - progress : progress;
  return {
    ...base,
    opacity: visibility,
    scale: 1 - retreat * 0.018,
    blurPx: retreat * config.blurPx,
    edgeOffsetPx: -retreat * config.edgeTravelPx,
  };
};

export const nameplateTitleOffsetPx = ({
  frame,
  momentStartFrame,
  momentEndFrame,
  moment,
  fps,
  overflowPx,
  direction,
}: {
  frame: number;
  momentStartFrame: number;
  momentEndFrame: number;
  moment: NameplatePlacement["moment"];
  fps: number;
  overflowPx: number;
  direction: "rtl" | "ltr";
}) => {
  if (moment === null || overflowPx <= 1) return 0;
  const holdFrames = Math.round(1.15 * fps);
  // Readable rather than ticker-like: larger overflow receives more time.
  const desiredPanFrames = Math.round(
    clamp((overflowPx / 42) * fps, 2.2 * fps, 6 * fps),
  );
  const endReadingHoldFrames = Math.round(0.45 * fps);
  const panFrames = Math.max(
    1,
    Math.min(
      desiredPanFrames,
      momentEndFrame -
        momentStartFrame -
        holdFrames -
        endReadingHoldFrames,
    ),
  );
  const progress = criticalDamped(
    clamp((frame - momentStartFrame - holdFrames) / panFrames, 0, 1),
  );
  return (direction === "rtl" ? 1 : -1) * overflowPx * progress;
};
