import assert from "node:assert/strict";
import { test } from "node:test";
import { videoIntroConfig } from "../src/video-intro/config";
import {
  buildIntroGrid,
  buildMaskUri,
  cellAlpha,
  coverageToProgress,
} from "../src/video-intro/math";

const gridParams = {
  width: 1080,
  height: 1920,
  cellSizeFactor: videoIntroConfig.cellSizeFactor,
  direction: videoIntroConfig.direction,
  directionBias: videoIntroConfig.directionBias,
  seed: videoIntroConfig.seed,
} as const;

test("grid is deterministic for identical inputs", () => {
  const a = buildIntroGrid(gridParams);
  const b = buildIntroGrid(gridParams);
  assert.deepEqual(a, b);
});

test("grid covers the full frame", () => {
  const grid = buildIntroGrid(gridParams);
  assert.equal(grid.cells.length, grid.cols * grid.rows);
  assert.ok(Math.abs(grid.cols * grid.cellWidth - 1080) < 1e-6);
  assert.ok(Math.abs(grid.rows * grid.cellHeight - 1920) < 1e-6);
  for (const cell of grid.cells) {
    assert.ok(cell.threshold >= 0 && cell.threshold <= 1);
  }
});

test("changing the seed reshuffles cell order", () => {
  const a = buildIntroGrid(gridParams);
  const b = buildIntroGrid({ ...gridParams, seed: "other-seed" });
  assert.notDeepEqual(
    a.cells.map((c) => c.threshold),
    b.cells.map((c) => c.threshold),
  );
});

test("center direction reveals the middle before the corners", () => {
  const grid = buildIntroGrid({ ...gridParams, directionBias: 1 });
  const middle = grid.cells.find(
    (c) => c.col === Math.floor(grid.cols / 2) && c.row === Math.floor(grid.rows / 2),
  );
  const corner = grid.cells.find((c) => c.col === 0 && c.row === 0);
  assert.ok(middle && corner && middle.threshold < corner.threshold);
});

test("cellAlpha ramps monotonically and completes at progress 1", () => {
  const feather = videoIntroConfig.feather;
  let prev = -1;
  for (let p = 0; p <= 1.0001; p += 0.05) {
    const alpha = cellAlpha(0.7, Math.min(1, p), feather);
    assert.ok(alpha >= prev - 1e-9, `alpha must not decrease (p=${p})`);
    assert.ok(alpha >= 0 && alpha <= 1);
    prev = alpha;
  }
  // Every threshold — including the worst case 1 — must be fully revealed.
  assert.equal(cellAlpha(1, 1, feather), 1);
  assert.equal(cellAlpha(0.999, 1, feather), 1);
});

test("mask is a no-op (null) once progress reaches 1", () => {
  const grid = buildIntroGrid(gridParams);
  const shared = {
    grid,
    feather: videoIntroConfig.feather,
    cellEdgeSoftness: videoIntroConfig.cellEdgeSoftness,
    width: 1080,
    height: 1920,
  };
  assert.equal(buildMaskUri({ ...shared, progress: 1 }), null);
  const mid = buildMaskUri({ ...shared, progress: 0.5 });
  assert.ok(mid && mid.startsWith('url("data:image/svg+xml,'));
});

test("mask URI is deterministic per (grid, progress)", () => {
  const grid = buildIntroGrid(gridParams);
  const shared = {
    grid,
    feather: videoIntroConfig.feather,
    cellEdgeSoftness: videoIntroConfig.cellEdgeSoftness,
    width: 1080,
    height: 1920,
  };
  assert.equal(
    buildMaskUri({ ...shared, progress: 0.35 }),
    buildMaskUri({ ...shared, progress: 0.35 }),
  );
});

test("frame 0 already shows the configured initial coverage", () => {
  const grid = buildIntroGrid(gridParams);
  const startProgress = coverageToProgress(grid, videoIntroConfig.initialCoverage);
  const visible = grid.cells.filter(
    (c) => cellAlpha(c.threshold, startProgress, videoIntroConfig.feather) > 0,
  );
  assert.ok(
    visible.length / grid.cells.length >= videoIntroConfig.initialCoverage,
    "the opening frame must not be empty",
  );
});
