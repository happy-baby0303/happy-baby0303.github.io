/* ============================================================
   배냇함 — 수유 · 기저귀 · 졸릴 때 알림 (carealarm.js)

   이 파일이 하는 일
     1. 마지막 수유 · 기저귀 기록과 텀으로 '다음 알림 시각' 을 잡는다
        졸릴 때는 sleepwindow.js 의 짐작(window.sleepyGuess)으로 — 다시 졸려할 때 10분 전
     2. 그 시각을 가족 서버 문서(reminders/가족코드)에 적어 둔다
        → 앱이 닫혀 있어도 서버(functions 의 careReminder)가 5분마다 보고 가족 폰으로 보낸다
     3. 앱을 보고 있을 때 시각이 되면 화면 위에 작게 알려 준다

   ⚠️ 예전엔 1분마다 도는 확인에서만 서버에 적었다.
      새벽에 수유를 적고 바로 앱을 닫으면(제일 흔한 경우) 1분이 안 돼서
      다음 알림 시각이 서버에 안 올라갔고, 그 알림은 오지 않았다.
      이제 기록을 저장하는 그 순간 적는다.
   ⚠️ 엄마 폰과 아빠 폰이 한 문서를 같이 쓴다.
      짝꿍 기록을 아직 못 받은 폰이 옛 시각으로 덮어써서, 최신 알림이 사라졌다.
      어느 기록으로 잡은 시각인지(feedFrom) 같이 적고, 서버가 더 새 기록을 알면 덮지 않는다.
   ⚠️ 알림 텀을 0 으로 두면 '이 폰은' 그 알림을 끈다.
      예전엔 0 이 가족 문서의 시각을 지워서 짝꿍 폰 알림까지 꺼졌고,
      거꾸로 짝꿍 폰이 시각을 올리면 끈 사람 폰도 울렸다. 이제 mute.{내 uid} 로 나만 뺀다.
   ⚠️ '밖에 있어요' 인 폰은 서버가 알림을 빼고 보낸다 (duty.js 가 away 를 적는다).
   ⚠️ 서버가 폰 알림을 보내는 집에서는 이 폰이 따로 폰 알림을 띄우지 않는다.
      둘 다 띄우면 같은 알림이 몇 분 차이로 두 번 울렸다.
      서버에 이 폰이 등록되지 않았을 때(알림 주소가 없을 때)만 앱이 직접 띄운다.

   😪 졸릴 때 알림
     · 한 번 깬 것마다 한 번만. 서버가 sleepyPushed 에 그 깬 시각을 남긴다
     · 잠들면(수면 타이머 · 잠 기록) 장부의 sleepyAt 을 0 으로 지운다.
       sleepyFrom 에는 잠든 시각을 적는다 — 아직 옛 기록을 가진 짝꿍 폰이
       '9시 50분에 깼으니 12시 20분에 알려 줘' 를 다시 적지 못하게 (더 옛 시각은 덮지 않는다)
     · 이 폰이 꺼 뒀어도 장부엔 적는다. 기록을 남긴 폰이 이 폰뿐일 수 있다.
       끈 사람은 서버가 mute.{uid}.sleepy 로 뺀다
     · 서버도 보내기 직전에 기록을 한 번 더 본다 (깬 뒤 다시 잠든 기록이 있으면 안 보낸다)

   문구는 서버 careWords() · sleepyWords() 와 같은 표다. 고치면 둘 다 고친다.
   index.html 에서 remind.js 다음에 로드하세요. (sleepwindow.js 보다 뒤)
   ============================================================ */
(function () {
    'use strict';

    var SENT_KEY = "tosil_carealarm_sent";     // { "main:feed": 기록 시각 } — 이 기록으로는 이미 알렸다
    var UP_KEY   = "tosil_carealarm_up";       // 마지막으로 서버에 적은 값
    var LATE_MAX = 6 * 3600000;                // 이보다 오래 지난 건 알리지 않는다 (기록을 안 한 것일 수 있다)
    var SLEEPY_KEY = "tosil_sleepy_push";      // 'off' 면 이 폰은 졸릴 때 알림을 안 받는다 (처음엔 켜져 있다)
    var SLEEPY_BEFORE = 10;                    // 다시 졸려할 때보다 몇 분 먼저 (분)
    var SLEEPY_LATE = 15 * 60000;              // 이보다 늦었으면 알리지 않는다 (서버와 같다)

    function babyName() { return localStorage.getItem("tosil_babyName") || "우리 아기"; }
    function babyKey() { return window.currentBabySuffix || "main"; }
    function recs() { try { return JSON.parse(localStorage.getItem("tosil_tracker_records")) || []; } catch (e) { return []; } }
    function every(key) { var v = parseInt(localStorage.getItem(key), 10); return isNaN(v) ? 180 : Math.max(0, v); }   // 분 · 0 = 끔
    function myUid() { return (window.auth && window.auth.currentUser && window.auth.currentUser.uid) || localStorage.getItem("firebase_uid") || ""; }
    function isAway() { return localStorage.getItem("tosil_where") === "away" && localStorage.getItem("user_role") !== "senior"; }
    function serverPushes() { return !!(localStorage.getItem("fcm_token") && localStorage.getItem("family_sync_code")); }
    function sleepyOn() { return localStorage.getItem(SLEEPY_KEY) !== "off"; }
    window.sleepyPushOn = sleepyOn;

    function latest(type) {
        var best = null;
        recs().forEach(function (r) {
            if (!r || r.type !== type) return;
            if (type === "feed" && r.subType === "이유식") return;   // 수유 텀은 모유 · 분유 · 유축으로만
            var t = Number(r.timestamp);
            if (t && t <= Date.now() + 5 * 60000 && (!best || t > Number(best.timestamp))) best = r;
        });
        return best;
    }

    function hm(m) {
        var h = Math.floor(m / 60), mm = m % 60;
        return h ? (h + "시간" + (mm ? " " + mm + "분" : "")) : (mm + "분");
    }

    /* 졸릴 때 — 자는 중이면 '지우기', 짐작이 있으면 그 10분 전, 아니면 손대지 않는다 (null) */
    function sleepyPlan() {
        var slept = Number(localStorage.getItem("tosil_sleep_start")) || 0;
        if (slept) return { cancel: true, from: slept };
        var g = (typeof window.sleepyGuess === "function") ? window.sleepyGuess() : null;
        if (!g || !g.at || !g.wake) return null;
        var at = g.at - SLEEPY_BEFORE * 60000;
        if (Date.now() - at > SLEEPY_LATE) return null;              // 이미 지나갔다
        return { at: at, from: g.wake, for: g.at, gap: Math.round(g.gap) || 0, night: !!g.night };
    }

    function plan() {
        var out = {};
        [["feed", "tosil_feed_interval"], ["diaper", "tosil_diaper_interval"]].forEach(function (x) {
            var m = every(x[1]), r = latest(x[0]);
            out[x[0]] = (m > 0 && r) ? { at: Number(r.timestamp) + m * 60000, from: Number(r.timestamp), every: m } : null;
        });
        out.sleepy = sleepyPlan();
        return out;
    }

    function sent() { try { return JSON.parse(localStorage.getItem(SENT_KEY)) || {}; } catch (e) { return {}; } }
    function markSent(k, from) {
        var s = sent(); s[babyKey() + ":" + k] = from;
        try { localStorage.setItem(SENT_KEY, JSON.stringify(s)); } catch (e) {}
    }

    /* ---------- 알림 문구 (서버 careWords 와 같은 표) ---------- */
    function nick() {
        var n = babyName(), c = n.charCodeAt(n.length - 1);
        var jong = c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0;
        return n + (jong && n !== "우리 아기" ? "이" : "");
    }
    // '14:30' 대신 '오후 2시 30분'
    function clock(ts) {
        var d = new Date(ts), h = d.getHours(), m = d.getMinutes(), hh = h % 12 === 0 ? 12 : h % 12;
        return (h < 12 ? "오전 " : "오후 ") + hh + "시" + (m ? " " + m + "분" : "");
    }
    function words(k, p) {
        var n = nick(), t = p.every ? hm(p.every) : "", when = p.from ? clock(p.from) : "";
        var FEED = [
            ["🍼 슬슬 맘마 시간이에요", t && when ? when + "에 먹고 " + t + "이 지났어요" : n + "가 곧 배고프다고 할 거예요"],
            ["🍼 " + n + " 배꼽시계가 울릴 때예요", when ? "마지막 맘마는 " + when + (/분$/.test(when) ? "이었어요" : "였어요") : "천천히 준비해 주세요"],
            ["🍼 " + n + " 곧 맘마 찾을 거예요", t ? "먹은 지 " + t + " 됐어요. 천천히 준비해 주세요" : "천천히 준비해 주세요"]
        ];
        var DIAPER = [
            ["🧷 기저귀 한번 볼까요?", t && when ? when + "에 갈고 " + t + "이 지났어요" : "기저귀 갈 때가 됐어요"],
            ["🧷 " + n + " 엉덩이 뽀송한가요?", t ? "기저귀 간 지 " + t + " 됐어요" : "기저귀 갈 때가 됐어요"],
            ["🧷 기저귀 확인할 때예요", when ? "마지막으로 " + when + "에 갈았어요" : "기저귀 갈 때가 됐어요"]
        ];
        var list = (k === "feed") ? FEED : DIAPER;
        var pick = list[Math.floor(p.at / 3600000) % list.length];
        return { t: pick[0], b: pick[1] };
    }
    window.careAlarmWords = words;   // 점검 · 시험용

    /* 😪 졸릴 때 알림 문구 (서버 sleepyWords 와 같은 표)
       p: { at: 알림 시각, for: 졸려할 때, from: 깬 시각, gap: 보통 깨어 있던 시간(분), night } */
    function soft(m) {               // 150 → '2시간 반', 160 → '2시간 40분' (홈 '다시 졸릴 때' 줄과 같은 말)
        m = Math.max(0, Math.round(Number(m) / 10) * 10);
        var h = Math.floor(m / 60), r = m % 60;
        return h ? h + "시간" + (r ? (r === 30 ? " 반" : " " + r + "분") : "") : r + "분";
    }
    function sleepyWords(p) {
        var n = nick(), when = clock(p.for), awake = soft((p.at - p.from) / 60000), gap = p.gap > 0 ? soft(p.gap) : "";
        var NAP = [
            ["😪 " + n + " 곧 졸려할 거예요", when + "쯤이에요. 깬 지 " + awake + " 됐어요"],
            ["😪 슬슬 낮잠 시간이에요", gap ? "이맘때 깨면 보통 " + gap + "쯤 뒤에 잤어요" : when + "쯤 졸려할 거예요"],
            ["😪 " + n + " 눈꺼풀이 무거워질 때예요", when + "쯤 졸려할 거예요. 천천히 준비해 주세요"]
        ];
        var NIGHT = [
            ["🌙 " + n + " 곧 밤잠 들 때예요", when + "쯤이에요. 천천히 준비해 주세요"],
            ["🌙 슬슬 밤잠 준비할 때예요", gap ? "이맘때 깨면 보통 " + gap + "쯤 뒤에 밤잠을 잤어요" : when + "쯤 밤잠 들 때예요"],
            ["🌙 곧 " + n + " 잘 시간이에요", "깬 지 " + awake + " 됐어요"]
        ];
        var list = p.night ? NIGHT : NAP, pick = list[Math.floor(p.at / 3600000) % list.length];
        return { t: pick[0], b: pick[1] };
    }
    window.sleepyPushWords = sleepyWords;

    function notify(k, p) {
        if (!("Notification" in window) || Notification.permission !== "granted") return Promise.resolve(false);
        var w = k === "sleepy" ? sleepyWords(p) : words(k, p);
        var opts = { body: w.b, icon: "icon-192x192.png", tag: "care-" + k, renotify: true };
        var viaSW = (navigator.serviceWorker && navigator.serviceWorker.getRegistration)
            ? navigator.serviceWorker.getRegistration() : Promise.resolve(null);
        return viaSW.then(function (reg) {
            if (reg && reg.showNotification) return reg.showNotification(w.t, opts).then(function () { return true; });
            new Notification(w.t, opts);          // 서비스워커가 없을 때만 (안드로이드는 이 길이 막혀 있다)
            return true;
        }).catch(function () { return false; });
    }

    /* ---------- 서버에 적기 ---------- */
    var busy = false, again = false;
    async function upload(p, force) {
        var code = localStorage.getItem("family_sync_code");
        if (!code || !window.db || typeof window.setDoc !== "function" || typeof window.doc !== "function") return { ok: false, code: "not-ready" };
        var uid = myUid(), key = babyKey();
        var fe = every("tosil_feed_interval"), de = every("tosil_diaper_interval");
        var z = p.sleepy;
        var sig = JSON.stringify([key, uid, p.feed && p.feed.at, p.diaper && p.diaper.at, fe > 0, de > 0,
                                  z ? (z.cancel ? "x" : z.at) + "/" + z.from : "", sleepyOn()]);
        if (!force && localStorage.getItem(UP_KEY) === sig) return { ok: true, same: true };
        if (busy) { again = true; return { ok: true, queued: true }; }
        busy = true;
        try {
            var ref = window.doc(window.db, "reminders", code);
            var srv = {};
            if (typeof window.getDoc === "function") {
                try { var snap = await window.getDoc(ref); if (snap && snap.exists()) srv = snap.data() || {}; } catch (e) {}
            }
            var sc = (srv.care && srv.care[key]) || {};
            var val = { babyName: babyName(), updatedAt: Date.now() };
            ["feed", "diaper"].forEach(function (k) {
                var q = p[k];
                if (!q) return;                                        // 이 폰은 껐거나 기록이 없다 — 짝꿍 폰이 잡은 시각은 그대로 둔다
                if ((Number(sc[k + "From"]) || 0) > q.from) return;    // 서버가 더 새 기록으로 잡아 둔 시각이 있다
                val[k + "At"] = q.at; val[k + "Every"] = q.every; val[k + "From"] = q.from;
            });
            // 😪 졸릴 때 — 서버가 더 새 일(나중에 깬 것 · 잠든 것)로 적어 둔 게 있으면 덮지 않는다
            if (z && (Number(sc.sleepyFrom) || 0) <= z.from) {
                val.sleepyAt = z.cancel ? 0 : z.at;
                val.sleepyFrom = z.from;
                if (!z.cancel) { val.sleepyFor = z.for; val.sleepyGap = z.gap; val.sleepyNight = z.night; }
            }
            var body = { care: {} };
            body.care[key] = val;
            if (uid) { body.mute = {}; body.mute[uid] = { feed: !(fe > 0), diaper: !(de > 0), sleepy: !sleepyOn() }; }

            // careNext — 서버가 이 시각이 지난 문서만 훑는다. 아기 전부의 '아직 안 보낸 시각' 중 가장 이른 것
            // 졸릴 때는 sleepyNext 에 따로 (옛 앱이 careNext 를 다시 적어도 밀리지 않게)
            var all = Object.assign({}, srv.care || {});
            all[key] = Object.assign({}, sc, val);
            var nexts = [], znexts = [];
            Object.keys(all).forEach(function (bk) {
                var c = all[bk] || {};
                ["feed", "diaper"].forEach(function (k) {
                    var at = Number(c[k + "At"]) || 0;
                    if (at && Number(c[k + "Pushed"]) !== at && Date.now() - at < LATE_MAX) nexts.push(at);
                });
                var za = Number(c.sleepyAt) || 0, zf = Number(c.sleepyFrom) || 0;   // 졸릴 때는 깬 것마다 한 번
                if (za && zf && Number(c.sleepyPushed) !== zf && Date.now() - za < SLEEPY_LATE) znexts.push(za);
            });
            body.careNext = nexts.length ? Math.min.apply(null, nexts) : null;
            body.sleepyNext = znexts.length ? Math.min.apply(null, znexts) : null;

            await window.setDoc(ref, body, { merge: true });
            try { localStorage.setItem(UP_KEY, sig); } catch (e) {}
            return { ok: true };
        } catch (e) {
            console.warn("[수유·기저귀 알림] 서버에 적기 실패", e);
            return { ok: false, code: (e && (e.code || e.message)) || String(e) };
        } finally {
            busy = false;
            if (again) { again = false; setTimeout(function () { upload(plan()); }, 300); }
        }
    }

    function check(visibleNow) {
        var p = plan(), s = sent(), now = Date.now(), key = babyKey();
        ["feed", "diaper"].forEach(function (k) {
            var q = p[k];
            if (!q || now < q.at || now > q.at + LATE_MAX) return;
            if (s[key + ":" + k] === q.from) return;
            if (isAway()) { markSent(k, q.from); return; }                 // 밖에 있는 사람 폰은 조용히
            if (visibleNow) {
                var w = words(k, q);
                if (typeof window.showToast === "function") window.showToast(w.t);
                (window.__pushSeen || (window.__pushSeen = {}))[w.t] = Date.now();   // 몇 분 뒤 서버 알림이 와도 화면에 또 띄우지 않게
                markSent(k, q.from);
            } else if (!serverPushes()) {
                notify(k, q).then(function (ok) { if (ok) markSent(k, q.from); });
            }
        });
        var z = p.sleepy;
        if (z && !z.cancel && sleepyOn() && now >= z.at && now - z.at <= SLEEPY_LATE && s[key + ":sleepy"] !== z.from) {
            if (isAway()) markSent("sleepy", z.from);
            else if (visibleNow) {
                var w = sleepyWords(z);
                if (typeof window.showToast === "function") window.showToast(w.t);
                (window.__pushSeen || (window.__pushSeen = {}))[w.t] = Date.now();
                markSent("sleepy", z.from);
            } else if (!serverPushes()) {
                notify("sleepy", z).then(function (ok) { if (ok) markSent("sleepy", z.from); });
            }
        }
        return upload(p);
    }

    /* 점검 화면 · 설정 저장에서 부른다. force 면 같은 값이어도 다시 적는다 */
    window.refreshCareAlarm = function (force) {
        if (force) { try { localStorage.removeItem(UP_KEY); } catch (e) {} }
        return check(!document.hidden);
    };

    /* 감싼 함수에 앞 사람이 붙여 둔 표시(__sleepy 같은)를 옮긴다 — 안 옮기면 그쪽이 또 감싼다 */
    function copyKeys(from, to) { Object.keys(from).forEach(function (k) { try { to[k] = from[k]; } catch (e) {} }); }

    /* 기록을 저장하는 그 순간 서버에 적는다 (script.js 의 저장 창구를 감싼다) */
    function hookSave() {
        var orig = window.saveTrackerToFirebase;
        if (typeof orig !== "function" || orig.__care) return;
        var wrapped = function () {
            var out = orig.apply(this, arguments);
            setTimeout(function () { check(!document.hidden); }, 60);
            return out;
        };
        copyKeys(orig, wrapped);
        wrapped.__care = true;
        window.saveTrackerToFirebase = wrapped;
    }
    /* 짝꿍 폰 기록이 들어와 화면이 다시 그려질 때도 (같은 값이면 서버에 안 적는다) */
    function hookDashboard() {
        var orig = window.updateTrackerDashboard;
        if (typeof orig !== "function" || orig.__care) return;
        var t = null;
        var wrapped = function () {
            var out = orig.apply(this, arguments);
            clearTimeout(t);
            t = setTimeout(function () { check(!document.hidden); }, 1200);
            return out;
        };
        copyKeys(orig, wrapped);
        wrapped.__care = true;
        window.updateTrackerDashboard = wrapped;
    }

    function boot() {
        hookSave();
        hookDashboard();
        var loop = window.keepAliveInterval || window.setInterval;   // idle.js 가 건너뛰지 않는 쪽
        loop(function () { check(!document.hidden); }, 60000);
        setTimeout(function () { hookSave(); hookDashboard(); check(!document.hidden); }, 5000);
        document.addEventListener("visibilitychange", function () {
            if (!document.hidden) setTimeout(function () { check(true); }, 800);
            else upload(plan());                                       // 앱을 내리는 순간에도 한 번
        });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    window.careAlarmDebug = function () {
        var p = plan();
        ["feed", "diaper"].forEach(function (k) {
            var q = p[k];
            console.log(k === "feed" ? "수유" : "기저귀", q ? ("다음 알림 " + new Date(q.at).toLocaleString() + " (텀 " + hm(q.every) + ")") : "꺼짐 또는 기록 없음");
        });
        var z = p.sleepy;
        console.log("졸릴 때", !sleepyOn() ? "이 폰은 꺼 둠" : "", z ? (z.cancel ? "자는 중 — 장부에서 지움" : "알림 " + new Date(z.at).toLocaleString() + " (졸려할 때 " + new Date(z.for).toLocaleTimeString() + ")") : "짐작 없음");
        console.log("알림 권한:", ("Notification" in window) ? Notification.permission : "없음");
        console.log("서버 알림:", serverPushes() ? "받는 중" : "알림 주소 없음 — 앱이 직접 띄움");
        console.log("이미 알린 기록:", sent());
    };
})();
