/* ============================================================
   배냇함 — 새 판이 올라오면 한 번 새로 고침 (freshen.js)

   ⚠️ 플레이 앱은 뒤로가기로 나가도 끄지 않고 뒤로 보낸다 (MainActivity 의 moveTaskToBack).
      다시 열면 보던 화면 그대로라, 사이트에 새 판을 올려도 며칠씩 옛 판이 떠 있었다.
      아이폰 홈 화면 앱도 같다 (다시 열면 보던 화면 그대로).
   ⚠️ 사이트(GitHub Pages)가 폰에 '받은 화면을 10분 동안은 다시 써도 된다' 고 알려 준다.
      그래서 올린 직후 10분은 앱을 껐다 켜도 옛 판이 왔다.

   이렇게 한다
     · 켤 때(4초 뒤), 그리고 1분 넘게 나가 있다가 돌아올 때 서버의 판 번호를 캐시 없이 본다
       (sw.js 의 baenaet-vN — index.html 의 baenaet-build 와 늘 같은 수)
     · 지금 판보다 크면 주소에 ?fresh=N 을 붙여 다시 연다. 처음 보는 주소라 폰에 받아 둔 게 없어서 새 판이 온다.
       열리면 주소에서 ?fresh= 는 뗀다.
     · 글자를 쓰는 중 · 덮는 화면(기록 입력 · 편지 · 사진 고르기 …)이 떠 있음 · 사진을 고르거나 올리는 중이면
       다음에 돌아올 때로 미룬다. 쓰던 것을 날리지 않는다.
     · 한 번 시도한 판은 이 창에서 다시 시도하지 않는다 (새로 고침이 계속 도는 일이 없게)

   index.html 맨 끝, backbutton.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var meta = document.querySelector('meta[name="baenaet-build"]');
    var cur = meta ? (parseInt(meta.content, 10) || 0) : 0;
    if (!cur || typeof window.fetch !== 'function') return;

    var TRY = 'tosil_fresh_try';     // 이 창에서 새로 고쳐 본 판 번호 (sessionStorage)
    var AWAY = 60000;                // 이만큼 넘게 나가 있다 돌아오면 본다
    function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
    function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }

    /* 새로 고친 뒤 — 주소의 ?fresh= 를 떼고, 바뀐 걸 한 번 알려 준다 (갑자기 화면이 새로 떠서 놀라지 않게) */
    var fresh = /[?&]fresh=(\d+)/.exec(location.search);
    if (fresh) {
        try {
            var q = location.search.replace(/([?&])fresh=\d+(&|$)/, '$1').replace(/[?&]$/, '');
            if (history.replaceState) history.replaceState(history.state, '', location.pathname + q + location.hash);
        } catch (e) {}
        if (Number(fresh[1]) <= cur) {
            setTimeout(function () { if (typeof window.showToast === 'function') window.showToast('앱을 새 버전으로 바꿨어요'); }, 1800);
        }
    }

    /* 사진 고르기 — 갤러리로 나갔다 돌아오는 것도 '나갔다 옴' 이다. 고르고 올리는 동안은 건드리지 않는다 */
    var pickingUntil = 0;
    document.addEventListener('click', function (e) {
        var t = e.target;
        if (t && t.tagName === 'INPUT' && t.type === 'file') pickingUntil = Date.now() + 5 * 60000;
    }, true);
    document.addEventListener('change', function (e) {
        var t = e.target;
        if (t && t.tagName === 'INPUT' && t.type === 'file') pickingUntil = Date.now() + 90000;
    }, true);

    function busy() {
        if (Date.now() < pickingUntil) return true;
        var a = document.activeElement;
        if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable)) return true;
        try { if (typeof window.__anyLayerOpen === 'function' && window.__anyLayerOpen()) return true; } catch (e) {}
        return false;
    }

    var checking = false;
    function check() {
        if (checking || navigator.onLine === false) return;
        checking = true;
        fetch('./sw.js?build=' + Date.now(), { cache: 'no-store' })
            .then(function (r) { return r.ok ? r.text() : ''; })
            .then(function (t) {
                var m = /baenaet-v(\d+)/.exec(t || ''), srv = m ? parseInt(m[1], 10) : 0;
                if (!(srv > cur)) return;
                if (ssGet(TRY) === String(srv)) return;          // 이 판은 이미 한 번 시도했다
                if (busy()) return;                             // 쓰는 중 — 다음에 돌아올 때
                ssSet(TRY, String(srv));
                location.replace('./index.html?fresh=' + srv);
            })
            .catch(function () {})
            .then(function () { checking = false; });
    }

    var hiddenAt = 0;
    if (document.readyState === 'complete') setTimeout(check, 4000);
    else window.addEventListener('load', function () { setTimeout(check, 4000); });
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return; }
        if (hiddenAt && Date.now() - hiddenAt >= AWAY) { hiddenAt = 0; check(); }
    });
})();
