import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSrc } from './load.mjs';

const P = loadSrc(['src/a1_params.js'], ['PT_BASE', 'ptPacks', 'ptDemandMult', 'PASS', 'payPerUseMonth', 'memberTaste', 'wantsPass', 'passMarket', 'joinPrice', 'blendedPrice', 'DEMAND_RESP']);
const base = { off: 1.2, peak: 1.5, cap: 180, perMinOn: true, monthlyOn: true, monthly: 1500 };
const plain = (x) => JSON.parse(JSON.stringify(x));

test('PT packs at the base session price are today\'s price list', () => {
  assert.deepEqual(plain(P.ptPacks()), [
    { n: 8, price: 13520, parts: [13520] },
    { n: 16, price: 25440, parts: [13520, 11920] },
    { n: 24, price: 35760, parts: [13520, 11920, 10320] }]);
});

test('PT packs follow the session price: bigger packs stay $100 and $200 a session cheaper, instalments add up', () => {
  for (const p of [1000, 1500, 2000, 3000]) {
    const k = P.ptPacks(p);
    assert.equal(k[0].price, 8 * p); assert.equal(k[1].price, 16 * (p - 100)); assert.equal(k[2].price, 24 * (p - 200));
    for (const pk of k) { assert.equal(pk.parts.reduce((s, v) => s + v, 0), pk.price); assert.ok(pk.parts.every(v => v > 0)); }
  }
});

test('PT demand: unchanged at the base price, fewer buyers when dearer, more when cheaper, never wild', () => {
  assert.equal(P.ptDemandMult(P.PT_BASE), 1);
  assert.ok(P.ptDemandMult(2000) < 1 && P.ptDemandMult(1400) > 1);
  for (const p of [1000, 3000]) { const m = P.ptDemandMult(p); assert.ok(m > 0.3 && m < 2, String(m)); }
});

test('pay-per-use month: visits times the capped fee of a 70-minute visit', () => {
  assert.equal(P.payPerUseMonth(6, 1.2, 1.5, 180), 6 * 90);
  assert.equal(P.payPerUseMonth(10, 2.5, 2.5, 100), 10 * 100);
});

test('member taste is fixed per member and spread over -1..1', () => {
  const t = Array.from({ length: 2000 }, (_, i) => P.memberTaste(i));
  assert.equal(P.memberTaste(7), P.memberTaste(7));
  assert.ok(t.every(v => v >= -1 && v <= 1));
  const mean = t.reduce((s, v) => s + v, 0) / t.length; assert.ok(Math.abs(mean) < 0.05, String(mean));
});

test('nobody is on a monthly pass while the pass is switched off', () => {
  assert.equal(P.wantsPass(30, 1, { ...base, monthlyOn: false }), false);
});

test('with pay-per-minute switched off, a member who comes once a month does not buy the pass and a daily one does', () => {
  assert.equal(P.wantsPass(1, 1, { ...base, perMinOn: false }), false);
  assert.equal(P.wantsPass(30, 1, { ...base, perMinOn: false }), true);
});

test('with both on, frequent members take the pass and occasional ones pay by the minute', () => {
  assert.equal(P.wantsPass(30, 1, base), true);     // 30 visits x $90 = $2,700 against $1,500
  assert.equal(P.wantsPass(3, 1, base), false);     // 3 visits x $90 = $270
  const share = (price) => Array.from({ length: 1000 }, (_, i) => P.wantsPass(12, i, { ...base, monthly: price })).filter(Boolean).length / 1000;
  assert.ok(share(1300) > share(1620) && share(1620) > share(1950), 'a cheaper pass wins more of the 12-visit members');
  assert.ok(share(1620) > 0.3 && share(1620) < 0.7, 'at 1.5 times their month by the minute about half of them switch');
});

test('the people a pass-only gym can win: everyone while the minute price is offered, fewer the dearer the pass', () => {
  assert.equal(P.passMarket(base), 1); assert.equal(P.passMarket({ ...base, monthlyOn: false }), 1);
  const s = (monthly) => P.passMarket({ ...base, perMinOn: false, monthly });
  assert.ok(s(600) > s(1000) && s(1000) > s(1500) && s(1500) > 0);
  assert.ok(s(1000) > 0.5 && s(1000) < 0.72, String(s(1000)));   // about three in five at $1,000
  assert.ok(s(100) > 0.99);
});

test('the price a newcomer weighs: the minute price, or the pass when that is all there is', () => {
  const b = P.blendedPrice(1.2, 1.5);
  assert.ok(Math.abs(P.joinPrice({ ...base, monthlyOn: false }) - b) < 1e-9);
  assert.ok(Math.abs(P.joinPrice(base) - b) < 1e-9, 'a pass dearer than a typical month of visits changes nothing for newcomers');
  assert.ok(P.joinPrice({ ...base, monthly: 400 }) < b, 'a pass cheaper than a typical month of visits pulls people in');
  assert.ok(Math.abs(P.joinPrice({ ...base, perMinOn: false }) - b) < 1e-9, 'a dear pass-only gym turns newcomers away one by one, not through this price');
  assert.ok(Math.abs(P.joinPrice({ ...base, perMinOn: false, monthly: 540 }) - b) < 1e-9);
});

test('the weekly peak and the door limit follow the floor area (research 2026-11-20): 35 people and room for 60 at 115 ping', () => {
  const B = loadSrc(['src/a1_params.js'], ['peakForPing', 'capForPing']);
  assert.deepEqual([80, 115, 160, 320].map(B.peakForPing), [24, 35, 49, 97]);
  assert.deepEqual([80, 115, 160, 320].map(B.capForPing), [42, 60, 83, 167]);
});

const R = loadSrc(['src/a1_params.js', 'src/a2_pnl.js', 'src/a3_build.js'], ['monthReport', 'settingChanges', 'goalStatus', 'membersTarget']);
const month = (o) => ({ name: 'Nov', year: 2026, days: 30.4, members: 220, joined: 60, lapsed: 30, returned: 10, visits: 1000, cashEnd: 1e6, cashIn: 100000, cashOut: 300000,
  pnl: { net: 150000, contribution: 100000, fixed: 250000, ebitda: -150000 }, ...o });

test('month report: members at the start, kept share, break-even members and runway', () => {
  const r = R.monthReport(month({}), null);
  assert.equal(r.startMembers, 180);                       // 220 - 60 joined - 10 returned + 30 lapsed
  assert.equal(r.kept, 1 - 30 / 250);
  assert.equal(r.breakEven, 500);                          // 100,000 from an average of 200 members is $500 each; $250,000 of fixed costs needs 500
  assert.equal(r.runway, 5);                               // $1.0M left, $200,000 a month going out
  assert.equal(r.visitsPerMember, 5);
});

test('month report: a short first month is scaled to a full month; no runway when cash grows; no break-even when members lose money each', () => {
  const short = R.monthReport(month({ days: 15.2, cashIn: 50000, cashOut: 150000, pnl: { net: 75000, contribution: 50000, fixed: 125000, ebitda: -75000 } }), null);
  assert.equal(short.runway, 5); assert.equal(short.breakEven, 500);
  assert.equal(R.monthReport(month({ cashIn: 400000 }), null).runway, null);
  assert.equal(R.monthReport(month({ pnl: { net: 1, contribution: -5, fixed: 250000, ebitda: -250005 } }), null).breakEven, null);
});

test('month report compares with the month before', () => {
  const r = R.monthReport(month({ members: 300, pnl: { net: 200000, contribution: 150000, fixed: 250000, ebitda: -100000 } }), month({}));
  assert.equal(r.prev.ebitda, -150000); assert.equal(r.prev.members, 220); assert.equal(r.better, true);
});

test('setting changes: only what moved, with before and after', () => {
  const a = { priceOff: 1.2, pricePeak: 1.5, coaches: 2, monthlyOn: false, pieces: 40 }, b = { ...a, priceOff: 1.45, coaches: 3, monthlyOn: true };
  assert.deepEqual(JSON.parse(JSON.stringify(R.settingChanges(a, b))), [{ k: 'priceOff', from: 1.2, to: 1.45 }, { k: 'coaches', from: 2, to: 3 }, { k: 'monthlyOn', from: false, to: true }]);
  assert.equal(R.settingChanges(a, { ...a }).length, 0);
});

test('members goal: the target follows the gym (55% of its steady membership, to the nearest 10); a first month under 15 days does not count as one of the three', () => {
  assert.equal(R.membersTarget(662, 'new'), 360); assert.equal(R.membersTarget(1351, 'new'), 740); assert.equal(R.membersTarget(965, 'existing'), 500);
  const m = (members, days) => ({ members, days, lapsed: 0 });
  const s = (months, poolNow) => ({ months, poolNow, monthIndex: months.length, target: 360 });
  assert.equal(R.goalStatus('members500', s([m(190, 11), m(250, 31), m(300, 31)], 330)).state, 'on');      // the 11-day month is not one of the three
  assert.equal(R.goalStatus('members500', s([m(190, 11), m(250, 31), m(300, 31), m(340, 30)], 345)).state, 'missed');
  assert.equal(R.goalStatus('members500', s([m(190, 11), m(250, 31), m(300, 31), m(365, 30)], 365)).state, 'met');
  assert.equal(R.goalStatus('members500', s([m(190, 11)], 361)).state, 'met');
  assert.equal(R.goalStatus('members500', { months: [m(400, 30), m(450, 31), m(480, 30)], poolNow: 480, monthIndex: 3 }).state, 'missed');   // no target given: 500, as before
});
