import { random } from "remotion";
import type { VideoIntroDirection } from "./config";

// Pure, deterministic building blocks for the opening reveal. Everything is
// derived from (composition size, config, frame-driven progress) — no state,
// no wall-clock, no unseeded randomness — so Studio and headless renders are
// pixel-identical and the module is unit-testable without a DOM.

export type IntroCell = {
  col: number;
  row: number;
  // Reveal order in [0, 1): cells with a lower threshold materialize first.
  threshold: number;
};

export type IntroGrid = {
  cols: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
  cells: IntroCell[];
};

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

// How strongly a cell is favoured by the chosen direction, normalized 0..1
// (0 = materializes first). "center" uses radial distance so the subject —
// almost always framed centrally in 9:16 podcast clips — appears earliest.
const directionalRank = (
  colCenter: number,
  rowCenter: number,
  direction: VideoIntroDirection,
): number => {
  switch (direction) {
    case "top":
      return rowCenter;
    case "bottom":
      return 1 - rowCenter;
    case "left":
      return colCenter;
    case "right":
      return 1 - colCenter;
    case "center": {
      const dx = colCenter - 0.5;
      const dy = rowCenter - 0.5;
      // Normalize by the corner distance so ranks span the full 0..1 range.
      return Math.sqrt(dx * dx + dy * dy) / Math.sqrt(0.5);
    }
  }
};

export const buildIntroGrid = ({
  width,
  height,
  cellSizeFactor,
  direction,
  directionBias,
  seed,
}: {
  width: number;
  height: number;
  cellSizeFactor: number;
  direction: VideoIntroDirection;
  directionBias: number;
  seed: string;
}): IntroGrid => {
  const targetCell = Math.max(16, width * cellSizeFactor);
  const cols = Math.max(2, Math.round(width / targetCell));
  const rows = Math.max(2, Math.round(height / targetCell));
  const cellWidth = width / cols;
  const cellHeight = height / rows;

  const cells: IntroCell[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const rank = directionalRank((col + 0.5) / cols, (row + 0.5) / rows, direction);
      const jitter = random(`${seed}:${col}:${row}`);
      cells.push({
        col,
        row,
        threshold: clamp01(rank * directionBias + jitter * (1 - directionBias)),
      });
    }
  }
  return { cols, rows, cellWidth, cellHeight, cells };
};

// Progress value at which `coverage` (0..1, fraction of all cells) has begun
// materializing — the threshold quantile. Drives frame 0: the intro starts at
// coverageToProgress(initialCoverage) so the opening frame is never empty.
export const coverageToProgress = (grid: IntroGrid, coverage: number): number => {
  const sorted = grid.cells.map((c) => c.threshold).sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor(clamp01(coverage) * sorted.length));
  return sorted[index] ?? 0;
};

// Per-cell visibility for a given reveal progress. `feather` widens the ramp
// so cells fade in over several frames instead of popping on. At progress 1
// every cell is exactly 1 regardless of threshold or feather.
export const cellAlpha = (threshold: number, progress: number, feather: number): number => {
  if (progress >= 1) {
    return 1;
  }
  const ramp = Math.max(feather, 1e-6);
  // Stretch progress so that even the last cell (threshold → 1) completes
  // its full ramp before progress reaches 1.
  return clamp01((progress * (1 + ramp) - threshold) / ramp);
};

// The dissolve mask as an inline SVG data URI. White = video visible. Cells
// grow slightly (92% → 100%) as they fade in, and a gaussian blur in mask
// space softens the square edges, so materialization reads as organic rather
// than checkerboard-mechanical. Returns null once the mask is a no-op.
export const buildMaskUri = ({
  grid,
  progress,
  feather,
  cellEdgeSoftness,
  width,
  height,
}: {
  grid: IntroGrid;
  progress: number;
  feather: number;
  cellEdgeSoftness: number;
  width: number;
  height: number;
}): string | null => {
  if (progress >= 1) {
    return null;
  }
  const blurStd = Math.min(grid.cellWidth, grid.cellHeight) * cellEdgeSoftness;
  // Blur bleeds white outward, so pad each rect's coordinates implicitly via
  // the filter region instead of shrinking the canvas.
  const rects: string[] = [];
  for (const cell of grid.cells) {
    const alpha = cellAlpha(cell.threshold, progress, feather);
    if (alpha <= 0) {
      continue;
    }
    const growth = 0.92 + 0.08 * alpha;
    const w = grid.cellWidth * growth;
    const h = grid.cellHeight * growth;
    const x = cell.col * grid.cellWidth + (grid.cellWidth - w) / 2;
    const y = cell.row * grid.cellHeight + (grid.cellHeight - h) / 2;
    const opacity = alpha >= 1 ? "" : ` fill-opacity="${alpha.toFixed(3)}"`;
    rects.push(
      `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}"${opacity}/>`,
    );
  }
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">` +
    `<filter id="s" x="-20%" y="-20%" width="140%" height="140%">` +
    `<feGaussianBlur stdDeviation="${blurStd.toFixed(1)}"/></filter>` +
    `<g fill="#fff" filter="url(#s)">${rects.join("")}</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};
