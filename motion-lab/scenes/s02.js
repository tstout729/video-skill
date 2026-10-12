// s02 The one-prompt myth. A post card reading "one prompt ✨" (the only emoji in the video, and it
// is the joke) with a view count that counts up. On "weren't" a red strike draws across "one prompt".
// On "One music video" a time axis arrives and the card steps back; on "five-minute brief" and
// "twelve hours" two bars grow to scale on that axis (5 min is 6 px of 900). Hero move: on "the
// middle" the space between the bars opens (spring ζ 0.82) and three frame notes pin into it, one per
// cue, the last "f318 · peak lands 2 frames late".

export default function build(root, k) {
  const { make, place, show, cueIn, countTo, note, spring01, easeOut, easeInOut, p01, check, sfx, box, overlap, C } = k;
  const { cutIn, cutOut } = k.win;
  const FPS = 60;

  const tStrike = cueIn(k.id, "weren't");
  const tAxis = cueIn(k.id, "one music video");
  const tBrief = cueIn(k.id, "five-minute brief");
  const tWork = cueIn(k.id, "twelve hours");
  const tOpen = cueIn(k.id, "the middle");
  const tNotes = [cueIn(k.id, "notes"), cueIn(k.id, "fixes"), cueIn(k.id, "this peak")];

  // ---- the post card (on screen from the cut) ----
  // The card opens near the middle of the stage (it is the hero), then rises to make room for the
  // timeline on "One music video" (ease-in-out, 0.8 s) while it steps back to 50%.
  const POST_Y0 = 300, POST_Y1 = 40, RISE = 0.8;
  const post = place(make("div", "card", "", root), 80, POST_Y0, 920, 296);
  make("div", "", "", post, { position: "absolute", left: "40px", top: "36px", width: "64px", height: "64px", borderRadius: "32px", background: C.line });
  make("div", "", "", post, { position: "absolute", left: "124px", top: "44px", width: "210px", height: "20px", borderRadius: "10px", background: C.line });
  make("div", "", "", post, { position: "absolute", left: "124px", top: "76px", width: "132px", height: "16px", borderRadius: "8px", background: "#e6e4df" });
  const text = make("div", "h1", "", post, { position: "absolute", left: "40px", top: "128px", whiteSpace: "nowrap" });
  const struck = make("span", "", "one prompt", text, { position: "relative", display: "inline-block" });
  make("span", "", "&nbsp;✨", text);
  const strike = make("div", "", "", struck, {
    position: "absolute", left: "-8px", right: "-8px", top: "52%", height: "7px", marginTop: "-3px",
    borderRadius: "4px", background: C.red, transformOrigin: "left center", transform: "scaleX(0)",
  });
  const views = make("div", "", "", post, { position: "absolute", left: "40px", top: "226px", display: "flex", alignItems: "center", gap: "14px" });
  views.innerHTML = `<svg width="26" height="28" viewBox="0 0 26 28"><path d="M5 3.5 L22 14 L5 24.5 Z" fill="none" stroke="${C.ink}" stroke-width="2.5" stroke-linejoin="round"/></svg>`;
  const count = make("span", "mono", "1,204,118", views, { fontSize: "32px", fontWeight: "600" });
  make("span", "", "views", views, { fontSize: "32px", color: C.muted });
  // The clip itself: a dark frame with a play mark, on the card's right.
  const clip = make("div", "", "", post, { position: "absolute", left: "640px", top: "40px", width: "240px", height: "216px", borderRadius: "18px", background: C.ink, display: "flex", alignItems: "center", justifyContent: "center" });
  clip.innerHTML = `<svg width="64" height="64" viewBox="0 0 64 64"><path d="M22 16 L48 32 L22 48 Z" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round"/></svg>`;
  const fmt = (v) => Math.round(v).toLocaleString("en-US");

  // ---- the time axis: 12 h is 900 px, so 5 min is 6.25 px ----
  const X0 = 80, SPAN = 900, H12 = 12 * 60, AXIS_LAG = 0.55;  // the axis follows the rising card
  const xOf = (min) => (SPAN * min) / H12;
  const axisWrap = make("div", "", "", root, { position: "absolute", left: "0px", top: "0px", width: "1080px", height: "992px" });
  const header = place(make("div", "body", "One music video", axisWrap, { fontWeight: "620" }), X0, 404);
  const axis = place(make("div", "", "", axisWrap, { height: "2px", background: C.faint }), X0, 464, SPAN, 2);
  for (let h = 0; h <= 12; h++) {
    place(make("div", "", "", axisWrap, { background: C.faint }), X0 + xOf(h * 60) - 1, h % 6 ? 458 : 452, 2, h % 6 ? 6 : 12);
  }
  // Tick labels in Geist (tabular figures): "6 h" centred on its tick, "12 h" ending on the axis.
  const tick6 = place(make("div", "", "6 h", axisWrap, { fontSize: "28px", color: C.muted, width: "120px", marginLeft: "-60px", textAlign: "center" }), X0 + xOf(360), 410);
  const tick12 = place(make("div", "", "12 h", axisWrap, { fontSize: "28px", color: C.muted, width: "120px", marginLeft: "-120px", textAlign: "right" }), X0 + xOf(720), 410);

  // Row 1: the brief, a 5-minute sliver.
  const ROW_H = 52, ROW1 = 492, ROW2 = 564, OPEN = 262;
  const sliver = place(make("div", "", "", root, { background: C.accent, borderRadius: "2px", transformOrigin: "left center" }), X0, ROW1, xOf(5), ROW_H);
  const briefLabel = place(make("div", "body", "5-minute brief", root, { fontWeight: "600" }), X0 + 26, ROW1 + 4);
  // Row 2: twelve hours of work. It lives in a group so the opening moves bar and label together.
  const row2 = make("div", "", "", root, { position: "absolute", left: "0px", top: `${ROW2}px`, width: "1080px", height: `${ROW_H}px` });
  row2.dataset.track = "s02-row2";
  const bar = place(make("div", "", "", row2, { background: C.ink, borderRadius: "10px", transformOrigin: "left center" }), X0, 0, xOf(H12), ROW_H);
  const workLabel = place(make("div", "body", "12 hours of work", row2, { color: "#ffffff", fontWeight: "600" }), X0 + 24, 4);

  // The middle: a dashed rule down the left edge, and three frame notes.
  const rule = place(make("div", "", "", root, { borderLeft: `2.5px dashed ${C.faint}` }), X0 + 2, ROW1 + ROW_H + 8, 0, 0);
  const NOTES = [[96, "glint washes out a letter"], [212, "drops fly out of frame"], [318, "peak lands 2 frames late"]];
  const chips = NOTES.map(([f, msg], i) => {
    const c = note(root, f, msg, "red");
    Object.assign(c.style, { position: "absolute", fontSize: "30px" });
    return place(c, X0 + 40, ROW1 + ROW_H + 34 + i * 78);
  });

  sfx(tStrike + 0.3 + 1 / FPS, "tap");      // the strike reaches the end of "one prompt"
  sfx(tNotes[2] + 0.12 + 1 / FPS, "pop");   // the last note pins

  // ---- checks ----
  const row2Y = (t) => ROW2 + OPEN * spring01(t, tOpen, { duration: 1.2, damping: 0.82 });
  check("s02 bars are to scale: 5 min / 12 h", tWork + 1.2, () => {
    const r = box(sliver).w / box(bar).w, want = 5 / 720;
    return Math.abs(r - want) < 0.0005 || `ratio ${r.toFixed(5)} (want ${want.toFixed(5)})`;
  });
  check("s02 strike covers all of “one prompt”", tStrike + 0.6, () => {
    const s = box(strike), w = box(struck);
    return (s.x <= w.x && s.x + s.w >= w.x + w.w) || `strike ${s.x.toFixed(0)}–${(s.x + s.w).toFixed(0)} word ${w.x.toFixed(0)}–${(w.x + w.w).toFixed(0)}`;
  });
  check("s02 the middle opens and settles by +1.6 s", tOpen + 1.6, () => {
    const y = box(row2).y - 128;
    return Math.abs(y - (ROW2 + OPEN)) < 1 || `row 2 at ${y.toFixed(1)}`;
  });
  check("s02 notes clear each other and both bars", [tNotes[0], cutOut - 1 / FPS], () => {
    const els = [...chips, sliver, briefLabel, bar];
    for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
      const o = overlap(els[i], els[j]);
      if (o > 0) return `${i} x ${j}: ${o | 0} px²`;
    }
    return true;
  });
  check("s02 the rising card never touches the timeline", [tAxis, tAxis + 1.2], () => {
    const o = overlap(post, header) + overlap(post, axis);
    return o === 0 || `overlap ${o | 0} px²`;
  });
  check("s02 everything stays inside the stage", [cutIn, cutOut - 1 / FPS], () =>
    [post, ...chips, row2, header].every((el) => { const b = box(el); return b.y >= 128 && b.y + b.h <= 1120 && b.x >= 0 && b.x + b.w <= 1080; }) || "outside");

  return (t) => {
    // Post card: on screen from the cut; the views count up, then the strike draws on "weren't".
    countTo(count, t, cutIn + 0.2, tStrike - 0.3, 1204118, 2861540, fmt);
    strike.style.transform = `scaleX(${easeOut(p01(t, tStrike, 0.45)).toFixed(4)})`;
    const rise = easeInOut(p01(t, tAxis, RISE));
    post.style.top = `${(POST_Y0 + (POST_Y1 - POST_Y0) * rise).toFixed(2)}px`;
    post.style.opacity = (1 - 0.5 * rise).toFixed(4);   // steps back for the timeline

    // Axis, then the two bars, each on its cue.
    const tA = tAxis + AXIS_LAG;
    show(header, t, tA, Infinity, { dur: 0.5, dy: 12 });
    show(axis, t, tA + 0.06, Infinity, { dur: 0.5, dy: 0 });
    for (const el of axisWrap.children) if (el !== header && el !== axis) show(el, t, tA + 0.1, Infinity, { dur: 0.5, dy: 0 });
    show(sliver, t, tBrief, Infinity, { dur: 0.4, dy: 0 });
    show(briefLabel, t, tBrief + 0.06, Infinity, { dur: 0.5, dx: -16, dy: 0 });
    const grow = easeOut(p01(t, tWork, 1.0));
    bar.style.transform = `scaleX(${grow.toFixed(4)})`;
    bar.style.visibility = grow > 0 ? "visible" : "hidden";
    show(workLabel, t, tWork + 0.55, Infinity, { dur: 0.5, dx: -16, dy: 0 });

    // The middle opens: row 2 drops on a spring, the dashed rule follows it, the notes pin in.
    const y2 = row2Y(t);
    row2.style.top = `${y2.toFixed(2)}px`;
    const ruleH = y2 - (ROW1 + ROW_H + 8) - 8;
    rule.style.height = `${Math.max(0, ruleH).toFixed(2)}px`;
    rule.style.visibility = t > tOpen && ruleH > 2 ? "visible" : "hidden";
    chips.forEach((c, i) => show(c, t, tNotes[i], Infinity, { dur: 0.45, dx: -20, dy: 0 }));
  };
}
