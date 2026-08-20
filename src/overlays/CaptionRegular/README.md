# CaptionRegular

Renders authored `type: "regular"` verbatim captions on the shared caption
energy surface. Optional frame-resolved `words[]` drive the active/past/upcoming
karaoke treatment; without timing, the established authored word stagger is
used. `emphasis` highlights up to two matching whole-word tokens. Matching is
Arabic-aware: harakat, tatweel, punctuation, ة/ه and ى/ي do not prevent a
match, while the authored display spelling is preserved exactly.

With `verse: true`, every authored line (including a single surviving
hemistich) is fixed and centred. Layout may reduce the shared font size to fit,
but it never wraps or re-balances lines. Verse uses a restrained masked rise,
a manuscript-like gold plate ornament, and gold emphasis; regular prose keeps
the shared energy rail and cyan karaoke emphasis. Arabic is tokenized with
`Intl.Segmenter` and is never split into characters.
