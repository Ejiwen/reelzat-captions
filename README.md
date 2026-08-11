# reelzy-captions

A single-purpose [Remotion](https://remotion.dev) project that burns broadcast-quality **Arabic captions** over a video file, driven entirely by a local `captions.json`. No transcription, no APIs, no editing — read JSON, draw animated text over video, render.

## Quick start

```sh
npm i
npx remotion studio     # open the Studio preview
npm run render          # burned-in MP4 → out/final.mp4
```

The repo ships with a sample `public/video.mp4` (a generated gradient placeholder) and `public/captions.json` so it runs immediately. Replace both with your own files.

## The `captions.json` schema

All timings are **integer milliseconds**. The file is validated on load (`src/schema/captions.ts`) — a malformed file fails fast with a report listing **every** problem, never just the first.

```jsonc
{
  "version": 1,               // must be 1
  "language": "ar",
  "source": "episode-042.mp4", // optional, informational
  "segments": [
    {
      "id": "seg-001",
      "startMs": 1200,
      "endMs": 3480,
      "text": "الحديث عن التراث الشنقيطي",
      "words": [
        { "text": "الحديث",   "startMs": 1200, "endMs": 1690 },
        { "text": "عن",       "startMs": 1690, "endMs": 1840 },
        { "text": "التراث",   "startMs": 1840, "endMs": 2510 },
        { "text": "الشنقيطي", "startMs": 2510, "endMs": 3480 }
      ],
      "emphasis": [3]          // optional: word indices rendered in the accent colour
    }
  ]
}
```

Rules enforced by the validator:

- Segments sorted by `startMs`, no overlaps.
- Every word's `endMs >= startMs`, and each word span contained within its segment span.
- `emphasis` indices must be in range.

Semantics:

- **A segment is one on-screen caption page.** Line breaking is an authoring decision — put a `\n` inside `text` to force a break. There is no automatic re-grouping (Arabic breaks badly under it).
- **`text` is the authoritative display string**; `words` only drive per-word timing. If they disagree, `text` wins, a warning is logged, and timings are distributed across the tokens of `text`.

## Composition props (live controls in Studio)

| Prop | Default | Range | Purpose |
| --- | --- | --- | --- |
| `videoSrc` | `video.mp4` | | file in `public/` |
| `captionsSrc` | `captions.json` | | file in `public/` |
| `theme` | `karaoke` | `karaoke` \| `wordPop` | caption animation style |
| `mode` | `burn` | `burn` \| `alpha` | see render modes below |
| `offsetMs` | `0` | −1000…1000 | shifts **every** caption timestamp globally — fix sync drift without re-editing the JSON |
| `fontScale` | `1` | 0.7…1.4 | multiplies the base caption size |
| `safeAreaBottomPct` | `18` | 5…40 | caption baseline distance from the bottom, as % of frame height |
| `debug` | `false` | | overlays segment id, active word index and the safe-area boundary |

Dimensions, duration and fps are resolved from the source video via `@remotion/media-parser` — never hardcoded.

## Render modes

One composition, two outputs. Caption timing, position and animation are identical in both — verified so the alpha overlay lines up perfectly when composited in DaVinci Resolve or Premiere.

```sh
npm run render          # burn:  video + scrim + captions → out/final.mp4
npm run render:alpha    # alpha: captions only, transparent ProRes 4444 → out/overlay.mov
npm run render:webm     # alpha: VP8 with alpha channel → out/overlay.webm
npm run preview         # quick check: frames 0–150 → out/preview.mp4
```

In `alpha` mode the video layer and the scrim gradient are simply not rendered, and no element carries a background colour, so the output is genuinely transparent.

## Adding a theme

1. Create one file in `src/themes/`, exporting a `Theme` (see `src/themes/index.ts` for the interface — `renderWord` receives word timing, activity flags and frame context, and returns CSS for that word).
2. Register it with one line in the `themes` map in `src/themes/index.ts`.
3. Add its key to the `theme` enum in `src/schema/props.ts` so it shows up in Studio.

Rules every theme must respect (see `src/design/tokens.ts` for the numeric limits):

- The **word** is the smallest animatable unit — never split Arabic into characters (it breaks cursive joining).
- Animate `opacity` and `transform` only, and never opacity alone. All words stay in the DOM from the segment's first frame — no layout shift, ever.
- Use the shared `springs.enter` / `springs.exit` configs — one easing family across the project.
- Stagger 2–4 frames, translations 20–40 px, scale from 0.94, motion blur (via the theme's `trail` field) on any movement over ~25 px in 5 frames.
- Colours come from `palette`, and colour interpolation goes through OKLCH (`src/design/colour.ts`), never RGB.

## Project layout

```
src/
  Root.tsx                  # <Composition> registration + calculateMetadata
  CaptionedVideo.tsx        # top-level: video layer + scrim + caption layer
  schema/captions.ts        # zod schema, validation, token/timing resolution
  schema/props.ts           # composition props schema (Studio controls)
  captions/useActiveSegment.ts  # frame → current segment + local progress
  captions/CaptionPage.tsx  # renders one segment, delegates styling to theme
  captions/Word.tsx         # single word primitive, theme-agnostic
  themes/                   # theme registry + karaoke + wordPop
  design/                   # tokens, font loading, OKLCH helpers
public/
  video.mp4                 # the source video
  captions.json             # the captions
```

Themes never read `captions.json` directly, and caption components never hardcode a colour or a duration.
