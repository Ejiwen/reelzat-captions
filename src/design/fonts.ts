import { loadFont } from "@remotion/google-fonts/NotoKufiArabic";
import { useEffect, useState } from "react";
import { cancelRender, continueRender, delayRender } from "remotion";

// Loading starts at module scope so the fetch begins before the first frame
// is requested. Rendering is gated on waitForFonts() (see CaptionedVideo) so
// frame 0 never rasterises in a fallback font.
const { fontFamily, waitUntilDone } = loadFont("normal", {
  weights: ["500", "700"],
  subsets: ["arabic", "latin"],
});

export { fontFamily };

export const waitForFonts = (): Promise<void> => waitUntilDone().then(() => undefined);

// Convenience gate for compositions that have no other data to load (e.g. the
// component demos): blocks the first frame until the caption font is ready.
export const useFontGate = (): void => {
  const [handle] = useState(() => delayRender("Loading caption font"));
  useEffect(() => {
    waitForFonts()
      .then(() => continueRender(handle))
      .catch((err: unknown) => cancelRender(err));
  }, [handle]);
};
