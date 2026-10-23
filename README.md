# Tokens Please

A silly mobile site for a Halloween robot-artist costume. People scan an NFC tag, "buy" tokens by dancing, doing trivia or playing flappy robot, then spend 1 token per second of drawing.

Plain HTML/CSS/JS with no build step.

## Run locally

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000. To test on your phone, use your computer's LAN IP (e.g. `http://192.168.1.20:8000`) while on the same wifi.

## Deploy to GitHub Pages

1. Create a repo on GitHub (e.g. `tokens-please`) and push this folder to `main`.
2. Repo **Settings → Pages → Build and deployment**: Source = "Deploy from a branch", Branch = `main`, folder `/ (root)`.
3. After a minute it's live at `https://<your-username>.github.io/tokens-please/`.
4. Write that URL to the NFC tag (NFC Tools on iOS/Android → Write → Add a record → URL).

## Where to change things

- `js/data.js`: token packages, flappy difficulty, trivia questions, dance prompts, rejection lines
- `css/style.css`: colours and fonts (top of file)
- `assets/`: drop in your hand-drawn images and the dance music (see `assets/README.md`)

## Handy for testing

Progress is saved in the browser so a refresh doesn't lose tokens. To start over, finish a drawing and tap "new customer" twice, or clear site data.
