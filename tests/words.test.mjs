// Plain words on the first screen (first-minute polish): the panel's lab labels read as everyday words, in English and Chinese.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSrc } from './load.mjs';
const en = loadSrc(['src/g0_i18n.js'], ['tr']).tr;
const zhCtx = loadSrc(['src/g0_i18n.js'], ['tr', 'ZH']);
test('English: speed, monitors and plots in plain words', () => {
  assert.equal(en('Speed (gym seconds per real second)'), 'Speed');
  assert.equal(en('Monitors'), 'Right now');
  assert.equal(en('Plots'), 'Charts');
});
test('Chinese: the same three in plain words', () => {
  assert.equal(zhCtx.ZH['Speed (gym seconds per real second)'], '速度');
  assert.equal(zhCtx.ZH['Monitors'], '現在');
  assert.equal(zhCtx.ZH['Plots'], '圖表');
});
test('Setup says what it does (it restarts the business) and Step says how far it steps, in both languages', () => {
  assert.equal(en('Setup'), 'Start over'); assert.equal(en('Step'), '+1 min'); assert.equal(en('Go'), 'Go');
  assert.equal(zhCtx.ZH['Setup'], '重新開始'); assert.equal(zhCtx.ZH['Step'], '+1 分鐘'); assert.equal(zhCtx.ZH['Run'], '營運');
  for (const k in zhCtx.ZH) assert.ok(!/「設定」|行為類滑桿|單步|執行/.test(zhCtx.ZH[k]), k);
});
