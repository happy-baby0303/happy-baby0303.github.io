/* ============================================================
   배냇함 — 교정 나이 (shared/babyage.js)

   이른둥이(예정일보다 3주 넘게 일찍, 37주 전에 태어난 아기)는
   두 돌까지 '예정일' 부터 센 나이(교정 나이)로 발달을 본다.
   8주 일찍 태어난 아기가 생후 5개월이면, 교정 나이는 3개월쯤이다.

   교정 나이로 보는 것 — 발달 · 먹는 것 · 노는 것
     원더윅스, 또래 키 · 몸무게 비교, 맞춤 육아정보, 이유식 · 젖병 · 장난감 · 유모차 추천
   태어난 날로 그대로 세는 것
     D+, 백일 · 돌 · 기념일, 예방접종, 카시트(법 · 안전 기준), 해열제 · 응급, 나들이 장소(입장 나이)

   저장 (아기마다 — script.js BABY_SPECIFIC_KEYS, shared/babyswitch.js BABY_KEYS 에 같이 있다)
     tosil_preterm = { due: '2026-07-21', at: 고친 시각, ok: 이 폰에서 동의한 시각 }
     예정일을 넣는 창 · 가족 폰과 맞추기는 본 앱의 preterm.js 가 한다. 이 파일은 셈만 한다.

   쓰는 법
     BabyAge.on()             교정 나이로 보는 중인가 (이른둥이 · 두 돌 전)
     BabyAge.key()            발달을 세기 시작하는 날 'YYYY-MM-DD' (교정이면 예정일, 아니면 생일)
     BabyAge.months()         발달 개월(교정 나이) · BabyAge.months('real') 실제 개월
     BabyAge.days() · weeks() · monthsAt(날짜)   ('real' 을 넘기면 실제 나이)
     BabyAge.pre('생후 ')     교정이면 '교정 ', 아니면 넘겨준 말 그대로
     BabyAge.label()          '교정 5개월' · '교정 3주' · '예정일까지 12일' (교정이 아니면 '')
     BabyAge.early()          예정일보다 며칠 일찍 태어났나 (이른둥이가 아니면 0)
     BabyAge.ga()             태어난 주수 { w: 32, d: 0 } (이른둥이가 아니면 null)

   본 앱 index.html 은 script.js 앞, 큐레이터는 babyswitch.js 바로 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';
    if (window.BabyAge) return;

    var KEY = 'tosil_preterm';
    var DAY = 86400000;
    var MIN_EARLY = 22;     // 예정일보다 22일 넘게 일찍 = 37주가 되기 전에 태어남
    var MAX_EARLY = 126;    // 18주 넘게 일찍(22주 전)은 날짜를 잘못 넣은 것으로 본다
    var UNTIL = 24;         // 두 돌(실제 나이 24개월)까지만 교정 나이로 본다

    function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    function keyOf(d) { return d ? d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) : ''; }
    function parse(k) {
        var m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(k || ''));
        if (!m) return null;
        var d = new Date(+m[1], +m[2] - 1, +m[3]);
        return isNaN(d.getTime()) ? null : d;
    }
    function day0(d) { var t = d ? new Date(d) : new Date(); t.setHours(0, 0, 0, 0); return t; }
    function between(a, b) { return Math.round((day0(b) - day0(a)) / DAY); }
    // 달력으로 센 개월 (큐레이터들이 쓰던 셈과 같다: 그달의 생일이 안 지났으면 한 달 덜)
    function monthsBetween(a, b) {
        var m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
        if (b.getDate() < a.getDate()) m--;
        return m;
    }

    function read() {
        try { var v = JSON.parse(get(KEY) || 'null'); return (v && typeof v === 'object') ? v : {}; } catch (e) { return {}; }
    }
    function birth() { return parse(get('tosil_startDate')); }
    function due() { return parse(read().due); }

    /* 예정일이 생일보다 며칠 뒤인가 — 이른둥이가 아니면 0 */
    function earlyOf(b, d) {
        if (!b || !d) return 0;
        var n = between(b, d);
        return (n >= MIN_EARLY && n <= MAX_EARLY) ? n : 0;
    }
    function early() { return earlyOf(birth(), due()); }

    function on() {
        var b = birth();
        if (!earlyOf(b, due())) return false;
        return monthsBetween(b, day0()) < UNTIL;
    }

    /* 세기 시작하는 날 — 'real' 이면 생일, 아니면 교정 중일 때만 예정일 */
    function start(kind) {
        var b = birth();
        if (!b) return null;
        if (kind === 'real' || !on()) return b;
        return due();
    }

    function days(kind, at) { var s = start(kind); return s ? between(s, at || new Date()) : null; }
    function weeks(kind, at) { var n = days(kind, at); return n === null ? null : Math.floor(n / 7); }
    function monthsAt(at, kind) {
        var s = start(kind);
        if (!s || !at) return null;
        var m = monthsBetween(s, day0(at));
        return m < 0 ? 0 : m;
    }
    function months(kind) { return monthsAt(new Date(), kind); }

    function pre(def) { return on() ? '교정 ' : (def == null ? '' : def); }

    function label() {
        if (!on()) return '';
        var n = days();
        if (n < 0) return '예정일까지 ' + (-n) + '일';
        var m = months();
        return m < 1 ? '교정 ' + Math.floor(n / 7) + '주' : '교정 ' + m + '개월';
    }

    function gaOf(n) { var g = 280 - n; return { w: Math.floor(g / 7), d: g % 7 }; }
    function ga() { var e = early(); return e ? gaOf(e) : null; }

    /* 넣으려는 날짜가 맞는지 — 예정일 넣는 창에서 쓴다 */
    function check(birthKey, dueKey) {
        var b = parse(birthKey), d = parse(dueKey);
        if (!b) return { ok: false, why: 'nobirth' };
        if (!d) return { ok: false, why: 'empty' };
        var n = between(b, d);
        if (n <= 0) return { ok: false, why: 'before', n: n };
        if (n < MIN_EARLY) return { ok: false, why: 'term', n: n };
        if (n > MAX_EARLY) return { ok: false, why: 'far', n: n };
        return { ok: true, n: n, ga: gaOf(n) };
    }

    window.BabyAge = {
        KEY: KEY, MIN_EARLY: MIN_EARLY, MAX_EARLY: MAX_EARLY, UNTIL: UNTIL,
        read: read, on: on, early: early, ga: ga, check: check, start: start,
        key: function (kind) { return keyOf(start(kind)) || (get('tosil_startDate') || ''); },
        days: days, weeks: weeks, months: months, monthsAt: monthsAt,
        pre: pre, label: label,
        parse: parse, keyOf: keyOf, between: between, monthsBetween: monthsBetween
    };
})();
