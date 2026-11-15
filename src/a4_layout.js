// ================================================================ built-gym layout (Plan 11): pieces on a 0.455 m sub-grid, their footprints, clear space and the
// facings the engine may choose (owner: the player never rotates). Pure: no THREE, no DOM.
const SUB = CELL / 4;
// footprint w × d in sub-cells at facing 0 (front toward +z, the street); use: clear walkable space on the front, back, left (−x) and right (+x) sides, deep enough for the rest spot and three queue spots (review I4)
const KINDS = (() => {
  const K = {}, add = (kinds, o) => { for (const k of kinds) K[k] = { ...o, price: o.price || EQUIP_PRICE[o.cat] }; };
  add(['rack'], { cat: 'racks', w: 6, d: 6, use: { f: 5, b: 0, l: 1, r: 1 }, heavy: true, rots: [0, 1, 3] });
  add(['olyplat'], { cat: 'plats', w: 6, d: 6, use: { f: 5, b: 0, l: 1, r: 1 }, heavy: true, rots: [0, 1, 3] });
  add(['treadmill'], { cat: 'cardio', w: 2, d: 5, use: { f: 0, b: 6, l: 0, r: 2 }, heavy: true, rots: [0, 1, 3] });
  add(['rower'], { cat: 'cardio', w: 2, d: 6, use: { f: 0, b: 6, l: 0, r: 2 }, heavy: true, rots: [0, 1, 3] });
  add(['bike', 'airbike'], { cat: 'cardio', w: 2, d: 3, use: { f: 0, b: 7, l: 0, r: 2 }, heavy: true, rots: [0, 1, 3] });
  add(['pulldown', 'row', 'chestpress', 'shoulderpress', 'pecdeck', 'legext', 'legcurl'], { cat: 'machines', w: 3, d: 5, use: { f: 5, b: 0, l: 1, r: 2 }, heavy: true, rots: [0, 1, 2, 3] });
  add(['legpress', 'hack', 'hipthrust', 'beltsquat'], { cat: 'plates', w: 3, d: 6, use: { f: 4, b: 0, l: 1, r: 2 }, heavy: true, rots: [0, 1, 2, 3] });
  add(['bench'], { cat: 'benches', w: 3, d: 1, use: { f: 3, b: 2, l: 3, r: 1 }, heavy: false, rots: [0, 1] });
  add(['dbrack'], { cat: 'kit', w: 2, d: 8, use: { f: 0, b: 0, l: 0, r: 6 }, heavy: false, rots: [0, 2], price: 90000 });
  add(['cable'], { cat: 'kit', w: 10, d: 3, use: { f: 5, b: 0, l: 0, r: 0 }, heavy: true, rots: [0, 1, 2, 3], price: 200000 });
  add(['pullup'], { cat: 'kit', w: 3, d: 3, use: { f: 4, b: 0, l: 1, r: 0 }, heavy: true, rots: [0, 1, 2, 3], price: 20000 });
  add(['mat'], { cat: 'kit', w: 2, d: 4, use: { f: 4, b: 0, l: 0, r: 1 }, heavy: false, rots: [0, 1], price: 15000 });
  add(['turf'], { cat: 'kit', w: 24, d: 4, use: { f: 2, b: 3, l: 0, r: 0 }, heavy: false, rots: [0], price: 35000 });   /* the sled runs along x only */
  return K;
})();
// facing r turns the piece by r × 90°: its front points to +z, +x, −z, −x; (sx, sz) is the footprint's corner nearest the back-left of the hall
function dims(p) { const k = KINDS[p.kind]; return p.rot % 2 ? [k.d, k.w] : [k.w, k.d]; }
function footprint(p) { const [w, d] = dims(p); return { x0: p.sx, z0: p.sz, x1: p.sx + w, z1: p.sz + d }; }
function sidesOf(p) {   /* clear space by world side: +z, −z, −x, +x */
  const u = KINDS[p.kind].use;
  return [{ pz: u.f, nz: u.b, nx: u.l, px: u.r }, { px: u.f, nx: u.b, pz: u.l, nz: u.r }, { nz: u.f, pz: u.b, px: u.l, nx: u.r }, { nx: u.f, px: u.b, nz: u.l, pz: u.r }][p.rot];
}
function useRect(p) { const f = footprint(p), s = sidesOf(p); return { x0: f.x0 - s.nx, z0: f.z0 - s.nz, x1: f.x1 + s.px, z1: f.z1 + s.pz }; }
// occupancy: 0 free, 1 a piece, 2 a room or fixture, 3 clear space kept for a piece (others may share it, nothing may stand on it), 4 turf floor,
// 5 the strip along a wall (a piece may back onto it; clear space may not use it: the wall blocks the walking cells there)
function makeGrid(W, D) { return { W, D, cells: new Uint8Array(W * D) }; }
function canPlace(G, p) {
  if (!KINDS[p.kind] || !KINDS[p.kind].rots.includes(p.rot)) return false;
  const f = footprint(p), u = useRect(p);
  if (u.x0 < 0 || u.z0 < 0 || u.x1 > G.W || u.z1 > G.D) return false;
  for (let z = u.z0; z < u.z1; z++) for (let x = u.x0; x < u.x1; x++) {
    const c = G.cells[z * G.W + x], inF = x >= f.x0 && x < f.x1 && z >= f.z0 && z < f.z1;
    if (inF ? c !== 0 && c !== 5 : c === 1 || c === 2 || c === 4 || c === 5) return false;   /* 4: turf floor, which no piece or clear space may cover */
  }
  return true;
}
function occupy(G, p) {
  const f = footprint(p), u = useRect(p);
  for (let z = u.z0; z < u.z1; z++) for (let x = u.x0; x < u.x1; x++) { const i = z * G.W + x; if (x >= f.x0 && x < f.x1 && z >= f.z0 && z < f.z1) G.cells[i] = 1; else if (G.cells[i] === 0) G.cells[i] = 3; }
}
// ---------------------------------------------------------------- fixed rooms and the rule-based placer (Plan 11, task 2)
// a built hall in world metres, as setHall makes it (the front wall at z = 10, the c_world HZ); R is today's right-wall shift
function hallGeom(Wc, Dc) { const x1 = Math.round(Wc * CELL / 2), x0 = x1 - Wc * CELL, zb = 10 - Dc * CELL; return { x0, x1, zb, R: x1 - 15, W: Wc * 4, D: Dc * 4 }; }
// in sub-cells: the washroom block in the back corner of the right wall (with room for its doors), the desk and entrance at the front right, and a walkway between them
function fixedRooms(Wc, Dc) {
  const g = hallGeom(Wc, Dc), sx = (x) => Math.max(0, Math.floor((x - g.x0) / SUB + 1e-9)), sz = (z) => Math.max(0, Math.floor((z - g.zb) / SUB + 1e-9));
  const washroom = { x0: sx(g.R + 9.75), z0: 0, x1: g.W, z1: Math.ceil(8.3 / SUB - 1e-9) };   /* the block is 7.4 m deep and starts 0.15–0.65 m from the back wall (c_world snaps it to the walking grid) */
  const desk = { x0: sx(g.R + 10.2), z0: sz(5.4), x1: g.W, z1: g.D };
  const walk = { x0: sx(g.R + 8.8), z0: 0, x1: sx(g.R + 10.2), z1: g.D };
  return { washroom, desk, walk, rooms: [washroom, desk], entry: { x: Math.floor((walk.x0 + walk.x1) / 2), z: g.D - 2 } };
}
const CYCLE = { cardio: ['treadmill', 'treadmill', 'treadmill', 'treadmill', 'rower', 'rower', 'bike', 'bike', 'airbike'], machines: ['pulldown', 'row', 'chestpress', 'shoulderpress', 'pecdeck', 'legext', 'legcurl'],
  plates: ['legpress', 'hack', 'hipthrust', 'beltsquat'], racks: ['rack'], plats: ['olyplat'], benches: ['bench'] };
function countsOf(L) { const c = { cardio: 0, machines: 0, racks: 0, plats: 0, benches: 0, plates: 0 }; for (const p of L.pieces) { const k = KINDS[p.kind].cat; if (k in c) c[k]++; } return c; }
function kitOf(L) { const has = (k) => L.pieces.some(p => p.kind === k); return { dumbbells: has('dbrack'), cable: has('cable'), turf: has('turf'), pullup: has('pullup'), mats: has('mat') }; }
function nextKind(L, cat) { const cy = CYCLE[cat]; return cy[countsOf(L)[cat] % cy.length]; }
function bookValue(p, monthIndex) { return KINDS[p.kind].price * Math.min(1, Math.max(0, 1 - (monthIndex - (p.bought || 0)) / 60)); }   /* Plan 12: straight-line over 5 years from the month bought (absent: bought at opening) */
function layoutCost(L) { return L.pieces.reduce((s, p) => s + KINDS[p.kind].price, 0); }
// the turf is floor: nothing stands on it or keeps its clear space on it, but people walk across it (code 4)
function gridFor(L, Wc, Dc, skip) {
  const G = makeGrid(Wc * 4, Dc * 4), F = fixedRooms(Wc, Dc), mark = (r, v) => { for (let z = r.z0; z < r.z1; z++) for (let x = r.x0; x < r.x1; x++) if (x >= 0 && z >= 0 && x < G.W && z < G.D) G.cells[z * G.W + x] = v; };
  mark({ x0: 0, z0: 0, x1: G.W, z1: 1 }, 5); mark({ x0: 0, z0: 0, x1: 1, z1: G.D }, 5); mark({ x0: G.W - 1, z0: 0, x1: G.W, z1: G.D }, 5); mark({ x0: 0, z0: G.D - 1, x1: G.W, z1: G.D }, 5);   /* the wall strip */
  mark(F.walk, 3); for (const r of F.rooms) mark(r, 2);
  for (const p of L.pieces) if (p !== skip) { occupy(G, p); if (p.kind === 'turf') mark(footprint(p), 4); }   /* the turf keeps its clear space like any piece */
  G.entry = F.entry; return G;
}
function reachableIn(G, pieces) {
  const seen = new Uint8Array(G.W * G.D), q = [G.entry.z * G.W + G.entry.x], ok = (c) => c === 0 || c === 3 || c === 4;   /* the wall strip (5) is not walked */
  if (!ok(G.cells[q[0]])) return false; seen[q[0]] = 1;
  while (q.length) { const i = q.pop(), x = i % G.W, z = (i / G.W) | 0; for (const [a, b] of [[x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]]) { if (a < 0 || b < 0 || a >= G.W || b >= G.D) continue; const j = b * G.W + a; if (!seen[j] && ok(G.cells[j])) { seen[j] = 1; q.push(j); } } }
  return pieces.every(p => { const u = useRect(p), f = footprint(p); for (let z = Math.max(0, u.z0); z < Math.min(G.D, u.z1); z++) for (let x = Math.max(0, u.x0); x < Math.min(G.W, u.x1); x++) if (seen[z * G.W + x] && !(x >= f.x0 && x < f.x1 && z >= f.z0 && z < f.z1)) return true; return p.kind === 'turf'; });
}
function reachable(L, Wc, Dc) { return reachableIn(gridFor(L, Wc, Dc), L.pieces); }
// where each kind wants to be (lower is better); the facing is the engine's choice, never the player's
function placeScore(kind, f, rot, G, L, db) {
  const W = G.W, D = G.D, cx = (f.x0 + f.x1) / 2, cz = (f.z0 + f.z1) / 2, cat = KINDS[kind].cat;
  if (kind === 'turf') return Math.abs(f.z0 - Math.round(D * 0.42)) * 100 + f.x0 + rot * 10000;
  if (cat === 'racks' || cat === 'plats') return f.z0 * 100 + f.x0 + (rot ? 5000 : 0);
  if (cat === 'cardio') return (D - f.z1) * 100 + f.x0 + (rot ? 5000 : 0);
  if (cat === 'machines' || cat === 'plates' || kind === 'cable' || kind === 'pullup') return Math.round(Math.abs(cz - D * 0.6)) * 100 + f.x0 + (rot === 0 ? 0 : rot === 2 ? 300 : 5000);
  if (kind === 'dbrack') return f.x0 * 100 + Math.abs(cz - D / 2) + rot * 5000;
  if (kind === 'bench') { if (!db.length) return f.x0 * 100 + f.z0; let m = Infinity; for (const [x, z] of db) m = Math.min(m, Math.hypot(cx - x, cz - z)); return m * 10 + rot * 50; }   /* db: dumbbell-rack centres, worked out once per search */
  if (kind === 'mat') return f.x0 + f.z0 + rot * 50;
  return f.x0 + f.z0;
}
// prefix sums so a candidate's footprint and clear space are checked in constant time (the same answer as canPlace)
function sums(G, bad) { const W = G.W + 1, S = new Int32Array(W * (G.D + 1)); for (let z = 0; z < G.D; z++) for (let x = 0; x < G.W; x++) S[(z + 1) * W + x + 1] = (bad(G.cells[z * G.W + x]) ? 1 : 0) + S[z * W + x + 1] + S[(z + 1) * W + x] - S[z * W + x]; return (r) => S[r.z1 * W + r.x1] - S[r.z0 * W + r.x1] - S[r.z1 * W + r.x0] + S[r.z0 * W + r.x0]; }
function bestSpot(L, kind, Wc, Dc) {
  const G = gridFor(L, Wc, Dc), banned = new Set(), notFree = sums(G, c => c !== 0 && c !== 5), solid = sums(G, c => c === 1 || c === 2 || c === 4 || c === 5);
  const db = L.pieces.filter(q => q.kind === 'dbrack').map(footprint).map(r => [(r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2]);
  const fits = (p) => { const u = useRect(p); return u.x0 >= 0 && u.z0 >= 0 && u.x1 <= G.W && u.z1 <= G.D && notFree(footprint(p)) === 0 && solid(u) === 0; };
  for (let tries = 0; tries < 12; tries++) {
    let best = null, bs = Infinity;
    for (const rot of KINDS[kind].rots) for (let sz = 0; sz < G.D; sz++) for (let sx = 0; sx < G.W; sx++) {
      const p = { kind, sx, sz, rot }; if (!fits(p) || (banned.size && banned.has(`${sx},${sz},${rot}`))) continue;
      const s = placeScore(kind, footprint(p), rot, G, L, db); if (s < bs) { bs = s; best = p; }
    }
    if (!best) return null;
    const T = gridFor({ pieces: L.pieces.concat([best]) }, Wc, Dc);
    if (reachableIn(T, L.pieces.concat([best]))) return best;
    banned.add(`${best.sx},${best.sz},${best.rot}`);
  }
  return null;
}
function addPiece(L, kind, Wc, Dc) { const p = bestSpot(L, kind, Wc, Dc); if (!p) return null; p.id = L.nextId = (L.nextId || 0) + 1; L.pieces.push(p); return p; }
function removeLast(L, kind) { for (let i = L.pieces.length - 1; i >= 0; i--) if (L.pieces[i].kind === kind) { L.pieces.splice(i, 1); return true; } return false; }
// auto-build: the racks and platforms at the back, the dumbbells on the left wall, the turf lane, cardio along the windows, plate-loaded then pin-loaded machines in the middle with the cable
// tower and pull-up, dumbbells on the left wall, benches by them, mats in the back-left corner; a piece that does not fit is listed in refused
function autoBuild(Wc, Dc, counts, opts = {}) {
  const L = { pieces: [], nextId: 0 }, refused = [], want = [];
  const cat = (c) => { for (let i = 0; i < (counts[c] || 0); i++) want.push(CYCLE[c][i % CYCLE[c].length]); };
  if (opts.turfFirst) { cat('racks'); want.push('turf', 'dbrack', 'dbrack'); cat('plats'); }   /* owner: the player chose the turf lane over equipment */
  else { cat('racks'); cat('plats'); want.push('dbrack', 'dbrack'); if (opts.turf !== false) want.push('turf'); }   /* wall-bound pieces first: the back row, then the dumbbells on the left wall */
  cat('cardio'); cat('plates'); cat('machines'); want.push('cable', 'pullup');
  for (let i = 0; i < (counts.benches || 0); i++) want.push('bench'); want.push('mat', 'mat', 'mat', 'mat');
  for (const k of want) if (!addPiece(L, k, Wc, Dc)) refused.push(k);
  L.refused = refused; if (opts.turfFirst) L.turfFirst = true; return L;
}
// ---------------------------------------------------------------- Plan 12: what a rearrange changes, what it costs, and where a dropped piece goes
const REARRANGE = { mover: 3000, resale: 0.4, heavyPerDay: 4 };
function diffLayouts(a, b) {
  const was = new Map(a.pieces.map(p => [p.id, p])), now = new Set(b.pieces.map(p => p.id));
  const moved = [], bought = [], sold = a.pieces.filter(p => !now.has(p.id));
  for (const p of b.pieces) { const o = was.get(p.id); if (!o) bought.push(p); else if (o.sx !== p.sx || o.sz !== p.sz || o.rot !== p.rot) moved.push({ p, heavy: KINDS[p.kind].heavy }); }
  return { moved, bought, sold };
}
function quote(d) {
  const heavy = d.moved.filter(m => m.heavy).length, buy = d.bought.reduce((t, p) => t + KINDS[p.kind].price, 0), sell = REARRANGE.resale * d.sold.reduce((t, p) => t + KINDS[p.kind].price, 0), movers = REARRANGE.mover * heavy;
  return { movers, buy, sell, cost: movers + buy - sell, days: Math.ceil(heavy / REARRANGE.heavyPerDay) + (d.bought.length ? 1 : 0), heavy };
}
// the player drops piece `id` with its centre near sub-cell (sx, sz); the engine picks the facing and the nearest spot within 2 sub-cells, or refuses
function dropPiece(L, id, sx, sz, Wc, Dc) {
  const p = L.pieces.find(q => q.id === id); if (!p) return null;
  const others = L.pieces.filter(q => q !== p), G = gridFor({ pieces: others }, Wc, Dc); let best = null, bs = Infinity;
  KINDS[p.kind].rots.forEach((rot, ri) => { const [w, d] = dims({ kind: p.kind, rot });
    for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) { const c = { kind: p.kind, sx: sx + dx - Math.floor(w / 2), sz: sz + dz - Math.floor(d / 2), rot }, s = (Math.abs(dx) + Math.abs(dz)) * 10 + ri;
      if (s >= bs || !canPlace(G, c)) continue;
      const all = others.concat([c]); if (!reachableIn(gridFor({ pieces: all }, Wc, Dc), all)) continue; best = c; bs = s; } });
  if (!best) return null; p.sx = best.sx; p.sz = best.sz; p.rot = best.rot; return p;
}
