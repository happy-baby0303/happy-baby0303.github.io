/* ============================================================
   배냇함 — 이번 주 한 장 (weekly.js)

   하루는 영수증이, 한 달은 이달의 카드가 정리해 준다. 그 사이 '한 주' 가 비어 있었다.
   그리고 매일 여는 이유(기록)와 가끔 여는 이유(추억)가 따로 놀았다.

   일요일 저녁부터 화요일까지 홈에 한 장이 뜬다.
     · 이번 주 처음 해낸 일(도감) · 사진 · 한 줄
     · 맘마 · 잠 · 기저귀 — 지난주 숫자를 옆에 둔다
   [한 장으로 보기] → 사진으로 저장 · 가족에게 보내기 / 짝꿍 폰에 알리기 (누르면 같은 한 주가 열린다)

   ⚠️ 견주지 않는다. 또래 평균 · 권장량 · '잘했어요' 같은 말이 없다. 우리 집 숫자만 적는다.
   ⚠️ 그 주에 담긴 게 거의 없으면 뜨지 않는다. 빈 카드는 '이번 주는 안 썼네' 로 읽힌다.

   한 주는 월요일 0시 ~ 일요일 24시. 일요일 18시부터는 이번 주, 월 · 화요일에는 지난주.
   저장: tosil_week_card (아기마다 · script.js BABY_SPECIFIC_KEYS) = { hide, sent } 그 주 월요일 날짜
   ?go=week&w=2026-10-19 로 열면 그 주를 바로 연다 (짝꿍에게 간 알림).

   index.html 에서 photos.js · notes.js · voice.js · homefix.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';
    if (window.__weeklyOn) return;
    window.__weeklyOn = true;

    var KEY = "tosil_week_card", CARD = "home-week-card", SHEET = "week-sheet";
    var PAPER = "#FFFDF9", LINE = "#EFE7DC", INK = "#3B322C", SUB = "#8A7F76", MUTE = "#B5AAA0", TINT = "#F5EFE6", GOLD = "#B98A2E";
    var SERIF = "'Gowun Batang', 'Noto Serif KR', 'Noto Serif CJK KR', serif";
    var DAY = 86400000;

    /* 짝꿍 알림으로 들어왔으면 그 주를 연다. ⚠️ script.js 가 DOMContentLoaded 에서 주소의 ?go= 를 지운다.
       이 파일이 읽히는 순간(그보다 먼저) 적어 둔다. */
    var GO = null;
    try {
        var q = new URLSearchParams(location.search);
        if (q.get("go") === "week") GO = /^\d{4}-\d{2}-\d{2}$/.test(q.get("w") || "") ? q.get("w") : "";
    } catch (e) {}

    function esc(s) {
        return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }
    function toast(m) { if (typeof window.showToast === "function") window.showToast(m); }
    function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function getJSON(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    function keyOf(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
    function fromKey(k) { var p = String(k).split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]); }
    function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }
    function babyName() { return String(get("tosil_babyName") || "").trim() || "우리 아기"; }
    function josa(w, a, b) {
        var c = String(w || "").charCodeAt(String(w || "").length - 1);
        return (c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0) ? a : b;
    }
    function md(d) { return (d.getMonth() + 1) + "월 " + d.getDate() + "일"; }
    function comma(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
    function hm(mins) {
        mins = Math.round(mins);
        var h = Math.floor(mins / 60), m = mins % 60;
        return h ? h + "시간" + (m ? " " + m + "분" : "") : m + "분";
    }

    /* ---------- 어느 주인가 ---------- */
    function mondayOf(d) {
        var t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        var wd = (t.getDay() + 6) % 7;                 // 월 0 … 일 6
        return addDays(t, -wd);
    }
    function nowWeek() {
        var n = new Date(), wd = n.getDay();
        if (wd === 0 && n.getHours() >= 18) return mondayOf(n);           // 일요일 저녁 — 이번 주
        if (wd === 1 || wd === 2) return addDays(mondayOf(n), -7);         // 월 · 화 — 지난주
        return null;
    }

    /* ---------- 그 주에 뭐가 있었나 ---------- */
    /* 하루 평균은 '다 지난 날' 로만 낸다. 일요일 저녁에 이번 주를 보면 오늘 밤잠 · 저녁 기록이 아직 없어서
       오늘까지 넣으면 평균이 낮게 나온다. 합계(맘마 몇 번 · 기저귀 몇 개)는 오늘 것도 센다. */
    function tally(recs, from, to) {
        var o = { feed: 0, ml: 0, breast: 0, food: 0, sleep: 0, diaper: 0, days: {}, sleepDays: {}, sleepFull: 0, diaperFull: 0 };
        var t0 = new Date(); t0.setHours(0, 0, 0, 0);
        var cut = Math.min(to, t0.getTime());          // 이 시각 전이 '다 지난 날'
        for (var i = 0; i < recs.length; i++) {
            var r = recs[i], ts = Number(r && r.timestamp);
            if (!ts || ts < from || ts >= to) continue;
            var dk = keyOf(new Date(ts)), amt = parseInt(r.amount, 10) || 0, full = ts < cut;
            if (full) o.days[dk] = 1;
            if (r.type === "feed") {
                if (r.subType === "이유식") o.food++;
                else {
                    o.feed++;
                    if (r.subType === "모유") o.breast++; else o.ml += amt;
                }
            } else if (r.type === "sleep" && amt > 0) {
                o.sleep += amt;
                if (full) { o.sleepFull += amt; o.sleepDays[dk] = 1; }
            } else if (r.type === "diaper") { o.diaper++; if (full) o.diaperFull++; }
        }
        o.nDays = Object.keys(o.days).length;
        o.nSleep = Object.keys(o.sleepDays).length;
        o.sleepAvg = o.nSleep ? o.sleepFull / o.nSleep : 0;
        o.diaperAvg = o.nDays ? o.diaperFull / o.nDays : 0;
        return o;
    }

    function gather(ws) {
        var from = ws.getTime(), we = addDays(ws, 6), to = addDays(ws, 7).getTime();
        var wsK = keyOf(ws), weK = keyOf(we);
        var inWeek = function (k) { return k >= wsK && k <= weK; };
        var recs = getJSON("tosil_tracker_records", []);
        if (!Array.isArray(recs)) recs = [];
        var g = { ws: ws, we: we, key: wsK, t: tally(recs, from, to), prev: tally(recs, from - 7 * DAY, from),
                  photos: [], voices: 0, notes: [], firsts: [], growth: null };

        try {
            if (typeof window.photoDays === "function") window.photoDays().filter(inWeek).sort().forEach(function (k) {
                (window.getDayPhotos(k) || []).forEach(function (p) { if (p && (p.url || p.id)) g.photos.push({ key: k, p: p }); });
            });
        } catch (e) {}
        try {
            if (typeof window.voiceDays === "function") window.voiceDays().filter(inWeek).forEach(function (k) {
                g.voices += (window.getDayVoices(k) || []).length;
            });
        } catch (e) {}
        try {
            if (typeof window.noteDays === "function") window.noteDays().filter(inWeek).forEach(function (k) {
                (window.getDayNotes(k) || []).forEach(function (n) { if (n && n.text) g.notes.push({ key: k, text: String(n.text), who: n.who || "", ts: Number(n.ts) || 0 }); });
            });
        } catch (e) {}
        g.notes.sort(function (a, b) { return (b.key + b.ts) > (a.key + a.ts) ? 1 : -1; });

        /* 그 주에 도장 찍은 도감 */
        var list = null;
        try { if (typeof MILESTONE_DATA !== "undefined" && MILESTONE_DATA) list = MILESTONE_DATA; } catch (e) {}
        list = list || window.MILESTONE_DATA || [];
        getJSON("tosil_milestones", []).forEach(function (a) {
            if (!a || typeof a === "string" || !a.date) return;
            var m = String(a.date).match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
            if (!m) return;
            var k = m[1] + "-" + pad(+m[2]) + "-" + pad(+m[3]);
            if (!inWeek(k)) return;
            var it = list.filter(function (x) { return x.id === a.id; })[0];
            if (it) g.firsts.push({ title: it.title, key: k });
        });
        g.firsts.sort(function (a, b) { return a.key > b.key ? 1 : -1; });

        /* 그 주에 잰 키 · 몸무게 (마지막 것) */
        getJSON("tosil_growth_records", []).forEach(function (r) {
            if (!r || !inWeek(String(r.date || ""))) return;
            if (!(Number(r.weight) || Number(r.height))) return;
            if (!g.growth || String(r.date) >= g.growth.date) g.growth = { date: String(r.date), w: Number(r.weight) || 0, h: Number(r.height) || 0 };
        });
        return g;
    }

    /* 담긴 게 거의 없는 주는 띄우지 않는다 */
    function enough(g) {
        return g.firsts.length || g.photos.length || g.notes.length || (g.t.feed + g.t.diaper + g.t.food + (g.t.sleep ? 1 : 0)) >= 8;
    }

    function ageLine(g) {
        var b = get("tosil_startDate");
        if (!b) return "";
        var end = g.we < new Date() ? g.we : new Date();
        var days = Math.floor((new Date(end.getFullYear(), end.getMonth(), end.getDate()) - fromKey(b)) / DAY);
        if (days < 0) return "";
        var s = "생후 " + Math.floor(days / 7) + "주 차";
        if (window.BabyAge && window.BabyAge.on()) s += " · " + window.BabyAge.label();
        return s;
    }
    function rangeText(g) {
        return md(g.ws) + " – " + (g.ws.getMonth() === g.we.getMonth() ? g.we.getDate() + "일" : md(g.we));
    }
    function headline(g) {
        if (g.firsts.length) {
            var t = g.firsts[0].title;
            return g.firsts.length > 1 ? "'" + t + "' 외 " + (g.firsts.length - 1) + "가지를 해낸 한 주"
                                       : "'" + t + "'" + josa(t, "을", "를") + " 해낸 한 주";
        }
        if (g.photos.length) return "사진 " + g.photos.length + "장이 담긴 한 주";
        if (g.notes.length) return "한 줄 " + g.notes.length + "개가 남은 한 주";
        var bits = [];
        if (g.t.feed) bits.push("맘마 " + g.t.feed + "번");
        if (g.t.diaper) bits.push("기저귀 " + g.t.diaper + "개");
        return (bits.join(", ") || "기록이 쌓인") + (bits.length ? "의 한 주" : " 한 주");
    }
    /* 세 칸 숫자 — [이름, 큰 글씨, 작은 줄, 지난주] */
    function numbers(g) {
        var t = g.t, p = g.prev, out = [];
        if (t.feed || t.food) {
            var sub = [];
            if (t.ml) sub.push("분유 " + comma(t.ml) + "ml");
            if (t.breast) sub.push("모유 " + t.breast + "번");
            if (t.food) sub.push("이유식 " + t.food + "번");
            out.push(["맘마", (t.feed || t.food) + "번", sub.join(" · "), p.feed ? "지난주 " + p.feed + "번" : ""]);
            if (!t.feed) out[out.length - 1][0] = "이유식";
        }
        if (t.sleepAvg) out.push(["잠", hm(t.sleepAvg), t.nSleep >= 6 ? "하루 평균" : "기록한 " + t.nSleep + "일 평균",
                               p.sleepAvg ? "지난주 " + hm(p.sleepAvg) : ""]);
        if (t.diaper) out.push(["기저귀", t.diaper + "개", t.diaperAvg ? "하루 " + (Math.round(t.diaperAvg * 10) / 10) + "개" : "",
                               p.diaper ? "지난주 " + p.diaper + "개" : ""]);
        return out;
    }

    /* ---------- 저장 ---------- */
    function state() { var o = getJSON(KEY, {}); return (o && typeof o === "object") ? o : {}; }
    function setState(k, v) { var o = state(); o[k] = v; try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }

    /* ---------- 모양 ---------- */
    function css() {
        if (document.getElementById("week-css")) return;
        var s = document.createElement("style");
        s.id = "week-css";
        s.textContent =
            "#" + CARD + "{background:" + PAPER + ";border:1px solid " + LINE + ";border-radius:20px;padding:18px 18px 16px;margin-bottom:20px;color:" + INK + ";}" +
            "#" + CARD + " .wk-top{display:flex;align-items:center;gap:8px;}" +
            "#" + CARD + " .wk-h{font-family:" + SERIF + ";font-size:17px;font-weight:700;letter-spacing:-0.3px;}" +
            "#" + CARD + " .wk-range{margin-left:auto;font-size:12px;font-weight:700;color:" + SUB + ";}" +
            "#" + CARD + " .wk-x{width:28px;height:28px;margin:-6px -6px -6px 0;display:flex;align-items:center;justify-content:center;font-size:17px;color:" + MUTE + ";cursor:pointer;}" +
            "#" + CARD + " .wk-line{font-family:" + SERIF + ";font-size:16px;font-weight:700;line-height:1.5;margin-top:10px;word-break:keep-all;}" +
            "#" + CARD + " .wk-thumbs{display:flex;gap:6px;margin-top:12px;}" +
            "#" + CARD + " .wk-thumbs div{width:64px;height:64px;border-radius:12px;background:" + TINT + " center/cover no-repeat;}" +
            "#" + CARD + " .wk-meta{font-size:12.5px;font-weight:600;color:" + SUB + ";margin-top:10px;line-height:1.6;}" +
            "#" + CARD + " .wk-go{margin-top:14px;text-align:center;padding:14px;border-radius:14px;background:" + INK + ";color:#FFFDF9;font-size:14.5px;font-weight:700;cursor:pointer;}" +
            "#" + SHEET + "{position:fixed;inset:0;z-index:100002;background:rgba(43,36,30,0.45);display:flex;align-items:flex-end;justify-content:center;}" +
            "#" + SHEET + " .wk-box{width:100%;max-width:480px;max-height:92vh;overflow-y:auto;background:" + PAPER + ";border-radius:24px 24px 0 0;" +
                "padding:12px 22px calc(24px + env(safe-area-inset-bottom, 0px));box-sizing:border-box;color:" + INK + ";}" +
            "#" + SHEET + " .wk-grab{width:36px;height:4px;border-radius:4px;background:#E5DDD2;margin:0 auto 18px;}" +
            "#" + SHEET + " .wk-title{font-family:" + SERIF + ";font-size:22px;font-weight:700;letter-spacing:-0.4px;}" +
            "#" + SHEET + " .wk-sub{font-size:12.5px;font-weight:700;color:" + GOLD + ";margin-top:4px;}" +
            "#" + SHEET + " .wk-photos{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:16px;}" +
            "#" + SHEET + " .wk-photos div{aspect-ratio:1/1;border-radius:12px;background:" + TINT + " center/cover no-repeat;}" +
            "#" + SHEET + " .wk-sec{margin-top:20px;}" +
            "#" + SHEET + " .wk-sec-h{font-size:12px;font-weight:800;color:" + SUB + ";margin-bottom:8px;}" +
            "#" + SHEET + " .wk-first{display:flex;justify-content:space-between;gap:10px;padding:9px 0;border-top:1px solid " + LINE + ";" +
                "font-family:" + SERIF + ";font-size:16px;font-weight:700;}" +
            "#" + SHEET + " .wk-first span{font-family:inherit;font-size:12px;font-weight:700;color:" + SUB + ";flex-shrink:0;}" +
            "#" + SHEET + " .wk-nums{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}" +
            "#" + SHEET + " .wk-num{background:#FFF;border:1px solid " + LINE + ";border-radius:14px;padding:12px 10px;min-width:0;}" +
            "#" + SHEET + " .wk-num b{display:block;font-size:11.5px;font-weight:800;color:" + SUB + ";}" +
            "#" + SHEET + " .wk-num strong{display:block;font-size:17px;font-weight:900;margin-top:4px;letter-spacing:-0.4px;word-break:keep-all;}" +
            "#" + SHEET + " .wk-num i{display:block;font-style:normal;font-size:11px;font-weight:600;color:" + SUB + ";margin-top:4px;line-height:1.45;word-break:keep-all;}" +
            "#" + SHEET + " .wk-num em{display:block;font-style:normal;font-size:10.5px;font-weight:700;color:" + MUTE + ";margin-top:3px;}" +
            "#" + SHEET + " .wk-quote{font-family:" + SERIF + ";font-size:16px;font-weight:700;line-height:1.65;word-break:keep-all;padding:14px 16px;" +
                "background:#FFFAF1;border:1px solid " + LINE + ";border-radius:14px;}" +
            "#" + SHEET + " .wk-quote span{display:block;margin-top:6px;font-family:inherit;font-size:12px;color:" + SUB + ";}" +
            "#" + SHEET + " .wk-btn{margin-top:10px;text-align:center;padding:15px;border-radius:14px;font-size:14.5px;font-weight:700;cursor:pointer;}" +
            "#" + SHEET + " .wk-btn.dark{margin-top:22px;background:" + INK + ";color:#FFFDF9;}" +
            "#" + SHEET + " .wk-btn.light{background:#FFF;border:1px solid " + LINE + ";color:" + INK + ";}" +
            "#" + SHEET + " .wk-btn.done{background:" + TINT + ";color:" + SUB + ";cursor:default;}";
        document.head.appendChild(s);
    }

    function photoUrl(p) { return p.thumb || p.url || ""; }
    function pickPhotos(list, n) {
        var out = [], seen = {};
        for (var i = list.length - 1; i >= 0 && out.length < n; i--) {          // 주 끝 쪽부터, 하루에 하나씩
            if (seen[list[i].key]) continue;
            seen[list[i].key] = 1; out.unshift(list[i]);
        }
        for (var j = list.length - 1; j >= 0 && out.length < n; j--) if (out.indexOf(list[j]) < 0) out.unshift(list[j]);
        return out;
    }

    /* ---------- 홈 카드 ---------- */
    function cardHTML(g) {
        var thumbs = pickPhotos(g.photos, 4).map(function (x) {
            var u = photoUrl(x.p);
            return u ? '<div style="background-image:url(\'' + esc(u).replace(/'/g, "%27") + '\')"></div>' : '';
        }).join("");
        var meta = numbers(g).map(function (n) { return n[0] + " " + (n[0] === "잠" ? "하루 " + n[1] : n[1]); }).join(" · ");
        return '<div id="' + CARD + '" class="hide-on-senior">' +
            '<div class="wk-top"><span class="wk-h">' + esc(babyName()) + '의 한 주</span>' +
                '<span class="wk-range">' + esc(rangeText(g)) + '</span>' +
                '<span class="wk-x" onclick="window.__weekHide(\'' + g.key + '\')" aria-label="닫기">×</span></div>' +
            '<div class="wk-line">' + esc(headline(g)) + '</div>' +
            (thumbs ? '<div class="wk-thumbs">' + thumbs + '</div>' : '') +
            (meta ? '<div class="wk-meta">' + esc(meta) + '</div>' : '') +
            '<div class="wk-go" onclick="window.openWeekSheet(\'' + g.key + '\')">한 장으로 보기</div>' +
        '</div>';
    }

    function paint() {
        var host = document.getElementById("tab-home");
        var old = document.getElementById(CARD);
        var ws = nowWeek();
        if (!host || !ws || !get("tosil_startDate") || state().hide === keyOf(ws) || (window.babyStage && window.babyStage() !== "born")) {
            if (old) old.remove();
            return;
        }
        var g = gather(ws);
        if (!enough(g)) { if (old) old.remove(); return; }
        css();
        var html = cardHTML(g);
        if (old && old.getAttribute("data-k") === html) return;     // 그대로면 안 건드린다
        var box = document.createElement("div");
        box.innerHTML = html;
        var el = box.firstChild;
        el.setAttribute("data-k", html);
        if (old && old.parentNode) { old.parentNode.replaceChild(el, old); return; }
        var anchor = document.getElementById("home-todo") || document.getElementById("now-status-card");
        if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(el, anchor);
        else host.appendChild(el);
    }
    window.refreshWeekCard = paint;

    window.__weekHide = function (k) {
        setState("hide", k);
        var c = document.getElementById(CARD); if (c) c.remove();
        toast("다음 주에 또 정리해 둘게요");
    };

    /* ---------- 한 장 (창) ---------- */
    var OPEN = null;
    function closeSheet() { var w = document.getElementById(SHEET); if (w) w.remove(); OPEN = null; }
    window.closeWeekSheet = closeSheet;

    function canTell() {
        var c = get("family_sync_code");
        return !!(c && c.indexOf("unlinked") < 0 && get("tosil_role_locked") !== "viewer");
    }

    window.openWeekSheet = function (k) {
        var ws = (k && /^\d{4}-\d{2}-\d{2}$/.test(k)) ? mondayOf(fromKey(k)) : (nowWeek() || addDays(mondayOf(new Date()), -7));
        var g = gather(ws);
        if (!enough(g)) return toast("그 주에는 담긴 게 아직 없어요");
        css();
        closeSheet();
        OPEN = g;
        var photos = pickPhotos(g.photos, 3).map(function (x) {
            var u = photoUrl(x.p);
            return u ? '<div style="background-image:url(\'' + esc(u).replace(/'/g, "%27") + '\')"></div>' : '';
        }).join("");
        var nums = numbers(g).map(function (n) {
            return '<div class="wk-num"><b>' + esc(n[0]) + '</b><strong>' + esc(n[1]) + '</strong>' +
                (n[2] ? '<i>' + esc(n[2]) + '</i>' : '') + (n[3] ? '<em>' + esc(n[3]) + '</em>' : '') + '</div>';
        }).join("");
        var firsts = g.firsts.map(function (f) {
            return '<div class="wk-first">' + esc(f.title) + '<span>' + esc(md(fromKey(f.key))) + '</span></div>';
        }).join("");
        var note = g.notes[0];
        var others = [];
        if (g.photos.length) others.push("사진 " + g.photos.length + "장");
        if (g.voices) others.push("소리 " + g.voices + "개");
        if (g.notes.length) others.push("한 줄 " + g.notes.length + "개");
        var sent = state().sent === g.key;

        var w = document.createElement("div");
        w.id = SHEET;
        w.onclick = function (e) { if (e.target === w) closeSheet(); };
        w.innerHTML = '<div class="wk-box"><div class="wk-grab"></div>' +
            '<div class="wk-title">' + esc(babyName()) + '의 한 주</div>' +
            '<div class="wk-sub">' + esc(rangeText(g)) + (ageLine(g) ? ' · ' + esc(ageLine(g)) : '') + '</div>' +
            (photos ? '<div class="wk-photos">' + photos + '</div>' : '') +
            (firsts ? '<div class="wk-sec"><div class="wk-sec-h">처음 해낸 일</div>' + firsts + '</div>' : '') +
            (nums ? '<div class="wk-sec"><div class="wk-sec-h">이번 주 기록</div><div class="wk-nums">' + nums + '</div></div>' : '') +
            (note ? '<div class="wk-sec"><div class="wk-sec-h">이번 주 한 줄</div><div class="wk-quote">' + esc(note.text.length > 80 ? note.text.slice(0, 80) + "…" : note.text) +
                '<span>' + (note.who ? esc(note.who) + ' · ' : '') + esc(md(fromKey(note.key))) + '</span></div></div>' : '') +
            (g.growth ? '<div class="wk-sec"><div class="wk-sec-h">키 · 몸무게</div><div style="font-size:14.5px;font-weight:800;">' +
                [g.growth.w ? g.growth.w + "kg" : "", g.growth.h ? g.growth.h + "cm" : ""].filter(Boolean).join(" · ") +
                '<span style="font-size:12px;font-weight:700;color:' + SUB + ';margin-left:6px;">' + esc(md(fromKey(g.growth.date))) + '</span></div></div>' : '') +
            (others.length ? '<div style="margin-top:16px;font-size:12px;font-weight:700;color:' + SUB + ';">배냇함에 담긴 것 · ' + esc(others.join(" · ")) + '</div>' : '') +
            '<div class="wk-btn dark" onclick="window.__weekBake()">사진으로 저장 · 가족에게 보내기</div>' +
            (canTell() ? (sent ? '<div class="wk-btn done">짝꿍 폰에 알렸어요</div>'
                               : '<div class="wk-btn light" id="wk-tell" onclick="window.__weekTell()">짝꿍 폰에도 알리기</div>') : '') +
        '</div>';
        document.body.appendChild(w);
        if (canTell() && !sent) partnerCheck().then(function (has) {
            /* 가족방에 나밖에 없으면 '알렸어요' 가 거짓말이 된다. 대신 짝꿍을 부른다 (모르면 그대로 둔다) */
            var b = document.getElementById("wk-tell");
            if (has !== false || !b) return;
            b.textContent = "짝꿍을 초대하면 이 한 장이 짝꿍 폰에도 가요";
            b.onclick = function () {
                closeSheet();
                var nm = document.getElementById("invite-baby-name");
                if (nm) nm.innerText = babyName();
                var sh = document.getElementById("invite-bottom-sheet");
                if (sh) sh.style.display = "flex";
            };
        });
    };

    /* 가족방에 나 말고 엄마 · 아빠가 있나 (돌봄 도우미는 빼고) — 모르면 null */
    function partnerCheck() {
        var code = get("family_sync_code"), me = window.auth && window.auth.currentUser && window.auth.currentUser.uid;
        if (!code || !me || !window.db || typeof window.getDoc !== "function" || typeof window.doc !== "function") return Promise.resolve(null);
        try {
            return window.getDoc(window.doc(window.db, "families", code)).then(function (snap) {
                var m = snap.exists() ? (snap.data() || {}).members : null;
                if (!m) return null;
                var ids = Array.isArray(m) ? m : Object.keys(m);
                return ids.some(function (u) { return u !== me && (Array.isArray(m) || m[u] !== "viewer"); });
            }).catch(function () { return null; });
        } catch (e) { return Promise.resolve(null); }
    }

    /* ---------- 짝꿍 폰에 알리기 ---------- */
    window.__weekTell = function () {
        var g = OPEN; if (!g) return;
        var code = get("family_sync_code");
        if (!canTell() || !window.functions || typeof window.httpsCallable !== "function") return toast("가족 연결을 하면 짝꿍 폰에도 보낼 수 있어요");
        var btn = document.getElementById("wk-tell");
        if (btn) { btn.style.opacity = "0.5"; btn.onclick = null; }
        var who = (typeof window.myRoleWord === "function") ? window.myRoleWord() : (get("user_role") === "dad" ? "아빠" : "엄마");
        var fn = window.httpsCallable(window.functions, "sendFamilyPush");
        fn({
            syncCode: code,
            excludeUid: (typeof window.myUid === "function") ? window.myUid() : null,
            excludeToken: (typeof window.myPushToken === "function") ? window.myPushToken() : null,
            title: "💌 " + babyName() + "의 한 주가 왔어요",
            body: who + "가 " + rangeText(g) + "을 한 장으로 정리했어요",
            link: "index.html?go=week&w=" + g.key,
            skipRoles: ["viewer"]
        }).then(function () {
            setState("sent", g.key);
            if (btn) { btn.className = "wk-btn done"; btn.textContent = "짝꿍 폰에 알렸어요"; btn.style.opacity = ""; }
            toast("짝꿍 폰에 알렸어요");
        }).catch(function (e) {
            console.warn("[이번 주] 알림 실패", e);
            if (btn) { btn.style.opacity = ""; btn.onclick = window.__weekTell; }
            toast("알림을 못 보냈어요. 잠시 뒤에 다시 눌러 주세요");
        });
    };

    /* ---------- 사진으로 굽기 (이달의 카드 monthcard.js 와 같은 방식) ---------- */
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
        if (typeof window.getCachedPhotoData === "function") {
            try { var c = await window.getCachedPhotoData(p.id); if (c) { var d = await toDataUrl(c); if (d) return d; } } catch (e) {}
        }
        return await toDataUrl(p.url);
    }

    function imageHTML(g, shots) {
        var nums = numbers(g).map(function (n) {
            return '<div style="flex:1;background:#FFFFFF;border:1px solid #EFE7DC;border-radius:22px;padding:26px 22px;min-width:0;">' +
                '<div style="font-size:21px;font-weight:700;color:#8A7F76;">' + esc(n[0]) + '</div>' +
                '<div style="font-size:38px;font-weight:900;color:#3B322C;margin-top:8px;letter-spacing:-1px;">' + esc(n[1]) + '</div>' +
                (n[2] ? '<div style="font-size:18px;font-weight:600;color:#8A7F76;margin-top:8px;line-height:1.45;">' + esc(n[2]) + '</div>' : '') +
            '</div>';
        }).join("");
        var photos = shots.map(function (s) {
            return '<div style="flex:1;aspect-ratio:1/1;border-radius:22px;overflow:hidden;background:#F5EFE6;">' +
                '<img src="' + s + '" style="width:100%;height:100%;object-fit:cover;display:block;"></div>';
        }).join("");
        var firsts = g.firsts.slice(0, 3).map(function (f) {
            return '<div style="display:flex;justify-content:space-between;align-items:baseline;padding:16px 0;border-top:1px solid #EFE7DC;">' +
                '<span style="font-family:' + SERIF + ';font-size:34px;font-weight:700;color:#3B322C;">' + esc(f.title) + '</span>' +
                '<span style="font-size:20px;font-weight:700;color:#8A7F76;">' + esc(md(fromKey(f.key))) + '</span></div>';
        }).join("");
        var note = g.notes[0];
        return '<div style="width:100%;height:100%;box-sizing:border-box;padding:76px 72px 64px;display:flex;flex-direction:column;' +
                'background:linear-gradient(170deg,#FFFDF9 45%,#FBF3E4 100%);color:#3B322C;">' +
            '<div style="font-size:16px;font-weight:600;color:#C4B5A9;letter-spacing:7px;">OUR WEEK</div>' +
            '<div style="font-family:' + SERIF + ';font-size:58px;font-weight:700;letter-spacing:-2px;margin-top:18px;">' + esc(babyName()) + '의 한 주</div>' +
            '<div style="font-size:22px;font-weight:700;color:' + GOLD + ';margin-top:12px;">' + esc(rangeText(g)) + (ageLine(g) ? ' · ' + esc(ageLine(g)) : '') + '</div>' +
            (photos ? '<div style="display:flex;gap:12px;margin-top:40px;">' + photos + '</div>' : '') +
            (firsts ? '<div style="margin-top:38px;"><div style="font-size:19px;font-weight:800;color:#8A7F76;margin-bottom:6px;">처음 해낸 일</div>' + firsts + '</div>' : '') +
            (note && g.firsts.length <= 2 ? '<div style="margin-top:38px;font-family:' + SERIF + ';font-size:32px;font-weight:700;line-height:1.6;word-break:keep-all;">' +
                '"' + esc(note.text.length > 60 ? note.text.slice(0, 60) + "…" : note.text) + '"' +
                '<div style="font-family:inherit;font-size:19px;color:#8A7F76;margin-top:8px;">' + (note.who ? esc(note.who) + ' · ' : '') + esc(md(fromKey(note.key))) + '</div></div>' : '') +
            (nums ? '<div style="display:flex;gap:14px;margin-top:44px;">' + nums + '</div>' : '') +
            '<div style="display:flex;justify-content:flex-end;margin-top:auto;padding-top:30px;font-family:' + SERIF + ';font-size:24px;font-weight:700;color:#8A7F76;">배냇함</div>' +
        '</div>';
    }

    window.__weekBake = async function () {
        var g = OPEN; if (!g) return;
        if (typeof html2canvas === "undefined") return toast("이미지 도구를 불러오지 못했어요");
        toast("한 장으로 굽고 있어요…");
        var shots = [];
        var pick = pickPhotos(g.photos, 3);
        for (var i = 0; i < pick.length; i++) { var d = await photoData(pick[i].p); if (d) shots.push(d); }
        var stage = document.createElement("div");
        stage.style.cssText = "position:fixed;top:0;left:0;width:1080px;height:1350px;font-family:'Pretendard',sans-serif;z-index:-9999;pointer-events:none;";
        stage.innerHTML = imageHTML(g, shots);
        document.body.appendChild(stage);
        var name = babyName() + "_" + g.key + "_한주.png";
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
                            navigator.share({ files: [file], title: babyName() + "의 한 주" }).catch(function () {});
                        } else fallback();
                    } finally { stage.remove(); }
                }, "image/png");
            }).catch(function (e) {
                console.error("[이번 주] 굽기 실패", e);
                stage.remove();
                toast("저장 중 문제가 생겼어요");
            });
        }, 380);
    };

    /* ---------- 시작 ---------- */
    function boot() {
        setTimeout(paint, 1800);
        setInterval(paint, 5 * 60000);
        document.addEventListener("visibilitychange", function () { if (!document.hidden) paint(); });
        if (GO !== null) setTimeout(function () {
            try { if (typeof window.switchTab === "function") window.switchTab("home", document.getElementById("nav-home")); } catch (e) {}
            window.openWeekSheet(GO);
        }, 1600);
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    /* ---------- 점검용 ---------- */
    window.weekDebug = function (k) {
        var ws = k ? mondayOf(fromKey(k)) : (nowWeek() || addDays(mondayOf(new Date()), -7));
        var g = gather(ws);
        console.log("주:", g.key, "~", keyOf(g.we), "· 띄울 때:", !!nowWeek(), "· 담긴 게 충분:", !!enough(g));
        console.log("맘마", g.t.feed, "(분유 " + g.t.ml + "ml · 모유 " + g.t.breast + ") · 이유식", g.t.food, "· 잠 평균", hm(g.t.sleepAvg), "· 기저귀", g.t.diaper);
        console.log("사진", g.photos.length, "· 소리", g.voices, "· 한 줄", g.notes.length, "· 처음", g.firsts.map(function (f) { return f.title; }).join(", "));
        return g;
    };
})();
