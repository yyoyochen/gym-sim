import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSrc } from './load.mjs';

const NAMES = ['POP_TIMES', 'SEASON', 'calendar', 'dayFactor', 'openHour', 'CHURN', 'dailyRate', 'churnMonthly', 'reactMonthly', 'projectRest'];
const P = loadSrc(['src/a1_params.js', 'src/a2_pnl.js'], NAMES);

test('June 2027 has 30 days and starts on a Tuesday', () => {
  const c = P.calendar(2027, 6);
  assert.equal(c.length, 30);
  assert.equal(c[0].dow, 'Tue');
  assert.equal(c[0].day, 1);
});

test('February carries the Lunar New Year multiplier', () => {
  assert.equal(P.calendar(2027, 2)[0].mult, 0.86);
  assert.equal(P.calendar(2027, 2).length, 28);
});

test('day factor is the day\'s busyness over the weekly mean', () => {
  assert.ok(Math.abs(P.dayFactor('Tue', 1) - 697 / (4440 / 7)) < 1e-9);
  assert.ok(Math.abs(P.dayFactor('Tue', 1.08) - 1.08 * 697 / (4440 / 7)) < 1e-9);
});

test('weekends open at 08:00', () => {
  assert.equal(P.openHour('Sat'), 8);
  assert.equal(P.openHour('Sun'), 8);
  assert.equal(P.openHour('Mon'), 7);
});

test('a daily rate compounds back to the monthly rate', () => {
  const d = P.dailyRate(6);
  assert.ok(Math.abs((1 - Math.pow(1 - d, 30.4)) - 0.06) < 1e-9);
});

test('churn depends on tenure and visit frequency', () => {
  assert.ok(Math.abs(P.churnMonthly(0, 3) - 5.5 * 1.5) < 1e-9);
  assert.ok(Math.abs(P.churnMonthly(12, 0) - 5.5 * 2.5) < 1e-9);
  assert.ok(Math.abs(P.churnMonthly(12, 8) - 5.5 * 0.6) < 1e-9);
  assert.ok(Math.abs(P.churnMonthly(12, 3) - 5.5) < 1e-9);
});

test('returns fade to 1% a month after half a year', () => {
  assert.equal(P.reactMonthly(0), 3);
  assert.equal(P.reactMonthly(9), 1);
});

test('projection sums days field by field', () => {
  const r = P.projectRest([{ a: 1 }, { a: 2 }], (e) => ({ ebitda: e.a * 10, net: e.a }));
  assert.equal(r.ebitda, 30);
  assert.equal(r.net, 3);
});

test('rampLevel follows the new-build curve (opens at 25%, τ 6.4 months)', () => {
  const Q = loadSrc(['src/a1_params.js', 'src/a2_pnl.js'], ['rampLevel']);
  assert.ok(Math.abs(Q.rampLevel(0) - 0.25) < 1e-9);
  assert.ok(Math.abs(Q.rampLevel(6) - (1 - 0.75 * Math.exp(-6 / 6.4))) < 1e-9);
  assert.ok(Q.rampLevel(6) > 0.68 && Q.rampLevel(6) < 0.74);
  assert.ok(Q.rampLevel(18) > 0.94 && Q.rampLevel(18) < 0.96);
  assert.ok(Math.abs(Q.rampLevel(-3) - 0.25) < 1e-9);   // before opening counts as opening day
});

test('dailyRate is capped at certainty above 100% a month', () => {
  const Q = loadSrc(['src/a1_params.js'], ['dailyRate']);
  assert.equal(Q.dailyRate(150), 1);
  assert.equal(Q.dailyRate(100), 1);
});

test('members under 30 days old are not judged on visit frequency', () => {
  const Q = loadSrc(['src/a1_params.js'], ['churnMonthly']);
  assert.ok(Math.abs(Q.churnMonthly(0, null) - 5.5 * 1.5) < 1e-9);
});
