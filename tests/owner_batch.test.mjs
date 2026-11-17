// Owner batch 2026-11-15: benches beside the dumbbells, and bigger text
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadSrc } from './load.mjs';

const T = () => loadSrc(['src/a1_params.js', 'src/a2_pnl.js', 'src/a3_build.js', 'src/a4_layout.js'], ['autoBuild', 'footprint', 'PRESETS', 'presetCounts', 'SUB']);
const gap = (a, b) => Math.max(0, a.x0 - b.x1, b.x0 - a.x1) + Math.max(0, a.z0 - b.z1, b.z0 - a.z1);   /* sub-cells of floor between two footprints */

test('every preset puts its benches beside the dumbbell racks', () => {
  const t = T();
  for (const k of ['S', 'M', 'L']) {
    const p = t.PRESETS[k], L = t.autoBuild(p.w, p.d, t.presetCounts(p.w, p.d)), db = L.pieces.filter(q => q.kind === 'dbrack').map(t.footprint);
    const benches = L.pieces.filter(q => q.kind === 'bench').map(t.footprint);
    assert.ok(db.length && benches.length, `${k}: dumbbells and benches placed`);
    const gaps = benches.map(b => Math.min(...db.map(d => gap(b, d)))).sort((a, b) => a - b);
    assert.ok(gaps[0] * t.SUB <= 1.5, `${k}: the nearest bench is ${(gaps[0] * t.SUB).toFixed(2)} m from a rack`);
    assert.ok(gaps[(gaps.length - 1) >> 1] * t.SUB <= 3.5, `${k}: the median bench is ${(gaps[(gaps.length - 1) >> 1] * t.SUB).toFixed(2)} m from a rack`);
    assert.ok(gaps[gaps.length - 1] * t.SUB <= 6.0, `${k}: the farthest bench is ${(gaps[gaps.length - 1] * t.SUB).toFixed(2)} m from a rack`);
    if (k !== 'S') assert.equal(L.refused.length, 0, `${k}: everything still fits (${L.refused})`);   /* the Small plot was already short of room before */
  }
});

test('text sizes are large enough to read, the P&L most of all', () => {
  const css = readFileSync(new URL('../shell.html', import.meta.url), 'utf8');
  const vars = (block) => Object.fromEntries([...block.matchAll(/--f(\d+):(\d+)px/g)].map(m => [+m[1], +m[2]]));
  const desk = vars(css.match(/:root\{(--f9[^}]*)\}/)[1]), phone = vars(css.match(/@media \(max-width:859px\)\{:root\{(--f9[^}]*)\}\}/)[1]);
  assert.ok(desk[9] >= 13 && desk[12] >= 15 && desk[16] >= 19, `desktop sizes ${JSON.stringify(desk)}`);
  assert.ok(phone[9] >= 14 && phone[12] >= 16, `phone sizes ${JSON.stringify(phone)}`);
  assert.match(css, /#books td\{padding:(\d)px/); assert.ok(+css.match(/#books td\{padding:(\d)px/)[1] >= 4, 'P&L rows have room to breathe');
});
