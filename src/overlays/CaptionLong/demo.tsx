import React from "react";
import { DemoStage } from "../DemoStage";
import { CaptionLong } from "./index";
import fixture from "./fixture.json";
import type { OverlayPosition, TextDirection } from "../types";

// Studio: Components/CaptionLong.
export const CaptionLongDemo: React.FC = () => (
  <DemoStage>
    <CaptionLong
      data={fixture.data}
      window={fixture.window}
      position={fixture.position as OverlayPosition}
      direction={fixture.direction as TextDirection}
    />
  </DemoStage>
);
