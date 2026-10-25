/* TrolEnfermería — efectos: sonidos sintetizados, confeti y la mascota Trolo (SVG). */
(() => {
'use strict';

// ================= Sonidos (Web Audio, sin archivos) =================
let ctx = null;
const enabled = { sound: true, haptics: true, funny: true };
function ac() {
  if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
function tone(freq, start, dur, type = 'sine', vol = 0.18, slideTo = 0) {
  const a = ac(); if (!a) return;
  const t = a.currentTime + start;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t); o.stop(t + dur + 0.02);
}
// Nota "con voz": diente de sierra pasado por un filtro, con vibrato opcional (trombón, kazoo, risa)
function voiced(freq, start, dur, { vol = 0.16, slideTo = 0, vib = 0, cutoff = 1400, q = 4 } = {}) {
  const a = ac(); if (!a) return;
  const t = a.currentTime + start;
  const o = a.createOscillator(), g = a.createGain(), f = a.createBiquadFilter();
  o.type = 'sawtooth'; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  if (vib) {
    const l = a.createOscillator(), lg = a.createGain();
    l.frequency.value = 6; lg.gain.value = vib; l.connect(lg).connect(o.frequency);
    l.start(t); l.stop(t + dur + 0.02);
  }
  f.type = 'lowpass'; f.frequency.value = cutoff; f.Q.value = q;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.03);
  g.gain.setValueAtTime(vol, t + Math.max(0.04, dur - 0.08));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(f).connect(g).connect(a.destination);
  o.start(t); o.stop(t + dur + 0.05);
}
// Ruido corto (golpe, "whoosh")
function noise(start, dur, { vol = 0.12, from = 800, to = 3000, type = 'bandpass' } = {}) {
  const a = ac(); if (!a) return;
  const t = a.currentTime + start;
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  s.buffer = buf; f.type = type; f.Q.value = 1.2;
  f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(a.destination);
  s.start(t); s.stop(t + dur + 0.02);
}
// Sonidos graciosos para cuando te equivocas (uno al azar, sin repetir el anterior)
const FUNNY = {
  trombone: () => { [392, 370, 349].forEach((fr, i) => voiced(fr, i * 0.32, 0.3)); voiced(330, 0.96, 0.85, { slideTo: 310, vib: 9 }); }, // wah wah wah waaah
  boing: () => { tone(140, 0, 0.5, 'sine', 0.22, 520); tone(520, 0.02, 0.45, 'triangle', 0.08, 180); },
  slide: () => { tone(1400, 0, 0.7, 'sine', 0.13, 220); tone(1420, 0, 0.7, 'sine', 0.05, 225); }, // pito que se cae
  laugh: () => [0, 0.17, 0.34, 0.51, 0.68].forEach((s, i) => voiced(330 - i * 22, s, 0.13, { vol: 0.15, cutoff: 1100 + i * 80, q: 7 })), // ja-ja-ja-ja-ja
  buzzer: () => { voiced(98, 0, 0.32, { vol: 0.13, cutoff: 900, q: 2 }); voiced(92, 0.38, 0.5, { vol: 0.13, cutoff: 900, q: 2 }); },
  duck: () => [0, 0.2].forEach(s => { voiced(520, s, 0.14, { vol: 0.14, slideTo: 380, cutoff: 1800, q: 9 }); }), // cuac cuac
};
const FUNNY_SHORT = ['boing', 'duck', 'buzzer']; // para la Ráfaga, que no puede esperar al trombón
let lastFunny = '';
function funnyFail(short) {
  const pool = (short ? FUNNY_SHORT : Object.keys(FUNNY)).filter(k => k !== lastFunny);
  lastFunny = pool[Math.floor(Math.random() * pool.length)];
  FUNNY[lastFunny]();
}
const SOUNDS = {
  tap: () => tone(660, 0, 0.05, 'triangle', 0.08),
  select: () => { tone(880, 0, 0.04, 'square', 0.05); tone(1320, 0.03, 0.05, 'triangle', 0.06); },
  next: () => noise(0, 0.22, { vol: 0.1, from: 600, to: 4000 }),
  start: () => { tone(520, 0, 0.08, 'sine', 0.12); tone(780, 0.07, 0.1, 'sine', 0.12); },
  ok: () => { tone(784, 0, 0.12, 'triangle'); tone(1175, 0.1, 0.22, 'triangle'); },
  great: () => { tone(784, 0, 0.1, 'triangle'); tone(988, 0.08, 0.1, 'triangle'); tone(1319, 0.16, 0.28, 'triangle'); },
  mid: () => { tone(587, 0, 0.12, 'triangle', 0.14); tone(659, 0.1, 0.18, 'triangle', 0.14); },
  bad: () => { tone(220, 0, 0.22, 'sawtooth', 0.08, 140); },
  // Error: sonido gracioso (o el seco de siempre si se apagó en Ajustes)
  fail: short => { if (enabled.funny) funnyFail(short); else SOUNDS.bad(); },
  coin: () => { tone(988, 0, 0.08, 'square', 0.07); tone(1319, 0.07, 0.25, 'square', 0.07); },
  level: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.09, 0.25, 'triangle', 0.16)),
  combo: n => tone(600 + Math.min(n, 12) * 70, 0, 0.12, 'square', 0.06),
  streak: () => [659, 784, 988, 1319].forEach((f, i) => tone(f, i * 0.06, 0.14, 'square', 0.06)), // combo ×2 / ×3
  tick: () => tone(1200, 0, 0.03, 'square', 0.04),
  count: () => tone(660, 0, 0.12, 'square', 0.08),
  go: () => { tone(988, 0, 0.1, 'square', 0.08); tone(1319, 0.08, 0.3, 'square', 0.08); },
  end: () => [784, 659, 523, 392].forEach((f, i) => tone(f, i * 0.12, 0.2, 'triangle', 0.14)),
  fanfare: () => { [523, 659, 784].forEach((f, i) => tone(f, i * 0.11, 0.12, 'square', 0.07)); tone(1047, 0.33, 0.45, 'square', 0.08); tone(784, 0.33, 0.45, 'triangle', 0.06); },
};
function sfx(name, arg) {
  if (enabled.sound && SOUNDS[name]) { try { SOUNDS[name](arg); } catch (e) { /* sin audio */ } }
  if (enabled.haptics && window.Speech) {
    const ms = { ok: 25, great: 40, bad: 70, fail: 70, level: 60, coin: 20, start: 15, select: 8, streak: 30, go: 30 }[name];
    if (ms) Speech.vibrate(ms);
  }
}
// Desbloquea el audio con el primer toque (requisito de los navegadores)
document.addEventListener('pointerdown', () => ac(), { once: true });

// ================= Confeti =================
let parts = [], raf = 0;
function confetti(n = 120, colors) {
  const c = document.getElementById('confetti'); if (!c) return;
  const x = c.getContext('2d');
  c.width = innerWidth * devicePixelRatio; c.height = innerHeight * devicePixelRatio;
  const accent = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#7cf75a';
  colors = colors || [accent, '#ff4fa3', '#ffd23f', '#4fc3ff', '#a77bff', '#ffffff'];
  for (let i = 0; i < n; i++) {
    parts.push({
      x: innerWidth * (0.2 + Math.random() * 0.6), y: innerHeight * 0.35,
      vx: (Math.random() - 0.5) * 12, vy: -Math.random() * 13 - 4,
      r: Math.random() * 6 + 4, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
      c: colors[i % colors.length], life: 1, shape: Math.random() < 0.3 ? 1 : 0,
    });
  }
  if (!raf) loop();
  function loop() {
    x.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    x.clearRect(0, 0, innerWidth, innerHeight);
    parts = parts.filter(p => p.life > 0 && p.y < innerHeight + 30);
    for (const p of parts) {
      p.vy += 0.38; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 0.006;
      x.save(); x.translate(p.x, p.y); x.rotate(p.rot); x.globalAlpha = Math.max(0, Math.min(1, p.life * 1.5));
      x.fillStyle = p.c;
      if (p.shape) { x.beginPath(); x.arc(0, 0, p.r / 2, 0, 7); x.fill(); } else x.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
      x.restore();
    }
    if (parts.length) raf = requestAnimationFrame(loop);
    else { raf = 0; x.clearRect(0, 0, innerWidth, innerHeight); }
  }
}

// ================= Trolo, la mascota =================
const GREEN = '#7cf75a', GREEN_D = '#4fb52f', INK = '#0f0c24';
const MOUTHS = {
  happy: `<path d="M44 84 Q60 99 76 84 Q60 91 44 84 Z" fill="${INK}"/><path d="M49 86 L51 91 L53 87.5 Z M67 87.5 L69 91 L71 86 Z" fill="#fff"/>`,
  party: `<path d="M41 81 Q60 108 79 81 Z" fill="${INK}"/><ellipse cx="60" cy="95" rx="9" ry="5" fill="#ff6fae"/><path d="M47 82 L49.5 88 L52 82.5 Z M68 82.5 L70.5 88 L73 82 Z" fill="#fff"/>`,
  sad: `<path d="M46 93 Q60 82 74 93" stroke="${INK}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`,
  wow: `<ellipse cx="60" cy="89" rx="7" ry="8.5" fill="${INK}"/>`,
  smug: `<path d="M46 87 Q63 93 77 81" stroke="${INK}" stroke-width="4.5" fill="none" stroke-linecap="round"/><path d="M70 85 L72 90 L74 84 Z" fill="#fff"/>`,
  think: `<path d="M48 89 Q56 86 72 90" stroke="${INK}" stroke-width="4.5" fill="none" stroke-linecap="round"/>`,
};
const PUPILS = {
  happy: [48, 63, 74, 63, 4.6], party: [48, 62, 74, 62, 4.6], sad: [47, 66, 73, 66, 4.2],
  wow: [47, 62, 73, 62, 3], smug: [50, 64, 76, 64, 4.4], think: [51, 58, 77, 58, 4.2],
};
const ACC = {
  cofia: `<g><path d="M33 47 L38 22 Q60 11 82 22 L87 47 Q60 39 33 47 Z" fill="#fff" stroke="#d9eef2" stroke-width="2"/><path d="M57 21 h6 v16 h-6 Z M52 26 h16 v6 h-16 Z" fill="#ff4f6d"/></g>`,
  stetho: `<g fill="none" stroke="#2b3a44" stroke-width="3.5" stroke-linecap="round"><path d="M38 96 Q40 112 60 112 Q80 112 82 96"/><path d="M60 112 L60 116"/></g><circle cx="60" cy="118" r="5" fill="#9fb3bd" stroke="#2b3a44" stroke-width="2"/>`,
  mask: `<g><path d="M38 80 Q60 74 82 80 L80 96 Q60 104 40 96 Z" fill="#8fd3ff"/><path d="M42 84 Q60 80 78 84 M42 90 Q60 86 78 90" stroke="#5aa9d6" stroke-width="1.5" fill="none"/><path d="M38 80 L27 72 M82 80 L93 72" stroke="#e8f6ff" stroke-width="2"/></g>`,
  glasses: `<g><rect x="34" y="54" width="23" height="15" rx="5" fill="#111"/><rect x="63" y="54" width="23" height="15" rx="5" fill="#111"/><path d="M57 60 H63" stroke="#111" stroke-width="3"/><path d="M37 57 L45 57" stroke="#fff" stroke-opacity=".5" stroke-width="2" stroke-linecap="round"/><path d="M66 57 L74 57" stroke="#fff" stroke-opacity=".5" stroke-width="2" stroke-linecap="round"/></g>`,
  cap: `<g><path d="M27 48 Q29 18 60 17 Q91 18 93 48 Z" fill="#ff3b5c"/><path d="M60 46 Q98 40 108 51 Q84 53 60 50 Z" fill="#d62645"/><circle cx="60" cy="19" r="3.5" fill="#d62645"/><path d="M44 30 Q60 24 76 30" stroke="#fff" stroke-opacity=".35" stroke-width="3" fill="none"/></g>`,
  crown: `<g><path d="M38 40 L41 16 L51 30 L60 12 L69 30 L79 16 L82 40 Z" fill="#ffd23f" stroke="#c49a0a" stroke-width="2" stroke-linejoin="round"/><circle cx="60" cy="31" r="3.5" fill="#ff4fa3"/><circle cx="47" cy="34" r="2.5" fill="#4fc3ff"/><circle cx="73" cy="34" r="2.5" fill="#4fc3ff"/></g>`,
  headphones: `<g><path d="M24 66 Q22 22 60 21 Q98 22 96 66" stroke="#2a2a3a" stroke-width="7" fill="none" stroke-linecap="round"/><rect x="15" y="56" width="15" height="24" rx="7" fill="#ff4fa3"/><rect x="90" y="56" width="15" height="24" rx="7" fill="#ff4fa3"/></g>`,
};
function troll({ mood = 'happy', acc = [], size = 120, cls = '' } = {}) {
  const p = PUPILS[mood] || PUPILS.happy;
  const head = acc.filter(a => !['glasses', 'stetho', 'mask'].includes(a));
  const hideHair = head.includes('cap') || head.includes('cofia');
  const blush = mood === 'happy' || mood === 'party';
  const brows = mood === 'smug' ? `<path d="M38 47 L55 51" stroke="${GREEN_D}" stroke-width="4" stroke-linecap="round"/><path d="M65 49 L83 45" stroke="${GREEN_D}" stroke-width="4" stroke-linecap="round"/>`
    : mood === 'sad' ? `<path d="M39 50 L54 46" stroke="${GREEN_D}" stroke-width="4" stroke-linecap="round"/><path d="M66 46 L81 50" stroke="${GREEN_D}" stroke-width="4" stroke-linecap="round"/>` : '';
  return `<svg class="troll ${cls}" width="${size}" height="${size}" viewBox="0 0 120 120" aria-hidden="true">
    <ellipse cx="60" cy="112" rx="30" ry="5" fill="#000" opacity=".25"/>
    <path d="M30 58 L7 38 L29 76 Z" fill="${GREEN_D}"/><path d="M90 58 L113 38 L91 76 Z" fill="${GREEN_D}"/>
    <path d="M27 58 L15 46 L27 68 Z" fill="#ff8fc4" opacity=".55"/><path d="M93 58 L105 46 L93 68 Z" fill="#ff8fc4" opacity=".55"/>
    <ellipse cx="60" cy="68" rx="35" ry="33" fill="${GREEN}"/>
    <ellipse cx="50" cy="48" rx="14" ry="7" fill="#fff" opacity=".22"/>
    ${hideHair ? '' : `<path d="M46 40 Q47 16 57 30 Q62 10 68 30 Q78 18 75 42 Z" fill="#ff4fa3"/>`}
    ${brows}
    <g class="eyes"><circle cx="47" cy="62" r="10" fill="#fff"/><circle cx="73" cy="62" r="10" fill="#fff"/>
    <circle cx="${p[0]}" cy="${p[1]}" r="${p[4]}" fill="${INK}"/><circle cx="${p[2]}" cy="${p[3]}" r="${p[4]}" fill="${INK}"/>
    <circle cx="${p[0] + 1.6}" cy="${p[1] - 1.8}" r="1.5" fill="#fff"/><circle cx="${p[2] + 1.6}" cy="${p[3] - 1.8}" r="1.5" fill="#fff"/></g>
    ${blush ? `<ellipse cx="36" cy="79" rx="6" ry="3.5" fill="#ff4fa3" opacity=".35"/><ellipse cx="84" cy="79" rx="6" ry="3.5" fill="#ff4fa3" opacity=".35"/>` : ''}
    <ellipse cx="60" cy="75" rx="6.5" ry="5.5" fill="${GREEN_D}"/>
    ${MOUTHS[mood] || MOUTHS.happy}
    ${acc.includes('mask') ? ACC.mask : ''}
    ${acc.includes('stetho') ? ACC.stetho : ''}
    ${acc.includes('glasses') ? ACC.glasses : ''}
    ${head.map(a => ACC[a] || '').join('')}
  </svg>`;
}

const ICONS = {
  mic: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 15a3.5 3.5 0 0 0 3.5-3.5v-6a3.5 3.5 0 0 0-7 0v6A3.5 3.5 0 0 0 12 15Z"/><path d="M18.5 11a1 1 0 1 0-2 0 4.5 4.5 0 0 1-9 0 1 1 0 1 0-2 0 6.5 6.5 0 0 0 5.5 6.42V20H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-2.58A6.5 6.5 0 0 0 18.5 11Z"/></svg>',
  stop: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="3"/></svg>',
};

window.FX = { sfx, confetti, troll, ICONS, enabled, FUNNY };
})();
