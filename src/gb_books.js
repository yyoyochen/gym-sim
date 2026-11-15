// ================================================================ front-desk books: a full-view binder opened at the reception (Plan 6)
// Tap the receptionist, the desk or its monitor (or the live takings line) to open it. While it is open the sim runs at 1x;
// closing restores the previous speed unless the learner picked another one meanwhile (D3, Call 11). Paused stays paused.
const BOOKS = { open: false, tab: 'Today', period: 'today', prevSpeed: null, shown: '' };
const BOOK_TABS = ['Today', 'Books', 'Bank', 'Members', 'Pricing', 'Staff', 'Facility'];
const booksEl = () => document.getElementById('books');
const nt$ = (v) => money(v);   /* Plan 8b: $ with every digit */
const ntn = (v) => `<span data-v="${Math.round(v || 0)}">${money(v || 0)}</span>`;   /* every digit; the figure also rides along for checks */
function speedToPos(v) { return Math.round(100 * Math.log(Math.max(1, v)) / Math.log(600)); }
function syncSpeed() { const w = W.w_speed; if (w) { w.inp.value = speedToPos(S.speed); w.out.textContent = w.fmt(S.speed); } }
function booksSeen() { try { return localStorage.getItem('gymsim.booksSeen') === '1'; } catch (e) { return false; } }
function openBooks(tab) {
  if (!A || (typeof BUILD !== 'undefined' && BUILD.on)) return;
  BOOKS.retainMsg = null;   /* the last retention answer is shown until the books close */   /* not over the builder: the books can move the day on */
  if (!BOOKS.open) { BOOKS.prevSpeed = S.speed; S.speed = 1; syncSpeed(); }
  BOOKS.open = true; if (tab) BOOKS.tab = tab;
  try { localStorage.setItem('gymsim.booksSeen', '1'); } catch (e) {}
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
  b.innerHTML = `<header class="bkh"><div class="bkt"><h2>${tx('Front desk · P&L', '櫃檯 · 損益表')}</h2><div class="bks" id="bkWhen"></div></div>
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
function liveLineText() { const p = A && A.pnl; return tx(`Today ${nt$(p && p.takings)} · ${(A && A.checkins) || 0} check-ins`, `今日 ${nt$(p && p.takings)} · 進場 ${(A && A.checkins) || 0} 人`); }
function updateLiveLine() { const out = !!(BIZ && BIZ.cashOutAt); setText('liveLine', liveLineText() + (out ? tx(' · cash ran out', ' · 現金用完') : '')); const ll = document.getElementById('liveLine'); if (ll) ll.classList.toggle('out', out); }
function updateBooksHint(toScreen) {
  const h = document.getElementById('booksHint'); if (!h) return;
  const gc = document.getElementById('goalCard'), show = !!A && !BOOKS.open && !booksSeen() && !(typeof BUILD !== 'undefined' && BUILD.on) && !(gc && !gc.hidden);   /* not over the builder or the goal card (Plan 10) */ h.style.display = show ? '' : 'none'; if (!show) return;
  const p = toScreen({ x: DESK_C.x, y: 1.4, z: DESK_C.z }); h.style.left = Math.round(p[0]) + 'px'; h.style.top = Math.round(p[1]) + 'px';
  const t = tx('Tap the desk to open the P&L', '點櫃檯打開損益表'); if (h.dataset.t !== t) { h.dataset.t = t; h.querySelector('span').textContent = t; }
}
// ---------------------------------------------------------------- shared row helpers
const pctOf = (v, net) => net > 0.5 ? (100 * v / net).toFixed(1) + '%' : '–';
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
      <tr><td>${tx('New member cards (joining fee)', '新會員卡（入會費）')}${cnt(Math.round((p.cards || 0) / CHURN.card))}</td><td class="n" data-k="cards">${ntn(p.cards)}</td></tr>
      <tr><td>${tx('PT packs sold', '售出教練課方案')}${cnt(A.packs)}</td><td class="n" data-k="ptCash">${ntn(ptCash)}</td></tr>
      <tr><td>${tx('Floor rentals', '場地租借')}${cnt(A.rentN)}</td><td class="n" data-k="rentals">${ntn(p.rentals)}</td></tr>
      <tr class="sum"><td>${tx('In the till', '收銀合計')}</td><td class="n" data-k="takings">${ntn(p.takings)}</td></tr></table>
      <p class="note">${tx('The till shows cash. Whether today made money is in the P&L tab.', '收銀機只顯示現金。今天有沒有賺錢，要看「損益表」分頁。')}</p>`;
    const floor = `<table>
      <tr><td>${tx('Inside now', '館內人數')}</td><td class="n">${A.inside}</td></tr>
      <tr><td>${tx('Checked in today', '今日進場')}</td><td class="n">${A.checkins || 0}</td></tr>
      <tr><td>${tx('PT sessions delivered', '已上教練課')}</td><td class="n">${A.ptSessions || 0}</td></tr>
      <tr><td>${tx('Turned away at the door', '門口被擋下')}</td><td class="n">${A.balked || 0}</td></tr>
      <tr><td>${tx('Bad visits (long waits)', '不愉快的到訪（久候）')}</td><td class="n">${A.bad || 0}</td></tr></table>`
      + `<p class="note">${tx(`${A.checkins || 0} checked in · ${A.paidVisits || 0} have paid so far. Everyone pays by the minute on the way out, so the two meet at closing.`, `${A.checkins || 0} 人進場 · 目前 ${A.paidVisits || 0} 人已付款。每個人離場時按分鐘付費，打烊時兩個數字會相同。`)}</p>`;
    const closed = A.closed ? `<p class="note warn">${A.closedWhy === 'rearrange' ? (() => { const left = M.cal.slice(M.dayI + 1).filter(d => d.rearrange).length + (BIZ.closedLeft || 0); return tx(`Closed today for rearranging${left ? `: ${left} more day${left === 1 ? '' : 's'} after today` : '; it reopens tomorrow with the new layout'}. No sales, the fixed costs still run.`, `今日重新擺設休館${left ? `：之後還有 ${left} 天` : '，明天以新擺設開門'}。沒有營收，固定成本照付。`); })() : A.closedWhy === 'closure' ? tx('Closed today: no sales, the fixed costs still run.', '今日休館：沒有營收，固定成本照付。') : tx('Closed today for the typhoon: no sales, the fixed costs still run.', '颱風休館：沒有營收，固定成本照付。')}</p>` : '';
    const stamp = A.done ? `<div class="stamp">${tx('Day closed', '本日結帳')} · EBITDA ${nt$(p.ebitda)}</div>` : '';
    const cl = BOOKS.closed && BOOKS.closed.dayI === M.dayI ? `<p class="note" style="color:var(--accent)">${tx(`Closed early: ${BOOKS.closed.days} days · takings ${nt$(BOOKS.closed.takings)} · EBITDA ${nt$(BOOKS.closed.ebitda)}`, `提前結帳：${BOOKS.closed.days} 天 · 收入 ${nt$(BOOKS.closed.takings)} · EBITDA ${nt$(BOOKS.closed.ebitda)}`)}</p>` : '';
    const closeBtns = `<div class="row">${[['day', tx('Close the day', '結束今天')], ['week', tx('Close the week', '結束本週')], ['month', tx('Close the month', '結束本月')]].map(([k, l]) => `<button data-close="${k}">${l}</button>`).join('')}</div>`;
    return closed + stamp + cl + bkSection(tx('Till', '收銀'), till) + bkSection(tx('Floor', '場內'), floor) + bkSection(tx('Close early', '提前結帳'), closeBtns + `<p class="note">${tx('The days run without being shown; the P&L records every one of them.', '這些天會在背景跑完，損益表照樣記下每一天。')}</p>`);
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
function yearHtml() {
  const c = pnlCosts(), rows = [], tot = { net: 0, ebitda: 0, np: 0 }, share = (days, y, name) => days / daysInMonth(y, name);   /* review I2: a short first month takes its share of depreciation */
  BIZ.months.forEach((m, i) => { const np = belowEbitda(m.pnl.ebitda || 0, { ...c, depYear: (m.depYear != null ? m.depYear : c.depYear) * share(m.days, m.year, m.name) }, m.interest + (m.loss || 0)).netProfit; tot.net += m.pnl.net || 0; tot.ebitda += m.pnl.ebitda || 0; tot.np += np;
    rows.push(`<tr data-k="yr" data-arch="${i}" style="cursor:pointer"><td style="color:var(--accent)">${monthLabel(m.name, m.year)} ›</td><td class="n">${ntn(m.pnl.net)}</td><td class="n">${ntn(m.pnl.ebitda)}</td><td class="n">${ntn(np)}</td><td class="n">${cashM(m.cashEnd)}</td></tr>`); });
  const pm = projectMonth().total, f = share(M.cal.length, BIZ.year, M.cfg.month), np = belowEbitda(pm.ebitda, { ...c, depYear: c.depYear * f }, BIZ.balance * BIZ.rate / 1200 * f + (BIZ.mLoss || 0)).netProfit; tot.net += pm.net; tot.ebitda += pm.ebitda; tot.np += np;
  rows.push(`<tr data-k="yr" data-cur="1"><td>${monthLabel(M.cfg.month, BIZ.year)} <span class="tag">${tx('projected', '預估')}</span></td><td class="n">${ntn(pm.net)}</td><td class="n">${ntn(pm.ebitda)}</td><td class="n">${ntn(np)}</td><td class="n">${cashM(liveCash())}</td></tr>`);
  const head = `<tr class="grp0"><td>${tx('Month', '月份')}</td><td class="n">${tx('Net sales', '銷售淨額')}</td><td class="n">EBITDA</td><td class="n">${tx('Net profit', '淨利')}</td><td class="n">${tx('Cash', '現金')}</td></tr>`;
  const total = `<tr class="sum"><td>${tx('So far', '累計')}</td><td class="n">${ntn(tot.net)}</td><td class="n" data-k="yrEbitda">${ntn(tot.ebitda)}</td><td class="n">${ntn(tot.np)}</td><td class="n"></td></tr>`;
  return bkSection(tx('The business so far', '開業至今'), `<div style="overflow-x:auto"><table class="yr">${head}${rows.join('')}${total}</table></div><p class="note">${tx('Closed months as booked (loan interest and tax paid at month end); tap one for its full P&L. Cash is the bank balance at each month end, and now.', '已結帳月份依實際入帳（貸款利息與所得稅在月底支付）；點一個月份看完整損益表。現金為每月底與目前的銀行餘額。')}</p>`, '$');
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
    const per = BOOKS.period, arch = archOf(per), p = booksPeriod(per), c = pnlCosts(), net = p.net, it = itemiseFixed(p, c), d = booksDep(per);
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
    let rows = bkGroup(tx('Revenue', '營收'))
      + bkRow('entryOff', tx('Visit fees, off-peak', '入場費（離峰）'), p.entryOff, net)
      + bkRow('entryPeak', tx('Visit fees, peak (Mon–Fri 18–22)', '入場費（尖峰，週一至五 18–22）'), p.entryPeak, net)
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
    const FX = [['premises', tx('Premises', '場地'), [['rent', tx('Rent', '租金')], ['mgmt', tx('Management fee', '管理費')], ['elec', tx('Electricity', '電費')], ['water', tx('Water', '水費')]]],
      ['staff', tx('Staff', '人事'), [['manager', tx('Store manager', '店長')], ['deskFT', tx('Desk staff, full-time (2)', '櫃檯正職（2 人）')], ['deskPT', tx('Desk staff, part-time', '櫃檯兼職')], ['statutory', tx('Labour and health insurance, pension', '勞健保與勞退')], ['bonusLeave', tx('Year-end bonus and leave cover', '年終與休假代班')]]],
      ['floor', tx('Running the floor', '場館營運'), [['cleaning', tx('Cleaning (outsourced)', '清潔（外包）')], ['maintenance', tx('Maintenance and repairs', '維修保養')], ['itSecurity', tx('Internet, software, security', '網路、軟體、保全')], ['supplies', tx('Supplies and pest control', '耗材與除蟲')]]],
      ['compliance', tx('Compliance and admin', '法規與行政'), [['insurance', tx('Public liability insurance', '公共意外責任險')], ['fire', tx('Fire and safety inspections', '消防與公安申報')], ['music', tx('Music licence', '音樂授權')], ['bookkeeping', tx('Bookkeeping', '記帳')], ['aed', tx('AED upkeep', 'AED 維護')]]]];
    rows += bkGroup(tx('Fixed costs', '固定成本'));
    for (const [g, gl, lines] of FX) {
      let note = '';
      if (g === 'premises') note = tx(`Rent + management ${pctOf(occ, net)} of net sales; benchmark ${bp(...BENCH.occupancy)}`, `租金加管理費占銷售淨額 ${pctOf(occ, net)}；參考值 ${bp(...BENCH.occupancy)}`);
      if (g === 'staff') note = tx(`${pctOf(it.totals.staff, net)} of net sales (24% at base)`, `占銷售淨額 ${pctOf(it.totals.staff, net)}（基準 24%）`);
      rows += `<tr><td>${gl}${note ? `<span class="bench">${note}</span>` : ''}</td><td class="n">${ntn(-it.totals[g])}</td><td class="p">${pctOf(it.totals[g], net)}</td></tr>`;
      for (const [k, l] of lines) rows += `<tr class="sub"><td>${l}</td><td class="n" data-k="fx_${k}">${ntn(-it[g][k])}</td><td class="p"></td></tr>`;
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
        <tr><td>${tx('Revenue per 坪', '每坪營收')}<span class="bench">${tx('Plausible for a Taipei gym: $5–10K a month', '台北健身房合理範圍：每月 $5–10K')}</span></td><td class="n">${ntn(perPing)}</td></tr></table>`;
    }
    const cash = `<table>
      <tr><td>${tx('PT cash taken (packs sold)', '教練課現金（售出方案）')}</td><td class="n" data-k="ptCash">${ntn(ptCash)}</td></tr>
      <tr><td>${tx('PT earned (sessions delivered)', '教練課收入（已上課）')}</td><td class="n">${ntn(p.ptEarned)}</td></tr>
      <tr><td>${tx('Prepaid sessions still owed', '尚未上完的預收課程')}</td><td class="n" data-k="deferred">${ntn(A.deferred || 0)}</td></tr>
      <tr><td>${tx('Instalments still due', '尚未收的分期款')}</td><td class="n" data-k="ptDue">${ntn((M && M.ptDue) || 0)}</td></tr></table>
      <p class="note">${tx('Packs over $5K not billed per session need half the unused balance guaranteed (履約保證). Cash from a pack is owed until the sessions are delivered.', '超過 $5K 且非按次收費的方案，未使用餘額須有一半履約保證。方案收到的現金在上完課前都是欠學員的。')}</p>`;
    const sens = sensitivity({ ...MONTH_BASE, peak: S.peak, off: S.priceOff, pk: S.pricePeak, rentRate: S.rentRate, area: S.area, staff: S.staff / 1000 }, MONTH_RANGES).slice(0, 6);
    const st = `<p class="note">${tr('What moves profit most: monthly EBITDA with each input at its low or high value (parameter-book arithmetic, not simulated).')}</p><table data-k="sens">
      <tr class="grp0"><td></td><td class="n">${tr('Low')}</td><td class="n">${tr('High')}</td></tr>
      ${sens.map(r => `<tr><td>${tr(SENS_LABEL[r.key] || r.key)}</td><td class="n">${ntn(r.lo)}</td><td class="n">${ntn(r.hi)}</td></tr>`).join('')}</table>`;
    if (arch) return seg + plain + bkSection(tx('Profit and loss', '損益表'), `<table>${rows}</table>`, tx('$ · % of net sales', '$ · 占銷售淨額'));
    const goal = typeof goalLineText === 'function' && goalLineText() ? `<p class="note goalnote" data-k="goal">${goalLineText()}</p>` : '';
    return seg + plain + goal + bkSection(tx('Profit and loss', '損益表'), `<table>${rows}</table>${extra}`, tx('$ · % of net sales', '$ · 占銷售淨額'))
      + bkSection(tx('Cash vs earned', '現金與實際收入'), cash) + bkSection(tx('What moves profit most', '影響獲利最大的因素'), st);
  },
  wire(body) { body.querySelectorAll('.seg button[data-p]').forEach(b => b.addEventListener('click', () => { BOOKS.period = b.dataset.p; updateBooks(true); }));
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
    const status = (m) => m.protect && m.protect.until > M.dayI ? `<span class="bench" style="color:var(--accent)">${tx(`${KIND[m.protect.kind]} landed · churn halved for ${m.protect.until - M.dayI} more days`, `${KIND[m.protect.kind]}成功 · 流失率減半，還有 ${m.protect.until - M.dayI} 天`)}</span>` : '';
    const rows = atRisk(5).map(({ m, h }) => { const t = riskTag(m, M.dayI), month = 1 - Math.pow(1 - h, PT.daysPerMonth);
      return `<tr data-k="risk" data-h="${h}"><td>${trName(m.name)}<span class="tag">${t.tag}</span><span class="bench" style="color:var(--muted)">${t.fact}</span>${status(m)}</td><td class="n">${(100 * month).toFixed(0)}%</td></tr>
        <tr class="sub"><td colspan="2"><div class="ract">${btn('checkin', m, tx('Message', '傳訊息'))}${btn('taster', m, tx('PT taster', '體驗課'), money(RETAIN.taster.cost))}${btn('voucher', m, tx('Voucher', '折價券'), tx(`up to ${money(RETAIN.voucher.off)}`, `最多 ${money(RETAIN.voucher.off)}`))}</div>
        ${t.kind === 'crowding' ? `<div class="ract"><button data-build="1">${tx('More floor or equipment is the real fix → Build a gym', '真正的解法是更大的空間或更多器材 → 設計健身房')}</button></div>` : ''}</td></tr>`; }).join('');
    const lapsed = M.lapsed.slice().sort((p, q) => q.lapsedDay - p.lapsedDay || p.id - q.id).slice(0, 5).map(m => `<tr data-k="lapsed"><td>${trName(m.name)}<span class="bench" style="color:var(--muted)">${tx(`lapsed ${Math.max(0, M.dayI - m.lapsedDay)} days ago`, `${Math.max(0, M.dayI - m.lapsedDay)} 天前流失`)}</span></td>
        <td class="n"><div class="ract">${btn('winback', m, tx('Win back', '挽回'), money(RETAIN.winback.cost))}</div></td></tr>`).join('');
    const msg = BOOKS.retainMsg ? `<p class="note" data-k="retainMsg" style="color:${BOOKS.retainMsg.ok ? 'var(--accent)' : 'var(--warn)'}">${BOOKS.retainMsg.text}</p>` : '';
    const risk = `${msg}<p class="note" data-k="deskLeft">${tx(`Check-in messages left today: ${left} of ${RETAIN.checkin.perDay} (desk time)`, `今天還能傳 ${left} / ${RETAIN.checkin.perDay} 則關心訊息（櫃檯時間）`)}</p>
      <table><tr class="grp0"><td>${tx('Member', '會員')}</td><td class="n">${tx('Lapse risk / month', '每月流失機率')}</td></tr>${rows}</table>
      <p class="note">${tx('Each action lands with the chance shown; if it lands, that member\'s churn is halved for a while (message 2 months, taster 3, voucher 1). A second action within 30 days has half the chance; crowded members answer messages half as often. Doing nothing leaves the usual churn.', '每個行動依顯示的機率成功；成功後該會員的流失率減半一段時間（訊息 2 個月、體驗課 3 個月、折價券 1 個月）。30 天內再次行動機率減半；覺得太擠的會員回訊息的機率減半。什麼都不做就照一般流失。')}</p>`;
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
  ['priceCap', 10, 100, 300, 'Cap per visit', v => '$' + v], ['rentP', 10, 150, 600, 'Rental price per 90 min', v => '$' + v]];
const livePrices = () => ({ priceOff: S.priceOff, pricePeak: S.pricePeak, priceCap: S.priceCap, rentP: M ? M.cfg.rentP : S.rentP, allowOutside: S.allowOutside });
BOOK_RENDER.Pricing = {
  html() {
    if (!BOOKS.stage) BOOKS.stage = { ...(PUBLISH || livePrices()) };
    const st = BOOKS.stage, live = livePrices(), r2 = (v) => Math.round(v * 100) / 100;
    const rows = PRICE_STEPS.map(([k, , , , lab, f]) => `<tr><td>${tr(lab)}${r2(st[k]) !== r2(live[k]) ? `<span class="bench" style="color:var(--warn)">${tx('now', '目前')} ${f(live[k])}</span>` : ''}</td>
      <td><div class="step"><button data-f="${k}" data-d="-1" aria-label="−">−</button><b>${f(st[k])}</b><button data-f="${k}" data-d="1" aria-label="+">+</button></div></td></tr>`).join('')
      + `<tr><td>${tr('Allow outside coaches')}</td><td><div class="step"><button data-t="allowOutside" class="${st.allowOutside ? 'on' : ''}" style="min-width:120px">${tr(st.allowOutside ? 'On' : 'Off')}</button></div></td></tr>`;
    const pv = pricePreview({ off: S.priceOff, peak: S.pricePeak, cap: S.priceCap }, { off: st.priceOff, peak: st.pricePeak, cap: st.priceCap });
    const pc = (x) => (x >= 1 ? '+' : '−') + Math.abs(100 * (x - 1)).toFixed(1) + '%';
    // a heavy user (12 visits of 90 min a month) against a big-box monthly membership: always shown; a warning when this change makes it worse and above that level
    const nowHeavy = pricePreview({ off: S.priceOff, peak: S.pricePeak, cap: S.priceCap }, { off: S.priceOff, peak: S.pricePeak, cap: S.priceCap }).heavyMonth;
    const worse = pv.heavyMonth > nowHeavy && pv.heavyMonth > BENCH.bigBoxMonthly;
    const warn = `<p class="note${worse ? ' warn' : ''}"${worse ? ' data-k="heavyWarn"' : ''}>${tx(`A heavy user (12 visits of 90 min) would pay ${nt$(pv.heavyMonth)} a month (now ${nt$(nowHeavy)}); a big-box membership is about ${nt$(BENCH.bigBoxMonthly)}.`, `常客（每月 12 次、每次 90 分）每月要付 ${nt$(pv.heavyMonth)}（目前 ${nt$(nowHeavy)}）；大型連鎖月費約 ${nt$(BENCH.bigBoxMonthly)}。`)}${worse ? tx(' Your heaviest users may switch.', '最常來的會員可能會轉去連鎖健身房。') : ''}</p>`;
    const preview = `<table><tr><td>${tx('Visits', '到訪人次')}</td><td class="n">${pc(pv.visits)}</td></tr><tr><td>${tx('Fee per visit (70 min)', '每次入場費（70 分）')}</td><td class="n">${pc(pv.feePerVisit)}</td></tr>
      <tr><td>${tx('Visit takings', '入場費收入')}</td><td class="n">${pc(pv.takings)}</td></tr></table><p class="note">${tx('Worked out from the model\'s assumptions for existing members; new joiners react about twice as much.', '依參數表估算既有會員的反應；新會員的反應約是兩倍。')}</p>${warn}`;
    const pub = PUBLISH ? `<p class="note" style="color:var(--accent)" data-k="published">${tx('Published: the new price list applies from tomorrow morning.', '已公告：新價目從明天早上開始。')}</p>` : '';
    const nextMonth = (st.allowOutside !== (M ? M.cfg.allowOutside : S.allowOutside) || S.allowOutside !== (M ? M.cfg.allowOutside : S.allowOutside)) ? `<p class="note warn" data-k="nextMonthNote">${tx('Who may rent the floor changes from next month (Setup or New month).', '外部教練能否租場地，從下個月起生效（設定或新的一個月）。')}</p>` : '';
    const packs = `<table>${PT_PACKS.map(pk => `<tr><td>${tx(`${pk.n} sessions`, `${pk.n} 堂`)}${pk.parts.length > 1 ? `<span class="bench" style="color:var(--muted)">${tx(`or ${pk.parts.length} instalments`, `可分 ${pk.parts.length} 期`)}</span>` : ''}</td><td class="n">${nt$(pk.price)}</td></tr>`).join('')}</table>`;
    return bkSection(tx('Price list', '價目表'), `<table>${rows}</table><div class="row" style="margin-top:6px"><button data-k="publish" class="btn-go on">${tx('Publish new prices', '公告新價格')}</button><button data-k="reset">${tx('Undo changes', '取消變更')}</button></div>${pub}${nextMonth}`, tx('applies from tomorrow', '明天起生效'))
      + bkSection(tx('Preview', '試算'), preview) + bkSection(tx('PT packs (fixed)', '教練課方案（固定）'), packs);
  },
  wire(body) {
    body.querySelectorAll('button[data-f]').forEach(b => b.addEventListener('click', () => {
      const [k, step, lo, hi] = PRICE_STEPS.find(x => x[0] === b.dataset.f); const v = BOOKS.stage[k] + step * +b.dataset.d;
      BOOKS.stage[k] = Math.round(Math.min(hi, Math.max(lo, v)) / step) * step; updateBooks(true); }));
    body.querySelectorAll('button[data-t]').forEach(b => b.addEventListener('click', () => { BOOKS.stage.allowOutside = !BOOKS.stage.allowOutside; updateBooks(true); }));
    const pubB = body.querySelector('[data-k="publish"]'); if (pubB) pubB.addEventListener('click', () => { publishPrices(BOOKS.stage); showToast(tx('New prices from tomorrow morning', '新價格明天早上生效')); updateBooks(true); });
    const rs = body.querySelector('[data-k="reset"]'); if (rs) rs.addEventListener('click', () => { PUBLISH = null; BOOKS.stage = null; updateBooks(true); });
  }
};
// ---------------------------------------------------------------- Staff and Facility (minimal in phase 1): the existing levers, with context
function bkSliderGroup(body, title, note) { const g = el('section', { class: 'grp' }); g.appendChild(el('h2', {}, `<span>${title}</span>${note ? `<span class="pend">${note}</span>` : ''}`)); body.appendChild(g); return g; }
BOOK_RENDER.Staff = {
  build(body) {
    const g = bkSliderGroup(body, tx('Roster cost', '人事成本'), tx('applies at once', '立即生效'));
    slider(g, 'staff', 'Staff cost per month', 100000, 260000, 1000, v => money(v));
    g.appendChild(el('div', { id: 'bkStaffLines' }));
    const h = bkSliderGroup(body, tx('Opening hours', '營業時間'));
    h.appendChild(el('table', {}, `<tr><td>${tx('Mon–Fri', '週一至五')}</td><td class="n">07:00–24:00</td></tr><tr><td>${tx('Sat–Sun', '週六日')}</td><td class="n">08:00–24:00</td></tr>`));
    h.appendChild(el('p', { class: 'note' }, tx('Desk cover for about 124 hours a week.', '櫃檯每週約需 124 小時人力。')));
  },
  update() {
    const box = document.getElementById('bkStaffLines'); if (!box) return;
    const it = itemiseFixed({ staff: S.staff, occupancy: 0, otherOpex: 0, elec: 0 }).staff, lab = { manager: tx('Store manager', '店長'), deskFT: tx('Desk staff, full-time (2)', '櫃檯正職（2 人）'), deskPT: tx('Desk staff, part-time (about 40 h a week)', '櫃檯兼職（每週約 40 小時）'), statutory: tx('Labour and health insurance, pension', '勞健保與勞退'), bonusLeave: tx('Year-end bonus and leave cover', '年終與休假代班') };
    const h = `<table>${Object.keys(it).map(k => `<tr><td>${lab[k]}</td><td class="n">${nt$(it[k])}</td></tr>`).join('')}<tr class="sum"><td>${tx('A month', '每月')}</td><td class="n">${nt$(S.staff)}</td></tr></table>
      <p class="note">${tx('Coaches are paid from PT, not from this roster.', '教練由教練課分潤支付，不在此人事成本內。')}</p>
      <p class="note${staffAdj(S.staff) > 0 ? ' warn' : ''}" data-k="staffEffect">${(() => { const more = (st) => Math.round(100 * (churnMonthly(0, null, 0, staffAdj(st)) / churnMonthly(0, null, 0, 0) - 1)), x = more(S.staff), mx = more(DEMAND_RESP.staffLean);   /* review I4: the month-0 churn change the model actually applies */
        return tx(`At this roster, members in their first month leave ${x}% more often than with the full roster (${money(DEMAND_RESP.staffBase)}); the most is ${mx}% more, at ${money(DEMAND_RESP.staffLean)}.`, `以目前人力，第一個月的新會員流失比完整人力（${money(DEMAND_RESP.staffBase)}）多 ${x}%；最多多 ${mx}%（${money(DEMAND_RESP.staffLean)}）。`); })()}</p>`;
    if (box.dataset.h !== h) { box.dataset.h = h; box.innerHTML = h; }
  }
};
const FIRE = [[150, 'indoor fire hydrants', '室內消防栓'], [300, 'fire alarm and emergency broadcast', '火警自動警報與緊急廣播'], [500, 'smoke exhaust', '排煙設備'], [1000, 'sprinklers', '自動撒水設備']];
BOOK_RENDER.Facility = {
  build(body) {
    const g = bkSliderGroup(body, tx('Premises', '場地'), tx('applies at once', '立即生效'));
    if (S.hallW) g.appendChild(el('p', { class: 'note' }, tx(`Floor area is set by your build: ${S.hallW} × ${S.hallD} cells.`, `面積由你的設計決定：${S.hallW} × ${S.hallD} 格。`)));
    else slider(g, 'area', 'Floor area', 90, 150, 5, v => v + ' 坪');
    slider(g, 'rentRate', 'Rent per 坪', 800, 2400, 50, v => money(v));
    g.appendChild(el('div', { id: 'bkFacLines' }));
  },
  update() {
    const box = document.getElementById('bkFacLines'); if (!box) return;
    const m2 = S.area * 3.3058, rent = S.area * S.rentRate, mg = S.area * COSTS.mgmtPerPing;
    const fire = FIRE.map(([lim, en, z]) => `<tr><td>${tx(en, z)}<span class="bench" style="color:var(--muted)">${tx(`above ${lim} m²`, `超過 ${lim} m²`)}</span></td><td class="n">${m2 > lim ? tx('required', '必須') : '–'}</td></tr>`).join('');
    const h = `<table><tr><td>${tx('Floor', '面積')}</td><td class="n">${S.area} 坪 · ${Math.round(m2)} m²</td></tr><tr><td>${tx('Rent a month', '每月租金')}</td><td class="n">${nt$(rent)}</td></tr><tr><td>${tx('Management fee a month', '每月管理費')}</td><td class="n">${nt$(mg)}</td></tr></table>
      <p class="note">${tx('Rent resets at renewal: +25% takes monthly EBITDA from about 140k to 108k at the base case.', '續約時租金會調整：漲 25% 會讓基準情境每月 EBITDA 從約 14 萬降到 10.8 萬。')}</p>
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
      <p class="note">${tx('Today\'s takings and costs are included as they happen. VAT, coach payouts and every fixed cost are paid out of this.', '今天的收入與成本即時計入。營業稅、教練分潤與所有固定成本都從這裡付出。')}</p>`;
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
      <tr class="sub"><td>${tx('of which interest this month (a cost, below EBIT)', '其中本月利息（費用，在 EBIT 之下）')}</td><td class="n" data-k="interestM">${ntn(rateI)}</td></tr>
      <tr class="sub"><td>${tx('of which repays the loan (cash, not a cost)', '其中償還本金（現金流出，不是費用）')}</td><td class="n">${ntn(prin)}</td></tr></table>
      <p class="note">${tx('The instalment and income tax leave the bank when the month closes.', '每月還款與所得稅在月底結帳時扣款。')}</p>`;
    const p = A.pnl || {}, mIn = BIZ.mIn + (p.cashIn || 0), mOut = BIZ.mOut + ((p.cashIn || 0) - dayCash(A.pnl));
    const month = `<table><tr><td>${tx('Cash in this month', '本月現金流入')}</td><td class="n">${ntn(mIn)}</td></tr><tr><td>${tx('Cash out this month', '本月現金流出')}</td><td class="n">${ntn(-mOut)}</td></tr></table>`;
    return banner + bkSection(tx('Bank balance', '銀行餘額'), bal) + bkSection(tx('Where the money came from', '資金從哪裡來'), open) + bkSection(tx('The loan', '貸款'), loan) + bkSection(tx('This month', '本月'), month);
  }
};
// ---------------------------------------------------------------- the price board on the desk follows the price list in force (Plan 7b)
function priceBoardKey() { return [S.priceOff, S.pricePeak, S.priceCap, M ? M.cfg.rentP : S.rentP].join('|'); }
function drawPriceBoard(force) {
  const key = priceBoardKey(); if (!force && key === PRICEBOARD.drawn) return; PRICEBOARD.drawn = key;
  const g = PRICEBOARD.canvas.getContext('2d'), W = 256, H = 160, f2 = (v) => v.toFixed(2), rent = M ? M.cfg.rentP : S.rentP;
  const put = (t, x, y, px, col, bold, maxW) => { g.fillStyle = col; let k = px; do { g.font = (bold ? '700 ' : '') + k + 'px Digits, Silkscreen, monospace'; } while (g.measureText(t).width > maxW && --k > 6); g.fillText(t, x, y); };   /* shrink to fit its column */
  g.fillStyle = '#10131c'; g.fillRect(0, 0, W, H); g.fillStyle = '#dfe03a'; g.fillRect(0, 0, W, 26);
  g.textBaseline = 'middle'; put('PRICE LIST', 8, 14, 16, '#10131c', true, 150); g.textAlign = 'right'; put('價目表', W - 8, 14, 16, '#10131c', true, 80); g.textAlign = 'left';
  const row = (x, y, label, price) => { put(label, x, y, 10, '#959bab', false, 116); put(price, x, y + 17, 18, '#dfe03a', true, 116); };
  row(8, 40, 'OFF-PEAK / MIN', '$' + f2(S.priceOff)); row(8, 80, 'PEAK WKDAY 18-22', '$' + f2(S.pricePeak)); row(8, 120, 'CAP PER VISIT', '$' + S.priceCap);
  row(136, 40, 'RENTAL / 90 MIN', '$' + rent); put('PT PACKS', 136, 80, 10, '#959bab', false, 116);
  PT_PACKS.forEach((p, i) => put(`${p.n} · ${money(p.price)}`, 136, 97 + i * 19, 15, '#f2f1ea', true, 116));
  PRICEBOARD.tex.needsUpdate = true;
}
