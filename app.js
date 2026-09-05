'use strict';

/* ============================================================
   ACnimbus · Tormenta de palabras para el aula
   VERSIÓN FINAL + música de fondo + crecimiento animado
   ============================================================ */

/* ============================================================
   1 · CONSTANTES Y UTILIDADES
============================================================ */
const T_KEY     = 'chubasco:teacher';
const S_KEY     = 'chubasco:student';
const H_KEY     = 'chubasco:history';
const THEME_KEY = 'chubasco:theme';
const SOUND_KEY = 'chubasco:sound';
const MUSIC_KEY = 'chubasco:music';

/* ⚠️ CLAVE DEL PROFESOR — cámbiala por la que quieras.
   Sin esta clave nadie puede abrir el panel del profesor.
   (Entre comillas simples, sin apóstrofes dentro, sin espacios) */
const TEACHER_PASS = 'PROFE-2025';

const MAX_LEN    = 40;
const COOLDOWN   = 1200;
const MAX_UNIQUE = 60;
const MAX_Q      = 10;
const VOTES_PER_STUDENT = 3;

const PALETTE = ['#FF5D3A','#0E9594','#F3A712','#2E6F95','#D1465F','#6FA540'];

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function el(tag, cls, text){
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

const uid = () => (crypto.randomUUID
  ? crypto.randomUUID()
  : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2));

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function hashString(s){
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.codePointAt(0)) | 0;
  return Math.abs(h);
}

const colorOf = key => PALETTE[hashString(key) % PALETTE.length];

const pctStr = p => p.toLocaleString('es-ES', { maximumFractionDigits: 1 }) + ' %';
const numStr = n => n.toLocaleString('es-ES', { maximumFractionDigits: 1 });

const escHTML = s => String(s).replace(/[&<>"]/g, c =>
  ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));

const svgNS = 'http://www.w3.org/2000/svg';
function svgEl(tag, attrs){
  const n = document.createElementNS(svgNS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  return n;
}

function normalizeKey(t){
  return String(t).toLowerCase()
    .replaceAll('ñ', '\u0001')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0001/g, 'ñ')
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

function sanitizeAnswer(raw){
  let s = String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_LEN);
  if (!s) return null;
  if (/(https?:\/\/|www\.)/i.test(s)) return null;
  if (!/^[\p{L}\p{N}\s.,!¡¿?;:'’\-()%&+]+$/u.test(s)) return null;
  return s;
}

function sanitizeName(raw){
  const s = String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, 24);
  if (!s) return '';
  return /^[\p{L}\p{N} .,'’\-]+$/u.test(s) ? s : '';
}

/* ============================================================
   2 · TOASTS E ICONOS
============================================================ */
function toast(msg, type = ''){
  const t = el('div', 'toast' + (type ? ' ' + type : ''), msg);
  $('#toasts').append(t);
  setTimeout(() => { t.classList.add('gone'); setTimeout(() => t.remove(), 350); }, 2600);
}

const ICONS = {
  play : '<svg class="i" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5 19 12 7 19.5z"/></svg>',
  pause: '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M9 5v14M15 5v14"/></svg>',
  chart: '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 20v-7M12 20V5M18 20v-10"/></svg>'
};

const ICON_SOUND = '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/></svg>';
const ICON_MUTE  = '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M22 9l-6 6M16 9l6 6"/></svg>';
const ICON_MUSIC = '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';
const ICON_MUSIC_OFF = '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/><path d="M2 2l20 20"/></svg>';
const ICON_MOON  = '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>';
const ICON_SUN   = '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const ICON_STAR  = '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.5 14.9 8.6 21.5 9.5 16.7 14.1 17.9 20.7 12 17.6 6.1 20.7 7.3 14.1 2.5 9.5 9.1 8.6z"/></svg>';
const ICON_TRASH_SM = '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/></svg>';

const TRASH_SVG = ICON_TRASH_SM;
const SEND_SVG  = '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 3 10 14M21 3l-7 18-4-7-7-4 18-7z"/></svg>';

const SVG_CLOCK  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>';
const SVG_PAUSE  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M9 6v12M15 6v12"/></svg>';
const SVG_NEXT   = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h14M13 6l6 6-6 6"/></svg>';
const SVG_CLOUD  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 15a3.5 3.5 0 0 0 0-7 5.5 5.5 0 0 0-10.8 1.2A4 4 0 0 0 7 15h10.5z"/><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/></svg>';

/* ============================================================
   3 · STORE FIREBASE
============================================================ */
const firebaseConfig = {
  apiKey:            "AIzaSyD4z8oA77TdBu54z0vdCt7PbM011EtoNGI",
  authDomain:        "lluvia1-925b4.firebaseapp.com",
  projectId:         "lluvia1-925b4",
  storageBucket:     "lluvia1-925b4.firebasestorage.app",
  messagingSenderId: "273174021964",
  appId:             "1:273174021964:web:899db28c7d320c47daf1e9"
};

const FIREBASE_OK = !Object.values(firebaseConfig).some(v => String(v).includes('PEGA-AQUI'));

let fdb = null;
if (FIREBASE_OK){
  firebase.initializeApp(firebaseConfig);
  fdb = firebase.firestore();
  fdb.settings({ ignoreUndefinedProperties: true });
} else {
  setTimeout(() => toast('Falta la configuración de Firebase en app.js', 'warn'), 800);
}

let session   = null;
let questions = [];
let responses = [];
let votes     = [];
let sessionStatus = 'idle';
let unsub = [null, null, null, null];

function stopWatching(){
  unsub.forEach(u => { try{ u && u(); }catch(e){} });
  unsub = [null, null, null, null];
}

/** Reparte respuestas y votos dentro de sus preguntas (filtra borrados). */
function attachAll(){
  questions.forEach(q => {
    q.responses = responses
      .filter(r => r.qid === q.id && !r.deleted)
      .sort((a, b) => (a.ts || 0) - (b.ts || 0));
    q.votesList = votes.filter(v => v.qid === q.id && !v.deleted);
  });
}

function watchSession(code){
  stopWatching();
  sessionStatus = 'loading';
  session = null; questions = []; responses = []; votes = [];

  const root = fdb.collection('sessions').doc(code);

  unsub[0] = root.onSnapshot(snap => {
    if (!snap.exists){ sessionStatus = 'missing'; session = null; refreshCurrentView(); return; }
    sessionStatus = 'live';
    session = Object.assign({ code }, snap.data());
    refreshCurrentView();
  }, err => {
    console.error(err);
    toast('Error de conexión con Firebase', 'warn');
  });

  unsub[1] = root.collection('questions').orderBy('order').onSnapshot(snap => {
    questions = snap.docs.map(d => Object.assign({ id: d.id, responses: [], votesList: [] }, d.data()));
    if (!questions[0] || !questions[0].type) questions.forEach(q => { if(!q.type) q.type = 'word'; });
    attachAll();
    refreshCurrentView();
  });

  unsub[2] = fdb.collection('responses').where('code', '==', code).onSnapshot(snap => {
    responses = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
    attachAll();
    refreshCurrentView();
  });

  unsub[3] = fdb.collection('votes').where('code', '==', code).onSnapshot(snap => {
    votes = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
    attachAll();
    refreshCurrentView();
  });
}

function currentQ(){
  if (!session || !questions.length) return null;
  const i = clamp(session.current, 0, questions.length - 1);
  return questions[i];
}

function sessionView(){
  return Object.assign({}, session, { questions });
}

/* --- Cerradura de profesor (profKey) --- */
function generateProfKey(){
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let k = '';
  for (let i = 0; i < 8; i++) k += A[Math.floor(Math.random() * A.length)];
  return k;
}
const profKeyFor = code => {
  try{ return sessionStorage.getItem('chubasco:profkey:' + code) || null; }catch(e){ return null; }
};
function rememberProfKey(code, key){
  try{ sessionStorage.setItem('chubasco:profkey:' + code, key); }catch(e){}
}

/* --- Escrituras (incluyen profKey si el profesor la tiene) --- */
function withKey(code, patch){
  const k = profKeyFor(code);
  if (k) patch.profKey = k;
  return patch;
}
const updateSession  = (code, patch)      => fdb.collection('sessions').doc(code).set(withKey(code, patch), { merge: true });
const updateQuestion = (code, qid, patch) => fdb.collection('sessions').doc(code).collection('questions').doc(qid).set(withKey(code, patch), { merge: true });

async function generateCode(){
  const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  while (true){
    let L = '';
    for (let i = 0; i < 3; i++) L += LETTERS[Math.floor(Math.random() * LETTERS.length)];
    let N = '';
    for (let i = 0; i < 3; i++) N += Math.floor(Math.random() * 10);
    const code = L + '-' + N;
    const doc = await fdb.collection('sessions').doc(code).get();
    if (!doc.exists) return code;
  }
}

async function createSession(data){
  const profKey = generateProfKey();
  const root = fdb.collection('sessions').doc(data.code);
  const batch = fdb.batch();
  batch.set(root, {
    title: data.title,
    settings: Object.assign({ maxVotes: VOTES_PER_STUDENT }, data.settings),
    current: 0,
    ended: false,
    createdAt: Date.now(),
    profKey
  });
  data.questions.forEach((q, i) => {
    const doc = { text: q.text, type: q.type, status: 'waiting', order: i };
    if (q.type === 'scale'){
      if (q.scaleMin) doc.scaleMin = q.scaleMin;
      if (q.scaleMax) doc.scaleMax = q.scaleMax;
    }
    batch.set(root.collection('questions').doc(q.id), doc);
  });
  await batch.commit();
  rememberProfKey(data.code, profKey);
}

function addResponse(code, qid, r){
  return fdb.collection('responses').add(Object.assign({ code, qid }, r));
}
function addVote(code, qid, v){
  return fdb.collection('votes').add(Object.assign({ code, qid }, v));
}

/** Borrado suave (soft delete): las reglas prohíben delete duro. */
async function softDeleteResponsesByKey(code, qid, key){
  const snap = await fdb.collection('responses').where('code', '==', code).get();
  const batch = fdb.batch();
  let n = 0;
  snap.forEach(d => {
    const r = d.data();
    if (r.qid === qid && r.key === key && !r.deleted){
      batch.update(d.ref, withKey(code, { deleted: true })); n++;
    }
  });
  if (n) await batch.commit();
  return n;
}

async function softClearQuestionData(code, qid){
  const rs = await fdb.collection('responses').where('code', '==', code).get();
  const vs = await fdb.collection('votes').where('code', '==', code).get();
  const batch = fdb.batch();
  let n = 0;
  rs.forEach(d => { if (d.data().qid === qid && !d.data().deleted){ batch.update(d.ref, withKey(code, { deleted: true })); n++; } });
  vs.forEach(d => { if (d.data().qid === qid && !d.data().deleted){ batch.update(d.ref, withKey(code, { deleted: true })); n++; } });
  if (n) await batch.commit();
  return n;
}

/* ============================================================
   4 · ROUTER Y ESTADO GLOBAL
============================================================ */
const VIEWS = ['home','setup','live','join','student'];
let currentView = 'home';

let teacherCode = sessionStorage.getItem(T_KEY) || null;
let student     = null;
let joinCode    = null;
const liveState = { mode:'storm', sort:'freq', chart:'bars' };
let lastStudentSig = null;
let justSent    = null;
let lastSubmitTs = 0;

function showView(name){
  currentView = name;
  document.body.dataset.view = name;
  VIEWS.forEach(v => { $('#view-' + v).hidden = (v !== name); });
  hideWordTooltip();
}

function refreshCurrentView(){
  if (currentView === 'live')    renderLive();
  if (currentView === 'student') renderStudent();
}

/* ============================================================
   4bis · TEMA, SONIDO DE GOTAS Y MÚSICA DE FONDO
============================================================ */
function currentTheme(){
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}
function applyTheme(t){
  document.documentElement.dataset.theme = t;
  const ic = (t === 'dark') ? ICON_SUN : ICON_MOON;
  const t1 = $('#theme-toggle');   if (t1) t1.innerHTML = ic;
  const t2 = $('#btn-theme-live'); if (t2) t2.innerHTML = ic;
}
function toggleTheme(){
  applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
  try{ localStorage.setItem(THEME_KEY, currentTheme()); }catch(e){}
}
 $('#theme-toggle').addEventListener('click', toggleTheme);
 $('#btn-theme-live').addEventListener('click', toggleTheme);

/* --- Gota sintetizada --- */
let audioCtx = null;
let soundOn = true;
try{ soundOn = localStorage.getItem(SOUND_KEY) !== 'off'; }catch(e){}

function ensureAudio(){
  if (!audioCtx){
    try{ audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){}
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}

/* El primer clic de la página desbloquea el audio; si la música
   estaba activada de una sesión anterior, arranca en ese momento */
document.addEventListener('pointerdown', () => {
  ensureAudio();
  if (musicOn && audioCtx && audioCtx.state === 'running' && !musicTimer) startMusic();
});

let lastDropTs = 0;
function playDrop(){
  if (!soundOn) return;
  ensureAudio();
  if (!audioCtx || audioCtx.state !== 'running') return;
  const now = performance.now();
  if (now - lastDropTs < 80) return;
  lastDropTs = now;
  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  const f0 = 650 + Math.random() * 550;
  o.type = 'sine';
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f0 * 0.4, t + 0.12);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.12, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  o.connect(g); g.connect(audioCtx.destination);
  o.start(t); o.stop(t + 0.2);
}

function renderSoundBtn(){
  const b = $('#btn-sound');
  if (!b) return;
  b.innerHTML = soundOn ? ICON_SOUND : ICON_MUTE;
  b.title = soundOn ? 'Desactivar sonido de gotas' : 'Activar sonido de gotas';
}
 $('#btn-sound').addEventListener('click', () => {
  soundOn = !soundOn;
  try{ localStorage.setItem(SOUND_KEY, soundOn ? 'on' : 'off'); }catch(e){}
  if (soundOn){ ensureAudio(); playDrop(); }
  renderSoundBtn();
});

/* --- Música de fondo: Nocturne Op. 9 No. 2 (Chopin, dominio público),
       apertura sintetizada con Web Audio + colchón de ruido gris suave --- */
let musicOn = false;
try{ musicOn = localStorage.getItem(MUSIC_KEY) === 'on'; }catch(e){}
let musicMaster = null, musicTimer = null, rainSrc = null;
let loopStart = 0;

const TEMPO_8TH = 0.36;          // duración de una corchea (s) · 12/8 calmado
const LOOP_UNITS = 48;           // 4 compases de 12/8
const LOOP_SEC   = LOOP_UNITS * TEMPO_8TH;

/* Frecuencias (Mi♭ mayor) */
const F = {
  F2:87.31, Bb2:116.54, Eb2:77.78, C3:130.81,
  Ab3:207.65, A3:220.00, G3:196.00,
  C4:261.63, D4:293.66, Eb4:311.13, F4:349.23,
  G4:392.00, A4:440.00, Bb4:466.16, B4:493.88,
  C5:523.25, D5:587.33, Eb5:622.25, F5:698.46, G5:783.99, Fsharp4:369.99
};

/* Melodía: [nota, inicio, duración] en corcheas · frase de apertura simplificada */
const MELODY = [
  [F.Bb4,0,3],[F.C5,3,1],[F.D5,4,4],[F.Eb5,8,4],
  [F.G5,12,3],[F.F5,15,1],[F.Eb5,16,4],[F.D5,20,3],[F.C5,23,1],
  [F.Bb4,24,3],[F.C5,27,1],[F.Bb4,28,3],[F.A4,31,1],[F.G4,32,4],
  [F.Fsharp4,36,3],[F.G4,39,1],[F.Bb4,40,3],[F.A4,43,1],[F.Fsharp4,44,2],[F.G4,46,2]
];

/* Acompañamiento: bajo al inicio de cada compás + acordes en pulsos 0/4/8 */
const BASS = [[F.Bb2,0],[F.Eb2,12],[F.C3,24],[F.F2,36]];
const CHORDS = [
  [[F.Ab3,F.D4,F.F4], 0],
  [[F.G3,F.Bb3,F.Eb4], 12],
  [[F.C4,F.Eb4,F.G4], 24],
  [[F.A3,F.C4,F.Eb4], 36]
];

/** Nota de "piano": doble oscilador + envolvente de piano + filtro que se apaga. */
function pianoNote(freq, when, dur, vel){
  const g  = audioCtx.createGain();
  const lp = audioCtx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(freq * 6, when);
  lp.frequency.exponentialRampToValueAtTime(Math.max(400, freq * 1.6), when + dur);

  const o1 = audioCtx.createOscillator();
  o1.type = 'triangle';
  o1.frequency.value = freq * (1 + (Math.random() * 0.002 - 0.001)); // leve coro
  const o2 = audioCtx.createOscillator();
  o2.type = 'sine';
  o2.frequency.value = freq * 2.001;
  const g2 = audioCtx.createGain();
  g2.gain.value = 0.16;
  o1.connect(lp); o2.connect(g2); g2.connect(lp);
  lp.connect(g); g.connect(musicMaster);

  const peak = 0.06 * vel;
  g.gain.setValueAtTime(0.0001, when);
  g.gain.linearRampToValueAtTime(peak, when + 0.012);                       // ataque
  g.gain.exponentialRampToValueAtTime(peak * 0.32, when + Math.min(1.2, dur * 0.6)); // caída
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur + 0.4);           // cola

  o1.start(when); o2.start(when);
  o1.stop(when + dur + 0.45); o2.stop(when + dur + 0.45);
}

/** Programa una vuelta completa del bucle a partir del instante t0. */
function scheduleLoop(t0){
  MELODY.forEach(([f, st, du]) => pianoNote(f, t0 + st * TEMPO_8TH, du * TEMPO_8TH, 1.0));
  BASS.forEach(([f, st])   => pianoNote(f, t0 + st * TEMPO_8TH, 11 * TEMPO_8TH, 0.85));
  CHORDS.forEach(([notes, start]) => {
    [0,4,8].forEach(off => notes.forEach(f =>
      pianoNote(f, t0 + (start + off) * TEMPO_8TH, 3.3 * TEMPO_8TH, 0.3)));
  });
}

/** Ruido gris (lluvia suave) como colchón bajo el piano. */
function startRainNoise(){
  if (!audioCtx || !musicMaster || rainSrc) return;
  const len = 2 * audioCtx.sampleRate;
  const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++){
    const w = Math.random() * 2 - 1;
    last = (last + 0.03 * w) / 1.03;
    d[i] = last * 3;
  }
  const src = audioCtx.createBufferSource();
  src.buffer = buf; src.loop = true;
  const lp = audioCtx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 1000;
  const g = audioCtx.createGain(); g.gain.value = 0.03;
  src.connect(lp); lp.connect(g); g.connect(musicMaster);
  src.start();
  rainSrc = src;
}

function startMusic(){
  if (!audioCtx || musicTimer) return;
  musicMaster = audioCtx.createGain();
  musicMaster.gain.value = 0.9;
  musicMaster.connect(audioCtx.destination);
  loopStart = audioCtx.currentTime + 0.15;
  scheduleLoop(loopStart);
  // Reprograma cada vuelta un instante antes de que termine (bucle perfecto)
  musicTimer = setInterval(() => {
    if (audioCtx.currentTime > loopStart + LOOP_SEC - 1.5){
      loopStart += LOOP_SEC;
      scheduleLoop(loopStart);
    }
  }, 500);
  startRainNoise();
}

function stopMusic(){
  if (musicTimer){ clearInterval(musicTimer); musicTimer = null; }
  if (rainSrc){ try{ rainSrc.stop(); }catch(e){} rainSrc = null; }
  if (musicMaster){
    const m = musicMaster;
    try{ m.gain.setTargetAtTime(0.0001, audioCtx.currentTime, 0.25); }catch(e){}
    setTimeout(() => { try{ m.disconnect(); }catch(e){} }, 1500);
    musicMaster = null;
  }
}

function renderMusicBtn(){
  const b = $('#btn-music');
  if (!b) return;
  b.innerHTML = musicOn ? ICON_MUSIC : ICON_MUSIC_OFF;
  b.classList.toggle('voting-on', musicOn);
  b.title = musicOn ? 'Desactivar música de fondo' : 'Activar música de fondo';
}

function toggleMusic(){
  musicOn = !musicOn;
  try{ localStorage.setItem(MUSIC_KEY, musicOn ? 'on' : 'off'); }catch(e){}
  ensureAudio();
  if (musicOn && audioCtx && audioCtx.state === 'running'){
    startMusic();
    toast('Nocturne de Chopin · música de fondo activada');
  } else if (musicOn){
    toast('Música lista: sonará con tu próximo clic');
  } else {
    stopMusic();
    toast('Música de fondo desactivada');
  }
  renderMusicBtn();
}
/** Crea el botón de música junto al de sonido (no toca el HTML). */
function ensureMusicBtn(){
  const snd = $('#btn-sound');
  if (!snd || $('#btn-music')) return;
  const b = el('button', 'btn btn-ghost btn-icon');
  b.id = 'btn-music';
  b.type = 'button';
  b.addEventListener('click', toggleMusic);
  snd.after(b);
  renderMusicBtn();
}

/* ============================================================
   4ter · LLUVIA AMBIENTAL (visual)
============================================================ */
function startRain(){
  const cv = $('#rain');
  if (!cv) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const ctx = cv.getContext('2d');
  let W = 0, H = 0, drops = [];

  function newDrop(fromTop){
    return {
      x: Math.random() * W,
      y: fromTop ? -20 : Math.random() * H,
      l: 10 + Math.random() * 18,
      s: 260 + Math.random() * 320,
      a: 0.10 + Math.random() * 0.14
    };
  }
  function resize(){
    W = cv.width = innerWidth;
    H = cv.height = innerHeight;
    drops = Array.from({ length: Math.max(30, Math.round(W / 28)) }, () => newDrop(false));
  }

  let last = performance.now();
  function frame(t){
    if (document.hidden){ last = t; requestAnimationFrame(frame); return; }
    const dt = Math.min((t - last) / 1000, 0.05); last = t;
    const dark = currentTheme() === 'dark';

    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.strokeStyle = dark ? 'rgba(240,234,224,1)' : 'rgba(35,32,26,1)';

    for (const d of drops){
      d.y += d.s * dt;
      d.x += d.s * dt * 0.08;
      if (d.y > H + 30) Object.assign(d, newDrop(true));
      ctx.globalAlpha = d.a;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - d.l * 0.08, d.y - d.l);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }

  resize();
  addEventListener('resize', resize);
  requestAnimationFrame(frame);
}

/* Animación de "pulso" cuando una palabra crece (se inyecta por JS) */
(function injectGrowStyles(){
  const st = document.createElement('style');
  st.textContent =
    '@keyframes word-grow{0%{scale:1}40%{scale:1.18}100%{scale:1}}' +
    '.word.growing{animation:word-grow .55s cubic-bezier(.34,1.4,.5,1)}';
  document.head.append(st);
})();

/* ============================================================
   4cuarto · CERRADURA DEL MODO PROFESOR
============================================================ */
const PASS_SESSION = 'chubasco:prolock';
let passCb = null;

function ensurePassUI(){
  if ($('#pass-overlay')) return;

  const st = document.createElement('style');
  st.textContent = '#pass-overlay{position:fixed;inset:0;z-index:75;display:flex;align-items:center;justify-content:center;background:rgba(35,32,26,.45);backdrop-filter:blur(3px);padding:20px}';
  document.head.append(st);

  const ov = el('div'); ov.id = 'pass-overlay'; ov.hidden = true;
  const card = el('div', 'qr-card');

  const close = el('button', 'btn btn-ghost btn-icon qr-close');
  close.type = 'button';
  close.setAttribute('aria-label', 'Cerrar');
  close.innerHTML = '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  close.addEventListener('click', () => { ov.hidden = true; passCb = null; });
  card.append(close);

  card.append(el('p', 'zone-title', 'Panel del profesor'));
  card.append(el('p', 'qr-hint', 'Escribe la clave de profesor para continuar'));

  const input = el('input');
  input.type = 'password';
  input.maxLength = 24;
  input.autocomplete = 'off';
  input.placeholder = 'Clave';
  input.style.cssText = 'width:100%;background:var(--white);border:var(--border);border-radius:12px;padding:12px 14px;text-align:center;font-weight:700;letter-spacing:.25em';
  card.append(input);

  const err = el('p', 'join-error', 'Clave incorrecta.');
  err.hidden = true;
  card.append(err);

  const ok = el('button', 'btn btn-ink btn-lg btn-block', 'Entrar al panel');
  ok.type = 'button';
  card.append(ok);
  ov.append(card);
  document.body.append(ov);

  const attempt = () => {
    if (input.value === TEACHER_PASS){
      try{ sessionStorage.setItem(PASS_SESSION, '1'); }catch(e){}
      ov.hidden = true; err.hidden = true; input.value = '';
      const cb = passCb; passCb = null;
      if (cb) cb();
    } else {
      err.hidden = false;
      input.value = '';
      input.focus();
    }
  };
  ok.addEventListener('click', attempt);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') attempt(); });
}

function askTeacherPass(cb){
  let unlocked = false;
  try{ unlocked = sessionStorage.getItem(PASS_SESSION) === '1'; }catch(e){}
  if (unlocked){ cb(); return; }
  ensurePassUI();
  passCb = cb;
  $('#pass-overlay').hidden = false;
  setTimeout(() => $('#pass-overlay input').focus(), 60);
}

/* ============================================================
   5 · FONDO DECORATIVO
============================================================ */
function buildBackgroundWords(){
  const words = ['aprender','curiosidad','eureka','proyecto','duda','idea','aula','juntos',
                 'preguntar','motivar','crear','error','práctica','descubrir','equipo'];
  const wrap = $('#bg-words');
  words.forEach((w, i) => {
    const s = el('span', '', w);
    s.style.left = (4 + Math.random() * 88) + '%';
    s.style.top  = (4 + Math.random() * 88) + '%';
    s.style.fontSize = (17 + Math.random() * 36) + 'px';
    s.style.color = PALETTE[i % PALETTE.length];
    s.style.animationDuration = (14 + Math.random() * 16) + 's';
    s.style.animationDelay = (-Math.random() * 20) + 's';
    wrap.append(s);
  });
}

/* ============================================================
   6 · EDITOR DE PREGUNTAS Y CREACIÓN DE SESIÓN
============================================================ */
function updateQCount(){
  const n = $$('#qcards .qcard').length;
  $('#q-count').textContent = n + (n === 1 ? ' pregunta' : ' preguntas');
  $('#btn-add-q').disabled = (n >= MAX_Q);
}

/** Crea una tarjeta de pregunta (texto + tipo + etiquetas de escala). */
function makeQCard(data = {}){
  const card = el('div', 'qcard');
  const name = 'qt-' + uid();

  const head = el('div', 'qcard-head');
  const idx = $$('#qcards .qcard').length + 1;
  head.append(el('b', '', 'Pregunta ' + idx));
  const del = el('button', 'qdel');
  del.type = 'button';
  del.title = 'Quitar pregunta';
  del.innerHTML = TRASH_SVG;
  del.addEventListener('click', () => {
    if (del.dataset.armed){ card.remove(); updateQCount(); renumberCards(); }
    else {
      del.dataset.armed = '1'; del.classList.add('armed');
      setTimeout(() => { delete del.dataset.armed; del.classList.remove('armed'); }, 2200);
    }
  });
  head.append(del);
  card.append(head);

  const input = el('input');
  input.type = 'text';
  input.maxLength = 140;
  input.placeholder = 'Escribe la pregunta…';
  input.value = data.text || '';
  input.className = 'q-input';
  card.append(input);

  const types = el('div', 'qtype');
  const labW = el('label');
  const rW = el('input'); rW.type = 'radio'; rW.name = name; rW.value = 'word';
  if ((data.type || 'word') === 'word') rW.checked = true;
  labW.append(rW, document.createTextNode('Palabra'));
  const labS = el('label');
  const rS = el('input'); rS.type = 'radio'; rS.name = name; rS.value = 'scale';
  if (data.type === 'scale') rS.checked = true;
  labS.append(rS, document.createTextNode('Escala 1–5'));
  types.append(labW, labS);
  card.append(types);

  const sl = el('div', 'qscale-labels' + (data.type === 'scale' ? ' show' : ''));
  const s1 = el('div', 'sl');
  s1.append(el('span', '', 'El 1 significa (opcional)'));
  const i1 = el('input'); i1.type = 'text'; i1.maxLength = 30; i1.value = data.scaleMin || '';
  i1.className = 'q-smin';
  s1.append(i1);
  const s5 = el('div', 'sl');
  s5.append(el('span', '', 'El 5 significa (opcional)'));
  const i5 = el('input'); i5.type = 'text'; i5.maxLength = 30; i5.value = data.scaleMax || '';
  i5.className = 'q-smax';
  s5.append(i5);
  sl.append(s1, s5);
  card.append(sl);

  rW.addEventListener('change', () => sl.classList.toggle('show', false));
  rS.addEventListener('change', () => sl.classList.toggle('show', true));
  input.addEventListener('input', () => {}); // reservado

  return card;
}

function renumberCards(){
  $$('#qcards .qcard').forEach((c, i) => {
    const b = c.querySelector('.qcard-head b');
    if (b) b.textContent = 'Pregunta ' + (i + 1);
  });
}

/** Lee las tarjetas y devuelve la lista de preguntas válidas. */
function readQuestionCards(){
  return $$('#qcards .qcard').map(c => ({
    text: (c.querySelector('.q-input').value || '').replace(/\s+/g, ' ').trim().slice(0, 140),
    type: c.querySelector('input[type=radio]:checked').value,
    scaleMin: (c.querySelector('.q-smin').value || '').trim().slice(0, 30),
    scaleMax: (c.querySelector('.q-smax').value || '').trim().slice(0, 30)
  })).filter(q => q.text);
}

 $('#btn-add-q').addEventListener('click', () => {
  if ($$('#qcards .qcard').length >= MAX_Q) return;
  $('#qcards').append(makeQCard());
  updateQCount();
  const cards = $$('#qcards .qcard');
  cards[cards.length - 1].querySelector('.q-input').focus();
});

 $('#setup-form').addEventListener('submit', async e => {
  e.preventDefault();
  if (!FIREBASE_OK){ toast('Primero configura Firebase en app.js', 'warn'); return; }

  const qs = readQuestionCards();
  if (!qs.length){ toast('Escribe al menos una pregunta', 'warn'); return; }

  const title  = ($('#setup-title').value.replace(/\s+/g, ' ').trim() || 'Actividad sin título').slice(0, 60);
  const maxPer = clamp(parseInt($('#setup-max').value, 10) || 3, 1, 10);
  const blocked = $('#setup-blocked').value.split('\n')
    .map(normalizeKey).filter(Boolean).slice(0, 50);

  const settings = {
    maxPerStudent : maxPer,
    allowRepeated : $('#setup-repeat').checked,
    anonymous     : $('#setup-anon').checked,
    blocked
  };

  const submitBtn = $('#setup-form button[type=submit]');
  submitBtn.disabled = true;
  try{
    const code = await generateCode();
    await createSession({ code, title, settings, questions: qs });

    teacherCode = code;
    sessionStorage.setItem(T_KEY, teacherCode);
    liveState.mode = 'storm';
    addHistory(code, title, profKeyFor(code));
    watchSession(code);
    showView('live');
    renderLive();
    toast('Sesión creada · código ' + code);
  }catch(err){
    console.error(err);
    toast('No se pudo crear la sesión (¿sin conexión?)', 'warn');
  }finally{
    submitBtn.disabled = false;
  }
});

/* Acceso al panel del profesor: protegido por clave */
 $('#btn-go-setup').addEventListener('click', () => askTeacherPass(() => {
  showView('setup');
  if (!$$('#qcards .qcard').length) $('#qcards').append(makeQCard());
  updateQCount();
  setTimeout(() => $('#setup-title').focus(), 60);
}));

 $('#btn-setup-back').addEventListener('click', () => showView('home'));
 $('#btn-go-join').addEventListener('click', () => {
  showView('join'); resetJoin();
  setTimeout(() => $('#join-code').focus(), 60);
});
 $('#btn-leave-live').addEventListener('click', () => {
  stopWatching();
  sessionStorage.removeItem(T_KEY);
  teacherCode = null;
  sessionStatus = 'idle';
  showView('home');
  renderHistory();
});

/* ============================================================
   6bis · HISTORIAL DE SESIONES
============================================================ */
function loadHistory(){
  try{ return JSON.parse(localStorage.getItem(H_KEY)) || []; }catch(e){ return []; }
}
function saveHistoryList(list){
  try{ localStorage.setItem(H_KEY, JSON.stringify(list.slice(0, 20))); }catch(e){}
}
function addHistory(code, title, profKey){
  const list = loadHistory().filter(h => h.code !== code);
  list.unshift(Object.assign({ code, title, ts: Date.now() }, profKey ? { profKey } : {}));
  saveHistoryList(list);
}
function removeHistory(code){
  saveHistoryList(loadHistory().filter(h => h.code !== code));
  renderHistory();
  toast('Sesión quitada de la lista (los datos siguen en Firebase)');
}

function renderHistory(){
  const list = loadHistory();
  const box = $('#history-box'), wrap = $('#history-list');
  box.hidden = !list.length;
  wrap.textContent = '';
  list.forEach(h => {
    const item = el('div', 'history-item');
    const info = el('div');
    info.append(el('b', '', h.title));
    const fecha = new Date(h.ts).toLocaleDateString('es-ES', { day:'numeric', month:'short', year:'numeric' });
    info.append(el('div', 'h-date', fecha + ' · ' + h.code));
    const actions = el('div', 'h-actions');

    const open = el('button', 'btn btn-ghost btn-sm', 'Abrir');
    open.type = 'button';
    open.addEventListener('click', () => askTeacherPass(() => openHistorySession(h)));

    const del = el('button', 'btn btn-ghost btn-sm', 'Quitar');
    del.type = 'button';
    del.addEventListener('click', () => removeHistory(h.code));

    actions.append(open, del);
    item.append(info, actions);
    wrap.append(item);
  });
}

function openHistorySession(h){
  if (!FIREBASE_OK) return;
  if (h.profKey) rememberProfKey(h.code, h.profKey);
  teacherCode = h.code;
  sessionStorage.setItem(T_KEY, h.code);
  liveState.mode = 'storm';
  watchSession(h.code);
  showView('live');
  renderLive();
}

/* ============================================================
   7 · PANEL DEL PROFESOR EN DIRECTO
============================================================ */
function armTwoStep(btn, fn){
  if (btn.dataset.armed){
    delete btn.dataset.armed;
    btn.classList.remove('armed');
    btn.innerHTML = btn.dataset.orig;
    fn();
  } else {
    btn.dataset.armed = '1';
    if (!btn.dataset.orig) btn.dataset.orig = btn.innerHTML;
    btn.innerHTML = '¿Seguro? Sí, hazlo';
    btn.classList.add('armed');
    setTimeout(() => {
      if (btn.dataset.armed){
        delete btn.dataset.armed;
        btn.classList.remove('armed');
        btn.innerHTML = btn.dataset.orig;
      }
    }, 2600);
  }
}

let lastAnsQId = null, lastAnsTotal = 0;

function renderLive(){
  if (!teacherCode) return;

  if (sessionStatus === 'missing'){
    stopWatching();
    sessionStorage.removeItem(T_KEY);
    teacherCode = null;
    sessionStatus = 'idle';
    showView('home');
    renderHistory();
    toast('Esa sesión ya no existe en Firebase');
    return;
  }
  if (sessionStatus !== 'live' || !session || !questions.length) return;

  const s = session;
  s.current = clamp(s.current, 0, questions.length - 1);
  const q = questions[s.current];
  const isScale = (q.type === 'scale');

  $('#live-title').textContent = s.title;
  $('#live-code-text').textContent = s.code;
  $('#live-question').textContent = q.text;
  $('#pj-question').textContent = q.text;
  $('#pj-count').textContent = q.responses.length + (q.responses.length === 1 ? ' respuesta' : ' respuestas');

  const badge = $('#live-status-badge');
  badge.className = 'status-badge st-' + q.status;
  badge.textContent = { waiting:'En espera', open:'Abierta', paused:'En pausa', closed:'Cerrada' }[q.status];

  $('#stat-qnum').textContent = (s.current + 1) + '/' + questions.length;
  $('#stat-people').textContent = new Set(q.responses.map(r => r.authorId)).size;
  animateNumber($('#stat-answers'), q.responses.length);

  // Sonido de gotas
  if (liveState.mode === 'storm' && !document.hidden){
    if (lastAnsQId !== q.id){
      lastAnsQId = q.id;
      lastAnsTotal = q.responses.length;
    } else if (q.responses.length > lastAnsTotal){
      const k = Math.min(q.responses.length - lastAnsTotal, 3);
      for (let i = 0; i < k; i++) setTimeout(playDrop, i * 90);
      lastAnsTotal = q.responses.length;
    } else if (q.responses.length < lastAnsTotal){
      lastAnsTotal = q.responses.length;
    }
  }

  // Navegación
  const nav = $('#qnav');
  nav.textContent = '';
  questions.forEach((qq, i) => {
    const b = el('button', 'qchip st-' + qq.status + (i === s.current ? ' active' : ''));
    b.type = 'button';
    b.title = qq.text;
    b.append(el('b', '', String(i + 1)));
    b.append(el('span', 'qchip-type', qq.type === 'scale' ? '1-5' : 'palabra'));
    b.append(document.createTextNode(qq.text.length > 20 ? qq.text.slice(0, 20) + '…' : qq.text));
    b.addEventListener('click', () => {
      liveState.mode = 'storm';
      updateSession(teacherCode, { current: i });
    });
    nav.append(b);
  });

  // Consola
  const tbtn = $('#btn-toggle-status');
  if (q.status === 'waiting'){ tbtn.innerHTML = ICONS.play  + ' Abrir pregunta'; tbtn.disabled = false; }
  else if (q.status === 'open'){ tbtn.innerHTML = ICONS.pause + ' Pausar';       tbtn.disabled = false; }
  else if (q.status === 'paused'){ tbtn.innerHTML = ICONS.play  + ' Reanudar';   tbtn.disabled = false; }
  else { tbtn.innerHTML = ICONS.play + ' Pregunta cerrada'; tbtn.disabled = true; }

  $('#btn-close-q').disabled = (q.status === 'waiting' || q.status === 'closed');
  $('#btn-next-q').disabled  = (s.current >= questions.length - 1);
  $('#btn-demo').disabled    = (q.status !== 'open' || isScale);

  const vbtn = $('#btn-vote');
  vbtn.hidden = isScale;
  vbtn.disabled = isScale;
  vbtn.classList.toggle('voting-on', !!q.voting);
  vbtn.innerHTML = ICON_STAR + (q.voting ? ' Votación activa' : ' Votación');

  $('#btn-view-results').innerHTML = ICONS.chart + ' ' + (liveState.mode === 'storm' ? 'Resultados' : 'Ver tormenta');

  const stormOn = (liveState.mode === 'storm');
  $('#storm').hidden = !stormOn;
  $('#results-panel').hidden = stormOn;
  if (stormOn){
    if (!storm) storm = new WordStorm($('#storm'));
    storm.setData(computeWords(q));
  } else {
    renderResults(s, q);
  }
}

function animateNumber(elm, to){
  const from = parseInt(elm.dataset.v || '0', 10);
  elm.dataset.v = to;
  if (from === to){ elm.textContent = to; return; }
  const t0 = performance.now(), dur = 450;
  (function step(t){
    const p = clamp((t - t0) / dur, 0, 1);
    const e = 1 - Math.pow(1 - p, 3);
    elm.textContent = Math.round(from + (to - from) * e);
    if (p < 1) requestAnimationFrame(step);
  })(t0);
}

 $('#btn-toggle-status').addEventListener('click', () => {
  const q = currentQ();
  if (!q) return;
  let patch = null;
  if (q.status === 'waiting' || q.status === 'paused') patch = { status: 'open' };
  else if (q.status === 'open') patch = { status: 'paused' };
  if (patch) updateQuestion(teacherCode, q.id, patch);
});

 $('#btn-close-q').addEventListener('click', () => {
  const q = currentQ();
  if (!q) return;
  updateQuestion(teacherCode, q.id, { status: 'closed' });
  toast('Pregunta cerrada para los alumnos');
});

 $('#btn-next-q').addEventListener('click', () => {
  if (!session) return;
  liveState.mode = 'storm';
  updateSession(teacherCode, { current: session.current + 1 });
});

 $('#btn-reset-q').addEventListener('click', e => armTwoStep(e.currentTarget, async () => {
  const q = currentQ();
  if (!q) return;
  await softClearQuestionData(teacherCode, q.id);
  await updateQuestion(teacherCode, q.id, { status: 'waiting', voting: false });
  toast('Pregunta reiniciada');
}));

 $('#btn-view-results').addEventListener('click', () => {
  liveState.mode = (liveState.mode === 'storm') ? 'results' : 'storm';
  renderLive();
});
 $('#sort-freq').addEventListener('click',  () => { liveState.sort = 'freq';  renderLive(); });
 $('#sort-alpha').addEventListener('click', () => { liveState.sort = 'alpha'; renderLive(); });

 $('#btn-vote').addEventListener('click', () => {
  const q = currentQ();
  if (!q || q.type === 'scale') return;
  updateQuestion(teacherCode, q.id, { voting: !q.voting });
  toast(q.voting ? 'Votación desactivada' : 'Votación activada: tus alumnos ya pueden votar');
});

 $('#btn-end').addEventListener('click', e => armTwoStep(e.currentTarget, async () => {
  const root = fdb.collection('sessions').doc(teacherCode);
  const k = profKeyFor(teacherCode);
  const batch = fdb.batch();
  questions.forEach(q => batch.update(root.collection('questions').doc(q.id), { status: 'closed' }));
  const endPatch = { ended: true };
  if (k) endPatch.profKey = k;
  batch.update(root, endPatch);
  await batch.commit();
  toast('Sesión finalizada');
}));

 $('#live-code-btn').addEventListener('click', async () => {
  if (!session) return;
  try{
    await navigator.clipboard.writeText(session.code);
    toast('Código copiado: ' + session.code);
  }catch(e){
    toast('El código es ' + session.code);
  }
});

/* ============================================================
   8 · LA TORMENTA DE PALABRAS
============================================================ */
function computeWords(q){
  const groups = new Map();
  for (const r of q.responses){
    let g = groups.get(r.key);
    if (!g){ g = { key: r.key, count: 0, variants: new Map() }; groups.set(r.key, g); }
    g.count++;
    g.variants.set(r.text, (g.variants.get(r.text) || 0) + 1);
  }
  const vlist = q.votesList || [];
  const words = [...groups.values()].map(g => {
    let text = g.key, best = 0;
    for (const [v, n] of g.variants){ if (n > best){ best = n; text = v; } }
    const v = vlist.filter(x => x.key === g.key).length;
    return { key: g.key, text, count: g.count, votes: v };
  });
  const total = q.responses.length || 1;
  words.forEach(w => { w.pct = w.count / total * 100; });
  words.sort((a, b) => b.count - a.count || a.text.localeCompare(b.text, 'es'));
  return words;
}

function overlap(x, y, w, h, p){
  const ix = Math.max(0, Math.min(x + w, p.x + p.w) - Math.max(x, p.x));
  const iy = Math.max(0, Math.min(y + h, p.y + p.h) - Math.max(y, p.y));
  return ix * iy;
}

function findSpot(W, H, w, h, placed){
  const pad = 10, cx = W / 2, cy = H / 2;
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < 900; i++){
    const r = 9 * Math.sqrt(i), a = i * golden;
    const x = cx + r * Math.cos(a) * 1.4 - w / 2;
    const y = cy + r * Math.sin(a) * 0.85 - h / 2;
    if (x < pad || y < pad || x + w > W - pad || y + h > H - pad) continue;
    const colisiona = placed.some(p =>
      x < p.x + p.w + pad && x + w + pad > p.x &&
      y < p.y + p.h + pad && y + h + pad > p.y);
    if (!colisiona) return { x, y };
  }
  let best = { x: clamp(cx - w / 2, pad, Math.max(pad, W - w - pad)),
               y: clamp(cy - h / 2, pad, Math.max(pad, H - h - pad)) };
  let bestOv = Infinity;
  for (let i = 0; i < 120; i++){
    const x = pad + Math.random() * Math.max(1, W - w - 2 * pad);
    const y = pad + Math.random() * Math.max(1, H - h - 2 * pad);
    const ov = placed.reduce((s, p) => s + overlap(x, y, w, h, p), 0);
    if (ov < bestOv){ best = { x, y }; bestOv = ov; if (!ov) break; }
  }
  return best;
}

class WordStorm{
  constructor(container){
    this.c = container;
    this.els = new Map();
    this.data = [];
    this._raf = 0;
    new ResizeObserver(() => this.scheduleLayout()).observe(container);
  }
  scheduleLayout(){
    cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame(() => this.layout());
  }
  setData(words){ this.data = words; this.layout(); }

  clear(){
    for (const r of this.els.values()) r.el.remove();
    this.els.clear();
  }

  layout(){
    const c = this.c, W = c.clientWidth, H = c.clientHeight;
    const emptyMsg = $('#storm-empty');
    if (!W || !H) return;

    if (!this.data.length){
      this.clear();
      if (emptyMsg) emptyMsg.hidden = false;
      $('#storm-overflow').hidden = true;
      return;
    }
    if (emptyMsg) emptyMsg.hidden = true;

    const shown = this.data.slice(0, MAX_UNIQUE);
    const keys = new Set(shown.map(w => w.key));

    for (const [k, rec] of [...this.els]){
      if (!keys.has(k)){
        this.els.delete(k);
        hideWordTooltip();
        rec.el.classList.add('is-leaving');
        const elm = rec.el;
        setTimeout(() => elm.remove(), 320);
      }
    }

    const maxCount = Math.max(...shown.map(w => w.count));
    const minS = clamp(H * 0.05, 15, 22);
    const maxS = clamp(H * 0.20, 48, 96);   // rango más dramático: la más repetida domina
    const placed = [];

    shown.forEach((w, i) => {
      const fontSize = Math.round(minS + (maxS - minS) * Math.sqrt(w.count / maxCount));

      let rec = this.els.get(w.key);
      const isNew = !rec;
      let grew = false;
      if (isNew){
        const b = el('button', 'word');
        b.type = 'button';
        // El tamaño y la posición transicionan con suavidad
        b.style.transition = 'transform .65s cubic-bezier(.22,.9,.3,1.08), font-size .5s cubic-bezier(.34,1.3,.5,1)';
        const inner = el('span', 'w-in');
        inner.style.setProperty('--fd', (Math.random() * 3).toFixed(2) + 's');
        const star = el('span', 'w-star');
        inner.append(star);
        b.append(inner);
        b.style.color = colorOf(w.key);
        b.addEventListener('click', () => onStormWordClick(w.key, b));
        c.append(b);
        rec = { el: b, inner, star, unitW: 0, unitH: 0, lastF: 0, lastCount: 0, lastText: '' };
        this.els.set(w.key, rec);
      } else if (w.count > rec.lastCount){
        grew = true;   // la palabra acaba de recibir una respuesta más
      }
      rec.el.style.fontSize = fontSize + 'px';
      // Texto visible: la variante más escrita; estrella con votos detrás
      if (w.text !== rec.lastText){
        const txt = document.createTextNode(w.text);
        rec.inner.insertBefore(txt, rec.star);
        rec.inner.firstChild && rec.inner.firstChild !== txt && rec.inner.firstChild.nodeType === 3 && rec.inner.firstChild.remove();
        rec.lastText = w.text;
      }
      rec.star.textContent = w.votes ? ' ★' + w.votes : '';

      // Medición: con texto sin salto de línea, el ancho es proporial
      // al tamaño de fuente → medimos una vez y escalamos (evita medir
      // a mitad de la transición de font-size).
      if (!rec.lastF){
        const bw = rec.el.offsetWidth, bh = rec.el.offsetHeight;
        rec.unitW = bw / fontSize; rec.unitH = bh / fontSize;
        rec.lastF = fontSize;
      } else if (w.text !== rec.lastText && fontSize === rec.lastF){
        const bw = rec.el.offsetWidth, bh = rec.el.offsetHeight;
        rec.unitW = bw / fontSize; rec.unitH = bh / fontSize;
      }
      rec.lastF = fontSize;
      const bw = rec.unitW * fontSize, bh = rec.unitH * fontSize;

      const spot = findSpot(W, H, bw, bh, placed);
      rec.el.style.transform = `translate(${spot.x}px, ${spot.y}px)`;
      placed.push({ x: spot.x, y: spot.y, w: bw, h: bh });

      if (isNew){
        rec.el.classList.add('is-new');
        const d = Math.min(i * 45, 450);
        rec.inner.style.animationDelay = `${d}ms, calc(${d}ms + .7s)`;
        setTimeout(() => rec.el.classList.remove('is-new'), 1400);
      } else if (grew){
        // Pulso de crecimiento: la palabra "late" al recibir otra respuesta
        rec.el.classList.remove('growing');
        void rec.el.offsetWidth;   // reinicia la animación
        rec.el.classList.add('growing');
        setTimeout(() => rec.el.classList.remove('growing'), 600);
      }
      rec.lastCount = w.count;
    });

    const ov = $('#storm-overflow');
    if (this.data.length > MAX_UNIQUE){
      ov.hidden = false;
      ov.textContent = '+' + (this.data.length - MAX_UNIQUE) + ' respuestas más';
    } else ov.hidden = true;
  }
}

let storm = null;

let currentTipKey = null;

function onStormWordClick(key, btnEl){
  const q = currentQ();
  if (!q) return;
  const w = computeWords(q).find(x => x.key === key);
  if (!w) return;

  const authors = [...new Set(
    q.responses.filter(r => r.key === key).map(r => r.authorName || 'Anónimo')
  )];
  currentTipKey = key;

  $('#wt-word').textContent  = '“' + w.text + '”';
  let stats = w.count + (w.count === 1 ? ' respuesta' : ' respuestas') + ' · ' + pctStr(w.pct) + ' de la clase';
  if (w.votes) stats += '  ·  ★ ' + w.votes + (w.votes === 1 ? ' voto' : ' votos');
  $('#wt-stats').textContent = stats;

  const wa = $('#wt-authors');
  if (session.settings.anonymous){
    wa.hidden = true;
  } else {
    wa.hidden = false;
    wa.textContent = 'De: ' + authors.slice(0, 5).join(', ') + (authors.length > 5 ? ' +' + (authors.length - 5) + ' más' : '');
  }

  const tip = $('#word-tooltip');
  tip.hidden = false;
  tip.style.left = '0px'; tip.style.top = '0px';
  const r = btnEl.getBoundingClientRect();
  const tw = tip.offsetWidth, th = tip.offsetHeight;
  let left = clamp(r.left + r.width / 2 - tw / 2, 10, innerWidth - tw - 10);
  let top  = r.top - th - 10;
  if (top < 10) top = r.bottom + 10;
  tip.style.left = left + 'px';
  tip.style.top  = top + 'px';
}

function hideWordTooltip(){
  currentTipKey = null;
  $('#word-tooltip').hidden = true;
}

 $('#wt-delete').addEventListener('click', async () => {
  if (!currentTipKey) return;
  const q = currentQ();
  const key = currentTipKey;
  hideWordTooltip();
  const done = await softDeleteResponsesByKey(teacherCode, q.id, key);
  toast('Respuesta eliminada (' + done + ' apariciones)');
});

document.addEventListener('pointerdown', e => {
  if ($('#word-tooltip').hidden) return;
  if (e.target.closest('#word-tooltip') || e.target.closest('.word')) return;
  hideWordTooltip();
});

/* ▼▼ CONTINÚA EN LA PARTE 2 — sigue pegando a continuación, NO guardes todavía ▼▼ */
/* ▲▲ CONTINUACIÓN de app.js (Parte 2 de 2) ▲▲ */

/* ============================================================
   9 · RESULTADOS, GRÁFICOS, CSV E IMPRESIÓN
============================================================ */
function renderResults(s, q){
  const isScale = (q.type === 'scale');
  $('#res-q-tag').textContent = '· ' + (s.current + 1) + '/' + questions.length;

  const words = computeWords(q);
  const people = new Set(q.responses.map(r => r.authorId)).size;
  let summary = people + ' participantes · ' + q.responses.length +
    (q.responses.length === 1 ? ' respuesta' : ' respuestas') +
    ' · ' + words.length + (words.length === 1 ? ' respuesta distinta' : ' respuestas distintas');
  if (isScale){
    const st = scaleStats(q);
    if (st) summary += ' · media ' + numStr(st.mean) + ' · mediana ' + numStr(st.median);
  }
  $('#res-summary').textContent = summary;

  $('#sort-freq').classList.toggle('active', liveState.sort === 'freq');
  $('#sort-alpha').classList.toggle('active', liveState.sort === 'alpha');

  $('#chart-seg').hidden = isScale;
  $('#chart-bars').classList.toggle('active', liveState.chart === 'bars');
  $('#chart-dots').classList.toggle('active', liveState.chart === 'dots');
  $('#chart-donut').classList.toggle('active', liveState.chart === 'donut');
  renderChartInto(words, q.responses.length, q);

  const body = $('#res-body');
  body.textContent = '';

  if (!words.length){
    body.innerHTML = '<tr><td colspan="7" class="res-empty">Todavía no hay respuestas en esta pregunta.</td></tr>';
    return;
  }

  const sorted = [...words].sort(liveState.sort === 'alpha'
    ? (a, b) => a.text.localeCompare(b.text, 'es')
    : (a, b) => b.count - a.count || a.text.localeCompare(b.text, 'es'));

  sorted.forEach((w, i) => {
    const tr = el('tr');
    tr.append(el('td', 'rank', String(i + 1)));

    const tdW = el('td');
    const wrap = el('span', 'res-word');
    const dot = el('span', 'res-dot');
    dot.style.background = colorOf(w.key);
    wrap.append(dot, el('span', '', w.text));
    tdW.append(wrap);
    tr.append(tdW);

    tr.append(el('td', 'num', String(w.count)));
    tr.append(el('td', 'num', pctStr(w.pct)));

    const tdV = el('td', 'num');
    if (!isScale && w.votes > 0) tdV.append(el('span', 'res-votes', '★ ' + w.votes));
    else tdV.textContent = '–';
    tr.append(tdV);

    const tdB = el('td', 'bar-cell');
    const bar = el('div', 'res-bar');
    bar.style.width = Math.max(2, w.pct) + '%';
    bar.style.background = colorOf(w.key);
    tdB.append(bar);
    tr.append(tdB);

    const tdX = el('td');
    const del = el('button', 'res-del');
    del.type = 'button';
    del.title = 'Eliminar esta respuesta';
    del.innerHTML = TRASH_SVG;
    del.dataset.key = w.key;
    tdX.append(del);
    tr.append(tdX);

    body.append(tr);
  });
}

[['#chart-bars','bars'], ['#chart-dots','dots'], ['#chart-donut','donut']].forEach(([sel, mode]) => {
  $(sel).addEventListener('click', () => { liveState.chart = mode; renderLive(); });
});

function renderChartInto(words, total, q){
  const area = $('#chart-area');
  area.textContent = '';

  if (!words.length){
    area.append(el('p', 'chart-note', 'Los gráficos aparecerán aquí en cuanto lleguen respuestas.'));
    return;
  }
  if (q.type === 'scale'){ chartScale(area, q); return; }
  if (liveState.chart === 'bars')  chartBars(area, words);
  if (liveState.chart === 'dots')  chartDots(area, words);
  if (liveState.chart === 'donut') chartDonut(area, words, total);
}

function chartBars(area, words){
  const max = words[0].count;
  words.slice(0, 12).forEach(w => {
    const row = el('div', 'cbar');
    row.append(el('span', 'cbar-label', w.text));
    const track = el('div', 'cbar-track');
    const fill = el('div', 'cbar-fill');
    fill.style.background = colorOf(w.key);
    track.append(fill);
    row.append(track, el('span', 'cbar-val', w.count + ' · ' + pctStr(w.pct)));
    area.append(row);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      fill.style.width = Math.max(2, w.count / max * 100) + '%';
    }));
  });
  if (words.length > 12){
    area.append(el('p', 'chart-note', '+' + (words.length - 12) + ' respuestas más (ver tabla).'));
  }
}

function chartDots(area, words){
  area.append(el('p', 'chart-note', 'Cada punto es una respuesta.'));
  words.slice(0, 10).forEach(w => {
    const box = el('div', 'cdot');
    const head = el('div', 'cdot-head');
    head.append(el('b', '', w.text), el('span', '', String(w.count)));
    const dots = el('div', 'cdot-dots');
    const shown = Math.min(w.count, 60);
    for (let i = 0; i < shown; i++){
      const d = el('i');
      d.style.background = colorOf(w.key);
      dots.append(d);
    }
    box.append(head, dots);
    if (w.count > 60) box.append(el('p', 'chart-note', '+ ' + (w.count - 60) + ' puntos más'));
    area.append(box);
  });
  if (words.length > 10){
    area.append(el('p', 'chart-note', '+' + (words.length - 10) + ' respuestas más (ver tabla).'));
  }
}

function chartDonut(area, words, total){
  const wrap = el('div', 'cdonut');
  const space = el('div', 'dspace');
  const svg = svgEl('svg', { viewBox:'0 0 170 170', width:170, height:170 });
  const g = svgEl('g', { transform:'rotate(-90 85 85)' });
  svg.append(g);

  const R = 64, C = 2 * Math.PI * R;
  const otros = words.slice(8).reduce((s, w) => s + w.count, 0);
  const segs = words.slice(0, 8).map(w => ({ label: w.text, count: w.count, color: colorOf(w.key) }));
  if (otros) segs.push({ label: 'Otras respuestas', count: otros, color: '#C9C2B2' });

  let acc = 0;
  segs.forEach(s => {
    const frac = s.count / total;
    g.append(svgEl('circle', {
      cx:85, cy:85, r:R, fill:'none',
      stroke:s.color, 'stroke-width':30,
      'stroke-dasharray': (frac * C) + ' ' + C,
      'stroke-dashoffset': -acc
    }));
    acc += frac * C;
  });

  const center = el('div', 'dcenter');
  center.append(el('b', '', String(total)), el('span', '', 'respuestas'));
  space.append(svg, center);

  const legend = el('div', 'dlegend');
  segs.forEach(s => {
    const item = el('div', 'dlegend-item');
    const dot = el('span', 'res-dot');
    dot.style.background = s.color;
    item.append(dot, el('span', '', s.label), el('b', '', s.count + ' · ' + pctStr(s.count / total * 100)));
    legend.append(item);
  });

  wrap.append(space, legend);
  area.append(wrap);
}

/* --- Escala: estadística y caja y bigotes --- */
function medianOf(a){
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function scaleStats(q){
  const nums = q.responses.map(r => Number(r.key)).filter(n => n >= 1 && n <= 5);
  if (!nums.length) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const lower = sorted.slice(0, mid);
  const upper = sorted.slice(sorted.length % 2 ? mid + 1 : mid);
  return {
    n: nums.length,
    mean: nums.reduce((s, n) => s + n, 0) / nums.length,
    median: medianOf(nums),
    q1: lower.length ? medianOf(lower) : sorted[0],
    q3: upper.length ? medianOf(upper) : sorted[sorted.length - 1],
    min: sorted[0],
    max: sorted[sorted.length - 1],
    nums
  };
}

function chartScale(area, q){
  const st = scaleStats(q);
  if (!st) return;

  if (q.scaleMin || q.scaleMax){
    const ends = el('div', 'scale-ends');
    ends.append(el('span', '', '1 = ' + (q.scaleMin || '1')));
    ends.append(el('span', '', (q.scaleMax || '5') + ' = 5'));
    area.append(ends);
  }

  const counts = [0,0,0,0,0];
  st.nums.forEach(n => counts[n - 1]++);
  const max = Math.max(...counts, 1);
  counts.forEach((c, i) => {
    const row = el('div', 'cbar');
    row.append(el('span', 'cbar-label', String(i + 1)));
    const track = el('div', 'cbar-track');
    const fill = el('div', 'cbar-fill');
    fill.style.background = PALETTE[i % PALETTE.length];
    track.append(fill);
    row.append(track, el('span', 'cbar-val', c + ' · ' + pctStr(c / st.n * 100)));
    area.append(row);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      fill.style.width = Math.max(2, c / max * 100) + '%';
    }));
  });

  const stats = el('div', 'scale-stats');
  [['Media', numStr(st.mean)], ['Mediana', numStr(st.median)],
   ['Mínimo', String(st.min)], ['Máximo', String(st.max)], ['Respuestas', String(st.n)]]
    .forEach(([k, v]) => {
      const d = el('span', 'ss');
      d.append(el('b', '', v), document.createTextNode(k));
      stats.append(d);
    });
  area.append(stats);

  const W = 320, H = 64;
  const map = v => 14 + ((v - 0.5) / 5) * (W - 28);
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'boxplot' });

  svg.append(svgEl('line', { x1: map(st.min), y1: 26, x2: map(st.max), y2: 26, stroke: 'currentColor', 'stroke-width': 1.5 }));
  [['min','1'],['max','5']].forEach(([k, t]) => {
    const tx = svgEl('text', { x: map(st[k]), y: 20, 'text-anchor': 'middle', 'font-size': 9, fill: 'currentColor' });
    tx.textContent = t;
    svg.append(tx);
  });
  svg.append(svgEl('rect', {
    x: map(st.q1), y: 18, width: Math.max(2, map(st.q3) - map(st.q1)), height: 16,
    rx: 4, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.8
  }));
  svg.append(svgEl('line', { x1: map(st.median), y1: 18, x2: map(st.median), y2: 34, stroke: '#FF5D3A', 'stroke-width': 2.4 }));

  st.nums.forEach((n, i) => {
    svg.append(svgEl('circle', {
      cx: map(n) + ((i % 7) - 3) * 2.2, cy: 48, r: 2.4,
      fill: colorOf(String(n)), opacity: .85
    }));
  });
  const leyenda = svgEl('text', { x: 2, y: 61, 'font-size': 8.5, fill: 'currentColor', opacity: .7 });
  leyenda.textContent = 'cada punto es un alumno · línea naranja = mediana';
  svg.append(leyenda);

  area.append(svg);
}

/* --- Eliminar desde la tabla (dos pasos, soft delete) --- */
 $('#res-body').addEventListener('click', e => {
  const btn = e.target.closest('.res-del');
  if (!btn) return;
  const key = btn.dataset.key;
  if (btn.dataset.armed){
    const q = currentQ();
    const n = q.responses.filter(r => r.key === key).length;
    hideWordTooltip();
    softDeleteResponsesByKey(teacherCode, q.id, key)
      .then(done => toast('Respuesta eliminada (' + done + ' apariciones)'));
  } else {
    btn.dataset.armed = '1';
    btn.classList.add('armed');
    btn.title = 'Pulsa otra vez para confirmar';
    setTimeout(() => { delete btn.dataset.armed; btn.classList.remove('armed'); }, 2500);
  }
});

/* --- CSV --- */
const csvEscape = v => '"' + String(v).replace(/"/g, '""') + '"';

 $('#btn-export').addEventListener('click', () => {
  if (!session) return;
  const s = sessionView();
  const rows = [['Pregunta','Respuesta','Frecuencia','Porcentaje','Votos']];
  s.questions.forEach(q => {
    computeWords(q).forEach(w =>
      rows.push([q.text, w.text, String(w.count), pctStr(w.pct), String(w.votes || 0)]));
  });
  const csv = '\uFEFF' + rows.map(r => r.map(csvEscape).join(';')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = el('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ACnimbus-' + s.code + '-resultados.csv';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast('CSV descargado');
});

/* --- Impresión / PDF --- */
 $('#btn-print').addEventListener('click', () => {
  if (!session) return;
  buildPrintArea(sessionView());
  window.print();
});
window.addEventListener('afterprint', () => { $('#print-area').textContent = ''; });

function buildPrintArea(s){
  let html = '<h1 class="pa-title">' + escHTML(s.title) + '</h1>'
    + '<p class="pa-meta">ACnimbus · código de sesión ' + escHTML(s.code)
    + ' · ' + new Date().toLocaleString('es-ES') + '</p>';

  s.questions.forEach((q, i) => {
    const words = computeWords(q);
    const people = new Set(q.responses.map(r => r.authorId)).size;
    let extra = ' · cada ● = 1 respuesta';
    if (q.type === 'scale'){
      const st = scaleStats(q);
      if (st) extra += ' · media ' + numStr(st.mean) + ' · mediana ' + numStr(st.median);
    }
    html += '<h2 class="pa-q">' + (i + 1) + '. ' + escHTML(q.text) + '</h2>'
      + '<p class="pa-sum">' + people + ' participantes · ' + q.responses.length + ' respuestas' + extra + '</p>';
    if (words.length){
      html += '<table class="pa-table"><thead><tr><th>#</th><th>Respuesta</th>'
        + '<th style="text-align:right">Frecuencia</th><th style="text-align:right">Porcentaje</th><th>Votos</th><th>Distribución</th></tr></thead><tbody>';
      words.forEach((w, j) => {
        const dots = '●'.repeat(Math.min(w.count, 30)) + (w.count > 30 ? '…' : '');
        const votes = (q.type !== 'scale' && w.votes) ? '★ ' + w.votes : '–';
        html += '<tr><td>' + (j + 1) + '</td><td>' + escHTML(w.text) + '</td><td style="text-align:right">'
          + w.count + '</td><td style="text-align:right">' + pctStr(w.pct) + '</td><td>' + votes + '</td>'
          + '<td class="pa-dots">' + dots + '</td></tr>';
      });
      html += '</tbody></table>';
    } else {
      html += '<p class="pa-sum">Sin respuestas.</p>';
    }
  });
  $('#print-area').innerHTML = html;
}

/* ============================================================
   10 · ALUMNO
============================================================ */
function resetJoin(){
  joinCode = null;
  $('#join-step1').hidden = false;
  $('#join-step2').hidden = true;
  $('#join-code').value = '';
  $('#join-name').value = '';
  $('#join-error').hidden = true;
}

function showJoinError(msg){
  const err = $('#join-error');
  err.textContent = msg;
  err.hidden = false;
}

async function tryJoinCode(raw){
  if (!FIREBASE_OK){ showJoinError('La app aún no está configurada (falta Firebase).'); return; }
  const m = String(raw || '').toUpperCase().replace(/\s+/g, '').match(/^([A-Z]{3})-?(\d{3})$/);
  if (!m){ showJoinError('El código tiene el formato ABC-123.'); return; }
  const code = m[1] + '-' + m[2];

  try{
    const doc = await fdb.collection('sessions').doc(code).get();
    if (!doc.exists){ showJoinError('No encuentro ninguna sesión con ese código.'); return; }
    const data = doc.data();
    if (data.ended){ showJoinError('Esta sesión ya ha finalizado.'); return; }

    joinCode = code;
    if (data.settings.anonymous){
      finishJoin(null);
    } else {
      $('#join-step1').hidden = true;
      $('#join-step2').hidden = false;
      $('#join-name').focus();
    }
  }catch(err){
    console.error(err);
    showJoinError('Sin conexión. Comprueba tu internet e inténtalo de nuevo.');
  }
}

 $('#join-form').addEventListener('submit', e => {
  e.preventDefault();
  if ($('#join-step2').hidden){
    tryJoinCode($('#join-code').value);
  } else {
    finishJoin(sanitizeName($('#join-name').value) || null);
  }
});

function autoJoinFromURL(){
  const m = location.hash.match(/^#([A-Za-z]{3})-?(\d{3})$/);
  if (!m) return false;
  showView('join');
  resetJoin();
  $('#join-code').value = (m[1] + '-' + m[2]).toUpperCase();
  tryJoinCode($('#join-code').value);
  return true;
}

function finishJoin(name){
  student = { code: joinCode, authorId: uid(), name };
  sessionStorage.setItem(S_KEY, JSON.stringify(student));
  lastStudentSig = null;
  justSent = null;
  if (sessionStatus === 'idle' || sessionStatus === 'missing' || (session && session.code !== joinCode)){
    watchSession(joinCode);
  }
  showView('student');
  renderStudent();
}

 $('#btn-join-back').addEventListener('click', resetJoin);

/* Los alumnos no salen al inicio: permanecen en su pantalla */
 $('#btn-join-home').hidden = true;

 $('#btn-student-leave').addEventListener('click', () => {
  stopWatching();
  student = null;
  sessionStatus = 'idle';
  sessionStorage.removeItem(S_KEY);
  showView('join');
  resetJoin();
});

function messageZone(icon, title, sub){
  const box = el('div', 'zone-msg');
  if (icon) box.insertAdjacentHTML('afterbegin', icon);
  box.append(el('p', 'zone-title', title));
  if (sub) box.append(el('p', 'zone-sub', sub));
  return box;
}

function checkSVG(){
  const wrap = el('div');
  wrap.innerHTML = '<svg class="sent-check" viewBox="0 0 60 60" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="30" cy="30" r="26"/><path d="M19 31.5 27 39l14-17"/></svg>';
  return wrap.firstElementChild;
}

function appendMyWords(z, mine){
  if (!mine.length) return;
  const wrap = el('div', 'my-words');
  mine.forEach(r => wrap.append(el('span', '', r.text)));
  z.append(wrap);
}

/* --- Votación del alumno --- */
async function castVote(q, key){
  if (!session || !student) return;
  const max = session.settings.maxVotes || VOTES_PER_STUDENT;
  const my = (q.votesList || []).filter(v => v.voterId === student.authorId);
  if (my.length >= max){ toast('Ya usaste tus ' + max + ' votos', 'warn'); return; }
  if (my.some(v => v.key === key)){ toast('Ya votaste esa palabra', 'warn'); return; }
  try{
    await addVote(session.code, q.id, { voterId: student.authorId, key, ts: Date.now() });
    playDrop();
  }catch(err){
    console.error(err);
    toast('No se pudo votar (¿sin conexión?)', 'warn');
  }
}

function appendVoteBox(z, q){
  const max = session.settings.maxVotes || VOTES_PER_STUDENT;
  const my = (q.votesList || []).filter(v => v.voterId === student.authorId);
  const rem = max - my.length;
  const words = computeWords(q);

  const box = el('div', 'vote-box');
  box.append(el('p', 'zone-title', 'Vota las palabras de tus compañeros'));
  box.append(el('p', 'zone-sub', rem > 0
    ? 'Toca hasta ' + rem + (rem === 1 ? ' palabra' : ' palabras') + ' para votarlas'
    : 'Ya usaste tus ' + max + ' votos. ¡Bien ahí!'));

  const chips = el('div', 'vote-chips');
  if (rem > 0){
    words.forEach(w => {
      const b = el('button', 'vote-chip', w.text);
      b.type = 'button';
      b.addEventListener('click', () => castVote(q, w.key));
      chips.append(b);
    });
  }
  box.append(chips);

  if (my.length){
    const mine = el('div', 'my-votes');
    my.forEach(v => {
      const w = words.find(x => x.key === v.key);
      mine.append(el('span', '', '★ ' + (w ? w.text : v.key)));
    });
    box.append(mine);
  }
  z.append(box);
}

function renderStudent(){
  if (!student) return;

  if (sessionStatus === 'missing' || (session && session.code !== student.code)){
    lastStudentSig = null;
    const z = $('#student-zone');
    z.textContent = '';
    z.append(messageZone(SVG_CLOUD, 'Esa sesión ya no existe',
      'Puede que el profesor la haya cerrado o borrado.'));
    $('#student-meta').textContent = '';
    return;
  }
  if (sessionStatus !== 'live' || !session || !questions.length){
    if (lastStudentSig !== 'loading'){
      lastStudentSig = 'loading';
      const z = $('#student-zone');
      z.textContent = '';
      z.append(messageZone(SVG_CLOCK, 'Conectando con la clase…', 'Un momento, por favor.'));
    }
    return;
  }

  const s = session;
  $('#student-code').textContent = s.code;
  $('#student-title').textContent = s.title;

  const meta = $('#student-meta');
  if (s.ended){
    meta.textContent = 'Puedes cerrar esta página. ¡Gracias por participar!';
  } else {
    meta.textContent = 'La clase lleva ' + responses.filter(r => !r.deleted).length +
      (responses.length === 1 ? ' respuesta' : ' respuestas');
  }

  if (s.ended){
    if (lastStudentSig !== 'ended'){
      lastStudentSig = 'ended';
      const z = $('#student-zone');
      z.textContent = '';
      z.append(messageZone(SVG_CLOUD, 'La sesión ha finalizado', '¡Gracias por participar en la tormenta de palabras!'));
    }
    return;
  }

  const q = questions[clamp(s.current, 0, questions.length - 1)];
  const mine = q.responses.filter(r => r.authorId === student.authorId);
  const remaining = s.settings.maxPerStudent - mine.length;
  const showingSent = justSent && justSent.until > Date.now();
  const myVotesN = (q.votesList || []).filter(v => v.voterId === student.authorId).length;

  const sig = [q.id, q.status, mine.length, showingSent ? justSent.text : '',
               q.voting ? 'V' + myVotesN : '', q.type].join('|');
  if (sig === lastStudentSig) return;
  lastStudentSig = sig;

  const z = $('#student-zone');
  z.textContent = '';

  if (q.status === 'waiting'){
    z.append(messageZone(SVG_CLOCK, 'Espera un momento…', 'Tu profe todavía no ha abierto la pregunta.'));
    if (q.voting && q.type !== 'scale') appendVoteBox(z, q);
    return;
  }
  if (q.status === 'paused'){
    z.append(messageZone(SVG_PAUSE, 'La tormenta está en pausa', 'Aprovecha para pensar tu respuesta.'));
    if (q.voting && q.type !== 'scale') appendVoteBox(z, q);
    return;
  }
  if (q.status === 'closed'){
    z.append(messageZone(SVG_NEXT, 'Pregunta cerrada', 'Esperando la siguiente pregunta…'));
    if (q.voting && q.type !== 'scale') appendVoteBox(z, q);
    return;
  }

  // Pregunta abierta
  if (showingSent){
    const box = el('div', 'sent-box');
    box.append(checkSVG());
    box.append(el('p', 'sent-word', '“' + justSent.text + '”'));
    box.append(el('p', 'zone-sub', '¡Respuesta recibida! Ya vuela en la tormenta de la clase.'));
    if (remaining > 0){
      const again = el('button', 'btn btn-ghost btn-sm', 'Enviar otra palabra');
      again.type = 'button';
      again.addEventListener('click', () => { justSent = null; lastStudentSig = null; renderStudent(); });
      box.append(again);
    }
    z.append(box);
    if (q.voting && q.type !== 'scale') appendVoteBox(z, q);
    return;
  }

  if (remaining <= 0){
    const box = el('div', 'zone-msg');
    box.append(el('p', 'zone-title', 'Ya has enviado tus ' + s.settings.maxPerStudent +
      (s.settings.maxPerStudent === 1 ? ' respuesta' : ' respuestas')));
    box.append(el('p', 'zone-sub', '¡Bien jugado!'));
    z.append(box);
    appendMyWords(z, mine);
    if (q.voting && q.type !== 'scale') appendVoteBox(z, q);
    return;
  }

  z.append(el('p', 'q-text', q.text));

  if (q.type === 'scale'){
    if (q.scaleMin || q.scaleMax){
      const ends = el('div', 'scale-ends-stu');
      ends.append(el('span', '', '1 = ' + (q.scaleMin || '')));
      ends.append(el('span', '', (q.scaleMax || '') + ' = 5'));
      z.append(ends);
    }
    const row = el('div', 'scale-row');
    for (let n = 1; n <= 5; n++){
      const b = el('button', 'scale-btn', String(n));
      b.type = 'button';
      b.addEventListener('click', () => submitStudentAnswer(String(n)));
      row.append(b);
    }
    z.append(row);
  } else {
    const form = el('form', 'answer-form');
    const input = el('input');
    input.type = 'text';
    input.maxLength = MAX_LEN;
    input.placeholder = 'Escribe tu respuesta…';
    input.autocomplete = 'off';
    const send = el('button', 'btn btn-ink');
    send.type = 'submit';
    send.innerHTML = SEND_SVG + ' Enviar';
    form.append(input, send);
    z.append(form);

    const note = el('p', 'remaining-note');
    const cc = el('span');
    cc.textContent = '0/' + MAX_LEN;
    note.append(cc, document.createTextNode(' · te quedan ' + remaining + (remaining === 1 ? ' respuesta' : ' respuestas')));
    z.append(note);
    appendMyWords(z, mine);

    input.addEventListener('input', () => { cc.textContent = input.value.length + '/' + MAX_LEN; });
    form.addEventListener('submit', e => { e.preventDefault(); submitStudentAnswer(input.value); });

    if (matchMedia('(pointer:fine)').matches) input.focus();
  }

  if (q.voting && q.type !== 'scale') appendVoteBox(z, q);
}

function submitStudentAnswer(raw){
  if (!session || session.ended) return;
  const q = questions[clamp(session.current, 0, questions.length - 1)];
  if (q.status !== 'open'){ toast('La pregunta no está abierta', 'warn'); return; }

  const now = Date.now();
  if (now - lastSubmitTs < COOLDOWN){ toast('Un momento, no tan rápido', 'warn'); return; }

  const mine = q.responses.filter(r => r.authorId === student.authorId);
  if (mine.length >= session.settings.maxPerStudent){ toast('Ya has usado todas tus respuestas', 'warn'); return; }

  let text, key;
  if (q.type === 'scale'){
    const n = parseInt(raw, 10);
    if (!(n >= 1 && n <= 5)) return;
    text = String(n);
    key = String(n);
  } else {
    text = sanitizeAnswer(raw);
    key = text ? normalizeKey(text) : null;
    if (!text || !key){ toast('Esa respuesta no es válida', 'warn'); return; }

    const blocked = session.settings.blocked || [];
    if (blocked.some(b => key.includes(b))){
      toast('El profe ha bloqueado esa palabra en esta actividad', 'warn');
      return;
    }
  }

  if (!session.settings.allowRepeated && mine.some(r => r.key === key)){
    toast('Ya enviaste esa misma respuesta', 'warn');
    return;
  }

  lastSubmitTs = now;
  justSent = { text, until: now + 1900 };
  renderStudent();

  addResponse(session.code, q.id, {
    text, key,
    authorId: student.authorId,
    authorName: student.name,
    ts: now
  }).then(() => {
    setTimeout(renderStudent, 1950);
  }).catch(err => {
    console.error(err);
    justSent = null;
    lastStudentSig = null;
    renderStudent();
    toast('No se pudo enviar (¿sin conexión?)', 'warn');
  });
}

/* ============================================================
   11 · LLUVIA DE DEMOSTRACIÓN (solo preguntas de palabra)
============================================================ */
const DEMO_POOL = [
  'motivación','curiosidad','curiosidad','proyectos','práctica','práctica','ejemplos','compañeros',
  'dudas','exámenes','nervios','escuchar','preguntar','experimentar','jugar','vídeos',
  'aburrimiento','apuntes','trabajo en grupo','error','paciencia','música','mapas mentales',
  'profesor','repasar','dormir','café','tecnología','lectura','ensayo'
];
let demoAuthors = null;

 $('#btn-demo').addEventListener('click', () => {
  const q = currentQ();
  if (!q || q.type === 'scale') return;
  if (q.status !== 'open'){ toast('Abre la pregunta antes de lanzar la lluvia demo', 'warn'); return; }
  if (!demoAuthors) demoAuthors = Array.from({ length: 12 }, () => uid());

  const n = 12 + Math.floor(Math.random() * 6);
  for (let i = 0; i < n; i++){
    setTimeout(() => {
      const text = DEMO_POOL[Math.floor(Math.random() * DEMO_POOL.length)];
      const key = normalizeKey(text);
      const authorId = demoAuthors[Math.floor(Math.random() * demoAuthors.length)];
      if (!session || (!session.settings.allowRepeated &&
          q.responses.some(r => r.authorId === authorId && r.key === key))) return;
      addResponse(session.code, q.id, { text, key, authorId, authorName: null, ts: Date.now(), demo: true })
        .catch(err => console.error(err));
    }, i * 230);
  }
  toast('Lluvia de demostración en camino…');
});

/* ============================================================
   11bis · QR, PROYECTOR Y PNG
============================================================ */
function buildJoinURL(code){
  return location.href.split('#')[0].split('?')[0] + '#' + code;
}

function openQrOverlay(){
  if (!session) return;
  const url = buildJoinURL(session.code);

  $('#qr-code-text').textContent = session.code;
  $('#qr-url-text').textContent = url;

  const box = $('#qr-box');
  box.textContent = '';
  if (typeof QRCode === 'undefined'){
    box.append(el('p', 'qr-fallback', session.code));
    toast('No se pudo generar el QR (sin conexión). Proyecta el código.', 'warn');
  } else {
    new QRCode(box, {
      text: url,
      width: 250, height: 250,
      colorDark: '#23201A', colorLight: '#FFFFFF',
      correctLevel: QRCode.CorrectLevel.M
    });
  }
  $('#qr-overlay').hidden = false;
}

function closeQrOverlay(){ $('#qr-overlay').hidden = true; }

 $('#btn-show-qr').addEventListener('click', openQrOverlay);
 $('#qr-close').addEventListener('click', closeQrOverlay);
 $('#qr-overlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeQrOverlay(); });

 $('#qr-copy-link').addEventListener('click', async () => {
  if (!session) return;
  try{
    await navigator.clipboard.writeText(buildJoinURL(session.code));
    toast('Enlace copiado');
  }catch(e){ toast(buildJoinURL(session.code)); }
});

function enterProjector(){
  if (!session) return;
  liveState.mode = 'storm';
  renderLive();
  document.body.classList.add('projector');
  const stage = $('.stage');
  if (stage.requestFullscreen)       stage.requestFullscreen().catch(() => {});
  else if (stage.webkitRequestFullscreen) stage.webkitRequestFullscreen();
}

function exitProjector(){
  if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
  document.body.classList.remove('projector');
  renderLive();
}

 $('#btn-projector').addEventListener('click', enterProjector);
 $('#btn-exit-projector').addEventListener('click', exitProjector);

document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) document.body.classList.remove('projector');
});

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!$('#qr-overlay').hidden) closeQrOverlay();
  else if (document.body.classList.contains('projector')) exitProjector();
});

function wrapCanvasText(ctx, text, x, y, maxW, lh){
  let line = '';
  for (const w of String(text).split(' ')){
    const test = line ? line + ' ' + w : w;
    if (line && ctx.measureText(test).width > maxW){ ctx.fillText(line, x, y); y += lh; line = w; }
    else line = test;
  }
  if (line) ctx.fillText(line, x, y);
}

 $('#btn-export-png').addEventListener('click', () => {
  const q = currentQ();
  if (!q) return;
  const words = computeWords(q);
  if (!words.length){ toast('Todavía no hay respuestas que exportar', 'warn'); return; }
  toast('Generando imagen de la nube…');
  const fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
  fontsReady.then(() => exportStormPNG(sessionView(), q, words));
});

/* El PNG sale siempre en estilo papel claro: es para diapositivas e impresión */
function exportStormPNG(s, q, words){
  const W = 1600, H = 900;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#FCFAF4';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(35,32,26,.055)';
  for (let y = 24; y < H; y += 22)
    for (let x = 24; x < W; x += 22) ctx.fillRect(x, y, 2, 2);

  const HEAD_H = 175, FOOT_H = 75;
  const placed = [
    { x: 0, y: 0, w: W, h: HEAD_H },
    { x: 0, y: H - FOOT_H, w: W, h: FOOT_H }
  ];

  const shown = words.slice(0, 70);
  const maxCount = Math.max(...shown.map(w => w.count));
  const minS = 30, maxS = 118;

  ctx.textBaseline = 'top';
  shown.forEach(w => {
    const label = w.text + (w.votes ? '  ★' + w.votes : '');
    const fontSize = Math.round(minS + (maxS - minS) * Math.sqrt(w.count / maxCount));
    ctx.font = '700 ' + fontSize + 'px "Space Grotesk", "Segoe UI", sans-serif';
    const tw = ctx.measureText(label).width;
    const th = fontSize * 1.15;
    const spot = findSpot(W, H, tw, th, placed);
    placed.push({ x: spot.x, y: spot.y, w: tw, h: th });
    ctx.fillStyle = colorOf(w.key);
    ctx.fillText(label, spot.x, spot.y + (th - fontSize) / 2);
  });

  const drop = new Path2D('M12 2C12 2 5 10.2 5 15a7 7 0 0 0 14 0C19 10.2 12 2 12 2Z');
  ctx.save();
  ctx.translate(50, 36); ctx.scale(2.4, 2.4);
  ctx.fillStyle = '#FF5D3A'; ctx.fill(drop);
  ctx.lineWidth = 1.6 / 2.4; ctx.strokeStyle = '#23201A'; ctx.stroke(drop);
  ctx.restore();

  ctx.fillStyle = '#23201A';
  ctx.font = '700 30px "Fraunces", Georgia, serif';
  ctx.fillText('ACnimbus', 122, 44);

  ctx.font = '600 36px "Fraunces", Georgia, serif';
  wrapCanvasText(ctx, q.text, 50, 102, W - 100, 46);

  const people = new Set(q.responses.map(r => r.authorId)).size;
  ctx.font = '500 22px "Space Grotesk", "Segoe UI", sans-serif';
  ctx.fillStyle = '#6B6455';
  ctx.fillText(
    s.title + '  ·  Código ' + s.code + '  ·  ' + q.responses.length +
    (q.responses.length === 1 ? ' respuesta' : ' respuestas') + '  ·  ' +
    people + ' participantes  ·  ' + new Date().toLocaleDateString('es-ES'),
    50, H - 48);

  canvas.toBlob(blob => {
    const a = el('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ACnimbus-' + s.code + '-nube.png';
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('Imagen PNG descargada');
  }, 'image/png');
}

/* ============================================================
   12 · ARRANQUE
============================================================ */
(function init(){
  applyTheme(currentTheme());
  renderSoundBtn();
  ensureMusicBtn();          // botón de música (junto al de sonido)
  buildBackgroundWords();
  startRain();
  renderHistory();

  try{
    const raw = sessionStorage.getItem(S_KEY);
    if (raw && FIREBASE_OK){
      const st = JSON.parse(raw);
      if (st && st.code){
        student = st;
        lastStudentSig = null;
        watchSession(st.code);
        showView('student');
        renderStudent();
        return;
      }
    }
  }catch(e){}

  if (teacherCode && FIREBASE_OK){
    watchSession(teacherCode);
    showView('live');
    renderLive();
    return;
  }

  if (!autoJoinFromURL()) showView('home');
})();
