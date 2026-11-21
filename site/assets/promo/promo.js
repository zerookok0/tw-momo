/* ============================================================
   momo 首頁促銷：今日限定 5 折起 · 倒數到台灣時間當天 23:59:59
   ------------------------------------------------------------
   時區處理：一律用「UTC + 8h 平移」得到台灣牆鐘時間，
   不依賴使用者本機時區，也不受瀏覽器 tz database 影響。
     台灣 09:00 → 距 23:59:59 還 14h59m59s（顯示 14:59:59）
     台灣 21:00 → 還 2h59m59s（顯示 02:59:59）
   ============================================================ */
(function (global, doc) {
  'use strict';
  if (global.__PROMO_LOADED__) return;
  global.__PROMO_LOADED__ = true;

  var TW_OFFSET = 8 * 3600 * 1000;      // 台灣 = UTC+8，無夏令時
  var DAY = 86400000;
  var END_TEXT = '23:59';

  /* 弹窗出现频率
   *   0        = 每次加载都弹（当前设置，刷新也会弹）
   *   30*60e3  = 同一会话内 30 分钟只弹一次
   * 想改成「一天只弹一次」，把下面 COOLDOWN_MS 换成一天并把存储换成 localStorage 即可 */
  var COOLDOWN_MS = 0;

  /** 距離「台灣今天 23:59:59.999」還剩多少毫秒 */
  function msLeft() {
    var now = Date.now();
    var wall = now + TW_OFFSET;                 // 台灣牆鐘（毫秒）
    var nextMidnight = Math.floor(wall / DAY) * DAY + DAY;
    return Math.max(0, nextMidnight - wall);
  }

  function parts(ms) {
    var s = Math.floor(ms / 1000);
    return {
      h: Math.floor(s / 3600),
      m: Math.floor((s % 3600) / 60),
      s: s % 60,
      over: ms <= 0,
    };
  }

  var pad = function (n) { return n < 10 ? '0' + n : String(n); };

  // ── DOM ──
  var mask, box, bar, nums, barNums;

  function buildModal() {
    mask = doc.createElement('div');
    mask.id = 'promoMask';
    mask.setAttribute('role', 'dialog');
    mask.setAttribute('aria-modal', 'true');
    mask.setAttribute('aria-label', '今日限定 全館限時 5 折起');
    mask.innerHTML = [
      '<div id="promoBox">',
      '  <button id="promoClose" type="button" aria-label="關閉">✕</button>',
      '  <img class="pm-img" src="/assets/promo/50off-1200.jpg" alt="momo 購物網 全館 5 折起" width="1200" height="675">',
      '  <div class="pm-body">',
      '    <span class="pm-kicker">今日限定</span>',
      '    <h2 class="pm-title">全館限時 <em>5 折起</em></h2>',
      '    <p class="pm-sub">優惠只到今晚 ' + END_TEXT + '！</p>',
      '    <div class="pm-cd-label">距優惠結束還有</div>',
      '    <div class="pm-cd" id="promoCd">',
      '      <span class="pm-unit"><span class="pm-num" data-u="h">00</span><span class="pm-tag">時</span></span>',
      '      <span class="pm-colon">:</span>',
      '      <span class="pm-unit"><span class="pm-num" data-u="m">00</span><span class="pm-tag">分</span></span>',
      '      <span class="pm-colon">:</span>',
      '      <span class="pm-unit"><span class="pm-num" data-u="s">00</span><span class="pm-tag">秒</span></span>',
      '    </div>',
      '    <p class="pm-note">依台灣時間（UTC+8）計算</p>',
      '    <a class="pm-cta" href="/category">立即搶購 ›</a>',
      '  </div>',
      '</div>'
    ].join('');
    doc.body.appendChild(mask);
    nums = {
      h: mask.querySelector('[data-u="h"]'),
      m: mask.querySelector('[data-u="m"]'),
      s: mask.querySelector('[data-u="s"]'),
    };

    mask.querySelector('#promoClose').addEventListener('click', close);
    mask.addEventListener('click', function (e) { if (e.target === mask) close(); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && mask.classList.contains('on')) close(); });
  }

  function buildBar() {
    bar = doc.createElement('div');
    bar.id = 'promoBar';
    bar.innerHTML = [
      '<span class="pb-txt">今日限定！全館限時 <b>5 折起</b>，優惠只到今晚 ' + END_TEXT + '！</span>',
      '<span class="pb-cd" id="promoBarCd"><i data-u="h">00</i>:<i data-u="m">00</i>:<i data-u="s">00</i></span>',
      '<a class="pb-cta" href="/category">立即搶購</a>',
      '<button id="promoBarClose" type="button" aria-label="關閉橫幅">✕</button>'
    ].join('');
    // 插到 body 最前面（momo 的 header 是 sticky，橫幅在其上方）
    doc.body.insertBefore(bar, doc.body.firstChild);
    barNums = {
      h: bar.querySelector('[data-u="h"]'),
      m: bar.querySelector('[data-u="m"]'),
      s: bar.querySelector('[data-u="s"]'),
    };
    bar.querySelector('#promoBarClose').addEventListener('click', function () {
      bar.classList.remove('on');
    });
    // 每次加载都显示横幅（刷新后仍在）
    bar.classList.add('on');
  }

  function tick() {
    var p = parts(msLeft());
    var hh = p.over ? '00' : pad(p.h);
    var mm = p.over ? '00' : pad(p.m);
    var ss = p.over ? '00' : pad(p.s);
    if (nums) { nums.h.textContent = hh; nums.m.textContent = mm; nums.s.textContent = ss; }
    if (barNums) { barNums.h.textContent = hh; barNums.m.textContent = mm; barNums.s.textContent = ss; }
  }

  function open() {
    buildModal();
    tick();
    // 进一帧再加 class，保证过渡动画
    requestAnimationFrame(function () { mask.classList.add('on'); });
    doc.documentElement.style.overflow = 'hidden';
  }

  function close() {
    mask.classList.remove('on');
    doc.documentElement.style.overflow = '';
    try { sessionStorage.setItem('promo_seen_at', String(Date.now())); } catch (e) {}
  }

  function init() {
    buildBar();
    tick();
    setInterval(tick, 1000);

    // 冷却期内不重复弹；COOLDOWN_MS = 0 时每次加载都弹（刷新也会弹）
    var last = 0;
    try { last = Number(sessionStorage.getItem('promo_seen_at') || 0); } catch (e) {}
    var cooled = COOLDOWN_MS > 0 && last && (Date.now() - last) < COOLDOWN_MS;
    if (!cooled) setTimeout(open, 900);
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();

  // 调试用：控制台可看剩余毫秒 / 手动开关
  global.Promo = {
    left: msLeft,
    parts: function () { return parts(msLeft()); },
    open: function () { open(); },
    close: function () { if (mask) close(); },
  };
})(window, document);
