/* ============================================================
   배냇함 — 열 달의 문답 (tenmonths.js)          ※ 숨김 스위치 뒤 (stage.js)

   다른 임신 앱은 엄마 혼자 쓰는 앱이다. 배냇함은 둘이 쓴다.
   한 주에 질문 하나. 엄마와 아빠가 각자 답하고, 둘 다 써야 서로의 답이 열린다.
   (부부 문답 '우리의 문답' 과 같은 약속)

   아이가 태어나면 이 마흔 개의 문답이 '엄마 아빠가 너를 기다리며' 장이 된다.

   저장: 아기마다 tosil_preg_qa = { "12": { mom: {t, at}, dad: {t, at} } }
   동기화: growth_가족코드(+꼬리표)/stage 문서의 qa 칸 (도우미 폰에는 안 내려간다)
           칸 하나씩만 덮어쓴다(merge). 엄마와 아빠가 동시에 써도 서로 지우지 않는다.

   index.html 에서 stage.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var Q = [
        "아기가 찾아온 걸 처음 알았을 때, 제일 먼저 든 생각은 뭐였어요?",
        "이 소식을 처음 전한 사람은 누구였어요? 어떤 반응이었어요?",
        "태명은 어떻게 짓게 됐어요?",
        "아기가 생긴 뒤로 달라진 우리 하루, 하나만 꼽는다면요?",
        "요즘 제일 힘든 것 하나, 제일 힘이 되는 것 하나는요?",
        "아기가 서로의 어떤 모습을 닮았으면 좋겠어요?",
        "초음파로 아기를 처음 봤을 때 어땠어요?",
        "부모님이 이 소식을 들으셨을 때 어떤 표정이었어요?",
        "아기에게 꼭 들려주고 싶은 노래가 있어요?",
        "어릴 때 제일 좋아했던 놀이는 뭐였어요?",
        "아기가 태어나면 같이 꼭 가 보고 싶은 곳은요?",
        "서로가 좋은 부모가 되겠다고 느낀 순간이 있었어요?",
        "요즘 자꾸 생각나는 음식이 있어요?",
        "우리가 처음 만난 날을 아기에게 들려준다면, 어떻게 말할래요?",
        "아기 이름에 꼭 담고 싶은 뜻이 있어요?",
        "부모가 된다는 게 실감 난 순간은 언제였어요?",
        "아기에게 물려주고 싶은 우리 집만의 습관이 있어요?",
        "처음 태동을 느꼈을 때 어땠어요? 아직이라면, 지금 마음은요?",
        "내가 받은 사랑 중에 아기에게도 꼭 주고 싶은 게 있어요?",
        "절반을 왔어요. 지금까지 제일 기억에 남는 날은요?",
        "아기가 커서 이 답을 읽는다면, 꼭 알았으면 하는 게 있어요?",
        "요즘 서로에게 고마운 일 하나를 꼽는다면요?",
        "아기가 처음 했으면 하는 말이 있어요?",
        "걱정되는 게 있다면, 하나만 털어놓아 볼까요?",
        "아기 자리에 꼭 두고 싶은 물건이 있어요?",
        "우리가 같이 지키고 싶은 육아 약속 하나는요?",
        "이건 우리를 안 닮았으면 하는 게 있어요? (웃으면서)",
        "아기와 처음 맞을 계절에 하고 싶은 게 있어요?",
        "배 속 아기에게 오늘 해 주고 싶은 말은요?",
        "부모님께 배운 것 중 그대로 하고 싶은 것, 다르게 하고 싶은 것은요?",
        "출산 날을 떠올리면 어떤 마음이 들어요?",
        "아기가 태어나면 제일 먼저 해 주고 싶은 건요?",
        "아기에게 처음 읽어 주고 싶은 책이 있어요?",
        "지금 우리 집 풍경을 한 장면으로 남긴다면요?",
        "서로에게 미리 '고생했어요'라고 말해 볼까요?",
        "출산 가방에 꼭 챙기고 싶은 게 있어요?",
        "아기가 태어나는 날, 날씨가 어땠으면 좋겠어요?",
        "둘만의 마지막 몇 주, 꼭 해 두고 싶은 게 있어요?",
        "아기를 처음 안으면 무슨 말을 할 것 같아요?",
        "열 달 동안 서로에게 하고 싶었던 말이 있어요?"
    ];
    window.tenMonthsQuestions = Q;

    function ui() { return window.stageUI || null; }
    function toast(m) { if (typeof window.showToast === "function") window.showToast(m); }
    function mySlot() { return localStorage.getItem("user_role") === "dad" ? "dad" : "mom"; }
    function word(slot) { return slot === "dad" ? "아빠" : "엄마"; }
    function other(slot) { return slot === "dad" ? "mom" : "dad"; }
    function weekNow() {
        var u = ui(); if (!u) return 0;
        var w = u.weeksFromDue(u.dueDate());
        return w ? Math.max(1, Math.min(40, w.weeks)) : 0;
    }

    function load() { try { var v = JSON.parse(localStorage.getItem("tosil_preg_qa")); return (v && typeof v === "object") ? v : {}; } catch (e) { return {}; } }
    function save(v) { try { localStorage.setItem("tosil_preg_qa", JSON.stringify(v)); } catch (e) {} }
    function entry(qa, wk, slot) { return (qa[wk] && qa[wk][slot] && qa[wk][slot].t) ? qa[wk][slot] : null; }

    /* ---------- 동기화 ---------- */
    function ref() {
        var code = localStorage.getItem("family_sync_code");
        if (!code || !window.db || typeof window.doc !== "function") return null;
        return window.doc(window.db, "growth_" + code + (window.currentBabySuffix || ""), "stage");
    }
    function pushOne(wk, slot, e) {
        var r = ref();
        if (!r || typeof window.setDoc !== "function") return;
        var body = { qa: {} }; body.qa[wk] = {}; body.qa[wk][slot] = e;
        try { window.setDoc(r, body, { merge: true }).catch(function (x) { console.warn("[열 달의 문답] 올리기 실패", x); }); } catch (x) {}
    }
    function merge(remote) {
        if (!remote || typeof remote !== "object") return false;
        var mine = load(), changed = false;
        Object.keys(remote).forEach(function (wk) {
            ["mom", "dad"].forEach(function (s) {
                var r = remote[wk] && remote[wk][s];
                if (!r || !r.t) return;
                var l = mine[wk] && mine[wk][s];
                if (!l || Number(r.at || 0) > Number(l.at || 0)) {
                    mine[wk] = mine[wk] || {}; mine[wk][s] = r; changed = true;
                }
            });
        });
        if (changed) save(mine);
        return changed;
    }
    var unwatch = null;
    function watch() {
        var r = ref();
        if (!r || typeof window.onSnapshot !== "function") return;
        if (unwatch) { try { unwatch(); } catch (e) {} }
        unwatch = window.onSnapshot(r, function (snap) {
            if (!snap.exists()) return;
            if (merge((snap.data() || {}).qa) && typeof window.refreshStageHome === "function") window.refreshStageHome();
        }, function (e) { console.warn("[열 달의 문답] 실시간 연동 에러", e); });
    }

    /* 짝꿍에게 알림 — 돌봄 도우미가 연결된 집에서는 보내지 않는다 (임신은 가족 이야기) */
    async function nudge(wk, both) {
        var code = localStorage.getItem("family_sync_code");
        if (!code || !window.functions || typeof window.httpsCallable !== "function") return;
        try {
            if (window.db && typeof window.getDoc === "function") {
                var fam = await window.getDoc(window.doc(window.db, "families", code));
                var m = fam.exists() ? ((fam.data() || {}).members || {}) : {};
                if (!Array.isArray(m) && Object.keys(m).some(function (k) { return m[k] === "viewer"; })) return;
            }
            var me = word(mySlot());
            await window.httpsCallable(window.functions, "sendFamilyPush")({
                syncCode: code,
                excludeUid: (typeof window.myUid === "function") ? window.myUid() : "",
                excludeToken: (typeof window.myPushToken === "function") ? window.myPushToken() : "",
                title: both ? "💌 " + me + "도 답했어요" : "💌 " + me + "가 이번 주 질문에 답했어요",
                body: both ? wk + "주 문답이 열렸어요. 서로 뭐라고 썼는지 볼까요?" : "내 답을 쓰면 서로의 답이 열려요",
                link: "index.html"
            });
        } catch (e) { console.warn("[열 달의 문답] 알림 실패", e); }
    }

    /* ---------- 홈 카드 ---------- */
    function pill(on, label) {
        var T = ui().tokens;
        return '<span style="font-size:12px;font-weight:700;padding:5px 10px;border-radius:999px;' +
            (on ? 'background:' + T.TINT + ';color:' + T.INK2 + ';' : 'border:1px dashed ' + T.LINE + ';color:' + T.MUTE + ';') + '">' +
            (on ? '✓ ' : '') + label + '</span>';
    }
    function cardHTML(w) {
        var u = ui(); if (!u) return "";
        var T = u.tokens, wk = Math.max(1, Math.min(40, w.weeks)), qa = load();
        var me = mySlot(), you = other(me);
        var mine = entry(qa, wk, me), yours = entry(qa, wk, you);
        var behind = 0;
        for (var i = 1; i < wk; i++) if (!entry(qa, i, me)) behind++;
        var act = 'window.openQA(' + wk + ')';
        return '<div class="pg-paper">' +
            '<div style="display:flex;justify-content:space-between;align-items:baseline;">' +
                '<span class="pg-h">열 달의 문답</span><span class="pg-meta">' + wk + '주의 질문</span></div>' +
            '<div onclick="' + act + '" class="pg-serif" style="font-size:18.5px;font-weight:700;color:' + T.INK2 + ';line-height:1.6;margin:14px 0 14px;' +
                'word-break:keep-all;cursor:pointer;">' + u.esc(Q[wk - 1]) + '</div>' +
            '<div style="display:flex;gap:6px;margin-bottom:16px;">' + pill(!!entry(qa, wk, "mom"), "엄마") + pill(!!entry(qa, wk, "dad"), "아빠") + '</div>' +
            '<div onclick="' + act + '" style="text-align:center;padding:14px;border-radius:14px;cursor:pointer;font-size:14.5px;font-weight:700;' +
                (mine ? 'border:1px solid ' + T.LINE + ';background:' + T.PAPER + ';color:' + T.INK2 + ';' : 'background:' + T.INK2 + ';color:#FFFDF9;') + '">' +
                (!mine ? (yours ? word(you) + '는 벌써 답했어요 · 내 답 쓰기' : '내 답 쓰기') : (yours ? '서로의 답 보기' : word(you) + '의 답을 기다려요')) + '</div>' +
            '<div style="display:flex;justify-content:space-between;margin-top:14px;">' +
                /* 30주에 들어온 사람에게 '27개 남았어요' 는 숙제처럼 보인다. 다섯 개가 넘으면 숫자를 안 쓴다 */
                (behind && behind <= 5 ? '<span onclick="window.openQAList()" class="pg-meta" style="cursor:pointer;">지난 질문 ' + behind + '개 ›</span>'
                        : '<span onclick="window.openQAList()" class="pg-meta" style="cursor:pointer;">지난 문답 보기 ›</span>') +
                '<span onclick="window.__qaTalk()" class="pg-meta" style="cursor:pointer;color:' + T.INK2 + ';">목소리로 들려주기 ›</span>' +
            '</div>' +
        '</div>';
    }
    window.__qaTalk = function () {
        var u = ui(); if (!u) return;
        toast("아기에게 하고 싶은 말을 들려주세요");
        if (typeof window.openVoiceSheet === "function") window.openVoiceSheet(u.todayKey());
    };

    /* ---------- 답 쓰기 · 서로 보기 ---------- */
    window.openQA = function (wk, edit) {
        var u = ui(); if (!u) return;
        var T = u.tokens, qa = load(), me = mySlot(), you = other(me);
        var mine = entry(qa, wk, me), yours = entry(qa, wk, you);
        var block = function (slot, e) {
            var d = new Date(e.at || Date.now());
            return '<div style="background:#FFFAF1;border:1px solid ' + T.LINE + ';border-radius:16px;padding:16px 16px 14px;margin-top:10px;">' +
                '<div class="pg-meta" style="margin-bottom:8px;">' + word(slot) + ' · ' + (d.getMonth() + 1) + '월 ' + d.getDate() + '일</div>' +
                '<div style="font-size:15px;font-weight:500;color:' + T.INK2 + ';line-height:1.8;white-space:pre-wrap;word-break:keep-all;">' + u.esc(e.t) + '</div></div>';
        };
        var head = '<div class="pg-meta">' + wk + '주 · 열 달의 문답</div>' +
            '<div class="pg-serif" style="font-size:20px;font-weight:700;color:' + T.INK2 + ';line-height:1.55;margin:8px 0 6px;word-break:keep-all;">' + u.esc(Q[wk - 1]) + '</div>';
        if (mine && yours && !edit) {
            u.sheet(head + block("mom", entry(qa, wk, "mom")) + block("dad", entry(qa, wk, "dad")) +
                '<div onclick="window.__qaEdit(' + wk + ')" style="text-align:center;padding:14px;margin-top:16px;font-size:13.5px;font-weight:700;color:' + T.SUB2 + ';cursor:pointer;">내 답 고치기</div>');
            return;
        }
        u.sheet(head +
            '<div class="pg-meta" style="margin:4px 0 14px;line-height:1.7;">' +
                (edit ? '고친 답은 바로 ' + word(you) + '에게도 보여요.' : yours ? word(you) + '는 벌써 답했어요. 내 답을 쓰면 서로의 답이 열려요.' : '둘 다 쓰면 서로의 답이 열려요.') + '</div>' +
            '<textarea id="qa-text" maxlength="600" placeholder="생각나는 대로 적어 주세요" style="width:100%;box-sizing:border-box;min-height:150px;padding:15px;' +
                'border:1px solid ' + T.LINE + ';border-radius:16px;font-size:15.5px;line-height:1.75;font-family:inherit;color:' + T.INK2 + ';background:#FFF;resize:none;">' +
                u.esc(mine ? mine.t : "") + '</textarea>' +
            u.primary(mine ? "고친 답 저장" : "저장", "window.__qaSave(" + wk + ")"));
    };
    window.__qaEdit = function (wk) { window.openQA(wk, true); };   // 내 칸만 다시 연다 (상대 답은 그대로 둔다)
    window.__qaSave = function (wk) {
        var t = ((document.getElementById("qa-text") || {}).value || "").trim();
        if (!t) return toast("한 줄이라도 적어 주세요");
        var qa = load(), me = mySlot();
        var had = !!entry(qa, wk, me);
        var e = { t: t, at: Date.now() };
        qa[wk] = qa[wk] || {}; qa[wk][me] = e; save(qa);
        pushOne(wk, me, e);
        var both = !!entry(qa, wk, other(me));
        if (!had) nudge(wk, both);
        ui().closeSheet();
        if (typeof window.refreshStageHome === "function") window.refreshStageHome();
        if (both) { toast("💌 서로의 답이 열렸어요"); setTimeout(function () { window.openQA(wk); }, 350); }
        else toast(word(other(me)) + "가 답하면 열려요");
    };

    /* ---------- 지난 문답 ---------- */
    window.openQAList = function () {
        var u = ui(); if (!u) return;
        var T = u.tokens, qa = load(), now = weekNow() || 40, rows = "";
        for (var i = now; i >= 1; i--) {
            var m = !!entry(qa, i, "mom"), d = !!entry(qa, i, "dad");
            var st = m && d ? '<span style="color:' + T.INK2 + ';">열림</span>' : (m || d ? (m ? '엄마만' : '아빠만') : '아직');
            rows += '<div onclick="window.openQA(' + i + ')" style="display:flex;gap:12px;align-items:center;padding:13px 0;border-top:1px solid ' + T.LINE + ';cursor:pointer;">' +
                '<span class="pg-serif" style="width:34px;flex-shrink:0;font-size:15px;font-weight:700;color:' + T.SUB2 + ';">' + i + '주</span>' +
                '<span style="flex:1;min-width:0;font-size:14px;font-weight:600;color:' + (m && d ? T.INK2 : T.SUB2) + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + u.esc(Q[i - 1]) + '</span>' +
                '<span class="pg-meta" style="flex-shrink:0;">' + st + '</span></div>';
        }
        u.sheet('<div class="pg-serif" style="font-size:20px;font-weight:700;color:' + T.INK2 + ';">열 달의 문답</div>' +
            '<div class="pg-meta" style="margin:6px 0 14px;">지난 주 질문에도 언제든 답할 수 있어요.</div>' + rows);
    };

    /* ---------- stage.js 홈에 끼우기 ---------- */
    window.stageCardHooks = window.stageCardHooks || {};
    (window.stageCardHooks["after-today"] = window.stageCardHooks["after-today"] || []).push(cardHTML);

    window.__qaTest = { merge: merge, load: load, entry: entry, Q: Q };

    function boot() {
        try { if (!(localStorage.getItem("tosil_stage_beta") === "1" || localStorage.getItem("tosil_stage_live") === "1")) return; } catch (e) { return; }
        setTimeout(watch, 3600);
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
})();