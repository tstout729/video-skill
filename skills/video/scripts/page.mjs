// Shared pieces for render.mjs and review.mjs: find Playwright, serve a seek(t) page,
// launch Chromium (with WebGL), and open the page ready to seek.
//
// The page is served over a local HTTP server (ES modules do not load from file://):
//   /            the page's own folder
//   /_skill/     this skill's folder, so pages import /_skill/runtime/motion.js
//   /_vendor/    node_modules in the skill's cache folder (setup.sh --with gsap installs GSAP),
//                so pages import /_vendor/gsap/index.js at a pinned version

import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

export const SKILL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const CACHE = process.env.VIDEO_SKILL_HOME ||
  path.join(process.env.XDG_CACHE_HOME || path.join(os.homedir(), ".cache"), "video-skill");

export function loadPlaywright() {
  const require = createRequire(import.meta.url);
  // Only trusted install locations; never the current folder, whose node_modules could
  // run arbitrary code. PLAYWRIGHT_DIR overrides (a folder that contains node_modules).
  // scripts/setup.sh installs Playwright into the skill's cache folder.
  const roots = [];
  if (process.env.PLAYWRIGHT_DIR) roots.push(process.env.PLAYWRIGHT_DIR);
  roots.push(CACHE);
  try { roots.push(execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim()); } catch {}
  for (const root of roots) {
    try { return require(require.resolve("playwright", { paths: [root] })); } catch {}
  }
  throw new Error("Playwright not found. Run the skill's scripts/setup.sh once to install it.");
}

// Text is served as UTF-8, so pages in any language keep their accents.
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf", ".otf": "font/otf",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".mp3": "audio/mpeg", ".wav": "audio/wav", ".mp4": "video/mp4", ".webm": "video/webm" };

export async function serve(page, port = 0) {
  const roots = { "/_skill/": SKILL, "/_vendor/": path.join(CACHE, "node_modules") };
  const server = http.createServer((req, res) => {
    // Answer only requests addressed to this machine by name or IP: a web page that rebinds
    // its own domain to 127.0.0.1 (DNS rebinding) still sends its domain as the Host.
    if (!/^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(req.headers.host || "")) {
      res.writeHead(403).end();
      return;
    }
    let url;
    try { url = decodeURIComponent(new URL(req.url, "http://x").pathname); } catch { res.writeHead(400).end(); return; }
    const prefix = Object.keys(roots).find((p) => url.startsWith(p));
    const [root, rel] = prefix ? [roots[prefix], url.slice(prefix.length)] : [path.dirname(page), url.slice(1)];
    const file = path.resolve(root, rel || path.basename(page));
    if ((file !== root && !file.startsWith(root + path.sep)) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { "content-type": TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream",
      "cache-control": "no-store" });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(port, "127.0.0.1", r));
  const url = `http://127.0.0.1:${server.address().port}/${encodeURIComponent(path.basename(page))}`;
  return { server, url };
}

// WebGL needs a GPU backend in headless Chromium: Metal on a Mac, SwiftShader (software)
// elsewhere. VIDEO_GL=metal|swiftshader|off overrides.
function glArgs() {
  const mode = process.env.VIDEO_GL || (os.platform() === "darwin" ? "metal" : "swiftshader");
  if (mode === "metal") return ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=metal"];
  if (mode === "swiftshader") return ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"];
  return [];
}

export async function launch() {
  const { chromium } = loadPlaywright();
  // CHROMIUM_PATH points at an installed Chrome/Chromium when Playwright's own download is unavailable.
  return chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ["--force-color-profile=srgb", "--disable-lcd-text", ...glArgs()] });
}

// Collect what went wrong on a page: script errors, console errors and failed requests (with URLs).
function watch(p, errors, echo = false) {
  const add = (msg) => { errors.push(msg); if (echo) console.error(msg); };
  p.on("pageerror", (e) => add(`page error: ${e.message}`));
  p.on("console", (m) => m.type() === "error" && !m.text().startsWith("Failed to load resource") && add(`console: ${m.text()}`));
  p.on("response", (r) => r.status() >= 400 && add(`${r.status()} ${new URL(r.url()).pathname}`));
}

// Wait for window.VIDEO and window.seek. Give up 3 s after the first error, or after 60 s,
// and report the page's own errors instead of a bare timeout.
async function ready(p, errors) {
  const defined = () => p.evaluate(() => !!(window.VIDEO && typeof window.seek === "function"));
  const start = Date.now();
  let firstError = 0;
  while (!(await defined())) {
    if (errors.length && !firstError) firstError = Date.now();
    if ((firstError && Date.now() - firstError > 3000) || Date.now() - start > 60_000) {
      const why = errors.length ? errors.slice(0, 5).join("\n  ") : "no error was reported; check that the page defines both";
      throw new Error(`the page never defined window.VIDEO and window.seek(t):\n  ${why}`);
    }
    await new Promise((r) => setTimeout(r, 100));
  }
}

// Open the page at its own size and scale, ready to seek. `query` adds URL parameters (debug=1).
export async function openVideoPage(browser, url, { scale = 1, query = "" } = {}) {
  const full = query ? `${url}?${query}` : url;
  const probe = await browser.newPage();
  const errors = [];
  watch(probe, errors);
  await probe.goto(full);
  await ready(probe, errors);
  const video = await probe.evaluate(() => window.VIDEO);
  await probe.close();
  const context = await browser.newContext({ viewport: { width: video.width, height: video.height }, deviceScaleFactor: scale });
  const p = await context.newPage();
  const errs = [];
  watch(p, errs, true);
  await p.goto(full);
  await ready(p, errs);
  await p.evaluate(() => document.fonts.ready);
  const sfx = await p.evaluate(() => window.SFX || []);
  return { p, video, sfx };
}

// seek(t) may return a promise (for example, to wait for an image sequence frame); it is awaited.
export async function shot(p, t, { type = "jpeg" } = {}) {
  await p.evaluate((t) => window.seek(t), t);
  // A busy machine can take far longer than Playwright's 30 s default for one frame.
  return p.screenshot({ type, ...(type === "jpeg" ? { quality: 92 } : {}), animations: "disabled", caret: "hide", timeout: 120_000 });
}
