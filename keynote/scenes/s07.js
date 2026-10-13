// s07 Any style · bars 11–13 · black · cut in on bar 11 (21.29), cut out on bar 13 (25.16).
// One 860 px square plays "How a seed grows", on screen from the cut: three layers (riso, pixel, cut
// paper) on one shared timeline, frame for frame (story.js times; 24 fps, 252 frames each). "Any
// style." (display, white) lands on bar 11 beat 1, so the cut itself is still and the word lands from
// rest, as in s03, s04 and s06. Bar 11 beat 2: an edge enters from the right and lands at one third;
// the right two thirds become pixel art. Bar 12: a second edge lands at two thirds; the right third
// becomes cut paper. The tags under the thirds (Riso · Pixel · Paper) light as each style appears
// (Riso from the cut). The story is
// placed so the cloud leaves and the sun rises in riso, the sun turns to pixel, then paper, and the
// flower blooms in the pixel third on bar 12 beat 2, inside the 1.9 s three-way hold. Centered; the
// content drifts 1.00 -> 1.04 about the frame's centre and stays inside the stage at 1.04.
export default function build(root, k) {
  const { make, place, reveal, drift, barT, frames, check, box, overlap, easeOut, p01, lerp, C, STAGE } = k;
  const { cutIn, cutOut } = k.win;
  const FPS = 60, LEAD = 2 / FPS, DRIFT = 0.04;
  const onFrame = (t) => Math.ceil(t * FPS - 1e-6) / FPS;   // the first rendered frame at or after t

  // ---- the plan ----
  const T_WORD = barT(11, 1);     // 21.774, a beat after the cut
  const SQ = { s: 860, y: 290 };
  SQ.x = 540 - SQ.s / 2;
  const WIPE1 = { at: barT(11, 2) - LEAD, dur: 0.5, from: SQ.s, to: SQ.s / 3 };       // 22.258
  const WIPE2 = { at: barT(12) - LEAD, dur: 0.4, from: SQ.s, to: (2 * SQ.s) / 3 };    // 23.226, half the travel
  const LIT_LAG = 0.15, LIT_DUR = 0.2;   // a tag lights 150 ms after its style starts to show
  // Story time 0 at 16.64 s: the bloom (story 7.55) on bar 12 beat 2 (24.19). Story 4.65 at the cut
  // (the cloud leaving), 8.52 at the cut out (the bee coming in). 24 fps, 252 frames.
  const STORY = { bloom: 7.55, sunUp: 5.1, fps: 24, count: 252 };
  STORY.t0 = barT(12, 2) - STORY.bloom;
  const settled = WIPE2.at + WIPE2.dur;

  // ---- layout ----
  const stage = make("div", "", "", root, { position: "absolute", left: "0px", top: "0px", width: "1080px", height: "1350px", transformOrigin: "540px 675px" });
  const word = make("div", "display", "Any style.", stage, { position: "absolute", whiteSpace: "nowrap" });
  place(word, Math.round(540 - word.offsetWidth / 2), 132);

  const win = place(make("div", "clipwin", "", stage), SQ.x, SQ.y, SQ.s, SQ.s);
  const layer = (name) => {
    const el = make("div", "", "", win, { position: "absolute", inset: "0px" });
    el.dataset.layer = name;
    const img = make("img", "", "", el, { inset: "0px" });
    return { el, img, play: frames(img, { dir: `clips/${name}`, fps: STORY.fps, count: STORY.count }) };
  };
  const riso = layer("riso"), pixel = layer("pixel"), paper = layer("cut-paper");
  const edge = (id) => {
    const el = make("div", "", "", win, { position: "absolute", top: "0px", width: "4px", height: `${SQ.s}px`, background: C.black, zIndex: "2" });
    el.id = id;
    return el;
  };
  const edge1 = edge("s07-edge-pixel"), edge2 = edge("s07-edge-paper");

  // the tags, one under the centre of each third
  const TAG_Y = SQ.y + SQ.s + 36;
  const DIM = [122, 122, 127], LIT = [245, 245, 247];   // #7a7a7f (4.9:1 on black) -> #f5f5f7
  const tag = (text, i) => {
    const el = make("div", "label", text, stage, { position: "absolute", whiteSpace: "nowrap", fontSize: "30px", letterSpacing: "0.08em" });
    place(el, Math.round(SQ.x + SQ.s / 6 + (SQ.s / 3) * i - el.offsetWidth / 2), TAG_Y);
    return el;
  };
  const tags = [tag("Riso", 0), tag("Pixel", 1), tag("Paper", 2)];
  // Riso shows from the cut, so its tag is lit from the cut: the cut's first frame is already composed.
  const LIT_AT = [-Infinity, WIPE1.at + LIT_LAG, WIPE2.at + LIT_LAG];
  const light = (el, a) => { el.style.color = `rgb(${DIM.map((d, j) => Math.round(lerp(d, LIT[j], a))).join(", ")})`; };
  const LIT_CSS = `rgb(${LIT.join(", ")})`;

  const edgeX = (w, t) => lerp(w.from, w.to, easeOut(p01(t, w.at, w.dur)));
  const frameAt = (img) => img.getAttribute("src")?.split("/").pop();

  // ---- checks ----
  check(`s07 "Any style." is hidden on the cut, starts 2 frames before bar 11 beat 1 (f${Math.round(T_WORD * FPS)}) and is settled by f${Math.ceil((T_WORD - LEAD + 0.6) * FPS)}`, [onFrame(cutIn), onFrame(T_WORD - LEAD + 0.6)], (t) => {
    if (t < T_WORD - LEAD) return word.style.visibility === "hidden" || "visible before its lead";
    if (t >= onFrame(T_WORD - LEAD + 0.6) - 1e-6) return Number(word.style.opacity) === 1 || `opacity ${word.style.opacity}`;
    return true;
  });
  check("s07 the cut's first frame is composed: the square showing riso, the Riso tag lit", onFrame(cutIn), () =>
    (!!riso.img.getAttribute("src") && tags[0].style.color === LIT_CSS && pixel.el.style.visibility === "hidden") || "not composed");
  check(`s07 the pixel edge enters on bar 11 beat 2 and lands at one third (x ${SQ.x + SQ.s / 3}) by f${Math.ceil((WIPE1.at + WIPE1.dur) * FPS)}`, onFrame(WIPE1.at + WIPE1.dur), (t) => {
    const b = box(edge1), want = 540 + (SQ.x + SQ.s / 3 - 540) * drift(t, cutIn, cutOut, DRIFT);
    return Math.abs(b.cx - want) < 0.75 || `edge at ${b.cx.toFixed(2)}, want ${want.toFixed(2)}`;
  });
  check(`s07 the paper edge enters on bar 12 and lands at two thirds (x ${SQ.x + (2 * SQ.s) / 3}) by f${Math.ceil(settled * FPS)}`, onFrame(settled), (t) => {
    const b = box(edge2), want = 540 + (SQ.x + (2 * SQ.s) / 3 - 540) * drift(t, cutIn, cutOut, DRIFT);
    return Math.abs(b.cx - want) < 0.75 || `edge at ${b.cx.toFixed(2)}, want ${want.toFixed(2)}`;
  });
  check("s07 the three layers show the same story frame on every frame", [onFrame(cutIn), cutOut - 1 / FPS], () => {
    const n = [riso, pixel, paper].map((l) => frameAt(l.img));
    return (n[0] && n[0] === n[1] && n[1] === n[2]) || n.join(" ");
  });
  check("s07 the story stays inside its 252 frames, and the bloom lands in the three-way hold", cutIn, () => {
    const a = (cutIn - STORY.t0) * STORY.fps, b = (cutOut - STORY.t0) * STORY.fps, bloom = STORY.t0 + STORY.bloom;
    return (a >= 0 && b <= STORY.count - 1 && bloom > settled && bloom < cutOut - 0.6) || `frames ${a.toFixed(1)}–${b.toFixed(1)}, bloom ${bloom.toFixed(2)}`;
  });
  LIT_AT.forEach((at, i) => {
    if (!Number.isFinite(at)) return;
    check(`s07 the ${tags[i].textContent} tag lights at f${Math.round(at * FPS)} (dim just before, lit by f${Math.ceil((at + LIT_DUR) * FPS)})`, [at - 1 / FPS, at + LIT_DUR], (t) => {
      const c = tags[i].style.color;
      if (t < at) return c === `rgb(${DIM.join(", ")})` || `lit early: ${c}`;
      return t < at + LIT_DUR - 1e-6 || c === LIT_CSS || `not lit: ${c}`;
    });
  });
  check(`s07 the three-way picture is on screen from bar 12 for 1.9 s and holds settled, three tags lit, from f${Math.ceil(settled * FPS)} to the cut`, [onFrame(settled), cutOut - 1 / FPS], () => {
    if (cutOut - barT(12) < 1.9 || cutOut - settled < 1.5) return `on screen ${(cutOut - barT(12)).toFixed(2)} s, settled ${(cutOut - settled).toFixed(2)} s`;
    const lit = tags.every((el) => el.style.color === LIT_CSS);
    const e1 = parseFloat(edge1.style.left) + 2, e2 = parseFloat(edge2.style.left) + 2;
    return (lit && Math.abs(e1 - SQ.s / 3) < 0.01 && Math.abs(e2 - (2 * SQ.s) / 3) < 0.01) || `lit ${lit}, edges ${e1.toFixed(2)} ${e2.toFixed(2)}`;
  });
  check("s07 word, square and tags stay inside the stage through the drift, clear of each other", [onFrame(cutIn), cutOut - 1 / FPS], () => {
    const items = [word, win, ...tags];
    const out = items.map((el) => { const r = box(el); return r.x >= STAGE.x0 - 0.5 && r.x + r.w <= STAGE.x1 + 0.5 && r.y >= STAGE.y0 && r.y + r.h <= STAGE.y1 ? "" : `${el.textContent || "square"} ${r.x.toFixed(0)}–${(r.x + r.w).toFixed(0)}, ${r.y.toFixed(0)}–${(r.y + r.h).toFixed(0)}`; }).filter(Boolean);
    if (overlap(word, win) || tags.some((g) => overlap(g, win))) out.push("text over the square");
    if (overlap(tags[0], tags[1]) || overlap(tags[1], tags[2])) out.push("tags overlap");
    return out.join("; ") || true;
  });

  return (t) => {
    stage.style.transform = `scale(${drift(t, cutIn, cutOut, DRIFT).toFixed(5)})`;
    reveal(word, t, T_WORD - LEAD);
    const clipT = t - STORY.t0;
    const e1 = edgeX(WIPE1, t), e2 = edgeX(WIPE2, t);
    pixel.el.style.clipPath = `inset(0px 0px 0px ${e1.toFixed(2)}px)`;
    paper.el.style.clipPath = `inset(0px 0px 0px ${e2.toFixed(2)}px)`;
    pixel.el.style.visibility = e1 < SQ.s - 0.01 ? "visible" : "hidden";
    paper.el.style.visibility = e2 < SQ.s - 0.01 ? "visible" : "hidden";
    edge1.style.left = `${(e1 - 2).toFixed(2)}px`;
    edge2.style.left = `${(e2 - 2).toFixed(2)}px`;
    edge1.style.visibility = e1 < SQ.s - 0.01 ? "visible" : "hidden";
    edge2.style.visibility = e2 < SQ.s - 0.01 ? "visible" : "hidden";
    tags.forEach((el, i) => light(el, easeOut(p01(t, LIT_AT[i], LIT_DUR))));
    // the hidden layers follow the clip too, so all three are always on the same frame
    return Promise.all([riso.play(clipT), pixel.play(clipT), paper.play(clipT)]);
  };
}
