// The opening camera (first-minute polish): follow the first member only once they are inside, and hand off when their first set ends,
// so the goal card never covers the lift (judge round 1).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSrc } from './load.mjs';
const { introHandoff, introInside, INTRO_SET_MIN_S, INTRO_LIFT_MAX_S, INTRO_CAP_S } = loadSrc(['src/a5_intro.js'], ['introHandoff', 'introInside', 'INTRO_SET_MIN_S', 'INTRO_LIFT_MAX_S', 'INTRO_CAP_S']);

test('no hand-off at 8 s if the member has not lifted yet', () => { assert.equal(introHandoff(8.1, 0, false), false); });
test('no hand-off mid-set: the card would cover the lift', () => { assert.equal(introHandoff(9, 2.5, true), false); });
test('hand-off when the first set ends', () => { assert.equal(introHandoff(9, INTRO_SET_MIN_S, false), true); assert.equal(introHandoff(9, INTRO_SET_MIN_S - 0.1, false), false); });
test('a very long set still hands off', () => { assert.equal(introHandoff(12, INTRO_LIFT_MAX_S, true), true); });
test('hand-off at the cap even with no lift, so the card always comes', () => { assert.equal(introHandoff(INTRO_CAP_S, 0, false), true); });
test('the limits leave room for one set and stay short', () => { assert.ok(INTRO_SET_MIN_S >= 1 && INTRO_SET_MIN_S <= 2); assert.ok(INTRO_LIFT_MAX_S >= 4 && INTRO_LIFT_MAX_S <= 8); assert.ok(INTRO_CAP_S >= 15 && INTRO_CAP_S <= 30); });
test('inside means past the front wall', () => { assert.equal(introInside(9.4, 10), true); assert.equal(introInside(10.2, 10), false); assert.equal(introInside(9.6, 10), false); });
