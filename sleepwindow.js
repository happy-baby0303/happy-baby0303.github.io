/* ============================================================
   배냇함 — 다시 졸릴 때 (sleepwindow.js)

   왜
     깨어 있는 시간이 길어지면 아기는 지쳐서 오히려 잘 못 잔다. 부모는 하루 종일 '언제 재워야 하지?' 를 짐작한다.
     월령별 표(4개월은 1시간 반~2시간 …)는 남의 아기 평균이다. 꿈이는 꿈이 시계로 잔다.
     배냇함에는 꿈이가 언제 깨서 얼마 뒤에 다시 잠들었는지가 다 남아 있다. 그걸로 말한다.

   하는 일 — 깨어 있을 때, 홈 '지금 꿈이' 세 칸 바로 아래 한 줄
       😪 12:30쯤 다시 졸려할 거예요
          이맘때 깨면 보통 2시간 40분쯤 뒤에 잤어요 · 지난 7일
     다음 잠이 보통 밤잠이었으면
       🌙 20:40쯤 밤잠 들 때예요
          이맘때 깨면 보통 4시간쯤 뒤에 밤잠을 잤어요 · 지난 7일
     그때가 되면 '지금쯤 졸려할 때예요', 지나면 '평소보다 20분 더 깨어 있어요'.
     돌봄 도우미 화면 · '밖에 있어요' 카드의 잠 줄에도 짧게 붙는다 (window.sleepyGuess).

   어떻게 세나
     잠 기록을 시각 순으로 늘어놓고, 한 잠이 끝난 때부터 다음 잠이 시작한 때까지를 '깨어 있던 시간' 으로 본다.
     지금 깨어 있는 시작(마지막 잠이 끝난 때)과 비슷한 시각(±75분)에 깼던 날들만 골라 가운데 값(중앙값)을 쓴다.
       아침 첫 낮잠 전과 밤잠 전은 깨어 있는 시간이 다르다. 하루 전체 평균을 내면 둘 다 틀린다.
     지난 7일에서 고르고, 모자라면 2주까지 본다.

   말하지 않는 때 (틀린 말을 하느니 안 하는 게 낫다)
     · 자는 중 (수면 타이머가 켜져 있다)
     · 깬 때가 밤 9시 ~ 새벽 5시 — 새벽에 깬 건 다시 재울 때지, 다음 잠을 기다릴 때가 아니다
     · 깬 지 6시간이 넘었다 — 잠 기록이 빠졌을 가능성이 크다
     · 비슷한 시각에 깼던 날이 사흘이 안 된다 · 표본이 셋이 안 된다
     · 짐작한 때를 한 시간 넘게 지났다 — 낮잠을 안 적었을 가능성이 크다
     깨어 있던 시간이 15분보다 짧거나 6시간보다 긴 건 표본에서 뺀다 (잠깐 깬 것 · 빠진 기록).

   index.html 에서 sleepguard.js 다음에 로드하세요 (같은 updateTrackerDashboard 를 감싼다).
   ============================================================ */
(function () {
    'use strict';
    if (window.__sleepy) return;
    window.__sleepy = true;

    var MIN = 60000, HOUR = 60 * MIN, DAY = 24 * HOUR;
    var DAY_FROM = 5 * 60, DAY_TO = 21 * 60;      // 이 사이에 깬 것만 (분)
    var NEAR = 75;                                // '이맘때' = 깬 시각 ±75분
    var MIN_GAP = 15, MAX_GAP = 6 * 60;           // 표본으로 쓰는 깨어 있던 시간 (분)
    var MIN_SAMPLES = 3, MIN_DAYS = 3;
    var STALE = 6 * HOUR;
    var LATE_MAX = 60;                            // 짐작한 때를 이만큼 넘기면 말하지 않는다 (분)
    var ID = 'now-sleepy';

    function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function pad(n) { return String(n).padStart(2, '0'); }
    function hm(ms) { var d = new Date(ms); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
    function tod(ms) { var d = new Date(ms); return d.getHours() * 60 + d.getMinutes(); }
    function dayKey(ms) { var d = new Date(ms); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function dur(m) {
        m = Math.max(0, Math.round(m));
        var h = Math.floor(m / 60), r = m % 60;
        return h ? h + '시간' + (r ? (r === 30 ? ' 반' : ' ' + r + '분') : '') : r + '분';
    }
    function records() {
        try { var l = JSON.parse(get('tosil_tracker_records')) || []; return Array.isArray(l) ? l : []; } catch (e) { return []; }
    }
    function helperView() { return get('user_role') === 'senior'; }

    /* 잠 기록 → [시작, 끝] (겹치거나 5분 안에 붙은 건 하나로) */
    function segs() {
        var list = [];
        records().forEach(function (r) {
            if (!r || r.type !== 'sleep') return;
            var s = Number(r.timestamp);
            if (!s) return;
            var e = r.endTs ? Number(r.endTs) : (Number(r.amount) > 0 ? s + Number(r.amount) * MIN : 0);
            if (!e || e <= s || e - s > 20 * HOUR) return;           // 끝이 없거나(타이머) 20시간 넘는 건 빼고
            list.push({ s: s, e: e, night: r.subType === '밤잠' });
        });
        list.sort(function (a, b) { return a.s - b.s; });
        var out = [];
        list.forEach(function (g) {
            var last = out[out.length - 1];
            if (last && g.s <= last.e + 5 * MIN) { if (g.e > last.e) last.e = g.e; }
            else out.push({ s: g.s, e: g.e, night: g.night });
        });
        return out;
    }

    /* 깨어 있던 시간들: 한 잠이 끝난 때 → 다음 잠이 시작한 때 */
    function windows(list, now) {
        var out = [];
        for (var i = 0; i + 1 < list.length; i++) {
            var w = list[i].e, n = list[i + 1].s, gap = (n - w) / MIN, t = tod(w);
            if (n > now) continue;
            if (t < DAY_FROM || t >= DAY_TO) continue;
            if (gap < MIN_GAP || gap > MAX_GAP) continue;
            out.push({ w: w, t: t, gap: gap, night: list[i + 1].night, day: dayKey(w) });
        }
        return out;
    }

    function days(list) {
        var seen = {};
        list.forEach(function (x) { seen[x.day] = 1; });
        return Object.keys(seen).length;
    }
    function median(a) {
        var b = a.slice().sort(function (x, y) { return x - y; }), n = b.length;
        return n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2;
    }

    /* 지금 깨어 있으면 다음 잠을 짐작한다. 말할 수 없으면 null */
    function guess(now) {
        now = now || Date.now();
        if (get('tosil_sleep_start')) return null;                 // 자는 중
        var list = segs(), last = null;
        for (var i = list.length - 1; i >= 0; i--) {
            if (list[i].e <= now + MIN) { last = list[i]; break; }
        }
        if (!last) return null;
        var W = last.e, t = tod(W);
        if (now - W > STALE) return null;
        if (t < DAY_FROM || t >= DAY_TO) return null;

        var all = windows(list, now).filter(function (x) { return x.w < W - MIN; });   // 지금 깨어 있는 건 아직 안 끝났다
        function near(span) {
            var from = W - span * DAY;
            return all.filter(function (x) { return x.w >= from && Math.abs(x.t - t) <= NEAR; });
        }
        var span = 7, got = near(7);
        if (got.length < MIN_SAMPLES || days(got) < MIN_DAYS) { span = 14; got = near(14); }
        if (got.length < MIN_SAMPLES || days(got) < MIN_DAYS) return null;

        var med = median(got.map(function (x) { return x.gap; }));
        var night = got.filter(function (x) { return x.night; }).length * 2 > got.length;
        var at = Math.round((W + med * MIN) / (5 * MIN)) * 5 * MIN;
        var left = Math.round((at - now) / MIN);
        if (left < -LATE_MAX) return null;

        var g = { at: at, wake: W, gap: med, night: night, left: left, samples: got.length, days: days(got), span: span };
        g.icon = night ? '🌙' : '😪';
        g.sub = '이맘때 깨면 보통 ' + dur(Math.round(med / 10) * 10) + '쯤 뒤에 ' + (night ? '밤잠을 잤어요' : '잤어요') +
                ' · 지난 ' + (span === 7 ? '7일' : '2주');
        if (left > 15) {
            g.title = hm(at) + (night ? '쯤 밤잠 들 때예요' : '쯤 다시 졸려할 거예요');
            g.short = hm(at) + (night ? '쯤 밤잠 들 때예요' : '쯤 다시 졸려해요');
            g.state = 'ahead';
        } else if (left >= -15) {
            g.title = g.short = night ? '지금쯤 밤잠 들 때예요' : '지금쯤 졸려할 때예요';
            g.state = 'now';
        } else {
            g.title = '평소보다 ' + dur(Math.round(-left / 5) * 5) + ' 더 깨어 있어요';
            g.short = '평소보다 오래 깨어 있어요';
            g.state = 'late';
        }
        return g;
    }
    window.sleepyGuess = function (now) { try { return guess(now); } catch (e) { return null; } };

    /* ---------- 홈 '지금 꿈이' 세 칸 아래 ---------- */
    function paint() {
        var old = document.getElementById(ID);
        var state = document.getElementById('now-sleep-state');
        var col = state && state.parentElement, row = col && col.parentElement;
        var g = helperView() ? null : window.sleepyGuess();
        if (!g || !row || !row.parentNode) { if (old) old.remove(); return; }
        var tone = g.state === 'late' ? '#9A6B12' : '#4F47A5', bg = g.state === 'late' ? '#FBF5E8' : '#F4F2FC';
        var html = '<div style="font-size:18px;line-height:1;flex-shrink:0;">' + g.icon + '</div>' +
            '<div style="flex:1;min-width:0;">' +
                '<div style="font-size:14px;font-weight:800;color:' + tone + ';letter-spacing:-0.2px;">' + esc(g.title) + '</div>' +
                '<div style="font-size:12px;font-weight:600;color:var(--text-sub);margin-top:3px;line-height:1.45;word-break:keep-all;">' + esc(g.sub) + '</div>' +
            '</div>';
        var el = old;
        if (!el) {
            el = document.createElement('div');
            el.id = ID;
            el.className = 'hide-on-senior';
            el.setAttribute('role', 'note');
        }
        el.style.cssText = 'display:flex;align-items:center;gap:12px;margin-top:16px;padding:12px 14px;border-radius:14px;background:' + bg + ';';
        if (el.getAttribute('data-k') !== html) { el.innerHTML = html; el.setAttribute('data-k', html); }
        if (el.parentNode !== row.parentNode || el.previousElementSibling !== row) row.parentNode.insertBefore(el, row.nextSibling);
    }
    window.refreshSleepy = paint;

    function wrapDash() {
        var d = window.updateTrackerDashboard;
        if (typeof d !== 'function') return false;
        if (d.__sleepy) return true;
        var w = function () {
            var out;
            try { out = d.apply(this, arguments); } finally { try { paint(); } catch (e) {} }
            return out;
        };
        Object.keys(d).forEach(function (k) { try { w[k] = d[k]; } catch (e) {} });
        w.__sleepy = true;
        window.updateTrackerDashboard = w;
        return true;
    }

    var tries = 0;
    (function go() { if (!wrapDash() && ++tries < 40) setTimeout(go, 250); })();
    window.addEventListener('load', function () { setTimeout(function () { wrapDash(); paint(); }, 0); });
    setTimeout(paint, 1500);
    setInterval(paint, 60000);                       // '지금쯤 · 평소보다' 로 넘어가는 순간에도 바뀌게

    window.sleepyDebug = function () {
        var g = window.sleepyGuess(), list = segs(), all = windows(list, Date.now());
        console.log(g ? g.title + ' / ' + g.sub + ' (표본 ' + g.samples + '개 · ' + g.days + '일)' : '지금은 말하지 않아요', all.slice(-12));
        return g;
    };
})();
