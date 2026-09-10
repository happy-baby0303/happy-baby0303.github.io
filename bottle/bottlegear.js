/* ============================================================
   배냇함 PLUS — 우리 집 수유 장비 (bottlegear.js)

   젖병 탭에서 부모가 진짜 반복해서 겪는 건 두 가지다.

       "내 소독기에 이 젖병 써도 되나"
       "이거 언제 갈아야 하지"

   둘 다 검색이 안 된다. 내가 가진 A와 내가 가진 B의 조합 문제라서,
   부모는 자기가 뭘 검색해야 하는지를 모른다.
   앱은 안다. 둘 다 등록돼 있으니까.

   ⚠️ 위험한 건 안 만든다.
      조유기 깔때기 설정은 넣지 않는다. 농도가 틀어지면 아기가 다치고,
      제조사 표는 수시로 바뀐다. 우리가 숫자를 만들면 틀릴 숫자가 생긴다.

   ⚠️ '환경호르몬' 같은 말은 안 쓴다. 겁주는 말이고 근거가 없다.
      우리가 말할 수 있는 건 '제조사가 뭐라고 적어놨나' 까지다.

   ⚠️ 소모품은 '갈아야 합니다' 가 아니라 '볼 때가 됐어요' 다.
      앱이 챙겨준다고 하면 부모가 스스로 보는 걸 그만둔다.
      그러다 알림이 한 번 안 뜨면 예전보다 위험해진다.

   index.html 에서 pacifier.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    /* ⚠️ data.js 의 소독 정보를 언제 조사했는지. 화면에 같이 띄운다.
          제품이 리뉴얼되면 이 글이 낡는다. 그때는 '그때는 맞았다' 가 되어야 한다.
          데이터를 다시 훑으실 때 이 날짜도 같이 고치세요. */
    var SPEC_ASOF = "2026년 3월 기준";

    var GEAR_KEY = "tosil_bottle_gear";
    var PART_KEY = "tosil_bottle_parts";
    var NIP_KEY  = "tosil_nipple_changed";   // ⚠️ bottleguide.js 와 같은 키. 따로 관리하면 안 된다

    var HOST = "bottle-gear", SHEET = "gear-sheet";
    var BLUE = "#3182F6", GRAY = "#8B95A1", DARK = "#191F28";
    var GREEN = "#1F9D6B", RED = "#E32636";

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
    function bottles() {
        try { if (typeof bottleData !== "undefined" && bottleData) return bottleData; } catch (e) {}
        return window.bottleData || [];
    }
    function byId(id) {
        var a = bottles();
        for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i];
        return null;
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

    function gear() {
        try { return JSON.parse(localStorage.getItem(GEAR_KEY)) || {}; } catch (e) { return {}; }
    }
    function saveGear(g) { try { localStorage.setItem(GEAR_KEY, JSON.stringify(g)); } catch (e) {} }
    function myBottles() { var g = gear(); return Array.isArray(g.bottles) ? g.bottles : []; }

    /* ==========================================================
       1. 소독 방식 × 젖병 — data.js 의 sterilization 을 읽는다
       ---------------------------------------------------------- */

    var METHODS = [
        { id: "boil",  label: "열탕 소독",   alias: ["열탕", "끓는물", "끓는 물"] },
        { id: "uv",    label: "UV 소독기",   alias: ["UV", "uv", "자외선"] },
        { id: "steam", label: "스팀 소독기", alias: ["스팀"] },
        { id: "dish",  label: "식기세척기",  alias: ["식세기", "식기세척기"] },
        { id: "micro", label: "전자레인지",  alias: ["전자레인지"] }
    ];
    function method(id) {
        for (var i = 0; i < METHODS.length; i++) if (METHODS[i].id === id) return METHODS[i];
        return null;
    }

    /* 괄호 안 문구를 읽는다.
       ⚠️ 순서가 중요하다. "공식금지, 현실은 변색 감수하고 씀" 은 금지가 먼저고,
          "특화-변색 거의 없음" 은 변색이 들어 있어도 괜찮은 쪽이다. */
    function judge(inner) {
        if (/금지|불가|비권장|안\s?됨|안돼|X/.test(inner)) return "no";
        if (/무제한|특화|거의\s?없|권장|^O$/.test(inner)) return "ok";
        if (/주의|변색|끈적|감수|올\s?수\s?있/.test(inner)) return "care";
        return "ok";
    }

    function verdict(t, mid) {
        var m = method(mid);
        if (!m || !t) return "unknown";
        for (var i = 0; i < m.alias.length; i++) {
            var a = m.alias[i];
            var re = new RegExp(a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\(([^)]*)\\)");
            var hit = String(t).match(re);
            if (hit) return judge(hit[1]);
            /* 괄호 없이 이름만 있는 것도 있다 — "전자레인지 3분 소독 특화" */
            if (String(t).indexOf(a) > -1) return "ok";
        }
        return "unknown";
    }

    var V = {
        no:      { icon: "\uD83D\uDD34", c: RED,   t: "제조사가 안 된다고 합니다" },
        care:    { icon: "\uD83D\uDFE1", c: "#8A6D00", t: "되지만 변색·끈적임이 올 수 있어요" },
        ok:      { icon: "\uD83D\uDFE2", c: GREEN, t: "괜찮습니다" },
        unknown: { icon: "\u26AA", c: GRAY, t: "이 방식은 적혀 있지 않아요. 제조사에 확인하세요" }
    };

    function matchList() {
        var g = gear();
        if (!g.sterilize) return null;
        return myBottles().map(function (id) {
            var b = byId(id);
            if (!b) return null;
            return { b: b, v: verdict(b.sterilization, g.sterilize) };
        }).filter(Boolean);
    }

    /* ==========================================================
       2. 소모품 — '갈아야 합니다' 가 아니라 '볼 때가 됐어요'
       ---------------------------------------------------------- */

    var PARTS = [
        { id: "nipple", label: "젖꼭지",      days: 60, key: NIP_KEY,
          why: "실리콘이 삭으면 조각이 떨어져 나올 수 있어요" },
        { id: "paci",   label: "쪽쪽이",      days: 45,
          why: "잡아당겨 늘어나거나 끈적이면 바로 바꾸세요" },
        { id: "brush",  label: "젖병솔",      days: 30,
          why: "솔이 더러우면 젖병을 닦는 의미가 없습니다" },
        { id: "straw",  label: "빨대컵 빨대", days: 60,
          why: "안쪽은 잘 안 보여서 오래 쓰기 쉬워요" },
        { id: "gasket", label: "빨대컵 패킹", days: 90,
          why: "새는 건 컵이 아니라 대개 이 고무입니다. 이것만 따로 팝니다" }
    ];

    function parts() {
        try { return JSON.parse(localStorage.getItem(PART_KEY)) || {}; } catch (e) { return {}; }
    }
    function partDate(p) {
        return p.key ? localStorage.getItem(p.key) : (parts()[p.id] || "");
    }

    /* \u26a0\ufe0f '오늘 갈았어요' 만 있으면 오늘 간 사람만 쓸 수 있다.
          3주 전에 갈았으면 적을 방법이 없어서 '아직 안 적으셨어요' 가 영영 안 없어진다.
          날짜를 직접 고를 수 있어야 한다. */
    window.logBottlePart = function (id, when) {
        var p = null;
        for (var i = 0; i < PARTS.length; i++) if (PARTS[i].id === id) p = PARTS[i];
        if (!p) return;
        var v = String(when || "").trim();
        if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return;      // 이상한 값은 무시
        if (v && daysSince(v) < 0) return;                      // 미래는 안 받는다
        var k = v || today();

        if (p.key) { try { localStorage.setItem(p.key, k); } catch (e) {} }
        else {
            var o = parts(); o[id] = k;
            try { localStorage.setItem(PART_KEY, JSON.stringify(o)); } catch (e) {}
        }

        /* 배냇함 '언제깠지' 에도 적어둔다 — 기한을 세는 곳은 거기다.

           ⚠️ 이름·날짜·기한만 넣으면 그쪽 화면에 undefined 가 찍힌다.
              '언제깠지' 는 이름 앞에 아이콘을, 위쪽 칩에 분류를 쓴다.

           ⚠️ 아이콘은 안 쓰기로 했다. 그렇다고 필드를 빼면 안 된다.
              빼면 undefined 가 다시 찍힌다. 빈 문자열이어야 앞에 아무것도 안 붙는다.

              분류는 script.js 의 정확한 필드 이름을 몰라 후보를 다 넣어뒀다.
              확인되면 맞는 것 하나만 남기고 지우면 된다. */
        try {
            var list = JSON.parse(localStorage.getItem("tosil_open_records")) || [];
            list = list.filter(function (r) { return !r || String(r.name) !== p.label; });
            list.push({
                id: "gear_" + id + "_" + Date.now(), name: p.label,
                emoji: "", icon: "",
                category: "수유", cat: "수유", type: "수유",
                openDate: k, limitDays: p.days
            });
            localStorage.setItem("tosil_open_records", JSON.stringify(list));
        } catch (e) {}

        paint();
    };

    /* ==========================================================
       3. 다음에 준비할 것 — 개월수별 전환
       ⚠️ 효능을 말하지 않는다. '이 무렵에 많이들 시작한다' 까지다.
       ---------------------------------------------------------- */

    var ROAD = [
        { at: 0,  label: "젖병 · 젖꼭지",     note: "지금 쓰고 계신 것" },
        { at: 6,  label: "컵 처음 보여주기",  note: "이유식 시작하면서 같이 쥐어보게 하는 집이 많아요" },
        { at: 9,  label: "빨대컵으로 물",     note: "흘리는 게 당연한 시기입니다. 턱받이가 더 급해요" },
        { at: 12, label: "손잡이 컵 · 젖병 졸업", note: "한 번에 끊지 않고 낮부터 줄여갑니다" }
    ];

    /* ==========================================================
       4. 생우유 — 말리는 기능이라 방향이 안전하다
       ⚠️ 양이나 속도를 숫자로 정해주지 않는다. 그건 소아과 몫이다.
       ---------------------------------------------------------- */

    function milkHTML() {
        var m = monthsOld();
        if (m === null) return "";

        if (m < 12) {
            var left = 12 - m;
            /* ⚠️ 웹앱이라 푸시가 없다. 앱을 열어야만 보인다.
                  그래서 '알려드릴게요' 라고 하지 않고, 돌이 가까워지면 눈에 띄게 만든다. */
            var near = (left <= 2);
            return '<div style="background:' + (near ? "#FFF9E6" : " #F9FAFB") + '; ' +
                'border:1px solid ' + (near ? "#F5E1A4" : "#E5E8EB") + '; border-radius:14px; ' +
                'padding:16px; margin-top:10px;">' +
                '<div style="font-size:13.5px; font-weight:900; color:' + (near ? GOLD : DARK) + ';">' +
                    '\uD83E\uDD5B 생우유는 아직이에요 \u00b7 약 ' + left + '개월 남았습니다</div>' +
                '<div style="margin-top:6px; font-size:12.5px; font-weight:600; color:#4E5968; ' +
                    'line-height:1.75; word-break:keep-all;">' +
                    '돌 무렵은 태어날 때 받아온 철분이 거의 떨어지는 때예요. ' +
                    '생우유에는 철분이 거의 없어서, 돌 전에 주식으로 주면 부족해지기 쉽습니다.' +
                    (left <= 1 ? ' <b>이제 곧이에요. 돌 지나면 여기가 바뀝니다.</b>' : '') +
                    '</div>' +
            '</div>';
        }

        return '<div style="background:#EAF7F1; border:1px solid #A7DFC8; border-radius:14px; ' +
            'padding:16px; margin-top:10px;">' +
            '<div style="font-size:13.5px; font-weight:900; color:#1F6F52;">' +
                '\uD83E\uDD5B 이제 생우유를 시작하셔도 되는 때예요</div>' +
            '<div style="margin-top:6px; font-size:12.5px; font-weight:600; color:#4E5968; ' +
                'line-height:1.75; word-break:keep-all;">' +
                '한 번에 바꾸지 말고 <b>분유에 조금씩 섞어가며</b> 넘어가는 집이 많습니다. ' +
                '얼마나 어떤 속도로 줄일지는 ' + esc(nm("의")) + ' 몸무게와 먹는 양을 보고 ' +
                '<b>소아과에서 정하시는 게 맞습니다.</b> 우유를 너무 많이 먹으면 ' +
                '오히려 다른 걸 안 먹게 되는 경우가 있어서요.</div>' +
        '</div>';
    }

    /* ==========================================================
       화면
       ---------------------------------------------------------- */

    window.setSterilize = function (id) {
        var g = gear();
        g.sterilize = (g.sterilize === id) ? "" : id;
        saveGear(g);
        paintSheet(); paint();
    };
    window.toggleMyBottle = function (id) {
        var g = gear(), list = myBottles(), i = list.indexOf(id);
        if (i > -1) list.splice(i, 1); else list.push(id);
        g.bottles = list;
        saveGear(g);
        paintSheet(); paint();
    };
    window.openGearSheet = function () {
        var old = document.getElementById(SHEET);
        if (old) old.remove();
        var w = document.createElement("div");
        w.id = SHEET;
        w.setAttribute("style", "position:fixed; inset:0; z-index:100030; background: #FFFFFF; " +
            "overflow-y:auto; -webkit-overflow-scrolling:touch;");
        document.body.appendChild(w);
        paintSheet();
    };
    window.closeGearSheet = function () {
        var el = document.getElementById(SHEET);
        if (el) el.remove();
        paint();
    };

    function paintSheet() {
        var w = document.getElementById(SHEET);
        if (!w) return;
        var g = gear(), have = myBottles();

        var brands = {};
        bottles().forEach(function (b) {
            (brands[b.brand] = brands[b.brand] || []).push(b);
        });

        w.innerHTML =
        '<div style="max-width:480px; margin:0 auto; padding:20px 20px 120px;">' +
            '<div style="display:flex; justify-content:space-between; align-items:center;">' +
                '<div style="font-size:18px; font-weight:900; color:' + DARK + ';">\uD83C\uDF7C 우리 집 수유 장비</div>' +
                '<span onclick="window.closeGearSheet()" style="font-size:24px; font-weight:300; ' +
                    'color:' + GRAY + '; cursor:pointer; line-height:1; padding:0 4px;">\u00d7</span>' +
            '</div>' +
            '<div style="margin-top:6px; font-size:13px; font-weight:600; color:' + GRAY + '; ' +
                'line-height:1.7; word-break:keep-all;">' +
                '한 번만 알려주시면 됩니다. 안 맞는 조합이 있으면 찾아드릴게요.</div>' +

            '<div style="margin-top:22px; font-size:13px; font-weight:900; color:' + DARK + '; ' +
                'margin-bottom:9px;">소독은 어떻게 하세요</div>' +
            '<div style="display:flex; flex-wrap:wrap; gap:7px;">' +
                METHODS.map(function (m) {
                    var on = (g.sterilize === m.id);
                    return '<div onclick="window.setSterilize(\'' + m.id + '\')" ' +
                        'style="padding:11px 15px; border-radius:12px; cursor:pointer; ' +
                        'font-size:13px; font-weight:800; ' +
                        (on ? 'background:' + DARK + '; color:#FFFFFF; border:1px solid ' + DARK + ';'
                            : 'background: #F9FAFB; color:#4E5968; border:1px solid #E5E8EB;') + '">' +
                        (on ? "\u2713 " : "") + m.label + '</div>';
                }).join("") +
            '</div>' +

            '<div style="margin-top:26px; font-size:13px; font-weight:900; color:' + DARK + '; ' +
                'margin-bottom:9px;">쓰고 계신 젖병을 눌러주세요</div>' +
            Object.keys(brands).map(function (br) {
                return '<div style="margin-bottom:16px;">' +
                    '<div style="font-size:11.5px; font-weight:900; color:' + GRAY + '; ' +
                        'letter-spacing:0.5px; margin-bottom:7px;">' + esc(br) + '</div>' +
                    '<div style="display:flex; flex-wrap:wrap; gap:6px;">' +
                    brands[br].map(function (b) {
                        var on = have.indexOf(b.id) > -1;
                        return '<div onclick="window.toggleMyBottle(\'' + b.id + '\')" ' +
                            'style="padding:9px 12px; border-radius:11px; cursor:pointer; ' +
                            'font-size:12.5px; font-weight:800; ' +
                            (on ? 'background:' + GREEN + '; color:#FFFFFF; border:1px solid ' + GREEN + ';'
                                : 'background: #F9FAFB; color:#4E5968; border:1px solid #E5E8EB;') + '">' +
                            (on ? "\u2713 " : "") + esc(b.name) + '</div>';
                    }).join("") + '</div></div>';
            }).join("") +
        '</div>' +

        '<div style="position:fixed; left:0; right:0; bottom:0; background: #FFFFFF; ' +
            'border-top:1px solid #E5E8EB; padding:14px 20px calc(14px + env(safe-area-inset-bottom,0px));">' +
            '<div style="max-width:480px; margin:0 auto;">' +
                '<div onclick="window.closeGearSheet()" style="text-align:center; padding:17px; ' +
                    'background:' + DARK + '; color:#FFFFFF; border-radius:14px; ' +
                    'font-size:15.5px; font-weight:900; cursor:pointer;">다 됐습니다</div>' +
            '</div>' +
        '</div>';
    }

    /* ---------- 등록 요약 + 조합 (무료) ---------- */

    function gearHTML() {
        var g = gear(), have = myBottles();
        var mt = g.sterilize ? method(g.sterilize) : null;

        if (!mt || !have.length) {
            return '<div class="matrix-panel" style="margin-bottom:20px;">' +
                '<div class="matrix-header">\uD83C\uDF7C 우리 집 수유 장비</div>' +
                '<div style="font-size:13px; font-weight:600; color:' + GRAY + '; ' +
                    'margin:-16px 0 16px; line-height:1.7; word-break:keep-all;">' +
                    '소독 방식과 쓰시는 젖병만 알려주시면, <b>안 맞는 조합</b>을 찾아드리고 ' +
                    '<b>갈 때</b>도 알려드립니다. 한 번만 하시면 돼요.</div>' +
                '<div onclick="window.openGearSheet()" style="text-align:center; padding:16px; ' +
                    'background:' + DARK + '; color:#FFFFFF; border-radius:14px; ' +
                    'font-size:14.5px; font-weight:900; cursor:pointer;">장비 알려주기</div>' +
            '</div>';
        }

        var list = matchList() || [];
        var bad  = list.filter(function (x) { return x.v === "no"; });
        var care = list.filter(function (x) { return x.v === "care"; });
        var unk  = list.filter(function (x) { return x.v === "unknown"; });

        var head = bad.length
            ? { bg: "#FFF2F2", bd: "#FCA5A5", c: RED,
                t: mt.label + "에 안 맞는 젖병이 " + bad.length + "개 있어요" }
            : care.length
                ? { bg: "#FFF9E6", bd: "#F5E1A4", c: "#8A6D00",
                    t: mt.label + "에 조심할 젖병이 " + care.length + "개 있어요" }
                : { bg: "#EAF7F1", bd: "#A7DFC8", c: "#1F6F52",
                    t: "지금 조합은 괜찮습니다" };

        return '<div class="matrix-panel" style="margin-bottom:20px;">' +
            '<div class="matrix-header">\uD83C\uDF7C 우리 집 수유 장비</div>' +
            '<div style="display:flex; justify-content:space-between; align-items:center; ' +
                'margin:-16px 0 16px; gap:10px;">' +
                '<div style="font-size:13px; font-weight:700; color:#4E5968; min-width:0; ' +
                    'word-break:keep-all;">' + esc(mt.label) + ' \u00b7 젖병 ' + have.length + '개</div>' +
                '<div onclick="window.openGearSheet()" style="flex-shrink:0; font-size:12.5px; ' +
                    'font-weight:800; color:' + BLUE + '; cursor:pointer;">고치기</div>' +
            '</div>' +

            '<div style="background:' + head.bg + '; border:1px solid ' + head.bd + '; ' +
                'border-radius:14px; padding:15px 16px; margin-bottom:12px; ' +
                'font-size:13.5px; font-weight:900; color:' + head.c + ';">' + esc(head.t) + '</div>' +

            list.map(function (x) {
                var v = V[x.v];
                return '<div style="display:flex; gap:9px; padding:11px 0; ' +
                    'border-bottom:1px solid #F2F4F6;">' +
                    '<div style="flex-shrink:0; font-size:12px; line-height:1.6;">' + v.icon + '</div>' +
                    '<div style="flex:1; min-width:0;">' +
                        '<div style="font-size:13px; font-weight:800; color:' + DARK + '; ' +
                            'word-break:keep-all;">' + esc(x.b.brand) + ' ' + esc(x.b.name) + '</div>' +
                        '<div style="margin-top:3px; font-size:12px; font-weight:700; color:' + v.c + '; ' +
                            'line-height:1.6; word-break:keep-all;">' + v.t + '</div>' +
                    '</div>' +
                '</div>';
            }).join("") +

            '<div style="margin-top:13px; font-size:11.5px; font-weight:600; color:' + GRAY + '; ' +
                'line-height:1.7; word-break:keep-all;">' +
                '제조사가 밝힌 내용을 ' + esc(SPEC_ASOF) + '으로 정리한 것입니다. ' +
                '제품이 바뀌었을 수 있으니 <b>사기 전에 설명서를 한 번 더 보세요.</b>' +
                (unk.length ? ' 흰 점으로 표시된 ' + unk.length + '개는 이 방식이 적혀 있지 않은 것입니다.' : '') +
            '</div>' +
        '</div>';
    }

    /* ---------- 갈 때가 된 것 (PLUS) ---------- */

    function partsHTML() {
        var plus = isPlus();
        var rows = PARTS.map(function (p) {
            var d = partDate(p), n = daysSince(d);
            return { p: p, d: d, n: n, over: (n === null ? false : n >= p.days) };
        });
        var over = rows.filter(function (r) { return r.over; }).length;
        var none = rows.filter(function (r) { return r.n === null; }).length;

        var show = plus ? rows : rows.slice(0, 2);

        return '<div class="matrix-panel" style="margin-bottom:20px;">' +
            '<div class="matrix-header">\uD83D\uDD01 갈 때가 된 것</div>' +
            '<div style="font-size:13px; font-weight:600; color:' + GRAY + '; ' +
                'margin:-16px 0 16px; line-height:1.7; word-break:keep-all;">' +
                (over ? '<b>' + over + '개</b>는 한 번 볼 때가 됐어요. '
                      : '갈아 끼운 날만 눌러두시면 다음에 볼 때를 세어드려요. ') +
                '날짜가 됐다고 꼭 버리라는 건 아니고, <b>눈으로 한 번 보시라는 뜻</b>입니다.<br>' +
                '<span style="font-size:11.5px;">예전에 갈았으면 옆 <b>달력</b>에서 그 날짜를 고르세요.</span></div>' +

            show.map(function (r) {
                var c = r.over ? RED : (r.n === null ? GRAY : "#4E5968");
                return '<div style="padding:13px 0; border-bottom:1px solid #F2F4F6;">' +
                    '<div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">' +
                        '<div style="min-width:0;">' +
                            '<div style="font-size:13.5px; font-weight:900; color:' + DARK + ';">' +
                                esc(r.p.label) +
                                '<span style="font-weight:700; color:' + GRAY + '; font-size:11.5px;"> \u00b7 ' +
                                r.p.days + '일쯤</span></div>' +
                            '<div style="margin-top:3px; font-size:12px; font-weight:700; color:' + c + ';">' +
                                (r.n === null ? "아직 안 적으셨어요"
                                              : r.n + "일 지났어요" + (r.over ? " \u2014 볼 때가 됐어요" : "")) +
                            '</div>' +
                        '</div>' +
                        '<div style="flex-shrink:0; display:flex; gap:6px; align-items:center;">' +
                            '<div onclick="window.logBottlePart(\'' + r.p.id + '\')" ' +
                                'style="padding:10px 13px; border-radius:11px; cursor:pointer; ' +
                                'font-size:12px; font-weight:800; background: #FFFFFF; color:#4E5968; ' +
                                'border:1px solid #D1D5DB; white-space:nowrap;">오늘 갈았어요</div>' +
                            '<input type="date" value="' + esc(r.d || "") + '" max="' + today() + '" ' +
                                'onchange="window.logBottlePart(\'' + r.p.id + '\', this.value)" ' +
                                'title="예전에 갈았으면 그 날짜를 고르세요" ' +
                                'style="width:34px; padding:10px 4px; border-radius:11px; ' +
                                'border:1px solid #D1D5DB; background: #FFFFFF; color:#8B95A1; ' +
                                'font-size:11px; cursor:pointer;">' +
                        '</div>' +
                    '</div>' +
                    '<div style="margin-top:5px; font-size:11.5px; font-weight:600; color:' + GRAY + '; ' +
                        'line-height:1.6; word-break:keep-all;">' + esc(r.p.why) + '</div>' +
                '</div>';
            }).join("") +

            (plus
                ? '<div style="margin-top:13px; font-size:11.5px; font-weight:600; color:' + GRAY + '; ' +
                  'line-height:1.7; word-break:keep-all;">' +
                  '눌러두시면 배냇함 <b>언제깠지</b>에도 같이 적힙니다. ' +
                  '젖병 본체는 날짜로 세지 않아요 \u2014 <b>뿌옇게 되거나 흠집이 나면</b> 그때 바꾸세요.</div>'

                : '<div style="margin-top:14px; background:#FFF9E6; border:1px solid #F5E1A4; ' +
                  'border-radius:14px; padding:16px;">' +
                  '<div style="font-size:13.5px; font-weight:900; color:#8A6D00;">' +
                      '나머지 ' + (PARTS.length - show.length) + '개는 PLUS에서 세어드려요</div>' +
                  '<div style="margin-top:5px; font-size:12.5px; font-weight:600; color:#8A6D00; ' +
                      'line-height:1.75; word-break:keep-all;">' +
                      '젖병솔 \u00b7 빨대 \u00b7 패킹까지요. ' +
                      '새는 건 컵이 아니라 대개 패킹인데, 그것만 따로 팝니다.</div></div>') +
        '</div>';
    }

    /* ---------- 다음에 준비할 것 (PLUS) ---------- */

    function roadHTML() {
        var m = monthsOld();
        if (m === null) return "";
        var plus = isPlus();

        return '<div class="matrix-panel" style="margin-bottom:20px;">' +
            '<div class="matrix-header">\uD83D\uDCC5 다음에 준비할 것</div>' +
            '<div style="font-size:13px; font-weight:600; color:' + GRAY + '; ' +
                'margin:-16px 0 16px; line-height:1.7; word-break:keep-all;">' +
                '정해진 날짜가 아니라 <b>이 무렵에 많이들 시작한다</b>는 뜻이에요. ' +
                esc(nm("의")) + ' 속도에 맞추시면 됩니다.</div>' +

            (plus
                ? ROAD.map(function (r, i) {
                    var now = (m >= r.at) && (i === ROAD.length - 1 || m < ROAD[i + 1].at);
                    var past = m >= r.at && !now;
                    var left = r.at - m;
                    return '<div style="display:flex; gap:11px; padding:12px 0; ' +
                        'border-bottom:1px solid #F2F4F6; opacity:' + (past ? "0.45" : "1") + ';">' +
                        '<div style="flex-shrink:0; width:52px; font-size:11.5px; font-weight:900; ' +
                            'color:' + (now ? BLUE : GRAY) + ';">' +
                            (r.at === 0 ? "지금" : r.at + "개월") + '</div>' +
                        '<div style="flex:1; min-width:0;">' +
                            '<div style="font-size:13.5px; font-weight:900; color:' + DARK + ';">' +
                                esc(r.label) +
                                (now && r.at > 0 ? ' <span style="font-size:11px; color:' + BLUE + ';">지금</span>' : '') +
                                (left > 0 ? ' <span style="font-size:11px; font-weight:700; color:' + GRAY +
                                            ';">약 ' + left + '개월 뒤</span>' : '') + '</div>' +
                            '<div style="margin-top:3px; font-size:12px; font-weight:600; color:' + GRAY + '; ' +
                                'line-height:1.6; word-break:keep-all;">' + esc(r.note) + '</div>' +
                        '</div>' +
                    '</div>';
                  }).join("") + milkHTML()

                : '<div style="background:#FFF9E6; border:1px solid #F5E1A4; border-radius:14px; ' +
                  'padding:16px;">' +
                  '<div style="font-size:13.5px; font-weight:900; color:#8A6D00;">' +
                      '언제 뭘 준비하면 되는지 PLUS에서 짚어드려요</div>' +
                  '<div style="margin-top:5px; font-size:12.5px; font-weight:600; color:#8A6D00; ' +
                      'line-height:1.75; word-break:keep-all;">' +
                      '컵으로 넘어가는 때, 젖병 졸업, 생우유 시작 시기까지 ' +
                      esc(nm("의")) + ' 개월수에 맞춰 알려드립니다.</div></div>') +
        '</div>';
    }

    /* ---------- 자리 잡기 ---------- */

    function paint() {
        var host = document.getElementById(HOST);
        if (!host) return;
        host.innerHTML = gearHTML() + partsHTML() + roadHTML();
    }
    window.refreshBottleGear = paint;

    function mount() {
        if (document.getElementById(HOST)) return;
        var anchor = document.getElementById("bottle-guide") || document.querySelector(".matrix-panel");
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

    window.bottleGearDebug = function () {
        var g = gear(), mt = g.sterilize ? method(g.sterilize) : null;
        console.log("PLUS:", isPlus(), "· 개월수:", monthsOld());
        console.log("소독:", mt ? mt.label : "안 고름", "· 등록 젖병:", myBottles().length + "개");
        console.log("소독 정보 조사 시점:", SPEC_ASOF);
        if (mt) {
            console.log("--- 조합 판정 ---");
            (matchList() || []).forEach(function (x) {
                console.log("   " + V[x.v].icon + " " + x.b.brand + " " + x.b.name +
                            "   [" + x.b.sterilization + "]");
            });
            var all = bottles().map(function (b) { return verdict(b.sterilization, g.sterilize); });
            var c = {}; all.forEach(function (v) { c[v] = (c[v] || 0) + 1; });
            console.log("40종 전체로 보면:", c);
        }
        console.log("--- 소모품 ---");
        PARTS.forEach(function (p) {
            var d = partDate(p), n = daysSince(d);
            console.log("   " + p.label + " " + p.days + "일 · " +
                        (n === null ? "기록 없음" : n + "일 지남" + (n >= p.days ? " ⚠️" : "")));
        });
        console.log("붙었나:", !!document.getElementById(HOST));
    };
})();