// ================================================================ first session (Plan 10, frames 3–6): the doors open on the player's new gym, the camera follows
// the first member in, hands off after about 8 seconds, then a card asks for a goal; the goal's progress sits under the HUD clock.
const INTRO = { phase: 'off', t: 0, a: null };   /* off | wait (for the first member) | follow | goal (card up) | done */
const GOAL = { key: null };
const INTRO_FOLLOW_S = 8;
function introWantedFor(search) { const q = new URLSearchParams(search); return !q.has('selftest') && !q.has('shot'); }   /* owner 2026-11-15: every load starts at the size screen (nothing is saved and the sample is hidden); never on test or screenshot pages */
function introWanted() { return introWantedFor(location.search); }
function onGymOpened(wasIntro) {
  if (!wasIntro || !A) return;
  const at = A.members.length ? A.members[0].spawnT - 5 : A.open - 60; if (A.t < at) fastForward(at - A.t);   /* the clock moves to just before the first member arrives (review I1: not a long empty door) */
  S.speed = 10; syncSpeed();   /* owner 2026-11-15: the opening, following the first member in, runs at 10× */
  goOn = true; refreshGo(); INTRO.phase = 'wait'; INTRO.t = 0; INTRO.a = null;
  view.target.set(DOOR.x, 0, HZ - 2); view.zoomT = 2.2;
}
function updateIntro(real) {
  if (INTRO.phase === 'wait') {
    if (followA || (A && (A.closed || A.done))) { showGoalCard(); return; }   /* the player already follows someone, or the day is closed: no automatic follow */
    const a = AGENTS.find(q => q.visible && q.kind === 'member');
    if (a) { a.straight = true; if (!a.exI && a.state !== 'ex') squatFirst(a); if (a.state === 'toLocker' || a.state === 'locker') skipLocker(a); else squatNow(a); onAgentPicked(a); INTRO.a = a; INTRO.t = 0; INTRO.phase = 'follow'; }   /* owner 2026-11-15: no changing room for the member the opening follows */
  } else if (INTRO.phase === 'follow') {
    INTRO.t += real;
    if (followA !== INTRO.a || INTRO.t >= INTRO_FOLLOW_S) {   /* the player picked someone else, or the follow has run its time */
      if (followA === INTRO.a) clearFollow();
      showToast(followWord());
      showGoalCard();
    }
  }
}
function followWord() { return matchMedia('(pointer: coarse)').matches ? tx('Tap anyone to follow them', '點任何人就能跟著看') : tx('Click anyone to follow them', '點任何人就能跟著看'); }
function showGoalCard(change) {
  const c = document.getElementById('goalCard'); if (!c) return;
  if (INTRO.phase === 'follow' && followA === INTRO.a) clearFollow();   /* logged minor 5: the card always ends the automatic follow */
  INTRO.phase = 'goal'; c.dataset.mode = change ? 'change' : 'first';
  c.innerHTML = `<h2 class="ttl">${tx('What do you want to try first?', '你想先挑戰什麼？')}</h2>${GOALS.map(([k, en, zh]) => `<button data-goal="${k}">${tx(en, zh)}</button>`).join('')}
    <button data-goal="" class="skip">${tx("Skip, I'll explore", '先跳過，自己逛逛')}</button><p class="note">${tx('The gym keeps running. Change it any time with the Goal button.', '健身房會繼續營業。之後隨時可以按「目標」更換。')}</p>`;
  c.hidden = false;
}
function hideGoalCard() { const c = document.getElementById('goalCard'); if (c) c.hidden = true; }
document.addEventListener('click', (e) => {
  const b = e.target.closest && e.target.closest('#goalCard button[data-goal]'); if (!b) return;
  const keep = !b.dataset.goal && document.getElementById('goalCard').dataset.mode === 'change';   /* Skip from Change goal keeps the goal */
  if (!keep) GOAL.key = b.dataset.goal || null; hideGoalCard(); INTRO.phase = 'done'; if (typeof updateMonitors === 'function') updateMonitors();
});
function resetGoal() { GOAL.key = null; }
function goalNow() {
  if (!GOAL.key || !BIZ || !M) return null;
  return goalStatus(GOAL.key, { months: BIZ.months, mtdEbitda: projectMonth().mtd.ebitda, monthIndex: BIZ.monthIndex, cashOut: !!BIZ.cashOutAt, cashOutMonth: BIZ.cashOutAt ? BIZ.cashOutAt.mi : null, openCash: BIZ.openCash, poolNow: M.pool.length, lapsedNow: M.lapsedTotal, startPool: M.pool.length + M.lapsedTotal });
}
function goalLineText() { const g = goalNow(); if (!g) return ''; const lab = GOALS.find(x => x[0] === GOAL.key); return tx(`Goal: ${lab[1]} · ${g.text.en}`, `目標：${lab[2]} · ${g.text.zh}`); }
function updateGoalLine() {
  const el = document.getElementById('goalLine'); if (!el) return; const g = goalNow(), t = g ? goalLineText() : '';
  if (el.textContent !== t) el.textContent = t; el.className = 'goal' + (g ? ' ' + g.state : '');
}
