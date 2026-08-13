import { fitText } from "@remotion/layout-utils";
import React, { useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { fontFamily, reelTypography } from "../../design/fonts";
import {
  overlayType,
  palette,
  spacing,
  textShadow,
  typeScale,
} from "../../design/tokens";
import { tokenizeLine } from "../../schema/captions";
import { HookBg } from "../HookBg";
import { resolveHookBgTheme, type HookBgTheme } from "../HookBg/themes";
import { OverlayRoot } from "../OverlayRoot";
import { DEFAULT_SAFE_AREA, type OverlayBaseProps, type OverlayTextZone } from "../types";
import { hookExitProgress, hookWordStyle, shimmerStyle } from "./animations";
import { hookConfig } from "./config";

export type HookProps = OverlayBaseProps & {
  data: {
    text: string;
    // Editorial background theme for HookBg. Priority: this explicit value →
    // deterministic keyword fallback on the hook text → the configured
    // defaultTheme. Unknown values degrade to the fallback chain.
    backgroundTheme?: HookBgTheme;
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

  const baseSize =
    width * overlayType.hookSizeFactor * fontScale * Math.max(0.1, hookConfig.fontSizeScale);
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
      fontWeight: reelTypography.hook,
      validateFontIsLoaded: true,
    });
    const size = Math.max(
      Math.min(baseSize, fitted.fontSize * 0.98),
      baseSize * overlayType.hookMinFitScale,
    );
    return { fontSize: size, oneLine: fitted.fontSize * 0.98 >= size };
  }, [data.text, baseSize, maxLineWidth]);

  const words = useMemo(() => tokenizeLine(data.text), [data.text]);
  const shimmer = shimmerStyle({ frame, fps, window, wordCount: words.length, reduced });
  const exitProgress = hookExitProgress(frame, fps, window, words.length);
  const backgroundTheme = resolveHookBgTheme({
    explicit: data.backgroundTheme,
    text: data.text,
    fallback: hookConfig.background.defaultTheme,
  });

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
      <HookBg
        windowStartFrame={window.startFrame}
        exitProgress={exitProgress}
        settings={hookConfig.background}
        theme={backgroundTheme}
        reduced={reduced}
      />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: oneLine ? undefined : maxLineWidth,
          whiteSpace: oneLine ? "nowrap" : undefined,
          textAlign: "center",
          textWrap: oneLine ? undefined : "balance",
          fontFamily,
          fontWeight: reelTypography.hook,
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
    </OverlayRoot>
  );
};
