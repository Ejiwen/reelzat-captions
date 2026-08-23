import React, { useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
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
import { captionShortDefaultAnimation } from "./animations";
import type { HookBgTheme } from "../HookBg/themes";
import { captionPlacementStyle } from "../captionSplitPlacement";

export type CaptionShortProps = OverlayBaseProps & {
  data: {
    // Exactly one authored line, ≤5 words (enforced upstream).
    lines: string[];
    emphasis?: string[];
  };
  // Word-level entrance (3-frame stagger on springs.enter). On by default.
  stagger?: boolean;
  theme?: HookBgTheme;
};

// One big line — measured word by word, never wrapped. The authored line is
// the display truth; words enter with the shared stagger and the container
// exits as one. It shares the caption band, card and bottom anchor with
// CaptionLong, so the two read as the same object at different lengths.
export const CaptionShort: React.FC<CaptionShortProps> = ({
  data,
  window,
  position,
  direction,
  animation = captionShortDefaultAnimation,
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
  const text = data.lines[0] ?? "";
  const px = width / 1080;

  const resolvedSafeArea = safeArea ?? DEFAULT_SAFE_AREA;
  const baseSize = width * overlayType.captionShortSizeFactor * fontScale;
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
    paddingBlockPx: captionEnergyConfig.surfacePaddingBlockPx * px,
  });

  // No wrapping, ever: maxLineCount 1 means the fitted size wins outright.
  const layout = useMemo(
    () =>
      measureCaptionLayout({
        lines: [tokenizeLine(text)],
        baseFontSize: baseSize,
        maxTextWidthPx: maxLineWidth,
        maxTextHeightPx: maxTextHeight,
        maxLineCount: 1,
      }),
    [text, baseSize, maxLineWidth, maxTextHeight],
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
      animation={animation}
      safeArea={resolvedSafeArea}
      textZone={textZone}
      bottomOffsetPx={bottomOffsetPx}
      placementStyle={placementStyle}
      reduced={reduced}
      trailOnEntry={stagger}
    >
      <CaptionEnergySurface
        window={window}
        lineCount={1}
        position={position}
        textZone={textZone}
        safeArea={resolvedSafeArea}
        splitWindows={splitWindows}
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
