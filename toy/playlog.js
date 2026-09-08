/* ============================================================
   배냇함 — 놀이 기록 (playlog.js)

   이유식 탭과 나란히 놓으면 장난감 탭이 왜 빈약한지가 보인다.

       이유식   짜준다 → 산다 → 만든다 → 기록한다 → 도감이 쌓인다
       장난감   짜준다 → 끝

   기록이 없으니 쌓이는 게 없고, 쌓이는 게 없으니
   두 달 뒤에 해지해도 아까울 게 없다.

   그래서 셋을 만든다.
     1. 놀이 기록  — 처방전에서 '했어요' 한 번
     2. 이번 달 리포트 — 몇 번 놀았나 · 아빠는 며칠 · 제일 많이 한 놀이
     3. 지금 시기 안내 — 이 시기에 할 수 있는 놀이가 몇 개인지

   ⚠️ 전부 무료다. 기록을 잠그면 아무도 안 쌓는다.
      PLUS 는 그 기록으로 '다음 주를 짜주는 것' 하나뿐이다.
      대신 기록이 쌓일수록 처방전이 똑똑해진다 — 한 놀이는 뒤로 민다.

   index.html 에서 playweek.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var KEY = "tosil_play_log";
    var GRAY = "#8B95A1", DARK = "#191F28", BLUE = "#3182F6", GREEN = "#1F9D6B", PURPLE = "#7F77DD";

    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }
    function babyName() { return localStorage.getItem("tosil_babyName") || "우리 아기"; }

    function plays() {
        try { if (typeof playData !== "undefined" && playData) return playData; } catch (e) {}
        return window.playData || [];
    }
    function byId(id) {
        var a = plays();
        for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i];
        return null;
    }

    /* 이름 + 조사. babyswitch.js 가 없는 폴더에서도 혼자 맞게 붙는다. */
    function nm(j) {
        try { if (typeof window.babyNm === "function") return window.babyNm(j); } catch (e) {}
        var n = babyName(), c = n.charCodeAt(n.length - 1);
        var jong = (c >= 0xAC00 && c <= 0xD7A3) && ((c - 0xAC00) % 28 !== 0);
        return n + (jong ? "이" : "") + (j || "");
    }
    function today() {
        var t = new Date();
        return t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") +
               "-" + String(t.getDate()).padStart(2, "0");
    }

    function log() {
        try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
    }
    function save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }

    window.didPlayToday = function (id) {
        var d = log()[today()] || [];
        return d.indexOf(id) > -1;
    };

    window.togglePlayDone = function (id) {
        var o = log(), k = today();
        if (!o[k]) o[k] = [];
        var i = o[k].indexOf(id);
        if (i > -1) o[k].splice(i, 1); else o[k].push(id);
        if (!o[k].length) delete o[k];
        save(o);
        paintMarks();
        paintCard();
        if (typeof window.refreshPlayWeek === "function") window.refreshPlayWeek();
    };

    /* 최근에 한 놀이 — 처방전에서 뒤로 밀 때 쓴다 */
    window.recentPlayIds = function (days) {
        var o = log(), out = [], n = days || 14;
        for (var i = 0; i < n; i++) {
            var t = new Date(); t.setDate(t.getDate() - i);
            var k = t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") +
                    "-" + String(t.getDate()).padStart(2, "0");
            (o[k] || []).forEach(function (id) { if (out.indexOf(id) === -1) out.push(id); });
        }
        return out;
    };

    /* ---------- 이번 달 ---------- */

    function monthStats() {
        var o = log(), t = new Date();
        var pre = t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0");
        var days = 0, total = 0, cnt = {}, dadDays = 0;
        Object.keys(o).forEach(function (k) {
            if (k.indexOf(pre) !== 0) return;
            var list = o[k] || [];
            if (!list.length) return;
            days++; total += list.length;
            var hadDad = false;
            list.forEach(function (id) {
                cnt[id] = (cnt[id] || 0) + 1;
                var p = byId(id);
                if (p && p.category === "dad") hadDad = true;
            });
            if (hadDad) dadDays++;
        });
        var top = null;
        Object.keys(cnt).forEach(function (id) { if (!top || cnt[id] > cnt[top]) top = id; });
        return { days: days, total: total, top: top, topN: top ? cnt[top] : 0, dadDays: dadDays };
    }

    /* ---------- 도감 : 여태 해본 놀이 ---------- */

    function everDone() {
        var o = log(), seen = {}, out = [];
        Object.keys(o).forEach(function (k) {
            (o[k] || []).forEach(function (id) { if (!seen[id]) { seen[id] = 1; out.push(id); } });
        });
        return out;
    }

    /* ---------- 시기 ---------- */

    var MS = [
        { id: "newborn", name: "신생아",   next: "터미타임", to: 2 },
        { id: "tummy",   name: "터미타임", next: "뒤집기",   to: 4 },
        { id: "flip",    name: "뒤집기",   next: "배밀이",   to: 7 },
        { id: "crawl",   name: "배밀이",   next: "잡고 서기", to: 10 },
        { id: "stand",   name: "잡고 서기", next: null,      to: 99 }
    ];

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

    function stageNow() {
        var m = monthsOld();
        if (m === null) return MS[2];
        for (var i = 0; i < MS.length; i++) if (m < MS[i].to) return MS[i];
        return MS[MS.length - 1];
    }

    /* 이 시기가 지나면 영원히 못 하게 되는 놀이.
       targetAge 에 다음 시기가 하나도 없으면 그 놀이는 여기서 끝난다.
       ⚠️ 겁주는 문구로 쓰지 않는다. 사실만 담담히 말한다. */
    function closingSoon() {
        var s = stageNow(), i = MS.indexOf(s);
        if (i < 0 || i >= MS.length - 1) return { next: null, list: [] };
        var later = MS.slice(i + 1).map(function (x) { return x.id; });
        var list = plays().filter(function (p) {
            if (!p.targetAge || p.targetAge.indexOf(s.id) === -1) return false;
            return !later.some(function (l) { return p.targetAge.indexOf(l) > -1; });
        });
        return { next: MS[i + 1], list: list };
    }

    /* ---------- 카드 ---------- */

    function html() {
        var st = monthStats();
        var s = stageNow(), m = monthsOld();
        var canNow = plays().filter(function (p) {
            return p.targetAge && p.targetAge.indexOf(s.id) > -1;
        }).length;
        var nextStage = MS[MS.indexOf(s) + 1];
        var canNext = nextStage ? plays().filter(function (p) {
            return p.targetAge && p.targetAge.indexOf(nextStage.id) > -1 &&
                   p.targetAge.indexOf(s.id) === -1;
        }).length : 0;

        var ever = everDone();
        var doneNow = plays().filter(function (p) {
            return p.targetAge && p.targetAge.indexOf(s.id) > -1 && ever.indexOf(p.id) > -1;
        }).length;
        var pct = canNow ? Math.round(doneNow / canNow * 100) : 0;

        var cs = closingSoon();
        var closeLeft = cs.list.filter(function (p) { return ever.indexOf(p.id) === -1; });

        var topP = st.top ? byId(st.top) : null;
        var t = new Date();

        return '<div id="play-log" style="background:#FFFFFF; border:1px solid #E5E8EB; ' +
            'border-radius:18px; padding:18px 16px; margin-bottom:14px;">' +

            '<div style="font-size:15px; font-weight:900; color:' + DARK + '; margin-bottom:3px;">' +
                '📔 ' + (t.getMonth() + 1) + '월 놀이 기록</div>' +
            '<div style="font-size:11.5px; font-weight:700; color:' + GRAY + '; margin-bottom:14px;">' +
                '처방전에서 <b>놀았어요</b>를 누르면 여기 쌓입니다</div>' +

            (st.days === 0
                ? '<div style="background:#F9FAFB; border-radius:13px; padding:18px 14px; ' +
                  'text-align:center; font-size:12.5px; font-weight:700; color:' + GRAY + '; ' +
                  'line-height:1.7;">아직 기록이 없어요.<br>오늘 논 놀이에 <b>놀았어요</b>를 눌러보세요.</div>'
                : '<div style="display:flex; gap:8px; margin-bottom:12px;">' +
                    '<div style="flex:1; text-align:center; background:#F0F7FF; border-radius:13px; padding:13px 6px;">' +
                        '<div style="font-size:20px; font-weight:900; color:' + BLUE + ';">' + st.days + '</div>' +
                        '<div style="font-size:10.5px; font-weight:800; color:' + GRAY + '; margin-top:2px;">논 날</div></div>' +
                    '<div style="flex:1; text-align:center; background:#F5F4FF; border-radius:13px; padding:13px 6px;">' +
                        '<div style="font-size:20px; font-weight:900; color:' + PURPLE + ';">' + st.total + '</div>' +
                        '<div style="font-size:10.5px; font-weight:800; color:' + GRAY + '; margin-top:2px;">놀이 수</div></div>' +
                    '<div style="flex:1; text-align:center; background:#EAF7F1; border-radius:13px; padding:13px 6px;">' +
                        '<div style="font-size:20px; font-weight:900; color:' + GREEN + ';">' + st.dadDays + '</div>' +
                        '<div style="font-size:10.5px; font-weight:800; color:' + GRAY + '; margin-top:2px;">아빠 날</div></div>' +
                  '</div>' +
                  (topP ? '<div style="background:#F9FAFB; border-radius:12px; padding:12px 14px; ' +
                        'font-size:12.5px; font-weight:700; color:#4E5968; line-height:1.6;">' +
                        '🏆 제일 많이 한 놀이 · <b>' + esc(topP.title) + '</b> ' + st.topN + '번</div>' : '')
            ) +

            '<div style="height:1px; background:#F2F4F6; margin:14px 0;"></div>' +

            /* ── 지금 시기 + 도감 진행률 ── */
            '<div style="font-size:12.5px; font-weight:900; color:' + DARK + '; margin-bottom:8px;">' +
                '🌱 ' + esc(nm("는")) + ' 지금 <span style="color:' + PURPLE + ';">' + s.name + '</span> 시기예요' +
                (m !== null ? ' <span style="font-weight:700; color:' + GRAY + ';">· ' + m + '개월</span>' : '') + '</div>' +

            '<div style="font-size:12px; font-weight:600; color:#4E5968; line-height:1.7; ' +
                'word-break:keep-all; margin-bottom:8px;">' +
                '지금 할 수 있는 놀이 <b>' + canNow + '개</b> 중에 <b style="color:' + PURPLE + ';">' +
                doneNow + '개</b> 해보셨어요' +
                (nextStage && canNext ? '<br><b>' + nextStage.name + '</b>이 되면 <b>' + canNext + '개</b>가 더 열려요.' : '') +
            '</div>' +

            '<div style="height:7px; background:#F2F4F6; border-radius:4px; overflow:hidden;">' +
                '<div style="width:' + pct + '%; height:100%; background:' + PURPLE + '; border-radius:4px;"></div>' +
            '</div>' +

            /* ── 이 시기가 지나면 닫히는 놀이 ──
               다른 육아앱은 '이 시기에 좋은 놀이' 까지만 말한다.
               '이 시기가 지나면 다시 못 한다' 는 아무도 안 알려준다. */
            (closeLeft.length
                ? '<div style="margin-top:14px; background:#F5F3FF; border:1px solid #DDD6FE; ' +
                  'border-radius:13px; padding:14px 15px;">' +
                  '<div style="font-size:12.5px; font-weight:900; color:#6D28D9; margin-bottom:6px;">' +
                      '⏳ ' + cs.next.name + '를 시작하면 이 놀이들은 끝나요</div>' +
                  '<div style="font-size:12px; font-weight:600; color:#4E5968; line-height:1.7; ' +
                      'word-break:keep-all;">아직 안 해보신 게 <b>' + closeLeft.length + '개</b> 남았어요. ' +
                      '지금이 아니면 다시 못 하는 놀이예요.</div>' +
                  '<div style="margin-top:10px; display:flex; flex-direction:column; gap:6px;">' +
                      closeLeft.slice(0, 4).map(function (p) {
                          return '<div onclick="window.openPlayFromWeek(\'' + p.id + '\')" ' +
                              'style="font-size:12.5px; font-weight:800; color:#6D28D9; cursor:pointer; ' +
                              'word-break:keep-all;">· ' + esc(String(p.title).replace(/^\[[^\]]+\]\s*/, '')) +
                              ' <span style="font-weight:700; color:' + GRAY + ';">' + (p.playTime || '') + '분</span></div>';
                      }).join('') +
                      (closeLeft.length > 4
                          ? '<div style="font-size:11.5px; font-weight:700; color:' + GRAY + ';">외 ' +
                            (closeLeft.length - 4) + '개</div>' : '') +
                  '</div></div>'
                : (cs.next
                    ? '<div style="margin-top:12px; font-size:12px; font-weight:800; color:#1F6F52; ' +
                      'line-height:1.6;">✅ 이 시기에만 할 수 있는 놀이는 다 해보셨어요.</div>'
                    : '')) +

            '<div onclick="window.openBaenaetForPhoto()" style="margin-top:14px; text-align:center; ' +
                'padding:13px; background:#F2F4F6; color:#4E5968; border-radius:12px; ' +
                'font-size:13px; font-weight:800; cursor:pointer;">' +
                '📷 오늘 논 사진은 배냇함에 남겨두세요</div>' +
        '</div>';
    }

    window.openBaenaetForPhoto = function () {
        location.href = "../index.html";
    };

    function paintCard() {
        var host = document.getElementById("view-toy-play");
        if (!host) return;
        var old = document.getElementById("play-log");
        var box = document.createElement("div");
        box.innerHTML = html();
        if (old) { old.parentNode.replaceChild(box.firstChild, old); return; }
        /* ⚠️ appendChild 면 놀이 42개 목록 아래로 내려가서 아무도 못 본다.
              처방전 바로 밑에 놓는다. */
        var week = document.getElementById("play-week");
        if (week && week.parentNode === host) host.insertBefore(box.firstChild, week.nextSibling);
        else host.insertBefore(box.firstChild, host.firstChild);
    }
    window.playLogRepaint = paintCard;

    /* ---------- 처방전 카드에 '했어요' ---------- */

    function paintMarks() {
        /* ⚠️ 카드에는 손대지 않는다. playweek.js 가 '놀았어요' 를 직접 그린다.
              여기서 또 붙이면 버튼이 두 개가 되고 줄이 흐트러진다. */
    }

    function boot() {
        setTimeout(function () { paintCard(); paintMarks(); }, 700);
        setTimeout(function () { paintCard(); paintMarks(); }, 1800);

        ["makePlayWeek", "swapPlayDay", "switchToyMainTab"].forEach(function (n) {
            var f = window[n];
            if (typeof f !== "function" || f.__log) return;
            var w = function () {
                var o = f.apply(this, arguments);
                setTimeout(function () { paintMarks(); paintCard(); }, 90);
                return o;
            };
            w.__log = true;
            window[n] = w;
        });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    window.playLogDebug = function () {
        var o = log(), st = monthStats();
        console.log("기록한 날:", Object.keys(o).length + "일");
        console.log("이번 달: 논 날 " + st.days + " · 놀이 " + st.total + " · 아빠 날 " + st.dadDays);
        if (st.top) console.log("제일 많이 한 놀이:", (byId(st.top) || {}).title, st.topN + "번");
        console.log("최근 14일에 한 놀이:", window.recentPlayIds(14).length + "개");
        console.log("지금 시기:", stageNow().name, "· 개월수:", monthsOld());
        console.log("카드에 붙은 '했어요':", document.querySelectorAll(".play-done").length + "개");
    };
})();