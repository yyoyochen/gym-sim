// ================================================================ the gym builder (Plan 8, rectangles first): a mode of the diorama. Build a gym pauses the day,
// hides the panel and the people, lays a cell grid over the plot and previews the hall and equipment live; Open this gym starts a new business
// in it; Cancel puts back the very same hall, stations and lockers so the day carries on.
const BUILD = { on: false, w: null, d: null, want: {}, counts: {}, fitted: {}, kit: null, full: {}, tab: 'Plot', snap: null, intro: false, step: 'welcome' };   /* intro: the first-session steps (Plan 10) in front of the tabs */   /* want: what the learner asked for; counts: what fits */
const BUILD_KEYS = [['cardio', 'Cardio machines', '有氧器材'], ['machines', 'Pin-loaded machines', '插銷式器械'], ['racks', 'Power racks', '深蹲架'], ['plats', 'Olympic platforms', '舉重平台'], ['benches', 'Benches', '訓練椅'], ['plates', 'Plate-loaded machines', '掛片式器械']];
const BUILD_GRID = new THREE.Group(); BUILD_GRID.visible = false; world.add(BUILD_GRID);
{ // the buildable grid: 24 x 18 cells of 1.82 m, centred on x = 0, front row on the street wall
  const W = BUILD_LIMITS.maxW * CELL, D = BUILD_LIMITS.maxD * CELL, pts = [];
  for (let i = 0; i <= BUILD_LIMITS.maxW; i++) { const x = -W / 2 + i * CELL; pts.push(x, 0.06, HZ, x, 0.06, HZ - D); }
  for (let k = 0; k <= BUILD_LIMITS.maxD; k++) { const z = HZ - k * CELL; pts.push(-W / 2, 0.06, z, W / 2, 0.06, z); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  BUILD_GRID.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#f2f1ea', transparent: true, opacity: 0.35, fog: false })));
  const plot = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#dfe03a', transparent: true, opacity: 0.18, depthWrite: false, fog: false }));
  plot.position.y = 0.05; plot.renderOrder = 4; BUILD_GRID.add(plot); BUILD_GRID.userData.plot = plot;
}
const buildEl = () => document.getElementById('build');
const buildPlan = () => ({ w: BUILD.w, d: BUILD.d, counts: BUILD.counts });
function buildCostNow() { return BUILD.w ? buildCost({ ...buildPlan(), kit: BUILD.kit }, { ...COSTS, rentRate: S.rentRate }) : null; }
function openBuildFromBooks() { if (typeof closing !== 'undefined' && closing) return; closeBooks(); openBuild(); }   /* the books' link to the builder, not during an early close */
function openBuild() {
  if (BUILD.on) return;
  if (BOOKS.open) closeBooks(); if (typeof hideGoalCard === 'function') hideGoalCard();
  BUILD.snap = { w: HALL.w, d: HALL.d, EQUIP, STATIONS, OBST, BACKROW, CHALK, DBZONE, nav: navBlock.slice(), lockers: [LOCKERS_M.slice(), LOCKERS_F.slice(), LOCKERS.slice()], finOwn: S.finOwn, finLoan: S.finLoan, go: goOn };
  world.remove(EQUIP); EQUIP = new THREE.Group();   /* keep today's equipment untouched while the preview builds its own */
  goOn = false; refreshGo(); BUILD.on = true; BUILD.tab = 'Plot';
  BUILD.w = S.hallW; BUILD.d = S.hallD; BUILD.counts = {}; BUILD.want = {}; for (const [k] of BUILD_KEYS) BUILD.want[k] = BUILD.counts[k] = S[k];
  panel.hidden = true; document.body.classList.add('building'); if (typeof clearFollow === 'function') clearFollow(); buildEl().hidden = false; BUILD_GRID.visible = true; positionUI();
  view.target.set(0, 0, -2); view.zoomT = Math.min(view.zoomT, innerWidth < 860 ? 0.75 : 1.1); view.follow = null;
  buildPreview();
}
function buildPreview() {
  setHall(BUILD.w, BUILD.d); buildLayout({ ...S, ...(BUILD.w ? BUILD.want : SAMPLE_COUNTS), shock: 'none' });
  const pc = placedCounts(); BUILD.fitted = pc.counts; BUILD.kit = pc.kit;
  BUILD.full = {}; for (const [k] of BUILD_KEYS) { if (BUILD.w && BUILD.want[k] > BUILD.fitted[k]) BUILD.full[k] = true; BUILD.counts[k] = BUILD.w ? Math.min(BUILD.want[k], BUILD.fitted[k]) : SAMPLE_COUNTS[k]; }   /* only what fits is bought; say so when a + was refused */
  BUILD_GRID.children[0].position.x = HALL.x0 - CELL * Math.round(HALL.x0 / CELL);   /* grid lines on the plot's edges (the right wall snaps to a whole metre) */
  const p = BUILD_GRID.userData.plot; p.scale.set(HALL.x1 - HALL.x0, 1, HZ - HALL.zb); p.position.x = (HALL.x0 + HALL.x1) / 2; p.position.z = (HALL.zb + HZ) / 2;
  renderBuild();
}
function buildPick(k) {
  if (k === 'sample') { BUILD.w = BUILD.d = null; Object.assign(BUILD.want, SAMPLE_COUNTS); }
  else { const p = PRESETS[k]; BUILD.w = p.w; BUILD.d = p.d; Object.assign(BUILD.want, presetCounts(p.w, p.d)); }
  buildPreview();
}
function buildSize(dw, dd) {
  if (!BUILD.w) { BUILD.w = PRESETS.M.w; BUILD.d = PRESETS.M.d; }
  BUILD.w = clamp(BUILD.w + dw, 6, BUILD_LIMITS.maxW); BUILD.d = clamp(BUILD.d + dd, 7, BUILD_LIMITS.maxD); buildPreview();
}
function buildCount(k, delta) { BUILD.want[k] = Math.max(k === 'racks' ? 1 : 0, BUILD.counts[k] + delta); buildPreview(); }
function closeBuildUI() { BUILD.on = false; BUILD.introCancel = false; document.body.classList.remove('building'); BUILD.intro = false; if (EQUIP) EQUIP.visible = true; BUILD_GRID.visible = false; buildEl().hidden = true; panel.hidden = false; positionUI(); }
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
  S.hallW = BUILD.w; S.hallD = BUILD.d; Object.assign(S, BUILD.counts);
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
      <div class="bpick">${pick}</div><div class="row">${btn('data-intro="take"', tx('Take over a running gym', '接手一間營業中的健身房'))}</div>${BUILD.introCancel ? `<div class="row">${btn('data-bact="cancel"', tx('Cancel: back to my gym', '取消：回到我的健身房'))}</div>` : ''}
      <p class="note">${tx('Taking over skips the build: you run the sample gym, already open.', '接手就不用蓋：直接經營已開幕的範例健身房。')}</p>`;
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
  if (BUILD.intro && BUILD.step !== 'custom' && (BUILD.step === 'welcome' || c)) { box.innerHTML = introHtml(c, btn); return; }
  let body = '';
  if (BUILD.tab === 'Plot') {
    const pre = [['S', 'S', PRESETS.S], ['M', 'M', PRESETS.M], ['L', 'L', PRESETS.L]].map(([k, lab, p]) => btn(`data-pick="${k}"`, `${lab}<small>${p.w * p.d} 坪</small>`, BUILD.w === p.w && BUILD.d === p.d ? 'on' : '')).join('') + (BUILD.intro ? '' : btn('data-pick="sample"', `${tx('Sample', '範例')}<small>${tx('today\'s gym', '目前的館')}</small>`, sample ? 'on' : ''));   /* the intro's Customise: the sample is "Take over" on the welcome */
    const size = sample ? `<p class="note">${tx('The sample gym: 30 × 20 m, rent counted on 115 坪.', '範例健身房：30 × 20 公尺，租金以 115 坪計算。')}</p>` : `<div class="bstep"><span>${tx('Width', '寬')}</span>${btn('data-size="-1,0"', '−')}<b>${BUILD.w} ${tx('cells', '格')} · ${(BUILD.w * CELL).toFixed(1)} m</b>${btn('data-size="1,0"', '+')}</div>
      <div class="bstep"><span>${tx('Depth', '深')}</span>${btn('data-size="0,-1"', '−')}<b>${BUILD.d} ${tx('cells', '格')} · ${(BUILD.d * CELL).toFixed(1)} m</b>${btn('data-size="0,1"', '+')}</div>`;
    const rules = sample ? '' : (() => { const r = checkPlot(BUILD.w, BUILD.d), L = { area: tx('At least 60 坪', '至少 60 坪'), size: tx('At least 8 × 7 cells (desk, door and two washrooms)', '至少 8 × 7 格（櫃檯、大門與兩間浴廁）'), fits: tx('Fits the site (24 × 18 cells)', '在基地範圍內（24 × 18 格）'), door: tx('Door on the street', '大門面向街道'), connected: tx('One connected shape', '單一連續形狀') };
      return `<section class="grp"><h2><span>${tx('Rules', '規則')}</span></h2><ul class="brules">${r.rules.map(x => `<li class="${x.ok ? 'ok' : 'bad'}">${x.ok ? '✓' : '✗'} ${L[x.key]}</li>`).join('')}</ul></section>`; })();
    const money = c ? `<table><tr><td>${tx('Floor', '面積')}</td><td class="n">${c.ping} 坪 · ${Math.round(c.ping * 3.3058)} m²</td></tr><tr><td>${tx('Rent + management a month', '每月租金 + 管理費')}</td><td class="n">${bnt(c.rentMonth)}</td></tr><tr><td>${tx('Fit-out (floor, air con, lights, washrooms, permit)', '裝修（地板、空調、燈具、浴廁、許可）')}</td><td class="n">${bnt(c.fitOut)}</td></tr><tr><td>${tx('Structural columns (concrete frame, bays up to 9 m)', '結構柱（RC 構架，柱距最多 9 公尺）')}</td><td class="n" data-k="cols">${COLUMNS.length}</td></tr><tr><td>${tx(`Deposit (${DEPOSIT_MONTHS} months)`, `押金（${DEPOSIT_MONTHS} 個月）`)}</td><td class="n">${bnt(c.deposit)}</td></tr><tr><td>${tx('Rent-free first month', '第一個月免租')}</td><td class="n">${bnt(-(c.rentMonth - c.ping * COSTS.mgmtPerPing))}</td></tr></table>` : '';
    body = `<div class="bpre">${pre}</div>${size}${money}${rules}`;
  } else if (BUILD.tab === 'Equipment') {
    const rows = BUILD_KEYS.map(([k, en, zh]) => { const n = BUILD.counts[k], full = !sample && BUILD.full[k];
      return `<tr><td>${tx(en, zh)}<span class="unit">${moneyK(EQUIP_PRICE[k])} ${tx('each', '每台')}</span>${full ? `<span class="bench">${tx('the floor is full', '空間已滿')}</span>` : ''}</td><td class="ctl">${sample ? `<b>${n}</b>` : `${btn(`data-count="${k},-1"`, '−')}<b>${n}</b>${btn(`data-count="${k},1"`, '+', full ? 'dim' : '')}`}</td><td class="n">${bnt(n * EQUIP_PRICE[k])}</td></tr>`; }).join('');
    const kit = FIXED_KIT.filter(([key]) => sample || !BUILD.kit || BUILD.kit[key]).reduce((s, [, v]) => s + v, 0), eq = BUILD_KEYS.reduce((s, [k]) => s + BUILD.counts[k] * EQUIP_PRICE[k], 0) + kit;
    body = `<table class="beq">${rows}<tr><td>${tx('Dumbbells, cable tower, turf and sled, pull-up, mats', '啞鈴、滑輪架、草皮與雪橇、引體向上架、軟墊')}</td><td class="n" colspan="2">${bnt(kit)}</td></tr><tr class="sum"><td colspan="2">${tx('Equipment', '器材')}</td><td class="n">${bnt(eq)}</td></tr></table>
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
  else if (d.count) { const [k, v] = d.count.split(','); buildCount(k, +v); }
  else if (d.fin) { const [k, v] = d.fin.split(','); S[k] = clamp(S[k] + v * 5e5, 0, 20e6); renderBuild(); }
  else if (d.bact === 'cancel') cancelBuild();
  else if (d.bact === 'open') { if (!openGym()) showToast(tx('This plot breaks a rule: see the list under 1 Plot.', '這塊場地不符合規則：請看「1 場地」下方的清單。')); }
});
