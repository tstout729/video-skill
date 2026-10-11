#!/usr/bin/env bash
# Install and check everything the video skill needs. Safe to run again at any time.
#   bash <skill>/scripts/setup.sh           install Playwright + Chromium if missing, then check everything
#   bash <skill>/scripts/setup.sh --check   check only; change nothing
# Playwright goes into a private cache folder ($VIDEO_SKILL_HOME, default ~/.cache/video-skill),
# never into your project. Exit code 1 means a required tool is missing.
set -uo pipefail
check_only=0; [[ "${1:-}" == --check ]] && check_only=1
cache="${VIDEO_SKILL_HOME:-${XDG_CACHE_HOME:-$HOME/.cache}/video-skill}"
pw_version="${PLAYWRIGHT_VERSION:-1.64.0}"
missing=0
ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$1"; }
bad()  { printf '  \033[31m✗\033[0m %s\n' "$1"; missing=1; }
os="$(uname -s)"
hint() {  # install command for a system package on this OS
  case "$os" in
    Darwin) echo "brew install $1" ;;
    Linux)  echo "sudo apt-get install -y $2   (or your distribution's package)" ;;
    *)      echo "install $1 (on Windows, use WSL2)" ;;
  esac
}

echo "Video skill setup"

echo "Tools"
if command -v ffmpeg >/dev/null && command -v ffprobe >/dev/null; then
  filters="$(ffmpeg -hide_banner -filters 2>/dev/null)"
  if grep -q ' tmix ' <<<"$filters" && grep -q ' loudnorm ' <<<"$filters" \
     && ffmpeg -hide_banner -encoders 2>/dev/null | grep -q libx264; then
    ok "ffmpeg $(ffmpeg -version | head -1 | awk '{print $3}')"
  else
    bad "ffmpeg lacks libx264, tmix or loudnorm; install a full build: $(hint ffmpeg ffmpeg)"
  fi
else
  bad "ffmpeg not found: $(hint ffmpeg ffmpeg)"
fi
if command -v node >/dev/null; then
  major="$(node -p 'process.versions.node.split(".")[0]')"
  if (( major >= 18 )); then ok "node $(node --version)"; else bad "node 18 or newer needed (found $(node --version))"; fi
else
  bad "node not found: $(hint node nodejs)  (or https://nodejs.org)"
fi
if command -v uv >/dev/null; then
  ok "uv $(uv --version | awk '{print $2}')"
else
  bad "uv not found: curl -LsSf https://astral.sh/uv/install.sh | sh   (https://docs.astral.sh/uv/)"
fi

echo "Browser renderer (Playwright + Chromium)"
find_pw='
  const path = require("path"), os = require("os"), cp = require("child_process");
  const roots = [process.env.PLAYWRIGHT_DIR, process.argv[1]].filter(Boolean);
  try { roots.push(cp.execFileSync("npm", ["root", "-g"], { encoding: "utf8" }).trim()); } catch {}
  for (const r of roots) { try { console.log(require.resolve("playwright", { paths: [r] })); process.exit(0); } catch {} }
  process.exit(1);'
if command -v node >/dev/null; then
  if ! pw="$(node -e "$find_pw" "$cache" 2>/dev/null)"; then
    if (( check_only )); then
      bad "Playwright not installed (run this script without --check)"
    else
      echo "  installing playwright@$pw_version into $cache ..."
      mkdir -p "$cache"
      if (cd "$cache" && npm install --silent --no-audit --no-fund --ignore-scripts --prefix "$cache" "playwright@$pw_version" >/dev/null); then
        pw="$(node -e "$find_pw" "$cache" 2>/dev/null)" || true
      fi
      [[ -n "${pw:-}" ]] || bad "Playwright install failed; check npm and your network"
    fi
  fi
  if [[ -n "${pw:-}" ]]; then
    pwdir="$(dirname "$pw")"
    pwver="$(node -p 'require(process.argv[1] + "/package.json").version' "$pwdir")"
    # The real test: can Playwright start a headless Chromium? (Renders use the headless shell.)
    launch='const {chromium}=require(process.argv[1]); chromium.launch({executablePath: process.env.CHROMIUM_PATH || undefined}).then(b => b.close()).then(() => process.exit(0), () => process.exit(1));'
    if node -e "$launch" "$pwdir" >/dev/null 2>&1; then
      ok "Playwright $pwver with Chromium${CHROMIUM_PATH:+ (CHROMIUM_PATH)}"
    elif (( check_only )); then
      bad "Chromium for Playwright not installed (run this script without --check)"
    else
      echo "  downloading Chromium for Playwright (about 300 MB) ..."
      node "$pwdir/cli.js" install chromium 2>&1 | grep -v -E "^\s*$" | tail -n 3
      # Linux also needs Chromium's system libraries; install them when sudo needs no password.
      if [[ "$os" == Linux ]] && ! node -e "$launch" "$pwdir" >/dev/null 2>&1 && sudo -n true 2>/dev/null; then
        echo "  installing Chromium's system libraries ..."
        sudo -n env PATH="$PATH" node "$pwdir/cli.js" install-deps chromium >/dev/null 2>&1
      fi
      if node -e "$launch" "$pwdir" >/dev/null 2>&1; then
        ok "Playwright $pwver with Chromium"
      else
        if [[ "$os" == Linux ]]; then
          bad "Chromium will not start. Run: sudo node $pwdir/cli.js install-deps chromium"
        else
          bad "Chromium will not start. Run: node $pwdir/cli.js install chromium   and read its error"
        fi
      fi
    fi
  fi
fi

echo "Manim (for explainer videos)"
if command -v uv >/dev/null; then
  if out="$(uv run -q --python 3.12 --with manim==0.21.0 python -W ignore -c 'import manim, manimpango; print(manim.__version__)' 2>/dev/null)"; then
    ok "manim $out"
  else
    warn "Manim could not load; explainer videos need it (walkthroughs and loops do not)."
    case "$os" in
      Darwin) echo "     Try: brew install cairo pango pkg-config" ;;
      Linux)  echo "     Try: sudo apt-get install -y libcairo2-dev libpango1.0-dev pkg-config python3-dev" ;;
    esac
    echo "     Details: https://docs.manim.community/en/stable/installation.html"
  fi
fi
if command -v latex >/dev/null; then ok "LaTeX (optional) found"; else ok "LaTeX not installed (optional; the skill does not need it)"; fi

echo "Narration (ElevenLabs)"
if [[ -n "${ELEVENLABS_API_KEY:-}" ]] || grep -q '^ELEVENLABS_API_KEY=' "$HOME/.config/elevenlabs/env" 2>/dev/null; then
  ok "ElevenLabs API key found"
else
  warn "No ElevenLabs API key. Narrated videos need one; silent loops and the bundled examples do not."
  echo "     Get a key at https://elevenlabs.io, then: export ELEVENLABS_API_KEY=..."
  echo "     or save the line ELEVENLABS_API_KEY=... in ~/.config/elevenlabs/env (chmod 600)"
fi

if (( missing )); then echo "Not ready: fix the items marked ✗, then run this again."; exit 1; fi
echo "Ready."
