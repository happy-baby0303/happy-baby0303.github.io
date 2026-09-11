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

    /* ---------- 잠긴 걸 눌렀을 때 ----------
       \u26a0\ufe0f alert 은 쓰지 않는다. 돈 받는 물건 앞에서 브라우저 기본 창이 뜨면
          그 순간 앱이 싸 보인다.

       \u26a0\ufe0f "대신 짜드리는 것뿐이에요" 같은 말은 안 쓴다.
          자기 상품을 깎는 말이다. 무료가 넉넉하다는 건 그대로 말하되,
          PLUS 가 뭘 덜어주는지는 당당하게 말한다.

       \u26a0\ufe0f 겁주지 않는다. "안 사면 손해" 가 아니라
          "이건 손이 많이 가는 일인데 대신 해드린다" 다. -------- */

    function babyName() {
        try { return localStorage.getItem("tosil_babyName") || "우리 아기"; } catch (e) { return "우리 아기"; }
    }
    function nm(j) {
        try { if (typeof window.babyNm === "function") return window.babyNm(j); } catch (e) {}
        var n = babyName(), c = n.charCodeAt(n.length - 1);
        var jong = (c >= 0xAC00 && c <= 0xD7A3) && ((c - 0xAC00) % 28 !== 0);
        return n + (jong ? "이" : "") + (j || "");
    }

    window.closeFoodPaywall = function () {
        var m = document.getElementById("food-paywall");
        var c = document.getElementById("food-paywall-card");
        if (c) c.style.transform = "translateY(100%)";
        setTimeout(function () { if (m) m.remove(); }, 280);
    };

    window.showFoodPaywall = function () {
        var old = document.getElementById("food-paywall");
        if (old) old.remove();

        var html =
        '<div id="food-paywall" style="position:fixed; inset:0; background:rgba(0,0,0,0.55); ' +
            'z-index:100060; display:flex; align-items:flex-end; justify-content:center;">' +
          '<div id="food-paywall-card" style="background:#FFFFFF; width:100%; max-width:480px; ' +
              'border-radius:24px 24px 0 0; padding:26px 22px calc(30px + env(safe-area-inset-bottom,0px)); ' +
              'transform:translateY(100%); transition:transform .28s ease-out;">' +

            '<div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">' +
              '<div style="min-width:0;">' +
                '<span style="display:inline-block; padding:4px 9px; border-radius:7px; ' +
                    'background:#FFF9E6; color:#8A6D00; font-size:10.5px; font-weight:900; ' +
                    'letter-spacing:0.4px;">PLUS</span>' +
                '<div style="margin-top:9px; font-size:19px; font-weight:900; color:#191F28; ' +
                    'letter-spacing:-0.4px; line-height:1.35; word-break:keep-all;">' +
                    '일주일 식단, 짜보신 적 있으세요?</div>' +
              '</div>' +
              '<span onclick="window.closeFoodPaywall()" style="flex-shrink:0; font-size:26px; ' +
                  'font-weight:300; color:#8B95A1; cursor:pointer; line-height:1; padding:0 4px;">&times;</span>' +
            '</div>' +

            '<div style="margin-top:11px; font-size:13.5px; font-weight:600; color:#4E5968; ' +
                'line-height:1.8; word-break:keep-all;">' +
                '아직 안 먹여본 재료를 고르고, 알레르기 테스트를 사흘씩 하고, ' +
                '겹치지 않게 일주일 식단표를 만드는 일.<br>' +
                '<b>배냇함이 도와드릴게요.</b></div>' +

            '<div style="margin-top:16px; background:#F9FAFB; border:1px solid #E5E8EB; ' +
                'border-radius:14px; padding:15px 16px; font-size:12.5px; font-weight:600; ' +
                'color:#4E5968; line-height:1.9; word-break:keep-all;">' +
                '\u00b7 ' + esc(nm("의")) + ' 개월수에 맞춰 <b>일주일치를 한 번에</b><br>' +
                '\u00b7 새 재료끼리 겹치지 않게 <b>테스트 날짜를 띄워서</b><br>' +
                '\u00b7 <b>장 볼 목록</b>도 같이 \u2014 마트에서 몇 개 사면 되는지<br>' +
                '\u00b7 <b>이번 주 영양</b>은 어땠는지 한눈에' +
            '</div>' +

            '<div style="margin-top:14px; font-size:12.5px; font-weight:600; color:#8B95A1; ' +
                'line-height:1.75; word-break:keep-all;">' +
                '<b style="color:#4E5968;">레시피 135종과 알레르기 기록은 계속 무료예요.</b><br>' +
                '뭘 먹일지 고르는 건 원래 열려 있습니다.</div>' +

            '<div onclick="window.closeFoodPaywall(); window.openPremiumModal && window.openPremiumModal();" ' +
                'style="margin-top:20px; text-align:center; padding:17px; background:#191F28; ' +
                'color:#FFFFFF; border-radius:14px; font-size:15.5px; font-weight:900; cursor:pointer;">' +
                'PLUS 둘러보기</div>' +
            '<div onclick="window.closeFoodPaywall()" style="margin-top:10px; text-align:center; ' +
                'padding:13px; font-size:13px; font-weight:800; color:#8B95A1; cursor:pointer;">' +
                '나중에 볼게요</div>' +
          '</div>' +
        '</div>';

        document.body.insertAdjacentHTML("beforeend", html);
        setTimeout(function () {
            var c = document.getElementById("food-paywall-card");
            if (c) c.style.transform = "translateY(0)";
        }, 10);

        var wrap = document.getElementById("food-paywall");
        if (wrap) wrap.onclick = function (e) { if (e.target === wrap) window.closeFoodPaywall(); };
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