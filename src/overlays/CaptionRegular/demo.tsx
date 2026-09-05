import React from "react";
import { DemoStage } from "../DemoStage";
import { CaptionEnergyBridge } from "../CaptionEnergy";
import { ProgressBar } from "../ProgressBar";
import type { OverlayPosition, TextDirection } from "../types";
import fixture from "./fixture.json";
import verseFixture from "./fixture-verse.json";
import { CaptionRegular } from "./index";
import { CaptionWords } from "../CaptionWords";

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

// Studio: Components/CaptionRegular-Words. Frame 108 shows the completed
// first line retained above the actively spoken second line.
export const CaptionRegularWordsDemo: React.FC = () => {
  const window = { startFrame: 0, endFrame: 180 };
  const captions = [
    {
      type: "regular" as const,
      lines: ["القراءة المريحة تمنح المعنى وقتاً"],
      position: "bottom" as const,
      window: { startFrame: 0, endFrame: 68 },
      words: [
        { text: "القراءة", startFrame: 10, endFrame: 24 },
        { text: "المريحة", startFrame: 24, endFrame: 38 },
        { text: "تمنح", startFrame: 38, endFrame: 48 },
        { text: "المعنى", startFrame: 48, endFrame: 58 },
        { text: "وقتاً", startFrame: 58, endFrame: 68 },
      ],
      verse: false,
    },
    {
      type: "regular" as const,
      lines: ["والكلمات تنبض بالحياة حين ننطقها"],
      position: "bottom" as const,
      window: { startFrame: 68, endFrame: 160 },
      words: [
        { text: "والكلمات", startFrame: 68, endFrame: 84 },
        { text: "تنبض", startFrame: 84, endFrame: 100 },
        { text: "بالحياة", startFrame: 100, endFrame: 118 },
        { text: "حين", startFrame: 118, endFrame: 134 },
        { text: "ننطقها", startFrame: 134, endFrame: 154 },
      ],
      verse: false,
    },
  ];
  return (
    <DemoStage>
      <ProgressBar
        direction="rtl"
        interactionWindows={[window]}
        theme="general"
      />
      <CaptionWords
        captions={captions}
        window={window}
        position="bottom"
        direction="rtl"
        theme="general"
      />
    </DemoStage>
  );
};
