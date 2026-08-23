import React from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { progressBarConfig } from "../ProgressBar/config";
import {
  captionBottomOffsetAboveProgressPx,
  getProgressBarGeometry,
} from "../ProgressBar/math";
import {
  DEFAULT_SAFE_AREA,
  type OverlayPosition,
  type OverlaySafeArea,
  type OverlaySplitWindow,
  type OverlayTextZone,
  type OverlayWindow,
} from "../types";
import { captionEnergyConfig, type CaptionEnergyConfig } from "./config";
import { captionCardWidthPx } from "./math";
import {
  hookBgPalettes,
  type HookBgPalette,
  type HookBgTheme,
} from "../HookBg/themes";
import { hookConfig } from "../Hook/config";
import { captionSplitPlacementAtFrame } from "../captionSplitPlacement";

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
  safeArea,
  lineCount,
  splitPlacement,
}: {
  width: number;
  height: number;
  position: OverlayPosition;
  textZone?: OverlayTextZone | null;
  safeArea: OverlaySafeArea;
  lineCount: number;
  splitPlacement?: { mix: number; centerYPct: number };
}): Point => {
  // Production captions live above ProgressBar. For a director-defined top
  // zone, honour that geometry instead of forcing a bottom placement.
  if (position === "top" && textZone) {
    return {
      x: width * ((textZone.xPct + textZone.wPct / 2) / 100),
      y: height * ((textZone.yPct + textZone.hPct * 0.78) / 100),
    };
  }
  if (position === "top") {
    return {
      x: width / 2,
      y: height * (safeArea.topPct / 100),
    };
  }
  const naturalTarget = {
    x: width / 2,
    y: height - captionBottomOffset(width, height) + 7 * (width / 1080),
  };
  if (!splitPlacement || splitPlacement.mix <= 0) {
    return naturalTarget;
  }
  return {
    x: naturalTarget.x,
    y:
      naturalTarget.y +
      (height * (splitPlacement.centerYPct / 100) - naturalTarget.y) *
        splitPlacement.mix,
  };
};

export type CaptionEnergyBridgeProps = {
  window: OverlayWindow;
  position: OverlayPosition;
  textZone?: OverlayTextZone | null;
  safeArea?: OverlaySafeArea;
  lineCount: number;
  splitWindows?: OverlaySplitWindow[];
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
  safeArea = DEFAULT_SAFE_AREA,
  lineCount,
  splitWindows = [],
  reduced,
  config: overrides,
  theme,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const config = { ...captionEnergyConfig, ...overrides };
  const themePalette =
    hookBgPalettes[
      theme ??
        hookConfig.background.themeOverride ??
        hookConfig.background.defaultTheme
    ];
  const local = frame - window.startFrame;
  const end = atFps(
    config.ignitionFrames + config.travelFrames + config.revealFrames,
    fps,
  );
  const exitFrames = atFps(config.exitFrames, fps);
  const exitStart = window.endFrame - exitFrames;
  const inEntry = local >= 0 && local <= end;
  const inExit = frame >= exitStart && frame < window.endFrame;

  if (!config.enabled || reduced || (!inEntry && !inExit)) return null;

  const px = width / 1080;
  const sourceGeo = getProgressBarGeometry({
    width,
    height,
    config: progressBarConfig,
  });
  const source: Point = { x: sourceGeo.centerX, y: sourceGeo.centerY };
  const splitPlacement = captionSplitPlacementAtFrame({
    frame,
    fps,
    windows: splitWindows,
    reduced,
  });
  const target = captionTarget({
    width,
    height,
    position,
    textZone,
    safeArea,
    lineCount,
    splitPlacement,
  });
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
  const entryPulse = interpolate(
    local,
    [0, ignitionEnd, travelEnd],
    [0, 1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  const exitPulse = interpolate(exitTravel, [0, 0.72, 1], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
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
    x:
      u * u * beamStart.x +
      2 * u * travel * control.x +
      travel * travel * beamEnd.x,
    y:
      u * u * beamStart.y +
      2 * u * travel * control.y +
      travel * travel * beamEnd.y,
  };
  const d = `M ${beamStart.x} ${beamStart.y} Q ${control.x} ${control.y} ${beamEnd.x} ${beamEnd.y}`;

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: "absolute", inset: 0 }}
      >
        <path
          d={d}
          pathLength={1}
          fill="none"
          stroke={themePalette.primary}
          strokeWidth={config.beamGlowWidthPx * px}
          strokeLinecap="round"
          strokeDasharray={`${travel} ${Math.max(0.001, 1 - travel)}`}
          opacity={beamOpacity * 0.34}
          style={{
            filter: `blur(${(7 * px).toFixed(1)}px)`,
            mixBlendMode: "screen",
          }}
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
          style={{
            filter: `drop-shadow(0 0 ${7 * px}px ${themePalette.highlight})`,
            mixBlendMode: "screen",
          }}
        />
      </svg>

      {!inExit ? (
        <div
          style={{
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
          }}
        />
      ) : null}

      {travel > 0.002 && travel < 0.998 ? (
        <div
          style={{
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
          }}
        />
      ) : null}

      <div
        style={{
          position: "absolute",
          left: target.x,
          top: target.y,
          width: config.impactRadiusPx * px * 2,
          height: config.impactRadiusPx * px * 2,
          transform: `translate(-50%, -50%) scale(${(0.3 + arrival * 0.7).toFixed(3)})`,
          borderRadius: "50%",
          opacity:
            arrival *
            (1 - Math.max(0, arrival - 0.72) / 0.28) *
            config.impactOpacity,
          background: `radial-gradient(circle, ${themePalette.highlight} 0%, ${themePalette.primary} 22%, transparent 72%)`,
          filter: `blur(${4 * px}px)`,
          mixBlendMode: "screen",
        }}
      />
    </div>
  );
};

export type CaptionEnergySurfaceProps = {
  window: OverlayWindow;
  // 1, 2 or 3 rendered lines — CaptionLong may re-flow to a third.
  lineCount: number;
  position: OverlayPosition;
  textZone?: OverlayTextZone | null;
  safeArea?: OverlaySafeArea;
  splitWindows?: OverlaySplitWindow[];
  reduced?: boolean;
  children: React.ReactNode;
  config?: Partial<CaptionEnergyConfig>;
  theme?: HookBgTheme;
  // Verse retains the shared layer geometry but receives a quieter,
  // manuscript-like plate and ornament instead of the prose edge rail.
  variant?: "standard" | "verse";
};

// An opaque-enough local contrast field plus backdrop blur. Its dual dark
// shadows and pale border preserve separation over both white and black video.
export const CaptionEnergySurface: React.FC<CaptionEnergySurfaceProps> = ({
  window,
  lineCount,
  position,
  textZone,
  safeArea = DEFAULT_SAFE_AREA,
  splitWindows = [],
  reduced,
  children,
  config: overrides,
  theme,
  variant = "standard",
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const config = { ...captionEnergyConfig, ...overrides };
  const themePalette: HookBgPalette =
    hookBgPalettes[
      theme ??
        hookConfig.background.themeOverride ??
        hookConfig.background.defaultTheme
    ];
  const px = width / 1080;
  const isVerse = variant === "verse";
  const isLightTheme = themePalette.surface === "light";
  const local = frame - window.startFrame;
  const revealStart = reduced
    ? 0
    : atFps(config.ignitionFrames + config.travelFrames - 3, fps);
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
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.in(Easing.quad),
    },
  );
  const source = getProgressBarGeometry({
    width,
    height,
    config: progressBarConfig,
  });
  const splitPlacement = captionSplitPlacementAtFrame({
    frame,
    fps,
    windows: splitWindows,
    reduced,
  });
  const target = captionTarget({
    width,
    height,
    position,
    textZone,
    safeArea,
    lineCount,
    splitPlacement,
  });
  const launchStart = Math.max(0, revealStart - atFps(2, fps));
  // Transform progress carries a small overshoot so the card SETTLES instead
  // of stopping dead; opacity rides a plain ease-out (it must never exceed 1).
  const launch = interpolate(
    local,
    [launchStart, revealEnd + atFps(4, fps)],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.17, 1.03, 0.29, 1),
    },
  );
  const fadeIn = interpolate(local, [launchStart, revealEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  // The card emerges along the Wazin circle → caption vector and sinks back
  // toward it on exit — but only a fraction of the way, so the move reads as
  // a considered arrival rather than an object flying across the frame.
  const enter = reduced ? 1 : launch;
  const leave = reduced ? exit : exit;
  const offset =
    (1 - enter) * config.launchTravelFraction +
    leave * config.exitTravelFraction;
  const translateX = (source.centerX - target.x) * offset;
  const translateY = (source.centerY - target.y) * offset;
  const scaleIn = config.launchScaleFrom + (1 - config.launchScaleFrom) * enter;
  const scale = scaleIn * (1 - leave * (1 - config.exitScaleTo));
  const contentOpacity = reduced
    ? 1 - exit
    : Math.min(
        1,
        config.launchOpacityFrom + (1 - config.launchOpacityFrom) * fadeIn,
      );
  const surfaceBlur = reduced
    ? 0
    : config.launchBlurPx * px * (1 - fadeIn + leave * 0.5);
  const radius =
    lineCount <= 1 ? config.oneLineRadiusPx : config.twoLineRadiusPx;
  const revealRadius = 18 + reveal * 142;
  const mask = `radial-gradient(circle at 50% 100%, black 0%, black ${Math.max(0, revealRadius - 18)}%, transparent ${revealRadius}%)`;
  const accentReveal = interpolate(
    local,
    [revealStart + atFps(2, fps), revealEnd + atFps(3, fps)],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    },
  );
  const sheen = interpolate(
    local,
    [revealStart + atFps(1, fps), revealEnd + atFps(10, fps)],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    },
  );
  const sheenOpacity =
    Math.sin(sheen * Math.PI) * config.sheenOpacity * reveal * (1 - exit);
  const surfacePaddingBlock =
    config.surfacePaddingBlockPx * px * (lineCount <= 1 ? 1 : 1.1);
  const cardWidth = captionCardWidthPx({
    width,
    safeArea,
    textZone,
    safeGapPx: config.surfaceSafeGapPx,
  });
  const surfaceBackground = isLightTheme
    ? `
      radial-gradient(ellipse 34% 150% at 14% -18%, color-mix(in oklch, ${themePalette.highlight} 48%, transparent) 0%, transparent 72%),
      radial-gradient(ellipse 46% 160% at 92% 78%, color-mix(in oklch, ${themePalette.secondary} 34%, transparent) 0%, transparent 74%),
      linear-gradient(112deg, rgba(252,254,255,0.78) 0%, color-mix(in oklch, ${themePalette.primary} 66%, transparent) 52%, color-mix(in oklch, ${themePalette.secondary} 58%, transparent) 100%)`
    : isVerse
      ? `
        radial-gradient(ellipse 72% 130% at 50% -24%, color-mix(in oklch, #d9b86c 18%, transparent) 0%, transparent 72%),
        linear-gradient(112deg, color-mix(in oklch, ${themePalette.base} 78%, rgba(9,7,5,0.95)) 0%, color-mix(in oklch, ${themePalette.vignette} 88%, #17120c) 52%, color-mix(in oklch, ${themePalette.base} 82%, #090807) 100%)`
      : `
        radial-gradient(ellipse 56% 150% at 100% 46%, color-mix(in oklch, ${themePalette.primary} 56%, transparent) 0%, transparent 74%),
        radial-gradient(ellipse 82% 150% at 0% -12%, color-mix(in oklch, ${themePalette.secondary} 34%, transparent) 0%, transparent 70%),
        linear-gradient(112deg, color-mix(in oklch, ${themePalette.base} 72%, rgba(4,7,14,0.94)) 0%, color-mix(in oklch, ${themePalette.vignette} 84%, ${themePalette.base}) 54%, color-mix(in oklch, ${themePalette.base} 88%, #0a0c13) 100%)`;

  return (
    <div
      style={{
        position: "relative",
        boxSizing: "border-box",
        // One fixed plate length for every caption in the reel — the text
        // centres inside it instead of the box shrinking onto the text.
        width: cardWidth,
        padding: `${surfacePaddingBlock}px ${config.surfacePaddingInlinePx * px}px`,
        isolation: "isolate",
        transformOrigin: "center bottom",
        transform: `translate(${translateX.toFixed(2)}px, ${translateY.toFixed(2)}px) scale(${scale.toFixed(4)})`,
        opacity: contentOpacity * (1 - exit * 0.94),
        filter:
          surfaceBlur > 0.05 ? `blur(${surfaceBlur.toFixed(2)}px)` : undefined,
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          // The glow spreads into the safe gap, never across it.
          inset: `${-12 * px}px ${-Math.min(16, config.surfaceSafeGapPx) * px}px`,
          zIndex: -3,
          borderRadius: (radius + 14) * px,
          opacity: reveal * (1 - exit) * (isVerse ? 0.27 : 0.34),
          background: isVerse
            ? `radial-gradient(ellipse 58% 92% at 50% 50%, color-mix(in oklch, ${themePalette.highlight} 26%, #d9b86c), transparent 76%)`
            : `radial-gradient(ellipse 42% 78% at 92% 48%, color-mix(in oklch, ${themePalette.highlight} 38%, transparent), transparent 76%), radial-gradient(ellipse 46% 80% at 8% 52%, color-mix(in oklch, ${themePalette.primary} 40%, transparent), transparent 78%)`,
          filter: `blur(${22 * px}px)`,
          mixBlendMode: isLightTheme ? "normal" : "screen",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          zIndex: -1,
          borderRadius: radius * px,
          overflow: "hidden",
          opacity:
            config.surfaceOpacity *
            (isLightTheme ? 0.88 : 1) *
            reveal *
            (1 - exit),
          // The template palette IS the caption's colour: a primary field on
          // the reading side, a secondary wash opposite it, over the theme's
          // own vignette/base. Only the ink stays neutral.
          background: surfaceBackground,
          border: `${Math.max(1, 1.25 * px)}px solid color-mix(in oklch, ${isLightTheme ? themePalette.vignette : isVerse ? "#d9b86c" : themePalette.highlight} ${isLightTheme ? 28 : isVerse ? 46 : 32}%, rgba(255,255,255,0.3))`,
          boxShadow: isLightTheme
            ? `0 ${14 * px}px ${42 * px}px rgba(15,32,51,0.18), 0 ${3 * px}px ${8 * px}px rgba(15,32,51,0.1), inset 0 ${1 * px}px 0 rgba(255,255,255,0.78), inset 0 ${-1 * px}px 0 color-mix(in oklch, ${themePalette.vignette} 16%, transparent), 0 0 ${26 * px}px rgba(255,255,255,0.2)`
            : `0 ${14 * px}px ${42 * px}px rgba(0,0,0,0.56), 0 ${3 * px}px ${8 * px}px rgba(0,0,0,0.3), inset 0 ${1 * px}px 0 rgba(255,255,255,0.13), inset 0 ${-1 * px}px 0 rgba(0,0,0,0.48), 0 0 ${22 * px}px color-mix(in oklch, ${themePalette.primary} 12%, transparent)`,
          WebkitBackdropFilter: `blur(${config.surfaceBlurPx * px}px) saturate(${isLightTheme ? 0.94 : 0.88}) brightness(${isLightTheme ? 1.08 : 0.62})`,
          backdropFilter: `blur(${config.surfaceBlurPx * px}px) saturate(${isLightTheme ? 0.94 : 0.88}) brightness(${isLightTheme ? 1.08 : 0.62})`,
          WebkitMaskImage: mask,
          maskImage: mask,
        }}
      >
        <div
          style={{
            position: "absolute",
            insetInline: 20 * px,
            top: 0,
            height: Math.max(1, 1.25 * px),
            opacity: 0.62,
            background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.28) 34%, color-mix(in oklch, ${themePalette.highlight} 42%, white) 74%, transparent)`,
            filter: `blur(${0.35 * px}px)`,
          }}
        />
        {/* Matching bottom edge in the theme's own primary — the card reads
            as a machined object rather than a translucent panel. */}
        <div
          style={{
            position: "absolute",
            insetInline: 26 * px,
            bottom: 0,
            height: Math.max(1, 1.25 * px),
            opacity: 0.45 * accentReveal,
            background: `linear-gradient(90deg, transparent, color-mix(in oklch, ${themePalette.primary} 78%, white) 30%, color-mix(in oklch, ${themePalette.highlight} 60%, transparent) 78%, transparent)`,
            filter: `blur(${0.4 * px}px)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.055,
            backgroundImage: `linear-gradient(rgba(255,255,255,0.22) ${Math.max(0.5, 0.7 * px)}px, transparent ${Math.max(0.5, 0.7 * px)}px)`,
            backgroundSize: `100% ${6 * px}px`,
            mixBlendMode: "soft-light",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "-22%",
            bottom: "-22%",
            left: `${100 - sheen * (100 + config.sheenWidthPct)}%`,
            width: `${config.sheenWidthPct}%`,
            opacity: sheenOpacity,
            transform: "skewX(-14deg)",
            background: `linear-gradient(90deg, transparent, color-mix(in oklch, ${themePalette.highlight} 72%, white), transparent)`,
            filter: `blur(${7 * px}px)`,
            mixBlendMode: isLightTheme ? "soft-light" : "screen",
          }}
        />
      </div>

      {isVerse ? (
        <div
          aria-hidden
          style={{
            position: "absolute",
            zIndex: 2,
            insetInline: "31%",
            top: 7 * px,
            height: 7 * px,
            display: "flex",
            alignItems: "center",
            gap: 8 * px,
            opacity: accentReveal * (1 - exit) * 0.72,
            transform: `scaleX(${accentReveal.toFixed(4)})`,
          }}
        >
          <div
            style={{
              height: Math.max(1, px),
              flex: 1,
              background: "linear-gradient(90deg, transparent, #d9b86c)",
            }}
          />
          <div
            style={{
              width: 5 * px,
              height: 5 * px,
              transform: "rotate(45deg)",
              background: "#d9b86c",
              boxShadow: `0 0 ${7 * px}px color-mix(in oklch, ${themePalette.highlight} 55%, transparent)`,
            }}
          />
          <div
            style={{
              height: Math.max(1, px),
              flex: 1,
              background: "linear-gradient(90deg, #d9b86c, transparent)",
            }}
          />
        </div>
      ) : (
        <div
          aria-hidden
          style={{
            position: "absolute",
            zIndex: 2,
            insetInlineStart: config.edgeAccentInsetPx * px,
            // Grows with the block so a three-line card keeps the same optical
            // proportion between rail and text.
            top: lineCount <= 1 ? "30%" : lineCount === 2 ? "24%" : "20%",
            width: config.edgeAccentWidthPx * px,
            height: lineCount <= 1 ? "40%" : lineCount === 2 ? "52%" : "60%",
            borderRadius: 999,
            opacity: accentReveal * config.edgeAccentOpacity * (1 - exit),
            transform: `scaleY(${accentReveal.toFixed(4)})`,
            transformOrigin: "center",
            background: `linear-gradient(180deg, ${themePalette.highlight}, ${themePalette.primary})`,
            boxShadow: `0 0 ${10 * px}px color-mix(in oklch, ${themePalette.highlight} 62%, transparent)`,
          }}
        />
      )}

      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
};

export { captionEnergyConfig, type CaptionEnergyConfig } from "./config";
