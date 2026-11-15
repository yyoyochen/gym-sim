import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSrc } from './load.mjs';

const B = loadSrc(['src/a1_params.js', 'src/a2_pnl.js', 'src/a3_build.js'], ['CELL', 'PRESETS', 'SAMPLE_COUNTS', 'EQUIP_PRICE', 'presetCounts', 'checkPlot', 'buildCost', 'COSTS', 'monthlyRunCost', 'runwayMonths', 'GOALS', 'goalStatus']);

test('presets are 80, 160 and 320 坪 rectangles of 1.82 m cells', () => {
  assert.equal(B.CELL, 1.82);
  assert.deepEqual(['S', 'M', 'L'].map(k => B.PRESETS[k].w * B.PRESETS[k].d), [80, 160, 320]);
});

test('S costs with the researched defaults: fit-out 35k a 坪 plus a 1.0M lump sum, deposit 3 months, 1 rent-free month', () => {
  const c = B.buildCost({ w: 10, d: 8, counts: B.presetCounts(10, 8) });
  assert.equal(c.ping, 80); assert.equal(c.rentMonth, 93600); assert.equal(c.fitOut, 80 * 35000 + 1000000); assert.equal(c.deposit, 3 * 93600); assert.equal(c.rentFreeMonths, 1);
});

test('capex is fit-out plus equipment; both depreciate over 5 years', () => {
  const c = B.buildCost({ w: 16, d: 10, counts: B.presetCounts(16, 10) });
  assert.equal(c.capex, c.fitOut + c.equipment);
  assert.ok(Math.abs(c.depYear - (c.fitOut / 5 + c.equipment / 5)) < 1e-6);
  assert.equal(c.equipment, c.items.reduce((s, it) => s + it.n * it.price, 0));
});

test('the sample counts price to $3.68M of equipment at the researched unit prices', () => {
  const c = B.buildCost({ w: 16, d: 10, counts: B.SAMPLE_COUNTS });
  assert.equal(c.equipment, 3680000);
  assert.deepEqual({ ...B.EQUIP_PRICE }, { cardio: 105000, machines: 130000, racks: 120000, plats: 65000, benches: 20000, plates: 90000 });
});

test('bigger presets get more equipment', () => {
  const s = B.presetCounts(10, 8), l = B.presetCounts(20, 16);
  for (const k of ['cardio', 'machines', 'racks', 'benches']) assert.ok(l[k] > s[k], k);
  for (const k of Object.keys(s)) assert.ok(s[k] >= 1, k);
});

test('rules: at least 60 坪, at least 8 x 7 cells, at most 24 x 18', () => {
  assert.equal(B.checkPlot(10, 8).ok, true);
  assert.equal(B.checkPlot(7, 8).ok, false);           // 56 坪 and too narrow
  assert.equal(B.checkPlot(10, 6).ok, false);          // too shallow for the washrooms
  assert.equal(B.checkPlot(25, 10).ok, false);         // too wide for the site
  assert.equal(B.checkPlot(24, 18).ok, true);
  assert.deepEqual([...B.checkPlot(7, 8).rules.filter(r => !r.ok).map(r => r.key)].sort(), ['area', 'size']);
});

test('running cost a month: rent, electricity, other fixed costs, staff and the loan payment', () => {
  assert.equal(B.monthlyRunCost(187200, 184000, 53770), 187200 + 66000 + 87100 + 184000 + 53770);
});
test('runway: months of running costs the opening cash covers; negative cash gives a negative runway', () => {
  assert.equal(B.runwayMonths(1.2e6, 4e5), 3); assert.equal(B.runwayMonths(-4e5, 4e5), -1); assert.equal(B.runwayMonths(1, 0), Infinity);
});
test('three goals with plain labels, attainable with effort (owner 2026-11-15: no profit in month 1)', () => {
  assert.equal(B.GOALS.map(g => g[1]).join(' | '), "Reach 500 members by the end of month 3 | Don't run out of cash in year 1 | Keep at least 92% of members every month");
});
test('goal members500: on with members so far, met once a month 1–3 reaches 500, missed after month 3 without it', () => {
  const base = { months: [], mtdEbitda: 0, monthIndex: 0, cashOut: false, lapsedNow: 0, startPool: 100, poolNow: 291 };
  assert.equal(B.goalStatus('members500', base).state, 'on'); assert.equal(B.goalStatus('members500', base).text.en, '291 of 500 · month 1 of 3');
  assert.equal(B.goalStatus('members500', { ...base, poolNow: 502 }).state, 'met');
  const mo = (n) => ({ pnl: { ebitda: 0 }, members: n, lapsed: 10 });
  assert.equal(B.goalStatus('members500', { ...base, months: [mo(291), mo(404), mo(488)], monthIndex: 3, poolNow: 560 }).state, 'missed');
  assert.equal(B.goalStatus('members500', { ...base, months: [mo(291), mo(510), mo(488)], monthIndex: 3, poolNow: 560 }).state, 'met');
});
test('goal cash12 is missed once cash runs out; goal keep92 is missed by a month keeping under 92%', () => {
  const base = { months: [], mtdEbitda: 0, monthIndex: 0, cashOut: true, lapsedNow: 0, startPool: 100 };
  assert.equal(B.goalStatus('cash12', base).state, 'missed');
  assert.equal(B.goalStatus('cash12', { ...base, cashOut: false }).text.en, 'month 1 of 12');
  assert.equal(B.goalStatus('keep92', { ...base, cashOut: false, months: [{ pnl: { ebitda: 0 }, members: 90, lapsed: 10 }] }).state, 'missed');
  assert.equal(B.goalStatus('keep92', { ...base, cashOut: false, months: [{ pnl: { ebitda: 0 }, members: 93, lapsed: 7 }] }).state, 'on');
  assert.equal(B.goalStatus('keep92', { ...base, cashOut: false, lapsedNow: 3, startPool: 100 }).text.en, '97% kept so far');
});
test('review I5: a gym that opens overdrawn has already missed the cash goal', () => {
  const s0 = { months: [], mtdEbitda: 0, monthIndex: 0, cashOut: false, lapsedNow: 0, startPool: 100, openCash: -6.2e6 };
  assert.equal(B.goalStatus('cash12', s0).state, 'missed');
});
test('review I6: year-1 goals only look at the first 12 months', () => {
  const good = { pnl: { ebitda: 1 }, members: 99, lapsed: 1 }, bad = { pnl: { ebitda: 1 }, members: 80, lapsed: 20 };
  const yr = Array.from({ length: 12 }, () => good);
  const base = { months: [...yr, bad, good, good], mtdEbitda: 0, monthIndex: 15, cashOut: true, cashOutMonth: 14, lapsedNow: 0, startPool: 100 };
  assert.equal(B.goalStatus('cash12', base).state, 'met');
  assert.equal(B.goalStatus('cash12', { ...base, cashOutMonth: 5 }).state, 'missed');
  assert.equal(B.goalStatus('keep92', base).state, 'met');
});
