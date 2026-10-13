// s10 Review · black · bars 18–21 (34.84–40.65): cut in, cut out.
//   Bar 18 (the build):  "It checks / its own work." (display, centered in the frame, "own work." in
//                        the gradient), words 80 ms apart, the first on the downbeat.
//   Bar 19 (the drop):   the headline glides up to the top (ease-in-out, 0.36 s) and a contact sheet of
//                        the film assembles under it: 9 cells land one by one on the sixteenths from
//                        beat 0.5 to beat 2.5 (nine eighth notes would need 4.5 beats and leave the
//                        finished sheet no hold before bar 20), then it holds.
//   Bar 20:              the onion skin rises onto the deck (the hero move: 100 px, ζ 0.82).
//   Bar 20 beat 2:       the speed graph rises; its plot draws on left to right.
// One card in front at a time: the card before steps back 150 ms later, travelling 60% as far
// (60 px up), 8% smaller and dimmed; a card two steps back retires. Three tags under the deck light as
// their cards arrive. Black.
//
// The pictures are assets/sheet.png, onion.png and graph.png, which will be replaced by this film's own
// (same names), so nothing here knows their content. regions() finds the review tools' pictures on their
// paper (dense rectangles of non-paper pixels): the sheet's frame cells, the onion's frame and the
// graph's panel. Those are cropped out of the paper and set large enough to read on a phone.

// Dense non-paper rectangles in a picture made by review.mjs (frames and panels on #F1EFEA paper),
// in reading order. Each comes back about 4 px larger than the picture (its 1 px ring and shadow).
export function regions(img, { tol = 12, block: B = 4, need = 12, minPx = 80, minFill = 0.6 } = {}) {
  const W = img.naturalWidth, H = img.naturalHeight;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const g = cv.getContext("2d", { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, W, H).data;
  const p0 = (6 * W + 6) * 4, pr = d[p0], pg = d[p0 + 1], pb = d[p0 + 2];   // the paper, top left
  const bw = Math.floor(W / B), bh = Math.floor(H / B);
  const cnt = new Uint8Array(bw * bh);
  for (let y = 0; y < bh * B; y++) {
    const row = ((y / B) | 0) * bw;
    for (let x = 0, i = y * W * 4; x < bw * B; x++, i += 4) {
      if (Math.abs(d[i] - pr) + Math.abs(d[i + 1] - pg) + Math.abs(d[i + 2] - pb) > tol) cnt[row + ((x / B) | 0)]++;
    }
  }
  const seen = new Uint8Array(bw * bh), out = [], stack = [];
  for (let s0 = 0; s0 < bw * bh; s0++) {
    if (cnt[s0] < need || seen[s0]) continue;
    let x0 = bw, y0 = bh, x1 = -1, y1 = -1, n = 0;
    seen[s0] = 1; stack.push(s0);
    while (stack.length) {
      const s = stack.pop(), x = s % bw, y = (s / bw) | 0;
      n++;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        if (nx < 0 || ny < 0 || nx >= bw || ny >= bh) continue;
        const ns = ny * bw + nx;
        if (!seen[ns] && cnt[ns] >= need) { seen[ns] = 1; stack.push(ns); }
      }
    }
    const w = (x1 - x0 + 1) * B, h = (y1 - y0 + 1) * B, fill = n / ((x1 - x0 + 1) * (y1 - y0 + 1));
    if (w >= minPx && h >= minPx && fill >= minFill) out.push({ x: x0 * B, y: y0 * B, w, h, fill });
  }
  return out.sort((a, b) => (Math.abs(a.y - b.y) > Math.min(a.h, b.h) / 2 ? a.y - b.y : a.x - b.x));
}

export default async function build(root, k) {
  const { make, place, barT, SPB, reveal, show, drift, spring01, easeOut, easeIn, easeInOut, easeOutExpo, p01, clamp, mix, check, box, overlap, C, STAGE } = k;
  const S = "s10", FPS = 60, EPS = 1e-6, LEAD = 2 / FPS;
  const { cutIn, cutOut } = k.win;
  const T = { head: barT(18), sheet: barT(19), onion: barT(20), graph: barT(20, 2), end: barT(21) };
  const SIX = SPB() / 4;                                    // a sixteenth note

  // ---------- the pictures and what is in them ----------
  const SRC = { sheet: "assets/sheet.png", onion: "assets/onion.png", graph: "assets/graph.png" };
  const load = async (src) => { const img = new Image(); img.src = src; await img.decode(); return img; };
  const [sheetImg, onionImg, graphImg] = await Promise.all([SRC.sheet, SRC.onion, SRC.graph].map(load));
  const INSET = 6;                                          // past the ring and the shadow, into the picture
  const inset = (r) => ({ x: r.x + INSET, y: r.y + INSET, w: r.w - 2 * INSET, h: r.h - 2 * INSET });
  const whole = (img) => ({ x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight });
  const biggest = (img) => {
    const rs = regions(img);
    return rs.length ? inset(rs.reduce((a, b) => (b.w * b.h > a.w * a.h ? b : a))) : whole(img);
  };
  // The sheet's cells: the regions of the sheet's common cell size, in reading order; the first nine.
  // A light shot's cell (#F5F5F7) is mostly the paper's color, so its box fills only about half;
  // matching the common cell size below keeps the lower fill from admitting anything else.
  const sheetRegions = regions(sheetImg, { minFill: 0.4 });
  const cellsFound = (() => {
    if (!sheetRegions.length) return [];
    const big = sheetRegions.filter((r) => r.w * r.h >= 0.5 * Math.max(...sheetRegions.map((q) => q.w * q.h)));
    const ref = [...big].sort((a, b) => a.w * a.h - b.w * b.h)[big.length >> 1];
    return sheetRegions.filter((r) => Math.abs(r.w - ref.w) <= 0.06 * ref.w && Math.abs(r.h - ref.h) <= 0.06 * ref.h);
  })();
  // Fallback (a sheet with fewer than nine frames): the whole picture in a 3×3 split.
  const cellRects = cellsFound.length >= 9 ? cellsFound.slice(0, 9).map(inset) : Array.from({ length: 9 }, (_, i) => {
    const w = sheetImg.naturalWidth / 3, h = sheetImg.naturalHeight / 3;
    return { x: (i % 3) * w, y: Math.floor(i / 3) * h, w, h };
  });
  const onionRect = biggest(onionImg), graphRect = biggest(graphImg);
  // The graph panel's own surface color, for the card around it.
  const surface = (() => {
    const cv = document.createElement("canvas"); cv.width = 1; cv.height = 1;
    const g = cv.getContext("2d", { willReadFrequently: true });
    const r = graphRect, xs = [0.3, 0.5, 0.7].map((f) => r.x + f * r.w), y = r.y + 10;
    const px = xs.map((x) => { g.drawImage(graphImg, x, y, 1, 1, 0, 0, 1, 1); return [...g.getImageData(0, 0, 1, 1).data.slice(0, 3)]; });
    const med = [0, 1, 2].map((c) => px.map((p) => p[c]).sort((a, b) => a - b)[1]);
    return `rgb(${med.join(", ")})`;
  })();

  // ---------- the stage: everything drifts 1.00 -> 1.03 ----------
  const stage = make("div", "", "", root, { position: "absolute", inset: "0px", transformOrigin: "540px 675px" });
  // Drift-safe: 940 px about the centre stays inside x 54–1026 at the drift's 1.03.
  const SAFE_W = 940, X0 = 540 - SAFE_W / 2, SW = SAFE_W;

  // ---------- the headline ----------
  const HEAD_TOP = 118;                                     // the headline's place once the deck arrives
  const head = place(make("div", "display center", "", stage, { width: `${SW}px` }), X0, HEAD_TOP);
  head.id = "s10-head";
  const LINES = [["It", "checks"], ["its", "own", "work."]];
  const GRAD = new Set(["own", "work."]);
  const headWords = [];
  for (const ln of LINES) {
    const row = make("div", "", "", head, { whiteSpace: "nowrap" });
    ln.forEach((w, i) => {
      const el = make("span", GRAD.has(w) ? "word grad" : "word", w, row);
      if (i < ln.length - 1) row.appendChild(document.createTextNode(" "));
      headWords.push(el);
    });
  }

  // ---------- the deck ----------
  const deckBox = make("div", "", "", stage, { position: "absolute", inset: "0px" });
  const crop = (parent, img, r, w, h, css = {}) => {
    const s = w / r.w;
    return make("div", "", "", parent, {
      position: "absolute", left: "0px", top: "0px", width: `${w.toFixed(2)}px`, height: `${h.toFixed(2)}px`,
      backgroundImage: `url("${img.src}")`, backgroundRepeat: "no-repeat",
      backgroundSize: `${(img.naturalWidth * s).toFixed(2)}px ${(img.naturalHeight * s).toFixed(2)}px`,
      backgroundPosition: `${(-r.x * s).toFixed(2)}px ${(-r.y * s).toFixed(2)}px`, ...css,
    });
  };
  const card = (id, w, h, bg) => {
    const el = place(make("div", "clipwin", "", deckBox, { background: bg, transformOrigin: "50% 0%" }), 540 - w / 2, 0, w, h);
    el.id = `s10-${id}`;
    return el;
  };
  const veil = (el) => make("div", "", "", el, { position: "absolute", inset: "0px", background: "#000", opacity: "0", zIndex: "4", pointerEvents: "none" });

  // ---------- the tags ----------
  const TAGS = ["Contact sheet", "Onion skin", "Speed graph"];
  const tagRow = make("div", "label", "", stage, { position: "absolute", left: `${X0}px`, width: `${SW}px`, textAlign: "center", whiteSpace: "nowrap" });
  tagRow.id = "s10-tags";
  const tags = TAGS.map((s, i) => {
    const dot = i ? make("span", "", " · ", tagRow, { opacity: "0" }) : null;
    return { el: make("span", "", s, tagRow, { opacity: "0" }), dot };
  });

  await document.fonts.ready;
  // Layout from the measured headline: the deck between it and the tags.
  const HEAD_BOTTOM = HEAD_TOP + head.offsetHeight;
  const HEAD_MID = Math.round((STAGE.y0 + STAGE.y1) / 2 - head.offsetHeight / 2);   // bar 18: centered
  const HEAD_UP = { t0: T.sheet - LEAD, dur: 0.36 };
  const headY = (t) => (HEAD_MID - HEAD_TOP) * (1 - easeInOut(p01(t, HEAD_UP.t0, HEAD_UP.dur)));
  const TAGS_Y = 1196;
  tagRow.style.top = `${TAGS_Y}px`;
  // A rising card's bottom (its mark + RISE) stays above the tags.
  const SLOT = { y0: HEAD_BOTTOM + 70, y1: TAGS_Y - 86 };
  const SH = SLOT.y1 - SLOT.y0;
  // The gradient runs across the phrase "own work.", not word by word.
  const gw = headWords.filter((w) => GRAD.has(w.textContent));
  const gx0 = Math.min(...gw.map((w) => w.offsetLeft)), gx1 = Math.max(...gw.map((w) => w.offsetLeft + w.offsetWidth));
  for (const w of gw) Object.assign(w.style, { backgroundSize: `${gx1 - gx0}px 100%`, backgroundPosition: `${gx0 - w.offsetLeft}px 0px` });

  // 1. The contact sheet: nine cells on a plate.
  const PAD = 22, GAP = 12;
  const cellAspect = cellRects[0].w / cellRects[0].h;
  const CH = (SH - 2 * PAD - 2 * GAP) / 3, CW = CH * cellAspect;
  const sheetW = 3 * CW + 2 * GAP + 2 * PAD;
  const sheet = card("sheet", sheetW, SH, "#161617");
  const cells = cellRects.map((r, i) => {
    const el = crop(sheet, sheetImg, r, CW, CH, { borderRadius: "10px", boxShadow: "inset 0 0 0 1px rgba(245,245,247,0.10)" });
    place(el, PAD + (i % 3) * (CW + GAP), PAD + Math.floor(i / 3) * (CH + GAP));
    return { el, t: T.sheet + (i + 2) * SIX };
  });
  // 2. The onion skin: its frame, cropped from the paper, the deck's height.
  const onionH = SH, onionW = onionH * (onionRect.w / onionRect.h);
  const onion = card("onion", onionW, onionH, "#000");
  crop(onion, onionImg, onionRect, onionW, onionH);
  // 3. The speed graph: its panel, the stage's width; the plot draws on over a faint copy.
  const graphW = SAFE_W, graphH = graphW * (graphRect.h / graphRect.w);
  const graph = card("graph", graphW, graphH, surface);
  crop(graph, graphImg, graphRect, graphW, graphH, { opacity: "0.26" });
  const graphInk = crop(graph, graphImg, graphRect, graphW, graphH, { clipPath: "inset(0px 100% 0px 0px)" });
  const DRAW = { t0: T.graph + 0.15, dur: 0.55 };

  // Marks: the sheet and the onion fill the slot; the graph sits low enough that the onion behind
  // it shows only above it (one step back is 60 px up and 8% smaller, about its top edge).
  const RISE = 80, STEP = 0.6 * RISE, LAG = 0.15, SHRINK = 0.08, DIM = 0.7;
  const ARRIVE = { duration: 0.6, damping: 0.82 }, BACK = { duration: 0.55, damping: 0.82 };
  const onionBackBottom = SLOT.y0 - STEP + onionH * (1 - SHRINK);
  const graphTop = Math.min(SLOT.y1 - graphH, Math.max(SLOT.y0 + (SH - graphH) / 2, onionBackBottom + 8 - graphH));
  const deck = [
    { el: sheet, t0: cells[0].t, top: SLOT.y0, rise: false },     // the sheet's moment is its first cell
    { el: onion, t0: T.onion, top: SLOT.y0, rise: true },
    { el: graph, t0: T.graph, top: graphTop, rise: true },
  ].map((c, i) => {
    c.el.style.top = `${c.top.toFixed(2)}px`;
    c.el.style.zIndex = String(10 + i);
    return { ...c, i, veil: veil(c.el) };
  });

  // ---------- poses (pure functions of t) ----------
  const pose = (c, t) => {
    const later = deck.filter((d) => d.i > c.i);
    const back = later[0] ? spring01(t, later[0].t0 + LAG, BACK) : 0;
    const dim = later[0] ? easeOut(p01(t, later[0].t0 + LAG, 0.45)) : 0;
    const retire = later[1] ? easeIn(p01(t, later[1].t0 + LAG, 0.3)) : 0;
    const arrive = c.rise ? spring01(t, c.t0 - LEAD, ARRIVE) : 1;
    // A short fade: the card is opaque before it has risen far, so it never reads as a double exposure.
    const fadeIn = c.rise ? easeOut(p01(t, c.t0 - LEAD, 0.16)) : easeOut(p01(t, cells[0].t - LEAD, 0.15));
    return { y: RISE * (1 - arrive) - STEP * back, s: 1 - SHRINK * back, opacity: fadeIn * (1 - retire), veil: DIM * dim };
  };
  const scaleAt = (t) => drift(t, cutIn, cutOut, 0.03);
  const front = (t) => [...deck].reverse().find((c) => t >= c.t0 - LEAD);

  // ---------- checks ----------
  const op = (e) => (e.style.visibility === "hidden" ? 0 : Number(e.style.opacity || 1));
  check(`${S} the three review pictures decode; the sheet yields 9 cells, the onion its frame, the graph its panel`, cutIn, () => {
    if (cellsFound.length < 9) return `the sheet has ${cellsFound.length} cells (the 3×3 split stands in)`;
    const aspectOk = Math.abs(onionRect.w / onionRect.h - 0.8) < 0.02 && graphRect.w / graphRect.h > 1.2;
    return aspectOk || `onion ${onionRect.w}×${onionRect.h}, graph ${graphRect.w}×${graphRect.h}`;
  });
  check(`${S} "It checks its own work." lands on bar 18 (f${Math.round(T.head * FPS)}), words 80 ms apart, settled by f${Math.ceil((T.head + 0.92) * FPS)}`, [T.head + 0.92, cutOut - 1 / FPS], () =>
    headWords.every((w) => op(w) > 0.999 && (w.style.filter === "none" || !w.style.filter)) || "a word is not settled");
  check(`${S} the headline holds ${(cutOut - T.head).toFixed(2)} s, over the 0.3 s a word + 0.5 s floor (${(0.3 * headWords.length + 0.5).toFixed(1)} s)`, cutIn, () =>
    cutOut - (T.head + 0.32 + 0.3) >= 0.3 * headWords.length + 0.5 || "too short");
  check(`${S} the 9 cells land one by one on the sixteenths of bar 19 beats 0.5–2.5 (f${Math.round(cells[0].t * FPS)}–f${Math.round(cells[8].t * FPS)})`, [T.sheet - 0.1, cells[8].t + 0.45], (t) => {
    for (const [i, c] of cells.entries()) {
      const o = op(c.el);
      if (t < c.t - LEAD - EPS && o > 0) return `cell ${i + 1} early at ${t.toFixed(3)}`;
      if (t >= c.t - LEAD + 0.4 && o < 0.999) return `cell ${i + 1} not landed at ${t.toFixed(3)}`;
    }
    return true;
  });
  check(`${S} the finished sheet holds still from f${Math.ceil((cells[8].t + 0.4) * FPS)} to 150 ms after bar 20`, [cells[8].t + 0.4, T.onion + LAG - 1 / FPS], (t) => {
    const p = pose(deck[0], t);
    return (cells.every((c) => op(c.el) > 0.999 && /scale\(1(\.0+)?\)/.test(c.el.style.transform)) && p.y === 0 && p.s === 1 && p.veil === 0) || "the sheet moves";
  });
  deck.slice(1).forEach((c, j) => {
    const until = deck[j + 2] ? deck[j + 2].t0 : cutOut - 1 / FPS;
    const at = c.t0 + 0.7;                                  // ζ 0.82 overshoots under 1 px, back inside 0.5 px by 0.7 s
    check(`${S} the ${c.el.id.slice(4)} rises onto its mark (top ${c.top.toFixed(0)}, ±0.5 px) by f${Math.ceil(at * FPS)} and holds until the next card`, [at, until], (t) => {
      const p = pose(c, t);
      return (Math.abs(p.y) < 0.5 && p.opacity > 0.999 && p.s === 1) || `y ${p.y.toFixed(2)} opacity ${p.opacity.toFixed(3)}`;
    });
  });
  check(`${S} each card steps back ${LAG * 1000} ms after the next arrives and travels 60% as far (${STEP} px)`, cutIn, () => {
    for (let j = 1; j < deck.length; j++) {
      const prev = deck[j - 1], t0 = deck[j].t0;
      const still = pose(prev, t0 + LAG - 1 / FPS).y, before = pose(prev, t0 - 0.05).y, moved = pose(prev, t0 + 1.0).y;
      if (Math.abs(still - before) > 0.01) return `${prev.el.id} moves before ${LAG * 1000} ms`;
      if (Math.abs(before - moved - STEP) > 0.6) return `${prev.el.id} steps ${(before - moved).toFixed(2)} px`;
    }
    return true;
  });
  check(`${S} one card in front at a time; a card two steps back is gone 0.35 s after the third arrives`, [cutIn, cutOut - 1 / FPS], (t) => {
    if (t >= T.graph + LAG + 0.35 && op(sheet) > 0.001) return "the sheet has not retired";
    const f = front(t);
    return !f || deck.every((d) => d.i <= f.i || op(d.el) === 0) || "a later card shows early";
  });
  const hidden = () => Number((graphInk.style.clipPath.match(/inset\(\s*\S+\s+([\d.]+)%/) || [0, 0])[1]);
  check(`${S} the graph's plot draws on left to right and is complete ${(T.end - DRAW.t0 - DRAW.dur).toFixed(2)} s before the cut`, [T.graph, cutOut - 1 / FPS], (t) => {
    if (t < DRAW.t0 - EPS) return hidden() === 100 || `drawn early: ${hidden()}% hidden`;
    if (t >= DRAW.t0 + DRAW.dur) return hidden() === 0 || `${hidden()}% still hidden`;
    return true;
  });
  const rgb = (h) => mix(h, h, 0).replace(/,/g, ", ");
  check(`${S} each tag lights white 150 ms after its card arrives and turns grey when the next card does`, [T.sheet, cutOut - 1 / FPS], (t) => {
    for (const [i, g] of tags.entries()) {
      const t0 = deck[i].t0 + LAG, next = deck[i + 1] ? deck[i + 1].t0 + LAG : Infinity;
      const col = getComputedStyle(g.el).color;
      if (t < t0 - EPS && op(g.el) > 0) return `${TAGS[i]} early`;
      if (t >= t0 + 0.3 && op(g.el) < 0.999) return `${TAGS[i]} not on`;
      if (t >= t0 + 0.3 && t < next - EPS && col !== rgb(C.white)) return `${TAGS[i]} ${col}, not white`;
      if (t >= next + 0.3 && col !== rgb(C.mutedDark)) return `${TAGS[i]} ${col}, not grey`;
    }
    return true;
  });
  check(`${S} the headline is centered through bar 18 and still at the top from f${Math.ceil((HEAD_UP.t0 + HEAD_UP.dur) * FPS)}`, [cutIn, cutOut - 1 / FPS], (t) => {
    const y = headY(t);
    if (t < HEAD_UP.t0 - EPS) return Math.abs(y - (HEAD_MID - HEAD_TOP)) < 1e-6 || `moved early: ${y.toFixed(2)}`;
    if (t >= HEAD_UP.t0 + HEAD_UP.dur) return y === 0 || `not home: ${y.toFixed(2)}`;
    return true;
  });
  check(`${S} the headline clears the sheet before its plate and first cell appear`, [cells[0].t - LEAD, cells[0].t + 0.1], (t) => {
    const hb = HEAD_TOP + headY(t) + head.offsetHeight, top = SLOT.y0 + PAD - CH * 0.07;
    return hb < SLOT.y0 || `headline bottom ${hb.toFixed(1)} vs plate top ${SLOT.y0.toFixed(1)} (first cell ${top.toFixed(1)})`;
  });
  check(`${S} headline, deck and tags sit inside the stage, apart`, [T.head + 0.6, cutOut - 1 / FPS], () => {
    const items = [head, tagRow, ...deck.filter((d) => op(d.el) > 0.01).map((d) => d.el)];
    for (const e of items) {
      const b = box(e);
      if (b.x < STAGE.x0 - 0.5 || b.x + b.w > STAGE.x1 + 0.5 || b.y < STAGE.y0 || b.y + b.h > STAGE.y1) return `${e.id} at x ${b.x.toFixed(0)}–${(b.x + b.w).toFixed(0)} y ${b.y.toFixed(0)}–${(b.y + b.h).toFixed(0)}`;
    }
    for (const d of deck) if (op(d.el) > 0.01 && (overlap(head, d.el) > 0 || overlap(tagRow, d.el) > 0)) return `${d.el.id} touches the headline or the tags`;
    return true;
  });

  // ---------- seek ----------
  return (t) => {
    stage.style.transform = `scale(${scaleAt(t).toFixed(5)})`;
    head.style.transform = `translateY(${headY(t).toFixed(2)}px)`;
    headWords.forEach((w, i) => reveal(w, t, T.head - LEAD + i * 0.08));
    for (const c of deck) {
      const p = pose(c, t);
      c.el.style.transform = `translate(0px, ${p.y.toFixed(2)}px) scale(${p.s.toFixed(4)})`;
      c.el.style.opacity = p.opacity.toFixed(4);
      c.el.style.visibility = p.opacity < 0.001 ? "hidden" : "visible";
      c.veil.style.opacity = p.veil.toFixed(4);
    }
    for (const c of cells) show(c.el, t, c.t - LEAD, Infinity, { dur: 0.4, dy: 0, scale: 1.14, blur: 8, ease: easeOutExpo });
    const ink = easeInOut(p01(t, DRAW.t0, DRAW.dur));
    graphInk.style.clipPath = `inset(0px ${((1 - ink) * 100).toFixed(3)}% 0px 0px)`;
    tags.forEach((g, i) => {
      const t0 = deck[i].t0 + LAG;
      const a = easeOut(p01(t, t0, 0.3));
      g.el.style.opacity = a.toFixed(4);
      if (g.dot) g.dot.style.opacity = a.toFixed(4);
      const grey = deck[i + 1] ? easeOut(p01(t, deck[i + 1].t0 + LAG, 0.3)) : 0;
      g.el.style.color = mix(C.white, C.mutedDark, grey);
    });
  };
}
