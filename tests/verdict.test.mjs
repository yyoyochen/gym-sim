// The day (and month) in one plain sentence (first-minute polish): made or lost, about how much, and the two costs that drove it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSrc } from './load.mjs';
const { verdictText, roundAbout } = loadSrc(['src/a1_params.js', 'src/a2_pnl.js'], ['verdictText', 'roundAbout']);
const loss = { ebitda: -5634, occupancy: 6240, staff: 6100, elec: 1500, otherOpex: 900, coach: 200 };
test('a losing day says lost, about how much, and its two biggest costs', () => {
  const v = verdictText(loss);
  assert.equal(v.sign, -1);
  assert.equal(v.en, 'Today lost about $5,600: rent and staff cost more than the day brought in.');
  assert.equal(v.zh, '今天虧了約 $5,600：租金和人事比當天的收入還多。');
});
test('a good day says made, after its two biggest costs', () => {
  const v = verdictText({ ...loss, ebitda: 12400, staff: 7000 });
  assert.equal(v.sign, 1); assert.equal(v.en, 'Today made about $12,000 after staff and rent.'); assert.equal(v.zh, '扣掉人事和租金後，今天賺了約 $12,000。');
});
test('near zero is a break-even, and a month speaks as a month', () => {
  assert.equal(verdictText({ ...loss, ebitda: 30 }).en, 'Today broke even.');
  assert.match(verdictText({ ...loss, ebitda: -150000 }, 'month').en, /^This month lost about \$150,000:/);
});
test('rounding: hundreds below 10k, thousands above', () => { assert.equal(roundAbout(-5634), 5600); assert.equal(roundAbout(12400), 12000); assert.equal(roundAbout(49), 0); });
const { verdictLive } = loadSrc(['src/a1_params.js', 'src/a2_pnl.js'], ['verdictLive']);
test('the live line leads with a labelled result, not two bare numbers (judge round 1)', () => {
  assert.deepEqual({ ...verdictLive(-5634) }, { en: 'Today: lost $5,600', zh: '今日虧 $5,600', sign: -1 });
  assert.deepEqual({ ...verdictLive(12400) }, { en: 'Today: made $12,000', zh: '今日賺 $12,000', sign: 1 });
  assert.deepEqual({ ...verdictLive(20) }, { en: 'Today: broke even', zh: '今日打平', sign: 0 });
});
