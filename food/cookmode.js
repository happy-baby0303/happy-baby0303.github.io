/* ============================================================
   배냇함 — 요리 모드 V2.0 (cookmode.js)
   (텍스트 삭제 버그 픽스 및 프리미엄 뱃지 렌더링 적용)
   ============================================================ */
(function () {
    'use strict';

    var BLUE = "#3182F6";
    var GRAY = "#8B95A1";
    var DARK = "#191F28";

    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    var steps = [], at = 0;

    // ✨ 글씨를 삭제하지 않고, 앞의 숫자("1. ")만 깔끔하게 지우는 함수
    function cleanNum(t) {
        return String(t || "").replace(/^\s*\d+\s*[.)]\s*/, "").trim();
    }

    function minsOf(t) {
        var m = String(t || "").match(/(\d+)\s*분/);
        return m ? parseInt(m[1], 10) : null;
    }

    // ✨ 본문 텍스트 안에서 꿀팁 태그를 찾아 예쁜 뱃지 HTML로 바꿔주는 마법의 함수!
    function formatPremiumBadges(text) {
        let formatted = text;
        
        // (안전) 태그 ➔ 빨간 경고 뱃지로 변환
        formatted = formatted.replace(/\(안전\)/g, 
            `<span style="display:inline-block; background:#FFF0F1; color:#D32F2F; border:1px solid #FECACA; padding:2px 6px; border-radius:6px; font-size:11.5px; font-weight:900; margin-right:4px; transform:translateY(-1px);">🚨 안전필수</span>`
        );
        
        // 💡[초보핵심] 태그 ➔ 노란 꿀팁 뱃지로 변환
        formatted = formatted.replace(/💡\[초보핵심\]/g, 
            `<span style="display:inline-block; background:#FFF9E6; color:#B45309; border:1px solid #FDE68A; padding:2px 6px; border-radius:6px; font-size:11.5px; font-weight:900; margin-right:4px; transform:translateY(-1px);">💡 초보꿀팁</span>`
        );

        return formatted;
    }

    window.cookGo = function (d) {
        var n = at + d;
        if (n < 0 || n >= steps.length) return;
        at = n;
        paint();
    };

    window.cookJump = function (i) { at = i; paint(); };

    function paint() {
        var box = document.getElementById("cook-steps-container");
        if (!box || !steps.length) return;

        var cur = steps[at];
        var bodyText = cleanNum(cur); // 앞의 숫자만 지움
        var bodyHtml = formatPremiumBadges(bodyText); // 예쁜 뱃지로 변환!
        
        var mins = minsOf(cur);
        var last = (at === steps.length - 1);

        var dots = steps.map(function (s, i) {
            var on = (i === at), done = (i < at);
            return '<div onclick="window.cookJump(' + i + ')" ' +
                'style="flex:1; height:6px; border-radius:3px; cursor:pointer; transition:0.3s; ' +
                'background:' + (on ? BLUE : done ? "#C9E2FF" : "#E5E8EB") + ';"></div>';
        }).join("");

        box.innerHTML =
            '<div style="display:flex; gap:5px; margin-bottom:18px;">' + dots + '</div>' +

            '<div style="text-align:center; font-size:13px; font-weight:900; color:' + BLUE + '; ' +
                'letter-spacing:0.5px; margin-bottom:14px;">' +
                'Step ' + (at + 1) + ' / ' + steps.length + '</div>' +

            '<div style="background:#F9FAFB; border:1px solid #E5E8EB; border-radius:20px; ' +
                'padding:30px 24px; min-height:160px; display:flex; align-items:center; ' +
                'justify-content:center; margin-bottom:16px; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">' +
                '<div style="font-size:17px; font-weight:700; color:' + DARK + '; ' +
                    'line-height:1.75; text-align:left; word-break:keep-all;">' + bodyHtml + '</div>' +
            '</div>' +

            (mins
                ? '<button onclick="setCookTimer(' + mins + ')" ' +
                  'style="width:100%; padding:18px; margin-bottom:12px; background:#FFF2F2; ' +
                  'color:#E32636; border:none; border-radius:14px; box-shadow: 0 4px 10px rgba(227,38,54,0.15); ' +
                  'font-size:16px; font-weight:900; cursor:pointer; transition:0.2s;">⏱️ ' + mins + '분 타이머 걸기</button>'
                : '') +

            '<div style="display:flex; gap:10px;">' +
                (at > 0
                    ? '<button onclick="window.cookGo(-1)" style="width:90px; padding:18px 0; ' +
                      'background:#F2F4F6; color:#4E5968; border:none; border-radius:14px; ' +
                      'font-size:15px; font-weight:800; cursor:pointer;">이전</button>'
                    : '') +
                (last
                    ? '<button onclick="closeCookingMode()" style="flex:1; padding:18px 0; ' +
                      'background:#10B981; color:#FFFFFF; border:none; border-radius:14px; box-shadow: 0 4px 10px rgba(16,185,129,0.2); ' +
                      'font-size:16px; font-weight:900; cursor:pointer;">요리 완성 🎉</button>'
                    : '<button onclick="window.cookGo(1)" style="flex:1; padding:18px 0; ' +
                      'background:' + BLUE + '; color:#FFFFFF; border:none; border-radius:14px; box-shadow: 0 4px 10px rgba(49,130,246,0.2); ' +
                      'font-size:16px; font-weight:900; cursor:pointer;">다음 →</button>') +
            '</div>' +

            '<div style="text-align:center; font-size:11.5px; font-weight:600; color:' + GRAY + '; ' +
                'margin-top:16px; line-height:1.6;">' +
                '손에 물 묻었으면 위의 진행 막대를 눌러 건너뛰셔도 돼요</div>';
    }

    function boot() {
        var orig = window.openCookingMode;
        if (typeof orig !== "function" || orig.__cook) return;

        var wrapped = function (recipeName) {
            var out = orig.apply(this, arguments);

            var r = null;
            try {
                if (typeof babyFoodData !== "undefined" && babyFoodData) {
                    r = babyFoodData.filter(function (x) { return x.name === recipeName; })[0];
                }
            } catch (e) {}

            steps = (r && r.recipe) ? r.recipe.slice() : [];
            at = 0;
            if (steps.length) setTimeout(paint, 20);

            return out;
        };
        wrapped.__cook = true;
        window.openCookingMode = wrapped;
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
})();