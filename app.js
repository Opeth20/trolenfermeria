/* TrolEnfermería — estudia la carrera de Enfermería (malla UDLA Chile) con Trolo.
 * Quiz con repaso espaciado, explicar en voz alta, cálculo de dosis y una IA troll que te interroga.
 * Material de apoyo: verifica siempre con tus apuntes, tu escuela y las normas MINSAL vigentes.
 */
(() => {
'use strict';

const SP = window.Speech, T = SP.text;
const { sfx, confetti, troll, ICONS } = window.FX;
const STORE = 'trolenfermeria.v1';

// ================= Utilidades =================
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = a => a[Math.floor(Math.random() * a.length)];
const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const shuffle = (a, r = Math.random) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const rng = seed => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const dateKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayNum = (d = new Date()) => Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);
const fmtNum = n => Math.round(n).toLocaleString('es-CL');
const fmtDec = (n, d = 1) => Number(n.toFixed(d)).toLocaleString('es-CL', { maximumFractionDigits: d });
const scoreClass = p => p >= 0.85 ? 'ok' : p >= 0.6 ? 'mid' : 'ko';
const LETTERS = ['A', 'B', 'C', 'D'];

// ================= Estado =================
const DEFAULT = () => ({
  v: 1, onboarded: false, name: '', sem: 1,
  settings: { goal: 15, rate: 1, voice: '', sound: true, haptics: true, readAloud: true, troll: 'spicy', aiKey: '', aiModel: 'claude-opus-5-5', aiProvider: '', geminiKey: '', geminiModel: '', trolVoice: 'phone', trolVoiceName: 'Puck', funnyFail: true, diff: 2, gender: '', insultVoice: true },
  xp: 0, gems: 50, answered: 0, correct: 0,
  days: {}, srs: {}, byRamo: {}, cards: [], explica: {}, dosis: { done: 0, ok: 0 }, rafagaBest: 0, rafagaBestBy: {}, seenAt: {}, aiTurns: 0,
  badges: {}, streak: { count: 0, last: 0, best: 0 }, freezes: 0,
  owned: { themes: ['lime'], acc: ['cofia'] }, theme: 'lime', wearing: ['cofia'],
  quests: { day: 0, ids: [], claimed: [], chest: false },
});
let S = load();
function load() {
  const d = DEFAULT();
  try {
    const raw = localStorage.getItem(STORE);
    if (raw) {
      const s = JSON.parse(raw);
      const st = { ...d, ...s, settings: { ...d.settings, ...s.settings }, owned: { ...d.owned, ...s.owned }, streak: { ...d.streak, ...s.streak }, dosis: { ...d.dosis, ...s.dosis } };
      // 1.5: la voz de Google del teléfono pasa a ser la predeterminada (suena al instante, sin desfase con el texto)
      if (!st.voiceV2) { st.settings.trolVoice = 'phone'; st.voiceV2 = true; }
      return st;
    }
  } catch (e) { /* almacenamiento no disponible */ }
  return d;
}
// Guardado agrupado: muchas respuestas seguidas generan una sola escritura (y se fuerza al salir de la app)
let saveTimer = 0;
function saveNow() { clearTimeout(saveTimer); saveTimer = 0; try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) { /* ignorar */ } }
function save() { if (!saveTimer) saveTimer = setTimeout(saveNow, 400); }
document.addEventListener('visibilitychange', () => { if (document.hidden && saveTimer) saveNow(); });
window.addEventListener('pagehide', () => { if (saveTimer) saveNow(); });
function applySettings() {
  document.body.dataset.theme = S.theme;
  FX.enabled.sound = S.settings.sound;
  FX.enabled.haptics = S.settings.haptics;
  FX.enabled.funny = S.settings.funnyFail !== false;
  SP.prefs.rate = S.settings.rate;
  SP.prefs.voice = S.settings.voice;
  SP.prefs.human = false; // no hay audios grabados: voz del teléfono en español
}
function today() {
  const k = dateKey();
  if (!S.days[k]) S.days[k] = { ok: 0, answered: 0, xp: 0, c: {} };
  const t = S.days[k]; t.c = t.c || {};
  return t;
}
const count = (key, n = 1) => { const t = today(); t.c[key] = (t.c[key] || 0) + n; save(); };
const countMax = (key, v) => { const t = today(); t.c[key] = Math.max(t.c[key] || 0, v); save(); };

// ================= Malla y preguntas =================
const M = window.MALLA, R = window.RAMOS, P = window.PREGUNTAS, X = window.EXPLICA;
const ramosHasta = sem => M.semestres.filter(s => s.n <= sem).flatMap(s => s.ramos);
// Preguntas de un ramo (los ramos de práctica/internado/examen mezclan los de su lista)
// El banco no cambia mientras la app está abierta: se arma una vez por ramo
const bankCache = new Map();
function bank(id) {
  if (bankCache.has(id)) return bankCache.get(id);
  const out = bankBuild(id); bankCache.set(id, out); return out;
}
function bankBuild(id) {
  const r = R[id]; if (!r) return [];
  const ids = r.mix ? r.mix : [id];
  return ids.flatMap(rid => (P[rid] || []).map((q, i) => ({ key: `${rid}:${i}`, ramo: rid, q: q[0], o: q[1], a: q[2], why: q[3], d: q[4] || 2, of: q[5] === 1 })));
}
const qByKey = key => { const [rid, i] = key.split(':'); const q = (P[rid] || [])[+i]; return q && { key, ramo: rid, q: q[0], o: q[1], a: q[2], why: q[3], d: q[4] || 2, of: q[5] === 1 }; };
const explicaFor = id => { const r = R[id]; return (r?.mix || [id]).flatMap(rid => (X[rid] || []).map((e, i) => ({ ...e, key: `${rid}:${i}`, ramo: rid }))); };
function ramoStats(id) {
  const keys = bank(id).map(q => q.key);
  const seen = keys.filter(k => S.srs[k]);
  const learned = seen.filter(k => S.srs[k].reps >= 2).length;
  const b = S.byRamo[id] || { seen: 0, ok: 0 };
  return { total: keys.length, seen: seen.length, learned, pct: keys.length ? learned / keys.length : 0, acc: b.seen ? b.ok / b.seen : 0, tries: b.seen };
}

// Repaso espaciado: acierto alarga el intervalo, error lo reinicia
function gradeQ(key, ok) {
  const c = S.srs[key] || { due: 0, ivl: 0, ease: 2.5, reps: 0, lapses: 0 };
  if (!ok) { c.ivl = 0; c.reps = 0; c.lapses++; c.ease = Math.max(1.3, c.ease - 0.2); }
  else { c.ivl = c.reps === 0 ? 1 : c.reps === 1 ? 3 : Math.round(c.ivl * c.ease); c.reps++; }
  c.due = dayNum() + c.ivl;
  S.srs[key] = c;
  (S.seenAt = S.seenAt || {})[key] = Date.now();
}
// Elige preguntas: primero las vencidas, luego nuevas, luego el resto
function pickQuestions(list, n) {
  const d = dayNum();
  const due = shuffle(list.filter(q => S.srs[q.key] && S.srs[q.key].due <= d));
  const fresh = shuffle(list.filter(q => !S.srs[q.key]));
  const rest = shuffle(list.filter(q => S.srs[q.key] && S.srs[q.key].due > d));
  return [...due, ...fresh, ...rest].slice(0, n);
}
// Dificultad: 1 fácil, 2 normal, 3 difícil, 0 mezcla
const DIFFS = [
  { d: 1, e: '🌱', name: 'Fácil', desc: 'Conceptos base' },
  { d: 2, e: '🔥', name: 'Normal', desc: 'Nivel de prueba' },
  { d: 3, e: '💀', name: 'Difícil', desc: 'Casos, cálculos y detalles finos' },
  { d: 0, e: '🎲', name: 'Mezcla', desc: 'De todo un poco' },
];
const DIFF_MULT = { 0: 1, 1: 0.8, 2: 1, 3: 1.5 };
const diffInfo = d => DIFFS.find(x => x.d === d) || DIFFS[1];
// Elige n preguntas de esa dificultad; si no alcanzan, completa con la dificultad más cercana
function pickByDiff(list, d, n) {
  if (!d) return pickQuestions(list, n);
  const out = pickQuestions(list.filter(q => q.d === d), n);
  for (const nd of [1, 2, 3].filter(x => x !== d).sort((a, b) => Math.abs(a - d) - Math.abs(b - d))) {
    if (out.length >= n) break;
    out.push(...pickQuestions(list.filter(q => q.d === nd), n - out.length));
  }
  return out;
}
// Primero las que llevas más tiempo sin ver (al azar entre las nunca vistas)
const leastSeen = list => shuffle(list).sort((a, b) => ((S.seenAt || {})[a.key] || 0) - ((S.seenAt || {})[b.key] || 0));
const dueAll = () => ramosHasta(S.sem).flatMap(r => r.mix ? [] : bank(r.id)).filter(q => S.srs[q.key] && S.srs[q.key].due <= dayNum());

// ================= Trolo habla =================
// Palabras que cambian según cómo quieres que te trate: {w} weón/weona, {g} gil/gila, {o} terminación o/a…
// Sin género elegido se usan palabras neutras.
const GW = {
  w: { m: 'weón', f: 'weona', n: 'crack' },
  W: { m: 'Weón', f: 'Weona', n: 'Crack' },
  aw: { m: 'aweonao', f: 'aweoná', n: 'cabeza de pollo' },
  g: { m: 'gil', f: 'gila', n: 'crack' },
  pj: { m: 'pajarón', f: 'pajarona', n: 'artista' },
  o: { m: 'o', f: 'a', n: 'o' },
  el: { m: 'el', f: 'la', n: 'el' },
};
const gender = () => S.settings.gender === 'm' || S.settings.gender === 'f' ? S.settings.gender : 'n';
const genderize = t => String(t).replace(/\{(\w+)\}/g, (m, k) => GW[k] ? GW[k][gender()] : m);
// "Enfermero/a" → "Enfermero" o "Enfermera" según el género elegido
const gtxt = t => gender() === 'n' ? t : String(t).replace(/([a-záéíóú]+)o\/a\b/gi, (m, w) => w + (gender() === 'f' ? 'a' : 'o')).replace(/\bel\/la\b/g, gender() === 'f' ? 'la' : 'el');
const TROLL_SETS = {
  soft: {
    idle: ['¿Estudiamos un poquito? Prometo no reírme… mucho. 😇', 'Un ramo al día y el título llega solo.', 'Tu yo del internado te lo va a agradecer.', 'Diez minutitos y quedas list{o}. ¿Dale?'],
    good: ['¡Bien! Así se aprende.', '¡Correcto! Tus pacientes estarán felices.', '¡Eso! Ni el profe lo dice mejor.', '¡Bacán! Vas súper bien.'],
    mid: ['Casi. Repásalo una vez más.', 'Vas bien, pero le falta un poco.'],
    bad: ['Tranqui, para eso se estudia. Mira la explicación.', 'Error detectado, aprendizaje desbloqueado. 🔓', 'No pasa nada, la próxima sale.'],
    goalDone: ['¡Meta del día cumplida! 🫡', 'Hoy estudiaste como interna en semana de examen.'],
    nospeech: ['No te escuché. ¿Estás ahí? 👀'],
    back: ['¡Volviste! El PAE te extrañaba.'],
  },
  spicy: {
    idle: ['¿Vamos a estudiar o vas a seguir mirando la malla? 👀', 'Ya po, la práctica no se aprueba sola.', 'Tengo cabritas listas para tus errores de farmaco. 🍿', 'Si hoy no estudias, le cuento a tu tutora clínica, cachai.', 'El PAE no se hace solo, po.', 'Ya po, al tiro, un quiz cortito y quedai filete.', 'Caleta de materia y tú mirando memes. Fome.'],
    good: ['Ya, estuvo bien. No te agrandes. 😒', '¿Y desde cuándo sabes tanto? Bacán.', 'Correcto. Qué fome, me quedé sin chiste.', 'Bien, po. Tu tutora clínica estaría orgullosa… casi.', 'La raja. Pulenta esa respuesta.', 'Cuático, te salió. ¿Quién eres y qué hiciste con mi alumn{o}?'],
    mid: ['Casi… como cuando casi llegas a la hora a la práctica. ⏰', 'Penca, a medias. Como tu PAE del martes.', 'Le faltó poquito. Lee la explicación, po.', 'Ni fu ni fa. Filo, la próxima.'],
    bad: ['JAJAJA ¿de qué apunte charcha sacaste eso? 📚🔥', 'Esa respuesta la reprueba hasta el maniquí de simulación.', 'Captura tomada. Va directo al grupo del curso. 📸', 'Pucha… menos mal que era un quiz y no un turno.', 'Uy, qué penca. Andai más perdid{o} que el alcohol gel en urgencia.', 'Fome tu respuesta, cachai. Lee y vuelve.', 'Cuática la embarrada. JAJAJA.'],
    goalDone: ['Meta cumplida. Te odio un poquito menos. 🫡', 'Hoy estudiaste más que yo en toda mi carrera troll. Bacán.'],
    nospeech: ['¿Hablaste o solo suspiraste por el examen? 🫁', 'Silencio de pase de visita. Habla más fuerte, po.'],
    back: ['Mira quién volvió. Pensé que te habías cambiado de carrera. 😏', 'Volviste. La malla te estaba esperando, cachai.'],
  },
  savage: {
    idle: ['¿Vai a estudiar o vai a seguir mirando la pantalla como {g}? 👀', 'Abre el ramo, {pj}, o abro yo tus notas del semestre pasado. 😈', 'Tus errores son mi Netflix, longi. Dame contenido.', 'Así no te titulai ni en diez años, {g}. Dale.', 'Ya po, {pj}, al tiro, que la prueba no espera.'],
    good: ['Qué raro, te salió bien. ¿Copiaste, {g}? 🤨', 'Correcto. Chuta, odio cuando pasa esto.', 'Ahora te creís enfermer{o} jefe, {g}.', 'Ya, ya. No te voy a aplaudir. 👏 …pucha, se me escapó.', 'Pulento, {pj}. No te acostumbres.'],
    mid: ['Te faltó harto, {pj}. Bueno, no tanto. Pero harto.', 'Ni chicha ni limonada. Lee la explicación, longi.', 'A medias, como tus apuntes del primer año.'],
    bad: ['¿Qué onda esa respuesta, {g}? JAJAJA 💀', 'Chuta, esa no la apruebas ni con décimas, {g}.', 'La embarraste, {pj}, pero con estilo. Lee la explicación.', 'Eso no lo responde ni el maniquí después de un turno de 24.', 'Captura tomada, {g}. Va al grupo del curso. 📸', 'Andai más perdid{o} que mechón en el hospital, {pj}.', 'Longi, longi, longi… lee la explicación.'],
    goalDone: ['Meta cumplida. Chuta, no me lo esperaba de ti. 🫡', 'Ya, hoy sí, {g}. Mi respeto te dura 24 horas.'],
    nospeech: ['¿Estai respondiendo o rezando? No escucho nada, longi.', 'Cero palabras. Récord mundial de timidez, {pj}. 🏆'],
    back: ['Ah, volviste. ¿Se te acabaron las excusas, {g}? 😏', 'Tanto tiempo, {pj}… la malla no se estudia sola.'],
  },
  garabato: {
    idle: ['¿Vai a estudiar o vai a seguir weando con el celular, {w}? 👀', 'Ya po, {w}, abre un ramo de una vez.', 'Tus errores son mi Netflix, {w}. Dame contenido.', 'Puta que te cuesta, {w}. Una pregunta y listo.', 'Chucha, otro día sin estudiar y te veo repitiendo farmaco, {w}.', 'Deja de hacerte {el} {aw} y ponte a estudiar.'],
    good: ['Ya po, {w}, te salió. No te creai la muerte.', 'Bien, {w}. Hasta me dio rabia.', 'La raja, {w}. ¿Copiaste?', 'Pulento, {w}. Sigue así y capaz que te titulai.', 'Chucha, la achuntaste. ¿Quién eres, {w}?', 'Puta que me cuesta decirlo… bien hecho, {w}.'],
    mid: ['Más o menos no más, {w}. Ni chicha ni limonada.', 'Casi, {w}. Y casi no cuenta en la prueba.', 'A medias, {w}, como tu PAE hecho a las 3 de la mañana.'],
    bad: ['JAJAJA, ¿qué weá respondiste, {w}? 💀', 'La cagaste, {w}. Ni el maniquí de simulación se equivoca así.', 'Chucha, {w}… esa respuesta me dio vergüenza ajena.', 'Puta la weá, {w}. Lee la explicación antes de que te pille la tutora.', 'Te pasaste de {aw}. Anótalo y que no se repita.', 'Me cagué de la risa, {w}. Captura directo al grupo del curso. 📸', '¿Estudiaste o estabai carreteando, {w}? 🍻', '{W}… no. Simplemente no.', 'Qué weá más charcha tu respuesta, {w}. Otra vez.', 'Chuta la weá… hasta el alcohol gel sabe más que tú, {w}.', 'Andai más perdid{o} que mechón en pabellón, {w}.', 'JAJAJA, la cagaste fome, {w}. Ni con décimas te salvai.'],
    goalDone: ['Meta cumplida, {w}. Chucha, no me lo esperaba.', 'Ya, {w}, hoy sí. Mi respeto te dura 24 horas.'],
    nospeech: ['¿Estai hablando o rezando, {w}? No escucho ni una weá.', 'Habla más fuerte, {w}, que no muerdo.'],
    back: ['Ah, volviste, {w}. ¿Se te acabaron las excusas?', 'Tanto tiempo, {w}. La malla no se estudia sola, po.'],
  },
};
const TROLL_LEVELS = [
  { id: 'soft', e: '😇', name: 'Suave', desc: 'Bromas tiernas y mucho ánimo.' },
  { id: 'spicy', e: '🌶️', name: 'Picante', desc: 'Burlón con chilenismos: po, cachai, fome, penca, la raja.' },
  { id: 'savage', e: '💀', name: 'Sin piedad', desc: 'Más pesado: gil, pajarón, longi. Sin garabatos.' },
  { id: 'garabato', e: '🤬', name: 'Garabatos', desc: 'Garabatos chilenos: weón/weona, la cagaste, chucha. Tú lo pediste.' },
];
// Más frases para cada nivel (se suman a las de arriba)
const TROLL_MORE = {
  soft: {
    idle: ['Hoy es un buen día para aprender algo nuevo. 🌱', '¿Un quiz cortito antes de dormir?', 'Cinco minutos de estudio valen más que cero. 💪', 'Tu cerebro está listo, yo también.'],
    good: ['¡Muy bien! Se nota que estudiaste. 🌟', '¡Perfecto! Eso es pensar como enfermero/a.', '¡Vas en racha! Sigue así.', '¡Exacto! Ya casi eres profe.'],
    mid: ['Ibas bien encaminado/a, falta un detalle.', 'Casi, casi. Lee la explicación y lo tienes.', 'Buen intento, ajustemos un poquito.'],
    bad: ['Respira, lee la explicación y vuelve a intentarlo. 💚', 'Así se aprende: equivocándose aquí y no en el turno.', 'Esa era difícil. La próxima sale.', 'No pasa nada, te la vuelvo a preguntar más rato.'],
  },
  spicy: {
    idle: ['La malla no se va a estudiar sola mientras ves TikTok, po. 📱', 'Un quiz al tiro y te dejo tranquilo/a. Mentira. 😏', 'Tu tutora clínica ya está afilando la pauta, cachai.', 'Estudiar ahora o llorar en la cátedra. Tú eliges.', 'Hoy toca sufrir un poquito. Bacán.'],
    good: ['Pulento. Ni yo lo habría dicho mejor. Bueno, sí.', 'Ya, te salió filete. No te acostumbres.', 'Bien, po. Te ganaste un café de la cafetería. Malo, pero café.', 'La raja. Sigue así y te dejo de molestar. Mentira.', 'Correcto. Me quedé sin chiste, qué fome.'],
    mid: ['Te faltó un poco, como la micro que pasa llena. 🚌', 'Medio medio. Como el café de la cafetería.', 'Ni tan mal, ni tan bien. Lee la explicación, cachai.', 'Casi le achuntas. Casi.'],
    bad: ['JAJAJA, eso no lo aprueba ni la tutora más buena. 📋', '¿Lo respondiste con los ojos cerrados? Penca.', 'Esa respuesta merece un sticker en el grupo del curso. 📸', 'Uy, se te cruzaron los cables. Lee la explicación, po.', 'Charcha. Pero tranqui, para eso estoy yo: para reírme.', 'Ni el maniquí de simulación respondería eso. 🤖', 'Ay, no. Eso fue más fome que turno sin colación.'],
  },
  savage: {
    idle: ['Ya po, {pj}, ¿vai a estudiar hoy o el próximo semestre?', 'Mientras tú descansas, la cátedra se acerca, {g}. ⏳', 'Abre un ramo, longi. No muerdo… mucho. 😈', '¿Otra vez sin estudiar, {g}? Qué raro.'],
    good: ['Chuta, la achuntaste. ¿Te soplaron, {g}?', 'Bien, {pj}. Me duele admitirlo.', 'Correcto. Anótalo, que no se repite seguido. 😏', 'Ya, te salió. No te creai enfermer{o} jefe todavía.'],
    mid: ['A medias, {g}. Como tu apunte copiado a última hora.', 'Le faltó harto, longi. Lee la explicación.', 'Casi, {pj}. Pero en el turno el casi no sirve.'],
    bad: ['¿Qué fue eso, {g}? Hasta el maniquí se rió. 💀', 'La embarraste, {pj}. Con estilo, eso sí.', 'Chuta, {g}… eso no lo aprueba nadie.', 'Longi, longi. Lee la explicación y vuelve.', 'Esa respuesta va directo al grupo del curso, {g}. 📸', 'Pucha, {pj}, ni con décimas te salvai.'],
  },
  garabato: {
    idle: ['Ya po, {w}, deja el celular y abre un ramo.', '¿Vai a estudiar o vai a seguir weando, {w}?', 'La cátedra viene igual, {w}. Mejor que te pille estudiando.', 'Chucha, otro día más sin estudiar, {w}. Dale.'],
    good: ['Puta, la achuntaste, {w}. Me cagaste el chiste.', 'Bien, {w}. Hasta yo quedé sorprendido.', 'La raja, {w}. ¿Quién te enseñó? ¿Yo?', 'Ya, {w}, te salió. No te creai la muerte.'],
    mid: ['Más o menos no más, {w}. Lee la weá de la explicación.', 'Casi, {w}. Y casi no te titulai.', 'Te faltó un poco, {w}. Ánimo, que vas bien… más o menos.'],
    bad: ['JAJAJA, ¿qué weá fue eso, {w}? 💀', 'La cagaste bonito, {w}. Lee la explicación.', 'Chucha, {w}, ni el maniquí respondería esa weá.', 'Puta la weá, {w}. Esa iba a la cátedra.', 'Me cagué de la risa, {w}. Ya, ahora en serio: lee la explicación.', '{W}, ¿estudiaste o te quedaste dormido/a encima del apunte?', 'Qué weá más charcha, {w}. Otra vez, que tú puedes.'],
  },
};
for (const [lvl, kinds] of Object.entries(TROLL_MORE)) for (const [k, arr] of Object.entries(kinds)) (TROLL_SETS[lvl][k] = TROLL_SETS[lvl][k] || []).push(...arr);
// Elige frases sin repetir las últimas que dijo Trolo
const trolRecent = {};
function trol(kind) {
  const lvl = TROLL_SETS[S.settings.troll] ? S.settings.troll : 'spicy';
  const arr = TROLL_SETS[lvl][kind] || TROLL_SETS.soft[kind] || [''];
  const key = lvl + ':' + kind, recent = trolRecent[key] = trolRecent[key] || [];
  const free = arr.map((_, i) => i).filter(i => !recent.includes(i));
  const i = pick(free.length ? free : arr.map((_, j) => j));
  recent.push(i); while (recent.length > Math.floor(arr.length * 0.6)) recent.shift();
  return gtxt(genderize(arr[i]));
}
// Para leer en voz alta: sin emojis
const noEmoji = t => String(t).replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '').replace(/\s+/g, ' ').trim();

// ================= Gamificación =================
const LEVEL_TITLES = ['Mechón asustado', 'Toma signos vitales', 'Arma PAE', 'Sobrevive a farmaco', 'Pasa la práctica', 'Interno/a', 'Enfermero/a de turno', 'Enfermero/a jefe', 'Leyenda del hospital', 'Trolo de oro'];
const xpForLevel = L => 80 * L * (L - 1);
function levelInfo(xp = S.xp) {
  let L = 1; while (xp >= xpForLevel(L + 1)) L++;
  const a = xpForLevel(L), b = xpForLevel(L + 1);
  return { L, title: gtxt(LEVEL_TITLES[Math.min(L - 1, LEVEL_TITLES.length - 1)]), pct: (xp - a) / (b - a), toNext: b - xp };
}
function addXp(n, quiet = false) {
  n = Math.round(n || 0); if (n <= 0) return;
  const before = levelInfo().L;
  S.xp += n; today().xp += n; save();
  if (!quiet) toast(`+${n} XP`, 'xp');
  const after = levelInfo();
  if (after.L > before) {
    S.gems += 25; save();
    setTimeout(() => { sfx('level'); confetti(160); modal({ mood: 'party', title: `¡Nivel ${after.L}!`, text: `Ahora eres <b>${after.title}</b>. Toma 25 💎 por no rendirte.` }); }, 400);
  }
  renderTop(); checkBadges();
}
function addGems(n) { S.gems += n; save(); toast(`+${n} 💎`, 'gem'); sfx('coin'); renderTop(); }
// Registra una respuesta (cuenta para la meta diaria)
function answer(ramo, ok) {
  const t = today();
  S.answered++; t.answered++;
  const b = S.byRamo[ramo] = S.byRamo[ramo] || { seen: 0, ok: 0 };
  b.seen++;
  if (ok) { S.correct++; t.ok++; b.ok++; }
  save(); checkGoal();
}
function currentStreak() {
  const st = S.streak; if (!st.last) return 0;
  const gap = dayNum() - st.last - 1;
  return gap <= 0 || S.freezes >= gap ? st.count : 0;
}
function updateStreak() {
  const d = dayNum(), st = S.streak;
  if (st.last === d) return;
  const gap = d - st.last - 1;
  if (st.last && gap <= 0) st.count++;
  else if (st.last && gap > 0 && S.freezes >= gap) { S.freezes -= gap; st.count++; toast(`🛡️ Tus escudos salvaron la racha (${gap})`, 'special'); }
  else st.count = 1;
  st.last = d; st.best = Math.max(st.best || 0, st.count); save();
}
function checkGoal() {
  const t = today();
  if (!t.goalHit && t.ok >= S.settings.goal) {
    t.goalHit = true; updateStreak(); save(); renderTop();
    setTimeout(() => { sfx('level'); confetti(180); modal({ mood: 'party', title: '¡Meta del día cumplida!', text: `${esc(trol('goalDone'))}<br><br>🔥 Racha: <b>${currentStreak()} ${currentStreak() === 1 ? 'día' : 'días'}</b>` }); }, 700);
  }
}
const goalDays = () => Object.values(S.days).filter(d => d.goalHit).length;

const BADGES = [
  { id: 'ok1', e: '✅', t: 'Primera correcta', ok: () => S.correct >= 1 },
  { id: 'ok100', e: '💯', t: '100 correctas', ok: () => S.correct >= 100 },
  { id: 'ok500', e: '🏅', t: '500 correctas', ok: () => S.correct >= 500 },
  { id: 'st7', e: '📅', t: 'Racha de 7', ok: () => (S.streak.best || 0) >= 7 },
  { id: 'dos25', e: '💉', t: 'Calculadora humana', ok: () => S.dosis.ok >= 25 },
  { id: 'exp5', e: '🗣️', t: 'Profe Feynman', ok: () => Object.values(S.explica).filter(v => v >= 0.7).length >= 5 },
  { id: 'raf', e: '⚡', t: 'Ráfaga de 150', ok: () => S.rafagaBest >= 150 },
  { id: 'ai20', e: '🤖', t: 'Me reí de mí', ok: () => S.aiTurns >= 20 },
  { id: 'sem', e: '🎓', t: 'Semestre dominado', ok: () => M.semestres.some(s => s.ramos.filter(r => !r.mix).every(r => ramoStats(r.id).pct >= 0.8)) },
  { id: 'farma', e: '💊', t: 'Rey/Reina de farmaco', ok: () => ramoStats('farma').pct >= 1 },
  { id: 'sva', e: '❤️‍🔥', t: 'Salvavidas', ok: () => ramoStats('sva').pct >= 1 },
];
function checkBadges() {
  for (const b of BADGES) {
    if (!S.badges[b.id] && b.ok()) {
      S.badges[b.id] = dateKey(); S.gems += 10; save();
      setTimeout(() => { toast(`${b.e} Logro: ${b.t} (+10 💎)`, 'special'); sfx('coin'); }, 700);
    }
  }
}

const QUESTS = [
  { id: 'ok15', e: '✅', t: 'Responde bien 15 preguntas', goal: 15, get: t => t.ok, gems: 15 },
  { id: 'quiz2', e: '📚', t: 'Completa 2 quizzes', goal: 2, get: t => t.c.quiz || 0, gems: 15 },
  { id: 'dosis5', e: '💉', t: 'Resuelve 5 cálculos de dosis', goal: 5, get: t => t.c.dosis || 0, gems: 20 },
  { id: 'exp1', e: '🗣️', t: 'Explica un tema en voz alta (70%+)', goal: 1, get: t => t.c.explica || 0, gems: 20 },
  { id: 'raf8', e: '⚡', t: '8 aciertos en una Ráfaga', goal: 8, get: t => t.c.rafaga || 0, gems: 15 },
  { id: 'rev10', e: '🧠', t: 'Repasa 10 preguntas vencidas', goal: 10, get: t => t.c.review || 0, gems: 15 },
  { id: 'ai5', e: '🤖', t: 'Responde 5 veces a Trolo IA', goal: 5, get: t => t.c.ai || 0, gems: 20, needsAi: true },
];
function todaysQuests() {
  const d = dayNum();
  if (S.quests.day !== d) {
    S.quests = { day: d, ids: shuffle(QUESTS.filter(q => !q.needsAi || aiReady()).map(q => q.id), rng(d * 7919)).slice(0, 3), claimed: [], chest: false };
    save();
  }
  return S.quests.ids.map(id => QUESTS.find(q => q.id === id)).filter(Boolean);
}
const questVal = q => Math.min(q.goal, q.get(today()));
const questsReady = () => todaysQuests().filter(q => questVal(q) >= q.goal && !S.quests.claimed.includes(q.id)).length;

// ================= UI común =================
function toast(msg, kind = '') {
  const t = document.createElement('div');
  t.className = 'toast ' + kind; t.textContent = msg;
  const box = $('#toasts'); box.appendChild(t);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => t.remove(), kind === 'special' ? 3500 : 1700);
}
function modal({ mood = 'happy', title = '', text = '', buttons = [{ label: 'OK', cls: 'primary' }], html = '' }) {
  const ov = $('#overlay');
  ov.innerHTML = `<div class="modal">${troll({ mood, acc: S.wearing, size: 130, cls: 'jump' })}
    ${title ? `<h2>${title}</h2>` : ''}${text ? `<p class="muted">${text}</p>` : ''}${html}
    <div class="stack" style="margin-top:14px">${buttons.map((b, i) => `<button class="btn block ${b.cls || ''}" data-mb="${i}">${esc(b.label)}</button>`).join('')}</div></div>`;
  ov.classList.add('show');
  $$('[data-mb]', ov).forEach(el => el.onclick = () => { const b = buttons[+el.dataset.mb]; closeModal(); b.onClick?.(); });
  ov.onclick = e => { if (e.target === ov) closeModal(); };
}
function closeModal() {
  const ov = $('#overlay');
  if (!ov.classList.contains('show')) return false;
  ov.classList.remove('show'); ov.innerHTML = '';
  return true;
}
function renderTop() {
  const li = levelInfo();
  $('#top').innerHTML = `<div class="logo">${troll({ mood: 'smug', acc: S.wearing, size: 34 })}<span>Trol<b>Enfermería</b></span></div><div class="spacer"></div>
    <span class="chip fire">🔥 ${currentStreak()}</span><button class="chip gem" data-go="shop">💎 ${fmtNum(S.gems)}</button><span class="chip lvl" title="${esc(li.title)}">⚡ ${li.L}</span>`;
  const qb = $('#nav [data-go="quests"]');
  if (qb) qb.querySelector('.ni').textContent = questsReady() ? '🎁' : '⚡';
}
function exHead(info = '') {
  return `<div class="xhead"><button class="xbtn" data-back aria-label="Cerrar">✕</button><div class="bar"><i id="xbar"></i></div><div class="xinfo" id="xinfo">${info}</div></div>`;
}
function setProg(p, info) {
  const b = $('#xbar'); if (b) b.style.width = clamp(p * 100, 0, 100) + '%';
  if (info !== undefined) { const i = $('#xinfo'); if (i) i.innerHTML = info; }
}
function endCard({ mood = 'party', title, lines = [], buttons = [] }) {
  return `<div class="card center glow" style="margin-top:30px;padding-top:24px">${troll({ mood, acc: S.wearing, size: 120, cls: 'jump' })}
    <h2 style="margin-top:8px">${title}</h2>${lines.filter(Boolean).map(l => `<div class="muted" style="margin-bottom:10px">${l}</div>`).join('')}
    <div class="stack" style="margin-top:14px">${buttons.map(b => `<button class="btn block ${b.primary ? 'primary' : ''}" data-go="${b.go}"${b.arg !== undefined ? ` data-arg="${esc(b.arg)}"` : ''}>${esc(b.label)}</button>`).join('')}</div></div>`;
}
const disclaimer = () => '<p class="small dim center" style="margin-top:14px">Material de apoyo. Verifica siempre con tus apuntes, tu escuela y las normas MINSAL vigentes.</p>';
const speak = (t, force = false) => SP.speak(t, undefined, force);
// Corta cualquier lectura en curso (y las programadas) para que no se cuele la pregunta anterior
let voiceTok = 0;
const hush = () => { voiceTok++; SP.stopSpeaking(); stopTrolVoice(); };
const speakLater = (t, ms) => { const tok = voiceTok; setTimeout(() => { if (tok === voiceTok) speak(t); }, ms); };
const later = (fn, ms) => { const tok = voiceTok; setTimeout(() => { if (tok === voiceTok) fn(); }, ms); };

// ----- Micrófono (toca para empezar y otra vez para terminar, o mantén presionado) -----
let cleanups = [];
const onCleanup = fn => cleanups.push(fn);
function micWidget(host, o = {}) {
  const label = o.label || 'Toca para hablar';
  const honor = !SP.isNative && !SP.available();
  host.innerHTML = `<div class="micw">
    <div class="micwrap ${SP.isNative ? '' : 'fake'}"><span class="ring2"></span><span class="ring1"></span><button class="mic" aria-label="Hablar">${ICONS.mic}</button></div>
    <div class="miclabel">${esc(label)}</div>
    <div class="small dim michint">Toca para empezar y otra vez para terminar · o mantén presionado</div>
    <div class="partial"></div><div class="micerr"></div>
    ${honor ? `<div class="notice small center">${SP.isIOS ? 'Este iPhone no ofrece dictado aquí: actualiza iOS o abre la app en Safari. Igual puedes tocar las alternativas o escribir.' : 'Este navegador no reconoce voz (usa Chrome, Edge o la app).'}</div>` : ''}
    ${o.allowType ? `<button class="link typebtn">⌨️ Prefiero escribir</button><form class="typeform hidden"><input type="text" placeholder="Escribe tu respuesta…" autocomplete="off"><button class="btn sm primary">OK</button></form>` : ''}
  </div>`;
  const wrap = $('.micwrap', host), btn = $('.mic', host), lbl = $('.miclabel', host), hint = $('.michint', host), partial = $('.partial', host), err = $('.micerr', host);
  let ctl = null;
  const setOn = on => { wrap.classList.toggle('on', on); btn.innerHTML = on ? ICONS.stop : ICONS.mic; lbl.textContent = on ? '🔴 Grabando… toca para terminar' : label; hint.classList.toggle('hidden', on); if (!on) wrap.style.setProperty('--lvl', 0); };
  const finishNow = () => { if (!ctl) return; lbl.textContent = 'Revisando…'; ctl.stop(); };
  function showErr(code) {
    let act = '';
    if (code === 'not-allowed' && SP.isNative) act = '<button class="btn sm" data-native="app">Dar permiso al micrófono</button>';
    else if ((code === 'unavailable' || code === 'language') && SP.isNative) act = '<button class="btn sm" data-native="google">Abrir la app Google</button>';
    else if (code !== 'unavailable' && code !== 'not-allowed') act = '<button class="btn sm retry">Reintentar</button>';
    const msg = code === 'unavailable' && !SP.isNative ? 'Este navegador no reconoce voz. Usa Chrome o Edge, o instala la app.'
      : code === 'no-speech' || code === 'no-match' ? `${trol('nospeech')} ${SP.errMsg(code)}` : SP.errMsg(code);
    err.innerHTML = `<div class="errbox">${esc(msg)}${act ? `<div class="row c" style="margin-top:8px">${act}</div>` : ''}</div>`;
    const r = $('.retry', err); if (r) r.onclick = start;
  }
  function start() {
    if (ctl || !host.isConnected) return;
    err.innerHTML = ''; partial.textContent = '';
    if (!SP.available()) { showErr('unavailable'); return; }
    stopTrolVoice();
    setOn(true); sfx('start');
    ctl = SP.listen({
      maxMs: o.maxMs, silenceMs: o.silenceMs,
      onPartial: (f, p) => { partial.textContent = (f + ' ' + p).trim(); },
      onLevel: v => wrap.style.setProperty('--lvl', v.toFixed(2)),
      onFinal: alts => { partial.textContent = ''; o.onFinal?.(alts, false); },
      onError: code => { partial.textContent = ''; showErr(code); },
      onEnd: () => { ctl = null; if (host.isConnected) setOn(false); },
    });
  }
  let downAt = 0;
  btn.addEventListener('pointerdown', e => { e.preventDefault(); if (ctl) { downAt = 0; finishNow(); return; } downAt = Date.now(); start(); });
  btn.addEventListener('pointerup', () => { if (ctl && downAt && Date.now() - downAt > 600) finishNow(); downAt = 0; });
  btn.addEventListener('pointercancel', () => { downAt = 0; });
  btn.addEventListener('contextmenu', e => e.preventDefault());
  btn.addEventListener('click', e => { if (e.detail === 0) (ctl ? finishNow() : start()); });
  const tb = $('.typebtn', host), tf = $('.typeform', host);
  if (tb) {
    tb.onclick = () => { tb.classList.add('hidden'); tf.classList.remove('hidden'); $('input', tf).focus(); };
    tf.onsubmit = e => { e.preventDefault(); const v = $('input', tf).value.trim(); if (v) { $('input', tf).value = ''; ctl?.cancel(); o.onFinal?.([v], 'typed'); } };
  }
  onCleanup(() => ctl && ctl.cancel());
  return { start, stop: finishNow, cancel: () => ctl && ctl.cancel(), get busy() { return !!ctl; } };
}

// ================= Navegación =================
const TABS = ['home', 'malla', 'quests', 'shop', 'profile'];
const PARENT = { ramo: 'malla', quiz: 'malla', explica: 'malla', rafaga: 'malla', ai: 'malla', dosis: 'home', errores: 'home', settings: 'profile', mictest: 'settings' };
const ROUTES = {};
let current = 'home', currentArg;
const navParent = {};
const navKey = (n, a) => n + '|' + (a ?? '');
const isHub = (n, a) => TABS.includes(n) || n === 'ramo' || (n === 'ai' && !String(a ?? '').includes('|'));
function go(name, arg, isBack = false) {
  if (!isBack && !(name === current && arg === currentArg) && isHub(current, currentArg)) navParent[navKey(name, arg)] = { name: current, arg: currentArg };
  closeModal();
  cleanups.forEach(f => { try { f(); } catch (e) { /* nada */ } }); cleanups = [];
  SP.cancelAll(); stopTrolVoice();
  if (!ROUTES[name]) name = 'home';
  if (!S.onboarded && name !== 'onboarding') name = 'onboarding';
  current = name; currentArg = arg;
  document.body.classList.toggle('focus', !TABS.includes(name));
  $$('#nav button').forEach(b => b.classList.toggle('active', b.dataset.go === name));
  renderTop();
  const v = $('#view'); v.innerHTML = '';
  ROUTES[name](v, arg);
  window.scrollTo(0, 0);
}
function back() {
  if (closeModal()) return true;
  if (current === 'onboarding' || current === 'home') return false;
  if (TABS.includes(current)) { go('home', undefined, true); return true; }
  const p = navParent[navKey(current, currentArg)];
  if (p) go(p.name, p.arg, true);
  else go(PARENT[current] || 'home', undefined, true);
  return true;
}
window.TrolApp = { back };
if (location.protocol.startsWith('http') && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { /* sin modo offline */ }));
  try { navigator.storage?.persist?.(); } catch (e) { /* el navegador decide */ }
}
window.addEventListener('trol-back', back);
document.addEventListener('click', e => {
  const g = e.target.closest('[data-go]');
  if (g) { e.preventDefault(); sfx('tap'); go(g.dataset.go, g.dataset.arg); return; }
  if (e.target.closest('[data-back]')) { e.preventDefault(); back(); return; }
  const n = e.target.closest('[data-native]');
  if (n) SP.openSettings(n.dataset.native);
});

// ================= Bienvenida =================
ROUTES.onboarding = (el, arg) => {
  let step = arg === 'mic' ? 3 : 0;
  const draw = () => {
    const dots = `<div class="row c" style="gap:6px;margin:6px 0 10px">${[0, 1, 2, 3].map(i => `<span style="width:${i === step ? 22 : 8}px;height:8px;border-radius:9px;background:${i <= step ? 'var(--accent)' : 'var(--card2)'}"></span>`).join('')}</div>`;
    let body = '';
    if (step === 0) body = `${troll({ mood: 'party', acc: ['cofia'], size: 170, cls: 'bob' })}
      <h1>¡Hola! Soy Trolo, enfermero.</h1>
      <p class="muted">Te voy a acompañar en toda la carrera de Enfermería (malla UDLA). Quizzes, cálculo de dosis, casos clínicos… y si te equivocas, <b>me voy a reír</b>. 😈</p>
      <button class="btn primary big block" id="nx">¡Vamos!</button>`;
    else if (step === 1) body = `${troll({ mood: 'think', acc: ['cofia'], size: 120 })}
      <h1>¿Cómo te llamo?</h1>
      <input type="text" id="nm" maxlength="20" placeholder="Tu nombre" value="${esc(S.name)}" style="text-align:center;font-size:20px;font-weight:800">
      <h3 style="margin-top:18px">¿Cómo te trato?</h3>${genderPicker()}
      <h3 style="margin-top:18px">¿En qué semestre vas?</h3>
      <div class="grid3" style="grid-template-columns:repeat(5,1fr)">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<button class="card sempick ${S.sem === n ? 'glow' : ''}" data-n="${n}" style="padding:10px 0"><b style="font-size:20px">${n}</b></button>`).join('')}</div>
      <button class="btn primary big block" id="nx" style="margin-top:14px">Siguiente</button>`;
    else if (step === 2) body = `${troll({ mood: 'happy', acc: ['cofia'], size: 110 })}
      <h1>Tu meta diaria</h1>
      <p class="muted">Respuestas <b>correctas</b> al día. Poquito pero todos los días gana.</p>
      <div class="grid2">${[[10, 'Tranqui'], [15, 'En serio'], [25, 'Intenso'], [40, 'Semana de examen']].map(([m, t]) => `<button class="card goalpick ${S.settings.goal === m ? 'glow' : ''}" data-m="${m}"><div class="stat-big">${m}</div><div class="small muted">${t}</div></button>`).join('')}</div>
      <button class="btn primary big block" id="nx" style="margin-top:14px">Siguiente</button>`;
    else body = `${troll({ mood: 'wow', acc: ['cofia'], size: 110 })}
      <h1>Prueba tu micrófono</h1><p class="muted">Toca el botón y di en voz alta:</p>
      <div class="prompt"><div class="big">“Hola Trolo, vengo a estudiar”</div></div>
      <div id="mic"></div><div id="res"></div><button class="btn ghost block" id="skipmic">${arg === 'mic' ? 'Volver' : 'Saltar por ahora'}</button>`;
    el.innerHTML = `<div class="center" style="padding-top:20px">${dots}${body}</div>`;
    const nx = $('#nx');
    $$('.sempick').forEach(b => b.onclick = () => { S.name = $('#nm').value.trim().slice(0, 20); S.sem = +b.dataset.n; sfx('tap'); draw(); });
    $$('.goalpick').forEach(b => b.onclick = () => { S.settings.goal = +b.dataset.m; sfx('tap'); draw(); });
    if (step === 1) wireGenderPicker(() => { S.name = $('#nm').value.trim().slice(0, 20); draw(); });
    if (nx) nx.onclick = () => { if (step === 1) S.name = $('#nm').value.trim().slice(0, 20); step++; save(); sfx('tap'); draw(); };
    if (step === 3) {
      const finish = () => { S.onboarded = true; save(); go(arg === 'mic' ? 'settings' : 'home'); };
      $('#skipmic').onclick = finish;
      micWidget($('#mic'), {
        label: 'Di: Hola Trolo', onFinal: alts => {
          const heard = (alts || [])[0] || '';
          if ((alts || []).some(a => T.hasEs(a, 'hola') || T.hasEs(a, 'trolo') || T.hasEs(a, 'estudiar'))) {
            sfx('great'); confetti(120);
            $('#res').innerHTML = `<div class="result ok"><div class="verdict">¡Te escuché perfecto! 🎉</div><div class="heard">Escuché: “${esc(heard)}”</div></div><button class="btn primary big block" id="gostart" style="margin-top:12px">${arg === 'mic' ? 'Listo' : 'Empezar'}</button>`;
            $('#gostart').onclick = finish;
          } else {
            sfx('mid');
            $('#res').innerHTML = `<div class="result mid"><div class="verdict">Te oí, pero no entendí bien.</div><div class="heard">Escuché: “${esc(heard)}”</div></div>`;
          }
        },
      });
    }
  };
  draw();
};
ROUTES.mictest = el => ROUTES.onboarding(el, 'mic');

// ================= Inicio =================
ROUTES.home = el => {
  setTimeout(() => { const x = $('#ioshintx'); if (x) x.onclick = () => { S.iosHintOff = true; save(); $('#ioshint')?.remove(); }; }, 0);
  const t = today(), pct = clamp(t.ok / S.settings.goal * 100, 0, 100);
  const sem = M.semestres.find(s => s.n === S.sem) || M.semestres[0];
  const due = dueAll().length;
  const mood = t.goalHit ? 'party' : t.ok ? 'happy' : 'smug';
  const line = t.goalHit ? trol('goalDone') : (S.name ? `¡Hey, ${S.name}! ` : '') + trol('idle');
  el.innerHTML = `
    <div class="hero">${troll({ mood, acc: S.wearing, size: 112, cls: 'bob' })}<div class="bubble-say grow">${esc(line)}</div></div>
    <div class="card glow sec">
      <div class="today">
        <div class="ring" style="--p:${pct}"><div><b>${t.ok}</b><span>de ${S.settings.goal} ✅</span></div></div>
        <div class="grow stack">
          <div><div class="stat-big">${fmtNum(S.correct)}</div><div class="stat-lbl">respuestas correctas en total</div></div>
          <div class="row small" style="gap:12px"><span>🔥 <b>${currentStreak()}</b> racha</span><span>🎓 Semestre <b>${S.sem}</b></span></div>
        </div>
      </div>
      <button class="btn primary big block" style="margin-top:16px" data-go="quiz" data-arg="${due ? 'due' : 'sem'}">${due ? `🧠 Repasar ${due} vencidas` : `📚 Quiz de mi semestre`}</button>
    </div>
    <div class="grid2 sec">
      <button class="tile t-blue" data-go="dosis"><span class="te">💉</span><div><h3>Cálculo de dosis</h3><div class="ts">Goteo, ml/h, mg/kg…</div></div></button>
      <button class="tile t-red" data-go="ai"><span class="tb">IA</span><span class="te">🤖</span><div><h3>Trolo IA</h3><div class="ts">Te interroga y se ríe de ti</div></div></button>
      ${(S.cards || []).length ? `<button class="tile t-pink wide" data-go="errores"><span class="tb">${S.cards.length}</span><span class="te">😬</span><div><h3>Mis errores</h3><div class="ts">Lo que Trolo te corrigió, para que no se repita</div></div></button>` : ''}
    </div>
    ${SP.isIOS && !SP.standalone && !SP.isNative && !S.iosHintOff ? `<div class="card sec" id="ioshint" style="display:flex;gap:12px;align-items:center"><span style="font-size:30px">📲</span><div class="grow small"><b>Instálala en tu iPhone</b><br>Toca <b>Compartir</b> <span style="font-size:15px">⎋</span> abajo en Safari y luego <b>Agregar a inicio</b>. Así se abre como app, a pantalla completa.</div><button class="chip" id="ioshintx">✕</button></div>` : ''}
    <div class="sec-title">Semestre ${sem.n}</div>
    <div class="stack">${sem.ramos.map(r => ramoRow(r)).join('')}</div>
    <div class="sec-title">Retos de hoy</div>
    <div class="card" data-go="quests" style="cursor:pointer">${todaysQuests().map(q => { const v = questVal(q), done = S.quests.claimed.includes(q.id); return `<div class="quest"><div class="qi">${done ? '✅' : q.e}</div><div class="grow"><div class="small" style="font-weight:800">${esc(q.t)}</div><div class="bar gold"><i style="width:${v / q.goal * 100}%"></i></div></div><div class="small muted" style="font-weight:800">${v}/${q.goal}</div></div>`; }).join('')}</div>
    ${disclaimer()}`;
};
function ramoRow(r) {
  const st = ramoStats(r.id);
  return `<button class="card ramo" data-go="ramo" data-arg="${r.id}"><span class="ri">${r.icon}</span>
    <div class="grow"><div class="rn">${esc(r.name)}</div><div class="bar" style="height:8px;margin-top:6px"><i style="width:${st.pct * 100}%"></i></div>
    <div class="small dim" style="margin-top:3px">${r.mix ? 'Mezcla de ramos · ' : ''}${st.learned}/${st.total} dominadas${st.tries ? ` · ${Math.round(st.acc * 100)}% acierto` : ''}</div></div><span class="dim">›</span></button>`;
}

// ================= Malla =================
ROUTES.malla = el => {
  el.innerHTML = `<div class="row" style="margin-top:8px"><h1 class="grow">Malla</h1><span class="chip">UDLA 2026</span></div>
    <p class="muted small">${esc(M.fuente)}. La universidad indica que puede cambiar: confirma con tu escuela.</p>
    ${M.semestres.map(s => `<div class="sec-title">Semestre ${s.n}${s.n === S.sem ? ' · <span style="color:var(--accent)">el tuyo</span>' : ''}</div>
      <div class="stack">${s.ramos.map(r => ramoRow(r)).join('')}</div>`).join('')}
    ${disclaimer()}`;
};

ROUTES.ramo = (el, id) => {
  const r = R[id]; if (!r) return go('malla');
  const st = ramoStats(id), ex = explicaFor(id);
  el.innerHTML = exHead(r.icon) + `<div class="prompt" style="text-align:left"><div class="kicker">Semestre ${r.sem}${r.mix ? ' · mezcla de ramos' : ''}</div><h1 style="margin:6px 0">${esc(r.name)}</h1>
      <div class="small muted">${r.topics.map(esc).join(' · ')}</div></div>
    <div class="card sec"><div class="row"><b class="grow">Dominio del ramo</b><b>${Math.round(st.pct * 100)}%</b></div><div class="bar"><i style="width:${st.pct * 100}%"></i></div>
      <div class="small dim" style="margin-top:6px">${st.learned}/${st.total} preguntas dominadas${st.tries ? ` · ${Math.round(st.acc * 100)}% de acierto` : ''}</div></div>
    <div class="grid2 sec">
      <button class="tile t-green" data-go="quiz" data-arg="${id}"><span class="te">📚</span><div><h3>Quiz</h3><div class="ts">10 preguntas con repaso espaciado</div></div></button>
      <button class="tile t-yellow" data-go="rafaga" data-arg="${id}"><span class="te">⚡</span><div><h3>Ráfaga</h3><div class="ts">60 segundos a toda velocidad</div></div></button>
      ${ex.length ? `<button class="tile t-purple" data-go="explica" data-arg="${id}"><span class="te">🗣️</span><div><h3>Explícalo</h3><div class="ts">Enséñale el tema a Trolo en voz alta</div></div></button>` : ''}
      ${['farma', 'mat', 'adulto1', 'adulto2', 'urg', 'nino1', 'nino2', 'sva', 'prac1', 'prac2', 'prac3', 'prac4', 'int1', 'int2', 'examen'].includes(id) ? `<button class="tile t-blue" data-go="dosis"><span class="te">💉</span><div><h3>Cálculo de dosis</h3><div class="ts">Práctica numérica</div></div></button>` : ''}
      <button class="tile t-red wide" data-go="ai" data-arg="${id}"><span class="tb">IA</span><span class="te">🤖</span><div><h3>Trolo IA</h3><div class="ts">Te interroga, simula casos clínicos y resuelve dudas de este ramo</div></div></button>
    </div>${disclaimer()}`;
  setProg(st.pct, '');
};

// ================= Quiz =================
// Reconoce respuestas habladas: "la B", "letra c", "alternativa d" o el texto de la opción
function voiceChoice(text, opts) {
  const n = T.normEs(text);
  // "de" también es preposición: solo cuenta como letra al final o tras "letra/opción/alternativa"
  const m = n.match(/\b(?:la|letra|opcion|alternativa)\s+(a|b|c|d|be|ce|de)$/) || n.match(/\b(?:letra|opcion|alternativa)\s+(a|b|c|d|be|ce|de)\b/) || n.match(/^(?:la\s+)?(a|b|c|d|be|ce|de)$/);
  if (m) return { a: 0, b: 1, be: 1, c: 2, ce: 2, d: 3, de: 3 }[m[1]];
  const words = T.tokEs(text).filter(w => w.length > 3);
  let best = -1, bestScore = 0;
  opts.forEach((o, i) => {
    const ow = T.tokEs(o).filter(w => w.length > 3);
    if (!ow.length) return;
    const hit = ow.filter(w => words.some(x => x === w || (w.length >= 5 && x.slice(0, 5) === w.slice(0, 5)))).length / ow.length;
    if (hit > bestScore) { bestScore = hit; best = i; }
  });
  return bestScore >= 0.5 ? best : -1;
}
// Pantalla para elegir la dificultad antes de empezar
function diffPicker(el, { title, icon = '', list, intro = [], note = () => '', onPick }) {
  const cnt = d => d ? list.filter(q => q.d === d).length : list.length;
  el.innerHTML = exHead(icon) + `<div class="prompt"><div class="kicker">${esc(title)}</div><h1 style="margin:6px 0">Elige la dificultad</h1>${intro.map(l => `<div class="small muted">${l}</div>`).join('')}</div>
    <div class="stack">${DIFFS.map(x => `<button class="card ramo diffpick ${S.settings.diff === x.d ? 'glow' : ''}" data-d="${x.d}"><span class="ri">${x.e}</span>
      <div class="grow"><div class="rn">${x.name}${x.d === 3 ? ' <span class="chip">XP ×1,5</span>' : ''}</div><div class="small dim" style="margin-top:3px">${x.desc} · ${cnt(x.d)} preguntas${note(x.d)}</div></div><span class="dim">›</span></button>`).join('')}</div>`;
  setProg(0, '');
  $$('.diffpick', el).forEach(b => b.onclick = () => { S.settings.diff = +b.dataset.d; save(); sfx('select'); onPick(+b.dataset.d); });
}
const semBank = () => (M.semestres.find(s => s.n === S.sem) || M.semestres[0]).ramos.flatMap(r => r.mix ? [] : bank(r.id));

ROUTES.quiz = (el, arg) => {
  if (arg === 'due') return runQuiz(el, arg, shuffle(dueAll()).slice(0, 15), 'Repaso de vencidas', 0);
  const pool = arg === 'sem' ? semBank() : bank(arg);
  if (!pool.length) return go('malla');
  const title = arg === 'sem' ? `Semestre ${S.sem}` : R[arg]?.name || 'Quiz';
  diffPicker(el, { title, icon: arg === 'sem' ? '📚' : R[arg]?.icon, list: pool, intro: ['10 preguntas con repaso espaciado.'],
    onPick: d => runQuiz(el, arg, pickByDiff(pool, d, 10), title, d) });
};
function runQuiz(el, arg, list, title, d) {
  hush();
  if (!list.length) { el.innerHTML = exHead() + endCard({ mood: 'happy', title: 'Nada pendiente', lines: ['No tienes preguntas vencidas. Vuelve mañana o haz un quiz de tu semestre.'], buttons: [{ go: 'quiz', arg: 'sem', label: 'Quiz de mi semestre', primary: true }] }); return; }
  let idx = 0, ok = 0, combo = 0;
  const mult = DIFF_MULT[d] ?? 1, di = diffInfo(d);
  el.innerHTML = exHead(arg === 'due' ? '' : di.e) + '<div id="stage"></div>';
  const stage = $('#stage');
  function show() {
    hush();
    if (idx >= list.length) return finish();
    const q = list[idx], order = shuffle([0, 1, 2, 3]);
    let answered = false;
    setProg(idx / list.length, `${idx + 1}/${list.length}`);
    stage.innerHTML = `<div class="prompt" style="text-align:left"><div class="kicker">${esc(R[q.ramo]?.icon || '')} ${esc(R[q.ramo]?.name || title)} · ${diffInfo(q.d).e} ${diffInfo(q.d).name}${q.of ? ' · 📘 tu materia' : ''}</div>
        <div class="qtext">${esc(q.q)} <button class="spk sm-spk" id="say">🔊</button></div></div>
      <div class="opts">${order.map((oi, k) => `<button class="opt" data-o="${oi}"><span class="ol">${LETTERS[k]}</span><span>${esc(q.o[oi])}</span></button>`).join('')}</div>
      <div id="mic"></div><div id="res"></div>`;
    $('#say').onclick = () => { hush(); speak(`${q.q}. ${order.map((oi, k) => `${LETTERS[k]}: ${q.o[oi]}`).join('. ')}`, true); };
    const choose = oi => {
      if (answered) return; answered = true;
      hush();
      const right = oi === q.a;
      $$('.opt', stage).forEach(b => { const v = +b.dataset.o; b.disabled = true; if (v === q.a) b.classList.add('right'); else if (v === oi) b.classList.add('wrong'); });
      gradeQ(q.key, right); answer(q.ramo, right);
      if (arg === 'due') count('review');
      if (right) {
        ok++; combo++; addXp(Math.round((10 + Math.min(combo, 5) * 2) * mult), true);
        if (combo === 3 || combo === 5 || combo === 8) { sfx('streak'); toast(`🔥 ¡${combo} seguidas!`); } else sfx(combo >= 3 ? 'great' : 'ok');
      } else { combo = 0; sfx('fail'); }
      $('#mic').innerHTML = '';
      const line = right ? trol('good') : trol('bad');
      $('#res').innerHTML = `<div class="result ${right ? 'ok' : 'ko'}"><div class="verdict">${esc(line)}</div>
        <p style="margin-top:8px">${right ? '' : `<span id="corr" style="font-weight:800">Correcta: ${esc(q.o[q.a])}</span><br>`}<span class="muted" id="why">${esc(q.why)}</span></p></div>
        <button class="btn primary block" id="next" style="margin-top:12px">${idx + 1 < list.length ? 'Siguiente →' : 'Ver resultado'}</button>`;
      $('#next').onclick = () => { sfx('next'); idx++; show(); };
      // Después del sonido gracioso Trolo se burla con su voz (y lee la explicación); si pasas antes a la siguiente, se calla
      const after = S.settings.funnyFail !== false && S.settings.sound ? 1500 : 200;
      const verdict = $('.verdict', stage), explain = S.settings.readAloud ? [[$('#corr', stage), `Correcta: ${q.o[q.a]}.`], [$('#why', stage), q.why]] : [];
      if (!right && S.settings.insultVoice !== false) later(() => sayLines([[verdict, noEmoji(line)], ...explain], true), after);
      else if (!right && explain.length) later(() => sayLines(explain), after);
    };
    $$('.opt', stage).forEach(b => b.onclick = () => choose(+b.dataset.o));
    micWidget($('#mic'), {
      label: 'O responde con la voz: “la B”', silenceMs: 2500, maxMs: 12000,
      onFinal: alts => {
        for (const a of alts || []) {
          const k = voiceChoice(a, order.map(oi => q.o[oi]));
          if (k >= 0) { choose(order[k]); return; }
        }
        toast('No entendí cuál alternativa. Di “la A”, “la B”…');
      },
    });
  }
  function finish() {
    hush();
    count('quiz');
    const p = ok / list.length;
    addXp(Math.round(20 * mult));
    setProg(1, '✓');
    if (p >= 0.7) { sfx('fanfare'); confetti(100); } else if (p < 0.5) sfx('fail'); else sfx('end');
    const more = arg !== 'due' && (arg === 'sem' || R[arg]);
    stage.innerHTML = endCard({ mood: p >= 0.8 ? 'party' : p >= 0.5 ? 'happy' : 'sad', title: `${ok}/${list.length} correctas`, lines: [esc(p >= 0.8 ? trol('good') : p >= 0.5 ? trol('mid') : trol('bad')), arg === 'due' ? '' : `Dificultad: ${di.e} ${di.name}`, 'Las que fallaste vuelven pronto en tu repaso.'],
      buttons: [more ? { go: 'quiz', arg, label: '🎚️ Cambiar dificultad' } : null, R[arg] ? { go: 'ramo', arg, label: 'Volver al ramo' } : { go: 'home', label: 'Inicio' }].filter(Boolean) });
    if (more) {
      const again = document.createElement('button');
      again.className = 'btn block primary'; again.textContent = `🔁 Otro quiz (${di.name})`;
      again.onclick = () => { sfx('tap'); const pool = arg === 'sem' ? semBank() : bank(arg); runQuiz(el, arg, pickByDiff(pool, d, 10), title, d); };
      $('.stack', stage).prepend(again);
    }
  }
  show();
}

// ================= Ráfaga (60 s) =================
ROUTES.rafaga = (el, id) => {
  const base = bank(id);
  if (!base.length) return go('ramo', id);
  const best = d => (S.rafagaBestBy || {})[d] || 0;
  diffPicker(el, { title: `Ráfaga ⚡ · ${R[id]?.name || ''}`, icon: '⚡', list: base,
    intro: ['60 segundos. Responde lo más rápido que puedas.', 'Aciertos seguidos = combo ×2, ×3.'],
    note: d => best(d) ? ` · 🏆 ${best(d)}` : '', onPick: countdown });
  // Preguntas: primero las de esta dificultad que llevas más tiempo sin ver; si faltan, de dificultades vecinas
  // y, si el ramo se queda corto, de otros ramos de tu semestre. Así no se repiten en cada partida.
  function buildPool(d) {
    const fit = q => !d || q.d === d;
    let pool = leastSeen(base.filter(fit));
    if (pool.length < 30) pool.push(...leastSeen(base.filter(q => !fit(q))).sort((a, b) => Math.abs(a.d - d) - Math.abs(b.d - d)).slice(0, 30 - pool.length));
    if (pool.length < 30) {
      const sem = R[id]?.sem || S.sem;
      const more = M.semestres.filter(s => s.n === sem).flatMap(s => s.ramos).filter(r => !r.mix && r.id !== id).flatMap(r => bank(r.id)).filter(fit);
      pool.push(...leastSeen(more).slice(0, 30 - pool.length));
    }
    return pool;
  }
  function countdown(d) {
    let n = 3, alive = true;
    onCleanup(() => { alive = false; });
    el.innerHTML = exHead('⚡') + `<div class="card center" style="margin-top:40px;padding:40px 0"><div class="small muted">${diffInfo(d).e} ${diffInfo(d).name}</div><div class="rscore" id="cd" style="font-size:96px">3</div><div class="small muted">¡Prepárate!</div></div>`;
    sfx('count');
    const step = () => {
      if (!alive) return;
      n--;
      if (n > 0) { $('#cd').textContent = n; sfx('count'); setTimeout(step, 700); }
      else { $('#cd').textContent = '¡YA!'; sfx('go'); setTimeout(() => alive && play(d), 400); }
    };
    setTimeout(step, 700);
  }
  function play(d) {
    const pool = buildPool(d), mult = DIFF_MULT[d] ?? 1;
    let i = 0, correct = 0, combo = 0, bestCombo = 0, points = 0, running = true, lastSec = 99;
    const started = Date.now();
    el.innerHTML = exHead('60') + `<div class="card center" id="rc"><div class="rscore" id="pts">0</div><div class="small muted">puntos <span class="combo" id="combo"></span></div><div id="q"></div></div>`;
    const card = $('#rc');
    const timer = setInterval(() => {
      const left = 60 - (Date.now() - started) / 1000, sec = Math.max(0, Math.ceil(left));
      setProg(left / 60, `<span class="rtimer">${sec}</span>`);
      if (sec <= 5 && sec > 0 && sec !== lastSec) sfx('tick'); // tic-tac de los últimos 5 segundos
      lastSec = sec;
      if (left <= 0) end();
    }, 200);
    onCleanup(() => { running = false; clearInterval(timer); });
    function ask() {
      if (!running) return;
      if (i > 0 && i % pool.length === 0) pool.splice(0, pool.length, ...leastSeen(pool)); // vuelta completa: reordenar
      const q = pool[i % pool.length], order = shuffle([0, 1, 2, 3]);
      $('#q').innerHTML = `${q.ramo !== id ? `<div class="kicker" style="text-align:left;margin-top:10px">${esc(R[q.ramo]?.icon || '')} ${esc(R[q.ramo]?.name || '')}</div>` : ''}<div class="qtext" style="text-align:left;margin:12px 0">${esc(q.q)}</div><div class="opts">${order.map((oi, k) => `<button class="opt" data-o="${oi}"><span class="ol">${LETTERS[k]}</span><span>${esc(q.o[oi])}</span></button>`).join('')}</div>`;
      $$('.opt', card).forEach(b => b.onclick = () => {
        if (!running) return;
        const right = +b.dataset.o === q.a;
        $$('.opt', card).forEach(x => { x.disabled = true; if (+x.dataset.o === q.a) x.classList.add('right'); else if (x === b) x.classList.add('wrong'); });
        gradeQ(q.key, right); answer(q.ramo, right); i++;
        card.classList.remove('flash-ok', 'flash-ko'); void card.offsetWidth; card.classList.add(right ? 'flash-ok' : 'flash-ko');
        if (right) {
          correct++; combo++; bestCombo = Math.max(bestCombo, combo);
          points += Math.round(10 * mult) * (combo >= 6 ? 3 : combo >= 3 ? 2 : 1);
          if (combo === 3 || combo === 6) { sfx('streak'); toast(`🔥 Combo ×${combo >= 6 ? 3 : 2}`); } else sfx('combo', combo);
        } else { combo = 0; sfx('fail', true); }
        $('#pts').textContent = points; $('#combo').textContent = combo >= 3 ? `· combo ×${combo >= 6 ? 3 : 2} 🔥` : '';
        setTimeout(ask, right ? 300 : 1100);
      });
    }
    function end() {
      if (!running) return; running = false; clearInterval(timer);
      S.rafagaBestBy = S.rafagaBestBy || {};
      const record = points > (S.rafagaBestBy[d] || 0);
      S.rafagaBestBy[d] = Math.max(S.rafagaBestBy[d] || 0, points);
      S.rafagaBest = Math.max(S.rafagaBest, points); countMax('rafaga', correct); save();
      addXp(Math.round(points / 2)); sfx(record && points ? 'level' : 'end'); if (record && points) confetti(200);
      el.innerHTML = exHead('✓') + endCard({ mood: record ? 'party' : 'smug', title: record && points ? '¡Nuevo récord! 🏆' : '¡Tiempo!', lines: [`<span class="rscore">${points}</span><br>puntos`, `✓ ${correct} aciertos · 🔥 mejor combo ${bestCombo}`, `${diffInfo(d).e} ${diffInfo(d).name} · récord ${S.rafagaBestBy[d]}`],
        buttons: [{ go: 'rafaga', arg: id, label: '🎚️ Cambiar dificultad' }, { go: 'ramo', arg: id, label: 'Volver al ramo' }] });
      const again = document.createElement('button');
      again.className = 'btn block primary'; again.textContent = `⚡ Otra vez (${diffInfo(d).name})`;
      again.onclick = () => { sfx('tap'); countdown(d); };
      $('.stack', el).prepend(again);
    }
    ask();
  }
};

// ================= Explícalo en voz alta (técnica Feynman) =================
ROUTES.explica = (el, id) => {
  const list = shuffle(explicaFor(id));
  if (!list.length) return go('ramo', id);
  let i = 0;
  el.innerHTML = exHead('🗣️') + '<div id="stage"></div>';
  const stage = $('#stage');
  function show() {
    hush();
    const e = list[i % list.length];
    setProg((S.explica[e.key] || 0), '');
    stage.innerHTML = `<div class="prompt"><div class="kicker">Explícalo como si le enseñaras a un amigo</div><div class="big" style="font-size:22px">${esc(e.p)}</div></div>
      <p class="small muted center">Habla al menos 30 segundos. Trolo revisa si mencionas las ideas clave.</p>
      <div id="mic"></div><div id="res"></div>`;
    micWidget($('#mic'), {
      label: 'Explica en voz alta', allowType: true, silenceMs: 5000, maxMs: 180000,
      onFinal: (alts, mode) => {
        const text = (alts || [])[0] || '';
        const hits = e.k.map(g => g.some(w => T.hasEs(text, w)));
        const score = hits.filter(Boolean).length / e.k.length;
        const words = T.wordsEs(text);
        S.explica[e.key] = Math.max(S.explica[e.key] || 0, score); save();
        if (score >= 0.7) count('explica');
        addXp(Math.round(words / 3) + (score >= 0.7 ? 20 : 0));
        sfx(score >= 0.85 ? 'great' : score >= 0.6 ? 'mid' : 'fail'); if (score >= 0.85) confetti(80);
        setProg(S.explica[e.key]);
        $('#res').innerHTML = `<div class="result ${scoreClass(score)}"><div class="row"><span class="score ${scoreClass(score)}">${Math.round(score * 100)}%</span><span class="verdict grow">${esc(score >= 0.85 ? trol('good') : score >= 0.6 ? trol('mid') : trol('bad'))}</span></div>
          <div class="small" style="margin-top:8px">${e.k.map((g, j) => `<div>${hits[j] ? '✅' : '❌'} ${esc(g[0])}</div>`).join('')}</div>
          <div class="heard">${mode === 'typed' ? 'Escribiste' : 'Dijiste'} ${words} palabras.</div>
          ${aiReady() ? '<button class="btn sm block" id="aigrade" style="margin-top:10px">🤖 Que Trolo IA evalúe mi explicación</button><div id="aires"></div>' : ''}</div>
          <div class="row" style="margin-top:12px"><button class="btn grow" id="again">Otra vez</button><button class="btn primary grow" id="nexte">Siguiente tema →</button></div>`;
        $('#again').onclick = show;
        $('#nexte').onclick = () => { i++; show(); };
        const ag = $('#aigrade');
        if (ag) ag.onclick = async () => {
          ag.disabled = true; ag.textContent = 'Trolo está leyendo… 🧐';
          try {
            const out = await aiGradeExplain(R[e.ramo]?.name || '', e.p, text);
            sticker(out.reaction);
            $('#aires').innerHTML = `<div class="msg trol" style="margin-top:10px"><div class="trolhead">${troll({ mood: STICKERS[out.reaction]?.mood || 'smug', acc: S.wearing, size: 38 })}<b>Trolo</b><span class="grow"></span><b>${out.score}/100</b></div>
              <div class="roast">${esc(out.roast)}</div>
              ${out.good.length ? `<div class="small" style="margin-top:6px">✅ ${out.good.map(esc).join('<br>✅ ')}</div>` : ''}
              ${out.missing.length ? `<div class="small" style="margin-top:6px">🕳️ Te faltó: ${out.missing.map(esc).join('; ')}</div>` : ''}
              ${out.wrong.length ? `<div class="small" style="margin-top:6px">❌ Errores: ${out.wrong.map(esc).join('; ')}</div>` : ''}</div>`;
            ag.remove();
            sayLines([[$('#aires .roast'), out.roast]]);
          } catch (err) { ag.disabled = false; ag.textContent = '🤖 Reintentar evaluación'; toast(err.message); }
        };
      },
    });
  }
  show();
};

// ================= Cálculo de dosis =================
// La presentación del fármaco siempre va en el enunciado: se practica el cálculo, no la memoria.
const DOSE_TYPES = [
  { id: 'conv', name: 'Conversiones', min: 1, gen() {
    const k = pick(['g-mg', 'mg-mcg', 'mcg-mg', 'mg-g']);
    if (k === 'g-mg') { const g = pick([0.25, 0.5, 1.2, 1.5, 2, 0.75]); return { q: `¿Cuántos mg son ${fmtDec(g, 2)} g?`, ans: g * 1000, unit: 'mg', steps: [`1 g = 1.000 mg`, `${fmtDec(g, 2)} × 1.000 = ${fmtNum(g * 1000)} mg`] }; }
    if (k === 'mg-mcg') { const m = pick([0.1, 0.25, 0.5, 1.5, 2]); return { q: `¿Cuántos mcg son ${fmtDec(m, 2)} mg?`, ans: m * 1000, unit: 'mcg', steps: [`1 mg = 1.000 mcg`, `${fmtDec(m, 2)} × 1.000 = ${fmtNum(m * 1000)} mcg`] }; }
    if (k === 'mcg-mg') { const m = pick([250, 500, 125, 1500]); return { q: `¿Cuántos mg son ${fmtNum(m)} mcg?`, ans: m / 1000, unit: 'mg', steps: [`1 mg = 1.000 mcg`, `${fmtNum(m)} / 1.000 = ${fmtDec(m / 1000, 3)} mg`] }; }
    const m = pick([250, 500, 750, 1500]); return { q: `¿Cuántos gramos son ${fmtNum(m)} mg?`, ans: m / 1000, unit: 'g', steps: [`1 g = 1.000 mg`, `${fmtNum(m)} / 1.000 = ${fmtDec(m / 1000, 3)} g`] };
  } },
  { id: 'kg', name: 'Dosis por peso', min: 1, gen() {
    const d = pick([{ n: 'paracetamol', mk: pick([10, 15]), pres: 160, per: 5 }, { n: 'ibuprofeno', mk: pick([5, 10]), pres: 100, per: 5 }]);
    const w = rint(6, 30), mg = w * d.mk, ml = mg * d.per / d.pres;
    return { q: `Niño de ${w} kg. Indicación: ${d.n} ${d.mk} mg/kg por dosis, vía oral. Presentación: suspensión ${d.pres} mg/${d.per} ml. ¿Cuántos ml administras por dosis?`, ans: ml, unit: 'ml',
      steps: [`Dosis = ${w} kg × ${d.mk} mg/kg = ${fmtNum(mg)} mg`, `Si ${d.pres} mg están en ${d.per} ml → ${fmtNum(mg)} mg × ${d.per} / ${d.pres} = ${fmtDec(ml, 2)} ml`] };
  } },
  { id: 'vol', name: 'Volumen a cargar', min: 1, gen() {
    const d = pick([
      { n: 'ceftriaxona', ind: pick([500, 750, 1500]), amt: pick([1000, 2000]).valueOf(), vol: 10, f: 'frasco de 1 g reconstituido en 10 ml' },
      { n: 'metamizol', ind: pick([500, 1000]), amt: 1000, vol: 2, f: 'ampolla de 1 g en 2 ml' },
      { n: 'ketorolaco', ind: pick([10, 15, 30]), amt: 30, vol: 1, f: 'ampolla de 30 mg en 1 ml' },
      { n: 'furosemida', ind: pick([10, 20, 40]), amt: 20, vol: 2, f: 'ampolla de 20 mg en 2 ml' },
    ]);
    if (d.n === 'ceftriaxona') { d.amt = 1000; if (d.ind > 1000) d.ind = 750; }
    const ml = d.ind * d.vol / d.amt;
    return { q: `Indicación: ${d.n} ${fmtNum(d.ind)} mg EV. Presentación: ${d.f}. ¿Cuántos ml cargas?`, ans: ml, unit: 'ml',
      steps: [`Concentración = ${fmtNum(d.amt)} mg / ${d.vol} ml = ${fmtDec(d.amt / d.vol, 2)} mg/ml`, `Volumen = ${fmtNum(d.ind)} mg / ${fmtDec(d.amt / d.vol, 2)} mg/ml = ${fmtDec(ml, 2)} ml`] };
  } },
  { id: 'macro', name: 'Macrogoteo', min: 2, gen() {
    const v = pick([500, 1000, 1500]), h = pick([4, 6, 8, 12, 24]), g = Math.round(v * 20 / (h * 60));
    return { q: `Pasar ${fmtNum(v)} ml de suero fisiológico en ${h} horas con equipo de macrogoteo (20 gotas/ml). ¿Cuántas gotas por minuto?`, ans: v * 20 / (h * 60), unit: 'gotas/min', round: true,
      steps: [`Gotas/min = volumen (ml) × 20 / (horas × 60)`, `${fmtNum(v)} × 20 / (${h} × 60) = ${fmtDec(v * 20 / (h * 60), 1)} ≈ ${g} gotas/min`] };
  } },
  { id: 'microg', name: 'Microgoteo', min: 2, gen() {
    const v = pick([250, 500, 1000]), h = pick([4, 6, 8, 12, 24]);
    return { q: `Pasar ${fmtNum(v)} ml en ${h} horas con equipo de microgoteo (60 microgotas/ml). ¿Cuántas microgotas por minuto?`, ans: v / h, unit: 'microgotas/min', round: true,
      steps: [`Con microgoteo, microgotas/min = ml/hora`, `${fmtNum(v)} / ${h} = ${fmtDec(v / h, 1)} ≈ ${Math.round(v / h)} microgotas/min`] };
  } },
  { id: 'bomba', name: 'Bomba de infusión (ml/h)', min: 2, gen() {
    const v = pick([100, 250, 500, 1000]), h = pick([2, 4, 6, 8, 12, 24]);
    return { q: `Indicación: ${fmtNum(v)} ml a pasar en ${h} horas por bomba de infusión. ¿A cuántos ml/h programas la bomba?`, ans: v / h, unit: 'ml/h',
      steps: [`ml/h = volumen / horas`, `${fmtNum(v)} / ${h} = ${fmtDec(v / h, 1)} ml/h`] };
  } },
  { id: 'conc', name: 'Concentración', min: 2, gen() {
    const mg = pick([100, 200, 250, 500, 1000]), ml = pick([10, 20, 50, 100, 250]);
    return { q: `Diluyes ${fmtNum(mg)} mg de un fármaco en ${ml} ml. ¿Cuál es la concentración en mg/ml?`, ans: mg / ml, unit: 'mg/ml',
      steps: [`Concentración = mg / ml`, `${fmtNum(mg)} / ${ml} = ${fmtDec(mg / ml, 2)} mg/ml`] };
  } },
  { id: 'inf', name: 'Infusión mcg/kg/min', min: 4, gen() {
    const d = pick([{ n: 'dopamina', mg: 200, ml: 250, dose: pick([3, 5, 8, 10]) }, { n: 'noradrenalina', mg: 4, ml: 250, dose: pick([0.05, 0.1, 0.2]) }]);
    const w = rint(50, 90), conc = d.mg * 1000 / d.ml, mlh = d.dose * w * 60 / conc;
    return { q: `Paciente de ${w} kg. Indicación: ${d.n} ${fmtDec(d.dose, 2)} mcg/kg/min. Preparación: ${d.mg} mg en ${d.ml} ml. ¿A cuántos ml/h programas la bomba?`, ans: mlh, unit: 'ml/h',
      steps: [`Concentración = ${d.mg} mg × 1.000 / ${d.ml} ml = ${fmtDec(conc, 1)} mcg/ml`, `Dosis por hora = ${fmtDec(d.dose, 2)} × ${w} kg × 60 = ${fmtDec(d.dose * w * 60, 1)} mcg/h`, `ml/h = ${fmtDec(d.dose * w * 60, 1)} / ${fmtDec(conc, 1)} = ${fmtDec(mlh, 1)} ml/h`] };
  } },
];
// Acepta "2,5", "2.5", "1.500" (miles) y "0.125"
function parseNum(s) {
  let t = String(s).replace(/\s/g, '');
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  else if (/^[1-9]\d{0,2}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  return parseFloat(t);
}
function doseOk(p, v) {
  if (!isFinite(v)) return false;
  if (p.round) return Math.abs(v - p.ans) <= 1;
  return Math.abs(v - p.ans) <= Math.max(0.05, Math.abs(p.ans) * 0.02);
}
ROUTES.dosis = el => {
  const types = DOSE_TYPES.filter(t => t.min <= Math.max(2, S.sem));
  const N = 8;
  let idx = 0, ok = 0;
  el.innerHTML = exHead('💉') + '<div id="stage"></div>';
  const stage = $('#stage');
  function show() {
    if (idx >= N) {
      setProg(1, '✓'); addXp(ok * 5); sfx(ok >= 6 ? 'great' : 'end'); if (ok >= 6) confetti(100);
      stage.innerHTML = endCard({ mood: ok >= 6 ? 'party' : 'smug', title: `${ok}/${N} cálculos correctos`, lines: [esc(ok >= 6 ? trol('good') : trol('mid')), 'En la clínica, revisa siempre el cálculo con otra persona (doble chequeo).'], buttons: [{ go: 'dosis', label: 'Otra ronda', primary: true }, { go: 'home', label: 'Inicio' }] });
      return;
    }
    const t = pick(types), p = t.gen();
    setProg(idx / N, `${idx + 1}/${N}`);
    stage.innerHTML = `<div class="prompt" style="text-align:left"><div class="kicker">💉 ${esc(t.name)}</div><div class="qtext">${esc(p.q)}</div></div>
      <form id="f" class="row" style="margin-top:14px"><input type="text" id="v" inputmode="decimal" autocomplete="off" placeholder="Tu respuesta" style="flex:1;font-size:20px;font-weight:800"><span class="chip">${esc(p.unit)}</span></form>
      <button class="btn primary block" id="chk" style="margin-top:12px">Comprobar</button><div id="res"></div>`;
    $('#v').focus();
    const check = e => {
      e?.preventDefault();
      const v = parseNum($('#v').value);
      if (!isFinite(v)) { toast('Escribe un número'); return; }
      const right = doseOk(p, v);
      S.dosis.done++; if (right) { S.dosis.ok++; ok++; count('dosis'); addXp(8, true); sfx('ok'); } else sfx('fail');
      answer('farma', right); save();
      $('#chk').remove(); $('#v').disabled = true;
      $('#res').innerHTML = `<div class="result ${right ? 'ok' : 'ko'}"><div class="verdict">${esc(right ? trol('good') : trol('bad'))}</div>
        <p style="margin-top:6px">Respuesta: <b>${p.round ? Math.round(p.ans) : fmtDec(p.ans, 2)} ${esc(p.unit)}</b></p>
        <div class="steps">${p.steps.map((s, i) => `<div><b>${i + 1}.</b> ${esc(s)}</div>`).join('')}</div></div>
        <button class="btn primary block" id="next" style="margin-top:12px">Siguiente →</button>`;
      $('#next').onclick = () => { idx++; show(); };
    };
    $('#f').onsubmit = check; $('#chk').onclick = check;
  }
  show();
};

// ================= Trolo IA (Claude) =================
// Toda la comunicación con la IA pasa por aiCall(), que elige entre Gemini (gratis) y Claude (de pago).
const AI_MODELS = [
  { id: 'claude-opus-5-5', name: 'Claude Opus 5.5', note: 'Las mejores explicaciones (recomendado)' },
  { id: 'claude-haiku-5-5', name: 'Claude Haiku 5.5', note: 'Más rápido y mucho más barato' },
];
const STICKERS = {
  laugh: { e: '😂', mood: 'party', snd: 'fail' }, skull: { e: '💀', mood: 'wow', snd: 'fail' }, facepalm: { e: '🤦', mood: 'sad', snd: 'mid' },
  clown: { e: '🤡', mood: 'party', snd: 'fail' }, sleep: { e: '😴', mood: 'smug', snd: 'mid' }, shock: { e: '😱', mood: 'wow', snd: 'mid' },
  clap: { e: '👏', mood: 'happy', snd: 'great' }, fire: { e: '🔥', mood: 'party', snd: 'great' },
};
function sticker(kind) {
  const st = STICKERS[kind]; if (!st) return;
  const el = document.createElement('div'); el.className = 'sticker'; el.textContent = st.e;
  document.body.appendChild(el); setTimeout(() => el.remove(), 1300);
}
const TROLL_STYLE = {
  soft: 'Trolo is a playful, kind troll: gentle teasing, mostly encouraging. No swearing.',
  spicy: 'Trolo is a sassy, dramatic, arrogant troll who thinks he is the best nurse in the hospital, and he talks like a friendly Chilean classmate. Sarcastic and theatrical, he compares mistakes with nursing-school life (the clinical tutor, the simulation mannequin, 24-hour shifts, the class WhatsApp group) and makes playful fake threats ("I took a screenshot for the class group chat"). He uses everyday, light Chilean slang only: po, cachai, fome, penca, charcha, bacán, pucha. No insults and no swear words.',
  savage: 'Trolo is merciless in a comedic roast-battle way, like a Chilean friend roasting a classmate who asked for it: arrogant, dismissive, over-the-top dramatic. He may tease the student with mild, common Chilean words: gil, pajarón, longi, la embarraste, chuta, pucha. No swear words or vulgar street slang (never weón, aweonao, chucha, puta, culiao or anything that sounds flaite).',
  garabato: 'Trolo talks like a foul-mouthed Chilean friend from the same class, roasting a classmate who explicitly asked for swearing. He swears freely and playfully with common Chilean garabatos: weón/weona (as a vocative), aweonao/aweoná, la cagaste, qué weá, puta la weá, chucha, me cagué de la risa, carretear, plus everyday slang (po, cachai, al tiro, la raja, pulento, cuático, fome, charcha). The swearing is affectionate banter, not hate. Never use conchetumare, culiao or any slur.',
};
const AI_MODES = {
  quiz: { icon: '🎯', title: 'Trolo te interroga', desc: 'Te hace preguntas del ramo y se ríe de tus errores.' },
  caso: { icon: '🩺', title: 'Caso clínico', get desc() { return gtxt('Un caso realista: tú eres el/la enfermero/a.'); } },
  duda: { icon: '❓', title: 'Dudas', desc: 'Pregúntale lo que no entiendas del ramo.' },
};
const AI_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    laughing: { type: 'boolean' },
    reaction: { type: 'string', enum: Object.keys(STICKERS) },
    roast: { type: 'string' },
    verdict: { type: 'string', enum: ['correct', 'partial', 'wrong', 'none'] },
    feedback: { type: 'string' },
    card_front: { type: 'string' },
    card_back: { type: 'string' },
    reply: { type: 'string' },
  },
  required: ['laughing', 'reaction', 'roast', 'verdict', 'feedback', 'card_front', 'card_back', 'reply'],
};
function aiSystem(mode, ramo) {
  const topics = ramo ? `the course "${ramo.name}" (semester ${ramo.sem}; topics: ${ramo.topics.join(', ')})` : `any course up to semester ${S.sem}`;
  const role = {
    quiz: `Quiz the student on ${topics}. Ask ONE question at a time (open-ended or multiple choice), suited to their semester, mixing recall and clinical reasoning. Evaluate their previous answer in "verdict" and "feedback", then ask the next question in "reply".`,
    caso: `Run a realistic Chilean clinical case related to ${topics}. You narrate the scenario and voice the patient, family or physician. The student acts as the nurse: assessment, prioritization, NANDA diagnosis, interventions, education. Give data (vital signs, exam findings) only when asked. Evaluate each decision in "verdict" and "feedback", then advance the case in "reply". If the student does something unsafe, stop them clearly.`,
    duda: `The student asks questions about ${topics}. Answer clearly and correctly in "reply", then end with a quick check question. Use "verdict" only to grade their answer to your previous check question; otherwise "none".`,
  }[mode];
  return `You are the AI tutor of a study app for nursing students at Universidad de Las Américas (UDLA), Chile.${S.name ? ` The student's name is ${S.name}.` : ''} The student is in semester ${S.sem} of 10. Everything you write must be in casual Chilean Spanish.

${role}

You are Trolo, a troll nurse tutor. ${TROLL_STYLE[S.settings.troll] || TROLL_STYLE.spicy} The student chose this roasting level on purpose and finds it motivating. When the student gets something wrong, Trolo laughs ("JAJAJA", "me muero") and makes a short joke about the answer in "roast", then explains the correct concept in "feedback". When they get it right, Trolo is reluctantly impressed. ${S.settings.troll === 'garabato' ? 'The student explicitly asked to be insulted with Chilean swear words when they make mistakes: calling them the listed garabatos is the joke they want. Keep it funny, never hateful.' : 'The student asked to be roasted like a friend: at the sin piedad level, calling them the mild words listed for that level is part of the joke. Keep it witty and light, never vulgar.'} ${gender() === 'f' ? 'The student is a woman: address her with feminine forms (weona, aweoná, gila, pajarona, enfermera, perdida).' : gender() === 'm' ? 'The student is a man: address him with masculine forms (weón, aweonao, gil, pajarón, enfermero, perdido).' : 'The student did not share their gender: avoid gendered insults and adjectives; use neutral words like "crack" instead.'} Never use slurs, and never joke about looks, body, sexuality, ethnicity, origin, accent, family or disabilities. Never mock patients, illness, death or suffering: Trolo roasts only the student's mistake.

Accuracy comes first: base content on standard nursing references and Chilean norms (MINSAL, GES, NANDA-I/NIC/NOC, AHA guidelines, IAAS programme). If you are not sure, say so instead of guessing. This is study practice, not real clinical advice. Be brief because everything is read aloud and the student is waiting: "roast" one short sentence, "feedback" at most two sentences, "reply" under 50 words.

Fields: "verdict" grades the student's latest answer (correct / partial / wrong; "none" when there was nothing to grade). "feedback" is the correction or reinforcement (empty when verdict is none). When the student made a mistake, write a flashcard so they review it later: "card_front" is a short question and "card_back" the correct answer; otherwise both are empty strings. Pick one "reaction" sticker: laugh (funny mistake), skull (dangerous mistake), facepalm (silly mistake), clown (made-up answer), sleep (lazy answer), shock (surprising), clap (correct), fire (excellent).`;
}
// ----- Variedad: cada sesión cambia el enfoque, el formato y el humor, y evita lo que ya preguntó antes -----
const AI_FORMATS = ['a multiple-choice question with 4 options (A-D)', 'a short clinical vignette with one question', 'a true-or-false statement that the student must justify', 'a fill-in-the-blank sentence', 'a question comparing two related concepts', 'a "what would you do as the nurse?" situation', 'a statement with a hidden mistake to spot', 'a question asking to order the steps of a procedure', 'a quick calculation (only if the topic allows it)', 'a "why does this happen?" question'];
const AI_JOKES = ['the clinical tutor and her rubric', 'the simulation mannequin', 'a 24-hour shift without lunch', 'the class WhatsApp group', 'the terrible cafeteria coffee', 'the packed bus (la micro) to campus', 'exam week panic', 'the care plan (PAE) due tomorrow', 'the hospital elevator that never arrives', 'Chilean telenovelas', 'the CESFAM waiting line', 'forgetting the stethoscope', 'the white uniform and a coffee stain', 'studying at 3 a.m.', 'the professor who takes attendance', 'a group project where nobody works'];
const AI_OPENERS = ['Greet them with a short dramatic entrance', 'Greet them pretending you were sleeping and they woke you up', 'Greet them with a fake weather report about their brain', 'Greet them like a TV game-show host', 'Greet them like a strict clinical tutor (as a joke)', 'Greet them with a one-line playful bet about how many they will get right', 'Greet them complaining that you were in the middle of a 24-hour shift', 'Greet them like a sports commentator'];
const shortTxt = t => String(t || '').replace(/\s+/g, ' ').trim().slice(0, 140);
function aiVariety(mode, ramo, rid) {
  const topics = ramo ? shuffle(ramo.topics).slice(0, 3) : shuffle(ramosHasta(S.sem).filter(r => !r.mix)).slice(0, 3).map(r => r.name);
  const formats = shuffle(AI_FORMATS).slice(0, 4), jokes = shuffle(AI_JOKES).slice(0, 4);
  const mem = (S.aiRecent || {})[rid || 'all'] || { q: [], r: [] };
  const lines = [
    `\n\nVariety for this session (it must feel different from previous ones): start with ${topics.join(', then ')}${ramo ? ' and later move to other topics of the course' : ''}.`,
    mode === 'quiz' ? `Rotate question formats; begin with ${formats[0]}, then mix ${formats.slice(1).join('; ')}. Never use the same format twice in a row, and never ask the same thing twice in this conversation.` : '',
    mode === 'caso' ? `Pick a fresh patient for this case (vary age, sex, setting: CESFAM, urgencias, sala, domicilio or colegio) related to ${topics[0]}.` : '',
    `Today's joke themes: ${jokes.join('; ')}. Invent new jokes every turn: never repeat a joke, a punchline or the same opening words ("JAJAJA" at most once in a while; vary the laugh: "jsjsjs", "me muero", "ay no", "pfff", "noooo").`,
    mem.q.length ? `The student already saw these recent questions in earlier sessions; do not repeat or paraphrase them: ${mem.q.slice(-12).map(x => `"${x}"`).join(' | ')}.` : '',
    mem.r.length ? `Do not reuse these recent jokes: ${mem.r.slice(-8).map(x => `"${x}"`).join(' | ')}.` : '',
  ];
  return lines.filter(Boolean).join(' ');
}
const aiStart = () => `(The student just opened this mode. ${pick(AI_OPENERS)} in one line and start: ask the first question, present the case, or invite their question. Nothing to grade yet: verdict "none", empty feedback and card fields.)`;
// Guarda lo último que preguntó y los chistes, para no repetirlos en la próxima sesión
function rememberAi(rid, mode, out) {
  const all = S.aiRecent = S.aiRecent || {};
  const m = all[rid || 'all'] = all[rid || 'all'] || { q: [], r: [] };
  if (mode !== 'duda' && out.reply) m.q.push(shortTxt(out.reply));
  if (out.roast) m.r.push(shortTxt(out.roast));
  m.q = m.q.slice(-25); m.r = m.r.slice(-15);
  save();
}
const AI_START = '(The student just opened this mode. Greet them in one line and start: ask the first question, present the case, or invite their question. Nothing to grade yet: verdict "none", empty feedback and card fields.)';

function cleanAssistant(content) {
  const lastFb = content.map(b => b.type).lastIndexOf('fallback');
  return content.filter((b, i) => b.type !== 'fallback' && (i >= lastFb || b.type === 'text'));
}
// ----- Proveedor de IA: Google Gemini (gratis, por defecto) o Claude (de pago) -----
const aiProvider = () => S.settings.aiProvider || (S.settings.aiKey ? 'claude' : 'gemini');
const aiReady = () => aiProvider() === 'claude' ? !!S.settings.aiKey : !!S.settings.geminiKey;
const wait = ms => new Promise(r => setTimeout(r, ms));
// Devuelve { out: JSON de la respuesta, content: lo que se guarda en el historial }
async function aiCall(messages, system, schema = AI_SCHEMA) {
  const data = aiProvider() === 'claude' ? await claudeCall(messages, system, schema) : await geminiCall(messages, system, schema);
  if (data.stop_reason === 'refusal') throw new Error('La IA prefirió no responder eso. Prueba de otra forma.');
  const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  try { return { out: JSON.parse(text), content: cleanAssistant(data.content) }; }
  catch (e) { throw new Error('La IA respondió algo raro. Inténtalo otra vez.'); }
}

// Modelos Flash de la capa gratuita; si uno no está o se agota, se prueba el siguiente
const GEMINI_MODELS = ['gemini-3.8-flash', 'gemini-3.5-flash-lite'];
// JSON Schema -> Schema de Gemini (tipos en mayúscula, sin additionalProperties)
function toGeminiSchema(sc) {
  const out = { type: String(sc.type).toUpperCase() };
  if (sc.enum) out.enum = sc.enum;
  if (sc.properties) {
    out.properties = {};
    for (const [k, v] of Object.entries(sc.properties)) out.properties[k] = toGeminiSchema(v);
    out.propertyOrdering = Object.keys(sc.properties);
  }
  if (sc.required) out.required = sc.required;
  if (sc.items) out.items = toGeminiSchema(sc.items);
  return out;
}
// Devuelve la respuesta con la misma forma que la de Claude, para que el resto del código no cambie
// Velocidad: poco "pensamiento", historial corto, respuesta acotada y, si un modelo tarda demasiado, el siguiente.
const GEMINI_TIMEOUT_MS = 15000;
const GEMINI_HISTORY = 12; // mensajes recientes que se envían (6 turnos)
async function geminiCall(messages, system, schema) {
  let recent = messages.slice(-GEMINI_HISTORY);
  while (recent.length > 1 && recent[0].role !== 'user') recent = recent.slice(1); // Gemini empieza con el usuario
  const contents = recent.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: typeof m.content === 'string' ? m.content : m.content.filter(b => b.type === 'text').map(b => b.text).join('') }],
  }));
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents,
    generationConfig: {
      responseMimeType: 'application/json', responseSchema: toGeminiSchema(schema), temperature: 1, maxOutputTokens: 1024,
      ...(S.settings.geminiNoThinkCfg ? {} : { thinkingConfig: { thinkingLevel: 'low' } }),
    },
    // Las bromas son pedidas por el usuario; lo grave sigue filtrado
    // En "Garabatos" el usuario pidió que lo insulten: no se filtra el acoso dirigido a él; el discurso de odio sigue filtrado
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: S.settings.troll === 'garabato' ? 'BLOCK_NONE' : 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
    ],
  };
  const models = [S.settings.geminiModel, ...GEMINI_MODELS].filter((m, i, a) => m && a.indexOf(m) === i);
  let lastErr = null, busy = false;
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      let res, data;
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), GEMINI_TIMEOUT_MS);
      try {
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': S.settings.geminiKey }, body: JSON.stringify(body), signal: ctl.signal,
        });
        data = await res.json().catch(() => null);
      } catch (e) {
        clearTimeout(timer);
        if (e.name === 'AbortError') { busy = true; lastErr = new Error('Gemini se demoró demasiado. Inténtalo otra vez.'); break; } // probar el modelo rápido
        if (attempt === 0) { await wait(1000); continue; }
        throw new Error('Sin conexión a internet. Trolo IA necesita internet.');
      }
      clearTimeout(timer);
      if (res.ok) {
        // Solo recordamos el modelo de respaldo si el principal no existe (no si estaba lento o saturado)
        if (S.settings.geminiModel !== model && !busy) { S.settings.geminiModel = model; save(); }
        const cand = data?.candidates?.[0];
        if (data?.promptFeedback?.blockReason || !cand || ['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII'].includes(cand.finishReason)) return { stop_reason: 'refusal', content: [] };
        const text = (cand.content?.parts || []).filter(x => x.text && !x.thought).map(x => x.text).join('');
        return { stop_reason: 'end_turn', content: [{ type: 'text', text }] };
      }
      const msg = data?.error?.message || '';
      // Si el modelo no acepta el ajuste de pensamiento, se quita y se reintenta
      if (res.status === 400 && /thinking/i.test(msg) && body.generationConfig.thinkingConfig) {
        delete body.generationConfig.thinkingConfig; S.settings.geminiNoThinkCfg = true; save(); attempt--; continue;
      }
      if ((res.status === 400 && /api key|api_key/i.test(msg)) || res.status === 401) throw new Error('Tu clave de Google no es válida. Revísala en Ajustes.');
      if (res.status === 403) throw new Error('Tu clave de Google no tiene permiso. Crea una nueva en aistudio.google.com.');
      if (res.status === 404) { lastErr = new Error(`El modelo ${model} no está disponible.`); break; }
      if (res.status === 429) { busy = true; lastErr = new Error('Llegaste al límite gratis de Gemini por ahora. Espera un minuto (o hasta mañana si fue el límite del día).'); break; }
      if (res.status >= 500 && attempt === 0) { await wait(1500); continue; }
      lastErr = new Error(`Error de Gemini (${res.status}): ${msg || 'desconocido'}`);
      break;
    }
  }
  throw lastErr || new Error('No pude hablar con Gemini.');
}

// ----- Voz de Trolo: voz natural de Gemini (gratis) con tono burlón; si falla, la del teléfono -----
const GEMINI_TTS_MODELS = ['gemini-3.1-flash-tts-preview', 'gemini-2.5-flash-preview-tts'];
const TROLL_VOICES = [
  { id: 'Puck', name: 'Puck', desc: 'Pícaro y alegre' },
  { id: 'Fenrir', name: 'Fenrir', desc: 'Exaltado y dramático' },
  { id: 'Charon', name: 'Charon', desc: 'Grave y sarcástico' },
];
let trolAudio = null, trolSeq = 0;
function stopTrolVoice() { trolSeq++; if (trolAudio) { try { trolAudio.pause(); } catch (e) {} trolAudio = null; } }
const trolVoiceOn = () => aiProvider() === 'gemini' && !!S.settings.geminiKey && S.settings.trolVoice !== 'phone' && (S.settings.ttsCoolUntil || 0) < Date.now();
// PCM 16 bits mono 24 kHz -> WAV reproducible
function pcmToWav(b64, rate = 24000) {
  const pcm = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const buf = new ArrayBuffer(44 + pcm.length), v = new DataView(buf);
  const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + pcm.length, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, pcm.length, true);
  new Uint8Array(buf, 44).set(pcm);
  return new Blob([buf], { type: 'audio/wav' });
}
async function geminiSpeak(text) {
  const body = {
    contents: [{ parts: [{ text: `Léelo en español de Chile, como un troll simpático, burlón y exagerado que se ríe con cariño: ${text}` }] }],
    generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: S.settings.trolVoiceName || 'Puck' } } } },
  };
  const models = [S.settings.ttsModel, ...GEMINI_TTS_MODELS].filter((m, i, a) => m && a.indexOf(m) === i);
  for (const model of models) {
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 12000);
    let res, data;
    try {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': S.settings.geminiKey }, body: JSON.stringify(body), signal: ctl.signal,
      });
      data = await res.json().catch(() => null);
    } catch (e) { clearTimeout(timer); return null; }
    clearTimeout(timer);
    if (res.ok) {
      const part = (data?.candidates?.[0]?.content?.parts || []).find(p => p.inlineData?.data);
      if (!part) return null;
      if (S.settings.ttsModel !== model) { S.settings.ttsModel = model; save(); }
      const rate = +((part.inlineData.mimeType || '').match(/rate=(\d+)/)?.[1] || 24000);
      return pcmToWav(part.inlineData.data, rate);
    }
    if (res.status === 404) continue;
    if (res.status === 429) { S.settings.ttsCoolUntil = Date.now() + 30 * 60 * 1000; save(); } // límite: 30 min con la voz del teléfono
    return null;
  }
  return null;
}
// Habla como Trolo. hooks = { onStart(), onRange(charIndex) } para mover el texto al ritmo de la voz.
// La promesa termina cuando deja de hablar (o cuando otra cosa lo hace callar).
async function trolSay(text, force = false, hooks = null) {
  stopTrolVoice();
  const my = trolSeq;
  if (!text || (!force && !S.settings.readAloud)) return;
  const phone = () => SP.speak(text, undefined, force, null, hooks && { onStart: hooks.onStart, onRange: c => hooks.onRange?.(c) });
  if (!trolVoiceOn()) return phone();
  SP.cancelAll();
  const wav = await geminiSpeak(text);
  if (my !== trolSeq) return; // el usuario ya siguió con otra cosa
  if (!wav) return phone();
  const a = new Audio(URL.createObjectURL(wav));
  trolAudio = a;
  return new Promise(resolve => {
    let timer = 0, over = false;
    const finish = () => { if (over) return; over = true; clearInterval(timer); URL.revokeObjectURL(a.src); if (trolAudio === a) trolAudio = null; resolve(); };
    // El audio de Gemini no trae marcas por palabra: se avanza el texto según el tiempo reproducido
    a.onplay = () => { hooks?.onStart?.(); if (hooks?.onRange) timer = setInterval(() => { if (a.duration) hooks.onRange(Math.floor(text.length * a.currentTime / a.duration)); }, 100); };
    a.onended = a.onpause = finish;
    a.play().catch(() => { finish(); phone(); });
  });
}
// Texto sincronizado con la voz: las palabras se encienden a medida que Trolo las dice
function karaoke(el, text) {
  const offs = []; let html = '';
  String(text).replace(/\S+|\s+/g, (m, off) => { if (/\S/.test(m)) { offs.push(off); html += `<span class="kw">${esc(m)}</span>`; } else html += m; return m; });
  el.innerHTML = html; el.classList.add('kara', 'wait');
  const spans = $$('.kw', el);
  return {
    at: c => { el.classList.remove('wait'); spans.forEach((w, i) => { w.classList.toggle('said', offs[i] <= c); w.classList.toggle('now', offs[i] <= c && (offs[i + 1] ?? 1e9) > c); }); },
    end: () => { el.classList.remove('wait', 'kara'); spans.forEach(w => w.classList.remove('now')); },
  };
}
// Trolo lee una o varias partes de la pantalla como una sola frase, y cada parte se ilumina al decirla
async function sayLines(items, force = false) {
  items = items.filter(([el, t]) => el && t);
  if (!items.length || (!force && !S.settings.readAloud)) return;
  let pos = 0;
  const segs = items.map(([el, t]) => { const seg = { k: karaoke(el, t), from: pos }; pos += t.length + 1; return seg; });
  const at = c => segs.forEach(sg => { if (c >= sg.from) sg.k.at(c - sg.from); });
  try { await trolSay(items.map(x => x[1]).join(' '), force, { onStart: () => at(0), onRange: at }); }
  finally { segs.forEach(sg => sg.k.end()); }
}

async function claudeCall(messages, system, schema) {
  const model = S.settings.aiModel || 'claude-opus-5-5';
  const body = { model, max_tokens: 16000, system, messages, output_config: { effort: 'low', format: { type: 'json_schema', schema } } };
  const headers = { 'content-type': 'application/json', 'x-api-key': S.settings.aiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' };
  if (model !== 'claude-haiku-5-5') { body.fallbacks = 'default'; headers['anthropic-beta'] = 'server-side-fallback-2026-07-01'; }
  for (let attempt = 0; ; attempt++) {
    let res, data;
    try {
      res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers, body: JSON.stringify(body) });
      data = await res.json().catch(() => null);
    } catch (e) {
      if (attempt < 2) { await wait(1500 * (attempt + 1)); continue; }
      throw new Error('Sin conexión a internet. Trolo IA necesita internet.');
    }
    if (res.ok) return data;
    const apiMsg = data?.error?.message || '';
    if ((res.status === 429 || res.status === 529 || res.status >= 500) && attempt < 2) { await wait(2000 * (attempt + 1)); continue; }
    if (res.status === 401) throw new Error('Tu clave de Anthropic no es válida. Revísala en Ajustes.');
    if (res.status === 429) throw new Error('Demasiados mensajes seguidos. Espera unos segundos.');
    if (res.status === 529 || res.status >= 500) throw new Error('El servicio de IA está saturado. Inténtalo en un momento.');
    if (/credit|balance|billing/i.test(apiMsg)) throw new Error('Tu cuenta de Anthropic no tiene saldo. Recárgala en console.anthropic.com.');
    throw new Error(`Error de la IA (${res.status}): ${apiMsg || 'desconocido'}`);
  }
}
const GRADE_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    score: { type: 'integer' }, reaction: { type: 'string', enum: Object.keys(STICKERS) }, roast: { type: 'string' },
    good: { type: 'array', items: { type: 'string' } }, missing: { type: 'array', items: { type: 'string' } }, wrong: { type: 'array', items: { type: 'string' } },
  },
  required: ['score', 'reaction', 'roast', 'good', 'missing', 'wrong'],
};
async function aiGradeExplain(ramoName, prompt, text) {
  const system = aiSystem('duda', null).split('\n\nFields:')[0] + `\n\nNow grade a spoken explanation (a speech-recognition transcript, so ignore punctuation and recognition glitches) for the course "${ramoName}". "score" is 0-100 for accuracy and completeness at the student's level. "roast" is Trolo's one-line reaction. "good" lists what was right, "missing" the key ideas left out, "wrong" any incorrect statements (each item short, in Spanish).`;
  const { out } = await aiCall([{ role: 'user', content: `Tema: ${prompt}\n\nExplicación del estudiante: ${text}` }], system, GRADE_SCHEMA);
  return { ...out, score: clamp(Math.round(out.score), 0, 100), good: out.good || [], missing: out.missing || [], wrong: out.wrong || [] };
}
function addAiCard(ramo, front, back) {
  if (!front || !back) return false;
  S.cards = S.cards || [];
  if (S.cards.some(c => c.front.toLowerCase() === front.toLowerCase())) return false;
  S.cards.push({ id: 'c' + Date.now().toString(36), ramo: ramo || '', front, back, due: dayNum(), ivl: 0, reps: 0 });
  if (S.cards.length > 300) S.cards = S.cards.slice(-300);
  save(); return true;
}
const GENDERS = [{ v: 'm', l: '🙋‍♂️ Hombre' }, { v: 'f', l: '🙋‍♀️ Mujer' }, { v: '', l: '🙂 Neutro' }];
function genderPicker() {
  const cur = gender() === 'n' ? '' : gender();
  return `<div class="seg" id="gnd">${GENDERS.map(x => `<button data-v="${x.v}" class="${cur === x.v ? 'on' : ''}">${x.l}</button>`).join('')}</div>
    <div class="small muted" style="margin-top:6px">${cur === 'f' ? 'Te trato de ella: weona, gila, enfermera.' : cur === 'm' ? 'Te trato de él: weón, gil, enfermero.' : 'Sin género: Trolo usa palabras neutras (crack).'}</div>`;
}
function wireGenderPicker(after) {
  $$('#gnd button').forEach(b => b.onclick = () => { S.settings.gender = b.dataset.v; save(); sfx('tap'); after(); });
}
function trollPicker() {
  const cur = S.settings.troll || 'spicy';
  return `<div class="seg" id="trl">${TROLL_LEVELS.map(l => `<button data-v="${l.id}" class="${cur === l.id ? 'on' : ''}">${l.e} ${l.name}</button>`).join('')}</div>
    <div class="small muted" style="margin-top:6px">${esc(TROLL_LEVELS.find(l => l.id === cur).desc)}</div>`;
}
function wireTrollPicker(after) {
  $$('#trl button').forEach(b => b.onclick = () => {
    S.settings.troll = b.dataset.v; save(); sfx(b.dataset.v === 'savage' || b.dataset.v === 'garabato' ? 'fail' : 'tap');
    toast(b.dataset.v === 'garabato' ? genderize(gender() === 'n' ? '🤬 Tú lo pediste. Elige si eres hombre o mujer para el weón/weona.' : '🤬 Tú lo pediste, {w}.') : b.dataset.v === 'savage' ? '💀 Tú lo pediste…' : b.dataset.v === 'soft' ? '😇 Ok, seré bueno (por ahora)' : '🌶️ Modo picante', 'special');
    after();
  });
}

// arg: "<ramo>" (elegir modo) o "<ramo>|<modo>" (conversación). Sin ramo: todos los ramos hasta tu semestre.
ROUTES.ai = (el, arg = '') => {
  if (!aiReady()) return aiSetup(el, arg);
  const [rid, mode] = String(arg).split('|');
  const ramo = R[rid] || null;
  if (!mode) {
    el.innerHTML = exHead('🤖') + `<div class="hero" style="margin-top:6px">${troll({ mood: 'smug', acc: S.wearing, size: 96, cls: 'bob' })}
        <div class="bubble-say grow">${ramo ? `¿${esc(ramo.name)}? A ver cuánto sabes… 😈` : 'Elige cómo quieres sufrir hoy. 😈'}</div></div>
      <div class="card sec"><b>¿Qué tan duro te trato?</b><div style="margin-top:8px">${trollPicker()}</div></div>
      <div class="stack sec">${Object.entries(AI_MODES).map(([k, m]) => `<button class="card" data-go="ai" data-arg="${rid || ''}|${k}" style="width:100%;text-align:left;display:flex;gap:14px;align-items:center">
        <span style="font-size:34px">${m.icon}</span><div class="grow"><h3>${m.title}</h3><div class="small muted">${m.desc}</div></div><span class="dim">›</span></button>`).join('')}</div>
      <div class="tip sec">💡 Cada error que corrija Trolo queda guardado en <b>Mis errores</b> para repasarlo.</div>${disclaimer()}`;
    setProg(0);
    wireTrollPicker(() => go('ai', arg));
    return;
  }
  const M2 = AI_MODES[mode] || AI_MODES.quiz;
  const system = aiSystem(mode, ramo) + aiVariety(mode, ramo, rid);
  const history = [];
  let busy = false, turns = 0, good = 0, cards = 0, streak = 0;
  el.innerHTML = exHead(M2.icon) + `<div class="row"><h2 class="grow" style="margin:0">${M2.title}</h2><span class="chip fire hidden" id="clean">🔥 0</span><button class="chip" id="end">Terminar</button></div>
    ${ramo ? `<div class="small muted">${esc(ramo.icon)} ${esc(ramo.name)}</div>` : ''}
    <div class="chat" id="chat"></div><div id="aimic" class="aimic"></div>`;
  setProg(0, '');
  const chat = $('#chat');
  const add = (cls, html) => { const b = document.createElement('div'); b.className = `msg ${cls}`; b.innerHTML = html; chat.appendChild(b); setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 30); return b; };
  $('#end').onclick = () => finish();
  micWidget($('#aimic'), {
    label: 'Toca y responde', allowType: true, silenceMs: 5000, maxMs: 120000,
    onFinal: alts => {
      if (busy) return;
      const text = String((alts || [])[0] || '').trim(); if (!text) return;
      add('me', esc(text)); send(text);
    },
  });
  async function send(text) {
    busy = true; $('#aimic').classList.add('busy');
    const typing = add('npc typing', `<span class="who">Trolo</span><span class="dots"><i></i><i></i><i></i></span>`);
    history.push({ role: 'user', content: text || aiStart() });
    try {
      const { out, content } = await aiCall(history, system);
      typing.remove();
      history.push({ role: 'assistant', content });
      rememberAi(rid, mode, out);
      await show(out, !!text);
    } catch (e) {
      typing.remove(); history.pop();
      const b = add('sys', `⚠️ ${esc(e.message)} <button class="btn sm" style="margin-top:8px">Reintentar</button>`);
      $('button', b).onclick = () => { b.remove(); send(text); };
    } finally { busy = false; $('#aimic')?.classList.remove('busy'); }
  }
  async function show(out, answered) {
    if (answered && out.verdict !== 'none') {
      turns++; count('ai'); S.aiTurns++;
      const right = out.verdict === 'correct';
      answer(rid || 'examen', right);
      if (right) { good++; streak++; addXp(15, true); } else streak = 0;
      const cl = $('#clean'); if (cl) { cl.textContent = `🔥 ${streak}`; cl.classList.toggle('hidden', streak < 2); }
      if (streak && streak % 5 === 0) setTimeout(() => addGems(3), 600);
      if (out.verdict !== 'correct' && addAiCard(rid, out.card_front, out.card_back)) cards++;
      save(); setProg(Math.min(1, turns / 10), `${good}/${turns}`);
    }
    if (out.roast || out.feedback) {
      const stk = STICKERS[out.reaction] || STICKERS.clap;
      var trolMsg = add('trol', `<div class="trolhead">${troll({ mood: stk.mood, acc: S.wearing, size: 38, cls: out.laughing ? 'shake' : 'jump' })}<b>Trolo</b><span class="grow"></span><span class="stk">${stk.e}</span></div>
        ${out.roast ? `<div class="roast">${esc(out.roast)}</div>` : ''}
        ${out.feedback ? `<div class="small" style="margin-top:6px">${esc(out.feedback)}</div>` : ''}
        ${answered && out.verdict !== 'correct' && out.card_front ? '<div class="small dim">+1 tarjeta en Mis errores</div>' : ''}`);
      if (answered) { sticker(out.reaction); sfx(stk.snd); }
    }
    const r = add('npc', `<span class="who">${mode === 'caso' ? 'Caso clínico' : 'Trolo'} <button class="spk sm-spk">🔊</button></span><span class="rtext">${esc(out.reply)}</span>`);
    const rt = $('.rtext', r);
    $('button', r).onclick = () => sayLines([[rt, out.reply]], true);
    sayLines([...(out.roast && answered && trolMsg ? [[$('.roast', trolMsg), out.roast]] : []), [rt, out.reply]]);
  }
  function finish() {
    SP.cancelAll();
    if (turns >= 3) { addXp(20 + turns * 5); confetti(80); sfx('great'); }
    modal({ mood: turns ? 'party' : 'sad', title: turns ? '¡Sesión terminada!' : '¿Ya te vas?',
      text: turns ? `Respondiste <b>${turns}</b> veces (${good} bien) y guardaste <b>${cards}</b> ${cards === 1 ? 'error' : 'errores'} para repasar.` : 'Ni una respuesta… Trolo está decepcionado.',
      buttons: [{ label: cards ? 'Repasar mis errores' : 'Otra sesión', cls: 'primary', onClick: () => go(cards ? 'errores' : 'ai', cards ? undefined : rid) }, { label: 'Salir', onClick: () => back() }] });
  }
  onCleanup(() => { SP.cancelAll(); stopTrolVoice(); });
  send('');
};
function aiSetup(el, arg) {
  const prov = aiProvider(), free = prov === 'gemini';
  el.innerHTML = exHead('🤖') + `<div class="center">${troll({ mood: 'think', acc: S.wearing, size: 110 })}</div>
    <h1>Trolo IA</h1>
    <p class="muted">Una IA que te interroga, simula casos clínicos y resuelve tus dudas. Y se ríe de tus errores.</p>
    <div class="seg" id="prov" style="margin:6px 0 12px"><button data-v="gemini" class="${free ? 'on' : ''}">🆓 Gratis (Google Gemini)</button><button data-v="claude" class="${free ? '' : 'on'}">💳 Claude (de pago)</button></div>
    ${free ? `<div class="card stack">
      <div><b>1.</b> Entra a <b>aistudio.google.com</b> con tu cuenta de Google.</div>
      <div><b>2.</b> Toca <b>Get API key</b> y luego <b>Create API key</b>. Es gratis y no pide tarjeta.</div>
      <div><b>3.</b> Copia la clave (empieza con <b>AQ.</b>; las antiguas, con <b>AIza</b>) y pégala aquí. Se guarda solo en este teléfono.</div>
      <input type="text" id="key" placeholder="AQ...." autocomplete="off" autocapitalize="off" spellcheck="false">
      <button class="btn primary block" id="savekey">Guardar y probar</button><div id="keyres"></div>
      <p class="small muted">La capa gratis tiene un límite diario (alcanza para estudiar harto) y Google puede usar esas conversaciones para mejorar sus productos: no le cuentes datos personales ni de pacientes reales.</p>
    </div>` : `<div class="card stack">
      <div><b>1.</b> Crea una cuenta en <b>console.anthropic.com</b> y carga un poco de saldo. Se cobra por uso; Haiku es mucho más barato.</div>
      <div><b>2.</b> Ve a <b>API Keys</b>, crea una clave y cópiala.</div>
      <div><b>3.</b> Pégala aquí. Se guarda solo en este teléfono.</div>
      <input type="text" id="key" placeholder="sk-ant-..." autocomplete="off" autocapitalize="off" spellcheck="false">
      <div class="seg" id="mdl">${AI_MODELS.map(m => `<button data-v="${m.id}" class="${S.settings.aiModel === m.id ? 'on' : ''}">${m.name.replace('Claude ', '')}</button>`).join('')}</div>
      <div class="small muted" id="mnote">${esc((AI_MODELS.find(m => m.id === S.settings.aiModel) || AI_MODELS[0]).note)}</div>
      <button class="btn primary block" id="savekey">Guardar y probar</button><div id="keyres"></div>
    </div>`}`;
  setProg(0);
  $$('#prov button').forEach(b => b.onclick = () => { S.settings.aiProvider = b.dataset.v; save(); aiSetup(el, arg); });
  $$('#mdl button').forEach(b => b.onclick = () => { S.settings.aiModel = b.dataset.v; save(); $$('#mdl button').forEach(x => x.classList.toggle('on', x === b)); $('#mnote').textContent = AI_MODELS.find(m => m.id === b.dataset.v).note; });
  $('#savekey').onclick = async () => {
    const k = $('#key').value.trim();
    const field = free ? 'geminiKey' : 'aiKey';
    if (free ? !/^(AQ\.|AIza)\S{10,}$/.test(k) : !/^sk-ant-/.test(k)) {
      $('#keyres').innerHTML = `<div class="micerr"><div class="errbox">${free ? 'La clave de Google debe empezar con “AQ.” (o “AIza” si es antigua). Cópiala completa, sin espacios.' : 'La clave debe empezar con “sk-ant-”.'}</div></div>`;
      return;
    }
    S.settings.aiProvider = prov; S.settings[field] = k; save();
    $('#savekey').disabled = true; $('#keyres').innerHTML = '<p class="small muted center">Probando la clave…</p>';
    try {
      await aiCall([{ role: 'user', content: AI_START }], aiSystem('duda', null));
      sfx('great'); confetti(80); toast('¡Clave lista!', 'xp'); go('ai', arg);
    } catch (e) {
      S.settings[field] = ''; save(); $('#savekey').disabled = false;
      $('#keyres').innerHTML = `<div class="micerr"><div class="errbox">${esc(e.message)}</div></div>`;
    }
  };
}

// ----- Mis errores (tarjetas que dejó Trolo IA) -----
ROUTES.errores = el => {
  const d = dayNum();
  const list = shuffle((S.cards || []).filter(c => c.due <= d)).slice(0, 15);
  if (!list.length) { el.innerHTML = exHead('😬') + endCard({ mood: 'happy', title: 'Nada pendiente', lines: [(S.cards || []).length ? 'Ya repasaste tus errores de hoy. Vuelven cuando toque.' : 'Todavía no tienes errores guardados. Habla con Trolo IA.'], buttons: [{ go: 'ai', label: '🤖 Trolo IA', primary: true }] }); return; }
  let i = 0, ok = 0;
  el.innerHTML = exHead('😬') + '<div id="stage"></div>';
  const stage = $('#stage');
  function show() {
    if (i >= list.length) { setProg(1, '✓'); sfx('great'); addXp(ok * 5); stage.innerHTML = endCard({ title: '¡Errores repasados!', lines: [`${ok}/${list.length} los sabías.`], buttons: [{ go: 'home', label: 'Inicio', primary: true }] }); return; }
    const c = list[i];
    setProg(i / list.length, `${i + 1}/${list.length}`);
    stage.innerHTML = `<div class="prompt"><div class="kicker">${esc(R[c.ramo]?.name || 'Mis errores')}</div><div class="big" style="font-size:22px">${esc(c.front)}</div></div>
      <p class="small muted center">Respóndelo en voz alta o en tu cabeza, y luego mira la respuesta.</p>
      <button class="btn primary block" id="show">Ver respuesta</button><div id="ans"></div>`;
    $('#show').onclick = () => {
      $('#show').remove();
      $('#ans').innerHTML = `<div class="result mid"><div class="verdict">${esc(c.back)}</div></div>
        <div class="row" style="margin-top:12px"><button class="btn grow" id="no">😬 No la sabía</button><button class="btn primary grow" id="si">✅ La sabía</button></div>`;
      const grade = knew => {
        if (knew) { ok++; c.ivl = c.reps === 0 ? 2 : c.ivl * 2.5; c.reps++; sfx('ok'); } else { c.ivl = 0; c.reps = 0; sfx('fail'); }
        c.due = dayNum() + Math.round(c.ivl); save(); i++; show();
      };
      $('#no').onclick = () => grade(false); $('#si').onclick = () => grade(true);
    };
  }
  show();
};

// ================= Retos =================
ROUTES.quests = el => {
  const qs = todaysQuests();
  const allClaimed = qs.every(q => S.quests.claimed.includes(q.id));
  el.innerHTML = `<h1 style="margin-top:8px">Retos de hoy</h1><p class="muted">Se renuevan cada día. Cumple los 3 y abre el cofre.</p>
    <div class="card">${qs.map(q => { const v = questVal(q), done = v >= q.goal, claimed = S.quests.claimed.includes(q.id); return `<div class="quest"><div class="qi">${claimed ? '✅' : q.e}</div><div class="grow"><div style="font-weight:800">${esc(q.t)}</div><div class="bar gold"><i style="width:${v / q.goal * 100}%"></i></div><div class="small muted" style="margin-top:4px">${v}/${q.goal} · 💎 ${q.gems}</div></div>${claimed ? '' : done ? `<button class="btn primary sm" data-claim="${q.id}">Cobrar</button>` : ''}</div>`; }).join('')}</div>
    <div class="card center sec ${allClaimed && !S.quests.chest ? 'glow' : ''}"><div style="font-size:56px;${allClaimed ? '' : 'filter:grayscale(1);opacity:.5'}">${S.quests.chest ? '📭' : '🎁'}</div>
      <h3>Cofre diario</h3><p class="small muted">${S.quests.chest ? 'Ya lo abriste hoy.' : allClaimed ? '¡Listo para abrir!' : 'Cobra los 3 retos para abrirlo.'}</p>
      ${allClaimed && !S.quests.chest ? '<button class="btn primary block" id="chest">Abrir cofre</button>' : ''}</div>
    <div class="grid2 sec">
      <div class="card center"><div class="stat-big">🔥 ${currentStreak()}</div><div class="stat-lbl">racha · mejor ${S.streak.best || 0}</div></div>
      <div class="card center"><div class="stat-big">🛡️ ${S.freezes}</div><div class="stat-lbl">escudos de racha</div></div>
      <div class="card center"><div class="stat-big">⚡ ${S.rafagaBest}</div><div class="stat-lbl">récord de Ráfaga</div></div>
      <div class="card center"><div class="stat-big">💉 ${S.dosis.ok}</div><div class="stat-lbl">cálculos correctos</div></div>
    </div>`;
  $$('[data-claim]', el).forEach(b => b.onclick = () => { const q = QUESTS.find(x => x.id === b.dataset.claim); if (!q || S.quests.claimed.includes(q.id)) return; S.quests.claimed.push(q.id); save(); addGems(q.gems); confetti(60); go('quests'); });
  const c = $('#chest');
  if (c) c.onclick = () => { S.quests.chest = true; const prize = 30 + Math.floor(Math.random() * 31); S.gems += prize; save(); sfx('level'); confetti(200); renderTop(); modal({ mood: 'party', title: `¡+${prize} 💎!`, text: 'Cofre abierto. Gástalas en la tienda.', buttons: [{ label: 'Ir a la tienda', cls: 'primary', onClick: () => go('shop') }, { label: 'Cerrar' }] }); go('quests'); };
};

// ================= Tienda =================
const SHOP = {
  themes: [
    { id: 'lime', name: 'Menta quirófano', price: 0, color: '#3ef0c4' },
    { id: 'pink', name: 'Rosa neonatología', price: 120, color: '#ff5fb0' },
    { id: 'ocean', name: 'Azul urgencias', price: 120, color: '#45d4ff' },
    { id: 'lava', name: 'Naranja código', price: 150, color: '#ff7a2f' },
    { id: 'gold', name: 'Oro titulación', price: 300, color: '#ffd23f' },
  ],
  acc: [
    { id: 'cofia', name: 'Cofia', price: 0, e: '👩‍⚕️' },
    { id: 'stetho', name: 'Estetoscopio', price: 80, e: '🩺' },
    { id: 'mask', name: 'Mascarilla', price: 60, e: '😷' },
    { id: 'glasses', name: 'Gafas de crack', price: 80, e: '🕶️' },
    { id: 'crown', name: 'Corona', price: 250, e: '👑' },
  ],
};
const HEAD = ['cofia', 'crown', 'cap', 'headphones'];
ROUTES.shop = el => {
  el.innerHTML = `<div class="row" style="margin-top:8px"><h1 class="grow">Tienda</h1><span class="chip gem" style="font-size:18px">💎 ${fmtNum(S.gems)}</span></div>
    <p class="muted">Gana gemas con retos, logros y subiendo de nivel.</p>
    <div class="card center">${troll({ mood: 'smug', acc: S.wearing, size: 130, cls: 'bob' })}<div class="small muted">Así se ve tu Trolo</div></div>
    <div class="sec-title">Accesorios</div>
    ${SHOP.acc.map(a => { const own = S.owned.acc.includes(a.id), on = S.wearing.includes(a.id); return `<div class="shop-item"><div class="sw">${a.e}</div><div class="grow"><b>${a.name}</b><div class="small muted">${own ? (on ? 'Puesto' : 'Tuyo') : `💎 ${a.price}`}</div></div>
      ${own ? `<button class="btn sm ${on ? '' : 'primary'}" data-wear="${a.id}">${on ? 'Quitar' : 'Poner'}</button>` : `<button class="btn sm blue" data-buy="acc:${a.id}" ${S.gems < a.price ? 'disabled' : ''}>Comprar</button>`}</div>`; }).join('')}
    <div class="sec-title">Colores</div>
    ${SHOP.themes.map(t => { const own = S.owned.themes.includes(t.id), on = S.theme === t.id; return `<div class="shop-item"><div class="sw" style="background:${t.color}"></div><div class="grow"><b>${t.name}</b><div class="small muted">${own ? (on ? 'En uso' : 'Tuyo') : `💎 ${t.price}`}</div></div>
      ${own ? (on ? '<span class="small muted">✓</span>' : `<button class="btn sm primary" data-theme="${t.id}">Usar</button>`) : `<button class="btn sm blue" data-buy="theme:${t.id}" ${S.gems < t.price ? 'disabled' : ''}>Comprar</button>`}</div>`; }).join('')}
    <div class="sec-title">Potenciadores</div>
    <div class="shop-item"><div class="sw">🛡️</div><div class="grow"><b>Escudo de racha</b><div class="small muted">Salva tu racha si un día no llegas a la meta. Tienes ${S.freezes}/3 · 💎 60</div></div>
      <button class="btn sm blue" data-buy="freeze" ${S.gems < 60 || S.freezes >= 3 ? 'disabled' : ''}>Comprar</button></div>`;
  $$('[data-buy]', el).forEach(b => b.onclick = () => {
    const [kind, id] = b.dataset.buy.split(':');
    const item = kind === 'acc' ? SHOP.acc.find(x => x.id === id) : kind === 'theme' ? SHOP.themes.find(x => x.id === id) : { price: 60 };
    if (S.gems < item.price) return;
    S.gems -= item.price;
    if (kind === 'acc') { S.owned.acc.push(id); S.wearing = S.wearing.filter(w => !(HEAD.includes(w) && HEAD.includes(id))); S.wearing.push(id); }
    else if (kind === 'theme') { S.owned.themes.push(id); S.theme = id; }
    else S.freezes = Math.min(3, S.freezes + 1);
    save(); applySettings(); sfx('coin'); confetti(90); toast('¡Comprado!', 'gem'); go('shop');
  });
  $$('[data-wear]', el).forEach(b => b.onclick = () => {
    const id = b.dataset.wear;
    if (S.wearing.includes(id)) S.wearing = S.wearing.filter(w => w !== id);
    else { S.wearing = S.wearing.filter(w => !(HEAD.includes(w) && HEAD.includes(id))); S.wearing.push(id); }
    save(); sfx('tap'); go('shop');
  });
  $$('[data-theme]', el).forEach(b => b.onclick = () => { S.theme = b.dataset.theme; save(); applySettings(); sfx('tap'); go('shop'); });
};

// ================= Perfil =================
ROUTES.profile = el => {
  const li = levelInfo();
  const days = [];
  for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d); }
  const max = Math.max(S.settings.goal, ...days.map(d => S.days[dateKey(d)]?.ok || 0));
  const dn = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  const acc = S.answered ? Math.round(S.correct / S.answered * 100) : 0;
  const ranked = Object.entries(S.byRamo).filter(([, b]) => b.seen >= 5).map(([id, b]) => ({ id, acc: b.ok / b.seen })).sort((a, b) => a.acc - b.acc).slice(0, 3);
  el.innerHTML = `
    <div class="card center" style="margin-top:8px">${troll({ mood: 'happy', acc: S.wearing, size: 120, cls: 'bob' })}
      <h2 style="margin:6px 0 0">${esc(S.name || 'Sin nombre')}</h2><div class="muted small">Semestre ${S.sem} · Nivel ${li.L} · ${li.title}</div>
      <div class="bar" style="margin-top:10px"><i style="width:${li.pct * 100}%"></i></div><div class="small dim" style="margin-top:4px">${fmtNum(S.xp)} XP · faltan ${fmtNum(li.toNext)}</div></div>
    <div class="grid2 sec">
      <div class="card"><div class="stat-big">${fmtNum(S.correct)}</div><div class="stat-lbl">respuestas correctas</div></div>
      <div class="card"><div class="stat-big">${acc}%</div><div class="stat-lbl">acierto global</div></div>
      <div class="card"><div class="stat-big">${S.dosis.ok}</div><div class="stat-lbl">cálculos de dosis bien</div></div>
      <div class="card"><div class="stat-big">${(S.cards || []).length}</div><div class="stat-lbl">errores guardados</div></div>
    </div>
    <div class="card sec"><h3>Correctas por día · 14 días</h3>
      <div class="bars" style="margin-top:10px">${days.map(d => { const s = S.days[dateKey(d)]?.ok || 0; return `<div class="b ${s >= S.settings.goal ? 'goal' : ''}"><i style="height:${(s / max * 82).toFixed(1)}%"></i><span>${dn[d.getDay()]}</span></div>`; }).join('')}</div></div>
    ${ranked.length ? `<div class="card sec"><h3>😬 Tus ramos más débiles</h3>${ranked.map(r => `<button class="row small" data-go="ramo" data-arg="${r.id}" style="width:100%;padding:8px 0;border-top:1px solid var(--line)"><span class="grow" style="text-align:left">${esc(R[r.id]?.icon || '')} ${esc(R[r.id]?.name || r.id)}</span><b class="score ${scoreClass(r.acc)}" style="font-size:15px">${Math.round(r.acc * 100)}%</b></button>`).join('')}</div>` : ''}
    <div class="sec-title">Logros · ${Object.keys(S.badges).length}/${BADGES.length}</div>
    <div class="badges">${BADGES.map(b => `<div class="badge ${S.badges[b.id] ? '' : 'locked'}"><span class="e">${b.e}</span><b>${b.t}</b></div>`).join('')}</div>
    <button class="btn block sec" data-go="settings">⚙️ Ajustes</button>`;
};

// ================= Ajustes =================
ROUTES.settings = el => {
  const vs = SP.voices();
  el.innerHTML = exHead('⚙️') + `<h1>Ajustes</h1>
    <div class="card">
      <label class="field"><span>Tu nombre</span><input type="text" id="nm" maxlength="20" value="${esc(S.name)}"></label>
      <div class="field"><span>Semestre actual</span><div class="seg" id="sm" style="flex-wrap:wrap">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<button data-v="${n}" class="${S.sem === n ? 'on' : ''}" style="flex:0 0 18%">${n}</button>`).join('')}</div></div>
      <div class="field"><span>Meta diaria (respuestas correctas)</span><div class="seg" id="gl">${[10, 15, 25, 40].map(m => `<button data-v="${m}" class="${S.settings.goal === m ? 'on' : ''}">${m}</button>`).join('')}</div></div>
      <div class="field"><span>¿Cómo te trato?</span>${genderPicker()}</div>
      <div class="field"><span>Nivel de troleo</span>${trollPicker()}</div>
      <label class="toggle">Trolo se burla en voz alta cuando fallas en el quiz 🗣️<input type="checkbox" id="ins" ${S.settings.insultVoice !== false ? 'checked' : ''}></label>
    </div>
    <div class="card sec"><h3>Voz y micrófono</h3>
      <label class="field" style="margin-top:10px"><span>Voz en español</span><select id="vc"><option value="">La más natural (automática)</option>${vs.map(v => `<option value="${esc(v.name)}" ${v.name === S.settings.voice ? 'selected' : ''}>${esc(v.name)} (${esc(v.lang)})</option>`).join('')}</select></label>
      <label class="field"><span>Velocidad: <b id="rv">${S.settings.rate}</b></span><input type="range" id="rt" min="0.7" max="1.3" step="0.05" value="${S.settings.rate}"></label>
      <div class="row"><button class="btn sm grow" id="tv">🔊 Probar voz</button><button class="btn sm grow" data-go="mictest">🎤 Probar micrófono</button></div>
      ${SP.isNative ? '<div class="row" style="margin-top:10px"><button class="btn sm grow" data-native="app">Permisos</button><button class="btn sm grow" data-native="ttsdata">Instalar voz</button></div>' : ''}
      <label class="toggle" style="margin-top:10px">Leer en voz alta explicaciones y a Trolo<input type="checkbox" id="ra" ${S.settings.readAloud ? 'checked' : ''}></label>
      <label class="toggle">Efectos de sonido<input type="checkbox" id="snd" ${S.settings.sound ? 'checked' : ''}></label>
      <label class="toggle">Sonido gracioso al equivocarte 🤡<input type="checkbox" id="fny" ${S.settings.funnyFail !== false ? 'checked' : ''}></label>
      <button class="btn sm block" id="fnyt" style="margin-bottom:8px">🎺 Escuchar un sonido de error</button>
      <label class="toggle">Vibración<input type="checkbox" id="hap" ${S.settings.haptics ? 'checked' : ''}></label>
    </div>
    <div class="card sec"><h3>🤖 Trolo IA</h3>
      ${(() => { const free = aiProvider() === 'gemini', key = free ? S.settings.geminiKey : S.settings.aiKey; return `
      <div class="seg" id="aip" style="margin:8px 0"><button data-v="gemini" class="${free ? 'on' : ''}">🆓 Gemini (gratis)</button><button data-v="claude" class="${free ? '' : 'on'}">💳 Claude</button></div>
      <p class="small muted" style="margin-top:4px">${key ? `Clave guardada: <b>${esc(key.slice(0, 8))}…${esc(key.slice(-4))}</b>${free && S.settings.geminiModel ? ` · ${esc(S.settings.geminiModel)}` : ''}` : 'Sin clave todavía.'}</p>
      ${free ? `<p class="small dim">Gratis con límite diario. Google puede usar las conversaciones para mejorar sus productos: no compartas datos personales.</p>
      <div class="field" style="margin:10px 0 0"><span>Voz de Trolo</span><div class="seg" id="tvo"><button data-v="phone" class="${S.settings.trolVoice === 'phone' ? 'on' : ''}">⚡ Google</button>${TROLL_VOICES.map(v => `<button data-v="${v.id}" class="${S.settings.trolVoice !== 'phone' && (S.settings.trolVoiceName || 'Puck') === v.id ? 'on' : ''}">${v.name}</button>`).join('')}</div>
        <div class="small muted" style="margin-top:6px">${S.settings.trolVoice === 'phone' ? 'Recomendada: la voz de Google del teléfono (la del Traductor). Suena al instante y el texto se ilumina al ritmo de la voz.' : `Voz de Gemini (${esc((TROLL_VOICES.find(v => v.id === (S.settings.trolVoiceName || 'Puck')) || TROLL_VOICES[0]).desc.toLowerCase())}): más actuada, pero tarda unos segundos en llegar; el texto espera a la voz. Si llegas al límite gratis, vuelve a la de Google.`}</div>
        <button class="btn sm block" id="tvtest" style="margin-top:8px">🔊 Probar voz de Trolo</button></div>` : `<div class="seg" id="aim" style="margin:8px 0">${AI_MODELS.map(m => `<button data-v="${m.id}" class="${S.settings.aiModel === m.id ? 'on' : ''}">${m.name.replace('Claude ', '')}</button>`).join('')}</div>`}
      <div class="row" style="margin-top:6px"><button class="btn sm grow" id="aikey">${key ? 'Cambiar clave' : 'Agregar clave'}</button>${key ? '<button class="btn sm grow" id="aidel">Borrar clave</button>' : ''}</div>`; })()}
    </div>
    <div class="card sec"><h3>Tus datos</h3><p class="small muted">Todo se guarda en este teléfono.</p>
      <div class="row"><button class="btn sm grow" id="ex">Exportar</button><button class="btn sm grow" id="im">Importar</button></div>
      <button class="btn ghost block" id="rs" style="color:var(--red);margin-top:8px">Borrar todo mi progreso</button></div>
    <p class="small dim center sec">TrolEnfermería 1.7 · ${SP.isNative ? 'App Android' : SP.isIOS ? (SP.standalone ? 'App iPhone' : 'iPhone (Safari)') : SP.standalone ? 'App web' : 'Web'} · voz: ${SP.available() ? 'disponible' : 'no disponible'}</p>${disclaimer()}`;
  setProg(1);
  $('#nm').onchange = e => { S.name = e.target.value.trim().slice(0, 20); save(); };
  $$('#sm button').forEach(b => b.onclick = () => { S.sem = +b.dataset.v; save(); go('settings'); });
  $$('#gl button').forEach(b => b.onclick = () => { S.settings.goal = +b.dataset.v; save(); go('settings'); });
  wireTrollPicker(() => go('settings'));
  wireGenderPicker(() => go('settings'));
  $('#ins').onchange = e => { S.settings.insultVoice = e.target.checked; save(); };
  $('#vc').onchange = e => { S.settings.voice = e.target.value; save(); applySettings(); speak('Hola, así sueno yo.', true); };
  $('#rt').oninput = e => { S.settings.rate = +e.target.value; $('#rv').textContent = S.settings.rate; save(); applySettings(); };
  $('#tv').onclick = () => speak('Hola, soy Trolo. Vamos a estudiar enfermería.', true);
  $('#ra').onchange = e => { S.settings.readAloud = e.target.checked; save(); };
  $('#snd').onchange = e => { S.settings.sound = e.target.checked; save(); applySettings(); };
  $('#hap').onchange = e => { S.settings.haptics = e.target.checked; save(); applySettings(); };
  $('#fny').onchange = e => { S.settings.funnyFail = e.target.checked; save(); applySettings(); };
  $('#fnyt').onclick = () => { if (!S.settings.sound) toast('Activa los efectos de sonido primero.'); sfx('fail'); };
  $$('#aim button').forEach(b => b.onclick = () => { S.settings.aiModel = b.dataset.v; save(); go('settings'); });
  $$('#aip button').forEach(b => b.onclick = () => { S.settings.aiProvider = b.dataset.v; save(); go('settings'); });
  $$('#tvo button').forEach(b => b.onclick = () => {
    if (b.dataset.v === 'phone') S.settings.trolVoice = 'phone'; else { S.settings.trolVoice = 'ai'; S.settings.trolVoiceName = b.dataset.v; S.settings.ttsCoolUntil = 0; }
    save(); go('settings');
  });
  const tvt = $('#tvtest'); if (tvt) tvt.onclick = () => trolSay('JAJAJA, ¿eso respondiste? Ya po, lee la explicación y vuelve a intentarlo.', true);
  const keyField = () => aiProvider() === 'gemini' ? 'geminiKey' : 'aiKey';
  $('#aikey').onclick = () => { S.settings.aiProvider = aiProvider(); S.settings[keyField()] = ''; save(); go('ai'); };
  const aidel = $('#aidel'); if (aidel) aidel.onclick = () => { S.settings[keyField()] = ''; save(); toast('Clave borrada'); go('settings'); };
  $('#ex').onclick = () => {
    const json = JSON.stringify({ ...S, settings: { ...S.settings, aiKey: '', geminiKey: '' } }); // las claves no salen del teléfono
    modal({ mood: 'think', title: 'Tu respaldo', text: 'Copia este texto y guárdalo.', html: `<textarea id="bk" rows="6" readonly style="font-size:11px">${esc(json)}</textarea>`, buttons: [{ label: 'Copiar', cls: 'primary', onClick: () => copy(json) }, { label: 'Cerrar' }] });
  };
  $('#im').onclick = () => {
    modal({ mood: 'think', title: 'Importar respaldo', text: 'Pega aquí el texto de tu respaldo.', html: '<textarea id="bk" rows="6" style="font-size:11px"></textarea>', buttons: [{ label: 'Importar', cls: 'primary' }, { label: 'Cancelar' }] });
    $('[data-mb="0"]').onclick = () => {
      try {
        const d = JSON.parse($('#bk').value);
        if (typeof d.xp !== 'number') throw new Error('formato');
        const base = DEFAULT(), key = S.settings.aiKey, gkey = S.settings.geminiKey;
        S = { ...base, ...d, settings: { ...base.settings, ...d.settings, aiKey: key, geminiKey: gkey }, owned: { ...base.owned, ...d.owned }, streak: { ...base.streak, ...d.streak }, dosis: { ...base.dosis, ...d.dosis } };
        saveNow(); applySettings(); closeModal(); toast('Progreso importado', 'xp'); go('home');
      } catch (e) { toast('Ese texto no es un respaldo válido.'); }
    };
  };
  $('#rs').onclick = () => modal({ mood: 'sad', title: '¿Borrar todo?', text: 'Perderás tu XP, gemas, racha y repasos. No se puede deshacer.', buttons: [{ label: 'Sí, borrar todo', cls: 'pink', onClick: () => { S = DEFAULT(); saveNow(); applySettings(); go('onboarding'); } }, { label: 'Cancelar' }] });
};
function copy(text) {
  const done = () => toast('Copiado ✓', 'xp');
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
  function fallback() { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { toast('Selecciona el texto y cópialo a mano.'); } ta.remove(); }
}

// ================= Arranque =================
applySettings();
todaysQuests();
go(S.onboarded ? 'home' : 'onboarding');
})();
