import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { fontFamily } from "../../design/fonts";
import { overlaySurfaces, overlayType, palette, typeScale } from "../../design/tokens";
import { OverlayRoot } from "../OverlayRoot";
import type { OverlayBaseProps, OverlayWindow } from "../types";
import { dimFactor, nameplateDefaultAnimation } from "./animations";

export type NameplateProps = OverlayBaseProps & {
  data: {
    channel: string;
    episodeTitle?: string;
  };
  // Windows of same-band captions — the nameplate yields fully (fades to 0)
  // while any of them is on screen so it never competes or collides.
  dimWindows?: OverlayWindow[];
};

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
  dimWindows = [],
  reduced,
}) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();

  const channelSize = width * overlayType.nameplateChannelSizeFactor * fontScale;
  const episodeSize = width * overlayType.nameplateEpisodeSizeFactor * fontScale;

  return (
    <OverlayRoot
      window={window}
      position={position}
      direction={direction}
      animation={animation}
      safeArea={safeArea}
      textZone={textZone}
      reduced={reduced}
      align="start"
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          direction,
          padding: `${channelSize * 0.35}px ${channelSize * 0.7}px`,
          borderRadius: channelSize * 0.5,
          background: overlaySurfaces.chipBackground,
          opacity: dimFactor(frame, dimWindows),
          fontFamily,
          lineHeight: typeScale.lineHeight,
        }}
      >
        <div
          style={{
            fontSize: channelSize,
            fontWeight: typeScale.fontWeight,
            color: palette.ink,
          }}
        >
          {data.channel}
        </div>
        {data.episodeTitle ? (
          <div
            style={{
              fontSize: episodeSize,
              fontWeight: 500,
              color: palette.muted,
            }}
          >
            {data.episodeTitle}
          </div>
        ) : null}
      </div>
    </OverlayRoot>
  );
};
