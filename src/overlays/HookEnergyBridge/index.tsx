import React from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { hookConfig } from "../Hook/config";
import { hookBgPalettes, type HookBgPalette, type HookBgTheme } from "../HookBg/themes";
import { progressBarConfig } from "../ProgressBar/config";
import { getProgressBarGeometry } from "../ProgressBar/math";
import type { OverlayWindow } from "../types";
import {
  expansionProgress,
  hookEnergyTimeline,
  ignitionProgress,
  isInEntranceInterval,
  isInReturnInterval,
  pulseEnvelope,
  returnProgress,
  settleProgress,
  travelProgress,
} from "./animations";
import { hookEnergyBridgeConfig, type HookEnergyBridgeConfig } from "./config";
import {
  bezierPoint,
  bridgeControlPoint,
  getHookBgGeometry,
  type Point,
} from "./math";

export type HookEnergyBridgeProps = {
  window: OverlayWindow;
  theme: HookBgTheme;
  reduced?: boolean;
  config?: Partial<HookEnergyBridgeConfig>;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const pathD = (start: Point, control: Point, end: Point) =>
  `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} Q ${control.x.toFixed(2)} ${control.y.toFixed(2)} ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;

const BeamPath: React.FC<{
  d: string;
  progress: number;
  opacity: number;
  palette: HookBgPalette;
  px: number;
  config: HookEnergyBridgeConfig;
  widthScale?: number;
}> = ({ d, progress, opacity, palette, px, config, widthScale = 1 }) => {
  const drawn = clamp01(progress);
  if (drawn <= 0.002 || opacity <= 0.002) return null;

  const common: React.CSSProperties = {
    fill: "none",
    strokeLinecap: "round",
    strokeDasharray: `${drawn} ${Math.max(0.0001, 1 - drawn)}`,
    opacity,
    mixBlendMode: "screen",
  };

  return (
    <>
      <path
        d={d}
        pathLength={1}
        style={{
          ...common,
          stroke: palette.primary,
          strokeWidth: config.beamGlowWidthPx * widthScale * px,
          filter: `blur(${(config.beamGlowWidthPx * widthScale * 0.42 * px).toFixed(1)}px)`,
          opacity: opacity * config.beamGlowOpacity,
        }}
      />
      <path
        d={d}
        pathLength={1}
        style={{
          ...common,
          stroke: palette.highlight,
          strokeWidth: config.beamWidthPx * widthScale * px,
          filter: `drop-shadow(0 0 ${(10 * px).toFixed(1)}px ${palette.primary})`,
          opacity: opacity * config.beamOpacity,
        }}
      />
    </>
  );
};

type SecondaryBeam = {
  d: string;
  progress: number;
  opacity: number;
  head: Point | null;
  target: Point;
  impactOpacity: number;
  impactScale: number;
};

const Halo: React.FC<{
  point: Point;
  radius: number;
  opacity: number;
  palette: HookBgPalette;
  ring?: boolean;
}> = ({ point, radius, opacity, palette, ring }) => {
  if (opacity <= 0.002) return null;
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        left: point.x,
        top: point.y,
        width: radius * 2,
        height: radius * 2,
        borderRadius: "50%",
        transform: "translate(-50%, -50%)",
        opacity,
        mixBlendMode: "screen",
        background: ring
          ? `radial-gradient(circle, transparent 0 43%, ${palette.highlight} 48%, color-mix(in oklch, ${palette.primary} 70%, transparent) 55%, transparent 72%)`
          : `radial-gradient(circle, ${palette.highlight} 0%, color-mix(in oklch, ${palette.primary} 72%, transparent) 18%, color-mix(in oklch, ${palette.secondary} 38%, transparent) 46%, transparent 74%)`,
        filter: `blur(${Math.max(1, radius * 0.05).toFixed(1)}px)`,
        pointerEvents: "none",
      }}
    />
  );
};

// A readable light signal, not a second background: the progress circle
// answers first, a narrow beam grows along the exact curved route, and a
// compact impact expands over HookBg. A very faint tether remains while the
// hook is held, maintaining the visual relationship without hurting reading.
export const HookEnergyBridge: React.FC<HookEnergyBridgeProps> = ({
  window,
  theme,
  reduced,
  config: overrides,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const config = { ...hookEnergyBridgeConfig, ...overrides };

  if (!config.enabled || !hookConfig.background.enabled || frame < window.startFrame || frame >= window.endFrame) {
    return null;
  }

  const palette = hookBgPalettes[theme] ?? hookBgPalettes.general;
  const px = width / 1080;
  const tl = hookEnergyTimeline({ window, fps, config });
  const sourceGeometry = getProgressBarGeometry({ width, height, config: progressBarConfig });
  const targetGeometry = getHookBgGeometry({ width, height });
  const source: Point = { x: sourceGeometry.centerX, y: sourceGeometry.centerY };
  // Land in the lower part of HookBg. This makes the background feel lit from
  // the progress circle without drawing the beam through the readable text.
  const target: Point = {
    x: targetGeometry.centerX,
    y: targetGeometry.centerY + targetGeometry.height * (config.targetOffsetPct / 100),
  };
  const control = bridgeControlPoint(source, target, config.pathCurvePx * px);
  const entrance = isInEntranceInterval(frame, tl);
  const returning = isInReturnInterval(frame, tl);

  if (reduced) {
    const fadeIn = interpolate(frame, [window.startFrame, window.startFrame + fps * 0.35], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const fadeOut = interpolate(frame, [tl.returnStart, tl.returnEnd], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return <Halo point={target} radius={config.impactRadiusPx * px} opacity={0.12 * fadeIn * fadeOut} palette={palette} />;
  }

  let beamProgress = 1;
  let beamOpacity = config.holdLinkOpacity;
  let beamStart = source;
  let beamEnd = target;
  let beamControl = control;
  let head: Point | null = null;
  let impactOpacity = config.holdTargetOpacity;
  let impactScale = 0.42;
  let sourceOpacity = config.holdSourceOpacity;
  let secondaryBeams: SecondaryBeam[] = [];

  if (entrance) {
    const ignition = ignitionProgress(frame, tl);
    const travel = travelProgress(frame, tl);
    const expansion = expansionProgress(frame, tl);
    const settle = settleProgress(frame, tl);
    const launchFade = 1 - settle;
    beamProgress = travel;
    beamOpacity = Math.min(1, travel * 4) * launchFade * (1 - expansion * 0.64);
    head = travel > 0.002 && travel < 0.998 ? bezierPoint(source, control, target, travel) : null;
    impactOpacity = expansion * (1 - settle * (1 - config.holdTargetOpacity));
    impactScale = 0.22 + expansion * 0.78;
    sourceOpacity = pulseEnvelope(frame, tl.ignitionStart, tl.arrivalStart, 0.28) * config.sourcePulseOpacity * Math.max(0.3, ignition);

    // Two lighter meteors follow the hero beam. Their timings, curves and
    // landing points differ just enough to feel organic, while all three
    // still read as one coordinated launch from the Wazin circle.
    secondaryBeams = [-1, 1].map((side, index) => {
      const delay = Math.max(
        1,
        Math.round((config.secondaryBeamDelayFrames * (index + 1) * fps) / 30),
      );
      const localTravel = interpolate(
        frame,
        [tl.travelStart + delay, tl.arrivalStart + delay],
        [0, 1],
        {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.inOut(Easing.cubic),
        },
      );
      const followerTarget: Point = {
        x: target.x + side * config.secondaryBeamSpreadPx * px,
        y: target.y + (index === 0 ? 12 : 26) * px,
      };
      const followerSource: Point = {
        x: source.x + side * 16 * px,
        y: source.y - 5 * px,
      };
      // Keep the launch tangent mostly vertical, then let each path fan out
      // near HookBg. This avoids an antenna-like split around the logo.
      const followerControl: Point = {
        x: source.x + side * config.secondaryBeamCurveSpreadPx * px,
        y: source.y + (followerTarget.y - source.y) * 0.54,
      };
      const arrival = interpolate(localTravel, [0.76, 1], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.quad),
      });
      const followerOpacity =
        Math.min(1, localTravel * 4) *
        config.secondaryBeamOpacity *
        launchFade *
        (1 - arrival * 0.72);

      return {
        d: pathD(followerSource, followerControl, followerTarget),
        progress: localTravel,
        opacity: followerOpacity,
        head:
          localTravel > 0.002 && localTravel < 0.998
            ? bezierPoint(followerSource, followerControl, followerTarget, localTravel)
            : null,
        target: followerTarget,
        impactOpacity:
          arrival * config.secondaryImpactOpacity * (1 - settle * 0.86),
        impactScale: 0.18 + arrival * 0.46,
      };
    });
  } else if (returning) {
    const rt = returnProgress(frame, tl);
    beamStart = target;
    beamEnd = source;
    beamControl = control;
    beamProgress = rt;
    beamOpacity = Math.sin(rt * Math.PI) * 0.62;
    head = rt > 0.002 && rt < 0.998 ? bezierPoint(target, control, source, rt) : null;
    impactOpacity = (1 - rt) * config.holdTargetOpacity;
    impactScale = 0.42;
    sourceOpacity = pulseEnvelope(frame, tl.returnStart + Math.round((tl.returnEnd - tl.returnStart) * 0.58), tl.returnEnd, 0.55) * config.sourcePulseOpacity;
  }

  const beamD = pathD(beamStart, beamControl, beamEnd);
  const sourceRadius = config.sourcePulseRadiusPx * px;
  const impactRadius = config.impactRadiusPx * px * impactScale;

  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <BeamPath d={beamD} progress={beamProgress} opacity={beamOpacity} palette={palette} px={px} config={config} />
        {secondaryBeams.map((beam, index) => (
          <BeamPath
            key={`secondary-beam-${index}`}
            d={beam.d}
            progress={beam.progress}
            opacity={beam.opacity}
            palette={palette}
            px={px}
            config={config}
            widthScale={config.secondaryBeamWidthScale}
          />
        ))}
      </svg>

      <Halo point={source} radius={sourceRadius} opacity={sourceOpacity} palette={palette} ring />
      <Halo point={target} radius={impactRadius} opacity={impactOpacity * config.impactOpacity} palette={palette} />
      {secondaryBeams.map((beam, index) => (
        <Halo
          key={`secondary-impact-${index}`}
          point={beam.target}
          radius={config.impactRadiusPx * px * beam.impactScale}
          opacity={beam.impactOpacity}
          palette={palette}
        />
      ))}

      {head ? (
        <div
          style={{
            position: "absolute",
            left: head.x,
            top: head.y,
            width: config.beamHeadRadiusPx * px * 2,
            height: config.beamHeadRadiusPx * px * 2,
            borderRadius: "50%",
            transform: "translate(-50%, -50%)",
            background: palette.highlight,
            boxShadow: `0 0 ${18 * px}px ${8 * px}px ${palette.primary}`,
            opacity: config.beamHeadOpacity * beamOpacity,
            mixBlendMode: "screen",
          }}
        />
      ) : null}
      {secondaryBeams.map((beam, index) =>
        beam.head ? (
          <div
            key={`secondary-head-${index}`}
            style={{
              position: "absolute",
              left: beam.head.x,
              top: beam.head.y,
              width: config.beamHeadRadiusPx * config.secondaryBeamWidthScale * px * 2,
              height: config.beamHeadRadiusPx * config.secondaryBeamWidthScale * px * 2,
              borderRadius: "50%",
              transform: "translate(-50%, -50%)",
              background: palette.highlight,
              boxShadow: `0 0 ${13 * px}px ${5 * px}px ${palette.primary}`,
              opacity: config.beamHeadOpacity * beam.opacity,
              mixBlendMode: "screen",
            }}
          />
        ) : null,
      )}
    </div>
  );
};

export { hookEnergyBridgeConfig, type HookEnergyBridgeConfig } from "./config";
export {
  hookEnergyTimeline,
  isInEntranceInterval,
  isInReturnInterval,
  type HookEnergyTimeline,
} from "./animations";
export { getHookBgGeometry, type HookBgGeometry } from "./math";
