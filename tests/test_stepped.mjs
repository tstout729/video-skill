#!/usr/bin/env node
// Stepped time for the style packs (runtime/styles/common.js), with no browser: "on twos" holds each
// drawing for exactly two frames at the frame times render.mjs uses, at any render rate that is a
// multiple of the drawing rate, and a loop's last frame is the same drawing as frame 0.
//   node tests/test_stepped.mjs
import assert from "node:assert/strict";
import { stepOf, stepTime, hash } from "../skills/video/runtime/styles/common.js";

// At 24 fps on twos: drawing n covers frames 2n-1 and 2n, so after frame 0 every drawing is held
// for two frames, for a long video too (no drift from floating point).
for (let k = 1; k < 24 * 60 * 10; k += 2) {
  const t = k / 24;
  assert.equal(stepOf(t), stepOf((k + 1) / 24), `frames ${k} and ${k + 1} should be one drawing`);
  assert.notEqual(stepOf((k + 1) / 24), stepOf((k + 2) / 24), `frame ${k + 2} should be a new drawing`);
}
// Rendered at 48 fps, each 12 fps drawing lasts exactly 4 frames.
const runs = new Map();
for (let k = 0; k < 48 * 20; k++) runs.set(stepOf(k / 48), (runs.get(stepOf(k / 48)) ?? 0) + 1);
assert.ok([...runs.values()].slice(1, -1).every((n) => n === 4), "at 48 fps each drawing should last 4 frames");
// Tracks read at the stepped time change only when the drawing changes.
assert.equal(stepTime(25 / 24), stepTime(26 / 24));
assert.equal(stepTime(26 / 24), 26 / 24);
// On ones the drawing is the nearest frame.
assert.equal(stepOf(37 / 24, { every: 1 }), 37);
// A 4 s loop at 24 fps (96 frames, 48 drawings): frame 95 is drawing 0 again, like frame 0.
const loop = { loop: 4 };
assert.equal(stepOf(95 / 24, loop), stepOf(0, loop));
assert.equal(stepTime(95 / 24, loop), 0);
assert.equal(stepOf(94 / 24, loop), 47);
// Seeded jitter depends only on its parts.
assert.equal(hash("leaf", 3, 12), hash("leaf", 3, 12));
assert.notEqual(hash("ab", "c"), hash("a", "bc"));
console.log("ok: on twos holds every drawing for two frames; loops wrap to drawing 0");
