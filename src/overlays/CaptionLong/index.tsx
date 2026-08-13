import { fitText } from "@remotion/layout-utils";
import React, { useMemo } from "react";
import { useVideoConfig } from "remotion";
import { fontFamily, reelTypography } from "../../design/fonts";
import { overlayType, spacing, typeScale } from "../../design/tokens";
import { tokenizeLine } from "../../schema/captions";
import { CaptionLines } from "../CaptionLines";
import { CaptionEnergySurface, captionEnergyConfig } from "../CaptionEnergy";
import { OverlayRoot } from "../OverlayRoot";
import type { OverlayBaseProps } from "../types";
import { progressBarConfig } from "../ProgressBar/config";
import { captionBottomOffsetAboveProgressPx } from "../ProgressBar/math";
import { captionLongDefaultAnimation } from "./animations";

export type CaptionLongProps = OverlayBaseProps & {
  data: {
    // Exactly two authored lines, balanced by the author (enforced upstream).
    lines: string[];
  };
  stagger?: boolean;
};

// Two balanced lines. One font size for both — fitted to the wider line so
// the pair reads as a block — and a flat word-stagger index running across
// the line break. Line breaking is the author's decision; nothing re-wraps.
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
}) => {
  const { width, height } = useVideoConfig();

  const baseSize = width * overlayType.captionSizeFactor * fontScale;
  const maxLineWidth = width * spacing.maxLineWidthFraction;

  // The wider line dictates the shared size, clamped to [0.75×, 1×] of base —
  // same floor as the legacy caption page. Measured once per caption.
  const fontSize = useMemo(() => {
    let size = baseSize;
    for (const line of data.lines) {
      const fitted = fitText({
        text: line,
        withinWidth: maxLineWidth,
        fontFamily,
        fontWeight: reelTypography.caption,
        validateFontIsLoaded: true,
      });
      size = Math.min(size, fitted.fontSize * 0.98);
    }
    return Math.max(size, baseSize * typeScale.minFitScale);
  }, [data.lines, baseSize, maxLineWidth]);

  const lines = useMemo(() => data.lines.map(tokenizeLine), [data.lines]);
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

  return (
    <OverlayRoot
      window={window}
      position={position}
      direction={direction}
      animation={animation}
      safeArea={safeArea}
      textZone={textZone}
      bottomOffsetPx={bottomOffsetPx}
      reduced={reduced}
      trailOnEntry={stagger}
    >
      <CaptionEnergySurface
        window={window}
        lineCount={2}
        position={position}
        textZone={textZone}
        reduced={reduced}
      >
        <CaptionLines
          lines={lines}
          fontSize={fontSize}
          direction={direction}
          windowStartFrame={window.startFrame}
          entranceDelayFrames={reduced ? 0 : captionEnergyConfig.textDelayFrames}
          stagger={stagger}
          reduced={reduced}
        />
      </CaptionEnergySurface>
    </OverlayRoot>
  );
};
