/* ============================================================
   배냇함 — 지금 여는지 (openhours.js)

   나들이 카드에 운영시간 글이 그대로만 있었다.
     "10:00~18:00 · 월요일 휴관"   "화~일 09:00 ~ 18:00 (월 휴관)"
   월요일 아침에 박물관을 골라 나가면 문이 닫혀 있다.
   지도 앱처럼 카드만 보고 알게 한다:
     오늘 쉬어요 · 18:00까지 열어요 · 곧 닫아요 · 10:00에 열어요 · 오늘은 문 닫았어요

   ⚠️ 자신 없으면 아무것도 안 붙인다.
      · 요일 말이 없는 글 (10:00~20:00 만, 백화점 영업시간 동일) — 쉬는 날을 모른다
      · '확인 요망 · 방문 전 확인 · 시즌 · 계절' 이 들어간 글
      · 시간이 없는 글 (연중무휴만, 매일 시즌별 상이)
   ⚠️ 공휴일 · 임시 휴관은 모른다. '운영시간은 바뀔 수 있어요' 안내는 그대로 둔다.

   window.placeHours(글)        → 읽은 결과 (못 읽으면 null)
   window.placeOpenNow(글, 때)  → { state, text } 또는 null
      state: open · soon · before · after · closed · always
   ============================================================ */
(function () {
    'use strict';

    var DAY = "일월화수목금토";            // Date.getDay() 순서
    var NTH = { "첫째": 1, "둘째": 2, "셋째": 3, "넷째": 4 };

    function dayIdx(ch) { return DAY.indexOf(ch); }
    function hhmm(min) {
        var h = Math.floor(min / 60) % 24, m = min % 60;
        return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
    }

    // '금/주말' · '월,화' · '평일' 같은 말을 요일 번호로
    function daysOf(text) {
        var out = [];
        var t = String(text || "");
        if (t.indexOf("주말") > -1) out.push(6, 0);
        if (t.indexOf("평일") > -1) out.push(1, 2, 3, 4, 5);
        t.replace(/[월화수목금토일]/g, function (c) { out.push(dayIdx(c)); return c; });
        return out;
    }

    var cache = {};

    function parse(raw) {
        var s = String(raw || "").replace(/\s+/g, " ").trim();
        if (!s) return null;
        if (Object.prototype.hasOwnProperty.call(cache, s)) return cache[s];
        var r = read(s);
        cache[s] = r;
        return r;
    }

    function read(s) {
        // 늘 열려 있는 곳 (공원 · 산책로). 괄호 안의 시설 시간은 따로라서 보지 않는다
        if (/상시\s*개방|24\s*시간/.test(s)) return { always: true };

        // 날마다 다르거나 확인이 필요한 곳은 모른다고 한다
        if (/확인|시즌|계절/.test(s)) return null;

        var tm = s.match(/(\d{1,2}):(\d{2})\s*~\s*(\d{1,2}):(\d{2})/);
        if (!tm) return null;
        var open = +tm[1] * 60 + +tm[2];
        var close = +tm[3] * 60 + +tm[4];
        if (close <= open) close += 24 * 60;

        var days = [false, false, false, false, false, false, false];
        var known = false;

        if (/매일|연중무휴/.test(s)) { days = [true, true, true, true, true, true, true]; known = true; }

        // '화~일' 처럼 여는 요일 범위
        var rg = s.match(/([월화수목금토일])\s*~\s*([월화수목금토일])/);
        if (rg) {
            days = [false, false, false, false, false, false, false];
            var a = dayIdx(rg[1]), b = dayIdx(rg[2]);
            for (var i = a; ; i = (i + 1) % 7) { days[i] = true; if (i === b) break; }
            known = true;
        }

        // '셋째 월요일 휴관' — 그달 셋째 월요일만 쉰다
        var nth = [];
        s.replace(/(첫째|둘째|셋째|넷째)\s*([월화수목금토일])\s*요일?\s*(휴관|휴무)/g, function (m0, n, d) {
            nth.push({ n: NTH[n], d: dayIdx(d) });
            return m0;
        });
        var plain = s.replace(/(첫째|둘째|셋째|넷째)\s*[월화수목금토일]\s*요일?\s*(휴관|휴무)/g, "");

        // '월요일 휴관' · '(월 휴관)' · '(월,화 휴무)' — 매주 쉬는 날
        var shut = plain.match(/([월화수목금토일](?:\s*[,·\/]\s*[월화수목금토일])*)\s*(?:요일)?\s*(?:휴관|휴무)/);
        if (shut) {
            if (!known) { days = [true, true, true, true, true, true, true]; known = true; }
            daysOf(shut[1]).forEach(function (d) { days[d] = false; });
        }
        if (nth.length && !known) { days = [true, true, true, true, true, true, true]; known = true; }

        // 쉬는 날을 모르는 글은 '지금 열려 있어요' 라고 말하지 않는다
        if (!known) return null;

        // '(금/주말 20:30)' — 그날만 늦게 닫는다
        var late = {};
        var lt = s.match(/\(([^()]*?)\s+(\d{1,2}):(\d{2})\)/);
        if (lt && /[월화수목금토일]|주말|평일/.test(lt[1])) {
            var lc = +lt[2] * 60 + +lt[3];
            if (lc <= open) lc += 24 * 60;
            daysOf(lt[1]).forEach(function (d) { late[d] = lc; });
        }

        return { days: days, open: open, close: close, late: late, nth: nth };
    }

    function nowStatus(raw, when) {
        var h = parse(raw);
        if (!h) return null;
        if (h.always) return { state: "always", text: "늘 열려 있어요" };

        var d = when instanceof Date ? when : new Date();
        var dow = d.getDay();
        var mins = d.getHours() * 60 + d.getMinutes();
        var weekOfMonth = Math.floor((d.getDate() - 1) / 7) + 1;

        var shutToday = !h.days[dow] || h.nth.some(function (x) { return x.d === dow && x.n === weekOfMonth; });
        if (shutToday) return { state: "closed", text: "오늘 쉬어요" };

        var close = h.late[dow] || h.close;
        if (mins < h.open) return { state: "before", text: hhmm(h.open) + "에 열어요" };
        if (mins >= close) return { state: "after", text: "오늘은 문 닫았어요" };
        if (close - mins <= 60) return { state: "soon", text: "곧 닫아요 · " + hhmm(close) };
        return { state: "open", text: hhmm(close) + "까지 열어요" };
    }

    window.placeHours = parse;
    window.placeOpenNow = nowStatus;
})();
