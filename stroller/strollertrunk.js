/* ============================================================
   배냇함 PLUS — 우리 차에 들어가나 (strollertrunk.js)

   유모차 큐레이터의 간판 기능이 '3D 트렁크 테트리스' 다.
   그런데 그건 '고르기' 탭에만 있다. 살 때 한 번 쓰고 끝이다.

   정작 부모가 다시 묻는 순간은 산 뒤에 온다.

       차를 바꿨을 때        "지금 유모차가 새 차에 들어가나"
       렌터카 · 카셰어링     "쏘카 아반떼 빌렸는데 실리나"
       친정 차로 갈 때       "장인어른 차에 될까"
       짐이 많을 때          "유모차 넣고 캐리어도 들어가나"

   그때마다 다시 '고르기' 탭에 들어가서 49종에서 내 걸 찾아
   차종을 다시 고르는 사람은 없다. 그냥 가서 부딪혀 본다.

   ⚠️ 새로 계산하지 않는다.
      carDB(트렁크 치수)와 foldedDims(접었을 때 크기)는 이미 있다.
      '우리 유모차' 도 이미 등록돼 있다. 셋을 잇기만 한다.

   ⚠️ "들어갑니다" 라고 단정하지 않는다.
      같은 차종도 연식·트림·옵션(스페어타이어·서브우퍼)에 따라 다르다.
      치수로 재서 '될 것 같다 / 빠듯하다 / 어렵다' 까지만 말한다.

   ⚠️ 시트를 빼야 접히는 제품은 그걸 같이 말한다.
      치수만 맞아도 매번 시트를 분리해야 하면 그건 다른 얘기다.

   index.html 에서 strollermatch.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var ID   = "stroller-trunk";
    var KEY  = "tosil_stroller_car";
    var GRAY = "#8B95A1", DARK = "#191F28", GREEN = "#1F9D6B", GOLD = "#8A6D00", RED = "#C62828";

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

    function cars() {
        try { if (typeof carDB !== "undefined" && carDB) return carDB; } catch (e) {}
        return window.carDB || {};
    }
    function strollers() {
        try { if (typeof strollerData !== "undefined" && strollerData) return strollerData; } catch (e) {}
        return window.strollerData || [];
    }

    function myStroller() {
        var o = {};
        try { o = JSON.parse(localStorage.getItem("tosil_stroller_own")) || {}; } catch (e) {}
        var n = o.name || o.name2 || "";
        if (!n) return null;
        return strollers().filter(function (s) { return s.name === n; })[0] || null;
    }

    function myCar() { return localStorage.getItem(KEY) || ""; }

    /* ⚠️ carDB 의 트렁크 치수는 웹에서 모은 값이다. 제조사 공식 제원이 아니다.
          같은 차종도 연식·트림·스페어타이어·서브우퍼 유무로 달라진다.

          우리 숫자가 틀리면 "들어갑니다" 를 믿고 갔다가 트렁크 앞에서 낭패를 본다.
          그래서 직접 잰 값을 받아 그걸 먼저 쓴다.
          줄자 한 번이면 우리 추정치보다 정확하다. */
    var MY_DEPTH = "tosil_trunk_depth";

    function myDepth() {
        var v = parseFloat(localStorage.getItem(MY_DEPTH));
        return (isFinite(v) && v > 20 && v < 250) ? v : null;
    }

    window.setTrunkDepth = function () {
        var cur = myDepth();
        var a = window.prompt(
            "트렁크를 열고 안쪽 깊이를 재주세요.\n" +
            "뒷좌석 등받이부터 트렁크 문까지, 가장 긴 쪽입니다. (cm, 숫자만)",
            cur === null ? "" : String(cur));
        if (a === null) return;
        var v = parseFloat(String(a).replace(/[^0-9.]/g, ""));
        if (!isFinite(v) || v <= 0) {
            if (String(a).trim() === "") { try { localStorage.removeItem(MY_DEPTH); } catch (e) {} paint(); }
            return;
        }
        try { localStorage.setItem(MY_DEPTH, String(v)); } catch (e) {}
        paint();
    };

    window.setStrollerCar = function (key) {
        try {
            if (key) localStorage.setItem(KEY, key);
            else localStorage.removeItem(KEY);
        } catch (e) {}
        paint();
    };

    /* ---------- 판정 ----------
       접은 유모차를 눕혀 넣는다고 본다.
       제일 긴 변이 트렁크 '깊이' 를 넘으면 안 되고,
       제일 짧은 변이 입구 '높이' 를 넘으면 안 된다. -------- */

    function fit(st, carKey) {
        var car = cars()[carKey];
        if (!car || !st || !Array.isArray(st.foldedDims) || st.foldedDims.length < 3) return null;

        var d = st.foldedDims.slice().sort(function (a, b) { return b - a; });   // 큰 순
        var longest = d[0], shortest = d[2];

        var mine = myDepth();
        var depth = (mine !== null) ? mine : car.limitDepth;

        var depthLeft  = depth - longest;
        var heightLeft = car.limitHeight - shortest;

        var kind;
        if (depthLeft < 0 || heightLeft < 0) kind = "no";
        else if (depthLeft < 8 || heightLeft < 5) kind = "tight";
        else kind = "ok";

        return {
            kind: kind, car: car, dims: d, measured: (mine !== null),
            depthLeft: Math.round(depthLeft), heightLeft: Math.round(heightLeft)
        };
    }

    /* ---------- 화면 ---------- */

    function carPicker(cur) {
        var db = cars();
        return '<div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:12px;">' +
            Object.keys(db).map(function (k) {
                var on = (k === cur);
                return '<div onclick="window.setStrollerCar(\'' + k + '\')" ' +
                    'style="padding:9px 12px; border-radius:11px; cursor:pointer; ' +
                    'font-size:12.5px; font-weight:800; ' +
                    (on ? 'background:' + DARK + '; color:#FFFFFF; border:1px solid ' + DARK + ';'
                        : 'background:#F9FAFB; color:#4E5968; border:1px solid #E5E8EB;') + '">' +
                    esc(db[k].name) + '</div>';
            }).join("") +
        '</div>';
    }

    function html() {
        var st = myStroller();
        if (!st || !Array.isArray(st.foldedDims)) return "";

        var plus = isPlus();
        var carKey = myCar();

        if (!plus) {
            return '<div id="' + ID + '" class="matrix-panel" style="margin-bottom:14px;">' +
                '<div class="matrix-header" data-plus-head style="font-size:14.5px; font-weight:900; ' +
                    'color:' + DARK + ';">🚗 우리 차에 들어가나</div>' +
                '<div style="margin-top:6px; font-size:12.5px; font-weight:600; color:' + GRAY + '; ' +
                    'line-height:1.75; word-break:keep-all;">' +
                    '차를 바꿨거나, 렌터카를 빌렸거나, 친정 차로 갈 때.<br>' +
                    '<b>' + esc(st.name) + '</b> 접은 크기로 <b>차종별로 재드려요.</b>' +
                '</div>' +
                '<div style="margin-top:13px; background:#FFF9E6; border:1px solid #F5E1A4; ' +
                    'border-radius:13px; padding:15px;">' +
                    '<div style="font-size:13px; font-weight:900; color:' + GOLD + ';">' +
                        '차종 10개로 미리 재보기는 PLUS에서</div>' +
                    '<div style="margin-top:5px; font-size:12px; font-weight:600; color:' + GOLD + '; ' +
                        'line-height:1.75; word-break:keep-all;">' +
                        '가서 트렁크 열고 안 들어가는 걸 아는 것만큼 난감한 게 없어요.</div>' +
                '</div>' +
            '</div>';
        }

        var r = carKey ? fit(st, carKey) : null;
        var body, tone = GRAY, bg = "", bd = "";

        if (!r) {
            body = '<div style="font-size:12.5px; font-weight:600; color:' + GRAY + '; ' +
                'line-height:1.75; word-break:keep-all;">' +
                '<b>' + esc(st.name) + '</b>' + pp(st.name, "은/는") + ' 접으면 ' +
                esc(st.foldedDims.join(" × ")) + 'cm 예요.<br>' +
                '어느 차에 실을지 골라주세요.</div>' + carPicker(carKey);
        } else {
            var head;
            if (r.kind === "ok") {
                tone = GREEN; bg = "#EAF7F1"; bd = "#A7DFC8";
                head = "들어갈 것 같아요";
                body = '<b>' + esc(r.car.name) + '</b> 트렁크에 <b>' + esc(st.name) + '</b>.<br>' +
                       '깊이로 <b>' + r.depthLeft + 'cm</b>, 높이로 <b>' + r.heightLeft + 'cm</b> 남습니다.';
            } else if (r.kind === "tight") {
                tone = GOLD; bg = "#FFF9E6"; bd = "#FDE68A";
                head = "빠듯합니다";
                body = '<b>' + esc(r.car.name) + '</b>에 <b>' + esc(st.name) + '</b>' + pp(st.name, "은/는") + ' ' +
                       '깊이 <b>' + r.depthLeft + 'cm</b> · 높이 <b>' + r.heightLeft + 'cm</b> 여유뿐이에요.<br>' +
                       '들어가도 <b>다른 짐은 못 넣습니다.</b> 장 보는 날은 뒷좌석을 비워두세요.';
            } else {
                tone = RED; bg = "#FFF2F2"; bd = "#FCA5A5";
                head = "이 차엔 어렵습니다";
                body = '<b>' + esc(st.name) + '</b> 접은 크기가 <b>' + esc(r.car.name) + '</b> 트렁크보다 큽니다.<br>' +
                       '뒷좌석을 접거나, 나들이용 가벼운 유모차를 따로 두는 쪽이 현실적이에요.';
            }

            /* ⚠️ 시트를 빼야 접히는 제품은 치수가 맞아도 얘기가 다르다. */
            var hardFold = /분리|불가|번거/.test(String(st.specs && st.specs.folding || ""));
            if (hardFold && r.kind !== "no") {
                body += '<br><br><span style="color:' + GOLD + ';">⚠️ 이 제품은 <b>' +
                        esc(st.specs.folding) + '</b> 이에요. ' +
                        '치수는 맞아도 매번 시트를 빼야 합니다.</span>';
            }

            body = '<div style="font-size:12.5px; font-weight:600; color:#4E5968; ' +
                   'line-height:1.8; word-break:keep-all;">' + body + '</div>' +
                   (r.measured
                        ? '<div style="margin-top:12px; padding:12px 14px; background:#EAF7F1; ' +
                          'border:1px solid #A7DFC8; border-radius:12px; font-size:11.5px; ' +
                          'font-weight:700; color:#1F6F52; line-height:1.7;">' +
                          '✅ <b>직접 재신 ' + myDepth() + 'cm</b> 로 계산했어요. ' +
                          '<span onclick="window.setTrunkDepth()" style="text-decoration:underline; ' +
                          'cursor:pointer;">다시 재기</span></div>'
                        : '<div style="margin-top:12px; padding:13px 14px; background:#FFF9E6; ' +
                          'border:1px solid #FDE68A; border-radius:12px; font-size:11.5px; ' +
                          'font-weight:700; color:' + GOLD + '; line-height:1.75; word-break:keep-all;">' +
                          '⚠️ 이 트렁크 치수는 <b>저희가 모은 추정값</b>이에요. 제조사 공식 제원이 아닙니다.<br>' +
                          '연식·트림·스페어타이어에 따라 달라서, <b>줄자로 한 번 재면 훨씬 정확합니다.</b><br>' +
                          '<span onclick="window.setTrunkDepth()" style="display:inline-block; margin-top:9px; ' +
                          'padding:10px 14px; background:' + DARK + '; color:#FFFFFF; border-radius:10px; ' +
                          'font-weight:900; cursor:pointer;">우리 차 깊이 직접 재서 넣기</span></div>') +
                   carPicker(carKey);

            return '<div id="' + ID + '" class="matrix-panel" style="background:' + bg + '; ' +
                'border:1px solid ' + bd + '; margin-bottom:14px;">' +
                '<div class="matrix-header" data-plus-head style="font-size:14.5px; font-weight:900; ' +
                    'color:' + tone + ';">🚗 ' + esc(head) + '</div>' +
                '<div style="margin-top:6px;">' + body + '</div>' +
            '</div>';
        }

        return '<div id="' + ID + '" class="matrix-panel" style="margin-bottom:14px;">' +
            '<div class="matrix-header" data-plus-head style="font-size:14.5px; font-weight:900; ' +
                'color:' + DARK + ';">🚗 우리 차에 들어가나</div>' +
            '<div style="margin-top:6px;">' + body + '</div>' +
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
            var after = document.getElementById("stroller-match") ||
                        document.getElementById("stroller-own");
            if (after && after.parentNode === pane) pane.insertBefore(box.firstChild, after.nextSibling);
            else pane.appendChild(box.firstChild);
        }
        try { if (typeof window.refreshPlusMark === "function") window.refreshPlusMark(); } catch (e) {}
    }

    window.refreshStrollerTrunk = paint;

    function boot() {
        setTimeout(paint, 1100);
        setTimeout(paint, 2600);
        setInterval(paintIfChanged, 6000);
        ["pickMyStroller", "closeStrollerSheet", "switchStrollerTab"].forEach(function (n) {
            var f = window[n];
            if (typeof f !== "function" || f.__trunk) return;
            var w = function () { var o = f.apply(this, arguments); setTimeout(paint, 100); return o; };
            w.__trunk = true;
            window[n] = w;
        });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    window.strollerTrunkDebug = function () {
        var st = myStroller();
        console.log("내 유모차:", st ? st.name : "안 고름");
        console.log("접은 크기:", st ? st.foldedDims : "-");
        console.log("고른 차:", myCar() || "없음");
        console.log("판정:", myCar() ? fit(st, myCar()) : "-");
        if (st) {
            console.log("── 차종별 ──");
            Object.keys(cars()).forEach(function (k) {
                var r = fit(st, k);
                if (r) console.log("   " + cars()[k].name.padEnd(12) +
                    (r.kind === "ok" ? "✅ 들어감" : r.kind === "tight" ? "🟡 빠듯" : "🔴 어려움") +
                    "  깊이 " + r.depthLeft + " / 높이 " + r.heightLeft);
            });
        }
    };
})();