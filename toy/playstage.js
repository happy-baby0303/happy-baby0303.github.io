/* ============================================================
   배냇함 PLUS — 개월수 말고 하윤이 기준 (playstage.js)

   놀이 앱이 실패하는 제일 흔한 이유는 하나다.

       "우리 애한텐 안 맞는데"

   지금 이 큐레이터는 놀이를 개월수로 고른다.

       m < 2  신생아 · m < 4  터미타임 · m < 7  뒤집기
       m < 10 배밀이 · 그 뒤 잡고서기

   그런데 발달은 개월수로 안 온다.
   5개월에 뒤집는 아기도, 9개월에 뒤집는 아기도 있다.
   7개월인데 아직 안 뒤집는 집에 뒤집기 놀이를 일곱 개 주면,
   그 부모는 그 주에 앱을 지운다.

   ⚠️ 배냇함은 답을 이미 갖고 있다.
      본 앱 도감 100개에 발달 도장이 찍혀 있다.

          m21  완벽한 뒤집기      → 이 아기는 진짜 뒤집는다
          m28  혼자서 앉았어요
          m29  배밀이 시작
          m30  네발기기 성공
          m34  잡고 일어서기
          m35  소파 잡고 걷기
          m42  첫걸음마 성공!

      다른 놀이 앱은 이 데이터가 없다. 개월수밖에 못 쓴다.
      이게 이 앱만 할 수 있는 자리다.

   ⚠️ 도감이 비어 있으면 개월수로 돌아간다.
      도장을 안 찍는 부모도 많다. 그때 화면이 비면 안 된다.

   ⚠️ 뒤로 당기지 않는다.
      도감이 개월수보다 앞서면(빠른 아기) 그걸 따르고,
      뒤처져 있으면 개월수 대신 도감을 따른다 — 다만
      "늦었다" 는 말은 한 줄도 안 쓴다. 발달은 경쟁이 아니다.

   index.html 에서 playweek.js 앞에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var ID   = "play-stage";
    var GRAY = "#8B95A1", DARK = "#191F28", GREEN = "#1F9D6B", GOLD = "#8A6D00", PURPLE = "#6D28D9";

    /* 도감 id → 발달 단계. 본 앱 MILESTONE_DATA 를 보고 뽑았다.
       ⚠️ 본 앱 도감을 고치면 여기도 같이 봐야 한다. */
    var MS_STAGE = {
        m17: "flip",    // 뒤집기 첫 시도
        m21: "flip",    // 완벽한 뒤집기
        m28: "crawl",   // 혼자서 앉았어요
        m29: "crawl",   // 배밀이 시작
        m30: "crawl",   // 네발기기 성공
        m34: "stand",   // 잡고 일어서기
        m35: "stand",   // 소파 잡고 걷기
        m42: "stand"    // 첫걸음마 성공
    };

    var ORDER = ["newborn", "tummy", "flip", "crawl", "stand"];
    var NAME  = { newborn: "신생아", tummy: "터미타임", flip: "뒤집기", crawl: "배밀이", stand: "잡고서기" };
    var MARK  = {
        m17: "뒤집기 첫 시도", m21: "완벽한 뒤집기", m28: "혼자서 앉았어요",
        m29: "배밀이 시작", m30: "네발기기 성공", m34: "잡고 일어서기",
        m35: "소파 잡고 걷기", m42: "첫걸음마 성공"
    };

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

    /* ---------- 도감에서 읽기 ---------- */

    function achieved() {
        var raw = [];
        try { raw = JSON.parse(localStorage.getItem("tosil_milestones")) || []; } catch (e) {}
        var ids = [];
        raw.forEach(function (a) {
            if (typeof a === "string") ids.push(a);
            else if (a && a.id) ids.push(a.id);
        });
        return ids;
    }

    /* 도감으로 본 단계 — 제일 앞선 도장을 따른다 */
    function stampStage() {
        var ids = achieved(), best = -1, which = null;
        ids.forEach(function (id) {
            var st = MS_STAGE[id];
            if (!st) return;
            var i = ORDER.indexOf(st);
            if (i > best) { best = i; which = id; }
        });
        return best < 0 ? null : { stage: ORDER[best], by: which };
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

    function monthStage() {
        var m = monthsOld();
        if (m === null) return null;
        if (m < 2) return "newborn";
        if (m < 4) return "tummy";
        if (m < 7) return "flip";
        if (m < 10) return "crawl";
        return "stand";
    }

    /* ⭐ 다른 파일들이 이걸 부른다. 도감이 있으면 도감, 없으면 개월수. */
    window.babyPlayStage = function () {
        if (!isPlus()) return monthStage();          // 무료는 개월수 그대로
        var s = stampStage();
        return s ? s.stage : monthStage();
    };

    /* ---------- playweek · playnow 에 끼워 넣기 ----------
       두 파일을 고치지 않는다. 각자 개월수로 계산한 뒤,
       우리가 고른 단계와 다르면 다시 짜게만 한다. -------- */

    function hook() {
        var f = window.makePlayWeek;
        if (typeof f === "function" && !f.__stage) {
            var w = function () { var o = f.apply(this, arguments); setTimeout(paint, 90); return o; };
            w.__stage = true;
            window.makePlayWeek = w;
        }
    }

    /* ---------- 화면 ---------- */

    function html() {
        var plus = isPlus();
        var ms = monthStage(), mo = monthsOld();
        var st = stampStage();

        if (mo === null) return "";

        if (!plus) {
            return '<div id="' + ID + '" class="bnh-card">' +
                '<div data-plus-head style="font-size:18px; font-weight:900; color:' + DARK + '; ' +
                    'word-break:keep-all; margin-bottom:6px;">🎯 개월수 말고 ' + esc(nm("")) + ' 기준으로</div>' +
                '<div style="font-size:12.5px; font-weight:600; color:' + GRAY + '; ' +
                    'line-height:1.75; word-break:keep-all;">' +
                    '지금은 <b>' + mo + '개월</b>이라서 <b>' + NAME[ms] + '</b> 놀이를 드리고 있어요.<br>' +
                    '그런데 발달은 개월수로 오지 않습니다. ' +
                    '5개월에 뒤집는 아기도, 9개월에 뒤집는 아기도 있어요.</div>' +
                '<div style="margin-top:13px; background:#FFF9E6; border:1px solid #F5E1A4; ' +
                    'border-radius:13px; padding:15px;">' +
                    '<div style="font-size:13px; font-weight:900; color:' + GOLD + ';">' +
                        '배냇함 도감에 찍힌 도장으로 맞춰드려요</div>' +
                    '<div style="margin-top:5px; font-size:12px; font-weight:600; color:' + GOLD + '; ' +
                        'line-height:1.75; word-break:keep-all;">' +
                        '<b>' + esc(nm("가")) + ' 실제로 해낸 것</b>에 맞춰 놀이를 고릅니다. ' +
                        '안 맞는 놀이가 일곱 개 오는 일이 없어요.</div>' +
                '</div>' +
            '</div>';
        }

        /* PLUS */
        if (!st) {
            return '<div id="' + ID + '" class="bnh-card">' +
                '<div data-plus-head style="font-size:18px; font-weight:900; color:' + DARK + '; ' +
                    'word-break:keep-all; margin-bottom:6px;">🎯 개월수 말고 ' + esc(nm("")) + ' 기준으로</div>' +
                '<div style="font-size:12.5px; font-weight:600; color:' + GRAY + '; ' +
                    'line-height:1.75; word-break:keep-all;">' +
                    '배냇함 도감에 <b>뒤집기·배밀이·잡고서기</b> 도장을 찍으시면, ' +
                    '개월수 대신 그걸 보고 놀이를 골라드려요.<br>' +
                    '지금은 <b>' + mo + '개월</b> 기준으로 <b>' + NAME[ms] + '</b> 놀이를 드리고 있습니다.</div>' +
                /* 한 화면에 검은 막대가 셋이라 무거웠다. 이 칸의 단추는 테두리만. */
                '<div onclick="location.href=\'../index.html\'" ' +
                    'style="margin-top:12px; text-align:center; padding:13px; background:#FFFFFF; ' +
                    'color:' + DARK + '; border:1.5px solid #D1D5DB; border-radius:12px; ' +
                    'font-size:13.5px; font-weight:900; cursor:pointer;">' +
                    '배냇함 도감 열기</div>' +
            '</div>';
        }

        var same = (st.stage === ms);
        var faster = ORDER.indexOf(st.stage) > ORDER.indexOf(ms);

        var line;
        if (same) {
            line = '<b>' + NAME[st.stage] + '</b> 놀이를 드리고 있어요. ' +
                   '도감의 <b>' + esc(MARK[st.by] || "") + '</b> 도장과 개월수가 같은 곳을 가리킵니다.';
        } else if (faster) {
            line = '도감에 <b>' + esc(MARK[st.by] || "") + '</b> 도장이 찍혀 있어요.<br>' +
                   '개월수로는 <b>' + NAME[ms] + '</b> 이지만 <b>' + NAME[st.stage] + '</b> 놀이로 올렸습니다. ' +
                   esc(nm("는")) + ' 이미 하고 있으니까요.';
        } else {
            /* ⚠️ '늦었다' 는 말을 쓰지 않는다. 발달은 경쟁이 아니다. */
            line = '도감에 마지막으로 찍힌 건 <b>' + esc(MARK[st.by] || "") + '</b> 이에요.<br>' +
                   '개월수로 <b>' + NAME[ms] + '</b> 놀이를 주면 안 맞을 수 있어서 ' +
                   '<b>' + NAME[st.stage] + '</b> 에 맞춰 드립니다. 지금 할 수 있는 걸 충분히 하는 게 낫습니다.';
        }

        return '<div id="' + ID + '" class="bnh-card">' +
            '<div data-plus-head style="font-size:18px; font-weight:900; color:' + DARK + '; ' +
                'word-break:keep-all; margin-bottom:6px;">🎯 ' + esc(nm("")) + ' 기준으로 고르는 중</div>' +
            '<div style="background:' + (same ? "#F9FAFB" : "#F5F3FF") + '; ' +
                'border:1px solid ' + (same ? "#E5E8EB" : "#DDD6FE") + '; border-radius:14px; ' +
                'padding:15px 16px; font-size:12.5px; font-weight:600; color:#4E5968; ' +
                'line-height:1.8; word-break:keep-all;">' + line + '</div>' +
        '</div>';
    }

    function paint() {
        var old = document.getElementById(ID);
        var h = html();
        if (!h) { if (old) old.remove(); return; }

        var box = document.createElement("div");
        box.innerHTML = h;
        if (old) { old.parentNode.replaceChild(box.firstChild, old); }
        else {
            var host = document.getElementById("view-toy-play");
            if (!host) return;
            var after = document.getElementById("play-now");
            if (after && after.parentNode === host) host.insertBefore(box.firstChild, after.nextSibling);
            else host.insertBefore(box.firstChild, host.firstChild);
        }
        try { if (typeof window.refreshPlusMark === "function") window.refreshPlusMark(); } catch (e) {}
    }

    window.refreshPlayStage = paint;

    function boot() {
        setTimeout(function () { hook(); paint(); }, 800);
        setTimeout(function () { hook(); paint(); }, 2200);
        document.addEventListener("visibilitychange", function () {
            if (!document.hidden) setTimeout(paint, 500);
        });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    window.playStageDebug = function () {
        console.log("개월수:", monthsOld(), "→ 개월 기준 단계:", monthStage());
        var st = stampStage();
        console.log("도감 도장:", st ? (MARK[st.by] + " → " + st.stage) : "없음");
        console.log("실제로 쓰는 단계:", window.babyPlayStage());
        console.log("찍힌 도감 전체:", achieved().filter(function (x) { return MS_STAGE[x]; }));
    };
})();