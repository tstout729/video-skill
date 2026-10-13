// s09 Voice · black · bars 20–23 (43.24–50.18): a 0.8 s dissolve from s08 brings it in, a cut takes it out.
// George's take (one-minute's s05 line, an ElevenLabs voice, 4.88 s) starts at bar 20 beat 1 (44.18 s).
// Its sentence is set large and centered, one clause a line. Every word is dim until its start time in
// audio/voice.json, then white; the word being spoken is in the gradient (the sentence is the
// demonstration, so it is the one large text here, at most 84 px). Under it, the take's waveform
// (audio/peaks.json, 10 ms peaks) runs the same way: the whole take is drawn dim, and the bars turn white
// as a playhead crosses them at the true time. Under that, one Apple caption line (.caption, 64 px):
// "A voice, timed to every word", the second half in gray. Nothing is invented: every time and every
// bar comes from those two files.
// The whole picture is on screen from the dissolve (the take starts 0.14 s after it ends, so an entrance
// would compete with the first word). The only motion is the voice itself and a slow push 1.00 -> 1.04.
export default async function build(root, k) {
  const { make, place, barT, check, box, overlap, clamp, easeOut, easeInOut, p01, C, STAGE } = k;
  const S = "s09", FPS = 60, EPS = 1e-6;
  const { cutIn, inEnd, cutOut } = k.win;

  // ---- the sources ----
  const V = window.VOICE;                                   // text, duration, words (relative to the take)
  const PEAKS = await (await fetch("audio/peaks.json")).json();
  const T0 = barT(20, 1);                                   // the take starts here (44.18 s)
  const DUR = V.duration;
  // The last word's handoff is the take's end (voice.json gives "words." an end 0.08 s past the audio).
  const words = V.words.map((w, i) => ({ ...w, i, next: V.words[i + 1]?.start ?? Math.min(w.end, DUR) }));
  const tLast = T0 + words.at(-1).next;                     // the last word turns white at the take's end

  // ---- the push: 1.00 -> 1.04, ease-in-out across the shot, about the frame's centre ----
  const PUSH = 0.04;
  const scaleAt = (t) => 1 + PUSH * easeInOut(p01(t, cutIn, cutOut - cutIn));
  const stage = make("div", "", "", root, { position: "absolute", inset: "0px", transformOrigin: "540px 675px" });
  // 920 px about the centre stays inside x 54–1026 at 1.04.
  const W = 920, X0 = 540 - W / 2;

  // ---- the sentence, one clause a line ----
  const BREAK_AFTER = new Set(["script,", "voice,", "move"]);
  const sentence = place(make("div", "", "", stage, {
    width: `${W}px`, textAlign: "center", fontWeight: "700", letterSpacing: "-0.04em", lineHeight: "1.04", color: C.dim,
  }), X0, 0);
  sentence.id = "s09-sentence";
  let line = make("div", "", "", sentence, { whiteSpace: "nowrap" });
  // One span a word, in one of three looks: dim (not yet spoken), the gradient (being spoken, text
  // clipped from the background), white (spoken). The gradient hands over to white through a white
  // layer laid over it inside the same span, so there is never a second copy of the word.
  const spans = words.map((w, i) => {
    const el = make("span", "", w.word, line, { display: "inline-block", color: C.dim });
    if (BREAK_AFTER.has(w.word)) line = make("div", "", "", sentence, { whiteSpace: "nowrap" });
    else if (i < words.length - 1) line.appendChild(document.createTextNode(" "));
    return { ...w, el };
  });
  const GRAD = `linear-gradient(100deg, ${C.saffron} 0%, ${C.orange} 52%, ${C.clay} 100%)`;
  const WHITE_RGB = [1, 3, 5].map((j) => parseInt(C.white.slice(j, j + 2), 16)).join(", ");
  const paint = (el, lit, g) => {
    const st = el.style;
    if (!lit || g <= 0) {
      st.color = lit ? C.white : C.dim;
      st.backgroundImage = "none";
      st.webkitBackgroundClip = st.backgroundClip = "border-box";
      return;
    }
    const a = (1 - g).toFixed(4);
    st.color = "transparent";
    st.backgroundImage = g >= 1 ? GRAD : `linear-gradient(rgba(${WHITE_RGB}, ${a}), rgba(${WHITE_RGB}, ${a})), ${GRAD}`;
    st.webkitBackgroundClip = st.backgroundClip = "text";
  };

  // ---- the waveform: three 10 ms peaks a bar (30 ms), all drawn dim; white once the playhead passes ----
  const NS = "http://www.w3.org/2000/svg";
  const RATE = PEAKS.rate, peaks = PEAKS.peaks, PER = 3, BAR_W = 3.6, WAVE_H = 150;
  const vmax = Math.max(...peaks);
  const xOf = (tau) => (clamp(tau, 0, DUR) / DUR) * W;      // take time -> x inside the waveform
  const wave = document.createElementNS(NS, "svg");
  wave.setAttribute("width", W); wave.setAttribute("height", WAVE_H);
  wave.id = "s09-wave";
  Object.assign(wave.style, { position: "absolute", left: `${X0}px`, top: "0px", overflow: "visible" });
  stage.appendChild(wave);
  const bars = [];
  for (let j = 0; j * PER < peaks.length; j++) {
    const v = Math.max(...peaks.slice(j * PER, j * PER + PER));
    const full = Math.max(BAR_W, (v / vmax) * WAVE_H);
    const tc = (j * PER + Math.min(PER, peaks.length - j * PER) / 2) / RATE;   // the bar's middle, in take time
    const r = document.createElementNS(NS, "rect");
    Object.entries({ x: (xOf(tc) - BAR_W / 2).toFixed(2), width: BAR_W, rx: BAR_W / 2, fill: C.dim, y: ((WAVE_H - full) / 2).toFixed(2), height: full.toFixed(2) })
      .forEach(([a, b]) => r.setAttribute(a, b));
    wave.appendChild(r);
    bars.push({ r, full, tc, v });
  }
  const PH_OVER = 20;
  const playhead = place(make("div", "", "", stage, { width: "4px", marginLeft: "-2px", borderRadius: "2px", background: C.white }), X0, 0, null, WAVE_H + 2 * PH_OVER);
  playhead.id = "s09-playhead";

  // ---- the caption: one line, white then gray ----
  const sub = place(make("div", "caption", 'A voice, <span class="soft">timed to every word</span>', stage, { width: `${W}px` }), X0, 0);
  sub.id = "s09-caption";
  const CAPTION = "A voice, timed to every word";

  // ---- size and stack, once the fonts are in ----
  await document.fonts.ready;
  // The largest size up to 84 px at which the widest clause fits the 920 px column.
  sentence.style.fontSize = "84px";
  const widest = Math.max(...[...sentence.children].map((l) => l.scrollWidth));
  const SIZE = Math.min(84, Math.floor((84 * (W - 10)) / widest));
  sentence.style.fontSize = `${SIZE}px`;
  const GAP1 = 76, GAP2 = 60;
  const sh = sentence.offsetHeight, subH = sub.offsetHeight;
  const groupH = sh + GAP1 + PH_OVER + WAVE_H + PH_OVER + GAP2 + subH;
  const top = Math.round(675 - groupH / 2);
  const Y = { sentence: top, wave: top + sh + GAP1 + PH_OVER };
  Y.sub = Y.wave + WAVE_H + PH_OVER + GAP2;
  sentence.style.top = `${Y.sentence}px`;
  wave.style.top = `${Y.wave}px`;
  playhead.style.top = `${Y.wave - PH_OVER}px`;
  sub.style.top = `${Y.sub}px`;

  // ---- state at t (pure) ----
  // The gradient hands over to white in 100 ms; it drops to 85% on the frame the next word lights,
  // so only the word being spoken is ever at full strength.
  const FADE = 0.1;
  const wordState = (w, t) => {
    const tau = t - T0;
    const lit = tau >= w.start - EPS;
    const g = !lit ? 0 : tau < w.next - EPS ? 1 : 0.85 * (1 - easeOut(p01(tau, w.next, FADE)));
    return { lit, g };
  };
  const toScreenX = (x, t) => 540 + (x - 540) * scaleAt(t);

  // ---- checks ----
  const css = (c) => { const d = document.createElement("div"); d.style.color = c; return d.style.color; };
  const WHITE = css(C.white), DIM = css(C.dim);
  const look = (s) => {
    const st = s.el.style;
    if (st.color === DIM) return "dim";
    if (st.color === WHITE && st.backgroundImage === "none") return "white";
    if (st.color === "transparent" && st.backgroundImage.startsWith("linear-gradient(100deg")) return "gradient";
    if (st.color === "transparent" && st.backgroundImage.startsWith("linear-gradient(rgba")) return "handover";
    return "?";
  };
  const fill = (b) => css(b.r.getAttribute("fill"));
  check(`${S} composed from the dissolve: all ${words.length} words (dim), the dim waveform, the playhead and the caption on screen at cutIn`, cutIn, () => {
    if (spans.some((s) => look(s) !== "dim")) return "a word is lit before the take";
    if (bars.some((b) => fill(b) !== DIM)) return "a bar is lit before the take";
    // The element's own style: on the dissolve's first frame the root (owned by transitions.js) is still hidden.
    const missing = [sentence, wave, playhead, sub].filter((e) => !(box(e).w > 0 && e.style.visibility !== "hidden" && Number(getComputedStyle(e).opacity) === 1));
    return !missing.length || `missing: ${missing.map((e) => `${e.id} (w ${box(e).w.toFixed(0)}, opacity ${getComputedStyle(e).opacity})`).join(", ")}`;
  });
  check(`${S} the words on screen are voice.json's text, in order; the caption reads “${CAPTION}”, one 64 px line, “timed to every word” in gray`, cutIn, () => {
    const got = spans.map((s) => s.el.textContent).join(" ");
    if (got !== V.text) return `reads “${got}”`;
    if (sub.textContent !== CAPTION) return `caption “${sub.textContent}”`;
    const soft = sub.querySelector(".soft");
    return (getComputedStyle(sub).fontSize === "64px" && sub.offsetHeight < 64 * 1.4 && soft && getComputedStyle(soft).color === css(C.gray)) || "caption is not one 64 px line with a gray second half";
  });
  check(`${S} the sentence is ${SIZE} px (72–84 px: large, but under the product-name sizes) and every clause fits the 920 px column`, cutIn, () =>
    (SIZE >= 72 && SIZE <= 84 && [...sentence.children].every((l) => l.scrollWidth <= W + 0.5)) || `size ${SIZE}, widest ${widest * SIZE / 84}`);
  for (const s of spans) {
    const f = Math.ceil((T0 + s.start) * FPS - EPS);
    check(`${S} “${s.word}” lights at voice.json ${s.start.toFixed(2)} s + bar 20 beat 1 (f${f}), not a frame before`, [(f - 1) / FPS, (f + 1) / FPS], (t) => {
      const before = t < T0 + s.start - EPS;
      if (before) return look(s) === "dim" || `lit at ${t.toFixed(3)}`;
      return look(s) === "gradient" || `not lit at ${t.toFixed(3)} (${look(s)})`;
    });
  }
  check(`${S} the gradient marks the word being spoken, and only that word, through the take`, [T0, tLast + FADE], (t) => {
    const tau = t - T0;
    const cur = words.findIndex((w) => tau >= w.start - EPS && tau < w.next - EPS);
    const full = spans.filter((s) => look(s) === "gradient").map((s) => s.i);
    if (cur < 0) return full.length === 0 || `gradient on ${full} between words`;
    return (full.length === 1 && full[0] === cur) || `gradient on [${full}], speaking ${cur}`;
  });
  check(`${S} every word is white once the take ends (by ${(tLast + FADE).toFixed(2)} s) and holds to the cut`, [tLast + FADE, cutOut - 1 / FPS], () =>
    spans.every((s) => look(s) === "white") || "a word is not white");
  check(`${S} the waveform is peaks.json (${peaks.length} peaks, ${(peaks.length / RATE).toFixed(2)} s = the take), ${bars.length} bars to scale`, cutIn, () => {
    if (Math.abs(peaks.length / RATE - DUR) > 0.011) return `peaks ${peaks.length / RATE} s, take ${DUR} s`;
    const bad = bars.findIndex((b, j) => Math.abs(b.v - Math.max(...peaks.slice(j * PER, j * PER + PER))) > 0 || Math.abs(Number(b.r.getAttribute("height")) - Math.max(BAR_W, (b.v / vmax) * WAVE_H)) > 0.01);
    return bad < 0 || `bar ${bad} off scale`;
  });
  check(`${S} the playhead is at the true time on every frame of the take (±0.5 px)`, [T0, T0 + DUR], (t) => {
    const got = box(playhead).cx, want = toScreenX(X0 + xOf(t - T0), t);
    return Math.abs(got - want) < 0.5 || `x ${got.toFixed(2)}, the take says ${want.toFixed(2)}`;
  });
  check(`${S} the waveform is white behind the playhead and dim ahead of it, all white by the take's end`, [cutIn, cutOut - 1 / FPS], (t) => {
    const tau = t - T0;
    const bad = bars.find((b) => fill(b) !== (tau >= b.tc - EPS ? WHITE : DIM));
    return !bad || `the bar at ${bad.tc.toFixed(2)} s is ${fill(bad)} at ${t.toFixed(3)}`;
  });
  check(`${S} sentence, waveform and caption sit inside the stage and clear of each other through the push`, [inEnd, cutOut - 1 / FPS], () => {
    for (const e of [sentence, wave, playhead, sub]) {
      const b = box(e);
      if (b.x < STAGE.x0 - 0.5 || b.x + b.w > STAGE.x1 + 0.5 || b.y < STAGE.y0 || b.y + b.h > STAGE.y1) return `${e.id} at ${b.x.toFixed(0)},${b.y.toFixed(0)} ${b.w.toFixed(0)}×${b.h.toFixed(0)}`;
    }
    if (overlap(sentence, wave) > 0 || overlap(sentence, playhead) > 0) return "sentence over waveform";
    return (overlap(sub, wave) === 0 && overlap(sub, playhead) === 0) || "caption over waveform";
  });
  check(`${S} the take (${DUR} s from ${T0.toFixed(2)} s) ends before the cut, and the all-white sentence holds ≥ 1.0 s`, cutIn, () =>
    (T0 + DUR < cutOut && cutOut - (tLast + FADE) >= 1.0) || `take ends ${(T0 + DUR).toFixed(2)}, white at ${(tLast + FADE).toFixed(2)}, cut ${cutOut.toFixed(2)}`);
  check(`${S} the push is 1.00 -> 1.04, ease-in-out from cutIn to the cut, and never stops inside the shot`, cutIn, () => {
    const a = scaleAt(cutIn), b = scaleAt(cutOut), mid = scaleAt((cutIn + cutOut) / 2);
    const still = [0.1, 0.5, 0.9].some((f) => { const t = cutIn + f * (cutOut - cutIn); return scaleAt(t + 1 / FPS) - scaleAt(t) <= 0; });
    return (Math.abs(a - 1) < 1e-9 && Math.abs(b - 1.04) < 1e-9 && Math.abs(mid - 1.02) < 1e-9 && !still) || `push ${a} ${mid} ${b}`;
  });

  // ---- seek ----
  return (t) => {
    stage.style.transform = `scale(${scaleAt(t).toFixed(5)})`;
    for (const s of spans) {
      const { lit, g } = wordState(s, t);
      paint(s.el, lit, g);
    }
    const tau = t - T0;
    for (const b of bars) b.r.setAttribute("fill", tau >= b.tc - EPS ? C.white : C.dim);
    playhead.style.transform = `translateX(${xOf(tau).toFixed(3)}px)`;
  };
}
