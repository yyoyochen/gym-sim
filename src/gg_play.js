// ================================================================ judge round 3 (2026-11-20): the day ends on a card, the morning says who joined and left, the camera frames the hall
// The join / lapse step runs when the day rolls over (endDay), so a day's card cannot know tonight's numbers: the next morning's first line
// and the next day's card give them.
function lastNight() { const d = M && M.days.length ? M.days[M.days.length - 1] : null; return d && d.joined != null ? { in: d.joined + (d.returned || 0), out: d.lapsed || 0 } : null; }
function morningNews() { const n = lastNight(); if (n) showToast(tx(`Overnight: +${n.in} joined, −${n.out} left · ${M.pool.length} members`, `昨晚：+${n.in} 位加入、−${n.out} 位離開 · 現有 ${M.pool.length} 位會員`)); }
function dayCardEl() {
  let c = document.getElementById('dayCard');
  if (!c) { c = el('div', { id: 'dayCard', role: 'status' }, ''); c.hidden = true; document.body.appendChild(c);
    c.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('button[data-day]'); if (!b) return; if (b.dataset.day === 'next') { W.go.click(); syncDayCard(); } else openBooks('Today'); }); }
  return c;
}
function dayCardHtml() {
  const p = A.pnl, a = roundAbout(p.ebitda), amt = '$' + a.toLocaleString('en-US'), sign = a === 0 ? 0 : p.ebitda < 0 ? -1 : 1, n = lastNight();
  const big = sign < 0 ? tx(`Lost ${amt} today`, `今天虧 ${amt}`) : sign > 0 ? tx(`Made ${amt} today`, `今天賺 ${amt}`) : tx('Broke even today', '今天打平');
  const why = A.closed ? (A.closedWhy === 'rearrange' ? tx('Closed for rearranging: no visits, the fixed costs still ran.', '重新擺設休館：沒有人來，固定成本照付。') : A.closedWhy === 'closure' ? tx('Closed today: no visits, the fixed costs still ran.', '今日休館：沒有人來，固定成本照付。') : tx('Closed for the typhoon: no visits, the fixed costs still ran.', '颱風休館：沒有人來，固定成本照付。'))
    : tx(`earned ${money(p.net)} · costs ${money(p.net - p.ebitda)}`, `收入 ${money(p.net)} · 成本 ${money(p.net - p.ebitda)}`);
  const mem = n ? tx(`${M.pool.length} members · last night +${n.in} joined, −${n.out} left`, `會員 ${M.pool.length} 位 · 昨晚 +${n.in} 位加入、−${n.out} 位離開`) : tx(`${M.pool.length} members · who joins or leaves tonight shows in the morning`, `會員 ${M.pool.length} 位 · 今晚誰加入、誰離開，明早會告訴你`);
  const pass = !A.closed && A.passN > 0 ? `<p class="note" data-k="passToday">${tx(`${A.passN} monthly ${A.passN === 1 ? 'pass' : 'passes'} sold today: ${money(A.passRev || 0)} paid at the desk now, counted as earned a day at a time over ${PASS.days} days.`, `今天賣出 ${A.passN} 張月費：${money(A.passRev || 0)} 現在就在櫃檯收到，分 ${PASS.days} 天逐日算進收入。`)}</p>` : '';
  const fb = changeNoteHtml();
  const next = monthComplete() ? tx('New month', '新的一個月') : tx('Next day', '下一天');
  return `<h2 class="ttl">${dayLabel()} · ${tx('day closed', '今日結束')}</h2><p class="big ${sign < 0 ? 'loss' : sign > 0 ? 'gain' : ''}">${big}<small>${why}</small></p>
    <p class="row2"><span>${tx(`${A.checkins || 0} visits`, `${A.checkins || 0} 人次到訪`)}</span><span>${mem}</span></p>${pass}${fb}
    <div class="row"><button data-day="next" class="btn-go on">${next} ▸</button><button data-day="books">${tx('Open the P&L', '打開損益表')}</button></div>`;
}
// feedback round 2026-11-21: for a week after a change, the day card says what it did so far: each day since against the same weekday the week before.
// Today is not booked yet (joins and leaves come overnight), so visits and earnings count today and the night's numbers count booked days only.
function changeNow() {
  if (!BIZ || !BIZ.change || !A || !A.done) return null; const L = BIZ.dayLog || [], at = BIZ.change.at, today = { visits: A.visits || 0, earned: A.pnl ? A.pnl.net : 0, closed: !!A.closed };
  if (L.length + 1 - at > 7) return null;
  return { changes: BIZ.change.changes, day: changeEffect(L.concat([today]), at), night: changeEffect(L, at) };
}
function changeNoteHtml() {
  const c = changeNow(); if (!c || !c.day) return '';
  const nm = c.changes.map(x => { const n = CHANGE_NAMES[x.k]; return n ? `${tx(n[0], n[1])} ${n[2](x.from)} → ${n[2](x.to)}` : ''; }).filter(Boolean); if (!nm.length) return '';
  const names = nm.slice(0, 2).join(tx('; ', '；')) + (nm.length > 2 ? tx(` and ${nm.length - 2} more`, ` 等 ${nm.length} 項`) : ''), d = c.day, i0 = (v) => Math.round(v).toLocaleString('en-US'), d1 = (v) => (Math.round(v * 10) / 10).toString();
  const head = tx(`Your change, day ${d.n} of 7: ${names}`, `你的調整，第 ${d.n}/7 天：${names}`);
  if (!d.pairs) return `<p class="note" data-k="changeFx"><b>${head}</b><br>${tx('There is no week before the change to compare with yet.', '調整之前還沒有完整的一週可以比較。')}</p>`;
  const nt = c.night && c.night.pairs ? c.night : null;
  const body = tx(`Visits ${i0(d.visits.before)} → ${i0(d.visits.after)} a day · earned ${money(d.earned.before)} → ${money(d.earned.after)} a day`, `每天到訪 ${i0(d.visits.before)} → ${i0(d.visits.after)} 人次 · 每天收入 ${money(d.earned.before)} → ${money(d.earned.after)}`)
    + (nt ? tx(` · joined ${d1(nt.joined.before)} → ${d1(nt.joined.after)}, left ${d1(nt.lapsed.before)} → ${d1(nt.lapsed.after)} a night`, ` · 每晚加入 ${d1(nt.joined.before)} → ${d1(nt.joined.after)} 位、離開 ${d1(nt.lapsed.before)} → ${d1(nt.lapsed.after)} 位`) : '');
  return `<p class="note" data-k="changeFx"><b>${head}</b><br>${body}<br><small>${tx('Each day since is set against the same weekday the week before.', '每一天都和調整前一週的同一天比較。')}</small></p>`;
}
// shown whenever the day is over and nothing else has the player's attention; driven by the monitors' refresh, so it follows the game's state rather than one event
function syncDayCard() {
  const c = document.getElementById('dayCard'), nc = document.getElementById('noteCard'), gc = document.getElementById('goalCard');
  const show = !!A && !!M && A.done && !BUILD.on && !closing && !(nc && !nc.hidden) && !(gc && !gc.hidden) && !BIG_POPS.length && !sumPopsOn();   /* judge round 4: the card waits for the closed days' pops */
  if (!show) { if (c) c.hidden = true; return; }
  const box = dayCardEl(), h = dayCardHtml(); if (box.dataset.h !== h) { box.dataset.h = h; box.innerHTML = h; }
  box.classList.toggle('over', innerWidth < 860 && !panel.classList.contains('closed'));   /* a phone with the sheet open: the card sits above the sheet */
  box.hidden = false;
}
// ---------------------------------------------------------------- the camera frames the hall (a small gym is not a speck on a phone)
// the hall as the camera sees it: width across the screen and height up it (walls included), in metres
function hallSpan() {
  const ce = Math.cos(view.el), se = Math.sin(view.el), az = view.azT, w = HALL.x1 - HALL.x0, d = HZ - HALL.zb;
  return { w: Math.abs(w * Math.cos(az)) + Math.abs(d * Math.sin(az)), h: (Math.abs(w * Math.sin(az)) + Math.abs(d * Math.cos(az))) * se + WALL_H * ce };
}
// the share of the view's height the hall may fill: a phone keeps the HUD above and the sheet below clear; the builder's sheet leaves only the top
function viewBand() { return innerWidth < 860 ? (BUILD.on ? 0.24 : 0.62) : (BUILD.on ? 0.7 : 0.8); }
function hallFitZoom(band = viewBand()) { const sp = hallSpan(); return clamp(Math.min(view.baseH * aspect * 0.96 / sp.w, view.baseH * band * 0.96 / sp.h), ZMIN, 3); }
function frameHall(minZoom = 0) { view.follow = null; view.target.set((HALL.x0 + HALL.x1) / 2, 0, (HALL.zb + HZ) / 2); view.zoomT = Math.max(minZoom, hallFitZoom()); }
const BUILD_ZOOM = () => (innerWidth < 860 ? 0.75 : 1.1);   /* the builder's own furthest view: Rearrange never opens further out than this */
