/* ============================================================
   배냇함 PLUS — 이번 주 놀이 처방전 (playweek.js)

   ⚠️ 이 파일이 처방전 카드를 혼자 다 그린다.
      playlike.js · playlog.js 는 카드에 손대지 않는다.
      셋이 같은 줄에 각자 끼워 넣다가 버튼이 흩어졌다.

   ⚠️ 카드 문장은 data.js 의 desc · dadRole 을 쓴다.
      category 로 문장을 만들면 같은 글이 여러 날에 뜬다.
      좋은 글은 이미 42개 다 쓰여 있다. 새로 지어내지 않는다.

   무료 : 놀이 42개 전부 (놀이 탭) · 오늘과 내일 처방
   PLUS : 나머지 5일을 짜주는 것
          — 잠그는 건 '수고'지 '정보'가 아니다.
   ============================================================ */
(function () {
    'use strict';

    var BLUE = "#3182F6", GRAY = "#8B95A1", DARK = "#191F28";
    var GREEN = "#1F9D6B", RED = "#E32636", GOLD = "#8A6D00";
    var ID = "play-week", KEY = "tosil_playweek";
    var DAYS = ["월", "화", "수", "목", "금", "토", "일"];

    var plan = null;
    var goal = "";
    var planAt = 0;

    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    /* ⚠️ script.js 의 isPremiumUser 와 똑같이 본다.
          founder · master 를 빼먹으면 개발자 계정이 잠긴다. */
    function isPlus() {
        try { if (typeof window.isPremiumUser === "function") return !!window.isPremiumUser(); } catch (e) {}
        if (!localStorage.getItem("firebase_uid")) return false;
        return localStorage.getItem("tosil_is_founder") === "true"
            || localStorage.getItem("tosil_plan_cache") === "premium"
            || localStorage.getItem("tosil_is_master") === "true";
    }

    function babyName() { return localStorage.getItem("tosil_babyName") || "우리 아기"; }

    /* 이름 + 조사. babyswitch.js 가 없는 폴더에서도 혼자 맞게 붙는다. */
    function nm(j) {
        try { if (typeof window.babyNm === "function") return window.babyNm(j); } catch (e) {}
        var n = babyName(), c = n.charCodeAt(n.length - 1);
        var jong = (c >= 0xAC00 && c <= 0xD7A3) && ((c - 0xAC00) % 28 !== 0);
        return n + (jong ? "이" : "") + (j || "");
    }
    function monthsOld() {
        var s = localStorage.getItem("tosil_startDate");
        if (!s) return null;
        var p = String(s).split("-").map(Number);
        if (p.length !== 3) return null;
        var b = new Date(p[0], p[1] - 1, p[2]), t = new Date();
        var m = (t.getFullYear() - b.getFullYear()) * 12 + (t.getMonth() - b.getMonth());
        if (t.getDate() < b.getDate()) m--;
        return m < 0 ? 0 : m;
    }

    function msNow() {
        var m = monthsOld();
        if (m === null) return null;
        if (m < 2) return "newborn";
        if (m < 4) return "tummy";
        if (m < 7) return "flip";
        if (m < 10) return "crawl";
        return "stand";
    }

    function plays() {
        if (typeof playData !== "undefined" && playData) return playData;
        return window.playData || [];
    }
    function mine() { try { return window.myToyIds ? window.myToyIds() : []; } catch (e) { return []; } }
    function haveToy(id) { return mine().indexOf(Number(id)) > -1; }
    function needsBuy(p) { return p.category === "toy" && p.relatedToyId && !haveToy(p.relatedToyId); }

    function toyName(id) {
        try {
            var toys = typeof toyData !== "undefined" ? toyData : (window.toyData || []);
            var t = toys.filter(function (x) { return x.id == id; })[0];
            return t ? t.name : "";
        } catch (e) { return ""; }
    }

    /* 월=0 인 오늘 자리 */
    function todayIdx() { return (new Date().getDay() + 6) % 7; }

    /* 그 주 월요일 — 처방전이 지난주 것인지 보는 데 쓴다 */
    function weekKey(ms) {
        var d = ms ? new Date(ms) : new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
    }
    function isStale() { return planAt && weekKey(planAt) !== weekKey(); }

    /* 제목 앞 대괄호는 뱃지로 뺀다.  "[눕육아] 인간 고속도로" → 뱃지 + 제목 */
    var TAG_LABEL = {
        "눕육아": "누워서", "좀비모드": "누워서",
        "층간소음 0%": "조용히", "수면유도": "잠 오게"
    };
    function splitTitle(t) {
        var m = String(t || "").match(/^\[([^\]]+)\]\s*/);
        if (!m) return { tag: "", title: String(t || "") };
        return { tag: TAG_LABEL[m[1]] || m[1], title: String(t).slice(m[0].length) };
    }

    /* 깬 지 얼마나 됐나 — 오늘 카드에만 쓴다.
       기록이 오래됐으면(5시간 넘음) 안 쓴다. 틀린 말을 하느니 안 하는 게 낫다. */
    function awakeMins() {
        try {
            var recs = JSON.parse(localStorage.getItem('tosil_tracker_records')) || [];
            var sleeps = recs.filter(function (r) { return r.type === 'sleep'; });
            if (!sleeps.length) return null;
            sleeps.sort(function (a, b) { return b.timestamp - a.timestamp; });
            var last = sleeps[0];
            var end = last.endTs ? Number(last.endTs)
                                 : (Number(last.timestamp) + ((Number(last.amount) || 0) * 60000));
            var mins = Math.floor((Date.now() - end) / 60000);
            if (!(mins > 0 && mins < 300)) return null;
            return mins;
        } catch (e) { return null; }
    }
    function hasSleepData() { return awakeMins() !== null; }

    /* ---------- 저장 · 복원 ---------- */

    function restorePlan() {
        try {
            var saved = JSON.parse(localStorage.getItem(KEY));
            if (!saved || !saved.ids || saved.ids.length !== 7) return;
            goal = saved.goal || "";
            planAt = Number(saved.at) || 0;
            var all = plays(), out = [];
            for (var i = 0; i < 7; i++) {
                var p = all.filter(function (x) { return x.id === saved.ids[i]; })[0];
                if (p) out.push({ day: DAYS[i], play: p });
            }
            plan = (out.length === 7) ? out : null;
        } catch (e) { plan = null; }
    }

    function savePlan() {
        planAt = Date.now();
        try {
            localStorage.setItem(KEY, JSON.stringify({
                at: planAt, goal: goal,
                ids: plan.map(function (d) { return d.play.id; })
            }));
        } catch (e) {}
    }

    /* ---------- 목표 고르는 창 ---------- */

    var GOALS = [
        { id: "sleep",       t: "밤에 좀 더 자게",        s: "낮에 몸으로 크게 노는 놀이를 앞으로" },
        { id: "digestion",   t: "응가가 안 나올 때",      s: "배 마사지 · 몸 움직이는 놀이를 앞으로" },
        { id: "energy_save", t: "오늘은 도저히 못 움직여요", s: "누워서 할 수 있는 놀이 위주로" },
        { id: "toy_roi",     t: "사둔 장난감 좀 써먹게",   s: "갖고 계신 걸로 하는 놀이 위주로" }
    ];

    window.openCuratorModal = function () {
        var old = document.getElementById("curator-modal");
        if (old) old.remove();

        var sub = hasSleepData()
            ? esc(nm("의")) + " 잠 기록까지 보고 짜드릴게요.<br>이번 주에 제일 급한 걸 하나만 골라주세요."
            : "이번 주에 제일 급한 걸 하나만 골라주세요.<br>" + esc(nm("")) + " 개월수와 갖고 계신 장난감을 보고 짭니다.";

        var html =
        '<div id="curator-modal" style="position:fixed; inset:0; background:rgba(0,0,0,0.55); ' +
            'z-index:100050; display:flex; align-items:flex-end; justify-content:center;">' +
          '<div id="curator-modal-content" style="background: #FFFFFF; width:100%; max-width:480px; ' +
              'border-radius:24px 24px 0 0; padding:28px 22px calc(32px + env(safe-area-inset-bottom,0px)); ' +
              'transform:translateY(100%); transition:transform .28s ease-out;">' +

            '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">' +
              '<div style="font-size:18.5px; font-weight:900; color:#191F28;">이번 주, 뭐에 집중할까요</div>' +
              '<span onclick="window.closeCuratorModal()" style="font-size:26px; font-weight:300; ' +
                  'color:#8B95A1; cursor:pointer; line-height:1; padding:0 4px;">&times;</span>' +
            '</div>' +

            '<div style="font-size:13.5px; font-weight:600; color:#8B95A1; line-height:1.7; ' +
                'margin-bottom:18px; word-break:keep-all;">' + sub + '</div>' +

            '<div style="display:flex; flex-direction:column; gap:9px;">' +
              GOALS.map(function (g) {
                  return '<div onclick="window.applyCuratorGoal(\'' + g.id + '\')" ' +
                      'style="text-align:left; padding:16px 18px; background: #F9FAFB; ' +
                      'border:1px solid #E5E8EB; border-radius:14px; cursor:pointer;">' +
                      '<div style="font-size:15px; font-weight:900; color:#191F28;">' + g.t + '</div>' +
                      '<div style="font-size:12px; font-weight:700; color:#8B95A1; margin-top:3px;">' + g.s + '</div>' +
                  '</div>';
              }).join("") +
            '</div>' +
          '</div>' +
        '</div>';

        document.body.insertAdjacentHTML("beforeend", html);
        setTimeout(function () {
            var c = document.getElementById("curator-modal-content");
            if (c) c.style.transform = "translateY(0)";
        }, 10);
    };

    window.closeCuratorModal = function () {
        var m = document.getElementById("curator-modal");
        var c = document.getElementById("curator-modal-content");
        if (c) c.style.transform = "translateY(100%)";
        setTimeout(function () { if (m) m.remove(); }, 300);
    };

    window.applyCuratorGoal = function (g) {
        goal = g;
        window.closeCuratorModal();
        var el = document.getElementById(ID);
        if (!el) return;

        /* ⚠️ 없는 데이터를 읽는 척하지 않는다. 잠 기록이 없으면 그 말을 안 한다. */
        var line = hasSleepData()
            ? esc(nm("의")) + " 잠 기록을 보는 중"
            : "놀이 42가지에서 고르는 중";

        el.innerHTML =
            '<div style="padding:52px 20px; text-align:center;">' +
              '<div style="width:36px; height:36px; border:3px solid #F2F4F6; border-top-color:#3182F6; ' +
                  'border-radius:50%; animation:pwspin .9s linear infinite; margin:0 auto 14px;"></div>' +
              '<div style="font-size:14.5px; font-weight:800; color:#191F28;">' + line + '</div>' +
              '<style>@keyframes pwspin{100%{transform:rotate(360deg)}}</style>' +
            '</div>';

        setTimeout(function () { window.makePlayWeek(); }, 900);
    };

    /* ---------- 일주일 짜기 ---------- */

    function shuffle(a) { return a.slice().sort(function () { return Math.random() - 0.5; }); }

    function makePlan() {
        var all = plays();
        if (!all.length) return [];

        var ms = msNow();

        /* 1) 개월수에 맞는 것만 */
        var pool = all.filter(function (p) {
            if (!p || !p.targetAge) return false;
            return ms === null ? true : p.targetAge.indexOf(ms) > -1;
        });
        if (pool.length < 7) pool = all.slice();

        /* 2) 없는 장난감이 있어야 하는 놀이는 뺀다 */
        var noBuy = pool.filter(function (p) { return !needsBuy(p); });
        if (noBuy.length >= 7) pool = noBuy;

        /* 3) 아빠 놀이는 따로 뺀다.
              ⚠️ 우선 풀에 섞어두면 한 주에 4~5번 나와서 뱃지가 배경이 된다.
                 금·토 두 자리에만 놓는다. */
        var dadPool = shuffle(pool.filter(function (p) { return p.category === "dad"; }));
        var rest = pool.filter(function (p) { return p.category !== "dad"; });

        var priority = [], normal = [];
        if (goal === "energy_save") {
            priority = rest.filter(function (p) { return p.category === "sick" || p.category === "lieDown"; });
            normal   = rest.filter(function (p) { return p.category !== "sick" && p.category !== "lieDown"; });
        } else if (goal === "sleep") {
            priority = rest.filter(function (p) { return parseInt(p.playTime, 10) >= 20; });
            normal   = rest.filter(function (p) { return parseInt(p.playTime, 10) < 20; });
        } else if (goal === "digestion") {
            var wet = function (p) { return /목욕|욕조/.test(p.title + (p.targetItem || "")); };
            priority = rest.filter(function (p) { return p.category === "poop" || wet(p); });
            normal   = rest.filter(function (p) { return p.category !== "poop" && !wet(p); });
        } else if (goal === "toy_roi") {
            priority = rest.filter(function (p) { return p.relatedToyId && haveToy(p.relatedToyId); });
            normal   = rest.filter(function (p) { return !(p.relatedToyId && haveToy(p.relatedToyId)); });
            /* 갖고 있는 것 중에서도 '한 달 넘게 안 꺼낸 것' 을 제일 앞으로 (toylife.js) */
            try {
                var idle = (typeof window.idleToyIds === "function") ? window.idleToyIds() : [];
                if (idle.length) priority.sort(function (a, b) {
                    return (idle.indexOf(Number(b.relatedToyId)) > -1 ? 1 : 0) -
                           (idle.indexOf(Number(a.relatedToyId)) > -1 ? 1 : 0);
                });
            } catch (e) {}
        } else {
            priority = rest.slice();
        }

        /* 4) 좋아한 갈래를 앞으로 (playlike.js) */
        try {
            if (typeof window.playLikeScores === "function") {
                var LS = window.playLikeScores();
                if (LS.count >= 3) {
                    var byLike = function (a, b) {
                        return (LS.byCat[b.category] || 0) - (LS.byCat[a.category] || 0);
                    };
                    priority = priority.slice().sort(byLike);
                    normal = normal.slice().sort(byLike);
                }
            }
        } catch (e) {}

        /* 5) 최근 2주에 한 놀이는 뒤로 (playlog.js) */
        try {
            if (typeof window.recentPlayIds === "function") {
                var RC = window.recentPlayIds(14);
                if (RC.length) {
                    var fresh = function (a, b) {
                        return (RC.indexOf(a.id) > -1 ? 1 : 0) - (RC.indexOf(b.id) > -1 ? 1 : 0);
                    };
                    priority = priority.slice().sort(fresh);
                    normal = normal.slice().sort(fresh);
                }
            }
        } catch (e) {}

        priority = shuffle(priority);
        normal = shuffle(normal);

        var out = [], used = {};
        function take(list) {
            while (list.length) {
                var p = list.shift();
                if (p && !used[p.id]) { used[p.id] = 1; return p; }
            }
            return null;
        }

        for (var i = 0; i < 7; i++) {
            var pick = null;
            if ((i === 4 || i === 5) && dadPool.length) pick = take(dadPool);   // 금 · 토
            if (!pick) pick = take(priority);
            if (!pick) pick = take(normal);
            if (!pick) pick = take(shuffle(pool.slice()));
            if (!pick) pick = take(shuffle(all.slice()));
            if (!pick) break;
            out.push({ day: DAYS[i], play: pick });
        }
        return out.length === 7 ? out : [];
    }

    window.makePlayWeek = function () {
        var made = makePlan();
        if (!made.length) return;
        plan = made;
        expanded = -1;
        savePlan();
        paint();
        var el = document.getElementById(ID);
        if (el) setTimeout(function () {
            try { el.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (e) {}
        }, 100);
    };

    /* ⚠️ 교체도 개월수와 보유 장난감을 본다.
          아무거나 집어오면 '맞춤'이 버튼 한 번에 깨진다. */
    window.swapPlayDay = function (i) {
        if (!plan || !plan[i]) return;
        var all = plays(), ms = msNow();
        var inPlan = function (p) { return plan.some(function (d) { return d.play.id === p.id; }); };

        var pool = all.filter(function (p) {
            if (inPlan(p)) return false;
            if (ms && p.targetAge && p.targetAge.indexOf(ms) === -1) return false;
            if (needsBuy(p)) return false;
            return true;
        });
        /* 아빠 요일은 아빠 놀이로 바꿔준다 */
        var wasDad = plan[i].play.category === "dad";
        var dad = pool.filter(function (p) { return p.category === "dad"; });
        if (wasDad && dad.length) pool = dad;

        if (!pool.length) pool = all.filter(function (p) { return !inPlan(p) && !needsBuy(p); });
        if (!pool.length) pool = all.filter(function (p) { return !inPlan(p); });
        if (!pool.length) return;

        plan[i].play = pool[Math.floor(Math.random() * pool.length)];
        savePlan();
        paint();
    };

    window.openPlayFromWeek = function (id) {
        if (typeof window.switchToyMainTab === "function") window.switchToyMainTab("play");
        if (typeof window.filterPlays === "function") {
            var btn = document.querySelector('.play-filter-btn');
            if (btn) window.filterPlays('all', btn);
        }
        setTimeout(function () {
            var b = document.getElementById("timer-btn-" + id);
            if (b) {
                var card = b.closest('div[style*="background: #FFFFFF"]');
                if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        }, 150);
    };

    window.togglePlayWeekCards = function () {
        var c = document.getElementById("play-week-content");
        var b = document.getElementById("play-week-toggle");
        if (!c) return;
        if (c.style.display === "none") {
            c.style.display = "block";
            if (b) { b.innerHTML = "접어두기 ∧"; b.style.background = "#F2F4F6"; b.style.color = GRAY; }
        } else {
            c.style.display = "none";
            if (b) { b.innerHTML = "7일 보기 ∨"; b.style.background = DARK; b.style.color = "#FFFFFF"; }
            var el = document.getElementById(ID);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    };

    /* ---------- 카드 ---------- */

    var expanded = -1;
    window.togglePlayWeekRow = function (i) {
        expanded = (expanded === i) ? -1 : i;
        paint();
    };

    var CAT_LABEL = {
        zero: "\uD83C\uDFE0 집에 있는 걸로", dad: "\uD83C\uDFCB\uFE0F 아빠와", lieDown: "\uD83D\uDECC 누워서",
        poop: "\uD83D\uDCA9 장운동", sick: "\uD83E\uDD12 진정 놀이", toy: "\uD83E\uDDF8 장난감으로"
    };

    function badge(text, bg, color, border) {
        return '<span style="display:inline-block; padding:4px 9px; border-radius:7px; ' +
            'font-size:11px; font-weight:800; white-space:nowrap; background:' + bg + '; color:' + color +
            (border ? '; border:1px solid ' + border : '') + ';">' + text + '</span>';
    }

    function btn(label, onclick, kind) {
        var st = kind === "primary"
            ? 'background:' + DARK + '; color:#FFFFFF; border:1px solid ' + DARK + ';'
            : kind === "done"
                ? 'background:#EAF7F1; color:#1F6F52; border:1px solid #A7DFC8;'
                : 'background: #FFFFFF; color:#4E5968; border:1px solid #D1D5DB;';
        return '<div onclick="event.stopPropagation(); ' + onclick + '" ' +
            'style="flex:1; text-align:center; padding:13px 8px; border-radius:12px; cursor:pointer; ' +
            'font-size:13.5px; font-weight:800; ' + st + '">' + label + '</div>';
    }

    function doneOf(id) {
        try { if (typeof window.didPlayToday === "function") return !!window.didPlayToday(id); } catch (e) {}
        return false;
    }
    function likeOf(id) {
        try { if (typeof window.playLikeOf === "function") return window.playLikeOf(id) || 0; } catch (e) {}
        return 0;
    }

    /* 왜 이 날인지 — 진짜 이유가 있을 때만 한 줄. 할 말이 없으면 아무 말도 안 한다. */
    function whyLine(p, isToday) {
        if (isToday) {
            var aw = awakeMins();
            if (aw !== null && aw >= 60) {
                var h = Math.floor(aw / 60), mm = aw % 60;
                return "깬 지 " + (h ? h + "시간 " : "") + mm + "분 됐어요. 다음 잠 오기 전에 하기 좋습니다.";
            }
        }
        if (p.category === "dad") return "주말이라 아빠 손이 있는 날이에요.";
        if (p.relatedToyId && haveToy(p.relatedToyId)) {
            var tn = toyName(p.relatedToyId);
            if (tn) return "갖고 계신 " + esc(tn) + " 꺼내 쓰는 날이에요.";
        }
        return "";
    }

    /* 카드 속살 — 오늘 카드와 펼친 줄이 똑같은 걸 쓴다 */
    function bodyHTML(p, i, isToday) {
        var isDad = p.category === "dad";
        var done = doneOf(p.id), like = likeOf(p.id);
        var why = whyLine(p, isToday);

        return (p.desc
            ? '<div style="margin-top:13px; font-size:13.5px; font-weight:600; color:#4E5968; ' +
              'line-height:1.7; word-break:keep-all;">' + esc(p.desc) + '</div>' : '') +

            (isDad && p.dadRole
                ? '<div style="margin-top:12px; background:#FFFBEB; border:1px solid #FDE68A; ' +
                  'border-radius:12px; padding:12px 14px;">' +
                  '<div style="font-size:11.5px; font-weight:900; color:#D97706; margin-bottom:3px;">\uD83D\uDC68\u200D\uD83D\uDD27 아빠는 이것만</div>' +
                  '<div style="font-size:12.5px; font-weight:700; color:#B45309; line-height:1.6; ' +
                      'word-break:keep-all;">' + esc(p.dadRole) + '</div></div>' : '') +

            (why ? '<div style="margin-top:11px; font-size:12px; font-weight:700; color:' + BLUE + '; ' +
                   'line-height:1.6; word-break:keep-all;">' + why + '</div>' : '') +

            '<div onclick="event.stopPropagation(); window.openPlayFromWeek(\'' + p.id + '\')" ' +
                'style="margin-top:9px; font-size:12px; font-weight:800; color:' + GRAY + '; cursor:pointer;">' +
                '놀이 방법 4단계 보기 \u3009</div>' +

            '<div style="display:flex; gap:8px; margin-top:15px;">' +
                btn(done ? "\u2713 놀았어요" : "놀았어요",
                    "window.playWeekDone('" + p.id + "')", done ? "done" : "primary") +
                btn("다른 놀이로", "window.swapPlayDay(" + i + ")") +
            '</div>' +

            /* 평가는 놀고 난 뒤에만 묻는다 */
            (done
                ? '<div style="margin-top:12px; background: #F9FAFB; border-radius:12px; padding:13px 14px;">' +
                  '<div style="font-size:12.5px; font-weight:800; color:#4E5968; margin-bottom:9px;">' +
                      esc(nm("가")) + ' 어땠어요?</div>' +
                  '<div style="display:flex; gap:7px;">' +
                    '<div onclick="event.stopPropagation(); window.playWeekLike(\'' + p.id + '\',1)" ' +
                      'style="flex:1; text-align:center; padding:11px; border-radius:10px; cursor:pointer; ' +
                      'font-size:12.5px; font-weight:800; ' +
                      (like === 1 ? 'background:#EAF7F1; color:#1F6F52; border:1.5px solid #A7DFC8;'
                                  : 'background: #FFFFFF; color:#8B95A1; border:1.5px solid #E5E8EB;') +
                      '">좋아했어요</div>' +
                    '<div onclick="event.stopPropagation(); window.playWeekLike(\'' + p.id + '\',-1)" ' +
                      'style="flex:1; text-align:center; padding:11px; border-radius:10px; cursor:pointer; ' +
                      'font-size:12.5px; font-weight:800; ' +
                      (like === -1 ? 'background:#F2F4F6; color:#4E5968; border:1.5px solid #D1D5DB;'
                                   : 'background: #FFFFFF; color:#8B95A1; border:1.5px solid #E5E8EB;') +
                      '">시큰둥했어요</div>' +
                  '</div></div>' : '');
    }

    /* 오늘 — 이거 하나만 크게. "오늘 뭐하지" 에 스크롤 없이 답한다. */
    function todayCard(d, i) {
        var p = d.play, st = splitTitle(p.title);
        var isDad = p.category === "dad";
        var right = isDad ? badge("아빠 차례", "#FFF2F2", RED, "#FCA5A5")
                  : st.tag ? badge(esc(st.tag), "#F5F3FF", "#7C5CE0")
                  : (p.relatedToyId && haveToy(p.relatedToyId))
                      ? badge("갖고 계신 걸로", "#EAF7F1", "#1F6F52") : "";

        return '<div style="background: #FFFFFF; border-radius:20px; padding:22px 20px; ' +
            'border:1.5px solid #CBE0FF; box-shadow:0 4px 20px rgba(49,130,246,0.07);">' +
            '<div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">' +
                badge("오늘 \u00B7 " + esc(d.day) + "요일", "#E8F3FF", "#1B64DA") +
                '<div style="flex-shrink:0;">' + right + '</div>' +
            '</div>' +
            '<div style="margin-top:13px; font-size:20px; font-weight:900; color:#191F28; ' +
                'letter-spacing:-0.4px; line-height:1.3; word-break:keep-all;">' + esc(st.title) + '</div>' +
            '<div style="margin-top:7px; font-size:12.5px; font-weight:700; color:' + GRAY + '; ' +
                'line-height:1.6; word-break:keep-all;">' +
                '<b style="color:#4E5968;">' + (p.playTime ? p.playTime + "분" : "자율") + '</b>' +
                ' \u00B7 ' + esc(p.targetItem || "도구 없음") + '</div>' +
            bodyHTML(p, i, true) +
        '</div>';
    }

    /* 나머지 6일 — 한 줄씩. 눌러야 펼쳐진다.
       ⚠️ 큰 카드 7장을 쌓으면 '처방전' 이 아니라 '목록' 이 된다.
          한 줄로 두면 일주일 전체가 스크롤 없이 한눈에 들어온다. */
    function weekRow(d, i, locked, open, last) {
        var p = d.play, st = splitTitle(p.title);
        var isDad = p.category === "dad";
        var line = last && !open ? "" : "border-bottom:1px solid #F2F4F6;";

        if (locked) {
            return '<div style="display:flex; align-items:center; gap:11px; padding:15px 0; ' + line + '">' +
                '<div style="width:22px; flex-shrink:0; font-size:12.5px; font-weight:800; color:' + GRAY + ';">' +
                    esc(d.day) + '</div>' +
                '<div style="flex:1; min-width:0; font-size:13.5px; font-weight:700; color:' + GRAY + '; ' +
                    'white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' +
                    (CAT_LABEL[p.category] || "놀이") + '</div>' +
                '<div style="flex-shrink:0; font-size:11.5px; font-weight:800; color:#C4CAD2;">' +
                    (p.playTime ? p.playTime + "분" : "자율") + '</div>' +
                '<div style="flex-shrink:0; font-size:11px;">\uD83D\uDD12</div>' +
            '</div>';
        }

        var done = doneOf(p.id);
        return '<div style="' + line + '">' +
            '<div onclick="window.togglePlayWeekRow(' + i + ')" ' +
                'style="display:flex; align-items:center; gap:11px; padding:15px 0; cursor:pointer;">' +
                '<div style="width:22px; flex-shrink:0; font-size:12.5px; font-weight:800; color:' +
                    (isDad ? RED : "#4E5968") + ';">' + esc(d.day) + '</div>' +
                '<div style="flex:1; min-width:0; font-size:14px; font-weight:800; ' +
                    'white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:' +
                    (done ? GRAY : DARK) + ';' + (done ? ' text-decoration:line-through;' : '') + '">' +
                    (done ? '\u2713 ' : '') + esc(st.title) + '</div>' +
                (isDad ? '<div style="flex-shrink:0; font-size:10.5px; font-weight:800; color:' + RED + '; ' +
                         'background:#FFF2F2; padding:3px 7px; border-radius:6px;">아빠</div>' : '') +
                '<div style="flex-shrink:0; font-size:11.5px; font-weight:800; color:' + GRAY + ';">' +
                    (p.playTime ? p.playTime + "분" : "자율") + '</div>' +
                '<div style="flex-shrink:0; font-size:10px; color:#C4CAD2;">' + (open ? '\u2227' : '\u2228') + '</div>' +
            '</div>' +
            (open
                ? '<div style="padding:0 0 18px;">' +
                  '<div style="font-size:12px; font-weight:700; color:' + GRAY + '; word-break:keep-all;">' +
                      esc(p.targetItem || "도구 없음") + '</div>' +
                  bodyHTML(p, i, false) + '</div>'
                : '') +
        '</div>';
    }

    /* 카드 안에서 부르는 얇은 껍데기 — playlog · playlike 가 없어도 안 터진다 */
    window.playWeekDone = function (id) {
        if (typeof window.togglePlayDone === "function") window.togglePlayDone(id);
        else paint();
    };
    window.playWeekLike = function (id, v) {
        if (typeof window.setPlayLike === "function") window.setPlayLike(id, v);
        else paint();
    };

    /* ---------- 이번 주 어떻게 짰는지 ---------- */

    function report() {
        if (!plan) return "";
        var g = GOALS.filter(function (x) { return x.id === goal; })[0];
        var gross = 0, quiet = 0, calm = 0;
        plan.forEach(function (d) {
            var c = d.play.category;
            if (c === "dad") gross++;
            else if (c === "lieDown" || c === "sick") calm++;
            else quiet++;
        });
        var mineCnt = plan.filter(function (d) {
            return d.play.relatedToyId && haveToy(d.play.relatedToyId);
        }).length;
        var buyCnt = plan.filter(function (d) { return needsBuy(d.play); }).length;

        return '<div style="background: #F9FAFB; border:1px solid #E5E8EB; border-radius:16px; ' +
            'padding:17px 18px; margin-top:14px;">' +
            '<div style="font-size:13.5px; font-weight:900; color:#191F28; margin-bottom:9px;">' +
                '이번 주 이렇게 짰어요</div>' +
            '<div style="font-size:12.5px; font-weight:600; color:#4E5968; line-height:1.9;">' +
                (g ? '고르신 목표 \u00B7 <b>' + g.t + '</b><br>' : '') +
                '몸으로 크게 ' + gross + '번 \u00B7 조용히 ' + quiet + '번 \u00B7 누워서 ' + calm + '번' +
                (mineCnt ? '<br>갖고 계신 장난감을 쓰는 날 ' + mineCnt + '번' : '') +
            '</div>' +
            (buyCnt === 0
                ? '<div style="margin-top:10px; font-size:12.5px; font-weight:800; color:#1F6F52;">' +
                  '\u2705 이번 주는 살 게 없어요. 전부 집에 있는 걸로 됩니다.</div>' : '') +
        '</div>';
    }

    /* ---------- 전체 ---------- */

    function html() {
        var plus = isPlus();
        var m = monthsOld();
        var name = babyName();
        var ti = todayIdx();

        if (!plan) {
            return '<div id="' + ID + '" style="padding:6px 0 20px;">' +
                '<div onclick="window.openCuratorModal()" style="display:flex; justify-content:center; ' +
                    'align-items:center; gap:8px; padding:18px; background:' + DARK + '; color:#FFFFFF; ' +
                    'border-radius:16px; font-size:15.5px; font-weight:800; cursor:pointer; ' +
                    'box-shadow:0 4px 16px rgba(0,0,0,0.15);">\uD83D\uDCC5 이번 주 놀이 짜주세요</div>' +
                '<div style="margin-top:9px; text-align:center; font-size:12px; font-weight:700; ' +
                    'color:' + GRAY + '; line-height:1.6;">오늘과 내일은 무료로 보여드려요</div>' +
            '</div>';
        }

        /* 무료는 오늘과 내일. 월·화 고정이면 목요일에 들어온 사람은 지난 이틀만 봤다. */
        var isOpen = function (i) { return plus || i === ti || i === (ti + 1) % 7; };

        var rows = [];
        for (var k = 1; k <= 6; k++) {
            var i = (ti + k) % 7;
            rows.push(weekRow(plan[i], i, !isOpen(i), expanded === i, k === 6));
        }

        return '<div id="' + ID + '" style="padding:4px 0 20px;">' +
            '<div style="display:flex; align-items:center; justify-content:space-between; ' +
                'gap:8px; margin-bottom:12px;">' +
                '<div data-plus-head style="font-size:18px; font-weight:900; color:' + DARK + '; ' +
                    'min-width:0; word-break:keep-all;">' +
                    esc(m === null ? "이번 주 놀이" : m + "개월 " + nm("의") + " 이번 주 놀이") + '</div>' +
                '<div id="play-week-toggle" onclick="window.togglePlayWeekCards()" ' +
                    'style="flex-shrink:0; font-size:12.5px; font-weight:800; background:#F2F4F6; ' +
                    'color:' + GRAY + '; padding:6px 12px; border-radius:8px; cursor:pointer;">접어두기 \u2227</div>' +
            '</div>' +

            '<div id="play-week-content" style="display:block;">' +

                (isStale()
                    ? '<div style="background:#FFF9E6; border:1px solid #FDE68A; border-radius:14px; ' +
                      'padding:14px 16px; margin-bottom:14px;">' +
                      '<div style="font-size:13px; font-weight:800; color:' + GOLD + ';">지난주에 짠 놀이예요.</div>' +
                      '<div onclick="window.openCuratorModal()" style="margin-top:10px; text-align:center; ' +
                          'padding:12px; background:' + DARK + '; color:#FFFFFF; border-radius:11px; ' +
                          'font-size:13px; font-weight:800; cursor:pointer;">이번 주 걸로 다시 짜기</div></div>'
                    : '') +

                todayCard(plan[ti], ti) +

                '<div style="margin-top:16px; background: #FFFFFF; border:1px solid #F2F5F8; ' +
                    'border-radius:18px; padding:2px 18px;">' +
                    '<div style="display:flex; justify-content:space-between; align-items:center; ' +
                        'padding:15px 0 4px;">' +
                        '<div style="font-size:13.5px; font-weight:900; color:' + DARK + ';">이번 주 나머지</div>' +
                        (plus
                            ? '<div onclick="window.openCuratorModal()" style="font-size:12px; ' +
                              'font-weight:800; color:' + GRAY + '; cursor:pointer;">다시 짜기</div>'
                            : '<div style="font-size:11.5px; font-weight:800; color:' + GRAY + ';">' +
                              '내일까지 열려 있어요</div>') +
                    '</div>' +
                    rows.join("") +
                '</div>' +

                (plus
                    ? report()
                    : '<div style="margin-top:14px; background:#FFF9E6; border:1px solid #FDE68A; ' +
                      'border-radius:16px; padding:20px 18px; text-align:center;">' +
                      '<div style="font-size:14.5px; font-weight:900; color:' + GOLD + '; margin-bottom:7px;">' +
                          '나머지 5일도 짜드릴게요</div>' +
                      '<div style="font-size:12.5px; font-weight:600; color:' + GOLD + '; ' +
                          'line-height:1.75; word-break:keep-all;">' +
                          '놀이 42가지는 아래에서 전부 무료로 보실 수 있어요.<br>' +
                          'PLUS는 ' + esc(nm("")) + ' 개월수와 갖고 계신 장난감에 맞춰 ' +
                          '<b>일주일을 대신 짜드리는 것</b>입니다.</div></div>') +
            '</div>' +
        '</div>';
    }

    function paint() {
        var el = document.getElementById(ID);
        if (!el || !el.parentNode) return;
        var box = document.createElement("div");
        box.innerHTML = html();
        el.parentNode.replaceChild(box.firstChild, el);
        /* 옆 파일들의 카드도 같이 다시 그린다 */
        setTimeout(function () {
            try { if (typeof window.playLikeRepaint === "function") window.playLikeRepaint(); } catch (e) {}
            try { if (typeof window.playLogRepaint === "function") window.playLogRepaint(); } catch (e) {}
        }, 40);
    }

    /* ⚠️ myshelf.js · playlike.js · playlog.js 가 이걸 부른다.
          여태 정의가 없어서 세 기능이 처방전에 반영이 안 됐다. */
    window.refreshPlayWeek = function () {
        if (document.getElementById(ID)) paint();
    };

    function mount() {
        if (document.getElementById(ID)) return;
        var host = document.getElementById("view-toy-play");
        if (!host) return;
        var box = document.createElement("div");
        box.innerHTML = html();
        var banner = host.querySelector("div[style*='background: #F4F8FF']");
        if (banner) host.insertBefore(box.firstChild, banner);
        else host.insertBefore(box.firstChild, host.firstChild);
    }

    function boot() {
        restorePlan();
        setTimeout(mount, 300);
        setTimeout(mount, 1200);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    window.playWeekDebug = function () {
        console.log("PLUS:", isPlus(), "· 개월수:", monthsOld(), "· 시기:", msNow());
        console.log("목표:", goal || "(없음)", "· 짠 날:", planAt ? new Date(planAt).toLocaleString() : "-",
                    "· 지난주 것:", isStale());
        if (!plan) { console.log("아직 안 짬"); return; }
        var ti = todayIdx();
        plan.forEach(function (d, i) {
            var p = d.play;
            console.log(" " + d.day + (i === ti ? "(오늘)" : "     ") + "  " + p.title +
                "  [" + p.category + "]  " + (p.playTime || "-") + "분" +
                (needsBuy(p) ? "  ⚠️없는 장난감 필요" : "") +
                (p.desc ? "" : "  ⚠️desc 없음"));
        });
        console.log("아빠 날:", plan.filter(function (d) { return d.play.category === "dad"; }).length + "일");
        console.log("desc 빠진 놀이:", plays().filter(function (p) { return !p.desc; }).length + "개");
    };
})();