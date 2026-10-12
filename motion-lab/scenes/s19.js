// s19 The last mile. Four modules, each on its cue; the one before steps back to 45%.
// 1. At the cut a phone (large, centred) plays the real walkthrough clip with its own captions
//    burned in. On "muted" a muted badge pops; on "silence" a green "works in silence" chip.
// 2. Hero move: on "Mix" the phone travels to its slot (1.2 s ease-in-out, scale 1.55 → 1) and the
//    loudness meter arrives; on "fourteen" its level rises on a spring (ζ 0.82) and settles at −14
//    LUFS under a peak line at −1 dBTP.
// 3. On "each picture" a frame strip; on "one frame" the picture hits at frame F (a cell pops 8% over
//    6 frames, and a real tap sounds at F+1); on "its sound" the waveform peaks at F+1, "1 frame later".
// 4. On "export GIFs" two 1-second loops side by side, each with a clock row (true time) and a GIF
//    row (what a GIF player shows). A GIF stores delays in hundredths of a second, so 24 fps is stored
//    as 4 cs = 40 ms: its GIF row runs 24 × 40 ms = 0.96 s per loop and pulls ahead of the clock by
//    one frame a second (4% fast). 25 fps is exactly 4 cs: its rows never part.

export default async function build(root, k) {
  const { make, place, show, cueIn, spring01, easeOut, easeInOut, p01, frames, rand, check, sfx, box, overlap, C } = k;
  const { cutIn, cutOut } = k.win;
  const FPS = 60;
  const MINUS = "−";

  const tMuted = cueIn(k.id, "muted");
  const onFrame = (t) => Math.ceil(t * FPS - 1e-6) / FPS;        // the first frame at or after t
  const tSilence = onFrame(cueIn(k.id, "silence"));
  const tMix = cueIn(k.id, "Mix");
  const tFourteen = cueIn(k.id, "fourteen");
  const tPicture = cueIn(k.id, "each picture");
  const tHit = Math.round((cueIn(k.id, "one frame") + 0.12) * FPS) / FPS;   // on a frame: the word's start
  const F = Math.round(tHit * FPS);
  const tSound = cueIn(k.id, "its sound");
  const tGif = cueIn(k.id, "export GIFs");
  const tStore = cueIn(k.id, "they can store");
  const tFour = cueIn(k.id, "four percent");
  const tFast = onFrame(tFour + 0.2);                           // the "4% fast" note pins

  const MOVE = 1.2;                              // the phone's travel, ease-in-out (a layout change: 0.9–1.5 s)
  const tMeter = tMix + 0.75 * MOVE;            // the meter enters once the shrinking phone has cleared its slot
  const tLevel = Math.max(tFourteen, tMeter + 0.5);
  const LEVEL = { duration: 1.0, damping: 0.82 };
  const tLoops = tGif + 0.6;                     // both GIF loops start once their card is in
  const DIM = 0.45;
  const dimAt = (t, t0) => 1 - (1 - DIM) * easeOut(p01(t, t0 + 0.15, 0.4));

  // ================= 1. the phone =================
  const GX = 60, GY = 24, GW = 600, PH = 300;
  const group = place(make("div", "", "", root, { transformOrigin: "50% 50%" }), GX, GY, GW, PH + 62);
  group.dataset.track = "s19-phone";
  const phone = place(make("div", "", "", group, { background: C.ink, borderRadius: "56px", boxShadow: "0 18px 50px rgba(28,28,26,0.18)" }), 0, 0, GW, PH);
  const screen = place(make("div", "", "", phone, { background: "#000", borderRadius: "44px", overflow: "hidden" }), 14, 14, GW - 28, PH - 28);
  const VW = 484, VH = 272;
  const video = place(make("div", "", "", screen, { overflow: "hidden", background: "#ecebe7" }), (GW - 28 - VW) / 2, 0, VW, VH);
  const vImg = make("img", "", "", video, { position: "absolute", left: "0px", top: "0px", width: `${VW}px`, height: `${VH}px` });
  const wInfo = await (await fetch("clips/walkthrough/clip.json")).json();
  const walk = frames(vImg, { dir: "clips/walkthrough", ...wInfo });
  const clipT = (t) => Math.max(0, t - cutIn);
  // The walkthrough's own captions (its .srt), at the clip's offset: the clip starts 17.5 s in.
  const CAPS = [[0, 1.83, "Next, click Invite."], [1.86, 4.27, "Type your teammate’s email address."], [5.14, 99, "Now choose a role."]];
  const capWrap = make("div", "", "", video, { position: "absolute", left: "0px", right: "0px", bottom: "14px", display: "flex", justifyContent: "center" });
  const capLine = make("div", "", "", capWrap, {
    maxWidth: "440px", textAlign: "center", padding: "5px 16px 7px", borderRadius: "14px",
    background: "rgba(28,28,26,0.86)", color: "#ffffff", fontSize: "28px", fontWeight: "600", lineHeight: "1.2", textWrap: "balance",
  });
  // Muted badge: a speaker with a slash, 2.5 px strokes.
  const badge = place(make("div", "", "", video, { borderRadius: "28px", background: "rgba(28,28,26,0.78)", display: "flex", alignItems: "center", justifyContent: "center" }), VW - 68, 12, 56, 56);
  badge.innerHTML = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M5 12.5 H10 L16 7 V25 L10 19.5 H5 Z"/><path d="M21 12 L28 20 M28 12 L21 20"/></svg>`;
  const silent = place(make("div", "chip green", `<svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 13.5 L11 18.5 L20 8.5"/></svg><span>works in silence</span>`, group, { fontSize: "28px" }), 0, PH + 14);

  // ================= 2. the loudness meter =================
  const meter = place(make("div", "card", "", root), 690, 24, 330, 362);
  place(make("div", "", "loudness", meter, { fontSize: "28px", color: C.muted, fontWeight: "560" }), 28, 20);
  const BAR_Y = 72, BAR_H = 260, PXDB = BAR_H / 30;      // 0 at the top, −30 at the bottom
  const yOf = (db) => BAR_Y - db * PXDB;
  place(make("div", "", "", meter, { background: "#f1f0ec", borderRadius: "22px", border: `2px solid ${C.line}` }), 28, BAR_Y, 44, BAR_H);
  const fill = place(make("div", "", "", meter, { background: C.accent, borderRadius: "0 0 20px 20px" }), 30, BAR_Y + BAR_H - 2, 40, 0);
  fill.dataset.track = "s19-level";
  place(make("div", "", "", meter, { background: C.ink, borderRadius: "2px" }), 20, yOf(-1) - 1.5, 64, 3);
  const peak = place(make("div", "mono", `peak ${MINUS}1 dBTP`, meter, { fontSize: "28px", fontWeight: "560", whiteSpace: "nowrap" }), 98, yOf(-1) - 20);
  const read = place(make("div", "mono", `${MINUS}14`, meter, { fontSize: "64px", fontWeight: "620", letterSpacing: "-0.02em", lineHeight: "1" }), 98, yOf(-14) - 36);
  const unit = place(make("div", "", "LUFS", meter, { fontSize: "30px", fontWeight: "600", color: C.muted }), 102, yOf(-14) + 34);
  const levelAt = (t) => -30 + 16 * spring01(t, tLevel, LEVEL);

  // ================= 3. picture and sound, one frame apart =================
  const strip = place(make("div", "card", "", root), 60, 404, 960, 220);
  place(make("div", "", "picture", strip, { fontSize: "30px", fontWeight: "560" }), 32, 64);
  const soundLabel = place(make("div", "", "sound", strip, { fontSize: "30px", fontWeight: "560" }), 32, 122);
  const CX0 = 200, CWID = 112, CSTEP = 122;
  const cellX = (i) => CX0 + i * CSTEP, cellC = (i) => cellX(i) + CWID / 2;
  const nums = [], cells = [];
  for (let i = 0; i < 6; i++) {
    nums.push(place(make("div", "mono", String(F - 2 + i), strip, { fontSize: "28px", width: `${CWID}px`, textAlign: "center", color: C.muted }), cellX(i), 14));
    cells.push(place(make("div", "", "", strip, { background: "#f1f0ec", border: `2px solid ${C.line}`, borderRadius: "10px" }), cellX(i), 60, CWID, 48));
  }
  cells[2].dataset.track = "s19-hit";
  // The waveform: a quiet floor, then a transient that peaks at the centre of cell F+1.
  const SVGNS = "http://www.w3.org/2000/svg";
  const wave = document.createElementNS(SVGNS, "svg");
  wave.setAttribute("width", "732"); wave.setAttribute("height", "56");
  Object.assign(wave.style, { position: "absolute", left: `${CX0}px`, top: "114px", overflow: "visible" });
  strip.appendChild(wave);
  const r = rand("s19-wave");
  const peakX = cellC(3) - CX0;
  let d = "";
  for (let x = 0; x <= 732; x += 3) {
    const u = x - peakX;
    let y = 28 + (r() - 0.5) * 3;                                            // the bed: under ±1.5 px
    if (u >= -6 && u < 0) y = 28 - 24 * ((u + 6) / 6);                        // attack in 6 px
    else if (u >= 0) y = 28 - 24 * Math.exp(-u / 26) * Math.cos(u / 6.5);    // decay
    d += `${x ? "L" : "M"}${x} ${y.toFixed(2)}`;
  }
  const wpath = document.createElementNS(SVGNS, "path");
  Object.entries({ d, fill: "none", stroke: C.ink, "stroke-width": 2.5, "stroke-linejoin": "round", "stroke-linecap": "round" }).forEach(([a, v]) => wpath.setAttribute(a, v));
  wave.appendChild(wpath);
  const peakDot = document.createElementNS(SVGNS, "circle");
  Object.entries({ cx: peakX, cy: 4, r: 7, fill: C.accent }).forEach(([a, v]) => peakDot.setAttribute(a, v));
  wave.appendChild(peakDot);
  const bracket = document.createElementNS(SVGNS, "svg");
  bracket.setAttribute("width", "960"); bracket.setAttribute("height", "40");
  Object.assign(bracket.style, { position: "absolute", left: "0px", top: "170px", overflow: "visible" });
  bracket.innerHTML = `<path d="M${cellC(2)} 6 V18 H${cellC(3)} V6" fill="none" stroke="${C.accent}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  strip.appendChild(bracket);
  const later = place(make("div", "", "1 frame later", strip, { fontSize: "28px", fontWeight: "600", color: C.accent }), cellC(3) + 24, 170);

  // ================= 4. GIF: two 1-second loops =================
  const gif = place(make("div", "card", "", root), 60, 644, 960, 316);
  place(make("div", "", "A GIF stores each frame’s delay in hundredths of a second", gif, { fontSize: "28px", color: C.muted, fontWeight: "500" }), 32, 22);
  place(make("div", "", "", gif, { background: C.line }), 479, 74, 2, 224);
  const TRACK_W = 330;
  const half = (i, fps) => {
    const ox = i * 480, N = fps;                // a 1-second loop has fps frames
    const title = place(make("div", "mono", `${fps} fps → 4 cs`, gif, { fontSize: "32px", fontWeight: "600" }), ox + 32, 70);
    const row = (label, y) => {
      place(make("div", "", label, gif, { fontSize: "28px", color: C.muted, fontWeight: "560" }), ox + 32, y);
      const track = place(make("div", "", "", gif, { background: "#f1f0ec", borderRadius: "8px", overflow: "hidden" }), ox + 120, y + 2, TRACK_W, 34);
      for (let c = 1; c < N; c++) place(make("div", "", "", track, { background: C.line }), (TRACK_W * c) / N - 0.75, 0, 1.5, 34);
      const head = place(make("div", "", "", track, { borderRadius: "4px" }), 0, 0, TRACK_W / N, 34);
      return { track, head };
    };
    const clock = row("clock", 124), shown = row("GIF", 168);
    clock.head.style.background = C.faint;
    const math = place(make("div", "mono", `${fps} × 40 ms = ${(fps * 0.04).toFixed(2)} s`, gif, { fontSize: "28px", fontWeight: "560" }), ox + 32, 218);
    return { N, fps, title, clock, shown, math };
  };
  const L24 = half(0, 24), L25 = half(1, 25);
  L24.shown.head.dataset.track = "s19-gif24";
  const fast = place(make("div", "chip red", "4% fast", gif, { fontSize: "28px" }), 32, 260);
  const exact = place(make("div", "chip green", "exact", gif, { fontSize: "28px" }), 512, 260);
  // True time T since the loops started. The clock row shows the frame due now, ⌊T × fps⌋; the GIF
  // row shows the frame a GIF player shows when every delay is 4 cs, ⌊T / 0.04⌋. Both wrap at N.
  const EPS = 1e-9;
  const due = (T, fps) => Math.floor(T * fps + EPS);
  const gifFrame = (T) => Math.floor(T / 0.04 + EPS);
  const loopT = (t) => Math.max(0, t - tLoops);

  sfx(tSilence + 2 / FPS, "success");          // show() starts at 0: first visible frame +1, its sound +2
  sfx(tHit + 1 / FPS, "tap");                  // the picture hits at F, its sound at F+1: the strip's own claim
  sfx(tFast + 2 / FPS, "pop");                 // show() starts at 0: first visible frame +1, its sound +2

  await document.fonts.ready;

  // ---- checks ----
  const phoneAt = (t) => easeInOut(p01(t, tMix, MOVE));
  let levelSettle = 0;
  for (let f = 0; f < 240; f++) if (Math.abs(16 * (1 - spring01(f / FPS, 0, LEVEL))) > 0.05) levelSettle = f + 1;
  const tLevelSettled = tLevel + levelSettle / FPS;
  check("s19 cut is a finished picture: the phone with a decoded clip frame and its caption", cutIn, () =>
    (vImg.complete && vImg.naturalWidth > 0 && capLine.textContent.length > 0 && Number(group.style.opacity) > 0.99) || "missing");
  check("s19 phone on its slot by the end of its move and held", [tMix + MOVE, cutOut - 1 / FPS], () => {
    const b = box(phone);
    return (Math.abs(b.x - GX) < 0.5 && Math.abs(b.y - 128 - GY) < 0.5 && Math.abs(b.w - GW) < 0.5) || `phone at ${b.x.toFixed(1)},${(b.y - 128).toFixed(1)} w ${b.w.toFixed(1)}`;
  });
  check(`s19 level settled at −14 LUFS (±0.05 dB) by f${Math.round(tLevelSettled * FPS)} and held`, [tLevelSettled, cutOut - 1 / FPS], () => {
    const L = levelAt(tLevelSettled), h = Number.parseFloat(fill.style.height);
    return (Math.abs(L + 14) < 0.05 && Math.abs(h - 16 * PXDB) < 0.5 && read.textContent === `${MINUS}14`) || `level ${L.toFixed(3)} fill ${h}`;
  });
  check(`s19 the picture hits on f${F}, not before`, [tHit - 1 / FPS, tHit], (t) => {
    const lit = cells[2].style.background === "rgb(47, 85, 224)" || cells[2].style.background === C.accent;
    return Math.round(t * FPS) >= F ? (lit || "not lit on F") : (!lit || "lit before F");
  });
  check(`s19 its sound is declared one frame later (f${F + 1})`, cutIn, () =>
    window.SFX.some((s) => s.kind === "tap" && Math.abs(s.t * FPS - (F + 1)) < 1e-6) || "no tap at F+1");
  check("s19 GIF rows show ⌊T/0.04⌋, clock rows ⌊T·fps⌋; 24 fps pulls ahead, 25 fps stays exact", [tLoops, cutOut - 1 / FPS], (t) => {
    const T = loopT(t);
    for (const L of [L24, L25]) {
      const want = [due(T, L.fps) % L.N, gifFrame(T) % L.N];
      const got = [Number(L.clock.head.dataset.idx), Number(L.shown.head.dataset.idx)];
      if (got[0] !== want[0] || got[1] !== want[1]) return `${L.fps} fps: clock ${got[0]}/${want[0]} gif ${got[1]}/${want[1]}`;
    }
    if (due(T, 25) !== gifFrame(T)) return "25 fps drifted";
    return true;
  });
  check("s19 24 fps GIF is ahead by ⌊T⌋ ± 1 frames (4% fast), at least 4 frames by the cut", cutOut - 1 / FPS, () => {
    const T = loopT(cutOut - 1 / FPS), ahead = gifFrame(T) - due(T, 24);
    return (Math.abs(ahead - T) <= 1 && ahead >= 4) || `ahead ${ahead} after ${T.toFixed(2)} s`;
  });
  check("s19 modules never overlap, during the phone's move or after", [tMix, cutOut - 1 / FPS], () => {
    const els = [group, meter, strip, gif];
    for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) if (overlap(els[i], els[j]) > 0) return `${i} x ${j}`;
    return true;
  });
  check("s19 everything stays inside the stage", [cutIn, cutOut - 1 / FPS], () =>
    [phone, silent, meter, strip, gif].every((el) => {
      if (getComputedStyle(el).visibility === "hidden") return true;
      const b = box(el); return b.x >= 0 && b.x + b.w <= 1080 && b.y >= 128 && b.y + b.h <= 1120;
    }) || "outside");

  return (t) => {
    // 1. The phone: large and centred until "Mix", then it travels to its slot.
    const m = phoneAt(t);
    const S = 1.55, dx = 540 - (GX + GW / 2), dy = 470 - (GY + (PH + 62) / 2);
    group.style.transform = `translate(${(dx * (1 - m)).toFixed(2)}px, ${(dy * (1 - m)).toFixed(2)}px) scale(${(S + (1 - S) * m).toFixed(4)})`;
    group.style.opacity = dimAt(t, tMeter).toFixed(4);
    const c = clipT(t);
    const cap = CAPS.find(([a, b]) => c >= a && c < b);
    capLine.textContent = cap ? cap[2] : "";
    capLine.style.visibility = cap ? "visible" : "hidden";
    const bs = spring01(t, tMuted, { duration: 0.45, damping: 0.82 });
    badge.style.transform = `scale(${(0.6 + 0.4 * bs).toFixed(4)})`;
    badge.style.opacity = easeOut(p01(t, tMuted, 0.2)).toFixed(4);
    show(silent, t, tSilence, Infinity, { dur: 0.45, dy: 10 });

    // 2. The meter: enters, then its level rises and settles at −14 LUFS.
    show(meter, t, tMeter, Infinity, { dur: 0.5, dy: 16 });
    meter.style.opacity = (Number(meter.style.opacity) * dimAt(t, tPicture)).toFixed(4);
    const L = levelAt(t);
    const h = (30 + L) * PXDB;
    fill.style.height = `${h.toFixed(2)}px`;
    fill.style.top = `${(BAR_Y + BAR_H - h).toFixed(2)}px`;
    fill.style.borderRadius = h > BAR_H - 22 ? "20px" : "0 0 20px 20px";
    const on = t >= tLevel;
    read.textContent = on ? `${MINUS}${Math.abs(Math.round(L))}` : `${MINUS}30`;
    read.style.opacity = easeOut(p01(t, tLevel, 0.3)).toFixed(4);
    unit.style.opacity = read.style.opacity;

    // 3. Picture and sound.
    show(strip, t, tPicture, Infinity, { dur: 0.5, dy: 16 });
    strip.style.opacity = (Number(strip.style.opacity) * dimAt(t, tGif)).toFixed(4);
    const hit = t >= tHit;
    const pop = hit ? 1 + 0.08 * Math.sin(Math.PI * Math.min(1, (t - tHit) * FPS / 6)) : 1;   // +8% over 6 frames
    cells[2].style.background = hit ? C.accent : "#f1f0ec";
    cells[2].style.borderColor = hit ? C.accent : C.line;
    cells[2].style.transform = `scale(${pop.toFixed(4)})`;
    nums[2].style.color = hit ? C.accent : C.muted;
    const wd = easeOut(p01(t, tSound, 0.5));
    const len = 760;
    wpath.style.strokeDasharray = `${len} ${len}`;
    wpath.style.strokeDashoffset = (len * (1 - wd)).toFixed(2);
    wave.style.visibility = t >= tSound ? "visible" : "hidden";
    peakDot.setAttribute("r", (7 * spring01(t, tSound + 0.32, { duration: 0.35, damping: 0.82 })).toFixed(3));
    nums[3].style.color = t >= tSound + 0.32 ? C.accent : C.muted;
    show(bracket, t, tSound + 0.5, Infinity, { dur: 0.4, dy: 0 });
    show(later, t, tSound + 0.6, Infinity, { dur: 0.45, dx: -12, dy: 0 });

    // 4. The GIF loops.
    show(gif, t, tGif, Infinity, { dur: 0.5, dy: 16 });
    const T = loopT(t);
    for (const Lp of [L24, L25]) {
      const ci = due(T, Lp.fps) % Lp.N, gi = gifFrame(T) % Lp.N;
      Lp.clock.head.style.left = `${((TRACK_W * ci) / Lp.N).toFixed(2)}px`;
      Lp.shown.head.style.left = `${((TRACK_W * gi) / Lp.N).toFixed(2)}px`;
      Lp.clock.head.dataset.idx = ci;
      Lp.shown.head.dataset.idx = gi;
    }
    const red = t >= tFour, green = t >= tStore;
    L24.shown.head.style.background = red ? C.red : C.ink;
    L24.title.style.color = red ? C.red : C.ink;
    L25.shown.head.style.background = green ? C.green : C.ink;
    L25.title.style.color = green ? C.green : C.ink;
    show(exact, t, tStore, Infinity, { dur: 0.45, dx: -12, dy: 0 });
    show(fast, t, tFast, Infinity, { dur: 0.45, dx: -12, dy: 0 });

    return walk(clipT(t));
  };
}
