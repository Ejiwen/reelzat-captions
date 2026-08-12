import { fitText } from "@remotion/layout-utils";
import React, { useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { fontFamily } from "../../design/fonts";
import {
  overlaySurfaces,
  overlayType,
  palette,
  spacing,
  textShadow,
  typeScale,
} from "../../design/tokens";
import { OverlayRoot } from "../OverlayRoot";
import type { OverlayBaseProps } from "../types";
import { hookDefaultAnimation, underlineSweep } from "./animations";

export type HookProps = OverlayBaseProps & {
  data: {
    text: string;
  };
};

// The opening statement — the strongest element on screen. Larger type than
// any caption, an accent underline that sweeps in once the text has resolved,
// blur-in + springPop entrance, quick dip exit. It must read within its first
// 3 words, so the text starts resolving at frame 0 of its window.
export const Hook: React.FC<HookProps> = ({
  data,
  window,
  position = "top",
  direction,
  animation = hookDefaultAnimation,
  safeArea,
  textZone,
  fontScale = 1,
  reduced,
}) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const baseSize = width * overlayType.hookSizeFactor * fontScale;
  const maxLineWidth = width * spacing.maxLineWidthFraction;

  // Fit on one line when possible; long hooks shrink to 0.7× base, then wrap
  // (balanced) to two lines. Measured once, not per frame. When the chosen
  // size fits per measurement we FORCE nowrap — the engine can never disagree
  // with the measurement and reflow mid-clip (a ≤2% overflow into the side
  // gutter is invisible; a line-count flip is not).
  const { fontSize, oneLine } = useMemo(() => {
    const fitted = fitText({
      text: data.text,
      withinWidth: maxLineWidth,
      fontFamily,
      fontWeight: typeScale.fontWeight,
      validateFontIsLoaded: true,
    });
    const size = Math.max(
      Math.min(baseSize, fitted.fontSize * 0.98),
      baseSize * overlayType.hookMinFitScale,
    );
    return { fontSize: size, oneLine: fitted.fontSize * 0.98 >= size };
  }, [data.text, baseSize, maxLineWidth]);

  const sweep = underlineSweep(frame, fps, window.startFrame, reduced);

  return (
    <OverlayRoot
      window={window}
      position={position}
      direction={direction}
      animation={animation}
      safeArea={safeArea}
      textZone={textZone}
      reduced={reduced}
    >
      <div
        style={{
          maxWidth: oneLine ? undefined : maxLineWidth,
          whiteSpace: oneLine ? "nowrap" : undefined,
          textAlign: "center",
          textWrap: oneLine ? undefined : "balance",
          fontFamily,
          fontWeight: typeScale.fontWeight,
          fontSize,
          lineHeight: typeScale.lineHeight,
          color: palette.ink,
          textShadow,
          paddingBlock: `${spacing.linePaddingBlockEm}em`,
        }}
      >
        {data.text}
      </div>
      <div
        style={{
          height: Math.max(4, fontSize * 0.09),
          width: fontSize * 3.2,
          borderRadius: 999,
          backgroundImage: overlaySurfaces.accentUnderlineGradient,
          // Sweeps from the inline-start edge — transform only, no layout shift.
          transform: `scaleX(${Math.min(1, Math.max(0, sweep)).toFixed(4)})`,
          transformOrigin: direction === "rtl" ? "right center" : "left center",
          opacity: sweep > 0 ? 1 : 0,
        }}
      />
    </OverlayRoot>
  );
};
