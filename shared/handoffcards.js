/* ============================================================
   배냇함 — 다 쓴 물건 보내기 카드 (shared/handoffcards.js)

   큐레이터마다 '쓰면서 챙길 것' 맨 아래에 한 장씩 붙인다. 누르면 shared/handoff.js 의 창이 뜬다.

       카시트   '우리 카시트' 에 적어 둔 것    → 사고 이력 · 유효기간 · 키 기준 · 장착 방식
       유모차   '우리 유모차' 에 적어 둔 것    → 접은 크기 · 무게 (두 대면 고른다)
       장난감   '우리 집 장난감' 중 시기가 석 달 넘게 지난 것 (toylife.js 와 같은 기준)
       젖병     돌이 지나면 · '우리 집 수유 장비' 에 적어 둔 젖병 · 소독기

   ⚠️ 카드는 무료다. 다 쓴 물건을 정리하게 돕는 건 파는 앱이 안 하는 일이고, 믿음이 쌓이는 일이다.
   ⚠️ 접힘 상자(알아두면 좋은 것)에 들어가지 않게 제목에 '중고' 를 쓰지 않는다 (유모차 탭이 '중고' 를 접는다).
   ⚠️ 정리했어요 → 그 큐레이터의 '우리 ○○' 에서 뺀다. 홈 '오늘 챙길 것' · 바꿀 때 알림도 거기서 날짜를 읽으니 같이 멈춘다.

   각 큐레이터 index.html 에서 shared/handoff.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';
    if (window.__handoffCards) return;
    window.__handoffCards = true;

    var BASE = "https://happy-baby0303.github.io/";
    var DARK = "#4A413C", GRAY = "#7A6F68", SUB = "#A3958A", RED = "#C62828";

    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }
    function getJSON(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
    function setJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
    function data(name) {
        try {
            /* data.js 는 const 로 만든다 — window 에 안 붙는다 */
            if (name === "carseat" && typeof carseatData !== "undefined") return carseatData;
            if (name === "stroller" && typeof strollerData !== "undefined") return strollerData;
            if (name === "toy" && typeof toyData !== "undefined") return toyData;
            if (name === "bottle" && typeof bottleData !== "undefined") return bottleData;
        } catch (e) {}
        return window[name + "Data"] || [];
    }
    function ym(k) {
        var m = /^(\d{4})-(\d{1,2})/.exec(String(k || ""));
        return m ? m[1] + "년 " + Number(m[2]) + "월" : "";
    }
    /* 발달 나이 (이른둥이는 교정 — shared/babyage.js). 젖병 · 장난감은 이걸로 센다 */
    function monthsDev() {
        var s = "";
        try { s = window.BabyAge ? window.BabyAge.key() : localStorage.getItem("tosil_startDate"); } catch (e) {}
        var p = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(s || ""));
        if (!p) return null;
        var b = new Date(+p[1], +p[2] - 1, +p[3]), t = new Date();
        if (b > t) return null;
        var m = (t.getFullYear() - b.getFullYear()) * 12 + (t.getMonth() - b.getMonth());
        if (t.getDate() < b.getDate()) m--;
        return m < 0 ? 0 : m;
    }

    /* data-tail — 탭 정리(○○tabs.js)가 이 카드를 늘 맨 아래에 둔다. 물건의 마지막이라서 */
    function card(id, title, text, btns) {
        return '<div class="matrix-panel" id="' + id + '" data-tail="1" style="margin-bottom:20px;">' +
            '<div class="matrix-header">' + esc(title) + '</div>' +
            '<div style="font-size:13px; font-weight:600; color:' + GRAY + '; margin:-16px 0 14px; line-height:1.75; word-break:keep-all;">' + text + '</div>' +
            '<div style="display:flex; gap:8px;">' + btns + '</div>' +
        '</div>';
    }
    function btn(label, js, main) {
        return '<div role="button" onclick="' + js + '" style="flex:1; text-align:center; padding:13px 8px; border-radius:13px; cursor:pointer; ' +
            'font-size:13.5px; font-weight:900; ' +
            (main ? 'background:' + DARK + '; color:#FFFFFF;' : 'background:#FFFFFF; color:' + DARK + '; border:1.5px solid #DCD3C8;') + '">' + esc(label) + '</div>';
    }
    function two(fn) {
        return btn("당근 글 만들기", "window." + fn + "('sell')", true) + btn("물려줄 말 만들기", "window." + fn + "('give')", false);
    }

    /* 그 탭에 붙이거나 갈아끼운다 (자리는 그대로) */
    function put(paneId, id, html) {
        var pane = document.getElementById(paneId);
        var old = document.getElementById(id);
        if (!html) { if (old) old.remove(); return; }
        var box = document.createElement("div");
        box.innerHTML = html;
        var el = box.firstChild;
        if (old && old.parentNode) old.parentNode.replaceChild(el, old);
        else if (pane) pane.appendChild(el);
    }

    /* ==========================================================
       카시트
       ---------------------------------------------------------- */
    var SEAT = "tosil_carseat_own";
    var INSTALL = { isofix_leg: "ISOFIX", isofix_tether: "ISOFIX", belt: "안전벨트" };

    function seatOf(o) {
        var a = data("carseat");
        for (var i = 0; i < a.length; i++) if (a[i].id === o.id) return a[i];
        return null;
    }
    function seatName(o) {
        var s = seatOf(o);
        return s ? s.brand + " " + s.name : String(o.name || "").trim();
    }
    function seatSpec(s) {
        if (!s || !s.bodySpec) return "";
        return String(s.bodySpec).replace(/[\uD83C-\uDBFF][\uDC00-\uDFFF]|[☀-➿]️?/g, "")
            .replace(/체중\s*:?/g, "").replace(/\s*\/\s*/g, " · ").replace(/\s+/g, " ").trim();
    }
    function seatHTML() {
        var o = getJSON(SEAT, {}) || {};
        var name = seatName(o);
        if (!name) return "";
        if (o.expireAt && window.handoffExpired && window.handoffExpired(o.expireAt)) {
            return card("carseat-handoff", "🥕 다 쓰면 팔거나 물려주기",
                '<b class="ho-red" style="color:' + RED + ';">유효기간이 지난 카시트예요 (' + esc(ym(o.expireAt)) + '까지).</b> ' +
                '팔거나 물려주지 말고 버려 주세요. 버리는 법을 알려 드려요.',
                btn("버리는 법", "window.openSeatHandoff('sell')", true));
        }
        return card("carseat-handoff", "🥕 다 쓰면 팔거나 물려주기",
            '작아지면 당근에 올릴 글이나 물려줄 말을 바로 만들어 드려요. ' +
            '<b>사고 이력 · 유효기간</b>까지 넣어서요.', two("openSeatHandoff"));
    }
    window.openSeatHandoff = function (mode) {
        var o = getJSON(SEAT, {}) || {}, s = seatOf(o), name = seatName(o);
        if (!name || !window.Handoff) return;
        var inst = s && s.install ? s.install.map(function (x) { return INSTALL[x]; }).filter(function (v, i, a) { return v && a.indexOf(v) === i; }) : [];
        var newborn = !s || (s.age || []).indexOf("newborn") > -1;
        window.Handoff.open({
            kind: "carseat", name: name,
            since: "", expire: o.expireAt || "",
            onExpire: function (v) { var x = getJSON(SEAT, {}) || {}; x.expireAt = v; setJSON(SEAT, x); refreshSeat(); },
            gate: true,
            facts: [seatSpec(s) ? "기준 " + seatSpec(s) : "",
                    inst.length ? inst.join(" · ") + " 장착" + (s && s.rotation === "yes" ? " · 회전형" : "") : ""],
            withs: [{ id: "manual", label: "설명서" }].concat(newborn ? [{ id: "inner", label: "신생아 이너시트" }] : [])
                   .concat([{ id: "cup", label: "컵홀더" }, { id: "box", label: "박스" }]),
            cares: [{ id: "wash", label: "커버 빨아 뒀어요", sell: "커버 빨아 뒀어요", give: "커버는 빨아 뒀어" }],
            link: BASE + "carseat/index.html" + (s ? "?pick=" + encodeURIComponent(s.id) : ""),
            doneLabel: "우리 카시트에서 빼기",
            doneAsk: "우리 카시트에서 뺄까요? 어깨끈 · 유효기간 알림도 같이 멈춰요.",
            doneToast: "우리 카시트에서 뺐어요",
            onDone: function () { setJSON(SEAT, {}); refreshSeat(); }
        }, mode);
    };
    function refreshSeat() {
        try { if (typeof window.refreshCarseatOwn === "function") window.refreshCarseatOwn(); } catch (e) {}
        try { if (typeof window.refreshCarseatCards === "function") window.refreshCarseatCards(); } catch (e) {}
        put("view-carseat-use", "carseat-handoff", seatHTML());
    }

    /* ==========================================================
       유모차 — 두 대(디럭스 + 휴대용)를 쓰는 집이 많다
       ---------------------------------------------------------- */
    var STR = "tosil_stroller_own";
    var strollerPick = 0;

    function strollerByName(n) {
        var a = data("stroller");
        for (var i = 0; i < a.length; i++) if (a[i].name === n) return a[i];
        return null;
    }
    function strollerNames() {
        var o = getJSON(STR, {}) || {};
        return [o.name, o.name2].filter(function (x) { return !!String(x || "").trim(); });
    }
    function strollerHTML() {
        var names = strollerNames(), m = monthsDev();
        if (!names.length && !(m !== null && m >= 12)) return "";
        if (strollerPick >= names.length) strollerPick = 0;
        var pick = names.length > 1
            ? '<div style="display:flex; flex-wrap:wrap; gap:7px; margin:-4px 0 12px;">' + names.map(function (n, i) {
                  var on = i === strollerPick;
                  return '<div role="button" aria-pressed="' + on + '" onclick="window.pickStrollerHandoff(' + i + ')" style="padding:9px 12px; border-radius:11px; cursor:pointer; font-size:12.5px; font-weight:800; ' +
                      (on ? 'background:#1F9D6B; color:#FFFFFF; border:1px solid #1F9D6B;' : 'background:#FBF8F3; color:' + GRAY + '; border:1px solid #EDE6DE;') + '">' +
                      (on ? "✓ " : "") + esc(n) + '</div>';
              }).join("") + '</div>'
            : "";
        var html = card("stroller-handoff", "🥕 다 타면 팔거나 물려주기",
            '작아지면 당근에 올릴 글이나 물려줄 말을 바로 만들어 드려요. ' +
            (names.length ? '<b>접은 크기 · 무게</b>까지 넣어서요.' : '<b>우리 유모차</b>에 쓰는 걸 알려 주시면 접은 크기 · 무게까지 넣어 드려요.'),
            two("openStrollerHandoff"));
        return pick ? html.replace('<div style="display:flex; gap:8px;">', pick + '<div style="display:flex; gap:8px;">') : html;
    }
    window.pickStrollerHandoff = function (i) { strollerPick = i; put("view-stroller-use", "stroller-handoff", strollerHTML()); };
    window.openStrollerHandoff = function (mode) {
        if (!window.Handoff) return;
        var names = strollerNames(), name = names[strollerPick] || names[0] || "", s = strollerByName(name);
        var facts = [];
        if (s) {
            var w = s.specs && Number(s.specs.weight);
            var d = Array.isArray(s.foldedDims) ? s.foldedDims.join("×") + "cm" : "";
            if (d || w) facts.push((d ? "접으면 " + d : "") + (d && w ? " · " : "") + (w ? w + "kg" : ""));
            if (s.specs && /⭕|O\b/.test(String(s.specs.cabin || ""))) facts.push("기내 반입 돼요");
        }
        window.Handoff.open({
            kind: "stroller", name: name,
            since: "",
            facts: facts,
            withs: [{ id: "rain", label: "레인커버" }, { id: "cup", label: "컵홀더" }, { id: "net", label: "모기장" },
                    { id: "wind", label: "방풍커버" }, { id: "manual", label: "설명서" }],
            cares: [{ id: "wash", label: "시트 빨아 뒀어요", sell: "시트 빨아 뒀어요", give: "시트는 빨아 뒀어" },
                    { id: "warranty", label: "보증 기간 남았어요", sell: "보증 기간이 남았어요", give: "보증 기간도 아직 남았어" }],
            link: BASE + "stroller/index.html" + (s ? "?pick=" + encodeURIComponent(s.name) : ""),
            doneLabel: name ? "우리 유모차에서 빼기" : "",
            doneAsk: "우리 유모차에서 " + (name ? "'" + name + "' 를 " : "") + "뺄까요?",
            doneToast: "우리 유모차에서 뺐어요",
            onDone: name ? function () {
                var o = getJSON(STR, {}) || {};
                if (o.name === name) o.name = ""; else if (o.name2 === name) o.name2 = "";
                if (!o.name && !o.name2) o.care = {};            // 시트 빨래 알림도 멈춘다
                setJSON(STR, o);
                strollerPick = 0;
                try { if (typeof window.refreshStrollerOwn === "function") window.refreshStrollerOwn(); } catch (e) {}
                put("view-stroller-use", "stroller-handoff", strollerHTML());
            } : null
        }, mode);
    };

    /* ==========================================================
       장난감 — 시기가 석 달 넘게 지난 것 (toylife.js lifeLine 과 같은 기준)
       ---------------------------------------------------------- */
    var RANGE = { newborn: [0, 1], tummy: [2, 3], flip: [4, 6], crawl: [7, 9], stand: [10, null], all: [0, null] };
    var AGE = { newborn: "신생아 때", tummy: "2~3개월", flip: "4~6개월", crawl: "7~9개월", stand: "10개월부터" };

    function isPlayToy(t) {
        try { if (typeof window.toyPlayTime === "function") return !!window.toyPlayTime(t); } catch (e) {}
        return /^\d+분$/.test(String(t.freeTime || "").trim());
    }
    function doneToys() {
        var m = monthsDev();
        if (m === null) return [];
        var have = getJSON("tosil_my_toys", []) || [];
        return data("toy").filter(function (t) {
            if (have.indexOf(t.id) < 0 || !isPlayToy(t)) return false;
            var r = RANGE[t.milestone];
            return !!r && r[1] !== null && m - r[1] >= 3;
        });
    }
    function toyHTML() {
        var list = doneToys();
        if (!list.length) return "";
        var names = list.slice(0, 3).map(function (t) { return t.name; }).join(" · ") + (list.length > 3 ? " 외 " + (list.length - 3) + "개" : "");
        return '<div id="toy-handoff" class="bnh-card">' +
            '<div style="font-size:18px; font-weight:900; color:' + DARK + '; letter-spacing:-0.4px; margin-bottom:6px;">' +
                '🥕 시기가 지난 장난감 ' + list.length + '개</div>' +
            '<div style="font-size:12.5px; font-weight:600; color:' + SUB + '; line-height:1.7; margin-bottom:12px; word-break:keep-all;">' +
                esc(names) + '<br>제일 많이 갖고 놀던 때가 석 달 넘게 지났어요. 정리하거나 물려주기 좋을 때예요.</div>' +
            '<div style="display:flex; gap:8px;">' + two("openToyHandoff") + '</div>' +
        '</div>';
    }
    window.openToyHandoff = function (mode) {
        if (!window.Handoff) return;
        var list = doneToys();
        if (!list.length) return;
        window.Handoff.open({
            kind: "toy",
            items: list.map(function (t) {
                return { id: String(t.id), name: t.name, sub: AGE[t.milestone] || "",
                         battery: !/필요\s*없/.test(String(t.battery || "필요 없음")) };
            }),
            cares: [{ id: "clean", label: "다 닦아 뒀어요", sell: "다 닦아 뒀어요", give: "다 닦아 뒀어" },
                    { id: "batt", label: "건전지 빼 뒀어요", sell: "건전지는 빼 뒀어요", give: "건전지는 빼 뒀어",
                      need: function () { return list.some(function (t) { return !/필요\s*없/.test(String(t.battery || "필요 없음")); }); } }],
            link: BASE + "toy/index.html",
            doneLabel: "우리 집 장난감에서 빼기",
            doneAsk: "고른 장난감을 우리 집 장난감에서 뺄까요? 이번 주 놀이를 짤 때 더는 안 써요.",
            doneToast: "우리 집 장난감에서 뺐어요",
            onDone: function (t) {
                t = t || [];
                var have = (getJSON("tosil_my_toys", []) || []).filter(function (id) { return t.indexOf(String(id)) < 0; });
                setJSON("tosil_my_toys", have);
                try { if (typeof window.closeShelfSheet === "function") window.closeShelfSheet(); } catch (e) {}   // 우리 집 장난감 카드 · 놀이 · 카드 표시 다시 그리기
                putToy();
            }
        }, mode);
    };
    function putToy() {
        var html = toyHTML(), old = document.getElementById("toy-handoff");
        if (!html) { if (old) old.remove(); return; }
        var box = document.createElement("div");
        box.innerHTML = html;
        var el = box.firstChild;
        if (old && old.parentNode) { old.parentNode.replaceChild(el, old); return; }
        var shelf = document.getElementById("my-shelf");
        if (shelf && shelf.parentNode) shelf.parentNode.insertBefore(el, shelf.nextSibling);
    }

    /* ==========================================================
       젖병 — 돌이 지나면. 젖꼭지 · 쪽쪽이는 보내지 않는다 (위생)
       ---------------------------------------------------------- */
    var STER = { uv: "UV 소독기", steam: "스팀 소독기" };
    function bottleItems() {
        var g = getJSON("tosil_bottle_gear", {}) || {}, a = data("bottle"), out = [];
        (Array.isArray(g.bottles) ? g.bottles : []).forEach(function (id) {
            for (var i = 0; i < a.length; i++) if (a[i].id === id) { out.push({ id: id, name: a[i].brand + " " + a[i].name }); break; }
        });
        if (STER[g.sterilize]) out.push({ id: "ster", name: STER[g.sterilize] });
        if (!out.length) out.push({ id: "bottle", name: "젖병" });
        return out;
    }
    function bottleHTML() {
        var m = monthsDev();
        if (m === null || m < 12) return "";
        return card("bottle-handoff", "🥕 다 쓴 젖병 팔거나 물려주기",
            '젖병을 떼면 당근에 올릴 글이나 물려줄 말을 만들어 드려요. ' +
            '<b>젖꼭지 · 쪽쪽이는 보내지 말고</b> 버려요. 입에 닿는 거라 새로 쓰는 게 맞아요.',
            two("openBottleHandoff"));
    }
    window.openBottleHandoff = function (mode) {
        if (!window.Handoff) return;
        var items = bottleItems(), first = items[0];
        window.Handoff.open({
            kind: "bottle", items: items,
            cares: [{ id: "clean", label: "소독해 뒀어요", sell: "소독해 뒀어요", give: "소독해 뒀어" }],
            link: BASE + "bottle/index.html" + (first && /^b\d+$/.test(first.id) ? "?pick=" + first.id : ""),
            doneLabel: "우리 집 수유 장비에서 빼기",
            doneAsk: "고른 것을 우리 집 수유 장비에서 뺄까요?",
            doneToast: "우리 집 수유 장비에서 뺐어요",
            /* 적어 둔 장비가 없으면(그냥 '젖병') 뺄 것도 없다 */
            onDone: !items.some(function (x) { return x.id !== "bottle"; }) ? null : function (t) {
                t = t || [];
                var g = getJSON("tosil_bottle_gear", {}) || {};
                g.bottles = (Array.isArray(g.bottles) ? g.bottles : []).filter(function (id) { return t.indexOf(String(id)) < 0; });
                if (t.indexOf("ster") > -1) g.sterilize = "";
                setJSON("tosil_bottle_gear", g);
                try { if (typeof window.refreshBottleGear === "function") window.refreshBottleGear(); } catch (e) {}
            }
        }, mode);
    };

    /* ==========================================================
       붙이기 — 모듈들이 자기 카드를 다 붙인 뒤에 (탭 정리 · 접기가 6초 안에 자리를 잡는다)
       ---------------------------------------------------------- */
    function mountAll() {
        if (document.getElementById("view-carseat-use") && !document.getElementById("carseat-handoff")) put("view-carseat-use", "carseat-handoff", seatHTML());
        if (document.getElementById("view-stroller-use") && !document.getElementById("stroller-handoff")) put("view-stroller-use", "stroller-handoff", strollerHTML());
        if (document.getElementById("view-bottle-tools") && !document.getElementById("bottle-handoff")) put("view-bottle-tools", "bottle-handoff", bottleHTML());
        if (document.getElementById("my-shelf") && !document.getElementById("toy-handoff")) putToy();
        /* 카시트 · 유모차 · 젖병 — 다른 카드가 나중에 붙어도 늘 그 탭 맨 아래 */
        [["view-carseat-use", "carseat-handoff"], ["view-stroller-use", "stroller-handoff"], ["view-bottle-tools", "bottle-handoff"]].forEach(function (x) {
            var pane = document.getElementById(x[0]), el = document.getElementById(x[1]);
            if (pane && el && el.parentNode === pane && pane.lastElementChild !== el) pane.appendChild(el);
        });
        /* 놀이 기록 카드(playlog.js)가 나중에 '이번 주 놀이' 밑으로 끼어들면 우리 집 장난감과 떨어진다. 바로 밑으로 다시 */
        var th = document.getElementById("toy-handoff"), sh = document.getElementById("my-shelf");
        if (th && sh && sh.parentNode && th.previousElementSibling !== sh) sh.parentNode.insertBefore(th, sh.nextSibling);
    }
    window.refreshHandoffCards = function () {
        if (document.getElementById("view-carseat-use")) put("view-carseat-use", "carseat-handoff", seatHTML());
        if (document.getElementById("view-stroller-use")) put("view-stroller-use", "stroller-handoff", strollerHTML());
        if (document.getElementById("view-bottle-tools")) put("view-bottle-tools", "bottle-handoff", bottleHTML());
        if (document.getElementById("my-shelf")) putToy();
    };

    /* 우리 카시트 · 우리 유모차 · 우리 집 장난감을 고치면 카드도 바로 */
    function hook(n, fn) {
        var f = window[n];
        if (typeof f !== "function" || f.__ho) return;
        var w = function () { var r = f.apply(this, arguments); setTimeout(fn, 60); return r; };
        w.__ho = true;
        window[n] = w;
    }
    function hooks() {
        hook("refreshCarseatOwn", function () { put("view-carseat-use", "carseat-handoff", seatHTML()); });
        hook("registerMySeat", function () { put("view-carseat-use", "carseat-handoff", seatHTML()); });     // 고르기 카드의 '이 카시트 쓰고 있어요'
        hook("closeSeatSheet", function () { put("view-carseat-use", "carseat-handoff", seatHTML()); });     // 우리 카시트 고르는 창 (안에서 paint() 를 바로 부른다)
        hook("refreshStrollerOwn", function () { put("view-stroller-use", "stroller-handoff", strollerHTML()); });
        hook("closeStrollerSheet", function () { put("view-stroller-use", "stroller-handoff", strollerHTML()); });
        hook("closeShelfSheet", putToy);
    }

    function boot() {
        var n = 0;
        var t = setInterval(function () {
            hooks(); mountAll();
            if (++n > 20) clearInterval(t);                   // 0.4초마다 8초 동안 — 앵커가 늦게 생겨도 붙고, 자리도 지킨다
        }, 400);
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    window.handoffCardsDebug = function () {
        console.log("카시트:", seatName(getJSON(SEAT, {}) || {}) || "없음");
        console.log("유모차:", strollerNames().join(", ") || "없음");
        console.log("시기 지난 장난감:", doneToys().map(function (t) { return t.name; }).join(", ") || "없음");
        console.log("젖병 카드:", bottleHTML() ? "보임" : "안 보임 (돌 전)");
    };
})();
