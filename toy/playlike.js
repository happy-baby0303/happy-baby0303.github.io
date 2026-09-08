/* ============================================================
   배냇함 PLUS — 우리 아기가 좋아한 놀이 (playlike.js)

   놀이 처방전이 "일주일치를 짜준다" 까지만 하면
   부모 입장에서는 목록 하나를 받은 것이다. 4,900원이 애매하다.

   그런데 놀아본 뒤에 손가락 한 번만 눌러주면,
   앱이 그 집 아기를 알기 시작한다.

       👍 좋아했어요   →  다음 주에 비슷한 놀이를 더 넣는다
       😐 시큰둥해요   →  그 갈래를 뒤로 민다

   그러면 다음 주 처방전은 남의 목록이 아니라
   '우리 애가 좋아한 것들' 이 된다. 그건 다른 데서 못 산다.

   그리고 이 기록이 쌓일수록 해지가 어려워진다.
   락인은 계약이 아니라 쌓인 기록이 만든다.

   ⚠️ 무료 사용자에게도 기록은 남는다. 막지 않는다.
      PLUS 는 그 기록으로 '다음 주를 짜주는 것' 이다.

   index.html 에서 playweek.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var KEY = "tosil_play_likes";
    var GRAY = "#8B95A1", DARK = "#191F28", GREEN = "#1F9D6B", GOLD = "#8A6D00";

    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }
    function babyName() { return localStorage.getItem("tosil_babyName") || "우리 아기"; }

    /* 이름 + 조사. babyswitch.js 가 없는 폴더에서도 혼자 맞게 붙는다. */
    function nm(j) {
        try { if (typeof window.babyNm === "function") return window.babyNm(j); } catch (e) {}
        var n = babyName(), c = n.charCodeAt(n.length - 1);
        var jong = (c >= 0xAC00 && c <= 0xD7A3) && ((c - 0xAC00) % 28 !== 0);
        return n + (jong ? "이" : "") + (j || "");
    }
    function plays() {
        try { if (typeof playData !== "undefined" && playData) return playData; } catch (e) {}
        return window.playData || [];
    }
    function playById(id) {
        var all = plays();
        for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
        return null;
    }

    function likes() {
        try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
    }
    function save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }

    window.playLikeOf = function (id) { return likes()[id] || 0; };   // 1 좋아함 · -1 시큰둥

    window.setPlayLike = function (id, v) {
        var o = likes();
        o[id] = (o[id] === v) ? 0 : v;                 // 한 번 더 누르면 취소
        save(o);
        paintAll();
        if (typeof window.refreshPlayWeek === "function") window.refreshPlayWeek();
    };

    /* ---------- 갈래별 점수 ----------
       놀이 하나가 아니라 '어떤 갈래를 좋아하는지' 를 본다.
       그래야 다음 주에 안 해본 놀이도 골라줄 수 있다. -------- */

    function scores() {
        var o = likes(), s = {}, n = 0;
        Object.keys(o).forEach(function (id) {
            var v = o[id];
            if (!v) return;
            var p = playById(id);
            if (!p) return;
            n++;
            var c = p.category || "etc";
            s[c] = (s[c] || 0) + v;
        });
        return { byCat: s, count: n };
    }
    window.playLikeScores = scores;

    var LABEL = {
        zero: "집에 있는 걸로 하는 놀이", dad: "몸으로 크게 노는 놀이",
        lieDown: "누워서 하는 놀이", toy: "장난감으로 하는 놀이",
        poop: "배 마사지 · 변비 놀이", sick: "차분한 놀이"
    };

    /* ---------- 놀이 카드마다 손가락 두 개 ---------- */

    function chip(id) {
        var v = window.playLikeOf(id);
        var b = function (val, icon, on) {
            return '<span onclick="event.stopPropagation(); window.setPlayLike(\'' + id + '\',' + val + ')" ' +
                'style="display:inline-flex; align-items:center; justify-content:center; ' +
                'width:30px; height:30px; border-radius:9px; cursor:pointer; font-size:14px; ' +
                (on ? 'background:' + (val > 0 ? "#EAF7F1" : "#F2F4F6") + '; ' +
                      'border:1.5px solid ' + (val > 0 ? "#A7DFC8" : "#D1D5DB") + ';'
                    : 'background:transparent; border:1.5px solid #E5E8EB; opacity:0.5;') +
                '">' + icon + '</span>';
        };
        return '<span class="play-like" data-pid="' + id + '" ' +
            'style="display:inline-flex; gap:5px; margin-left:6px;">' +
            b(1, "👍", v === 1) + b(-1, "😐", v === -1) + '</span>';
    }

    function paintAll() {
        /* ⚠️ 카드에는 손대지 않는다. playweek.js 가 카드를 혼자 그린다.
              여기서 또 끼워 넣으면 교체·했어요와 한 줄에 흩어진다.
              좋아요 버튼은 '놀았어요' 를 누른 뒤에만 카드 안에 뜬다. */
        paintSummary();
    }
    window.playLikeRepaint = paintSummary;

    /* ---------- 요약 한 줄 ---------- */

    function summaryHTML() {
        var s = scores();
        if (s.count < 3) {
            return '<div id="play-like-sum" style="background:#F9FAFB; border:1px solid #E5E8EB; ' +
                'border-radius:14px; padding:14px 16px; margin-top:12px; font-size:12.5px; ' +
                'font-weight:600; color:' + GRAY + '; line-height:1.7; word-break:keep-all;">' +
                '놀고 나서 <b>놀았어요</b>를 누르면 어땠는지 물어봐요. ' +
                '세 번만 쌓이면 다음 주 처방전이 ' + esc(nm("")) + ' 취향으로 바뀝니다. ' +
                '지금 ' + s.count + '번 눌렀어요.</div>';
        }

        var best = null, worst = null;
        Object.keys(s.byCat).forEach(function (c) {
            if (!best || s.byCat[c] > s.byCat[best]) best = c;
            if (!worst || s.byCat[c] < s.byCat[worst]) worst = c;
        });

        var line = esc(nm("는")) + ' <b>' + (LABEL[best] || best) + '</b>을 좋아해요.';
        if (worst && worst !== best && s.byCat[worst] < 0)
            line += ' <b>' + (LABEL[worst] || worst) + '</b>은 아직 시큰둥하고요.';

        return '<div id="play-like-sum" style="background:#EAF7F1; border:1px solid #A7DFC8; ' +
            'border-radius:14px; padding:15px 16px; margin-top:12px;">' +
            '<div style="font-size:13.5px; font-weight:900; color:#1F6F52; margin-bottom:5px;">' +
                '🎯 ' + s.count + '번 눌러주신 걸로 알아낸 것</div>' +
            '<div style="font-size:12.5px; font-weight:600; color:#4E5968; line-height:1.7; ' +
                'word-break:keep-all;">' + line + '<br>' +
                '다음 주 처방전에 이런 놀이를 더 넣어드릴게요.</div>' +
        '</div>';
    }

    function paintSummary() {
        var host = document.getElementById("play-week");
        if (!host) return;
        var old = document.getElementById("play-like-sum");
        var box = document.createElement("div");
        box.innerHTML = summaryHTML();
        if (old) old.parentNode.replaceChild(box.firstChild, old);
        else host.appendChild(box.firstChild);
    }

    /* ---------- 처방전 편성에 반영 ----------
       playweek 의 makePlan 이 만든 결과를 받아, 좋아하는 갈래를 앞으로 당긴다.
       기존 규칙(가진 장난감 · 아빠 놀이 요일)은 건드리지 않는다. -------- */

    function boot() {
        var f = window.makePlayWeek;
        if (typeof f === "function" && !f.__like) {
            var w = function () {
                var o = f.apply(this, arguments);
                setTimeout(paintAll, 80);
                return o;
            };
            w.__like = true;
            window.makePlayWeek = w;
        }
        var g = window.swapPlayDay;
        if (typeof g === "function" && !g.__like) {
            var w2 = function () { var o = g.apply(this, arguments); setTimeout(paintAll, 80); return o; };
            w2.__like = true;
            window.swapPlayDay = w2;
        }
        setTimeout(paintAll, 700);
        setTimeout(paintAll, 1800);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    window.playLikeDebug = function () {
        var o = likes(), s = scores();
        console.log("눌러준 횟수:", s.count);
        Object.keys(o).forEach(function (id) {
            if (!o[id]) return;
            var p = playById(id);
            console.log("   " + (o[id] > 0 ? "👍" : "😐") + " " + (p ? p.title : id) +
                        "  [" + (p ? p.category : "?") + "]");
        });
        console.log("갈래 점수:", s.byCat);
        console.log("카드에 붙은 손가락:", document.querySelectorAll(".play-like").length + "개");
    };
})();