/* ============================================================
   배냇함 — 곧 열리는 편지 (sealsoon.js)

   봉인 편지는 좋은 기획인데, 지금은 한 번도 열리는 걸 못 본다.

       첫 생일 · 다섯 살 · 초등학교 입학 · 열 살 · 스무 살

   제일 가까운 게 첫 생일이고, 그마저 몇백 일 뒤다.
   "7,138일 뒤에 열립니다" 는 처음엔 뭉클하지만
   두 번째부터는 그냥 안 열리는 서랍이 된다.

   도파민은 '쓸 때' 가 아니라 '열릴 때' 온다.
   한 번이라도 열려봐야 다음 편지를 진심으로 쓴다.

   그래서 짧은 자리를 만든다.

       백일 · 이백일 · 첫 명절 · 첫 어린이날 · 첫 크리스마스

   생후 30일에 쓰면 70일 뒤에 앱이 열어준다.
   그게 이 기능이 살아있다는 증거가 된다.

   ⚠️ 새로 만드는 게 거의 없다.
      anniversaries.js 가 백일·첫 명절을 이미 전부 계산해두었고,
      sealed.js 가 봉인·개봉·동기화를 이미 다 한다.
      둘을 잇기만 한다.

   ⚠️ 이미 지난 날짜는 고를 수 없게 한다.
      어제 열리는 편지를 쓰면 쓰자마자 열린다. 그건 편지가 아니다.

   index.html 에서 sealed.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var GOLD = "#B98A2E";
    var DAY  = 86400000;

    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    function babyName() { return localStorage.getItem("tosil_babyName") || "우리 아기"; }
    function comma(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }

    function fromKey(k) {
        var p = String(k).split("-");
        return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    }

    function todayStart() {
        var d = new Date(); d.setHours(0, 0, 0, 0);
        return d;
    }

    function daysLeft(k) {
        return Math.round((fromKey(k).getTime() - todayStart().getTime()) / DAY);
    }

    /* ==========================================================
       가까운 기념일을 편지 받는 자리로 바꾼다
       ========================================================== */

    // 라벨마다 '누구에게' 를 정해준다. sealed.js 의 to 자리에 들어간다.
    var TO = {
        "백일":          "백일을 맞은",
        "이백일":        "이백일을 지난",
        "삼백일":        "삼백일을 지난",
        "첫 설날":       "처음 설을 맞은",
        "첫 추석":       "처음 한가위를 맞은",
        "첫 크리스마스": "첫 크리스마스를 맞은",
        "첫 어린이날":   "첫 어린이날을 맞은",
        "오십일":        "쉰 밤을 지난"
    };

    window.sealSoonPresets = function () {
        if (typeof window.anniversaryDays !== "function" ||
            typeof window.anniversariesOn !== "function") return [];

        /* anniversaryDays() 는 '지나온 날' 만 준다.
           우리는 앞으로 올 날이 필요하니 표를 직접 훑는다. */
        var out = [];
        var seen = {};

        // 앞으로 400일 안에 오는 기념일을 모은다
        var base = todayStart();
        for (var i = 1; i <= 400; i++) {
            var d = new Date(base.getTime() + i * DAY);
            var key = d.getFullYear() + "-" +
                      String(d.getMonth() + 1).padStart(2, "0") + "-" +
                      String(d.getDate()).padStart(2, "0");

            var list = window.anniversariesOn(key) || [];
            for (var j = 0; j < list.length; j++) {
                var label = list[j].label;
                if (!TO[label] || seen[label]) continue;
                seen[label] = 1;
                out.push({ label: label, to: TO[label], at: key, left: i });
            }
        }

        out.sort(function (a, b) { return a.left - b.left; });
        return out.slice(0, 4);          // 넷이면 충분하다. 많으면 고민이 된다
    };

    /* ==========================================================
       sealed.js 의 고르는 칸에 얹는다
       ========================================================== */

    (function hookPresets() {
        var orig = window.sealPresets;
        if (typeof orig !== "function" || orig.__soon) return;

        var wrapped = function () {
            var far = [];
            try { far = orig.apply(this, arguments) || []; } catch (e) {}

            /* 가까운 것을 앞에 놓는다.
               맨 위에 스무 살이 있으면 다들 스무 살을 고르고,
               그러면 아무도 편지가 열리는 걸 못 본다. */
            var soon = window.sealSoonPresets();
            return soon.concat(far);
        };
        wrapped.__soon = true;
        window.sealPresets = wrapped;
    })();

    /* ==========================================================
       열린 편지를 홈에서 알린다
       ---------------------------------------------------------
       sealed.js 는 배냇함 안에서만 알린다.
       그런데 편지가 열리는 날은 앱을 안 열 수도 있는 날이다.
       홈 맨 위에 놓아야 그날 본다.
       ========================================================== */

    var CARD = "home-seal-open";

    function openedNow() {
        if (typeof window.sealedLetters !== "function") return [];
        var list = [];
        try { list = window.sealedLetters() || []; } catch (e) { return []; }
        return list.filter(function (l) {
            return l && !l.opened && daysLeft(l.openAt) <= 0;
        });
    }

    function cardHTML(list) {
        var one = list[0];
        var more = list.length > 1 ? " 외 " + (list.length - 1) + "통" : "";

        return '<div id="' + CARD + '" onclick="window.goOpenSealed()" ' +
            'style="display:flex; align-items:center; gap:13px; ' +
            'background:linear-gradient(135deg, rgba(185,138,46,0.16), rgba(185,138,46,0.04)); ' +
            'border:1px solid rgba(185,138,46,0.32); border-radius:22px; ' +
            'padding:16px; margin-bottom:24px; cursor:pointer;">' +

            '<div style="font-size:26px; flex-shrink:0;">🕯️</div>' +

            '<div style="flex:1; min-width:0;">' +
                '<div style="font-size:10px; font-weight:900; color:' + GOLD + '; ' +
                    'letter-spacing:1.6px; margin-bottom:5px;">봉인이 풀렸어요</div>' +
                '<div style="font-size:15px; font-weight:800; color:var(--text-m); ' +
                    'letter-spacing:-0.3px; word-break:keep-all; line-height:1.4;">' +
                    esc(one.label || "편지") + '에 열리는 편지가 도착했어요' + esc(more) + '</div>' +
                '<div style="font-size:11.5px; font-weight:700; color:var(--text-sub); margin-top:4px;">' +
                    comma(Math.max(0, Math.round((Date.now() - (one.ts || Date.now())) / DAY))) +
                    '일 전에 ' + esc(one.who || "부모님") + '가 남긴 편지예요</div>' +
            '</div>' +

            '<div style="font-size:12px; color:' + GOLD + '; flex-shrink:0;">〉</div>' +
        '</div>';
    }

    window.goOpenSealed = function () {
        if (typeof window.openSealedBox === "function") {
            try { return window.openSealedBox(); } catch (e) {}
        }
        if (typeof window.goToMemoryBox === "function") window.goToMemoryBox();
    };

    function mount() {
        var old = document.getElementById(CARD);
        var list = openedNow();

        if (!list.length) { if (old) old.remove(); return; }

        var anchor = document.getElementById("baby-dashboard") ||
                     document.getElementById("now-status-card");
        if (!anchor) return;

        var home = document.getElementById("tab-home");
        var block = anchor;
        while (block && block.parentNode && block.parentNode !== home) block = block.parentNode;
        if (!block || block.parentNode !== home) block = anchor;

        var box = document.createElement("div");
        box.innerHTML = cardHTML(list);
        var el = box.firstChild;

        if (old) old.parentNode.replaceChild(el, old);
        else block.parentNode.insertBefore(el, block.nextSibling);
    }

    window.refreshSealOpenCard = mount;

    /* ---------- 시작 ---------- */

    function boot() {
        // sealed.js 가 먼저 자리를 잡아야 감쌀 게 생긴다
        var n = 0;
        var t = setInterval(function () {
            if (typeof window.sealPresets === "function" && window.sealPresets.__soon) {
                clearInterval(t);
            } else if (++n > 25) {
                clearInterval(t);
            }
        }, 200);

        setTimeout(mount, 2000);
        setTimeout(mount, 5000);
        setInterval(mount, 10 * 60000);

        document.addEventListener("visibilitychange", function () {
            if (!document.hidden) setTimeout(mount, 600);
        });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    /* ---------- 점검용 ---------- */
    window.sealSoonDebug = function () {
        var soon = window.sealSoonPresets();
        console.log("가까운 편지 자리:", soon.length + "개");
        soon.forEach(function (p) {
            console.log("  " + p.label + "  " + p.at + "  D-" + p.left);
        });
        var far = [];
        try {
            var o = window.sealPresets;
            far = (o && o.__soon) ? o() : [];
        } catch (e) {}
        console.log("고르는 칸에 뜨는 순서:", far.map(function (x) { return x.label; }).join(" · "));
        console.log("지금 열린 편지:", openedNow().length + "통");
        console.log("홈 카드:", !!document.getElementById(CARD));
    };
})();