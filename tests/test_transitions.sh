#!/usr/bin/env bash
# Transitions, the film finish and the cut check (runtime/transitions.js, review.mjs cuts, mux.py --lut).
#   bash tests/test_transitions.sh
# Needs the browser (setup.sh), ffmpeg with lut3d, and uv.
set -euo pipefail
repo="$(cd "$(dirname "$0")/.." && pwd)"
skill="$repo/skills/video"
work="$(mktemp -d)"; trap 'rm -rf "$work"' EXIT
render() { node "$skill/scripts/render.mjs" "$@" >/dev/null; }
fail() { echo "FAIL: $*"; exit 1; }
# Mean of one channel (0-255) of a still: ffmpeg scales it to one pixel.
mean() { ffmpeg -v error -i "$1" -vf "scale=1:1:flags=area,format=rgb24" -frames:v 1 -f rawvideo - | od -An -tu1 | awk -v c="$2" '{print $(c+1)}'; }

# 1. Every look is a pure function of t: the example's mid-transition frames match whichever order
#    they are rendered in. Chromium's tile raster differs by a few levels between orders even on the
#    other examples, so a frame fails only if a pixel moves by more than 24 levels or more than
#    0.05% of pixels move by more than 2. A state bug moves thousands of pixels by a hundred or more.
times=5.4,8.7,12.0,15.2,18.5,21.85,25.0,25.3,25.6
reverse=$(echo "$times" | awk -F, '{ for (i = NF; i > 0; i--) printf "%s%s", $i, (i > 1 ? "," : "") }')
(cd "$skill/examples/transitions" && render index.html --stills "$work/fwd" --at "$times" && render index.html --stills "$work/rev" --at "$reverse")
uv run -q --with numpy python3 - "$work/fwd" "$work/rev" <<'PY' || fail "a frame depends on the order frames are rendered in"
import pathlib, subprocess, sys
import numpy as np
def load(p):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).astype(int)
bad = 0
for a in sorted(pathlib.Path(sys.argv[1]).glob("*.jpg")):
    d = np.abs(load(a) - load(pathlib.Path(sys.argv[2]) / a.name)).reshape(-1, 3).max(axis=1)
    share = (d > 2).mean()
    if d.max() > 24 or share > 0.0005:
        print(f"  {a.name}: max {d.max()} levels, {share:.3%} of pixels over 2")
        bad += 1
sys.exit(1 if bad else 0)
PY
echo "ok: transitions render the same in any order"

# 2. The cut check: a matched cut passes, a cut from still into a fast move and a cut that reverses
#    warn, and a hard cut missing from VIDEO.cuts is noted. scenes() lists only its cuts in film.cuts.
cat > "$work/cuts.html" <<'HTML'
<!doctype html><html><body style="margin:0;width:640px;height:360px;overflow:hidden">
<div id="stage" style="position:absolute;inset:0;overflow:hidden;background:#222">
  <div class="scene" id="a" style="position:absolute;inset:0;background:#ddd"><div id="ca" style="position:absolute;top:130px;width:100px;height:100px;background:#c33"></div></div>
  <div class="scene" id="b" style="position:absolute;inset:0;background:#bbb"><div id="cb" style="position:absolute;top:130px;width:100px;height:100px;background:#36c"></div></div>
  <div class="scene" id="c" style="position:absolute;inset:0;background:#999"><div id="cc" style="position:absolute;top:130px;width:100px;height:100px;background:#3a3"></div></div>
  <div class="scene" id="d" style="position:absolute;inset:0;background:#777"><div id="cd" style="position:absolute;top:130px;width:100px;height:100px;background:#c93"></div></div>
</div>
<script type="module">
import { scenes } from "/_skill/runtime/transitions.js";
const film = scenes(["#a", { at: 1, kind: "cut" }, "#b", { at: 2, kind: "cut" }, "#c", { at: 3, kind: "dissolve", dur: 0.5 }, "#d"]);
// The box slides left at 300 px/s on both sides of the cut at 1 s (matched), then stops dead at the
// cut at 2 s (c holds still), and d's box sets off at 900 px/s the moment the dissolve ends.
const x = { a: (t) => 500 - 300 * t, b: (t) => 500 - 300 * t, c: () => 270, d: (t) => 100 + 900 * Math.max(0, t - 3.5) };
window.seek = (t) => {
  film(t);
  for (const k of "abcd") document.getElementById(`c${k}`).style.left = `${x[k](t).toFixed(2)}px`;
};
// The cut at 2 s is left out of VIDEO.cuts on purpose.
window.VIDEO = { width: 640, height: 360, duration: 4.2, cuts: film.cuts.slice(0, 1) };
window.FILM_CUTS = film.cuts;
window.seek(0);
</script></body></html>
HTML
out=$(node "$skill/scripts/review.mjs" cuts "$work/cuts.html" --out "$work/cuts.png")
echo "$out" | grep -E '^ +1\.00 s .* ok ' >/dev/null || fail "the matched cut at 1 s should pass:\n$out"
echo "$out" | grep -E '^ +2\.00 s .* WARN .*speed' >/dev/null || fail "the cut at 2 s from fast to still should warn:\n$out"
echo "$out" | grep -E '^ +3\.00 s .*dissolve.* WARN .*end' >/dev/null || fail "the dissolve's end into a fast move should warn:\n$out"
echo "$out" | grep -q 'the cut at 2.00 s is not in VIDEO.cuts' || fail "a cut missing from VIDEO.cuts should be noted:\n$out"
[[ -s "$work/cuts.png" ]] || fail "no strip image"
echo "ok: the cut check passes a matched cut and warns on speed jumps; film.cuts lists only hard cuts"

# 3. The finish: grain holds each field for 5 frames at 60 fps (12 a second), plain alpha never
#    washes a dark frame out, and per-frame grain costs far more bytes than 12 Hz grain.
grain_page() {  # file, background, rate
  cat > "$1" <<HTML
<!doctype html><html><body style="margin:0;width:640px;height:360px;background:$2;overflow:hidden">
<div id="finish"></div>
<script type="module">
import { finish } from "/_skill/runtime/transitions.js";
window.seek = (t) => finish("#finish", t, { grain: true, vignette: true, rate: $3 });
window.VIDEO = { width: 640, height: 360, duration: 2 };
window.seek(0);
</script></body></html>
HTML
}
grain_page "$work/g12.html" "#808080" 12
grain_page "$work/g60.html" "#808080" 60
grain_page "$work/dark.html" "#000000" 12
(cd "$work" && render g12.html --stills s12 --at 0,0.0167,0.0667,0.0833)
cmp -s "$work/s12/t0000.00.jpg" "$work/s12/t0000.02.jpg" && cmp -s "$work/s12/t0000.00.jpg" "$work/s12/t0000.07.jpg" \
  || fail "grain changed within one 12 Hz field (frames 0-4)"
cmp -s "$work/s12/t0000.00.jpg" "$work/s12/t0000.08.jpg" && fail "grain did not change at frame 5"
(cd "$work" && render dark.html --stills sd --at 0.5)
[[ $(mean "$work/sd/t0000.50.jpg" 0) -lt 12 ]] || fail "the finish lifts a black frame (an overlay is not plain alpha)"
gray=$(mean "$work/s12/t0000.00.jpg" 0)
(( gray > 112 && gray < 136 )) || fail "the finish shifts a mid-gray frame to $gray"
(cd "$work" && render g12.html --out g12.mp4 --fps 60 --sub 1 && render g60.html --out g60.mp4 --fps 60 --sub 1)
s12=$(( $(wc -c < "$work/g12.mp4") / 1000 )); s60=$(( $(wc -c < "$work/g60.mp4") / 1000 ))
(( s60 * 10 > 25 * s12 )) || fail "per-frame grain (${s60} kB) should cost far more than 12 Hz grain (${s12} kB)"
echo "ok: grain re-seeds 12 times a second (${s12} kB for 2 s; every frame: ${s60} kB); plain alpha only"

# 4. mux.py --lut: an identity LUT keeps the colors, a warm one shifts them.
cat > "$work/id.cube" <<'CUBE'
LUT_3D_SIZE 2
0 0 0
1 0 0
0 1 0
1 1 0
0 0 1
1 0 1
0 1 1
1 1 1
CUBE
awk 'NR==1 {print; next} {r=$1*0.85+0.12; if (r>1) r=1; printf "%.3f %.3f %.3f\n", r, $2*0.97, $3*0.8}' "$work/id.cube" > "$work/warm.cube"
cat > "$work/flat.html" <<'HTML'
<!doctype html><html><body style="margin:0;width:320px;height:180px;background:#6a7f94">
<script type="module">
import { sfx } from "/_skill/runtime/motion.js";
sfx(0.2, "tap");
window.seek = () => {};
window.VIDEO = { width: 320, height: 180, duration: 1 };
</script></body></html>
HTML
(cd "$work" && render flat.html --out flat.mp4 --fps 30 --sub 1)
for lut in id warm; do
  uv run -q --script "$skill/scripts/mux.py" "$work/flat.mp4" --out "$work/$lut.mp4" --sfx-dir "$work/sfx" --lut "$work/$lut.cube" >/dev/null
  ffmpeg -v error -y -ss 0.5 -i "$work/$lut.mp4" -frames:v 1 "$work/$lut.png"
done
ffmpeg -v error -y -ss 0.5 -i "$work/flat.mp4" -frames:v 1 "$work/src.png"
for c in 0 1 2; do
  d=$(( $(mean "$work/id.png" $c) - $(mean "$work/src.png" $c) ))
  (( d >= -2 && d <= 2 )) || fail "an identity LUT moved channel $c by $d"
done
(( $(mean "$work/warm.png" 0) > $(mean "$work/src.png" 0) + 8 && $(mean "$work/warm.png" 2) < $(mean "$work/src.png" 2) - 8 )) \
  || fail "the warm LUT did not warm the picture"
echo "ok: mux.py --lut grades through lut3d (identity keeps the colors)"
