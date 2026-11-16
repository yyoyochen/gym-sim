// ================================================================ saved progress (owner 2026-11-15): like a life game, the business is kept in this browser and a
// reload carries on where it was. Each morning the day's inputs (the month record, the business and the equipment costs) are snapshotted; settings
// changed during the day are saved as they change. A reload rebuilds the day from that morning: each day's random numbers come from the seed and
// the day number, so the replayed day is the same day. What happened since the morning (a mid-day rearrange, the visits so far) is not kept.
const SAVE = { key: 'gymsim.save.v1', morning: null, live: false, lastSmall: '', lastMorning: null, warned: false };
function snapshotDay(i) {   /* called first thing in setupDay(i), before the day changes anything */
  try { SAVE.morning = JSON.stringify({ i, M, BIZ, S, PUBLISH, costs: { capex: COSTS.capex, depYear: COSTS.depYear } }); } catch (e) { SAVE.morning = null; }   /* the morning's settings too, so the day replays as it began */
}
function saveRecord() { return JSON.stringify({ v: 1, at: Date.now(), S, PUBLISH, goal: GOAL.key, snap: SAVE.morning }); }
function savingOn() { return SAVE.live && introWantedFor(location.search) && !(typeof BUILD !== 'undefined' && BUILD.on) && !(typeof closing !== 'undefined' && closing); }
function persistSave(force) {
  if (!introWantedFor(location.search) || !SAVE.morning) return; if (!force && !savingOn()) return;   /* never from test or screenshot pages */
  const small = JSON.stringify([S, PUBLISH, GOAL.key]); if (!force && small === SAVE.lastSmall && SAVE.morning === SAVE.lastMorning) return;
  try { localStorage.setItem(SAVE.key, saveRecord()); SAVE.lastSmall = small; SAVE.lastMorning = SAVE.morning; }
  catch (e) { if (!SAVE.warned) { SAVE.warned = true; if (typeof showToast === 'function') showToast(tx('This browser is not keeping your progress: closing the page will lose it.', '這個瀏覽器無法保存進度：關閉頁面就會遺失。')); } }
}
function loadGame(str) {   /* true when the record was restored and the day rebuilt from its morning */
  let rec = null, sn = null; try { rec = JSON.parse(str); sn = rec && rec.v === 1 && rec.snap ? JSON.parse(rec.snap) : null; } catch (e) { return false; }
  if (!sn || !sn.M || !sn.BIZ || !rec.S) return false;
  Object.assign(S, sn.S || rec.S); PUBLISH = sn.PUBLISH || null; GOAL.key = rec.goal || null;   /* the morning as it was */
  if (typeof BOOKS !== 'undefined') { BOOKS.stage = null; BOOKS.closed = null; }
  applyBuild(); COSTS.capex = sn.costs.capex; COSTS.depYear = sn.costs.depYear;   /* purchases and sales since opening */
  BIZ = sn.BIZ; M = sn.M;
  for (const m of M.pool.concat(M.lapsed || [])) if (m.look && !PHYSIQUES[m.look.phys]) { m.look.fem = !!m.female; delete m.look.phys; if (!PHYSIQUES[m.look.build]) m.look.phys = pickPhysique(m.look, m.arch); fillLook(m.look, m.arch); }   /* saves from before physiques */
  setupDay(sn.i);
  Object.assign(S, rec.S); PUBLISH = rec.PUBLISH || null; return true;   /* then what was changed during the day, as it was changed */
}
function resumeSaved() {   /* at boot: carry on the saved business, paused, instead of the size screen */
  let str = null; try { str = localStorage.getItem(SAVE.key); } catch (e) { return false; }
  if (!str || !loadGame(str)) return false;
  SAVE.live = true; SAVE.lastSmall = JSON.stringify([S, PUBLISH, GOAL.key]); SAVE.lastMorning = SAVE.morning;
  if (typeof INTRO !== 'undefined') INTRO.phase = 'done';
  if (typeof syncSetupWidgets === 'function') syncSetupWidgets(); if (typeof refreshPending === 'function') refreshPending(); if (typeof updateMonitors === 'function') updateMonitors();
  if (typeof showToast === 'function') showToast(tx(`Welcome back: your gym, from the morning of ${A.date} ${M.cfg.month}. Build a gym starts a new one.`, `歡迎回來：你的健身房，從 ${MONTH_NAMES.indexOf(M.cfg.month) + 1} 月 ${A.date} 日早上繼續。「設計健身房」可以開新的一間。`));
  return true;
}
setInterval(() => persistSave(false), 4000);   /* settings changed during the day */
