# Assets

Drop files at these exact paths and they replace the placeholders automatically. Nothing else needs to change.

| File | Where it shows | Notes |
| --- | --- | --- |
| `img/robot.png` | home screen, above the title | square-ish, transparent background |
| `img/robot-happy.png` | "payment accepted" screen | square-ish, transparent background |
| `img/bird.png` | the flappy player sprite | square, transparent background, facing right |
| dance music | loops during interpretive dance | lives in `js/data.js` as `DANCE_SONG` (converted from a MIDI). change `bpm` there to speed it up or slow it down |

Fonts: `fonts/jc-font.woff2` (converted from the .ttf) is the main font for everything; `--font-head` / `--font-body` at the top of `css/style.css` control it. If you update the .ttf, re-export a .woff2 too, or just delete the woff2 and the browser will use the .ttf.
