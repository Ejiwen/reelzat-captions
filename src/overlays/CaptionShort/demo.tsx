import React from "react";
import { DemoStage } from "../DemoStage";
import { CaptionShort } from "./index";
import { CaptionEnergyBridge } from "../CaptionEnergy";
import { ProgressBar } from "../ProgressBar";
import fixture from "./fixture.json";
import type { OverlayPosition, TextDirection } from "../types";

// Studio: Components/CaptionShort.
export const CaptionShortDemo: React.FC = () => (
  <DemoStage>
    <ProgressBar
      direction={fixture.direction as TextDirection}
      interactionWindows={[fixture.window]}
      theme="politics"
    />
    <CaptionEnergyBridge
      window={fixture.window}
      position={fixture.position as OverlayPosition}
      lineCount={1}
      theme="politics"
    />
    <CaptionShort
      data={fixture.data}
      window={fixture.window}
      position={fixture.position as OverlayPosition}
      direction={fixture.direction as TextDirection}
      theme="politics"
    />
  </DemoStage>
);
