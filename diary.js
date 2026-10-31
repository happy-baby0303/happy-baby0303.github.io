/* ============================================================
   배냇함 — 우리의 문답 (diary.js)

   diary.html 에 부부가 100일 동안 쓴 글이 있다.
   그런데 그게 day_1_data … day_100_data 로 흩어져 있을 뿐,
   배냇함에도 포토북에도 안 올라간다.

   "사춘기 온 아이가 몰래 이 일기장을 읽는다면" 이라고 물어놓고,
   정작 읽을 자리를 안 만들어 뒀다.

   둘 다 답한 문답만 연대기에 올린다. 한쪽만 쓴 건 아직 대화가 아니다.

   index.html 에서 data.js 다음, notes.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    /* ⚠️ 200 이었다. 매일 쓰는 부부는 6개월 반이면 넘고, 그 뒤 문답은 연대기에서 사라졌다.
          diary.html · bookshelf.js 와 같은 2000 으로 맞춘다. */
    var MAX_DAY = 2000;     // day_N 을 이만큼까지 훑는다
    var DAD = "#4F86E0", MOM = "#E0705B";   // 문답 화면(diary.html)과 같은 색 — 아빠 파랑 · 엄마 코랄
    var DAY = 86400000;

    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    function babyName() { return localStorage.getItem("tosil_babyName") || "우리 아기"; }

    /* 서준 + 가 → 서준이가 · 지우 + 가 → 지우가 */
    function callName(j) {
        try { if (typeof window.babyCall === "function") return window.babyCall(j); } catch (e) {}
        var n = babyName(), c = n.charCodeAt(n.length - 1);
        var jong = c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0;
        return n + (jong && n !== "우리 아기" ? "이" : "") + (j || "");
    }

    function keyOf(ts) {
        var d = new Date(ts);
        if (isNaN(d.getTime())) return null;
        return d.getFullYear() + "-" +
               String(d.getMonth() + 1).padStart(2, "0") + "-" +
               String(d.getDate()).padStart(2, "0");
    }

    // questionDB 는 const 라 window 에 안 붙는다. MILESTONE_DATA 와 같은 방식.
    function questions() {
        var q = null;
        try { if (typeof questionDB !== "undefined" && questionDB) q = questionDB; } catch (e) {}
        return q || window.questionDB || [];
    }

    function questionOf(day) {
        var list = questions();
        if (!list.length) return null;
        var it = list[(day - 1) % list.length];
        if (!it) return null;
        return {
            // 조사(서준이가 · 지우가)와 {day} 는 data.js 의 창구가 맞춘다
            text: (typeof window.diaryQuestion === "function")
                ? window.diaryQuestion(day)
                : String(it.question || "").replace(/{babyName}/g, babyName()),
            context: it.context || "",
            category: it.category || ""
        };
    }

    /* ---------- 읽기 ----------
       diary.html 이 이미 date 를 남기고 있어서 그대로 쓴다. -------- */

    var cache = null;

    function scan() {
        if (cache) return cache;
        var out = [];
        for (var day = 1; day <= MAX_DAY; day++) {
            var raw = localStorage.getItem("day_" + day + "_data");
            if (!raw) continue;
            var d;
            try { d = JSON.parse(raw); } catch (e) { continue; }
            if (!d || !d.husbandAns || !d.wifeAns) continue;   // 둘 다 써야 대화다

            var ts = d.date ? Date.parse(d.date) : NaN;
            var key = isNaN(ts) ? null : keyOf(ts);
            if (!key) continue;

            var q = questionOf(day);
            out.push({
                day: day, key: key, ts: ts,
                q: q ? q.text : "",
                context: q ? q.context : "",
                husband: d.husbandAns, wife: d.wifeAns
            });
        }
        out.sort(function (a, b) { return a.ts - b.ts; });
        cache = out;
        return out;
    }

    window.diaryEntries = function () { cache = null; return scan(); };
    window.diaryCount = function () { return scan().length; };

    window.diaryDays = function () {
        var seen = {};
        scan().forEach(function (e) { seen[e.key] = 1; });
        return Object.keys(seen);
    };

    window.diaryOn = function (key) {
        return scan().filter(function (e) { return e.key === key; });
    };

    /* ---------- 배냇함에 그리기 ---------- */

    function side(who, text, tone) {
        return '<div style="margin-top:10px;">' +
            '<div style="font-size:10px; font-weight:800; color:' + tone + '; letter-spacing:1.5px; margin-bottom:5px;">' + esc(who) + '</div>' +
            // user-text — 부부가 쓴 글이다. 이모지 정리(emoji.js)가 손대지 않게 표시한다
            '<div class="user-text" style="font-size:13px; font-weight:500; color:var(--text-s); line-height:1.7; word-break:keep-all; white-space:pre-wrap;">' + esc(text) + '</div>' +
        '</div>';
    }

    window.renderDiaryRow = function (key) {
        var list = window.diaryOn(key);
        if (!list.length) return "";

        return list.map(function (e) {
            return '<div style="background:var(--bg-sub); border-radius:16px; padding:16px 17px; margin-top:14px;">' +
                '<div style="font-size:10px; font-weight:800; color:#7F77DD; letter-spacing:1.8px; margin-bottom:9px;">' +
                    '우리의 문답 ' + e.day + '일차' + (e.context ? '  ·  ' + esc(e.context) : '') + '</div>' +
                '<div class="serif-display" style="font-size:14.5px; font-weight:700; color:var(--text-title); line-height:1.6; word-break:keep-all;">' +
                    esc(e.q) + '</div>' +
                '<div style="height:1px; background:var(--border); margin:13px 0 3px;"></div>' +
                side("아빠", e.husband, DAD) +
                side("엄마", e.wife, MOM) +
            '</div>';
        }).join("");
    };

    /* ---------- 문답함 ---------- */

    window.openDiaryBox = function () {
        var list = scan().slice().reverse();

        var old = document.getElementById("diary-box");
        if (old) old.remove();

        var wrap = document.createElement("div");
        wrap.id = "diary-box";
        wrap.setAttribute("style", "position:fixed; inset:0; z-index:100002; background:var(--bg-main); overflow-y:auto; -webkit-overflow-scrolling:touch;");

        var body = list.length
            ? list.map(function (e) {
                var d = new Date(e.ts);
                return '<div style="background:var(--bg-card); border:1px solid var(--border); border-radius:20px; padding:19px 18px; margin-bottom:11px;">' +
                    '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:11px;">' +
                        '<span style="font-size:10.5px; font-weight:800; color:#7F77DD; letter-spacing:1.8px;">' + e.day + '일차' + (e.context ? '  ·  ' + esc(e.context) : '') + '</span>' +
                        '<span style="font-size:11px; font-weight:700; color:var(--text-sub);">' + (d.getMonth() + 1) + '월 ' + d.getDate() + '일</span>' +
                    '</div>' +
                    '<div class="serif-display" style="font-size:15px; font-weight:700; color:var(--text-title); line-height:1.6; word-break:keep-all;">' + esc(e.q) + '</div>' +
                    '<div style="height:1px; background:var(--border); margin:14px 0 4px;"></div>' +
                    side("아빠", e.husband, DAD) +
                    side("엄마", e.wife, MOM) +
                '</div>';
              }).join("")
            : '<div style="text-align:center; padding:80px 24px; font-family:\'Nanum Pen Script\',cursive; font-size:26px; color:var(--text-sub); line-height:1.6;">' +
                  '아직 둘 다 답한 문답이 없어요<br>한 사람만 쓴 건 아직 대화가 아니니까요' +
              '</div>';

        wrap.innerHTML =
        '<div style="max-width:520px; margin:0 auto; padding:0 20px 60px;">' +
            '<div style="position:sticky; top:0; background:var(--bg-main); padding:22px 0 16px; z-index:2;">' +
                '<div style="display:flex; justify-content:space-between; align-items:flex-start;">' +
                    '<div>' +
                        '<div class="serif-display" style="font-size:23px; font-weight:700; color:var(--text-title); letter-spacing:-0.5px;">우리의 문답</div>' +
                        '<div style="font-size:13px; font-weight:600; color:var(--text-sub); margin-top:6px;">' +
                            (list.length ? esc("문답 " + list.length + "개를 주고받았어요") : "첫 문답을 기다리는 중") + '</div>' +
                    '</div>' +
                    '<div onclick="window.closeDiaryBox()" style="font-size:22px; font-weight:300; color:var(--text-sub); cursor:pointer; padding:2px 8px; line-height:1;">×</div>' +
                '</div>' +
            '</div>' +
            body +
            (list.length ? '<div style="text-align:center; font-size:11.5px; font-weight:600; color:var(--text-sub); margin-top:32px; line-height:1.7;">' +
                esc(callName("가")) + ' 크면 이 대화를 읽게 됩니다<br>그때 우리가 어떤 사이였는지 알게 될 거예요</div>' : "") +
        '</div>';

        document.body.appendChild(wrap);
        document.body.style.overflow = "hidden";
    };

    window.closeDiaryBox = function () {
        var el = document.getElementById("diary-box");
        if (el) el.remove();
        document.body.style.overflow = "";
    };

    /* ---------- 홈 카드: 우리의 문답 ----------
       ⚠️ 문답은 홈의 '부부 문답' 타일 안쪽에만 있어서, 짝꿍이 답을 써도 홈에는 아무 표시가 없었다.
          지금 질문을 홈에 꺼내 두고, 누가 답했는지 · 서로의 답이 열렸는지를 보여 준다.
          ① 내 차례     — 내가 아직 안 쓴 첫 질문 (짝꿍이 먼저 썼으면 그렇다고 알려 준다)
          ② 기다리는 중 — 나는 썼고 짝꿍은 아직
          ③ 열렸어요     — 둘 다 썼고 아직 안 본 날
       ⚠️ 누르면 문답 화면으로 넘어갔다. 한 줄 쓰려고 페이지를 옮기는 게 문턱이었다.
          이제 홈에서 아래 창이 올라와 바로 쓰고, 열리면 그 자리에서 본다.
          저장 · 알림 · 코인은 문답 화면과 같은 곳(qacore.js)이 한다. 두 군데서 따로 하면 언젠가 어긋난다.
          시터(돌봄 화면)에게는 안 보인다. 부부가 쓴 글이다. -------- */

    var QA_ID = "home-qa-card";

    // ⚠️ '1번째 질문' 은 틀린 말이다. 하나일 때만 '첫 번째'
    function nth(n) { return Number(n) === 1 ? "첫 번째" : n + "번째"; }

    function Q() { return window.QA || null; }
    function qaHidden() {
        if (localStorage.getItem("user_role") === "senior") return true;
        if (localStorage.getItem("tosil_role_locked") === "viewer") return true;
        return !!(document.body && document.body.classList.contains("mode-senior"));
    }
    function qaState() {
        var A = Q(), mk = A.myKey();
        if (!mk) return { day: 1, kind: "norole" };
        var yk = A.otherKey(mk), d = A.scan().firstMine;
        var prev = d > 1 ? A.read(d - 1) : null;
        if (prev && prev[mk] && !prev[yk]) return { day: d - 1, kind: "wait", next: d };
        if (prev && prev[mk] && prev[yk] && A.recentOpen(d - 1)) return { day: d - 1, kind: "open", next: d };
        return { day: d, kind: "mine", next: d };
    }

    var CARD_CSS = '' +
        '#home-qa-card .qa-card{background:#FFFDF9;border:1px solid #EFE7DC;border-radius:20px;padding:22px 20px 16px;margin-bottom:16px;}' +
        '#home-qa-card .qa-foot{display:flex;justify-content:space-between;align-items:center;margin-top:12px;}' +
        '#home-qa-card .qa-foot .qa-meta{padding:4px 0;}' +
        '#qa-sheet{position:fixed;inset:0;z-index:100003;background:rgba(43,36,30,0.45);display:flex;align-items:flex-end;' +
            'justify-content:center;opacity:0;transition:opacity .22s;}' +
        '#qa-sheet.show{opacity:1;}' +
        '#qa-sheet .qa-sheet-in{width:100%;max-width:480px;max-height:88vh;overflow-y:auto;-webkit-overflow-scrolling:touch;' +
            'background:#FFFDF9;border-radius:24px 24px 0 0;padding:12px 22px calc(24px + env(safe-area-inset-bottom,0px));' +
            'box-sizing:border-box;transform:translateY(30px);transition:transform .3s cubic-bezier(.2,.8,.2,1);text-align:left;}' +
        '#qa-sheet.show .qa-sheet-in{transform:none;}' +
        '#qa-sheet .qa-grip{width:36px;height:4px;border-radius:4px;background:#E5DDD2;margin:0 auto 18px;}' +
        /* 어두운 화면 — 카드만 앱 색을 따른다 (창은 종이 그대로) */
        'body.dark-mode #home-qa-card .qa-card{background:var(--bg-card);border-color:var(--border);}' +
        'body.dark-mode #home-qa-card .qa-h,body.dark-mode #home-qa-card .qa-q{color:var(--text-m);}' +
        'body.dark-mode #home-qa-card .qa-pill.on{background:var(--bg-sub);border-color:var(--bg-sub);color:var(--text-m);}' +
        'body.dark-mode #home-qa-card .qa-btn.solid{background:#FBF8F3;color:#1E2024;}' +
        'body.dark-mode #home-qa-card .qa-btn.line{background:transparent;border-color:var(--border);color:var(--text-m);}';

    function qaCSS() {
        if (document.getElementById("home-qa-css")) return;
        var s = document.createElement("style");
        s.id = "home-qa-css";
        s.textContent = CARD_CSS;
        document.head.appendChild(s);
    }

    function qaCardHTML(s) {
        var A = Q(), q = A.question(s.day);
        if (!q) return "";
        var go = 'window.openQaSheet(' + s.day + ')';
        if (s.kind === "norole") {
            return '<div class="qa-card"><div class="qa-head"><span class="qa-h">우리의 문답</span></div>' +
                '<div class="qa-q" style="margin-top:14px;">' + esc(q) + '</div>' +
                '<button type="button" class="qa-btn solid" onclick="location.href=\'diary.html\'">시작하기</button></div>';
        }
        var mk = A.myKey(), yk = A.otherKey(mk), d = A.read(s.day), you = A.word(yk);
        var btn, solid = true, note = "";
        if (s.kind === "open") { btn = "💌 서로의 답 보기"; note = you + "가 답해서 서로의 답이 열렸어요"; }
        else if (s.kind === "wait") { btn = you + "의 답을 기다려요"; solid = false; }
        else btn = d[yk] ? you + "는 벌써 답했어요 · 내 답 쓰기" : "내 답 쓰기";

        var bk = A.bookNow();
        var foot = !bk.pages ? "첫 쪽을 기다려요"
                 : bk.inBook ? "「" + bk.title + "」 " + bk.inBook + "쪽"
                 : "「" + A.bookTitle(bk.full) + "」 다 채웠어요";

        return '<div class="qa-card">' +
            '<div class="qa-head"><span class="qa-h">우리의 문답</span><span class="qa-meta">' + nth(s.day) + ' 질문</span></div>' +
            '<div class="qa-q" style="margin-top:14px;cursor:pointer;" onclick="' + go + '">' + esc(q) + '</div>' +
            A.pillsHTML(d) +
            (note ? '<div class="qa-gold" style="text-align:left;margin-top:12px;">' + esc(note) + '</div>' : '') +
            '<button type="button" class="qa-btn ' + (solid ? 'solid' : 'line') + '" onclick="' + go + '">' + esc(btn) + '</button>' +
            '<div class="qa-foot"><span class="qa-meta">' + esc(foot) + '</span>' +
                '<span class="qa-meta" style="cursor:pointer;" onclick="location.href=\'diary.html?tab=read#past\'">지난 문답 보기 ›</span></div>' +
        '</div>';
    }

    /* ---------- 아래에서 올라오는 창 — 홈에서 바로 쓰고 바로 본다 ---------- */
    var sheetDay = 0;
    function sheetEl() { return document.getElementById("qa-sheet"); }

    window.closeQaSheet = function () {
        var w = sheetEl();
        sheetDay = 0;
        if (w) {
            w.classList.remove("show");
            w.id = "qa-sheet-closing";
            setTimeout(function () { if (w.parentNode) w.remove(); }, 230);
        }
        document.body.style.overflow = "";
        qaMount();
    };

    function renderSheet(day, o) {
        o = o || {};
        var A = Q();
        var w = sheetEl();
        if (!w) {
            qaCSS();
            w = document.createElement("div");
            w.id = "qa-sheet";
            w.addEventListener("click", function (e) { if (e.target === w) window.closeQaSheet(); });
            w.innerHTML = '<div class="qa-sheet-in"><div class="qa-grip"></div><div id="qa-sheet-body"></div></div>';
            document.body.appendChild(w);
            document.body.style.overflow = "hidden";
            setTimeout(function () { w.classList.add("show"); }, 10);
        }
        var body = document.getElementById("qa-sheet-body");
        var mk = A.myKey(), d = A.read(day);
        var mode = (!d[mk] || A.editing(day)) ? "form" : "view";
        var same = sheetDay === day && body.getAttribute("data-mode") === mode;
        sheetDay = day;
        /* 쓰는 중에 짝꿍 답이 오면 글칸은 그대로 두고 안내 한 줄만 바꾼다 (쓰던 글이 날아가면 안 된다) */
        if (same && mode === "form" && !o.force) {
            var tmp = document.createElement("div");
            tmp.innerHTML = A.bodyHTML(day, { pills: false });
            var a = document.getElementById("qa-note"), b = tmp.querySelector("#qa-note");
            if (a && b && a.outerHTML !== b.outerHTML) a.outerHTML = b.outerHTML;
            return;
        }
        /* 바뀐 게 없으면 다시 그리지 않는다 — 방금 뜬 '서로의 답이 열렸어요' 가 지워지지 않게 */
        var waiting = !!d[mk] && !d[A.otherKey(mk)];     // 알리기 · 초대하기 칸은 기다릴 때만 있다
        var sig = JSON.stringify([d, A.editing(day), waiting ? [localStorage.getItem(A.K.nudge) === A.today(), A.partnerState()] : 0]);
        if (same && !o.force && body.getAttribute("data-sig") === sig) return;
        var both = !!(d.husbandAns && d.wifeAns);
        var reveal = !!o.reveal || (both && !!d[mk] && A.recentOpen(day));
        if (both && d[mk]) A.markSeen(day);
        body.setAttribute("data-mode", mode);
        body.setAttribute("data-sig", sig);
        body.innerHTML =
            '<div class="qa-meta">' + nth(day) + ' 질문 · 우리의 문답</div>' +
            '<div class="qa-q" style="font-size:20px;margin:8px 0 2px;">' + esc(A.question(day)) + '</div>' +
            A.bodyHTML(day, { pills: false, reveal: reveal });
    }

    window.openQaSheet = function (day) {
        var A = Q();
        /* 엄마인지 아빠인지 아직 모르면 문답 화면에서 먼저 묻는다 */
        if (!A || !A.myKey()) { location.href = "diary.html" + (day ? "?day=" + Number(day) : ""); return; }
        day = Number(day) || A.scan().firstMine;
        renderSheet(day, { force: true });
        A.pull(day).then(function (changed) {
            if (changed && sheetDay === day) renderSheet(day, {});
            if (changed) qaMount();
        });
        A.checkPartner().then(function (s) { if (s && sheetDay === day) renderSheet(day, {}); });
    };

    function qaHost() {
        var A = Q();
        if (!A || A.__homeHost) return;
        A.__homeHost = true;
        A.setHost({
            render: function (day, o) {
                if (sheetEl() && sheetDay === day) renderSheet(day, o);
                qaMount();
            },
            next: function (day) {
                renderSheet(day, { force: true });
                A.pull(day).then(function (changed) { if (changed && sheetDay === day) renderSheet(day, {}); });
                var w = sheetEl();
                if (w) { var inner = w.querySelector(".qa-sheet-in"); if (inner) inner.scrollTop = 0; }
            }
        });
    }

    function qaMount() {
        try {
            var home = document.getElementById("tab-home");
            if (!home || !Q()) return;
            qaCSS();
            qaHost();
            var el = document.getElementById(QA_ID);
            var html = (qaHidden() || !questions().length) ? "" : qaCardHTML(qaState());
            if (!html) { if (el) el.style.display = "none"; return; }
            if (!el) {
                el = document.createElement("div");
                el.id = QA_ID;
                el.className = "hide-on-senior";
                home.appendChild(el);
                if (typeof window.relayoutHome === "function") setTimeout(window.relayoutHome, 30);
            }
            el.style.display = "";
            if (el.innerHTML !== html) el.innerHTML = html;
            qaPull();
        } catch (e) { console.warn("[문답 홈 카드]", e); }
    }
    window.refreshQaCard = qaMount;

    /* 짝꿍 답은 짝꿍 폰에서 서버로만 올라간다. 홈에서는 지금 카드의 그 날 한 칸만 물어본다 (5분에 한 번) */
    var qaAsked = {};
    function qaPull() {
        var A = Q(), s = qaState();
        if (!s || s.kind === "norole") return;
        if (qaAsked[s.day] && Date.now() - qaAsked[s.day] < 5 * 60000) return;
        qaAsked[s.day] = Date.now();
        A.pull(s.day).then(function (changed) { if (changed) qaMount(); });
        A.flush();
    }

    function qaBoot() { setTimeout(qaMount, 2500); }
    document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "visible") setTimeout(qaMount, 400);
    });
    window.addEventListener("pageshow", function () { setTimeout(qaMount, 400); });
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", qaBoot);
    else qaBoot();

    /* ---------- 점검용 ---------- */
    window.diaryDebug = function () {
        var l = window.diaryEntries();
        console.log("둘 다 답한 문답:", l.length + "개");
        console.log("질문 데이터:", questions().length ? questions().length + "문항 로드됨" : "없음 (data.js 를 index.html 에 추가하세요)");
        if (l.length) console.log("가장 최근:", l[l.length - 1].day + "일차 · " + l[l.length - 1].key);
        return l;
    };
})();