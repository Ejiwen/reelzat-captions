# CaptionShort

One big authored line (`short_1line`, ≤5 words) — auto-fit with
`@remotion/layout-utils`, **never wrapped**. Words enter with the shared
3-frame stagger (rise 28px + scale from 0.94 on `springs.enter`, motion-blur
trail during the entry window only); the container exits as one on
`fadeThrough`.

Pure props-in, pixels-out: no file access, no package knowledge.

## Props

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `data` | `{ lines: [string] }` | — | exactly one authored line |
| `window` | `{ startFrame, endFrame }` | — | display window in frames |
| `position` | `"top" \| "bottom"` | — | band anchor |
| `direction` | `"rtl" \| "ltr"` | — | writing direction |
| `animation` | `{ enter, exit }` | `{ enter: "fadeThrough", exit: "fadeThrough" }` | container presets — the word stagger is the real entrance |
| `stagger` | `boolean` | `true` | word-level entrance on/off |
| `safeArea` / `textZone` / `fontScale` / `reduced` | | | see `src/overlays/types.ts` |

## Usage

```tsx
<CaptionShort
  data={{ lines: ["أربع دول من دولة واحدة"] }}
  window={{ startFrame: 360, endFrame: 450 }}
  position="top"
  direction="rtl"
/>
```
