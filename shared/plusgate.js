/* ============================================================
   배냇함 큐레이터 — 플러스로 가는 문 (plusgate.js)

   잠긴 화면에 문이 없었다.

     "나머지 6가지는 PLUS에서 하루에 하나씩"
     "오래된 것부터 위로"
     "나머지 4개도 PLUS에서 챙겨드려요"

   셋 다 글자만 있고 누를 게 없다. 클릭 0개다.
   읽고 "아 그렇구나" 하고 끝난다.

   큐레이터는 별도 페이지라 결제창을 직접 못 연다.
   script.js 가 여기 없어서 window.showPaywall 이 없다.
   그래서 앱으로 돌아가는 길을 낸다.  ../index.html?go=plus

   ⚠️ 문구에 값을 적지 않는다.
      본 앱 결제창이 "예정 가격" 으로 말하고 있는데
      여기서 "월 4,900원" 이라고 하면 두 화면이 서로 다른 말을 한다.

   ⚠️ 이미 플러스인 사람에겐 안 띄운다.
      낸 사람에게 또 사라고 하는 것만큼 기분 나쁜 게 없다.

   index.html 에서 plusmark.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var GOLD = "#B98A2E";

    function isPlus() {
        try { if (typeof window.isPremiumUser === "function") return !!window.isPremiumUser(); } catch (e) {}
        if (!localStorage.getItem("firebase_uid")) return false;
        return localStorage.getItem("tosil_is_founder") === "true"
            || localStorage.getItem("tosil_plan_cache") === "premium"
            || localStorage.getItem("tosil_is_master") === "true";
    }

    /* 잠긴 안내는 전부 금색 상자(#FFF9E6)에 'PLUS' 라는 글자가 들어 있다.
       그 상자를 찾아 맨 아래에 문을 단다. */
    function boxes() {
        var out = [];
        var all = document.querySelectorAll('div[style*="FFF9E6"], div[style*="fff9e6"]');
        for (var i = 0; i < all.length; i++) {
            var t = all[i].textContent || "";
            if (t.indexOf("PLUS") === -1 && t.indexOf("플러스") === -1) continue;
            if (all[i].querySelector(".bnh-plus-go")) continue;
            out.push(all[i]);
        }
        return out;
    }

    function button() {
        var a = document.createElement("div");
        a.className = "bnh-plus-go";
        a.setAttribute("role", "button");
        a.setAttribute("tabindex", "0");
        a.style.cssText =
            "margin-top:14px; padding:14px; border-radius:13px; text-align:center; cursor:pointer; " +
            "background:" + GOLD + "; color:#FFFFFF; font-size:13.5px; font-weight:900; " +
            "letter-spacing:-0.3px; box-shadow:0 4px 12px rgba(185,138,46,0.22);";
        a.textContent = "플러스 보러 가기";

        var go = function () {
            /* 본 앱 안에서 열렸다면 그 자리에서 연다 */
            if (typeof window.openPlus === "function") { window.openPlus("curator"); return; }
            if (typeof window.showPaywall === "function") { window.showPaywall(); return; }
            location.href = "../index.html?go=plus";
        };

        a.addEventListener("click", go);
        a.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); }
        });
        return a;
    }

    function paint() {
        if (isPlus()) return;
        var list = boxes();
        for (var i = 0; i < list.length; i++) list[i].appendChild(button());
    }

    window.repaintPlusGate = paint;

    function boot() {
        setTimeout(paint, 600);
        setTimeout(paint, 1800);
        setTimeout(paint, 4000);

        /* 탭을 옮기거나 다시 그리면 상자가 새로 생긴다 */
        if (window.MutationObserver) {
            var t = null;
            new MutationObserver(function () {
                if (t) return;
                t = setTimeout(function () { t = null; paint(); }, 250);
            }).observe(document.body, { childList: true, subtree: true });
        }
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    /* 점검용 */
    window.plusGateDebug = function () {
        console.log("플러스 회원:", isPlus());
        console.log("잠긴 안내 상자:", boxes().length + "개");
        console.log("달린 문:", document.querySelectorAll(".bnh-plus-go").length + "개");
    };
})();