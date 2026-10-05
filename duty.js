/* ============================================================
   배냇함 — 아기랑 있어요 / 밖에 있어요 + 교대 (duty.js)

   ⚠️ 예전엔 '엄마 모드 / 아빠 모드' 로 화면을 나눴는데 둘이 거의 같았고,
      아빠 화면은 '엄마가 집에 있다' 를 전제로 했다 (엄마가 복직하면 틀린다).
      진짜로 다른 건 성별이 아니라 '지금 아기 곁에 있느냐' 다.

     아기랑 있어요 — 지금 홈 그대로 (기록 버튼이 먼저)
     밖에 있어요   — 내가 나간 뒤로 무슨 일이 있었는지 · 받은 부탁 · 집에 가기 전에
                    [곧 들어가요] → 가족 폰에 "아빠가 20분 뒤에 들어가요"
                    [교대할게요]  → 가족 폰에 "아빠가 교대했어요. 이제 쉬어요", 짝꿍 화면은 '밖에 있어요' 로

   엄마 · 아빠는 이제 '나는 누구' (알림 · 문답 이름표) 로만 쓴다.
   돌봄 도우미 화면(mode-senior)은 이 파일이 건드리지 않는다.

   저장: 이 폰 tosil_where = "with" | "away", tosil_away_since = 시각
   동기화: duty_가족코드 / status 문서의 handoff 칸 (교대 신호만)

   index.html 에서 script.js · rolelock.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var INK = "#4A413C", SUB = "#8A7F76", LINE = "var(--border)", MIN = 60000;

    function toast(m) { if (typeof window.showToast === "function") window.showToast(m); }
    function senior() { return localStorage.getItem("user_role") === "senior"; }
    function where() { return localStorage.getItem("tosil_where") === "away" ? "away" : "with"; }
    function myWord() { return (typeof window.myRoleWord === "function") ? window.myRoleWord() : (localStorage.getItem("user_role") === "dad" ? "아빠" : "엄마"); }
    function myUid() { return (window.auth && window.auth.currentUser && window.auth.currentUser.uid) || localStorage.getItem("firebase_uid") || ""; }
    function code() { return localStorage.getItem("family_sync_code") || ""; }
    function records() { try { return JSON.parse(localStorage.getItem("tosil_tracker_records")) || []; } catch (e) { return []; } }
    function pad(n) { return String(n).padStart(2, "0"); }
    function hhmm(ms) { var d = new Date(ms); return pad(d.getHours()) + ":" + pad(d.getMinutes()); }
    function ago(ms) {
        var m = Math.max(0, Math.floor((Date.now() - ms) / MIN));
        if (m < 1) return "방금";
        if (m < 60) return m + "분 전";
        var h = Math.floor(m / 60), r = m % 60;
        return h + "시간" + (r ? " " + r + "분" : "") + " 전";
    }
    function callBaby(j) { try { if (typeof window.babyCall === "function") return window.babyCall(j || ""); } catch (e) {} return (localStorage.getItem("tosil_babyName") || "우리 아기") + (j || ""); }

    /* ---------- 상태 바꾸기 ---------- */
    function setWhere(w, quiet) {
        try {
            localStorage.setItem("tosil_where", w);
            if (w === "away") localStorage.setItem("tosil_away_since", String(Date.now()));
        } catch (e) {}
        apply();
        if (!quiet) toast(w === "away" ? "밖에 있어요 화면으로 바꿨어요" : "아기랑 있어요 화면으로 바꿨어요");
    }
    window.setDutyWhere = function (w) { setWhere(w === "away" ? "away" : "with"); };

    /* ---------- 화면 ---------- */
    function css() {
        if (document.getElementById("duty-css")) return;
        var s = document.createElement("style");
        s.id = "duty-css";
        s.textContent =
            /* 아빠 전용이던 덩어리(받은 부탁 · 브리핑)는 이제 '밖에 있어요' 일 때 누구에게나 */
            "body.mode-dad:not(.state-away) .show-on-dad-block, body.mode-dad:not(.state-away) .show-on-dad { display: none !important; }" +
            "body.state-away:not(.mode-senior) .show-on-dad-block { display: block !important; }" +
            "body.state-away:not(.mode-senior) .show-on-dad { display: flex !important; }" +
            /* 밖에 있을 땐 기록 버튼 · 루틴 · 오늘의 우리는 접어 둔다 (돌아오면 그대로) */
            "body.state-away #now-status-card, body.state-away #routine-checklist-container, body.state-away #em-count, " +
            "body.state-away #info-month-home { display: none !important; }" +
            ".duty-seg{display:flex;gap:4px;padding:4px;background:var(--bg-sub);border:1px solid var(--border);border-radius:14px;margin:0 0 14px;}" +
            ".duty-seg div{flex:1;text-align:center;padding:10px 0;border-radius:11px;font-size:14px;font-weight:800;color:" + SUB + ";cursor:pointer;}" +
            ".duty-seg div.on{background:var(--bg-card);color:" + INK + ";box-shadow:0 1px 3px rgba(59,50,44,0.10);}";
        document.head.appendChild(s);
    }

    function segHTML() {
        var w = where();
        return '<div class="duty-seg">' +
            '<div class="' + (w === "with" ? "on" : "") + '" onclick="window.setDutyWhere(\'with\')">🍼 아기랑 있어요</div>' +
            '<div class="' + (w === "away" ? "on" : "") + '" onclick="window.setDutyWhere(\'away\')">💼 밖에 있어요</div></div>';
    }

    function sinceStats(since) {
        var R = records().filter(function (r) { return r && Number(r.timestamp) >= since && Number(r.timestamp) <= Date.now() + 5 * MIN; });
        var feeds = R.filter(function (r) { return r.type === "feed" && r.subType !== "이유식"; });
        var foods = R.filter(function (r) { return r.type === "feed" && r.subType === "이유식"; });
        var diapers = R.filter(function (r) { return r.type === "diaper"; });
        var all = records();
        var lastFeed = all.filter(function (r) { return r.type === "feed" && r.subType !== "이유식"; }).sort(function (a, b) { return b.timestamp - a.timestamp; })[0];
        return { feeds: feeds, foods: foods, diapers: diapers, lastFeed: lastFeed };
    }

    function awayHTML() {
        var since = Number(localStorage.getItem("tosil_away_since")) || new Date(new Date().setHours(0, 0, 0, 0)).getTime();
        var s = sinceStats(since);
        var sleepTxt = "";
        if (window._activeSleepStart) sleepTxt = "지금 자는 중 · " + ago(window._activeSleepStart).replace(" 전", "째");
        else if (window._lastWakeTime) sleepTxt = "깬 지 " + ago(window._lastWakeTime).replace(" 전", "");
        var row = function (label, val, sub) {
            return '<div style="display:flex;justify-content:space-between;align-items:baseline;padding:11px 0;border-top:1px solid ' + LINE + ';">' +
                '<span style="font-size:14px;font-weight:700;color:' + SUB + ';">' + label + '</span>' +
                '<span style="text-align:right;"><span style="font-size:15px;font-weight:800;color:' + INK + ';">' + val + '</span>' +
                    (sub ? '<div style="font-size:12px;font-weight:600;color:' + SUB + ';margin-top:2px;">' + sub + '</div>' : '') + '</span></div>';
        };
        var lf = s.lastFeed;
        /* 받은 부탁 — 아래쪽 바통 카드까지 내려가지 않아도 보이게, 맨 위에서 몇 개인지와 첫 부탁을 */
        var myId = myUid(), bat = [];
        try { bat = (JSON.parse(localStorage.getItem("tosil_baton_records")) || []).filter(function (r) { return (r.status === "requested" || r.status === "accepted") && (!r.by || r.by !== myId); }); } catch (e) {}
        var firstAsk = bat.length ? String(bat[0].task || bat[0].title || bat[0].text || bat[0].mission || "").slice(0, 30) : "";
        return '<div id="duty-away-card" style="background:var(--bg-card);border:1px solid var(--border);border-radius:20px;padding:18px 18px 14px;margin-bottom:14px;box-shadow:0 2px 8px rgba(0,0,0,0.02);">' +
            '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;">' +
                '<span style="font-size:16px;font-weight:900;color:' + INK + ';">내가 나간 뒤로</span>' +
                '<span style="font-size:12.5px;font-weight:700;color:' + SUB + ';">' + hhmm(since) + '부터</span></div>' +
            row("맘마", s.feeds.length ? s.feeds.length + "번" : "아직", lf ? "마지막 " + ago(lf.timestamp) + " · " + (lf.subType || "맘마") + (lf.amount ? " " + lf.amount + (lf.subType === "모유" ? "분" : "ml") : "") : "") +
            (s.foods.length ? row("이유식", s.foods.length + "번", "") : "") +
            row("기저귀", s.diapers.length ? s.diapers.length + "번" : "아직", "") +
            (sleepTxt ? row("잠", sleepTxt, "") : "") +
            (bat.length ? '<div onclick="var t=document.getElementById(\'home-dad-baton-list\'); if(t) t.scrollIntoView({behavior:\'smooth\', block:\'center\'});" ' +
                'style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;padding:12px 14px;border-radius:13px;background:rgba(127,119,221,0.08);cursor:pointer;">' +
                '<span style="font-size:14px;font-weight:800;color:#5B53B8;">💌 받은 부탁 ' + bat.length + '개' + (firstAsk ? ' · ' + firstAsk.replace(/</g, "&lt;") : '') + '</span>' +
                '<span style="font-size:13px;font-weight:800;color:#5B53B8;">보기 ›</span></div>' : '') +
            '<div style="display:flex;gap:8px;margin-top:12px;">' +
                '<div onclick="window.openComingHome()" style="flex:1;text-align:center;padding:14px;border-radius:14px;border:1px solid ' + LINE + ';background:var(--bg-card);' +
                    'color:' + INK + ';font-size:14.5px;font-weight:800;cursor:pointer;">🏠 곧 들어가요</div>' +
                '<div onclick="window.takeOverDuty()" style="flex:1;text-align:center;padding:14px;border-radius:14px;background:' + INK + ';color:#FFF;' +
                    'font-size:14.5px;font-weight:800;cursor:pointer;">🙌 교대할게요</div>' +
            '</div></div>';
    }

    function apply() {
        css();
        var away = where() === "away" && !senior();
        document.body.classList.toggle("state-away", away);
        var host = document.getElementById("tab-home");
        if (!host) return;
        var seg = document.getElementById("duty-seg-wrap"), card = document.getElementById("duty-away-card");
        if (senior()) { if (seg) seg.remove(); if (card) card.remove(); return; }
        /* 사진(아기 대시보드) 바로 아래에 둔다 */
        var anchor = document.getElementById("baby-dashboard");
        while (anchor && anchor.parentNode && anchor.parentNode !== host) anchor = anchor.parentNode;
        if (!seg) { seg = document.createElement("div"); seg.id = "duty-seg-wrap"; }
        seg.innerHTML = segHTML();
        if (seg.parentNode !== host) {
            if (anchor && anchor.parentNode === host) host.insertBefore(seg, anchor.nextSibling);
            else host.insertBefore(seg, host.firstChild);
        }
        if (away) {
            var box = document.createElement("div"); box.innerHTML = awayHTML();
            var fresh = box.firstChild;
            if (card) card.parentNode.replaceChild(fresh, card); else host.insertBefore(fresh, seg.nextSibling);
        } else if (card) card.remove();
        if (typeof window.renderDadCommute === "function") { try { window.renderDadCommute(); } catch (e) {} }
        if (typeof window.renderHomeBatonList === "function") { try { window.renderHomeBatonList(); } catch (e) {} }
    }
    window.refreshDuty = apply;

    /* ---------- 알림 ---------- */
    async function push(title, body) {
        var c = code();
        if (!c || !window.functions || typeof window.httpsCallable !== "function") return false;
        try {
            await window.httpsCallable(window.functions, "sendFamilyPush")({
                syncCode: c, excludeUid: myUid(),
                excludeToken: (typeof window.myPushToken === "function") ? window.myPushToken() : "",
                title: title, body: body, link: "index.html"
            });
            return true;
        } catch (e) { console.warn("[교대] 알림 실패", e); return false; }
    }

    function sheet(inner) {
        var old = document.getElementById("duty-sheet"); if (old) old.remove();
        var w = document.createElement("div");
        w.id = "duty-sheet";
        w.setAttribute("style", "position:fixed;inset:0;z-index:100006;background:rgba(43,36,30,0.5);display:flex;align-items:flex-end;justify-content:center;");
        w.onclick = function (e) { if (e.target === w) w.remove(); };
        w.innerHTML = '<div style="width:100%;max-width:480px;background:var(--bg-card);border-radius:24px 24px 0 0;padding:22px 20px calc(22px + env(safe-area-inset-bottom,0px));box-sizing:border-box;">' + inner + '</div>';
        document.body.appendChild(w);
    }
    function closeSheet() { var s = document.getElementById("duty-sheet"); if (s) s.remove(); }

    window.openComingHome = function () {
        var chip = function (m, t) {
            return '<div onclick="window.__comingHome(' + m + ')" style="flex:1;text-align:center;padding:14px 0;border-radius:13px;border:1px solid ' + LINE + ';' +
                'font-size:15px;font-weight:800;color:' + INK + ';cursor:pointer;">' + t + '</div>';
        };
        sheet('<div style="font-size:18px;font-weight:900;color:' + INK + ';">언제쯤 들어가요?</div>' +
            '<div style="font-size:13px;font-weight:600;color:' + SUB + ';margin:6px 0 16px;">집에 있는 가족 폰에 알려 드릴게요.</div>' +
            '<div style="display:flex;gap:8px;">' + chip(10, "10분") + chip(20, "20분") + chip(30, "30분") + chip(60, "1시간") + '</div>');
    };
    window.__comingHome = async function (m) {
        closeSheet();
        var at = hhmm(Date.now() + m * MIN);
        var ok = await push("🏠 " + myWord() + "가 곧 들어가요", (m >= 60 ? "1시간" : m + "분") + " 뒤, " + at + "쯤 도착해요");
        toast(ok ? "가족에게 " + at + "쯤 도착한다고 알렸어요" : "지금은 알리지 못했어요. 연결을 확인해 주세요");
    };

    window.takeOverDuty = async function () {
        setWhere("with", true);
        var c = code();
        if (c && window.db && typeof window.setDoc === "function") {
            try { await window.setDoc(window.doc(window.db, "duty_" + c, "status"), { handoff: { by: myUid(), word: myWord(), at: Date.now() } }, { merge: true }); } catch (e) {}
        }
        var ok = await push("🙌 " + myWord() + "가 교대했어요", "이제 " + callBaby("는") + " " + myWord() + "가 볼게요. 쉬어요");
        toast(ok ? "교대했어요. 가족에게 알렸어요" : "교대했어요");
    };

    /* 짝꿍이 교대하면: 이 폰은 '밖에 있어요' (쉬는 쪽) 로 */
    var lastSeen = Number(localStorage.getItem("tosil_handoff_seen")) || 0;
    function watch() {
        var c = code();
        if (!c || !window.db || typeof window.onSnapshot !== "function" || senior()) return;
        window.onSnapshot(window.doc(window.db, "duty_" + c, "status"), function (snap) {
            if (!snap.exists()) return;
            var h = (snap.data() || {}).handoff;
            if (!h || !h.at || Number(h.at) <= lastSeen) return;
            lastSeen = Number(h.at);
            try { localStorage.setItem("tosil_handoff_seen", String(lastSeen)); } catch (e) {}
            if (h.by && h.by === myUid()) return;
            if (Date.now() - Number(h.at) > 30 * MIN) return;          // 오래된 신호는 무시
            setWhere("away", true);
            toast("🙌 " + (h.word || "짝꿍") + "가 교대했어요. 쉬어요");
        }, function () {});
    }

    function boot() {
        apply();
        setTimeout(apply, 1500);
        setTimeout(watch, 3500);
        setInterval(function () { if (where() === "away" && !document.hidden) apply(); }, 60000);
        document.addEventListener("visibilitychange", function () { if (!document.hidden) apply(); });
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
})();