import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSrc } from './load.mjs';

const P = loadSrc(['src/a1_params.js'], ['PT_BASE', 'ptPacks', 'ptDemandMult', 'PASS', 'payPerUseMonth', 'memberTaste', 'wantsPass', 'passChurnMult', 'joinPrice', 'blendedPrice', 'DEMAND_RESP']);
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

test('everybody is on the pass when pay-per-minute is switched off', () => {
  assert.equal(P.wantsPass(1, 1, { ...base, perMinOn: false }), true);
});

test('with both on, frequent members take the pass and occasional ones pay by the minute', () => {
  assert.equal(P.wantsPass(30, 1, base), true);     // 30 visits x $90 = $2,700 against $1,500
  assert.equal(P.wantsPass(3, 1, base), false);     // 3 visits x $90 = $270
  const share = (price) => Array.from({ length: 1000 }, (_, i) => P.wantsPass(12, i, { ...base, monthly: price })).filter(Boolean).length / 1000;
  assert.ok(share(900) > share(1100) && share(1100) > share(1300), 'a cheaper pass wins more of the 12-visit members');
  assert.ok(share(1080) > 0.3 && share(1080) < 0.7, 'at the break-even price about half of them switch');
});

test('forced onto a pass that costs more than their visits were worth, members leave faster, at most twice as fast', () => {
  assert.equal(P.passChurnMult(6, base), 1);                                  // pay-per-minute still offered
  assert.equal(P.passChurnMult(30, { ...base, perMinOn: false }), 1);         // a good deal for a frequent member
  const m = P.passChurnMult(3, { ...base, perMinOn: false }); assert.ok(m > 1 && m <= 2, String(m));
  assert.equal(P.passChurnMult(0.5, { ...base, perMinOn: false, monthly: 5000 }), 2);
});

test('the price a newcomer weighs: the minute price, or the pass when that is all there is', () => {
  const b = P.blendedPrice(1.2, 1.5);
  assert.ok(Math.abs(P.joinPrice({ ...base, monthlyOn: false }) - b) < 1e-9);
  assert.ok(Math.abs(P.joinPrice(base) - b) < 1e-9, 'a pass dearer than a typical month of visits changes nothing for newcomers');
  assert.ok(P.joinPrice({ ...base, monthly: 400 }) < b, 'a pass cheaper than a typical month of visits pulls people in');
  assert.ok(P.joinPrice({ ...base, perMinOn: false }) > b, 'a pass-only gym at $1,500 is dearer for a 6-visit newcomer');
  assert.ok(Math.abs(P.joinPrice({ ...base, perMinOn: false, monthly: 540 }) - b) < 1e-9);
});
