import React from "react";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { useReelPackage } from "../ingest/useReelPackage";
import type { ReelPackage, ResolvedAuthoredCaption } from "../ingest/resolve";
import {
  CaptionLong,
  CaptionEnergyBridge,
  CaptionRegular,
  CaptionShort,
  Hook,
  MidReelCta,
  Nameplate,
  Outro,
  ProgressBar,
  SafeAreaGuides,
  WindowTimeline,
  findMidReelCtaWindow,
  type OverlayPosition,
  type OverlayTextZone,
  type TimelineItem,
  outroConfig,
} from "../overlays";
import { hookConfig } from "../overlays/Hook/config";
import { resolveHookBgTheme } from "../overlays/HookBg/themes";
import { HookEnergyBridge } from "../overlays/HookEnergyBridge";
import type { AuthoredReelProps } from "../schema/reelProps";
import {
  SoundIdentity,
  soundIdentityConfig,
  type DuckWindow,
} from "../sound-identity";
import { AsrSubtitles } from "./AsrSubtitles";
import { CaptionScrim } from "./CaptionScrim";
import { SourceVideoLayer } from "./SourceVideoLayer";

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
  const { fps, durationInFrames } = useVideoConfig();
  const sourceTheme = pkg?.authored
    ? resolveHookBgTheme({
        explicit:
          props.hookBgTheme ??
          pkg.authored.hook.backgroundTheme ??
          hookConfig.background.themeOverride ??
          undefined,
        text: pkg.authored.hook.text,
        fallback: hookConfig.background.defaultTheme,
      })
    : hookConfig.background.defaultTheme;
  const duckWindows: DuckWindow[] = [];
  if (pkg?.authored) {
    const videoDuration = Math.min(
      pkg.media.durationInFrames,
      durationInFrames,
    );
    const captions = pkg.authored.captions;
    const nextCaptionStart = captions.reduce(
      (earliest, caption) => Math.min(earliest, caption.window.startFrame),
      videoDuration,
    );
    const effectiveHookEnd = Math.max(
      pkg.authored.hook.window.endFrame,
      Math.min(
        videoDuration,
        nextCaptionStart,
        pkg.authored.hook.window.endFrame +
          Math.round(hookConfig.extraHoldSeconds * fps),
      ),
    );
    const ctaWindow = findMidReelCtaWindow({
      durationInFrames: videoDuration,
      fps,
      occupiedWindows: [],
    });
    duckWindows.push({
      startFrame: pkg.authored.hook.window.startFrame,
      endFrame: Math.min(effectiveHookEnd, Math.round(1.8 * fps)),
      gain: soundIdentityConfig.hookDuckGain,
    });
    captions.forEach((caption) =>
      duckWindows.push({
        startFrame: caption.window.startFrame,
        endFrame: Math.min(
          caption.window.endFrame,
          caption.window.startFrame + Math.round(0.9 * fps),
        ),
        gain: soundIdentityConfig.captionDuckGain,
      }),
    );
    if (ctaWindow) {
      duckWindows.push(
        {
          startFrame: ctaWindow.startFrame,
          endFrame: ctaWindow.startFrame + Math.round(2.1 * fps),
          gain: soundIdentityConfig.ctaDuckGain,
        },
        {
          startFrame: ctaWindow.endFrame - Math.round(2.2 * fps),
          endFrame: ctaWindow.endFrame,
          gain: soundIdentityConfig.ctaDuckGain,
        },
      );
    }
  }

  return (
    <AbsoluteFill
      style={{
        backgroundColor:
          pkg && props.mode === "burn"
            ? outroConfig.backgroundColor
            : undefined,
      }}
    >
      {pkg && props.mode === "burn" ? (
        // premountFor keeps the video mounted-and-buffered ahead of time so
        // batch renders never stall waiting for the first frames.
        <Sequence
          durationInFrames={pkg.media.durationInFrames}
          premountFor={60}
        >
          <SourceVideoLayer
            src={pkg.media.videoSrc}
            durationInFrames={pkg.media.durationInFrames}
            reduced={props.reduced}
            theme={sourceTheme}
            duckWindows={duckWindows}
          />
        </Sequence>
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
  const videoDurationInFrames = Math.min(
    pkg.media.durationInFrames,
    durationInFrames,
  );
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
    videoDurationInFrames,
  );
  const hookWindow = {
    ...hook.window,
    endFrame: Math.max(
      hook.window.endFrame,
      Math.min(
        videoDurationInFrames,
        nextCaptionStart,
        hook.window.endFrame + Math.round(hookConfig.extraHoldSeconds * fps),
      ),
    ),
  };

  // The vertical identity rail is spatially separate from the hook/captions,
  // so it can identify the reel from the opening frame through the outro.
  const nameplateWindow = {
    startFrame: 0,
    endFrame: videoDurationInFrames,
  };
  const nameplatePosition: OverlayPosition = "top";

  // The composition is longer than the source by exactly the outro duration.
  // The video Sequence ends first, guaranteeing that neither its image nor
  // its audio continues underneath the brand card.
  const outroDurationInFrames = Math.max(
    1,
    durationInFrames - videoDurationInFrames,
  );
  const outroWindow = {
    startFrame: videoDurationInFrames,
    endFrame: durationInFrames,
  };

  // Resolve the HookBg theme ONCE — the energy bridge and the Hook (which
  // renders HookBg) must always agree. Priority: Studio prop → project-wide
  // the package's hook.backgroundTheme → project-wide fallback
  // → keyword fallback on the hook text → configured default.
  const resolvedHookBgTheme = resolveHookBgTheme({
    explicit:
      hookBgTheme ??
      hook.backgroundTheme ??
      hookConfig.background.themeOverride ??
      undefined,
    text: hook.text,
    fallback: hookConfig.background.defaultTheme,
  });

  const bottomCaptionWindows = captions
    .filter((c) => c.position === "bottom")
    .map((c) => c.window);

  // This lower-third identity moment may coexist with captions: their spatial
  // zones are independent, so keep the CTA truly centred in reel time.
  const midReelCtaWindow = findMidReelCtaWindow({
    durationInFrames: videoDurationInFrames,
    fps,
    occupiedWindows: [hookWindow, ...captions.map((caption) => caption.window)],
  });

  const timeline: TimelineItem[] = [
    { label: "hook", window: hookWindow, position: hook.position },
    ...captions.map((c, i) => ({
      label: `caption ${i + 1} (${c.type})`,
      window: c.window,
      position: c.position,
    })),
    ...(midReelCtaWindow
      ? [
          {
            label: "mid-reel CTA",
            window: midReelCtaWindow,
            position: "bottom" as const,
          },
        ]
      : []),
    {
      label: "nameplate",
      window: nameplateWindow,
      position: nameplatePosition,
    },
    { label: "outro", window: outroWindow, position: "bottom" },
  ];

  return (
    <AbsoluteFill>
      <Sequence durationInFrames={videoDurationInFrames}>
        {midReelCtaWindow ? (
          <MidReelCta
            window={midReelCtaWindow}
            theme={resolvedHookBgTheme}
            reduced={reduced}
          />
        ) : null}
        <ProgressBar
          direction={pkg.direction}
          reduced={reduced}
          interactionWindows={[
            ...captions.map((caption) => caption.window),
            ...(midReelCtaWindow ? [midReelCtaWindow] : []),
          ]}
          theme={resolvedHookBgTheme}
          progressDurationInFrames={videoDurationInFrames}
        />
      </Sequence>
      {mode === "burn" ? (
        <CaptionScrim
          windows={bottomCaptionWindows}
          bottomPct={pkg.safeArea.bottomPct}
          splitWindows={pkg.splitScreenWindows}
          reduced={reduced}
        />
      ) : null}
      {asrSubtitles && pkg.asr.words.length > 0 ? (
        // Just ABOVE the caption strip, so it never collides with authored
        // captions living inside it.
        <AsrSubtitles
          words={pkg.asr.words}
          direction={pkg.direction}
          bottomPct={pkg.safeArea.bottomPct + 2}
          fontScale={fontScale}
        />
      ) : null}
      {captions.map((caption, i) => (
        <React.Fragment key={i}>
          <CaptionEnergyBridge
            window={caption.window}
            position={caption.position}
            textZone={zoneFor(pkg, caption.position)}
            safeArea={pkg.safeArea}
            splitWindows={pkg.splitScreenWindows}
            lineCount={captionLineCount(caption)}
            reduced={reduced}
            theme={resolvedHookBgTheme}
          />
          <AuthoredCaption
            caption={caption}
            pkg={pkg}
            fontScale={fontScale}
            animation={captionAnimation}
            reduced={reduced}
            theme={resolvedHookBgTheme}
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
      <HookEnergyBridge
        window={hookWindow}
        theme={resolvedHookBgTheme}
        reduced={reduced}
      />
      <Nameplate
        data={{
          channel: authored.channel,
          episodeTitle: authored.episodeTitle,
        }}
        window={nameplateWindow}
        position={nameplatePosition}
        direction={pkg.direction}
        safeArea={pkg.safeArea}
        theme={resolvedHookBgTheme}
        fontScale={fontScale}
        reduced={reduced}
      />
      {outroConfig.enabled ? (
        <Sequence
          from={outroWindow.startFrame}
          durationInFrames={outroDurationInFrames}
          premountFor={Math.min(30, outroWindow.startFrame)}
        >
          <Outro
            theme={resolvedHookBgTheme}
            durationInFrames={outroDurationInFrames}
            reduced={reduced}
          />
        </Sequence>
      ) : null}
      {mode === "burn" ? (
        <SoundIdentity
          hookWindow={hookWindow}
          captionWindows={captions.map((caption) => caption.window)}
          ctaWindow={midReelCtaWindow}
          outroStartFrame={outroConfig.enabled ? videoDurationInFrames : null}
        />
      ) : null}
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
  theme: ReturnType<typeof resolveHookBgTheme>;
}> = ({ caption, pkg, fontScale, animation, reduced, theme }) => {
  const shared = {
    window: caption.window,
    position: caption.position,
    direction: pkg.direction,
    animation: animation ?? undefined,
    safeArea: pkg.safeArea,
    textZone: zoneFor(pkg, caption.position),
    splitWindows: pkg.splitScreenWindows,
    fontScale,
    reduced,
    theme,
  };
  switch (caption.type) {
    case "short_1line":
      return (
        <CaptionShort
          data={{ lines: caption.lines, emphasis: caption.emphasis }}
          {...shared}
        />
      );
    case "long_2lines":
      return (
        <CaptionLong
          data={{ lines: caption.lines, emphasis: caption.emphasis }}
          {...shared}
        />
      );
    case "regular":
      return (
        <CaptionRegular
          data={{
            lines: caption.lines,
            words: caption.words,
            verse: caption.verse,
            emphasis: caption.emphasis,
          }}
          {...shared}
        />
      );
  }
};

const captionLineCount = (caption: ResolvedAuthoredCaption): number => {
  switch (caption.type) {
    case "short_1line":
      return 1;
    case "long_2lines":
      return 2;
    case "regular":
      return caption.lines.length;
  }
};
