/* ============================================================
   배냇함 — 바통터치 같이 보기 (baton.js)

   ⚠️ 부탁 · 받기 · 끝내기 · 내려놓기마다 목록 전체를 서버에 통째로 덮어쓰고(baton_가족코드/status),
      받을 때도 서버 것으로 통째로 바꿨다. 바통터치는 두 사람이 동시에 만지는 도구라,
      엄마가 부탁을 보내는 사이 아빠가 다른 부탁을 '받기' 하면 나중에 쓴 쪽이 다른 쪽 것을 지웠다.
      끝낸 부탁은 목록에서 빼기만 해서, 옛 목록을 든 폰이 올리면 끝낸 부탁이 되살아났다.
   그래서
     · 부탁마다 고친 시각(at). 받을 때도 올리기 전에도 부탁 단위로 합친다 (나중에 고친 쪽)
     · 끝내거나 지운 부탁은 묘비(tosil_baton_meta.deleted) — 되살아나지 않는다 (180일 뒤 치운다)
     · script.js 의 saveBatonToFirebase(목록) 은 그대로 부른다 — 앞 목록과 견줘서 바뀐 부탁엔 시각을, 빠진 부탁엔 묘비를 단다
     · 큐레이터(shared/familysend.js)도 묘비를 지우지 않게 고쳤다
   서버: baton_가족코드/status = { records: [...], deleted: { id: 지운 시각 } } — 가족 하나 (아기마다가 아니다)
   ============================================================ */
(function () {
    'use strict';
    var KEY = 'tosil_baton_records', META = 'tosil_baton_meta', TOMB_TTL = 180 * 86400000, CAP = 60;

    function num(v) { return Number(v) || 0; }
    function getJSON(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
    function prune(del) {
        var out = {}, now = Date.now();
        Object.keys(del || {}).forEach(function (k) { if (now - num(del[k]) < TOMB_TTL) out[k] = num(del[k]); });
        return out;
    }
    function valid(r) { return !!(r && typeof r === 'object' && r.id); }
    function born(r) { var m = /(\d{10,})/.exec(String(r.id || '')); return m ? Number(m[1]) : num(r.at); }
    function strip(r) { var c = Object.assign({}, r); delete c.at; return JSON.stringify(c); }

    function read() {
        var recs = getJSON(KEY, []), meta = getJSON(META, {}) || {};
        return { records: Array.isArray(recs) ? recs.filter(valid) : [], deleted: prune(meta.deleted) };
    }
    function write(g) {
        try {
            localStorage.setItem(KEY, JSON.stringify(g.records));
            localStorage.setItem(META, JSON.stringify({ deleted: g.deleted }));
        } catch (e) {}
    }
    function sig(g) { return JSON.stringify([g.records.map(function (r) { return [r.id, num(r.at), r.status]; }), Object.keys(g.deleted).sort()]); }
    function merge(a, b) {
        a = a || {}; b = b || {};
        var del = {}, ad = prune(a.deleted), bd = prune(b.deleted);
        Object.keys(ad).concat(Object.keys(bd)).forEach(function (k) { del[k] = Math.max(num(ad[k]), num(bd[k])); });
        var map = {};
        function take(r, server) {
            if (!valid(r)) return;
            var cur = map[r.id];
            if (!cur || num(r.at) > num(cur.at) || (server && num(r.at) === num(cur.at))) map[r.id] = r;
        }
        (Array.isArray(a.records) ? a.records : []).forEach(function (r) { take(r, false); });
        (Array.isArray(b.records) ? b.records : []).forEach(function (r) { take(r, true); });
        var records = Object.keys(map).map(function (k) { return map[k]; })
            .filter(function (r) { return !(r.id in del) || num(r.at) > del[r.id]; });
        records.sort(function (x, y) { return born(y) - born(x); });
        return { records: records.slice(0, CAP), deleted: del };
    }
    function needsPush(m, sv) {
        var have = {};
        (Array.isArray(sv && sv.records) ? sv.records : []).forEach(function (r) { if (valid(r)) have[r.id] = num(r.at); });
        if (m.records.some(function (r) { return !(r.id in have) || num(r.at) > have[r.id]; })) return true;
        var sd = (sv && sv.deleted) || {};
        return Object.keys(m.deleted).some(function (k) { return !(num(sd[k]) >= m.deleted[k]); });
    }
    function ref() {
        var c = (typeof window.getSyncCode === 'function') ? window.getSyncCode() : null;
        if (!c || !window.db || typeof window.doc !== 'function') return null;
        return window.doc(window.db, 'baton_' + c, 'status');
    }
    function paint() {
        try { if (typeof window.renderBatonTasks === 'function') window.renderBatonTasks(); } catch (e) {}
        try { if (typeof window.renderHomeBatonList === 'function') window.renderHomeBatonList(); } catch (e) {}
        try { if (typeof window.refreshHomeFix === 'function') window.refreshHomeFix(); } catch (e) {}
    }
    function push(g) {
        var r = ref();
        if (!r || typeof window.setDoc !== 'function') return Promise.resolve(false);
        return window.setDoc(r, JSON.parse(JSON.stringify({ records: g.records, deleted: g.deleted }))).then(function () { return true; }, function (e) { console.warn('[바통터치] 서버 저장 실패', e); return false; });
    }
    function sync() {
        var r = ref();
        if (!r || typeof window.getDoc !== 'function') return push(read());
        return window.getDoc(r).then(function (snap) {
            var m = merge(read(), (snap && snap.exists()) ? (snap.data() || {}) : {});
            if (sig(m) !== sig(read())) { write(m); paint(); }
            return push(m);
        }, function () { return push(read()); });
    }
    /* script.js 가 고친 목록을 통째로 넘긴다 — 앞 목록과 견줘서 시각 · 묘비를 단다 */
    function save(records) {
        var prev = read(), now = Date.now(), byId = {}, was = {};
        (Array.isArray(records) ? records : []).forEach(function (r) { if (valid(r)) byId[r.id] = r; });
        prev.records.forEach(function (r) { was[r.id] = r; if (!byId[r.id]) prev.deleted[r.id] = now; });
        var next = Object.keys(byId).map(function (k) {
            var r = byId[k], p = was[k], c = Object.assign({}, r);
            if (!p || strip(p) !== strip(r)) c.at = now;
            return c;
        });
        var g = merge({ records: next, deleted: prev.deleted }, {});
        write(g); paint();
        return sync();
    }
    var unsub = null, pushT = null;
    function listen() {
        var r = ref();
        if (!r || typeof window.onSnapshot !== 'function') return;
        if (unsub) { try { unsub(); } catch (e) {} unsub = null; }
        var u = window.onSnapshot(r, function (snap) {
            var local = read(), sv = snap.exists() ? (snap.data() || {}) : {};
            var m = merge(local, sv);
            if (sig(m) !== sig(local)) write(m);
            paint();
            if (needsPush(m, sv)) { clearTimeout(pushT); pushT = setTimeout(function () { push(read()); }, 1500); }
        }, function (e) { console.warn('바통터치 실시간 연동 에러 (오프라인 모드)', e); });
        unsub = (typeof window.addLiveListener === 'function') ? window.addLiveListener(u) : u;
    }

    window.BatonSync = { read: read, merge: merge, needsPush: needsPush, save: save, sync: sync, listen: listen };
})();
