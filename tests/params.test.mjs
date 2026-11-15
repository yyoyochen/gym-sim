import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSrc } from './load.mjs';

const NAMES = ['POP_TIMES', 'DEMAND', 'DAY_TYPES', 'dayShape', 'dayDemand', 'PT', 'avgPackSessions', 'pickPack', 'coachedShare', 'outsideShare', 'defaultMix'];
const load = () => loadSrc(['src/a1_params.js'], NAMES);
const P = load();

test('Tuesday base is about 209 visits', () => {
  assert.equal(P.dayDemand(P.POP_TIMES.Tue, 35, 70).visits, 209);
});

test('weights sum to 1 and follow the shape', () => {
  const { weights } = P.dayDemand(P.POP_TIMES.Tue, 35, 70);
  assert.ok(Math.abs(weights.reduce((s, w) => s + w, 0) - 1) < 1e-9);
  assert.ok(weights[12] > weights[0]);            // 19:00 (index 12) busiest on Tuesday
});

test('weekday shape is the Mon–Thu mean', () => {
  assert.equal(P.dayShape('Weekday')[12], (61 + 100 + 83 + 80) / 4);
});

test('weekend has no 07:00 demand', () => {
  assert.equal(P.dayShape('Weekend')[0], 0);
});

test('heatwave lowers midday and total visits', () => {
  const a = P.dayShape('Weekday'), b = P.dayShape('Weekday', true);
  assert.equal(b[6], a[6] * 0.5);                 // 13:00
  assert.ok(P.dayDemand(b, 35, 70).visits < P.dayDemand(a, 35, 70).visits);
  assert.ok(b.every(v => v >= 0));
});

test('pack choice is a single draw 45/37/18', () => {
  assert.equal(P.pickPack(0.44), 0);
  assert.equal(P.pickPack(0.46), 1);
  assert.equal(P.pickPack(0.83), 2);
});

test('average pack is 13.84 sessions', () => {
  assert.ok(Math.abs(P.avgPackSessions() - 13.84) < 1e-9);
});

test('coached share at base', () => {
  assert.ok(Math.abs(P.coachedShare(190) - 190 / 30.4 / 190) < 1e-9);
  assert.ok(Math.abs(P.outsideShare() - 60 / 190) < 1e-9);
});

test('zero coaching volume', () => {
  const Q = load();
  Q.PT.sessions = 0; Q.PT.rentals = 0;
  assert.equal(Q.coachedShare(190), 0);
  assert.equal(Q.outsideShare(), 0);
});

test('default mix is whole percents summing to 100, coach from coaching volume', () => {
  const M = load();
  const mix = M.defaultMix(3);
  assert.equal(JSON.stringify(mix), JSON.stringify({ power: 22, oly: 6, body: 32, beginner: 37, coach: 3 }));   // JSON: the object comes from another vm realm
  assert.equal(Object.values(M.defaultMix(0)).reduce((s, x) => s + x, 0), 100);
});
