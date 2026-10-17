/* ============================================================
   배냇함 — 우리의 책장 (bookshelf.js)

   왜 만드는가.

   지금 이 앱에서 기분 좋아지는 순간은 코인 100개뿐이다.
   코인은 종이 색을 바꾸는 데만 쓰이고, 그건 두 번 하면 질린다.
   매일 들어올 이유가 없다. 책장은 그 자리를 메운다.

     문답 하루 = 책 한 쪽
     100쪽     = 책 한 권
     책 한 권  = 책장에 꽂힌다

   진행률이 매일 조금씩 차오르고, 100쪽마다 책등이 하나 생긴다.

   ⚠️ 채우는 건 '둘 다 답한 날' 만 센다.
      혼자 쓴 날까지 세면 책장이 혼자만의 일기가 된다. 이건 교환일기다.

   ⚠️ 숫자를 크게 띄우지 않는다. "132/500" 같은 건 숙제로 보인다. 책이 보여야 한다.

   ⚠️ 쓰는 중인 책은 눌러도 안 열렸다. 첫 권을 쓰는 사람에겐 그게 책장의 전부다.
      100쪽이 안 찼어도 지금까지 쓴 쪽을 펼쳐 본다.

   그리고 「기다리며」 — 임신 중에 쓴 열 달의 문답(tenmonths.js).
   아이가 태어나면 그 문답이 '엄마 아빠가 너를 기다리며' 쓴 책이 된다.
   둘 다 답한 주가 하나라도 있으면 책장 맨 앞에 꽂힌다.

   diary.html 맨 아래에서 불러온다. (탭을 바꿀 때 diary.html 이 refreshBookshelf 를 부른다)
   ============================================================ */
(function () {
    'use strict';

    var PER_BOOK = 100;      // 한 권에 들어가는 쪽수
    var SCAN_MAX = 2000;     // 몇 번째 질문까지 찾아볼까 (5년치)

    var INK = "#3B322C", SUB = "#8A7F76", MUTE = "#B5AAA0", GOLD = "#B98A2E";
    var PAPER = "#FFFDF9", LINE = "#EFE7DC";
    var SERIF = "'Gowun Batang', 'Noto Serif KR', 'Noto Serif CJK KR', serif";

    /* 책등에 붙는 이름. 순서대로 읽으면 한 문장이 된다 — 처음, 나란히, 깊어지는, 여전히, 오래.
       부부가 같이 나이 드는 이야기다. 여섯 권부터는 숫자로만 간다. */
    var TITLES = ["처음", "나란히", "깊어지는", "여전히", "오래"];

    var SPINES = [
        { bg: "#8E7CF0", ink: "#FFFFFF" },
        { bg: "#C9A227", ink: "#FFFFFF" },
        { bg: "#7BA098", ink: "#FFFFFF" },
        { bg: "#D08C7A", ink: "#FFFFFF" },
        { bg: "#6B7FA8", ink: "#FFFFFF" }
    ];
    var WAIT_SPINE = { bg: "#A98C6E", ink: "#FFFFFF" };   // 「기다리며」 — 흙빛

    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    /* 「처음」이 · 「나란히」가 — 받침에 맞춰 */
    function ig(w) {
        var s = String(w || ""), c = s.charCodeAt(s.length - 1);
        return (c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0) ? "이" : "가";
    }
    function bookTitle(vol) { return TITLES[vol - 1] || (vol + "권"); }
    function spine(vol) { return SPINES[(vol - 1) % SPINES.length]; }
    function md(iso) {
        var t = typeof iso === "number" ? iso : Date.parse(iso || "");
        if (isNaN(t) || !t) return "";
        var d = new Date(t);
        return (d.getMonth() + 1) + "월 " + d.getDate() + "일";
    }

    /* ----------------------------------------------------------
       1. 몇 쪽이 찼나 — 둘 다 답한 날만 센다
       ---------------------------------------------------------- */
    function countPages() {
        var days = [], alone = 0;
        for (var i = 1; i <= SCAN_MAX; i++) {
            var raw = null;
            try { raw = localStorage.getItem("day_" + i + "_data"); } catch (e) {}
            if (!raw) continue;
            var d = null;
            try { d = JSON.parse(raw); } catch (e) { continue; }
            if (!d) continue;
            if (d.husbandAns && d.wifeAns) days.push(i);
            else if (d.husbandAns || d.wifeAns) alone++;
        }
        return { done: days.length, alone: alone, days: days };
    }

    /* 열 달의 문답 — 둘 다 쓴 주만 (tosil_preg_qa = { "24": { mom:{t,at}, dad:{t,at} } }) */
    function waitPages() {
        var qa = {};
        try { qa = JSON.parse(localStorage.getItem("tosil_preg_qa")) || {}; } catch (e) { qa = {}; }
        var Q = window.tenMonthsQuestions || [];
        return Object.keys(qa).map(Number).filter(function (w) { return w >= 1 && w <= 40; })
            .sort(function (a, b) { return a - b; })
            .map(function (w) { return { wk: w, e: qa[w] || {}, q: Q[w - 1] || "" }; })
            .filter(function (p) { return p.e.mom && p.e.mom.t && p.e.dad && p.e.dad.t; });
    }

    /* ----------------------------------------------------------
       2. 화면
       ---------------------------------------------------------- */
    function shelfHTML(st, wait) {
        var full = Math.floor(st.done / PER_BOOK);      // 다 찬 권수
        var inBook = st.done % PER_BOOK;                 // 지금 권에 찬 쪽수
        var pct = Math.round((inBook / PER_BOOK) * 100);
        var left = PER_BOOK - inBook;
        var nextVol = full + 1;

        var books = "";
        if (wait.length) {
            books += '<button type="button" class="bs-spine" data-vol="wait" aria-label="열 달의 문답 「기다리며」 펼치기" ' +
                'style="background:' + WAIT_SPINE.bg + '; color:' + WAIT_SPINE.ink + ';">' +
                '<span class="bs-spine-no">열 달</span><span class="bs-spine-name">기다리며</span></button>';
        }
        for (var v = 1; v <= full; v++) {
            var c = spine(v);
            books += '<button type="button" class="bs-spine" data-vol="' + v + '" aria-label="' + v + '권 「' + esc(bookTitle(v)) + '」 펼치기" ' +
                'style="background:' + c.bg + '; color:' + c.ink + ';">' +
                '<span class="bs-spine-no">' + v + '</span><span class="bs-spine-name">' + esc(bookTitle(v)) + '</span></button>';
        }
        /* 쓰는 중인 책 — 아래에서 차오른다. 한 쪽이라도 있으면 펼쳐진다 */
        books += '<button type="button" class="bs-spine bs-making"' + (inBook ? ' data-vol="making"' : '') +
            ' aria-label="쓰는 중인 책">' +
            '<span class="bs-fill" style="height:' + pct + '%;"></span>' +
            '<span class="bs-making-in"><span class="bs-spine-no">' + nextVol + '</span>' +
            '<span class="bs-spine-name">' + esc(bookTitle(nextVol)) + '</span></span></button>';
        /* 아직 안 온 자리 두 칸 — "여기도 채워진다" */
        books += '<span class="bs-slot"></span><span class="bs-slot"></span>';

        /* 머리말 — 숫자보다 말이 먼저다 */
        var head, sub, canOpen = st.done > 0 || wait.length > 0;
        if (st.done === 0) {
            /* "아직 빈 책장이에요" 는 사실이지만 힘이 빠지는 말이다. 시작되는 중이라고 말한다. */
            head = "첫 쪽을 기다리는 중이에요";
            sub = "둘 다 답한 날이 한 쪽이 돼요" + (wait.length ? " · 「기다리며」를 누르면 펼쳐져요" : "");
        } else if (inBook === 0) {
            head = full + "권 「" + bookTitle(full) + "」" + ig(bookTitle(full)) + " 방금 꽂혔어요";
            sub = "다음 권의 첫 쪽이 기다리고 있어요";
        } else if (left <= 5) {
            head = "이번 권이 " + left + "쪽 남았어요";
            sub = "곧 「" + bookTitle(nextVol) + "」" + ig(bookTitle(nextVol)) + " 꽂혀요 · 책을 누르면 펼쳐져요";
        } else {
            /* ⚠️ "「처음」까지 98쪽" 이 먼저 눈에 들어왔다. 두 쪽 쓴 사람에게 98쪽은 막막한 숫자다.
                  채운 걸 먼저 말한다. 남은 건 말하지 않는다. */
            head = full > 0 ? (full + "권 하고 " + inBook + "쪽") : (inBook + "쪽을 썼어요");
            sub = "한 쪽씩 「" + bookTitle(nextVol) + "」" + ig(bookTitle(nextVol)) + " 되어 가요" + (canOpen ? " · 책을 누르면 펼쳐져요" : "");
        }

        /* 혼자만 쓴 날이 있으면 조용히 알려준다. 재촉이 아니라 안내다. */
        var aloneLine = st.alone > 0
            ? '<div class="bs-alone">한 사람만 답한 날이 ' + st.alone + '일 있어요 · 마저 채우면 그날도 한 쪽이 돼요</div>' : '';

        return '<div class="bs-wrap">' +
                '<div class="bs-head"><div class="bs-title">' + esc(head) + '</div><div class="bs-sub">' + esc(sub) + '</div></div>' +
                '<div class="bs-shelf"><div class="bs-books">' + books + '</div><div class="bs-board"></div></div>' +
                aloneLine +
            '</div>';
    }

    var CSS = '' +
        '.bs-wrap{margin:2px 0 26px;}' +
        '.bs-head{margin-bottom:22px;}' +
        '.bs-title{font-family:' + SERIF + ';font-size:21px;font-weight:700;color:' + INK + ';letter-spacing:-0.5px;line-height:1.45;word-break:keep-all;}' +
        '.bs-sub{font-size:12.5px;font-weight:600;color:' + SUB + ';margin-top:6px;line-height:1.6;word-break:keep-all;}' +
        '.bs-shelf{position:relative;padding:0 2px;}' +
        '.bs-books{display:flex;align-items:flex-end;gap:7px;height:132px;overflow-x:auto;overflow-y:hidden;padding:0 2px 0 0;' +
            '-webkit-overflow-scrolling:touch;scrollbar-width:none;}' +
        '.bs-books::-webkit-scrollbar{display:none;}' +
        /* 선반 — 책이 아직 없을 땐 선반이 화면의 전부다. 나뭇결처럼 두껍게 */
        '.bs-board{height:11px;border-radius:0 0 5px 5px;background:linear-gradient(180deg,#D9CBB8,#BFAE99);' +
            'box-shadow:0 5px 14px rgba(120,100,80,0.22);}' +
        '.bs-spine{position:relative;flex:0 0 auto;width:46px;height:118px;border:none;padding:0 0 12px;margin:0;' +
            'border-radius:3px 3px 2px 2px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;' +
            'box-shadow:2px 2px 7px rgba(80,64,48,0.2);overflow:hidden;cursor:pointer;font-family:inherit;' +
            'transition:transform .18s ease;-webkit-tap-highlight-color:transparent;}' +
        '.bs-spine:active{transform:translateY(-5px);}' +
        '.bs-spine-no{font-family:' + SERIF + ';font-size:11px;opacity:0.8;margin-bottom:7px;letter-spacing:0.5px;}' +
        '.bs-spine-name{font-family:' + SERIF + ';font-size:13.5px;font-weight:700;letter-spacing:-0.3px;' +
            'writing-mode:vertical-rl;text-orientation:upright;line-height:1.15;max-height:66px;overflow:hidden;}' +
        /* 쓰는 중인 책 — 실선으로 세우고, 찬 만큼 보라가 차오른다 */
        '.bs-making{background:#FFFFFF;color:' + SUB + ';border:1.5px solid rgba(142,124,240,0.45);' +
            'box-shadow:2px 2px 7px rgba(80,64,48,0.12);padding:0;}' +
        '.bs-making:not([data-vol]){cursor:default;}' +
        '.bs-making:not([data-vol]):active{transform:none;}' +
        '.bs-fill{position:absolute;left:0;right:0;bottom:0;min-height:5px;' +
            'background:linear-gradient(180deg,rgba(142,124,240,0.55),rgba(142,124,240,0.30));' +
            'transition:height .5s cubic-bezier(.22,1,.36,1);}' +
        '.bs-making-in{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;' +
            'height:100%;padding-bottom:12px;box-sizing:border-box;}' +
        /* 빈 자리 — 앞으로 꽂힐 자리라 조용한 그림자로만 */
        '.bs-slot{flex:0 0 auto;width:46px;height:62px;border-radius:3px;background:rgba(191,174,153,0.10);' +
            'border:1px solid rgba(191,174,153,0.18);opacity:0.8;}' +
        '.bs-alone{margin-top:16px;font-size:12.5px;font-weight:600;color:' + SUB + ';line-height:1.65;word-break:keep-all;}' +
        '@media (prefers-reduced-motion:reduce){.bs-fill,.bs-spine{transition:none;}}';

    function injectCSS() {
        if (document.getElementById("bookshelf-css")) return;
        var s = document.createElement("style");
        s.id = "bookshelf-css";
        s.textContent = CSS;
        document.head.appendChild(s);
    }

    /* ----------------------------------------------------------
       3. 책을 펼친다 — 다 찬 권 · 쓰는 중인 권 · 「기다리며」
       ---------------------------------------------------------- */
    function question(day) {
        return (typeof window.diaryQuestion === "function") ? window.diaryQuestion(day) : "";
    }
    function entryHTML(meta, q, mom, dad) {
        return '<div style="padding:24px 0 22px;border-bottom:1px solid ' + LINE + ';">' +
            '<div style="font-size:12px;font-weight:600;color:' + SUB + ';margin-bottom:9px;">' + esc(meta) + '</div>' +
            (q ? '<div style="font-family:' + SERIF + ';font-size:17.5px;font-weight:700;color:' + INK + ';line-height:1.6;' +
                 'word-break:keep-all;margin-bottom:14px;">' + esc(q) + '</div>' : '') +
            '<div style="font-size:12px;font-weight:700;color:' + GOLD + ';margin-bottom:5px;">엄마</div>' +
            '<div class="user-text" style="font-size:14.5px;color:' + INK + ';line-height:1.8;white-space:pre-wrap;word-break:keep-all;margin-bottom:14px;">' + esc(mom) + '</div>' +
            '<div style="font-size:12px;font-weight:700;color:' + GOLD + ';margin-bottom:5px;">아빠</div>' +
            '<div class="user-text" style="font-size:14.5px;color:' + INK + ';line-height:1.8;white-space:pre-wrap;word-break:keep-all;">' + esc(dad) + '</div>' +
        '</div>';
    }

    function openVolume(vol) {
        var st = countPages(), full = Math.floor(st.done / PER_BOOK);
        var eyebrow, title, meta, rows = "";

        if (vol === "wait") {
            var w = waitPages();
            if (!w.length) return;
            eyebrow = "열 달의 문답";
            title = "기다리며";
            meta = "엄마 아빠가 너를 기다리며 쓴 " + w.length + "쪽";
            rows = w.map(function (p) {
                var at = Math.max(Number(p.e.mom.at || 0), Number(p.e.dad.at || 0));
                return entryHTML(p.wk + "주" + (md(at) ? " · " + md(at) : ""), p.q, p.e.mom.t, p.e.dad.t);
            }).join("");
        } else {
            var making = (vol === "making");
            var n = making ? full + 1 : Number(vol);
            if (!making && n > full) return;
            /* 일차 번호가 아니라 '쪽 번호' 로 자른다. 중간에 빈 날이 있어도 책은 100쪽으로 떨어진다 */
            var mine = st.days.slice((n - 1) * PER_BOOK, n * PER_BOOK);
            if (!mine.length) return;
            eyebrow = n + "권" + (making ? " · 쓰는 중" : "");
            title = bookTitle(n);
            meta = (making ? "지금까지 " : "") + mine.length + "쪽 · " + mine[0] + "–" + mine[mine.length - 1] + "번째 질문" +
                   (making ? "<br>100쪽이 차면 책장에 꽂혀요" : "");
            rows = mine.map(function (day) {
                var d = {};
                try { d = JSON.parse(localStorage.getItem("day_" + day + "_data")) || {}; } catch (e) {}
                return entryHTML(day + "번째 질문" + (md(d.date) ? " · " + md(d.date) : ""), question(day), d.wifeAns, d.husbandAns);
            }).join("");
        }

        var old = document.getElementById("bs-volume");
        if (old) old.remove();
        var wrap = document.createElement("div");
        wrap.id = "bs-volume";
        wrap.setAttribute("style", "position:fixed;inset:0;z-index:9200;background:" + PAPER + ";" +
            "overflow-y:auto;-webkit-overflow-scrolling:touch;animation:fade .25s ease-out;");
        wrap.innerHTML =
            '<div style="max-width:560px;margin:0 auto;padding:calc(18px + env(safe-area-inset-top,0px)) 22px calc(50px + env(safe-area-inset-bottom,0px));">' +
                '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:12px;">' +
                    '<div>' +
                        '<div style="font-size:12px;font-weight:600;color:' + SUB + ';margin-bottom:10px;">' + esc(eyebrow) + '</div>' +
                        '<div style="font-family:' + SERIF + ';font-size:28px;font-weight:700;color:' + INK + ';letter-spacing:-1px;">「' + esc(title) + '」</div>' +
                        '<div style="font-size:12.5px;font-weight:600;color:' + SUB + ';margin-top:10px;line-height:1.65;">' + meta + '</div>' +
                    '</div>' +
                    '<button type="button" id="bs-vol-close" aria-label="닫기" style="background:none;border:none;width:40px;height:40px;' +
                        'display:flex;align-items:center;justify-content:center;color:' + MUTE + ';cursor:pointer;flex-shrink:0;">' +
                        '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
                    '</button>' +
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
       4. 붙이기 — '우리의 책장' 탭 맨 위에
       ---------------------------------------------------------- */
    function paint() {
        var host = document.getElementById("view-read");
        if (!host) return;
        injectCSS();
        var box = document.getElementById("bookshelf-box");
        if (!box) {
            box = document.createElement("div");
            box.id = "bookshelf-box";
            host.insertBefore(box, host.firstChild);
        }
        box.innerHTML = shelfHTML(countPages(), waitPages());
        var list = box.querySelectorAll(".bs-spine[data-vol]");
        for (var i = 0; i < list.length; i++) {
            (function (el) {
                el.addEventListener("click", function () {
                    var v = el.getAttribute("data-vol");
                    openVolume(v === "wait" || v === "making" ? v : Number(v));
                });
            })(list[i]);
        }
    }

    window.refreshBookshelf = paint;
    window.openBookVolume = openVolume;
    /* 종이책 알림 신청(paperbook.js)이 몇 쪽까지 썼는지 같이 남긴다 — 열었을 때 '누구부터' 연락할지 정하는 기준 */
    window.bookshelfPages = function () { return countPages().done; };

    /* 답을 저장하면 쪽수가 늘어난다. 그때도 다시 센다 */
    window.addEventListener("diary:saved", function () {
        var v = document.getElementById("view-read");
        if (v && v.classList.contains("on")) { try { paint(); } catch (e) {} }
    });

    /* ---------- 점검용 ---------- */
    window.bookshelfDebug = function () {
        var st = countPages();
        console.log("둘 다 답한 날 :", st.done, "쪽");
        console.log("혼자 쓴 날    :", st.alone, "일");
        console.log("꽂힌 책       :", Math.floor(st.done / PER_BOOK), "권");
        console.log("이번 권       :", st.done % PER_BOOK, "/ " + PER_BOOK);
        console.log("「기다리며」  :", waitPages().length, "쪽");
    };
})();
