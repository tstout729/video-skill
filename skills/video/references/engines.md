# Choosing an engine

Name the engine in the brief's OUTPUT line, with the exact size, frame rate and frame count. If you don't, the model picks one for you.

| The piece | Engine | How it runs here |
| --- | --- | --- |
| A diagram explainer: how something works, with narration | **Manim** | `video.py` with `Narrated` scenes ([Explainer (Manim)](../SKILL.md#explainer-manim)) |
| A UI walkthrough, loop, kinetic type, a launch film | **HTML + `motion.js`** | `index.html` with `seek(t)`; springs, cues, pointer, captions, clips |
| Anything 3D: a product, logo, character, material or camera move | **three.js** in the same HTML page | [3D with three.js](three.md); `setup.sh --with three` |
| You already think in GSAP timelines | **GSAP** in the same HTML page | `setup.sh --with gsap`; build a paused timeline and call `tl.seek(t)` inside `seek(t)` |
| A long series, a template filled from data, a React codebase | **Remotion** | A separate framework with its own renderer and [official Agent Skills](https://www.remotion.dev). It is source-available: free for individuals, companies of up to 3 people, non-profits and evaluation, and other companies need a company license. Use this skill's brief, numbers and review loop with it. |
| HTML, CSS and GSAP rendered by a command-line tool | **HyperFrames** (HeyGen, Apache 2.0) | A separate renderer. The brief, numbers and review loop apply unchanged. |
| Motion inside a live product rather than a video | **Motion** (formerly Framer Motion) or GSAP | Not a video tool: there is no renderer. Use the numbers in [animation principles](../animation-principles.md). |

Rules of thumb from the Motion Lab article:
- A single idea under ten seconds is plain HTML.
- A series, a template or a data-driven video is Remotion.
- If you think in web pages and GSAP, use GSAP here or HyperFrames.
- Anything 3D is three.js.

In this skill, every HTML engine shares one page and one renderer. The `seek(t)` contract keeps it simple: three.js, GSAP and `motion.js` can all draw the same frame, and the review tools, captions and sound work the same way for all of them.

## GSAP in a page

```html
<script type="module">
import { gsap } from "/_vendor/gsap/index.js";
const tl = gsap.timeline({ paused: true });
tl.to("#card", { x: 480, duration: 0.6, ease: "power3.out" })
  .to("#card", { scale: 1.08, duration: 0.1, ease: "power2.out" }, ">-0.05");
window.seek = (t) => { tl.seek(t); };
window.VIDEO = { width: 1080, height: 1350, duration: 12 };
</script>
```

- Keep the timeline paused, and let only `seek(t)` move it. Never let GSAP's ticker run.
- Call `tl.seek(t)` with no second argument. Its second argument is `suppressEvents`, which defaults to true; passing `false` fires every callback on every seek.
- GSAP's randomness is not seeded: `gsap.utils.random`, `"random(…)"` strings and `stagger: {from: "random"}` give different frames each render. Draw values from `rand(seed)` instead.
- GSAP is free, including its plugins, under its own "standard no-charge" license. The one restriction is on building a competing no-code animation tool. `setup.sh` installs it only when asked; the skill does not bundle it.
- GSAP's eases map onto the numbers like this:
  - `power2`/`power3` `.out` for entrances and `.in` for exits;
  - `.inOut` for moves across the frame;
  - `back.out(1.2)` for a slight overshoot on position only, never on opacity or text.
