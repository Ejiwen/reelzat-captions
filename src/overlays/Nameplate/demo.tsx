import React from "react";
import { DemoStage } from "../DemoStage";
import { Nameplate } from "./index";
import fixture from "./fixture.json";
import type { OverlayPosition, TextDirection } from "../types";

// Studio: Components/Nameplate.
export const NameplateDemo: React.FC = () => (
  <DemoStage>
    <Nameplate
      data={fixture.data}
      window={fixture.window}
      position={fixture.position as OverlayPosition}
      direction={fixture.direction as TextDirection}
    />
  </DemoStage>
);
