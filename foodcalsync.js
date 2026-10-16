/* ============================================================
   배냇함 — 이유식 달력 같이 보기 (foodcalsync.js)

   이유식 달력(식단 · 새 재료 · 알레르기 반응)은 폰마다 따로 있었다.
   아빠 폰에서 '소고기 처음' 을 적어도 엄마 폰 달력엔 없었다.
   알레르기 기록이 한쪽 폰에만 있으면, 다른 쪽이 반응 있었던 재료를 또 먹일 수 있다.

   합치는 방법 (한 줄 · 도감과 같은 방식)
     · 줄마다 이름표(id)를 붙인다. 처음 보는 줄에만 붙이고, 한 번 붙인 건 안 바꾼다.
     · 양쪽에 같은 줄이 있으면 나중에 고친 쪽(mt)을 남긴다.
     · 지운 줄은 묘비(Grave 'food')를 세워 되살아나지 않게 한다.

   이유식 큐레이터 페이지에는 파이어베이스가 없다.
     그래서 '마지막으로 맞춘 모습(seen)' 을 적어 두고, 본 앱이 켜질 때 지금 모습과 비교한다.
       seen 에 있던 줄이 없어졌다     → 지웠다 (묘비)
       seen 과 내용 · 날짜가 다르다   → 고쳤다 (mt)
       이름표가 없는 줄              → 새로 적었다 (id)
     어느 화면(식단 기록 · 재료 기록 · 먹여본 재료 · 식단표 · 토핑)에서 바꿨든 같은 방법으로 잡힌다.

   ⚠️ 달력이 통째로 비었으면(탈퇴 · 새 폰) 지운 걸로 보지 않는다.
      한 사람 폰이 비었다고 짝꿍 폰 달력까지 지우면 안 된다. 서버에서 다시 받는다.

   서버: foodcal_{가족코드}{아기 꼬리표}/status  { days, deleted, at }
     (규칙: 맨 아래 '가족 데이터' — 컬렉션 이름 두 번째 조각이 가족 코드면 그 가족만)
   index.html 에서 graveyard.js 다음 어디든 한 줄.
   ============================================================ */
(function () {
    'use strict';
    if (window.__foodCalSync) return;
    window.__foodCalSync = true;

    var KEY = 'tosil_food_calendar', KIND = 'food';
    var MAX_BYTES = 700000;          // 문서 하나는 1MB 까지. 넘을 것 같으면 오래된 날은 빼고 올린다
    var KEEP_DAYS = 400;

    function suffix() { return window.currentBabySuffix || ''; }
    function code() { var c = localStorage.getItem('family_sync_code'); return c && c.indexOf('unlinked') === -1 ? c : ''; }
    function seenKey() { return 'tosil_foodcal_seen' + suffix(); }
    function ref() {
        var c = code();
        if (!c || !window.db || typeof window.doc !== 'function') return null;
        return window.doc(window.db, 'foodcal_' + c + suffix(), 'status');
    }
    function signedIn() { return !!(window.auth && window.auth.currentUser); }

    var writing = false;
    function read() {
        try { var v = JSON.parse(localStorage.getItem(KEY)); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; }
        catch (e) { return {}; }
    }
    function write(db) {
        writing = true;
        try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) {}
        writing = false;
    }
    function readSeen() {
        try { var v = JSON.parse(localStorage.getItem(seenKey())); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; }
    }
    function writeSeen(s) { try { localStorage.setItem(seenKey(), JSON.stringify(s)); } catch (e) {} }

    function newId() { return 'fc' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
    // 내용만 (이름표 · 시각 빼고). 서버가 열쇠 순서를 바꿔 돌려주므로 정렬해서 비교한다
    function body(r) {
        var o = {};
        Object.keys(r).sort().forEach(function (k) { if (k !== 'id' && k !== 'mt' && k !== 'ct') o[k] = r[k]; });
        return JSON.stringify(o);
    }
    function count(db) {
        var n = 0;
        Object.keys(db).forEach(function (d) { if (Array.isArray(db[d])) n += db[d].length; });
        return n;
    }
    function snapshot(db) {
        var s = {};
        Object.keys(db).forEach(function (d) {
            (db[d] || []).forEach(function (r) { if (r && r.id) s[r.id] = [d, body(r)]; });
        });
        return s;
    }

    /* ---------- 이 폰에서 바뀐 것 잡기 ---------- */
    function reconcile() {
        var db = read(), seen = readSeen(), now = Date.now(), changed = false, here = {};
        Object.keys(db).forEach(function (d) {
            if (!Array.isArray(db[d])) { delete db[d]; changed = true; return; }
            db[d] = db[d].filter(function (r) { return r && typeof r === 'object'; });
            db[d].forEach(function (r) {
                if (!r.id) { r.id = newId(); r.ct = r.ct || now; r.mt = now; changed = true; }
                here[r.id] = 1;
                var s = seen[r.id];
                if (s && (s[0] !== d || s[1] !== body(r))) { r.mt = now; changed = true; }
            });
            if (!db[d].length) { delete db[d]; changed = true; }
        });
        if (count(db) > 0 && window.Grave) {
            Object.keys(seen).forEach(function (id) { if (!here[id]) window.Grave.add(KIND, id); });
        }
        if (changed) write(db);
        writeSeen(snapshot(db));
        return db;
    }

    /* ---------- 합치기 ---------- */
    function merge(local, remote, gone) {
        var byId = {}, order = [];
        function take(d, r) {
            if (!r || !r.id || gone[r.id]) return;
            var cur = byId[r.id];
            if (!cur) { byId[r.id] = { d: d, r: r }; order.push(r.id); return; }
            var a = Number(cur.r.mt || cur.r.ct || 0), b = Number(r.mt || r.ct || 0);
            if (b > a) byId[r.id] = { d: d, r: r };      // 같으면 이 폰 것을 남긴다
        }
        Object.keys(local).forEach(function (d) { (local[d] || []).forEach(function (r) { take(d, r); }); });
        Object.keys(remote || {}).forEach(function (d) { if (Array.isArray(remote[d])) remote[d].forEach(function (r) { take(d, r); }); });
        var out = {};
        order.forEach(function (id) { var x = byId[id]; (out[x.d] = out[x.d] || []).push(x.r); });
        return out;
    }

    function trim(db) {
        var s = JSON.stringify(db);
        if (s.length < MAX_BYTES) return db;
        var cut = new Date(Date.now() - KEEP_DAYS * 86400000), out = {};
        var ck = cut.getFullYear() + '-' + String(cut.getMonth() + 1).padStart(2, '0') + '-' + String(cut.getDate()).padStart(2, '0');
        Object.keys(db).forEach(function (d) { if (d >= ck) out[d] = db[d]; });
        return out;
    }

    /* ---------- 올리기 ---------- */
    var timer = null;
    function pushSoon() { clearTimeout(timer); timer = setTimeout(push, 1200); }
    async function push() {
        var r = ref();
        if (!r || typeof window.setDoc !== 'function' || !signedIn()) return;
        var db = reconcile();
        if (!count(db)) return;          // 빈 달력은 올리지 않는다 (서버 것을 비우지 않게. 짝꿍 것은 받아 온다)
        try {
            await window.setDoc(r, { days: trim(db), deleted: window.Grave ? window.Grave.list(KIND) : {}, at: Date.now() });
        } catch (e) { console.warn('[이유식 달력] 올리기 실패', e); }
    }
    window.syncFoodCalendar = push;

    /* ---------- 짝꿍이 적으면 내 폰에도 ---------- */
    var unsub = null, repush = null, liveCode = '';
    function onRemote(data) {
        if (window.Grave) window.Grave.merge(KIND, data.deleted);
        var gone = (window.Grave && window.Grave.peek) ? window.Grave.peek(KIND) : {};
        var remote = (data.days && typeof data.days === 'object') ? data.days : {};
        var local = reconcile();
        var merged = merge(local, remote, gone);
        if (JSON.stringify(merged) !== JSON.stringify(local)) write(merged);
        writeSeen(snapshot(merged));
        if (window.syncNeedsPush && window.syncNeedsPush(remote, merged, data.deleted, KIND)) {
            clearTimeout(repush);
            repush = setTimeout(push, 1500);
        }
        return merged;
    }
    window.foodCalApplyRemote = onRemote;   // 점검용 (서버에서 받은 것처럼 합쳐 본다)
    function listen() {
        var r = ref();
        if (!r || typeof window.onSnapshot !== 'function' || !signedIn()) return false;
        var key = code() + suffix();
        if (unsub && liveCode === key) return true;
        if (unsub) { try { unsub(); } catch (e) {} unsub = null; }
        liveCode = key;
        var u = window.onSnapshot(r, function (snap) {
            if (!snap.exists()) { if (count(read()) > 0) pushSoon(); return; }
            onRemote(snap.data() || {});
        }, function (e) { console.warn('[이유식 달력] 실시간 연동 에러', e); unsub = null; liveCode = ''; });
        unsub = (typeof window.addLiveListener === 'function') ? window.addLiveListener(u) : u;
        return true;
    }

    /* ---------- 이 폰(본 앱)에서 달력이 바뀌는 순간 (토핑 이유식 저장 등) ---------- */
    (function hook() {
        var proto = window.Storage && window.Storage.prototype;
        if (!proto || proto.__foodCalHooked) return;
        var orig = proto.setItem;
        proto.setItem = function (k, v) {
            var out = orig.apply(this, arguments);
            if (!writing && this === window.localStorage && k === KEY) pushSoon();
            return out;
        };
        proto.__foodCalHooked = true;
    })();

    /* ---------- 시작: 로그인 · 가족 코드가 잡히면 ---------- */
    function start() {
        if (!code() || !signedIn() || !window.db) return false;
        reconcile();
        return listen();
    }
    var tries = 0;
    (function wait() {
        if (start()) return;
        if (++tries < 30) setTimeout(wait, 2000);
    })();
    // 가족에 새로 들어오거나 다시 로그인하면 본 앱이 initRealtimeSync 를 부른다. 그때 같이 다시 건다
    var initTries = 0;
    (function hookInit() {
        var f = window.initRealtimeSync;
        if (typeof f !== 'function') { if (++initTries < 30) setTimeout(hookInit, 1500); return; }
        if (f.__foodCal) return;
        var w = function () { var o = f.apply(this, arguments); setTimeout(start, 300); return o; };
        w.__foodCal = true;
        window.initRealtimeSync = w;
    })();

    /* ---------- 점검용 ---------- */
    window.foodCalSyncDebug = function () {
        var db = read();
        console.log('가족 코드:', code() || '없음', '· 아기:', suffix() || '첫째');
        console.log('달력 줄:', count(db) + '개', '· 이름표 없는 줄:', Object.keys(db).reduce(function (n, d) { return n + (db[d] || []).filter(function (r) { return r && !r.id; }).length; }, 0));
        console.log('묘비:', window.Grave ? Object.keys(window.Grave.peek(KIND)).length + '개' : 'Grave 없음');
        console.log('실시간 연동:', unsub ? '켜짐' : '꺼짐');
    };
})();
