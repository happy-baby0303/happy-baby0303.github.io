/* ============================================================
   배냇함 — 기록 · 통계: 지난 7일 막대 (statweek.js)

   '기록 · 통계' 창에는 숫자 세 개(지난 7일 평균)와 긴 목록만 있었다.
   먹는 양이 늘었는지, 잠이 줄었는지, 대변이 며칠째 없는지 보려면 목록을 하루씩 내려야 했다.
   육아 기록 앱들이 통계를 날짜별 막대로 보여 주는 이유다.

   '맘마 · 잠 · 기저귀' 를 고르면 평균 칸 자리에 그 종류의 막대 여덟 개(지난 7일 + 오늘)가 뜬다.
     · 맘마 — 분유 · 유축 ml (ml 기록이 없는 집은 횟수). 이유식은 빼고 센다 (홈 '오늘 하루' 와 같은 셈)
     · 잠 — 하루 잠, 밤잠 · 낮잠을 나눠 칠한다. 자정을 넘긴 잠은 날마다 나눠 센다 (목록 날짜 칸과 같은 셈)
     · 기저귀 — 횟수, 대변이 든 기저귀는 진하게
   막대를 누르면 아래 목록이 그날로 간다.

   ⚠️ 견주지 않는다. 또래 평균 · 권장량 선이 없다. 우리 집 숫자만 (weekly.js 와 같은 원칙).
   ⚠️ 오늘은 아직 하루가 안 끝났다. 옅게 칠하고 평균에서 뺀다.
      예전 '지난 7일 평균' 은 168시간을 기록한 날 수로 나눠서, 반나절뿐인 오늘과 이레 전이 하루로 세어져
      평균이 늘 낮게 나왔다 (매일 1,080ml 먹는 집이 1,003ml). 어제까지 이레로 센다 — script.js 평균 칸도 이걸 쓴다.

   index.html 에서 script.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var INK = "#4A413C", SUB = "#A3958A", MUTE = "#C4B5A9", LINE = "#EFE7DC";
    var COLOR = {
        feed:   { main: "#E8973A", soft: "#F6D7B0" },
        sleep:  { main: "#7F77DD", soft: "#CFCBF4" },
        diaper: { main: "#2FA584", soft: "#A9DFCD" }
    };

    function num(v) { v = parseInt(v, 10); return isNaN(v) ? 0 : v; }
    function isPoo(r) { return r.subType === "대변" || r.subType === "둘 다" || r.subType === "소변+대변"; }
    function comma(n) { return Math.round(n).toLocaleString("ko-KR"); }

    /* 날마다 숫자 — 이레 전부터 어제까지(7) + 오늘(1) */
    function days(records, now) {
        var base = new Date(now); base.setHours(0, 0, 0, 0);
        var out = [];
        for (var i = 7; i >= 0; i--) {
            var s = new Date(base.getFullYear(), base.getMonth(), base.getDate() - i).getTime();
            var e = new Date(base.getFullYear(), base.getMonth(), base.getDate() - i + 1).getTime();
            out.push({ s: s, e: e, today: i === 0, any: false, ml: 0, feeds: 0, night: 0, nap: 0, diaper: 0, poo: 0 });
        }
        var first = out[0].s, end = out[out.length - 1].e;
        (records || []).forEach(function (r) {
            if (!r) return;
            var t = Number(r.timestamp);
            if (r.type === "sleep") {
                if (!(Number(r.amount) > 0) || typeof window.getSleepRange !== "function" || typeof window.minsInRange !== "function") return;
                var sr = window.getSleepRange(r);
                if (!sr || sr.end - sr.start > 20 * 3600000 || sr.end <= first || sr.start >= end) return;
                out.forEach(function (d) {
                    var m = window.minsInRange(sr.start, sr.end, d.s, d.e);
                    if (m > 0) { if (r.subType === "밤잠") d.night += m; else d.nap += m; }
                });
            }
            if (!(t >= first && t < end)) return;
            var d = null;
            for (var j = 0; j < out.length; j++) if (t >= out[j].s && t < out[j].e) { d = out[j]; break; }
            if (!d) return;
            d.any = true;
            if (r.type === "feed" && r.subType !== "이유식") {
                d.feeds++;
                if (r.subType !== "모유") d.ml += num(r.amount);
            } else if (r.type === "diaper") {
                d.diaper++;
                if (isPoo(r)) d.poo++;
            }
        });
        return out;
    }

    /* 하루 평균 — 어제까지 이레 중 무엇이든 기록한 날로 나눈다. 그런 날이 없으면 null */
    function averages(list) {
        var full = list.filter(function (d) { return !d.today && d.any; });
        if (!full.length) return null;
        var n = full.length, sum = function (k) { return full.reduce(function (a, d) { return a + d[k]; }, 0); };
        return { days: n, ml: sum("ml") / n, feeds: sum("feeds") / n, sleep: (sum("night") + sum("nap")) / n,
                 diaper: sum("diaper") / n, poo: sum("poo") / n };
    }

    window.statWeekDays = days;
    window.statWeekAvg = function (records, now) { return averages(days(records, now)); };

    function hm(mins) {
        mins = Math.round(mins);
        var h = Math.floor(mins / 60), m = mins % 60;
        return h ? h + "시간" + (m ? " " + m + "분" : "") : m + "분";
    }

    /* 막대를 누르면 목록이 그날로 (script.js 가 날짜 칸 앞에 data-hday 표식을 둔다) */
    window.statWeekGo = function (s) {
        var list = document.getElementById("hist-list");
        var mark = list && list.querySelector('[data-hday="' + s + '"]');
        if (!mark) {
            if (typeof window.showToast === "function") window.showToast("그날은 이 기록이 없어요");
            return;
        }
        var top = mark.offsetParent === list ? mark.offsetTop : mark.offsetTop - list.offsetTop;
        list.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    };

    /* 잠 무늬 — ⚠️ 잠 무늬 창(z-index 9999)은 통계 창(99999) 밑에 열린다. 이 길로 열 때만 위로 올린다.
       닫으면 통계 창으로 돌아온다. 잠 무늬를 닫을 때 body 스크롤을 풀어 버려서, 통계 창이 열려 있으면 다시 잠근다 */
    window.statWeekSleepMap = function () {
        if (typeof window.openSleepMap !== "function") return;
        window.openSleepMap();
        var w = document.getElementById("sleepmap-modal");
        if (w) w.style.zIndex = "100000";
        var close = window.closeSleepMap;
        if (typeof close === "function" && !close.__stat) {
            var wrapped = function () {
                var out = close.apply(this, arguments);
                var ov = document.getElementById("stats-sheet-overlay");
                if (ov && ov.style.display !== "none") document.body.style.overflow = "hidden";
                return out;
            };
            wrapped.__stat = true;
            window.closeSleepMap = wrapped;
        }
    };

    /* 맘마 · 잠 · 기저귀 카드. 여드레 동안 그 종류가 하나도 없으면 '' (평균 칸이 그대로 뜬다) */
    window.statWeekCard = function (kind, records, now) {
        if (!COLOR[kind]) return "";
        var list = days(records, now), avg = averages(list);
        var byMl = kind === "feed" && list.some(function (d) { return d.ml > 0; });

        // 막대 하나 = [진한 몫, 옅은 몫]
        var parts = list.map(function (d) {
            if (kind === "feed") return byMl ? [d.ml, 0] : [d.feeds, 0];
            if (kind === "sleep") return [d.night, d.nap];
            return [d.poo, d.diaper - d.poo];
        });
        var tot = parts.map(function (p) { return p[0] + p[1]; });
        var max = Math.max.apply(null, tot);
        if (!(max > 0)) return "";

        var label = function (v) {
            if (!v) return "";
            if (kind === "sleep") return v < 60 ? Math.round(v) + "분" : Math.round(v / 60) + "시간";
            return byMl ? comma(v) : String(v);
        };

        var title = kind === "feed" ? (byMl ? "먹은 양" : "맘마 횟수") : kind === "sleep" ? "잠" : "기저귀";
        // 모유는 양(ml)을 모른다 — 섞어 먹이는 집은 막대가 분유 · 유축만이라는 걸 적어 둔다
        var breastToo = byMl && (records || []).some(function (r) {
            var t = Number(r && r.timestamp);
            return r && r.type === "feed" && r.subType === "모유" && t >= list[0].s && t < list[list.length - 1].e;
        });
        var mean = "";
        if (avg) {
            if (kind === "feed") mean = byMl ? (avg.ml ? "하루 평균 " + comma(avg.ml) + "ml" : "") : (avg.feeds ? "하루 평균 " + avg.feeds.toFixed(1).replace(/\.0$/, "") + "번" : "");
            else if (kind === "sleep") mean = avg.sleep ? "하루 평균 " + hm(avg.sleep) : "";
            else mean = avg.diaper ? "하루 평균 " + avg.diaper.toFixed(1).replace(/\.0$/, "") + "번" : "";
        }
        var c = COLOR[kind];
        var keys = kind === "sleep" ? [["밤잠", c.main], ["낮잠", c.soft]] : kind === "diaper" ? [["대변", c.main], ["소변만", c.soft]] : [];
        var BAR = 60;
        var cols = "", axis = "";
        list.forEach(function (d, i) {
            var p = parts[i], h = Math.round(tot[i] / max * BAR);
            if (tot[i] > 0 && h < 4) h = 4;
            var seg = function (v, col) {
                return v > 0 ? '<span style="display:block; height:' + (v / tot[i] * 100).toFixed(1) + '%; background-color:' + col + ' !important;"></span>' : "";
            };
            var day = new Date(d.s);
            cols +=
                '<div onclick="window.statWeekGo(' + d.s + ')" role="button" aria-label="' + (day.getMonth() + 1) + '월 ' + day.getDate() + '일 ' + label(tot[i]) + '" ' +
                    'style="flex:1; min-width:0; height:100%; display:flex; flex-direction:column; justify-content:flex-end; align-items:center; cursor:pointer;' + (d.today ? ' opacity:0.5;' : '') + '">' +
                    '<div style="font-size:10px; font-weight:800; color:' + (tot[i] ? INK : MUTE) + '; margin-bottom:3px; white-space:nowrap; letter-spacing:-0.3px;">' + label(tot[i]) + '</div>' +
                    (tot[i] > 0
                        ? '<div style="width:72%; max-width:26px; height:' + h + 'px; border-radius:6px 6px 3px 3px; overflow:hidden; display:flex; flex-direction:column-reverse;">' + seg(p[0], c.main) + seg(p[1], c.soft) + '</div>'
                        : '<div style="width:72%; max-width:26px; height:2px; border-radius:2px; background-color:' + LINE + ' !important;"></div>') +
                '</div>';
            axis += '<div style="flex:1; min-width:0; text-align:center; font-size:10.5px; font-weight:' + (d.today ? 900 : 700) + '; color:' + (d.today ? INK : SUB) + ';">' +
                (d.today ? "오늘" : day.getDate() + "일") + '</div>';
        });

        return '' +
            '<div id="stat-week-card" style="background:#FAF7F2; padding:12px 14px 10px; border-radius:16px; border:1px solid #EDE6DE; margin-bottom:14px;">' +
                '<div style="display:flex; justify-content:space-between; align-items:baseline; gap:8px; margin-bottom:6px;">' +
                    '<div style="font-size:13px; font-weight:900; color:#7F77DD;">지난 7일 · ' + title + '</div>' +
                    '<div style="font-size:12px; font-weight:800; color:' + INK + '; white-space:nowrap;">' + mean + '</div>' +
                '</div>' +
                '<div style="display:flex; align-items:flex-end; gap:4px; height:' + (BAR + 16) + 'px;">' + cols + '</div>' +
                '<div style="display:flex; gap:4px; margin-top:5px; padding-top:5px; border-top:1px solid ' + LINE + ';">' + axis + '</div>' +
                (keys.length || breastToo
                    ? '<div style="display:flex; justify-content:flex-end; align-items:center; gap:10px; margin-top:6px; font-size:10.5px; font-weight:700; color:' + SUB + ';">' +
                        keys.map(function (k) { return '<span style="display:inline-flex; align-items:center; gap:4px;"><span style="width:8px; height:8px; border-radius:2px; background-color:' + k[1] + ' !important;"></span>' + k[0] + '</span>'; }).join("") +
                        (breastToo ? '<span>모유는 양을 알 수 없어 분유 · 유축만 셌어요</span>' : "") +
                        (kind === "sleep" ? '<span onclick="window.statWeekSleepMap()" role="button" style="color:#7F77DD; font-weight:800; cursor:pointer;">잠 무늬 보기 ›</span>' : "") +
                      '</div>'
                    : "") +
            '</div>';
    };
})();
