# Animation principles and pacing

Read this before you plan the motion. Review the draft against it before the final render. It applies to every video people watch: explainers, walkthroughs, loops and generated clips. It does not apply to transitions inside an app that people operate; those stay short (about 150–300 ms).

## Slow down

Agent-made animation is usually too fast. The viewer has never seen this screen or diagram. They must see each change start, follow it, and read the result before the next change.

- Show one change at a time. Start the next change only after the last one has settled and the viewer has had time to read it.
- Hold each settled state for at least 1.5 seconds, plus about a third of a second for each new word on screen. In a narrated video, hold the state while the narrator explains it.
- Give bigger moves more time. Starting points:

  | Change | Duration |
  | --- | --- |
  | Press, toggle, check mark | 0.3–0.5 s |
  | Content swap, short move of a card or panel | 0.6–0.9 s |
  | Layout or size change, a move across the frame | 0.9–1.5 s |
  | Camera zoom or pan, change of scene | 1.0–1.8 s |

- A hold is not dead time. Dead time is a frame with nothing to look at, or a pause with no reason. A settled state that the viewer is reading is the point of the video.
- If a scene is still too fast, remove a state. Do not make every move faster.

## The principles

John Lasseter's SIGGRAPH 1987 paper, [Principles of Traditional Animation Applied to 3D Computer Animation](https://dl.acm.org/doi/10.1145/37402.37407), applies the Disney studio's principles of animation to computer animation. These are its eleven principles, in its order, and what each means for UI and diagram motion.

1. **Squash and stretch.** Keep it slight. A pressed button shrinks to about 0.97. A sliding pill stretches toward its target, then settles.
2. **Timing.** Duration tells the viewer how big and how important a thing is. Heavy or important things move slower and hold longer. Give time to the preparation, the action and the result.
3. **Anticipation.** Prepare the eye before each change. The pointer arrives and presses before the screen responds. Dim or highlight before a reveal. The narrator names a thing just before it moves.
4. **Staging.** Show one idea at a time, and make it unmistakable. Dim, blur or move away everything else, and zoom to the subject. Do not bring in a title, cards and arrows in the same second.
5. **Follow-through and overlapping action.** Parts do not start and stop together. Stagger the items in a group by 40–80 ms. Let the trailing edge finish after the leading edge. Let a moved element settle with a slight overshoot instead of stopping dead.
6. **Straight-ahead and pose-to-pose.** Work pose to pose. Plan the key states first (the scene plan or the step list), then the moves between them.
7. **Slow in and slow out.** Every move eases in and eases out. Springs and Manim's default `smooth` do this. Use linear motion only for a steady process, such as a progress bar.
8. **Arcs.** A thing that travels follows a gentle curve, not a straight line: the pointer's path, a card that flies to a list, a node that crosses a diagram.
9. **Exaggeration.** Make the important change big enough to see at video size. Zoom in, enlarge the control, raise the contrast. Exaggerate size and clarity, not bounce.
10. **Secondary action.** Small supporting motion, such as a counter that ticks or a check mark that draws, helps the main action. It never competes with the main action or starts at the same moment.
11. **Appeal.** Clean shapes, one font, readable text and the real colors. The viewer wants to keep watching.

## Review

1. **Plan.** List the key states with their times. Check the list against the rules above before you animate.
2. **Draft.** Check each scene against the pacing rules and the eleven principles. Fix the worst problems first: changes that overlap, states that change before they can be read, and parts that start or stop together.
3. **Measure the holds.** This command prints each still stretch of 0.6 seconds or longer, as a start time and a duration:

   ```sh
   ffmpeg -v info -i draft.mp4 -an -vf "fps=10,scale=480:-2,freezedetect=n=0.002:d=0.6" -f null - 2>&1 \
     | grep -o -E 'freeze_(start|duration): [0-9.]+'
   ```

   A scene with no hold of 1.5 seconds or more is too fast. A pointer or a background that never stops moving hides holds from this check; look at the stills for those scenes. Measure the final render before any web re-encode: a low-resolution draft gives different counts, and a re-encode's keyframes can split a hold, and a slow fade of a small element can count as stillness. Leave some margin, because a hold of exactly 1.5 seconds can split in two.
