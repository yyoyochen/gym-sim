
// ================================================================ agent looks: palettes, body types and how a look is rolled
// Pure data and functions (no THREE, no DOM), so catalog.html can load this file as it is. drawBody (b_inst.js) reads look.phys.
const SHIRTS = ['#d6403a', '#2f68ab', '#f2f1ea', '#dfe03a', '#63a845', '#d07a8e', '#e08f5a', '#74abe0', '#8a4f7d', '#1c1f2a', '#959bab', '#2c6a52', '#9b2226', '#f0a060'];
const SKINS = ['#f0caa4', '#d9a77e', '#b5805a', '#8a5a3c', '#5a3825'];
const HAIRS = ['#1c1f2a', '#45291b', '#643c24', '#c99a5e', '#959bab', '#2b1a12', '#9b2226'];
const SHORTS = ['#1c1f2a', '#474c5c', '#1e4a85', '#2f3340', '#5c1418'];
const SHOES = ['#f2f1ea', '#1c1f2a', '#d6403a', '#2f68ab'];
const CAPS = ['#1c1f2a', '#f2f1ea', '#d6403a'];
// body types: multipliers on the base rig (1 = the original average figure). Height is look.scale and is separate.
//  sw shoulder spread, cw chest width, cd chest depth, hw hip width, hd hip depth, aw arm thickness, lw leg thickness,
//  hs head size, belly forward bulge of the lower torso (metres at scale 1; 0 = none).
const PHYS = {
  slim:     { label: 'Slim',     sw: 0.92, cw: 0.88, cd: 0.84, hw: 0.9,  hd: 0.86, aw: 0.8,  lw: 0.8,  hs: 1.02, belly: 0 },
  average:  { label: 'Average',  sw: 1,    cw: 1,    cd: 1,    hw: 1,    hd: 1,    aw: 1,    lw: 1,    hs: 1,    belly: 0 },
  athletic: { label: 'Athletic', sw: 1.12, cw: 1.16, cd: 1.06, hw: 1,    hd: 1,    aw: 1.15, lw: 1.1,  hs: 1,    belly: 0 },
  muscular: { label: 'Muscular', sw: 1.26, cw: 1.38, cd: 1.2,  hw: 1.08, hd: 1.1,  aw: 1.42, lw: 1.26, hs: 0.97, belly: 0 },
  stocky:   { label: 'Stocky',   sw: 1.1,  cw: 1.28, cd: 1.36, hw: 1.24, hd: 1.3,  aw: 1.25, lw: 1.3,  hs: 1,    belly: 0.13 },
  pear:     { label: 'Pear',     sw: 0.95, cw: 0.94, cd: 0.96, hw: 1.3,  hd: 1.18, aw: 0.9,  lw: 1.22, hs: 1,    belly: 0 }
};
const PHYS_KEYS = Object.keys(PHYS);
// share of each body type in the crowd (a weighted pick; coaches draw from COACH_PHYS)
const PHYS_MIX = {
  f: { slim: 0.24, average: 0.30, athletic: 0.16, muscular: 0.02, stocky: 0.08, pear: 0.20 },
  m: { slim: 0.14, average: 0.30, athletic: 0.24, muscular: 0.12, stocky: 0.20, pear: 0 }
};
const COACH_PHYS = ['athletic', 'muscular', 'average'];
// heights as look.scale, by sex (the sim rolls any value in the short..tall range)
const HEIGHTS = { short: { f: 0.9, m: 0.97 }, medium: { f: 0.94, m: 1.015 }, tall: { f: 0.98, m: 1.06 } };
// garment, hair and shoe options (drawn in b_inst.js); each is a share of the crowd by sex, rolled by lookRoll below
const TOPS = { tee: 'T-shirt', tank: 'Tank top', long: 'Long sleeve', hoodie: 'Hoodie' };
const BOTTOMS = { shorts: 'Shorts', bike: 'Bike shorts', yoga: 'Yoga pants', trousers: 'Trousers' };
const HAIRSTYLES = { bald: 'Bald', buzz: 'Buzz cut', short: 'Short', quiff: 'Quiff', long: 'Long', ponytail: 'Ponytail', bun: 'Bun', curly: 'Curly' };
const CAPSTYLES = { cap: 'Cap', visor: 'Visor', beanie: 'Beanie', headband: 'Headband' };
const SHOETYPES = { sneaker: 'Sneaker', runner: 'Runner', hightop: 'High-top', flat: 'Lifting flat', slides: 'Slides' };
const MIX = {
  top:    { f: { tee: 0.4, tank: 0.3, long: 0.2, hoodie: 0.1 }, m: { tee: 0.5, tank: 0.2, long: 0.2, hoodie: 0.1 } },
  bottom: { f: { shorts: 0.25, bike: 0.1, yoga: 0.4, trousers: 0.25 }, m: { shorts: 0.45, bike: 0.05, yoga: 0.1, trousers: 0.4 } },
  hair:   { f: { long: 0.35, ponytail: 0.2, bun: 0.15, short: 0.15, curly: 0.1, buzz: 0.05 }, m: { short: 0.35, buzz: 0.15, quiff: 0.15, bald: 0.08, curly: 0.12, long: 0.08, ponytail: 0.04, bun: 0.03 } },
  shoe:   { f: { sneaker: 0.35, runner: 0.3, hightop: 0.1, flat: 0.15, slides: 0.1 }, m: { sneaker: 0.35, runner: 0.3, hightop: 0.1, flat: 0.15, slides: 0.1 } },
  cap:    { f: { cap: 0.5, visor: 0.15, beanie: 0.15, headband: 0.2 }, m: { cap: 0.5, visor: 0.15, beanie: 0.15, headband: 0.2 } }
};
// a number in [0,1) from the other fields of a look and a salt, so rolling these does not consume the sim's random stream (seeded runs keep their members)
function lookU(look, salt) {
  const s = salt + look.skin + look.hair + look.shirt + look.shorts + look.shoe + look.scale.toFixed(4);
  let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100000) / 100000;
}
function lookRoll(look, salt, female, table) { const mix = MIX[table][female ? 'f' : 'm'], u = lookU(look, salt); let acc = 0; for (const k in mix) { acc += mix[k]; if (u < acc) return k; } return Object.keys(mix)[0]; }
// a body type, same idea; coaches draw from COACH_PHYS
function physFor(look, female, kind) {
  const u = lookU(look, 'phys');
  if (kind === 'coach' || kind === 'pcoach') return COACH_PHYS[Math.floor(u * COACH_PHYS.length)];
  const mix = PHYS_MIX[female ? 'f' : 'm']; let acc = 0;
  for (const k of PHYS_KEYS) { acc += mix[k]; if (u < acc) return k; }
  return 'average';
}
function makeLook(rng, female, kind) {
  const look = { shirt: rng.pick(SHIRTS), shorts: rng.pick(SHORTS), skin: rng.pick(SKINS), hair: rng.pick(HAIRS), shoe: rng.pick(SHOES), scale: female ? rng.range(0.9, 0.98) : rng.range(0.97, 1.06) };
  if (female && rng() < 0.7) look.longHair = true; else look.hairH = rng.range(0.05, 0.1);   // (older fields, kept so the random stream is unchanged; hairStyle below is what is drawn)
  rng();   // was the leggings roll; bottom below replaces it
  if (rng() < 0.12) look.cap = rng.pick(CAPS);
  look.phys = physFor(look, female, kind);
  look.top = lookRoll(look, 'top', female, 'top'); look.bottom = lookRoll(look, 'bottom', female, 'bottom');
  look.hairStyle = lookRoll(look, 'hair', female, 'hair'); look.shoeType = lookRoll(look, 'shoe', female, 'shoe');
  if (look.cap) look.capStyle = lookRoll(look, 'cap', female, 'cap');
  if (kind === 'staff') Object.assign(look, { shirt: '#dfe03a', shorts: '#1c1f2a', top: 'tee', bottom: 'trousers' });
  if (kind === 'cleaner') Object.assign(look, { shirt: '#2f68ab', shorts: '#13305a', top: 'long', bottom: 'trousers', cap: '#13305a', capStyle: 'cap' });
  if (kind === 'coach' || kind === 'pcoach') Object.assign(look, { shirt: '#1c1f2a', sleeve: '#dfe03a', shorts: '#1c1f2a', top: 'tee', bottom: 'shorts' });
  return look;
}
