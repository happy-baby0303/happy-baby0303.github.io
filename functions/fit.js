/* ============================================================
   배냇함 — 한 줄 맞춤 (fit.js)

   글자 하나 때문에 두 줄이 되는 자리들을 자동으로 눌러 맞춘다.
   폰트 크기를 일일이 손보면 다음에 글자가 길어질 때 또 깨진다.
   재는 쪽이 낫다.

   맨 마지막에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var MIN = 0.70;     // 이보다 작아지면 읽기 힘드니 그냥 두 줄로 둔다
    var TICK = 3000;    /* ⚠️ 1.2초는 너무 잦다. 글자 길이는 그렇게 자주 안 변한다 */    // script.js 가 다시 그리므로 주기적으로 확인

    // 기본으로 눌러 맞출 자리들
    var TARGETS = [
        "#now-feed", "#now-diaper", "#now-sleep-state", "#now-sleep-label",
        "#milestone-counter",
        "#home-postcard-tile > div:nth-child(2)",
        "#home-postcard-tile > div:nth-child(3)",
        "[data-fit]"
    ];

    /* ⚠️ 3초마다 모든 자리의 모양을 지웠다가 다시 입혔다. 바뀐 게 없어도 매번.
          그때마다 화면이 다시 계산되고 화면 감시자들이 깨어났다 (배터리).
          글자 폭(scrollWidth)은 transform 과 상관없이 잴 수 있다. 재고, 달라졌을 때만 쓴다. */
    // theme.js 에게 '색을 바꾼 게 아니다' 라는 표시(data-theme-applied)는 실제로 쓸 때만 붙인다.
    //  안 쓰고 붙여두면 표시가 남아서, 다음에 script.js 가 바꾼 색을 theme.js 가 못 보고 지나쳤다.
    function setIfChanged(el, prop, val) {
        if (el.style[prop] === val) return;
        el.setAttribute("data-theme-applied", "true");
        el.style[prop] = val;
    }

    function fit(el) {
        if (!el || !el.parentNode) return;

        setIfChanged(el, "whiteSpace", "nowrap");
        if (!el.style.display) setIfChanged(el, "display", "block");
        setIfChanged(el, "transformOrigin", "center center");

        var room = el.clientWidth;
        var need = el.scrollWidth;
        var want = "";
        if (room && need && need > room + 0.5) {
            var k = room / need;
            if (k < MIN) {
                setIfChanged(el, "whiteSpace", "");   // 너무 작아지면 그냥 두 줄로
            } else {
                want = "scale(" + (Math.floor(k * 100) / 100) + ")";
            }
        }
        setIfChanged(el, "transform", want);
    }

    function run() {
        TARGETS.forEach(function (sel) {
            var list;
            try { list = document.querySelectorAll(sel); } catch (e) { return; }
            for (var i = 0; i < list.length; i++) fit(list[i]);
        });
    }

    // 다른 파일에서도 부를 수 있게 (사진 담은 뒤 등)
    window.fitOneLine = function (elOrSel) {
        if (typeof elOrSel === "string") {
            var l = document.querySelectorAll(elOrSel);
            for (var i = 0; i < l.length; i++) fit(l[i]);
        } else fit(elOrSel);
    };
    window.refitAll = run;

    function boot() {
        run();
        setInterval(run, TICK);
        window.addEventListener("resize", run);
        window.addEventListener("orientationchange", function () { setTimeout(run, 250); });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
})();