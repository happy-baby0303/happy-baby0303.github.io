/* ============================================================
   배냇함 — 핫딜 계산기 (hotdeal.js)

   ⚠️ 예전 계산기
      · '전에 제일 싸게 산 값' 이 이 폰에만 있었다 (tosil_hd_best_*). 아빠가 기저귀를 살 땐 엄마가 산 값을 몰랐다
      · 값 하나만 남겨서 언제 · 얼마에 샀는지 볼 수 없었다. 칸을 고치면 누를 때마다 그 값으로 바뀌었다
      · 물티슈는 1팩, 분유는 1통으로 견줬다 — 70매 팩과 100매 팩, 750g 통과 800g 통을 같은 하나로 봤다
      · 기저귀는 단계를 안 봐서, 단계가 오르면 '전보다 비싸요' 만 나왔다 (큰 단계는 한 장 값이 원래 비싸다)
      · 가계부로 보내면 '📦 기타' 로 들어갔다 (기저귀 · 분유 항목이 생겼는데도)
   지금
      · 기저귀 · 물티슈는 1장, 분유는 100g 값으로 견준다. '60장 × 3팩', '800g × 3통' 처럼 적는다
      · 기저귀는 단계를 고르면 같은 단계끼리만 견준다
      · '샀어요' 를 누르면 그날 값이 남는다 (엄마 · 아빠 폰 모두 — 기록 단위로 합친다, 지운 건 묘비)
        가계부에도 같이 (기저귀·위생 / 분유·이유식 항목으로)
   서버: hotdeal_가족코드/status = { log: [...], deleted: { id: 지운 시각 } } — 아기마다가 아니라 가족 하나
   ============================================================ */
(function () {
    'use strict';
    var KEY = 'tosil_hd_log', TOMB_TTL = 180 * 86400000, CAP = 600;
    var ITEMS = {
        diaper: { name: '기저귀', unit: '장', pack: '팩', per: 1, perLabel: '1장', a: 60, b: 3, cat: 'diaper', link: 'https://link.coupang.com/a/fPSpeiTAD6' },
        wipe:   { name: '물티슈', unit: '장', pack: '팩', per: 1, perLabel: '1장', a: 70, b: 10, cat: 'diaper', link: 'https://link.coupang.com/a/fPSk40HKOi' },
        milk:   { name: '분유',   unit: 'g',  pack: '통', per: 100, perLabel: '100g', a: 800, b: 3, cat: 'food', link: 'https://link.coupang.com/a/fPSqFEMPcq' }
    };
    var STAGES = ['신생아', '1', '2', '3', '4', '5', '6'];
    var cur = { item: 'diaper', stage: '' }, last = null, toLedger = true;

    function $(id) { return document.getElementById(id); }
    function num(v) { return Number(String(v == null ? '' : v).replace(/,/g, '')) || 0; }
    function won(n) { return Math.round(n).toLocaleString() + '원'; }
    function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function toast(m) { if (typeof window.showToast === 'function') window.showToast(m); }
    function role() { var r = ''; try { r = localStorage.getItem('user_role') || ''; } catch (e) {} return r === 'dad' ? 'dad' : (r === 'mom' ? 'mom' : ''); }
    function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
    function dayLabel(ts) {
        var d = new Date(ts), md = (d.getMonth() + 1) + '월 ' + d.getDate() + '일';
        return d.getFullYear() === new Date().getFullYear() ? md : d.getFullYear() + '년 ' + md;
    }
    function stageLabel(s) { return !s ? '' : (s === '신생아' ? '신생아용' : s + '단계'); }
    /* 하나당 값 (기저귀 · 물티슈 1장, 분유 100g) */
    function perOf(price, qty, item) { var I = ITEMS[item]; return (I && qty > 0) ? price / qty * I.per : 0; }

    /* ---------- 저장 · 합치기 ---------- */
    function prune(del) {
        var out = {}, now = Date.now();
        Object.keys(del || {}).forEach(function (k) { if (now - num(del[k]) < TOMB_TTL) out[k] = num(del[k]); });
        return out;
    }
    function valid(e) { return !!(e && e.id && ITEMS[e.item] && (num(e.per) > 0 || num(e.legacy) > 0)); }
    function read() {
        var g = null; try { g = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
        g = g && typeof g === 'object' ? g : {};
        return { log: Array.isArray(g.log) ? g.log.filter(valid) : [], deleted: prune(g.deleted) };
    }
    function write(g) { try { localStorage.setItem(KEY, JSON.stringify({ log: g.log, deleted: g.deleted })); } catch (e) {} }
    function sig(g) { return JSON.stringify([g.log.map(function (e) { return e.id; }).sort(), Object.keys(g.deleted).sort()]); }
    function merge(a, b) {
        a = a || {}; b = b || {};
        var del = {}, ad = prune(a.deleted), bd = prune(b.deleted);
        Object.keys(ad).concat(Object.keys(bd)).forEach(function (k) { del[k] = Math.max(num(ad[k]), num(bd[k])); });
        var map = {};
        (Array.isArray(b.log) ? b.log : []).concat(Array.isArray(a.log) ? a.log : []).forEach(function (e) { if (valid(e) && !map[e.id]) map[e.id] = e; });
        var log = Object.keys(map).map(function (k) { return map[k]; }).filter(function (e) { return !(e.id in del); });
        log.sort(function (x, y) { return num(y.ts) - num(x.ts); });
        return { log: log.slice(0, CAP), deleted: del };
    }
    function needsPush(m, sv) {
        var have = {};
        (Array.isArray(sv && sv.log) ? sv.log : []).forEach(function (e) { if (e && e.id) have[e.id] = 1; });
        if (m.log.some(function (e) { return !have[e.id]; })) return true;
        var sd = (sv && sv.deleted) || {};
        return Object.keys(m.deleted).some(function (k) { return !(k in sd); });
    }
    function ref() {
        var c = (typeof window.getSyncCode === 'function') ? window.getSyncCode() : null;
        if (!c || !window.db || typeof window.doc !== 'function') return null;
        return window.doc(window.db, 'hotdeal_' + c, 'status');
    }
    function push(g) {
        var r = ref();
        if (!r || typeof window.setDoc !== 'function') return Promise.resolve(false);
        return window.setDoc(r, JSON.parse(JSON.stringify({ log: g.log, deleted: g.deleted }))).then(function () { return true; }, function (e) { console.warn('[핫딜] 올리기 실패', e); return false; });
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
            var local = read();
            var sv = snap.exists() ? (snap.data() || {}) : {};
            var m = merge(local, sv);
            if (sig(m) !== sig(local)) { write(m); paint(); }
            if (needsPush(m, sv)) { clearTimeout(pushT); pushT = setTimeout(function () { push(read()); }, 1500); }
        }, function (e) { console.warn('핫딜 기록 실시간 연동 에러 (오프라인 모드)', e); });
        unsub = (typeof window.addLiveListener === 'function') ? window.addLiveListener(u) : u;
    }
    /* 예전 계산기가 이 폰에 남긴 '제일 싸게 산 값' — 버리지 않고 한 줄로 옮긴다.
       물티슈는 1팩, 분유는 1통 값이라 지금 셈(1장 · 100g)과 견주지 않고 목록에만 보인다 */
    function migrate() {
        var g = read(), moved = false, by = role();
        ['diaper', 'wipe', 'milk'].forEach(function (k) {
            var v = 0; try { v = num(localStorage.getItem('tosil_hd_best_' + k)); } catch (e) {}
            if (!(v > 0)) return;
            var id = 'old-' + k + '-' + (by || 'me');
            if (!g.log.some(function (e) { return e.id === id; }) && !(id in g.deleted)) {
                g.log.push(k === 'diaper' ? { id: id, ts: 1, by: by, item: k, stage: '', per: v, old: 1 } : { id: id, ts: 1, by: by, item: k, stage: '', legacy: v, old: 1 });
                moved = true;
            }
            try { localStorage.removeItem('tosil_hd_best_' + k); } catch (e) {}
        });
        if (moved) { write(merge(g, {})); sync(); }
    }

    /* ---------- 견주기 ---------- */
    function sameKind(e, item, stage) { return e.item === item && (e.stage || '') === (stage || '') && num(e.per) > 0; }
    function best(item, stage, except) {
        var b = null;
        read().log.forEach(function (e) {
            if (except && e.id === except) return;
            if (sameKind(e, item, stage) && (!b || num(e.per) < num(b.per))) b = e;
        });
        return b;
    }
    /* 1장 값이 100원 아래(물티슈)면 소수 한 자리. 차이도 그 값의 자릿수를 따른다 (276원 − 250원 을 '25.5원' 으로 쓰지 않게) */
    function perText(item, per, base) {
        var I = ITEMS[item], b = base == null ? per : base;
        return I.perLabel + ' ' + (b < 100 && I.per === 1 ? (Math.round(per * 10) / 10).toLocaleString() + '원' : won(per));
    }

    /* ---------- 화면 ---------- */
    function css() {
        if ($('hd-style')) return;
        var s = document.createElement('style');
        s.id = 'hd-style';
        s.textContent =
            '#panel-hotdeal .hd-seg{display:flex;gap:0;background:#F3EEE7;border-radius:12px;padding:3px;}' +
            '#panel-hotdeal .hd-seg button{flex:1;border:none;background:transparent;padding:11px 0;border-radius:10px;font-size:14px;font-weight:800;color:#8A7F78;cursor:pointer;font-family:inherit;}' +
            '#panel-hotdeal .hd-seg button.on{background:#FFF;color:#4A413C;box-shadow:0 1px 4px rgba(0,0,0,0.08);}' +
            '#panel-hotdeal .hd-stages{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px;}' +
            '#panel-hotdeal .hd-stages button{padding:8px 11px;border-radius:999px;border:1px solid #EDE6DE;background:#FFF;font-size:12.5px;font-weight:800;color:#7A6F68;cursor:pointer;font-family:inherit;}' +
            '#panel-hotdeal .hd-stages button.on{background:#4A413C;border-color:#4A413C;color:#FFF;}' +
            '#panel-hotdeal .hd-lab{font-size:14px;font-weight:800;margin:0 0 10px;display:block;color:var(--text-m);}' +
            '#panel-hotdeal .hd-box{display:flex;align-items:center;background:#FBF8F3;border:1px solid #F0EAE2;border-radius:14px;padding-right:14px;box-sizing:border-box;}' +
            '#panel-hotdeal .hd-box input{flex:1;width:100%;min-width:0;padding:15px 10px;border:none;outline:none;font-weight:900;text-align:right;background:transparent;color:var(--text-m);font-size:16px;font-family:inherit;}' +
            '#panel-hotdeal .hd-box span{font-size:14px;font-weight:800;color:var(--text-m);flex-shrink:0;}' +
            '#panel-hotdeal .hd-qty{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center;}' +
            '#panel-hotdeal .hd-x{font-size:15px;font-weight:800;color:#A3958A;}' +
            '#panel-hotdeal .hd-hint{font-size:12px;font-weight:700;color:#8A7F78;margin-top:8px;line-height:1.5;word-break:keep-all;}' +
            '#panel-hotdeal .hd-verdict{font-size:14.5px;font-weight:900;padding:13px 14px;border-radius:12px;margin:14px 0 10px;line-height:1.5;word-break:keep-all;}' +
            '#panel-hotdeal .hd-row{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:12px 14px;background:#FBF8F3;border-radius:12px;margin-bottom:8px;}' +
            '#panel-hotdeal .hd-row-d{font-size:12px;color:#8A7F78;font-weight:800;}' +
            '#panel-hotdeal .hd-row-v{font-size:14px;font-weight:900;color:#4A413C;margin-top:2px;}' +
            '#panel-hotdeal .hd-row button{background:none;border:none;font-size:16px;color:#A3958A;cursor:pointer;padding:6px 4px;}' +
            '#panel-hotdeal .hd-best{display:inline-block;margin-left:6px;padding:2px 7px;border-radius:6px;background:#FBF3E4;color:#8A6416;font-size:11px;font-weight:800;}';
        document.head.appendChild(s);
    }
    function paintInputs() {
        var I = ITEMS[cur.item];
        [].forEach.call(document.querySelectorAll('#hd-seg button'), function (b) { b.classList.toggle('on', b.getAttribute('data-k') === cur.item); });
        var st = $('hd-stages');
        if (st) {
            st.style.display = cur.item === 'diaper' ? 'flex' : 'none';
            st.innerHTML = STAGES.map(function (s) {
                return '<button type="button" class="' + (cur.stage === s ? 'on' : '') + '" onclick="window.Hotdeal.stage(\'' + s + '\')">' + esc(stageLabel(s)) + '</button>';
            }).join('');
        }
        if ($('hd-unit-a')) $('hd-unit-a').textContent = I.unit;
        if ($('hd-unit-b')) $('hd-unit-b').textContent = I.pack;
        if ($('hd-qty-a')) $('hd-qty-a').placeholder = String(I.a);
        if ($('hd-qty-b')) $('hd-qty-b').placeholder = String(I.b);
        if ($('hd-total-price')) $('hd-total-price').placeholder = cur.item === 'milk' ? '89,000' : (cur.item === 'wipe' ? '15,900' : '45,000');
        if ($('hd-qty-hint')) $('hd-qty-hint').textContent = cur.item === 'milk'
            ? '통에 적힌 g 과 통 수예요. 100g 값으로 견줘서 750g · 800g 통도 바로 비교돼요'
            : (cur.item === 'wipe' ? '한 팩 매수와 팩 수예요 (예: 70매 × 10팩). 1장 값으로 견줘요'
                : '한 팩 장수와 팩 수예요 (예: 60매 × 3팩). 단계를 고르면 같은 단계끼리 견줘요');
    }
    function paintList() {
        var box = $('hd-log'), card = $('hd-log-card'); if (!box || !card) return;
        var I = ITEMS[cur.item];
        var rows = read().log.filter(function (e) { return e.item === cur.item; });
        if (!rows.length) { card.style.display = 'none'; box.innerHTML = ''; return; }
        card.style.display = 'block';
        if ($('hd-log-title')) $('hd-log-title').textContent = I.name + ' 산 값';
        var bestIds = {};
        rows.forEach(function (e) { if (num(e.per) > 0) { var b = best(e.item, e.stage); if (b) bestIds[b.id] = 1; } });
        box.innerHTML = rows.slice(0, 12).map(function (e) {
            var head = (e.old ? '예전 계산기에 적어 둔 값' : dayLabel(e.ts)) + (e.stage ? ' · ' + stageLabel(e.stage) : '') + (e.by === 'mom' ? ' · 엄마' : (e.by === 'dad' ? ' · 아빠' : ''));
            var val;
            if (num(e.legacy) > 0) val = '1' + I.pack + ' ' + won(e.legacy) + '<span style="font-size:12px; color:#A3958A; font-weight:700;"> · 1' + I.pack + ' 값이라 지금 비교에선 빼요</span>';
            else val = perText(e.item, num(e.per)) + (num(e.price) > 0 ? '<span style="font-size:12px; color:#8A7F78; font-weight:700;"> · ' + won(e.price) + ' / ' + num(e.qty).toLocaleString() + I.unit + '</span>' : '') +
                (bestIds[e.id] ? '<span class="hd-best">제일 쌌던 값</span>' : '');
            return '<div class="hd-row"><div><div class="hd-row-d">' + head + '</div><div class="hd-row-v">' + val + '</div></div>' +
                '<button type="button" aria-label="이 값 지우기" onclick="window.Hotdeal.remove(\'' + esc(e.id) + '\')">✕</button></div>';
        }).join('');
    }
    function paint() {
        if (!$('panel-hotdeal')) return;
        css(); paintInputs(); paintList();
    }

    function setItem(k) {
        if (!ITEMS[k] || k === cur.item) return;
        cur.item = k; cur.stage = ''; last = null;
        ['hd-total-price', 'hd-qty-a', 'hd-qty-b'].forEach(function (id) { if ($(id)) $(id).value = ''; });
        if ($('hd-result')) $('hd-result').style.display = 'none';
        paint();
    }
    function setStage(s) {
        cur.stage = cur.stage === s ? '' : s;
        if ($('hd-result')) $('hd-result').style.display = 'none';
        last = null;
        paint();
    }

    /* 하나당 값 보기 */
    window.calcHotDeal = function () {
        var I = ITEMS[cur.item];
        var price = num($('hd-total-price') && $('hd-total-price').value);
        var a = num($('hd-qty-a') && $('hd-qty-a').value), b = num($('hd-qty-b') && $('hd-qty-b').value) || 1;
        if (!price || !a) return toast('낸 돈과 ' + (cur.item === 'milk' ? '몇 g 인지' : '몇 장인지') + ' 적어 주세요');
        var qty = a * b, per = perOf(price, qty, cur.item);
        var bst = best(cur.item, cur.stage);
        last = { item: cur.item, stage: cur.stage, price: price, qty: qty, per: per, a: a, b: b };
        if ($('hd-unit-price')) $('hd-unit-price').textContent = perText(cur.item, per).replace(I.perLabel + ' ', '');
        if ($('hd-unit-of')) $('hd-unit-of').textContent = I.perLabel + '에';
        var v = $('hd-verdict'), c = $('hd-comment');
        var kind = I.name + (cur.stage ? ' ' + stageLabel(cur.stage) : '');
        if (!bst) {
            v.textContent = '처음 적는 ' + kind + ' 값이에요';
            v.style.cssText = 'background:#F3F1FC; color:#5B52B8;';
            c.innerHTML = '샀다면 아래 \'샀어요\' 로 남겨 두세요. 다음에 살 때 이 값과 견줘 드릴게요.';
        } else {
            var bp = num(bst.per), d = per - bp, tot = Math.abs(d) * qty / I.per;
            var when = bst.old ? '예전에 적어 둔 값' : dayLabel(bst.ts);
            if (Math.abs(d) < 0.05) {
                v.textContent = '제일 쌌던 값과 같아요';
                v.style.cssText = 'background:#F3F1FC; color:#5B52B8;';
                c.innerHTML = when + ', ' + perText(cur.item, bp) + '과 같아요.';
            } else if (d < 0) {
                v.textContent = '적어 둔 ' + kind + ' 값 중 제일 싸요';
                v.style.cssText = 'background:#FBF3E4; color:#8A6416;';
                c.innerHTML = '제일 쌌던 값(' + when + ', ' + perText(cur.item, bp) + ')보다 ' + I.perLabel + '에 <b>' + perText(cur.item, -d, bp).replace(I.perLabel + ' ', '') + '</b> 덜 — 이 묶음이면 <b>' + won(tot) + '</b> 아껴요.';
            } else {
                v.textContent = '제일 쌌던 값보다 ' + I.perLabel + '에 ' + perText(cur.item, d, bp).replace(I.perLabel + ' ', '') + ' 비싸요';
                v.style.cssText = 'background:#F6F2EC; color:#5A4D44;';
                c.innerHTML = '제일 쌌던 값(' + when + ', ' + perText(cur.item, bp) + ')보다 이 묶음이면 <b>' + won(tot) + '</b> 더 내는 셈이에요. 급하지 않다면 조금 기다려 봐도 돼요.';
            }
        }
        var cat = (typeof window.moneyCat === 'function') ? window.moneyCat(I.cat) : { n: '' };
        if ($('hd-action-area')) $('hd-action-area').innerHTML =
            '<button type="button" id="hd-bought" class="btn-main" style="margin-top:6px; background:#4A413C !important; color:#FFF !important; border:none !important; box-shadow:none !important; padding:16px; font-size:15px; font-weight:800; border-radius:14px; width:100%; cursor:pointer;" onclick="window.Hotdeal.bought()">샀어요 · 값 남기기</button>' +
            '<label style="display:flex; align-items:center; justify-content:center; gap:8px; margin:12px 0 4px; font-size:13px; font-weight:700; color:#7A6F68; cursor:pointer;">' +
                '<input type="checkbox" id="hd-to-ledger"' + (toLedger ? ' checked' : '') + ' onchange="window.Hotdeal.ledger(this.checked)" style="width:18px; height:18px; accent-color:#4A413C;">' +
                '가계부에도 ' + won(price) + ' 적기' + (cat.n ? ' (' + esc(cat.n) + ')' : '') + '</label>' +
            '<button type="button" class="btn-main" style="margin-top:12px; background:#FAF7F2 !important; color:#4A413C !important; border:1px solid #EDE6DE !important; box-shadow:none !important; padding:15px; font-size:14px; font-weight:800; border-radius:14px; width:100%; cursor:pointer;" onclick="window.open(\'' + I.link + '\', \'_blank\')">쿠팡에서 ' + I.name + ' 값 보기</button>';
        if ($('hd-result')) $('hd-result').style.display = 'block';
    };
    /* 샀어요 — 값을 남기고 (두 폰 모두), 가계부에도 */
    function bought() {
        if (!last) return toast('먼저 하나당 값을 봐 주세요');
        var I = ITEMS[last.item];
        var e = { id: newId(), ts: Date.now(), item: last.item, stage: last.stage || '', price: last.price, qty: last.qty, per: Math.round(last.per * 100) / 100 };
        var by = role(); if (by) e.by = by;
        var g = read(); g.log.unshift(e); g = merge(g, {}); write(g); paint(); sync();
        var memo = I.name + (last.stage ? ' ' + stageLabel(last.stage) : '') + ' ' + last.a.toLocaleString() + (last.item === 'milk' ? 'g' : '매') + (last.b > 1 ? ' × ' + last.b + I.pack : '');
        var did = '값을 남겼어요';
        if (toLedger && typeof window.saveLedgerToFirebase === 'function') {
            var L = {}; try { L = JSON.parse(localStorage.getItem('tosil_ledger_data')) || {}; } catch (er) {}
            if (!Array.isArray(L.history)) L.history = [];
            var C = (typeof window.moneyCat === 'function') ? window.moneyCat(I.cat) : { k: I.cat, e: '', n: '' };
            var now = new Date();
            L.history.unshift({ id: newId(), ts: now.getTime(), by: by || 'mom', time: (now.getMonth() + 1) + '/' + now.getDate() + ' ' + String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0'),
                ym: now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0'), amount: last.price, type: 'expense', cat: C.k, catName: (C.e ? C.e + ' ' : '') + C.n, memo: memo });
            window.saveLedgerToFirebase(L);
            did = '값을 남기고 가계부에도 적었어요';
        }
        toast(did);
        last = null;
        ['hd-total-price', 'hd-qty-a', 'hd-qty-b'].forEach(function (id) { if ($(id)) $(id).value = ''; });
        if ($('hd-result')) $('hd-result').style.display = 'none';
    }
    function remove(id) {
        if (typeof window.askChoice !== 'function') return;
        window.askChoice({ title: '이 값을 지울까요?', sub: '엄마 · 아빠 폰 모두에서 지워져요. 가계부에 적은 건 그대로예요', options: [{ label: '지우기', value: 'del', danger: true }] })
            .then(function (v) {
                if (v !== 'del') return;
                var g = read(); g.deleted[id] = Date.now(); g = merge(g, {}); write(g); paint(); sync();
                toast('지웠어요');
            });
    }

    /* 옛 이름 — 예전 단추 · 다른 곳이 부른다 */
    window.loadPastPrice = function () { paint(); };
    window.sendHotdealToLedger = function () { bought(); };

    window.Hotdeal = {
        item: setItem, stage: setStage, bought: bought, remove: remove, ledger: function (on) { toLedger = !!on; },
        render: paint, open: function () { migrate(); paint(); }, listen: listen, merge: merge, read: read, sync: sync
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { migrate(); paint(); });
    else { migrate(); paint(); }
})();
