/* ============================================================
   배냇함 — 키 · 몸무게 같이 보기 (growthsync.js)

   ⚠️ 성장 기록은 서버(growth_가족코드/status)에 올리기만 하고, 받아 오는 곳이 없었다.
      그래서 아빠 폰엔 엄마가 잰 키 · 몸무게가 안 보였고, 폰을 바꾸거나 앱을 다시 깔면 기록이 돌아오지 않았다.
      지운 기록은 이 폰에서만 지워졌다. 인터넷이 끊겼다 이어질 때 다시 올리는 곳은
      둘째 아기를 보고 있어도 첫째 칸(growth_가족코드)에 올렸다.
   그래서
     · 날짜마다 기록 하나. 같은 날을 두 폰이 적으면 나중에 적은 쪽 (at)
     · 받을 때도 올리기 전에도 날짜 단위로 합친다. 서버에 없는 게 이 폰에 있으면 한 번 더 올린다
     · 지운 날은 묘비(deleted) — 지운 뒤에 다시 적은 것만 남는다 (180일 뒤 치운다)
     · 아기 성별(sex)도 같이 둔다 — 나중에 고른 쪽 (또래 곡선이 남아 · 여아로 갈린다)
   이 폰에선 기록은 tosil_growth_records (배열, 다른 화면들이 읽는다),
   묘비와 성별 고른 시각은 tosil_growth_meta, 성별은 tosil_growth_gender — 모두 아기마다 따로 (script.js BABY_SPECIFIC_KEYS)
   index.html: growthref.js 다음, growth.js 앞
   ============================================================ */
(function () {
    'use strict';
    var KEY = 'tosil_growth_records', META = 'tosil_growth_meta', SEX = 'tosil_growth_gender';
    var TOMB_TTL = 180 * 86400000;

    function num(v) { return Number(v) || 0; }
    function role() { var r = ''; try { r = localStorage.getItem('user_role') || ''; } catch (e) {} return (r === 'mom' || r === 'dad') ? r : ''; }
    function getJSON(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
    function valid(r) {
        return !!(r && typeof r === 'object' && /^\d{4}-\d{2}-\d{2}$/.test(String(r.date || '')) && (num(r.height) > 0 || num(r.weight) > 0));
    }
    function prune(del) {
        var out = {}, now = Date.now();
        Object.keys(del || {}).forEach(function (k) { if (/^\d{4}-\d{2}-\d{2}$/.test(k) && now - num(del[k]) < TOMB_TTL) out[k] = num(del[k]); });
        return out;
    }
    function sexOk(s) { return s === 'boy' || s === 'girl'; }

    /* 이 폰에 있는 것 */
    function read() {
        var recs = getJSON(KEY, []), meta = getJSON(META, {}) || {};
        var sex = ''; try { sex = localStorage.getItem(SEX) || ''; } catch (e) {}
        return { records: Array.isArray(recs) ? recs.filter(valid) : [], deleted: prune(meta.deleted), sex: sexOk(sex) ? sex : '', sexAt: num(meta.sexAt) };
    }
    function write(g) {
        try {
            var recs = (g.records || []).slice().sort(function (a, b) { return String(a.date) > String(b.date) ? 1 : (String(a.date) < String(b.date) ? -1 : 0); });
            localStorage.setItem(KEY, JSON.stringify(recs));
            localStorage.setItem(META, JSON.stringify({ deleted: g.deleted || {}, sexAt: num(g.sexAt) }));
            if (sexOk(g.sex)) localStorage.setItem(SEX, g.sex);
        } catch (e) {}
    }
    function sig(g) {
        return JSON.stringify([(g.records || []).map(function (r) { return [r.date, num(r.at), num(r.height), num(r.weight)]; }).sort(),
                               Object.keys(g.deleted || {}).sort().map(function (k) { return k + ':' + g.deleted[k]; }), g.sex || '', num(g.sexAt)]);
    }

    /* a = 이 폰, b = 서버 */
    function merge(a, b) {
        a = a || {}; b = b || {};
        var del = {}, ad = prune(a.deleted), bd = prune(b.deleted);
        Object.keys(ad).concat(Object.keys(bd)).forEach(function (k) { del[k] = Math.max(num(ad[k]), num(bd[k])); });
        var map = {};
        function take(r, server) {
            if (!valid(r)) return;
            var cur = map[r.date];
            if (!cur || num(r.at) > num(cur.at) || (server && num(r.at) === num(cur.at))) map[r.date] = r;
        }
        (Array.isArray(a.records) ? a.records : []).forEach(function (r) { take(r, false); });
        (Array.isArray(b.records) ? b.records : []).forEach(function (r) { take(r, true); });
        var out = { deleted: del };
        out.records = Object.keys(map).sort().map(function (d) { return map[d]; })
            .filter(function (r) { return !(r.date in del) || num(r.at) > del[r.date]; });
        var sa = num(a.sexAt), sb = num(b.sexAt);
        var s = sa > sb ? a.sex : (sb > sa ? b.sex : (sexOk(b.sex) ? b.sex : a.sex));
        if (sexOk(s)) { out.sex = s; out.sexAt = Math.max(sa, sb); }
        return out;
    }
    function needsPush(m, sv) {
        sv = sv || {};
        var have = {};
        (Array.isArray(sv.records) ? sv.records : []).forEach(function (r) { if (valid(r)) have[r.date] = num(r.at); });
        if ((m.records || []).some(function (r) { return !(r.date in have) || num(r.at) > have[r.date]; })) return true;
        var sd = sv.deleted || {};
        if (Object.keys(m.deleted || {}).some(function (k) { return !(num(sd[k]) >= m.deleted[k]); })) return true;
        return (sexOk(m.sex) && !sexOk(sv.sex)) || num(m.sexAt) > num(sv.sexAt);
    }

    /* ---------- 서버 ---------- */
    function ref() {
        var c = (typeof window.getSyncCode === 'function') ? window.getSyncCode() : null;
        if (!c || !window.db || typeof window.doc !== 'function') return null;
        return window.doc(window.db, 'growth_' + c + (window.currentBabySuffix || ''), 'status');
    }
    function paint() {
        try { if (window.Growth && typeof window.Growth.render === 'function') window.Growth.render(); } catch (e) {}
        try { if (typeof window.plGrowthCard === 'function') window.plGrowthCard(); } catch (e) {}
    }
    function docOf(g) {
        var d = { records: g.records || [], deleted: g.deleted || {} };
        if (sexOk(g.sex)) { d.sex = g.sex; d.sexAt = num(g.sexAt); }
        return JSON.parse(JSON.stringify(d));
    }
    function push(g) {
        var r = ref();
        if (!r || typeof window.setDoc !== 'function') return Promise.resolve(false);
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            try { localStorage.setItem('tosil_offline_queue_growth', 'true'); } catch (e) {}
            return Promise.resolve(false);
        }
        return window.setDoc(r, docOf(g)).then(function () {
            try { localStorage.removeItem('tosil_offline_queue_growth'); } catch (e) {}
            return true;
        }, function (e) {
            console.warn('[성장] 올리기 실패', e);
            try { localStorage.setItem('tosil_offline_queue_growth', 'true'); } catch (e2) {}
            return false;
        });
    }
    /* 서버 것과 합쳐서 올린다 (이 폰엔 이미 남겼다) */
    function sync() {
        var r = ref();
        if (!r || typeof window.getDoc !== 'function') return push(read());
        return window.getDoc(r).then(function (snap) {
            var m = (snap && snap.exists()) ? merge(read(), snap.data() || {}) : merge(read(), {});
            if (sig(m) !== sig(read())) { write(m); paint(); }
            return push(m);
        }, function () { return push(read()); });
    }
    var unsub = null, pushT = null;
    function later() { clearTimeout(pushT); pushT = setTimeout(function () { push(read()); }, 1500); }
    function listen() {
        var r = ref();
        if (!r || typeof window.onSnapshot !== 'function') return;
        if (unsub) { try { unsub(); } catch (e) {} unsub = null; }
        var u = window.onSnapshot(r, function (snap) {
            var local = read();
            if (!snap.exists()) {
                if (local.records.length || Object.keys(local.deleted).length || local.sex) later();
                return;
            }
            var sv = snap.data() || {}, m = merge(local, sv);
            if (sig(m) !== sig(local)) { write(m); paint(); }
            if (needsPush(m, sv)) later();
        }, function (e) { console.warn('성장 기록 실시간 연동 에러 (오프라인 모드)', e); });
        unsub = (typeof window.addLiveListener === 'function') ? window.addLiveListener(u) : u;
    }

    /* ---------- 고치기 ---------- */
    /* 한 날짜의 기록을 넣거나 바꾼다. rec = { date, height, weight, month } */
    function put(rec) {
        var g = read(), now = Date.now();
        var r = { date: rec.date, month: num(rec.month), height: num(rec.height), weight: num(rec.weight), at: now };
        var by = role(); if (by) r.by = by;
        g.records = g.records.filter(function (x) { return x.date !== r.date; }).concat([r]);
        write(g); paint();
        return sync();
    }
    function remove(date) {
        var g = read();
        g.deleted[date] = Date.now();
        g.records = g.records.filter(function (x) { return x.date !== date; });
        write(g); paint();
        return sync();
    }
    function setSex(s) {
        if (!sexOk(s)) return Promise.resolve(false);
        var g = read();
        g.sex = s; g.sexAt = Date.now();
        write(g); paint();
        return sync();
    }

    window.GrowthSync = { read: read, merge: merge, needsPush: needsPush, put: put, remove: remove, setSex: setSex, sync: sync, listen: listen };
})();
