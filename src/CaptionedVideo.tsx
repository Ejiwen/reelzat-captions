import React, { useEffect, useState } from "react";
import {
  AbsoluteFill,
  cancelRender,
  continueRender,
  delayRender,
  OffthreadVideo,
  staticFile,
  useVideoConfig,
} from "remotion";
import { CaptionPage } from "./captions/CaptionPage";
import { useActiveSegment } from "./captions/useActiveSegment";
import { waitForFonts } from "./design/fonts";
import { palette, scrim } from "./design/tokens";
import type { CompositionProps } from "./schema/props";
import { validateCaptions, type ResolvedCaptions } from "./schema/captions";
import { themes } from "./themes";

// Top-level layering. In alpha mode the video layer and scrim are simply not
// rendered and no AbsoluteFill carries a backgroundColor, so the output stays
// fully transparent while caption timing, position and animation are
// byte-identical to burn mode.
export const CaptionedVideo: React.FC<CompositionProps> = (props) => {
  const captions = useCaptions(props.captionsSrc);

  return (
    <AbsoluteFill>
      {props.mode === "burn" ? (
        <OffthreadVideo src={staticFile(props.videoSrc)} />
      ) : null}
      {props.mode === "burn" ? (
        <Scrim safeAreaBottomPct={props.safeAreaBottomPct} />
      ) : null}
      {captions ? <CaptionLayer captions={captions} {...props} /> : null}
    </AbsoluteFill>
  );
};

// Loads captions.json and blocks the first frame on both the parsed file and
// the caption font, so frame 0 never renders empty or in a fallback font.
const useCaptions = (captionsSrc: string): ResolvedCaptions | null => {
  const [captions, setCaptions] = useState<ResolvedCaptions | null>(null);
  const [handle] = useState(() => delayRender(`Loading ${captionsSrc} and fonts`));

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(staticFile(captionsSrc)).then((res) => {
        if (!res.ok) {
          throw new Error(`Could not load ${captionsSrc}: HTTP ${res.status}`);
        }
        return res.json();
      }),
      waitForFonts(),
    ])
      .then(([json]) => {
        if (cancelled) {
          return;
        }
        setCaptions(validateCaptions(json));
        continueRender(handle);
      })
      .catch((err: unknown) => {
        cancelRender(err);
      });
    return () => {
      cancelled = true;
    };
  }, [captionsSrc, handle]);

  return captions;
};

const CaptionLayer: React.FC<CompositionProps & { captions: ResolvedCaptions }> = ({
  captions,
  theme,
  offsetMs,
  fontScale,
  safeAreaBottomPct,
  debug,
}) => {
  const active = useActiveSegment(captions.segments, offsetMs);

  return (
    <AbsoluteFill>
      {active ? (
        <CaptionPage
          active={active}
          theme={themes[theme]}
          offsetMs={offsetMs}
          fontScale={fontScale}
          safeAreaBottomPct={safeAreaBottomPct}
        />
      ) : null}
      {debug ? (
        <DebugOverlay active={active} safeAreaBottomPct={safeAreaBottomPct} />
      ) : null}
    </AbsoluteFill>
  );
};

// Burn mode only: a gradient scrim between video and text so captions stay
// readable over bright shots. Deliberately not an opaque box.
const Scrim: React.FC<{ safeAreaBottomPct: number }> = ({ safeAreaBottomPct }) => {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: `${safeAreaBottomPct + scrim.extraHeightPct}%`,
        backgroundImage: scrim.gradient,
        pointerEvents: "none",
      }}
    />
  );
};

// Dev aid only — never visible in a normal render.
const DebugOverlay: React.FC<{
  active: ReturnType<typeof useActiveSegment>;
  safeAreaBottomPct: number;
}> = ({ active, safeAreaBottomPct }) => {
  const { height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top: 24,
          left: 24,
          padding: "12px 16px",
          background: "rgba(11,31,58,0.8)",
          color: palette.ink,
          fontFamily: "monospace",
          fontSize: 28,
          lineHeight: 1.5,
          direction: "ltr",
          borderRadius: 8,
        }}
      >
        <div>segment: {active ? active.segment.id : "—"}</div>
        <div>word: {active ? active.activeWordIndex : "—"}</div>
        <div>progress: {active ? active.progress.toFixed(2) : "—"}</div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: (safeAreaBottomPct / 100) * height,
          borderTop: `2px dashed ${palette.cyan}`,
        }}
      />
    </AbsoluteFill>
  );
};
