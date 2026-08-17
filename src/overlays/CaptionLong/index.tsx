import React, { useMemo } from "react";
import { useVideoConfig } from "remotion";
import { overlayType } from "../../design/tokens";
import { tokenizeLine } from "../../schema/captions";
import { CaptionLines } from "../CaptionLines";
import { CaptionEnergySurface, captionEnergyConfig } from "../CaptionEnergy";
import {
  captionTextMaxHeightPx,
  captionTextMaxWidthPx,
} from "../CaptionEnergy/math";
import { measureCaptionLayout } from "../captionLayout";
import { OverlayRoot } from "../OverlayRoot";
import { DEFAULT_SAFE_AREA, type OverlayBaseProps } from "../types";
import { progressBarConfig } from "../ProgressBar/config";
import { captionBottomOffsetAboveProgressPx } from "../ProgressBar/math";
import { captionLongDefaultAnimation } from "./animations";
import type { HookBgTheme } from "../HookBg/themes";

export type CaptionLongProps = OverlayBaseProps & {
  data: {
    // Exactly two authored lines, balanced by the author (enforced upstream).
    lines: string[];
    emphasis?: string[];
  };
  stagger?: boolean;
  theme?: HookBgTheme;
};

// Two balanced lines at one shared font size, so the pair reads as a block,
// with a flat word-stagger index running across the line break.
//
// The authored break is the display truth WHILE it holds a confident size.
// When unusually long words would shrink the block below
// captionEnergyConfig.reflowMinScale, the words are re-balanced instead —
// across two lines, or three when the extra line buys visibly bigger type.
// Words are never re-ordered: only the break moves.
export const CaptionLong: React.FC<CaptionLongProps> = ({
  data,
  window,
  position,
  direction,
  animation = captionLongDefaultAnimation,
  safeArea,
  textZone,
  fontScale = 1,
  stagger = true,
  reduced,
  theme,
}) => {
  const { width, height } = useVideoConfig();
  const px = width / 1080;

  const resolvedSafeArea = safeArea ?? DEFAULT_SAFE_AREA;
  const baseSize = width * overlayType.captionLongSizeFactor * fontScale;
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

  // A third line grows the card upward, so the vertical budget is what stops
  // it from reaching into the video content.
  const maxTextHeight = captionTextMaxHeightPx({
    height,
    bottomOffsetPx:
      bottomOffsetPx ?? height - (height * resolvedSafeArea.topPct) / 100,
    topLimitPct:
      position === "bottom" ? captionEnergyConfig.surfaceTopLimitPct : 0,
    paddingBlockPx: captionEnergyConfig.surfacePaddingBlockPx * px * 1.1,
  });

  const layout = useMemo(
    () =>
      measureCaptionLayout({
        lines: data.lines.map(tokenizeLine),
        baseFontSize: baseSize,
        maxTextWidthPx: maxLineWidth,
        maxTextHeightPx: maxTextHeight,
        maxLineCount: captionEnergyConfig.maxLineCount,
      }),
    [data.lines, baseSize, maxLineWidth, maxTextHeight],
  );

  return (
    <OverlayRoot
      window={window}
      position={position}
      direction={direction}
      animation={animation}
      safeArea={resolvedSafeArea}
      textZone={textZone}
      bottomOffsetPx={bottomOffsetPx}
      reduced={reduced}
      trailOnEntry={stagger}
    >
      <CaptionEnergySurface
        window={window}
        lineCount={layout.lines.length}
        position={position}
        textZone={textZone}
        safeArea={resolvedSafeArea}
        theme={theme}
        reduced={reduced}
      >
        <CaptionLines
          lines={layout.lines}
          fontSize={layout.fontSize}
          direction={direction}
          windowStartFrame={window.startFrame}
          entranceDelayFrames={
            reduced ? 0 : captionEnergyConfig.textDelayFrames
          }
          stagger={stagger}
          reduced={reduced}
          theme={theme}
          emphasis={data.emphasis}
        />
      </CaptionEnergySurface>
    </OverlayRoot>
  );
};
