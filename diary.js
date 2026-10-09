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
                            (list.length ? esc(list.length + "개의 대화가 오갔어요") : "첫 대화를 기다리는 중") + '</div>' +
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
          열 달의 문답처럼 지금 질문을 홈에 꺼내 두고, 누가 답했는지 · 서로의 답이 열렸는지를 보여 준다.
          ① 내 차례     — 내가 아직 안 쓴 첫 질문 (짝꿍이 먼저 썼으면 그렇다고 알려 준다)
          ② 기다리는 중 — 나는 썼고 짝꿍은 아직. 다음 질문을 먼저 써도 된다
          ③ 열렸어요     — 둘 다 썼고 아직 안 본 날
          시터(돌봄 화면)에게는 안 보인다. 부부가 쓴 글이다. -------- */

    var QA_ID = "home-qa-card", QA_SEEN = "tosil_qa_seen_day";

    function qaRole() {
        var r = localStorage.getItem("user_role");
        if (r === "dad") return "husbandAns";
        if (r === "mom") return "wifeAns";
        return localStorage.getItem("tosil_userRole") === "husband" ? "husbandAns" : "wifeAns";
    }
    function qaRead(day) {
        try { return JSON.parse(localStorage.getItem("day_" + day + "_data")) || {}; } catch (e) { return {}; }
    }
    function qaHidden() {
        if (localStorage.getItem("user_role") === "senior") return true;
        if (localStorage.getItem("tosil_role_locked") === "viewer") return true;
        return !!(document.body && document.body.classList.contains("mode-senior"));
    }
    function qaState() {
        var mine = qaRole(), yours = mine === "husbandAns" ? "wifeAns" : "husbandAns";
        var d = 1;
        while (d < MAX_DAY && qaRead(d)[mine]) d++;
        var prev = d > 1 ? qaRead(d - 1) : null;
        var seen = Number(localStorage.getItem(QA_SEEN) || 0);
        if (prev && prev[mine] && !prev[yours]) return { day: d - 1, kind: "wait", data: prev, mine: mine, yours: yours, next: d };
        if (prev && prev[mine] && prev[yours] && seen !== d - 1) return { day: d - 1, kind: "open", data: prev, mine: mine, yours: yours, next: d };
        return { day: d, kind: "mine", data: qaRead(d), mine: mine, yours: yours, next: d };
    }

    function qaPill(on, label) {
        return '<span style="font-size:12px; font-weight:800; padding:5px 11px; border-radius:999px; ' +
            (on ? 'background:#F0EEFB; color:#7F77DD;' : 'border:1px dashed var(--border); color:var(--text-sub);') + '">' +
            (on ? '✓ ' : '') + label + '</span>';
    }

    function qaCardHTML(s) {
        var q = questionOf(s.day);
        if (!q || !q.text) return "";
        var you = s.yours === "husbandAns" ? "아빠" : "엄마";
        var head, note = "", cta, go = s.day, open = false, solid = true;
        if (s.kind === "open") {
            head = "서로의 답이 열렸어요"; cta = "💌 서로의 답 보기"; open = true;
        } else if (s.kind === "wait") {
            head = "우리의 문답"; note = you + "가 답하면 서로의 답이 열려요. 열리면 알려 드릴게요.";
            cta = "다음 질문 먼저 쓰기"; go = s.next; solid = false;
        } else {
            head = "우리의 문답";
            cta = s.data[s.yours] ? you + "는 벌써 답했어요 · 내 답 쓰기" : "내 답 쓰기";
        }
        return '<div style="background:var(--bg-card); border:1px solid var(--border); border-radius:20px; padding:22px; margin-bottom:16px; box-shadow:0 4px 12px rgba(0,0,0,0.02);">' +
            '<div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:12px;">' +
                '<span style="font-size:11.5px; font-weight:800; color:' + (open ? '#7F77DD' : 'var(--text-sub)') + '; letter-spacing:1px;">' + esc(head) + '</span>' +
                '<span style="font-size:11.5px; font-weight:700; color:var(--text-sub);">DAY ' + s.day + '</span>' +
            '</div>' +
            '<div onclick="window.__qaGo(' + s.day + ', ' + (open ? 'true' : 'false') + ')" class="serif-display" style="font-size:18px; color:var(--text-title, #3B322C); line-height:1.6; word-break:keep-all; cursor:pointer; margin-bottom:14px;">' +
                esc(q.text) + '</div>' +
            '<div style="display:flex; gap:6px; margin-bottom:' + (note ? '10px' : '16px') + ';">' +
                qaPill(!!s.data.wifeAns, "엄마") + qaPill(!!s.data.husbandAns, "아빠") +
            '</div>' +
            (note ? '<div style="font-size:12.5px; font-weight:600; color:var(--text-sub); line-height:1.6; margin-bottom:14px; word-break:keep-all;">' + esc(note) + '</div>' : '') +
            '<div onclick="window.__qaGo(' + go + ', ' + (open ? 'true' : 'false') + ')" style="text-align:center; padding:14px; border-radius:14px; cursor:pointer; font-size:14.5px; font-weight:800; ' +
                (solid ? 'background:#4A413C; color:#FFFDF9;' : 'border:1px solid var(--border); background:var(--bg-sub); color:var(--text-m);') + '">' +
                esc(cta) + '</div>' +
        '</div>';
    }

    window.__qaGo = function (day, open) {
        try { if (open) localStorage.setItem(QA_SEEN, String(day)); } catch (e) {}
        location.href = "diary.html?day=" + Number(day);
    };

    /* 짝꿍 답은 짝꿍 폰에서 서버로만 올라간다. 홈에서 그 날 한 칸만 물어본다 (5분에 한 번) */
    var qaAsked = {};
    function qaPull(s) {
        var code = localStorage.getItem("family_sync_code");
        if (!code || !window.db || typeof window.getDoc !== "function" || typeof window.doc !== "function") return;
        if (!(window.auth && window.auth.currentUser)) return;
        var day = s.day;
        if (qaAsked[day] && Date.now() - qaAsked[day] < 5 * 60000) return;
        qaAsked[day] = Date.now();
        try {
            window.getDoc(window.doc(window.db, "diary_" + code, "day_" + day)).then(function (snap) {
                if (!snap || !snap.exists()) return;
                var srv = snap.data() || {}, loc = qaRead(day), changed = false;
                ["husbandAns", "wifeAns", "date"].forEach(function (k) {
                    if (srv[k] && !loc[k]) { loc[k] = srv[k]; changed = true; }
                });
                if (!changed) return;
                try { localStorage.setItem("day_" + day + "_data", JSON.stringify(loc)); } catch (e) {}
                cache = null;
                qaMount();
            }).catch(function () {});
        } catch (e) {}
    }

    function qaMount() {
        try {
            var home = document.getElementById("tab-home");
            if (!home) return;
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
            qaPull(qaState());
        } catch (e) { console.warn("[문답 홈 카드]", e); }
    }
    window.refreshQaCard = qaMount;

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