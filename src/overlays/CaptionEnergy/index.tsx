import React from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { progressBarConfig } from "../ProgressBar/config";
import {
  captionBottomOffsetAboveProgressPx,
  getProgressBarGeometry,
} from "../ProgressBar/math";
import type { OverlayPosition, OverlayTextZone, OverlayWindow } from "../types";
import { captionEnergyConfig, type CaptionEnergyConfig } from "./config";
import {
  hookBgPalettes,
  type HookBgPalette,
  type HookBgTheme,
} from "../HookBg/themes";
import { hookConfig } from "../Hook/config";

type Point = { x: number; y: number };

const atFps = (framesAt30: number, fps: number) =>
  Math.max(1, Math.round((framesAt30 / 30) * fps));

const captionBottomOffset = (width: number, height: number) =>
  captionBottomOffsetAboveProgressPx({
    width,
    height,
    safeAspectRatio: progressBarConfig.facebookSafeAspectRatio,
    safeAreaInsetPx: progressBarConfig.safeAreaInsetPx,
    ringSizePx: progressBarConfig.ringSizePx,
    clearancePx: progressBarConfig.captionClearancePx,
  });

const captionTarget = ({
  width,
  height,
  position,
  textZone,
  lineCount,
}: {
  width: number;
  height: number;
  position: OverlayPosition;
  textZone?: OverlayTextZone | null;
  lineCount: 1 | 2;
}): Point => {
  // Production captions live above ProgressBar. For a director-defined top
  // zone, honour that geometry instead of forcing a bottom placement.
  if (lineCount === 2 && position === "top" && textZone) {
    return {
      x: width * ((textZone.xPct + textZone.wPct / 2) / 100),
      y: height * ((textZone.yPct + textZone.hPct * 0.78) / 100),
    };
  }
  return {
    x: width / 2,
    y: height - captionBottomOffset(width, height) + 7 * (width / 1080),
  };
};

export type CaptionEnergyBridgeProps = {
  window: OverlayWindow;
  position: OverlayPosition;
  textZone?: OverlayTextZone | null;
  lineCount: 1 | 2;
  reduced?: boolean;
  config?: Partial<CaptionEnergyConfig>;
  theme?: HookBgTheme;
};

// One short meteor per caption. It disappears as soon as the reading surface
// is established and never remains behind the words.
export const CaptionEnergyBridge: React.FC<CaptionEnergyBridgeProps> = ({
  window,
  position,
  textZone,
  lineCount,
  reduced,
  config: overrides,
  theme,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const config = { ...captionEnergyConfig, ...overrides };
  const themePalette =
    hookBgPalettes[theme ?? hookConfig.background.themeOverride ?? hookConfig.background.defaultTheme];
  const local = frame - window.startFrame;
  const end = atFps(config.ignitionFrames + config.travelFrames + config.revealFrames, fps);
  const exitFrames = atFps(config.exitFrames, fps);
  const exitStart = window.endFrame - exitFrames;
  const inEntry = local >= 0 && local <= end;
  const inExit = frame >= exitStart && frame < window.endFrame;

  if (!config.enabled || reduced || (!inEntry && !inExit)) return null;

  const px = width / 1080;
  const sourceGeo = getProgressBarGeometry({ width, height, config: progressBarConfig });
  const source: Point = { x: sourceGeo.centerX, y: sourceGeo.centerY };
  const target = captionTarget({ width, height, position, textZone, lineCount });
  const ignitionEnd = atFps(config.ignitionFrames, fps);
  const travelEnd = ignitionEnd + atFps(config.travelFrames, fps);
  const entryTravel = interpolate(local, [ignitionEnd, travelEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const exitTravel = interpolate(frame, [exitStart, window.endFrame], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const travel = inExit ? exitTravel : entryTravel;
  const arrival = interpolate(local, [travelEnd - 2, end], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });
  const entryPulse = interpolate(local, [0, ignitionEnd, travelEnd], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitPulse = interpolate(
    exitTravel,
    [0, 0.72, 1],
    [0, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const pulse = inExit ? exitPulse : entryPulse;
  const beamOpacity = inExit
    ? Math.sin(exitTravel * Math.PI) * config.beamOpacity * 0.72
    : Math.min(1, travel * 4) * (1 - arrival) * config.beamOpacity;
  const curve = config.pathCurvePx * px * (lineCount === 1 ? 1 : -1);
  const control: Point = {
    x: (source.x + target.x) / 2 - curve,
    y: (source.y + target.y) / 2,
  };
  const beamStart = inExit ? target : source;
  const beamEnd = inExit ? source : target;
  const u = 1 - travel;
  const head: Point = {
    x: u * u * beamStart.x + 2 * u * travel * control.x + travel * travel * beamEnd.x,
    y: u * u * beamStart.y + 2 * u * travel * control.y + travel * travel * beamEnd.y,
  };
  const d = `M ${beamStart.x} ${beamStart.y} Q ${control.x} ${control.y} ${beamEnd.x} ${beamEnd.y}`;

  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ position: "absolute", inset: 0 }}>
        <path
          d={d}
          pathLength={1}
          fill="none"
          stroke={themePalette.primary}
          strokeWidth={config.beamGlowWidthPx * px}
          strokeLinecap="round"
          strokeDasharray={`${travel} ${Math.max(0.001, 1 - travel)}`}
          opacity={beamOpacity * 0.34}
          style={{ filter: `blur(${(7 * px).toFixed(1)}px)`, mixBlendMode: "screen" }}
        />
        <path
          d={d}
          pathLength={1}
          fill="none"
          stroke={themePalette.highlight}
          strokeWidth={config.beamWidthPx * px}
          strokeLinecap="round"
          strokeDasharray={`${travel} ${Math.max(0.001, 1 - travel)}`}
          opacity={beamOpacity}
          style={{ filter: `drop-shadow(0 0 ${7 * px}px ${themePalette.highlight})`, mixBlendMode: "screen" }}
        />
      </svg>

      {!inExit ? <div style={{
        position: "absolute",
        left: source.x,
        top: source.y,
        width: config.sourcePulseRadiusPx * px * 2,
        height: config.sourcePulseRadiusPx * px * 2,
        transform: "translate(-50%, -50%)",
        borderRadius: "50%",
        opacity: pulse * config.sourcePulseOpacity,
        background: `radial-gradient(circle, transparent 42%, ${themePalette.highlight} 50%, transparent 72%)`,
        mixBlendMode: "screen",
      }} /> : null}

      {travel > 0.002 && travel < 0.998 ? <div style={{
        position: "absolute",
        left: head.x,
        top: head.y,
        width: config.headRadiusPx * px * 2,
        height: config.headRadiusPx * px * 2,
        transform: "translate(-50%, -50%)",
        borderRadius: "50%",
        background: themePalette.highlight,
        boxShadow: `0 0 ${14 * px}px ${6 * px}px ${themePalette.primary}`,
        opacity: beamOpacity,
        mixBlendMode: "screen",
      }} /> : null}

      <div style={{
        position: "absolute",
        left: target.x,
        top: target.y,
        width: config.impactRadiusPx * px * 2,
        height: config.impactRadiusPx * px * 2,
        transform: `translate(-50%, -50%) scale(${(0.3 + arrival * 0.7).toFixed(3)})`,
        borderRadius: "50%",
        opacity: arrival * (1 - Math.max(0, arrival - 0.72) / 0.28) * config.impactOpacity,
        background: `radial-gradient(circle, ${themePalette.highlight} 0%, ${themePalette.primary} 22%, transparent 72%)`,
        filter: `blur(${4 * px}px)`,
        mixBlendMode: "screen",
      }} />
    </div>
  );
};

export type CaptionEnergySurfaceProps = {
  window: OverlayWindow;
  lineCount: 1 | 2;
  position: OverlayPosition;
  textZone?: OverlayTextZone | null;
  reduced?: boolean;
  children: React.ReactNode;
  config?: Partial<CaptionEnergyConfig>;
  theme?: HookBgTheme;
};

// An opaque-enough local contrast field plus backdrop blur. Its dual dark
// shadows and pale border preserve separation over both white and black video.
export const CaptionEnergySurface: React.FC<CaptionEnergySurfaceProps> = ({
  window,
  lineCount,
  position,
  textZone,
  reduced,
  children,
  config: overrides,
  theme,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const config = { ...captionEnergyConfig, ...overrides };
  const themePalette: HookBgPalette =
    hookBgPalettes[theme ?? hookConfig.background.themeOverride ?? hookConfig.background.defaultTheme];
  const px = width / 1080;
  const local = frame - window.startFrame;
  const revealStart = reduced ? 0 : atFps(config.ignitionFrames + config.travelFrames - 3, fps);
  const revealEnd = revealStart + atFps(config.revealFrames, fps);
  const reveal = interpolate(local, [revealStart, revealEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const exit = interpolate(
    frame,
    [window.endFrame - atFps(config.exitFrames, fps), window.endFrame],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.quad) },
  );
  const source = getProgressBarGeometry({ width, height, config: progressBarConfig });
  const target = captionTarget({ width, height, position, textZone, lineCount });
  const launch = interpolate(
    local,
    [Math.max(0, revealStart - atFps(2, fps)), revealEnd],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    },
  );
  // On entry the whole readable object expands out of the Wazin circle. On
  // exit the exact vector is reversed, so it is visibly reabsorbed by it.
  const travel = reduced ? 1 : launch * (1 - exit);
  const translateX = (source.centerX - target.x) * (1 - travel);
  const translateY = (source.centerY - target.y) * (1 - travel);
  const scale = config.launchScaleFrom + (1 - config.launchScaleFrom) * travel;
  const contentOpacity = reduced
    ? 1 - exit
    : config.launchOpacityFrom + (1 - config.launchOpacityFrom) * launch;
  const radius = lineCount === 1 ? config.oneLineRadiusPx : config.twoLineRadiusPx;
  const revealRadius = 18 + reveal * 142;
  const mask = `radial-gradient(circle at 50% 100%, black 0%, black ${Math.max(0, revealRadius - 18)}%, transparent ${revealRadius}%)`;

  return (
    <div style={{
      position: "relative",
      padding: `${config.surfacePaddingBlockPx * px}px ${config.surfacePaddingInlinePx * px}px`,
      isolation: "isolate",
      transformOrigin: "center bottom",
      transform: `translate(${translateX.toFixed(2)}px, ${translateY.toFixed(2)}px) scale(${scale.toFixed(4)})`,
      opacity: contentOpacity * (1 - exit * 0.86),
      filter: reduced ? undefined : `blur(${((1 - travel) * 3.5 * px).toFixed(2)}px)`,
    }}>
      <div aria-hidden style={{
        position: "absolute",
        inset: 0,
        zIndex: -1,
        borderRadius: radius * px,
        opacity: config.surfaceOpacity * reveal * (1 - exit),
        background: `
          radial-gradient(ellipse 72% 110% at 50% 100%, color-mix(in oklch, ${themePalette.highlight} 24%, transparent) 0%, transparent 66%),
          radial-gradient(ellipse 62% 90% at 16% 18%, color-mix(in oklch, ${themePalette.secondary} 48%, transparent) 0%, transparent 72%),
          linear-gradient(135deg, ${themePalette.vignette} 0%, color-mix(in oklch, ${themePalette.base} 92%, black) 48%, color-mix(in oklch, ${themePalette.primary} 54%, ${themePalette.base}) 100%)`,
        border: `${Math.max(1, px)}px solid color-mix(in oklch, ${themePalette.highlight} 28%, transparent)`,
        boxShadow: `0 ${8 * px}px ${32 * px}px rgba(0,0,0,0.58), inset 0 1px 0 color-mix(in oklch, ${themePalette.highlight} 20%, transparent), 0 0 ${22 * px}px color-mix(in oklch, ${themePalette.primary} 18%, transparent)`,
        WebkitBackdropFilter: `blur(${config.surfaceBlurPx * px}px) saturate(0.72) brightness(0.72)`,
        backdropFilter: `blur(${config.surfaceBlurPx * px}px) saturate(0.72) brightness(0.72)`,
        WebkitMaskImage: mask,
        maskImage: mask,
      }} />
      {children}
    </div>
  );
};

export { captionEnergyConfig, type CaptionEnergyConfig } from "./config";
