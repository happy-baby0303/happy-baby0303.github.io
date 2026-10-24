/* ============================================================
   배냇함 — 방금 기록 되돌리기 (recundo.js)

   왜
     '기록 한 번에' 로 저장이 한 번이면 끝나게 됐다. 그만큼 잘못 누르기도 쉽다.
     지우려면 '통계·기록 보기' 를 열고, 그 줄을 밀고, '삭제' 를 누르고, '정말 지울까요' 에 답해야 했다.

   이제 저장하면 아래에 5초 동안 뜬다.
       🍼 분유 150ml 남겼어요                    되돌리기
   누르면 방금 남긴 기록을 지운다. 짝꿍 폰에서도 사라진다 (묘비 · graveyard.js — 지우기와 같은 길).
   타이머도 저장 전 그대로 되돌린다.
     · '방금 깼어요' 로 끝낸 잠 → 지우고 '자는 중' 으로 다시
     · '방금 잠들었어요' → 지우고 '자는 중' 을 끈다
     · 모유 '방금 다 먹였어요' → 지우고 수유 시간을 계속 잰다

   안 띄우는 때
     · 고치기 (수정 완료) — 새로 남긴 기록이 없다
     · 다른 아기도 똑같이 (쌍둥이 동시 기록) — 다른 아기 장부까지 지워야 해서 여기서는 안 한다
     · 날짜 · 긴 잠을 한 번 묻고 남긴 것 — 이미 확인하고 남겼다

   어떻게 '방금 남긴 기록' 을 아나
     서버에 올리기 직전(saveTrackerToFirebase)에 이 폰 장부에 없던 기록 = 방금 남긴 기록 (nightcard.js 의 이름 붙이기와 같은 셈).

   index.html 에서 sleepguard.js 다음에 로드하세요 (저장을 제일 바깥에서 감싸야 타이머를 저장 '전' 모습으로 기억한다).
   ============================================================ */
(function () {
    'use strict';
    if (window.__recUndo) return;
    window.__recUndo = true;

    var BAR = 'undo-bar', SHOW_MS = 5000;
    var TIMER_KEYS = ['tosil_sleep_start', 'tosil_sleep_type', 'tosil_breast_start', 'tosil_breast_dir'];

    function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function records() { try { var l = JSON.parse(get('tosil_tracker_records')) || []; return Array.isArray(l) ? l : []; } catch (e) { return []; } }
    function toast(m) { if (typeof window.showToast === 'function') window.showToast(m); }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function dur(m) { m = Math.max(0, Math.round(m)); var h = Math.floor(m / 60), r = m % 60; return h ? h + '시간' + (r ? ' ' + r + '분' : '') : r + '분'; }

    /* ---------- 방금 서버에 올린 새 기록 ---------- */
    var fresh = null;          // 이번 저장에서 새로 생긴 기록들 (null = 보고 있지 않음)
    /* ⚠️ 다른 파일(carealarm · pushcheck)이 나중에 이 함수를 키를 안 옮기고 다시 감싼다.
          그러면 load 때 이 감싸개가 한 번 더 들어가서, 같은 기록을 두 번 세어 '두 개 남겼다' 로 보고 막대를 안 띄웠다.
          바깥 것 하나만 세고 (inSync), id 로 한 번 더 거른다. */
    var inSync = 0;
    function wrapSync() {
        var o = window.saveTrackerToFirebase;
        if (typeof o !== 'function') return false;
        if (o.__undo) return true;
        var w = function (list) {
            if (fresh && !inSync && Array.isArray(list)) {
                try {
                    var had = {};
                    records().forEach(function (r) { if (r && r.id) had[r.id] = 1; });
                    fresh.forEach(function (r) { had[r.id] = 1; });
                    list.forEach(function (r) { if (r && r.id && !had[r.id]) { fresh.push(r); had[r.id] = 1; } });
                } catch (e) {}
            }
            inSync++;
            try { return o.apply(this, arguments); } finally { inSync--; }
        };
        Object.keys(o).forEach(function (k) { try { w[k] = o[k]; } catch (e) {} });
        w.__undo = true;
        window.saveTrackerToFirebase = w;
        return true;
    }

    function snapTimers() { var s = {}; TIMER_KEYS.forEach(function (k) { s[k] = get(k); }); return s; }
    function restoreTimers(s) {
        TIMER_KEYS.forEach(function (k) {
            try { if (s[k] === null || s[k] === undefined) localStorage.removeItem(k); else localStorage.setItem(k, s[k]); } catch (e) {}
        });
    }

    /* ---------- 무엇을 남겼나 (막대 글씨) ---------- */
    function what(r, timers) {
        var sub = String(r.subType || ''), amt = Number(r.amount) || 0;
        if (r.type === 'feed') {
            if (sub.indexOf('모유') > -1) return '🤱 모유' + (r.status ? ' ' + r.status : '') + (amt ? ' ' + amt + '분' : '');
            if (sub.indexOf('이유식') > -1) return '🥄 이유식' + (amt ? ' ' + amt + 'g' : '');
            return '🍼 ' + (sub || '맘마') + (amt ? ' ' + amt + 'ml' : '');
        }
        if (r.type === 'diaper') return sub === '소변' ? '💧 소변' : sub === '대변' ? '💩 대변' : '💩 소변 · 대변';
        if (r.type === 'sleep') {
            var icon = sub === '밤잠' ? '🌙 ' : '☀️ ';
            if (!amt) return icon + '잠든 시각을';
            return icon + (sub || '잠') + ' ' + dur(amt);
        }
        if (r.type === 'med') return '💊 ' + (sub || '약');
        return '기록';
    }

    /* ---------- 막대 ---------- */
    /* ⚠️ 첫 기록 뒤에는 아래에서 '다음 맘마 때 알려 드릴까요? [알려 주세요]' 창이 올라온다 (pushcheck.js, 1.3초 뒤).
          막대가 그 단추를 덮었다. 그 자리에 떠 있는 창(position:fixed)이 있으면 막대를 화면 위쪽으로 올린다.
          그 창의 단추는 onclick 을 속성이 아니라 코드로 달아서 '단추인지' 로는 못 찾는다 → 떠 있는 창인지로 본다.
          기록 창은 닫히는 중(0.3초)이라 빼고 본다. 늦게 올라오는 창이 있어 몇 번 더 본다. */
    var SKIP_FIXED = 'nav, .bottom-nav, #' + BAR + ', #super-toast-msg, #tracker-sheet-overlay';
    function overlayBelow() {
        try {
            var y = window.innerHeight - 124, xs = [0.3, 0.5, 0.7];
            for (var i = 0; i < xs.length; i++) {
                var el = document.elementFromPoint(window.innerWidth * xs[i], y);
                for (var n = el; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
                    if (getComputedStyle(n).position !== 'fixed') continue;
                    if (n.matches && n.matches(SKIP_FIXED)) break;
                    return true;
                }
            }
        } catch (e) {}
        return false;
    }
    function place(bar) {
        if (!bar || !bar.parentNode || bar.__top) return;
        bar.style.pointerEvents = 'none';                               // 재는 동안 막대 자신은 빼고 본다
        var up = overlayBelow();
        bar.style.pointerEvents = '';
        if (up) { bar.__top = true; bar.style.bottom = 'auto'; bar.style.top = 'calc(env(safe-area-inset-top, 0px) + 72px)'; }
    }
    var hideT = 0;
    function hideBar() {
        clearTimeout(hideT);
        var b = document.getElementById(BAR);
        if (!b) return;
        b.style.opacity = '0';
        setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 250);
    }
    function showBar(rec, timers) {
        var old = document.getElementById(BAR);
        if (old) old.remove();
        var t = document.getElementById('super-toast-msg');           // 같은 자리에 '기록을 남겼어요' 말풍선이 겹치지 않게
        if (t) t.remove();
        var bar = document.createElement('div');
        bar.id = BAR;
        bar.setAttribute('role', 'status');
        bar.setAttribute('style', 'position:fixed;left:50%;bottom:100px;transform:translateX(-50%);width:85%;max-width:400px;box-sizing:border-box;' +
            'display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 8px 8px 20px;border-radius:20px;' +
            'background:rgba(49,51,63,0.95);color:#FFFFFF;box-shadow:0 8px 24px rgba(0,0,0,0.2);z-index:10000010;opacity:0;transition:opacity .25s ease;');
        var line = what(rec, timers);
        bar.innerHTML = '<span style="min-width:0;flex:1;font-size:14px;font-weight:800;line-height:1.4;word-break:keep-all;">' + esc(line) + ' 남겼어요</span>' +
            '<button type="button" style="flex-shrink:0;padding:10px 12px;border:none;border-radius:14px;background:transparent;color:#C9C3FF;font-size:14px;font-weight:900;cursor:pointer;font-family:inherit;">되돌리기</button>';
        bar.querySelector('button').onclick = function () { undo(rec, timers); };
        document.body.appendChild(bar);
        [400, 900, 1500, 2200, 3000].forEach(function (t) { setTimeout(function () { place(bar); }, t); });
        setTimeout(function () { bar.style.opacity = '1'; }, 10);
        clearTimeout(hideT);
        hideT = setTimeout(hideBar, SHOW_MS);
    }

    var undoing = false;
    async function undo(rec, timers) {
        if (undoing) return;
        undoing = true;
        hideBar();
        try {
            if (window.Grave) { try { window.Grave.add('trk', rec.id); } catch (e) {} }     // 짝꿍 폰에서도 지워지게
            try { if (window.Topping) window.Topping.forgetTrk(rec.id); } catch (e) {}     // 토핑 이유식이면 이유식 달력에서도
            restoreTimers(timers);                                                          // 타이머는 저장 전 그대로 (sleepsync.js 가 짝꿍 폰에도 알린다)
            var list = records().filter(function (r) { return r && r.id !== rec.id; });
            if (typeof window.saveTrackerToFirebase === 'function') {
                await window.saveTrackerToFirebase(list);
                if (typeof window.flushOfflineQueue === 'function') { try { window.flushOfflineQueue(); } catch (e) {} }
            } else {
                localStorage.setItem('tosil_tracker_records', JSON.stringify(list));
                if (typeof window.updateTrackerDashboard === 'function') window.updateTrackerDashboard();
            }
            if (window.checkReceiptVisibility) { try { window.checkReceiptVisibility(); } catch (e) {} }
            toast('되돌렸어요. 방금 기록을 지웠어요');
        } catch (e) {
            console.warn('[되돌리기] 실패', e);
            toast('되돌리지 못했어요. 통계·기록 보기에서 지워 주세요');
        } finally { undoing = false; }
    }

    /* ---------- 저장을 감싼다 ---------- */
    var watching = false;      // 감싸개가 두 번 들어가도 (다른 파일이 나중에 다시 감싸도) 바깥 것 하나만 일한다
    function watch(run, ctx, args) {
        var twin = document.getElementById('sync-twins-check');
        if (watching || (twin && twin.checked)) return run.apply(ctx, args);   // 쌍둥이 동시 기록 — 다른 아기 장부까지라 여기선 안 한다
        var timers = snapTimers();
        fresh = [];
        var out;
        watching = true;
        try { out = run.apply(ctx, args); }
        catch (e) { fresh = null; throw e; }
        finally { watching = false; }
        return Promise.resolve(out).then(function (v) {
            var got = fresh || [];
            fresh = null;
            if (got.length === 1) showBar(got[0], timers);
            return v;
        }, function (e) { fresh = null; throw e; });
    }
    function wrapSave() {
        var o = window.saveTrackerRecord;
        if (typeof o !== 'function') return false;
        if (o.__undo) return true;
        var w = function () { return watch(o, this, arguments); };
        Object.keys(o).forEach(function (k) { try { w[k] = o[k]; } catch (e) {} });
        w.__undo = true;
        window.saveTrackerRecord = w;
        return true;
    }
    // 모유 '방금 다 먹였어요' — 기록 창의 저장 버튼을 거치지 않는다
    function wrapBreast() {
        var o = window.stopBreastTimer;
        if (typeof o !== 'function') return false;
        if (o.__undo) return true;
        var w = function () { return watch(o, this, arguments); };
        Object.keys(o).forEach(function (k) { try { w[k] = o[k]; } catch (e) {} });
        w.__undo = true;
        window.stopBreastTimer = w;
        return true;
    }

    var tries = 0;
    (function go() {
        var ok = wrapSync() & wrapSave() & wrapBreast();
        if (!ok && ++tries < 40) setTimeout(go, 250);
    })();
    window.addEventListener('load', function () { setTimeout(function () { wrapSync(); wrapSave(); wrapBreast(); }, 0); });
})();
