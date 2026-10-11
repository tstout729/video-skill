#!/usr/bin/env node
// Render a seek(t) HTML page to MP4 with Playwright + ffmpeg.
//
//   node render.mjs <page.html> --out video.mp4 [--fps 60] [--sub 4] [--workers 4]
//   node render.mjs <page.html> --stills qa/ [--at 1.5,3,4.2 | --every 0.5]
//   node render.mjs <page.html> --out draft.mp4 --fps 30 --sub 1 --scale 0.5   (fast draft)
//
// The page is served over a local HTTP server (ES modules do not load from file://):
//   /            the page's own folder
//   /_skill/     this skill's folder, so pages import /_skill/runtime/motion.js
// `node render.mjs <page.html> --serve` just serves it for previewing in a browser.
// The page must define window.VIDEO = {width, height, duration} and window.seek(t).
// Motion blur: each output frame averages `sub` subframes spread across the frame
// interval (ffmpeg tmix), so 60fps x 4 = 240 page screenshots per second of video.
// Work is split into time chunks rendered by parallel pages; chunks are joined
// losslessly. window.SFX (if any) is written next to the output as <out>.sfx.json.

import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  // Only trusted install locations; never the current folder, whose node_modules could
  // run arbitrary code. PLAYWRIGHT_DIR overrides (a folder that contains node_modules).
  // scripts/setup.sh installs Playwright into the skill's cache folder.
  const cache = process.env.VIDEO_SKILL_HOME ||
    path.join(process.env.XDG_CACHE_HOME || path.join(os.homedir(), ".cache"), "video-skill");
  const roots = [];
  if (process.env.PLAYWRIGHT_DIR) roots.push(process.env.PLAYWRIGHT_DIR);
  roots.push(cache);
  try { roots.push(execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim()); } catch {}
  for (const root of roots) {
    try { return require(require.resolve("playwright", { paths: [root] })); } catch {}
  }
  throw new Error("Playwright not found. Run the skill's scripts/setup.sh once to install it.");
}

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : dflt;
};
const page = path.resolve(args[0] ?? "");
if (!args[0] || !fs.existsSync(page)) {
  console.error("usage: render.mjs <page.html> --out video.mp4 | --stills dir");
  process.exit(1);
}
const fps = Number(opt("fps", 60));
const sub = Number(opt("sub", 4));
const scale = Number(opt("scale", 1));
const workers = Number(opt("workers", process.env.RENDER_WORKERS || Math.max(2, Math.min(6, os.cpus().length - 2))));
// Fraction of the frame interval the subframes cover. 1 = 360-degree shutter (heavy blur;
// fast camera moves ghost text into doubled copies). 0.4 = 144 degrees: smooth, still legible.
const shutter = Number(opt("shutter", 0.4));
const out = opt("out");
const stills = opt("stills");
const from = Number(opt("from", 0));

const SKILL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Text is served as UTF-8, so pages in any language keep their accents.
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".woff2": "font/woff2", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".wav": "audio/wav" };
const server = http.createServer((req, res) => {
  // Answer only requests addressed to this machine by name or IP: a web page that rebinds
  // its own domain to 127.0.0.1 (DNS rebinding) still sends its domain as the Host.
  if (!/^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(req.headers.host || "")) {
    res.writeHead(403).end();
    return;
  }
  let url;
  try { url = decodeURIComponent(new URL(req.url, "http://x").pathname); } catch { res.writeHead(400).end(); return; }
  const [root, rel] = url.startsWith("/_skill/") ? [SKILL, url.slice(8)] : [path.dirname(page), url.slice(1)];
  const file = path.resolve(root, rel || path.basename(page));
  if ((file !== root && !file.startsWith(root + path.sep)) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream", "cache-control": "no-store" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(Number(opt("port", 0)), "127.0.0.1", r));
const pageUrl = `http://127.0.0.1:${server.address().port}/${encodeURIComponent(path.basename(page))}`;
if (args.includes("--serve")) {
  console.log(`serving ${pageUrl}  (add ?t=12.5 handling in the page if useful; Ctrl-C to stop)`);
  await new Promise(() => {});
}

const { chromium } = loadPlaywright();
// CHROMIUM_PATH points at an installed Chrome/Chromium when Playwright's own download is unavailable.
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--force-color-profile=srgb", "--disable-lcd-text"] });

let warned = false;
async function openPage() {
  const probe = await browser.newPage();
  await probe.goto(pageUrl);
  await probe.waitForFunction(() => window.VIDEO && typeof window.seek === "function");
  const video = await probe.evaluate(() => window.VIDEO);
  const sfx = await probe.evaluate(() => window.SFX || []);
  if (!warned) {
    warned = true;
    const missing = await probe.evaluate((d) => {
      for (const t of [0, d / 4, d / 2, (3 * d) / 4, d]) window.seek(t);
      return [...(window.STYLE_MISSING || [])];
    }, video.duration);
    if (missing.length) console.warn(`warning: style() selectors that match nothing: ${missing.join(", ")}`);
  }
  await probe.close();
  const context = await browser.newContext({
    viewport: { width: video.width, height: video.height },
    deviceScaleFactor: scale,
  });
  const p = await context.newPage();
  p.on("pageerror", (e) => console.error("page error:", e.message));
  p.on("console", (m) => m.type() === "error" && console.error("console:", m.text()));
  await p.goto(pageUrl);
  await p.waitForFunction(() => window.VIDEO && typeof window.seek === "function");
  await p.evaluate(() => document.fonts.ready);
  return { p, video, sfx };
}

async function shot(p, t) {
  await p.evaluate((t) => window.seek(t), t);
  // A busy machine can take far longer than Playwright's 30 s default for one frame.
  return p.screenshot({ type: "jpeg", quality: 92, animations: "disabled", caret: "hide", timeout: 120_000 });
}

const first = await openPage();
const { video } = first;
const duration = Number(opt("to", video.duration));

if (stills) {
  fs.mkdirSync(stills, { recursive: true });
  const every = Number(opt("every", 0));
  let times = (opt("at") ?? "").split(",").filter(Boolean).map(Number);
  if (!times.length && every) for (let t = from; t < duration; t += every) times.push(+t.toFixed(3));
  if (!times.length) times = video.stills ?? [0];
  for (const t of times) {
    const buf = await shot(first.p, t);
    const file = path.join(stills, `t${t.toFixed(2).padStart(7, "0")}.jpg`);
    fs.writeFileSync(file, buf);
  }
  console.log(`${times.length} stills -> ${stills}`);
  await browser.close();
  server.close();
  process.exit(0);
}

if (!out) { console.error("--out or --stills required"); process.exit(1); }
const frames = Math.round((duration - from) * fps);
const chunks = Math.min(workers, frames);
const per = Math.ceil(frames / chunks);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "uimotion-"));
process.on("exit", () => fs.rmSync(tmp, { recursive: true, force: true }));  // also after a crash
const started = Date.now();
let done = 0;

async function renderChunk(index, ctx) {
  const k0 = index * per, k1 = Math.min(frames, k0 + per);
  const file = path.join(tmp, `c${String(index).padStart(3, "0")}.mp4`);
  const blur = sub > 1
    ? `tmix=frames=${sub},select='eq(mod(n\\,${sub})\\,${sub - 1})',setpts=N/(${fps}*TB),`
    : "";
  // Screenshots are full-range JPEG. Convert to standard (limited) range, which every player,
  // including iPhones and Safari, decodes the same way.
  const filter = `${blur}scale=in_range=pc:out_range=tv,format=yuv420p`;
  const ff = spawn("ffmpeg", [
    "-v", "error", "-y", "-f", "image2pipe", "-framerate", String(fps * sub), "-c:v", "mjpeg", "-i", "-",
    "-vf", filter, "-r", String(fps), "-c:v", "libx264", "-preset", "medium", "-crf", "15",
    "-color_range", "tv", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", file,
  ], { stdio: ["pipe", "inherit", "inherit"] });
  const closed = new Promise((res, rej) => ff.on("close", (c) => (c ? rej(new Error(`ffmpeg ${c}`)) : res())));
  for (let k = k0; k < k1; k++) {
    for (let j = 0; j < sub; j++) {
      // Subframes span `shutter` of the frame interval, ending at the frame time.
      const t = from + (k + ((j + 1 - sub) / sub) * shutter) / fps;
      const buf = await shot(ctx.p, Math.max(from, t));
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
for (let i = 1; i < chunks; i++) contexts.push(await openPage());
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
