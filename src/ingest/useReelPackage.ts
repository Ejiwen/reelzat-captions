import { useEffect, useState } from "react";
import { cancelRender, continueRender, delayRender, staticFile } from "remotion";
import { waitForFonts } from "../design/fonts";
import { resolveReelPackage, type ReelPackage } from "./resolve";

// Browser-side package loader. Fetches the sidecar first, then only the
// side files the sidecar doesn't already embed. Blocks the first frame on
// both the package and the caption font — same contract as useCaptions in
// CaptionedVideo.tsx, so frame 0 never renders empty or in a fallback font.

const fetchJson = async (path: string): Promise<unknown> => {
  const res = await fetch(staticFile(path));
  if (!res.ok) {
    throw new Error(`Could not load ${path}: HTTP ${res.status}`);
  }
  return res.json();
};

// Side files (words.json, director.json, …) are optional — a 404 (or the dev
// server's HTML fallback) means "not part of this package", never an error.
const fetchOptionalJson = async (path: string): Promise<unknown> => {
  try {
    const res = await fetch(staticFile(path));
    if (!res.ok) {
      return undefined;
    }
    const text = await res.text();
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
};

const loadPackage = async (packageDir: string, clipId: string): Promise<ReelPackage> => {
  const rawSidecar = await fetchJson(`${packageDir}/remotion.json`);
  const sidecar = rawSidecar as {
    captionSource?: string;
    authoring?: unknown;
    words?: unknown[];
    captions?: unknown[];
  };

  const wantsAuthoringFile =
    sidecar.captionSource === "authored" && sidecar.authoring == null;
  const wantsCaptionsFile =
    sidecar.captionSource !== "authored" &&
    (!Array.isArray(sidecar.captions) || sidecar.captions.length === 0);
  const wantsWordsFile = !Array.isArray(sidecar.words) || sidecar.words.length === 0;

  const [authoring, asrCaptions, words, director] = await Promise.all([
    wantsAuthoringFile ? fetchJson(`${packageDir}/authoring.json`) : Promise.resolve(undefined),
    wantsCaptionsFile
      ? fetchOptionalJson(`${packageDir}/captions.json`)
      : Promise.resolve(undefined),
    wantsWordsFile ? fetchOptionalJson(`${packageDir}/words.json`) : Promise.resolve(undefined),
    fetchOptionalJson(`${packageDir}/director.json`),
  ]);

  return resolveReelPackage({
    clipId,
    packageDir,
    sidecar: rawSidecar,
    authoring,
    asrCaptions,
    words,
    director,
  });
};

export const useReelPackage = (packageDir: string, clipId: string): ReelPackage | null => {
  const [pkg, setPkg] = useState<ReelPackage | null>(null);
  const [handle] = useState(() => delayRender(`Loading package ${packageDir} and fonts`));

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadPackage(packageDir, clipId), waitForFonts()])
      .then(([loaded]) => {
        if (cancelled) {
          return;
        }
        setPkg(loaded);
        continueRender(handle);
      })
      .catch((err: unknown) => {
        cancelRender(err);
      });
    return () => {
      cancelled = true;
    };
  }, [packageDir, clipId, handle]);

  return pkg;
};
