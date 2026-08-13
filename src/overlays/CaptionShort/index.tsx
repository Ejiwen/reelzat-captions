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
import { captionShortDefaultAnimation } from "./animations";

export type CaptionShortProps = OverlayBaseProps & {
  data: {
    // Exactly one authored line, ≤5 words (enforced upstream).
    lines: string[];
  };
  // Word-level entrance (3-frame stagger on springs.enter). On by default.
  stagger?: boolean;
};

// One big line — auto-fit with @remotion/layout-utils, never wrapped. The
// authored line is the display truth; words enter with the shared stagger and
// the container exits as one.
export const CaptionShort: React.FC<CaptionShortProps> = ({
  data,
  window,
  position,
  direction,
  animation = captionShortDefaultAnimation,
  safeArea,
  textZone,
  fontScale = 1,
  stagger = true,
  reduced,
}) => {
  const { width, height } = useVideoConfig();
  const text = data.lines[0] ?? "";

  const baseSize = width * overlayType.captionSizeFactor * fontScale;
  const maxLineWidth = width * spacing.maxLineWidthFraction;

  // No wrapping, ever: the fitted size wins outright (0.98 margin keeps the
  // fit off the knife edge). Measured once per text.
  const fontSize = useMemo(() => {
    const fitted = fitText({
      text,
      withinWidth: maxLineWidth,
      fontFamily,
      fontWeight: reelTypography.caption,
      validateFontIsLoaded: true,
    });
    return Math.min(baseSize, fitted.fontSize * 0.98);
  }, [text, baseSize, maxLineWidth]);

  const lines = useMemo(() => [tokenizeLine(text)], [text]);
  const bottomOffsetPx = captionBottomOffsetAboveProgressPx({
    width,
    height,
    safeAspectRatio: progressBarConfig.facebookSafeAspectRatio,
    safeAreaInsetPx: progressBarConfig.safeAreaInsetPx,
    ringSizePx: progressBarConfig.ringSizePx,
    clearancePx: progressBarConfig.captionClearancePx,
  });

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
        lineCount={1}
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
