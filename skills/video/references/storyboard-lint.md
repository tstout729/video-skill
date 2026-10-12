# Storyboard and lint

Two review tools for HTML videos, both in `scripts/review.mjs`:

- `board` draws a numbered storyboard for the user to approve **before** you pay for narration and full renders.
- `lint` measures the text on screen, frame by frame: clipping, safe areas, overlaps, type size and contrast. A contact sheet at thumbnail size hides these problems; a cropped label still looks fine there.

## The workflow

brief → look frames → board → narrate → animate → review

1. **Brief.** Write `brief.md` ([the directed brief](brief.md)).
2. **Look frames.** Build two to four key poses in the page, and render them at full size. The user approves the palette, type, materials and framing.
3. **Board.** List every shot's key pose in `window.SHOTS`, and render the storyboard. The user approves or rejects each panel by its number.
4. **Narrate.** Record the voice only after the board is approved. Narration costs ElevenLabs credits, and a changed shot often means a changed script.
5. **Animate.** Time the approved poses to the narrator's words, and add the motion between them.
6. **Review.** Contact sheets, speed graphs, holds, `audit` and `lint`, then the full render.

Show each picture to the user and ask for an answer by number. For example: "Approve or reject each panel by its number. For example: 1–4 yes; 5: hold the receipt longer."

## Shots

Declare the shots in the page, after `window.VIDEO`:

```js
window.SHOTS = [
  { t: 0, title: "Pay button", note: "Pay $48.00 on an ink pill; the pointer rests at the lower right." },
  { t: 3.5, title: "Card sheet", note: "The button grows into the sheet.", sound: "tap on beat 2" },
  { t: 15.2, title: "Back to Pay", sound: "tap on beat 27", next: "loops to 1" },
];
```

- `t` is the moment of the shot's **key pose**: a settled state, a moment after its change. It is not the start of the shot.
- `title` names the shot in 2–4 words. `note` says what the viewer sees, in one sentence.
- `sound` is optional. Without it, the panel lists the sounds the page declared with `sfx()` and `pointer().tap()` since the panel before, such as "tap 9.33 s · key ×18".
- `next` is optional: the handoff to the next shot, such as "cut on beat 9", "match cut" or "loops to 1".

Before narration there are no word cues, so put each pose at a planned time from the brief. `seek(t)` may jump straight between poses at first. Keep the times in named constants. After narration, set the constants from `cue()`, and the board keeps working. The examples build `VIDEO.stills` from their shots, so a contact sheet of the stills shows the same story.

## board

```sh
node <skill>/scripts/review.mjs board index.html                      # qa/board.png
node <skill>/scripts/review.mjs board index.html --look               # qa/look.png
node <skill>/scripts/review.mjs board index.html --look --at 3.5,8.5,12
```

- Each panel renders its frame through the real `seek(t)`, like the final render. It shows the panel number, the frame and time, the title, the note, the sound, and "→ next": the next panel's number and title, or "end".
- Panels come from `window.SHOTS`, else `--at` (seconds, or `stills`), else `VIDEO.stills`. A panel without a shot takes its title from the cue, the words or the beat at that moment.
- Panels are three across for wide and square frames, and four across for tall frames. `--cols` changes this.
- `--look` renders look frames instead: 2–4 frames at full size, up to 1920 px wide. By default it picks three from the middle of the shot list, which skips a title card and a loop's return to the first frame. Use `--count` for another number, or `--at` to choose them.
- The picture goes to `qa/board.png` (or `qa/look.png`) next to the page, or to `--out`.

## lint

```sh
node <skill>/scripts/review.mjs lint index.html
node <skill>/scripts/review.mjs lint index.html --allow lint-allow.txt --out qa/lint.png
```

| Check | Finds |
| --- | --- |
| `clipped` | A line of text cut by the frame, or by a box that clips it (`overflow: hidden`), such as a label that does not fit its pill |
| `safe` | Text outside the format's safe area, or in a band where the platform draws its own buttons |
| `overlap` | Two texts drawn over each other, where both show |
| `small` | Type smaller than 28 px on a 1080 px short side, as drawn |
| `contrast` | Text under 4.5:1 contrast with the real pixels behind it |

### Which frames

Lint checks every half second (`--every n` frames; the default is half the frame rate). It also checks every frame where the text stops moving and stays still for 0.25 s: the settle frames, where the viewer reads.

A finding counts when it holds on two samples in a row that are 0.2 s or more apart, or on a settle frame. Text crossing another text for a moment, or a label halfway through its fade, is ignored; the summary counts these brief findings.

### Safe areas

`--safe` picks the format. The default comes from the page's size; `--safe off` turns the check off.

| Format | Text stays inside |
| --- | --- |
| 9:16 | The middle 80% of the width; below the top 12% (the app's tabs); above the bottom 20% (caption, account name and buttons); clear of the right rail (like, comment, share), from 84% across and 40–80% down |
| 4:5 and 1:1 | 5% from the sides and top; 7% from the bottom, for a feed's mute button and progress bar |
| 16:9 | Title safe: 5% from each edge |

Captions from `captions()` sit inside each of these.

### Type size

The minimum is 28 px on a 1080 px short side, scaled for other sizes: 28 px for every format at full size, and 14 px for a half-size draft. `--min-size` changes it. The size is the font size times every scale between the text and the frame, so a camera zoom counts.

### Contrast

Contrast is measured from the real pixels, so it works over photos, video frames, 2D canvases and WebGL:

1. Lint hides every glyph (`-webkit-text-fill-color: transparent`, which never moves the layout) and takes a screenshot. The median color behind each text's visible glyphs is its background.
2. It marks every glyph magenta, then green, each with a 3 px outline, and takes two more screenshots. Where a glyph covers a pixel fully, the difference between the two marks shows how much of the text reaches the screen. Opacity, blur and anything translucent drawn over the text, such as a modal's scrim, all reduce it.
3. The text's computed color, passed through that share, is compared with the background by the WCAG formula.

All text needs 4.5:1. WCAG allows 3:1 for large text, but video text is read once, at a distance, often on a phone.

A WebGL canvas needs `preserveDrawingBuffer: true`, as [3D with three.js](three.md) already requires.

### Covered text and overlaps

Text hidden under an opaque card is not on screen, so lint skips it. When two texts' boxes cross, lint takes a screenshot of each one's glyphs alone. It reports an overlap only where both show in the shared area.

### Allowed findings

Some findings are on purpose: a watermark, a ticker that runs off the edge, faint upcoming steps. List them in a file and pass it with `--allow`. Each line names the check, the element and the reason:

```
# lint-allow.txt: <check> <element or text> [@ t0-t1] -- <reason>
contrast #watermark -- the DRAFT stamp is a watermark, not text to read
clipped "Breaking news" @ 4-9 -- the ticker runs through the frame edge on purpose
small #app -- the app is redrawn at its real size; the camera pushes in before each step
```

- The check is `clipped`, `safe`, `overlap`, `small`, `contrast`, or `*` for all of them.
- The element is part of the printed selector path and text, or a CSS selector of a box that contains the text, such as `#app`. `*` matches every element.
- `@ t0-t1` limits the line to findings within those seconds.
- The reason is required. Lint prints it next to the finding, and notes any line that matched nothing.

The walkthrough and transitions examples each have a real `lint-allow.txt`. The repository's tests lint every HTML example this way.

### Output

Each finding prints with its number, check, selector path and text, the frames where it holds, and its measurements at one frame (the first settle frame, when there is one):

```
   9  contrast  #gray777 "#777 on white: 4.48 to 1"
        f0–f210 (0.00–3.50 s, 10 samples, settled): at f0: 4.48:1, #777777 on #FFFFFF; needs 4.5:1
```

`--out lint.png` draws each finding on its frame, numbered as printed, with the safe area dashed. Allowed findings are gray. Lint exits 1 when any finding is not allowed.

### Limits

- Text drawn inside a canvas, or shown as an image, is not text to lint. The render contract keeps text as real text.
- `clip-path` and masks are not treated as clipping boxes.
- Text below 10% opacity counts as hidden.
- Each sample takes three screenshots, plus one for each text that crosses another. A 48-second walkthrough lints in under a minute.
- A film finish (grain, vignette) changes the measured contrast and slows each screenshot. Lint with `--query finish=0`; every review command takes `--query`, like `render.mjs`.

## Credits

The storyboard follows the board in [cth9191/animate](https://github.com/cth9191/animate) (MIT): numbered panels drawn from the piece's own frames, approved by number. Lint's checks for cut-off and overlapping text follow its `textcheck.mjs`. Measuring contrast with the text hidden follows the contrast report in [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) (Apache-2.0). The code here is new; none is copied.
