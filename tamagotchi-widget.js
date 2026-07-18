/*!
 * Embeddable Tamagotchi Widget
 * Drop this on any page with:
 *   <script src="tamagotchi-widget.js" defer></script>
 * Everything (styles, DOM, sounds, art) is self-generated — no external
 * assets, no dependencies. State is saved per-browser in localStorage.
 */
(function () {
  if (window.__tamagotchiWidgetLoaded) return;
  window.__tamagotchiWidgetLoaded = true;

  var STORAGE_KEY = 'tamagotchiWidgetState_v1';
  var DAY_MS = 24 * 60 * 60 * 1000;
  var HOUR_MS = 60 * 60 * 1000;

  // ---------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------

  function todayStr(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  function randPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  function randomSpecies() {
    var hue = randInt(0, 359);
    var spots = [];
    var pattern = randPick(['none', 'spots', 'stripes']);
    if (pattern === 'spots') {
      var n = randInt(3, 6);
      for (var i = 0; i < n; i++) {
        spots.push({
          x: randInt(15, 85),
          y: randInt(20, 80),
          size: randInt(6, 14)
        });
      }
    }
    return {
      hue: hue,
      sat: randInt(60, 85),
      light: randInt(55, 72),
      shape: randPick(['round', 'chubby', 'tall']),
      accessory: randPick(['none', 'none', 'horn', 'antennae', 'ears']),
      pattern: pattern,
      spots: spots,
      eyeStyle: randPick(['dot', 'sparkle', 'sleepy']),
      eggHue: (hue + randInt(-20, 20) + 360) % 360
    };
  }

  function freshState() {
    return {
      hatched: false,
      opened: false, // gift box opened -> egg shown
      name: 'Buddy',
      species: randomSpecies(),
      hunger: 80,
      clean: 80,
      happiness: 80,
      poops: [],
      born: Date.now(),
      lastSeen: Date.now(),
      streak: 0,
      lastStreakDay: null,
      minimized: true
    };
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return freshState();
      var s = JSON.parse(raw);
      return Object.assign(freshState(), s);
    } catch (e) {
      return freshState();
    }
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  var state = loadState();

  // ---------------------------------------------------------------------
  // Streak + offline decay, computed once on load
  // ---------------------------------------------------------------------

  (function applyOfflineDecay() {
    var now = Date.now();
    var elapsedHours = (now - (state.lastSeen || now)) / HOUR_MS;
    if (state.hatched && elapsedHours > 0) {
      state.hunger = clamp(state.hunger - elapsedHours * 4);
      state.clean = clamp(state.clean - elapsedHours * 3);
      var poopsToAdd = Math.min(5 - state.poops.length, Math.floor(elapsedHours / 4));
      for (var i = 0; i < poopsToAdd; i++) state.poops.push(randPoopSpot());
      state.happiness = clamp((state.hunger + state.clean) / 2 - (state.poops.length * 4));
    }

    var today = todayStr();
    var yesterday = todayStr(new Date(now - DAY_MS));
    if (state.hatched) {
      if (state.lastStreakDay === today) {
        // already counted today
      } else if (state.lastStreakDay === yesterday) {
        state.streak = (state.streak || 0) + 1;
        state.lastStreakDay = today;
      } else {
        state.streak = 1;
        state.lastStreakDay = today;
      }
    }
    state.lastSeen = now;
    saveState();
  })();

  function clamp(v) { return Math.max(0, Math.min(100, v)); }
  function randPoopSpot() { return { x: randInt(10, 85), y: randInt(70, 88), id: Math.random().toString(36).slice(2) }; }

  // ---------------------------------------------------------------------
  // Shadow-DOM host
  // ---------------------------------------------------------------------

  var host = document.createElement('div');
  host.id = 'tamagotchi-widget-host';
  host.style.all = 'initial';
  host.style.position = 'fixed';
  host.style.zIndex = '2147483647';
  document.documentElement.appendChild(host);
  var root = host.attachShadow({ mode: 'open' });

  var style = document.createElement('style');
  style.textContent = CSS();
  root.appendChild(style);

  var wrap = document.createElement('div');
  wrap.className = 'tg-wrap';
  root.appendChild(wrap);

  wrap.innerHTML =
    '<div class="tg-bubble" title="Your pet">' +
      '<div class="tg-bubble-inner"></div>' +
      '<div class="tg-notify" hidden></div>' +
    '</div>' +
    '<div class="tg-panel" hidden>' +
      '<div class="tg-header">' +
        '<span class="tg-name" contenteditable="false" spellcheck="false"></span>' +
        '<span class="tg-streak" title="Daily streak"></span>' +
        '<button class="tg-min" title="Minimize">–</button>' +
      '</div>' +
      '<div class="tg-stage">' +
        '<div class="tg-particles"></div>' +
        '<div class="tg-gift">🎁</div>' +
        '<div class="tg-egg"><div class="tg-egg-shape"></div></div>' +
        '<div class="tg-creature">' +
          '<div class="tg-acc-l"></div><div class="tg-acc-r"></div>' +
          '<div class="tg-body">' +
            '<div class="tg-face">' +
              '<div class="tg-eye tg-eye-l"></div>' +
              '<div class="tg-eye tg-eye-r"></div>' +
              '<div class="tg-mouth"></div>' +
              '<div class="tg-cheeks"></div>' +
            '</div>' +
            '<div class="tg-spots"></div>' +
          '</div>' +
        '</div>' +
        '<div class="tg-poops"></div>' +
        '<div class="tg-toast"></div>' +
      '</div>' +
      '<div class="tg-bars">' +
        '<div class="tg-bar-row"><span>🍎</span><div class="tg-bar"><i class="tg-bar-hunger"></i></div></div>' +
        '<div class="tg-bar-row"><span>🧼</span><div class="tg-bar"><i class="tg-bar-clean"></i></div></div>' +
        '<div class="tg-bar-row"><span>💛</span><div class="tg-bar"><i class="tg-bar-happy"></i></div></div>' +
      '</div>' +
      '<div class="tg-actions">' +
        '<button data-act="feed">🍎 Feed</button>' +
        '<button data-act="clean">🧼 Clean</button>' +
        '<button data-act="pet">✋ Pet</button>' +
      '</div>' +
    '</div>';

  var el = {
    bubble: wrap.querySelector('.tg-bubble'),
    bubbleInner: wrap.querySelector('.tg-bubble-inner'),
    notify: wrap.querySelector('.tg-notify'),
    panel: wrap.querySelector('.tg-panel'),
    header: wrap.querySelector('.tg-header'),
    name: wrap.querySelector('.tg-name'),
    streak: wrap.querySelector('.tg-streak'),
    minBtn: wrap.querySelector('.tg-min'),
    stage: wrap.querySelector('.tg-stage'),
    particles: wrap.querySelector('.tg-particles'),
    gift: wrap.querySelector('.tg-gift'),
    egg: wrap.querySelector('.tg-egg'),
    eggShape: wrap.querySelector('.tg-egg-shape'),
    creature: wrap.querySelector('.tg-creature'),
    body: wrap.querySelector('.tg-body'),
    spotsWrap: wrap.querySelector('.tg-spots'),
    accL: wrap.querySelector('.tg-acc-l'),
    accR: wrap.querySelector('.tg-acc-r'),
    poopsWrap: wrap.querySelector('.tg-poops'),
    toast: wrap.querySelector('.tg-toast'),
    barHunger: wrap.querySelector('.tg-bar-hunger'),
    barClean: wrap.querySelector('.tg-bar-clean'),
    barHappy: wrap.querySelector('.tg-bar-happy'),
    actions: wrap.querySelector('.tg-actions')
  };

  // ---------------------------------------------------------------------
  // Sound (WebAudio, synthesized — no audio files)
  // ---------------------------------------------------------------------

  var actx = null;
  function ctx() {
    if (!actx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) actx = new AC();
    }
    if (actx && actx.state === 'suspended') actx.resume();
    return actx;
  }

  function tone(freq, start, dur, type, vol) {
    var c = ctx();
    if (!c) return;
    var osc = c.createOscillator();
    var gain = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, c.currentTime + start);
    gain.gain.linearRampToValueAtTime(vol || 0.15, c.currentTime + start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(c.currentTime + start);
    osc.stop(c.currentTime + start + dur + 0.05);
  }

  function noiseBurst(start, dur, vol) {
    var c = ctx();
    if (!c) return;
    var bufferSize = c.sampleRate * dur;
    var buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    var src = c.createBufferSource();
    src.buffer = buffer;
    var gain = c.createGain();
    gain.gain.value = vol || 0.1;
    var filter = c.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 800;
    src.connect(filter).connect(gain).connect(c.destination);
    src.start(c.currentTime + start);
  }

  var sfx = {
    feed: function () { tone(440, 0, 0.12, 'triangle'); tone(660, 0.1, 0.15, 'triangle'); },
    clean: function () { noiseBurst(0, 0.35, 0.08); },
    pet: function () { tone(523, 0, 0.1, 'sine'); tone(659, 0.08, 0.14, 'sine'); },
    hatch: function () {
      tone(392, 0, 0.12, 'square', 0.1);
      tone(523, 0.12, 0.12, 'square', 0.1);
      tone(659, 0.24, 0.12, 'square', 0.1);
      tone(784, 0.36, 0.3, 'square', 0.12);
    },
    open: function () { noiseBurst(0, 0.2, 0.06); tone(300, 0, 0.15, 'sine'); },
    poke: function () { tone(300, 0, 0.08, 'sine', 0.1); },
    sad: function () { tone(220, 0, 0.3, 'sine', 0.08); }
  };

  // ---------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------

  function applySpeciesVars(target, sp) {
    target.style.setProperty('--hue', sp.hue);
    target.style.setProperty('--sat', sp.sat + '%');
    target.style.setProperty('--light', sp.light + '%');
  }

  function renderCreature() {
    var sp = state.species;
    applySpeciesVars(el.body, sp);
    el.body.className = 'tg-body tg-shape-' + sp.shape;
    el.creature.className = 'tg-creature tg-eye-style-' + sp.eyeStyle;
    el.accL.className = 'tg-acc-l tg-acc-' + sp.accessory;
    el.accR.className = 'tg-acc-r tg-acc-' + sp.accessory;

    el.spotsWrap.innerHTML = '';
    if (sp.pattern === 'spots') {
      sp.spots.forEach(function (s) {
        var d = document.createElement('div');
        d.className = 'tg-spot';
        d.style.left = s.x + '%';
        d.style.top = s.y + '%';
        d.style.width = s.size + 'px';
        d.style.height = s.size + 'px';
        el.spotsWrap.appendChild(d);
      });
    } else if (sp.pattern === 'stripes') {
      el.body.classList.add('tg-pattern-stripes');
    }
  }

  function renderEgg() {
    applySpeciesVars(el.eggShape, { hue: state.species.eggHue, sat: state.species.sat, light: state.species.light });
  }

  function renderPoops() {
    el.poopsWrap.innerHTML = '';
    state.poops.forEach(function (p) {
      var d = document.createElement('div');
      d.className = 'tg-poop';
      d.textContent = '💩';
      d.style.left = p.x + '%';
      d.style.top = p.y + '%';
      d.title = 'Clean me!';
      d.addEventListener('click', function (e) {
        e.stopPropagation();
        state.poops = state.poops.filter(function (x) { return x.id !== p.id; });
        recalcHappiness();
        renderPoops();
        renderBars();
        saveState();
      });
      el.poopsWrap.appendChild(d);
    });
  }

  function moodClass() {
    var avg = (state.hunger + state.clean + state.happiness) / 3;
    if (state.poops.length >= 4 || avg < 20) return 'sick';
    if (avg < 40) return 'sad';
    if (avg < 65) return 'neutral';
    if (avg < 85) return 'happy';
    return 'ecstatic';
  }

  function renderMood() {
    el.creature.setAttribute('data-mood', moodClass());
  }

  function renderBars() {
    el.barHunger.style.width = state.hunger + '%';
    el.barClean.style.width = state.clean + '%';
    el.barHappy.style.width = state.happiness + '%';
  }

  function renderStreak() {
    el.streak.textContent = state.streak > 0 ? '🔥 ' + state.streak : '';
  }

  function renderName() {
    el.name.textContent = state.name;
  }

  function renderStageMode() {
    el.gift.hidden = !(!state.opened);
    el.egg.hidden = !(state.opened && !state.hatched);
    el.creature.style.display = state.hatched ? '' : 'none';
    el.poopsWrap.style.display = state.hatched ? '' : 'none';
    el.actions.style.display = state.hatched ? '' : 'none';
    wrap.querySelector('.tg-bars').style.display = state.hatched ? '' : 'none';
  }

  function renderBubbleFace() {
    el.bubbleInner.textContent = !state.opened ? '🎁' : (!state.hatched ? '🥚' : creatureEmojiHint());
    el.notify.hidden = !(state.hatched && (state.poops.length > 0 || state.hunger < 30 || state.clean < 30));
  }

  function creatureEmojiHint() {
    var m = moodClass();
    return m === 'sick' ? '🤒' : m === 'sad' ? '😢' : m === 'ecstatic' ? '🤩' : '🐣';
  }

  function renderAll() {
    renderCreature();
    renderEgg();
    renderPoops();
    renderMood();
    renderBars();
    renderStreak();
    renderName();
    renderStageMode();
    renderBubbleFace();
  }

  function recalcHappiness() {
    state.happiness = clamp((state.hunger + state.clean) / 2 - state.poops.length * 4);
  }

  // ---------------------------------------------------------------------
  // Particles / toast
  // ---------------------------------------------------------------------

  function burstParticles(chars, count) {
    for (var i = 0; i < count; i++) {
      (function () {
        var p = document.createElement('div');
        p.className = 'tg-particle';
        p.textContent = randPick(chars);
        p.style.left = (40 + Math.random() * 20) + '%';
        p.style.setProperty('--dx', (Math.random() * 60 - 30) + 'px');
        p.style.setProperty('--dur', (0.6 + Math.random() * 0.5) + 's');
        el.particles.appendChild(p);
        setTimeout(function () { p.remove(); }, 1200);
      })();
    }
  }

  var toastTimer = null;
  function showToast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.toast.classList.remove('show'); }, 2200);
  }

  // ---------------------------------------------------------------------
  // Interactions
  // ---------------------------------------------------------------------

  el.bubble.addEventListener('click', function () {
    state.minimized = false;
    saveState();
    updatePanelVisibility();
  });

  el.minBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    state.minimized = true;
    saveState();
    updatePanelVisibility();
  });

  function updatePanelVisibility() {
    el.panel.hidden = state.minimized;
    el.bubble.hidden = !state.minimized;
  }

  el.gift.addEventListener('click', function () {
    if (state.opened) return;
    state.opened = true;
    saveState();
    sfx.open();
    el.gift.classList.add('tg-pop');
    setTimeout(function () {
      renderStageMode();
      renderBubbleFace();
      el.egg.classList.add('tg-wobble');
      setTimeout(hatchEgg, 1600);
    }, 350);
  });

  function hatchEgg() {
    if (state.hatched) return;
    state.hatched = true;
    state.lastStreakDay = todayStr();
    state.streak = state.streak || 1;
    saveState();
    sfx.hatch();
    burstParticles(['✨', '🎉', '⭐'], 14);
    renderAll();
    showToast(state.name + ' hatched! Say hi 👋');
  }

  el.actions.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-act]');
    if (!btn) return;
    var act = btn.getAttribute('data-act');
    if (act === 'feed') {
      state.hunger = clamp(state.hunger + 28);
      recalcHappiness();
      sfx.feed();
      burstParticles(['🍎', '😋'], 6);
      showToast(state.name + ' munches happily!');
    } else if (act === 'clean') {
      state.poops = [];
      state.clean = clamp(state.clean + 40);
      recalcHappiness();
      sfx.clean();
      burstParticles(['✨', '💧'], 6);
      showToast('Sparkling clean!');
    } else if (act === 'pet') {
      state.happiness = clamp(state.happiness + 15);
      sfx.pet();
      burstParticles(['💖', '💕'], 6);
      el.creature.classList.add('tg-bounce');
      setTimeout(function () { el.creature.classList.remove('tg-bounce'); }, 400);
      showToast(state.name + ' loves that!');
    }
    saveState();
    renderBars();
    renderMood();
    renderBubbleFace();
  });

  el.creature.addEventListener('click', function () {
    if (!state.hatched) return;
    sfx.poke();
    el.creature.classList.add('tg-bounce');
    setTimeout(function () { el.creature.classList.remove('tg-bounce'); }, 400);
  });

  el.name.addEventListener('click', function (e) {
    e.stopPropagation();
    if (!state.hatched) return;
    el.name.setAttribute('contenteditable', 'true');
    el.name.focus();
    document.execCommand && document.execCommand('selectAll', false, null);
  });
  el.name.addEventListener('blur', function () {
    el.name.setAttribute('contenteditable', 'false');
    var v = el.name.textContent.trim().slice(0, 16) || 'Buddy';
    state.name = v;
    el.name.textContent = v;
    saveState();
  });
  el.name.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); el.name.blur(); }
  });

  // ---------------------------------------------------------------------
  // Fixed positioning — always docked to the bottom-right corner
  // ---------------------------------------------------------------------

  function applyPosition() {
    wrap.style.right = '24px';
    wrap.style.bottom = '24px';
    wrap.style.left = 'auto';
    wrap.style.top = 'auto';
  }

  // ---------------------------------------------------------------------
  // Live decay loop while page is open + "missed you" hook
  // ---------------------------------------------------------------------

  var lastNeglectToast = 0;
  setInterval(function () {
    if (!state.hatched) return;
    state.hunger = clamp(state.hunger - 0.6);
    state.clean = clamp(state.clean - 0.4);
    if (state.poops.length < 5 && Math.random() < 0.06) state.poops.push(randPoopSpot());
    recalcHappiness();
    renderBars();
    renderMood();
    renderPoops();
    renderBubbleFace();
    saveState();

    var now = Date.now();
    if ((state.hunger < 25 || state.clean < 25) && now - lastNeglectToast > 60000) {
      lastNeglectToast = now;
      sfx.sad();
      if (!state.minimized) showToast(state.name + ' needs some attention...');
      else {
        el.notify.hidden = false;
        el.bubble.classList.add('tg-shake');
        setTimeout(function () { el.bubble.classList.remove('tg-shake'); }, 500);
      }
    }
  }, 15000);

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && state.hatched) {
      var elapsedMin = (Date.now() - state.lastSeen) / 60000;
      state.lastSeen = Date.now();
      if (elapsedMin > 20 && (state.hunger < 60 || state.clean < 60)) {
        showToast(state.name + ' missed you! 🥺');
      }
      saveState();
    }
  });

  // ---------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------

  applyPosition();
  updatePanelVisibility();
  renderAll();
  if (state.opened && !state.hatched) el.egg.classList.add('tg-wobble');

  function CSS() {
    return (
      ':host, .tg-wrap, .tg-wrap * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }\n' +
      '.tg-wrap { position: fixed; z-index: 2147483647; user-select: none; }\n' +
      '.tg-bubble { width: 64px; height: 64px; border-radius: 50%; background: radial-gradient(circle at 30% 30%, #fff, #ffe9d6); box-shadow: 0 6px 18px rgba(0,0,0,.25); display: flex; align-items: center; justify-content: center; font-size: 30px; cursor: pointer; position: relative; animation: tg-float 3s ease-in-out infinite; }\n' +
      '.tg-bubble.tg-shake { animation: tg-shakekf .5s; }\n' +
      '@keyframes tg-float { 0%,100%{ transform: translateY(0);} 50%{ transform: translateY(-6px);} }\n' +
      '@keyframes tg-shakekf { 0%,100%{transform:translateX(0);} 20%{transform:translateX(-4px);} 40%{transform:translateX(4px);} 60%{transform:translateX(-4px);} 80%{transform:translateX(4px);} }\n' +
      '.tg-notify { position: absolute; top: -2px; right: -2px; width: 14px; height: 14px; border-radius: 50%; background: #ff4757; box-shadow: 0 0 0 2px #fff; }\n' +
      '.tg-panel { width: 260px; background: #fff; border-radius: 18px; box-shadow: 0 10px 30px rgba(0,0,0,.25); overflow: hidden; }\n' +
      '.tg-header { display: flex; align-items: center; gap: 6px; padding: 8px 10px; background: linear-gradient(135deg,#ffd6a5,#ffb4a2); }\n' +
      '.tg-name { flex: 1; font-weight: 700; font-size: 14px; color: #4a2c2a; outline: none; padding: 2px 4px; border-radius: 6px; cursor: text; }\n' +
      '.tg-name[contenteditable="true"] { background: rgba(255,255,255,.6); }\n' +
      '.tg-streak { font-size: 12px; font-weight: 700; color: #7a4a2a; }\n' +
      '.tg-min { border: none; background: rgba(255,255,255,.5); width: 22px; height: 22px; border-radius: 50%; font-size: 16px; line-height: 1; cursor: pointer; color: #4a2c2a; }\n' +
      '.tg-stage { position: relative; height: 150px; background: linear-gradient(#dff6ff,#f6fffb); display: flex; align-items: center; justify-content: center; overflow: hidden; }\n' +
      '.tg-gift, .tg-egg { font-size: 54px; cursor: pointer; transition: transform .2s; }\n' +
      '.tg-gift:hover { transform: scale(1.08); }\n' +
      '.tg-gift.tg-pop { transform: scale(1.4); opacity: 0; transition: all .35s; }\n' +
      '.tg-egg[hidden], .tg-gift[hidden], .tg-creature[hidden] { display: none !important; }\n' +
      '.tg-egg-shape { width: 46px; height: 60px; border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%; background: linear-gradient(160deg, hsl(var(--hue) var(--sat) calc(var(--light) + 15%)), hsl(var(--hue) var(--sat) var(--light))); box-shadow: inset -6px -6px 10px rgba(0,0,0,.15), 0 6px 10px rgba(0,0,0,.15); }\n' +
      '.tg-egg.tg-wobble { animation: tg-wobblekf 1.6s ease-in-out; }\n' +
      '@keyframes tg-wobblekf { 0%,100%{transform:rotate(0);} 10%{transform:rotate(-8deg);} 20%{transform:rotate(8deg);} 30%{transform:rotate(-10deg);} 40%{transform:rotate(10deg);} 50%{transform:rotate(-6deg);} 60%{transform:rotate(6deg);} 70%{transform:rotate(-4deg) scale(1.05);} 100%{transform:scale(1.4); opacity:0;} }\n' +
      '.tg-creature { position: relative; width: 100px; height: 100px; display: flex; align-items: center; justify-content: center; cursor: pointer; }\n' +
      '.tg-creature.tg-bounce { animation: tg-bouncekf .4s ease; }\n' +
      '@keyframes tg-bouncekf { 0%,100%{transform:translateY(0) scale(1);} 40%{transform:translateY(-10px) scale(1.05,.95);} 70%{transform:translateY(0) scale(.97,1.03);} }\n' +
      '.tg-body { position: relative; width: 82px; height: 74px; background: hsl(var(--hue) var(--sat) var(--light)); box-shadow: inset -8px -10px 14px rgba(0,0,0,.12); animation: tg-idlekf 2.6s ease-in-out infinite; }\n' +
      '.tg-shape-round { border-radius: 50%; }\n' +
      '.tg-shape-chubby { border-radius: 45% 45% 50% 50% / 55% 55% 45% 45%; width: 96px; }\n' +
      '.tg-shape-tall { border-radius: 50% 50% 45% 45% / 60% 60% 40% 40%; height: 90px; width: 72px; }\n' +
      '@keyframes tg-idlekf { 0%,100%{ transform: translateY(0) scaleY(1);} 50%{ transform: translateY(-3px) scaleY(1.03);} }\n' +
      '.tg-pattern-stripes { background-image: repeating-linear-gradient(90deg, hsl(var(--hue) var(--sat) calc(var(--light) - 15%)) 0 6px, transparent 6px 16px); }\n' +
      '.tg-spot { position: absolute; border-radius: 50%; background: hsl(var(--hue) var(--sat) calc(var(--light) - 18%)); opacity: .55; }\n' +
      '.tg-face { position: absolute; top: 36%; left: 50%; transform: translate(-50%,-50%); width: 100%; }\n' +
      '.tg-eye { position: absolute; width: 10px; height: 10px; border-radius: 50%; background: #2b2b2b; top: 0; }\n' +
      '.tg-eye-l { left: 26px; } .tg-eye-r { left: 46px; }\n' +
      '.tg-eye-style-sparkle .tg-eye { background: #2b2b2b; box-shadow: inset 2px -2px 0 #fff; }\n' +
      '.tg-eye-style-sleepy .tg-eye { height: 3px; border-radius: 2px; top: 4px; }\n' +
      '.tg-mouth { position: absolute; top: 16px; left: 50%; transform: translateX(-50%); width: 14px; height: 8px; border-bottom: 3px solid #2b2b2b; border-radius: 0 0 10px 10px; }\n' +
      '.tg-cheeks { position: absolute; top: 10px; left: 14px; width: 8px; height: 5px; border-radius: 50%; background: #ff9aa2; opacity: .6; box-shadow: 46px 0 0 #ff9aa2; }\n' +
      '.tg-creature[data-mood="sad"] .tg-mouth { border-bottom: none; border-top: 3px solid #2b2b2b; border-radius: 10px 10px 0 0; top: 20px; }\n' +
      '.tg-creature[data-mood="sick"] .tg-eye { background: #2b2b2b; height: 3px; top: 4px; }\n' +
      '.tg-creature[data-mood="sick"] .tg-mouth { border: none; width: 10px; height: 3px; background: #2b2b2b; border-radius: 2px; top: 18px; }\n' +
      '.tg-creature[data-mood="ecstatic"] .tg-mouth { width: 18px; height: 10px; }\n' +
      '.tg-acc-l, .tg-acc-r { position: absolute; top: 6px; width: 0; height: 0; }\n' +
      '.tg-acc-horn.tg-acc-l { left: 38px; top: -8px; border-left: 6px solid transparent; border-right: 6px solid transparent; border-bottom: 16px solid hsl(var(--hue,30) 70% 60%); }\n' +
      '.tg-acc-horn.tg-acc-r { display: none; }\n' +
      '.tg-acc-antennae.tg-acc-l { left: 30px; top: -14px; width: 3px; height: 16px; background: #555; border-radius: 2px; }\n' +
      '.tg-acc-antennae.tg-acc-l::after { content:""; position:absolute; top:-6px; left:-3px; width:9px; height:9px; border-radius:50%; background:#ff6b6b; }\n' +
      '.tg-acc-antennae.tg-acc-r { left: 54px; top: -10px; width: 3px; height: 12px; background: #555; border-radius: 2px; }\n' +
      '.tg-acc-antennae.tg-acc-r::after { content:""; position:absolute; top:-6px; left:-3px; width:7px; height:7px; border-radius:50%; background:#ff6b6b; }\n' +
      '.tg-acc-ears.tg-acc-l { left: 12px; top: -6px; width: 16px; height: 20px; background: hsl(var(--hue,30) 60% 65%); border-radius: 50% 50% 50% 0; transform: rotate(-20deg); }\n' +
      '.tg-acc-ears.tg-acc-r { left: 64px; top: -6px; width: 16px; height: 20px; background: hsl(var(--hue,30) 60% 65%); border-radius: 50% 50% 0 50%; transform: rotate(20deg); }\n' +
      '.tg-poops { position: absolute; inset: 0; pointer-events: none; }\n' +
      '.tg-poop { position: absolute; font-size: 18px; cursor: pointer; pointer-events: all; animation: tg-poopin .3s ease; }\n' +
      '@keyframes tg-poopin { from{ transform: scale(0);} to{ transform: scale(1);} }\n' +
      '.tg-particles { position: absolute; inset: 0; pointer-events: none; overflow: visible; }\n' +
      '.tg-particle { position: absolute; top: 50%; font-size: 18px; animation: tg-particlekf var(--dur,0.8s) ease-out forwards; }\n' +
      '@keyframes tg-particlekf { 0%{ transform: translate(0,0); opacity: 1;} 100%{ transform: translate(var(--dx,0), -70px); opacity: 0;} }\n' +
      '.tg-toast { position: absolute; bottom: 6px; left: 50%; transform: translateX(-50%) translateY(10px); background: rgba(0,0,0,.75); color: #fff; font-size: 11px; padding: 5px 10px; border-radius: 12px; opacity: 0; transition: all .25s; white-space: nowrap; pointer-events: none; }\n' +
      '.tg-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }\n' +
      '.tg-bars { padding: 8px 12px 2px; }\n' +
      '.tg-bar-row { display: flex; align-items: center; gap: 6px; margin-bottom: 5px; font-size: 12px; }\n' +
      '.tg-bar { flex: 1; height: 8px; background: #eee; border-radius: 5px; overflow: hidden; }\n' +
      '.tg-bar i { display: block; height: 100%; border-radius: 5px; transition: width .4s; }\n' +
      '.tg-bar-hunger { background: linear-gradient(90deg,#ffb347,#ff7043); }\n' +
      '.tg-bar-clean { background: linear-gradient(90deg,#64d8ff,#2196f3); }\n' +
      '.tg-bar-happy { background: linear-gradient(90deg,#ffe066,#ffb700); }\n' +
      '.tg-actions { display: flex; gap: 6px; padding: 8px 10px 12px; }\n' +
      '.tg-actions button { flex: 1; border: none; background: #f2f2f2; padding: 8px 4px; border-radius: 10px; font-size: 12px; cursor: pointer; transition: transform .1s, background .2s; }\n' +
      '.tg-actions button:hover { background: #e8e8e8; }\n' +
      '.tg-actions button:active { transform: scale(.94); }\n'
    );
  }
})();
