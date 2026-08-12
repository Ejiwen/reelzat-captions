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
import { tokenizeLine } from "../../schema/captions";
import { OverlayRoot } from "../OverlayRoot";
import { DEFAULT_SAFE_AREA, type OverlayBaseProps, type OverlayTextZone } from "../types";
import { hookExitProgress, hookWordStyle, shimmerStyle, underlineSweep } from "./animations";
import { hookConfig } from "./config";

export type HookProps = OverlayBaseProps & {
  data: {
    text: string;
  };
};

// The opening statement — the strongest element on screen. Words rise and
// resolve in sequence, a restrained shimmer crosses once, then words leave in
// reverse order. The word is always the smallest animated unit so Arabic
// shaping remains intact.
export const Hook: React.FC<HookProps> = ({
  data,
  window,
  position = "top",
  direction,
  animation,
  safeArea,
  textZone,
  fontScale = 1,
  reduced,
}) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const resolvedSafeArea = safeArea ?? DEFAULT_SAFE_AREA;

  // Hook placement is controlled centrally by config.ts. A director zone may
  // still narrow or widen the available horizontal area, but it cannot move
  // the hook away from the configured Y position.
  const hookBandHeight = textZone?.hPct ?? hookConfig.bandHeightPct;
  const configuredTextZone: OverlayTextZone = {
    xPct: textZone?.xPct ?? resolvedSafeArea.sidePct,
    yPct: Math.min(100, Math.max(0, hookConfig.yPct)) - hookBandHeight / 2,
    wPct: textZone?.wPct ?? 100 - resolvedSafeArea.sidePct * 2,
    hPct: hookBandHeight,
    position,
  };

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
  const words = useMemo(() => tokenizeLine(data.text), [data.text]);
  const shimmer = shimmerStyle({ frame, fps, window, wordCount: words.length, reduced });
  const exitProgress = hookExitProgress(frame, fps, window, words.length);

  return (
    <OverlayRoot
      window={window}
      position={position}
      direction={direction}
      animation={animation}
      safeArea={resolvedSafeArea}
      textZone={configuredTextZone}
      reduced={reduced}
    >
      <div
        style={{
          position: "relative",
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
        {words.map((word, index) => (
          <React.Fragment key={`${word}-${index}`}>
            <span
              style={{
                display: "inline-block",
                whiteSpace: "nowrap",
                ...hookWordStyle({
                  frame,
                  fps,
                  index,
                  wordCount: words.length,
                  window,
                  reduced,
                }),
              }}
            >
              {word}
            </span>
            {index < words.length - 1 ? " " : null}
          </React.Fragment>
        ))}

        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: `linear-gradient(90deg, transparent 30%, ${palette.gold} 50%, transparent 70%)`,
            backgroundSize: "200% 100%",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            mixBlendMode: "screen",
            ...shimmer,
          }}
        >
          {data.text}
        </span>
      </div>
      <div
        style={{
          height: Math.max(4, fontSize * 0.09),
          width: fontSize * 3.2,
          borderRadius: 999,
          backgroundImage: overlaySurfaces.accentUnderlineGradient,
          // Sweeps from the inline-start edge — transform only, no layout shift.
          transform: `translateY(${(-8 * exitProgress).toFixed(2)}px) scaleX(${Math.min(1, Math.max(0, sweep)).toFixed(4)})`,
          transformOrigin: direction === "rtl" ? "right center" : "left center",
          opacity: sweep > 0 ? 1 - exitProgress : 0,
        }}
      />
    </OverlayRoot>
  );
};
