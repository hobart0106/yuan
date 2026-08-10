/* ==========================================================================
   元新醫藥 — 共用互動行為 (ui.js)

   處理原本「看起來可以點、實際上沒有任何行為」的控制項。

   全部採事件委派（監聽 document），因為 7 個頁面的 DOM 由 support.js 的
   React runtime 掛載，且可能重繪——直接綁在元素上的監聽器會在重繪後失效。
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- 分類／類別切換鈕 ----------
     用 [data-yb-tab] 標記，同一個 .yb-tabgroup 內互斥。
     若群組內有 [data-yb-tab-output]，選取值會寫進該欄位。 */

  var ACTIVE_BG = '#143A82';

  function setTab(btn) {
    var group = btn.closest('.yb-tabgroup');
    if (!group) return;

    group.querySelectorAll('[data-yb-tab]').forEach(function (b) {
      var on = b === btn;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.classList.toggle('is-active', on);
      // 這些頁面的樣式寫在 style 屬性上，只能同樣以行內樣式覆蓋
      b.style.background = on ? ACTIVE_BG : '#fff';
      b.style.color = on ? '#fff' : '#5A6473';
      b.style.border = on ? '0' : '1px solid #D7DCE3';
    });

    var out = document.getElementById(group.getAttribute('data-yb-tab-output') || '');
    if (out) out.value = btn.getAttribute('data-yb-tab');

    // 篩選：把帶 data-yb-filter 的項目依分類顯示／隱藏
    var scope = group.getAttribute('data-yb-filter-scope');
    if (scope) {
      var want = btn.getAttribute('data-yb-tab');
      document.querySelectorAll(scope + ' [data-yb-filter]').forEach(function (item) {
        var match = want === '全部' || item.getAttribute('data-yb-filter') === want;
        item.hidden = !match;
      });
    }
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-yb-tab]');
    if (btn) { e.preventDefault(); setTab(btn); }
  });

  document.addEventListener('keydown', function (e) {
    var btn = e.target.closest('[data-yb-tab]');
    if (!btn) return;
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    var group = btn.closest('.yb-tabgroup');
    if (!group) return;
    var all = [].slice.call(group.querySelectorAll('[data-yb-tab]'));
    var i = all.indexOf(btn) + (e.key === 'ArrowRight' ? 1 : -1);
    var next = all[(i + all.length) % all.length];
    e.preventDefault();
    next.focus();
    setTab(next);
  });

  /* ---------- 過期梯次不顯示 ----------
     每筆梯次標上 data-yb-until="YYYY-MM-DD"（該梯次最後一天）。
     結束日當天仍顯示，隔天才隱藏。不寫死要藏哪幾筆，否則過幾個月又會失準。

     若整組都過期，顯示同層的 [data-yb-empty] 作為替代，
     避免留下一塊空白讓人以為壞了。 */

  function hideExpired(root) {
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var items = (root || document).querySelectorAll('[data-yb-until]');

    for (var i = 0; i < items.length; i++) {
      var raw = items[i].getAttribute('data-yb-until').split('-');
      var end = new Date(+raw[0], +raw[1] - 1, +raw[2]);
      items[i].hidden = end < today;
    }

    var groups = (root || document).querySelectorAll('[data-yb-empty]');
    for (var g = 0; g < groups.length; g++) {
      var box = groups[g].parentElement;
      if (!box) continue;
      var all = box.querySelectorAll('[data-yb-until]');
      var live = box.querySelectorAll('[data-yb-until]:not([hidden])');
      groups[g].hidden = !(all.length && !live.length);
    }
  }

  hideExpired();
  document.addEventListener('DOMContentLoaded', function () { hideExpired(); });
  window.addEventListener('load', function () { hideExpired(); });
  // x-dc 頁面由 React 非同步掛載，重繪後要再跑一次
  setTimeout(hideExpired, 1200);

  /* ---------- 二級分類標籤的作用中狀態 ----------
     這些標籤是錨點連結，跳轉由瀏覽器處理；但樣板只把第一顆標成 is-active，
     點了之後高亮不會移動，看起來就像「沒反應」。這裡補上視覺回饋。
     只切換 class，不動 DOM 結構，避免與 React 重繪衝突。 */

  function setActiveChip(chip) {
    var group = chip && chip.parentElement;
    if (!group) return;
    var all = group.querySelectorAll('.ychip');
    for (var i = 0; i < all.length; i++) all[i].classList.toggle('is-active', all[i] === chip);
  }

  document.addEventListener('click', function (e) {
    if (!e.target.closest) return;

    var chip = e.target.closest('.ychip');
    if (chip) { setActiveChip(chip); return; }

    // 切換一級分類後要把二級高亮拉回第一顆。不能指望 React 幫忙重設：
    // 它算出的 className 與上一次相同就會跳過 DOM 更新，我們手動加上的
    // class 會原封不動留著。等重繪完成後自己歸位。
    if (e.target.closest('.ycattab')) {
      var reset = function () {
        var first = document.querySelector('.ychip');
        if (first) setActiveChip(first);
      };
      setTimeout(reset, 0);
      setTimeout(reset, 200);
    }
  });

  /* ---------- 產品卡輪播的分頁點 ----------
     軌道與圓點都由樣板產生，這裡只負責同步狀態與點擊跳轉。
     scroll 事件不會冒泡，所以用捕獲階段掛在 document 上——這樣 React
     重新渲染出新的軌道節點時也不需要重新綁定。 */

  function activeIndex(track) {
    var slides = track.children;
    if (!slides.length) return 0;
    // 以軌道中心最接近的那張為準，比用 scrollLeft/寬度 推算更耐得住
    // 首尾留白與不同的卡片寬度
    var mid = track.scrollLeft + track.clientWidth / 2;
    var best = 0, bestD = Infinity;
    for (var i = 0; i < slides.length; i++) {
      var s = slides[i];
      var c = s.offsetLeft + s.offsetWidth / 2;
      var d = Math.abs(c - mid);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  function syncDots(track) {
    var wrap = track.parentElement;
    if (!wrap) return;
    var dots = wrap.querySelectorAll('.yp-dot');
    if (!dots.length) return;
    var i = activeIndex(track);
    for (var k = 0; k < dots.length; k++) dots[k].classList.toggle('is-active', k === i);
  }

  document.addEventListener('scroll', function (e) {
    var t = e.target;
    if (t && t.classList && t.classList.contains('yp-track')) syncDots(t);
  }, true);

  document.addEventListener('click', function (e) {
    var dot = e.target.closest && e.target.closest('.yp-dot');
    if (!dot) return;
    var wrap = dot.closest('.yp-carousel');
    var track = wrap && wrap.querySelector('.yp-track');
    if (!track) return;
    var dots = [].slice.call(wrap.querySelectorAll('.yp-dot'));
    var slide = track.children[dots.indexOf(dot)];
    if (!slide) return;
    track.scrollTo({
      left: slide.offsetLeft - (track.clientWidth - slide.offsetWidth) / 2,
      behavior: window.matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth',
    });
  });

  /* ---------- 頁尾欄位收合 ----------
     HTML 送出時是 <details open>，這樣關掉 JS 也看得到全部連結。
     這裡只在手機寬度把它收起來，換取約 450px 的垂直空間。 */

  var narrow = window.matchMedia('(max-width:640px)');

  function syncFooterCols() {
    var cols = document.querySelectorAll('.yb-footcol');
    for (var i = 0; i < cols.length; i++) {
      // 使用者手動開過的欄位不要被 resize 重新關上
      if (cols[i].dataset.ybTouched === '1') continue;
      cols[i].open = !narrow.matches;
    }
  }

  // 只認真正的點擊。不能用 toggle 事件：React 掛載 <details open> 時就會觸發它，
  // 會把每個欄位都誤判成「使用者開過」，收合因此完全失效。
  document.addEventListener('click', function (e) {
    var s = e.target.closest && e.target.closest('.yb-footcol > summary');
    if (s) s.parentElement.dataset.ybTouched = '1';
  });

  syncFooterCols();
  // React 掛載後頁尾才存在，需要再跑一次
  document.addEventListener('DOMContentLoaded', syncFooterCols);
  window.addEventListener('load', syncFooterCols);
  setTimeout(syncFooterCols, 1200);
  if (narrow.addEventListener) {
    narrow.addEventListener('change', function () {
      var cols = document.querySelectorAll('.yb-footcol');
      for (var i = 0; i < cols.length; i++) delete cols[i].dataset.ybTouched;
      syncFooterCols();
    });
  }

  /* ---------- 洽詢表單 ----------
     目前沒有後端接收端點。與其讓「送出」按下去毫無反應（或整頁重載），
     這裡先做完整的必填驗證，通過後產生一封預先填好的信件連結讓使用者寄出。
     等後端就緒，把這段換成 fetch 到實際端點即可。 */

  var CONTACT_TO = 'sales@yuanhsin-pharma.com.tw';

  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (form.id !== 'ybContactForm') return;
    e.preventDefault();

    var note = document.getElementById('ybContactNote');
    var invalid = null;
    var fields = [].slice.call(form.querySelectorAll('[required]'));

    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      if (!f.value.trim() || (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value))) {
        invalid = f;
        break;
      }
    }

    if (invalid) {
      if (note) {
        note.style.color = '#B3261E';
        note.textContent = '請完整填寫必填欄位，Email 需為有效格式。';
      }
      invalid.focus();
      return;
    }

    var get = function (n) {
      var el = form.elements[n];
      return el ? el.value.trim() : '';
    };
    var subject = '[' + get('category') + '] ' + get('organization') + ' ' + get('name');
    var body = [
      '洽詢類別：' + get('category'),
      '姓名：' + get('name'),
      '單位 / 公司名稱：' + get('organization'),
      '聯繫電話：' + get('tel'),
      'Email：' + get('email'),
      '',
      '洽詢內容：',
      get('message'),
    ].join('\n');

    var href = 'mailto:' + CONTACT_TO +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body);

    if (note) {
      note.style.color = '#1F5BB5';
      note.textContent = '';
      var a = document.createElement('a');
      a.href = href;
      a.textContent = '內容已備妥 — 點此開啟信件寄出 →';
      a.style.fontWeight = '700';
      a.style.color = '#1F5BB5';
      note.appendChild(a);
      a.focus();
    }
  });
})();
