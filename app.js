'use strict';

/* ============================================================
   CHUBASCO · Tormenta de palabras para el aula
   VERSIÓN 2 · MULTIUSUARIO (Firebase) + FASE 1
   (gráficos estadísticos, palabras bloqueadas, historial)
   ============================================================ */

/* ============================================================
   1 · CONSTANTES Y UTILIDADES
============================================================ */
const T_KEY = 'chubasco:teacher';
const S_KEY = 'chubasco:student';
const H_KEY = 'chubasco:history';   // historial de sesiones del profesor

const MAX_LEN    = 40;
const COOLDOWN   = 1200;
const MAX_UNIQUE = 60;
const MAX_Q      = 10;

const PALETTE = ['#FF5D3A','#0E9594','#F3A712','#2E6F95','#D1465F','#6FA540'];

const $ = (sel, ctx = document) => ctx.querySelector(sel);

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

const TRASH_SVG = '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/></svg>';
const SEND_SVG  = '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 3 10 14M21 3l-7 18-4-7-7-4 18-7z"/></svg>';

const SVG_CLOCK  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>';
const SVG_PAUSE  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M9 6v12M15 6v12"/></svg>';
const SVG_NEXT   = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h14M13 6l6 6-6 6"/></svg>';
const SVG_CLOUD  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 15a3.5 3.5 0 0 0 0-7 5.5 5.5 0 0 0-10.8 1.2A4 4 0 0 0 7 15h10.5z"/><path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/></svg>';

/* ============================================================
   3 · STORE FIREBASE
   (Configuración ya pegada con los datos del proyecto lluvia1-925b4)
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
let sessionStatus = 'idle';
let unsub1 = null, unsub2 = null, unsub3 = null;

function stopWatching(){
  [unsub1, unsub2, unsub3].forEach(u => { try{ u && u(); }catch(e){} });
  unsub1 = unsub2 = unsub3 = null;
}

function attachResponses(){
  questions.forEach(q => {
    q.responses = responses
      .filter(r => r.qid === q.id)
      .sort((a, b) => (a.ts || 0) - (b.ts || 0));
  });
}

function watchSession(code){
  stopWatching();
  sessionStatus = 'loading';
  session = null; questions = []; responses = [];

  const root = fdb.collection('sessions').doc(code);

  unsub1 = root.onSnapshot(snap => {
    if (!snap.exists){ sessionStatus = 'missing'; session = null; refreshCurrentView(); return; }
    sessionStatus = 'live';
    session = Object.assign({ code }, snap.data());
    refreshCurrentView();
  }, err => {
    console.error(err);
    toast('Error de conexión con Firebase', 'warn');
  });

  unsub2 = root.collection('questions').orderBy('order').onSnapshot(snap => {
    questions = snap.docs.map(d => Object.assign({ id: d.id, responses: [] }, d.data()));
    attachResponses();
    refreshCurrentView();
  });

  unsub3 = fdb.collection('responses').where('code', '==', code).onSnapshot(snap => {
    responses = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
    attachResponses();
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
  const root = fdb.collection('sessions').doc(data.code);
  const batch = fdb.batch();
  batch.set(root, {
    title: data.title,
    settings: data.settings,
    current: 0,
    ended: false,
    createdAt: Date.now()
  });
  data.questions.forEach((q, i) => {
    batch.set(root.collection('questions').doc(q.id), { text: q.text, status: 'waiting', order: i });
  });
  await batch.commit();
}

const updateSession  = (code, patch)      => fdb.collection('sessions').doc(code).set(patch, { merge: true });
const updateQuestion = (code, qid, patch) => fdb.collection('sessions').doc(code).collection('questions').doc(qid).set(patch, { merge: true });

function addResponse(code, qid, r){
  return fdb.collection('responses').add(Object.assign({ code, qid }, r));
}

async function deleteResponsesByKey(code, qid, key){
  const snap = await fdb.collection('responses').where('code', '==', code).get();
  const batch = fdb.batch();
  let n = 0;
  snap.forEach(d => {
    const r = d.data();
    if (r.qid === qid && r.key === key){ batch.delete(d.ref); n++; }
  });
  if (n) await batch.commit();
  return n;
}

async function clearResponses(code, qid){
  const snap = await fdb.collection('responses').where('code', '==', code).get();
  const batch = fdb.batch();
  let n = 0;
  snap.forEach(d => {
    if (d.data().qid === qid){ batch.delete(d.ref); n++; }
  });
  if (n) await batch.commit();
  return n;
}

/* ============================================================
   4 · ROUTER DE VISTAS Y ESTADO GLOBAL
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
   6 · CONFIGURACIÓN DEL PROFESOR
============================================================ */
function readSetupQuestions(){
  return $('#setup-questions').value.split('\n')
    .map(l => l.replace(/\s+/g, ' ').trim().slice(0, 140))
    .filter(Boolean)
    .slice(0, MAX_Q);
}

 $('#setup-questions').addEventListener('input', () => {
  const n = readSetupQuestions().length;
  $('#q-count').textContent = n + (n === 1 ? ' pregunta' : ' preguntas');
});

 $('#setup-form').addEventListener('submit', async e => {
  e.preventDefault();
  if (!FIREBASE_OK){ toast('Primero configura Firebase en app.js', 'warn'); return; }

  const questionsInput = readSetupQuestions();
  if (!questionsInput.length){ toast('Escribe al menos una pregunta', 'warn'); return; }

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
  const qs = questionsInput.map(t => ({ id: uid(), text: t }));

  const submitBtn = $('#setup-form button[type=submit]');
  submitBtn.disabled = true;
  try{
    const code = await generateCode();
    await createSession({ code, title, settings, questions: qs });

    teacherCode = code;
    sessionStorage.setItem(T_KEY, teacherCode);
    liveState.mode = 'storm';
    addHistory(code, title);
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

 $('#btn-go-setup').addEventListener('click', () => showView('setup'));
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
   6bis · HISTORIAL DE SESIONES DEL PROFESOR
   (lista local en este navegador; los datos viven en Firebase)
============================================================ */
function loadHistory(){
  try{ return JSON.parse(localStorage.getItem(H_KEY)) || []; }catch(e){ return []; }
}
function saveHistoryList(list){
  try{ localStorage.setItem(H_KEY, JSON.stringify(list.slice(0, 20))); }catch(e){}
}
function addHistory(code, title){
  const list = loadHistory().filter(h => h.code !== code);
  list.unshift({ code, title, ts: Date.now() });
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
    open.addEventListener('click', () => openHistorySession(h.code));

    const del = el('button', 'btn btn-ghost btn-sm', 'Quitar');
    del.type = 'button';
    del.addEventListener('click', () => removeHistory(h.code));

    actions.append(open, del);
    item.append(info, actions);
    wrap.append(item);
  });
}

function openHistorySession(code){
  if (!FIREBASE_OK) return;
  teacherCode = code;
  sessionStorage.setItem(T_KEY, code);
  liveState.mode = 'storm';
  watchSession(code);
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

  const nav = $('#qnav');
  nav.textContent = '';
  questions.forEach((qq, i) => {
    const b = el('button', 'qchip st-' + qq.status + (i === s.current ? ' active' : ''));
    b.type = 'button';
    b.title = qq.text;
    b.append(el('b', '', String(i + 1)));
    b.append(document.createTextNode(qq.text.length > 24 ? qq.text.slice(0, 24) + '…' : qq.text));
    b.addEventListener('click', () => {
      liveState.mode = 'storm';
      updateSession(teacherCode, { current: i });
    });
    nav.append(b);
  });

  const tbtn = $('#btn-toggle-status');
  if (q.status === 'waiting'){ tbtn.innerHTML = ICONS.play  + ' Abrir pregunta'; tbtn.disabled = false; }
  else if (q.status === 'open'){ tbtn.innerHTML = ICONS.pause + ' Pausar';       tbtn.disabled = false; }
  else if (q.status === 'paused'){ tbtn.innerHTML = ICONS.play  + ' Reanudar';   tbtn.disabled = false; }
  else { tbtn.innerHTML = ICONS.play + ' Pregunta cerrada'; tbtn.disabled = true; }

  $('#btn-close-q').disabled = (q.status === 'waiting' || q.status === 'closed');
  $('#btn-next-q').disabled  = (s.current >= questions.length - 1);
  $('#btn-demo').disabled    = (q.status !== 'open');
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
  await clearResponses(teacherCode, q.id);
  await updateQuestion(teacherCode, q.id, { status: 'waiting' });
  toast('Pregunta reiniciada');
}));

 $('#btn-view-results').addEventListener('click', () => {
  liveState.mode = (liveState.mode === 'storm') ? 'results' : 'storm';
  renderLive();
});
 $('#sort-freq').addEventListener('click',  () => { liveState.sort = 'freq';  renderLive(); });
 $('#sort-alpha').addEventListener('click', () => { liveState.sort = 'alpha'; renderLive(); });

 $('#btn-end').addEventListener('click', e => armTwoStep(e.currentTarget, async () => {
  const root = fdb.collection('sessions').doc(teacherCode);
  const batch = fdb.batch();
  questions.forEach(q => batch.update(root.collection('questions').doc(q.id), { status: 'closed' }));
  batch.update(root, { ended: true });
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
  const words = [...groups.values()].map(g => {
    let text = g.key, best = 0;
    for (const [v, n] of g.variants){ if (n > best){ best = n; text = v; } }
    return { key: g.key, text, count: g.count };
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
    const maxS = clamp(H * 0.18, 46, 86);
    const placed = [];

    shown.forEach((w, i) => {
      const fontSize = Math.round(minS + (maxS - minS) * Math.sqrt(w.count / maxCount));

      let rec = this.els.get(w.key);
      const isNew = !rec;
      if (isNew){
        const b = el('button', 'word');
        b.type = 'button';
        const inner = el('span', 'w-in', w.text);
        inner.style.setProperty('--fd', (Math.random() * 3).toFixed(2) + 's');
        b.append(inner);
        b.style.color = colorOf(w.key);
        b.addEventListener('click', () => onStormWordClick(w.key, b));
        c.append(b);
        rec = { el: b, inner };
        this.els.set(w.key, rec);
      }
      rec.el.style.fontSize = fontSize + 'px';
      rec.inner.textContent = w.text;

      const bw = rec.el.offsetWidth, bh = rec.el.offsetHeight;
      const spot = findSpot(W, H, bw, bh, placed);
      rec.el.style.transform = `translate(${spot.x}px, ${spot.y}px)`;
      placed.push({ x: spot.x, y: spot.y, w: bw, h: bh });

      if (isNew){
        rec.el.classList.add('is-new');
        const d = Math.min(i * 45, 450);
        rec.inner.style.animationDelay = `${d}ms, calc(${d}ms + .7s)`;
        setTimeout(() => rec.el.classList.remove('is-new'), 1400);
      }
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
  $('#wt-stats').textContent = w.count + (w.count === 1 ? ' respuesta' : ' respuestas') + ' · ' + pctStr(w.pct) + ' de la clase';
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
  const n = q.responses.filter(r => r.key === key).length;
  hideWordTooltip();
  await deleteResponsesByKey(teacherCode, q.id, key);
  toast('Respuesta eliminada (' + n + ' apariciones)');
});

document.addEventListener('pointerdown', e => {
  if ($('#word-tooltip').hidden) return;
  if (e.target.closest('#word-tooltip') || e.target.closest('.word')) return;
  hideWordTooltip();
});

/* ============================================================
   9 · RESULTADOS, GRÁFICOS, CSV E IMPRESIÓN
============================================================ */
function renderResults(s, q){
  $('#res-q-tag').textContent = '· ' + (s.current + 1) + '/' + questions.length;

  const words = computeWords(q);
  const people = new Set(q.responses.map(r => r.authorId)).size;
  $('#res-summary').textContent =
    people + ' participantes · ' + q.responses.length +
    (q.responses.length === 1 ? ' respuesta' : ' respuestas') +
    ' · ' + words.length + (words.length === 1 ? ' respuesta distinta' : ' respuestas distintas');

  $('#sort-freq').classList.toggle('active', liveState.sort === 'freq');
  $('#sort-alpha').classList.toggle('active', liveState.sort === 'alpha');

  // Selector de gráfico
  $('#chart-bars').classList.toggle('active', liveState.chart === 'bars');
  $('#chart-dots').classList.toggle('active', liveState.chart === 'dots');
  $('#chart-donut').classList.toggle('active', liveState.chart === 'donut');
  renderChartInto(words, q.responses.length);

  const body = $('#res-body');
  body.textContent = '';

  if (!words.length){
    body.innerHTML = '<tr><td colspan="6" class="res-empty">Todavía no hay respuestas en esta pregunta.</td></tr>';
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

/* --- Selector de tipo de gráfico --- */
[['#chart-bars','bars'], ['#chart-dots','dots'], ['#chart-donut','donut']].forEach(([sel, mode]) => {
  $(sel).addEventListener('click', () => { liveState.chart = mode; renderLive(); });
});

function renderChartInto(words, total){
  const area = $('#chart-area');
  area.textContent = '';

  if (!words.length){
    area.append(el('p', 'chart-note', 'Los gráficos aparecerán aquí en cuanto lleguen respuestas.'));
    return;
  }
  if (liveState.chart === 'bars')  chartBars(area, words);
  if (liveState.chart === 'dots')  chartDots(area, words);
  if (liveState.chart === 'donut') chartDonut(area, words, total);
}

/** GRÁFICO DE BARRAS · top 12 respuestas */
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

/** GRÁFICO DE PUNTOS · cada punto = una respuesta de un alumno */
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

/** GRÁFICO DE PASTEL (DONUT) · top 8 + "otras" */
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

/* --- Eliminar respuesta desde la tabla (dos pasos) --- */
 $('#res-body').addEventListener('click', e => {
  const btn = e.target.closest('.res-del');
  if (!btn) return;
  const key = btn.dataset.key;
  if (btn.dataset.armed){
    const q = currentQ();
    const n = q.responses.filter(r => r.key === key).length;
    hideWordTooltip();
    deleteResponsesByKey(teacherCode, q.id, key)
      .then(() => toast('Respuesta eliminada (' + n + ' apariciones)'));
  } else {
    btn.dataset.armed = '1';
    btn.classList.add('armed');
    btn.title = 'Pulsa otra vez para confirmar';
    setTimeout(() => { delete btn.dataset.armed; btn.classList.remove('armed'); }, 2500);
  }
});

/* --- Exportación CSV --- */
const csvEscape = v => '"' + String(v).replace(/"/g, '""') + '"';

 $('#btn-export').addEventListener('click', () => {
  if (!session) return;
  const s = sessionView();
  const rows = [['Pregunta','Respuesta','Frecuencia','Porcentaje']];
  s.questions.forEach(q => {
    computeWords(q).forEach(w =>
      rows.push([q.text, w.text, String(w.count), pctStr(w.pct)]));
  });
  const csv = '\uFEFF' + rows.map(r => r.map(csvEscape).join(';')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = el('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'chubasco-' + s.code + '-resultados.csv';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast('CSV descargado');
});

/* --- Impresión / PDF (incluye distribución con puntos ●) --- */
 $('#btn-print').addEventListener('click', () => {
  if (!session) return;
  buildPrintArea(sessionView());
  window.print();
});
window.addEventListener('afterprint', () => { $('#print-area').textContent = ''; });

function buildPrintArea(s){
  let html = '<h1 class="pa-title">' + escHTML(s.title) + '</h1>'
    + '<p class="pa-meta">Chubasco · código de sesión ' + escHTML(s.code)
    + ' · ' + new Date().toLocaleString('es-ES') + '</p>';

  s.questions.forEach((q, i) => {
    const words = computeWords(q);
    const people = new Set(q.responses.map(r => r.authorId)).size;
    html += '<h2 class="pa-q">' + (i + 1) + '. ' + escHTML(q.text) + '</h2>'
      + '<p class="pa-sum">' + people + ' participantes · ' + q.responses.length + ' respuestas · cada ● = 1 respuesta</p>';
    if (words.length){
      html += '<table class="pa-table"><thead><tr><th>#</th><th>Respuesta</th>'
        + '<th style="text-align:right">Frecuencia</th><th style="text-align:right">Porcentaje</th><th>Distribución</th></tr></thead><tbody>';
      words.forEach((w, j) => {
        const dots = '●'.repeat(Math.min(w.count, 30)) + (w.count > 30 ? '…' : '');
        html += '<tr><td>' + (j + 1) + '</td><td>' + escHTML(w.text) + '</td><td style="text-align:right">'
          + w.count + '</td><td style="text-align:right">' + pctStr(w.pct) + '</td>'
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
   10 · ALUMNO: ENTRAR Y PARTICIPAR
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
 $('#btn-join-home').addEventListener('click', () => showView('home'));
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
    meta.textContent = 'La clase lleva ' + responses.length +
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

  const sig = [q.id, q.status, mine.length, showingSent ? justSent.text : ''].join('|');
  if (sig === lastStudentSig) return;
  lastStudentSig = sig;

  const z = $('#student-zone');
  z.textContent = '';

  if (q.status === 'waiting'){
    z.append(messageZone(SVG_CLOCK, 'Espera un momento…', 'Tu profe todavía no ha abierto la pregunta.'));
    return;
  }
  if (q.status === 'paused'){
    z.append(messageZone(SVG_PAUSE, 'La tormenta está en pausa', 'Aprovecha para pensar tu respuesta.'));
    return;
  }
  if (q.status === 'closed'){
    z.append(messageZone(SVG_NEXT, 'Pregunta cerrada', 'Esperando la siguiente pregunta…'));
    return;
  }

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
    return;
  }

  if (remaining <= 0){
    const box = el('div', 'zone-msg');
    box.append(el('p', 'zone-title', 'Ya has enviado tus ' + s.settings.maxPerStudent +
      (s.settings.maxPerStudent === 1 ? ' respuesta' : ' respuestas')));
    box.append(el('p', 'zone-sub', '¡Bien jugado!'));
    z.append(box);
    appendMyWords(z, mine);
    return;
  }

  z.append(el('p', 'q-text', q.text));

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

function submitStudentAnswer(raw){
  if (!session) return;
  if (session.ended) return;
  const q = questions[clamp(session.current, 0, questions.length - 1)];
  if (q.status !== 'open'){ toast('La pregunta no está abierta', 'warn'); return; }

  const now = Date.now();
  if (now - lastSubmitTs < COOLDOWN){ toast('Un momento, no tan rápido', 'warn'); return; }

  const mine = q.responses.filter(r => r.authorId === student.authorId);
  if (mine.length >= session.settings.maxPerStudent){ toast('Ya has usado todas tus respuestas', 'warn'); return; }

  const text = sanitizeAnswer(raw);
  const key = text ? normalizeKey(text) : null;
  if (!text || !key){ toast('Esa respuesta no es válida', 'warn'); return; }

  // Palabras bloqueadas por el profesor (coincidencia por substring normalizado)
  const blocked = session.settings.blocked || [];
  if (blocked.some(b => key.includes(b))){
    toast('El profe ha bloqueado esa palabra en esta actividad', 'warn');
    return;
  }

  if (!session.settings.allowRepeated && mine.some(r => r.key === key)){
    toast('Ya enviaste esa misma palabra', 'warn');
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
   11 · LLUVIA DE DEMOSTRACIÓN
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
  if (!q) return;
  if (q.status !== 'open'){ toast('Abre la pregunta antes de lanzar la lluvia demo', 'warn'); return; }
  if (!demoAuthors) demoAuthors = Array.from({ length: 12 }, () => uid());

  const n = 12 + Math.floor(Math.random() * 6);
  for (let i = 0; i < n; i++){
    setTimeout(() => {
      const text = DEMO_POOL[Math.floor(Math.random() * DEMO_POOL.length)];
      const key = normalizeKey(text);
      const authorId = demoAuthors[Math.floor(Math.random() * demoAuthors.length)];
      if (!session || !session.settings.allowRepeated &&
          q.responses.some(r => r.authorId === authorId && r.key === key)) return;
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
    const fontSize = Math.round(minS + (maxS - minS) * Math.sqrt(w.count / maxCount));
    ctx.font = '700 ' + fontSize + 'px "Space Grotesk", "Segoe UI", sans-serif';
    const tw = ctx.measureText(w.text).width;
    const th = fontSize * 1.15;
    const spot = findSpot(W, H, tw, th, placed);
    placed.push({ x: spot.x, y: spot.y, w: tw, h: th });
    ctx.fillStyle = colorOf(w.key);
    ctx.fillText(w.text, spot.x, spot.y + (th - fontSize) / 2);
  });

  const drop = new Path2D('M12 2C12 2 5 10.2 5 15a7 7 0 0 0 14 0C19 10.2 12 2 12 2Z');
  ctx.save();
  ctx.translate(50, 36); ctx.scale(2.4, 2.4);
  ctx.fillStyle = '#FF5D3A'; ctx.fill(drop);
  ctx.lineWidth = 1.6 / 2.4; ctx.strokeStyle = '#23201A'; ctx.stroke(drop);
  ctx.restore();

  ctx.fillStyle = '#23201A';
  ctx.font = '700 30px "Fraunces", Georgia, serif';
  ctx.fillText('Chubasco', 122, 44);

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
    a.download = 'chubasco-' + s.code + '-nube.png';
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    toast('Imagen PNG descargada');
  }, 'image/png');
}

/* ============================================================
   12 · ARRANQUE
============================================================ */
(function init(){
  buildBackgroundWords();
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
