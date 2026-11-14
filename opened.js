/* ============================================================
   배냇함 — 언제깠지 같이 보기 (opened.js)

   ⚠️ 언제깠지(tosil_open_records)는 이 폰에만 있었다. 서버에 올리는 곳도 받는 곳도 없었다.
      엄마가 분유 통에 '11월 2일 뜯음' 을 적어도 아빠 폰엔 아무것도 없었다 — 네임펜 대신이라면서 한 사람 것이었다.
      (script.js 의 '짝꿍 폰에서도 온다' 는 말은 사실이 아니었다)
   그래서
     · 기록마다 고친 시각(at) · 적은 사람(by). 받을 때도 올리기 전에도 기록 단위로 합친다
     · 지운 건 묘비(tosil_open_meta.deleted) — 지운 뒤에 다시 적은 것만 남는다 (180일 뒤 치운다)
     · '새로 뜯음' 은 같은 기록의 날짜를 바꾸고 시각을 올린다 (나중에 고친 쪽)
     · 젖병 · 유모차 큐레이터가 넣는 갈아 끼운 날(bottle_part)은 같은 이름이면 가장 최근 것 하나만
       (큐레이터는 묘비 없이 옛 줄을 지우고 새 줄을 넣는다 — 서버의 옛 줄이 되살아나지 않게)
   서버: opened_가족코드[_아기]/status = { items: [...], deleted: { id: 지운 시각 } }
   index.html: script.js 다음 (addOpenRecord · deleteOpenRecord · renewOpenRecord · clearExpiredRecords 를 바꿔 끼운다)
   ============================================================ */
(function () {
    'use strict';
    var KEY = 'tosil_open_records', META = 'tosil_open_meta', TOMB_TTL = 180 * 86400000;
    var LIMITS = { formula: 21, rx_syrup: 7, fever: 30, tub_oint: 30, tube_oint: 180, eye_drop: 30, cream: 180, puree: 2, wipe: 30 };

    function num(v) { return Number(v) || 0; }
    function $(id) { return document.getElementById(id); }
    function toast(m) { if (typeof window.showToast === 'function') window.showToast(m); }
    function role() { var r = ''; try { r = localStorage.getItem('user_role') || ''; } catch (e) {} return r === 'dad' ? 'dad' : (r === 'mom' ? 'mom' : ''); }
    function getJSON(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
    function todayStr() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
    function prune(del) {
        var out = {}, now = Date.now();
        Object.keys(del || {}).forEach(function (k) { if (now - num(del[k]) < TOMB_TTL) out[k] = num(del[k]); });
        return out;
    }
    function valid(r) { return !!(r && typeof r === 'object' && r.id); }

    function read() {
        var items = getJSON(KEY, []), meta = getJSON(META, {}) || {};
        return { items: Array.isArray(items) ? items.filter(valid) : [], deleted: prune(meta.deleted) };
    }
    function write(g) {
        try {
            localStorage.setItem(KEY, JSON.stringify(g.items));
            localStorage.setItem(META, JSON.stringify({ deleted: g.deleted }));
        } catch (e) {}
    }
    function sig(g) {
        return JSON.stringify([g.items.map(function (r) { return [r.id, num(r.at), r.openDate]; }).sort(), Object.keys(g.deleted).sort()]);
    }
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
        (Array.isArray(a.items) ? a.items : []).forEach(function (r) { take(r, false); });
        (Array.isArray(b.items) ? b.items : []).forEach(function (r) { take(r, true); });
        var items = Object.keys(map).map(function (k) { return map[k]; })
            .filter(function (r) { return !(r.id in del) || num(r.at) > del[r.id]; });
        /* 큐레이터의 갈아 끼운 날 — 같은 이름은 가장 최근 하나 */
        var part = {};
        items.forEach(function (r) {
            if (r.type !== 'bottle_part') return;
            var k = String(r.name || ''), cur = part[k];
            if (!cur || String(r.openDate || '') > String(cur.openDate || '') || (String(r.openDate || '') === String(cur.openDate || '') && num(r.at) > num(cur.at))) part[k] = r;
        });
        items = items.filter(function (r) { return r.type !== 'bottle_part' || part[String(r.name || '')] === r; });
        return { items: items, deleted: del };
    }
    function needsPush(m, sv) {
        var have = {};
        (Array.isArray(sv && sv.items) ? sv.items : []).forEach(function (r) { if (valid(r)) have[r.id] = num(r.at); });
        if (m.items.some(function (r) { return !(r.id in have) || num(r.at) > have[r.id]; })) return true;
        var sd = (sv && sv.deleted) || {};
        return Object.keys(m.deleted).some(function (k) { return !(num(sd[k]) >= m.deleted[k]); });
    }
    function ref() {
        var c = (typeof window.getSyncCode === 'function') ? window.getSyncCode() : null;
        if (!c || !window.db || typeof window.doc !== 'function') return null;
        return window.doc(window.db, 'opened_' + c + (window.currentBabySuffix || ''), 'status');
    }
    function paint() {
        try { if (typeof window.renderOpenRecords === 'function') window.renderOpenRecords(); } catch (e) {}
        try { if (typeof window.renderExpiryAlert === 'function') window.renderExpiryAlert(); } catch (e) {}
    }
    function push(g) {
        var r = ref();
        if (!r || typeof window.setDoc !== 'function') return Promise.resolve(false);
        return window.setDoc(r, JSON.parse(JSON.stringify({ items: g.items, deleted: g.deleted }))).then(function () { return true; }, function (e) { console.warn('[언제깠지] 올리기 실패', e); return false; });
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
    var unsub = null, pushT = null;
    function listen() {
        var r = ref();
        if (!r || typeof window.onSnapshot !== 'function') return;
        if (unsub) { try { unsub(); } catch (e) {} unsub = null; }
        var u = window.onSnapshot(r, function (snap) {
            var local = read(), sv = snap.exists() ? (snap.data() || {}) : {};
            var m = merge(local, sv);
            if (sig(m) !== sig(local)) { write(m); paint(); }
            if (needsPush(m, sv)) { clearTimeout(pushT); pushT = setTimeout(function () { push(read()); }, 1500); }
        }, function (e) { console.warn('언제깠지 실시간 연동 에러 (오프라인 모드)', e); });
        unsub = (typeof window.addLiveListener === 'function') ? window.addLiveListener(u) : u;
    }
    function save(g) { g = merge(g, {}); write(g); paint(); sync(); }

    /* ---------- 고르는 칸 · 직접 적기 ---------- */
    function custom() { var s = $('open-item-type'); return !!(s && s.value === 'custom'); }
    function syncCustomRow() {
        var row = $('open-custom'), guide = $('open-item-guide');
        var on = custom();
        if (row) row.style.display = on ? 'block' : 'none';
        if (guide && on) guide.style.display = 'none';
        else if (guide) guide.style.display = '';
    }

    /* ---------- 고치기 ---------- */
    window.addOpenRecord = function () {
        var sel = $('open-item-type'), di = $('open-item-date');
        if (!sel) return;
        var dateVal = di && di.value;
        if (!dateVal) return toast('뜯은 날짜를 골라 주세요');
        if (dateVal > todayStr()) return toast('뜯은 날이 오늘보다 뒤예요');
        var type = sel.value, name, emoji, limit;
        if (type === 'custom') {
            name = String(($('open-custom-name') || {}).value || '').trim().slice(0, 20);
            limit = Math.round(num(($('open-custom-days') || {}).value));
            if (!name) return toast('무엇을 뜯었는지 적어 주세요');
            if (!(limit >= 1 && limit <= 730)) return toast('며칠 안에 쓰는지 적어 주세요 (1~730일)');
            emoji = '🏷️';
        } else {
            var parts = sel.options[sel.selectedIndex].text.split(' ');
            emoji = parts[0];
            name = parts.slice(1).join(' ').split('/')[0].split('(')[0].trim();
            limit = LIMITS[type] || 30;
        }
        var rec = { id: 'open_' + Date.now() + Math.random().toString(36).slice(2, 5), type: type, name: name, emoji: emoji, openDate: dateVal, limitDays: limit, at: Date.now() };
        var by = role(); if (by) rec.by = by;
        var g = read(); g.items.push(rec);
        window.currentOpenFilter = 'all';
        save(g);
        if ($('open-custom-name')) $('open-custom-name').value = '';
        if ($('open-custom-days')) $('open-custom-days').value = '';
        toast('적어 뒀어요 · 짝꿍 폰에도 보여요');
    };
    function ask(o) { return typeof window.askChoice === 'function' ? window.askChoice(o) : Promise.resolve(o.options[0].value); }
    window.deleteOpenRecord = function (id) {
        ask({ title: '이 기록을 지울까요?', sub: '엄마 · 아빠 폰 모두에서 지워져요', options: [{ label: '지우기', value: 'del', danger: true }] }).then(function (v) {
            if (v !== 'del') return;
            var g = read(); g.deleted[id] = Date.now(); g.items = g.items.filter(function (r) { return r.id !== id; });
            save(g); toast('지웠어요');
        });
    };
    window.renewOpenRecord = function (id) {
        ask({ title: '오늘 새로 뜯었나요?', sub: '뜯은 날을 오늘로 바꿔요', options: [{ label: '오늘 새로 뜯었어요', value: 'ok' }] }).then(function (v) {
            if (v !== 'ok') return;
            var g = read(), by = role();
            g.items = g.items.map(function (r) {
                if (r.id !== id) return r;
                var c = Object.assign({}, r, { openDate: todayStr(), at: Date.now() });
                if (by) c.by = by;
                return c;
            });
            save(g); toast('오늘 새로 뜯은 걸로 바꿨어요');
        });
    };
    window.clearExpiredRecords = function () {
        ask({ title: '기한이 지난 것을 모두 지울까요?', sub: '엄마 · 아빠 폰 모두에서 지워져요', options: [{ label: '모두 지우기', value: 'del', danger: true }] }).then(function (v) {
            if (v !== 'del') return;
            var g = read(), t = new Date(); t.setHours(0, 0, 0, 0);
            var n = 0, now = Date.now();
            g.items = g.items.filter(function (r) {
                var m = /(\d{4})\D+(\d{1,2})\D+(\d{1,2})/.exec(String(r.openDate || ''));
                var lim = Number(r.limitDays);
                if (!m || !(isFinite(lim) && lim > 0)) return true;
                var od = new Date(+m[1], +m[2] - 1, +m[3]);
                var left = lim - Math.floor((t - od) / 86400000);
                if (left < 0) { g.deleted[r.id] = now; n++; return false; }
                return true;
            });
            save(g); toast('기한 지난 ' + n + '개를 치웠어요');
        });
    };
    var oldGuide = window.updateOpenItemGuide;
    window.updateOpenItemGuide = function () {
        if (typeof oldGuide === 'function' && !custom()) { try { oldGuide(); } catch (e) {} }
        syncCustomRow();
    };

    window.OpenSync = { read: read, merge: merge, needsPush: needsPush, sync: sync, listen: listen };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', syncCustomRow); else syncCustomRow();
})();
