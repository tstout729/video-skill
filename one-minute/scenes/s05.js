// s05 Voice and timing · pine · 28.85–35.53, a wipe brings it in, a zoom-through takes it out from 34.73.
// Three rows, each headed by the real file it comes from, on screen from the wipe:
//   narration.json  "writes the script": this scene's own narration (window.NARRATION_TEXT.s05) types on.
//   narration.wav   "records the voice": the real waveform of this scene's narration draws on, from
//                   assets/peaks.json over window.SCENES.s05.
//   words.js        "times every move to the words": a playhead runs along that waveform at the true
//                   time t, and each word lights as it is spoken, pinned to its words.js start time.
// Accents in mint (saffron fails on pine). Nothing is invented: every word, time and peak is read here.

export default async function build(root, k) {
  const { make, place, show, cueIn, chrome, mix, easeOut, easeInOut, p01, clamp, check, box, overlap, C } = k;
  const { cutIn, outStart, cutOut } = k.win;
  const FPS = 60;
  const EPS = 1e-6;
  root.style.background = C.pine;
  root.classList.add("dark");
  chrome(root, 5, "VOICE AND TIMING", true);

  // ---- the sources ----
  const SC = window.SCENES[k.id];
  const TEXT = window.NARRATION_TEXT[k.id];
  const PEAKS = await (await fetch("assets/peaks.json")).json();
  const RATE = PEAKS.rate;
  const i0 = Math.round(SC.start * RATE), i1 = Math.round(SC.end * RATE);
  const peaks = PEAKS.peaks.slice(i0, i1);               // one peak per 10 ms of this scene's narration
  const T0 = i0 / RATE, T1 = i1 / RATE;
  const vmax = Math.max(...peaks);

  // ---- cues ----
  const tScript = cueIn(k.id, "writes the script");
  const tVoice = cueIn(k.id, "records the voice");
  const tTiming = cueIn(k.id, "times every move to the words");
  const clean = (w) => w.replace(/[^\p{L}\p{N}'’-]/gu, "");
  const lit = window.WORDS.filter((w) => w.start >= tTiming && w.start <= SC.end + 0.01)
    .map((w) => ({ word: clean(w.word), start: w.start, raw: w }));

  const X0 = 54, W = 972;
  const label = (str, y) => place(make("div", "mono", str, root, { fontSize: "28px", lineHeight: "36px", fontWeight: "500", color: C.mutedDark, letterSpacing: "0.02em", whiteSpace: "nowrap" }), X0, y);

  // ---- row 1: the script ----
  const L1 = label("narration.json", 168);
  const SCRIPT_CPS = 84;                                  // 76 letters in 0.9 s, done before "records"
  const SCRIPT_Y = 212;
  const script = place(make("div", "mono", "", root, { fontSize: "40px", lineHeight: "54px", fontWeight: "500", color: C.canvas, width: `${W}px` }), X0, SCRIPT_Y);
  const sChars = [...TEXT].map((ch) => make("span", "", ch, script, { visibility: "hidden" }));
  const sCaret = place(make("div", "", "", root, { width: "3px", height: "44px", borderRadius: "2px", background: C.mint, visibility: "hidden" }), 0, 0);
  const typedAt = (j) => tScript + j / SCRIPT_CPS;
  const tTyped = typedAt(sChars.length - 1);

  // ---- row 2: the voice ----
  const L2 = label("narration.wav", 376);
  const WAVE_Y = 424, WAVE_H = 240, BAR_W = 2.6;
  const NS = "http://www.w3.org/2000/svg";
  const svgEl = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const [a, v] of Object.entries(attrs)) e.setAttribute(a, v);
    parent.appendChild(e);
    return e;
  };
  const wave = document.createElementNS(NS, "svg");
  wave.setAttribute("width", W);
  wave.setAttribute("height", WAVE_H);
  Object.assign(wave.style, { position: "absolute", left: `${X0}px`, top: `${WAVE_Y}px`, overflow: "visible" });
  root.appendChild(wave);
  // The empty track, on screen from the wipe: a hairline where the voice will draw.
  svgEl("path", { d: `M0 ${WAVE_H / 2} H${W}`, stroke: C.mutedDark, "stroke-opacity": 0.35, "stroke-width": 2 }, wave);
  const clip = svgEl("clipPath", { id: "s05-wave-reveal" }, svgEl("defs", {}, wave));
  const reveal = svgEl("rect", { x: -2, y: -2, width: 0, height: WAVE_H + 4 }, clip);
  const bars = svgEl("g", { "clip-path": "url(#s05-wave-reveal)", fill: C.mutedDark }, wave);
  // Two peaks per bar (20 ms), the louder of the two; a bar sits on the middle of its 20 ms.
  const xOf = (t) => ((t - T0) / (T1 - T0)) * W;         // in the waveform's own x
  const barH = [];
  for (let j = 0; j * 2 < peaks.length; j++) {
    const v = Math.max(peaks[2 * j], peaks[2 * j + 1] ?? 0);
    const h = Math.max(BAR_W, (v / vmax) * WAVE_H);
    const cx = xOf(T0 + (2 * j + 1) / RATE);
    barH.push(h);
    svgEl("rect", { x: (cx - BAR_W / 2).toFixed(2), y: ((WAVE_H - h) / 2).toFixed(2), width: BAR_W, height: h.toFixed(2), rx: BAR_W / 2 }, bars);
  }
  const DRAW = 0.9;                                       // the reveal crosses the frame: ease-in-out

  // ---- row 3: the timing ----
  const L3 = label("words.js", 704);
  const PH_TOP = WAVE_Y - 18, PH_H = WAVE_H + 36;
  const playhead = place(make("div", "", "", root, { width: "3px", marginLeft: "-1.5px", height: `${PH_H}px`, borderRadius: "2px", background: C.mint }), X0, PH_TOP);
  make("div", "", "", playhead, { position: "absolute", left: "-5.5px", top: "-7px", width: "14px", height: "14px", borderRadius: "7px", background: C.mint });
  playhead.id = "s05-playhead";
  const LEAD_TOP = WAVE_Y + WAVE_H + 12, ROW0 = 752, PITCH = 52, ROW_H = 44, GAP = 14;
  const marks = lit.map((w, i) => {
    const x = X0 + xOf(w.start), rowY = ROW0 + i * PITCH;
    const leader = place(make("div", "", "", root, { width: "2px", marginLeft: "-1px", background: C.mint, transformOrigin: "50% 0" }), x, LEAD_TOP, null, rowY + ROW_H / 2 - LEAD_TOP);
    const lab = place(make("div", "mono", "", root, { fontSize: "34px", lineHeight: `${ROW_H}px`, fontWeight: "500", whiteSpace: "pre" }), 0, rowY);
    const wd = make("span", "", w.word, lab);
    const tm = make("span", "", ` · ${w.start.toFixed(2)} s`, lab);
    return { ...w, x, rowY, leader, lab, wd, tm, next: lit[i + 1]?.start ?? Infinity };
  });

  // ---- measure (fonts loaded) ----
  await document.fonts.ready;
  const sStops = sChars.map((c) => ({ x: c.offsetLeft + c.offsetWidth, y: c.offsetTop }));
  for (const m of marks) {
    m.w = m.lab.offsetWidth;
    m.lab.style.left = `${(m.x - GAP - m.w).toFixed(2)}px`;   // labels hang left of their leader
  }
  const playX = (t) => X0 + xOf(clamp(t, T0, T1));
  const LIGHT = 0.25, FADE = 0.12;
  const css = (c) => { const d = document.createElement("div"); d.style.color = c; return d.style.color; };
  const MINT = css(C.mint);

  // ---- checks ----
  const solo = (a, b) => [Math.max(a, cutIn), Math.min(b, outStart - 1 / FPS)];
  const shown = (e) => Number(e.style.opacity || 1) > 0.999 && e.style.visibility !== "hidden";
  check("s05 composed from the wipe: three file labels on screen at cutIn", cutIn, () =>
    [L1, L2, L3].every((e) => shown(e) && box(e).w > 0) || "a label is missing");
  check(`s05 the script is narration.json's own s05 line, typed by f${Math.ceil(tTyped * FPS)}, before “records”`, Math.ceil(tTyped * FPS) / FPS, () => {
    const typed = sChars.filter((c) => c.style.visibility === "visible").map((c) => c.textContent).join("");
    if (typed !== TEXT) return `typed “${typed}”`;
    return tTyped + 0.2 <= tVoice || `typing ends ${(tVoice - tTyped).toFixed(2)} s before “records”`;
  });
  check(`s05 the waveform is peaks.json ${i0}–${i1} (${(T1 - T0).toFixed(2)} s, the scene's narration), every bar to scale`, solo(tVoice + DRAW, tTiming), () => {
    const rects = [...bars.children];
    if (rects.length !== Math.ceil(peaks.length / 2)) return `${rects.length} bars for ${peaks.length} peaks`;
    const bad = rects.findIndex((r, j) => Math.abs(Number(r.getAttribute("height")) - Math.max(BAR_W, (Math.max(peaks[2 * j], peaks[2 * j + 1] ?? 0) / vmax) * WAVE_H)) > 0.01);
    if (bad >= 0) return `bar ${bad} off scale`;
    return Number(reveal.getAttribute("width")) >= W + 4 || `revealed ${reveal.getAttribute("width")} px`;
  });
  check("s05 the waveform is fully drawn before the playhead appears", cutIn, () => tVoice + DRAW <= tTiming || `drawn at ${(tVoice + DRAW).toFixed(2)}, playhead at ${tTiming.toFixed(2)}`);
  check("s05 the playhead is at the true time t on every frame (±0.5 px)", solo(tTiming, outStart), (t) => {
    const got = box(playhead).cx, want = playX(t);
    return Math.abs(got - want) < 0.5 || `x ${got.toFixed(2)}, t says ${want.toFixed(2)}`;
  });
  for (const m of marks) {
    const f = Math.round(m.start * FPS);
    check(`s05 “${m.word}” lights at its words.js start, ${m.start.toFixed(2)} s (f${f})`, [(f - 1) / FPS, (f + 18) / FPS], (t) => {
      if (`${m.word} · ${m.raw.start.toFixed(2)} s` !== m.lab.textContent) return `reads “${m.lab.textContent}”`;
      if (t < m.start - EPS) return Number(m.lab.style.opacity) === 0 || "on before its word";
      if (t >= m.start + LIGHT && !shown(m.lab)) return "not fully lit";
      if (t >= m.start + LIGHT && m.next > m.start + LIGHT + FADE && m.wd.style.color !== MINT) return `color ${m.wd.style.color}`;
      return true;
    });
    check(`s05 “${m.word}” leader sits on ${m.start.toFixed(2)} s on the waveform (±0.5 px)`, solo(m.start + LIGHT, outStart), () =>
      Math.abs(box(m.leader).cx - playX(m.start)) < 0.5 || `leader at ${box(m.leader).cx.toFixed(2)}`);
  }
  check("s05 lit words clear each other, the leaders and the file labels", solo(tTiming, outStart), () => {
    const els = [L1, L2, L3, script, ...marks.map((m) => m.lab)];
    for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
      const o = overlap(els[i], els[j]);
      if (o > 0) return `${els[i].textContent.slice(0, 16)} × ${els[j].textContent.slice(0, 16)}: ${o | 0} px²`;
    }
    for (const m of marks) for (const n of marks) if (m !== n && overlap(m.lab, n.leader) > 0) return `“${m.word}” crosses the leader of “${n.word}”`;
    return true;
  });
  check("s05 everything stays on the stage (x 54–1026, y 140–1100): nothing in the caption band", solo(cutIn, outStart), () => {
    for (const e of [L1, L2, L3, script, wave, playhead, ...marks.flatMap((m) => [m.lab, m.leader])]) {
      if (e.style.visibility === "hidden" || Number(e.style.opacity || 1) < 0.01) continue;
      const b = box(e);
      if (b.x < 46 || b.x + b.w > 1034 || b.y < 140 || b.y + b.h > 1100) return `${(e.textContent || e.id || e.tagName).slice(0, 20)} at ${b.x.toFixed(0)},${b.y.toFixed(0)} ${b.w.toFixed(0)}×${b.h.toFixed(0)}`;
    }
    return true;
  });
  check("s05 holds still from the zoom-through: the playhead has stopped and every word is lit", [outStart, cutOut], (t) =>
    (t >= T1 && marks.every((m) => t >= m.start + LIGHT && (m.next === Infinity || t >= m.next + FADE))) || "still moving");

  // ---- seek ----
  return (t) => {
    // Row 1: the script types on behind a caret.
    let n = -1;
    sChars.forEach((c, j) => {
      const on = t >= typedAt(j) - EPS;
      c.style.visibility = on ? "visible" : "hidden";
      if (on) n = j;
    });
    const typing = t >= tScript - EPS && t < tTyped + 0.2;
    sCaret.style.visibility = typing ? "visible" : "hidden";
    if (typing) {
      const st = n < 0 ? { x: 0, y: 0 } : sStops[n];
      sCaret.style.transform = `translate(${(X0 + st.x + 3).toFixed(2)}px, ${(SCRIPT_Y + st.y + 5).toFixed(2)}px)`;
    }

    // Row 2: the waveform draws on from the left.
    reveal.setAttribute("width", ((W + 4) * easeInOut(p01(t, tVoice, DRAW))).toFixed(2));

    // Row 3: the playhead at the true time, and each word lit on its start.
    show(playhead, t, tTiming, Infinity, { dur: 0.2, dy: 0 });
    playhead.style.transform = `translateX(${(playX(t) - X0).toFixed(3)}px)`;
    for (const m of marks) {
      const a = easeOut(p01(t, m.start, LIGHT));
      m.leader.style.transform = `scaleY(${a.toFixed(4)})`;
      m.leader.style.opacity = a > 0 ? "1" : "0";
      m.lab.style.opacity = a.toFixed(4);
      m.lab.style.visibility = a > 0 ? "visible" : "hidden";
      // The word being spoken is mint; once the next word starts it settles to canvas, its time to muted.
      const past = p01(t, m.next, FADE);
      m.wd.style.color = mix(C.mint, C.canvas, past);
      m.tm.style.color = mix(C.mint, C.mutedDark, past);
      m.leader.style.background = mix(C.mint, C.mutedDark, past);
    }
  };
}
