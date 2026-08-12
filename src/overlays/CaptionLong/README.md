# CaptionLong

Exactly two balanced authored lines (`long_2lines`). One font size for both —
fitted to the wider line, clamped to `[0.75×, 1×]` of the base — so the pair
reads as a single block. The word stagger runs flat across the line break;
the container exits as one. Line breaking is the author's decision: nothing
re-wraps (Arabic breaks badly under automatic re-grouping).

Pure props-in, pixels-out: no file access, no package knowledge.

## Props

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `data` | `{ lines: [string, string] }` | — | the two authored lines |
| `window` | `{ startFrame, endFrame }` | — | display window in frames |
| `position` | `"top" \| "bottom"` | — | band anchor (usually `bottom`) |
| `direction` | `"rtl" \| "ltr"` | — | writing direction |
| `animation` | `{ enter, exit }` | `{ enter: "fadeThrough", exit: "fadeThrough" }` | container presets |
| `stagger` | `boolean` | `true` | word-level entrance on/off |
| `safeArea` / `textZone` / `fontScale` / `reduced` | | | see `src/overlays/types.ts` |

## Usage

```tsx
<CaptionLong
  data={{ lines: ["سطر أول متوازن", "وسطر ثانٍ يكمله"] }}
  window={{ startFrame: 480, endFrame: 630 }}
  position="bottom"
  direction="rtl"
/>
```
