// ================================================================ notices (evaluation 2026-11-20): the month's report, running out of cash, a goal met or missed.
// One card at a time, in the middle of the screen; the gym waits while it is up.
function noteEl() { let c = document.getElementById('noteCard'); if (!c) { c = el('div', { id: 'noteCard', role: 'dialog', hidden: '' }, ''); c.hidden = true; document.body.appendChild(c); } return c; }
let NOTE_BTNS = [];
function showNote(html, buttons) {   /* buttons: [[label, fn, class]] */
  const c = noteEl(); NOTE_BTNS = buttons; goOn = false; if (typeof refreshGo === 'function') refreshGo();
  c.innerHTML = html + `<div class="row">${buttons.map(([l, , cls], i) => `<button data-note="${i}" class="${cls || ''}">${l}</button>`).join('')}</div>`; c.hidden = false;
}
function hideNote() { const c = document.getElementById('noteCard'); if (c) c.hidden = true; }
document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('#noteCard button[data-note]'); if (!b) return; const f = NOTE_BTNS[+b.dataset.note]; hideNote(); if (f && f[1]) f[1](); });
const CHANGE_NAMES = { priceOff: ['Off-peak minute', '離峰每分鐘', v => '$' + v.toFixed(2)], pricePeak: ['Peak minute', '尖峰每分鐘', v => '$' + v.toFixed(2)], priceCap: ['Cap per visit', '單次上限', v => '$' + v],
  perMinOn: ['Pay by the minute', '計時收費', v => v ? tx('on', '開') : tx('off', '關')], monthlyOn: ['Monthly pass', '月費', v => v ? tx('on', '開') : tx('off', '關')], monthlyPrice: ['Monthly pass price', '月費價格', v => '$' + v.toLocaleString('en-US')],
  ptSession: ['Coaching session', '教練課一堂', v => '$' + v.toLocaleString('en-US')], rentP: ['Floor rental', '場地租借', v => '$' + v], deskFT: ['Full-time desk staff', '全職櫃檯', v => v], deskPTh: ['Part-time desk hours', '兼職櫃檯時數', v => v],
  coaches: ['Coaches', '教練', v => v], cleaners: ['Cleaners', '清潔人員', v => v], pieces: ['Pieces of equipment', '器材數', v => v] };
function monthCardHtml(rec, prev) {
  const r = monthReport(rec, prev), lost = r.ebitda < 0, amt = money(Math.abs(r.ebitda)), short = rec.days < 28 ? tx(` (${rec.days} days)`, `（${rec.days} 天）`) : '';
  const row = (l, v) => `<tr><td>${l}</td><td class="n">${v}</td></tr>`;
  const vs = r.prev ? row(tx('Against last month', '和上個月比'), `<b class="${r.better ? 'gain' : 'loss'}">${r.better ? tx('better', '進步') : tx('worse', '退步')}</b>`) : '';
  const cash = moneyK(r.cashEnd) + (r.cashEnd < 0 ? '' : r.runway ? tx(` · about ${r.runway} months left at this rate`, ` · 照這樣約可撐 ${r.runway} 個月`) : tx(' · growing', ' · 持續增加'));
  const be = r.breakEven ? row(tx('Members needed to cover costs', '打平需要的會員數'), tx(`about ${r.breakEven} (you have ${r.members})`, `約 ${r.breakEven} 位（目前 ${r.members} 位）`)) : '';
  const ch = (rec.changes || []).map(c => { const n = CHANGE_NAMES[c.k]; return n ? `${tx(n[0], n[1])} ${n[2](c.from)} → ${n[2](c.to)}` : ''; }).filter(Boolean);
  const g = typeof goalNow === 'function' ? goalNow() : null;
  const top = topCosts(rec.pnl)[0], LEVER = { rent: tx('Rent is fixed, so the answer is more members: a lower minute price or a monthly pass brings them in faster (Pricing).', '租金是固定的，所以要靠更多會員：降低每分鐘價格或開放月費，會員來得更快（價目）。'),
    staff: tx('Staff is the biggest cost. Fewer desk hours save money at once, but new members leave a little faster (Staff).', '人事是最大的成本。減少櫃檯時數馬上省錢，但新會員會流失得快一點（人力）。'),
    'running costs': tx('Running costs are the biggest cost and mostly fixed: you need more members, or coaching income on top (Pricing, Staff).', '營運成本最大、而且大多固定：需要更多會員，或增加教練課收入（價目、人力）。'),
    'coach pay': tx('Coach pay is the biggest cost: it only goes out when coaching brings money in, so look at the fixed costs next.', '教練分潤最大：有教練課收入才會支出，所以接著看固定成本。') };
  const tip = lost && top ? `<p class="note" data-k="tip"><b>${tx('What to try', '可以試試')}</b> ${LEVER[top[0]] || ''}</p>` : '';
  return `<h2 class="ttl">${tx(`${monthLabel(rec.name, rec.year)} closed${short}`, `${monthLabel(rec.name, rec.year)} 結帳${short}`)}</h2>
    <p class="big ${lost ? 'loss' : 'gain'}">${lost ? tx(`Lost ${amt}`, `虧 ${amt}`) : tx(`Made ${amt}`, `賺 ${amt}`)}<small>${tx('after rent, staff and running costs', '已扣租金、人事與營運成本')}</small></p>
    <table>${row(tx('Members', '會員'), `${r.startMembers} → <b>${r.members}</b> <small>(+${r.joined} ${tx('joined', '加入')}, −${r.lapsed} ${tx('left', '離開')})</small>`)}${be}${row(tx('Cash in the bank', '銀行現金'), cash)}${vs}</table>
    <p class="note">${ch.length ? tx('You changed: ', '你這個月調整了：') + ch.join(tx('; ', '；')) : tx('You changed nothing this month: prices, staff and equipment are as they were.', '這個月你沒有調整任何東西：價格、人力和器材都沒變。')}</p>
    ${tip}${g ? `<p class="note">${goalLineText()}</p>` : ''}`;
}
function showMonthCard() {
  if (!BIZ || !BIZ.months.length || !M) return; if (typeof closeBooks === 'function') closeBooks(); const rec = BIZ.months[BIZ.months.length - 1], prev = BIZ.months[BIZ.months.length - 2] || null;
  showNote(monthCardHtml(rec, prev), [[tx(`Start ${monthLabel(M.cfg.month, BIZ.year)}`, `開始 ${monthLabel(M.cfg.month, BIZ.year)}`), () => { goOn = true; refreshGo(); }, 'btn-go on'], [tx('Open the P&L', '打開損益表'), () => openBooks('Books')]]);
}
// called with the goal's status from the HUD refresh: each notice is shown once
function gameNotices(g) {
  const c = document.getElementById('noteCard'); if ((c && !c.hidden) || !BIZ || (typeof BUILD !== 'undefined' && BUILD.on) || (typeof closing !== 'undefined' && closing)) return;
  if (BIZ.cashOutAt && !BIZ.cashOutTold) { BIZ.cashOutTold = true;
    showNote(`<h2 class="ttl">${tx('The gym is out of cash', '健身房的現金用完了')}</h2><p>${cashOutText()}. ${tx('A real gym would have to find more money or close. You can start a new gym with what you learned, or keep this one running in the red to see what happens.', '真實的健身房這時得再找錢，不然就得收掉。你可以帶著經驗重新開一間，或讓這間繼續赤字營運看看。')}</p>`,
      [[tx('Start a new gym', '重新開一間'), () => openIntro(true), 'btn-go on'], [tx('Keep going', '繼續營運')]]); return; }
  if (g && g.state !== 'on' && GOAL.key && GOAL.told !== GOAL.key + g.state) { GOAL.told = GOAL.key + g.state; const met = g.state === 'met';
    showNote(`<h2 class="ttl">${met ? tx('Goal met', '目標達成') : tx('Goal missed', '目標沒達成')}</h2><p>${goalLabel(GOAL.key)}: ${tx(g.text.en, g.text.zh)}.</p>`,
      [[met ? tx('Pick the next goal', '選下一個目標') : tx('Pick another goal', '換一個目標'), () => showGoalCard(true), 'btn-go on'], [tx('Keep playing', '繼續玩'), () => { goOn = true; refreshGo(); }]]); }
}
