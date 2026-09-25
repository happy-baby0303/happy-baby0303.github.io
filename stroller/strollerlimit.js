/* ============================================================
   배냇함 — 유모차 최대 사용 체중 (strollerlimit.js)

   49종을 다 뒤져봤다. weight(유모차 자체 무게)는 전부 있는데
   최대 사용 체중(아기 몸무게 한도)은 한 종도 없다.

   이게 왜 중요한가.

       유모차마다 한도가 다르다. 보통 15~22kg.
       한도를 넘으면 프레임이 휘고 브레이크가 제 힘을 못 낸다.
       그런데 겉으로는 아무 표시가 안 난다. 그냥 계속 쓴다.

       우량아는 생각보다 일찍 닿는다.
       두 돌에 15kg 넘는 아이가 드물지 않다.

   ⚠️ 49종 스펙을 우리가 지어내지 않는다.
      제조사가 정한 숫자고, 틀리면 그게 더 위험하다.
      carseatown.js 가 쓴 방식을 그대로 쓴다 —
      설명서에서 숫자 하나만 옮겨 적게 한다.

   ⚠️ 그런데 이 앱은 아기 몸무게를 안다.
      다른 앱은 한도를 알려줘도 "그래서 우리 앤 괜찮나" 를 못 답한다.
      배냇함은 답할 수 있다. 그게 이 카드가 있는 이유다.

   index.html 에서 strollerown.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var KEY  = "tosil_stroller_limit";
    var ID   = "stroller-limit";
    var GRAY = "#A3958A", DARK = "#4A413C", GREEN = "#1F9D6B", GOLD = "#8A6D00", RED = "#C62828";

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

    /* ---------- 아기 몸무게 ----------
       본 앱이 성장 기록에 적어둔 값을 그대로 읽는다. 여기서 또 물어보지 않는다. */

    function babyKg() {
        var v = parseFloat(localStorage.getItem("tosil_latest_weight"));
        if (isFinite(v) && v > 0 && v < 40) return v;

        try {
            var g = JSON.parse(localStorage.getItem("tosil_growth_records")) || [];
            if (Array.isArray(g) && g.length) {
                var last = g.slice().sort(function (a, b) {
                    return String(a.date || "") < String(b.date || "") ? 1 : -1;
                })[0];
                var w = parseFloat(last && (last.weight || last.kg));
                if (isFinite(w) && w > 0 && w < 40) return w;
            }
        } catch (e) {}
        return null;
    }

    function limit() {
        var v = parseFloat(localStorage.getItem(KEY));
        return (isFinite(v) && v > 0 && v < 60) ? v : null;
    }

    window.setStrollerLimit = function () {
        var cur = limit();
        var a = window.prompt(
            "설명서나 유모차 프레임에 적힌 최대 사용 체중을 적어주세요.\n" +
            "보통 15 ~ 22kg 사이입니다. (숫자만)",
            cur === null ? "" : String(cur));
        if (a === null) return;

        var v = parseFloat(String(a).replace(/[^0-9.]/g, ""));
        if (!isFinite(v) || v <= 0 || v > 60) {
            if (String(a).trim() === "") { try { localStorage.removeItem(KEY); } catch (e) {} paint(); }
            return;
        }
        try { localStorage.setItem(KEY, String(v)); } catch (e) {}
        paint();
    };

    /* ---------- 화면 ---------- */

    function html() {
        var lim = limit();
        var kg  = babyKg();

        if (lim === null) {
            return '<div id="' + ID + '" class="matrix-panel" onclick="window.setStrollerLimit()" ' +
                'style="display:flex; align-items:center; gap:12px; background:#FFFFFF; ' +
                'border:1px solid #EDE6DE; border-radius:16px; padding:15px 16px; ' +
                'margin-bottom:14px; cursor:pointer;">' +
                '<div style="font-size:20px; flex-shrink:0;">⚖️</div>' +
                '<div style="flex:1; min-width:0;">' +
                    '<div class="matrix-header" style="font-size:14px; font-weight:900; color:' + DARK + ';">' +
                        '최대 몇 kg까지 쓸 수 있나요</div>' +
                    '<div style="font-size:11.5px; font-weight:700; color:' + GRAY + '; ' +
                        'margin-top:3px; word-break:keep-all; line-height:1.6;">' +
                        '설명서에 적힌 숫자 하나만 옮겨 적어주시면, ' +
                        esc(nm("가")) + ' 언제쯤 한도에 닿는지 알려드릴게요</div>' +
                '</div>' +
                '<div style="font-size:12px; color:#7F77DD; flex-shrink:0;">〉</div>' +
            '</div>';
        }

        var tone = GREEN, bg = "#EAF7F1", bd = "#A7DFC8", head, body;

        if (kg === null) {
            tone = GRAY; bg = "#FBF8F3"; bd = "#EDE6DE";
            head = "최대 " + lim + "kg 까지";
            body = "본 앱 성장 기록에 몸무게를 적어두시면 " +
                   esc(nm("가")) + " 얼마나 남았는지 같이 보여드릴게요.";
        } else {
            var left = Math.round((lim - kg) * 10) / 10;
            if (left <= 0) {
                tone = RED; bg = "#FFF2F2"; bd = "#FCA5A5";
                head = "한도를 넘었어요";
                body = "<b>" + esc(nm("는")) + " " + kg + "kg</b>, 이 유모차는 <b>" + lim + "kg</b>까지예요.<br>" +
                       "한도를 넘으면 프레임이 휘거나 브레이크가 제 힘을 못 냅니다. " +
                       "겉으로는 표가 안 나서 더 조심하셔야 해요. 설명서를 한 번 더 확인해 주세요.";
            } else if (left <= 2) {
                /* ⚠️ 머리말에 '최대' 를 안 쓴다.
                      strollertabs.js 가 "최대" 가 든 카드를 접기 상자에 넣는데,
                      곧 한도에 닿거나 넘었을 때는 접히면 안 된다.
                      접힌 채로 두면 못 보고, 그게 제일 위험한 순간이다. */
                tone = GOLD; bg = "#FFF9E6"; bd = "#FDE68A";
                head = "곧 한도예요 · " + left + "kg 남았어요";
                body = "<b>" + esc(nm("는")) + " 지금 " + kg + "kg</b>예요. 곧 한도에 닿습니다.<br>" +
                       "다음 유모차를 슬슬 보실 때예요. 급하게 고르면 비싸게 삽니다.";
            } else {
                head = "최대 " + lim + "kg 까지 · " + left + "kg 남았어요";
                body = "<b>" + esc(nm("는")) + " 지금 " + kg + "kg</b>예요. 아직 넉넉합니다.";
            }
        }

        /* ⚠️ .matrix-panel / .matrix-header 를 써야 한다.
              strollertabs.js 의 접기와 PLUS 배지가 그 두 클래스로 카드를 찾는다.
              혼자 다른 모양이면 접기 상자에 안 들어가고 혼자 떠 있게 된다. */
        return '<div id="' + ID + '" class="matrix-panel" style="background:' + bg + '; ' +
            'border:1px solid ' + bd + '; border-radius:16px; padding:16px; margin-bottom:14px;">' +
            '<div class="matrix-header" style="font-size:14px; font-weight:900; color:' + tone + '; ' +
                'margin-bottom:6px;">⚖️ ' + esc(head) + '</div>' +
            '<div style="font-size:12.5px; font-weight:600; color:#7A6F68; ' +
                'line-height:1.75; word-break:keep-all;">' + body + '</div>' +
            '<div onclick="window.setStrollerLimit()" style="margin-top:11px; font-size:11.5px; ' +
                'font-weight:800; color:' + GRAY + '; cursor:pointer;">숫자 고치기</div>' +
        '</div>';
    }

    function paint() {
        var old = document.getElementById(ID);
        var box = document.createElement("div");
        box.innerHTML = html();
        if (old) { old.parentNode.replaceChild(box.firstChild, old); return; }

        var host = document.getElementById("view-stroller-use");
        if (!host) return;
        host.insertBefore(box.firstChild, host.firstChild);
    }

    window.refreshStrollerLimit = paint;

    function boot() {
        setTimeout(paint, 700);
        setTimeout(paint, 1900);
        var f = window.switchStrollerTab;
        if (typeof f === "function" && !f.__limit) {
            var w = function () { var o = f.apply(this, arguments); setTimeout(paint, 80); return o; };
            w.__limit = true;
            window.switchStrollerTab = w;
        }
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    window.strollerLimitDebug = function () {
        console.log("적어둔 한도:", limit() === null ? "없음" : limit() + "kg");
        console.log("아기 몸무게:", babyKg() === null ? "기록 없음" : babyKg() + "kg");
        console.log("붙었나:", !!document.getElementById(ID));
    };
})();