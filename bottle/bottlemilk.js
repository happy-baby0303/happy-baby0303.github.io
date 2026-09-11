/* ============================================================
   배냇함 PLUS — 유축 모유 재고 (bottlemilk.js)

   복직 준비는 두 개가 한 세트다.

       ① 젖병 연습 시키기   → bottlerefuse.js
       ② 모유 비축하기      → 이 파일

   그런데 ②에는 아무도 안 알려주는 게 있다.
   "이거 언제까지 먹여도 되나."

   냉동실에 팩이 스무 개 있고 날짜는 매직으로 적혀 있는데,
   엄마는 새벽에 하나 꺼내 들고 며칠 지났는지를 센다.
   그리고 오래된 걸 뒤에 두고 새 걸 먼저 쓴다. 거의 매번.

   날짜 세는 건 수고고, 이건 안전이다.

   ⚠️ 기준은 보수적인 쪽으로 잡는다.
      출처마다 냉장 3일과 4일, 냉동 3개월과 6개월로 갈린다.
      짧게 잡아 손해 보는 건 모유 몇 팩이고,
      길게 잡아 손해 보는 건 아기다.

   ⚠️ 기준표는 무료다. 안전은 잠그지 않는다.
      PLUS 는 '몇 팩이 며칠 남았는지 세어주는 것' 뿐이다.

   ⚠️ 우리가 "먹여도 됩니다" 라고 판정하지 않는다.
      날짜만 세고, 판단은 냄새와 눈으로 하시라고 말한다.

   index.html 에서 bottlerefuse.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var KEY = "tosil_milk_stock";
    var HOST = "bottle-milk";

    var BLUE = "#3182F6", GRAY = "#8B95A1", DARK = "#191F28";
    var RED = "#E32636", GOLD = "#8A6D00";

    /* 보관 기준 — 보수적인 쪽. 늘리지 마세요. */
    var LIMIT = {
        fridge: { days: 3,  label: "냉장" },
        freeze: { days: 90, label: "냉동" },
        thaw:   { days: 1,  label: "해동" }
    };

    function isPlus() {
        try { if (typeof window.isPremiumUser === "function") return !!window.isPremiumUser(); } catch (e) {}
        if (!localStorage.getItem("firebase_uid")) return false;
        return localStorage.getItem("tosil_is_founder") === "true"
            || localStorage.getItem("tosil_plan_cache") === "premium"
            || localStorage.getItem("tosil_is_master") === "true";
    }
    function today() {
        var t = new Date();
        return t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") +
               "-" + String(t.getDate()).padStart(2, "0");
    }
    function daysSince(k) {
        if (!k) return null;
        var p = String(k).split("-").map(Number);
        if (p.length !== 3) return null;
        var d = new Date(p[0], p[1] - 1, p[2]); d.setHours(0, 0, 0, 0);
        var t = new Date(); t.setHours(0, 0, 0, 0);
        return Math.floor((t - d) / 86400000);
    }
    function pretty(k) {
        var p = String(k).split("-");
        return p.length === 3 ? (Number(p[1]) + "월 " + Number(p[2]) + "일") : k;
    }

    function stock() {
        try {
            var a = JSON.parse(localStorage.getItem(KEY));
            return Array.isArray(a) ? a : [];
        } catch (e) { return []; }
    }
    function save(a) { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) {} }

    /* 남은 날. 음수면 지난 것 */
    function leftOf(r) {
        var base = (r.place === "thaw") ? (r.thawAt || r.at) : r.at;
        var n = daysSince(base);
        if (n === null) return null;
        return (LIMIT[r.place] || LIMIT.fridge).days - n;
    }

    /* ---------- 조작 ---------- */

    window.addMilk = function (place) {
        var a = stock();
        a.push({ id: "m" + Date.now(), at: today(), place: place, n: 1 });
        save(a); paint();
    };
    window.bumpMilk = function (id, d) {
        var a = stock();
        for (var i = 0; i < a.length; i++) {
            if (a[i].id !== id) continue;
            a[i].n = Math.max(0, (a[i].n || 1) + d);
            if (!a[i].n) a.splice(i, 1);
            break;
        }
        save(a); paint();
    };
    /* 냉동 한 팩을 해동으로 옮긴다. 기한은 해동한 날부터 24시간. */
    window.thawMilk = function (id) {
        var a = stock(), src = null;
        for (var i = 0; i < a.length; i++) if (a[i].id === id) src = a[i];
        if (!src) return;
        src.n = Math.max(0, (src.n || 1) - 1);
        a.push({ id: "m" + Date.now(), at: src.at, place: "thaw", thawAt: today(), n: 1 });
        a = a.filter(function (r) { return r.n > 0; });
        save(a); paint();
    };
    window.clearMilk = function () {
        try { localStorage.removeItem(KEY); } catch (e) {}
        paint();
    };

    /* ==========================================================
       무료 — 보관 기준. 안전이라 잠그지 않는다.
       ---------------------------------------------------------- */

    function guideHTML() {
        return '<div class="matrix-panel" style="margin-bottom:20px;">' +
            '<div class="matrix-header">\uD83E\uDDCA 유축 모유, 언제까지 먹여도 되나요</div>' +

            '<div style="font-size:13px; font-weight:600; color:' + GRAY + '; ' +
                'margin:-16px 0 16px; line-height:1.7; word-break:keep-all;">' +
                '출처마다 조금씩 다릅니다. 여기서는 <b>짧은 쪽</b>으로 적었어요. ' +
                '짧게 잡아 손해 보는 건 모유 몇 팩이고, 길게 잡아 손해 보는 건 아기니까요.</div>' +

            '<div style="border:1px solid #E5E8EB; border-radius:14px; overflow:hidden;">' +
            [["실온", "4시간", "짜두고 바로 안 먹일 거면 냉장으로"],
             ["냉장", "3일", "문쪽 말고 안쪽 깊은 곳에"],
             ["냉동", "3개월", "날짜를 꼭 적고, 오래된 것부터"],
             ["해동한 뒤", "24시간", "냉장에 두고, 다시 얼리면 안 됩니다"],
             ["데운 뒤", "2시간", "남으면 버리세요"],
             ["아기 입이 닿은 것", "1~2시간", "세균이 들어갔습니다"]
            ].map(function (r, i) {
                return '<div style="display:flex; align-items:center; gap:10px; padding:12px 14px; ' +
                    (i ? 'border-top:1px solid #F2F4F6;' : '') + '">' +
                    '<div style="flex-shrink:0; width:92px; font-size:12.5px; font-weight:800; ' +
                        'color:#4E5968;">' + r[0] + '</div>' +
                    '<div style="flex-shrink:0; width:58px; font-size:13.5px; font-weight:900; ' +
                        'color:' + DARK + ';">' + r[1] + '</div>' +
                    '<div style="flex:1; min-width:0; font-size:11.5px; font-weight:600; ' +
                        'color:' + GRAY + '; line-height:1.55; word-break:keep-all;">' + r[2] + '</div>' +
                '</div>';
            }).join("") +
            '</div>' +

            '<div style="margin-top:12px; background:#FFF2F2; border:1px solid #FCA5A5; ' +
                'border-radius:14px; padding:15px 16px;">' +
                '<div style="font-size:13px; font-weight:900; color:' + RED + '; margin-bottom:7px;">' +
                    '\u274C 이것만은 하지 마세요</div>' +
                '<div style="font-size:12.5px; font-weight:600; color:#4E5968; line-height:1.85; ' +
                    'word-break:keep-all;">' +
                    '\u00b7 <b>전자레인지에 데우지 마세요.</b> 고르게 안 데워져서 아기 입을 뎁니다<br>' +
                    '\u00b7 <b>한 번 녹인 건 다시 얼리지 마세요.</b><br>' +
                    '\u00b7 <b>해동한 걸 상온에 두지 마세요.</b> 냉장에 넣어두셔야 합니다<br>' +
                    '\u00b7 뜨거운 물 말고 <b>미지근한 물</b>에 젖병째 담가 돌려가며 녹이세요' +
                '</div>' +
            '</div>' +

            '<div style="margin-top:10px; background: #F9FAFB; border:1px solid #E5E8EB; ' +
                'border-radius:14px; padding:15px 16px; font-size:12.5px; font-weight:600; ' +
                'color:#4E5968; line-height:1.85; word-break:keep-all;">' +
                '\uD83D\uDCA1 <b>새로 짠 따뜻한 모유를 냉장·냉동 모유에 바로 붓지 마세요.</b> ' +
                '먼저 식혀 온도를 맞춘 뒤 합치시고, 합친 것의 기한은 ' +
                '<b>나중이 아니라 처음 짠 날</b>이 기준입니다.<br>' +
                '\uD83D\uDCA1 <b>비누 냄새가 나도 상한 게 아닐 수 있습니다.</b> ' +
                '모유 속 효소가 활발해서 그런 경우가 많아요. ' +
                '다만 <b>시큼하거나 이상하면 아까워도 버리세요.</b> 날짜보다 코가 정확합니다.' +
            '</div>' +
        '</div>';
    }

    /* ==========================================================
       PLUS — 몇 팩이 며칠 남았나
       ---------------------------------------------------------- */

    function row(r) {
        var L = leftOf(r), lim = LIMIT[r.place] || LIMIT.fridge;
        var over = (L !== null && L < 0);
        var soon = (L !== null && L >= 0 && L <= (r.place === "freeze" ? 14 : 1));
        var c = over ? RED : soon ? GOLD : "#4E5968";

        return '<div style="padding:13px 0; border-bottom:1px solid #F2F4F6;">' +
            '<div style="display:flex; align-items:center; gap:10px;">' +
                '<div style="flex-shrink:0; width:40px; font-size:11px; font-weight:900; ' +
                    'color:' + GRAY + ';">' + lim.label + '</div>' +
                '<div style="flex:1; min-width:0;">' +
                    '<div style="font-size:13.5px; font-weight:900; color:' + DARK + ';">' +
                        pretty(r.at) + ' 유축' +
                        '<span style="font-weight:700; color:' + GRAY + '; font-size:11.5px;"> \u00b7 ' +
                        (r.n || 1) + '팩</span></div>' +
                    '<div style="margin-top:3px; font-size:12px; font-weight:800; color:' + c + ';">' +
                        (L === null ? "날짜 확인이 필요해요"
                            : over ? "기한이 " + (-L) + "일 지났어요"
                            : L === 0 ? "오늘까지예요"
                            : "앞으로 " + L + "일") + '</div>' +
                '</div>' +
                '<div style="flex-shrink:0; display:flex; gap:6px;">' +
                    (r.place === "freeze"
                        ? '<div onclick="window.thawMilk(\'' + r.id + '\')" ' +
                          'style="padding:9px 10px; border-radius:10px; cursor:pointer; font-size:11.5px; ' +
                          'font-weight:800; background: #FFFFFF; color:#4E5968; border:1px solid #D1D5DB;">' +
                          '해동</div>'
                        : '') +
                    '<div onclick="window.bumpMilk(\'' + r.id + '\',1)" ' +
                        'style="width:34px; text-align:center; padding:9px 0; border-radius:10px; ' +
                        'cursor:pointer; font-size:13px; font-weight:900; background: #FFFFFF; ' +
                        'color:#4E5968; border:1px solid #D1D5DB;">+</div>' +
                    '<div onclick="window.bumpMilk(\'' + r.id + '\',-1)" ' +
                        'style="width:34px; text-align:center; padding:9px 0; border-radius:10px; ' +
                        'cursor:pointer; font-size:13px; font-weight:900; background: #FFFFFF; ' +
                        'color:#4E5968; border:1px solid #D1D5DB;">\u2212</div>' +
                '</div>' +
            '</div>' +
        '</div>';
    }

    function stockHTML() {
        var a = stock();

        /* 오래된 것부터 = 먼저 써야 하는 것부터 */
        a.sort(function (x, y) {
            var lx = leftOf(x), ly = leftOf(y);
            if (lx === null) return 1;
            if (ly === null) return -1;
            return lx - ly;
        });

        var urgent = a.filter(function (r) { var L = leftOf(r); return L !== null && L <= 0; });
        var byPlace = { fridge: 0, freeze: 0, thaw: 0 };
        a.forEach(function (r) { byPlace[r.place] = (byPlace[r.place] || 0) + (r.n || 1); });

        var out = '<div class="matrix-panel" style="margin-bottom:20px;">' +
            '<div class="matrix-header">\uD83E\uDDCA 우리 집 모유 재고</div>';

        if (!a.length) {
            out += '<div style="font-size:13px; font-weight:600; color:' + GRAY + '; ' +
                'margin:-16px 0 16px; line-height:1.7; word-break:keep-all;">' +
                '유축하실 때마다 눌러두시면 <b>며칠 남았는지 알려드려요.</b> ' +
                '오래된 것부터 위로 올려드릴게요 \u2014 냉동실 뒤에 밀려서 상하는 팩이 없게요.</div>';
        } else {
            out += '<div style="display:flex; gap:8px; margin:-16px 0 14px;">' +
                [["냉동", byPlace.freeze, "#F0F7FF", BLUE],
                 ["냉장", byPlace.fridge, "#EAF7F1", "#1F6F52"],
                 ["해동", byPlace.thaw, "#FFF9E6", GOLD]
                ].map(function (x) {
                    return '<div style="flex:1; text-align:center; background:' + x[2] + '; ' +
                        'border-radius:13px; padding:13px 6px;">' +
                        '<div style="font-size:20px; font-weight:900; color:' + x[3] + ';">' + (x[1] || 0) + '</div>' +
                        '<div style="font-size:10.5px; font-weight:800; color:' + GRAY + '; ' +
                            'margin-top:2px;">' + x[0] + '</div></div>';
                }).join("") + '</div>';

            if (urgent.length) {
                out += '<div style="background:#FFF2F2; border:1px solid #FCA5A5; border-radius:14px; ' +
                    'padding:15px 16px; margin-bottom:12px; font-size:13px; font-weight:800; ' +
                    'color:' + RED + '; line-height:1.7; word-break:keep-all;">' +
                    '\u26A0\uFE0F 오늘까지거나 기한이 지난 게 ' + urgent.length + '건 있어요.<br>' +
                    '<span style="font-weight:600; color:#4E5968;">' +
                    '날짜만 세는 것이니 <b>열어서 냄새를 꼭 맡아보세요.</b> ' +
                    '조금이라도 이상하면 아까워도 버리시고요.</span></div>';
            }

            out += a.map(row).join("");
        }

        out += '<div style="display:flex; gap:8px; margin-top:14px;">' +
            '<div onclick="window.addMilk(\'freeze\')" style="flex:1; text-align:center; padding:14px; ' +
                'background:' + DARK + '; color:#FFFFFF; border-radius:12px; font-size:13px; ' +
                'font-weight:800; cursor:pointer;">+ 냉동했어요</div>' +
            '<div onclick="window.addMilk(\'fridge\')" style="flex:1; text-align:center; padding:14px; ' +
                'background: #FFFFFF; color:#4E5968; border:1px solid #D1D5DB; border-radius:12px; ' +
                'font-size:13px; font-weight:800; cursor:pointer;">+ 냉장했어요</div>' +
        '</div>';

        if (a.length) {
            out += '<div style="margin-top:11px; font-size:11.5px; font-weight:600; color:' + GRAY + '; ' +
                'line-height:1.7; word-break:keep-all;">' +
                '같은 날 여러 번 유축하셨으면 그 줄의 <b>+</b> 를 누르시면 됩니다. ' +
                '<span onclick="window.clearMilk()" style="color:' + BLUE + '; cursor:pointer;">전부 지우기</span></div>';
        }

        return out + '</div>';
    }

    function teaseHTML() {
        return '<div class="matrix-panel" style="margin-bottom:20px;">' +
            '<div class="matrix-header">\uD83E\uDDCA 우리 집 모유 재고</div>' +
            '<div style="background:#FFF9E6; border:1px solid #F5E1A4; border-radius:14px; ' +
                'padding:17px 16px; margin-top:-16px;">' +
                '<div style="font-size:13.5px; font-weight:900; color:' + GOLD + ';">' +
                    '몇 팩이 며칠 남았는지 알려드려요</div>' +
                '<div style="margin-top:6px; font-size:12.5px; font-weight:600; color:' + GOLD + '; ' +
                    'line-height:1.8; word-break:keep-all;">' +
                    '유축할 때마다 한 번씩 눌러두시면 <b>오래된 것부터 위로</b> 올려드립니다. ' +
                    '냉동실 뒤에 밀려서 상하는 팩이 없어져요. ' +
                    '해동한 건 따로 24시간을 세드리고요.</div>' +
            '</div>' +
        '</div>';
    }

    /* ---------- 자리 ---------- */

    function paint() {
        var host = document.getElementById(HOST);
        if (!host) return;
        host.innerHTML = (isPlus() ? stockHTML() : teaseHTML()) + guideHTML();
        try { if (typeof window.refreshPlusMark === "function") window.refreshPlusMark(); } catch (e) {}
    }
    window.refreshMilk = paint;

    function mount() {
        if (document.getElementById(HOST)) return;
        var anchor = document.getElementById("bottle-refuse") ||
                     document.getElementById("bottle-gear") ||
                     document.getElementById("bottle-guide");
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

    window.milkDebug = function () {
        var a = stock();
        console.log("PLUS:", isPlus(), "· 기록:", a.length + "건 ·",
                    a.reduce(function (s, r) { return s + (r.n || 1); }, 0) + "팩");
        a.forEach(function (r) {
            var L = leftOf(r);
            console.log("   " + (LIMIT[r.place] || {}).label + "  " + r.at +
                (r.thawAt ? " (해동 " + r.thawAt + ")" : "") +
                "  " + (r.n || 1) + "팩  \u2192 " +
                (L === null ? "날짜 이상" : L < 0 ? "🔴 " + (-L) + "일 지남" :
                 L === 0 ? "🟡 오늘까지" : L + "일 남음"));
        });
        console.log("기준: 냉장 " + LIMIT.fridge.days + "일 · 냉동 " + LIMIT.freeze.days +
                    "일 · 해동 " + LIMIT.thaw.days + "일");
        console.log("붙었나:", !!document.getElementById(HOST));
    };
})();