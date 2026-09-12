/* ============================================================
   배냇함 — 우리의 책장 (bookshelf.js)

   왜 만드는가.

   지금 이 앱에서 기분 좋아지는 순간은 코인 100개뿐이다.
   코인은 종이 색을 바꾸는 데만 쓰이고, 그건 두 번 하면 질린다.
   매일 들어올 이유가 없다.

   책장은 그 자리를 메운다.

     문답 하루 = 책 한 쪽
     100쪽     = 책 한 권
     책 한 권  = 책장에 꽂힌다

   진행률이 매일 조금씩 차오르고, 100일마다 책등이 하나 생긴다.
   그리고 그 책이 그대로 파는 물건이 된다. 셋이 한 번에 된다.

   \u26a0\ufe0f 채우는 건 '둘 다 답한 날' 만 센다.
      혼자 쓴 날까지 세면 책장이 혼자만의 일기가 된다.
      이건 교환일기다. 둘이 마주 본 날만 한 쪽이 된다.

   \u26a0\ufe0f 숫자를 크게 띄우지 않는다.
      "132/500" 같은 건 숙제로 보인다. 책이 보여야 한다.

   diary.html 맨 아래, diarylock.js 앞에 이 한 줄로 불러오세요.
     <script src="bookshelf.js"></script>
   ============================================================ */
(function () {
    'use strict';

    var PER_BOOK = 100;      // 한 권에 들어가는 쪽수
    var SCAN_MAX = 2000;     // 몇 일차까지 찾아볼까 (5년치)

    var INK    = "#3E3A37";
    var INK_S  = "#7A6F68";
    var INK_L  = "#A39D98";
    var GOLD   = "#B98A2E";
    var PAPER  = "#FBF8F3";
    var LINE   = "#EBE3D9";

    /* 책등에 붙는 이름.
       순서대로 읽으면 한 문장이 된다 \u2014 처음, 나란히, 깊어지는, 여전히, 오래.
       부부가 같이 나이 드는 이야기다. 여섯 권부터는 숫자로만 간다. */
    var TITLES = ["처음", "나란히", "깊어지는", "여전히", "오래"];

    /* 책등 색 \u2014 한 칸에 여러 권이 꽂혀도 안 지저분하게 */
    var SPINES = [
        { bg: "#8E7CF0", ink: "#FFFFFF" },
        { bg: "#C9A227", ink: "#FFFFFF" },
        { bg: "#7BA098", ink: "#FFFFFF" },
        { bg: "#D08C7A", ink: "#FFFFFF" },
        { bg: "#6B7FA8", ink: "#FFFFFF" }
    ];

    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    function toast(m) {
        if (typeof window.showToast === "function") window.showToast(m);
    }

    function bookTitle(vol) {
        return TITLES[vol - 1] || (vol + "권");
    }

    function spine(vol) {
        return SPINES[(vol - 1) % SPINES.length];
    }

    /* ----------------------------------------------------------
       1. 몇 쪽이 찼나

       둘 다 답한 날만 센다. 중간에 빠진 날이 있어도
       그 날은 그냥 안 센다. 나중에 채우면 그때 늘어난다.
       ---------------------------------------------------------- */

    function countPages() {
        var done = 0, alone = 0, last = 0;
        for (var i = 1; i <= SCAN_MAX; i++) {
            var raw = null;
            try { raw = localStorage.getItem("day_" + i + "_data"); } catch (e) {}
            if (!raw) continue;
            var d = null;
            try { d = JSON.parse(raw); } catch (e) { continue; }
            if (!d) continue;

            if (d.husbandAns && d.wifeAns) { done++; last = i; }
            else if (d.husbandAns || d.wifeAns) { alone++; }
        }
        return { done: done, alone: alone, last: last };
    }

    /* ----------------------------------------------------------
       2. 화면
       ---------------------------------------------------------- */

    function shelfHTML(st) {
        var full    = Math.floor(st.done / PER_BOOK);        // 완성된 권수
        var inBook  = st.done % PER_BOOK;                     // 지금 권에 찬 쪽수
        var pct     = Math.round((inBook / PER_BOOK) * 100);
        var left    = PER_BOOK - inBook;
        var nextVol = full + 1;

        /* 꽂힌 책들 */
        var books = "";
        for (var v = 1; v <= full; v++) {
            var c = spine(v);
            books +=
            '<div class="bs-spine" data-vol="' + v + '" ' +
                 'style="background:' + c.bg + '; color:' + c.ink + ';">' +
                '<div class="bs-spine-no">' + v + '</div>' +
                '<div class="bs-spine-name">' + esc(bookTitle(v)) + '</div>' +
            '</div>';
        }

        /* 만들어지는 중인 책 \u2014 아래에서 차오른다 */
        books +=
        '<div class="bs-spine bs-making" title="만들어지는 중">' +
            '<div class="bs-fill" style="height:' + pct + '%;"></div>' +
            '<div class="bs-making-in">' +
                '<div class="bs-spine-no">' + nextVol + '</div>' +
                '<div class="bs-spine-name">' + esc(bookTitle(nextVol)) + '</div>' +
            '</div>' +
        '</div>';

        /* 아직 안 온 자리 두 칸 \u2014 "여기도 채워진다" 는 말 */
        books += '<div class="bs-slot"></div><div class="bs-slot"></div>';

        /* 머리말 \u2014 숫자보다 말이 먼저다 */
        var head, sub;
        if (st.done === 0) {
            head = "아직 빈 책장이에요";
            sub  = "둘 다 답한 날이 한 쪽이 됩니다";
        } else if (inBook === 0 && full > 0) {
            head = full + "권 「" + bookTitle(full) + "」 이 방금 꽂혔어요";
            sub  = "다음 권의 첫 쪽이 기다리고 있어요";
        } else if (left <= 5) {
            head = "이번 권이 " + left + "쪽 남았어요";
            sub  = "곧 「" + bookTitle(nextVol) + "」 이 꽂힙니다";
        } else {
            head = full > 0 ? (full + "권까지 꽂혔어요") : "첫 권을 쓰는 중이에요";
            sub  = "「" + bookTitle(nextVol) + "」 까지 " + left + "쪽";
        }

        /* 혼자만 쓴 날이 있으면 조용히 알려준다. 재촉이 아니라 안내다. */
        var aloneLine = st.alone > 0
            ? '<div class="bs-alone">한 사람만 답한 날이 ' + st.alone + '일 있어요 \u00b7 ' +
              '채우면 그날도 한 쪽이 됩니다</div>'
            : '';

        return '' +
        '<div class="bs-wrap">' +
            '<div class="bs-head">' +
                '<div class="bs-eyebrow">우리의 책장</div>' +
                '<div class="bs-title">' + esc(head) + '</div>' +
                '<div class="bs-sub">' + esc(sub) + '</div>' +
            '</div>' +

            '<div class="bs-shelf">' +
                '<div class="bs-books">' + books + '</div>' +
                '<div class="bs-board"></div>' +
            '</div>' +

            aloneLine +

            (full > 0
                ? '<button type="button" class="bs-buy" id="bs-buy">' +
                      '꽂힌 ' + full + '권을 종이책으로' +
                  '</button>'
                : '') +
        '</div>';
    }

    /* ----------------------------------------------------------
       3. 모양
       ---------------------------------------------------------- */

    var CSS = '' +
    '.bs-wrap{margin:0 0 34px;}' +

    '.bs-head{margin-bottom:18px;}' +
    '.bs-eyebrow{font-size:11px;font-weight:700;color:' + INK_L + ';' +
        'letter-spacing:3px;margin-bottom:9px;}' +
    '.bs-title{font-size:18px;font-weight:800;color:' + INK + ';' +
        'letter-spacing:-0.5px;line-height:1.45;word-break:keep-all;}' +
    '.bs-sub{font-size:13px;font-weight:600;color:' + INK_S + ';' +
        'margin-top:7px;word-break:keep-all;}' +

    /* 선반 */
    '.bs-shelf{position:relative;padding:0 2px;}' +
    '.bs-books{display:flex;align-items:flex-end;gap:7px;height:132px;' +
        'overflow-x:auto;overflow-y:hidden;padding:0 2px 0 0;' +
        '-webkit-overflow-scrolling:touch;scrollbar-width:none;}' +
    '.bs-books::-webkit-scrollbar{display:none;}' +
    '.bs-board{height:7px;border-radius:0 0 4px 4px;background:' + LINE + ';' +
        'box-shadow:0 3px 10px rgba(120,100,80,0.16);}' +

    /* 꽂힌 책 */
    '.bs-spine{position:relative;flex:0 0 auto;width:46px;height:118px;' +
        'border-radius:3px 3px 2px 2px;display:flex;flex-direction:column;' +
        'align-items:center;justify-content:flex-end;padding-bottom:12px;' +
        'box-shadow:2px 2px 7px rgba(80,64,48,0.2);overflow:hidden;' +
        'cursor:pointer;transition:transform .18s ease;}' +
    '.bs-spine:active{transform:translateY(-5px);}' +
    '.bs-spine-no{font-family:Georgia,serif;font-size:11px;opacity:0.75;' +
        'margin-bottom:7px;letter-spacing:0.5px;}' +
    '.bs-spine-name{font-size:13px;font-weight:800;letter-spacing:-0.3px;' +
        'writing-mode:vertical-rl;text-orientation:upright;' +
        'line-height:1.15;max-height:66px;overflow:hidden;}' +

    /* 만들어지는 중인 책 \u2014 테두리만 있고 아래에서 찬다 */
    '.bs-making{background:' + PAPER + ';color:' + INK_S + ';' +
        'border:1.5px dashed ' + LINE + ';box-shadow:none;}' +
    '.bs-fill{position:absolute;left:0;right:0;bottom:0;' +
        'background:linear-gradient(180deg,rgba(142,124,240,0.30),rgba(142,124,240,0.16));' +
        'transition:height .5s cubic-bezier(.22,1,.36,1);}' +
    '.bs-making-in{position:relative;display:flex;flex-direction:column;' +
        'align-items:center;justify-content:flex-end;height:100%;' +
        'padding-bottom:12px;box-sizing:border-box;}' +

    /* 빈 자리 */
    '.bs-slot{flex:0 0 auto;width:46px;height:74px;border-radius:3px;' +
        'background:repeating-linear-gradient(135deg,' + PAPER + ' 0 6px,' +
        'rgba(235,227,217,0.55) 6px 12px);opacity:0.55;}' +

    '.bs-alone{margin-top:15px;font-size:12.5px;font-weight:600;' +
        'color:' + INK_L + ';line-height:1.65;word-break:keep-all;}' +

    '.bs-buy{display:block;width:100%;margin-top:18px;padding:15px;' +
        'background:transparent;color:' + GOLD + ';border:1px solid ' + LINE + ';' +
        'border-radius:14px;font-size:13.5px;font-weight:800;' +
        'font-family:inherit;cursor:pointer;}' +

    '@media (prefers-reduced-motion:reduce){' +
        '.bs-fill,.bs-spine{transition:none;}}';

    function injectCSS() {
        if (document.getElementById("bookshelf-css")) return;
        var s = document.createElement("style");
        s.id = "bookshelf-css";
        s.textContent = CSS;
        document.head.appendChild(s);
    }

    /* ----------------------------------------------------------
       4. 책 한 권을 눌렀을 때 \u2014 그 100일만 모아 본다
       ---------------------------------------------------------- */

    function openVolume(vol) {
        var st = countPages();
        var full = Math.floor(st.done / PER_BOOK);
        if (vol > full) return;

        /* 둘 다 답한 날을 순서대로 모은 뒤, 이 권의 몫만 잘라낸다.
           일차 번호가 아니라 '쪽 번호' 로 자른다.
           중간에 빈 날이 있어도 책은 100쪽으로 떨어진다. */
        var pages = [];
        for (var i = 1; i <= SCAN_MAX && pages.length < vol * PER_BOOK; i++) {
            var raw = null;
            try { raw = localStorage.getItem("day_" + i + "_data"); } catch (e) {}
            if (!raw) continue;
            var d = null;
            try { d = JSON.parse(raw); } catch (e) { continue; }
            if (d && d.husbandAns && d.wifeAns) pages.push({ day: i, d: d });
        }
        var mine = pages.slice((vol - 1) * PER_BOOK, vol * PER_BOOK);
        if (!mine.length) return;

        var qDB = window.questionDB || [];
        var baby = window.babyName || "우리 아기";

        var rows = mine.map(function (p) {
            var q = qDB.length ? qDB[(p.day - 1) % qDB.length] : null;
            var qt = q ? String(q.question).replace(/\{babyName\}/g, baby) : "";
            return '<div style="padding:22px 0;border-bottom:1px solid ' + LINE + ';">' +
                '<div style="font-size:11px;font-weight:700;color:' + INK_L + ';' +
                    'letter-spacing:1.5px;margin-bottom:9px;">DAY ' + p.day + '</div>' +
                (qt ? '<div style="font-size:15px;font-weight:800;color:' + INK + ';' +
                    'line-height:1.55;word-break:keep-all;margin-bottom:13px;">' +
                    esc(qt) + '</div>' : '') +
                '<div style="font-size:11px;font-weight:800;color:' + GOLD + ';' +
                    'letter-spacing:2px;margin-bottom:5px;">아빠</div>' +
                '<div style="font-size:14px;color:' + INK_S + ';line-height:1.75;' +
                    'white-space:pre-wrap;word-break:keep-all;margin-bottom:14px;">' +
                    esc(p.d.husbandAns) + '</div>' +
                '<div style="font-size:11px;font-weight:800;color:' + GOLD + ';' +
                    'letter-spacing:2px;margin-bottom:5px;">엄마</div>' +
                '<div style="font-size:14px;color:' + INK_S + ';line-height:1.75;' +
                    'white-space:pre-wrap;word-break:keep-all;">' +
                    esc(p.d.wifeAns) + '</div>' +
            '</div>';
        }).join("");

        var old = document.getElementById("bs-volume");
        if (old) old.remove();

        var wrap = document.createElement("div");
        wrap.id = "bs-volume";
        wrap.setAttribute("style",
            "position:fixed;inset:0;z-index:100005;background:" + PAPER + ";" +
            "overflow-y:auto;-webkit-overflow-scrolling:touch;");

        wrap.innerHTML =
        '<div style="max-width:560px;margin:0 auto;' +
             'padding:calc(20px + env(safe-area-inset-top,0px)) 22px ' +
             'calc(50px + env(safe-area-inset-bottom,0px));">' +

            '<div style="display:flex;justify-content:space-between;' +
                 'align-items:flex-start;margin-bottom:34px;">' +
                '<div>' +
                    '<div style="font-family:Georgia,serif;font-size:11px;' +
                        'color:' + INK_L + ';letter-spacing:3px;margin-bottom:8px;">' +
                        'VOL. ' + vol + '</div>' +
                    '<div style="font-size:27px;font-weight:800;color:' + INK + ';' +
                        'letter-spacing:-1px;">「' + esc(bookTitle(vol)) + '」</div>' +
                    '<div style="font-size:12.5px;font-weight:600;color:' + INK_S + ';' +
                        'margin-top:8px;">' + mine.length + '쪽 \u00b7 ' +
                        'DAY ' + mine[0].day + ' – ' + mine[mine.length - 1].day + '</div>' +
                '</div>' +
                '<span id="bs-vol-close" style="font-size:26px;font-weight:300;' +
                    'color:' + INK_L + ';cursor:pointer;line-height:1;' +
                    'padding:4px 6px;">\u00d7</span>' +
            '</div>' +

            rows +
        '</div>';

        document.body.appendChild(wrap);
        document.body.style.overflow = "hidden";
        wrap.querySelector("#bs-vol-close").addEventListener("click", function () {
            wrap.remove();
            document.body.style.overflow = "";
        });
    }

    /* ----------------------------------------------------------
       5. 붙이기 \u2014 '우리의 책장' 탭 맨 위에
       ---------------------------------------------------------- */

    function paint() {
        var host = document.getElementById("view-read");
        if (!host) return;

        injectCSS();
        var st = countPages();

        var box = document.getElementById("bookshelf-box");
        if (!box) {
            box = document.createElement("div");
            box.id = "bookshelf-box";
            /* 기존 '미리보기' 배너 위에 놓는다. 책장이 먼저 보여야 한다. */
            host.insertBefore(box, host.firstChild);
        }
        box.innerHTML = shelfHTML(st);

        var list = box.querySelectorAll(".bs-spine[data-vol]");
        for (var i = 0; i < list.length; i++) {
            (function (el) {
                el.addEventListener("click", function () {
                    openVolume(Number(el.getAttribute("data-vol")));
                });
            })(list[i]);
        }

        var buy = document.getElementById("bs-buy");
        if (buy) {
            buy.addEventListener("click", function () {
                /* \u26a0\ufe0f 제작 원가를 확정하기 전까지 값을 걸지 않기로 했다.
                      "준비 중" 이라고 정직하게 말하고, 원하는 사람만 남겨둔다. */
                if (typeof window.openPdfPreview === "function") {
                    toast("종이책은 준비 중이에요. 먼저 미리보기로 보여드릴게요");
                    window.openPdfPreview();
                } else {
                    toast("종이책은 준비 중이에요");
                }
            });
        }
    }

    window.refreshBookshelf = paint;

    /* 탭을 '우리의 책장' 으로 옮길 때마다 다시 그린다.
       원래 switchTab 은 건드리지 않고 감싸기만 한다. */
    function hook() {
        var orig = window.switchTab;
        if (typeof orig !== "function" || orig.__shelf) return false;
        var w = function (name) {
            var r = orig.apply(this, arguments);
            if (name === "read") { try { paint(); } catch (e) {} }
            return r;
        };
        w.__shelf = true;
        window.switchTab = w;
        return true;
    }

    function boot() {
        var n = 0;
        var t = setInterval(function () {
            if (hook() || ++n > 40) clearInterval(t);
        }, 200);

        /* 답을 저장하면 쪽수가 늘어난다. 그때도 다시 센다. */
        setTimeout(function () {
            var names = ["submitAnswer", "saveAnswer", "onSubmit"];
            names.forEach(function (nm) {
                var f = window[nm];
                if (typeof f !== "function" || f.__shelf) return;
                var w = async function () {
                    var r = await f.apply(this, arguments);
                    try { paint(); } catch (e) {}
                    return r;
                };
                w.__shelf = true;
                window[nm] = w;
            });
        }, 900);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }

    /* ---------- 점검용 ---------- */
    window.bookshelfDebug = function () {
        var st = countPages();
        console.log("둘 다 답한 날 :", st.done, "쪽");
        console.log("혼자 쓴 날    :", st.alone, "일");
        console.log("꽂힌 책       :", Math.floor(st.done / PER_BOOK), "권");
        console.log("이번 권       :", st.done % PER_BOOK, "/ " + PER_BOOK);
    };
})();