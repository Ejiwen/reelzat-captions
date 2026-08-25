import { measureText } from "@remotion/layout-utils";
import React, { useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { fontFamily, reelTypography } from "../../design/fonts";
import { overlaySurfaces, overlayType, palette } from "../../design/tokens";
import { OverlayRoot } from "../OverlayRoot";
import { hookBgPalettes, type HookBgTheme } from "../HookBg/themes";
import { facebookSafeRegionTopPx } from "../ProgressBar/math";
import type {
  OverlayBaseProps,
  OverlayFaceWindow,
  OverlayWindow,
} from "../types";
import { nameplateDefaultAnimation } from "./animations";
import {
  nameplateAvoidanceConfig,
  nameplatePlacementAtFrame,
  nameplateTitleOffsetPx,
} from "./placement";
import { nameplateThemeFor } from "./theme";

export type NameplateProps = OverlayBaseProps & {
  data: {
    channel: string;
    episodeTitle?: string;
  };
  theme?: HookBgTheme;
  faceWindows?: OverlayFaceWindow[];
  busyWindows?: OverlayWindow[];
  maxReturns?: number;
  animated?: boolean;
  // Deprecated compatibility alias for packages exported before timed
  // copyright choreography replaced face-reactive placement.
  avoidFaces?: boolean;
};

const nameplateSeparatorColor = "#E8D61A";

// Channel identity chip: channel name + episode title in a quiet corner of
// the safe area. Enters (slideEdge) after the hook exits, then stays put.
export const Nameplate: React.FC<NameplateProps> = ({
  data,
  window,
  position = "top",
  direction,
  animation = nameplateDefaultAnimation,
  safeArea,
  textZone,
  fontScale = 1,
  reduced,
  theme,
  animated,
  avoidFaces = false,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  const channelSize =
    width * overlayType.nameplateChannelSizeFactor * fontScale;
  const episodeSize =
    width * overlayType.nameplateEpisodeSizeFactor * fontScale;
  const resolvedSidePct = safeArea?.sidePct ?? 7;
  const safeTop = facebookSafeRegionTopPx(width, height, 4 / 5);
  const safeRegionHeight = height - safeTop * 2;
  // The identity rail has one calm editorial home. Adaptive mode changes only
  // its visibility; it never makes the viewer chase the label around frame.
  const leftAnchorX = width * (resolvedSidePct / 100);
  const rightInsetPct = Math.max(13, resolvedSidePct + 6);
  const rightAnchorX = width * (1 - rightInsetPct / 100);
  const anchorY = safeTop + safeRegionHeight * 0.28;
  // The pearl hook needs a quiet dark identity rail over live footage.
  // Deliberately reuse the social treatment so featured does not introduce
  // a second, competing light surface beside the guest's head.
  const nameplateTheme = nameplateThemeFor(theme);
  const themePalette = nameplateTheme
    ? hookBgPalettes[nameplateTheme]
    : null;
  const isLightTheme = themePalette?.surface === "light";
  const usesSocialSurface = nameplateTheme === "social";
  const metrics = useMemo(() => {
    const channelWidth = measureText({
      text: data.channel,
      fontFamily,
      fontWeight: reelTypography.nameplateChannel,
      fontSize: channelSize,
      validateFontIsLoaded: true,
    }).width;
    const episodeWidth = data.episodeTitle
      ? measureText({
          text: data.episodeTitle,
          fontFamily,
          fontWeight: reelTypography.nameplateEpisode,
          fontSize: episodeSize,
          validateFontIsLoaded: true,
        }).width
      : 0;
    const paddingInline = channelSize * 0.58;
    const gap = channelSize * 0.42;
    const separatorWidth = data.episodeTitle ? channelSize * 0.54 : 0;
    const compactWidth = channelWidth + paddingInline * 2;
    const naturalFullWidth = data.episodeTitle
      ? compactWidth + gap * 2 + separatorWidth + episodeWidth
      : compactWidth;
    return {
      compactWidth,
      fullWidth: Math.min(width * 0.72, naturalFullWidth),
      episodeWidth,
      episodeViewportWidth: Math.max(
        0,
        Math.min(width * 0.72, naturalFullWidth) -
          paddingInline * 2 -
          channelWidth -
          gap * 2 -
          separatorWidth,
      ),
      railThickness: channelSize * (1.35 + 0.44),
    };
  }, [
    channelSize,
    data.channel,
    data.episodeTitle,
    episodeSize,
    width,
  ]);
  const placement = nameplatePlacementAtFrame({
    frame,
    windowStartFrame: window.startFrame,
    windowEndFrame: window.endFrame,
    fps,
    enabled: animated ?? avoidFaces,
    layout: {
      width,
      height,
      leftAnchorXPx: leftAnchorX,
      rightAnchorXPx: rightAnchorX,
      defaultCenterYPx: anchorY,
      safeTopPx: safeTop,
      safeBottomPx: height - safeTop,
      fullLengthPx: metrics.fullWidth,
      compactLengthPx: metrics.compactWidth,
      railThicknessPx: metrics.railThickness,
    },
    config: reduced
      ? { ...nameplateAvoidanceConfig, transitionFrames: 0 }
      : nameplateAvoidanceConfig,
  });
  const renderedWidth =
    metrics.compactWidth +
    (metrics.fullWidth - metrics.compactWidth) * placement.fullMix;
  const titleOverflowPx = Math.max(
    0,
    metrics.episodeWidth - metrics.episodeViewportWidth,
  );
  const titleOffsetPx = reduced
    ? 0
    : nameplateTitleOffsetPx({
        frame,
        momentStartFrame: placement.momentStartFrame,
        momentEndFrame: placement.momentEndFrame,
        moment: placement.moment,
        fps,
        overflowPx: titleOverflowPx,
        direction,
      });

  return (
    <OverlayRoot
      window={window}
      position={position}
      // Fixed physical top-left home; text remains RTL inside the card.
      direction="ltr"
      animation={animation}
      safeArea={safeArea}
      textZone={null}
      placementStyle={{
        left: placement.anchorXPx + placement.edgeOffsetPx,
        top: placement.centerYPx,
        width: 0,
        height: 0,
        alignItems: "center",
        justifyContent: "center",
      }}
      reduced={reduced}
      align="start"
    >
      <div
        style={{
          display: "flex",
          boxSizing: "border-box",
          width: renderedWidth,
          flexShrink: 0,
          // With the -90deg rotation, RTL row order reads top-to-bottom as:
          // channel, separator, episode title.
          flexDirection: "row",
          alignItems: "center",
          gap: channelSize * 0.42,
          direction,
          textAlign: direction === "rtl" ? "right" : "left",
          maxWidth: width * 0.72,
          padding: `${channelSize * 0.22}px ${channelSize * 0.58}px`,
          borderRadius: channelSize * 0.42,
          background: isLightTheme
            ? `linear-gradient(118deg, color-mix(in oklch, ${themePalette.highlight} 94%, transparent), color-mix(in oklch, ${themePalette.base} 92%, ${themePalette.secondary}))`
            : usesSocialSurface
              ? "linear-gradient(118deg, rgba(5,4,3,0.78), rgba(28,17,8,0.62))"
            : overlaySurfaces.chipBackground,
          border: isLightTheme
            ? `1px solid color-mix(in oklch, ${themePalette.vignette} 26%, white)`
            : usesSocialSurface
              ? "1px solid rgba(232,177,92,0.16)"
              : undefined,
          boxShadow: isLightTheme
            ? `0 ${channelSize * 0.16}px ${channelSize * 0.55}px rgba(16,32,51,0.2), inset 0 1px 0 rgba(255,255,255,0.88)`
            : usesSocialSurface
              ? `0 ${channelSize * 0.16}px ${channelSize * 0.62}px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.05)`
              : undefined,
          fontFamily,
          lineHeight: 1.35,
          whiteSpace: "nowrap",
          overflow: "hidden",
          opacity: placement.opacity,
          filter:
            placement.blurPx > 0.05
              ? `blur(${placement.blurPx.toFixed(2)}px)`
              : undefined,
          transform: `scale(${placement.scale.toFixed(4)}) rotate(-90deg)`,
          transformOrigin: "center",
        }}
      >
        <div
          style={{
            fontSize: channelSize,
            fontWeight: reelTypography.nameplateChannel,
            color: themePalette?.foreground ?? palette.ink,
            flexShrink: 0,
          }}
        >
          {data.channel}
        </div>
        {data.episodeTitle ? (
          <>
            <div
              style={{
                width: channelSize * 0.54,
                height: channelSize * 0.54,
                flexShrink: 0,
                borderRadius: "50%",
                background: themePalette?.accent ?? nameplateSeparatorColor,
                boxShadow: `0 0 ${channelSize * 0.2}px color-mix(in oklch, ${nameplateSeparatorColor} 55%, transparent)`,
                opacity: placement.fullMix,
              }}
            />
            <div
              style={{
                minWidth: 0,
                width: metrics.episodeViewportWidth,
                overflow: "hidden",
                opacity: placement.fullMix,
              }}
            >
              <div
                style={{
                  width: "max-content",
                  fontSize: episodeSize,
                  fontWeight: reelTypography.nameplateEpisode,
                  color:
                    themePalette?.mutedForeground ??
                    `color-mix(in oklch, ${palette.ink} 88%, ${palette.muted})`,
                  transform: `translateX(${titleOffsetPx.toFixed(2)}px)`,
                  willChange: titleOverflowPx > 1 ? "transform" : undefined,
                }}
              >
                {data.episodeTitle}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </OverlayRoot>
  );
};
