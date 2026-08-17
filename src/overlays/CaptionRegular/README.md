# CaptionRegular

Renders authored `type: "regular"` verbatim captions on the shared caption
energy surface. Optional frame-resolved `words[]` drive the active/past/upcoming
karaoke treatment; without timing, the established authored word stagger is
used. `emphasis` highlights up to two matching word tokens.

With `verse: true`, every authored line is a fixed, centred hemistich. Layout
may reduce the shared font size to fit, but it never wraps or re-balances lines.
Arabic is tokenized with `Intl.Segmenter` and is never split into characters.
