/* ============================================================
   배냇함 — 백일 · 돌 한 장 (recap.js)

   50일 · 백일 · 첫 돌 · 두 돌. 그날부터 일주일 동안 홈에 한 장이 뜬다.
     · 사진 — 태어난 무렵부터 그날까지 고르게 골라 나란히 (돌은 열두 장)
     · '백 일 동안 1,720번 달려갔어요 · 그중 214번은 모두가 잠든 새벽이었어요'
     · 맘마 · 잠 · 기저귀 / 처음 해낸 일 / 키 · 몸무게 / 첫 마디 / 처음 남긴 한 줄
   [한 장으로 보기] → 사진으로 저장 · 가족에게 보내기 / 짝꿍 폰에도 알리기
   일주일이 지나면 홈에서는 내려가고, 배냇함의 그날(기념일 카드)에서 다시 연다.

   ⚠️ 견주지 않는다. 또래 평균 · 권장량 · 엄마 몇 번 아빠 몇 번 같은 숫자가 없다. 우리 집 숫자만.
   ⚠️ 담긴 게 거의 없으면 뜨지 않는다. 앱을 늦게 깐 집은 '기록한 N일 동안' 이라고 적는다
      (백 일을 다 센 것처럼 쓰지 않는다).
   ⚠️ 날짜는 태어난 날로 센다. 이른둥이도 백일 · 돌은 태어난 날부터다 (shared/babyage.js).
   ⚠️ 숫자는 가족 장부(carelog.js)에서 가져온다. 폰마다 장부가 달라서 두 폰이 다른 숫자를 냈다.

   저장: tosil_recap (아기마다 · script.js BABY_SPECIFIC_KEYS) = { hide: { d100: 1 }, sent: { d100: 1 } }
   ?go=recap&k=d100 으로 열면 그 한 장을 바로 연다 (짝꿍에게 간 알림).
   index.html 에서 anniversaries.js · weekly.js · carelog.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';
    if (window.__recapOn) return;
    window.__recapOn = true;

    var KEY = "tosil_recap", CARD = "home-recap-card", SHEET = "recap-sheet";
    var PAPER = "#FFFDF9", LINE = "#EFE7DC", INK = "#3B322C", SUB = "#8A7F76", MUTE = "#B5AAA0", TINT = "#F5EFE6", GOLD = "#B98A2E";
    var SERIF = "'Gowun Batang', 'Noto Serif KR', 'Noto Serif CJK KR', serif";
    var DAY = 86400000, SHOW_DAYS = 7;

    /* 그날의 도감 도장(백일 · 첫돌)에 붙인 사진이 있으면 그게 그날 사진이다 */
    var KINDS = [
        { id: "d50",  title: "50일",  span: "오십 일", en: "OUR 50 DAYS",     n: 4,  ms: "",    at: function (b) { return addDays(b, 49); }, byDay: true },
        { id: "d100", title: "백일",  span: "백 일",   en: "OUR 100 DAYS",    n: 4,  ms: "m18", at: function (b) { return addDays(b, 99); } },
        { id: "y1",   title: "첫 돌", span: "한 해",   en: "OUR FIRST YEAR",  n: 12, ms: "m45", at: function (b) { return addMonths(b, 12); } },
        { id: "y2",   title: "두 돌", span: "두 해",   en: "OUR TWO YEARS",   n: 12, ms: "",    at: function (b) { return addMonths(b, 24); } }
    ];
    var SKIP_FIRSTS = { m18: 1, m45: 1 };      // '백일' · '첫돌' 도장은 그날 자체라 '처음 해낸 일' 에서 뺀다

    /* 알림을 눌러 들어왔으면 그 한 장을 연다. ⚠️ script.js 가 DOMContentLoaded 에서 ?go= 를 지우니 지금 적어 둔다 */
    var GO = null;
    try {
        var q = new URLSearchParams(location.search);
        if (q.get("go") === "recap") GO = q.get("k") || "";
    } catch (e) {}

    /* ---------- 작은 도구 ---------- */
    function esc(s) {
        return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }
    // url('…') 안에 들어갈 주소. 따옴표 · 괄호를 먼저 바꾼 뒤 이스케이프한다 (거꾸로 하면 &#39; 가 다시 ' 로 풀린다)
    function cssUrl(u) { return esc(String(u || "").replace(/'/g, "%27").replace(/\(/g, "%28").replace(/\)/g, "%29")); }
    function toast(m) { if (typeof window.showToast === "function") window.showToast(m); }
    function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function getJSON(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    function keyOf(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
    function fromKey(k) { var p = String(k).split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]); }
    function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
    // 1월 31일생의 한 달 뒤는 2월 28일 (anniversaries.js 와 같은 셈)
    function addMonths(d, n) {
        var y = d.getFullYear(), m = d.getMonth() + n, last = new Date(y, m + 1, 0).getDate();
        return new Date(y, m, Math.min(d.getDate(), last));
    }
    function today0() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
    function between(a, b) { return Math.round((new Date(b.getFullYear(), b.getMonth(), b.getDate()) - new Date(a.getFullYear(), a.getMonth(), a.getDate())) / DAY); }
    function monthsBetween(a, b) {
        var m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
        if (b.getDate() < a.getDate()) m--;
        return m;
    }
    function babyName() { return String(get("tosil_babyName") || "").trim() || "우리 아기"; }
    function josa(w, a, b) {
        var c = String(w || "").charCodeAt(String(w || "").length - 1);
        return (c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0) ? a : b;
    }
    function md(d) { return (d.getMonth() + 1) + "월 " + d.getDate() + "일"; }
    function ymd(d) { return d.getFullYear() + "년 " + md(d); }
    function dots(d, withYear) { return (withYear ? d.getFullYear() + ". " : "") + (d.getMonth() + 1) + ". " + d.getDate(); }
    function comma(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
    function round1(x) { return String(Math.round(x * 10) / 10); }
    function hm(mins) {
        mins = Math.round(mins);
        var h = Math.floor(mins / 60), m = mins % 60;
        return h ? h + "시간" + (m ? " " + m + "분" : "") : m + "분";
    }
    function birth() {
        var s = get("tosil_startDate");
        if (!/^\d{4}-\d{1,2}-\d{1,2}/.test(String(s || ""))) return null;
        var d = fromKey(String(s).slice(0, 10));
        return isNaN(d.getTime()) ? null : d;
    }
    function kindOf(id) { for (var i = 0; i < KINDS.length; i++) if (KINDS[i].id === id) return KINDS[i]; return null; }

    /* 아기가 태어난 뒤 · 엄마 아빠 폰에서만 (돌봄 도우미 폰에는 안 띄운다) */
    function blocked() {
        var b = birth();
        if (!b || b > today0()) return true;
        if (typeof window.babyStage === "function" && window.babyStage() !== "born") return true;
        return get("tosil_role_locked") === "viewer";
    }

    /* 지금 홈에 띄울 날 — 그날부터 일주일 */
    function current() {
        var b = birth(); if (!b) return null;
        var t = today0().getTime();
        for (var i = 0; i < KINDS.length; i++) {
            var at = KINDS[i].at(b).getTime();
            if (t >= at && t < at + SHOW_DAYS * DAY) return KINDS[i];
        }
        return null;
    }

    /* ---------- 그동안 뭐가 있었나 ---------- */
    function careSum(fromK, toK) {
        if (window.CareLog && typeof window.CareLog.sum === "function") { try { return window.CareLog.sum(fromK, toK); } catch (e) {} }
        return { care: 0, dawn: 0, feed: 0, diaper: 0, sleep: 0, days: 0, sleepDays: 0 };
    }

    function gather(kind) {
        var b = birth(); if (!b) return null;
        var end = kind.at(b), fromK = keyOf(b), toK = keyOf(end);
        var inRange = function (k) { return k >= fromK && k <= toK; };
        var g = { kind: kind, b: b, end: end, fromK: fromK, toK: toK, nDays: between(b, end) + 1,
                  sum: careSum(fromK, toK), photos: [], photoN: 0, voiceN: 0, noteN: 0, letterN: 0,
                  firsts: [], words: [], growth: null, note: null, special: null };

        try {
            if (typeof window.photoDays === "function") window.photoDays().filter(inRange).sort().forEach(function (k) {
                var list = (window.getDayPhotos(k) || []).filter(function (p) { return p && (p.url || p.thumb || p.id); });
                g.photoN += list.length;
                if (list.length) g.photos.push({ key: k, p: list[0] });
            });
        } catch (e) {}
        try {
            if (kind.ms && typeof window.getMilestonePhoto === "function") {
                var sp = window.getMilestonePhoto(kind.ms);
                if (sp && sp.photo && sp.key && sp.key >= fromK && sp.key <= keyOf(addDays(end, SHOW_DAYS))) g.special = { key: sp.key, p: sp.photo };
            }
        } catch (e) {}
        try {
            if (typeof window.voiceDays === "function") window.voiceDays().filter(inRange).forEach(function (k) {
                g.voiceN += (window.getDayVoices(k) || []).length;
            });
        } catch (e) {}
        try {
            if (typeof window.noteDays === "function") window.noteDays().filter(inRange).sort().forEach(function (k) {
                (window.getDayNotes(k) || []).forEach(function (n) {
                    if (!n || !n.text) return;
                    g.noteN++;
                    var c = { key: k, text: String(n.text), who: n.who || "", ts: Number(n.ts) || 0 };
                    if (!g.note || c.key < g.note.key || (c.key === g.note.key && c.ts < g.note.ts)) g.note = c;
                });
            });
        } catch (e) {}
        var letters = getJSON("tosil_letters", {});
        if (letters && typeof letters === "object") Object.keys(letters).forEach(function (k) { if (inRange(k)) g.letterN++; });

        /* 처음 해낸 일 (도감) */
        var list = null;
        try { if (typeof MILESTONE_DATA !== "undefined" && MILESTONE_DATA) list = MILESTONE_DATA; } catch (e) {}
        list = list || window.MILESTONE_DATA || [];
        var stamps = getJSON("tosil_milestones", []);
        (Array.isArray(stamps) ? stamps : []).forEach(function (a) {
            if (!a || typeof a === "string" || !a.date || SKIP_FIRSTS[a.id]) return;
            var m = String(a.date).match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
            if (!m) return;
            var k = m[1] + "-" + pad(+m[2]) + "-" + pad(+m[3]);
            if (!inRange(k)) return;
            var it = list.filter(function (x) { return x.id === a.id; })[0];
            if (it) g.firsts.push({ title: it.title, key: k });
        });
        g.firsts.sort(function (a, c) { return a.key > c.key ? 1 : -1; });

        /* 첫 마디 */
        var words = getJSON("tosil_first_words", []);
        (Array.isArray(words) ? words : []).forEach(function (w) {
            if (w && w.word && inRange(String(w.date || ""))) g.words.push({ word: String(w.word), key: String(w.date) });
        });
        g.words.sort(function (a, c) { return a.key > c.key ? 1 : -1; });

        /* 키 · 몸무게 — 처음 잰 날과 마지막으로 잰 날 */
        var gr = getJSON("tosil_growth_records", []);
        var pts = (Array.isArray(gr) ? gr : []).filter(function (r) {
            return r && inRange(String(r.date || "")) && (Number(r.weight) > 0 || Number(r.height) > 0);
        }).sort(function (a, c) { return String(a.date) > String(c.date) ? 1 : -1; });
        if (pts.length) {
            var f = pts[0], l = pts[pts.length - 1];
            g.growth = { a: { key: String(f.date), w: Number(f.weight) || 0, h: Number(f.height) || 0 },
                         z: f === l ? null : { key: String(l.date), w: Number(l.weight) || 0, h: Number(l.height) || 0 } };
        }
        return g;
    }

    /* 담긴 게 거의 없으면 띄우지 않는다 — 빈 한 장은 '안 적었네' 로 읽힌다 */
    function enough(g) {
        return !!g && (g.sum.care >= 30 || g.photos.length >= 3 || g.firsts.length >= 1 || g.noteN >= 3 || g.words.length >= 1);
    }
    function cared(g) { return g.sum.care >= 20 && g.sum.days >= 3; }
    function lead(g) {
        return g.sum.days >= Math.ceil(g.nDays * 0.8) ? g.kind.span + " 동안" : "기록한 " + comma(g.sum.days) + "일 동안";
    }
    function headline(g) {
        if (cared(g)) return lead(g) + " " + comma(g.sum.care) + "번 달려갔어요";
        if (g.photos.length >= 3) return "사진 " + comma(g.photoN) + "장에 담긴 " + g.kind.span;
        if (g.firsts.length) return "처음 해낸 일 " + g.firsts.length + "가지";
        return g.kind.span + "의 기록";
    }
    function dawnLine(g) {
        return cared(g) && g.sum.dawn > 0 ? "그중 " + comma(g.sum.dawn) + "번은 모두가 잠든 새벽이었어요." : "";
    }
    /* 세 칸 숫자 — [이름, 큰 글씨, 작은 줄] */
    function numbers(g) {
        var s = g.sum, out = [];
        if (!cared(g)) return out;
        if (s.feed) out.push(["맘마", comma(s.feed) + "번", "하루 평균 " + round1(s.feed / s.days) + "번"]);
        if (s.sleepDays >= 3) {
            var avg = s.sleep / s.sleepDays;
            if (s.sleepDays >= Math.ceil(g.nDays * 0.8)) out.push(["잠", comma(s.sleep / 60) + "시간", "하루 평균 " + hm(avg)]);
            else out.push(["잠", hm(avg), "잠을 적은 " + s.sleepDays + "일 평균"]);
        }
        if (s.diaper) out.push(["기저귀", comma(s.diaper) + "개", "하루 평균 " + round1(s.diaper / s.days) + "개"]);
        return out;
    }

    /* ---------- 사진 고르기 — 처음과 마지막은 꼭, 사이는 고르게 ---------- */
    function photoUrl(p) { return (p && (p.thumb || p.url)) || ""; }
    function pickPhotos(g, n) {
        var list = g.photos.slice();
        if (g.special) {
            list = list.filter(function (x) { return x.key !== g.special.key; });
            list.push({ key: g.special.key, p: g.special.p, special: true });
            list.sort(function (a, c) { return a.key > c.key ? 1 : -1; });
        }
        if (list.length <= n) return list;
        var first = list[0], last = g.special ? list.filter(function (x) { return x.special; })[0] : list[list.length - 1];
        if (last === first) last = list[list.length - 1];
        var rest = list.filter(function (x) { return x !== first && x !== last; });
        var t0 = fromKey(first.key).getTime(), t1 = fromKey(last.key).getTime(), out = [first];
        for (var i = 1; i < n - 1 && rest.length; i++) {
            var target = t0 + (t1 - t0) * i / (n - 1), best = 0, bd = Infinity;
            for (var j = 0; j < rest.length; j++) {
                var d = Math.abs(fromKey(rest[j].key).getTime() - target);
                if (d < bd) { bd = d; best = j; }
            }
            out.push(rest.splice(best, 1)[0]);
        }
        out.push(last);
        return out.sort(function (a, c) { return a.key > c.key ? 1 : -1; });
    }
    function ageLabel(g, x) {
        if (x.special || x.key === g.toK) return g.kind.title;
        var d = fromKey(x.key), n = between(g.b, d);
        if (n <= 0) return "태어난 날";
        /* 50일은 날로만 센다. '생후 30일 · 1개월' 이 나란히 서면 어색했다 */
        var m = g.kind.byDay ? 0 : monthsBetween(g.b, d);
        return m < 1 ? "생후 " + n + "일" : m + "개월";
    }

    /* ---------- 저장 ---------- */
    function state() { var o = getJSON(KEY, {}); return (o && typeof o === "object") ? o : {}; }
    function mark(slot, id) {
        var o = state();
        if (!o[slot] || typeof o[slot] !== "object") o[slot] = {};
        o[slot][id] = 1;
        try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {}
    }
    function marked(slot, id) { var o = state(); return !!(o[slot] && o[slot][id]); }

    /* ---------- 모양 ---------- */
    function css() {
        if (document.getElementById("recap-css")) return;
        var s = document.createElement("style");
        s.id = "recap-css";
        var C = "#" + CARD, S = "#" + SHEET;
        s.textContent =
            C + "{background:" + PAPER + ";border:1px solid rgba(185,138,46,0.32);border-radius:20px;padding:16px 18px 16px;margin-bottom:20px;color:" + INK + ";}" +
            C + " .rp-top{display:flex;align-items:center;gap:8px;}" +
            C + " .rp-tag{font-size:10.5px;font-weight:800;color:" + GOLD + ";letter-spacing:2.5px;}" +
            C + " .rp-date{margin-left:auto;font-size:12px;font-weight:700;color:" + SUB + ";}" +
            C + " .rp-x{width:28px;height:28px;margin:-6px -6px -6px 0;display:flex;align-items:center;justify-content:center;font-size:17px;color:" + MUTE + ";cursor:pointer;}" +
            C + " .rp-h{font-family:" + SERIF + ";font-size:21px;font-weight:700;letter-spacing:-0.4px;margin-top:6px;}" +
            C + " .rp-line{font-size:14px;font-weight:700;color:" + INK + ";line-height:1.55;margin-top:6px;word-break:keep-all;}" +
            C + " .rp-thumbs{display:flex;gap:6px;margin-top:12px;}" +
            C + " .rp-th{flex:1;min-width:0;max-width:78px;}" +
            C + " .rp-th div{aspect-ratio:1/1;border-radius:12px;background:" + TINT + " center/cover no-repeat;}" +
            C + " .rp-th span{display:block;margin-top:5px;font-size:10.5px;font-weight:700;color:" + SUB + ";text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}" +
            C + " .rp-meta{font-size:12.5px;font-weight:600;color:" + SUB + ";margin-top:10px;line-height:1.6;word-break:keep-all;}" +
            C + " .rp-go{margin-top:14px;text-align:center;padding:14px;border-radius:14px;background:" + INK + ";color:#FFFDF9;font-size:14.5px;font-weight:700;cursor:pointer;}" +
            S + "{position:fixed;inset:0;z-index:100002;background:rgba(43,36,30,0.45);display:flex;align-items:flex-end;justify-content:center;}" +
            S + " .rp-box{width:100%;max-width:480px;max-height:92vh;overflow-y:auto;background:" + PAPER + ";border-radius:24px 24px 0 0;" +
                "padding:12px 22px calc(24px + env(safe-area-inset-bottom, 0px));box-sizing:border-box;color:" + INK + ";}" +
            S + " .rp-grab{width:36px;height:4px;border-radius:4px;background:#E5DDD2;margin:0 auto 18px;}" +
            S + " .rp-tag{font-size:10.5px;font-weight:800;color:" + GOLD + ";letter-spacing:2.5px;}" +
            S + " .rp-title{font-family:" + SERIF + ";font-size:24px;font-weight:700;letter-spacing:-0.5px;margin-top:6px;}" +
            S + " .rp-sub{font-size:12.5px;font-weight:700;color:" + GOLD + ";margin-top:5px;}" +
            S + " .rp-grid{display:grid;gap:10px 6px;margin-top:16px;}" +
            S + " .rp-cell{min-width:0;}" +
            S + " .rp-cell div{aspect-ratio:1/1;border-radius:12px;background:" + TINT + " center/cover no-repeat;}" +
            S + " .rp-cell span{display:block;margin-top:5px;font-size:11px;font-weight:700;color:" + SUB + ";text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}" +
            S + " .rp-big{font-family:" + SERIF + ";font-size:20px;font-weight:700;line-height:1.5;margin-top:22px;word-break:keep-all;}" +
            S + " .rp-dawn{font-size:13px;font-weight:600;color:" + SUB + ";margin-top:4px;line-height:1.6;word-break:keep-all;}" +
            S + " .rp-nums{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px;}" +
            S + " .rp-num{background:#FFF;border:1px solid " + LINE + ";border-radius:14px;padding:12px 10px;min-width:0;}" +
            S + " .rp-num b{display:block;font-size:11.5px;font-weight:800;color:" + SUB + ";}" +
            S + " .rp-num strong{display:block;font-size:17px;font-weight:900;margin-top:4px;letter-spacing:-0.4px;word-break:keep-all;}" +
            S + " .rp-num i{display:block;font-style:normal;font-size:11px;font-weight:600;color:" + SUB + ";margin-top:4px;line-height:1.45;word-break:keep-all;}" +
            S + " .rp-part{font-size:11.5px;font-weight:600;color:" + MUTE + ";margin-top:8px;line-height:1.5;word-break:keep-all;}" +
            S + " .rp-sec{margin-top:22px;}" +
            S + " .rp-sec-h{font-size:12px;font-weight:800;color:" + SUB + ";margin-bottom:8px;}" +
            S + " .rp-first{display:flex;justify-content:space-between;gap:10px;padding:9px 0;border-top:1px solid " + LINE + ";" +
                "font-family:" + SERIF + ";font-size:16px;font-weight:700;}" +
            S + " .rp-first span{font-family:inherit;font-size:12px;font-weight:700;color:" + SUB + ";flex-shrink:0;}" +
            S + " .rp-more{font-size:12px;font-weight:700;color:" + SUB + ";padding-top:8px;border-top:1px solid " + LINE + ";}" +
            S + " .rp-val{font-size:15px;font-weight:800;line-height:1.5;word-break:keep-all;}" +
            S + " .rp-val span{font-size:12px;font-weight:700;color:" + SUB + ";margin-left:6px;}" +
            S + " .rp-quote{font-family:" + SERIF + ";font-size:16px;font-weight:700;line-height:1.65;word-break:keep-all;padding:14px 16px;" +
                "background:#FFFAF1;border:1px solid " + LINE + ";border-radius:14px;}" +
            S + " .rp-quote span{display:block;margin-top:6px;font-family:inherit;font-size:12px;color:" + SUB + ";}" +
            S + " .rp-btn{margin-top:10px;text-align:center;padding:15px;border-radius:14px;font-size:14.5px;font-weight:700;cursor:pointer;}" +
            S + " .rp-btn.dark{margin-top:24px;background:" + INK + ";color:#FFFDF9;}" +
            S + " .rp-btn.light{background:#FFF;border:1px solid " + LINE + ";color:" + INK + ";}" +
            S + " .rp-btn.done{background:" + TINT + ";color:" + SUB + ";cursor:default;}";
        document.head.appendChild(s);
    }

    /* ---------- 홈 카드 ---------- */
    function cardHTML(g) {
        var thumbs = pickPhotos(g, 4).map(function (x) {
            var u = photoUrl(x.p);
            return u ? '<div class="rp-th"><div style="background-image:url(\'' + cssUrl(u) + '\')"></div><span>' + esc(ageLabel(g, x)) + '</span></div>' : '';
        }).join("");
        var meta = [];
        if (dawnLine(g)) meta.push("새벽 " + comma(g.sum.dawn) + "번");
        if (g.firsts.length) meta.push("처음 해낸 일 " + g.firsts.length + "가지");
        if (g.photoN && cared(g)) meta.push("사진 " + comma(g.photoN) + "장");
        return '<div id="' + CARD + '" class="hide-on-senior">' +
            '<div class="rp-top"><span class="rp-tag">기념일</span><span class="rp-date">' + esc(md(g.end)) + '</span>' +
                '<span class="rp-x" onclick="window.__recapHide(\'' + g.kind.id + '\')" aria-label="닫기">×</span></div>' +
            '<div class="rp-h">' + esc(babyName()) + '의 ' + esc(g.kind.title) + '</div>' +
            '<div class="rp-line">' + esc(headline(g)) + '</div>' +
            (thumbs ? '<div class="rp-thumbs">' + thumbs + '</div>' : '') +
            (meta.length ? '<div class="rp-meta">' + esc(meta.join(" · ")) + '</div>' : '') +
            '<div class="rp-go" onclick="window.openRecap(\'' + g.kind.id + '\')">한 장으로 보기</div>' +
        '</div>';
    }

    function paint() {
        var host = document.getElementById("tab-home");
        var old = document.getElementById(CARD);
        var kind = blocked() ? null : current();
        if (!host || !kind || marked("hide", kind.id)) { if (old) old.remove(); return; }
        var g = gather(kind);
        if (!enough(g)) { if (old) old.remove(); return; }
        css();
        var html = cardHTML(g);
        if (old && old.getAttribute("data-k") === html) return;     // 그대로면 안 건드린다 (누르는 사이에 바뀌지 않게)
        var box = document.createElement("div");
        box.innerHTML = html;
        var el = box.firstChild;
        el.setAttribute("data-k", html);
        if (old && old.parentNode) { old.parentNode.replaceChild(el, old); return; }
        var anchor = document.getElementById("home-week-card") || document.getElementById("home-todo") || document.getElementById("now-status-card");
        if (anchor && anchor.parentNode === host) host.insertBefore(el, anchor);
        else host.appendChild(el);
        if (typeof window.relayoutHome === "function") { try { window.relayoutHome(); } catch (e) {} }
    }
    window.refreshRecapCard = paint;

    window.__recapHide = function (id) {
        mark("hide", id);
        var c = document.getElementById(CARD); if (c) c.remove();
        var b = birth(), k = kindOf(id);
        toast(b && k ? "배냇함의 " + md(k.at(b)) + "에서 다시 볼 수 있어요" : "배냇함에서 다시 볼 수 있어요");
    };

    /* ---------- 한 장 (창) ---------- */
    var OPEN = null;
    function closeSheet() { var w = document.getElementById(SHEET); if (w) w.remove(); OPEN = null; }
    window.closeRecap = closeSheet;

    function canTell() {
        var c = get("family_sync_code");
        return !!(c && c.indexOf("unlinked") < 0 && get("tosil_role_locked") !== "viewer");
    }
    function rangeText(g) {
        return ymd(g.b) + " – " + (g.b.getFullYear() === g.end.getFullYear() ? md(g.end) : ymd(g.end));
    }
    function growthText(x) { return [x.w ? x.w + "kg" : "", x.h ? x.h + "cm" : ""].filter(Boolean).join(" · "); }
    function cols(n) { return n <= 4 ? Math.max(n, 2) : 4; }

    window.openRecap = function (id) {
        var kind = kindOf(id) || current();
        var b = birth();
        if (!kind || !b || blocked()) return;
        if (today0() < kind.at(b)) return toast(kind.title + "은 " + md(kind.at(b)) + "이에요");
        var g = gather(kind);
        if (!enough(g)) return toast("그날까지 담긴 게 아직 많지 않아요");
        css();
        closeSheet();
        OPEN = g;
        if (window.CareLog && typeof window.CareLog.sync === "function") { try { window.CareLog.sync(false); } catch (e) {} }

        var picks = pickPhotos(g, g.kind.n);
        var grid = picks.map(function (x) {
            var u = photoUrl(x.p);
            return '<div class="rp-cell"><div' + (u ? ' style="background-image:url(\'' + cssUrl(u) + '\')"' : '') + '></div><span>' + esc(ageLabel(g, x)) + '</span></div>';
        }).join("");
        var nums = numbers(g).map(function (n) {
            return '<div class="rp-num"><b>' + esc(n[0]) + '</b><strong>' + esc(n[1]) + '</strong>' + (n[2] ? '<i>' + esc(n[2]) + '</i>' : '') + '</div>';
        }).join("");
        var firsts = g.firsts.slice(0, 8).map(function (f) {
            return '<div class="rp-first">' + esc(f.title) + '<span>' + esc(md(fromKey(f.key))) + '</span></div>';
        }).join("") + (g.firsts.length > 8 ? '<div class="rp-more">그리고 ' + (g.firsts.length - 8) + '가지 더</div>' : '');
        var words = g.words.length ? g.words.slice(0, 6).map(function (w) { return w.word; }).join(" · ") : "";
        var growth = "";
        if (g.growth) {
            growth = g.growth.z
                ? '<div class="rp-val">' + esc(growthText(g.growth.a)) + ' → ' + esc(growthText(g.growth.z)) +
                  '<span>' + esc(md(fromKey(g.growth.a.key))) + ' → ' + esc(md(fromKey(g.growth.z.key))) + '</span></div>'
                : '<div class="rp-val">' + esc(growthText(g.growth.a)) + '<span>' + esc(md(fromKey(g.growth.a.key))) + '</span></div>';
        }
        var others = [];
        if (g.photoN) others.push("사진 " + comma(g.photoN) + "장");
        if (g.voiceN) others.push("소리 " + comma(g.voiceN) + "개");
        if (g.noteN) others.push("한 줄 " + comma(g.noteN) + "개");
        if (g.letterN) others.push("편지 " + comma(g.letterN) + "통");
        var note = g.note;
        var partial = cared(g) && g.sum.days < Math.ceil(g.nDays * 0.8)
            ? '<div class="rp-part">' + esc(g.kind.span) + ' 중 기록한 ' + comma(g.sum.days) + '일의 숫자예요</div>' : '';
        var sent = marked("sent", g.kind.id);

        var w = document.createElement("div");
        w.id = SHEET;
        w.onclick = function (e) { if (e.target === w) closeSheet(); };
        w.innerHTML = '<div class="rp-box"><div class="rp-grab"></div>' +
            '<div class="rp-tag">기념일</div>' +
            '<div class="rp-title">' + esc(babyName()) + '의 ' + esc(g.kind.title) + '</div>' +
            '<div class="rp-sub">' + esc(rangeText(g)) + '</div>' +
            (grid ? '<div class="rp-grid" style="grid-template-columns:repeat(' + cols(picks.length) + ',1fr);">' + grid + '</div>' : '') +
            '<div class="rp-big">' + esc(headline(g)) + '</div>' +
            (dawnLine(g) ? '<div class="rp-dawn">' + esc(dawnLine(g)) + '</div>' : '') +
            (nums ? '<div class="rp-nums">' + nums + '</div>' + partial : '') +
            (firsts ? '<div class="rp-sec"><div class="rp-sec-h">처음 해낸 일</div>' + firsts + '</div>' : '') +
            (words ? '<div class="rp-sec"><div class="rp-sec-h">첫 마디</div><div class="rp-val">' + esc(words) +
                '<span>' + esc(md(fromKey(g.words[0].key))) + '부터</span></div></div>' : '') +
            (growth ? '<div class="rp-sec"><div class="rp-sec-h">키 · 몸무게</div>' + growth + '</div>' : '') +
            (note ? '<div class="rp-sec"><div class="rp-sec-h">처음 남긴 한 줄</div><div class="rp-quote">' +
                esc(note.text.length > 90 ? note.text.slice(0, 90) + "…" : note.text) +
                '<span>' + (note.who ? esc(note.who) + ' · ' : '') + esc(md(fromKey(note.key))) + '</span></div></div>' : '') +
            (others.length ? '<div style="margin-top:18px;font-size:12px;font-weight:700;color:' + SUB + ';">배냇함에 담긴 것 · ' + esc(others.join(" · ")) + '</div>' : '') +
            '<div class="rp-btn dark" onclick="window.__recapBake()">사진으로 저장 · 가족에게 보내기</div>' +
            (canTell() ? (sent ? '<div class="rp-btn done">짝꿍 폰에 알렸어요</div>'
                               : '<div class="rp-btn light" id="rp-tell" onclick="window.__recapTell()">짝꿍 폰에도 알리기</div>') : '') +
        '</div>';
        document.body.appendChild(w);
        if (canTell() && !sent && typeof window.familyHasPartner === "function") window.familyHasPartner().then(function (has) {
            /* 가족방에 나밖에 없으면 '알렸어요' 가 거짓말이 된다. 대신 짝꿍을 부른다 (모르면 그대로 둔다) */
            if (has === false) inviteInstead(document.getElementById("rp-tell"));
        });
    };

    function inviteInstead(b) {
        if (!b) return;
        b.textContent = "짝꿍을 초대하면 이 한 장이 짝꿍 폰에도 가요";
        b.onclick = function () {
            closeSheet();
            var nm = document.getElementById("invite-baby-name"); if (nm) nm.innerText = babyName();
            var sh = document.getElementById("invite-bottom-sheet"); if (sh) sh.style.display = "flex";
        };
    }

    /* ---------- 짝꿍 폰에도 알리기 ---------- */
    window.__recapTell = function () {
        var g = OPEN; if (!g) return;
        if (!canTell() || !window.functions || typeof window.httpsCallable !== "function") return toast("가족 연결을 하면 짝꿍 폰에도 보낼 수 있어요");
        var btn = document.getElementById("rp-tell");
        if (btn) { btn.style.opacity = "0.5"; btn.onclick = null; }
        var who = (typeof window.myRoleWord === "function") ? window.myRoleWord() : (get("user_role") === "dad" ? "아빠" : "엄마");
        window.httpsCallable(window.functions, "sendFamilyPush")({
            syncCode: get("family_sync_code"),
            excludeUid: (typeof window.myUid === "function") ? window.myUid() : null,
            excludeToken: (typeof window.myPushToken === "function") ? window.myPushToken() : null,
            title: "💌 " + babyName() + "의 " + g.kind.title + " 한 장이 왔어요",
            body: who + "가 " + g.kind.span + josa(g.kind.span, "을", "를") + " 한 장으로 정리했어요",
            link: "index.html?go=recap&k=" + g.kind.id,
            skipRoles: ["viewer"]
        }).then(function (r) {
            var how = (typeof window.familyPushResult === "function") ? window.familyPushResult(r)
                    : ((r && r.data && r.data.success === false) ? "failed" : "sent");
            if (how === "sent") {
                mark("sent", g.kind.id);
                if (btn) { btn.className = "rp-btn done"; btn.textContent = "짝꿍 폰에 알렸어요"; btn.style.opacity = ""; btn.onclick = null; }
                return toast("짝꿍 폰에 알렸어요");
            }
            if (btn) { btn.style.opacity = ""; btn.onclick = window.__recapTell; }
            if (how === "nopartner") { inviteInstead(btn); return toast("짝꿍이 아직 가족방에 없어요"); }
            if (how === "notoken") {
                if (btn) btn.textContent = "짝꿍 폰 알림이 꺼져 있어요 · 다시 알리기";
                return toast("짝꿍 폰 알림이 꺼져 있어요. 사진으로 저장해서 보내 볼까요");
            }
            toast("알림을 못 보냈어요. 잠시 뒤에 다시 눌러 주세요");
        }).catch(function (e) {
            console.warn("[백일 · 돌 한 장] 알림 실패", e);
            if (btn) { btn.style.opacity = ""; btn.onclick = window.__recapTell; }
            toast("알림을 못 보냈어요. 잠시 뒤에 다시 눌러 주세요");
        });
    };

    /* ---------- 사진으로 굽기 (이번 주 한 장 weekly.js 와 같은 방식) ---------- */
    function toDataUrl(url) {
        return new Promise(function (resolve) {
            if (!url) return resolve(null);
            var img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = function () {
                try {
                    var side = Math.min(img.naturalWidth, img.naturalHeight);
                    var c = document.createElement("canvas");
                    c.width = c.height = Math.min(side, 600);
                    c.getContext("2d").drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, c.width, c.height);
                    resolve(c.toDataURL("image/jpeg", 0.88));
                } catch (e) { resolve(null); }
            };
            img.onerror = function () { resolve(null); };
            img.src = url;
        });
    }
    async function photoData(p) {
        if (typeof window.getCachedPhotoData === "function" && p && p.id) {
            try { var c = await window.getCachedPhotoData(p.id); if (c) { var d = await toDataUrl(c); if (d) return d; } } catch (e) {}
        }
        return await toDataUrl(p && p.url);
    }

    function imageHTML(g, shots) {
        var many = shots.length > 4;
        var n = shots.length, c = cols(n);
        var gap = many ? 14 : 12;
        var photos = shots.map(function (s) {
            return '<div style="min-width:0;">' +
                '<div style="aspect-ratio:1/1;border-radius:' + (many ? 18 : 22) + 'px;overflow:hidden;background:#F5EFE6;">' +
                    '<img src="' + s.src + '" style="width:100%;height:100%;object-fit:cover;display:block;"></div>' +
                '<div style="margin-top:' + (many ? 8 : 12) + 'px;font-size:' + (many ? 18 : 20) + 'px;font-weight:700;color:#8A7F76;text-align:center;">' + esc(s.label) + '</div>' +
            '</div>';
        }).join("");
        var nums = numbers(g);
        var tiles = nums.map(function (x) {
            return '<div style="flex:1;background:#FFFFFF;border:1px solid #EFE7DC;border-radius:22px;padding:24px 22px;min-width:0;">' +
                '<div style="font-size:20px;font-weight:700;color:#8A7F76;">' + esc(x[0]) + '</div>' +
                '<div style="font-size:36px;font-weight:900;color:#3B322C;margin-top:8px;letter-spacing:-1px;">' + esc(x[1]) + '</div>' +
                (x[2] ? '<div style="font-size:18px;font-weight:600;color:#8A7F76;margin-top:8px;line-height:1.45;">' + esc(x[2]) + '</div>' : '') +
            '</div>';
        }).join("");
        var numLine = nums.map(function (x) { return x[0] + " " + x[1]; }).join("  ·  ");
        var room = many ? 0 : (n ? 3 : 5);           // 사진이 많으면 처음 해낸 일은 창에서만
        var firsts = g.firsts.slice(0, room).map(function (f) {
            return '<div style="display:flex;justify-content:space-between;align-items:baseline;padding:15px 0;border-top:1px solid #EFE7DC;">' +
                '<span style="font-family:' + SERIF + ';font-size:32px;font-weight:700;color:#3B322C;">' + esc(f.title) + '</span>' +
                '<span style="font-size:20px;font-weight:700;color:#8A7F76;">' + esc(md(fromKey(f.key))) + '</span></div>';
        }).join("");
        var sameYear = g.b.getFullYear() === g.end.getFullYear();
        return '<div style="width:100%;height:100%;box-sizing:border-box;padding:' + (many ? '64px 64px 56px' : '76px 72px 64px') + ';display:flex;flex-direction:column;' +
                'background:linear-gradient(170deg,#FFFDF9 45%,#FBF3E4 100%);color:#3B322C;">' +
            '<div style="font-size:16px;font-weight:600;color:#C4B5A9;letter-spacing:7px;">' + esc(g.kind.en) + '</div>' +
            '<div style="font-family:' + SERIF + ';font-size:' + (many ? 54 : 58) + 'px;font-weight:700;letter-spacing:-2px;margin-top:16px;">' + esc(babyName()) + '의 ' + esc(g.kind.title) + '</div>' +
            '<div style="font-size:22px;font-weight:700;color:' + GOLD + ';margin-top:10px;">' + esc(dots(g.b, true)) + ' – ' + esc(dots(g.end, !sameYear)) + '</div>' +
            (photos ? '<div style="display:grid;grid-template-columns:repeat(' + c + ',1fr);gap:' + (many ? '14px ' + gap : gap) + 'px;margin-top:' + (many ? 34 : 40) + 'px;">' + photos + '</div>' : '') +
            '<div style="font-family:' + SERIF + ';font-size:' + (many ? 36 : 40) + 'px;font-weight:700;letter-spacing:-1px;line-height:1.4;margin-top:' + (many ? 34 : 44) + 'px;word-break:keep-all;">' + esc(headline(g)) + '</div>' +
            (dawnLine(g) ? '<div style="font-size:22px;font-weight:600;color:#8A7F76;margin-top:10px;">' + esc(dawnLine(g)) + '</div>' : '') +
            (many ? (numLine ? '<div style="font-size:21px;font-weight:700;color:#8A7F76;margin-top:12px;">' + esc(numLine) + '</div>' : '')
                  : (tiles ? '<div style="display:flex;gap:14px;margin-top:36px;">' + tiles + '</div>' : '')) +
            (firsts ? '<div style="margin-top:34px;"><div style="font-size:19px;font-weight:800;color:#8A7F76;margin-bottom:4px;">처음 해낸 일</div>' + firsts + '</div>' : '') +
            '<div style="display:flex;justify-content:flex-end;margin-top:auto;padding-top:24px;font-family:' + SERIF + ';font-size:24px;font-weight:700;color:#8A7F76;">배냇함</div>' +
        '</div>';
    }

    window.__recapBake = async function () {
        var g = OPEN; if (!g) return;
        if (typeof html2canvas === "undefined") return toast("이미지 도구를 불러오지 못했어요");
        toast("한 장으로 굽고 있어요…");
        var shots = [];
        var picks = pickPhotos(g, g.kind.n);
        for (var i = 0; i < picks.length; i++) {
            var d = await photoData(picks[i].p);
            if (d) shots.push({ src: d, label: ageLabel(g, picks[i]) });
        }
        var stage = document.createElement("div");
        stage.style.cssText = "position:fixed;top:0;left:0;width:1080px;height:1350px;font-family:'Pretendard',sans-serif;z-index:-9999;pointer-events:none;";
        stage.innerHTML = imageHTML(g, shots);
        document.body.appendChild(stage);
        var name = babyName() + "_" + g.kind.title.replace(/\s+/g, "") + ".png";
        setTimeout(function () {
            html2canvas(stage, { scale: 1, backgroundColor: "#FFFDF9", useCORS: true, logging: false }).then(function (canvas) {
                var fallback = function () {
                    var a = document.createElement("a");
                    a.download = name; a.href = canvas.toDataURL("image/png");
                    document.body.appendChild(a); a.click(); document.body.removeChild(a);
                    toast("사진으로 저장했어요");
                };
                if (!canvas.toBlob) { fallback(); stage.remove(); return; }
                canvas.toBlob(function (blob) {
                    try {
                        if (!blob) return fallback();
                        var file = new File([blob], name, { type: "image/png" });
                        if (navigator.canShare && navigator.canShare({ files: [file] })) {
                            navigator.share({ files: [file], title: babyName() + "의 " + g.kind.title }).catch(function () {});
                        } else fallback();
                    } finally { stage.remove(); }
                }, "image/png");
            }).catch(function (e) {
                console.error("[백일 · 돌 한 장] 굽기 실패", e);
                stage.remove();
                toast("저장 중 문제가 생겼어요");
            });
        }, 380);
    };

    /* ---------- 배냇함의 그날 — 기념일 카드 아래 '한 장으로 보기' ----------
       일주일이 지나 홈에서 내려간 뒤에도 여기서 다시 연다. */
    (function hookAnniversary() {
        var f = window.renderAnniversary;
        if (typeof f !== "function" || f.__recap) return;
        var w = function (key) {
            var html = f.apply(this, arguments);
            try {
                if (blocked()) return html;
                var b = birth(), t = keyOf(today0());
                for (var i = 0; i < KINDS.length; i++) {
                    var k = KINDS[i];
                    if (keyOf(k.at(b)) !== key || key > t) continue;
                    if (!enough(gather(k))) continue;
                    html += '<div onclick="window.openRecap(\'' + k.id + '\')" style="text-align:center;padding:12px;margin:0 0 16px;border-radius:14px;' +
                        'border:1px solid rgba(185,138,46,0.30);color:' + GOLD + ';font-size:13px;font-weight:800;cursor:pointer;">' +
                        esc(k.title) + ' 한 장으로 보기 ›</div>';
                }
            } catch (e) {}
            return html;
        };
        w.__recap = true;
        window.renderAnniversary = w;
    })();

    /* ---------- 시작 ---------- */
    function boot() {
        setTimeout(paint, 1800);
        setInterval(paint, 5 * 60000);
        document.addEventListener("visibilitychange", function () { if (!document.hidden) paint(); });
        window.addEventListener("carelog", function () { paint(); });       // 가족 장부를 맞추고 숫자가 바뀌면
        if (GO !== null) setTimeout(function () {
            try { if (typeof window.switchTab === "function") window.switchTab("home", document.getElementById("nav-home")); } catch (e) {}
            window.openRecap(GO);
        }, 1600);
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    /* ---------- 점검용 ---------- */
    window.recapDebug = function (id) {
        var k = kindOf(id) || current() || KINDS[1];
        var g = gather(k);
        if (!g) { console.log("생일이 없어요"); return null; }
        console.log(k.title, g.fromK, "~", g.toK, "(" + g.nDays + "일) · 홈에 띄울 때:", !!current(), "· 담긴 게 충분:", enough(g));
        console.log("달려간", g.sum.care, "· 새벽", g.sum.dawn, "· 맘마", g.sum.feed, "· 기저귀", g.sum.diaper,
                    "· 잠", hm(g.sum.sleep), "· 기록한 날", g.sum.days, "· 잠 적은 날", g.sum.sleepDays);
        console.log("사진", g.photoN, "(" + g.photos.length + "일) · 소리", g.voiceN, "· 한 줄", g.noteN, "· 편지", g.letterN,
                    "· 처음", g.firsts.map(function (f) { return f.title; }).join(", "), "· 첫 마디", g.words.length);
        return g;
    };
})();
