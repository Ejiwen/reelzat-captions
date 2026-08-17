# CaptionShort

One fixed authored line with the shared order-based word stagger. Optional
`data.emphasis` contains up to two exact word strings and applies the authored
accent treatment without changing layout. Timed karaoke belongs to
`CaptionRegular`.

One big authored line (`short_1line`, ≤5 words) — fitted by measuring each
word with `@remotion/layout-utils` and adding the flex word gap exactly, so
the type is as large as the caption card allows and **never wrapped**. Words
enter with the shared stagger (rise 28px + scale from 0.94 on `springs.enter`,
motion-blur trail during the entry window only); the container exits as one on
`fadeThrough`.

It renders the same card, in the same place, as `CaptionLong`: the caption
band directly above the ProgressBar ring (`position: "bottom"` — which is what
ingest resolves every authored caption to). The card is a **plate of one fixed
length** — `captionCardWidthPx`, the safe width minus
`captionEnergyConfig.surfaceSafeGapPx` on each side — so it never shrink-wraps
onto short text and never touches the safe line. A reel's captions never
change reading position or plate length, whether they are one line or three.

Pure props-in, pixels-out: no file access, no package knowledge.

## Props

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `data` | `{ lines: [string] }` | — | exactly one authored line |
| `window` | `{ startFrame, endFrame }` | — | display window in frames |
| `position` | `"top" \| "bottom"` | — | band anchor — production always `bottom` |
| `direction` | `"rtl" \| "ltr"` | — | writing direction |
| `animation` | `{ enter, exit }` | `{ enter: "fadeThrough", exit: "fadeThrough" }` | container presets — the word stagger is the real entrance |
| `stagger` | `boolean` | `true` | word-level entrance on/off |
| `theme` | `HookBgTheme` | resolved default | template palette for the card and the ink halo |
| `safeArea` / `textZone` / `fontScale` / `reduced` | | | see `src/overlays/types.ts` |

## Usage

```tsx
<CaptionShort
  data={{ lines: ["أربع دول من دولة واحدة"] }}
  window={{ startFrame: 360, endFrame: 450 }}
  position="bottom"
  direction="rtl"
  theme="politics"
/>
```
