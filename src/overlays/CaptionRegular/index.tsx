import React, { useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { overlayType } from "../../design/tokens";
import { tokenizeLine } from "../../schema/captions";
import { CaptionLines, type AuthoredWordFrameTiming } from "../CaptionLines";
import { CaptionEnergySurface, captionEnergyConfig } from "../CaptionEnergy";
import {
  captionTextMaxHeightPx,
  captionTextMaxWidthPx,
} from "../CaptionEnergy/math";
import { measureCaptionLayout } from "../captionLayout";
import type { HookBgTheme } from "../HookBg/themes";
import { OverlayRoot } from "../OverlayRoot";
import { progressBarConfig } from "../ProgressBar/config";
import { captionBottomOffsetAboveProgressPx } from "../ProgressBar/math";
import { DEFAULT_SAFE_AREA, type OverlayBaseProps } from "../types";
import {
  captionRegularDefaultAnimation,
  captionRegularVerseAnimation,
} from "./animations";
import { captionPlacementStyle } from "../captionSplitPlacement";

export type CaptionRegularProps = OverlayBaseProps & {
  data: {
    lines: string[];
    words?: Array<AuthoredWordFrameTiming & { text: string }>;
    emphasis?: string[];
    verse?: boolean;
  };
  stagger?: boolean;
  theme?: HookBgTheme;
};

// Verbatim authored captions. Timed words use the karaoke treatment; without
// timing they retain the established authored word stagger. `verse` fixes
// every authored hemistich on its own centred line and only scales the block.
export const CaptionRegular: React.FC<CaptionRegularProps> = ({
  data,
  window,
  position,
  direction,
  animation,
  safeArea,
  textZone,
  splitWindows = [],
  fontScale = 1,
  stagger = true,
  reduced,
  theme,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const px = width / 1080;
  const resolvedSafeArea = safeArea ?? DEFAULT_SAFE_AREA;
  const baseSize = width * overlayType.captionRegularSizeFactor * fontScale;
  const maxLineWidth = captionTextMaxWidthPx({
    width,
    safeArea: resolvedSafeArea,
    textZone,
    paddingInlinePx: captionEnergyConfig.surfacePaddingInlinePx,
    safeGapPx: captionEnergyConfig.surfaceSafeGapPx,
  });
  const bottomOffsetPx =
    position === "bottom"
      ? captionBottomOffsetAboveProgressPx({
          width,
          height,
          safeAspectRatio: progressBarConfig.facebookSafeAspectRatio,
          safeAreaInsetPx: progressBarConfig.safeAreaInsetPx,
          ringSizePx: progressBarConfig.ringSizePx,
          clearancePx: progressBarConfig.captionClearancePx,
        })
      : undefined;
  const maxTextHeight = captionTextMaxHeightPx({
    height,
    bottomOffsetPx:
      bottomOffsetPx ?? height - (height * resolvedSafeArea.topPct) / 100,
    topLimitPct:
      position === "bottom" ? captionEnergyConfig.surfaceTopLimitPct : 0,
    paddingBlockPx: captionEnergyConfig.surfacePaddingBlockPx * px * 1.1,
  });
  const resolvedAnimation =
    animation ??
    (data.verse
      ? captionRegularVerseAnimation
      : captionRegularDefaultAnimation);

  const layout = useMemo(
    () =>
      measureCaptionLayout({
        lines: data.lines.map(tokenizeLine),
        baseFontSize: baseSize,
        maxTextWidthPx: maxLineWidth,
        maxTextHeightPx: maxTextHeight,
        maxLineCount: data.verse
          ? data.lines.length
          : Math.max(data.lines.length, captionEnergyConfig.maxLineCount),
        preserveLines: data.verse,
      }),
    [data.lines, data.verse, baseSize, maxLineWidth, maxTextHeight],
  );
  const placementStyle =
    bottomOffsetPx !== undefined && splitWindows.length > 0
      ? captionPlacementStyle({
          frame,
          fps,
          height,
          safeArea: resolvedSafeArea,
          bottomOffsetPx,
          windows: splitWindows,
          reduced,
        })
      : undefined;

  return (
    <OverlayRoot
      window={window}
      position={position}
      direction={direction}
      animation={resolvedAnimation}
      safeArea={resolvedSafeArea}
      textZone={textZone}
      bottomOffsetPx={bottomOffsetPx}
      placementStyle={placementStyle}
      reduced={reduced}
      trailOnEntry={stagger && !data.words}
    >
      <CaptionEnergySurface
        window={window}
        lineCount={layout.lines.length}
        position={position}
        textZone={textZone}
        safeArea={resolvedSafeArea}
        splitWindows={splitWindows}
        theme={theme}
        reduced={reduced}
        variant={data.verse ? "verse" : "standard"}
      >
        <CaptionLines
          lines={layout.lines}
          fontSize={layout.fontSize}
          direction={direction}
          windowStartFrame={window.startFrame}
          entranceDelayFrames={
            reduced ? 0 : captionEnergyConfig.textDelayFrames
          }
          stagger={stagger && !data.words}
          reduced={reduced}
          theme={theme}
          words={data.words}
          emphasis={data.emphasis}
          verse={data.verse}
        />
      </CaptionEnergySurface>
    </OverlayRoot>
  );
};
