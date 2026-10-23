/* ============================================================
   배냇함 — 가족 장부 (carelog.js)

   평생 장부(tosil_life_ledger · emotion.js)는 폰마다 따로 쌓인다.
   기록은 100개까지만 남아서, 그 사이에 앱을 안 연 폰은 그 기록을 영영 못 센다.
     · 짝꿍이 20일째에 가족방에 들어오면 짝꿍 폰 장부는 그 앞 20일이 비어 있다
     · 폰을 바꾸면 장부가 처음부터 다시 쌓인다
   그래서 백일 · 돌 한 장(recap.js)이 두 폰에서 다른 숫자를 낼 뻔했다.

   날마다 다섯 숫자 [달려간 횟수, 새벽, 맘마, 기저귀, 잠(분)] 를 가족 보관함에 올려 두고,
   셀 때는 '이 폰 장부' 와 '가족 보관함' 중 큰 쪽을 쓴다.
   둘 다 실제 기록의 일부를 센 것이라 큰 쪽이 더 온전하다.

   ⚠️ 이 폰 장부(tosil_life_ledger)에 섞어 넣지 않는다. 섞으면 그 뒤에 이 폰에 들어오는
      같은 기록이 한 번 더 더해진다. 셀 때만 나란히 놓고 큰 쪽을 고른다.
   ⚠️ 오늘과 최근 3일은 올리지 않는다. 아직 바뀌는 중이다 (기록을 고치거나 지우면 줄어든다).
   ⚠️ 돌봄 도우미 폰은 올리지도 받지도 않는다.

   보관함: carelog_{가족코드}{아기번호} / y2026 = { "2026-10-20": [c, n, f, d, z], ... }
   이 폰 사본: tosil_carelog (아기마다 · script.js BABY_SPECIFIC_KEYS) = { at, days }
   12시간에 한 번 맞춘다. 맞춘 뒤 숫자가 바뀌었으면 'carelog' 이벤트를 쏜다.

   쓰는 법
     CareLog.sum('2026-05-26', '2026-09-02')
       → { care, dawn, feed, diaper, sleep(분), days(기록한 날), sleepDays(잠을 적은 날) }
     CareLog.sync(true)   지금 바로 맞추기 (Promise)

   index.html 에서 emotion.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';
    if (window.CareLog) return;

    var LEDGER = "tosil_life_ledger", KEY = "tosil_carelog";
    var DAY = 86400000, HOLD = 3, EVERY = 12 * 3600000;

    function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function getJSON(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    function keyOf(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
    function isKey(k) { return /^\d{4}-\d{2}-\d{2}$/.test(String(k || "")); }
    function num(v) { v = Number(v); return isFinite(v) && v > 0 ? Math.round(v) : 0; }
    function valid(a) {
        return Array.isArray(a) && a.length === 5 && a.every(function (v) { return typeof v === "number" && isFinite(v) && v >= 0 && v < 100000; });
    }
    function today0() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }

    /* ---------- 이 폰 장부 ---------- */
    function local() {
        var l = getJSON(LEDGER, null), days = {}, months = {};
        if (l && l.days && typeof l.days === "object") {
            Object.keys(l.days).forEach(function (k) {
                if (!isKey(k)) return;
                var d = l.days[k] || {}, z = 0;
                (Array.isArray(d.segs) ? d.segs : []).forEach(function (g) {
                    if (g && Number(g[1]) > Number(g[0])) z += Number(g[1]) - Number(g[0]);
                });
                days[k] = [num(d.care), num(d.dawn), num(d.feed), num(d.diaper), num(z)];
            });
        }
        if (l && l.months && typeof l.months === "object") months = l.months;
        return { days: days, months: months };
    }

    /* ---------- 가족 보관함 사본 ---------- */
    function cache() {
        var c = getJSON(KEY, null);
        return (c && typeof c === "object" && c.days && typeof c.days === "object") ? c : { at: 0, days: {} };
    }
    function saveCache(c) { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) {} }

    /* 날마다 큰 쪽 */
    function merged() {
        var loc = local(), srv = cache().days, out = {};
        Object.keys(loc.days).forEach(function (k) { out[k] = loc.days[k].slice(); });
        Object.keys(srv).forEach(function (k) {
            var s = srv[k];
            if (!isKey(k) || !valid(s)) return;
            var a = out[k];
            out[k] = a ? a.map(function (v, i) { return Math.max(v, s[i]); }) : s.slice();
        });
        return { days: out, months: loc.months, local: loc.days };
    }

    function sum(fromK, toK) {
        var m = merged(), o = { care: 0, dawn: 0, feed: 0, diaper: 0, sleep: 0, days: 0, sleepDays: 0 };
        Object.keys(m.days).forEach(function (k) {
            if (k < fromK || k > toK) return;
            var a = m.days[k];
            o.care += a[0]; o.dawn += a[1]; o.feed += a[2]; o.diaper += a[3]; o.sleep += a[4];
            if (a[0] > 0) o.days++;
            if (a[4] > 0) o.sleepDays++;
        });
        /* 400일이 넘으면 이 폰 장부는 오래된 날을 달별로 접어 둔다 (emotion.js).
           접힌 건 그 달의 앞쪽 날들이다 — 이 폰에 날짜별로 남은 그 달 첫날보다 앞.
           ⚠️ 경계 달은 반은 접히고 반은 날짜별로 남는다. 남은 날까지 접힌 몫에서 빼면 그만큼 덜 센다.
           그 앞쪽 날들을 보관함이 날짜별로 갖고 있으면 큰 쪽만 남긴다. 잠은 접을 때 사라져서 더하지 않는다. */
        var firstLocal = {};
        Object.keys(m.local).forEach(function (k) {
            var ym = k.slice(0, 7);
            if (!firstLocal[ym] || k < firstLocal[ym]) firstLocal[ym] = k;
        });
        Object.keys(m.months || {}).forEach(function (ym) {
            if (!/^\d{4}-\d{2}$/.test(ym) || ym < fromK.slice(0, 7) || ym > toK.slice(0, 7)) return;
            var f = m.months[ym] || {}, first = firstLocal[ym] || "9999", have = [0, 0, 0, 0], haveDays = 0;
            Object.keys(m.days).forEach(function (k) {
                if (k.slice(0, 7) !== ym || k >= first || k < fromK || k > toK) return;
                var a = m.days[k];
                have[0] += a[0]; have[1] += a[1]; have[2] += a[2]; have[3] += a[3];
                if (a[0] > 0) haveDays++;
            });
            var add = [num(f.care) - have[0], num(f.dawn) - have[1], num(f.feed) - have[2], num(f.diaper) - have[3]];
            if (add[0] > 0) o.care += add[0];
            if (add[1] > 0) o.dawn += add[1];
            if (add[2] > 0) o.feed += add[2];
            if (add[3] > 0) o.diaper += add[3];
            if (add[0] > 0) {
                // 접힌 날은 날짜를 모른다 — 그 달에서 구간에 든 (남은 날보다 앞) 날 수로 친다
                var p = ym.split("-").map(Number), last = new Date(p[0], p[1], 0).getDate(), n = 0;
                for (var d = 1; d <= last; d++) { var k = ym + "-" + pad(d); if (k >= fromK && k <= toK && k < first) n++; }
                o.days += Math.max(0, n - haveDays);
            }
        });
        return o;
    }

    /* ---------- 가족 보관함과 맞추기 ---------- */
    function ready() {
        var code = get("family_sync_code");
        return !!(code && /^TS-[A-Z0-9]+$/.test(code) && window.db &&
                  typeof window.doc === "function" && typeof window.getDoc === "function" && typeof window.setDoc === "function" &&
                  window.auth && window.auth.currentUser && get("tosil_role_locked") !== "viewer");
    }
    function ref(y) {
        return window.doc(window.db, "carelog_" + get("family_sync_code") + (window.currentBabySuffix || ""), "y" + y);
    }

    var busy = false;
    async function sync(force) {
        if (busy || !ready()) return false;
        var c = cache();
        if (!force && Date.now() - (Number(c.at) || 0) < EVERY) return false;
        busy = true;
        try {
            var birth = String(get("tosil_startDate") || "");
            var y1 = new Date().getFullYear(), y0 = /^\d{4}/.test(birth) ? Number(birth.slice(0, 4)) : y1;
            if (!(y0 <= y1) || y0 < y1 - 25) y0 = y1;

            var srv = {};
            for (var y = y0; y <= y1; y++) {
                var snap = await window.getDoc(ref(y));
                if (snap && snap.exists()) {
                    var data = snap.data() || {};
                    Object.keys(data).forEach(function (k) { if (isKey(k) && valid(data[k])) srv[k] = data[k]; });
                }
            }

            /* 이 폰이 더 많이 센 날만 올린다 — 칸마다 큰 쪽으로 (짝꿍 폰이 센 걸 깎지 않게) */
            var cut = keyOf(new Date(today0().getTime() - HOLD * DAY)), loc = local().days, up = {};
            Object.keys(loc).forEach(function (k) {
                if (k >= cut) return;
                var a = loc[k], s = srv[k];
                if (s && !a.some(function (v, i) { return v > s[i]; })) return;
                var m = a.map(function (v, i) { return s ? Math.max(v, s[i]) : v; });
                if (!m.some(function (v) { return v > 0; })) return;
                (up[k.slice(0, 4)] = up[k.slice(0, 4)] || {})[k] = m;
                srv[k] = m;
            });
            var ys = Object.keys(up);
            for (var i = 0; i < ys.length; i++) await window.setDoc(ref(ys[i]), up[ys[i]], { merge: true });

            var before = JSON.stringify(c.days || {});
            saveCache({ at: Date.now(), days: srv });
            var changed = before !== JSON.stringify(srv);
            if (changed) { try { window.dispatchEvent(new CustomEvent("carelog")); } catch (e) {} }
            return changed;
        } catch (e) {
            console.warn("[가족 장부] 맞추기 실패", e);
            saveCache({ at: Date.now() - EVERY + 3600000, days: c.days || {} });   // 한 시간 뒤에 다시
            return false;
        } finally {
            busy = false;
        }
    }

    window.CareLog = { sum: sum, sync: sync, merged: merged };

    /* 로그인이 붙을 시간을 주고 맞춘다 (12시간에 한 번) */
    setTimeout(function () { sync(false); }, 8000);
    setTimeout(function () { sync(false); }, 30000);
    document.addEventListener("visibilitychange", function () {
        if (!document.hidden) setTimeout(function () { sync(false); }, 2000);
    });

    /* ---------- 점검용 ---------- */
    window.careLogDebug = function (fromK, toK) {
        var loc = local().days, srv = cache().days;
        console.log("이 폰 장부:", Object.keys(loc).length + "일 · 가족 보관함 사본:", Object.keys(srv).length + "일",
                    "· 맞춘 때:", new Date(Number(cache().at) || 0).toLocaleString(), "· 맞출 수 있나:", ready());
        if (fromK && toK) console.log(fromK, "~", toK, sum(fromK, toK));
        return { local: loc, server: srv };
    };
})();
