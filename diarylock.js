/* ============================================================
   배냇함 — 육아문답 상호 잠금 (diarylock.js)

   썸원이 대박난 건 꾸미기 때문이 아니다.
   "내가 답했는데 얘는 왜 안 해" 가 매일 앱을 열게 만든다.

       내가 답함        → 짝꿍에게 알림
       짝꿍이 안 답함   → 나는 궁금해서 계속 들어옴
       짝꿍이 답함      → 나에게 알림 → 확인하러 들어옴

   한 질문이 앱 열기를 네 번 만든다. 지금은 한 번이다.

   \u26a0\ufe0f 내 답을 먼저 써야 짝꿍 답이 보인다.
      이게 없으면 '먼저 훔쳐보고 맞춰 쓰는' 일이 생긴다.
      그러면 속마음이 아니라 눈치가 된다.

   \u26a0\ufe0f 재촉은 하루 한 번만. 그 이상은 부부 사이를 상하게 한다.

   \u26a0\ufe0f 알림 문구에 이름을 앞세우지 않는다.
      "OOO님이 OOO을 요청합니다" 는 업무 알림이지 부부 사이 말이 아니다.

   diary.html 맨 아래, </body> 앞에 이 한 줄로 불러오세요.
     <script src="diarylock.js"></script>
   ============================================================ */
(function () {
    'use strict';

    var NUDGE_KEY = "tosil_diary_nudge";      // 마지막 재촉 날짜
    var GOLD = "#D48806", GRAY = "#8B95A1", INK = "#4A413C";

    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }
    function toast(m) {
        if (typeof window.showToast === "function") window.showToast(m);
        else console.log(m);
    }
    function today() {
        var t = new Date();
        return t.getFullYear() + "-" + (t.getMonth() + 1) + "-" + t.getDate();
    }
    function myRole() {
        return localStorage.getItem("tosil_userRole") || "husband";
    }
    function otherWord() {
        return myRole() === "husband" ? "엄마" : "아빠";
    }
    function babyName() {
        return localStorage.getItem("tosil_babyName") || "우리 아기";
    }

    /* ==========================================================
       1. 짝꿍 답 가리기 — 내가 먼저 써야 열린다
       ---------------------------------------------------------- */

    function lockCard(card, textEl, waiting) {
        if (!card || !textEl) return;
        if (!waiting) {
            card.style.filter = "";
            card.style.userSelect = "";
            var old = card.querySelector(".diary-lock-veil");
            if (old) old.remove();
            return;
        }
        /* 글자를 지우지 않고 흐리게만 한다.
           '있는데 아직 못 본다' 가 '없다' 보다 훨씬 궁금하다. */
        textEl.style.filter = "blur(7px)";
        textEl.style.userSelect = "none";
        textEl.style.pointerEvents = "none";
    }

    function nudgeBox(hasText) {
        var done = (localStorage.getItem(NUDGE_KEY) === today());
        return '<div class="diary-lock-veil" style="margin-top:14px; padding:16px; ' +
            'background:#FFF9E6; border:1px solid #F5E1A4; border-radius:14px; text-align:center;">' +
            '<div style="font-size:13.5px; font-weight:800; color:' + GOLD + '; ' +
                'line-height:1.7; word-break:keep-all;">' +
                (hasText
                    ? esc(otherWord()) + '가 먼저 썼어요.<br><b>내 답을 쓰면 열립니다.</b>'
                    : '아직 ' + esc(otherWord()) + '가 안 썼어요') + '</div>' +
            (hasText ? '' :
                '<div onclick="window.nudgeDiary()" style="margin-top:11px; padding:13px; ' +
                    'background:' + (done ? "#F2F4F6" : "#191F28") + '; ' +
                    'color:' + (done ? GRAY : "#FFFFFF") + '; border-radius:12px; ' +
                    'font-size:13px; font-weight:800; cursor:' + (done ? "default" : "pointer") + ';">' +
                    (done ? "오늘은 이미 보냈어요" : "\uD83D\uDC8C 오늘 물어봐 줄래요?") + '</div>') +
        '</div>';
    }

    /* renderCurrentCard 를 감싼다. 원래 코드는 안 건드린다. */
    function wrap() {
        var orig = window.renderCurrentCard;
        if (typeof orig !== "function" || orig.__locked) return false;

        var w = function (data, currentRole) {
            var r = orig.apply(this, arguments);
            try { applyLock(data || {}, currentRole || myRole()); } catch (e) {}
            return r;
        };
        w.__locked = true;
        window.renderCurrentCard = w;
        return true;
    }

    function applyLock(data, role) {
        var hText = data.husbandAns || "";
        var wText = data.wifeAns || "";
        var mine  = (role === "husband") ? hText : wText;
        var yours = (role === "husband") ? wText : hText;

        var yourCardId = (role === "husband") ? "view-wife-card" : "view-husband-card";
        var yourTextId = (role === "husband") ? "view-wife-text" : "view-husband-text";
        var card = document.getElementById(yourCardId);
        var textEl = document.getElementById(yourTextId);
        if (!card || !textEl) return;

        // 내가 아직 안 썼으면 잠금 자체를 안 건다 (입력 화면이라 카드가 안 보인다)
        if (!mine) { lockCard(card, textEl, false); return; }

        var old = card.querySelector(".diary-lock-veil");
        if (old) old.remove();

        if (yours) {
            lockCard(card, textEl, false);
            card.style.opacity = "1";
            return;
        }

        /* 짝꿍이 아직 안 썼다 — 재촉 상자 */
        lockCard(card, textEl, false);
        textEl.innerText = esc(otherWord()) + "의 마음이 아직 비어 있어요";
        card.style.opacity = "1";
        card.insertAdjacentHTML("beforeend", nudgeBox(false));
    }

    /* ==========================================================
       2. 재촉하기 — 하루 한 번
       ---------------------------------------------------------- */

    window.nudgeDiary = function () {
        if (localStorage.getItem(NUDGE_KEY) === today()) {
            toast("오늘은 이미 보냈어요. 기다려 볼까요");
            return;
        }
        var code = (window.getSyncCode ? window.getSyncCode() : null)
                || localStorage.getItem("family_sync_code");
        if (!code) { toast("짝꿍 연결이 안 돼 있어요"); return; }
        if (!window.functions || !window.httpsCallable) {
            toast("잠시 뒤 다시 눌러주세요");
            return;
        }

        var day = (typeof window.getCurrentDay === "function") ? window.getCurrentDay() : "";

        try {
            var fn = window.httpsCallable(window.functions, "sendFamilyPush");
            fn({
                syncCode: code,
                title: "\uD83D\uDC8C 오늘의 문답이 기다려요",
                body: day ? (day + "일차 질문에 한 사람만 답했어요") : "한 사람만 답했어요"
            }).catch(function (e) { console.warn("재촉 실패", e); });
            localStorage.setItem(NUDGE_KEY, today());
            toast("\uD83D\uDC8C 살짝 알려드렸어요");
            if (typeof window.refreshDiaryLock === "function") window.refreshDiaryLock();
        } catch (e) {
            toast("보내지 못했어요");
        }
    };

    /* ==========================================================
       3. 내가 답하면 짝꿍에게 알림
       ---------------------------------------------------------- */

    function hookSubmit() {
        var names = ["submitAnswer", "saveAnswer", "onSubmit"];
        for (var i = 0; i < names.length; i++) {
            var f = window[names[i]];
            if (typeof f !== "function" || f.__pushed) continue;
            (function (orig, nm) {
                var w = async function () {
                    var r = await orig.apply(this, arguments);
                    try { pushAfterAnswer(); } catch (e) {}
                    return r;
                };
                w.__pushed = true;
                window[nm] = w;
            })(f, names[i]);
        }
    }

    function pushAfterAnswer() {
        var code = (window.getSyncCode ? window.getSyncCode() : null)
                || localStorage.getItem("family_sync_code");
        if (!code || !window.functions || !window.httpsCallable) return;

        var day = (typeof window.getCurrentDay === "function") ? window.getCurrentDay() : "";
        var me = (myRole() === "husband") ? "아빠" : "엄마";

        try {
            var fn = window.httpsCallable(window.functions, "sendFamilyPush");
            fn({
                syncCode: code,
                title: "\uD83D\uDCD6 " + me + "가 오늘의 답을 남겼어요",
                body: day ? (day + "일차 \u00b7 내 답을 쓰면 열립니다") : "내 답을 쓰면 열립니다"
            }).catch(function () {});
        } catch (e) {}
    }

    /* ==========================================================
       붙이기
       ---------------------------------------------------------- */

    function repaint() {
        try {
            var day = (typeof window.getCurrentDay === "function") ? window.getCurrentDay() : null;
            if (day === null) return;
            var raw = localStorage.getItem("day_" + day + "_data");
            var data = raw ? JSON.parse(raw) : {};
            applyLock(data, myRole());
        } catch (e) {}
    }
    window.refreshDiaryLock = repaint;

    function boot() {
        var n = 0;
        var t = setInterval(function () {
            var ok = wrap();
            hookSubmit();
            if (ok) repaint();
            if (++n > 30) clearInterval(t);
        }, 200);
        setTimeout(repaint, 900);
        setTimeout(repaint, 2200);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    window.diaryLockDebug = function () {
        var day = (typeof window.getCurrentDay === "function") ? window.getCurrentDay() : "?";
        var raw = localStorage.getItem("day_" + day + "_data");
        var d = {};
        try { d = raw ? JSON.parse(raw) : {}; } catch (e) {}
        console.log("문답 " + day + "일차 \u00b7 내 역할:", myRole());
        console.log("  아빠 답:", d.husbandAns ? "썼음" : "아직");
        console.log("  엄마 답:", d.wifeAns ? "썼음" : "아직");
        console.log("  오늘 재촉:", localStorage.getItem(NUDGE_KEY) === today() ? "보냄" : "아직");
        console.log("  renderCurrentCard 감쌌나:", !!(window.renderCurrentCard || {}).__locked);
    };
})();