
// ================================================================ settings (live ones are read every step; the rest apply on Setup)
const S = {
  seed: 20261112, month: 'Jun', year: 2027, startDay: 1, /* the opening date: boot sets today's (tests keep 1 Jun 2027) */ peak: DEMAND.peak, visit: DEMAND.stay, weather: 'Clear', setting: 'Urban',
  mix: (({ coach, ...m }) => m)(defaultMix(0)),   // four archetypes in whole percents summing to 100; coaching comes from PT client records
  patience: 5, workIn: 30, rest: 2.5, rerack: 75,
  racks: 6, plats: 2, benches: 6, cardio: 9, machines: 7, plates: 4, hallW: null, hallD: null, /* hallW x hallD cells: a built gym (Plan 8); null = the sample gym */ cleaners: 1, cap: 60, curls: false, speed: 30, turf: true, layout: null, /* a built gym's pieces (Plan 11); null: laid out by zones */ /* a built gym's turf and sled lane (owner 2026-11-15) */
  priceOff: 1.2, pricePeak: 1.5, priceCap: 180,   // NT$ per minute off-peak and peak, cap per visit (P3.1–P3.3; same as PRICE); live: bill at once, members react from the next morning
  build: 'existing', monthsOpen: 1, shock: 'none',   // new-build ramp-up (P4.13, P4.16) and shocks (D8): engine settings with no control yet
  ptClients: 22, outsideClients: 10, rentP: 250, allowOutside: true,   // floor rental NT$ per 90 min (P3.10) and whether freelancers may rent (setup)   // in-house PT clients (P5.10) and members training with outside coaches (P5.6 ÷ visits)
  area: COSTS.area, rentRate: COSTS.rentRate, staff: COSTS.staff,   // live P&L settings (the floor plan does not change with area)
  finOwn: FIN.own, finLoan: FIN.loan, finRate: FIN.rate, finYears: FIN.years   // financing at opening (B3, setup)
};
const SETUP_KEYS = ['seed', 'month', 'peak', 'visit', 'mix', 'racks', 'plats', 'benches', 'cardio', 'machines', 'plates', 'hallW', 'hallD', 'turf', 'layout', 'weather', 'setting', 'ptClients', 'outsideClients', 'rentP', 'allowOutside', 'build', 'monthsOpen', 'shock', 'finOwn', 'finLoan', 'finRate', 'finYears'];
// how members get here, by setting: cumulative [scooter, bus, walk], the rest are dropped off by car
const MODES = { Urban: [[0.45, 0.7, 0.9], [0.3, 0.65, 0.8]], Suburban: [[0.5, 0.62, 0.72], [0.35, 0.5, 0.58]], Rural: [[0.62, 0.7, 0.76], [0.48, 0.58, 0.63]] };
const BUS_GAP = { Urban: 12, Suburban: 20, Rural: 30 };
const LIFTS = {
  squat: { name: 'Squat', types: ['rack'], alts: ['hack', 'beltsquat', 'legpress'], kind: 'bar', rep: 3.6 },
  frontsquat: { name: 'Front squat', types: ['rack'], alts: ['hack', 'legpress'], kind: 'bar', rep: 3.6, anim: 'squat' },
  bench: { name: 'Bench press', types: ['rack'], alts: ['chestpress', 'dbbench'], kind: 'bar', rep: 3.0 },
  deadlift: { name: 'Deadlift', types: ['rack', 'olyplat'], alts: ['hipthrust', 'beltsquat'], kind: 'bar', rep: 3.6 },
  ohp: { name: 'Overhead press', types: ['rack'], alts: ['dbpress'], kind: 'bar', rep: 2.8 },
  rackcurl: { name: 'Curls (in the rack)', types: ['rack'], alts: ['dbcurl'], kind: 'bar', rep: 2.4, anim: 'curl' },
  snatch: { name: 'Snatch', types: ['olyplat'], alts: ['deadlift'], kind: 'bar', rep: 5, bumper: true },
  cleanjerk: { name: 'Clean & jerk', types: ['olyplat'], alts: ['deadlift'], kind: 'bar', rep: 7, bumper: true, anim: 'cj' },
  dbbench: { name: 'DB bench', types: ['bench'], alts: ['chestpress'], kind: 'db', rep: 3 },
  dbpress: { name: 'DB shoulder press', types: ['bench'], alts: ['shoulderpress', 'chestpress'], kind: 'db', rep: 2.8 },
  dbcurl: { name: 'DB curl', types: ['dbspot'], alts: ['cablefly'], kind: 'db', rep: 2.4 },
  lateral: { name: 'Lateral raise', types: ['dbspot'], alts: ['cablefly'], kind: 'db', rep: 2.4 },
  cablefly: { name: 'Cable fly', types: ['cable'], alts: ['pecdeck'], kind: 'stack', rep: 2.8 },
  pulldown: { name: 'Lat pulldown', types: ['pulldown'], alts: ['pullup', 'row'], kind: 'stack', rep: 2.8 },
  row: { name: 'Seated row', types: ['row'], alts: ['pulldown'], kind: 'stack', rep: 2.8 },
  chestpress: { name: 'Chest press', types: ['chestpress'], alts: ['pecdeck', 'dbbench'], kind: 'stack', rep: 2.8 },
  shoulderpress: { name: 'Shoulder press', types: ['shoulderpress'], alts: ['dbpress', 'chestpress'], kind: 'stack', rep: 2.8 },
  pecdeck: { name: 'Pec deck', types: ['pecdeck'], alts: ['cablefly'], kind: 'stack', rep: 2.8 },
  legext: { name: 'Leg extension', types: ['legext'], alts: ['legcurl', 'legpress'], kind: 'stack', rep: 2.6 },
  legcurl: { name: 'Leg curl', types: ['legcurl'], alts: ['legext'], kind: 'stack', rep: 2.6 },
  legpress: { name: 'Leg press', types: ['legpress'], alts: ['hack', 'beltsquat'], kind: 'plate', rep: 3.2 },
  hack: { name: 'Hack squat', types: ['hack'], alts: ['legpress'], kind: 'plate', rep: 3.4 },
  hipthrust: { name: 'Hip thrust', types: ['hipthrust'], alts: ['legpress'], kind: 'plate', rep: 3 },
  beltsquat: { name: 'Belt squat', types: ['beltsquat'], alts: ['legpress'], kind: 'plate', rep: 3.4 },
  pullup: { name: 'Pull-up', types: ['pullup'], alts: ['pulldown'], kind: 'bw', rep: 2.8 },
  dip: { name: 'Dip', types: ['pullup'], alts: ['chestpress'], kind: 'bw', rep: 2.4 },
  sled: { name: 'Sled push', types: ['sled'], alts: ['legpress'], kind: 'sled', rep: 0 },
  cardio: { name: 'Cardio', types: ['treadmill', 'bike', 'rower', 'airbike'], alts: [], kind: 'cardio' },
  stretch: { name: 'Stretching', types: ['mat'], alts: [], kind: 'mat' }
};
const FIRST = ['Mara', 'Teo', 'Ines', 'Ravi', 'Juno', 'Kofi', 'Lena', 'Omar', 'Pia', 'Sami', 'Noor', 'Eli', 'Ada', 'Bram', 'Cleo', 'Dev', 'Esme', 'Finn', 'Gia', 'Hugo', 'Iris', 'Jae', 'Kira', 'Luca', 'Mina', 'Nico', 'Oona', 'Pax', 'Rhea', 'Sol', 'Tavi', 'Uma', 'Vik', 'Wren', 'Yara', 'Zed', 'Ayo', 'Bea', 'Cai', 'Dara', 'Emi', 'Fela', 'Gus', 'Hana', 'Ivo', 'Jin', 'Kai', 'Lio', 'Maya', 'Nell', 'Otto', 'Priya', 'Quin', 'Rosa', 'Tomas', 'Vera', 'Wim', 'Xan', 'Yosef', 'Zola'];
const SHIRTS = ['#d6403a', '#2f68ab', '#f2f1ea', '#dfe03a', '#63a845', '#d07a8e', '#e08f5a', '#74abe0', '#8a4f7d', '#1c1f2a', '#959bab', '#2c6a52', '#9b2226', '#f0a060'];
const SKINS = ['#f0caa4', '#d9a77e', '#b5805a', '#8a5a3c', '#5a3825'];
const HAIRS = ['#1c1f2a', '#45291b', '#643c24', '#c99a5e', '#959bab', '#2b1a12', '#9b2226'];

// ================================================================ agents
const AGENTS = [];
class Agent {
  constructor(kind, look, name) {
    this.kind = kind; this.look = look; this.name = name;
    this.pos = new V3(); this.yaw = 0; this.vx = 0; this.vz = 0; this.path = null; this.pi = 0; this.speed = 1.3;
    this.visible = false; this.state = 'pending'; this.t0 = 0; this.act = { k: 'idle' };
    this.P = newPose(); this.vis = { hy: 0, phase: Math.random() * 6, walkW: 0, rep: 0, clap: 0, cheer: 0 };
  }
}
function go(a, x, z) { a.path = findPath(a.pos.x, a.pos.z, x, z); a.pi = 0; a.dest = { x, z }; }
// walk to a locker through the washroom door: three short searches (to the door, through it, to the locker) instead of one long one that floods the hall
function goLocker(a, L) {
  const z = a.female ? CHG.doorF : CHG.doorM, out = { x: CHG.x0 - 0.5, z }, inn = { x: CHG.x0 + 0.6, z };
  const path = [...findPath(a.pos.x, a.pos.z, out.x, out.z), ...findPath(out.x, out.z, inn.x, inn.z), ...findPath(inn.x, inn.z, L.x, L.z)];
  a.path = path; a.pi = 0; a.dest = { x: L.x, z: L.z };
}
function moving(a) { return !!a.path; }
function stepMove(a, dt) {
  if (!a.path) { a.vx = a.vz = 0; return; }
  let budget = a.speed * dt;
  while (budget > 0 && a.path) {
    const p = a.path[a.pi]; const dx = p.x - a.pos.x, dz = p.z - a.pos.z, d = Math.hypot(dx, dz);
    if (d <= budget) { a.pos.x = p.x; a.pos.z = p.z; budget -= d; a.pi++; if (a.pi >= a.path.length) a.path = null; }
    else { a.pos.x += dx / d * budget; a.pos.z += dz / d * budget; a.vx = dx / d * a.speed; a.vz = dz / d * a.speed; a.yaw = Math.atan2(dz, dx); budget = 0; }
  }
  if (!a.path) { a.vx = a.vz = 0; }
  a.pos.y = 0;
}
function faceTo(a, x, z) { a.yaw = Math.atan2(z - a.pos.z, x - a.pos.x); }
function at(a, p, r = 0.15) { return Math.hypot(a.pos.x - p.x, a.pos.z - p.z) < r; }

// ================================================================ run state
let A = null;
const HIST = [];
// DOOR_OUT, DOOR_IN, DESK_PT and CHG_DOOR live with the hall (c_world.js hallAnchors)
const T_OPEN = 7 * 3600, T_CLOSE = 24 * 3600, T_START = 6.75 * 3600;
const hhmm = (t) => { const h = Math.floor(t / 3600) % 24, m = Math.floor(t % 3600 / 60); return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'); };
// ================================================================ money (Taipei per-minute defaults, NT$)
const PRICE = { off: 1.2, peak: 1.5, peakFrom: 18, peakTo: 22, cap: 180 };   // peak is weekday evenings only
function visitFee(t0, t1) {
  const peakDay = A.dow !== 'Sat' && A.dow !== 'Sun';   // peak pricing Mon–Fri 18:00–22:00 (P3.2), by the day being played
  let fee = 0, pk = 0;
  for (let t = t0; t < t1; t += 60) { const h = Math.floor(t / 3600) % 24, peak = peakDay && h >= PRICE.peakFrom && h < PRICE.peakTo, f = (peak ? S.pricePeak : S.priceOff) * Math.min(60, t1 - t) / 60; fee += f; if (peak) pk += f; }
  visitFee.peakPart = fee > 0 ? pk / fee : 0;   // share of this visit billed at the peak rate (the cap scales both parts alike)
  return Math.min(S.priceCap, Math.round(fee));
}
function chargeOut(a) {   // billed once, as the member walks out past the desk
  if (a.paid || !a.tDoor) return;
  a.paid = true; a.fee = a.rec ? applyVoucher(a.rec, visitFee(a.tDoor, A.t)) : visitFee(a.tDoor, A.t);   /* Plan 9: a voucher comes off the fee */ A.feePeak = (A.feePeak || 0) + a.fee * visitFee.peakPart; A.paidVisits = (A.paidVisits || 0) + 1; A.blendSum = (A.blendSum || 0) + blendedPrice(S.priceOff, S.pricePeak);
  if (a.rec && !a.rec.card) { a.rec.card = true; A.cards = (A.cards || 0) + CHURN.card; A.payQ = A.payQ || []; A.payQ.push({ a, fee: CHURN.card }); }   // NT$100 member card (P3.5)
  A.rev = (A.rev || 0) + a.fee;
  A.payQ = A.payQ || []; if (a.fee > 0) A.payQ.push({ a, fee: a.fee, min: Math.round((A.t - a.tDoor) / 60) });   /* a visit a voucher paid in full shows no +$0 */
  const pt = a.rec && a.rec.pt;
  if (a.coach && !a.coach.outside && pt && pt.left > 0) { const per = pt.price / pt.n; A.ptSessions++; A.ptEarnedToday += per; A.ptPrices.push(per); A.deferred -= per; pt.left--; }   // a session delivered at this client's pack price
  if (a.coach && a.coach.outside) {   // outside coach: floor rental per 90 min started, plus the coach's own per-minute entry
    const min = (A.t - a.tDoor) / 60, rent = A.cfg.rentP * Math.max(1, Math.ceil(min / 90)), entry = visitFee(a.tDoor, A.t); A.feePeak = (A.feePeak || 0) + entry * visitFee.peakPart;
    A.rev += rent + entry; A.rentRev = (A.rentRev || 0) + rent; A.rentN = (A.rentN || 0) + 1;
    A.payQ.push({ a, fee: entry, min: Math.round(min) }, { a, fee: rent, rent: true });
  }
  // a client who has used the last session renews half the time (P5.12); a member without a coach occasionally starts PT
  else if (a.rec && (pt ? pt.left <= 0 && a.rng() < PT.renew : !a.rec.outside && a.rng() < PT.convert)) {
    const pk = PT_PACKS[pickPack(a.rng())];   // one draw: 45% pack of 8, 37% of 16, 18% of 24
    const inst = pk.parts.length > 1 && a.rng() < 0.5;   // half spread the bigger packs over instalments
    const paid = inst ? pk.parts[0] : pk.price;
    A.rev += paid; A.ptRev = (A.ptRev || 0) + paid; A.packs = (A.packs || 0) + 1; A.ptOwed = (A.ptOwed || 0) + pk.n;
    a.rec.pt = { n: pk.n, left: pk.n, price: pk.price }; A.deferred += pk.price;   // the gym now owes these sessions
    if (inst) M.ptDue = (M.ptDue || 0) + pk.price - paid;                       // later instalments
    A.payQ.push({ a, fee: paid, pt: { n: pk.n, inst: inst ? `1/${pk.parts.length}` : '' } });
  }
  else if (pt && pt.left <= 0) a.rec.pt = null;   // pack finished, not renewed
}
function owedValue() { return M ? M.pool.concat(M.lapsed).reduce((t, m) => t + (m.pt ? m.pt.left * m.pt.price / m.pt.n : 0), 0) : 0; }
// outside (freelance) coaches renting the floor: share of coached sessions, and rental per 90 min by headcount 1-2,3,4,5-6,7,8,9,10 (LINE, 2026-11)
const OUTSIDE_SHARE = outsideShare();   // rentals / (PT sessions + rentals) a month
const RENT_90 = [250, 350, 450, 550, 650, 750, 850, 950];
// PT packages, cash or transfer (gym's LINE price list, 2026-11): 16 and 24 can be paid in instalments
const PT_PACKS = [
  { n: 8, price: 13520, parts: [13520] },
  { n: 16, price: 25440, parts: [13520, 11920] },
  { n: 24, price: 35760, parts: [13520, 11920, 10320] }
];
function round25(x) { return Math.max(20, Math.round(x / 2.5) * 2.5); }
function makeLook(rng, female, kind) {
  const look = { shirt: rng.pick(SHIRTS), shorts: rng.pick(['#1c1f2a', '#474c5c', '#1e4a85', '#2f3340', '#5c1418']), skin: rng.pick(SKINS), hair: rng.pick(HAIRS), shoe: rng.pick(['#f2f1ea', '#1c1f2a', '#d6403a', '#2f68ab']), scale: female ? rng.range(0.9, 0.98) : rng.range(0.97, 1.06) };
  if (female && rng() < 0.7) look.longHair = true; else look.hairH = rng.range(0.05, 0.1);
  if (rng() < 0.4) look.legs = look.shorts, look.pants = look.shorts;   // leggings / joggers
  if (rng() < 0.12) look.cap = rng.pick(['#1c1f2a', '#f2f1ea', '#d6403a']);
  if (kind === 'staff') Object.assign(look, { shirt: '#dfe03a', shorts: '#1c1f2a', pants: '#1c1f2a', legs: '#1c1f2a' });
  if (kind === 'cleaner') Object.assign(look, { shirt: '#2f68ab', shorts: '#13305a', pants: '#13305a', legs: '#13305a', cap: '#13305a' });
  if (kind === 'coach' || kind === 'pcoach') Object.assign(look, { shirt: '#1c1f2a', sleeve: '#dfe03a', shorts: '#1c1f2a' });
  return look;
}
function setsFor(base, list) { return list.map(([pct, reps]) => ({ kg: pct === 0 ? 20 : round25(base * pct), reps, pct })); }
function makeEx(lift, a, rng, o = {}) {
  const L = LIFTS[lift]; const e = { lift, types: L.types, alts: L.alts, kind: L.kind, sets: [], restMul: o.restMul || 1, dur: o.dur || 0, st: 'todo', setI: 0 };
  const nSets = o.n || rng.int(3, 4), reps = o.reps || rng.int(8, 12);
  if (L.kind === 'cardio') { const r = rng(); e.pref = r < 0.5 ? 'treadmill' : r < 0.75 ? 'bike' : r < 0.9 ? 'rower' : 'airbike'; }   // treadmills are the most popular machine
  if (L.kind === 'bar') {
    const rm = a.rm[lift] || a.rm.squat * 0.6;
    e.sets = o.sets || setsFor(rm, Array.from({ length: nSets }, () => [o.pct || 0.65, reps]));
  } else if (L.kind === 'db') e.sets = Array.from({ length: nSets }, () => ({ kg: Math.round(a.db * (lift === 'lateral' ? 0.4 : lift === 'dbcurl' ? 0.55 : 1)), reps, pct: 0.7 }));
  else if (L.kind === 'stack' || L.kind === 'plate') e.sets = Array.from({ length: nSets }, () => ({ kg: Math.round(a.mach * (L.kind === 'plate' ? 2.2 : 1) / 5) * 5, reps, pct: 0.7 }));
  else if (L.kind === 'bw') e.sets = Array.from({ length: nSets }, () => ({ kg: 0, reps: rng.int(5, 10), pct: 0.7 }));
  else if (L.kind === 'sled') e.sets = Array.from({ length: o.n || 4 }, () => ({ kg: Math.round(a.mach * 1.5 / 10) * 10, reps: 1, pct: 0.7 }));
  return e;
}
function estMinutes(e) { if (e.kind === 'cardio' || e.kind === 'mat') return e.dur + 1; const L = LIFTS[e.lift]; return e.sets.length * ((L.rep || 20) * (e.sets[0].reps || 1) / 60 + 2.2 * e.restMul) + 1.5; }
function genProgram(a, rng, cfg) {
  const P = [];
  const warm = () => { if (rng() < 0.4) P.push(Object.assign(makeEx('cardio', a, rng), { dur: rng.int(5, 8) })); };
  if (a.arch === 'power') {
    warm();
    const day = rng.pick([['squat', 'bench'], ['deadlift', 'ohp'], ['bench', 'squat'], ['squat', 'deadlift']]);
    day.forEach((lift, k) => {
      const rm = a.rm[lift]; const work = [];
      const n = rng.int(4, 5), base = rng.range(0.76, 0.82);
      for (let i = 0; i < n; i++) work.push([Math.min(0.88, base + i * 0.015), rng.int(3, 5)]);
      if (k === 0 && rng() < 0.3) work.push([rng.range(0.95, 1.04), 1]);
      P.push(makeEx(lift, a, rng, { sets: setsFor(rm, [[0, 8], [0.4, 5], [0.6, 3], [0.72, 2], ...work]), restMul: 1.35 }));
    });
    for (const l of rng.pick([['row'], ['pulldown', 'legcurl'], ['dbbench'], ['hipthrust', 'row']])) P.push(makeEx(l, a, rng, { n: 3, reps: 10 }));
  } else if (a.arch === 'oly') {
    P.push(Object.assign(makeEx('stretch', a, rng), { dur: rng.int(4, 7) }));
    P.push(makeEx('snatch', a, rng, { sets: setsFor(a.rm.snatch, [[0, 3], [0.5, 3], [0.65, 2], [0.7, 2], [0.75, 2], [0.78, 1], [0.82, 1]]), restMul: 0.9 }));
    P.push(makeEx('cleanjerk', a, rng, { sets: setsFor(a.rm.cleanjerk, [[0, 3], [0.5, 2], [0.65, 1], [0.72, 1], [0.78, 1], [0.84, 1]]), restMul: 1.0 }));
    if (rng() < 0.6) P.push(makeEx('frontsquat', a, rng, { sets: setsFor(a.rm.frontsquat, [[0.5, 5], [0.7, 3], [0.78, 3], [0.78, 3]]), restMul: 1.1 }));
  } else if (a.arch === 'body') {
    warm();
    const pool = rng.pick([['bench', 'dbpress', 'pecdeck', 'lateral', 'cablefly', 'dip'], ['deadlift', 'pulldown', 'row', 'dbcurl', 'pullup', 'cablefly'], ['squat', 'legpress', 'legext', 'legcurl', 'hipthrust', 'beltsquat'], ['squat', 'bench', 'dbpress', 'lateral', 'dbcurl', 'pulldown'], ['ohp', 'dbbench', 'shoulderpress', 'lateral', 'cablefly', 'dip', 'row']]);
    for (const l of pool) P.push(LIFTS[l].kind === 'bar' ? makeEx(l, a, rng, { sets: setsFor(a.rm[l], [[0.45, 10], [0.62, 10], [0.68, 8], [0.7, 8]]), restMul: 0.85 }) : makeEx(l, a, rng, { n: rng.int(3, 4), reps: rng.int(8, 12), restMul: 0.6 }));
  } else if (a.arch === 'beginner') {
    P.push(Object.assign(makeEx('cardio', a, rng), { dur: rng.int(10, 18) }));
    const pool = ['chestpress', 'pulldown', 'row', 'legpress', 'legext', 'legcurl', 'pecdeck', 'cablefly'];
    const n = rng.int(3, 5); const picks = []; while (picks.length < n) { const l = rng.pick(pool); if (!picks.includes(l)) picks.push(l); }
    for (const l of picks) P.push(makeEx(l, a, rng, { n: 3, reps: 12, restMul: 0.55 }));
    if (rng() < 0.5) P.push(Object.assign(makeEx('stretch', a, rng), { dur: rng.int(3, 6) }));
  } else if (a.arch === 'client') {
    const lift = rng.pick(['squat', 'deadlift']);
    P.push(makeEx(lift, a, rng, { sets: setsFor(a.rm[lift], [[0, 8], [0.5, 5], [0.65, 5], [0.7, 5], [0.72, 5]]), restMul: 0.9 }));
    P.push(makeEx('sled', a, rng, { n: 4 }));
    P.push(makeEx('hipthrust', a, rng, { n: 3, reps: 10, restMul: 0.7 }));
    P.push(makeEx(rng.pick(['pullup', 'pulldown', 'dip']), a, rng, { n: 3, reps: 8, restMul: 0.7 }));
  }
  // top up with accessories until the planned visit is filled
  const FILL = { power: ['row', 'pulldown', 'legcurl', 'hipthrust', 'dbbench', 'dip', 'pullup', 'cablefly'], body: ['cablefly', 'lateral', 'dbcurl', 'legext', 'legcurl', 'pecdeck', 'row', 'chestpress', 'shoulderpress'], beginner: ['chestpress', 'row', 'shoulderpress', 'legpress', 'pecdeck', 'legext'], oly: ['pullup', 'hipthrust', 'legpress', 'row'], client: ['legpress', 'row', 'cablefly'] }[a.arch];
  let est = P.reduce((s, e) => s + estMinutes(e), 0), guard = 0;
  while (est < a.stay / 60 - 10 && guard++ < 6) { const l = rng.pick(FILL); const e = makeEx(l, a, rng, { n: 3, reps: rng.int(8, 12), restMul: 0.6 }); P.push(e); est += estMinutes(e); }
  if (a.arch !== 'beginner' && a.arch !== 'oly' && rng() < 0.3) P.push(Object.assign(makeEx('stretch', a, rng), { dur: rng.int(3, 6) }));
  // trim to the planned visit length
  const target = a.stay / 60 - 4; let acc = 0; const out = [];
  for (const e of P) { const m = estMinutes(e); if (out.length >= 2 && acc + m > target + 5) continue; out.push(e); acc += m; }
  return out;
}
// ================================================================ the month: a member pool that persists across watched days
let M = null;
function newMember(rng, joinedDay, isNew) {
  const mix = { ...M.cfg.mix }; delete mix.coach; const mixK = Object.keys(mix), mixT = mixK.reduce((s, k) => s + mix[k], 0);
  let m = rng() * mixT, arch = mixK[0]; for (const kk of mixK) { m -= mix[kk]; if (m <= 0) { arch = kk; break; } }
  if (arch === 'coach') arch = 'client';
  const female = rng() < (arch === 'power' ? 0.38 : 0.5), fm = female ? 0.63 : 1;
  const look = makeLook(rng, female, 'member'), name = `${rng.pick(FIRST)} ${String.fromCharCode(65 + rng.int(0, 25))}.`;
  const sq = (arch === 'power' ? rng.range(140, 210) : arch === 'oly' ? rng.range(130, 175) : arch === 'body' ? rng.range(100, 150) : rng.range(55, 95)) * fm;
  const rm = { squat: round25(sq), frontsquat: round25(sq * 0.82), bench: round25(sq * 0.72), deadlift: round25(sq * 1.18), ohp: round25(sq * 0.45), snatch: round25(sq * 0.58), cleanjerk: round25(sq * 0.74), rackcurl: round25(sq * 0.3) };
  const db = Math.round((arch === 'beginner' || arch === 'client' ? rng.range(8, 14) : rng.range(18, 34)) * fm);
  const mach = (arch === 'beginner' || arch === 'client' ? rng.range(25, 45) : rng.range(45, 85)) * fm;
  const vpu = 6 * Math.exp(0.6 * rng.gauss()) / Math.exp(0.18);   // visits a month, mean 6 (P4.1), spread between people
  const outside = false;
  return { id: M.nextId++, arch, female, look, name, rm, db, mach, vpu, joinedDay, visits: [], outside, card: !isNew, isNew: !!isNew, pt: null };
}
function setupMonth() {
  const cfg = JSON.parse(JSON.stringify(S)), rng = makeRng(cfg.seed);
  M = { cfg, cal: calendar(cfg.year || 2027, MONTH_NAMES.indexOf(cfg.month) + 1).slice(Math.max(0, (cfg.startDay || 1) - 1)), dayI: 0, pool: [], lapsed: [], days: [], seed: cfg.seed, nextId: 0 };
  // members at the start of the month: about 965 at 35 people at the weekly peak (P4.2); a new build has only reached part of that;
  // a new competitor takes 10% (D8)
  M.steady = Math.round(965 * cfg.peak / 35 * (cfg.shock === 'competitor' ? 0.9 : 1));
  M.level = cfg.build === 'new' ? rampLevel(cfg.monthsOpen) : 1;
  const n = Math.round(M.steady * M.level), tenureDays = cfg.build === 'new' ? Math.max(1, cfg.monthsOpen) * 30.4 : 36 * 30.4;
  for (let k = 0; k < n; k++) M.pool.push(newMember(rng, -Math.floor(rng() * tenureDays)));
  for (const m of M.pool) for (let d = -30; d < 0; d++) if (rng() < m.vpu / 30.4) m.visits.push(d);
  M.joinedTotal = 0; M.lapsedTotal = 0; M.returnedTotal = 0; M.ptDue = 0; M.balkedTotal = 0; M.badTotal = 0;
  const mo = MONTH_NAMES.indexOf(cfg.month) + 1, season = WEATHER_DAY.typhoonMonths.includes(mo);
  for (const d of M.cal) { const u = rng(); d.typhoon = season && u < WEATHER_DAY.typhoonPerYear / 123; d.closure = cfg.shock === 'closure'; }   // ≈123 days in the typhoon months
  const choose = (k, f) => { let n = 0; for (let tries = 0; n < k && tries < 50 * k + 100 && M.pool.length; tries++) { const m = M.pool[Math.floor(rng() * M.pool.length)]; if (m.pt || m.outside) continue; f(m); n++; } };
  // rental policy: dearer rentals or a ban mean fewer outside clients; a quarter of those removed train in-house instead (P5.17)
  const outBase = cfg.outsideClients * cfg.peak / 35, outN = cfg.allowOutside ? Math.round(outBase * Math.pow(cfg.rentP / DEMAND_RESP.rentBase, DEMAND_RESP.rentElastic)) : 0;
  const moved = Math.round((Math.round(outBase) - outN) * DEMAND_RESP.substitute);
  const lv = M.level * (cfg.shock === 'competitor' ? 0.9 : 1), firstMonth = cfg.build === 'new' && cfg.monthsOpen === 0;   // a gym that has just opened owes no sessions yet
  choose(firstMonth ? 0 : Math.round((Math.round(cfg.ptClients * cfg.peak / 35) + Math.max(0, moved)) * lv), m => { const i = pickPack(rng()), pk = PT_PACKS[i]; m.pt = { n: pk.n, left: 1 + Math.floor(rng() * pk.n), price: pk.price }; });
  choose(Math.round(outN * lv), m => { m.outside = true; });
}
// prices published at the desk wait for the next morning (Calls 1, 14); Setup and a new month apply them at once
let PUBLISH = null;
function publishPrices(p) { PUBLISH = { ...p }; }
function applyPublished() {
  if (!PUBLISH) return; Object.assign(S, PUBLISH); if (typeof BOOKS !== 'undefined') BOOKS.stage = null;   // the price list now shows what applies
  if (M) { M.cfg.rentP = PUBLISH.rentP; }   // floor rental bills at the new price from tomorrow; who rents (allowOutside) is decided at the next month's setup
  PUBLISH = null;
}
// ================================================================ the business (Plan 7): financing and the bank balance, above the month record
let BIZ = null;
// Plan 8: a built gym (S.hallW x S.hallD cells) sets the hall, the floor area, capex and depreciation; the sample gym keeps today's figures
const SAMPLE_CAPEX = { capex: COSTS.capex, depYear: COSTS.depYear };
let BUILT = null;
function applyBuild() {
  if (HALL.w !== (S.hallW || null) || HALL.d !== (S.hallD || null)) setHall(S.hallW, S.hallD);
  if (S.hallW) {   /* lay it out once to see what fits: the gym pays for what is placed, and the counts follow */
    if (!S.layout) S.layout = autoBuild(S.hallW, S.hallD, S, { turf: S.turf });   /* Plan 11: a built hall is always laid out from pieces */
    buildLayout({ ...S, shock: 'none' }); const p = placedCounts(); Object.assign(S, p.counts);
    BUILT = buildCost({ w: S.hallW, d: S.hallD, counts: S, kit: p.kit, layout: S.layout }, { ...COSTS, rentRate: S.rentRate }); COSTS.capex = BUILT.capex; COSTS.depYear = BUILT.depYear; S.area = BUILT.ping;
  } else { BUILT = null; Object.assign(COSTS, SAMPLE_CAPEX); }
  if (typeof lockBuiltSliders === 'function') lockBuiltSliders();
}
function newBusiness() {
  const deposit = BUILT ? BUILT.deposit : 0;   /* a built gym's rent deposit leaves the bank at opening (refundable, not depreciated) */
  BIZ = { own: S.finOwn, loan: S.finLoan, rate: S.finRate, years: S.finYears, payment: loanPayment(S.finLoan, S.finRate, S.finYears), balance: S.finLoan,
    cash: S.finOwn + S.finLoan - COSTS.capex - deposit, deposit, cashOutAt: null, months: [], monthIndex: 0, year: S.year || 2027, mIn: 0, mOut: 0 };
  BIZ.openCash = BIZ.cash;   /* Plan 10: the cash goal knows a gym that opened overdrawn */
}
// cash a day's trading moves: what came in (fees, cards, PT packs, rentals, add-ons) minus VAT owed and every cost paid
function dayCash(p) { return p ? p.cashIn - p.vat - p.coach - p.mkt - p.card - (p.retain || 0) - p.fixed : 0; }
function liveCash() { return BIZ ? BIZ.cash + (A && A.pnl ? dayCash(A.pnl) : 0) : 0; }
function noteCashOut() { if (BIZ.cash < 0 && !BIZ.cashOutAt) BIZ.cashOutAt = { month: M.cfg.month, year: BIZ.year, day: A.date, mi: BIZ.monthIndex }; }
function bookCash(p) { if (!BIZ || !p) return; BIZ.cash += dayCash(p); BIZ.mIn += p.cashIn; BIZ.mOut += p.cashIn - dayCash(p); noteCashOut(); }
function setupRun() { if (typeof resetGoal === 'function') resetGoal(); applyPublished(); if (typeof BOOKS !== 'undefined') BOOKS.stage = null; applyBuild(); newBusiness(); setupMonth(); setupDay(0); }
function bookDay() { return { dayI: A.dayI, dow: A.dow, date: A.date, visits: A.visits, paidVisits: A.paidVisits || 0, blendSum: A.blendSum || 0, lens: (A.visitLens || []).slice(), ptSessions: A.ptSessions, balked: A.balked || 0, bad: A.bad || 0, pnl: A.pnl }; }
function nextDay() { if (!M || M.dayI + 1 >= M.cal.length) return false; bookCash(A.pnl); const rec = bookDay(); Object.assign(rec, endDay()); M.days.push(rec); M.balkedTotal += rec.balked; M.badTotal += rec.bad; setupDay(M.dayI + 1); return true; }
// ================================================================ the month closes and the business carries on (D9)
// closing: the last day is booked (cash, churn between days), the loan instalment and income tax leave the bank, the month is archived
function closeMonth() {
  bookCash(A.pnl); const rec = bookDay(); Object.assign(rec, endDay()); M.days.push(rec);
  const pnl = {}; for (const d of M.days) for (const k in d.pnl) if (typeof d.pnl[k] === 'number') pnl[k] = (pnl[k] || 0) + d.pnl[k];
  const frac = M.cal.length / daysInMonth(BIZ.year, M.cfg.month);   /* a short first month pays its share of the instalment and depreciation */
  const lm = loanMonth(BIZ.balance, BIZ.rate * frac, BIZ.payment * frac); BIZ.balance = lm.balance;
  const tax = belowEbitda(pnl.ebitda || 0, { ...pnlCosts(), depYear: pnlCosts().depYear * frac }, lm.interest).tax;
  BIZ.cash -= lm.interest + lm.principal + tax; BIZ.mOut += lm.interest + lm.principal + tax; noteCashOut();
  BIZ.months.push({ name: M.cfg.month, year: BIZ.year, days: M.cal.length, pnl, members: M.pool.length, joined: M.joinedTotal, lapsed: M.lapsedTotal, cashEnd: BIZ.cash,
    interest: lm.interest, principal: lm.principal, tax, cashIn: BIZ.mIn, cashOut: BIZ.mOut, ptDue: M.ptDue || 0 });
  BIZ.mIn = 0; BIZ.mOut = 0;
}
// the next calendar month of the same business: same members (history rebased to the new month's day 0), balances, prices and settings;
// its own calendar, season and typhoon draws, seeded from the seed and the month number so a business replays identically
function nextMonth() {
  if (!M || M.dayI + 1 < M.cal.length) return false;
  closeMonth();
  const old = M, L = old.cal.length, mi = MONTH_NAMES.indexOf(old.cfg.month), nmi = (mi + 1) % 12;
  if (nmi === 0) BIZ.year++;
  BIZ.monthIndex++; S.month = MONTH_NAMES[nmi]; S.year = BIZ.year; S.startDay = 1; if (S.build === 'new') S.monthsOpen++;   /* review I1: a later Setup opens on the 1st of the current month and year */
  applyPublished();
  for (const m of old.pool.concat(old.lapsed)) {
    m.joinedDay -= L; m.visits = m.visits.map(d => d - L).filter(d => d >= -60);
    if (m.bad) m.bad = m.bad.map(d => d - L).filter(d => d >= -60);
    if (m.lapsedDay != null) m.lapsedDay -= L;
    if (m.protect) m.protect.until -= L; if (m.voucher) m.voucher.until -= L; if (m.acts) for (const a of m.acts) a.day -= L;   /* Plan 9 */
  }
  // the business keeps its set-up: settings waiting for Setup (layout, demand, seed, scenario, financing) stay pending; only the calendar,
  // months since opening and the rental policy published at the desk move on (A4)
  const cfg = JSON.parse(JSON.stringify(S));
  for (const k of SETUP_KEYS) if (!['month', 'monthsOpen', 'rentP', 'allowOutside'].includes(k)) cfg[k] = JSON.parse(JSON.stringify(old.cfg[k]));
  const seed = (cfg.seed ^ Math.imul(BIZ.monthIndex, 0x632BE5AB)) >>> 0, rng = makeRng(seed);
  M = { cfg, cal: calendar(BIZ.year, nmi + 1), dayI: 0, pool: old.pool, lapsed: old.lapsed, days: [], seed, nextId: old.nextId };
  M.steady = Math.round(965 * cfg.peak / 35 * (cfg.shock === 'competitor' ? 0.9 : 1)); M.level = cfg.build === 'new' ? rampLevel(cfg.monthsOpen) : 1;
  M.joinedTotal = 0; M.lapsedTotal = 0; M.returnedTotal = 0; M.ptDue = old.ptDue || 0; M.balkedTotal = 0; M.badTotal = 0;
  const season = WEATHER_DAY.typhoonMonths.includes(nmi + 1);
  for (const d of M.cal) { const u = rng(); d.typhoon = season && u < WEATHER_DAY.typhoonPerYear / 123; d.closure = cfg.shock === 'closure'; }
  // who rents the floor follows this month's rental policy (P5.17): a ban ends rentals, otherwise the count moves toward its target
  const outBase = cfg.outsideClients * cfg.peak / 35, target = cfg.allowOutside ? Math.round(outBase * Math.pow(cfg.rentP / DEMAND_RESP.rentBase, DEMAND_RESP.rentElastic) * M.level) : 0;
  const renters = M.pool.filter(m => m.outside);
  for (const m of renters.slice(target)) m.outside = false;
  for (let k = renters.length, tries = 0; k < target && tries < 50 * target + 100; tries++) { const m = M.pool[Math.floor(rng() * M.pool.length)]; if (m.pt || m.outside) continue; m.outside = true; k++; }
  setupDay(0); return true;
}
// ================================================================ close the day, the week or the month early (A1): the days run without being watched
// a week is today plus up to six more days; nothing runs past the month's last day; returns what the closed days took and earned
function closeTarget(kind) { const last = M.cal.length - 1; return kind === 'day' ? M.dayI : kind === 'week' ? Math.min(last, M.dayI + 6) : last; }
function closeOneDay(out, target) {   // one step of a close: finish today, or move on to the next day; true while more is left
  if (A.done) { if (M.dayI >= target) return false; nextDay(); }
  fastForward(30 * 3600); if (!A.done) endStuckDay();   // a member who never leaves cannot hang a close
  out.days++; out.takings += A.pnl.takings; out.ebitda += A.pnl.ebitda;
  return M.dayI < target;
}
function endStuckDay() { for (const a of A.members) if (a.state !== 'gone' && a.state !== 'pending') { a.state = 'gone'; a.visible = false; if (a.coach) { a.coach.visible = false; a.coach.state = 'gone'; } } A.done = true; A.pnl = computePnl(); }
function closeEarlySync(kind) {
  const out = { days: 0, takings: 0, ebitda: 0 }; if (!M || !A) return out;
  const target = closeTarget(kind); while (closeOneDay(out, target));
  return out;
}
function monthComplete() { return !!M && M.dayI + 1 >= M.cal.length && !!A && A.done; }
// month to date (completed days + today so far), the rest of the month projected from parameters and this month's actual rates, and the sum
function projectMonth() {
  const c = pnlCosts(), days = M.days, n = days.length;
  const mtd = projectRest(days.concat([{ pnl: A.pnl }]), (d) => d.pnl);
  const tot = (k) => days.reduce((t, d) => t + (d.pnl[k] || 0), 0), paid = days.reduce((t, d) => t + (d.paidVisits || 0), 0) + (A.paidVisits || 0);
  // NT$ per paid visit so far (≈90 at base before anyone has paid), rescaled to today's prices for the days ahead (capped per visit)
  const billed = days.reduce((t, d) => t + (d.blendSum || 0), 0) + (A.blendSum || 0), now = blendedPrice(S.priceOff, S.pricePeak);
  // the cap per visit means fees do not scale with price for long visits: compare modelled fees over this month's visit lengths at both prices
  const lens = days.reduce((t, d) => t.concat(d.lens || []), []).concat(A.visitLens || []);
  const modelFee = (b) => lens.length ? lens.reduce((t, l) => t + Math.min(S.priceCap, l * b), 0) / lens.length : Math.min(S.priceCap, 70 * b);
  const feePerVisit = paid ? (mtd.entry || 0) / paid * modelFee(now) / modelFee(billed / paid) : 90 * modelFee(now) / modelFee(DEMAND_RESP.basePrice);
  const perDay = (k, base) => n ? tot(k) / n : base;                                         // completed-day averages, base values before the first day ends
  const sc = M.cfg.peak / 35 * (M.level || 1) * (M.cfg.shock === 'competitor' ? 0.9 : 1);   // base fallbacks follow the ramp and a competitor
  const pt = perDay('ptEarned', PT.sessions / PT.daysPerMonth * c.ptPrice * M.cfg.ptClients / 22 * sc),
    rent = perDay('rentals', PT.rentals / PT.daysPerMonth * M.cfg.rentP * M.pool.filter(m => m.outside).length / 10), cards = perDay('cards', CHURN.newPerMonth / PT.daysPerMonth * CHURN.card * sc);
  const rain = M.cfg.weather === 'Rain' ? WEATHER_DAY.rainMult : 1;
  const rest = projectRest(M.cal.slice(M.dayI + 1), (day) => {
    if (day.closure) return dailyPnl({ entry: 0, cards: 0, ptSessions: 0, ptEarned: 0, ptCash: 0, rentals: 0 }, 1, { ...c, addOns: 0 });   // a known closure: fixed costs only
    const base = dayShape(day.dow), sh = peakShiftWeights(base, day.dow, S.pricePeak / S.priceOff - 1), sm = (r) => r.reduce((t, v) => t + v, 0);
    const f = dayFactor(day.dow, day.mult) * rain * priceVisitMult(blendedPrice(S.priceOff, S.pricePeak), DEMAND_RESP.eExisting) * sm(sh) / sm(base), ev = M.pool.reduce((t, m) => t + Math.min(0.95, m.vpu / 30.4 * f), 0);
    return dailyPnl({ entry: ev * feePerVisit, cards, ptSessions: 0, ptEarned: pt, ptCash: 0, rentals: rent }, 1, c);
  });
  const total = {}; for (const k of new Set([...Object.keys(mtd), ...Object.keys(rest)])) total[k] = (mtd[k] || 0) + (rest[k] || 0);
  return { mtd, rest, total };
}
function lapseHazard(m, i) {   // today's chance this member lapses: tenure, visit frequency, bad visits in the last 30 days, staffing (P4.3, P4.11, P4.12, P4.15, D10)
  const v30 = i - m.joinedDay < 30 ? null : m.visits.filter(d => d > i - 30 && d <= i).length, bad = (m.bad || []).filter(d => d > i - 30 && d <= i).length;
  const h = dailyRate(churnMonthly((i - m.joinedDay) / 30.4, v30, bad, staffAdj(S.staff)));
  return m.protect && i < m.protect.until ? h / 2 : h;   /* Plan 9: a retention action that landed halves churn for a while */
}
// ================================================================ retention actions (Plan 9, spec R1–R4): the learner picks an action for a drifting member;
// each lands with a chance; doing nothing leaves the model's churn. Messages (check-in, win-back SMS) reach crowding members half as often (R4);
// a second action on the same member within 30 days has half the chance (R3). An action resolves at once.
const RETAIN = {
  checkin: { p: 0.25, cost: 0, months: 2, message: true, perDay: 5 },        // free, uses desk time
  taster: { p: 0.45, cost: 800, months: 3, packP: 0.25 },                   // the coach is paid for the free session if the member comes
  voucher: { p: 0.35, months: 1, off: 300, days: 30 },                      // up to $300 off visit fees for a month
  winback: { p: 0.15, cost: 20, message: true, lapsed: true },              // an SMS; the member returns
};
function retainChance(m, kind) {
  const R = RETAIN[kind], lapsed = M.lapsed.includes(m); if (!R || (R.lapsed ? !lapsed : lapsed)) return 0;
  let p = R.p; if (R.message && riskTag(m, M.dayI).kind === 'crowding') p /= 2; if ((m.acts || []).some(a => a.day > M.dayI - 30)) p /= 2; return p;
}
function retainAct(m, kind, roll, packRoll) {
  if (!A || !M) return { refused: 'closed' };
  if (typeof closing !== 'undefined' && closing) return { refused: 'closing' };   /* not while days are being closed early */
  if (A.closed) return { refused: 'closedDay' };                                 /* nobody at the desk on a closed day */
  const R = RETAIN[kind], chance = retainChance(m, kind); if (!chance) return { refused: R && R.lapsed ? 'notLapsed' : 'lapsed' };
  if (kind === 'checkin') { if ((A.deskMsgs || 0) >= R.perDay) return { refused: 'desk' }; A.deskMsgs = (A.deskMsgs || 0) + 1; }
  const rng = makeRng((M.seed ^ Math.imul(m.id + 1, 0x9E3779B1) ^ Math.imul(M.dayI + 7, 0x85EBCA6B) ^ Math.imul(Object.keys(RETAIN).indexOf(kind) + 3, 0xC2B2AE35) ^ ((m.acts || []).length * 0x27D4EB2F)) >>> 0);
  let pack = null; const ok = (roll != null ? roll : rng()) < chance, cost = kind === 'winback' ? R.cost : kind === 'taster' && ok ? R.cost : 0;
  A.retain = (A.retain || 0) + cost; (m.acts || (m.acts = [])).push({ day: M.dayI, kind, ok });
  if (ok && kind === 'winback') { M.lapsed = M.lapsed.filter(x => x !== m); delete m.lapsedDay; M.pool.push(m); M.returnedTotal = (M.returnedTotal || 0) + 1; }
  else if (ok) {
    const until = M.dayI + Math.round(R.months * 30.4); if (!m.protect || m.protect.until < until) m.protect = { until, kind };
    if (kind === 'voucher') m.voucher = { left: R.off, until: M.dayI + R.days };
    if (kind === 'taster' && !m.pt && !m.outside && (packRoll != null ? packRoll : rng()) < R.packP) {   /* members with an outside coach never buy an in-house pack */   /* one in four buys a pack, paid in full; the gym owes the sessions */
      const pk = PT_PACKS[pickPack(rng())]; A.rev = (A.rev || 0) + pk.price; A.ptRev = (A.ptRev || 0) + pk.price; A.packs = (A.packs || 0) + 1; A.ptOwed = (A.ptOwed || 0) + pk.n;
      m.pt = { n: pk.n, left: pk.n, price: pk.price }; A.deferred += pk.price; pack = pk;
    }
  }
  A.pnl = computePnl();   /* book it now: after closing time the sim no longer steps, and Next day books A.pnl */
  return { ok, chance, cost, pack };
}
function applyVoucher(m, fee) { const v = m.voucher; if (!v || v.left <= 0 || M.dayI >= v.until) return fee; const d = Math.min(fee, v.left); v.left -= d; return fee - d; }
function poisson(rng, mean) { let k = 0, p = 1; const L = Math.exp(-mean); do { k++; p *= rng(); } while (p > L); return k - 1; }
// between days: members lapse (tenure and visit frequency, P4.3, P4.12, P4.15), lapsed members return (P4.14), new members join (P4.4)
function endDay() {
  const i = M.dayI, rng = makeRng((M.seed ^ Math.imul(i + 1, 0x85EBCA6B) ^ 0x27D4EB2F) >>> 0), out = { joined: 0, lapsed: 0, returned: 0 };
  const stay = [];
  for (const m of M.pool) {
    if (rng() < lapseHazard(m, i)) { m.lapsedDay = i; M.lapsed.push(m); out.lapsed++; } else stay.push(m);
  }
  M.pool = stay;
  const still = [];
  for (const m of M.lapsed) {
    if (m.lapsedDay < i && rng() < dailyRate(reactMonthly((i - m.lapsedDay) / 30.4))) { delete m.lapsedDay; M.pool.push(m); out.returned++; } else still.push(m);
  }
  M.lapsed = still;
  const gap = M.cfg.build === 'new' ? Math.max(0, M.steady - M.pool.length) / (RAMP.tau * 30.4) : 0;
  out.joined = poisson(rng, (CHURN.newPerMonth / 30.4 * M.cfg.peak / 35 * (M.cfg.shock === 'competitor' ? 0.9 : 1) + gap) * priceVisitMult(blendedPrice(S.priceOff, S.pricePeak), DEMAND_RESP.eNew));   // dearer prices, fewer joins (P3.12b)
  for (let k = 0; k < out.joined; k++) M.pool.push(newMember(rng, i + 1, true));
  M.joinedTotal += out.joined; M.lapsedTotal += out.lapsed; M.returnedTotal += out.returned;
  out.actives = M.pool.length;
  return out;
}
function setupDay(i) {
  if (A && A.occ) { HIST.unshift({ occ: A.occ, q: A.q, label: A.label }); if (HIST.length > 3) HIST.pop(); }
  for (const a of AGENTS) a.visible = false;
  AGENTS.length = 0;
  applyPublished();
  const cfg = JSON.parse(JSON.stringify(M.cfg)), day = M.cal[i];
  M.dayI = i;
  const rng = makeRng((M.seed ^ Math.imul(i + 1, 0x9E3779B1)) >>> 0);
  buildLayout(cfg.shock === 'brokenRack' ? { ...cfg, racks: Math.max(1, cfg.racks - 1) } : cfg);   // one rack out for repair all month
  A = { cfg, rng, t: T_START, inside: 0, members: [], spawnI: 0, outQ: [], cars: [], scoot: new Array(SCOOT.length).fill(null), buses: [],
    waits: [], longestQ: 0, prs: [], occ: new Float32Array(17 * 60).fill(NaN), q: new Float32Array(17 * 60).fill(NaN), zones: [], lastMin: -1, done: false, label: `seed ${cfg.seed} · ${cfg.racks} racks`, wb: 0, visits: 0,
    dayI: i, dow: day.dow, date: day.day, closed: !!(day.typhoon || day.closure), closedWhy: day.closure ? 'closure' : 'typhoon', visitsExpected: 0 };
  // who comes today: each member's own rate, scaled by the weekday's busyness and the month (P2.2, P2.8); a heatwave cuts midday
  const heat = cfg.weather === 'Heatwave', shape = dayShape(day.dow, heat), plain = dayShape(day.dow, false);
  // prices: a bigger Mon–Fri peak premium moves and loses evening visits (P3.13); dearer minutes mean fewer visits (P3.12)
  const shifted = peakShiftWeights(shape, day.dow, S.pricePeak / S.priceOff - 1), priceMult = priceVisitMult(blendedPrice(S.priceOff, S.pricePeak), DEMAND_RESP.eExisting);
  const sum = (r) => r.reduce((s, v) => s + v, 0), f = dayFactor(day.dow, day.mult) * sum(shifted) / sum(plain) * (cfg.weather === 'Rain' ? WEATHER_DAY.rainMult : 1) * priceMult, weights = dayDemand(shifted, cfg.peak, cfg.visit).weights;
  A.hourWeights = weights;
  A.open = openHour(day.dow) * 3600;
  for (let t = T_START + 10 * 60; t < 24.7 * 3600; t += (BUS_GAP[cfg.setting] || 12) * 60) A.buses.push(t);
  for (const rec of (A.closed ? [] : M.pool)) {   // a typhoon day: closed, nobody comes
    const pv = Math.min(0.95, rec.vpu / 30.4 * f); A.visitsExpected += pv;
    if (rng() >= pv) continue;
    let r = rng(), h = 23; for (let w = 0; w < weights.length; w++) { r -= weights[w]; if (r <= 0) { h = 7 + w; break; } }
    const arr = h * 3600 + rng() * 3600;
    const a = new Agent('member', rec.look, rec.name); a.rec = rec; rec.visits.push(i);
    a.arch = rec.pt || rec.outside ? 'client' : rec.arch; a.female = rec.female; a.rm = rec.rm; a.db = rec.db; a.mach = rec.mach;   // strengths (and PRs) persist
    a.arr = Math.min(arr, 23.9 * 3600);
    a.stay = clamp(cfg.visit * 60 + rng.gauss() * 15 * 60, 30 * 60, 110 * 60);
    a.prog = genProgram(a, rng, cfg); a.exI = 0;
    const md = (MODES[cfg.setting] || MODES.Urban)[cfg.weather === 'Rain' ? 1 : 0], mr = rng();
    a.mode = mr < md[0] ? 'scooter' : mr < md[1] ? 'bus' : mr < md[2] ? 'walk' : 'taxi';
    a.entry = rng.pick(ENTRIES);
    a.spawnT = a.mode === 'taxi' ? a.arr - 30 : a.mode === 'scooter' ? a.arr - 40 : a.mode === 'walk' ? a.arr - Math.hypot(a.entry.x - DOOR.x, a.entry.z - HZ) / 1.3 : (() => { let bt = A.buses[0]; for (const b of A.buses) if (b <= a.arr - 25) bt = b; return bt + 32 + rng() * 6; })();
    a.rng = makeRng((M.seed ^ Math.imul(rec.id + 1, 2654435761) ^ Math.imul(i + 1, 40503)) >>> 0);
    A.members.push(a);
    if (rec.pt || rec.outside) {
      // some coaches are freelancers renting the floor; they wear their own clothes, not the gym's black-and-yellow kit
      const c = new Agent('pcoach', makeLook(rng, rng() < 0.5, rec.outside ? 'member' : 'pcoach'), `Coach ${rng.pick(FIRST)}`); c.client = a; a.coach = c; c.speed = 1.35; c.outside = rec.outside;
    }
  }
  A.members.sort((p, q) => p.spawnT - q.spawnT);
  // staff
  const desk = new Agent('staff', makeLook(rng, rng() < 0.5, 'staff'), 'Desk'); desk.visible = true; desk.state = 'desk'; desk.pos.set(DESK_STAFF_POS.x, 0, DESK_STAFF_POS.z); desk.yaw = Math.PI; AGENTS.push(desk); A.desk = desk;
  const hc = new Agent('coach', makeLook(rng, rng() < 0.5, 'coach'), 'Head coach'); hc.state = 'pending'; hc.spawnT = A.open - 0.2 * 3600; AGENTS.push(hc); A.hcoach = hc;
  A.cleaners = [];
  updateLadderLess();
  A.zones = { cardio: new Float32Array(17 * 60).fill(NaN), machines: new Float32Array(17 * 60).fill(NaN), dumbbells: new Float32Array(17 * 60).fill(NaN), racks: new Float32Array(17 * 60).fill(NaN), platforms: new Float32Array(17 * 60).fill(NaN) };
  env.raining = cfg.weather === 'Rain';
  drawWhiteboard(0); drawPRBoard();
  A.ptSessions = 0; A.ptEarnedToday = 0; A.ptPrices = []; A.deferred = owedValue(); A.pnlMin = -1; A.pnl = computePnl();
}
function updateLadderLess() {}
function pnlCosts() { return { ...COSTS, area: S.area, rentRate: BUILT && BIZ && BIZ.monthIndex < BUILT.rentFreeMonths ? 0 : S.rentRate,   /* a built gym's first month is rent-free; management is still paid */ staff: S.staff, addOns: A && A.closed ? 0 : COSTS.addOns }; }   // no add-on sales on a closed day
function computePnl() {
  const ptCash = A.ptRev || 0, rentals = A.rentRev || 0;
  return dailyPnl({ entry: (A.rev || 0) - ptCash - rentals, entryPeak: A.feePeak || 0, cards: A.cards || 0, ptSessions: A.ptSessions || 0, ptEarned: A.ptEarnedToday || 0, ptCash, rentals, retain: A.retain || 0 }, dayFraction(A.t, A.open, T_CLOSE), pnlCosts());
}

// ================================================================ simulation step
const STEP = 0.25;
function simStep() {
  const dt = STEP; A.t += dt;
  const t = A.t;
  // spawns
  while (A.spawnI < A.members.length && A.members[A.spawnI].spawnT <= t) spawnMember(A.members[A.spawnI++]);
  if (A.hcoach.state === 'pending' && t >= A.hcoach.spawnT) { const c = A.hcoach; c.visible = true; c.pos.set(DOOR_OUT.x, 0, DOOR_OUT.z + 4); c.state = 'toBoard'; const { Lf, Bk } = hallShift(); if (HALL.w == null) go(c, Lf - 12.9, Bk - 4.9); else go(c, WB_AT.x + 0.1, WB_AT.z + 0.75); }
  // cleaners (live count)
  const want = t > A.open - 600 && t < T_CLOSE + 600 ? S.cleaners : 0;
  if (A.cleaners.filter(c => !c.leaving).length < want) { const c = new Agent('cleaner', makeLook(A.rng, A.rng() < 0.5, 'cleaner'), 'Cleaner'); c.visible = true; c.pos.set(CHG_DOOR.x, 0, CHG_DOOR.z); c.state = 'idle'; c.speed = 1.1; AGENTS.push(c); A.cleaners.push(c); }
  else if (A.cleaners.filter(c => !c.leaving).length > want) { const c = A.cleaners.find(c => !c.leaving && c.state === 'idle') || A.cleaners.find(c => !c.leaving); if (c) { c.leaving = true; c.state = 'leave'; dropTask(c); go(c, CHG_DOOR.x, CHG_DOOR.z); } }
  // outside queue
  while (A.outQ.length && A.inside < S.cap && t >= A.open) { const a = A.outQ.shift(); a.state = 'toDesk'; go(a, DESK_PT.x, DESK_PT.z); A.inside++; }
  A.outQ.forEach((a, i) => { if (!moving(a) && !at(a, outSpot(i), 0.3)) go(a, outSpot(i).x, outSpot(i).z); });
  markUsed();
  for (const a of AGENTS) { if (!a.visible && a.kind !== 'pcoach' && a.state !== 'inCar') continue; updateAgent(a, dt); stepMove(a, dt); }
  // cars
  for (const c of A.cars) { if (t > c.t0 + 26) c.done = true; }
  A.cars = A.cars.filter(c => !c.done);
  // stats per minute
  const m = Math.floor((t - T_OPEN) / 60);
  if (m >= 0 && m < 17 * 60 && m !== A.lastMin) {
    A.lastMin = m; A.occ[m] = A.inside;
    let q = 0; for (const s of STATIONS) if (s.type === 'rack' || s.type === 'olyplat') q += s.queue.length; A.q[m] = q;
    const z = { cardio: 0, machines: 0, dumbbells: 0, racks: 0, platforms: 0 };
    for (const s of STATIONS) if (z[s.zone] !== undefined) z[s.zone] += s.users.length;
    for (const k in z) A.zones[k][m] = z[k];
  }
  for (const s of STATIONS) A.longestQ = Math.max(A.longestQ, s.queue.length);
  A.longestQ = Math.max(A.longestQ, A.outQ.length);
  if (t > T_CLOSE + 15 * 60 && A.members.every(a => a.state === 'gone' || a.state === 'pending')) A.done = true;
  { const pm = Math.floor(t / 60); if (pm !== A.pnlMin || A.done) { A.pnlMin = pm; A.pnl = computePnl(); } }   // daily P&L, once a simulated minute
  // whiteboard writing at 06:00
  if (A.hcoach.state === 'write') { const k = clamp((t - A.open) / 480, 0, 1); if (Math.floor(k * 12) !== Math.floor(A.wb * 12)) drawWhiteboard(k); A.wb = k; }
}
const outSpot = (i) => ({ x: DOOR.x - 0.6, z: HZ + 1.2 + i * 0.6 });
const TAXI_COL = '#f2c230';
const carCol = (a) => A.cfg.setting === 'Urban' ? TAXI_COL : ['#f2f1ea', '#959bab', '#1c1f2a', '#d6403a', '#2f68ab', '#c4c9d4'][[...a.name].reduce((s, c) => s + c.charCodeAt(0), 0) % 6];
const ENTRIES = [{ x: -40, z: ROAD_Z - 2.5 }, { x: 40, z: ROAD_Z - 2.5 }, { x: -36, z: 18 }, { x: 36, z: 18 }, { x: -36, z: -22 }, { x: 36, z: -22 }];
const CURB = { x: DOOR.x - 8, z: ROAD_Z - 2.3 };   // taxi kerb, west of the bus stop
function spawnMember(a) {
  a.visible = true; AGENTS.push(a); A.visits++;
  if (a.coach) { AGENTS.push(a.coach); a.coach.visible = true; }
  let sp;
  if (a.mode === 'taxi') { const car = { a, t0: A.t, kind: 'drop', x: CURB.x + (a.rng() - 0.5) * 3, col: carCol(a) }; A.cars.push(car); a.car = car; a.state = 'inCar'; a.visible = false; if (a.coach) a.coach.visible = false; return; }
  if (a.mode === 'scooter') { const free = A.scoot.map((v, i) => v ? -1 : i).filter(i => i >= 0); if (free.length) { const i = free[Math.floor(a.rng() * free.length)]; A.scoot[i] = a; a.scootI = i; sp = { x: SCOOT[i].x + 0.5, z: SCOOT[i].z }; } else sp = a.entry; }
  else if (a.mode === 'walk') sp = a.entry;
  else sp = { x: BUS_STOP.x - 1 + a.rng() * 2, z: BUS_STOP.z + 0.9 };
  startWalkIn(a, sp);
}
function pick2(a) { return '#dfe03a'; }
function startWalkIn(a, sp) {
  a.visible = true; a.pos.set(sp.x, 0, sp.z); a.state = 'arrive'; go(a, DOOR_OUT.x, DOOR_OUT.z);
  if (a.coach) { a.coach.visible = true; a.coach.pos.set(sp.x + 0.6, 0, sp.z + 0.3); }
}
function dropTask(c) { if (c.task && c.task.s) c.task.s.cleanBy = null; c.task = null; }

// ---------------------------------------------------------------- per agent
function updateAgent(a, dt) {
  const t = A.t;
  if (a.kind === 'member') return updateMember(a, dt);
  if (a.kind === 'pcoach') return updatePCoach(a, dt);
  if (a.kind === 'cleaner') return updateCleaner(a, dt);
  if (a.kind === 'coach') return updateHeadCoach(a, dt);
  if (a.kind === 'staff') { a.act = { k: 'idle', arms: 'rest' }; a.yaw = Math.PI; if (a.greetUntil && t < a.greetUntil) a.act.arms = 'wave'; }
}
function updateMember(a, dt) {
  const t = A.t;
  switch (a.state) {
    case 'inCar': { const car = a.car; if (t - car.t0 > 12) { a.state = 'arriveCar'; startWalkIn(a, { x: car.x, z: CURB.z }); } a.act = { k: 'hidden' }; return; }
    case 'arrive':
      a.act = { k: 'walk' };
      if (!moving(a)) {
        const full = A.inside >= S.cap || A.outQ.length, wait = (A.outQ.length + 1) * A.cfg.visit / Math.max(1, S.cap);   // minutes, if the gym is open
        if (t >= A.open && full && a.rng() < balkProb(wait)) walkAway(a);
        else if (t < A.open || full) { a.state = 'queueOut'; A.outQ.push(a); a.waitStart = t; }
        else { A.inside++; a.state = 'toDesk'; go(a, DESK_PT.x, DESK_PT.z); }
      }
      return;
    case 'queueOut': a.act = { k: 'idle', arms: 'phone' }; faceTo(a, DOOR.x, HZ);
      if (t >= A.open && t - Math.max(a.waitStart, A.open) > S.patience * 3 * 60) { A.outQ = A.outQ.filter(x => x !== a); noteWait(a, (t - a.waitStart) / 60); walkAway(a); }
      return;
    case 'toDesk':
      a.act = { k: 'walk' };
      if (a.waitStart) { A.waits.push((t - a.waitStart) / 60); noteWait(a, (t - Math.max(a.waitStart, A.open)) / 60); a.waitStart = 0; }
      if (!moving(a)) { a.state = 'desk'; a.t0 = t; a.yaw = 0; A.desk.greetUntil = t + 4; a.tDoor = t; A.checkins = (A.checkins || 0) + 1; }
      return;
    case 'desk': a.act = { k: 'idle', arms: 'rest' }; if (t - a.t0 > 5) { a.state = 'toLocker'; const room = a.female ? LOCKERS_F : LOCKERS_M, L = room[Math.floor(a.rng() * room.length)]; /* their own washroom */ a.locker = L; goLocker(a, L); } return;
    case 'toLocker': a.act = { k: 'walk' }; if (!moving(a)) { a.state = 'locker'; a.t0 = t; a.yaw = 0; a.lockDur = 90 + a.rng() * 120; } return;
    case 'locker': a.act = { k: 'idle', arms: 'locker' }; if (t - a.t0 > a.lockDur) { a.state = 'ex'; a.exI = 0; a.tIn = t; startExercise(a); } return;
    case 'ex': return updateExercise(a, dt);
    case 'toLockerOut': a.act = { k: 'walk' }; if (!moving(a)) { a.state = 'lockerOut'; a.t0 = t; a.yaw = 0; a.lockDur = 120 + a.rng() * 150; } return;
    case 'lockerOut': a.act = { k: 'idle', arms: 'locker' }; if (t - a.t0 > a.lockDur || t > T_CLOSE + 10 * 60) { a.state = 'toExit'; go(a, DOOR_OUT.x, DOOR_OUT.z); } return;
    case 'toExit':
      a.act = { k: 'walk' };
      if (!a.counted && a.pos.z > HZ - 0.3) { a.counted = true; A.inside = Math.max(0, A.inside - 1); chargeOut(a); }
      if (!moving(a)) {
        if (!a.counted) { a.counted = true; A.inside = Math.max(0, A.inside - 1); chargeOut(a); }
        a.state = 'leaveSite';
        if (a.mode === 'scooter' && a.scootI != null) go(a, SCOOT[a.scootI].x + 0.5, SCOOT[a.scootI].z);
        else if (a.mode === 'bus') go(a, BUS_STOP.x - 1 + a.rng() * 2, BUS_STOP.z + 0.1);
        else if (a.mode === 'taxi') go(a, CURB.x + (a.rng() - 0.5) * 2, CURB.z);
        else go(a, a.entry.x, a.entry.z);
      }
      return;
    case 'leaveSite':
      a.act = { k: 'walk' };
      if (!moving(a)) {
        if (a.mode === 'bus') { a.state = 'busWait'; return; }
        if (a.mode === 'taxi') { a.state = 'taxiWait'; a.t0 = t; const car = { a, t0: t + 25, kind: 'pick', x: a.pos.x, col: carCol(a) }; A.cars.push(car); a.car = car; return; }
        if (a.mode === 'scooter' && a.scootI != null) A.scoot[a.scootI] = null;
        finishMember(a);
      }
      return;
    case 'taxiWait': a.act = { k: 'idle', arms: 'phone' }; a.yaw = Math.PI / 2; if (t > a.car.t0 + 10) finishMember(a); return;
    case 'busWait': { a.act = { k: 'idle', arms: 'phone' }; a.yaw = Math.PI / 2; const b = A.buses.find(bt => t >= bt && t < bt + 30); if (b != null || !A.buses.some(bt => bt + 30 > t)) finishMember(a); return; }   /* after the last bus they go home another way */
  }
}
function finishMember(a) { if (a.tDoor) A.visitLens = (A.visitLens || []).concat((A.t - a.tDoor) / 60); a.state = 'gone'; a.visible = false; if (a.coach) { a.coach.visible = false; a.coach.state = 'gone'; } }
function startExercise(a) {
  const t = A.t;
  if (a.exI >= a.prog.length || t - a.tIn > a.stay + 15 * 60 || t > T_CLOSE - 5 * 60) { a.state = 'toLockerOut'; const L = a.locker || (a.female ? LOCKERS_F : LOCKERS_M)[0]; goLocker(a, L); a.station = null; return; }
  const e = a.prog[a.exI]; e.st = 'choose'; e.setI = 0; a.station = null;
  // racks used for curls (live switch): some bodybuilders take a rack for curls
  if (S.curls && e.lift === 'dbcurl' && a.rng() < 0.5) { const ex2 = makeEx('rackcurl', a, a.rng, { n: e.sets.length, reps: 10 }); a.prog[a.exI] = ex2; return chooseStation(a, ex2); }
  chooseStation(a, e);
}
function nearestOf(types, a, filter) { let best = null, bd = 1e9; for (const s of STATIONS) { if (!types.includes(s.type)) continue; if (filter && !filter(s)) continue; const d = Math.hypot(s.x - a.pos.x, s.z - a.pos.z) + s.queue.length * 4; if (d < bd) { bd = d; best = s; } } return best; }
const isFree = (s) => s.users.length === 0 && !s.cleanBy;
function chooseStation(a, e) {
  const s = (e.pref && nearestOf([e.pref], a, isFree)) || nearestOf(e.types, a, isFree);
  if (s) return claim(a, s, e);
  const q = nearestOf(e.types, a, null);
  if (!q) { a.exI++; return startExercise(a); }
  q.queue.push(a); e.st = 'wait'; e.waitS = q; e.waitT = A.t; e.wiT = A.t; a.station = null;
  const sp = waitSpot(q, q.queue.length - 1); go(a, sp.x, sp.z);
}
function accessOf(s, lift) {
  if (s.type === 'rack') { if (lift === 'deadlift') return s.dl; if (lift === 'bench') return { x: s.x, z: s.z + 0.0 }; return s.acc; }
  return s.acc;
}
function claim(a, s, e) {
  s.users.push(a); a.station = s; s.queue = s.queue.filter(x => x !== a);
  e.st = 'walk'; e.s = s;
  const p = accessOf(s, e.lift); go(a, p.x, p.z);
}
function release(a, s) {
  s.users = s.users.filter(x => x !== a); if (s.active === a) s.active = null; s.lastUsed = A.t;
  if (a.station === s) a.station = null;
}
function recordWait(e, a) { A.waits.push((A.t - e.waitT) / 60); if (a) noteWait(a, (A.t - e.waitT) / 60); }
// a visit goes bad once any wait passes badWait minutes (P4.11); bad visits in the last 30 days raise that member's churn
function noteWait(a, minutes) { a.maxWait = Math.max(a.maxWait || 0, minutes); if (minutes >= DEMAND_RESP.badWait) markBad(a); }
function markBad(a) { if (a.badMarked || !a.rec) return; a.badMarked = true; (a.rec.bad || (a.rec.bad = [])).push(A.dayI); A.bad = (A.bad || 0) + 1; }
function walkAway(a) {   // turned away at the door: no fee, a bad visit, back the way they came
  a.balked = true; markBad(a); A.balked = (A.balked || 0) + 1; a.state = 'leaveSite';
  if (a.rec) { const iv = a.rec.visits.lastIndexOf(A.dayI); if (iv >= 0) a.rec.visits.splice(iv, 1); }   // did not visit (churn frequency rule)
  if (a.mode === 'scooter' && a.scootI != null) go(a, SCOOT[a.scootI].x + 0.5, SCOOT[a.scootI].z);
  else if (a.mode === 'bus') go(a, BUS_STOP.x - 1 + a.rng() * 2, BUS_STOP.z + 0.1);
  else if (a.mode === 'taxi') go(a, CURB.x + (a.rng() - 0.5) * 2, CURB.z);
  else go(a, a.entry.x, a.entry.z);
}
function setLoad(e) { return e.sets[Math.min(e.setI, e.sets.length - 1)].kg; }
function platePairs(kg) { return platesFor(kg).length; }
function updateExercise(a, dt) {
  const t = A.t, e = a.prog[a.exI];
  if (!e) return startExercise(a);
  const L = LIFTS[e.lift], s = e.s;
  switch (e.st) {
    case 'wait': {
      const q = e.waitS; a.act = { k: 'idle', arms: a.rng() < 0.002 ? 'drink' : (a.waitArms || (a.waitArms = a.rng() < 0.6 ? 'phone' : 'fold')) };
      faceTo(a, q.x, q.z);
      if (moving(a)) a.act = { k: 'walk' };
      const qi = q.queue.indexOf(a);
      if (!moving(a) && qi >= 0) { const sp = waitSpot(q, qi); if (!at(a, sp, 0.3)) go(a, sp.x, sp.z); }
      if (isFree(q) && qi === 0) { recordWait(e, a); return claim(a, q, e); }
      // a free station of the same kind somewhere else
      const other = nearestOf(e.types, a, isFree);
      if (other) { q.queue = q.queue.filter(x => x !== a); recordWait(e, a); return claim(a, other, e); }
      // ask to work in
      if (t - e.wiT > 10) {
        e.wiT = t;
        const u = q.users[0];
        if (q.users.length === 1 && u.kind === 'member' && u.prog[u.exI] && u.prog[u.exI].lift === e.lift && u.prog[u.exI].st === 'rest' && L.kind !== 'cardio' && L.kind !== 'sled' && a.rng() < S.workIn / 100) {
          q.queue = q.queue.filter(x => x !== a); recordWait(e, a); q.users.push(a); a.station = q; e.s = q; e.st = 'rest'; e.restUntil = t; e.shared = true;
          go(a, q.rest.x + 0.5, q.rest.z + 0.4); return;
        }
      }
      if (t - e.waitT > S.patience * 60 * (L.kind === 'bar' ? 2 : 1)) {
        q.queue = q.queue.filter(x => x !== a); recordWait(e, a);
        for (const alt of e.alts) { const s2 = nearestOf(LIFTS[alt].types, a, isFree); if (s2) { const ex2 = makeEx(alt, a, a.rng, { n: Math.max(3, e.sets.length - 2), reps: 8, restMul: 0.8 }); a.prog[a.exI] = ex2; return claim(a, s2, ex2); } }
        a.exI++; return startExercise(a);
      }
      return;
    }
    case 'walk':
      a.act = { k: 'walk' };
      if (!moving(a)) {
        e.st = 'setup'; e.t0 = t;
        if (L.kind === 'bar') {
          const need = Math.abs(platePairs(setLoad(e)) - platePairs(s.load)) + (s.dirty > 20 ? platePairs(s.dirty) : 0);
          e.setupDur = 8 + need * 9; s.mode = e.lift; s.bumper = !!L.bumper;
          s.loadTarget = setLoad(e); s.loadFrom = s.dirty > 20 ? s.dirty : s.load;
        } else e.setupDur = L.kind === 'cardio' ? 6 : L.kind === 'mat' ? 4 : 10;
        if (L.kind === 'cardio' || L.kind === 'mat') e.endT = t + e.dur * 60;
        s.dirty = 0;
      }
      return;
    case 'setup': {
      const k = (t - e.t0) / e.setupDur;
      a.act = { k: 'setup', s, lift: e.lift, prog: k };
      if (L.kind === 'bar') {
        s.load = k < 1 ? (k < 0.5 ? s.loadFrom : s.loadTarget) : s.loadTarget;
        // walk between the bar ends while loading
        const end = s.type === 'rack' && e.lift !== 'deadlift' ? s.hooks : s.bar0;
        const side = k < 0.5 ? -1 : 1, p = { x: end.x + side * 1.3, z: end.z + 0.15 };
        if (k < 0.95 && !moving(a) && !at(a, p, 0.2)) go(a, p.x, p.z);
        if (k >= 0.95 && !moving(a)) { const ap = accessOf(s, e.lift); if (!at(a, ap, 0.1)) go(a, ap.x, ap.z); }
        if (moving(a)) a.act = { k: 'walk' };
      }
      if (k >= 1 && !moving(a)) startSet(a, e);
      return;
    }
    case 'set': return updateSet(a, e, dt);
    case 'spotwait': {
      const ap = accessOf(s, e.lift); a.pos.x = ap.x; a.pos.z = ap.z; a.path = null; a.yaw = s.yaw;
      a.act = { k: 'lift', s, lift: e.lift, ready: true };
      if (!e.spotter || at(e.spotter, s.spot, 0.25) || t - e.t0 > 25) beginSet(a, e);
      return;
    }
    case 'rest': {
      const p = e.shared && s.users[0] !== a ? { x: s.rest.x + 0.5, z: s.rest.z + 0.4 } : s.rest;
      if (!moving(a) && !at(a, p, 0.3) && !a.spotFor) go(a, p.x, p.z);
      a.act = moving(a) ? { k: 'walk' } : { k: 'idle', arms: e.restArms || 'rest', sit: false };
      if (!moving(a)) faceTo(a, s.x, s.z);
      if (a.spotFor) return;
      if (t >= e.restUntil && (!s.active || s.active === a)) {
        const ap = accessOf(s, e.lift);
        if (!at(a, ap, 0.12)) { if (!moving(a)) go(a, ap.x, ap.z); a.act = { k: 'walk' }; return; }
        // plate change for the next set
        if (L.kind === 'bar' && setLoad(e) !== s.load) { e.st = 'setup'; e.t0 = t; e.setupDur = 6 + Math.abs(platePairs(setLoad(e)) - platePairs(s.load)) * 7; s.loadFrom = s.load; s.loadTarget = setLoad(e); s.mode = e.lift; return; }
        startSet(a, e);
      }
      return;
    }
    case 'cardio':
      a.act = { k: 'cardio', s };
      if (t >= e.endT) finishExercise(a, e);
      return;
    case 'mat':
      a.act = { k: 'mat', s };
      if (t >= e.endT) finishExercise(a, e);
      return;
    case 'finish': {
      const k = (t - e.t0) / e.setupDur;
      a.act = { k: 'setup', s, lift: e.lift, prog: 1 - k };
      if (k < 0.5) { const end = s.type === 'rack' && e.lift !== 'deadlift' ? s.hooks : s.bar0; const p = { x: end.x + (k < 0.25 ? -1.3 : 1.3), z: end.z + 0.15 }; if (!moving(a) && !at(a, p, 0.2)) go(a, p.x, p.z); }
      if (moving(a)) a.act = { k: 'walk' };
      if (k >= 1) { s.load = 20; release(a, s); a.exI++; startExercise(a); }
      return;
    }
  }
}
function startSet(a, e) {
  const s = e.s, L = LIFTS[e.lift];
  if (L.kind === 'cardio') { e.st = 'cardio'; s.active = a; a.yaw = s.yaw; return; }
  if (L.kind === 'mat') { e.st = 'mat'; s.active = a; a.yaw = s.yaw; return; }
  if (s.active && s.active !== a) { e.st = 'rest'; e.restUntil = A.t + 5; return; }
  s.active = a; a.yaw = s.yaw;
  const set = e.sets[Math.min(e.setI, e.sets.length - 1)];
  // heavy bench in a rack: ask for a spot
  e.spotter = null;
  if (e.lift === 'bench' && set.pct >= 0.85) {
    let best = null, bd = 9;
    for (const b of AGENTS) {
      if (!b.visible || b === a || b.spotFor) continue;
      const be = b.kind === 'member' && b.state === 'ex' ? b.prog[b.exI] : null;
      const ok = (be && be.st === 'rest' && !moving(b)) || (b.kind === 'coach' && b.state === 'patrol') || (b.kind === 'pcoach' && b.client === a);
      if (!ok) continue; const d = Math.hypot(b.pos.x - a.pos.x, b.pos.z - a.pos.z); if (d < bd) { bd = d; best = b; }
    }
    if (best) { e.spotter = best; best.spotFor = a; best.spotBack = { x: best.pos.x, z: best.pos.z }; go(best, s.spot.x, s.spot.z); }
    e.st = 'spotwait'; e.t0 = A.t; return;
  }
  beginSet(a, e);
}
function beginSet(a, e) {
  const s = e.s, L = LIFTS[e.lift], set = e.sets[Math.min(e.setI, e.sets.length - 1)];
  e.st = 'set'; e.rep = 0; e.repT = A.t; a.yaw = s.yaw;
  if (s.type !== 'sled') { const ap = accessOf(s, e.lift); a.pos.x = ap.x; a.pos.z = ap.z; }
  if (!set) { console.warn('no set', e.lift, e.sets.length, e.setI); return finishExercise(a, e); }
  e.repDur = (k) => (L.rep || 3) * (1 + 0.1 * k + (set.pct > 0.8 && k === set.reps - 1 ? 0.5 : 0));
  // failure: more likely near maximal loads
  const failP = L.kind === 'bar' ? clamp((set.pct - 0.83) * (set.reps === 1 ? 2.8 : 0.9), 0, 0.5) : 0;
  e.fail = a.rng() < failP ? set.reps - 1 : -1;
  if (s.type === 'sled') { e.from = s.sledX < (s.lane[0] + s.lane[1]) / 2 ? s.lane[0] : s.lane[1]; e.to = e.from === s.lane[0] ? s.lane[1] : s.lane[0]; a.yaw = e.to > e.from ? 0 : Math.PI; a.pos.x = e.from - (e.to > e.from ? 0.72 : -0.72); a.pos.z = s.z; }
}
function updateSet(a, e, dt) {
  const t = A.t, s = e.s, L = LIFTS[e.lift], set = e.sets[Math.min(e.setI, e.sets.length - 1)];
  if (s.type === 'sled') {
    const dir = Math.sign(e.to - e.from); a.vx = dir * 1.1; a.vz = 0;
    s.sledX += dir * 1.1 * dt; a.pos.x = s.sledX - dir * 0.72;
    a.act = { k: 'lift', s, lift: 'sled', u: 0, push: true };
    if ((s.sledX - e.to) * dir >= 0) { s.sledX = e.to; endSet(a, e, true); }
    return;
  }
  { const ap = accessOf(s, e.lift); a.pos.x = ap.x; a.pos.z = ap.z; a.path = null; a.vx = a.vz = 0; a.yaw = s.yaw; }   // a lifter stays on the equipment for the whole set
  const rd = e.repDur(e.rep), u = (t - e.repT) / rd;
  a.act = { k: 'lift', s, lift: e.lift, u: Math.min(1, u), rep: e.rep, reps: set.reps, load: set.kg, repDur: rd, failing: e.rep === e.fail };
  if (e.rep === e.fail && u > 0.45) {
    a.act.u = 0.45; a.act.stuck = true;
    if (t - e.repT > rd * 0.45 + 3) { e.failed = true; endSet(a, e, false); }
    return;
  }
  if (u >= 1) { e.rep++; e.repT = t; if (e.rep >= set.reps) endSet(a, e, true); }
}
function endSet(a, e, ok) {
  const s = e.s, L = LIFTS[e.lift], set = e.sets[Math.min(e.setI, e.sets.length - 1)];
  s.active = null;
  if (e.spotter) { const b = e.spotter; b.spotFor = null; if (b.spotBack) go(b, b.spotBack.x, b.spotBack.z); e.spotter = null; }
  if (!ok) { for (let i = e.setI + 1; i < e.sets.length; i++) e.sets[i].kg = round25(e.sets[i].kg * 0.9); a.vis.failT = performance.now(); }
  else if (L.kind === 'bar' && set.kg > (a.rm[e.lift] || 1e9) - 0.01 && set.pct >= 0.9) {
    a.rm[e.lift] = set.kg; A.prs.push({ t: A.t, name: a.name, lift: L.name, kg: set.kg }); drawPRBoard(); onPR(a);
  }
  e.setI++;
  if (e.setI >= e.sets.length) return finishExercise(a, e);
  e.st = 'rest'; e.restArms = a.rng() < 0.5 ? 'phone' : a.rng() < 0.5 ? 'drink' : 'rest';
  e.restUntil = A.t + S.rest * 60 * e.restMul * (0.8 + a.rng() * 0.4);
}
function finishExercise(a, e) {
  const s = e.s, L = LIFTS[e.lift];
  if (s.active === a) s.active = null;
  if (L.kind === 'bar' && s.users.length <= 1) {
    if (a.rng() < S.rerack / 100) { e.st = 'finish'; e.t0 = A.t; e.setupDur = 6 + platePairs(s.load) * 6; return; }
    s.dirty = s.load;
  }
  if (L.kind === 'db' && a.rng() > S.rerack / 100) s.strayDB++;
  if (L.kind === 'sled') s.sledX = s.sledX;
  release(a, s); a.exI++; startExercise(a);
}
function onPR(a) {
  sfx('bell');
  const now = performance.now(); a.vis.cheer = now + 1800;
  for (const b of AGENTS) if (b.visible && b !== a && Math.hypot(b.pos.x - a.pos.x, b.pos.z - a.pos.z) < 7) b.vis.clap = now + 1600;
  showToast(`PR · ${trName(a.name)} · ${tr(LIFTS[a.prog[a.exI].lift].name)} ${a.prog[a.exI].sets[Math.min(a.prog[a.exI].setI, a.prog[a.exI].sets.length - 1)].kg} kg`);
}
// personal coach follows the client
function updatePCoach(c, dt) {
  const a = c.client, t = A.t;
  if (a.state === 'gone' || a.state === 'pending' || a.state === 'inCar') { c.visible = false; c.act = { k: 'hidden' }; return; }
  if (!c.visible) { c.pos.set(a.pos.x + 0.6, 0, a.pos.z + 0.3); }
  c.visible = true;
  if (c.spotFor) { c.act = { k: 'spot', s: c.spotFor.station }; if (!moving(c)) faceTo(c, c.spotFor.pos.x, c.spotFor.pos.z); return; }
  const e = a.state === 'ex' ? a.prog[a.exI] : null;
  let target;
  if (e && e.s && (e.st === 'set' || e.st === 'rest' || e.st === 'setup' || e.st === 'spotwait')) { const s = e.s; target = { x: s.x + Math.sin(s.yaw) * 1.3 + Math.cos(s.yaw) * 0.6, z: s.z - Math.cos(s.yaw) * 1.3 + Math.sin(s.yaw) * 0.6 }; }
  else target = { x: a.pos.x - 0.7, z: a.pos.z + 0.5 };
  if (Math.hypot(c.pos.x - target.x, c.pos.z - target.z) > 0.6 && (!moving(c) || (c.dest && Math.hypot(c.dest.x - target.x, c.dest.z - target.z) > 1.5))) go(c, target.x, target.z);
  c.act = moving(c) ? { k: 'walk' } : { k: 'idle', arms: e && e.st === 'set' ? 'point' : 'fold' };
  if (!moving(c)) faceTo(c, a.pos.x, a.pos.z);
}
function updateHeadCoach(c, dt) {
  const t = A.t;
  if (c.state === 'toBoard') { c.act = { k: 'walk' }; if (!moving(c)) { c.state = 'waitBoard'; c.yaw = -Math.PI / 2; } return; }
  if (c.state === 'waitBoard') { c.act = { k: 'idle', arms: 'fold' }; c.yaw = -Math.PI / 2; if (t >= A.open) { c.state = 'write'; } return; }
  if (c.state === 'write') { c.act = { k: 'idle', arms: 'write' }; c.yaw = -Math.PI / 2; if (t >= A.open + 480) { c.state = 'patrol'; c.t0 = t; } return; }
  if (c.spotFor) { c.act = { k: 'spot' }; if (!moving(c)) faceTo(c, c.spotFor.pos.x, c.spotFor.pos.z); return; }
  if (c.state === 'patrol') {
    c.act = moving(c) ? { k: 'walk' } : { k: 'idle', arms: 'fold' };
    if (!moving(c) && t - c.t0 > 90) { c.t0 = t; const racks = STATIONS.filter(s => s.zone === 'racks' || s.zone === 'platforms'); const s = racks[Math.floor(A.rng() * racks.length)]; go(c, s.rest.x - 0.6, s.rest.z + 0.6); }
    if (!moving(c)) { const s = nearestOf(['rack', 'olyplat'], c, s => !!s.active); if (s) faceTo(c, s.x, s.z); }
  }
}
function updateCleaner(c, dt) {
  const t = A.t;
  if (c.state === 'leave') { c.act = { k: 'walk' }; if (!moving(c)) { c.visible = false; c.state = 'gone'; A.cleaners = A.cleaners.filter(x => x !== c); } return; }
  if (c.state === 'idle') {
    c.act = { k: 'idle', arms: 'rest' };
    // nearest mess: loaded bar left on a rack, stray dumbbells, or a recently used bench/machine to wipe
    let best = null, bd = 1e9, kind = null;
    for (const s of STATIONS) {
      if (s.cleanBy || s.users.length) continue;
      const d = Math.hypot(s.x - c.pos.x, s.z - c.pos.z);
      if (s.dirty > 20 && d < bd) { bd = d; best = s; kind = 'strip'; }
      else if (s.strayDB > 0 && d < bd) { bd = d; best = s; kind = 'db'; }
    }
    if (!best) for (const s of STATIONS) { if (s.cleanBy || s.users.length || (s.zone !== 'machines' && s.type !== 'bench')) continue; if (t - s.lastUsed < 900 && !s.wiped) { const d = Math.hypot(s.x - c.pos.x, s.z - c.pos.z); if (d < bd) { bd = d; best = s; kind = 'wipe'; } } }
    if (best) { best.cleanBy = c; c.task = { s: best, kind }; c.state = 'go'; const p = best.rest; go(c, p.x, p.z); }
    else if (!moving(c) && A.rng() < 0.01) { const p = { x: rnd(-10, 8), z: rnd(-1, 3) }; go(c, -6 + A.rng() * 12, 1.5 + A.rng() * 1.5); }
    if (moving(c)) c.act = { k: 'walk' };
    return;
  }
  const task = c.task; const s = task && task.s;
  if (!s) { c.state = 'idle'; return; }
  if (s.users.length) { s.cleanBy = null; c.task = null; c.state = 'idle'; return; }
  if (c.state === 'go') { c.act = { k: 'walk' }; if (!moving(c)) { c.state = 'work'; c.t0 = t; faceTo(c, s.x, s.z); } return; }
  if (c.state === 'work') {
    const dur = task.kind === 'strip' ? 25 : task.kind === 'db' ? 8 : 14;
    c.act = { k: 'clean', kind: task.kind, s };
    if (t - c.t0 > dur) {
      if (task.kind === 'strip') { s.dirty = 0; s.load = 20; }
      if (task.kind === 'db') { s.strayDB = Math.max(0, s.strayDB - 1); c.carry = true; c.state = 'return'; go(c, DBZONE.x, DBZONE.zc + (A.rng() - 0.5) * DBZONE.span); return; }
      if (task.kind === 'wipe') s.wiped = true;
      s.cleanBy = null; c.task = null; c.state = 'idle';
    }
    return;
  }
  if (c.state === 'return') { c.act = { k: 'walk', carry: true }; if (!moving(c)) { c.carry = false; s.cleanBy = null; c.task = null; c.state = 'idle'; } }
}
// stations used later are "wiped" again after new use
function markUsed() { for (const s of STATIONS) if (s.users.length) s.wiped = false; }
