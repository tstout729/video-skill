# Animation principles and pacing

Read this before you plan the motion. Review the draft against it before the final render. It applies to every video people watch: explainers, walkthroughs, loops and 3D pieces. It does not apply to transitions inside an app that people operate; those stay short (about 150–300 ms).

Every rule here is a number on purpose. Adjectives such as "smooth" or "premium" leave the decision to the model's defaults, and the defaults are what make motion look generated. Write the numbers into the brief ([directed brief](references/brief.md)).

## Slow down

Agent-made animation is usually too fast. The viewer has never seen this screen or diagram. They must see each change start, follow it, and read the result before the next change.

- Show one change at a time. Start the next change only after the last one has settled and the viewer has had time to read it.
- Hold each settled state long enough to read it:
  - In explainers and training: at least 1.5 seconds, plus about a third of a second for each new word on screen. In a narrated video, hold the state while the narrator explains it.
  - The absolute floor for any text, including fast teasers: 0.3 seconds per word plus 0.5 seconds. A two-word title needs about 1.1 seconds.
- Keep a long hold alive with a very slow push of about 2% of scale. The words must stay readable.
- If a scene is still too fast, remove a state. Do not make every move faster.
- A hold is not dead time. Dead time is a frame with nothing to look at, or a pause with no reason. A settled state that the viewer is reading is the point of the video.

## One hero per shot

Each shot has one hero move. Everything else waits, dims or holds still.

- **Secondary moves** travel 50–70% as far as the hero and start 100–200 ms after it.
- **Ambient motion** stays under 5% of the hero's travel, on a slow, endless sine wave (`loopNoise` in `motion.js`).
- **Busy** means two heroes at once. Delay one by about 150 ms and cut its travel to about 60%.

## The numbers

**Easing.**
- Things that enter ease out. Things that leave ease in, and exits are 40–50% shorter than entrances (for example, a 400 ms entrance and a 200 ms exit).
- Moves across the frame ease in and out.
- Linear timing is only for rotation, progress bars and a loop's overall phase. Linear easing on an ordinary move is the quickest way to make something look computer-generated.

**Springs.** One number describes every spring: the damping ratio ζ. In `motion.js`, pass `{duration, damping}`; the older `bounce` equals 1 − ζ. The named `SPRING` presets are near-critical (ζ 0.94–1.0, `pop` 0.86), for app screens in walkthroughs, where an overshoot reads as a glitch. For objects, hero moves and launch films, pass `{damping: 0.8}`.

| Damping ratio | Feel | Use |
| --- | --- | --- |
| 1.0 | No bounce | Text, opacity, camera |
| 0.8–0.85 | Premium | The default for UI and objects |
| 0.7 | Lively | Presses, toggles, small hero moves |
| 0.4–0.6 | Playful | Only when the brief asks for it |
| below 0.3 | Cartoon | Avoid |

Position and size may bounce. Opacity and color never do. Other libraries name springs differently. Translate their defaults into ζ before you use them: Remotion's default spring is about 0.5 (playful), and react-spring's is about 1.0.

**Durations.**

| Change | Teaser or loop | Explainer or training |
| --- | --- | --- |
| Feedback: press, toggle, check | 100–200 ms (about 100 ms feels instant) | 300–500 ms |
| UI move: swap, short slide | 200–500 ms | 600–900 ms |
| Hero reveal, layout or size change | 600–900 ms | 0.9–1.5 s |
| Camera zoom or pan, scene change | 0.8–1.2 s | 1.0–1.8 s |

Explainers and training run slower, because the viewer must learn the screen, not just enjoy it.

**Stagger.**
- Letters go one frame apart, words 60–120 ms apart, and list items 40–80 ms apart.
- Start each next item when the previous one is 30–50% done. Fully sequential looks robotic; all at once looks cheap.

**Frames.** Think in frames. At 60 fps a frame is 16.7 ms; at 30 fps, 33.3 ms; at 24 fps, 41.7 ms. A 400 ms move is 24 frames at 60 fps.

**Beat grid.**
- Frames per beat = fps × 60 ÷ BPM. That is exactly 30 frames at 120 BPM and 60 fps.
- Compute each beat's time from its number (`beat(n)` does this). Never add a rounded frames-per-beat repeatedly: it drifts off the music within a few dozen beats.
- Cut on beats. Save bigger layout changes for the bar (every 4 beats). Changing everything on every beat exhausts the viewer.

**Camera.**
- Camera moves get the gentlest curves; objects get snappier ones. The camera moves only after the content has settled.
- A starting point for parallax: speed 1.0 for the foreground, 0.5 for the midground and 0.2 for the background.
- In 3D, use a narrow field of view, 35–50°.

**Exaggeration for phones.** Most viewers watch on a phone. Take key poses 10–30% further than feels natural, in size, contrast and travel, never in bounce.

**Accessibility.**
- Text keeps at least a 4.5:1 contrast ratio on every frame, even over moving backgrounds.
- Nothing flashes more than three times per second.

## The principles

John Lasseter's SIGGRAPH 1987 paper, [Principles of Traditional Animation Applied to 3D Computer Animation](https://dl.acm.org/doi/10.1145/37402.37407), applies the Disney studio's principles of animation to computer animation. These are its eleven principles, in its order, and what each means for UI, diagram and 3D motion. In a short piece, five do most of the work: anticipation, squash and stretch, overlapping action, follow-through and arcs.

1. **Squash and stretch.** Keep it slight. A pressed button shrinks to about 0.97. A sliding pill stretches toward its target, then settles. A 3D object keeps its volume: it widens as it flattens.
2. **Timing.** Duration tells the viewer how big and how important a thing is. Heavy or important things move slower and hold longer. Give time to the preparation, the action and the result.
3. **Anticipation.** Prepare the eye before each change: 3–6 frames of a small opposite move before a big one. The pointer arrives and presses before the screen responds. Dim or highlight before a reveal. The narrator names a thing just before it moves.
4. **Staging.** Show one idea at a time, and make it unmistakable: the one-hero rule. Dim, blur or move away everything else, and zoom to the subject. Do not bring in a title, cards and arrows in the same second.
5. **Follow-through and overlapping action.** Parts do not start and stop together. Stagger the items in a group by 40–80 ms. Let the trailing edge finish after the leading edge. Let a moved element settle with a slight overshoot (ζ about 0.8) instead of stopping dead.
6. **Straight-ahead and pose-to-pose.** Work pose to pose. Plan the key poses first (the shot list in the brief), then the moves between them.
7. **Slow in and slow out.** Every move eases in and eases out. Springs and Manim's default `smooth` do this. Use linear motion only for a steady process.
8. **Arcs.** A thing that travels follows a gentle curve, not a straight line: the pointer's path, a card that flies to a list, a node that crosses a diagram, a hop in 3D.
9. **Exaggeration.** Make the important change big enough to see on a phone. Zoom in, enlarge the control, raise the contrast. Exaggerate size and clarity, not bounce.
10. **Secondary action.** Small supporting motion, such as a counter that ticks or a check mark that draws, helps the main action. It never competes with the main action or starts at the same moment.
11. **Appeal.** Clean shapes, one font, readable text and the real colors. The viewer wants to keep watching.

## Review

The first render is a draft. Finishing means rendering stills, looking at them, writing notes tied to frame numbers, fixing, and re-rendering only what changed. Two to four rounds is normal. Record every round in the project's `log.md`.

1. **Plan.** Write the brief, including the shot list with frame ranges. Check it against the rules above before you animate.
2. **Look before you change anything.** Render stills or a contact sheet (`review.mjs sheet`) and describe what you see before you edit. A contact sheet of 12 frames reads like a storyboard.
3. **Check the motion, not just the frames.**
   - **Onion skin** (`review.mjs onion`) overlays frames of one move. Even spacing means robotic motion. Spacing that tightens near the key pose means the easing works.
   - **Speed graph** (`review.mjs graph`) plots position per frame. A straight line means linear motion. A sharp corner means an abrupt start or stop.
4. **Write notes against frames, not feelings,** and send only one or two notes per round, because a list of ten notes turns a fix into a rewrite. For example: "f312–f318: the card lands 2 frames after the tap sound. Start it 3 frames earlier." The [brief reference](references/brief.md) shows how to turn vague notes into numbers.
5. **When a fix doesn't hold,** render the frames just before and after the problem and describe the difference.
6. **Test the numbers.** Declare `check()`s for what can be measured: settle frames, the caption band, safe areas, an object on its mark. Then run `review.mjs audit`, which reports failures by frame. The Motion Lab article ran 71 checks over 480 frames, and six failures were caught before the final render.
7. **Pin labels to frames while you iterate.** `?debug=1` (`render.mjs --debug`) prints the frame, time and current cue on every frame. If a move runs late, its label shows before the action.
8. **Measure the holds.** `review.mjs holds video.mp4` prints each still stretch of 0.6 seconds or longer and flags scenes without a hold of 1.5 seconds. The same check by hand:

   ```sh
   ffmpeg -v info -i draft.mp4 -an -vf "fps=10,scale=480:-2,freezedetect=n=0.002:d=0.6" -f null - 2>&1 \
     | grep -o -E 'freeze_(start|duration): [0-9.]+'
   ```

   - **The check can be fooled both ways.** A pointer or background that never stops moving hides holds; look at the stills for those scenes. A small change, such as a moving pointer, a spinner or one new line of text, may not break a "still" stretch; compare the freeze times with your plan.
   - **Measure the final render before any web re-encode.** A low-resolution draft gives different counts, a re-encode's keyframes can split a hold, and a slow fade of a small element can count as stillness.
   - **Leave margin:** a hold of exactly 1.5 seconds can split in two.
9. **Measure the sound** with `check_sync.py`: every hit lands one frame after its picture, and loudness and peak are on target.
