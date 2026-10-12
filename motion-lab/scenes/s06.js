// s06 Programs, not video. The statement holds mid-stage, then rises. A three-step pipeline then
// builds left to right on its cues: "Code" (`window.seek(t)` types on, 1 frame a letter), "Browser"
// (a real frame of the walkthrough clip), and on "freezes" a strip of 5 real frames, 50 ms apart.
// "Video tool" arrives, and the hero move: on "joins" the 5 frames slide together (spring ζ 0.82)
// into one clip with a play bar, and the video tool plays it. Then three benefits, one row per cue,
// each with a small proof: repeatable (the same frame twice, "="), cheap edits (roughness 0.35 →
// 0.30, and the frame's highlight tightens), self-checking (a magnifier over a frame).

export default async function build(root, k) {
  const { make, place, show, cueIn, spring01, easeOut, easeInOut, p01, swap, style, frames, check, sfx, box, overlap, clamp, lerp, C } = k;
  const { cutIn, cutOut } = k.win;
  const FPS = 60;

  const tCode = cueIn(k.id, "code");
  const tBrowser = cueIn(k.id, "browser");
  const tFreeze = cueIn(k.id, "freezes");
  const tVideo = cueIn(k.id, "video tool");
  const tJoin = cueIn(k.id, "joins");
  const tRep = cueIn(k.id, "every frame");
  const tEdit = cueIn(k.id, "edits");
  const tCheap = cueIn(k.id, "cheap");
  const tCheck = cueIn(k.id, "can check");

  const CLIP = "clips/walkthrough";
  const clipInfo = await (await fetch(`${CLIP}/clip.json`)).json();
  const src = (n) => `${CLIP}/${String(n).padStart(6, "0")}.jpg`;
  const imgs = [];
  const img = (parent, n, css = {}) => {
    const el = make("img", "", "", parent, { position: "absolute", left: "0px", top: "0px", width: "100%", height: "100%", objectFit: "cover", ...css });
    el.src = src(n);
    imgs.push(el);
    return el;
  };

  // ---- the statement (the opening picture) ----
  // It opens mid-stage, then rises out of the pipeline's way (ease-in-out, 0.8 s) just before "Code".
  const HEAD_Y0 = 400, HEAD_Y1 = 26, RISE = 0.8, tRise = tCode - 0.1 - RISE;
  const head = place(make("div", "h1", "", root, { whiteSpace: "nowrap" }), 80, HEAD_Y0);
  head.innerHTML = `Programs, <span style="color:${C.muted}">not video</span>`;

  // ---- the pipeline: three cards, left to right ----
  const pipe = make("div", "", "", root, { position: "absolute", left: "0px", top: "0px", width: "1080px", height: "992px" });
  const COLS = [80, 400, 720], CW = 280, CY = 128, CH = 232;
  const BX = 24, BY = 80, BW = 232, BH = 130.5;          // each card's body, 16:9
  const card = (i, name) => {
    const c = place(make("div", "card", "", pipe), COLS[i], CY, CW, CH);
    make("span", "mono", String(i + 1), c, { position: "absolute", left: "24px", top: "15px", fontSize: "28px", color: C.muted });
    make("span", "", name, c, { position: "absolute", left: "58px", top: "12px", fontSize: "32px", fontWeight: "650", letterSpacing: "-0.01em", whiteSpace: "nowrap" });
    make("div", "", "", c, { position: "absolute", left: "0px", right: "0px", top: "62px", height: "2px", background: C.line });
    return c;
  };
  const body = (c, css = {}) => make("div", "", "", c, { position: "absolute", left: `${BX}px`, top: `${BY}px`, width: `${BW}px`, height: `${BH}px`, borderRadius: "10px", overflow: "hidden", ...css });

  // 1 Code: `window.seek(t)`, every letter laid out in advance and shown 1 frame apart.
  const codeCard = card(0, "Code");
  const codeLine = make("div", "mono", "", codeCard, { position: "absolute", left: `${BX}px`, top: "96px", fontSize: "28px", fontWeight: "520", letterSpacing: "-0.02em", whiteSpace: "pre" });
  const CODE = [["window.", C.muted], ["seek", C.accent], ["(t)", C.ink]];
  const chars = [];
  for (const [text, color] of CODE) for (const ch of text) chars.push(make("span", "", ch, codeLine, { color, visibility: "hidden" }));
  const codeSub = make("div", "", "draws frame t", codeCard, { position: "absolute", left: `${BX}px`, top: "152px", fontSize: "28px", color: C.muted });
  const typedAt = (i) => tCode + 0.3 + i / FPS;

  // 2 Browser: a real frame of the walkthrough clip in the body.
  const browserCard = card(1, "Browser");
  const STRIP = [1, 37, 73, 109, 145];                     // evenly spaced through the 6 s clip
  img(body(browserCard, { background: C.line }), STRIP[2]);

  // 3 Video tool: a dark player with a play mark; after the join it shows the clip.
  const videoCard = card(2, "Video tool");
  const player = body(videoCard, { background: C.ink });
  const playMark = make("div", "", `<svg width="44" height="44" viewBox="0 0 44 44"><path d="M15 10 L34 22 L15 34 Z" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round"/></svg>`, player, { position: "absolute", left: `${BW / 2 - 22}px`, top: `${BH / 2 - 22}px` });
  const playerImg = make("img", "", "", player, { position: "absolute", left: "0px", top: "0px", width: "100%", height: "100%", objectFit: "cover", visibility: "hidden" });
  const clip = frames(playerImg, { dir: CLIP, ...clipInfo });

  const arrows = [0, 1].map((i) => make("div", "", `<svg width="28" height="24" viewBox="0 0 28 24"><path d="M3 12 H24 M17 5 L24 12 L17 19" fill="none" stroke="${C.ink}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`, pipe,
    { position: "absolute", left: `${COLS[i] + CW + 6}px`, top: `${CY + CH / 2 - 12}px` }));

  // ---- the strip: 5 frozen frames, then one clip with a play bar ----
  const FW = 150, FH = 84.375, SY = 412;
  const spreadX = (i) => 80 + i * 192.5;                   // 920 px wide with 42.5 px gaps
  const joinedX = (i) => 165 + i * FW;                     // 750 px, centred, no gaps
  const outline = place(make("div", "", "", pipe, { border: `4px solid ${C.ink}`, borderRadius: "12px" }), joinedX(0) - 6, SY - 6, 5 * FW + 12, FH + 12);
  const stills = STRIP.map((n, i) => {
    const f = place(make("div", "", "", pipe, { overflow: "hidden", background: C.line }), spreadX(i), SY, FW, FH);
    img(f, n);
    f.dataset.track = `s06-still-${i}`;
    return f;
  });
  const STAGGER = 0.05;
  const stillAt = (i) => tFreeze + 0.1 + i * STAGGER;
  const JOIN = { duration: 1.2, damping: 0.82 };
  const join = (t) => spring01(t, tJoin, JOIN);
  // The frame where the join has settled: every still within 0.5 px of its mark from then on.
  let joinSettle = tJoin;
  for (let n = 1; n < 120; n++) if (Math.abs(1 - join(tJoin + n / FPS)) * 85 > 0.5) joinSettle = tJoin + (n + 1) / FPS;
  let touch = tJoin;                                       // the frames first meet (spring crosses 1)
  for (let n = 1; n < 120; n++) if (join(tJoin + n / FPS) >= 1) { touch = tJoin + n / FPS; break; }

  // The play bar: an accent playhead over the clip; the video tool plays in step with it.
  const playhead = make("div", "", "", pipe, { position: "absolute", top: `${SY - 22}px`, width: "4px", height: `${FH + 34}px`, marginLeft: "-2px", background: C.accent, borderRadius: "2px" });
  make("div", "", "", playhead, { position: "absolute", left: "-7px", top: "-8px", width: "18px", height: "18px", borderRadius: "9px", background: C.accent });
  // Once the join has stopped moving (speed under 0.5% of its range, f45 on the speed graph), the
  // playhead appears and the clip plays at 1x; it pauses as the pipeline steps back for the benefits.
  const tStill = tJoin + 0.75, tPlay = tStill + 0.15, tStop = tRep + 0.4;
  const clipT = (t) => clamp(t - tPlay, 0, tStop - tPlay);

  // ---- three benefits, one row each ----
  const ROWS = [552, 684, 816], RH = 120, PX = 360, TW = 168, TH = 94.5;
  const chip = (txt, y) => {
    const c = place(make("div", "chip accent", txt, root, { fontSize: "30px", padding: "10px 22px" }), 80, y + 32);
    return c;
  };
  const thumb = (n, x, y) => {
    const f = place(make("div", "", "", root, { overflow: "hidden", borderRadius: "8px", background: C.line, boxShadow: "0 0 0 2px #d8d6d0, 0 8px 22px rgba(28,28,26,0.12)" }), x, y, TW, TH);
    if (n) img(f, n);
    return f;
  };

  // Repeatable: the same frame rendered twice.
  const repChip = chip("repeatable", ROWS[0]);
  const repA = thumb(109, PX, ROWS[0] + 12);
  const repEq = place(make("div", "mono", "=", root, { fontSize: "52px", fontWeight: "500", width: "72px", textAlign: "center", lineHeight: "1" }), PX + TW, ROWS[0] + 34);
  const repB = thumb(109, PX + TW + 72, ROWS[0] + 12);

  // Cheap edits: one number changes and the frame re-renders; lower roughness, tighter highlight.
  const editChip = chip("cheap edits", ROWS[1]);
  const editFrame = thumb(0, PX, ROWS[1] + 12);
  editFrame.style.background = "#f6f5f2";
  const disc = make("div", "", "", editFrame, { position: "absolute", left: `${TW / 2 - 34}px`, top: `${TH / 2 - 34}px`, width: "68px", height: "68px", borderRadius: "34px",
    background: "#e2ded6", boxShadow: "inset -10px -12px 18px rgba(28,28,26,0.16), 0 10px 14px -8px rgba(28,28,26,0.35)", overflow: "hidden" });
  const glint = make("div", "", "", disc, { position: "absolute", borderRadius: "50%", background: "#ffffff" });
  const editText = place(make("div", "", "", root, { width: "300px" }), PX + TW + 40, ROWS[1] + 8);
  make("div", "", "roughness", editText, { fontSize: "28px", color: C.muted });
  const valBox = make("div", "mono", "", editText, { position: "relative", height: "56px", fontSize: "46px", fontWeight: "560" });
  const valOld = make("span", "", "0.35", valBox, { position: "absolute", left: "0px", top: "0px" });
  const valNew = make("span", "", "0.30", valBox, { position: "absolute", left: "0px", top: "0px", color: C.accent });

  // Self-checking: a magnifier slides over a frame and reads the field the pointer just typed in.
  const checkChip = chip("self-checking", ROWS[2]);
  const checkFrame = thumb(145, PX, ROWS[2] + 12);
  const R = 52, Z = 2.4;
  const lens = make("div", "", "", root, { position: "absolute", width: `${2 * R}px`, height: `${2 * R}px` });
  const lensView = make("div", "", "", lens, { position: "absolute", inset: "0px", borderRadius: "50%", overflow: "hidden", background: C.canvas, boxShadow: "0 10px 26px rgba(28,28,26,0.18)" });
  const lensImg = make("img", "", "", lensView, { position: "absolute", width: `${TW * Z}px`, height: `${TH * Z}px` });
  lensImg.src = src(145);
  imgs.push(lensImg);
  make("div", "", `<svg width="${2 * R + 44}" height="${2 * R + 44}" viewBox="0 0 ${2 * R + 44} ${2 * R + 44}"><circle cx="${R}" cy="${R}" r="${R - 1.25}" fill="none" stroke="${C.ink}" stroke-width="2.5"/><path d="M${R + R * 0.72} ${R + R * 0.72} L${2 * R + 30} ${2 * R + 30}" stroke="${C.ink}" stroke-width="2.5" stroke-linecap="round"/></svg>`, lens, { position: "absolute", left: "0px", top: "0px" });
  lens.dataset.track = "s06-lens";
  // The email field in frame 145 sits at about (85, 28) of the 168 x 94.5 thumbnail.
  const LENS_FROM = [PX + TW + 150, ROWS[2] + 40], LENS_TO = [PX + 85, ROWS[2] + 12 + 28];
  const tLens = tCheck + 0.25;

  await Promise.all(imgs.map((i) => i.decode().catch(() => {})));

  sfx(touch + 1 / FPS, "tap");                             // the frames meet
  sfx(tCheap + 0.14 + 0.04 + 1 / FPS, "toggle");           // 0.30 arrives

  // ---- checks ----
  const inside = (el) => { const b = box(el); return b.x >= 0 && b.x + b.w <= 1080 && b.y >= 128 && b.y + b.h <= 1120; };
  check("s06 the 5 frames freeze 50 ms apart, left to right", [tFreeze, tFreeze + 0.5], (t) => {
    const bad = stills.findIndex((f, i) => (Number(f.style.opacity) > 0) !== (t > stillAt(i)));
    return bad < 0 || `still ${bad} is ${Number(stills[bad].style.opacity) > 0 ? "early" : "late"}`;
  });
  check("s06 the join settles on its marks by f" + Math.round((joinSettle - tJoin) * FPS), [joinSettle, cutOut - 1 / FPS], () => {
    const bad = stills.findIndex((f, i) => Math.abs(box(f).x - joinedX(i)) > 0.5);
    return bad < 0 || `still ${bad} at x ${box(stills[bad]).x.toFixed(2)} (want ${joinedX(bad)})`;
  });
  check("s06 the join is the only move: the stills hold still before it", [stillAt(4) + 0.5, tJoin], () =>
    stills.every((f, i) => Math.abs(box(f).x - spreadX(i)) < 0.01) || "a still moved early");
  check("s06 the playhead marks the clip time shown in the video tool", [tPlay, tStop], (t) => {
    const want = joinedX(0) + (5 * FW * clipT(t)) / (clipInfo.count / clipInfo.fps);
    const x = box(playhead).cx;
    return Math.abs(x - want) < 1 || `playhead ${x.toFixed(1)} want ${want.toFixed(1)}`;
  });
  check("s06 the statement has risen before the code card arrives", tCode, () => Math.abs(box(head).y - 128 - HEAD_Y1) < 0.5 || `head at ${(box(head).y - 128).toFixed(1)}`);
  check("s06 the code line fits its card", tCode + 1, () => {
    const a = box(codeLine), c = box(codeCard);
    return a.x + a.w <= c.x + c.w - 16 || `line ends ${(a.x + a.w).toFixed(1)}, card ${(c.x + c.w).toFixed(1)}`;
  });
  check("s06 the edit lands: 0.30 replaces 0.35", tCheap + 0.6, () =>
    (Number(valNew.style.opacity) > 0.99 && Number(valOld.style.opacity) < 0.01) || "value");
  check("s06 the last benefit holds ≥ 1.83 s before the cut", cutOut - 1 / FPS, () => cutOut - tCheck >= 1.83 || `hold ${(cutOut - tCheck).toFixed(2)} s`);
  check("s06 rows, chips and the pipeline never overlap", [cutIn, cutOut - 1 / FPS], () => {
    const els = [head, codeCard, browserCard, videoCard, outline, repChip, repA, repB, editChip, editFrame, editText, checkChip, checkFrame];
    for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
      const o = overlap(els[i], els[j]);
      if (o > 0) return `${i} x ${j}: ${o | 0} px²`;
    }
    return true;
  });
  check("s06 everything stays inside the stage", [cutIn, cutOut - 1 / FPS], () =>
    [head, outline, ...stills, repB, editText, checkFrame, lens].every(inside) || "outside");

  return (t) => {
    show(head, t, cutIn - 1);
    head.style.top = `${lerp(HEAD_Y0, HEAD_Y1, easeInOut(p01(t, tRise, RISE))).toFixed(2)}px`;

    // The pipeline steps back to 50% when the benefits begin.
    pipe.style.opacity = (1 - 0.5 * easeOut(p01(t, tRep, 0.5))).toFixed(4);
    show(codeCard, t, tCode, Infinity, { dur: 0.5, dy: 18 });
    chars.forEach((s, i) => { s.style.visibility = t >= typedAt(i) ? "visible" : "hidden"; });
    show(codeSub, t, typedAt(chars.length) + 0.1, Infinity, { dur: 0.4, dy: 0 });
    show(arrows[0], t, tBrowser - 0.1, Infinity, { dur: 0.4, dy: 0, dx: -10 });
    show(browserCard, t, tBrowser, Infinity, { dur: 0.5, dy: 18 });
    show(arrows[1], t, tVideo - 0.1, Infinity, { dur: 0.4, dy: 0, dx: -10 });
    show(videoCard, t, tVideo, Infinity, { dur: 0.5, dy: 18 });

    // Freeze: the stills drop in, 50 ms apart. Join: they slide together on one spring.
    const j = join(t);
    stills.forEach((f, i) => {
      show(f, t, stillAt(i), Infinity, { dur: 0.4, dy: -16 });
      f.style.left = `${lerp(spreadX(i), joinedX(i), j).toFixed(2)}px`;
      const r = 8 * (1 - clamp(j));
      f.style.borderRadius = `${r.toFixed(2)}px`;
      // A thin ring keeps each still apart from the canvas (the clip's own background matches it).
      const u = (1 - clamp(j)).toFixed(3);
      f.style.boxShadow = `0 0 0 2px rgba(168,166,160,${u}), 0 8px 22px rgba(28,28,26,${(0.12 * (1 - clamp(j))).toFixed(3)})`;
    });
    show(outline, t, touch, Infinity, { dur: 0.35, dy: 0 });
    show(playhead, t, tStill, Infinity, { dur: 0.3, dy: 0 });
    const ct = clipT(t);
    playhead.style.left = `${(joinedX(0) + (5 * FW * ct) / (clipInfo.count / clipInfo.fps)).toFixed(2)}px`;
    const playing = t >= tPlay;
    playerImg.style.visibility = playing ? "visible" : "hidden";
    playMark.style.visibility = playing ? "hidden" : "visible";

    // Benefits, one row per cue: the chip, then its proof 150 ms later.
    show(repChip, t, tRep, Infinity, { dur: 0.45, dx: -16, dy: 0 });
    show(repA, t, tRep + 0.15, Infinity, { dur: 0.45, dy: 10 });
    show(repEq, t, tRep + 0.25, Infinity, { dur: 0.4, dy: 0 });
    show(repB, t, tRep + 0.31, Infinity, { dur: 0.45, dy: 10 });

    show(editChip, t, tEdit, Infinity, { dur: 0.45, dx: -16, dy: 0 });
    show(editFrame, t, tEdit + 0.15, Infinity, { dur: 0.45, dy: 10 });
    show(editText, t, tEdit + 0.21, Infinity, { dur: 0.45, dy: 10 });
    const sw = swap(t, tCheap);
    style(valOld, sw.out);
    style(valNew, sw.in);
    // The highlight re-renders with the new number: smaller and sharper at roughness 0.30.
    const q = easeOut(p01(t, tCheap + 0.18, 0.25));
    const g = lerp(30, 17, q), gb = lerp(7, 2.2, q);
    Object.assign(glint.style, { left: `${(20 - g / 2).toFixed(2)}px`, top: `${(19 - g / 2).toFixed(2)}px`, width: `${g.toFixed(2)}px`, height: `${g.toFixed(2)}px`, filter: `blur(${gb.toFixed(2)}px)` });

    show(checkChip, t, tCheck, Infinity, { dur: 0.45, dx: -16, dy: 0 });
    show(checkFrame, t, tCheck + 0.15, Infinity, { dur: 0.45, dy: 10 });
    // The lens glides in on an arc (x leads, y follows on a slower spring) and settles on the field.
    const lx = lerp(LENS_FROM[0], LENS_TO[0], spring01(t, tLens, { duration: 0.8, damping: 0.82 }));
    const ly = lerp(LENS_FROM[1], LENS_TO[1], spring01(t, tLens, { duration: 0.95, damping: 0.9 }));
    lens.style.left = `${(lx - R).toFixed(2)}px`;
    lens.style.top = `${(ly - R).toFixed(2)}px`;
    show(lens, t, tLens - 0.05, Infinity, { dur: 0.35, dy: 0 });
    lensImg.style.left = `${(R - (lx - PX) * Z).toFixed(2)}px`;
    lensImg.style.top = `${(R - (ly - ROWS[2] - 12) * Z).toFixed(2)}px`;

    return clip(ct);
  };
}
