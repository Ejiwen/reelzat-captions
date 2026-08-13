import React from "react";
import { DemoStage } from "../DemoStage";
import { CaptionLong } from "./index";
import { CaptionEnergyBridge } from "../CaptionEnergy";
import { ProgressBar } from "../ProgressBar";
import fixture from "./fixture.json";
import type { OverlayPosition, TextDirection } from "../types";

// Studio: Components/CaptionLong.
export const CaptionLongDemo: React.FC = () => (
  <DemoStage>
    <ProgressBar
      direction={fixture.direction as TextDirection}
      interactionWindows={[fixture.window]}
      theme="religion"
    />
    <CaptionEnergyBridge
      window={fixture.window}
      position={fixture.position as OverlayPosition}
      lineCount={2}
      theme="religion"
    />
    <CaptionLong
      data={fixture.data}
      window={fixture.window}
      position={fixture.position as OverlayPosition}
      direction={fixture.direction as TextDirection}
      theme="religion"
    />
  </DemoStage>
);
