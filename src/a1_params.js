
// ================================================================ parameters (pure: no THREE, no DOM, so Node can unit-test this file)
// Weekly demand shape: people present, as % of the week's busiest hour, for each hour 07..23 (Google Popular Times)
const POP_TIMES = {
  Mon: [13, 14, 21, 28, 34, 42, 43, 45, 45, 48, 54, 63, 61, 57, 52, 41, 29],
  Tue: [13, 13, 11, 13, 17, 23, 25, 26, 34, 43, 64, 90, 100, 85, 65, 45, 30],
  Wed: [7, 8, 14, 26, 37, 42, 41, 34, 36, 45, 57, 73, 83, 73, 59, 43, 27],
  Thu: [19, 21, 27, 26, 27, 30, 34, 36, 39, 41, 54, 70, 80, 78, 71, 54, 39],
  Fri: [8, 15, 22, 33, 42, 51, 50, 42, 34, 28, 32, 36, 41, 39, 38, 32, 27],
  Sat: [0, 18, 28, 32, 33, 29, 28, 30, 36, 38, 40, 42, 42, 43, 36, 28, 19],
  Sun: [0, 19, 32, 39, 42, 40, 36, 37, 39, 39, 35, 32, 30, 30, 28, 21, 11]
};
const DEMAND = { peak: 35, stay: 70 };   // people present at the weekly peak (Tue 19:00), average stay in minutes
// day types offered in the panel: which days' shapes to average, a seasonal multiplier, and the opening hour
const DAY_TYPES = {
  Weekday: { days: ['Mon', 'Tue', 'Wed', 'Thu'], mult: 1, open: 7 },
  Weekend: { days: ['Sat', 'Sun'], mult: 1, open: 8 },
  'January rush': { days: ['Mon', 'Tue', 'Wed', 'Thu'], mult: 1.04, open: 7 },
  'Holiday week': { days: ['Sat', 'Sun'], mult: 0.86, open: 8 }   // Lunar New Year month
};
function dayShape(dayType, heat) {
  const D = DAY_TYPES[dayType] || (POP_TIMES[dayType] ? { days: [dayType], mult: 1 } : DAY_TYPES.Weekday);
  return POP_TIMES.Mon.map((_, i) => {
    let v = D.days.reduce((s, d) => s + POP_TIMES[d][i], 0) / D.days.length * D.mult;
    const h = 7 + i;
    if (heat) { if (h >= 12 && h <= 15) v *= 0.5; else if (h <= 9 || h >= 20) v *= 1.15; }
    return v;
  });
}
// visits a day = person-hours / stay; arrivals follow the shape (people present ≈ arrivals x stay)
function dayDemand(shape, peak, stayMin) {
  const sum = shape.reduce((s, v) => s + v, 0);
  return { visits: Math.round(sum / 100 * peak / (stayMin / 60)), weights: shape.map(v => sum ? v / sum : 0) };
}
// coaching: in-house PT sessions and outside-coach rentals a month, pack mix for 8 / 16 / 24 sessions
const PT = { sessions: 130, rentals: 60, mix: [0.45, 0.37, 0.18], daysPerMonth: 30.4, renew: 0.5, convert: 4.8 / 5800 };   // renew: P5.12; convert: ≈4.8 new clients a month over ≈5,800 visits
const PACK_N = [8, 16, 24];
function avgPackSessions() { return PT.mix.reduce((s, p, i) => s + p * PACK_N[i], 0); }
function pickPack(u) { let c = 0; for (let i = 0; i < PT.mix.length; i++) { c += PT.mix[i]; if (u < c) return i; } return PT.mix.length - 1; }
function coachedShare(visitsPerDay) { const n = PT.sessions + PT.rentals; return n && visitsPerDay ? n / PT.daysPerMonth / visitsPerDay : 0; }
function outsideShare() { const n = PT.sessions + PT.rentals; return n ? PT.rentals / n : 0; }
// default member mix in whole percents summing to 100: coached share from coaching volume, the rest keeps these proportions
const MIX_BASE = { power: 20, oly: 6, body: 30, beginner: 34 };
function defaultMix(coachPct) {
  const keys = Object.keys(MIX_BASE), tot = keys.reduce((s, k) => s + MIX_BASE[k], 0), left = 100 - coachPct;
  const raw = keys.map(k => MIX_BASE[k] * left / tot), out = raw.map(Math.floor);
  let spare = left - out.reduce((s, x) => s + x, 0);
  raw.map((r, i) => [r - out[i], i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (spare > 0) { out[i]++; spare--; } });   // largest remainder
  const mix = {}; keys.forEach((k, i) => mix[k] = out[i]); mix.coach = coachPct; return mix;
}
// ================================================================ the month: calendar, weekday busyness, opening hours, churn and returns
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SEASON = [1.04, 0.86, 1.08, 1.03, 1.05, 1.00, 0.97, 0.97, 1.01, 1.01, 1.00, 0.98];   // visits by month, Lunar New Year in Feb
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// owner 2026-11-15: the business opens on today's date; the first month is the rest of this month
function daysInMonth(year, name) { return new Date(Date.UTC(year, MONTH_NAMES.indexOf(name) + 1, 0)).getUTCDate(); }
function todayStart(d) { return { year: d.getFullYear(), month: MONTH_NAMES[d.getMonth()], startDay: d.getDate() }; }
function calendar(year, month) {
  const n = new Date(Date.UTC(year, month, 0)).getUTCDate(), out = [];
  for (let d = 1; d <= n; d++) out.push({ day: d, dow: DOW[new Date(Date.UTC(year, month - 1, d)).getUTCDay()], mult: SEASON[month - 1] });
  return out;
}
const sum17 = (r) => r.reduce((s, v) => s + v, 0);
function dayFactor(dow, mult) { const mean = Object.values(POP_TIMES).reduce((s, r) => s + sum17(r), 0) / 7; return sum17(POP_TIMES[dow]) / mean * mult; }
// day weather: about one typhoon closure a year, July to October (P2.10); rain days trim visits by 5% (P2.11)
const WEATHER_DAY = { typhoonPerYear: 1, typhoonMonths: [7, 8, 9, 10], rainMult: 0.95 };
function openHour(dow) { return dow === 'Sat' || dow === 'Sun' ? 8 : 7; }
// % a month: tenured churn, early-tenure multipliers by whole months of tenure, low/high visit-frequency multipliers,
// returns by whole months since lapsing, new joins a month at base, member card price
const CHURN = { tenured: 5.5, early: [1.5, 1.5, 1.5, 1.33, 1.17, 1.0], freqLow: 2.5, freqHigh: 0.6, react: [3, 3, 3, 2.33, 1.67, 1.0], newPerMonth: 58, card: 100 };
function dailyRate(monthlyPct) { return monthlyPct >= 100 ? 1 : 1 - Math.pow(1 - Math.max(0, monthlyPct) / 100, 1 / 30.4); }
// monthly churn %: tenure (early months), visit frequency, bad visits in the last 30 days (P4.11), and a lean roster (D10) that
// makes early tenure and bad visits bite harder; bad visits can at most double the rate
function churnMonthly(tenureMonths, visits30, bad = 0, adj = 0) {
  const f = visits30 == null ? 1 : visits30 <= 1 ? CHURN.freqLow : visits30 >= 6 ? CHURN.freqHigh : 1;   // null: under 30 days old, not judged on frequency yet
  const early = CHURN.early[Math.min(Math.max(0, Math.floor(tenureMonths)), 5)], e = 1 + (early - 1) * (1 + adj);
  const noBad = CHURN.tenured * e * f;
  return Math.min(noBad + DEMAND_RESP.badPts * (1 + adj) * bad, DEMAND_RESP.badCap * noBad);
}
function reactMonthly(monthsSinceLapse) { return CHURN.react[Math.min(Math.max(0, Math.floor(monthsSinceLapse)), 5)]; }
// ================================================================ demand response: prices, peak premium, staffing, rentals, the door queue
// price elasticity of minutes from existing members and of new joins (P3.12, P3.12b); peak shift and loss per extra premium (P3.13);
// churn points per bad visit (P4.11, wait over badWait minutes); lean-roster effect (D10, invented 30%); rental elasticity and the
// share of removed outside clients who move to in-house PT (P5.17); balkScale: minutes of expected door wait for 63% to walk away (invented)
const DEMAND_RESP = { basePrice: 0.704 * 1.2 + 0.296 * 1.5,   // today's blended price exactly (P2.7 rounds it to 1.29)
  eExisting: -0.4, eNew: -0.8, basePremium: 0.25, shift: 0.10, lost: 0.05, badPts: 0.75, badCap: 2, badWait: 10,
  staffBase: 184000, staffLean: 133000, leanAdj: 0.3, rentBase: 250, rentElastic: -1, substitute: 0.25, balkScale: 15 };
function blendedPrice(off, peak) { return 0.704 * off + 0.296 * peak; }
function priceVisitMult(blended, e) { return Math.pow(Math.max(0.1, blended) / DEMAND_RESP.basePrice, e); }
function peakShiftWeights(weights, dow, premium) {
  const w = weights.slice();
  if (dow === 'Sat' || dow === 'Sun') return w;
  const k = (premium - DEMAND_RESP.basePremium) / DEMAND_RESP.basePremium, P = w[11] + w[12] + w[13] + w[14];
  if (!P || Math.abs(k) < 1e-9) return w;   // today's premium (1.5 / 1.2 - 1 is 0.25 only up to rounding) shifts nothing
  const mv = DEMAND_RESP.shift * k * P, lo = Math.max(0, DEMAND_RESP.lost * k) * P, keep = Math.max(0, 1 - (mv + lo) / P);
  for (const i of [11, 12, 13, 14]) w[i] *= keep;
  for (const i of [9, 10, 15]) w[i] = Math.max(0, w[i] + mv / 3);
  return w;
}
function staffAdj(staff) { const d = DEMAND_RESP; return d.leanAdj * Math.min(1, Math.max(0, (d.staffBase - staff) / (d.staffBase - d.staffLean))); }
function balkProb(waitMin) { return 1 - Math.exp(-Math.max(0, waitMin) / DEMAND_RESP.balkScale); }
// new build: share of steady-state demand reached m months after opening (opens at 25%, time constant 6.4 months: P4.13, P4.16)
// owner 2026-11-20 (research): 15% suits a gym with no pre-sale; with a pre-opening campaign 20-30% is defensible, so a built gym opens at 25%
const RAMP = { open: 0.25, tau: 6.4 };
function rampLevel(m) { return 1 - (1 - RAMP.open) * Math.exp(-Math.max(0, m) / RAMP.tau); }
// ================================================================ pricing mix (owner 2026-11-20): an adjustable PT session price and an optional monthly pass
// PT: the price of one session in the pack of 8; the packs of 16 and 24 are $100 and $200 a session cheaper, paid in instalments of 8 sessions
// (the first at the full price, each later one $200 a session cheaper). At PT_BASE this is the price list of 2026-11. ePrice: invented, unit elastic.
const PT_BASE = 1690, PT_E_PRICE = -1;
function ptPacks(p = PT_BASE) {
  return [{ n: 8, price: 8 * p, parts: [8 * p] }, { n: 16, price: 16 * (p - 100), parts: [8 * p, 8 * (p - 200)] }, { n: 24, price: 24 * (p - 200), parts: [8 * p, 8 * (p - 200), 8 * (p - 400)] }];
}
function ptDemandMult(p) { return p === PT_BASE ? 1 : Math.pow(Math.max(100, p) / PT_BASE, PT_E_PRICE); }
// Monthly pass: unlimited visits for 30 days. A member takes it when it costs less than their month of visits by the minute, give or take a
// personal taste of ±25% (invented). Pass holders come 25% more often (the next visit is free; invented). pr: { off, peak, cap, perMinOn, monthlyOn, monthly }
const PASS = { price: 1000,   /* no-contract gyms in Taipei sell a month at about 880-1,088 (research 2026-11-20) */ visitUp: 1.25, taste: 0.25, days: 30, typicalVisits: 6 };
function payPerUseMonth(vpu, off, peak, cap, stay = DEMAND.stay) { return vpu * Math.min(cap, Math.round(stay * blendedPrice(off, peak))); }
function memberTaste(id) { let x = Math.imul(id + 1, 2654435761) >>> 0; x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x = (x ^ (x >>> 13)) >>> 0; return x / 2147483648 - 1; }
function wantsPass(vpu, id, pr) {
  if (!pr.monthlyOn) return false;
  if (!pr.perMinOn) return true;
  return pr.monthly < payPerUseMonth(vpu, pr.off, pr.peak, pr.cap) * (1 + PASS.taste * memberTaste(id));
}
// a pass-only gym: a member whose visits were worth less than the pass leaves faster (square root of the overpayment, at most double)
function passChurnMult(vpu, pr) {
  if (!pr.monthlyOn || pr.perMinOn) return 1;
  return Math.min(2, Math.max(1, Math.sqrt(pr.monthly / Math.max(1, payPerUseMonth(vpu, pr.off, pr.peak, pr.cap)))));
}
// the per-minute price a newcomer effectively faces (feeds the join elasticity): a typical newcomer makes 6 visits a month
function joinPrice(pr) {
  const b = blendedPrice(pr.off, pr.peak); if (!pr.monthlyOn) return b;
  const k = pr.monthly / payPerUseMonth(PASS.typicalVisits, pr.off, pr.peak, pr.cap);
  return b * (pr.perMinOn ? Math.min(1, k) : k);
}
// owner 2026-11-20 (research): the crowd follows the floor. 35 at the weekly peak and room for 60 are the 115-ping sample's figures
// (about 8 m2 of net floor each when busy, about 5 m2 when full); other sizes scale with the area: 80 ping about 24, 160 about 49, 320 about 97
function peakForPing(ping) { return Math.round(DEMAND.peak * ping / 115); }
function capForPing(ping) { return Math.round(60 * ping / 115); }
