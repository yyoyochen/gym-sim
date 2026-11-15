// ================================================================ what you can tap (Plan 7b): a mouse hover outlines the thing under the pointer
// and names it; a steady glow on the floor marks the person being followed.
const HOVER = { at: null, t: null, cv: null };
{ const cv = document.createElement('canvas'); cv.id = 'hover'; cv.setAttribute('aria-hidden', 'true'); canvas.insertAdjacentElement('afterend', cv);   /* above the scene, under the HUD and panels */ HOVER.cv = cv; }
// the followed person's floor tile (Plan 8b, owner): the 1 m tile of the floor grid they stand on, outlined like a hovered machine (no fill) — a deep-gold edge with a lighter bevel on top — built as thin strips on the floor so the person stands over it; steady, no flashing
const FOLLOW_MARK = (() => {
  const gr = new THREE.Group(), edges = [], base = new THREE.MeshBasicMaterial({ color: '#a6961e', fog: false }), lite = new THREE.MeshBasicMaterial({ color: '#f5f382', fog: false });
  for (const [x, z, rot] of [[0, -0.5, 0], [0, 0.5, 0], [-0.5, 0, 1], [0.5, 0, 1]]) for (const [mat, w, t, y] of [[base, 1.07, 0.07, 0.006], [lite, 1.03, 0.03, 0.014]]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.012, t), mat); m.position.set(x, y, z); if (rot) m.rotation.y = Math.PI / 2; gr.add(m); edges.push(m); }
  gr.userData = { edges }; return gr;
})();
FOLLOW_MARK.visible = false; FOLLOW_MARK.renderOrder = 3; world.add(FOLLOW_MARK);
// a select-cursor feel (owner): on a new pick the outline snaps in from 1.6x with a small overshoot, then breathes ±3% every 1.2 s; never flashes
function updateFollowMark(dt = 0) {
  const a = followA, on = !!(a && a.visible && !(a.P && a.P.hidden)); FOLLOW_MARK.visible = on; if (!on) { FOLLOW_MARK.userData.who = null; return; }
  const u = FOLLOW_MARK.userData; if (u.who !== a) { u.who = a; u.t = 0; } u.t += dt;
  const lock = Math.min(1, u.t / 0.35), ease = 1 - Math.pow(1 - lock, 3), over = Math.sin(lock * Math.PI) * 0.08;   /* 0 → 1 with a little overshoot */
  const k = lock < 1 ? 1.6 - 0.6 * ease - over : 1 + 0.03 * Math.sin((u.t - 0.35) * 2 * Math.PI / 1.2);
  FOLLOW_MARK.scale.set(k, 1, k);
  const at = a.P && a.P.H ? a.P.H : a.pos;   /* the hips: on a machine the body sits away from the walking spot */
  FOLLOW_MARK.position.set(HALL.x0 + Math.floor(at.x - HALL.x0) + 0.5, 0.035, HALL.zb + Math.floor(at.z - HALL.zb) + 0.5);   /* the floor tile under them */
}
// the box that stands for each kind of thing: [centre x, z, bottom y, size along its facing, height, size across, facing angle]
const STATION_BOX = { rack: [1.4, 2.4, 1.5], olyplat: [2.6, 0.4, 2.4], bench: [1.3, 0.7, 0.6], dbspot: [1.0, 1.0, 1.8], cable: [1.0, 2.2, 1.2], sled: [1.0, 1.0, 0.8], pullup: [1.0, 2.4, 1.2], mat: [0.8, 0.15, 1.7] };
function hoverBox(t) {
  if (t.kind === 'agent') return [t.a.pos.x, t.a.pos.z, 0, 0.7, t.a.P && t.a.P.H ? t.a.P.H.y + 0.2 : 1.9, 0.7, 0];
  if (t.kind === 'board') return [PRICEBOARD_AT.x, PRICEBOARD_AT.z, 1.11, 0.42, 0.04, 0.66, 0];   /* flat on the counter */
  if (t.kind === 'desk') return [DESK_C.x, DESK_C.z, 0, 1.0, 1.6, 2.6, 0];
  const s = t.s, [a, h, c] = STATION_BOX[s.type] || [1.2, 1.5, 1.2]; return [s.x, s.z, 0, a, h, c, s.yaw];
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
// the box's outline on screen (Plan 8b, owner): the edges of its visible faces, each shaded by how it catches the light (top edges brightest),
// drawn thick with a bevel so the outline reads as having some thickness; no filled panels
function hoverEdges(t) {
  const [x, z, y0, a, h, c, yaw] = hoverBox(t), f = [Math.cos(yaw), Math.sin(yaw)], r = [-Math.sin(yaw), Math.cos(yaw)], R = canvas.getBoundingClientRect();
  const ce = Math.cos(view.el), toCam = [ce * Math.sin(view.az), Math.sin(view.el), ce * Math.cos(view.az)];
  const P = (sa, sc, sy) => { _pv.set(x + f[0] * sa * a / 2 + r[0] * sc * c / 2, sy ? y0 + h : y0, z + f[1] * sa * a / 2 + r[1] * sc * c / 2).project(cam); return [R.left + (_pv.x + 1) / 2 * R.width, R.top + (1 - _pv.y) / 2 * R.height]; };
  const K = (sa, sc, sy) => sa + ',' + sc + ',' + sy, faces = [
    { n: [0, 1, 0], v: [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]] },
    { n: [f[0], 0, f[1]], v: [[1, -1, 0], [1, 1, 0], [1, 1, 1], [1, -1, 1]] }, { n: [-f[0], 0, -f[1]], v: [[-1, -1, 0], [-1, 1, 0], [-1, 1, 1], [-1, -1, 1]] },
    { n: [r[0], 0, r[1]], v: [[-1, 1, 0], [1, 1, 0], [1, 1, 1], [-1, 1, 1]] }, { n: [-r[0], 0, -r[1]], v: [[-1, -1, 0], [1, -1, 0], [1, -1, 1], [-1, -1, 1]] }];
  const seen = new Map();
  for (const F of faces) { const d = F.n[0] * toCam[0] + F.n[1] * toCam[1] + F.n[2] * toCam[2]; if (d <= 0.02) continue;
    for (let i = 0; i < 4; i++) { const p = F.v[i], q = F.v[(i + 1) % 4], key = [K(...p), K(...q)].sort().join('|'), shade = p[2] && q[2] ? 1 : p[2] !== q[2] ? 0.75 : 0.55;
      if (!seen.has(key)) seen.set(key, { a: P(...p), b: P(...q), shade }); } }
  return [...seen.values()].sort((e1, e2) => e1.shade - e2.shade);
}
function updateHover() {
  const cv = HOVER.cv, dpr = Math.min(2, window.devicePixelRatio || 1), W = innerWidth, H = innerHeight;
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  const t = HOVER.at && !(typeof BOOKS !== 'undefined' && BOOKS.open) ? pickTarget(HOVER.at.x, HOVER.at.y) : null; HOVER.t = t;
  canvas.style.cursor = t ? 'pointer' : ''; if (!t) return;
  const hull = hoverHull(t); if (hull.length < 3) return;
  // the outline: each edge drawn thick in a deep gold, then a lighter face shifted up a pixel — a bevel that reads as thickness; top edges brightest
  g.lineCap = 'round';
  const edges = hoverEdges(t);
  for (const pass of [0, 1]) for (const e of edges) {
    const k = e.shade, col = pass ? `rgb(${Math.round(200 + 45 * k)},${Math.round(200 + 45 * k)},${Math.round(60 + 70 * k)})` : `rgb(${Math.round(120 + 40 * k)},${Math.round(110 + 40 * k)},20)`;
    g.strokeStyle = col; g.lineWidth = pass ? 2 : 4.5; g.beginPath(); g.moveTo(e.a[0], e.a[1] - pass); g.lineTo(e.b[0], e.b[1] - pass); g.stroke(); }
  // the name and an expand icon (a box with an arrow out of its corner)
  const top = hull.reduce((m, p) => p[1] < m[1] ? p : m), cx = hull.reduce((s, p) => s + p[0], 0) / hull.length, text = hoverLabel(t);
  g.font = '12px Silkscreen, "Cubic 11", monospace'; const w = g.measureText(text).width + 34, x = Math.max(4, Math.min(W - w - 4, cx - w / 2)), y = Math.max(4, top[1] - 28);
  g.fillStyle = 'rgba(16,19,28,.92)'; g.fillRect(x, y, w, 20); g.strokeStyle = '#dfe03a'; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, w - 1, 19);
  g.fillStyle = '#f2f1ea'; g.textBaseline = 'middle'; g.fillText(text, x + 7, y + 10.5);
  const ix = x + w - 20, iy = y + 4; g.strokeStyle = '#dfe03a'; g.lineWidth = 1.5; g.strokeRect(ix + 0.5, iy + 3.5, 9, 9);
  g.beginPath(); g.moveTo(ix + 6, iy + 7); g.lineTo(ix + 13, iy); g.moveTo(ix + 8.5, iy); g.lineTo(ix + 13, iy); g.lineTo(ix + 13, iy + 4.5); g.stroke();
}
