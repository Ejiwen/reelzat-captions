import type React from "react";

// Composes preset outputs: opacities multiply, transforms and filters
// concatenate, everything else is last-wins. This is what lets an overlay run
// its enter and exit presets simultaneously — outside its transition windows
// each preset returns identity values.
export const mergeMotionStyles = (
  ...styles: (React.CSSProperties | undefined)[]
): React.CSSProperties => {
  const out: React.CSSProperties = {};
  for (const style of styles) {
    if (!style) {
      continue;
    }
    for (const [key, value] of Object.entries(style)) {
      if (value === undefined || value === null) {
        continue;
      }
      if (key === "opacity") {
        out.opacity = ((out.opacity as number | undefined) ?? 1) * (value as number);
      } else if (key === "transform") {
        out.transform = out.transform ? `${out.transform} ${value as string}` : (value as string);
      } else if (key === "filter") {
        out.filter = out.filter ? `${out.filter} ${value as string}` : (value as string);
      } else {
        (out as Record<string, unknown>)[key] = value;
      }
    }
  }
  return out;
};
