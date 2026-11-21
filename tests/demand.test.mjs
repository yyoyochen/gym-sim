import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSrc } from './load.mjs';

const NAMES = ['POP_TIMES', 'DEMAND_RESP', 'blendedPrice', 'priceVisitMult', 'peakShiftWeights', 'deskEffect', 'grubby', 'cleanCap', 'buzzMult', 'churnMonthly', 'balkProb', 'dayShape'];
const P = loadSrc(['src/a1_params.js'], NAMES);
const near = (a, b, tol = 1e-9) => Math.abs(a - b) < tol;

test('blended price at today\'s prices is about 1.29', () => {
  assert.ok(near(P.blendedPrice(1.2, 1.5), 0.704 * 1.2 + 0.296 * 1.5));
});

test('a 10% dearer minute cuts visits by about 3.7%', () => {
  assert.ok(near(P.priceVisitMult(P.blendedPrice(1.2, 1.5) * 1.1, -0.4), Math.pow(1.1, -0.4)));
  assert.ok(near(P.priceVisitMult(P.blendedPrice(1.2, 1.5), -0.4), 1));
});

test('priceVisitMult bounds', () => {
  for (const b of [0.8, 2.5, 0]) { const m = P.priceVisitMult(b, -0.4); assert.ok(Number.isFinite(m) && m > 0 && m < 3, String(m)); }
});

test('peak shift at today\'s premium changes nothing', () => {
  const w = P.dayShape('Tue');
  assert.deepEqual(Array.from(P.peakShiftWeights(w, 'Tue', 0.25)), Array.from(w));
});

test('a bigger premium moves evening demand on weekdays only', () => {
  const share = (w) => (w[11] + w[12] + w[13] + w[14]) / w.reduce((s, v) => s + v, 0);
  const tue = P.dayShape('Tue'), sat = P.dayShape('Sat');
  assert.ok(share(P.peakShiftWeights(tue, 'Tue', 0.5)) <= share(tue) * 0.9);
  assert.deepEqual(Array.from(P.peakShiftWeights(sat, 'Sat', 0.5)), Array.from(sat));
  assert.ok(P.peakShiftWeights(tue, 'Tue', 0.5).every(v => v >= 0));
  assert.ok(P.peakShiftWeights(tue, 'Tue', -1).every(v => v >= 0));
});

test('the desk: hours short cost sign-ups and members, hours over help half as much up to a quarter more', () => {
  assert.equal(P.deskEffect(1).join, 1); assert.equal(P.deskEffect(1).churn, 1);
  assert.ok(near(P.deskEffect(0.6).join, 0.8)); assert.ok(near(P.deskEffect(0.6).churn, 1.2));
  assert.ok(near(P.deskEffect(0).join, 0.5)); assert.ok(near(P.deskEffect(1.2).join, 1.05));
  assert.ok(near(P.deskEffect(3).join, 1.0625)); assert.ok(near(P.deskEffect(3).churn, 0.9375));
});
test('a clean hall and the opening buzz', () => {
  assert.equal(P.cleanCap(0), 220); assert.equal(P.cleanCap(2), 620);
  assert.equal(P.grubby(220, 0), 0); assert.ok(near(P.grubby(275, 0), 0.5)); assert.equal(P.grubby(900, 0), 1); assert.equal(P.grubby(400, 1), 0);
  assert.equal(P.buzzMult(0), 1.6); assert.ok(near(P.buzzMult(30), 1.3)); assert.equal(P.buzzMult(60), 1); assert.equal(P.buzzMult(500), 1);
});

test('bad visits add churn points, capped at twice the base', () => {
  assert.ok(near(P.churnMonthly(12, 3, 2), 5.5 + 1.5));
  assert.ok(near(P.churnMonthly(12, 3, 100), 11));
  assert.ok(near(P.churnMonthly(12, 3), 5.5));
});

test('a lean roster raises early-tenure churn', () => {
  assert.ok(P.churnMonthly(0, 3, 0, 0.3) > P.churnMonthly(0, 3));
  assert.ok(near(P.churnMonthly(12, 3, 0, 0.3), 5.5));
});

test('balking rises with the expected wait at the door', () => {
  assert.equal(P.balkProb(0), 0);
  assert.ok(near(P.balkProb(15), 1 - Math.exp(-1)));
});
