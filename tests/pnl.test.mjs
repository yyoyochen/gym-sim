import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSrc } from './load.mjs';

const NAMES = ['PT', 'COSTS', 'dayFraction', 'fixedPerDay', 'dailyPnl'];
const load = () => loadSrc(['src/a1_params.js', 'src/a2_pnl.js'], NAMES);
const P = load();
const zero = { entry: 0, ptSessions: 0, ptCash: 0, rentals: 0 };

test('base month ÷ 30.4 gives about NT$4,794 EBITDA a day', () => {
  const r = P.dailyPnl({ entry: 17184, ptSessions: 130 / 30.4, ptCash: 0, rentals: 493 }, 1);
  assert.ok(Math.abs(r.ebitda - 4794) < 3, String(r.ebitda));
  assert.ok(Math.abs(r.fixed - 471650 / 30.4) < 0.01);
});

test('VAT is taken out of tax-inclusive gross', () => {
  const r = P.dailyPnl({ ...zero, entry: 10500 }, 0);
  assert.equal(r.net, 10000);
  assert.equal(r.vat, 500);
});

test('nothing fixed accrues before opening', () => {
  const r = P.dailyPnl(zero, 0);
  assert.equal(r.fixed, 0);
  assert.equal(r.addOns, 0);
  assert.equal(r.ebitda, 0);
});

test('dayFraction clamps', () => {
  assert.equal(P.dayFraction(6 * 3600, 7 * 3600, 24 * 3600), 0);
  assert.equal(P.dayFraction(15.5 * 3600, 7 * 3600, 24 * 3600), 0.5);
  assert.equal(P.dayFraction(25 * 3600, 7 * 3600, 24 * 3600), 1);
});

test('PT cash and PT earned differ by the change in sessions owed', () => {
  const r = P.dailyPnl({ ...zero, ptSessions: 3, ptCash: 13520 }, 0);
  assert.equal(r.ptEarned, 4680);
  assert.equal(r.deferredChange, 13520 - 4680);
  assert.equal(r.coach, 2340);
});

test('higher rent lowers EBITDA by area × Δrate ÷ 30.4', () => {
  const Q = load();
  const a = Q.dailyPnl(zero, 1).ebitda;
  Q.COSTS.rentRate += 100;
  const b = Q.dailyPnl(zero, 1).ebitda;
  assert.ok(Math.abs((a - b) - 115 * 100 / 30.4) < 1e-6);
});

test('member cards count as revenue and cash', () => {
  const a = P.dailyPnl(zero, 0), b = P.dailyPnl({ ...zero, cards: 200 }, 0);
  assert.equal(b.gross - a.gross, 200);
  assert.equal(b.cashIn - a.cashIn, 200);
  assert.equal(b.cards, 200);
});

test('belowEbitda base: depreciation, tax, net profit and payback', () => {
  const Q = loadSrc(['src/a1_params.js', 'src/a2_pnl.js'], ['COSTS', 'belowEbitda']);
  const r = Q.belowEbitda(150000, Q.COSTS);
  assert.ok(Math.abs(r.dep - 1.3e6 / 12) < 1e-6);
  assert.ok(Math.abs(r.ebit - (150000 - 1.3e6 / 12)) < 1e-6);
  assert.ok(Math.abs(r.tax - 0.2 * (150000 - 1.3e6 / 12)) < 1e-6);
  assert.ok(Math.abs(r.netProfit - 0.8 * (150000 - 1.3e6 / 12)) < 1e-6);
  assert.ok(Math.abs(r.paybackYears - 10.5e6 / (12 * 150000)) < 1e-9);
});

test('belowEbitda loss', () => {
  const Q = loadSrc(['src/a1_params.js', 'src/a2_pnl.js'], ['COSTS', 'belowEbitda']);
  const r = Q.belowEbitda(-20000, Q.COSTS);
  assert.equal(r.tax, 0);
  assert.equal(r.paybackYears, Infinity);
  assert.ok(Number.isFinite(r.netProfit) && r.netProfit < 0);
});

test('monthArithmetic base matches the parameter map (≈ NT$150.7k EBITDA)', () => {
  const Q = loadSrc(['src/a1_params.js', 'src/a2_pnl.js'], ['MONTH_BASE', 'monthArithmetic']);
  const r = Q.monthArithmetic(Q.MONTH_BASE);
  assert.ok(Math.abs(r.ebitda - 150700) < 300, String(r.ebitda));
  assert.ok(Math.abs(r.entry - 522400) < 1500, String(r.entry));
});

test('sensitivity ranks people at the peak first', () => {
  const Q = loadSrc(['src/a1_params.js', 'src/a2_pnl.js'], ['MONTH_BASE', 'MONTH_RANGES', 'sensitivity']);
  const rows = Q.sensitivity(Q.MONTH_BASE, Q.MONTH_RANGES);
  assert.equal(rows[0].key, 'peak');
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i - 1].swing >= rows[i].swing);
  assert.ok(rows.every(r => Number.isFinite(r.lo) && Number.isFinite(r.hi)));
});

// ---------------------------------------------------------------- Plan 6: itemised costs, tariff split, takings, price preview
const Q = loadSrc(['src/a1_params.js', 'src/a2_pnl.js'], ['PT', 'COSTS', 'dailyPnl', 'COST_LINES', 'itemiseFixed', 'pricePreview', 'blendedPrice']);
const baseDay = () => Q.dailyPnl({ entry: 17184, ptSessions: 130 / 30.4, ptCash: 0, rentals: 493 }, 1);

test('itemiseFixed sums to the fixed costs and splits rent, management and staff by their bases', () => {
  const r = baseDay(), it = Q.itemiseFixed(r), t = it.totals;
  assert.ok(Math.abs(t.premises + t.staff + t.floor + t.compliance - r.fixed) < 1e-6);
  assert.ok(Math.abs(it.premises.rent / it.premises.mgmt - 1100 / 70) < 1e-9);
  assert.ok(Math.abs(it.staff.manager - r.staff * 43000 / 184000) < 1e-9);
});

test('cost line bases add up to the parameter book totals', () => {
  const sum = (rows) => rows.reduce((s, [, v]) => s + v, 0);
  assert.equal(sum(Q.COST_LINES.staff), 184000);
  assert.equal(sum(Q.COST_LINES.premises.filter(([k]) => k === 'water')) + sum(Q.COST_LINES.floor) + sum(Q.COST_LINES.compliance), 87100);
});

test('visit fees split by tariff, and takings are the cash through the till', () => {
  const r = Q.dailyPnl({ entry: 1000, entryPeak: 300, cards: 0, ptSessions: 0, ptEarned: 0, ptCash: 500, rentals: 250 }, 1);
  assert.equal(r.entryOff, 700); assert.equal(r.entryPeak, 300); assert.equal(r.takings, 1750);
});

test('pricePreview: unchanged prices change nothing; dearer prices mean fewer visits but more takings', () => {
  const same = Q.pricePreview({ off: 1.2, peak: 1.5, cap: 180 }, { off: 1.2, peak: 1.5, cap: 180 });
  for (const k of ['visits', 'feePerVisit', 'takings']) assert.ok(Math.abs(same[k] - 1) < 1e-12, k);
  const up = Q.pricePreview({ off: 1.2, peak: 1.5, cap: 180 }, { off: 1.5, peak: 1.8, cap: 180 });
  assert.ok(up.visits < 1 && up.feePerVisit > 1 && up.takings > 1, JSON.stringify(up));
  assert.equal(same.heavyMonth, 12 * Math.min(180, Math.round(90 * Q.blendedPrice(1.2, 1.5))));
});

// ---------------------------------------------------------------- Plan 7: loan instalments and interest
const F = loadSrc(['src/a1_params.js', 'src/a2_pnl.js'], ['COSTS', 'FIN', 'loanPayment', 'loanMonth', 'belowEbitda']);
test('loanPayment preset: NT$6M at 3.5% over 7 years is about NT$80,639 a month', () => {
  assert.ok(Math.abs(F.loanPayment(6e6, 3.5, 7) - 80639) <= 1, String(F.loanPayment(6e6, 3.5, 7)));
  assert.deepEqual([F.FIN.own, F.FIN.loan, F.FIN.rate, F.FIN.years], [6e6, 6e6, 3.5, 7]);
});
test('loanPayment zero rate and no loan', () => {
  assert.equal(F.loanPayment(840000, 0, 7), 10000); assert.equal(F.loanPayment(0, 3.5, 7), 0);
});
test('loanMonth first month: interest NT$17,500, the rest repays principal', () => {
  const p = F.loanPayment(6e6, 3.5, 7), m = F.loanMonth(6e6, 3.5, p);
  assert.ok(Math.abs(m.interest - 17500) < 1e-6); assert.ok(Math.abs(m.principal - 63139) <= 1); assert.ok(Math.abs(m.balance - (6e6 - m.principal)) < 1e-6);
});
test('the loan is paid off after 84 instalments', () => {
  const p = F.loanPayment(6e6, 3.5, 7); let b = 6e6; for (let i = 0; i < 84; i++) b = F.loanMonth(b, 3.5, p).balance;
  assert.ok(b < 1, String(b));
});
test('belowEbitda with interest: tax on profit after interest', () => {
  const r = F.belowEbitda(150000, F.COSTS, 17500), ebit = 150000 - 1.3e6 / 12;
  assert.ok(Math.abs(r.tax - 0.2 * (ebit - 17500)) < 1e-6); assert.ok(Math.abs(r.netProfit - (ebit - 17500) * 0.8) < 1e-6); assert.equal(r.interest, 17500);
});

// ---------------------------------------------------------------- Plan 8b: money as $ — full digits in the books, K / M only for inventory (the builder)
const MF = loadSrc(['src/a1_params.js', 'src/a2_pnl.js'], ['money', 'moneyK']);
test('money: $ with every digit, a real minus sign, – for missing', () => {
  const cases = [[0, '$0'], [850, '$850'], [121198.4, '$121,198'], [10500000, '$10,500,000'], [-4218800, '−$4,218,800'], [-0.2, '$0'], [NaN, '$–'], [undefined, '$–']];
  for (const [v, want] of cases) assert.equal(MF.money(v), want, String(v));
});
test('moneyK: inventory prices as $ with K and M, three significant figures', () => {
  const cases = [[0, '$0'], [850, '$850'], [999, '$999'], [1000, '$1K'], [1234, '$1.23K'], [12345, '$12.3K'], [121198, '$121K'], [999600, '$1M'], [1920000, '$1.92M'], [10500000, '$10.5M'], [-4218800, '−$4.22M'], [NaN, '$–']];
  for (const [v, want] of cases) assert.equal(MF.moneyK(v), want, String(v));
});
