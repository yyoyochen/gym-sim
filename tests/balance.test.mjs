import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSrc } from './load.mjs';

// balance round 2026-11-20: the pass is bought or refused, the roster follows the floor, a coach is paid a retainer and sells less when the gym has more coaches than it needs
const B = loadSrc(['src/a1_params.js', 'src/a2_pnl.js'], ['PASS', 'wantsPass', 'joinPrice', 'blendedPrice', 'staffAdj', 'coachSell', 'ROSTER', 'rosterLines', 'rosterCost', 'defaultRoster', 'coachPay', 'deskBase', 'COSTS', 'COST_LINES']);
const pr = { off: 1.2, peak: 1.5, cap: 180, perMinOn: true, monthlyOn: true, monthly: 1000 };
const share = (vpu, p) => Array.from({ length: 2000 }, (_, i) => B.wantsPass(vpu, i, p)).filter(Boolean).length / 2000;
const plain = (x) => JSON.parse(JSON.stringify(x));

test('next to the minute price, members take a pass that costs up to about 1.5 times their month of visits (they expect to come more than they do)', () => {
  assert.equal(B.PASS.bias, 1.5);
  assert.equal(share(4, pr), 0);                          // 4 visits x $90 = $360; even the keenest stops at $360 x 1.5 x 1.25 = $675
  assert.equal(share(12, pr), 1);                         // $1,080 a month by the minute
  const s = share(7.4, pr); assert.ok(s > 0.35 && s < 0.65, String(s));   // $666 x 1.5 = $999: about half
  assert.ok(share(7.4, { ...pr, monthly: 900 }) > share(7.4, pr) && share(7.4, pr) > share(7.4, { ...pr, monthly: 1200 }));
});

test('a pass-only gym: members whose visits are worth too little do not buy the pass; the rest pay up to about 2.6 times their month', () => {
  const only = { ...pr, perMinOn: false };
  assert.equal(B.PASS.stay, 2.6);
  assert.equal(share(2, only), 0);                        // $180 a month by the minute against a $1,000 pass
  assert.equal(share(10, only), 1);
  const s = share(4.3, only); assert.ok(s > 0.35 && s < 0.65, String(s));   // $387 x 2.6 = $1,006: about half
  assert.ok(share(4, { ...only, monthly: 600 }) > share(4, only));
});

test('the price a newcomer weighs never rises above the minute price: who refuses a dear pass is decided member by member', () => {
  const b = B.blendedPrice(1.2, 1.5);
  assert.ok(Math.abs(B.joinPrice({ ...pr, perMinOn: false, monthly: 1500 }) - b) < 1e-9);
  assert.ok(B.joinPrice({ ...pr, perMinOn: false, monthly: 400 }) < b);
});

test('the default roster follows the floor: the 115-ping sample keeps 2 full-time, 40 part-time hours and 2 coaches', () => {
  assert.deepEqual(plain(B.defaultRoster(115)), { deskFT: 2, deskPTh: 40, coaches: 2, cleaners: 0 });
  assert.deepEqual(plain([80, 160, 320].map(B.defaultRoster)), [{ deskFT: 2, deskPTh: 10, coaches: 1, cleaners: 0 }, { deskFT: 3, deskPTh: 30, coaches: 3, cleaners: 0 }, { deskFT: 4, deskPTh: 100, coaches: 6, cleaners: 0 }]);
});

test('a coach is paid a retainer of $10,000 a month on the roster, with insurance and bonus on top like everyone else', () => {
  assert.equal(B.ROSTER.coach, 10000);
  const none = B.rosterCost({ deskFT: 2, deskPTh: 40, coaches: 0 }), two = B.rosterCost({ deskFT: 2, deskPTh: 40, coaches: 2 });
  assert.equal(none, 184000); assert.equal(two, 184000 + Math.round(2 * 10000 * (1 + 42200 / 141800)));
  assert.equal(B.rosterLines({ deskFT: 2, deskPTh: 40, coaches: 3 }).coaches, 30000);
  assert.equal(B.coachPay(2), two - none);
  assert.equal(B.COSTS.staff, two);
  assert.equal(B.COST_LINES.staff.reduce((s, [, v]) => s + v, 0), two);
});

test('a thin desk is judged against the desk the floor needs, not against the sample gym', () => {
  assert.equal(B.deskBase(115), 184000);
  for (const ping of [80, 160, 320]) {
    const base = B.deskBase(ping); assert.equal(base, B.rosterCost({ ...B.defaultRoster(ping), coaches: 0 }));
    assert.equal(B.staffAdj(base, base), 0);
    assert.ok(Math.abs(B.staffAdj(base * 133 / 184, base) - 0.3) < 1e-9);
    assert.equal(B.staffAdj(base * 2, base), 0);
  }
  assert.equal(B.staffAdj(184000), 0); assert.ok(Math.abs(B.staffAdj(133000) - 0.3) < 1e-9);   // the sample gym, as before
});

test('coaches sell coaching in step with the crowd: half the coaches the gym needs sell half; twice as many sell only a quarter more', () => {
  assert.equal(B.coachSell(2, 35), 1);                    // the researched rate: 2 coaches at a 35-person peak
  assert.equal(B.coachSell(1, 35), 0.5); assert.equal(B.coachSell(0, 35), 0);
  assert.ok(Math.abs(B.coachSell(4, 35) - Math.pow(2, 0.3)) < 1e-12);
  assert.ok(Math.abs(B.coachSell(4, 70) - 1) < 1e-12);    // a gym twice as busy needs twice the coaches
  assert.ok(B.coachSell(6, 35) < 1.4);
});

// equipment trace 2026-11-20: the small preset asked for more than its hall holds, and the pieces left out were always the last placed
// (pin machines, the cable tower, the pull-up station, the mats); members skipped those exercises, left sooner and paid less
const K = loadSrc(['src/a1_params.js', 'src/a2_pnl.js', 'src/a3_build.js', 'src/a4_layout.js'], ['PRESETS', 'presetCounts', 'presetKit', 'autoBuild', 'countsOf', 'kitOf', 'kitGaps']);
test('every preset opens with all the kit it asks for, a cable tower, a pull-up station and at least 2 mats', () => {
  for (const k of ['S', 'M', 'L']) {
    const p = K.PRESETS[k], want = K.presetKit(p.w, p.d), L = K.autoBuild(p.w, p.d, want), kit = K.kitOf(L);
    assert.deepEqual(plain(K.countsOf(L)), plain(want), k);
    assert.ok(kit.cable && kit.pullup && kit.dumbbells, k); assert.ok(L.pieces.filter(q => q.kind === 'mat').length >= 2, k);
    assert.ok(L.refused.every(q => q === 'turf' || q === 'mat'), k + ' ' + L.refused);
    assert.equal(K.kitGaps(L).length, 0, k);
  }
  assert.deepEqual(plain(K.presetKit(16, 10)), plain(K.presetCounts(16, 10)));   // medium and large already fitted: unchanged
  assert.deepEqual(plain(K.presetKit(20, 16)), plain(K.presetCounts(20, 16)));
  assert.deepEqual(plain(K.presetKit(10, 8)), { cardio: 3, machines: 2, racks: 2, plats: 1, benches: 2, plates: 1 });
});
test('a layout says what its members will miss', () => {
  const L = K.autoBuild(10, 8, K.presetCounts(10, 8));   // the old small preset: too much kit for the hall
  assert.deepEqual(plain(K.kitGaps(L)), ['cable', 'pullup', 'mat']);
  assert.deepEqual(plain(K.kitGaps(K.autoBuild(16, 10, { ...K.presetCounts(16, 10), machines: 0 }))), ['machines']);
});
