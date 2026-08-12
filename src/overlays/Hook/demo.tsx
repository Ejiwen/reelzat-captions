import React from "react";
import { DemoStage } from "../DemoStage";
import { Hook } from "./index";
import fixture from "./fixture.json";
import type { OverlayPosition, TextDirection } from "../types";

// Studio: Components/Hook. Previews the hook in isolation on a dark stage.
export const HookDemo: React.FC = () => (
  <DemoStage>
    <Hook
      data={fixture.data}
      window={fixture.window}
      position={fixture.position as OverlayPosition}
      direction={fixture.direction as TextDirection}
    />
  </DemoStage>
);
