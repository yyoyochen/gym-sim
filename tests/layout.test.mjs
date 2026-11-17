import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSrc } from './load.mjs';

const N = ['SUB', 'KINDS', 'footprint', 'useRect', 'makeGrid', 'canPlace', 'occupy', 'CELL'];
const L = () => loadSrc(['src/a1_params.js', 'src/a2_pnl.js', 'src/a3_build.js', 'src/a4_layout.js'], N);

test('the sub-grid splits a 1.82 m cell into 4 × 4', () => { const T = L(); assert.equal(T.SUB, T.CELL / 4); });
test('every kind has a footprint, a use zone and engine-chosen facings', () => {
  const T = L(); for (const [k, v] of Object.entries(T.KINDS)) { assert.ok(v.w > 0 && v.d > 0, k); assert.ok(v.use && 'f' in v.use, k); assert.ok(v.rots.length >= 1, k); assert.ok(v.price > 0, k); }
});
test('a 3 × 5 machine turned to face +x is 5 wide and 3 deep', () => {
  const T = L(), r0 = T.footprint({ kind: 'pulldown', sx: 2, sz: 2, rot: 0 }), r1 = T.footprint({ kind: 'pulldown', sx: 2, sz: 2, rot: 1 });
  assert.equal(`${r0.x1 - r0.x0}x${r0.z1 - r0.z0}`, '3x5'); assert.equal(`${r1.x1 - r1.x0}x${r1.z1 - r1.z0}`, '5x3');
});
test('the use zone turns with the piece: a rack facing +z has its clear space in front (+z), facing +x on its +x side', () => {
  const T = L(), u0 = T.useRect({ kind: 'rack', sx: 10, sz: 10, rot: 0 }), u1 = T.useRect({ kind: 'rack', sx: 10, sz: 10, rot: 1 });
  const f = T.KINDS.rack.use.f; assert.equal(u0.z1, 10 + 6 + f); assert.equal(u0.z0, 10); assert.equal(u1.x1, 10 + 6 + f); assert.equal(u1.x0, 10);
});
test('canPlace refuses overlap with a piece or a room and a use zone outside the hall; use zones may share cells', () => {
  const T = L(), G = T.makeGrid(40, 30);
  const a = { kind: 'bench', sx: 10, sz: 10, rot: 0 }; assert.ok(T.canPlace(G, a)); T.occupy(G, a);
  assert.equal(T.canPlace(G, { kind: 'bench', sx: 11, sz: 10, rot: 0 }), false);            /* footprints overlap */
  assert.ok(T.canPlace(G, { kind: 'bench', sx: 10, sz: 14, rot: 0 }));                       /* its back clearance shares a's front clearance */
  for (let z = 20; z < 22; z++) for (let x = 0; x < 40; x++) G.cells[z * G.W + x] = 2;        /* a room */
  assert.equal(T.canPlace(G, { kind: 'bench', sx: 20, sz: 20, rot: 0 }), false);
  assert.equal(T.canPlace(G, { kind: 'rack', sx: 0, sz: 26, rot: 0 }), false);              /* its front clearance leaves the hall */
});

// ---------------------------------------------------------------- Task 2: the rule-based placer
const P = () => loadSrc(['src/a1_params.js', 'src/a2_pnl.js', 'src/a3_build.js', 'src/a4_layout.js'], ['fixedRooms', 'autoBuild', 'addPiece', 'removeLast', 'reachable', 'countsOf', 'kitOf', 'layoutCost', 'footprint', 'presetCounts', 'buildCost', 'SUB', 'KINDS', 'nextKind']);
const overlaps = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1;

test('autoBuildAllSizes: every plot the builder allows gets at least one rack, no overlaps, nothing in a room, and every piece reachable', () => {
  const T = P(); const bad = [];
  for (let w = 8; w <= 24; w++) for (let d = 7; d <= 18; d++) { if (w * d < 60) continue;
    const L = T.autoBuild(w, d, T.presetCounts(w, d)), fp = L.pieces.map(T.footprint), rooms = T.fixedRooms(w, d).rooms;
    const racks = L.pieces.filter(p => p.kind === 'rack').length;
    const ov = fp.some((a, i) => fp.some((b, j) => j > i && overlaps(a, b))), inRoom = fp.some(a => rooms.some(r => overlaps(a, r)));
    if (racks < 1 || ov || inRoom || !T.reachable(L, w, d)) bad.push({ w, d, racks, ov, inRoom });
  }
  assert.equal(JSON.stringify(bad.slice(0, 5)), '[]');
});
test('auto-build is deterministic', () => { const T = P(); assert.equal(JSON.stringify(T.autoBuild(16, 10, T.presetCounts(16, 10))), JSON.stringify(T.autoBuild(16, 10, T.presetCounts(16, 10)))); });
test('adding a piece never moves another; once refused, it stays refused', () => {
  const T = P(), L = T.autoBuild(16, 10, T.presetCounts(16, 10));
  for (const cat of ['cardio', 'machines', 'racks', 'plats', 'benches', 'plates']) {
    let refused = false;
    for (let i = 0; i < 8; i++) { const before = JSON.stringify(L.pieces), p = T.addPiece(L, T.nextKind(L, cat), 16, 10);
      assert.equal(JSON.stringify(L.pieces.slice(0, JSON.parse(before).length)), before, cat);
      if (refused) assert.equal(p, null, cat); if (!p) refused = true; }
  }
});
test('removeLast removes the newest piece of that kind only', () => {
  const T = P(), L = T.autoBuild(16, 10, T.presetCounts(16, 10)), racks = L.pieces.filter(p => p.kind === 'rack'), last = racks[racks.length - 1];
  assert.ok(T.removeLast(L, 'rack')); assert.equal(L.pieces.includes(last), false); assert.equal(L.pieces.filter(p => p.kind === 'rack').length, racks.length - 1);
});
test('a default build costs what it does today: categories at their price, bundles split at today\'s totals', () => {
  const T = P(), L = T.autoBuild(16, 10, T.presetCounts(16, 10)), c = T.buildCost({ w: 16, d: 10, counts: T.countsOf(L), kit: T.kitOf(L) });
  assert.equal(T.layoutCost(L), c.equipment);
});
test('the washrooms are reserved in the back corner of the right wall, clear of the desk', () => {
  const T = P();
  for (const [w, d] of [[8, 8], [10, 8], [16, 10], [20, 16], [24, 18]]) { const r = T.fixedRooms(w, d), wc = r.washroom, desk = r.desk;
    assert.equal(wc.z0, 0, `${w}x${d} back`); assert.equal(wc.x1, w * 4, `${w}x${d} right`); assert.ok(desk.z0 >= wc.z1, `${w}x${d} overlap`); }   /* the 1.2 m gap is checked on the real walls (self-test washroomsAtBack) */
});

// ---------------------------------------------------------------- Plan 12: book value of a piece
test('book value: full price in the month bought, straight-line to zero over 60 months', () => {
  const T = loadSrc(['src/a1_params.js', 'src/a2_pnl.js', 'src/a3_build.js', 'src/a4_layout.js'], ['bookValue']);
  assert.equal(T.bookValue({ kind: 'rack', bought: 2 }, 2), 120000); assert.equal(T.bookValue({ kind: 'rack', bought: 2 }, 32), 60000);
  assert.equal(T.bookValue({ kind: 'rack' }, 70), 0); assert.equal(T.bookValue({ kind: 'rack' }, 0), 120000);
});

// ---------------------------------------------------------------- Plan 12: diff, quote, drop
const Q = () => loadSrc(['src/a1_params.js', 'src/a2_pnl.js', 'src/a3_build.js', 'src/a4_layout.js'], ['autoBuild', 'presetCounts', 'addPiece', 'diffLayouts', 'quote', 'dropPiece', 'footprint', 'KINDS']);
const copyL = (L) => JSON.parse(JSON.stringify(L));
test('quote: 5 heavy moves and a bench move cost $15,000 in movers and close 2 days', () => {
  const T = Q(), a = T.autoBuild(16, 10, T.presetCounts(16, 10)), b = copyL(a);
  const heavy = b.pieces.filter(p => T.KINDS[p.kind].heavy).slice(0, 5), bench = b.pieces.find(p => p.kind === 'bench');
  for (const p of heavy) p.sz += 1; bench.sz += 1;
  const q = T.quote(T.diffLayouts(a, b)); assert.equal(`${q.movers} ${q.buy} ${q.sell} ${q.cost} ${q.days}`, '15000 0 0 15000 2');
});
test('quote: buying a rack costs its price and one install day', () => {
  const T = Q(), a = T.autoBuild(20, 16, T.presetCounts(20, 16)), b = copyL(a); assert.ok(T.addPiece(b, 'rack', 20, 16));
  const q = T.quote(T.diffLayouts(a, b)); assert.equal(`${q.buy} ${q.cost} ${q.days}`, '120000 120000 1');
});
test('quoteSellBuy: selling a rack and buying another counts one sale and one purchase', () => {
  const T = Q(), a = T.autoBuild(20, 16, T.presetCounts(20, 16)), b = copyL(a), r = b.pieces.find(p => p.kind === 'rack'); b.pieces = b.pieces.filter(p => p !== r); assert.ok(T.addPiece(b, 'rack', 20, 16));
  const d = T.diffLayouts(a, b), q = T.quote(d); assert.equal(`${d.sold.length} ${d.bought.length} ${q.buy} ${q.sell} ${q.cost}`, '1 1 120000 48000 72000');
});
test('dropPiece moves a piece to a free spot with an engine-chosen facing, refuses a spot on another piece, and never overlaps', () => {
  const T = Q(), L = T.autoBuild(20, 16, T.presetCounts(20, 16)), bench = L.pieces.find(p => p.kind === 'bench'), rack = L.pieces.find(p => p.kind === 'rack');
  const fr = T.footprint(rack); assert.equal(T.dropPiece(copyL(L), bench.id, fr.x0 + 1, fr.z0 + 1, 20, 16), null);
  let moved = null; for (let z = 30; z < 60 && !moved; z += 2) for (let x = 10; x < 50 && !moved; x += 2) { const M = copyL(L), p = T.dropPiece(M, bench.id, x, z, 20, 16); if (p && (p.sx !== bench.sx || p.sz !== bench.sz)) moved = M; }
  assert.ok(moved, 'found a free spot'); const fp = moved.pieces.map(T.footprint);
  assert.ok(!fp.some((a, i) => fp.some((b, j) => j > i && a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1)));
});
