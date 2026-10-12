#!/usr/bin/env node
// What each style pack costs per frame, measured on its example in examples/styles/:
//   seek     the page's seek(t) in the browser: the scene's drawing plus the style's own pass
//   shot     seek plus the renderer's screenshot, as render.mjs pays it per (sub)frame
// Riso also reports its own breakdown (press.stats): drawing the plates, reading them back, the
// screen-and-multiply pass, and putting the print on the canvas.
//   node tests/style_cost.mjs [riso pixel cut-paper] [--frames 48]

import path from "node:path";
import { fileURLToPath } from "node:url";
import { serve, launch, openVideoPage, shot } from "../skills/video/scripts/page.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const at = args.indexOf("--frames");
const count = at >= 0 ? Number(args[at + 1]) : 48;
const names = args.filter((a, i) => !a.startsWith("--") && (at < 0 || i !== at + 1));
if (!names.length) names.push("riso", "pixel", "cut-paper");

const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const p90 = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length * 0.9)]; };
const fmt = (x) => x.toFixed(1).padStart(6);

const browser = await launch();
console.log(`\nper-frame cost at 1080x1080, ${count} frames spread over each example (ms: median, p90)`);
console.log("style        seek            seek + screenshot   breakdown (medians)");
for (const name of names) {
  const page = path.join(here, "../skills/video/examples/styles", name, "index.html");
  const { server, url } = await serve(page);
  const { p, video } = await openVideoPage(browser, url);
  const times = Array.from({ length: count }, (_, i) => (i + 0.5) * (video.duration / count));
  for (const t of times.slice(0, 4)) await p.evaluate((t) => window.seek(t), t); // warm up the JIT
  const seekMs = [], shotMs = [], parts = [];
  for (const t of times) {
    const r = await p.evaluate(async (t) => {
      const t0 = performance.now();
      await window.seek(t);
      const ms = performance.now() - t0;
      return { ms, last: window.STYLE_PACK?.stats?.last ?? null };
    }, t);
    seekMs.push(r.ms);
    if (r.last && typeof r.last === "object") parts.push(r.last);
    const t1 = Date.now();
    await shot(p, t);
    shotMs.push(Date.now() - t1);
  }
  const breakdown = parts.length
    ? Object.keys(parts[0]).filter((k) => k !== "total").map((k) => `${k} ${median(parts.map((x) => x[k])).toFixed(1)}`).join(", ")
    : "";
  console.log(`${name.padEnd(12)}${fmt(median(seekMs))} ${fmt(p90(seekMs))}    ${fmt(median(shotMs))} ${fmt(p90(shotMs))}     ${breakdown}`);
  await p.context().close();
  server.close();
}
await browser.close();
