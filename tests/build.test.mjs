import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildIsFresh, checkBuild } from './run_sim.mjs';

test('a build containing the joined sources is fresh', () => {
  assert.equal(buildIsFresh('let a = 1;\nlet b = 2;', '<html><script>let a = 1;\nlet b = 2;</script></html>'), true);
});
test('a build missing an edited source is stale', () => {
  assert.equal(buildIsFresh('let a = 1;\nlet b = 3;', '<html><script>let a = 1;\nlet b = 2;</script></html>'), false);
});
test('the committed index.html matches src/', () => {
  assert.doesNotThrow(() => checkBuild());
});
