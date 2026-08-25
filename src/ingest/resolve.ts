import type { z } from "zod";
// Pure module (no React/Remotion) — the canonical HookBg theme list lives
// with the component; ingest only narrows untrusted strings against it.
import { parseHookBgTheme, type HookBgTheme } from "../overlays/HookBg/themes";
import {
  collapseWhitespace,
  normalizeAuthoredToken,
  tokenizeLine,
  validateCaptions,
  type ResolvedCaptions,
  type WordTiming,
} from "../schema/captions";
import {
  authoringSchema,
  defaultSafeArea,
  directorSchema,
  facesFromSegments,
  normalizeAsrCue,
  normalizeDirector,
  normalizeSidecar,
  sidecarSchema,
  wordsFileSchema,
  type AuthoredCaption,
  type Authoring,
  type Director,
  type OverlayPosition,
  type SafeArea,
  type Sidecar,
  type TextDirection,
} from "./schemas";
import type {
  OverlayFaceWindow,
  OverlaySplitWindow,
} from "../overlays/types";

// ---------------------------------------------------------------------------
// Frames. Windows arrive as clip-relative seconds; every frame number in the
// project is derived HERE and nowhere else. Math.floor matches how the legacy
// composition derives duration (26.72 s @ 30 fps → 801 frames).

export const secondsToFrames = (seconds: number, fps: number): number =>
  Math.floor(seconds * fps);

// ---------------------------------------------------------------------------
// Every authored caption — one line or two — renders in the SAME bottom
// caption band, directly above the ProgressBar ring: one reading position for
// the whole reel, so the eye never has to travel. The top of the frame belongs
// to the hook and the nameplate. authoring.json's caption `position` is
// therefore descriptive only, and overlap validation uses this value.
export const CAPTION_BAND_POSITION: OverlayPosition = "bottom";

export type FrameWindow = {
  startFrame: number;
  endFrame: number;
};

// ---------------------------------------------------------------------------
// The one typed object the rest of the project consumes.

export type ResolvedHook = {
  text: string;
  position: OverlayPosition;
  window: FrameWindow;
  // Validated against the canonical theme list; unknown/missing → null and
  // the composition falls back to keyword matching, then the default theme.
  backgroundTheme: HookBgTheme | null;
};

export type ResolvedAuthoredCaption = {
  type: AuthoredCaption["type"];
  lines: string[];
  position: OverlayPosition;
  window: FrameWindow;
  words?: ResolvedAuthoredWord[];
  verse: boolean;
  emphasis?: string[];
};

export type ResolvedAuthoredWord = {
  text: string;
  startFrame: number;
  endFrame: number;
};

export type ResolvedAuthoring = {
  kind: Authoring["kind"];
  channel: string;
  episodeTitle: string;
  nameplateAvoidance: boolean;
  hook: ResolvedHook;
  captions: ResolvedAuthoredCaption[];
  publish: Authoring["publish"] | null;
};

export type ReelMedia = {
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  // staticFile()-relative paths, e.g. "reels/reel-001/reel-9x16.mp4".
  videoSrc: string;
  audioSrc: string | null;
};

export type ReelPackage = {
  clipId: string;
  packageDir: string;
  kind: Authoring["kind"];
  captionSource: Sidecar["captionSource"];
  language: string;
  direction: TextDirection;
  title: string | null;
  media: ReelMedia;
  safeArea: SafeArea;
  authored: ResolvedAuthoring | null;
  asr: {
    words: WordTiming[];
    captions: ResolvedCaptions | null;
  };
  director: Director | null;
  // Canonical, frame-timed face boxes used by collision-aware overlays.
  faceWindows: OverlayFaceWindow[];
  splitScreenWindows: OverlaySplitWindow[];
};

export type ReelPackageInput = {
  clipId: string;
  // staticFile()-relative directory, e.g. "reels/reel-001".
  packageDir: string;
  sidecar: unknown;
  // Standalone authoring.json — used only when the sidecar embeds none.
  authoring?: unknown;
  // Standalone words.json — used only when the sidecar carries no words.
  words?: unknown;
  // Standalone captions.json (legacy v1 shape) — used only when the sidecar
  // carries no ASR cues.
  asrCaptions?: unknown;
  director?: unknown;
};

// ---------------------------------------------------------------------------
// Validation. Same philosophy as src/schema/captions.ts: collect EVERY
// violation across every file in the package, then throw one readable report.

const zodProblems = (
  file: string,
  error: z.ZodError,
  problems: string[],
): void => {
  for (const issue of error.issues) {
    const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
    problems.push(`${file} → ${path}: ${issue.message}`);
  }
};

const formatProblems = (clipId: string, problems: string[]): string =>
  `Invalid reel package "${clipId}" — ${problems.length} problem${problems.length === 1 ? "" : "s"}:\n` +
  problems.map((p) => `  • ${p}`).join("\n");

// Semantic checks on one authored display window.
const checkWindow = (
  where: string,
  display: { start: number; end: number },
  durationInSeconds: number,
  problems: string[],
): void => {
  if (display.end <= display.start) {
    problems.push(
      `${where}: display.end must be greater than display.start — expected > ${display.start}, received ${display.end}`,
    );
  }
  if (display.end > durationInSeconds + 1e-6) {
    problems.push(
      `${where}: display window must sit inside the clip — expected end <= ${durationInSeconds}s, received ${display.end}s`,
    );
  }
};

const checkAuthoring = (
  authoring: Authoring,
  durationInSeconds: number,
  problems: string[],
): void => {
  checkWindow(
    "authoring.json → hook",
    authoring.hook.display,
    durationInSeconds,
    problems,
  );

  if (authoring.kind === "promo" && authoring.captions.length > 0) {
    problems.push(
      `authoring.json: a promo must have zero captions — received ${authoring.captions.length}`,
    );
  }
  for (const [i, caption] of authoring.captions.entries()) {
    const where = `authoring.json → captions.${i}`;
    checkWindow(where, caption.display, durationInSeconds, problems);
    switch (caption.type) {
      case "short_1line":
        if (caption.lines.length !== 1) {
          problems.push(
            `${where}: short_1line must have exactly 1 line — received ${caption.lines.length}`,
          );
        }
        if (caption.verse) {
          problems.push(`${where}: verse is only valid for type "regular"`);
        }
        if (caption.words) {
          problems.push(`${where}: words are only valid for type "regular"`);
        }
        break;
      case "long_2lines":
        if (caption.lines.length !== 2) {
          problems.push(
            `${where}: long_2lines must have exactly 2 lines — received ${caption.lines.length}`,
          );
        }
        if (caption.verse) {
          problems.push(`${where}: verse is only valid for type "regular"`);
        }
        if (caption.words) {
          problems.push(`${where}: words are only valid for type "regular"`);
        }
        break;
      case "regular": {
        const tokens = caption.lines.flatMap(tokenizeLine);
        if (tokens.length === 0) {
          problems.push(`${where}: regular must contain at least one word`);
        }
        if (caption.words && caption.words.length !== tokens.length) {
          problems.push(
            `${where}: regular words must match the rendered token count — expected ${tokens.length}, received ${caption.words.length}`,
          );
        }
        if (caption.words) {
          for (const [j, word] of caption.words.entries()) {
            const wordWhere = `${where} → words.${j} ("${word.text}")`;
            checkWindow(
              `${wordWhere}.in_reel`,
              word.in_reel,
              durationInSeconds,
              problems,
            );
            if (word.in_source.end <= word.in_source.start) {
              problems.push(
                `${wordWhere}.in_source: end must be greater than start — expected > ${word.in_source.start}, received ${word.in_source.end}`,
              );
            }
            if (
              word.in_reel.start < caption.display.start ||
              word.in_reel.end > caption.display.end
            ) {
              problems.push(
                `${wordWhere}: in_reel must be contained within caption display [${caption.display.start}, ${caption.display.end}]s — received [${word.in_reel.start}, ${word.in_reel.end}]s`,
              );
            }
            const expected = tokens[j];
            if (
              expected &&
              normalizeAuthoredToken(word.text) !==
                normalizeAuthoredToken(expected)
            ) {
              problems.push(
                `${wordWhere}: text must match rendered token ${j} — expected "${expected}", received "${collapseWhitespace(word.text)}"`,
              );
            }
            const previous = caption.words[j - 1];
            if (previous && word.in_reel.start < previous.in_reel.end) {
              problems.push(
                `${wordWhere}: authored words must be ordered and non-overlapping — expected start >= ${previous.in_reel.end}, received ${word.in_reel.start}`,
              );
            }
          }
        }
        break;
      }
    }

    const captionTokens = new Set(
      caption.lines.flatMap(tokenizeLine).map(normalizeAuthoredToken),
    );
    for (const emphasis of caption.emphasis ?? []) {
      if (!captionTokens.has(normalizeAuthoredToken(emphasis))) {
        problems.push(
          `${where}: emphasis word "${emphasis}" does not occur in the rendered caption tokens`,
        );
      }
    }
  }

  // Elements that share a position must never overlap in time. Positions are
  // the EFFECTIVE ones: every caption renders in the caption band regardless
  // of what authoring.json says, so two captions overlapping in time is a
  // collision even when they were authored at opposite ends of the frame.
  const byPosition: Record<
    OverlayPosition,
    { name: string; start: number; end: number }[]
  > = {
    top: [],
    bottom: [],
  };
  byPosition[authoring.hook.position].push({
    name: "hook",
    start: authoring.hook.display.start,
    end: authoring.hook.display.end,
  });
  for (const [i, caption] of authoring.captions.entries()) {
    byPosition[CAPTION_BAND_POSITION].push({
      name: `captions.${i}`,
      start: caption.display.start,
      end: caption.display.end,
    });
  }
  for (const position of ["top", "bottom"] as const) {
    const items = [...byPosition[position]].sort((a, b) => a.start - b.start);
    for (let i = 1; i < items.length; i++) {
      const prev = items[i - 1]!;
      const curr = items[i]!;
      if (curr.start < prev.end) {
        problems.push(
          `authoring.json: "${prev.name}" and "${curr.name}" both sit at position "${position}" and overlap in time — [${prev.start}, ${prev.end}]s vs [${curr.start}, ${curr.end}]s`,
        );
      }
    }
  }
};

const toFrameWindow = (
  display: { start: number; end: number },
  fps: number,
): FrameWindow => ({
  startFrame: secondsToFrames(display.start, fps),
  endFrame: secondsToFrames(display.end, fps),
});

// ---------------------------------------------------------------------------

export const resolveReelPackage = (input: ReelPackageInput): ReelPackage => {
  const problems: string[] = [];

  const sidecarParsed = sidecarSchema.safeParse(
    normalizeSidecar(input.sidecar),
  );
  if (!sidecarParsed.success) {
    zodProblems("remotion.json", sidecarParsed.error, problems);
    throw new Error(formatProblems(input.clipId, problems));
  }
  const sidecar = sidecarParsed.data;

  // Standalone authoring.json only matters when the sidecar embeds none.
  let authoring: Authoring | null = sidecar.authoring;
  if (authoring === null && input.authoring !== undefined) {
    const parsed = authoringSchema.safeParse(input.authoring);
    if (parsed.success) {
      authoring = parsed.data;
    } else {
      zodProblems("authoring.json", parsed.error, problems);
    }
  }

  if (
    sidecar.captionSource === "authored" &&
    authoring === null &&
    problems.length === 0
  ) {
    problems.push(
      `remotion.json: captionSource is "authored" but neither the sidecar nor authoring.json provides authoring data`,
    );
  }
  if (authoring !== null) {
    if (authoring.clipId !== input.clipId) {
      problems.push(
        `authoring.json: clipId mismatch — expected "${input.clipId}" (folder name), received "${authoring.clipId}"`,
      );
    }
    checkAuthoring(authoring, sidecar.durationInSeconds, problems);
  }

  // ASR words: sidecar wins, words.json is the fallback.
  let words: WordTiming[] = sidecar.words;
  if (words.length === 0 && input.words !== undefined) {
    const parsed = wordsFileSchema.safeParse(input.words);
    if (parsed.success) {
      words = parsed.data;
    } else {
      zodProblems("words.json", parsed.error, problems);
    }
  }

  // ASR cues: sidecar captions[] win, captions.json is the fallback — either
  // the legacy v1 file shape or the reelzy bare array of seconds cues.
  // Resolution reuses the legacy validator so display tokens and timing
  // behave identically to the standalone Captioned path.
  let asrCaptions: ResolvedCaptions | null = null;
  const fallbackCues = Array.isArray(input.asrCaptions)
    ? {
        version: 1,
        language: sidecar.language,
        segments: input.asrCaptions.map(normalizeAsrCue),
      }
    : input.asrCaptions;
  const asrRaw =
    sidecar.captions.length > 0
      ? { version: 1, language: sidecar.language, segments: sidecar.captions }
      : fallbackCues;
  if (asrRaw !== undefined && asrRaw !== null) {
    try {
      asrCaptions = validateCaptions(asrRaw);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      for (const line of message.split("\n").slice(1)) {
        problems.push(`captions.json → ${line.replace(/^\s*•\s*/, "")}`);
      }
    }
  }
  if (
    sidecar.captionSource === "asr" &&
    asrCaptions === null &&
    problems.length === 0
  ) {
    problems.push(
      `remotion.json: captionSource is "asr" but the package carries no ASR cues (sidecar captions[] and captions.json are both missing/empty)`,
    );
  }

  let director: Director | null = null;
  if (input.director !== undefined) {
    const parsed = directorSchema.safeParse(normalizeDirector(input.director));
    if (parsed.success) {
      director = parsed.data;
    } else {
      zodProblems("director.json", parsed.error, problems);
    }
  }
  // The reelzy emitter carries face boxes inside the sidecar's framing
  // segments rather than director.json — fold them in so the debug guides
  // and never-cover-a-face rules see them either way.
  const segmentFaces = facesFromSegments(sidecar.segments);
  if (segmentFaces.length > 0) {
    if (director === null) {
      director = {
        faces: segmentFaces,
        textSafeZones: [],
        cuts: [],
        splitWindows: [],
      };
    } else if (director.faces.length === 0) {
      director = { ...director, faces: segmentFaces };
    }
  }

  if (problems.length > 0) {
    throw new Error(formatProblems(input.clipId, problems));
  }

  const fps = sidecar.fps;
  const durationInFrames = secondsToFrames(sidecar.durationInSeconds, fps);
  const faceWindows: OverlayFaceWindow[] = (director?.faces ?? [])
    .map((face) => ({
      xPct: face.xPct,
      yPct: face.yPct,
      wPct: face.wPct,
      hPct: face.hPct,
      ...(face.estimated === undefined
        ? {}
        : { estimated: face.estimated }),
      startFrame:
        face.startMs === undefined
          ? 0
          : Math.max(0, secondsToFrames(face.startMs / 1000, fps)),
      endFrame:
        face.endMs === undefined
          ? durationInFrames
          : Math.min(
              durationInFrames,
              secondsToFrames(face.endMs / 1000, fps),
            ),
    }))
    .filter((face) => face.endFrame > face.startFrame);
  const splitScreenWindows: OverlaySplitWindow[] = (
    director?.splitWindows ?? []
  )
    .map((window) => ({
      startFrame: secondsToFrames(window.startMs / 1000, fps),
      endFrame: Math.min(
        durationInFrames,
        secondsToFrames(window.endMs / 1000, fps),
      ),
      centerYPct: window.centerYPct,
    }))
    .filter((window) => window.endFrame > window.startFrame);
  const authored: ResolvedAuthoring | null = authoring
    ? {
        kind: authoring.kind,
        channel: authoring.source.channel,
        episodeTitle: authoring.source.episodeTitle,
        nameplateAvoidance: authoring.nameplateAvoidance,
        hook: {
          text: authoring.hook.text,
          position: authoring.hook.position,
          window: toFrameWindow(authoring.hook.display, fps),
          backgroundTheme: parseHookBgTheme(authoring.hook.backgroundTheme),
        },
        captions: authoring.captions.map((caption) => ({
          type: caption.type,
          lines: caption.lines,
          // Captions have ONE home on screen — see CAPTION_BAND_POSITION.
          // authoring.json may still say "top"; the reader must not have to
          // hunt for the text, so the authored value is not honoured here.
          position: CAPTION_BAND_POSITION,
          window: toFrameWindow(caption.display, fps),
          words: caption.words?.map((word) => ({
            text: word.text,
            startFrame: secondsToFrames(word.in_reel.start, fps),
            endFrame: secondsToFrames(word.in_reel.end, fps),
          })),
          verse: caption.verse,
          emphasis: caption.emphasis,
        })),
        publish: authoring.publish ?? null,
      }
    : null;

  return {
    clipId: input.clipId,
    packageDir: input.packageDir,
    kind: authoring?.kind ?? "reel",
    captionSource: sidecar.captionSource,
    language: authoring
      ? (authoring.source.language ?? sidecar.language)
      : sidecar.language,
    direction: authoring ? authoring.source.direction : sidecar.direction,
    title: authoring?.title ?? sidecar.title ?? null,
    media: {
      width: sidecar.width,
      height: sidecar.height,
      fps,
      durationInFrames,
      videoSrc: `${input.packageDir}/${sidecar.video}`,
      audioSrc: sidecar.audio ? `${input.packageDir}/${sidecar.audio}` : null,
    },
    safeArea: sidecar.safeArea ?? defaultSafeArea,
    authored,
    asr: { words, captions: asrCaptions },
    director,
    faceWindows,
    splitScreenWindows,
  };
};
