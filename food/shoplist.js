/* ============================================================
   배냇함 PLUS — 이번 주 장보기 (shoplist.js)

   7일 식단표를 받으면 부모가 그다음에 하는 일이 있다.
   재료를 세는 것이다.

     "소고기가 며칠 들어가지... 월 수 금 일이니까 4번,
      한 번에 30g 이면 120g? 아 일요일은 20g 이었나"

   식단표를 짜주고 이걸 안 해주면 절반만 해준 것이다.

   ⚠️ 잠그는 건 '수고' 지 '정보' 가 아니다.
      레시피와 재료는 무료로 다 보인다.
      합산하고 재고와 대조해주는 수고만 PLUS 다.

   ⚠️ 언제깠지(tosil_open_records)에 있는 건 빼고 보여준다.
      집에 있는 걸 또 사는 게 제일 아깝다.

   index.html 에서 app.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var BLUE = "#3182F6", GRAY = "#8B95A1", DARK = "#191F28";
    var ID = "shop-list";

    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    /* ⚠️ 여기는 잠그지 않는다.
          7일 식단표를 만들 수 있다는 것 자체가 이미 PLUS 라는 뜻이다.
          문 안에 들어온 사람에게 또 문을 세울 이유가 없다. */
    function isPlus() { return true; }

    /* ---------- 재료 문자열 뜯기 ----------
       "소고기 안심 10g, 초기용 쌀가루 15g, 물 150ml (냄비기준)"
       → [{name:"소고기 안심", qty:10, unit:"g"}, ...]
       물은 뺀다. 사러 가는 게 아니다. -------- */

    var SKIP = ["물", "육수", "채수", "생수", "쌀뜨물"];

    function parseIng(str) {
        var out = [];
        String(str || "").split(",").forEach(function (part) {
            var t = part.replace(/\([^)]*\)/g, "").trim();
            if (!t) return;
            var m = t.match(/^(.+?)\s*([\d.]+)\s*(g|ml|개|장|알|T|t|큰술|작은술|컵)?$/);
            var name = (m ? m[1] : t).replace(/\s*(약간|조금|적당량|소량)\s*$/, "").trim();
            var qty  = m && m[2] ? parseFloat(m[2]) : null;
            var unit = m && m[3] ? m[3] : "";
            for (var i = 0; i < SKIP.length; i++) {
                if (name.indexOf(SKIP[i]) > -1) return;      // 멸치육수·쌀뜨물도 걸러진다
            }
            out.push({ name: name, qty: qty, unit: unit });
        });
        return out;
    }

    function tidy(name) {
        // "초기용 쌀가루", "중기 쌀가루" 를 하나로 묶는다
        return name.replace(/^(초기용|중기용|후기용|초기|중기|후기|완료기)\s*/, "").trim();
    }

    /* ---------- 언제깠지 재고 ---------- */

    function inventory() {
        var list = [];
        try { list = JSON.parse(localStorage.getItem("tosil_open_records")) || []; } catch (e) {}
        return list.map(function (r) {
            var left = null;
            if (r && r.openDate && r.limitDays) {
                var p = String(r.openDate).split("-").map(Number);
                var passed = Math.floor((Date.now() - new Date(p[0], p[1] - 1, p[2]).getTime()) / 86400000);
                left = r.limitDays - passed;
            }
            return { name: String(r && r.name || "").trim(), left: left };
        }).filter(function (x) { return x.name; });
    }

    /* ---------- 합산 ---------- */

    function build() {
        var plan = window.currentWeeklyPlan;
        if (!plan || !plan.length) return null;

        var days = ["월", "화", "수", "목", "금", "토", "일"];
        var bag = {};
        plan.forEach(function (d, i) {
            if (!d || !d.recipe) return;
            parseIng(d.recipe.ingredients).forEach(function (it) {
                var key = tidy(it.name) + "|" + it.unit;
                if (!bag[key]) bag[key] = { name: tidy(it.name), unit: it.unit, qty: 0, days: [], n: 0 };
                if (it.qty) bag[key].qty += it.qty;
                bag[key].n++;
                var dd = d.day || days[i] || "";
                if (bag[key].days.indexOf(dd) === -1) bag[key].days.push(dd);
            });
        });

        var inv = inventory();
        var buy = [], have = [];
        Object.keys(bag).forEach(function (k) {
            var it = bag[k];
            var hit = null;
            inv.forEach(function (v) {
                if (!hit && (v.name.indexOf(it.name) > -1 || it.name.indexOf(v.name) > -1)) hit = v;
            });
            if (hit && (hit.left === null || hit.left >= 0)) { it.left = hit.left; have.push(it); }
            else buy.push(it);
        });

        buy.sort(function (a, b) { return b.n - a.n; });
        return { buy: buy, have: have };
    }

    /* ---------- 장보기 단위 ----------
       ⚠️ "두부 45g" 은 장보기 정보가 아니다.
          마트에서 두부 45g 을 파는 데가 없다. 한 모(300g)를 산다.
          정확한 숫자가 오히려 쓸모없어지는 자리다.

          그래서 g 을 '몇 개 사면 되는지' 로 바꾸고,
          남는 양을 같이 알려준다. 이유식 재료는 늘 남는다.
       -------- */

    // 이름 조각 → [파는 단위, 단위 무게(g), 세는 말]
    var PACK = [
        ["두부",       300, "모"],
        ["순두부",     350, "팩"],
        ["소고기",     100, "팩"],
        ["한우",       100, "팩"],
        ["닭안심",     100, "팩"],
        ["닭가슴",     100, "팩"],
        ["돼지",       100, "팩"],
        ["대구",       100, "팩"],
        ["가자미",     100, "팩"],
        ["연어",       100, "팩"],
        ["새우",       100, "팩"],
        ["전복",        70, "마리"],
        ["계란",        10, "판"],
        ["달걀",        10, "판"],
        ["쌀가루",     500, "봉"],
        ["찹쌀",       500, "봉"],
        ["오트밀",     500, "봉"],
        ["진밥",         0, ""],          // 집에 있는 밥
        ["미역",        50, "봉"],
        ["시금치",     200, "단"],
        ["청경채",     200, "단"],
        ["아욱",       200, "단"],
        ["부추",       200, "단"],
        ["브로콜리",   250, "송이"],
        ["콜리플라워", 300, "송이"],
        ["애호박",     250, "개"],
        ["오이",       200, "개"],
        ["가지",       150, "개"],
        ["당근",       180, "개"],
        ["감자",       180, "개"],
        ["고구마",     200, "개"],
        ["양파",       200, "개"],
        ["무",         800, "개"],
        ["단호박",     900, "통"],
        ["양배추",     900, "통"],
        ["사과",       250, "개"],
        ["배",         400, "개"],
        ["바나나",     120, "개"],
        ["토마토",     150, "개"],
        ["비트",       200, "개"],
        ["콩나물",     300, "봉"],
        ["렌틸",       500, "봉"],
        ["치즈",         1, "장"],
        ["김",           1, "장"]
    ];

    function packOf(name) {
        for (var i = 0; i < PACK.length; i++) {
            if (name.indexOf(PACK[i][0]) > -1) {
                return { unitG: PACK[i][1], word: PACK[i][2] };
            }
        }
        return null;
    }

    // 45g → "1모 사시면 돼요 (255g 남아요)"
    function buyText(it) {
        if (!it.qty) return { main: it.n + "번 들어가요", sub: "" };

        var p = packOf(it.name);
        var g = Math.round(it.qty);

        if (!p || !p.unitG) return { main: g + (it.unit || "g"), sub: "" };

        if (p.word === "장" || p.word === "판") {          // 개수로 세는 것
            var cnt = Math.ceil(it.qty);
            return { main: cnt + p.word === "10판" ? "한 판" : cnt + p.word, sub: "" };
        }

        var need = Math.max(1, Math.ceil(g / p.unitG));
        var left = need * p.unitG - g;
        var main = (need === 1 ? "한 " : need + " ") + p.word;
        var sub = "식단에 " + g + "g 써요" + (left >= p.unitG * 0.2 ? " · " + left + "g 남아요" : "");
        return { main: main, sub: sub };
    }

    /* ---------- 남는 걸로 뭘 하나 ----------
       두부 한 모를 사면 255g 이 남는다. 그게 이유식의 진짜 고민이다.
       같은 재료가 들어가는 다른 레시피를 찾아 붙여준다. -------- */

    function leftoverIdeas(name, exclude) {
        var out = [];
        try {
            var stage = document.getElementById("food-age");
            var age = stage ? stage.value : null;
            (babyFoodData || []).forEach(function (r) {
                if (out.length >= 3) return;
                if (age && age !== "all" && r.age !== age) return;
                if (exclude.indexOf(r.name) > -1) return;
                if (String(r.ingredients).indexOf(name) > -1) out.push(r.name);
            });
        } catch (e) {}
        return out;
    }


    /* ---------- 복사 ---------- */

    window.copyShopList = function () {
        var r = build();
        if (!r) return;
        var lines = ["🛒 이번 주 장보기 (배냇함)"];
        r.buy.forEach(function (it) {
            var b = buyText(it);
            lines.push("· " + it.name + "  " + b.main + (b.sub ? "   (" + b.sub + ")" : ""));
        });
        if (r.have.length) {
            lines.push("");
            lines.push("📦 집에 있는 것 — 안 사도 됨");
            r.have.forEach(function (it) { lines.push("· " + it.name); });
        }
        var txt = lines.join("\n");
        var done = function () { alert("장보기 목록을 복사했어요. 메모나 카톡에 붙여 넣으세요."); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(txt).then(done, function () { fall(txt, done); });
        } else fall(txt, done);

        function fall(t, ok) {
            try {
                var ta = document.createElement("textarea");
                ta.value = t; ta.style.cssText = "position:fixed;top:-1000px;";
                document.body.appendChild(ta); ta.select();
                document.execCommand("copy"); document.body.removeChild(ta); ok();
            } catch (e) {}
        }
    };

    window.openShopCoupang = function () {
        var r = build();
        if (!r || !r.buy.length) return;
        var q = encodeURIComponent(r.buy.slice(0, 3).map(function (i) { return i.name; }).join(" "));
        window.open("https://www.coupang.com/np/search?q=" + q, "_blank");
    };

    /* ---------- 화면 ---------- */

    /* ⚠️ 쿠팡은 여러 상품을 밖에서 한 번에 담는 길을 열어두지 않았다.
          '모두 담기' 는 만들 수가 없다. 그래서 할 수 있는 건 두 가지다.
            · 검색어를 사람이 치지 않게 한다 (재료마다 버튼)
            · 웹이 아니라 앱이 열리게 한다 (파트너스 딥링크)
          앱이 열리면 로그인이 이미 돼 있어서 담기까지 두 번이면 끝난다. */

    var ING_LINK = {};      // "두부": "https://link.coupang.com/a/..." 를 여기 채우면 앱이 열린다

    function ingLink(name) {
        var keys = Object.keys(ING_LINK);
        for (var i = 0; i < keys.length; i++) {
            if (name.indexOf(keys[i]) > -1) return ING_LINK[keys[i]];
        }
        return "https://www.coupang.com/np/search?q=" + encodeURIComponent(name + " 이유식");
    }

    window.buyOneIng = function (name) {
        var w = window.open(ingLink(name), "_blank");
        if (!w) window.location.href = ingLink(name);
    };

    /* 위쪽 '스마트 장보기 비서' 에는 '샀어요' 로 지우는 기능이 있었고,
       여기에는 몇 개 사면 되는지가 있었다. 같은 화면에 둘이면 헷갈린다.
       지우는 기능을 이쪽으로 가져오고 위는 접는다. */
    var BOUGHT = "tosil_shop_bought";

    function bought() {
        try { return JSON.parse(localStorage.getItem(BOUGHT)) || []; } catch (e) { return []; }
    }
    window.toggleBought = function (name) {
        var list = bought(), i = list.indexOf(name);
        if (i > -1) list.splice(i, 1); else list.push(name);
        try { localStorage.setItem(BOUGHT, JSON.stringify(list)); } catch (e) {}
        mount();
    };
    window.clearBought = function () {
        try { localStorage.removeItem(BOUGHT); } catch (e) {}
        mount();
    };

    function row(it, dim) {
        var b = buyText(it);
        var got = bought().indexOf(it.name) > -1;
        var q = esc(it.name).replace(/'/g, "");

        return '<div style="padding:12px 0; border-bottom:1px solid #F2F4F6;' +
            (got ? ' opacity:0.45;' : '') + '">' +
            '<div style="display:flex; align-items:center; gap:10px;">' +

                '<div onclick="window.toggleBought(\'' + q + '\')" ' +
                    'style="flex-shrink:0; width:24px; height:24px; border-radius:8px; cursor:pointer; ' +
                    'display:flex; align-items:center; justify-content:center; font-size:13px; ' +
                    (got ? 'background:#1F9D6B; color:#FFFFFF;'
                         : 'background:#FFFFFF; border:1.5px solid #D1D5DB; color:transparent;') +
                    '">✓</div>' +

                '<div style="flex:1; min-width:0;">' +
                    '<div style="font-size:14px; font-weight:800; color:' + DARK + ';' +
                        (got ? ' text-decoration:line-through;' : '') + '">' +
                        esc(it.name) + '</div>' +
                    (b.sub ? '<div style="font-size:11.5px; font-weight:700; color:' + GRAY + '; ' +
                             'margin-top:2px;">' + esc(b.sub) + '</div>' : '') +
                '</div>' +

                '<div style="flex-shrink:0; font-size:14px; font-weight:900; color:' + BLUE + ';">' +
                    esc(b.main) + '</div>' +

                (got ? '' :
                '<div onclick="window.buyOneIng(\'' + q + '\')" ' +
                    'style="flex-shrink:0; width:34px; height:34px; border-radius:10px; ' +
                    'background:#F2F4F6; color:#4E5968; display:flex; align-items:center; ' +
                    'justify-content:center; font-size:13px; font-weight:900; cursor:pointer;">🛒</div>') +
            '</div>' +
        '</div>';
    }

    function leftoverHTML(r) {
        var used = [];
        try { (window.currentWeeklyPlan || []).forEach(function (d) { if (d.recipe) used.push(d.recipe.name); }); } catch (e) {}

        var rows = [];
        r.buy.forEach(function (it) {
            if (rows.length >= 3) return;
            var p = packOf(it.name);
            if (!p || !p.unitG || !it.qty) return;
            var left = Math.max(1, Math.ceil(it.qty / p.unitG)) * p.unitG - Math.round(it.qty);
            if (left < p.unitG * 0.4) return;                 // 조금 남는 건 말 안 한다
            var ideas = leftoverIdeas(it.name, used);
            if (!ideas.length) return;
            rows.push('<div style="padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.12);">' +
                '<div style="font-size:12.5px; font-weight:900; color:#FFFFFF;">' +
                    esc(it.name) + ' ' + left + 'g 남아요</div>' +
                '<div style="font-size:11.5px; font-weight:700; color:#B8C4D6; margin-top:3px; ' +
                    'line-height:1.6;">' + esc(ideas.join(" · ")) + '</div>' +
            '</div>');
        });
        if (!rows.length) return "";

        return '<div style="background:#191F28; border-radius:16px; padding:16px 18px; margin-top:16px;">' +
            '<div style="font-size:13.5px; font-weight:900; color:#FFFFFF; margin-bottom:4px;">' +
                '🍲 남는 걸로 이런 것도 돼요</div>' +
            '<div style="font-size:11.5px; font-weight:600; color:#8B95A1; margin-bottom:8px; line-height:1.6;">' +
                '이유식 재료는 늘 남습니다. 버리기 전에 한 번 보세요</div>' +
            rows.join("") +
        '</div>';
    }

    function html() {
        var r = build();
        if (!r) return "";
        var plus = isPlus();
        var show = r.buy;

        return '<div id="' + ID + '" style="background:#FFFFFF; border:1px solid #E5E8EB; ' +
            'border-radius:20px; padding:20px; margin-top:16px;">' +

            '<div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">' +
                                '<div data-plus-head style="font-size:16px; font-weight:900; color:' + DARK + ';">🛒 몇 개 사면 되나</div>' +
            '</div>' +
            '<div style="font-size:12.5px; font-weight:600; color:' + GRAY + '; ' +
                'margin-bottom:14px; line-height:1.6;">' +
                '마트에서 파는 단위로 바꿨어요. 두부 45g 은 살 수가 없으니까요</div>' +

            show.map(function (it) { return row(it, false); }).join("") +

            (plus ? leftoverHTML(r) : '') +

            (plus && r.have.length
                ? '<div style="margin-top:16px; background:#EAF7F1; border:1px solid #A7DFC8; ' +
                  'border-radius:14px; padding:14px 16px;">' +
                  '<div style="font-size:12.5px; font-weight:900; color:#1F6F52; margin-bottom:8px;">' +
                      '📦 언제깠지에 있어요 — 안 사셔도 됩니다</div>' +
                  r.have.map(function (it) {
                      return '<span style="display:inline-block; font-size:11.5px; font-weight:800; ' +
                             'color:#1F6F52; background:#FFFFFF; border-radius:8px; padding:5px 9px; ' +
                             'margin:0 5px 5px 0;">' + esc(it.name) +
                             (it.left !== null ? ' · ' + it.left + '일' : '') + '</span>';
                  }).join("") + '</div>'
                : '') +

            (function () {
                var g = bought().length;
                if (!g) return '';
                return '<div style="margin-top:12px; display:flex; align-items:center; gap:8px; ' +
                    'font-size:12px; font-weight:700; color:#1F6F52;">' +
                    '<span style="flex:1;">✓ ' + g + '가지 담으셨어요</span>' +
                    '<span onclick="window.clearBought()" style="color:' + GRAY + '; ' +
                        'font-weight:800; cursor:pointer;">전부 되돌리기</span></div>';
            })() +

            '<div onclick="window.copyShopList()" style="margin-top:16px; text-align:center; ' +
                'padding:16px; background:' + DARK + '; color:#FFFFFF; border-radius:13px; ' +
                'font-size:14.5px; font-weight:900; cursor:pointer;">📋 목록 복사하기</div>' +

            '<div style="font-size:11.5px; font-weight:600; color:' + GRAY + '; ' +
                'margin-top:11px; line-height:1.7; word-break:keep-all;">' +
                '쿠팡은 밖에서 여러 개를 한 번에 담을 수가 없어요. ' +
                '재료 옆 🛒 를 누르면 <b>그 재료만 바로</b> 열립니다. ' +
                '복사해서 쿠팡 검색창에 붙여 넣으셔도 됩니다. 산 건 왼쪽 <b>✓</b> 를 눌러 지우세요.</div>' +

        '</div>';
    }

    /* 기존 '이번 주 식단을 완성하려면 N가지 재료가 필요해요' 카드와 겹친다.
       같은 일을 하는 게 둘이면 고를 게 늘어난 것뿐이다. 위쪽을 접는다. */
    function hideOldCard() {
        var box = document.getElementById("autopilot-result-container");
        if (!box) return;
        var divs = box.querySelectorAll("div");
        for (var i = 0; i < divs.length; i++) {
            var t = divs[i].textContent || "";
            if ((t.indexOf("재료가 필요해요") > -1 || t.indexOf("스마트 장보기 비서") > -1) &&
                t.indexOf("몇 개 사면 되나") === -1) {
                var p = divs[i];
                for (var k = 0; k < 4 && p && p.parentNode !== box; k++) p = p.parentNode;
                if (p && p.parentNode === box) { p.style.display = "none"; return; }
            }
        }
    }

    function mount() {
        var host = document.getElementById("autopilot-result-container");
        if (!host || !window.currentWeeklyPlan) return;
        hideOldCard();
        var old = document.getElementById(ID);
        if (old) old.remove();
        var box = document.createElement("div");
        box.innerHTML = html();
        if (box.firstChild) host.appendChild(box.firstChild);
    }

    window.refreshShopList = mount;

    function boot() {
        var f = window.drawAutoPilotUI;
        if (typeof f === "function" && !f.__shop) {
            var w = function () { var o = f.apply(this, arguments); setTimeout(mount, 60); return o; };
            w.__shop = true;
            window.drawAutoPilotUI = w;
        }
        setTimeout(mount, 1500);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    window.shopDebug = function () {
        console.log("PLUS:", isPlus());
        var r = build();
        if (!r) return console.log("식단표를 먼저 만들어 주세요");
        console.log("살 것 " + r.buy.length + "가지 · 집에 있는 것 " + r.have.length + "가지");
        r.buy.forEach(function (i) {
            var b = buyText(i);
            console.log("   " + i.name + "  " + b.main + "   " + b.sub);
        });
        r.have.forEach(function (i) { console.log("   📦 " + i.name + (i.left !== null ? " " + i.left + "일" : "")); });
    };
})();