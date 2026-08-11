/* ==========================================================================
   元新醫藥 — 手機導覽抽屜 (nav.js)

   為什麼需要這支：原本 ≤640px 的導覽是「橫向捲動 + 隱藏捲軸」，6 個連結在
   390px 寬會有約 170px 被切在畫面外，而且沒有任何可捲動的提示，最右側的
   「聯絡我們」等於看不到。這裡改為漢堡選單 + 全螢幕抽屜。

   設計原則：
   1. 漸進增強 — 沒有 JS 時，responsive.css 的橫向捲動仍是可用的後備。
      本檔會在 <html> 掛上 .yb-js-nav，CSS 只在該 class 存在時才隱藏連結列。
   2. 不硬寫連結 — 抽屜內容從各頁既有的 .yb-navlinks 複製，8 頁共用一份邏輯。
   3. 與 support.js 的 React runtime 共存 — 7 個頁面的 DOM 由 React 掛載在
      #dc-root，掛載時機在 CDN 載入之後。MutationObserver 負責等它出現，
      並在 React 重繪把按鈕移除時自動補回。抽屜本身掛在 <body> 底下
      （#dc-root 之外），不會被重繪波及。
   ========================================================================== */
(function () {
  'use strict';

  var BREAKPOINT = 720;          // 與 responsive.css 的 .yb-burger 斷點一致
  var drawer = null;             // 抽屜根節點（body 層級，只建立一次）
  var panel = null;
  var lastFocused = null;
  var scrollY = 0;

  // 漢堡鈕一律即時查詢，不快取節點。
  // 原因：support.js 會把 <x-dc> 的內容當樣板重新渲染，DOM 節點可能被 React
  // 換成它自己的副本；快取起來的參考會指向已經離開文件的舊節點。
  function getBurger() { return document.querySelector('.yb-burger'); }

  var reduceMotion = window.matchMedia('(prefers-reduced-motion:reduce)');

  /* ---------- 建立漢堡鈕 ---------- */

  function makeBurger() {
    var b = document.createElement('button');
    b.className = 'yb-burger';
    b.type = 'button';
    b.setAttribute('aria-label', '開啟選單');
    b.setAttribute('aria-expanded', 'false');
    b.setAttribute('aria-controls', 'ybDrawer');
    b.innerHTML =
      '<span class="yb-burger-bars" aria-hidden="true">' +
      '<span></span><span></span><span></span>' +
      '</span>';
    // 開合行為不綁在這個節點上，改用 document 委派（見 boot()）。
    // 綁在節點上的話，React 一旦重新渲染出自己的副本，按鈕就變成死的。
    return b;
  }

  /* ---------- 建立抽屜 ---------- */

  function makeDrawer(navlinks, logo) {
    var root = document.createElement('div');
    root.className = 'yb-drawer';
    root.id = 'ybDrawer';
    root.appendChild(makeBurger());

    panel = document.createElement('div');
    panel.className = 'yb-drawer-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', '主選單');

    // 複製原頁面的頂部資訊列，讓滿版選單的 Logo 與原 Nav 維持同一高度。
    var util = document.createElement('div');
    util.className = 'yb-drawer-util';
    var sourceUtil = document.querySelector('.yb-util > div');
    if (sourceUtil) {
      var utilLinks = sourceUtil.cloneNode(true);
      utilLinks.removeAttribute('style');
      utilLinks.className = 'yb-drawer-util-links';
      util.appendChild(utilLinks);
    }
    panel.appendChild(util);

    // 頂列：logo + 關閉鈕，與收合狀態的導覽列對齊
    var head = document.createElement('div');
    head.className = 'yb-drawer-head';

    if (logo) {
      var l = logo.cloneNode(true);
      l.removeAttribute('style');
      l.className = 'yb-drawer-logo';
      l.setAttribute('role', 'link');
      l.setAttribute('tabindex', '0');
      l.setAttribute('aria-label', '回到首頁');
      head.appendChild(l);
    } else {
      head.appendChild(document.createElement('span'));
    }

    var closeBtn = document.createElement('button');
    closeBtn.className = 'yb-drawer-close';
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', '關閉選單');
    closeBtn.innerHTML = '<span aria-hidden="true">&#10005;</span>';
    closeBtn.addEventListener('click', close);
    head.appendChild(closeBtn);

    panel.appendChild(head);

    // 連結：從該頁既有導覽列複製，順序與內容自動同步
    var nav = document.createElement('nav');
    nav.className = 'yb-drawer-nav';

    var here = location.pathname.split('/').pop() || 'index.html';
    var links = navlinks.querySelectorAll('a');

    for (var i = 0; i < links.length; i++) {
      var a = document.createElement('a');
      a.href = links[i].getAttribute('href');
      a.textContent = (links[i].textContent || '').trim();
      a.className = 'yb-drawer-link';
      if ((a.getAttribute('href') || '').split('/').pop() === here) {
        a.setAttribute('aria-current', 'page');
      }
      a.addEventListener('click', close);
      nav.appendChild(a);
    }

    panel.appendChild(nav);
    root.appendChild(panel);

    // 點全螢幕底層（panel 以外）關閉
    root.addEventListener('click', function (e) {
      if (e.target === root) close();
    });

    return root;
  }

  /* ---------- 開合 ---------- */

  function isOpen() {
    return !!drawer && drawer.classList.contains('is-open');
  }

  function open() {
    if (!drawer || isOpen()) return;
    lastFocused = document.activeElement;

    // iOS Safari 單靠 overflow:hidden 擋不住背景捲動，需固定 body 並記住位置
    scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
    document.body.style.position = 'fixed';
    document.body.style.top = -scrollY + 'px';
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';

    // 讓瀏覽器先套上初始狀態，下一幀才開始轉場
    requestAnimationFrame(function () {
      drawer.classList.add('is-open');
    });

    syncBurger(null, true);

    var first = panel.querySelector('.yb-drawer-close');
    if (first) first.focus();

    document.addEventListener('keydown', onKeydown, true);
  }

  function close() {
    if (!drawer || !isOpen()) return;

    drawer.classList.remove('is-open');

    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    window.scrollTo(0, scrollY);

    syncBurger(null, false);

    document.removeEventListener('keydown', onKeydown, true);

    // macOS 的 Safari／Firefox 點按鈕不會給它焦點，lastFocused 這時是 <body>；
    // 焦點若丟回 body，鍵盤使用者會被送回頁首，所以退回漢堡鈕本身。
    var restore = (lastFocused && lastFocused !== document.body && document.contains(lastFocused))
      ? lastFocused
      : getBurger();
    if (restore && document.contains(restore)) restore.focus();
    lastFocused = null;
  }

  /* ---------- 鍵盤：Esc 關閉、Tab 鎖在抽屜內 ---------- */

  function onKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== 'Tab') return;

    var items = panel.querySelectorAll('button, a[href]');
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  /* ---------- 掛載（可重複呼叫，會自我修復） ---------- */

  function mount() {
    var row = document.querySelector('.yb-navrow');
    if (!row) return false;

    // 關鍵：<x-dc> 裡的那份是「還沒被渲染的原始樣板」，不是畫面上的 DOM。
    // 往裡面塞東西的話，support.js 會把它一起讀進樣板，React 再渲染出一顆
    // 沒有任何行為的按鈕副本——按下去完全沒反應。等真正的輸出出現再掛。
    if (row.closest('x-dc')) return false;

    var navlinks = row.querySelector('.yb-navlinks');
    if (!navlinks) return false;

    var homeLogo = row.querySelector('img');
    if (homeLogo) {
      homeLogo.classList.add('yb-home-logo');
      homeLogo.setAttribute('role', 'link');
      homeLogo.setAttribute('tabindex', '0');
      homeLogo.setAttribute('aria-label', '回到首頁');
    }

    // 抽屜只建立一次，掛在 body 底下避開 React 的 #dc-root
    if (!drawer) {
      drawer = makeDrawer(navlinks, row.querySelector('img'));
      // 按鈕與抽屜一起掛在 React 根節點之外。動態頁重繪導覽列時，
      // 這個 portal 不會被移除；關閉狀態將 panel 淡出，開啟時滿版淡入。
      document.body.appendChild(drawer);
      document.documentElement.classList.add('yb-js-nav');
    }

    syncBurgerPosition();

    return true;
  }

  function syncBurgerPosition() {
    var row = document.querySelector('.yb-navrow');
    var b = getBurger();
    if (!row || !b) return;
    var r = row.getBoundingClientRect();
    var top = Math.max(0, r.top) + Math.max(0, (r.height - 44) / 2);
    b.style.setProperty('--yb-burger-top', Math.round(top) + 'px');
  }

  // 把開合狀態同步到目前畫面上的按鈕。
  // 狀態必須明確傳入，不能用 isOpen() 推導：close() 呼叫時 drawer.hidden
  // 還是 false（要等轉場結束才設 true），推導出來會是「還開著」，
  // 按鈕就會卡在 X 圖示與 aria-expanded="true"。
  function syncBurger(b, on) {
    b = b || getBurger();
    if (!b) return;
    b.setAttribute('aria-expanded', on ? 'true' : 'false');
    b.setAttribute('aria-label', on ? '關閉選單' : '開啟選單');
    b.classList.toggle('is-open', on);
  }

  /* ---------- 啟動 ---------- */

  function boot() {
    // 開合用事件委派：不論這顆按鈕是誰建立的（我們自己、或 React 重繪出來的
    // 副本），點擊都會被接到。這是這支檔案唯一的開合入口。
    document.addEventListener('click', function (e) {
      var logo = e.target.closest && e.target.closest('.yb-home-logo, .yb-drawer-logo');
      if (logo) {
        e.preventDefault();
        location.href = 'index.html';
        return;
      }
      var b = e.target.closest && e.target.closest('.yb-burger');
      if (!b) return;
      e.preventDefault();
      isOpen() ? close() : open();
    });

    document.addEventListener('keydown', function (e) {
      var logo = e.target.closest && e.target.closest('.yb-home-logo, .yb-drawer-logo');
      if (!logo || (e.key !== 'Enter' && e.key !== ' ')) return;
      e.preventDefault();
      location.href = 'index.html';
    });

    mount();

    // 7 個頁面的導覽列由 support.js 的 React runtime 非同步掛載，
    // 這裡等它出現；同時負責重繪後的自我修復。用 rAF 節流避免頻繁查詢。
    var queued = false;
    var observer = new MutationObserver(function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () {
        queued = false;
        mount();
      });
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    // 轉回桌機寬度時關閉抽屜，避免隱藏的抽屜還鎖著背景捲動
    window.addEventListener('resize', function () {
      if (window.innerWidth > BREAKPOINT && isOpen()) close();
      syncBurgerPosition();
    });
    window.addEventListener('scroll', syncBurgerPosition, { passive:true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
