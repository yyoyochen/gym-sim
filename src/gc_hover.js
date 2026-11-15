// ================================================================ what you can tap (Plan 7b): a mouse hover outlines the thing under the pointer
// and names it; a steady glow on the floor marks the person being followed.
// hover and select (owner, 2026-11-15): hovering shows a thin dotted footprint and the name; the selected person or machine wears a solid footprint
// on the floor (the mark below) and nothing else, even under the pointer
const HOVER = { at: null, t: null, cv: null };
{ const cv = document.createElement('canvas'); cv.id = 'hover'; cv.setAttribute('aria-hidden', 'true'); canvas.insertAdjacentElement('afterend', cv);   /* above the scene, under the HUD and panels */ HOVER.cv = cv; }
// the ring's size in art pixels (owner, 2026-11-15): thin strips, pushed out past the tile edge by a fixed number of screen pixels, so it reaches further
// beyond the 1 m tile the further out you zoom and stays visible; floor strips look ~half as wide on screen as in plan, hence the 1.8x
const FOLLOW_PX = { base: 2 * 1.8, lite: 1 * 1.8, out: 3 };
// the selection mark (Plan 8b, owner): for the followed person, the 1 m tile of the floor grid they stand on; for a selected machine, its footprint.
// An outline (no fill) — a deep-gold edge with a lighter bevel on top — built as thin strips on the floor so the person or machine stands over it
const FOLLOW_MARK = (() => {
  const gr = new THREE.Group(), edges = [], base = new THREE.MeshBasicMaterial({ color: '#a6961e', fog: false }), lite = new THREE.MeshBasicMaterial({ color: '#f5f382', fog: false }), unit = new THREE.BoxGeometry(1, 0.012, 1);
  for (const [sx, sz] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) for (const [mat, y, px] of [[base, 0.006, FOLLOW_PX.base], [lite, 0.014, FOLLOW_PX.lite]]) {
    const m = new THREE.Mesh(unit, mat); m.position.y = y; m.userData = { sx, sz, px }; gr.add(m); edges.push(m); }
  gr.userData = { edges }; return gr;
})();
FOLLOW_MARK.visible = false; FOLLOW_MARK.renderOrder = 3; world.add(FOLLOW_MARK);
// a select-cursor feel (owner): on a new pick the outline snaps in from 1.6x with a small overshoot, then breathes ±3% every 1.2 s; never flashes
function personTile(a) {   // the floor tile under a person: the hips, since on a machine the body sits away from the walking spot
  const at = a.P && a.P.H ? a.P.H : a.pos; return [HALL.x0 + Math.floor(at.x - HALL.x0) + 0.5, HALL.zb + Math.floor(at.z - HALL.zb) + 0.5];
}
function updateFollowMark(dt = 0) {
  const a = followA, person = !!(a && a.visible && !(a.P && a.P.hidden)), who = person ? a : focusS || null; FOLLOW_MARK.visible = !!who;
  if (!who) { FOLLOW_MARK.userData.who = null; return; }
  const u = FOLLOW_MARK.userData; if (u.who !== who) { u.who = who; u.t = 0; } u.t += dt;
  let cx, cz, ha = 0.5, hc = 0.5, yaw = 0;
  if (person) [cx, cz] = personTile(a);
  else { const b = hoverBox({ kind: 'station', s: who }); cx = b[0]; cz = b[1]; ha = b[3] / 2; hc = b[5] / 2; yaw = b[6]; }
  const lock = Math.min(1, u.t / 0.35), ease = 1 - Math.pow(1 - lock, 3), over = Math.sin(lock * Math.PI) * 0.08;   /* 0 → 1 with a little overshoot */
  const k = lock < 1 ? 1.6 - 0.6 * ease - over : 1 + 0.03 * Math.sin((u.t - 0.35) * 2 * Math.PI / 1.2);
  FOLLOW_MARK.scale.set(k, 1, k);
  const wpp = (view.baseH / view.zoom) / rtH, out = FOLLOW_PX.out * wpp / k, A_ = ha + out, C_ = hc + out;   /* local units: the group's scale k is undone so the strips stay thin while it breathes */
  for (const m of u.edges) { const { sx, sz, px } = m.userData, w = px * wpp / k;
    m.position.x = sx * A_; m.position.z = sz * C_; m.scale.set(sx ? w : 2 * A_ + w, 1, sx ? 2 * C_ + w : w); }
  FOLLOW_MARK.rotation.y = -yaw;   /* local x runs along the machine's facing */
  FOLLOW_MARK.position.set(cx, 0.035, cz);
}
// the box that stands for each kind of thing: [centre x, z, bottom y, size along its facing, height, size across, facing angle]
const STATION_BOX = { rack: [1.4, 2.4, 1.5], olyplat: [2.6, 0.4, 2.4], bench: [1.3, 0.7, 0.6], dbspot: [1.0, 1.0, 1.8], cable: [1.0, 2.2, 1.2], sled: [1.0, 1.0, 0.8], pullup: [1.0, 2.4, 1.2], mat: [0.8, 0.15, 1.7] };
function hoverBox(t) {
  if (t.kind === 'agent') { const [x, z] = personTile(t.a); return [x, z, 0, 1, t.a.P && t.a.P.H ? t.a.P.H.y + 0.2 : 1.9, 1, 0]; }   /* the tile they'd get if picked */
  if (t.kind === 'board') return [PRICEBOARD_AT.x, PRICEBOARD_AT.z, 1.11, 0.42, 0.04, 0.66, 0];   /* flat on the counter */
  if (t.kind === 'desk') return [DESK_C.x, DESK_C.z, 0, 1.0, 1.6, 2.6, 0];
  const s = t.s, F = s.fit;
  if (s.type === 'sled') return [s.sledX, s.z, 0, 0.75, 1.1, 0.75, 0];   /* the sled itself, wherever it is on the lane (it's drawn each frame, not built) */
  if (F) { const f = [Math.cos(s.yaw), Math.sin(s.yaw)], r = [-Math.sin(s.yaw), Math.cos(s.yaw)], pad = 0.06;
    return [s.x + f[0] * F.ca + r[0] * F.cc, s.z + f[1] * F.ca + r[1] * F.cc, F.y0, F.a + pad, F.h + pad, F.c + pad, s.yaw]; }
  const [a, h, c] = STATION_BOX[s.type] || [1.2, 1.5, 1.2]; return [s.x, s.z, 0, a, h, c, s.yaw];
}
function hoverHull(t) {   // the screen outline of that box: the convex hull of its eight corners
  const [x, z, y0, a, h, c, yaw] = hoverBox(t), f = [Math.cos(yaw), Math.sin(yaw)], r = [-Math.sin(yaw), Math.cos(yaw)], R = canvas.getBoundingClientRect(), pts = [];
  for (const da of [-a / 2, a / 2]) for (const dc of [-c / 2, c / 2]) for (const y of [y0, y0 + h]) {
    _pv.set(x + f[0] * da + r[0] * dc, y, z + f[1] * da + r[1] * dc).project(cam); pts.push([R.left + (_pv.x + 1) / 2 * R.width, R.top + (1 - _pv.y) / 2 * R.height]);
  }
  pts.sort((p, q) => p[0] - q[0] || p[1] - q[1]); const cross = (o, p, q) => (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]), lo = [], hi = [];
  for (const p of pts) { while (lo.length > 1 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (const p of pts.slice().reverse()) { while (hi.length > 1 && cross(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
  return lo.slice(0, -1).concat(hi.slice(0, -1));
}
function hoverLabel(t) {   // Plan 8b (owner): just the name; the expand icon beside it says it can be opened
  return t.kind === 'agent' ? (A && t.a === A.desk ? tx('Front desk', '櫃檯') : trName(t.a.name)) : t.kind === 'board' ? tx('Price list', '價目表') : t.kind === 'desk' ? tx('Front desk', '櫃檯') : stationName(t.s);
}
function hoverBase(t) {   // the box's footprint: its four bottom edges, all drawn (it lies flat, nothing hides it)
  const [x, z, y0, a, , c, yaw] = hoverBox(t), f = [Math.cos(yaw), Math.sin(yaw)], r = [-Math.sin(yaw), Math.cos(yaw)], R = canvas.getBoundingClientRect();
  const P = (sa, sc) => { _pv.set(x + f[0] * sa * a / 2 + r[0] * sc * c / 2, y0, z + f[1] * sa * a / 2 + r[1] * sc * c / 2).project(cam); return [R.left + (_pv.x + 1) / 2 * R.width, R.top + (1 - _pv.y) / 2 * R.height]; };
  const v = [P(-1, -1), P(1, -1), P(1, 1), P(-1, 1)]; return v.map((p, i) => ({ a: p, b: v[(i + 1) % 4], shade: 0 }));
}
function updateHover() {
  const cv = HOVER.cv, dpr = Math.min(2, window.devicePixelRatio || 1), W = innerWidth, H = innerHeight;
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  const t = HOVER.at && !(typeof BOOKS !== 'undefined' && BOOKS.open) ? pickTarget(HOVER.at.x, HOVER.at.y) : null; HOVER.t = t;
  canvas.style.cursor = t ? 'pointer' : ''; if (!t) return;
  if ((t.kind === 'agent' && t.a === followA) || (t.kind === 'station' && t.s === focusS)) return;   /* already selected: the floor mark is enough (owner, 2026-11-15) */
  const hull = hoverHull(t); if (hull.length < 3) return;
  // the footprint (owner, 2026-11-15): thin dotted lines on the floor; the name tag still sits above the whole thing
  g.lineCap = 'butt'; g.lineWidth = 1.25; g.setLineDash([3, 3]); g.strokeStyle = '#dfe03a';
  const edges = hoverBase(t);
  g.beginPath(); for (const e of edges) { g.moveTo(e.a[0], e.a[1]); g.lineTo(e.b[0], e.b[1]); } g.stroke(); g.setLineDash([]);
  // the name and an expand icon (a box with an arrow out of its corner)
  const top = hull.reduce((m, p) => p[1] < m[1] ? p : m), cx = hull.reduce((s, p) => s + p[0], 0) / hull.length, text = hoverLabel(t);
  const fz = parseFloat(fs(12)), bh = Math.round(fz + 8);   /* the tag grows with the UI text size */
  g.font = fz + 'px Digits, Silkscreen, "Cubic 11", monospace'; const w = g.measureText(text).width + 34, x = Math.max(4, Math.min(W - w - 4, cx - w / 2)), y = Math.max(4, top[1] - bh - 8);
  g.fillStyle = 'rgba(16,19,28,.92)'; g.fillRect(x, y, w, bh); g.strokeStyle = '#dfe03a'; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, w - 1, bh - 1);
  g.fillStyle = '#f2f1ea'; g.textBaseline = 'middle'; g.fillText(text, x + 7, y + bh / 2 + 0.5);
  const ix = x + w - 20, iy = y + Math.round((bh - 12) / 2); g.strokeStyle = '#dfe03a'; g.lineWidth = 1.5; g.strokeRect(ix + 0.5, iy + 3.5, 9, 9);
  g.beginPath(); g.moveTo(ix + 6, iy + 7); g.lineTo(ix + 13, iy); g.moveTo(ix + 8.5, iy); g.lineTo(ix + 13, iy); g.lineTo(ix + 13, iy + 4.5); g.stroke();
}
