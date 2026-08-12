import React from "react";
import { DemoStage } from "../DemoStage";
import { CaptionShort } from "./index";
import fixture from "./fixture.json";
import type { OverlayPosition, TextDirection } from "../types";

// Studio: Components/CaptionShort.
export const CaptionShortDemo: React.FC = () => (
  <DemoStage>
    <CaptionShort
      data={fixture.data}
      window={fixture.window}
      position={fixture.position as OverlayPosition}
      direction={fixture.direction as TextDirection}
    />
  </DemoStage>
);
