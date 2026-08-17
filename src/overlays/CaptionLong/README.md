# CaptionLong

Two authored prose lines with shared fitting/re-balancing and the established
flat word stagger. Optional `data.emphasis` highlights up to two exact word
tokens. Poetry uses `CaptionRegular` with `verse: true`, which disables this
overlay's reflow behavior.

Two authored lines (`long_2lines`) at one shared font size — fitted by
measuring each word and adding the flex word gap exactly — so the pair reads
as a single block inside one card. The word stagger runs flat across the line
break; the container exits as one.

The card is the same fixed-length plate `CaptionShort` uses
(`captionCardWidthPx`): the safe width minus
`captionEnergyConfig.surfaceSafeGapPx` on each side, so it stops visibly short
of the safe line and never changes length between captions.

## Line layout

The authored break is the display truth **while it holds a confident size**.
When unusually long words would shrink the block below
`captionEnergyConfig.reflowMinScale` of the base size, the words are
re-balanced instead — across two lines, or three when the extra line buys at
least `extraLineGain` more type size. Words are never re-ordered (Arabic reads
badly under any re-grouping that is not a plain break); only the break moves,
and the balanced split is the one that makes the widest line as narrow as
possible.

A third line grows the card **upward** from its bottom anchor. It may never
climb past `captionEnergyConfig.surfaceTopLimitPct` of frame height — that
region belongs to the video content and the faces in it — so the vertical
budget, not the word count, is what ultimately caps the block.

See `Components/CaptionLong-Reflow` in Studio for the three-line case.

Pure props-in, pixels-out: no file access, no package knowledge.

## Props

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `data` | `{ lines: [string, string] }` | — | the two authored lines |
| `window` | `{ startFrame, endFrame }` | — | display window in frames |
| `position` | `"top" \| "bottom"` | — | band anchor — production always `bottom` |
| `direction` | `"rtl" \| "ltr"` | — | writing direction |
| `animation` | `{ enter, exit }` | `{ enter: "fadeThrough", exit: "fadeThrough" }` | container presets |
| `stagger` | `boolean` | `true` | word-level entrance on/off |
| `theme` | `HookBgTheme` | resolved default | template palette for the card and the ink halo |
| `safeArea` / `textZone` / `fontScale` / `reduced` | | | see `src/overlays/types.ts` |

## Usage

```tsx
<CaptionLong
  data={{ lines: ["سطر أول متوازن", "وسطر ثانٍ يكمله"] }}
  window={{ startFrame: 480, endFrame: 630 }}
  position="bottom"
  direction="rtl"
  theme="religion"
/>
```
