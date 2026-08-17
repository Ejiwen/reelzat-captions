import React from "react";
import { DemoStage } from "../DemoStage";
import { CaptionLong } from "./index";
import { CaptionEnergyBridge } from "../CaptionEnergy";
import { ProgressBar } from "../ProgressBar";
import fixture from "./fixture.json";
import reflowFixture from "./fixture-reflow.json";
import type { OverlayPosition, TextDirection } from "../types";

const Stage: React.FC<{ fixture: typeof fixture }> = ({ fixture: f }) => (
  <DemoStage>
    <ProgressBar
      direction={f.direction as TextDirection}
      interactionWindows={[f.window]}
      theme="religion"
    />
    <CaptionEnergyBridge
      window={f.window}
      position={f.position as OverlayPosition}
      lineCount={2}
      theme="religion"
    />
    <CaptionLong
      data={f.data}
      window={f.window}
      position={f.position as OverlayPosition}
      direction={f.direction as TextDirection}
      theme="religion"
    />
  </DemoStage>
);

// Studio: Components/CaptionLong.
export const CaptionLongDemo: React.FC = () => <Stage fixture={fixture} />;

// Studio: Components/CaptionLong-Reflow — two authored lines long enough that
// keeping the break would shrink the type past reflowMinScale, so the words
// re-balance across three lines instead.
export const CaptionLongReflowDemo: React.FC = () => (
  <Stage fixture={reflowFixture} />
);
