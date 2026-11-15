
// ================================================================ sound
let actx = null, soundOn = false, noiseBuf = null;
function ensureAudio() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); noiseBuf = actx.createBuffer(1, actx.sampleRate, actx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } catch (e) { return; } } if (actx.state === 'suspended') actx.resume().catch(() => {}); }
function sfx(kind) {
  if (!soundOn || !actx || (S.speed > 10 && kind !== 'cash' && kind !== 'jackpot')) return;   // the till rings at any speed
  if (kind === 'jackpot') {   // a PT sale: the till, then a rising arpeggio
    sfx('cash');
    [1047, 1319, 1568, 2093].forEach((f, i) => { const at = actx.currentTime + 0.3 + i * 0.09, o = actx.createOscillator(), gn = actx.createGain(); o.type = 'square'; o.frequency.value = f; gn.gain.setValueAtTime(0.0001, at); gn.gain.exponentialRampToValueAtTime(0.05, at + 0.01); gn.gain.exponentialRampToValueAtTime(0.0001, at + (i === 3 ? 0.6 : 0.15)); o.connect(gn).connect(actx.destination); o.start(at); o.stop(at + 0.65); });
    return;
  }
  const t = actx.currentTime;
  const tone = (f0, f1, dur, g, type = 'sine') => { const o = actx.createOscillator(), gn = actx.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur); gn.gain.setValueAtTime(g, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(gn).connect(actx.destination); o.start(t); o.stop(t + dur + 0.02); };
  if (kind === 'bell') { tone(1320, 1300, 1.2, 0.18); tone(1980, 1950, 0.8, 0.08); }
  else if (kind === 'drop') { tone(90, 50, 0.25, 0.3); }
  else if (kind === 'clank') { tone(700, 650, 0.15, 0.08, 'square'); }
  else if (kind === 'cash') {   // cha-ching: a short drawer rattle, then two bright bell strikes
    const n = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain(); n.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.value = 3200; f.Q.value = 2;
    g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09); n.connect(f).connect(g).connect(actx.destination); n.start(t); n.stop(t + 0.1);
    const bell = (at, f0, g0) => { for (const [m, k] of [[1, 1], [2.76, 0.4], [5.4, 0.15]]) { const o = actx.createOscillator(), gn = actx.createGain(); o.type = 'sine'; o.frequency.value = f0 * m; gn.gain.setValueAtTime(0.0001, at); gn.gain.exponentialRampToValueAtTime(g0 * k, at + 0.005); gn.gain.exponentialRampToValueAtTime(0.0001, at + 0.5); o.connect(gn).connect(actx.destination); o.start(at); o.stop(at + 0.55); } };
    bell(t + 0.07, 1568, 0.12); bell(t + 0.17, 2093, 0.14);   // G6 then C7
  }
}
// ================================================================ boards
function drawWhiteboard(k) {
  const { ctx: c, cv, tex } = WB; c.fillStyle = '#f2f1ea'; c.fillRect(0, 0, cv.width, cv.height);
  c.fillStyle = '#2f68ab'; c.font = '700 16px Silkscreen, monospace'; c.fillText('TODAY', 10, 22);
  const lines = ['A1 BACK SQUAT 5x5 @80%', 'A2 PULL-UPS 4x8', 'B1 SLED PUSH 6x15M', 'B2 HIP THRUST 3x10', 'C  ROW 2000M'];
  c.font = '12px Silkscreen, monospace';
  lines.forEach((l, i) => { const show = clamp(k * lines.length - i, 0, 1); if (show <= 0) return; c.fillStyle = i % 2 ? '#d6403a' : '#1c1f2a'; c.fillText(l.slice(0, Math.ceil(l.length * show)), 10, 44 + i * 19); });
  tex.needsUpdate = true;
}
function drawPRBoard() {
  const { ctx: c, cv, tex } = PRB; c.fillStyle = '#1c1f2a'; c.fillRect(0, 0, cv.width, cv.height);
  c.fillStyle = '#dfe03a'; c.font = '700 16px Silkscreen, monospace'; c.fillText('PR BOARD', 10, 22);
  c.font = '11px Silkscreen, monospace';
  const list = A ? A.prs.slice(-7).reverse() : [];
  if (!list.length) { c.fillStyle = '#959bab'; c.fillText('NO PRS YET TODAY', 10, 46); }
  list.forEach((p, i) => { c.fillStyle = i ? '#f2f1ea' : '#dfe03a'; c.fillText(`${hhmm(p.t)} ${p.name.toUpperCase()} ${p.kg}KG`, 10, 44 + i * 17); c.fillStyle = '#959bab'; c.fillText(p.lift.toUpperCase().slice(0, 14), 150, 44 + i * 17); });
  tex.needsUpdate = true;
}
// ================================================================ toasts
const toastEl = document.getElementById('toast');
function showToast(text) { const d = document.createElement('div'); d.textContent = text; toastEl.appendChild(d); while (toastEl.children.length > 3) toastEl.firstChild.remove(); setTimeout(() => d.remove(), 3500); }
// ================================================================ NetLogo-style panel
const panel = document.getElementById('panel');
let goOn = false;
const playing = () => goOn && A && !A.done;
const W = {};   // widget refs
let plotbar = null;
// plots: a horizontal strip under the scene on wide screens, the Plots tab on phones
function placePlots() {
  if (!plotbar) return;
  const wide = window.innerWidth >= 860, grp = document.getElementById('plotGrp');
  if (wide) { if (plotbar.parentNode !== document.body) document.body.appendChild(plotbar); plotbar.classList.add('bar'); plotbar.style.right = panelW + 'px'; document.documentElement.style.setProperty('--plotH', plotH + 'px'); document.documentElement.style.setProperty('--plotOff', plotH + 'px'); if (grp) grp.style.display = 'none'; }
  else { if (grp && plotbar.parentNode !== grp) grp.appendChild(plotbar); plotbar.classList.remove('bar'); plotbar.style.right = ''; document.documentElement.style.setProperty('--plotOff', '0px'); if (grp) grp.style.display = ''; }
  // every legend stays on one line so all four plots get the same height; a legend that doesn't fit shrinks its text
  plotbar.classList.remove('two');
  for (const lg of plotbar.querySelectorAll('.legend')) { const f0 = parseFloat(fs(10)); let f = f0; lg.classList.remove('short'); lg.style.fontSize = f + 'px'; while (lg.scrollWidth > lg.clientWidth + 1 && f > f0) {   /* never below the smallest size: a legend that doesn't fit switches to its short labels */ f -= 0.5; lg.style.fontSize = f + 'px'; } if (lg.scrollWidth > lg.clientWidth + 1) lg.classList.add('short'); }
  if ([...plotbar.querySelectorAll('.legend')].some(lg => lg.scrollWidth > lg.clientWidth + 1)) plotbar.classList.add('two');   /* still too long: every legend gets two lines, so the plots stay level */
  for (const c of plotbar.querySelectorAll('canvas')) { const r = c.getBoundingClientRect(); if (r.width > 0) { c.width = Math.round(r.width); c.height = Math.round(Math.max(60, r.height)); } }
}
function fs(n) { return getComputedStyle(document.documentElement).getPropertyValue('--f' + n).trim() || n + 'px'; }   // a UI text size, for text drawn on a canvas
function el(tag, attrs = {}, html = '') { const e = document.createElement(tag); for (const k in attrs) { if (k === 'class') e.className = attrs[k]; else e.setAttribute(k, attrs[k]); } if (html) e.innerHTML = html; return e; }
function group(title, tab, id) { const g = el('section', { class: 'grp' }); if (tab) g.dataset.tab = tab; if (id) g.id = id; g.appendChild(el('h2', {}, `<span>${tr(title)}</span><span class="pend">${tr('applies on Setup')}</span>`)); panel.appendChild(g); return g; }
function slider(g, key, label, min, max, step, fmt, onSetup, path, map) {
  const w = el('div', { class: 'w' }); const id = 'w_' + key.replace('.', '_');
  w.innerHTML = `<div class="lab"><label for="${id}">${tr(label)}<span class="pd">${tr('· Setup')}</span></label><b></b></div><input type="range" id="${id}" min="${min}" max="${max}" step="${step}">`;
  const inp = w.querySelector('input'), out = w.querySelector('b');
  const toV = map ? map.toV : (x) => x, toPos = map ? map.toPos : (v) => v;   // optional non-linear scale (speed)
  const get = () => path ? S[path][key] : S[key], set = (v) => { if (path) S[path][key] = v; else S[key] = v; };
  inp.value = toPos(get()); out.textContent = fmt(get());
  inp.addEventListener('input', () => { const v = toV(+inp.value); set(v); out.textContent = fmt(v); if (path === 'mix') balanceMix(key); refreshPending(); });
  touchSlider(inp);
  g.appendChild(w); W[id] = { w, inp, out, get, fmt, onSetup, key, path }; return w;
}
function touchSlider(inp) {
  let on = false, x0 = 0, y0 = 0, dir = 0, v0 = null;
  const setFrom = (cx) => { const r = inp.getBoundingClientRect(), mn = +inp.min, mx = +inp.max, st = +inp.step || 1; let v = mn + clamp((cx - r.left) / r.width, 0, 1) * (mx - mn); v = Math.round(v / st) * st; if (+inp.value !== v) { inp.value = v; inp.dispatchEvent(new Event('input')); } };
  inp.addEventListener('touchstart', (e) => { const t = e.touches[0]; on = true; x0 = t.clientX; y0 = t.clientY; dir = 0; v0 = inp.value; }, { passive: true });
  inp.addEventListener('touchmove', (e) => { if (!on) return; const t = e.touches[0];
    if (!dir) { const dx = Math.abs(t.clientX - x0), dy = Math.abs(t.clientY - y0); if (dx + dy > 6) { dir = dx >= dy ? 1 : 2; if (dir === 2 && inp.value !== v0) { inp.value = v0; inp.dispatchEvent(new Event('input')); } } }   // a vertical swipe scrolls the panel and leaves the value alone
    if (dir === 1) { e.preventDefault(); setFrom(t.clientX); } }, { passive: false });
  inp.addEventListener('touchend', (e) => { if (on && dir !== 2) setFrom(dir ? e.changedTouches[0].clientX : x0); on = false; }, { passive: true });
}
function chooser(g, key, label, opts) {
  const w = el('div', { class: 'w' }); const id = 'w_' + key;
  w.innerHTML = `<div class="lab"><label for="${id}">${tr(label)}<span class="pd">${tr('· Setup')}</span></label></div><select id="${id}">${opts.map(o => `<option value="${o}">${tr(o)}</option>`).join('')}</select>`;
  const sel = w.querySelector('select'); sel.value = S[key]; sel.addEventListener('change', () => { S[key] = sel.value; if (key === 'weather') env.raining = S.weather === 'Rain'; refreshPending(); });
  g.appendChild(w); W[id] = { w, sel, key, onSetup: true }; return w;
}
function segmented(g, key, label, opts) {
  const w = el('div', { class: 'w' }); w.innerHTML = `<div class="lab"><span>${tr(label)}<span class="pd">${tr('· Setup')}</span></span></div><div class="seg" role="group" aria-label="${tr(label)}">${opts.map(o => `<button data-v="${o}">${tr(o)}</button>`).join('')}</div>`;
  const bs = [...w.querySelectorAll('button')]; const upd = () => bs.forEach(b => { const on = b.dataset.v === S[key]; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
  bs.forEach(b => b.addEventListener('click', () => { S[key] = b.dataset.v; upd(); refreshPending(); })); upd();
  g.appendChild(w); W['w_' + key] = { w, key, onSetup: true, upd }; return w;
}
function sw(g, key, label, onSetup) {
  const w = el('div', { class: 'w sw' }); w.innerHTML = `<span>${tr(label)}${onSetup ? `<span class="pd">${tr('· Setup')}</span>` : ''}</span><button aria-pressed="false">${tr('Off')}</button>`;
  const b = w.querySelector('button'); const upd = () => { b.textContent = tr(S[key] ? 'On' : 'Off'); b.classList.toggle('on', S[key]); b.setAttribute('aria-pressed', S[key]); };
  b.addEventListener('click', () => { S[key] = !S[key]; upd(); if (onSetup) refreshPending(); }); upd(); g.appendChild(w); if (onSetup) W['w_' + key] = { w, key, onSetup: true, upd }; return w;
}
function balanceMix(changed) {
  const keys = Object.keys(S.mix), others = keys.filter(k => k !== changed);
  let rest = 100 - S.mix[changed]; const sum = others.reduce((s, k) => s + S.mix[k], 0);
  others.forEach((k, i) => { S.mix[k] = sum > 0 ? Math.round(S.mix[k] / sum * rest) : Math.round(rest / others.length); });
  const diff = 100 - keys.reduce((s, k) => s + S.mix[k], 0); S.mix[others[0]] += diff;
  if (S.mix[others[0]] < 0) { S.mix[others[0]] = 0; }
  for (const k of keys) { const r = W['w_' + k]; if (r) { r.inp.value = S.mix[k]; r.out.textContent = S.mix[k] + ' %'; } }
}
function buildPanel() {
  if (plotbar) plotbar.remove();   // rebuilt on a language switch
  panel.innerHTML = '<div id="sheetHandle"><i></i></div><div class="tabs" role="tablist"></div>';
  // monitors first on phones (always visible), placed after Run on desktop
  const run = group('Run', 'Run', 'runGrp');
  const r1 = el('div', { class: 'row' });
  W.setup = el('button', { class: 'btn-setup' }, tr('Setup')); W.go = el('button', { class: 'btn-go' }, tr('Go')); W.step = el('button', {}, tr('Step'));
  r1.append(W.setup, W.go, W.step); run.appendChild(r1);
  // log scale: 1x .. 600x (a whole 17-hour day in under two minutes at the top end)
  const spd = { toV: (p) => { const v = Math.pow(600, p / 100); return v < 10 ? Math.round(v) : v < 100 ? Math.round(v / 5) * 5 : Math.round(v / 25) * 25; }, toPos: (v) => Math.round(100 * Math.log(Math.max(1, v)) / Math.log(600)) };
  slider(run, 'speed', 'Speed (gym seconds per real second)', 0, 100, 1, v => v + '×', false, undefined, spd);
  const r2 = el('div', { class: 'row' }); r2.innerHTML = `<label for="seed" style="flex:0 0 auto;font-size:var(--f12)">${tr('Seed')}</label><input type="number" id="seed"><button id="dice" style="flex:0 0 auto" aria-label="${tr('Random seed')}">🎲</button>`;
  const more = el('details', { class: 'more' }, `<summary>${tx('More', '更多')}</summary>`); more.appendChild(r2); W.seed = r2.querySelector('#seed'); W.seed.value = S.seed;   /* playtest: dev controls out of the first screen (Plan 10) */
  W.seed.addEventListener('change', () => { S.seed = Math.max(1, Math.floor(+W.seed.value || 1)); W.seed.value = S.seed; refreshPending(); });
  r2.querySelector('#dice').addEventListener('click', () => { S.seed = Math.floor(Math.random() * 1e6) + 1; W.seed.value = S.seed; refreshPending(); });
  const r3 = el('div', { class: 'row' }); W.copy = el('button', {}, tr('Copy results')); W.build = el('button', { id: 'buildBtn' }, tx('Build a gym', '設計健身房')); W.build.addEventListener('click', () => { if (closing) return; openBuild(); }); r3.append(W.build); run.appendChild(r3);
  const r5 = el('div', { class: 'row' }); r5.append(W.copy); more.appendChild(r5);
  const r6 = el('div', { class: 'row' }), again = el('button', { id: 'introAgain' }, tx('Show intro again', '重看開場')), goalB = el('button', { id: 'goalAgain' }, tx('Change goal', '換目標'));
  again.addEventListener('click', () => { if (closing || BUILD.on) return; try { localStorage.removeItem('gymsim.introDone'); } catch (e) {} goOn = false; refreshGo(); openIntro(true); });
  goalB.addEventListener('click', () => { if (typeof showGoalCard === 'function') showGoalCard(true); });
  r6.append(again, goalB); more.appendChild(r6); run.appendChild(more);
  const r4 = el('div', { class: 'row' }); r4.appendChild(el('span', { style: 'flex:0 0 auto;font-size:var(--f12)' }, tr('Close early')));
  for (const [k, lab] of [['day', tx('Day', '今天')], ['week', tx('Week', '本週')], ['month', tx('Month', '本月')]]) { const b = el('button', { 'data-close': k }, lab); b.addEventListener('click', () => closeEarly(k)); r4.appendChild(b); }
  run.appendChild(r4);
  run.appendChild(el('p', { class: 'note', id: 'runNote' }, ''));
  const m$ = (v) => moneyK(v);   /* financing sliders step in half-millions */
  slider(run, 'finOwn', 'Your own money', 0, 20e6, 5e5, m$, true);
  slider(run, 'finLoan', 'Bank loan', 0, 20e6, 5e5, m$, true);
  slider(run, 'finRate', 'Loan rate a year', 1, 8, 0.1, v => v.toFixed(1) + '%', true);
  slider(run, 'finYears', 'Loan term', 3, 15, 1, v => tx(`${v} years`, `${v} 年`), true);
  run.insertBefore(el('div', { id: 'dayLbl', class: 'daylbl' }, ''), run.children[1]);
  const mg = group('Monitors', null, 'monGrp'); mg.querySelector('.pend').remove();
  const mon = el('div', { class: 'mon' });
  for (const [id, lab] of [['mClock', 'Clock'], ['mIn', 'Inside now'], ['mWait', 'Waiting now'], ['mAvg', 'Avg wait'], ['mQ', 'Longest queue'], ['mPR', 'PRs today'], ['mStray', 'Stray weights'], ['mVisits', 'Visits'], ['mRack', 'Rack queue']]) { const d = el('div', {}, `<span>${tr(lab)}</span><b id="${id}">–</b>`); mon.appendChild(d); }
  mg.appendChild(mon);
  const day = group('Day', 'Day');
  chooser(day, 'month', 'Month', MONTH_NAMES);
  slider(day, 'peak', 'People at the weekly peak', 15, 60, 1, v => v, true);
  slider(day, 'visit', 'Mean visit length', 30, 100, 1, v => v + MIN(), true);
  segmented(day, 'setting', 'Setting', ['Urban', 'Suburban', 'Rural']);
  chooser(day, 'weather', 'Weather', ['Clear', 'Rain', 'Heatwave']);
  day.appendChild(el('p', { class: 'note' }, tr('Setting and rain show at once. How members travel (scooter, bus, on foot, dropped off), bus frequency and the heatwave curve apply on Setup.')));
  const mem = group('Members', 'Members');
  mem.appendChild(el('p', { class: 'note', style: 'margin:0 0 4px' }, tr('Archetype mix (sums to 100 %, applies on Setup)')));
  for (const [k, lab] of [['power', 'Powerlifter'], ['oly', 'Olympic lifter'], ['body', 'Bodybuilder'], ['beginner', 'Beginner']]) slider(mem, k, lab, 0, 100, 1, v => v + ' %', true, 'mix');
  slider(mem, 'patience', 'Patience before swapping', 0, 15, 0.5, v => v + MIN());
  slider(mem, 'workIn', 'Work-in willingness', 0, 100, 5, v => v + ' %');
  slider(mem, 'rest', 'Rest between sets', 1, 5, 0.25, v => v.toFixed(2).replace(/0$/, '') + MIN());
  slider(mem, 'rerack', 'Re-rack habit', 0, 100, 5, v => v + ' %');
  const gym = group('Gym', 'Gym');
  slider(gym, 'racks', 'Power racks', 2, 10, 1, v => v, true);
  slider(gym, 'plats', 'Olympic platforms', 0, 4, 1, v => v, true);
  slider(gym, 'benches', 'Adjustable benches', 2, 10, 1, v => v, true);
  slider(gym, 'cleaners', 'Cleaners', 0, 3, 1, v => v);
  slider(gym, 'cap', 'Capacity cap at the turnstile', 20, 80, 1, v => v);
  sw(gym, 'curls', 'Racks used for curls');
  const pl = group('Plots', 'Plots', 'plotGrp');
  pl.querySelector('.pend').remove();
  plotbar = el('div', { id: 'plotbar' });
  for (const [id, title] of [['pOcc', 'Occupancy vs capacity cap'], ['pQ', 'Rack queue length'], ['pZ', 'Zone use (stacked)'], ['pH', 'Wait times (minutes)']]) {
    const d = el('div', { class: 'plot' }); d.innerHTML = `<div class="pt"><span>${tr(title)}</span><span id="${id}v"></span></div><canvas id="${id}" width="320" height="96"></canvas><div class="legend" id="${id}l"></div>`; plotbar.appendChild(d);
  }
  pl.appendChild(plotbar);
  plotbar.querySelector('#pOccl').innerHTML = `<span><i style="background:#dfe03a"></i>${tr('today')}</span><span><i style="background:#6b7182"></i>${tr('earlier runs')}</span><span><i style="background:#d6403a"></i>${tr('cap')}</span>`;
  plotbar.querySelector('#pQl').innerHTML = `<span><i style="background:#e08f5a"></i>${tr('today')}</span><span><i style="background:#6b7182"></i>${tr('earlier runs (faded)')}</span>`;
  plotbar.querySelector('#pZl').innerHTML = ZONES.map(([k, l, c, sh]) => `<span title="${tr(l)}"><i style="background:${c}"></i><b class="lf">${tr(sh)}</b><b class="ls">${zh() ? tr(sh) : sh.slice(0, 4)}</b></span>`).join('');
  plotbar.querySelector('#pHl').innerHTML = `<span><i style="background:#4a8acb"></i>${tr('waits finished today')}</span>`;
  placePlots();
  // tabs (phones)
  const tabs = panel.querySelector('.tabs');
  for (const t of ['Run', 'Day', 'Members', 'Gym', 'Plots']) { const b = el('button', { role: 'tab' }, tr(t)); b.dataset.t = t; b.addEventListener('click', () => { showTab(t); panel.classList.remove('closed'); }); tabs.appendChild(b); }
  { const bk = el('button', { 'data-t': 'Books', class: 'bkTab' }, tx('📒 Books', '📒 帳本')); bk.addEventListener('click', () => openBooks()); tabs.appendChild(bk); }   /* phones: the books without finding the desk (Plan 10) */
  panel.querySelector('#sheetHandle').addEventListener('click', () => panel.classList.toggle('closed'));
  showTab('Run');
  // wiring
  W.setup.addEventListener('click', () => { if (closing) return; goOn = false; setupFromPanel(); refreshGo(); refreshPending(); clearFollow(); showToast(tx(`Setup · seed ${S.seed}`, `設定 · 種子 ${S.seed}`)); });
  W.go.addEventListener('click', () => { if (closing) return; if (A && A.done) { if (!nextDay() && nextMonth()) syncSetupWidgets(); refreshPending(); } goOn = !goOn; refreshGo(); });   // Next day; after the last day the business carries into the next month (D9)
  W.step.addEventListener('click', () => { if (closing || !A || A.done) return; for (let i = 0; i < 60 / STEP; i++) simStep(); });
  { const ll = document.getElementById('liveLine'); if (ll && !ll.dataset.wired) { ll.dataset.wired = '1'; ll.addEventListener('click', () => openBooks()); ll.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); openBooks(); } }); } }
  W.copy.addEventListener('click', async () => { try { await navigator.clipboard.writeText(resultsText()); showToast(tr('Results copied')); } catch (e) { showToast(tr('Copy was blocked here')); } });
}
// the UI side of closing early: one day per macrotask so the page stays responsive, then a summary (A1)
let closing = null;
function closeEarly(kind) {
  if (!M || !A || closing) return;
  goOn = false; refreshGo(); const out = { days: 0, takings: 0, ebitda: 0 }, target = closeTarget(kind), m0 = M; closing = { kind, out };
  const step = () => {
    let more = true; try { more = M === m0 && closeOneDay(out, target); } catch (e) { more = false; console.error(e); }
    showToast(tx(`Closing… day ${M.dayI + 1}`, `結帳中… 第 ${M.dayI + 1} 天`));
    if (more) { setTimeout(step, 0); return; }
    closing = null; BOOKS.closed = { ...out, kind, dayI: M.dayI }; refreshGo(); refreshPending();
    showToast(tx(`Closed ${out.days} day${out.days === 1 ? '' : 's'} · takings ${nt$(out.takings)} · EBITDA ${nt$(out.ebitda)}`, `已結 ${out.days} 天 · 收入 ${nt$(out.takings)} · EBITDA ${nt$(out.ebitda)}`));
    if (BOOKS.open) updateBooks(true);
  };
  setTimeout(step, 0);
}
// after New month the panel shows what a Setup would start from: the month and, for a new build, the months since opening
// a built gym's equipment comes from the builder: the Setup sliders for it are locked (Plan 8 review)
function lockBuiltSliders() { for (const k of ['racks', 'plats', 'benches']) { const r = W['w_' + k]; if (r && r.inp) { r.inp.disabled = !!S.hallW; r.inp.value = S[k]; r.out.textContent = r.fmt(S[k]); r.w.title = S.hallW ? tx('Set by your build: use Build a gym', '由你的設計決定：請用「設計健身房」') : ''; } } }
function syncSetupWidgets() { lockBuiltSliders(); const m = W.w_month; if (m && m.sel) m.sel.value = S.month; const o = W.w_monthsOpen; if (o && o.inp) { o.inp.value = S.monthsOpen; o.out.textContent = o.fmt(S.monthsOpen); } }
function setupFromPanel() { setupRun(); }
function showTab(t) { panel.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === t)); panel.querySelectorAll('.grp[data-tab]').forEach(g => g.classList.toggle('show', g.dataset.tab === t)); }
function refreshGo() { W.go.textContent = goOn ? tr('Pause') : A && A.done ? tr(monthComplete() ? 'New month' : 'Next day') : A && A.t < A.open ? tx('Start the day', '開始營業') : tr('Go'); W.go.classList.toggle('on', goOn); }
function refreshPending() {
  if (!A) return;
  const c = A.cfg; let any = false;
  for (const id in W) {
    const r = W[id]; if (!r || !r.onSetup || !r.w) continue;
    const cur = r.path ? S[r.path][r.key] : S[r.key], act = r.path ? c[r.path][r.key] : c[r.key];
    const pd = cur !== act; r.w.classList.toggle('pd', pd); any = any || pd;
  }
  if (S.seed !== c.seed) any = true;
  W.setup.classList.toggle('need', any); W.setup.textContent = tr('Setup') + (any ? ' ↻' : '');
  document.getElementById('runNote').textContent = tr(any ? 'Some settings change the building or the day: press Setup to apply them.' : 'Behaviour sliders apply immediately.');
}
const ZONES = [['cardio', 'Cardio', '#4a8acb', 'Cardio'], ['machines', 'Machines', '#63a845', 'Machine'], ['dumbbells', 'Dumbbells', '#e08f5a', 'DB'], ['racks', 'Racks', '#d6403a', 'Rack'], ['platforms', 'Platforms', '#dfe03a', 'Platform']];
function dayLabel() {   // e.g. Tue 1 Jun · day 1/30  ·  6月1日 週二 · 第1/30天
  if (!A || !M) return '';
  const mi = MONTH_NAMES.indexOf(M.cfg.month) + 1, n = M.cal.length;
  return zh() ? `${mi}月${A.date}日 ${tr(A.dow)} · 第${A.dayI + 1}/${n}天` : `${A.dow} ${A.date} ${M.cfg.month} · day ${A.dayI + 1}/${n}`;
}
function resultsText() {
  const nt = (n) => money(n);   // a missing figure shows as $–, never as $0
  if (!A) return '';
  const c = A.cfg; let peak = 0, peakM = 0; A.occ.forEach((v, m) => { if (v > peak) { peak = v; peakM = m; } });
  const avg = A.waits.length ? A.waits.reduce((s, v) => s + v, 0) / A.waits.length : 0, mx = A.waits.length ? Math.max(...A.waits) : 0;
  const pr = A.prs.length ? ': ' + A.prs.map(p => `${trName(p.name)} ${tr(p.lift)} ${p.kg} kg`).join('; ') : '';
  if (zh()) return [`gymsim 執行結果 · 種子 ${c.seed} · ${dayLabel()} · ${tr(c.weather)}`,
    `每週尖峰 ${c.peak} 人，停留 ${c.visit} 分，組成 健力${c.mix.power}/舉重${c.mix.oly}/健美${c.mix.body}/新手${c.mix.beginner} %`,
    `健力架 ${c.racks}，舉重台 ${c.plats}，訓練椅 ${c.benches}，清潔人員 ${S.cleaners}，人數上限 ${S.cap}，健力架彎舉 ${S.curls ? '開' : '關'}`,
    `耐心 ${S.patience} 分，輪流使用 ${S.workIn} %，組間休息 ${S.rest} 分，槓片歸位 ${S.rerack} %`,
    `時鐘 ${hhmm(A.t)}${A.done ? '（今日結束）' : ''} · 到訪 ${A.visits} 人次`,
    `尖峰人數 ${peak}（${hhmm(T_OPEN + peakM * 60)}）`,
    `平均等待 ${avg.toFixed(1)} 分 · 最長等待 ${mx.toFixed(1)} 分 · 最長隊伍 ${A.longestQ}`,
    `PR ${A.prs.length}${pr}`, `今日 EBITDA ${nt(A.pnl && A.pnl.ebitda)} · 今日現金收入 ${nt(A.pnl && A.pnl.cashIn)}`, M ? `本月至今 EBITDA ${nt(projectMonth().mtd.ebitda)} · 本月預估 ${nt(projectMonth().total.ebitda)}` : ''].join('\n');
  return [`gymsim run · seed ${c.seed} · ${dayLabel()} · ${c.weather}`,
    `Weekly peak ${c.peak} people, visit ${c.visit} min, mix P${c.mix.power}/O${c.mix.oly}/B${c.mix.body}/N${c.mix.beginner} %`,
    `Racks ${c.racks}, platforms ${c.plats}, benches ${c.benches}, cleaners ${S.cleaners}, cap ${S.cap}, curls in racks ${S.curls ? 'on' : 'off'}`,
    `Patience ${S.patience} min, work-in ${S.workIn} %, rest ${S.rest} min, re-rack ${S.rerack} %`,
    `Clock ${hhmm(A.t)}${A.done ? ' (day complete)' : ''} · visits ${A.visits}`,
    `Peak occupancy ${peak} at ${hhmm(T_OPEN + peakM * 60)}`,
    `Average wait ${avg.toFixed(1)} min · longest wait ${mx.toFixed(1)} min · longest queue ${A.longestQ}`,
    `PRs ${A.prs.length}${pr}`, `EBITDA today ${nt(A.pnl && A.pnl.ebitda)} · cash in ${nt(A.pnl && A.pnl.cashIn)}`, M ? `Month to date EBITDA ${nt(projectMonth().mtd.ebitda)} · projected month ${nt(projectMonth().total.ebitda)}` : ''].join('\n');
}
// ---------------------------------------------------------------- monitors + plots
// rows of the P&L table: [field of A.pnl (or extra), label, row class]; costs are shown as negatives
const MEMBER_ROWS = [['active', 'Active members'], ['joined', 'Joined'], ['lapsed', 'Lapsed'], ['returned', 'Returned'], ['clients', 'PT clients'], ['balked', 'Turned away at the door'], ['bad', 'Bad visits']];
const SENS_LABEL = { peak: 'People at the weekly peak', off: 'Off-peak price per minute', otherOpex: 'Other fixed costs', otherRev: 'Add-ons (estimated)', ptS: 'PT sessions a month',
  rentRate: 'Rent per 坪', staff: 'Staff cost per month', area: 'Floor area', elec: 'Electricity', share: 'Gym keeps of PT' };
let pnlCostKey = '';
// cost levers (area, rent, staff) apply at once, even when paused: recompute today's P&L when they change
function syncCosts() { if (!A || !A.pnl) return; const key = `${S.area}|${S.rentRate}|${S.staff}`; if (key !== pnlCostKey) { pnlCostKey = key; A.pnl = computePnl(); } }
function setText(id, v) { const e = document.getElementById(id); if (e && e.textContent !== String(v)) e.textContent = v; }
function updateMonitors() {
  if (!A) return;
  syncCosts(); drawPriceBoard(); setText('dayLbl', dayLabel()); updateLiveLine(); if (typeof updateGoalLine === 'function') updateGoalLine(); updateBooks();
  setText('mClock', hhmm(A.t)); setText('hudClock', `${hhmm(A.t)} · ${tx(`${A.inside} inside`, `館內 ${A.inside} 人`)}${A.closed ? (A.closedWhy === 'closure' ? tx(' · closed', ' · 休館') : tx(' · closed: typhoon', ' · 颱風停班停課，休館')) : A.done ? tx(' · day complete', ' · 今日結束') : (A.t < A.open ? tx(` · opens ${hhmm(A.open)}`, ` · ${hhmm(A.open)} 開門`) : A.t > T_CLOSE ? tx(' · closed', ' · 已打烊') : '')}`);
  setText('mIn', A.inside);
  let waiting = A.outQ.length; for (const s of STATIONS) waiting += s.queue.length; setText('mWait', waiting);
  setText('mAvg', A.waits.length ? (A.waits.reduce((s, v) => s + v, 0) / A.waits.length).toFixed(1) + tx(' min', ' 分') : '–');   /* 'm' read as millions next to $1.5M (playtest) */
  setText('mQ', A.longestQ); setText('mPR', A.prs.length);
  let stray = 0; for (const s of STATIONS) stray += s.strayDB + (s.dirty > 20 ? 1 : 0); setText('mStray', stray);
  setText('mVisits', A.visits);
  let rq = 0; for (const s of STATIONS) if (s.type === 'rack' || s.type === 'olyplat') rq += s.queue.length; setText('mRack', rq);
}
function plotLine(c, arr, max, col, w = 1, dash) {
  const W_ = c.canvas.width, H_ = c.canvas.height, n = arr.length; c.strokeStyle = col; c.lineWidth = w; c.setLineDash(dash || []); c.beginPath(); let started = false;
  for (let i = 0; i < n; i++) { const v = arr[i]; if (Number.isNaN(v)) continue; const x = 26 + i / n * (W_ - 30), y = H_ - 12 - v / max * (H_ - 18); if (!started) { c.moveTo(x, y); started = true; } else c.lineTo(x, y); }
  c.stroke(); c.setLineDash([]);
}
function axes(c, max, unit) {
  const W_ = c.canvas.width, H_ = c.canvas.height; c.fillStyle = '#10131c'; c.fillRect(0, 0, W_, H_);
  c.strokeStyle = '#2f3340'; c.lineWidth = 1; c.font = '11px Silkscreen, monospace'; c.fillStyle = '#6b7182';
  for (const h of [7, 10, 13, 16, 19, 22]) { const x = 26 + (h - 7) / 17 * (W_ - 30); c.beginPath(); c.moveTo(x, 4); c.lineTo(x, H_ - 12); c.stroke(); c.fillText(String(h).padStart(2, '0'), x - 5, H_ - 2); }
  c.fillText(String(Math.round(max)), 2, 10); c.fillText('0', 2, H_ - 12);
}
function drawPlots() {
  if (!A) return;
  // occupancy
  let c = document.getElementById('pOcc').getContext('2d');
  let max = Math.max(S.cap, 10, ...[...A.occ].filter(v => !Number.isNaN(v)), ...HIST.flatMap(h => [...h.occ].filter(v => !Number.isNaN(v)))) + 4;
  axes(c, max); HIST.forEach((h, i) => plotLine(c, h.occ, max, ['#6b7182', '#474c5c', '#2f3340'][i], 1));
  const capArr = new Float32Array(A.occ.length).fill(S.cap); plotLine(c, capArr, max, '#d6403a', 1, [4, 3]); plotLine(c, A.occ, max, '#dfe03a', 2);
  const cur = A.lastMin >= 0 ? A.occ[A.lastMin] : 0; setText('pOccv', Number.isNaN(cur) ? '' : tx(`${cur} now`, `現在 ${cur} 人`));
  // queue
  c = document.getElementById('pQ').getContext('2d');
  max = Math.max(4, ...[...A.q].filter(v => !Number.isNaN(v)), ...HIST.flatMap(h => [...h.q].filter(v => !Number.isNaN(v)))) + 1;
  axes(c, max); HIST.forEach((h, i) => plotLine(c, h.q, max, ['#6b7182', '#474c5c', '#2f3340'][i], 1)); plotLine(c, A.q, max, '#e08f5a', 2);
  // zones stacked
  c = document.getElementById('pZ').getContext('2d');
  const n = A.occ.length, stack = new Float32Array(n).fill(0); const layers = [];
  for (const [k] of ZONES) { const z = A.zones[k]; const arr = new Float32Array(n); for (let i = 0; i < n; i++) { if (Number.isNaN(z[i])) { arr[i] = NaN; continue; } stack[i] += z[i]; arr[i] = stack[i]; } layers.push(arr); }
  max = Math.max(8, ...[...stack]) + 2; axes(c, max);
  layers.forEach((arr, i) => plotLine(c, arr, max, ZONES[i][2], 1.5));
  // histogram of waits
  c = document.getElementById('pH').getContext('2d'); const W_ = c.canvas.width, H_ = c.canvas.height;
  c.fillStyle = '#10131c'; c.fillRect(0, 0, W_, H_);
  const bins = new Array(12).fill(0); for (const w of A.waits) bins[Math.min(11, Math.floor(w))]++;
  const bm = Math.max(1, ...bins); const bw = (W_ - 30) / 12;
  c.font = '11px Silkscreen, monospace';
  bins.forEach((v, i) => { const h = v / bm * (H_ - 22); c.fillStyle = '#4a8acb'; c.fillRect(26 + i * bw + 1, H_ - 12 - h, bw - 2, h); c.fillStyle = '#6b7182'; if (i % 2 === 0) c.fillText(i === 11 ? '11+' : String(i), 26 + i * bw + 2, H_ - 2); });
  c.fillStyle = '#6b7182'; c.fillText(String(bm), 2, 10);
  setText('pHv', tx(`${A.waits.length} waits`, `${A.waits.length} 次等待`));
}
// ---------------------------------------------------------------- follow card
const cardEl = document.getElementById('card');
// what a station is called on its card and in the hover label
function stationName(s) { const own = { bench: 'Adjustable bench', dbspot: 'Dumbbell spot', sled: 'Sled lane', mat: 'Stretch mat', rack: 'Power rack', olyplat: 'Olympic platform' }[s.type];
  return tr(own || (LIFTS[Object.keys(LIFTS).find(k => LIFTS[k].types[0] === s.type)] || { name: s.type }).name); }
let followA = null, focusS = null;
function clearFollow() { followA = null; focusS = null; view.follow = null; cardEl.style.display = 'none'; }
function updateCard() {
  if (followA) {
    const a = followA;
    if (!a.visible && a.state === 'gone') { cardEl.innerHTML = `<h3><span>${trName(a.name)}</span><button id="cardX">×</button></h3><div class="now">${tr('Gone home')}</div>`; }
    else {
      const e = a.kind === 'member' && a.state === 'ex' ? a.prog[a.exI] : null;
      let now = tr(({ arrive: 'Arriving', queueOut: 'Waiting outside (gym full)', toDesk: 'Checking in', desk: 'At the front desk', toLocker: 'Heading to the changing room', locker: 'Changing', toLockerOut: 'Done, heading to change', lockerOut: 'Changing', toExit: 'Leaving', leaveSite: 'Leaving', busWait: 'Waiting for the bus', inCar: 'Parking' })[a.state] || '');
      if (e) {
        const L = LIFTS[e.lift], set = e.sets[Math.min(e.setI, e.sets.length - 1)], ln = tr(L.name);
        const kg = set && set.kg ? ` · ${L.kind === 'db' ? set.kg + tx(' kg DBs', ' kg 啞鈴') : set.kg + ' kg'}` : '';
        const sn = `${e.setI + 1}/${e.sets.length}`, rp = set && set.reps > 1 ? `${Math.min(set.reps, (e.rep || 0) + 1)}/${set.reps}` : '';
        now = (zh() ? { wait: `等待${ln} · ${Math.round((A.t - e.waitT) / 60)}/${S.patience} 分`, walk: `走向${ln}`, setup: `裝槓片 · ${ln}`, spotwait: '等待保護者', set: `${ln} · 第 ${sn} 組${kg}${rp ? ` · 第 ${rp} 下` : ''}`, rest: `休息中 · 下一組：${ln} 第 ${sn} 組${e.shared ? '（輪流使用）' : ''}`, cardio: `${ln} · 剩 ${Math.max(0, Math.ceil((e.endT - A.t) / 60))} 分`, mat: '伸展中', finish: '卸下槓片' }
          : { wait: `Waiting for ${ln} · ${Math.round((A.t - e.waitT) / 60)}/${S.patience} min`, walk: `Walking to ${ln}`, setup: `Loading · ${ln}`, spotwait: 'Waiting for a spotter', set: `${ln} · set ${sn}${kg}${rp ? ` · rep ${rp}` : ''}`, rest: `Resting · ${ln} set ${sn} next${e.shared ? ' (working in)' : ''}`, cardio: `${ln} · ${Math.max(0, Math.ceil((e.endT - A.t) / 60))} min left`, mat: 'Stretching', finish: 'Stripping the bar' })[e.st] || ln;
      }
      if (a.kind !== 'member') now = a.kind === 'cleaner' ? tr(a.task ? ({ strip: 'Stripping a loaded bar', db: 'Returning stray dumbbells', wipe: 'Wiping down equipment' })[a.task.kind] : 'On patrol') : a.kind === 'staff' ? tr('Front desk') : a.kind === 'pcoach' ? (a.outside ? tx(`Coaching ${a.client.name} · renting the floor`, `指導 ${a.client.name} · 場租中`) : tx(`Coaching ${a.client.name}`, `指導 ${a.client.name}`)) : tr(a.spotFor ? 'Spotting' : 'Coaching the floor');
      const arch = a.kind === 'pcoach' && a.outside ? tx('Outside coach', '外部教練') : a.arch === 'client' && a.coach && a.coach.outside ? tx('Client (outside coach)', '學員（外部教練）') : tr({ power: 'Powerlifter', oly: 'Olympic lifter', body: 'Bodybuilder', beginner: 'Beginner', client: 'Client (with coach)' }[a.arch] || ({ staff: 'Staff', cleaner: 'Cleaner', coach: 'Head coach', pcoach: 'Personal coach' })[a.kind]);
      const prog = a.prog ? '<ol>' + a.prog.map((p, i) => `<li class="${i < a.exI ? 'done' : i === a.exI && a.state === 'ex' ? 'cur' : ''}">${tr(LIFTS[p.lift].name)}${p.kind === 'cardio' || p.kind === 'mat' ? ` ${p.dur}${MIN()}` : ` ${p.sets.length}×${p.sets[p.sets.length - 1].reps}`}</li>`).join('') + '</ol>' : '';
      cardEl.innerHTML = `<h3><span>${trName(a.name)}</span><button id="cardX" aria-label="${tr('Stop following')}">×</button></h3><div style="color:var(--muted)">${arch}${a.arr ? tx(` · arrived ${hhmm(a.arr)}`, ` · ${hhmm(a.arr)} 到場`) : ''}</div><div class="now">${now}</div>${prog}`;
    }
    cardEl.style.display = 'block';
  } else if (focusS) {
    const s = focusS;
    const users = s.users.map(u => trName(u.name)).join(tx(', ', '、')) || tr('free');
    const q = s.queue.length ? s.queue.map(u => `${trName(u.name)} (${Math.round((A.t - (u.prog[u.exI].waitT || A.t)) / 60)}${tx('m', ' 分')})`).join(tx(', ', '、')) : tr('nobody');
    cardEl.innerHTML = `<h3><span>${stationName(s)}</span><button id="cardX" aria-label="${tr('Close')}">×</button></h3><div class="now">${tx('On it: ', '使用中：')}${users}</div><div>${tx('Queue: ', '排隊：')}${q}</div>${s.load > 20 || s.dirty > 20 ? `<div style="color:var(--muted)">${tx('Bar: ', '槓鈴：')}${s.dirty > 20 ? s.dirty + tx(' kg left loaded', ' kg 沒卸') : s.load + ' kg'}</div>` : ''}`;
    cardEl.style.display = 'block';
  }
  const x = document.getElementById('cardX'); if (x) x.onclick = clearFollow;
}
