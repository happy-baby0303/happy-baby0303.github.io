/* ============================================================
   배냇함 — 밤사이 (nightcard.js)

   왜
     밤에 아기 곁에서 깬 사람은 보통 한 명이다. 아침에 일어난 짝꿍은 밤사이 무슨 일이 있었는지 모른다.
     '몇 번 깼어? 몇 시에 먹였어?' 를 물어야 알았고, 기록을 하나하나 넘겨 봐야 했다.

   이제 아침 5시 ~ 낮 12시에 홈의 기록 버튼 바로 아래에 한 장이 뜬다.
       밤사이 꿈이                          21:10 ~ 06:40   ✕
       잠       9시간 30분
                제일 길게 4시간 55분 · 21:10~02:05
       깬 때     2번
                02:05 · 04:40
       맘마      2번 · 300ml
                02:10 분유 160ml (아빠) · 04:40 분유 140ml
       기저귀     1번
                02:15 소변 (아빠)
       [아빠에게 고맙다고 하기]
       남긴 기록으로만 셌어요
     ⚠️ 바로 아래 '오늘 하루' 카드가 '일주일 잠 보기 ›' 와 '어젯밤 몇 시에 잠들어 몇 시에 깼어요 · 가장 길게 …' 를 또 말했다.
        카드가 떠 있는 동안에는 '오늘 하루' 의 그 한 줄(#today-sleep-caption)을 숨기고, 이 카드에는 잠 보기 링크를 달지 않는다.

   밤은 어디서 어디까지
     잠 기록이 있으면 어젯밤 잠 — 한가운데가 어젯밤 8시 ~ 오늘 아침 7시인 잠들 (편지 · emotion.js 의 '어젯밤' 과 같은 셈).
       첫 잠이 든 때부터 마지막 잠이 깬 때까지. 아직 자는 중이면 지금까지.
     잠 기록이 없으면 밤 10시 ~ 새벽 6시 (이번 달 밤중 수유 · infopick.js 와 같은 셈).
   깬 때
     밤사이 남긴 맘마 · 기저귀, 그리고 잠과 잠 사이 (세 시간 안). 45분 안에 붙은 것은 한 번 깬 것 (편지와 같은 셈).
     ⚠️ 깬 기록이 없을 때 '한 번도 안 깼어요' 라고 쓰지 않는다. 앱은 남긴 기록만 안다 → '깬 기록이 없어요'.
   제일 길게 잔 잠
     밤잠 기록 안에 깬 기록이 있으면 거기서 끊어 잰다 (편지와 같은 셈).
   누가
     기록마다 누가 남겼는지 (by · byWord) 를 붙인다 — 이 파일이 서버에 올리기 직전에 붙인다 (saveTrackerToFirebase).
     고친 기록은 처음 남긴 사람 그대로. 짝꿍 폰에서 온 기록에는 붙이지 않는다 (이미 이 폰 장부에 있는 것).
     카드에는 '내가 아닌 사람' 것만 이름을 단다 (엄마 폰에는 '(아빠)', 아빠 폰에는 '(엄마)').
     이 업데이트 전에 남긴 기록에는 이름이 없다 → 이름 없이 보인다.
   고맙다고 하기
     짝꿍(엄마 · 아빠)이 밤사이 맘마 · 기저귀를 챙긴 기록이 있으면 단추가 붙는다. 누르면 짝꿍 폰에 알림 한 번.
       💛 엄마가 고마워해요 / 밤사이 꿈이 맘마 2번 · 기저귀 1번, 챙겨 줘서 고마워요
     하루에 한 번. 저절로 보내지 않는다 (아침마다 알림이 오면 그건 소음이다).

   안 띄우는 때: 아기가 태어나기 전 · 돌봄 도우미 폰 · 밤사이 기록이 하나도 없을 때 · ✕ 를 누른 날.
   저장: tosil_night_hide = 닫은 날 (+ 아기 꼬리표), tosil_night_thanks = 고맙다고 한 날 (+ 아기 꼬리표)
   index.html 에서 joinhello.js 다음에. 홈 자리는 homelayout.js ORDER — 기록 버튼(지금 꿈이) 바로 아래.
   ============================================================ */
(function () {
    'use strict';
    if (window.__nightCard) return;
    window.__nightCard = true;

    var MIN = 60000, H = 60 * MIN;
    var CARD = 'home-night-card', HIDE = 'tosil_night_hide', THANKS = 'tosil_night_thanks';
    var INK = '#4A413C', SUB = '#8A7F76', LINE = 'var(--border)';
    var FROM_H = 5, TO_H = 12;              // 아침 5시 ~ 낮 12시에만

    function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
    function pad(n) { return String(n).padStart(2, '0'); }
    function hhmm(ms) { var d = new Date(ms); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
    function dur(m) { m = Math.max(0, Math.round(m)); var h = Math.floor(m / 60), r = m % 60; return h ? h + '시간' + (r ? ' ' + r + '분' : '') : r + '분'; }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function dayKey(ms) { var d = new Date(ms); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
    function today0(ms) { var d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); }
    function ts(r) { return Number(r && r.timestamp) || 0; }
    function toast(m) { if (typeof window.showToast === 'function') window.showToast(m); }
    function josa(w, a, b) {
        var c = String(w || '').charCodeAt(String(w || '').length - 1);
        return (c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0) ? a : b;
    }
    function records() {
        try { var l = JSON.parse(get('tosil_tracker_records')) || []; return Array.isArray(l) ? l : []; } catch (e) { return []; }
    }
    function babyCall(j) {
        try { if (typeof window.babyCall === 'function') return window.babyCall(j || ''); } catch (e) {}
        return (String(get('tosil_babyName') || '').trim() || '우리 아기') + (j || '');
    }
    function suffix() { return String(window.currentBabySuffix || ''); }

    /* ---------- 누가 남겼나 ---------- */
    function helper() { return get('tosil_role_locked') === 'viewer' || get('user_role') === 'senior'; }
    function myWord() {
        if (helper()) return String(get('tosil_helper_label') || '').trim() || '돌봄 도우미';
        if (typeof window.myRoleWord === 'function') { try { return window.myRoleWord(); } catch (e) {} }
        return get('user_role') === 'dad' ? '아빠' : '엄마';
    }
    function myUid() {
        try { if (typeof window.myUid === 'function') return window.myUid() || ''; } catch (e) {}
        return get('firebase_uid') || '';
    }
    /* 서버에 올리기 직전: 이 폰 장부에 없던 기록 = 이 폰에서 방금 남긴 기록 → 이름을 붙인다.
       이 폰 장부에 이미 있는 기록(짝꿍 폰에서 온 것 · 옛 기록)은 건드리지 않는다. 고친 기록은 처음 이름 그대로. */
    function stampWho(list) {
        if (!Array.isArray(list) || !list.length) return;
        var prev = {};
        records().forEach(function (r) { if (r && r.id) prev[r.id] = r; });
        var word = null, uid = null;
        list.forEach(function (r) {
            if (!r || typeof r !== 'object' || !r.id || r.byWord) return;
            var p = prev[r.id];
            if (p) {
                if (p.byWord) { r.byWord = p.byWord; if (p.by) r.by = p.by; }
                return;
            }
            if (word === null) { word = myWord(); uid = myUid(); }
            r.byWord = word;
            if (uid) r.by = uid;
        });
    }
    function wrapSave() {
        var o = window.saveTrackerToFirebase;
        if (typeof o !== 'function') return false;
        if (o.__who) return true;
        var w = function (list) {
            try { stampWho(list); } catch (e) { console.warn('[밤사이] 이름 붙이기 실패', e); }
            return o.apply(this, arguments);
        };
        Object.keys(o).forEach(function (k) { try { w[k] = o[k]; } catch (e) {} });
        w.__who = true;
        window.saveTrackerToFirebase = w;
        return true;
    }

    /* ---------- 어젯밤 ---------- */
    function nightOf(now) {
        var s0 = today0(now);
        var all = records().filter(function (r) { return r && ts(r) && ts(r) <= now + 5 * MIN; });

        // 잠 조각 (20시간 넘는 건 '끝났다' 를 안 누른 기록이라 뺀다)
        var segs = [];
        all.forEach(function (r) {
            if (r.type !== 'sleep') return;
            var a = ts(r), b = r.endTs ? Number(r.endTs) : (Number(r.amount) ? a + Number(r.amount) * MIN : 0);
            if (!b || b <= a || b - a > 20 * H) return;
            segs.push({ a: a, b: b, live: false });
        });
        /* 지금 자는 중 — ⚠️ 어제 낮잠에 '깼어요' 를 안 누른 채 두면 '14:00 부터 17시간째 자는 중' 이 밤으로 잡힌다.
              밤잠도 15시간을 넘지는 않는다. 그보다 길면 잊고 안 끈 것이라 밤으로 치지 않는다. */
        var since = Number(get('tosil_sleep_start')) || 0;
        if (since && since <= now && now - since < 15 * H) segs.push({ a: since, b: now, live: true });

        var lo = s0 - 4 * H, hi = s0 + 7 * H;                  // 어젯밤 8시 ~ 오늘 아침 7시
        var night = segs.filter(function (g) { var mid = (g.a + g.b) / 2; return mid >= lo && mid < hi; })
                        .sort(function (x, y) { return x.a - y.a; });

        var n = { bySleep: night.length > 0, live: false, start: 0, end: 0, sleep: 0, longest: null,
                  wakes: [], feeds: [], diapers: [] };
        if (n.bySleep) {
            n.start = night[0].a;
            n.end = 0;
            night.forEach(function (g) { if (g.b > n.end) n.end = g.b; if (g.live) n.live = true; });
        } else {
            n.start = s0 - 2 * H;                               // 밤 10시
            n.end = Math.min(now, s0 + 6 * H);                  // 새벽 6시
        }

        var evs = all.filter(function (r) {
            var t = ts(r);
            return (r.type === 'feed' || r.type === 'diaper') && t >= n.start && t <= n.end;
        }).sort(function (x, y) { return ts(x) - ts(y); });
        n.feeds = evs.filter(function (r) { return r.type === 'feed' && String(r.subType || '').indexOf('이유식') < 0; });
        n.diapers = evs.filter(function (r) { return r.type === 'diaper'; });

        // 깬 때 — 남긴 기록 + 잠과 잠 사이 (세 시간 안). 45분 안에 붙은 건 한 번
        var marks = evs.map(ts);
        night.forEach(function (g, i) {
            var nx = night[i + 1];
            if (nx && nx.a > g.b && nx.a - g.b < 3 * H) marks.push(g.b);
        });
        marks.sort(function (x, y) { return x - y; });
        var last = -Infinity;
        marks.forEach(function (t) { if (t - last > 45 * MIN) n.wakes.push(t); last = t; });

        // 잔 시간 (겹친 조각은 한 번만) · 제일 길게 잔 잠 (깬 기록에서 끊는다)
        var merged = [];
        night.forEach(function (g) {
            var top = merged[merged.length - 1];
            if (top && g.a <= top[1]) top[1] = Math.max(top[1], g.b); else merged.push([g.a, g.b]);
        });
        merged.forEach(function (m) { n.sleep += (m[1] - m[0]) / MIN; });
        merged.forEach(function (m) {
            var cuts = [m[0]];
            marks.forEach(function (t) { if (t > m[0] && t < m[1]) cuts.push(t); });
            cuts.push(m[1]);
            for (var c = 1; c < cuts.length; c++) {
                if (!n.longest || cuts[c] - cuts[c - 1] > n.longest[1] - n.longest[0]) n.longest = [cuts[c - 1], cuts[c]];
            }
        });
        n.any = n.bySleep || evs.length > 0;
        return n;
    }

    /* ---------- 띄워도 되나 ---------- */
    function birth() {
        var s = String(get('tosil_startDate') || '');
        if (!/^\d{4}-\d{1,2}-\d{1,2}/.test(s)) return null;
        var p = s.slice(0, 10).split('-').map(Number);
        return new Date(p[0], p[1] - 1, p[2]).getTime();
    }
    function blocked(now) {
        var b = birth();
        if (!b || b > now) return true;
        if (typeof window.babyStage === 'function') { try { if (window.babyStage() !== 'born') return true; } catch (e) {} }
        return helper();
    }
    function hiddenToday(now) { return get(HIDE) === dayKey(now) + suffix(); }
    function thankedToday(now) { return get(THANKS) === dayKey(now) + suffix(); }

    /* ---------- 카드 ---------- */
    function feedText(r) {
        var sub = String(r.subType || '맘마'), amt = Number(r.amount) || 0;
        if (sub.indexOf('모유') > -1) return '모유' + (r.status ? ' ' + r.status : '') + (amt ? ' ' + amt + '분' : '');
        return sub + (amt ? ' ' + amt + 'ml' : '');
    }
    function diaperText(r) {
        var s = String(r.subType || '');
        if (s === '소변+대변') return '소변 · 응가';
        if (s === '대변') return '응가';
        return s || '기저귀';
    }
    function whoTag(r, me) { return r.byWord && r.byWord !== me ? ' (' + r.byWord + ')' : ''; }
    /* ⚠️ '05:40 모유 / 왼쪽 14분' 처럼 한 칸이 두 줄로 쪼개졌다. 한 칸은 한 덩어리로 묶고, 줄은 칸 사이에서만 바뀌게 */
    function chunk(t) { return '<span style="white-space:nowrap;">' + esc(t) + '</span>'; }
    function listOf(arr, fn, me, max) {
        var out = arr.slice(0, max).map(function (r) { return chunk(hhmm(ts(r)) + ' ' + fn(r) + whoTag(r, me)); }).join(' · ');
        return arr.length > max ? out + ' · ' + chunk('외 ' + (arr.length - max) + '번') : out;
    }
    /* 밤사이 챙긴 짝꿍 (엄마 · 아빠 — 고맙다고 할 사람) */
    function partnerHelp(n, me) {
        var who = {}, best = '', cnt = { feed: 0, diaper: 0 };
        n.feeds.concat(n.diapers).forEach(function (r) {
            var w = r.byWord;
            if (!w || w === me || (w !== '엄마' && w !== '아빠')) return;
            who[w] = (who[w] || 0) + 1;
            if (!best || who[w] > who[best]) best = w;
        });
        if (!best) return null;
        n.feeds.forEach(function (r) { if (r.byWord === best) cnt.feed++; });
        n.diapers.forEach(function (r) { if (r.byWord === best) cnt.diaper++; });
        return { word: best, feed: cnt.feed, diaper: cnt.diaper };
    }

    function row(label, val, sub) {
        return '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:11px 0;border-top:1px solid ' + LINE + ';">' +
            '<span style="flex-shrink:0;font-size:14px;font-weight:700;color:' + SUB + ';">' + label + '</span>' +
            '<span style="min-width:0;text-align:right;"><span style="font-size:15px;font-weight:800;color:' + INK + ';">' + val + '</span>' +
                (sub ? '<div style="font-size:12px;font-weight:600;color:' + SUB + ';margin-top:3px;line-height:1.5;word-break:keep-all;">' + sub + '</div>' : '') +
            '</span></div>';
    }

    function cardHTML(n, now) {
        var me = myWord();
        var NONE = '기록 없어요';
        var range = hhmm(n.start) + ' ~ ' + (n.live ? '지금' : hhmm(n.end));
        var rows = '';
        if (n.bySleep) {
            var lg = n.longest ? Math.round((n.longest[1] - n.longest[0]) / MIN) : 0;
            rows += row('잠', n.live ? dur(n.sleep) + '째 자는 중' : dur(n.sleep),
                lg >= 30 && n.wakes.length ? '제일 길게 ' + dur(lg) + ' · ' + hhmm(n.longest[0]) + '~' + (n.live && n.longest[1] >= now - MIN ? '지금' : hhmm(n.longest[1])) : '');
        }
        rows += row('깬 때', n.wakes.length ? n.wakes.length + '번' : '깬 기록이 없어요',
            n.wakes.length ? n.wakes.slice(0, 5).map(function (t) { return chunk(hhmm(t)); }).join(' · ') + (n.wakes.length > 5 ? ' …' : '') : '');
        var ml = 0, bmin = 0;
        n.feeds.forEach(function (r) {
            var amt = Number(r.amount) || 0;
            if (String(r.subType || '').indexOf('모유') > -1) bmin += amt; else ml += amt;
        });
        var fval = n.feeds.length ? n.feeds.length + '번' + (ml ? ' · ' + ml + 'ml' : '') + (bmin ? ' · 모유 ' + bmin + '분' : '') : NONE;
        rows += row('맘마', fval, n.feeds.length ? listOf(n.feeds, feedText, me, 4) : '');
        rows += row('기저귀', n.diapers.length ? n.diapers.length + '번' : NONE, n.diapers.length ? listOf(n.diapers, diaperText, me, 4) : '');

        var help = partnerHelp(n, me), thanks = '';
        if (help && !helper() && get('family_sync_code')) {
            var done = thankedToday(now);
            thanks = '<div id="nc-thanks" onclick="' + (done ? '' : 'window.__nightThanks()') + '" ' +
                'style="margin-top:12px;padding:13px 14px;border-radius:13px;text-align:center;font-size:14px;font-weight:800;cursor:' + (done ? 'default' : 'pointer') + ';' +
                (done ? 'background:var(--bg-sub);color:' + SUB + ';' : 'background:rgba(127,119,221,0.10);color:#5B53B8;') + '">' +
                (done ? esc(help.word) + '에게 고맙다고 했어요' : esc(help.word) + '에게 고맙다고 하기') + '</div>';   // ⚠️ 💛 는 emoji.js 가 장식으로 지운다 (알림 제목에만 쓴다)
        }
        return '<div id="' + CARD + '" class="hide-on-senior" style="background:var(--bg-card);border:1px solid var(--border);border-radius:20px;padding:18px 18px 14px;margin-bottom:14px;box-shadow:0 2px 8px rgba(0,0,0,0.02);">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px;">' +
                '<span style="font-size:16px;font-weight:900;color:' + INK + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">밤사이 ' + esc(babyCall('')) + '</span>' +
                '<span style="display:flex;align-items:center;gap:10px;flex-shrink:0;">' +
                    '<span style="font-size:12.5px;font-weight:700;color:' + SUB + ';">' + range + '</span>' +
                    '<span onclick="window.__nightHide()" aria-label="닫기" style="font-size:16px;line-height:1;color:#B3A498;cursor:pointer;padding:2px 2px 2px 6px;">✕</span>' +
                '</span></div>' +
            rows + thanks +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;">' +
                '<span style="font-size:11.5px;font-weight:600;color:var(--text-sub);">남긴 기록으로만 셌어요</span>' +
            '</div></div>';
    }

    /* ---------- 홈에 놓기 ---------- */
    /* 기록 버튼(지금 꿈이) 바로 아래 — 위에 두면 아침마다 기록 버튼이 화면 밖으로 밀려 늘 누르던 자리가 바뀐다 */
    var NEXT = ['tracker-stats-container', 'info-month-home', 'em-count', 'home-qa-card', 'home-memorybox-card'];
    function blockOf(id, host) {
        var el = document.getElementById(id);
        while (el && el.parentNode && el.parentNode !== host) el = el.parentNode;
        return el && el.parentNode === host ? el : null;
    }
    var lastHTML = '';
    /* 카드가 떠 있으면 '오늘 하루' 의 잠 한 줄을 숨긴다 (같은 말을 두 번 하지 않게) */
    function mark(on) {
        var root = document.documentElement;
        if (!document.getElementById('nc-style')) {
            var st = document.createElement('style');
            st.id = 'nc-style';
            st.textContent = 'html.nc-on #today-sleep-caption{display:none !important;}';
            (document.head || root).appendChild(st);
        }
        root.classList.toggle('nc-on', !!on);
    }
    function render() {
        var host = document.getElementById('tab-home');
        var old = document.getElementById(CARD);
        var now = Date.now(), h = new Date(now).getHours();
        var n = null;
        if (host && h >= FROM_H && h < TO_H && !blocked(now) && !hiddenToday(now)) {
            n = nightOf(now);
            if (!n.any) n = null;
        }
        mark(!!n);
        if (!n) { if (old) old.remove(); lastHTML = ''; return; }
        var html = cardHTML(n, now);
        if (old && html === lastHTML && old.parentNode === host) return;   // 그대로면 손대지 않는다 (화면이 튀지 않게)
        lastHTML = html;
        var box = document.createElement('div');
        box.innerHTML = html;
        var el = box.firstChild;
        if (old && old.parentNode) { old.parentNode.replaceChild(el, old); return; }
        var before = null;
        for (var i = 0; i < NEXT.length && !before; i++) before = blockOf(NEXT[i], host);
        if (before) host.insertBefore(el, before); else host.appendChild(el);
        if (typeof window.relayoutHome === 'function') { try { window.relayoutHome(); } catch (e) {} }
    }
    var tick = 0;
    function soon(ms) { clearTimeout(tick); tick = setTimeout(render, ms || 0); }
    window.refreshNightCard = render;

    window.__nightHide = function () {
        set(HIDE, dayKey(Date.now()) + suffix());
        var c = document.getElementById(CARD);
        if (c) c.remove();
        lastHTML = '';
        mark(false);
    };

    window.__nightThanks = function () {
        var now = Date.now(), me = myWord();
        var n = nightOf(now), help = partnerHelp(n, me);
        if (!help || thankedToday(now)) return;
        if (!window.functions || typeof window.httpsCallable !== 'function' || !get('family_sync_code')) {
            return toast('가족 연결을 하면 짝꿍 폰에 보낼 수 있어요');
        }
        var b = document.getElementById('nc-thanks');
        if (b) { b.style.opacity = '0.5'; b.onclick = null; b.removeAttribute('onclick'); }
        var what = [];
        if (help.feed) what.push('맘마 ' + help.feed + '번');
        if (help.diaper) what.push('기저귀 ' + help.diaper + '번');
        window.httpsCallable(window.functions, 'sendFamilyPush')({
            syncCode: get('family_sync_code'),
            excludeUid: myUid() || null,
            excludeToken: (typeof window.myPushToken === 'function') ? window.myPushToken() : null,
            title: '💛 ' + me + josa(me, '이', '가') + ' 고마워해요',
            body: '밤사이 ' + babyCall('') + ' ' + what.join(' · ') + ', 챙겨 줘서 고마워요',
            link: 'index.html',
            skipRoles: ['viewer']
        }).then(function (r) {
            var how = (typeof window.familyPushResult === 'function') ? window.familyPushResult(r)
                    : ((r && r.data && r.data.success === false) ? 'failed' : 'sent');
            if (how === 'sent') {
                set(THANKS, dayKey(Date.now()) + suffix());
                lastHTML = ''; render();
                return toast(help.word + '에게 보냈어요');
            }
            if (b) { b.style.opacity = ''; b.onclick = window.__nightThanks; }
            if (how === 'nopartner') return toast('짝꿍이 아직 가족방에 없어요');
            if (how === 'notoken') return toast(help.word + ' 폰 알림이 꺼져 있어요. 만나면 꼭 말로 해 주세요');
            toast('알림을 못 보냈어요. 잠시 뒤에 다시 눌러 주세요');
        }).catch(function (e) {
            console.warn('[밤사이] 고마워요 알림 실패', e);
            if (b) { b.style.opacity = ''; b.onclick = window.__nightThanks; }
            toast('알림을 못 보냈어요. 잠시 뒤에 다시 눌러 주세요');
        });
    };

    /* ---------- 시작 ---------- */
    // 기록이 바뀌면 (내가 남기거나 짝꿍 폰에서 오면) 다시 센다 — 대시보드를 다시 그릴 때마다 불린다
    function wrapDash() {
        var d = window.updateTrackerDashboard;
        if (typeof d !== 'function') return false;
        if (d.__night) return true;
        var w = function () {
            var out;
            try { out = d.apply(this, arguments); } finally { soon(50); }
            return out;
        };
        Object.keys(d).forEach(function (k) { try { w[k] = d[k]; } catch (e) {} });
        w.__night = true;
        window.updateTrackerDashboard = w;
        return true;
    }
    var tries = 0;
    (function go() {
        var ok = wrapSave() & wrapDash();
        if (!ok && ++tries < 40) setTimeout(go, 250);
    })();
    [1500, 4000, 9000].forEach(function (t) { setTimeout(render, t); });
    setInterval(render, 5 * 60000);                                  // 5시에 뜨고 12시에 내려가게
    document.addEventListener('visibilitychange', function () { if (!document.hidden) soon(600); });

    window.nightDebug = function () {
        var n = nightOf(Date.now());
        console.log('밤:', n.bySleep ? '잠 기록으로' : '밤 10시 ~ 새벽 6시', hhmm(n.start) + ' ~ ' + hhmm(n.end), n.live ? '(자는 중)' : '');
        console.log('잔 시간:', dur(n.sleep), '· 깬 때:', n.wakes.map(hhmm).join(', ') || '없음', '· 맘마:', n.feeds.length, '· 기저귀:', n.diapers.length);
        console.log('띄움:', !!document.getElementById(CARD), '· 막힘:', blocked(Date.now()), '· 오늘 닫음:', hiddenToday(Date.now()));
        return n;
    };
})();
