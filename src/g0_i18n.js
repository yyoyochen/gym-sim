
// ================================================================ language (En / 中文, Traditional Chinese)
let LANG = (() => { try { return localStorage.getItem('gymsim.lang') || 'en'; } catch (e) { return 'en'; } })();
const ZH = {
  // panel groups and buttons
  'Bank': '銀行', 'Close early': '提前結帳', 'Cap per visit': '每次上限', 'Your own money': '自有資金', 'Bank loan': '銀行貸款', 'Loan rate a year': '貸款年利率', 'Loan term': '貸款年限', 'Today': '今日', 'P&L': '損益表', 'Pricing': '價格', 'Staff': '人員', 'Facility': '場地',
  'Run': '營運', 'Monitors': '現在', 'Day': '當日', 'Members': '會員', 'Gym': '健身房', 'Plots': '圖表',
  'Setup': '重新開始', 'Go': '開始', 'Pause': '暫停', 'Step': '+1 分鐘', 'Go (new day)': '開始（新的一天）',
  'Sound off': '音效：關', 'Sound on': '音效：開', 'Copy results': '複製結果', 'Seed': '種子', 'Random seed': '隨機種子',
  'applies on Setup': '重新開始後生效', '· Setup': '· 重新開始後生效', 'On': '開', 'Off': '關',
  'Behaviour sliders apply immediately.': '這裡的調整會立即生效。',
  'Some settings change the building or the day: press Setup to apply them.': '有些調整只對新開的健身房生效：按「重新開始」套用。',
  // accessibility labels
  'Pixel-art gym diorama': '像素風健身房場景', 'Rotate left': '向左旋轉', 'Rotate right': '向右旋轉', 'Zoom out': '縮小', 'Zoom in': '放大',
  // sliders and choosers
  'Speed (gym seconds per real second)': '速度',
  'Arrival curve': '到場曲線', 'Weekday': '平日', 'Weekend': '週末', 'January rush': '新年人潮', 'Holiday week': '連假週',
  'People at the weekly peak': '每週尖峰在場人數', 'Month': '月份',
  'Jan': '1月', 'Feb': '2月', 'Mar': '3月', 'Apr': '4月', 'May': '5月', 'Jun': '6月', 'Jul': '7月', 'Aug': '8月', 'Sep': '9月', 'Oct': '10月', 'Nov': '11月', 'Dec': '12月',
  'Mon': '週一', 'Tue': '週二', 'Wed': '週三', 'Thu': '週四', 'Fri': '週五', 'Sat': '週六', 'Sun': '週日',
  'Off-peak price per minute': '離峰每分鐘價格', 'Peak price per minute (Mon–Fri 18–22)': '尖峰每分鐘價格（週一至週五 18–22）',
  'Prices bill at once; members react from the next day.': '價格立即計費；會員從隔天開始反應。',
  'Rental price per 90 min': '每 90 分鐘場租', 'Allow outside coaches': '開放外部教練',
  'Turned away at the door': '門口離開', 'Bad visits': '不佳到訪',
  'Depreciation': '折舊', 'Net profit': '淨利',
  'What moves profit most: monthly EBITDA with each input at its low or high value (parameter-book arithmetic, not simulated).': '影響獲利最大的因素：每項調到低或高值時的每月 EBITDA（參數書試算，非模擬）。',
  'Low': '低', 'High': '高', 'PT sessions a month': '每月教練課堂數', 'Gym keeps of PT': '館方教練課分潤',
  'Month total': '本月合計', 'Month to date': '本月至今', 'Projected rest': '預估剩餘', 'Fixed costs': '固定成本', 'EBITDA': 'EBITDA', 'Active members': '活躍會員', 'Joined': '新加入', 'Lapsed': '流失',
  'Returned': '回流', 'PT clients': '教練課學員', 'Next day': '下一天', 'New month': '新的一個月', 'Day complete · press Next day': '今日結束 · 按「下一天」',
  'Month complete · press New month': '本月結束 · 按「新的一個月」',
  'P&L': '損益', 'Visit fees': '入場費', 'Member cards': '會員卡', 'PT earned (sessions delivered)': '教練課收入（已上課）', 'Floor rentals': '場租', 'Add-ons (estimated)': '其他收入（估計）',
  'Gross revenue': '總收入', 'VAT': '營業稅', 'Net sales': '銷售淨額', 'Coach payout': '教練拆帳', 'Marketing': '行銷', 'Card fees': '刷卡手續費',
  'Rent and management': '租金與管理費', 'Electricity': '電費', 'Other fixed costs': '其他固定成本', 'Staff': '人事', 'EBITDA today': '今日 EBITDA',
  'Cash in today': '今日現金收入', 'Floor area': '坪數', 'Rent per 坪': '每坪租金', 'Staff cost per month': '每月人事成本', 'Prepaid PT owed ($)': '預收教練課未上課金額（元）', 'Instalments due': '待收分期款',
  'Costs accrue through opening hours; add-ons are estimated, not simulated.': '成本隨營業時間累計；其他收入為估計值，非模擬結果。', 'Mean visit length': '平均停留時間',
  'Setting': '環境', 'Urban': '都市', 'Suburban': '郊區', 'Rural': '鄉村',
  'Weather': '天氣', 'Clear': '晴天', 'Rain': '雨天', 'Heatwave': '熱浪',
  'Setting and rain show at once. How members travel (scooter, bus, on foot, dropped off), bus frequency and the heatwave curve apply on Setup.':
    '環境與雨天會立即顯示。會員的交通方式（機車、公車、步行、接送）、公車班距和熱浪時的到場曲線，按「重新開始」後生效。',
  'Archetype mix (sums to 100 %, applies from tomorrow)': '會員類型組成（合計 100%，明天起生效）',
  'Powerlifter': '健力選手', 'Olympic lifter': '舉重選手', 'Bodybuilder': '健美選手', 'Beginner': '新手', 'Coach with client': '教練帶學員',
  'Patience before swapping': '換器材前的耐心', 'Work-in willingness': '輪流使用意願', 'Rest between sets': '組間休息', 'Re-rack habit': '槓片歸位習慣',
  'Power racks': '健力架', 'Olympic platforms': '舉重台', 'Adjustable benches': '可調式訓練椅', 'Cleaners': '清潔人員',
  'Capacity cap at the turnstile': '入口閘門人數上限', 'Racks used for curls': '有人在健力架做彎舉',
  // monitors
  'Clock': '時鐘', 'Inside now': '館內人數', 'Waiting now': '等待人數', 'Avg wait': '平均等待', 'Longest queue': '最長隊伍',
  'PRs today': '今日 PR', 'Stray weights': '未歸位', 'Visits': '到訪人次', 'Rack queue': '架前排隊',
  // plots
  'Occupancy vs capacity cap': '館內人數與上限', 'Rack queue length': '健力架排隊人數', 'Zone use (stacked)': '各區使用人數（堆疊）',
  'Wait times (minutes)': '等待時間（分鐘）', 'today': '今日', 'earlier runs': '前幾天', 'earlier runs (faded)': '前幾天（淡色）', 'cap': '上限',
  'waits finished today': '今日完成的等待',
  'Cardio': '有氧', 'Machines': '器械', 'Dumbbells': '啞鈴', 'Racks': '健力架', 'Platforms': '舉重台', 'Machine': '器械', 'DB': '啞鈴', 'Rack': '健力架', 'Platform': '舉重台',
  // hud and toasts
  'Drag to pan · click people and equipment for details': '拖曳平移 · 點擊人物和器材查看詳情',
  'Pinch to zoom · two fingers to pan · tap people and equipment for details': '雙指縮放 · 雙指平移 · 點選人物和器材查看詳情',
  'Day complete · press Setup or Go for a new day': '今日結束 · 按「重新開始」或「開始」進入新的一天',
  'Results copied': '已複製結果', 'Copy was blocked here': '此處無法複製',
  'This diorama needs WebGL, which isn\'t available in this browser.': '這個場景需要 WebGL，但此瀏覽器不支援。',
  // follow card: states
  'Gone home': '已回家', 'Arriving': '抵達中', 'Waiting outside (gym full)': '在門外等候（館內已滿）', 'Checking in': '報到中',
  'At the front desk': '在櫃檯', 'Heading to the changing room': '前往更衣室', 'Changing': '更衣中', 'Done, heading to change': '練完了，前往更衣',
  'Leaving': '離開中', 'Waiting for the bus': '等公車', 'Parking': '停車中', 'Waiting for a spotter': '等待保護者', 'Stretching': '伸展',
  'Stripping the bar': '卸下槓片', 'Stripping a loaded bar': '卸下別人留下的槓片', 'Returning stray dumbbells': '歸位散落的啞鈴',
  'Wiping down equipment': '擦拭器材', 'On patrol': '巡場中', 'Front desk': '櫃檯', 'Spotting': '幫忙保護', 'Coaching the floor': '場內指導',
  'Client (with coach)': '學員（有教練）', 'Staff': '員工', 'Cleaner': '清潔人員', 'Head coach': '總教練', 'Personal coach': '私人教練',
  'Power rack': '健力架', 'Olympic platform': '舉重台', 'Adjustable bench': '可調式訓練椅', 'Dumbbell spot': '啞鈴區', 'Sled lane': '推雪橇道', 'Stretch mat': '伸展墊',
  'free': '空著', 'nobody': '沒有人', 'Stop following': '停止跟隨', 'Close': '關閉',
  'treadmill': '跑步機', 'bike': '飛輪', 'rower': '划船機', 'airbike': '風扇車',
  // lifts
  'Squat': '深蹲', 'Front squat': '前蹲舉', 'Bench press': '臥推', 'Deadlift': '硬舉', 'Overhead press': '站姿肩推', 'Curls (in the rack)': '彎舉（在健力架）',
  'Snatch': '抓舉', 'Clean & jerk': '挺舉', 'DB bench': '啞鈴臥推', 'DB shoulder press': '啞鈴肩推', 'DB curl': '啞鈴彎舉', 'Lateral raise': '側平舉',
  'Cable fly': '繩索夾胸', 'Lat pulldown': '滑輪下拉', 'Seated row': '坐姿划船', 'Chest press': '胸推機', 'Shoulder press': '肩推機', 'Pec deck': '蝴蝶機',
  'Leg extension': '腿伸展', 'Leg curl': '腿彎舉', 'Leg press': '腿推', 'Hack squat': '哈克深蹲', 'Hip thrust': '臀推', 'Belt squat': '腰帶深蹲',
  'Pull-up': '引體向上', 'Dip': '雙槓撐體', 'Sled push': '推雪橇'
};
const zh = () => LANG === 'zh';
const EN = { 'Speed (gym seconds per real second)': 'Speed', 'Monitors': 'Right now', 'Plots': 'Charts',
  /* judge 2026-11-20: Setup restarts the business, so it says so; no lab words on the panel */
  'Setup': 'Start over', 'Step': '+1 min', 'earlier runs': 'earlier days', 'earlier runs (faded)': 'earlier days (faded)', 'applies on Setup': 'applies on Start over', '· Setup': '· needs Start over', 'Behaviour sliders apply immediately.': 'Changes here apply at once.',
  'Some settings change the building or the day: press Setup to apply them.': 'Some changes only apply to a new business: press Start over to use them.',
  'Setting and rain show at once. How members travel (scooter, bus, on foot, dropped off), bus frequency and the heatwave curve apply on Setup.': 'Setting and rain show at once. How members travel (scooter, bus, on foot, dropped off), bus frequency and the heatwave curve apply on Start over.',
  'Day complete · press Setup or Go for a new day': 'Day complete · press Start over or Go for a new day' };   /* first-minute polish: plain words on the panel; the keys stay as they were */
const tr = (s) => (zh() && ZH[s] !== undefined ? ZH[s] : EN[s] !== undefined && !zh() ? EN[s] : s);
// a sentence with numbers in it: English and Chinese written side by side at the call site
const tx = (en, zhs) => (zh() ? zhs : en);
// "Coach Mara" -> "Mara 教練"
// judge 2026-11-20: in Chinese the people on the floor read as Chinese names. Display only: the member data and its random draws keep the names they were made with.
const ZH_SURNAME = '艾白陳杜易方高黃尹簡柯林馬倪歐潘邱阮蘇唐吳魏王許楊張';   /* by the initial, A to Z */
const ZH_GIVEN = ['怡君', '家豪', '雅婷', '志明', '淑芬', '冠宇', '欣怡', '承恩', '佩珊', '柏翰', '詩涵', '宗翰', '雅雯', '俊傑', '宜蓁', '建宏', '筱涵', '子軒', '惠如', '品睿', '佳穎', '宇翔', '婉婷', '彥廷', '思妤', '哲瑋', '靜宜', '睿恩', '郁婷', '明哲',
  '心怡', '浩宇', '美玲', '家瑋', '雅筑', '信宏', '芷晴', '韋廷', '慧君', '柏宇', '嘉玲', '冠廷', '宛蓉', '俊宏', '曉雯', '志豪', '玉婷', '承翰', '依婷', '威廷', '佳蓉', '文傑', '羽彤', '立偉', '孟潔', '政霖', '語彤', '書豪', '筱婷', '晉瑋'];
function zhGiven(first) { let i = typeof FIRST !== 'undefined' ? FIRST.indexOf(first) : -1; if (i < 0) { i = 0; for (const ch of first) i = (i * 31 + ch.charCodeAt(0)) >>> 0; } return ZH_GIVEN[i % ZH_GIVEN.length]; }
function trName(n) {
  if (!zh() || !n) return n;
  if (n.startsWith('Coach ')) return zhGiven(n.slice(6)) + ' 教練';   // "Coach Mara" -> "怡君 教練"
  const m = /^([A-Za-z]+) ([A-Z])\.$/.exec(n); return m ? ZH_SURNAME[m[2].charCodeAt(0) - 65] + zhGiven(m[1]) : tr(n);
}
const MIN = () => tx(' min', ' 分');
function setLang(l) {
  LANG = l; try { localStorage.setItem('gymsim.lang', l); } catch (e) {}
  document.documentElement.lang = zh() ? 'zh-Hant-TW' : 'en';
  const b = document.getElementById('langBtn'); if (b) b.querySelectorAll('span[data-l]').forEach(s => s.classList.toggle('on', s.dataset.l === l));
  const sub = document.getElementById('hudSub'); if (sub) sub.textContent = tr(matchMedia('(pointer: coarse)').matches ? 'Pinch to zoom · two fingers to pan · tap people and equipment for details' : 'Drag to pan · click people and equipment for details');
  [['c', 'Pixel-art gym diorama'], ['rotL', 'Rotate left'], ['rotR', 'Rotate right'], ['zoomOut', 'Zoom out'], ['zoomIn', 'Zoom in']].forEach(([id, k]) => { const e = document.getElementById(id); if (e) e.setAttribute('aria-label', tr(k)); });
  const fb = document.getElementById('fallback'); if (fb) fb.textContent = tr('This diorama needs WebGL, which isn\'t available in this browser.');
  if (typeof buildPanel === 'function' && panel.childElementCount) {
    const open = !panel.classList.contains('closed'), tab = panel.querySelector('.tabs button.on'), tk = tab ? tab.dataset.t : 'Run', st = panel.scrollTop;
    const more = panel.querySelector('details.more'), moreOpen = !!(more && more.open);
    buildPanel(); placePlots(); { const m2 = panel.querySelector('details.more'); if (m2) m2.open = moreOpen; } refreshGo(); refreshPending(); showTab(tk); panel.classList.toggle('closed', !open); panel.scrollTop = st; lockBuiltSliders();
    if (typeof BUILD !== 'undefined' && BUILD.on) renderBuild();
    refreshSnd();
  }
  { const gc = document.getElementById('goalCard'); if (gc && !gc.hidden && typeof showGoalCard === 'function') showGoalCard(gc.dataset.mode === 'change'); }   /* the goal card follows the language */
  if (typeof BOOKS !== 'undefined' && BOOKS.open) renderBooks();   // the open binder follows the language too
}
