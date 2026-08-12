import { useEffect, useState } from "react";
import { cancelRender, continueRender, delayRender, staticFile } from "remotion";

// The font files are bundled with the project so Studio and headless renders
// produce identical typography without relying on fonts installed on the host.
export const fontFamily = "Thmanyah Sans";

export const fontWeights = {
  light: 300,
  regular: 400,
  medium: 500,
  bold: 700,
  black: 900,
} as const;

// Semantic assignments keep hierarchy consistent across every reel.
export const reelTypography = {
  hook: fontWeights.black,
  caption: fontWeights.bold,
  asrSubtitle: fontWeights.medium,
  nameplateChannel: fontWeights.bold,
  nameplateEpisode: fontWeights.regular,
} as const;

const faces = [
  { weight: fontWeights.light, file: "thmanyahsans-Light.woff2" },
  { weight: fontWeights.regular, file: "thmanyahsans-Regular.woff2" },
  { weight: fontWeights.medium, file: "thmanyahsans-Medium.woff2" },
  { weight: fontWeights.bold, file: "thmanyahsans-Bold.woff2" },
  { weight: fontWeights.black, file: "thmanyahsans-Black.woff2" },
] as const;

let fontPromise: Promise<void> | null = null;

export const waitForFonts = (): Promise<void> => {
  if (fontPromise) {
    return fontPromise;
  }

  fontPromise = Promise.all(
    faces.map(async ({ weight, file }) => {
      const face = new FontFace(
        fontFamily,
        `url(${staticFile(`fonts/thmanyah-sans/${file}`)}) format("woff2")`,
        { style: "normal", weight: String(weight) },
      );
      await face.load();
      document.fonts.add(face);
    }),
  ).then(() => undefined);

  return fontPromise;
};

// Convenience gate for compositions that have no other data to load (e.g. the
// component demos): blocks the first frame until every used weight is ready.
export const useFontGate = (): void => {
  const [handle] = useState(() => delayRender("Loading Thmanyah Sans fonts"));
  useEffect(() => {
    waitForFonts()
      .then(() => continueRender(handle))
      .catch((err: unknown) => cancelRender(err));
  }, [handle]);
};
