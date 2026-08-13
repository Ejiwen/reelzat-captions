import React from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, staticFile, useVideoConfig } from "remotion";
import { useReelPackage } from "../ingest/useReelPackage";
import type { ReelPackage, ResolvedAuthoredCaption } from "../ingest/resolve";
import {
  CaptionLong,
  CaptionEnergyBridge,
  CaptionShort,
  Hook,
  Nameplate,
  ProgressBar,
  SafeAreaGuides,
  WindowTimeline,
  type OverlayPosition,
  type OverlayTextZone,
  type TimelineItem,
} from "../overlays";
import { hookConfig } from "../overlays/Hook/config";
import { resolveHookBgTheme } from "../overlays/HookBg/themes";
import { HookEnergyBridge } from "../overlays/HookEnergyBridge";
import type { AuthoredReelProps } from "../schema/reelProps";
import { AsrSubtitles } from "./AsrSubtitles";
import { CaptionScrim } from "./CaptionScrim";

// The publish-ready composition: clean 9:16 clip + hook + authored captions
// + channel nameplate, choreographed:
//   - the hook owns the opening (its window starts at frame 0)
//   - the nameplate slides in exactly as the hook starts its exit, then stays
//   - captions play their authored windows
//   - a promo is the same composition with zero captions — no special casing.
// In alpha mode the video layer and scrim are simply not rendered, keeping
// overlay layers pixel-identical between modes (same contract as the legacy
// Captioned composition).
export const AuthoredReel: React.FC<AuthoredReelProps> = (props) => {
  const pkg = useReelPackage(props.packageDir, props.clipId);

  return (
    <AbsoluteFill>
      {pkg && props.mode === "burn" ? (
        // premountFor keeps the video mounted-and-buffered ahead of time so
        // batch renders never stall waiting for the first frames.
        (<Sequence premountFor={60}>
          <OffthreadVideo src={staticFile(pkg.media.videoSrc)} pauseWhenBuffering />
        </Sequence>)
      ) : null}
      {pkg ? <OverlayStack pkg={pkg} {...props} /> : null}
    </AbsoluteFill>
  );
};

const zoneFor = (
  pkg: ReelPackage,
  position: OverlayPosition,
): OverlayTextZone | null =>
  pkg.director?.textSafeZones.find((z) => z.position === position) ?? null;

const OverlayStack: React.FC<AuthoredReelProps & { pkg: ReelPackage }> = ({
  pkg,
  mode,
  asrSubtitles,
  fontScale,
  hookAnimation,
  captionAnimation,
  hookBgTheme,
  reduced,
  debug,
}) => {
  const { fps, durationInFrames } = useVideoConfig();
  const authored = pkg.authored;

  if (!authored) {
    // captionSource "asr" packages register as AsrCaptioned; reaching here
    // means the manifest and the sidecar disagree.
    throw new Error(
      `Package "${pkg.clipId}" has no authoring data — it should render via AsrCaptioned.`,
    );
  }

  const { hook, captions } = authored;

  // Keep the entrance and exit timings untouched; extend only the steady
  // hold between them. Stop before the next authored caption so overlays do
  // not compete for reading attention, and never exceed the clip duration.
  const nextCaptionStart = captions.reduce(
    (earliest, caption) => Math.min(earliest, caption.window.startFrame),
    durationInFrames,
  );
  const hookWindow = {
    ...hook.window,
    endFrame: Math.max(
      hook.window.endFrame,
      Math.min(
        durationInFrames,
        nextCaptionStart,
        hook.window.endFrame + Math.round(hookConfig.extraHoldSeconds * fps),
      ),
    ),
  };

  // The vertical identity rail is spatially separate from the hook/captions,
  // so it can identify the reel from the opening frame through the outro.
  const nameplateWindow = {
    startFrame: 0,
    endFrame: durationInFrames,
  };
  const nameplatePosition: OverlayPosition = "top";

  // Resolve the HookBg theme ONCE — the energy bridge and the Hook (which
  // renders HookBg) must always agree. Priority: Studio prop → project-wide
  // hookConfig.background.themeOverride → the package's hook.backgroundTheme
  // → keyword fallback on the hook text → configured default.
  const resolvedHookBgTheme = resolveHookBgTheme({
    explicit:
      hookBgTheme ?? hookConfig.background.themeOverride ?? hook.backgroundTheme ?? undefined,
    text: hook.text,
    fallback: hookConfig.background.defaultTheme,
  });

  const bottomCaptionWindows = captions
    .filter((c) => c.position === "bottom")
    .map((c) => c.window);

  const timeline: TimelineItem[] = [
    { label: "hook", window: hookWindow, position: hook.position },
    ...captions.map((c, i) => ({
      label: `caption ${i + 1} (${c.type})`,
      window: c.window,
      position: c.position,
    })),
    { label: "nameplate", window: nameplateWindow, position: nameplatePosition },
  ];

  return (
    <AbsoluteFill>
      <ProgressBar
        direction={pkg.direction}
        reduced={reduced}
        interactionWindows={captions.map((caption) => caption.window)}
      />
      {mode === "burn" ? (
        <CaptionScrim windows={bottomCaptionWindows} bottomPct={pkg.safeArea.bottomPct} />
      ) : null}
      {asrSubtitles && pkg.asr.words.length > 0 ? (
        // Just ABOVE the caption strip, so it never collides with authored
        // captions living inside it.
        (<AsrSubtitles
          words={pkg.asr.words}
          direction={pkg.direction}
          bottomPct={pkg.safeArea.bottomPct + 2}
          fontScale={fontScale}
        />)
      ) : null}
      {captions.map((caption, i) => (
        <React.Fragment key={i}>
          <CaptionEnergyBridge
            window={caption.window}
            position={caption.position}
            textZone={zoneFor(pkg, caption.position)}
            lineCount={caption.type === "short_1line" ? 1 : 2}
            reduced={reduced}
          />
          <AuthoredCaption
            caption={caption}
            pkg={pkg}
            fontScale={fontScale}
            animation={captionAnimation}
            reduced={reduced}
          />
        </React.Fragment>
      ))}
      <Hook
        data={{ text: hook.text, backgroundTheme: resolvedHookBgTheme }}
        window={hookWindow}
        position={hook.position}
        direction={pkg.direction}
        animation={hookAnimation ?? undefined}
        safeArea={pkg.safeArea}
        textZone={zoneFor(pkg, hook.position)}
        fontScale={fontScale}
        reduced={reduced}
      />
      {/* Render after Hook: the narrow beam and compact impact must remain
          visible over the solid HookBg. Its restrained size keeps text clear. */}
      <HookEnergyBridge window={hookWindow} theme={resolvedHookBgTheme} reduced={reduced} />
      <Nameplate
        data={{ channel: authored.channel, episodeTitle: authored.episodeTitle }}
        window={nameplateWindow}
        position={nameplatePosition}
        direction={pkg.direction}
        safeArea={pkg.safeArea}
        fontScale={fontScale}
        reduced={reduced}
      />
      {debug ? (
        <>
          <SafeAreaGuides
            safeArea={pkg.safeArea}
            textZones={pkg.director?.textSafeZones ?? []}
            faceZones={pkg.director?.faces ?? []}
          />
          <WindowTimeline items={timeline} />
        </>
      ) : null}
    </AbsoluteFill>
  );
};

const AuthoredCaption: React.FC<{
  caption: ResolvedAuthoredCaption;
  pkg: ReelPackage;
  fontScale: number;
  animation: AuthoredReelProps["captionAnimation"];
  reduced: boolean;
}> = ({ caption, pkg, fontScale, animation, reduced }) => {
  const shared = {
    window: caption.window,
    position: caption.position,
    direction: pkg.direction,
    animation: animation ?? undefined,
    safeArea: pkg.safeArea,
    textZone: zoneFor(pkg, caption.position),
    fontScale,
    reduced,
  };
  return caption.type === "short_1line" ? (
    <CaptionShort data={{ lines: caption.lines }} {...shared} />
  ) : (
    <CaptionLong data={{ lines: caption.lines }} {...shared} />
  );
};
