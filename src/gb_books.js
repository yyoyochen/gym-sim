// ================================================================ front-desk books: a full-view binder opened at the reception (Plan 6)
// Tap the receptionist, the desk or its monitor (or the live takings line) to open it. While it is open the sim runs at 1x;
// closing restores the previous speed unless the learner picked another one meanwhile (D3, Call 11). Paused stays paused.
const BOOKS = { open: false, tab: 'Today', period: 'today', prevSpeed: null, shown: '' };
const BOOK_TABS = ['Today', 'Books', 'Bank', 'Members', 'Pricing', 'Staff', 'Facility'];
const booksEl = () => document.getElementById('books');
const nt$ = (v) => money(v);   /* Plan 8b: $ with every digit */
const ntn = (v) => `<span data-v="${Math.round(v || 0)}">${money(v || 0)}</span>`;   /* every digit; the figure also rides along for checks */
function speedToPos(v) { return Math.round(100 * Math.log(Math.max(1, v)) / Math.log(600)); }
function syncSpeed() { const w = W.w_speed; if (w) { w.inp.value = speedToPos(S.speed); w.out.textContent = w.fmt(S.speed); } const b = document.getElementById('spdBtn'); if (b) b.textContent = S.speed + '×'; }
const SPEEDS = [10, 60, 240];   /* the view bar's speed button steps through these */
function nextSpeed() { const i = SPEEDS.findIndex(v => v > S.speed); S.speed = SPEEDS[i < 0 ? 0 : i]; syncSpeed(); }
let BOOKS_SEEN = false;   /* owner 2026-11-15: the desk hint stays until the player opens the P&L in this visit; nothing is remembered between visits */
function booksSeen() { return BOOKS_SEEN; }
function openBooks(tab) {
  if (!A || (typeof BUILD !== 'undefined' && BUILD.on)) return;
  BOOKS.retainMsg = null;   /* the last retention answer is shown until the books close */   /* not over the builder: the books can move the day on */
  if (!BOOKS.open) { BOOKS.prevSpeed = S.speed; S.speed = 1; syncSpeed(); }
  BOOKS.open = true; if (tab) BOOKS.tab = tab;
  BOOKS_SEEN = true;
  const h = document.getElementById('booksHint'); if (h) h.style.display = 'none';
  clearFollow(); renderBooks();
}
function closeBooks() {
  if (!BOOKS.open) return;
  BOOKS.open = false; booksEl().hidden = true;
  if (S.speed === 1 && BOOKS.prevSpeed != null) { S.speed = BOOKS.prevSpeed; syncSpeed(); }   // a speed picked while at the desk is kept
  BOOKS.prevSpeed = null;
}
function booksNextDay() { if (typeof closing !== 'undefined' && closing) return; if (A && A.done) { W.go.click(); renderBooks(); } }
// the binder frame: header, tab strip, body; the body of the open tab is filled by its renderer
function renderBooks() {
  const b = booksEl(); if (!b) return; b.hidden = !BOOKS.open; if (!BOOKS.open) return;
  b.innerHTML = `<header class="bkh"><div class="bkt"><h2>${tx("Front desk · the gym's money", '櫃檯 · 健身房的帳')}</h2><div class="bks" id="bkWhen"></div></div>
    <button id="bkNext" hidden></button><button id="bkClose" aria-label="${tx('Close the P&L', '關閉損益表')}">✕</button></header>
    <nav class="bktabs" role="tablist">${BOOK_TABS.map(t => `<button role="tab" data-t="${t}" class="${t === BOOKS.tab ? 'on' : ''}">${tr(t === 'Books' ? 'P&L' : t)}</button>`).join('')}</nav>
    <div class="bkbody" id="bkBody"></div>`;
  b.querySelector('#bkClose').addEventListener('click', closeBooks);
  b.querySelector('#bkNext').addEventListener('click', booksNextDay);
  b.querySelectorAll('.bktabs button').forEach(x => x.addEventListener('click', () => { BOOKS.tab = x.dataset.t; renderBooks(); }));
  BOOKS.shown = ''; const body = b.querySelector('#bkBody');
  const r = BOOK_RENDER[BOOKS.tab]; if (r && r.build) r.build(body);
  updateBooks(true);
}
// numbers refresh every 0.2 s while open: live tabs re-render their markup only when it changed (scroll position is kept)
function updateBooks(force) {
  if (!BOOKS.open || !A) return;
  setText('bkWhen', `${dayLabel()} · ${hhmm(A.t)} · ${tx('1× while at the desk', '在櫃檯時 1 倍速')}`);
  const nx = document.getElementById('bkNext');
  if (nx) { nx.hidden = !A.done; nx.textContent = tr(monthComplete() ? 'New month' : 'Next day'); }
  const r = BOOK_RENDER[BOOKS.tab], body = document.getElementById('bkBody'); if (!r || !body) return;
  if (r.html) { const h = r.html(); if (force || h !== BOOKS.shown) { BOOKS.shown = h; body.innerHTML = h; if (r.wire) r.wire(body); } }
  if (r.update) r.update(body);
}
// tab renderers: html() for read-only tabs (re-rendered when numbers change), build()/update() for tabs with controls
const BOOK_RENDER = {};
// ---------------------------------------------------------------- live takings line under the HUD clock (D2) and first-visit hint
function liveLineParts() { const p = A && A.pnl, n = (A && A.checkins) || 0; return { v: verdictLive(p ? p.ebitda : 0, p), sub: tx(`earned ${nt$(p ? p.net : 0)} · costs ${nt$(p ? p.net - p.ebitda : 0)} so far`, `收入 ${nt$(p ? p.net : 0)} · 成本 ${nt$(p ? p.net - p.ebitda : 0)}`) }; }   /* evaluation 2026-11-20: the two numbers that make the result (cash from a PT pack is not today's income) */
function liveLineText() { const q = liveLineParts(); return tx(q.v.en, q.v.zh) + ' · ' + q.sub; }
function updateLiveLine() {   /* judge round 1: the day's result on top, labelled; the cash and visits small under it */
  const out = !!(BIZ && BIZ.cashOutAt), ll = document.getElementById('liveLine'); if (!ll) return; const q = liveLineParts();
  const html = `<b class="${q.v.sign < 0 ? 'loss' : q.v.sign > 0 ? 'gain' : ''}">${tx(q.v.en, q.v.zh)}</b><small>${q.sub}${out ? tx(' · cash ran out', ' · 現金用完') : ''}</small>${BIZ ? `<small class="cash">${tx('Cash ', '現金 ')}${moneyK(liveCash())}</small>` : ''}`;   /* judge 2026-11-20: the bank balance on the HUD */
  if (ll.dataset.h !== html) { ll.dataset.h = html; ll.innerHTML = html; } ll.classList.toggle('out', out);
}
// owner 2026-11-15: the receptionist; a tap gets a line about the gym and what they noticed about its people
const RECEP = { last: '', until: 0 };
function receptionistLines() {
  if (!A) return [tx('Morning! Doors open soon.', '早安！快開門了。')];
  const L = [], q = STATIONS.reduce((b, s) => (s.queue.length > (b ? b.queue.length : 0) ? s : b), null), stray = STATIONS.reduce((n, s) => n + s.strayDB, 0), regs = A.members.filter(a => a.visible && a.rec);
  L.push(A.inside > 30 ? tx(`${A.inside} people in right now. It's packed.`, `現在館內 ${A.inside} 人，好擠。`) : A.inside < 5 ? tx(`Only ${A.inside} in right now. A quiet spell.`, `現在館內只有 ${A.inside} 人，很安靜。`) : tx(`${A.inside} in right now, a steady crowd.`, `現在館內 ${A.inside} 人，人潮穩定。`));
  L.push(tx(`${A.checkins || 0} checked in so far today.`, `今天到目前為止有 ${A.checkins || 0} 人進場。`));
  if (q && q.queue.length) L.push(tx(`The ${stationName(q).toLowerCase()} has ${q.queue.length} waiting. People keep asking when it frees up.`, `${stationName(q)}有 ${q.queue.length} 人在等，大家一直問什麼時候輪到。`));
  if (stray) L.push(tx(`${stray} dumbbell${stray === 1 ? '' : 's'} left lying around. I'll tell the cleaner.`, `有 ${stray} 個啞鈴沒歸位，我會跟清潔人員說。`));
  if (M && grubbyNow() > 0) L.push(tx(`About ${Math.round(visitsLately())} visits a day lately. I can keep the place clean up to ${cleanCap(S.cleaners)}. Members notice. A cleaner would fix it (Staff tab).`, `最近每天大約 ${Math.round(visitsLately())} 人次，我們只能維持 ${cleanCap(S.cleaners)} 人次的整潔，會員都看在眼裡。請一位清潔人員就能解決（人事分頁）。`));
  if (deskCover(S, S.area) < 1) L.push(tx(`The desk has ${deskHours(S)} hours a week for a floor that needs ${deskHours(defaultRoster(S.area))}. I can't show everyone round.`, `這個坪數的櫃檯每週需要 ${deskHours(defaultRoster(S.area))} 小時，現在只有 ${deskHours(S)} 小時，沒辦法每個人都帶著參觀。`));
  if (A.prs && A.prs.length) L.push(tx(`${A.prs.length} PR${A.prs.length === 1 ? '' : 's'} today. You could hear one from here.`, `今天有 ${A.prs.length} 個人破個人紀錄，在這裡都聽得到。`));
  if (M) L.push(tx(`This month ${M.joinedTotal || 0} signed up and ${M.lapsedTotal || 0} stopped coming.`, `這個月有 ${M.joinedTotal || 0} 人入會，${M.lapsedTotal || 0} 人沒再來。`));
  if (S.weather === 'Rain') L.push(tx('Rain keeps the casual crowd at home.', '下雨天，隨興來的人就少了。'));
  if (S.weather === 'Heatwave') L.push(tx('Everyone asks if the air con is on full.', '每個人都在問冷氣是不是開到最強。'));
  L.push(tx('Weekday evenings, six to ten, are the rush.', '平日晚上六點到十點是尖峰。'));
  L.push(tx(`${S.coaches} coach${S.coaches === 1 ? '' : 'es'} on the roster; ${M ? M.pool.filter(m => m.pt && !m.outside).length : 0} members train with one.`, `目前有 ${S.coaches} 位駐館教練，${M ? M.pool.filter(m => m.pt && !m.outside).length : 0} 位會員有上教練課。`));
  if (regs.length) { const a = regs[Math.floor(Math.random() * regs.length)], n = a.rec.visits.length;
    L.push(n >= 8 ? tx(`I see ${trName(a.name)} almost every day.`, `${trName(a.name)}幾乎天天來。`) : a.rec.isNew ? tx(`${trName(a.name)} is new; still finding their way around.`, `${trName(a.name)}是新會員，還在熟悉環境。`) : tx(`${trName(a.name)} drops in a few times a month.`, `${trName(a.name)}一個月來幾次。`)); }
  L.push(tx('Someone asked again whether we sell protein shakes.', '又有人問我們有沒有賣高蛋白。'), tx('A water bottle was left on the bench. It is in the lost and found.', '有人把水壺忘在椅子上，放在失物招領了。'));
  return L;
}
function receptionistSay() {
  let box = document.getElementById('recepSay'); if (!box) { box = el('div', { id: 'recepSay' }, '<b></b><p></p><button data-recep="books"></button>'); document.body.appendChild(box); box.querySelector('button').addEventListener('click', (e) => { e.stopPropagation(); box.hidden = true; openBooks(); }); }   /* judge round 4: the desk still leads to the money once the hint is gone */
  const L = receptionistLines(), pool = L.filter(x => x !== RECEP.last), line = (pool.length ? pool : L)[Math.floor(Math.random() * (pool.length || L.length))];
  RECEP.last = line; box.querySelector('b').textContent = tx('Receptionist', '櫃檯人員'); box.querySelector('p').textContent = line; box.querySelector('button').textContent = tx('Open the P&L ▸', '打開損益表 ▸'); box.hidden = false; RECEP.until = performance.now() + 8000;
}
function updateRecepSay(toScreen) {
  const box = document.getElementById('recepSay'); if (!box || box.hidden) return;
  if (performance.now() > RECEP.until || BOOKS.open || (typeof BUILD !== 'undefined' && BUILD.on) || !A || !A.desk) { box.hidden = true; return; }
  const p = toScreen({ x: A.desk.pos.x, y: 2.2, z: A.desk.pos.z }); box.style.left = Math.round(p[0]) + 'px'; box.style.top = Math.round(p[1]) + 'px';
}
function placeBooksHint(h) {   /* judge round 1: keep the desk hint on screen; it is centred on the desk, so near an edge it slides inward */
  const r = h.getBoundingClientRect(), over = r.right - (innerWidth - 6), under = 6 - r.left, x = parseFloat(h.style.left) || 0;
  if (over > 0) h.style.left = Math.round(x - over) + 'px'; else if (under > 0) h.style.left = Math.round(x + under) + 'px';
}
function updateBooksHint(toScreen) {
  const h = document.getElementById('booksHint'); if (!h) return;
  const gc = document.getElementById('goalCard'), rs = document.getElementById('recepSay'), show = !!A && !BOOKS.open && !booksSeen() && !(rs && !rs.hidden) &&   /* not under the receptionist's bubble */ !(typeof BUILD !== 'undefined' && BUILD.on) && !(gc && !gc.hidden);   /* not over the builder or the goal card (Plan 10) */ h.style.display = show ? '' : 'none'; if (!show) return;
  const p = toScreen({ x: DESK_C.x, y: 0, z: DESK_C.z });   /* judge round 2: the ring on the desk's foot and the words under it, clear of the money that rises from the gate */ h.style.left = Math.round(p[0]) + 'px'; h.style.top = Math.round(p[1]) + 'px';
  const t = tx("Tap the desk to see today's money", '點櫃檯看今天的收支'); if (h.dataset.t !== t) { h.dataset.t = t; h.querySelector('span').textContent = t; } if (show) placeBooksHint(h);
}
// ---------------------------------------------------------------- shared row helpers
const pctOf = (v, net) => net > 0.5 && v / net < 10 ? (100 * v / net).toFixed(1) + '%' : '–';   /* a cost at 27 times the morning's sales says nothing */
// one P&L row: label, signed amount (costs negative), % of net sales; `k` tags the amount cell for tests; `note` is a green benchmark line
function bkRow(k, label, v, net, cls, note) {
  return `<tr class="${cls || ''}"><td>${label}${note ? `<span class="bench">${note}</span>` : ''}</td><td class="n" data-k="${k}">${ntn(v)}</td><td class="p">${net == null ? '' : pctOf(Math.abs(v), net)}</td></tr>`;
}
const bkGroup = (label) => `<tr class="grp0"><td colspan="3">${label}</td></tr>`;
const bkSection = (title, inner, note) => `<section class="grp"><h2><span>${title}</span>${note ? `<span class="pend">${note}</span>` : ''}</h2>${inner}</section>`;
// ---------------------------------------------------------------- Today: the till and the floor
BOOK_RENDER.Today = {
  html() {
    const p = A.pnl, cnt = (n) => `<span class="pend"> × ${n || 0}</span>`, ptCash = p.deferredChange + p.ptEarned;
    const till = `<table>
      <tr><td>${tx('Visit fees', '入場費')}${cnt(A.paidVisits)}</td><td class="n" data-k="entry">${ntn(p.entry)}</td></tr>
      ${S.monthlyOn || p.passes ? `<tr><td>${tx('Monthly passes sold', '售出月費')}${cnt(A.passN)}</td><td class="n" data-k="passes">${ntn(p.passCash)}</td></tr>` : ''}
      <tr><td>${tx('New member cards (joining fee)', '新會員卡（入會費）')}${cnt(Math.round((p.cards || 0) / CHURN.card))}</td><td class="n" data-k="cards">${ntn(p.cards)}</td></tr>
      <tr><td>${tx('Personal-training packs sold', '售出教練課方案')}${cnt(A.packs)}</td><td class="n" data-k="ptCash">${ntn(ptCash)}</td></tr>
      <tr><td>${tx('Coaches renting the floor', '教練租場地')}${cnt(A.rentN)}</td><td class="n" data-k="rentals">${ntn(p.rentals)}</td></tr>
      <tr class="sum"><td>${tx('Paid at the desk today', '今日櫃檯實收')}</td><td class="n" data-k="takings">${ntn(p.takings)}</td></tr></table>
      <p class="note" data-k="deskWhy">${tx(`Money handed over today. It is not the "earned ${nt$(p.net)}" on the top line: a coaching pack is paid up front and earned one session at a time, earned leaves out the 5% sales tax, and it counts small extras (drinks, day guests) that are estimated.${S.monthlyOn || p.passCash ? ` A monthly pass is paid today and earned a day at a time over its 30 days.` : ''}`, `今天實際收到的錢。它和最上面的「收入 ${nt$(p.net)}」不一樣：教練課方案是預先付款、上一堂才算一堂的收入；收入不含 5% 營業稅；另外還估算了飲料、臨時客人等零星收入。${S.monthlyOn || p.passCash ? '月費是今天收錢，之後 30 天每天認列一天的收入。' : ''}`)}</p>`;
    const floor = `<table>
      <tr><td>${tx('Inside now', '館內人數')}</td><td class="n">${A.inside}</td></tr>
      <tr><td>${tx('Checked in today', '今日進場')}</td><td class="n">${A.checkins || 0}</td></tr>
      <tr><td>${tx('PT sessions delivered', '已上教練課')}</td><td class="n">${A.ptSessions || 0}</td></tr>
      <tr><td>${tx('Turned away at the door', '門口被擋下')}</td><td class="n">${A.balked || 0}</td></tr>
      <tr><td>${tx('Bad visits (long waits)', '不愉快的到訪（久候）')}</td><td class="n">${A.bad || 0}</td></tr></table>`
      + `<p class="note" data-k="countsWhy">${(S.monthlyOn || A.passVisits) ? tx(`${A.checkins || 0} checked in · ${A.paidVisits || 0} have paid by the minute${A.done ? '' : ' so far'}. Pass holders do not pay at the desk: ${A.passVisits || 0} visit${A.passVisits === 1 ? '' : 's'} today ${A.passVisits === 1 ? 'was' : 'were'} on a monthly pass.`, `${A.checkins || 0} 人進場 · ${A.done ? '' : '目前 '}${A.paidVisits || 0} 人按分鐘付款。持月費的會員不用在櫃檯付錢：今天有 ${A.passVisits || 0} 人次是用月費進場。`)
        : A.done ? tx(`${A.checkins || 0} checked in · ${A.paidVisits || 0} have paid. Everyone pays by the minute on the way out.`, `${A.checkins || 0} 人進場 · ${A.paidVisits || 0} 人已付款。每個人離場時按分鐘付費。`)
        : tx(`${A.checkins || 0} checked in · ${A.paidVisits || 0} have paid so far. Everyone pays by the minute on the way out, so the two meet at closing.`, `${A.checkins || 0} 人進場 · 目前 ${A.paidVisits || 0} 人已付款。每個人離場時按分鐘付費，打烊時兩個數字會相同。`)}</p>`;
    const closed = A.closed ? `<p class="note warn">${A.closedWhy === 'rearrange' ? (() => { const left = M.cal.slice(M.dayI + 1).filter(d => d.rearrange).length + (BIZ.closedLeft || 0); return tx(`Closed today for rearranging${left ? `: ${left} more day${left === 1 ? '' : 's'} after today` : '; it reopens tomorrow with the new layout'}. No sales, the fixed costs still run.`, `今日重新擺設休館${left ? `：之後還有 ${left} 天` : '，明天以新擺設開門'}。沒有營收，固定成本照付。`); })() : A.closedWhy === 'closure' ? tx('Closed today: no sales, the fixed costs still run.', '今日休館：沒有營收，固定成本照付。') : tx('Closed today for the typhoon: no sales, the fixed costs still run.', '颱風休館：沒有營收，固定成本照付。')}</p>` : '';
    // judge 2026-11-20: the stamp names the period that was closed (a month close is not "Day closed") and gives its result in plain words
    const bc = BOOKS.closed && BOOKS.closed.dayI === M.dayI && BOOKS.closed.days > 1 ? BOOKS.closed : null, res = (v) => `${v < 0 ? tx('lost', '虧') : tx('made', '賺')} ${nt$(Math.abs(v))} ${tx('after running costs', '（已扣營運成本）')}`;
    const monthAll = M.days.reduce((t, d) => t + d.pnl.ebitda, 0) + A.pnl.ebitda;   /* judge round 4: a closed month is stamped with the whole month's result (the month card's figure), not only the days that were skipped */
    const stamp = !A.done ? '' : bc && bc.kind === 'month' ? `<div class="stamp" data-k="monthStamp">${tx('Month closed', '本月結帳')} · ${res(monthAll)}</div>` : bc ? `<div class="stamp">${tx(`${bc.days} days closed`, `結帳 ${bc.days} 天`)} · ${res(bc.ebitda)}</div>` : `<div class="stamp">${tx('Day closed', '本日結帳')} · ${roundAbout(p.ebitda) === 0 ? tx('broke even', '打平') : `${p.ebitda < 0 ? tx('lost about', '虧約') : tx('made about', '賺約')} $${roundAbout(p.ebitda).toLocaleString('en-US')} ${tx('after running costs', '（已扣營運成本）')}`}</div>`;   /* judge round 4: the stamp and the verdict under it give the day's result as one figure, rounded the same way */
    const cl = BOOKS.closed && BOOKS.closed.dayI === M.dayI ? closedSummary(BOOKS.closed) + `<p class="note" style="color:var(--accent)">${tx(`Closed early: ${BOOKS.closed.days} day${BOOKS.closed.days === 1 ? '' : 's'} · earned ${nt$(BOOKS.closed.earned)} · after running costs ${nt$(BOOKS.closed.ebitda)}`, `提前結帳：${BOOKS.closed.days} 天 · 收入 ${nt$(BOOKS.closed.earned)} · 扣營運成本後 ${nt$(BOOKS.closed.ebitda)}`)}</p>` : '';
    const closeBtns = `<div class="row">${[['day', tx('Close the day', '結束今天')], ['week', tx('Close the week', '結束本週')], ['month', tx('Close the month', '結束本月')]].map(([k, l]) => `<button data-close="${k}">${l}</button>`).join('')}</div>`;
    const v = verdictText(A.pnl), vsec = bkSection(A.done ? tx('The day', '今天') : tx('The day so far', '今天到目前'), `<p class="verdict ${v.sign < 0 ? 'loss' : v.sign > 0 ? 'gain' : ''}">${tx(v.en, v.zh)}</p><p class="note">${tx('After rent, staff and running costs. The bank loan is on the Bank tab.', '已扣租金、人事與水電雜支；銀行貸款在「銀行」分頁。')}</p>`);   /* first-minute polish: the verdict first */
    return closed + stamp + cl + vsec + bkSection(tx('Paid at the desk today', '今日櫃檯實收'), till) + bkSection(tx('Floor', '場內'), floor) + bkSection(tx('Close early', '提前結帳'), closeBtns + `<p class="note">${tx('The days run without being shown; the P&L records every one of them.', '這些天會在背景跑完，損益表照樣記下每一天。')}</p>`);
  },
  wire(body) { body.querySelectorAll('button[data-close]').forEach(b => b.addEventListener('click', () => closeEarly(b.dataset.close))); }
};
// ---------------------------------------------------------------- Books: the full itemised P&L for a period
const PERIODS = [['today', 'Today', '今日'], ['mtd', 'Month to date', '本月至今'], ['month', 'Month projected', '本月預估'], ['year', 'Year', '全年']];
const archOf = (per) => per && per.startsWith('arch:') && BIZ ? BIZ.months[+per.slice(5)] : null;
const monthLabel = (name, year) => zh() ? `${year} 年 ${MONTH_NAMES.indexOf(name) + 1} 月` : `${name} ${year}`;
function periodSeg(per) { const on = archOf(per) ? 'year' : per; return `<div class="seg" role="group" style="grid-template-columns:repeat(4,1fr)">${PERIODS.map(([k, en, z]) => `<button data-p="${k}" class="${k === on ? 'on' : ''}" aria-pressed="${k === on}">${tx(en, z)}</button>`).join('')}</div>`; }
// the year so far (A5): every closed month as booked, the current month projected, and year-to-date totals; tap a closed month for its P&L
const cashM = (v) => moneyK(v);   /* the year view's cash column stays short so five columns fit a phone */
// what sits between a closed month's result and its net profit, as the Year view books it: wear on equipment, loan interest, a loss on kit sold, income tax
function monthBelow(m) { const c = pnlCosts(), dy = (m.depYear != null ? m.depYear : c.depYear) * m.days / daysInMonth(m.year, m.name), x = belowEbitda(m.pnl.ebitda || 0, { ...c, depYear: dy }, m.interest + (m.loss || 0));
  return { dep: x.dep, interest: m.interest, loss: m.loss || 0, tax: x.tax, net: x.netProfit, loan: (m.interest || 0) + (m.principal || 0), principal: m.principal || 0 }; }
const ym = (v) => (zh() ? moneyK(v) : money(v));
const ynt = (v) => zh() ? `<span data-v="${Math.round(v || 0)}">${moneyK(v || 0)}</span>` : ntn(v);   /* judge round 4: in Chinese the Year table counts in 萬 like its Cash column and the cards */
function yearHtml() {
  const c = pnlCosts(), rows = [], tot = { net: 0, ebitda: 0, np: 0 }, share = (days, y, name) => days / daysInMonth(y, name);   /* review I2: a short first month takes its share of depreciation */
  const out = { dep: 0, interest: 0, tax: 0, principal: 0 }; for (const m of BIZ.months) { const x = monthBelow(m); out.dep += x.dep; out.interest += x.interest + x.loss; out.tax += x.tax; out.principal += x.principal; }
  BIZ.months.forEach((m, i) => { const np = belowEbitda(m.pnl.ebitda || 0, { ...c, depYear: (m.depYear != null ? m.depYear : c.depYear) * share(m.days, m.year, m.name) }, m.interest + (m.loss || 0)).netProfit; tot.net += m.pnl.net || 0; tot.ebitda += m.pnl.ebitda || 0; tot.np += np;
    rows.push(`<tr data-k="yr" data-arch="${i}" style="cursor:pointer"><td style="color:var(--accent)">${monthLabel(m.name, m.year)} ›</td><td class="n">${ynt(m.pnl.net)}</td><td class="n">${ynt(m.pnl.ebitda)}</td><td class="n">${ynt(np)}</td><td class="n">${cashM(m.cashEnd)}</td></tr>`); });
  const pm = projectMonth().total, f = share(M.cal.length, BIZ.year, M.cfg.month), np = belowEbitda(pm.ebitda, { ...c, depYear: c.depYear * f }, BIZ.balance * BIZ.rate / 1200 * f + (BIZ.mLoss || 0)).netProfit; tot.net += pm.net; tot.ebitda += pm.ebitda; tot.np += np;
  rows.push(`<tr data-k="yr" data-cur="1"><td>${monthLabel(M.cfg.month, BIZ.year)} <span class="tag">${tx('projected', '預估')}</span></td><td class="n">${ynt(pm.net)}</td><td class="n">${ynt(pm.ebitda)}</td><td class="n">${ynt(np)}</td><td class="n">${cashM(liveCash())}</td></tr>`);
  const head = `<tr class="grp0"><td>${tx('Month', '月份')}</td><td class="n">${tx('Earned', '收入')}</td><td class="n">${tx('After costs', '扣成本後')}</td><td class="n">${tx('Net profit', '淨利')}</td><td class="n">${tx('Cash', '現金')}</td></tr>`;
  // judge 2026-11-20: "so far" is what has happened: closed months plus this month to date (the projection stays on its own row)
  const md = projectMonth().mtd, fd = f * (M.dayI + 1) / M.cal.length, bd = belowEbitda(md.ebitda, { ...c, depYear: c.depYear * fd }, BIZ.mLoss || 0), npd = bd.netProfit; out.dep += bd.dep; out.interest += BIZ.mLoss || 0; out.tax += bd.tax; tot.net += md.net - pm.net; tot.ebitda += md.ebitda - pm.ebitda; tot.np += npd - np;
  const total = `<tr class="sum"><td>${tx('So far (closed months + this month to date)', '累計（已結帳月份＋本月至今）')}</td><td class="n">${ynt(tot.net)}</td><td class="n" data-k="yrEbitda">${ynt(tot.ebitda)}</td><td class="n">${ynt(tot.np)}</td><td class="n"></td></tr>`;
  return bkSection(tx('The business so far', '開業至今'), `<div class="yrwrap"><table class="yr">${head}${rows.join('')}${total}</table></div><p class="note" data-k="yrLeftOut">${tx(`So far: after costs ${ym(tot.ebitda)}, less wear on equipment ${ym(out.dep)}, loan interest ${ym(out.interest)} and income tax ${ym(out.tax)}, leaves a net profit of ${ym(tot.np)}. Paying back the loan itself (${ym(out.principal)} so far) takes cash out of the bank but is not a cost, so it is in the Cash column only.`, `累計：扣成本後 ${ym(tot.ebitda)}，再扣器材折舊 ${ym(out.dep)}、貸款利息 ${ym(out.interest)} 與所得稅 ${ym(out.tax)}，淨利是 ${ym(tot.np)}。償還貸款本金（累計 ${ym(out.principal)}）會讓銀行現金變少，但不算成本，所以只反映在「現金」欄。`)}</p><p class="note">${tx('Earned is sales after sales tax; After costs is the result after rent, staff and running costs, before loan and tax; Net profit also takes off wear on equipment, loan interest and tax. Closed months are as booked; tap one for its full P&L. Cash is the bank balance at each month end, and now.', '收入是扣營業稅後的銷售；「扣成本後」是扣掉租金、人事與營運成本、未計貸款與稅的結果；淨利再扣設備折舊、貸款利息與所得稅。已結帳月份依實際入帳；點一個月份看完整損益表。現金為每月底與目前的銀行餘額。')}</p>`, '$');
}
// owner 2026-11-15: what a close early ran: a week lists every day; a month lists the P&L by category over the closed days
function closedSummary(cl) {
  if (!cl.list || !cl.list.length || cl.kind === 'day') return '';
  const n = (v) => `<td class="n">${nt$(v)}</td>`;
  if (cl.kind === 'week') {
    const rows = cl.list.map(d => `<tr class="cday"><td>${zh() ? `${MONTH_NAMES.indexOf(d.month) + 1}月${d.date}日 ${tr(d.dow)}` : `${d.dow} ${d.date} ${d.month}`}</td>${n(d.pnl.net)}${n(d.pnl.ebitda)}</tr>`).join('');
    return bkSection(tx('The week, day by day', '本週逐日'), `<table class="closed"><tr class="grp0"><td></td><td class="n">${tx('Earned', '收入')}</td><td class="n">${tx('After costs', '扣成本後')}</td></tr>${rows}<tr class="sum"><td>${tx('Total', '合計')}</td>${n(cl.list.reduce((t, d) => t + d.pnl.net, 0))}${n(cl.ebitda)}</tr></table>`);
  }
  const p = {}; for (const d of cl.list) for (const k in d.pnl) if (typeof d.pnl[k] === 'number') p[k] = (p[k] || 0) + d.pnl[k];
  const it = itemiseFixed(p, pnlCosts()), row = (l, v, cls = '') => `<tr class="${cls}"><td>${l}</td>${n(v)}</tr>`;
  const body = `<tr class="grp0"><td colspan="2">${tx('Revenue', '營收')}</td></tr>`
    + row(tx('Visit fees, off-peak', '入場費（離峰）'), p.entryOff || 0) + row(tx('Visit fees, peak', '入場費（尖峰）'), p.entryPeak || 0) + (p.passes ? row(tx('Monthly passes', '月費'), p.passes) : '') + row(tx('Member cards', '會員卡'), p.cards || 0)
    + row(tx('PT earned', '教練課收入'), p.ptEarned || 0) + row(tx('Floor rentals', '場地租借'), p.rentals || 0) + row(tx('Add-ons (estimated)', '其他收入（估計）'), p.addOns || 0)
    + row(tx('Gross revenue', '總營收'), p.gross || 0, 'sum') + row(tx('VAT', '營業稅'), -(p.vat || 0))
    + `<tr class="grp0"><td colspan="2">${tx('Costs', '成本')}</td></tr>`
    + row(tx('Coach payout', '教練分潤'), -(p.coach || 0)) + row(tx('Marketing', '行銷'), -(p.mkt || 0)) + row(tx('Card and e-payment fees', '刷卡與電子支付手續費'), -(p.card || 0))
    + (p.retain ? row(tx('Retention actions', '留客行動'), -p.retain) : '') + (p.rearrange ? row(tx('Rearranging (movers)', '重新擺設（搬運）'), -p.rearrange) : '')
    + row(tx('Rent and management', '租金與管理費'), -(it.premises.rent + it.premises.mgmt)) + row(tx('Electricity and water', '水電'), -(it.premises.elec + it.premises.water))
    + row(tx('Staff', '人事'), -it.totals.staff) + row(tx('Floor upkeep and compliance', '場地維護與法規'), -(it.totals.floor + it.totals.compliance))
    + row(tx('Result before loan and tax', '未計貸款與稅的結果'), p.ebitda || 0, 'sum');
  return bkSection(tx(`The ${cl.days} closed days by category`, `結帳的 ${cl.days} 天，分類合計`), `<table class="closed">${body}</table>`);
}
function booksPeriod(period) {
  const arch = archOf(period); if (arch) return { ...arch.pnl };
  if (period === 'today' || !M) return { ...A.pnl };
  const pm = projectMonth();
  if (period === 'mtd') return { ...pm.mtd };
  const t = { ...pm.total }, m = pm.mtd, r = pm.rest;
  const share = m.entry > 0.5 ? m.entryPeak / m.entry : 0.296 * S.pricePeak / blendedPrice(S.priceOff, S.pricePeak);   // rest of the month at this month's peak share
  t.entryPeak = (m.entryPeak || 0) + (r.entry || 0) * share; t.entryOff = t.entry - t.entryPeak;
  t.restNet = r.net || 0;
  return t;
}
function booksDep(period) {
  const c = pnlCosts(), arch0 = archOf(period), month = (arch0 && arch0.depYear != null ? arch0.depYear : c.depYear) / 12, full = M ? daysInMonth(BIZ ? BIZ.year : 2027, M.cfg.month) : 30, days = M ? M.cal.length : 30, arch = archOf(period);   /* by the day of the calendar month: a short first month gets its share */
  const dep = arch ? month * arch.days / daysInMonth(arch.year, arch.name) : period === 'today' ? month / full : period === 'mtd' ? month / full * ((M ? M.dayI : 0) + 1) : month * days / full;
  return { dep, equipment: dep * DEP_SPLIT.equipment, fitout: dep * DEP_SPLIT.fitout };
}
BOOK_RENDER.Books = {
  html() {
    if (BOOKS.period === 'year' && BIZ) return periodSeg('year') + yearHtml();
    const per = BOOKS.period, arch = archOf(per), p = booksPeriod(per), c = pnlCosts(), net = p.net, it = itemiseFixed(p, c, Object.entries(rosterLines(S)).filter(([, v]) => v > 0)), d = booksDep(per);
    // loan interest is booked when the month closes: the month view shows this month's, today and month-to-date show none yet (A2)
    const interest = arch ? arch.interest : per === 'month' && BIZ ? BIZ.balance * BIZ.rate / 1200 * M.cal.length / daysInMonth(BIZ.year, M.cfg.month) : 0;   /* a short first month pays its share */
    const loss = arch ? (arch.loss || 0) : (per === 'mtd' || per === 'month') && BIZ ? (BIZ.mLoss || 0) : 0;   /* Plan 12: a sale below its book value */
    const ebit = p.ebitda - d.dep, tax = Math.max(0, ebit - interest - loss) * c.tax, ptCash = (p.deferredChange || 0) + (p.ptEarned || 0);
    const bp = (lo, hi) => `${(lo * 100).toFixed(1)}–${(hi * 100).toFixed(0)}%`;
    const occ = it.premises.rent + it.premises.mgmt;
    const seg = periodSeg(per) + (arch ? `<p class="note" style="color:var(--accent)">${monthLabel(arch.name, arch.year)} · ${tx('closed', '已結帳')}</p>` : '');
    // playtest (personas): say plainly whether the gym made money before the accounting lines
    const when = arch ? tx('that month', '那個月') : per === 'month' ? tx('this month (projected)', '本月（預估）') : per === 'mtd' ? tx('so far this month', '本月至今') : tx('today', '今天');
    const plain = `<p class="plain ${p.ebitda >= 0 ? 'up' : 'down'}" data-k="plain">${p.ebitda >= 0 ? tx(`The gym made ${money(p.ebitda)} ${when}`, `健身房${when}賺了 ${money(p.ebitda)}`) : tx(`The gym lost ${money(-p.ebitda)} ${when}`, `健身房${when}虧了 ${money(-p.ebitda)}`)}<span>${tx('before loan interest, wear on equipment and tax (EBITDA, the yellow line below)', '未計貸款利息、設備折舊與稅（即 EBITDA，下方黃色那一行）')}</span></p>`;
    const freeIdx = arch ? BIZ.months.indexOf(arch) : BIZ ? BIZ.monthIndex : 9, rentFreeNote = BUILT && freeIdx >= 0 && freeIdx < BUILT.rentFreeMonths ? `<span class="bench" data-k="rentFree">${tx(`first month rent-free; ${moneyK(S.area * S.rentRate)} a month from next month`, `第一個月免租；下個月起每月 ${moneyK(S.area * S.rentRate)}`)}</span>` : '';   /* judge 2026-11-20: say why rent is $0, and what is coming */
    let rows = bkGroup(tx('Revenue', '營收'))
      + bkRow('entryOff', tx('Visit fees, off-peak', '入場費（離峰）'), p.entryOff, net)
      + bkRow('entryPeak', tx('Visit fees, peak (Mon–Fri 18–22)', '入場費（尖峰，週一至五 18–22）'), p.entryPeak, net)
      + (p.passes || S.monthlyOn ? bkRow('passes', tx('Monthly passes (a day at a time)', '月費（按天認列）'), p.passes || 0, net) : '')
      + bkRow('cards', tx('Member cards', '會員卡'), p.cards, net)
      + bkRow('ptEarned', tx('PT earned (sessions delivered)', '教練課收入（已上課）'), p.ptEarned, net)
      + bkRow('rentals', tx('Floor rentals', '場地租借'), p.rentals, net)
      + bkRow('addOns', tx('Add-ons (estimated)', '其他收入（估計）'), p.addOns, net)
      + bkRow('gross', tx('Gross revenue', '總營收'), p.gross, net, 'sum')
      + bkRow('vat', tx('VAT (5%, inside prices)', '營業稅（5%，含在價格內）'), -p.vat, net)
      + bkRow('net', tx('Net sales', '銷售淨額'), net, net, 'sum')
      + bkGroup(tx('Variable costs', '變動成本'))
      + bkRow('coach', tx('Coach payout', '教練分潤'), -p.coach, net, '', tx(`The gym keeps ${c.gymShare}% of PT; Taipei gyms keep 40–60%`, `健身房保留教練課 ${c.gymShare}%；台北常見 40–60%`))
      + bkRow('mkt', tx('Marketing', '行銷'), -p.mkt, net)
      + (p.rearrange ? bkRow('rearrange', tx('Rearranging (movers)', '重新擺設（搬運）'), -p.rearrange, net) : '')   /* Plan 12 */
      + (p.retain ? bkRow('retain', tx('Retention actions', '留客行動'), -p.retain, net, '', tx('PT tasters (coach pay) and win-back SMS', '體驗課（教練費）與回流簡訊')) : '')
      + bkRow('card', tx('Card and e-payment fees', '刷卡與電子支付手續費'), -p.card, net)
      + bkRow('contribution', tx('Contribution', '邊際貢獻'), p.contribution, net, 'sum');
    const FX = [['premises', tx('Premises', '場地'), [['rent', tx('Rent', '租金') + (rentFreeNote || '')], ['mgmt', tx('Management fee', '管理費')], ['elec', tx('Electricity', '電費')], ['water', tx('Water', '水費')]]],
      ['staff', tx('Staff', '人事'), [['manager', tx('Store manager', '店長')], ['deskFT', tx(`Desk staff, full-time (${S.deskFT})`, `櫃檯正職（${S.deskFT} 人）`)], ['deskPT', tx('Desk staff, part-time', '櫃檯兼職')], ['coaches', tx(`Coaches' retainers (${S.coaches})`, `教練底薪（${S.coaches} 人）`)], ['cleaners', tx('Cleaners', '清潔人員')], ['statutory', tx('Labour and health insurance, pension', '勞健保與勞退')], ['bonusLeave', tx('Year-end bonus and leave cover', '年終與休假代班')]]],
      ['floor', tx('Running the floor', '場館營運'), [['cleaning', tx('Cleaning (outsourced)', '清潔（外包）')], ['maintenance', tx('Maintenance and repairs', '維修保養')], ['itSecurity', tx('Internet, software, security', '網路、軟體、保全')], ['supplies', tx('Supplies and pest control', '耗材與除蟲')]]],
      ['compliance', tx('Compliance and admin', '法規與行政'), [['insurance', tx('Public liability insurance', '公共意外責任險')], ['fire', tx('Fire and safety inspections', '消防與公安申報')], ['music', tx('Music licence', '音樂授權')], ['bookkeeping', tx('Bookkeeping', '記帳')], ['aed', tx('AED upkeep', 'AED 維護')]]]];
    rows += bkGroup(tx('Fixed costs', '固定成本'));
    for (const [g, gl, lines] of FX) {
      let note = '';
      if (g === 'premises') note = tx(`Rent + management ${pctOf(occ, net)} of net sales; benchmark ${bp(...BENCH.occupancy)}`, `租金加管理費占銷售淨額 ${pctOf(occ, net)}；參考值 ${bp(...BENCH.occupancy)}`);
      if (g === 'staff') note = tx(`${pctOf(it.totals.staff, net)} of net sales (about 24% is usual)`, `占銷售淨額 ${pctOf(it.totals.staff, net)}（一般約 24%）`);
      rows += `<tr><td>${gl}${note ? `<span class="bench">${note}</span>` : ''}</td><td class="n">${ntn(-it.totals[g])}</td><td class="p">${pctOf(it.totals[g], net)}</td></tr>`;
      for (const [k, l] of lines) if (it[g][k] != null) rows += `<tr class="sub"><td>${l}</td><td class="n" data-k="fx_${k}">${ntn(-it[g][k])}</td><td class="p"></td></tr>`;
    }
    rows += bkRow('fixed', tx('Total fixed costs', '固定成本合計'), -p.fixed, net, 'sum')
      + bkGroup(tx('Profit', '獲利'))
      + bkRow('ebitda', 'EBITDA', p.ebitda, net, 'sum', tx(`Benchmark ${bp(...BENCH.ebitda)} of net sales`, `參考值：銷售淨額的 ${bp(...BENCH.ebitda)}`))
      + bkRow('depEq', tx('Depreciation, equipment', '折舊（器材）'), -d.equipment, net)
      + bkRow('depFit', tx('Depreciation, fit-out', '折舊（裝修）'), -d.fitout, net)
      + bkRow('ebit', 'EBIT', ebit, net)
      + (per === 'month' || arch ? bkRow('interest', tx('Loan interest', '貸款利息'), -interest, net) : '')
      + (loss ? bkRow('loss', tx('Loss on equipment sold', '出售器材損失'), -loss, net) : '')
      + bkRow('tax', tx('Income tax (20% of a profit)', '營利事業所得稅（獲利的 20%）'), -tax, net)
      + bkRow('netProfit', tx('Net profit', '稅後淨利'), ebit - interest - loss - tax, net, 'sum');
    let extra = '';
    if (per === 'month') {
      const yrs = belowEbitda(p.ebitda, c).paybackYears, band = 0.1 * (p.restNet || 0), perPing = p.gross / c.area;
      extra = `<table><tr><td>${tx('Capex payback at this pace', '依此表現的回本期')}</td><td class="n" data-k="payback">${isFinite(yrs) ? tx(`${yrs.toFixed(1)} years`, `${yrs.toFixed(1)} 年`) : tx('never', '無法回本')}</td></tr>
        <tr><td>${tx('Likely EBITDA range (rest of month ±10%)', '可能的 EBITDA 區間（月底前 ±10%）')}</td><td class="n" data-k="range">${ntn(p.ebitda - band)} … ${ntn(p.ebitda + band)}</td></tr>
        <tr><td>${tx('Revenue per 坪', '每坪營收')}<span class="bench">${tx('Plausible for a Taipei gym: $5–10K a month', '台北健身房合理範圍：每月 $5,000–10,000')}</span></td><td class="n">${ntn(perPing)}</td></tr></table>`;
    }
    const cash = `<table>
      <tr><td>${tx('PT cash taken (packs sold)', '教練課現金（售出方案）')}</td><td class="n" data-k="ptCash">${ntn(ptCash)}</td></tr>
      <tr><td>${tx('PT earned (sessions delivered)', '教練課收入（已上課）')}</td><td class="n">${ntn(p.ptEarned)}</td></tr>
      <tr><td>${tx('Prepaid sessions still owed', '尚未上完的預收課程')}</td><td class="n" data-k="deferred">${ntn(A.deferred || 0)}</td></tr>
      <tr><td>${tx('Instalments still due', '尚未收的分期款')}</td><td class="n" data-k="ptDue">${ntn((M && M.ptDue) || 0)}</td></tr>${p.passCash || S.monthlyOn || passOwedValue() ? `
      <tr><td>${tx('Pass cash taken (passes sold)', '月費現金（售出月費）')}</td><td class="n" data-k="passCash">${ntn(p.passCash || 0)}</td></tr>
      <tr><td>${tx('Pass money earned (a day at a time)', '月費收入（按天認列）')}</td><td class="n">${ntn(p.passes || 0)}</td></tr>
      <tr><td>${tx('Pass days paid for, still owed', '已收費、尚未用完的月費天數')}</td><td class="n" data-k="passOwed">${ntn(passOwedValue())}</td></tr>` : ''}</table>
      <p class="note">${tx('Packs over $5K not billed per session need half the unused balance covered by a performance guarantee. Cash from a pack is owed until the sessions are delivered.', '超過 $5,000 且非按次收費的方案，未使用餘額須有一半履約保證。方案收到的現金在上完課前都是欠學員的。')}</p>`;
    const sens = sensitivity({ ...MONTH_BASE, peak: S.peak, off: S.priceOff, pk: S.pricePeak, rentRate: S.rentRate, area: S.area, staff: S.staff / 1000 }, MONTH_RANGES).slice(0, 6);
    const st = `<p class="note warn" data-k="sensNote">${tx('This table is not your gym today. It is a rough sum for a full, established gym of your size: the month\'s result after running costs if one thing sat at the bad or the good end of its usual range. Use it to see which things matter most.', '這張表不是你的健身房現在的狀況，而是同樣大小、客滿且經營穩定的健身房的粗估：某一項落在常見範圍不利或有利的一端時，一個月扣營運成本後的結果。用它看哪幾項影響最大。')}</p><table data-k="sens">
      <tr class="grp0"><td></td><td class="n">${tx('Bad case', '不利時')}</td><td class="n">${tx('Good case', '有利時')}</td></tr>
      ${sens.map(r => `<tr><td>${tr(SENS_LABEL[r.key] || r.key)}</td><td class="n">${ntn(Math.min(r.lo, r.hi))}</td><td class="n">${ntn(Math.max(r.lo, r.hi))}</td></tr>`).join('')}</table>`;   /* judge round 4: a cost at its low value is the good case, so the columns are ordered by outcome, not by the input */
    // evaluation 2026-11-20: six plain lines first; the accountant's statement folds away under them
    const sRow = (k, l, v, cls = '') => `<tr class="${cls}"><td>${l}</td><td class="n" data-k="${k}">${ntn(v)}</td></tr>`, running = it.totals.floor + it.totals.compliance;
    const simple = bkSection(tx('In short', '簡單看'), `<table data-k="simple">${sRow('s_earned', tx('Money earned (after sales tax)', '賺進來的錢（已扣營業稅）'), net)}${sRow('s_coach', tx("Coaches' share, marketing, card fees", '教練分潤、行銷、刷卡手續費'), -(net - p.contribution))}
      ${sRow('s_premises', tx('Rent and the building', '租金與場地') + rentFreeNote.replace('data-k="rentFree"', ''), -it.totals.premises)}${sRow('s_staff', tx('Staff', '人事'), -it.totals.staff)}${sRow('s_running', tx('Running the gym', '場館營運'), -running)}
      ${sRow('s_result', p.ebitda >= 0 ? tx('What is left', '剩下的') : tx('Short by', '不夠的'), p.ebitda, 'sum')}</table>`);
    const fold = (inner) => `<details data-k="full"${BOOKS.full ? ' open' : ''}><summary>${tx('The full statement', '完整損益表')}</summary>${inner}</details>`;
    if (arch) return seg + plain + simple + fold(bkSection(tx('Profit and loss', '損益表'), `<table>${rows}</table>`, tx('$ · % of net sales', '$ · 占銷售淨額')));
    const goal = typeof goalLineText === 'function' && goalLineText() ? `<p class="note goalnote" data-k="goal">${goalLineText()}</p>` : '';
    return seg + plain + goal + simple + fold(bkSection(tx('Profit and loss', '損益表'), `<table>${rows}</table>${extra}`, tx('$ · % of net sales', '$ · 占銷售淨額'))
      + bkSection(tx('Cash vs earned', '現金與實際收入'), cash) + bkSection(tx('At a full, established gym: what moves profit most', '客滿且穩定的健身房：影響獲利最大的因素'), st));
  },
  wire(body) { const det = body.querySelector('details[data-k="full"]'); if (det) det.addEventListener('toggle', () => { BOOKS.full = det.open; });
    body.querySelectorAll('.seg button[data-p]').forEach(b => b.addEventListener('click', () => { BOOKS.period = b.dataset.p; updateBooks(true); }));
    body.querySelectorAll('tr[data-arch]').forEach(r => r.addEventListener('click', () => { BOOKS.period = 'arch:' + r.dataset.arch; updateBooks(true); })); }
};
// ---------------------------------------------------------------- Members: the register and who is drifting away
function riskTag(m, i) {
  const tenure = i - m.joinedDay, bad = (m.bad || []).filter(d => d > i - 30 && d <= i).length, v30 = m.visits.filter(d => d > i - 30 && d <= i).length;
  if (tenure < 30) return { tag: tx('new member', '新會員'), kind: 'new', fact: tx(`joined ${Math.max(0, tenure)} days ago`, `${Math.max(0, tenure)} 天前加入`) };
  if (bad > 0) return { tag: tx('crowding', '太擁擠'), kind: 'crowding', fact: tx(`${bad} bad visit${bad > 1 ? 's' : ''} in 30 days`, `30 天內 ${bad} 次不愉快的到訪`) };
  return { tag: tx('rarely visits', '很少來'), kind: 'rare', fact: tx(`${v30} visit${v30 === 1 ? '' : 's'} in 30 days`, `30 天內來 ${v30} 次`) };
}
function atRisk(n = 5) {
  const i = M.dayI; return M.pool.map(m => ({ m, h: lapseHazard(m, i) })).sort((p, q) => q.h - p.h || p.m.id - q.m.id).slice(0, n);
}
BOOK_RENDER.Members = {
  html() {
    if (!M) return '';
    const mm = { active: M.pool.length, joined: M.joinedTotal, lapsed: M.lapsedTotal, returned: M.returnedTotal, clients: M.pool.filter(m => m.pt).length, balked: M.balkedTotal + (A.balked || 0), bad: M.badTotal + (A.bad || 0) };
    const reg = `<table>${MEMBER_ROWS.map(([k, lab]) => `<tr><td>${tr(lab)}</td><td class="n" data-k="mm_${k}">${mm[k]}</td></tr>`).join('')}</table><p class="note">${tx('This month so far. Lapsed members stop coming; some come back on their own.', '本月至今。流失的會員不再來，有些會自己回來。')}</p>`;
    // Plan 9 (R1–R4): an action per drifting member, each with its chance (after R3 repeats and R4 crowding) and its cost; the answer comes at once
    const left = RETAIN.checkin.perDay - (A.deskMsgs || 0), pc = (p) => Math.round(100 * p) + '%';
    const KIND = { checkin: tx('check-in message', '關心訊息'), taster: tx('PT taster', '教練體驗課'), voucher: tx('voucher', '折價券'), winback: tx('win-back SMS', '回流簡訊') };
    const btn = (kind, m, label, extra) => { const p = retainChance(m, kind), off = !p || (kind === 'checkin' && left <= 0) || !!closing || A.closed;
      return `<button data-retain="${kind}:${m.id}"${off ? ' disabled' : ''}>${label} · ${pc(p)} ${tx('chance', '機率')}${extra ? ' · ' + extra : ''}</button>`; };
    const status = (m) => m.protect && m.protect.until > M.dayI ? `<span class="bench" style="color:var(--accent)">${tx(`${KIND[m.protect.kind]} worked · half as likely to leave for ${m.protect.until - M.dayI} more days`, `${KIND[m.protect.kind]}成功 · 流失率減半，還有 ${m.protect.until - M.dayI} 天`)}</span>` : '';
    const rows = atRisk(5).map(({ m, h }) => { const t = riskTag(m, M.dayI), month = 1 - Math.pow(1 - h, PT.daysPerMonth);
      return `<tr data-k="risk" data-h="${h}"><td>${trName(m.name)}<span class="tag">${t.tag}</span><span class="bench" style="color:var(--muted)">${t.fact}</span>${status(m)}</td><td class="n">${(100 * month).toFixed(0)}%</td></tr>
        <tr class="sub"><td colspan="2"><div class="ract">${btn('checkin', m, tx('Message', '傳訊息'))}${btn('taster', m, tx('PT taster', '體驗課'), money(RETAIN.taster.cost))}${btn('voucher', m, tx('Voucher', '折價券'), tx(`up to ${money(RETAIN.voucher.off)}`, `最多 ${money(RETAIN.voucher.off)}`))}</div>
        ${t.kind === 'crowding' ? `<div class="ract"><button data-build="1">${tx('More floor or equipment is the real fix → Build a gym', '真正的解法是更大的空間或更多器材 → 設計健身房')}</button></div>` : ''}</td></tr>`; }).join('');
    const lapsed = M.lapsed.slice().sort((p, q) => q.lapsedDay - p.lapsedDay || p.id - q.id).slice(0, 5).map(m => `<tr data-k="lapsed"><td>${trName(m.name)}<span class="bench" style="color:var(--muted)">${tx(`lapsed ${Math.max(0, M.dayI - m.lapsedDay)} days ago`, `${Math.max(0, M.dayI - m.lapsedDay)} 天前流失`)}</span></td>
        <td class="n"><div class="ract">${btn('winback', m, tx('Win back', '挽回'), money(RETAIN.winback.cost))}</div></td></tr>`).join('');
    const msg = BOOKS.retainMsg ? `<p class="note" data-k="retainMsg" style="color:${BOOKS.retainMsg.ok ? 'var(--accent)' : 'var(--warn)'}">${BOOKS.retainMsg.text}</p>` : '';
    const risk = `${msg}<p class="note" data-k="deskLeft">${tx(`Check-in messages left today: ${left} of ${RETAIN.checkin.perDay} (desk time)`, `今天還能傳 ${left} / ${RETAIN.checkin.perDay} 則關心訊息（櫃檯時間）`)}</p>
      <table><tr class="grp0"><td>${tx('Member', '會員')}</td><td class="n">${tx('May leave / month', '每月流失機率')}</td></tr>${rows}</table>
      <p class="note">${tx('Each action works with the chance shown; if it works, that member is half as likely to leave for a while (message 2 months, taster 3, voucher 1). A second action within 30 days has half the chance; crowded members answer messages half as often. Do nothing and they leave at the usual rate.', '每個行動依顯示的機率成功；成功後該會員的流失率減半一段時間（訊息 2 個月、體驗課 3 個月、折價券 1 個月）。30 天內再次行動機率減半；覺得太擠的會員回訊息的機率減半。什麼都不做就照一般流失。')}</p>`;
    const wb = lapsed ? bkSection(tx('Recently lapsed', '最近流失'), `<table>${lapsed}</table>`) : '';
    return bkSection(tx('Register', '會員名冊'), reg) + bkSection(tx('Who\'s at risk', '可能流失的會員'), risk) + wb;
  },
  wire(body) {
    body.querySelectorAll('button[data-retain]').forEach(b => b.addEventListener('click', () => {
      const [kind, id] = b.dataset.retain.split(':'), m = M.pool.concat(M.lapsed).find(x => x.id === +id); if (!m) return;
      const r = retainAct(m, kind), n = trName(m.name);
      const why = { desk: tx('The desk has no time for more messages today.', '櫃檯今天沒有時間再傳訊息了。'), closing: tx('Wait until the early close has finished.', '請等提前結算完成。'), closedDay: tx('The gym is closed today: nobody is at the desk.', '今天休館：櫃檯沒有人。') };
      BOOKS.retainMsg = r.refused ? { ok: false, text: why[r.refused] || tx('Not possible right now.', '現在無法進行。') } : { ok: r.ok, text: r.ok ? tx(`${n} said yes (${Math.round(100 * r.chance)}% chance)${r.pack ? ' and bought a PT pack' : ''}.`, `${n} 答應了（機率 ${Math.round(100 * r.chance)}%）${r.pack ? '，還買了教練課方案' : ''}。`) : tx(`${n}: no answer (${Math.round(100 * r.chance)}% chance).`, `${n}：沒有回應（機率 ${Math.round(100 * r.chance)}%）。`) };
      updateBooks(true); }));
    body.querySelectorAll('button[data-build]').forEach(b => b.addEventListener('click', openBuildFromBooks));
  }
};
// ---------------------------------------------------------------- Pricing: a price list with staged changes, published for tomorrow morning (A6, Call 1)
const PRICE_STEPS = [['priceOff', 0.05, 0.8, 2.5, 'Off-peak price per minute', v => '$' + v.toFixed(2)], ['pricePeak', 0.05, 0.8, 2.5, 'Peak price per minute (Mon–Fri 18–22)', v => '$' + v.toFixed(2)],
  ['priceCap', 10, 100, 300, 'Cap per visit', v => '$' + v], ['rentP', 10, 150, 600, 'Rental price per 90 min', v => '$' + v],
  ['monthlyPrice', 50, 300, 3000, ['Monthly pass price', '月費'], v => '$' + v.toLocaleString('en-US')], ['ptSession', 50, 1000, 3000, ['One coaching session (pack of 8)', '教練課一堂（8 堂方案）'], v => '$' + v.toLocaleString('en-US')]];
const livePrices = () => ({ priceOff: S.priceOff, pricePeak: S.pricePeak, priceCap: S.priceCap, rentP: M ? M.cfg.rentP : S.rentP, allowOutside: S.allowOutside, ptSession: S.ptSession, perMinOn: S.perMinOn, monthlyOn: S.monthlyOn, monthlyPrice: S.monthlyPrice });
BOOK_RENDER.Pricing = {
  html() {
    if (!BOOKS.stage) BOOKS.stage = { ...(PUBLISH || livePrices()) };
    const st = BOOKS.stage, live = livePrices(), r2 = (v) => Math.round(v * 100) / 100;
    const lab1 = (lab) => Array.isArray(lab) ? tx(lab[0], lab[1]) : tr(lab);
    const stepRow = (k, dim) => { const [, , , , lab, f] = PRICE_STEPS.find(x => x[0] === k); return `<tr${dim ? ' style="opacity:.4"' : ''}><td>${lab1(lab)}${r2(st[k]) !== r2(live[k]) ? `<span class="bench" style="color:var(--warn)">${tx('now', '目前')} ${f(live[k])}</span>` : ''}</td>
      <td><div class="step"><button data-f="${k}" data-d="-1" aria-label="−">−</button><b>${f(st[k])}</b><button data-f="${k}" data-d="1" aria-label="+">+</button></div></td></tr>`; };
    const togRow = (k, label) => `<tr><td><b>${label}</b>${st[k] !== live[k] ? `<span class="bench" style="color:var(--warn)">${tx('now', '目前')} ${tr(live[k] ? 'On' : 'Off')}</span>` : ''}</td><td><div class="step"><button data-t="${k}" class="${st[k] ? 'on' : ''}" style="min-width:120px">${tr(st[k] ? 'On' : 'Off')}</button></div></td></tr>`;
    // the pass against this gym's own members: who would take it at the staged prices, and from how many visits a month it pays off
    const prS = { off: st.priceOff, peak: st.pricePeak, cap: st.priceCap, perMinOn: st.perMinOn, monthlyOn: st.monthlyOn, monthly: st.monthlyPrice }, pool = M ? M.pool : [];
    const takers = pool.filter(m => wantsPass(m.vpu, m.id, prS)).length, even = Math.ceil(st.monthlyPrice / Math.max(1, payPerUseMonth(1, st.priceOff, st.pricePeak, st.priceCap)));
    const passNote = !st.monthlyOn ? `<p class="note">${tx('Off: everyone pays by the minute.', '未開放：所有人都計時付費。')}</p>`
      : `<p class="note" data-k="passShare">${st.perMinOn ? tx(`About ${takers} of your ${pool.length} members would take the pass. By the minute it pays off from ${even} visits a month, but people expect to come more than they do, so some who come less buy it too. Pass holders stop paying by the minute and come more often.`, `你的 ${pool.length} 位會員中，約 ${takers} 位會改用月費。照計時算，每月來 ${even} 次以上才划算；但大家總以為自己會更常來，所以來得較少的人也會買。月費會員不再計時付費，也會更常來。`)
        : tx(`Pass only: about ${takers} of your ${pool.length} members would buy it. The other ${pool.length - takers} stop coming within a week or so, and newcomers who would come too rarely do not join. By the minute it pays off from ${even} visits a month.`, `只收月費：你的 ${pool.length} 位會員中，約 ${takers} 位會買。其餘 ${pool.length - takers} 位大約一週內就不來了，來得太少的新客也不會加入。照計時算，每月來 ${even} 次以上才划算。`)}</p>`;
    const entry = `<table>${togRow('perMinOn', tx('Pay by the minute', '計時收費'))}${stepRow('priceOff', !st.perMinOn)}${stepRow('pricePeak', !st.perMinOn)}${stepRow('priceCap', !st.perMinOn)}
      ${togRow('monthlyOn', tx('Monthly pass (30 days, unlimited visits)', '月費（30 天不限次數）'))}${st.monthlyOn ? stepRow('monthlyPrice') : ''}</table>${passNote}`;
    const stPacks = ptPacks(st.ptSession), ptDelta = ptDemandMult(st.ptSession) / ptDemandMult(S.ptSession);
    const coaching = `<table>${stepRow('ptSession')}${stPacks.map((pk, i) => `<tr><td style="padding-left:14px;color:var(--muted)">${tx(`${pk.n} sessions`, `${pk.n} 堂`)}${pk.parts.length > 1 ? `<span class="bench" style="color:var(--muted)">${tx(`or ${pk.parts.length} instalments`, `可分 ${pk.parts.length} 期`)}</span>` : ''}</td><td class="n"${i === 0 ? ' data-k="pack8"' : ''}>${nt$(pk.price)}</td></tr>`).join('')}
      ${stepRow('rentP')}<tr><td>${tr('Allow outside coaches')}</td><td><div class="step"><button data-t="allowOutside" class="${st.allowOutside ? 'on' : ''}" style="min-width:120px">${tr(st.allowOutside ? 'On' : 'Off')}</button></div></td></tr></table>
      <p class="note"${Math.abs(ptDelta - 1) > 1e-9 ? ' data-k="ptNote"' : ''}>${Math.abs(ptDelta - 1) > 1e-9 ? tx(`At this price about ${Math.round(Math.abs(ptDelta - 1) * 100)}% ${ptDelta < 1 ? 'fewer' : 'more'} members start coaching. Packs already sold keep their price; coaches keep their share of each session.`, `這個價格下，開始上教練課的會員約${ptDelta < 1 ? '少' : '多'} ${Math.round(Math.abs(ptDelta - 1) * 100)}%。已售出的方案維持原價；教練照比例分潤。`) : tx('Dearer sessions earn more each but fewer members start; cheaper ones sell more.', '單堂越貴賺越多，但開始上課的人越少；便宜則賣得多。')}</p>`;
    const pv = pricePreview({ off: S.priceOff, peak: S.pricePeak, cap: S.priceCap }, { off: st.priceOff, peak: st.pricePeak, cap: st.priceCap });
    const pc = (x) => (x >= 1 ? '+' : '−') + Math.abs(100 * (x - 1)).toFixed(1) + '%';
    // a heavy user (12 visits of 90 min a month) against a big-box monthly membership: always shown; a warning when this change makes it worse and above that level
    const nowHeavy = pricePreview({ off: S.priceOff, peak: S.pricePeak, cap: S.priceCap }, { off: S.priceOff, peak: S.pricePeak, cap: S.priceCap }).heavyMonth;
    const worse = pv.heavyMonth > nowHeavy && pv.heavyMonth > BENCH.bigBoxMonthly;
    const warn = `<p class="note${worse ? ' warn' : ''}"${worse ? ' data-k="heavyWarn"' : ''}>${tx(`A heavy user (12 visits of 90 min) would pay ${nt$(pv.heavyMonth)} a month (now ${nt$(nowHeavy)}); a big-box membership is about ${nt$(BENCH.bigBoxMonthly)}.`, `常客（每月 12 次、每次 90 分）每月要付 ${nt$(pv.heavyMonth)}（目前 ${nt$(nowHeavy)}）；大型連鎖月費約 ${nt$(BENCH.bigBoxMonthly)}。`)}${worse ? tx(' Your heaviest users may switch.', '最常來的會員可能會轉去連鎖健身房。') : ''}</p>`;
    const preview = `<table><tr><td>${tx('Visits', '到訪人次')}</td><td class="n">${pc(pv.visits)}</td></tr><tr><td>${tx('Fee per visit (70 min)', '每次入場費（70 分）')}</td><td class="n">${pc(pv.feePerVisit)}</td></tr>
      <tr><td>${tx('Visit takings', '入場費收入')}</td><td class="n">${pc(pv.takings)}</td></tr></table><p class="note">${tx('An estimate for the members you already have; people thinking of joining react about twice as much.', '這是對現有會員的估計；還在考慮加入的人反應大約是兩倍。')}</p>${warn}`;
    const pub = PUBLISH ? `<p class="note" style="color:var(--accent)" data-k="published">${tx('Published: the new price list applies from tomorrow morning.', '已公告：新價目從明天早上開始。')}</p>` : '';
    const nextMonth = (st.allowOutside !== (M ? M.cfg.allowOutside : S.allowOutside) || S.allowOutside !== (M ? M.cfg.allowOutside : S.allowOutside)) ? `<p class="note warn" data-k="nextMonthNote">${tx('Who may rent the floor changes from next month.', '外部教練能否租場地，從下個月起生效。')}</p>` : '';
    const actions = `<div class="row" style="margin-top:6px"><button data-k="publish" class="btn-go on">${tx('Publish new prices', '公告新價格')}</button><button data-k="reset">${tx('Undo my edits', '取消尚未公告的變更')}</button></div>${pub}${PUBLISH ? `<div class="row"><button data-k="withdraw">${BOOKS.withdrawArm && performance.now() < BOOKS.withdrawArm ? tx('Sure? Tap again to withdraw', '確定？再點一次撤回') : tx('Withdraw the published list', '撤回已公告的價目')}</button></div>` : ''}${nextMonth}`;   /* judge round 4: Undo no longer cancels a list that was already published without saying so */
    return bkSection(tx('Entry', '入場'), entry, tx('applies from tomorrow', '明天起生效')) + bkSection(tx('Coaching', '教練課'), coaching + actions)
      + bkSection(tx('What the minute prices do', '計時價格的影響'), preview);
  },
  wire(body) {
    body.querySelectorAll('button[data-f]').forEach(b => b.addEventListener('click', () => {
      const [k, step, lo, hi] = PRICE_STEPS.find(x => x[0] === b.dataset.f); const v = BOOKS.stage[k] + step * +b.dataset.d;
      const c = Math.min(hi, Math.max(lo, v)); BOOKS.stage[k] = step < 1 ? Math.round(c / step) * step : c;   /* whole-dollar steps keep their starting point ($1,690 + $50) */ updateBooks(true); }));
    body.querySelectorAll('button[data-t]').forEach(b => b.addEventListener('click', () => { const k = b.dataset.t, st = BOOKS.stage; st[k] = !st[k];
      if (!st.perMinOn && !st.monthlyOn) st[k === 'perMinOn' ? 'monthlyOn' : 'perMinOn'] = true;   /* the gym always sells entry one way or the other */
      updateBooks(true); }));
    const pubB = body.querySelector('[data-k="publish"]'); if (pubB) pubB.addEventListener('click', () => { publishPrices(BOOKS.stage); showToast(tx('New prices from tomorrow morning', '新價格明天早上生效')); updateBooks(true); });
    const rs = body.querySelector('[data-k="reset"]'); if (rs) rs.addEventListener('click', () => { BOOKS.stage = null; BOOKS.withdrawArm = 0; updateBooks(true); });   /* back to the published list if there is one, else to the prices in force */
    const wd = body.querySelector('[data-k="withdraw"]'); if (wd) wd.addEventListener('click', () => { if (BOOKS.withdrawArm && performance.now() < BOOKS.withdrawArm) { PUBLISH = null; BOOKS.stage = null; BOOKS.withdrawArm = 0; showToast(tx('Withdrawn: prices stay as they are', '已撤回：價格維持現狀')); } else BOOKS.withdrawArm = performance.now() + 5000; updateBooks(true); });
  }
};
// ---------------------------------------------------------------- Staff and Facility (minimal in phase 1): the existing levers, with context
function bkSliderGroup(body, title, note) { const g = el('section', { class: 'grp' }); g.appendChild(el('h2', {}, `<span>${title}</span>${note ? `<span class="pend">${note}</span>` : ''}`)); body.appendChild(g); return g; }
BOOK_RENDER.Staff = {
  build(body) {
    const g = bkSliderGroup(body, tx('Roster', '人力'), tx('applies at once', '立即生效'));   /* owner 2026-11-15: hire or let people go */
    const R = [['deskFT', tx('Desk staff, full-time', '櫃檯正職'), 1, 6, 1, (v) => v], ['deskPTh', tx('Desk staff, part-time hours a week', '櫃檯兼職每週時數'), 0, 160, 10, (v) => tx(`${v} h`, `${v} 小時`)], ['coaches', tx('In-house coaches', '駐館教練'), 0, 10, 1, (v) => v], ['cleaners', tx('Cleaners', '清潔人員'), 0, 3, 1, (v) => v]];   /* judge round 4: someone always sits at the desk, so full-time desk staff stop at 1; what cleaners do is said below */
    const t = el('table', {}, R.map(([k, lab]) => `<tr><td>${lab}</td><td><div class="step"><button data-roster="${k}" data-d="-1" aria-label="−">−</button><b data-rv="${k}"></b><button data-roster="${k}" data-d="1" aria-label="+">+</button></div></td></tr>`).join('')); g.appendChild(t);
    t.querySelectorAll('button[data-roster]').forEach(b => b.addEventListener('click', () => { const [k, , lo, hi, st] = R.find(r => r[0] === b.dataset.roster); S[k] = clamp(S[k] + st * +b.dataset.d, lo, hi); S.staff = rosterCost(S); if (A) A.pnl = computePnl(); updateBooks(true); }));
    g.dataset.fmt = '1'; BOOKS.rosterFmt = R;
    g.appendChild(el('div', { id: 'bkStaffLines' }));
    const h = bkSliderGroup(body, tx('Opening hours', '營業時間'));
    h.appendChild(el('table', {}, `<tr><td>${tx('Mon–Fri', '週一至五')}</td><td class="n">07:00–24:00</td></tr><tr><td>${tx('Sat–Sun', '週六日')}</td><td class="n">08:00–24:00</td></tr>`));
    h.appendChild(el('p', { class: 'note' }, tx('The gym is open 117 hours a week.', '每週營業 117 小時。')));
  },
  update() {
    const box = document.getElementById('bkStaffLines'); if (!box) return;
    for (const [k, , , , , fmt] of BOOKS.rosterFmt || []) { const b = document.querySelector(`#bkBody [data-rv="${k}"]`); if (b) b.textContent = fmt(S[k]); }
    const it = rosterLines(S), lab = { manager: tx('Store manager', '店長'), deskFT: tx(`Desk staff, full-time (${S.deskFT})`, `櫃檯正職（${S.deskFT} 人）`), deskPT: tx(`Desk staff, part-time (${S.deskPTh} h a week)`, `櫃檯兼職（每週 ${S.deskPTh} 小時）`), coaches: tx(`Coaches' retainers (${S.coaches})`, `教練底薪（${S.coaches} 人）`), cleaners: tx(`Cleaners (${S.cleaners})`, `清潔人員（${S.cleaners} 人）`), statutory: tx('Labour and health insurance, pension', '勞健保與勞退'), bonusLeave: tx('Year-end bonus and leave cover', '年終與休假代班') };
    const h = `<table>${Object.keys(it).filter(k => (k !== 'cleaners' || S.cleaners) && (k !== 'coaches' || S.coaches)).map(k => `<tr><td>${lab[k]}</td><td class="n">${nt$(it[k])}</td></tr>`).join('')}<tr class="sum"><td>${tx('A month', '每月')}</td><td class="n">${nt$(S.staff)}</td></tr></table>
      <p class="note">${(() => { const need = Math.max(1, Math.round(2 * S.peak / DEMAND.peak)), ret = money(ROSTER.coach), sh = 100 - pnlCosts().gymShare;   /* balance 2026-11-20: a coach costs a retainer; the crowd keeps only so many busy */
        return tx(`Each coach is paid a ${ret} retainer here, plus ${sh}% of the PT they deliver. ${S.coaches} coach${S.coaches === 1 ? '' : 'es'} can carry up to ${ptCap()} PT clients. A gym this busy keeps about ${need} coach${need === 1 ? '' : 'es'} in work: fewer sell less PT, more sell only a little extra.`, `每位教練在這裡領底薪 ${ret}，另加教練課 ${sh}% 的分潤。${S.coaches} 位教練最多可帶 ${ptCap()} 位學員。這個人流大約養得起 ${need} 位教練：少了賣得少，多了也只多賣一點。`); })()}</p>
      <p class="note${deskCover(S, S.area) < 1 ? ' warn' : ''}" data-k="staffEffect">${(() => { const need = deskHours(defaultRoster(S.area)), h = deskHours(S), pc = (v) => Math.round(Math.abs(v - 1) * 100), e = deskEffect(deskCover(S, S.area)), mr = { deskFT: 1, deskPTh: 0, coaches: 0, cleaners: 0 }, min = rosterCost(mr), me = deskEffect(deskCover(mr, S.area)), top = Math.round(need * DESK.max);   /* rules round 2026-11-21: the desk signs people up and looks after them; hours against what this floor needs */
        const en = h < need ? `Your desk covers ${h} of the ${need} hours a week this floor needs. Nobody is free to show people round: ${pc(e.join)}% fewer sign-ups, and members are ${pc(e.churn)}% more likely to leave.` : h > need ? `Your desk covers ${h} hours a week; this floor needs ${need}. The extra hours bring ${pc(e.join)}% more sign-ups and members are ${pc(e.churn)}% less likely to leave (nothing more past ${top} hours).` : `Your desk covers the ${need} hours a week this floor needs. Fewer hours cost sign-ups and members; more hours help half as much.`;
        const zh = h < need ? `這個坪數每週需要 ${need} 小時的櫃檯人力，目前只有 ${h} 小時。沒有人有空帶人參觀：入會少 ${pc(e.join)}%，會員退會的機率多 ${pc(e.churn)}%。` : h > need ? `櫃檯每週 ${h} 小時；這個坪數需要 ${need} 小時。多出來的時數讓入會多 ${pc(e.join)}%，會員退會的機率少 ${pc(e.churn)}%（超過 ${top} 小時就沒有更多效果）。` : `櫃檯人力剛好是這個坪數每週需要的 ${need} 小時。時數減少會少掉入會和會員；增加時數的效果只有一半。`;
        return tx(`${en} The smallest desk (the manager and one full-timer, no part-time hours) costs ${money(min)} a month before coaches: ${pc(me.join)}% fewer sign-ups, members ${pc(me.churn)}% more likely to leave.`, `${zh}最精簡的櫃檯（店長加一位正職、沒有兼職時數）不含教練每月 ${money(min)}：入會少 ${pc(me.join)}%，退會機率多 ${pc(me.churn)}%。`); })()}</p>
      <p class="note${grubbyNow() > 0 ? ' warn' : ''}" data-k="cleanerEffect">${(() => { const wage = money(rosterCost({ ...S, cleaners: (S.cleaners || 0) + 1 }) - rosterCost(S)), v = Math.round(visitsLately()), cap = cleanCap(S.cleaners), g = grubbyNow(), more = Math.round(100 * CLEAN.churn * g), less = Math.round(100 * CLEAN.join * g);   /* rules round 2026-11-21: a hall that outgrows its cleaning loses members; the receptionist's limit and each cleaner's are said */
        const en = g > 0 ? `That is more than your team can keep clean: ${less}% fewer sign-ups and members are ${more}% more likely to leave until you hire a cleaner.` : v > cap - CLEAN.each && S.cleaners ? `Your team keeps up. With one cleaner fewer it would not.` : `Your team keeps up, so a cleaner pays off only once visits pass ${cap} a day.`;
        const zh = g > 0 ? `已經超過現有人手能維持乾淨的量：在請清潔人員之前，入會少 ${less}%，會員退會的機率多 ${more}%。` : v > cap - CLEAN.each && S.cleaners ? `目前人手夠。少一位清潔人員就不夠了。` : `目前人手夠，每天超過 ${cap} 人次再請清潔人員才划算。`;
        return tx(`The receptionist keeps the hall clean up to ${CLEAN.desk} visits a day between check-ins; each cleaner (${wage} a month) handles ${CLEAN.each} more, and also strips bars left loaded and puts stray dumbbells back. Lately you have about ${v} visits a day and your team handles ${cap}. ${en} The outsourced cleaning bill is paid either way.`, `櫃檯人員在報到的空檔可以維持每天 ${CLEAN.desk} 人次以內的整潔；每位清潔人員（每月 ${wage}）可以多應付 ${CLEAN.each} 人次，也會卸下沒歸位的槓片、把亂放的啞鈴放回去。最近每天大約 ${v} 人次，現有人手可應付 ${cap} 人次。${zh}外包清潔費不管有沒有請人都要付。`); })()}</p>`;
    if (box.dataset.h !== h) { box.dataset.h = h; box.innerHTML = h; }
  }
};
const FIRE = [[150, 'indoor fire hydrants', '室內消防栓'], [300, 'fire alarm and emergency broadcast', '火警自動警報與緊急廣播'], [500, 'smoke exhaust', '排煙設備'], [1000, 'sprinklers', '自動撒水設備']];
BOOK_RENDER.Facility = {
  build(body) {
    const g = bkSliderGroup(body, tx('Premises', '場地'), tx('applies at once', '立即生效'));
    if (S.hallW) g.appendChild(el('p', { class: 'note' }, tx(`Floor area is set by your build: ${S.hallW} × ${S.hallD} cells.`, `面積由你的設計決定：${S.hallW} × ${S.hallD} 格。`)));
    else slider(g, 'area', 'Floor area', 90, 150, 5, v => v + ' 坪');
    { const adv = el('details', { class: 'adv', id: 'bkAdv' }); adv.appendChild(el('summary', {}, tx('Advanced', '進階選項'))); adv.open = advOpen();   /* judge round 4: the rent dial is a what-if, kept with the other dials behind Advanced (one remembered state) */
      adv.addEventListener('toggle', () => { ADV.open = adv.open; try { localStorage.setItem('gymsim.adv', adv.open ? '1' : '0'); } catch (e) {} const pa = document.getElementById('advBox'); if (pa) pa.open = adv.open; });
      slider(adv, 'rentRate', 'Rent per 坪', 800, 2400, 50, v => money(v)); g.appendChild(adv); }
    g.appendChild(el('div', { id: 'bkFacLines' }));
  },
  update() {
    const box = document.getElementById('bkFacLines'); if (!box) return;
    const m2 = S.area * 3.3058, rent = S.area * S.rentRate, mg = S.area * COSTS.mgmtPerPing;
    const fire = FIRE.map(([lim, en, z]) => `<tr><td>${tx(en, z)}<span class="bench" style="color:var(--muted)">${tx(`above ${lim} m²`, `超過 ${lim} m²`)}</span></td><td class="n">${m2 > lim ? tx('required', '必須') : '–'}</td></tr>`).join('');
    const h = `<table><tr><td>${tx('Floor', '面積')}</td><td class="n">${S.area} 坪 · ${Math.round(m2)} m²</td></tr><tr><td>${tx('Rent a month', '每月租金')}</td><td class="n">${nt$(rent)}</td></tr><tr><td>${tx('Management fee a month', '每月管理費')}</td><td class="n">${nt$(mg)}</td></tr></table>
      <p class="note">${tx('Rent can go up when the lease is renewed: at a full, established gym of about 115 坪, 25% more rent takes about $32,000 a month off the result.', '續約時租金可能調漲：以 115 坪左右、客滿且穩定的健身房來說，租金漲 25% 每月結果會少約 $32,000。')}</p>
      <section class="grp" style="margin-top:8px"><h2><span>${tx('Fire code for this floor', '此面積的消防規定')}</span></h2><table>${fire}</table></section>`;
    if (box.dataset.h !== h) { box.dataset.h = h; box.innerHTML = h; }
  }
};
// ---------------------------------------------------------------- Bank: own money and the loan, kept apart (A2), and when cash ran out (B2)
function cashOutText() { const o = BIZ && BIZ.cashOutAt; if (!o) return ''; const mi = MONTH_NAMES.indexOf(o.month) + 1; return tx(`Cash ran out on ${o.day} ${o.month} ${o.year}`, `${o.year} 年 ${mi} 月 ${o.day} 日現金用完`); }
BOOK_RENDER.Bank = {
  html() {
    if (!BIZ) return '';
    const cash = liveCash(), rateI = BIZ.balance * BIZ.rate / 1200, prin = Math.max(0, Math.min(BIZ.balance, BIZ.payment - rateI));
    const banner = BIZ.cashOutAt ? `<p class="note warn" data-k="cashOut">${cashOutText()}. ${tx('The gym keeps trading in the red. In real life the bank would want more security, or you would put in more of your own money.', '健身房仍在虧損中營業。現實中銀行會要求更多擔保，或你得再拿出自有資金。')}</p>` : '';
    const bal = `<table><tr class="sum"><td>${tx('Cash in the bank now', '目前銀行存款')}</td><td class="n" data-k="cash">${ntn(cash)}</td></tr></table>
      <p class="note">${tx('Today\'s money in and costs are included as they happen. VAT, coach payouts and every fixed cost are paid out of this.', '今天的收入與成本即時計入。營業稅、教練分潤與所有固定成本都從這裡付出。')}</p>`;
    const open = `<table><tr><td>${tx('Your own money (equity)', '自有資金（股本）')}</td><td class="n" data-k="own">${ntn(BIZ.own)}</td></tr>
      <tr><td>${tx('Bank loan', '銀行貸款')}</td><td class="n" data-k="loan">${ntn(BIZ.loan)}</td></tr>
      ${BUILT ? `<tr><td>${tx('Fit-out (floor, air con, lights, washrooms, permit)', '裝修（地板、空調、燈具、浴廁、許可）')}</td><td class="n" data-k="fitOut">${ntn(-BUILT.fitOut)}</td></tr>
      <tr><td>${tx('Equipment', '器材')}</td><td class="n" data-k="equip">${ntn(-BUILT.equipment)}</td></tr>
      <tr><td>${tx('Rent deposit (refundable)', '租金押金（可退）')}</td><td class="n" data-k="deposit">${ntn(-BIZ.deposit)}</td></tr>` : `<tr><td>${tx('Build and equipment (capex)', '裝修與器材（資本支出）')}</td><td class="n">${ntn(-COSTS.capex)}</td></tr>`}
      <tr class="sum"><td>${tx('Cash on opening day', '開幕日現金')}</td><td class="n" data-k="openCash">${ntn(BIZ.openCash)}</td></tr></table>${BIZ.eqBought || BIZ.eqSold ? `<table><tr><td>${tx('Equipment bought since opening', '開幕後購買器材')}</td><td class="n" data-k="eqBought">${ntn(-(BIZ.eqBought || 0))}</td></tr><tr><td>${tx('Equipment sold since opening', '開幕後出售器材')}</td><td class="n" data-k="eqSold">${ntn(BIZ.eqSold || 0)}</td></tr></table>` : ''}
      <div style="display:flex;height:10px;margin:6px 0 2px;border:1px solid var(--edge)"><div style="flex:${BIZ.own};background:var(--accent)"></div><div style="flex:${BIZ.loan};background:var(--hi)"></div></div>
      <p class="note">${tx('Yellow is yours to lose; blue must be repaid whatever happens.', '黃色是你自己的錢，虧了就沒了；藍色不論如何都要還。')}</p>`;
    const loan = `<table><tr><td>${tx('Still owed to the bank', '尚欠銀行')}</td><td class="n" data-k="loanBal">${ntn(BIZ.balance)}</td></tr>
      <tr><td>${tx('Rate and term', '利率與年限')}</td><td class="n">${BIZ.rate.toFixed(1)}% · ${tx(`${BIZ.years} years`, `${BIZ.years} 年`)}</td></tr>
      <tr><td>${tx('Monthly instalment', '每月還款')}</td><td class="n" data-k="payment">${ntn(BIZ.payment)}</td></tr>
      <tr class="sub"><td>${tx('of which interest this month (a cost: it comes off profit)', '其中本月利息（是費用，會減少獲利）')}</td><td class="n" data-k="interestM">${ntn(rateI)}</td></tr>
      <tr class="sub"><td>${tx('of which repays the loan (cash, not a cost)', '其中償還本金（現金流出，不是費用）')}</td><td class="n">${ntn(prin)}</td></tr></table>
      <p class="note">${tx('The instalment and income tax leave the bank when the month closes.', '每月還款與所得稅在月底結帳時扣款。')}</p>`;
    const p = A.pnl || {}, mIn = BIZ.mIn + (p.cashIn || 0), mOut = BIZ.mOut + ((p.cashIn || 0) - dayCash(A.pnl));
    const month = `<table><tr><td>${tx('Cash in this month', '本月現金流入')}</td><td class="n">${ntn(mIn)}</td></tr><tr><td>${tx('Cash out this month', '本月現金流出')}</td><td class="n">${ntn(-mOut)}</td></tr></table>`;
    return banner + bkSection(tx('Bank balance', '銀行餘額'), bal) + bkSection(tx('Where the money came from', '資金從哪裡來'), open) + bkSection(tx('The loan', '貸款'), loan) + bkSection(tx('This month', '本月'), month);
  }
};
// ---------------------------------------------------------------- the price board on the desk follows the price list in force (Plan 7b)
function priceBoardKey() { return [S.priceOff, S.pricePeak, S.priceCap, M ? M.cfg.rentP : S.rentP, S.ptSession, S.monthlyOn, S.perMinOn, S.monthlyPrice].join('|'); }
function drawPriceBoard(force) {
  const key = priceBoardKey(); if (!force && key === PRICEBOARD.drawn) return; PRICEBOARD.drawn = key;
  const g = PRICEBOARD.canvas.getContext('2d'), W = 256, H = 160, f2 = (v) => v.toFixed(2), rent = M ? M.cfg.rentP : S.rentP;
  const put = (t, x, y, px, col, bold, maxW) => { g.fillStyle = col; let k = px; do { g.font = (bold ? '700 ' : '') + k + 'px Digits, Silkscreen, monospace'; } while (g.measureText(t).width > maxW && --k > 6); g.fillText(t, x, y); };   /* shrink to fit its column */
  g.fillStyle = '#10131c'; g.fillRect(0, 0, W, H); g.fillStyle = '#dfe03a'; g.fillRect(0, 0, W, 26);
  g.textBaseline = 'middle'; put('PRICE LIST', 8, 14, 16, '#10131c', true, 150); g.textAlign = 'right'; put('價目表', W - 8, 14, 16, '#10131c', true, 80); g.textAlign = 'left';
  const row = (x, y, label, price) => { put(label, x, y, 10, '#959bab', false, 116); put(price, x, y + 17, 18, '#dfe03a', true, 116); };
  const pass = '$' + S.monthlyPrice.toLocaleString('en-US');
  if (S.perMinOn) { row(8, 40, 'OFF-PEAK / MIN', '$' + f2(S.priceOff)); row(8, 80, 'PEAK WKDAY 18-22', '$' + f2(S.pricePeak)); if (S.monthlyOn) row(8, 120, 'MONTHLY PASS', pass); else row(8, 120, 'CAP PER VISIT', '$' + S.priceCap); }
  else row(8, 40, 'MONTHLY PASS', pass);
  row(136, 40, 'RENTAL / 90 MIN', '$' + rent); put('PT PACKS', 136, 80, 10, '#959bab', false, 116);
  ptPacksNow().forEach((p, i) => put(`${p.n} · ${money(p.price)}`, 136, 97 + i * 19, 15, '#f2f1ea', true, 116));
  PRICEBOARD.tex.needsUpdate = true;
}
