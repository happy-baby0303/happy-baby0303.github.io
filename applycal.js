/* ============================================================
   배냇함 — 우리 집 신청 달력 (applycal.js)       ※ 숨김 스위치 뒤 (stage.js)

   예정일(태어나면 출생일)만 있으면, 신청할 것과 그 날짜가 저절로 나온다.
   항목마다 '엄마가 / 아빠가 / 같이' 를 정한다. 남편에게 할 일이 생긴다.

   ⚠️ 법과 금액은 바뀐다. 이 파일의 RULES_AS_OF 와 항목 글만 고치면 된다.
      2026년 10월 기준으로 법제처 '찾기쉬운 생활법령', 정부24, 국민건강보험공단 안내와
      고용노동부 개정 내용(2026. 9. 18. 배우자 출산전후휴가)을 확인해 썼다.
      화면에는 늘 '기준 날짜' 와 '공식 안내' 링크를 같이 보여준다.
      배냇함은 안내만 한다. 대신 신청해 주지 않는다.

   저장: 아기마다 tosil_apply = { 항목id: { who: "mom|dad|both", done: 시각, at } }
   동기화: growth_가족코드(+꼬리표)/stage 의 apply 칸 (항목마다 따로 덮어쓴다)

   index.html 에서 stage.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var RULES_AS_OF = "2026년 10월 기준";
    var DAY = 86400000;
    var LAW_LEAVE = "https://easylaw.go.kr/CSP/CnpClsMain.laf?popMenu=ov&csmSeq=1112&ccfNo=5&cciNo=2&cnpClsNo=1";
    var LAW_CARD  = "https://www.easylaw.go.kr/CSP/CnpClsMainBtr.laf?ccfNo=2&cciNo=2&cnpClsNo=1&csmSeq=735";
    var GOV_LEAVE_PAY = "https://www.gov.kr/portal/rcvfvrSvc/dtlEx/WII000001460";
    var GOV = "https://www.gov.kr/";
    var BOKJIRO = "https://www.bokjiro.go.kr/";

    /* when
         week  : 임신 주수 [from, to] (예정일로 날짜 계산)
         due   : 예정일 기준 [from, to] 일 — 끝은 태어나면 출생일 기준으로 다시 잰다
         birth : 출생일 기준 마감 — days: 출생일 포함 N일째까지 / month: N개월 */
    var ITEMS = [
        { id: "card", phase: "preg", who: "mom", when: { week: [5, 12] },
          t: "임신·출산 진료비 바우처 신청",
          how: "산부인과에서 임신 등록이 됐는지 확인한 뒤, 국민건강보험공단 · 카드사 · 정부24에서 신청해요. 국민행복카드도 따로 발급받아야 해요.",
          fact: "태아 1명이면 100만 원, 둘 이상이면 140만 원이에요. 출산 전에 신청하면 예정일로부터 2년 동안 쓸 수 있어요.",
          link: LAW_CARD },
        { id: "short1", phase: "preg", who: "mom", when: { week: [4, 12] },
          t: "임신기 근로시간 단축 (12주까지)",
          how: "회사에 신청해요. 하루 2시간을 줄여도 월급은 깎이지 않아요.",
          fact: "임신 12주 이내, 또는 32주 이후에 쓸 수 있어요. 조기 진통 · 다태아처럼 위험이 높은 임신은 의사 진단으로 임신 기간 내내 쓸 수 있어요.",
          link: LAW_LEAVE },
        { id: "joriwon", phase: "preg", who: "both", when: { week: [8, 20] },
          t: "산후조리원 알아보기",
          how: "원하는 곳은 일찍 마감되기도 해요. 상담 날짜를 미리 잡아 두세요.",
          fact: "", link: "" },
        { id: "leave", phase: "preg", who: "mom", when: { week: [28, 34] },
          t: "출산전후휴가 날짜 정하기",
          how: "시작일을 회사와 정해요. 휴가 급여는 고용24 또는 고용센터에서 신청해요.",
          fact: "모두 90일이에요(미숙아 100일, 둘 이상 120일). 그중 출산 후 45일(둘 이상이면 60일) 이상은 꼭 쉬어야 해요.",
          link: GOV_LEAVE_PAY },
        { id: "short2", phase: "preg", who: "mom", when: { week: [32, 40] },
          t: "임신기 근로시간 단축 (32주부터)",
          how: "회사에 신청해요. 하루 2시간을 줄여도 월급은 깎이지 않아요.",
          fact: "임신 32주 이후부터 다시 쓸 수 있어요.",
          link: LAW_LEAVE },
        { id: "spouse", phase: "both", who: "dad", deadline: true, when: { due: [-50, 120] },
          t: "배우자 출산전후휴가 계획",
          how: "회사에 날짜를 알려요. 20일(근무일 기준)을 세 번까지 나눠, 네 번에 걸쳐 쓸 수 있어요.",
          fact: "출산 예정일 50일 전부터 쓸 수 있고, 출산일부터 120일이 지나면 못 써요. 2026년 9월 18일부터 이렇게 바뀌었어요.",
          link: LAW_LEAVE },
        { id: "parental", phase: "both", who: "both", when: { due: [-40, 30] },
          t: "육아휴직 신청",
          how: "쓰려는 날 30일 전까지 회사에 신청해요. 출산전후휴가가 끝나고 바로 이어 쓰려면 미리 해 두세요.",
          fact: "엄마 아빠가 모두 쓰면 각자 최대 1년 6개월까지 늘어나요. 조건은 공식 안내에서 확인하세요.",
          link: LAW_LEAVE },
        { id: "birthreg", phase: "born", who: "both", deadline: true, when: { birth: { month: 1 } },
          t: "출생신고",
          how: "병원에서 받은 출생증명서를 챙겨 주민센터에 가거나, 정부24 '행복출산 원스톱'으로 해요.",
          fact: "출생 후 1개월 안에 해야 해요. 늦으면 과태료가 있어요(최대 5만 원). 정확한 마감일은 주민센터에서 확인하세요.",
          link: GOV },
        { id: "onestop", phase: "born", who: "both", deadline: true, when: { birth: { days: 60 } },
          t: "부모급여 · 아동수당 · 첫만남이용권",
          how: "출생신고 할 때 '행복출산 원스톱'으로 같이 신청하면 한 번에 끝나요. 복지로에서도 돼요.",
          fact: "부모급여와 아동수당은 출생일을 포함해 60일 안에 신청해야 태어난 달부터 받아요. 첫만남이용권은 출생일부터 2년 안에 신청하면 돼요. " +
                "(부모급여 0세 월 100만 원 · 1세 월 50만 원, 아동수당 만 9세 미만 월 10만 원, 첫만남이용권 첫째 200만 · 둘째부터 300만 원)",
          link: BOKJIRO }
    ];
    window.applyItems = ITEMS;

    /* ---------- 날짜 ---------- */
    function ui() { return window.stageUI || null; }
    function toast(m) { if (typeof window.showToast === "function") window.showToast(m); }
    function fromKey(k) { var p = String(k || "").split("-"); return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])); }
    function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
    function today0() { var t = new Date(); t.setHours(0, 0, 0, 0); return t; }

    function windowOf(it, due, born) {
        var w = it.when, base = born || due;
        if (w.week) {
            if (!due) return null;
            var lmp = addDays(due, -280);
            return { from: addDays(lmp, w.week[0] * 7), to: addDays(lmp, (w.week[1] + 1) * 7 - 1) };
        }
        if (w.due) {
            if (!due && !born) return null;
            return { from: addDays(due || born, w.due[0]), to: addDays(base, w.due[1]), est: !born };
        }
        if (w.birth) {
            var b = born || due; if (!b) return null;
            var end = w.birth.month ? new Date(b.getFullYear(), b.getMonth() + w.birth.month, b.getDate()) : addDays(b, w.birth.days - 1);
            return { from: b, to: end, est: !born };
        }
        return null;
    }
    function md(d) { return (d.getMonth() + 1) + "월 " + d.getDate() + "일"; }
    function stateOf(win) {
        var t = today0();
        if (t < win.from) return { k: "soon", label: md(win.from) + "부터" };
        if (t > win.to) return { k: "past", label: md(win.to) + "까지였어요" };
        var left = Math.round((win.to - t) / DAY);
        return { k: "now", label: (left <= 7 ? "D-" + left + " · " : "") + md(win.to) + "까지" };
    }
    window.__applyTest = { windowOf: windowOf, stateOf: stateOf, fromKey: fromKey };

    /* ---------- 저장 · 동기화 ---------- */
    function load() { try { var v = JSON.parse(localStorage.getItem("tosil_apply")); return (v && typeof v === "object") ? v : {}; } catch (e) { return {}; } }
    function save(v) { try { localStorage.setItem("tosil_apply", JSON.stringify(v)); } catch (e) {} }
    function ref() {
        var code = localStorage.getItem("family_sync_code");
        if (!code || !window.db || typeof window.doc !== "function") return null;
        return window.doc(window.db, "growth_" + code + (window.currentBabySuffix || ""), "stage");
    }
    function pushOne(id, r) {
        var x = ref(); if (!x || typeof window.setDoc !== "function") return;
        var body = { apply: {} }; body.apply[id] = r;
        try { window.setDoc(x, body, { merge: true }).catch(function (e) { console.warn("[신청 달력] 올리기 실패", e); }); } catch (e) {}
    }
    function watch() {
        var x = ref(); if (!x || typeof window.onSnapshot !== "function") return;
        window.onSnapshot(x, function (snap) {
            if (!snap.exists()) return;
            var remote = (snap.data() || {}).apply, mine = load(), changed = false;
            if (!remote) return;
            Object.keys(remote).forEach(function (id) {
                var r = remote[id]; if (!r) return;
                if (!mine[id] || Number(r.at || 0) > Number(mine[id].at || 0)) { mine[id] = r; changed = true; }
            });
            if (changed) { save(mine); repaint(); }
        }, function () {});
    }
    function rec(id) { return load()[id] || {}; }

    /* 서버 알림(stageDaily)에 넘길 '법으로 정해진 마감' — 아직 안 한 것, 60일 안쪽만 */
    window.applyDeadlines = function () {
        var D = dates(), t = today0(), out = [];
        ITEMS.filter(function (x) { return x.deadline; }).forEach(function (it) {
            var win = windowOf(it, D.due, D.born); if (!win || rec(it.id).done) return;
            var left = Math.round((win.to - t) / DAY);
            if (left < 0 || left > 60) return;
            var d = win.to;
            out.push({ id: it.id, t: it.t, date: d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0") });
        });
        return out;
    };
    function setRec(id, patch) {
        var a = load(), r = a[id] || {};
        Object.keys(patch).forEach(function (k) { r[k] = patch[k]; });
        r.at = Date.now(); a[id] = r; save(a); pushOne(id, r);
        if (typeof window.stagePushSync === "function") window.stagePushSync();   // 다 했으면 마감 알림도 멈춘다
    }
    function whoOf(it) { return rec(it.id).who || it.who; }
    var WHO = { mom: "엄마", dad: "아빠", both: "같이" };

    function dates() {
        var due = localStorage.getItem("tosil_due_date");
        var st = (typeof window.babyStage === "function") ? window.babyStage() : "born";
        var born = (st === "born") ? localStorage.getItem("tosil_startDate") : null;
        return { due: due ? fromKey(due) : null, born: born ? fromKey(born) : null, stage: st };
    }
    function rowsFor(list, D) {
        return list.map(function (it) {
            var win = windowOf(it, D.due, D.born); if (!win) return null;
            return { it: it, win: win, st: stateOf(win), done: !!rec(it.id).done };
        }).filter(Boolean);
    }

    /* ---------- 줄 하나 ---------- */
    function rowHTML(r) {
        var u = ui(), T = u.tokens, it = r.it;
        var tick = '<div onclick="event.stopPropagation(); window.__applyDone(\'' + it.id + '\')" style="width:22px;height:22px;border-radius:50%;flex-shrink:0;cursor:pointer;margin-top:1px;' +
            'display:flex;align-items:center;justify-content:center;font-size:12px;color:#FFF;' +
            (r.done ? 'background:' + T.INK2 + ';' : 'border:1.5px solid #CBBBA6;') + '">' + (r.done ? '✓' : '') + '</div>';
        var tone = r.done ? T.MUTE : (r.st.k === "now" ? T.INK2 : T.SUB2);
        return '<div onclick="window.openApply(\'' + it.id + '\')" style="display:flex;gap:12px;padding:13px 0;border-top:1px solid ' + T.LINE + ';cursor:pointer;">' + tick +
            '<div style="flex:1;min-width:0;">' +
                '<div style="font-size:15px;font-weight:700;color:' + tone + ';' + (r.done ? 'text-decoration:line-through;' : '') + 'word-break:keep-all;">' + u.esc(it.t) + '</div>' +
                '<div class="pg-meta" style="margin-top:3px;' + (r.st.k === "now" && !r.done ? 'color:#9A6B12;' : '') + '">' + r.st.label + (r.win.est ? ' · 예정일 기준' : '') + '</div>' +
            '</div>' +
            '<span style="flex-shrink:0;align-self:center;font-size:12px;font-weight:700;color:' + T.INK2 + ';background:' + T.TINT + ';padding:5px 10px;border-radius:999px;">' + WHO[whoOf(it)] + '</span>' +
        '</div>';
    }

    /* ---------- 임신 중 홈 카드 (병원 일정 바로 아래) ---------- */
    function cardHTML() {
        var u = ui(); if (!u) return "";
        var T = u.tokens, D = dates();
        var rows = rowsFor(ITEMS, D).filter(function (r) { return !r.done && r.st.k !== "past"; });
        rows.sort(function (a, b) { return (a.st.k === "now" ? 0 : 1) - (b.st.k === "now" ? 0 : 1) || a.win.to - b.win.to; });
        return '<div class="pg-paper" style="padding:10px 20px 14px;">' +
            '<div style="display:flex;justify-content:space-between;align-items:baseline;padding:12px 0;">' +
                '<span class="pg-h">신청할 것</span><span onclick="window.openApplyList()" class="pg-meta" style="cursor:pointer;color:' + T.INK2 + ';">전체 보기 ›</span></div>' +
            (rows.length ? rows.slice(0, 3).map(rowHTML).join("") : '<div class="pg-meta" style="padding:12px 0;border-top:1px solid ' + T.LINE + ';">지금 챙길 신청은 없어요.</div>') +
            '<div style="font-size:11px;font-weight:600;color:' + T.MUTE + ';padding-top:10px;border-top:1px solid ' + T.LINE + ';">' + RULES_AS_OF + ' · 법과 금액은 바뀔 수 있어요</div>' +
        '</div>';
    }

    /* ---------- 자세히 ---------- */
    window.openApply = function (id) {
        var u = ui(), T = u.tokens, it = ITEMS.filter(function (x) { return x.id === id; })[0]; if (!it) return;
        var D = dates(), win = windowOf(it, D.due, D.born), st = win ? stateOf(win) : null, who = whoOf(it), done = !!rec(id).done;
        var seg = ["mom", "dad", "both"].map(function (k) {
            return '<div onclick="window.__applyWho(\'' + id + '\',\'' + k + '\')" style="flex:1;text-align:center;padding:11px 0;border-radius:11px;cursor:pointer;font-size:14px;font-weight:700;' +
                (who === k ? 'background:' + T.INK2 + ';color:#FFFDF9;' : 'color:' + T.SUB2 + ';') + '">' + WHO[k] + '</div>';
        }).join("");
        u.sheet('<div class="pg-meta">' + (st ? st.label + (win.est ? ' · 예정일 기준' : '') : '') + '</div>' +
            '<div class="pg-serif" style="font-size:20px;font-weight:700;color:' + T.INK2 + ';line-height:1.5;margin:6px 0 16px;word-break:keep-all;">' + u.esc(it.t) + '</div>' +
            '<div class="pg-meta" style="margin-bottom:6px;">누가 할까요</div>' +
            '<div style="display:flex;gap:4px;padding:4px;background:' + T.TINT + ';border-radius:14px;margin-bottom:18px;">' + seg + '</div>' +
            '<div style="font-size:14.5px;font-weight:500;color:' + T.INK2 + ';line-height:1.8;word-break:keep-all;">' + u.esc(it.how) + '</div>' +
            (it.fact ? '<div style="font-size:13px;font-weight:500;color:' + T.SUB2 + ';line-height:1.8;margin-top:12px;padding:13px 15px;background:#FFFAF1;border:1px solid ' + T.LINE + ';border-radius:14px;word-break:keep-all;">' +
                u.esc(it.fact) + '<div style="font-size:11px;font-weight:700;color:' + T.MUTE + ';margin-top:8px;">' + RULES_AS_OF + '</div></div>' : '') +
            (it.link ? '<a href="' + it.link + '" target="_blank" rel="noopener" style="display:block;text-align:center;margin-top:16px;padding:14px;border-radius:14px;border:1px solid ' + T.LINE + ';' +
                'background:' + T.PAPER + ';color:' + T.INK2 + ';font-size:14px;font-weight:700;text-decoration:none;">공식 안내 보기 ›</a>' : '') +
            u.primary(done ? "아직 안 했어요로 돌리기" : "다 했어요", "window.__applyDone('" + id + "', true)") +
            '<div style="font-size:11px;font-weight:600;color:' + T.MUTE + ';text-align:center;margin-top:12px;line-height:1.6;">배냇함은 안내만 해요. 신청은 각 기관에서 직접 해 주세요.</div>');
    };
    window.__applyWho = function (id, k) { setRec(id, { who: k }); repaint(); window.openApply(id); };
    window.__applyDone = function (id, fromSheet) {
        var d = !!rec(id).done;
        setRec(id, { done: d ? 0 : Date.now() });
        if (fromSheet && ui()) ui().closeSheet();
        if (!d) toast("하나 끝냈어요");
        repaint();
    };

    window.openApplyList = function () {
        var u = ui(), T = u.tokens, D = dates();
        var part = function (label, test) {
            var rows = rowsFor(ITEMS.filter(test), D);
            rows.sort(function (a, b) { return a.win.from - b.win.from; });
            return '<div class="pg-meta" style="margin:18px 0 2px;color:' + T.INK2 + ';font-weight:800;">' + label + '</div>' + rows.map(rowHTML).join("");
        };
        u.sheet('<div class="pg-serif" style="font-size:20px;font-weight:700;color:' + T.INK2 + ';">신청 달력</div>' +
            '<div class="pg-meta" style="margin:6px 0 0;">' + (D.born ? '출생일' : '예정일') + ' 기준으로 계산했어요 · ' + RULES_AS_OF + '</div>' +
            part("임신 중", function (x) { return x.phase !== "born"; }) +
            part("태어난 뒤", function (x) { return x.phase === "born"; }));
    };

    /* ---------- 태어난 뒤 120일 동안은 일반 홈에도 ---------- */
    function mountBorn() {
        var el = document.getElementById("home-apply-cal"), D = dates(), host = document.getElementById("tab-home");
        var fresh = D.stage === "born" && D.born && localStorage.getItem("tosil_born_from_preg") && (today0() - D.born) / DAY <= 120;
        if (!fresh || !host || !ui()) { if (el) el.remove(); return; }
        var rows = rowsFor(ITEMS.filter(function (x) { return x.phase !== "preg"; }), D).filter(function (r) { return !r.done && r.st.k !== "past"; });
        if (!rows.length) { if (el) el.remove(); return; }
        rows.sort(function (a, b) { return a.win.to - b.win.to; });
        var T = ui().tokens;
        var html = '<div class="pg-paper" style="padding:10px 20px 14px;">' +
            '<div style="display:flex;justify-content:space-between;align-items:baseline;padding:12px 0;">' +
                '<span class="pg-h">태어난 뒤 신청할 것</span><span onclick="window.openApplyList()" class="pg-meta" style="cursor:pointer;color:' + T.INK2 + ';">전체 보기 ›</span></div>' +
            rows.slice(0, 3).map(rowHTML).join("") +
            '<div style="font-size:11px;font-weight:600;color:' + T.MUTE + ';padding-top:10px;border-top:1px solid ' + T.LINE + ';">' + RULES_AS_OF + ' · 법과 금액은 바뀔 수 있어요</div></div>';
        if (!el) {
            el = document.createElement("div"); el.id = "home-apply-cal";
            var after = document.getElementById("baby-dashboard");
            while (after && after.parentNode && after.parentNode !== host) after = after.parentNode;
            if (after && after.parentNode === host) host.insertBefore(el, after.nextSibling); else host.insertBefore(el, host.firstChild);
        }
        el.innerHTML = html;
    }

    function repaint() {
        if (typeof window.refreshStageHome === "function") window.refreshStageHome();
        mountBorn();
    }

    /* 홈의 '챙길 것' 카드 [신청] 칸으로 들어간다 */
    function tabBody() {
        var u = ui(); if (!u) return "";
        var T = u.tokens, D = dates();
        var rows = rowsFor(ITEMS, D).filter(function (r) { return !r.done && r.st.k !== "past"; });
        rows.sort(function (a, b) { return (a.st.k === "now" ? 0 : 1) - (b.st.k === "now" ? 0 : 1) || a.win.to - b.win.to; });
        return (rows.length ? rows.slice(0, 4).map(rowHTML).join("") : '<div class="pg-meta" style="padding:12px 0;border-top:1px solid ' + T.LINE + ';">지금 챙길 신청은 없어요.</div>') +
            '<div style="display:flex;justify-content:space-between;align-items:center;padding-top:10px;border-top:1px solid ' + T.LINE + ';">' +
                '<span style="font-size:11px;font-weight:600;color:' + T.MUTE + ';">' + RULES_AS_OF + ' · 바뀔 수 있어요</span>' +
                '<span onclick="window.openApplyList()" class="pg-meta" style="cursor:pointer;color:' + T.INK2 + ';">전체 달력 ›</span></div>';
    }
    function tabCount() {
        return rowsFor(ITEMS, dates()).filter(function (r) { return !r.done && r.st.k === "now"; }).length;
    }
    window.stageTabs = window.stageTabs || [];
    window.stageTabs.push({ id: "apply", label: "신청", order: 2, body: tabBody, count: tabCount });

    function boot() {
        try { if (!(localStorage.getItem("tosil_stage_beta") === "1" || localStorage.getItem("tosil_stage_live") === "1")) return; } catch (e) { return; }
        setTimeout(mountBorn, 1800);
        setTimeout(watch, 3800);
        document.addEventListener("visibilitychange", function () { if (!document.hidden) mountBorn(); });
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
})();