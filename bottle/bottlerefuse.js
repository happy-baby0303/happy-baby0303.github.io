/* ============================================================
   배냇함 PLUS — 젖병을 안 물어요 (bottlerefuse.js)

   복직이 한 달 남았는데 아기가 젖병을 거부한다.
   엄마는 새벽에 검색하고, 맘카페에 글을 쓰고, 댓글을 기다린다.
   그리고 "우리 애도 그랬어요" 라는 위로만 열 개 받는다.

   방법은 있다. 아홉 가지쯤 되고, 순서가 있다.
   그런데 아무도 순서대로 알려주지 않는다.

   그래서 하루에 하나씩만 준다.
       오늘은 이거 하나만 해보세요 → 됐어요 / 안 됐어요
       안 되면 내일 다음 걸 드립니다

   ⚠️ 하루에 하나다. 아홉 개를 한 번에 주면 아무것도 안 한다.
      그리고 하루 하나면 아홉 번 앱을 연다.

   ⚠️ 의학 주장을 하지 않는다. 전부 '해보는 방법' 이다.
      다만 젖병만이 아니라 아예 안 먹는 신호는 먼저 말한다.
      그건 방법의 문제가 아니라 병원에 가야 하는 일이다.

   index.html 에서 bottlegear.js 다음, bottletabs.js 앞에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var KEY  = "tosil_bottle_refuse";
    var GEAR = "tosil_bottle_gear";
    var HOST = "bottle-refuse";

    var BLUE = "#3182F6", GRAY = "#8B95A1", DARK = "#191F28";
    var GREEN = "#1F9D6B", RED = "#E32636", GOLD = "#8A6D00";

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
    function today() {
        var t = new Date();
        return t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") +
               "-" + String(t.getDate()).padStart(2, "0");
    }
    function daysBetween(a, b) {
        var pa = String(a).split("-").map(Number), pb = String(b).split("-").map(Number);
        if (pa.length !== 3 || pb.length !== 3) return null;
        var da = new Date(pa[0], pa[1] - 1, pa[2]); da.setHours(0, 0, 0, 0);
        var db = new Date(pb[0], pb[1] - 1, pb[2]); db.setHours(0, 0, 0, 0);
        return Math.round((db - da) / 86400000);
    }

    function st() {
        try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
    }
    function save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }

    /* ==========================================================
       방법 — 쉬운 것부터. 하루에 하나씩만 준다.
       ⚠️ 전부 '해보는 방법' 이다. 효과를 약속하지 않는다.
       ---------------------------------------------------------- */

    var WAYS = [
        { id: "hungry", t: "배고프기 전에 물려보기",
          d: "너무 배고프면 화가 나서 새로운 걸 못 받아들입니다. " +
             "평소 수유 시간보다 <b>30분쯤 일찍</b>, 기분 좋을 때 한 번 대보세요. " +
             "울기 시작하면 그날은 접는 게 낫습니다." },

        { id: "warm",   t: "젖꼭지를 따뜻하게 해서",
          d: "찬 실리콘이 입에 닿으면 그것만으로 뱉습니다. " +
             "따뜻한 물에 <b>젖꼭지만</b> 잠깐 담갔다가 물기를 털고 주세요. " +
             "체온쯤이면 됩니다. 뜨거우면 안 돼요." },

        { id: "other",  t: "엄마 말고 다른 사람이",
          d: "엄마 품에서는 젖 냄새가 나서 <b>젖병을 물 이유가 없습니다.</b> " +
             "아빠나 할머니가 주시고, 엄마는 아예 다른 방에 계시는 게 낫습니다. " +
             "이 방법이 제일 많이 통합니다." },

        { id: "pose",   t: "안는 자세를 바꿔서",
          d: "수유하던 자세로 안으면 아기는 젖을 기다립니다. " +
             "<b>앞을 보게 무릎에 앉혀서</b> 주거나, 살짝 세워 안고 주세요. " +
             "젖 먹던 자세만 피하면 됩니다." },

        { id: "smell",  t: "엄마 냄새 나는 옷으로 감싸서",
          d: "엄마가 입던 옷으로 젖병이나 아기 몸을 감싸주세요. " +
             "다른 사람이 줘도 <b>익숙한 냄새</b>가 나면 훨씬 잘 뭅니다." },

        { id: "milk",   t: "젖꼭지에 모유를 조금 묻혀서",
          d: "젖꼭지 끝에 모유나 분유를 <b>한 방울</b> 묻혀서 입술에 대보세요. " +
             "맛이 먼저 나면 그다음에 무는 게 쉬워집니다." },

        { id: "sleepy", t: "비몽사몽할 때 물려보기",
          d: "낮잠에서 <b>막 깨려는 때</b>가 기회입니다. " +
             "완전히 깨면 거부할 힘이 생기는데, 반쯤 자는 상태에서는 그냥 뭅니다. " +
             "이렇게 몇 번 성공하면 깨어 있을 때도 됩니다." },

        { id: "flow",   t: "젖꼭지 유속을 바꿔보기",
          d: "너무 느리면 답답해서 화내고, 너무 빠르면 사레가 들려 무서워합니다. " +
             "지금 것보다 <b>한 단계 위·아래</b>를 각각 한 번씩 대보세요. " +
             "거부가 유속 때문인 경우가 생각보다 많습니다." },

        { id: "swap",   t: "젖병 자체를 바꿔보기",
          d: "여기까지 다 해보셨으면 <b>젖꼭지 모양이 안 맞는 것</b>일 수 있습니다. " +
             "아래에서 거부가 심한 아기에게 잘 맞는 것들을 골라드릴게요.",
          swap: true }
    ];

    function wayAt(i) { return WAYS[Math.max(0, Math.min(i, WAYS.length - 1))]; }

    /* ---------- 조작 ---------- */

    window.startRefuse = function () {
        var o = st();
        o.since = o.since || today();
        o.step = o.step || 0;
        o.log = o.log || {};
        save(o); paint();
    };
    window.stopRefuse = function () {
        try { localStorage.removeItem(KEY); } catch (e) {}
        paint();
    };
    window.markRefuseWay = function (ok) {
        var o = st();
        if (!o.since) return;
        var w = wayAt(o.step || 0);
        o.log = o.log || {};
        o.log[w.id] = { at: today(), ok: !!ok };
        if (!ok && (o.step || 0) < WAYS.length - 1) o.step = (o.step || 0) + 1;
        o.lastAt = today();
        save(o); paint();
    };
    window.setRefuseBackDate = function (v) {
        var o = st();
        o.back = v || "";
        save(o); paint();
    };

    /* 거부가 심한 아기에게 잘 맞는 것 중, 안 갖고 계신 것 */
    function swapPicks() {
        var have = [];
        try { have = (JSON.parse(localStorage.getItem(GEAR)) || {}).bottles || []; } catch (e) {}
        return bottles().filter(function (b) {
            return b.rejection === "super" && have.indexOf(b.id) === -1;
        }).slice(0, 3);
    }

    /* ==========================================================
       화면
       ---------------------------------------------------------- */

    function warnHTML() {
        return '<div style="background:#FFF2F2; border:1px solid #FCA5A5; border-radius:14px; ' +
            'padding:15px 16px; margin-bottom:14px; font-size:12.5px; font-weight:600; ' +
            'color:#4E5968; line-height:1.8; word-break:keep-all;">' +
            '<b style="color:' + RED + ';">\u26A0\uFE0F 먼저 봐주세요.</b> ' +
            '젖병만 거부하는 게 아니라 <b>젖도 잘 안 먹으려 하거나</b>, ' +
            '<b>소변 횟수가 눈에 띄게 줄었거나</b>, 늘어져 있으면 ' +
            '방법의 문제가 아닙니다. <b>소아과에 먼저 가세요.</b>' +
        '</div>';
    }

    function idleHTML() {
        return '<div class="matrix-panel" style="margin-bottom:20px;">' +
            '<div class="matrix-header">\uD83C\uDF7C 젖병을 안 물어요</div>' +
            '<div style="font-size:13px; font-weight:600; color:' + GRAY + '; ' +
                'margin:-16px 0 16px; line-height:1.75; word-break:keep-all;">' +
                '복직이 다가오는데 ' + esc(nm("가")) + ' 젖병을 거부하시나요. ' +
                '방법이 <b>아홉 가지</b> 있고 순서가 있습니다. ' +
                '한꺼번에 다 하시면 뭐가 통했는지 모르니까, <b>하루에 하나씩</b> 드릴게요.</div>' +
            '<div onclick="window.startRefuse()" style="text-align:center; padding:16px; ' +
                'background:' + DARK + '; color:#FFFFFF; border-radius:14px; ' +
                'font-size:14.5px; font-weight:900; cursor:pointer;">오늘부터 시작하기</div>' +
        '</div>';
    }

    function html() {
        var o = st();
        if (!o.since) return idleHTML();

        var step = o.step || 0;
        var w = wayAt(step);
        var done = (o.lastAt === today());
        var dayN = (daysBetween(o.since, today()) || 0) + 1;

        var log = o.log || {};
        var past = WAYS.filter(function (x) { return log[x.id]; });
        var win = past.filter(function (x) { return log[x.id].ok; })[0];

        var back = o.back || "";
        var dLeft = back ? daysBetween(today(), back) : null;

        var out = '<div class="matrix-panel" style="margin-bottom:20px;">' +
            '<div class="matrix-header">\uD83C\uDF7C 젖병을 안 물어요</div>';

        /* 복직 D-day */
        out += '<div style="display:flex; align-items:center; justify-content:space-between; ' +
            'gap:10px; margin:-16px 0 14px; padding:13px 15px; background: #F9FAFB; ' +
            'border:1px solid #E5E8EB; border-radius:13px;">' +
            '<div style="min-width:0;">' +
                '<div style="font-size:11.5px; font-weight:800; color:' + GRAY + ';">복직일</div>' +
                '<div style="margin-top:2px; font-size:13.5px; font-weight:900; color:' +
                    (dLeft !== null && dLeft <= 14 ? RED : DARK) + ';">' +
                    (dLeft === null ? "안 정하셨어요"
                        : dLeft > 0 ? "D-" + dLeft
                        : dLeft === 0 ? "오늘입니다" : "지났어요") + '</div>' +
            '</div>' +
            '<input type="date" value="' + esc(back) + '" ' +
                'onchange="window.setRefuseBackDate(this.value)" ' +
                'style="flex-shrink:0; padding:9px 11px; border-radius:10px; border:1px solid #D1D5DB; ' +
                'background: #FFFFFF; font-size:12.5px; font-weight:700; color:#4E5968;">' +
        '</div>';

        out += warnHTML();

        if (win) {
            /* 성공한 방법이 있으면 그걸 제일 위에 */
            out += '<div style="background:#EAF7F1; border:1px solid #A7DFC8; border-radius:14px; ' +
                'padding:16px; margin-bottom:12px;">' +
                '<div style="font-size:14px; font-weight:900; color:#1F6F52;">' +
                    '\u2705 ' + esc(win.t) + ' \u2014 이게 통했어요</div>' +
                '<div style="margin-top:6px; font-size:12.5px; font-weight:600; color:#4E5968; ' +
                    'line-height:1.75; word-break:keep-all;">' +
                    '며칠은 같은 방법으로 이어가세요. 한 번 됐다고 바로 되진 않고, ' +
                    '<b>대개 사나흘 반복하면 자리를 잡습니다.</b></div>' +
                '<div onclick="window.stopRefuse()" style="margin-top:11px; text-align:center; ' +
                    'padding:11px; background: #FFFFFF; color:#4E5968; border:1px solid #D1D5DB; ' +
                    'border-radius:11px; font-size:12.5px; font-weight:800; cursor:pointer;">' +
                    '이제 잘 물어요 \u00b7 그만 볼게요</div>' +
            '</div>';
        } else {
            /* 오늘 해볼 것 하나 */
            out += '<div style="font-size:11.5px; font-weight:900; color:' + BLUE + '; ' +
                'letter-spacing:0.4px; margin-bottom:7px;">' +
                dayN + '일째 \u00b7 오늘 해볼 것 하나</div>' +

                '<div style="background: #FFFFFF; border:1.5px solid #CBE0FF; border-radius:16px; ' +
                    'padding:18px; box-shadow:0 3px 14px rgba(49,130,246,0.06);">' +
                    '<div style="display:flex; align-items:center; gap:8px;">' +
                        '<span style="flex-shrink:0; width:22px; height:22px; border-radius:7px; ' +
                            'background:' + DARK + '; color:#FFFFFF; font-size:11.5px; font-weight:900; ' +
                            'display:inline-flex; align-items:center; justify-content:center;">' +
                            (step + 1) + '</span>' +
                        '<span style="font-size:15.5px; font-weight:900; color:#191F28;">' +
                            esc(w.t) + '</span>' +
                    '</div>' +
                    '<div style="margin-top:9px; font-size:13px; font-weight:600; color:#4E5968; ' +
                        'line-height:1.8; word-break:keep-all;">' + w.d + '</div>' +

                    (done
                        ? '<div style="margin-top:14px; text-align:center; padding:13px; ' +
                          'background: #F9FAFB; color:' + GRAY + '; border-radius:12px; ' +
                          'font-size:12.5px; font-weight:800;">오늘 몫은 하셨어요. 내일 또 뵐게요</div>'
                        : '<div style="display:flex; gap:8px; margin-top:15px;">' +
                          '<div onclick="window.markRefuseWay(true)" style="flex:1; text-align:center; ' +
                              'padding:13px; background:' + DARK + '; color:#FFFFFF; border-radius:12px; ' +
                              'font-size:13.5px; font-weight:800; cursor:pointer;">물었어요!</div>' +
                          '<div onclick="window.markRefuseWay(false)" style="flex:1; text-align:center; ' +
                              'padding:13px; background: #FFFFFF; color:#4E5968; border:1px solid #D1D5DB; ' +
                              'border-radius:12px; font-size:13.5px; font-weight:800; cursor:pointer;">' +
                              '안 됐어요</div></div>') +
                '</div>';
        }

        /* 지금까지 해본 것 */
        if (past.length) {
            out += '<div style="margin-top:16px; font-size:12.5px; font-weight:900; color:' + DARK + '; ' +
                'margin-bottom:6px;">지금까지 ' + past.length + '가지 해보셨어요</div>';
            out += past.map(function (x) {
                var r = log[x.id];
                return '<div style="display:flex; justify-content:space-between; align-items:center; ' +
                    'gap:10px; padding:9px 0; border-bottom:1px solid #F2F4F6;">' +
                    '<div style="flex:1; min-width:0; font-size:12.5px; font-weight:700; ' +
                        'color:' + (r.ok ? "#1F6F52" : GRAY) + '; white-space:nowrap; ' +
                        'overflow:hidden; text-overflow:ellipsis;">' +
                        (r.ok ? "\u2713 " : "") + esc(x.t) + '</div>' +
                    '<div style="flex-shrink:0; font-size:11.5px; font-weight:700; color:' + GRAY + ';">' +
                        (r.ok ? "됐어요" : "안 됐어요") + '</div>' +
                '</div>';
            }).join("");
        }

        /* 마지막 단계 — 젖병 바꾸기 */
        if (!win && w.swap) {
            var picks = swapPicks();
            if (picks.length) {
                out += '<div style="margin-top:16px; background:#FFF9E6; border:1px solid #F5E1A4; ' +
                    'border-radius:14px; padding:16px;">' +
                    '<div style="font-size:13px; font-weight:900; color:' + GOLD + '; margin-bottom:4px;">' +
                        '거부가 심한 아기에게 잘 맞는 것들</div>' +
                    '<div style="font-size:12px; font-weight:600; color:' + GOLD + '; ' +
                        'line-height:1.7; margin-bottom:11px; word-break:keep-all;">' +
                        '갖고 계신 건 빼고 골랐어요. 한 개씩만 사서 대보세요.</div>' +
                    picks.map(function (b) {
                        return '<div style="background: #FFFFFF; border-radius:11px; padding:12px 14px; ' +
                            'margin-bottom:7px;">' +
                            '<div style="font-size:13px; font-weight:900; color:' + DARK + ';">' +
                                esc(b.brand) + ' ' + esc(b.name) + '</div>' +
                            '<div style="margin-top:4px; font-size:11.5px; font-weight:600; color:#4E5968; ' +
                                'line-height:1.6; word-break:keep-all;">' + esc(b.desc || "") + '</div>' +
                        '</div>';
                    }).join("") +
                '</div>';
            }
        }

        out += '<div onclick="window.stopRefuse()" style="margin-top:14px; text-align:center; ' +
            'font-size:12px; font-weight:700; color:' + GRAY + '; cursor:pointer;">기록 지우고 처음부터</div>';

        return out + '</div>';
    }

    /* 무료 사용자에게 보이는 것 — 첫 방법 하나는 그냥 드린다 */
    function teaseHTML() {
        return '<div class="matrix-panel" style="margin-bottom:20px;">' +
            '<div class="matrix-header">\uD83C\uDF7C 젖병을 안 물어요</div>' +
            warnHTML() +
            '<div style="background: #FFFFFF; border:1.5px solid #CBE0FF; border-radius:16px; padding:18px;">' +
                '<div style="font-size:15.5px; font-weight:900; color:#191F28;">' +
                    '1. ' + esc(WAYS[0].t) + '</div>' +
                '<div style="margin-top:9px; font-size:13px; font-weight:600; color:#4E5968; ' +
                    'line-height:1.8; word-break:keep-all;">' + WAYS[0].d + '</div>' +
            '</div>' +
            '<div style="margin-top:14px; background:#FFF9E6; border:1px solid #F5E1A4; ' +
                'border-radius:14px; padding:17px 16px;">' +
                '<div style="font-size:13.5px; font-weight:900; color:' + GOLD + ';">' +
                    '나머지 ' + (WAYS.length - 1) + '가지는 PLUS에서 하루에 하나씩</div>' +
                '<div style="margin-top:6px; font-size:12.5px; font-weight:600; color:' + GOLD + '; ' +
                    'line-height:1.75; word-break:keep-all;">' +
                    '뭐가 됐고 뭐가 안 됐는지 기록해서, <b>안 된 건 다시 안 권합니다.</b> ' +
                    '끝까지 안 되면 ' + esc(nm("에게")) + ' 맞을 만한 젖병까지 골라드려요.</div>' +
            '</div>' +
        '</div>';
    }

    function paint() {
        var host = document.getElementById(HOST);
        if (!host) return;
        host.innerHTML = isPlus() ? html() : teaseHTML();
        try { if (typeof window.refreshPlusMark === "function") window.refreshPlusMark(); } catch (e) {}
    }
    window.refreshBottleRefuse = paint;

    function mount() {
        if (document.getElementById(HOST)) return;
        var anchor = document.getElementById("bottle-gear") ||
                     document.getElementById("bottle-guide");
        if (!anchor || !anchor.parentNode) return;
        var box = document.createElement("div");
        box.id = HOST;
        anchor.parentNode.insertBefore(box, anchor.nextSibling);
        paint();
    }

    function boot() { setTimeout(mount, 380); setTimeout(mount, 1180); }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    window.refuseDebug = function () {
        var o = st();
        console.log("PLUS:", isPlus(), "· 시작일:", o.since || "안 함",
                    "· 복직일:", o.back || "안 정함");
        if (o.since) {
            console.log("지금 단계:", (o.step || 0) + 1, "/", WAYS.length,
                        "·", wayAt(o.step || 0).t);
            console.log("오늘 눌렀나:", o.lastAt === today());
        }
        var log = o.log || {};
        WAYS.forEach(function (w, i) {
            var r = log[w.id];
            console.log("   " + (i + 1) + ". " + w.t +
                (r ? "   → " + (r.ok ? "✅ 됐어요" : "❌ 안 됐어요") + " (" + r.at + ")" : ""));
        });
        console.log("바꿔볼 젖병 후보:", swapPicks().map(function (b) {
            return b.brand + " " + b.name;
        }).join(" · ") || "없음");
        console.log("붙었나:", !!document.getElementById(HOST));
    };
})();