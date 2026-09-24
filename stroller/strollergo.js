/* ============================================================
   배냇함 PLUS — 오늘 어디 가세요 (strollergo.js)

   유모차 PLUS 가 약했던 이유를 짚어봤다.

       카시트 얹히나    한 번 보면 끝
       우리 차에 들어가나  차 바꿀 때만
       무게 계산        한 번 보면 끝

   전부 '한 번 보고 끝나는 것' 이었다.
   한 달에 한 번도 안 여는 걸 월 구독으로 파는 셈이다.

   부모가 유모차 때문에 매번 고민하는 순간은 딱 하나다.

       "오늘 가져갈까, 아기띠로 갈까"

   그게 목적지마다 다르다. 백화점은 되는데 지하철은 아니고,
   공원은 좋은데 좁은 식당은 밖에 세워야 한다.
   그걸 판단하려면 내 유모차의 무게·폭·접는 방식·노면을 다 알아야 하는데,
   그건 살 때 한 번 보고 잊는다.

   ⚠️ 새 데이터를 안 만든다.
      width · weight · road · folding · flight · trunk · joint · foldedDims
      전부 data.js 에 이미 있다. 그런데 '고르기' 탭에서만 쓰였다.
      살 때 쓰고 버리던 걸 매번 나갈 때 쓰게 한다.

   ⚠️ "가져가세요 / 두고 가세요" 로 단정하지 않는다.
      그 집 사정(엘리베이터, 동행, 아기 컨디션)은 우리가 모른다.
      무엇이 걸리는지만 짚고 고르는 건 부모가 한다.

   ⚠️ 아기띠를 권하는 기준은 무게 하나로만 하지 않는다.
      10kg 유모차라도 엘리베이터가 있으면 괜찮다.
      '계단을 만나면' 이라는 조건을 붙여서 말한다.

   index.html 에서 strollertrunk.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var ID   = "stroller-go";
    var KEY  = "tosil_stroller_go";       // 마지막으로 고른 목적지
    var GRAY = "#8B95A1", DARK = "#191F28";
    var GREEN = "#1F9D6B", GOLD = "#8A6D00", RED = "#C62828";

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

    function strollers() {
        try { if (typeof strollerData !== "undefined" && strollerData) return strollerData; } catch (e) {}
        return window.strollerData || [];
    }

    function mine() {
        var o = {};
        try { o = JSON.parse(localStorage.getItem("tosil_stroller_own")) || {}; } catch (e) {}
        var n = o.name || o.name2 || "";
        if (!n) return null;
        return strollers().filter(function (s) { return s.name === n; })[0] || null;
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

    /* ---------- 목적지 ---------- */

    var PLACES = [
        { id: "mall",   icon: "🏬", name: "백화점 · 마트" },
        { id: "metro",  icon: "🚇", name: "지하철 · 버스" },
        { id: "park",   icon: "🌳", name: "공원 · 산책" },
        { id: "eat",    icon: "🍽️", name: "식당 · 카페" },
        { id: "car",    icon: "🚗", name: "차로 이동" },
        { id: "trip",   icon: "✈️", name: "여행 · 비행기" }
    ];

    // 받침에 맞는 '로/으로' (웨건으로 · 그램플러스로)
    function ro(w) {
        var t = String(w || "").trim(), ch = t.charCodeAt(t.length - 1);
        if (!(ch >= 0xAC00 && ch <= 0xD7A3)) return "로";
        var jong = (ch - 0xAC00) % 28;
        return (jong === 0 || jong === 8) ? "로" : "으로";     // 받침 없음 · ㄹ 받침이면 '로'
    }

    function place() { return localStorage.getItem(KEY) || "mall"; }

    window.setStrollerGo = function (id) {
        try { localStorage.setItem(KEY, id); } catch (e) {}
        paint();
    };

    /* ---------- 판단 ----------
       ⚠️ 여기가 이 파일의 전부다. 새로 계산하는 게 아니라
          이미 있는 값을 목적지에 맞게 꺼내 읽어준다. -------- */

    function num(v) { var n = parseFloat(v); return isFinite(n) ? n : null; }

    function lines(st, where) {
        var out = [];
        var w   = num(st.specs && st.specs.weight);
        var wd  = num(st.width);
        var fd  = Array.isArray(st.foldedDims) ? st.foldedDims : null;
        var fold = String(st.specs && st.specs.folding || "");
        var cab = String(st.specs && st.specs.cabin || "");
        var hardFold = /분리|불가|번거/.test(fold);

        var add = function (tone, t, d) { out.push({ tone: tone, t: t, d: d }); };

        if (where === "mall") {
            if (wd !== null) {
                add(wd >= 60 ? GOLD : GREEN,
                    "폭 " + wd + "cm",
                    wd >= 60
                        ? "매장 사이 좁은 통로나 옷걸이 사이는 지나기 어려울 수 있어요. 큰 통로로 도세요."
                        : "매장 통로는 무난합니다.");
            }
            add(GRAY, "엘리베이터",
                "주말 백화점 엘리베이터는 유모차로 두세 번 보내는 게 보통이에요. " +
                "<b>시간을 넉넉히</b> 잡으세요.");
            if (st.trunk) add(GRAY, "주차", esc(st.trunk) + " · 지하주차장에서 바로 밀고 들어가면 제일 편합니다.");

        } else if (where === "metro") {
            if (w !== null) {
                add(w >= 10 ? RED : w >= 7 ? GOLD : GREEN,
                    w + "kg",
                    w >= 10
                        ? "<b>계단을 만나면 혼자 못 듭니다.</b> 엘리베이터 위치를 미리 보고 가세요. " +
                          "환승이 있으면 <b>아기띠가 나을 수 있어요.</b>"
                        : w >= 7
                        ? "계단 한 층 정도는 들 수 있지만 환승이 겹치면 힘듭니다."
                        : "가벼운 편이라 계단을 만나도 버틸 만합니다.");
            }
            if (wd !== null) {
                add(wd >= 58 ? GOLD : GREEN, "개찰구 폭",
                    wd >= 58
                        ? "일반 개찰구(약 55cm)는 빠듯합니다. <b>넓은 개찰구</b>를 찾으세요."
                        : "일반 개찰구를 지날 수 있는 폭입니다.");
            }
            add(GRAY, "버스",
                "저상버스가 아니면 <b>접어서 들고 타야</b> 합니다." +
                (hardFold ? " 이 제품은 <b>" + esc(fold) + "</b> 이라 버스 안에서는 어렵습니다." : ""));

        } else if (where === "park") {
            if (st.road) add(GREEN, "노면", esc(st.road) + " · 산책로에 잘 맞습니다.");
            add(GRAY, "챙길 것",
                "그늘이 없는 구간에서는 <b>차양을 펴고</b> 다니세요. " +
                "담요로 덮으면 안쪽 온도가 빠르게 올라갑니다.");
            add(GRAY, "브레이크",
                "경사진 산책로에서 손을 뗄 때는 <b>발로 브레이크를 확인</b>하세요.");

        } else if (where === "eat") {
            if (fd) {
                var sum = fd.reduce(function (a, b) { return a + b; }, 0);
                add(sum >= 190 ? GOLD : GREEN,
                    "접으면 " + fd.join(" × ") + "cm",
                    sum >= 190
                        ? "좁은 가게는 <b>밖에 세워두셔야</b> 할 수 있어요. 들어가기 전에 물어보세요."
                        : "가게 구석에 세워둘 만한 크기입니다.");
            }
            if (hardFold) add(GOLD, "접기", esc(fold) + " · 자리에서 접기는 번거롭습니다.");
            var m = monthsOld();
            if (m !== null && m >= 6)
                add(GRAY, "아기 의자",
                    esc(nm("가")) + " " + m + "개월이면 <b>하이체어가 있는지</b> 미리 물어보는 게 편해요.");

        } else if (where === "car") {
            if (typeof window.refreshStrollerTrunk === "function")
                add(GRAY, "트렁크", "아래 <b>우리 차에 들어가나</b> 카드에서 차종별로 재보실 수 있어요.");
            if (hardFold) add(GOLD, "접기", esc(fold) + " · 주차장에서 아기 안고 하기엔 손이 많이 갑니다.");
            if (st.joint) add(GOLD, "들어 올릴 때", esc(st.joint));
            if (typeof window.strollerMatchDebug === "function")
                add(GRAY, "카시트", "카시트가 얹히면 <b>잠든 아기를 안 깨우고</b> 옮길 수 있어요.");

        } else if (where === "trip") {
            add(cab.indexOf("⭕") > -1 ? GOLD : RED,
                "기내 " + esc(cab || "정보 없음"),
                cab.indexOf("⭕") > -1
                    ? "표시는 기내 가능이지만 <b>항공사마다 규격이 다릅니다.</b> 표를 끊기 전에 물어보세요."
                    : "<b>게이트에서 부치셔야</b> 합니다. 유모차는 화물칸에서 제일 잘 망가지는 물건이에요. " +
                      "<b>커버를 씌우면</b> 손상이 줄어듭니다.");
            if (st.flight) add(GRAY, "현지에서", esc(st.flight));
            if (w !== null && w >= 8)
                add(GOLD, w + "kg",
                    "공항은 걷는 거리가 깁니다. 무거우면 <b>가벼운 휴대용을 따로</b> 쓰는 집도 많아요.");
        }

        return out;
    }

    /* ---------- 화면 ---------- */

    /* ⚠️ 칩 길이가 제각각이라 줄이 2-1-2-1 로 들쭉날쭉했다 (폰에서 특히).
          여섯 개뿐이라 가로 스와이프로 숨기는 것보다 한눈에 다 보이는 쪽이 낫다.
          반반씩 고정하고, 아이콘 자리를 맞춰 글자 시작점을 같게 한다. */
    function chips(cur) {
        return '<div style="display:grid; grid-template-columns:1fr 1fr; gap:7px; margin-top:12px;">' +
            PLACES.map(function (p) {
                var on = (p.id === cur);
                return '<div onclick="window.setStrollerGo(\'' + p.id + '\')" ' +
                    'style="display:flex; align-items:center; gap:7px; padding:12px 12px; ' +
                    'border-radius:12px; cursor:pointer; font-size:12.5px; font-weight:800; ' +
                    'line-height:1.35; word-break:keep-all; box-sizing:border-box; ' +
                    (on ? 'background:' + DARK + '; color:#FFFFFF; border:1px solid ' + DARK + ';'
                        : 'background:#F9FAFB; color:#4E5968; border:1px solid #E5E8EB;') + '">' +
                    '<span style="flex-shrink:0; width:18px; text-align:center;">' + p.icon + '</span>' +
                    '<span style="flex:1; min-width:0;">' + esc(p.name) + '</span></div>';
            }).join("") +
        '</div>';
    }

    /* ⚠️ 왼쪽 라벨이 78px 을 먹어서 폰에서는 설명이 세 줄로 접혔다.
          라벨을 위로 올리면 설명이 한 줄 폭을 다 쓴다. */
    function rowHTML(r) {
        return '<div style="padding:12px 0; border-bottom:1px solid #F2F4F6;">' +
            '<div style="font-size:11.5px; font-weight:900; color:' + r.tone + '; ' +
                'letter-spacing:0.2px; margin-bottom:4px;">' + esc(r.t) + '</div>' +
            '<div style="font-size:12.5px; font-weight:600; color:#4E5968; ' +
                'line-height:1.75; word-break:keep-all;">' + r.d + '</div>' +
        '</div>';
    }

    function html() {
        var st = mine();
        if (!st) return "";

        var cur = place();
        var plus = isPlus();
        var rows = lines(st, cur);
        var show = plus ? rows : rows.slice(0, 1);

        var here = PLACES.filter(function (p) { return p.id === cur; })[0] || PLACES[0];

        /* ⚠️ 이 칸만 흰 상자가 없어서 혼자 맨바닥에 떠 있었다.
              유모차 큐레이터의 다른 칸(우리 유모차 · 트렁크 · 중고 · 최대 체중)은 전부
              .matrix-panel 흰 상자다. 여기도 같은 모양으로 맞춘다. */
        return '<div id="' + ID + '" class="matrix-panel" style="margin-bottom:20px;">' +
            '<div class="matrix-header" data-plus-head>🧭 오늘 어디 가세요</div>' +

            '<div style="font-size:12.5px; font-weight:600; color:' + GRAY + '; ' +
                'margin:-16px 0 0; line-height:1.75; word-break:keep-all;">' +
                '<b>' + esc(st.name) + '</b>' + ro(st.name) + ' ' + esc(here.name) + ' 갈 때 걸리는 것들이에요.<br>' +
                '가져갈지 말지는 직접 정하시고, 저희는 뭐가 걸리는지만 짚어드릴게요.</div>' +

            chips(cur) +

            (show.length
                ? '<div style="margin-top:12px;">' + show.map(rowHTML).join("") + '</div>'
                : '<div style="margin-top:14px; font-size:12.5px; font-weight:700; color:' + GREEN + ';">' +
                  '특별히 걸리는 게 없어요.</div>') +

            (!plus && rows.length > 1
                ? '<div style="margin-top:13px; background:#FFF9E6; border:1px solid #F5E1A4; ' +
                      'border-radius:13px; padding:15px;">' +
                      '<div style="font-size:13px; font-weight:900; color:' + GOLD + ';">' +
                          '나머지 ' + (rows.length - 1) + '가지와 목적지 여섯 곳은 PLUS에서</div>' +
                      '<div style="margin-top:5px; font-size:12px; font-weight:600; color:' + GOLD + '; ' +
                          'line-height:1.75; word-break:keep-all;">' +
                          '가서 계단 앞에 서고 나면 늦습니다. ' +
                          '<b>나가기 전에 3초</b>면 됩니다.</div>' +
                  '</div>'
                : '') +
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
            var pane = document.getElementById("view-stroller-use");
            if (!pane) return;
            pane.insertBefore(box.firstChild, pane.firstChild);   // 맨 위. 나가기 전에 보는 것이다
        }
        try { if (typeof window.refreshPlusMark === "function") window.refreshPlusMark(); } catch (e) {}
    }

    window.refreshStrollerGo = paint;

    function boot() {
        setTimeout(paint, 900);
        setTimeout(paint, 2300);
        ["pickMyStroller", "closeStrollerSheet", "switchStrollerTab"].forEach(function (n) {
            var f = window[n];
            if (typeof f !== "function" || f.__go) return;
            var w = function () { var o = f.apply(this, arguments); setTimeout(paint, 100); return o; };
            w.__go = true;
            window[n] = w;
        });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    window.strollerGoDebug = function () {
        var st = mine();
        if (!st) return console.log("유모차를 아직 안 고르셨습니다");
        console.log("내 유모차:", st.name);
        PLACES.forEach(function (p) {
            var r = lines(st, p.id);
            console.log("  " + p.icon + " " + p.name.padEnd(12) + r.length + "가지");
            r.forEach(function (x) { console.log("       " + x.t); });
        });
    };
})();