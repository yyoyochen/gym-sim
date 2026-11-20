// ================================================================ gym builder model (Plan 8): plot cells, presets, equipment prices, rules and costs. Pure (no THREE, no DOM).
const CELL = 1.82;                                                   // one grid cell is 1.82 m square, about 1 坪
const PRESETS = { S: { w: 10, d: 8 }, M: { w: 16, d: 10 }, L: { w: 20, d: 16 } };
const BUILD_LIMITS = { minPing: 60, minW: 8, minD: 7, maxW: 24, maxD: 18 };   // 8 x 7 fits the desk, door and two washrooms (they reach 12.2 m back from the street wall); 24 x 18 keeps clear of the side streets
const SAMPLE_PING = 181;                                             // today's sample hall, 30 x 20 m
const SAMPLE_COUNTS = { cardio: 9, machines: 7, racks: 6, plats: 2, benches: 6, plates: 4 };
// researched mid-tier defaults for Taipei, $ each net of the 5% business tax: a rack set includes its bar,
// plates and floor; cardio is a blend of treadmills, rower, bike and air bike; the fixed kit is dumbbells, cable tower, turf + sled, pull-up and mats
const EQUIP_PRICE = { cardio: 105000, machines: 130000, racks: 120000, plats: 65000, benches: 20000, plates: 90000 };
const FIXED_KIT = [['dumbbells', 180000], ['cable', 200000], ['turf', 35000], ['pullup', 20000], ['mats', 60000]];
// fit-out: 35k a 坪 plus a lump sum for showers, soundproofing and the interior-decoration permit; 3 months' deposit; the first month rent-free; 5-year lives
const FIT_OUT_PER_PING = 35000, FIT_OUT_FIXED = 1000000, DEPOSIT_MONTHS = 3, RENT_FREE_MONTHS = 1, FIT_OUT_YEARS = 5, EQUIP_YEARS = 5;
// default counts for a plot: the sample gym's counts scaled by floor area, at least one of each
function presetCounts(w, d) {
  const k = (w * d) / SAMPLE_PING, out = {};
  for (const key in SAMPLE_COUNTS) out[key] = Math.max(1, Math.round(SAMPLE_COUNTS[key] * k));
  return out;
}
// the rules a rectangle must meet; door on the street and one connected shape always hold for a rectangle
function checkPlot(w, d) {
  const L = BUILD_LIMITS, rules = [
    { key: 'area', ok: w * d >= L.minPing },
    { key: 'size', ok: w >= L.minW && d >= L.minD },
    { key: 'fits', ok: w <= L.maxW && d <= L.maxD },
    { key: 'door', ok: true }, { key: 'connected', ok: true },
  ];
  return { ok: rules.every(r => r.ok), rules };
}
// what a build costs: monthly rent + management, fit-out, deposit, equipment line by line, capex and yearly depreciation
function buildCost(plan, c = COSTS) {
  const ping = plan.w * plan.d, rentMonth = ping * (c.rentRate + c.mgmtPerPing), fitOut = ping * FIT_OUT_PER_PING + FIT_OUT_FIXED, deposit = DEPOSIT_MONTHS * rentMonth;
  const items = Object.keys(EQUIP_PRICE).map(key => ({ key, n: plan.counts[key] || 0, price: EQUIP_PRICE[key] })).concat(FIXED_KIT.filter(([key]) => !plan.kit || plan.kit[key]).map(([key, price]) => ({ key, n: 1, price })));   /* plan.kit: the fixed zones actually placed */
  const equipment = plan.layout && typeof layoutCost === 'function' ? layoutCost(plan.layout) : items.reduce((s, it) => s + it.n * it.price, 0);   /* Plan 11: a laid-out gym pays for its pieces */
  return { ping, rentMonth, fitOut, deposit, rentFreeMonths: RENT_FREE_MONTHS, equipment, items, capex: fitOut + equipment, depYear: fitOut / FIT_OUT_YEARS + equipment / EQUIP_YEARS };
}
// ================================================================ first session (Plan 10): running cost and runway for the builder's money step, and the starter goals
function monthlyRunCost(rentMonth, staff, loanPay, c = COSTS) { return rentMonth + c.elec + c.otherOpex + staff + loanPay; }
function runwayMonths(cash, monthly) { return monthly > 0 ? cash / monthly : Infinity; }
const GOALS = [['members500', 'Reach 500 members by the end of month 3', '第三個月底前達到 500 位會員'], ['cash12', "Don't run out of cash in year 1", '第一年現金不用完'], ['keep92', 'Keep at least 92% of members every month', '每個月都留住至少 92% 的會員']];   /* owner 2026-11-15: attainable with effort; no month-1 profit */
// s: { months (archived), mtdEbitda, monthIndex, cashOut, lapsedNow, startPool } -> { state: on | met | missed, text: { en, zh } }
function goalStatus(key, s) {
  const T = (en, zh) => ({ en, zh });
  if (key === 'members500') {   /* owner 2026-11-20: the target follows the gym (s.target); an opening month under 15 days is not one of the three */
    const N = s.target || 500, full = s.months.filter(m => m.days == null || m.days >= 15), third = full[2], upTo = third ? s.months.slice(0, s.months.indexOf(third) + 1) : s.months;
    const hit = upTo.some(m => m.members >= N) || (!third && s.poolNow >= N);
    if (hit) return { state: 'met', text: T(`${N} members reached`, `已達 ${N} 位會員`) };
    if (third) return { state: 'missed', text: T(`month 3 ended at ${third.members}`, `第三個月結束時 ${third.members} 位`) };
    if (!full.length && s.curDays != null && s.curDays < 15) return { state: 'on', text: T(`${s.poolNow} of ${N} · the 3 months start next month`, `${s.poolNow}/${N} 位 · 三個月從下個月起算`) };   /* judge 2026-11-20: a short opening month is not month 1, and the line says so */
    return { state: 'on', text: T(`${s.poolNow} of ${N} · month ${full.length + 1} of 3`, `${s.poolNow}/${N} 位 · 第 ${full.length + 1}/3 個月`) };
  }
  if (key === 'cash12') {
    if (s.openCash < 0) return { state: 'missed', text: T('opened overdrawn', '開幕就透支') };
    if (s.cashOut && (s.cashOutMonth == null || s.cashOutMonth < 12)) return { state: 'missed', text: T('cash ran out', '現金用完了') };   /* a year-1 goal: running out later doesn't undo it */
    if (s.months.length >= 12) return { state: 'met', text: T('a year without running out', '整年現金沒用完') };
    return { state: 'on', text: T(`month ${s.monthIndex + 1} of 12`, `第 ${s.monthIndex + 1}/12 個月`) };
  }
  if (key === 'keep92') {
    const kept = (m) => 1 - m.lapsed / Math.max(1, m.members + m.lapsed), pct = (k) => (Math.floor(k * 1000) / 10).toFixed(1).replace(/\.0$/, '');   /* rounded down: 91.96% never reads as 92% */
    const bad = s.months.slice(0, 12).find(m => kept(m) < 0.92);
    if (bad) return { state: 'missed', text: T(`a month kept ${pct(kept(bad))}%`, `有一個月只留住 ${pct(kept(bad))}%`) };
    if (s.months.length >= 12) return { state: 'met', text: T('a year at 92% or more', '整年都在 92% 以上') };
    const k = Math.round(100 * (1 - s.lapsedNow / Math.max(1, s.startPool)));
    return { state: 'on', text: T(`${k}% kept so far`, `目前留住 ${k}%`) };
  }
  return { state: 'on', text: T('', '') };
}
// owner 2026-11-20: the members goal asks for 55% of the gym's steady membership (a little more than the ramp gives untouched); an established gym keeps 500
function membersTarget(steady, build) { return build === 'new' ? Math.round(steady * 0.55 / 10) * 10 : 500; }
// ================================================================ the month's report (evaluation 2026-11-20): what the month did, in a handful of numbers a player can act on.
// cur / prev: archived months { days, members, joined, lapsed, returned, visits, cashEnd, cashIn, cashOut, pnl }. A short opening month is scaled to 30.4 days.
// hist (display only): the last up-to-3 closed months, this one last; months-left is read against their average burn so one odd month does not swing it
function monthReport(cur, prev, cashStart, hist) {
  const p = cur.pnl, k = 30.4 / cur.days, start = cur.members - cur.joined - (cur.returned || 0) + cur.lapsed, avg = (start + cur.members) / 2;
  const hs = hist && hist.length ? hist.slice(-3) : [cur], each = avg > 0 ? p.contribution / avg : 0, out = hs.reduce((t, m) => t + (m.cashOut - m.cashIn + (m.pnl.passOwedChange || 0)) * 30.4 / m.days, 0) / hs.length;   /* rules round 2026-11-21: pass money paid ahead is not counted as cash that keeps coming */
  const r = { startMembers: start, members: cur.members, joined: cur.joined + (cur.returned || 0), lapsed: cur.lapsed, kept: 1 - cur.lapsed / Math.max(1, cur.members + cur.lapsed),
    ebitda: p.ebitda, breakEven: each > 0 ? Math.ceil(p.fixed / each) : null, runway: out > 0 && cur.cashEnd > 0 ? Math.round(cur.cashEnd / out * 10) / 10 : null,
    visitsPerMember: avg > 0 ? (cur.visits || 0) / avg * k : 0, cashEnd: cur.cashEnd, prev: null, better: null, perDay: p.ebitda / cur.days, days: cur.days, avgMembers: Math.round(avg), cash: null };
  // judge 2026-11-20: the break-even count is for the whole month, so it is read against the month's average membership and never contradicts the result
  if (r.breakEven != null) { if (p.ebitda < 0 && r.breakEven <= r.avgMembers) r.breakEven = r.avgMembers + 1; if (p.ebitda >= 0 && r.breakEven > r.avgMembers) r.breakEven = r.avgMembers; }
  // judge round 4: when the count moves by more than 5% the card says why: the fixed costs moved, members came less (or more) often, or each member brought in less (or more)
  if (prev && r.breakEven != null) { const q = prev.pnl, ps = prev.members - prev.joined - (prev.returned || 0) + prev.lapsed, pa = (ps + prev.members) / 2, pe = pa > 0 ? q.contribution / pa : 0, pb = pe > 0 ? Math.ceil(q.fixed / pe) : null;
    if (pb != null && Math.abs(r.breakEven / pb - 1) > 0.05) { const lg = (x, y) => (x > 0 && y > 0 ? Math.log(x / y) : 0), dF = lg(p.fixed / cur.days, q.fixed / prev.days), dE = lg(each / cur.days, pe / prev.days), dV = lg((cur.visits || 0) / Math.max(1, avg) / cur.days, (prev.visits || 0) / Math.max(1, pa) / prev.days), up = r.breakEven > pb;
      const why = Math.abs(dF) >= Math.abs(dE) && (dF > 0) === up ? (up ? 'fixedUp' : 'fixedDown') : Math.abs(dV) > 0.03 && (dV < 0) === up ? (up ? 'visitsDown' : 'visitsUp') : up ? 'eachDown' : 'eachUp';
      r.beWhy = { from: pb, up, why }; } }
  if (prev) { r.prev = { ebitda: prev.pnl.ebitda * 30.4 / prev.days, members: prev.members, perDay: prev.pnl.ebitda / prev.days, days: prev.days, total: prev.pnl.ebitda }; r.better = p.ebitda * k > r.prev.ebitda; r.sameLength = Math.abs(cur.days - prev.days) <= 3; }
  // what moved the bank balance: the operating result, the loan instalment, income tax, and the rest (prepaid coaching, equipment, sales tax timing)
  const from = cashStart != null ? cashStart : prev ? prev.cashEnd : null;
  if (from != null) { const change = cur.cashEnd - from, loan = -((cur.interest || 0) + (cur.principal || 0)) || 0, tax = -(cur.tax || 0) || 0; r.cash = { change, result: p.ebitda, loan, tax, other: change - p.ebitda - loan - tax }; }
  return r;
}
// judge 2026-11-20: what the month's changes did, in the numbers the game already has, and one thing to try that the player has not already done.
// cur / prev: archived months (prev may be null); now: the settings in force { perMinOn, monthlyOn, ... }. Returns { en, zh } or null.
// judge round 4: every comparison is per day or per 30 days; each change lists only what it can cause (prices: visits, money per visit, leavers; the pass:
// pass money, visits; the roster: staff cost, leavers, coaching sales); a rise is never credited to a cut (it is said as "despite")
const TIP_GROUPS = { price: ['priceOff', 'pricePeak', 'priceCap', 'perMinOn', 'monthlyOn', 'monthlyPrice'], pass: ['monthlyOn', 'monthlyPrice'], coach: ['ptSession', 'coaches'], staff: ['deskFT', 'deskPTh', 'cleaners', 'coaches'], floor: ['pieces', 'rentP'] };
function monthTip(cur, prev, now) {
  const chs = cur.changes || [], ch = chs.map(c => c.k), did = (g) => TIP_GROUPS[g].some(k => ch.includes(k)), en = [], zhs = [], n0 = (v) => Math.round(v).toLocaleString('en-US'), d1 = (v) => (Math.round(v * 10) / 10).toString();
  const per = (m, v) => v / Math.max(1, m.days), $ = (v) => '$' + n0(v), p = cur.pnl || {}, q = prev ? prev.pnl || {} : {}, same = prev && Math.abs(cur.days - prev.days) <= 3;
  const joined = (m) => m.joined + (m.returned || 0), fees = (x) => (x.entry || 0) + (x.passes || 0), r30 = (m, v) => Math.round(v * 30 / Math.max(1, m.days));
  let warned = false;
  if (ch.length && !prev) { en.push('This was your first month, so there is no earlier month to compare these changes with yet.'); zhs.push('這是第一個月，還沒有上個月可以比較這些調整的效果。'); }
  if (prev) {
    // leavers, compared fairly: the counts when the two months are as long as each other, otherwise the rate per 30 days
    const leftEn = same ? `${cur.lapsed} members left (${prev.lapsed} the month before)` : `members left at a rate of ${r30(cur, cur.lapsed)} per 30 days (${r30(prev, prev.lapsed)} per 30 days the month before; the months were ${cur.days} and ${prev.days} days long)`;
    const leftZh = same ? `${cur.lapsed} 位會員離開（上個月 ${prev.lapsed} 位）` : `會員離開的速度是每 30 天 ${r30(cur, cur.lapsed)} 位（上個月每 30 天 ${r30(prev, prev.lapsed)} 位；這個月 ${cur.days} 天，上個月 ${prev.days} 天）`;
    if (did('price')) { const hurt = per(cur, cur.lapsed) > 1.5 * per(prev, prev.lapsed) && cur.lapsed - prev.lapsed >= 10, pv = (m, x) => fees(x) / Math.max(1, m.visits || 0), onlyPass = !ch.some(k => TIP_GROUPS.price.includes(k) && !TIP_GROUPS.pass.includes(k));
      const jEn = same ? `${cur.lapsed} members left, ${joined(cur)} joined (month before: ${prev.lapsed} left, ${joined(prev)} joined)` : `per 30 days ${r30(cur, cur.lapsed)} members left and ${r30(cur, joined(cur))} joined (month before: ${r30(prev, prev.lapsed)} left, ${r30(prev, joined(prev))} joined; the months were ${cur.days} and ${prev.days} days long)`;
      const jZh = same ? `${cur.lapsed} 位會員離開、${joined(cur)} 位加入（上個月：${prev.lapsed} 位離開、${joined(prev)} 位加入）` : `每 30 天 ${r30(cur, cur.lapsed)} 位會員離開、${r30(cur, joined(cur))} 位加入（上個月：${r30(prev, prev.lapsed)} 位離開、${r30(prev, joined(prev))} 位加入；這個月 ${cur.days} 天，上個月 ${prev.days} 天）`;
      en.push(`After the ${onlyPass ? 'pass' : 'price'} change: ${jEn}. Visits ${n0(per(cur, cur.visits || 0))} a day (was ${n0(per(prev, prev.visits || 0))}). Entry and pass money ${$(per(cur, fees(p)))} a day (was ${$(per(prev, fees(q)))}), ${$(pv(cur, p))} a visit (was ${$(pv(prev, q))})${onlyPass || (p.passes || 0) + (q.passes || 0) > 0 ? `; of that, passes ${$(per(cur, p.passes || 0))} a day (was ${$(per(prev, q.passes || 0))})` : ''}.`);
      zhs.push(`調整${onlyPass ? '月費' : '價格'}後：${jZh}。每天到訪 ${n0(per(cur, cur.visits || 0))} 人次（原本 ${n0(per(prev, prev.visits || 0))}）。入場費與月費每天 ${$(per(cur, fees(p)))}（原本 ${$(per(prev, fees(q)))}），每次到訪 ${$(pv(cur, p))}（原本 ${$(pv(prev, q))}）${onlyPass || (p.passes || 0) + (q.passes || 0) > 0 ? `；其中月費每天 ${$(per(cur, p.passes || 0))}（原本 ${$(per(prev, q.passes || 0))}）` : ''}。`);
      if (hurt) { warned = true; en.push('That change cost you members. If that was not the plan, put the price list back (Pricing).'); zhs.push('這次調整讓會員流失變多。如果這不是你要的，把價目改回去（價格）。'); } }
    const pt1 = per(cur, p.ptEarned || 0), pt0 = per(prev, q.ptEarned || 0), keptEn = `the gym kept ${$(per(cur, (p.ptEarned || 0) - (p.coach || 0)))} a day of it after the coaches' share`, keptZh = `扣掉教練分潤後，健身房每天留下 ${$(per(cur, (p.ptEarned || 0) - (p.coach || 0)))}`;
    if (did('staff')) { const rc = chs.filter(c => TIP_GROUPS.staff.includes(c.k)), cut = rc.every(c => c.to < c.from), grew = rc.every(c => c.to > c.from), lessLeft = per(cur, cur.lapsed) < per(prev, prev.lapsed), cc = chs.find(c => c.k === 'coaches');
      const lEn = cut && lessLeft ? `despite the smaller roster, ${leftEn}` : leftEn, lZh = cut && lessLeft ? `雖然人力變少，${leftZh}` : leftZh;
      let cEn = '', cZh = '';
      if (cc) { const less = cc.to < cc.from, odd = less ? pt1 > pt0 : pt1 < pt0;   /* fewer coaches and more coaching money (or the reverse): not this change's doing */
        cEn = odd ? ` Coaching earned ${$(pt1)} a day (was ${$(pt0)}) despite ${less ? 'having fewer coaches' : 'the extra coach'}, not because of it: packs are earned one session at a time, so sales made earlier still show; ${keptEn}.` : ` With ${cc.to} coach${cc.to === 1 ? '' : 'es'}, coaching earned ${$(pt1)} a day (was ${$(pt0)}); ${keptEn}.`;
        cZh = odd ? `教練課每天收入 ${$(pt1)}（原本 ${$(pt0)}），這是在${less ? '教練變少' : '多了教練'}的情況下發生的，不是它造成的：課程方案是上一堂才算一堂的收入，之前賣出的還在入帳；${keptZh}。` : `${cc.to} 位教練時，教練課每天收入 ${$(pt1)}（原本 ${$(pt0)}）；${keptZh}。`; }
      en.push(`After the staff change: staff cost ${$(per(cur, p.staff || 0))} a day (was ${$(per(prev, q.staff || 0))}); ${lEn}.${cEn}`); zhs.push(`調整人力後：人事每天 ${$(per(cur, p.staff || 0))}（原本 ${$(per(prev, q.staff || 0))}）；${lZh}。${cZh}`); }
    if (ch.includes('ptSession')) { en.push(`After the coaching price change: coaching earned ${$(pt1)} a day (was ${$(pt0)}); ${keptEn}.`); zhs.push(`調整教練課價格後：教練課每天收入 ${$(pt1)}（原本 ${$(pt0)}）；${keptZh}。`); }
    if (did('floor')) { en.push(`After the change on the floor: visits ${n0(per(cur, cur.visits || 0))} a day (was ${n0(per(prev, prev.visits || 0))}).`); zhs.push(`調整場地後：每天到訪 ${n0(per(cur, cur.visits || 0))} 人次（原本 ${n0(per(prev, prev.visits || 0))}）。`); }
  }
  if (p.ebitda < 0 && !warned) {   // one thing to try (not on top of a warning: one thing at a time): by the biggest cost, never what was changed this month or is already in force
    const costs = [['rent', Math.max(p.occupancy || 0, ((now || {}).rentNext || 0) * cur.days / 30.4)],   /* a rent-free first month: the rent about to start counts */ ['staff', p.staff || 0], ['running', (p.elec || 0) + (p.otherOpex || 0)], ['coach', p.coach || 0]].sort((a, b) => b[1] - a[1]), top = costs[0][0], s = now || {};
    const A = [];
    if (!did('price') && s.perMinOn !== false && !s.monthlyOn) A.push(['a monthly pass next to the minute price brings regulars in faster (Pricing)', '在計時收費之外加開月費，常客來得更快（價格）']);
    if (!did('price') && s.perMinOn !== false && s.monthlyOn) A.push(['a lower minute price brings new members in faster (Pricing)', '降低每分鐘價格，新會員來得更快（價格）']);
    if (!did('coach')) A.push(['coaching income sits on top of entry fees: check that the coaches you pay have clients (Staff)', '教練課收入是入場費之外的收入：看看你付薪水的教練有沒有學員（員工）']);
    if (!did('staff') && top === 'staff' && (s.deskPTh == null || s.deskPTh > 0 || s.deskFT > 1)) A.unshift(['fewer desk hours save money at once, but cost sign-ups and members: the Staff tab gives the numbers', '減少櫃檯時數馬上省錢，但入會會變少、會員也更容易退會：數字在員工分頁']);
    if (!did('staff') && top !== 'staff' && (s.deskPTh == null || s.deskPTh > 0 || s.deskFT > 1)) A.push(['fewer desk hours save money at once, but cost sign-ups and members: the Staff tab gives the numbers', '減少櫃檯時數馬上省錢，但入會會變少、會員也更容易退會：數字在員工分頁']);
    const lead = { rent: ['Rent is your biggest cost and it is fixed, so the answer is more members', '租金是最大的成本，而且是固定的，所以要靠更多會員'], staff: ['Staff is your biggest cost', '人事是最大的成本'], running: ['Running costs are your biggest cost and mostly fixed, so the answer is more income', '營運成本最大、而且大多固定，所以要靠更多收入'], coach: ["The coaches' share is your biggest cost; it only goes out when coaching brings money in, so look at the fixed costs", '教練分潤最大；有教練課收入才會支出，所以先看固定成本'] }[top];
    // judge round 4: the advice follows from the lead only when it is about that cost; otherwise it is its own sentence
    const fits = top === 'staff' ? /desk hours/.test(A.length ? A[0][0] : '') : top !== 'coach';
    if (A.length && fits) { en.push(`${lead[0]}: ${A[0][0]}.`); zhs.push(`${lead[1]}：${A[0][1]}。`); }
    else if (A.length) { en.push(`${lead[0]}. One thing to try: ${A[0][0]}.`); zhs.push(`${lead[1]}。可以試試：${A[0][1]}。`); }
    else { en.push(`${lead[0]}. Give this month's changes another month before changing more.`); zhs.push(`${lead[1]}。這個月的調整再觀察一個月，先不要改更多。`); }
  }
  return en.length ? { en: en.join(' '), zh: zhs.join('') } : null;
}
// what the player changed between two snapshots of the settings: [{ k, from, to }] in the order of `before`
function settingChanges(before, after) { return Object.keys(before).filter(k => before[k] !== after[k]).map(k => ({ k, from: before[k], to: after[k] })); }
