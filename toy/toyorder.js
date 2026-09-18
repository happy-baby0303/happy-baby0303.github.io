/* ============================================================
   배냇함 — 놀이 탭 순서 (toyorder.js)

   놀이 탭에 카드를 꽂는 모듈이 여섯이다.
   그런데 넷이 전부 "맨 위에" 꽂는다.

       myshelf    300ms   insertBefore(firstChild)
       playweek    10ms   insertBefore(firstChild)
       toylife    500ms   insertBefore(firstChild)
       playlog    700ms   insertBefore(firstChild)

   나중에 꽂힌 게 위로 간다. 그래서 실제 순서는
   로딩이 몇 ms 걸렸느냐로 정해진다.

   폰이 빠른 날과 느린 날, 캐시가 있는 날과 없는 날에
   카드 순서가 다르다. 부모는 매번 다른 데를 찾는다.

   ⚠️ 각 모듈을 고치지 않는다.
      여섯 개를 다 고치면 하나는 반드시 어긋나고,
      새 모듈이 생기면 또 같은 일이 벌어진다.
      다 꽂힌 뒤에 순서만 바로잡는다.

   순서는 '오늘 할 일' 부터다.

       1  이번 주 놀이        오늘 뭘 할지
       2  우리 집 장난감       그걸로 놀려면 뭐가 있는지
       3  잠자는 장난감        꺼내 쓸 것
       4  놀이 기록           놀고 나서
       5  뭐 사줄까           남이 물어보면

   index.html 맨 끝에서 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var HOST = "view-toy-play";

    /* 위에서부터 이 차례로 세운다. 목록에 없는 건 건드리지 않고 뒤에 둔다. */
    /* ⚠️ '지금 몇 분' 이 제일 위다.
          주간 처방은 일요일에 한 번 보지만, 이건 하루에 여러 번 연다.
          자주 쓰는 것이 위에 있어야 한다. */
    var ORDER = ["play-now", "play-stage", "play-week", "my-shelf", "toy-idle", "play-log", "toy-gift"];

    function host() { return document.getElementById(HOST); }

    function tidy() {
        var h = host();
        if (!h) return;

        var found = [];
        for (var i = 0; i < ORDER.length; i++) {
            var el = document.getElementById(ORDER[i]);
            if (el && el.parentNode === h) found.push(el);
        }
        if (found.length < 2) return;

        /* 이미 이 순서면 아무것도 안 한다.
           매번 옮기면 화면이 깜빡이고, 스크롤 위치도 튄다. */
        var ok = true;
        for (var j = 1; j < found.length; j++) {
            if (found[j - 1].compareDocumentPosition(found[j]) & Node.DOCUMENT_POSITION_FOLLOWING) continue;
            ok = false; break;
        }
        if (ok) return;

        /* 목록에 있는 것들만 차례대로 맨 앞에 다시 세운다.
           목록에 없는 카드는 자리를 그대로 지킨다. */
        var anchor = found[0];
        for (var k = 0; k < found.length; k++) {
            h.insertBefore(found[k], anchor);
            anchor = found[k].nextSibling;
        }
    }

    window.tidyToyOrder = tidy;

    function boot() {
        [400, 900, 1500, 2200, 3500, 5000].forEach(function (t) { setTimeout(tidy, t); });

        /* 탭을 옮기거나 카드를 다시 그리면 또 흐트러진다 */
        if (window.MutationObserver) {
            var t = null;
            var h = host();
            if (h) {
                new MutationObserver(function () {
                    if (t) return;
                    t = setTimeout(function () { t = null; tidy(); }, 250);
                }).observe(h, { childList: true });
            }
        }
        setInterval(tidy, 4000);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    window.toyOrderDebug = function () {
        var h = host();
        if (!h) return console.log("놀이 탭 칸이 없습니다");
        console.log("지금 순서:");
        Array.prototype.slice.call(h.children).forEach(function (el, i) {
            var t = (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 26);
            console.log("  " + (i + 1) + ". " + (el.id || "(id 없음)").padEnd(12) + " " + t);
        });
        console.log("\n원하는 순서:", ORDER.join(" → "));
    };
})();