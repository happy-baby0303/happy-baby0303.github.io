/* ============================================================
   배냇함 — 기록 한 번에 (quickrec.js)

   왜
     맘마 · 기저귀 · 잠 기록 창을 열면 아무것도 안 골라져 있었다.
     분유 먹는 집은 하루 여덟 번, 매번 '분유/유축' → '150ml' 칩 → '저장하기' 를 눌렀다.
     바로 저장을 누르면 '분유, 모유, 유축 중 하나를 선택해주세요' 만 떴다.
     양 칸의 연한 150 은 값이 아니라 자리 글씨라서, 그대로 저장하면 '먹은 양을 입력해주세요' 가 떴다.
     저장 버튼도 다른 칸과 같은 미색이라 (.btn-main 공통 칠이 보라를 덮었다) 어디를 눌러야 끝나는지 안 보였다.

   이제
     창을 열면 지난번 그대로 골라 둔다. 저장 버튼에는 무엇이 남는지 적고 보라로 칠한다.
         🍼 분유 150ml 남기기          🤱 모유 오른쪽 15분 남기기
         🥄 이유식 80g 남기기          💧 소변 남기기
         ☀️ 낮잠 · 방금 잠들었어요     🌙 밤잠 9시간 20분 남기기
     모자란 게 있으면 버튼이 무엇을 골라야 하는지 말한다 (분유 · 모유 직수 중에 골라 주세요).

   무엇을 골라 두나
     맘마    지난번 수유 종류 (분유 · 유축 · 모유 직수).
             양은 최근 세 번 중 두 번 같은 양, 아니면 지난번 양 (한 번 덜 먹은 병에 끌려가지 않게).
             모유는 지난번 반대쪽 (두 번 연달아 같은 쪽이면 그쪽). 분은 양과 같은 셈.
             이유식 칸은 어제 · 그저께 이맘때 (앞뒤 한 시간) 이유식을 먹었으면 연다. 두 시간 반 안에 먹었으면 안 연다.
             이유식만 적는 집 (이레 동안 수유 기록이 없다) 은 늘 이유식 칸.
     기저귀  최근 여섯 번 중 제일 많은 것 (같으면 최근 것).
             ⚠️ 똥 색깔은 절대 미리 고르지 않는다. 붉은색 · 검은색 · 흰색은 몸이 보내는 신호다.
     잠      잠든 시간으로 낮잠 · 밤잠을 정한다. 지난 두 주에 그 시간 (앞뒤 한 시간 반) 에 잔 잠이 두 번 이상 있으면 많은 쪽,
             아니면 저녁 7시 ~ 새벽 6시는 밤잠. 바퀴로 잠든 시간을 돌리면 따라 바뀐다 (손으로 누르면 그대로 둔다).
             깬 시간이 잠든 시간과 같으면 (처음 열었을 때) '방금 잠들었어요' — 누르면 자는 중으로 남는다.
     약      건드리지 않는다.
     처음 쓰는 집 (기록이 없다) 은 고르지 않는다. 대신 '한 번 고르면 다음부터는 미리 골라 둘게요'.
     고치기 (수정) 창은 그 기록 그대로 — 버튼 색만 보라로.
     짝꿍 · 할머니가 남긴 기록도 같은 장부라서 같이 본다 (밤에 아빠가 준 분유도 '지난번' 이다).

   ⚠️ 저장 코드는 하나도 안 고친다. 창이 뜬 뒤 버튼을 대신 눌러 두고, 저장 버튼 글씨만 바꾼다.
   index.html 에서 recordguard.js 다음에 로드하세요 (열기 · 저장을 제일 바깥에서 감싼다).
   ============================================================ */
(function () {
    'use strict';
    if (window.__quickRec) return;
    window.__quickRec = true;

    var MIN = 60000, HOUR = 60 * MIN, DAY = 24 * HOUR;
    var FIRST = '한 번 고르면 다음부터는 미리 골라 둘게요';
    var DIAPER = { '소변': 'diaper_pee', '대변': 'diaper_poop', '소변+대변': 'diaper_both' };
    var SIDE = { '왼쪽': 'breast_left', '오른쪽': 'breast_right', '양쪽': 'breast_both' };

    function $(id) { return document.getElementById(id); }
    function val(id) { var e = $(id); return e ? String(e.value || '') : ''; }
    function num(v) { var n = parseInt(v, 10); return isNaN(n) ? 0 : n; }
    function pad(n) { return String(n).padStart(2, '0'); }
    function ts(r) { return Number(r && r.timestamp) || 0; }
    function hm(ms) { var d = new Date(ms); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
    function dur(m) { var h = Math.floor(m / 60), r = m % 60; return h ? h + '시간' + (r ? ' ' + r + '분' : '') : r + '분'; }
    function mod(ms) { var d = new Date(ms); return d.getHours() * 60 + d.getMinutes(); }
    function apart(a, b) { var d = Math.abs(a - b); return Math.min(d, 1440 - d); }
    function copy(from, to) { Object.keys(from).forEach(function (k) { try { to[k] = from[k]; } catch (e) {} }); }

    /* 이 아기 장부 (다둥이면 지금 아기 것 — localStorage 가 알아서 꼬리표를 붙인다)
       ⚠️ 수면 바퀴는 한 칸 돌 때마다 낮잠 · 밤잠을 다시 본다. 그때마다 1500줄을 다시 읽으면 바퀴가 버벅인다.
          창을 열 때 한 번 읽어 두고 (book), 창이 열려 있는 동안 그것을 쓴다. */
    var book = null;
    function records() {
        if (book) return book;
        var list, now = Date.now();
        try { list = JSON.parse(localStorage.getItem('tosil_tracker_records')) || []; } catch (e) { list = []; }
        if (!Array.isArray(list)) return [];
        return list.filter(function (r) { return r && ts(r) && ts(r) <= now + 10 * MIN; })
                   .sort(function (a, b) { return ts(b) - ts(a); });
    }

    /* 최근 세 번 중 두 번 같은 값, 아니면 지난번 값 */
    function usual(list) {
        var a = list.filter(function (v) { return v > 0; }).slice(0, 3);
        if (!a.length) return 0;
        if (a.length > 1 && a[0] === a[1]) return a[0];
        for (var i = 0; i < a.length; i++) for (var j = i + 1; j < a.length; j++) if (a[i] === a[j]) return a[i];
        return a[0];
    }

    /* ---------- 맘마: 무엇을 골라 둘까 ---------- */
    function feedPlan() {
        var now = Date.now();
        var feeds = records().filter(function (r) { return r.type === 'feed'; });
        var bottle = feeds.filter(function (r) { return r.subType === '분유' || r.subType === '유축'; });
        var breast = feeds.filter(function (r) { return r.subType === '모유'; });
        var food = feeds.filter(function (r) { return r.subType === '이유식'; });
        var p = { kind: '', bottle: null, breast: null, food: 0, tab: 'milk' };

        if (bottle.length) {
            var sub = bottle[0].subType;
            p.bottle = { sub: sub, ml: usual(bottle.filter(function (r) { return r.subType === sub; }).map(function (r) { return num(r.amount); })) };
        }
        if (breast.length) {
            var s0 = breast[0].status || '', s1 = (breast[1] && breast[1].status) || '';
            var side = s0 === '양쪽' ? '양쪽' : (s0 && s0 === s1) ? s0 : s0 === '왼쪽' ? '오른쪽' : s0 === '오른쪽' ? '왼쪽' : '';
            p.breast = { side: side, last: SIDE[s0] ? s0 : '', min: usual(breast.map(function (r) { return num(r.amount); })) };
        }
        var lastMilk = feeds.filter(function (r) { return r.subType !== '이유식'; })[0];
        if (lastMilk) p.kind = lastMilk.subType === '모유' ? 'breast' : (p.bottle ? 'bottle' : '');

        if (food.length) {
            p.food = usual(food.map(function (r) { return num(r.amount); }));
            var milkWeek = feeds.filter(function (r) { return r.subType !== '이유식' && now - ts(r) < 7 * DAY; }).length;
            var foodWeek = food.filter(function (r) { return now - ts(r) < 7 * DAY; }).length;
            var justAte = food.some(function (r) { return now - ts(r) < 150 * MIN; });
            var routine = food.some(function (r) {
                var d = now - ts(r);
                return Math.abs(d - DAY) <= HOUR || Math.abs(d - 2 * DAY) <= HOUR;
            });
            if (foodWeek && !milkWeek) p.tab = 'food';
            else if (routine && !justAte) p.tab = 'food';
        }
        return p;
    }

    /* ---------- 기저귀: 최근 여섯 번 중 제일 많은 것 ---------- */
    function diaperPick() {
        var d = records().filter(function (r) { return r.type === 'diaper' && DIAPER[r.subType]; }).slice(0, 6);
        if (!d.length) return '';
        var n = {}, best = d[0].subType;
        d.forEach(function (r) { n[r.subType] = (n[r.subType] || 0) + 1; });
        d.forEach(function (r) { if (n[r.subType] > n[best]) best = r.subType; });
        return best;
    }

    /* ---------- 잠: 그 시간에 이 아기는 보통 무슨 잠을 잤나 ---------- */
    function sleepKind(start) {
        var now = Date.now(), at = mod(start), n = { '낮잠': 0, '밤잠': 0 };
        records().forEach(function (r) {
            if (r.type !== 'sleep' || !(r.subType in n) || now - ts(r) > 14 * DAY) return;
            if (apart(mod(ts(r)), at) <= 90) n[r.subType]++;
        });
        if (n['낮잠'] + n['밤잠'] >= 2 && n['낮잠'] !== n['밤잠']) return n['밤잠'] > n['낮잠'] ? '밤잠' : '낮잠';
        var h = new Date(start).getHours();
        return (h >= 19 || h < 6) ? '밤잠' : '낮잠';
    }
    function sleepStart() {
        var d = val('v-sleep-start-date'), t = val('v-sleep-start-time');
        return d && t ? new Date(d + 'T' + t + ':00').getTime() : NaN;
    }
    /* 깬 시간 = 잠든 시간일 때 '자는 중' 으로 남겨도 되는 잠든 시간 (지금 앞뒤로 말이 되는 때) */
    function nowish(s) { var now = Date.now(); return !isNaN(s) && s <= now + 5 * MIN && now - s <= 12 * HOUR; }

    /* ---------- 버튼을 대신 누른다 ---------- */
    // ⚠️ toggleMammaTab 은 누를 때 폰을 살짝 떤다. 창을 열자마자 떨면 이상하다 — 대신 누를 때만 끈다.
    function quiet(fn) {
        var had = Object.prototype.hasOwnProperty.call(navigator, 'vibrate');
        var keep = navigator.vibrate;
        try { navigator.vibrate = function () { return true; }; } catch (e) {}
        try { fn(); }
        finally {
            try { if (had) navigator.vibrate = keep; else delete navigator.vibrate; } catch (e) {}
        }
    }
    function feedBtn(word) {
        var bs = document.querySelectorAll('#milk-input-area button[onclick*="\'feed\'"]');
        for (var i = 0; i < bs.length; i++) if ((bs[i].textContent || '').indexOf(word) > -1) return bs[i];
        return null;
    }
    function fill(id, v) { var e = $(id); if (e && !e.value && v > 0) e.value = String(v); }
    function hint(row, text) {
        if (!row || !row.parentNode) return;
        var next = row.nextElementSibling;
        if (next && next.classList.contains('qr-hint')) { next.textContent = text; return; }
        var d = document.createElement('div');
        d.className = 'qr-hint';
        d.textContent = text;
        row.parentNode.insertBefore(d, row.nextSibling);
    }
    function paintTab(which) {
        var on = $(which === 'food' ? 'tab-btn-food' : 'tab-btn-milk'), off = $(which === 'food' ? 'tab-btn-milk' : 'tab-btn-food');
        if (!on || !off) return;
        on.style.setProperty('background', 'rgba(127, 119, 221, 0.15)', 'important');
        on.style.setProperty('color', 'var(--primary)', 'important');
        on.style.setProperty('font-weight', '900', 'important');
        off.style.setProperty('background', 'transparent', 'important');
        off.style.setProperty('color', '#A3958A', 'important');
        off.style.setProperty('font-weight', '700', 'important');
    }

    function applyBreast(b) {
        if (!b) return;
        var st = window.trackerState;
        if (b.side && !st.status) {
            var sb = document.querySelector('#feed-breast-area button[onclick*="' + SIDE[b.side] + '"]');
            if (sb) window.selectTrackerBtn(sb, SIDE[b.side]);
        }
        fill('v-breast-amount', b.min);
        var any = document.querySelector('#feed-breast-area button[onclick*="breast_left"]');
        if (b.last && any) hint(any.parentElement, '지난번은 ' + b.last + '이었어요');
    }
    function applyMilk(p) {
        if (!p || !p.kind) return;
        var st = window.trackerState;
        if (p.kind === 'breast') {
            var b = feedBtn('모유');
            if (b) window.selectTrackerBtn(b, 'feed');
            applyBreast(p.breast);
        } else {
            var f = feedBtn('분유');
            if (f) window.selectTrackerBtn(f, 'feed');
            if (p.bottle && p.bottle.sub === '유축') st.subType = '유축';
            fill('v-feed-amount', p.bottle && p.bottle.ml);
        }
    }

    var plan = null, sleepAuto = false, wasSleeping = false, gen = 0;

    function prepFeed() {
        if (localStorage.getItem('tosil_breast_start')) return;      // 수유 타이머가 도는 화면 — 손대지 않는다
        var p = plan = feedPlan();
        if (p.tab === 'food') quiet(function () { window.toggleMammaTab('food'); });
        else if (p.kind) quiet(function () { window.toggleMammaTab('milk'); });
        else {
            paintTab('milk');                                       // 처음 — 고르지 않고 알려만 준다
            var f = feedBtn('분유');
            if (f) hint(f.parentElement, FIRST);
        }
    }
    function prepDiaper(preSelect) {
        if (preSelect) return;                                      // '소변' 단추로 바로 열었다 — 원래 코드가 고른다
        var pick = diaperPick(), cat = DIAPER[pick];
        var btn = document.querySelector('#tracker-sheet-body button[onclick*="' + (cat || 'diaper_pee') + '"]');
        if (!btn) return;
        if (cat) window.selectTrackerBtn(btn, cat);
        else hint(btn.parentElement, FIRST);
    }
    function autoSleep() {
        if (!sleepAuto) return;
        var s = sleepStart();
        if (isNaN(s)) return;
        var k = sleepKind(s);
        if (window.trackerState.subType === k) return;
        var bs = document.querySelectorAll('#sleep-type-buttons button');
        for (var i = 0; i < bs.length; i++) {
            if ((bs[i].textContent || '').indexOf(k) > -1) { window.selectTrackerBtn(bs[i], k === '밤잠' ? 'sleep_night' : 'sleep_day'); return; }
        }
    }
    function prepSleep(editing) {
        var st = window.trackerState;
        wasSleeping = !!st.isSleeping;
        sleepAuto = !editing && !localStorage.getItem('tosil_sleep_start') && !st.subType;
        autoSleep();
    }

    function prep(type, editing, preSelect) {
        if (editing) return;
        if (type === 'feed') prepFeed();
        else if (type === 'diaper') prepDiaper(preSelect);
        else if (type === 'sleep') prepSleep(editing);
    }

    /* ---------- 저장 버튼: 무엇이 남는지 ---------- */
    function want() {
        var st = window.trackerState || {}, t = st.type;
        if (t === 'feed') {
            if (st.subType === '이유식') {
                var area = $('food-input-area');
                if (area && area.getAttribute('data-style') === 'topping') return ['🥄 토핑 이유식 남기기', true];
                var g = num(val('v-food-amount'));
                return g > 0 ? ['🥄 이유식 ' + g + 'g 남기기', true] : ['먹은 이유식 양(g)을 적어 주세요', false];
            }
            if (!st.subType) return ['분유 · 모유 직수 중에 골라 주세요', false];
            if (st.subType === '모유') {
                if (!st.status) return ['왼쪽 · 오른쪽 · 양쪽 중에 골라 주세요', false];
                var m = num(val('v-breast-amount'));
                return m > 0 ? ['🤱 모유 ' + st.status + ' ' + m + '분 남기기', true] : ['먹인 시간(분)을 적어 주세요', false];
            }
            var ml = num(val('v-feed-amount'));
            return ml > 0 ? ['🍼 ' + st.subType + ' ' + ml + 'ml 남기기', true] : ['먹은 양(ml)을 적어 주세요', false];
        }
        if (t === 'diaper') {
            if (!st.subType) return ['소변 · 대변 · 둘 다 중에 골라 주세요', false];
            if (st.subType === '소변') return ['💧 소변 남기기', true];
            return [(st.subType === '대변' ? '💩 대변' : '💩 소변 + 대변') + (st.status ? ' · ' + st.status : '') + ' 남기기', true];
        }
        if (t === 'sleep') {
            if (!st.subType) return ['낮잠 · 밤잠 중에 골라 주세요', false];
            var icon = st.subType === '밤잠' ? '🌙 ' : '☀️ ';
            var s = sleepStart(), now = Date.now();
            var since = Math.abs(now - s) <= 5 * MIN ? '방금 잠들었어요' : hm(s) + '부터 자는 중';
            if (st.isSleeping) {
                // 자는 중에 연 창 — 할 일은 위의 '방금 깼어요'. 저장은 잠든 시간만 고칠 때라 보조로 둔다
                // 바퀴로 잠든 시간을 바꿨으면 그게 할 일이다 — 무엇이 바뀌는지 말하고 진하게
                if (wasSleeping) {
                    var was = Number(localStorage.getItem('tosil_sleep_start')) || 0;
                    if (was && !isNaN(s) && Math.abs(s - was) >= MIN) return [icon + hm(s) + '에 잠든 걸로 고치기', true];
                    return [icon + st.subType + ' · ' + hm(s) + '부터 자는 중', false];
                }
                return [icon + st.subType + ' · ' + since, true];
            }
            var raw = val('v-sleep-amount'), a = num(raw);
            if (a < 0) return ['깬 시간이 잠든 시간보다 앞서요', false];
            if (a > 24 * 60) return ['잠든 날짜를 한 번 봐 주세요', false];
            // 낮잠 4시간 반 · 밤잠 14시간이 넘으면 (타이머를 끄는 걸 잊었을 때) — 기준은 sleepguard.js 와 같다
            if (typeof window.sleepTimerTooLong === 'function' && window.sleepTimerTooLong(st.subType, a)) return ['깬 시간을 한 번 봐 주세요 · ' + st.subType + ' ' + dur(a), false];
            if (a === 0) return nowish(s) ? [icon + st.subType + ' · ' + since, true] : ['깬 시간을 골라 주세요', false];
            return [icon + st.subType + ' ' + dur(a) + ' 남기기', true];
        }
        return null;
    }

    var PROPS = ['background', 'color', 'border', 'box-shadow'];
    function paint(btn, on) {
        var v = on ? ['#7F77DD', '#FFFFFF', '1px solid #7F77DD', '0 6px 16px rgba(127, 119, 221, 0.28)']
                   : ['var(--bg-sub)', 'var(--text-sub, #A3958A)', '1px solid var(--border)', 'none'];
        for (var i = 0; i < PROPS.length; i++) btn.style.setProperty(PROPS[i], v[i], 'important');
        btn.setAttribute('data-quick', on ? 'on' : 'off');
    }
    function unpaint(btn) {
        if (!btn.hasAttribute('data-quick')) return;
        PROPS.forEach(function (k) { btn.style.removeProperty(k); });
        btn.removeAttribute('data-quick');
    }
    function refresh() {
        var btn = $('btn-tracker-save'), ov = $('tracker-sheet-overlay');
        if (!btn || btn.disabled || btn.style.display === 'none') return;
        if (!ov || ov.style.display === 'none') return;              // 닫힌 창 (플레이 앱은 약 창이 아예 안 열린다)
        var st = window.trackerState || {};
        if (st.type === 'med') return unpaint(btn);
        if (window.editingTrackerId) return paint(btn, true);       // 글씨는 '수정 완료' 그대로
        var w = want();
        if (!w) return unpaint(btn);
        if (btn.textContent !== w[0]) btn.textContent = w[0];
        paint(btn, w[1]);
    }
    var tick = 0;
    function soon() { clearTimeout(tick); tick = setTimeout(refresh, 0); }

    /* ---------- 감싸기 ----------
       ⚠️ 플레이 앱은 playlite.js 가 열기 함수를 한 번 더 싸고 (약 창 막기), sleeppicker.js 가 load 때 또 싼다.
          그러면 이 감싸개가 사슬 안에 두 번 들어간다. 안쪽 것이 먼저 낮잠 · 밤잠을 고르고,
          바깥 것이 '이미 골라져 있네 = 손으로 고른 것' 으로 읽어 바퀴를 따라가지 않았다.
          지금 돌고 있으면 안쪽 것은 그냥 지나가게 한다 (제일 바깥 것 하나만 일한다). */
    var busy = { open: 0, toggle: 0, calc: 0, save: 0 };
    function wrapOpen() {
        var o = window.openTrackerSheet;
        if (typeof o !== 'function') return false;
        if (o.__quick) return true;
        var w = function (type, editId, preSelect) {
            if (busy.open) return o.apply(this, arguments);
            plan = null; sleepAuto = false; wasSleeping = false; book = null;   // 지난 창의 것이 남지 않게 (먼저 지운다)
            var my = ++gen, out;
            busy.open++;
            try { out = o.apply(this, arguments); } finally { busy.open--; }
            var ov = $('tracker-sheet-overlay');
            if (!ov || ov.style.display === 'none') return out;     // 안 열렸다 (플레이 앱의 약 창)
            var editing = !!window.editingTrackerId;
            // 맘마 · 기저귀 칸은 원래 창이 그 자리에서 다 그린다 → 바로 고른다 (늦게 고르면 '저장하기' 가 한 번 비친다)
            // 수면은 원래 창이 10ms · 30ms 에 자는 중 · 바퀴를 마저 그린다. 버튼 글씨는 그 뒤에 한 번 더 쓴다
            try { book = records(); prep(type, editing, preSelect); } catch (e) { console.warn('[기록 한 번에] 미리 고르기 실패', e); }
            refresh();
            setTimeout(function () { if (my === gen) refresh(); }, 60);
            setTimeout(function () { if (my === gen) refresh(); }, 220);
            return out;
        };
        copy(o, w);
        w.__quick = true;
        window.openTrackerSheet = w;
        return true;
    }

    function wrapToggle() {
        var t = window.toggleMammaTab;
        if (typeof t !== 'function') return false;
        if (t.__quick) return true;
        var w = function (kind) {
            if (busy.toggle) return t.apply(this, arguments);
            var out;
            busy.toggle++;
            try { out = t.apply(this, arguments); } finally { busy.toggle--; }
            if (!window.editingTrackerId && plan) {
                if (kind === 'food') fill('v-food-amount', plan.food);
                else applyMilk(plan);
            }
            soon();
            return out;
        };
        copy(t, w);
        w.__quick = true;
        window.toggleMammaTab = w;
        return true;
    }

    function wrapCalc() {
        var c = window.calcSleepRange;
        if (typeof c !== 'function') return false;
        if (c.__quick) return true;
        var w = function () {
            if (busy.calc) return c.apply(this, arguments);
            var out;
            busy.calc++;
            try { out = c.apply(this, arguments); } finally { busy.calc--; }
            if (window.trackerState && window.trackerState.type === 'sleep') { autoSleep(); soon(); }
            return out;
        };
        copy(c, w);
        w.__quick = true;
        window.calcSleepRange = w;
        return true;
    }

    function wrapSave() {
        var s = window.saveTrackerRecord;
        if (typeof s !== 'function') return false;
        if (s.__quick) return true;
        var w = async function () {
            if (busy.save) return s.apply(this, arguments);
            var st = window.trackerState || {}, slept = false;
            // '방금 잠들었어요' — 깬 시간 = 잠든 시간이면 자는 중으로 남긴다 ('자는 중으로 변경' 을 누르고 저장한 것과 같은 길)
            if (st.type === 'sleep' && st.subType && !st.isSleeping && !window.editingTrackerId &&
                val('v-sleep-amount') !== '' && num(val('v-sleep-amount')) === 0 && nowish(sleepStart()) &&
                typeof window.toggleIsSleeping === 'function') {
                window.toggleIsSleeping(true);
                slept = true;
            }
            var out, run;
            busy.save++;
            try { run = s.apply(this, arguments); } finally { busy.save--; }   // 안쪽 사슬은 여기서 바로 불린다
            try { out = await run; }
            finally { setTimeout(refresh, 650); }                   // 모자라서 못 남겼으면 원래 코드가 '저장하기' 로 되돌린다 → 다시 적는다
            if (slept && localStorage.getItem('tosil_sleep_start') && typeof window.showToast === 'function') {
                window.showToast('🌙 잠든 시각을 남겼어요');                 // 타이머 단추(startSleepTimer)와 같은 말
            }
            return out;
        };
        copy(s, w);
        w.__quick = true;
        window.saveTrackerRecord = w;
        return true;
    }

    /* 누르고 적을 때마다 버튼 글씨를 다시 쓴다.
       ⚠️ 시트 상자가 onclick 에서 stopPropagation 을 해서 문서까지 안 올라온다 → 내려가는 길(capture)에서 듣고, 누른 일이 끝난 뒤에 쓴다. */
    function onTap(e) {
        var t = e.target;
        if (!t || !t.closest || !t.closest('#tracker-sheet-content')) return;
        var feed = t.closest('#milk-input-area button[onclick*="\'feed\'"]');
        if (t.closest('#sleep-type-buttons button')) sleepAuto = false;      // 손으로 고른 잠은 바퀴를 돌려도 그대로
        setTimeout(function () {
            if (feed && plan && !window.editingTrackerId) {
                // 손으로 분유 ↔ 모유를 바꿨다 — 그쪽 지난번 값으로 빈칸만 채운다
                if (window.trackerState.subType === '모유') applyBreast(plan.breast);
                else fill('v-feed-amount', plan.bottle && plan.bottle.ml);
            }
            refresh();
        }, 0);
    }
    function onType(e) {
        if (e.target && e.target.closest && e.target.closest('#tracker-sheet-content')) soon();
    }

    function css() {
        if ($('qr-css')) return;
        var s = document.createElement('style');
        s.id = 'qr-css';
        s.textContent = '#tracker-sheet-body .qr-hint{margin:-14px 0 20px;text-align:center;font-size:12.5px;font-weight:700;color:var(--text-sub,#A3958A);word-break:keep-all;line-height:1.5;}' +
            '#btn-tracker-save[data-quick]{word-break:keep-all;}';      // 누를 때 줄어드는 움직임(style.css 의 transition)은 그대로 둔다
        (document.head || document.documentElement).appendChild(s);
    }

    function boot() {
        var ok = wrapOpen() & wrapToggle() & wrapCalc() & wrapSave();
        return !!ok;
    }
    css();
    document.addEventListener('click', onTap, true);
    document.addEventListener('input', onType, true);
    var tries = 0;
    (function go() { if (!boot() && ++tries < 40) setTimeout(go, 250); })();
    // 다른 파일이 나중에 다시 감쌀 수 있다 (sleeppicker 는 load 때 한 번 더 본다) → 그 뒤에도 바깥에 있게
    window.addEventListener('load', function () { setTimeout(boot, 0); });

    window.quickRecDebug = function () {
        console.log('맘마:', JSON.stringify(feedPlan()), '· 기저귀:', diaperPick() || '(처음)', '· 저장 버튼:', JSON.stringify(want()));
    };
})();
