/* ============================================================
   배냇함 — 시터 PLUS (sitterplus.js)

   돌봄 화면은 계속 무료다. 기록 버튼, 지금 상태, 엄마·아빠 전화,
   긴급 SOS, 119 카드는 여기서 하나도 건드리지 않는다.

   그 위에 '관리하는 것' 셋을 PLUS 로 둔다.
     1. 도우미 2명부터  — 1명은 무료
     2. 오늘 돌봄 요약  — 도우미가 '오늘 다 봤어요' 를 누르면 엄마·아빠 폰에 요약이 간다
     3. 근무 시간 기록  — 도우미가 '왔어요' · '다 봤어요' 를 누른 시각이 남고,
                         엄마·아빠는 설정에서 이번 주 · 이번 달 합계를 본다
                         (이모님 시급 계산이 쉬워진다)

   ⚠️ 무료 개방 중에는 isPremiumUser() 가 true 라 전부 열려 있다.
      유료로 바뀐 뒤에만 잠긴다.
   ⚠️ 무료 기간에 이미 연결한 도우미는 그대로 둔다. 아무도 내보내지 않는다.
      막는 건 '새로 초대할 때' 뿐이다.
   ⚠️ 근무 기록은 settings 가 아니라 sitterlog_가족코드 에 둔다.
      도우미도 써야 하는 칸이라 보안 규칙의 사생활 목록에 들어가지 않는다.

   index.html 에서 rolelock.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var GOLD = "#B98A2E", PURPLE = "#7F77DD";
    var SHIFT_KEY = "tosil_shift_start";      // 이 폰에서 시작한 근무 (도우미 폰)
    var KEEP = 400;                           // 근무 기록은 최근 400번까지

    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }
    function toast(m) { if (typeof window.showToast === "function") window.showToast(m); }
    function code() { return localStorage.getItem("family_sync_code"); }
    function isSitter() { return localStorage.getItem("user_role") === "senior"; }
    function isPlus() {
        try { return typeof window.isPremiumUser === "function" ? !!window.isPremiumUser() : false; }
        catch (e) { return false; }
    }
    function upsell() {
        if (typeof window.openPlus === "function") window.openPlus("sitter");
        else toast("PLUS에서 쓸 수 있어요");
    }
    function uid() {
        try { if (typeof window.myUid === "function") return window.myUid() || ""; } catch (e) {}
        return localStorage.getItem("firebase_uid") || "";
    }
    function pad(n) { return String(n).padStart(2, "0"); }
    function clock(ts) { var d = new Date(ts); return pad(d.getHours()) + ":" + pad(d.getMinutes()); }
    function span(min) {
        min = Math.max(0, Math.round(min));
        var h = Math.floor(min / 60), m = min % 60;
        return h ? (h + "시간" + (m ? " " + m + "분" : "")) : (m + "분");
    }
    function midnight(ts) { var d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }
    var WEEK = ["일", "월", "화", "수", "목", "금", "토"];
    function dayLabel(ts) { var d = new Date(ts); return (d.getMonth() + 1) + "/" + d.getDate() + " (" + WEEK[d.getDay()] + ")"; }

    /* ==========================================================
       오늘 돌봄 요약 — 트래커 기록에서 센다
       ========================================================== */

    function summarize(since, until) {
        var recs = [];
        try { recs = JSON.parse(localStorage.getItem("tosil_tracker_records")) || []; } catch (e) {}
        until = until || Date.now();
        var feed = 0, ml = 0, food = 0, breast = 0, diaper = 0, poop = 0, naps = 0, napMin = 0;
        recs.forEach(function (r) {
            var t = Number(r && r.timestamp);
            if (!t || t < since || t > until) return;
            if (r.type === "feed") {
                feed++;
                if (r.subType === "이유식") food += Number(r.amount) || 0;
                else if (r.subType === "모유") breast++;
                else ml += Number(r.amount) || 0;
            } else if (r.type === "diaper") {
                diaper++;
                if (r.subType === "대변" || r.subType === "응가") poop++;
            } else if (r.type === "sleep" && Number(r.amount) > 0) {
                naps++; napMin += Number(r.amount) || 0;
            }
        });
        var parts = [];
        if (feed) {
            var how = [];
            if (ml) how.push("분유 " + ml + "ml");
            if (food) how.push("이유식 " + food + "g");
            if (breast) how.push("모유 " + breast + "번");
            parts.push("맘마 " + feed + "번" + (how.length ? "(" + how.join(", ") + ")" : ""));
        }
        if (diaper) parts.push("기저귀 " + diaper + "번" + (poop ? "(응가 " + poop + ")" : ""));
        if (naps) parts.push("낮잠 " + naps + "번 " + span(napMin));
        return { text: parts.length ? parts.join(" · ") : "남긴 기록이 없어요", feed: feed, diaper: diaper, naps: naps };
    }
    window.sitterSummaryText = function (since, until) { return summarize(since, until).text; };

    /* ==========================================================
       근무 기록 — sitterlog_가족코드 / shifts 한 문서에 모은다
       ========================================================== */

    function logRef() {
        var c = code();
        if (!c || !window.db || typeof window.doc !== "function") return null;
        return window.doc(window.db, "sitterlog_" + c, "shifts");
    }

    async function loadLog() {
        var r = logRef();
        if (!r || typeof window.getDoc !== "function") return [];
        try {
            var snap = await window.getDoc(r);
            var list = snap.exists() ? (snap.data() || {}).list : [];
            return Array.isArray(list) ? list : [];
        } catch (e) { return []; }
    }

    async function saveShift(shift) {
        var r = logRef();
        if (!r || typeof window.setDoc !== "function") return false;
        var list = await loadLog();
        var i = -1;
        for (var k = 0; k < list.length; k++) if (list[k] && list[k].id === shift.id) { i = k; break; }
        if (i > -1) list[i] = shift; else list.unshift(shift);
        list.sort(function (a, b) { return (b.start || 0) - (a.start || 0); });
        try { await window.setDoc(r, { list: list.slice(0, KEEP), at: Date.now() }); return true; }
        catch (e) { console.warn("[돌봄 기록] 저장 실패", e); return false; }
    }

    /* ==========================================================
       도우미 화면 — '오늘 돌봄' 카드
       ========================================================== */

    window.sitterArrive = async function () {
        if (!isPlus()) return upsell();
        var now = Date.now();
        localStorage.setItem(SHIFT_KEY, String(now));
        mountSitterCard();
        toast("👋 " + clock(now) + "에 오셨어요. 오늘도 잘 부탁드려요");
        await saveShift({ id: "shift_" + now + "_" + uid().slice(0, 6), by: uid(), start: now, end: null, summary: "" });
    };

    window.sitterDone = async function () {
        if (!isPlus()) return upsell();
        var start = Number(localStorage.getItem(SHIFT_KEY)) || midnight(Date.now());
        var end = Date.now();
        var s = summarize(start, end);
        var hours = span((end - start) / 60000);

        localStorage.removeItem(SHIFT_KEY);
        mountSitterCard();

        var id = "shift_" + start + "_" + uid().slice(0, 6);
        await saveShift({ id: id, by: uid(), start: start, end: end, summary: s.text });

        var c = code();
        if (c && window.functions && typeof window.httpsCallable === "function") {
            try {
                var send = window.httpsCallable(window.functions, "sendFamilyPush");
                await send({
                    syncCode: c,
                    excludeUid: uid(),
                    excludeToken: (typeof window.myPushToken === "function") ? window.myPushToken() : "",
                    title: "🧡 오늘 돌봄을 마쳤어요",
                    body: clock(start) + "부터 " + hours + " · " + s.text,
                    link: "index.html"
                });
            } catch (e) { console.warn("[돌봄 요약] 알림 실패", e); }
        }
        toast("🌙 고생 많으셨어요. 엄마·아빠에게 오늘 요약을 보냈어요");
    };

    function sitterCardHTML() {
        var start = Number(localStorage.getItem(SHIFT_KEY)) || 0;
        var plus = isPlus();
        var badge = plus ? "" :
            '<span style="margin-left:8px; font-size:11px; font-weight:900; color:' + GOLD + '; background:rgba(185,138,46,0.12); padding:4px 9px; border-radius:9px; vertical-align:middle;">PLUS</span>';

        var body;
        if (!start) {
            body =
                '<div onclick="window.sitterArrive()" style="text-align:center; padding:17px; border-radius:16px; cursor:pointer; ' +
                    'background:#FBF8F3; border:1px solid #EDE6DE; color:#4A413C; font-size:16px; font-weight:900;">👋 왔어요</div>' +
                '<div style="font-size:12px; font-weight:700; color:var(--text-sub); text-align:center; margin-top:10px;">' +
                    '누르면 오신 시각이 남아요</div>';
        } else {
            var s = summarize(start, Date.now());
            body =
                '<div style="font-size:13px; font-weight:800; color:var(--text-m); margin-bottom:4px;">' +
                    clock(start) + '부터 ' + span((Date.now() - start) / 60000) + '째</div>' +
                '<div style="font-size:12.5px; font-weight:700; color:var(--text-sub); line-height:1.6; margin-bottom:14px; word-break:keep-all;">' +
                    esc(s.text) + '</div>' +
                '<div onclick="window.sitterDone()" style="text-align:center; padding:17px; border-radius:16px; cursor:pointer; ' +
                    'background:' + PURPLE + '; color:#FFF; font-size:16px; font-weight:900;">🌙 오늘 다 봤어요</div>' +
                '<div style="font-size:12px; font-weight:700; color:var(--text-sub); text-align:center; margin-top:10px;">' +
                    '누르면 엄마·아빠에게 오늘 요약이 가요</div>';
        }

        return '<div style="font-size:12px; font-weight:800; color:' + GOLD + '; margin-bottom:4px;">엄마·아빠가 오늘 돌봄을 한눈에 봐요</div>' +
            '<h2 style="font-size:19px; font-weight:900; color:var(--text-m); letter-spacing:-0.5px; margin:0 0 14px;">🧡 오늘 돌봄' + badge + '</h2>' +
            body;
    }

    function mountSitterCard() {
        var old = document.getElementById("sitter-shift-card");
        if (!isSitter()) { if (old) old.remove(); return; }
        /* 할머니 · 할아버지께 '왔어요 · 근무 시간' 은 남 취급이다. 시터 선생님(또는 이름이 없는 도우미)에게만 */
        if (typeof window.helperIsFamily === "function" && window.helperIsFamily()) { if (old) old.remove(); return; }

        var btn = document.querySelector('[onclick*="quickSaveSenior(\'sleep_end\')"]');
        var host = btn;
        while (host && host.parentNode && !(host.parentNode.classList && host.parentNode.classList.contains("show-on-senior-block")) &&
               host.parentNode.id !== "tab-home") host = host.parentNode;
        if (!host || !host.parentNode) return;

        var card = old || document.createElement("div");
        if (!old) {
            card.id = "sitter-shift-card";
            card.setAttribute("style", "background:var(--bg-card); border:1px solid var(--border); border-radius:24px; " +
                "padding:22px 20px; margin-bottom:16px; box-shadow:0 4px 12px rgba(0,0,0,0.04);");
            host.parentNode.insertBefore(card, host.nextSibling);
        }
        card.innerHTML = sitterCardHTML();
    }
    window.refreshSitterShift = mountSitterCard;

    /* ==========================================================
       엄마·아빠 설정 탭 — '돌봄 기록' 카드
       ========================================================== */

    async function viewerCount() {
        var c = code();
        if (!c || !window.db || typeof window.getDoc !== "function") return 0;
        try {
            var snap = await window.getDoc(window.doc(window.db, "families", c));
            if (!snap.exists()) return 0;
            var m = (snap.data() || {}).members || {};
            if (Array.isArray(m)) return 0;
            return Object.keys(m).filter(function (k) { return m[k] === "viewer"; }).length;
        } catch (e) { return 0; }
    }

    function totals(list) {
        var now = new Date();
        var monday = new Date(now); monday.setHours(0, 0, 0, 0);
        monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
        var monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        var week = 0, month = 0;
        list.forEach(function (s) {
            if (!s || !s.start || !s.end) return;
            var m = (s.end - s.start) / 60000;
            if (s.start >= monday.getTime()) week += m;
            if (s.start >= monthStart) month += m;
        });
        return { week: week, month: month };
    }

    async function mountParentCard() {
        var host = document.getElementById("tab-settings");
        if (!host || isSitter()) return;

        var list = await loadLog();
        var viewers = await viewerCount();
        var old = document.getElementById("sitter-log-card");
        if (!list.length && !viewers) { if (old) old.remove(); return; }     // 도우미가 없는 집엔 안 띄운다

        var plus = isPlus();
        var t = totals(list);
        var rows = list.slice(0, 6).map(function (s) {
            var live = !s.end;
            return '<div style="padding:11px 0; border-top:1px solid var(--border);">' +
                '<div style="display:flex; justify-content:space-between; font-size:13px; font-weight:800; color:var(--text-m);">' +
                    '<span>' + dayLabel(s.start) + ' ' + clock(s.start) + '–' + (live ? '지금' : clock(s.end)) + '</span>' +
                    '<span style="color:' + (live ? PURPLE : 'var(--text-sub)') + ';">' + (live ? '돌보는 중' : span((s.end - s.start) / 60000)) + '</span>' +
                '</div>' +
                (s.summary ? '<div style="font-size:12px; font-weight:700; color:var(--text-sub); margin-top:3px; word-break:keep-all;">' + esc(s.summary) + '</div>' : '') +
            '</div>';
        }).join("");

        var inner =
            '<div style="display:flex; align-items:center; gap:10px; margin-bottom:6px;">' +
                '<span style="font-size:19px;">🧡</span>' +
                '<span style="font-size:15px; font-weight:900; color:var(--text-m);">돌봄 기록</span>' +
                (plus ? '' : '<span style="margin-left:auto; font-size:11px; font-weight:900; color:' + GOLD + '; background:rgba(185,138,46,0.12); padding:5px 10px; border-radius:9px;">PLUS</span>') +
            '</div>' +
            '<div style="font-size:12.5px; font-weight:700; color:var(--text-sub); line-height:1.6; margin-bottom:10px; word-break:keep-all;">' +
                '도우미가 \'왔어요\' · \'오늘 다 봤어요\'를 누른 기록이에요</div>';

        if (!plus) {
            inner += '<div onclick="window.openPlus && window.openPlus(\'sitter\')" style="text-align:center; padding:13px; border-radius:12px; cursor:pointer; ' +
                'background:var(--bg-sub); font-size:13px; font-weight:800; color:var(--text-m);">PLUS에서 근무 시간과 오늘 요약을 볼 수 있어요 ›</div>';
        } else if (!list.length) {
            inner += '<div style="font-size:12.5px; font-weight:700; color:var(--text-sub); line-height:1.7;">아직 기록이 없어요. 도우미 화면에서 \'왔어요\'를 누르면 여기에 쌓여요.</div>';
        } else {
            inner += '<div style="display:flex; gap:8px; margin-bottom:6px;">' +
                    '<div style="flex:1; background:var(--bg-sub); border-radius:12px; padding:11px 12px;">' +
                        '<div style="font-size:11px; font-weight:800; color:var(--text-sub);">이번 주</div>' +
                        '<div style="font-size:16px; font-weight:900; color:var(--text-m); margin-top:2px;">' + span(t.week) + '</div></div>' +
                    '<div style="flex:1; background:var(--bg-sub); border-radius:12px; padding:11px 12px;">' +
                        '<div style="font-size:11px; font-weight:800; color:var(--text-sub);">이번 달</div>' +
                        '<div style="font-size:16px; font-weight:900; color:var(--text-m); margin-top:2px;">' + span(t.month) + '</div></div>' +
                '</div>' + rows;
        }

        var card = old || document.createElement("div");
        if (!old) {
            card.id = "sitter-log-card";
            card.setAttribute("style", "background:var(--bg-card); padding:18px 20px; border-radius:16px; border:1px solid var(--border); " +
                "margin-bottom:10px; box-sizing:border-box; width:100%;");
            var after = document.getElementById("parent-phone-card");
            if (after && after.parentNode) after.parentNode.insertBefore(card, after.nextSibling);
            else host.appendChild(card);
        }
        card.innerHTML = inner;
    }
    window.refreshSitterLog = mountParentCard;

    /* ==========================================================
       도우미는 1명까지 무료 — 새로 초대할 때만 막는다
       ========================================================== */

    async function blockedInvite(role) {
        if (role !== "viewer" || isPlus()) return false;
        if (await viewerCount() < 1) return false;
        toast("도우미 2명부터는 PLUS예요. 지금 연결된 도우미는 그대로 쓸 수 있어요");
        upsell();
        return true;
    }

    function wrapInvite(name) {
        var orig = window[name];
        if (typeof orig !== "function" || orig.__sitterplus) return false;
        var w = async function (role) {
            if (await blockedInvite(role)) return;
            return orig.apply(this, arguments);
        };
        w.__sitterplus = true;
        window[name] = w;
        return true;
    }

    /* ---------- 시작 ---------- */

    function boot() {
        var n = 0;
        var t = setInterval(function () {
            var a = wrapInvite("openFamilyInvite"), b = wrapInvite("sendKakaoInvite");
            if ((a || (window.openFamilyInvite && window.openFamilyInvite.__sitterplus)) &&
                (b || (window.sendKakaoInvite && window.sendKakaoInvite.__sitterplus))) clearInterval(t);
            if (++n > 40) clearInterval(t);
        }, 250);

        (function hookSettings() {
            var origin = window.renderSettingsTab;
            window.renderSettingsTab = function () {
                var out;
                if (typeof origin === "function") out = origin.apply(this, arguments);
                setTimeout(mountParentCard, 120);
                return out;
            };
        })();

        setTimeout(mountSitterCard, 1500);
        setTimeout(mountSitterCard, 4000);
        setInterval(mountSitterCard, 60000);         // '몇 시간째' 가 흘러가게
        document.addEventListener("visibilitychange", function () {
            if (!document.hidden) setTimeout(mountSitterCard, 400);
        });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    /* ---------- 점검용 ---------- */
    window.sitterPlusDebug = async function () {
        console.log("도우미 폰인가:", isSitter(), "· PLUS:", isPlus());
        console.log("근무 시작:", localStorage.getItem(SHIFT_KEY) ? clock(Number(localStorage.getItem(SHIFT_KEY))) : "없음");
        console.log("오늘 요약:", summarize(midnight(Date.now())).text);
        console.log("연결된 도우미:", await viewerCount() + "명");
        var list = await loadLog();
        console.log("근무 기록:", list.length + "개", totals(list));
    };
})();