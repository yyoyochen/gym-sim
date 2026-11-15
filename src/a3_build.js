// ================================================================ gym builder model (Plan 8): plot cells, presets, equipment prices, rules and costs. Pure (no THREE, no DOM).
const CELL = 1.82;                                                   // one grid cell is 1.82 m square, about 1 坪
const PRESETS = { S: { w: 10, d: 8 }, M: { w: 16, d: 10 }, L: { w: 20, d: 16 } };
const BUILD_LIMITS = { minPing: 60, minW: 8, minD: 7, maxW: 24, maxD: 18 };   // 8 x 7 fits the desk, door and two washrooms (they reach 12.2 m back from the street wall); 24 x 18 keeps clear of the side streets
const SAMPLE_PING = 181;                                             // today's sample hall, 30 x 20 m
const SAMPLE_COUNTS = { cardio: 9, machines: 7, racks: 6, plats: 2, benches: 6, plates: 4 };
// researched mid-tier defaults for Taipei, $ each net of the 5% business tax: a rack set includes its bar,
// plates and floor; cardio is a blend of treadmills, rower, bike and air bike; the fixed kit is dumbbells, cable tower, turf + sled, pull-up and mats
const EQUIP_PRICE = { cardio: 105000, machines: 130000, racks: 120000, plats: 65000, benches: 20000, plates: 90000 };
const FIXED_KIT = [['dumbbells', 180000], ['cable', 200000], ['turf', 35000], ['pullup', 20000], ['mats', 60000]];
// fit-out: 35k a 坪 plus a lump sum for showers, soundproofing and the interior-decoration permit; 3 months' deposit; the first month rent-free; 5-year lives
const FIT_OUT_PER_PING = 35000, FIT_OUT_FIXED = 1000000, DEPOSIT_MONTHS = 3, RENT_FREE_MONTHS = 1, FIT_OUT_YEARS = 5, EQUIP_YEARS = 5;
// default counts for a plot: the sample gym's counts scaled by floor area, at least one of each
function presetCounts(w, d) {
  const k = (w * d) / SAMPLE_PING, out = {};
  for (const key in SAMPLE_COUNTS) out[key] = Math.max(1, Math.round(SAMPLE_COUNTS[key] * k));
  return out;
}
// the rules a rectangle must meet; door on the street and one connected shape always hold for a rectangle
function checkPlot(w, d) {
  const L = BUILD_LIMITS, rules = [
    { key: 'area', ok: w * d >= L.minPing },
    { key: 'size', ok: w >= L.minW && d >= L.minD },
    { key: 'fits', ok: w <= L.maxW && d <= L.maxD },
    { key: 'door', ok: true }, { key: 'connected', ok: true },
  ];
  return { ok: rules.every(r => r.ok), rules };
}
// what a build costs: monthly rent + management, fit-out, deposit, equipment line by line, capex and yearly depreciation
function buildCost(plan, c = COSTS) {
  const ping = plan.w * plan.d, rentMonth = ping * (c.rentRate + c.mgmtPerPing), fitOut = ping * FIT_OUT_PER_PING + FIT_OUT_FIXED, deposit = DEPOSIT_MONTHS * rentMonth;
  const items = Object.keys(EQUIP_PRICE).map(key => ({ key, n: plan.counts[key] || 0, price: EQUIP_PRICE[key] })).concat(FIXED_KIT.filter(([key]) => !plan.kit || plan.kit[key]).map(([key, price]) => ({ key, n: 1, price })));   /* plan.kit: the fixed zones actually placed */
  const equipment = items.reduce((s, it) => s + it.n * it.price, 0);
  return { ping, rentMonth, fitOut, deposit, rentFreeMonths: RENT_FREE_MONTHS, equipment, items, capex: fitOut + equipment, depYear: fitOut / FIT_OUT_YEARS + equipment / EQUIP_YEARS };
}
// ================================================================ first session (Plan 10): running cost and runway for the builder's money step, and the starter goals
function monthlyRunCost(rentMonth, staff, loanPay, c = COSTS) { return rentMonth + c.elec + c.otherOpex + staff + loanPay; }
function runwayMonths(cash, monthly) { return monthly > 0 ? cash / monthly : Infinity; }
const GOALS = [['members500', 'Reach 500 members by the end of month 3', '第三個月底前達到 500 位會員'], ['cash12', "Don't run out of cash in year 1", '第一年現金不用完'], ['keep92', 'Keep at least 92% of members every month', '每個月都留住至少 92% 的會員']];   /* owner 2026-11-15: attainable with effort; no month-1 profit */
// s: { months (archived), mtdEbitda, monthIndex, cashOut, lapsedNow, startPool } -> { state: on | met | missed, text: { en, zh } }
function goalStatus(key, s) {
  const T = (en, zh) => ({ en, zh });
  if (key === 'members500') {
    const hit = s.months.slice(0, 3).some(m => m.members >= 500) || (s.months.length < 3 && s.poolNow >= 500);
    if (hit) return { state: 'met', text: T('500 members reached', '已達 500 位會員') };
    if (s.months.length >= 3) return { state: 'missed', text: T(`month 3 ended at ${s.months[2].members}`, `第三個月結束時 ${s.months[2].members} 位`) };
    return { state: 'on', text: T(`${s.poolNow} of 500 · month ${s.monthIndex + 1} of 3`, `${s.poolNow}/500 位 · 第 ${s.monthIndex + 1}/3 個月`) };
  }
  if (key === 'cash12') {
    if (s.openCash < 0) return { state: 'missed', text: T('opened overdrawn', '開幕就透支') };
    if (s.cashOut && (s.cashOutMonth == null || s.cashOutMonth < 12)) return { state: 'missed', text: T('cash ran out', '現金用完了') };   /* a year-1 goal: running out later doesn't undo it */
    if (s.months.length >= 12) return { state: 'met', text: T('a year without running out', '整年現金沒用完') };
    return { state: 'on', text: T(`month ${s.monthIndex + 1} of 12`, `第 ${s.monthIndex + 1}/12 個月`) };
  }
  if (key === 'keep92') {
    const kept = (m) => 1 - m.lapsed / Math.max(1, m.members + m.lapsed), pct = (k) => (Math.floor(k * 1000) / 10).toFixed(1).replace(/\.0$/, '');   /* rounded down: 91.96% never reads as 92% */
    const bad = s.months.slice(0, 12).find(m => kept(m) < 0.92);
    if (bad) return { state: 'missed', text: T(`a month kept ${pct(kept(bad))}%`, `有一個月只留住 ${pct(kept(bad))}%`) };
    if (s.months.length >= 12) return { state: 'met', text: T('a year at 92% or more', '整年都在 92% 以上') };
    const k = Math.round(100 * (1 - s.lapsedNow / Math.max(1, s.startPool)));
    return { state: 'on', text: T(`${k}% kept so far`, `目前留住 ${k}%`) };
  }
  return { state: 'on', text: T('', '') };
}
