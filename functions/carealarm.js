/* ============================================================
   배냇함 — 수유·기저귀 알림 (carealarm.js)

   트래커의 '알림 텀 설정' 은 있었는데 폰 알림은 한 번도 안 갔다.
     · 수유 텀   앱을 열었을 때 홈에 띠로만 떴다
     · 기저귀 텀 저장만 되고 어디서도 안 썼다 (script.js 에 이제 띠가 뜬다)
   게다가 idle.js 가 앱이 뒤에 있을 때 반복 타이머를 건너뛰게 해서,
   화면이 꺼져 있으면 확인조차 안 했다. 알림이 제일 필요한 순간이다.

   이 파일이 하는 일
     1. 1분마다 확인한다 (keepAliveInterval — 앱이 뒤에 있어도 돈다)
     2. 때가 되면 폰 알림을 한 번 띄운다 (마지막 기록 하나에 한 번만)
     3. 앱으로 돌아왔을 때 이미 지났으면 바로 알려준다
     4. '다음 알림 시각' 을 가족 서버 문서(reminders/가족코드)에 적어둔다
        → 앱이 완전히 닫혀 있어도 서버(functions 의 careReminder)가 5분마다 보고 보낸다

   ⚠️ 앱이 완전히 닫혔거나 폰이 오래 잠들어 있으면 1~3은 못 한다. 브라우저가 앱을 재운다.
      그래서 4가 필요하다. 그 전까지는 폰 기본 알람을 같이 쓰시길 권한다.

   ⚠️ 알림 텀을 0 으로 두면 그 알림은 끈다.

   index.html 에서 remind.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var SENT_KEY = "tosil_carealarm_sent";     // { feed: 기록 시각, diaper: 기록 시각 } — 이 기록으로는 이미 알렸다
    var UP_KEY   = "tosil_carealarm_up";       // 마지막으로 서버에 적은 값
    var LATE_MAX = 6 * 3600000;                // 이보다 오래 지난 건 알리지 않는다 (기록을 안 한 것일 수 있다)

    function babyName() { return localStorage.getItem("tosil_babyName") || "우리 아기"; }
    function recs() { try { return JSON.parse(localStorage.getItem("tosil_tracker_records")) || []; } catch (e) { return []; } }
    function every(key) { var v = parseInt(localStorage.getItem(key), 10); return isNaN(v) ? 180 : v; }   // 분 · 0 = 끔

    function latest(type) {
        var best = null;
        recs().forEach(function (r) {
            if (!r || r.type !== type) return;
            var t = Number(r.timestamp);
            if (t && (!best || t > Number(best.timestamp))) best = r;
        });
        return best;
    }

    function hm(m) {
        var h = Math.floor(m / 60), mm = m % 60;
        return h ? (h + "시간" + (mm ? " " + mm + "분" : "")) : (mm + "분");
    }

    function plan() {
        var out = {};
        [["feed", "tosil_feed_interval"], ["diaper", "tosil_diaper_interval"]].forEach(function (x) {
            var m = every(x[1]), r = latest(x[0]);
            out[x[0]] = (m > 0 && r) ? { at: Number(r.timestamp) + m * 60000, from: Number(r.timestamp), every: m } : null;
        });
        return out;
    }

    function sent() { try { return JSON.parse(localStorage.getItem(SENT_KEY)) || {}; } catch (e) { return {}; } }
    function markSent(k, from) { var s = sent(); s[k] = from; try { localStorage.setItem(SENT_KEY, JSON.stringify(s)); } catch (e) {} }

    /* 알림 문구 — 서버(functions 의 careReminder)와 같은 표를 같은 순서로 쓴다.
       같은 텀이면 같은 문장이 나와서, 앱과 서버가 둘 다 띄워도 한 줄로 겹친다. */
    function nick() {
        var n = babyName(), c = n.charCodeAt(n.length - 1);
        var jong = c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0;
        return n + (jong && n !== "우리 아기" ? "이" : "");
    }
    function clock(ts) {
        var d = new Date(ts);
        return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    }
    function words(k, p) {
        var nk = nick(), t = hm(p.every), at = clock(p.from);
        var FEED = [
            ["🍼 " + nk + " 배고플 시간이에요", at + "에 먹고 " + t + "이 지났어요"],
            ["🍼 슬슬 맘마 시간이에요", nk + "가 마지막으로 " + at + "에 먹었어요"],
            ["🍼 " + nk + " 맘마 챙길 때예요", "먹은 지 " + t + " 됐어요. 천천히 준비해 주세요"]
        ];
        var DIAPER = [
            ["🧷 기저귀 한 번 볼까요?", at + "에 갈고 " + t + "이 지났어요"],
            ["🧷 " + nk + " 엉덩이 확인할 시간이에요", "마지막으로 " + at + "에 갈았어요"],
            ["🧷 뽀송한지 한 번 봐 주세요", "기저귀 간 지 " + t + " 됐어요"]
        ];
        var list = (k === "feed") ? FEED : DIAPER;
        var pick = list[Math.floor(p.at / 3600000) % list.length];
        return { t: pick[0], b: pick[1] };
    }

    function notify(k, p) {
        if (!("Notification" in window) || Notification.permission !== "granted") return Promise.resolve(false);
        var w = words(k, p);
        var opts = { body: w.b, icon: "icon-192x192.png", tag: "care-" + k, renotify: true };
        var viaSW = (navigator.serviceWorker && navigator.serviceWorker.getRegistration)
            ? navigator.serviceWorker.getRegistration() : Promise.resolve(null);
        return viaSW.then(function (reg) {
            if (reg && reg.showNotification) return reg.showNotification(w.t, opts).then(function () { return true; });
            new Notification(w.t, opts);          // 서비스워커가 없을 때만 (안드로이드는 이 길이 막혀 있다)
            return true;
        }).catch(function () { return false; });
    }

    function upload(p) {
        var code = localStorage.getItem("family_sync_code");
        if (!code || !window.db || typeof window.setDoc !== "function" || typeof window.doc !== "function") return;
        var key = window.currentBabySuffix || "main";
        var val = { feedAt: p.feed ? p.feed.at : null, diaperAt: p.diaper ? p.diaper.at : null,
                    feedEvery: p.feed ? p.feed.every : null, diaperEvery: p.diaper ? p.diaper.every : null,
                    babyName: babyName(), updatedAt: Date.now() };
        var sig = JSON.stringify([key, val.feedAt, val.diaperAt]);
        if (localStorage.getItem(UP_KEY) === sig) return;
        /* careNext — 서버(careReminder)가 이 시각이 지난 문서만 훑는다 */
        var nexts = [val.feedAt, val.diaperAt].filter(function (x) { return x; });
        var body = { care: {}, careNext: nexts.length ? Math.min.apply(null, nexts) : null };
        body.care[key] = val;
        window.setDoc(window.doc(window.db, "reminders", code), body, { merge: true })
            .then(function () { try { localStorage.setItem(UP_KEY, sig); } catch (e) {} })
            .catch(function (e) { console.warn("[수유·기저귀 알림] 서버에 적기 실패", e); });
    }

    function check(visibleNow) {
        var p = plan(), s = sent(), now = Date.now();
        ["feed", "diaper"].forEach(function (k) {
            var q = p[k];
            if (!q || now < q.at || now > q.at + LATE_MAX) return;
            if (s[k] === q.from) return;
            notify(k, q).then(function (ok) {
                if (ok || visibleNow) markSent(k, q.from);
            });
            if (visibleNow && typeof window.showToast === "function") window.showToast(words(k, q).t);
        });
        upload(p);
    }

    window.refreshCareAlarm = function (force) {
        if (force) { try { localStorage.removeItem(UP_KEY); } catch (e) {} }
        check(!document.hidden);
    };

    function boot() {
        var loop = window.keepAliveInterval || window.setInterval;   // idle.js 가 건너뛰지 않는 쪽
        loop(function () { check(!document.hidden); }, 60000);
        setTimeout(function () { check(!document.hidden); }, 5000);
        document.addEventListener("visibilitychange", function () {
            if (!document.hidden) setTimeout(function () { check(true); }, 800);
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
        console.log("알림 권한:", ("Notification" in window) ? Notification.permission : "없음");
        console.log("이미 알린 기록:", sent());
    };
})();