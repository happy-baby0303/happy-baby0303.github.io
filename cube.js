/* ============================================================
   배냇함 — 이유식 큐브 냉장고 (cube.js)

   ⚠️ 예전
      · 넣기 · 쓰기마다 목록 전체를 서버에 통째로 덮어쓰고, 받을 때도 서버 것으로 통째로 바꿨다.
        엄마가 큐브를 넣는 사이 아빠가 하나 쓰면, 나중에 쓴 쪽이 다른 쪽 것을 지웠다
      · 가족 코드가 없으면(혼자 쓰는 폰) 넣기 · 쓰기를 눌러도 아무것도 안 남았다
        (서버에 올릴 곳이 없으면 이 폰에 남기기 전에 돌아갔다)
      · 이유식 화면에서 뺀 큐브는 0개가 돼도 목록에 남았다
      · 이름을 그대로 화면에 넣었다 (짝꿍 폰에서 온 글도)
      · 고기 · 채소 두 가지뿐이었다
   지금
      · 큐브마다 고친 시각(at). 받을 때도 올리기 전에도 큐브 단위로 합친다. 다 쓴 큐브는 묘비(tosil_cube_meta)
      · 이 폰에 먼저 남기고, 가족 코드가 있으면 올린다
      · 고기 · 채소 · 과일 · 육수·죽 · 기타. 얼린 지 2주가 지나면 '2주 넘음'
   서버: cube_가족코드[_아기]/status = { records: [...], deleted: { id: 지운 시각 } }
   ============================================================ */
(function () {
    'use strict';
    var KEY = 'tosil_cube_records', META = 'tosil_cube_meta', TOMB_TTL = 180 * 86400000;
    var CATS = { meat: '🥩', veg: '🥦', fruit: '🍎', soup: '🍲', etc: '🧊' };

    function num(v) { return Number(v) || 0; }
    function $(id) { return document.getElementById(id); }
    function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function toast(m) { if (typeof window.showToast === 'function') window.showToast(m); }
    function role() { var r = ''; try { r = localStorage.getItem('user_role') || ''; } catch (e) {} return r === 'dad' ? 'dad' : (r === 'mom' ? 'mom' : ''); }
    function getJSON(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
    function qtyOf(r) { return num(r.qty != null ? r.qty : (r.quantity != null ? r.quantity : (r.count != null ? r.count : r.amount))); }
    function prune(del) {
        var out = {}, now = Date.now();
        Object.keys(del || {}).forEach(function (k) { if (now - num(del[k]) < TOMB_TTL) out[k] = num(del[k]); });
        return out;
    }
    function valid(r) { return !!(r && typeof r === 'object' && r.id); }

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
    function sig(g) { return JSON.stringify([g.records.map(function (r) { return [r.id, num(r.at), qtyOf(r)]; }).sort(), Object.keys(g.deleted).sort()]); }
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
            .filter(function (r) { return (!(r.id in del) || num(r.at) > del[r.id]) && qtyOf(r) > 0; });
        /* 0개가 된 큐브(이유식 화면에서 뺀 것)는 묘비로 */
        Object.keys(map).forEach(function (k) { if (qtyOf(map[k]) <= 0 && !(k in del)) del[k] = Math.max(num(map[k].at), 1); });
        return { records: records, deleted: del };
    }
    function needsPush(m, sv) {
        var have = {};
        (Array.isArray(sv && sv.records) ? sv.records : []).forEach(function (r) { if (valid(r)) have[r.id] = [num(r.at), qtyOf(r)]; });
        if (m.records.some(function (r) { return !(r.id in have) || num(r.at) > have[r.id][0] || (num(r.at) === have[r.id][0] && qtyOf(r) !== have[r.id][1]); })) return true;
        var sd = (sv && sv.deleted) || {};
        return Object.keys(m.deleted).some(function (k) { return !(num(sd[k]) >= m.deleted[k]); });
    }
    function ref() {
        var c = (typeof window.getSyncCode === 'function') ? window.getSyncCode() : null;
        if (!c || !window.db || typeof window.doc !== 'function') return null;
        return window.doc(window.db, 'cube_' + c + (window.currentBabySuffix || ''), 'status');
    }
    function push(g) {
        var r = ref();
        if (!r || typeof window.setDoc !== 'function') return Promise.resolve(false);
        return window.setDoc(r, JSON.parse(JSON.stringify({ records: g.records, deleted: g.deleted }))).then(function () {
            try { localStorage.removeItem('tosil_cube_pending_sync'); } catch (e) {}
            return true;
        }, function (e) { console.warn('[큐브] 올리기 실패', e); return false; });
    }
    function sync() {
        var r = ref();
        if (!r || typeof window.getDoc !== 'function') return push(read());
        return window.getDoc(r).then(function (snap) {
            var m = merge(read(), (snap && snap.exists()) ? (snap.data() || {}) : {});
            if (sig(m) !== sig(read())) { write(m); render(); }
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
            if (sig(m) !== sig(local)) { write(m); }
            render();
            if (needsPush(m, sv)) { clearTimeout(pushT); pushT = setTimeout(function () { push(read()); }, 1500); }
        }, function (e) { console.warn('큐브 실시간 연동 에러 (오프라인 모드)', e); });
        unsub = (typeof window.addLiveListener === 'function') ? window.addLiveListener(u) : u;
    }
    function save(g) { g = merge(g, {}); write(g); render(); sync(); }

    /* ---------- 화면 ---------- */
    function badge(dateStr) {
        var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateStr || ''));
        var t = new Date(); t.setHours(0, 0, 0, 0);
        var d = m ? Math.floor((t - new Date(+m[1], +m[2] - 1, +m[3])) / 86400000) : NaN;
        var color = '#7F77DD', bg = '#F2F0FC', text = '보관 ' + d + '일째';
        if (!isFinite(d) || d < 0) { text = '날짜 확인'; color = '#A3958A'; bg = '#F7F3ED'; }
        else if (d === 0) { text = '오늘 얼림'; color = '#B98A2E'; bg = '#FAF4E6'; }
        else if (d > 14) { text = '보관 ' + d + '일째 · 2주 넘음'; color = '#A07722'; bg = '#FBF3E4'; }
        return '<span style="background:' + bg + '; color:' + color + '; font-size:11px; font-weight:800; padding:4px 8px; border-radius:6px; border:1px solid ' + color + ';">' + text + '</span>';
    }
    function render() {
        var box = $('cube-list-container'); if (!box) return;
        var recs = read().records.slice();
        if (!recs.length) {
            box.innerHTML = '<div style="text-align:center; padding:30px; background:var(--bg-sub); border-radius:16px; border:1px dashed var(--border);">' +
                '<div style="font-size:24px; margin-bottom:10px;">🌬️</div><div style="font-size:13.5px; font-weight:800; color:var(--text-s); line-height:1.6;">넣어 둔 큐브가 없어요<br>얼린 날을 적어 두면 오래된 것부터 보여요</div></div>';
            return;
        }
        recs.sort(function (a, b) { return String(a.date) < String(b.date) ? -1 : (String(a.date) > String(b.date) ? 1 : 0); });
        var old = 0;
        box.innerHTML = recs.map(function (r) {
            var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(r.date || ''));
            if (m) { var t = new Date(); t.setHours(0, 0, 0, 0); if ((t - new Date(+m[1], +m[2] - 1, +m[3])) / 86400000 > 14) old++; }
            var by = r.by === 'mom' ? ' · 엄마' : (r.by === 'dad' ? ' · 아빠' : '');
            return '<div style="background:var(--bg-card); border:1px solid var(--border); padding:14px 16px; border-radius:16px; margin-bottom:8px;">' +
                '<div style="display:flex; align-items:center; gap:12px;">' +
                    '<div style="font-size:22px; background:var(--bg-sub); width:40px; height:40px; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">' + (CATS[r.cat] || '🧊') + '</div>' +
                    '<div style="flex:1; min-width:0; font-size:15px; font-weight:900; color:var(--text-m); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + esc(r.name) + '</div>' +
                    '<button type="button" onclick="useCube(\'' + esc(r.id) + '\')" style="background:#F7F3ED; color:#7A6F68; border:none; border-radius:10px; width:52px; height:38px; font-size:13.5px; font-weight:900; cursor:pointer; flex-shrink:0; font-family:inherit;">1개 쓰기</button>' +
                '</div>' +
                '<div style="display:flex; align-items:center; gap:6px; margin-top:10px; padding-left:2px; font-size:11.5px; color:var(--text-s); white-space:nowrap;">' +
                    '<span style="flex-shrink:0; display:inline-flex; align-items:center;">' + badge(r.date) + '</span>' +
                    '<span style="opacity:0.75; flex-shrink:0;">' + esc(String(r.date || '').substring(5).replace('-', '.')) + ' 얼림' + by + '</span>' +
                    '<span style="margin-left:auto; font-weight:900; color:var(--primary); font-size:13px; flex-shrink:0;">' + qtyOf(r) + '개</span>' +
                '</div></div>';
        }).join('') + (old ? '<div style="font-size:12px; font-weight:700; color:#8A7F78; line-height:1.55; margin-top:6px; word-break:keep-all;">얼린 지 2주가 지난 큐브가 ' + old + '가지 있어요. 먼저 쓰거나, 냄새 · 색이 이상하면 버려 주세요.</div>' : '');
    }

    /* ---------- 고치기 ---------- */
    window.addCubeRecord = function () {
        var cat = ($('cube-category') || {}).value || 'veg';
        var name = String(($('cube-name') || {}).value || '').trim().slice(0, 20);
        var date = ($('cube-date') || {}).value;
        var qty = parseInt(($('cube-qty') || {}).value, 10);
        if (!name || !date || isNaN(qty) || qty <= 0) return toast('큐브 이름 · 날짜 · 개수를 적어 주세요');
        if (qty > 99) return toast('개수가 너무 많아요 (99개까지)');
        var rec = { id: 'cube_' + Date.now() + Math.random().toString(36).slice(2, 5), cat: CATS[cat] ? cat : 'etc', name: name, date: date, qty: qty, timestamp: Date.now(), at: Date.now() };
        var by = role(); if (by) rec.by = by;
        var g = read(); g.records.push(rec); save(g);
        if ($('cube-name')) $('cube-name').value = '';
        if ($('cube-qty')) $('cube-qty').value = '';
        toast(name + ' 큐브 ' + qty + '개를 넣었어요');
    };
    window.useCube = function (id) {
        var g = read(), left = -1, name = '';
        g.records = g.records.map(function (r) {
            if (r.id !== id) return r;
            var c = Object.assign({}, r); c.qty = Math.max(0, qtyOf(r) - 1); c.at = Date.now();
            left = c.qty; name = r.name;
            return c;
        });
        if (left < 0) return;
        if (left === 0) g.deleted[id] = Date.now();
        save(g);
        toast(left > 0 ? name + ' 1개 썼어요 · ' + left + '개 남았어요' : name + ' 큐브를 다 썼어요');
    };
    window.renderCubes = render;
    window.startCubeRealtimeSync = function () { listen(); };
    window.CubeSync = { read: read, merge: merge, needsPush: needsPush, sync: sync, listen: listen, render: render };

    /* 이유식 화면(food)에서 큐브를 뺐다면 — 그 화면이 '보낼 것' 표시를 남긴다. 합쳐서 올린다 */
    function flushPending() {
        var p = null; try { p = localStorage.getItem('tosil_cube_pending_sync'); } catch (e) {}
        if (p) sync();
    }
    /* 얼린 날 칸은 오늘로 (예전 script.js 가 하던 일 — 아침 9시 전에도 오늘이게 이 폰 날짜로) */
    function today() {
        var d = $('cube-date'); if (!d || d.value) return;
        var n = new Date();
        d.value = n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0');
    }
    function boot() { today(); render(); setTimeout(flushPending, 2500); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
