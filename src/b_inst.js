
// ================================================================ immediate-mode instanced batches (people + moving props)
const _colCache = new Map();
function colOf(hex) { let c = _colCache.get(hex); if (!c) { c = new THREE.Color(hex); _colCache.set(hex, c); } return c; }
class Batch {
  constructor(geo, max, shadow = true) {
    this.mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: 0xffffff }), max);
    this.mesh.castShadow = shadow; this.mesh.receiveShadow = true; this.mesh.frustumCulled = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.setColorAt(0, colOf('#ffffff')); this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.max = max; this.n = 0; this.arr = this.mesh.instanceMatrix.array; this.carr = this.mesh.instanceColor.array;
    world.add(this.mesh);
  }
  begin() { this.n = 0; }
  // columns: x axis (ax,ay,az) scaled, y axis, z axis, position
  put(xx, xy, xz, yx, yy, yz, zx, zy, zz, px, py, pz, hex) {
    if (this.n >= this.max) return;
    const o = this.n * 16, a = this.arr;
    a[o] = xx; a[o + 1] = xy; a[o + 2] = xz; a[o + 3] = 0; a[o + 4] = yx; a[o + 5] = yy; a[o + 6] = yz; a[o + 7] = 0;
    a[o + 8] = zx; a[o + 9] = zy; a[o + 10] = zz; a[o + 11] = 0; a[o + 12] = px; a[o + 13] = py; a[o + 14] = pz; a[o + 15] = 1;
    const c = colOf(hex), k = this.n * 3; this.carr[k] = c.r; this.carr[k + 1] = c.g; this.carr[k + 2] = c.b;
    this.n++;
  }
  end() { this.mesh.count = this.n; this.mesh.instanceMatrix.needsUpdate = true; this.mesh.instanceColor.needsUpdate = true; }
}
const BOX = new Batch(new THREE.BoxGeometry(1, 1, 1), 9000);
const CYL = new Batch(new THREE.CylinderGeometry(0.5, 0.5, 1, 10), 3000);   // unit cylinder along y
const _sa = new V3(), _sb = new V3(), _sc = new V3();
// box between points a,b (y axis), width w along x, depth d along z, fwd hint
function segBox(a, b, w, d, fwd, hex) {
  _sb.subVectors(b, a); let Ln = _sb.length(); if (Ln < 1e-5) { _sb.set(0, 1, 0); Ln = 1e-5; } else _sb.divideScalar(Ln);
  _sc.copy(fwd).addScaledVector(_sb, -fwd.dot(_sb)); if (_sc.lengthSq() < 1e-6) _sc.set(1, 0, 0).cross(_sb); _sc.normalize();
  _sa.crossVectors(_sb, _sc);
  BOX.put(_sa.x * w, _sa.y * w, _sa.z * w, _sb.x * Ln, _sb.y * Ln, _sb.z * Ln, _sc.x * d, _sc.y * d, _sc.z * d, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2, hex);
}
// oriented box at centre c with basis right R, up U, forward F
function basisBox(c, R, U, F, w, h, d, hex) {
  BOX.put(R.x * w, R.y * w, R.z * w, U.x * h, U.y * h, U.z * h, -F.x * d, -F.y * d, -F.z * d, c.x, c.y, c.z, hex);
}
function aaBox(x, y, z, w, h, d, hex, yaw = 0) { // axis box rotated about y, centre (x,y,z)
  const c = Math.cos(yaw), s = Math.sin(yaw);
  BOX.put(c * w, 0, -s * w, 0, h, 0, s * d, 0, c * d, x, y, z, hex);
}
// cylinder with axis from a to b, radius r
function cylAB(a, b, r, hex) {
  _sb.subVectors(b, a); let Ln = _sb.length(); if (Ln < 1e-5) { _sb.set(0, 1, 0); Ln = 1e-5; } else _sb.divideScalar(Ln);
  _sc.set(0, 1, 0); if (Math.abs(_sb.y) > 0.9) _sc.set(1, 0, 0);
  _sa.crossVectors(_sb, _sc).normalize(); _sc.crossVectors(_sa, _sb);
  const d = 2 * r;
  CYL.put(_sa.x * d, _sa.y * d, _sa.z * d, _sb.x * Ln, _sb.y * Ln, _sb.z * Ln, _sc.x * d, _sc.y * d, _sc.z * d, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2, hex);
}

// ================================================================ box-rig bodies (two-bone IK), drawn into the batches
function ik2(A, T, a, b, pole, out) {
  const dx = T.x - A.x, dy = T.y - A.y, dz = T.z - A.z; const d0 = Math.hypot(dx, dy, dz) || 1e-4;
  const ux = dx / d0, uy = dy / d0, uz = dz / d0;
  const lim = (a + b) * 0.999; if (d0 > lim) { const k = Math.min(1.3, d0 / lim); a *= k; b *= k; }
  const d = clamp(d0, Math.abs(a - b) + 1e-3, (a + b) * 0.999);
  const ca = clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1); const along = a * ca, h = a * Math.sqrt(1 - ca * ca);
  let px = pole.x, py = pole.y, pz = pole.z; const pd = px * ux + py * uy + pz * uz; px -= ux * pd; py -= uy * pd; pz -= uz * pd;
  const pm = Math.hypot(px, py, pz) || 1; px /= pm; py /= pm; pz /= pm;
  return out.set(A.x + ux * along + px * h, A.y + uy * along + py * h, A.z + uz * along + pz * h);
}
// A pose is a set of world-space targets:
//  H hip centre, T torso up (unit), F chest forward (unit, perpendicular to T), fL/fR ankles, hL/hR hands, kp knee pole, look (V3|null)
const TORSO_N = 3;   /* torso slices: enough for a taper from waist to chest to read smoothly */
function newPose() { return { H: new V3(), T: new V3(0, 1, 0), F: new V3(1, 0, 0), fL: new V3(), fR: new V3(), hL: new V3(), hR: new V3(), kp: new V3(1, 0, 0), ep: null, look: null, headTilt: 0, hidden: false }; }
const _R = new V3(), _S = new V3(), _N = new V3(), _HC = new V3(), _hipL = new V3(), _hipR = new V3(), _knL = new V3(), _knR = new V3(), _shL = new V3(), _shR = new V3(), _elL = new V3(), _elR = new V3(), _ep = new V3(), _hf = new V3(), _hr = new V3(), _hu = new V3(), _tmp = new V3(), _tmp2 = new V3();
function drawBody(look, P, st) {
  if (P.hidden) return;
  const s = look.scale || 1, w = lookDraw(look).w, c = look;
  const T = P.T, F = P.F;
  _R.crossVectors(F, T).normalize();
  _S.copy(P.H).addScaledVector(T, 0.5 * s);
  _N.copy(_S).addScaledVector(T, 0.07 * s);
  _HC.copy(_N).addScaledVector(T, 0.12 * s);
  P.shW = 0.19 * w.sw;   /* the resting-arms pose hangs the hands from this, so broad builds don't press their arms into the chest */
  _shL.copy(_S).addScaledVector(_R, -P.shW * s).addScaledVector(T, -0.035 * s);
  _shR.copy(_S).addScaledVector(_R, P.shW * s).addScaledVector(T, -0.035 * s);
  _hipL.copy(P.H).addScaledVector(_R, -0.1 * s).addScaledVector(T, -0.05 * s);
  _hipR.copy(P.H).addScaledVector(_R, 0.1 * s).addScaledVector(T, -0.05 * s);
  ik2(_hipL, P.fL, 0.45 * s, 0.42 * s, P.kp, _knL);
  ik2(_hipR, P.fR, 0.45 * s, 0.42 * s, P.kp, _knR);
  if (P.ep) _ep.copy(P.ep); else _ep.copy(F).multiplyScalar(-0.35).addScaledVector(T, -1);
  _tmp.copy(_ep).addScaledVector(_R, 0.6); ik2(_shR, P.hR, 0.31 * s, 0.29 * s, _tmp, _elR);
  _tmp.copy(_ep).addScaledVector(_R, -0.6); ik2(_shL, P.hL, 0.31 * s, 0.29 * s, _tmp, _elL);
  // head orientation: turn toward look target around torso up
  let hy = 0;
  if (P.look) {
    _tmp.subVectors(P.look, _HC); _tmp.addScaledVector(T, -_tmp.dot(T));
    if (_tmp.lengthSq() > 1e-4) { _tmp.normalize(); hy = clamp(Math.atan2(_tmp.dot(_R), _tmp.dot(F)), -1.2, 1.2); }
  }
  st.hy = (st.hy || 0) + (hy - (st.hy || 0)) * 0.25;
  const ch = Math.cos(st.hy), sh = Math.sin(st.hy);
  _hf.copy(F).multiplyScalar(ch).addScaledVector(_R, sh); _hr.crossVectors(_hf, T).normalize(); _hu.copy(T);
  if (P.headTilt) { _hu.multiplyScalar(Math.cos(P.headTilt)).addScaledVector(_hf, Math.sin(P.headTilt)); _hf.crossVectors(_hu, _hr).normalize(); }
  const hood = c.top === 'hoodie' ? 1 : 0, tw = 1 + 0.08 * hood, td = 1 + 0.14 * hood;
  _tmp.copy(P.H).addScaledVector(T, -0.02 * s); basisBox(_tmp, _R, T, F, 0.34 * s * w.hw, 0.2 * s, 0.22 * s * Math.min(w.hd, 1.25), c.shorts);
  // torso: a few slices easing from the waist (the narrower of hips and chest, so wide hips show below it) up to the chest,
  // the top slice narrowing into the shoulders
  const wW = 0.38 * s * Math.min(w.hw, w.cw) * 0.97 * tw, cW = 0.38 * s * w.cw * tw, wD = 0.23 * s * Math.min(w.hd, w.cd) * td, cD = 0.23 * s * w.cd * td;
  for (let i = 0; i < TORSO_N; i++) {
    const t = (i + 0.5) / TORSO_N, e = t * t * (3 - 2 * t);
    _tmp.copy(P.H).addScaledVector(T, (0.05 + 0.45 * i / TORSO_N) * s); _tmp2.copy(P.H).addScaledVector(T, (0.05 + 0.45 * (i + 1) / TORSO_N + 0.006) * s);
    segBox(_tmp, _tmp2, (wW + (cW - wW) * e) * (i === TORSO_N - 1 ? 0.94 : 1), wD + (cD - wD) * e, F, c.shirt);
  }
  if (hood) { _tmp.copy(_N).addScaledVector(F, -0.13 * s * w.cd).addScaledVector(T, -0.01 * s); basisBox(_tmp, _R, T, F, 0.26 * s, 0.14 * s, 0.1 * s, c.shirt); }
  // head, hair and headwear: offsets scale with head size
  const hs = s * (w.hs || 1), hb = (u, f, bw, bh, bd, col) => { _tmp.copy(_HC).addScaledVector(_hu, u * hs).addScaledVector(_hf, f * hs); basisBox(_tmp, _hr, _hu, _hf, bw * hs, bh * hs, bd * hs, col); };
  basisBox(_HC, _hr, _hu, _hf, 0.22 * hs, 0.25 * hs, 0.23 * hs, c.skin);
  const hst = c.hairStyle || 'short';
  if (hst === 'curly') hb(0.08, -0.03, 0.3, 0.2, 0.27, c.hair);
  else if (hst !== 'bald') {
    hb(0.12, -0.025, 0.24, hst === 'buzz' ? 0.03 : (c.hairH || 0.07), 0.25, c.hair);
    if (hst === 'quiff') hb(0.165, 0.075, 0.2, 0.07, 0.1, c.hair);
    else if (hst === 'long') hb(-0.03, -0.12, 0.24, 0.3, 0.1, c.hair);
    else if (hst === 'ponytail') { hb(0.03, -0.13, 0.1, 0.09, 0.07, c.hair); hb(-0.1, -0.15, 0.06, 0.17, 0.06, c.hair); }
    else if (hst === 'bun') hb(0.17, -0.07, 0.11, 0.09, 0.11, c.hair);
  }
  if (c.cap) {
    const cs = c.capStyle || 'cap';
    if (cs === 'cap') { hb(0.13, 0, 0.245, 0.07, 0.25, c.cap); hb(0.1, 0.16, 0.2, 0.025, 0.12, c.cap); }
    else if (cs === 'visor') { hb(0.08, 0, 0.245, 0.04, 0.25, c.cap); hb(0.08, 0.16, 0.2, 0.025, 0.12, c.cap); }
    else if (cs === 'beanie') hb(0.11, 0, 0.25, 0.12, 0.255, c.cap);
    else hb(0.07, 0, 0.235, 0.03, 0.245, c.cap);
  }
  // legs by bottom type: shorts (bare shin), bike shorts (upper half of the thigh), yoga pants (tight), trousers (loose)
  const bt = c.bottom || 'shorts', tl = bt === 'yoga' ? 0.92 : bt === 'trousers' ? 1.14 : bt === 'bike' ? 0.95 : 1, sl = bt === 'yoga' ? 0.92 : bt === 'trousers' ? 1.18 : 1;
  const shinC = bt === 'yoga' || bt === 'trousers' ? c.shorts : c.skin, thW = 0.15 * s * w.lw * tl, thD = 0.16 * s * w.lw * tl;
  for (const [hp, kn] of [[_hipL, _knL], [_hipR, _knR]]) {
    if (bt === 'bike') { _tmp.lerpVectors(hp, kn, 0.5); segBox(hp, _tmp, thW, thD, F, c.shorts); segBox(_tmp, kn, thW, thD, F, c.skin); }
    else segBox(hp, kn, thW, thD, F, c.shorts);
  }
  segBox(_knL, P.fL, 0.11 * s * w.lw * sl, 0.12 * s * w.lw * sl, F, shinC); segBox(_knR, P.fR, 0.11 * s * w.lw * sl, 0.12 * s * w.lw * sl, F, shinC);
  // feet: point along the foot direction (horizontal component of kp)
  _tmp2.copy(P.kp); _tmp2.y = 0; if (_tmp2.lengthSq() < 1e-4) _tmp2.set(F.x, 0, F.z); if (_tmp2.lengthSq() < 1e-4) _tmp2.set(1, 0, 0); _tmp2.normalize();
  _hr.crossVectors(_tmp2, UP).normalize();
  const st_ = c.shoeType || 'sneaker';
  for (const ft of [P.fL, P.fR]) {
    const fb = (up, fw, bw, bh, bd, col) => { _tmp.copy(ft).addScaledVector(_tmp2, (0.05 + fw) * s).addScaledVector(UP, up * s); basisBox(_tmp, _hr, UP, _tmp2, bw * s, bh * s, bd * s, col); };
    if (st_ === 'runner') { fb(-0.055, 0, 0.11, 0.035, 0.27, '#f2f1ea'); fb(-0.02, -0.01, 0.095, 0.05, 0.22, c.shoe); }
    else if (st_ === 'hightop') fb(-0.005, -0.005, 0.1, 0.13, 0.25, c.shoe);
    else if (st_ === 'flat') fb(-0.05, 0, 0.1, 0.04, 0.26, c.shoe);
    else if (st_ === 'slides') { fb(-0.062, 0, 0.1, 0.02, 0.26, c.shoe); fb(-0.035, 0, 0.085, 0.04, 0.22, c.skin); fb(-0.03, 0.05, 0.105, 0.035, 0.07, c.shoe); }
    else fb(-0.035, 0, 0.1, 0.07, 0.26, c.shoe);
  }
  // arms by top type: tee (sleeve to mid upper arm), tank (bare), long sleeve and hoodie (to the wrist)
  const tp = c.top || 'tee', slC = c.sleeve || c.shirt, uaW = 0.1 * s * w.aw, faW = 0.085 * s * w.aw;
  for (const [sh_, el, hd] of [[_shL, _elL, P.hL], [_shR, _elR, P.hR]]) {
    if (tp === 'tee') { _tmp.lerpVectors(sh_, el, 0.55); segBox(sh_, _tmp, uaW * 1.12, uaW * 1.12, F, slC); segBox(_tmp, el, uaW, uaW, F, c.skin); }
    else segBox(sh_, el, uaW, uaW, F, tp === 'tank' ? c.skin : slC);
    segBox(el, hd, faW, faW, F, c.fore || (tp === 'long' || tp === 'hoodie' ? c.shirt : c.skin));
  }
  basisBox(P.hL, _R, T, F, 0.08 * s, 0.08 * s, 0.08 * s, c.skin); basisBox(P.hR, _R, T, F, 0.08 * s, 0.08 * s, 0.08 * s, c.skin);
  st.head = st.head || new V3(); st.head.copy(_HC);
}

// ---------------------------------------------------------------- generic poses
const _pf = new V3(), _pr = new V3();
function frameOf(yaw) { _pf.set(Math.cos(yaw), 0, Math.sin(yaw)); _pr.set(-Math.sin(yaw), 0, Math.cos(yaw)); }
// local point: origin + f*a + up*b + r*c
function LP(out, o, f, r, a, b, c) { return out.set(o.x + f.x * a + r.x * c, o.y + b, o.z + f.z * a + r.z * c); }
// standing / walking. phase and walk weight are kept in st
function poseStand(P, pos, yaw, s, o) {
  frameOf(yaw); const f = _pf, r = _pr;
  const vx = o.vx || 0, vz = o.vz || 0, sp = Math.hypot(vx, vz);
  const w = o.walkW || 0, ph = o.phase || 0, crouch = o.crouch || 0;
  const stride = clamp(sp * 0.2, 0.12, 0.6) * s * w, lift = Math.min(0.2, 0.05 + sp * 0.03) * s * w;
  const dx = sp > 0.05 ? vx / sp : f.x, dz = sp > 0.05 ? vz / sp : f.z;
  const stw = (0.11 + (o.stance || 0) + crouch * 0.07) * s;
  const pL = Math.sin(ph);
  const y0 = pos.y + (o.lift || 0);
  P.fL.set(pos.x - r.x * stw + dx * pL * stride, y0 + 0.07 * s + Math.max(0, Math.cos(ph)) * lift, pos.z - r.z * stw + dz * pL * stride);
  P.fR.set(pos.x + r.x * stw - dx * pL * stride, y0 + 0.07 * s + Math.max(0, -Math.cos(ph)) * lift, pos.z + r.z * stw - dz * pL * stride);
  if (o.split) { P.fL.addScaledVector(f, o.split * s); P.fR.addScaledVector(f, -o.split * s); }
  const bob = -Math.abs(Math.sin(ph)) * 0.035 * s * w;
  P.H.set(pos.x + f.x * (0.06 * crouch - (o.hipBack || 0)) * s, y0 + (0.975 - 0.37 * crouch - (o.drop || 0)) * s + bob, pos.z + f.z * (0.06 * crouch - (o.hipBack || 0)) * s);
  const lean = (o.lean || 0) + crouch * 0.5 + Math.min(sp, 4) * 0.04;
  P.T.set(f.x * Math.sin(lean), Math.cos(lean), f.z * Math.sin(lean));
  P.F.set(f.x * Math.cos(lean), -Math.sin(lean), f.z * Math.cos(lean));
  P.kp.copy(f).addScaledVector(UP, 0.25); if (o.kneesOut) P.kp.addScaledVector(r, 0);
  P.ep = null; P.headTilt = o.headTilt || 0;
  return P;
}
function poseSit(P, seat, yaw, s, o = {}) {   // seat: V3 hip point, footY
  frameOf(yaw); const f = _pf, r = _pr;
  P.H.copy(seat);
  const fy = (o.footY ?? 0) + 0.07 * s, reach = (o.legReach ?? 0.46) * s;
  P.fL.set(seat.x + f.x * reach - r.x * 0.12 * s, fy, seat.z + f.z * reach - r.z * 0.12 * s);
  P.fR.set(seat.x + f.x * reach + r.x * 0.12 * s, fy, seat.z + f.z * reach + r.z * 0.12 * s);
  const lean = o.lean ?? -0.06;
  P.T.set(f.x * Math.sin(lean), Math.cos(lean), f.z * Math.sin(lean));
  P.F.set(f.x * Math.cos(lean), -Math.sin(lean), f.z * Math.cos(lean));
  P.kp.copy(f).addScaledVector(UP, 0.8); P.ep = null; P.headTilt = 0;
  return P;
}
// arms helpers (after torso is set): uses shoulder estimate
const _so = new V3(), _ep2 = new V3();
function shoulderOf(P, s, side) { _so.copy(P.H).addScaledVector(P.T, 0.47 * s); _R.crossVectors(P.F, P.T).normalize(); return _so.addScaledVector(_R, (P.shW || 0.19) * s * side); }
function armsRest(P, s, swing = 0) {
  _R.crossVectors(P.F, P.T).normalize();
  P.hR.copy(shoulderOf(P, s, 1)).addScaledVector(P.T, -0.55 * s).addScaledVector(P.F, 0.05 * s + swing * s).addScaledVector(_R, 0.05 * s);
  P.hL.copy(shoulderOf(P, s, -1)).addScaledVector(P.T, -0.55 * s).addScaledVector(P.F, 0.05 * s - swing * s).addScaledVector(_R, -0.05 * s);
}
function armsMode(P, s, mode, t) {
  _R.crossVectors(P.F, P.T).normalize();
  const S = _tmp2.copy(P.H).addScaledVector(P.T, 0.47 * s);
  switch (mode) {
    case 'clap': { const k = (0.03 + 0.07 * Math.abs(Math.sin(t * 15))) * s; const c = _tmp.copy(S).addScaledVector(P.F, 0.3 * s).addScaledVector(P.T, -0.08 * s); P.hR.copy(c).addScaledVector(_R, k); P.hL.copy(c).addScaledVector(_R, -k); break; }
    case 'cheer': P.hR.copy(S).addScaledVector(P.T, 0.6 * s).addScaledVector(_R, 0.3 * s); P.hL.copy(S).addScaledVector(P.T, 0.6 * s).addScaledVector(_R, -0.3 * s); break;
    case 'phone': P.hR.copy(S).addScaledVector(P.F, 0.26 * s).addScaledVector(P.T, -0.24 * s).addScaledVector(_R, 0.12 * s); P.hL.copy(S).addScaledVector(P.T, -0.55 * s).addScaledVector(_R, -0.24 * s).addScaledVector(P.F, 0.03 * s); P.headTilt = 0.4; break;
    case 'drink': { const k = Math.max(0, Math.sin(t * 1.3)); P.hR.copy(S).addScaledVector(P.F, (0.15 + 0.1 * (1 - k)) * s).addScaledVector(P.T, (-0.45 + 0.55 * k) * s).addScaledVector(_R, 0.1 * s); P.hL.copy(S).addScaledVector(P.T, -0.55 * s).addScaledVector(_R, -0.24 * s); break; }
    case 'fold': // hands on hips, elbows out
      P.hR.copy(P.H).addScaledVector(_R, 0.21 * s).addScaledVector(P.T, 0.07 * s).addScaledVector(P.F, 0.02 * s); P.hL.copy(P.H).addScaledVector(_R, -0.21 * s).addScaledVector(P.T, 0.07 * s).addScaledVector(P.F, 0.02 * s);
      P.ep = _ep2.copy(P.F).multiplyScalar(-0.6).addScaledVector(P.T, -0.2); break;
    case 'point': P.hR.copy(S).addScaledVector(P.F, 0.55 * s).addScaledVector(_R, 0.15 * s); P.hL.copy(S).addScaledVector(P.T, -0.55 * s).addScaledVector(_R, -0.2 * s); break;
    case 'wave': P.hR.copy(S).addScaledVector(P.T, (0.45 + 0.08 * Math.sin(t * 9)) * s).addScaledVector(_R, (0.35 + 0.1 * Math.sin(t * 9)) * s); P.hL.copy(S).addScaledVector(P.T, -0.55 * s).addScaledVector(_R, -0.2 * s); break;
    case 'umbrella': P.hR.copy(S).addScaledVector(P.T, 0.15 * s).addScaledVector(P.F, 0.22 * s).addScaledVector(_R, 0.05 * s); P.hL.copy(S).addScaledVector(P.T, -0.55 * s).addScaledVector(_R, -0.22 * s); break;
    case 'carry': P.hR.copy(S).addScaledVector(P.T, -0.55 * s).addScaledVector(_R, 0.25 * s); P.hL.copy(S).addScaledVector(P.T, -0.55 * s).addScaledVector(_R, -0.25 * s); break;
    case 'lap': P.hR.copy(P.H).addScaledVector(P.F, 0.3 * s).addScaledVector(_R, 0.13 * s).addScaledVector(UP, 0.14 * s); P.hL.copy(P.H).addScaledVector(P.F, 0.3 * s).addScaledVector(_R, -0.13 * s).addScaledVector(UP, 0.14 * s); break;
    case 'locker': { const k = Math.sin(t * 4); P.hR.copy(S).addScaledVector(P.F, 0.38 * s).addScaledVector(P.T, (-0.1 + 0.1 * k) * s).addScaledVector(_R, 0.12 * s); P.hL.copy(S).addScaledVector(P.F, 0.38 * s).addScaledVector(P.T, (-0.1 - 0.1 * k) * s).addScaledVector(_R, -0.12 * s); break; }
    case 'write': { P.hR.copy(S).addScaledVector(P.F, 0.5 * s).addScaledVector(P.T, (0.1 + 0.05 * Math.sin(t * 7)) * s).addScaledVector(_R, (0.1 * Math.sin(t * 3)) * s); P.hL.copy(S).addScaledVector(P.T, -0.55 * s).addScaledVector(_R, -0.2 * s); break; }
    case 'wipe': { const k = t * 6; P.hR.copy(P.H).addScaledVector(P.F, 0.55 * s).addScaledVector(UP, -0.25 * s).addScaledVector(_R, (0.15 * Math.sin(k)) * s); P.hR.addScaledVector(P.F, 0.06 * Math.cos(k) * s); P.hL.copy(S).addScaledVector(P.F, 0.2 * s).addScaledVector(P.T, -0.3 * s).addScaledVector(_R, -0.2 * s); break; }
    default: armsRest(P, s, 0);
  }
}
