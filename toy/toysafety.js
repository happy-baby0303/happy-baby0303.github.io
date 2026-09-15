/* ============================================================
   배냇함 — 장난감 안전 (toysafety.js)

   100종을 다 뒤져봤다. 세 낱말이 한 번도 안 나온다.

       버튼 배터리 · KC · 리콜

   그런데 소리 나거나 불이 들어오는 장난감이 12개다.
   사운드북, 피아노, 뮤직 플레이하우스, 공놀이 개구리연못…
   전부 단추형 전지가 들어간다.

   ⚠️ 단추형 전지는 장난감 사고 중 제일 위험하다.
      삼키면 위산과 만나 전류가 흐르고, 몇 시간 안에 식도가 상한다.
      질식이 아니라 화상이다. 그래서 숨은 잘 쉬어진다.
      침을 흘리거나 안 먹으려 하는 정도라 부모가 알아차리기 어렵다.

   ⚠️ 우리가 처치법을 새로 만들지 않는다.
      해야 할 것과 하지 말아야 할 것만 적고, 나머지는 응급실에 맡긴다.
      "이렇게 하면 괜찮다" 는 말은 한 줄도 안 쓴다.

   ⚠️ 이건 안전이라 무료다. bathmold.js 와 같은 기준이다.
      PLUS 로 잠그면 안 되는 자리다.

   index.html 에서 bathmold.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var ID   = "toy-safety";
    var GRAY = "#8B95A1", DARK = "#191F28", RED = "#C62828", GOLD = "#8A6D00";

    /* 단추형 전지가 들어갈 만한 것 — 이름으로 고른다 */
    var BATT = /사운드|소리|멜로디|라이트|LED|불빛|리모컨|피아노|딸랑|뮤직|오르골|전자|버튼|미러볼|프로젝터|무드등/;
    var NOT  = /책장|정리함|매트|타월|수건/;

    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    function toys() {
        try { if (typeof toyData !== "undefined" && toyData) return toyData; } catch (e) {}
        return window.toyData || [];
    }

    function mine() {
        try { return JSON.parse(localStorage.getItem("tosil_my_toys")) || []; } catch (e) { return []; }
    }

    function myBatt() {
        var have = mine();
        return toys().filter(function (t) {
            if (have.indexOf(t.id) === -1) return false;
            return BATT.test(t.name) && !NOT.test(t.name);
        });
    }

    var open = false;
    window.toggleToySafety = function () { open = !open; paint(); };

    /* ---------- 카드 ---------- */

    function html() {
        var list = myBatt();
        var names = list.slice(0, 4).map(function (t) { return t.name; }).join(" · ");

        return '<div id="' + ID + '" class="matrix-panel" style="margin-bottom:14px;">' +

            '<div data-plus-head style="font-size:15px; font-weight:900; color:' + RED + '; ' +
                'margin-bottom:7px;">🔋 단추형 전지, 이것만은 알아두세요</div>' +

            '<div style="font-size:13px; font-weight:600; color:#4E5968; ' +
                'line-height:1.8; word-break:keep-all;">' +
                '사운드북·피아노·리모컨 장난감 안에 동전만 한 전지가 들어 있습니다.<br>' +
                '삼키면 <b>목에 걸리는 게 아니라 식도가 탑니다.</b> 위산과 만나 전류가 흐르거든요. ' +
                '<b>숨은 잘 쉬어져서</b> 부모가 알아차리기 어렵습니다.' +
                (list.length
                    ? '<br><br><b>가지고 계신 것 중</b> · ' + esc(names) +
                      (list.length > 4 ? ' 외 ' + (list.length - 4) + '개' : '')
                    : '') +
            '</div>' +

            /* ⚠️ 이 네 줄은 지우지 마세요. 제일 중요한 부분입니다. */
            '<div style="background:#FFF2F2; border:1px solid #FCA5A5; border-radius:13px; ' +
                'padding:14px 15px; margin-top:13px;">' +
                '<div style="font-size:13px; font-weight:900; color:' + RED + '; margin-bottom:7px;">' +
                    '삼킨 것 같으면 바로 응급실</div>' +
                '<div style="font-size:12.5px; font-weight:700; color:' + RED + '; line-height:1.9;">' +
                    '· <b>토하게 하지 마세요.</b> 올라오면서 식도를 또 지납니다<br>' +
                    '· <b>물도 음식도 주지 마세요</b><br>' +
                    '· 같은 전지나 제품 상자를 <b>들고 가세요.</b> 크기를 알아야 합니다<br>' +
                    '· 확실하지 않아도 갑니다. <b>기다리는 게 제일 위험합니다</b>' +
                '</div>' +
            '</div>' +

            '<div onclick="window.toggleToySafety()" ' +
                'style="margin-top:13px; padding-top:12px; border-top:1px solid #E5E8EB; ' +
                'text-align:center; font-size:12.5px; font-weight:800; color:' + GRAY + '; cursor:pointer;">' +
                (open ? "접기 ▴" : "미리 막는 법 · KC 마크 · 리콜 확인 ▾") + '</div>' +

            (open ? extraHTML() : "") +
        '</div>';
    }

    function extraHTML() {
        return '<div style="margin-top:8px;">' +

            row("🔩", "전지함이 나사로 잠겨 있나요",
                "손으로 열리는 뚜껑이면 아기 손에도 열립니다. 살 때 <b>나사로 잠기는 것</b>을 고르세요. " +
                "이미 있는 건 나사가 풀려 있지 않은지 한 번 확인해 주세요.", RED) +

            row("🗑️", "뺀 전지를 식탁이나 서랍에 두지 마세요",
                "새 것보다 <b>쓰던 전지가 더 흔한 사고 원인</b>입니다. 힘이 남아 있어서 위험한 건 똑같고, " +
                "아무 데나 두기 쉬워서요. 바로 테이프를 감아 높은 곳에 치우세요.", RED) +

            row("🏷️", "KC 마크와 연령 표시를 보세요",
                "국내에 파는 완구는 <b>KC 안전확인</b> 대상입니다. 마크와 <b>사용 연령</b>이 함께 적혀 있어요. " +
                "직구나 노마켓 제품은 이게 없는 경우가 있습니다. " +
                "연령 표시는 취향이 아니라 <b>부품 크기 기준</b>이에요.", GOLD) +

            row("📢", "리콜된 제품인지 확인하기",
                "완구 리콜은 생각보다 자주 납니다. 모델명으로 찾으면 바로 나와요.<br>" +
                '<a href="https://www.safetykorea.kr" target="_blank" rel="noopener" ' +
                'style="display:inline-block; margin-top:9px; padding:11px 16px; border-radius:11px; ' +
                'background:#F9FAFB; border:1px solid #D1D5DB; color:' + DARK + '; ' +
                'font-size:12.5px; font-weight:900; text-decoration:none;">' +
                '제품안전정보센터에서 찾아보기 〉</a>' +
                '<div style="margin-top:7px; font-size:11px; font-weight:600; color:' + GRAY + ';">' +
                '국가기술표준원이 운영하는 곳입니다 · 배냇함과 관련 없습니다</div>', GOLD) +

            '<div style="font-size:11.5px; font-weight:600; color:' + GRAY + '; ' +
                'margin-top:12px; line-height:1.7; word-break:keep-all;">' +
                '여기 적은 건 일반적인 안내예요. 제품마다 다른 부분은 <b>설명서</b>를 따르세요.</div>' +
        '</div>';
    }

    function row(icon, t, d, tone) {
        return '<div style="display:flex; gap:11px; padding:13px 0; border-bottom:1px solid #F2F4F6;">' +
            '<div style="font-size:18px; flex-shrink:0; width:24px; text-align:center;">' + icon + '</div>' +
            '<div style="flex:1; min-width:0;">' +
                '<div style="font-size:13.5px; font-weight:900; color:' + tone + '; margin-bottom:5px;">' +
                    esc(t) + '</div>' +
                '<div style="font-size:12.5px; font-weight:600; color:#4E5968; ' +
                    'line-height:1.75; word-break:keep-all;">' + d + '</div>' +
            '</div>' +
        '</div>';
    }

    /* ---------- 자리 ---------- */

    function paint() {
        var old = document.getElementById(ID);
        var box = document.createElement("div");
        box.innerHTML = html();
        if (old) { old.parentNode.replaceChild(box.firstChild, old); return; }

        var host = document.getElementById("view-toy-gear");
        if (!host) return;
        /* 곰팡이 카드 다음에. 둘 다 '이미 산 것' 얘기다. */
        var after = document.getElementById("bath-mold");
        if (after && after.parentNode === host) host.insertBefore(box.firstChild, after.nextSibling);
        else host.insertBefore(box.firstChild, host.firstChild);
    }

    window.refreshToySafety = paint;

    /* ---------- 전지 들어가는 카드에 한 줄 ---------- */

    function markCards() {
        toys().forEach(function (t) {
            if (!BATT.test(t.name) || NOT.test(t.name)) return;
            var card = document.getElementById("toy-card-" + t.id);
            if (!card || card.querySelector(".batt-note")) return;

            var d = document.createElement("div");
            d.className = "batt-note";
            d.style.cssText =
                "background:#FFF2F2; border:1px solid #FCA5A5; border-radius:11px; " +
                "padding:11px 13px; margin-bottom:12px; font-size:12px; font-weight:700; " +
                "color:#C62828; line-height:1.65;";
            d.innerHTML = "🔋 <b>전지함이 나사로 잠기는지 확인하세요.</b> " +
                          "손으로 열리는 뚜껑이면 아기 손에도 열립니다.";
            card.insertBefore(d, card.firstChild);
        });
    }
    window.refreshBattMarks = markCards;

    function boot() {
        setTimeout(function () { paint(); markCards(); }, 500);
        setTimeout(function () { paint(); markCards(); }, 1600);

        ["updateToyView", "renderFavorites", "switchToyMainTab", "closeShelfSheet"].forEach(function (n) {
            var f = window[n];
            if (typeof f !== "function" || f.__safety) return;
            var w = function () {
                var o = f.apply(this, arguments);
                setTimeout(function () { paint(); markCards(); }, 80);
                return o;
            };
            w.__safety = true;
            window[n] = w;
        });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    window.toySafetyDebug = function () {
        var all = toys().filter(function (t) { return BATT.test(t.name) && !NOT.test(t.name); });
        console.log("전지 들어갈 만한 장난감(전체):", all.length + "개");
        all.forEach(function (t) { console.log("   " + t.name); });
        console.log("그중 갖고 계신 것:", myBatt().length + "개");
        console.log("카드에 붙은 안내:", document.querySelectorAll(".batt-note").length + "개");
        console.log("붙었나:", !!document.getElementById(ID));
    };
})();