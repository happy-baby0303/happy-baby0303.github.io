/* ============================================================
   배냇함 PLUS — 우리 카시트가 이 유모차에 얹히나 (strollermatch.js)

   '우리 유모차' PLUS 가 얇았다. 무게를 더해주고 끝났다.
   4,900원에 계산기 하나면 그건 못 판다.

   그런데 data.js 를 뒤져보니 아무도 안 쓰는 값이 있었다.

       adapter: { maxi: "전용 어댑터(7만) 필요", stokke: "직결 가능 ⭕" }

   49종 전부에 들어 있는데 화면 어디에도 안 나온다.

   ⚠️ 이게 왜 이 앱만 할 수 있는 자리인가.

      다른 앱은 "이 유모차는 어댑터가 필요합니다" 까지가 끝이다.
      배냇함은 카시트 큐레이터를 같이 갖고 있고,
      거기에 '우리 카시트' 가 이미 등록돼 있다.

      그래서 이렇게 말할 수 있다.
        "하윤이 카시트(조이 아이스핀)는 이 유모차에 안 얹혀요.
         어댑터를 사도 안 됩니다."

   ⚠️ 트래블 시스템이 왜 중요한가.
      차에서 잠든 아기를 안 깨우고 유모차로 옮기는 일이다.
      이게 되는 집과 안 되는 집의 하루가 다르다.
      사고 나서 알면 늦는다.

   ⚠️ 없는 조합을 지어내지 않는다.
      data.js 에 적힌 것만 말하고, 모르면 모른다고 한다.
      "아마 될 거예요" 는 10만원짜리 어댑터를 잘못 사게 만든다.

   index.html 에서 strollerown.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var ID   = "stroller-match";
    var GRAY = "#A3958A", DARK = "#4A413C", GREEN = "#1F9D6B", GOLD = "#8A6D00", RED = "#C62828";

    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }


    // 받침에 맞는 조사만 돌려준다 — 제품 이름이 숫자·영문으로 끝나도 (Z2 → 를 · 폭스5 → 를 · 3 → 을)
    function pp(w, pair) {
        var s = String(w || "").trim(), c = s.charCodeAt(s.length - 1), jong;
        if (c >= 0xAC00 && c <= 0xD7A3) jong = (c - 0xAC00) % 28 !== 0;
        else if (/[0-9]$/.test(s)) jong = /[013678]$/.test(s);      // 영·일·삼·육·칠·팔
        else if (/[a-z]$/i.test(s)) jong = /[lmnr]$/i.test(s);       // 엘·엠·엔·알
        else jong = false;
        var p = pair.split("/");
        return jong ? p[0] : p[1];
    }

    function isPlus() {
        try { if (typeof window.isPremiumUser === "function") return !!window.isPremiumUser(); } catch (e) {}
        if (!localStorage.getItem("firebase_uid")) return false;
        return localStorage.getItem("tosil_is_founder") === "true"
            || localStorage.getItem("tosil_plan_cache") === "premium"
            || localStorage.getItem("tosil_is_master") === "true";
    }

    function strollers() {
        try { if (typeof strollerData !== "undefined" && strollerData) return strollerData; } catch (e) {}
        return window.strollerData || [];
    }

    /* ---------- 내가 등록한 것들 ---------- */

    function myStroller() {
        var o = {};
        try { o = JSON.parse(localStorage.getItem("tosil_stroller_own")) || {}; } catch (e) {}
        var n = o.name || o.name2 || "";
        if (!n) return null;
        var hit = strollers().filter(function (s) { return s.name === n; })[0];
        return hit || { name: n };
    }

    /* 카시트 큐레이터가 적어둔 것. 브랜드만 봐도 충분하다. */
    function mySeatName() {
        var o = {};
        try { o = JSON.parse(localStorage.getItem("tosil_carseat_own")) || {}; } catch (e) {}
        return o.name || o.title || o.id || "";
    }

    /* ---------- 판정 ----------
       ⚠️ data.js 의 adapter 는 브랜드 계열로만 적혀 있다.
          maxi   = 맥시코시 계열 (맥시코시·싸이벡스·뉴나 등 공통 규격을 쓰는 쪽)
          stokke = 스토케 전용
          우리가 더 세분하지 않는다. 적힌 대로만 말한다. -------- */

    function seatFamily(name) {
        var n = String(name || "");
        if (/스토케|stokke/i.test(n)) return "stokke";
        if (/맥시코시|싸이벡스|뉴나|조이|브라이텍스|maxi|cybex|nuna/i.test(n)) return "maxi";
        return null;
    }

    function verdict(st, seat) {
        var ad = st && st.adapter;
        if (!ad) return null;

        var fam = seatFamily(seat);
        if (!fam) return { kind: "unknown", ad: ad };

        var txt = String(ad[fam] || "");
        if (!txt) return { kind: "unknown", ad: ad };

        if (/직결|바로|프리|가능\s*⭕|⭕/.test(txt) && !/불가|❌/.test(txt))
            return { kind: "ok", txt: txt, fam: fam };
        if (/불가|❌|안 됨|미지원/.test(txt))
            return { kind: "no", txt: txt, fam: fam };
        if (/어댑터|필요/.test(txt))
            return { kind: "adapter", txt: txt, fam: fam };
        return { kind: "unknown", ad: ad };
    }

    /* ---------- 화면 ---------- */

    function html() {
        var st = myStroller();
        if (!st) return "";                       // 유모차를 아직 안 고르셨으면 안 띄운다

        var seat = mySeatName();
        var v = verdict(st, seat);
        if (!v) return "";                        // adapter 정보가 없는 제품

        var plus = isPlus();

        var head, body, tone, bg, bd;

        if (!seat) {
            tone = GRAY; bg = "#FBF8F3"; bd = "#EDE6DE";
            head = "카시트를 얹을 수 있나요";
            body = "카시트 탭에서 <b>우리 카시트</b>를 골라두시면, " +
                   "이 유모차에 <b>얹히는지</b> 알려드릴게요.<br>" +
                   "차에서 잠든 아기를 안 깨우고 옮길 수 있는지가 여기서 갈립니다.";
        } else if (v.kind === "ok") {
            tone = GREEN; bg = "#EAF7F1"; bd = "#A7DFC8";
            head = "얹힙니다 · 어댑터 없이";
            body = "<b>" + esc(seat) + "</b>" + pp(seat, "을/를") + " <b>" + esc(st.name) + "</b>에 바로 꽂을 수 있어요.<br>" +
                   "<b>차에서 잠들었으면 카시트째 들어 올려</b> 유모차에 얹으세요. " +
                   "아기를 안 깨우고 옮기는 유일한 방법입니다.<br>" +
                   '<span style="color:' + GRAY + ';">' + esc(v.txt) + '</span>';
        } else if (v.kind === "adapter") {
            tone = GOLD; bg = "#FFF9E6"; bd = "#FDE68A";
            head = "어댑터가 있으면 얹힙니다";
            body = "<b>" + esc(seat) + "</b>" + pp(seat, "과/와") + " <b>" + esc(st.name) + "</b>" + pp(st.name, "은/는") + " " +
                   "<b>따로 파는 어댑터</b>가 있어야 연결됩니다.<br>" +
                   '<span style="color:' + GRAY + ';">' + esc(v.txt) + '</span><br><br>' +
                   "⚠️ 사기 전에 <b>두 제품 모델명을 함께</b> 제조사에 물어보세요. " +
                   "같은 브랜드여도 연식에 따라 규격이 다릅니다.";
        } else if (v.kind === "no") {
            tone = RED; bg = "#FFF2F2"; bd = "#FCA5A5";
            head = "이 조합은 안 얹힙니다";
            body = "<b>" + esc(seat) + "</b>" + pp(seat, "은/는") + " <b>" + esc(st.name) + "</b>에 연결되지 않아요. " +
                   "어댑터를 사도 안 됩니다.<br>" +
                   '<span style="color:' + GRAY + ';">' + esc(v.txt) + '</span><br><br>' +
                   "차에서 잠들면 <b>아기를 안아서</b> 옮기셔야 합니다. " +
                   "다음에 한쪽을 바꾸실 때 이 조합을 기억해 두세요.";
        } else {
            tone = GRAY; bg = "#FBF8F3"; bd = "#EDE6DE";
            head = "이 조합은 저희도 모릅니다";
            body = "<b>" + esc(seat) + "</b>" + pp(seat, "과/와") + " <b>" + esc(st.name) + "</b>의 연결은 " +
                   "저희가 가진 자료에 없어요.<br>" +
                   "<b>아마 될 거예요</b> 라고 말씀드리면 10만원짜리 어댑터를 잘못 사시게 됩니다. " +
                   "두 제조사 중 한 곳에 모델명을 대고 물어보시는 게 확실합니다.";
        }

        /* 무료 유저에게는 판정을 가린다. 이게 PLUS 의 값어치다. */
        if (!plus && seat) {
            return '<div id="' + ID + '" class="matrix-panel" style="margin-bottom:14px;">' +
                '<div class="matrix-header" data-plus-head style="font-size:14.5px; font-weight:900; ' +
                    'color:' + DARK + ';">🔗 우리 카시트가 이 유모차에 얹히나</div>' +
                '<div style="margin-top:6px; font-size:12.5px; font-weight:600; color:' + GRAY + '; ' +
                    'line-height:1.75; word-break:keep-all;">' +
                    '<b>' + esc(seat) + '</b>' + pp(seat, "과/와") + ' <b>' + esc(st.name) + '</b>.<br>' +
                    '차에서 잠든 아기를 <b>안 깨우고 옮길 수 있는지</b>가 이 둘로 정해집니다.' +
                '</div>' +
                '<div style="margin-top:13px; background:#FFF9E6; border:1px solid #F5E1A4; ' +
                    'border-radius:13px; padding:15px;">' +
                    '<div style="font-size:13px; font-weight:900; color:' + GOLD + ';">' +
                        '이 조합이 되는지 PLUS에서 알려드려요</div>' +
                    '<div style="margin-top:5px; font-size:12px; font-weight:600; color:' + GOLD + '; ' +
                        'line-height:1.75; word-break:keep-all;">' +
                        '어댑터가 필요한지, 사도 안 되는지까지요. ' +
                        '<b>잘못 사면 7~10만원입니다.</b></div>' +
                '</div>' +
            '</div>';
        }

        return '<div id="' + ID + '" class="matrix-panel" style="background:' + bg + '; ' +
            'border:1px solid ' + bd + '; margin-bottom:14px;">' +
            '<div class="matrix-header" data-plus-head style="font-size:14.5px; font-weight:900; ' +
                'color:' + tone + ';">🔗 ' + esc(head) + '</div>' +
            '<div style="margin-top:6px; font-size:12.5px; font-weight:600; color:#7A6F68; ' +
                'line-height:1.8; word-break:keep-all;">' + body + '</div>' +
            (seat
                ? ''
                : '<div onclick="location.href=\'../carseat/index.html\'" ' +
                  'style="margin-top:12px; text-align:center; padding:13px; background:' + DARK + '; ' +
                  'color:#FFFFFF; border-radius:12px; font-size:13.5px; font-weight:900; cursor:pointer;">' +
                  '카시트 고르러 가기</div>') +
        '</div>';
    }


    /* ⚠️ 6초마다 카드를 통째로 다시 그렸다. 읽는 중에 카드가 깜빡이고,
          위 카드 높이가 바뀌면 화면이 들썩였다. 적어둔 값이 바뀌었을 때만 다시 그린다. */
    var lastSig = null;
    function sig() {
        return [localStorage.getItem("tosil_stroller_own"), localStorage.getItem("tosil_carseat_own"),
                localStorage.getItem("tosil_stroller_car"), localStorage.getItem("tosil_trunk_depth"),
                localStorage.getItem("tosil_plan_cache"), localStorage.getItem("tosil_is_founder"),
                localStorage.getItem("tosil_is_master"), localStorage.getItem("firebase_uid")].join("|");
    }
    function paintIfChanged() {
        if (document.hidden) return;
        if (sig() === lastSig && (document.getElementById(ID) || !myStroller())) return;
        paint();
    }

    function paint() {
        lastSig = sig();
        var old = document.getElementById(ID);
        var h = html();

        if (!h) { if (old) old.remove(); return; }

        var box = document.createElement("div");
        box.innerHTML = h;
        if (old) { old.parentNode.replaceChild(box.firstChild, old); }
        else {
            var pane = document.getElementById("view-stroller-use");
            if (!pane) return;
            /* '우리 유모차' 바로 밑. 같은 제품 얘기라 붙어 있어야 한다. */
            var own = document.getElementById("stroller-own");
            if (own && own.parentNode === pane) pane.insertBefore(box.firstChild, own.nextSibling);
            else pane.appendChild(box.firstChild);
        }
        try { if (typeof window.refreshPlusMark === "function") window.refreshPlusMark(); } catch (e) {}
    }

    window.refreshStrollerMatch = paint;

    function boot() {
        setTimeout(paint, 900);
        setTimeout(paint, 2400);
        setInterval(paintIfChanged, 6000);

        ["pickMyStroller", "closeStrollerSheet", "switchStrollerTab"].forEach(function (n) {
            var f = window[n];
            if (typeof f !== "function" || f.__match) return;
            var w = function () { var o = f.apply(this, arguments); setTimeout(paint, 100); return o; };
            w.__match = true;
            window[n] = w;
        });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    window.strollerMatchDebug = function () {
        var st = myStroller(), seat = mySeatName();
        console.log("내 유모차:", st ? st.name : "안 고름");
        console.log("내 카시트:", seat || "안 고름");
        console.log("adapter 값:", st && st.adapter ? st.adapter : "없음");
        console.log("카시트 계열:", seatFamily(seat) || "모름");
        console.log("판정:", verdict(st, seat));
        console.log("PLUS:", isPlus());
    };
})();