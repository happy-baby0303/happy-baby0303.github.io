/* ============================================================
   배냇함 — 우리 집 장난감 (myshelf.js)

   놀이 처방전이 매일 "이거 사세요" 를 하고 있었다.
   그러면 처방전이 아니라 주 7회 광고다.

   방향을 뒤집는다.

       지금    "이 놀이 하려면 이걸 사세요"
       바뀔 것 "이미 사두신 그거, 이번 주에 이렇게 쓰세요"

   부모는 산 장난감을 다 못 쓴다. 절반은 창고에 있다.
   그걸 다시 꺼내 쓰게 하는 건 파는 것보다 고마운 일이고,
   파는 앱은 절대 안 하는 일이다.

   그리고 이건 중복 구매도 막는다.
   장난감 목록에 '이미 갖고 계세요' 가 뜨면 두 번 안 산다.

   ⚠️ 등록은 무료다. PLUS 는 '일주일치를 짜주는 수고' 뿐이다.

   index.html 에서 app.js 다음, playweek.js 앞에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var KEY = "tosil_my_toys";
    var BLUE = "#3182F6", GRAY = "#8B95A1", DARK = "#191F28", GREEN = "#1F9D6B";
    var ID = "my-shelf", SHEET = "shelf-sheet";

    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    function toys() {
        try { if (typeof toyData !== "undefined" && toyData) return toyData; } catch (e) {}
        return window.toyData || [];
    }

    function owned() {
        try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; }
    }
    function save(list) {
        try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
    }

    window.hasToy = function (id) { return owned().indexOf(Number(id)) > -1; };
    window.myToyIds = owned;

    /* ---------- 고르는 창 ---------- */

    var MS = { newborn: "신생아", tummy: "터미타임", flip: "뒤집기", crawl: "배밀이", stand: "잡고서기", all: "전체" };
    var ORDER = ["newborn", "tummy", "flip", "crawl", "stand", "all"];

    window.toggleMyToy = function (id) {
        var list = owned(), i = list.indexOf(Number(id));
        if (i > -1) list.splice(i, 1); else list.push(Number(id));
        save(list);
        paintSheet();
    };

    window.openShelfSheet = function () {
        var old = document.getElementById(SHEET);
        if (old) old.remove();
        var wrap = document.createElement("div");
        wrap.id = SHEET;
        wrap.setAttribute("style",
            "position:fixed; inset:0; z-index:100020; background:#FFFFFF; " +
            "overflow-y:auto; -webkit-overflow-scrolling:touch;");
        document.body.appendChild(wrap);
        paintSheet();
    };

    window.closeShelfSheet = function () {
        var el = document.getElementById(SHEET);
        if (el) el.remove();
        paint();
        if (typeof window.refreshPlayWeek === "function") window.refreshPlayWeek();
        markToyCards();
    };

    function paintSheet() {
        var wrap = document.getElementById(SHEET);
        if (!wrap) return;
        var have = owned();
        var all = toys();

        var groups = ORDER.map(function (ms) {
            var g = all.filter(function (t) { return t.milestone === ms; });
            if (!g.length) return "";
            return '<div style="margin-bottom:18px;">' +
                '<div style="font-size:12px; font-weight:900; color:' + GRAY + '; ' +
                    'letter-spacing:1px; margin-bottom:9px;">' + MS[ms] + '</div>' +
                '<div style="display:flex; flex-wrap:wrap; gap:7px;">' +
                g.map(function (t) {
                    var on = have.indexOf(t.id) > -1;
                    return '<div onclick="window.toggleMyToy(' + t.id + ')" ' +
                        'style="padding:9px 12px; border-radius:11px; cursor:pointer; ' +
                        'font-size:12.5px; font-weight:800; ' +
                        (on ? 'background:' + GREEN + '; color:#FFFFFF; border:1px solid ' + GREEN + ';'
                            : 'background:#F9FAFB; color:#4E5968; border:1px solid #E5E8EB;') + '">' +
                        (on ? "✓ " : "") + esc(t.name) + '</div>';
                }).join("") +
                '</div></div>';
        }).join("");

        wrap.innerHTML =
        '<div style="max-width:480px; margin:0 auto; padding:20px 20px 120px;">' +
            '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">' +
                '<div style="font-size:18px; font-weight:900; color:' + DARK + ';">🧸 우리 집 육아템</div>' +
                '<span onclick="window.closeShelfSheet()" style="font-size:24px; font-weight:300; ' +
                    'color:' + GRAY + '; cursor:pointer; line-height:1; padding:0 4px;">×</span>' +
            '</div>' +
            '<div style="font-size:13px; font-weight:600; color:' + GRAY + '; ' +
                'line-height:1.7; margin-bottom:20px; word-break:keep-all;">' +
                '장난감뿐 아니라 <b>목욕·위생 용품</b>도 있어요. 갖고 계신 걸 눌러주세요.<br>' +
                '이미 있는 걸로 놀이를 짜드리고, 목록에도 표시해서 <b>두 번 사지 않게</b> 해드립니다.</div>' +
            groups +
        '</div>' +

        '<div style="position:fixed; left:0; right:0; bottom:0; background:#FFFFFF; ' +
            'border-top:1px solid #E5E8EB; padding:14px 20px calc(14px + env(safe-area-inset-bottom, 0px));">' +
            '<div style="max-width:480px; margin:0 auto;">' +
                '<div onclick="window.closeShelfSheet()" style="text-align:center; padding:17px; ' +
                    'background:' + DARK + '; color:#FFFFFF; border-radius:14px; ' +
                    'font-size:15.5px; font-weight:900; cursor:pointer;">' +
                    have.length + '개 골랐어요 · 다 됐습니다</div>' +
            '</div>' +
        '</div>';
    }

    /* ---------- 놀이 탭 위의 요약 줄 ---------- */

    function html() {
        var have = owned();
        if (!have.length) {
            return '<div id="' + ID + '" onclick="window.openShelfSheet()" ' +
                'style="display:flex; align-items:center; gap:12px; background:#FFFFFF; ' +
                'border:1px solid #E5E8EB; border-radius:16px; padding:15px 16px; ' +
                'margin-bottom:14px; cursor:pointer;">' +
                '<div style="font-size:21px; flex-shrink:0;">🧸</div>' +
                '<div style="flex:1; min-width:0;">' +
                    '<div style="font-size:14px; font-weight:900; color:' + DARK + ';">' +
                        '우리 집에 있는 장난감 알려주세요</div>' +
                    '<div style="font-size:11.5px; font-weight:700; color:' + GRAY + '; ' +
                        'margin-top:3px; word-break:keep-all;">' +
                        '이미 있는 걸로 놀이를 짜드리고, 두 번 사지 않게 표시해드려요</div>' +
                '</div>' +
                '<div style="font-size:12px; color:' + BLUE + '; flex-shrink:0;">〉</div>' +
            '</div>';
        }

        var names = toys().filter(function (t) { return have.indexOf(t.id) > -1; })
                          .slice(0, 4).map(function (t) { return t.name; });

        return '<div id="' + ID + '" onclick="window.openShelfSheet()" ' +
            'style="background:#EAF7F1; border:1px solid #A7DFC8; border-radius:16px; ' +
            'padding:14px 16px; margin-bottom:14px; cursor:pointer;">' +
            '<div style="display:flex; align-items:center; gap:10px;">' +
                '<div style="font-size:19px; flex-shrink:0;">🧸</div>' +
                '<div style="flex:1; min-width:0;">' +
                    '<div style="font-size:13.5px; font-weight:900; color:#1F6F52;">' +
                        '우리 집 장난감 ' + have.length + '개</div>' +
                    '<div style="font-size:11px; font-weight:700; color:#4E5968; margin-top:2px; ' +
                        'white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' +
                        esc(names.join(" · ")) + (have.length > 4 ? " 외 " + (have.length - 4) + "개" : "") + '</div>' +
                '</div>' +
                '<div style="font-size:11.5px; font-weight:800; color:#1F6F52; flex-shrink:0;">고치기</div>' +
            '</div>' +
        '</div>';
    }

    function paint() {
        var el = document.getElementById(ID);
        if (!el) return;
        var box = document.createElement("div");
        box.innerHTML = html();
        el.parentNode.replaceChild(box.firstChild, el);
    }

    function mount() {
        if (document.getElementById(ID)) return;
        var host = document.getElementById("view-toy-play");
        if (!host) return;
        var box = document.createElement("div");
        box.innerHTML = html();
        host.insertBefore(box.firstChild, host.firstChild);
    }

    /* ---------- 장난감 목록에 '이미 있어요' ----------
       중복 구매를 막는 게 이 기능의 절반이다.
       카드에 id="toy-card-N" 이 붙어 있어서 그걸로 찾는다. -------- */

    function markToyCards() {
        var have = owned();
        toys().forEach(function (t) {
            var card = document.getElementById("toy-card-" + t.id);
            if (!card) return;
            var old = card.querySelector(".shelf-mark");
            if (old) old.parentNode.removeChild(old);
            if (have.indexOf(t.id) === -1) return;

            var tag = document.createElement("div");
            tag.className = "shelf-mark";
            tag.style.cssText =
                "background:#EAF7F1; border:1px solid #A7DFC8; border-radius:11px; " +
                "padding:11px 14px; margin-bottom:12px; font-size:12.5px; font-weight:800; " +
                "color:#1F6F52; line-height:1.6;";
            tag.innerHTML = "✓ <b>이미 갖고 계세요.</b> 또 사지 마세요.";
            card.insertBefore(tag, card.firstChild);
        });
    }
    window.refreshShelfMarks = markToyCards;

    /* ---------- 시작 ---------- */

    function boot() {
        setTimeout(function () { mount(); markToyCards(); }, 300);
        setTimeout(function () { mount(); markToyCards(); }, 1200);

        ["updateToyView", "renderFavorites", "switchToyMainTab"].forEach(function (n) {
            var f = window[n];
            if (typeof f !== "function" || f.__shelf) return;
            var w = function () { var o = f.apply(this, arguments); setTimeout(markToyCards, 80); return o; };
            w.__shelf = true;
            window[n] = w;
        });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    window.shelfDebug = function () {
        var have = owned();
        console.log("등록한 장난감:", have.length + "개");
        toys().filter(function (t) { return have.indexOf(t.id) > -1; })
              .forEach(function (t) { console.log("   ✓ " + t.name); });
        console.log("전체 장난감:", toys().length + "개");
        console.log("목록에 표시된 카드:", document.querySelectorAll(".shelf-mark").length + "개");
    };
})();