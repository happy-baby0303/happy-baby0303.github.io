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
        { id: "toy-sheet",       close: "closeToySheet" },
        { id: "crash-card-sheet", close: null },
        { id: "passed-sheet",    close: "closePassedSheet" },
        /* ⚠️ 아래 셋이 빠져 있었다. 일반 규칙(화면을 덮은 fixed 상자)으로 잡히긴 하지만,
              그 길은 그냥 지워버려서 닫을 때 할 일(목록 다시 그리기 등)을 건너뛴다. */
        { id: "shelf-sheet",     close: "closeShelfSheet" },      // 장난감 · 우리 집 육아템
        { id: "curator-modal",   close: "closeCuratorModal" },    // 장난감 · 이번 주 목표 고르기
        { id: "ai-deduction-modal", close: null },                // 이유식 · 큐브 차감
        { id: "food-paywall",    close: "closeFoodPaywall" },
        { id: "baby-picker",     close: null },
        { id: "install-guide-modal", close: null },
        { id: "cooking-mode-modal",  close: "closeCookingMode" },
        { id: "meal-bottom-sheet",   close: null },
        { id: "test-bottom-sheet",   close: null }
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

    /* ⚠️ 여기가 젖병 것만 보고 있었다. 제가 젖병에서 만들고
          다섯 곳에 그대로 복사했기 때문이다.

              젖병    view-bottle-tools   switchBottleTab
              유모차   view-stroller-use   switchStrollerTab
              카시트   view-carseat-use    switchCarseatTab
              이유식   (탭 이름이 또 다름)

          그래서 젖병 말고는 2단계(둘째 탭 → 첫 탭)가 아예 안 돌았다.
          유모차에서 '쓰면서 챙길 것' 을 열고 뒤로가기를 누르면
          첫 탭으로 가는 게 아니라 큐레이터 밖으로 나갔다.

          폴더마다 이름이 다르니 이름을 다 적어둔다. */

    /* ⚠️ 장난감은 'view-toy-use' 가 아니라 view-toy-gear 이고,
          이유식은 탭이 세 칸(tab-recipe · tab-plan · tab-allergy)으로 바뀌었다.
          그래서 그 둘은 2단계(둘째 탭 → 첫 탭)가 아예 안 돌아서,
          '장난감 추천' 이나 '식단표' 에서 뒤로가기를 누르면 큐레이터 밖으로 나갔다. */
    var SECOND_TABS = [
        "view-bottle-tools", "view-stroller-use", "view-carseat-use",
        "view-toy-gear", "tab-plan", "tab-allergy",
        "view-food-use", "view-toy-use", "view-bottle-use"
    ];

    var TO_FIRST = [
        ["switchBottleTab",    "pick"],
        ["switchStrollerTab",  "pick"],
        ["switchCarseatTab",   "pick"],
        ["switchToyMainTab",   "play"],     // 장난감 — 진짜 함수 이름
        ["foodTabGo",          "recipe"],   // 이유식 — 세 칸 탭
        ["switchFoodTab",      "pick"],
        ["switchToyTab",       "pick"],
        ["switchFoodView3",    "cook"]
    ];

    function onSecondTab() {
        for (var i = 0; i < SECOND_TABS.length; i++) {
            var t = document.getElementById(SECOND_TABS[i]);
            if (t && visible(t)) return true;
        }
        return false;
    }

    function toFirstTab() {
        for (var i = 0; i < TO_FIRST.length; i++) {
            var fn = window[TO_FIRST[i][0]];
            if (typeof fn !== "function") continue;
            try { fn(TO_FIRST[i][1]); return true; } catch (e) {}
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
            /* 덮은 시트가 생겼는지 보는 검사다. 화면이 바뀔 때마다 0.12초 뒤에 돌았는데,
               카드가 자주 다시 그려지는 탭에서는 그게 쉼 없이 돌았다. 조금 모았다가 한 번만. */
            new MutationObserver(function () {
                if (t) return;
                t = setTimeout(function () {
                    t = null;
                    if (!document.hidden) check();
                }, 400);
            }).observe(document.body, {
                childList: true, subtree: true,
                attributes: true, attributeFilter: ["style"]
            });
        }
        setInterval(function () { if (!document.hidden) check(); }, 1500);   // 다른 앱을 보는 동안은 쉰다
        check();
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    window.curatorBackVersion = '2026-09-23';   // 다섯 폴더가 같은 날짜여야 한다

    /* 점검용 */
    window.curatorBackDebug = function () {
        var s = openSheet();
        console.log("덮은 시트:", s ? (s.id || "(id 없음)") : "없음");
        console.log("둘째 탭:", onSecondTab());
        console.log("칸 쌓임:", armed);
    };
})();