# reelzy-captions

The **final motion-graphics stage** of the reels pipeline. Takes the clean
9:16 clips that `reelzy export-reels` drops into `public/reels/`, overlays the
authored **hook**, **captions** and **channel nameplate** with
broadcast-quality motion design, and batch-renders every reel to a
publish-ready MP4.

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────────┐
│  video-watcher   │    │  reelzy-backend  │    │  THIS REPO           │
│  (Claude skill)  │───▶│  cut clean 9:16  │───▶│  hook + captions +   │──▶ social
│  hooks, captions,│    │  clips, export   │    │  nameplate overlays, │    media
│  publish metadata│    │  packages        │    │  batch render        │
└──────────────────┘    └──────────────────┘    └──────────────────────┘
```

## Quick start

```sh
npm i
npm run studio          # discovery runs first; Reels/, Components/, Legacy/ folders
npm run render:batch    # render every package in public/reels → out/
npm run clean:batch     # clear the current batch/output and prepare for a new show
npm test                # ingest unit tests
```

With no packages in `public/reels/`, discovery seeds it from the committed
`fixtures/reels/` (2 authored reels, 1 promo, 1 asr clip), so the project runs
immediately. `npm run render:batch -- --frames=0-90` smoke-renders all four.

## The package contract (`public/reels/`)

Each clip is a folder; a batch index sits beside them:

```
public/reels/
  remotion.json                # batch index: schemaVersion 2, mode, source, reels[]
  reel-001/
    reel-9x16.mp4              # clean cut, no burned text
    reel-9x16.m4a              # optional standalone audio
    remotion.json              # per-clip sidecar (v2) — THE source of truth for
                               #   width/height/fps/durationInSeconds, language,
                               #   direction, captionSource, safeArea; may embed
                               #   authoring/words/captions inline
    authoring.json             # iff captionSource == "authored" (video-watcher output)
    words.json / captions.json # ASR word timing / legacy v1 cues (asr mode + subtitles)
    director.json              # face zones, text-safe zones, cuts, split geometry
  promo-001/ …
```

- **`captionSource` is the branch key**: `"authored"` renders through
  `AuthoredReel`, `"asr"` through `AsrCaptioned`. A missing `captionSource`
  (v1 packages) is treated as `"asr"`.
- **Two sidecar dialects are accepted** and folded into one canonical shape
  by `normalizeSidecar()` before validation:
  - canonical v2: `clipId`, `durationInSeconds`, ms-based `words[]`/
    `captions[]`, percent `safeArea {topPct, bottomPct, sidePct}`;
  - the reelzy emitter's v1: `id`, `duration`, seconds-float words/cues
    (`{text, start, end}` — converted to ms once, at ingest), fraction
    `safeArea {hookTopPct: 0.14, captionBottomPct: 0.2}`, face boxes inside
    framing `segments[]` (centre-anchored fractions), and a bare-array
    `captions.json`. `director.json`'s face `boxNorm` rects (top-left
    fractions) are normalised too; unknown emitter fields are ignored.
- Authored display windows are **clip-relative seconds** (floats). They are
  converted to frames in exactly one place: `src/ingest/resolve.ts`
  (`secondsToFrames`, `Math.floor` — 26.72 s @ 30 fps → 801 frames).
- Everything is zod-validated defensively (`src/ingest/schemas.ts`); a broken
  package fails with **one report listing every problem**, same style as the
  legacy captions validator. Upstream guarantees that are still re-checked:
  ≤2 captions per reel, promo has zero captions, same-position elements never
  overlap in time, windows sit inside the clip.
- Media metadata (width/height/fps/duration) comes **from the sidecar, never
  from probing the video** — batch renders must not re-parse every file.

`src/ingest/` is the only code that touches raw package files. It produces
one typed `ReelPackage` per folder; `scripts/discover-reels.ts` (an npm
pre-script for `studio` and `render:batch`) scans `public/reels/*/` and writes
`src/generated/reels-manifest.json`, from which `Root.tsx` registers **one
composition per reel** (id = clip id) — no filesystem access and no async
probing at runtime.

## Component catalog (`src/overlays/`)

Folder-per-component; each folder ships `index.tsx`, `animations.ts` (its
enter/exit defaults), `README.md`, `fixture.json`, and a `demo.tsx` registered
under **Components/** in Studio so it can be previewed and tuned in isolation.

| Component | Role |
| --- | --- |
| `Hook/` | The opening statement — largest type, accent underline sweep, `blurIn` (+ 0.94 springPop scale) entrance, quick `dipExit`. Reads within its first 3 words. |
| `CaptionShort/` | One big authored line, auto-fit, never wrapped. Word-stagger entrance. |
| `CaptionLong/` | Exactly two balanced lines, one font size for both, flat word-stagger across the break. |
| `Nameplate/` | Channel + episode title chip in the safe-area corner. Enters as the hook exits; yields (fades out) while a caption shares its band. |
| `SafeArea/` | Debug guides: safe-area bands, director text/face zones, per-overlay window timeline. |

Overlays are **pure props-in, pixels-out** — they take
`{ data, window: {startFrame, endFrame}, position, direction, animation, safeArea, textZone, fontScale, reduced }`,
never read files, and never know about packages. Positioning respects the
sidecar `safeArea` (hook band top ~14%, caption band bottom ~20%); when
`director.json` provides text-safe zones those win — never cover a face.

## Motion registry (`src/motion/`)

Enter/exit presets as pure functions `(ctx: {frame, fps, window, direction?,
reduced?}) => CSSProperties`: `riseMask`, `springPop`, `blurIn`, `slideEdge`,
`fadeThrough`, `dipExit`. Shared timing rules: entries ≈12 frames @30 fps,
**exits run at ~60% and always finish before the window closes**. Every
overlay accepts `animation={{ enter: "riseMask", exit: "fadeThrough" }}`.

**Adding an animation** = one file in `src/motion/` exporting a
`MotionPresetPair` + one line in the `motionPresets` map in
`src/motion/index.ts` (mirrors the theme registry).

**Adding an overlay** = one folder in `src/overlays/` (copy the structure of
an existing one: `index.tsx` built on `OverlayRoot`, `animations.ts`,
`README.md`, `fixture.json`, `demo.tsx`) + register the demo in `Root.tsx`
under Components/ + export it from `src/overlays/index.ts`.

Non-negotiables every overlay and preset obeys (see `src/design/tokens.ts`):
the **word** is the smallest animatable unit (never split Arabic into
characters); animate opacity + transform only, never opacity alone; shared
`springs.enter`/`springs.exit`; staggers 2–4 frames; translations 20–40 px;
scale from 0.94; motion-blur trail only during entry windows; all colours
from `palette`, interpolated in OKLCH; no layout shift, ever.

## Compositions

- **`AuthoredReel`** (Studio: `Reels/<clip-id>`) — `OffthreadVideo` (premounted)
  + bottom-caption scrim (burn only, animated with the caption) + Hook +
  authored captions + Nameplate. Choreography: the hook owns frame 0; the
  nameplate slides in exactly as the hook starts its exit and stays; captions
  play their authored windows. A **promo** is the same composition with zero
  captions. Props: `mode` (`burn`/`alpha`), `asrSubtitles` (small ASR
  subtitles under the overlays, off by default), `fontScale`,
  `hookAnimation`/`captionAnimation` overrides, `reduced`, `debug` (safe
  areas + director zones + window timeline).
- **`AsrCaptioned`** — the classic karaoke/wordPop treatment fed from a
  package folder (sidecar `captions[]` or the package's `captions.json`).
- **`Legacy/Captioned`** — the original standalone burner
  (`public/video.mp4` + `public/captions.json`), unchanged, still driven by
  `@remotion/media-parser`.

Burn and alpha stay pixel-identical for overlay layers: in alpha mode the
video layer and scrims are simply not rendered.

## Batch rendering

```sh
npm run render:batch                          # everything → out/<clip-id>.mp4
npm run render:batch -- --only reel-001,promo-001
npm run render:batch -- --mode alpha          # transparent ProRes 4444 .mov
npm run render:batch -- --frames=0-90         # smoke render
npm run render:batch -- --force --out dist/ --concurrency 4
```

The script bundles **once**, then runs `selectComposition` + `renderMedia`
per reel through a concurrency pool (default `min(reels, cpus − 1)`; browser
tabs are divided across the pool). Outputs whose mtime is newer than every
file in their package are **skipped** unless `--force`. One failed reel never
kills the batch: results land in `out/render-report.json` (per reel:
duration, render time, output path, ok/skipped/failed) and the exit code.

Single-reel workflows still work: `npm run render`, `npm run render:alpha`,
`npm run render:webm`, `npm run preview` (all against `Legacy/Captioned`),
or `npx remotion render reel-001` for one package.

## Legacy `captions.json` + themes

The v1 milliseconds-based schema, the karaoke/wordPop themes and the rules
for adding a theme are unchanged — see `src/schema/captions.ts` and
`src/themes/index.ts`. Themes: one file in `src/themes/` + one registry line
+ the `theme` enum in `src/schema/props.ts`.

## Project layout

```
src/
  Root.tsx                 # registers Reels/ (from manifest), Components/, Legacy/
  ingest/                  # THE typed gateway: zod schemas, ReelPackage resolver,
                           #   browser loader hook, node fs loader, manifest types
  generated/reels-manifest.json  # written by scripts/discover-reels.ts
  motion/                  # animation registry: presets + timing + merge
  overlays/                # folder-per-component: Hook, CaptionShort, CaptionLong,
                           #   Nameplate, SafeArea (+ shared OverlayRoot, wordStagger)
  compositions/            # AuthoredReel, AsrCaptioned (+ scrim, ASR subtitles)
  CaptionedVideo.tsx       # legacy standalone burner
  captions/ themes/ schema/ design/   # unchanged caption machinery + tokens
scripts/
  clean-batch.ts         # clear public/reels + out; suppress fixture re-seeding
  discover-reels.ts        # scan public/reels → manifest (seeds from fixtures/)
  render-batch.ts          # bundle once, render everything in parallel
fixtures/reels/            # committed sample batch (2 authored, 1 promo, 1 asr)
tests/ingest.test.ts       # discriminator default, frame math, promo rules, reports
```

Constraints held throughout: TypeScript strict; zod-validate every external
file; UTF-8/RTL correctness; no network at render time; deterministic output
(same package → same MP4).
