/* ============================================================
   배냇함 PLUS — 뭐 사줄까 물어보면 (toygift.js)

   "뭐 사줄까?" 라고 물어보면 부모는 "아무거나~" 라고 한다.
   목록을 만들려면 지금 뭐가 있는지, 그때쯤 뭘 쓸지를 다 알아야 하는데
   그걸 앉아서 정리할 시간이 없다. 그래서 같은 게 겹치고,
   개월수가 안 맞는 걸 받아서 서랍에 둔다.

   앱은 안다. 개월수도, 가진 것(우리 집 장난감)도, 찜한 것도 있다.

   ⚠️ '지금' 개월수로 고르면 안 된다.
      선물은 지금 사서 그날 받는다. 그날 개월수로 골라야 한다.
   ⚠️ 갖고 계신 건 반드시 뺀다. 중복 선물을 막는 게 이 기능의 절반이다.
   ⚠️ 장난감만 고른다. 목록에는 체온계 · 욕조 · 변기 · 아기띠 같은 살림 · 위생 용품도 섞여 있다
      (혼자 노는 시간 칸에 '상시' · '목욕 시간' 처럼 적힌 것들 — app.js 의 toyPlayTime 이 거른다).
   ⚠️ 걸으면 못 쓰는 점퍼 · 쏘서는 그날 10개월이 넘으면 뺀다.
      그대로 두면 돌 목록 다섯 개 중 두 개가 점퍼였다 (받고 두세 달 쓰고 끝).
   ⚠️ 찜한 것이 먼저다. 부모가 갖고 싶다고 표시해 둔 게 곧 선물 목록이다.

   날 — 100일 · 돌 · 크리스마스 · 어린이날 중 가장 가까운 날 (그날 18개월 전까지).
        크리스마스 · 어린이날은 날짜가 해마다 같아서 넣는다. 설 · 추석은 해마다 달라 넣지 않는다.
        200일은 선물을 주고받는 날이 아니라 뺐다.
        목록이 잡고 서기(10개월~) 시기까지라, 18개월이 넘으면 맞는 걸 고를 수 없어 띄우지 않는다.

   자리 — 장난감 추천 탭, '이럴 때 필요한 장난감' 바로 아래.
          처음엔 날짜만 보이게 접어 둔다. 펼치면 목록과 카톡 보내기.
          놀이 탭 카드 줄 끝에 둘 셈이었는데(toyorder.js), 놀이 목록을 더 밀어내서 이 탭으로 옮겼다.
          장난감을 사는 이야기라 이 탭이 맞다.

   index.html 에서 toylife.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var HOST = "toy-gift";
    var LINK = "https://happy-baby0303.github.io/toy/index.html";
    var OPEN_KEY = "tosil_toy_gift_open";

    var GRAY = "#A3958A", DARK = "#4A413C", SUB = "#7A6F68", LINE = "#EDE6DE";
    var GOLD = "#8A6D00";

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
        try { return (window.myToyIds ? window.myToyIds() : []).map(Number); } catch (e) { return []; }
    }
    function liked() {
        try { return (JSON.parse(localStorage.getItem("favToys")) || []).map(Number); } catch (e) { return []; }
    }
    /* 혼자 노는 시간 — 놀이 시간이 적힌 '장난감' 만 값이 있다 (app.js 와 같은 규칙) */
    function playTime(t) {
        try { if (typeof window.toyPlayTime === "function") return window.toyPlayTime(t); } catch (e) {}
        var v = String((t && t.freeTime) || "").trim();
        return (/^\d+분$/.test(v) && [56, 57, 58].indexOf(Number(t.id)) === -1) ? v : "";
    }

    function today() { var t = new Date(); t.setHours(0, 0, 0, 0); return t; }
    function birth() {
        var s = localStorage.getItem("tosil_startDate");
        if (!s) return null;
        var p = String(s).split("-").map(Number);
        if (p.length !== 3) return null;
        var d = new Date(p[0], p[1] - 1, p[2]);
        d.setHours(0, 0, 0, 0);
        return isNaN(d.getTime()) ? null : d;
    }
    function daysTo(d) { return Math.round((d - today()) / 86400000); }
    /* 그날의 개월수 */
    function monthsAt(d) {
        var b = birth();
        if (!b) return null;
        var m = (d.getFullYear() - b.getFullYear()) * 12 + (d.getMonth() - b.getMonth());
        if (d.getDate() < b.getDate()) m--;
        return m < 0 ? 0 : m;
    }
    function msOf(m) {
        if (m === null || m === undefined) return null;
        if (m < 2) return "newborn";
        if (m < 4) return "tummy";
        if (m < 7) return "flip";
        if (m < 10) return "crawl";
        return "stand";
    }
    var STAGES = ["newborn", "tummy", "flip", "crawl", "stand"];
    var MSNAME = {
        newborn: "신생아", tummy: "터미타임", flip: "뒤집기",
        crawl: "배밀이", stand: "잡고 서기", all: "전 시기"
    };
    /* 걸으면 못 쓰는 것 — 졸리점퍼 · 점퍼루 · 엑서쏘서 */
    var UNTIL_WALK = [9, 10, 16];
    /* 놀이 시간은 적혀 있지만 선물로 줄 물건은 아닌 것 — 미니 점착 메모지 · 버블 클렌저 · 카시트 후방 거울 */
    var NOT_GIFT = [21, 42, 77];

    /* ---------- 다가오는 날 ---------- */
    function nextFixed(month, date) {           // 올해 그날이 지났으면 내년
        var t = today(), d = new Date(t.getFullYear(), month, date);
        if (d < t) d = new Date(t.getFullYear() + 1, month, date);
        d.setHours(0, 0, 0, 0);
        return d;
    }
    function nextDay() {
        var b = birth();
        if (!b || daysTo(b) > 0) return null;   // 아직 태어나기 전이면 띄우지 않는다

        var d100 = new Date(b); d100.setDate(d100.getDate() + 99);          // 태어난 날이 1일째
        var dol = new Date(b); dol.setFullYear(b.getFullYear() + 1);        // 365일 뒤가 아니라 같은 날 (윤년)
        var xmas = nextFixed(11, 25), kids = nextFixed(4, 5);
        var first = function (d) { return monthsAt(d) < 12 ? "첫 " : ""; };

        var cand = [
            { name: "100일", gift: "100일", at: d100 },
            { name: "첫 생일 (돌)", gift: "돌", at: dol },
            { name: first(xmas) + "크리스마스", gift: first(xmas) + "크리스마스", at: xmas },
            { name: first(kids) + "어린이날", gift: first(kids) + "어린이날", at: kids }
        ];
        var out = cand.filter(function (c) { return c.at >= b && daysTo(c.at) >= 0 && monthsAt(c.at) < 18; })
                      .sort(function (a, c) { return a.at - c.at; })[0];
        if (!out) return null;
        out.left = daysTo(out.at);
        out.months = monthsAt(out.at);
        out.ms = msOf(out.months);
        return out;
    }

    /* ---------- 고르기 ---------- */
    function picks(day) {
        if (!day) return [];
        var have = mine(), fav = liked();
        var ms = day.ms, next = STAGES[STAGES.indexOf(ms) + 1];

        var ok = function (t) {
            var id = Number(t.id);
            if (have.indexOf(id) > -1) return false;                                // 갖고 계신 건 뺀다
            if (!playTime(t)) return false;                                         // 장난감만
            if (NOT_GIFT.indexOf(id) > -1) return false;
            if (day.months >= 10 && UNTIL_WALK.indexOf(id) > -1) return false;     // 곧 못 쓰는 것
            return true;
        };
        /* 작을수록 앞. 그날 시기 것 → 오래 쓰는 것 → 다음 시기 것.
           찜한 건 각 칸에서 맨 앞. 선물은 좀 일찍 받아도 괜찮지만 늦으면 못 쓴다 —
           지난 시기 것은 넣지 않는다. */
        var rank = function (t) {
            var f = fav.indexOf(Number(t.id)) > -1;
            if (t.milestone === ms) return f ? 0 : 2;
            if (t.milestone === "all") return f ? 1 : 3;
            if (next && t.milestone === next) return f ? 1 : 4;
            return 9;
        };
        return toys().filter(ok)
            .map(function (t, k) { return { t: t, r: rank(t), k: k }; })
            .filter(function (x) { return x.r < 9; })
            .sort(function (a, b) { return a.r - b.r || a.k - b.k; })
            .slice(0, 5)
            .map(function (x) { return x.t; });
    }

    /* 이름 밑 작은 줄 — 왜 이 자리에 있는지만 (찜 · 오래 씀 · 다음 시기).
       혼자 노는 시간은 오른쪽 칸에 숫자로 (머리글 한 번). 예전엔 '잡고 서기 · 50분' 이라 50분이 뭔지 몰랐다. */
    function subLine(t, ms) {
        var parts = [];
        if (liked().indexOf(Number(t.id)) > -1) parts.push("찜한 것");
        if (t.milestone === "all") parts.push("오래 써요");
        else if (t.milestone !== ms) parts.push((MSNAME[t.milestone] || "") + " 시기부터");
        return parts.join(" · ");
    }

    /* ---------- 카톡 ---------- */
    window.shareGiftList = function () {
        var day = nextDay(), list = picks(day);
        if (!day || !list.length) return;

        /* 받는 분(할머니 · 이모)이 읽는 글이라 '혼자 노는 시간' 같은 숫자는 넣지 않는다.
           ⚠️ 카톡 글 상자(text)는 200자까지다. 주소까지 넣으면 넘쳐서 끝이 잘린다 —
              카톡에는 주소 대신 아래 단추가 있으니 주소는 복사할 때만 붙인다. */
        var head = "🎁 " + nm("의") + " " + day.gift + " 선물, 뭐 사줄까 물어보셨죠?\n\n" +
            "그때쯤이면 " + day.months + "개월이라 이런 게 잘 맞아요.\n\n" +
            list.map(function (t, i) { return (i + 1) + ". " + t.name; }).join("\n");
        var body = head + "\n\n이미 있는 건 빼고 골랐어요. 하나만 골라 주셔도 충분해요 🤍";
        if (body.length > 200) body = head + "\n\n이미 있는 건 빼고 골랐어요.";
        var text = body + "\n👉 " + LINK;

        if (typeof Kakao === "undefined" || !Kakao.isInitialized()) {
            if (navigator.clipboard) {
                navigator.clipboard.writeText(text)
                    .then(function () { window.showToast("목록을 복사했어요. 카톡이나 메모에 붙여 넣어 주세요."); })
                    .catch(function () { window.showCopySheet(text); });
            } else window.showCopySheet(text);
            return;
        }
        Kakao.Share.sendDefault({
            objectType: "text", text: body,
            link: { mobileWebUrl: LINK, webUrl: LINK },
            buttons: [{ title: "장난감 추천 보기", link: { mobileWebUrl: LINK, webUrl: LINK } }]
        });
    };

    /* ---------- 펼치기 ---------- */
    function isOpen() { try { return sessionStorage.getItem(OPEN_KEY) === "1"; } catch (e) { return false; } }
    window.toggleToyGift = function () {
        var open = !isOpen();
        try { sessionStorage.setItem(OPEN_KEY, open ? "1" : "0"); } catch (e) {}
        paint();
        if (!open) {
            var h = document.getElementById(HOST);
            try { if (h && h.getBoundingClientRect().top < 0) h.scrollIntoView({ block: "start" }); } catch (e) {}
        }
    };

    /* ---------- 화면 ---------- */
    function html() {
        var day = nextDay();
        if (!day) return "";

        var list = picks(day);
        var ids = toys().map(function (t) { return Number(t.id); });
        var have = mine().filter(function (id) { return ids.indexOf(id) > -1; });   // 뺀 번호(25)는 세지 않는다
        var plus = isPlus();
        var open = isOpen();
        var show = plus ? list : list.slice(0, 1);

        var out = '<div class="bnh-card">' +
            '<div data-plus-head style="font-size:18px; font-weight:900; color:' + DARK + '; letter-spacing:-0.4px;">' +
                '🎁 뭐 사줄까 물어보면</div>' +
            '<div style="margin-top:5px; font-size:12.5px; font-weight:600; color:' + GRAY + '; line-height:1.7; word-break:keep-all;">' +
                '‘뭐 사줄까?’ 물어보실 때 답할 목록이에요. <b>갖고 계신 건 빼고</b>, 그날 개월수에 맞는 걸로 골랐어요.</div>' +

            '<div style="display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:13px; ' +
                'padding:13px 15px; background:#F2F0FC; border:1px solid #DDD9F5; border-radius:13px;">' +
                '<div style="min-width:0;">' +
                    '<div style="font-size:13.5px; font-weight:900; color:#6A61CE; word-break:keep-all;">' +
                        esc(nm("의")) + ' ' + esc(day.name) + '</div>' +
                    '<div style="margin-top:2px; font-size:11.5px; font-weight:700; color:' + GRAY + ';">' +
                        '그때쯤이면 ' + day.months + '개월 · ' + (MSNAME[day.ms] || "") + ' 시기예요</div>' +
                '</div>' +
                '<div style="flex-shrink:0; font-size:16px; font-weight:900; color:#6A61CE;">' +
                    (day.left === 0 ? "오늘" : "D-" + day.left) + '</div>' +
            '</div>';

        if (!list.length) {
            return out + '<div style="margin-top:13px; font-size:12.5px; font-weight:700; color:' + GRAY + '; line-height:1.7; word-break:keep-all;">' +
                '그날 개월수에 맞는 장난감은 이미 다 갖고 계세요.</div></div>';
        }

        if (!open) {
            return out + '<div role="button" onclick="window.toggleToyGift()" style="margin-top:10px; text-align:center; padding:13px; ' +
                'background:#FFFFFF; border:1px solid ' + LINE + '; border-radius:12px; color:' + SUB + '; font-size:13.5px; font-weight:800; cursor:pointer;">' +
                '선물 목록 보기 ▾</div></div>';
        }

        out += '<div style="margin-top:12px; background:#FBF8F3; border:1px solid #F2EDE6; border-radius:14px; padding:2px 16px;">' +
            '<div style="display:flex; justify-content:flex-end; padding:10px 0 0; font-size:11px; font-weight:800; color:' + GRAY + ';">혼자 노는 시간</div>' +
            show.map(function (t, i) {
                var sub = subLine(t, day.ms);
                return '<div data-gift-row style="display:flex; align-items:flex-start; gap:10px; padding:11px 0;' + (i < show.length - 1 ? ' border-bottom:1px solid #F2EDE6;' : '') + '">' +
                    '<div style="flex-shrink:0; width:20px; height:20px; margin-top:1px; border-radius:6px; background:' + DARK + '; color:#FFFFFF; ' +
                        'font-size:11px; font-weight:900; display:inline-flex; align-items:center; justify-content:center;">' + (i + 1) + '</div>' +
                    '<div style="flex:1; min-width:0;">' +
                        '<div data-gift-name style="font-size:13px; font-weight:800; color:' + DARK + '; line-height:1.5; word-break:keep-all;">' + esc(t.name) + '</div>' +
                        (sub ? '<div style="margin-top:2px; font-size:11.5px; font-weight:700; color:' + GRAY + '; word-break:keep-all;">' + esc(sub) + '</div>' : '') +
                    '</div>' +
                    '<div style="flex-shrink:0; font-size:12px; font-weight:800; color:' + SUB + '; line-height:1.6; white-space:nowrap;">' + esc(playTime(t)) + '</div>' +
                '</div>';
            }).join("") + '</div>';

        if (plus) {
            out += '<div role="button" onclick="window.shareGiftList()" style="margin-top:12px; text-align:center; padding:15px; ' +
                    'background:#FEE500; color:#191919; border-radius:13px; font-size:13.5px; font-weight:900; cursor:pointer;">' +
                    '💬 카톡으로 이 목록 보내기</div>' +
                '<div style="margin-top:9px; font-size:11.5px; font-weight:600; color:' + GRAY + '; line-height:1.7; word-break:keep-all;">' +
                    (have.length
                        ? '등록하신 장난감 ' + have.length + '개는 빼고 골랐어요. '
                        : '<b role="button" onclick="window.openShelfSheet && window.openShelfSheet()" style="color:' + SUB + '; text-decoration:underline; cursor:pointer;">우리 집 장난감</b>에 등록하시면 이미 있는 건 빼고 골라요. ') +
                    '받는 분이 고르기 쉽게 다섯 개까지만 보내요.</div>';
        } else {
            var rest = list.length - show.length;
            out += '<div style="margin-top:12px; background:#FFF9E6; border:1px solid #F5E1A4; border-radius:13px; padding:16px;">' +
                '<div style="font-size:13px; font-weight:900; color:' + GOLD + ';">' +
                    (rest > 0 ? '나머지 ' + rest + '개와 카톡 보내기는 PLUS에서' : '카톡 보내기는 PLUS에서') + '</div>' +
                '<div style="margin-top:5px; font-size:12px; font-weight:600; color:' + GOLD + '; line-height:1.75; word-break:keep-all;">' +
                    '목록을 그대로 카톡으로 보낼 수 있어요. ‘아무거나~’ 대신 목록을 보내면 같은 선물이 겹칠 일이 줄어요.</div></div>';
        }

        out += '<div role="button" onclick="window.toggleToyGift()" style="margin-top:12px; text-align:center; padding:6px; ' +
            'color:' + GRAY + '; font-size:12.5px; font-weight:800; cursor:pointer;">접기 ▴</div>';

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
        var gear = document.getElementById("view-toy-gear");
        if (!gear) return;
        var box = document.createElement("div");
        box.id = HOST;
        var panel = gear.querySelector(".sos-theme-panel");
        if (panel && panel.parentNode === gear) gear.insertBefore(box, panel.nextSibling);
        else gear.insertBefore(box, gear.firstChild);
        paint();
    }

    function boot() {
        setTimeout(function () { mount(); paint(); }, 600);
        setTimeout(function () { mount(); paint(); }, 1700);

        /* 우리 집 장난감을 고치거나 찜을 바꾸면 목록이 바뀐다 */
        ["closeShelfSheet", "switchToyMainTab", "toggleFavorite"].forEach(function (n) {
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
        if (!day) { console.log("띄울 날이 없어요 (생년월일 없음 · 태어나기 전 · 18개월 넘음)"); return; }
        console.log("다가오는 날:", day.name, "D-" + day.left, "· 그때 개월수:", day.months, "(" + MSNAME[day.ms] + ")");
        console.log("갖고 계신 것:", mine().length + "개 (후보에서 뺌) · 찜:", liked().length + "개 (앞으로)");
        picks(day).forEach(function (t, i) {
            console.log("   " + (i + 1) + ". " + t.name + "  [" + MSNAME[t.milestone] + "] " + playTime(t) + " " + subLine(t, day.ms));
        });
        console.log("붙었나:", !!document.getElementById(HOST));
    };
})();
