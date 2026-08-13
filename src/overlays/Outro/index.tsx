import React from "react";
import {
  AbsoluteFill,
  Easing,
  OffthreadVideo,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { fontFamily, fontWeights } from "../../design/fonts";
import { palette } from "../../design/tokens";
import { hookConfig } from "../Hook/config";
import {
  hookBgPalettes,
  parseHookBgTheme,
  type HookBgTheme,
} from "../HookBg/themes";
import { progressBarConfig } from "../ProgressBar/config";
import { outroConfig, type OutroConfig } from "./config";

export type OutroProps = {
  theme?: HookBgTheme;
  durationInFrames: number;
  reduced?: boolean;
  config?: Partial<OutroConfig>;
};

const atFps = (framesAt30: number, fps: number) =>
  Math.max(1, Math.round((framesAt30 / 30) * fps));

const revealStyle = ({
  frame,
  start,
  duration,
  reduced,
}: {
  frame: number;
  start: number;
  duration: number;
  reduced?: boolean;
}): React.CSSProperties => {
  const t = interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return reduced
    ? { opacity: t }
    : {
        opacity: t,
        transform: `translateY(${((1 - t) * 24).toFixed(2)}px) scale(${(0.97 + t * 0.03).toFixed(4)})`,
        filter: `blur(${((1 - t) * 7).toFixed(2)}px)`,
      };
};

// A neutral cinematic brand card. The editorial theme is deliberately used
// only as moving light — never as the dominant background colour.
export const Outro: React.FC<OutroProps> = ({
  theme,
  durationInFrames,
  reduced,
  config: overrides,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const config = { ...outroConfig, ...overrides };
  if (!config.enabled) return null;

  const resolvedTheme =
    parseHookBgTheme(theme) ??
    parseHookBgTheme(hookConfig.background.themeOverride) ??
    hookConfig.background.defaultTheme;
  const themePalette = hookBgPalettes[resolvedTheme];
  const px = width / 1080;
  const coverFrames = atFps(config.coverFrames, fps);
  const cover = reduced
    ? interpolate(frame, [0, coverFrames], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : interpolate(frame, [0, coverFrames], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.inOut(Easing.cubic),
      });
  const logoStart = atFps(config.logoTravelStartFrame, fps);
  const logoEnd = logoStart + atFps(config.logoTravelFrames, fps);
  const logoTravel = interpolate(frame, [logoStart, logoEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const logoSize = config.logoSizePx * px;
  const sloganLineHeight = 1.6;
  const websiteLineHeight = 1.3;
  const sloganHeight = config.sloganFontSizePx * px * sloganLineHeight;
  const websiteHeight = config.websiteFontSizePx * px * websiteLineHeight;
  const logoSloganGap = config.logoSloganGapPx * px;
  const sloganWebsiteGap = config.sloganWebsiteGapPx * px;
  const contentHeight =
    logoSize + logoSloganGap + sloganHeight + sloganWebsiteGap + websiteHeight;
  const contentTop = (height - contentHeight) / 2;
  const logoTarget = { x: width / 2, y: contentTop + logoSize / 2 };
  const logoX = logoTarget.x;
  const logoStartY = logoTarget.y + height * 0.08;
  const logoY = logoStartY + (logoTarget.y - logoStartY) * logoTravel;
  const logoScale = config.logoStartScale + (1 - config.logoStartScale) * logoTravel;
  const lightDrift = Math.sin(frame * 0.022);
  const counterDrift = Math.cos(frame * 0.018);

  const sloganStyle = revealStyle({
    frame,
    start: atFps(config.sloganStartFrame, fps),
    duration: atFps(config.textRevealFrames, fps),
    reduced,
  });
  const websiteStyle = revealStyle({
    frame,
    start: atFps(config.websiteStartFrame, fps),
    duration: atFps(config.textRevealFrames, fps),
    reduced,
  });
  const exit = interpolate(
    frame,
    [Math.max(0, durationInFrames - atFps(config.exitFrames, fps)), durationInFrames - 1],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.quad) },
  );

  return (
    <AbsoluteFill
      aria-hidden
      style={{
        zIndex: 100,
        overflow: "hidden",
        direction: "rtl",
        opacity: 1 - exit * 0.14,
      }}
    >
      <svg aria-hidden width="0" height="0" style={{ position: "absolute" }}>
        <filter id="outro-logo-luma-key" colorInterpolationFilters="sRGB">
          {/* Preserve RGB, but derive alpha from luminance. The small negative
              bias removes WebM compression noise in the nominally black matte. */}
          <feColorMatrix
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0.38 0.46 0.16 0 -0.06"
          />
        </filter>
      </svg>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 95% 75% at 50% 38%, #121827 0%, ${config.backgroundColor} 58%, #020307 100%)`,
        }}
      />

      {/* Low-opacity theme light: the semantic colour breathes across a
          charcoal canvas without becoming the canvas itself. */}
      <div
        style={{
          position: "absolute",
          left: `${18 + lightDrift * 8}%`,
          top: `${10 + counterDrift * 5}%`,
          width: "92%",
          height: "60%",
          borderRadius: "50%",
          transform: `translate(-50%, -50%) rotate(${(-16 + lightDrift * 7).toFixed(2)}deg) scale(${(0.82 + cover * 0.22).toFixed(4)})`,
          opacity: cover * config.themeLightOpacity,
          background: `radial-gradient(ellipse, ${themePalette.primary} 0%, color-mix(in oklch, ${themePalette.secondary} 58%, transparent) 34%, transparent 72%)`,
          filter: `blur(${80 * px}px)`,
          mixBlendMode: "screen",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: `${-25 + counterDrift * 7}%`,
          bottom: `${-3 + lightDrift * 5}%`,
          width: "90%",
          height: "48%",
          borderRadius: "50%",
          transform: `rotate(${(20 + counterDrift * 6).toFixed(2)}deg) scale(${(0.88 + cover * 0.16).toFixed(4)})`,
          opacity: cover * config.themeLightOpacity * 0.72,
          background: `radial-gradient(ellipse, ${themePalette.secondary} 0%, transparent 70%)`,
          filter: `blur(${96 * px}px)`,
          mixBlendMode: "screen",
        }}
      />

      {/* A restrained pearl sweep gives the card depth independent of theme. */}
      <div
        style={{
          position: "absolute",
          left: `${-55 + cover * 190}%`,
          top: "-20%",
          width: "18%",
          height: "145%",
          transform: "rotate(18deg)",
          opacity: Math.sin(cover * Math.PI) * config.ambientLightOpacity,
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.16), transparent)",
          filter: `blur(${28 * px}px)`,
          mixBlendMode: "screen",
        }}
      />

      <div style={{
        position: "absolute",
        left: logoTarget.x,
        top: logoTarget.y,
        width: logoSize * 2.4,
        height: logoSize * 2.4,
        transform: `translate(-50%, -50%) scale(${(0.55 + cover * 0.45).toFixed(4)})`,
        borderRadius: "50%",
        opacity: cover * logoTravel * config.glowOpacity * 0.72,
        background: `radial-gradient(circle, color-mix(in oklch, ${themePalette.highlight} 32%, transparent) 0%, color-mix(in oklch, ${themePalette.primary} 20%, transparent) 42%, transparent 72%)`,
        filter: `blur(${24 * px}px)`,
        mixBlendMode: "screen",
      }} />

      {[1, -1].map((direction, index) => (
        <div
          key={direction}
          style={{
            position: "absolute",
            left: logoTarget.x,
            top: logoTarget.y,
            width: logoSize * (1.22 + index * 0.22),
            height: logoSize * (0.58 + index * 0.1),
            borderRadius: "50%",
            border: `${Math.max(1, 2 * px)}px solid color-mix(in oklch, ${themePalette.highlight} ${index === 0 ? 44 : 28}%, transparent)`,
            opacity: cover * logoTravel * config.orbitOpacity,
            transform: `translate(-50%, -50%) rotate(${(direction * (18 + frame * (index === 0 ? 0.16 : 0.1))).toFixed(2)}deg)`,
            maskImage: "linear-gradient(90deg, transparent 4%, black 36%, black 64%, transparent 96%)",
            WebkitMaskImage: "linear-gradient(90deg, transparent 4%, black 36%, black 64%, transparent 96%)",
          }}
        />
      ))}

      <div
        style={{
          position: "absolute",
          left: logoX,
          top: logoY,
          width: logoSize,
          height: logoSize,
          transform: `translate(-50%, -50%) scale(${logoScale.toFixed(4)})`,
          opacity: Math.min(1, cover * 1.35) * (0.78 + logoTravel * 0.22),
          filter: `url(#outro-logo-luma-key) drop-shadow(0 ${10 * px}px ${28 * px}px rgba(0,0,0,0.48)) drop-shadow(0 0 ${22 * px}px color-mix(in oklch, ${themePalette.highlight} 22%, transparent))`,
        }}
      >
        <OffthreadVideo
          src={staticFile(progressBarConfig.animatedLogoSrc)}
          muted
          pauseWhenBuffering
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
      </div>

      <div
        style={{
          position: "absolute",
          insetInline: `${(100 - config.contentWidthPct) / 2}%`,
          top: contentTop + logoSize + logoSloganGap,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          fontFamily,
        }}
      >
        <div
          style={{
            fontSize: config.sloganFontSizePx * px,
            fontWeight: fontWeights.regular,
            lineHeight: sloganLineHeight,
            color: `color-mix(in oklch, ${palette.ink} 86%, ${themePalette.highlight})`,
            letterSpacing: "0.01em",
            textShadow: `0 ${2 * px}px ${14 * px}px ${themePalette.vignette}`,
            ...sloganStyle,
          }}
        >
          لأن شنقيط لم تُروَ كاملة …
        </div>

        <div
          dir="ltr"
          style={{
            marginTop: sloganWebsiteGap,
            fontSize: config.websiteFontSizePx * px,
            fontWeight: fontWeights.medium,
            lineHeight: websiteLineHeight,
            color: `color-mix(in oklch, ${palette.ink} 68%, ${themePalette.highlight})`,
            letterSpacing: "0.09em",
            textShadow: `0 0 ${12 * px}px color-mix(in oklch, ${themePalette.highlight} 20%, transparent)`,
            ...websiteStyle,
          }}
        >
          www.wazin.app
        </div>
      </div>
    </AbsoluteFill>
  );
};

export { outroConfig, type OutroConfig } from "./config";
