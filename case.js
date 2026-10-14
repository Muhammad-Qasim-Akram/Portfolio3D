(() => {
'use strict';

/* ------------------------------------------------------------------
   RESULTS: fill this in after running loadtest/k6-chatroom.js.
   Leave a value as null and its tile shows "Not measured yet".
------------------------------------------------------------------ */
const RESULTS = {
  setup: '',   // e.g. 'k6 from a laptop, 2 vCPU Railway service, 1 room, 5 msg/s per client'
  date: '',    // e.g. 'Oct 2026'
  tiles: [
    { key: 'connections', label: 'concurrent WebSockets held', unit: '', value: null },
    { key: 'p95',         label: 'p95 message delivery',       unit: 'ms', value: null },
    { key: 'rate',        label: 'messages per second sustained', unit: '/s', value: null },
    { key: 'errors',      label: 'failed connections or sends', unit: '%', value: null }
  ],
  series: []   // e.g. [{ clients: 50, p50: 12, p95: 30 }, { clients: 100, p50: 15, p95: 41 }]
};

/* ---------------- content ---------------- */
const NODES = [
  { id: 'a',     tag: 'Client',   glyph: 'Re', name: 'React client',
    role: 'Holds one WebSocket per open room and renders whatever arrives on it.',
    decision: 'Opens the socket with the access token in the URL, because the browser WebSocket API cannot set an Authorization header.',
    trade: 'Simple and works cross-origin, but a token in a URL can end up in proxy or server logs.' },
  { id: 'auth',  tag: 'JWT auth', glyph: 'Jw', name: 'Channels auth middleware',
    role: 'Custom ASGI middleware that runs before any consumer.',
    decision: 'Reads the token from the query string, validates it with SimpleJWT and puts the user in the connection scope. A bad token never reaches a consumer.',
    trade: 'One auth system for REST and sockets. Costs a custom layer I have to maintain, and the log-leak risk above.' },
  { id: 'con',   tag: 'Consumer', glyph: 'Ch', name: 'Channels consumer',
    role: 'One instance per connection. Joins the room group, receives messages and sends events back down its socket.',
    decision: 'Keeps the consumer thin: validate, save, publish. Everything else is the channel layer and the database.',
    trade: 'Easy to reason about. Anything slow here blocks that one connection, so heavy work has to stay out.' },
  { id: 'pg',    tag: 'Postgres', glyph: 'Pg', name: 'PostgreSQL',
    role: 'Source of truth for rooms, users and message history.',
    decision: 'Every message is saved, so history survives restarts and anyone who joins late can load it over REST.',
    trade: 'A write on the hot path. Pub/sub alone would be faster but would lose everything on a restart.' },
  { id: 'redis', tag: 'Redis',    glyph: 'Rd', name: 'Redis pub/sub',
    role: 'The channel layer. Carries room events between consumers, including ones in other processes.',
    decision: 'Used for fan-out instead of polling or in-memory state, so it keeps working when there is more than one worker.',
    trade: 'Pub/sub is fire and forget. A client that is offline misses the event and has to catch up from Postgres.' },
  { id: 'b',     tag: 'Member B', glyph: 'B',  name: 'Other room members',
    role: 'Every other connected client in the room, each served by its own consumer.',
    decision: 'They receive the same event type for messages, reactions and notifications, so the client has one code path.',
    trade: 'Order is only as good as the arrival order. A message id from the database is what keeps history consistent.' },
  { id: 'c',     tag: 'Member C', glyph: 'C',  name: 'More members',
    role: 'The same path again for the next user, possibly on a different worker.',
    decision: 'Fan-out cost grows with room size, not with the number of API calls.',
    trade: 'Very large rooms would need batching or a different pattern.' }
];

const EDGES = [['a', 'auth'], ['auth', 'con'], ['con', 'pg'], ['con', 'redis'], ['redis', 'b'], ['redis', 'c']];

const STEPS = [
  { t: 'Send over the socket', on: ['a', 'auth'], edges: [0],
    p: 'Every message rides an open WebSocket. That socket was opened with the SimpleJWT access token in its query string, because browsers cannot set headers on one.',
    pk: [['a', 'auth']] },
  { t: 'Verify before accepting', on: ['auth'], edges: [0],
    p: 'Custom middleware reads the token, validates it with SimpleJWT and attaches the user to the connection. A bad token is rejected here, before a consumer exists.',
    pk: [['auth', 'auth']] },
  { t: 'Hand to the consumer', on: ['auth', 'con'], edges: [0, 1],
    p: 'The room consumer for this connection receives the payload. It joined a Channels group named after the room when the socket opened.',
    pk: [['auth', 'con']] },
  { t: 'Save and publish', on: ['con', 'pg', 'redis'], edges: [0, 1, 2, 3],
    p: 'Two things happen at once. The message is written to PostgreSQL so history survives, and it is published to Redis for live delivery.',
    pk: [['con', 'pg', 'out'], ['con', 'redis']] },
  { t: 'Fan out', on: ['redis', 'b', 'c'], edges: [3, 4, 5],
    p: 'Redis pushes the event to every consumer in the room group, including ones in other worker processes. Each consumer forwards it down its own socket.',
    bad: 'No Redis, no fan-out. With an in-memory layer only sockets in the same process get the message, so everyone else sees nothing until they refetch.',
    pk: [['redis', 'b', 'in'], ['redis', 'c']] },
  { t: 'Everyone sees it', on: ['b', 'c'], edges: [3, 4, 5], done: true,
    p: 'Every member screen updates. Reactions and notifications take the same route with a different event type, so there is one pipeline to maintain.',
    bad: 'The message is still saved, so nothing is lost, but the live part is broken. That is exactly why the channel layer is Redis and not memory.',
    pk: [['b', 'b'], ['c', 'c']] }
];

const DECISIONS = [
  { k: 'Decision 01', q: 'How should a WebSocket prove who you are?',
    hint: 'Headers are not an option in the browser.',
    chose: 'SimpleJWT, validated in custom Channels middleware, token passed in the connection query string.',
    rejected: 'Session cookies (awkward across Vercel and Railway origins) and sending the token as the first message (leaves an unauthenticated socket open).',
    cost: 'Tokens in URLs can reach logs. The fix I would ship next is a short-lived one-time ticket from a REST endpoint.' },
  { k: 'Decision 02', q: 'How do events reach people on other workers?',
    hint: 'Two users, two processes, one room.',
    chose: 'Redis as the Channels layer, so a published event reaches every consumer in the room group.',
    rejected: 'Polling the REST API (latency and wasted requests) and the in-memory layer (breaks the moment a second process starts).',
    cost: 'Pub/sub does not remember. Offline clients must reload history from PostgreSQL.' },
  { k: 'Decision 03', q: 'Where should it all run?',
    hint: 'One person has to deploy and fix it.',
    chose: 'React on Vercel. Django (ASGI), PostgreSQL and Redis together on Railway.',
    rejected: 'Splitting each service across providers, which means more config, more secrets and more places to fail.',
    cost: 'The backend, database and cache share a failure domain. Fine for this scale, not for a critical product.' }
];

const CHANGES = [
  { t: 'Swap the query-string token for a one-time ticket', p: 'The client would ask a REST endpoint for a ticket that lives for seconds and works once. The URL then carries something worthless if it is logged.' },
  { t: 'Add a catch-up step on reconnect', p: 'Because pub/sub forgets, the client should send the id of the last message it saw and the server should replay what it missed from PostgreSQL. That closes the offline gap properly.' },
  { t: 'Rate limit and size cap every connection', p: 'A single noisy socket should not be able to flood a room. Per-connection limits, a maximum payload size, and the load test running in CI would keep that honest.' }
];

/* ---------------- helpers ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------------- reveal, progress, pointer light ---------------- */
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { threshold: .12, rootMargin: '0px 0px -6% 0px' });
$$('.sr').forEach(el => io.observe(el));

const prog = $('#cprog');
let raf = 0;
function glowMove(e) {
  const c = e.target.closest && e.target.closest('.gc');
  if (!c) return;
  const r = c.getBoundingClientRect();
  c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
  c.style.setProperty('--my', (e.clientY - r.top) + 'px');
  c.classList.add('touch');
  clearTimeout(c._t); c._t = setTimeout(() => c.classList.remove('touch'), 700);
}
document.addEventListener('pointermove', glowMove, { passive: true });
document.addEventListener('pointerdown', glowMove, { passive: true });

/* ---------------- decisions (flip on click or tap) ---------------- */
$('#dgrid').innerHTML = DECISIONS.map((d, i) => `
  <button class="dcard sr" style="--d:${i * .07}s" aria-pressed="false" aria-label="${esc(d.q)}. Press to flip.">
    <div class="dflip">
      <div class="dface dfront"><span class="k">${d.k}</span><h3>${esc(d.q)}</h3><p>${esc(d.hint)}</p><span class="go"><b>+</b>See the trade-off</span></div>
      <div class="dface dback"><span class="k">${d.k}</span>
        <dl><div><dt>I chose</dt><dd>${esc(d.chose)}</dd></div><div><dt>I turned down</dt><dd>${esc(d.rejected)}</dd></div><div><dt>It cost</dt><dd>${esc(d.cost)}</dd></div></dl>
      </div>
    </div>
  </button>`).join('');
$$('.dcard').forEach(b => { io.observe(b); b.addEventListener('click', () => b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true')); });

/* ---------------- what I'd change (accordion) ---------------- */
$('#acc').innerHTML = CHANGES.map((c, i) => `
  <div class="ai gc sr" data-open="false" style="--d:${i * .06}s">
    <button aria-expanded="false"><span>${esc(c.t)}</span><b>+</b></button>
    <div class="body"><div><p>${esc(c.p)}</p></div></div>
  </div>`).join('');
$$('.ai').forEach(a => { io.observe(a); const b = $('button', a); b.addEventListener('click', () => {
  const o = a.dataset.open !== 'true'; a.dataset.open = o; b.setAttribute('aria-expanded', o);
}); });

/* ---------------- results ---------------- */
(function results() {
  const g = $('#rgrid'); let any = false;
  g.innerHTML = RESULTS.tiles.map(t => {
    const has = t.value !== null && t.value !== undefined; any = any || has;
    return `<div class="rt gc sr${has ? '' : ' empty'}"><b>${has ? `<span data-to="${t.value}">0</span><small>${esc(t.unit)}</small>` : 'Not measured yet'}</b><span>${esc(t.label)}</span></div>`;
  }).join('');
  $$('.rt', g).forEach(el => io.observe(el));
  if (!any && !RESULTS.series.length) { $('#results').hidden = true; return; }
  $('#pending').hidden = true;
  if (RESULTS.setup) $('#setup').innerHTML = `<b>Setup:</b> ${esc(RESULTS.setup)}${RESULTS.date ? ' <code>' + esc(RESULTS.date) + '</code>' : ''}`;
  const s = RESULTS.series;
  if (s.length) {
    const ch = $('#chart'); ch.hidden = false; io.observe(ch);
    const max = Math.max(...s.map(x => x.p95));
    $('#bars').innerHTML = s.map((x, i) => `<div class="bar" tabindex="0" data-i="${i}" style="--h:${Math.max(6, x.p95 / max * 100)}%;--d:${i * .07}s"><i></i><em>${x.clients}</em></div>`).join('');
    const ro = $('#readout');
    const show = i => { const x = s[i]; $$('.bar').forEach((b, j) => b.classList.toggle('sel', j === i));
      ro.innerHTML = `<b>${x.clients}</b> clients: median <b>${x.p50} ms</b>, p95 <b>${x.p95} ms</b>`; };
    $$('.bar').forEach(b => { const f = () => show(+b.dataset.i); b.addEventListener('pointerenter', f); b.addEventListener('click', f); b.addEventListener('focus', f); });
  }
  const cio = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; cio.unobserve(e.target);
    const to = +e.target.dataset.to, t0 = performance.now();
    const step = n => { const k = clamp((n - t0) / 1100, 0, 1); e.target.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1 && !reduce) requestAnimationFrame(step); else e.target.textContent = to; };
    requestAnimationFrame(step); }), { threshold: .6 });
  $$('[data-to]').forEach(n => cio.observe(n));
})();

/* ---------------- architecture scene ---------------- */
const arch = $('#arch'), pin = $('#pin'), stage = $('#stage'), plane = $('#plane');
const sheet = $('#sheet');
let layout = null, nodeEls = {}, edgeEls = [], pk = [], pos = {}, S = 1;
let killed = false, stepNow = -1, selected = null, interacted = false;
const view = { rx: 56, rz: -34, tx: 56, tz: -34, base: { rx: 56, rz: -34 } };

const LAYOUTS = {
  wide: { W: 640, H: 640, nw: 96, base: { rx: 56, rz: -34 },
    pos: { a: [70, 120], auth: [230, 120], con: [390, 120], pg: [550, 120], redis: [390, 330], b: [230, 540], c: [550, 540] } },
  tall: { W: 520, H: 800, nw: 96, base: { rx: 46, rz: -12 },
    pos: { a: [110, 90], auth: [410, 90], pg: [110, 300], con: [410, 300], redis: [410, 510], b: [110, 720], c: [410, 720] } }
};

function build(name) {
  layout = LAYOUTS[name]; layout.name = name;
  view.base = { ...layout.base }; view.tx = view.rx = layout.base.rx; view.tz = view.rz = layout.base.rz;
  pos = {}; Object.keys(layout.pos).forEach(k => pos[k] = layout.pos[k]);
  plane.style.width = layout.W + 'px'; plane.style.height = layout.H + 'px';
  plane.style.marginLeft = -layout.W / 2 + 'px'; plane.style.marginTop = -layout.H / 2 + 'px';
  plane.style.setProperty('--nw', layout.nw + 'px');
  const lines = EDGES.map(([f, t]) => `<line class="edge" x1="${pos[f][0]}" y1="${pos[f][1]}" x2="${pos[t][0]}" y2="${pos[t][1]}"/>`).join('');
  plane.innerHTML = `<div class="plate"></div><svg class="edges" width="${layout.W}" height="${layout.H}" viewBox="0 0 ${layout.W} ${layout.H}" aria-hidden="true">${lines}</svg>` +
    NODES.map((n, i) => `<div class="node" role="button" tabindex="0" data-id="${n.id}" aria-label="${esc(n.name)}: show details" style="left:${pos[n.id][0] - layout.nw / 2}px;top:${pos[n.id][1] - layout.nw / 2}px;--bd:${-i * .7}s">
      <div class="shadow"></div><div class="lift"><div class="bob">
        <div class="face top"></div><div class="face sf"></div><div class="face sr_"></div><div class="glyph">${esc(n.glyph)}</div><div class="tag">${esc(n.tag)}</div>
      </div></div></div>`).join('') + '<i class="pk"></i><i class="pk"></i>';
  nodeEls = {}; $$('.node', plane).forEach(el => nodeEls[el.dataset.id] = el);
  edgeEls = $$('.edge', plane); pk = $$('.pk', plane);
  $$('.node', plane).forEach(el => {
    el.addEventListener('click', () => { if (moved) return; openSheet(el.dataset.id); });
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSheet(el.dataset.id); } });
  });
  stepNow = -1; fit(); frame();
}

function calcS(L, w, h) {
  const rad = d => d * Math.PI / 180, b = L.base, small = w < 600;
  const bw = L.W * Math.abs(Math.cos(rad(b.rz))) + L.H * Math.abs(Math.sin(rad(b.rz)));
  const bh = (L.W * Math.abs(Math.sin(rad(b.rz))) + L.H * Math.abs(Math.cos(rad(b.rz)))) * Math.cos(rad(b.rx));
  const top = small ? 44 : 84, bot = 62;
  return { s: clamp(Math.min((w - 14) / (bw * 1.12 + 40), (h - top - bot) / (bh * 1.08 + 80)), .18, 1.25), cy: top + (h - top - bot) / 2 + 8 };
}
function fit() {
  if (!layout) return;
  const w = stage.clientWidth, h = stage.clientHeight, r = calcS(layout, w, h);
  S = r.s; plane.style.top = r.cy + 'px';
  plane.style.setProperty('--s', S.toFixed(3)); plane.classList.toggle('tiny', S < .36);
  plane.style.setProperty('--ls', clamp(1 / S * (w < 520 ? .66 : .8), .8, 3.2).toFixed(2));
}

function pickLayout() {
  const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
  const sw = calcS(LAYOUTS.wide, w, h).s, st = calcS(LAYOUTS.tall, w, h).s;
  const want = !layout ? (st > sw ? 'tall' : 'wide') : (layout.name === 'wide' ? (st > sw * 1.08 ? 'tall' : 'wide') : (sw > st * 1.08 ? 'wide' : 'tall'));
  if (!layout || layout.name !== want) build(want); else fit();
}

/* the scene follows scroll */
const N = STEPS.length;
function progress() {
  const r = arch.getBoundingClientRect(), range = arch.offsetHeight - pin.offsetHeight;
  return clamp(-r.top / Math.max(1, range), 0, 1);
}
function frame() {
  raf = 0;
  const p = progress(), q = clamp((p - .03) / .94, 0, .9999) * N;
  const i = Math.min(N - 1, Math.floor(q)), t = ease(q - i);
  if (i !== stepNow) applyStep(i);
  const st = STEPS[i];
  st.pk.forEach((seg, k) => {
    const el = pk[k]; if (!el) return;
    const [f, to, fade] = seg, A = pos[f], B = pos[to];
    let tt = t, op = 1;
    if (killed && i === 4 && !(f === 'a')) { tt = Math.min(t, .28); op = t > .22 ? clamp(1 - (t - .22) / .1, 0, 1) : 1; }
    if (fade === 'out') op = 1 - clamp((t - .75) / .25, 0, 1);
    if (fade === 'in') op = clamp(t / .25, 0, 1);
    if (f === to) { op = i === 1 ? 1 : (st.done ? 1 : .0); if (i === 1) tt = 0; }
    if (killed && i === 5) op = 0;
    const x = lerp(A[0], B[0], tt), y = lerp(A[1], B[1], tt), z = 36 + Math.sin(tt * Math.PI) * 18;
    el.style.transform = `translate3d(${x}px,${y}px,${z}px) rotateZ(${-view.rz}deg) rotateX(${-view.rx}deg)`;
    el.style.opacity = op;
    el.classList.toggle('dead', killed && i >= 4);
    el.classList.toggle('ok', !!st.done && !killed);
  });
  for (let k = st.pk.length; k < pk.length; k++) pk[k].style.opacity = 0;
  prog.style.transform = `scaleX(${clamp(window.scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight), 0, 1)})`;
}
function applyStep(i) {
  stepNow = i; const st = STEPS[i];
  Object.entries(nodeEls).forEach(([id, el]) => {
    const dead = killed && (id === 'redis' || ((id === 'b' || id === 'c') && i >= 4));
    el.classList.toggle('on', st.on.includes(id) && !dead);
    el.classList.toggle('ok', !!st.done && !killed && (id === 'b' || id === 'c'));
    el.classList.toggle('dead', dead);
  });
  edgeEls.forEach((e, k) => { const lit = st.edges.includes(k); e.classList.toggle('lit', lit && !(killed && k >= 4)); e.classList.toggle('bad', killed && k >= 4 && i >= 4); });
  $$('.step').forEach((s, k) => s.classList.toggle('on', k === i));
  $$('.dot').forEach((d, k) => { d.classList.toggle('on', k === i); d.classList.toggle('past', k < i); d.setAttribute('aria-selected', k === i); });
  $('#count').textContent = String(i + 1).padStart(2, '0') + ' / 0' + N;
  const hues = ['rgba(192,57,43,.42)', 'rgba(224,99,79,.40)', 'rgba(240,160,120,.34)', 'rgba(242,161,151,.40)', 'rgba(192,57,43,.46)', st.done && !killed ? 'rgba(74,222,128,.30)' : 'rgba(120,120,120,.28)'];
  stage.style.setProperty('--ga', killed && i >= 4 ? 'rgba(110,110,110,.30)' : hues[i]);
  stage.style.setProperty('--gx', (62 + i * 6) + '%'); stage.style.setProperty('--gy', (10 + i * 12) + '%');
  paintSteps();
}
function paintSteps() {
  $$('.step').forEach((s, k) => {
    const st = STEPS[k], bad = killed && st.bad;
    $('p', s).textContent = bad ? st.bad : st.p;
    $('p', s).classList.toggle('warn', !!bad);
  });
}
function schedule() { if (!raf) raf = requestAnimationFrame(frame); }

$('#steps').innerHTML = STEPS.map((s, i) => `<div class="step"><h3>${esc(s.t)}</h3><p></p><div class="comps">${s.on.map(id => `<button data-n="${id}">${esc(NODES.find(n => n.id === id).tag)}</button>`).join('')}</div></div>`).join('');
$$('.comps button').forEach(b => b.addEventListener('click', () => openSheet(b.dataset.n)));
$('#dots').innerHTML = STEPS.map((s, i) => `<button class="dot" role="tab" aria-label="Step ${i + 1}: ${esc(s.t)}" data-i="${i}">${i + 1}</button>`).join('');
$$('.dot').forEach(d => d.addEventListener('click', () => {
  const i = +d.dataset.i, p = ((i + .92) / N) * .94 + .03;
  const top = arch.getBoundingClientRect().top + scrollY, range = arch.offsetHeight - pin.offsetHeight;
  scrollTo({ top: top + p * range, behavior: reduce ? 'auto' : 'smooth' });
}));

/* detail sheet */
function openSheet(id) {
  const n = NODES.find(x => x.id === id); selected = id; hideHint();
  $('#shName').textContent = n.name; $('#shRole').textContent = n.role; $('#shDec').textContent = n.decision; $('#shTrade').textContent = n.trade;
  sheet.classList.add('open');
  Object.entries(nodeEls).forEach(([k, el]) => el.classList.toggle('sel', k === id));
}
function closeSheet() { sheet.classList.remove('open'); selected = null; Object.values(nodeEls).forEach(el => el.classList.remove('sel')); }
$('#sheetX').addEventListener('click', closeSheet);
addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

/* kill Redis */
$('#kill').addEventListener('click', e => {
  killed = !killed; e.currentTarget.setAttribute('aria-pressed', killed);
  $('span', e.currentTarget).textContent = killed ? 'Bring Redis back' : 'Simulate Redis failure';
  stepNow = -1; frame();
});

/* orbit by drag (mouse and touch), parallax by mouse hover */
let drag = null, moved = false;
function hideHint() { if (!interacted) { interacted = true; $('#hint').classList.add('gone'); } }
stage.addEventListener('pointerdown', e => {
  if (e.target.closest('.stage-ui, .sheet')) return;
  drag = { x: e.clientX, y: e.clientY, rz: view.tz, rx: view.tx, id: e.pointerId }; moved = false;
});
addEventListener('pointermove', e => {
  if (drag && e.pointerId === drag.id) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!moved && Math.hypot(dx, dy) > 7) { moved = true; stage.classList.add('drag'); hideHint(); try { stage.setPointerCapture(e.pointerId); } catch (_) {} }
    if (moved) { view.tz = clamp(drag.rz + dx * .28, view.base.rz - 55, view.base.rz + 55); view.tx = clamp(drag.rx - dy * .2, 34, 70); spin(); }
  } else if (e.pointerType === 'mouse' && !drag && stage.matches(':hover')) {
    const r = stage.getBoundingClientRect();
    view.tz = view.base.rz + ((e.clientX - r.left) / r.width - .5) * 10;
    view.tx = view.base.rx + ((e.clientY - r.top) / r.height - .5) * -6; spin();
  }
}, { passive: true });
const endDrag = () => { if (drag) { drag = null; stage.classList.remove('drag'); setTimeout(() => moved = false, 60); } };
addEventListener('pointerup', endDrag); addEventListener('pointercancel', endDrag);
$('#reset').addEventListener('click', () => { view.tz = view.base.rz; view.tx = view.base.rx; spin(); });

let spinRaf = 0;
function spin() { if (!spinRaf) spinRaf = requestAnimationFrame(function tick() {
  spinRaf = 0;
  const k = reduce ? 1 : .16;
  view.rz += (view.tz - view.rz) * k; view.rx += (view.tx - view.rx) * k;
  plane.style.setProperty('--rz', view.rz.toFixed(2) + 'deg'); plane.style.setProperty('--rx', view.rx.toFixed(2) + 'deg');
  schedule();
  if (Math.abs(view.tz - view.rz) > .05 || Math.abs(view.tx - view.rx) > .05) spinRaf = requestAnimationFrame(tick);
}); }

/* idle motion only while the scene is on screen */
new IntersectionObserver(es => es.forEach(e => stage.classList.toggle('paused', !e.isIntersecting)), { threshold: 0 }).observe(stage);

addEventListener('scroll', schedule, { passive: true });
new ResizeObserver(() => { pickLayout(); schedule(); }).observe(stage);
addEventListener('orientationchange', () => setTimeout(() => { pickLayout(); schedule(); }, 250));

pickLayout(); paintSteps(); frame();
})();
