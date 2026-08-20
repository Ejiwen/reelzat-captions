import { z } from "zod";

// All timings are integer milliseconds. Never floats, never seconds.
export const wordTimingSchema = z.object({
  text: z.string().min(1, "word text must not be empty"),
  startMs: z
    .number()
    .int("startMs must be an integer (milliseconds)")
    .nonnegative(),
  endMs: z
    .number()
    .int("endMs must be an integer (milliseconds)")
    .nonnegative(),
});

export const segmentSchema = z.object({
  id: z.string().min(1, "segment id must not be empty"),
  startMs: z
    .number()
    .int("startMs must be an integer (milliseconds)")
    .nonnegative(),
  endMs: z
    .number()
    .int("endMs must be an integer (milliseconds)")
    .nonnegative(),
  text: z.string().min(1, "text must not be empty"),
  words: z
    .array(wordTimingSchema)
    .min(1, "segment must contain at least one word"),
  emphasis: z.array(z.number().int().nonnegative()).optional(),
});

export const captionFileSchema = z.object({
  version: z.literal(1),
  language: z.string().min(1),
  source: z.string().optional(),
  segments: z
    .array(segmentSchema)
    .min(1, "captions file must contain at least one segment"),
});

export type WordTiming = z.infer<typeof wordTimingSchema>;
export type CaptionSegment = z.infer<typeof segmentSchema>;
export type CaptionFile = z.infer<typeof captionFileSchema>;

// A segment after validation: display tokens are derived from `text` (the
// authoritative display string), grouped into authored lines, each carrying
// the timing that drives its animation.
export type ResolvedSegment = CaptionSegment & {
  lines: WordTiming[][];
};

export type ResolvedCaptions = {
  file: CaptionFile;
  segments: ResolvedSegment[];
};

export const collapseWhitespace = (s: string) => s.replace(/\s+/g, " ").trim();

// Authored 2.2 emphasis and ASR words may differ from the display text only
// by Arabic presentation details (harakat, tatweel, punctuation, ة/ه or
// ى/ي). Keep the display spelling untouched, but compare semantic tokens
// through one shared normal form at ingest and render time.
export const normalizeAuthoredToken = (s: string): string =>
  collapseWhitespace(s)
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/ـ/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي");

// Tokenize one authored line of `text` using Intl.Segmenter — never split(" ").
// Punctuation (non word-like segments) is merged into the preceding token so
// "لمتابعتكم،" stays one visual unit.
export const tokenizeLine = (line: string): string[] => {
  const segmenter = new Intl.Segmenter("ar", { granularity: "word" });
  const tokens: string[] = [];
  for (const part of segmenter.segment(line)) {
    const t = part.segment;
    if (/^\s+$/.test(t)) {
      continue;
    }
    if (!part.isWordLike && tokens.length > 0) {
      tokens[tokens.length - 1] += t;
    } else {
      tokens.push(t);
    }
  }
  return tokens;
};

// `text` wins for rendering; `words` only drive timing. When they agree
// token-for-token, each token takes its word's timing. When they disagree, we
// warn and distribute the segment's duration across the tokens of `text`
// proportionally to their length.
const resolveSegment = (segment: CaptionSegment): ResolvedSegment => {
  const authoredLines = segment.text
    .split("\n")
    .map(collapseWhitespace)
    .filter(Boolean);
  const lineTokens = authoredLines.map(tokenizeLine);
  const flatTokens = lineTokens.flat();

  const matches =
    flatTokens.length === segment.words.length &&
    flatTokens.every(
      (t, i) => t === collapseWhitespace(segment.words[i]!.text),
    );

  let flatTimed: WordTiming[];
  if (matches) {
    flatTimed = flatTokens.map((t, i) => ({
      text: t,
      startMs: segment.words[i]!.startMs,
      endMs: segment.words[i]!.endMs,
    }));
  } else {
    // eslint-disable-next-line no-console
    console.warn(
      `[captions] Segment "${segment.id}": \`words\` disagree with \`text\` ` +
        `(${segment.words.length} words vs ${flatTokens.length} tokens). ` +
        `\`text\` wins for rendering; timings are distributed by token length.`,
    );
    const totalChars = flatTokens.reduce((sum, t) => sum + t.length, 0);
    const duration = segment.endMs - segment.startMs;
    let cursor = segment.startMs;
    flatTimed = flatTokens.map((t, i) => {
      const startMs = Math.round(cursor);
      const endMs =
        i === flatTokens.length - 1
          ? segment.endMs
          : Math.round(cursor + (duration * t.length) / totalChars);
      cursor = endMs;
      return { text: t, startMs, endMs };
    });
  }

  const lines: WordTiming[][] = [];
  let offset = 0;
  for (const tokens of lineTokens) {
    lines.push(flatTimed.slice(offset, offset + tokens.length));
    offset += tokens.length;
  }

  return { ...segment, lines };
};

// Semantic checks for one structurally valid segment.
const checkSegment = (seg: CaptionSegment, problems: string[]): void => {
  const where = `segment "${seg.id}"`;

  if (seg.endMs <= seg.startMs) {
    problems.push(
      `${where}: endMs must be greater than startMs — expected endMs > ${seg.startMs}, received ${seg.endMs}`,
    );
  }

  for (const [j, word] of seg.words.entries()) {
    const wordWhere = `${where}, word ${j} ("${word.text}")`;
    if (word.endMs < word.startMs) {
      problems.push(
        `${wordWhere}: endMs must be >= startMs — expected endMs >= ${word.startMs}, received ${word.endMs}`,
      );
    }
    if (word.startMs < seg.startMs || word.endMs > seg.endMs) {
      problems.push(
        `${wordWhere}: word span must be contained within the segment span — expected within [${seg.startMs}, ${seg.endMs}], received [${word.startMs}, ${word.endMs}]`,
      );
    }
    const prevWord = seg.words[j - 1];
    if (prevWord && word.startMs < prevWord.startMs) {
      problems.push(
        `${wordWhere}: words must be sorted by startMs — expected startMs >= ${prevWord.startMs}, received ${word.startMs}`,
      );
    }
  }

  for (const idx of seg.emphasis ?? []) {
    if (idx >= seg.words.length) {
      problems.push(
        `${where}: emphasis index out of range — expected 0..${seg.words.length - 1}, received ${idx}`,
      );
    }
  }
};

// Validates the parsed JSON. Collects EVERY violation before throwing, so a
// malformed file yields one readable report instead of a whack-a-mole loop.
// Even when the file fails the structural schema, semantic checks still run on
// every segment that individually parses, so the report is as complete as the
// data allows.
export const validateCaptions = (data: unknown): ResolvedCaptions => {
  const problems: string[] = [];

  const parsed = captionFileSchema.safeParse(data);
  if (parsed.success) {
    const file = parsed.data;
    for (const [i, seg] of file.segments.entries()) {
      checkSegment(seg, problems);
      const prev = file.segments[i - 1];
      if (prev) {
        if (seg.startMs < prev.startMs) {
          problems.push(
            `segment "${seg.id}": segments must be sorted by startMs — expected startMs >= ${prev.startMs} (segment "${prev.id}"), received ${seg.startMs}`,
          );
        }
        if (seg.startMs < prev.endMs) {
          problems.push(
            `segment "${seg.id}": overlaps segment "${prev.id}" — expected startMs >= ${prev.endMs}, received ${seg.startMs}`,
          );
        }
      }
    }
    if (problems.length > 0) {
      throw new Error(formatProblems(problems));
    }
    return { file, segments: file.segments.map(resolveSegment) };
  }

  const raw = data as { segments?: unknown[] };
  for (const issue of parsed.error.issues) {
    const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
    // Point at the segment id when the path goes through `segments[i]`.
    let where = path;
    if (issue.path[0] === "segments" && typeof issue.path[1] === "number") {
      const seg = raw?.segments?.[issue.path[1]] as
        { id?: unknown } | undefined;
      if (typeof seg?.id === "string") {
        where = `segment "${seg.id}" → ${issue.path.slice(2).join(".") || "(segment)"}`;
      }
    }
    problems.push(`${where}: ${issue.message}`);
  }

  // Still run semantic checks on the segments that are individually valid.
  if (Array.isArray(raw?.segments)) {
    for (const candidate of raw.segments) {
      const seg = segmentSchema.safeParse(candidate);
      if (seg.success) {
        checkSegment(seg.data, problems);
      }
    }
  }

  throw new Error(formatProblems(problems));
};

const formatProblems = (problems: string[]): string =>
  `Invalid captions.json — ${problems.length} problem${problems.length === 1 ? "" : "s"}:\n` +
  problems.map((p) => `  • ${p}`).join("\n");
