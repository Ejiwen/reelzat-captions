import React from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, staticFile } from "remotion";
import { CaptionPage } from "../captions/CaptionPage";
import { useActiveSegment } from "../captions/useActiveSegment";
import { palette, scrim } from "../design/tokens";
import { useReelPackage } from "../ingest/useReelPackage";
import type { ReelPackage } from "../ingest/resolve";
import { ProgressBar, SafeAreaGuides } from "../overlays";
import type { AsrCaptionedProps } from "../schema/reelProps";
import type { ResolvedCaptions } from "../schema/captions";
import { themes } from "../themes";

// Today's Captioned behaviour, fed from a package folder: ASR cues (sidecar
// captions[] or the package's captions.json) rendered through the existing
// theme machinery. The standalone legacy `Captioned` composition
// (public/video.mp4 + captions.json) stays registered in Root untouched.
export const AsrCaptioned: React.FC<AsrCaptionedProps> = (props) => {
  const pkg = useReelPackage(props.packageDir, props.clipId);

  return (
    <AbsoluteFill>
      {pkg && props.mode === "burn" ? (
        <Sequence premountFor={60}>
          <OffthreadVideo src={staticFile(pkg.media.videoSrc)} pauseWhenBuffering />
        </Sequence>
      ) : null}
      {pkg ? (
        <ProgressBar direction={pkg.direction} reduced={props.reduced} />
      ) : null}
      {pkg && props.mode === "burn" ? (
        <BottomScrim bottomPct={props.safeAreaBottomPct ?? pkg.safeArea.bottomPct} />
      ) : null}
      {pkg?.asr.captions ? (
        <CaptionLayer pkg={pkg} captions={pkg.asr.captions} {...props} />
      ) : null}
    </AbsoluteFill>
  );
};

const BottomScrim: React.FC<{ bottomPct: number }> = ({ bottomPct }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: `${bottomPct + scrim.extraHeightPct}%`,
      backgroundImage: scrim.gradient,
      pointerEvents: "none",
    }}
  />
);

const CaptionLayer: React.FC<
  AsrCaptionedProps & { pkg: ReelPackage; captions: ResolvedCaptions }
> = ({ pkg, captions, theme, offsetMs, fontScale, safeAreaBottomPct, debug }) => {
  const bottomPct = safeAreaBottomPct ?? pkg.safeArea.bottomPct;
  const active = useActiveSegment(captions.segments, offsetMs);

  return (
    <AbsoluteFill>
      {active ? (
        <CaptionPage
          active={active}
          theme={themes[theme]}
          offsetMs={offsetMs}
          fontScale={fontScale}
          safeAreaBottomPct={bottomPct}
        />
      ) : null}
      {debug ? (
        <>
          <SafeAreaGuides
            safeArea={{ ...pkg.safeArea, bottomPct }}
            textZones={pkg.director?.textSafeZones ?? []}
            faceZones={pkg.director?.faces ?? []}
          />
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
              direction: "ltr",
              borderRadius: 8,
            }}
          >
            segment: {active ? active.segment.id : "—"} · word:{" "}
            {active ? active.activeWordIndex : "—"}
          </div>
        </>
      ) : null}
    </AbsoluteFill>
  );
};
