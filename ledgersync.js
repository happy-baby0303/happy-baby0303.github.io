/* ============================================================
   배냇함 — 가계부 합치기 (ledgersync.js)

   ⚠️ 가계부는 문서 하나(ledger_가족코드/status)를 통째로 덮어썼다.
      두 폰이 비슷한 때 적거나, 한 폰이 인터넷이 끊긴 채 적었다가 다시 이어지면
      그사이 다른 폰에서 적은 기록이 덮여서 사라졌다. 받을 때도 서버 것으로 통째로 바꿨다.
   ⚠️ 기록을 200개까지만 남겨서, 하루 서너 개씩 적으면 두 달 안에 옛 기록부터 지워졌다.

   그래서
     · 기록마다 id · 시각(ts) · 적은 사람(by)을 붙이고, 올리기 전에 서버 것과 기록 단위로 합친다
     · 받을 때도 합친다. 서버에 없는 게 이 폰에 있으면 한 번 더 올린다 (서버가 다 가지면 멈춘다)
     · 지운 기록은 묘비(deleted)를 같이 올려서 되살아나지 않게 한다 (180일 뒤 치운다)
     · '전부 비우기' 는 비운 시각(resetAt) — 그 전 기록은 어느 폰에서 와도 다시 들어오지 않는다
     · 이번 달 예산(budget)도 문서에 같이 둔다 — 나중에 고친 쪽 (예전엔 폰마다 따로라 '남은 예산' 이 달랐다)
     · 기록은 4000개까지 (문서 하나 1MB 안쪽)
   옛 기록(id 없음)은 내용과 '같은 내용 중 몇 번째' 로 id 를 만든다 — 두 폰이 같은 id 를 만든다.
   합계(total · savedTotal · categories)는 기록에서 다시 센다. 예전에 잘려 나간 기록의 합은 base 에 한 번 남긴다.

   script.js 의 saveLedgerToFirebase · startLedgerRealtimeSync 가 이 파일(window.Ledger)을 부른다.
   index.html: graveyard.js 다음
   ============================================================ */
(function () {
    'use strict';
    var KEY = 'tosil_ledger_data', CAP = 4000, TOMB_TTL = 180 * 86400000;

    function num(v) { return Number(v) || 0; }
    function role() { var r = ''; try { r = localStorage.getItem('user_role') || ''; } catch (e) {} return (r === 'mom' || r === 'dad') ? r : ''; }
    function read() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
    function writeLocal(led) { try { localStorage.setItem(KEY, JSON.stringify(led)); } catch (e) {} }
    function sig(v) { return (typeof window.syncSig === 'function') ? window.syncSig(v) : JSON.stringify(v); }
    function catOf(h) {
        if (typeof window.moneyCatOf === 'function') return window.moneyCatOf(h);
        var c = String(h.catName || ''); return c.indexOf('위생') > -1 ? 'diaper' : (c.indexOf('식비') > -1 ? 'food' : 'etc');
    }
    function hash(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
    function ymOf(ts) { var d = new Date(ts); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }

    /* 옛 기록의 시각 — 'M/D HH:MM' 과 ym(있으면 연도) */
    function tsOf(h) {
        if (num(h.ts)) return num(h.ts);
        var m = /^(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})/.exec(String(h.time || ''));
        if (!m) return 0;
        var y = /^(\d{4})-(\d{1,2})/.exec(String(h.ym || '')), now = new Date();
        var year = y ? Number(y[1]) : now.getFullYear();
        if (!y && Number(m[1]) > now.getMonth() + 1) year--;
        return new Date(year, Number(m[1]) - 1, Number(m[2]), Number(m[3]), Number(m[4])).getTime();
    }
    function sums(hist) {
        var s = { total: 0, saved: 0, cats: { diaper: 0, food: 0, etc: 0 } };
        hist.forEach(function (h) {
            var a = num(h.amount);
            if (h.type === 'saving') s.saved += a; else { var k = catOf(h); s.total += a; s.cats[k] = num(s.cats[k]) + a; }
        });
        return s;
    }
    function derive(led) {
        var s = sums(led.history || []), b = led.base || {};
        led.total = num(b.total) + s.total;
        led.savedTotal = num(b.saved) + s.saved;
        led.categories = s.cats;
        return led;
    }
    function prune(del) {
        var out = {}, now = Date.now();
        Object.keys(del || {}).forEach(function (k) { if (now - num(del[k]) < TOMB_TTL) out[k] = num(del[k]); });
        return out;
    }

    function normalize(src) {
        var led = (src && typeof src === 'object') ? JSON.parse(JSON.stringify(src)) : {};
        var hist = Array.isArray(led.history) ? led.history.filter(function (h) { return h && typeof h === 'object'; }) : [];
        var seen = {};
        hist.forEach(function (h) {
            if (!h.id) {
                var k = 'o' + hash([h.ym || '', h.time || '', num(h.amount), h.type || '', h.catName || '', h.memo || ''].join('|'));
                seen[k] = (seen[k] || 0) + 1;
                h.id = k + (seen[k] > 1 ? '_' + seen[k] : '');
            }
            if (!num(h.ts)) { var t = tsOf(h); if (t) h.ts = t; }
            if (!h.ym && num(h.ts)) h.ym = ymOf(h.ts);
        });
        led.deleted = prune((led.deleted && typeof led.deleted === 'object' && !Array.isArray(led.deleted)) ? led.deleted : {});
        led.resetAt = num(led.resetAt);
        if (led.resetAt) hist = hist.filter(function (h) { return !num(h.ts) || num(h.ts) > led.resetAt; });
        hist = hist.filter(function (h) { return !led.deleted[h.id]; });
        if (!led.base || typeof led.base !== 'object') {
            /* 처음 한 번 — 예전에 200개를 넘어 잘려 나간 기록의 합 (목표 달성률 · 누적이 줄지 않게) */
            var s = sums(hist);
            led.base = { total: Math.max(0, num(led.total) - s.total), saved: Math.max(0, num(led.savedTotal) - s.saved) };
        }
        hist.sort(function (x, y) { return num(y.ts) - num(x.ts); });
        led.history = hist.slice(0, CAP);
        return derive(led);
    }

    /* a = 이 폰, b = 서버 */
    function merge(a, b) {
        a = normalize(a); b = normalize(b);
        var out = {};
        var g = num(a.goalAt) > num(b.goalAt) ? a : b;
        out.goal = (g.goal != null) ? g.goal : (a.goal || b.goal || '');
        out.goalAmount = (g.goalAmount != null) ? g.goalAmount : (a.goalAmount || b.goalAmount || 100000);
        out.goalAt = Math.max(num(a.goalAt), num(b.goalAt));
        /* 예산 — 나중에 고친 쪽. 시각이 같으면 서버 것 (두 폰이 같은 값으로 모인다) */
        var bu = num(a.budgetAt) > num(b.budgetAt) ? a : (num(b.budgetAt) > num(a.budgetAt) ? b : null);
        var budget = bu ? bu.budget : (b.budget != null ? b.budget : a.budget);
        if (num(budget) > 0) { out.budget = num(budget); out.budgetAt = Math.max(num(a.budgetAt), num(b.budgetAt)); }
        out.resetAt = Math.max(num(a.resetAt), num(b.resetAt));
        if (num(a.resetAt) !== num(b.resetAt)) out.base = num(a.resetAt) > num(b.resetAt) ? a.base : b.base;
        else out.base = { total: Math.max(num(a.base.total), num(b.base.total)), saved: Math.max(num(a.base.saved), num(b.base.saved)) };
        out.deleted = prune(Object.assign({}, b.deleted, a.deleted));
        var map = {};
        b.history.concat(a.history).forEach(function (h) {
            if (!h.id || out.deleted[h.id] || map[h.id]) return;
            if (out.resetAt && num(h.ts) && num(h.ts) <= out.resetAt) return;
            map[h.id] = h;
        });
        out.history = Object.keys(map).map(function (k) { return map[k]; })
            .sort(function (x, y) { return num(y.ts) - num(x.ts); }).slice(0, CAP);
        return derive(out);
    }
    function needsPush(m, sv) {
        var ids = {}; (sv.history || []).forEach(function (h) { ids[h.id] = 1; });
        if ((m.history || []).some(function (h) { return !ids[h.id]; })) return true;
        var sd = sv.deleted || {};
        if (Object.keys(m.deleted || {}).some(function (k) { return !(k in sd); })) return true;
        return num(m.resetAt) > num(sv.resetAt) || num(m.goalAt) > num(sv.goalAt) || num(m.budgetAt) > num(sv.budgetAt);
    }

    /* ---------- 서버 ---------- */
    function ref() {
        var c = (typeof window.getSyncCode === 'function') ? window.getSyncCode() : null;
        if (!c || !window.db || typeof window.doc !== 'function') return null;
        return window.doc(window.db, 'ledger_' + c + (window.currentBabySuffix || ''), 'status');
    }
    function paint() {
        try { if (typeof window.updateLedgerUI === 'function') window.updateLedgerUI(); } catch (e) {}
        try { if (typeof window.analyzeMoney === 'function') window.analyzeMoney(); } catch (e) {}
        try { if (typeof window.updateHomeDashboard === 'function') window.updateHomeDashboard(); } catch (e) {}
    }
    function push(led) {
        var r = ref();
        if (!r || typeof window.setDoc !== 'function') return Promise.resolve(false);
        return window.setDoc(r, JSON.parse(JSON.stringify(led))).then(function () { return true; },
            function (e) { console.warn('[가계부] 올리기 실패', e); return false; });
    }
    /* 저장: 이 폰에 먼저 남기고, 서버 것과 합쳐서 올린다 */
    function save(data) {
        writeLocal(normalize(data)); paint();
        var r = ref();
        if (!r || typeof window.getDoc !== 'function') return push(read());
        return window.getDoc(r).then(function (snap) {
            var m = (snap && snap.exists()) ? merge(read(), snap.data() || {}) : normalize(read());
            writeLocal(m); paint();
            return push(m);
        }, function () { return push(normalize(read())); });
    }
    var unsub = null, pushT = null;
    function later() { clearTimeout(pushT); pushT = setTimeout(function () { push(normalize(read())); }, 1500); }
    function listen() {
        var r = ref();
        if (!r || typeof window.onSnapshot !== 'function') return;
        if (unsub) { try { unsub(); } catch (e) {} unsub = null; }
        var u = window.onSnapshot(r, function (snap) {
            var local = normalize(read());
            if (!snap.exists()) {
                if (local.history.length || local.goal || local.resetAt) later();
            } else {
                var sv = normalize(snap.data() || {}), m = merge(local, sv);
                if (sig(m) !== sig(read())) writeLocal(m);
                if (needsPush(m, sv)) later();
            }
            paint();
        }, function (e) { console.warn('가계부 실시간 연동 에러 (오프라인 모드)', e); });
        unsub = (typeof window.addLiveListener === 'function') ? window.addLiveListener(u) : u;
    }

    /* ---------- 고치기 ---------- */
    function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
    function remove(id) {
        var led = normalize(read());
        led.deleted[id] = Date.now();
        return save(led);
    }
    function clearMonth(ym) {
        var led = normalize(read()), now = Date.now();
        led.history.forEach(function (h) { if (h.ym === ym) led.deleted[h.id] = now; });
        return save(led);
    }
    function clearAll() {
        var led = normalize(read());
        led.resetAt = Date.now(); led.base = { total: 0, saved: 0 };
        return save(led);
    }

    window.Ledger = { normalize: normalize, merge: merge, save: save, listen: listen, remove: remove,
                      clearMonth: clearMonth, clearAll: clearAll, newId: newId, role: role, CAP: CAP };
})();
