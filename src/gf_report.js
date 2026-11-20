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
  const idx = BIZ ? BIZ.months.indexOf(rec) : -1, cashStart = prev ? prev.cashEnd : BIZ && idx === 0 ? BIZ.openCash : null;
  const r = monthReport(rec, prev, cashStart), lost = r.ebitda < 0, amt = money(Math.abs(r.ebitda)), short = rec.days < 28 ? tx(` (${rec.days} days)`, `（${rec.days} 天）`) : '';
  const row = (l, v, k) => `<tr${k ? ` data-k="${k}"` : ''}><td>${l}</td><td class="n">${v}</td></tr>`, sg = (v) => (v > 0.5 ? '+' : '') + moneyK(v), res = (v) => (v < 0 ? tx('lost ', '虧 ') : tx('made ', '賺 ')) + money(Math.abs(v));
  // judge 2026-11-20: months of different length are compared per day, and the row says so
  const word = r.better ? tx('better', '進步') : tx('worse', '退步'), rentStarted = typeof BUILT !== 'undefined' && !!BUILT && idx > 0 && idx === BUILT.rentFreeMonths ? tx(`; rent started this month (${moneyK(S.area * S.rentRate)})`, `；這個月開始付租金（${moneyK(S.area * S.rentRate)}）`) : '';
  const vs = !r.prev ? '' : r.sameLength ? row(tx('Against last month', '和上個月比'), `<b class="${r.better ? 'gain' : 'loss'}">${word}</b> <small>(${res(r.ebitda)}; ${tx('last month', '上個月')} ${res(r.prev.total)}${rentStarted})</small>`, 'vs')
    : row(tx('Against last month', '和上個月比'), `<b class="${r.better ? 'gain' : 'loss'}">${word}${tx(' per day', '（以每天計）')}</b> <small>${tx(`${money(r.perDay)} a day against ${money(r.prev.perDay)} a day; last month had ${r.prev.days} days, this one ${r.days}`, `每天 ${money(r.perDay)}，上個月每天 ${money(r.prev.perDay)}；上個月 ${r.prev.days} 天，這個月 ${r.days} 天`)}${rentStarted}</small>`, 'vs');
  const cash = moneyK(r.cashEnd) + (r.cashEnd < 0 ? '' : r.runway ? tx(` · about ${r.runway} months left at this rate`, ` · 照這樣約可撐 ${r.runway} 個月`) : tx(' · growing', ' · 持續增加'));
  // what moved the bank this month, so the cash change and the result (which leaves out the loan) can be read together
  const c = r.cash, cashWhy = c ? `<tr data-k="cashWhy"><td colspan="2"><small>${tx(`Cash moved ${sg(c.change)} this month: the result above ${sg(c.result)}, loan payment ${sg(c.loan)}`, `本月現金變動 ${sg(c.change)}：上面的結果 ${sg(c.result)}、貸款還款 ${sg(c.loan)}`)}${Math.abs(c.tax) >= 0.5 ? tx(`, income tax ${sg(c.tax)}`, `、所得稅 ${sg(c.tax)}`) : ''}${Math.abs(c.other) >= 500 ? tx(`, coaching paid ahead and equipment ${sg(c.other)}`, `、預收教練課與器材 ${sg(c.other)}`) : ''}${tx('.', '。')}</small></td></tr>` : '';
  // the first month of a built gym is rent-free: the break-even count would mislead, so the card says what rent starts next month instead
  const rentFree = typeof BUILT !== 'undefined' && !!BUILT && idx >= 0 && idx < BUILT.rentFreeMonths, rentNext = S.area * S.rentRate;
  const be = r.breakEven && !rentFree ? row(tx('Members needed to cover costs', '打平需要的會員數'), tx(`about ${r.breakEven} all month (you averaged ${r.avgMembers})`, `整個月平均約 ${r.breakEven} 位（你這個月平均 ${r.avgMembers} 位）`), 'breakEven') : '';
  const rentNote = rentFree ? `<p class="note warn" data-k="rentNext">${tx(`Rent was free this month. From next month rent of ${moneyK(rentNext)} a month starts: about ${money(rentNext / 30.4)} more cost every day.`, `這個月免租。下個月起每月租金 ${moneyK(rentNext)}：每天的成本大約多 ${money(rentNext / 30.4)}。`)}</p>` : '';
  const ch = (rec.changes || []).map(c => { const n = CHANGE_NAMES[c.k]; return n ? `${tx(n[0], n[1])} ${n[2](c.from)} → ${n[2](c.to)}` : ''; }).filter(Boolean);
  const g = typeof goalNow === 'function' ? goalNow() : null;
  // judge 2026-11-20: the tip reads the card's own "You changed" list: what each change did, then one thing not yet tried
  const tipT = monthTip(rec, prev, { ...(BIZ && BIZ.snap ? BIZ.snap : typeof settingSnap === 'function' ? settingSnap() : {}), rentNext: rentFree ? rentNext : 0 });
  const tip = tipT ? `<p class="note" data-k="tip"><b>${ch.length && prev ? tx('What your changes did', '你的調整帶來什麼') : tx('What to try', '可以試試')}</b> ${tx(tipT.en, tipT.zh)}</p>` : '';
  return `<h2 class="ttl">${tx(`${monthLabel(rec.name, rec.year)} closed${short}`, `${monthLabel(rec.name, rec.year)} 結帳${short}`)}</h2>
    <p class="big ${lost ? 'loss' : 'gain'}">${lost ? tx(`Lost ${amt}`, `虧 ${amt}`) : tx(`Made ${amt}`, `賺 ${amt}`)}<small>${tx('after rent, staff and running costs (the loan is separate)', '已扣租金、人事與營運成本（貸款另計）')}</small></p>
    <table>${row(tx('Members', '會員'), `${r.startMembers} → <b>${r.members}</b> <small>(+${r.joined} ${tx('joined', '加入')}, −${r.lapsed} ${tx('left', '離開')})</small>`)}${be}${row(tx('Cash in the bank', '銀行現金'), cash)}${cashWhy}${vs}</table>${rentNote}
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
