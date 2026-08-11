import { loadFont } from "@remotion/google-fonts/NotoKufiArabic";

// Loading starts at module scope so the fetch begins before the first frame
// is requested. Rendering is gated on waitForFonts() (see CaptionedVideo) so
// frame 0 never rasterises in a fallback font.
const { fontFamily, waitUntilDone } = loadFont("normal", {
  weights: ["500", "700"],
  subsets: ["arabic", "latin"],
});

export { fontFamily };

export const waitForFonts = (): Promise<void> => waitUntilDone().then(() => undefined);
