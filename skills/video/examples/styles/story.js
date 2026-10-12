// story.js: "How a seed grows", the tiny narrative that the three style examples share.
//
// The riso, pixel and cut-paper pages read the same times and positions from here, so their renders
// can be compared frame by frame. Positions are in a 1080x1080 frame (the pixel page divides by 6).
// story(t) is a pure function of time; a stepped style passes its stepped time (px.time(t)).
//
// Shot plan: 10.5 s at 24 fps, 252 frames. One change at a time; each step label holds 2.3 s or more.
//   time  frame  label    change
//   0.0   f0     1 Plant  the field, the title and the first label: a finished first frame
//   0.5   f12             a seed drops (gravity, an ease-in) and lands at 1.0 with a squash (pop)
//   1.5   f36             it sinks into the soil
//   2.4   f58    2 Water  the label changes
//   2.5   f60             a rain cloud slides in from the left (whoosh)
//   3.2   f77             rain for 1.2 s; the soil darkens as it soaks; a sprout pokes out at 4.1
//   4.8   f115   3 Sun    the cloud leaves to the right; the sun rises from behind the hill at 5.1
//   5.7   f137            the stem grows; the leaves unfold at 6.2 and 6.45
//   7.1   f170   4 Bloom  a bud swells, then six petals open one after another (pops, a chime)
//   8.3   f199            a bee flies in on an arc and lands at 9.2
//   9.2–10.5              hold on the finished flower

import { track, sfx, progress, lerp, easeOut, easeInOut } from "/_skill/runtime/motion.js";
import { hash } from "/_skill/runtime/styles/common.js";

export const SIZE = 1080;
export const DURATION = 10.5;
export const TITLE = "How a seed grows";
export const STEPS = [
  { at: 0, n: 1, word: "Plant" },
  { at: 2.4, n: 2, word: "Water" },
  { at: 4.8, n: 3, word: "Sun" },
  { at: 7.1, n: 4, word: "Bloom" },
];
export const AT = {
  seedDrop: 0.5, seedLand: 1.0, seedSink: 1.5,
  cloudIn: 2.5, rainOn: 3.2, rainOff: 4.4, soak: 3.5, sprout: 4.1, cloudOut: 4.8,
  sunUp: 5.1, grow: 5.7, leafL: 6.2, leafR: 6.45,
  bud: 7.2, bloom: 7.55, chime: 8.15, bee: 8.3, beeLand: 9.2,
};
export const PLACE = {
  ground: 786,          // where the soil mound's top meets the plant
  base: [540, 790],     // the foot of the stem
  height: 340,          // the grown stem
  cloudY: 340, sunX: 822, sunFrom: 820, sunTo: 330,
  beeFrom: [1180, 230], beeVia: [850, 120], beeTo: [624, 402],
};
// Stills for contact sheets: one per beat of the plan.
export const STILLS = [0, 0.75, 1.05, 1.75, 2.9, 3.7, 4.35, 5.25, 5.95, 6.7, 7.45, 7.95, 8.75, 10.4];

// ---------- tracks, built once ----------
const cloudIn = track(-320).to(AT.cloudIn, 540, { duration: 1.1, damping: 0.95 });
const sunY = track(PLACE.sunFrom).to(AT.sunUp, PLACE.sunTo, { duration: 1.4, damping: 0.92 });
const leafL = track(0).to(AT.leafL, 1, { duration: 0.6, damping: 0.7 });
const leafR = track(0).to(AT.leafR, 1, { duration: 0.6, damping: 0.7 });
const bud = track(0).to(AT.bud, 1, { duration: 0.5, damping: 0.75 });
const petals = Array.from({ length: 6 }, (_, i) => track(0).to(AT.bloom + 0.09 * i, 1, { duration: 0.45, damping: 0.65 }));

// ---------- sounds: the same for all three styles ----------
sfx(AT.seedLand, "pop");
for (const s of STEPS.slice(1)) sfx(s.at, "tap", 0.6);
sfx(AT.cloudIn, "whoosh", 0.7);
sfx(AT.cloudOut, "whoosh", 0.45);
for (const i of [0, 2, 4]) sfx(AT.bloom + 0.09 * i, "pop", 0.45);
sfx(AT.chime, "success", 0.8);
sfx(AT.bee, "whoosh", 0.35);

// The cloud's centre x: in on a spring, out on an ease-in (exits are faster than entrances).
export function cloudX(t) {
  if (t < AT.cloudOut) return cloudIn(t);
  const p = progress(t, AT.cloudOut, AT.cloudOut + 0.75);
  return lerp(cloudIn(AT.cloudOut), 1440, p * p * p);
}

// A point on the stem, u = 0 at the soil to 1 at the flower: a gentle S, like a real stalk.
export function stemAt(u) {
  const [bx, by] = PLACE.base;
  return [bx + 12 * Math.sin(u * Math.PI * 1.15) - 6 * u, by - PLACE.height * u];
}
export function stemPoints(h, n = 16) {
  return Array.from({ length: n + 1 }, (_, i) => stemAt((h * i) / n));
}

// Raindrops in the air at t: 50 a second from under the cloud, falling 1100 px/s to the soil.
export function rain(t) {
  const RATE = 50, drops = [];
  const first = Math.max(0, Math.floor((t - 0.6 - AT.rainOn) * RATE));
  const last = Math.floor((Math.min(t, AT.rainOff) - AT.rainOn) * RATE);
  for (let i = first; i <= last; i++) {
    const born = AT.rainOn + i / RATE;
    if (born > t) continue;
    const x = cloudX(born) + (hash("rain", i) * 2 - 1) * 150;
    const y = PLACE.cloudY + 55 + (t - born) * 1100;
    if (y < PLACE.ground - 8) drops.push({ i, x, y });
  }
  return drops;
}

// ---------- shapes the three pages share (closed point lists, 1080 space) ----------

// A cloud: the outline of a few overlapping puffs with a flat underside, traced by casting rays
// from a point inside it.
const PUFFS = [[-125, 12, 66], [-58, -28, 88], [36, -44, 100], [122, -2, 74], [10, 18, 84]];
export function cloudShape(cx, cy, scale = 1, n = 120) {
  const ox = cx, oy = cy + 10 * scale, floor = cy + 46 * scale;
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a);
    let far = 0;
    for (const [px, py, r] of PUFFS) {
      const qx = cx + px * scale - ox, qy = cy + py * scale - oy, b = dx * qx + dy * qy;
      const disc = b * b - (qx * qx + qy * qy) + (r * scale) ** 2;
      if (disc >= 0) far = Math.max(far, b + Math.sqrt(disc));
    }
    return [ox + dx * far, Math.min(floor, oy + dy * far)];
  });
}
// A leaf or petal from its base (x, y), `len` long and `width` wide at the widest, pointing at
// `angle` degrees (0 = right, -90 = up). `round` > 1 makes a fuller, petal-like outline.
export function leafShape(x, y, len, width, angle, round = 1, n = 14) {
  const c = Math.cos((angle * Math.PI) / 180), s = Math.sin((angle * Math.PI) / 180);
  const side = (k) => Array.from({ length: n + 1 }, (_, i) => {
    const u = k > 0 ? i / n : 1 - i / n;
    const hw = (width / 2) * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.8)), 1 / round) * k;
    const ax = u * len, ay = hw;
    return [x + ax * c - ay * s, y + ax * s + ay * c];
  });
  return [...side(1), ...side(-1).slice(1, -1)];
}

// A raindrop with its round end at (x, y), r wide at the round end, pointing up.
export function dropShape(x, y, r, n = 20) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = Math.PI * (i / n);                       // the round bottom half, right to left
    pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
  }
  pts.push([x - r * 0.72, y - r * 1.1], [x, y - r * 2.9], [x + r * 0.72, y - r * 1.1]);
  return pts;
}

// Everything that moves, at time t.
export function story(t) {
  let step = 0;
  while (step + 1 < STEPS.length && t >= STEPS[step + 1].at) step++;

  // The seed falls like a dropped thing (ease-in), squashes on landing, then sinks into the soil.
  const fall = progress(t, AT.seedDrop, AT.seedLand);
  const sink = easeInOut(progress(t, AT.seedSink, AT.seedSink + 0.4));
  const hit = t >= AT.seedLand ? Math.exp(-(t - AT.seedLand) / 0.09) * Math.cos((t - AT.seedLand) * Math.PI * 2 * 3.2) : 0;
  const seed = {
    x: PLACE.base[0], y: t < AT.seedLand ? lerp(-80, PLACE.ground - 14, fall * fall) : lerp(PLACE.ground - 14, PLACE.ground + 26, sink),
    sx: 1 + 0.22 * hit, sy: 1 - 0.3 * hit, spin: -50 * (1 - fall),
    falling: t >= AT.seedDrop && t < AT.seedLand, shown: t >= AT.seedDrop && sink < 1,
  };

  const sprout = easeOut(progress(t, AT.sprout, AT.sprout + 0.4));
  const stem = 0.1 * sprout + 0.9 * easeInOut(progress(t, AT.grow, AT.grow + 1.2));

  // The bee: one arc from the top right to the flower, easing in and out; it bobs while it flies.
  const u = easeInOut(progress(t, AT.bee, AT.beeLand));
  const [p0, p1, p2] = [PLACE.beeFrom, PLACE.beeVia, PLACE.beeTo];
  const bez = (k) => (1 - u) * (1 - u) * p0[k] + 2 * (1 - u) * u * p1[k] + u * u * p2[k];
  const bee = {
    shown: t >= AT.bee, landed: t >= AT.beeLand,
    x: bez(0), y: bez(1) + (u < 1 ? Math.sin(t * Math.PI * 2 * 2.2) * 10 * (1 - u) : 0),
    flap: Math.floor(t * 24 + 1e-6) % 2, // wings alternate every frame; stepped styles see every other
  };

  return {
    t, step, label: STEPS[step], since: t - STEPS[step].at, prev: STEPS[step - 1] ?? null,
    seed,
    cloud: { x: cloudX(t), y: PLACE.cloudY, shown: t >= AT.cloudIn && t < AT.cloudOut + 0.8 },
    rain: rain(t),
    wet: easeInOut(progress(t, AT.soak, AT.soak + 1.0)),
    sun: { x: PLACE.sunX, y: sunY(t) },
    stem, sprout,
    leaves: [leafL(t), leafR(t)],
    bud: bud(t),
    petals: petals.map((p) => p(t)),
    bee,
  };
}
