import React from "react";
import { DemoStage } from "../DemoStage";
import { Nameplate } from "./index";
import fixture from "./fixture.json";
import type { OverlayPosition, TextDirection } from "../types";

// Studio: Components/Nameplate. Includes a dim window (frames 80–130) so the
// "never compete with captions" behaviour is visible in isolation.
export const NameplateDemo: React.FC = () => (
  <DemoStage>
    <Nameplate
      data={fixture.data}
      window={fixture.window}
      position={fixture.position as OverlayPosition}
      direction={fixture.direction as TextDirection}
      dimWindows={[{ startFrame: 80, endFrame: 130 }]}
    />
  </DemoStage>
);
