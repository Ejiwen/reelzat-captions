import { parseMedia } from "@remotion/media-parser";
import React from "react";
import { Composition, Folder, staticFile, type CalculateMetadataFunction } from "remotion";
import { CaptionedVideo } from "./CaptionedVideo";
import { AsrCaptioned } from "./compositions/AsrCaptioned";
import { AuthoredReel } from "./compositions/AuthoredReel";
import type { ReelsManifest } from "./ingest/manifest";
import { CaptionLongDemo } from "./overlays/CaptionLong/demo";
import { CaptionShortDemo } from "./overlays/CaptionShort/demo";
import { HookDemo } from "./overlays/Hook/demo";
import { HookBgDemo } from "./overlays/HookBg/demo";
import { NameplateDemo } from "./overlays/Nameplate/demo";
import { SafeAreaDemo } from "./overlays/SafeArea/demo";
import {
  asrCaptionedProps,
  authoredReelProps,
  defaultAsrCaptionedProps,
  defaultAuthoredReelProps,
} from "./schema/reelProps";
import { compositionProps, defaultProps, type CompositionProps } from "./schema/props";
import manifestJson from "./generated/reels-manifest.json";

const FPS = 30;

// Written by scripts/discover-reels.ts (npm pre-scripts) — Root never scans
// the filesystem at runtime, and per-reel metadata comes straight from each
// package's sidecar via the manifest. No async probing.
const manifest = manifestJson as ReelsManifest;

// Legacy path only: dimensions and duration come from the source video.
const calculateLegacyMetadata: CalculateMetadataFunction<CompositionProps> = async ({
  props,
}) => {
  const { slowDurationInSeconds, dimensions } = await parseMedia({
    src: staticFile(props.videoSrc),
    fields: { slowDurationInSeconds: true, dimensions: true },
  });
  if (!dimensions) {
    throw new Error(`Could not read dimensions from ${props.videoSrc}`);
  }
  return {
    durationInFrames: Math.floor(slowDurationInSeconds * FPS),
    width: dimensions.width,
    height: dimensions.height,
    fps: FPS,
  };
};

const DEMO = { durationInFrames: 180, fps: 30, width: 1080, height: 1920 } as const;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Folder name="Reels">
        {manifest.reels.map((reel) =>
          reel.captionSource === "authored" ? (
            <Composition
              key={reel.id}
              id={reel.id}
              component={AuthoredReel}
              schema={authoredReelProps}
              defaultProps={{
                packageDir: reel.dir,
                clipId: reel.id,
                ...defaultAuthoredReelProps,
              }}
              durationInFrames={reel.durationInFrames}
              width={reel.width}
              height={reel.height}
              fps={reel.fps}
            />
          ) : (
            <Composition
              key={reel.id}
              id={reel.id}
              component={AsrCaptioned}
              schema={asrCaptionedProps}
              defaultProps={{
                packageDir: reel.dir,
                clipId: reel.id,
                ...defaultAsrCaptionedProps,
              }}
              durationInFrames={reel.durationInFrames}
              width={reel.width}
              height={reel.height}
              fps={reel.fps}
            />
          ),
        )}
      </Folder>

      <Folder name="Components">
        <Composition id="Hook-Demo" component={HookDemo} {...DEMO} />
        <Composition id="HookBg-Demo" component={HookBgDemo} {...DEMO} />
        <Composition id="CaptionShort-Demo" component={CaptionShortDemo} {...DEMO} />
        <Composition id="CaptionLong-Demo" component={CaptionLongDemo} {...DEMO} />
        <Composition id="Nameplate-Demo" component={NameplateDemo} {...DEMO} />
        <Composition id="SafeArea-Demo" component={SafeAreaDemo} {...DEMO} />
      </Folder>

      <Folder name="Legacy">
        <Composition
          id="Captioned"
          component={CaptionedVideo}
          schema={compositionProps}
          defaultProps={defaultProps}
          calculateMetadata={calculateLegacyMetadata}
          // Fallbacks shown until calculateMetadata resolves.
          durationInFrames={FPS}
          width={1080}
          height={1920}
          fps={FPS}
        />
      </Folder>
    </>
  );
};
