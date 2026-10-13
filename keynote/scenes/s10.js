// s10 Review · black · bars 23–27 (50.18–58.91): cut in, cut out. Four bars, one card a bar.
//   Bar 23 (the build):  one Apple caption line, "It checks its own work" (.caption, 64 px, "its own
//                        work" in gray), appears centered on the downbeat (appear(): 0.9 s, 24 px up,
//                        8 px of blur).
//   Bar 23 beat 3:       the music stops for a beat; the caption glides up to the top (ease-in-out,
//                        0.5 s), making room, and is still there by the boom. The cards fill the rest.
//   Bar 24 (the boom):   this film's contact sheet rises onto the deck and assembles: its 9 cells land one
//                        by one on the 32nd notes of beat 0 (eighths would need 4 beats and run into bar
//                        25; sixteenths would leave the finished sheet under a second), so the finished
//                        sheet holds about 1.3 s.
//   Bar 25:              the onion skin rises onto the deck.
//   Bar 26:              the speed graph rises; its plot draws on left to right as it arrives.
// Each card rises 64 px on a spring (ζ 0.82); the card before steps back 150 ms later, travelling 60% as
// far, 8% smaller and dimmed; a card two steps back retires. Three tags under the deck light as their
// cards arrive. The whole shot pushes in 1.00 -> 1.05, ease-in-out from the cut to the cut.
//
// The pictures are assets/sheet.png, onion.png and graph.png, which will be replaced by this film's own
// (same names and layout), so nothing here knows their content. regions() finds the review tools'
// pictures on their paper (dense rectangles of non-paper pixels): the sheet's frame cells, the onion's
// frame and the graph's panel. Those are cropped out of the paper and set large enough to read on a phone.

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
  const { make, place, barT, SPB, appear, show, spring01, easeOut, easeIn, easeInOut, p01, mix, check, box, overlap, C, STAGE } = k;
  const S = "s10", FPS = 60, EPS = 1e-6, LEAD = 2 / FPS;
  const { cutIn, cutOut } = k.win;
  const T = { head: barT(23), stop: barT(23, 3), sheet: barT(24), onion: barT(25), graph: barT(26), end: barT(27) };
  const N32 = SPB() / 8;                                    // a 32nd note

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

  // ---------- the stage: a slow push, 1.00 -> 1.05, ease-in-out across the shot ----------
  const PUSH = 0.05;
  const scaleAt = (t) => 1 + PUSH * easeInOut(p01(t, cutIn, cutOut - cutIn));
  const stage = make("div", "", "", root, { position: "absolute", inset: "0px", transformOrigin: "540px 675px" });
  // 920 px about the centre stays inside x 54–1026 at 1.05; y 124–1227 stays inside y 96–1255.
  const SAFE_W = 920, X0 = 540 - SAFE_W / 2, SW = SAFE_W;
  const SAFE_Y0 = 126, SAFE_Y1 = 1226;

  // ---------- the caption: an outer box for the glide, an inner one for appear() ----------
  const HEAD_TOP = SAFE_Y0;                                 // the caption's place once the deck arrives
  const head = place(make("div", "", "", stage, { width: `${SW}px` }), X0, HEAD_TOP);
  head.id = "s10-caption";
  const CAPTION = "It checks its own work";
  const headIn = make("div", "caption", 'It checks <span class="soft">its own work</span>', head);

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
  // Layout from the measured caption: the deck between it and the tags.
  const HEAD_H = head.offsetHeight;
  const HEAD_BOTTOM = HEAD_TOP + HEAD_H;
  const HEAD_MID = Math.round(675 - HEAD_H / 2);            // bar 23: centered in the frame
  const HEAD_UP = { t0: T.stop - LEAD, dur: 0.5 };          // the glide fills the stop and ends before the boom
  const headY = (t) => (HEAD_MID - HEAD_TOP) * (1 - easeInOut(p01(t, HEAD_UP.t0, HEAD_UP.dur)));
  const TAG_H = tagRow.offsetHeight;
  const TAGS_Y = SAFE_Y1 - TAG_H;
  tagRow.style.top = `${TAGS_Y}px`;
  const RISE = 64, STEP = 0.6 * RISE, LAG = 0.15, SHRINK = 0.08, DIM = 0.78;
  // The cards take everything between the caption and the tags: a card stepped back (STEP px up) stays
  // 24 px under the caption, and a rising card's bottom (its mark + RISE) stays above the tags.
  const SLOT = { y0: HEAD_BOTTOM + STEP + 24, y1: TAGS_Y - RISE - 12 };
  const SH = SLOT.y1 - SLOT.y0;

  // 1. The contact sheet: nine cells on a plate, landing on the 32nd notes of bar 24 beat 0.
  const PAD = 20, GAP = 12;
  const cellAspect = cellRects[0].w / cellRects[0].h;
  const CH = (SH - 2 * PAD - 2 * GAP) / 3, CW = CH * cellAspect;
  const sheetW = 3 * CW + 2 * GAP + 2 * PAD;
  const sheet = card("sheet", sheetW, SH, "#161617");
  const CELL_IN = 0.35;
  const cells = cellRects.map((r, i) => {
    const el = crop(sheet, sheetImg, r, CW, CH, { borderRadius: "10px", boxShadow: "inset 0 0 0 1px rgba(245,245,247,0.10)" });
    place(el, PAD + (i % 3) * (CW + GAP), PAD + Math.floor(i / 3) * (CH + GAP));
    return { el, t: T.sheet + i * N32 };
  });
  const sheetDone = cells[8].t - LEAD + CELL_IN;            // the last cell has landed
  // 2. The onion skin: its frame, cropped from the paper, the deck's height.
  const onionH = SH, onionW = onionH * (onionRect.w / onionRect.h);
  const onion = card("onion", onionW, onionH, "#000");
  crop(onion, onionImg, onionRect, onionW, onionH);
  // 3. The speed graph: its panel, the column's width; the plot draws on over a faint copy as it arrives.
  const graphW = SAFE_W, graphH = graphW * (graphRect.h / graphRect.w);
  const graph = card("graph", graphW, graphH, surface);
  crop(graph, graphImg, graphRect, graphW, graphH, { opacity: "0.26" });
  const graphInk = crop(graph, graphImg, graphRect, graphW, graphH, { clipPath: "inset(0px 100% 0px 0px)" });
  const DRAW = { t0: T.graph - LEAD, dur: 0.6 };

  // Marks: the sheet and the onion fill the slot; the graph sits low enough that the onion behind it
  // shows only above it (one step back is STEP px up and 8% smaller, about its top edge).
  const ARRIVE = { duration: 0.6, damping: 0.82 }, BACK = { duration: 0.55, damping: 0.82 };
  const onionBackBottom = SLOT.y0 - STEP + onionH * (1 - SHRINK);
  const graphTop = Math.min(SLOT.y1 - graphH, Math.max(SLOT.y0 + (SH - graphH) / 2, onionBackBottom + 8 - graphH));
  const deck = [
    { el: sheet, t0: T.sheet, top: SLOT.y0 },
    { el: onion, t0: T.onion, top: SLOT.y0 },
    { el: graph, t0: T.graph, top: graphTop },
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
    const arrive = spring01(t, c.t0 - LEAD, ARRIVE);
    // A short fade: the card is opaque before it has risen far, so it never reads as a double exposure.
    const fadeIn = easeOut(p01(t, c.t0 - LEAD, 0.1));      // 6 frames: the cards now share one footprint
    return { y: RISE * (1 - arrive) - STEP * back, s: 1 - SHRINK * back, opacity: fadeIn * (1 - retire), veil: DIM * dim };
  };
  const front = (t) => [...deck].reverse().find((c) => t >= c.t0 - LEAD);

  // ---------- checks ----------
  const op = (e) => (e.style.visibility === "hidden" ? 0 : Number(e.style.opacity || 1));
  const f = (t) => `f${Math.round(t * FPS)}`;
  check(`${S} the three review pictures decode; the sheet yields 9 cells, the onion its frame, the graph its panel`, cutIn, () => {
    if (cellsFound.length < 9) return `the sheet has ${cellsFound.length} cells (the 3×3 split stands in)`;
    const aspectOk = Math.abs(onionRect.w / onionRect.h - 0.8) < 0.02 && graphRect.w / graphRect.h > 1.2;
    return aspectOk || `onion ${onionRect.w}×${onionRect.h}, graph ${graphRect.w}×${graphRect.h}`;
  });
  check(`${S} the caption "${CAPTION}" (one 64 px line, "its own work" in gray) appears from 2 frames before bar 23 (the cut, ${f(T.head)}): under 15% on the cut's frame, fully in and sharp by ${f(T.head - LEAD + 0.9)}, held to the cut`, [cutIn, cutOut - 1 / FPS], (t) => {
    if (headIn.textContent !== CAPTION || getComputedStyle(headIn).fontSize !== "64px" || headIn.offsetHeight > 64 * 1.4) return `caption reads “${headIn.textContent}” at ${getComputedStyle(headIn).fontSize}`;
    if (t < cutIn + 0.5 / FPS) return op(headIn) < 0.15 || `already ${op(headIn).toFixed(2)} on the cut`;
    if (t >= T.head - LEAD + 0.9) return (op(headIn) === 1 && headIn.style.filter === "none") || `not settled at ${t.toFixed(3)}`;
    return true;
  });
  check(`${S} the caption is on screen ${(cutOut - T.head).toFixed(2)} s and settled centered ${(HEAD_UP.t0 - (T.head - LEAD + 0.9)).toFixed(2)} s before it glides; the 1.5 s + 0.3 s a word floor is ${(1.5 + 0.3 * 5).toFixed(1)} s`, cutIn, () =>
    cutOut - (T.head - LEAD + 0.9) >= 1.5 + 0.3 * 5 || "too short");
  check(`${S} the caption is centered until the stop (bar 23 beat 3, ${f(T.stop)}), glides up during it, and is still at the top from ${f(HEAD_UP.t0 + HEAD_UP.dur)}, before the boom`, [cutIn, cutOut - 1 / FPS], (t) => {
    const y = headY(t);
    if (HEAD_UP.t0 + HEAD_UP.dur > T.sheet - LEAD) return "the glide runs into the boom";
    if (t < HEAD_UP.t0 - EPS) return Math.abs(y - (HEAD_MID - HEAD_TOP)) < 1e-6 || `moved early: ${y.toFixed(2)}`;
    if (t >= HEAD_UP.t0 + HEAD_UP.dur) return y === 0 || `not home: ${y.toFixed(2)}`;
    return true;
  });
  check(`${S} the sheet rises on the boom (bar 24, ${f(T.sheet)}) and its 9 cells land one by one on the 32nd notes of beat 0 (${f(cells[0].t)}–${f(cells[8].t)})`, [T.sheet - 0.1, sheetDone + 0.05], (t) => {
    for (const [i, c] of cells.entries()) {
      const o = op(c.el);
      if (t < c.t - LEAD - EPS && o > 0) return `cell ${i + 1} early at ${t.toFixed(3)}`;
      if (t >= c.t - LEAD + CELL_IN && o < 0.999) return `cell ${i + 1} not landed at ${t.toFixed(3)}`;
    }
    return true;
  });
  check(`${S} the finished sheet holds still ${(T.onion - LEAD - (T.sheet - LEAD + 0.7)).toFixed(2)} s (from ${f(T.sheet - LEAD + 0.7)}) until the onion skin arrives`, [Math.max(sheetDone, T.sheet - LEAD + 0.7), T.onion - LEAD - 1 / FPS], (t) => {
    const p = pose(deck[0], t);
    const still = cells.every((c) => op(c.el) > 0.999 && /scale\(1(\.0+)?\)/.test(c.el.style.transform));
    return (still && Math.abs(p.y) < 0.5 && p.s === 1 && p.veil === 0) || `the sheet moves (y ${p.y.toFixed(2)})`;
  });
  deck.forEach((c, j) => {
    const until = deck[j + 1] ? deck[j + 1].t0 - LEAD - 1 / FPS : cutOut - 1 / FPS;
    const at = c.t0 + 0.7;                                  // ζ 0.82 overshoots under 1 px, back inside 0.5 px by 0.7 s
    check(`${S} the ${c.el.id.slice(4)} rises onto its mark (top ${c.top.toFixed(0)}, ±0.5 px) by ${f(at)} and holds ${(until - at).toFixed(2)} s, in front, until the next card`, [at, until], (t) => {
      const p = pose(c, t);
      return (Math.abs(p.y) < 0.5 && p.opacity > 0.999 && p.s === 1 && front(t) === c) || `y ${p.y.toFixed(2)} opacity ${p.opacity.toFixed(3)}`;
    });
  });
  check(`${S} each card is in front a full bar (the graph to the cut, ${(cutOut - T.graph).toFixed(2)} s)`, cutIn, () => {
    const spans = deck.map((c, j) => (deck[j + 1] ? deck[j + 1].t0 : cutOut) - c.t0);
    return spans.every((d) => d >= barT(1) - 1e-6) || `in front ${spans.map((d) => d.toFixed(2))} s`;
  });
  check(`${S} each card steps back ${LAG * 1000} ms after the next arrives and travels 60% as far (${STEP.toFixed(1)} px)`, cutIn, () => {
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
    const fr = front(t);
    return !fr ? deck.every((d) => op(d.el) === 0) || "a card shows before the boom" : deck.every((d) => d.i <= fr.i || op(d.el) === 0) || "a later card shows early";
  });
  const hidden = () => Number((graphInk.style.clipPath.match(/inset\(\s*\S+\s+([\d.]+)%/) || [0, 0])[1]);
  check(`${S} the graph's plot draws on left to right as it arrives and is complete ${(cutOut - DRAW.t0 - DRAW.dur).toFixed(2)} s before the cut`, [T.graph - 0.1, cutOut - 1 / FPS], (t) => {
    if (cutOut - (DRAW.t0 + DRAW.dur) < 1.5) return "the finished graph holds under 1.5 s";
    if (t < DRAW.t0 - EPS) return hidden() === 100 || `drawn early: ${hidden()}% hidden`;
    if (t >= DRAW.t0 + DRAW.dur) return hidden() === 0 || `${hidden()}% still hidden`;
    return true;
  });
  const rgb = (h) => mix(h, h, 0).replace(/,/g, ", ");
  check(`${S} each tag lights white 150 ms after its card arrives and turns gray when the next card does`, [T.sheet - 0.1, cutOut - 1 / FPS], (t) => {
    for (const [i, g] of tags.entries()) {
      const t0 = deck[i].t0 + LAG, next = deck[i + 1] ? deck[i + 1].t0 + LAG : Infinity;
      const col = getComputedStyle(g.el).color;
      if (t < t0 - EPS && op(g.el) > 0) return `${TAGS[i]} early`;
      if (t >= t0 + 0.3 && op(g.el) < 0.999) return `${TAGS[i]} not on`;
      if (t >= t0 + 0.3 && t < next - EPS && col !== rgb(C.white)) return `${TAGS[i]} ${col}, not white`;
      if (t >= next + 0.3 && col !== rgb(C.gray)) return `${TAGS[i]} ${col}, not gray`;
    }
    return true;
  });
  check(`${S} the caption is clear of the sheet when its plate first shows`, [T.sheet - LEAD, T.sheet + 0.2], (t) => {
    const hb = HEAD_TOP + headY(t) + HEAD_H, plateTop = SLOT.y0 + pose(deck[0], t).y;
    return hb < plateTop || `caption bottom ${hb.toFixed(1)} vs plate top ${plateTop.toFixed(1)}`;
  });
  check(`${S} caption, deck and tags sit inside the stage and apart through the push`, [cutIn, cutOut - 1 / FPS], () => {
    const items = [...(op(headIn) > 0.01 ? [head] : []), ...(op(tags[0].el) > 0.01 ? [tagRow] : []), ...deck.filter((d) => op(d.el) > 0.01).map((d) => d.el)];
    for (const e of items) {
      const b = box(e);
      if (b.x < STAGE.x0 - 0.5 || b.x + b.w > STAGE.x1 + 0.5 || b.y < STAGE.y0 || b.y + b.h > STAGE.y1) return `${e.id} at x ${b.x.toFixed(0)}–${(b.x + b.w).toFixed(0)} y ${b.y.toFixed(0)}–${(b.y + b.h).toFixed(0)}`;
    }
    for (const d of deck) if (op(d.el) > 0.01 && (overlap(head, d.el) > 0 || overlap(tagRow, d.el) > 0)) return `${d.el.id} touches the caption or the tags`;
    return true;
  });
  check(`${S} the push is 1.00 -> 1.05, ease-in-out from the cut to the cut`, cutIn, () => {
    const a = scaleAt(cutIn), b = scaleAt(cutOut), mid = scaleAt((cutIn + cutOut) / 2);
    return (Math.abs(a - 1) < 1e-9 && Math.abs(b - 1.05) < 1e-9 && Math.abs(mid - 1.025) < 1e-9) || `push ${a} ${mid} ${b}`;
  });

  // ---------- seek ----------
  return (t) => {
    stage.style.transform = `scale(${scaleAt(t).toFixed(5)})`;
    head.style.transform = `translateY(${headY(t).toFixed(2)}px)`;
    appear(headIn, t, T.head - LEAD);
    for (const c of deck) {
      const p = pose(c, t);
      c.el.style.transform = `translate(0px, ${p.y.toFixed(2)}px) scale(${p.s.toFixed(4)})`;
      c.el.style.opacity = p.opacity.toFixed(4);
      c.el.style.visibility = p.opacity < 0.001 ? "hidden" : "visible";
      c.veil.style.opacity = p.veil.toFixed(4);
    }
    for (const c of cells) show(c.el, t, c.t - LEAD, Infinity, { dur: CELL_IN, dy: 0, scale: 1.06 });
    const ink = easeInOut(p01(t, DRAW.t0, DRAW.dur));
    graphInk.style.clipPath = `inset(0px ${((1 - ink) * 100).toFixed(3)}% 0px 0px)`;
    tags.forEach((g, i) => {
      const t0 = deck[i].t0 + LAG;
      const a = easeOut(p01(t, t0, 0.3));
      g.el.style.opacity = a.toFixed(4);
      if (g.dot) g.dot.style.opacity = a.toFixed(4);
      const gray = deck[i + 1] ? easeOut(p01(t, deck[i + 1].t0 + LAG, 0.3)) : 0;
      g.el.style.color = mix(C.white, C.gray, gray);
    });
  };
}
