/* ============================================================
   배냇함 — 장난감 수명 · 잠자는 장난감 (toylife.js)

   장난감에서 부모가 진짜 겪는 고통은 두 가지다.

       사기 전   "이거 얼마나 쓸까"
       사고 나서 "산 거 안 쓰고 있는데 그게 뭐였지"

   둘 다 답이 데이터 안에 이미 있다.
     · toyData.milestone      → 언제부터 언제까지 쓰는 물건인지
     · toyData.relatedPlayIds → 그 장난감으로 하는 놀이가 뭔지
     · tosil_play_log         → 그 놀이를 실제로 했는지
     · tosil_my_toys          → 갖고 있는지

   그래서 새로 넣을 데이터가 없다. 계산만 붙인다.

   ⚠️ 수명은 무료다. 사기 전 판단이고, '지금 사지 마세요' 는 신뢰다.
   ⚠️ 잠자는 장난감은 세는 게 수고라 목록·마지막 사용일이 PLUS다.
      숫자와 두 개까지는 무료로 보여준다. 빈 벽은 그냥 나가게 만든다.

   ⚠️ 기록이 거의 없을 때는 아예 안 띄운다.
      기록이 0이면 가진 것 전부가 '한 번도 안 씀' 이 된다. 그건 거짓말이다.

   index.html 에서 playlog.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var ID = "toy-idle";
    var GRAY = "#8B95A1", DARK = "#191F28", BLUE = "#3182F6";
    var GREEN = "#1F9D6B", GOLD = "#8A6D00", PURPLE = "#7F77DD";

    var IDLE_DAYS = 30;      // 이만큼 안 나왔으면 자고 있는 것으로 본다
    var MIN_LOGS  = 5;       // 기록이 이보다 적으면 판단하지 않는다
    var MIN_TOYS  = 3;       // 등록한 게 이보다 적으면 셀 것이 없다

    /* 시기 → 개월. app.js · playweek.js 와 같은 기준이어야 한다.
       끝이 null 인 것은 그 뒤로도 계속 쓰는 물건이다. */
    var RANGE = {
        newborn: [0, 1], tummy: [2, 3], flip: [4, 6],
        crawl: [7, 9], stand: [10, null], all: [0, null]
    };
    var MSNAME = {
        newborn: "신생아", tummy: "터미타임", flip: "뒤집기",
        crawl: "배밀이", stand: "잡고서기", all: "전 시기"
    };

    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }
    function babyName() { return localStorage.getItem("tosil_babyName") || "우리 아기"; }
    function nm(j) {
        try { if (typeof window.babyNm === "function") return window.babyNm(j); } catch (e) {}
        var n = babyName(), c = n.charCodeAt(n.length - 1);
        var jong = (c >= 0xAC00 && c <= 0xD7A3) && ((c - 0xAC00) % 28 !== 0);
        return n + (jong ? "이" : "") + (j || "");
    }

    function isPlus() {
        try { if (typeof window.isPremiumUser === "function") return !!window.isPremiumUser(); } catch (e) {}
        if (!localStorage.getItem("firebase_uid")) return false;
        return localStorage.getItem("tosil_is_founder") === "true"
            || localStorage.getItem("tosil_plan_cache") === "premium"
            || localStorage.getItem("tosil_is_master") === "true";
    }

    function toys() {
        try { if (typeof toyData !== "undefined" && toyData) return toyData; } catch (e) {}
        return window.toyData || [];
    }
    function mine() {
        try { return JSON.parse(localStorage.getItem("tosil_my_toys")) || []; } catch (e) { return []; }
    }
    function playLog() {
        try { return JSON.parse(localStorage.getItem("tosil_play_log")) || {}; } catch (e) { return {}; }
    }

    function monthsOld() {
        var s = localStorage.getItem("tosil_startDate");
        if (!s) return null;
        var p = String(s).split("-").map(Number);
        if (p.length !== 3) return null;
        var b = new Date(p[0], p[1] - 1, p[2]), t = new Date();
        var m = (t.getFullYear() - b.getFullYear()) * 12 + (t.getMonth() - b.getMonth());
        if (t.getDate() < b.getDate()) m--;
        return m < 0 ? 0 : m;
    }

    function daysSince(day) {
        if (!day) return null;
        var p = String(day).split("-").map(Number);
        if (p.length !== 3) return null;
        var d = new Date(p[0], p[1] - 1, p[2]); d.setHours(0, 0, 0, 0);
        var t = new Date(); t.setHours(0, 0, 0, 0);
        return Math.floor((t - d) / 86400000);
    }
    function prettyDay(k) {
        var p = String(k).split("-");
        return p.length === 3 ? (Number(p[1]) + "월 " + Number(p[2]) + "일") : k;
    }

    /* ---------- ① 장난감 수명 (무료) ---------- */

    /* 이 장난감을 언제부터 언제까지 쓰나 */
    function lifeOf(t) {
        var m = monthsOld();
        var r = RANGE[t.milestone] || RANGE.all;
        var from = r[0], to = r[1];

        if (t.milestone === "all") return { kind: "always" };
        if (m === null) return { kind: "unknown", from: from, to: to };

        if (to !== null && m > to) return { kind: "past", to: to, over: m - to };
        if (m < from) return { kind: "future", wait: from - m };
        return { kind: "now", left: (to === null ? null : to - m + 1) };
    }

    function lifeLine(t) {
        var L = lifeOf(t);
        var owned = mine().indexOf(t.id) > -1;

        if (L.kind === "always")
            return { c: GREEN, t: "시기를 안 타는 물건이에요. 오래 씁니다." };

        if (L.kind === "unknown")
            return { c: GRAY, t: MSNAME[t.milestone] + " 시기에 쓰는 물건이에요." };

        if (L.kind === "past")
            return owned
                ? { c: GRAY, t: "이 시기는 지나갔어요. 정리하거나 물려주기 좋을 때입니다." }
                : { c: GOLD, t: nm("는") + " 이 시기를 지났어요. 지금 사면 쓸 날이 얼마 없습니다." };

        if (L.kind === "future")
            return { c: GOLD, t: "약 " + L.wait + "개월 뒤부터 쓰는 물건이에요. " +
                                 "지금 사면 그동안 서랍에 있습니다." };

        return { c: BLUE, t: L.left
            ? "지금이 그때예요. 앞으로 약 " + L.left + "개월 씁니다."
            : "지금부터 쭉 쓰는 물건이에요." };
    }

    /* 카드마다 한 줄. ⚠️ 상자로 만들지 않는다. 93장에 상자가 붙으면 화면이 막힌다. */
    function markLife() {
        toys().forEach(function (t) {
            var card = document.getElementById("toy-card-" + t.id);
            if (!card) return;
            var old = card.querySelector(".life-note");
            if (old) old.parentNode.removeChild(old);

            var L = lifeLine(t);
            var d = document.createElement("div");
            d.className = "life-note";
            d.style.cssText =
                "font-size:12.5px; font-weight:800; color:" + L.c + "; " +
                "line-height:1.6; margin:-14px 0 18px; word-break:keep-all;";
            d.innerHTML = "\uD83D\uDD52 " + esc(L.t);

            /* 헤더(아이콘·이름·찜) 바로 다음 = 이름 밑에 붙는다 */
            if (card.children.length > 1) card.insertBefore(d, card.children[1]);
            else card.appendChild(d);
        });
    }
    window.refreshToyLife = markLife;

    /* ---------- ② 잠자는 장난감 (PLUS) ---------- */

    /* 그 장난감으로 하는 놀이를 마지막으로 한 날. 없으면 "" */
    function lastUsed(t) {
        var o = playLog(), rel = t.relatedPlayIds || [], best = "";
        Object.keys(o).forEach(function (k) {
            var did = (o[k] || []).some(function (pid) { return rel.indexOf(pid) > -1; });
            if (did && k > best) best = k;        // YYYY-MM-DD 라 문자열 비교로 충분
        });
        return best;
    }

    function totalLogs() {
        var o = playLog(), n = 0;
        Object.keys(o).forEach(function (k) { n += (o[k] || []).length; });
        return n;
    }

    function idleList() {
        var have = mine();
        return toys().filter(function (t) {
            if (have.indexOf(t.id) === -1) return false;
            if (!t.relatedPlayIds || !t.relatedPlayIds.length) return false;  // 판단 근거 없음

            /* ⚠️ 지금 쓸 수 있는 시기의 것만 센다.
                  아직 때가 안 된 건 자고 있는 게 아니라 기다리는 것이다.
                  4개월 아기한테 졸리점퍼(10개월+)를 '꺼내보세요' 라고 하면
                  헛소리일 뿐 아니라 위험하다.
                  시기가 지난 것도 뺀다. 이제 못 쓰는 걸 꺼내라고 할 수는 없다. */
            var k = lifeOf(t).kind;
            if (k !== "now" && k !== "always") return false;

            var last = lastUsed(t);
            if (!last) return true;                          // 한 번도 안 나옴
            return daysSince(last) >= IDLE_DAYS;
        }).map(function (t) {
            var last = lastUsed(t);
            return { toy: t, last: last, days: last ? daysSince(last) : null };
        }).sort(function (a, b) {
            if (a.days === null) return -1;
            if (b.days === null) return 1;
            return b.days - a.days;
        });
    }

    /* 가진 것 중 아직 때가 안 온 것 · 이미 지난 것 */
    function waitingCount() {
        var have = mine();
        var w = 0, p = 0;
        toys().forEach(function (t) {
            if (have.indexOf(t.id) === -1) return;
            var k = lifeOf(t).kind;
            if (k === "future") w++;
            else if (k === "past") p++;
        });
        return { wait: w, past: p };
    }

    /* playweek.js 가 toy_roi 로 짤 때 이걸 먼저 쓴다 */
    window.idleToyIds = function () {
        return idleList().map(function (x) { return x.toy.id; });
    };

    function row(x, blur) {
        var when = x.days === null ? "아직 한 번도 안 나왔어요"
                                   : prettyDay(x.last) + "이 마지막";
        return '<div style="display:flex; justify-content:space-between; align-items:center; ' +
            'gap:10px; padding:11px 0; border-bottom:1px solid #F2F4F6;">' +
            '<div style="flex:1; min-width:0; font-size:13px; font-weight:800; color:' + DARK + '; ' +
                'white-space:nowrap; overflow:hidden; text-overflow:ellipsis;' +
                (blur ? ' filter:blur(4px);' : '') + '">' + esc(x.toy.name) + '</div>' +
            '<div style="flex-shrink:0; font-size:11.5px; font-weight:700; color:' + GRAY + ';' +
                (blur ? ' filter:blur(4px);' : '') + '">' + esc(when) + '</div>' +
        '</div>';
    }

    function html() {
        var have = mine(), logs = totalLogs();

        /* ⚠️ 근거가 모자라면 아무 말도 안 한다.
              기록 없이 '12개 중 12개가 자고 있어요' 라고 하면 그건 헛소리다. */
        if (have.length < MIN_TOYS || logs < MIN_LOGS) return "";

        var list = idleList();
        var wc = waitingCount();
        var side = [];
        if (wc.wait) side.push("아직 때가 안 된 것 " + wc.wait + "개");
        if (wc.past) side.push("시기가 지난 것 " + wc.past + "개");
        var sideLine = side.length
            ? '<div style="margin-top:11px; font-size:11.5px; font-weight:700; color:' + GRAY + '; ' +
              'line-height:1.6;">' + side.join(" \u00b7 ") + '는 빼고 셌어요</div>'
            : '';

        if (!list.length) {
            return '<div id="' + ID + '" style="background:#EAF7F1; border:1px solid #A7DFC8; ' +
                'border-radius:18px; padding:17px 18px; margin-bottom:14px;">' +
                '<div style="font-size:13.5px; font-weight:900; color:#1F6F52;">' +
                    '\u2705 사두신 것 ' + have.length + '개, 다 쓰고 계세요</div>' +
                '<div style="margin-top:5px; font-size:12.5px; font-weight:600; color:#4E5968; ' +
                    'line-height:1.7; word-break:keep-all;">' +
                    '한 달 안에 전부 한 번씩은 나왔어요. 이거 쉬운 일 아닙니다.</div>' +
                sideLine +
            '</div>';
        }

        var plus = isPlus();
        var show = plus ? list : list.slice(0, 2);
        var hidden = plus ? 0 : list.length - show.length;

        return '<div id="' + ID + '" style="background: #FFFFFF; border:1px solid #E5E8EB; ' +
            'border-radius:18px; padding:18px; margin-bottom:14px;">' +

            '<div data-plus-head style="font-size:14.5px; font-weight:900; color:' + DARK + ';">' +
                '\uD83D\uDE34 잠자고 있는 장난감 ' + list.length + '개</div>' +
            '<div style="margin-top:5px; font-size:12.5px; font-weight:600; color:' + GRAY + '; ' +
                'line-height:1.7; word-break:keep-all;">' +
                '등록하신 ' + have.length + '개 중 ' + list.length + '개가 한 달 넘게 안 나왔어요. ' +
                '새로 사기 전에 이것부터 꺼내보세요.</div>' +
            sideLine +

            '<div style="margin-top:13px;">' +
                show.map(function (x) { return row(x, false); }).join("") +
                (hidden > 0
                    ? list.slice(2, 4).map(function (x) { return row(x, true); }).join("")
                    : "") +
            '</div>' +

            (plus
                ? '<div onclick="window.planWithIdleToys()" style="margin-top:14px; text-align:center; ' +
                  'padding:15px; background:' + DARK + '; color:#FFFFFF; border-radius:13px; ' +
                  'font-size:13.5px; font-weight:900; cursor:pointer;">' +
                  '이걸로 다음 주 처방전 짜기</div>'

                : '<div style="margin-top:14px; background:#FFF9E6; border:1px solid #FDE68A; ' +
                  'border-radius:13px; padding:15px 16px;">' +
                  '<div style="font-size:13px; font-weight:900; color:' + GOLD + ';">' +
                      (hidden > 0 ? '나머지 ' + hidden + '개는 PLUS에서 보여요'
                                  : 'PLUS면 이걸로 다음 주를 짜드려요') + '</div>' +
                  '<div style="margin-top:5px; font-size:12px; font-weight:600; color:' + GOLD + '; ' +
                      'line-height:1.7; word-break:keep-all;">' +
                      '잠자는 것들을 앞으로 당겨서 일곱 날을 통째로 짭니다.</div></div>') +
        '</div>';
    }

    /* PLUS 버튼 — 장난감 되살리기 목표로 다음 주를 짠다 */
    window.planWithIdleToys = function () {
        if (typeof window.applyCuratorGoal !== "function") return;
        window.applyCuratorGoal("toy_roi");
    };

    function paint() {
        var host = document.getElementById("view-toy-play");
        if (!host) return;
        var old = document.getElementById(ID);
        var h = html();

        if (!h) { if (old) old.remove(); return; }

        var box = document.createElement("div");
        box.innerHTML = h;
        if (old) { old.parentNode.replaceChild(box.firstChild, old); return; }

        /* 기록 카드 바로 밑. 처방전이 맨 위를 지켜야 한다. */
        var after = document.getElementById("play-log") || document.getElementById("play-week");
        if (after && after.parentNode === host) host.insertBefore(box.firstChild, after.nextSibling);
        else host.appendChild(box.firstChild);
    }
    window.refreshToyIdle = paint;

    /* ---------- 시작 ---------- */

    function boot() {
        setTimeout(function () { paint(); markLife(); }, 500);
        setTimeout(function () { paint(); markLife(); }, 1600);

        ["updateToyView", "renderFavorites", "switchToyMainTab", "closeShelfSheet",
         "makePlayWeek", "swapPlayDay", "togglePlayDone"].forEach(function (n) {
            var f = window[n];
            if (typeof f !== "function" || f.__life) return;
            var w = function () {
                var o = f.apply(this, arguments);
                setTimeout(function () { paint(); markLife(); }, 90);
                return o;
            };
            w.__life = true;
            window[n] = w;
        });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    window.toyLifeDebug = function () {
        var m = monthsOld(), have = mine();
        console.log("개월수:", m, "· 등록한 장난감:", have.length + "개 · 놀이 기록:", totalLogs() + "회");
        console.log("카드에 붙은 수명 줄:", document.querySelectorAll(".life-note").length + "개");
        var cnt = { now: 0, future: 0, past: 0, always: 0, unknown: 0 };
        toys().forEach(function (t) { cnt[lifeOf(t).kind]++; });
        console.log("지금 쓸 수 있음:", cnt.now, "· 나중:", cnt.future,
                    "· 지남:", cnt.past, "· 시기 무관:", cnt.always);
        console.log("--- 카드에 뜨는 수명 문구 ---");
        var shown = {};
        toys().forEach(function (t) {
            var k = t.milestone + (mine().indexOf(t.id) > -1 ? "/보유" : "");
            if (shown[k]) return;
            shown[k] = 1;
            console.log("   [" + (MSNAME[t.milestone] || t.milestone) + "] " + lifeLine(t).t);
        });
        var list = idleList();
        console.log("잠자는 장난감:", list.length + "개",
                    (have.length < MIN_TOYS || totalLogs() < MIN_LOGS) ? "(근거 부족으로 화면에는 안 뜸)" : "");
        list.forEach(function (x) {
            console.log("   " + x.toy.name + "  " + (x.days === null ? "한 번도 안 씀" : x.days + "일 전"));
        });
    };
})();