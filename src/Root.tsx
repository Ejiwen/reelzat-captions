import { parseMedia } from "@remotion/media-parser";
import React from "react";
import { Composition, staticFile, type CalculateMetadataFunction } from "remotion";
import { CaptionedVideo } from "./CaptionedVideo";
import { compositionProps, defaultProps, type CompositionProps } from "./schema/props";

const FPS = 30;

// Dimensions and duration always come from the source video — never hardcoded.
const calculateMetadata: CalculateMetadataFunction<CompositionProps> = async ({ props }) => {
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

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Captioned"
      component={CaptionedVideo}
      schema={compositionProps}
      defaultProps={defaultProps}
      calculateMetadata={calculateMetadata}
      // Fallbacks shown until calculateMetadata resolves.
      durationInFrames={FPS}
      width={1080}
      height={1920}
      fps={FPS}
    />
  );
};
