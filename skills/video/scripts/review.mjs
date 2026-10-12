#!/usr/bin/env node
// Review a draft the way an animator does: a storyboard, a contact sheet, an onion skin, a speed
// graph, a hold check and a layout lint. board, sheet, onion and graph each write one labeled PNG;
// holds, audit and lint print text.
//
//   node review.mjs board <page.html> [--out qa/board.png] [--at stills | 1.5,3,4.2] [--cols 3] [--fps 60]
//                         [--look [--count 3]]
//   node review.mjs sheet <page.html|video.mp4> --out sheet.png [--frames 12 | --at 1.5,3,4.2 | --at stills]
//                         [--from t] [--to t] [--cols 4] [--fps 60] [--scenes ...] [--debug]
//   node review.mjs onion <page.html|video.mp4> --from t0 --to t1 --out onion.png [--count 8] [--fps 60]
//   node review.mjs graph <page.html> --select "#card" --from t0 --to t1 --out graph.png
//                         [--prop x|y|both|scale|opacity] [--fps 60]
//   node review.mjs holds <video.mp4> [--min 1.5] [--scenes words.js | scenes.json | 0,10.3,24.7]
//   node review.mjs audit <page.html> [--fps 60] [--every 1] [--grep name]
//   node review.mjs lint <page.html> [--every 30] [--safe 9x16|4x5|1x1|16x9|off] [--allow allow.txt]
//                        [--min-size 28] [--out lint.png] [--fps 60]
//   node review.mjs cuts <page.html> --out cuts.png [--fps 60]
//
// board  A numbered storyboard for the user to approve before narration and full renders are
//        paid for. One large panel per shot: the shot's key pose through the real seek(t), its
//        number, frame and time, title, note, sound and "→ next". Shots come from window.SHOTS =
//        [{t, title, note, sound, next}] (t is the key pose; next is an optional handoff, such as
//        "cut on beat 9"), else --at, else VIDEO.stills. Without a sound note, a panel lists the
//        sounds the page declared since the panel before. --look renders 2–4 look frames at full
//        size instead (--count, or --at), to approve the palette, type and framing first. The
//        default --out is qa/board.png (qa/look.png with --look) next to the page.
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
//        each one names (--every n checks every nth frame of a range). --grep runs only the checks
//        whose names contain the text. Prints PASS or FAIL per check with its failing frames, and
//        exits 1 if any check fails.
// lint   Page only. Checks the text on screen every --every frames (default: every half second)
//        and on every frame where the text stops moving: text cut by the frame or by a clipping
//        box; text outside the format's safe area (--safe, default from the page's size); text
//        over other text; type smaller than --min-size (28 px on a 1080 px short side, scaled);
//        and contrast under 4.5:1 against the real pixels behind the text (text hidden, median
//        background, the text's computed color). A finding counts when it holds on 2 samples in
//        a row 0.2 s or more apart, or on a settle frame. --allow reads allowed findings, one per
//        line: `<check> <element or text> [@ t0-t1] -- <reason>`. Prints each finding with its
//        frames, selector path and text; --out draws them on their frames. Exits 1 on any
//        finding that is not allowed.
// cuts   Page only. The motion on each side of every hard cut (VIDEO.cuts) and of the start, the
//        handoff and the end of every transition (window.TRANSITIONS, from transitions.js): the
//        visible elements' boxes fitted to one translation and one zoom, over 4 frames each side
//        at 60 fps. WARN when the speed changes more than 3x across (still counts as 0.1% of the
//        width per frame) or the direction or zoom reverses while both sides move. Writes a strip
//        of frames across each edit with every frame's motion, prints a line per edit, and notes
//        a cut missing from VIDEO.cuts or a VIDEO.cuts time inside a transition. Exits 0. Motion
//        inside a canvas or WebGL is invisible to it; pin an element to the object, as for graph.
//
// Frames are numbered as render.mjs renders them: frame n of a page is window.seek(n / fps)
// (--fps, default 60); a video uses its own frame rate and an exact ffmpeg seek. --debug opens
// the page with ?debug=1, and --query adds page options, as for render.mjs (--query finish=0
// turns the film finish off). Labels are drawn in Chromium, so ffmpeg needs no drawtext.

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { SKILL, serve, launch, openVideoPage, shot } from "./page.mjs";

const FONT = path.join(SKILL, "assets/fonts/geist-latin-wght-normal.woff2");
const MAX_SHEET_WIDTH = 2400;

// ---------- arguments ----------

const COMMANDS = {
  board: ["out", "at", "cols", "fps", "look", "count", "query"],
  sheet: ["out", "frames", "at", "from", "to", "cols", "fps", "scenes", "debug", "query"],
  onion: ["out", "from", "to", "count", "fps", "debug", "query"],
  graph: ["out", "select", "from", "to", "prop", "fps", "debug", "query"],
  holds: ["min", "scenes"],
  audit: ["fps", "every", "grep", "debug", "query"],
  lint: ["every", "safe", "allow", "min-size", "out", "fps", "query"],
  cuts: ["out", "fps", "debug", "query"],
};
const FLAGS = new Set(["debug", "look"]);

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
      const query = [o.query, o.debug ? "debug=1" : ""].filter(Boolean).join("&");
      const { p, video } = await openVideoPage(src.browser, url, { query });
      const meta = await p.evaluate(() => ({
        scenes: window.SCENES ?? null,
        cues: Array.isArray(window.CUE_TIMES) ? window.CUE_TIMES : null,
        words: Array.isArray(window.WORDS) ? window.WORDS : null,
        beats: window.BEATS && Number.isFinite(window.BEATS.bpm) ? { bpm: window.BEATS.bpm, first: window.BEATS.first ?? 0 } : null,
        shots: window.SHOTS == null ? null : Array.isArray(window.SHOTS)
          ? window.SHOTS.map((s) => ({ t: s?.t, title: s?.title, note: s?.note, sound: s?.sound, next: s?.next })) : "not an array",
        sfx: Array.isArray(window.SFX) ? window.SFX.map((s) => ({ t: s?.t, kind: s?.kind })) : [],
        title: document.title.trim(),
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

// --at: "stills" (the page's VIDEO.stills) or a list of seconds like 1.5,3,4.2, as frame numbers.
function atFrames(src, at) {
  if (at === "stills") {
    if (!src.meta.stills?.length) fail(src.kind === "page" ? "the page has no VIDEO.stills" : "--at stills needs a page");
    return src.meta.stills.map((t) => src.clamp(src.frameOf(t)));
  }
  const frames = at.split(",").map((s) => s.trim()).filter(Boolean).map((s) => {
    const t = Number(s);
    if (!Number.isFinite(t) || t < 0) fail(`--at must be a list of seconds like 1.5,3,4.2 (or "stills"), not ${JSON.stringify(at)}`);
    if (src.frameOf(t) > src.last) fail(`--at ${s} is after the last frame (${sec(src.timeOf(src.last))})`);
    return src.clamp(src.frameOf(t));
  });
  if (!frames.length) fail("--at needs at least one time");
  return frames;
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

// ---------- board ----------

// window.SHOTS = [{t, title, note, sound, next}] -> checked and sorted by time. t is the key pose.
function normShots(list, src) {
  if (list == null) return null;
  if (!Array.isArray(list) || !list.length) fail("window.SHOTS must be a non-empty array of {t, title, note, sound}");
  const text = (v) => (v == null || String(v).trim() === "" ? null : String(v).trim());
  return list.map((s, i) => {
    const t = Number(s.t);
    if (s.t == null || !Number.isFinite(t) || t < 0) fail(`window.SHOTS[${i}] needs t, the time of the shot's key pose in seconds, not ${JSON.stringify(s.t)}`);
    if (src.frameOf(t) > src.last) fail(`window.SHOTS[${i}] at ${sec(t)} is after the last frame (${sec(src.timeOf(src.last))})`);
    return { t, title: text(s.title), note: text(s.note), sound: text(s.sound), next: text(s.next) };
  }).sort((a, b) => a.t - b.t);
}

// The sounds declared between two moments, grouped by kind: "tap 9.38 s · key ×18".
function soundsBetween(sfx, t0, t1) {
  const kinds = new Map();
  for (const s of sfx) if (s.t > t0 + 1e-6 && s.t <= t1 + 1e-6) (kinds.get(s.kind) ?? kinds.set(s.kind, []).get(s.kind)).push(s.t);
  return [...kinds].map(([k, ts]) => (ts.length > 1 ? `${k} ×${ts.length}` : `${k} ${sec(ts[0])}`)).join(" · ") || null;
}

async function board(src, o) {
  if (src.kind !== "page") fail("board renders the page's shots through seek(t), so it needs the page (.html)");
  const out = o.out ? outPath(o) : path.join(path.dirname(src.file), "qa", o.look ? "look.png" : "board.png");
  const shots = normShots(src.meta.shots, src);
  let frames, from;
  if (o.at !== undefined) [frames, from] = [atFrames(src, o.at), o.at === "stills" ? "VIDEO.stills" : "--at"];
  else if (shots) [frames, from] = [shots.map((s) => src.clamp(src.frameOf(s.t))), "window.SHOTS"];
  else if (src.meta.stills?.length) [frames, from] = [atFrames(src, "stills"), "VIDEO.stills (the page defines no window.SHOTS)"];
  else fail("the page defines no window.SHOTS = [{t, title, note, sound}] and no VIDEO.stills; add SHOTS, or pass --at 1.5,4,8");
  if (o.look) {
    // Look frames: the times given, or --count shots from the middle of each equal part of the list,
    // which skips the opening and closing shots (often a title, or a loop's return to frame 0).
    if (o.at !== undefined && o.at !== "stills") {
      if (frames.length < 2 || frames.length > 4) fail(`look frames are 2 to 4 frames; --at gives ${frames.length}`);
    } else {
      const k = Math.min(numOpt(o, "count", 3, { min: 2, max: 4, int: true }), frames.length), all = frames;
      frames = Array.from({ length: k }, (_, j) => all[Math.floor(((j + 0.5) * all.length) / k)]);
    }
  }
  if (frames.length > 40) fail(`${frames.length} panels is too many for one board; use at most 40`);

  // What each panel says. A panel takes the shot on its frame; without one, the cue, words or beat.
  const sfx = (src.meta.sfx ?? []).filter((s) => Number.isFinite(s.t)).sort((a, b) => a.t - b.t);
  const panels = frames.map((n, i) => {
    const t = src.timeOf(n);
    const shot = shots?.find((s) => Math.abs(src.frameOf(s.t) - n) <= 1) ?? null;
    const cap = captionAt(src.meta, t), scene = sceneAt(src.meta.scenes, t);
    const prev = i ? src.timeOf(frames[i - 1]) : -Infinity;
    return {
      n, t, title: shot?.title ?? cap?.text ?? scene?.id ?? null, note: shot?.note ?? null,
      sound: shot?.sound ?? (o.look ? null : soundsBetween(sfx, prev, t)), handoff: shot?.next ?? null,
    };
  });
  const nextOf = (i) => {
    const q = panels[i + 1], h = panels[i].handoff;
    if (!q) return h ?? "end";
    return `${i + 2}${q.title ? ` · ${q.title}` : ""}${h ? ` · ${h}` : ""}`;
  };
  const title = src.meta.title || src.name;
  const portrait = src.height > src.width * 1.2;

  let html, width;
  if (o.look) {
    // Full size, up to 1920 wide; as many across as fit in about 3600 px (two by two for four).
    const k = Math.min(1, 1920 / src.width);
    const w = Math.round(src.width * k), h = Math.round(src.height * k), gap = 32;
    const fit = Math.max(1, Math.floor(3600 / w));
    const cols = frames.length === 4 && fit >= 2 ? 2 : Math.min(frames.length, fit);
    const pngs = await src.grab(frames, w < src.width ? w : undefined);
    width = 96 + cols * w + (cols - 1) * gap;
    const cells = panels.map((p, i) => `<figure class="look">
      <img class="frame-img" src="l${i}.png" width="${w}" height="${h}">
      <figcaption><span class="no">${i + 1}</span><span class="ttl">${esc(p.title ?? "")}</span>
        <span class="when">Frame ${p.n} · ${sec(p.t)}</span></figcaption></figure>`);
    html = `<!doctype html><meta charset="utf-8"><style>${BASE_CSS}
      body { width: ${width}px; }
      .eyebrow { font-size: 18px; } h1 { font-size: 44px; } .meta { font-size: 23px; }
      .grid { display: grid; grid-template-columns: repeat(${cols}, ${w}px); gap: 44px ${gap}px; }
      .look img { width: ${w}px; height: ${h}px; }
      figcaption { margin-top: 18px; display: flex; align-items: center; gap: 18px; }
      .no { flex: none; width: 56px; height: 56px; border-radius: 14px; display: grid; place-items: center;
        background: var(--ink); color: #fff; font-size: 30px; font-weight: 650; }
      .ttl { font-size: 30px; font-weight: 600; letter-spacing: -0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .when { margin-left: auto; flex: none; font-size: 23px; color: var(--muted); }
      .sub { margin-top: 12px; font-size: 23px; color: var(--muted); }
    </style>
    <header><div><div class="eyebrow">Look frames</div><h1>${esc(title)}</h1>
      <div class="sub">Approve the look first: palette, type, materials and framing, at full size.</div></div>
      <div class="meta"><b>${frames.length} frames</b> · full size<br>${src.width}×${src.height} · ${fmtFps(src.fps)} fps</div></header>
    <main class="grid">${cells.join("")}</main>`;
    const [lw, lh] = await compose(src.browser, { html, width, out, assets: pngAssets(pngs, "l") });
    console.log(`look: ${frames.length} frames from ${from}\n${panels.map((p, i) => `  ${i + 1}  f${p.n}  ${sec(p.t)}  ${p.title ?? ""}`).join("\n")}\nwrote ${out}  ${lw}x${lh}`);
    return;
  }

  // Large panels: three across for wide and square frames, four for tall ones.
  const pad = 48, gap = 30;
  const cols = numOpt(o, "cols", portrait ? 4 : 3, { min: 1, max: 8, int: true });
  const used = Math.min(cols, panels.length);
  const cellW = Math.floor((MAX_SHEET_WIDTH - 2 * pad - (cols - 1) * gap) / cols);
  const cellH = Math.round((cellW * src.height) / src.width);
  const pngs = await src.grab(frames, cellW);
  width = 2 * pad + used * cellW + (used - 1) * gap;
  const line = (k, v, cls = "") => `<div class="line ${cls}"><span class="k">${k}</span><span class="v">${esc(v)}</span></div>`;
  const cells = panels.map((p, i) => `<figure class="panel">
    <img class="frame-img" src="p${i}.png" width="${cellW}" height="${cellH}">
    <div class="cap"><div class="no">${i + 1}</div><div class="body">
      <div class="head"><div class="ttl">${esc(p.title ?? "Untitled")}</div><div class="when">Frame ${p.n} · ${sec(p.t)}</div></div>
      ${p.note ? `<div class="note">${esc(p.note)}</div>` : ""}
      ${p.sound ? line("Sound", p.sound) : ""}
      ${line("Next", `→ ${nextOf(i)}`, "next")}
    </div></div></figure>`);
  const dur = sec(src.timeOf(src.last) + 1 / src.fps);
  html = `<!doctype html><meta charset="utf-8"><style>${BASE_CSS}
    body { width: ${width}px; }
    .sub { margin-top: 10px; font-size: 19px; color: var(--muted); }
    .grid { display: grid; grid-template-columns: repeat(${used}, ${cellW}px); gap: 48px ${gap}px; align-items: start; }
    .panel img { width: ${cellW}px; height: ${cellH}px; }
    .cap { margin-top: 16px; display: flex; gap: 16px; padding-right: 2px; }
    .no { flex: none; width: 50px; height: 50px; border-radius: 12px; display: grid; place-items: center;
      background: var(--ink); color: #fff; font-size: 26px; font-weight: 650; letter-spacing: -0.01em; }
    .body { flex: 1; min-width: 0; }
    .head { min-height: 50px; display: flex; align-items: center; gap: 14px; }
    .ttl { min-width: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.01em; line-height: 1.25;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .when { margin-left: auto; flex: none; font-size: 17px; color: var(--muted); }
    .note { margin-top: 4px; font-size: 18px; line-height: 1.45; color: var(--body); }
    .line { margin-top: 8px; display: flex; align-items: baseline; gap: 12px; font-size: 17px; line-height: 1.4; color: var(--body); }
    .line .k { flex: none; width: 54px; }
    .line .v { min-width: 0; }
    .next .v { color: var(--muted); }
  </style>
  <header><div><div class="eyebrow">Storyboard</div><h1>${esc(title)}</h1>
    <div class="sub">Approve or reject each panel by its number before narration and the full render.</div></div>
    <div class="meta"><b>${panels.length} panel${panels.length > 1 ? "s" : ""}</b> · ${esc(from.split(" ")[0])}<br>${dur} · ${src.width}×${src.height} · ${fmtFps(src.fps)} fps</div></header>
  <main class="grid">${cells.join("")}</main>`;
  const [w, h] = await compose(src.browser, { html, width, out, assets: pngAssets(pngs, "p") });
  console.log(`board: ${panels.length} panels from ${from}\n` +
    panels.map((p, i) => `  ${String(i + 1).padStart(2)}  f${p.n}  ${sec(p.t)}  ${p.title ?? ""}`).join("\n") + `\nwrote ${out}  ${w}x${h}`);
}

// ---------- sheet ----------

async function sheet(src, o) {
  const out = outPath(o);
  const portrait = src.height > src.width * 1.2;
  const cols = numOpt(o, "cols", portrait ? 6 : 4, { min: 1, max: 12, int: true });
  let frames;
  if (o.at !== undefined) frames = atFrames(src, o.at);
  else {
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
  let checks = await src.page.evaluate(() => (window.CHECKS || []).map((c, i) => ({ i, name: c.name, at: c.at })));
  if (!checks.length) {
    console.log("no checks: declare them in the page with check(name, at, fn) from motion.js");
    return 0;
  }
  if (o.grep !== undefined) {
    const all = checks, want = o.grep.toLowerCase();
    checks = all.filter((c) => String(c.name).toLowerCase().includes(want));
    if (!checks.length) fail(`no check name contains ${JSON.stringify(o.grep)}; the page declares: ${all.map((c) => JSON.stringify(c.name)).join(", ")}`);
  }
  const byIndex = new Map(checks.map((c) => [c.i, c]));
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
    byFrame.get(n).forEach((i, k) => { if (results[k] !== null) byIndex.get(i).failed.push({ n, why: results[k] }); });
  }
  let bad = 0;
  for (const c of checks) {
    if (!c.failed.length) { console.log(`PASS  ${c.name}  (${c.frames} frame${c.frames === 1 ? "" : "s"})`); continue; }
    bad++;
    const first = c.failed.slice(0, 3).map((f) => `f${f.n}: ${f.why}`).join("; ");
    console.log(`FAIL  ${c.name}  (${c.failed.length} of ${c.frames} frames)  ${first}${c.failed.length > 3 ? "; ..." : ""}`);
  }
  const which = o.grep !== undefined ? ` (names with ${JSON.stringify(o.grep)})` : "";
  console.log(`${checks.length - bad} of ${checks.length} checks${which} pass over ${order.length} frames`);
  return bad ? 1 : 0;
}

// ---------- lint ----------

// Safe areas: margins as fractions of the frame (left, top, right, bottom), plus bands where a
// platform draws its own buttons over the video. Captions from motion.js sit inside each one.
const SAFE = {
  "16x9": { ratio: 16 / 9, margin: [0.05, 0.05, 0.05, 0.05], bands: [], about: "title safe, 5% on each side" },
  "1x1": { ratio: 1, margin: [0.05, 0.05, 0.05, 0.07], bands: [],
    about: "5% at the sides and top, 7% at the bottom for a feed's mute button and progress bar" },
  "4x5": { ratio: 4 / 5, margin: [0.05, 0.05, 0.05, 0.07], bands: [],
    about: "5% at the sides and top, 7% at the bottom for a feed's mute button and progress bar" },
  "9x16": { ratio: 9 / 16, margin: [0.10, 0.12, 0.10, 0.20],
    bands: [{ name: "the right rail (like, comment, share)", x0: 0.84, y0: 0.40, x1: 1, y1: 0.80 }],
    about: "the middle 80%, below the top 12% (the app's tabs), above the bottom 20% (caption, name and buttons), clear of the right rail" },
};
const LINT_CHECKS = ["clipped", "safe", "overlap", "small", "contrast"];
const MIN_CONTRAST = 4.5;

function safeArea(o, w, h) {
  if (o.safe === "off") return null;
  if (o.safe) return { name: o.safe, ...SAFE[o.safe] };
  const hit = Object.entries(SAFE).find(([, s]) => Math.abs(w / h / s.ratio - 1) < 0.03);
  return hit ? { name: hit[0], ...hit[1] } : null;
}

// Allowed findings, one per line: <check> <element or text> [@ t0-t1] -- <reason>. # starts a comment.
function readAllow(file) {
  const abs = path.resolve(file);
  if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) fail(`--allow: no such file: ${file}`);
  const name = path.basename(abs);
  return fs.readFileSync(abs, "utf8").split("\n").flatMap((raw, k) => {
    const line = raw.trim();
    if (!line || line.startsWith("#")) return [];
    const where = `--allow ${name} line ${k + 1}`;
    const cut = line.indexOf(" -- ");
    const reason = cut < 0 ? "" : line.slice(cut + 4).trim();
    if (!reason) fail(`${where}: write the reason after " -- ", for example: contrast #hint -- a watermark, not meant to be read`);
    let left = line.slice(0, cut).trim(), range = null;
    const m = left.match(/\s@\s*([\d.]+)\s*-\s*([\d.]+)$/);
    if (m) {
      range = [Number(m[1]), Number(m[2])];
      if (!(range[1] >= range[0])) fail(`${where}: the time range ${m[0].trim()} must run forward`);
      left = left.slice(0, m.index).trim();
    }
    const gap = left.search(/\s/);
    const check = gap < 0 ? left : left.slice(0, gap), match = gap < 0 ? "" : left.slice(gap).trim();
    if (check !== "*" && !LINT_CHECKS.includes(check)) fail(`${where}: the check must be one of ${LINT_CHECKS.join(", ")} or *, not ${JSON.stringify(check)}`);
    if (!match) fail(`${where}: name the element or text to allow (a part of the printed selector and text), or *`);
    return [{ where: `${name}:${k + 1}`, check, match, range, reason, used: 0 }];
  });
}

// Runs in the page. Installs window.__lint: scan() moves through frames and measures how far the
// text moves; collect() describes the text on screen; mode() hides or marks every glyph for the
// next screenshot ("hide": transparent, "mark": magenta, "probe": only one element magenta).
function lintPage() {
  if (window.__lint) return;
  const W = window.innerWidth, H = window.innerHeight;
  const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "TITLE"]);
  const ids = new WeakMap(), byId = new Map();
  let nextId = 1;
  const idOf = (el) => { if (!ids.has(el)) ids.set(el, nextId++); return ids.get(el); };
  const range = document.createRange();

  // Elements that hold text themselves, each with its own non-blank text nodes.
  function textElements() {
    const groups = new Map();
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n; (n = walk.nextNode());) {
      const el = n.parentElement;
      if (!el || !/\S/.test(n.data) || SKIP.has(el.tagName) || el.closest("#motion-debug")) continue;
      if (groups.has(el)) groups.get(el).push(n); else groups.set(el, [n]);
    }
    return groups;
  }
  const opacityOf = (el) => { let op = 1; for (let e = el; e; e = e.parentElement) op *= Number(getComputedStyle(e).opacity); return op; };
  // One box per line of text, as drawn (camera included).
  function lineRects(el, nodes) {
    const out = [], add = (r) => r.width > 0.5 && r.height > 0.5 && out.push({ x0: r.left, y0: r.top, x1: r.right, y1: r.bottom });
    if (el instanceof SVGElement) add(el.getBoundingClientRect());
    else for (const n of nodes) { range.selectNodeContents(n); for (const r of range.getClientRects()) add(r); }
    return out;
  }
  // A short selector path: up to three steps, stopping at the nearest id.
  function step(e) {
    if (e.id) return `#${CSS.escape(e.id)}`;
    const cls = [...e.classList].filter((c) => !/^caption-(past|active|upcoming)$/.test(c)).slice(0, 2);
    let s = cls.length ? cls.map((c) => `.${CSS.escape(c)}`).join("") : e.localName;
    const p = e.parentElement;
    if (p) {
      const same = [...p.children].filter((c) => c.localName === e.localName);
      if (same.filter((c) => cls.every((k) => c.classList.contains(k))).length > 1) s += `:nth-of-type(${same.indexOf(e) + 1})`;
    }
    return s;
  }
  function selectorPath(el) {
    const parts = [];
    for (let e = el; e && e !== document.body && e !== document.documentElement; e = e.parentElement) {
      parts.unshift(step(e));
      if (e.id || parts.length === 3) break;
    }
    return parts.join(" > ") || el.localName;
  }
  // The boxes that clip this text: its own overflow, then each ancestor that clips it. An absolutely
  // positioned element escapes static ancestors until its containing block. The frame is added later.
  function clipBoxes(el, cs) {
    const out = [];
    let escape = null;
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      const s = e === el ? cs : getComputedStyle(e);
      const block = s.transform !== "none" || s.filter !== "none" || /paint|strict|content/.test(s.contain);
      if (e === el || !escape || (escape === "absolute" ? block || s.position !== "static" : block)) {
        escape = null;
        if (s.overflowX !== "visible" || s.overflowY !== "visible" || /paint|strict|content/.test(s.contain)) {
          const r = e.getBoundingClientRect();
          if (!(e === document.body || (r.left <= 0.5 && r.top <= 0.5 && r.right >= W - 0.5 && r.bottom >= H - 0.5))) {
            out.push({ by: selectorPath(e), box: { x0: r.left, y0: r.top, x1: r.right, y1: r.bottom } });
          }
        }
      }
      if (s.position === "fixed" || (!escape && s.position === "absolute")) escape = s.position;
    }
    return out;
  }
  // Size on screen: the font size times every scale between the text and the frame.
  function scaleOf(el) {
    if (el instanceof SVGGraphicsElement) {
      const m = el.getScreenCTM();
      if (m) return Math.sqrt(Math.abs(m.a * m.d - m.b * m.c));
    }
    let k = 1;
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const s = getComputedStyle(e);
      if (s.transform !== "none") { const m = new DOMMatrixReadOnly(s.transform); k *= Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)); }
      if (s.scale && s.scale !== "none") { const [x, y = x] = s.scale.split(/\s+/).map(Number); k *= Math.sqrt(Math.abs(x * y)); }
      const z = Number(s.zoom);
      if (z > 0 && z !== 1) k *= z;
    }
    return k;
  }
  // Any CSS color as [r, g, b, a]: rgb() and rgba() exactly, other spaces through a 1-pixel canvas.
  const swatch = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const colors = new Map();
  function rgba(css) {
    const m = css.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[,/]\s*([\d.]+)(%?)\s*)?\)$/);
    if (m) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : m[5] ? m[4] / 100 : +m[4]];
    if (!colors.has(css)) {
      swatch.clearRect(0, 0, 1, 1);
      swatch.fillStyle = "#000";
      swatch.fillStyle = css;
      swatch.fillRect(0, 0, 1, 1);
      const d = swatch.getImageData(0, 0, 1, 1).data;
      colors.set(css, [d[0], d[1], d[2], d[3] / 255]);
    }
    return colors.get(css);
  }
  function visible(el) {
    if (getComputedStyle(el).visibility !== "visible") return 0;
    return opacityOf(el);
  }

  async function scan(frames, fps) {
    const moved = [];
    let prev = null;
    for (const n of frames) {
      await window.seek(n / fps);
      const cur = new Map();
      for (const [el, nodes] of textElements()) {
        const op = visible(el);
        if (op < 0.1) continue;
        const rs = lineRects(el, nodes);
        if (!rs.length) continue;
        const len = nodes.reduce((s, x) => s + x.data.length, 0);
        cur.set(idOf(el), [Math.min(...rs.map((r) => r.x0)), Math.min(...rs.map((r) => r.y0)),
          Math.max(...rs.map((r) => r.x1)), Math.max(...rs.map((r) => r.y1)), op * 100, len * 10]);
      }
      // Pixels moved; 1 per 0.01 of opacity; a change of text, or text coming or going, is a big move.
      let d = 0;
      if (prev) {
        for (const [k, v] of cur) {
          const p = prev.get(k);
          if (!p) { d = 999; break; }
          for (let i = 0; i < v.length; i++) d = Math.max(d, Math.abs(v[i] - p[i]));
        }
        for (const k of prev.keys()) if (!cur.has(k)) d = 999;
      }
      moved.push(Math.min(999, +d.toFixed(3)));
      prev = cur;
    }
    return moved;
  }

  function collect() {
    byId.clear();
    const out = [];
    for (const [el, nodes] of textElements()) {
      const op = visible(el);
      if (op < 0.1) continue;
      const full = lineRects(el, nodes);
      if (!full.length) continue;
      const cs = getComputedStyle(el), svg = el instanceof SVGElement;
      const fill = svg && /^(rgb|#|color\()/.test(cs.fill) ? cs.fill : svg ? cs.color : cs.webkitTextFillColor || cs.color;
      const strokeW = parseFloat(cs.webkitTextStrokeWidth) || 0;
      let text = nodes.map((x) => x.data).join("").replace(/\s+/g, " ").trim();
      if (text.length > 48) text = `${text.slice(0, 47)}…`;
      const id = idOf(el);
      byId.set(id, el);
      out.push({ id, sel: selectorPath(el), text, op, full, clips: clipBoxes(el, cs), within: allowSel.filter((s) => el.closest(s)),
        size: parseFloat(cs.fontSize) * scaleOf(el), fill: rgba(fill), stroke: strokeW > 0 ? rgba(cs.webkitTextStrokeColor) : null });
    }
    return out;
  }

  // Glyph colors for the screenshots. Marks add a 3 px outline (which never moves the layout), so
  // even thin type has pixels it covers fully; there, how much of the mark shows is how much of the
  // text reaches the screen through opacity and anything translucent drawn over it.
  const sheet = document.createElement("style");
  const HIDE = "*,*::before,*::after{-webkit-text-fill-color:transparent!important;-webkit-text-stroke-color:transparent!important}" +
    "text,tspan,textPath{fill:transparent!important;stroke:transparent!important}";
  const mark = (c) => `*,*::before,*::after{-webkit-text-fill-color:${c}!important;-webkit-text-stroke:3px ${c}!important}` +
    `text,tspan,textPath{fill:${c}!important;stroke:${c}!important;stroke-width:3px!important}`;
  const PROBE = "[data-review-lint]{-webkit-text-fill-color:#ff00ff!important}" +
    "text[data-review-lint],tspan[data-review-lint],textPath[data-review-lint]{fill:#ff00ff!important}";
  function mode(m, id) {
    for (const el of document.querySelectorAll("[data-review-lint]")) el.removeAttribute("data-review-lint");
    if (!m) { sheet.remove(); return; }
    if (m === "probe") byId.get(id)?.setAttribute("data-review-lint", "");
    sheet.textContent = m === "magenta" ? mark("#ff00ff") : m === "green" ? mark("#00ff00") : m === "probe" ? HIDE + PROBE : HIDE;
    document.head.append(sheet);
  }
  // Allowed findings may name a box by CSS selector: text inside it matches.
  let allowSel = [];
  function allowIn(list) {
    allowSel = list.filter((s) => { try { document.querySelector(s); return true; } catch { return false; } });
  }
  window.__lint = { scan, collect, mode, allowIn };
}

// A PNG screenshot as raw pixels (8-bit RGB or RGBA, as Chromium writes them).
function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error("the screenshot is not a PNG");
  let pos = 8, w = 0, h = 0, depth = 0, type = 0, interlace = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), kind = buf.toString("latin1", pos + 4, pos + 8), body = buf.subarray(pos + 8, pos + 8 + len);
    if (kind === "IHDR") [w, h, depth, type, interlace] = [body.readUInt32BE(0), body.readUInt32BE(4), body[8], body[9], body[12]];
    else if (kind === "IDAT") idat.push(body);
    else if (kind === "IEND") break;
    pos += 12 + len;
  }
  if (depth !== 8 || (type !== 2 && type !== 6) || interlace) throw new Error(`cannot read a PNG of depth ${depth}, color type ${type}`);
  const ch = type === 6 ? 4 : 3, stride = w * ch, raw = zlib.inflateSync(Buffer.concat(idat)), data = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], s = y * (stride + 1) + 1, d = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? data[d + x - ch] : 0, b = y ? data[d - stride + x] : 0, c = x >= ch && y ? data[d - stride + x - ch] : 0;
      let v = raw[s + x];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      data[d + x] = v;
    }
  }
  return { w, h, ch, data };
}

const meet = (a, b) => {
  const r = { x0: Math.max(a.x0, b.x0), y0: Math.max(a.y0, b.y0), x1: Math.min(a.x1, b.x1), y1: Math.min(a.y1, b.y1) };
  return r.x1 > r.x0 && r.y1 > r.y0 ? r : null;
};
const rectArea = (r) => (r.x1 - r.x0) * (r.y1 - r.y0);
const rectUnion = (a, b) => ({ x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) });
// A line's box is taller than its glyphs (room for accents and descenders) and may include a
// space at either end, so edge checks allow 15% of its height and 2 px of its width.
const inkBox = (r) => { const v = Math.max(2, 0.15 * (r.y1 - r.y0)); return { x0: r.x0 + 2, y0: r.y0 + v, x1: r.x1 - 2, y1: r.y1 - v }; };
function sidesOutside(r, box) {
  const s = [];
  if (r.x1 > r.x0) { if (r.x0 < box.x0) s.push("left"); if (r.x1 > box.x1) s.push("right"); }
  if (r.y1 > r.y0) { if (r.y0 < box.y0) s.push("top"); if (r.y1 > box.y1) s.push("bottom"); }
  return s;
}

// Pixels in a page rect of `base` that differ from `top` (a screenshot whose top-left is at ox, oy)
// by more than 40 in some channel: the glyphs that `top` draws there.
function glyphCount(top, base, r, ox = 0, oy = 0) {
  const x0 = Math.max(0, Math.floor(r.x0), ox), y0 = Math.max(0, Math.floor(r.y0), oy);
  const x1 = Math.min(base.w, Math.ceil(r.x1), ox + top.w), y1 = Math.min(base.h, Math.ceil(r.y1), oy + top.h);
  let n = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = ((y - oy) * top.w + (x - ox)) * top.ch, j = (y * base.w + x) * base.ch;
      const d = Math.max(Math.abs(top.data[i] - base.data[j]), Math.abs(top.data[i + 1] - base.data[j + 1]), Math.abs(top.data[i + 2] - base.data[j + 2]));
      if (d > 40) n++;
    }
  }
  return n;
}

// The median color, channel by channel, of a grid of pixels inside the rects.
function medianColor(img, rects) {
  const chans = [[], [], []];
  for (const r of rects) {
    const x0 = Math.max(0, Math.ceil(r.x0) + 1), y0 = Math.max(0, Math.ceil(r.y0) + 1);
    const x1 = Math.min(img.w, Math.floor(r.x1) - 1), y1 = Math.min(img.h, Math.floor(r.y1) - 1);
    if (x1 <= x0 || y1 <= y0) continue;
    const sx = Math.max(1, Math.floor((x1 - x0) / 32)), sy = Math.max(1, Math.floor((y1 - y0) / 8));
    for (let y = y0; y < y1; y += sy) for (let x = x0; x < x1; x += sx) {
      const i = (y * img.w + x) * img.ch;
      for (let c = 0; c < 3; c++) chans[c].push(img.data[i + c]);
    }
  }
  if (!chans[0].length) return null;
  return chans.map((v) => v.sort((a, b) => a - b)[v.length >> 1]);
}

// The text as drawn. Over the pixels where its glyphs (marked magenta, then green) cover most, the
// difference between the two marks is q, the share of the text that reaches the screen. A pixel
// then shows hidden + a·(magenta − hidden + q·(color − magenta)) for a text color with alpha a: the
// computed color through opacity, blur and anything translucent drawn over it. Also returns the
// boxes around the glyphs that show, so a card covering part of a line is not its background.
function drawnColor(magenta, green, hidden, rects, [r, g, b, a]) {
  let best = -1, q = 0;
  const boxes = [];
  for (const rect of rects) {
    const x0 = Math.max(0, Math.floor(rect.x0)), y0 = Math.max(0, Math.floor(rect.y0));
    const x1 = Math.min(hidden.w, Math.ceil(rect.x1)), y1 = Math.min(hidden.h, Math.ceil(rect.y1));
    const ink = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = (y * hidden.w + x) * hidden.ch;
      const k = (magenta.data[i] - green.data[i] + green.data[i + 1] - magenta.data[i + 1] + magenta.data[i + 2] - green.data[i + 2]) / 765;
      if (k > q) [q, best] = [k, i];
      if (k > 0.1) Object.assign(ink, { x0: Math.min(ink.x0, x), y0: Math.min(ink.y0, y), x1: Math.max(ink.x1, x + 1), y1: Math.max(ink.y1, y + 1) });
    }
    if (ink.x1 > ink.x0) boxes.push(ink);
  }
  if (best < 0 || q < 0.05) return null;
  const M = [0, 1, 2].map((c) => magenta.data[best + c]), B = [0, 1, 2].map((c) => hidden.data[best + c]);
  const fg = [r, g, b].map((v, c) => Math.min(255, Math.max(0, Math.round(B[c] + a * (M[c] - B[c] + q * (v - [255, 0, 255][c]))))));
  return { fg, q: Math.min(1, q), boxes };
}

// WCAG 2 relative luminance and contrast ratio, for 8-bit sRGB colors.
const luminance = (c) => {
  const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => { const [x, y] = [luminance(a), luminance(b)]; return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const hexOf = (c) => `#${c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
const pct = (f) => `${Math.round(f * 100)}%`;

async function lint(src, o) {
  const { page, fps, width: W, height: H } = src;
  const every = numOpt(o, "every", Math.max(1, Math.round(fps / 2)), { min: 1, int: true });
  const minSize = numOpt(o, "min-size", +((28 * Math.min(W, H)) / 1080).toFixed(1), { min: 1 });
  const safe = safeArea(o, W, H);
  const allow = o.allow ? readAllow(o.allow) : [];
  const out = o.out ? outPath(o) : null;
  const frame = { x0: 0, y0: 0, x1: W, y1: H };
  const tty = process.stderr.isTTY;
  await page.evaluate(lintPage);
  await page.evaluate((list) => window.__lint.allowIn(list), allow.map((a) => a.match));

  // 1. Settle frames: the text stops moving and stays still for at least 0.25 s.
  const step = Math.max(1, Math.round(fps / 30));
  const scanned = [];
  for (let n = 0; n <= src.last; n += step) scanned.push(n);
  if (scanned.at(-1) !== src.last) scanned.push(src.last);
  if (tty) process.stderr.write(`lint: looking for settle frames in ${scanned.length} frames...`);
  const moved = await page.evaluate(({ frames, fps }) => window.__lint.scan(frames, fps), { frames: scanned, fps });
  const hold = Math.max(1, Math.ceil((0.25 * fps) / step));
  const settled = new Set();
  for (let j = 0; j < scanned.length - 1; j++) {
    if (j > 0 && moved[j] < 0.5) continue;   // still moving into this frame, or already at rest
    let still = true;
    for (let k = j + 1; k <= Math.min(scanned.length - 1, j + hold); k++) if (moved[k] >= 0.5) { still = false; break; }
    if (still) settled.add(scanned[j]);
  }

  // 2. Samples: every `every` frames, and every settle frame.
  const regular = [];
  for (let n = 0; n <= src.last; n += every) regular.push(n);
  const samples = [...new Set([...regular, ...settled])].sort((a, b) => a - b);
  const capture = async (clip) => decodePng(await page.screenshot({ type: "png", animations: "disabled", caret: "hide", timeout: 120_000, ...(clip ? { clip } : {}) }));
  const setMode = (m, id = null) => page.evaluate(([m, id]) => window.__lint.mode(m, id), [m, id]);
  const seen = new Map();   // finding key -> [{i: sample index, hit}]
  for (let i = 0; i < samples.length; i++) {
    const n = samples[i];
    if (tty) process.stderr.write(`\rlint: frame ${n} (${i + 1} of ${samples.length})                    `);
    const els = await page.evaluate(async (t) => { await window.seek(t); return window.__lint.collect(); }, src.timeOf(n));
    await setMode("hide");
    const hidden = await capture();
    await setMode("magenta");
    const marked = await capture();
    await setMode("green");
    const green = await capture();
    await setMode(null);

    const hits = [];
    let within = [];   // the allow selectors around the element being checked
    const add = (check, key, label, detail, rects) => hits.push({ check, key: `${check} ${key}`, label, detail, rects, within });
    // The text inside the frame and its clipping boxes.
    const inFrame = [];
    for (const e of els) {
      const clip = e.clips.reduce((a, c) => (a ? meet(a, c.box) : null), frame);
      const vis = clip ? e.full.map((r) => meet(r, clip)).filter(Boolean) : [];
      if (vis.length) inFrame.push({ ...e, vis, label: `${e.sel} "${e.text}"` });
    }
    // Texts whose boxes cross. In the all-magenta frame either one's glyphs could be the other's, so
    // each gets a screenshot of its own glyphs alone ("probe"). That also finds text under a card.
    const touching = [];
    for (let a = 0; a < inFrame.length; a++) {
      for (let b = a + 1; b < inFrame.length; b++) {
        let any = false, best = null;
        for (const ra of inFrame[a].vis) for (const rb of inFrame[b].vis) {
          const r = meet(ra, rb);
          if (!r || r.x1 - r.x0 <= 1 || r.y1 - r.y0 <= 1) continue;
          any = true;
          if (r.x1 - r.x0 > 2 && r.y1 - r.y0 > 0.3 * Math.min(ra.y1 - ra.y0, rb.y1 - rb.y0) && (!best || rectArea(r) > rectArea(best))) best = r;
        }
        if (any) touching.push({ a: inFrame[a], b: inFrame[b], r: best });
      }
    }
    const probes = new Map();
    for (const el of new Set(touching.flatMap((p) => [p.a, p.b]))) {
      const u = el.vis.reduce(rectUnion);
      const clip = { x: Math.floor(u.x0), y: Math.floor(u.y0), width: Math.ceil(u.x1) - Math.floor(u.x0), height: Math.ceil(u.y1) - Math.floor(u.y0) };
      await setMode("probe", el.id);
      probes.set(el, { img: await capture(clip), x: clip.x, y: clip.y });
    }
    if (probes.size) await setMode(null);
    const glyphsIn = (el, r) => { const p = probes.get(el); return p ? glyphCount(p.img, hidden, r, p.x, p.y) : glyphCount(marked, hidden, r); };
    const shown = new Set();
    for (const e of inFrame) {
      const vis = e.vis, area = vis.reduce((s, r) => s + rectArea(r), 0);
      if (vis.reduce((s, r) => s + glyphsIn(e, r), 0) < Math.max(6, 0.01 * area)) continue;   // covered
      shown.add(e);
      within = e.within;

      // Clipped: a line crosses the edge of a box that clips it, or of the frame.
      let cut = null;
      for (const r of e.full) {
        for (const c of [...e.clips, { by: "the frame", box: frame }]) {
          const sides = sidesOutside(inkBox(r), c.box);
          if (sides.length) { cut = { by: c.by, sides }; break; }
        }
        if (cut) break;
      }
      if (cut) {
        const seenPart = area / e.full.reduce((s, r) => s + rectArea(r), 0);
        add("clipped", e.id, e.label, `cut by ${cut.by} at the ${cut.sides.join(" and ")}; ${pct(seenPart)} shows`, vis);
      }
      // Safe area: margins, and the platform's bands.
      if (safe) {
        const where = new Set();
        const [l, t, r, b] = safe.margin;
        for (const v of vis) {
          const k = inkBox(v);
          for (const s of sidesOutside(k, { x0: l * W, y0: t * H, x1: (1 - r) * W, y1: (1 - b) * H })) {
            where.add(`the ${s} ${pct({ left: l, top: t, right: r, bottom: b }[s])}`);
          }
          for (const band of safe.bands) if (meet(k, { x0: band.x0 * W, y0: band.y0 * H, x1: band.x1 * W, y1: band.y1 * H })) where.add(band.name);
        }
        if (where.size) add("safe", e.id, e.label, `in ${[...where].join(" and ")} (${safe.name} safe area)`, vis);
      }
      // Small type, as drawn (camera included).
      if (e.size < minSize - 0.05) add("small", e.id, e.label, `${e.size.toFixed(1)} px, needs ${minSize} px`, vis);
      // Contrast: the text's computed color, as drawn, over the median of the real pixels behind it.
      const drawn = e.fill[3] > 0.01 ? drawnColor(marked, green, hidden, vis, e.fill) : null;
      const bg = drawn && medianColor(hidden, drawn.boxes.map((b) => ({ x0: b.x0 - 1, y0: b.y0 - 1, x1: b.x1 + 1, y1: b.y1 + 1 })));
      if (bg) {
        let { fg } = drawn, ratio = contrast(fg, bg);
        const strength = drawn.q * e.fill[3];
        let what = strength < 0.97 ? ` (${hexOf(e.fill)} showing at ${pct(strength)})` : "";
        if (e.stroke && e.stroke[3] > 0.01) {
          const s = drawnColor(marked, green, hidden, vis, e.stroke);
          if (s && contrast(s.fg, bg) > ratio) [fg, ratio, what] = [s.fg, contrast(s.fg, bg), " (its outline)"];
        }
        if (ratio < MIN_CONTRAST) add("contrast", e.id, e.label, `${ratio.toFixed(2)}:1, ${hexOf(fg)}${what} on ${hexOf(bg)}; needs ${MIN_CONTRAST}:1`, vis);
      }
    }
    // Overlap: two texts' lines cross, and each one's own glyphs show in the shared area.
    for (const p of touching) {
      if (p.r && shown.has(p.a) && shown.has(p.b) && glyphsIn(p.a, p.r) >= 6 && glyphsIn(p.b, p.r) >= 6) {
        const [x, y] = p.a.id < p.b.id ? [p.a, p.b] : [p.b, p.a];
        within = x.within.filter((s) => y.within.includes(s));
        add("overlap", `${x.id} ${y.id}`, `${x.label} × ${y.label}`, `${Math.round(rectArea(p.r))} px² shared`, [...x.vis, ...y.vis]);
      }
    }
    for (const h of hits) (seen.get(h.key) ?? seen.set(h.key, []).get(h.key)).push({ i, hit: h });
  }
  if (tty) process.stderr.write("\r\x1b[K");

  // 3. A finding counts when it holds on 2 samples in a row at least 0.2 s apart, or on a settle frame.
  const findings = [];
  let brief = 0;
  for (const [key, list] of seen) {
    const runs = [];
    for (const x of list) { const r = runs.at(-1); if (r && x.i === r.at(-1).i + 1) r.push(x); else runs.push([x]); }
    const settles = (r) => r.some((x) => settled.has(samples[x.i]));
    const kept = runs.filter((r) => settles(r) || (r.length >= 2 && src.timeOf(samples[r.at(-1).i] - samples[r[0].i]) >= 0.2 - 1e-9));
    brief += runs.length - kept.length;
    if (!kept.length) continue;
    // Its numbers and picture come from one sample: the first settle frame, else the middle of a run.
    const all = kept.flat();
    const rep = all.find((x) => settled.has(samples[x.i])) ?? kept[0][(kept[0].length - 1) >> 1];
    findings.push({
      key, check: rep.hit.check, label: rep.hit.label, detail: `at f${samples[rep.i]}: ${rep.hit.detail}`, within: rep.hit.within,
      spans: kept.map((r) => ({ f0: samples[r[0].i], f1: samples[r.at(-1).i], n: r.length, settled: settles(r) })),
      rep: { n: samples[rep.i], rects: rep.hit.rects },
    });
  }
  for (const f of findings) {
    const t0 = src.timeOf(f.spans[0].f0), t1 = src.timeOf(f.spans.at(-1).f1), slack = 1 / fps + 1e-6;
    f.allowed = allow.find((a) => (a.check === "*" || a.check === f.check) &&
      (a.match === "*" || f.label.includes(a.match) || f.within.includes(a.match)) &&
      (!a.range || (t0 >= a.range[0] - slack && t1 <= a.range[1] + slack))) ?? null;
    if (f.allowed) f.allowed.used++;
  }
  const order = (a, b) => a.spans[0].f0 - b.spans[0].f0 || LINT_CHECKS.indexOf(a.check) - LINT_CHECKS.indexOf(b.check) || a.label.localeCompare(b.label);
  const errors = findings.filter((f) => !f.allowed).sort(order), allowed = findings.filter((f) => f.allowed).sort(order);
  [...errors, ...allowed].forEach((f, k) => { f.no = k + 1; });

  // 4. Report.
  const spanText = (s) => (s.f0 === s.f1 ? `f${s.f0} (${sec(src.timeOf(s.f0))}` : `f${s.f0}–f${s.f1} (${secs(src.timeOf(s.f0), src.timeOf(s.f1))}`) +
    `, ${s.n} sample${s.n > 1 ? "s" : ""}${s.settled ? ", settled" : ""})`;
  const spansText = (f) => f.spans.slice(0, 3).map(spanText).join("; ") + (f.spans.length > 3 ? `; and ${f.spans.length - 3} more` : "");
  const lines = [
    `lint: ${src.name}  ${W}x${H} · ${sec(src.timeOf(src.last) + 1 / fps)} · ${fmtFps(fps)} fps`,
    `  ${samples.length} frames: every ${every} (${sec(every / fps)}), and ${settled.size} where the text settles`,
    `  ${safe ? `safe area ${safe.name}: ${safe.about}` : "no safe area (--safe to set one)"}; type ${minSize} px or larger; contrast ${MIN_CONTRAST}:1 or more`,
  ];
  const show = (f) => [`  ${String(f.no).padStart(2)}  ${f.check.padEnd(8)}  ${f.label}`, `        ${spansText(f)}: ${f.detail}`];
  if (errors.length) lines.push("", ...errors.flatMap(show));
  if (allowed.length) lines.push("", "allowed:", ...allowed.flatMap((f) => [...show(f), `        allowed by ${f.allowed.where}: ${f.allowed.reason}`]));
  const unused = allow.filter((a) => !a.used);
  if (unused.length) lines.push("", ...unused.map((a) => `note: ${a.where} (${a.check} ${a.match}) matched no finding`));
  const byCheck = LINT_CHECKS.map((c) => [c, errors.filter((f) => f.check === c).length]).filter(([, n]) => n).map(([c, n]) => `${n} ${c}`);
  lines.push("", `${errors.length ? `${errors.length} finding${errors.length > 1 ? "s" : ""} to fix (${byCheck.join(", ")})` : "no findings to fix"}, ` +
    `${allowed.length} allowed, ${brief} brief one${brief === 1 ? "" : "s"} ignored (on one sample while the text moves)`);
  if (out) lines.push(await lintImage(src, { out, findings: [...errors, ...allowed], safe, samples, settled }));
  console.log(lines.join("\n"));
  return errors.length ? 1 : 0;
}

// Each finding drawn on its frame: the settle frame where it shows, else the middle of its first run.
async function lintImage(src, { out, findings, safe, samples, settled }) {
  const W = src.width, H = src.height;
  const byFrame = new Map();
  for (const f of findings) (byFrame.get(f.rep.n) ?? byFrame.set(f.rep.n, []).get(f.rep.n)).push(f);
  const frames = [...byFrame.keys()].sort((a, b) => a - b).slice(0, 12);
  const extra = byFrame.size - frames.length;
  // Cells are sized for two wide frames or three square or tall ones across 2400 px.
  const pad = 48, gap = 28, cols = W > H * 1.2 ? 2 : 3;
  const cellW = Math.floor((MAX_SHEET_WIDTH - 2 * pad - (cols - 1) * gap) / cols), k = cellW / W, cellH = Math.round(H * k);
  const pngs = frames.length ? await src.grab(frames, cellW) : [];
  const box = (r, cls, no) => `<div class="box ${cls}" style="left:${((r.x0 - 3) * k).toFixed(1)}px;top:${((r.y0 - 3) * k).toFixed(1)}px;` +
    `width:${((r.x1 - r.x0 + 6) * k).toFixed(1)}px;height:${((r.y1 - r.y0 + 6) * k).toFixed(1)}px">${no ? `<b>${no}</b>` : ""}</div>`;
  const guide = safe ? (() => {
    const [l, t, r, b] = safe.margin;
    return `<div class="safe" style="left:${(l * W * k).toFixed(1)}px;top:${(t * H * k).toFixed(1)}px;width:${((1 - l - r) * W * k).toFixed(1)}px;height:${((1 - t - b) * H * k).toFixed(1)}px"></div>` +
      safe.bands.map((s) => `<div class="band" style="left:${(s.x0 * W * k).toFixed(1)}px;top:${(s.y0 * H * k).toFixed(1)}px;width:${((s.x1 - s.x0) * W * k).toFixed(1)}px;height:${((s.y1 - s.y0) * H * k).toFixed(1)}px"></div>`).join("");
  })() : "";
  const cells = frames.map((n, i) => {
    const list = byFrame.get(n);
    const boxes = list.map((f) => {
      const cls = f.allowed ? "ok" : "bad";
      const u = f.rep.rects.reduce(rectUnion);
      return f.check === "overlap" ? f.rep.rects.map((r) => box(r, `${cls} thin`, "")).join("") + box(u, cls, f.no) : box(u, cls, f.no);
    }).join("");
    const items = list.map((f) => `<li class="${f.allowed ? "ok" : "bad"}"><b>${f.no}</b><span class="c">${f.check}</span>` +
      `<span class="what">${esc(f.label)}</span><span class="d">${esc(f.allowed ? `allowed: ${f.allowed.reason}` : f.detail)}</span></li>`).join("");
    return `<figure class="cell"><div class="shot" style="width:${cellW}px;height:${cellH}px">
      <img class="frame-img" src="f${i}.png" width="${cellW}" height="${cellH}">${guide}${boxes}</div>
      <figcaption><div class="row1"><span class="k">Frame</span><span class="f">${n}</span><span class="t">${sec(src.timeOf(n))}</span>
        ${settled.has(n) ? `<span class="tag">settled</span>` : ""}</div><ol>${items}</ol></figcaption></figure>`;
  });
  const errs = findings.filter((f) => !f.allowed).length;
  const used = Math.max(1, Math.min(cols, frames.length));
  const width = 2 * pad + used * cellW + (used - 1) * gap;
  const html = `<!doctype html><meta charset="utf-8"><style>${BASE_CSS}
    body { width: ${Math.max(width, 1200)}px; }
    .grid { display: grid; grid-template-columns: repeat(${used}, ${cellW}px); gap: 40px ${gap}px; align-items: start; }
    .shot { position: relative; }
    .shot img { width: ${cellW}px; height: ${cellH}px; }
    .box { position: absolute; border-radius: 4px; border: 2.5px solid var(--critical); box-shadow: 0 0 0 1.5px rgba(255,255,255,0.9); }
    .box.ok { border-color: #8A8478; border-style: dashed; }
    .box.thin { border-width: 1.5px; box-shadow: none; opacity: 0.8; }
    .box b { position: absolute; left: -2px; top: -30px; min-width: 26px; height: 24px; padding: 0 7px; border-radius: 7px;
      display: grid; place-items: center; background: var(--critical); color: #fff; font-size: 15px; font-weight: 650; }
    .box.ok b { background: #8A8478; }
    .safe { position: absolute; border: 1.5px dashed rgba(47,106,87,0.7); border-radius: 2px; }
    .band { position: absolute; background: rgba(47,106,87,0.06); border: 1px dashed rgba(47,106,87,0.45); }
    figcaption { margin-top: 13px; padding: 0 2px; }
    .row1 { display: flex; align-items: baseline; gap: 10px; }
    .row1 .f { font-size: 23px; font-weight: 650; } .row1 .t { margin-left: 6px; font-size: 20px; color: var(--muted); }
    .tag { margin-left: auto; align-self: center; padding: 3px 10px 4px; border-radius: 999px; background: var(--pine-soft);
      color: var(--pine); font-size: 15px; font-weight: 600; }
    ol { list-style: none; margin-top: 10px; display: flex; flex-direction: column; gap: 8px; }
    li { display: grid; grid-template-columns: 30px 80px 1fr; column-gap: 10px; row-gap: 2px; align-items: baseline; font-size: 17px; color: var(--body); }
    li b { grid-row: span 2; justify-self: start; min-width: 26px; height: 24px; padding: 0 7px; border-radius: 7px; display: grid; place-items: center;
      background: var(--critical); color: #fff; font-size: 15px; font-weight: 650; }
    li.ok b { background: #8A8478; }
    li .c { font-weight: 600; color: var(--ink); }
    li .what { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    li .d { grid-column: 2 / 4; color: var(--muted); font-size: 16px; }
    .none { font-size: 22px; color: var(--muted); }
  </style>
  <header><div><div class="eyebrow">Lint</div><h1>${esc(src.meta.title || src.name)}</h1></div>
    <div class="meta"><b>${errs} to fix</b> · ${findings.length - errs} allowed<br>${samples.length} frames checked${safe ? ` · ${safe.name} safe area` : ""}</div></header>
  ${frames.length ? `<main class="grid">${cells.join("")}</main>` : `<p class="none">No findings.</p>`}
  ${extra > 0 ? `<p class="none" style="margin-top:28px">${extra} more frame${extra > 1 ? "s" : ""} with findings are printed, not drawn.</p>` : ""}`;
  const [w, h] = await compose(src.browser, { html, width: Math.max(width, 1200), out, assets: pngAssets(pngs, "f") });
  return `wrote ${out}  ${w}x${h}`;
}

// ---------- cuts ----------

// Runs in the page after a seek: every element the viewer can see, as [id, cx, cy, w, h, weight].
// The id is stable across seeks; the weight is the visible area times the opacity it shows with.
// Layers marked data-fx (the finish, a light leak, a wipe's band) are decoration, not the picture.
function cutsSample() {
  const ids = (window.__cutsIds ||= new WeakMap());
  const W = innerWidth, H = innerHeight, min = W * H * 0.0004;
  const alpha = new Map();
  const shows = (el) => {
    if (!el || el.nodeType !== 1) return 1;
    if (!alpha.has(el)) {
      const cs = getComputedStyle(el);
      alpha.set(el, cs.display === "none" ? 0 : Number(cs.opacity) * shows(el.parentElement));
    }
    return alpha.get(el);
  };
  const out = [];
  for (const el of document.body.querySelectorAll("*")) {
    if (/^(SCRIPT|STYLE|TEMPLATE)$/.test(el.tagName) || el.closest("[data-fx]")) continue;
    const r = el.getBoundingClientRect();
    const seen = Math.max(0, Math.min(r.right, W) - Math.max(r.left, 0)) * Math.max(0, Math.min(r.bottom, H) - Math.max(r.top, 0));
    if (seen < min || getComputedStyle(el).visibility !== "visible") continue;
    const a = shows(el);
    if (a < 0.02) continue;
    if (!ids.has(el)) ids.set(el, (window.__cutsNext = (window.__cutsNext || 0) + 1));
    out.push([ids.get(el), r.left + r.width / 2, r.top + r.height / 2, r.width, r.height, seen * a]);
  }
  return out;
}

// The picture's motion between two samples dt seconds apart: one translation (vx, vy in px/s) and
// one zoom rate (z, per second), fitted by weighted least squares to every element that moved,
// v = T + z (p - center), with each element's own change of size counted toward z. A zoom about
// any point is a zoom about the center plus a translation, so one fit covers pushes, pans and zooms.
function fitMotion(a, b, dt, W, H, still) {
  const before = new Map(a.map((e) => [e[0], e]));
  const S = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], R = [0, 0, 0];
  let moving = 0;
  for (const e of b) {
    const o = before.get(e[0]);
    if (!o) continue;
    const w = Math.min(o[5], e[5]);
    const vx = (e[1] - o[1]) / dt, vy = (e[2] - o[2]) / dt;
    const s = o[3] * o[4] > 0 && e[3] * e[4] > 0 ? Math.log((e[3] * e[4]) / (o[3] * o[4])) / 2 / dt : 0;
    if (Math.hypot(vx, vy) < still.v && Math.abs(s) < still.z) continue;
    moving += w;
    const px = (o[1] + e[1]) / 2 - W / 2, py = (o[2] + e[2]) / 2 - H / 2, lam = (Math.hypot(e[3], e[4]) / 2) ** 2;
    S[0][0] += w; S[1][1] += w; S[0][2] += w * px; S[1][2] += w * py; S[2][2] += w * (px * px + py * py + lam);
    R[0] += w * vx; R[1] += w * vy; R[2] += w * (px * vx + py * vy + lam * s);
  }
  if (!moving) return { vx: 0, vy: 0, z: 0 };
  S[2][0] = S[0][2]; S[2][1] = S[1][2];
  // Cramer's rule; the matrix is positive definite whenever anything moved.
  const det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
    + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const D = det(S);
  const col = (k) => det(S.map((row, i) => row.map((x, j) => (j === k ? R[i] : x))));
  return { vx: col(0) / D, vy: col(1) / D, z: col(2) / D };
}

const ARROWS = ["→", "↘", "↓", "↙", "←", "↖", "↑", "↗"];
const arrowOf = (m) => ARROWS[(Math.round(Math.atan2(m.vy, m.vx) / (Math.PI / 4)) + 8) % 8];

// One side of an edit against the other: a speed ratio above 3x, or a direction (or zoom) that
// reverses while both sides clearly move, is a warning. Still counts as the still threshold, so
// still against slow passes and still against fast does not.
function judgeSides(a, b, still) {
  const sa = Math.hypot(a.vx, a.vy), sb = Math.hypot(b.vx, b.vy), za = Math.abs(a.z), zb = Math.abs(b.z);
  const ratio = (x, y, f) => Math.max(x, y, f) / Math.max(Math.min(x, y), f);
  const rv = ratio(sa, sb, still.v), rz = ratio(za, zb, still.z);
  const notes = [];
  if (rv > 3) notes.push(`speed ${rv.toFixed(1)}×`);
  if (rz > 3) notes.push(`zoom speed ${rz.toFixed(1)}×`);
  if (sa > 2 * still.v && sb > 2 * still.v && (a.vx * b.vx + a.vy * b.vy) / (sa * sb) < -0.5) {
    notes.push(`direction reverses ${arrowOf(a)} then ${arrowOf(b)}`);
  }
  if (za > 2 * still.z && zb > 2 * still.z && Math.sign(a.z) !== Math.sign(b.z)) {
    notes.push(`zoom reverses (${a.z > 0 ? "in" : "out"} then ${b.z > 0 ? "in" : "out"})`);
  }
  return { notes, ratio: Math.max(rv, rz) };
}

async function cuts(src, o) {
  const out = outPath(o);
  const { fps, width: W, height: H } = src;
  const still = { v: 0.001 * W * fps, z: 0.001 * fps };   // under 0.1% of the width, or of the size, per frame
  const span = Math.max(1, Math.round(fps / 15));           // frames each side is measured over
  const step = Math.max(1, Math.round(fps / 20));           // frames between cells of a cut's strip
  const declared = await src.page.evaluate(async () => {
    await window.seek(0);   // a page that calls transition() inside seek registers it on the first frame
    return { cuts: (window.VIDEO?.cuts ?? []).map(Number).filter(Number.isFinite),
      transitions: (window.TRANSITIONS ?? []).map((x) => ({ kind: x.kind, at: x.at, dur: x.dur, end: x.end, handoff: x.handoff, dir: x.dir })) };
  });
  const firstAt = (t) => src.clamp(Math.ceil(t * fps - 1e-6));   // the first frame that shows time t or later
  const edits = [], notes = [];
  for (const c of declared.cuts) edits.push({ kind: "cut", at: c, end: c, listed: true });
  for (const x of declared.transitions) {
    if (x.kind === "cut") {
      if (!edits.some((e) => e.kind === "cut" && Math.abs(e.at - x.at) < 0.5 / fps)) {
        edits.push({ kind: "cut", at: x.at, end: x.at, listed: false });
        notes.push(`the cut at ${sec(x.at)} is not in VIDEO.cuts, so motion blur blends its two shots; add film.cuts to VIDEO.cuts`);
      }
      continue;
    }
    edits.push({ ...x });
    for (const c of declared.cuts) {
      if (c > x.at + 1e-6 && c < x.end - 1e-6) notes.push(`VIDEO.cuts lists ${sec(c)}, inside the ${x.kind} from ${sec(x.at)} to ${sec(x.end)}; a transition is not a hard cut`);
    }
  }
  edits.sort((a, b) => a.at - b.at);
  if (!edits.length) {
    console.log("no cuts: the page lists no VIDEO.cuts and uses no transitions from transitions.js (window.TRANSITIONS)");
    return 0;
  }

  // Samples by frame, each taken once; screenshots only for the strip's cells.
  const samples = new Map(), pngs = new Map();
  const sampleAt = async (n, png = false) => {
    n = src.clamp(n);
    if (png && !pngs.has(n)) {
      pngs.set(n, await shot(src.page, n / fps, { type: "png" }));
      samples.set(n, await src.page.evaluate(cutsSample));
    } else if (!samples.has(n)) {
      await src.page.evaluate((t) => window.seek(t), n / fps);
      samples.set(n, await src.page.evaluate(cutsSample));
    }
    return samples.get(n);
  };
  const motion = async (n0, n1) => {
    [n0, n1] = [src.clamp(n0), src.clamp(n1)];
    if (n1 <= n0) return { vx: 0, vy: 0, z: 0 };
    return fitMotion(await sampleAt(n0), await sampleAt(n1), (n1 - n0) / fps, W, H, still);
  };
  // Before an edit at time t: the last span frames that show the old picture. After: the first.
  const across = async (name, t) => {
    const F = firstAt(t), L = F - 1;
    const a = await motion(L - span, L), b = await motion(F, F + span);
    return { name, t, F, a, b, ...judgeSides(a, b, still) };
  };

  const rows = [];
  for (const e of edits) {
    const points = e.kind === "cut" ? [await across("cut", e.at)]
      : [await across("start", e.at), await across("handoff", e.handoff), await across("end", e.end)];
    // The strip: four frames each side of a cut, or the transition from just before to just after.
    let cells;
    if (e.kind === "cut") {
      const F = firstAt(e.at);
      cells = [-4, -3, -2, -1].map((k) => ({ n: F + (k + 1) * step - 1, side: "before" }))
        .concat([0, 1, 2, 3].map((k) => ({ n: F + k * step, side: "after", tag: k ? "" : "cut" })));
    } else {
      const F = (t) => firstAt(t);
      cells = [
        { n: F(e.at - 0.1) }, { n: F(e.at), tag: "start" }, { n: F(e.at + 0.25 * e.dur) },
        { n: F(e.handoff) - 1 }, { n: F(e.handoff), tag: "handoff" }, { n: F(e.at + 0.75 * e.dur) },
        { n: F(e.end) - 1 }, { n: F(e.end), tag: "end" }, { n: F(e.end + 0.1) },
      ];
    }
    cells = cells.map((c) => ({ ...c, n: src.clamp(c.n) })).filter((c, i, all) => all.findIndex((d) => d.n === c.n) === i);
    for (const c of cells) {
      await sampleAt(c.n, true);
      // Each cell's own motion, measured without crossing a hard cut.
      c.m = c.side === "after" ? await motion(c.n, c.n + 1) : await motion(c.n - 1, c.n);
    }
    rows.push({ e, points, cells });
  }

  // Text.
  const pf = (v) => (v / fps).toFixed(1);
  const fmtM = (m) => {
    const v = Math.hypot(m.vx, m.vy), parts = [];
    if (v >= still.v) parts.push(`${arrowOf(m)} ${pf(v)}`);
    if (Math.abs(m.z) >= still.z) parts.push(`zoom ${m.z > 0 ? "+" : "−"}${(Math.abs(m.z) / fps * 100).toFixed(1)}%`);
    return parts.length ? parts.join(" ") : "still";
  };
  const what = (e) => (e.kind === "cut" ? "cut" : `${e.kind}${e.dir ? ` ${e.dir}` : ""} ${e.dur.toFixed(2)} s`);
  const frames = (e) => (e.kind === "cut" ? `f${firstAt(e.at) - 1}|f${firstAt(e.at)}` : `f${firstAt(e.at)}–f${firstAt(e.end)}`);
  const warned = rows.filter((r) => r.points.some((p) => p.notes.length)).length;
  const nCuts = edits.filter((e) => e.kind === "cut").length, nTr = edits.length - nCuts;
  const lines = [`cuts: ${nCuts} cut${nCuts === 1 ? "" : "s"} and ${nTr} transition${nTr === 1 ? "" : "s"} in ${src.name}; ` +
    `motion over ${span} frames each side at ${fmtFps(fps)} fps (px per frame; still is under ${pf(still.v)})`];
  for (const { e, points } of rows) {
    const bad = points.filter((p) => p.notes.length);
    const detail = points.map((p) => `${points.length > 1 ? `${p.name} ` : ""}${fmtM(p.a)} → ${fmtM(p.b)}${p.notes.length ? ` (${p.notes.join(", ")})` : ""}`).join(" · ");
    lines.push(`  ${sec(e.at).padStart(8)}  ${frames(e).padEnd(11)}  ${what(e).padEnd(26)}  ${bad.length ? "WARN" : "ok  "}  ${detail}`);
  }
  for (const n of notes) lines.push(`  note: ${n}`);
  lines.push(warned ? `${warned} of ${rows.length} edits warn: match the speed and direction on each side, or hold still before a fast start` : `all ${rows.length} edits keep their motion across`);

  // The image: one row per edit, its verdicts above a strip of frames with each frame's motion.
  const n = Math.max(...rows.map((r) => r.cells.length)), pad = 48, gap = 12;
  const cellW = Math.floor((MAX_SHEET_WIDTH - 2 * pad - (n - 1) * gap) / n), cellH = Math.round((cellW * H) / W);
  const all = rows.flatMap((r) => r.cells.map((c) => c.n)).filter((x, i, a) => a.indexOf(x) === i);
  const scaled = await pool(all, 4, (f) => scalePng(pngs.get(f), cellW));
  const file = new Map(all.map((f, i) => [f, `c${i}.png`]));
  const glyph = (m) => {
    const v = Math.hypot(m.vx, m.vy), zoom = Math.abs(m.z) >= still.z;
    if (v < still.v && !zoom) return `<svg class="g" viewBox="-14 -14 28 28"><circle r="3" class="dot"/></svg>`;
    const len = v < still.v ? 0 : 5 + 8 * Math.min(1, Math.log10(1 + v / fps) / Math.log10(201));
    const ang = (Math.atan2(m.vy, m.vx) * 180) / Math.PI;
    const ring = zoom ? `<circle r="11" class="ring"/><path class="ring" d="${m.z > 0 ? "M-4 0H4M0 -4V4" : "M-4 0H4"}"/>` : "";
    const arrow = len ? `<g transform="rotate(${ang.toFixed(1)})"><path class="arrow" d="M${-len} 0H${len - 1}M${len - 6} -5L${len} 0L${len - 6} 5"/></g>` : "";
    return `<svg class="g" viewBox="-14 -14 28 28">${ring}${arrow}</svg>`;
  };
  const chip = (p) => `<span class="st ${p.notes.length ? "bad" : "ok"}"><i>${p.notes.length ? "!" : "✓"}</i>${esc(p.name)}` +
    `<em>${esc(p.notes.length ? p.notes.join(", ") : `${fmtM(p.a)} → ${fmtM(p.b)}`)}</em></span>`;
  const html = `<!doctype html><meta charset="utf-8"><style>${BASE_CSS}
    body { width: ${2 * pad + n * cellW + (n - 1) * gap}px; }
    .edit { margin-bottom: 34px; padding-top: 22px; border-top: 1px solid var(--line); }
    .head { display: flex; align-items: baseline; gap: 16px; margin-bottom: 12px; }
    .head .t { font-size: 24px; font-weight: 650; } .head .w { font-size: 22px; font-weight: 550; color: var(--body); }
    .head .f { font-size: 18px; color: var(--muted); }
    .sts { display: flex; flex-wrap: wrap; gap: 8px 10px; margin-bottom: 16px; }
    .st { display: inline-flex; align-items: center; gap: 8px; padding: 4px 12px 4px 6px; border-radius: 999px;
      background: #E9E6E0; color: var(--ink); font-size: 16px; font-weight: 600; }
    .st em { font-style: normal; font-weight: 450; color: var(--body); }
    .st i { width: 20px; height: 20px; border-radius: 50%; display: grid; place-items: center; color: #fff;
      font-style: normal; font-size: 13px; font-weight: 700; }
    .st.ok i { background: var(--good); } .st.bad i { background: var(--critical); } .st.bad { background: #F6E1DE; }
    .strip { display: grid; grid-template-columns: repeat(${n}, ${cellW}px); gap: ${gap}px; }
    .cell { position: relative; }
    .cell img { width: ${cellW}px; height: ${cellH}px; }
    .cell.cut::before { content: ""; position: absolute; left: ${-gap / 2 - 1.5}px; top: -6px; bottom: -6px; width: 3px;
      border-radius: 2px; background: var(--critical); }
    .tag { position: absolute; left: 8px; top: 8px; padding: 2px 8px 3px; border-radius: 6px; background: rgba(22,21,19,0.82);
      color: #fff; font-size: 14px; font-weight: 600; letter-spacing: 0.02em; }
    .cap { margin-top: 8px; display: flex; align-items: center; gap: 6px; font-size: 15px; color: var(--muted); white-space: nowrap; overflow: hidden; }
    .cap b { font-weight: 600; color: var(--ink); }
    .g { width: 24px; height: 24px; flex: none; overflow: visible; }
    .g .arrow, .g .ring { fill: none; stroke: var(--ink); stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
    .g .dot { fill: var(--faint); }
  </style>
  <header><div><div class="eyebrow">Cut check</div><h1>${esc(src.name)}</h1></div>
    <div class="meta"><b>${rows.length} edit${rows.length === 1 ? "" : "s"}${warned ? ` · ${warned} warn` : " · all keep their motion"}</b><br>` +
    `${fmtFps(fps)} fps · ${W}×${H} · motion over ${span} frames each side</div></header>
  ${rows.map(({ e, points, cells }) => `<section class="edit">
    <div class="head"><span class="t">${sec(e.at)}</span><span class="w">${esc(what(e))}</span><span class="f">${frames(e)}</span></div>
    <div class="sts">${points.map(chip).join("")}</div>
    <div class="strip">${cells.map((c) => `<figure class="cell${c.tag === "cut" ? " cut" : ""}">
      <img class="frame-img" src="${file.get(c.n)}">${c.tag ? `<span class="tag">${c.tag}</span>` : ""}
      <figcaption class="cap"><b>f${c.n}</b>${glyph(c.m)}<span>${esc(fmtM(c.m))}</span></figcaption></figure>`).join("")}</div>
  </section>`).join("")}`;
  const assets = Object.fromEntries(all.map((f, i) => [file.get(f), { body: scaled[i], type: "image/png" }]));
  const [w, h] = await compose(src.browser, { html, width: 2 * pad + n * cellW + (n - 1) * gap, out, assets });
  console.log(`${lines.join("\n")}\nwrote ${out}  ${w}x${h}`);
  return 0;
}

// ---------- main ----------

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) { console.log(usage()); return 0; }
  if (!argv.length) { console.error(usage()); return 1; }
  const { pos, o } = parseArgs(argv);
  const [cmd, input, extra] = pos;
  if (!COMMANDS[cmd]) fail(`${cmd ? `unknown command ${JSON.stringify(cmd)}` : "no command"}; use board, sheet, onion, graph, holds, audit, lint or cuts (--help shows how)`);
  const pageOnly = ["board", "graph", "audit", "lint", "cuts"].includes(cmd);
  if (!input) fail(`${cmd} needs a ${pageOnly ? "page (.html)" : cmd === "holds" ? "video" : "page or video"} to read`);
  if (extra) fail(`unexpected argument ${JSON.stringify(extra)}`);
  for (const k of Object.keys(o)) if (!COMMANDS[cmd].includes(k)) fail(`--${k} does not apply to ${cmd}`);
  const file = path.resolve(input);
  if (cmd === "holds") { await holds(file, o); return 0; }
  checkEarly(cmd, file, o);
  const src = await openSource(file, o);
  try {
    if (src.kind === "video" && o.fps !== undefined) console.warn(`note: a video keeps its own ${fmtFps(src.fps)} fps; --fps applies to pages`);
    if (cmd === "audit") return await audit(src, o);
    if (cmd === "lint") return await lint(src, o);
    if (cmd === "cuts") return await cuts(src, o);
    await { board, sheet, onion, graph }[cmd](src, o);
  } finally {
    await src.close();
  }
  return 0;
}

// Check the options before starting the browser, so a bad call fails at once.
function checkEarly(cmd, file, o) {
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) fail(`no such file: ${file}`);
  if (cmd === "graph" && !isPagePath(file)) fail("graph reads the element from the page's DOM, so it needs the page (.html), not a video");
  if (cmd === "board" && !isPagePath(file)) fail("board renders the page's shots through seek(t), so it needs the page (.html)");
  if (cmd === "cuts" && !isPagePath(file)) fail("cuts measures motion in the page's DOM, so it needs the page (.html)");
  if (cmd === "audit") {
    if (!isPagePath(file)) fail("audit runs the page's own checks, so it needs the page (.html)");
    if (o.grep !== undefined && !o.grep.trim()) fail("--grep needs some text to look for in the check names");
    return;
  }
  if (cmd === "lint") {
    if (!isPagePath(file)) fail("lint measures the text in the page's DOM, so it needs the page (.html)");
    if (o.safe !== undefined && o.safe !== "off" && !SAFE[o.safe]) fail(`--safe must be one of ${Object.keys(SAFE).join(", ")} or off, not ${JSON.stringify(o.safe)}`);
    if (o.allow !== undefined) readAllow(o.allow);
    if (o.out !== undefined) outPath(o);
    return;
  }
  if (cmd === "board") {
    if (o.out !== undefined) outPath(o);
    if (o.count !== undefined && !o.look) fail("--count sets the number of look frames; use it with --look");
    if (o.count !== undefined && o.at !== undefined && o.at !== "stills") fail("use --at or --count for look frames, not both");
    return;
  }
  if (cmd === "cuts" && !isPagePath(file)) fail("cuts reads VIDEO.cuts, the transitions and the elements' motion from the page, so it needs the page (.html)");
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
