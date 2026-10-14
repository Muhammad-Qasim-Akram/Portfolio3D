(() => {
  'use strict';

  
  const RESULTS = {
    source: 'index.html file size in the repo, before and after moving the inline images into /img.',
    rows: [
      { label: 'index.html size', sub: 'lower is better', unit: 'KB', before: 704, after: 39 },
      { label: 'Lighthouse performance', sub: 'mobile, higher is better', unit: '', before: null, after: null },
      { label: 'Largest Contentful Paint', sub: 'mobile, lower is better', unit: 's', before: null, after: null },
      { label: 'Total Blocking Time', sub: 'mobile, lower is better', unit: 'ms', before: null, after: null }
    ]
  };

  const PASSES = [
    {
      tab: 'Pass 0: Audit', status: 'ship', title: 'Rank the costs before fixing anything.',
      p: 'Before changing a line I listed what the page was paying for, and ordered it by how much it hurt.',
      points: ['Where backdrop-filter was used, and how many surfaces overlapped', 'Which blurred or animated elements were repainting every frame', 'Which listeners ran on pointer move and scroll, and what they read or wrote', 'How heavy the images and the HTML were'],
      code: '<span class="c">/* the audit, in one line per cost */</span>\nbackdrop-filter  <span class="r">many overlapping surfaces</span>\nblurred blobs    <span class="r">animating all the time</span>\npointer handlers <span class="r">writing styles per event</span>\nindex.html       <span class="r">704 KB of inline images</span>',
      note: 'Summarised from the audit report. The exact selectors are in the repo history.'
    },
    {
      tab: 'Pass 1: Render cost', status: 'ship', title: 'Move the effects onto the compositor.',
      p: 'The glow, the tilt and the hover lift all looked the same afterwards. What changed is which property moves.',
      points: ['Pointer glow lives on a child layer that moves with transform, so the card is not repainted', 'Tilt is a transform written once per frame, not on every pointer event', 'Element sizes are cached and refreshed on resize, not read on every event', 'A backup of the old page was kept so every change could be compared'],
      code: '<span class="c">/* before: repaints the card on every pointer event */</span>\ncard.style.background =\n  `radial-gradient(${x}px ${y}px, ...)`;\n\n<span class="c">/* after: one write per frame, compositor only */</span>\n<span class="g">glow.style.transform =\n  `translate3d(${x}px, ${y}px, 0)`;</span>',
      note: 'Simplified pattern. The real code has more states.'
    },
    {
      tab: 'Scroll jitter', status: 'ship', title: 'One bug, three causes.',
      p: 'Cards shook as they scrolled past the cursor. The fix was not one change, it was finding every cause.',
      points: ['Hover loop: the element that gets hovered also moved out from under the cursor. Fixed with a still hit area, as in the demo above', 'A CSS transition and per-frame JavaScript were both driving the same property, so they fought', 'Cached element positions went stale while scrolling, so effects aimed at the wrong place'],
      code: '<span class="r">.card:hover { transform: translateY(-18px); }</span>\n\n<span class="g">.slot:hover .card {\n  transform: translateY(-18px);\n}</span>\n<span class="c">/* .slot never moves, so hover is stable */</span>',
      note: 'Same fix as the Bug Lab above.'
    },
    {
      tab: 'Payload', status: 'ship', title: 'Get the images out of the HTML.',
      p: 'index.html carried its images as base64 text. Moving them to real image files shrank the document the browser has to parse before it can paint anything.',
      points: ['index.html went from 704 KB to 29 KB', 'Images load as separate, cacheable WebP files', 'Below-the-fold images are lazy loaded'],
      code: '<span class="r">&lt;img src="data:image/webp;base64,UklGR...(hundreds of KB)"&gt;</span>\n\n<span class="g">&lt;img src="img/chatroom.webp" width="1200" height="750"\n     loading="lazy" decoding="async"&gt;</span>',
      note: 'File sizes are from the repository.'
    },
    {
      tab: 'Pass 2: Next', status: 'next', title: 'Replace animated blobs with a static gradient.',
      p: 'The big blurred background shapes are the largest remaining cost, especially on phones. They are reduced on mobile today, but not yet replaced.',
      points: ['Swap animated, blurred blobs for gradient layers that cost almost nothing', 'Compare before and after with the frame meter above', 'Record Lighthouse numbers for this page'],
      code: '<span class="c">/* planned */</span>\n<span class="g">body::before {\n  background:\n    radial-gradient(60vmax 60vmax at 90% -10%, rgba(192,57,43,.18), transparent 60%),\n    radial-gradient(50vmax 50vmax at -10% 55%, rgba(240,197,179,.5), transparent 60%);\n}</span>',
      note: 'Not shipped yet.'
    }
  ];

  const CHANGES = [
    { t: 'Replace the animated blobs with static gradients', p: 'This is Pass 2. It removes the largest remaining paint cost and should make phones smoother without changing how the page looks.' },
    { t: 'Split style.css into critical and deferred parts', p: 'The stylesheet is about 107 KB. Only the hero and nav styles are needed before the first paint, so the rest could load without blocking.' },
    { t: 'Load EmailJS only when the contact form is needed', p: 'The script is fetched on every visit even though most visitors never send a message. Loading it on demand saves a request and some parsing time.' },
    { t: 'Record Lighthouse and frame times on every change', p: 'Right now I measure by hand. A small check that runs on each deploy would catch a regression before visitors do.' }
  ];

  /* ---------------- helpers ---------------- */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* reveal + pointer light + progress */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .12, rootMargin: '0px 0px -6% 0px' });
  $$('.sr').forEach(el => io.observe(el));
  document.addEventListener('pointermove', glow, { passive: true });
  document.addEventListener('pointerdown', glow, { passive: true });
  function glow(e) {
    const c = e.target.closest && e.target.closest('.gc'); if (!c) return;
    const r = c.getBoundingClientRect();
    c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px');
    c.classList.add('touch'); clearTimeout(c._t); c._t = setTimeout(() => c.classList.remove('touch'), 700);
  }
  const prog = $('#cprog');
  addEventListener('scroll', () => { prog.style.transform = `scaleX(${clamp(scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight), 0, 1)})`; }, { passive: true });

  /* count-down on the file-size stat */
  new IntersectionObserver((es, ob) => es.forEach(e => {
    if (!e.isIntersecting) return; ob.unobserve(e.target);
    const from = +e.target.dataset.from, to = +e.target.dataset.to, t0 = performance.now();
    if (reduce) { e.target.textContent = to; return; }
    (function step(n) {
      const k = clamp((n - t0) / 1400, 0, 1), v = from + (to - from) * (1 - Math.pow(1 - k, 3));
      e.target.textContent = Math.round(v); if (k < 1) requestAnimationFrame(step);
    })(t0);
  }), { threshold: .6 }).observe($('[data-from]'));

  /* ---------------- live frame meter ---------------- */
  const meter = { on: false, last: 0, t0: 0, frames: 0, worst: 0, hist: [], watchers: new Set() };
  const graph = $('#graph'), gctx = graph.getContext('2d');
  const dpr = Math.min(devicePixelRatio || 1, 2);
  graph.width = 280 * dpr; graph.height = 44 * dpr; gctx.scale(dpr, dpr);
  function cls(fps) { return fps >= 55 ? 'good' : fps >= 40 ? 'ok' : 'poor'; }
  function draw() {
    gctx.clearRect(0, 0, 280, 44);
    const n = meter.hist.length, w = 280 / 90;
    meter.hist.forEach((dt, i) => {
      const h = clamp(dt / 50, .06, 1) * 42;
      gctx.fillStyle = dt <= 19 ? '#2faa60' : dt <= 30 ? '#e0a458' : '#c0392b';
      gctx.fillRect((90 - n + i) * w, 44 - h, w - 1, h);
    });
  }
  function loop(t) {
    if (!meter.on) return;
    if (meter.last) { const dt = t - meter.last; meter.frames++; meter.worst = Math.max(meter.worst, dt); meter.hist.push(dt); if (meter.hist.length > 90) meter.hist.shift(); }
    meter.last = t; if (!meter.t0) meter.t0 = t;
    if (t - meter.t0 >= 500) {
      const fps = Math.round(meter.frames * 1000 / (t - meter.t0)), c = cls(fps);
      $('#fpsNum').textContent = fps; $('#heroFpsNum').textContent = fps;
      $('#worst').textContent = 'Worst frame: ' + meter.worst.toFixed(1) + ' ms';
      ['#fps'].forEach(s => { const el = $(s); el.classList.remove('good', 'ok', 'poor'); el.classList.add(c); });
      const hs = $('#heroFps'); hs.classList.remove('good', 'ok', 'poor'); hs.classList.add(c);
      draw(); meter.frames = 0; meter.worst = 0; meter.t0 = t;
    }
    requestAnimationFrame(loop);
  }
  function meterSync() {
    const want = meter.watchers.size > 0 && !document.hidden;
    if (want && !meter.on) { meter.on = true; meter.last = 0; meter.t0 = 0; meter.frames = 0; requestAnimationFrame(loop); }
    else if (!want) meter.on = false;
  }
  const watch = el => new IntersectionObserver(es => es.forEach(e => { e.isIntersecting ? meter.watchers.add(el) : meter.watchers.delete(el); meterSync(); }), { threshold: 0 }).observe(el);
  watch($('#heroFps')); watch($('#lab'));
  document.addEventListener('visibilitychange', meterSync);

  /* ---------------- glass lab ---------------- */
  const lab = $('#lab'), cards = $('#labCards');
  const NAMES = ['Nav', 'Hero', 'About', 'Project', 'Stack', 'Service', 'Chat', 'Contact', 'Footer', 'Menu', 'Card', 'Panel'];
  cards.innerHTML = Array.from({ length: 30 }, (_, i) => `<div class="lc${i < 2 ? ' keep' : ''}"><span>${NAMES[i % NAMES.length]} ${i + 1}</span><i></i><small>glass surface</small></div>`).join('');
  const lcs = $$('.lc', cards);
  function setCount(n) { lcs.forEach((c, i) => c.hidden = i >= n); $('#countOut').textContent = n; }
  function setBlur(v) { lab.style.setProperty('--blur', v + 'px'); $('#blurOut').textContent = v + ' px'; }
  $('#blur').addEventListener('input', e => setBlur(+e.target.value));
  $('#count').addEventListener('input', e => setCount(+e.target.value));
  function setMode(m) { lab.dataset.mode = m; $('#mAll').setAttribute('aria-pressed', m === 'all'); $('#mLight').setAttribute('aria-pressed', m === 'light'); }
  $('#mAll').addEventListener('click', () => setMode('all')); $('#mLight').addEventListener('click', () => setMode('light'));
  $('#motion').addEventListener('click', e => { const on = e.currentTarget.getAttribute('aria-pressed') !== 'true'; e.currentTarget.setAttribute('aria-pressed', on); $('i', e.currentTarget).textContent = on ? 'On' : 'Off'; lab.classList.toggle('still', !on); });
  setCount(12); setBlur(18);
  if (reduce) { lab.classList.add('still'); $('#motion').setAttribute('aria-pressed', 'false'); $('#motion i').textContent = 'Off'; }
  /* drag or hover to tilt */
  let tiltRaf = 0, tx = 0, ty = 0;
  function tilt(e) {
    const r = lab.getBoundingClientRect(); ty = ((e.clientX - r.left) / r.width - .5) * 12; tx = ((e.clientY - r.top) / r.height - .5) * -10;
    if (!tiltRaf) tiltRaf = requestAnimationFrame(() => { tiltRaf = 0; cards.style.setProperty('--tx', tx.toFixed(2) + 'deg'); cards.style.setProperty('--ty', ty.toFixed(2) + 'deg'); });
  }
  let down = false;
  lab.addEventListener('pointerdown', e => { down = true; tilt(e); });
  addEventListener('pointerup', () => down = false); addEventListener('pointercancel', () => down = false);
  lab.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' || down) tilt(e); }, { passive: true });
  lab.addEventListener('pointerleave', () => { cards.style.setProperty('--tx', '0deg'); cards.style.setProperty('--ty', '0deg'); });

  /* ---------------- bug lab ---------------- */
  const arena = $('#arena'), slot = $('#slot'), card = $('#bcard'), cursor = $('#cursor'), strip = $('#strip'), sctx = strip.getContext('2d');
  strip.width = 300 * dpr; strip.height = 18 * dpr; sctx.scale(dpr, dpr);
  let mode = 'bug', cur = { x: 0, y: 0 }, hit = false, flips = [], hits = [], bugOn = false, bugRaf = 0;
  const CODE = {
    bug: '<span class="r">.card:hover {\n  transform: translateY(-18px);\n}</span>\n<span class="c">/* the thing you hover is the thing that moves */</span>',
    fix: '<span class="g">.slot:hover .card {\n  transform: translateY(-18px);\n}</span>\n<span class="c">/* .slot never moves, so the hit area is stable */</span>'
  };
  const TEXT = {
    bug: 'Each lift moves the card away from the cursor, which ends the hover, which drops the card. It repeats as fast as the browser can check.',
    fix: 'Hover is read from a wrapper that stays put. The card still lifts, but the cursor stays inside the hit area, so nothing flips.'
  };
  function placeCursor() { cur.x = slot.offsetLeft + slot.offsetWidth * .5; cur.y = slot.offsetTop + slot.offsetHeight - 6; moveCursor(); }
  function moveCursor() { cursor.style.transform = `translate(${cur.x}px,${cur.y}px)`; }
  function setVersion(m) {
    mode = m; arena.dataset.mode = m; $('#vBug').setAttribute('aria-pressed', m === 'bug'); $('#vFix').setAttribute('aria-pressed', m === 'fix');
    $('#bugCode').innerHTML = CODE[m]; $('#bugText').textContent = TEXT[m]; flips = []; hits = [];
  }
  $('#vBug').addEventListener('click', () => setVersion('bug')); $('#vFix').addEventListener('click', () => setVersion('fix'));
  let dragging = false;
  function dragTo(e) { const r = arena.getBoundingClientRect(); cur.x = clamp(e.clientX - r.left, 0, r.width); cur.y = clamp(e.clientY - r.top, 0, r.height); moveCursor(); }
  arena.addEventListener('pointerdown', e => { dragging = true; try { arena.setPointerCapture(e.pointerId); } catch (_) { } dragTo(e); });
  arena.addEventListener('pointermove', e => { if (dragging) dragTo(e); });
  ['pointerup', 'pointercancel'].forEach(t => arena.addEventListener(t, () => dragging = false));
  function bugFrame(now) {
    bugRaf = 0; if (!bugOn) return;
    const r = arena.getBoundingClientRect(), el = document.elementFromPoint(r.left + cur.x, r.top + cur.y);
    const inside = !!el && (mode === 'bug' ? (el === card || card.contains(el)) : (el === slot || slot.contains(el)));
    if (inside !== hit) { hit = inside; flips.push(now); card.classList.toggle('up', hit); $('#bstate').textContent = 'hover: ' + (hit ? 'on' : 'off'); }
    while (flips.length && now - flips[0] > 1000) flips.shift();
    hits.push(hit); if (hits.length > 150) hits.shift();
    const n = flips.length, box = $('#flips');
    $('#flipNum').textContent = n; box.classList.toggle('bad', n >= 4); box.classList.toggle('fine', n < 4 && mode === 'fix');
    sctx.clearRect(0, 0, 300, 18); const w = 300 / 150;
    hits.forEach((h, i) => { sctx.fillStyle = h ? '#c0392b' : 'rgba(17,17,17,.15)'; sctx.fillRect((150 - hits.length + i) * w, h ? 2 : 9, w + .2, h ? 14 : 7); });
    bugRaf = requestAnimationFrame(bugFrame);
  }
  new IntersectionObserver(es => es.forEach(e => { bugOn = e.isIntersecting; if (bugOn && !bugRaf) bugRaf = requestAnimationFrame(bugFrame); }), { threshold: .25 }).observe(arena);
  setVersion('bug'); placeCursor();
  new ResizeObserver(placeCursor).observe(arena);

  /* ---------------- passes (tabs) ---------------- */
  const tabs = $('#tabs'), panel = $('#tabpanel');
  tabs.innerHTML = PASSES.map((p, i) => `<button role="tab" id="t${i}" aria-selected="${i === 0}" aria-controls="tabpanel" data-i="${i}">${esc(p.tab)}</button>`).join('');
  function showPass(i) {
    const p = PASSES[i];
    $$('button', tabs).forEach((b, k) => b.setAttribute('aria-selected', k === i));
    panel.style.animation = 'none'; void panel.offsetWidth; panel.style.animation = '';
    panel.setAttribute('aria-labelledby', 't' + i);
    panel.innerHTML = `<div><span class="rect-tag ${p.status}">${p.status === 'ship' ? 'Shipped' : 'Not shipped yet'}</span><h3>${esc(p.title)}</h3><p>${esc(p.p)}</p><ul>${p.points.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <div><pre class="code">${p.code}</pre><p class="note">${esc(p.note)}</p></div>`;
  }
  tabs.addEventListener('click', e => { const b = e.target.closest('button'); if (b) showPass(+b.dataset.i); });
  tabs.addEventListener('keydown', e => { if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return; const cur = +$('[aria-selected=true]', tabs).dataset.i, n = (cur + (e.key === 'ArrowRight' ? 1 : PASSES.length - 1)) % PASSES.length; showPass(n); $$('button', tabs)[n].focus(); });
  showPass(0);

  /* ---------------- results ---------------- */
  (function results() {
    const rows = RESULTS.rows.filter(r => r.before != null && r.after != null);
    if (!rows.length) { $('#results').hidden = true; return; }
    $('#rrows').innerHTML = rows.map((r, i) => {
      const max = Math.max(r.before, r.after), wb = Math.max(4, r.before / max * 100), wa = Math.max(4, r.after / max * 100);
      const bar = (w, v, cls, d) => w < 24
        ? `<div><i style="--w:${w}%;--d:${d}s"></i><em class="out" style="left:calc(${w}% + 8px);--d:${d}s">${v} ${esc(r.unit)}</em></div>`
        : `<div><i style="--w:${w}%;--d:${d}s">${v} ${esc(r.unit)}</i></div>`;
      return `<div class="rrow gc sr" style="--d:${i * .06}s"><h3>${esc(r.label)}<small>${esc(r.sub)}</small></h3>
      <div class="rbars"><div class="rb"><span>Before</span>${bar(wb, r.before, '', 0)}</div>
      <div class="rb after"><span>After</span>${bar(wa, r.after, 'after', .15)}</div></div></div>`;
    }).join('');
    $$('.rrow').forEach(el => io.observe(el));
    $('#rsrc').textContent = RESULTS.source;
  })();

  /* ---------------- looking back ---------------- */
  $('#acc').innerHTML = CHANGES.map((c, i) => `<div class="ai gc sr" data-open="false" style="--d:${i * .06}s"><button aria-expanded="false"><span>${esc(c.t)}</span><b>+</b></button><div class="body"><div><p>${esc(c.p)}</p></div></div></div>`).join('');
  $$('.ai').forEach(a => { io.observe(a); const b = $('button', a); b.addEventListener('click', () => { const o = a.dataset.open !== 'true'; a.dataset.open = o; b.setAttribute('aria-expanded', o); }); });
})();