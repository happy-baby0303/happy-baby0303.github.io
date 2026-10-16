/* ============================================================
   배냇함 — 큐레이터의 플레이 앱 라이트 (shared/curatorlite.js)

   왜 필요한가
     본 앱은 playlite.js 가 플레이 앱 안에서 응급 처치 · 의료 안내를 숨긴다.
     (구글 플레이는 의료 기능이 있는 앱을 조직(사업자) 계정만 올리게 한다)
     그런데 큐레이터(이유식 · 장난감 · 유모차 · 카시트 · 젖병)는 따로 열리는 페이지라
     거기 있는 응급 처치 안내(알레르기 응급 · 단추 전지 삼켰을 때)는 그대로 보였다.

   하는 일
     본 앱 playlite.js 와 같은 기준으로 '플레이 앱인가' 를 정하고
       .pl-hide  → 플레이 앱에서 숨긴다
       .pl-only  → 플레이 앱에서만 보인다 (응급 처치 대신 '바로 병원에' 같은 짧은 안내 한 줄)
     웹(크롬 · 아이폰 홈 화면)은 아무것도 안 바뀐다.

   ⚠️ 판단 기준을 바꿀 땐 playlite.js 와 같이 바꾼다 (같은 열쇠 이름을 쓴다).
   각 큐레이터 index.html <head> 위쪽에 한 줄:
     <script src="../shared/curatorlite.js?v=1"></script>
   ============================================================ */
(function () {
    'use strict';
    if (window.__curatorLite) return;
    window.__curatorLite = true;

    var PKG = 'android-app://com.baenaet.app';
    function lsGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
    function lsSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }
    function ssGet(k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } }
    function ssSet(k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) {} }
    function ssDel(k) { try { window.sessionStorage.removeItem(k); } catch (e) {} }

    try {
        var q = new URLSearchParams(location.search).get('playlite');
        if (q === '1') ssSet('baenaet_play_preview', '1');
        if (q === '0') ssDel('baenaet_play_preview');
    } catch (e) {}

    var UA = navigator.userAgent || '';
    var inShell = /BaenatApp/i.test(UA) && /Android/i.test(UA);
    var fromPlay = inShell || String(document.referrer || '').indexOf(PKG) === 0;
    if (fromPlay) { lsSet('baenaet_play_app', '1'); ssSet('baenaet_play_sess', '1'); }

    var inBrowserTab = false;
    try { inBrowserTab = !!(window.matchMedia && window.matchMedia('(display-mode: browser)').matches); } catch (e) {}
    var preview = ssGet('baenaet_play_preview') === '1';
    var playCtx = fromPlay || ssGet('baenaet_play_sess') === '1' || (lsGet('baenaet_play_app') === '1' && !inBrowserTab);
    var lite = preview || (playCtx && lsGet('baenaet_play_medical') !== '1');

    window.isPlayLite = function () { return lite; };
    window.isPlayApp = function () { return playCtx; };

    try {
        var st = document.createElement('style');
        st.id = 'curatorlite-css';
        st.textContent = lite ? '.pl-hide{display:none !important;}' : '.pl-only{display:none !important;}';
        (document.head || document.documentElement).appendChild(st);
        if (lite) document.documentElement.classList.add('play-lite');
    } catch (e) {}
})();
