// Pure geometry for the energy bridge: the HookBg destination footprint and
// the curved source→destination trajectory. The SOURCE geometry is not
// defined here — it comes from getProgressBarGeometry (ProgressBar/math.ts),
// the exact numbers the ring renders with.
import { hookConfig } from "../Hook/config";

export type Point = { x: number; y: number };

export type HookBgGeometry = {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
};

// The visual footprint of the HookBg, derived from the same hookConfig the
// Hook/HookBg render from — never hardcoded to one reel. The band shape runs
// edge to edge; the ellipse takes widthPct of the hook layout zone.
export const getHookBgGeometry = ({
  width,
  height,
  config = hookConfig,
}: {
  width: number;
  height: number;
  config?: typeof hookConfig;
}): HookBgGeometry => {
  const bandHeightPx = (height * config.bandHeightPct) / 100;
  const bgHeight = (bandHeightPx * config.background.heightPct) / 100;
  const zoneWidth = width * 0.86; // hook layout zone (side gutters 7% each)
  const bgWidth =
    config.background.shape === "band"
      ? width
      : (zoneWidth * config.background.widthPct) / 100;
  return {
    centerX: width / 2,
    centerY: (height * config.yPct) / 100,
    width: bgWidth,
    height: bgHeight,
  };
};

// Quadratic Bézier — the travel path bows gently through a control point so
// the emission never reads as a mechanical straight line.
export const bezierPoint = (source: Point, control: Point, target: Point, t: number): Point => {
  const u = 1 - t;
  return {
    x: u * u * source.x + 2 * u * t * control.x + t * t * target.x,
    y: u * u * source.y + 2 * u * t * control.y + t * t * target.y,
  };
};

// Path direction at t, in degrees — orients the travelling field and sweep.
export const bezierAngleDeg = (
  source: Point,
  control: Point,
  target: Point,
  t: number,
): number => {
  const u = 1 - t;
  const dx = 2 * u * (control.x - source.x) + 2 * t * (target.x - control.x);
  const dy = 2 * u * (control.y - source.y) + 2 * t * (target.y - control.y);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
};

// Control point: halfway between source and destination, bowed sideways.
export const bridgeControlPoint = (source: Point, target: Point, curvePx: number): Point => ({
  x: (source.x + target.x) / 2 - curvePx,
  y: (source.y + target.y) / 2,
});

export const midpoint = (a: Point, b: Point): Point => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});
