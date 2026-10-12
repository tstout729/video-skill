#!/usr/bin/env node
// Render a seek(t) HTML page to MP4 with Playwright + ffmpeg.
//
//   node render.mjs <page.html> --out video.mp4 [--fps 60] [--sub 4] [--workers 4]   (defaults: VIDEO.fps, VIDEO.sub)
//   node render.mjs <page.html> --stills qa/ [--at 1.5,3,4.2 | --every 0.5]
//   node render.mjs <page.html> --out draft.mp4 --fps 30 --sub 1 --scale 0.5 --debug   (fast draft)
//   node render.mjs <page.html> --serve [--port 8080]       preview in a browser (?t=12.5, ?debug=1)
//
// The page must define window.VIDEO = {width, height, duration, cuts?} and window.seek(t); see
// page.mjs for what the local server serves. --debug adds ?debug=1, which shows the frame
// number, time and current cue on every frame (motion.js), for drafts only.
// Motion blur: each output frame averages `sub` subframes spread across `shutter` of the frame
// interval (ffmpeg tmix, in linear light), so 60fps x 4 = 240 page screenshots per second of video.
// A loop renders frames 0..N-1 and never frame N, which would repeat frame 0 at the seam.
// Work is split into time chunks rendered by parallel pages; chunks are joined
// losslessly. window.SFX (if any) is written next to the output as <out>.sfx.json.

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { serve, launch, openVideoPage, shot } from "./page.mjs";

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : dflt;
};
const page = path.resolve(args[0] ?? "");
if (!args[0] || !fs.existsSync(page)) {
  console.error("usage: render.mjs <page.html> --out video.mp4 | --stills dir | --serve");
  process.exit(1);
}
// fps and sub default to the page's VIDEO.fps and VIDEO.sub (a stepped style sets 24 and 1), else 60 and 4.
let fps = Number(opt("fps", 0));
let sub = Number(opt("sub", 0));
const scale = Number(opt("scale", 1));
const workers = Number(opt("workers", process.env.RENDER_WORKERS || Math.max(2, Math.min(6, os.cpus().length - 2))));
// Fraction of the frame interval the subframes cover. 1 = 360-degree shutter (heavy blur;
// fast camera moves ghost text into doubled copies). 0.4 = 144 degrees: smooth, still legible.
const shutter = Number(opt("shutter", 0.4));
const out = opt("out");
const stills = opt("stills");
const from = Number(opt("from", 0));
const query = args.includes("--debug") ? "debug=1" : "";
// --blur gamma averages subframes in gamma space (the older look); linear is the default.
const linear = opt("blur", "linear") !== "gamma";

const { server, url } = await serve(page, Number(opt("port", 0)));
if (args.includes("--serve")) {
  console.log(`serving ${url}  (?t=12.5 freezes one moment, ?debug=1 shows frame, time and cue; Ctrl-C to stop)`);
  await new Promise(() => {});
}

const browser = await launch();
const first = await openVideoPage(browser, url, { scale, query });
const { video } = first;
const duration = Number(opt("to", video.duration));
fps ||= Number(video.fps) || 60;
sub ||= Number(video.sub) || 4;
const cuts = (video.cuts ?? []).map(Number).filter(Number.isFinite).sort((a, b) => a - b);

// Selectors that style() could not find are usually typos ("title" for "#title").
const missing = await first.p.evaluate(async (d) => {
  for (const t of [0, d / 4, d / 2, (3 * d) / 4, d]) await window.seek(t);
  return [...(window.STYLE_MISSING || [])];
}, video.duration);
if (missing.length) console.warn(`warning: style() selectors that match nothing: ${missing.join(", ")}`);

if (stills) {
  fs.mkdirSync(stills, { recursive: true });
  const every = Number(opt("every", 0));
  let times = (opt("at") ?? "").split(",").filter(Boolean).map(Number);
  if (!times.length && every) for (let t = from; t < duration; t += every) times.push(+t.toFixed(3));
  if (!times.length) times = video.stills ?? [0];
  for (const t of times) {
    const buf = await shot(first.p, t);
    fs.writeFileSync(path.join(stills, `t${t.toFixed(2).padStart(7, "0")}.jpg`), buf);
  }
  console.log(`${times.length} stills -> ${stills}`);
  await browser.close();
  server.close();
  process.exit(0);
}

if (!out) { console.error("--out or --stills required"); process.exit(1); }
const frames = Math.round((duration - from) * fps);
// Split frames evenly; recount chunks so none is empty (15 frames over 6 workers is 5 chunks of 3).
const per = Math.ceil(frames / Math.min(workers, frames));
const chunks = Math.ceil(frames / per);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "uimotion-"));
process.on("exit", () => fs.rmSync(tmp, { recursive: true, force: true }));  // also after a crash
const started = Date.now();
let done = 0;

async function renderChunk(index, ctx) {
  const k0 = index * per, k1 = Math.min(frames, k0 + per);
  const file = path.join(tmp, `c${String(index).padStart(3, "0")}.mp4`);
  // Subframes are averaged in linear light, as a film camera's shutter does: bright edges stay
  // bright instead of dulling to gray. 16-bit RGB keeps the dark tones exact.
  const toLinear = "lutrgb=r='pow(val/65535\\,2.2)*65535':g='pow(val/65535\\,2.2)*65535':b='pow(val/65535\\,2.2)*65535'";
  const toGamma = "lutrgb=r='pow(val/65535\\,1/2.2)*65535':g='pow(val/65535\\,1/2.2)*65535':b='pow(val/65535\\,1/2.2)*65535'";
  const select = `select='eq(mod(n\\,${sub})\\,${sub - 1})',setpts=N/(${fps}*TB)`;
  const blur = sub <= 1 ? ""
    : linear ? `format=gbrp16le,${toLinear},tmix=frames=${sub},${select},${toGamma},`
    : `tmix=frames=${sub},${select},`;
  // Screenshots are full-range JPEG. Convert to standard (limited) range, which every player,
  // including iPhones and Safari, decodes the same way.
  // H.264 needs even dimensions: a half-scale 1080x1350 page is 540x675, so round down to even.
  const filter = `${blur}scale=w=trunc(iw/2)*2:h=trunc(ih/2)*2:in_range=pc:out_range=tv,format=yuv420p`;
  const ff = spawn("ffmpeg", [
    "-v", "error", "-y", "-f", "image2pipe", "-framerate", String(fps * sub), "-c:v", "mjpeg", "-i", "-",
    "-vf", filter, "-r", String(fps), "-c:v", "libx264", "-preset", "medium", "-crf", "15",
    "-color_range", "tv", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", file,
  ], { stdio: ["pipe", "inherit", "inherit"] });
  const closed = new Promise((res, rej) => ff.on("close", (c) => (c ? rej(new Error(`ffmpeg ${c}`)) : res())));
  for (let k = k0; k < k1; k++) {
    for (let j = 0; j < sub; j++) {
      // Subframes span `shutter` of the frame interval, ending at the frame time. A hard cut
      // (VIDEO.cuts) inside that span would blend the two shots, so subframes before it move
      // to the cut: the first frame of a shot is all new shot, as a camera cut is.
      const tFrame = from + k / fps;
      let t = Math.max(from, from + (k + ((j + 1 - sub) / sub) * shutter) / fps);
      for (const c of cuts) if (t < c && c <= tFrame + 1e-9) t = c;
      const buf = await shot(ctx.p, t);
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    }
    done++;
    if (done % fps === 0) {
      const rate = done / ((Date.now() - started) / 1000);
      process.stdout.write(`\r${done}/${frames} frames  ${rate.toFixed(1)} fps  eta ${((frames - done) / rate).toFixed(0)}s   `);
    }
  }
  ff.stdin.end();
  await closed;
  return file;
}

const contexts = [first];
for (let i = 1; i < chunks; i++) contexts.push(await openVideoPage(browser, url, { scale, query }));
const files = await Promise.all(contexts.map((c, i) => renderChunk(i, c)));
await browser.close();
server.close();

const list = path.join(tmp, "list.txt");
fs.writeFileSync(list, files.map((f) => `file '${f}'\n`).join(""));
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
await new Promise((res, rej) => spawn("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", list,
  "-c", "copy", "-movflags", "+faststart", out], { stdio: "inherit" }).on("close", (c) => (c ? rej(new Error("concat")) : res())));
fs.writeFileSync(out.replace(/\.mp4$/, "") + ".sfx.json", JSON.stringify(first.sfx, null, 1));
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${out}  ${frames} frames @ ${fps}fps x${sub}  ${((Date.now() - started) / 1000).toFixed(0)}s`);
