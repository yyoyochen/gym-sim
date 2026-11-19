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
test('other words are unchanged', () => { assert.equal(en('Setup'), 'Setup'); assert.equal(en('Step'), 'Step'); });
