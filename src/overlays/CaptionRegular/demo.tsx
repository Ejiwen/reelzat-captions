import React from "react";
import { DemoStage } from "../DemoStage";
import { CaptionEnergyBridge } from "../CaptionEnergy";
import { ProgressBar } from "../ProgressBar";
import type { OverlayPosition, TextDirection } from "../types";
import fixture from "./fixture.json";
import verseFixture from "./fixture-verse.json";
import { CaptionRegular } from "./index";

const Stage: React.FC<{ fixture: typeof fixture | typeof verseFixture }> = ({
  fixture: sample,
}) => (
  <DemoStage>
    <ProgressBar
      direction={sample.direction as TextDirection}
      interactionWindows={[sample.window]}
      theme="culture"
    />
    <CaptionEnergyBridge
      window={sample.window}
      position={sample.position as OverlayPosition}
      lineCount={sample.data.lines.length}
      theme="culture"
    />
    <CaptionRegular
      data={sample.data}
      window={sample.window}
      position={sample.position as OverlayPosition}
      direction={sample.direction as TextDirection}
      theme="culture"
    />
  </DemoStage>
);

// Studio: Components/CaptionRegular-Demo.
export const CaptionRegularDemo: React.FC = () => <Stage fixture={fixture} />;

// Studio: Components/CaptionRegular-Verse.
export const CaptionRegularVerseDemo: React.FC = () => (
  <Stage fixture={verseFixture} />
);
