/* ============================================================
   배냇함 — 다 쓴 물건 보내기 (shared/handoff.js)

   왜 필요한가
     큐레이터는 '고를 때' 와 '쓸 때' 까지만 있었다. 물건의 마지막 — 작아져서 보낼 때 — 가 없었다.
     그때 부모가 하는 일은 늘 같다. 당근에 올릴 글을 쓰거나, 동생 · 친구에게 물려줄 말을 쓴다.
     그 글에 들어갈 말은 이미 배냇함에 있다 — 언제 샀는지, 유효기간, 접은 크기, 몇 개월 장난감인지.

   하는 일
     Handoff.open({ kind, name, … })  → 아래에서 올라오는 창
       [당근에 팔기 | 물려주기] · 챙겨 둔 것(칩) · 제목 · 글(고칠 수 있다) · 복사 / 보내기
     복사 · 보내기를 한 뒤 '정리했어요' 를 누르면 onDone() — 큐레이터가 '우리 ○○' 에서 뺀다.
     (바꿀 때 알림도 거기 적힌 날짜로 만들어서, 빼면 그 알림도 멈춘다)

   ⚠️ 값(시세)은 적지 않는다 — 유모차 중고 카드와 같은 원칙. 숫자를 말하면 기준처럼 읽힌다.
   ⚠️ 카시트는 '사고 난 적 없어요' 를 고르기 전엔 글을 만들지 않는다.
      사고가 났거나 유효기간이 지났으면 팔거나 물려주지 말라고 하고, 버리는 법만 알려 준다.
   ⚠️ 당근 글에는 아기 이름을 넣지 않는다 (동네 사람 누구나 본다). '아이가 커서' 로 쓴다.
   ⚠️ 부모 말투로. '판매합니다 ✨ 상태 최상 ✨' 같은 말은 쓰지 않는다.

   쓰는 법
     Handoff.open({
       kind: 'carseat' | 'stroller' | 'toy' | 'bottle',
       name: '조이 아이스핀 360',            // 한 개일 때 이름
       items: [{ id, name, sub, battery }],  // 장난감 · 젖병처럼 여러 개일 때 (고를 수 있다)
       since: 'YYYY-MM',                     // 산 달 (기본값 · 고칠 수 있다). undefined 면 칸을 안 띄운다
       expire: 'YYYY-MM', onExpire: fn,      // 카시트 유효기간 (비어 있으면 적는 칸)
       gate: true,                           // 카시트 — 사고 이력부터 묻는다
       block: { title, text },               // 처음부터 막을 때 (유효기간 지남)
       facts: ['기준 40~105cm · 최대 19kg'], // 당근 글에 그대로 들어가는 줄
       withs: [{ id, label }],               // 같이 드리는 것 (칩)
       cares: [{ id, label, sell, give, on }], // 해 둔 것 (칩) — sell: 당근 글 줄 · give: 물려줄 말
       link: 'https://…',                    // 물려줄 말 끝의 배냇함 링크
       doneLabel: '우리 카시트에서 빼기', doneAsk: '…', onDone: fn
     })

   각 큐레이터 index.html 에서 curatorui.js · babyswitch.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';
    if (window.Handoff) return;

    var ID = "handoff-sheet";
    var PREF = "tosil_handoff_pref";       // { direct, ship, tone } — 다음에 열 때 그대로
    var DARK = "#4A413C", GRAY = "#7A6F68", SUB = "#A3958A", LINE = "#EDE6DE", BG = "#FBF8F3";
    var GREEN = "#1F9D6B", RED = "#C62828", PURPLE = "#7F77DD";

    var NOUN = { carseat: "카시트", stroller: "유모차", toy: "장난감", bottle: "젖병" };
    var USED = { carseat: "쓰던", stroller: "타던", toy: "갖고 놀던", bottle: "쓰던" };

    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }
    function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function getJSON(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
    function setJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
    function toast(m) { if (typeof window.showToast === "function") window.showToast(m); }

    /* 받침 — '설명서랑' · '이너시트랑' · '컵홀더와' · '차양과' */
    function batchim(w) {
        var s = String(w || ""), c = s.charCodeAt(s.length - 1);
        return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0;
    }
    function joinWith(list, polite) {
        if (!list.length) return "";
        if (list.length === 1) return list[0];
        var last = list[list.length - 1], rest = list.slice(0, -1), tail = rest[rest.length - 1];
        var conj = polite ? (batchim(tail) ? "과" : "와") : (batchim(tail) ? "이랑" : "랑");
        return (rest.length > 1 ? rest.slice(0, -1).join(", ") + ", " : "") + tail + conj + " " + last;
    }
    /* '○○ 카시트' — 이름에 이미 붙어 있으면 한 번만 */
    function withNoun(name, noun) {
        var n = String(name || "").trim();
        if (!n) return noun;
        return n.slice(-noun.length) === noun ? n : n + " " + noun;
    }
    function nmGa() {
        try { if (typeof window.babyNm === "function") { var n = window.babyNm("가"); if (n && n.indexOf("우리 아기") !== 0) return n; } } catch (e) {}
        return "우리 아이가";
    }

    function ym(k) {
        var m = /^(\d{4})-(\d{1,2})/.exec(String(k || ""));
        return m ? m[1] + "년 " + Number(m[2]) + "월" : "";
    }
    function nowYM() {
        var t = new Date();
        return t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0");
    }
    function monthsFrom(k) {
        var m = /^(\d{4})-(\d{1,2})/.exec(String(k || ""));
        if (!m) return null;
        var t = new Date();
        return (t.getFullYear() - Number(m[1])) * 12 + (t.getMonth() + 1 - Number(m[2]));
    }
    function span(n) {
        if (n == null || n < 1) return "";
        var y = Math.floor(n / 12), r = n % 12;
        return (y ? y + "년" : "") + (y && r ? " " : "") + (r ? r + "개월" : "");
    }
    window.handoffExpired = function (k) {       // 'YYYY-MM' 이 지난 달이면 true (그 달까지는 쓴다)
        var m = /^(\d{4})-(\d{1,2})/.exec(String(k || ""));
        if (!m) return false;
        return String(m[1]) + "-" + String(m[2]).padStart(2, "0") < nowYM();
    };

    /* ==========================================================
       상태
       ---------------------------------------------------------- */
    var spec = null, S = null;

    function fresh(o, mode) {
        var p = getJSON(PREF, {}) || {};
        var picks = {};
        (o.cares || []).forEach(function (c) { if (c.on) picks[c.id] = true; });
        var items = {};
        (o.items || []).forEach(function (x) { items[x.id] = true; });
        return {
            mode: mode === "give" ? "give" : "sell",
            gate: o.gate ? "" : "ok",                 // '' = 아직 안 고름 · ok = 사고 없음 · crash = 사고 남
            picks: picks, items: items,
            since: o.since || "",
            expire: o.expire || "",
            direct: p.direct !== false, ship: !!p.ship,
            tone: p.tone === "polite" ? "polite" : "casual",
            link: true,
            title: "", body: "", editedT: false, editedB: false,
            acted: false, confirm: false
        };
    }
    function savePref() { setJSON(PREF, { direct: S.direct, ship: S.ship, tone: S.tone }); }

    function chosenItems() {
        return (spec.items || []).filter(function (x) { return S.items[x.id]; });
    }
    function withLabels() {
        return (spec.withs || []).filter(function (w) { return S.picks[w.id]; }).map(function (w) { return w.label; });
    }
    function caresOn() {
        return (spec.cares || []).filter(function (c) { return S.picks[c.id] && (!c.need || c.need()); });
    }
    function itemName() {
        var it = chosenItems();
        if (spec.items) return it.map(function (x) { return x.name; });
        return [spec.name || ""];
    }

    /* ==========================================================
       글 만들기
       ---------------------------------------------------------- */
    function sellTitle() {
        var k = spec.kind, names = itemName();
        if (k === "carseat") return withNoun(spec.name, "카시트") + (S.gate === "ok" ? " · 사고 이력 없음" : "");
        if (k === "stroller") return withNoun(spec.name, "유모차");
        if (k === "toy") return names.length === 1 ? names[0] : "아기 장난감 " + names.length + "개" + (S.picks.single ? "" : " 묶음");
        if (k === "bottle") {
            var t = names.join(" · ");
            return t.length > 34 ? names[0] + " 외 " + (names.length - 1) + "개" : t;
        }
        return names.join(" · ");
    }

    function sellBody() {
        var k = spec.kind, out = ["아이가 커서 정리해요.", ""];
        var n = monthsFrom(S.since), sp = span(n);
        if (S.since && n != null && n >= 0)
            out.push("· " + ym(S.since) + "에 사서 " + (sp ? sp + " 썼어요" : "얼마 안 썼어요"));
        if (k === "carseat" && S.gate === "ok") out.push("· 사고 난 적 없어요");
        if (k === "carseat" && S.expire) out.push("· 유효기간은 " + ym(S.expire) + "까지예요");
        (spec.facts || []).forEach(function (f) { if (f) out.push("· " + f); });
        if (spec.items) {
            chosenItems().forEach(function (x) { out.push("· " + x.name + (x.sub ? " (" + x.sub + ")" : "")); });
        }
        var w = withLabels();
        if (w.length) out.push("· 같이 드려요: " + w.join(", "));
        caresOn().forEach(function (c) { if (c.sell) out.push("· " + c.sell); });
        if (k === "bottle") out.push("· 젖꼭지는 빼고 드려요. 새로 끼워 쓰세요");
        if (k === "toy" && chosenItems().length > 1) out.push(S.picks.single ? "· 하나씩도 팔아요" : "· 묶음으로 드려요");
        if (S.direct && S.ship) out.push("· 직거래 · 택배 다 돼요");
        else if (S.direct) out.push("· 직거래만 해요");
        else if (S.ship) out.push("· 택배만 해요");
        return out.join("\n");
    }

    function giveBody() {
        var k = spec.kind, pol = S.tone === "polite", out = [];
        var end = pol ? "보내 드려요." : "보낼게!";
        if (k === "toy") {
            out.push(nmGa() + " " + USED.toy + " 장난감 " + end);
            var names = itemName();
            if (names.length) out.push(names.join(" · "));
        } else if (k === "bottle") {
            var b = itemName();
            out.push(nmGa() + " " + USED.bottle + " " + (b.length === 1 ? withNoun(b[0], "젖병") : "젖병") + " " + end);
            if (b.length > 1) out.push(b.join(" · "));
        } else {
            out.push(nmGa() + " " + USED[k] + " " + withNoun(spec.name, NOUN[k]) + " " + end);
        }
        if (k === "carseat" && S.gate === "ok")
            out.push("사고 난 적 없" + (S.expire ? "고, 유효기간은 " + ym(S.expire) + "까지" + (pol ? "예요." : "야.") : (pol ? "어요." : "어.")));
        var w = withLabels();
        if (w.length) out.push(joinWith(w, pol) + "도 같이 넣을게" + (pol ? "요." : "."));
        caresOn().forEach(function (c) { if (c.give) out.push(c.give + (pol ? "요." : ".")); });
        if (k === "bottle") out.push(pol ? "젖꼭지는 빼 뒀으니 새로 사서 끼워 쓰세요." : "젖꼭지는 빼 뒀으니까 새로 사서 끼워 써.");
        if (S.link && spec.link) {
            var what = k === "toy" ? "개월별 놀이가" : "이 " + NOUN[k] + " 정리된 게";
            out.push("배냇함에 " + what + " 있어" + (pol ? "요" : "") + " 👉 " + spec.link);
        }
        return out.join("\n");
    }

    function regen() {
        if (!S.editedT) S.title = sellTitle();
        if (!S.editedB) S.body = S.mode === "give" ? giveBody() : sellBody();
    }
    function ready() {
        if (spec.gate && S.gate !== "ok") return false;
        if (spec.items && !chosenItems().length) return false;
        return true;
    }

    /* ==========================================================
       그리기
       ---------------------------------------------------------- */
    function chip(on, label, act, arg) {
        return '<div role="button" aria-pressed="' + (on ? "true" : "false") + '" onclick="window.__ho(\'' + act + '\',\'' + esc(arg || "") + '\')" ' +
            'style="padding:9px 12px; border-radius:11px; cursor:pointer; font-size:12.5px; font-weight:800; line-height:1.3; ' +
            (on ? 'background:' + GREEN + '; color:#FFFFFF; border:1px solid ' + GREEN + ';'
                : 'background:' + BG + '; color:' + GRAY + '; border:1px solid ' + LINE + ';') + '">' +
            (on ? "✓ " : "") + esc(label) + '</div>';
    }
    function label(t, sub) {
        return '<div style="font-size:12.5px; font-weight:900; color:' + DARK + '; margin:16px 0 8px;">' + esc(t) +
            (sub ? ' <span style="font-weight:700; color:' + SUB + ';">' + esc(sub) + '</span>' : '') + '</div>';
    }
    function seg(on, text, act) {
        return '<div role="tab" aria-selected="' + (on ? "true" : "false") + '" onclick="window.__ho(\'' + act + '\')" ' +
            'style="flex:1; text-align:center; padding:11px 0; border-radius:11px; cursor:pointer; font-size:13.5px; font-weight:800; ' +
            (on ? 'background:#FFFFFF; color:' + DARK + '; box-shadow:0 2px 6px rgba(0,0,0,0.07);' : 'background:transparent; color:' + SUB + ';') + '">' +
            esc(text) + '</div>';
    }

    /* 달 고르기 — 빈 month 칸은 폰마다 '-------' · 빈칸으로 보여서 뭘 하는 칸인지 몰랐다.
       글자로 보이는 단추 위에 투명한 month 칸을 덮는다 (누르면 폰의 달 고르는 창).
       ⚠️ 글씨 16px — 아이폰은 그보다 작은 칸을 누르면 화면을 확대한다 */
    function monthField(id, val, act, empty, max) {
        return '<div style="display:flex; align-items:center; gap:10px;">' +
            '<div style="position:relative; display:inline-flex; align-items:center; gap:8px; padding:11px 14px; border-radius:11px; ' +
                'border:1px solid #DCD3C8; background:#FFFFFF; font-size:13.5px; font-weight:800; color:' + (val ? DARK : SUB) + ';">' +
                esc(val ? ym(val) : empty) + '<span aria-hidden="true" style="font-size:11px; color:' + SUB + ';">▾</span>' +
                '<input id="' + id + '" type="month" value="' + esc(val) + '"' + (max ? ' max="' + max + '"' : '') + ' aria-label="' + esc(empty) + '" ' +
                    'onchange="window.__ho(\'' + act + '\', this.value)" ' +
                    'style="position:absolute; inset:0; width:100%; height:100%; opacity:0; cursor:pointer; border:0; margin:0; padding:0; font-size:16px;">' +
            '</div>' +
            (val ? '<span role="button" onclick="window.__ho(\'' + act + '\', \'\')" style="font-size:12px; font-weight:800; color:' + SUB + '; cursor:pointer; padding:6px 2px;">지우기</span>' : '') +
        '</div>';
    }

    function tossHTML(b) {
        /* 배경은 큐레이터 style.css 의 다크모드 짝(#FFF2F2 → 어두운 빨강)이 있는 색으로 */
        return '<div style="margin-top:14px; background:#FFF2F2; border:1px solid #F5C9C9; border-radius:14px; padding:15px 16px;">' +
            '<div class="ho-red" style="font-size:13.5px; font-weight:900; color:' + RED + '; line-height:1.5; word-break:keep-all;">⚠️ ' + esc(b.title) + '</div>' +
            '<div style="margin-top:6px; font-size:12.5px; font-weight:600; color:' + GRAY + '; line-height:1.75; word-break:keep-all;">' + b.text + '</div>' +
            '<div style="margin-top:10px; font-size:12.5px; font-weight:900; color:' + DARK + ';">버릴 때는</div>' +
            '<div style="margin-top:4px; font-size:12.5px; font-weight:600; color:' + GRAY + '; line-height:1.8; word-break:keep-all;">' +
                '· 어깨끈을 잘라 두세요. 누가 주워 쓰지 않게요<br>' +
                '· 대부분 대형 폐기물로 신고하고 내놔요. 방법과 수수료는 동네마다 달라요' +
            '</div>' +
        '</div>';
    }

    function doneHTML(force) {
        if (!spec.onDone || (!S.acted && !force)) return "";
        if (S.confirm) {
            return '<div style="margin-top:14px; background:' + BG + '; border:1px solid ' + LINE + '; border-radius:14px; padding:14px 15px;">' +
                '<div style="font-size:13px; font-weight:800; color:' + DARK + '; line-height:1.6; word-break:keep-all;">' + esc(spec.doneAsk || "목록에서 뺄까요?") + '</div>' +
                '<div style="display:flex; gap:8px; margin-top:11px;">' +
                    '<div onclick="window.__ho(\'undone\')" style="flex:1; text-align:center; padding:12px; border-radius:12px; background:#FFFFFF; border:1px solid ' + LINE + '; color:' + GRAY + '; font-size:13px; font-weight:800; cursor:pointer;">그대로 둘게요</div>' +
                    '<div id="ho-done-yes" onclick="window.__ho(\'done\')" style="flex:1.3; text-align:center; padding:12px; border-radius:12px; background:' + DARK + '; color:#FFFFFF; font-size:13px; font-weight:900; cursor:pointer;">뺄게요</div>' +
                '</div>' +
            '</div>';
        }
        return '<div style="margin-top:14px; display:flex; align-items:center; gap:10px; padding-top:13px; border-top:1px dashed ' + LINE + ';">' +
            '<div style="flex:1; font-size:12.5px; font-weight:700; color:' + SUB + '; line-height:1.6; word-break:keep-all;">' +
                (force ? "버렸으면" : "다 보냈으면") + '</div>' +
            '<div id="ho-done" onclick="window.__ho(\'ask\')" style="flex-shrink:0; padding:10px 13px; border-radius:11px; background:rgba(127,119,221,0.1); color:' + PURPLE + '; font-size:12.5px; font-weight:900; cursor:pointer;">' +
                esc(spec.doneLabel || "목록에서 빼기") + '</div>' +
        '</div>';
    }

    function inner() {
        var k = spec.kind, give = S.mode === "give";
        var head = (spec.items ? NOUN[k] : (spec.name || NOUN[k]));
        var out =
            '<div style="width:40px; height:5px; background:' + LINE + '; border-radius:3px; margin:0 auto 16px;"></div>' +
            '<div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">' +
                '<div style="font-size:17px; font-weight:900; color:' + DARK + '; line-height:1.4; word-break:keep-all;">🥕 ' + esc(head) + ' 보내기</div>' +
                '<div onclick="window.closeHandoff()" aria-label="닫기" style="flex-shrink:0; font-size:24px; font-weight:300; color:' + SUB + '; cursor:pointer; line-height:1; padding:0 2px 6px 10px;">×</div>' +
            '</div>' +
            '<div style="font-size:12.5px; font-weight:600; color:' + GRAY + '; margin-top:4px; line-height:1.6; word-break:keep-all;">' +
                (give ? '물려줄 사람에게 보낼 말을 만들어 드려요. 고쳐 써도 돼요.' : '당근에 올릴 글을 만들어 드려요. 값은 직접 정해 주세요.') + '</div>';

        if (spec.block) {
            return out + tossHTML(spec.block) +
                (spec.block.fix && spec.onExpire
                    ? '<div style="margin-top:14px; display:flex; align-items:center; gap:10px; flex-wrap:wrap;">' +
                        '<span style="font-size:12.5px; font-weight:700; color:' + SUB + ';">날짜를 잘못 적었으면</span>' +
                        monthField("ho-expire", S.expire, "expire", "유효기간 고르기", "") + '</div>'
                    : '') +
                doneHTML(true);
        }

        out += '<div role="tablist" style="display:flex; gap:5px; background:#F6F2EC; border-radius:13px; padding:4px; margin-top:14px;">' +
            seg(!give, "당근에 팔기", "sell") + seg(give, "물려주기", "give") + '</div>';

        if (spec.gate) {
            out += label("사고 난 적 있나요?", "작은 접촉사고도요") +
                '<div style="display:flex; gap:7px;">' +
                    chip(S.gate === "ok", "없어요", "gate", "ok") + chip(S.gate === "crash", "있어요", "gate", "crash") +
                '</div>';
            if (S.gate === "crash") {
                return out + tossHTML({ title: "사고가 난 카시트는 팔거나 물려주지 마세요",
                    text: "겉이 멀쩡해도 안쪽 구조가 상했을 수 있어요. 받는 사람은 그걸 알 수가 없어요." }) + doneHTML(true);
            }
        }

        if (spec.items) {
            out += label(give ? "보낼 것" : "팔 것", chosenItems().length + "개") +
                '<div style="display:flex; flex-wrap:wrap; gap:7px;">' +
                spec.items.map(function (x) { return chip(!!S.items[x.id], x.name, "item", x.id); }).join("") + '</div>';
        }

        if (!give && spec.since !== undefined) {
            out += label("산 달", "모르면 비워 두세요") + monthField("ho-since", S.since, "since", "언제 샀는지 고르기", nowYM());
        }
        if (k === "carseat" && spec.expire !== undefined && !spec.expireKnown) {
            out += label("유효기간", "카시트 옆면 스티커") + monthField("ho-expire", S.expire, "expire", "유효기간 고르기", "") +
                '<div style="margin-top:6px; font-size:11.5px; font-weight:600; color:' + SUB + '; line-height:1.6; word-break:keep-all;">적어 두면 글에 같이 들어가요. 카시트를 넘길 때 꼭 알려 줘야 하는 날짜예요.</div>';
        }

        var ws = spec.withs || [], cs = (spec.cares || []).filter(function (c) { return !c.need || c.need(); });
        if (ws.length) out += label("같이 드리는 것") + '<div style="display:flex; flex-wrap:wrap; gap:7px;">' +
            ws.map(function (w) { return chip(!!S.picks[w.id], w.label, "pick", w.id); }).join("") + '</div>';
        if (cs.length || (k === "toy" && !give && chosenItems().length > 1)) {
            out += label("해 둔 것") + '<div style="display:flex; flex-wrap:wrap; gap:7px;">' +
                cs.map(function (c) { return chip(!!S.picks[c.id], c.label, "pick", c.id); }).join("") +
                (k === "toy" && !give && chosenItems().length > 1 ? chip(!!S.picks.single, "하나씩도 팔아요", "pick", "single") : "") +
                '</div>';
        }

        if (!give) {
            out += label("거래") + '<div style="display:flex; gap:7px;">' +
                chip(S.direct, "직거래", "trade", "direct") + chip(S.ship, "택배", "trade", "ship") + '</div>';
        } else {
            out += label("말투") + '<div style="display:flex; flex-wrap:wrap; gap:7px;">' +
                chip(S.tone === "casual", "편하게", "tone", "casual") + chip(S.tone === "polite", "정중하게", "tone", "polite") + '</div>';
        }

        var ok = ready();
        if (!ok) {
            return out + '<div style="margin-top:16px; padding:14px 15px; border-radius:13px; background:' + BG + '; font-size:12.5px; font-weight:700; color:' + SUB + '; line-height:1.6; word-break:keep-all;">' +
                (spec.gate && S.gate !== "ok" ? "사고 이력을 먼저 골라 주세요. 그다음에 글을 만들어요." : "보낼 것을 하나 이상 골라 주세요.") + '</div>';
        }

        if (!give) {
            out += label("제목") +
                '<div style="display:flex; gap:7px; align-items:center;">' +
                    '<input id="ho-title" type="text" value="' + esc(S.title) + '" oninput="window.__ho(\'title\', this.value)" maxlength="60" ' +
                        'style="flex:1; min-width:0; padding:12px 13px; border-radius:12px; border:1px solid ' + LINE + '; background:' + BG + '; font-size:13.5px; font-weight:800; color:' + DARK + '; font-family:inherit; box-sizing:border-box;">' +
                    '<div onclick="window.__ho(\'copyTitle\')" style="flex-shrink:0; padding:12px 12px; border-radius:12px; border:1px solid ' + LINE + '; background:#FFFFFF; color:' + GRAY + '; font-size:12.5px; font-weight:800; cursor:pointer;">복사</div>' +
                '</div>';
        }
        out += label(give ? "보낼 말" : "글", (S.editedT || S.editedB) ? "" : "눌러서 고칠 수 있어요") +
            '<textarea id="ho-body" rows="' + (give ? 7 : 10) + '" oninput="window.__ho(\'body\', this.value)" ' +
                'style="width:100%; box-sizing:border-box; padding:13px 14px; border-radius:14px; border:1px solid ' + LINE + '; background:' + BG + '; color:' + DARK + '; ' +
                'font-size:13.5px; font-weight:600; line-height:1.65; font-family:inherit; resize:none;">' + esc(S.body) + '</textarea>' +
            /* 글 밑 한 줄 — 링크 넣기(물려주기) · 고친 것 되돌리기 */
            ((give && spec.link) || S.editedT || S.editedB
                ? '<div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-top:8px;">' +
                    (give && spec.link
                        ? '<div role="checkbox" aria-checked="' + (S.link ? "true" : "false") + '" onclick="window.__ho(\'link\')" style="display:flex; align-items:center; gap:7px; font-size:12.5px; font-weight:800; color:' + GRAY + '; cursor:pointer; padding:4px 0;">' +
                              '<span style="width:18px; height:18px; border-radius:6px; display:inline-flex; align-items:center; justify-content:center; font-size:11px; font-weight:900; ' +
                                  (S.link ? 'background:' + GREEN + '; color:#FFFFFF;' : 'background:#FFFFFF; border:1.5px solid #DCD3C8; color:transparent;') + '">✓</span>' +
                              '배냇함 링크 넣기</div>'
                        : '<div></div>') +
                    ((S.editedT || S.editedB) ? '<div onclick="window.__ho(\'reset\')" style="font-size:12px; font-weight:800; color:' + PURPLE + '; cursor:pointer; padding:4px 0;">고친 것 지우고 다시 만들기</div>' : '') +
                  '</div>'
                : '') +
            '<div id="ho-go" onclick="window.__ho(\'' + (give ? "send" : "copy") + '\')" style="margin-top:14px; text-align:center; padding:16px; border-radius:14px; background:' + DARK + '; color:#FFFFFF; font-size:15px; font-weight:900; cursor:pointer;">' +
                (give ? "보내기" : "글 복사하기") + '</div>' +
            (give ? '<div onclick="window.__ho(\'copyGive\')" style="margin-top:9px; text-align:center; font-size:12.5px; font-weight:800; color:' + SUB + '; cursor:pointer;">복사만 하기</div>'
                  : '<div style="margin-top:8px; text-align:center; font-size:11.5px; font-weight:600; color:' + SUB + '; line-height:1.6;">당근 앱 글쓰기에 제목 · 글을 붙여 넣으세요</div>') +
            doneHTML(false);
        return out;
    }

    function paint() {
        var w = document.getElementById(ID);
        if (!w) return;
        var box = w.firstChild, y = box ? box.scrollTop : 0;
        box.innerHTML = inner();
        box.scrollTop = y;
    }

    /* ==========================================================
       복사 · 보내기
       ---------------------------------------------------------- */
    function copy(text, msg) {
        var fallback = function () { if (typeof window.showCopySheet === "function") window.showCopySheet(text); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text).then(function () { toast(msg); return true; },
                                                            function () { fallback(); return true; });
        }
        fallback();
        return Promise.resolve(true);
    }
    function send(text) {
        var viaCopy = function () { return copy(text, "복사했어요. 카톡에 붙여 넣어 보내세요"); };
        if (navigator.share) {
            return navigator.share({ text: text }).then(function () { return true; }, function (e) {
                if (e && e.name === "AbortError") return false;          // 공유 창을 그냥 닫았다
                return viaCopy();
            });
        }
        try {
            if (text.length <= 200 && typeof Kakao !== "undefined" && Kakao.isInitialized && Kakao.isInitialized()) {
                var link = spec.link || location.href;
                Kakao.Share.sendDefault({ objectType: "text", text: text, link: { mobileWebUrl: link, webUrl: link } });
                return Promise.resolve(true);
            }
        } catch (e) {}
        return viaCopy();
    }
    function acted() { if (S && !S.acted) { S.acted = true; paint(); } }   // 그사이 창을 닫았으면 할 일 없음

    window.__ho = function (act, v) {
        if (!spec || !S) return;
        switch (act) {
            case "sell": case "give":
                if (S.mode === act) return;
                S.mode = act; S.editedB = false; S.editedT = false; break;
            case "gate": S.gate = (S.gate === v) ? "" : v; break;
            case "item": S.items[v] = !S.items[v]; break;
            case "pick": S.picks[v] = !S.picks[v]; break;
            case "trade": S[v] = !S[v]; savePref(); break;
            case "tone": S.tone = v; savePref(); break;
            case "link": S.link = !S.link; break;
            case "since": S.since = String(v || ""); break;
            case "expire":
                S.expire = String(v || "");
                if (typeof spec.onExpire === "function") { try { spec.onExpire(S.expire); } catch (e) {} }
                if (S.expire && window.handoffExpired(S.expire)) spec.block = expiredBlock(S.expire);
                else if (spec.block && spec.block.fix) spec.block = null;     // 잘못 적은 날짜를 고쳤다
                break;
            case "title": S.title = String(v || ""); S.editedT = true; return;          // 고치는 중엔 다시 그리지 않는다
            case "body": S.body = String(v || ""); S.editedB = true; return;
            case "reset": S.editedT = false; S.editedB = false; break;
            case "copyTitle": copy(S.title, "제목을 복사했어요"); return;
            case "copy": copy(S.body, "글을 복사했어요. 당근 앱 글쓰기에 붙여 넣으세요").then(acted); return;
            case "copyGive": copy(S.body, "복사했어요. 카톡에 붙여 넣어 보내세요").then(acted); return;
            case "send": send(S.body).then(function (ok) { if (ok) acted(); }); return;
            case "ask": S.confirm = true; paint(); return;
            case "undone": S.confirm = false; paint(); return;
            case "done":
                var fn = spec.onDone, msg = spec.doneToast;
                var chosen = chosenItems().map(function (x) { return String(x.id); });   // 장난감 · 젖병은 고른 것만 뺀다
                window.closeHandoff();
                if (typeof fn === "function") { try { fn(chosen); } catch (e) { console.warn("[보내기] 정리 실패", e); } }
                if (msg) toast(msg);
                return;
            default: return;
        }
        regen();
        paint();
    };

    /* 유효기간이 지났을 때 — 날짜를 잘못 적었을 수도 있어서 고치는 칸을 같이 둔다 */
    function expiredBlock(k) {
        return { title: "유효기간이 지난 카시트는 팔거나 물려주지 마세요",
                 text: "플라스틱이 삭아서 사고 때 버티지 못할 수 있어요 (" + ym(k) + "까지였어요).", fix: true };
    }

    window.closeHandoff = function () {
        var w = document.getElementById(ID);
        if (w) w.remove();
        document.body.style.overflow = "";
        spec = null; S = null;
    };

    function open(o, mode) {
        window.closeHandoff();
        spec = o || {};
        if (spec.kind === "carseat" && spec.expire && window.handoffExpired(spec.expire) && !spec.block) spec.block = expiredBlock(spec.expire);
        spec.expireKnown = !!spec.expire;
        S = fresh(spec, mode);
        regen();
        var w = document.createElement("div");
        w.id = ID;
        w.setAttribute("role", "dialog");
        w.setAttribute("style", "position:fixed; inset:0; z-index:100005; background:rgba(43,36,30,0.45); display:flex; align-items:flex-end; justify-content:center;");
        w.onclick = function (e) { if (e.target === w) window.closeHandoff(); };
        var box = document.createElement("div");
        box.setAttribute("style", "width:100%; max-width:480px; max-height:92vh; max-height:92dvh; overflow-y:auto; -webkit-overflow-scrolling:touch; " +
            "background:#FFFFFF; border-radius:24px 24px 0 0; padding:18px 20px calc(22px + env(safe-area-inset-bottom, 0px)); box-sizing:border-box; font-family:inherit;");
        w.appendChild(box);
        document.body.appendChild(w);
        document.body.style.overflow = "hidden";
        paint();
    }

    /* 다크모드 — 빨간 글씨는 어두운 바탕에서 안 보인다 (카드의 '유효기간이 지난' 줄도 같이 쓴다) */
    (function () {
        try {
            var st = document.createElement("style");
            st.textContent = "body.dark-mode .ho-red{color:#FF8A8A !important;}";
            (document.head || document.documentElement).appendChild(st);
        } catch (e) {}
    })();

    window.Handoff = {
        open: open,
        text: function () { return S ? { title: S.title, body: S.body, mode: S.mode } : null; }   // 점검용
    };
})();
