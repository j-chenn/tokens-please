(() => {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const esc = (str) => str.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- state (saved so a refresh mid-drawing doesn't lose tokens) ----------
  const STORE_KEY = 'tokens-please-v1';
  const freshState = () => ({
    pending: null,      // tokens being bought right now
    balance: 0,         // tokens left (while paused)
    running: false,
    endsAt: 0,          // when running: timestamp the balance hits zero
    purchases: [],      // { tokens, method }
    prompts: [],        // drawing request + every revision
    done: false,
    finishedAt: 0,
    orderNo: Math.floor(1000 + Math.random() * 9000),
  });
  let state = load();

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY));
      if (saved && Array.isArray(saved.purchases)) return { ...freshState(), ...saved };
    } catch {}
    return freshState();
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch {}
  }
  const level = () => CONFIG.packages.find(p => p.tokens === state.pending)?.level ?? 1;
  const totalBought = () => state.purchases.reduce((sum, p) => sum + p.tokens, 0);

  // ---------- screens ----------
  const screens = {};
  let current = null;
  function go(name) {
    screens[current]?.leave?.();
    $$('.screen').forEach(s => { s.hidden = s.id !== `screen-${name}`; });
    current = name;
    window.scrollTo(0, 0);
    screens[name]?.enter?.();
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-go]');
    if (b) { sfx.tap(); go(b.dataset.go); }
  });
  $$('[data-close]').forEach(b => { b.onclick = () => { b.closest('.modal').hidden = true; }; });

  // tap once to arm, tap again within 3s to confirm
  function twoTap(btn, fn) {
    const label = btn.textContent;
    let timer = 0;
    const disarm = () => { delete btn.dataset.armed; btn.textContent = label; };
    btn.addEventListener('click', () => {
      if (btn.dataset.armed) { clearTimeout(timer); disarm(); fn(); return; }
      btn.dataset.armed = '1';
      btn.textContent = 'sure? tap again';
      timer = setTimeout(disarm, 3000);
    });
  }

  // ---------- sound ----------
  const Sound = {
    ctx: null,
    unlock() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
      if (this.ctx?.state === 'suspended') this.ctx.resume();
    },
    beep(freq, dur = 0.12, { type = 'square', vol = 0.06, delay = 0 } = {}) {
      const c = this.ctx;
      if (!c) return;
      const t = c.currentTime + delay;
      const osc = c.createOscillator(), gain = c.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(c.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    },
    seq(notes, step = 0.1, opts = {}) {
      notes.forEach((f, i) => { if (f) this.beep(f, step * 0.9, { ...opts, delay: i * step }); });
    },
  };
  document.addEventListener('pointerdown', () => Sound.unlock(), { capture: true });

  const sfx = {
    tap: () => Sound.beep(660, 0.05, { vol: 0.03 }),
    good: () => Sound.seq([523, 784], 0.09),
    bad: () => Sound.seq([220, 165], 0.14, { type: 'sawtooth' }),
    win: () => Sound.seq([523, 659, 784, 1047, 0, 1047], 0.09),
    tick: () => Sound.beep(1200, 0.04, { vol: 0.04 }),
    alarm: () => Sound.seq([880, 0, 880, 0, 880, 0, 440, 330, 220], 0.12, { type: 'sawtooth', vol: 0.08 }),
  };

  // dance music: loops DANCE_SONG (from data.js) with the same square-wave beep as everything else
  const DanceMusic = {
    timer: 0,
    muted: false,
    start() {
      if (this.muted || this.timer || !Sound.ctx) return;
      const { bpm, beats, notes } = DANCE_SONG;
      const beat = 60 / bpm;
      let loopStart = Sound.ctx.currentTime + 0.1, i = 0;
      // schedule notes a little ahead of time so timing stays tight
      this.timer = setInterval(() => {
        const now = Sound.ctx.currentTime;
        while (loopStart + notes[i][0] * beat < now + 0.3) {
          const [start, pitch, len] = notes[i];
          const delay = loopStart + start * beat - now;
          // skip notes we're late for (e.g. after the tab was in the background) instead of blasting them all at once
          if (delay > -0.05) Sound.beep(440 * 2 ** ((pitch - 69) / 12), len * beat * 0.9, { vol: 0.035, delay });
          if (++i === notes.length) { i = 0; loopStart += beats * beat; }
        }
      }, 100);
    },
    stop() {
      clearInterval(this.timer);
      this.timer = 0;
    },
    toggle() {
      this.muted = !this.muted;
      this.muted ? this.stop() : this.start();
      return this.muted;
    },
  };

  // keep the phone awake while the robot draws
  let wakeLock = null;
  async function lockScreen() {
    try { wakeLock = await navigator.wakeLock?.request('screen'); } catch {}
  }
  function unlockScreen() {
    wakeLock?.release?.();
    wakeLock = null;
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && state.running) lockScreen();
  });

  // ---------- asset placeholders: swap in real images by dropping files at data-src ----------
  $$('.asset').forEach(el => {
    el.textContent = el.dataset.label;
    const img = new Image();
    img.alt = '';
    img.onload = () => {
      el.textContent = '';
      el.classList.add('loaded');
      el.appendChild(img);
    };
    img.src = el.dataset.src;
  });

  // ---------- confetti ----------
  function confetti() {
    const c = $('#confetti'), ctx = c.getContext('2d'), dpr = window.devicePixelRatio || 1;
    const W = innerWidth, H = innerHeight;
    c.width = W * dpr;
    c.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const colors = ['#F27A1A', '#2F7FD8', '#3B2618', '#F9C79A', '#A9CDF5'];
    const parts = Array.from({ length: 150 }, () => ({
      x: W * (0.2 + Math.random() * 0.6),
      y: H + 10,
      vx: (Math.random() - 0.5) * W * 1.2,
      vy: -H * (0.9 + Math.random() * 0.7),
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 12,
      w: 6 + Math.random() * 8,
      h: 4 + Math.random() * 6,
      color: pick(colors),
    }));
    const t0 = performance.now();
    let last = t0;
    (function frame(now) {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) {
        p.vy += H * 1.4 * dt;
        p.vx *= 0.99;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.r += p.vr * dt;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (now - t0 < 3500) requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, W, H);
    })(t0);
  }

  // ---------- 1. home: pick a package ----------
  screens.home = {
    enter() {
      const list = $('#package-list');
      list.innerHTML = '';
      for (const p of CONFIG.packages) {
        const b = document.createElement('button');
        b.className = 'choice';
        b.innerHTML = `<span class="tag">level ${p.level}</span>
          <span class="choice-big">${p.tokens}</span>
          <span class="choice-sub">tokens · ${p.blurb}</span>`;
        b.onclick = () => { state.pending = p.tokens; save(); sfx.tap(); go('pay'); };
        list.appendChild(b);
      }
      const midSession = state.purchases.length > 0;
      $('#home-banner').hidden = !midSession;
      $('#btn-home-receipt').hidden = !midSession;
    },
  };
  twoTap($('#btn-home-receipt'), finish);

  // ---------- 2. pay ----------
  screens.pay = {
    enter() {
      if (!state.pending) return go('home');
      $('#pay-chip').textContent = `${state.pending} tokens · lvl ${level()}`;
    },
  };
  $$('[data-method]').forEach(b => { b.onclick = () => { sfx.tap(); go(b.dataset.method); }; });
  $('#btn-real-monies').onclick = () => {
    Sound.seq([200, 150], 0.2, { type: 'sawtooth' });
    navigator.vibrate?.(200);
    $('#modal-monies').hidden = false;
  };

  const METHOD_NAMES = { dance: 'interpretive dancing', trivia: 'trivia', flappy: 'pro gamer moment' };
  function award(method) {
    if (!state.pending) return go('home');
    state.purchases.push({ tokens: state.pending, method: METHOD_NAMES[method] });
    state.balance += state.pending;
    state.pending = null;
    save();
    go('success');
  }

  // ---------- 3a. interpretive dance ----------
  screens.dance = {
    enter() {
      newDancePrompt();
      resetHold();
      $('#dance-verdict-msg').hidden = true;
      $('#btn-mute').textContent = DanceMusic.muted ? '🔇' : '🔊';
      DanceMusic.start();
    },
    leave() {
      DanceMusic.stop();
      cancelHold();
    },
  };
  function newDancePrompt() {
    const el = $('#dance-prompt'), pool = DANCE[level()];
    let next;
    do { next = pick(pool); } while (pool.length > 1 && next === el.textContent);
    el.textContent = next;
  }
  $('#btn-dance-reroll').onclick = () => { sfx.tap(); newDancePrompt(); };
  $('#btn-mute').onclick = () => { $('#btn-mute').textContent = DanceMusic.toggle() ? '🔇' : '🔊'; };

  const holdBtn = $('#btn-hold');
  let holdStart = 0, holdRaf = 0, holdBeeps = 0;
  function resetHold() {
    cancelHold();
    $('#dance-hold-wrap').hidden = false;
    $('#dance-verdict').hidden = true;
  }
  function cancelHold() {
    cancelAnimationFrame(holdRaf);
    holdRaf = 0;
    holdBtn.style.setProperty('--p', 0);
    holdBtn.classList.remove('holding');
    $('#hold-label').textContent = 'ROBOT ONLY: hold to evaluate';
  }
  function holdFrame() {
    const p = Math.min(1, (performance.now() - holdStart) / CONFIG.holdMs);
    holdBtn.style.setProperty('--p', p);
    const beeps = Math.floor(p * 6);
    if (beeps > holdBeeps) { holdBeeps = beeps; Sound.beep(300 + beeps * 80, 0.06, { vol: 0.04 }); }
    if (p < 1) { holdRaf = requestAnimationFrame(holdFrame); return; }
    holdRaf = 0;
    holdBtn.classList.remove('holding');
    $('#dance-hold-wrap').hidden = true;
    $('#dance-verdict').hidden = false;
    $('#dance-verdict-msg').hidden = true;
  }
  holdBtn.addEventListener('pointerdown', e => {
    e.preventDefault();
    holdStart = performance.now();
    holdBeeps = 0;
    holdBtn.classList.add('holding');
    $('#hold-label').textContent = 'EVALUATING… BEEP BOOP';
    holdRaf = requestAnimationFrame(holdFrame);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => {
    holdBtn.addEventListener(ev, () => { if (holdRaf) cancelHold(); });
  });
  holdBtn.addEventListener('contextmenu', e => e.preventDefault());

  $('#btn-approve').onclick = () => award('dance');
  $('#btn-disapprove').onclick = () => {
    sfx.bad();
    navigator.vibrate?.(200);
    const msg = $('#dance-verdict-msg');
    msg.textContent = pick(DANCE_REJECTIONS);
    msg.hidden = false;
    resetHold();
  };

  // ---------- 3b. trivia ----------
  let round = null;
  screens.trivia = { enter: newTriviaRound };
  function newTriviaRound() {
    const lvl = level();
    round = { qs: shuffle(TRIVIA[lvl]).slice(0, 3), i: 0, score: 0, need: lvl };
    $('#trivia-chip').textContent = `level ${lvl}`;
    $('#trivia-q-wrap').hidden = false;
    $('#trivia-result').hidden = true;
    renderQuestion();
  }
  function renderQuestion() {
    const q = round.qs[round.i];
    $('#trivia-progress').textContent = `question ${round.i + 1} of 3`;
    $('#trivia-q').textContent = q.q;
    const box = $('#trivia-answers');
    box.innerHTML = '';
    for (const ans of shuffle([q.a, ...q.wrong])) {
      const b = document.createElement('button');
      b.className = 'choice answer';
      b.textContent = ans;
      b.onclick = () => answer(b, ans === q.a);
      box.appendChild(b);
    }
  }
  function answer(btn, correct) {
    const r = round, q = r.qs[r.i];
    for (const b of $('#trivia-answers').children) {
      b.disabled = true;
      if (b.textContent === q.a) b.classList.add('correct');
    }
    if (correct) { r.score++; sfx.good(); } else { btn.classList.add('wrong'); sfx.bad(); }
    setTimeout(() => {
      if (r !== round) return; // left the screen and started a new round
      r.i++;
      r.i < r.qs.length ? renderQuestion() : triviaResult();
    }, 1100);
  }
  function triviaResult() {
    const pass = round.score >= round.need;
    $('#trivia-q-wrap').hidden = true;
    $('#trivia-result').hidden = false;
    $('#trivia-score').textContent = `${round.score} / 3`;
    $('#trivia-msg').textContent = pass
      ? pick(TRIVIA_PASS)
      : 'not enough. the robot is disappointed but believes in you.';
    $('#btn-trivia-collect').hidden = !pass;
    $('#btn-trivia-retry').hidden = pass;
    pass ? sfx.win() : sfx.bad();
  }
  $('#btn-trivia-collect').onclick = () => award('trivia');
  $('#btn-trivia-retry').onclick = () => { sfx.tap(); newTriviaRound(); };

  // ---------- 3c. pro gamer moment ----------
  let game = null;
  screens.flappy = {
    enter() {
      $('#flappy-chip').textContent = `score ${CONFIG.flappy[level()].target} to pay`;
      game ??= Flappy($('#flappy-canvas'), {
        onFlap: () => Sound.beep(520, 0.05, { vol: 0.03 }),
        onScore: () => Sound.beep(988, 0.06, { vol: 0.04 }),
        onDie: (score) => flappyOver(false, score),
        onWin: (score) => flappyOver(true, score),
      });
      startFlappy();
    },
    leave() { game?.stop(); },
  };
  function startFlappy() {
    $('#flappy-over').hidden = true;
    game.start(CONFIG.flappy[level()]);
  }
  function flappyOver(won, score) {
    const target = CONFIG.flappy[level()].target;
    $('#flappy-over-title').textContent = won ? 'PRO GAMER MOMENT' : 'crashed.';
    $('#flappy-over-msg').textContent = won
      ? `${score} points. absolutely cracked.`
      : `${score} / ${target}. skill issue. try again?`;
    $('#btn-flappy-retry').hidden = won;
    $('#btn-flappy-collect').hidden = !won;
    won ? sfx.win() : sfx.bad();
    navigator.vibrate?.(won ? 80 : 200);
    setTimeout(() => { $('#flappy-over').hidden = false; }, won ? 300 : 600);
  }
  $('#btn-flappy-retry').onclick = () => { sfx.tap(); startFlappy(); };
  $('#btn-flappy-collect').onclick = () => award('flappy');

  // ---------- 4. payment accepted ----------
  screens.success = {
    enter() {
      const p = state.purchases[state.purchases.length - 1];
      $('#success-amount').textContent = `+${p.tokens} tokens`;
      $('#success-method').textContent = `paid via ${p.method}. no monies were harmed.`;
      $('#btn-success-go').textContent = state.prompts.length ? 'back to the robot →' : 'tell the robot what to draw →';
      sfx.win();
      navigator.vibrate?.(80);
      confetti();
    },
  };
  $('#btn-success-go').onclick = () => go('draw');

  // ---------- 5. drawing session ----------
  let tickTimer = 0, lastShown = -1, editing = false;
  screens.draw = {
    enter() {
      editing = state.prompts.length === 0;
      renderDraw();
      if (state.running) startTicking();
    },
    leave() { stopTicking(); },
  };
  function remaining() {
    return state.running ? Math.max(0, Math.ceil((state.endsAt - Date.now()) / 1000)) : state.balance;
  }
  function renderDraw() {
    const left = remaining();
    const hasPrompt = state.prompts.length > 0;
    const started = totalBought() > left;

    $('#prompt-view').hidden = editing || !hasPrompt;
    $('#prompt-edit').hidden = !editing;
    $('#prompt-text').textContent = state.prompts[state.prompts.length - 1] ?? '';
    $('#btn-edit-prompt').hidden = state.running;

    $('#token-count').textContent = left;
    $('.counter').classList.toggle('low', state.running && left <= 10);
    $('#draw-status').textContent =
      state.running ? 'ROBOT STATUS: drawing… do not disturb' :
      left === 0 ? 'ROBOT STATUS: out of juice' :
      !hasPrompt ? 'ROBOT STATUS: awaiting instructions' :
      started ? 'ROBOT STATUS: paused' : 'ROBOT STATUS: ready when you are';

    $('#btn-start').hidden = state.running || left === 0;
    $('#btn-start').disabled = !hasPrompt || editing;
    $('#btn-start').textContent = started ? 'RESUME ▶' : 'START ▶';
    $('#btn-pause').hidden = !state.running;
    $('#btn-buy-more').hidden = state.running || left > 0;
    $('#btn-done').hidden = state.running;
  }
  function startTicking() {
    stopTicking();
    lastShown = remaining();
    tickTimer = setInterval(tick, 200);
    tick();
  }
  function stopTicking() {
    clearInterval(tickTimer);
    tickTimer = 0;
  }
  function tick() {
    const left = remaining();
    if (left !== lastShown) {
      lastShown = left;
      if (left > 0 && left <= 10) sfx.tick();
    }
    if (left <= 0) {
      state.running = false;
      state.balance = 0;
      save();
      stopTicking();
      unlockScreen();
      renderDraw();
      outOfTokens();
      return;
    }
    renderDraw();
  }
  function pauseTimer() {
    state.balance = remaining();
    state.running = false;
    save();
    stopTicking();
    unlockScreen();
    renderDraw();
  }
  function outOfTokens() {
    sfx.alarm();
    navigator.vibrate?.([300, 100, 300, 100, 600]);
    $('#overlay-out').hidden = false;
  }

  $('#btn-start').onclick = () => {
    if (!state.prompts.length || state.balance <= 0) return;
    state.running = true;
    state.endsAt = Date.now() + state.balance * 1000;
    save();
    Sound.seq([440, 660, 880], 0.08);
    lockScreen();
    startTicking();
  };
  $('#btn-pause').onclick = () => {
    Sound.seq([660, 440], 0.08);
    pauseTimer();
  };
  $('#btn-edit-prompt').onclick = () => {
    editing = true;
    $('#prompt-input').value = state.prompts[state.prompts.length - 1] ?? '';
    renderDraw();
    $('#prompt-input').focus();
  };
  $('#btn-lock-prompt').onclick = () => {
    const input = $('#prompt-input'), text = input.value.trim();
    if (!text) {
      input.classList.remove('nope');
      void input.offsetWidth; // restart the shake animation
      input.classList.add('nope');
      return;
    }
    if (text !== state.prompts[state.prompts.length - 1]) state.prompts.push(text);
    editing = false;
    save();
    sfx.good();
    renderDraw();
  };
  $('#btn-buy-more').onclick = () => go('home');
  $('#btn-out-buy').onclick = () => { $('#overlay-out').hidden = true; go('home'); };
  $('#btn-out-done').onclick = () => { $('#overlay-out').hidden = true; finish(); };
  twoTap($('#btn-done'), finish);

  // ---------- 6. receipt ----------
  function finish() {
    if (state.running) pauseTimer();
    state.done = true;
    state.finishedAt = Date.now();
    save();
    go('receipt');
  }
  screens.receipt = { enter: renderReceipt };
  function renderReceipt() {
    const bought = totalBought(), left = state.balance, used = bought - left;
    const when = new Date(state.finishedAt || Date.now());
    const line = (a, b, cls = '') => `<div class="r-line ${cls}"><span>${a}</span><span class="dots"></span><span>${b}</span></div>`;
    const mmss = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

    const prompts = state.prompts.length
      ? state.prompts.map((p, i) => `<p class="r-prompt">${i ? `<em>rev. ${i}:</em> ` : ''}“${esc(p)}”</p>`).join('')
      : '<p class="r-prompt">(nothing. the robot freestyled.)</p>';
    const purchases = state.purchases.length
      ? state.purchases.map(p => line(`${p.tokens} tokens`, p.method)).join('')
      : '<p>(none)</p>';

    $('#receipt').innerHTML = `
      <p class="r-title">TOKENS PLEASE</p>
      <p class="r-sub">robot art services · est. tonight</p>
      <p class="r-meta">order #${state.orderNo}<br>${when.toLocaleDateString()} · ${when.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
      <hr>
      <p class="r-section">COMMISSION</p>
      ${prompts}
      <hr>
      <p class="r-section">PURCHASES</p>
      ${purchases}
      <hr>
      ${line('tokens purchased', bought)}
      ${line('tokens consumed', used)}
      ${line('robot labour', mmss(used))}
      ${line('tokens left over', `${left} (forfeited)`)}
      ${line('TOTAL MONIES', '0.00', 'total')}
      <p class="r-stamp">PAID IN DIGNITY</p>
      <div class="barcode"></div>
      <p class="fineprint">no refunds. leftover tokens are forfeited to the robot.
        the robot is not responsible for art quality, likeness, or emotional damage.
        thank you for not paying.</p>`;
  }
  twoTap($('#btn-new-customer'), () => {
    state = freshState();
    save();
    go('home');
  });

  // ---------- boot ----------
  if (state.done) go('receipt');
  else if (state.purchases.length) go('draw');
  else go('home');
})();
