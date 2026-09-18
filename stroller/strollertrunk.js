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

        var depthLeft  = car.limitDepth  - longest;
        var heightLeft = car.limitHeight - shortest;

        var kind;
        if (depthLeft < 0 || heightLeft < 0) kind = "no";
        else if (depthLeft < 8 || heightLeft < 5) kind = "tight";
        else kind = "ok";

        return {
            kind: kind, car: car, dims: d,
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
                '<b>' + esc(st.name) + '</b> 는 접으면 ' +
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
                body = '<b>' + esc(r.car.name) + '</b> 에 <b>' + esc(st.name) + '</b> 는 ' +
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
                   '<div style="margin-top:12px; font-size:11.5px; font-weight:600; color:' + GRAY + '; ' +
                   'line-height:1.7; word-break:keep-all;">' +
                   '같은 차종도 연식·트림·스페어타이어 유무에 따라 다릅니다. ' +
                   '<b>재본 값이지 보증이 아니에요.</b></div>' +
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
        setInterval(paint, 6000);
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