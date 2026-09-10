/* ============================================================
   배냇함 PLUS — 쪽쪽이 다시 고르기 (pacifier.js)

   쪽쪽이는 세 개를 사서 세 개를 다 뱉는다.
   그러면 부모는 "얘는 쪽쪽이를 안 하는 애구나" 하고 포기한다.

   그런데 대개는 아기가 거부한 게 아니라 모양이 안 맞은 것이다.
   젖꼭지 길이, 실드 곡면, 무게, 재질이 제품마다 다르고,
   같은 아기라도 맞는 게 딱 정해져 있다.

   ⚠️ 브랜드를 추천하지 않는다. '모양' 을 추천한다.
      브랜드는 단종되고 리뉴얼되지만 모양은 안 썩는다.
      가격도 안 넣는다. 유모차에서 겪은 그 문제다.

   ⚠️ 의학 주장을 하지 않는다.
      "사레를 막아준다" 같은 말은 안 쓴다. 사레는 삼킴 문제 신호일 수 있다.
      우리가 말할 수 있는 건 "이 모양은 이래서 이런 아기에게 잘 맞는다" 까지다.

   무료 : 모양 네 가지 설명 · 안전 수칙 · 시작과 끊는 시기
          (안전은 절대 잠그지 않는다)
   PLUS : 증상을 고르면 다음에 시도할 모양을 순서대로 잡아준다
          이미 실패한 모양은 후보에서 뺀다 — 그게 부모가 못 하는 수고다

   index.html 에서 bottleguide.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var PARTNER = "AF9932454";
    var TRY_KEY = "tosil_paci_tried";     // 써보고 안 된 모양
    var SYM_KEY = "tosil_paci_symptom";   // 마지막에 고른 증상

    var BLUE = "#3182F6", GRAY = "#8B95A1", DARK = "#191F28";
    var HOST = "paci-guide";

    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }
    function babyName() { return localStorage.getItem("tosil_babyName") || "우리 아기"; }
    function nm(j) {
        try { if (typeof window.babyNm === "function") return window.babyNm(j); } catch (e) {}
        var n = babyName(), c = n.charCodeAt(n.length - 1);
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
    function daysOld() {
        var s = localStorage.getItem("tosil_startDate");
        if (!s) return null;
        var p = String(s).split("-").map(Number);
        if (p.length !== 3) return null;
        return Math.floor((Date.now() - new Date(p[0], p[1] - 1, p[2]).getTime()) / 86400000);
    }
    function link(q) {
        return "https://www.coupang.com/np/search?q=" + encodeURIComponent(q) + "&lptag=" + PARTNER;
    }

    /* ==========================================================
       모양 — 브랜드가 아니라 이것을 추천한다
       ---------------------------------------------------------- */

    var SHAPES = [
        { id: "sym",   name: "대칭형",
          look: "위아래가 똑같이 생겨서 어느 쪽으로 물려도 됩니다",
          why:  "입 안에서 돌아가도 그대로 물립니다. 자다가 빠져서 우는 일이 줄어요",
          q:    "대칭형 쪽쪽이" },

        { id: "flat",  name: "납작형",
          look: "젖꼭지 윗면이 평평하고 아랫면이 볼록합니다",
          why:  "혀가 눌리는 면이 넓어 입천장에 닿는 느낌이 젖과 가깝습니다",
          q:    "납작형 쪽쪽이" },

        { id: "round", name: "체리형",
          look: "끝이 동그란 옛날 모양입니다",
          why:  "젖꼭지와 가장 비슷한 굵기라 젖을 물던 아기가 덜 헷갈려 합니다",
          q:    "체리형 쪽쪽이" },

        { id: "short", name: "짧은 젖꼭지형",
          look: "물리는 부분이 짧고 얕습니다. 신생아용에 많아요",
          why:  "깊이 들어가지 않아 목 안쪽을 덜 건드립니다",
          q:    "신생아 쪽쪽이 짧은" },

        { id: "vent",  name: "통풍구 넓은 실드",
          look: "입술 바깥에 닿는 판에 구멍이 크게 뚫려 있습니다",
          why:  "침이 고이지 않아 입 주변이 덜 짓무릅니다",
          q:    "통풍 쪽쪽이 실리콘" },

        { id: "light", name: "가벼운 일체형",
          look: "손잡이 없이 통으로 찍어낸 것. 무게가 가볍습니다",
          why:  "입에 걸리는 무게가 적어 힘이 약한 아기도 물고 있기 쉽습니다",
          q:    "일체형 쪽쪽이" }
    ];

    function shape(id) {
        for (var i = 0; i < SHAPES.length; i++) if (SHAPES[i].id === id) return SHAPES[i];
        return null;
    }

    /* ==========================================================
       증상 → 모양
       ----------------------------------------------------------
       ⚠️ 원인을 단정하지 않는다. '이럴 때 이 모양을 먼저 시도한다' 다.
       ⚠️ 병원에 가야 하는 신호는 추천 대신 그 말을 먼저 한다.
       ---------------------------------------------------------- */

    var SYMPTOMS = [
        { id: "spit",  icon: "\uD83D\uDE24", label: "물자마자 뱉어요",
          order: ["light", "sym", "short"],
          note: "물고 있을 힘이 아직 약하거나, 입에 비해 큰 경우가 많습니다. " +
                "가볍고 작은 것부터 다시 시도해보세요." },

        { id: "gag",   icon: "\uD83D\uDE23", label: "켁켁거리거나 헛구역질해요",
          order: ["short", "sym", "light"],
          note: "물리는 부분이 길어서 목 안쪽에 닿는 경우가 있습니다. 짧은 것으로 바꿔보세요.",
          warn: "먹을 때도 자주 켁켁거리거나, 얼굴색이 변하거나, 사레가 잦다면 " +
                "쪽쪽이 문제가 아닐 수 있습니다. 이건 <b>소아과에서 먼저 보셔야</b> 합니다." },

        { id: "drop",  icon: "\uD83D\uDE34", label: "자다가 자꾸 빠져요",
          order: ["sym", "light", "round"],
          note: "입 안에서 방향이 돌아가면 다시 물기 어렵습니다. " +
                "어느 쪽으로 물려도 되는 모양이 이 문제에 잘 맞습니다." },

        { id: "rash",  icon: "\uD83E\uDE79", label: "입 주변이 빨개지고 짓물러요",
          order: ["vent", "light"],
          note: "실드에 침이 고여서 계속 젖어 있는 겁니다. " +
                "구멍이 크게 뚫린 것으로 바꾸고, 물릴 때마다 입 주변을 마른 수건으로 눌러 닦아주세요." },

        { id: "confuse", icon: "\uD83E\uDD31", label: "젖 물 때랑 헷갈려해요",
          order: ["round", "flat"],
          note: "젖꼭지와 굵기·모양이 비슷한 쪽이 덜 헷갈립니다.",
          warn: "수유가 아직 자리잡기 전이라면 쪽쪽이를 <b>조금 미루는 것</b>도 방법입니다. " +
                "젖 먹이는 게 잘 되고 있는지부터 보세요." },

        { id: "never", icon: "\uD83D\uDE45", label: "아예 입에 안 넣어요",
          order: ["round", "flat", "sym"],
          note: "재질 냄새나 단단함이 안 맞는 경우가 있습니다. 모양을 바꿔도 안 되면 " +
                "<b>재질을 바꿔보세요</b> — 실리콘만 써보셨다면 라텍스(고무)가 훨씬 부드럽습니다.",
          warn: "다만 안 물어도 괜찮습니다. 쪽쪽이는 꼭 써야 하는 물건이 아니에요." }
    ];

    function symptom(id) {
        for (var i = 0; i < SYMPTOMS.length; i++) if (SYMPTOMS[i].id === id) return SYMPTOMS[i];
        return null;
    }

    /* ---------- 써보고 안 된 모양 ---------- */

    function tried() {
        try { return JSON.parse(localStorage.getItem(TRY_KEY)) || []; } catch (e) { return []; }
    }
    window.togglePaciTried = function (id) {
        var list = tried(), i = list.indexOf(id);
        if (i > -1) list.splice(i, 1); else list.push(id);
        try { localStorage.setItem(TRY_KEY, JSON.stringify(list)); } catch (e) {}
        paint();
    };

    var picked = localStorage.getItem(SYM_KEY) || "";
    window.pickPaciSymptom = function (id) {
        picked = (picked === id) ? "" : id;
        try { localStorage.setItem(SYM_KEY, picked); } catch (e) {}
        paint();
        var el = document.getElementById("paci-answer");
        if (el) setTimeout(function () {
            try { el.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e) {}
        }, 120);
    };

    /* ==========================================================
       화면
       ---------------------------------------------------------- */

    function symptomGrid() {
        return SYMPTOMS.map(function (s) {
            var on = (picked === s.id);
            return '<div onclick="window.pickPaciSymptom(\'' + s.id + '\')" ' +
                'style="padding:14px 10px; border-radius:14px; cursor:pointer; text-align:center; ' +
                'font-size:12.5px; font-weight:800; line-height:1.4; word-break:keep-all; ' +
                (on ? 'background:' + BLUE + '; color:#FFFFFF; border:1px solid ' + BLUE + ';'
                    : 'background: #F9FAFB; color:#4E5968; border:1px solid #E5E8EB;') + '">' +
                '<div style="font-size:19px; margin-bottom:5px;">' + s.icon + '</div>' + esc(s.label) + '</div>';
        }).join("");
    }

    function answerHTML() {
        if (!picked) return "";
        var s = symptom(picked);
        if (!s) return "";

        var out = '<div id="paci-answer" style="margin-top:16px;">';

        /* 병원 신호가 있으면 추천보다 먼저 말한다 */
        if (s.warn) {
            out += '<div style="background:#FFF2F2; border:1px solid #FCA5A5; border-radius:14px; ' +
                'padding:15px 16px; margin-bottom:12px; font-size:13px; font-weight:600; ' +
                'color:var(--gd-red,#E32636); line-height:1.75; word-break:keep-all;">' +
                '\u26A0\uFE0F ' + s.warn + '</div>';
        }

        out += '<div style="background:#E8F3FF; border:1px solid #C9E2FF; border-radius:14px; ' +
            'padding:15px 16px; margin-bottom:14px; font-size:13.5px; font-weight:600; ' +
            'color:var(--gd-blue,#1B64DA); line-height:1.75; word-break:keep-all;">' +
            esc(s.note.replace(/<\/?b>/g, "")) + '</div>';

        var plus = isPlus();
        var out2 = s.order.filter(function (id) { return tried().indexOf(id) === -1; });
        var skipped = s.order.length - out2.length;
        if (!out2.length) out2 = s.order.slice(0, 1);

        var show = plus ? out2 : out2.slice(0, 1);

        out += '<div style="font-size:13px; font-weight:900; color:' + DARK + '; margin-bottom:9px;">' +
            '이 순서로 시도해보세요' +
            (skipped ? ' <span style="font-weight:700; color:' + GRAY + ';">· 안 됐던 ' +
                       skipped + '개는 뺐어요</span>' : '') + '</div>';

        show.forEach(function (id, i) {
            var sh = shape(id);
            if (!sh) return;
            out += '<div style="background: #FFFFFF; border:1px solid #E5E8EB; border-radius:14px; ' +
                'padding:16px; margin-bottom:9px;">' +
                '<div style="display:flex; align-items:center; gap:8px; margin-bottom:7px;">' +
                    '<span style="flex-shrink:0; width:21px; height:21px; border-radius:7px; ' +
                        'background:' + DARK + '; color:#FFFFFF; font-size:11.5px; font-weight:900; ' +
                        'display:inline-flex; align-items:center; justify-content:center;">' + (i + 1) + '</span>' +
                    '<span style="font-size:14.5px; font-weight:900; color:#191F28;">' + esc(sh.name) + '</span>' +
                '</div>' +
                '<div style="font-size:12.5px; font-weight:700; color:#4E5968; line-height:1.65; ' +
                    'word-break:keep-all;">' + esc(sh.look) + '</div>' +
                '<div style="margin-top:5px; font-size:12.5px; font-weight:600; color:' + GRAY + '; ' +
                    'line-height:1.65; word-break:keep-all;">' + esc(sh.why) + '</div>' +
                '<div style="display:flex; gap:7px; margin-top:12px;">' +
                    '<a href="' + link(sh.q) + '" target="_blank" rel="noopener" ' +
                        'style="flex:1; text-align:center; padding:11px; background:' + DARK + '; ' +
                        'color:#FFFFFF; border-radius:11px; font-size:12.5px; font-weight:800; ' +
                        'text-decoration:none;">쿠팡에서 찾아보기</a>' +
                    '<div onclick="window.togglePaciTried(\'' + sh.id + '\')" ' +
                        'style="flex:1; text-align:center; padding:11px; background: #FFFFFF; ' +
                        'color:#4E5968; border:1px solid #D1D5DB; border-radius:11px; ' +
                        'font-size:12.5px; font-weight:800; cursor:pointer;">이건 안 됐어요</div>' +
                '</div>' +
            '</div>';
        });

        if (!plus && out2.length > 1) {
            out += '<div style="background:#FFF9E6; border:1px solid #F5E1A4; border-radius:14px; ' +
                'padding:17px 16px; margin-top:4px;">' +
                '<div style="font-size:13.5px; font-weight:900; color:var(--gd-gold,#8A6D00);">' +
                    '다음 후보 ' + (out2.length - 1) + '개는 PLUS에서 보여요</div>' +
                '<div style="margin-top:6px; font-size:12.5px; font-weight:600; ' +
                    'color:var(--gd-gold,#8A6D00); line-height:1.75; word-break:keep-all;">' +
                    '안 됐던 걸 눌러두면 다음 후보에서 빼드립니다. ' +
                    '같은 걸 두 번 사는 일이 없어져요.</div></div>';
        }

        if (tried().length) {
            out += '<div style="margin-top:14px; font-size:12px; font-weight:700; color:' + GRAY + '; ' +
                'line-height:1.7;">안 됐다고 눌러두신 것 · ' +
                tried().map(function (id) { return (shape(id) || {}).name || id; }).join(" \u00b7 ") +
                '<span onclick="localStorage.removeItem(\'' + TRY_KEY + '\'); window.refreshPaci();" ' +
                    'style="margin-left:8px; color:' + BLUE + '; cursor:pointer;">지우기</span></div>';
        }

        return out + '</div>';
    }

    function guideHTML() {
        return '<div class="matrix-panel" style="margin-bottom:20px;">' +
            '<div class="matrix-header">\uD83C\uDF6D 쪽쪽이, 자꾸 뱉나요?</div>' +
            '<div style="font-size:13px; font-weight:600; color:' + GRAY + '; ' +
                'margin:-16px 0 18px; line-height:1.6; word-break:keep-all;">' +
                '아기가 쪽쪽이를 싫어하는 게 아니라 <b>모양이 안 맞는 것</b>일 때가 많아요. ' +
                '겪고 계신 걸 눌러주세요</div>' +
            '<div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:9px;">' +
                symptomGrid() + '</div>' +
            answerHTML() +
        '</div>';
    }

    /* ---------- 안전 · 무료. 절대 잠그지 않는다 ---------- */

    function safetyHTML() {
        var d = daysOld(), m = monthsOld();
        var early = (d !== null && d < 28);

        return '<div class="matrix-panel" style="margin-bottom:20px;">' +
            '<div class="matrix-header">\uD83D\uDEE1\uFE0F 쪽쪽이 쓰기 전에</div>' +

            (early
                ? '<div style="background:#FFF9E6; border:1px solid #F5E1A4; border-radius:14px; ' +
                  'padding:15px 16px; margin:-10px 0 14px; font-size:13px; font-weight:600; ' +
                  'color:var(--gd-gold,#8A6D00); line-height:1.75; word-break:keep-all;">' +
                  esc(nm("는")) + ' 아직 생후 ' + d + '일이에요. 수유가 자리잡기 전에 쪽쪽이를 시작하면 ' +
                  '젖 먹는 게 흔들릴 수 있어서, <b>먹는 게 안정된 뒤</b>에 시작하는 걸 권하는 편입니다.</div>'
                : '') +

            '<div style="background:#FFF2F2; border:1px solid #FCA5A5; border-radius:14px; ' +
                'padding:15px 16px; margin-bottom:10px;">' +
                '<div style="font-size:13.5px; font-weight:900; color:var(--gd-red,#E32636); ' +
                    'margin-bottom:7px;">\u274C 이것만은 하지 마세요</div>' +
                '<div style="font-size:13px; font-weight:600; color:#4E5968; line-height:1.85; ' +
                    'word-break:keep-all;">' +
                    '\u00b7 <b>끈이나 줄로 목에 걸어두지 마세요.</b> 옷핀 집게형만 쓰시고, 잘 때는 떼세요<br>' +
                    '\u00b7 <b>꿀이나 설탕을 묻히지 마세요.</b> 돌 전 꿀은 절대 안 됩니다<br>' +
                    '\u00b7 <b>찢어졌거나 끈적이면 바로 버리세요.</b> 떨어진 조각을 삼킬 수 있습니다<br>' +
                    '\u00b7 잡아당겨 <b>늘어나면 교체</b>하세요. 대개 한두 달입니다' +
                '</div>' +
            '</div>' +

            '<div style="background: #F9FAFB; border:1px solid #E5E8EB; border-radius:14px; ' +
                'padding:15px 16px; font-size:13px; font-weight:600; color:#4E5968; ' +
                'line-height:1.8; word-break:keep-all;">' +
                '\uD83D\uDD01 <b>모양이 안 맞으면 재질을 바꿔보세요.</b> ' +
                '실리콘은 단단하고 냄새가 없으며 오래 갑니다. ' +
                '라텍스(고무)는 훨씬 부드럽지만 냄새가 있고 빨리 삭아요.<br>' +
                '\uD83D\uDC4B <b>끊는 건 서두르지 않아도 됩니다.</b> ' +
                '돌 무렵부터 낮에 쓰는 횟수를 줄여가는 게 흔한 방법이고, ' +
                '오래 쓸수록 치아 자리에 영향을 줄 수 있어 시기는 소아과·치과와 상의하세요.' +
            '</div>' +

            '<div style="margin-top:12px; font-size:12px; font-weight:600; color:' + GRAY + '; ' +
                'line-height:1.7; word-break:keep-all;">' +
                '쪽쪽이를 안 물어도 괜찮습니다. 꼭 써야 하는 물건이 아니에요.</div>' +
        '</div>';
    }

    /* ---------- 자리 잡기 ----------
       index.html 은 한 줄도 안 고친다.
       bottleguide.js 가 만든 상담 칸 다음에 붙는다. -------- */

    function paint() {
        var host = document.getElementById(HOST);
        if (!host) return;
        host.innerHTML = guideHTML() + safetyHTML();
    }
    window.refreshPaci = paint;

    function mount() {
        if (document.getElementById(HOST)) return;
        var guide = document.getElementById("bottle-guide");
        var panel = document.querySelector(".matrix-panel");
        var anchor = guide || panel;
        if (!anchor || !anchor.parentNode) return;

        var box = document.createElement("div");
        box.id = HOST;
        anchor.parentNode.insertBefore(box, anchor.nextSibling);
        paint();
    }

    function boot() {
        /* \u26a0\ufe0f 늦게 붙으면 그 칸이 한동안 비어 보인다.
              바로 시도하고, 앵커가 아직 없으면 촘촘히 다시 본다. */
        mount();
        var t = 0;
        var again = setInterval(function () {
            mount();
            if (document.getElementById(HOST) || ++t > 24) clearInterval(again);
        }, 120);
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    window.paciDebug = function () {
        console.log("PLUS:", isPlus(), "· 개월수:", monthsOld(), "· 생후:", daysOld() + "일");
        console.log("고른 증상:", picked || "없음");
        console.log("안 됐다고 눌러둔 모양:", tried().map(function (id) {
            return (shape(id) || {}).name || id;
        }).join(" · ") || "없음");
        SYMPTOMS.forEach(function (s) {
            var left = s.order.filter(function (id) { return tried().indexOf(id) === -1; });
            console.log("   " + s.label + " → " +
                s.order.map(function (id) { return (shape(id) || {}).name; }).join(" > ") +
                "  (남은 후보 " + left.length + "개)" + (s.warn ? "  ⚠️병원 안내 있음" : ""));
        });
        console.log("붙었나:", !!document.getElementById(HOST));
    };
})();