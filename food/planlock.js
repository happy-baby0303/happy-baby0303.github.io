/* ============================================================
   배냇함 — 식단표 PLUS 잠금 (planlock.js)

   확인해보니 app.js 어디에도 isPremiumUser 도 showPaywall 도 없다.
   즉 지금은 무료 사용자도 7일 식단표를 그냥 쓴다.

   식단표는 이 큐레이터에서 제일 손이 많이 간 기능이고,
   "매번 고민하던 걸 대신 짜준다" 는 PLUS 의 값어치 그 자체다.
   그런데 잠겨 있지 않으면 아무도 결제할 이유가 없다.

   ⚠️ 잠그는 건 '수고' 지 '정보' 가 아니다.
      레시피 135종 · 알레르기 · 계량은 전부 무료 그대로다.
      대신 해주는 일곱 날 편성만 PLUS 다.

   index.html 에서 app.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var GRAY = "#8B95A1", DARK = "#191F28", GOLD = "#8A6D00";

    function isPlus() {
        try { if (typeof window.isPremiumUser === "function") return !!window.isPremiumUser(); } catch (e) {}
        if (!localStorage.getItem("firebase_uid")) return false;
        return localStorage.getItem("tosil_is_founder") === "true"
            || localStorage.getItem("tosil_plan_cache") === "premium"
            || localStorage.getItem("tosil_is_master")  === "true";
    }
    window.isFoodPlus = isPlus;

    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    window.showFoodPaywall = function () {
        alert("7일 식단표는 배냇함 PLUS 기능이에요.\n\n" +
              "레시피 135종과 알레르기 기록은 계속 무료로 쓰실 수 있습니다.\n" +
              "PLUS는 일주일치를 대신 짜드리는 것뿐이에요.\n\n" +
              "배냇함 앱 → 설정 → 플러스에서 볼 수 있습니다.");
    };

    /* ---------- 잠금 표시 ---------- */

    function lock() {
        var box = document.getElementById("autopilot-master-container");
        if (!box) return;

        var btn = box.querySelector("button, a, div[onclick]");
        // '식단표 자동 생성하기' 버튼 찾기
        var all = box.querySelectorAll("*");
        for (var i = 0; i < all.length; i++) {
            if ((all[i].textContent || "").indexOf("식단표 자동 생성") > -1 &&
                all[i].children.length === 0) { btn = all[i]; break; }
        }

        var plus = isPlus();
        var mark = box.querySelector(".plan-lock-mark");

        if (plus) {
            if (mark) mark.remove();
            box.removeAttribute("data-locked");
            return;
        }

        // 버튼을 가로채서 안내로 바꾼다
        if (btn && !btn.getAttribute("data-locked")) {
            btn.setAttribute("data-locked", "1");
            btn.textContent = "🔒 PLUS에서 짜드려요";
            btn.style.opacity = "0.85";
            btn.addEventListener("click", function (e) {
                e.preventDefault();
                e.stopPropagation();
                window.showFoodPaywall();
            }, true);
        }

        if (!mark) {
            var d = document.createElement("div");
            d.className = "plan-lock-mark";
            d.style.cssText =
                "background:rgba(255,255,255,0.10); border:1px solid rgba(255,255,255,0.22); " +
                "border-radius:12px; padding:13px 15px; margin-top:12px; cursor:pointer; " +
                "font-size:12.5px; font-weight:700; color:#E8C766; line-height:1.7; word-break:keep-all;";
            d.innerHTML = "🔒 <b>일주일치를 대신 짜드리는 건 PLUS예요.</b><br>" +
                          "레시피 135종과 알레르기 기록은 그대로 무료로 쓰실 수 있습니다.";
            d.onclick = window.showFoodPaywall;
            box.appendChild(d);
        }
        box.setAttribute("data-locked", "1");
    }

    /* ---------- 만들기 자체도 막는다 ----------
       버튼만 바꿔두면 다른 길로 함수를 부를 수 있다. -------- */

    function guard() {
        ["generatePremiumMealPlan", "renderAutoPilotUI", "applyPlanToCalendar"].forEach(function (n) {
            var f = window[n];
            if (typeof f !== "function" || f.__lock) return;
            var w = function () {
                if (!isPlus()) { window.showFoodPaywall(); return null; }
                return f.apply(this, arguments);
            };
            w.__lock = true;
            window[n] = w;
        });
    }

    function boot() {
        setTimeout(function () { guard(); lock(); }, 400);
        setTimeout(function () { guard(); lock(); }, 1400);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    window.planLockDebug = function () {
        console.log("PLUS:", isPlus());
        console.log("  firebase_uid:", !!localStorage.getItem("firebase_uid"));
        console.log("  plan_cache:", localStorage.getItem("tosil_plan_cache"));
        console.log("  founder:", localStorage.getItem("tosil_is_founder"));
        console.log("  master:", localStorage.getItem("tosil_is_master"));
        var box = document.getElementById("autopilot-master-container");
        console.log("잠김 표시:", box ? (box.getAttribute("data-locked") ? "🔒 잠김" : "열림") : "카드 없음");
    };
})();