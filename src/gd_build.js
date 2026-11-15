// ================================================================ the gym builder (Plan 8, rectangles first): a mode of the diorama. Build a gym pauses the day,
// hides the panel and the people, lays a cell grid over the plot and previews the hall and equipment live; Open this gym starts a new business
// in it; Cancel puts back the very same hall, stations and lockers so the day carries on.
const BUILD = { layout: null, turf: true, on: false, w: null, d: null, want: {}, counts: {}, fitted: {}, kit: null, full: {}, tab: 'Plot', snap: null, intro: false, step: 'welcome' };   /* intro: the first-session steps (Plan 10) in front of the tabs */   /* want: what the learner asked for; counts: what fits */
const BUILD_KEYS = [['cardio', 'Cardio machines', '有氧器材'], ['machines', 'Pin-loaded machines', '插銷式器械'], ['racks', 'Power racks', '深蹲架'], ['plats', 'Olympic platforms', '舉重平台'], ['benches', 'Benches', '訓練椅'], ['plates', 'Plate-loaded machines', '掛片式器械']];
const BUILD_GRID = new THREE.Group(); BUILD_GRID.visible = false; world.add(BUILD_GRID);
{ // the buildable grid: 24 x 18 cells of 1.82 m, centred on x = 0, front row on the street wall
  const W = BUILD_LIMITS.maxW * CELL, D = BUILD_LIMITS.maxD * CELL, pts = [];
  /* owner 2026-11-15: one grid only (no sub-grid), shown in Build and Rearrange; overlays sit on their own levels well above the floor and the turf (0.045 m), with a depth offset, so nothing flickers */
  const OFF = { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, depthWrite: false, fog: false };
  for (let i = 0; i <= BUILD_LIMITS.maxW; i++) { const x = -W / 2 + i * CELL; pts.push(x, 0.085, HZ, x, 0.085, HZ - D); }
  for (let k = 0; k <= BUILD_LIMITS.maxD; k++) { const z = HZ - k * CELL; pts.push(-W / 2, 0.085, z, W / 2, 0.085, z); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const main = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#f2f1ea', transparent: true, opacity: 0.35, ...OFF })); main.userData.main = true; main.renderOrder = 5; BUILD_GRID.add(main);
  const plot = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#dfe03a', transparent: true, opacity: 0.18, ...OFF }));
  plot.position.y = 0.07; plot.renderOrder = 4; BUILD_GRID.add(plot); BUILD_GRID.userData.plot = plot;
}
const buildEl = () => document.getElementById('build');
const buildPlan = () => ({ w: BUILD.w, d: BUILD.d, counts: BUILD.counts, layout: BUILD.layout });
function buildCostNow() { return BUILD.w ? buildCost({ ...buildPlan(), kit: BUILD.kit }, { ...COSTS, rentRate: S.rentRate }) : null; }
function openBuildFromBooks() { if (typeof closing !== 'undefined' && closing) return; closeBooks(); openBuild(); }   /* the books' link to the builder, not during an early close */
function openBuild() {
  if (BUILD.on) return;
  if (BOOKS.open) closeBooks(); if (typeof hideGoalCard === 'function') hideGoalCard();
  BUILD.snap = { w: HALL.w, d: HALL.d, EQUIP, STATIONS, OBST, BACKROW, CHALK, DBZONE, nav: navBlock.slice(), lockers: [LOCKERS_M.slice(), LOCKERS_F.slice(), LOCKERS.slice()], finOwn: S.finOwn, finLoan: S.finLoan, go: goOn };
  world.remove(EQUIP); EQUIP = new THREE.Group();   /* keep today's equipment untouched while the preview builds its own */
  goOn = false; refreshGo(); BUILD.on = true; BUILD.tab = 'Plot'; BUILD.turf = S.turf !== false;
  BUILD.w = S.hallW; BUILD.d = S.hallD; BUILD.counts = {}; BUILD.want = {}; for (const [k] of BUILD_KEYS) BUILD.want[k] = BUILD.counts[k] = S[k];
  BUILD.layout = S.hallW ? JSON.parse(JSON.stringify(S.layout || autoBuild(S.hallW, S.hallD, BUILD.want, { turf: BUILD.turf }))) : null;   /* Plan 11: the builder edits a copy of the gym's pieces */
  panel.hidden = true; document.body.classList.add('building'); if (typeof clearFollow === 'function') clearFollow(); buildEl().hidden = false; BUILD_GRID.visible = true; positionUI();
  view.target.set(0, 0, -2); view.zoomT = Math.min(view.zoomT, innerWidth < 860 ? 0.75 : 1.1); view.follow = null;
  buildPreview();
}
function buildPreview() {
  setHall(BUILD.w, BUILD.d); buildLayout({ ...S, ...(BUILD.w ? countsOf(BUILD.layout) : SAMPLE_COUNTS), layout: BUILD.w ? BUILD.layout : null, turf: BUILD.turf, shock: 'none' });
  const pc = placedCounts(); BUILD.fitted = pc.counts; BUILD.kit = BUILD.w ? kitOf(BUILD.layout) : pc.kit;
  BUILD.full = {}; for (const [k] of BUILD_KEYS) { BUILD.counts[k] = BUILD.w ? countsOf(BUILD.layout)[k] : SAMPLE_COUNTS[k]; if (BUILD.w && BUILD.want[k] > BUILD.counts[k]) BUILD.full[k] = true; }   /* only what is placed is bought; say so when the floor ran out */
  for (const o of BUILD_GRID.children) if (o.isLineSegments) o.position.x = HALL.x0 - CELL * Math.round(HALL.x0 / CELL);   /* grid lines on the plot's edges (the right wall snaps to a whole metre) */
  const p = BUILD_GRID.userData.plot; p.scale.set(HALL.x1 - HALL.x0, 1, HZ - HALL.zb); p.position.x = (HALL.x0 + HALL.x1) / 2; p.position.z = (HALL.zb + HZ) / 2;
  renderBuild();
}
function buildPick(k) {
  if (k === 'sample') { BUILD.w = BUILD.d = null; Object.assign(BUILD.want, SAMPLE_COUNTS); }
  else { const p = PRESETS[k]; BUILD.w = p.w; BUILD.d = p.d; Object.assign(BUILD.want, presetCounts(p.w, p.d)); }
  BUILD.layout = BUILD.w ? autoBuild(BUILD.w, BUILD.d, BUILD.want, { turf: BUILD.turf }) : null;
  buildPreview();
}
function buildSize(dw, dd) {
  if (!BUILD.w) { BUILD.w = PRESETS.M.w; BUILD.d = PRESETS.M.d; }
  BUILD.w = clamp(BUILD.w + dw, 6, BUILD_LIMITS.maxW); BUILD.d = clamp(BUILD.d + dd, 7, BUILD_LIMITS.maxD);
  BUILD.layout = autoBuild(BUILD.w, BUILD.d, BUILD.want, { turf: BUILD.turf }); buildPreview();   /* a new size: the layout is redone from the counts asked for */
  if (BUILD.on && BUILD.layout.pieces.length) showToast(tx('The layout was redone for the new size.', '換了大小，擺設已重新安排。'));
}
function buildCount(k, delta) {   /* Plan 11: + places one more piece by the rules or is refused; − takes away the newest of that kind; nothing else moves */
  if (!BUILD.w) return;
  if (delta > 0) {
    if (!addPiece(BUILD.layout, nextKind(BUILD.layout, k), BUILD.w, BUILD.d)) { buildPreview(); BUILD.full[k] = true; renderBuild(); showToast(tx('No room for another one: the floor is full.', '放不下了：場地已滿。')); return; }
    BUILD.want[k] = countsOf(BUILD.layout)[k];
  } else {
    if (countsOf(BUILD.layout)[k] <= (k === 'racks' ? 1 : 0)) return;
    const last = [...BUILD.layout.pieces].reverse().find(p => KINDS[p.kind].cat === k); if (last) removeLast(BUILD.layout, last.kind);
    BUILD.want[k] = countsOf(BUILD.layout)[k];
  }
  buildPreview();
}
function buildTurf(on) {   /* owner: the turf and sled lane is the player's choice; where it does not fit, In re-plans with the turf placed early and says what no longer fits */
  BUILD.turf = !!on; if (!BUILD.w) return buildPreview();
  const has = () => BUILD.layout.pieces.some(p => p.kind === 'turf');
  if (!on) { if (BUILD.layout.turfFirst) BUILD.layout = autoBuild(BUILD.w, BUILD.d, BUILD.want, { turf: false }); else removeLast(BUILD.layout, 'turf'); }   /* Out gives the equipment back */
  else if (!has() && !addPiece(BUILD.layout, 'turf', BUILD.w, BUILD.d)) {
    const before = countsOf(BUILD.layout), L = autoBuild(BUILD.w, BUILD.d, BUILD.want, { turf: true, turfFirst: true });
    if (!L.pieces.some(p => p.kind === 'turf')) showToast(tx('No room for the turf lane even with less equipment.', '就算少放器材，草皮道也放不下。'));
    else { BUILD.layout = L; const after = countsOf(L), lost = BUILD_KEYS.filter(([k]) => after[k] < before[k]).map(([k, en, zh]) => `${before[k] - after[k]} ${tx(en.toLowerCase(), zh)}`);
      showToast(lost.length ? tx(`Turf added: ${lost.join(', ')} no longer fit.`, `已加入草皮道：${lost.join('、')}放不下了。`) : tx('Turf added.', '已加入草皮道。')); }
  }
  buildPreview();
}
function closeBuildUI() { if (typeof RDRAG !== 'undefined') RDRAG.id = null; BUILD.mode = null;   /* review C1: no drag outlives the sheet */ if (typeof RGHOST !== 'undefined') RGHOST.visible = false; if (typeof RSEL !== 'undefined') RSEL.visible = false; BUILD.on = false; BUILD.introCancel = false; document.body.classList.remove('building'); BUILD.intro = false; if (EQUIP) EQUIP.visible = true; BUILD_GRID.visible = false; buildEl().hidden = true; panel.hidden = false; positionUI(); }
function cancelBuild() {
  if (!BUILD.on) return; const z = BUILD.snap;
  setHall(z.w, z.d); [LOCKERS_M, LOCKERS_F, LOCKERS].forEach((L, i) => L.splice(0, L.length, ...z.lockers[i]));   /* members keep their own locker objects */
  EQUIP.traverse(o => { if (o.geometry) o.geometry.dispose(); }); world.remove(EQUIP);
  EQUIP = z.EQUIP; world.add(EQUIP); STATIONS = z.STATIONS; OBST = z.OBST; BACKROW = z.BACKROW; CHALK = z.CHALK; DBZONE = z.DBZONE; navBlock.set(z.nav);
  S.finOwn = z.finOwn; S.finLoan = z.finLoan; BUILD.snap = null; closeBuildUI(); goOn = z.go; refreshGo();
}
function openGym() {
  if (!BUILD.on || (BUILD.w && !checkPlot(BUILD.w, BUILD.d).ok)) return false;
  const wasIntro = BUILD.intro;
  BUILD.snap.EQUIP.traverse(o => { if (o.geometry) o.geometry.dispose(); }); BUILD.snap = null;
  S.hallW = BUILD.w; S.hallD = BUILD.d; Object.assign(S, BUILD.counts); S.turf = BUILD.turf; S.layout = BUILD.w ? JSON.parse(JSON.stringify(BUILD.layout)) : null; S.sampleGrid = false;   /* a new build or a fresh take-over is no longer the converted sample */
  if (BUILD.w) { S.build = 'new'; S.monthsOpen = 0; } else { S.build = 'existing'; S.monthsOpen = 1; }   /* owner 2026-11-15: a built gym starts from its pre-sale members and grows; taking over the sample stays established */ if (!BUILD.w) S.area = COSTS.area;
  closeBuildUI(); setupRun(); if (typeof syncSetupWidgets === 'function') syncSetupWidgets(); refreshGo(); if (typeof refreshPending === 'function') refreshPending();
  if (typeof onGymOpened === 'function') onGymOpened(wasIntro);
  return true;
}
const bnt = (v) => moneyK(v);   /* inventory: K / M */
// ---------------------------------------------------------------- first session (Plan 10): welcome, setup cost, money and debt; Customise opens the tabs
function introStep(to) {   /* one way to change intro step (buttons and Escape): leaving Customise for the cost needs a plot that meets the rules */
  if (to === 'cost' && BUILD.intro && BUILD.w && !checkPlot(BUILD.w, BUILD.d).ok) { BUILD.tab = 'Plot'; renderBuild(); showToast(tx('This plot breaks a rule: see the list under 1 Plot.', '這塊場地不符合規則：請看「1 場地」下方的清單。')); return false; }
  BUILD.step = to; if (to === 'custom') BUILD.tab = 'Plot'; renderBuild(); return true;
}
function openIntro(cancellable) { openBuild(); BUILD.introCancel = !!cancellable; BUILD.intro = true; BUILD.step = 'welcome'; renderBuild(); }
const PRESET_NAME = { S: ['Small', '小型'], M: ['Medium', '中型'], L: ['Large', '大型'] };
function introHtml(c, btn) {
  const step = BUILD.step;
  if (step === 'welcome') {
    const pick = ['S', 'M', 'L'].map(k => { const p = PRESETS[k], ping = p.w * p.d; return btn(`data-intro="${k}"`, `${tx(...PRESET_NAME[k])}<small>${ping} 坪 · ${Math.round(ping * 3.3058)} m²</small>`); }).join('');
    return `<h2 class="btitle">${tx('Open your first gym', '開你的第一間健身房')}</h2><p class="bwel">${tx('Pick a size for your gym in Taipei. A few members signed up before you open; you win the rest month by month. All money is in NT dollars.', '替你在台北的健身房選個大小。開幕前有少數會員預售報名，其餘要一個月一個月慢慢招募。所有金額都是新台幣。')}</p>
      <div class="bpick">${pick}</div>${BUILD.introCancel ? `<div class="row">${btn('data-bact="cancel"', tx('Cancel: back to my gym', '取消：回到我的健身房'))}</div>` : ''}`;
  }
  const k = Object.keys(PRESETS).find(q => PRESETS[q].w === BUILD.w && PRESETS[q].d === BUILD.d), name = k ? tx(...PRESET_NAME[k]) : tx('Custom', '自訂'), head = `${name} · ${c.ping} 坪 · ${Math.round(c.ping * 3.3058)} m²`;
  if (step === 'cost') {
    return `<h2 class="btitle">${head}</h2><table class="bcost"><tr><td>${tx('Rent a month', '每月租金')}</td><td class="n">${bnt(c.rentMonth)}</td></tr><tr><td>${tx('Fit-out', '裝修')}</td><td class="n">${bnt(c.fitOut)}</td></tr>
      <tr><td>${tx('Equipment', '器材')}</td><td class="n">${bnt(c.equipment)}</td></tr><tr><td>${tx(`Deposit (${DEPOSIT_MONTHS} months)`, `押金（${DEPOSIT_MONTHS} 個月）`)}</td><td class="n">${bnt(c.deposit)}</td></tr>
      <tr class="sum"><td>${tx('Setup cost', '開辦費用')}</td><td class="n">${bnt(c.capex + c.deposit)}</td></tr></table>
      <p class="note">${tx('Customise changes the size and the equipment.', '「自訂」可以改大小與器材。')}</p>
      <div class="row bfoot">${btn('data-istep="welcome"', tx('Back', '上一步'))}${btn('data-istep="custom"', tx('Customise', '自訂'))}${btn('data-istep="pay"', tx('Next: pay for it', '下一步：資金'), 'btn-go')}</div>`;
  }
  const pay = loanPayment(S.finLoan, S.finRate, S.finYears), setup = c.capex + c.deposit, cash = S.finOwn + S.finLoan - setup, run = runwayMonths(cash, monthlyRunCost(c.rentMonth, S.staff, pay));
  const runway = cash >= 0 ? `<p class="note">${tx(`About ${run < 10 ? run.toFixed(1) : Math.round(run)} months of running costs`, `約可支付 ${run < 10 ? run.toFixed(1) : Math.round(run)} 個月的營運成本`)}</p>`
    : `<p class="note warn">${tx(`You start ${bnt(-cash)} overdrawn: trading has to pay it back.`, `開幕就透支 ${bnt(-cash)}：要靠營業還。`)}</p>`;
  return `<h2 class="btitle">${tx('How will you pay for it?', '資金從哪裡來？')}</h2><p class="note">${head}</p>
    <div class="bstep"><span>${tx('Your own money', '自有資金')}</span>${btn('data-fin="finOwn,-1"', '−')}<b>${bnt(S.finOwn)}</b>${btn('data-fin="finOwn,1"', '+')}</div>
    <div class="bstep"><span>${tx(`Bank loan · ${S.finRate.toFixed(1)}%, ${S.finYears} years`, `銀行貸款 · ${S.finRate.toFixed(1)}%，${S.finYears} 年`)}</span>${btn('data-fin="finLoan,-1"', '−')}<b>${bnt(S.finLoan)}</b>${btn('data-fin="finLoan,1"', '+')}</div>
    <table class="bpay"><tr><td>${tx('Loan payment', '每月還款')}</td><td class="n">${tx(`${money(Math.round(pay))} a month`, `每月 ${money(Math.round(pay))}`)}</td></tr><tr><td>${tx('Setup cost', '開辦費用')}</td><td class="n">${bnt(-setup)}</td></tr>
    <tr class="sum"><td>${tx('Cash on opening day', '開幕日現金')}</td><td class="n${cash < 0 ? ' neg' : ''}">${bnt(cash)}</td></tr></table>${runway}
    <div class="row bfoot">${btn('data-istep="cost"', tx('Back', '上一步'))}${btn('data-bact="open"', tx('Open this gym', '開這間健身房'), 'btn-go')}</div>`;
}
function renderBuild() {
  const box = buildEl(); if (!box || !BUILD.on) return;
  const c = buildCostNow(), sample = !BUILD.w, tabs = [['Plot', tx('1 Plot', '1 場地')], ['Equipment', tx('2 Equipment', '2 器材')], ['Money', tx('3 Money', '3 資金')]];
  const btn = (attrs, label, cls = '') => `<button class="${cls}" ${attrs}>${label}</button>`;
  if (EQUIP) EQUIP.visible = !(BUILD.intro && BUILD.step === 'welcome');   /* the welcome shows an empty plot */
  if (BUILD.mode === 'rearrange') { box.innerHTML = rearrangeHtml(btn); updateRSel(); return; }   /* Plan 12 */
  if (BUILD.intro && BUILD.step !== 'custom' && (BUILD.step === 'welcome' || c)) { box.innerHTML = introHtml(c, btn); return; }
  let body = '';
  if (BUILD.tab === 'Plot') {
    const pre = [['S', 'S', PRESETS.S], ['M', 'M', PRESETS.M], ['L', 'L', PRESETS.L]].map(([k, lab, p]) => btn(`data-pick="${k}"`, `${lab}<small>${p.w * p.d} 坪</small>`, BUILD.w === p.w && BUILD.d === p.d ? 'on' : '')).join('');   /* owner 2026-11-15: no Sample button; the sample gym is hidden until the real floor plan replaces it */
    const size = sample ? `<p class="note">${tx('The sample gym: 30 × 20 m, rent counted on 115 坪.', '範例健身房：30 × 20 公尺，租金以 115 坪計算。')}</p>` : `<div class="bstep"><span>${tx('Width', '寬')}</span>${btn('data-size="-1,0"', '−')}<b>${BUILD.w} ${tx('cells', '格')} · ${(BUILD.w * CELL).toFixed(1)} m</b>${btn('data-size="1,0"', '+')}</div>
      <div class="bstep"><span>${tx('Depth', '深')}</span>${btn('data-size="0,-1"', '−')}<b>${BUILD.d} ${tx('cells', '格')} · ${(BUILD.d * CELL).toFixed(1)} m</b>${btn('data-size="0,1"', '+')}</div>`;
    const rules = sample ? '' : (() => { const r = checkPlot(BUILD.w, BUILD.d), L = { area: tx('At least 60 坪', '至少 60 坪'), size: tx('At least 8 × 7 cells (desk, door and two washrooms)', '至少 8 × 7 格（櫃檯、大門與兩間浴廁）'), fits: tx('Fits the site (24 × 18 cells)', '在基地範圍內（24 × 18 格）'), door: tx('Door on the street', '大門面向街道'), connected: tx('One connected shape', '單一連續形狀') };
      return `<section class="grp"><h2><span>${tx('Rules', '規則')}</span></h2><ul class="brules">${r.rules.map(x => `<li class="${x.ok ? 'ok' : 'bad'}">${x.ok ? '✓' : '✗'} ${L[x.key]}</li>`).join('')}</ul></section>`; })();
    const money = c ? `<table><tr><td>${tx('Floor', '面積')}</td><td class="n">${c.ping} 坪 · ${Math.round(c.ping * 3.3058)} m²</td></tr><tr><td>${tx('Rent + management a month', '每月租金 + 管理費')}</td><td class="n">${bnt(c.rentMonth)}</td></tr><tr><td>${tx('Fit-out (floor, air con, lights, washrooms, permit)', '裝修（地板、空調、燈具、浴廁、許可）')}</td><td class="n">${bnt(c.fitOut)}</td></tr><tr><td>${tx(`Deposit (${DEPOSIT_MONTHS} months)`, `押金（${DEPOSIT_MONTHS} 個月）`)}</td><td class="n">${bnt(c.deposit)}</td></tr><tr><td>${tx('Rent-free first month', '第一個月免租')}</td><td class="n">${bnt(-(c.rentMonth - c.ping * COSTS.mgmtPerPing))}</td></tr></table>` : '';
    body = `<div class="bpre">${pre}</div>${size}${money}${rules}`;
  } else if (BUILD.tab === 'Equipment') {
    const rows = BUILD_KEYS.map(([k, en, zh]) => { const n = BUILD.counts[k], full = !sample && BUILD.full[k];
      return `<tr><td>${tx(en, zh)}<span class="unit">${moneyK(EQUIP_PRICE[k])} ${tx('each', '每台')}</span>${full ? `<span class="bench">${tx('the floor is full', '空間已滿')}</span>` : ''}</td><td class="n">${sample ? n : `${btn(`data-count="${k},-1"`, '−')} <b>${n}</b> ${btn(`data-count="${k},1"`, '+', full ? 'dim' : '')}`}</td><td class="n">${bnt(n * EQUIP_PRICE[k])}</td></tr>`; }).join('');
    const kitOfLayout = (q) => BUILD.layout.pieces.filter(p => KINDS[p.kind].cat === 'kit' && p.kind !== 'turf' && (!q || p.kind === q)).reduce((t, p) => t + KINDS[p.kind].price, 0);   /* review I3: by the pieces placed, as buildCost charges */
    const kit = sample ? FIXED_KIT.reduce((t, [, v]) => t + v, 0) : kitOfLayout(), turf$ = sample ? 0 : BUILD.layout.pieces.filter(p => p.kind === 'turf').reduce((t, p) => t + KINDS.turf.price, 0), eq = BUILD_KEYS.reduce((t, [k]) => t + BUILD.counts[k] * EQUIP_PRICE[k], 0) + kit + turf$;
    const turfRow = sample ? '' : `<tr><td>${tx('Turf and sled lane', '草皮與雪橇道')}${BUILD.turf && !(BUILD.kit && BUILD.kit.turf) ? `<span class="bench">${tx('no room at this size', '這個大小放不下')}</span>` : ''}</td><td class="n">${btn('data-turf="1"', tx('In', '要'), BUILD.turf ? 'on' : '')} ${btn('data-turf="0"', tx('Out', '不要'), BUILD.turf ? '' : 'on')}</td><td class="n">${bnt(BUILD.kit && BUILD.kit.turf ? FIXED_KIT.find(([q]) => q === 'turf')[1] : 0)}</td></tr>`;
    body = `<table class="beq">${rows}${turfRow}<tr><td>${sample ? tx('Dumbbells, cable tower, turf and sled, pull-up, mats', '啞鈴、滑輪架、草皮與雪橇、引體向上架、軟墊') : tx('Dumbbells, cable tower, pull-up, mats', '啞鈴、滑輪架、引體向上架、軟墊')}</td><td></td><td class="n">${bnt(kit)}</td></tr><tr class="sum"><td>${tx('Equipment', '器材')}</td><td></td><td class="n">${bnt(eq)}</td></tr></table>
      <p class="note">${sample ? tx('The sample gym\'s equipment is fixed. Pick S, M, L or a custom size to choose counts.', '範例健身房的器材是固定的。選 S、M、L 或自訂大小即可調整數量。') : tx('Equipment is placed for you along the walls; when a zone is full, + stops.', '器材會自動沿牆擺放；區域滿了就不能再加。')}</p>`;
  } else {
    const capex = c ? c.capex : SAMPLE_CAPEX.capex, dep = c ? c.deposit : 0, cash = S.finOwn + S.finLoan - capex - dep, m$ = (v) => moneyK(v);
    body = `<div class="bstep"><span>${tx('Your own money', '自有資金')}</span>${btn('data-fin="finOwn,-1"', '−')}<b>${m$(S.finOwn)}</b>${btn('data-fin="finOwn,1"', '+')}</div>
      <div class="bstep"><span>${tx('Bank loan', '銀行貸款')}</span>${btn('data-fin="finLoan,-1"', '−')}<b>${m$(S.finLoan)}</b>${btn('data-fin="finLoan,1"', '+')}</div>
      <table><tr><td>${tx('Fit-out and equipment (capex)', '裝修與器材（資本支出）')}</td><td class="n">${bnt(-capex)}</td></tr>${dep ? `<tr><td>${tx('Rent deposit (refundable)', '租金押金（可退）')}</td><td class="n">${bnt(-dep)}</td></tr>` : ''}
      <tr class="sum"><td>${tx('Cash on opening day', '開幕日現金')}</td><td class="n${cash < 0 ? ' neg' : ''}">${bnt(cash)}</td></tr></table>
      ${cash < 0 ? `<p class="note warn">${tx('You open in debt: the gap is an overdraft that trading has to pay back. You can still open, or put in more of your own money, borrow more, or build smaller.', '開幕就負債：缺口是透支，要靠營業還。你仍然可以開幕，或增加自有資金、多借一些、蓋小一點。')}</p>` : ''}`;
  }
  const ok = sample || checkPlot(BUILD.w, BUILD.d).ok;
  const lead = BUILD.intro ? tx('Pick a size and the equipment, then go back to the cost.', '選大小與器材，再回到費用。') : tx('Pick a size, set the equipment, check the money, then open. Opening this gym replaces your current gym and starts a new business: fresh cash and new members.', '選大小、設定器材、確認資金，然後開幕。開這間健身房會取代目前的健身房，開始一門新生意：資金與會員重新開始。');
  box.innerHTML = `<h2 class="btitle">${tx('Build · before opening', '設計 · 開幕前')}</h2><p class="note">${lead}</p>
    <div class="tabs">${tabs.map(([k, lab]) => btn(`data-btab="${k}"`, lab, BUILD.tab === k ? 'on' : '')).join('')}</div><div class="bbody">${body}</div>
    <div class="row bfoot">${BUILD.intro ? btn('data-istep="cost"', tx('Back to the cost', '回到費用'), ok ? '' : 'dim') : btn('data-bact="cancel"', tx('Cancel', '取消')) + btn('data-bact="open"', tx('Open this gym', '開這間健身房'), 'btn-go' + (ok ? '' : ' dim'))}</div>`;
}
document.addEventListener('click', (e) => {
  const b = e.target.closest && e.target.closest('#build button'); if (!b || !BUILD.on) return;
  const d = b.dataset;
  if (d.intro) { if (d.intro === 'take') { buildPick('sample'); openGym(); } else { buildPick(d.intro); BUILD.step = 'cost'; renderBuild(); } }
  else if (d.istep) introStep(d.istep);
  else if (d.btab) { BUILD.tab = d.btab; renderBuild(); }
  else if (d.pick) buildPick(d.pick);
  else if (d.size) { const [a, c] = d.size.split(',').map(Number); buildSize(a, c); }
  else if (d.turf) buildTurf(d.turf === '1');
  else if (d.count) { const [k, v] = d.count.split(','); buildCount(k, +v); }
  else if (d.fin) { const [k, v] = d.fin.split(','); S[k] = clamp(S[k] + v * 5e5, 0, 20e6); renderBuild(); }
  else if (d.bact === 'cancel') cancelBuild();
  else if (d.bact === 'open') { if (!openGym()) showToast(tx('This plot breaks a rule: see the list under 1 Plot.', '這塊場地不符合規則：請看「1 場地」下方的清單。')); }
});
// ================================================================ Plan 12: Rearrange. Pause, drag pieces (the engine picks each facing), add or sell; Apply closes
// the gym for the days the change needs from tomorrow and reopens it with the new layout; Cancel changes nothing.
const SAMPLE_GRID = { w: 16, d: 11 };   /* the grid hall closest to the sample's 30 × 20 m */
const RNAME = { rack: ['Power rack', '深蹲架'], olyplat: ['Olympic platform', '舉重平台'], treadmill: ['Treadmill', '跑步機'], rower: ['Rower', '划船機'], bike: ['Bike', '飛輪'], airbike: ['Air bike', '風扇車'],
  pulldown: ['Lat pulldown', '滑輪下拉'], row: ['Seated row', '坐姿划船'], chestpress: ['Chest press', '胸推機'], shoulderpress: ['Shoulder press', '肩推機'], pecdeck: ['Pec deck', '蝴蝶機'], legext: ['Leg extension', '腿伸展'], legcurl: ['Leg curl', '腿彎舉'],
  legpress: ['Leg press', '腿推機'], hack: ['Hack squat', '哈克深蹲'], hipthrust: ['Hip thrust', '臀推機'], beltsquat: ['Belt squat', '腰帶深蹲'], bench: ['Adjustable bench', '可調式訓練椅'], dbrack: ['Dumbbell rack', '啞鈴架'],
  cable: ['Cable tower', '滑輪架'], pullup: ['Pull-up station', '引體向上架'], mat: ['Stretch mat', '伸展墊'], turf: ['Turf and sled lane', '草皮與雪橇道'] };
const rname = (k) => tx(...(RNAME[k] || [k, k]));
const RGHOST = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#5ee08a', transparent: true, opacity: 0.4, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
RGHOST.position.y = 0.1; RGHOST.renderOrder = 6; RGHOST.visible = false; BUILD_GRID.add(RGHOST);
function openRearrange() {
  if ((typeof closing !== 'undefined' && closing) || BUILD.on) return false;
  if (BIZ && (BIZ.pending || (A && A.closed && A.closedWhy === 'rearrange'))) { showToast(tx('A rearrange is already booked: wait until the gym reopens.', '已經安排重新擺設：請等健身房重新開門。')); return false; }
  const sample = !S.hallW || !S.layout;   /* the sample gym is shown as grid pieces; it converts only if the player applies (Plan 12, owner option A) */
  openBuild(); BUILD.mode = 'rearrange'; BUILD.convert = sample;
  if (sample) { BUILD.w = SAMPLE_GRID.w; BUILD.d = SAMPLE_GRID.d; BUILD.orig = autoBuild(SAMPLE_GRID.w, SAMPLE_GRID.d, SAMPLE_COUNTS); } else BUILD.orig = JSON.parse(JSON.stringify(S.layout));
  BUILD.layout = JSON.parse(JSON.stringify(BUILD.orig)); BUILD.sel = null; buildPreview(); return true;
}
const rOpen = () => BUILD.on && BUILD.mode === 'rearrange';   /* review C1: edits only while Rearrange is open, never on the live gym */
function rearrangeAdd(kind) { if (!rOpen()) return; const p = addPiece(BUILD.layout, kind, BUILD.w, BUILD.d); if (!p) showToast(tx('No room for it: the floor is full.', '放不下了：場地已滿。')); else { BUILD.sel = p.id; showToast(tx(`Added: ${rname(kind)} · ${money(KINDS[kind].price)}`, `已新增：${rname(kind)} · ${money(KINDS[kind].price)}`)); } buildPreview(); }   /* the new piece is selected, so it shows where it went */
function rearrangeSell(id) { if (!rOpen()) return; BUILD.layout.pieces = BUILD.layout.pieces.filter(p => p.id !== id); BUILD.sel = null; buildPreview(); }
function rearrangeDrop(id, sx, sz) { if (!rOpen()) return false; const p = dropPiece(BUILD.layout, id, sx, sz, BUILD.w, BUILD.d); if (!p) showToast(tx("It can't go there: no room for it and its clear floor.", '不能放那裡：放不下器材和它周圍的空間。')); buildPreview(); return !!p; }
function pieceAt(sx, sz) { const hit = BUILD.layout.pieces.filter(p => { const f = footprint(p); return sx >= f.x0 && sx < f.x1 && sz >= f.z0 && sz < f.z1; }); return hit.find(p => p.kind !== 'turf') || hit[0] || null; }
function rearrangeApply() {
  const d = diffLayouts(BUILD.orig, BUILD.layout), q = quote(d), L = BUILD.layout, wasSample = BUILD.convert;
  cancelBuild(); if (!d.moved.length && !d.bought.length && !d.sold.length) return;
  applyRearrange({ layout: L, movers: q.movers, bought: d.bought, sold: d.sold, days: q.days, hall: wasSample ? { ...SAMPLE_GRID } : null });
  showToast(q.days ? tx(`Closed for ${q.days} day${q.days === 1 ? '' : 's'} from tomorrow for rearranging · ${money(q.cost)}`, `明天起休館 ${q.days} 天重新擺設 · ${money(q.cost)}`) : tx(`The new layout opens tomorrow morning · ${money(q.cost)}`, `新擺設明天早上啟用 · ${money(q.cost)}`));
  if (typeof updateMonitors === 'function') updateMonitors();
}
const RGROUPS = [['Racks and platforms', '深蹲架與平台', ['rack', 'olyplat']], ['Cardio', '有氧', ['treadmill', 'rower', 'bike', 'airbike']],
  ['Pin-loaded machines', '插銷式器械', ['pulldown', 'row', 'chestpress', 'shoulderpress', 'pecdeck', 'legext', 'legcurl']], ['Plate-loaded machines', '掛片式器械', ['legpress', 'hack', 'hipthrust', 'beltsquat']],
  ['Free weights and more', '自由重量與其他', ['bench', 'dbrack', 'cable', 'pullup', 'mat', 'turf']]];
// owner 2026-11-15: the selected piece wears a yellow outline on the floor, as in the gym view
const RSEL = new THREE.Group(); RSEL.visible = false; BUILD_GRID.add(RSEL);
{ const fill = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#dfe03a', transparent: true, opacity: 0.22, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), new THREE.LineBasicMaterial({ color: '#dfe03a', fog: false, depthWrite: false }));
  fill.renderOrder = edge.renderOrder = 7; RSEL.add(fill, edge); RSEL.position.y = 0.11; }
function updateRSel() {
  const p = BUILD.on && BUILD.mode === 'rearrange' && BUILD.sel != null && BUILD.layout && BUILD.layout.pieces.find(q => q.id === BUILD.sel);
  if (!p) { RSEL.visible = false; return; } const f = footprint(p);
  RSEL.scale.set((f.x1 - f.x0) * SUB, 1, (f.z1 - f.z0) * SUB); RSEL.position.x = HALL.x0 + (f.x0 + f.x1) / 2 * SUB; RSEL.position.z = HALL.zb + (f.z0 + f.z1) / 2 * SUB; RSEL.visible = true;
}
function rearrangeHtml(btn) {   /* owner 2026-11-15: the cost on top (pinned), the selected piece's card, then equipment to add as in-game buttons */
  const d = diffLayouts(BUILD.orig, BUILD.layout), q = quote(d), sel = BUILD.sel && BUILD.layout.pieces.find(p => p.id === BUILD.sel), hasTurf = BUILD.layout.pieces.some(p => p.kind === 'turf');
  const quoteT = `<div class="rquote"><table><tr><td>${tx(`Movers (${q.heavy} heavy piece${q.heavy === 1 ? '' : 's'})`, `搬運（${q.heavy} 件重型）`)}</td><td class="n">${money(q.movers)}</td></tr><tr><td>${tx(`Equipment bought (${d.bought.length})`, `購買器材（${d.bought.length}）`)}</td><td class="n">${money(q.buy)}</td></tr>
    <tr><td>${tx(`Equipment sold at 40% (${d.sold.length})`, `出售器材 4 成價（${d.sold.length}）`)}</td><td class="n">${money(-q.sell)}</td></tr><tr class="sum"><td>${tx('Total', '合計')}</td><td class="n" data-k="rcost">${money(q.cost)}</td></tr>
    <tr><td>${tx('Closed', '休館')}</td><td class="n" data-k="rdays">${q.days ? tx(`${q.days} day${q.days === 1 ? '' : 's'} from tomorrow`, `明天起 ${q.days} 天`) : tx('none: done overnight', '不用：一個晚上完成')}</td></tr></table>
    <div class="row bfoot">${btn('data-bact="cancel"', tx('Cancel', '取消'))}${btn('data-rapply="1"', tx('Apply', '確定'), 'btn-go')}</div></div>`;
  const card = sel ? `<section class="rsel"><h3>${rname(sel.kind)}</h3><p class="note">${tx('Drag it on the floor to move it; the gym picks which way it faces.', '在地板上拖曳即可移動，方向由系統決定。')}</p>
    <div class="row">${btn(`data-rsell="${sel.id}"`, tx(`Sell for ${money(REARRANGE.resale * KINDS[sel.kind].price)}`, `以 ${money(REARRANGE.resale * KINDS[sel.kind].price)} 賣掉`))}${btn('data-rdesel="1"', tx('Done', '完成'))}</div></section>`
    : `<p class="note">${tx('Tap a piece to select it, or drag it to move it. Heavy pieces need movers and a closed day for every 4; new equipment needs a day to install.', '點器材可選取，拖曳可移動。重型器材要請搬運，每 4 件休館 1 天；新器材安裝要 1 天。')}</p>`;
  const add = RGROUPS.map(([en, zh, ks]) => { const items = ks.filter(k => KINDS[k] && (k !== 'turf' || !hasTurf));
    return items.length ? `<h4 class="rgh">${tx(en, zh)}</h4><div class="radd">${items.map(k => btn(`data-radd="${k}"`, `${rname(k)}<small>${moneyK(KINDS[k].price)}</small>`)).join('')}</div>` : ''; }).join('');
  return `<h2 class="btitle">${tx('Rearrange', '重新擺設')}</h2>${quoteT}${BUILD.convert ? `<p class="note warn">${tx('Your gym is shown converted to grid pieces for rearranging; its layout may shift a little. Nothing changes unless you apply.', '為了重新擺設，你的健身房以格狀器材顯示，擺設可能略有不同。按「確定」才會變更。')}</p>` : ''}${card}<section class="rlist"><h3>${tx('Add equipment', '新增器材')}</h3>${add}</section>`;
}
document.addEventListener('click', (e) => {
  const b = e.target.closest && e.target.closest('#build button'); if (!b || !BUILD.on || BUILD.mode !== 'rearrange') return; const d = b.dataset;
  if (d.rsell) rearrangeSell(+d.rsell); else if (d.radd) rearrangeAdd(d.radd); else if (d.rdesel) { BUILD.sel = null; renderBuild(); } else if (d.rapply) rearrangeApply();
});
