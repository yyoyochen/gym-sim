
// ================================================================ daily P&L (pure: no THREE, no DOM). Monthly values ÷ PT.daysPerMonth = per day.
// Base case of the parameter book: area and rent (P1.1, P7.1, P7.3), electricity (P7.7), other fixed costs (P8, without rent,
// management and electricity), staff (P6.12), card and marketing (% of net sales, P8.6, P8.7), gym's share of PT (P5.4),
// PT price per session (P3.8), add-ons not simulated (non-member entry, classes, InBody/vending: P2.9 + P5.8 + P5.9),
// PT sessions already owed at the start of the day (P5.10), VAT inside prices (P11.1).
const COSTS = { area: 115, rentRate: 1100, mgmtPerPing: 70, elec: 66000, otherOpex: 87100, staff: 209952, cardPct: 1, mktPct: 3, gymShare: 50, ptPrice: 1560, addOns: 46000, deferredStart: 300000, vat: 0.05, capex: 10.5e6, depYear: 1.3e6, tax: 0.2 };   // capex P9.6, depreciation P9.11, income tax P11.2
function dayFraction(t, open, close) { return Math.min(1, Math.max(0, (t - open) / (close - open))); }
function fixedPerDay(c = COSTS) { return (c.area * c.rentRate + c.area * c.mgmtPerPing + c.elec + c.otherOpex + c.staff) / PT.daysPerMonth; }
function dailyPnl(t, frac, c = COSTS) {
  const d = PT.daysPerMonth, r = {};
  r.entry = t.entry; r.entryPeak = t.entryPeak || 0; r.entryOff = r.entry - r.entryPeak; r.cards = t.cards || 0; r.ptEarned = t.ptEarned != null ? t.ptEarned : t.ptSessions * c.ptPrice; r.rentals = t.rentals; r.addOns = c.addOns / d * frac; r.passes = t.passes || 0;   /* monthly passes: counted on the day they are sold */
  r.gross = r.entry + r.passes + r.cards + r.ptEarned + r.rentals + r.addOns;
  r.net = r.gross / (1 + c.vat); r.vat = r.gross - r.net;
  r.coach = r.ptEarned * (1 - c.gymShare / 100); r.mkt = r.net * c.mktPct / 100; r.card = r.net * c.cardPct / 100;
  r.retain = t.retain || 0;   /* Plan 9: retention actions paid today (taster coach pay, win-back SMS) */
  r.rearrange = t.rearrange || 0;   /* Plan 12: movers paid today for a rearrange */
  r.contribution = r.net - r.coach - r.mkt - r.card - r.retain - r.rearrange;
  r.occupancy = c.area * (c.rentRate + c.mgmtPerPing) / d * frac; r.elec = c.elec / d * frac; r.otherOpex = c.otherOpex / d * frac; r.staff = c.staff / d * frac;
  r.fixed = r.occupancy + r.elec + r.otherOpex + r.staff;
  r.ebitda = r.contribution - r.fixed;
  r.cashIn = t.entry + r.passes + r.cards + t.ptCash + t.rentals + r.addOns; r.takings = t.entry + r.passes + r.cards + t.ptCash + t.rentals; r.deferredChange = t.ptCash - r.ptEarned;   // takings: cash through the till, estimated add-ons excluded
  return r;
}
// field-wise sum of a P&L function over the remaining days of the month
function projectRest(days, perDay) {
  const out = {};
  for (const d of days) { const r = perDay(d); for (const k in r) if (typeof r[k] === 'number') out[k] = (out[k] || 0) + r[k]; }
  return out;
}
// below EBITDA for a month: depreciation, income tax on positive EBIT, net profit, and years to pay back the capex at this EBITDA
function belowEbitda(ebitdaMonth, c = COSTS, interest = 0) {   // interest on the bank loan sits below EBIT (A2); tax on what is left
  const dep = c.depYear / 12, ebit = ebitdaMonth - dep, tax = Math.max(0, ebit - interest) * c.tax;
  return { dep, ebit, interest, tax, netProfit: ebit - interest - tax, paybackYears: ebitdaMonth > 0 ? c.capex / (12 * ebitdaMonth) : Infinity };
}
// ================================================================ financing (B3): own money and a bank loan repaid in equal monthly instalments
// 3.5% a year: commercial SME loans run about 3–4%; Taiwan's youth start-up loan is about 2.3% (postal 2-year deposit rate + 0.575%)
const FIN = { own: 6e6, loan: 6e6, rate: 3.5, years: 7 };
function loanPayment(principal, ratePct, years) {
  const n = Math.round(years * 12), r = ratePct / 1200;
  if (principal <= 0 || n <= 0) return 0;
  return r === 0 ? principal / n : principal * r / (1 - Math.pow(1 + r, -n));
}
function loanMonth(balance, ratePct, payment) {
  const interest = Math.max(0, balance) * ratePct / 1200, principal = Math.max(0, Math.min(balance, payment - interest));
  return { interest, principal, balance: balance - principal };
}
// ================================================================ monthly arithmetic from the parameter book (same model as the parameter map) and a sensitivity ranking
// k-values are NT$ thousands per month; scale = PT, rentals and add-ons grow with people at the peak
const MONTH_BASE = { peak: 35, stay: 70, off: 1.2, pk: 1.5, vpu: 6, churn: 6, ptS: 130, ptP: 1560, share: 50, rentals: 60, rentP: 250, otherRev: 46,
  area: 115, rentRate: 1100, elec: 66, otherOpex: 87, staff: 210, cardPct: 1, mktPct: 3, scale: true };
const MONTH_RANGES = { peak: [25, 45], off: [1.0, 1.5], otherOpex: [44, 150], otherRev: [11, 121], ptS: [80, 200], rentRate: [900, 1400], staff: [159, 226], area: [90, 150], elec: [36, 104], share: [40, 60] };
function monthArithmetic(x) {
  const r = {}, d = PT.daysPerMonth;
  r.ph = 44.4 * x.peak; r.blend = 0.704 * x.off + 0.296 * x.pk; r.entry = r.ph * 60 * r.blend * d / 7;
  r.visits = r.ph * d / 7 * 60 / x.stay; r.actives = r.visits / x.vpu; r.newu = r.actives * x.churn / 100; r.card = r.newu * 100;
  const k = x.scale ? x.peak / 35 : 1;
  r.pt = x.ptS * k * x.ptP; r.rent = x.rentals * k * x.rentP; r.other = x.otherRev * 1000 * k;
  r.gross = r.entry + r.card + r.pt + r.rent + r.other; r.net = r.gross / 1.05;
  r.coach = r.pt * (1 - x.share / 100); r.varc = r.net * (x.mktPct + x.cardPct) / 100;
  r.occ = x.area * (x.rentRate + 70); r.fixed = r.occ + (x.elec + x.otherOpex + x.staff) * 1000;
  r.ebitda = r.net - r.coach - r.varc - r.fixed;
  return r;
}
function sensitivity(base, ranges) {
  const b = monthArithmetic(base).ebitda;
  return Object.keys(ranges).map(key => {
    const lo = monthArithmetic({ ...base, [key]: ranges[key][0] }).ebitda, hi = monthArithmetic({ ...base, [key]: ranges[key][1] }).ebitda;
    return { key, lo, hi, base: b, swing: Math.abs(hi - lo) };
  }).sort((p, q) => q.swing - p.swing);
}
// ================================================================ itemised fixed costs for the books (P6.3–P6.12, P7.8, P8.1–P8.5, P10.3–P10.6)
// monthly base values per line; a period's group total is split by these shares, so the lines always sum to the simulated totals
// owner 2026-11-15: the roster is people, not one cost: a manager, full-time desk staff, part-time desk hours a week; insurance, pension, bonus and leave cover scale with pay
// balance 2026-11-20: an in-house coach is paid a retainer on the roster as well as the share of the PT they deliver, so a coach without clients costs money
const ROSTER = { manager: 43000, deskFT: 32000, deskPTh: 870, cleaner: 30000, coach: 10000, onTop: (27000 + 15200) / 141800 };   /* cleaner: just above Taiwan's 2026 minimum wage (NT$29,500 a month), owner 2026-11-16 */
function rosterLines(r) { const pay = { manager: ROSTER.manager, deskFT: ROSTER.deskFT * r.deskFT, deskPT: ROSTER.deskPTh * r.deskPTh, coaches: ROSTER.coach * (r.coaches || 0), cleaners: ROSTER.cleaner * (r.cleaners || 0) }, base = pay.manager + pay.deskFT + pay.deskPT + pay.coaches + pay.cleaners;
  return { ...pay, statutory: base * 27000 / 141800, bonusLeave: base * 15200 / 141800 }; }
function rosterCost(r) { return Math.round(Object.values(rosterLines(r)).reduce((s, v) => s + v, 0)); }
function coachPay(n) { return Math.round(ROSTER.coach * Math.max(0, n) * (1 + ROSTER.onTop)); }
// balance 2026-11-20: the roster a new gym opens with follows its floor. The 115-ping sample needs 120 desk hours a week (2 full-time and 40 part-time
// hours) and 2 coaches; desk hours grow with the floor to the power 0.75 (a bigger hall needs more hands, not in proportion), two thirds of them
// full-time; coaches follow the crowd at the weekly peak
function defaultRoster(ping) {
  const hours = Math.round(120 * Math.pow(ping / 115, 0.75) / 10) * 10, deskFT = Math.min(6, Math.max(1, Math.round(hours / 60)));
  return { deskFT, deskPTh: Math.max(0, hours - 40 * deskFT), coaches: Math.max(1, Math.round(2 * peakForPing(ping) / DEMAND.peak)), cleaners: 0 };
}
function deskBase(ping) { return rosterCost({ ...defaultRoster(ping), coaches: 0 }); }   /* what staffAdj compares the desk roster with */
const COST_LINES = {
  premises: [['rent', 0], ['mgmt', 0], ['elec', 0], ['water', 2000]],   // rent and management split occupancy by rate; electricity is its own total
  staff: [['manager', 43000], ['deskFT', 64000], ['deskPT', 34800], ['coaches', 20000], ['statutory', 30808], ['bonusLeave', 17344]],   /* the sample roster with its 2 coaches' retainers */
  floor: [['cleaning', 20000], ['maintenance', 23000], ['itSecurity', 14000], ['supplies', 9000]],
  compliance: [['insurance', 5000], ['fire', 5800], ['music', 2700], ['bookkeeping', 5000], ['aed', 600]]
};
function itemiseFixed(p, c = COSTS, staffLines = COST_LINES.staff) {   /* staffLines: the roster in force, so the staff lines follow the people hired */
  const sum = (rows) => rows.reduce((s, [, v]) => s + v, 0), water = COST_LINES.premises[3][1];
  const other = water + sum(COST_LINES.floor) + sum(COST_LINES.compliance), staffBase = sum(staffLines) || 1;
  const occ = p.occupancy || 0, rr = c.rentRate + c.mgmtPerPing, oo = p.otherOpex || 0, st = p.staff || 0;
  const out = { premises: { rent: occ * c.rentRate / rr, mgmt: occ * c.mgmtPerPing / rr, elec: p.elec || 0, water: oo * water / other }, staff: {}, floor: {}, compliance: {} };
  for (const [k, v] of staffLines) out.staff[k] = st * v / staffBase;
  for (const g of ['floor', 'compliance']) for (const [k, v] of COST_LINES[g]) out[g][k] = oo * v / other;
  const tot = (o) => Object.values(o).reduce((s, v) => s + v, 0);
  out.totals = { premises: tot(out.premises), staff: tot(out.staff), floor: tot(out.floor), compliance: tot(out.compliance) };
  return out;
}
// depreciation split: equipment (≈5.0M over ≈10 years) and fit-out (≈5.5M over ≈7 years), P9.1, P9.2, P9.8, P9.10
const DEP_SPLIT = { equipment: 0.5 / 1.3, fitout: 0.8 / 1.3 };
// benchmarks for the books (research report: P6–P9 comparators, density section; a large chain's top monthly price)
const BENCH = { occupancy: [0.159, 0.18], ebitda: [0.186, 0.23], staffNote: 0.24, revPerPing: [5000, 10000], bigBoxMonthly: 1088 };
// what a price change does, by the parameter-book arithmetic: visits (existing users' elasticity), fee per typical 70-minute visit (capped),
// visit takings (their product), and what a heavy user (12 visits of 90 minutes a month) would pay at the new prices
function pricePreview(o, n) {
  const fee = (p, min) => Math.min(p.cap, Math.round(min * blendedPrice(p.off, p.peak)));
  const visits = priceVisitMult(blendedPrice(n.off, n.peak), DEMAND_RESP.eExisting) / priceVisitMult(blendedPrice(o.off, o.peak), DEMAND_RESP.eExisting);
  const feePerVisit = fee(n, 70) / fee(o, 70);
  return { visits, feePerVisit, takings: visits * feePerVisit, heavyMonth: 12 * fee(n, 90) };
}
// money as the learner sees it (Plan 8b, owner): $ (no NT$) with every digit — the books are not rounded — a real minus sign, – when missing
function money(v) {
  if (v == null || !Number.isFinite(v)) return '$–';
  const r = Math.round(v); return (r < 0 ? '−' : '') + '$' + Math.abs(r).toLocaleString('en-US');
}
// inventory prices (the builder's equipment and build costs): $ with K / M and three significant figures
function moneyK(v) {
  if (v == null || !Number.isFinite(v)) return '$–';
  const a = Math.abs(v), s = v <= -0.5 ? '−' : '', r3 = (x) => x >= 100 ? Math.round(x) : x >= 10 ? Math.round(x * 10) / 10 : Math.round(x * 100) / 100;
  if (a < 999.5) return s + '$' + Math.round(a);
  const k = r3(a / 1e3); if (k < 1000) return s + '$' + k + 'K';
  return s + '$' + r3(a / 1e6) + 'M';
}
// ================================================================ first-minute polish: a day or a month in one plain sentence. r: P&L lines; ebitda is operating profit
// (before the loan and depreciation), so the sentence names the operating costs that drove it, not the loan.
function roundAbout(x) { const a = Math.abs(x); return a < 10000 ? Math.round(a / 100) * 100 : Math.round(a / 1000) * 1000; }
function topCosts(r) { return [['rent', '租金', r.occupancy], ['staff', '人事', r.staff], ['running costs', '水電雜支', (r.elec || 0) + (r.otherOpex || 0)], ['coach pay', '教練分潤', r.coach]].filter(c => c[2] > 0).sort((a, b) => b[2] - a[2]).slice(0, 2); }
function verdictText(r, span = 'day') {
  const amt = '$' + roundAbout(r.ebitda).toLocaleString('en-US'), W = span === 'month' ? ['This month', '本月', 'the month', '當月'] : ['Today', '今天', 'the day', '當天'];
  const top = topCosts(r), en = top.map(c => c[0]).join(' and '), zh = top.map(c => c[1]).join('和');
  if (roundAbout(r.ebitda) === 0) return { sign: 0, en: `${W[0]} broke even.`, zh: `${W[1]}打平。` };
  if (r.ebitda < 0) return { sign: -1, en: `${W[0]} lost about ${amt}: ${en} cost more than ${W[2]} brought in.`, zh: `${W[1]}虧了約 ${amt}：${zh}比${W[3]}的收入還多。` };
  return { sign: 1, en: `${W[0]} made about ${amt} after ${en}.`, zh: `扣掉${zh}後，${W[1]}賺了約 ${amt}。` };
}
function verdictShort(e) { const a = roundAbout(e); return a === 0 ? '±$0' : (e < 0 ? '−' : '+') + '$' + a.toLocaleString('en-US'); }   /* the day's result in the HUD and under the day's pop */
function verdictLive(e, r) { const a = roundAbout(e), m = '$' + a.toLocaleString('en-US'), t = r ? topCosts(r) : [], ce = t.length ? ` (${t.map(c => c[0]).join(', ')})` : '', cz = t.length ? `（${t.map(c => c[1]).join('、')}）` : ''; return a === 0 ? { en: 'Today: broke even', zh: '今日打平', sign: 0 } : e < 0 ? { en: `Today: lost ${m}${ce}`, zh: `今日虧 ${m}${cz}`, sign: -1 } : { en: `Today: made ${m}`, zh: `今日賺 ${m}`, sign: 1 }; }   /* judge round 1: one labelled result, not two bare numbers */
