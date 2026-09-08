/* ============================================================
   배냇함 — 목욕 장난감 곰팡이 (bathmold.js)

   93종 중에 물이 들어가는 장난감이 18개다.
   그런데 곰팡이 경고가 붙은 건 딱 하나(그로미미 물총)뿐이었다.

   물총·분수·폭포수·오리는 안쪽에 물이 고인다.
   말리지 않으면 며칠 만에 속이 새까매지고,
   아기는 그걸 입에 문다. 흔한 일이고, 아무도 안 알려준다.

   그래서 두 가지를 한다.
     1. 목욕 장난감 카드에 '구멍이 있으면 이렇게' 안내를 붙인다
     2. 마지막으로 씻긴 날을 세어 2주가 넘으면 알려준다

   ⚠️ 이건 안전이라 무료다. PLUS 로 잠그지 않는다.
   ⚠️ 파는 걸 막는 안내이기도 하다. 그래도 넣는 게 맞다.

   index.html 에서 app.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var KEY = "tosil_bathtoy_washed";
    var ID = "bath-mold";
    var GRAY = "#8B95A1", DARK = "#191F28", RED = "#C62828", GREEN = "#1F9D6B";

    /* 물이 안에 고이는 것들. 이름으로 고른다. */
    var WET = /물총|분수|폭포|수도꼭지|버블크랩|물놀이 세트|아쿠아플레이|욕조|목욕 인형|바스볼/;
    /* 구멍이 없거나 물이 안 고이는 쪽 — 여기 걸리면 경고를 안 붙인다.
       ⚠️ '오리' 만 보면 졸리점퍼(문틀)나 오볼(그물망)까지 잡힌다. 이름을 좁게 쓴다. */
    var SAFE = /실리콘|매트|타월|크레용|스티커|온도계|의자|클렌저|점퍼|오볼|타월|시트/;

    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    function toys() {
        try { if (typeof toyData !== "undefined" && toyData) return toyData; } catch (e) {}
        return window.toyData || [];
    }

    function mine() {
        try { return JSON.parse(localStorage.getItem("tosil_my_toys")) || []; } catch (e) { return []; }
    }

    function washedOn() { return localStorage.getItem(KEY) || ""; }

    function daysSince(day) {
        if (!day) return null;
        var p = String(day).split("-").map(Number);
        if (p.length !== 3) return null;
        var d = new Date(p[0], p[1] - 1, p[2]); d.setHours(0, 0, 0, 0);
        var t = new Date(); t.setHours(0, 0, 0, 0);
        return Math.floor((t - d) / 86400000);
    }

    window.markBathWashed = function () {
        var t = new Date();
        var k = t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") +
                "-" + String(t.getDate()).padStart(2, "0");
        try { localStorage.setItem(KEY, k); } catch (e) {}
        paint();
    };

    /* 내가 가진 것 중 물 고이는 장난감 */
    function myWet() {
        var have = mine();
        return toys().filter(function (t) {
            if (have.indexOf(t.id) === -1) return false;
            return WET.test(t.name) && !SAFE.test(t.name);
        });
    }

    /* ---------- 카드 ---------- */

    function html() {
        var list = myWet();
        var d = daysSince(washedOn());
        var over = (d === null) || d >= 14;

        var names = list.slice(0, 4).map(function (t) { return t.name; }).join(" · ");

        return '<div id="' + ID + '" style="background:' + (over ? "#FFF2F2" : "#EAF7F1") + '; ' +
            'border:1px solid ' + (over ? "#FCA5A5" : "#A7DFC8") + '; border-radius:16px; ' +
            'padding:16px; margin-bottom:14px;">' +

            '<div style="font-size:14px; font-weight:900; color:' + (over ? RED : GREEN) + '; ' +
                'margin-bottom:6px;">' +
                (over ? "🦠 목욕 장난감 속을 볼 때가 됐어요" : "✅ 목욕 장난감 씻긴 지 " + d + "일") + '</div>' +

            '<div style="font-size:12.5px; font-weight:600; color:#4E5968; ' +
                'line-height:1.75; word-break:keep-all;">' +
                (over
                    ? '물총·분수·오리처럼 <b>안에 구멍이 있는 것</b>은 며칠만 지나도 속이 새까매집니다. ' +
                      '겉은 멀쩡해 보여도요. 아기가 그걸 입에 뭅니다.'
                    : '2주에 한 번씩만 봐주시면 됩니다.') +
                (list.length ? '<br><br><b>가지고 계신 것</b> · ' + esc(names) +
                    (list.length > 4 ? ' 외 ' + (list.length - 4) + '개' : '') : '') +
            '</div>' +

            (over
                ? '<div style="background:#FFFFFF; border-radius:12px; padding:13px 14px; margin-top:12px; ' +
                  'font-size:12px; font-weight:600; color:#4E5968; line-height:1.8;">' +
                  '① 구멍을 <b>손으로 꾹 눌러 물을 다 빼세요</b><br>' +
                  '② 따뜻한 물 1L + 식초 한 큰술에 <b>30분</b> 담가둡니다<br>' +
                  '③ 헹구고 <b>구멍이 아래로 가게</b> 세워서 완전히 말립니다<br>' +
                  '④ 흔들었을 때 <b>속에서 물소리가 나면</b> 아직 덜 마른 겁니다<br>' +
                  '⑤ 속이 이미 까매졌으면 <b>버리세요.</b> 닦아서 될 일이 아닙니다' +
                  '</div>'
                : '') +

            '<div onclick="window.markBathWashed()" style="margin-top:12px; text-align:center; ' +
                'padding:13px; background:' + DARK + '; color:#FFFFFF; border-radius:12px; ' +
                'font-size:13.5px; font-weight:900; cursor:pointer;">오늘 씻겼어요</div>' +

            '<div style="font-size:11px; font-weight:600; color:' + GRAY + '; ' +
                'margin-top:9px; line-height:1.6;">' +
                '살 때 <b>구멍이 없거나 열리는 것</b>을 고르면 이 일이 없어집니다.</div>' +
        '</div>';
    }

    function paint() {
        var old = document.getElementById(ID);
        if (!myWet().length) { if (old) old.remove(); return; }

        var box = document.createElement("div");
        box.innerHTML = html();
        if (old) { old.parentNode.replaceChild(box.firstChild, old); return; }

        // 장난감 추천 탭 맨 위
        var host = document.getElementById("view-toy-gear");
        if (!host) return;
        host.insertBefore(box.firstChild, host.firstChild);
    }

    /* ---------- 목욕 장난감 카드에 한 줄 붙이기 ---------- */

    function markCards() {
        toys().forEach(function (t) {
            if (!WET.test(t.name) || SAFE.test(t.name)) return;
            var card = document.getElementById("toy-card-" + t.id);
            if (!card || card.querySelector(".mold-note")) return;

            var d = document.createElement("div");
            d.className = "mold-note";
            d.style.cssText =
                "background:#FFF9E6; border:1px solid #FDE68A; border-radius:11px; " +
                "padding:11px 13px; margin-bottom:12px; font-size:12px; font-weight:700; " +
                "color:#8A6D00; line-height:1.65;";
            d.innerHTML = "🦠 <b>안에 구멍이 있으면 물이 고입니다.</b> 쓰고 나서 물을 빼고 " +
                          "구멍이 아래로 가게 말리세요. 2주에 한 번은 식초물에 담가 주시고요.";
            card.insertBefore(d, card.firstChild);
        });
    }

    function boot() {
        setTimeout(function () { paint(); markCards(); }, 400);
        setTimeout(function () { paint(); markCards(); }, 1400);

        ["updateToyView", "renderFavorites", "switchToyMainTab", "closeShelfSheet"].forEach(function (n) {
            var f = window[n];
            if (typeof f !== "function" || f.__mold) return;
            var w = function () {
                var o = f.apply(this, arguments);
                setTimeout(function () { paint(); markCards(); }, 80);
                return o;
            };
            w.__mold = true;
            window[n] = w;
        });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    window.bathMoldDebug = function () {
        var list = myWet();
        console.log("물 고이는 장난감(전체):",
            toys().filter(function (t) { return WET.test(t.name) && !SAFE.test(t.name); }).length + "개");
        console.log("그중 갖고 계신 것:", list.length + "개");
        list.forEach(function (t) { console.log("   " + t.name); });
        console.log("마지막 세척:", washedOn() || "기록 없음",
                    daysSince(washedOn()) === null ? "" : "(" + daysSince(washedOn()) + "일 전)");
        console.log("카드에 붙은 안내:", document.querySelectorAll(".mold-note").length + "개");
    };
})();