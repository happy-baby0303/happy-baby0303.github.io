/* ============================================================
   배냇함 큐레이터 — 뒤로가기 (shared/curatorback.js)

   본 앱은 backbutton.js 가 뒤로가기를 세 단계로 받는다.
   그런데 큐레이터는 별도 페이지라 그게 없다.

   여기서 뒤로가기를 누르면 무슨 일이 일어나나.

       젖병 정보 시트를 열어둠  →  뒤로가기  →  🔴 큐레이터 밖으로
       '쓰면서 챙길 것' 탭      →  뒤로가기  →  🔴 큐레이터 밖으로

   둘 다 "한 단계 취소" 가 아니라 "페이지 이탈" 이 된다.
   덮어놓은 걸 닫으려고 눌렀는데 페이지가 통째로 바뀌는 셈이다.

   세 단계로 받는다. 본 앱과 똑같은 순서다.

       1  덮은 시트가 있으면   →  닫는다
       2  둘째 탭에 있으면     →  첫 탭으로
       3  그 외                →  평소대로 (본 앱으로 돌아감)

   ⚠️ 3단계에서는 붙잡지 않는다.
      여기서 뒤로가기는 '앱 종료' 가 아니라 '본 앱으로 복귀' 다.
      돌아가려는 사람을 붙잡으면 그게 더 답답하다.

   각 큐레이터 index.html 에서 favsync.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var MARK = "bnh-curator";

    /* 큐레이터마다 덮는 시트 id 와 닫는 함수가 다르다.
       있는 것만 골라 쓴다. 없으면 그냥 넘어간다. */
    var SHEETS = [
        { id: "gear-sheet",      close: "closeGearSheet" },
        { id: "bottle-sheet",    close: "closeBottleSheet" },
        { id: "paci-sheet",      close: "closePaciSheet" },
        { id: "guide-sheet",     close: "closeGuideSheet" },
        { id: "milk-sheet",      close: "closeMilkSheet" },
        { id: "refuse-sheet",    close: "closeRefuseSheet" },
        { id: "compare-sheet",   close: "closeCompareSheet" },
        { id: "stroller-sheet",  close: "closeStrollerSheet" },
        { id: "carseat-sheet",   close: "closeCarseatSheet" },
        { id: "food-sheet",      close: "closeFoodSheet" },
        { id: "toy-sheet",       close: "closeToySheet" }
    ];

    function visible(el) {
        if (!el || !el.isConnected) return false;
        var st = window.getComputedStyle(el);
        return st.display !== "none" && st.visibility !== "hidden";
    }

    function openSheet() {
        for (var i = 0; i < SHEETS.length; i++) {
            var el = document.getElementById(SHEETS[i].id);
            if (visible(el)) return SHEETS[i];
        }
        /* 목록에 없는 시트도 잡는다.
           큐레이터가 다섯 곳이라 id 를 다 외우고 있을 수 없다.
           화면을 통째로 덮고 z-index 가 아주 높으면 시트로 본다. */
        var all = document.querySelectorAll('div[style*="position:fixed"], div[style*="position: fixed"]');
        for (var j = all.length - 1; j >= 0; j--) {
            var d = all[j];
            if (!visible(d)) continue;
            var st = d.getAttribute("style") || "";
            if (st.indexOf("inset:0") === -1 && st.indexOf("inset: 0") === -1) continue;
            if ((parseInt(window.getComputedStyle(d).zIndex, 10) || 0) < 1000) continue;
            return { id: d.id || null, close: null, el: d };
        }
        return null;
    }

    function closeIt(s) {
        if (s.close && typeof window[s.close] === "function") {
            try { window[s.close](); return; } catch (e) {}
        }
        var el = s.el || (s.id && document.getElementById(s.id));
        if (el) { try { el.remove(); } catch (e) {} }
        setTimeout(function () {
            if (!openSheet()) document.body.style.overflow = "";
        }, 60);
    }

    /* ---------- 둘째 탭에 있나 ---------- */

    function onSecondTab() {
        var t = document.getElementById("view-bottle-tools");
        return !!(t && visible(t));
    }

    function toFirstTab() {
        if (typeof window.switchBottleTab === "function") {
            try { window.switchBottleTab("pick"); return true; } catch (e) {}
        }
        return false;
    }

    /* ---------- 주소 기록 ---------- */

    function guard() {
        try { history.pushState({ bnh: MARK }, "", location.href); } catch (e) {}
    }

    var armed = false;     // 붙잡을 게 생겼을 때만 칸을 쌓는다

    function arm() {
        if (armed) return;
        armed = true;
        guard();
    }

    window.addEventListener("popstate", function () {
        var s = openSheet();
        if (s) { closeIt(s); armed = false; arm(); return; }

        if (onSecondTab() && toFirstTab()) { armed = false; arm(); return; }

        /* 붙잡을 게 없다. 본 앱으로 돌려보낸다. */
        armed = false;
    });

    /* ---------- 지켜보기 ----------
       시트가 열리거나 탭이 바뀌는 순간에만 칸을 쌓는다.
       아무것도 안 열었는데 미리 쌓아두면
       본 앱으로 돌아가려는 사람이 두 번 눌러야 한다. -------- */

    function check() {
        if (openSheet() || onSecondTab()) arm();
    }

    function boot() {
        if (window.MutationObserver) {
            var t = null;
            new MutationObserver(function () {
                if (t) return;
                t = setTimeout(function () { t = null; check(); }, 120);
            }).observe(document.body, {
                childList: true, subtree: true,
                attributes: true, attributeFilter: ["style"]
            });
        }
        setInterval(check, 1500);
        check();
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    /* 점검용 */
    window.curatorBackDebug = function () {
        var s = openSheet();
        console.log("덮은 시트:", s ? (s.id || "(id 없음)") : "없음");
        console.log("둘째 탭:", onSecondTab());
        console.log("칸 쌓임:", armed);
    };
})();