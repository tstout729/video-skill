#!/usr/bin/env node
// Review a draft the way an animator does: a contact sheet, an onion skin, a speed graph
// and a hold check. The first three each write one labeled PNG; holds prints text.
//
//   node review.mjs sheet <page.html|video.mp4> --out sheet.png [--frames 12 | --at 1.5,3,4.2 | --at stills]
//                         [--from t] [--to t] [--cols 4] [--fps 60] [--scenes ...] [--debug]
//   node review.mjs onion <page.html|video.mp4> --from t0 --to t1 --out onion.png [--count 8] [--fps 60]
//   node review.mjs graph <page.html> --select "#card" --from t0 --to t1 --out graph.png
//                         [--prop x|y|both|scale|opacity] [--fps 60]
//   node review.mjs holds <video.mp4> [--min 1.5] [--scenes words.js | scenes.json | 0,10.3,24.7]
//   node review.mjs audit <page.html> [--fps 60] [--every 1]
//
// sheet  Frames spread evenly from --from to --to (default: the whole video), or the given
//        times, in one grid. Each cell shows its frame number and time and, for a page, the
//        scene (window.SCENES) and the latest cue (window.CUE_TIMES), else the words being
//        spoken (window.WORDS) or the beat (window.BEATS). Read it like a storyboard: one idea
//        per cell, nothing clipped, nothing the narration contradicts. --at stills uses the
//        page's VIDEO.stills. --scenes (as for holds) labels a video's scenes too.
// onion  --count frames from t0 to t1 laid over one picture, later frames stronger. Parts that
//        do not move stay sharp. Even spacing means linear motion; spacing that tightens as a
//        shape reaches its pose means it eases in.
// graph  Page only. Samples the element each frame as the viewer sees it, camera included:
//        the center of its bounding box (x, y, both), its size relative to the first frame
//        (scale), or its opacity times its parents' (opacity). Value per frame on top, speed
//        (change per frame) below, with the peak and the frame where the motion settles (speed
//        under 0.5% of its range), plus a printed summary. A hard start or stop is a jump of
//        more than 40% of peak speed within one frame at either end of a move that also
//        reaches 80% of peak within two frames: a linear move, an ease-out start or a cut.
//        Springs and eased moves pass.
// holds  ffmpeg freezedetect (fps=10, scale=480, n=0.002, d=0.6): each still stretch of 0.6 s
//        or more. With --scenes, a scene with no hold of --min seconds prints TOO FAST. A scene
//        runs from its start to the next scene's start. Exits 0 once the video has been read.
// audit  Page only. Runs the checks the page declared with check() from motion.js (the brief's
//        numbers as tests: "caption band stays clear", "card settled by f1167") on every frame
//        each one names (--every n checks every nth frame of a range). Prints PASS or FAIL per
//        check with its failing frames, and exits 1 if any check fails.
//
// Frames are numbered as render.mjs renders them: frame n of a page is window.seek(n / fps)
// (--fps, default 60); a video uses its own frame rate and an exact ffmpeg seek. --debug opens
// the page with ?debug=1. Labels are drawn in Chromium, so ffmpeg needs no drawtext.

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SKILL, serve, launch, openVideoPage, shot } from "./page.mjs";

const FONT = path.join(SKILL, "assets/fonts/geist-latin-wght-normal.woff2");
const MAX_SHEET_WIDTH = 2400;

// ---------- arguments ----------

const COMMANDS = {
  sheet: ["out", "frames", "at", "from", "to", "cols", "fps", "scenes", "debug"],
  onion: ["out", "from", "to", "count", "fps", "debug"],
  graph: ["out", "select", "from", "to", "prop", "fps", "debug"],
  holds: ["min", "scenes"],
  audit: ["fps", "every", "debug"],
};
const FLAGS = new Set(["debug"]);

class UsageError extends Error {}
const fail = (msg) => { throw new UsageError(msg); };

function usage() {
  const out = [];
  for (const line of fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1)) {
    if (!line.startsWith("//")) break;
    out.push(line.replace(/^\/\/ ?/, ""));
  }
  return out.join("\n");
}

function parseArgs(argv) {
  const pos = [], o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) { pos.push(a); continue; }
    const name = a.slice(2);
    if (FLAGS.has(name)) { o[name] = true; continue; }
    if (!Object.values(COMMANDS).flat().includes(name)) fail(`unknown option ${a}`);
    if (i + 1 >= argv.length) fail(`${a} needs a value`);
    o[name] = argv[++i];
  }
  return { pos, o };
}

function numOpt(o, name, dflt, { min = -Infinity, max = Infinity, int = false } = {}) {
  if (o[name] === undefined) return dflt;
  const v = Number(o[name]);
  if (o[name] === "" || !Number.isFinite(v) || (int && !Number.isInteger(v)) || v < min || v > max) {
    const range = Number.isFinite(max) ? ` from ${min} to ${max}` : Number.isFinite(min) ? ` of at least ${min}` : "";
    fail(`--${name} must be ${int ? "a whole number" : "a number"}${range}, not ${JSON.stringify(o[name])}`);
  }
  return v;
}

function outPath(o) {
  if (!o.out) fail("--out <file.png> is required");
  if (!/\.(png|jpe?g)$/i.test(o.out)) fail(`--out must end in .png or .jpg, not ${JSON.stringify(o.out)}`);
  return path.resolve(o.out);
}

// ---------- processes ----------

function run(cmd, args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: [input ? "pipe" : "ignore", "pipe", "pipe"] });
    const out = [], err = [];
    child.stdout.on("data", (d) => out.push(d));
    child.stderr.on("data", (d) => err.push(d));
    child.on("error", (e) => reject(e.code === "ENOENT" ? new UsageError(`${cmd} not found; install ffmpeg (it includes ffprobe)`) : e));
    child.on("close", (code) => resolve({ code, stdout: Buffer.concat(out), stderr: Buffer.concat(err).toString() }));
    if (input) child.stdin.end(input);
  });
}

async function pool(items, n, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length) { const k = next++; out[k] = await fn(items[k], k); }
  }));
  return out;
}

// ---------- frame sources: a page (exact seeks) or a video file (exact ffmpeg seeks) ----------

const isPagePath = (file) => /\.html?$/i.test(file);

async function probeVideo(file) {
  const { code, stdout, stderr } = await run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries",
    "stream=width,height,r_frame_rate,avg_frame_rate,nb_frames,start_time:format=duration,start_time", "-of", "json", file]);
  let info = {};
  try { info = JSON.parse(stdout.toString()); } catch {}
  const s = info.streams?.[0];
  if (code || !s) fail(`${path.basename(file)} is not a video ffmpeg can read${stderr.trim() ? ` (${stderr.trim().split("\n")[0]})` : ""}`);
  const rate = (r) => { const [a, b] = String(r || "0/1").split("/").map(Number); return b ? a / b : 0; };
  const fps = rate(s.r_frame_rate) || rate(s.avg_frame_rate);
  const duration = Number(info.format?.duration);
  if (!fps || !Number.isFinite(duration)) fail(`could not read the frame rate and length of ${path.basename(file)}`);
  // Frame n shows at start + n / fps. (A Manim render's video starts one frame in.)
  const start = Math.max(0, (Number(s.start_time) || 0) - (Number(info.format?.start_time) || 0));
  const count = Number(s.nb_frames) || Math.round((duration - start) * fps);
  return { width: s.width, height: s.height, fps, duration, start, count };
}

// Downscale a PNG with lanczos, which keeps small text crisper than the browser's scaler.
async function scalePng(png, width) {
  const { code, stdout, stderr } = await run("ffmpeg", ["-v", "error", "-f", "png_pipe", "-i", "-",
    "-vf", `scale=${width}:-2:flags=lanczos`, "-f", "image2pipe", "-c:v", "png", "-"], png);
  if (code || !stdout.length) throw new Error(`ffmpeg could not scale a frame: ${stderr.trim()}`);
  return stdout;
}

// Opens the input. Both kinds need the browser: it renders a page's frames and draws every label.
// Returns {kind, name, width, height, fps, count, timeOf(n), frameOf(t), grab(frames, width), meta, page, browser}.
async function openSource(file, o) {
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) fail(`no such file: ${file}`);
  const closers = [];
  // Closing Chromium can take half a minute on a loaded machine. Wait at most 5 s: Playwright
  // kills the browser it launched when this process exits anyway.
  const settle = (promise) => Promise.race([promise.catch(() => {}), new Promise((r) => setTimeout(r, 5000).unref())]);
  const src = { file, close: async () => { for (const f of closers.reverse()) await settle(f()); } };
  try {
    if (isPagePath(file)) {
      const fps = numOpt(o, "fps", 60, { min: 1, max: 240 });
      const { server, url } = await serve(file);
      closers.push(async () => server.close());
      src.browser = await launch();
      closers.push(() => src.browser.close());
      const { p, video } = await openVideoPage(src.browser, url, { query: o.debug ? "debug=1" : "" });
      const meta = await p.evaluate(() => ({
        scenes: window.SCENES ?? null,
        cues: Array.isArray(window.CUE_TIMES) ? window.CUE_TIMES : null,
        words: Array.isArray(window.WORDS) ? window.WORDS : null,
        beats: window.BEATS && Number.isFinite(window.BEATS.bpm) ? { bpm: window.BEATS.bpm, first: window.BEATS.first ?? 0 } : null,
      }));
      Object.assign(src, {
        kind: "page", name: `${path.basename(path.dirname(file))} / ${path.basename(file)}`, page: p, video,
        width: video.width, height: video.height, fps, duration: video.duration,
        count: Math.max(1, Math.round(video.duration * fps)),   // render.mjs renders frames 0..count-1
        meta: { ...meta, scenes: normScenes(meta.scenes), stills: video.stills ?? null },
        timeOf: (n) => n / fps,
        frameOf: (t) => Math.round(t * fps),
        async grab(frames, width) {
          const pngs = [];
          for (const n of frames) pngs.push(await shot(p, n / fps, { type: "png" }));
          return width && width < video.width ? pool(pngs, 4, (png) => scalePng(png, width)) : pngs;
        },
      });
    } else {
      const v = await probeVideo(file);
      src.browser = await launch();
      closers.push(() => src.browser.close());
      Object.assign(src, {
        kind: "video", name: path.basename(file), ...v, meta: {},
        timeOf: (n) => v.start + n / v.fps,
        frameOf: (t) => Math.round((t - v.start) * v.fps),
        grab: (frames, width) => pool(frames, 4, async (n) => {
          // Half a frame early: the decoder returns the first frame at or after the seek point.
          const ss = Math.max(0, v.start + (n - 0.5) / v.fps);
          const vf = width && width < v.width ? ["-vf", `scale=${width}:-2:flags=lanczos`] : [];
          const { code, stdout, stderr } = await run("ffmpeg", ["-v", "error", "-ss", ss.toFixed(6), "-i", file,
            "-frames:v", "1", ...vf, "-f", "image2pipe", "-c:v", "png", "-"]);
          if (code || !stdout.length) throw new Error(`ffmpeg could not read frame ${n} of ${src.name}: ${stderr.trim()}`);
          return stdout;
        }),
      });
    }
  } catch (e) { await src.close(); throw e; }
  src.last = src.count - 1;
  src.clamp = (n) => Math.min(src.last, Math.max(0, n));
  return src;
}

// The frame range from --from/--to, in frames. Both ends are included.
function frameRange(src, o, { required = false } = {}) {
  if (required && (o.from === undefined || o.to === undefined)) fail("--from and --to (seconds) are required");
  const t0 = numOpt(o, "from", src.timeOf(0), { min: 0 }), t1 = numOpt(o, "to", src.timeOf(src.last), { min: 0 });
  if (t1 <= t0) fail(`--to (${t1}) must be later than --from (${t0})`);
  const end = src.timeOf(src.last);
  if (t0 > end + 1 / src.fps) fail(`--from ${t0} is after the last frame (${end.toFixed(2)} s)`);
  const f0 = src.clamp(src.frameOf(t0)), f1 = src.clamp(src.frameOf(t1));
  if (f1 <= f0) fail(`--from ${t0} and --to ${t1} fall on the same frame at ${fmtFps(src.fps)} fps`);
  return [f0, f1];
}

function spread(f0, f1, n) {
  if (n === 1) return [f0];
  return [...new Set(Array.from({ length: n }, (_, k) => Math.round(f0 + (k * (f1 - f0)) / (n - 1))))];
}

// ---------- scenes and cues ----------

// window.SCENES {id: {start, end}}, an array of {id, start, end}, or {scenes: ...} -> sorted [{id, start, end}].
function normScenes(s) {
  if (!s) return null;
  if (!Array.isArray(s) && Array.isArray(s.scenes)) s = s.scenes;
  const list = Array.isArray(s)
    ? s.map((x, i) => ({ id: String(x.id ?? `s${String(i + 1).padStart(2, "0")}`), start: Number(x.start), end: Number(x.end) }))
    : Object.entries(s).map(([id, x]) => ({ id, start: Number(x?.start), end: Number(x?.end) }));
  const ok = list.filter((x) => Number.isFinite(x.start)).sort((a, b) => a.start - b.start);
  return ok.length ? ok : null;
}

// The scene a moment belongs to: the last one started. The lead-in before the first belongs to it.
function sceneAt(scenes, t) {
  if (!scenes) return null;
  let cur = scenes[0];
  for (const s of scenes) if (s.start <= t + 1e-6) cur = s;
  return cur;
}

function captionAt(meta, t) {
  const cues = meta.cues?.filter((c) => Number.isFinite(c.t)).sort((a, b) => a.t - b.t);
  if (cues?.length) {
    const c = cues.filter((c) => c.t <= t + 1e-6).at(-1);
    return c ? { kind: "Cue", text: `“${c.phrase}”`, extra: `+${(t - c.t).toFixed(2)} s` } : { kind: "Cue", text: "before the first cue" };
  }
  if (meta.words?.length) {
    const said = meta.words.filter((w) => w.start <= t + 0.05 && w.end >= t - 0.9).slice(-5).map((w) => w.word);
    return { kind: "Voice", text: said.length ? `“${said.join(" ")}”` : "pause" };
  }
  if (meta.beats) {
    const b = ((t - meta.beats.first) * meta.beats.bpm) / 60;
    return { kind: "Beat", text: b < -0.05 ? "before the first beat" : b.toFixed(1) };
  }
  return null;
}

// ---------- drawing: compose an HTML page in the same Chromium and screenshot it ----------

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const fmtFps = (fps) => String(+fps.toFixed(3));
const sec = (t) => `${t.toFixed(2)} s`;
const secs = (a, b) => `${a.toFixed(2)}–${b.toFixed(2)} s`;

const BASE_CSS = `
@font-face { font-family: Geist; src: url(/geist.woff2) format("woff2"); font-weight: 100 900; }
:root { --canvas: #F1EFEA; --surface: #FCFCFB; --ink: #1F1E1B; --body: #45413B; --muted: #6F6A62; --faint: #A39D93;
  --line: #E2DED6; --grid: #EAE7E1; --pine: #2F6A57; --pine-soft: #DCE8E1; --x: #2a78d6; --y: #eb6834;
  --good: #0ca30c; --critical: #d03b3b; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html { background: var(--canvas); }
body { padding: 44px 48px 46px; font-family: Geist, system-ui, sans-serif; color: var(--ink);
  -webkit-font-smoothing: antialiased; font-variant-numeric: tabular-nums; }
header { display: flex; justify-content: space-between; align-items: flex-end; gap: 40px; margin-bottom: 30px; }
.eyebrow { font-size: 15px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: var(--pine); }
h1 { margin-top: 10px; font-size: 34px; font-weight: 600; letter-spacing: -0.015em; white-space: nowrap; }
.meta { font-size: 19px; line-height: 1.55; color: var(--muted); text-align: right; white-space: nowrap; }
.meta b { font-weight: 550; color: var(--body); }
.k { font-size: 13px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: var(--faint); }
.frame-img { display: block; border-radius: 8px; background: #fff;
  box-shadow: 0 0 0 1px rgba(31,30,27,0.10), 0 8px 22px -14px rgba(31,30,27,0.35); }
`;

async function compose(browser, { html, width, out, assets = {} }) {
  const ctx = await browser.newContext({ viewport: { width, height: 600 }, deviceScaleFactor: 1 });
  try {
    const p = await ctx.newPage();
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    const files = { "geist.woff2": { body: fs.readFileSync(FONT), type: "font/woff2" }, ...assets };
    await p.route("http://review.invalid/**", (route) => {
      const name = decodeURIComponent(new URL(route.request().url()).pathname.slice(1));
      if (!name) return route.fulfill({ body: html, contentType: "text/html; charset=utf-8" });
      const f = files[name];
      return f ? route.fulfill({ body: f.body, contentType: f.type }) : route.fulfill({ status: 404, body: "" });
    });
    await p.goto("http://review.invalid/");
    await p.evaluate(async () => {
      await document.fonts.load("600 20px Geist");
      await document.fonts.ready;
      await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
      if (window.prepare) await window.prepare();
    });
    if (errors.length) throw new Error(`could not draw the review image: ${errors[0]}`);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const type = /\.jpe?g$/i.test(out) ? "jpeg" : "png";
    await p.screenshot({ path: out, fullPage: true, type, ...(type === "jpeg" ? { quality: 92 } : {}) });
    return await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight]);
  } finally {
    await ctx.close();
  }
}

const pngAssets = (pngs, prefix) =>
  Object.fromEntries(pngs.map((body, i) => [`${prefix}${i}.png`, { body, type: "image/png" }]));

// ---------- sheet ----------

async function sheet(src, o) {
  const out = outPath(o);
  const portrait = src.height > src.width * 1.2;
  const cols = numOpt(o, "cols", portrait ? 6 : 4, { min: 1, max: 12, int: true });
  let frames;
  if (o.at === "stills") {
    if (!src.meta.stills?.length) fail(src.kind === "page" ? "the page has no VIDEO.stills" : "--at stills needs a page");
    frames = src.meta.stills.map((t) => src.clamp(src.frameOf(t)));
  } else if (o.at !== undefined) {
    frames = o.at.split(",").map((s) => s.trim()).filter(Boolean).map((s) => {
      const t = Number(s);
      if (!Number.isFinite(t) || t < 0) fail(`--at must be a list of seconds like 1.5,3,4.2 (or "stills"), not ${JSON.stringify(o.at)}`);
      if (src.frameOf(t) > src.last) fail(`--at ${s} is after the last frame (${sec(src.timeOf(src.last))})`);
      return src.clamp(src.frameOf(t));
    });
    if (!frames.length) fail("--at needs at least one time");
  } else {
    const [f0, f1] = frameRange(src, o);
    frames = spread(f0, f1, numOpt(o, "frames", 12, { min: 1, max: 60, int: true }));
  }
  if (frames.length > 60) fail(`${frames.length} frames is too many for one sheet; use at most 60`);

  const scenes = o.scenes ? await readScenes(o.scenes, src.duration) : src.meta.scenes;
  // Cells are sized for --cols across 2400 px; a sheet with fewer frames is only as wide as they are.
  const pad = 48, gap = 24, used = Math.min(cols, frames.length);
  const cellW = Math.floor((MAX_SHEET_WIDTH - 2 * pad - (cols - 1) * gap) / cols);
  const cellH = Math.round((cellW * src.height) / src.width);
  const pngs = await src.grab(frames, cellW);
  const cells = frames.map((n, i) => {
    const t = src.timeOf(n);
    const scene = sceneAt(scenes, t);
    const cap = captionAt(src.meta, t);
    return `<figure class="cell">
      <img class="frame-img" src="f${i}.png" width="${cellW}" height="${cellH}">
      <figcaption>
        <div class="row1"><span class="k">Frame</span><span class="f">${n}</span><span class="t">${sec(t)}</span>
          ${scene ? `<span class="scene">${esc(scene.id)}</span>` : ""}</div>
        ${cap ? `<div class="row2"><span class="k">${cap.kind}</span><span class="say">${esc(cap.text)}</span>${cap.extra ? `<span class="dt">${cap.extra}</span>` : ""}</div>` : ""}
      </figcaption></figure>`;
  });
  const span = frames.length > 1 ? `frames ${frames[0]}–${frames.at(-1)} · ${secs(src.timeOf(frames[0]), src.timeOf(frames.at(-1)))}` : `frame ${frames[0]}`;
  const width = 2 * pad + used * cellW + (used - 1) * gap;
  const html = `<!doctype html><meta charset="utf-8"><style>${BASE_CSS}
    body { width: ${width}px; }
    .grid { display: grid; grid-template-columns: repeat(${used}, ${cellW}px); gap: 30px ${gap}px; }
    .cell img { width: ${cellW}px; height: ${cellH}px; }
    figcaption { margin-top: 13px; padding: 0 2px; }
    .row1 { display: flex; align-items: baseline; gap: 10px; }
    .row1 .f { font-size: 23px; font-weight: 650; letter-spacing: -0.01em; }
    .row1 .t { margin-left: 6px; font-size: 20px; color: var(--muted); }
    .scene { margin-left: auto; align-self: center; padding: 3px 10px 4px; border-radius: 999px; background: var(--pine-soft);
      color: var(--pine); font-size: 15px; font-weight: 600; letter-spacing: 0.02em; }
    .row2 { margin-top: 6px; display: flex; align-items: baseline; gap: 10px; font-size: 18px; color: var(--body); min-width: 0; }
    .row2 .say { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
    .row2 .dt { flex: none; color: var(--muted); font-size: 16px; }
  </style>
  <header><div><div class="eyebrow">Contact sheet</div><h1>${esc(src.name)}</h1></div>
    <div class="meta"><b>${frames.length} frame${frames.length > 1 ? "s" : ""}</b> · ${span}<br>${fmtFps(src.fps)} fps · ${src.width}×${src.height}${src.kind === "page" ? " · page" : ""}</div></header>
  <main class="grid">${cells.join("")}</main>`;
  const [w, h] = await compose(src.browser, { html, width, out, assets: pngAssets(pngs, "f") });
  const missing = src.kind === "page" && !src.meta.cues?.length && src.meta.words ? " (no cues in window.CUE_TIMES, so cells show the words being spoken)" : "";
  console.log(`sheet: ${frames.length} frames, ${span}${missing}\nwrote ${out}  ${w}x${h}`);
}

// ---------- onion ----------

// Runs in the drawing page. The background is the per-pixel median of the frames, so parts that
// never move stay sharp. Each pixel then shows the frame that differs most from it, weighted so
// later frames are stronger; ghosts never average each other away.
function onionPrepare() {
  const cfg = JSON.parse(document.getElementById("cfg").textContent);
  const { w, h, weights } = cfg;
  const canvas = document.getElementById("onion");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  return (async () => {
    const data = [];
    for (let k = 0; k < weights.length; k++) {
      const img = new Image();
      img.src = `o${k}.png`;
      await img.decode();
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      data.push(ctx.getImageData(0, 0, w, h).data);
    }
    const n = data.length, out = ctx.createImageData(w, h), o = out.data;
    const v = new Uint8Array(n), m = [0, 0, 0];
    const LO = 10, HI = 42;   // a channel difference below LO is noise; above HI it is fully a ghost
    for (let i = 0; i < o.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        for (let k = 0; k < n; k++) {
          const x = data[k][i + c];
          let j = k;
          while (j > 0 && v[j - 1] > x) { v[j] = v[j - 1]; j--; }
          v[j] = x;
        }
        m[c] = n % 2 ? v[(n - 1) >> 1] : (v[n / 2 - 1] + v[n / 2]) / 2;
      }
      let best = -1, alpha = 0;
      for (let k = 0; k < n; k++) {
        const d = data[k];
        const dev = Math.max(Math.abs(d[i] - m[0]), Math.abs(d[i + 1] - m[1]), Math.abs(d[i + 2] - m[2]));
        if (dev <= LO) continue;
        const p = Math.min(1, (dev - LO) / (HI - LO));
        const a = weights[k] * p * p * (3 - 2 * p);
        if (a >= alpha) { alpha = a; best = k; }
      }
      for (let c = 0; c < 3; c++) o[i + c] = best < 0 ? m[c] : m[c] + alpha * (data[best][i + c] - m[c]);
      o[i + 3] = 255;
    }
    ctx.putImageData(out, 0, 0);
  })();
}

async function onion(src, o) {
  const out = outPath(o);
  const [f0, f1Asked] = frameRange(src, o, { required: true });
  // An exact, whole-frame step, so the spacing on screen is the motion's spacing and not rounding.
  const count = Math.min(numOpt(o, "count", 8, { min: 2, max: 24, int: true }), f1Asked - f0 + 1);
  let step = Math.max(1, Math.round((f1Asked - f0) / (count - 1)));
  if (f0 + (count - 1) * step > src.last) step = Math.max(1, Math.floor((src.last - f0) / (count - 1)));
  const frames = Array.from({ length: count }, (_, i) => f0 + i * step);
  const f1 = frames.at(-1);
  // Native size, at most 1920 wide and 1440 tall.
  const k = Math.min(1, 1920 / src.width, 1440 / src.height);
  const w = Math.round(src.width * k / 2) * 2, h = Math.round(src.height * k / 2) * 2;
  const pngs = await src.grab(frames, w < src.width ? w : undefined);
  const weights = frames.map((_, i) => +(0.28 + (0.72 * i) / (frames.length - 1)).toFixed(3));
  const every = `every ${step} frame${step > 1 ? "s" : ""} (${sec(step / src.fps)})`;
  const chips = frames.map((f, i) => `<div class="chip"><i style="opacity:${weights[i]}"></i><span>${f}</span></div>`).join("");
  const html = `<!doctype html><meta charset="utf-8"><style>${BASE_CSS}
    body { width: ${w + 96}px; }
    canvas { width: ${w}px; height: ${h}px; }
    footer { margin-top: 26px; display: flex; flex-wrap: wrap; align-items: center; gap: 14px 18px; }
    .chips { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 16px; }
    .chip { display: flex; align-items: center; gap: 8px; font-size: 18px; font-weight: 550; color: var(--body); }
    .chip i { width: 22px; height: 22px; border-radius: 6px; background: var(--ink); }
    .note { margin-left: auto; font-size: 18px; color: var(--muted); }
  </style>
  <header><div><div class="eyebrow">Onion skin</div><h1>${esc(src.name)}</h1></div>
    <div class="meta"><b>${frames.length} frames</b> · frames ${f0}–${f1} · ${secs(src.timeOf(f0), src.timeOf(f1))}<br>${every} · ${fmtFps(src.fps)} fps</div></header>
  <canvas id="onion" class="frame-img" width="${w}" height="${h}"></canvas>
  <footer><span class="k">Earlier</span><div class="chips">${chips}</div><span class="k">Later</span>
    <span class="note">Even spacing reads as linear. Spacing that tightens into a pose reads as easing.</span></footer>
  <script id="cfg" type="application/json">${JSON.stringify({ w, h, weights })}</script>
  <script>window.prepare = ${onionPrepare.toString()};</script>`;
  const [ow, oh] = await compose(src.browser, { html, width: w + 96, out, assets: pngAssets(pngs, "o") });
  console.log(`onion: ${frames.length} frames ${frames.join(", ")} (${every})\nwrote ${out}  ${ow}x${oh}`);
}

// ---------- graph ----------

const PROPS = ["x", "y", "both", "scale", "opacity"];

function niceStep(span, target) {
  const raw = span / target, p = 10 ** Math.floor(Math.log10(raw)), m = raw / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
}
function niceAxis(lo, hi, target = 5) {
  if (!(hi > lo)) { const d = Math.abs(lo) * 0.1 || 1; lo -= d; hi += d; }
  const step = niceStep(hi - lo, target);
  const a = Math.floor(lo / step + 1e-9) * step, b = Math.ceil(hi / step - 1e-9) * step;
  const ticks = [];
  for (let v = a; v <= b + step / 2; v += step) ticks.push(+v.toFixed(10));
  return { lo: a, hi: b, ticks, step };
}
// The fewest decimals that show every tick of this step exactly (2.5 -> 1, 0.025 -> 3).
const decimals = (step) => [0, 1, 2, 3, 4].find((d) => Math.abs(step * 10 ** d - Math.round(step * 10 ** d)) < 1e-6) ?? 4;
const signed = (v, d) => (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(d);
const plain = (v, d) => (v < 0 ? "−" : "") + Math.abs(v).toFixed(d);

// Moves are runs of frames whose speed is at or above the settle threshold; short dips (a spring's
// turnaround) do not split a move. Each move: a = last still frame, b = first settled frame.
function findMoves(S, thr, gapMax) {
  const runs = [];
  for (let i = 0; i < S.length; i++) {
    if (!(S[i] >= thr)) continue;
    let j = i;
    while (j + 1 < S.length && S[j + 1] >= thr) j++;
    const prev = runs.at(-1);
    if (prev && i - prev[1] - 1 <= gapMax) prev[1] = j; else runs.push([i, j]);
    i = j;
  }
  return runs.map(([i, j]) => {
    let peak = i;
    for (let k = i; k <= j; k++) if (S[k] > S[peak]) peak = k;
    const P = S[peak];
    const at = (k) => (Number.isFinite(S[k]) ? S[k] : 0);
    // Start: the speed jumps from rest within one frame (checked over two, since a move can begin
    // between frames) and reaches most of its peak within two frames.
    const jumpIn = Math.max(at(i) - at(i - 1), j > i ? at(i + 1) - at(i) : 0) / P;
    const reachIn = Math.max(at(i), j > i ? at(i + 1) : 0) / P;
    const jumpOut = Math.max(at(j) - at(j + 1), j > i ? at(j - 1) - at(j) : 0) / P;
    const reachOut = Math.max(at(j), j > i ? at(j - 1) : 0) / P;
    return {
      i, j, peak, P, a: i - 1, b: j,
      openStart: i === 0, openEnd: j === S.length - 1,
      hardStart: jumpIn > 0.4 && reachIn >= 0.8, hardStop: jumpOut > 0.4 && reachOut >= 0.8, jumpIn, jumpOut,
    };
  });
}

async function graph(src, o) {
  if (src.kind !== "page") fail("graph reads the element from the page's DOM, so it needs the page (.html), not a video");
  const out = outPath(o);
  if (!o.select) fail('--select "<css selector>" is required');
  const prop = o.prop ?? "both";
  if (!PROPS.includes(prop)) fail(`--prop must be one of ${PROPS.join(", ")}, not ${JSON.stringify(prop)}`);
  const [f0, f1] = frameRange(src, o, { required: true });
  const fps = src.fps;
  const want = [];
  for (let f = Math.max(0, f0 - 1); f <= f1; f++) want.push(f);   // one frame before, for the first speed

  const res = await src.page.evaluate(async ({ sel, frames, fps }) => {
    let el;
    try { el = document.querySelector(sel); } catch { return { error: `--select ${JSON.stringify(sel)} is not a valid CSS selector` }; }
    if (!el) return { error: `--select ${JSON.stringify(sel)} matches nothing on the page` };
    const rows = [];
    for (const f of frames) {
      await window.seek(f / fps);
      const r = el.getBoundingClientRect();
      let op = 1;
      for (let e = el; e && e.nodeType === 1; e = e.parentElement) op *= Number(getComputedStyle(e).opacity);
      rows.push({ f, x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, op,
        shown: el.isConnected && (r.width > 0 || r.height > 0) });
    }
    return { rows, count: document.querySelectorAll(sel).length };
  }, { sel: o.select, frames: want, fps });
  if (res.error) fail(res.error);
  if (res.count > 1) console.warn(`warning: --select matches ${res.count} elements; using the first`);

  const rows = res.rows, pre = rows[0].f < f0 ? rows[0] : null, win = pre ? rows.slice(1) : rows;
  const N = win.length, F = win.map((r) => r.f);
  const first = win.find((r) => r.shown) ?? win[0];
  const area0 = first.w * first.h;
  const value = {
    x: (r) => r.x, y: (r) => r.y, dx: (r) => r.x - first.x, dy: (r) => r.y - first.y,
    scale: (r) => (area0 > 0 ? Math.sqrt((r.w * r.h) / area0) : Math.sqrt(r.w * r.h)), opacity: (r) => r.op,
  };
  const keys = prop === "both" ? ["dx", "dy"] : [prop];
  const series = keys.map((key) => ({ key, v: win.map((r) => (r.shown || key === "opacity" ? value[key](r) : NaN)) }));
  const prevOf = (key) => (pre && (pre.shown || key === "opacity") ? value[key](pre) : NaN);
  const S = win.map((r, j) => {
    const d = keys.map((key, s) => series[s].v[j] - (j ? series[s].v[j - 1] : prevOf(key)));
    return d.every(Number.isFinite) ? Math.hypot(...d) : NaN;
  });
  if (!series.some((s) => s.v.some(Number.isFinite))) fail(`${o.select} has no size on screen between frames ${f0} and ${f1} (display: none?)`);
  const extent = (v) => { const f = v.filter(Number.isFinite); return f.length ? Math.max(...f) - Math.min(...f) : 0; };
  const range = Math.hypot(...series.map((s) => extent(s.v)));
  const thr = 0.005 * range;
  const moves = range > 0 ? findMoves(S, thr, Math.max(2, Math.round(fps / 10))) : [];
  const unit = { x: "px", y: "px", both: "px", scale: "×", opacity: "" }[prop];
  const perFrame = { x: "px/frame", y: "px/frame", both: "px/frame", scale: "×/frame", opacity: "/frame" }[prop];
  const big = (v) => (prop === "scale" || prop === "opacity" ? v.toFixed(3) : v.toFixed(1));

  // Text summary.
  const what = { x: "x (center)", y: "y (center)", both: "x and y (center)", scale: `scale (size vs frame ${first.f})`, opacity: "opacity (with parents)" }[prop];
  const lines = [`graph: ${o.select}  ${what}  frames ${f0}–${f1} (${secs(f0 / fps, f1 / fps)}) at ${fmtFps(fps)} fps`];
  lines.push(`  range ${big(range)}${unit ? ` ${unit}` : ""}; settled = speed under ${thr.toPrecision(3)} ${perFrame} (0.5% of the range)`);
  if (!moves.length) lines.push(`  no motion between frames ${f0} and ${f1}`);
  const verdict = (m) => {
    const s = m.openStart ? `already moving at frame ${F[0]}` : m.hardStart ? `HARD START (speed jumps ${Math.round(m.jumpIn * 100)}% of peak in one frame)` : "soft start";
    const e = m.openEnd ? `still moving at frame ${F[N - 1]}` : m.hardStop ? `HARD STOP (speed drops ${Math.round(m.jumpOut * 100)}% of peak in one frame)` : "soft stop";
    return [s, e];
  };
  moves.forEach((m, k) => {
    const a = m.openStart ? F[0] : F[m.a], b = F[m.b];
    lines.push(`  move ${k + 1}: frames ${a}–${b} (${secs(a / fps, b / fps)}, ${((b - a) / fps).toFixed(2)} s), ` +
      `peak ${big(m.P)} ${perFrame} at frame ${F[m.peak]}; ${verdict(m).join(", ")}`);
  });

  // Plot geometry (SVG user units = CSS px).
  const SW = 1704, ML = 96, MR = 56, P1 = { top: 64, h: 380 }, P2 = { top: 534, h: 220 }, SH = P2.top + P2.h + 74;
  const X = (f) => ML + ((f - F[0]) / (F[N - 1] - F[0])) * (SW - ML - MR);
  const all = series.flatMap((s) => s.v).filter(Number.isFinite);
  const vy = niceAxis(Math.min(...all), Math.max(...all), 5);
  const Y1 = (v) => P1.top + P1.h - ((v - vy.lo) / (vy.hi - vy.lo)) * P1.h;
  const peakAll = Math.max(0, ...S.filter(Number.isFinite));
  const sy = niceAxis(0, Math.max(peakAll * 1.18, thr * 3, 1e-6), 4);   // headroom for the peak's label
  const Y2 = (v) => P2.top + P2.h - ((v - sy.lo) / (sy.hi - sy.lo)) * P2.h;
  const dv = decimals(vy.step), ds = decimals(sy.step);
  const svg = [];
  const text = (x, y, s, { cls = "", anchor = "start" } = {}) => `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" class="${cls}">${esc(s)}</text>`;
  const path_ = (pts) => {
    let d = "", pen = false;
    for (const [x, y] of pts) {
      if (!Number.isFinite(y)) { pen = false; continue; }
      d += `${pen ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
      pen = true;
    }
    return d;
  };
  // Panel titles.
  const valueTitle = { x: "Position x · px", y: "Position y · px", both: `Position · offset from frame ${first.f}, px`,
    scale: `Scale · size vs frame ${first.f}`, opacity: "Opacity · with parents" }[prop];
  svg.push(text(ML, P1.top - 26, valueTitle, { cls: "ptitle" }));
  svg.push(text(ML, P2.top - 26, `Speed · ${perFrame}`, { cls: "ptitle" }));
  if (prop === "both") {
    const lx = SW - MR;
    svg.push(`<g class="legend"><line x1="${lx - 150}" y1="${P1.top - 32}" x2="${lx - 122}" y2="${P1.top - 32}" stroke="var(--x)" stroke-width="3" stroke-linecap="round"/>`,
      text(lx - 112, P1.top - 26, "x"), `<line x1="${lx - 66}" y1="${P1.top - 32}" x2="${lx - 38}" y2="${P1.top - 32}" stroke="var(--y)" stroke-width="3" stroke-linecap="round"/>`,
      text(lx - 28, P1.top - 26, "y"), "</g>");
  }
  // Grids and y labels.
  for (const v of vy.ticks) {
    svg.push(`<line class="grid" x1="${ML}" x2="${SW - MR}" y1="${Y1(v).toFixed(1)}" y2="${Y1(v).toFixed(1)}"/>`);
    svg.push(text(ML - 14, Y1(v) + 6, prop === "both" ? signed(v, dv) : plain(v, dv), { cls: "tick", anchor: "end" }));
  }
  for (const v of sy.ticks) {
    svg.push(`<line class="${v === 0 ? "base" : "grid"}" x1="${ML}" x2="${SW - MR}" y1="${Y2(v).toFixed(1)}" y2="${Y2(v).toFixed(1)}"/>`);
    svg.push(text(ML - 14, Y2(v) + 6, plain(v, ds), { cls: "tick", anchor: "end" }));
  }
  // x axis: frame numbers, seconds below.
  const span = F[N - 1] - F[0];
  const fstep = [1, 2, 5, 10, 15, 20, 30, 60, 120, 300, 600, 1200, 1800, 3600].find((s) => span / s <= 12) ?? 3600;
  for (let f = Math.ceil(F[0] / fstep) * fstep; f <= F[N - 1]; f += fstep) {
    const x = X(f);
    svg.push(`<line class="axis" x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${P2.top + P2.h}" y2="${P2.top + P2.h + 7}"/>`);
    svg.push(text(x, P2.top + P2.h + 31, String(f), { cls: "tick", anchor: "middle" }));
    svg.push(text(x, P2.top + P2.h + 55, sec(f / fps), { cls: "tick sub", anchor: "middle" }));
  }
  svg.push(text(ML - 52, P2.top + P2.h + 31, "frame", { cls: "tick sub", anchor: "end" }));
  svg.push(text(ML - 52, P2.top + P2.h + 55, "time", { cls: "tick sub", anchor: "end" }));
  // Move markers behind the data: a band for each move, from its last still frame to its settled frame.
  moves.forEach((m) => {
    const xa = X(m.openStart ? F[0] : F[m.a]), xb = X(F[m.b]);
    svg.push(`<rect class="band" x="${xa.toFixed(1)}" y="${P1.top}" width="${Math.max(1, xb - xa).toFixed(1)}" height="${P1.h}"/>`);
    svg.push(`<rect class="band" x="${xa.toFixed(1)}" y="${P2.top}" width="${Math.max(1, xb - xa).toFixed(1)}" height="${P2.h}"/>`);
  });
  // Threshold, with its note at the right; the note is kept clear of the speed panel's labels below.
  // It goes at whichever end of the panel has less motion under it.
  const note = "settled below this line (0.5% of range)", noteW = 6.9 * note.length;
  const busy = (x0, x1) => F.filter((f, j) => X(f) >= x0 && X(f) <= x1 && S[j] >= thr).length;
  const noteLeft = busy(ML, ML + noteW + 12) < busy(SW - MR - noteW - 12, SW - MR);
  const noteBox = noteLeft ? { x0: ML + 8, x1: ML + 8 + noteW } : { x0: SW - MR - noteW, x1: SW - MR };
  svg.push(`<line class="thr" x1="${ML}" x2="${SW - MR}" y1="${Y2(thr).toFixed(1)}" y2="${Y2(thr).toFixed(1)}"/>`);
  svg.push(text(noteLeft ? ML + 8 : SW - MR, Y2(thr) - 8, note, { cls: "note", anchor: noteLeft ? "start" : "end" }));
  // Speed area and line.
  const spts = F.map((f, j) => [X(f), Number.isFinite(S[j]) ? Y2(S[j]) : NaN]);
  const sd = path_(spts);
  if (sd) {
    const fin = spts.filter(([, y]) => Number.isFinite(y));
    svg.push(`<path class="area" d="${sd} L${fin.at(-1)[0].toFixed(1)} ${Y2(0)} L${fin[0][0].toFixed(1)} ${Y2(0)} Z"/>`);
    svg.push(`<path class="speed" d="${sd}"/>`);
  }
  // Value lines, with a dot on every frame so the spacing shows (when frames are far enough apart).
  const dotted = (SW - ML - MR) / Math.max(1, span) >= 6;
  series.forEach((s, k) => {
    const color = prop === "both" ? (k ? "var(--y)" : "var(--x)") : "var(--x)";
    const pts = F.map((f, j) => [X(f), Y1(s.v[j])]);
    svg.push(`<path class="line" stroke="${color}" d="${path_(pts)}"/>`);
    if (dotted) svg.push(...pts.filter(([, y]) => Number.isFinite(y)).map(([x, y]) => `<circle class="dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.2" fill="${color}"/>`));
    if (prop === "both") {
      const lastPt = pts.filter(([, y]) => Number.isFinite(y)).at(-1);
      if (lastPt) svg.push(text(lastPt[0] + 12, lastPt[1] + 6, k ? "y" : "x", { cls: "end" }));
    }
  });
  // Markers on top: start and settled lines with labels, the peak, hard starts and stops.
  // A label on a surface-colored chip. The chip is sized to the measured text in the browser.
  const tag = (x, y, s, anchor) =>
    `<g class="tag"><rect y="${(y - 18).toFixed(1)}" height="25" rx="6"/>` +
    text(anchor === "end" ? x - 8 : x + 8, y, s, { anchor }) + "</g>";
  // Marker labels sit in one of four slots in the value panel (top, under it, bottom, over it):
  // the first that is clear of the data and of labels already placed.
  const SLOTS = [P1.top + 26, P1.top + 58, P1.top + P1.h - 14, P1.top + P1.h - 46];
  const placed = [];
  const chipW = (s) => 8.4 * s.length + 18;   // close enough to the measured chip for spacing
  const clear = (x0, x1, y) => !series.some((ser) => F.some((f, j) => {
    const x = X(f), v = Y1(ser.v[j]);
    return x >= x0 - 4 && x <= x1 + 4 && Number.isFinite(v) && v > y - 30 && v < y + 16;
  })) && !placed.some((b) => b.y === y && x0 < b.x1 + 8 && x1 > b.x0 - 8);
  const label = (x, s, anchor) => {
    const x0 = anchor === "end" ? x - chipW(s) : x, x1 = x0 + chipW(s);
    const y = SLOTS.find((y) => clear(x0, x1, y)) ?? SLOTS.find((y) => !placed.some((b) => b.y === y && x0 < b.x1 && x1 > b.x0)) ?? SLOTS[0];
    placed.push({ x0, x1, y });
    svg.push(tag(x, y, s, anchor));
  };
  moves.forEach((m) => {
    const xa = X(m.openStart ? F[0] : F[m.a]), xb = X(F[m.b]);
    for (const x of [xa, xb]) svg.push(`<line class="marker" x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${P1.top}" y2="${P2.top + P2.h}"/>`);
    if (!m.openStart) label(xa - 6, `moves ${F[m.a]}`, "end");
    label(xb + 6, m.openEnd ? `still moving at ${F[m.b]}` : `settled ${F[m.b]}`, "start");
  });
  // Speed panel: hard start/stop flags on the bottom band, then each peak's dot and label in the
  // first spot clear of the note, the flags, the other dots and the labels placed so far.
  const FY = P2.top + P2.h - 22;
  const peaks = moves.map((m) => ({ x: X(F[m.peak]), y: Y2(m.P), s: `peak ${big(m.P)} ${perFrame} · frame ${F[m.peak]}` }));
  const dots = peaks.map((d) => ({ x0: d.x - 7, x1: d.x + 7, y0: d.y - 7, y1: d.y + 7 }));
  const boxes = [{ ...noteBox, y0: Y2(thr) - 22, y1: Y2(thr) - 2 }, ...dots];
  const hits = (b, skip) => boxes.some((o) => o !== skip && b.x0 < o.x1 + 6 && b.x1 > o.x0 - 6 && b.y0 < o.y1 + 4 && b.y1 > o.y0 - 4);
  const flag = (x, s) => {
    const w = 8 * s.length;
    const right = { x0: x + 16, x1: x + 18 + w, y0: FY - 12, y1: FY + 12 };
    const left = { x0: x - 18 - w, x1: x - 16, y0: FY - 12, y1: FY + 12 };
    const onRight = right.x1 <= SW - MR && (!hits(right) || hits(left));
    boxes.push({ x0: x - 12, x1: x + 12, y0: FY - 12, y1: FY + 12 }, onRight ? right : left);
    svg.push(`<g class="flag"><circle cx="${x.toFixed(1)}" cy="${FY}" r="11"/>` + text(x, FY + 5.5, "!", { anchor: "middle", cls: "bang" }) + "</g>" +
      text(onRight ? x + 18 : x - 18, FY + 6, s, { cls: "flagtext", anchor: onRight ? "start" : "end" }));
  };
  moves.forEach((m) => {
    const start = m.hardStart && !m.openStart, stop = m.hardStop && !m.openEnd;
    // A cut or a very short move: one flag for both ends, so the two never overlap.
    if (start && stop && X(F[m.b]) - X(F[m.a]) < 150) { flag(X(F[m.a]), "hard start and stop"); return; }
    if (start) flag(X(F[m.a]), "hard start");
    if (stop) flag(X(F[m.b]), "hard stop");
  });
  peaks.forEach((d, k) => {
    svg.push(`<circle class="peak" cx="${d.x.toFixed(1)}" cy="${d.y.toFixed(1)}" r="6"/>`);
    const w = chipW(d.s), right = d.x + 10 + w < SW - MR;
    const box = (y) => ({ ...(right ? { x0: d.x + 10, x1: d.x + 10 + w } : { x0: d.x - 10 - w, x1: d.x - 10 }), y0: y - 18, y1: y + 7 });
    const spots = [d.y - 14, d.y - 44, d.y + 30, P2.top + 20].filter((y) => y - 18 >= P2.top - 40 && y + 7 <= P2.top + P2.h - 2);
    const y = spots.find((y) => !hits(box(y), dots[k])) ?? spots[0] ?? d.y - 14;
    boxes.push(box(y));
    svg.push(tag(d.x + (right ? 10 : -10), y, d.s, right ? "start" : "end"));
  });

  // Summary rows above the plot: one per move, at most three.
  const chip = (ok, s) => `<span class="st ${ok ? "ok" : "bad"}"><i>${ok ? "✓" : "!"}</i>${esc(s)}</span>`;
  const rowsHtml = moves.slice(0, 3).map((m, k) => {
    const a = m.openStart ? F[0] : F[m.a], b = F[m.b];
    const [vs, ve] = verdict(m);
    return `<div class="move"><span class="k">Move ${k + 1}</span><span class="mv">frames <b>${a} → ${b}</b> (${((b - a) / fps).toFixed(2)} s)</span>
      <span class="mv">peak <b>${big(m.P)}</b> ${perFrame} at <b>${F[m.peak]}</b></span>
      ${m.openStart ? `<span class="st na">${esc(vs)}</span>` : chip(!m.hardStart, m.hardStart ? "hard start" : "soft start")}
      ${m.openEnd ? `<span class="st na">${esc(ve)}</span>` : chip(!m.hardStop, m.hardStop ? "hard stop" : "soft stop")}</div>`;
  }).join("") + (moves.length > 3 ? `<div class="move more">+ ${moves.length - 3} more moves (printed)</div>` : "")
    + (moves.length ? "" : `<div class="move"><span class="mv">No motion in this range.</span></div>`);

  const width = SW + 96;
  const html = `<!doctype html><meta charset="utf-8"><style>${BASE_CSS}
    body { width: ${width}px; }
    .card { background: var(--surface); border-radius: 14px; padding: 28px 0 10px;
      box-shadow: 0 0 0 1px rgba(31,30,27,0.06), 0 10px 30px -18px rgba(31,30,27,0.3); }
    .moves { margin: -6px 0 22px; display: flex; flex-direction: column; gap: 10px; }
    .move { display: flex; align-items: center; gap: 22px; font-size: 19px; color: var(--muted); }
    .move b { color: var(--ink); font-weight: 600; }
    .move .k { width: 74px; }
    .st { display: inline-flex; align-items: center; gap: 8px; padding: 4px 12px 4px 6px; border-radius: 999px;
      background: #F1EFEA; color: var(--body); font-size: 17px; font-weight: 550; }
    .st i { width: 20px; height: 20px; border-radius: 50%; display: grid; place-items: center; color: #fff;
      font-style: normal; font-size: 13px; font-weight: 700; }
    .st.ok i { background: var(--good); } .st.bad i { background: var(--critical); }
    .st.na { padding-left: 12px; color: var(--muted); }
    svg { display: block; overflow: visible; }
    svg text { font-family: Geist, system-ui, sans-serif; font-variant-numeric: tabular-nums; }
    .ptitle { font-size: 18px; font-weight: 600; fill: var(--body); }
    .legend text { font-size: 18px; font-weight: 550; fill: var(--body); }
    .tick { font-size: 16px; fill: var(--muted); } .tick.sub { font-size: 14px; fill: var(--faint); }
    .grid { stroke: var(--grid); stroke-width: 1; } .base, .axis { stroke: #CFCAC1; stroke-width: 1; }
    .band { fill: var(--pine); opacity: 0.045; }
    .thr { stroke: var(--faint); stroke-width: 1.2; stroke-dasharray: 5 5; }
    .note { font-size: 14px; fill: var(--muted); }
    .area { fill: var(--ink); opacity: 0.08; }
    .speed { fill: none; stroke: #3B3934; stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
    .line { fill: none; stroke-width: 2.25; stroke-linejoin: round; stroke-linecap: round; }
    .dot { stroke: var(--surface); stroke-width: 1.5; }
    .end { font-size: 17px; font-weight: 600; fill: var(--body); }
    .marker { stroke: var(--ink); stroke-width: 1; opacity: 0.32; }
    .tag rect { fill: var(--surface); stroke: var(--line); stroke-width: 1; }
    .tag text { font-size: 15px; font-weight: 550; fill: var(--body); }
    .peak { fill: var(--ink); stroke: var(--surface); stroke-width: 2.5; }
    .flag circle { fill: var(--critical); stroke: var(--surface); stroke-width: 2; }
    .bang { font-size: 15px; font-weight: 700; fill: #fff; }
    .flagtext { font-size: 15px; font-weight: 600; fill: var(--ink); }
  </style>
  <header><div><div class="eyebrow">Speed graph</div><h1>${esc(o.select)} · ${esc(what)}</h1></div>
    <div class="meta"><b>${esc(src.name)}</b><br>frames ${f0}–${f1} · ${secs(f0 / fps, f1 / fps)} · ${fmtFps(fps)} fps</div></header>
  <div class="moves">${rowsHtml}</div>
  <div class="card"><svg width="${SW}" height="${SH}" viewBox="0 0 ${SW} ${SH}">${svg.join("")}</svg></div>
  <script>window.prepare = () => document.querySelectorAll(".tag").forEach((g) => {
    const b = g.querySelector("text").getBBox(), r = g.querySelector("rect");
    r.setAttribute("x", b.x - 8); r.setAttribute("width", b.width + 16);
  });</script>`;
  const [w, h] = await compose(src.browser, { html, width, out });
  console.log(`${lines.join("\n")}\nwrote ${out}  ${w}x${h}`);
}

// ---------- holds ----------

async function readScenes(arg, duration) {
  let list;
  if (/^[\d.\s,]+$/.test(arg)) {
    const starts = arg.split(",").map((s) => s.trim()).filter(Boolean).map(Number);
    if (!starts.length || starts.some((t) => !Number.isFinite(t))) fail(`--scenes ${JSON.stringify(arg)} is not a list of start times`);
    list = starts.map((start, i) => ({ id: `s${String(i + 1).padStart(2, "0")}`, start }));
  } else {
    const file = path.resolve(arg);
    if (!fs.existsSync(file)) fail(`--scenes: no such file: ${arg}`);
    const textIn = fs.readFileSync(file, "utf8");
    let data;
    try {
      if (/\.json$/i.test(file)) data = JSON.parse(textIn);
      else {
        const m = textIn.match(/window\.SCENES\s*=\s*(\{[\s\S]*?\}|\[[\s\S]*?\])\s*;\s*(?:\n|$)/);
        if (!m) fail(`--scenes: ${path.basename(file)} has no window.SCENES = {...}; (timeline.py writes it to words.js)`);
        data = JSON.parse(m[1]);
      }
    } catch (e) {
      if (e instanceof UsageError) throw e;
      fail(`--scenes: could not read scene times from ${path.basename(file)} (${e.message})`);
    }
    list = normScenes(data);
    if (!list) fail(`--scenes: ${path.basename(file)} has no scenes with start times`);
  }
  list.sort((a, b) => a.start - b.start);
  // A scene's picture runs until the next one starts; the first one also owns the lead-in.
  return list.map((s, i) => ({ ...s, from: i ? s.start : 0, to: i + 1 < list.length ? list[i + 1].start : duration }));
}

async function holds(file, o) {
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) fail(`no such file: ${file}`);
  if (isPagePath(file)) fail("holds measures a rendered video; render a draft first:\n  node render.mjs index.html --out qa/draft.mp4 --fps 30 --sub 1 --scale 0.5");
  const min = numOpt(o, "min", 1.5, { min: 0 });
  const v = await probeVideo(file);
  const scenes = o.scenes ? await readScenes(o.scenes, v.duration) : null;
  const { code, stderr } = await run("ffmpeg", ["-hide_banner", "-nostats", "-v", "info", "-i", file, "-an", "-sn", "-dn",
    "-vf", "fps=10,scale=480:-2,freezedetect=n=0.002:d=0.6", "-f", "null", "-"]);
  if (code) fail(`ffmpeg could not read ${path.basename(file)}: ${stderr.trim().split("\n").at(-1)}`);
  const list = [];
  for (const m of stderr.matchAll(/freeze_(start|end): ([\d.]+)/g)) {
    if (m[1] === "start") list.push({ start: Number(m[2]), end: null });
    else if (list.length) list.at(-1).end = Number(m[2]);
  }
  for (const h of list) { h.toEnd = h.end === null; h.end ??= v.duration; h.len = h.end - h.start; }

  const name = path.basename(file);
  const out = [`holds in ${name} (${v.duration.toFixed(2)} s): each still stretch of 0.6 s or more`];
  if (!list.length) out.push("  none: something moves in every 0.6 s stretch");
  else {
    out.push("    start   length");
    for (const h of list) {
      out.push(`  ${h.start.toFixed(2).padStart(7)} s  ${h.len.toFixed(2).padStart(5)} s${h.len >= min ? "" : "   short"}${h.toEnd ? "   (to the end)" : ""}`);
    }
  }
  const held = list.reduce((s, h) => s + h.len, 0);
  const longest = list.reduce((a, h) => (h.len > (a?.len ?? -1) ? h : a), null);
  const enough = list.filter((h) => h.len >= min).length;
  out.push(`${list.length} hold${list.length === 1 ? "" : "s"}, ${enough} of them ${min} s or longer; ` +
    `still ${held.toFixed(1)} s of ${v.duration.toFixed(1)} s (${Math.round((100 * held) / v.duration)}%)` +
    (longest ? `; longest ${longest.len.toFixed(2)} s at ${longest.start.toFixed(2)} s` : ""));
  if (scenes) {
    out.push(`scenes (each needs a hold of ${min} s or more):`);
    let fast = 0;
    for (const s of scenes) {
      let best = 0, at = null;
      for (const h of list) {
        const len = Math.min(h.end, s.to) - Math.max(h.start, s.from);
        if (len > best) { best = len; at = Math.max(h.start, s.from); }
      }
      const ok = best >= min - 1e-6;
      if (!ok) fast++;
      // A hold just over the minimum can split in two on the next render (animation-principles.md).
      const tight = ok && best < min * 1.15 ? ", tight" : "";
      out.push(`  ${ok ? "ok      " : "TOO FAST"}  ${s.id.padEnd(6)}${secs(s.from, s.to).padStart(15)}   ` +
        (at === null ? "no hold" : `longest hold ${best.toFixed(2)} s at ${at.toFixed(2)} s`) + (ok ? tight : `, needs ${min} s`));
    }
    out.push(fast ? `${fast} of ${scenes.length} scenes too fast` : `all ${scenes.length} scenes hold for ${min} s or more`);
  }
  console.log(out.join("\n"));
}

// ---------- audit ----------

async function audit(src, o) {
  const every = numOpt(o, "every", 1, { min: 1, int: true });
  const checks = await src.page.evaluate(() => (window.CHECKS || []).map((c, i) => ({ i, name: c.name, at: c.at })));
  if (!checks.length) {
    console.log("no checks: declare them in the page with check(name, at, fn) from motion.js");
    return 0;
  }
  // Frames each check names, then one seek per frame for every check that names it.
  const byFrame = new Map();
  for (const c of checks) {
    let frames;
    if (c.at === "all") frames = spread(0, src.last, Math.ceil((src.last + 1) / every));
    else if (Array.isArray(c.at)) {
      const [f0, f1] = c.at.map((t) => src.clamp(src.frameOf(t)));
      frames = [];
      for (let n = f0; n <= f1; n += every) frames.push(n);
    } else frames = [src.clamp(src.frameOf(Number(c.at)))];
    c.frames = frames.length;
    c.failed = [];
    for (const n of frames) (byFrame.get(n) ?? byFrame.set(n, []).get(n)).push(c.i);
  }
  const order = [...byFrame.keys()].sort((a, b) => a - b);
  for (const n of order) {
    const results = await src.page.evaluate(async ({ t, ids }) => {
      await window.seek(t);
      return ids.map((i) => {
        try {
          const r = window.CHECKS[i].fn(t);
          return r === true || r === undefined ? null : r === false ? "failed" : String(r);
        } catch (e) { return `threw: ${e.message}`; }
      });
    }, { t: src.timeOf(n), ids: byFrame.get(n) });
    byFrame.get(n).forEach((i, k) => { if (results[k] !== null) checks[i].failed.push({ n, why: results[k] }); });
  }
  let bad = 0;
  for (const c of checks) {
    if (!c.failed.length) { console.log(`PASS  ${c.name}  (${c.frames} frame${c.frames === 1 ? "" : "s"})`); continue; }
    bad++;
    const first = c.failed.slice(0, 3).map((f) => `f${f.n}: ${f.why}`).join("; ");
    console.log(`FAIL  ${c.name}  (${c.failed.length} of ${c.frames} frames)  ${first}${c.failed.length > 3 ? "; ..." : ""}`);
  }
  console.log(`${checks.length - bad} of ${checks.length} checks pass over ${order.length} frames`);
  return bad ? 1 : 0;
}

// ---------- main ----------

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) { console.log(usage()); return 0; }
  if (!argv.length) { console.error(usage()); return 1; }
  const { pos, o } = parseArgs(argv);
  const [cmd, input, extra] = pos;
  if (!COMMANDS[cmd]) fail(`${cmd ? `unknown command ${JSON.stringify(cmd)}` : "no command"}; use sheet, onion, graph, holds or audit (--help shows how)`);
  if (!input) fail(`${cmd} needs a ${cmd === "graph" || cmd === "audit" ? "page (.html)" : cmd === "holds" ? "video" : "page or video"} to read`);
  if (extra) fail(`unexpected argument ${JSON.stringify(extra)}`);
  for (const k of Object.keys(o)) if (!COMMANDS[cmd].includes(k)) fail(`--${k} does not apply to ${cmd}`);
  const file = path.resolve(input);
  if (cmd === "holds") { await holds(file, o); return 0; }
  checkEarly(cmd, file, o);
  const src = await openSource(file, o);
  try {
    if (src.kind === "video" && o.fps !== undefined) console.warn(`note: a video keeps its own ${fmtFps(src.fps)} fps; --fps applies to pages`);
    if (cmd === "audit") return await audit(src, o);
    await { sheet, onion, graph }[cmd](src, o);
  } finally {
    await src.close();
  }
  return 0;
}

// Check the options before starting the browser, so a bad call fails at once.
function checkEarly(cmd, file, o) {
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) fail(`no such file: ${file}`);
  if (cmd === "graph" && !isPagePath(file)) fail("graph reads the element from the page's DOM, so it needs the page (.html), not a video");
  if (cmd === "audit") {
    if (!isPagePath(file)) fail("audit runs the page's own checks, so it needs the page (.html)");
    return;
  }
  outPath(o);
  if (cmd === "graph" && !o.select) fail('--select "<css selector>" is required');
  if ((cmd === "onion" || cmd === "graph") && (o.from === undefined || o.to === undefined)) fail("--from and --to (seconds) are required");
  if (o.at !== undefined && o.frames !== undefined) fail("use --at or --frames, not both");
}

main().then((code) => process.exit(code), (e) => {
  // Page and ffmpeg errors carry their own explanation; a stack helps only for a bug in this script.
  const known = e instanceof UsageError || /never defined window\.VIDEO|ffmpeg|Executable doesn't exist|Playwright/.test(e.message);
  console.error(`review.mjs: ${known ? e.message : e.stack || e.message}`);
  process.exit(1);
});
