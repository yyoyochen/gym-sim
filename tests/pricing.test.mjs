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

const R = loadSrc(['src/a1_params.js', 'src/a2_pnl.js', 'src/a3_build.js'], ['monthReport', 'monthTip', 'settingChanges', 'goalStatus', 'membersTarget', 'changeEffect']);
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

test('month report: months of different length are compared per day, and the report carries both figures', () => {
  const first = month({ days: 11, pnl: { net: 30000, contribution: 20000, fixed: 110000, ebitda: -90000 } }), second = month({ days: 31, pnl: { net: 150000, contribution: 100000, fixed: 250000, ebitda: -150000 } });
  const r = R.monthReport(second, first);
  assert.equal(r.better, true); assert.equal(r.sameLength, false);                      // a bigger loss in total, a smaller one per day
  assert.equal(Math.round(r.perDay), -4839); assert.equal(Math.round(r.prev.perDay), -8182); assert.equal(r.prev.days, 11); assert.equal(r.prev.total, -90000);
  assert.equal(R.monthReport(month({}), month({})).sameLength, true);
});

test('month report: the break-even count is read against the average membership and never contradicts the result', () => {
  // 358 -> 408 members (average 383), a small loss: contribution per member puts break-even just above the average, below the month-end count
  const lost = R.monthReport(month({ members: 408, joined: 70, returned: 0, lapsed: 20, pnl: { net: 300000, contribution: 248214, fixed: 250000, ebitda: -1786 } }), null);
  assert.equal(lost.avgMembers, 383); assert.ok(lost.breakEven > lost.avgMembers, `${lost.breakEven} > ${lost.avgMembers}`);
  const made = R.monthReport(month({ members: 408, joined: 70, returned: 0, lapsed: 20, pnl: { net: 300000, contribution: 250100, fixed: 250000, ebitda: 100 } }), null);
  assert.ok(made.breakEven <= made.avgMembers, `${made.breakEven} <= ${made.avgMembers}`);
  const flat = R.monthReport(month({ members: 200, joined: 30, returned: 0, lapsed: 30, pnl: { net: 250000, contribution: 249999.9, fixed: 250000, ebitda: -0.1 } }), null);
  assert.equal(flat.breakEven, 201);                                                    // a hair short: one more than the average, never "200 needed, you averaged 200" on a loss
});

test('month report: the cash change reconciles with the result (loan payment, tax and the rest)', () => {
  const m = month({ cashEnd: 835000, interest: 17500, principal: 64500, tax: 0, pnl: { net: 150000, contribution: 100000, fixed: 250000, ebitda: -150000 } });
  const r = R.monthReport(m, month({ cashEnd: 1100000 }));
  assert.equal(r.cash.change, -265000); assert.equal(r.cash.result, -150000); assert.equal(r.cash.loan, -82000); assert.equal(r.cash.tax, 0); assert.equal(r.cash.other, -33000);
  assert.equal(r.cash.result + r.cash.loan + r.cash.tax + r.cash.other, r.cash.change);
  assert.equal(R.monthReport(m, null).cash, null);                                      // no starting balance known: no line
  assert.equal(R.monthReport(m, null, 1000000).cash.change, -165000);                   // the first month starts from the opening cash
});

test('month tip: reads the changes, names what they did with the month\'s numbers, and never recommends what was just done or is already on', () => {
  const pnl = (o) => ({ net: 150000, contribution: 100000, fixed: 250000, ebitda: -150000, occupancy: 140000, staff: 80000, elec: 20000, otherOpex: 10000, coach: 5000, entry: 90000, passes: 0, ptEarned: 10000, ...o });
  const before = month({ days: 30, lapsed: 20, joined: 70, returned: 0, visits: 3000, pnl: pnl({}) });
  const passOnly = month({ days: 30, lapsed: 329, joined: 12, returned: 0, visits: 900, pnl: pnl({ entry: 0, passes: 60000 }), changes: [{ k: 'perMinOn', from: true, to: false }, { k: 'monthlyOn', from: false, to: true }] });
  const t = R.monthTip(passOnly, before, { perMinOn: false, monthlyOn: true });
  assert.match(t.en, /329 members left/); assert.match(t.en, /20 left/); assert.match(t.en, /Visits 30 a day \(was 100\)/); assert.match(t.en, /\$2,000 a day \(was \$3,000\)/);
  assert.match(t.en, /cost you members/); assert.doesNotMatch(t.en, /monthly pass (next to|brings)|biggest cost/);   // a warning stands alone: no second piece of advice on top assert.match(t.zh, /329 位會員離開/);
  const quiet = R.monthTip(month({ pnl: pnl({}), changes: [] }), before, { perMinOn: true, monthlyOn: true });
  assert.match(quiet.en, /^Rent is your biggest cost/); assert.doesNotMatch(quiet.en, /monthly pass/);          // the pass is already on
  assert.match(R.monthTip(month({ pnl: pnl({}), changes: [] }), before, { perMinOn: true, monthlyOn: false }).en, /a monthly pass next to the minute price/);
  const coach = R.monthTip(month({ pnl: pnl({ ptEarned: 60000, coach: 30000 }), changes: [{ k: 'coaches', from: 2, to: 3 }] }), before, { perMinOn: true, monthlyOn: false });
  assert.match(coach.en, /coaching earned \$1,974 a day \(was \$333\)/); assert.doesNotMatch(coach.en, /check that the coaches/);
  assert.equal(R.monthTip(month({ pnl: pnl({ ebitda: 5000 }), changes: [] }), before, {}), null);              // a profit and no changes: nothing to say
  assert.match(R.monthTip(passOnly, null, {}).en, /first month/);
  const free = month({ pnl: pnl({ occupancy: 4000, staff: 80000 }), changes: [] });                                  // a rent-free first month: staff looks biggest until the rent that is about to start is counted
  assert.match(R.monthTip(free, null, {}).en, /^Staff is your biggest cost/); assert.match(R.monthTip(free, null, { rentNext: 176000 }).en, /^Rent is your biggest cost/);
});

test('members goal: a gym that opens late in a month says its three months start next month, then counts 1, 2, 3', () => {
  const m = (members, days) => ({ members, days, lapsed: 0 }), s = (months, poolNow, curDays) => ({ months, poolNow, monthIndex: months.length, target: 740, curDays });
  assert.match(R.goalStatus('members500', s([], 338, 11)).text.en, /338 of 740 · the 3 months start next month/);
  assert.match(R.goalStatus('members500', s([m(352, 11)], 360, 31)).text.en, /month 1 of 3/);
  assert.match(R.goalStatus('members500', s([m(352, 11), m(380, 31)], 390, 31)).text.en, /month 2 of 3/);
  assert.match(R.goalStatus('members500', s([], 338, 30)).text.en, /month 1 of 3/);
});

test('setting changes: only what moved, with before and after', () => {
  const a = { priceOff: 1.2, pricePeak: 1.5, coaches: 2, monthlyOn: false, pieces: 40 }, b = { ...a, priceOff: 1.45, coaches: 3, monthlyOn: true };
  assert.deepEqual(JSON.parse(JSON.stringify(R.settingChanges(a, b))), [{ k: 'priceOff', from: 1.2, to: 1.45 }, { k: 'coaches', from: 2, to: 3 }, { k: 'monthlyOn', from: false, to: true }]);
  assert.equal(R.settingChanges(a, { ...a }).length, 0);
});

test('members goal: the target follows the gym (65% of its steady membership, to the nearest 10: above what an untouched gym reaches, about 61%); a first month under 15 days does not count as one of the three', () => {
  assert.equal(R.membersTarget(662, 'new'), 430); assert.equal(R.membersTarget(1351, 'new'), 880); assert.equal(R.membersTarget(965, 'existing'), 500);
  const m = (members, days) => ({ members, days, lapsed: 0 });
  const s = (months, poolNow) => ({ months, poolNow, monthIndex: months.length, target: 360 });
  assert.equal(R.goalStatus('members500', s([m(190, 11), m(250, 31), m(300, 31)], 330)).state, 'on');      // the 11-day month is not one of the three
  assert.equal(R.goalStatus('members500', s([m(190, 11), m(250, 31), m(300, 31), m(340, 30)], 345)).state, 'missed');
  assert.equal(R.goalStatus('members500', s([m(190, 11), m(250, 31), m(300, 31), m(365, 30)], 365)).state, 'met');
  assert.equal(R.goalStatus('members500', s([m(190, 11)], 361)).state, 'met');
  assert.equal(R.goalStatus('members500', { months: [m(400, 30), m(450, 31), m(480, 30)], poolNow: 480, monthIndex: 3 }).state, 'missed');   // no target given: 500, as before
});

test('month tip (judge round 4): months of different length compare per 30 days, each change lists only what it can cause, a rise is never credited to a cut, and the advice matches its lead', () => {
  const pnl = (o) => ({ net: 150000, contribution: 100000, fixed: 250000, ebitda: -150000, occupancy: 140000, staff: 80000, elec: 20000, otherOpex: 10000, coach: 5000, entry: 90000, passes: 0, ptEarned: 0, ...o });
  const short = month({ days: 11, lapsed: 18, joined: 30, returned: 0, visits: 700, pnl: pnl({ staff: 30000 }) });
  const long = month({ days: 31, lapsed: 51, joined: 60, returned: 0, visits: 2400, pnl: pnl({ staff: 60000, ptEarned: 18693, coach: 9000 }), changes: [{ k: 'deskFT', from: 2, to: 1 }, { k: 'coaches', from: 2, to: 1 }] });
  const t = R.monthTip(long, short, { perMinOn: true, monthlyOn: false });
  assert.match(t.en, /left at a rate of 49 per 30 days \(49 per 30 days the month before/); assert.doesNotMatch(t.en, /51 members left \(18 the month before\)/);
  assert.match(t.en, /staff cost \$1,935 a day \(was \$2,727\)/);
  assert.match(t.en, /Coaching earned \$603 a day \(was \$0\) despite having fewer coaches, not because of it/); assert.doesNotMatch(t.en, /After the coaching change/);
  assert.doesNotMatch(t.en, /Visits \d+ a day/);                                                                   // a roster change does not claim the visits
  assert.match(t.zh, /每 30 天 49 位/); assert.match(t.zh, /不是它造成的/);
  const price = R.monthTip(month({ days: 30, lapsed: 25, joined: 60, returned: 0, visits: 2700, pnl: pnl({ entry: 99000 }), changes: [{ k: 'priceOff', from: 1.2, to: 1.4 }] }), month({ days: 30, lapsed: 20, joined: 70, returned: 0, visits: 3000, pnl: pnl({}) }), { perMinOn: true });
  assert.match(price.en, /\$37 a visit \(was \$30\)/); assert.doesNotMatch(price.en, /staff cost|[Cc]oaching earned/);  // a price change: visits, money per visit, leavers
  const pass = R.monthTip(month({ days: 30, pnl: pnl({ passes: 30000 }), changes: [{ k: 'monthlyOn', from: false, to: true }] }), month({ days: 30, pnl: pnl({}) }), { perMinOn: true, monthlyOn: true });
  assert.match(pass.en, /^After the pass change/); assert.match(pass.en, /passes \$1,000 a day \(was \$0\)/);
  const more = R.monthTip(month({ days: 30, lapsed: 10, pnl: pnl({ staff: 60000 }), changes: [{ k: 'deskPTh', from: 40, to: 0 }] }), month({ days: 30, lapsed: 30, pnl: pnl({}) }), {});
  assert.match(more.en, /despite the smaller roster, 10 members left \(30 the month before\)/);
  const lean = month({ pnl: pnl({ occupancy: 4000, staff: 80000 }), changes: [] });                                  // staff is the biggest cost and the desk is already at its floor: the pass is offered as its own sentence
  const tip = R.monthTip(lean, null, { perMinOn: true, monthlyOn: false, deskFT: 1, deskPTh: 0 }).en;
  assert.match(tip, /^Staff is your biggest cost\. One thing to try: a monthly pass/); assert.doesNotMatch(tip, /biggest cost: a monthly pass/);
});
test('month report (judge round 4): months left reads the average burn of the last three closed months; a break-even count that moves says why', () => {
  const m = (o) => month({ days: 30.4, cashEnd: 1200000, ...o });
  const a = m({ cashIn: 100000, cashOut: 400000 }), b = m({ cashIn: 100000, cashOut: 150000 }), c = m({ cashIn: 100000, cashOut: 200000 });
  assert.equal(R.monthReport(c, b, null).runway, 12);                                   // alone: 1.2M / 100K
  assert.equal(R.monthReport(c, b, null, [a, b, c]).runway, 8);                         // the three months' burn averages 150K
  const P = (o) => ({ net: 300000, contribution: 250000, fixed: 250000, ebitda: 0, ...o });
  const base = month({ members: 400, joined: 30, returned: 0, lapsed: 30, visits: 4000, pnl: P({}) });
  const rent = R.monthReport(month({ members: 400, joined: 30, returned: 0, lapsed: 30, visits: 4000, pnl: P({ fixed: 300000, ebitda: -50000 }) }), base);
  assert.equal(rent.beWhy.why, 'fixedUp'); assert.equal(rent.beWhy.from, 400); assert.equal(rent.beWhy.up, true);
  const fewer = R.monthReport(month({ members: 400, joined: 30, returned: 0, lapsed: 30, visits: 3200, pnl: P({ contribution: 200000, ebitda: -50000 }) }), base);
  assert.equal(fewer.beWhy.why, 'visitsDown');
  assert.equal(R.monthReport(month({ members: 400, joined: 30, returned: 0, lapsed: 30, visits: 4000, pnl: P({ fixed: 255000, ebitda: -5000 }) }), base).beWhy, undefined);   // within 5%: nothing to explain
});

// feedback round: after a change, each day since is set against the same weekday the week before the change
test('what a change did: each day since the change against the same weekday a week earlier, for up to 7 days', () => {
  const day = (visits, earned, joined, lapsed, closed) => ({ visits, earned, joined, lapsed, closed: !!closed });
  const log = [day(100, 40e3, 6, 2), day(110, 42e3, 6, 2), day(120, 44e3, 6, 2), day(130, 46e3, 6, 2), day(140, 48e3, 6, 2), day(150, 50e3, 6, 2), day(160, 52e3, 6, 2),
    day(90, 41e3, 4, 3), day(99, 43e3, 4, 3)];
  const e = R.changeEffect(log, 7);
  assert.equal(e.n, 2); assert.equal(e.pairs, 2);
  assert.equal(e.visits.before, 105); assert.equal(e.visits.after, 94.5);     // days 0 and 1 against days 7 and 8
  assert.equal(e.earned.before, 41e3); assert.equal(e.earned.after, 42e3);
  assert.equal(e.joined.after, 4); assert.equal(e.lapsed.before, 2);
  assert.equal(R.changeEffect(log, 9), null);                                  // no day played since the change yet
  assert.equal(R.changeEffect(log.slice(0, 3), 1).pairs, 0);                   // no week before it: nothing to compare with
  assert.equal(R.changeEffect([...log.slice(0, 7), day(0, 0, 0, 0, true), day(99, 43e3, 4, 3)], 7).pairs, 1);   // a closed day is left out
  assert.equal(R.changeEffect([...log, ...log], 7).n, 7);                      // a week at most
});
