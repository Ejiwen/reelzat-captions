import React from "react";

// Theme-agnostic word primitive. The word is the smallest animatable unit in
// this project — never split into characters, which breaks cursive joining.
// Always in the DOM from the segment's first frame; themes animate opacity and
// transform only, so the line never reflows.
export const Word: React.FC<{
  text: string;
  style: React.CSSProperties;
}> = ({ text, style }) => {
  return (
    <span
      style={{
        display: "inline-block",
        whiteSpace: "pre",
        willChange: "transform, opacity",
        ...style,
      }}
    >
      {text}
    </span>
  );
};
