import { fitText } from "@remotion/layout-utils";
import React, { useMemo } from "react";
import { useVideoConfig } from "remotion";
import { fontFamily } from "../../design/fonts";
import { overlayType, spacing, typeScale } from "../../design/tokens";
import { tokenizeLine } from "../../schema/captions";
import { CaptionLines } from "../CaptionLines";
import { OverlayRoot } from "../OverlayRoot";
import type { OverlayBaseProps } from "../types";
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
  const { width } = useVideoConfig();
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
      fontWeight: typeScale.fontWeight,
      validateFontIsLoaded: true,
    });
    return Math.min(baseSize, fitted.fontSize * 0.98);
  }, [text, baseSize, maxLineWidth]);

  const lines = useMemo(() => [tokenizeLine(text)], [text]);

  return (
    <OverlayRoot
      window={window}
      position={position}
      direction={direction}
      animation={animation}
      safeArea={safeArea}
      textZone={textZone}
      reduced={reduced}
      trailOnEntry={stagger}
    >
      <CaptionLines
        lines={lines}
        fontSize={fontSize}
        direction={direction}
        windowStartFrame={window.startFrame}
        stagger={stagger}
        reduced={reduced}
      />
    </OverlayRoot>
  );
};
