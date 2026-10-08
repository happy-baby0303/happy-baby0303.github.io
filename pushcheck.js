/* ============================================================
   배냇함 — 알림 점검 (pushcheck.js)

   "알림이 안 와요" 만으로는 어디가 끊겼는지 알 수 없다.
   알림 하나가 폰에 뜨기까지는 이만큼을 거친다.

     ① 이 폰에서 알림 허용        (폰 · 크롬 설정)
     ② 알림 받을 준비             (서비스워커)
     ③ 로그인                     (파이어베이스)
     ④ 이 폰 등록                 (알림 주소 = 토큰)
     ⑤ 서버에 이 폰 저장          (users 문서의 fcm_tokens)
     ⑥ 가족 연결                  (families 명단 · 다른 가족 폰)
     ⑦ 알림 장부                  (reminders — 육퇴 시각 · 다음 수유 · 기저귀 시각)
     ⑧ 서버 정기 작업              (bedtimeReminder · careReminder 가 도는지)

   설정의 '알림이 안 오나요?' 를 누르면 차례로 보고, 끊긴 곳에서 바로 고칠 수 있게 한다.
   서버 쪽(⑤~⑧)은 functions 의 pushCheck 가 본 그대로를 받아 온다.
   결과는 글로 복사할 수 있다 — 그대로 보내 주면 어디가 문제인지 바로 안다.

   설정 '알림 · 가족 · 보관' 묶음에 카드 두 장을 더한다.
     · 수유 · 기저귀 알림 (텀 설정은 기록하기 옆 톱니에만 있어서 못 찾았다)
     · 알림이 안 오나요? 점검해 보기

   index.html 에서 carealarm.js 다음, settingscards.js 앞에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var INK = "#4A413C", SUB = "#7A6F68", PURPLE = "#7F77DD";
    var OK = "#5B9A6E", WARN = "#C08A2E", BAD = "#C9574B", WAIT = "#B5AAA0";

    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }
    function toast(m) { if (typeof window.showToast === "function") window.showToast(m); }
    function code() { return (typeof window.getSyncCode === "function" && window.getSyncCode()) || localStorage.getItem("family_sync_code") || ""; }
    function perm() { return ("Notification" in window) ? Notification.permission : "unsupported"; }
    function every(key) { var v = parseInt(localStorage.getItem(key), 10); return isNaN(v) ? 180 : v; }
    function hm(m) { var h = Math.floor(m / 60), mm = m % 60; return h ? (h + "시간" + (mm ? " " + mm + "분" : "")) : (mm + "분"); }
    function kTime(ts) {
        var d = new Date(ts), h = d.getHours(), m = d.getMinutes(), hh = h % 12 === 0 ? 12 : h % 12;
        return (h < 12 ? "오전 " : "오후 ") + hh + "시" + (m ? " " + m + "분" : "");
    }
    function bucketTime(b) { return /^\d\d:\d\d$/.test(b || "") ? kTime(new Date().setHours(Number(b.slice(0, 2)), Number(b.slice(3, 5)), 0, 0)) : (b || ""); }
    function md(key) { var p = String(key || "").split("-"); return p.length === 3 ? Number(p[1]) + "월 " + Number(p[2]) + "일" : ""; }
    function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

    var ua = navigator.userAgent || "";
    var isIOS = /iPad|iPhone|iPod/.test(ua) || (ua.indexOf("Mac") > -1 && "ontouchend" in document);
    var standalone = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
                     document.referrer.indexOf("android-app://") === 0;

    /* 알림이 꺼져 있을 때 켜는 곳 — 어디서 열었는지에 따라 다르다 */
    function deniedHelp() {
        if (isIOS) return "아이폰 설정 → 알림 → 배냇함에서 알림 허용을 켜 주세요.";
        if (standalone) return "폰 설정 → 애플리케이션 → 배냇함 → 알림을 켜 주세요. 배냇함이 목록에 없으면 크롬 → 사이트 설정 → 알림에서 배냇함을 허용해 주세요.";
        return "크롬 주소창 왼쪽 아이콘 → 권한(사이트 설정) → 알림을 허용으로 바꿔 주세요.";
    }

    /* ---------- 설정 카드 ---------- */

    var CARD = "display:flex; align-items:center; gap:14px; background:var(--bg-card); padding:18px 20px; border-radius:16px; " +
               "border:1px solid var(--border); margin-bottom:12px; box-sizing:border-box; width:100%; cursor:pointer;";

    function careCardHTML() {
        var f = every("tosil_feed_interval"), d = every("tosil_diaper_interval");
        var on = f > 0 || d > 0;
        var p = perm();
        var line;
        if (!on) line = '지금은 꺼져 있어요';
        else if (p !== "granted") line = '<span style="color:' + WARN + '; font-weight:800;">이 폰 알림이 꺼져 있어요 · 눌러서 켜기</span>';
        else line = esc([f ? "수유 " + hm(f) : "", d ? "기저귀 " + hm(d) : ""].filter(Boolean).join(" · ")) +
                    '마다 알려드려요  <span style="color:' + PURPLE + '; font-weight:800;">바꾸기 ›</span>';
        return '<div style="font-size:22px;">🍼</div>' +
            '<div style="flex:1; min-width:0;">' +
                '<div style="font-size:15px; font-weight:900; color:var(--text-m);">수유 · 기저귀 알림</div>' +
                '<div style="font-size:12px; font-weight:600; color:var(--text-sub); margin-top:2px; word-break:keep-all;">' + line + '</div>' +
            '</div>';
    }

    function checkCardHTML() {
        return '<div style="flex:1; min-width:0;">' +
                '<div style="font-size:14px; font-weight:800; color:var(--text-m);">알림이 안 오나요?</div>' +
                '<div style="font-size:12px; font-weight:600; color:var(--text-sub); margin-top:2px;">어디가 끊겼는지 차례로 볼게요</div>' +
            '</div>' +
            '<div style="font-size:13px; font-weight:800; color:' + PURPLE + '; flex-shrink:0;">점검하기 ›</div>';
    }

    async function onCareCard() {
        var f = every("tosil_feed_interval"), d = every("tosil_diaper_interval");
        if ((f > 0 || d > 0) && perm() === "default" && typeof window.requestPushPermission === "function") {
            var ok = await window.requestPushPermission();
            redraw();
            if (!ok) return toast("알림을 허용해야 폰으로 알려드릴 수 있어요");
            if (typeof window.refreshCareAlarm === "function") window.refreshCareAlarm(true);
            return toast("이제 수유 · 기저귀 시간에 알려드릴게요");
        }
        if ((f > 0 || d > 0) && perm() === "denied") return window.openPushCheck();
        if (typeof window.openTrackerSettings === "function") window.openTrackerSettings();
    }

    function redraw() {
        var a = document.getElementById("care-alarm-card");
        if (a) a.innerHTML = careCardHTML();
    }
    window.redrawCareAlarmCard = redraw;

    (function mount() {
        var _origin = window.renderSettingsTab;
        window.renderSettingsTab = function () {
            var out;
            if (typeof _origin === "function") out = _origin.apply(this, arguments);
            var container = document.getElementById("tab-settings");
            if (!container) return out;
            if (!document.getElementById("care-alarm-card")) {
                var a = document.createElement("div");
                a.id = "care-alarm-card";
                a.className = "bnh-settings-card";
                a.style.cssText = CARD;
                a.innerHTML = careCardHTML();
                a.onclick = onCareCard;
                container.appendChild(a);
            } else redraw();
            if (!document.getElementById("pushcheck-card")) {
                var b = document.createElement("div");
                b.id = "pushcheck-card";
                b.className = "bnh-settings-card";
                b.style.cssText = CARD.replace("padding:18px 20px", "padding:15px 20px") + " background:var(--bg-sub); border-style:dashed;";
                b.innerHTML = checkCardHTML();
                b.onclick = function () { window.openPushCheck(); };
                container.appendChild(b);
            }
            return out;
        };
    })();

    /* 알림 텀을 저장하면 카드 글도 바로 바뀌게.
       ⚠️ 텀을 정해도 이 폰이 알림 허용을 안 했으면 아무것도 안 왔다. 저장 버튼을 누른 그 순간에 허용을 묻는다. */
    var _save = window.saveTrackerSettings;
    if (typeof _save === "function") {
        window.saveTrackerSettings = function () {
            var out = _save.apply(this, arguments);
            var f = every("tosil_feed_interval"), d = every("tosil_diaper_interval");
            if ((f > 0 || d > 0) && perm() === "default" && typeof window.requestPushPermission === "function") {
                window.requestPushPermission().then(function (ok) {
                    redraw();
                    if (ok && typeof window.refreshCareAlarm === "function") window.refreshCareAlarm(true);
                });
            }
            setTimeout(redraw, 50);
            return out;
        };
    }

    /* ---------- 점검 시트 ---------- */

    var ROWS = [
        ["perm", "이 폰의 알림 허용"],
        ["sw", "알림 받을 준비"],
        ["auth", "로그인"],
        ["token", "이 폰 등록"],
        ["server", "서버에 이 폰 저장"],
        ["family", "가족 연결"],
        ["bed", "육퇴 알림"],
        ["care", "수유 · 기저귀 알림"]
    ];
    var state = {};       // id → { s: ok|warn|bad|wait|off, d: 설명, a: [버튼 글, 함수 이름] }
    var running = false, lastToken = "", lastServer = null;

    function set(id, s, d, a) { state[id] = { s: s, d: d || "", a: a || null }; paint(); }

    function mark(s) {
        var c = s === "ok" ? OK : s === "warn" ? WARN : s === "bad" ? BAD : WAIT;
        var t = s === "ok" ? "✓" : s === "warn" ? "!" : s === "bad" ? "✕" : (s === "off" ? "–" : "·");
        return '<div style="width:22px; height:22px; border-radius:50%; flex-shrink:0; margin-top:1px; display:flex; align-items:center; justify-content:center; ' +
               'background:' + (s === "wait" || s === "off" ? "var(--bg-sub)" : c) + '; color:' + (s === "wait" || s === "off" ? WAIT : "#FFF") + '; font-size:12px; font-weight:900;">' + t + '</div>';
    }

    function paint() {
        var list = document.getElementById("pc-list");
        if (!list) return;
        list.innerHTML = ROWS.map(function (r) {
            var x = state[r[0]] || { s: "wait", d: "" };
            return '<div style="display:flex; gap:12px; padding:13px 0; border-bottom:1px solid var(--border);">' +
                mark(x.s) +
                '<div style="flex:1; min-width:0;">' +
                    '<div style="font-size:14px; font-weight:800; color:var(--text-m);">' + esc(r[1]) + '</div>' +
                    (x.d ? '<div style="font-size:12.5px; font-weight:600; color:var(--text-sub); margin-top:3px; line-height:1.55; word-break:keep-all;">' + esc(x.d) + '</div>' : '') +
                    (x.a ? '<div onclick="window.__pcAct(\'' + x.a[1] + '\')" style="display:inline-block; margin-top:8px; padding:7px 12px; border-radius:10px; background:rgba(127,119,221,0.1); color:' + PURPLE + '; font-size:12.5px; font-weight:800; cursor:pointer;">' + esc(x.a[0]) + '</div>' : '') +
                '</div>' +
            '</div>';
        }).join("");
    }

    function sheet() {
        var old = document.getElementById("pushcheck-sheet");
        if (old) old.remove();
        var w = document.createElement("div");
        w.id = "pushcheck-sheet";
        w.setAttribute("style", "position:fixed; inset:0; z-index:100004; background:rgba(43,36,30,0.5); display:flex; align-items:flex-end; justify-content:center;");
        w.onclick = function (e) { if (e.target === w) w.remove(); };
        w.innerHTML =
            '<div style="width:100%; max-width:480px; max-height:88vh; overflow-y:auto; background:var(--bg-card); border-radius:24px 24px 0 0; ' +
                'padding:22px 20px calc(24px + env(safe-area-inset-bottom, 0px)); box-sizing:border-box;">' +
                '<div style="display:flex; justify-content:space-between; align-items:center;">' +
                    '<div style="font-size:18px; font-weight:900; color:var(--text-m);">알림 점검</div>' +
                    '<div onclick="document.getElementById(\'pushcheck-sheet\').remove()" style="font-size:24px; font-weight:300; color:var(--text-sub); cursor:pointer; line-height:1; padding:0 0 6px 12px;">×</div>' +
                '</div>' +
                '<div style="font-size:12.5px; font-weight:600; color:var(--text-sub); margin:4px 0 6px; line-height:1.6;">알림이 폰에 뜨기까지 거치는 곳을 차례로 봐요.</div>' +
                '<div id="pc-list"></div>' +
                '<div id="pc-test" onclick="window.__pcAct(\'test\')" style="margin-top:18px; text-align:center; padding:15px; border-radius:14px; background:' + INK + '; color:#FFF; font-size:15px; font-weight:900; cursor:pointer;">이 폰으로 시험 알림 보내기</div>' +
                '<div id="pc-test-msg" style="font-size:12.5px; font-weight:600; color:var(--text-sub); text-align:center; margin-top:10px; line-height:1.6; word-break:keep-all;"></div>' +
                '<div style="display:flex; gap:8px; margin-top:12px;">' +
                    '<div onclick="window.__pcAct(\'rerun\')" style="flex:1; text-align:center; padding:13px; border-radius:13px; background:var(--bg-sub); color:var(--text-m); font-size:13.5px; font-weight:800; cursor:pointer;">다시 점검</div>' +
                    '<div onclick="window.__pcAct(\'copy\')" style="flex:1; text-align:center; padding:13px; border-radius:13px; background:var(--bg-sub); color:var(--text-m); font-size:13.5px; font-weight:800; cursor:pointer;">결과 복사하기</div>' +
                '</div>' +
            '</div>';
        document.body.appendChild(w);
    }

    window.openPushCheck = function () {
        state = {};
        sheet();
        paint();
        run();
    };

    async function waitAuth(ms) {
        var t = Date.now();
        while (Date.now() - t < ms) {
            if (window.auth && window.auth.currentUser) return window.auth.currentUser;
            await sleep(250);
        }
        return (window.auth && window.auth.currentUser) || null;
    }

    async function callCheck(extra) {
        if (!window.functions || typeof window.httpsCallable !== "function") throw { code: "no-functions" };
        var body = { syncCode: code(), token: lastToken || "" };
        Object.keys(extra || {}).forEach(function (k) { body[k] = extra[k]; });
        var r = await window.httpsCallable(window.functions, "pushCheck")(body);
        return (r && r.data) || {};
    }

    function serverErr(e) {
        var c = String((e && (e.code || e.message)) || e || "");
        if (c === "no-functions") return "서버 연결이 아직 준비되지 않았어요. 잠시 뒤 '다시 점검' 을 눌러 주세요.";
        if (/not-found|NOT_FOUND/i.test(c)) return "서버에 알림 점검 기능이 아직 없어요. 새 functions 를 배포하면 볼 수 있어요.";
        if (/unauthenticated/i.test(c)) return "로그인이 풀려 있어요. 앱을 다시 열어 주세요.";
        if (/unavailable|network|internal|deadline/i.test(c)) return "서버에 닿지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.";
        return "서버에서 오류가 났어요 (" + c.slice(0, 60) + ")";
    }

    async function run() {
        if (running) return;
        running = true;
        try {
            /* ① 허용 */
            var p = perm();
            if (p === "granted") set("perm", "ok", "허용돼 있어요");
            else if (p === "default") set("perm", "warn", "아직 허용하지 않았어요. 허용해야 이 폰으로 알림이 와요.", ["알림 허용하기", "allow"]);
            else if (p === "denied") set("perm", "bad", "꺼져 있어요. " + deniedHelp());
            else set("perm", "bad", isIOS ? "홈 화면에 추가한 배냇함 아이콘으로 열어야 알림을 받을 수 있어요." : "이 브라우저는 알림을 받을 수 없어요.");

            /* ② 서비스워커 */
            var reg = null;
            try { reg = navigator.serviceWorker ? await navigator.serviceWorker.getRegistration() : null; } catch (e) {}
            if (reg && reg.active) set("sw", "ok", "준비돼 있어요");
            else set("sw", "bad", "알림 받을 준비가 안 됐어요. 앱을 완전히 닫았다가 다시 열어 주세요.");

            /* ③ 로그인 */
            set("auth", "wait", "확인하는 중…");
            var user = await waitAuth(4000);
            if (user) set("auth", "ok", "로그인돼 있어요");
            else set("auth", "bad", "로그인이 아직 안 잡혔어요. 잠시 뒤 '다시 점검' 을 눌러 주세요.");

            /* ④ 토큰 */
            lastToken = "";
            if (p !== "granted") set("token", "off", "알림을 허용하면 이어서 볼게요");
            else if (typeof window.getPushToken !== "function") set("token", "bad", "앱을 새로 고친 뒤 다시 점검해 주세요.");
            else {
                set("token", "wait", "등록하는 중…");
                var t = await window.getPushToken();
                if (t && t.token) { lastToken = t.token; set("token", "ok", "등록돼 있어요 (끝자리 " + t.token.slice(-4) + ")"); }
                else set("token", "bad", /permission/.test(String(t && t.error)) ? "알림 허용이 필요해요"
                    : "구글 알림 서버에 등록하지 못했어요. 인터넷을 확인하고 다시 눌러 주세요. (" + String(t && t.error || "").slice(0, 40) + ")");
            }

            /* ⑤~⑧ 서버 */
            lastServer = null;
            if (!user) {
                ["server", "family", "bed", "care"].forEach(function (id) { set(id, "off", "로그인이 되면 이어서 볼게요"); });
                return;
            }
            set("server", "wait", "서버에 물어보는 중…");
            var s;
            try { s = await callCheck(); }
            catch (e) {
                var msg = serverErr(e);
                set("server", "bad", msg);
                ["family", "bed", "care"].forEach(function (id) { set(id, "off", "서버 점검이 되면 이어서 볼게요"); });
                return;
            }
            if (!s.ok) {
                set("server", "bad", s.error || "서버에서 점검하지 못했어요");
                ["family", "bed", "care"].forEach(function (id) { set(id, "off", ""); });
                return;
            }
            lastServer = s;

            if (!lastToken) set("server", s.myTokens ? "warn" : "bad", s.myTokens ? "다른 기기는 저장돼 있어요. 이 폰은 알림을 허용하면 저장돼요." : "저장된 기기가 없어요. 이 폰에서 알림을 허용해 주세요.");
            else if (s.tokenRepaired) set("server", "ok", "빠져 있어서 방금 다시 넣었어요. 이제 이 폰으로 알림이 갈 거예요.");
            else set("server", "ok", "저장돼 있어요" + (s.myTokens > 1 ? " · 이 계정 기기 " + s.myTokens + "대" : ""));

            if (!code()) set("family", "bad", "가족 코드가 없어요. 앱을 다시 열면 만들어져요.");
            else if (s.family === false) set("family", "bad", "가족방을 서버에서 찾지 못했어요. 설정 → 가족 연결을 다시 해 주세요.");
            else if (s.member === false) set("family", "bad", "이 계정이 가족방 명단에 없어요. 초대 코드로 다시 연결해 주세요.");
            else if ((s.members || 1) > 1 && !s.otherTokens) set("family", "warn", "가족 " + s.members + "명 · 다른 가족 폰이 아직 알림을 켜지 않았어요. 그 폰에서도 이 점검을 한 번 눌러 주세요.");
            else set("family", "ok", (s.members || 1) > 1 ? "가족 " + s.members + "명 · 다른 가족 폰 " + (s.otherTokens || 0) + "대" : "혼자 쓰는 중이에요");

            /* 육퇴 */
            var b = s.bedtime;
            if (!s.reminders || !b) set("bed", "warn", "서버에 육퇴 알림이 아직 적히지 않았어요.", ["다시 적기", "bedsync"]);
            else if (!b.enabled) set("bed", "off", "꺼져 있어요", ["켜기", "bedon"]);
            else if (b.snoozeUntil) set("bed", "warn", "알림을 며칠 흘려보내서 " + md(b.snoozeUntil) + "까지 쉬는 중이에요.", ["지금 다시 켜기", "bedwake"]);
            else if (b.stuck) set("bed", "bad", "오늘 " + bucketTime(b.bucket) + "에 갔어야 하는데 아직 안 갔어요. 서버 정기 작업(bedtimeReminder)이 멈춘 것 같아요.");
            else set("bed", "ok", "매일 " + bucketTime(b.bucket) +
                     "쯤 · 그날 사진을 담았으면 안 보내요" + (b.lastSentAt ? " · 마지막으로 보낸 날 " + md(b.lastSentAt) : ""));

            /* 수유 · 기저귀 */
            var f = every("tosil_feed_interval"), d = every("tosil_diaper_interval");
            var key = window.currentBabySuffix || "main";
            var c = (s.care || []).filter(function (x) { return x.key === key; })[0];
            var now = Date.now();
            if (!f && !d) set("care", "off", "꺼져 있어요", ["켜기", "careset"]);
            else if (!c) set("care", "warn", "서버에 다음 알림 시각이 아직 적히지 않았어요.", ["다시 적기", "caresync"]);
            else if (s.careStuck) set("care", "bad", "알림 시각이 15분 넘게 지났는데 서버가 보내지 않았어요. 서버 정기 작업(careReminder)이 멈춘 것 같아요.");
            else {
                var bits = [];
                if (f && c.feedAt) bits.push((c.feedAt > now ? "다음 수유 알림 " : "수유 알림 ") + kTime(c.feedAt) + (c.feedAt <= now ? (c.feedPushed === c.feedAt ? " 보냄" : "") : ""));
                if (d && c.diaperAt) bits.push((c.diaperAt > now ? "기저귀 " : "기저귀 알림 ") + kTime(c.diaperAt) + (c.diaperAt <= now ? (c.diaperPushed === c.diaperAt ? " 보냄" : "") : ""));
                set("care", "ok", bits.length ? bits.join(" · ") : "기록을 하나 남기면 다음 알림 시각이 잡혀요");
            }
        } finally {
            running = false;
        }
    }

    async function test() {
        var msg = document.getElementById("pc-test-msg");
        var btn = document.getElementById("pc-test");
        var say = function (m) { if (msg) msg.textContent = m; };
        if (perm() !== "granted") return say("먼저 이 폰에서 알림을 허용해 주세요.");
        if (!lastToken && typeof window.getPushToken === "function") {
            var t = await window.getPushToken();
            if (t && t.token) lastToken = t.token;
        }
        if (!lastToken) return say("이 폰 등록이 안 돼서 보낼 수 없어요. 위에서 끊긴 곳을 먼저 확인해 주세요.");
        if (btn) btn.style.opacity = "0.5";
        /* 앱을 보고 있으면 알림 대신 화면 위에 작게 뜬다. 진짜 알림을 보려면 잠깐 나가 있어야 한다. */
        for (var i = 5; i > 0; i--) { say(i + "초 뒤에 보내요. 지금 홈 화면으로 나가서 기다려 보세요."); await sleep(1000); }
        try {
            var r = await callCheck({ send: true });
            if (r.sent) say("보냈어요. 몇 초 안에 알림이 떠야 해요. 안 뜨면 폰 설정 → 애플리케이션 → 배냇함 → 알림이 켜져 있는지 봐 주세요.");
            else say(r.tokenDead ? "이 폰 등록이 만료돼 있었어요. '다시 점검' 을 누르면 새로 등록돼요." : "보내지 못했어요 (" + (r.sendError || r.error || "알 수 없음") + ")");
        } catch (e) {
            say(serverErr(e));
        } finally {
            if (btn) btn.style.opacity = "1";
        }
    }

    function summary() {
        var d = new Date();
        var lines = ["배냇함 알림 점검 · " + (d.getMonth() + 1) + "/" + d.getDate() + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"),
                     (isIOS ? "아이폰" : "안드로이드") + (standalone ? " · 앱으로 실행" : " · 브라우저")];
        ROWS.forEach(function (r) {
            var x = state[r[0]] || { s: "wait", d: "" };
            var t = x.s === "ok" ? "✓" : x.s === "warn" ? "!" : x.s === "bad" ? "✕" : "-";
            lines.push(t + " " + r[1] + ": " + x.d);
        });
        var m = document.getElementById("pc-test-msg");
        if (m && m.textContent) lines.push("시험 알림: " + m.textContent);
        return lines.join("\n");
    }

    window.__pcAct = async function (what) {
        var c = code();
        if (what === "rerun") return run();
        if (what === "test") return test();
        if (what === "copy") {
            var text = summary();
            try { await navigator.clipboard.writeText(text); toast("결과를 복사했어요. 그대로 보내 주세요"); }
            catch (e) { window.prompt("아래 글을 길게 눌러 복사해 주세요", text); }
            return;
        }
        if (what === "allow") {
            if (typeof window.requestPushPermission === "function") await window.requestPushPermission();
            redraw();
            return run();
        }
        if (what === "bedsync" && typeof window.syncBedtimeReminder === "function") { await window.syncBedtimeReminder(true, "time"); return run(); }
        if (what === "bedon" && typeof window.setBedtimeReminder === "function") { await window.setBedtimeReminder(true); return run(); }
        if (what === "bedwake" && c && window.db && typeof window.setDoc === "function") {
            try {
                await window.setDoc(window.doc(window.db, "reminders", c), { snoozeUntil: null, missStreak: 0, openedAt: Date.now() }, { merge: true });
                toast("육퇴 알림을 다시 켰어요");
            } catch (e) { toast("다시 켜지 못했어요. 잠시 뒤 다시 눌러 주세요"); }
            return run();
        }
        if (what === "caresync" && typeof window.refreshCareAlarm === "function") { window.refreshCareAlarm(true); await sleep(1500); return run(); }
        if (what === "careset" && typeof window.openTrackerSettings === "function") {
            var s = document.getElementById("pushcheck-sheet"); if (s) s.remove();
            return window.openTrackerSettings();
        }
    };

    /* ---------- 점검용 ---------- */
    window.pushCheckText = summary;
})();
