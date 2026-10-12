// hero3d.js: the skill's mark (a play triangle on a rounded-square ceramic slab) as a 3D hero.
//
//   import { createHero } from "./hero3d.js";
//   const hero = createHero(canvas, { variant: "directed", width: 1080, height: 620, seed: 7 });
//   window.seek = (t) => hero.render(t, { hop: 2.0 });
//
// Two looks of the same object:
//   "default"   the generic AI look, on purpose: navy-to-purple space, a glowing halo ring,
//               150 drifting particles, a constant turntable spin and a lens-flare glint.
//   "directed"  a warm studio: a #ECEBE7 cyclorama, satin ceramic (roughness 0.35, clearcoat 1,
//               clearcoat roughness 0.15), key/fill/rim lights with soft shadows, a contact shadow,
//               FOV 40°, a drift under 2% of the frame, a hop and a landing with squash and stretch.
//
// render(t, state) draws one exact frame. t is seconds since the pane's own start. state:
//   hop:  time the hop starts (directed). Frame numbers below are 60 fps frames after it.
//   land: time the drop-in starts (directed, shot 6). Before it, the object is above the frame.
//   push: time the 0.9 s ease-in-out camera push-in starts (directed).
//   dim:  0..1, darkens the whole pane (both variants).
//   yaw:  optional resting turn in degrees that replaces the pose's yaw (directed), so a page can
//         turn the object to face the camera (yaw 0) before a match cut to a flat card.
// Every frame is a pure function of (t, state): no clocks, timers, Math.random or carried state.
// The only import is three.js r186 from /_vendor/, so the page needs no import map.

import * as THREE from "/_vendor/three/build/three.module.js";

export const FPS = 60;
const DEG = Math.PI / 180;
const TAU = Math.PI * 2;

// ---------- time-pure math ----------

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, p) => a + (b - a) * p;
const sine = (p) => (1 - Math.cos(Math.PI * clamp(p))) / 2; // ease-in-out
const inQuad = (p) => clamp(p) ** 2;
const outQuad = (p) => 1 - (1 - clamp(p)) ** 2;
const inOutCubic = (p) => {
  p = clamp(p);
  return p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2;
};

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Closed-form damped spring (no simulation): displacement from rest at time t, starting at
// displacement x0 with velocity v0 (units per second). zeta < 1, omega in rad/s.
export function spring(t, x0, v0, zeta, omega) {
  if (t <= 0) return x0;
  const wd = omega * Math.sqrt(1 - zeta * zeta);
  const e = Math.exp(-zeta * omega * t);
  return e * (x0 * Math.cos(wd * t) + ((v0 + zeta * omega * x0) / wd) * Math.sin(wd * t));
}

// ---------- the mark ----------

// Locked proportions: slab 1 : 1 : 0.28, corner radius 22% of the width, triangle 42% of the width.
export const MARK = { width: 1, height: 1, depth: 0.28, radius: 0.22, triangle: 0.42 };

// ---------- the hop and the landing (directed) ----------

const ZETA = 0.8; // every settle in this file
const W_SQUASH = TAU / 0.5; // squash recovery spring, natural frequency (rad/s)
const W_TILT = TAU / 0.62; // tilt follow-through, a little slower: it settles after the squash
const W_YAW = 6; // landing yaw: about 15% of the turn is left at touchdown
const HOP_HEIGHT = 0.9; // object heights
const HOP_FLIGHT = 30; // frames in the air
const HOP_TRAVEL = 1.1; // object widths, sideways (+x)
const HOP_SLIDE = 0.025; // s, time constant of the short skid after touchdown
const TILT_LAND = -2.5; // degrees at touchdown (the base reaches forward to land)
const TILT_KICK = 135; // deg/s forward on touchdown: rocks to about +4° and settles
const DROP_FALL = 27; // frames from the start of the drop to touchdown
const DROP_YAW = -28; // degrees: the drop turns to face the camera as it falls
const VX = HOP_TRAVEL / (HOP_FLIGHT / FPS);

// Hop timeline in 60 fps frames after state.hop. `settle` is computed below.
export const HOP = {
  anticipation: [0, 4], // squash to scaleY 0.88 (scaleXZ 1.066, volume kept)
  push: [4, 8], // extend to the flight stretch, scaleY 1.08 at f8
  liftoff: 6,
  apex: 6 + HOP_FLIGHT / 2, // f21, stretch relaxed to 1.0
  contact: 6 + HOP_FLIGHT, // f36, touchdown
  squash: [38, 40], // scaleY 0.86 held for 3 frames (f38, f39, f40)
  release: 40, // spring recovery at ζ 0.8 starts
  settle: 0,
  height: HOP_HEIGHT,
  travel: 0,
};
export const LAND = { contact: DROP_FALL, squash: [DROP_FALL + 2, DROP_FALL + 4], release: DROP_FALL + 4, settle: 0 };

// Touchdown squash shared by the hop and the drop: fc frames after contact.
function landingScaleY(fc, from) {
  if (fc < 2) return from + (0.86 - from) * outQuad(fc / 2);
  if (fc < 4) return 0.86;
  return 1 - spring((fc - 4) / FPS, 0.14, 0, ZETA, W_SQUASH);
}

function hopScaleY(f) {
  if (f <= 0) return 1;
  if (f < 4) return 1 - 0.12 * sine(f / 4); // anticipation
  if (f < 8) return 0.88 + 0.2 * sine((f - 4) / 4); // push off, leaves the floor at f6
  if (f < HOP.apex) return 1.08 - 0.08 * sine((f - 8) / (HOP.apex - 8)); // stretch relaxes at the apex
  if (f < HOP.contact) return 1 + 0.04 * inQuad((f - HOP.apex) / (HOP.contact - HOP.apex)); // falling stretch
  return landingScaleY(f - HOP.contact, 1.04);
}

function hopLift(f) {
  if (f <= HOP.liftoff || f >= HOP.contact) return 0;
  const u = (f - HOP.liftoff) / HOP_FLIGHT;
  return 4 * HOP_HEIGHT * u * (1 - u);
}

function hopX(f) {
  if (f <= 4) return 0;
  const x6 = VX / FPS; // the push accelerates from rest to VX over f4..f6
  if (f < HOP.liftoff) {
    const s = (f - 4) / FPS;
    return 0.5 * (VX / (2 / FPS)) * s * s;
  }
  if (f < HOP.contact) return x6 + (VX * (f - HOP.liftoff)) / FPS;
  return x6 + HOP_TRAVEL + VX * HOP_SLIDE * (1 - Math.exp(-(f - HOP.contact) / FPS / HOP_SLIDE));
}

function hopTilt(f) {
  if (f <= 0) return 0;
  if (f < 4) return -1.5 * sine(f / 4); // a small lean back while it gathers
  if (f < 9) return -1.5 + 9.5 * sine((f - 4) / 5); // leads into the jump at +8°
  if (f < HOP.contact) return 8 - (8 - TILT_LAND) * sine((f - 9) / (HOP.contact - 9));
  return spring((f - HOP.contact) / FPS, TILT_LAND, TILT_KICK, ZETA, W_TILT); // follow-through
}

HOP.travel = hopX(400);

/**
 * Pose of the directed object at time t: { x, y, z, yaw, tilt, sy, sxz, visible }.
 * y is the lift of the base above the floor (object heights), tilt is degrees toward +x,
 * yaw is degrees. Pure, so a page can plot it (speed graph, onion skin) or cue to it.
 */
export function heroPose(t, state = {}, cfg = {}) {
  const x0 = cfg.x0 ?? -0.6;
  const yaw = cfg.yaw ?? -20;
  if (Number.isFinite(state.land)) {
    const f = (t - state.land) * FPS;
    const from = cfg.dropFrom ?? 3;
    const p = { x: cfg.landX ?? 0, y: 0, z: 0, yaw: DROP_YAW * spring(Math.max(0, f) / FPS, 1, 0, ZETA, W_YAW), tilt: 0, sy: 1, visible: true };
    if (f < DROP_FALL) {
      const u = clamp(f / DROP_FALL);
      p.y = from * (1 - u * u); // falls from rest under constant gravity
      p.sy = 1 + 0.07 * u ** 1.5; // stretch grows with speed
      p.visible = f > -0.5;
    } else {
      p.sy = landingScaleY(f - DROP_FALL, 1.07);
    }
    p.sxz = 1 / Math.sqrt(p.sy); // volume kept
    return p;
  }
  const f = Number.isFinite(state.hop) ? (t - state.hop) * FPS : 0;
  const sy = hopScaleY(f);
  return { x: x0 + hopX(f), y: hopLift(f), z: 0, yaw, tilt: hopTilt(f), sy, sxz: 1 / Math.sqrt(sy), visible: true };
}

// First frame after which the pose stays at rest to within about half a pixel.
function settleFrame(state, from, endX) {
  let last = from;
  for (let f = from; f < from + 240; f++) {
    const p = heroPose(f / FPS, state);
    // Thresholds are about half a pixel on a 230 px object.
    const still = Math.abs(p.sy - 1) < 0.003 && Math.abs(p.tilt) < 0.15 && Math.abs(p.x - endX) < 0.002 && (state.land !== 0 || Math.abs(p.yaw) < 0.3);
    if (!still) last = f + 1;
  }
  return last;
}
HOP.settle = settleFrame({ hop: 0 }, HOP.contact, -0.6 + HOP.travel);
LAND.settle = settleFrame({ land: 0 }, LAND.contact, 0);

// ---------- geometry ----------

// A convex polygon with every corner rounded to radius r (no duplicate points).
function roundedPolygon(pts, r, seg) {
  const out = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const P = pts[(i + n - 1) % n], V = pts[i], N = pts[(i + 1) % n];
    const d1 = P.clone().sub(V).normalize();
    const d2 = N.clone().sub(V).normalize();
    const half = Math.acos(clamp(d1.dot(d2), -1, 1)) / 2;
    const C = V.clone().add(d1.clone().add(d2).normalize().multiplyScalar(r / Math.sin(half)));
    const A = V.clone().add(d1.clone().multiplyScalar(r / Math.tan(half)));
    const B = V.clone().add(d2.clone().multiplyScalar(r / Math.tan(half)));
    const a0 = Math.atan2(A.y - C.y, A.x - C.x);
    let da = Math.atan2(B.y - C.y, B.x - C.x) - a0;
    while (da > Math.PI) da -= TAU;
    while (da < -Math.PI) da += TAU;
    for (let k = 0; k <= seg; k++) out.push(new THREE.Vector2(C.x + r * Math.cos(a0 + (da * k) / seg), C.y + r * Math.sin(a0 + (da * k) / seg)));
  }
  return out;
}

// A planar projection skewed off every face axis: continuous UVs everywhere, so the glaze
// textures have no seams where the face meets the bevel.
const skewUV = (v, i) => new THREE.Vector2(v[i * 3] + 0.6 * v[i * 3 + 2], v[i * 3 + 1] + 0.45 * v[i * 3 + 2]);
const SKEW_UV = {
  generateTopUV: (g, v, a, b, c) => [skewUV(v, a), skewUV(v, b), skewUV(v, c)],
  generateSideWallUV: (g, v, a, b, c, d) => [skewUV(v, a), skewUV(v, b), skewUV(v, c), skewUV(v, d)],
};

// ExtrudeGeometry is non-indexed with flat normals. The bevel profile is tangent to the faces
// and walls, so averaging the normals of every face that shares a position is exact here.
function smoothNormals(geo) {
  const pos = geo.attributes.position;
  const n = pos.count;
  const ids = new Int32Array(n);
  const index = new Map();
  let acc = [];
  for (let i = 0; i < n; i++) {
    const k = `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`;
    let id = index.get(k);
    if (id === undefined) {
      id = acc.length / 3;
      index.set(k, id);
      acc.push(0, 0, 0);
    }
    ids[i] = id;
  }
  acc = new Float64Array(acc);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < n; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);
    c.sub(b);
    a.sub(b);
    c.cross(a); // area-weighted face normal
    for (let j = i; j < i + 3; j++) {
      acc[ids[j] * 3] += c.x;
      acc[ids[j] * 3 + 1] += c.y;
      acc[ids[j] * 3 + 2] += c.z;
    }
  }
  const normals = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    a.set(acc[ids[i] * 3], acc[ids[i] * 3 + 1], acc[ids[i] * 3 + 2]).normalize();
    normals.set([a.x, a.y, a.z], i * 3);
  }
  geo.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  return geo;
}

// The slab and the embossed triangle. Origin at the centre of the base, front face toward +z.
function markGeometry() {
  const bevel = 0.07; // rounded edge: a quarter of the depth on each side
  const inner = MARK.width - 2 * bevel;
  const r = MARK.radius - bevel; // offset curve: outer corner radius = 0.22
  const square = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => new THREE.Vector2((x * inner) / 2, (y * inner) / 2));
  const slab = new THREE.ExtrudeGeometry(new THREE.Shape(roundedPolygon(square, r, 20)), {
    depth: MARK.depth - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel,
    bevelSegments: 12, curveSegments: 1, UVGenerator: SKEW_UV,
  });
  slab.computeBoundingBox();
  const zc = (slab.boundingBox.min.z + slab.boundingBox.max.z) / 2;
  slab.translate(0, MARK.height / 2, -zc);
  smoothNormals(slab);

  // Play triangle, pointing right. 42% of the width tall (outer edge of its bevel), with
  // rounded corners, shifted right of its box centre by part of the way to its centroid.
  const tb = 0.012;
  const sharp = 1;
  const w = (sharp * Math.sqrt(3)) / 2;
  const tri = [new THREE.Vector2(-w / 2, -sharp / 2), new THREE.Vector2(w / 2, 0), new THREE.Vector2(-w / 2, sharp / 2)];
  let pts = roundedPolygon(tri, 0.11 * sharp, 14);
  const box = new THREE.Box2().setFromPoints(pts);
  const s = (MARK.triangle - 2 * tb) / (box.max.y - box.min.y);
  const cx = (box.min.x + box.max.x) / 2;
  pts = pts.map((p) => new THREE.Vector2((p.x - cx) * s + 0.028, p.y * s));
  const triangle = new THREE.ExtrudeGeometry(new THREE.Shape(pts), {
    depth: 0.008, bevelEnabled: true, bevelThickness: tb, bevelSize: tb, bevelSegments: 6, curveSegments: 1, UVGenerator: SKEW_UV,
  });
  triangle.computeBoundingBox();
  triangle.translate(0, MARK.height / 2, MARK.depth / 2 - 0.004 - triangle.boundingBox.min.z);
  smoothNormals(triangle);
  return { slab, triangle };
}

// Seamless cyclorama: floor, a quarter-round cove and a wall, built from one profile.
function cycGeometry({ width = 44, front = 12, back = -2.0, radius = 2.6, top = 16 } = {}) {
  const prof = [];
  for (let i = 0; i <= 10; i++) prof.push([lerp(front, back, i / 10), 0, 0, 1]);
  for (let i = 1; i <= 40; i++) {
    const a = (i / 40) * (Math.PI / 2);
    prof.push([back - radius * Math.sin(a), radius - radius * Math.cos(a), Math.sin(a), Math.cos(a)]);
  }
  for (let i = 1; i <= 8; i++) prof.push([back - radius, lerp(radius, top, i / 8), 1, 0]);
  const cols = 24;
  const pos = [], nrm = [], uv = [], idx = [];
  prof.forEach(([z, y, nz, ny], j) => {
    for (let i = 0; i <= cols; i++) {
      pos.push(lerp(-width / 2, width / 2, i / cols), y, z);
      nrm.push(0, ny, nz);
      uv.push(i / cols, j / (prof.length - 1));
    }
  });
  for (let j = 0; j < prof.length - 1; j++) {
    for (let i = 0; i < cols; i++) {
      const a = j * (cols + 1) + i, b = a + 1, c = a + cols + 1, d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

// ---------- textures (seeded, generated in code) ----------

function canvasTexture(w, h, draw, srgb = true) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const tex = new THREE.CanvasTexture(c);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Tileable value noise, octaves summed, normalised to 0..1.
function noiseField(rand, size, cells) {
  const out = new Float32Array(size * size);
  let amp = 1, total = 0;
  for (const n of cells) {
    const lat = Float32Array.from({ length: n * n }, () => rand());
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * n, fy = (y / size) * n;
        const x0 = Math.floor(fx), y0 = Math.floor(fy);
        const sx = fx - x0, sy = fy - y0;
        const u = sx * sx * (3 - 2 * sx), v = sy * sy * (3 - 2 * sy);
        const at = (i, j) => lat[((j % n) * n + (i % n))];
        const val = lerp(lerp(at(x0, y0), at(x0 + 1, y0), u), lerp(at(x0, y0 + 1), at(x0 + 1, y0 + 1), u), v);
        out[y * size + x] += val * amp;
      }
    }
    total += amp;
    amp *= 0.55;
  }
  let lo = Infinity, hi = -Infinity;
  for (const v of out) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  for (let i = 0; i < out.length; i++) out[i] = (out[i] - lo) / (hi - lo);
  return out;
}

function dataTexture(size, fill) {
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) fill(i, data, i * 4);
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

// Glaze: roughness drifts a little across the surface, and the clearcoat has a faint
// orange-peel wave that breaks up reflections the way a fired glaze does.
function glazeTextures(rand) {
  const size = 256;
  const blotch = noiseField(rand, size, [3, 6, 12]);
  const roughness = dataTexture(size, (i, d, o) => {
    const g = Math.round(255 * (0.78 + 0.22 * blotch[i]));
    d[o] = d[o + 1] = d[o + 2] = g;
    d[o + 3] = 255;
  });
  const peel = noiseField(rand, size, [24, 48]);
  const k = 2.2;
  const normal = dataTexture(size, (i, d, o) => {
    const x = i % size, y = (i / size) | 0;
    const hx = peel[y * size + ((x + 1) % size)] - peel[y * size + ((x + size - 1) % size)];
    const hy = peel[((y + 1) % size) * size + x] - peel[((y + size - 1) % size) * size + x];
    const nx = -hx * k, ny = -hy * k, nz = 1;
    const l = Math.hypot(nx, ny, nz);
    d[o] = Math.round(255 * (nx / l * 0.5 + 0.5));
    d[o + 1] = Math.round(255 * (ny / l * 0.5 + 0.5));
    d[o + 2] = Math.round(255 * (nz / l * 0.5 + 0.5));
    d[o + 3] = 255;
  });
  roughness.repeat.set(1.3, 1.3);
  normal.repeat.set(1.6, 1.6);
  return { roughness, normal };
}

// A blurred footprint of the slab's base: white with alpha, tinted by the material colour.
function footprintTexture(planeW, planeD, footW, footD, blur) {
  const pxPerUnit = 512 / planeW;
  return canvasTexture(512, Math.round(planeD * pxPerUnit), (g, w, h) => {
    g.filter = `blur(${(blur * pxPerUnit).toFixed(2)}px)`;
    g.fillStyle = "#fff";
    const fw = footW * pxPerUnit, fd = footD * pxPerUnit;
    g.beginPath();
    g.roundRect((w - fw) / 2, (h - fd) / 2, fw, fd, fd / 2);
    g.fill();
  }, false);
}

// ---------- environment (RoomEnvironment, inlined so the module has no bare 'three' import) ----------

// Port of three/examples/jsm/environments/RoomEnvironment.js (MIT), r186. `shell` optionally
// makes the room's walls glow (a white studio instead of a grey room).
function roomEnvironment(shell = null) {
  const scene = new THREE.Scene();
  scene.position.y = -3.5;
  const geometry = new THREE.BoxGeometry();
  geometry.deleteAttribute("uv");
  const light = new THREE.PointLight(0xffffff, 900, 28, 2);
  light.position.set(0.418, 16.199, 0.3);
  scene.add(light);
  const room = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ side: THREE.BackSide, ...(shell ? { emissive: shell.color, emissiveIntensity: shell.intensity } : {}) }));
  room.position.set(-0.757, 13.219, 0.717);
  room.scale.set(31.713, 28.305, 28.591);
  scene.add(room);
  const boxMat = new THREE.MeshStandardMaterial();
  for (const [p, ry, s] of [
    [[-10.906, 2.009, 1.846], -0.195, [2.328, 7.905, 4.651]],
    [[-5.607, -0.754, -0.758], 0.994, [1.97, 1.534, 3.955]],
    [[6.167, 0.857, 7.803], 0.561, [3.927, 6.285, 3.687]],
    [[-2.017, 0.018, 6.124], 0.333, [2.002, 4.566, 2.064]],
    [[2.291, -0.756, -2.621], -0.286, [1.546, 1.552, 1.496]],
    [[-2.193, -0.369, -5.547], 0.516, [3.875, 3.487, 2.986]],
  ]) {
    const box = new THREE.Mesh(geometry, boxMat);
    box.position.set(...p);
    box.rotation.set(0, ry, 0);
    box.scale.set(...s);
    scene.add(box);
  }
  const area = (i) => new THREE.MeshLambertMaterial({ color: 0x000000, emissive: 0xffffff, emissiveIntensity: i });
  for (const [i, p, s] of [
    [50, [-16.116, 14.37, 8.208], [0.1, 2.428, 2.739]],
    [50, [-16.109, 18.021, -8.207], [0.1, 2.425, 2.751]],
    [17, [14.904, 12.198, -1.832], [0.15, 4.265, 6.331]],
    [43, [-0.462, 8.89, 14.52], [4.38, 5.441, 0.088]],
    [20, [3.235, 11.486, -12.541], [2.5, 2.0, 0.1]],
    [100, [0.0, 20.0, 0.0], [1.0, 0.1, 1.0]],
  ]) {
    const m = new THREE.Mesh(geometry, area(i));
    m.position.set(...p);
    m.scale.set(...s);
    scene.add(m);
  }
  return scene;
}

// Directed studio: light positions shared by the lights and their softboxes in the reflections.
const KEY_POS = new THREE.Vector3(-4.0, 4.6, 2.4);
const RIM_POS = new THREE.Vector3(2.6, 2.4, -5.0);
const CYC_ALBEDO = [0.722, 0.732, 0.73]; // sRGB; renders #ECEBE7 behind the object

// RoomEnvironment plus two softboxes where the key and the rim stand, so the clearcoat
// reflects the same lights that shade the object.
function studioEnvironment() {
  // The walls glow like the lit cyclorama, so grazing reflections on the glaze stay light.
  const scene = roomEnvironment({ color: 0xf1efea, intensity: 0.25 });
  const box = new THREE.BoxGeometry();
  const panel = (dir, dist, w, h, intensity, color) => {
    const m = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity) }));
    m.position.copy(dir.clone().normalize().multiplyScalar(dist)).add(new THREE.Vector3(0, 3.5, 0)); // scene sits at y -3.5
    m.lookAt(0, 0, 0); // world origin, where PMREM captures from
    m.scale.set(w, h, 0.05);
    scene.add(m);
  };
  panel(KEY_POS.clone().sub(new THREE.Vector3(0, 0.5, 0)), 9, 5.5, 4.0, 14, 0xfff6ee);
  // The lit cyclorama wall behind the object: at grazing angles the glaze reflects this,
  // not a grey room, so the silhouette stays light instead of drawing a dark outline.
  panel(new THREE.Vector3(0, 0.25, -1), 8, 26, 9, 1.5, 0xf1efea);
  // A low bounce card in front: its top edge crosses the face's reflection, so the glaze
  // carries a soft sheen on its lower half, as a glazed face over a lit floor does.
  panel(new THREE.Vector3(-0.3, -0.5, 1), 8, 11, 4.5, 1.2, 0xf6f3ee);
  panel(RIM_POS.clone().sub(new THREE.Vector3(0, 0.7, 0)), 9, 1.4, 6.5, 22, 0xf2f0ff);
  return scene;
}

// The AI look's reflections: a dark room with magenta, cyan and violet light strips.
function neonEnvironment() {
  const scene = new THREE.Scene();
  const geometry = new THREE.BoxGeometry();
  const room = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0x06071a, side: THREE.BackSide }));
  room.scale.setScalar(30);
  scene.add(room);
  const strip = (color, i, p, s) => {
    const m = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(i) }));
    m.position.set(...p);
    m.scale.set(...s);
    scene.add(m);
  };
  strip(0xff3bd8, 7, [-9, 3, 4], [0.2, 9, 3]);
  strip(0x35e4ff, 7, [9, 1, 3], [0.2, 9, 3]);
  strip(0xa58bff, 5, [0, 10, 2], [10, 0.2, 3]);
  strip(0x6a7dff, 3, [0, -3, 10], [8, 1, 0.2]);
  return scene;
}

// ---------- soft shadows ----------

// r186 removed PCFSoftShadowMap; its PCFShadowMap takes 5 rotated taps, which looks grainy at a
// studio-softbox radius. Swap in a 32-tap Vogel disk for the materials that receive the key's
// shadow (scoped with onBeforeCompile: no change to three's global shader chunks).
const PCF_TAPS = 32;
let softChunk = null;
function softShadowChunk() {
  if (softChunk) return softChunk;
  const src = THREE.ShaderChunk.shadowmap_pars_fragment;
  const a = src.indexOf("shadow = (", src.indexOf("float radius = shadowRadius * texelSize.x;"));
  const end = ") * 0.2;";
  const b = src.indexOf(end, a);
  if (a < 0 || b < 0) return (softChunk = src); // unknown three version: keep its own filter
  const loop = `shadow = 0.0;
				for ( int i = 0; i < ${PCF_TAPS}; i ++ ) {
					shadow += texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( i, ${PCF_TAPS}, phi ) * radius, shadowCoord.z ) );
				}
				shadow /= float( ${PCF_TAPS} );`;
  return (softChunk = src.slice(0, a) + loop + src.slice(b + end.length));
}
function softShadows(material, extra = null, key = "") {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace("#include <shadowmap_pars_fragment>", softShadowChunk());
    extra?.(shader);
  };
  material.customProgramCacheKey = () => "hero3d-soft-pcf" + key;
  return material;
}

// The cyclorama's floor dims slightly toward the camera, as it does under a real overhead
// softbox, so the brightest floor is around the subject rather than at the bottom edge.
function cycFalloff(shader) {
  shader.vertexShader = shader.vertexShader
    .replace("#include <common>", "#include <common>\nvarying vec3 vCycPos;")
    .replace("#include <project_vertex>", "#include <project_vertex>\n\tvCycPos = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;");
  shader.fragmentShader = shader.fragmentShader
    .replace("#include <common>", "#include <common>\nvarying vec3 vCycPos;")
    .replace("#include <opaque_fragment>", "outgoingLight *= 1.0 - 0.06 * smoothstep( 0.1, 1.4, vCycPos.z );\n\t#include <opaque_fragment>");
}

// ---------- shared screen-space helpers ----------

function overlay() {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, 1, 1, 0, -1, 1);
  return { scene, camera };
}

function screenQuad(material) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  m.frustumCulled = false;
  return m;
}

// ---------- the hero ----------

/**
 * createHero(canvas, { variant: "default" | "directed", width, height, seed, framing })
 * returns { render(t, state), setSize(width, height), pose(t, state), camera, dispose() }.
 *
 * framing (directed, optional): { fill, aim: [x, y], center: [cx, cy], yaw, x0 }
 *   fill    object height as a fraction of the canvas height (default: 230 px at any size)
 *   aim     world point at the optical centre (default [0, 0.95], leaves headroom for the hop)
 *   center  where that point sits in the canvas, 0..1 (default [0.5, 0.5]; a lens shift)
 *   yaw     resting turn in degrees (default -20: three-quarter view toward the key)
 *   x0      resting x before the hop (default -0.6; the hop ends at about +0.6)
 */
export function createHero(canvas, { variant = "directed", width = 1080, height = 620, seed = 1, framing = {} } = {}) {
  const rand = mulberry32(seed * 2654435761 + 1013904223);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.autoClear = false;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, width / height, 0.05, 200);
  const dim = overlay();
  const dimQuad = screenQuad(new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false }));
  dimQuad.position.set(0.5, 0.5, 0);
  dim.scene.add(dimQuad);

  const { slab, triangle } = markGeometry();
  const look = variant === "default" ? buildDefault() : buildDirected();
  let size = { width, height };
  setSize(width, height);

  function setSize(w, h) {
    size = { width: w, height: h };
    renderer.setSize(w, h);
    look.resize?.(w, h);
  }

  function render(t, state = {}) {
    renderer.setRenderTarget(null);
    renderer.clear();
    look.draw(t, state);
    const d = clamp(state.dim ?? 0);
    if (d > 0) {
      dimQuad.material.opacity = 0.62 * d;
      renderer.render(dim.scene, dim.camera);
    }
  }

  // ======== directed: the warm studio ========
  function buildDirected() {
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 0.86; // keeps the white face below Neutral's highlight shoulder
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    scene.background = new THREE.Color(0xecebe7);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(studioEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.38;
    pmrem.dispose();

    // Cyclorama in #ECEBE7 (albedo tuned so the backdrop near the object renders as #ECEBE7).
    const cycMat = softShadows(new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(...CYC_ALBEDO, THREE.SRGBColorSpace), roughness: 1, metalness: 0, envMapIntensity: 0.5, dithering: true }), cycFalloff, "-cyc");
    cycMat.toneMapped = false; // exact backdrop colour; the object alone goes through tone mapping
    const cyc = new THREE.Mesh(cycGeometry(), cycMat);
    cyc.receiveShadow = true;
    scene.add(cyc);

    // Satin ceramic.
    const glaze = glazeTextures(rand);
    const ceramic = (hex) => softShadows(new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(hex), roughness: 0.4, roughnessMap: glaze.roughness, metalness: 0,
      clearcoat: 1, clearcoatRoughness: 0.15, clearcoatNormalMap: glaze.normal, clearcoatNormalScale: new THREE.Vector2(0.05, 0.05),
      ior: 1.5, specularIntensity: 0.5, envMapIntensity: 1.5, dithering: true,
    }));
    const bodyMat = ceramic(0xf2f0ec);
    const faceMat = ceramic(0x2f55e0);

    const root = new THREE.Group(), pivot = new THREE.Group(), body = new THREE.Group();
    const slabMesh = new THREE.Mesh(slab, bodyMat), triMesh = new THREE.Mesh(triangle, faceMat);
    for (const m of [slabMesh, triMesh]) { m.castShadow = true; m.receiveShadow = true; body.add(m); }
    pivot.add(body);
    root.add(pivot);
    scene.add(root);

    // Contact shadow: a tight occlusion core and a soft penumbra that spreads and fades with height.
    const shadowTint = new THREE.Color().setRGB(0.24, 0.2, 0.16, THREE.SRGBColorSpace);
    const contact = (planeW, planeD, footW, footD, blur) => {
      const mat = new THREE.MeshBasicMaterial({ map: footprintTexture(planeW, planeD, footW, footD, blur), color: shadowTint, transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(planeW, planeD).rotateX(-Math.PI / 2), mat);
      m.renderOrder = 1;
      scene.add(m);
      return m;
    };
    const core = contact(1.6, 1.0, 0.92, 0.36, 0.06);
    const soft = contact(3.2, 2.2, 1.0, 0.34, 0.24);

    // Lights: warm key from upper left with soft shadows, cool fill, rim from behind.
    // Inverse-square falloff (decay 2) with 2.4 measured at the object: the face grades from its
    // upper-left corner, and the backdrop falls off behind the subject.
    const keyTarget = new THREE.Vector3(0, 0.5, 0);
    const key = new THREE.SpotLight(0xfff4ea, 2.4 * KEY_POS.distanceToSquared(keyTarget), 0, 45 * DEG, 1, 2);
    key.position.copy(KEY_POS);
    key.target.position.copy(keyTarget);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 3;
    key.shadow.camera.far = 18;
    key.shadow.bias = -0.0002;
    key.shadow.normalBias = 0.012;
    key.shadow.radius = 14;
    key.shadow.intensity = 0.7;
    const fill = new THREE.DirectionalLight(0xd3e0ff, 0.6);
    fill.position.set(4.5, 1.8, 3.0);
    // Low and behind, so the beam that passes the object grazes the floor instead of pooling on it.
    const rim = new THREE.SpotLight(0xf4f1ff, 2.6, 0, 14 * DEG, 0.8, 0);
    rim.position.copy(RIM_POS);
    rim.target.position.set(0, 0.7, 0);
    // Background light: a soft wash on the cove and wall, so the backdrop falls off gently.
    const wash = new THREE.SpotLight(0xfff8f0, 1.1, 0, 55 * DEG, 1, 0);
    wash.position.set(0.5, 7, 1.5);
    wash.target.position.set(0, 1.5, -4.6);
    scene.add(key, key.target, fill, rim, rim.target, wash, wash.target);

    // Camera: FOV 40°, three-quarter elevation, a slow drift and an optional push-in.
    const ph = [rand() * TAU, rand() * TAU, rand() * TAU, rand() * TAU];
    const cfg = { x0: framing.x0 ?? -0.6, yaw: framing.yaw ?? -20, landX: 0, dropFrom: 3 };
    const aim0 = framing.aim ?? [0, 0.95];
    const center = framing.center ?? [0.5, 0.5];
    const elevation = 12 * DEG;
    let base = { dist: 4, V: 2.9 };

    function frame(w, h) {
      const fill = framing.fill ?? 230 / h;
      const V = 1 / fill; // world units visible vertically at the aim point
      base = { dist: V / (2 * Math.tan(20 * DEG)), V };
      // Lens shift: keep the aim point at `center` without tilting the camera.
      const fw = w * (1 + Math.abs(center[0] - 0.5) * 2), fh = h * (1 + Math.abs(center[1] - 0.5) * 2);
      camera.aspect = fw / fh;
      if (fw !== w || fh !== h) {
        camera.fov = (2 * Math.atan(Math.tan(20 * DEG) * (fh / h))) / DEG;
        camera.setViewOffset(fw, fh, center[0] < 0.5 ? fw - w : 0, center[1] < 0.5 ? fh - h : 0, w, h);
      } else {
        camera.fov = 40;
        camera.clearViewOffset();
      }
      camera.updateProjectionMatrix();
      // Start the drop with the base fully above the frame.
      placeCamera(0, {});
      camera.updateMatrixWorld();
      const ray = new THREE.Vector3(0, 1, 0.5).unproject(camera).sub(camera.position).normalize();
      const s = -camera.position.z / ray.z;
      cfg.dropFrom = Math.max(2.4, camera.position.y + ray.y * s + 0.35);
    }

    function placeCamera(t, state) {
      // The push-in closes 16% of the distance and re-aims at the object's centre (halfway in x),
      // taken where the object is when the push starts, so the aim never jumps.
      const push = Number.isFinite(state.push) ? inOutCubic((t - state.push) / 0.9) : 0;
      const pushX = push > 0 ? heroPose(state.push, state, cfg).x * 0.5 : 0;
      // Drift: the aim wanders about 0.5% of the frame and the camera orbits under a degree.
      const ax = lerp(aim0[0], pushX, push) + base.V * 0.006 * Math.sin((TAU * t) / 12 + ph[0]);
      const ay = lerp(aim0[1], 0.55, push) + base.V * 0.004 * Math.sin((TAU * t) / 15 + ph[1]);
      const az = 0.8 * DEG * Math.sin((TAU * t) / 14 + ph[2]);
      const el = elevation + 0.35 * DEG * Math.sin((TAU * t) / 17 + ph[3]);
      const d = base.dist * (1 - 0.16 * push);
      camera.position.set(ax + d * Math.sin(az) * Math.cos(el), ay + d * Math.sin(el), d * Math.cos(az) * Math.cos(el));
      camera.lookAt(ax, ay, 0);
    }

    const corner = (MARK.width / 2 - MARK.radius); // x of the corner arcs' centres
    function draw(t, state) {
      const p = heroPose(t, state, cfg);
      if (Number.isFinite(state.yaw)) p.yaw = state.yaw;
      root.visible = core.visible = soft.visible = p.visible;
      // Roll on the corner arc in contact: pivot at that arc's centre (radius 0.22).
      const tilt = p.tilt * DEG;
      const cx = Math.sign(tilt) * corner * p.sxz;
      const cy = MARK.radius * p.sy;
      root.position.set(p.x, 0, p.z);
      root.rotation.set(0, p.yaw * DEG, 0);
      pivot.position.set(cx, cy + p.y, 0);
      pivot.rotation.set(0, 0, -tilt);
      body.position.set(-cx, -cy, 0);
      body.scale.set(p.sxz, p.sy, p.sxz);

      // Contact shadow: tight and dark at contact, wider and fainter with height.
      const h = p.y;
      const shift = Math.sin(Math.abs(tilt)) * Math.sign(tilt) * 0.35;
      for (const m of [core, soft]) {
        m.position.set(p.x + shift * Math.cos(p.yaw * DEG), 0.002, p.z - shift * Math.sin(p.yaw * DEG));
        m.rotation.set(0, p.yaw * DEG, 0);
      }
      core.scale.set(p.sxz * (1 + h * 2), 1, 1 + h * 2);
      core.material.opacity = 0.7 * Math.exp(-h / 0.06);
      const spread = 1 + 1.3 * h;
      soft.scale.set(p.sxz * spread, 1, spread);
      soft.material.opacity = 0.5 / (1 + 1.6 * h) ** 2;

      placeCamera(t, state);
      renderer.render(scene, camera);
    }

    return { draw, resize: frame, cfg };
  }

  // ======== default: the AI look, on purpose ========
  function buildDefault() {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    // Navy-to-purple space with a soft centre glow, dithered against banding.
    const bg = overlay();
    const bgMat = new THREE.ShaderMaterial({
      depthTest: false, depthWrite: false,
      uniforms: { uAspect: { value: width / height } },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `
        uniform float uAspect; varying vec2 vUv;
        void main() {
          vec3 top = vec3(0.035, 0.05, 0.16), bot = vec3(0.19, 0.06, 0.33);
          vec3 c = mix(bot, top, smoothstep(0.0, 1.0, vUv.y));
          vec2 q = (vUv - vec2(0.5, 0.52)) * vec2(uAspect, 1.0);
          float d = length(q);
          c += vec3(0.22, 0.12, 0.5) * exp(-d * d * 7.0) * 0.55;
          c *= 1.0 - 0.4 * smoothstep(0.35, 1.2, d);
          float n = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
          gl_FragColor = vec4(c + (n - 0.5) / 255.0, 1.0);
        }`,
    });
    const bgQuad = screenQuad(bgMat);
    bgQuad.position.set(0.5, 0.5, 0);
    bg.scene.add(bgQuad);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(neonEnvironment(), 0.03).texture;
    scene.environmentIntensity = 1.0;
    pmrem.dispose();

    const glass = new THREE.MeshPhysicalMaterial({
      color: 0x5a46ff, metalness: 0.25, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.04,
      iridescence: 0.8, iridescenceIOR: 1.7, iridescenceThicknessRange: [180, 520],
      emissive: 0x2a1580, emissiveIntensity: 0.5,
    });
    const neonFace = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x8fefff, emissiveIntensity: 2.6, roughness: 0.3 });
    const obj = new THREE.Group();
    const inner = new THREE.Group();
    inner.position.y = -MARK.height / 2;
    inner.add(new THREE.Mesh(slab, glass), new THREE.Mesh(triangle, neonFace));
    obj.add(inner);
    scene.add(obj);

    const keyL = new THREE.PointLight(0xff4fd8, 14, 0, 2);
    keyL.position.set(-2.6, 1.4, 2.2);
    const keyR = new THREE.PointLight(0x3fe6ff, 12, 0, 2);
    keyR.position.set(2.6, -0.6, 2.2);
    const top = new THREE.DirectionalLight(0xffffff, 0.8);
    top.position.set(0, 3, 2);
    scene.add(keyL, keyR, top);

    // Halo ring: an emissive torus plus additive glow sprites behind it.
    const halo = new THREE.Group();
    halo.position.z = -0.65;
    const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(1.6, 1.9, 3.2) });
    halo.add(new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.016, 24, 200), ringMat));
    const glowTex = (inner0, mid, outer, stops) => canvasTexture(512, 512, (g, w) => {
      const gr = g.createRadialGradient(w / 2, w / 2, inner0 * w / 2, w / 2, w / 2, outer * w / 2);
      for (const [o, c] of stops) gr.addColorStop(o, c);
      g.fillStyle = gr;
      g.fillRect(0, 0, w, w);
    });
    const additive = (map, opacity = 1) => new THREE.MeshBasicMaterial({ map, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const ringGlow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), additive(glowTex(0, 0, 1, [
      [0.0, "rgba(0,0,0,0)"], [0.48, "rgba(40,30,160,0)"], [0.585, "rgba(120,170,255,0.75)"], [0.6, "rgba(190,220,255,0.95)"],
      [0.615, "rgba(150,110,255,0.7)"], [0.75, "rgba(90,40,200,0.12)"], [1.0, "rgba(0,0,0,0)"],
    ])));
    ringGlow.position.z = -0.01;
    halo.add(ringGlow);
    const backGlow = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 6.5), additive(glowTex(0, 0, 1, [
      [0, "rgba(140,90,255,0.55)"], [0.25, "rgba(90,50,220,0.28)"], [0.6, "rgba(40,20,120,0.08)"], [1, "rgba(0,0,0,0)"],
    ])));
    backGlow.position.z = -0.4;
    halo.add(backGlow);
    scene.add(halo);

    // 150 seeded particles drifting upward with a slow sway and twinkle.
    const N = 150;
    const box = { min: new THREE.Vector3(-4.2, -2.6, -3.5), size: new THREE.Vector3(8.4, 5.2, 5.2) };
    const seedPos = new Float32Array(N * 3), params = new Float32Array(N * 4);
    for (let i = 0; i < N; i++) {
      seedPos.set([box.min.x + rand() * box.size.x, box.min.y + rand() * box.size.y, box.min.z + rand() * box.size.z], i * 3);
      params.set([0.08 + rand() * 0.16, 1.6 + rand() ** 2 * 4.5, rand(), rand()], i * 4);
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.BufferAttribute(seedPos, 3));
    pg.setAttribute("aParams", new THREE.BufferAttribute(params, 4));
    const pMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uScale: { value: 1 }, uMin: { value: box.min }, uSize: { value: box.size } },
      vertexShader: `
        attribute vec4 aParams; uniform float uTime, uScale; uniform vec3 uMin, uSize;
        varying float vAlpha; varying vec3 vColor;
        void main() {
          vec3 p = position;
          p.y = uMin.y + mod(p.y - uMin.y + aParams.x * uTime, uSize.y);
          p.x += 0.18 * sin(uTime * 0.35 + aParams.z * 6.2831);
          p.z += 0.12 * cos(uTime * 0.27 + aParams.z * 12.566);
          float e = (p.y - uMin.y) / uSize.y;
          vAlpha = smoothstep(0.0, 0.12, e) * smoothstep(1.0, 0.88, e) * (0.6 + 0.4 * sin(uTime * 1.1 + aParams.z * 40.0));
          vColor = mix(mix(vec3(0.45, 0.85, 1.0), vec3(1.0, 0.45, 0.95), step(0.5, aParams.w)), vec3(1.0), step(0.82, aParams.w));
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = aParams.y * uScale * (4.2 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying float vAlpha; varying vec3 vColor;
        void main() {
          float r = length(gl_PointCoord - 0.5) * 2.0;
          float a = exp(-r * r * 4.0) + 0.6 * exp(-r * r * 40.0);
          gl_FragColor = vec4(vColor * a * vAlpha, 1.0);
        }`,
    });
    const points = new THREE.Points(pg, pMat);
    points.frustumCulled = false;
    scene.add(points);

    // Lens flare and a star glint, drawn in screen space (pixels) over the scene.
    const fl = overlay();
    const sprite = (map, color) => {
      const m = screenQuad(new THREE.MeshBasicMaterial({ map, color, transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, toneMapped: false }));
      fl.scene.add(m);
      return m;
    };
    const soft = canvasTexture(256, 256, (g, w) => {
      const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.18, "rgba(255,255,255,0.45)"); gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr; g.fillRect(0, 0, w, w);
    });
    const ghostRing = canvasTexture(256, 256, (g, w) => {
      const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      gr.addColorStop(0, "rgba(255,255,255,0.12)"); gr.addColorStop(0.78, "rgba(255,255,255,0.18)"); gr.addColorStop(0.9, "rgba(255,255,255,0.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr; g.fillRect(0, 0, w, w);
    });
    const streak = canvasTexture(512, 64, (g, w, h) => {
      const gx = g.createLinearGradient(0, 0, w, 0);
      gx.addColorStop(0, "rgba(255,255,255,0)"); gx.addColorStop(0.5, "rgba(255,255,255,1)"); gx.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gx;
      for (let y = 0; y < h; y++) { g.globalAlpha = Math.exp(-(((y - h / 2) / (h * 0.09)) ** 2)); g.fillRect(0, y, w, 1); }
    });
    const star = canvasTexture(256, 256, (g, w) => {
      g.translate(w / 2, w / 2);
      for (const [rot, len] of [[0, 1], [Math.PI / 2, 1], [Math.PI / 4, 0.45], [-Math.PI / 4, 0.45]]) {
        g.save(); g.rotate(rot);
        const gr = g.createLinearGradient(-w / 2 * len, 0, w / 2 * len, 0);
        gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.5, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = gr; g.fillRect(-w / 2 * len, -2.5, w * len, 5); g.restore();
      }
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, w * 0.2);
      gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr; g.fillRect(-w / 2, -w / 2, w, w);
    });
    const flareSrc = sprite(soft, new THREE.Color(0.75, 0.85, 1.0));
    const flareStreak = sprite(streak, new THREE.Color(0.45, 0.6, 1.0));
    const ghosts = [
      [0.42, 70, [0.55, 0.35, 1.0], 0.35], [0.7, 38, [0.3, 1.0, 0.8], 0.4], [1.18, 120, [0.9, 0.4, 1.0], 0.22],
      [1.45, 54, [0.4, 0.7, 1.0], 0.35], [1.72, 180, [0.5, 0.3, 0.9], 0.14],
    ].map(([k, s, c, a]) => ({ k, s, a, m: sprite(ghostRing, new THREE.Color(...c)) }));
    const glint = sprite(star, new THREE.Color(1, 0.95, 1));

    const v = new THREE.Vector3();
    let sz = { w: width, h: height };
    function resize(w, h) {
      sz = { w, h };
      camera.aspect = w / h;
      camera.fov = 40;
      const V = 1 / (230 / h);
      camera.position.set(0, 0.12, V / (2 * Math.tan(20 * DEG)));
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      bgMat.uniforms.uAspect.value = w / h;
      pMat.uniforms.uScale.value = renderer.getPixelRatio() * (h / 620) * 6;
      for (const o of [bg, fl]) { o.camera.right = w; o.camera.top = h; o.camera.updateProjectionMatrix(); }
      bgQuad.scale.set(w, h, 1);
      bgQuad.position.set(w / 2, h / 2, 0);
      dimQuad.scale.set(1, 1, 1);
    }

    function draw(t, state) {
      // Turntable at a constant 45°/s, with the usual float.
      const yaw = 25 * DEG + 45 * DEG * t;
      obj.rotation.set(0, yaw, 0);
      obj.position.set(0, 0.05 * Math.sin((TAU * t) / 3.2), 0);
      halo.rotation.z = 0.15 * t;
      ringMat.color.setRGB(1.6, 1.9, 3.2).multiplyScalar(0.85 + 0.15 * Math.sin(TAU * t / 2.4));
      pMat.uniforms.uTime.value = t;

      renderer.render(bg.scene, bg.camera);
      renderer.render(scene, camera);

      // Flare from a light at the upper right, ghosts along the line through the centre.
      const { w, h } = sz;
      const sx = w * 0.84, sy = h * 0.8, cx = w / 2, cy = h / 2;
      const pulse = 0.8 + 0.2 * Math.sin(TAU * t / 3.0);
      flareSrc.position.set(sx, sy, 0); flareSrc.scale.set(h * 0.55, h * 0.55, 1); flareSrc.material.opacity = 0.55 * pulse;
      flareStreak.position.set(sx, sy, 0); flareStreak.scale.set(w * 1.1, h * 0.06, 1); flareStreak.material.opacity = 0.6 * pulse;
      for (const g of ghosts) {
        g.m.position.set(sx + (cx - sx) * g.k, sy + (cy - sy) * g.k, 0);
        g.m.scale.set(g.s * h / 620, g.s * h / 620, 1);
        g.m.material.opacity = g.a * pulse;
      }
      // A star glint on the top corner each time a face sweeps past the light (every 4 s).
      const face = Math.abs(Math.cos(yaw - 20 * DEG)) ** 40;
      obj.updateMatrixWorld();
      v.set(MARK.width / 2 - 0.08, MARK.height / 2 - 0.08, MARK.depth / 2).applyMatrix4(obj.matrixWorld).project(camera);
      glint.position.set((v.x * 0.5 + 0.5) * w, (v.y * 0.5 + 0.5) * h, 0);
      glint.scale.set(h * 0.32 * (0.6 + 0.4 * face), h * 0.32 * (0.6 + 0.4 * face), 1);
      glint.rotation.z = 0.3 * t;
      glint.material.opacity = face;
      renderer.render(fl.scene, fl.camera);
    }

    return { draw, resize };
  }

  return {
    render,
    setSize,
    pose: (t, state = {}) => (variant === "default" ? null : heroPose(t, state, look.cfg)),
    camera,
    get size() { return size; },
    dispose() {
      renderer.dispose();
      scene.traverse((o) => { o.geometry?.dispose?.(); });
    },
  };
}
