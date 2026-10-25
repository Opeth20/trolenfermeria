/* TrolEnfermería — capa de voz (español de Chile).
 * Dos motores con la misma interfaz:
 *  - Nativo (APK): puente Java `window.TrolBridge` con SpeechRecognizer y TextToSpeech de Android.
 *  - Web: Web Speech API (Chrome / Edge).
 * Además: normalización de texto y comparación tolerante con lo que dice el reconocedor.
 */
(() => {
'use strict';

const bridge = window.TrolBridge || null;
const WebSR = window.SpeechRecognition || window.webkitSpeechRecognition;
// iPhone/iPad (incluye iPad que se presenta como Mac) y si está abierta como app desde el ícono de inicio
const IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const STANDALONE = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
const synth = window.speechSynthesis || null;
const LANG = 'es-CL';

// ================= Texto =================
const CONTRACTIONS = {
  "i'm": 'i am', "you're": 'you are', "we're": 'we are', "they're": 'they are', "he's": 'he is', "she's": 'she is',
  "it's": 'it is', "that's": 'that is', "what's": 'what is', "there's": 'there is', "here's": 'here is', "where's": 'where is',
  "how's": 'how is', "who's": 'who is', "let's": 'let us', "i've": 'i have', "you've": 'you have', "we've": 'we have',
  "they've": 'they have', "i'll": 'i will', "you'll": 'you will', "we'll": 'we will', "it'll": 'it will', "they'll": 'they will',
  "i'd": 'i would', "you'd": 'you would', "we'd": 'we would', "they'd": 'they would', "can't": 'can not', cannot: 'can not',
  "won't": 'will not', "don't": 'do not', "doesn't": 'does not', "didn't": 'did not', "isn't": 'is not', "aren't": 'are not',
  "wasn't": 'was not', "weren't": 'were not', "couldn't": 'could not', "shouldn't": 'should not', "wouldn't": 'would not',
  "haven't": 'have not', "hasn't": 'has not', "hadn't": 'had not', okay: 'ok', gonna: 'going to', wanna: 'want to', gotta: 'got to',
};
// También sin apóstrofo ("dont", "im"), salvo las que son otra palabra (we'll -> well)
for (const k of Object.keys(CONTRACTIONS)) {
  const bare = k.replace(/'/g, '');
  if (bare !== k && !['well', 'were', 'wed', 'ill', 'id', 'hell', 'shell'].includes(bare)) CONTRACTIONS[bare] = CONTRACTIONS[k];
}
// Símbolos que el reconocedor escribe en vez de palabras
const SYMBOLS = { '&': ' and ', '%': ' percent ', '+': ' plus ', '@': ' at ' };
const NUMBERS = { zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10', eleven: '11', twelve: '12', thirteen: '13', fourteen: '14', fifteen: '15', sixteen: '16', seventeen: '17', eighteen: '18', nineteen: '19', twenty: '20', thirty: '30', forty: '40', fifty: '50', hundred: '100', first: '1st', second: '2nd' };
// Homófonos que el reconocedor confunde a menudo
const CANON = { '2': 'to', too: 'to', '4': 'for', their: 'there', hear: 'here', know: 'no', write: 'right', buy: 'by', bye: 'by', weak: 'week', knew: 'new', ok: 'ok', alright: 'all right', mr: 'mister', ms: 'miss', whats: 'what is' };

function tokensOf(word) {
  const w = String(word).toLowerCase().replace(/[&%+@]/g, c => SYMBOLS[c]).replace(/[’‘`´]/g, "'").replace(/[^a-z0-9']+/g, ' ').trim();
  if (!w) return [];
  return w.split(/\s+/).flatMap(x => (CONTRACTIONS[x] || x).split(' '))
    .map(x => x.replace(/'/g, ''))
    .filter(Boolean)
    .map(x => NUMBERS[x] || x)
    .flatMap(x => (CANON[x] || x).split(' '));
}
// "412" -> también vale "4 12"; los números largos se comparan tal cual
const normalize = s => String(s || '').split(/\s+/).flatMap(tokensOf);

function lev(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}
// Clave fonética aproximada: palabras que suenan casi igual ("color"/"colour", "realise"/"realize")
function phon(w) {
  return w.replace(/^kn|^wr/, m => m[1]).replace(/ph/g, 'f').replace(/ck|q/g, 'k').replace(/c(?=[eiy])/g, 's').replace(/c/g, 'k')
    .replace(/x/g, 'ks').replace(/z/g, 's').replace(/gh(?![aeiou])/g, '').replace(/dg/g, 'j').replace(/th/g, '0').replace(/sh/g, 'x')
    .replace(/(?!^)[aeiouyhw]/g, '').replace(/(.)\1+/g, '$1');
}
// Tolerancia: palabras largas aceptan 1 letra distinta (plurales, -ed, errores del reconocedor)
const sameWord = (a, b) => a === b
  || (a.length >= 5 && b.length >= 4 && lev(a, b) <= 1)
  || (a.length >= 9 && lev(a, b) <= 2)
  || (a.length >= 5 && b.length >= 5 && phon(a) === phon(b) && lev(a, b) <= 2);

// "sea shells" <-> "seashells": une o separa palabras compuestas según la frase objetivo
function joinCompounds(spoken, target) {
  const tset = new Set(target), out = [];
  for (let j = 0; j < spoken.length; j++) {
    const a = spoken[j], b = spoken[j + 1];
    if (b !== undefined && !tset.has(a) && tset.has(a + b)) { out.push(a + b); j++; continue; }
    if (!tset.has(a)) {
      const k = target.findIndex((t, i) => i + 1 < target.length && t + target[i + 1] === a);
      if (k >= 0) { out.push(target[k], target[k + 1]); continue; }
    }
    out.push(a);
  }
  return out;
}

// Compara lo dicho con la frase objetivo: % de palabras acertadas en orden.
function compare(target, spoken) {
  const display = String(target).split(/\s+/).filter(Boolean);
  const tt = [];
  display.forEach((w, i) => tokensOf(w).forEach(t => tt.push({ t, i })));
  const st = joinCompounds(normalize(spoken), tt.map(x => x.t));
  const n = tt.length, m = st.length;
  const L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    L[i][j] = sameWord(tt[i].t, st[j]) ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const hit = new Array(n).fill(false);
  for (let i = 0, j = 0; i < n && j < m;) {
    if (sameWord(tt[i].t, st[j]) && L[i][j] === L[i + 1][j + 1] + 1) { hit[i] = true; i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++;
  }
  const wordHit = display.map((_, i) => tt.every((x, k) => x.i !== i || hit[k]));
  const score = n ? hit.filter(Boolean).length / n : 0;
  return { score, display, wordHit, spokenWords: m, text: spoken || '' };
}
// La mejor de varias alternativas del reconocedor
function bestOf(target, alts) {
  const list = (alts || []).filter(a => a && a.trim());
  if (!list.length) return compare(target, '');
  return list.map(a => compare(target, a)).sort((a, b) => b.score - a.score)[0];
}
// ¿Contiene el texto una frase clave? (palabras completas, con tolerancia)
function containsKey(text, key) {
  const s = normalize(text), k = normalize(key);
  if (!k.length) return false;
  for (let i = 0; i + k.length <= s.length; i++) {
    let ok = true;
    for (let j = 0; j < k.length && ok; j++) {
      const a = k[j], b = s[i + j];
      ok = sameWord(a, b) || (j === k.length - 1 && a.length >= 4 && b.startsWith(a)); // "thank" -> "thanks"
    }
    if (ok) return true;
  }
  return false;
}
const wordCount = s => normalize(s).length;

// ================= Errores comprensibles =================
const ERRORS = {
  'not-allowed': 'No tengo permiso para usar el micrófono. Actívalo en los ajustes de permisos.',
  'service-not-allowed': 'El reconocimiento de voz no está permitido en este navegador.',
  'network': 'Sin conexión con el servicio de voz. Revisa tu internet e inténtalo de nuevo.',
  'audio-capture': 'No encuentro el micrófono, o lo está usando otra app.',
  'no-speech': 'No te escuché. Habla un poco más fuerte y cerca del micrófono.',
  'no-match': 'No logré entenderte. Inténtalo otra vez, más despacio y claro.',
  'busy': 'El micrófono estaba ocupado. Toca otra vez.',
  'unavailable': 'Tu teléfono no tiene un servicio de reconocimiento de voz. Instala o actualiza la app "Google" desde la tienda.',
  'language': 'Falta el paquete de español para el reconocimiento de voz. Descárgalo en Ajustes > Google > Voz.',
  'server': 'El servicio de voz falló. Inténtalo otra vez en unos segundos.',
};
// En iPhone el dictado lo hace Safari con Siri: mensajes con los pasos de iOS
if (IOS) Object.assign(ERRORS, {
  'not-allowed': 'No tengo permiso para el micrófono. En el iPhone: Ajustes > Safari > Micrófono > Permitir, y vuelve a intentarlo.',
  'service-not-allowed': 'El iPhone no permitió el dictado. Activa Siri y Dictado en Ajustes > General > Teclado, o usa ⌨️ escribir.',
  'unavailable': 'Este iPhone no ofrece reconocimiento de voz aquí. Actualiza iOS, abre la app en Safari o escribe tu respuesta.',
  'language': 'Falta el español para el dictado. Agrégalo en Ajustes > General > Teclado > Idiomas de dictado.',
});
const errMsg = code => ERRORS[code] || `Error de voz (${code}). Inténtalo otra vez.`;

// ================= Reconocimiento =================
let seq = 0;
let active = null; // sesión activa

function available() {
  if (bridge) { try { return !!bridge.hasSpeech(); } catch (e) { return false; } }
  return !!WebSR;
}

/**
 * listen({continuous, onPartial, onFinal, onError, onEnd, onLevel, maxMs})
 * Siempre escucha en modo continuo por dentro: las pausas NO cortan la grabación.
 *  - Modo frase (por defecto): junta todo lo que dices hasta que tocas "terminar"
 *    (o hasta un silencio largo) y llama onFinal([alternativas]) una vez.
 *  - Modo continuo (monólogo): onPartial(textoFinal, textoProvisional); text() devuelve todo.
 * Devuelve { stop(), cancel(), text() }.
 */
const SILENCE_AFTER_SPEECH = 3500; // ms de silencio tras hablar => terminar solo
const NOTHING_SAID = 9000;         // ms sin oír nada => avisar

function listen(opts = {}) {
  if (active) active.cancel();
  stopSpeaking();
  const id = ++seq;
  const s = { id, opts, finished: false, lastPartial: '', segs: [], heard: false, started: Date.now(), activity: Date.now() };
  const phrase = !opts.continuous;

  const joinAlts = () => {
    const segs = s.segs.slice();
    if (s.lastPartial.trim()) segs.push({ top: s.lastPartial.trim(), alts: [s.lastPartial.trim()] });
    if (!segs.length) return [];
    if (segs.length === 1) return segs[0].alts.length ? segs[0].alts : [segs[0].top];
    const head = segs.slice(0, -1).map(x => x.top).join(' ');
    const last = segs[segs.length - 1];
    const alts = [head + ' ' + last.top];
    for (const a of last.alts.slice(1, 5)) alts.push(head + ' ' + a);
    return alts;
  };
  const end = cancelled => {
    if (s.finished) return;
    s.finished = true;
    clearTimeout(s.timer); clearInterval(s.watch);
    if (active === s) active = null;
    if (!cancelled && phrase) {
      const alts = joinAlts();
      if (alts.length) opts.onFinal?.(alts);
      else if (!s.errored) opts.onError?.('no-speech', errMsg('no-speech'));
    }
    opts.onEnd?.();
  };
  s.handle = {
    partial(text) {
      if (s.finished || !text) return;
      s.lastPartial = text; s.heard = true; s.activity = Date.now();
      opts.onPartial?.(s.text(true), text);
    },
    segment(text, alts) {
      if (s.finished || !text || !text.trim()) return;
      const list = (alts && alts.length ? alts : [text]).filter(a => a && a.trim());
      s.segs.push({ top: text.trim(), alts: list });
      s.lastPartial = ''; s.heard = true; s.activity = Date.now();
      opts.onPartial?.(s.text(true), '');
    },
    final(alts) { // motores que entregan la frase completa de una vez
      if (s.finished || !alts || !alts.length) return;
      s.handle.segment(alts[0], alts);
    },
    error(code) {
      if (s.finished) return;
      if (code === 'no-match' || code === 'no-speech') return; // silencios: se ignoran, decide el usuario o el reloj
      s.errored = true; opts.onError?.(code, errMsg(code));
    },
    level(v) { if (s.finished) return; if (v > 0.35) s.activity = Date.now(); opts.onLevel?.(v); },
    end() { end(false); },
  };
  s.text = (onlyFinal) => (s.segs.map(x => x.top).join(' ') + (!onlyFinal && s.lastPartial ? ' ' + s.lastPartial : '')).trim();
  s.stop = () => {
    if (s.finished || s.stopping) return;
    s.stopping = true;
    s.engineStop?.();
    s.timer = setTimeout(() => end(false), 2200); // si el motor no contesta, cerramos con lo que haya
  };
  s.cancel = () => { if (s.finished) return; s.engineCancel?.(); end(true); };

  active = s;
  if (bridge) startNative(s); else startWeb(s);
  if (phrase) {
    // Termina solo tras un silencio largo después de hablar, o si no oye nada en un rato
    s.watch = setInterval(() => {
      if (s.finished || s.stopping) return;
      const now = Date.now();
      if (s.heard && now - s.activity > (opts.silenceMs || SILENCE_AFTER_SPEECH)) s.stop();
      else if (!s.heard && now - s.started > NOTHING_SAID) s.stop();
      else if (now - s.started > (opts.maxMs || 45000)) s.stop();
    }, 250);
  }
  return { stop: () => s.stop(), cancel: () => s.cancel(), text: () => s.text() };
}

// ----- Nativo (Android) -----
const nativeSessions = new Map();
function startNative(s) {
  nativeSessions.set(s.id, s);
  s.engineStop = () => { try { bridge.stopListening(s.id); } catch (e) {} };
  s.engineCancel = () => { try { bridge.cancelListening(s.id); } catch (e) {} nativeSessions.delete(s.id); };
  try { bridge.listen(s.id, LANG, true); }
  catch (e) { s.handle.error('unavailable'); s.handle.end(); }
}

// ----- Web Speech API -----
function startWeb(s) {
  if (!WebSR) { s.handle.error('unavailable'); setTimeout(() => s.handle.end(), 0); return; }
  let stopped = false, rec = null, restarts = 0;
  const make = () => {
    rec = new WebSR();
    rec.lang = LANG;
    rec.interimResults = true;
    rec.maxAlternatives = 5;
    rec.continuous = true;
    rec.onresult = e => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) s.handle.segment(r[0].transcript, [...r].map(a => a.transcript));
        else interim += ' ' + r[0].transcript;
      }
      if (interim.trim()) s.handle.partial(interim.trim());
    };
    rec.onerror = e => {
      const code = e.error === 'aborted' ? null : e.error;
      if (!code) return;
      if (['not-allowed', 'service-not-allowed', 'audio-capture', 'network'].includes(code)) stopped = true;
      s.handle.error(code);
    };
    rec.onend = () => {
      // El navegador corta solo cada cierto tiempo: reanudamos hasta que el usuario termine
      if (!stopped && !s.finished && !s.stopping && restarts < 200) {
        restarts++;
        setTimeout(() => { if (!stopped && !s.finished && !s.stopping) { try { make(); rec.start(); } catch (e) { s.handle.end(); } } else s.handle.end(); }, 100);
      } else s.handle.end();
    };
  };
  s.engineStop = () => { stopped = true; try { rec.stop(); } catch (e) { s.handle.end(); } };
  s.engineCancel = () => { stopped = true; try { rec.abort(); } catch (e) {} };
  try { make(); rec.start(); }
  catch (e) { s.handle.error('busy'); setTimeout(() => s.handle.end(), 0); }
}

// Eventos que llegan desde Java: TrolNative.on('partial', {id, text})
window.TrolNative = window.TrolNative || {};
window.TrolNative.on = (evt, d) => {
  d = d || {};
  if (evt === 'tts-done') { const r = ttsWaiting.get(d.id); if (r) { ttsWaiting.delete(d.id); ttsHooks.delete(d.id); r(); } return; }
  if (evt === 'tts-start') { ttsHooks.get(d.id)?.onStart?.(); return; }
  if (evt === 'tts-range') { ttsHooks.get(d.id)?.onRange?.(d.start || 0, d.end || 0); return; }
  if (evt === 'tts-status') { ttsStatus = d; window.dispatchEvent(new CustomEvent('trol-tts', { detail: d })); return; }
  if (evt === 'back') { window.dispatchEvent(new CustomEvent('trol-back')); return; }
  const s = nativeSessions.get(d.id);
  if (!s) return;
  switch (evt) {
    case 'partial': s.handle.partial(d.text || ''); break;
    case 'segment': s.handle.segment(d.text || '', d.alts); break;
    case 'final': s.handle.final(d.alts || []); break;
    case 'error': s.handle.error(d.code || 'server'); break;
    case 'level': s.handle.level(d.v || 0); break;
    case 'end': nativeSessions.delete(d.id); s.handle.end(); break;
  }
};

// ================= Síntesis (voz del inglés) =================
let ttsStatus = null;
const ttsWaiting = new Map();
const ttsHooks = new Map(); // id -> { onStart, onRange } para sincronizar texto y voz
let webVoices = [];
function loadWebVoices() { if (synth) webVoices = synth.getVoices().filter(v => /^es[-_]/i.test(v.lang)); }
if (synth && !bridge) { loadWebVoices(); synth.onvoiceschanged = loadWebVoices; }
// Safari en iPhone solo deja hablar después de un toque: "despertamos" la voz con el primer toque, en silencio
if (synth && !bridge) document.addEventListener('pointerdown', () => { try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; synth.speak(u); } catch (e) {} }, { once: true });

const prefs = { rate: 0.95, voice: '', human: true, gender: 'f' };
function voices() {
  if (bridge) { try { return JSON.parse(bridge.voices() || '[]'); } catch (e) { return []; } }
  loadWebVoices();
  return webVoices.map(v => ({ name: v.name, lang: v.lang }));
}
function pickWebVoice() {
  if (!webVoices.length) loadWebVoices();
  return webVoices.find(v => v.name === prefs.voice)
    || webVoices.find(v => /es-(CL|US|MX|419)/i.test(v.lang) && /natural|online|google/i.test(v.name))
    || webVoices.find(v => /es-(CL|US|MX|419)/i.test(v.lang)) || webVoices[0];
}

// ----- Voz humana grabada (clips generados con Piper, ver tools/gen_audio.py) -----
// Cada clip se llama por un hash FNV-1a de "voz|texto"; si no existe, se usa la voz del sistema.
function fnv(str) {
  let h = 0x811c9dc5;
  for (const b of new TextEncoder().encode(str)) { h ^= b; h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
function clipFor(text, who) {
  const clips = window.AUDIO_CLIPS;
  if (!prefs.human || !clips) return null;
  for (const v of [who || prefs.gender, who ? prefs.gender : null, 'f', 'm']) {
    if (!v) continue;
    const h = fnv(v + '|' + String(text).trim());
    if (clips[h]) return `audio/${h}.wav`;
  }
  return null;
}
let clipAudio = null, clipDone = null;
function stopClip() {
  if (clipAudio) { try { clipAudio.pause(); } catch (e) {} clipAudio = null; }
  if (clipDone) { const d = clipDone; clipDone = null; d(); }
}

// Siempre se resuelve (aunque el motor no avise), para que nada se quede colgado.
// Si estás grabando, el audio automático no te interrumpe; solo `force` (botón 🔊) corta la grabación.
// who: 'f' (voz de mujer) o 'm' (voz de hombre) para los clips grabados.
// hooks: { onStart(), onRange(start, end) } — avisan cuándo empieza a sonar y qué palabra se está diciendo
function speak(text, rate = prefs.rate, force = false, who = null, hooks = null) {
  if (!force && active && !active.finished) return Promise.resolve();
  if (active && !active.opts.continuous) active.cancel();
  stopSpeaking();
  return new Promise(resolve => {
    const guard = setTimeout(done, 3000 + String(text).length * 120 / rate);
    let finished = false;
    function done() { if (finished) return; finished = true; clearTimeout(guard); resolve(); }
    const url = clipFor(text, who);
    if (url) {
      const a = new Audio(url);
      clipAudio = a; clipDone = done;
      a.preservesPitch = true;
      a.playbackRate = rate;
      a.onended = () => { if (clipAudio === a) { clipAudio = null; clipDone = null; } done(); };
      a.onerror = () => { if (clipAudio === a) { clipAudio = null; clipDone = null; } systemSpeak(text, rate, done); };
      a.play().catch(() => { if (clipAudio === a) { clipAudio = null; clipDone = null; systemSpeak(text, rate, done); } });
      return;
    }
    systemSpeak(text, rate, done, hooks);
  });
}
function systemSpeak(text, rate, done, hooks) {
  if (bridge) {
    const id = 't' + (++seq);
    ttsWaiting.set(id, done);
    if (hooks) ttsHooks.set(id, hooks);
    try { bridge.speak(String(text), rate, id, prefs.voice || ''); } catch (e) { done(); }
    return;
  }
  if (!synth) return done();
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = pickWebVoice();
  if (v) { u.voice = v; u.lang = v.lang; } else u.lang = LANG;
  u.rate = rate;
  u.onend = u.onerror = done;
  if (hooks) {
    u.onstart = () => hooks.onStart?.();
    u.onboundary = e => { if (e.name !== 'sentence') hooks.onRange?.(e.charIndex, e.charIndex + (e.charLength || 1)); };
  }
  setTimeout(() => synth.speak(u), 50);
}
function stopSpeaking() {
  stopClip();
  if (bridge) { try { bridge.stopSpeaking(); } catch (e) {} }
  else if (synth) synth.cancel();
  for (const r of ttsWaiting.values()) r();
  ttsWaiting.clear(); ttsHooks.clear();
}

function vibrate(ms) {
  if (bridge) { try { bridge.vibrate(ms); } catch (e) {} }
  else if (navigator.vibrate && navigator.userActivation?.hasBeenActive !== false) { try { navigator.vibrate(ms); } catch (e) {} }
}

// ----- Texto en español: sin tildes, minúsculas, raíces aproximadas -----
const normEs = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ%]+/g, ' ').trim();
const tokEs = s => normEs(s).split(' ').filter(Boolean);
// Una palabra clave coincide si es igual o comparte la raíz (hipoglicemia ~ hipoglicemico)
const stemEq = (k, t) => k === t || (k.length >= 5 && t.length >= 5 && t.slice(0, Math.max(5, k.length - 3)) === k.slice(0, Math.max(5, k.length - 3)));
function hasEs(text, key) {
  const t = tokEs(text), k = tokEs(key);
  if (!k.length) return false;
  for (let i = 0; i + k.length <= t.length; i++) if (k.every((kk, j) => stemEq(kk, t[i + j]))) return true;
  return false;
}

window.Speech = {
  isNative: !!bridge, isIOS: IOS, standalone: STANDALONE, available, listen, speak, stopSpeaking, voices, prefs, vibrate,
  cancelAll: () => { if (active) active.cancel(); stopSpeaking(); },
  ttsStatus: () => ttsStatus,
  openSettings: what => { try { bridge?.openSettings(what); } catch (e) {} },
  errMsg,
  hasHumanVoice: () => !!window.AUDIO_CLIPS && Object.keys(window.AUDIO_CLIPS).length > 0,
  text: { normalize, compare, bestOf, containsKey, wordCount, sameWord, normEs, tokEs, hasEs, wordsEs: s => tokEs(s).length },
};
})();
