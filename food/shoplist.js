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

    var BLUE = "#7F77DD", GRAY = "#A3958A", DARK = "#4A413C";
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
            var fr = t.match(/^(.+?)\s*(\d+)\/(\d+)\s*(개|장|알)?$/);
            if (fr) {
                var fn = fr[1].replace(/\s*(약간|조금|적당량|소량)\s*$/, "").trim();
                for (var j = 0; j < SKIP.length; j++) { if (fn.indexOf(SKIP[j]) > -1) return; }
                out.push({ name: fn, qty: parseInt(fr[2], 10) / (parseInt(fr[3], 10) || 1), unit: fr[4] || "개" });
                return;
            }
            var m = t.match(/^(.+?)\s*([\d.]+)\s*(g|ml|개|장|알|마리|T|t|큰술|작은술|컵)?$/);
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
        var n = name.replace(/^(초기용|중기용|후기용|초기|중기|후기|완료기)\s*/, "").trim();
        // 손질 상태는 장볼 때 상관없다 ('다진 소고기' · '푹 익은 바나나' · '불린 쌀' 은 소고기 · 바나나 · 쌀을 산다)
        n = n.replace(/^(후숙|푹 익은|생물|익힌|물기 짠|찌개용|찐|불린|다진|생)\s+/, "").trim();
        /* ⚠️ 레시피마다 '소고기 안심' 과 '소고기' 로 달리 적혀 있어서 장보기에 소고기가 두 줄로 잡혔다
              (30g 한 팩 + 30g 한 팩 → 실제로는 60g 한 팩). 같은 걸 한 이름으로 모은다. */
        var SAME = { "소고기 안심": "소고기", "소고기안심": "소고기", "소고기 다짐육": "소고기", "소고기다짐육": "소고기", "소고기 불고기감": "소고기",
                     "한우 안심": "소고기", "한우": "소고기", "비타민": "비타민채", "달걀": "계란", "계란 노른자": "계란",
                     "새우살": "새우", "가자미살": "가자미", "돼지안심": "돼지 안심", "알배추": "배추", "알배기배추": "배추",
                     "방토": "방울토마토", "브로콜리 꽃송이": "브로콜리" };
        return SAME[n] || n;
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
        /* ⚠️ 이름 + 단위로 묶어서 '고구마' 가 두 줄(그램 한 줄 · 개 한 줄)로 나왔고,
              '사과 1/4개' 를 그램으로 읽어 '식단에 0g 써요' 가 찍혔다. 진밥 100g 도 살 것으로 나왔다.
              이름 하나로 모으고 그램 · 개수를 따로 센다. 밥처럼 집에서 짓는 건 뺀다. */
        plan.forEach(function (d, i) {
            if (!d || !d.recipe) return;
            parseIng(d.recipe.ingredients).forEach(function (it) {
                var nm = tidy(it.name).replace(/\s*\d+\s*(마리|개)$/, "").trim();
                if (!nm || VAGUE.test(nm)) return;
                if (/^계란(물| 노른자)?$|^달걀/.test(nm)) nm = "계란";
                var key = nm;
                if (!bag[key]) bag[key] = { name: nm, g: 0, pcs: 0, days: [], n: 0 };
                if (it.qty) {
                    if (/^(개|알|장|마리)$/.test(it.unit)) bag[key].pcs += it.qty;
                    else if (/^(g|ml|)$/.test(it.unit)) bag[key].g += it.qty;
                }
                bag[key].qty = bag[key].g + bag[key].pcs;
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
        ["비타민채",   100, "봉"],   // 없어서 '30g' 처럼 그램으로만 나왔다
        ["콩나물",     300, "봉"],
        ["배추",       600, "통"],    // 알배추 한 통
        ["완두콩",     500, "봉"],    // 냉동 완두
        ["옥수수",     250, "개"],
        ["케일",       100, "봉"],
        ["숙주",       300, "봉"],
        ["표고",       100, "팩"],
        ["양송이",     150, "팩"],
        ["새송이",     200, "팩"],
        ["팽이",       150, "봉"],
        ["파프리카",   150, "개"],
        ["렌틸",       500, "봉"],
        ["아스파라거스", 250, "단"],
        ["연근",       300, "팩"],
        ["퀴노아",     500, "봉"],
        ["병아리콩",   500, "봉"],
        ["검은콩",     500, "봉"],
        ["자두",        80, "개"],
        ["블루베리",   125, "팩"],
        ["밤",         500, "봉"],
        ["대추",       100, "봉"],
        ["잣가루",     100, "봉"],
        ["호두가루",   100, "봉"],
        ["땅콩가루",   100, "봉"],
        ["들깨가루",   100, "봉"],
        ["관자",       200, "팩"],
        ["게살",       100, "팩"],
        ["멸치",       100, "봉"],
        ["방울토마토", 500, "팩"],
        ["아보카도",   200, "개"],
        ["치즈",         1, "장"],
        ["김",           1, "장"]
    ];

    /* ⚠️ 앞에서부터 '들어 있으면' 골랐더니 배추가 배(400g 한 개)로, 무염버터 · 무조미 김 · 무첨가 가루가
          무(800g 한 개)로 잡혔다. 꾸밈말을 떼고, 가장 길게 맞는 이름을 고른다. */
    function packOf(name) {
        var n = String(name || "").replace(/^(무염|무첨가|무조미|무가당|생물|후숙|푹 익은|익힌|찐|말린|불린|냉동|다진|생)\s*/g, "");
        var best = null;
        for (var i = 0; i < PACK.length; i++) {
            var key = PACK[i][0];
            if (n.indexOf(key) < 0) continue;
            if (key === "무" && !/^무(\s|$|\d)/.test(n)) continue;     // 무 · 무 10g 만 '무'
            if (key === "배" && /배추|배즙/.test(n)) continue;
            if (!best || key.length > best[0].length) best = PACK[i];
        }
        return best ? { unitG: best[1], word: best[2] } : null;
    }

    // 그램 · 개수 → 몇 개 사면 되나, 얼마 남나
    function need(it) {
        var p = packOf(it.name);
        if (!p || !p.unitG || p.word === "장" || p.word === "판") return null;
        var useG = (it.g || 0) + (it.pcs || 0) * p.unitG;
        if (!useG) return null;
        var n = Math.max(1, Math.ceil(useG / p.unitG));
        return { n: n, word: p.word, unitG: p.unitG, useG: Math.round(useG), left: n * p.unitG - Math.round(useG) };
    }
    /* 사과 1/4개 → '1/4개' (예전엔 '조금개' 로 찍혔다) */
    function pcsText(x, word) {
        word = word || "";
        if (x >= 1) return (Math.round(x * 10) / 10) + word;
        if (x < 0.15) return "조금";
        var F = [[0.25, "1/4"], [1 / 3, "1/3"], [0.5, "반"], [2 / 3, "2/3"], [0.75, "3/4"]], best = F[0];
        F.forEach(function (f) { if (Math.abs(f[0] - x) < Math.abs(best[0] - x)) best = f; });
        return best[1] === "반" ? "반 " + word : best[1] + word;
    }

    // 45g → "한 모" · "식단에 45g 써요 · 255g 남아요"
    function buyText(it) {
        if (/계란|달걀/.test(it.name)) return { main: "10구", sub: it.pcs ? "식단에 " + pcsText(it.pcs, "개") + " 써요" : "" };
        if (/치즈/.test(it.name)) return { main: "한 봉", sub: it.pcs ? "식단에 " + pcsText(it.pcs, "장") + " 써요" : "" };
        var k = need(it);
        if (k) {
            var used = it.g ? "식단에 " + Math.round(it.g) + "g 써요" : "식단에 " + pcsText(it.pcs, k.word) + " 써요";
            return { main: (k.n === 1 ? "한 " : k.n + " ") + k.word, sub: used + (k.left >= k.unitG * 0.2 ? " · " + k.left + "g 남아요" : "") };
        }
        if (it.pcs) return { main: Math.max(1, Math.ceil(it.pcs)) + "개", sub: "" };
        if (it.g) return { main: "", sub: "식단에 " + Math.round(it.g) + "g 써요" };
        return { main: "", sub: it.n + "번 들어가요" };
    }

    /* ---------- 남는 걸로 뭘 하나 ----------
       두부 한 모를 사면 255g 이 남는다. 그게 이유식의 진짜 고민이다.
       같은 재료가 들어가는 다른 레시피를 찾아 붙여준다. -------- */

    /* ⚠️ 예전엔 이름이 들어간 레시피를 앞에서부터 세 개 집었다.
          그래서 쌀가루·소고기 추천이 똑같은 셋이었고, 전부 아직 안 먹여본 재료(청경채·애호박…)가 든 것이었다.
          알레르기 탭은 '새 재료는 하나씩, 사흘씩' 이라고 하는데 여기서 새 재료를 여러 개 권한 셈이다.
          이제 먹여본 재료로만 된 레시피를 먼저, 새 재료가 들면 '새 재료' 라고 적는다. 줄끼리 겹치지 않게 한다. */
    function passedNames() {
        var out = [];
        try {
            var db = JSON.parse(localStorage.getItem("tosil_food_calendar")) || {};
            Object.keys(db).forEach(function (d) {
                (db[d] || []).forEach(function (r) {
                    if (r && r.ingredient && r.status !== "fail") out.push(tidy(String(r.ingredient).trim()));
                });
            });
        } catch (e) {}
        return out;
    }
    var BASIC = /^(물|쌀가루|쌀|찹쌀가루|육수|멸치육수|다시마|참기름|들기름|올리브유|버터|분유|모유)$/;
    function newCount(r, passed) {
        var n = 0;
        parseIng(r.ingredients).forEach(function (it) {
            var nm = tidy(it.name);
            if (!nm || BASIC.test(nm)) return;
            var ok = passed.some(function (p) { return p && (nm.indexOf(p) > -1 || p.indexOf(nm) > -1); });
            if (!ok) n++;
        });
        return n;
    }
    function leftoverIdeas(name, exclude, shown) {
        var cand = [];
        try {
            var stage = document.getElementById("food-age");
            var age = stage ? stage.value : null;
            var passed = passedNames();
            (babyFoodData || []).forEach(function (r, i) {
                if (age && age !== "all" && r.age !== age) return;
                if (exclude.indexOf(r.name) > -1) return;
                if (String(r.ingredients).indexOf(name) === -1) return;
                cand.push({ name: r.name, n: newCount(r, passed), seen: (shown || []).indexOf(r.name) > -1, i: i });
            });
        } catch (e) {}
        cand.sort(function (a, b) { return (a.seen - b.seen) || (a.n - b.n) || (a.i - b.i); });
        return cand.slice(0, 3).map(function (c) {
            if (shown) shown.push(c.name);
            return c.n ? c.name + " (새 재료 " + c.n + "가지)" : c.name;
        });
    }


    /* ---------- 장볼 때 부르는 이름 ----------
       ⚠️ '여보한테 장볼 거 보내기' 가 레시피 재료를 그대로 보냈다. "소고기 10g · 쌀가루 15g · 물 150ml".
          받은 사람은 마트에서 '고기 10g' 을 살 수 없다 (테스터 문의: "고기 우둔살 이런 게 낫지 않나").
          정육 코너에서 부르는 이름, 파는 단위(팩 · 개 · 단)로 바꾸고 그램은 뺀다.
          쌀가루 · 진밥 · 간장처럼 집에 있을 법한 건 '집에 없으면' 으로 따로 두고 처음엔 빼 둔다. */
    var BUY = [
        // [이름 조각, 장볼 때 이름, 짧은 메모]
        ["소고기",   "소고기 안심이나 우둔살", "기름 적은 부위 · 이유식용 다짐육도 돼요"],
        ["닭안심",   "닭안심", ""],
        ["닭가슴",   "닭가슴살", ""],
        ["닭다리",   "닭다리살", "껍질 없는 정육"],
        ["돼지 안심", "돼지 안심", ""],
        ["대구",     "대구살", "냉동 순살이면 가시 걱정이 덜해요"],
        ["가자미",   "가자미 순살", ""],
        ["연어",     "연어 순살", ""],
        ["새우",     "새우살", "칵테일 새우"],
        ["관자",     "가리비 관자", ""],
        ["멸치",     "지리멸치", "잔멸치"],
        ["아보카도", "아보카도", "말랑하게 익은 걸로"],
        ["아기치즈", "아기 치즈", "1단계"],
        ["아기 1단계 치즈", "아기 치즈", "1단계"],
        ["치즈",     "아기 치즈", "1단계"],
        ["쌀가루",   "이유식 쌀가루", ""],
        ["오트밀",   "오트밀", ""],
        ["아기간장", "아기 간장", ""],
        ["아기면",   "아기 국수", ""]
    ];
    var STAPLE = /^(진밥|밥|무른 밥|쌀|불린 쌀|쌀가루|찹쌀가루|오트밀|오트밀가루|퀵오트밀|아기간장|간장|현미유|참기름|참기름 한방울|들기름|올리브유|무염버터|버터|감자전분|전분|전분물|밀가루|부침가루|빵가루|무염 빵가루|분유|분유물|우유|생우유|대파|아기면|우동면)$/;
    var VAGUE = /^(다진 야채|볶은 야채|야채|채소|버섯|당근\/양파|감자\/당근\/양파|진밥|밥|무른 밥)$/;    // 이름만으로는 살 수 없다 · 밥은 집에서 짓는다

    function buyName(n) {
        for (var i = 0; i < BUY.length; i++) {
            if (n.indexOf(BUY[i][0]) > -1) return { name: BUY[i][1], note: BUY[i][2] };
        }
        return { name: n, note: "" };
    }
    function countText(base, g) {
        if (/계란|달걀/.test(base)) return "10구";
        if (/치즈/.test(base)) return "1봉";
        var p = packOf(base);
        if (!p || !p.unitG || p.word === "장" || p.word === "판") return "";
        return Math.max(1, g ? Math.ceil(g / p.unitG) : 1) + p.word;      // 1팩 · 2개 · 1단
    }

    /* 레시피 재료 글자(여러 개) → 장볼 목록 [{ name, count, note, staple }] */
    window.shopItemsFrom = function (strs) {
        var bag = {}, order = [];
        [].concat(strs || []).forEach(function (str) {
            parseIng(str).forEach(function (it) {
                var t = tidy(it.name).replace(/\s*\d+\s*(마리|개)$/, "").trim();
                if (!t || VAGUE.test(t)) return;
                if (/^계란(물| 노른자)?$|^달걀/.test(t)) t = "계란";
                var b = buyName(t);
                if (!bag[b.name]) {
                    bag[b.name] = { name: b.name, note: b.note, base: t, staple: STAPLE.test(t), g: 0 };
                    order.push(b.name);
                }
                if (it.qty && (it.unit === "g" || it.unit === "")) bag[b.name].g += it.qty;
            });
        });
        return order.map(function (k) {
            var x = bag[k];
            return { name: x.name, count: countText(x.base, x.g), note: x.note, staple: x.staple };
        }).sort(function (a, b) { return a.staple - b.staple; });
    };

    /* ---------- 짝꿍에게 보내기 ----------
       테스터 문의: "남편한테 보내기 · 아내한테 보내기 이렇게 거치면 어떨까".
       누구에게 가는지 버튼에 적고, 보내기 전에 목록을 한 번 보여 준다 (집에 있는 건 눌러서 뺀다).
         배냇함으로   짝꿍 폰에 알림 + 바통터치에 '장보기' 부탁이 올라간다. 다 사면 '해결' 을 누른다 (shared/familysend.js)
         카톡으로     같은 목록을 글로 */
    window.shopPartnerWord = function () {
        var r = localStorage.getItem("user_role");
        return r === "mom" ? "남편" : (r === "dad" ? "아내" : "짝꿍");
    };
    window.shopSendLabel = function () { return window.shopPartnerWord() + "한테 장볼 거 보내기"; };
    // 남편이 · 아내가 · 짝꿍이 (받침에 따라)
    function iga(w) { var c = w.charCodeAt(w.length - 1); return w + (c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 ? "이" : "가"); }

    var SEND = { title: "", intro: "", items: [], off: {} };

    function sendText(items) {
        return items.map(function (it) {
            return "· " + it.name + (it.count ? " " + it.count : "") + (it.note ? " (" + it.note + ")" : "");
        }).join("\n");
    }
    function picked() { return SEND.items.filter(function (it, i) { return !SEND.off[i]; }); }

    window.closeShopSend = function () {
        var s = document.getElementById("shop-send-sheet");
        if (s) s.remove();
        document.body.style.overflow = "";
    };

    window.toggleShopSendItem = function (i) {
        SEND.off[i] = !SEND.off[i];
        paintSend();
    };

    function paintSend(state) {
        var box = document.getElementById("shop-send-body");
        if (!box) return;
        var who = window.shopPartnerWord();
        var rows = SEND.items.map(function (it, i) {
            var off = !!SEND.off[i];
            return '<div onclick="window.toggleShopSendItem(' + i + ')" style="display:flex; align-items:flex-start; gap:10px; padding:11px 0; ' +
                'border-bottom:1px solid #F6F2EC; cursor:pointer;' + (off ? ' opacity:0.45;' : '') + '">' +
                '<div style="flex-shrink:0; width:22px; height:22px; border-radius:7px; margin-top:1px; display:flex; align-items:center; justify-content:center; font-size:12px; ' +
                    (off ? 'background:#FFFFFF; border:1.5px solid #DCD3C8; color:transparent;' : 'background:' + DARK + '; color:#FFFFFF;') + '">✓</div>' +
                '<div style="flex:1; min-width:0;">' +
                    '<div style="font-size:14.5px; font-weight:800; color:' + DARK + ';' + (off ? ' text-decoration:line-through;' : '') + '">' + esc(it.name) +
                        (it.staple ? ' <span style="font-size:11px; font-weight:800; color:' + GRAY + ';">집에 없으면</span>' : '') + '</div>' +
                    (it.note ? '<div style="font-size:12px; font-weight:600; color:' + GRAY + '; margin-top:2px;">' + esc(it.note) + '</div>' : '') +
                '</div>' +
                '<div style="flex-shrink:0; font-size:14px; font-weight:900; color:' + BLUE + ';">' + esc(it.count || "") + '</div>' +
            '</div>';
        }).join("");
        var n = picked().length;
        var app = state && state.ok;
        var why = state && !state.ok ? (state.why === "nopartner" ? iga(who) + " 배냇함에 들어오면 앱으로도 보낼 수 있어요"
                                       : state.why === "login" || state.why === "nofamily" ? "로그인하고 가족을 연결하면 앱으로도 보낼 수 있어요"
                                       : state.why === "offline" ? "인터넷이 약해서 지금은 카톡으로만 보낼 수 있어요" : "") : "";
        box.innerHTML = rows +
            '<div style="font-size:12px; font-weight:600; color:' + GRAY + '; margin:12px 0 14px; line-height:1.6; word-break:keep-all;">' +
                (n ? '집에 있는 건 눌러서 빼세요. ' + n + '가지를 보내요' : '보낼 게 없어요. 하나 이상 골라 주세요') + '</div>' +
            (state === undefined
                ? '<div style="padding:15px; border-radius:14px; background:#F6F2EC; color:' + GRAY + '; text-align:center; font-size:14px; font-weight:800;">보낼 수 있는지 보는 중…</div>'
                : (app ? '<div onclick="window.sendShopApp()" style="padding:15px; border-radius:14px; background:' + DARK + '; color:#FFFFFF; text-align:center; font-size:15px; font-weight:900; cursor:pointer;' + (n ? '' : ' opacity:0.4; pointer-events:none;') + '">💌 ' + who + ' 배냇함으로 보내기</div>' +
                         '<div style="font-size:11.5px; font-weight:600; color:' + GRAY + '; margin-top:8px; line-height:1.6; text-align:center; word-break:keep-all;">' + who + ' 폰에 알림이 가고, 바통터치에서 다 샀다고 누를 수 있어요</div>'
                       : (why ? '<div style="font-size:12px; font-weight:700; color:' + GRAY + '; text-align:center; margin-bottom:2px;">' + esc(why) + '</div>' : ''))) +
            '<div onclick="window.sendShopKakao()" style="margin-top:10px; padding:14px; border-radius:14px; background:#FFFFFF; border:1.5px solid #DCD3C8; color:' + DARK + '; text-align:center; font-size:14.5px; font-weight:900; cursor:pointer;' + (n ? '' : ' opacity:0.4; pointer-events:none;') + '">카톡으로 보내기</div>';
    }

    /* 레시피 하나 또는 이번 주 식단 전체
         title  창에 보일 이름 (소고기 청경채죽 · 이번 주 식단 7끼)
         intro  보내는 글 첫 줄 ("오늘 이유식은 [소고기 청경채죽] 할게요.") */
    window.openShopSend = function (title, strs, intro) {
        var items = window.shopItemsFrom(strs);
        SEND = { title: String(title || ""), intro: String(intro || ""), items: items, off: {} };
        items.forEach(function (it, i) { if (it.staple) SEND.off[i] = true; });
        window.closeShopSend();
        var who = window.shopPartnerWord();
        var w = document.createElement("div");
        w.id = "shop-send-sheet";
        w.setAttribute("style", "position:fixed; inset:0; z-index:100005; background:rgba(43,36,30,0.45); display:flex; align-items:flex-end; justify-content:center;");
        w.onclick = function (e) { if (e.target === w) window.closeShopSend(); };
        w.innerHTML = '<div style="width:100%; max-width:480px; max-height:86vh; overflow-y:auto; background:#FFFFFF; border-radius:24px 24px 0 0; ' +
                'padding:20px 20px calc(20px + env(safe-area-inset-bottom, 0px)); box-sizing:border-box;">' +
            '<div style="width:40px; height:5px; background:#EDE6DE; border-radius:3px; margin:0 auto 16px;"></div>' +
            '<div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">' +
                '<div><div style="font-size:18px; font-weight:900; color:' + DARK + ';">' + esc(who) + '한테 장볼 거</div>' +
                '<div style="font-size:12.5px; font-weight:600; color:' + GRAY + '; margin-top:4px;">' + esc(SEND.title) + '</div></div>' +
                '<div onclick="window.closeShopSend()" style="font-size:22px; color:' + GRAY + '; cursor:pointer; line-height:1; padding:2px 4px;">✕</div>' +
            '</div>' +
            '<div id="shop-send-body" style="margin-top:12px;"></div>' +
        '</div>';
        document.body.appendChild(w);
        document.body.style.overflow = "hidden";
        paintSend();
        if (window.FamilySend) window.FamilySend.ready().then(function (st) { SEND.state = st; paintSend(st); });
        else { SEND.state = { ok: false, why: "" }; paintSend(SEND.state); }
    };

    window.sendShopKakao = function () {
        var items = picked();
        if (!items.length) return;
        var txt = "여보, " + (SEND.intro ? SEND.intro + "\n" : "") + "장 볼 거 보내요.\n\n" + sendText(items) + "\n\n(배냇함 이유식에서 보냄)";
        window.closeShopSend();
        var K = window.Kakao;
        if (K && K.Share && (!K.isInitialized || K.isInitialized())) {
            try {
                K.Share.sendDefault({
                    objectType: "text", text: txt,
                    link: { mobileWebUrl: "https://happy-baby0303.github.io/", webUrl: "https://happy-baby0303.github.io/" },
                    buttons: [{ title: "배냇함 열기", link: { mobileWebUrl: "https://happy-baby0303.github.io/", webUrl: "https://happy-baby0303.github.io/" } }]
                });
                return;
            } catch (e) {}
        }
        var done = function () { alert("장볼 거 목록을 복사했어요. 카톡에 붙여 넣어 보내세요."); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, function () { prompt("아래 내용을 복사해 주세요", txt); });
        else prompt("아래 내용을 복사해 주세요", txt);
    };

    window.sendShopApp = function () {
        var items = picked();
        if (!items.length || !window.FamilySend) return;
        var who = window.shopPartnerWord();
        var me = localStorage.getItem("user_role") === "dad" ? "아빠" : "엄마";
        var line = items.map(function (it) { return it.name + (it.count ? " " + it.count : ""); });
        var box = document.getElementById("shop-send-body");
        if (box) box.style.opacity = "0.6";
        window.FamilySend.baton({
            text: "🛒 장보기 — " + line.join(" · "),
            kind: "shop", from: "food",
            items: items.map(function (it) { return it.name + (it.count ? " " + it.count : "") + (it.note ? " (" + it.note + ")" : ""); }),
            title: "🛒 " + me + "가 장 볼 거를 보냈어요",
            body: line[0] + (line.length > 1 ? " 외 " + (line.length - 1) + "가지" : ""),
            link: "index.html?go=baton"
        }).then(function (r) {
            if (box) box.style.opacity = "";
            if (r && r.ok) {
                window.closeShopSend();
                var t = document.createElement("div");
                t.setAttribute("style", "position:fixed; left:50%; bottom:calc(90px + env(safe-area-inset-bottom, 0px)); transform:translateX(-50%); background:rgba(43,36,30,0.92); color:#FFF; " +
                    "padding:12px 18px; border-radius:14px; font-size:13.5px; font-weight:800; z-index:100006; white-space:nowrap;");
                t.textContent = who + " 배냇함으로 보냈어요";
                document.body.appendChild(t);
                setTimeout(function () { t.remove(); }, 2200);
            } else {
                paintSend({ ok: false, why: (r && r.why) || "offline" });
            }
        });
    };

    /* ---------- 복사 ---------- */

    window.copyShopList = function () {
        var r = build();
        if (!r) return;
        /* 붙여 넣는 곳은 거의 카톡이다. 그램 말고 장볼 때 부르는 이름 · 파는 단위로 (위 '장볼 때 부르는 이름') */
        var strs = [];
        (window.currentWeeklyPlan || []).forEach(function (d) { if (d && d.recipe) strs.push(d.recipe.ingredients); });
        var haveNames = r.have.map(function (it) { return it.name; });
        var items = window.shopItemsFrom(strs).filter(function (it) {
            return !haveNames.some(function (h) { return it.name.indexOf(h) > -1 || h.indexOf(it.name) > -1; });
        });
        var lines = ["🛒 이번 주 장보기 (배냇함)"];
        items.filter(function (it) { return !it.staple; }).forEach(function (it) {
            lines.push("· " + it.name + (it.count ? " " + it.count : "") + (it.note ? " (" + it.note + ")" : ""));
        });
        var st = items.filter(function (it) { return it.staple; });
        if (st.length) {
            lines.push("");
            lines.push("집에 없으면 같이");
            st.forEach(function (it) { lines.push("· " + it.name); });
        }
        if (r.have.length) {
            lines.push("");
            lines.push("📦 집에 있는 것 (안 사도 됨)");
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

    window.openWeekShopSend = function () {
        var strs = [];
        (window.currentWeeklyPlan || []).forEach(function (d) { if (d && d.recipe) strs.push(d.recipe.ingredients); });
        if (!strs.length) return;
        window.openShopSend("이번 주 식단 " + strs.length + "끼", strs, "이번 주 이유식 식단이에요.");
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

        return '<div style="padding:12px 0; border-bottom:1px solid #F6F2EC;' +
            (got ? ' opacity:0.45;' : '') + '">' +
            '<div style="display:flex; align-items:center; gap:10px;">' +

                '<div onclick="window.toggleBought(\'' + q + '\')" ' +
                    'style="flex-shrink:0; width:24px; height:24px; border-radius:8px; cursor:pointer; ' +
                    'display:flex; align-items:center; justify-content:center; font-size:13px; ' +
                    (got ? 'background:#1F9D6B; color:#FFFFFF;'
                         : 'background:#FFFFFF; border:1.5px solid #DCD3C8; color:transparent;') +
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
                    'background:#F6F2EC; color:#7A6F68; display:flex; align-items:center; ' +
                    'justify-content:center; font-size:13px; font-weight:900; cursor:pointer;">🛒</div>') +
            '</div>' +
        '</div>';
    }

    function leftoverHTML(r) {
        var used = [];
        try { (window.currentWeeklyPlan || []).forEach(function (d) { if (d.recipe) used.push(d.recipe.name); }); } catch (e) {}

        var rows = [], shownIdeas = [];
        r.buy.forEach(function (it) {
            if (rows.length >= 3) return;
            var p = packOf(it.name);
            var k = need(it);
            if (!p || !k) return;
            var left = k.left;
            if (left < p.unitG * 0.4) return;                 // 조금 남는 건 말 안 한다
            var ideas = leftoverIdeas(it.name, used, shownIdeas);
            if (!ideas.length) return;
            rows.push('<div style="padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.12);">' +
                '<div style="font-size:12.5px; font-weight:900; color:#FFFFFF;">' +
                    esc(it.name) + ' ' + left + 'g 남아요</div>' +
                '<div style="font-size:11.5px; font-weight:700; color:#DCD3C8; margin-top:3px; ' +
                    'line-height:1.6;">' + esc(ideas.join(" · ")) + '</div>' +
            '</div>');
        });
        if (!rows.length) return "";

        return '<div style="background:#4A413C; border-radius:16px; padding:16px 18px; margin-top:16px;">' +
            '<div style="font-size:13.5px; font-weight:900; color:#FFFFFF; margin-bottom:4px;">' +
                '🍲 남는 걸로 이런 것도 돼요</div>' +
            '<div style="font-size:11.5px; font-weight:600; color:#A3958A; margin-bottom:8px; line-height:1.6;">' +
                '이유식 재료는 늘 남아요. 버리기 전에 한 번 보세요</div>' +
            rows.join("") +
        '</div>';
    }

    function html() {
        var r = build();
        if (!r) return "";
        var plus = isPlus();
        var show = r.buy;

        return '<div id="' + ID + '" style="background:#FFFFFF; border:1px solid #EDE6DE; ' +
            'border-radius:20px; padding:20px; margin-top:16px;">' +

            '<div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">' +
                                '<div data-plus-head style="font-size:16px; font-weight:900; color:' + DARK + ';">🛒 몇 개 사면 되나</div>' +
            '</div>' +
            '<div style="font-size:12.5px; font-weight:600; color:' + GRAY + '; ' +
                'margin-bottom:14px; line-height:1.6;">' +
                '마트에서 파는 단위로 바꿨어요. 두부 45g은 살 수가 없으니까요</div>' +

            show.map(function (it) { return row(it, false); }).join("") +

            (plus ? leftoverHTML(r) : '') +

            (plus && r.have.length
                ? '<div style="margin-top:16px; background:#EAF7F1; border:1px solid #A7DFC8; ' +
                  'border-radius:14px; padding:14px 16px;">' +
                  '<div style="font-size:12.5px; font-weight:900; color:#1F6F52; margin-bottom:8px;">' +
                      '📦 언제깠지에 있어요. 안 사셔도 돼요</div>' +
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

            '<div style="display:flex; gap:8px; margin-top:16px;">' +
                '<div onclick="window.openWeekShopSend()" style="flex:1.4; text-align:center; padding:13px; background:' + DARK + '; color:#FFFFFF; border-radius:13px; ' +
                    'font-size:14.5px; font-weight:900; cursor:pointer;">💌 ' + window.shopPartnerWord() + '한테 보내기</div>' +
                '<div onclick="window.copyShopList()" style="flex:1; text-align:center; padding:13px; background:#FFFFFF; color:' + DARK + '; border:1.5px solid #DCD3C8; border-radius:13px; ' +
                    'font-size:14.5px; font-weight:900; cursor:pointer;">📋 복사</div>' +
            '</div>' +

            '<div style="font-size:11.5px; font-weight:600; color:' + GRAY + '; ' +
                'margin-top:11px; line-height:1.7; word-break:keep-all;">' +
                                '재료 옆 🛒를 누르면 <b>그 재료만 바로</b> 열려요. ' +
                '여러 개는 목록을 복사해 검색창에 붙여 넣으세요. 산 건 왼쪽 네모를 눌러 표시하세요.</div>' +

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