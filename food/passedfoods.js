/* ============================================================
   배냇함 — 이미 먹여본 재료 등록 (passedfoods.js)

   초기 이유식 식단표는 '아직 안 먹여본 재료'부터 짠다.
   그런데 앱을 오늘 깔았는데 아기는 이미 두 달째 이유식 중이면,
   달력이 비어 있어서 앱은 아무것도 모른다.

   그러면 이미 통과한 소고기를 다시 "새 알레르기 테스트" 로 띄운다.
   부모 입장에서는 앱이 헛소리를 하는 거다.

   그래서 식단표를 만들기 전에 한 번 물어본다.
   "지금까지 먹여본 재료를 골라주세요."

   ⚠️ 초기·중기일 때만 뜬다. 후기·완료기는 이미 다 먹어봤다.
   ⚠️ 한 번 등록하면 다시 안 뜬다.
   ⚠️ 등록은 달력(tosil_food_calendar)에 그대로 들어간다.
      앱 안의 다른 곳과 같은 창고를 쓴다. 따로 만들지 않는다.

   index.html 에서 app.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var CAL = "tosil_food_calendar";
    var DONE = "tosil_passed_asked";
    var BLUE = "#3182F6", GRAY = "#8B95A1", DARK = "#191F28", GREEN = "#1F9D6B";
    var ID = "passed-foods", SHEET = "passed-sheet";

    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    /* 초기·중기에 흔히 쓰는 재료. 여기 없는 건 달력에서 직접 적으시면 된다. */
    var FOODS = {
        "곡류":   ["쌀", "찹쌀", "오트밀", "감자", "고구마"],
        "고기·단백": ["소고기", "닭안심", "달걀 노른자", "두부", "대구살"],
        "채소":   ["애호박", "브로콜리", "청경채", "양배추", "당근", "단호박",
                  "시금치", "비타민", "콜리플라워", "무", "양파", "비트", "아욱"],
        "과일":   ["사과", "배", "바나나", "복숭아", "토마토"]
    };

    function cal() {
        try { return JSON.parse(localStorage.getItem(CAL)) || {}; } catch (e) { return {}; }
    }

    function passed() {
        var db = cal(), out = [];
        Object.keys(db).forEach(function (day) {
            (db[day] || []).forEach(function (r) {
                if (r && r.type === "test" && r.status === "pass" && r.ingredient) out.push(r.ingredient);
            });
        });
        return out;
    }

    function stage() {
        var el = document.getElementById("food-age");
        return el ? el.value : "early";
    }

    /* ---------- 고르는 창 ---------- */

    var picked = [];

    window.togglePassed = function (name) {
        var i = picked.indexOf(name);
        if (i > -1) picked.splice(i, 1); else picked.push(name);
        paintSheet();
    };

    window.openPassedSheet = function () {
        picked = passed().slice();
        var old = document.getElementById(SHEET);
        if (old) old.remove();
        var wrap = document.createElement("div");
        wrap.id = SHEET;
        wrap.setAttribute("style",
            "position:fixed; inset:0; z-index:100030; background:#FFFFFF; " +
            "overflow-y:auto; -webkit-overflow-scrolling:touch;");
        document.body.appendChild(wrap);
        paintSheet();
    };

    window.closePassedSheet = function () {
        var el = document.getElementById(SHEET);
        if (el) el.remove();
        paint();
    };

    window.savePassed = function () {
        var db = cal();
        var today = new Date();
        var key = today.getFullYear() + "-" +
                  String(today.getMonth() + 1).padStart(2, "0") + "-" +
                  String(today.getDate()).padStart(2, "0");

        // 이미 달력에 있는 건 건드리지 않는다. 없는 것만 오늘 날짜로 채운다.
        var already = passed();
        var add = picked.filter(function (n) { return already.indexOf(n) === -1; });
        if (add.length) {
            if (!db[key]) db[key] = [];
            add.forEach(function (n) {
                // ⚠️ time 은 화면에 그대로 찍힌다. 숫자를 넣으면 일련번호처럼 보인다.
                db[key].push({ type: "test", ingredient: n, status: "pass",
                               memo: "이미 먹여본 재료로 등록", time: "" });
            });
            try { localStorage.setItem(CAL, JSON.stringify(db)); } catch (e) {}
        }
        try { localStorage.setItem(DONE, "1"); } catch (e) {}

        window.closePassedSheet();
        if (typeof window.renderAutoPilotUI === "function") window.renderAutoPilotUI();
        alert(picked.length + "가지를 등록했어요.\n이제 이미 먹여본 재료는 '새 테스트'로 안 뜹니다.");
    };

    function paintSheet() {
        var wrap = document.getElementById(SHEET);
        if (!wrap) return;

        var groups = Object.keys(FOODS).map(function (g) {
            return '<div style="margin-bottom:18px;">' +
                '<div style="font-size:12px; font-weight:900; color:' + GRAY + '; ' +
                    'letter-spacing:1px; margin-bottom:9px;">' + esc(g) + '</div>' +
                '<div style="display:flex; flex-wrap:wrap; gap:7px;">' +
                FOODS[g].map(function (n) {
                    var on = picked.indexOf(n) > -1;
                    return '<div onclick="window.togglePassed(\'' + n + '\')" ' +
                        'style="padding:10px 13px; border-radius:11px; cursor:pointer; ' +
                        'font-size:13px; font-weight:800; ' +
                        (on ? 'background:' + GREEN + '; color:#FFFFFF; border:1px solid ' + GREEN + ';'
                            : 'background:#F9FAFB; color:#4E5968; border:1px solid #E5E8EB;') + '">' +
                        (on ? "✓ " : "") + esc(n) + '</div>';
                }).join("") +
                '</div></div>';
        }).join("");

        wrap.innerHTML =
        '<div style="max-width:480px; margin:0 auto; padding:20px 20px 120px;">' +
            '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">' +
                '<div style="font-size:18px; font-weight:900; color:' + DARK + ';">🥄 지금까지 먹여본 재료</div>' +
                '<span onclick="window.closePassedSheet()" style="font-size:24px; font-weight:300; ' +
                    'color:' + GRAY + '; cursor:pointer; line-height:1; padding:0 4px;">×</span>' +
            '</div>' +
            '<div style="font-size:13px; font-weight:600; color:' + GRAY + '; ' +
                'line-height:1.7; margin-bottom:20px; word-break:keep-all;">' +
                '탈 없이 먹여본 것만 골라주세요. 이미 통과한 재료를 <b>다시 테스트로 띄우지 않기 위해서</b>예요.<br>' +
                '<b>이상이 있었던 재료는 고르지 마세요.</b> 그건 달력에서 따로 기록해 주세요.</div>' +
            groups +
        '</div>' +

        '<div style="position:fixed; left:0; right:0; bottom:0; background:#FFFFFF; ' +
            'border-top:1px solid #E5E8EB; padding:14px 20px calc(14px + env(safe-area-inset-bottom, 0px));">' +
            '<div style="max-width:480px; margin:0 auto;">' +
                '<div onclick="window.savePassed()" style="text-align:center; padding:17px; ' +
                    'background:' + DARK + '; color:#FFFFFF; border-radius:14px; ' +
                    'font-size:15.5px; font-weight:900; cursor:pointer;">' +
                    picked.length + '가지 등록하기</div>' +
            '</div>' +
        '</div>';
    }

    /* ---------- 식단표 위의 안내 줄 ---------- */

    function html() {
        var st = stage();
        if (st !== "early" && st !== "mid") return "";       // 후기·완료기는 이미 다 먹어봤다

        var p = passed();
        if (p.length >= 5 || localStorage.getItem(DONE)) {
            if (!p.length) return "";
            return '<div id="' + ID + '" onclick="window.openPassedSheet()" ' +
                'style="background:#EAF7F1; border:1px solid #A7DFC8; border-radius:14px; ' +
                'padding:13px 15px; margin:20px 0 14px; cursor:pointer; ' +
                'display:flex; align-items:center; gap:10px;">' +
                '<div style="font-size:17px; flex-shrink:0;">🥄</div>' +
                '<div style="flex:1; min-width:0;">' +
                    '<div style="font-size:13px; font-weight:900; color:#1F6F52;">' +
                        '먹여본 재료 ' + p.length + '가지</div>' +
                    '<div style="font-size:11px; font-weight:700; color:#4E5968; margin-top:2px; ' +
                        'white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' +
                        esc(p.slice(0, 6).join(" · ")) + (p.length > 6 ? " 외 " + (p.length - 6) + "가지" : "") + '</div>' +
                '</div>' +
                '<div style="font-size:11.5px; font-weight:800; color:#1F6F52; flex-shrink:0;">고치기</div>' +
            '</div>';
        }

        return '<div id="' + ID + '" style="background:#FFF9E6; border:1px solid #FDE68A; ' +
            'border-radius:14px; padding:16px; margin:20px 0 14px;">' +
            '<div style="font-size:14px; font-weight:900; color:#8A6D00; margin-bottom:6px;">' +
                '🥄 지금까지 먹여본 재료가 있나요?</div>' +
            '<div style="font-size:12.5px; font-weight:600; color:#4E5968; ' +
                'line-height:1.7; margin-bottom:12px; word-break:keep-all;">' +
                '식단표는 <b>아직 안 먹여본 재료</b>부터 짭니다. ' +
                '이미 소고기를 먹여보셨는데 앱이 모르면, 소고기를 또 "새 테스트"로 띄워요.<br>' +
                '한 번만 골라주시면 그런 일이 없습니다.</div>' +
            '<div onclick="window.openPassedSheet()" style="text-align:center; padding:14px; ' +
                'background:#8A6D00; color:#FFFFFF; border-radius:12px; ' +
                'font-size:14px; font-weight:900; cursor:pointer;">먹여본 재료 고르기</div>' +
        '</div>';
    }

    function paint() {
        var el = document.getElementById(ID);
        var box = document.createElement("div");
        box.innerHTML = html();
        if (el) {
            if (box.firstChild) el.parentNode.replaceChild(box.firstChild, el);
            else el.remove();
            return;
        }
        if (!box.firstChild) return;

        /* ⚠️ autopilot-result-container 앞에 넣으면, 식단표를 만들 때
              검은 PLUS 카드가 사라지면서 이 카드가 위로 올라가 보인다.
              그래서 검은 카드보다 더 위, 서브탭 바로 아래에 고정한다. */
        var host = document.getElementById("autopilot-result-container");
        if (!host || !host.parentNode) return;

        var anchor = host;
        var sib = host.previousElementSibling;
        for (var i = 0; i < 3 && sib; i++) {
            var t = sib.textContent || "";
            if (t.indexOf("식단표 자동 생성") > -1 || t.indexOf("배냇함 PLUS") > -1) { anchor = sib; break; }
            sib = sib.previousElementSibling;
        }
        anchor.parentNode.insertBefore(box.firstChild, anchor);
    }

    function boot() {
        setTimeout(paint, 700);
        setTimeout(paint, 2000);
        var sel = document.getElementById("food-age");
        if (sel) sel.addEventListener("change", function () { setTimeout(paint, 60); });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    window.passedDebug = function () {
        console.log("단계:", stage());
        var p = passed();
        console.log("통과한 재료:", p.length + "가지");
        console.log("  " + (p.join(", ") || "없음"));
        console.log("등록 물어봤나:", !!localStorage.getItem(DONE));
    };
})();