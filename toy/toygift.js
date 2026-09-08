/* ============================================================
   배냇함 PLUS — 뭐 사줄까 물어보면 (toygift.js)

   돌잔치에 같은 장난감이 세 개 들어온다.
   그리고 개월수가 안 맞는 걸 받아서 1년을 서랍에 둔다.

   원인은 하나다. 부모가 답을 못 준다.
   "뭐 사줄까?" 라고 물어보면 "아무거나~" 라고 한다.
   목록을 만들려면 지금 뭐가 있는지, 그때쯤 뭘 쓸지를 다 알아야 하는데
   그걸 앉아서 정리할 시간이 없다.

   앱은 안다. 개월수도, 가진 것도, 찜한 것도 다 있다.

   ⚠️ '지금' 개월수로 고르면 안 된다.
      선물은 지금 사서 그날 받는다. 그날 개월수로 골라야 한다.
      그래야 돌 선물로 신생아 모빌을 받는 참사가 없다.

   ⚠️ 갖고 계신 건 반드시 뺀다. 중복 선물을 막는 게 이 기능의 절반이다.

   index.html 에서 toylife.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var HOST = "toy-gift";
    var LINK = "https://happy-baby0303.github.io/baby-master/toy/index.html";

    var BLUE = "#3182F6", GRAY = "#8B95A1", DARK = "#191F28";
    var GOLD = "#8A6D00", PURPLE = "#7F77DD";

    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }
    function babyName() { return localStorage.getItem("tosil_babyName") || "우리 아기"; }
    function nm(j) {
        try { if (typeof window.babyNm === "function") return window.babyNm(j); } catch (e) {}
        var n = babyName(), c = n.charCodeAt(n.length - 1);
        var jong = (c >= 0xAC00 && c <= 0xD7A3) && ((c - 0xAC00) % 28 !== 0);
        return n + (jong ? "이" : "") + (j || "");
    }
    function isPlus() {
        try { if (typeof window.isPremiumUser === "function") return !!window.isPremiumUser(); } catch (e) {}
        if (!localStorage.getItem("firebase_uid")) return false;
        return localStorage.getItem("tosil_is_founder") === "true"
            || localStorage.getItem("tosil_plan_cache") === "premium"
            || localStorage.getItem("tosil_is_master") === "true";
    }
    function toys() {
        try { if (typeof toyData !== "undefined" && toyData) return toyData; } catch (e) {}
        return window.toyData || [];
    }
    function mine() {
        try { return window.myToyIds ? window.myToyIds() : []; } catch (e) { return []; }
    }

    function birth() {
        var s = localStorage.getItem("tosil_startDate");
        if (!s) return null;
        var p = String(s).split("-").map(Number);
        if (p.length !== 3) return null;
        var d = new Date(p[0], p[1] - 1, p[2]);
        d.setHours(0, 0, 0, 0);
        return isNaN(d.getTime()) ? null : d;
    }
    function daysTo(d) {
        var t = new Date(); t.setHours(0, 0, 0, 0);
        return Math.round((d - t) / 86400000);
    }
    /* 그날의 개월수 */
    function monthsAt(d) {
        var b = birth();
        if (!b) return null;
        var m = (d.getFullYear() - b.getFullYear()) * 12 + (d.getMonth() - b.getMonth());
        if (d.getDate() < b.getDate()) m--;
        return m < 0 ? 0 : m;
    }
    function msOf(m) {
        if (m === null) return null;
        if (m < 2) return "newborn";
        if (m < 4) return "tummy";
        if (m < 7) return "flip";
        if (m < 10) return "crawl";
        return "stand";
    }
    var MSNAME = {
        newborn: "신생아", tummy: "터미타임", flip: "뒤집기",
        crawl: "배밀이", stand: "잡고서기", all: "전 시기"
    };

    /* ---------- 다가오는 날 ----------
       명절은 해마다 날짜가 달라 넣지 않는다. 틀린 날짜를 띄우느니 안 띄운다. */
    function nextDay() {
        var b = birth();
        if (!b) return null;

        var add = function (n) { var d = new Date(b); d.setDate(d.getDate() + n); return d; };
        var cand = [
            { name: "100일", at: add(99) },
            { name: "200일", at: add(199) },
            { name: "첫 생일 (돌)", at: add(365) }
        ];
        /* 돌 다음부터는 해마다 생일 */
        for (var y = 2; y <= 6; y++) {
            var d = new Date(b); d.setFullYear(b.getFullYear() + y);
            cand.push({ name: y + "번째 생일", at: d });
        }
        var out = cand.filter(function (c) { return daysTo(c.at) >= 0; })
                      .sort(function (a, c) { return a.at - c.at; })[0];
        if (!out) return null;
        out.left = daysTo(out.at);
        out.months = monthsAt(out.at);
        return out;
    }

    /* ---------- 고르기 ---------- */

    function picks(day) {
        var have = mine();
        var ms = msOf(day ? day.months : null);
        var all = toys();

        var fit = all.filter(function (t) {
            if (have.indexOf(t.id) > -1) return false;              // 갖고 계신 건 뺀다
            return !ms || t.milestone === ms || t.milestone === "all";
        });
        /* ⚠️ '전 시기' 것을 그냥 두면 몇 개월이든 목록이 똑같아 보인다.
              그날 시기 전용을 앞에 세운다. 선물은 그때 딱 맞는 게 반갑다. */
        fit.sort(function (a, b) {
            return (a.milestone === ms ? 0 : 1) - (b.milestone === ms ? 0 : 1);
        });
        /* 그때 시기 것이 모자라면 그 다음 시기까지 넓힌다 —
           선물은 좀 일찍 받아도 괜찮지만 늦으면 못 쓴다. */
        if (fit.length < 5 && ms) {
            var order = ["newborn", "tummy", "flip", "crawl", "stand"];
            var i = order.indexOf(ms);
            var nx = order[i + 1];
            if (nx) fit = fit.concat(all.filter(function (t) {
                return have.indexOf(t.id) === -1 && t.milestone === nx;
            }));
        }
        return fit.slice(0, 5);
    }

    /* ---------- 카톡 ---------- */

    window.shareGiftList = function () {
        var day = nextDay(), list = picks(day);
        if (!list.length) return;

        var text = "🎁 " + nm("의") + " " + (day ? day.name : "선물") + " 뭐 사줄까 물어보셨죠?\n\n" +
            (day ? "그때쯤이면 " + day.months + "개월이라 이런 게 잘 맞아요.\n\n" : "\n") +
            list.map(function (t, i) {
                return (i + 1) + ". " + t.name + (t.freeTime ? "  (" + t.freeTime + ")" : "");
            }).join("\n") +
            "\n\n이미 있는 건 빼고 골랐어요. 하나만 골라주셔도 충분합니다 🤍\n" +
            "👉 " + LINK;

        if (typeof Kakao === "undefined" || !Kakao.isInitialized()) {
            if (navigator.clipboard) {
                navigator.clipboard.writeText(text)
                    .then(function () { alert("목록이 복사됐어요! 붙여넣기 해주세요 🤍"); })
                    .catch(function () { prompt("아래 내용을 복사해 주세요", text); });
            } else prompt("아래 내용을 복사해 주세요", text);
            return;
        }
        Kakao.Share.sendDefault({
            objectType: "text", text: text,
            link: { mobileWebUrl: LINK, webUrl: LINK },
            buttons: [{ title: "목록 보기 🎁", link: { mobileWebUrl: LINK, webUrl: LINK } }]
        });
    };

    /* ---------- 화면 ---------- */

    function html() {
        var b = birth();
        if (!b) return "";

        var day = nextDay();
        var list = picks(day);
        var have = mine();
        var plus = isPlus();
        var show = plus ? list : list.slice(0, 1);

        var out = '<div style="background: #FFFFFF; border:1px solid #E5E8EB; border-radius:18px; ' +
            'padding:18px; margin-bottom:14px;">' +

            '<div data-plus-head style="font-size:14.5px; font-weight:900; color:' + DARK + ';">' +
                '\uD83C\uDF81 뭐 사줄까 물어보면</div>' +

            '<div style="margin-top:5px; font-size:12.5px; font-weight:600; color:' + GRAY + '; ' +
                'line-height:1.7; word-break:keep-all;">' +
                '돌잔치에 같은 장난감이 세 개 들어옵니다. ' +
                '<b>갖고 계신 건 빼고</b>, 그날 개월수에 맞는 걸로 골라드릴게요.</div>';

        if (day) {
            out += '<div style="display:flex; align-items:center; justify-content:space-between; ' +
                'gap:10px; margin-top:13px; padding:13px 15px; background:#F5F3FF; ' +
                'border:1px solid #DDD6FE; border-radius:13px;">' +
                '<div style="min-width:0;">' +
                    '<div style="font-size:13.5px; font-weight:900; color:#6D28D9;">' +
                        esc(nm("의")) + ' ' + esc(day.name) + '</div>' +
                    '<div style="margin-top:2px; font-size:11.5px; font-weight:700; color:' + GRAY + ';">' +
                        '그때쯤이면 ' + day.months + '개월 \u00b7 ' +
                        (MSNAME[msOf(day.months)] || "") + ' 시기예요</div>' +
                '</div>' +
                '<div style="flex-shrink:0; font-size:16px; font-weight:900; color:#6D28D9;">' +
                    (day.left === 0 ? "오늘" : "D-" + day.left) + '</div>' +
            '</div>';
        }

        if (!list.length) {
            out += '<div style="margin-top:13px; font-size:12.5px; font-weight:700; color:' + GRAY + '; ' +
                'line-height:1.7;">고를 게 없네요. 갖고 계신 걸 너무 잘 챙기셨습니다.</div>';
            return out + '</div>';
        }

        out += '<div style="margin-top:14px;">' +
            show.map(function (t, i) {
                return '<div style="display:flex; gap:10px; padding:11px 0; ' +
                    'border-bottom:1px solid #F2F4F6;">' +
                    '<div style="flex-shrink:0; width:20px; height:20px; border-radius:6px; ' +
                        'background:' + DARK + '; color:#FFFFFF; font-size:11px; font-weight:900; ' +
                        'display:inline-flex; align-items:center; justify-content:center;">' +
                        (i + 1) + '</div>' +
                    '<div style="flex:1; min-width:0;">' +
                        '<div style="font-size:13px; font-weight:800; color:' + DARK + '; ' +
                            'word-break:keep-all;">' + esc(t.name) + '</div>' +
                        '<div style="margin-top:2px; font-size:11.5px; font-weight:700; color:' + GRAY + ';">' +
                            (MSNAME[t.milestone] || t.milestone) +
                            (t.freeTime ? ' \u00b7 ' + esc(t.freeTime) : '') + '</div>' +
                    '</div>' +
                '</div>';
            }).join("") + '</div>';

        if (plus) {
            out += '<div onclick="window.shareGiftList()" style="margin-top:14px; text-align:center; ' +
                'padding:15px; background:#FEE500; color:#191919; border-radius:13px; ' +
                'font-size:13.5px; font-weight:900; cursor:pointer;">' +
                '\uD83D\uDCAC 카톡으로 이 목록 보내기</div>' +
                '<div style="margin-top:9px; font-size:11.5px; font-weight:600; color:' + GRAY + '; ' +
                    'line-height:1.7; word-break:keep-all;">' +
                    (have.length
                        ? '등록하신 ' + have.length + '개는 빼고 골랐어요. '
                        : '<b>우리 집 육아템을 등록하시면</b> 이미 있는 건 빼고 골라드립니다. ') +
                    '받는 분이 고르기 쉽게 다섯 개까지만 보냅니다.</div>';
        } else {
            out += '<div style="margin-top:14px; background:#FFF9E6; border:1px solid #F5E1A4; ' +
                'border-radius:13px; padding:16px;">' +
                '<div style="font-size:13px; font-weight:900; color:' + GOLD + ';">' +
                    '나머지 ' + (list.length - show.length) + '개와 카톡 보내기는 PLUS에서</div>' +
                '<div style="margin-top:5px; font-size:12px; font-weight:600; color:' + GOLD + '; ' +
                    'line-height:1.75; word-break:keep-all;">' +
                    '목록을 그대로 카톡으로 보내시면 됩니다. ' +
                    '<b>"아무거나~" 라고 안 하셔도 되고, 같은 게 두 개 안 들어옵니다.</b></div></div>';
        }

        return out + '</div>';
    }

    /* ---------- 자리 ---------- */

    function paint() {
        var host = document.getElementById(HOST);
        if (!host) return;
        host.innerHTML = html();
        try { if (typeof window.refreshPlusMark === "function") window.refreshPlusMark(); } catch (e) {}
    }
    window.refreshToyGift = paint;

    function mount() {
        if (document.getElementById(HOST)) return;
        var host = document.getElementById("view-toy-play");
        if (!host) return;
        var box = document.createElement("div");
        box.id = HOST;
        var after = document.getElementById("toy-idle") ||
                    document.getElementById("play-log") ||
                    document.getElementById("play-week");
        if (after && after.parentNode === host) host.insertBefore(box, after.nextSibling);
        else host.appendChild(box);
        paint();
    }

    function boot() {
        setTimeout(function () { mount(); paint(); }, 600);
        setTimeout(function () { mount(); paint(); }, 1700);

        ["closeShelfSheet", "switchToyMainTab"].forEach(function (n) {
            var f = window[n];
            if (typeof f !== "function" || f.__gift) return;
            var w = function () { var o = f.apply(this, arguments); setTimeout(paint, 90); return o; };
            w.__gift = true;
            window[n] = w;
        });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    window.toyGiftDebug = function () {
        var day = nextDay();
        console.log("PLUS:", isPlus(), "· 생년월일:", localStorage.getItem("tosil_startDate"));
        if (!day) { console.log("생년월일이 없어 다가오는 날을 못 셉니다"); return; }
        console.log("다가오는 날:", day.name, "D-" + day.left,
                    "· 그때 개월수:", day.months, "(" + MSNAME[msOf(day.months)] + ")");
        console.log("갖고 계신 것:", mine().length + "개 (후보에서 뺌)");
        picks(day).forEach(function (t, i) {
            console.log("   " + (i + 1) + ". " + t.name + "  [" + MSNAME[t.milestone] + "]");
        });
        console.log("붙었나:", !!document.getElementById(HOST));
    };
})();