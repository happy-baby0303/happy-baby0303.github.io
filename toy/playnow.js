/* ============================================================
   배냇함 PLUS — 지금 10분 (playnow.js)

   놀이 처방전은 '이번 주' 단위다. 일요일에 일곱 개를 받는다.
   그런데 부모가 실제로 앱을 여는 순간은 주 단위가 아니다.

       밥 올려놓고 10분
       설거지하는 5분
       택배 정리하는 20분
       둘째 기저귀 가는 3분

   그때 "이번 주 목요일 놀이" 를 보여주면 아무 소용이 없다.
   지금 몇 분이 있는지가 전부다.

   ⚠️ data.js 에 playTime 이 100개 전부 적혀 있는데
      playweek.js 도 app.js 도 그걸 한 번도 안 쓴다.
      5분 3개 · 10분 27개 · 15분 34개 · 20분 29개 · 30분 이상 7개.
      이미 다 분류돼 있었다.

   ⚠️ 주간 처방을 대신하지 않는다.
      처방전은 '뭘 해줄지 미리 정해두는 것',
      이건 '지금 당장 뭐 하지' 다. 쓰는 순간이 다르다.

   ⚠️ 이미 이번 주에 한 놀이는 뒤로 민다.
      같은 걸 또 권하면 "얘 그냥 아무거나 주네" 가 된다.

   ⚠️ 가진 장난감이 필요 없는 놀이(zero)를 먼저 올린다.
      지금 당장이라는 건 준비할 시간이 없다는 뜻이다.

   index.html 에서 playweek.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var ID   = "play-now";
    var KEY  = "tosil_playnow_done";     // 오늘 한 것 { id: ts }
    var GRAY = "#A3958A", DARK = "#4A413C", BLUE = "#7F77DD";
    var GREEN = "#1F9D6B", GOLD = "#8A6D00";

    var MINS = [5, 10, 20];
    var picked = 10;

    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    function nm(j) {
        try { if (typeof window.babyNm === "function") return window.babyNm(j); } catch (e) {}
        var n = localStorage.getItem("tosil_babyName") || "우리 아기";
        var c = n.charCodeAt(n.length - 1);
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

    function plays() {
        try { if (typeof playData !== "undefined" && playData) return playData; } catch (e) {}
        return window.playData || [];
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

    function stage() {
        /* ⚠️ 도감에 발달 도장이 찍혀 있으면 그걸 먼저 쓴다.
              playstage.js 가 만든 창구다. 없으면 개월수로 돌아간다. */
        try {
            if (typeof window.babyPlayStage === "function") {
                var s = window.babyPlayStage();
                if (s) return s;
            }
        } catch (e) {}

        var m = monthsOld();
        if (m === null) return null;
        if (m < 2) return "newborn";
        if (m < 4) return "tummy";
        if (m < 7) return "flip";
        if (m < 10) return "crawl";
        return "stand";
    }

    /* ---------- 오늘 한 것 ---------- */

    function todayKey() {
        var d = new Date();
        return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") +
               "-" + String(d.getDate()).padStart(2, "0");
    }

    function done() {
        try {
            var o = JSON.parse(localStorage.getItem(KEY)) || {};
            return (o.day === todayKey() && Array.isArray(o.ids)) ? o.ids : [];
        } catch (e) { return []; }
    }

    function markDone(id) {
        var list = done();
        if (list.indexOf(id) === -1) list.push(id);
        try { localStorage.setItem(KEY, JSON.stringify({ day: todayKey(), ids: list })); } catch (e) {}
    }

    /* ---------- 고르기 ---------- */

    function recent() {
        try { return (typeof window.recentPlayIds === "function") ? (window.recentPlayIds() || []) : []; }
        catch (e) { return []; }
    }

    function best() {
        var st = stage();
        var skipToday = done();
        var skipWeek = recent();

        var likes = {};
        try {
            var sc = (typeof window.playLikeScores === "function") ? window.playLikeScores() : null;
            if (sc && sc.byCat) likes = sc.byCat;
        } catch (e) {}

        var pool = plays().filter(function (p) {
            if (!p || !p.playTime) return false;
            if (p.playTime > picked) return false;                 // 가진 시간 안에 끝나야 한다
            if (skipToday.indexOf(p.id) > -1) return false;        // 오늘 이미 함
            if (st && Array.isArray(p.targetAge) && p.targetAge.indexOf(st) === -1) return false;
            return true;
        });

        pool.forEach(function (p) {
            var s = 0;
            /* 준비가 필요 없는 놀이를 먼저. 지금 당장이라는 건 준비할 틈이 없다는 뜻이다. */
            if (p.category === "zero") s += 3;
            /* 좋아하는 갈래면 올린다 */
            s += (likes[p.category] || 0) * 2;
            /* 이번 주에 이미 한 건 뒤로 */
            if (skipWeek.indexOf(p.id) > -1) s -= 5;
            /* 남는 시간을 꽉 채우는 쪽이 낫다 (5분 있는데 2분짜리면 아쉽다) */
            s += (p.playTime / picked) * 2;
            p.__s = s;
        });

        pool.sort(function (a, b) { return b.__s - a.__s; });
        return pool.slice(0, 3);
    }

    /* ---------- 조작 ---------- */

    window.setPlayNowMins = function (m) { picked = Number(m) || 10; paint(); };

    window.playNowDone = function (id) {
        markDone(id);
        if (typeof window.setPlayLike === "function") {
            /* 했다고만 표시한다. 좋았는지는 playlike 가 따로 묻는다. */
        }
        paint();
    };

    window.openPlayNow = function (id) {
        if (typeof window.openPlayFromWeek === "function") {
            try { return window.openPlayFromWeek(id); } catch (e) {}
        }
        if (typeof window.openPlayDetail === "function") {
            try { return window.openPlayDetail(id); } catch (e) {}
        }
    };

    /* ---------- 화면 ---------- */

    function chips() {
        return '<div style="display:flex; gap:6px; margin-top:12px;">' +
            MINS.map(function (m) {
                var on = (m === picked);
                return '<div onclick="window.setPlayNowMins(' + m + ')" ' +
                    'style="flex:1; text-align:center; padding:11px 0; border-radius:12px; ' +
                    'cursor:pointer; font-size:13.5px; font-weight:900; ' +
                    (on ? 'background:' + DARK + '; color:#FFFFFF;'
                        : 'background:#FBF8F3; color:#7A6F68; border:1px solid #EDE6DE;') + '">' +
                    m + '분</div>';
            }).join("") +
        '</div>';
    }

    function rowHTML(p, i) {
        return '<div style="display:flex; align-items:center; gap:11px; padding:13px 0; ' +
            'border-bottom:1px solid #F6F2EC;">' +
            '<div onclick="window.openPlayNow(\'' + esc(p.id) + '\')" ' +
                'style="flex:1; min-width:0; cursor:pointer;">' +
                '<div style="font-size:13.5px; font-weight:800; color:' + DARK + '; ' +
                    'word-break:keep-all; line-height:1.45;">' + esc(p.title) + '</div>' +
                '<div style="margin-top:3px; font-size:11.5px; font-weight:700; color:' + GRAY + '; ' +
                    'white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' +
                    p.playTime + '분' +
                    (p.category === "zero" ? ' · 준비물 없음' : '') +
                    (p.targetItem ? ' · ' + esc(String(p.targetItem).split(",")[0]) : '') +
                '</div>' +
            '</div>' +
            '<div onclick="window.playNowDone(\'' + esc(p.id) + '\')" ' +
                'style="flex-shrink:0; padding:9px 13px; border-radius:11px; cursor:pointer; ' +
                'background:#F6F2EC; color:#7A6F68; font-size:12px; font-weight:800;">했어요</div>' +
        '</div>';
    }

    function html() {
        var plus = isPlus();
        var list = best();
        var n = done().length;

        if (!plus) {
            var one = list[0];
            /* ⚠️ .matrix-panel 을 쓰면 안 된다.
                     바로 아래 '이번 주 놀이'(playweek)는 카드 없이
                     18px 제목만 쓴다. 둘이 붙어 있는데 하나만 흰 상자면
                     같은 화면에서 두 가지 디자인이 싸운다.
                     playweek 모양에 맞춘다. */
            return '<div id="' + ID + '" class="bnh-card">' +
                '<div data-plus-head style="font-size:18px; font-weight:900; ' +
                    'color:' + DARK + '; word-break:keep-all; margin-bottom:6px;">' +
                    '⏱️ 지금 몇 분 있으세요</div>' +
                '<div style="margin-top:6px; font-size:12.5px; font-weight:600; color:' + GRAY + '; ' +
                    'line-height:1.75; word-break:keep-all;">' +
                    '밥 올려놓고 10분, 설거지하는 5분.<br>' +
                    '그 시간 안에 끝나는 놀이만 골라드려요.</div>' +
                chips() +
                (one
                    ? '<div style="margin-top:10px;">' + rowHTML(one, 0) + '</div>'
                    : '') +
                '<div style="margin-top:13px; background:#FFF9E6; border:1px solid #F5E1A4; ' +
                    'border-radius:13px; padding:15px;">' +
                    '<div style="font-size:13px; font-weight:900; color:' + GOLD + ';">' +
                        '오늘 안 한 것만 골라주는 건 PLUS에서</div>' +
                    '<div style="margin-top:5px; font-size:12px; font-weight:600; color:' + GOLD + '; ' +
                        'line-height:1.75; word-break:keep-all;">' +
                        esc(nm("가")) + ' 좋아한 갈래를 먼저 올리고, ' +
                        '이번 주에 이미 한 건 빼드립니다.</div>' +
                '</div>' +
            '</div>';
        }

        return '<div id="' + ID + '" class="bnh-card">' +
            '<div data-plus-head style="font-size:18px; font-weight:900; ' +
                'color:' + DARK + '; word-break:keep-all; margin-bottom:6px;">' +
                '⏱️ 지금 몇 분 있으세요</div>' +
            '<div style="margin-top:6px; font-size:12.5px; font-weight:600; color:' + GRAY + '; ' +
                'line-height:1.75; word-break:keep-all;">' +
                (n ? '오늘 <b>' + n + '개</b> 하셨어요. 한 건 빼고 골랐습니다.'
                   : '그 시간 안에 끝나는 놀이만, 준비물 없는 것부터.') +
            '</div>' +
            chips() +
            (list.length
                ? '<div style="margin-top:10px;">' + list.map(rowHTML).join("") + '</div>'
                : '<div style="margin-top:14px; font-size:12.5px; font-weight:700; color:' + GREEN + '; ' +
                  'line-height:1.7;">오늘 이 시간대 놀이는 다 하셨어요. 충분합니다 🤍</div>') +
        '</div>';
    }

    function paint() {
        var old = document.getElementById(ID);
        var box = document.createElement("div");
        box.innerHTML = html();
        if (old) { old.parentNode.replaceChild(box.firstChild, old); }
        else {
            var host = document.getElementById("view-toy-play");
            if (!host) return;
            host.insertBefore(box.firstChild, host.firstChild);
        }
        try { if (typeof window.refreshPlusMark === "function") window.refreshPlusMark(); } catch (e) {}
    }

    window.refreshPlayNow = paint;

    function boot() {
        setTimeout(paint, 800);
        setTimeout(paint, 2000);
        ["closeShelfSheet", "switchToyMainTab", "setPlayLike"].forEach(function (nn) {
            var f = window[nn];
            if (typeof f !== "function" || f.__now) return;
            var w = function () { var o = f.apply(this, arguments); setTimeout(paint, 90); return o; };
            w.__now = true;
            window[nn] = w;
        });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    window.playNowDebug = function () {
        console.log("개월수:", monthsOld(), "· 단계:", stage());
        console.log("고른 시간:", picked + "분");
        console.log("오늘 한 것:", done());
        console.log("이번 주에 한 것:", recent().length + "개");
        best().forEach(function (p, i) {
            console.log("  " + (i + 1) + ". " + p.title + "  " + p.playTime + "분 [" + p.category + "] 점수 " + p.__s.toFixed(1));
        });
    };
})();