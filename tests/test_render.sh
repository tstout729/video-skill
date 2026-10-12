#!/usr/bin/env bash
# Renderer regressions that need a browser: a declared hard cut never blends two shots.
set -euo pipefail
repo="$(cd "$(dirname "$0")/.." && pwd)"
work="$(mktemp -d)"; trap 'rm -rf "$work"' EXIT
cat > "$work/index.html" <<'HTML'
<!doctype html><html><body style="margin:0"><div id="a" style="position:absolute;inset:0"></div>
<script>
const a = document.getElementById("a");
window.seek = (t) => { a.style.background = t < 0.5 ? "#000" : "#fff"; };
window.VIDEO = { width: 64, height: 64, duration: 1, cuts: [0.5] };
</script></body></html>
HTML
cd "$work"
node "$repo/skills/video/scripts/render.mjs" index.html --out o.mp4 --fps 60 --sub 4 --workers 1 >/dev/null
luma() { ffmpeg -v error -i o.mp4 -vf "select=eq(n\,$1),scale=1:1,format=gray" -frames:v 1 -fps_mode vfr -f rawvideo - | od -An -tu1 | tr -d ' '; }
[ "$(luma 29)" -lt 10 ] && [ "$(luma 30)" -gt 245 ] || { echo "FAIL: the frame on a cut blends two shots (f29 $(luma 29), f30 $(luma 30))"; exit 1; }
echo "ok: hard cuts stay clean"
