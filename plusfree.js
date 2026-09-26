/* ============================================================
   배냇함 — 출시 기념 무료 개방 (plusfree.js)

   구글은 앱 안에서 파는 디지털 상품에 구글 결제를 강제한다.
   그래서 출시 때는 PLUS 결제를 붙이지 않기로 했다.

   문제는 그다음이다.
   결제가 없으니 PLUS 기능을 잠가두면 아무도 못 쓰는 기능이 되고,
   그냥 열어두면 나중에 유료로 바꿀 때 '빼앗겼다' 가 된다.

   세 달 쓰던 사람이 어느 날 자물쇠를 보면 그건 기능 제한이 아니라
   빼앗김이다. 리뷰에 그대로 적힌다.

   그래서 처음부터 말해둔다.

       "지금은 출시 기념으로 모두 열려 있어요"

   처음부터 한정된 것이면 나중에 닫혀도 약속을 지킨 게 된다.

   ⚠️ 약속은 셋이고, 지킬 수 있는 것만 적는다.
      1. 유료로 바꾸기 30일 전에 미리 알린다
      2. 무료 기간에 만든 기록은 계속 볼 수 있다
      3. 안전에 걸리는 정보는 유료로 바꾸지 않는다

   ⚠️ 날짜 한 줄만 고치면 된다. 아래 UNTIL 을 바꾸세요.
      기간이 지나면 자동으로 원래 규칙(결제한 사람만 PLUS)으로 돌아간다.

   index.html 에서 premium.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    /* ---------- 여기만 고치면 된다 ----------
       출시 예정 2026-10-16 기준으로 60일.
       심사가 밀려 출시가 늦어지면 이 날짜를 다시 잡으세요.
       ⚠️ 날짜를 못 고치고 지나가도 앱이 알아서 예고하고 닫습니다. 아래 참조. */
    var UNTIL     = "2026-12-15";    // 이 날까지 모두 열림 (이 날 포함)
    var ON        = true;            // false 로 두면 무료 개방을 끈다
    var MIN_DAYS  = 14;              // 늦게 깐 사람도 최소 이만큼은 써본다
    var NOTICE    = 30;              // 끝나기 며칠 전부터 예고할지 (약속한 값)
    /* --------------------------------------- */

    var KEY = "tosil_free_open_until";
    var CARD = "plusfree-card";
    var GOLD = "#B98A2E";

    /* ⚠️ 출시 막바지에 깐 사람은 이틀 쓰고 닫히게 된다. 그건 약속이 아니라 미끼다.
          처음 켠 날을 적어두고, 누구나 최소 MIN_DAYS 는 써보게 한다. */
    function firstRun() {
        var k = "tosil_first_open";
        var v = null;
        try {
            v = localStorage.getItem(k);
            if (!v) { v = String(Date.now()); localStorage.setItem(k, v); }
        } catch (e) {}
        return Number(v) || Date.now();
    }

    function endAt() {
        var fixed = new Date(UNTIL + "T23:59:59").getTime();
        var mine  = firstRun() + MIN_DAYS * 86400000;
        return Math.max(isNaN(fixed) ? 0 : fixed, mine);
    }

    function freeOpen() {
        if (!ON) return false;
        return Date.now() <= endAt();
    }
    window.isFreeOpen = freeOpen;

    function daysLeft() {
        return Math.max(0, Math.ceil((endAt() - Date.now()) / 86400000));
    }

    function pretty(k) {
        var p = String(k).split("-");
        return p.length === 3 ? (Number(p[0]) + "년 " + Number(p[1]) + "월 " + Number(p[2]) + "일") : k;
    }

    /* 큐레이터는 별도 페이지라 이 파일이 없다. 날짜를 남겨두면 그쪽도 읽는다. */
    try {
        if (freeOpen()) localStorage.setItem(KEY, UNTIL);
        else localStorage.removeItem(KEY);
    } catch (e) {}

    /* ---------- 무료 기간에는 모두 PLUS ----------
       ⚠️ 진짜 결제 여부는 지우지 않는다. isRealPremium() 으로 남겨둔다.
          나중에 유료로 바꿀 때 '누가 실제로 냈는지' 를 알아야 한다. -------- */

    (function openGate() {
        var orig = window.isPremiumUser;
        if (typeof orig !== "function" || orig.__free) return;

        window.isRealPremium = function () {
            try { return !!orig.apply(this, arguments); } catch (e) { return false; }
        };

        var wrapped = function () {
            if (freeOpen()) return true;
            return window.isRealPremium();
        };
        wrapped.__free = true;
        window.isPremiumUser = wrapped;
    })();

    /* ---------- 결제 안내 시트 맨 위에 붙는 띠 ---------- */

    function banner() {
        if (!freeOpen()) return "";
        return '<div style="background:rgba(185,138,46,0.10); border:1px solid rgba(185,138,46,0.30); ' +
            'border-radius:14px; padding:14px 16px; margin-bottom:16px;">' +
            '<div style="font-size:13.5px; font-weight:900; color:' + GOLD + '; margin-bottom:4px;">' +
                '🎁 지금은 출시 기념으로 모두 열려 있어요</div>' +
            '<div style="font-size:12px; font-weight:700; color:' + GOLD + '; line-height:1.7; ' +
                'word-break:keep-all; opacity:0.92;">' +
                pretty(UNTIL) + '까지 PLUS 기능을 그냥 쓰실 수 있습니다. ' +
                '유료로 바뀔 때는 <b>30일 전에 미리</b> 알려드릴게요.</div>' +
        '</div>';
    }

    function paintSheetBanner() {
        if (!freeOpen()) return;
        /* 결제 안내 시트가 열릴 때마다 맨 위에 한 번 */
        var sheets = ["premium-sheet", "plus-sheet", "paywall-sheet", "premium-modal"];
        for (var i = 0; i < sheets.length; i++) {
            var el = document.getElementById(sheets[i]);
            if (!el || el.querySelector(".plusfree-banner")) continue;
            var host = el.querySelector("div") || el;
            var box = document.createElement("div");
            box.className = "plusfree-banner";
            box.innerHTML = banner();
            if (box.firstChild) host.insertBefore(box.firstChild, host.firstChild);
        }
    }

    /* ---------- 설정 탭의 'PLUS 안내' 칸 ---------- */

    function cardHTML() {
        var open = freeOpen();
        return '<div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">' +
                '<span style="font-size:19px;">' + (open ? "🎁" : "✨") + '</span>' +
                '<span style="font-size:15px; font-weight:900; color:var(--text-m);">PLUS 안내</span>' +
                (open
                    ? '<span style="margin-left:auto; font-size:11px; font-weight:900; color:' + GOLD + '; ' +
                      'background:rgba(185,138,46,0.12); padding:5px 10px; border-radius:9px;">무료 개방 중</span>'
                    : '') +
            '</div>' +

            (open
                ? '<div style="font-size:13px; font-weight:700; color:var(--text-m); line-height:1.75; ' +
                      'word-break:keep-all; margin-bottom:12px;">' +
                      '지금은 <b>출시 기념</b>으로 PLUS 기능이 모두 열려 있어요.<br>' +
                      pretty(UNTIL) + '까지 (' + daysLeft() + '일 남음)</div>'
                : '<div style="font-size:13px; font-weight:700; color:var(--text-m); line-height:1.75; ' +
                      'margin-bottom:12px;">PLUS 기능과 요금은 준비되는 대로 안내드릴게요.</div>') +

            '<div style="background:var(--bg-sub); border-radius:12px; padding:13px 15px; ' +
                'font-size:12.5px; font-weight:700; color:var(--text-s); line-height:1.9; word-break:keep-all;">' +
                '<div style="font-weight:900; color:var(--text-m); margin-bottom:5px;">유료로 바뀔 때 지킬 것</div>' +
                '· 바뀌기 <b>30일 전</b>에 앱에서 미리 알려드립니다<br>' +
                '· 무료 기간에 담은 <b>사진·소리·편지·기록은 계속 보실 수 있습니다</b><br>' +
                '· 해열제 간격, 응급 처치 같은 <b>안전 정보는 계속 무료</b>입니다' +
            '</div>';
    }

    function mountCard() {
        var host = document.getElementById("tab-settings");
        if (!host) return;
        var old = document.getElementById(CARD);
        var box = old || document.createElement("div");
        if (!old) {
            box.id = CARD;
            box.style.cssText = "background:var(--bg-card); padding:18px 20px; border-radius:16px; " +
                "border:1px solid var(--border); margin-bottom:12px; box-sizing:border-box; width:100%;";
        }
        box.innerHTML = cardHTML();
        if (!old) host.appendChild(box);
    }
    window.refreshPlusFreeCard = mountCard;

    (function hookSettings() {
        var origin = window.renderSettingsTab;
        window.renderSettingsTab = function () {
            var out;
            if (typeof origin === "function") out = origin.apply(this, arguments);
            setTimeout(mountCard, 60);
            return out;
        };
    })();

    /* ---------- 30일 전 예고 · 끝난 뒤 인사 ----------
       ⚠️ 이건 사람이 기억해서 누르는 게 아니라 앱이 알아서 한다.
          "30일 전에 알려드린다" 를 약속해놓고 잊으면 그게 제일 나쁘다. -------- */

    var SEEN = "tosil_free_notice_seen";

    function noticeHTML(kind, n) {
        var end = freeOpen();
        return '<div id="plusfree-notice" style="display:flex; align-items:flex-start; gap:11px; ' +
            'background:rgba(185,138,46,0.10); border:1px solid rgba(185,138,46,0.28); ' +
            'border-radius:18px; padding:14px 16px; margin-bottom:20px;">' +
            '<span style="font-size:18px; flex-shrink:0; line-height:1.3;">' + (end ? "🎁" : "🙏") + '</span>' +
            '<div style="flex:1; min-width:0;">' +
                '<div style="font-size:13.5px; font-weight:900; color:' + GOLD + '; margin-bottom:3px;">' +
                    (end ? "PLUS 무료 개방이 " + n + "일 남았어요" : "출시 기념 무료 개방이 끝났어요") + '</div>' +
                '<div style="font-size:12px; font-weight:700; color:' + GOLD + '; line-height:1.7; ' +
                    'word-break:keep-all; opacity:0.92;">' +
                    (end
                        ? "지금까지 담으신 사진·소리·편지·기록은 <b>그 뒤에도 그대로 보실 수 있어요.</b>"
                        : "그동안 담으신 기록은 <b>그대로 있습니다.</b> 새로 만드는 기능만 PLUS로 바뀌었어요.") +
                '</div>' +
            '</div>' +
            '<div onclick="window.dismissFreeNotice()" style="font-size:17px; font-weight:300; ' +
                'color:' + GOLD + '; flex-shrink:0; cursor:pointer; padding:0 2px; line-height:1;">×</div>' +
        '</div>';
    }

    window.dismissFreeNotice = function () {
        try { localStorage.setItem(SEEN, new Date().toISOString().slice(0, 10)); } catch (e) {}
        var el = document.getElementById("plusfree-notice");
        if (el) el.remove();
    };

    function mountNotice() {
        if (!ON) return;
        var n = daysLeft();
        var ended = !freeOpen();
        if (!ended && n > NOTICE) return;                 // 아직 예고할 때가 아니다

        /* 닫으면 일주일은 안 뜬다. 매일 뜨면 그것도 성가시다. */
        try {
            var seen = localStorage.getItem(SEEN);
            if (seen && (Date.now() - new Date(seen + "T00:00:00").getTime()) < 7 * 86400000) return;
        } catch (e) {}
        if (document.getElementById("plusfree-notice")) return;

        var anchor = document.getElementById("home-month-gift") ||
                     document.getElementById("home-memory-card") ||
                     document.getElementById("now-status-card");
        if (!anchor || !anchor.parentNode) return;

        var box = document.createElement("div");
        box.innerHTML = noticeHTML(ended ? "end" : "soon", n);
        anchor.parentNode.insertBefore(box.firstChild, anchor);
    }
    window.refreshFreeNotice = mountNotice;

    /* ---------- 얼리버드 신청 잠재우기 ----------
       결제를 아직 안 붙였는데 '얼리버드 신청' 이 살아 있으면
       "승인되면 첫 1개월 무료" 같은, 지금 지킬 수 없는 약속이 다시 뜬다.
       무료 개방 중에는 그냥 닫는다. 기간이 끝나면 원래대로 돌아간다.
       ⚠️ 이 함수는 index.html 안에서 늦게 만들어진다. 생길 때까지 지켜본다. */
    (function calmEarlyBird() {
        var n = 0;
        var t = setInterval(function () {
            var orig = window.upgradeToEarlyBirdVIP;
            if (typeof orig === "function" && !orig.__free) {
                var w = function () {
                    if (freeOpen()) {
                        var el = document.getElementById("vip-modal-overlay");
                        if (el) el.style.display = "none";
                        if (typeof window.showToast === "function") {
                            window.showToast("지금은 모두 열려 있어요 🎁");
                        }
                        return;
                    }
                    return orig.apply(this, arguments);
                };
                w.__free = true;
                window.upgradeToEarlyBirdVIP = w;
                clearInterval(t);
                return;
            }
            if (++n > 25) clearInterval(t);
        }, 200);
    })();

    function boot() {
        setTimeout(mountNotice, 2200);
        setInterval(mountNotice, 30 * 60000);
        setTimeout(mountCard, 1800);
        if (window.MutationObserver) {
            var t = null;
            new MutationObserver(function () {
                if (t) return;
                t = setTimeout(function () { t = null; paintSheetBanner(); }, 300);
            }).observe(document.body, { childList: true, subtree: true });
        }
        setTimeout(paintSheetBanner, 1500);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    /* ---------- 점검용 ---------- */
    window.freeOpenDebug = function () {
        console.log("무료 개방:", freeOpen() ? "켜짐" : "꺼짐");
        console.log("종료일:", UNTIL, "· 남은 날:", daysLeft() + "일");
        console.log("이 사람이 실제로 결제했나:",
            (typeof window.isRealPremium === "function") ? window.isRealPremium() : "확인 불가");
        console.log("앱이 PLUS 로 보나:", window.isPremiumUser());
        console.log("설정 칸 붙음:", !!document.getElementById(CARD));
        console.log("큐레이터에 넘긴 날짜:", localStorage.getItem(KEY) || "없음");
    };
})();