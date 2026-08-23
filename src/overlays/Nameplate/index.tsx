import React from "react";
import { useVideoConfig } from "remotion";
import { fontFamily, reelTypography } from "../../design/fonts";
import { overlaySurfaces, overlayType, palette } from "../../design/tokens";
import { OverlayRoot } from "../OverlayRoot";
import { hookBgPalettes, type HookBgTheme } from "../HookBg/themes";
import { facebookSafeRegionTopPx } from "../ProgressBar/math";
import type { OverlayBaseProps } from "../types";
import { nameplateDefaultAnimation } from "./animations";

export type NameplateProps = OverlayBaseProps & {
  data: {
    channel: string;
    episodeTitle?: string;
  };
  theme?: HookBgTheme;
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
}) => {
  const { width, height } = useVideoConfig();

  const channelSize =
    width * overlayType.nameplateChannelSizeFactor * fontScale;
  const episodeSize =
    width * overlayType.nameplateEpisodeSizeFactor * fontScale;
  const resolvedSidePct = safeArea?.sidePct ?? 7;
  const safeTop = facebookSafeRegionTopPx(width, height, 4 / 5);
  const safeRegionHeight = height - safeTop * 2;
  // Physical left side avoids the TikTok/Reels action rail on the right.
  // The anchor sits in the upper third of the shared centered 4:5 safe region.
  const anchorX = width * (resolvedSidePct / 100);
  const anchorY = safeTop + safeRegionHeight * 0.28;
  const themePalette = theme ? hookBgPalettes[theme] : null;
  const isLightTheme = themePalette?.surface === "light";

  return (
    <OverlayRoot
      window={window}
      position={position}
      // The identity card has a fixed editorial home in the physical
      // top-left corner. Its text remains RTL inside the card.
      direction="ltr"
      animation={animation}
      safeArea={safeArea}
      textZone={null}
      placementStyle={{
        left: anchorX,
        top: anchorY,
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
          width: "max-content",
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
            : overlaySurfaces.chipBackground,
          border: isLightTheme
            ? `1px solid color-mix(in oklch, ${themePalette.vignette} 26%, white)`
            : undefined,
          boxShadow: isLightTheme
            ? `0 ${channelSize * 0.16}px ${channelSize * 0.55}px rgba(16,32,51,0.2), inset 0 1px 0 rgba(255,255,255,0.88)`
            : undefined,
          fontFamily,
          lineHeight: 1.35,
          whiteSpace: "nowrap",
          overflow: "hidden",
          transform: "rotate(-90deg)",
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
              }}
            />
            <div
              style={{
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                fontSize: episodeSize,
                fontWeight: reelTypography.nameplateEpisode,
                color:
                  themePalette?.mutedForeground ??
                  `color-mix(in oklch, ${palette.ink} 88%, ${palette.muted})`,
              }}
            >
              {data.episodeTitle}
            </div>
          </>
        ) : null}
      </div>
    </OverlayRoot>
  );
};
