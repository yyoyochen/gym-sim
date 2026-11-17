
// ================================================================ agent looks: the catalog (data), who gets what, and makeLook
// Source of truth for every look axis. lookCatalog() turns it into the JSON catalog; drawBody (b_inst.js) draws it.
const SHIRTS = ['#d6403a', '#2f68ab', '#f2f1ea', '#dfe03a', '#63a845', '#d07a8e', '#e08f5a', '#74abe0', '#8a4f7d', '#1c1f2a', '#959bab', '#2c6a52', '#9b2226', '#f0a060'];
const SKINS = ['#f0caa4', '#d9a77e', '#b5805a', '#8a5a3c', '#5a3825'];
const HAIRS = ['#1c1f2a', '#45291b', '#643c24', '#c99a5e', '#959bab', '#2b1a12', '#9b2226'];
const BOTTOMS_C = ['#1c1f2a', '#474c5c', '#1e4a85', '#2f3340', '#5c1418'];
const SHOES_C = ['#f2f1ea', '#1c1f2a', '#d6403a', '#2f68ab'];
const CAPS_C = ['#1c1f2a', '#f2f1ea', '#d6403a'];
const HEIGHTS = { short: { woman: 0.9, man: 0.97 }, medium: { woman: 0.94, man: 1.015 }, tall: { woman: 0.98, man: 1.06 } };

// body types: multipliers on the base rig, 1 = average. Limb lengths never change, so every pose still reaches its bar, seat and pedals.
// sw shoulder spread, cw/cd chest width/depth, hw/hd hip width/depth, aw arm thickness, lw leg thickness, hs head size
const PHYSIQUES = {
  slim: { label: 'Slim', sw: 0.92, cw: 0.88, cd: 0.84, hw: 0.9, hd: 0.86, aw: 0.8, lw: 0.8, hs: 1.02 },
  average: { label: 'Average', sw: 1, cw: 1, cd: 1, hw: 1, hd: 1, aw: 1, lw: 1, hs: 1 },
  athletic: { label: 'Athletic', sw: 1.12, cw: 1.16, cd: 1.06, hw: 1, hd: 1, aw: 1.15, lw: 1.1, hs: 1 },
  muscular: { label: 'Muscular', sw: 1.26, cw: 1.38, cd: 1.2, hw: 1.08, hd: 1.1, aw: 1.42, lw: 1.26, hs: 0.97 },
  pear: { label: 'Pear', sw: 0.95, cw: 0.94, cd: 0.96, hw: 1.3, hd: 1.18, aw: 0.9, lw: 1.22, hs: 1 },
};
const PHYS_F = { sw: 0.92, cw: 0.93, aw: 0.88 };   /* women, on top of the body type: narrower shoulders and chest, slimmer arms */
// body type odds: by what someone trains (members) or their job, nudged by sex: each type's weight is scaled by how much more
// (or less) common it is for that sex than for both together, so men never roll pear and women rarely roll muscular
// while a bodybuilder stays mostly muscular
const PHYS_BY_GROUP = {
  power: { muscular: 0.55, athletic: 0.35, average: 0.1 },
  body: { muscular: 0.6, athletic: 0.35, average: 0.05 },
  oly: { athletic: 0.6, muscular: 0.25, slim: 0.1, average: 0.05 },
  beginner: { average: 0.45, slim: 0.3, pear: 0.15, athletic: 0.1 },
  client: { average: 0.45, slim: 0.25, pear: 0.15, athletic: 0.15 },
  coach: { athletic: 0.5, muscular: 0.35, average: 0.15 },
  other: { average: 0.55, slim: 0.25, pear: 0.15, athletic: 0.05 },
};
const PHYS_BY_SEX = {
  woman: { slim: 0.24, average: 0.34, athletic: 0.18, muscular: 0.02, pear: 0.22 },
  man: { slim: 0.16, average: 0.36, athletic: 0.32, muscular: 0.16, pear: 0 },
};
const HAIR_STYLES = {
  bald: 'no hair', buzz: 'top slab 0.03 high', short: 'top slab 0.05-0.10 high', quiff: 'short plus raised front block', long: 'short plus back block 0.3 high',
  ponytail: 'short plus nape block and hanging tail', bun: 'short plus block on top-back', curly: 'one big 0.30 x 0.20 x 0.27 block',
};
const HAIR_MIX = {
  woman: { long: 0.35, ponytail: 0.2, bun: 0.15, short: 0.15, curly: 0.1, buzz: 0.05 },
  man: { short: 0.35, buzz: 0.15, quiff: 0.15, bald: 0.08, curly: 0.12, long: 0.08, ponytail: 0.04, bun: 0.03 },
};
const HEADWEAR = { cap: 'crown plus brim', visor: 'band plus brim', beanie: 'tall box over head', headband: 'thin band' };
const HEADWEAR_MIX = { cap: 0.5, visor: 0.15, beanie: 0.15, headband: 0.2 };
const TOPS = { tee: 'sleeve to mid upper arm, bare forearm', tank: 'bare arms', long: 'sleeves to the wrist', hoodie: 'long sleeves, torso 8% wider and 14% deeper, hood block behind neck' };
const TOP_MIX = { woman: { tee: 0.4, tank: 0.3, long: 0.2, hoodie: 0.1 }, man: { tee: 0.5, tank: 0.2, long: 0.2, hoodie: 0.1 } };
const BOTTOMS = { shorts: 'coloured thigh, bare shin', bike: 'coloured upper half thigh, tight, bare below', yoga: 'coloured full leg, tight (0.92)', trousers: 'coloured full leg, loose (thigh 1.14, shin 1.18)' };
const BOTTOM_MIX = { woman: { shorts: 0.25, bike: 0.1, yoga: 0.4, trousers: 0.25 }, man: { shorts: 0.45, bike: 0.05, yoga: 0.1, trousers: 0.4 } };
const SHOE_TYPES = { sneaker: 'single 0.10 x 0.07 x 0.26 block', runner: 'chunky light sole plus upper', hightop: '0.13 high block', flat: 'lifting flat, 0.04 high thin block', slides: 'thin sole, bare foot, front strap' };
const SHOE_MIX = { sneaker: 0.35, runner: 0.3, hightop: 0.1, flat: 0.15, slides: 0.1 };
const ROLE_LOOKS = {
  staff: { shirt: '#dfe03a', shorts: '#1c1f2a', top: 'tee', bottom: 'trousers' },
  cleaner: { shirt: '#2f68ab', shorts: '#13305a', top: 'long', bottom: 'trousers', cap: '#13305a', capStyle: 'cap' },
  coach: { shirt: '#1c1f2a', sleeve: '#dfe03a', shorts: '#1c1f2a', top: 'tee', bottom: 'shorts' },
};

// Every pick past the colours hashes values the look already has (salted per axis) instead of drawing from the day's RNG,
// so the look catalog can grow without shifting a single seeded day.
function lookU(look, salt) { let h = 2166136261; for (const ch of `${salt}|${look.shirt}${look.skin}${look.hair}${look.shoe}${look.shorts}${look.scale}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return (h >>> 0) / 4294967296; }
function pickMix(mix, u) { const K = Object.keys(mix).filter(k => mix[k] > 0), T = K.reduce((s, k) => s + mix[k], 0); let m = u * T; for (const k of K) { m -= mix[k]; if (m <= 0) return k; } return K[K.length - 1]; }
function physMix(group, fem) {
  const g = PHYS_BY_GROUP[group] || PHYS_BY_GROUP.other, x = PHYS_BY_SEX[fem ? 'woman' : 'man'], out = {};
  for (const k in g) { const both = (PHYS_BY_SEX.woman[k] + PHYS_BY_SEX.man[k]) / 2; out[k] = both > 0 ? g[k] * x[k] / both : 0; }
  return out;
}
function pickPhysique(look, group) { return pickMix(physMix(group, look.fem), lookU(look, 'phys')); }
// fill any axis a look is missing (new looks, and looks from saves made before the axis existed)
function fillLook(look, group) {
  const sex = look.fem ? 'woman' : 'man';
  if (!PHYSIQUES[look.phys]) look.phys = PHYSIQUES[look.build] ? look.build : pickPhysique(look, group);   /* unknown or retired types (heavy, stocky) are re-rolled */
  if (!look.hairStyle) look.hairStyle = look.longHair ? 'long' : pickMix(HAIR_MIX[sex], lookU(look, 'hair'));
  if (!look.top) look.top = pickMix(TOP_MIX[sex], lookU(look, 'top'));
  if (!look.bottom) look.bottom = look.pants ? 'yoga' : pickMix(BOTTOM_MIX[sex], lookU(look, 'bottom'));
  if (!look.shoeType) look.shoeType = pickMix(SHOE_MIX, lookU(look, 'shoe'));
  if (look.cap && !look.capStyle) look.capStyle = pickMix(HEADWEAR_MIX, lookU(look, 'cap'));
  delete look.build; delete look.longHair; delete look.legs; delete look.pants;
  return look;
}
function makeLook(rng, female, kind) {
  const look = { shirt: rng.pick(SHIRTS), shorts: rng.pick(BOTTOMS_C), skin: rng.pick(SKINS), hair: rng.pick(HAIRS), shoe: rng.pick(SHOES_C), scale: female ? rng.range(0.9, 0.98) : rng.range(0.97, 1.06) };
  // these draws are kept, in this order, so every seeded day stays the same; their old meaning (long hair, leggings) now comes from the catalog
  if (!(female && rng() < 0.7)) look.hairH = rng.range(0.05, 0.1);
  rng();
  if (rng() < 0.12) look.cap = rng.pick(CAPS_C);
  look.fem = !!female;
  const role = kind === 'pcoach' ? 'coach' : kind;
  if (ROLE_LOOKS[role]) Object.assign(look, ROLE_LOOKS[role]);
  return fillLook(look, role === 'coach' ? 'coach' : 'other');
}
// resolved draw parameters per look (cached): body multipliers with the women's adjustment
const _lookCache = new WeakMap();
function lookDraw(look) {
  let d = _lookCache.get(look); if (d && d.phys === look.phys && d.fem === look.fem) return d;
  if (!PHYSIQUES[look.phys] || !look.hairStyle) fillLook(look, 'other');
  const w = { ...(PHYSIQUES[look.phys] || PHYSIQUES.average) }; if (look.fem) for (const k in PHYS_F) w[k] *= PHYS_F[k];
  d = { phys: look.phys, fem: look.fem, w }; _lookCache.set(look, d); return d;
}
// the catalog as data: every axis, its odds, and how many distinct people it can make
function lookCatalog() {
  const strip = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Object.fromEntries(Object.entries(v).filter(([kk]) => kk !== 'label'))]));
  const nonzero = (m) => Object.keys(m).filter(k => m[k] > 0);
  const hairN = (sex) => nonzero(HAIR_MIX[sex]).reduce((s, k) => s + (k === 'bald' ? 1 : HAIRS.length), 0);
  const physN = (sex) => Object.keys(PHYSIQUES).filter(k => Object.keys(PHYS_BY_GROUP).some(g => physMix(g, sex === 'woman')[k] > 0)).length;
  const head = 1 + Object.keys(HEADWEAR).length * CAPS_C.length, top = Object.keys(TOPS).length * SHIRTS.length, bottom = Object.keys(BOTTOMS).length * BOTTOMS_C.length, shoes = Object.keys(SHOE_TYPES).length * SHOES_C.length;
  const per = (sex) => physN(sex) * 3 * SKINS.length * hairN(sex) * head * top * bottom * shoes;
  return {
    _about: 'Agent look catalog for gymsim, generated from src/b0_look.js (data, odds, makeLook); drawn by drawBody in src/b_inst.js. Every choice past the colours is a salted hash of the look, never a draw from the day\'s RNG.',
    lookFields: { shirt: 'top colour', shorts: 'bottom colour, also hip block', skin: 'skin colour', hair: 'hair colour', shoe: 'shoe colour', scale: 'height multiplier (rig scale)', fem: 'woman (true) or man', phys: 'body type key', top: 'top type key', bottom: 'bottom type key', hairStyle: 'hair style key', hairH: 'short-hair height (0.05-0.10)', cap: 'optional headwear colour', capStyle: 'headwear type key, only when cap is set', shoeType: 'shoe type key', sleeve: 'optional sleeve colour override (coaches)', fore: 'optional forearm colour override' },
    axes: {
      bodyType: { lookField: 'phys', options: strip(PHYSIQUES), labels: Object.fromEntries(Object.entries(PHYSIQUES).map(([k, v]) => [k, v.label])), womenAdjust: PHYS_F,
        odds: 'byGroup[group][type] x bySex[sex][type] / mean(bySex.woman[type], bySex.man[type]), normalised', byGroup: PHYS_BY_GROUP, bySex: PHYS_BY_SEX },
      height: { lookField: 'scale', options: HEIGHTS, simRolls: { woman: [0.9, 0.98], man: [0.97, 1.06] } },
      skin: { lookField: 'skin', colours: SKINS },
      hairStyle: { lookField: 'hairStyle', options: HAIR_STYLES, mixBySex: HAIR_MIX, colours: HAIRS },
      headwear: { lookFields: ['cap', 'capStyle'], note: '12% of people roll one', options: HEADWEAR, mix: HEADWEAR_MIX, colours: CAPS_C },
      top: { lookField: 'top', options: TOPS, mixBySex: TOP_MIX, colours: SHIRTS },
      bottom: { lookField: 'bottom', options: BOTTOMS, mixBySex: BOTTOM_MIX, colours: BOTTOMS_C },
      shoes: { lookField: 'shoeType', options: SHOE_TYPES, mix: SHOE_MIX, colours: SHOES_C },
    },
    roleOverrides: ROLE_LOOKS,
    combinations: {
      perAxis: { bodyType: { man: physN('man'), woman: physN('woman') }, height: 3, skin: SKINS.length, hair: { man: hairN('man'), woman: hairN('woman') }, headwear: head, top, bottom, shoes },
      men: per('man'), women: per('woman'), total: per('man') + per('woman'),
      formula: 'per sex: bodyType (types that sex can roll) x height (3 named steps) x skin x hair (styles that sex can roll x colour, bald has none) x headwear (none or style x colour) x top (type x colour) x bottom (type x colour) x shoes (type x colour)',
    },
  };
}
