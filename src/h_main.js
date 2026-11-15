
// ================================================================ lighting follows the gym clock
const TOD = {
  day: { sun: [-0.45, 0.82, 0.36], sunC: '#fff3dc', sunI: 2.7, sky: '#cfe4ff', gnd: '#5b7a3c', hemiI: 1.55, top: '#4a8acb', bot: '#a5cdf0', exp: 1.05, lights: 0 },
  dusk: { sun: [-0.86, 0.24, 0.46], sunC: '#ffa060', sunI: 1.8, sky: '#ffb07a', gnd: '#3b2c3a', hemiI: 0.95, top: '#4d2a5e', bot: '#f0a060', exp: 1.15, lights: 0.8 },
  night: { sun: [0.35, 0.78, -0.45], sunC: '#9fb8ff', sunI: 0.35, sky: '#3a4a80', gnd: '#141a28', hemiI: 0.6, top: '#0b1a33', bot: '#13305a', exp: 1.3, lights: 1 }
};
const _ca = new THREE.Color(), _cb = new THREE.Color(), _va = new V3(), _vb = new V3(), _lt = { sun: new V3(), sunC: new THREE.Color(), sky: new THREE.Color(), gnd: new THREE.Color(), top: new V3(), bot: new V3() };
const _gray = linCol('#959bab'), _grayT = linCol('#6b7182'), winE = new THREE.Color('#ffd08a');
function mixTOD(a, b, k) {
  const A_ = TOD[a], B_ = TOD[b];
  _lt.sun.set(...A_.sun).lerp(_va.set(...B_.sun), k).normalize();
  _lt.sunC.set(A_.sunC).lerp(_ca.set(B_.sunC), k); _lt.sky.set(A_.sky).lerp(_ca.set(B_.sky), k); _lt.gnd.set(A_.gnd).lerp(_ca.set(B_.gnd), k);
  _lt.top.copy(linCol(A_.top)).lerp(linCol(B_.top), k); _lt.bot.copy(linCol(A_.bot)).lerp(linCol(B_.bot), k);
  _lt.sunI = lerp(A_.sunI, B_.sunI, k); _lt.hemiI = lerp(A_.hemiI, B_.hemiI, k); _lt.exp = lerp(A_.exp, B_.exp, k); _lt.lights = lerp(A_.lights, B_.lights, k);
}
const _sunQ = new V3();
function todAt(h) {
  if (h < 5.4) mixTOD('night', 'night', 0); else if (h < 6.3) mixTOD('night', 'dusk', (h - 5.4) / 0.9); else if (h < 7.3) mixTOD('dusk', 'day', h - 6.3);
  else if (h < 17.6) mixTOD('day', 'day', 0); else if (h < 18.8) mixTOD('day', 'dusk', (h - 17.6) / 1.2); else if (h < 19.8) mixTOD('dusk', 'night', h - 18.8); else mixTOD('night', 'night', 0);
}
// street lamp looks (the first is the default)
const LAMP_STYLES = {
  warm:  { col: [1.0, 0.68, 0.36], amt: 0.6,  mul: 0.0, pool: 1.0, soft: 1.5, r: 1.1, cone: 0, halo: 0 },
  lit:   { col: [1.0, 0.8, 0.52], amt: 0.06, mul: 2.6, pool: 1.0, soft: 1.1, r: 1.1, cone: 0, halo: 0 },
  cone:  { col: [1.0, 0.74, 0.42], amt: 0.45, mul: 0.5, pool: 0.9, soft: 1.5, r: 1.0, cone: 1.3, halo: 0.6 },
  halo:  { col: [1.0, 0.7, 0.4], amt: 0.4, mul: 0.6, pool: 0.85, soft: 1.7, r: 0.9, cone: 0, halo: 1.4 },
  led:   { col: [0.82, 0.9, 1.0], amt: 0.3, mul: 1.0, pool: 0.8, soft: 1.0, r: 1.6, cone: 0, halo: 0.8 }
};
let _lampKey = '';
function applyLampStyle(on) {
  const st = LAMP_STYLES[window.__lampStyle] || LAMP_STYLES.led, pu = postMat.uniforms;
  if (_lampKey !== (window.__lampStyle || 'led')) { _lampKey = window.__lampStyle || 'led'; for (const m of POOLS.children) { if (m.userData.s0 === undefined) m.userData.s0 = m.scale.x; const k = st.r; m.scale.x = m.userData.s0 * k; m.scale.z = (m.userData.sz0 ?? (m.userData.sz0 = m.scale.z)) * k; } }
  pu.glowCol.value.set(st.col[0], st.col[1], st.col[2]); pu.glowAmt.value = st.amt; pu.glowMul.value = st.mul;
  poolMat.uniforms.strength.value = st.pool * on; poolMat.uniforms.soft.value = st.soft; POOLS.visible = on > 0.05;
  coneMat.uniforms.strength.value = st.cone * on; CONES.visible = st.cone > 0 && on > 0.05;
  haloMat.uniforms.strength.value = st.halo * on; HALOS.visible = st.halo > 0 && on > 0.05;
}
function applyLighting(t) {
  // the sun's direction moves in 10-minute steps so shadows hold still instead of crawling every frame
  // light colours and levels change in 5-minute steps: with a 64-colour palette a continuous fade makes colour bands crawl across the floor
  const h = t / 3600; todAt(Math.round(h * 6) / 6); _sunQ.copy(_lt.sun); todAt(Math.round(h * 12) / 12); _lt.sun.copy(_sunQ);
  const rr = Math.round(env.rainAmt * 8) / 8, heat = S.weather === 'Heatwave' ? 1 : 0;
  sun.position.copy(_lt.sun).multiplyScalar(80); sun.color.copy(_lt.sunC); sun.intensity = _lt.sunI * (1 - 0.6 * rr) * (1 + 0.15 * heat);
  hemi.color.copy(_lt.sky); hemi.groundColor.copy(_lt.gnd); hemi.intensity = _lt.hemiI * (1 - 0.2 * rr);
  const lightsOn = Math.max(_lt.lights, rr * 0.6);
  for (const l of hallLights) l.intensity = lightsOn * 22;
  for (const l of lotLights) l.intensity = 0; applyLampStyle(_lt.lights);   // street lamps glow but don't throw round pools (the 64-colour palette turns those into curved bands)
  winMat.emissive.copy(winE).multiplyScalar(lightsOn * 0.8); lampMat.emissive.copy(winE).multiplyScalar(_lt.lights); signMat.emissive.setRGB(_lt.lights * 0.9, _lt.lights * 0.9, _lt.lights * 0.3); for (const m of signMats) m.emissive.setScalar(_lt.lights * 0.7); for (const m of hSignMats) m.emissive.setScalar(_lt.lights * 0.7);
  const pu = postMat.uniforms, g = rr * (_lt.lights > 0.8 ? 0.25 : 0.6);
  pu.skyTop.value.copy(_lt.top).lerp(_grayT, g); pu.skyBot.value.copy(_lt.bot).lerp(_gray, g);
  if (heat) pu.skyBot.value.lerp(linCol('#ffd08a'), 0.25 * (1 - _lt.lights));
  // backdrop: horizon glow, sun and moon on their arcs (sunrise 06:00, sunset 18:30), clouds by weather, land by setting
  pu.skyHor.value.copy(pu.skyBot.value).lerp(_va.set(_lt.sunC.r, _lt.sunC.g, _lt.sunC.b), 0.35 * (1 - g));
  pu.sunCol.value.set(_lt.sunC.r, _lt.sunC.g, _lt.sunC.b);
  { const sH = (h - 6) / 12.5, up = sH > 0 && sH < 1 ? Math.min(1, Math.sin(Math.PI * sH) * 4) : 0;
    pu.sunP.value.set(0.08 + 0.84 * sH, 0.79 + Math.sin(Math.PI * clamp(sH, 0, 1)) * 0.17, up * (1 - 0.8 * rr));
    let mH = h - 18.5; if (mH < 0) mH += 24; mH /= 11.5; const mu = mH > 0 && mH < 1 ? Math.min(1, Math.sin(Math.PI * mH) * 4) * (1 - up) : 0;
    pu.moonP.value.set(0.08 + 0.84 * mH, 0.8 + Math.sin(Math.PI * clamp(mH, 0, 1)) * 0.15, mu * (1 - 0.8 * rr)); }
  pu.tSec.value = performance.now() / 1000; pu.cover.value = heat ? 0.15 : 0.35 + 0.6 * rr; pu.rainy.value = rr;
  pu.setting.value = curSetting === 'Rural' ? 2 : curSetting === 'Suburban' ? 1 : 0;
  pu.shift.value.set(view.az * 0.6 + view.target.x * 0.003, 0);
  { const LAND = { Urban: ['#959bab', '#474c5c'], Suburban: ['#8cc456', '#317033'], Rural: ['#bfe07a', '#448c3a'] }[curSetting || 'Urban'];
    const dl = lerp(1, 0.22, _lt.lights) * (1 - 0.35 * rr);
    pu.landA.value.copy(linCol(LAND[0])).multiplyScalar(dl).lerp(pu.skyHor.value, 0.35); pu.landB.value.copy(linCol(LAND[1])).multiplyScalar(dl * 0.9); }
  pu.exposure.value = _lt.exp * (1 + 0.06 * heat); pu.night.value = _lt.lights > 0.9 && rr < 0.3 ? 1 : 0;
}
// ================================================================ picking: tap a person to follow, or a station to inspect
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), gPlane = new THREE.Plane(new V3(0, 1, 0), 0), hitP = new V3(), _pv = new V3();
const ZMIN = 0.6, ZMAX = 10;   // furthest view is locked so the board always fills the screen
const ptrs = new Map(); let pinch0 = 0, zoom0 = 1, downAt = null, panning = false, panLast = null;
const _pr2 = new V3(), _pf2 = new V3();
function panBy(dx, dy) {   // screen pixels -> ground movement so the ground follows the pointer
  const r = canvas.getBoundingClientRect(); const wpp = (view.baseH / view.zoom) / r.height;
  _pr2.copy(_cr); _pr2.y = 0; _pr2.normalize(); _pf2.copy(_cf); _pf2.y = 0; _pf2.normalize();
  view.target.addScaledVector(_pr2, -dx * wpp).addScaledVector(_pf2, dy * wpp / Math.sin(view.el));
  view.target.x = clamp(view.target.x, -40, 40); view.target.z = clamp(view.target.z, -36, 38);
  if (window.__clampView !== false) keepViewOnBoard();
  view.follow = null;
}
// Plan 12: while Rearrange is open, a press on a piece drags it (a ghost shows where it would go, green or red); a tap selects it
const RDRAG = { id: null, moved: false, at: null };
function subAt(cx, cy) { const r = canvas.getBoundingClientRect(); ndc.set((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, cam); const h = new V3(); if (!ray.ray.intersectPlane(gPlane, h)) return null; return [Math.floor((h.x - HALL.x0) / SUB), Math.floor((h.z - HALL.zb) / SUB)]; }
function rDown(cx, cy) { if (!BUILD.on || BUILD.mode !== 'rearrange') return false; const s = subAt(cx, cy), p = s && pieceAt(s[0], s[1]); if (!p) return false; RDRAG.id = p.id; RDRAG.moved = false; RDRAG.at = { x: cx, y: cy }; return true; }
function rMove(cx, cy) {
  if (RDRAG.id == null) return false; if (!BUILD.on || BUILD.mode !== 'rearrange') { RDRAG.id = null; RGHOST.visible = false; return false; } if (Math.hypot(cx - RDRAG.at.x, cy - RDRAG.at.y) > 6) RDRAG.moved = true; if (!RDRAG.moved) return true;
  const s = subAt(cx, cy); if (!s) return true; const T = JSON.parse(JSON.stringify(BUILD.layout)), p = dropPiece(T, RDRAG.id, s[0], s[1], BUILD.w, BUILD.d), q = p || T.pieces.find(x => x.id === RDRAG.id);
  const k = KINDS[q.kind], w = (q.rot % 2 ? k.d : k.w) * SUB, d = (q.rot % 2 ? k.w : k.d) * SUB, cx0 = p ? HALL.x0 + (p.sx * SUB + w / 2) : HALL.x0 + (s[0] + 0.5) * SUB, cz0 = p ? HALL.zb + (p.sz * SUB + d / 2) : HALL.zb + (s[1] + 0.5) * SUB;
  RGHOST.scale.set(w, 1, d); RGHOST.position.x = cx0; RGHOST.position.z = cz0; RGHOST.material.color.set(p ? '#5ee08a' : '#d6403a'); RGHOST.visible = true; return true;
}
function rUp(cx, cy) { if (RDRAG.id == null) return false; const id = RDRAG.id; RDRAG.id = null; RGHOST.visible = false; if (!BUILD.on || BUILD.mode !== 'rearrange') return true; if (RDRAG.moved) { const s = subAt(cx, cy); if (s) rearrangeDrop(id, s[0], s[1]); } else { BUILD.sel = id; renderBuild(); } return true; }
canvas.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') return; if (rDown(e.clientX, e.clientY)) { canvas.setPointerCapture(e.pointerId); return; } canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (ptrs.size === 1) { downAt = { x: e.clientX, y: e.clientY }; panLast = { x: e.clientX, y: e.clientY }; panning = false; } if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); zoom0 = view.zoomT; downAt = null; panning = false; panLast = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; } });
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'touch' && rMove(e.clientX, e.clientY)) return;
  if (e.pointerType === 'touch' || !ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 2 && pinch0 > 0) { const [a, b] = [...ptrs.values()]; view.zoomT = clamp(zoom0 * Math.hypot(a.x - b.x, a.y - b.y) / pinch0, ZMIN, ZMAX); const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; panBy(m.x - panLast.x, m.y - panLast.y); panLast = m; return; }
  if (ptrs.size === 1 && panLast) {
    if (!panning && downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6) { panning = true; canvas.classList.add('panning'); }
    if (panning) { panBy(e.clientX - panLast.x, e.clientY - panLast.y); panLast = { x: e.clientX, y: e.clientY }; }
  }
});
canvas.addEventListener('pointerup', (e) => {
  if (e.pointerType === 'touch') return; if (rUp(e.clientX, e.clientY)) return;
  if (ptrs.size === 1 && downAt && !panning && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < 8) pickAt(e.clientX, e.clientY);
  ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = 0; if (ptrs.size === 0) { downAt = null; panning = false; canvas.classList.remove('panning'); }
  else if (ptrs.size === 1) { const p = [...ptrs.values()][0]; panLast = { x: p.x, y: p.y }; downAt = null; }
});
canvas.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') HOVER.at = ptrs.size ? null : { x: e.clientX, y: e.clientY }; });   // hover: mouse only, not while dragging
canvas.addEventListener('pointerleave', () => { HOVER.at = null; });
canvas.addEventListener('pointercancel', (e) => { if (e.pointerType === 'touch') return; ptrs.delete(e.pointerId); downAt = null; panning = false; canvas.classList.remove('panning'); });
canvas.addEventListener('wheel', (e) => { e.preventDefault(); view.zoomT = clamp(view.zoomT * Math.exp(-e.deltaY * 0.0012), ZMIN, ZMAX); }, { passive: false });

// ---------------------------------------------------------------- touch: two fingers pinch to zoom (about the fingers) and move together to pan; one finger drags or taps
const TCH = { mode: null, d0: 0, z0: 1, last: null, start: null, moved: false };
const tMid = (ts) => ({ x: (ts[0].clientX + ts[1].clientX) / 2, y: (ts[0].clientY + ts[1].clientY) / 2 });
const tDist = (ts) => Math.max(1, Math.hypot(ts[0].clientX - ts[1].clientX, ts[0].clientY - ts[1].clientY));
function screenCentre() { const r = canvas.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * (0.5 - (view.yOff || 0)) }; }
function twoStart(ts) { if (typeof RDRAG !== 'undefined' && RDRAG.id != null) { RDRAG.id = null; RGHOST.visible = false; }   /* a pinch ends a piece drag */ TCH.mode = 'two'; TCH.d0 = tDist(ts); TCH.z0 = view.zoom = view.zoomT; TCH.last = tMid(ts); TCH.moved = true; }
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault(); const ts = e.touches;
  if (ts.length === 1 && rDown(ts[0].clientX, ts[0].clientY)) { TCH.mode = 'rdrag'; return; }   /* Plan 12: drag a piece with one finger */
  if (ts.length === 1) { TCH.mode = 'one'; TCH.start = { x: ts[0].clientX, y: ts[0].clientY }; TCH.last = { ...TCH.start }; TCH.moved = false; }
  else twoStart(ts);
}, { passive: false });
canvas.addEventListener('touchmove', (e) => {
  e.preventDefault(); const ts = e.touches;
  if (TCH.mode === 'rdrag' && ts.length === 1) { rMove(ts[0].clientX, ts[0].clientY); return; }
  if (ts.length >= 2) {
    if (TCH.mode !== 'two') twoStart(ts);
    const m = tMid(ts); panBy(m.x - TCH.last.x, m.y - TCH.last.y); TCH.last = m;
    const z1 = view.zoom, z2 = clamp(TCH.z0 * tDist(ts) / TCH.d0, ZMIN, ZMAX);
    if (Math.abs(z2 - z1) > 1e-4) { view.zoom = view.zoomT = z2; const c = screenCentre(), k = 1 - z2 / z1; panBy((m.x - c.x) * k, (m.y - c.y) * k); }
  } else if (ts.length === 1 && TCH.last) {
    const p = { x: ts[0].clientX, y: ts[0].clientY };
    if (!TCH.moved && TCH.start && Math.hypot(p.x - TCH.start.x, p.y - TCH.start.y) > 8) { TCH.moved = true; canvas.classList.add('panning'); }
    if (TCH.moved) panBy(p.x - TCH.last.x, p.y - TCH.last.y);
    TCH.last = p;
  }
}, { passive: false });
function touchEnd(e) {
  e.preventDefault(); const ts = e.touches;
  if (TCH.mode === 'rdrag') { const t = e.changedTouches[0]; rUp(t.clientX, t.clientY); TCH.mode = null; return; }
  if (ts.length === 0) { if (TCH.mode === 'one' && !TCH.moved && TCH.start && e.type === 'touchend') pickAt(TCH.start.x, TCH.start.y); TCH.mode = null; TCH.last = null; canvas.classList.remove('panning'); }
  else if (ts.length === 1) { TCH.mode = 'one'; TCH.moved = true; TCH.last = { x: ts[0].clientX, y: ts[0].clientY }; }   // lifting one finger of a pinch never counts as a tap
  else twoStart(ts);
}
canvas.addEventListener('touchend', touchEnd, { passive: false }); canvas.addEventListener('touchcancel', touchEnd, { passive: false });

for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });   // stop iOS zooming the whole page
// the receptionist opens the books instead of being followed (Call 13); everyone else is followed
function onAgentPicked(a) { if (A && a === A.desk) { openBooks(); return; } followA = a; focusS = null; view.follow = a; updateCard(); }
// a tap on the reception desk (within 1.6 m of its centre) opens the books; the price sign opens Pricing
function groundTarget(x, z) { if (Math.hypot(x - PRICEBOARD_AT.x, z - PRICEBOARD_AT.z) < 0.55) return { kind: 'board' }; if (Math.hypot(x - DESK_C.x, z - DESK_C.z) < 1.6) return { kind: 'desk' }; return null; }
function actOn(t) { if (t.kind === 'agent') onAgentPicked(t.a); else if (t.kind === 'board') openBooks('Pricing'); else if (t.kind === 'desk') openBooks(); else if (t.kind === 'station') { focusS = t.s; followA = null; view.follow = null; updateCard(); } }
function onGroundPicked(x, z) { const t = groundTarget(x, z); if (t) actOn(t); return !!t; }
// what is under a screen point, in tap order: people, the price sign, the desk monitor, then the desk and equipment on the floor. Acts on nothing (hover uses it too).
function pickTarget(cx, cy) {
  if (BUILD.on) return null;   /* the builder owns the screen */
  const r = canvas.getBoundingClientRect(); const x = cx - r.left, y = cy - r.top, near = (px, py, pz, rad) => { _pv.set(px, py, pz).project(cam); return Math.hypot((_pv.x + 1) / 2 * r.width - x, (1 - _pv.y) / 2 * r.height - y) < rad; };
  let best = null, bd = 26;
  for (const a of AGENTS) {
    if (!a.visible || a.P.hidden || !a.vis.head) continue;
    for (const p of [a.vis.head, a.P.H]) { _pv.copy(p).project(cam); const sx = (_pv.x + 1) / 2 * r.width, sy = (1 - _pv.y) / 2 * r.height; const d = Math.hypot(sx - x, sy - y); if (d < bd) { bd = d; best = a; } }
  }
  if (best) return { kind: 'agent', a: best };
  if (near(PRICEBOARD_AT.x, PRICEBOARD_AT.y, PRICEBOARD_AT.z, 40)) return { kind: 'board' };
  if (near(DESK_MON.x, DESK_MON.y, DESK_MON.z, 44)) return { kind: 'desk' };
  ndc.set(x / r.width * 2 - 1, -(y / r.height) * 2 + 1); ray.setFromCamera(ndc, cam);
  if (ray.ray.intersectPlane(gPlane, hitP)) {
    const g = groundTarget(hitP.x, hitP.z); if (g) return g;
    let s0 = null, sd = 1.6; for (const s of STATIONS) { const d = Math.hypot(s.x - hitP.x, s.z - hitP.z); if (d < sd) { sd = d; s0 = s; } }
    if (s0) return { kind: 'station', s: s0 };
  }
  return null;
}
function pickAt(cx, cy) { const t = pickTarget(cx, cy); if (t) actOn(t); else clearFollow(); }
document.getElementById('rotL').addEventListener('click', () => { view.azT -= Math.PI / 2; });
document.getElementById('rotR').addEventListener('click', () => { view.azT += Math.PI / 2; });
document.getElementById('zoomIn').addEventListener('click', () => { view.zoomT = clamp(view.zoomT * 1.25, ZMIN, ZMAX); });
document.getElementById('zoomOut').addEventListener('click', () => { view.zoomT = clamp(view.zoomT / 1.25, ZMIN, ZMAX); });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && BOOKS.open) { closeBooks(); return; } if (BUILD.on) { if (e.key === 'Escape') { if (BUILD.intro) { const back = { cost: 'welcome', pay: 'cost', custom: 'cost' }[BUILD.step]; if (back) introStep(back); else if (BUILD.introCancel) cancelBuild(); } else cancelBuild(); } return; }   /* the builder owns the keys */ if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return; if (e.target.closest && e.target.closest('#books')) return; /* keys inside the binder don't drive the sim */ if (e.key === 'q' || e.key === 'Q') view.azT -= Math.PI / 2; if (e.key === 'e' || e.key === 'E') view.azT += Math.PI / 2; if (e.key === ' ') { e.preventDefault(); W.go.click(); }
  const k = { ArrowLeft: [40, 0], a: [40, 0], A: [40, 0], ArrowRight: [-40, 0], d: [-40, 0], D: [-40, 0], ArrowUp: [0, 40], w: [0, 40], W: [0, 40], ArrowDown: [0, -40], s: [0, -40], S: [0, -40] }[e.key];
  if (k) { e.preventDefault(); panBy(k[0], k[1]); } });

// ================================================================ render
const reflClear = new THREE.Color();
function render() {
  puddleMat.uniforms.wet.value = env.wet; puddleMat.uniforms.time.value = performance.now() / 1000;
  puddles.visible = env.wet > 0.02;
  if (puddles.visible) {
    puddles.visible = false; under.visible = false; floorMesh.visible = false; const rv = rain.visible; rain.visible = false;
    world.scale.y = -1; renderer.shadowMap.autoUpdate = false;
    const b = postMat.uniforms.skyBot.value; reflClear.setRGB(b.x, b.y, b.z, THREE.LinearSRGBColorSpace); renderer.setClearColor(reflClear, 1);
    renderer.setRenderTarget(rtRefl); renderer.clear(); renderer.render(scene, cam);
    world.scale.y = 1; renderer.shadowMap.autoUpdate = true; renderer.setClearColor(0x000000, 1);
    puddles.visible = true; under.visible = true; floorMesh.visible = true; rain.visible = rv; puddleMat.uniforms.tRefl.value = rtRefl.texture;
  }
  renderer.setRenderTarget(rtMain); renderer.clear(); renderer.render(scene, cam);
  renderer.setRenderTarget(rtPost); renderer.render(postScene, postCam);
  renderer.setRenderTarget(null); renderer.render(blitScene, postCam);
}
// ================================================================ main loop
const focusV = new V3();
let last = performance.now(), simAcc = 0, uiT = 0, plotT = 0;
function frame(now) { requestAnimationFrame(frame); const real = Math.min(0.25, Math.max(0, (now - last) / 1000)); last = now; try { tick(real, now); } catch (err) { if (!frame.warned) { frame.warned = true; console.error(err); } } }   // one bad frame must never freeze the sim
function advance(real) {
  if (!playing()) return;
  simAcc += real * S.speed; let n = 0;
  while (simAcc >= STEP && n < 1200) { simStep(); simAcc -= STEP; n++; if (A.done) { goOn = false; refreshGo(); showToast(tr(monthComplete() ? 'Month complete · press New month' : 'Day complete · press Next day')); break; } }
}
// the furthest view never shows past the board: zoom in just enough, and keep the target where every screen corner lands on the board
const _vc = new V3();
function keepViewOnBoard() {
  if (_cr.lengthSq() < 1e-6 || !(scene.fog.near > 0)) return;   // camera axes not set up yet on the very first frame
  const E = scene.fog.color.r - 1, S = scene.fog.color.g - 1, Wb = scene.fog.color.b - 1, N = scene.fog.near - 1;
  const fitAt = (z) => {   // allowed target ranges for a zoom, or null if the view is wider than the board
    const H2 = view.baseH / z / 2, W2 = H2 * aspect;
    let x0 = -1e9, x1 = 1e9, z0 = -1e9, z1 = 1e9;
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {   // the bottom corners may reach 26 m past the edge, into the fade
      // with the phone sheet open only the top of the frame is visible: the bottom corners sit at the sheet's edge
      const top = H2 - (view.yOff || 0) * 2 * H2, vis = (view.yOff || 0) > 0.01 ? 0.48 : 1;
      _vc.copy(_cr).multiplyScalar(sx * W2).addScaledVector(_cu, sy > 0 ? top : top - vis * 2 * H2);
      const k = -(view.target.y + _vc.y) / _cf.y; const ox = _vc.x + _cf.x * k, oz = _vc.z + _cf.z * k;
      const m = sy < 0 ? 26 : 0; x0 = Math.max(x0, -Wb - m - ox); x1 = Math.min(x1, E + m - ox); z0 = Math.max(z0, -N - m - oz); z1 = Math.min(z1, S + m - oz);
    }
    return x0 <= x1 && z0 <= z1 ? [x0, x1, z0, z1] : null;
  };
  // hard stops, no springing back: the zoom target never goes further out than the board allows,
  // and the pan target is clamped against the zoom actually on screen, before the camera is placed
  let z = view.zoomT;
  if (!fitAt(z)) { while (!fitAt(z) && z < ZMAX) z *= 1.01; view.zoomT = z; }
  if (view.zoom < view.zoomT && !fitAt(view.zoom)) view.zoom = view.zoomT;
  const r = fitAt(view.zoom) || fitAt(view.zoomT);
  if (r) { view.target.x = clamp(view.target.x, r[0], r[1]); view.target.z = clamp(view.target.z, r[2], r[3]); }
}
function tick(raw, now) {
  advance(raw); if (!BUILD.on) updateIntro(Math.min(0.25, raw));                        // the sim keeps true speed on slow devices (up to 4 fps)
  const real = Math.min(0.05, raw);    // animation steps stay small
  env.raining = S.weather === 'Rain';
  env.rainAmt = clamp(env.rainAmt + (env.raining ? 1 : -1) * real * 0.4, 0, 1);
  env.wet = clamp(env.wet + (env.rainAmt > 0.2 ? real * 0.08 * env.rainAmt : -real * 0.02), 0, 1);
  for (const pd of puddles.children) { const s = pd.userData.r * (0.35 + 0.65 * env.wet); pd.scale.set(s * 1.4, 1, s); }
  if (view.follow && view.follow.visible) view.target.lerp(_va.set(view.follow.pos.x, 0, view.follow.pos.z), Math.min(1, real * 4));
  view.yOffT = window.innerWidth < 860 ? (BUILD.on ? 0.3 : !panel.classList.contains('closed') ? 0.24 : 0) : 0;   /* the build sheet is taller than the panel */
  updateWalls(real); if (window.__clampView !== false) keepViewOnBoard(); const wpp = updateCamera(real); updateFollowMark(real); updateHover();
  FRAME++;
  BOX.begin(); CYL.begin(); vBegin();
  if (A) {
    // heads follow the nearest action
    for (const a of AGENTS) {
      if (!a.visible || BUILD.on) continue;   /* nobody on the floor while building */
      if (a.kind === 'member' && a.state === 'ex') { const e = a.prog[a.exI]; a.lookAt = e && e.st === 'wait' && e.waitS ? _lookOf(e.waitS) : null; }
      else if (a.kind === 'staff') a.lookAt = null;
      else a.lookAt = null;
      animAgent(a, real, now);
    }
    drawStations(now); drawVehicles(real);
  }
  BOX.end(); CYL.end(); vEnd();
  applyLighting(A ? A.t : 12 * 3600);
  updateRain(real * (playing() ? 1 : 0.3));
  applySetting(S.setting);
  clouds.position.x = Math.sin(now / 50000) * 6;
  uiT -= real; if (uiT <= 0) { uiT = 0.2; updateMonitors(); if (followA || focusS) updateCard(); }
  updateBooksHint(window.__LO.toScreen);
  plotT -= real; if (plotT <= 0) { plotT = 0.5; drawPlots(); }
  { // portal clock shows the gym clock (the HUD time) on an ordinary 12-hour face
    const gt = A ? A.t : 12 * 3600, h = (gt / 3600) % 12, m = (gt / 60) % 60;
    hourHand.rotation.z = -h / 12 * Math.PI * 2; minHand.rotation.z = -m / 60 * Math.PI * 2;
  }
  updatePays();
  render();
}
// ================================================================ "+$" pops at the gate as members pay on the way out
const PAYS = [], _payV = new V3();
let payNext = 0, payDing = 0, payRun = null;
function updatePays() {
  const now = performance.now();
  if (A !== payRun) { payRun = A; for (const p of PAYS) p.el.remove(); PAYS.length = 0; payNext = 0; }   // a new run (Setup) clears pops still waiting from the old one
  if (BUILD.on) { for (const p of PAYS) p.el.remove(); PAYS.length = 0; if (A && A.payQ) A.payQ.length = 0; return; }   /* no money pops over the builder's preview */
  if (A && A.payQ && A.payQ.length) {
    const q = A.payQ.splice(0);
    // fast-forward can bill dozens at once: show the latest few floor fees, and every PT sale
    const last = (f, n) => q.filter(f).slice(-n);
    const show = [...last(p => !p.pt && !p.rent, 3), ...last(p => p.rent, 2), ...last(p => p.pt, 3)];   // after a fast-forward: a few of each kind, PT sales last
    for (const p of show) {
      // colour: green = money in (fee, rent), yellow = capped visit, gold = PT sale (gold is reserved for it)
      const crit = !p.pt && !p.rent && p.fee >= PRICE.cap;   // hit the per-visit cap: the "critical hit"
      const el = document.createElement('div'); el.className = 'pay' + (p.pt ? ' pt' : p.rent ? ' rent' : crit ? ' crit' : ''); el.style.opacity = 0;
      el.innerHTML = `+$${p.fee.toLocaleString('en-US')}${p.pt ? `<small>PT ×${p.pt.n}${p.pt.inst ? ' · ' + p.pt.inst : ''}!</small>` : p.rent ? '<small>RENT</small>' : crit ? '<small>MAX!</small>' : ''}`;
      document.body.appendChild(el);
      payNext = Math.max(now, payNext + (p.pt ? 700 : 450));
      const side = Math.random() < 0.5 ? -1 : 1;
      PAYS.push({ el, born: payNext, pt: !!p.pt, vx: side * (p.pt ? 6 : 14 + Math.random() * 22), size: p.pt ? 2.1 : 0.8 + Math.min(1, p.fee / PRICE.cap) * 0.6 + (crit ? 0.25 : 0), rung: false });
    }
  }
  const r = canvas.getBoundingClientRect();
  _payV.set(DOOR.x, 2.6, HZ).project(cam);   // the gate: numbers burst from here, they don't follow the member
  const gx = r.left + (_payV.x + 1) / 2 * r.width, gy = r.top + (1 - _payV.y) / 2 * r.height;
  for (let i = PAYS.length - 1; i >= 0; i--) {
    const p = PAYS[i], ms = now - p.born, k = ms / (p.pt ? 2600 : 1300);
    if (k < 0) continue;
    if (k >= 1) { p.el.remove(); PAYS.splice(i, 1); continue; }
    if (!p.rung) { p.rung = true; if (p.pt) sfx('jackpot'); else if (now - payDing > 120) { payDing = now; sfx('cash'); } }
    // RPG damage number: punch in big, settle, hop up on an arc, drift sideways, fade at the end
    const s = ms / 1000, punch = ms < 90 ? 0.3 + ms / 90 * 1.4 : ms < 220 ? 1.7 - (ms - 90) / 130 * 0.7 : 1;
    let y = -(150 * s - 170 * s * s) - 18 * s, x = p.vx * s;   // fast hop that slows near its peak, then sinks a little
    if (p.pt) {   // the PT sale: a bigger, slower rise that hangs in the air and shakes like a level-up
      y = -70 * (1 - Math.exp(-s * 3.2));
      if (ms > 120 && ms < 900) { x += Math.sin(ms / 22) * 3 * (1 - ms / 900); y += Math.cos(ms / 17) * 2 * (1 - ms / 900); }
      p.el.style.filter = `brightness(${(1.1 + 0.25 * Math.sin(ms / 70)).toFixed(2)})`;   // gold glints
    }
    p.el.style.transform = `translate(${gx + x}px, ${gy + y}px) translate(-50%, -100%) scale(${(punch * p.size).toFixed(3)})`;
    p.el.style.opacity = k < 0.7 ? 1 : (1 - k) / 0.3;
  }
}
const _lv = new V3(); function _lookOf(s) { return _lv.set(s.x, 1.2, s.z); }
// ================================================================ boot
window.addEventListener('resize', () => { onResize(); positionUI(); placePlots(); });
function positionUI() { panel.style.width = panelW ? panelW + 'px' : ''; document.getElementById('viewbar').style.left = '';
  const side = innerWidth < 860 ? 0 : BUILD.on ? document.getElementById('build').getBoundingClientRect().width : panel.getBoundingClientRect().width;   /* on phones the media rule pins it to the corner */
  document.documentElement.style.setProperty('--rightW', Math.round(side) + 'px'); }
onResize(); positionUI();
// sound toggle sits with the language toggle (the audio can only start after a click, so it begins muted)
const sndBtn = document.getElementById('sndBtn');
function refreshSnd() { sndBtn.classList.toggle('on', soundOn); sndBtn.setAttribute('aria-pressed', soundOn); sndBtn.title = tr(soundOn ? 'Sound on' : 'Sound off'); sndBtn.setAttribute('aria-label', sndBtn.title); }
sndBtn.addEventListener('click', () => { soundOn = !soundOn; if (soundOn) ensureAudio(); refreshSnd(); });
buildPanel(); placePlots(); setLang(LANG);
document.getElementById('langBtn').addEventListener('click', () => setLang(zh() ? 'en' : 'zh'));
{ const q = new URLSearchParams(location.search); if (!q.has('selftest') && !q.has('shot')) Object.assign(S, todayStart(new Date())); }   /* owner: the gym opens today; tests and screenshots keep 1 Jun 2027 */
setupRun(); if (typeof syncSetupWidgets === 'function') syncSetupWidgets(); refreshPending();
goOn = true; refreshGo();
if (introWanted()) { goOn = false; refreshGo(); openIntro(); }   /* first visit: start by building (Plan 10) */
if (window.innerWidth < 860) panel.classList.add('closed');
if (document.fonts && document.fonts.load) Promise.all([document.fonts.load('700 22px Silkscreen'), document.fonts.load('16px Digits', '0123456789')]).then(() => { drawPriceBoard(true); paintSign(); drawWhiteboard(A ? A.wb : 0); drawPRBoard(); }).catch(() => {});
function fastForward(gymSeconds) { const n = Math.round(gymSeconds / STEP); for (let i = 0; i < n && !A.done; i++) simStep(); }
window.__LO = { S, PRICEBOARD, drawPriceBoard, setHall, HALL, get M() { return M; }, get BIZ() { return BIZ; }, nextDay, nextMonth, presetCounts, checkPlot, COSTS, liveCash, /* bot playtests (07, layer 1) */ get A() { return A; }, hourHand, minHand, clock, get OBS() { return OBS; }, get followA() { return followA; }, toScreen: (v) => { const r = canvas.getBoundingClientRect(); _pv.copy(v).project(cam); return [r.left + (_pv.x + 1) / 2 * r.width, r.top + (1 - _pv.y) / 2 * r.height]; }, renderer, scene, get RTC() { return RTC; }, MT, VB, groundAt: (cx, cy) => { const r = canvas.getBoundingClientRect(); ndc.set((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, cam); const h = new V3(); ray.ray.intersectPlane(gPlane, h); return [+h.x.toFixed(2), +h.z.toFixed(2)]; }, STATIONS: () => STATIONS, AGENTS, setupRun, fastForward, tick, view, resultsText, HIST, setGo: (v) => { goOn = v; refreshGo(); } };

// ================================================================ self-tests: index.html?selftest (all) or ?selftest=a,b
// Each runs whole headless days and returns { ok, detail }; results land as JSON in a pre element (id selftest) for tests/run_sim.mjs.
// set up `n` days of a month without playing them through (enough for churn, which depends on who visited); returns the starting pool size
function owedNow() { return M.pool.concat(M.lapsed).reduce((t, m) => t + (m.pt ? m.pt.left * m.pt.price / m.pt.n : 0), 0); }
// the text of a tagged cell in a binder tab (Plan 6: the P&L lives in the books, not the panel)
function bkCell(tab, k, period, exact) { if (period) BOOKS.period = period; openBooks(tab); updateBooks(true); const e = document.querySelector(`#bkBody [data-k="${k}"]`), v = e && e.querySelector('[data-v]'); const t = e ? (exact && v ? v.dataset.v : e.textContent) : null; closeBooks(); return t; }
const bkNum = (t) => t == null ? NaN : (t.startsWith('−') ? -1 : 1) * +t.replace(/[−,]/g, '');
function skimDays(n, fresh) { if (fresh) setupRun(); const start = M.pool.length; for (let d = 1; d < n; d++) nextDay(); return start; }
function runDay(over = {}) {
  const keep = JSON.parse(JSON.stringify(S));
  try {
    const { mix, day = 0, ...rest } = over;
    Object.assign(S, rest); if (mix) S.mix = { ...S.mix, ...mix };
    setupRun(); fastForward(30 * 3600);
    for (let d = 1; d <= day; d++) { nextDay(); fastForward(30 * 3600); }
    const occ = Array.from(A.occ), live = occ.filter(v => !isNaN(v));
    const gone = A.members.filter(a => a.state === 'gone').length;
    return {
      visits: A.visits, gone, stuck: A.members.length - gone,
      peak: Math.max(0, ...live), avgOcc: live.reduce((s, v) => s + v, 0) / Math.max(1, live.length),
      fee: (A.rev || 0) - (A.ptRev || 0) - (A.rentRev || 0), pt: A.ptRev || 0, rent: A.rentRev || 0,
      longestQ: A.longestQ, prs: A.prs.length, coached: A.members.filter(a => a.coach).length, pnl: A.pnl, ptSessions: A.ptSessions, deferred: A.deferred, waits: A.waits.slice(), visitLens: (A.visitLens || []).slice(),
      firstInMinute: occ.findIndex(v => v > 0)
    };
  } finally { Object.keys(S).forEach(k => { if (!(k in keep)) delete S[k]; }); Object.assign(S, keep); }
}
function screenOf(x, y, z) {   // self-test helper: look at a world point from the default angle and return where it lands on screen
  view.az = view.azT = Math.PI / 4; view.target.set(x, 0, z); view.zoom = view.zoomT = 3; view.follow = null; updateWalls(10); updateCamera(0);
  const r = canvas.getBoundingClientRect(); _pv.set(x, y, z).project(cam); return [r.left + (_pv.x + 1) / 2 * r.width, r.top + (1 - _pv.y) / 2 * r.height];
}
function navReach() {   // self-test helper: nav cells reachable from inside the door (findPath always answers, so flood-fill)
  const W = NAV.w, seen = new Uint8Array(W * NAV.h), [si, sj] = nearestFree(...cellOf(DOOR_IN.x, DOOR_IN.z)), q = [sj * W + si]; seen[q[0]] = 1;
  for (let h = 0; h < q.length; h++) { const n = q[h], ni = n % W, nj = (n / W) | 0;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) { const a = ni + di, b = nj + dj; if (a < 0 || b < 0 || a >= W || b >= NAV.h) continue; const m = b * W + a;
      if (seen[m] || navBlock[m] || (di && dj && (navBlock[nj * W + a] || navBlock[b * W + ni]))) continue; seen[m] = 1; q.push(m); } }
  return (x, z) => { const [i, j] = cellOf(x, z); return !!seen[j * W + i]; };
}
function builtGymDay(w, d, big, grid = true) {   // self-test helper: build a w x d gym with its preset counts (grid: laid out by the Plan 11 placer), run a day, check it
  const keep = JSON.parse(JSON.stringify(S));
  try { const counts = presetCounts(w, d), r = runDay({ ...counts, hallW: w, hallD: d, ...(grid ? { layout: autoBuild(w, d, counts) } : {}) }), reach = navReach(), H = HALL;   /* runDay keeps the built hall until the next Setup */
    if (H.w !== w) return { ok: false, detail: 'hall not built' };
    const outside = STATIONS.filter(s => s.x < H.x0 + 0.3 || s.x > H.x1 - 0.3 || s.z < H.zb + 0.3 || s.z > HZ - 0.3).map(s => s.type + s.id);
    const cut = STATIONS.filter(s => !reach(s.acc.x, s.acc.z) || !reach(s.waitBase.x, s.waitBase.z)).map(s => s.type + s.id);
    const n = (t) => STATIONS.filter(s => s.type === t).length, have = { racks: n('rack'), plats: n('olyplat'), benches: n('bench'), cardio: STATIONS.filter(s => s.zone === 'cardio').length, total: STATIONS.length };
    const inChg = (p) => p && p.x > CHG.x0 - 0.2 && p.x < CHG.x1 && p.z > CHG.z0 - 0.2 && p.z < CHG.z1 + 0.2;
    const wash = STATIONS.filter(s => [s.acc, s.rest, s.waitBase, { x: s.x, z: s.z }].some(inChg)).map(s => s.type + s.id);   /* nobody trains or queues in a washroom */
    const boards = [WB_AT, PRB_AT].filter(b => STATIONS.some(s => Math.abs(s.acc.x - b.x) < 1.2 && Math.abs(s.acc.z - b.z) < 0.3) || OBST.some(([a, c, e, f]) => b.x + 1.2 > a && b.x - 1.2 < e && b.z + 0.1 > c && b.z - 0.1 < f)).length;
    const more = !big || (have.racks > 6 && have.cardio > 9 && have.total > 45);
    const dbIn = DBZONE.zc - DBZONE.span / 2 > H.zb && DBZONE.x > H.x0;
    const near = (p) => p && COLUMNS.some(c => Math.hypot(p.x - c.x, p.z - c.z) < 0.55);   /* Plan 8b: nothing stands, trains or queues in a column */
    const colHits = STATIONS.filter(st => [st.acc, st.rest, st.waitBase, { x: st.x, z: st.z }].some(near)).map(st => st.type + st.id);
    return { ok: r.stuck === 0 && r.visits > 50 && !outside.length && !cut.length && !wash.length && !boards && dbIn && !colHits.length && more && LOCKERS.every(L => reach(L.x, L.z)), detail: { stuck: r.stuck, visits: r.visits, outside, cut: cut.slice(0, 6), wash, boards, dbIn, colHits, cols: COLUMNS.length, have, lockersCut: LOCKERS.filter(L => !reach(L.x, L.z)).length } }; }
  finally { Object.assign(S, keep); setHall(); }
}
const SELFTESTS = {
  determinism() { const a = runDay({ seed: 7 }), b = runDay({ seed: 7 }); return { ok: JSON.stringify(a) === JSON.stringify(b), detail: { a: a.fee, b: b.fee } }; },
  conservation() { const r = runDay({}); return { ok: r.visits === r.gone && r.stuck === 0, detail: { visits: r.visits, gone: r.gone, stuck: r.stuck } }; },
  littlesLaw() {
    const r = runDay({}), stay = r.visitLens.reduce((s, v) => s + v, 0) / Math.max(1, r.visitLens.length), pred = r.visits * stay / 1020;
    return { ok: Math.abs(r.avgOcc - pred) / r.avgOcc < 0.05, detail: { avgOcc: r.avgOcc, pred } };
  },
  weekendOpen() { const r = runDay({ day: 4 }); return { ok: A.dow === 'Sat' && r.firstInMinute >= 60 && r.visits > 0, detail: { dow: A.dow, firstInMinute: r.firstInMinute, visits: r.visits } }; },
  poolSteady() {   // with joins at the base rate, the member base holds within ±7% over a month
    const keep = JSON.parse(JSON.stringify(S));
    try { S.seed = 1; const start = skimDays(30, true); const end = M.pool.length; return { ok: Math.abs(end - start) / start <= 0.07, detail: { start, end, lapsed: M.lapsedTotal, joined: M.joinedTotal, returned: M.returnedTotal } }; }
    finally { Object.assign(S, keep); }
  },
  lapseRate() {   // members lapsing in a month, as a share of the base, sits in the no-contract band (P4.3 ≈ 6%)
    const keep = JSON.parse(JSON.stringify(S)), rates = [];
    try { for (const sd of [1, 2, 3]) { S.seed = sd; const start = skimDays(30, true); rates.push(M.lapsedTotal / start); } }
    finally { Object.assign(S, keep); }
    const mean = rates.reduce((a, b) => a + b, 0) / rates.length;
    return { ok: mean >= 0.045 && mean <= 0.09, detail: { mean, rates } };
  },
  poolBounds() {   // churn far above 100% a month empties the base (no NaN), never below zero, and new members still join
    const keep = JSON.parse(JSON.stringify(S)), was = CHURN.tenured;
    try { CHURN.tenured = 150; const start = skimDays(6, true);
      return { ok: M.pool.length >= 0 && M.pool.length < start * 0.5 && M.joinedTotal > 0 && Number.isFinite(M.pool.length), detail: { start, pool: M.pool.length, joined: M.joinedTotal } }; }
    catch (e) { return { ok: false, detail: String(e) }; }
    finally { CHURN.tenured = was; Object.assign(S, keep); }
  },
  cardsLine() {   // each new joiner pays the NT$100 card once, on the first visit
    runDay({ day: 6 });
    const days = M.days.concat([{ pnl: A.pnl }]), cards = days.reduce((t, d) => t + (d.pnl.cards || 0), 0);
    const payers = M.pool.concat(M.lapsed).filter(m => m.card && m.isNew).length;   // joiners created during the month
    return { ok: cards === 100 * payers && payers >= 0, detail: { cards, payers } };
  },
  typhoonDay() {   // a typhoon day: closed, nobody comes, fixed costs still accrue, and the month moves on
    const keep = JSON.parse(JSON.stringify(S));
    try {
      setupMonth(); M.cal[0].typhoon = true; setupDay(0); fastForward(30 * 3600);
      const full = fixedPerDay(pnlCosts()), ok1 = A.closed === true && A.visits === 0 && A.done && Math.abs(A.pnl.fixed - full) < 1e-6;
      const moved = nextDay() && A.dayI === 1 && !A.closed;
      return { ok: ok1 && moved, detail: { closed: A.closed, visits: A.visits, fixed: M.days[0] && M.days[0].pnl.fixed, full, moved } };
    } finally { Object.assign(S, keep); }
  },
  rainLowers() {   // rain trims expected visits by 5% (P2.11 base); judged on the expectation, which seed noise cannot fake
    const keep = JSON.parse(JSON.stringify(S));
    try { S.weather = 'Clear'; setupRun(); const c = A.visitsExpected; S.weather = 'Rain'; setupRun(); const r = A.visitsExpected;
      return { ok: c > 0 && Math.abs(r / c - 0.95) < 0.01, detail: { clear: c, rain: r } }; }
    finally { Object.assign(S, keep); }
  },
  projectionEarlyDay() {   // the month projection stays sensible while the first members are still training (nobody has paid yet)
    const keep = JSON.parse(JSON.stringify(S));
    try { setupRun(); fastForward(7 * 3600 - A.t); const p0 = projectMonth().total.ebitda; fastForward(8.5 * 3600 - A.t); const p1 = projectMonth().total.ebitda;
      return { ok: A.visits > 0 && Math.abs(p1 - p0) / Math.abs(p0) < 0.25, detail: { p0, p1, visits: A.visits } }; }
    finally { Object.assign(S, keep); }
  },
  instalmentsPersist() {   // instalments still due belong to the month, not to one day
    const keep = JSON.parse(JSON.stringify(S));
    try { setupRun(); M.ptDue = 5000; fastForward(30 * 3600); nextDay(); updateMonitors();
      const cell = bkCell('Books', 'ptDue', 'today'); return { ok: M.ptDue >= 5000 && cell === money(M.ptDue), detail: { due: M.ptDue, cell } }; }   // real instalment sales may add to it (Plan 6: read from the books)
    finally { Object.assign(S, keep); }
  },
  mixFourSum100() {   // the four archetype sliders the panel shows add up to 100%, and the results text lists only those four
    const k = Object.keys(S.mix), sum = k.reduce((t, x) => t + S.mix[x], 0); runDay({});
    return { ok: !('coach' in S.mix) && sum === 100 && !/C\d/.test(resultsText()), detail: { mix: S.mix, line: resultsText().split('\n')[1] } };
  },
  balkAtDoor() {   // a tiny cap turns people away instead of queueing them for hours; the default cap turns almost nobody away
    const tight = runDay({ cap: 10 }), longest = Math.max(0, ...tight.waits), okTight = (A.balked || 0) > 0 && longest < 120 && tight.stuck === 0 && A.done;
    const loose = [1, 2, 3].map(sd => { runDay({ seed: sd }); return A.balked || 0; });
    return { ok: okTight && loose.every(b => b === 0), detail: { balked: A.balked, longest, loose } };
  },
  badVisitsCounted() {   // with one rack, some visits go bad, and each bad visit had a wait over 10 minutes
    runDay({ racks: 1 }); const bad = A.members.filter(a => a.badMarked);
    return { ok: bad.length > 0 && bad.every(a => (a.maxWait || 0) > DEMAND_RESP.badWait) && (A.bad || 0) === bad.length, detail: { bad: bad.length, A: A.bad } };
  },
  crowdingRaisesChurn() {   // ten days with one rack vs six: the members' churn hazard ends up higher with one rack
    const haz = () => M.pool.reduce((t, m) => t + lapseHazard(m, M.dayI), 0);
    runDay({ seed: 4, racks: 1, day: 9 }); const one = haz(); runDay({ seed: 4, racks: 6, day: 9 }); const six = haz();
    return { ok: one > six, detail: { one, six } };
  },
  priceLowersVisits() {   // 10% dearer minutes: expected visits × 1.1^−0.4 ≈ 0.963 (P3.12)
    const keep = JSON.parse(JSON.stringify(S));
    try { setupRun(); const v0 = A.visitsExpected; S.priceOff = 1.2 * 1.1; S.pricePeak = 1.5 * 1.1; setupRun(); const v1 = A.visitsExpected;
      return { ok: Math.abs(v1 / v0 - Math.pow(1.1, -0.4)) < 0.005, detail: { v0, v1, ratio: v1 / v0 } }; }
    finally { Object.assign(S, keep); }
  },
  priceRaisesRevenue() {   // D3: a 10% rise earns more per day at first, with fewer visits
    const run = (k) => [1, 2, 3].map(sd => runDay({ seed: sd, priceOff: 1.2 * k, pricePeak: 1.5 * k })).reduce((t, r) => ({ fee: t.fee + r.fee, visits: t.visits + r.visits }), { fee: 0, visits: 0 });
    const a = run(1), b = run(1.1);
    return { ok: b.fee > a.fee && b.visits < a.visits, detail: { a, b } };
  },
  priceExtremes() {   // slider ends: nothing breaks and no visit costs more than the cap
    const out = [0.8, 2.5].map(pz => { const r = runDay({ priceOff: pz, pricePeak: pz }); const maxFee = Math.max(0, ...A.members.map(a => a.fee || 0)); return { pz, stuck: r.stuck, visits: r.visits, maxFee, fee: r.fee }; });
    return { ok: out.every(o => o.stuck === 0 && Number.isFinite(o.fee) && o.maxFee <= S.priceCap), detail: out };
  },
  peakShift() {   // a bigger Mon–Fri peak premium moves Tuesday evening arrivals out of 18:00–22:00
    const keep = JSON.parse(JSON.stringify(S)), share = (w) => (w[11] + w[12] + w[13] + w[14]) / w.reduce((t, v) => t + v, 0);
    try { setupRun(); const s0 = share(A.hourWeights); S.pricePeak = 1.8; setupRun(); const s1 = share(A.hourWeights);
      return { ok: A.dow === 'Tue' && s1 < s0, detail: { s0, s1 } }; }
    finally { Object.assign(S, keep); }
  },
  rentalSubstitution() {   // banning outside coaches or dearer rentals: fewer outside clients, a quarter of them move to in-house PT (P5.17)
    const keep = JSON.parse(JSON.stringify(S)), count = () => ({ outside: M.pool.filter(m => m.outside).length, inHouse: M.pool.filter(m => m.pt).length });
    try { S.allowOutside = false; setupMonth(); const off = count(); S.allowOutside = true; S.rentP = 500; setupMonth(); const dear = count();
      return { ok: off.outside === 0 && off.inHouse === 25 && dear.outside === 5 && dear.inHouse === 23, detail: { off, dear } }; }
    finally { Object.assign(S, keep); }
  },
  rentFeeUsed() {   // the rental price set is what a rental books
    const r = runDay({ rentP: 400 }); return { ok: r.rent > 0 && r.rent % 400 === 0, detail: { rent: r.rent } };
  },
  staffRetention() {   // a lean roster raises members' churn hazard over a month (D10)
    const keep = JSON.parse(JSON.stringify(S)), haz = () => M.pool.reduce((t, m) => t + lapseHazard(m, M.dayI), 0);
    try { S.seed = 5; S.staff = 184000; skimDays(30, true); const base = haz(); S.staff = 133000; const lean = haz();
      return { ok: lean > base, detail: { base, lean } }; }
    finally { Object.assign(S, keep); }
  },
  demandPanel() {   // turn-aways and bad visits for the month appear in the members table, in both languages
    runDay({ cap: 10, day: 1 }); const was = zh() ? 'zh' : 'en', out = {};
    const want = { balked: M.balkedTotal + (A.balked || 0), bad: M.badTotal + (A.bad || 0) };
    const check = (lang) => { setLang(lang); const b = bkCell('Members', 'mm_balked'), d = bkCell('Members', 'mm_bad');   // Plan 6: the register lives in the books
      return { ok: b === String(want.balked) && d === String(want.bad) && want.balked > 0 && want.bad > 0, b, d }; };
    try { out.en = check('en'); out.zh = check('zh'); } finally { setLang(was); }
    return { ok: out.en.ok && out.zh.ok, detail: { want, out } };
  },
  monthBelowLines() {   // depreciation, net profit and payback under the month table, in both languages
    runDay({ day: 1 }); const was = zh() ? 'zh' : 'en', out = {};
    const check = (lang) => {
      setLang(lang);   // Plan 6: the month view of the books
      const pm = projectMonth(), b = belowEbitda(pm.total.ebitda, pnlCosts(), BIZ.balance * BIZ.rate / 1200), dep =   // Plan 7: net profit after loan interest
        bkNum(bkCell('Books', 'depEq', 'month', true)) + bkNum(bkCell('Books', 'depFit', 'month', true)), np = bkNum(bkCell('Books', 'netProfit', 'month', true)), pay = bkCell('Books', 'payback', 'month');
      BOOKS.period = 'today';
      return { ok: Math.abs(dep + b.dep) <= 1 && Math.abs(np - b.netProfit) <= 1 && !!pay && /\d/.test(pay) && !/NaN|undefined/.test(pay), dep, np, pay };
    };
    try { out.en = check('en'); out.zh = check('zh'); } finally { setLang(was); }
    return { ok: out.en.ok && out.zh.ok, detail: out };
  },
  oldPricesCap() {   // old prices: NT$1.1 / 1.3 a minute, capped at NT$150 a visit
    const keep = JSON.parse(JSON.stringify(S));
    try { S.priceOff = 1.1; S.pricePeak = 1.3; S.priceCap = 150; runDay({}); const maxFee = Math.max(0, ...A.members.map(a => a.fee || 0));
      return { ok: S.priceOff === 1.1 && S.pricePeak === 1.3 && S.priceCap === 150 && maxFee > 0 && maxFee <= 150, detail: { maxFee, S: [S.priceOff, S.pricePeak, S.priceCap] } }; }
    finally { Object.assign(S, keep); }
  },
  newBuildOpens() {   // a brand-new gym: 15% of the steady base, nothing prepaid yet, and the day still runs
    const keep = JSON.parse(JSON.stringify(S));
    try { S.build = 'new'; S.monthsOpen = 0; setupRun(); const pool = M.pool.length, owed = owedValue(); fastForward(30 * 3600);
      const stuck = A.members.filter(a => a.state !== 'gone').length;
      return { ok: Math.abs(pool - Math.round(965 * 0.15)) <= 1 && owed === 0 && stuck === 0 && A.visits > 0, detail: { pool, owed, visits: A.visits, stuck } }; }
    finally { Object.assign(S, keep); }
  },
  rampBreakEven() {   // a new gym loses money in month 1 and makes it by month 9 (break-even around month 7)
    const keep = JSON.parse(JSON.stringify(S)), proj = (m) => { S.build = 'new'; S.monthsOpen = m; setupRun(); fastForward(30 * 3600); return projectMonth().total.ebitda; };
    try { const m1 = proj(1), m9 = proj(9); return { ok: m1 < 0 && m9 > 0, detail: { m1, m9 } }; }
    finally { Object.assign(S, keep); }
  },
  closureMonth() {   // a closure month: every day closed, fixed costs still run, nobody stuck
    const keep = JSON.parse(JSON.stringify(S));
    try { S.shock = 'closure'; setupRun(); fastForward(30 * 3600); const d0 = { closed: A.closed, visits: A.visits, fixed: A.pnl.fixed };
      nextDay(); fastForward(30 * 3600); const ok = d0.closed && d0.visits === 0 && A.closed && A.visits === 0 && Math.abs(d0.fixed - fixedPerDay(pnlCosts())) < 1e-6 && A.done;
      return { ok, detail: { d0, d1: { closed: A.closed, visits: A.visits } } }; }
    finally { Object.assign(S, keep); }
  },
  competitorShock() {   // a new competitor nearby: 10% fewer members
    const keep = JSON.parse(JSON.stringify(S));
    try { S.shock = 'competitor'; setupMonth(); return { ok: Math.abs(M.pool.length - Math.round(965 * 0.9)) <= 1, detail: { pool: M.pool.length } }; }
    finally { Object.assign(S, keep); }
  },
  rentResetShock() {   // a 25% rent reset: fixed costs up by area × NT$275 ÷ 30.4 a day
    const keep = JSON.parse(JSON.stringify(S));
    try { const base = fixedPerDay(pnlCosts()); S.rentRate = 1375; const up = fixedPerDay(pnlCosts()) - base;
      return { ok: Math.abs(up - 115 * 275 / 30.4) < 1e-6, detail: { up } }; }
    finally { Object.assign(S, keep); }
  },
  brokenRack() {   // one rack out for repair all month
    const keep = JSON.parse(JSON.stringify(S));
    try { S.shock = 'brokenRack'; setupRun(); const racks = STATIONS.filter(st => st.type === 'rack').length;
      return { ok: racks === S.racks - 1, detail: { racks, setting: S.racks } }; }
    finally { Object.assign(S, keep); }
  },
  projectionAfterPriceChange() {   // C1: after raising prices, the projection follows the new price, not the old one
    const keep = JSON.parse(JSON.stringify(S));
    try {
      S.seed = 20261112; setupRun(); fastForward(30 * 3600); nextDay(); fastForward(30 * 3600);
      S.priceOff = 2.5; S.pricePeak = 2.5; nextDay(); fastForward(30 * 3600); const proj = projectMonth().total;
      while (nextDay()) fastForward(30 * 3600);
      const real = M.days.reduce((t, d) => t + d.pnl.ebitda, 0) + A.pnl.ebitda, net = M.days.reduce((t, d) => t + d.pnl.net, 0) + A.pnl.net;
      return { ok: Math.abs(proj.ebitda - real) / net < 0.08, detail: { proj: Math.round(proj.ebitda), real: Math.round(real), net: Math.round(net) } };
    } finally { Object.assign(S, keep); }
  },
  turnAwayNotAVisit() {   // I2: someone turned away at the door did not visit, for the churn frequency rule
    runDay({ cap: 10 }); const away = A.members.filter(a => a.balked);
    return { ok: away.length > 0 && away.every(a => !a.rec.visits.includes(A.dayI)), detail: { away: away.length, stillCounted: away.filter(a => a.rec.visits.includes(A.dayI)).length } };
  },
  rentalPolicyMidDay() {   // I3: switching off outside coaches or changing the rental price mid-day changes nothing until Setup
    const keep = JSON.parse(JSON.stringify(S));
    try {
      setupRun(); const outside0 = M.pool.filter(m => m.outside).length; fastForward(12 * 3600 - A.t);
      S.allowOutside = false; S.rentP = 500; fastForward(30 * 3600); refreshPending();
      const outside1 = M.pool.filter(m => m.outside).length, rentOk = (A.rentRev || 0) % 250 === 0, flagged = bkCell('Pricing', 'nextMonthNote') !== null;   // Plan 6: flagged in the Pricing tab
      return { ok: outside0 === outside1 && outside1 > 0 && rentOk && flagged, detail: { outside0, outside1, rent: A.rentRev, flagged } };
    } finally { Object.assign(S, keep); refreshPending(); }
  },
  sensPanel() {   // the six inputs that move monthly profit most, low and high, in both languages
    runDay({}); const was = zh() ? 'zh' : 'en', out = {};
    const check = (lang) => { setLang(lang); BOOKS.period = 'today'; openBooks('Books'); const t = document.querySelector('#bkBody [data-k="sens"]');   // Plan 6: in the books
      if (!t) { closeBooks(); return { ok: false, why: 'missing' }; } const rows = t.querySelectorAll('tr');
      const r = { ok: rows.length === 7 && !/NaN|undefined/.test(t.textContent) && rows[1].textContent.includes(tr('People at the weekly peak')), first: rows[1] && rows[1].textContent.slice(0, 60) }; closeBooks(); return r; };
    try { out.en = check('en'); out.zh = check('zh'); } finally { setLang(was); }
    return { ok: out.en.ok && out.zh.ok, detail: out };
  },
  resultsNoMask() {   // without a P&L the results text says so ('–') instead of printing NT$0
    runDay({}); const keepP = A.pnl;
    try { A.pnl = undefined; const t = resultsText(); return { ok: t.includes('$–') && !t.includes('EBITDA today $0'), detail: t.split('\n').slice(-2) }; }
    finally { A.pnl = keepP; }
  },
  closureProjection() {   // I1: a closure month is projected as a loss (fixed costs only), and payback says never
    const keep = JSON.parse(JSON.stringify(S));
    try { S.shock = 'closure'; setupRun(); fastForward(30 * 3600); const pm = projectMonth();
      return { ok: pm.total.ebitda < 0 && belowEbitda(pm.total.ebitda, pnlCosts()).paybackYears === Infinity && Math.abs(pm.rest.gross || 0) < 1e-6, detail: { total: pm.total.ebitda, restGross: pm.rest.gross } }; }
    finally { Object.assign(S, keep); }
  },
  rampProjectionFallback() {   // I4: before day 1 ends, projected PT and cards follow the ramp level, not the full base
    const keep = JSON.parse(JSON.stringify(S));
    try { S.build = 'new'; S.monthsOpen = 3; setupRun(); const pm = projectMonth(), rest = M.cal.length - 1;
      const want = PT.sessions / PT.daysPerMonth * COSTS.ptPrice * M.level * rest;
      return { ok: Math.abs((pm.rest.ptEarned || 0) - want) / want < 0.02, detail: { got: pm.rest.ptEarned, want, level: M.level } }; }
    finally { Object.assign(S, keep); }
  },
  tariffSplit() {   // Plan 6: visit fees split into off-peak and peak; Saturdays have no peak
    const keep = JSON.parse(JSON.stringify(S));
    try { setupRun(); fastForward(30 * 3600); const wd = { ...A.pnl };
      for (let d = 0; d < 4; d++) nextDay(); fastForward(30 * 3600); const sat = { ...A.pnl, dow: A.dow };
      const ok = wd.entryPeak > 0 && Math.abs(wd.entryOff + wd.entryPeak - wd.entry) < 1e-6 && sat.dow === 'Sat' && sat.entryPeak === 0 && sat.entry > 0;
      return { ok, detail: { wd: [wd.entryOff, wd.entryPeak], sat: [sat.dow, sat.entryOff, sat.entryPeak] } }; }
    finally { Object.assign(S, keep); }
  },
  checkinsCount() {   // Plan 6: check-ins are members who reached the desk; after the day all of them have paid
    runDay({}); const at = A.members.filter(a => a.tDoor).length;
    return { ok: A.checkins > 0 && A.checkins === at && A.checkins === A.paidVisits, detail: { checkins: A.checkins, atDesk: at, paid: A.paidVisits } };
  },
  publishNextMorning() {   // Plan 6: published prices bill from the next morning, not at once
    const keep = JSON.parse(JSON.stringify(S));
    try { setupRun(); fastForward(12 * 3600 - A.t); publishPrices({ priceOff: 2.0, pricePeak: S.pricePeak, priceCap: S.priceCap, rentP: 300, allowOutside: S.allowOutside });
      fastForward(30 * 3600); const today = { off: S.priceOff, rent: A.cfg.rentP }; nextDay();
      return { ok: today.off === 1.2 && today.rent === 250 && S.priceOff === 2.0 && A.cfg.rentP === 300 && PUBLISH === null, detail: { today, tomorrow: { off: S.priceOff, rent: A.cfg.rentP }, PUBLISH } }; }
    finally { PUBLISH = null; Object.assign(S, keep); }
  },
  publishOnSetup() {   // Plan 6: Setup applies published prices at once
    const keep = JSON.parse(JSON.stringify(S));
    try { publishPrices({ priceOff: 1.6, pricePeak: 1.9, priceCap: 200, rentP: 250, allowOutside: true }); setupRun();
      return { ok: S.priceOff === 1.6 && S.pricePeak === 1.9 && S.priceCap === 200 && PUBLISH === null, detail: { off: S.priceOff, peak: S.pricePeak, cap: S.priceCap } }; }
    finally { PUBLISH = null; Object.assign(S, keep); }
  },
  booksSpeedRule() {   // Plan 6 D3: the binder runs the sim at 1x; closing restores the old speed unless a new one was picked; paused stays paused
    const keep = S.speed;
    try { setupRun(); goOn = false; S.speed = 30; openBooks(); const a = S.speed === 1 && goOn === false && BOOKS.open; closeBooks(); const b = S.speed === 30 && !BOOKS.open;
      openBooks(); S.speed = 120; closeBooks(); const c = S.speed === 120;
      return { ok: a && b && c, detail: { a, b, c } }; }
    finally { closeBooks(); S.speed = keep; }
  },
  booksOpensFromDesk() {   // Plan 6 Call 13: the receptionist and the desk open the books instead of being followed
    try { setupRun(); clearFollow(); onAgentPicked(A.desk); const a = BOOKS.open && followA === null; closeBooks();
      const b = onGroundPicked(DESK_C.x + 0.5, DESK_C.z) && BOOKS.open; closeBooks();
      const c = !onGroundPicked(-10, -5) && !BOOKS.open;
      return { ok: a && b && c, detail: { a, b, c } }; }
    finally { closeBooks(); }
  },
  booksNextDay() {   // Plan 6: at day end the binder offers Next day and stays open
    try { setupRun(); goOn = false; fastForward(30 * 3600); openBooks(); const d0 = M.dayI, shown = !document.getElementById('bkNext').hidden;
      document.getElementById('bkNext').click(); goOn = false;
      return { ok: shown && M.dayI === d0 + 1 && BOOKS.open && !A.done, detail: { shown, d0, d1: M.dayI, open: BOOKS.open } }; }
    finally { closeBooks(); goOn = false; }
  },
  liveLineTakings() {   // Plan 6 D2: the live line shows today's takings and check-ins
    runDay({}); updateMonitors(); const t = document.getElementById('liveLine').textContent;
    return { ok: t.includes(money(A.pnl.takings)) && t.includes(String(A.checkins)) && A.pnl.takings > 0, detail: t };
  },
  booksTodayTill() {   // Plan 6: the till on the Today tab matches the day's P&L
    try { runDay({}); openBooks('Today'); const v = (k) => (document.querySelector(`#bkBody [data-k="${k}"]`) || {}).textContent;
      const ok = v('entry') === money(A.pnl.entry) && v('cards') === money(A.pnl.cards) && v('takings') === money(A.pnl.takings) && !!document.querySelector('#bkBody .stamp');
      return { ok, detail: { entry: [v('entry'), money(A.pnl.entry)], cards: [v('cards'), money(A.pnl.cards)], takings: v('takings') } }; }
    finally { closeBooks(); }
  },
  booksFullPnl() {   // Plan 6 D6: every line of the itemised P&L is shown and the fixed lines add up to the day's fixed costs
    try { runDay({}); BOOKS.period = 'today'; openBooks('Books'); const cells = [...document.querySelectorAll('#bkBody [data-k^="fx_"]')];
      const sum = cells.reduce((t, c) => t - +c.querySelector('[data-v]').dataset.v, 0);   /* fixed lines are shown as negatives */
      const want = ['entryOff', 'entryPeak', 'cards', 'ptEarned', 'rentals', 'addOns', 'gross', 'vat', 'net', 'coach', 'mkt', 'card', 'contribution', 'fixed', 'ebitda', 'depEq', 'depFit', 'ebit', 'tax', 'netProfit', 'ptCash', 'deferred', 'ptDue'];
      const missing = want.filter(k => !document.querySelector(`#bkBody [data-k="${k}"]`));
      return { ok: cells.length === 18 && Math.abs(sum - A.pnl.fixed) <= cells.length && !missing.length, detail: { lines: cells.length, sum, fixed: A.pnl.fixed, missing } }; }
    finally { closeBooks(); }
  },
  booksMonthView() {   // Plan 6: the month view shows the projected month and its payback and range
    try { setupRun(); fastForward(30 * 3600); BOOKS.period = 'month'; openBooks('Books'); const e = document.querySelector('#bkBody [data-k="ebitda"]').textContent;
      const ok = e === money(projectMonth().total.ebitda) && !!document.querySelector('#bkBody [data-k="payback"]') && !!document.querySelector('#bkBody [data-k="range"]');
      return { ok, detail: { shown: e, want: money(projectMonth().total.ebitda) } }; }
    finally { closeBooks(); BOOKS.period = 'today'; }
  },
  booksClosedDay() {   // Plan 6 Review Focus 5: a closed day shows no takings, only fixed costs, and no NaN
    const keep = JSON.parse(JSON.stringify(S));
    try { S.shock = 'closure'; setupRun(); fastForward(30 * 3600); const out = {};
      for (const t of ['Today', 'Books']) { openBooks(t); out[t] = document.getElementById('bkBody').textContent; }
      const fx = document.querySelector('#bkBody [data-k="fixed"]').textContent;
      const ok = !/NaN|undefined|Infinity/.test(out.Today + out.Books) && A.pnl.takings === 0 && fx !== money(0);
      return { ok, detail: { takings: A.pnl.takings, fixed: fx } }; }
    finally { closeBooks(); Object.assign(S, keep); }
  },
  booksBothLanguages() {   // Plan 6 Review Focus 4: every tab renders in both languages with no missing text
    const was = zh() ? 'zh' : 'en', bad = [];
    try { runDay({});
      for (const l of ['en', 'zh']) { setLang(l); for (const t of BOOK_TABS) { openBooks(t); const txt = booksEl().textContent; if (/undefined|NaN/.test(txt)) bad.push(l + ':' + t); if (l === 'zh' && !/[\u4e00-\u9fff]/.test(booksEl().querySelector('.bktabs').textContent)) bad.push('zh tabs'); } }
      return { ok: !bad.length, detail: bad }; }
    finally { closeBooks(); setLang(was); }
  },
  pricingStaged() {   // Plan 6: price steps are staged in the Pricing tab and bill only after Publish and the next morning
    const keep = JSON.parse(JSON.stringify(S));
    try { setupRun(); openBooks('Pricing'); document.querySelector('#bkBody button[data-f="priceOff"][data-d="1"]').click();
      const staged = BOOKS.stage.priceOff, live = S.priceOff; document.querySelector('#bkBody [data-k="publish"]').click(); const pub = PUBLISH && PUBLISH.priceOff, still = S.priceOff;
      nextDay(); const next = S.priceOff;
      return { ok: Math.abs(staged - 1.25) < 1e-9 && live === 1.2 && Math.abs(pub - 1.25) < 1e-9 && still === 1.2 && Math.abs(next - 1.25) < 1e-9, detail: { staged, live, pub, still, next } }; }
    finally { closeBooks(); PUBLISH = null; Object.assign(S, keep); }
  },
  pricingWarning() {   // Plan 6: a heavy user paying more than a big-box membership gets a warning in the preview
    try { setupRun(); openBooks('Pricing'); BOOKS.stage = { ...BOOKS.stage, priceOff: 2.5, pricePeak: 2.5, priceCap: 300 }; updateBooks(true);
      const w = document.querySelector('#bkBody [data-k="heavyWarn"]'); BOOKS.stage = null; updateBooks(true); const none = !document.querySelector('#bkBody [data-k="heavyWarn"]');
      return { ok: !!w && none, detail: { warn: w && w.textContent, none } }; }
    finally { closeBooks(); BOOKS.stage = null; }
  },
  atRiskFive() {   // Plan 6: the five members most likely to lapse, highest first, each with a reason
    try { skimDays(10, true); openBooks('Members'); const rows = [...document.querySelectorAll('#bkBody [data-k="risk"]')], h = rows.map(r => +r.dataset.h);
      const ok = rows.length === 5 && h.every((v, i) => i === 0 || v <= h[i - 1]) && rows.every(r => r.querySelector('.tag'));
      return { ok, detail: { n: rows.length, h } }; }
    finally { closeBooks(); }
  },
  panelNoPnl() {   // Plan 6: the side panel keeps simulation controls only
    const q = (sel) => !!panel.querySelector(sel);
    const ok = !q('#pnlGrp') && !q('#pnlTable') && !q('#w_priceOff') && !q('#w_rentRate') && !q('#w_staff') && !q('#w_rentP') && !q('#w_monthsOpen') && ![...panel.querySelectorAll('.tabs button')].some(b => b.dataset.t === 'P&L');
    return { ok, detail: { pnl: q('#pnlGrp'), price: q('#w_priceOff') } };
  },
  businessStart() {   // Plan 7: a new business starts with own money + loan − capex, and an equal monthly instalment
    try { setupRun(); return { ok: BIZ.cash === S.finOwn + S.finLoan - COSTS.capex && BIZ.cash === 1.5e6 && Math.abs(BIZ.payment - 80639) < 1 && BIZ.balance === 6e6 && BIZ.monthIndex === 0, detail: { cash: BIZ.cash, payment: BIZ.payment } }; }
    finally {}
  },
  cashFollowsDays() {   // Plan 7: each booked day moves the bank balance by its cash in minus its cash costs
    try { setupRun(); const start = BIZ.cash; let sum = 0;
      for (let d = 0; d < 3; d++) { fastForward(30 * 3600); sum += dayCash(A.pnl); nextDay(); }
      return { ok: Math.abs(BIZ.cash - (start + sum)) < 1e-6 && sum !== 0 && Math.abs(liveCash() - BIZ.cash - dayCash(A.pnl)) < 1e-6, detail: { start, sum, cash: BIZ.cash } }; }
    finally {}
  },
  cashRunsOut() {   // Plan 7 B2: cash can go negative; the first day it ran out is kept
    const keep = JSON.parse(JSON.stringify(S));
    try { S.finOwn = 0; S.finLoan = COSTS.capex; S.peak = 20; setupRun(); const c0 = BIZ.cash; fastForward(30 * 3600); nextDay(); const first = BIZ.cashOutAt && { ...BIZ.cashOutAt };
      fastForward(30 * 3600); nextDay(); const later = BIZ.cashOutAt;
      return { ok: c0 === 0 && !!first && first.day === 1 && later.day === 1 && BIZ.cash < 0, detail: { c0, first, later, cash: BIZ.cash } }; }
    finally { Object.assign(S, keep); }
  },
  spaceOnLiveLine() {   // Plan 6 review I2: Space on the live line opens the books without starting the sim; keys inside the binder don't drive the sim
    try { setupRun(); goOn = false; const ll = document.getElementById('liveLine'); ll.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      const a = BOOKS.open && goOn === false; const b = document.querySelector('#books button'); b.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      return { ok: a && goOn === false, detail: { opened: BOOKS.open, goOn } }; }
    finally { closeBooks(); goOn = false; refreshGo(); }
  },
  booksTapTargets() {   // Plan 6 review I3: every button in the binder is at least 44 px tall
    try { setupRun(); const small = [];
      for (const t of BOOK_TABS) { openBooks(t); for (const b of booksEl().querySelectorAll('button')) { const h = b.getBoundingClientRect().height; if (h > 0 && h < 44) small.push(`${t}:${b.textContent.trim().slice(0, 12)}:${Math.round(h)}`); } }
      return { ok: !small.length, detail: small.slice(0, 8) }; }
    finally { closeBooks(); }
  },
  monthCarriesOver() {   // Plan 7 D9: New month keeps the members, their history (rebased), PT balances, instalments and prices
    const keep = JSON.parse(JSON.stringify(S));
    try { S.priceOff = 1.3; skimDays(30, true); fastForward(30 * 3600); M.ptDue = 7000;
      const before = new Map(M.pool.concat(M.lapsed).map(m => [m.id, { j: m.joinedDay, pt: m.pt && m.pt.left, v: m.visits.slice() }]));
      nextMonth(); const both = M.pool.concat(M.lapsed).filter(m => before.has(m.id));
      const okHist = both.every(m => { const b = before.get(m.id); return m.joinedDay === b.j - 30 && (m.pt ? m.pt.left : null) === (b.pt == null ? null : b.pt) && m.visits.filter(d => d < 0).every(d => b.v.includes(d + 30)); });   // day 0 of the new month may already hold a visit
      const ok = both.length > 900 && okHist && M.ptDue >= 7000 && S.priceOff === 1.3 && M.cfg.month === 'Jul' && M.dayI === 0 && BIZ.months.length === 1 && BIZ.months[0].name === 'Jun' && Number.isFinite(BIZ.months[0].pnl.ebitda);
      return { ok, detail: { kept: both.length, okHist, ptDue: M.ptDue, month: M.cfg.month, months: BIZ.months.length } }; }
    finally { Object.assign(S, keep); }
  },
  monthReplays() {   // Plan 7: a business replays identically into its second month
    const keep = JSON.parse(JSON.stringify(S));
    const run = () => { Object.assign(S, keep); skimDays(30, true); fastForward(30 * 3600); nextMonth(); fastForward(30 * 3600); return { pool: M.pool.length, visits: A.visits, cash: Math.round(BIZ.cash), fee: A.pnl.entry }; };
    try { const a = run(), b = run(); return { ok: JSON.stringify(a) === JSON.stringify(b) && a.visits > 0, detail: { a, b } }; } finally { Object.assign(S, keep); }
  },
  closeMonthBooks() {   // Plan 7: closing the month pays the loan instalment and income tax out of cash
    const keep = JSON.parse(JSON.stringify(S));
    try { skimDays(30, true); fastForward(30 * 3600); const pre = BIZ.cash + dayCash(A.pnl), bal = BIZ.balance; nextMonth(); const a = BIZ.months[0];
      const ok = Math.abs(a.interest - bal * BIZ.rate / 1200) < 1e-6 && Math.abs(a.interest + a.principal - BIZ.payment) < 1e-6 && Math.abs(BIZ.cash - (pre - BIZ.payment - a.tax)) < 1e-6 && BIZ.balance === bal - a.principal;
      return { ok, detail: { pre, cash: BIZ.cash, a } }; }
    finally { Object.assign(S, keep); }
  },
  decemberRollover() {   // Plan 7 Review Focus 3: December rolls into January of the next year
    const keep = JSON.parse(JSON.stringify(S));
    try { S.month = 'Dec'; S.build = 'new'; S.monthsOpen = 5; skimDays(31, true); fastForward(30 * 3600); nextMonth();
      return { ok: M.cfg.month === 'Jan' && BIZ.year === 2028 && M.cal.length === 31 && S.monthsOpen === 6 && M.cfg.monthsOpen === 6, detail: { month: M.cfg.month, year: BIZ.year, n: M.cal.length, open: S.monthsOpen } }; }
    finally { Object.assign(S, keep); }
  },
  setupNewBusiness() {   // Plan 7 Review Focus 5: Setup mid-business starts a new business
    const keep = JSON.parse(JSON.stringify(S));
    try { skimDays(30, true); fastForward(30 * 3600); nextMonth(); fastForward(5 * 3600); setupRun();
      return { ok: BIZ.monthIndex === 0 && BIZ.months.length === 0 && BIZ.cash === S.finOwn + S.finLoan - COSTS.capex && M.dayI === 0, detail: { idx: BIZ.monthIndex, months: BIZ.months.length } }; }
    finally { Object.assign(S, keep); }
  },
  closeDayEarly() {   // Plan 7 A1: close the rest of today without watching it
    try { setupRun(); fastForward(12 * 3600 - A.t); const r = closeEarlySync('day'), left = A.members.filter(a => a.state !== 'gone').length;
      return { ok: A.done && M.dayI === 0 && r.days === 1 && left === 0 && Math.abs(r.takings - A.pnl.takings) < 1e-6, detail: { r, dayI: M.dayI, left } }; }
    finally {}
  },
  closeWeekEarly() {   // Plan 7 A1: a week is today plus up to six more days, never past the month's last day
    try { setupRun(); const r = closeEarlySync('week'), a = A.done && M.dayI === 6 && r.days === 7;
      skimDays(28, true); const r2 = closeEarlySync('week'), b = A.done && M.dayI === 29 && r2.days === 3;   // days 28, 29 and 30
      return { ok: a && b, detail: { r, r2, dayI: M.dayI } }; }
    finally {}
  },
  closeMonthEarly() {   // Plan 7 Review Focus 2: from the opening on day 1, every day runs to the month's end, nothing stuck, the books have every day
    try { setupRun(); const r = closeEarlySync('month'), left = A.members.filter(a => a.state !== 'gone').length;
      return { ok: A.done && M.dayI === 29 && r.days === 30 && M.days.length === 29 && left === 0 && r.takings > 0 && monthComplete(), detail: { r, dayI: M.dayI, days: M.days.length, left } }; }
    finally {}
  },
  bankTab() {   // Plan 7 A2: the Bank tab shows the balance, own money and the loan, in both languages
    const was = zh() ? 'zh' : 'en', out = {};
    try { setupRun(); for (let d = 0; d < 2; d++) { fastForward(30 * 3600); nextDay(); } fastForward(6 * 3600);
      for (const l of ['en', 'zh']) { setLang(l); const g = (k) => bkCell('Bank', k); openBooks('Bank'); const txt = booksEl().textContent; closeBooks();
        out[l] = { cash: g('cash') === money(liveCash()), own: g('own') === money(6e6), loan: g('loanBal') === money(BIZ.balance), pay: g('payment') === money(BIZ.payment), clean: !/NaN|undefined/.test(txt) }; }
      const ok = Object.values(out).every(o => Object.values(o).every(Boolean)); return { ok, detail: out }; }
    finally { setLang(was); }
  },
  cashBanner() {   // Plan 7 B2: once cash runs out, the Bank tab and the live line say so
    const keep = JSON.parse(JSON.stringify(S));
    try { S.finOwn = 0; S.finLoan = COSTS.capex; S.peak = 20; setupRun(); fastForward(30 * 3600); nextDay(); updateMonitors();
      const banner = bkCell('Bank', 'cashOut'), live = document.getElementById('liveLine').classList.contains('out');
      return { ok: !!banner && /1/.test(banner) && live, detail: { banner, live } }; }
    finally { Object.assign(S, keep); setupRun(); updateMonitors(); }
  },
  booksInterest() {   // Plan 7 A2: the month view shows loan interest between EBIT and tax
    try { setupRun(); fastForward(30 * 3600); const i = bkCell('Books', 'interest', 'month'); BOOKS.period = 'today';
      return { ok: i === money(-BIZ.balance * BIZ.rate / 1200), detail: { i, want: money(-BIZ.balance * BIZ.rate / 1200) } }; }
    finally {}
  },
  yearView() {   // Plan 7 A5: the year view lists every closed month and the current one, with year-to-date totals
    const keep = JSON.parse(JSON.stringify(S));
    try { skimDays(30, true); fastForward(30 * 3600); nextMonth(); skimDays(31); fastForward(30 * 3600); nextMonth(); fastForward(10 * 3600);
      BOOKS.period = 'year'; openBooks('Books'); const rows = document.querySelectorAll('#bkBody [data-k="yr"]').length, tot = (document.querySelector('#bkBody [data-k="yrEbitda"]') || {}).textContent;
      const want = money(BIZ.months.reduce((t, m) => t + m.pnl.ebitda, 0) + projectMonth().total.ebitda); closeBooks();
      return { ok: BIZ.months.length === 2 && rows === 3 && tot === want, detail: { months: BIZ.months.length, rows, tot, want } }; }
    finally { closeBooks(); BOOKS.period = 'today'; Object.assign(S, keep); }
  },
  yearOpensMonth() {   // Plan 7 A5: tapping a closed month opens its full P&L
    const keep = JSON.parse(JSON.stringify(S));
    try { skimDays(30, true); fastForward(30 * 3600); nextMonth(); BOOKS.period = 'year'; openBooks('Books'); document.querySelector('#bkBody [data-k="yr"][data-arch="0"]').click();
      const e = (document.querySelector('#bkBody [data-k="ebitda"]') || {}).textContent, i = (document.querySelector('#bkBody [data-k="interest"]') || {}).textContent, m = BIZ.months[0];
      return { ok: BOOKS.period === 'arch:0' && e === money(m.pnl.ebitda) && i === money(-m.interest), detail: { period: BOOKS.period, e, want: money(m.pnl.ebitda), i } }; }
    finally { closeBooks(); BOOKS.period = 'today'; Object.assign(S, keep); }
  },
  washroomSigns() {   // Plan 8b (owner): the washroom signs are plaques square to the walls (not camera-facing sprites), M in blue and W in red, no Chinese characters
    const kids = []; HALLG.g.traverse(o => kids.push(o)); const signs = kids.filter(o => o.userData.sign), sprites = kids.filter(o => o.isSprite);
    const ok = signs.length === 2 && !sprites.length && signs.map(o => o.userData.sign).sort().join() === 'M,W' && signs.every(o => Math.abs(o.rotation.y % (Math.PI / 2)) < 1e-6);
    return { ok, detail: { signs: signs.map(o => o.userData.sign), sprites: sprites.length } };
  },
  washroomsByGender() {   // Plan 7b: men and women change in their own washroom; nobody is stuck
    const r = runDay({}), withLocker = A.members.filter(a => a.locker), wrong = withLocker.filter(a => !(a.female ? LOCKERS_F : LOCKERS_M).includes(a.locker));
    return { ok: withLocker.length > 50 && wrong.length === 0 && r.stuck === 0 && LOCKERS_M.length >= 5 && LOCKERS_F.length >= 5, detail: { withLocker: withLocker.length, wrong: wrong.length, stuck: r.stuck } };
  },
  priceBoardFollows() {   // Plan 7b: the desk's price board shows the price list in force; a publish shows up the next morning
    const keep = JSON.parse(JSON.stringify(S));
    try { setupRun(); updateMonitors(); const k0 = PRICEBOARD.drawn; publishPrices({ priceOff: 2.0, pricePeak: S.pricePeak, priceCap: S.priceCap, rentP: 250, allowOutside: true }); updateMonitors(); const same = PRICEBOARD.drawn === k0;
      fastForward(30 * 3600); nextDay(); updateMonitors();
      return { ok: !!k0 && same && PRICEBOARD.drawn !== k0 && PRICEBOARD.drawn.startsWith('2|'), detail: { k0, now: PRICEBOARD.drawn } }; }
    finally { PUBLISH = null; Object.assign(S, keep); }
  },
  priceBoardVisible() {   // Plan 7b (owner): the price board stands on the reception desk; the learner may rotate the view to see it — at least one of the four views has nothing solid in front of it; taps aim at the board
    const m = PRICEBOARD.mesh, az0 = view.az, ce = Math.cos(view.el), se = Math.sin(view.el), shown = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
    const up = new V3().fromBufferAttribute(m.geometry.attributes.normal, 0).applyQuaternion(m.quaternion).y > 0.99;   /* Plan 8b (owner): lies flat on the counter */
    const onDesk = up && Math.abs(m.position.x - DESK_C.x) < 0.5 && Math.abs(m.position.z - DESK_C.z) < 1.3 && m.position.y > 1.11 && m.position.y < 1.16;
    const clear = [1, 3, 5, 7].map(k => k * Math.PI / 4).filter(az => {
      view.az = az; updateWalls(10); world.updateMatrixWorld(true);   /* walls on the camera's side are cut down, as on screen */
      const dir = new V3(ce * Math.sin(az), se, ce * Math.cos(az)).normalize(), facing = dir.dot(new V3().fromBufferAttribute(m.geometry.attributes.normal, 0).applyQuaternion(m.quaternion)) > 0.2;
      const rc = new THREE.Raycaster(m.position.clone().addScaledVector(dir, 0.06), dir, 0, 25); rc.camera = cam;
      return facing && !rc.intersectObject(world, true).some(h => h.object !== m && shown(h.object) && h.object.isMesh && !h.object.isInstancedMesh); });
    view.az = az0; updateWalls(10);
    const aimed = Math.hypot(PRICEBOARD_AT.x - m.position.x, PRICEBOARD_AT.y - m.position.y, PRICEBOARD_AT.z - m.position.z) < 0.01;
    return { ok: onDesk && clear.length > 0 && aimed, detail: { onDesk, up, y: m.position.y, clearViews: clear.length, aimed } };
  },
  hallRebuilds() {   // Plan 8: a hall can be rebuilt for another plot and back without leaking objects; fixtures follow the walls
    const n0 = world.children.length, u0 = under.children.length;
    try { setHall(16, 10); const W = HALL.x1 - HALL.x0, m = { w: +W.toFixed(2), zb: +HALL.zb.toFixed(2), door: +DOOR.x.toFixed(2), walls: wallSides.length, lockers: LOCKERS.length, lights: hallLights.length, n: world.children.length };
      setHall(); const back = { door: DOOR.x, zb: HALL.zb, n: world.children.length, u: under.children.length };
      return { ok: m.w === 29.12 && m.zb === -8.2 && m.door === 12 && m.walls === 4 && m.lockers === 10 && m.lights >= 2 && back.door === 12 && back.zb === -10 && back.n === n0 && back.u === u0, detail: { m, back, n0, u0 } }; }
    finally { setHall(); }
  },
  smallGymRuns() { return builtGymDay(10, 8); },    // Plan 8: an S gym (80 坪) runs a whole day: nobody stuck, every station on the floor and reachable from the door
  largeGymRuns() { return builtGymDay(20, 16, true); },   // Plan 8: an L gym (320 坪) gets more equipment than the sample and runs a whole day

  minGymRuns() { return builtGymDay(8, 7); },   // Plan 8 review: the smallest plot allowed (8 x 7 cells) runs a whole day
  buildBlocksBooks() {   // Plan 8 review: the books cannot open over the builder (they could move the day on under the preview)
    try { setupRun(); openBooks(); openBuild(); const a = !BOOKS.open; openBooks(); return { ok: a && !BOOKS.open && BUILD.on, detail: { closedOnBuild: a, open: BOOKS.open } }; }
    finally { closeBooks(); if (BUILD.on) cancelBuild(); }
  },
  buildChargesPlaced() {   // Plan 8 review: a built gym pays for what is placed — Setup sliders cannot buy benches that do not fit, and zones left out are not charged
    const keep = JSON.parse(JSON.stringify(S));
    try { Object.assign(S, { hallW: 10, hallD: 8 }, presetCounts(10, 8), { benches: 10 }); setupRun();
      const placed = STATIONS.filter(s => s.type === 'bench').length, keys = BUILT.items.map(it => it.key), benchLine = BUILT.items.find(it => it.key === 'benches');
      const okS = S.benches === placed && benchLine.n === placed && keys.includes('turf') === STATIONS.some(s => s.type === 'sled') && keys.includes('pullup') === STATIONS.some(s => s.type === 'pullup');   /* Plan 11: kit is charged exactly when it is placed */
      const locked = W.w_benches && W.w_benches.inp.disabled;
      return { ok: okS && locked, detail: { placed, sBenches: S.benches, line: benchLine.n, keys, locked } }; }
    finally { Object.assign(S, keep); setupRun(); syncSetupWidgets(); }
  },
  buildSampleMoney() {   // Plan 8 review: from a built gym, picking Sample in the builder shows the sample gym's capex
    const keep = JSON.parse(JSON.stringify(S));
    try { Object.assign(S, { hallW: 20, hallD: 16 }, presetCounts(20, 16)); setupRun(); openBuild(); buildPick('sample'); BUILD.tab = 'Money'; renderBuild();
      const t = document.getElementById('build').textContent; return { ok: t.includes('$10.5M'), detail: t.slice(0, 300) }; }
    finally { if (BUILD.on) cancelBuild(); Object.assign(S, keep); setupRun(); }
  },
  buildEscapeCancels() {   // Plan 8 review: Escape leaves the builder even after a click inside its sheet
    try { setupRun(); openBuild(); const b = document.querySelector('#build button'); b.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); return { ok: !BUILD.on, detail: { on: BUILD.on } }; }
    finally { if (BUILD.on) cancelBuild(); }
  },
  buildKeepsWant() {   // Plan 8 review: shrinking a plot and growing it back gives the counts back; the builder's rent follows the rent slider
    const keep = JSON.parse(JSON.stringify(S));
    try { setupRun(); S.rentRate = 2000; openBuild(); buildPick('M'); const want = BUILD.counts.cardio; buildSize(-10, 0); const low = BUILD.counts.cardio; buildSize(10, 0); const back = BUILD.counts.cardio;
      const rent = buildCostNow().rentMonth; setLang('zh'); const zhOk = /設計/.test(document.getElementById('build').textContent); setLang('en');
      return { ok: low < want && back === want && rent === 160 * 2070 && zhOk, detail: { want, low, back, rent, zhOk } }; }
    finally { setLang('en'); if (BUILD.on) cancelBuild(); Object.assign(S, keep); }
  },
  buildMoney() {   // Plan 8: a built gym sets the floor area, capex and depreciation, and the deposit leaves the bank at opening; the sample gym keeps today's money
    const keep = JSON.parse(JSON.stringify(S));
    try { Object.assign(S, { hallW: 16, hallD: 10 }, presetCounts(16, 10)); setupRun(); const c = buildCost({ w: 16, d: 10, counts: S, kit: placedCounts().kit }, { ...COSTS, rentRate: S.rentRate });   /* priced as placed (columns can knock a zone out) */
      const built = { area: S.area, pnlArea: pnlCosts().area, capex: COSTS.capex, dep: COSTS.depYear, cash: BIZ.cash, deposit: BIZ.deposit, hallW: HALL.w };
      openBooks('Bank'); const bank = document.getElementById('books').textContent; closeBooks(); BOOKS.tab = 'Today';
      const free = pnlCosts().rentRate === 0 && BIZ.monthIndex === 0;   /* the first month is rent-free (management is still paid) */
      openBuild(); BUILD.tab = 'Equipment'; renderBuild(); const unit = /\$105K each/.test(document.getElementById('build').textContent); cancelBuild();
      const okB = free && unit && /Rent deposit/.test(bank) && /Fit-out/.test(bank) && built.area === 160 && built.pnlArea === 160 && built.capex === c.capex && built.dep === c.depYear && built.deposit === c.deposit && built.cash === S.finOwn + S.finLoan - c.capex - c.deposit && built.hallW === 16;
      Object.assign(S, keep); setupRun();
      const back = { capex: COSTS.capex, dep: COSTS.depYear, hallW: HALL.w, cash: BIZ.cash, area: S.area };
      const okS = pnlCosts().rentRate === S.rentRate && back.capex === 10.5e6 && back.dep === 1.3e6 && back.hallW === null && back.cash === S.finOwn + S.finLoan - 10.5e6 && back.area === 115;
      return { ok: okB && okS, detail: { built, back, free, unit, want: { capex: c.capex, deposit: c.deposit } } }; }
    finally { Object.assign(S, keep); setupRun(); }
  },
  buildHidesPops() {   // Plan 8b: no money pops float over the builder's preview
    try { setupRun(); fastForward(10 * 3600); A.payQ = [{ a: A.members[0], fee: 90 }]; openBuild(); updatePays(); const n = PAYS.length; return { ok: n === 0, detail: { pops: n } }; }
    finally { if (BUILD.on) cancelBuild(); }
  },
  buildModeOpens() {   // Plan 8: Build a gym pauses, hides the panel and people, shows the toolbar and the grid, and previews the plot live
    try { setupRun(); goOn = true; openBuild(); const sheet = document.getElementById('build');
      const a = { on: BUILD.on, go: goOn, panel: panel.hidden, sheet: !sheet.hidden, grid: BUILD_GRID.visible, both: /Plot|場地/.test(sheet.textContent) && /Open this gym|開這間/.test(sheet.textContent) };
      buildPick('L'); const b = { w: HALL.w, racks: STATIONS.filter(s => s.type === 'rack').length, cols: !!sheet.querySelector('[data-k="cols"]') };   /* owner 2026-11-15: no pillars, no columns row */
      return { ok: a.on && !a.go && a.panel && a.sheet && a.grid && a.both && b.w === 20 && b.racks > 6 && !b.cols, detail: { a, b } }; }
    finally { cancelBuild(); goOn = false; refreshGo(); }
  },
  buildCancelKeeps() {   // Plan 8: Cancel puts back the very same hall, stations and lockers, and the day carries on
    try { setupRun(); fastForward(5 * 3600); const st = STATIONS, lk = LOCKERS_M[0], eq = EQUIP, inside = A.inside;
      openBuild(); buildPick('S'); buildCount('racks', 1); cancelBuild();
      const same = STATIONS === st && LOCKERS_M[0] === lk && EQUIP === eq && eq.parent === world && HALL.w === null && !BUILD.on && !panel.hidden && document.getElementById('build').hidden && !BUILD_GRID.visible;
      fastForward(2 * 3600); return { ok: same && A.inside >= 0 && A.t > 0, detail: { same, inside, now: A.inside } }; }
    finally { if (BUILD.on) cancelBuild(); }
  },
  buildOpensGym() {   // Plan 8: Open this gym starts a new business in the built hall with the chosen counts; a broken plot cannot open
    const keep = JSON.parse(JSON.stringify(S));
    try { setupRun(); openBuild(); buildPick('S'); buildSize(-3, 0); const refused = openGym() === false && BUILD.on;   /* 7 x 8: under 60 坪 and too narrow */
      buildSize(3, 0); buildCount('cardio', 1); const n = BUILD.counts.cardio; const opened = openGym();
      const got = { w: S.hallW, d: S.hallD, hall: HALL.w, cardio: S.cardio, area: S.area, idx: BIZ.monthIndex, on: BUILD.on };
      return { ok: refused && opened && got.w === 10 && got.d === 8 && got.hall === 10 && got.cardio === n && got.area === 80 && got.idx === 0 && !got.on, detail: { refused, got, n } }; }
    finally { if (BUILD.on) cancelBuild(); Object.assign(S, keep); setupRun(); }
  },
  // ---------------------------------------------------------------- Plan 9: retention actions (R1–R4)
  playtestCopy() {   // playtest step 2 (personas): a plain profit line on top of the P&L; clearer words where the personas stumbled
    try { runDay({}); BOOKS.period = 'today'; openBooks('Books'); const plain = (document.querySelector('#bkBody [data-k="plain"]') || {}).textContent || '', pnl = document.getElementById('bkBody').textContent;
      openBooks('Members'); const mem = document.getElementById('bkBody').textContent; closeBooks(); updateMonitors(); const avg = document.getElementById('mAvg').textContent;
      openBuild(); const bld = document.getElementById('build').textContent; cancelBuild();
      const ok = plain.includes(money(Math.abs(A.pnl.ebitda))) && /made|lost/.test(plain) && !/no Taiwan benchmark/.test(pnl) && /up to \$300/.test(mem) && /chance/.test(mem) && !/≤/.test(mem) && / min$/.test(avg) && /replaces your current gym/.test(bld);
      return { ok, detail: { plain, avg, up: /up to \$300/.test(mem), bench: /no Taiwan benchmark/.test(pnl), replace: /replaces your current gym/.test(bld) } }; }
    finally { closeBooks(); BOOKS.tab = 'Today'; if (BUILD.on) cancelBuild(); }
  },
  busMissedGoesHome() {   // bot playtest (07 layer 1): a member who reaches the stop after the last bus goes home another way instead of waiting all night
    try { setupRun(); fastForward(10 * 3600); const a = A.members.find(m => m.visible && m.state === 'ex') || A.members[0]; a.mode = 'bus'; a.state = 'busWait'; a.visible = true; const keep = A.buses; A.buses = keep.filter(b => b < A.t - 60);
      fastForward(120); const st = a.state; A.buses = keep; return { ok: st === 'gone', detail: { state: st } }; }
    finally { setupRun(); }
  },
  retainChances() {   // R2 base chances; R4 crowding halves messages only; R3 a repeat within 30 days halves
    try { setupRun(); fastForward(10 * 3600); const i = M.dayI, m = M.pool.find(x => i - x.joinedDay >= 30 && !(x.bad || []).length);
      const base = ['checkin', 'taster', 'voucher'].map(k => retainChance(m, k));
      m.bad = [i]; const crowd = ['checkin', 'taster', 'voucher'].map(k => retainChance(m, k)); m.bad = [];
      m.acts = [{ day: i - 5, kind: 'voucher', ok: false }]; const rep = retainChance(m, 'voucher'); m.acts = [{ day: i - 40, kind: 'voucher', ok: false }]; const old = retainChance(m, 'voucher'); m.acts = [];
      return { ok: base.join() === '0.25,0.45,0.35' && crowd.join() === '0.125,0.45,0.35' && rep === 0.175 && old === 0.35 && retainChance(m, 'winback') === 0, detail: { base, crowd, rep, old } }; }
    finally { setupRun(); }
  },
  retainProtects() {   // R2: a check-in that lands halves the member's churn for 2 months; one that fails changes nothing
    try { setupRun(); fastForward(10 * 3600); const i = M.dayI, [m, n] = M.pool.filter(x => !(x.bad || []).length), h0 = lapseHazard(m, i), g0 = lapseHazard(n, i);
      const yes = retainAct(m, 'checkin', 0), no = retainAct(n, 'checkin', 0.99);
      return { ok: yes.ok && !no.ok && Math.abs(lapseHazard(m, i) - h0 / 2) < 1e-12 && m.protect.until === i + 61 && lapseHazard(n, i) === g0 && !n.protect && n.acts.length === 1, detail: { yes, no, until: m.protect && m.protect.until } }; }
    finally { setupRun(); }
  },
  retainDeskLimit() {   // R2: the desk sends at most 5 check-in messages a day
    try { setupRun(); fastForward(10 * 3600); const out = M.pool.slice(0, 6).map(m => retainAct(m, 'checkin', 0.99));
      return { ok: out.slice(0, 5).every(r => !r.refused) && out[5].refused === 'desk' && A.deskMsgs === 5, detail: out.map(r => r.refused || (r.ok ? 'yes' : 'no')) }; }
    finally { setupRun(); }
  },
  retainCosts() {   // R2: an accepted taster pays the coach $800; a win-back SMS costs $20 whether or not it lands; both hit today's EBITDA and the bank
    try { setupRun(); fastForward(10 * 3600); const p0 = computePnl(), c0 = liveCash(), m = M.pool[0], l = M.pool[1];
      retainAct(m, 'taster', 0, 0.99); M.pool.splice(M.pool.indexOf(l), 1); l.lapsedDay = M.dayI - 10; M.lapsed.push(l); retainAct(l, 'winback', 0.99);
      A.pnl = computePnl(); const p1 = A.pnl, cell = bkCell('Books', 'retain', 'today', true);
      return { ok: +cell === -820 && A.retain === 820 && p1.retain - (p0.retain || 0) === 820 && Math.abs((p0.ebitda - p1.ebitda) - 820) < 1e-6 && Math.abs((c0 - liveCash()) - 820) < 1e-6, detail: { retain: A.retain, d: p0.ebitda - p1.ebitda, cash: c0 - liveCash() } }; }
    finally { setupRun(); }
  },
  retainVoucher() {   // R2: a voucher takes up to $300 off the member's visit fees within a month
    try { setupRun(); fastForward(10 * 3600); const m = M.pool[0]; retainAct(m, 'voucher', 0);
      const a = applyVoucher(m, 200), b = applyVoucher(m, 150), c = applyVoucher(m, 150);
      return { ok: a === 0 && b === 50 && c === 150 && m.voucher.left === 0 && m.voucher.until === M.dayI + 30, detail: { a, b, c, v: m.voucher } }; }
    finally { setupRun(); }
  },
  retainWinback() {   // R2: a win-back that lands brings a lapsed member back; it is refused for members who have not lapsed
    try { setupRun(); fastForward(10 * 3600); const l = M.pool[2]; M.pool.splice(M.pool.indexOf(l), 1); l.lapsedDay = M.dayI - 10; M.lapsed.push(l);
      const r = retainAct(l, 'winback', 0), back = M.pool.includes(l) && !M.lapsed.includes(l) && l.lapsedDay == null, refused = retainAct(M.pool[0], 'winback', 0).refused;
      return { ok: r.ok && back && refused === 'notLapsed', detail: { r, back, refused } }; }
    finally { setupRun(); }
  },
  retainTasterPack() {   // R2: one in four who accept a taster buy a PT pack (paid now, sessions owed)
    try { setupRun(); fastForward(10 * 3600); const [m, n] = M.pool.filter(x => !x.pt && !x.outside), pt0 = A.ptRev || 0, d0 = A.deferred;
      retainAct(m, 'taster', 0, 0); const bought = !!m.pt && (A.ptRev || 0) - pt0 === m.pt.price && A.deferred - d0 === m.pt.price;
      retainAct(n, 'taster', 0, 0.99); return { ok: bought && !n.pt, detail: { bought, pt: m.pt } }; }
    finally { setupRun(); }
  },
  retainMonthCarry() {   // protection, vouchers and the action history move with the member into the next month
    const keep = JSON.parse(JSON.stringify(S));
    try { setupRun(); fastForward(10 * 3600); const m = M.pool[0]; retainAct(m, 'checkin', 0); const until = m.protect.until, L = M.cal.length;
      skimDays(30); fastForward(30 * 3600); nextMonth();   /* carry on this business (no fresh Setup) */ const still = M.pool.concat(M.lapsed).includes(m);
      return { ok: still && m.protect.until === until - L && m.acts[0].day === -L, detail: { until, now: m.protect.until, L, act: m.acts[0] } }; }
    finally { Object.assign(S, keep); setupRun(); }
  },
  retainAfterClose() {   // review C1: an action taken after the day has ended still reaches the books, the bank and the month
    try { setupRun(); fastForward(30 * 3600); const m = M.pool.find(x => !x.pt && !x.outside), c0 = liveCash(), r = retainAct(m, 'taster', 0, 0), c1 = liveCash();
      nextDay(); const day = M.days[M.days.length - 1].pnl;
      return { ok: !!r.pack && Math.abs((c1 - c0) - (m.pt.price - 800)) < 1e-6 && day.retain === 800 && day.takings >= m.pt.price, detail: { cash: c1 - c0, pack: m.pt && m.pt.price, retain: day.retain, takings: day.takings } }; }
    finally { setupRun(); }
  },
  retainGuards() {   // review I2, I3, M4, M6: no taster pack for outside-coach members; nothing during a close or on a closed day; the pack is reported per action
    try { setupRun(); fastForward(10 * 3600); const [o, m] = [M.pool.find(x => x.outside && !x.pt), M.pool.find(x => !x.outside && !x.pt)];
      const ro = retainAct(o, 'taster', 0, 0), r1 = retainAct(m, 'taster', 0, 0); m.pt = null; m.acts = []; const r2 = retainAct(m, 'taster', 0, 0.99);
      closing = { kind: 'day' }; const rc = retainAct(M.pool[5], 'checkin', 0); openBuildFromBooks(); const built = BUILD.on; closing = null;
      A.closed = true; const rd = retainAct(M.pool[6], 'checkin', 0); A.closed = false;
      return { ok: !o.pt && !ro.pack && !!r1.pack && !r2.pack && rc.refused === 'closing' && !built && rd.refused === 'closedDay', detail: { outsidePt: !!o.pt, r1: !!r1.pack, r2: !!r2.pack, rc: rc.refused, built, rd: rd.refused } }; }
    finally { closing = null; if (BUILD.on) cancelBuild(); setupRun(); }
  },
  retainUI() {   // R1: the Members tab offers the actions for each at-risk member and a win-back for the recently lapsed; a click acts and shows the answer
    try { setupRun(); fastForward(10 * 3600); const l = M.pool[3]; M.pool.splice(M.pool.indexOf(l), 1); l.lapsedDay = M.dayI - 3; M.lapsed.push(l);
      openBooks('Members'); const body = () => document.getElementById('bkBody'), btns = body().querySelectorAll('[data-retain]'), wb = body().querySelectorAll('[data-retain^="winback"]').length;
      const left = /left today/.test(body().textContent), first = body().querySelector('[data-retain^="checkin"]'), id = +first.dataset.retain.split(':')[1]; first.click();
      const m = M.pool.find(x => x.id === id), said = /said yes|no answer/.test(body().textContent);
      return { ok: btns.length >= 16 && wb >= 1 && left && m.acts.length === 1 && said, detail: { btns: btns.length, wb, left, acts: m.acts.length, said } }; }
    finally { closeBooks(); BOOKS.tab = 'Today'; setupRun(); }
  },
  hoverFindsStation() {   // Plan 7b: hovering a rack names it and outlines it, without acting
    const keep = { az: view.az, zoom: view.zoom, zoomT: view.zoomT, t: view.target.clone() };
    try { setupRun(); clearFollow(); const rack = STATIONS.find(s => s.type === 'rack'); const at = screenOf(rack.x, 0, rack.z);
      const t = pickTarget(at[0], at[1]), lab = t ? hoverLabel(t) : '', hull = t ? hoverHull(t) : [];
      const edges = t ? hoverBase(t) : [], flat = edges.length === 4 && edges.every(e => e.a && e.b);   /* (owner, 2026-11-15): a dotted footprint on the floor */
      return { ok: !!t && t.kind === 'station' && t.s === rack && lab === 'Power rack' && hull.length >= 4 && flat && !followA && !focusS, detail: { kind: t && t.kind, lab, hull: hull.length, edges: edges.length } }; }
    finally { view.az = view.azT = keep.az; view.zoom = keep.zoom; view.zoomT = keep.zoomT; view.target.copy(keep.t); }
  },
  hoverFindsBoard() {   // Plan 7b: hovering the price sign says it opens the price list
    try { setupRun(); clearFollow(); const at = screenOf(PRICEBOARD_AT.x, PRICEBOARD_AT.y, PRICEBOARD_AT.z, true); const t = pickTarget(at[0], at[1]), lab = t ? hoverLabel(t) : '';
      return { ok: !!t && t.kind === 'board' && lab === 'Price list', detail: { kind: t && t.kind, lab } }; }
    finally { clearFollow(); }
  },
  followMarkerShown() {   // Plan 7b: a floor marker sits under the person being followed, and goes when following stops
    try { setupRun(); fastForward(4 * 3600); const m = A.members.find(a => a.visible && !a.P.hidden); onAgentPicked(m); updateFollowMark(0.02); const s0 = FOLLOW_MARK.scale.x; updateFollowMark(0.5); const s1 = FOLLOW_MARK.scale.x; const breath = []; for (let i = 0; i < 24; i++) { updateFollowMark(0.05); breath.push(FOLLOW_MARK.scale.x); }
      const fill = FOLLOW_MARK.userData.fill, edges = FOLLOW_MARK.userData.edges || [];   /* Plan 8b (owner): the equipment outline's bevelled edges */
      const lo = Math.min(...breath), hi = Math.max(...breath), anim = s0 > 1.25 && Math.abs(s1 - 1) < 0.08 && lo >= 0.95 && hi <= 1.08 && hi - lo > 0.02;   /* owner: a select-cursor lock-on (snaps in from large), then a gentle breathing pulse */
      const steady = !fill && FOLLOW_MARK.children.length === 8 && edges.length === 8 && anim;   /* owner: the outline only, no fill */
      const at = m.P && m.P.H ? m.P.H : m.pos, fx = FOLLOW_MARK.position.x - HALL.x0, fz = FOLLOW_MARK.position.z - HALL.zb;   /* Plan 8b (owner): the floor tile the person stands on, on the floor's 1 m grid */
      const on = FOLLOW_MARK.visible && Math.abs(fx - Math.floor(fx) - 0.5) < 1e-6 && Math.abs(fz - Math.floor(fz) - 0.5) < 1e-6 && Math.abs(FOLLOW_MARK.position.x - at.x) <= 0.5 && Math.abs(FOLLOW_MARK.position.z - at.z) <= 0.5;
      clearFollow(); updateFollowMark(0.6); return { ok: !!m && on && steady && !FOLLOW_MARK.visible, detail: { on, steady, s0, s1, lo, hi, after: FOLLOW_MARK.visible } }; }
    finally { clearFollow(); }
  },
  selectMarksMachine() {   // (owner, 2026-11-15): a selected machine wears the same floor mark, at its footprint, turned with it; every station has a real extent
    try { setupRun(); clearFollow(); const s = STATIONS.find(s => s.type === 'chestpress') || STATIONS.find(s => s.fit); actOn({ kind: 'station', s }); updateFollowMark(0.5);
      const b = hoverBox({ kind: 'station', s }), E = FOLLOW_MARK.userData.edges, near = (p, q) => Math.abs(p - q) < 1e-6;
      const on = FOLLOW_MARK.visible && near(FOLLOW_MARK.position.x, b[0]) && near(FOLLOW_MARK.position.z, b[1]) && near(FOLLOW_MARK.rotation.y, -s.yaw);
      const reach = Math.max(...E.map(m => Math.abs(m.position.x))) >= b[3] / 2 && Math.max(...E.map(m => Math.abs(m.position.z))) >= b[5] / 2;   /* past the footprint, not inside it */
      const bad = STATIONS.filter(s => s.type !== 'sled' && !(s.fit && s.fit.a > 0.3 && s.fit.c > 0.3 && s.fit.h > 0.03 && s.fit.a < 3.5 && s.fit.c < 4.5)).map(s => s.type);
      clearFollow(); updateFollowMark(0.1); return { ok: on && reach && !bad.length && !FOLLOW_MARK.visible, detail: { on, reach, bad } }; }
    finally { clearFollow(); }
  },
  priceBoardOpensPricing() {   // Plan 7b: tapping the price board opens the Pricing tab
    try { setupRun(); closeBooks(); const hit = onGroundPicked(PRICEBOARD_AT.x, PRICEBOARD_AT.z); return { ok: hit && BOOKS.open && BOOKS.tab === 'Pricing', detail: { open: BOOKS.open, tab: BOOKS.tab } }; }
    finally { closeBooks(); BOOKS.tab = 'Today'; }
  },
  spaceTogglesGo() {   // Plan 7 review: keyboard shortcuts on the page still work (Space = Go / Pause)
    try { setupRun(); goOn = false; refreshGo(); document.body.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true })); const a = goOn;
      return { ok: a === true, detail: { goOn: a } }; }
    finally { goOn = false; refreshGo(); }
  },
  newMonthKeepsSetup() {   // Plan 7 review I1: New month continues the business; pending Setup changes stay pending
    const keep = JSON.parse(JSON.stringify(S));
    try { skimDays(30, true); fastForward(30 * 3600); S.racks = 8; S.peak = 45; S.finLoan = 10e6; S.seed = 99; nextMonth(); refreshPending();
      const c = M.cfg; return { ok: c.racks === 6 && c.peak === 35 && c.finLoan === 6e6 && c.seed === keep.seed && W.setup.classList.contains('need') && c.month === 'Jul', detail: { racks: c.racks, peak: c.peak, seed: c.seed, need: W.setup.classList.contains('need') } }; }
    finally { Object.assign(S, keep); refreshPending(); }
  },
  newMonthPanelSync() {   // Plan 7 review I2: after New month the panel shows the month (and months open) a Setup would use
    const keep = JSON.parse(JSON.stringify(S));
    try { S.build = 'new'; S.monthsOpen = 24; skimDays(30, true); fastForward(30 * 3600); W.go.click(); goOn = false;
      return { ok: W.w_month.sel.value === 'Jul' && S.monthsOpen === 25, detail: { month: W.w_month.sel.value, open: S.monthsOpen } }; }   // the months-open slider was removed with the scenario picker
    finally { goOn = false; Object.assign(S, keep); setLang(LANG); }
  },
  closeLocksControls() {   // Plan 7 review I3: while a close is running, Go, Step, Setup and the binder's Next day do nothing
    try { setupRun(); fastForward(30 * 3600); const biz = BIZ, d0 = M.dayI; closing = { kind: 'week', out: {} };
      W.go.click(); W.step.click(); W.setup.click(); booksNextDay();
      return { ok: BIZ === biz && M.dayI === d0 && goOn === false, detail: { sameBiz: BIZ === biz, dayI: M.dayI, goOn } }; }
    finally { closing = null; goOn = false; }
  },
  introWelcome() {   // Plan 10 frame 1: the first screen is a size picker with no Cancel (there is no gym to go back to)
    try { setupRun(); openIntro(); const box = document.getElementById('build'), t = box.textContent;
      const ok = BUILD.on && BUILD.intro && BUILD.step === 'welcome' && /Open your first gym/.test(t) && /NT dollars/.test(t) && /Take over a running gym/.test(t) && !box.querySelector('[data-bact="cancel"]') && ['S', 'M', 'L'].every(k => box.querySelector(`[data-intro="${k}"]`));
      return { ok, detail: { step: BUILD.step, t: t.slice(0, 300) } }; }
    finally { if (BUILD.on) cancelBuild(); }
  },
  introCostLines() {   // frame 2a: four cost lines and a setup-cost total, K / M inventory money
    try { setupRun(); openIntro(); document.querySelector('#build [data-intro="M"]').click(); const c = buildCostNow(), t = document.getElementById('build').textContent;
      const want = [c.rentMonth, c.fitOut, c.equipment, c.deposit, c.capex + c.deposit].map(moneyK), miss = want.filter(w => !t.includes(w));
      return { ok: BUILD.step === 'cost' && BUILD.w === 16 && !miss.length && /Customise/.test(t) && /pay for it/.test(t), detail: { step: BUILD.step, miss, t: t.slice(0, 300) } }; }
    finally { if (BUILD.on) cancelBuild(); }
  },
  introPay() {   // frame 2b: own money and loan, the loan payment, cash on opening day, runway; negative cash allowed with a warning
    try { setupRun(); openIntro(); document.querySelector('#build [data-intro="M"]').click(); document.querySelector('#build [data-istep="pay"]').click();
      S.finOwn = 0; S.finLoan = 0; renderBuild(); const neg = document.getElementById('build').textContent;
      S.finOwn = 20e6; S.finLoan = 4e6; renderBuild(); const pos = document.getElementById('build').textContent, pay = money(Math.round(loanPayment(S.finLoan, S.finRate, S.finYears)));
      const ok = BUILD.step === 'pay' && /overdrawn/.test(neg) && /How will you pay for it/.test(pos) && /months of running costs/.test(pos) && pos.includes(pay) && !/overdrawn/.test(pos) && !!document.querySelector('#build [data-bact="open"]');
      return { ok, detail: { pay, neg: neg.slice(0, 300), pos: pos.slice(0, 400) } }; }
    finally { if (BUILD.on) cancelBuild(); }
  },
  introTakeOver() {   // "Take over a running gym": the sample gym, no build costs, straight to the day
    try { S.hallW = 16; S.hallD = 10; setupRun(); openIntro(); document.querySelector('#build [data-intro="take"]').click();
      return { ok: !BUILD.on && S.hallW === null && BIZ.cash === S.finOwn + S.finLoan - COSTS.capex, detail: { on: BUILD.on, hallW: S.hallW, cash: BIZ.cash } }; }
    finally { if (BUILD.on) cancelBuild(); S.hallW = S.hallD = null; setupRun(); }
  },
  introLangSwitch() {   // Review focus 1: switching language keeps the intro step
    try { setupRun(); openIntro(); document.querySelector('#build [data-intro="M"]').click(); document.querySelector('#build [data-istep="pay"]').click(); setLang('zh');
      const t = document.getElementById('build').textContent; return { ok: BUILD.step === 'pay' && BUILD.intro && /開幕日現金/.test(t), detail: { step: BUILD.step, t: t.slice(0, 200) } }; }
    finally { setLang('en'); if (BUILD.on) cancelBuild(); }
  },
  introEscape() {   // Review focus 2: Escape does nothing on the welcome step and goes back one step after it
    try { setupRun(); openIntro(); const esc = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      esc(); const a = BUILD.on && BUILD.step === 'welcome';
      document.querySelector('#build [data-intro="M"]').click(); document.querySelector('#build [data-istep="pay"]').click(); esc(); const b = BUILD.on && BUILD.step === 'cost';
      return { ok: a && b, detail: { a, b, step: BUILD.step } }; }
    finally { if (BUILD.on) cancelBuild(); }
  },
  introFollowsFirst() {   // Plan 10 frames 3–5: the doors open, the camera follows the first member in, then hands off and asks for a goal
    try { setupRun(); clearFollow(); onGymOpened(true); const lead = A.members[0].spawnT - A.t, near = lead >= 0 && lead <= 15, playingNow = goOn;   /* review I1: just before the first member, not before the doors */
      for (let i = 0; i < 7200 && INTRO.phase === 'wait'; i++) { fastForward(30); updateIntro(0.1); }
      const first = followA, ph1 = INTRO.phase; updateIntro(8.1); const card = document.getElementById('goalCard');
      const ok = near && playingNow && ph1 === 'follow' && first && first.kind === 'member' && INTRO.phase === 'goal' && followA === null && !card.hidden && card.querySelectorAll('[data-goal]').length === 4;
      return { ok, detail: { near, playingNow, ph1, kind: first && first.kind, phase: INTRO.phase, card: !card.hidden } }; }
    finally { goOn = false; INTRO.phase = 'off'; hideGoalCard(); clearFollow(); }
  },
  introUserTakesOver() {   // Review focus 3: tapping someone else during the automatic follow keeps the player's pick
    try { setupRun(); clearFollow(); onGymOpened(true);
      for (let i = 0; i < 7200 && INTRO.phase === 'wait'; i++) { fastForward(30); updateIntro(0.1); }
      let other = null; for (let i = 0; i < 2000 && !other; i++) { other = AGENTS.find(a => a.visible && a !== INTRO.a && a !== A.desk) || null; if (!other) fastForward(30); }
      onAgentPicked(other); updateIntro(0.1);
      return { ok: !!other && INTRO.phase === 'goal' && followA === other, detail: { other: !!other, phase: INTRO.phase, kept: followA === other } }; }
    finally { goOn = false; INTRO.phase = 'off'; hideGoalCard(); clearFollow(); }
  },
  goalTracker() {   // frame 6: the picked goal shows under the clock with its progress (a newly opened gym: 145 members)
    try { S.build = 'new'; S.monthsOpen = 0; setupRun(); showGoalCard(); document.querySelector('#goalCard [data-goal="members500"]').click(); updateMonitors(); const g = document.getElementById('goalLine');
      return { ok: GOAL.key === 'members500' && document.getElementById('goalCard').hidden && /Reach 500 members by the end of month 3/.test(g.textContent) && g.textContent.includes(`${M.pool.length} of 500`), detail: { key: GOAL.key, line: g.textContent } }; }
    finally { GOAL.key = null; INTRO.phase = 'off'; hideGoalCard(); S.build = 'existing'; S.monthsOpen = 1; }
  },
  goalResetsOnSetup() {   // Review focus 5: a new business starts without the old goal
    try { setupRun(); GOAL.key = 'cash12'; updateMonitors(); const a = document.getElementById('goalLine').textContent; setupRun(); updateMonitors(); const b = document.getElementById('goalLine').textContent;
      return { ok: /year 1/.test(a) && GOAL.key === null && b === '', detail: { a, b } }; }
    finally { GOAL.key = null; }
  },
  moreHidesDev() {   // Plan 10: Seed and Copy results sit behind More; Build a gym stays in view
    try { const m = document.querySelector('#panel details.more'), seed = document.getElementById('seed'), copy = W.copy, b = document.getElementById('buildBtn');
      const ok = !!m && !m.open && m.contains(seed) && m.contains(copy) && !m.contains(b) && !!document.getElementById('introAgain') && !!document.getElementById('goalAgain');
      return { ok, detail: { more: !!m, seed: m && m.contains(seed), copy: m && m.contains(copy), build: m && m.contains(b) } }; }
    catch (e) { return { ok: false, detail: String(e) }; }
  },
  goLabelStart() {   // personas: "Pause" while nothing moved before 07:00; before the doors open the button says Start the day
    try { setupRun(); goOn = false; refreshGo(); const a = W.go.textContent; fastForward(A.open - A.t + 60); refreshGo(); const b = W.go.textContent;
      return { ok: a === 'Start the day' && b === 'Go', detail: { a, b } }; }
    finally { goOn = false; refreshGo(); }
  },
  introOnlyFirst() {   // Review focus 4: no intro on self-test pages; Show intro again opens it; the side-panel button opens the full builder
    try { setupRun(); const wanted = introWanted(); document.getElementById('introAgain').click(); const a = BUILD.on && BUILD.intro && BUILD.step === 'welcome'; cancelBuild();
      openBuild(); const t = document.getElementById('build').textContent, b = BUILD.on && !BUILD.intro && /replaces your current gym/.test(t) && !!document.querySelector('#build [data-bact="cancel"]'); cancelBuild();
      document.getElementById('goalAgain').click(); const c = !document.getElementById('goalCard').hidden;
      return { ok: wanted === false && a && b && c, detail: { wanted, a, b, c } }; }
    finally { if (BUILD.on) cancelBuild(); hideGoalCard(); INTRO.phase = 'off'; }
  },
  booksCountsExplained() {   // personas: 88 check-ins vs 64 paid visits read as a bug; say why under the counts
    try { runDay({}); openBooks('Today'); const t = document.getElementById('bkBody').textContent;
      return { ok: t.includes(`${A.checkins} checked in`) && t.includes(`${A.paidVisits} have paid`) && /pays by the minute on the way out/.test(t) && /New member cards \(joining fee\)/.test(t), detail: { checkins: A.checkins, paid: A.paidVisits, t: t.slice(0, 400) } }; }
    finally { closeBooks(); BOOKS.tab = 'Today'; }
  },
  staffEffectShown() {   // personas: "members who meet no staff drift away faster" had no number; the dead end "come later" goes
    const keep = S.staff;
    try { setupRun(); S.staff = 133000; openBooks('Staff'); updateBooks(true); const t = document.getElementById('bkBody').textContent;
      const x = Math.round(100 * (churnMonthly(0, null, 0, staffAdj(133000)) / churnMonthly(0, null, 0, 0) - 1));   /* review I4: the month-0 churn change, not the raw adjustment */
      return { ok: x === 10 && t.includes(`${x}% more often`) && !/30% faster/.test(t) && !/come later/.test(t), detail: { x, t: t.slice(0, 600) } }; }
    finally { S.staff = keep; closeBooks(); BOOKS.tab = 'Today'; }
  },
  booksGoalLine() {   // frame 7: the goal line sits under the plain profit line in Books
    try { setupRun(); GOAL.key = 'members500'; BOOKS.period = 'today'; openBooks('Books'); const t = document.getElementById('bkBody').textContent;
      return { ok: /Goal: Reach 500 members/.test(t), detail: { t: t.slice(0, 300) } }; }
    finally { GOAL.key = null; closeBooks(); BOOKS.tab = 'Today'; }
  },
  digitsReadable() {   // personas misread 25% as 88% in Silkscreen: figures use Pixelify Sans
    try { runDay({}); openBooks('Today'); const td = document.querySelector('#bkBody td.n'), f1 = getComputedStyle(td).fontFamily; closeBooks(); updateMonitors(); const f2 = getComputedStyle(document.getElementById('mVisits')).fontFamily;
      return { ok: /^"?Digits"?,/.test(f1) && /^"?Digits"?,/.test(f2), detail: { f1, f2 } }; }   /* owner: Pixelify's 5 reads as S */
    finally { closeBooks(); }
  },
  phoneBooksButton() {   // personas: no way into the books on a phone; the sheet's tab row gets a Books button
    try { setupRun(); const b = document.querySelector('#panel .tabs button[data-t="Books"]'); if (b) b.click(); const open = BOOKS.open;
      return { ok: !!b && open && /Books|帳本/.test(b.textContent), detail: { b: !!b, open } }; }
    finally { closeBooks(); }
  },
  introHidesHud() {   // screenshots: while building, the old gym's takings line and the desk hint stay hidden; the desk hint also waits for the goal card
    try { setupRun(); updateMonitors(); openIntro(); updateMonitors(); updateBooksHint(window.__LO.toScreen);
      const shown = (id) => getComputedStyle(document.getElementById(id)).display !== 'none', a = !shown('liveLine') && !shown('booksHint'); cancelBuild();
      showGoalCard(); updateBooksHint(window.__LO.toScreen); const b = !shown('booksHint'); hideGoalCard(); updateMonitors(); const c = shown('liveLine');
      return { ok: a && b && c, detail: { a, b, c } }; }
    finally { if (BUILD.on) cancelBuild(); hideGoalCard(); INTRO.phase = 'off'; }
  },
  introFirstMemberSoon() {   // review I1: the doors open a few seconds before the first member arrives, not 40 seconds of an empty door
    try { setupRun(); onGymOpened(true); const lead = A.members[0].spawnT - A.t; return { ok: lead >= 0 && lead <= 15, detail: { lead } }; }
    finally { goOn = false; INTRO.phase = 'off'; clearFollow(); }
  },
  introAgainCancels() {   // review I2: "Show intro again" from a running gym can be cancelled (button and Escape) without losing the business
    try { setupRun(); const biz = BIZ; document.getElementById('introAgain').click(); const btn = !!document.querySelector('#build [data-bact="cancel"]');
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); return { ok: btn && !BUILD.on && BIZ === biz && S.hallW === null, detail: { btn, on: BUILD.on, same: BIZ === biz } }; }
    finally { if (BUILD.on) cancelBuild(); }
  },
  introCopyHonest() {   // review I3: a built gym opens with members already signed up, so the welcome must not promise an empty gym
    try { setupRun(); openIntro(); const t = document.getElementById('build').textContent; return { ok: !/empty plot/.test(t) && !/already signed up from the neighbourhood/.test(t) && /signed up before you open/.test(t) && /win the rest/.test(t), detail: { t: t.slice(0, 300) } }; }
    finally { if (BUILD.on) cancelBuild(); }
  },




  minorKeepText() {   // logged minor 1: 94.6% kept must not read "kept 95%" while marked missed
    const g = goalStatus('keep92', { months: [{ pnl: { ebitda: 0 }, members: 916, lapsed: 84 }], mtdEbitda: 0, monthIndex: 1, cashOut: false, lapsedNow: 0, startPool: 100 });
    return { ok: g.state === 'missed' && /91\.6%/.test(g.text.en), detail: g };   /* 91.6% kept must not read "92%" while missed */
  },
  minorCustomNoSample() {   // logged minor 2: Customise inside the intro offers no Sample (it had no way out)
    try { setupRun(); openIntro(); document.querySelector('#build [data-intro="M"]').click(); document.querySelector('#build [data-istep="custom"]').click();
      return { ok: BUILD.step === 'custom' && !document.querySelector('#build [data-pick="sample"]'), detail: { step: BUILD.step } }; }
    finally { if (BUILD.on) cancelBuild(); }
  },
  minorEscapeRules() {   // logged minor 3: Escape from Customise applies the same plot-rules check as the Back button
    try { setupRun(); openIntro(); document.querySelector('#build [data-intro="S"]').click(); document.querySelector('#build [data-istep="custom"]').click(); buildSize(-4, 0);
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); return { ok: BUILD.step === 'custom', detail: { step: BUILD.step, w: BUILD.w } }; }
    finally { if (BUILD.on) cancelBuild(); }
  },
  minorWaitKeepsFollow() {   // logged minor 4: a player already following someone before the first member arrives keeps the camera
    try { setupRun(); onGymOpened(true); let mine = null; for (let i = 0; i < 400 && !mine; i++) { mine = AGENTS.find(a => a.visible && a !== A.desk && a.kind !== 'member') || null; if (!mine) fastForward(10); } onAgentPicked(mine); for (let i = 0; i < 400 && INTRO.phase === 'wait'; i++) { fastForward(30); updateIntro(0.1); }
      return { ok: followA === mine && INTRO.phase === 'goal', detail: { kept: followA === mine, phase: INTRO.phase } }; }
    finally { goOn = false; INTRO.phase = 'off'; hideGoalCard(); clearFollow(); }
  },
  minorSkipKeepsGoal() {   // logged minor 5: Skip from "Change goal" keeps the goal; Change goal during the follow still releases the camera
    try { setupRun(); GOAL.key = 'cash12'; document.getElementById('goalAgain').click(); document.querySelector('#goalCard button.skip').click(); const a = GOAL.key === 'cash12';
      onGymOpened(true); for (let i = 0; i < 400 && INTRO.phase === 'wait'; i++) { fastForward(30); updateIntro(0.1); } document.getElementById('goalAgain').click(); const b = followA === null;
      return { ok: a && b, detail: { a, b } }; }
    finally { GOAL.key = null; goOn = false; INTRO.phase = 'off'; hideGoalCard(); clearFollow(); }
  },
  minorCardOffBuilder() {   // logged minor 6: opening the builder puts the goal card away
    try { setupRun(); showGoalCard(); openBuild(); return { ok: document.getElementById('goalCard').hidden, detail: {} }; }
    finally { if (BUILD.on) cancelBuild(); hideGoalCard(); INTRO.phase = 'off'; }
  },
  minorCardLanguage() {   // logged minor 7: the goal card follows a language switch, and More stays open across it
    try { setupRun(); showGoalCard(); const more = document.querySelector('#panel details.more'); more.open = true; setLang('zh');
      const t = document.getElementById('goalCard').textContent, m = document.querySelector('#panel details.more').open; return { ok: /你想先挑戰什麼/.test(t) && m, detail: { t: t.slice(0, 60), m } }; }
    finally { setLang('en'); hideGoalCard(); INTRO.phase = 'off'; const more = document.querySelector('#panel details.more'); if (more) more.open = false; }
  },
  minorIntroDoneOnOpen() {   // logged minor 8: opening a gym from the intro marks the intro seen (a reload before the goal card doesn't replay it)
    try { setupRun(); try { localStorage.removeItem('gymsim.introDone'); } catch (e) {} openIntro(); document.querySelector('#build [data-intro="take"]').click();
      return { ok: introSeen(), detail: { seen: introSeen() } }; }
    finally { goOn = false; INTRO.phase = 'off'; clearFollow(); }
  },
  minorClickWord() {   // logged minor 9: the hand-off hint says Click on a mouse, Tap on touch
    const w = followWord(); return { ok: w === (matchMedia('(pointer: coarse)').matches ? 'Tap anyone to follow them' : 'Click anyone to follow them'), detail: { w } };
  },
  minorClosedDay() {   // logged minor 10: a closed opening day does not leave the intro staring at the door
    const keep = S.shock;
    try { S.shock = 'closure'; setupRun(); onGymOpened(true); updateIntro(0.1); return { ok: INTRO.phase === 'goal', detail: { phase: INTRO.phase, closed: A.closed } }; }
    finally { S.shock = keep; goOn = false; INTRO.phase = 'off'; hideGoalCard(); clearFollow(); setupRun(); }
  },
  builtGymStartsNew() {   // owner 2026-11-15: a built gym opens as a new business (pre-sale members only, then grows), not an established one; taking over stays established
    try { setupRun(); openIntro(); document.querySelector('#build [data-intro="M"]').click(); document.querySelector('#build [data-istep="pay"]').click(); document.querySelector('#build [data-bact="open"]').click();
      const a = { build: S.build, open: S.monthsOpen, pool: M.pool.length, want: Math.round(M.steady * rampLevel(0)) };
      openIntro(); document.querySelector('#build [data-intro="take"]').click(); const b = { build: S.build, pool: M.pool.length };
      return { ok: a.build === 'new' && a.open === 0 && Math.abs(a.pool - a.want) <= 1 && a.pool < 200 && b.build === 'existing' && b.pool > 900, detail: { a, b } }; }
    finally { goOn = false; INTRO.phase = 'off'; clearFollow(); if (BUILD.on) cancelBuild(); S.hallW = S.hallD = null; S.build = 'existing'; S.monthsOpen = 1; setupRun(); }
  },
  noPillars() {   // owner 2026-11-15: no structural columns in built gyms, and the builder no longer lists them
    const keep = JSON.parse(JSON.stringify(S));
    try { S.hallW = 16; S.hallD = 10; setupRun(); const n = COLUMNS.length; openBuild(); buildPick('M'); const t = document.getElementById('build').textContent;
      return { ok: n === 0 && COLUMNS.length === 0 && !/Structural columns/.test(t), detail: { n, cols: COLUMNS.length } }; }
    finally { if (BUILD.on) cancelBuild(); Object.assign(S, keep); setupRun(); }
  },
  plusNeverRemoves() {   // owner: + on machines jumped, + on platforms went up then fell back; a press adds exactly one or is refused, and never removes anything else
    try { setupRun(); openBuild(); const bad = [];
      for (const size of ['S', 'M', 'L']) { buildPick(size);
        for (const [k] of BUILD_KEYS) { for (let i = 0; i < 6; i++) { const before = { ...BUILD.counts }; buildCount(k, 1);
          const grew = BUILD.counts[k] - before[k], lost = BUILD_KEYS.filter(([q]) => q !== k && BUILD.counts[q] < before[q]).map(([q]) => q);
          if (!(grew === 1 || (grew === 0 && BUILD.full[k])) || lost.length) bad.push({ size, k, i, grew, lost, full: !!BUILD.full[k] }); } } }
      return { ok: !bad.length, detail: bad.slice(0, 6) }; }
    finally { if (BUILD.on) cancelBuild(); }
  },
  turfToggle() {   // owner: the green turf and sled lane matters visually; the player can include it or leave it out
    try { setupRun(); openBuild(); buildPick('M'); const on0 = !!BUILD.kit.turf; buildTurf(false); const off = !BUILD.kit.turf; buildTurf(true); const on1 = !!BUILD.kit.turf;
      BUILD.tab = 'Equipment'; renderBuild(); const row = !!document.querySelector('#build [data-turf]');
      return { ok: on0 && off && on1 && row, detail: { on0, off, on1, row } }; }
    finally { if (BUILD.on) cancelBuild(); }
  },
  tabTitle() { return { ok: document.title === 'gym-sim', detail: { title: document.title } }; },
  digitsEverywhere() {   // owner: a 5 must never read as S or 8 anywhere: digits come from a digits-only face first in every font list
    const fam = (el) => getComputedStyle(el).fontFamily, els = [document.body, document.querySelector('button'), document.getElementById('hudClock')];
    const rule = [...document.styleSheets].some(ss => { try { return [...ss.cssRules].some(r => r instanceof CSSFontFaceRule && /Digits/.test(r.style.fontFamily) && /U\+30-39|U\+0030-0039/i.test(r.style.getPropertyValue('unicode-range'))); } catch (e) { return false; } });
    return { ok: rule && els.every(e => /^"?Digits"?,/.test(fam(e))), detail: { rule, fams: els.map(fam) } };
  },
  startsToday() {   // owner 2026-11-15: the business opens on today's date; the first month is prorated (costs by the day, the loan instalment by the share of the month), then whole months
    const keep = JSON.parse(JSON.stringify(S));
    try { Object.assign(S, { year: 2026, month: 'Nov', startDay: 15 }); setupRun();
      const a = { n: M.cal.length, first: M.cal[0].day, date: A.date, year: BIZ.year }, perDay = fixedPerDay(pnlCosts()), depDay = booksDep('today').dep, b0 = BIZ.balance;
      closeEarlySync('month'); nextMonth(); const m0 = BIZ.months[0], paid = m0.interest + m0.principal;
      const c = { days: m0.days, fixed: m0.pnl.fixed, want: perDay * 16, paid, wantPaid: BIZ.payment * 16 / 30, next: M.cfg.month, nextN: M.cal.length, nextFirst: M.cal[0].day, depDay, wantDep: pnlCosts().depYear / 12 / 30 };
      const ok = a.n === 16 && a.first === 15 && a.date === 15 && a.year === 2026 && c.days === 16 && Math.abs(c.fixed - c.want) < c.want * 0.01 && Math.abs(paid - c.wantPaid) < 1 && c.next === 'Dec' && c.nextN === 31 && c.nextFirst === 1 && Math.abs(depDay - c.wantDep) < 1;
      return { ok, detail: { a, c } }; }
    finally { Object.assign(S, keep); setupRun(); }
  },
  sampleLayoutDump() {   // Plan 11 task 3: the sample gym's stations and obstacles, compared in node with tests/sample_layout.json (taken before the frame refactor)
    const keep = JSON.parse(JSON.stringify(S));
    try { Object.assign(S, { hallW: null, hallD: null }); setupRun(); const K = ['type', 'zone', 'x', 'z', 'yaw', 'acc', 'rest', 'waitBase', 'waitDir', 'hooks', 'dl', 'bar0', 'spot', 'stackAt', 'stackAt2', 'lane', 'sledX'];
      const st = STATIONS.map(s => { const o = {}; for (const k of K) if (s[k] !== undefined) o[k] = s[k]; return o; });
      return { ok: true, detail: JSON.stringify({ st, obst: OBST, db: DBZONE, chalk: CHALK, back: BACKROW }) }; }
    finally { Object.assign(S, keep); setupRun(); }
  },
  rotatedStationsUsable() {   // Plan 11: every kind in every facing the engine may choose: its station spots are walkable and inside its own clear space
    const keep = JSON.parse(JSON.stringify(S)), bad = [];
    try { Object.assign(S, { hallW: 16, hallD: 10 }); setHall(16, 10);
      for (const kind of Object.keys(KINDS)) for (const rot of KINDS[kind].rots) {
        const p = { kind, sx: kind === 'turf' ? 2 : 10, sz: 12, rot, id: 1 }; buildLayout({ ...S, layout: { pieces: [p] }, shock: 'none' });
        const u = useRect(p), X0 = HALL.x0 + u.x0 * SUB - 0.3, X1 = HALL.x0 + u.x1 * SUB + 0.3, Z0 = HALL.zb + u.z0 * SUB - 0.3, Z1 = HALL.zb + u.z1 * SUB + 0.3;
        const want = ['kit'].includes(KINDS[kind].cat) && kind !== 'cable' && kind !== 'pullup' && kind !== 'turf' && kind !== 'mat' ? 0 : 1;   /* a dumbbell rack's stations are the spots beside it */
        if (STATIONS.length < 1) { bad.push({ kind, rot, why: 'no station' }); continue; }
        for (const s of STATIONS) for (const [n, q] of [['acc', s.acc], ['rest', s.rest], ['wait0', waitSpot(s, 0)], ['wait2', waitSpot(s, 2)], ['dl', s.dl], ['spot', s.spot]]) {
          if (!q) continue; const [i, j] = cellOf(q.x, q.z), free = !navBlock[j * NAV.w + i], inside = q.x >= X0 && q.x <= X1 && q.z >= Z0 && q.z <= Z1;
          if (!free || !inside) bad.push({ kind, rot, n, free, inside, q: [+q.x.toFixed(2), +q.z.toFixed(2)], box: [+X0.toFixed(2), +Z0.toFixed(2), +X1.toFixed(2), +Z1.toFixed(2)] }); }
        if (kind === 'turf') { const s = STATIONS.find(t => t.type === 'sled'); if (!s || !(s.lane[0] >= HALL.x0 && s.lane[1] <= HALL.x1)) bad.push({ kind, why: 'lane' }); }
      }
      return { ok: !bad.length, detail: bad.slice(0, 60) }; }
    finally { Object.assign(S, keep); setupRun(); }
  },
  washroomsAtBack() {   // Plan 11: a built gym's washrooms sit in the back corner of the right wall, at least 1.2 m behind the desk, every locker reachable; the sample's stay put
    const keep = JSON.parse(JSON.stringify(S)), out = {};
    try { Object.assign(S, { hallW: null, hallD: null, layout: null }); setupRun(); const sample = { z0: CHG.z0, z1: CHG.z1 };
      for (const [k, w, d] of [['S', 10, 8], ['M', 16, 10], ['L', 20, 16], ['min', 9, 7]]) { const counts = presetCounts(w, d); Object.assign(S, counts, { hallW: w, hallD: d, layout: autoBuild(w, d, counts) }); setupRun();
        const reach = navReach(); out[k] = { back: CHG.z0 >= HALL.zb + 0.15 - 1e-9 && CHG.z0 <= HALL.zb + 0.65 + 1e-9, gap: +(6.15 - CHG.z1).toFixed(2), d, lockers: LOCKERS.every(L => reach(L.x, L.z)), door: reach(CHG_DOOR.x, CHG_DOOR.z) }; }
      for (let d = 7; d <= 18; d++) { Object.assign(S, { hallW: 10, hallD: d, layout: { pieces: [] } }); setupRun(); const reach = navReach(); out['d' + d] = { back: CHG.z0 >= HALL.zb + 0.15 - 1e-9 && CHG.z0 <= HALL.zb + 0.65 + 1e-9, gap: +(6.15 - CHG.z1).toFixed(2), d, lockers: LOCKERS.every(L => reach(L.x, L.z)), door: reach(CHG_DOOR.x, CHG_DOOR.z) }; }   /* every depth: the washroom keeps the sample's alignment to the 0.5 m walking grid */
      const ok = sample.z0 === -2.2 && sample.z1 === 5.2 && Object.values(out).every(o => o.back && o.gap >= (o.d === 7 ? 0.9 : 1.2) && o.lockers && o.door);   /* a 7-cell-deep hall has room for 0.95 m only */
      return { ok, detail: { sample, out } }; }
    finally { Object.assign(S, keep); setupRun(); }
  },
  layoutCancelRestores() {   // Plan 11: the builder edits a copy of the gym's pieces: Cancel leaves the open gym's layout as it was; a language switch keeps the edit
    const keep = JSON.parse(JSON.stringify(S));
    try { const counts = presetCounts(20, 16); Object.assign(S, counts, { hallW: 20, hallD: 16, layout: autoBuild(20, 16, counts) }); setupRun(); const before = JSON.stringify(S.layout);   /* L: room for one more rack */
      openBuild(); buildCount('racks', 1); const added = BUILD.layout.pieces.length; setLang('zh'); const kept = BUILD.layout.pieces.length === added && BUILD.on; setLang('en'); cancelBuild();
      return { ok: JSON.stringify(S.layout) === before && kept && added === JSON.parse(before).pieces.length + 1, detail: { added, kept, same: JSON.stringify(S.layout) === before } }; }
    finally { if (BUILD.on) cancelBuild(); setLang('en'); Object.assign(S, keep); setupRun(); }
  },
  subGridDrawn() {   // owner: a finer sub-grid in lighter lines under the main 1.82 m grid
    try { setupRun(); openBuild(); buildPick('M'); const lines = BUILD_GRID.children.filter(o => o.isLineSegments), main = lines.find(o => o.userData.main), sub = lines.find(o => o.userData.sub);
      return { ok: !!main && !!sub && sub.material.opacity < main.material.opacity && sub.geometry.attributes.position.count > main.geometry.attributes.position.count, detail: { n: lines.length } }; }
    finally { if (BUILD.on) cancelBuild(); }
  },
  minusRemovesLast() {   // Plan 11: − takes away the newest piece of that kind and leaves every other piece where it was
    try { setupRun(); openBuild(); buildPick('L'); buildCount('racks', 1); const last = BUILD.layout.pieces[BUILD.layout.pieces.length - 1], others = JSON.stringify(BUILD.layout.pieces.filter(p => p !== last));
      buildCount('racks', -1); return { ok: last.kind === 'rack' && !BUILD.layout.pieces.includes(last) && JSON.stringify(BUILD.layout.pieces) === others, detail: { last: last && last.kind } }; }
    finally { if (BUILD.on) cancelBuild(); }
  },
  openGymUsesLayout() {   // Plan 11: an opened gym is laid out from the builder's pieces and charged for exactly them
    const keep = JSON.parse(JSON.stringify(S));
    try { setupRun(); openBuild(); buildPick('M'); const want = JSON.stringify(BUILD.layout), cost = layoutCost(BUILD.layout); openGym();
      return { ok: JSON.stringify(S.layout) === want && BUILT.equipment === cost && STATIONS.filter(s => s.type === 'rack').length === BUILD.layout.pieces.filter(p => p.kind === 'rack').length, detail: { cost, eq: BUILT && BUILT.equipment } }; }
    finally { goOn = false; INTRO.phase = 'off'; Object.assign(S, keep); setupRun(); }
  },
  setupAfterMonths() {   // review I1: a new business started after the months moved on opens on the 1st of the current month and year, not on the boot day of the boot year
    const keep = JSON.parse(JSON.stringify(S));
    try { Object.assign(S, { year: 2026, month: 'Nov', startDay: 15 }); setupRun(); closeEarlySync('month'); nextMonth(); closeEarlySync('month'); nextMonth(); setupRun();
      return { ok: M.cfg.month === 'Jan' && BIZ.year === 2027 && M.cal[0].day === 1 && M.cal.length === 31, detail: { month: M.cfg.month, year: BIZ.year, first: M.cal[0].day, n: M.cal.length } }; }
    finally { Object.assign(S, keep); setupRun(); }
  },
  yearViewProrated() {   // review I2: the year view and the projected month take the short first month's share of depreciation and interest, as the closed books do
    const keep = JSON.parse(JSON.stringify(S));
    try { Object.assign(S, { year: 2026, month: 'Nov', startDay: 15 }); setupRun(); const c = pnlCosts(), frac = 16 / 30, pm = projectMonth().total;
      const wantCur = belowEbitda(pm.ebitda, { ...c, depYear: c.depYear * frac }, BIZ.balance * BIZ.rate / 1200 * frac).netProfit;
      BOOKS.period = 'year'; openBooks('Books'); updateBooks(true); const num = (t) => (t.trim().startsWith('−') ? -1 : 1) * +t.replace(/[^0-9.]/g, ''), cur = num(document.querySelector('#bkBody tr[data-cur] td:nth-child(4)').textContent); closeBooks();
      closeEarlySync('month'); nextMonth(); const m = BIZ.months[0], wantArch = belowEbitda(m.pnl.ebitda, { ...pnlCosts(), depYear: pnlCosts().depYear * frac }, m.interest).netProfit;
      BOOKS.period = 'year'; openBooks('Books'); updateBooks(true); const arch = num(document.querySelector('#bkBody tr[data-arch="0"] td:nth-child(4)').textContent);
      return { ok: Math.abs(cur - wantCur) <= 1 && Math.abs(arch - wantArch) <= 1, detail: { cur, wantCur: Math.round(wantCur), arch, wantArch: Math.round(wantArch) } }; }
    finally { closeBooks(); BOOKS.period = 'today'; BOOKS.tab = 'Today'; Object.assign(S, keep); setupRun(); }
  },
  equipTabMatchesCost() {   // review I3: the Equipment tab's total is what the gym is charged, on every preset
    const out = {};
    try { setupRun(); openBuild(); for (const k of ['S', 'M', 'L']) { buildPick(k); BUILD.tab = 'Equipment'; renderBuild(); const t = document.querySelector('#build table.beq tr.sum td.n:last-child').textContent; out[k] = { tab: t, cost: moneyK(buildCostNow().equipment) }; }
      return { ok: Object.values(out).every(o => o.tab === o.cost), detail: out }; }
    finally { if (BUILD.on) cancelBuild(); }
  },
  queueSpotsFree() {   // review I4: in packed layouts every station's spots and its first three queue spots stand on walkable floor
    const keep = JSON.parse(JSON.stringify(S)), bad = [];
    try { for (const [w, d] of [[10, 8], [16, 10], [20, 16], [24, 18], [10, 9], [13, 8], [12, 17], [9, 7], [8, 8]]) { const counts = presetCounts(w, d); Object.assign(S, counts, { hallW: w, hallD: d, layout: autoBuild(w, d, counts) }); setupRun();
        for (const s of STATIONS) for (const [n, q] of [['acc', s.acc], ['rest', s.rest], ['w0', waitSpot(s, 0)], ['w1', waitSpot(s, 1)], ['w2', waitSpot(s, 2)]]) { const [i, j] = cellOf(q.x, q.z); if (navBlock[j * NAV.w + i]) bad.push(`${w}x${d} ${s.type} ${n} @${q.x.toFixed(2)},${q.z.toFixed(2)} st ${s.x.toFixed(2)},${s.z.toFixed(2)} yaw ${s.yaw.toFixed(2)}`); } }
      return { ok: !bad.length, detail: { n: bad.length, bad: bad.slice(0, 10) } }; }
    finally { Object.assign(S, keep); setupRun(); }
  },
  canvasDigits() {   // review I5: digits on the boards and plots come from the Digits face too
    try { setupRun(); drawWhiteboard(1); drawPRBoard(); drawPlots(); const fonts = [WB.ctx.font, PRB.ctx.font, document.getElementById('pOcc').getContext('2d').font];
      return { ok: fonts.every(f => /Digits/.test(f)), detail: fonts }; }
    catch (e) { return { ok: false, detail: String(e) }; }
  },
  turfSwitchMakesRoom() {   // owner 2026-11-15: turning turf In where it does not fit re-plans with the turf placed early and says what no longer fits; Out gives the equipment back
    try { setupRun(); openBuild(); buildPick('S'); const before = { ...BUILD.counts }, none = !BUILD.kit.turf; document.getElementById('toast').innerHTML = '';
      buildTurf(true); const inn = !!BUILD.kit.turf, lost = BUILD_KEYS.some(([k]) => BUILD.counts[k] < before[k]), said = /no longer fit/.test(document.getElementById('toast').textContent);
      buildTurf(false); const out = !BUILD.kit.turf && BUILD_KEYS.every(([k]) => BUILD.counts[k] === before[k]);
      return { ok: none && inn && lost && said && out, detail: { none, inn, lost, said, out, before, after: { ...BUILD.counts } } }; }
    finally { if (BUILD.on) cancelBuild(); }
  },
  rearrangeMoney() {   // Plan 12: a rearrange pays movers through today's P&L, buys as capex from cash, sells at 40% with the loss against book value below EBITDA
    const keep = JSON.parse(JSON.stringify(S));
    try { const counts = presetCounts(16, 10); Object.assign(S, counts, { hallW: 16, hallD: 10, layout: autoBuild(16, 10, counts) }); setupRun(); fastForward(12 * 3600 - A.t);
      const L2 = JSON.parse(JSON.stringify(S.layout)), rack = L2.pieces.find(p => p.kind === 'rack'); L2.pieces = L2.pieces.filter(p => p !== rack); const bench = addPiece(L2, 'bench', 16, 10);
      const cash0 = BIZ.cash, capex0 = COSTS.capex, dep0 = COSTS.depYear;
      applyRearrange({ layout: L2, movers: 6000, bought: [bench], sold: [rack], days: 1 });
      const got = { cash: BIZ.cash - cash0, capex: COSTS.capex - capex0, dep: Math.round(COSTS.depYear - dep0), movers: A.pnl.rearrange, loss: BIZ.mLoss, bought: bench.bought, closedTomorrow: !!M.cal[M.dayI + 1].rearrange };
      const want = { cash: -20000 + 48000, capex: 20000, dep: Math.round(20000 / 5 - 120000 / 5), movers: 6000, loss: 72000, bought: BIZ.monthIndex, closedTomorrow: true };
      return { ok: JSON.stringify(got) === JSON.stringify(want), detail: { got, want } }; }
    finally { Object.assign(S, keep); setupRun(); }
  },
  rearrangeAcrossMonth() {   // Plan 12: three closed days from the second-to-last day close the month's last day and the next month's first two; the new layout opens on day 3
    const keep = JSON.parse(JSON.stringify(S));
    try { const counts = presetCounts(16, 10); Object.assign(S, counts, { hallW: 16, hallD: 10, layout: autoBuild(16, 10, counts) }); setupRun(); skimDays(M.cal.length - 1);
      const L2 = JSON.parse(JSON.stringify(S.layout)), mat = L2.pieces.find(p => p.kind === 'mat'); L2.pieces = L2.pieces.filter(p => p !== mat); const mats0 = STATIONS.filter(s => s.type === 'mat').length;
      applyRearrange({ layout: L2, movers: 0, bought: [], sold: [mat], days: 3 }); const lastClosed = !!M.cal[M.cal.length - 1].rearrange, todayOpen = !M.cal[M.dayI].rearrange;
      nextDay(); nextMonth(); const a = [0, 1, 2].map(i => !!M.cal[i].rearrange), still = STATIONS.filter(s => s.type === 'mat').length;
      nextDay(); nextDay(); const after = STATIONS.filter(s => s.type === 'mat').length;
      const ok = lastClosed && todayOpen && a[0] && a[1] && !a[2] && still === mats0 && after === mats0 - 1 && !BIZ.pending;
      return { ok, detail: { lastClosed, todayOpen, a, mats0, still, after, pending: !!BIZ.pending } }; }
    finally { Object.assign(S, keep); setupRun(); }
  },
  rearrangeZeroDays() {   // Plan 12: light moves close nothing: today keeps its layout, tomorrow opens with the new one
    const keep = JSON.parse(JSON.stringify(S));
    try { const counts = presetCounts(16, 10); Object.assign(S, counts, { hallW: 16, hallD: 10, layout: autoBuild(16, 10, counts) }); setupRun();
      const L2 = JSON.parse(JSON.stringify(S.layout)), mat = L2.pieces.find(p => p.kind === 'mat'); L2.pieces = L2.pieces.filter(p => p !== mat); const n0 = STATIONS.filter(s => s.type === 'mat').length;
      applyRearrange({ layout: L2, movers: 0, bought: [], sold: [mat], days: 0 }); const today = STATIONS.filter(s => s.type === 'mat').length; nextDay(); const tomorrow = STATIONS.filter(s => s.type === 'mat').length;
      return { ok: today === n0 && tomorrow === n0 - 1 && !A.closed, detail: { n0, today, tomorrow, closed: A.closed } }; }
    finally { Object.assign(S, keep); setupRun(); }
  },
  rearrangeOpens() {   // Plan 12: Rearrange pauses the day and opens a sheet with a zero quote
    const keep = JSON.parse(JSON.stringify(S));
    try { const counts = presetCounts(16, 10); Object.assign(S, counts, { hallW: 16, hallD: 10, layout: autoBuild(16, 10, counts) }); setupRun(); goOn = true; const ok0 = openRearrange(), t = document.getElementById('build').textContent;
      return { ok: ok0 && BUILD.on && BUILD.mode === 'rearrange' && !goOn && /Rearrange/.test(t) && /\$0/.test(t) && /none/.test(t), detail: { ok0, mode: BUILD.mode, t: t.slice(0, 200) } }; }
    finally { if (BUILD.on) cancelBuild(); goOn = false; Object.assign(S, keep); setupRun(); }
  },
  rearrangeCancel() {   // Review focus 3: Cancel after edits leaves the gym, cash and capex untouched
    const keep = JSON.parse(JSON.stringify(S));
    try { const counts = presetCounts(20, 16); Object.assign(S, counts, { hallW: 20, hallD: 16, layout: autoBuild(20, 16, counts) }); setupRun(); const L0 = JSON.stringify(S.layout), cash = BIZ.cash, capex = COSTS.capex;
      openRearrange(); rearrangeAdd('bench'); rearrangeSell(BUILD.layout.pieces.find(p => p.kind === 'rack').id); cancelBuild();
      return { ok: JSON.stringify(S.layout) === L0 && BIZ.cash === cash && COSTS.capex === capex && !BIZ.pending && !BUILD.on, detail: { same: JSON.stringify(S.layout) === L0, cash: BIZ.cash - cash } }; }
    finally { if (BUILD.on) cancelBuild(); Object.assign(S, keep); setupRun(); }
  },
  dropRefused() {   // Review focus 4: a drop on the washrooms, the desk or outside the hall is refused with a toast
    const keep = JSON.parse(JSON.stringify(S));
    try { const counts = presetCounts(16, 10); Object.assign(S, counts, { hallW: 16, hallD: 10, layout: autoBuild(16, 10, counts) }); setupRun(); openRearrange(); const F = fixedRooms(16, 10), id = BUILD.layout.pieces.find(p => p.kind === 'bench').id, L0 = JSON.stringify(BUILD.layout);
      const mid = (r) => [Math.floor((r.x0 + r.x1) / 2), Math.floor((r.z0 + r.z1) / 2)]; document.getElementById('toast').innerHTML = '';
      const a = rearrangeDrop(id, ...mid(F.washroom)), b = rearrangeDrop(id, ...mid(F.desk)), c = rearrangeDrop(id, -10, 5), said = /can't go there/.test(document.getElementById('toast').textContent);
      return { ok: !a && !b && !c && said && JSON.stringify(BUILD.layout) === L0, detail: { a, b, c, said } }; }
    finally { if (BUILD.on) cancelBuild(); Object.assign(S, keep); setupRun(); }
  },
  rearrangeApply() {   // Plan 12: a heavy move + Apply: movers on today's P&L, one closed day from tomorrow, the new layout waits; the toast names the cost and the days
    const keep = JSON.parse(JSON.stringify(S));
    try { const counts = presetCounts(20, 16); Object.assign(S, counts, { hallW: 20, hallD: 16, layout: autoBuild(20, 16, counts) }); setupRun(); const L0 = JSON.stringify(S.layout); openRearrange();
      const p = BUILD.layout.pieces.find(q => q.kind === 'pulldown'); let moved = false; for (let z = 4; z < 60 && !moved; z += 2) for (let x = 4; x < 70 && !moved; x += 2) { const was = [p.sx, p.sz, p.rot].join(); if (rearrangeDrop(p.id, x, z) && [p.sx, p.sz, p.rot].join() !== was) moved = true; }
      document.getElementById('toast').innerHTML = ''; rearrangeApply(); const t = document.getElementById('toast').textContent;
      return { ok: moved && !BUILD.on && !!BIZ.pending && !!M.cal[M.dayI + 1].rearrange && JSON.stringify(S.layout) === L0 && A.pnl.rearrange === 3000 && /Closed for 1 day/.test(t) && /\$3,000/.test(t), detail: { moved, pending: !!BIZ.pending, t } }; }
    finally { if (BUILD.on) cancelBuild(); Object.assign(S, keep); setupRun(); }
  },
  rearrangeGuards() {   // Plan 12: no Rearrange during an early close or while one is already booked
    const keep = JSON.parse(JSON.stringify(S));
    try { const counts = presetCounts(16, 10); Object.assign(S, counts, { hallW: 16, hallD: 10, layout: autoBuild(16, 10, counts) }); setupRun(); closing = { kind: 'day' }; const a = openRearrange(); closing = null;
      BIZ.pending = JSON.parse(JSON.stringify(S.layout)); const b = openRearrange(); BIZ.pending = null;
      return { ok: a === false && b === false && !BUILD.on, detail: { a, b } }; }
    finally { closing = null; if (BUILD.on) cancelBuild(); Object.assign(S, keep); setupRun(); }
  },
  booksRearrangeLines() {   // Plan 12: the books show the movers, the loss on equipment sold, purchases and sales in the bank, and a closed-for-rearranging day; opening cash stays put
    const keep = JSON.parse(JSON.stringify(S));
    try { const counts = presetCounts(20, 16); Object.assign(S, counts, { hallW: 20, hallD: 16, layout: autoBuild(20, 16, counts) }); setupRun(); fastForward(12 * 3600 - A.t); const open0 = BIZ.openCash;
      openRearrange(); const p = BUILD.layout.pieces.find(q => q.kind === 'pulldown'); let moved = false; for (let z = 4; z < 60 && !moved; z += 2) for (let x = 4; x < 70 && !moved; x += 2) { const was = [p.sx, p.sz, p.rot].join(); if (rearrangeDrop(p.id, x, z) && [p.sx, p.sz, p.rot].join() !== was) moved = true; }
      rearrangeAdd('bench'); rearrangeSell(BUILD.layout.pieces.find(q => q.kind === 'rack').id); rearrangeApply();
      BOOKS.period = 'mtd'; openBooks('Books'); updateBooks(true); const pl = document.getElementById('bkBody').textContent; openBooks('Bank'); updateBooks(true); const bank = document.getElementById('bkBody').textContent;
      const openCell = document.querySelector('#bkBody [data-k="openCash"]'); closeBooks(); nextDay(); openBooks('Today'); updateBooks(true); const today = document.getElementById('bkBody').textContent; closeBooks(); updateMonitors(); const hud = document.getElementById('hudClock').textContent;
      const ok = moved && /Rearranging \(movers\)/.test(pl) && /Loss on equipment sold/.test(pl) && /Equipment bought/.test(bank) && /Equipment sold/.test(bank) && !!openCell && openCell.textContent.includes(Math.abs(Math.round(open0)).toLocaleString('en-US')) && /Closed today for rearranging/.test(today) && /rearranging/.test(hud);
      return { ok, detail: { moved, pl: /Rearranging/.test(pl), loss: /Loss on equipment sold/.test(pl), bank: /Equipment bought/.test(bank), open: openCell && openCell.textContent, open0, today: today.slice(0, 120), hud } }; }
    finally { closeBooks(); BOOKS.tab = 'Today'; BOOKS.period = 'today'; if (BUILD.on) cancelBuild(); Object.assign(S, keep); setupRun(); }
  },
  sampleUntouchedUntilRearrange() {   // Plan 12: opening Rearrange in the sample gym and cancelling leaves the sample exactly as it was
    try { setupRun(); const n = STATIONS.length, ok0 = openRearrange(), t = document.getElementById('build').textContent, conv = /converted to grid pieces/.test(t); cancelBuild();
      return { ok: ok0 && conv && S.hallW === null && HALL.w === null && STATIONS.length === n, detail: { ok0, conv, hallW: S.hallW, n, now: STATIONS.length } }; }
    finally { if (BUILD.on) cancelBuild(); setupRun(); }
  },
  sampleConvertsOnce() {   // Plan 12: Apply in the sample converts it to grid pieces when it reopens; the business carries on (same money record, same month, rent area kept)
    const keep = JSON.parse(JSON.stringify(S));
    try { setupRun(); const biz = BIZ, month = M.cfg.month, area = S.area; openRearrange();
      const p = BUILD.layout.pieces.find(q => q.kind === 'pulldown'); let moved = false; for (let z = 4; z < 40 && !moved; z += 2) for (let x = 4; x < 60 && !moved; x += 2) { const was = [p.sx, p.sz, p.rot].join(); if (rearrangeDrop(p.id, x, z) && [p.sx, p.sz, p.rot].join() !== was) moved = true; }
      rearrangeApply(); const todaySample = S.hallW === null && HALL.w === null; nextDay(); nextDay();
      const ok = moved && todaySample && S.hallW === 16 && HALL.w === 16 && !!S.layout && BIZ === biz && M.cfg.month === month && S.area === area && STATIONS.some(s => s.type === 'rack') && !BIZ.pending;
      return { ok, detail: { moved, todaySample, hallW: S.hallW, same: BIZ === biz, area: S.area } }; }
    finally { if (BUILD.on) cancelBuild(); Object.assign(S, keep); S.hallW = S.hallD = null; S.layout = null; setupRun(); }
  },
  sampleSetupKeepsDeal() {   // owner 2026-11-15 (review I3, option B): Setup after the sample was converted keeps the sample deal (rent area, no fit-out, deposit or rent-free month) and its pieces
    const keep = JSON.parse(JSON.stringify(S));
    try { setupRun(); const area = S.area, capex = COSTS.capex, dep = COSTS.depYear; openRearrange();
      const p = BUILD.layout.pieces.find(q => q.kind === 'pulldown'); let moved = false; for (let z = 4; z < 40 && !moved; z += 2) for (let x = 4; x < 60 && !moved; x += 2) { const was = [p.sx, p.sz, p.rot].join(); if (rearrangeDrop(p.id, x, z) && [p.sx, p.sz, p.rot].join() !== was) moved = true; }
      rearrangeApply(); nextDay(); nextDay(); const conv = S.hallW === 16 && !!S.layout; setupRun();
      const ok = moved && conv && S.hallW === 16 && !!S.layout && S.area === area && BUILT === null && BIZ.deposit === 0 && COSTS.capex === capex && Math.abs(COSTS.depYear - dep) < 1 && BIZ.cash === S.finOwn + S.finLoan - capex && pnlCosts().rentRate === S.rentRate;
      return { ok, detail: { moved, conv, hallW: S.hallW, area: S.area, area0: area, built: !!BUILT, deposit: BIZ.deposit, capex: COSTS.capex, capex0: capex, dep: COSTS.depYear, dep0: dep } }; }
    finally { if (BUILD.on) cancelBuild(); Object.assign(S, keep); S.hallW = S.hallD = null; S.layout = null; S.sampleGrid = false; setupRun(); }
  },
  escDuringDrag() {   // review C1: Escape (or a cancel) in the middle of a drag leaves the running gym exactly as it was, built or sample
    const keep = JSON.parse(JSON.stringify(S)), out = {};
    try { for (const k of ['built', 'sample']) { if (k === 'built') { const counts = presetCounts(16, 10); Object.assign(S, counts, { hallW: 16, hallD: 10, layout: autoBuild(16, 10, counts) }); } else Object.assign(S, keep, { hallW: null, hallD: null, layout: null });
        setupRun(); const n = STATIONS.length, eq = EQUIP, hw = HALL.w; openRearrange(); RDRAG.id = BUILD.layout.pieces[0].id; RDRAG.moved = true; RDRAG.at = { x: 0, y: 0 };
        const id = RDRAG.id, f = footprint(BUILD.layout.pieces[0]); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); rUp(200, 200); rMove(220, 220); rearrangeDrop(id, f.x0 + 1, f.z0 + 1);   /* the release after Escape: what rUp would call on a floor hit */
        out[k] = { same: STATIONS.length === n && EQUIP === eq && HALL.w === hw, cleared: RDRAG.id == null, ghost: !RGHOST.visible }; }
      return { ok: Object.values(out).every(o => o.same && o.cleared && o.ghost), detail: out }; }
    finally { RDRAG.id = null; if (BUILD.on) cancelBuild(); Object.assign(S, keep); setupRun(); }
  },
  setupClearsBought() {   // review I1: a new business starts with every piece bought at opening
    const keep = JSON.parse(JSON.stringify(S));
    try { const counts = presetCounts(16, 10), L = autoBuild(16, 10, counts); for (const p of L.pieces) p.bought = 3; Object.assign(S, counts, { hallW: 16, hallD: 10, layout: L }); setupRun();
      return { ok: S.layout.pieces.every(p => p.bought == null) && bookValue({ kind: 'rack', bought: 5 }, 0) === 120000, detail: { left: S.layout.pieces.filter(p => p.bought != null).length, bv: bookValue({ kind: 'rack', bought: 5 }, 0) } }; }
    finally { Object.assign(S, keep); setupRun(); }
  },
  archivedBooksFixed() {   // review I2: a purchase or sale this month leaves closed months' books exactly as booked
    const keep = JSON.parse(JSON.stringify(S));
    try { const counts = presetCounts(20, 16); Object.assign(S, counts, { hallW: 20, hallD: 16, layout: autoBuild(20, 16, counts) }); setupRun(); closeEarlySync('month'); nextMonth();
      const read = () => { BOOKS.period = 'year'; openBooks('Books'); updateBooks(true); const y = document.querySelector('#bkBody tr[data-arch="0"] td:nth-child(4)').textContent; BOOKS.period = 'arch:0'; updateBooks(true); const m = document.querySelector('#bkBody [data-k="netProfit"]').textContent; closeBooks(); return y + '|' + m; };
      const before = read(), L2 = JSON.parse(JSON.stringify(S.layout)), r = addPiece(L2, 'rack', 20, 16); applyRearrange({ layout: L2, movers: 0, bought: r ? [r] : [], sold: [], days: 1 }); const after = read();
      return { ok: !!r && before === after, detail: { before, after, r: !!r } }; }
    finally { closeBooks(); BOOKS.period = 'today'; BOOKS.tab = 'Today'; Object.assign(S, keep); setupRun(); }
  },
  closeStuckAgent() {   // Plan 7 review I4: a member who never leaves cannot hang a close
    try { setupRun(); fastForward(12 * 3600 - A.t); const m = A.members.find(a => a.visible && a.state !== 'gone' && a.state !== 'pending'); m.state = 'stuckForTest';
      const r = closeEarlySync('day'); return { ok: A.done && r.days === 1 && m.state === 'gone', detail: { done: A.done, r, state: m.state } }; }
    finally {}
  },
  lockersReachable() {   // Plan 7b: every locker is connected to the entrance on the navigation grid (findPath always answers, even for a walled-off target, so flood-fill instead)
    setupRun(); const W = NAV.w, seen = new Uint8Array(W * NAV.h), [si, sj] = nearestFree(...cellOf(DOOR_IN.x, DOOR_IN.z)), q = [sj * W + si]; seen[q[0]] = 1;
    for (let h = 0; h < q.length; h++) { const n = q[h], ni = n % W, nj = (n / W) | 0;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) { const a = ni + di, b = nj + dj; if (a < 0 || b < 0 || a >= W || b >= NAV.h) continue; const m = b * W + a;
        if (seen[m] || navBlock[m] || (di && dj && (navBlock[nj * W + a] || navBlock[b * W + ni]))) continue; seen[m] = 1; q.push(m); } }
    const bad = []; for (const [name, list] of [['M', LOCKERS_M], ['F', LOCKERS_F]]) list.forEach((L, k) => { const [i2, j2] = cellOf(L.x, L.z); if (!seen[j2 * W + i2]) bad.push(name + k); });
    return { ok: !bad.length, detail: bad };
  },
  monthTotals() {   // month to date = completed days + today so far
    runDay({ day: 5 }); const pm = projectMonth(), sum = (k) => M.days.reduce((t, d) => t + d.pnl[k], 0) + A.pnl[k];
    const ok = Math.abs(pm.mtd.ebitda - sum('ebitda')) < 1e-6 && Math.abs(pm.mtd.gross - sum('gross')) < 1e-6 && Math.abs(pm.total.ebitda - pm.mtd.ebitda - pm.rest.ebitda) < 1e-6;
    return { ok, detail: { mtd: pm.mtd.ebitda, sum: sum('ebitda'), rest: pm.rest.ebitda, total: pm.total.ebitda } };
  },
  monthEnds() {   // the last day of June is day 30; there is no day 31
    const keep = JSON.parse(JSON.stringify(S));
    try { skimDays(30, true); fastForward(30 * 3600); const last = M.dayI, more = nextDay(); return { ok: last === 29 && more === false && M.dayI === 29 && monthComplete(), detail: { last, more, dayI: M.dayI } }; }
    finally { Object.assign(S, keep); }
  },
  setupResetsMonth() {   // Setup on day 12 starts a fresh month
    const keep = JSON.parse(JSON.stringify(S));
    try { skimDays(12, true); const before = M; setupRun(); const fresh = M !== before && M.pool.every(m => !m.isNew) && M.lapsed.length === 0;
      return { ok: M.dayI === 0 && M.days.length === 0 && M.joinedTotal === 0 && A.dayI === 0 && fresh, detail: { dayI: M.dayI, days: M.days.length, fresh } }; }
    finally { Object.assign(S, keep); }
  },
  monthPanel() {   // month block, members and day label, in both languages
    runDay({ day: 1 }); const was = zh() ? 'zh' : 'en', out = {};
    const check = (lang) => {
      setLang(lang); updateMonitors();   // Plan 6: month block and members in the books; the day label stays in the panel
      const dl = document.getElementById('dayLbl'); if (!dl) return { ok: false, why: 'no day label' };
      const want = money(projectMonth().total.ebitda), cell = bkCell('Books', 'ebitda', 'month'); BOOKS.period = 'today';
      openBooks('Members'); const mb = document.getElementById('bkBody').textContent; closeBooks();
      return { ok: !/NaN|undefined/.test(mb) && dl.textContent.includes('2/30') && cell === want, day: dl.textContent, cell, want };
    };
    try { out.en = check('en'); out.zh = check('zh'); } finally { setLang(was); }
    return { ok: out.en.ok && out.zh.ok, detail: out };
  },
  goldenMonth() {   // regression pin for a whole month (seed 20261112, June 2027), plus the day-1 projection against the outcome
    const keep = JSON.parse(JSON.stringify(S));
    try {
      S.seed = 20261112; setupRun(); fastForward(30 * 3600); const proj = projectMonth().total.ebitda;
      while (nextDay()) fastForward(30 * 3600);
      const real = M.days.reduce((t, d) => t + d.pnl.ebitda, 0) + A.pnl.ebitda, visits = M.days.reduce((t, d) => t + d.visits, 0) + A.visits;
      const got = { actives: M.pool.length, visits, ebitda: Math.round(real) }, want = { actives: 972, visits: 5724, ebitda: 121198 };   // re-pinned after the two washrooms changed walking times (Plan 7b)
      const net = M.days.reduce((t, d) => t + d.pnl.net, 0) + A.pnl.net, projOk = Math.abs(proj - real) / net <= 0.08;   // EBITDA is a small difference of large numbers: judge the projection against net sales
      return { ok: projOk && JSON.stringify(got) === JSON.stringify(want), detail: { got, want, proj: Math.round(proj), real: Math.round(real), net: Math.round(net) } };
    } finally { Object.assign(S, keep); }
  },
  ptMonth() {   // a month of PT: about 130 sessions (P5.2) and about 22 clients at the end (P5.10); one seed is noisy, so judge the mean of three
    const r = [];
    for (const sd of [1, 2, 3]) { runDay({ seed: sd, day: 29 }); r.push({ sessions: M.days.reduce((t, d) => t + (d.ptSessions || 0), 0) + A.ptSessions, clients: M.pool.filter(m => m.pt).length }); }
    const m = (k) => r.reduce((t, x) => t + x[k], 0) / r.length;
    return { ok: m('sessions') >= 91 && m('sessions') <= 169 && m('clients') >= 14 && m('clients') <= 30, detail: { sessions: m('sessions'), clients: m('clients'), r } };
  },
  deferredConsistent() {   // the prepaid balance is exactly the value of sessions clients still hold
    runDay({ day: 3 }); return { ok: Math.abs(A.deferred - owedNow()) < 1e-6, detail: { deferred: A.deferred, owed: owedNow() } };
  },
  perClientPrice() {   // each session is earned at the price per session of that client's own pack
    const r = runDay({}), prices = A.ptPrices || [];
    const ok = prices.length === r.ptSessions && prices.every(p => [13520 / 8, 25440 / 16, 35760 / 24].some(q => Math.abs(p - q) < 1e-9)) && Math.abs(r.pnl.ptEarned - prices.reduce((a, b) => a + b, 0)) < 1e-6;
    return { ok, detail: { sessions: r.ptSessions, prices: prices.slice(0, 6), earned: r.pnl.ptEarned } };
  },
  poolVisits() {   // day 0 is Tuesday 1 June 2027: visits sampled from the pool average about 209
    const v = []; for (let s = 1; s <= 5; s++) v.push(runDay({ seed: s }).visits);
    const mean = v.reduce((a, b) => a + b, 0) / v.length;
    return { ok: mean >= 188 && mean <= 230, detail: { mean, v } };
  },
  monthDeterminism() {
    const a = runDay({ seed: 9, day: 3 }), b = runDay({ seed: 9, day: 3 });
    return { ok: JSON.stringify(a) === JSON.stringify(b) && A.dayI === 3, detail: { a: a.visits, b: b.visits, dayI: A.dayI } };
  },
  memberPersists() {   // a member who comes on day 0 and day 1 is the same person both days
    runDay({ day: 1 });
    const both = M.pool.filter(m => m.visits.includes(0) && m.visits.includes(1));
    const today = new Map(A.members.map(a => [a.rec, a]));
    const ok = both.length > 0 && both.every(m => today.has(m) && today.get(m).name === m.name && today.get(m).look === m.look);
    return { ok, detail: { both: both.length } };
  },
  extremes() {
    const lo = runDay({ peak: 15 }), hi = runDay({ peak: 60 });
    const sane = (r) => r.stuck === 0 && r.visits === r.gone && Number.isFinite(r.avgOcc);
    return { ok: sane(lo) && sane(hi) && hi.visits > 3.5 * lo.visits, detail: { lo: [lo.visits, lo.stuck], hi: [hi.visits, hi.stuck] } };
  },
  ptVolume() {
    const rs = []; for (let s = 1; s <= 20; s++) rs.push(runDay({ seed: s }));
    const m = (k) => rs.reduce((t, r) => t + r[k], 0) / rs.length, d = { coached: m('coached'), pt: m('pt'), rent: m('rent') };
    return { ok: d.coached >= 4 && d.coached <= 9 && d.pt >= 3000 && d.pt <= 11000 && d.rent >= 250 && d.rent <= 1200, detail: d };
  },
  noCoach() { const r = runDay({ ptClients: 0, outsideClients: 0 }); return { ok: r.pt === 0 && r.rent === 0 && r.stuck === 0 && r.coached === 0, detail: { pt: r.pt, rent: r.rent, coached: r.coached } }; },
  pnlBaseDay() {
    const r = runDay({}), inHouse = A.members.filter(a => a.coach && !a.coach.outside && a.paid).length;
    const ok = !!r.pnl && Number.isFinite(r.pnl.ebitda) && r.ptSessions === inHouse && Math.abs(r.deferred - owedNow()) < 1e-6;
    return { ok, detail: { ebitda: r.pnl && r.pnl.ebitda, ptSessions: r.ptSessions, inHouse, deferred: r.deferred } };
  },
  pnlCashVsEarned() {   // earned PT revenue is smoother than PT cash
    const e = [], c = []; for (let s = 1; s <= 20; s++) { const r = runDay({ seed: s }); e.push(r.pnl ? r.pnl.ptEarned : NaN); c.push(r.pt); }
    const sd = (x) => { const m = x.reduce((a, b) => a + b, 0) / x.length; return Math.sqrt(x.reduce((a, b) => a + (b - m) ** 2, 0) / x.length); };
    return { ok: sd(e) < sd(c) / 2, detail: { sdEarned: sd(e), sdCash: sd(c) } };
  },
  pnlLive() {
    const keep = JSON.parse(JSON.stringify(S));
    try { setupRun(); fastForward(15.5 * 3600 - A.t); const want = fixedPerDay() * dayFraction(A.t, A.open, T_CLOSE); return { ok: !!A.pnl && Math.abs(A.pnl.fixed - want) < 1, detail: { got: A.pnl && A.pnl.fixed, want } }; }
    finally { Object.assign(S, keep); }
  },
  pnlNoCoach() { const r = runDay({ ptClients: 0, outsideClients: 0 }); return { ok: !!r.pnl && r.pnl.ptEarned === 0 && r.pnl.coach === 0 && Number.isFinite(r.pnl.ebitda), detail: r.pnl }; },
  pnlResetOnSetup() {   // Setup mid-day starts a clean ledger: zero sessions, opening balance owed, table shows zero gross
    const keep = JSON.parse(JSON.stringify(S));
    try {
      setupRun(); fastForward(18 * 3600 - A.t); setupRun(); updateMonitors();
      const cell = bkCell('Books', 'gross', 'today');   // Plan 6: read from the books
      const ok = !!A.pnl && A.pnl.gross === 0 && A.pnl.fixed === 0 && A.ptSessions === 0 && Math.abs(A.deferred - owedNow()) < 1e-6 && M.dayI === 0 && cell === money(0);
      return { ok, detail: { pnl: !!A.pnl, ptSessions: A.ptSessions, deferred: A.deferred, cell } };
    } finally { Object.assign(S, keep); }
  },
  pnlPanel() {
    runDay({}); const was = zh() ? 'zh' : 'en', out = {};
    const check = (lang) => {
      setLang(lang); BOOKS.period = 'today'; openBooks('Books');   // Plan 6: the day's P&L in the books
      const t = document.getElementById('bkBody'), rows = t.querySelectorAll('[data-k]').length, txt = t.textContent, cell = (t.querySelector('[data-k="ebitda"]') || {}).textContent; closeBooks();
      return { ok: rows >= 41 && !/NaN|undefined/.test(txt) && cell === money(A.pnl.ebitda), rows, cell };
    };
    try { out.en = check('en'); out.zh = check('zh'); } finally { setLang(was); }
    return { ok: out.en.ok && out.zh.ok, detail: out };
  },
  pnlResultsText() {
    runDay({}); const was = zh() ? 'zh' : 'en';
    try { setLang('en'); const en = resultsText(); setLang('zh'); const z = resultsText(); return { ok: en.includes('EBITDA') && z.includes('EBITDA') && !/NaN/.test(en + z), detail: { en: en.split('\n').pop(), zh: z.split('\n').pop() } }; }
    finally { setLang(was); }
  },
  pnlRentSlider() {   // moving the rent slider by NT$100/坪 drops today's EBITDA cell by 115 x 100 / 30.4
    const keep = JSON.parse(JSON.stringify(S));
    try {   // Plan 6: the rent slider lives in the Facility tab; the EBITDA cell in the Books tab
      runDay({}); updateMonitors(); const before = bkNum(bkCell('Books', 'ebitda', 'today', true));
      openBooks('Facility'); const inp = document.getElementById('w_rentRate'); inp.value = String(S.rentRate + 100); inp.dispatchEvent(new Event('input', { bubbles: true })); closeBooks();
      updateMonitors(); const after = bkNum(bkCell('Books', 'ebitda', 'today', true));
      return { ok: Math.abs((before - after) - 115 * 100 / 30.4) <= 1, detail: { before, after, want: 115 * 100 / 30.4 } };
    } finally { Object.keys(S).forEach(k => { if (!(k in keep)) delete S[k]; }); Object.assign(S, keep); }
  },
  mixSumsTo100() { const m = Object.values(S.mix); return { ok: m.reduce((a, b) => a + b, 0) === 100 && m.every(Number.isInteger), detail: S.mix }; },
  resultsText() {
    runDay({}); const en = resultsText(), was = zh() ? 'zh' : 'en';
    setLang('zh'); const zhT = resultsText(); setLang(was);
    const good = (s) => s.includes(String(A.visits)) && !s.includes('undefined');
    return { ok: good(en) && good(zhT), detail: { en: en.split('\n')[1], zh: zhT.split('\n')[1] } };
  }
};
{
  const q = new URLSearchParams(location.search);
  if (q.has('selftest')) {
    goOn = false; refreshGo();
    const want = (q.get('selftest') || '').split(',').filter(Boolean), out = {};
    for (const name of want.length ? want : Object.keys(SELFTESTS)) {
      try { out[name] = SELFTESTS[name] ? SELFTESTS[name]() : { ok: false, detail: 'unknown self-test' }; }
      catch (e) { out[name] = { ok: false, detail: String(e && e.stack || e) }; }
    }
    const pre = document.createElement('pre'); pre.id = 'selftest'; pre.textContent = JSON.stringify(out); document.body.appendChild(pre);
  }
}
// dev screenshots: index.html?shot=<tab>&h=<gym hour>&period=<today|mtd|month|year>&lang=<en|zh>&months=<n closed first> opens the books at that hour
{ const q = new URLSearchParams(location.search);
  if (q.has('shot')) { if (q.get('lang')) setLang(q.get('lang')); if (PRESETS[q.get('gym')]) { const p = PRESETS[q.get('gym')]; Object.assign(S, presetCounts(p.w, p.d), { hallW: p.w, hallD: p.d, layout: null, build: 'existing' }); }   /* &gym=S|M|L: a built gym (Plan 11 screenshots) */ setupRun(); for (let k = 0; k < (+q.get('months') || 0); k++) { closeEarlySync('month'); nextMonth(); } fastForward((+q.get('h') || 19) * 3600 - A.t); if (q.get('period')) BOOKS.period = q.get('period'); if (q.get('shot') !== 'none') openBooks(q.get('shot') || 'Today');
    if (q.get('cam')) { const [x, z, zm, az] = q.get('cam').split(',').map(Number); view.target.set(x, 0, z); view.zoom = view.zoomT = zm || 3; if (az != null && !isNaN(az)) view.az = view.azT = az; window.__clampView = false; } } }
// dev screenshots of the first session: index.html?shot=none&intro=<welcome|cost|pay|follow|goal|tracker|books>&h=<gym hour for tracker/books>
{ const q = new URLSearchParams(location.search), st = q.get('intro');
  if (q.has('shot') && st) {
    openIntro(); if (st !== 'welcome') { buildPick('M'); BUILD.step = 'cost'; renderBuild(); } if (st === 'pay') { BUILD.step = 'pay'; renderBuild(); }
    if (!['welcome', 'cost', 'pay'].includes(st)) { openGym();
      for (let i = 0; i < 7200 && INTRO.phase === 'wait'; i++) { fastForward(30); updateIntro(0); }
      if (st !== 'follow') { updateIntro(INTRO_FOLLOW_S); }
      if (st === 'tracker' || st === 'books') { document.querySelector('#goalCard [data-goal="members500"]').click(); goOn = false; refreshGo(); fastForward((+q.get('h') || 15) * 3600 - A.t); updateMonitors(); }
      if (st === 'books') { BOOKS.period = 'today'; openBooks('Books'); }
      if (st === 'follow' || st === 'goal') S.speed = 1; } } }
// dev screenshots of Rearrange: &gym=L&rearr=quote (a moved machine, a new bench, a red ghost on the washrooms) or &rearr=closed (applied, the next day closed)
{ const q = new URLSearchParams(location.search), r = q.get('rearr');
  if (q.has('shot') && r) { closeBooks(); openRearrange(); const p = BUILD.layout.pieces.find(x => x.kind === 'pulldown'); let moved = false;
    for (let z = 4; z < 60 && !moved; z += 2) for (let x = 4; x < 70 && !moved; x += 2) { const was = [p.sx, p.sz, p.rot].join(); if (dropPiece(BUILD.layout, p.id, x, z, BUILD.w, BUILD.d) && [p.sx, p.sz, p.rot].join() !== was) moved = true; }
    addPiece(BUILD.layout, 'bench', BUILD.w, BUILD.d); buildPreview();
    if (r === 'quote') { const F = fixedRooms(BUILD.w, BUILD.d), k = KINDS.pulldown; RGHOST.scale.set(k.w * SUB, 1, k.d * SUB); RGHOST.position.x = HALL.x0 + (F.washroom.x0 + 4) * SUB; RGHOST.position.z = HALL.zb + 8 * SUB; RGHOST.material.color.set('#d6403a'); RGHOST.visible = true; }
    if (r === 'closed') { rearrangeApply(); nextDay(); fastForward(10 * 3600 - A.t); updateMonitors(); openBooks('Today'); } } }
if (!new URLSearchParams(location.search).has('selftest')) requestAnimationFrame(frame);   // self-test pages don't render
