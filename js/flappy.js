// Pro gamer moment: a tiny flappy bird clone.
// World coordinates are in units of canvas height, so it plays the same on any phone.
window.Flappy = function (canvas, hooks) {
  const ctx = canvas.getContext('2d');
  const C = { ink: '#3B2618', orange: '#F27A1A', blue: '#2F7FD8', bg: '#FBF5E8', soft: '#F9C79A' };
  const GRAVITY = 1.9, FLAP = -0.56, PIPE_W = 0.12, SPACING = 0.52, BIRD_R = 0.028, GROUND = 0.9;

  // drop a sprite at assets/img/bird.png to replace the placeholder robot head
  const sprite = new Image();
  let spriteOk = false;
  sprite.onload = () => { spriteOk = true; };
  sprite.src = 'assets/img/bird.png';

  let W = 0, H = 0, raf = 0, last = 0, cfg = null, s = null;
  const birdX = () => (W / H) * 0.28;

  function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function reset() {
    s = { mode: 'ready', y: 0.45, vy: 0, pipes: [], score: 0, scroll: 0, t: 0 };
  }

  function spawn(x) {
    const margin = 0.08;
    const lo = margin + cfg.gap / 2, hi = GROUND - margin - cfg.gap / 2;
    const prev = s.pipes.length ? s.pipes[s.pipes.length - 1].gy : 0.45;
    const gy = Math.min(hi, Math.max(lo, prev + (Math.random() * 2 - 1) * 0.25));
    s.pipes.push({ x, gy, passed: false });
  }

  function flap() {
    if (s.mode === 'ready') s.mode = 'play';
    if (s.mode !== 'play') return;
    s.vy = FLAP;
    hooks.onFlap?.();
  }

  function hits(p) {
    const bx = birdX(), r = BIRD_R * 0.85;
    const rects = [[-1, p.gy - cfg.gap / 2], [p.gy + cfg.gap / 2, 2]];
    return rects.some(([y0, y1]) => {
      const cx = Math.max(p.x, Math.min(bx, p.x + PIPE_W));
      const cy = Math.max(y0, Math.min(s.y, y1));
      return (bx - cx) ** 2 + (s.y - cy) ** 2 < r * r;
    });
  }

  function die() {
    s.mode = 'dead';
    hooks.onDie?.(s.score);
  }

  function update(dt) {
    s.t += dt;
    if (s.mode === 'ready') { s.y = 0.45 + Math.sin(s.t * 4) * 0.015; return; }
    if (s.mode === 'dead' || s.mode === 'won') {
      // let the bird tumble to the ground
      if (s.mode === 'dead' && s.y < GROUND - BIRD_R) {
        s.vy += GRAVITY * dt;
        s.y = Math.min(GROUND - BIRD_R, s.y + s.vy * dt);
      }
      return;
    }

    s.vy += GRAVITY * dt;
    s.y += s.vy * dt;
    if (s.y < BIRD_R) { s.y = BIRD_R; s.vy = 0; }

    const dx = cfg.speed * dt;
    s.scroll += dx;
    s.pipes.forEach(p => { p.x -= dx; });
    s.pipes = s.pipes.filter(p => p.x + PIPE_W > -0.1);
    const lastPipe = s.pipes[s.pipes.length - 1];
    if (!lastPipe) spawn(W / H + 0.25);
    else if (lastPipe.x < W / H + 0.05 - SPACING) spawn(lastPipe.x + SPACING);

    const bx = birdX();
    for (const p of s.pipes) {
      if (hits(p)) return die();
      if (!p.passed && p.x + PIPE_W < bx) {
        p.passed = true;
        s.score++;
        hooks.onScore?.(s.score);
        if (s.score >= cfg.target) {
          s.mode = 'won';
          hooks.onWin?.(s.score);
          return;
        }
      }
    }
    if (s.y + BIRD_R >= GROUND) { s.y = GROUND - BIRD_R; die(); }
  }

  function drawPipe(x, y, w, h, isTop) {
    ctx.fillStyle = C.orange;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    const capH = 0.03 * H, capX = x - 0.012 * H, capW = w + 0.024 * H;
    const capY = isTop ? y + h - capH : y;
    ctx.fillRect(capX, capY, capW, capH);
    ctx.strokeRect(capX, capY, capW, capH);
  }

  function drawBird() {
    const x = birdX() * H, y = s.y * H, r = BIRD_R * H;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.max(-0.5, Math.min(1.2, s.vy * 1.5)));
    if (spriteOk) {
      ctx.drawImage(sprite, -r * 1.4, -r * 1.4, r * 2.8, r * 2.8);
    } else {
      // placeholder: little robot head with an antenna
      ctx.lineWidth = 3;
      ctx.fillStyle = C.blue;
      ctx.beginPath(); ctx.roundRect(-r, -r, r * 2, r * 2, r * 0.35); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(0, -r * 1.6); ctx.stroke();
      ctx.fillStyle = C.orange;
      ctx.beginPath(); ctx.arc(0, -r * 1.75, r * 0.25, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.bg; ctx.fillRect(r * 0.1, -r * 0.5, r * 0.6, r * 0.45);
      ctx.fillStyle = C.ink; ctx.fillRect(r * 0.4, -r * 0.4, r * 0.22, r * 0.22);
    }
    ctx.restore();
  }

  function draw() {
    const g = GROUND * H;
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = C.ink;
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;

    for (const p of s.pipes) {
      const x = p.x * H, w = PIPE_W * H;
      const top = (p.gy - cfg.gap / 2) * H, bot = (p.gy + cfg.gap / 2) * H;
      drawPipe(x, -5, w, top + 5, true);
      drawPipe(x, bot, w, g - bot, false);
    }

    // ground, with scribble hatching that scrolls along
    ctx.fillStyle = C.soft;
    ctx.fillRect(0, g, W, H - g);
    ctx.beginPath(); ctx.moveTo(0, g); ctx.lineTo(W, g); ctx.stroke();
    const step = 0.04 * H, off = (s.scroll * H) % step;
    ctx.beginPath();
    for (let x = -off; x < W + step; x += step) { ctx.moveTo(x, g + 6); ctx.lineTo(x - 8, H - 4); }
    ctx.lineWidth = 2;
    ctx.stroke();

    drawBird();

    ctx.fillStyle = C.ink;
    ctx.textAlign = 'center';
    ctx.font = `${0.08 * H}px "JC Scratch", "Gochi Hand", cursive`;
    ctx.fillText(`${s.score} / ${cfg.target}`, W / 2, 0.1 * H);
    if (s.mode === 'ready') {
      ctx.font = `${0.05 * H}px "JC Scratch", "Gochi Hand", cursive`;
      ctx.fillText('tap to flap!', W / 2, 0.65 * H);
    }
  }

  function frame(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    raf = requestAnimationFrame(frame);
  }

  canvas.addEventListener('pointerdown', e => { e.preventDefault(); flap(); });
  window.addEventListener('keydown', e => {
    if (raf && e.code === 'Space') { e.preventDefault(); flap(); }
  });
  window.addEventListener('resize', () => { if (raf) resize(); });

  return {
    start(newCfg) {
      cfg = newCfg;
      resize();
      reset();
      cancelAnimationFrame(raf);
      last = performance.now();
      raf = requestAnimationFrame(frame);
    },
    stop() {
      cancelAnimationFrame(raf);
      raf = 0;
    },
  };
};
