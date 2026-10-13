// s09 Voice · black · bars 15–18 (28.63–34.84): a dissolve from s08 brings it in, a cut takes it out.
// George's real take (one-minute's s05 line, 4.88 s) starts at bar 15 beat 1. Its sentence is set in h1
// over four lines, one clause a line. Every word is dim until its real start time in audio/voice.json,
// then white; the word being spoken is in the gradient. Under it the take's real waveform
// (audio/peaks.json, 10 ms peaks) draws on behind a playhead at the true time. Nothing is invented:
// every time and every bar comes from those two files.
// On screen from the dissolve: the label, the whole sentence (dim), the empty track and the playhead.
export default async function build(root, k) {
  const { make, place, barT, drift, check, box, overlap, clamp, easeOut, p01, C, STAGE } = k;
  const S = "s09", FPS = 60, EPS = 1e-6;
  const { cutIn, inEnd, cutOut } = k.win;

  // ---- the sources ----
  const V = window.VOICE;                                   // text, duration, words (relative to the take)
  const PEAKS = await (await fetch("audio/peaks.json")).json();
  const T0 = barT(15, 1);                                   // the take starts here (29.52 s)
  const DUR = V.duration;
  // The last word's handoff is the take's end (voice.json gives "words." an end 0.08 s past the audio).
  const words = V.words.map((w, i) => ({ ...w, i, next: V.words[i + 1]?.start ?? Math.min(w.end, DUR) }));
  const tLast = T0 + words.at(-1).next;                     // the last word turns white at its end

  // ---- layout ----
  const stage = make("div", "", "", root, { position: "absolute", inset: "0px", transformOrigin: "540px 675px" });
  // Drift-safe: 940 px wide about the centre stays inside x 54–1026 at the drift's 1.03.
  const W = 940, X0 = 540 - W / 2;                          // 70..1010
  const label = place(make("div", "label", "Voice · ElevenLabs · Word-timed", stage, { whiteSpace: "nowrap" }), X0, 0);
  label.id = "s09-label";

  // The sentence, one clause a line: "It writes the script, / records the voice, / and times every move / to the words."
  const BREAK_AFTER = new Set(["script,", "voice,", "move"]);
  const sentence = place(make("div", "h1", "", stage, { color: C.dim, width: `${W}px` }), X0, 0);
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
  // look: 0 dim, 1 white; g: how much gradient shows (1 the word being spoken, 0 none).
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

  // The waveform: three 10 ms peaks a bar (30 ms), drawn on as the playhead passes each bar.
  const NS = "http://www.w3.org/2000/svg";
  const RATE = PEAKS.rate, peaks = PEAKS.peaks, PER = 3, BAR_W = 3.6, WAVE_H = 184;
  const vmax = Math.max(...peaks);
  const xOf = (tau) => (clamp(tau, 0, DUR) / DUR) * W;      // take time -> x inside the waveform
  const wave = document.createElementNS(NS, "svg");
  wave.setAttribute("width", W); wave.setAttribute("height", WAVE_H);
  wave.id = "s09-wave";
  Object.assign(wave.style, { position: "absolute", left: `${X0}px`, top: "0px", overflow: "visible" });
  stage.appendChild(wave);
  const track = document.createElementNS(NS, "path");
  track.setAttribute("d", `M0 ${WAVE_H / 2} H${W}`);
  Object.entries({ stroke: C.white, "stroke-opacity": 0.16, "stroke-width": 2 }).forEach(([a, v]) => track.setAttribute(a, v));
  wave.appendChild(track);
  const bars = [];
  for (let j = 0; j * PER < peaks.length; j++) {
    const v = Math.max(...peaks.slice(j * PER, j * PER + PER));
    const full = Math.max(BAR_W, (v / vmax) * WAVE_H);
    const t0 = (j * PER) / RATE;                            // the bar's first 10 ms
    const cx = xOf((j * PER + Math.min(PER, peaks.length - j * PER) / 2) / RATE);
    const r = document.createElementNS(NS, "rect");
    Object.entries({ x: (cx - BAR_W / 2).toFixed(2), width: BAR_W, rx: BAR_W / 2, fill: C.mutedDark, y: WAVE_H / 2, height: 0 }).forEach(([a, b]) => r.setAttribute(a, b));
    wave.appendChild(r);
    bars.push({ r, full, t0, v });
  }
  const GROW = 0.09;                                        // a bar grows to its height in 90 ms
  const PH_OVER = 22;
  const playhead = place(make("div", "", "", stage, { width: "4px", marginLeft: "-2px", borderRadius: "2px", background: C.white }), X0, 0, null, WAVE_H + 2 * PH_OVER);
  playhead.id = "s09-playhead";

  // Stack the three parts in the middle of the stage.
  await document.fonts.ready;
  const GAP1 = 40, GAP2 = 84;
  const lh = label.offsetHeight, sh = sentence.offsetHeight;
  const groupH = lh + GAP1 + sh + GAP2 + WAVE_H;
  const top = Math.round((STAGE.y0 + STAGE.y1) / 2 - groupH / 2);
  const Y = { label: top, sentence: top + lh + GAP1, wave: top + lh + GAP1 + sh + GAP2 };
  label.style.top = `${Y.label}px`;
  sentence.style.top = `${Y.sentence}px`;
  wave.style.top = `${Y.wave}px`;
  playhead.style.top = `${Y.wave - PH_OVER}px`;

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
  const scaleAt = (t) => drift(t, cutIn, cutOut, 0.03);
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
  check(`${S} composed from the dissolve: label, all ${words.length} words (dim), the track and the playhead on screen at cutIn`, cutIn, () => {
    if (spans.some((s) => look(s) !== "dim")) return "a word is lit before the take";
    const vis = [label, sentence, wave, playhead].every((e) => box(e).w > 0 && getComputedStyle(e).visibility !== "hidden");
    return vis || "a part is missing";
  });
  check(`${S} the words on screen are voice.json's text, in order`, cutIn, () => {
    const got = spans.map((s) => s.el.textContent).join(" ");
    return got === V.text || `reads “${got}”`;
  });
  for (const s of spans) {
    const f = Math.ceil((T0 + s.start) * FPS - EPS);
    check(`${S} “${s.word}” lights at voice.json ${s.start.toFixed(2)} s + bar 15 beat 1 (f${f}), not a frame before`, [(f - 1) / FPS, (f + 1) / FPS], (t) => {
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
  check(`${S} every word is white once the take ends (by ${tLast.toFixed(2)} s) and holds to the cut`, [tLast + FADE, cutOut - 1 / FPS], () =>
    spans.every((s) => look(s) === "white") || "a word is not white");
  check(`${S} the waveform is peaks.json (${peaks.length} peaks, ${(peaks.length / RATE).toFixed(2)} s = the take), ${bars.length} bars to scale`, cutIn, () => {
    if (Math.abs(peaks.length / RATE - DUR) > 0.011) return `peaks ${peaks.length / RATE} s, take ${DUR} s`;
    const bad = bars.findIndex((b, j) => Math.abs(b.v - Math.max(...peaks.slice(j * PER, j * PER + PER))) > 0 || Math.abs(b.full - Math.max(BAR_W, (b.v / vmax) * WAVE_H)) > 1e-9);
    return bad < 0 || `bar ${bad} off scale`;
  });
  check(`${S} the playhead is at the true time on every frame of the take (±0.5 px)`, [T0, T0 + DUR], (t) => {
    const got = box(playhead).cx, want = toScreenX(X0 + xOf(t - T0), t);
    return Math.abs(got - want) < 0.5 || `x ${got.toFixed(2)}, the take says ${want.toFixed(2)}`;
  });
  check(`${S} the waveform is drawn only behind the playhead, fully by the take's end`, [cutIn, cutOut - 1 / FPS], (t) => {
    const tau = t - T0;
    for (const b of bars) {
      const h = Number(b.r.getAttribute("height"));
      if (tau < b.t0 - EPS && h > 0) return `a bar at ${b.t0.toFixed(2)} s drawn early`;
      if (tau >= b.t0 + GROW && Math.abs(h - b.full) > 0.01) return `a bar at ${b.t0.toFixed(2)} s not drawn`;
    }
    return true;
  });
  check(`${S} label, sentence and waveform sit inside the stage and clear of each other`, [inEnd, cutOut - 1 / FPS], () => {
    const parts = [label, sentence, wave, playhead];
    for (const e of parts) {
      const b = box(e);
      if (b.x < STAGE.x0 - 0.5 || b.x + b.w > STAGE.x1 + 0.5 || b.y < STAGE.y0 || b.y + b.h > STAGE.y1) return `${e.id} at ${b.x.toFixed(0)},${b.y.toFixed(0)} ${b.w.toFixed(0)}×${b.h.toFixed(0)}`;
    }
    if (overlap(label, sentence) > 0) return "label over sentence";
    if (overlap(sentence, wave) > 0 || overlap(sentence, playhead) > 0) return "sentence over waveform";
    return [...sentence.children].every((l) => l.scrollWidth <= W + 0.5) || "a line is wider than the stage";
  });
  check(`${S} the take (${DUR} s from ${T0.toFixed(2)} s) ends before the cut, and the white sentence holds ≥ 0.3 s`, cutIn, () =>
    (T0 + DUR < cutOut && cutOut - (tLast + FADE) >= 0.3) || `take ends ${(T0 + DUR).toFixed(2)}, white at ${(tLast + FADE).toFixed(2)}, cut ${cutOut.toFixed(2)}`);

  // ---- seek ----
  return (t) => {
    stage.style.transform = `scale(${scaleAt(t).toFixed(5)})`;
    for (const s of spans) {
      const { lit, g } = wordState(s, t);
      paint(s.el, lit, g);
    }
    const tau = t - T0;
    for (const b of bars) {
      const h = b.full * easeOut(p01(tau, b.t0, GROW));
      b.r.setAttribute("height", h.toFixed(2));
      b.r.setAttribute("y", ((WAVE_H - h) / 2).toFixed(2));
    }
    playhead.style.transform = `translateX(${xOf(tau).toFixed(3)}px)`;
  };
}
