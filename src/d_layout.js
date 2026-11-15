
// ================================================================ equipment layout (rebuilt on Setup) + navigation grid
let EQUIP = new THREE.Group(); world.add(EQUIP);
let STATIONS = [], OBST = [], BACKROW = { z: -7.6, rows: 1 }, CHALK = { x: 0, z: -5 }, DBZONE = { x: -13.6, zc: -1.0, span: 4 };
const PLATE = { 25: ['#d6403a', 0.45, 0.054], 20: ['#2f68ab', 0.45, 0.046], 15: ['#dfe03a', 0.40, 0.04], 10: ['#448c3a', 0.325, 0.035], 5: ['#2f3340', 0.228, 0.03], 2.5: ['#9b2226', 0.19, 0.025], 1.25: ['#c4c9d4', 0.16, 0.02] };
const PLATE_KG = [25, 20, 15, 10, 5, 2.5, 1.25];
function platesFor(total, bar = 20) { let side = Math.max(0, (total - bar) / 2); const out = []; for (const p of PLATE_KG) while (side >= p - 1e-6) { out.push(p); side -= p; } return out; }
function disc(r, t, c, x, y, z, axis, b) {  // axis 'x' or 'z'
  const g = new THREE.CylinderGeometry(r, r, t, 12);
  if (axis === 'x') g.rotateZ(Math.PI / 2); else g.rotateX(Math.PI / 2);
  g.translate(x, y, z); b.add(g, mOf(c));
}
function loc(s, a, c) { const f = [Math.cos(s.yaw), Math.sin(s.yaw)], r = [-Math.sin(s.yaw), Math.cos(s.yaw)]; return { x: s.x + f[0] * a + r[0] * c, z: s.z + f[1] * a + r[1] * c }; }
function addStation(type, zone, x, z, yaw, o = {}) {
  const s = { id: STATIONS.length, type, zone, x, z, yaw, users: [], queue: [], reserved: null, active: null, load: 20, mode: null, lastUsed: -1e9, dirty: 0, strayDB: 0, stack: 0, ...o };
  s.acc = s.acc || { x, z };
  s.rest = s.rest || loc(s, 0.6, 1.1);
  s.waitBase = s.waitBase || loc(s, 1.4, 1.2);
  s.waitDir = s.waitDir || { x: Math.cos(s.yaw) * 0.6, z: Math.sin(s.yaw) * 0.6 };
  if (s.fit === undefined) s.fit = kitFit(x, z, yaw); KIT = [];   /* a station can pass its own extent when its kit is shared or drawn later */
  STATIONS.push(s); return s;
}
// the extent of the kit drawn for a station: the pieces built since the last station, near this one (not floor-sized), measured along its facing
function kitFit(x, z, yaw) {
  const f = [Math.cos(yaw), Math.sin(yaw)], r = [-Math.sin(yaw), Math.cos(yaw)]; let a0 = 1e9, a1 = -1e9, c0 = 1e9, c1 = -1e9, y0 = 1e9, y1 = -1e9, n = 0;
  for (const b of KIT) {
    if (b.max.x - b.min.x > 6 || b.max.z - b.min.z > 6) continue;
    if (Math.hypot((b.min.x + b.max.x) / 2 - x, (b.min.z + b.max.z) / 2 - z) > 3) continue;
    for (const px of [b.min.x, b.max.x]) for (const pz of [b.min.z, b.max.z]) { const dx = px - x, dz = pz - z, da = dx * f[0] + dz * f[1], dc = dx * r[0] + dz * r[1];
      a0 = Math.min(a0, da); a1 = Math.max(a1, da); c0 = Math.min(c0, dc); c1 = Math.max(c1, dc); }
    y0 = Math.min(y0, b.min.y); y1 = Math.max(y1, b.max.y); n++;
  }
  return n ? { ca: (a0 + a1) / 2, cc: (c0 + c1) / 2, a: a1 - a0, c: c1 - c0, y0: Math.max(0, y0), h: y1 - Math.max(0, y0) } : null;
}
// what a layout actually placed: counts per kind and which fixed-kit zones exist (Plan 8: a built gym pays for these)
function placedCounts() {
  const n = (f) => STATIONS.filter(f).length, MT = ['pulldown', 'row', 'chestpress', 'shoulderpress', 'pecdeck', 'legext', 'legcurl'], PL = ['legpress', 'hack', 'hipthrust', 'beltsquat'], has = (t) => STATIONS.some(s => s.type === t);
  return { counts: { cardio: n(s => s.zone === 'cardio'), machines: n(s => MT.includes(s.type)), racks: n(s => s.type === 'rack'), plats: n(s => s.type === 'olyplat'), benches: n(s => s.type === 'bench'), plates: n(s => PL.includes(s.type)) },
    kit: { dumbbells: has('dbspot'), cable: has('cable'), turf: has('sled'), pullup: has('pullup'), mats: has('mat') } };
}
function waitSpot(s, i) { return { x: s.waitBase.x + s.waitDir.x * i, z: s.waitBase.z + s.waitDir.z * i }; }
function obst(x0, z0, x1, z1) { OBST.push([Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1)]); }
const Z_FRONT = Math.PI / 2;   // facing +z
function buildLayout(cfg) {
  if (HALL.w != null && cfg.layout && cfg.layout.pieces) return buildLayoutGrid(cfg);   /* Plan 11: a built hall is drawn from its list of pieces */
  // clear
  EQUIP.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  world.remove(EQUIP); EQUIP = new THREE.Group(); world.add(EQUIP);
  STATIONS = []; OBST = []; KIT = [];   /* the hall shell built before this isn't any station's kit */
  const EB = new Builder(); const B = { b: EB };
  // Plan 8: zones keep to their wall — cardio and machines to the street wall, racks and platforms to the back wall, dumbbells, mats and the bar
  // holder to the left wall — at today's coordinates plus that wall's shift; counts come from cfg and are clipped to what fits a built hall.
  // The sample hall (HALL.w == null) keeps today's hand-tuned layout exactly.
  const { R, Lf, Bk } = hallShift(), sample = HALL.w == null;
  const colIn = (x0, z0, x1, z1) => COLUMNS.some(c => c.x + 0.35 > Math.min(x0, x1) && c.x - 0.35 < Math.max(x0, x1) && c.z + 0.35 > Math.min(z0, z1) && c.z - 0.35 < Math.max(z0, z1));   /* a piece (with its rest and queue spots) would hit a column: leave it out */
  const items = []; for (let i = 0; i < cfg.racks; i++) items.push('rack'); for (let i = 0; i < cfg.plats; i++) items.push('olyplat');
  const bx0 = Lf - 10.6, rowZ = [Bk - 7.6, Bk - 4.25], all = items.length;
  let bx1 = R + 14.2, perCap = 0, twoRows = false;
  const fitRows = () => { perCap = Math.max(1, Math.floor((bx1 - bx0) / 2.6)); twoRows = cfg.racks + cfg.plats > 9 || (!sample && all > perCap); };
  fitRows();
  if (!sample && rowZ[twoRows ? 1 : 0] + 2.6 > CHG.z0 - 0.3) { bx1 = Math.min(bx1, CHG.x0 - 1.4); fitRows(); }   /* a shallow hall: the back row stops short of the washrooms */
  if (!sample) items.length = Math.min(all, perCap * (twoRows ? 2 : 1) * (twoRows ? 1 : 1), perCap * 2);
  const backEdge = rowZ[twoRows ? 1 : 0] + 1.2, backWait = rowZ[twoRows ? 1 : 0] + 1.8 + 0.55;
  // ---------------- cardio strip along the windows (facing the windows, +z)
  const cz = 8.0;
  const CARDIO = [['treadmill', -13.2], ['treadmill', -11.6], ['treadmill', -10.0], ['treadmill', -8.4], ['rower', -6.6], ['rower', -5.0], ['bike', -3.3], ['bike', -1.9], ['airbike', -0.3]], nC = cfg.cardio ?? 9;
  const cardio = (nC === 9 ? CARDIO : Array.from({ length: nC }, (_, i) => [CARDIO[i % 9][0], -13.2 + i * 1.65])).map(([t, x]) => [t, Lf + x]).filter(([, x]) => sample || (x <= DOOR.x - 6.3 && !colIn(x - 0.5, cz - 2.6, x + 1.0, cz + 1.2)));
  for (const [type, x] of cardio) {
    if (type === 'treadmill') { box(0.85, 0.18, 1.9, '#565c6c', x, 0, cz, 0, B); box(0.6, 0.02, 1.5, '#0d0f14', x, 0.18, cz - 0.1, 0, B); for (const dx of [-0.38, 0.38]) box(0.06, 1.2, 0.06, '#959bab', x + dx, 0.18, cz + 0.8, 0, B); box(0.8, 0.3, 0.2, '#7a8090', x, 1.3, cz + 0.82, 0, B); box(0.5, 0.18, 0.04, '#13305a', x, 1.36, cz + 0.71, 0, B); addStation(type, 'cardio', x, cz - 0.15, Z_FRONT, { rest: { x: x + 0.8, z: cz - 1.6 }, waitBase: { x: x + 0.8, z: cz - 2.2 }, waitDir: { x: 0, z: -0.6 } }); obst(x - 0.42, cz + 0.6, x + 0.42, cz + 1.0); }
    if (type === 'rower') { box(0.18, 0.12, 2.4, '#959bab', x, 0.05, cz, 0, B); box(0.5, 0.5, 0.4, '#1c1f2a', x, 0.1, cz + 1.0, 0, B); disc(0.24, 0.12, '#7a8090', x, 0.45, cz + 1.0, 'x', EB); box(0.5, 0.06, 0.2, '#1c1f2a', x, 0.15, cz + 0.6, 0, B); addStation(type, 'cardio', x, cz - 0.3, Z_FRONT, { rest: { x: x + 0.7, z: cz - 1.8 }, waitBase: { x: x + 0.7, z: cz - 2.4 }, waitDir: { x: 0, z: -0.6 } }); obst(x - 0.3, cz + 0.7, x + 0.3, cz + 1.25); }
    if (type === 'bike' || type === 'airbike') { box(0.12, 0.08, 1.1, '#7a8090', x, 0, cz, 0, B); box(0.08, 0.85, 0.08, '#7a8090', x, 0, cz - 0.25, 0, B); box(0.25, 0.08, 0.3, '#1c1f2a', x, 0.88, cz - 0.25, 0, B); box(0.08, 1.05, 0.08, '#7a8090', x, 0, cz + 0.35, 0, B); box(0.5, 0.06, 0.08, '#1c1f2a', x, 1.05, cz + 0.4, 0, B); if (type === 'airbike') disc(0.4, 0.2, '#565c6c', x, 0.45, cz + 0.55, 'x', EB); else disc(0.2, 0.1, '#6b7182', x, 0.35, cz + 0.4, 'x', EB); addStation(type, 'cardio', x, cz - 0.25, Z_FRONT, { rest: { x: x + 0.6, z: cz - 1.6 }, waitBase: { x: x + 0.6, z: cz - 2.2 }, waitDir: { x: 0, z: -0.6 } }); obst(x - 0.25, cz + 0.2, x + 0.25, cz + 0.75); }
  }
  // ---------------- pin-loaded machines, Rogue-style: 3x3 black steel, shrouded stacks, 6" pulleys (user sits facing +z)
  const mz = 4.6, MTYPES = ['pulldown', 'row', 'chestpress', 'shoulderpress', 'pecdeck', 'legext', 'legcurl'], MX0 = Lf - 13.1, MP = 2.15;
  const cableX = (n) => Lf + 3.8 + (n - 7) * MP; let nM = cfg.machines ?? 7;
  if (!sample) while (nM > 1 && cableX(nM) + 2.2 > CHG.x0 - 1.5) nM--;   /* leave a corridor to the washroom doors */
  const machines = Array.from({ length: nM }, (_, i) => MTYPES[i % 7]);
  const STEEL = '#1c1f2a', PAD = '#2f3340', CHROME = '#c4c9d4', SHROUD = '#565c6c';
  const stackTower = (x, z, h = 2.3) => {
    for (const dx of [-0.32, 0.32]) box(0.076, h, 0.076, STEEL, x + dx, 0, z, 0, B);
    box(0.72, 0.076, 0.076, STEEL, x, h - 0.076, z, 0, B); box(0.72, 0.1, 0.5, STEEL, x, 0, z, 0, B);
    for (const dx of [-0.11, 0.11]) box(0.025, h - 0.25, 0.025, CHROME, x + dx, 0.1, z, 0, B);           // guide rods
    for (let i = 0; i < 12; i++) box(0.36, 0.055, 0.2, i % 2 ? '#2f3340' : '#1c1f2a', x, 0.12 + i * 0.06, z, 0, B); // plates
    for (const dz of [-0.13, 0.13]) box(0.6, 1.25, 0.02, SHROUD, x, 0.1, z + dz, 0, B);                   // shrouds (stack shows through the gap)
    cyl(0.075, 0.075, 0.05, 12, CHROME, x, h - 0.2, z, { b: EB, rx: Math.PI / 2 });                      // top pulley
  };
  machines.forEach((type, i) => {
    const x = MX0 + i * MP, sz = mz - 0.95;
    if (colIn(x - 1.0, mz - 1.4, x + 1.1, mz + 2.2)) return;
    stackTower(x, sz);
    box(0.1, 0.1, 1.3, STEEL, x, 0, mz - 0.35, 0, B);                                         // spine to the stack
    box(0.6, 0.012, 0.012, '#0d0f14', x, 2.2, sz, 0, B);
    if (type !== 'row') { box(0.076, 0.42, 0.076, STEEL, x, 0, mz, 0, B); box(0.46, 0.09, 0.42, PAD, x, 0.42, mz, 0, B); }
    if (type === 'chestpress' || type === 'pecdeck' || type === 'shoulderpress' || type === 'legext' || type === 'legcurl') {
      const tall = type === 'shoulderpress' ? 0.85 : 0.72;
      box(0.076, 0.5 + tall, 0.076, STEEL, x, 0.3, mz - 0.3, 0, B); box(0.42, tall, 0.09, PAD, x, 0.6, mz - 0.22, 0, B);
    }
    if (type === 'pulldown') {
      box(0.076, 2.5, 0.076, STEEL, x, 0, mz - 0.62, 0, B); box(0.076, 0.076, 1.2, STEEL, x, 2.42, mz - 0.4, 0, B);
      cyl(0.075, 0.075, 0.05, 12, CHROME, x, 2.33, mz + 0.15, { b: EB, rz: Math.PI / 2 });
      box(0.012, 0.012, 1.1, '#0d0f14', x, 2.4, mz - 0.4, 0, B);                              // cable along the top beam
      box(0.076, 0.7, 0.076, STEEL, x, 0, mz + 0.34, 0, B); for (const dx of [-0.2, 0.2]) cyl(0.07, 0.07, 0.24, 8, PAD, x + dx - 0.12, 0.72, mz + 0.32, { b: EB, rz: Math.PI / 2 });
    }
    if (type === 'row') {
      box(0.076, 0.42, 0.076, STEEL, x, 0, mz - 0.1, 0, B); box(0.42, 0.09, 0.5, PAD, x, 0.42, mz - 0.1, 0, B);   // bench seat
      box(0.1, 0.1, 1.2, STEEL, x, 0, mz + 0.55, 0, B);
      box(0.52, 0.34, 0.05, '#959bab', x, 0.04, mz + 0.82, 0, B, { rx: -0.45 });                   // footplate
      box(0.076, 0.42, 0.076, STEEL, x, 0, mz + 1.1, 0, B);
      cyl(0.075, 0.075, 0.05, 12, CHROME, x, 0.26, mz + 1.06, { b: EB, rz: Math.PI / 2 });
      box(0.012, 0.012, 2.0, '#0d0f14', x, 0.11, mz + 0.06, 0, B);                              // cable under the seat
    }
    if (type === 'chestpress' || type === 'pecdeck' || type === 'shoulderpress') {
      for (const dx of [-0.45, 0.45]) box(0.076, 2.0, 0.076, STEEL, x + dx, 0, mz - 0.5, 0, B);
      box(0.98, 0.076, 0.076, STEEL, x, 1.95, mz - 0.5, 0, B);
      if (type === 'pecdeck') box(0.32, 0.076, 0.44, STEEL, x, 1.9, mz - 0.3, 0, B);
      else for (const dx of [-0.38, 0.38]) cyl(0.05, 0.05, 0.1, 10, CHROME, x + dx - 0.05, type === 'shoulderpress' ? 0.98 : 1.88, mz - 0.5, { b: EB, rz: Math.PI / 2 });
    }
    if (type === 'legext' || type === 'legcurl') {
      box(0.1, 0.5, 0.12, STEEL, x - 0.3, 0.3, mz + 0.42, 0, B);                                 // cam housing at the knee
      if (type === 'legcurl') { box(0.076, 0.35, 0.076, STEEL, x + 0.3, 0.42, mz + 0.3, 0, B); box(0.42, 0.09, 0.2, PAD, x, 0.74, mz + 0.3, 0, B); }
    }
    addStation(type, 'machines', x, mz, Z_FRONT, { rest: { x: x + MP / 2, z: mz + 0.9 }, waitBase: { x: x + MP / 2, z: mz + 1.5 }, waitDir: { x: 0, z: 0.55 }, stackAt: { x, z: sz } });
    obst(x - 0.4, sz - 0.3, x + 0.4, sz + 0.3);
  });
  { // functional trainer / cable crossover: two shrouded towers, adjustable pulleys, pull-up crossmember
    const x = cableX(nM);
    if (!colIn(x - 2.3, mz - 0.8, x + 2.3, mz + 2.0)) {
    for (const dx of [-1.8, 1.8]) { stackTower(x + dx, mz - 0.3, 2.45); for (const ddx of [-0.32, 0.32]) box(0.076, 2.45, 0.076, STEEL, x + dx + ddx, 0, mz + 0.2, 0, B); obst(x + dx - 0.4, mz - 0.6, x + dx + 0.4, mz + 0.3); cyl(0.075, 0.075, 0.05, 12, CHROME, x + dx * 0.92, 2.1, mz + 0.2, { b: EB, rx: Math.PI / 2 }); }
    box(3.9, 0.076, 0.076, STEEL, x, 2.42, mz + 0.2, 0, B); box(2.2, 0.05, 0.05, CHROME, x, 2.3, mz + 0.35, 0, B);
    addStation('cable', 'machines', x, mz - 0.1, Z_FRONT, { rest: { x: x, z: mz + 1.2 }, waitBase: { x: x + 0.7, z: mz + 1.4 }, waitDir: { x: 0, z: 0.55 }, stackAt: { x: x - 1.8, z: mz - 0.3 }, stackAt2: { x: x + 1.8, z: mz - 0.3 } });
    }
  }
  // ---------------- dumbbell racks: two-tier, dumbbells lie across the rack in pairs, heavier to the right
  const segs = [[-4.8, -1.5], [-0.7, 2.6]].filter(([z0, z1]) => sample || (z0 > Bk - 6.25 && !colIn(Lf - 14.8, z0, Lf - 11.3, z1 + 1.0)));   /* rack runs clear of the stretch corner */
  DBZONE = { x: Lf - 13.6, zc: -1.0, span: 4 };   /* where cleaners put stray dumbbells back; a built hall narrows it below */
  {
    let w = 2.5;
    if (!sample && !segs.length) DBZONE = { x: HALL.x0 + 1.4, zc: (HALL.zb + HZ) / 2, span: 1 };   /* no dumbbell runs: somewhere on the floor by the left wall */
    if (!sample && segs.length) DBZONE = { x: Lf - 13.6, zc: (segs[0][0] + segs[segs.length - 1][1]) / 2, span: Math.min(4, segs[segs.length - 1][1] - segs[0][0]) };
    for (const [z0, z1] of segs) {
      const zc = (z0 + z1) / 2, len = z1 - z0;
      for (const zz of [z0 + 0.05, z1 - 0.05]) { box(0.06, 0.9, 0.06, STEEL, Lf - 14.55, 0, zz, 0, B); box(0.06, 0.6, 0.06, STEEL, Lf - 13.95, 0, zz, 0, B); box(0.7, 0.06, 0.06, STEEL, Lf - 14.25, 0, zz, 0, B); }
      box(0.36, 0.04, len, STEEL, Lf - 14.08, 0.5, zc, 0, B, { rz: -0.12 }); box(0.36, 0.04, len, STEEL, Lf - 14.45, 0.86, zc, 0, B, { rz: -0.12 });
      for (const [tier, cx] of [[0.9, Lf - 14.45], [0.54, Lf - 14.08]]) {
        const slot = (len - 0.2) / 5;
        for (let p = 0; p < 5; p++) {
          const r = 0.065 + w * 0.0012, hl = 0.05 + w * 0.0016;
          let z = z0 + 0.1 + p * slot + (slot - 4 * r - 0.015) / 2;
          for (let n = 0; n < 2; n++) {
            const zz = z + r;
            disc(0.018, 0.14, CHROME, cx, tier + r, zz, 'x', EB);
            for (const sd of [-1, 1]) {
              const g = new THREE.CylinderGeometry(r, r, hl, 6); g.rotateZ(Math.PI / 2); g.translate(cx + sd * (0.07 + hl / 2), tier + r, zz); EB.add(g, mOf('#3b3f4c'));
              disc(r * 0.45, 0.012, '#959bab', cx + sd * (0.07 + hl + 0.006), tier + r, zz, 'x', EB);
            }
            z += 2 * r + 0.015;
          }
          w += 2.5;
        }
      }
      obst(Lf - 14.7, z0, Lf - 13.85, z1);
    }
  }
  // each spot's extent is its slice of the rack (the racks are built in one go above, so the kit can't be told apart per spot); facing -x, so the rack lies ahead
  const dbFit = (z) => { const [z0, z1] = segs.find(([z0, z1]) => z >= z0 && z <= z1), lo = Math.max(z0, z - 0.85), hi = Math.min(z1, z + 0.85);
    return { ca: (Lf - 12.75) - (Lf - 14.275), cc: z - (lo + hi) / 2, a: 0.85, c: hi - lo, y0: 0, h: 1.05 }; };
  [-4.0, -2.2, -0.4, 1.4].filter(z => segs.some(([z0, z1]) => z >= z0 && z <= z1)).forEach(z => addStation('dbspot', 'dumbbells', Lf - 12.75, z, Math.PI, { fit: dbFit(z), rest: { x: Lf - 11.95, z: z + 0.65 }, waitBase: { x: Lf - 11.7, z: z + 0.9 }, waitDir: { x: 0.5, z: 0 } }));
  const bz0 = sample ? -4.0 : Math.max(-4.0, backWait + 0.7), nB = sample ? cfg.benches : Math.min(cfg.benches, 2 * Math.max(0, Math.floor((2.0 - bz0) / 1.6) + 1));
  for (let i = 0; i < nB; i++) {
    const col = i % 2, row = Math.floor(i / 2);
    const x = Lf + (-10.6 + col * 1.75), z = bz0 + row * 1.6;   // second column tucked toward the dumbbell racks, clear of the sled turf
    if (colIn(x - 0.8, z - 0.4, x + 0.8, z + 1.1)) continue;
    box(1.2, 0.1, 0.32, '#1c1f2a', x, 0.38, z, 0, B); box(0.06, 0.38, 0.06, '#7a8090', x - 0.45, 0, z, 0, B); box(0.06, 0.38, 0.06, '#7a8090', x + 0.45, 0, z, 0, B); box(0.1, 0.06, 0.4, '#7a8090', x - 0.5, 0, z, 0, B); box(0.1, 0.06, 0.4, '#7a8090', x + 0.5, 0, z, 0, B);
    addStation('bench', 'dumbbells', x, z, 0, { rest: { x: x + 0.3, z: z + 0.7 }, waitBase: { x: x - 0.45, z: z + 0.8 }, waitDir: { x: -0.5, z: 0 } });
    obst(x - 0.55, z - 0.12, x + 0.55, z + 0.12);
  }
  // ---------------- plate-loaded machines + turf lane + pull-up station
  const pz = twoRows ? 1.0 : 0.5, turfZ = twoRows ? -1.6 : -2.6;
  const keepMid = sample || pz - 1.0 > backWait + 0.3, keepTurf = sample || (cfg.turf !== false && turfZ - 0.8 > backEdge + 0.2 && (R + 7.0) - (Lf - 6.2) >= 8 && !colIn(Lf - 7.8, turfZ - 1.3, R + 8.1, turfZ + 1.3));
  const PLATE_M = [['legpress', -4.6], ['hack', -1.6], ['hipthrust', 1.4], ['beltsquat', 4.4]], nP = keepMid ? cfg.plates ?? 4 : 0;
  const plate = (nP === 4 ? PLATE_M : Array.from({ length: nP }, (_, i) => [PLATE_M[i % 4][0], i < 4 ? PLATE_M[i][1] : 4.4 + (i - 3) * 3.0])).map(([t, x]) => [t, Lf + x]).filter(([, x]) => sample || (x + 1.35 <= R + 7.9 && !colIn(x - 0.7, pz - 1.2, x + 1.6, pz + 1.7)));
  for (const [type, x] of plate) {
    if (type === 'legpress') { box(1.1, 0.1, 2.3, '#565c6c', x, 0, pz, 0, B); box(0.6, 0.1, 0.6, '#1c1f2a', x, 0.4, pz - 0.6, 0, B); box(0.6, 0.7, 0.12, '#1c1f2a', x, 0.45, pz - 0.95, 0, { b: EB, rx: -0.6 }); for (const dx of [-0.45, 0.45]) box(0.08, 0.08, 1.6, '#959bab', x + dx, 0.6, pz + 0.45, 0, { b: EB, rx: -0.75 }); obst(x - 0.5, pz + 0.1, x + 0.5, pz + 1.2); }
    if (type === 'hack') { box(1.1, 0.1, 1.9, '#565c6c', x, 0, pz, 0, B); for (const dx of [-0.45, 0.45]) box(0.08, 2.0, 0.08, '#959bab', x + dx, 0, pz - 0.75, 0, { b: EB, rx: 0.35 }); box(0.55, 0.9, 0.1, '#1c1f2a', x, 0.6, pz - 0.6, 0, { b: EB, rx: 0.35 }); obst(x - 0.5, pz - 1.0, x + 0.5, pz - 0.6); }
    if (type === 'hipthrust') { box(1.2, 0.42, 0.35, '#1c1f2a', x, 0, pz - 0.55, 0, B); box(1.3, 0.05, 1.6, '#565c6c', x, 0, pz, 0, B); obst(x - 0.6, pz - 0.75, x + 0.6, pz - 0.38); }
    if (type === 'beltsquat') { box(1.1, 0.12, 1.8, '#565c6c', x, 0, pz, 0, B); box(0.1, 1.0, 0.1, '#7a8090', x, 0, pz + 0.75, 0, B); box(0.8, 0.06, 0.06, '#959bab', x, 1.0, pz + 0.75, 0, B); box(0.14, 0.14, 1.4, '#7a8090', x, 0.12, pz - 0.3, 0, B); obst(x - 0.1, pz + 0.65, x + 0.1, pz + 0.85); }
    addStation(type, 'machines', x, pz, Z_FRONT, { rest: { x: x + 1.3, z: pz + 0.8 }, waitBase: { x: x + 1.35, z: pz + 1.4 }, waitDir: { x: 0, z: 0.55 } });
  }
  if (keepTurf) { box(15 + R - Lf, 0.04, 1.6, '#317033', 0.5 + (R + Lf) / 2, 0.0, turfZ, 0, B); box(0.1, 0.045, 1.6, '#f2f1ea', Lf - 6.6, 0.0, turfZ, 0, B); box(0.1, 0.045, 1.6, '#f2f1ea', R + 7.6, 0.0, turfZ, 0, B);
    addStation('sled', 'other', Lf - 6.2, turfZ, 0, { fit: null, lane: [Lf - 6.2, R + 7.0], sledX: Lf - 5.4, rest: { x: Lf - 7.6, z: turfZ + 1.1 }, waitBase: { x: Lf - 7.4, z: turfZ - 1.05 }, waitDir: { x: 0, z: -0.55 } }); }
  if (keepMid && !colIn(R + 8.9 - 1.6, pz - 0.1, R + 8.9 + 0.9, pz + 2.0)) { const x = R + 8.9, z = pz + 0.2;
    for (const dx of [-0.6, 0.6]) { box(0.076, 2.5, 0.076, '#1c1f2a', x + dx, 0, z, 0, B); box(0.076, 0.076, 0.9, '#1c1f2a', x + dx, 0, z, 0, B); obst(x + dx - 0.12, z - 0.12, x + dx + 0.12, z + 0.12); }
    box(1.3, 0.05, 0.05, '#c4c9d4', x, 2.33, z, 0, B); box(1.28, 0.076, 0.076, '#1c1f2a', x, 2.45, z, 0, B);
    // dip bars: parallel handles 0.56 m apart at 1.25 m, each on its own front and back post
    for (const dx of [-0.28, 0.28]) { box(0.045, 0.045, 0.6, '#c4c9d4', x + dx, 1.23, z + 0.55, 0, B); for (const dz of [0.28, 0.82]) box(0.06, 1.23, 0.06, '#1c1f2a', x + dx * 1.15, 0, z + dz, 0, B); box(0.06, 0.06, 0.6, '#1c1f2a', x + dx * 1.15, 0.0, z + 0.55, 0, B); }
    addStation('pullup', 'other', x, z, Z_FRONT, { rest: { x: x - 1.3, z: z + 0.9 }, waitBase: { x: x - 1.4, z: z + 1.5 }, waitDir: { x: 0, z: 0.55 } }); }
  // ---------------- back zone: power racks + Olympic platforms
  const x0 = bx0, x1 = bx1; const rows = twoRows ? 2 : 1; const perRow = Math.ceil(items.length / rows);
  const pitch = Math.min(3.9, (x1 - x0) / Math.max(1, perRow));
  BACKROW = { z: rowZ[0], rows };
  items.forEach((type, k) => {
    const row = Math.floor(k / perRow), idx = k % perRow;
    const px = x0 + pitch * (idx + 0.5), pz2 = rowZ[row];
    if (colIn(px - 1.3, pz2 - 1.9, px + 1.3, pz2 + 2.5)) return;
    box(2.4, 0.06, 2.4, '#1c1f2a', px, 0, pz2, 0, B); box(1.2, 0.065, 2.38, type === 'rack' ? '#c99a5e' : '#a9733f', px, 0, pz2, 0, B);
    if (type === 'rack') {
      for (const dx of [-0.6, 0.6]) for (const dz of [-1.0, 0.2]) {
        box(0.076, 2.3, 0.076, '#1c1f2a', px + dx, 0.06, pz2 + dz, 0, B); obst(px + dx - 0.1, pz2 + dz - 0.1, px + dx + 0.1, pz2 + dz + 0.1);
        for (let y = 0.5; y < 2.2; y += 0.12) box(0.02, 0.025, 0.08, '#6b7182', px + dx + (dx < 0 ? 0.03 : -0.03), y, pz2 + dz, 0, B);
      }
      for (const dz of [-1.0, 0.2]) box(1.28, 0.076, 0.076, '#1c1f2a', px, 2.32, pz2 + dz, 0, B);
      box(1.25, 0.04, 0.04, '#c4c9d4', px, 2.22, pz2 + 0.32, 0, B);                                            // pull-up bar
      for (const dx of [-0.6, 0.6]) {
        box(0.076, 0.076, 1.28, '#1c1f2a', px + dx, 2.32, pz2 - 0.4, 0, B);
        box(0.03, 0.03, 1.25, '#d6403a', px + dx, 0.62, pz2 - 0.4, 0, B);                                      // safety straps
        box(0.09, 0.1, 0.1, '#c4c9d4', px + dx, 1.2, pz2 + 0.25, 0, B); box(0.09, 0.1, 0.1, '#c4c9d4', px + dx, 0.9, pz2 + 0.25, 0, B); // J-cups
        // weight horns on the rear uprights, with plates stored
        // weight horns: red 25 / blue 20 / yellow 15 / green 10 / charcoal 5 / 2.5
        const hx = px + dx + (dx < 0 ? -0.2 : 0.2), sd = dx < 0 ? -1 : 1;
        const store = dx < 0 ? [[25, 0.32, 2], [15, 0.8, 2], [5, 1.28, 3]] : [[20, 0.32, 2], [10, 0.8, 3], [2.5, 1.28, 2]];
        for (const [w, y, n] of store) {
          box(0.32, 0.05, 0.05, '#c4c9d4', hx, y, pz2 - 1.0, 0, B);
          for (let k = 0; k < n; k++) disc(PLATE[w][1] / 2, PLATE[w][2], PLATE[w][0], hx + sd * (0.05 + k * (PLATE[w][2] + 0.008)), Math.max(y + 0.02, PLATE[w][1] / 2 + 0.07), pz2 - 1.0, 'x', EB);
        }
      }
      addStation('rack', 'racks', px, pz2 - 0.45, Z_FRONT, {
        acc: { x: px, z: pz2 - 0.45 }, hooks: { x: px, z: pz2 + 0.2 }, dl: { x: px, z: pz2 + 0.75 }, bar0: { x: px, z: pz2 + 0.95 },
        rest: { x: px - 0.85, z: pz2 + 1.55 }, waitBase: { x: px + 0.7, z: pz2 + 1.8 }, waitDir: { x: 0, z: 0.55 }, spot: { x: px, z: pz2 + 0.65 }, load: 20, mode: 'squat'
      });
    } else {
      box(1.6, 0.9, 0.35, '#565c6c', px, 0, pz2 - 1.55, 0, B);
      [[20, -0.45], [15, -0.15], [10, 0.15], [5, 0.45]].forEach(([w, dx], ix) => { for (let n = 0; n < 3; n++) disc(0.225, 0.06, PLATE[w][0], px + dx, 0.95 + 0.0, pz2 - 1.55 + (n - 1) * 0.08 + (ix % 2) * 0.04, 'z', EB); });   // alternate stacks 4 cm apart in z so neighbouring plates never share a face plane
      obst(px - 0.8, pz2 - 1.75, px + 0.8, pz2 - 1.35);
      addStation('olyplat', 'platforms', px, pz2 + 0.05, Z_FRONT, { bar0: { x: px, z: pz2 + 0.3 }, rest: { x: px - 0.9, z: pz2 + 1.55 }, waitBase: { x: px + 0.75, z: pz2 + 1.8 }, waitDir: { x: 0, z: 0.55 }, load: 20 });
    }
  });
  CHALK = { x: (x0 + x1) / 2 - 1.2, z: Bk + (twoRows ? -2.9 : -5.3) };
  if (!colIn(CHALK.x - 0.4, CHALK.z - 0.4, CHALK.x + 0.4, CHALK.z + 0.4)) {   cyl(0.06, 0.12, 0.9, 8, '#7a8090', CHALK.x, 0, CHALK.z, B); cyl(0.3, 0.22, 0.18, 10, '#f2f1ea', CHALK.x, 0.9, CHALK.z, B); obst(CHALK.x - 0.3, CHALK.z - 0.3, CHALK.x + 0.3, CHALK.z + 0.3); }
  // barbell holder
  for (let i = 0; i < 6; i++) box(0.04, 1.6, 0.04, '#959bab', Lf + (-11.6 + (i % 3) * 0.08), 0.2, Bk + (-9.4 + Math.floor(i / 3) * 0.08), 0, B);
  box(0.4, 0.2, 0.4, '#565c6c', Lf - 11.52, 0, Bk - 9.36, 0, B); obst(Lf - 11.8, Bk - 9.6, Lf - 11.3, Bk - 9.1);
  // stretch corner
  KIT = [];   /* the chalk stand and barbell holder above belong to no station */
  [[-14.0, -9.1], [-12.6, -9.1], [-14.0, -7.4], [-12.6, -7.4]].map(([x, z]) => [Lf + x, Bk + z]).forEach(([x, z], i) => { box(0.75, 0.04, 1.7, ['#2f68ab', '#8a4f7d', '#448c3a', '#d6403a'][i], x, 0.0, z, 0, B); addStation('mat', 'other', x, z - 0.35, Z_FRONT, { rest: { x: x + 0.6, z }, waitBase: { x: x + 0.7, z: z + 0.9 }, waitDir: { x: 0, z: 0.5 } }); });
  for (let i = 0; i < 4; i++) cyl(0.08, 0.08, 0.45, 8, '#dfe03a', Lf - 11.75, 0.0, Bk + (-8.6 + i * 0.25), { b: EB, rz: Math.PI / 2 });
  EB.flush(EQUIP);
  buildNav();
}

// ================================================================ Plan 11: built halls drawn from a list of pieces; every piece in a local frame whose facing the engine chose
const ROTCS = [[1, 0], [0, 1], [-1, 0], [0, -1]];   /* cos, sin of rot × 90°: the front turns from +z to +x, −z, −x */
function pieceFrame(px, pz, rot, B, EB) {
  const [c, s] = ROTCS[rot], ry = rot * Math.PI / 2;
  const at = (lx, lz) => ({ x: px + (lx * c + lz * s), z: pz + (lz * c - lx * s) }), vec = (v) => ({ x: v.x * c + v.z * s, z: v.z * c - v.x * s });
  const F = {
    rot, at, B, EB, sub: (lx, lz) => { const o = at(lx, lz); return pieceFrame(o.x, o.z, rot, B, EB); },
    box: (w, h, d, col, lx, y, lz, lry = 0, o = B) => { const q = at(lx, lz); box(w, h, d, col, q.x, y, q.z, ry + lry, o); },
    cyl: (rt, rb, h, seg, col, lx, y, lz, o = {}) => { const q = at(lx, lz); cyl(rt, rb, h, seg, col, q.x, y, q.z, { b: EB, ...o, ry: (o.ry || 0) + ry }); },
    disc: (r, t, col, lx, y, lz, axis) => { const q = at(lx, lz); disc(r, t, col, q.x, y, q.z, rot % 2 ? (axis === 'x' ? 'z' : 'x') : axis, EB); },
    geo: (g, lx, y, lz, m) => { const q = at(lx, lz); EB.add(place(g, q.x, y, q.z, ry), mOf(m)); },
    obst: (x0, z0, x1, z1) => { const a = at(x0, z0), b = at(x1, z1); obst(a.x, a.z, b.x, b.z); },
    st: (type, zone, lx, lz, yaw, o = {}) => { const q = at(lx, lz), w = {};
      for (const k in o) w[k] = k === 'waitDir' ? vec(o[k]) : k === 'lane' || k === 'sledX' ? o[k] : (o[k] && typeof o[k] === 'object' && 'x' in o[k]) ? at(o[k].x, o[k].z) : o[k];
      return addStation(type, zone, q.x, q.z, yaw - ry, w); },
  };
  return F;
}
const P2 = (x, z) => ({ x, z });
const STEEL = '#1c1f2a', PAD = '#2f3340', CHROME = '#c4c9d4', SHROUD = '#565c6c';
function stackTowerF(F, h = 2.3) {
  for (const dx of [-0.32, 0.32]) F.box(0.076, h, 0.076, STEEL, dx, 0, 0);
  F.box(0.72, 0.076, 0.076, STEEL, 0, h - 0.076, 0); F.box(0.72, 0.1, 0.5, STEEL, 0, 0, 0);
  for (const dx of [-0.11, 0.11]) F.box(0.025, h - 0.25, 0.025, CHROME, dx, 0.1, 0);
  for (let i = 0; i < 12; i++) F.box(0.36, 0.055, 0.2, i % 2 ? '#2f3340' : '#1c1f2a', 0, 0.12 + i * 0.06, 0);
  for (const dz of [-0.13, 0.13]) F.box(0.6, 1.25, 0.02, SHROUD, 0, 0.1, dz);
  F.cyl(0.075, 0.075, 0.05, 12, CHROME, 0, h - 0.2, 0, { rx: Math.PI / 2 });
}
// drawing origin relative to the footprint's centre (local metres, front +z), so each drawing sits on its footprint
const ORG = { pullup: [0, -0.36], cable: [0, 0.13], turf: [0, 0] };
const DRAW = {
  treadmill(F, type) { F.box(0.85, 0.18, 1.9, '#565c6c', 0, 0, 0); F.box(0.6, 0.02, 1.5, '#0d0f14', 0, 0.18, -0.1); for (const dx of [-0.38, 0.38]) F.box(0.06, 1.2, 0.06, '#959bab', dx, 0.18, 0.8); F.box(0.8, 0.3, 0.2, '#7a8090', 0, 1.3, 0.82); F.box(0.5, 0.18, 0.04, '#13305a', 0, 1.36, 0.71);
    F.st(type, 'cardio', 0, -0.15, Z_FRONT, { rest: P2(0.8, -1.6), waitBase: P2(0.8, -2.2), waitDir: P2(0, -0.6) }); F.obst(-0.42, 0.6, 0.42, 1.0); },
  rower(F, type) { F.box(0.18, 0.12, 2.4, '#959bab', 0, 0.05, 0); F.box(0.5, 0.5, 0.4, '#1c1f2a', 0, 0.1, 1.0); F.disc(0.24, 0.12, '#7a8090', 0, 0.45, 1.0, 'x'); F.box(0.5, 0.06, 0.2, '#1c1f2a', 0, 0.15, 0.6);
    F.st(type, 'cardio', 0, -0.3, Z_FRONT, { rest: P2(0.7, -1.8), waitBase: P2(0.7, -2.4), waitDir: P2(0, -0.6) }); F.obst(-0.3, 0.7, 0.3, 1.25); },
  bike(F, type) { F.box(0.12, 0.08, 1.1, '#7a8090', 0, 0, 0); F.box(0.08, 0.85, 0.08, '#7a8090', 0, 0, -0.25); F.box(0.25, 0.08, 0.3, '#1c1f2a', 0, 0.88, -0.25); F.box(0.08, 1.05, 0.08, '#7a8090', 0, 0, 0.35); F.box(0.5, 0.06, 0.08, '#1c1f2a', 0, 1.05, 0.4);
    if (type === 'airbike') F.disc(0.4, 0.2, '#565c6c', 0, 0.45, 0.55, 'x'); else F.disc(0.2, 0.1, '#6b7182', 0, 0.35, 0.4, 'x');
    F.st(type, 'cardio', 0, -0.25, Z_FRONT, { rest: P2(0.6, -1.6), waitBase: P2(0.6, -2.2), waitDir: P2(0, -0.6) }); F.obst(-0.25, 0.2, 0.25, 0.75); },
  pin(F, type) {
    const T = F.sub(0, -0.95); stackTowerF(T); F.box(0.1, 0.1, 1.3, STEEL, 0, 0, -0.35); F.box(0.6, 0.012, 0.012, '#0d0f14', 0, 2.2, -0.95);
    if (type !== 'row') { F.box(0.076, 0.42, 0.076, STEEL, 0, 0, 0); F.box(0.46, 0.09, 0.42, PAD, 0, 0.42, 0); }
    if (['chestpress', 'pecdeck', 'shoulderpress', 'legext', 'legcurl'].includes(type)) { const tall = type === 'shoulderpress' ? 0.85 : 0.72; F.box(0.076, 0.5 + tall, 0.076, STEEL, 0, 0.3, -0.3); F.box(0.42, tall, 0.09, PAD, 0, 0.6, -0.22); }
    if (type === 'pulldown') { F.box(0.076, 2.5, 0.076, STEEL, 0, 0, -0.62); F.box(0.076, 0.076, 1.2, STEEL, 0, 2.42, -0.4); F.cyl(0.075, 0.075, 0.05, 12, CHROME, 0, 2.33, 0.15, { rz: Math.PI / 2 }); F.box(0.012, 0.012, 1.1, '#0d0f14', 0, 2.4, -0.4); F.box(0.076, 0.7, 0.076, STEEL, 0, 0, 0.34); for (const dx of [-0.2, 0.2]) F.cyl(0.07, 0.07, 0.24, 8, PAD, dx - 0.12, 0.72, 0.32, { rz: Math.PI / 2 }); }
    if (type === 'row') { F.box(0.076, 0.42, 0.076, STEEL, 0, 0, -0.1); F.box(0.42, 0.09, 0.5, PAD, 0, 0.42, -0.1); F.box(0.1, 0.1, 1.2, STEEL, 0, 0, 0.55); F.box(0.52, 0.34, 0.05, '#959bab', 0, 0.04, 0.82); F.box(0.076, 0.42, 0.076, STEEL, 0, 0, 1.1); F.cyl(0.075, 0.075, 0.05, 12, CHROME, 0, 0.26, 1.06, { rz: Math.PI / 2 }); F.box(0.012, 0.012, 2.0, '#0d0f14', 0, 0.11, 0.06); }
    if (['chestpress', 'pecdeck', 'shoulderpress'].includes(type)) { for (const dx of [-0.45, 0.45]) F.box(0.076, 2.0, 0.076, STEEL, dx, 0, -0.5); F.box(0.98, 0.076, 0.076, STEEL, 0, 1.95, -0.5);
      if (type === 'pecdeck') F.box(0.32, 0.076, 0.44, STEEL, 0, 1.9, -0.3); else for (const dx of [-0.38, 0.38]) F.cyl(0.05, 0.05, 0.1, 10, CHROME, dx - 0.05, type === 'shoulderpress' ? 0.98 : 1.88, -0.5, { rz: Math.PI / 2 }); }
    if (type === 'legext' || type === 'legcurl') { F.box(0.1, 0.5, 0.12, STEEL, -0.3, 0.3, 0.42); if (type === 'legcurl') { F.box(0.076, 0.35, 0.076, STEEL, 0.3, 0.42, 0.3); F.box(0.42, 0.09, 0.2, PAD, 0, 0.74, 0.3); } }
    F.st(type, 'machines', 0, 0, Z_FRONT, { rest: P2(0.95, 0.9), waitBase: P2(0.95, 1.5), waitDir: P2(0, 0.55), stackAt: P2(0, -0.95) }); T.obst(-0.4, -0.3, 0.4, 0.3);
  },
  plate(F, type) {
    if (type === 'legpress') { F.box(1.1, 0.1, 2.3, '#565c6c', 0, 0, 0); F.box(0.6, 0.1, 0.6, '#1c1f2a', 0, 0.4, -0.6); F.box(0.6, 0.7, 0.12, '#1c1f2a', 0, 0.45, -0.95, 0, { b: F.EB, rx: -0.6 }); for (const dx of [-0.45, 0.45]) F.box(0.08, 0.08, 1.6, '#959bab', dx, 0.6, 0.45, 0, { b: F.EB, rx: -0.75 }); F.obst(-0.5, 0.1, 0.5, 1.2); }
    if (type === 'hack') { F.box(1.1, 0.1, 1.9, '#565c6c', 0, 0, 0); for (const dx of [-0.45, 0.45]) F.box(0.08, 2.0, 0.08, '#959bab', dx, 0, -0.75, 0, { b: F.EB, rx: 0.35 }); F.box(0.55, 0.9, 0.1, '#1c1f2a', 0, 0.6, -0.6, 0, { b: F.EB, rx: 0.35 }); F.obst(-0.5, -1.0, 0.5, -0.6); }
    if (type === 'hipthrust') { F.box(1.2, 0.42, 0.35, '#1c1f2a', 0, 0, -0.55); F.box(1.3, 0.05, 1.6, '#565c6c', 0, 0, 0); F.obst(-0.6, -0.75, 0.6, -0.38); }
    if (type === 'beltsquat') { F.box(1.1, 0.12, 1.8, '#565c6c', 0, 0, 0); F.box(0.1, 1.0, 0.1, '#7a8090', 0, 0, 0.75); F.box(0.8, 0.06, 0.06, '#959bab', 0, 1.0, 0.75); F.box(0.14, 0.14, 1.4, '#7a8090', 0, 0.12, -0.3); F.obst(-0.1, 0.65, 0.1, 0.85); }
    F.st(type, 'machines', 0, 0, Z_FRONT, { rest: P2(1.0, 0.8), waitBase: P2(1.05, 1.4), waitDir: P2(0, 0.55) });
  },
  rack(F) {
    F.box(2.4, 0.06, 2.4, '#1c1f2a', 0, 0, 0); F.box(1.2, 0.065, 2.38, '#c99a5e', 0, 0, 0);
    for (const dx of [-0.6, 0.6]) for (const dz of [-1.0, 0.2]) { F.box(0.076, 2.3, 0.076, '#1c1f2a', dx, 0.06, dz); F.obst(dx - 0.1, dz - 0.1, dx + 0.1, dz + 0.1); for (let y = 0.5; y < 2.2; y += 0.12) F.box(0.02, 0.025, 0.08, '#6b7182', dx + (dx < 0 ? 0.03 : -0.03), y, dz); }
    for (const dz of [-1.0, 0.2]) F.box(1.28, 0.076, 0.076, '#1c1f2a', 0, 2.32, dz);
    F.box(1.25, 0.04, 0.04, '#c4c9d4', 0, 2.22, 0.32);
    for (const dx of [-0.6, 0.6]) { F.box(0.076, 0.076, 1.28, '#1c1f2a', dx, 2.32, -0.4); F.box(0.03, 0.03, 1.25, '#d6403a', dx, 0.62, -0.4); F.box(0.09, 0.1, 0.1, '#c4c9d4', dx, 1.2, 0.25); F.box(0.09, 0.1, 0.1, '#c4c9d4', dx, 0.9, 0.25);
      const hx = dx + (dx < 0 ? -0.2 : 0.2), sd = dx < 0 ? -1 : 1, store = dx < 0 ? [[25, 0.32, 2], [15, 0.8, 2], [5, 1.28, 3]] : [[20, 0.32, 2], [10, 0.8, 3], [2.5, 1.28, 2]];
      for (const [w, y, n] of store) { F.box(0.32, 0.05, 0.05, '#c4c9d4', hx, y, -1.0); for (let k = 0; k < n; k++) F.disc(PLATE[w][1] / 2, PLATE[w][2], PLATE[w][0], hx + sd * (0.05 + k * (PLATE[w][2] + 0.008)), Math.max(y + 0.02, PLATE[w][1] / 2 + 0.07), -1.0, 'x'); } }
    F.st('rack', 'racks', 0, -0.45, Z_FRONT, { acc: P2(0, -0.45), hooks: P2(0, 0.2), dl: P2(0, 0.75), bar0: P2(0, 0.95), rest: P2(-0.85, 1.55), waitBase: P2(0.7, 1.8), waitDir: P2(0, 0.55), spot: P2(0, 0.65), load: 20, mode: 'squat' });
  },
  olyplat(F) {
    F.box(2.4, 0.06, 2.4, '#1c1f2a', 0, 0, 0); F.box(1.2, 0.065, 2.38, '#a9733f', 0, 0, 0); F.box(1.6, 0.9, 0.35, '#565c6c', 0, 0, -1.15);
    [[20, -0.45], [15, -0.15], [10, 0.15], [5, 0.45]].forEach(([w, dx], ix) => { for (let n = 0; n < 3; n++) F.disc(0.225, 0.06, PLATE[w][0], dx, 0.95, -1.15 + (n - 1) * 0.08 + (ix % 2) * 0.04, 'z'); });
    F.obst(-0.8, -1.35, 0.8, -0.95);
    F.st('olyplat', 'platforms', 0, 0.05, Z_FRONT, { bar0: P2(0, 0.3), rest: P2(-0.9, 1.55), waitBase: P2(0.75, 1.8), waitDir: P2(0, 0.55), load: 20 });
  },
  bench(F) { F.box(1.2, 0.1, 0.32, '#1c1f2a', 0, 0.38, 0); F.box(0.06, 0.38, 0.06, '#7a8090', -0.45, 0, 0); F.box(0.06, 0.38, 0.06, '#7a8090', 0.45, 0, 0); F.box(0.1, 0.06, 0.4, '#7a8090', -0.5, 0, 0); F.box(0.1, 0.06, 0.4, '#7a8090', 0.5, 0, 0);
    F.st('bench', 'dumbbells', 0, 0, 0, { rest: P2(0.3, 0.7), waitBase: P2(-0.45, 0.8), waitDir: P2(-0.5, 0) }); F.obst(-0.55, -0.12, 0.55, 0.12); },
  dbrack(F) {   /* a 3.3 m two-tier run along local z, the lifters stand on its +x side */
    const z0 = -1.65, z1 = 1.65, len = z1 - z0; let w = 2.5;
    for (const zz of [z0 + 0.05, z1 - 0.05]) { F.box(0.06, 0.9, 0.06, STEEL, -0.3, 0, zz); F.box(0.06, 0.6, 0.06, STEEL, 0.3, 0, zz); F.box(0.7, 0.06, 0.06, STEEL, 0, 0, zz); }
    F.box(0.36, 0.04, len, STEEL, 0.17, 0.5, 0, 0, { b: F.B.b, rz: -0.12 }); F.box(0.36, 0.04, len, STEEL, -0.2, 0.86, 0, 0, { b: F.B.b, rz: -0.12 });
    for (const [tier, cx] of [[0.9, -0.2], [0.54, 0.17]]) { const slot = (len - 0.2) / 5;
      for (let p = 0; p < 5; p++) { const r = 0.065 + w * 0.0012, hl = 0.05 + w * 0.0016; let z = z0 + 0.1 + p * slot + (slot - 4 * r - 0.015) / 2;
        for (let n = 0; n < 2; n++) { const zz = z + r; F.disc(0.018, 0.14, CHROME, cx, tier + r, zz, 'x');
          for (const sd of [-1, 1]) { const g = new THREE.CylinderGeometry(r, r, hl, 6); g.rotateZ(Math.PI / 2); F.geo(g, cx + sd * (0.07 + hl / 2), tier + r, zz, '#3b3f4c'); F.disc(r * 0.45, 0.012, '#959bab', cx + sd * (0.07 + hl + 0.006), tier + r, zz, 'x'); }
          z += 2 * r + 0.015; }
        w += 2.5; } }
    F.obst(-0.45, z0, 0.4, z1);
    const [s1, s2] = [-0.8, 0.8].map(z => F.st('dbspot', 'dumbbells', 1.0, z, Math.PI, { rest: P2(1.6, z + 0.45), waitBase: P2(1.35, z + 0.2), waitDir: P2(0.2, 0.15) }));   /* owner 2026-11-15: a short queue that stays inside the rack's 1.8 m of clear floor */
    if (s1.fit) { const B = s1.fit, f = [Math.cos(s1.yaw), Math.sin(s1.yaw)], r = [-Math.sin(s1.yaw), Math.cos(s1.yaw)], cx = s1.x + f[0] * B.ca + r[0] * B.cc - s2.x, cz = s1.z + f[1] * B.ca + r[1] * B.cc - s2.z;
      s2.fit = { ...B, ca: cx * f[0] + cz * f[1], cc: cx * r[0] + cz * r[1] }; }   /* owner 2026-11-15: both spots outline the rack itself, not the empty floor beside it */
  },
  cable(F) {
    for (const dx of [-1.8, 1.8]) { stackTowerF(F.sub(dx, -0.3), 2.45); const U = F.sub(dx, 0); for (const ddx of [-0.32, 0.32]) U.box(0.076, 2.45, 0.076, STEEL, ddx, 0, 0.2); U.obst(-0.4, -0.6, 0.4, 0.3); F.cyl(0.075, 0.075, 0.05, 12, CHROME, dx * 0.92, 2.1, 0.2, { rx: Math.PI / 2 }); }
    F.box(3.9, 0.076, 0.076, STEEL, 0, 2.42, 0.2); F.box(2.2, 0.05, 0.05, CHROME, 0, 2.3, 0.35);
    F.st('cable', 'machines', 0, -0.1, Z_FRONT, { rest: P2(0, 1.2), waitBase: P2(0.7, 1.4), waitDir: P2(0, 0.55), stackAt: P2(-1.8, -0.3), stackAt2: P2(1.8, -0.3) });
  },
  pullup(F) {
    for (const dx of [-0.6, 0.6]) { F.box(0.076, 2.5, 0.076, '#1c1f2a', dx, 0, 0); F.box(0.076, 0.076, 0.9, '#1c1f2a', dx, 0, 0); F.obst(dx - 0.12, -0.12, dx + 0.12, 0.12); }
    F.box(1.3, 0.05, 0.05, '#c4c9d4', 0, 2.33, 0); F.box(1.28, 0.076, 0.076, '#1c1f2a', 0, 2.45, 0);
    for (const dx of [-0.28, 0.28]) { F.box(0.045, 0.045, 0.6, '#c4c9d4', dx, 1.23, 0.55); for (const dz of [0.28, 0.82]) F.box(0.06, 1.23, 0.06, '#1c1f2a', dx * 1.15, 0, dz); F.box(0.06, 0.06, 0.6, '#1c1f2a', dx * 1.15, 0.0, 0.55); }
    F.st('pullup', 'other', 0, 0, Z_FRONT, { rest: P2(-1.0, 0.9), waitBase: P2(-1.1, 1.5), waitDir: P2(0, 0.55) });
  },
  mat(F, type, i) { F.box(0.75, 0.04, 1.7, ['#2f68ab', '#8a4f7d', '#448c3a', '#d6403a'][i % 4], 0, 0.0, 0); F.st('mat', 'other', 0, -0.35, Z_FRONT, { rest: P2(0.6, 0), waitBase: P2(0.3, 1.2), waitDir: P2(0, 0.45) }); },   /* owner 2026-11-15: the queue stands in front of the mat, inside its clear floor */
  turf(F) {   /* the sled lane runs along local x (facing 0 only: the sled moves along world x) */
    const L = 24 * SUB, a = -L / 2;
    F.box(L, 0.04, 1.6, '#317033', 0, 0.0, 0); F.box(0.1, 0.045, 1.6, '#f2f1ea', a + 0.4, 0.0, 0); F.box(0.1, 0.045, 1.6, '#f2f1ea', -a - 0.4, 0.0, 0);
    const p0 = F.at(a + 0.8, 0), p1 = F.at(-a - 1.0, 0);
    F.st('sled', 'other', a + 0.8, 0, 0, { lane: [p0.x, p1.x], sledX: p0.x + 0.8, rest: P2(a + 1.0, 1.4), waitBase: P2(a + 2.0, -1.3), waitDir: P2(-0.55, 0) });   /* the queue lines up behind the start line, along the lane */
  },
};
const DRAW_OF = (kind) => ({ treadmill: 'treadmill', rower: 'rower', bike: 'bike', airbike: 'bike', rack: 'rack', olyplat: 'olyplat', bench: 'bench', dbrack: 'dbrack', cable: 'cable', pullup: 'pullup', mat: 'mat', turf: 'turf' })[kind] || (KINDS[kind].cat === 'plates' ? 'plate' : 'pin');
function buildLayoutGrid(cfg) {
  EQUIP.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  world.remove(EQUIP); EQUIP = new THREE.Group(); world.add(EQUIP);
  STATIONS = []; OBST = [];
  const EB = new Builder(), B = { b: EB };
  let racksLeft = cfg.racks != null ? cfg.racks : Infinity, mats = 0;   /* the broken-rack scenario lays out one rack fewer */
  for (const p of cfg.layout.pieces) {
    if (p.kind === 'rack' && racksLeft-- <= 0) continue;
    const f = footprint(p), o = ORG[p.kind] || [0, 0], C = pieceFrame(HALL.x0 + (f.x0 + f.x1) / 2 * SUB, HALL.zb + (f.z0 + f.z1) / 2 * SUB, p.rot, B, EB);
    DRAW[DRAW_OF(p.kind)](C.sub(o[0], o[1]), p.kind, p.kind === 'mat' ? mats++ : 0);
  }
  const db = cfg.layout.pieces.filter(p => p.kind === 'dbrack').map(footprint);
  DBZONE = db.length ? { x: HALL.x0 + (db[0].x1 + 0.6) * SUB, zc: HALL.zb + (db[0].z0 + db[0].z1) / 2 * SUB, span: 2 } : { x: HALL.x0 + 1.4, zc: (HALL.zb + HZ) / 2, span: 1 };
  const r0 = STATIONS.find(s => s.type === 'rack'); CHALK = r0 ? { x: r0.x - 1.2, z: r0.z + 2.4 } : { x: HALL.x0 + 2, z: HALL.zb + 2 };
  BACKROW = { z: r0 ? r0.z : HALL.zb + 2, rows: 1 };
  EB.flush(EQUIP);
  buildNav();
}

// ================================================================ navigation grid + A*
const NAV = { x0: -37, z0: -27, cs: 0.5, w: 148, h: 124 };
let navBlock = new Uint8Array(NAV.w * NAV.h);
const cellOf = (x, z) => [Math.floor((x - NAV.x0) / NAV.cs), Math.floor((z - NAV.z0) / NAV.cs)];
const cellC = (i, j) => [NAV.x0 + (i + 0.5) * NAV.cs, NAV.z0 + (j + 0.5) * NAV.cs];
function blockRect(x0, z0, x1, z1, v = 1) {
  const [i0, j0] = cellOf(x0, z0), [i1, j1] = cellOf(x1, z1);
  for (let j = Math.max(0, j0); j <= Math.min(NAV.h - 1, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(NAV.w - 1, i1); i++) navBlock[j * NAV.w + i] = v;
}
function buildNav() {
  navBlock.fill(0);
  for (let j = 0; j < NAV.h; j++) for (let i = 0; i < NAV.w; i++) { const [x, z] = cellC(i, j); if (!inIsland(x, z) || !inIsland(x * 0.96, (z - 4) * 0.96 + 4)) navBlock[j * NAV.w + i] = 1; }
  // hall walls with the door gap
  const { x0: hx0, x1: hx1, zb } = HALL, { R, Lf } = hallShift();   /* hall walls from HALL; fixtures at today's coordinates plus the shift of their wall */
  blockRect(hx0 - 0.2, zb - 0.2, hx1 + 0.2, zb + 0.15); blockRect(hx0 - 0.2, zb, hx0 + 0.15, HZ);
  blockRect(hx1 - 0.15, zb, hx1 + 0.2, HZ); blockRect(hx0, HZ - 0.15, DOOR.x - 0.8, HZ + 0.2); blockRect(DOOR.x + 0.8, HZ - 0.15, hx1, HZ + 0.2);
  // changing room walls (door on the west wall), lockers, benches
  // two washrooms: west wall with two doors, divider, lockers, benches, cubicles and showers (Plan 7b)
  blockRect(CHG.x0 - 0.15, CHG.z0, CHG.x0 + 0.15, CHG.doorM - 0.6); blockRect(CHG.x0 - 0.15, CHG.doorM + 0.6, CHG.x0 + 0.15, CHG.doorF - 0.6); blockRect(CHG.x0 - 0.15, CHG.doorF + 0.6, CHG.x0 + 0.15, CHG.z1);
  blockRect(CHG.x0, CHG.z0 - 0.15, CHG.x1, CHG.z0 + 0.15); blockRect(CHG.x0, CHG.z1 - 0.15, CHG.x1, CHG.z1 + 0.15); blockRect(CHG.x0, CHG.mid - 0.15, CHG.x1, CHG.mid + 0.15);
  const dz = CHG_DZ;   /* 0 in the sample hall; a built hall's washrooms sit in the back corner */
  blockRect(hx1 - 0.85, CHG.z0, hx1, CHG.z1); blockRect(R + 12.55, -1.4 + dz, R + 13.05, -0.5 + dz); blockRect(R + 12.55, 3.9 + dz, R + 13.05, 4.7 + dz);
  blockRect(R + 11.1, -2.1 + dz, R + 12.2, -1.2 + dz); blockRect(R + 11.1, 0.9 + dz, R + 12.1, 1.5 + dz); blockRect(R + 11.1, 4.2 + dz, R + 12.2, 5.1 + dz); blockRect(R + 11.1, 1.7 + dz, R + 12.1, 2.3 + dz);
  // desk, turnstile posts, fountain, boards, mirror
  blockRect(R + 13.15, 6.15, R + 14.05, 8.65); blockRect(DOOR.x - 0.9, 7.9, DOOR.x - 0.6, 8.5); blockRect(DOOR.x + 0.6, 7.9, DOOR.x + 0.9, 8.5);
  blockRect(R + 10.4, 5.55, R + 10.9, 6.05); if (HALL.w == null) { blockRect(Lf - 14.2, WB_AT.z - 0.15, Lf - 11.8, WB_AT.z + 0.15); blockRect(Lf - 11.7, PRB_AT.z - 0.15, Lf - 9.1, PRB_AT.z + 0.15); }   /* a built hall hangs them on the back wall */
  // outside: bus shelter, bike rack, lamps, trees
  blockRect(BUS_STOP.x - 1.6, BUS_STOP.z - 0.75, BUS_STOP.x + 1.6, BUS_STOP.z - 0.55);
  for (const t of TREES) blockRect(t.x - 0.5, t.z - 0.5, t.x + 0.5, t.z + 0.5);
  for (const l of lotLights) blockRect(l.position.x - 0.15, l.position.z - 0.15, l.position.x + 0.15, l.position.z + 0.15);
  for (const [a, b, c, d] of OBST) blockRect(a, b, c, d);
  // keep every station spot reachable
  for (const s of STATIONS) for (const p of [s.acc, s.rest, s.waitBase, s.dl, s.spot]) if (p) blockRect(p.x - 0.2, p.z - 0.2, p.x + 0.2, p.z + 0.2, 0);
  for (const c of COLUMNS) blockRect(c.x - COL_SIZE / 2, c.z - COL_SIZE / 2, c.x + COL_SIZE / 2, c.z + COL_SIZE / 2);   /* structural columns, last: nothing re-opens them */
}
const _open = new Int32Array(NAV.w * NAV.h), _g = new Float32Array(NAV.w * NAV.h), _par = new Int32Array(NAV.w * NAV.h), _stamp = new Uint32Array(NAV.w * NAV.h), _closed = new Uint32Array(NAV.w * NAV.h);
let _gen = 1; const heapF = new Float32Array(NAV.w * NAV.h); let heapN = 0;
function hpush(n, f) { let i = heapN++; _open[i] = n; heapF[i] = f; while (i > 0) { const p = (i - 1) >> 1; if (heapF[p] <= heapF[i]) break; [_open[p], _open[i]] = [_open[i], _open[p]]; [heapF[p], heapF[i]] = [heapF[i], heapF[p]]; i = p; } }
function hpop() { const top = _open[0]; heapN--; if (heapN > 0) { _open[0] = _open[heapN]; heapF[0] = heapF[heapN]; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heapN && heapF[l] < heapF[m]) m = l; if (r < heapN && heapF[r] < heapF[m]) m = r; if (m === i) break; [_open[m], _open[i]] = [_open[i], _open[m]]; [heapF[m], heapF[i]] = [heapF[i], heapF[m]]; i = m; } } return top; }
function nearestFree(i, j) { for (let r = 0; r < 8; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { const a = i + di, b = j + dj; if (a >= 0 && b >= 0 && a < NAV.w && b < NAV.h && !navBlock[b * NAV.w + a]) return [a, b]; } return [i, j]; }
function losClear(x0, z0, x1, z1) {
  const d = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(d / (NAV.cs * 0.5));
  for (let k = 1; k < n; k++) { const t = k / n; const [i, j] = cellOf(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t); if (i < 0 || j < 0 || i >= NAV.w || j >= NAV.h || navBlock[j * NAV.w + i]) return false; }
  return true;
}
function findPath(x0, z0, x1, z1) {
  if (losClear(x0, z0, x1, z1)) return [{ x: x1, z: z1 }];
  let [si, sj] = cellOf(x0, z0), [ti, tj] = cellOf(x1, z1);
  [si, sj] = nearestFree(si, sj); [ti, tj] = nearestFree(ti, tj);
  const W = NAV.w, s = sj * W + si, tgt = tj * W + ti;
  _gen++; heapN = 0; _g[s] = 0; _stamp[s] = _gen; _par[s] = -1; hpush(s, 0);
  const D = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
  let found = false, it = 0;
  while (heapN > 0 && it++ < 40000) {
    const n = hpop(); if (_closed[n] === _gen) continue; _closed[n] = _gen;
    if (n === tgt) { found = true; break; }
    const ni = n % W, nj = (n / W) | 0;
    for (const [di, dj, c] of D) {
      const a = ni + di, b = nj + dj; if (a < 0 || b < 0 || a >= W || b >= NAV.h) continue;
      const m = b * W + a; if (navBlock[m] || _closed[m] === _gen) continue;
      if (di && dj && (navBlock[nj * W + a] || navBlock[b * W + ni])) continue;
      const g = _g[n] + c;
      if (_stamp[m] !== _gen || g < _g[m]) { _stamp[m] = _gen; _g[m] = g; _par[m] = n; const dx = Math.abs(a - ti), dz = Math.abs(b - tj); hpush(m, g + Math.max(dx, dz) + 0.414 * Math.min(dx, dz)); }
    }
  }
  if (!found) return [{ x: x1, z: z1 }];
  const cells = []; for (let n = tgt; n !== -1; n = _par[n]) cells.push(n); cells.reverse();
  const pts = cells.map(n => { const [x, z] = cellC(n % W, (n / W) | 0); return { x, z }; });
  pts[pts.length - 1] = { x: x1, z: z1 };
  // string pulling
  const out = []; let cx = x0, cz = z0, k = 0;
  while (k < pts.length - 1) { let far = k; for (let m = pts.length - 1; m > k; m--) { if (losClear(cx, cz, pts[m].x, pts[m].z)) { far = m; break; } } if (far === k) far = k + 1; out.push(pts[far]); cx = pts[far].x; cz = pts[far].z; k = far; }
  if (!out.length) out.push({ x: x1, z: z1 });
  return out;
}
