// s04 Style packs · ink · 22.50–29.75: a cut brings it in, a wipe takes it out from 28.85.
// One 900 px square plays "How a seed grows". Three layers inside it play the same clip time (the
// style examples share one timeline in story.js), so frame n is the same moment in all three:
//   riso       the whole square from the cut; its tag, dim from the cut, lights on "printed".
//   pixel      on "pixelated" a vertical edge sweeps from the right edge to one third (0.8 s,
//              ease-in-out; clip-path on the layer), and the right two thirds become pixel art.
//   cut paper  on "cut from paper" a second edge sweeps to two thirds (0.5 s, 50% of the travel),
//              and the right third becomes cut paper.
// The tags head their thirds from the start, so nothing moves while it is read. The clip is
// placed so the sun rises in full riso under "the same story", the flower blooms in pixel just
// after the first edge passes it, and the bee flies out of the cut paper into the pixel third and
// lands at 28.65. The three-media picture then holds unchanged to the end of the wipe out.
export default function build(root, k) {
  const { make, place, show, cueIn, chrome, frames, easeInOut, easeOut, p01, lerp, check, box, overlap, C } = k;
  const { cutIn, outStart, cutOut } = k.win;
  const FPS = 60;
  root.style.background = C.ink;
  root.classList.add("dark");
  chrome(root, 4, "STYLE PACKS", true);

  // ---- the plan ----
  const tPrinted = cueIn(k.id, "printed");
  const WIPE1 = { at: cueIn(k.id, "pixelated"), dur: 0.8, from: 900, to: 300 };
  const WIPE2 = { at: cueIn(k.id, "cut from paper", 1, 0.15), dur: 0.5, from: 900, to: 600 };
  const LIGHT = 0.3;                       // a tag lights over 0.3 s, no bounce
  const TAG_IN = { lag: 0.15, dur: 0.45 }; // a new tag follows its edge 150 ms later
  // Clip time 0 (story f0) at 19.45 s: 3.05 s (the cloud sliding in) at the cut, the sun up at
  // 24.55, the bloom at 27.00, the bee landing at 28.65, and 10.30 s at the last frame.
  const CLIP = { t0: 19.45, fps: 24, count: 252 };
  const STORY = { sunUp: 5.1, bloom: 7.55, beeLand: 9.2 };
  const settled = Math.max(WIPE2.at + WIPE2.dur, WIPE2.at + TAG_IN.lag + TAG_IN.dur);

  // ---- the square: three layers, each a full 900 px picture ----
  const TAG_Y = 148;                       // the tags, 36 px, over the square
  const SQ = { x: 90, y: 198, s: 900 };
  const win = place(make("div", "clipwin dark", "", root), SQ.x, SQ.y, SQ.s, SQ.s);
  const layer = (name) => {
    const el = make("div", "", "", win, { position: "absolute", inset: "0px" });
    el.dataset.layer = name;
    const img = make("img", "", "", el, { position: "absolute", left: "0px", top: "0px", width: `${SQ.s}px`, height: `${SQ.s}px`, display: "block" });
    return { el, img, play: frames(img, { dir: `clips/${name}`, fps: CLIP.fps, count: CLIP.count }) };
  };
  const riso = layer("riso"), pixel = layer("pixel"), paper = layer("cut-paper");
  const edge = () => make("div", "", "", win, { position: "absolute", top: "0px", width: "4px", height: `${SQ.s}px`, background: C.ink, zIndex: "2" });
  const edge1 = edge(), edge2 = edge();
  edge1.id = "s04-edge-pixel"; edge2.id = "s04-edge-paper";
  make("div", "", "", win, { position: "absolute", inset: "0px", borderRadius: "inherit", zIndex: "3", pointerEvents: "none",
    boxShadow: "inset 0 0 0 1.5px rgba(236, 235, 231, 0.14)" });

  // ---- the tags: column heads over the centre of each third, set before the square ----
  const tag = (text, i) => {
    const el = make("div", "", text, root, { position: "absolute", top: `${TAG_Y}px`, whiteSpace: "nowrap",
      font: "650 36px/1 Geist, sans-serif", letterSpacing: "-0.02em" });
    el.style.left = `${(SQ.x + SQ.s / 6 + (SQ.s / 3) * i - el.offsetWidth / 2).toFixed(2)}px`;
    return el;
  };
  const tags = [tag("Riso", 0), tag("Pixel", 1), tag("Cut paper", 2)];
  // dim: a faint grey that still reads (5.0:1 on ink); lit: saffron, the scene's one accent (8.5:1)
  const DIM = [138, 133, 124], LIT = [232, 163, 61];
  const LIT_CSS = `rgb(${LIT.join(", ")})`;
  const lightTag = (el, a) => {
    el.style.color = `rgb(${DIM.map((d, j) => Math.round(lerp(d, LIT[j], a))).join(", ")})`;
  };

  const edgeX = (w, t) => lerp(w.from, w.to, easeInOut(p01(t, w.at, w.dur)));

  // ---- checks ----
  check(`s04 the pixel edge settles at one third (x ${SQ.x + 300}) by f${Math.ceil((WIPE1.at + WIPE1.dur) * FPS)}`, WIPE1.at + WIPE1.dur, () => {
    const b = box(edge1);
    return Math.abs(b.cx - (SQ.x + 300)) < 0.5 || `edge at ${b.cx.toFixed(2)}`;
  });
  check(`s04 the cut-paper edge settles at two thirds (x ${SQ.x + 600}) by f${Math.ceil((WIPE2.at + WIPE2.dur) * FPS)}`, WIPE2.at + WIPE2.dur, () => {
    const b = box(edge2);
    return Math.abs(b.cx - (SQ.x + 600)) < 0.5 || `edge at ${b.cx.toFixed(2)}`;
  });
  check("s04 the three layers show the same story frame on every frame", [cutIn, cutOut - 1 / FPS], () => {
    const n = [riso, pixel, paper].map((l) => l.img.getAttribute("src")?.split("/").pop());
    return (n[0] && n[0] === n[1] && n[1] === n[2]) || n.join(" ");
  });
  check("s04 the story stays inside its 252 frames for the whole window", cutIn, () => {
    const a = (cutIn - CLIP.t0) * CLIP.fps, b = (cutOut - CLIP.t0) * CLIP.fps;
    return (a >= 0 && b <= CLIP.count) || `frames ${a.toFixed(1)}–${b.toFixed(1)}`;
  });
  check("s04 the edges wipe on their words, one at a time", cutIn, () => {
    const pix = cueIn(k.id, "pixelated", 1, 0), cut = cueIn(k.id, "cut", 1, 0);
    return (Math.abs(WIPE1.at - pix) <= 0.25 && Math.abs(WIPE2.at - cut) <= 0.25 && WIPE2.at >= WIPE1.at + WIPE1.dur + 0.25) || "timing";
  });
  // The wipe out (linear, leftward, 0.9 s, cubic ease-in-out) first touches the square when its
  // edge has travelled the 90 px margin: the picture is whole until then, then leaves third by third.
  const wipeE = (90 + 2) / (1080 + 4), tWhole = outStart + (cutOut - outStart) * Math.cbrt(wipeE / 4);
  check(`s04 the three-media picture with three lit tags holds unchanged from f${Math.ceil(settled * FPS)} to the cut out, 1.5 s or more`, [settled, cutOut - 1 / FPS], () => {
    if (cutOut - settled < 1.5) return `holds only ${(cutOut - settled).toFixed(2)} s`;
    const lit = tags.every((el) => Number(el.style.opacity || 1) > 0.999 && el.style.color === LIT_CSS);
    return (lit && Math.abs(box(edge1).cx - (SQ.x + 300)) < 0.5 && Math.abs(box(edge2).cx - (SQ.x + 600)) < 0.5) || "not settled";
  });
  check(`s04 the Riso tag is lit by ${(tPrinted + LIGHT).toFixed(2)} s, inside "printed"`, tPrinted + LIGHT, () =>
    tags[0].style.color === LIT_CSS || tags[0].style.color);
  check("s04 the story is lively in this window: the sun rises in full riso, the flower blooms after the pixel edge passes it", cutIn, () => {
    const sun = CLIP.t0 + STORY.sunUp, bloom = CLIP.t0 + STORY.bloom, bee = CLIP.t0 + STORY.beeLand;
    // the stem stands at x 540 of the story's 1080 frame, so x 450 in the square
    const edgeAt = (x) => { for (let t = WIPE1.at; t <= WIPE1.at + WIPE1.dur; t += 1 / 600) if (edgeX(WIPE1, t) <= x) return t; return Infinity; };
    const out = [];
    if (!(sun > cutIn + 1 && sun + 1.4 < WIPE1.at)) out.push(`sun ${sun.toFixed(2)}`);
    if (!(bloom >= edgeAt(450))) out.push(`bloom ${bloom.toFixed(2)} before the edge passes the flower ${edgeAt(450).toFixed(2)}`);
    if (!(bee <= outStart && tWhole - bee > 0.3)) out.push(`bee lands ${bee.toFixed(2)}`);
    return out.join("; ") || true;
  });
  check(`s04 the whole three-media picture is on screen from f${Math.ceil(settled * FPS)} to f${Math.floor(tWhole * FPS)} (${tWhole.toFixed(2)} s), when the wipe out reaches the square`, tWhole - 1 / FPS, () => {
    // the wipe masks the next scene's root; its edge is measured from the right side of the frame
    const next = root.nextElementSibling, m = next && (next.style.maskImage || next.style.webkitMaskImage || "");
    const edge = Number((m.match(/transparent ([\d.]+)px/) || [])[1]);
    return (Number.isFinite(edge) && edge <= 1080 - (SQ.x + SQ.s)) || `wipe edge ${edge} px from the right (${m.slice(0, 60)})`;
  });
  check("s04 the square and the tags stay inside the stage, clear of the caption band", [cutIn, cutOut - 1 / FPS], () => {
    const items = [win, ...tags];
    return items.map((el) => { const r = box(el); return r.x >= 54 && r.x + r.w <= 1026 && r.y >= 140 && r.y + r.h <= 1100 ? "" : `${el.textContent || "square"} y ${r.y.toFixed(0)}–${(r.y + r.h).toFixed(0)}`; }).filter(Boolean).join("; ") || true;
  });
  check("s04 the tags clear each other, the square and the chrome", [settled, cutOut - 1 / FPS], () => {
    const ch = root.querySelector(".chrome"), out = [];
    tags.forEach((a, i) => { if (overlap(a, win) || overlap(a, ch)) out.push(a.textContent); tags.slice(i + 1).forEach((b) => overlap(a, b) && out.push(`${a.textContent} x ${b.textContent}`)); });
    return out.join("; ") || true;
  });

  return (t) => {
    const clipT = t - CLIP.t0;
    const e1 = edgeX(WIPE1, t), e2 = edgeX(WIPE2, t);
    const pending = [riso.play(clipT)];
    pixel.el.style.clipPath = `inset(0px 0px 0px ${e1.toFixed(2)}px)`;
    paper.el.style.clipPath = `inset(0px 0px 0px ${e2.toFixed(2)}px)`;
    pixel.el.style.visibility = e1 < SQ.s - 0.01 ? "visible" : "hidden";
    paper.el.style.visibility = e2 < SQ.s - 0.01 ? "visible" : "hidden";
    // The hidden layers still follow the clip, so every layer is on the same frame (a check reads it).
    pending.push(pixel.play(clipT), paper.play(clipT));
    edge1.style.left = `${(e1 - 2).toFixed(2)}px`;
    edge2.style.left = `${(e2 - 2).toFixed(2)}px`;
    edge1.style.visibility = e1 < SQ.s - 0.01 ? "visible" : "hidden";
    edge2.style.visibility = e2 < SQ.s - 0.01 ? "visible" : "hidden";

    lightTag(tags[0], easeOut(p01(t, tPrinted, LIGHT)));
    show(tags[0], t, -1e9);
    lightTag(tags[1], 1);
    show(tags[1], t, WIPE1.at + TAG_IN.lag, Infinity, { dur: TAG_IN.dur, dy: 12 });
    lightTag(tags[2], 1);
    show(tags[2], t, WIPE2.at + TAG_IN.lag, Infinity, { dur: TAG_IN.dur, dy: 12 });
    return Promise.all(pending);
  };
}
