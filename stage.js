/* ============================================================
   배냇함 — 단계 (stage.js)            ※ 지금은 숨김 스위치 뒤에서만 켜진다

   배냇함은 '태어난 날' 이 아니라 '기다리던 날' 부터 시작하는 상자다.
   아기 프로필마다 단계 하나를 둔다.

       born      태어났어요   (지금까지의 배냇함 — 기본값, 기존 사용자는 전부 이것)
       pregnant  임신 중이에요
       paused    기록을 멈췄어요 (임신을 이어가지 못했을 때)
       prep      기다리고 있어요 (준비 — 다음 단계에서 연다)

   단계는 아기마다 따로다 (script.js 의 BABY_SPECIFIC_KEYS).
   첫째는 태어났고 둘째는 임신 중인 집도 그대로 된다.

   ⚠️ 숨김 스위치
      깃허브에 올리는 순간 모든 사용자 앱에 반영된다. 그래서 스위치를 켠 폰에서만 보인다.
        켜기:  주소 끝에 ?stagebeta=1   (크롬에서 한 번 열면 앱에도 같이 켜진다)
        끄기:  ?stagebeta=0
      스위치가 꺼져 있으면 이 파일은 아무것도 하지 않는다.

   ⚠️ 건강 글은 공공기관 자료(질병관리청 · 아이사랑)의 일반적인 일정만 쓴다.
      약·증상 판단은 하지 않는다. "병원 안내가 우선" 을 늘 같이 적는다.
      주차별 자세한 안내는 감수를 받은 뒤에 넣는다.

   index.html 에서 script.js 바로 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    /* ---------- 숨김 스위치 ---------- */
    var BETA = "tosil_stage_beta";
    try {
        var q = new URLSearchParams(location.search).get("stagebeta");
        if (q === "1") localStorage.setItem(BETA, "1");
        if (q === "0") localStorage.removeItem(BETA);
    } catch (e) {}
    /* 시험 스위치(이 폰만) 또는 전체 스위치(서버 app_settings/flags.stageLive) 중 하나라도 켜져 있으면 켜진다.
       전체 스위치는 관리자만 바꿀 수 있고(규칙: app_settings 쓰기는 관리자), 다음에 앱을 열 때부터 반영된다.
       문제가 생기면 stageLive 를 false 로 바꾸면 모두에게서 다시 숨는다. */
    function tester() { try { return localStorage.getItem(BETA) === "1"; } catch (e) { return false; } }
    function beta() { try { return tester() || localStorage.getItem("tosil_stage_live") === "1"; } catch (e) { return false; } }
    function refreshLive() {
        if (!window.db || typeof window.getDoc !== "function" || typeof window.doc !== "function") return;
        try {
            window.getDoc(window.doc(window.db, "app_settings", "flags")).then(function (s) {
                var on = s.exists() && (s.data() || {}).stageLive === true;
                if (on) localStorage.setItem("tosil_stage_live", "1"); else localStorage.removeItem("tosil_stage_live");
            }).catch(function () {});
        } catch (e) {}
    }

    var GOLD = "#B98A2E", PURPLE = "#7F77DD", INK = "#4A413C", SUB = "#7A6F68", DAY = 86400000;

    /* ---------- 디자인 재료 (종이 · 명조 · 선 아이콘) ---------- */
    var PAPER = "#FFFDF9", LINE = "#EFE7DC", INK2 = "#3B322C", SUB2 = "#8A7F76", MUTE = "#B5AAA0", TINT = "#F5EFE6";
    var SERIF = "'Gowun Batang', 'Noto Serif KR', 'Noto Serif CJK KR', serif";
    function svg(p) {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>';
    }
    /* 앱 아래 탭 아이콘(icons.js)과 같은 굵기 · 같은 끝처리 */
    var ICO = {
        pen:    svg('<path d="M4 20h4L19.2 8.8a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 16v4z"/><path d="M13.5 6.5l4 4"/>'),
        scale:  svg('<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8.6 10a4.8 4.8 0 0 1 6.8 0"/><path d="M12 10l1.4-1.8"/>'),
        foot:   svg('<path d="M8 4.5c1.8 0 2.8 2 2.8 4.3S9.9 13 8.3 13 5.5 11.3 5.5 9 6.2 4.5 8 4.5z"/><path d="M7 15.5h2.6v1.6a1.3 1.3 0 0 1-2.6 0z"/>' +
                    '<path d="M16 8.5c1.8 0 2.5 2.6 2.5 4.6S17.3 17 15.7 17s-2.5-1.7-2.5-4 1-4.5 2.8-4.5z"/><path d="M14.4 19h2.6v.6a1.3 1.3 0 0 1-2.6 0z"/>'),
        camera: svg('<rect x="3.5" y="7" width="17" height="12" rx="3"/><circle cx="12" cy="13" r="3.2"/><path d="M9 7l1.2-2h3.6L15 7"/>'),
        mic:    svg('<rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0"/><path d="M12 18v2.5"/>'),
        letter: svg('<rect x="3.5" y="6" width="17" height="12" rx="2.5"/><path d="M4.5 7.5L12 13l7.5-5.5"/>')
    };


    /* ---------- 저장 (아기마다 따로) ---------- */
    function stage() { try { return localStorage.getItem("tosil_stage") || "born"; } catch (e) { return "born"; } }
    function setStage(s) {
        try {
            localStorage.setItem("tosil_stage", s);
            if (s === "pregnant" && !localStorage.getItem("tosil_preg_since")) localStorage.setItem("tosil_preg_since", todayKey());
        } catch (e) {}
        if (typeof pushStage === "function") { pushStage(); quiet(); }
    }
    function dueDate() { try { return localStorage.getItem("tosil_due_date") || ""; } catch (e) { return ""; } }
    function babyName() { return localStorage.getItem("tosil_babyName") || "우리 아기"; }
    window.babyStage = function () { return beta() ? stage() : "born"; };

    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }
    function pad(n) { return String(n).padStart(2, "0"); }
    function keyOf(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
    function todayKey() { return keyOf(new Date()); }
    function fromKey(k) { var p = String(k || "").split("-"); return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])); }
    function pretty(k) { var d = fromKey(k); return isNaN(d) ? "" : d.getFullYear() + ". " + (d.getMonth() + 1) + ". " + d.getDate() + "."; }
    function toast(m) { if (typeof window.showToast === "function") window.showToast(m); }

    /* ---------- 주수 계산 ----------
       임신 기간은 마지막 생리 시작일부터 280일(40주)로 센다. 예정일이 있으면 거꾸로 센다. */
    function weeksFromDue(due, now) {
        var d = fromKey(due); if (isNaN(d)) return null;
        var t = now ? new Date(now) : new Date(); t.setHours(0, 0, 0, 0);
        var left = Math.round((d - t) / DAY);
        var ga = 280 - left;
        if (ga < 0 || ga > 300) return null;
        return { ga: ga, weeks: Math.floor(ga / 7), days: ga % 7, left: left,
                 tri: ga < 98 ? "임신 초기" : (ga < 196 ? "임신 중기" : "임신 후기") };
    }
    function dueFromLmp(lmp) {
        var d = fromKey(lmp); if (isNaN(d)) return "";
        return keyOf(new Date(d.getTime() + 280 * DAY));
    }

    /* ---------- 일반적인 검진 일정 (질병관리청 · 아이사랑 자료의 흔한 시기) ---------- */
    var PLAN = [
        { id: "confirm", from: 4,  to: 8,  t: "임신 확인 진료", d: "초음파로 아기집과 심장 소리를 확인해요. 임신확인서를 받아 두세요." },
        { id: "card",    from: 5,  to: 12, t: "임신·출산 진료비 지원 신청", d: "임신확인서로 국민행복카드 진료비 지원을 신청할 수 있어요. 금액과 방법은 공식 안내를 확인하세요.", link: "https://www.childcare.go.kr/" },
        { id: "basic",   from: 8,  to: 12, t: "첫 산전 검사", d: "혈액·소변 검사로 기본 상태를 살펴요." },
        { id: "nt",      from: 11, to: 13, t: "1차 기형아 검사", d: "목덜미 투명대 초음파와 피검사를 보통 이 시기에 해요." },
        { id: "quad",    from: 15, to: 20, t: "2차 기형아 검사", d: "피검사로 해요. 병원마다 방법이 조금씩 달라요." },
        { id: "detail",  from: 20, to: 24, t: "정밀 초음파", d: "아기의 몸 구석구석을 자세히 봐요." },
        { id: "gdm",     from: 24, to: 28, t: "임신성 당뇨 검사", d: "당이 든 음료를 마신 뒤 피검사를 해요." },
        { id: "tdap",    from: 27, to: 36, t: "백일해(Tdap) 예방접종", d: "임신할 때마다 이 시기에 맞는 걸 권해요. 접종은 병원과 상의하세요." },
        { id: "kick",    from: 28, to: 40, t: "태동 살피기", d: "매일 비슷한 시간에 태동을 느껴 보세요. 평소보다 확 줄면 바로 병원에 연락하세요." },
        { id: "late",    from: 32, to: 36, t: "막달 검사", d: "출산 전에 필요한 검사를 한 번 더 해요." },
        { id: "due",     from: 39, to: 42, t: "예정일 무렵", d: "예정일이 지나면 병원과 다음 계획을 상의해요." }
    ];
    var ALERTS = [
        "피가 비치거나 쏟아질 때",
        "배가 심하게 아프거나, 37주 전에 배가 규칙적으로 뭉칠 때",
        "물 같은 게 흐를 때",
        "태동이 평소보다 확 줄었을 때",
        "심한 두통, 눈앞이 흐려짐, 얼굴·손이 갑자기 부을 때",
        "38도가 넘는 열"
    ];
    function checks() { try { return JSON.parse(localStorage.getItem("tosil_preg_checks")) || {}; } catch (e) { return {}; } }
    window.togglePregCheck = function (id) {
        var c = checks(); if (c[id]) delete c[id]; else c[id] = todayKey();
        try { localStorage.setItem("tosil_preg_checks", JSON.stringify(c)); } catch (e) {}
        render(); pushStage();
    };
    function planFor(weeks) {
        var c = checks();
        var now = PLAN.filter(function (p) { return weeks >= p.from && weeks <= p.to; });
        var next = PLAN.filter(function (p) { return p.from > weeks; }).slice(0, 2);
        return { now: now, next: next, c: c };
    }
    window.__stageTest = { weeksFromDue: weeksFromDue, dueFromLmp: dueFromLmp, planFor: planFor };

    /* ---------- 스타일 ---------- */
    function css() {
        if (document.getElementById("stage-css")) return;
        var s = document.createElement("style");
        s.id = "stage-css";
        s.textContent =
            "body.stage-pregnant #tab-home > :not(#preg-home):not(.stage-keep)," +
            "body.stage-paused #tab-home > :not(#preg-home):not(.stage-keep)," +
            "body.stage-prep #tab-home > :not(#preg-home):not(.stage-keep) { display: none !important; }" +
            ".pg-paper{background:" + PAPER + ";border:1px solid " + LINE + ";border-radius:20px;padding:22px 20px;margin-bottom:14px;}" +
            ".pg-serif{font-family:" + SERIF + ";}" +
            ".pg-h{font-family:" + SERIF + ";font-size:17px;font-weight:700;color:" + INK2 + ";letter-spacing:-0.3px;}" +
            ".pg-meta{font-size:12px;font-weight:600;color:" + SUB2 + ";}" +
            ".pg-row{display:flex;align-items:center;gap:12px;padding:13px 0;border-top:1px solid " + LINE + ";cursor:pointer;}" +
            ".pg-ico{width:36px;height:36px;border-radius:12px;background:" + TINT + ";display:flex;align-items:center;justify-content:center;color:" + INK2 + ";flex-shrink:0;}" +
            ".pg-ico svg{width:19px;height:19px;display:block;}" +
            ".pg-dots{display:grid;grid-template-columns:repeat(10,1fr);row-gap:9px;justify-items:center;}" +
            ".pg-dot{width:9px;height:9px;border-radius:50%;box-sizing:border-box;}" +
            ".pg-chip{display:inline-flex;align-items:center;gap:4px;padding:9px 14px;border-radius:999px;cursor:pointer;font-size:13.5px;font-weight:700;color:" + INK2 + ";background:" + PAPER + ";border:1px solid " + LINE + ";}" +
            ".pg-chip.on{background:" + TINT + ";border-color:#CBBBA6;}" +
            ".pg-warn{display:flex;gap:9px;align-items:flex-start;font-size:12.5px;font-weight:600;color:#9A3412;line-height:1.65;word-break:keep-all;}" +
            ".pg-warn:before{content:'';width:6px;height:6px;border-radius:50%;background:#C2410C;margin-top:7px;flex-shrink:0;}" +
            ".pg-list{font-size:13px;font-weight:600;color:" + SUB2 + ";}" +
            ".pg-list div{display:flex;justify-content:space-between;padding:10px 2px;border-top:1px solid " + LINE + ";}" +
            "@keyframes pgRipple{from{transform:scale(1);opacity:.45}to{transform:scale(1.35);opacity:0}}" +
            "#stage-sheet input[type=date],#stage-sheet input[type=text],#stage-sheet input[type=time],#stage-sheet input[type=number]{width:100%;box-sizing:border-box;padding:14px 15px;" +
                "border:1px solid " + LINE + ";border-radius:14px;font-size:16px;font-weight:600;font-family:inherit;color:" + INK2 + ";background:#FFF;}";
        document.head.appendChild(s);
    }

    /* ---------- 임신 중 홈 ---------- */
    function heroHTML(w) {
        var dots = "";
        for (var i = 1; i <= 40; i++) {
            var st = i <= w.weeks ? "background:#D9CBB6;"
                   : (i === w.weeks + 1 ? "border:2px solid " + GOLD + ";" : "border:1.5px solid " + LINE + ";");
            dots += '<span class="pg-dot" style="' + st + '"></span>';
        }
        var d = fromKey(dueDate());
        return '<div class="pg-paper" style="padding:24px 22px 20px;">' +
            '<div style="display:flex;justify-content:space-between;align-items:baseline;">' +
                '<span class="pg-serif" style="font-size:20px;font-weight:700;color:' + INK2 + ';">' + esc(babyName()) + '</span>' +
                '<span class="pg-meta">' + (d.getMonth() + 1) + '월 ' + d.getDate() + '일 예정</span>' +
            '</div>' +
            '<div class="pg-serif" style="font-size:46px;font-weight:700;color:' + INK2 + ';letter-spacing:-1.5px;line-height:1;margin:16px 0 20px;">' +
                w.weeks + '<span style="font-size:20px;margin:0 8px 0 3px;">주</span>' + w.days + '<span style="font-size:20px;margin-left:3px;">일</span></div>' +
            '<div class="pg-dots">' + dots + '</div>' +
            '<div style="display:flex;justify-content:space-between;margin-top:14px;" class="pg-meta">' +
                '<span>' + w.tri + ' · 한 점이 한 주</span>' +
                '<span>' + (w.left > 0 ? '만나기까지 ' + w.left + '일' : (w.left === 0 ? '오늘이 예정일' : '예정일에서 ' + (-w.left) + '일')) + '</span></div>' +
        '</div>';
    }

    /* ---------- 챙길 것: [병원] [신청] [준비] 한 장에 ----------
       병원 일정 · 신청 달력(applycal.js) · 준비 순서(readylist.js) 가 카드 세 장으로 늘어서면 홈이 너무 길다.
       한 장에 칸 셋으로 묶고, 칸 이름 옆에 '지금 할 것' 개수를 단다. 고른 칸은 기억한다. */
    function planBody(w) {
        var p = planFor(w.weeks);
        var rows = p.now.concat(p.next).map(function (x) {
            var on = !!p.c[x.id], soon = x.from > w.weeks;
            var tick = soon
                ? '<div style="width:22px;height:22px;border-radius:50%;border:1.5px dashed ' + LINE + ';flex-shrink:0;margin-top:1px;"></div>'
                : '<div onclick="window.togglePregCheck(\'' + x.id + '\')" style="width:22px;height:22px;border-radius:50%;flex-shrink:0;margin-top:1px;cursor:pointer;' +
                    'display:flex;align-items:center;justify-content:center;font-size:12px;color:#FFF;' +
                    (on ? 'background:' + INK2 + ';' : 'border:1.5px solid #CBBBA6;') + '">' + (on ? '✓' : '') + '</div>';
            return '<div style="display:flex;gap:12px;padding:13px 0;border-top:1px solid ' + LINE + ';">' + tick +
                '<div style="flex:1;min-width:0;">' +
                    '<div style="font-size:15px;font-weight:700;color:' + (soon || on ? MUTE : INK2) + ';' + (on && !soon ? 'text-decoration:line-through;' : '') + '">' + esc(x.t) + '</div>' +
                    '<div class="pg-meta" style="margin-top:3px;">' + (soon ? x.from + '주부터' : x.from + '~' + x.to + '주') + '</div>' +
                    (soon ? '' : '<div style="font-size:12.5px;font-weight:500;color:' + SUB2 + ';line-height:1.65;margin-top:5px;word-break:keep-all;">' + esc(x.d) +
                        (x.link ? ' <a href="' + x.link + '" target="_blank" rel="noopener" style="color:' + INK2 + ';font-weight:700;">공식 안내 ›</a>' : '') + '</div>') +
                '</div></div>';
        }).join("");
        return (rows || '<div class="pg-meta" style="padding:12px 0;border-top:1px solid ' + LINE + ';">지금 시기에 따로 챙길 검사는 없어요.</div>') +
            '<div style="font-size:11px;font-weight:600;color:' + MUTE + ';line-height:1.6;padding-top:10px;border-top:1px solid ' + LINE + ';">' +
                '흔한 일정이에요. 다니는 병원 안내가 우선이에요 · 질병관리청 국가건강정보포털, 아이사랑</div>';
    }
    function planCount(w) {
        var p = planFor(w.weeks);
        return p.now.filter(function (x) { return !p.c[x.id]; }).length;
    }
    function planHTML(w) {
        var tabs = [{ id: "plan", label: "병원", order: 1, body: planBody, count: planCount }]
            .concat(window.stageTabs || []).sort(function (a, b) { return (a.order || 9) - (b.order || 9); });
        var cur = localStorage.getItem("tosil_stage_tab") || "plan";
        if (!tabs.some(function (t) { return t.id === cur; })) cur = "plan";
        var seg = tabs.map(function (t) {
            var n = 0; try { n = t.count ? t.count(w) : 0; } catch (e) {}
            var on = t.id === cur;
            return '<div onclick="window.__stageTab(\'' + t.id + '\')" style="flex:1;text-align:center;padding:10px 0;border-radius:11px;cursor:pointer;font-size:14px;font-weight:700;' +
                (on ? 'background:' + PAPER + ';color:' + INK2 + ';box-shadow:0 1px 3px rgba(59,50,44,0.10);' : 'color:' + SUB2 + ';') + '">' + t.label +
                (n ? '<span style="display:inline-block;min-width:17px;margin-left:5px;padding:1px 5px;border-radius:9px;font-size:11px;line-height:15px;' +
                    'background:' + (on ? INK2 : '#E6DCCF') + ';color:' + (on ? '#FFFDF9' : INK2) + ';">' + n + '</span>' : '') + '</div>';
        }).join("");
        var body = "";
        tabs.forEach(function (t) { if (t.id === cur) { try { body = t.body(w) || ""; } catch (e) { console.warn("[단계] 칸 실패", e); } } });
        return '<div class="pg-paper" style="padding:16px 20px 14px;">' +
            '<div style="display:flex;justify-content:space-between;align-items:baseline;">' +
                '<span class="pg-h">챙길 것</span><span class="pg-meta">' + w.weeks + '주 무렵</span></div>' +
            '<div style="display:flex;gap:4px;padding:4px;background:' + TINT + ';border-radius:14px;margin:14px 0 4px;">' + seg + '</div>' +
            body + '</div>';
    }
    window.__stageTab = function (id) { try { localStorage.setItem("tosil_stage_tab", id); } catch (e) {} render(); };

    function boxHTML() {
        var n = 0;
        try {
            n = ((typeof window.photoCount === "function") ? window.photoCount() : 0) +
                ((typeof window.voiceCount === "function") ? window.voiceCount() : 0) +
                ((typeof window.sealedCount === "function") ? window.sealedCount() : 0);
        } catch (e) {}
        var btn = function (ico, label, act, first) {
            return '<div onclick="' + act + '" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:7px;padding:15px 4px 13px;cursor:pointer;' +
                (first ? '' : 'border-left:1px solid ' + LINE + ';') + 'color:' + INK2 + ';">' +
                '<span style="width:20px;height:20px;display:block;">' + ico + '</span>' +
                '<span style="font-size:13px;font-weight:700;">' + label + '</span></div>';
        };
        return '<div class="pg-paper" style="background:#FFFAF1;">' +
            '<div class="pg-h">태어나기 전 이야기</div>' +
            '<div style="font-size:12.5px;font-weight:500;color:' + SUB2 + ';line-height:1.7;margin:6px 0 16px;word-break:keep-all;">' +
                '지금 담은 건 태어난 뒤에도 배냇함 맨 앞에 남아요.' + (n ? ' 지금까지 ' + n + '가지.' : '') + '</div>' +
            '<div style="display:flex;border:1px solid ' + LINE + ';border-radius:14px;background:' + PAPER + ';overflow:hidden;">' +
                btn(ICO.camera, "사진", "window.addDayPhoto && window.addDayPhoto('" + todayKey() + "')", true) +
                btn(ICO.mic, "심장 소리", "window.openHeartSheet ? window.openHeartSheet() : (window.openVoiceSheet && window.openVoiceSheet('" + todayKey() + "'))") +
                btn(ICO.letter, "편지", "window.openSealSheet && window.openSealSheet()") +
            '</div>' +
        '</div>';
    }

    function alertHTML() {
        return '<details class="pg-paper" style="padding:16px 20px;">' +
            '<summary style="list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;">' +
                '<span style="display:flex;align-items:center;gap:9px;font-size:14.5px;font-weight:800;color:' + INK2 + ';">' +
                    '<span style="width:7px;height:7px;border-radius:50%;background:#C2410C;"></span>이럴 땐 바로 병원에</span>' +
                '<span class="pg-meta">보기 ›</span></summary>' +
            '<div style="margin-top:12px;">' + ALERTS.map(function (a) {
                return '<div style="font-size:13px;font-weight:600;color:' + SUB2 + ';line-height:1.6;padding:6px 0 6px 16px;position:relative;">' +
                    '<span style="position:absolute;left:2px;top:14px;width:4px;height:4px;border-radius:50%;background:' + MUTE + ';"></span>' + esc(a) + '</div>';
            }).join("") + '</div>' +
            '<div style="font-size:12px;font-weight:500;color:' + SUB2 + ';line-height:1.7;margin-top:10px;padding-top:10px;border-top:1px solid ' + LINE + ';word-break:keep-all;">' +
                '먹어도 되는 약이 궁금하면 <a href="https://www.mothersafe.or.kr/" target="_blank" rel="noopener" style="color:' + INK2 + ';font-weight:700;">한국마더세이프전문상담센터</a>에 물어보세요. 배냇함은 약을 판단하지 않아요.</div>' +
        '</details>';
    }

    function bornBtnHTML() {
        return '<div onclick="window.openBirthSheet()" style="text-align:center;padding:15px;border-radius:14px;cursor:pointer;margin:4px 0 26px;' +
            'background:' + PAPER + ';border:1px solid ' + LINE + ';color:' + INK2 + ';font-size:14.5px;font-weight:700;">아기가 태어났어요</div>';
    }

    function pausedHTML() {
        return '<div class="pg-paper" style="text-align:center;padding:34px 24px 26px;">' +
            '<div class="pg-serif" style="font-size:20px;font-weight:700;color:' + INK2 + ';margin-bottom:12px;">기록을 잠시 멈췄어요</div>' +
            '<div style="font-size:13px;font-weight:500;color:' + SUB2 + ';line-height:1.85;word-break:keep-all;margin-bottom:22px;">' +
                '임신 안내와 알림은 보내지 않아요.<br>담아 둔 것은 배냇함에 그대로 있어요.</div>' +
            '<div onclick="window.setBabyStage(\'pregnant\')" style="padding:14px;border-radius:14px;border:1px solid ' + LINE + ';background:' + PAPER + ';' +
                'font-size:14px;font-weight:700;color:' + INK2 + ';cursor:pointer;">아기가 다시 찾아왔어요</div>' +
        '</div>';
    }

    function render() {
        css();
        var s = window.babyStage();
        document.body.classList.toggle("stage-pregnant", s === "pregnant");
        document.body.classList.toggle("stage-paused", s === "paused");
        document.body.classList.toggle("stage-prep", s === "prep");
        var host = document.getElementById("tab-home");
        var old = document.getElementById("preg-home");
        if (s !== "pregnant" && s !== "paused" && s !== "prep") { if (old) old.remove(); return; }
        if (!host) return;

        // 다둥이 전환 칩은 남긴다 (둘째 임신 중 · 첫째 태어남 사이를 오가야 하니까)
        var sw = document.getElementById("baby-profile-switcher");
        while (sw && sw.parentNode && sw.parentNode !== host) sw = sw.parentNode;
        if (sw && sw.parentNode === host) sw.classList.add("stage-keep");

        var html;
        if (s === "paused") html = pausedHTML();
        else if (s === "prep") html = (typeof window.stagePrepHTML === "function") ? window.stagePrepHTML() : "";   // prepstage.js
        else {
            var w = weeksFromDue(dueDate());
            html = w ? (heroHTML(w) + extra("after-hero", w) + todayHTML(w) + extra("after-today", w) + planHTML(w) + extra("after-plan", w) + boxHTML() + alertHTML() + bornBtnHTML())
                     : '<div class="pg-card"><div class="pg-title">출산 예정일을 알려 주세요</div>' +
                       '<div onclick="window.openDueSheet()" style="padding:15px;border-radius:14px;background:' + PURPLE + ';color:#FFF;text-align:center;font-weight:900;cursor:pointer;">예정일 넣기</div></div>';
        }
        var box = old || document.createElement("div");
        box.id = "preg-home";
        box.innerHTML = html;
        // 다둥이 전환 칩이 있으면 그 바로 아래, 없으면 맨 위
        var after = (sw && sw.parentNode === host) ? sw.nextSibling : host.firstChild;
        if (!old || box.previousSibling !== (after ? after.previousSibling : null)) host.insertBefore(box, after);
    }
    window.refreshStageHome = render;

    /* 다른 파일이 홈에 카드를 끼울 수 있게 (tenmonths.js — 열 달의 문답) */
    function extra(pos, w) {
        var list = (window.stageCardHooks && window.stageCardHooks[pos]) || [];
        return list.map(function (fn) { try { return fn(w) || ""; } catch (e) { console.warn("[단계] 카드 실패", e); return ""; } }).join("");
    }

    /* ---------- 가족이 같이 보기 ----------
       growth_가족코드(+아기 꼬리표) / stage 한 문서에 둔다.
       growth_ 는 보안 규칙의 '사생활 목록' 이라 돌봄 도우미 폰에는 내려가지 않는다 (임신은 민감정보다).
       나중에 바꾼 쪽이 이긴다 (at). */
    function stageRef() {
        var code = localStorage.getItem("family_sync_code");
        if (!code || !window.db || typeof window.doc !== "function") return null;
        return window.doc(window.db, "growth_" + code + (window.currentBabySuffix || ""), "stage");
    }
    function pushStage() {
        var at = Date.now();
        try { localStorage.setItem("tosil_stage_at", String(at)); } catch (e) {}
        var r = stageRef();
        if (!r || typeof window.setDoc !== "function") return;
        try {
            window.setDoc(r, { stage: stage(), due: dueDate(), checks: checks(), log: pregLog(), since: localStorage.getItem("tosil_preg_since") || "", at: at }, { merge: true })
                .catch(function (e) { console.warn("[단계] 올리기 실패", e); });
        } catch (e) {}
    }
    function applyRemote(d) {
        if (!d || !d.at) return;
        var mine = Number(localStorage.getItem("tosil_stage_at")) || 0;
        if (Number(d.at) <= mine) return;
        try {
            localStorage.setItem("tosil_stage", d.stage || "born");
            if (d.due) localStorage.setItem("tosil_due_date", d.due);
            if (d.checks) localStorage.setItem("tosil_preg_checks", JSON.stringify(d.checks));
            if (d.log) localStorage.setItem("tosil_preg_log", JSON.stringify(d.log));
            if (d.since) localStorage.setItem("tosil_preg_since", d.since);
            localStorage.setItem("tosil_stage_at", String(d.at));
        } catch (e) {}
        render(); quiet();
        if (typeof window.renderSettingsTab === "function") { try { window.renderSettingsTab(); } catch (e) {} }
    }
    var unwatch = null;
    function watchStage() {
        var r = stageRef();
        if (!r || typeof window.onSnapshot !== "function") return;
        if (unwatch) { try { unwatch(); } catch (e) {} }
        unwatch = window.onSnapshot(r, function (snap) { if (snap.exists()) applyRemote(snap.data() || {}); },
                                    function (e) { console.warn("[단계] 실시간 연동 에러", e); });
    }

    /* ---------- 임신 중에는 '육퇴 알림' 을 쉬게 한다 ----------
       아직 태어나지 않은 아기 집에 "오늘 사진이 아직 없어요" 가 가면 안 된다.
       집에 태어난 아기가 하나도 없을 때만 끈다. 끄기 전 상태를 적어 두었다가, 태어나면 그대로 돌려놓는다. */
    function rawGet(k) {
        try { if (typeof originalGetItem === "function") return originalGetItem.call(localStorage, k); } catch (e) {}
        return localStorage.getItem(k);
    }
    function familyAllExpecting() {
        var list = [];
        try { list = JSON.parse(localStorage.getItem("tosil_baby_profiles")) || []; } catch (e) {}
        if (!list.length) return stage() !== "born";
        return list.every(function (p) { var s = rawGet("tosil_stage" + (p.id || "")) || "born"; return s !== "born"; });
    }
    function quiet() {
        if (!beta()) return;
        var OFF = "tosil_remind_off", SAVED = "tosil_remind_before_preg";
        try {
            if (familyAllExpecting()) {
                if (localStorage.getItem(SAVED) === null) localStorage.setItem(SAVED, localStorage.getItem(OFF) || "false");
                if (localStorage.getItem(OFF) !== "true") {
                    localStorage.setItem(OFF, "true");
                    if (typeof window.syncBedtimeReminder === "function") window.syncBedtimeReminder(true, "toggle");
                }
            } else if (localStorage.getItem(SAVED) !== null) {
                var prev = localStorage.getItem(SAVED);
                localStorage.removeItem(SAVED);
                localStorage.setItem(OFF, prev);
                if (typeof window.syncBedtimeReminder === "function") window.syncBedtimeReminder(true, "toggle");
            }
        } catch (e) {}
    }
    window.__stageTest.familyAllExpecting = familyAllExpecting;

    /* ---------- 단계 바꾸기 ---------- */
    window.setBabyStage = function (s) {
        setStage(s);
        if (s === "pregnant" && !dueDate()) { window.openDueSheet(); return; }
        render();
        if (typeof window.renderSettingsTab === "function") { try { window.renderSettingsTab(); } catch (e) {} }
    };

    /* ---------- 아래에서 올라오는 창 ---------- */
    function sheet(inner) {
        var old = document.getElementById("stage-sheet"); if (old) old.remove();
        var w = document.createElement("div");
        w.id = "stage-sheet";
        /* ⚠️ 온보딩 덮개(z-index 9999999) 위에도 떠야 한다. 안 그러면 임신 첫 화면이 덮개 밑에 숨는다 */
        w.setAttribute("style", "position:fixed;inset:0;z-index:10000001;background:rgba(43,36,30,0.45);display:flex;align-items:flex-end;justify-content:center;");
        w.onclick = function (e) { if (e.target === w) w.remove(); };
        w.innerHTML = '<div style="width:100%;max-width:480px;max-height:88vh;overflow-y:auto;background:' + PAPER + ';border-radius:24px 24px 0 0;' +
            'padding:12px 22px calc(26px + env(safe-area-inset-bottom, 0px));box-sizing:border-box;">' +
            '<div style="width:36px;height:4px;border-radius:4px;background:#E5DDD2;margin:0 auto 18px;"></div>' + inner + '</div>';
        document.body.appendChild(w);
        return w;
    }
    function closeSheet() { var s = document.getElementById("stage-sheet"); if (s) s.remove(); }
    function primary(label, act) {
        return '<div onclick="' + act + '" style="margin-top:20px;text-align:center;padding:16px;border-radius:14px;background:' + INK2 + ';' +
            'color:#FFFDF9;font-size:15px;font-weight:700;cursor:pointer;letter-spacing:-0.2px;">' + label + '</div>';
    }

    window.openDueSheet = function () {
        sheet('<div class="pg-serif" style="font-size:20px;font-weight:700;color:#3B322C;margin-bottom:6px;">출산 예정일을 알려 주세요</div>' +
            '<div style="font-size:12.5px;font-weight:600;color:var(--text-sub);margin-bottom:16px;line-height:1.6;">병원에서 알려 준 날짜를 넣어 주세요.</div>' +
            '<input type="date" id="stage-due" value="' + esc(dueDate()) + '">' +
            '<div style="font-size:12.5px;font-weight:700;color:var(--text-sub);margin:16px 0 8px;">예정일을 모르면 마지막 생리 시작일로 계산할게요</div>' +
            '<input type="date" id="stage-lmp" max="' + todayKey() + '" onchange="var d=document.getElementById(\'stage-due\'); if(d) d.value=window.__stageTest.dueFromLmp(this.value);">' +
            primary("저장하기", "window.saveDueSheet()"));
    };
    window.saveDueSheet = function () {
        var v = (document.getElementById("stage-due") || {}).value || "";
        if (!weeksFromDue(v)) return toast("날짜를 다시 확인해 주세요");
        try { localStorage.setItem("tosil_due_date", v); } catch (e) {}
        setStage("pregnant");        // 예정일까지 같이 올라간다
        closeSheet(); render();
        toast("예정일을 저장했어요");
    };

    window.openBirthSheet = function () {
        sheet(
            '<div class="pg-serif" style="font-size:20px;font-weight:700;color:#3B322C;margin-bottom:6px;">축하해요</div>' +
            '<div style="font-size:13px;font-weight:600;color:var(--text-sub);margin-bottom:18px;line-height:1.7;word-break:keep-all;">' +
                '지금부터는 수유·수면 기록과 배냇함이 시작돼요. 임신 중에 담은 것은 \'태어나기 전\' 장에 그대로 남아요.</div>' +
            '<div style="font-size:12.5px;font-weight:800;color:var(--text-sub);margin-bottom:6px;">이름</div>' +
            '<input type="text" id="stage-bname" value="' + esc(localStorage.getItem("tosil_babyName") || "") + '" placeholder="아기 이름">' +
            '<div style="font-size:12.5px;font-weight:800;color:var(--text-sub);margin:14px 0 6px;">태어난 날</div>' +
            '<input type="date" id="stage-bdate" value="' + todayKey() + '" max="' + todayKey() + '">' +
            '<div style="display:flex;gap:8px;margin-top:14px;">' +
                '<div style="flex:1.2;min-width:0;"><div class="pg-meta" style="margin-bottom:6px;">태어난 시각</div><input type="time" id="stage-btime"></div>' +
                '<div style="flex:1;min-width:0;"><div class="pg-meta" style="margin-bottom:6px;">몸무게 kg</div><input type="number" id="stage-bw" step="0.01" min="0.3" max="7" inputmode="decimal"></div>' +
                '<div style="flex:1;min-width:0;"><div class="pg-meta" style="margin-bottom:6px;">키 cm</div><input type="number" id="stage-bh" step="0.1" min="20" max="65" inputmode="decimal"></div>' +
            '</div>' +
            '<div class="pg-meta" style="margin:14px 0 6px;">출생 카드에 남길 한 줄 (모두 선택)</div>' +
            '<input type="text" id="stage-bline" maxlength="40" placeholder="예) 와 줘서 고마워">' +
            primary("배냇함 시작하기", "window.saveBirthSheet()"));
    };
    window.saveBirthSheet = function () {
        /* ⚠️ 이미 생일이 있는 아기(테스트로 '임신 중' 을 켜 본 진짜 아기)라면 이름·생일을 덮어쓰지 않는다 */
        if (localStorage.getItem("tosil_startDate")) {
            setStage("born"); closeSheet();
            toast("이미 생일이 있는 아기라 이름·생일은 그대로 뒀어요");
            setTimeout(function () { location.reload(); }, 700);
            return;
        }
        var name = ((document.getElementById("stage-bname") || {}).value || "").trim() || babyName();
        var date = (document.getElementById("stage-bdate") || {}).value || todayKey();
        var btime = (document.getElementById("stage-btime") || {}).value || "";
        var bw = parseFloat((document.getElementById("stage-bw") || {}).value) || 0;
        var bh = parseFloat((document.getElementById("stage-bh") || {}).value) || 0;
        var bline = ((document.getElementById("stage-bline") || {}).value || "").trim();
        try {
            localStorage.setItem("tosil_babyName", name);
            localStorage.setItem("tosil_startDate", date);
            localStorage.setItem("tosil_baby", JSON.stringify({ name: name, birth: date, stage: localStorage.getItem("tosil_feedingStage") || "" }));
            localStorage.setItem("tosil_born_from_preg", date);       // '태어나기 전' 장을 나누는 기준
        } catch (e) {}
        setStage("born");
        // 프로필 목록 이름도 같이 (script.js finishOnboarding 과 같은 방법)
        try {
            var sfx = window.currentBabySuffix || "";
            var list = JSON.parse(Storage.prototype.getItem.call(localStorage, "tosil_baby_profiles")) || [];
            var me = list.filter(function (p) { return (p.id || "") === sfx; })[0];
            if (me) { me.name = name; Storage.prototype.setItem.call(localStorage, "tosil_baby_profiles", JSON.stringify(list)); }
        } catch (e) {}
        closeSheet();
        toast("👶 " + name + ", 반가워");
        /* 출생 카드 (familynews.js) — 가족 단톡방에 보낼 수 있게 만든 뒤 새 화면으로 */
        var after = function () { location.reload(); };
        if (typeof window.makeBirthCard === "function") {
            setTimeout(function () {
                window.makeBirthCard({ name: name, date: date, time: btime, weight: bw ? Math.round(bw * 100) / 100 : "", height: bh ? Math.round(bh * 10) / 10 : "", line: bline })
                    .then(after, after);
            }, 300);
        } else setTimeout(after, 700);
    };

    window.openStopSheet = function () {
        sheet('<div class="pg-serif" style="font-size:20px;font-weight:700;color:#3B322C;margin-bottom:10px;">임신 기록을 멈출게요</div>' +
            '<div style="font-size:13.5px;font-weight:600;color:var(--text-sub);line-height:1.85;word-break:keep-all;">' +
                '주차 안내와 임신 알림은 지금부터 보내지 않아요.<br>' +
                '담아 둔 사진·소리·편지는 그대로 두었어요. 원하실 때 배냇함에서 하나씩 지울 수 있어요.</div>' +
            primary("기록 멈추기", "window.confirmStop()") +
            '<div onclick="document.getElementById(\'stage-sheet\').remove()" style="text-align:center;padding:14px;font-size:13.5px;font-weight:800;color:var(--text-sub);cursor:pointer;">취소</div>');
    };
    window.confirmStop = function () { setStage("paused"); closeSheet(); render(); };

    /* ---------- 임신 · 준비 기록 모두 지우기 (개인정보처리방침의 '기록을 지울 때까지') ----------
       가족 서버의 growth_/stage 문서를 통째로 비우고, 가족 소식 페이지를 닫고, 이 폰의 기록도 지운다.
       배냇함에 담은 사진 · 소리 · 편지는 그대로 둔다 (배냇함에서 하나씩 지울 수 있다). */
    var WIPE_KEYS = ["tosil_preg_log", "tosil_preg_qa", "tosil_preg_weeks", "tosil_apply", "tosil_ready", "tosil_prep",
                     "tosil_preg_checks", "tosil_due_date", "tosil_preg_since", "tosil_news_id", "tosil_sensitive_consent"];
    window.openWipeSheet = function () {
        sheet('<div class="pg-serif" style="font-size:20px;font-weight:700;color:#3B322C;margin-bottom:10px;">임신 · 준비 기록을 모두 지울까요?</div>' +
            '<div style="font-size:13.5px;font-weight:600;color:var(--text-sub);line-height:1.85;word-break:keep-all;">' +
                '예정일, 주기, 체온, 증상 · 체중 · 태동, 문답, 신청 체크, 가족 소식 페이지가 지워져요. 남편 폰에서도 지워지고, 되돌릴 수 없어요.<br>' +
                '배냇함에 담은 사진 · 소리 · 편지는 그대로 남아요.</div>' +
            primary("모두 지우기", "window.confirmWipe()") +
            '<div onclick="document.getElementById(\'stage-sheet\').remove()" style="text-align:center;padding:14px;font-size:13.5px;font-weight:800;color:var(--text-sub);cursor:pointer;">취소</div>');
    };
    window.confirmWipe = function () {
        var code = localStorage.getItem("family_sync_code"), nid = localStorage.getItem("tosil_news_id"), at = Date.now();
        var r = stageRef();
        if (r && typeof window.setDoc === "function") { try { window.setDoc(r, { stage: "paused", at: at }).catch(function () {}); } catch (e) {} }   // merge 없이 = 통째로 바꿈
        if (nid && code && window.db && typeof window.setDoc === "function") {
            try { window.setDoc(window.doc(window.db, "news", nid), { family: code, off: true, updatedAt: at }).catch(function () {}); } catch (e) {}
        }
        WIPE_KEYS.forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
        try { localStorage.setItem("tosil_stage", "paused"); localStorage.setItem("tosil_stage_at", String(at)); } catch (e) {}
        closeSheet(); render();
        if (typeof window.renderSettingsTab === "function") { try { window.renderSettingsTab(); } catch (e) {} }
        toast("임신 · 준비 기록을 지웠어요");
    };

    /* ==========================================================
       B-③ 매일 기록 — 증상 · 체중 · 태동
       ⚠️ 판단하지 않는다. 몸무게가 많다/적다, 증상이 괜찮다/위험하다를 앱이 말하지 않는다.
          위험 신호만 '병원에 연락' 으로 안내한다 (공공기관 자료의 일반 기준).
       ========================================================== */
    var SYMS = ["입덧", "피로", "두통", "붓기", "허리 통증", "변비", "속쓰림", "잠을 설침", "배 뭉침", "마음이 가라앉음"];
    function pregLog() {
        try { var v = JSON.parse(localStorage.getItem("tosil_preg_log")); if (v && typeof v === "object") return { days: v.days || {}, kicks: v.kicks || [] }; } catch (e) {}
        return { days: {}, kicks: [] };
    }
    function savePregLog(v) {
        try { localStorage.setItem("tosil_preg_log", JSON.stringify(v)); } catch (e) {}
        pushStage();
    }
    function lastWeight(log) {
        var keys = Object.keys(log.days).filter(function (k) { return log.days[k].w; }).sort();
        return keys.length ? { k: keys[keys.length - 1], w: log.days[keys[keys.length - 1]].w, first: log.days[keys[0]].w, keys: keys } : null;
    }
    function todayHTML(w) {
        var log = pregLog(), t = log.days[todayKey()] || {}, lw = lastWeight(log);
        var kicksToday = log.kicks.filter(function (s) { return keyOf(new Date(s.start)) === todayKey(); });
        var kickOn = w.weeks >= 28;
        var now = new Date();
        var row = function (ico, label, val, act, off) {
            return '<div class="pg-row" onclick="' + act + '"' + (off ? ' style="opacity:0.45;"' : '') + '>' +
                '<div class="pg-ico">' + ico + '</div>' +
                '<div style="flex:1;font-size:15px;font-weight:700;color:' + INK2 + ';">' + label + '</div>' +
                '<div style="max-width:48%;text-align:right;font-size:13.5px;font-weight:600;color:' + (val.on ? INK2 : MUTE) + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(val.t) + '</div>' +
                '<span style="color:' + MUTE + ';font-size:15px;margin-left:2px;">›</span></div>';
        };
        return '<div class="pg-paper" style="padding:10px 20px 4px;">' +
            '<div style="display:flex;justify-content:space-between;align-items:baseline;padding:12px 0 12px;">' +
                '<span class="pg-h">오늘</span><span class="pg-meta">' + (now.getMonth() + 1) + '월 ' + now.getDate() + '일 ' + "일월화수목금토"[now.getDay()] + '요일</span></div>' +
            row(ICO.pen, "몸 상태", (t.sym && t.sym.length) ? { t: t.sym.join(", "), on: 1 } : { t: "남기기" }, "window.openSymSheet()") +
            row(ICO.scale, "체중", lw ? { t: Number(lw.w).toFixed(1) + "kg", on: lw.k === todayKey() } : { t: "남기기" }, "window.openWeightSheet()") +
            row(ICO.foot, "태동", kickOn ? (kicksToday.length ? { t: kicksToday[kicksToday.length - 1].count + "번", on: 1 } : { t: "세기" }) : { t: "28주부터" },
                kickOn ? "window.openKickSheet()" : "window.__kickSoon()", !kickOn) +
        '</div>';
    }
    window.__kickSoon = function () { toast("태동 세기는 28주부터 열려요"); };

    var symPick = [];
    window.openSymSheet = function () {
        var t = pregLog().days[todayKey()] || {};
        symPick = (t.sym || []).slice();
        sheet('<div class="pg-serif" style="font-size:20px;font-weight:700;color:' + INK2 + ';">오늘 몸 상태</div>' +
            '<div class="pg-meta" style="margin:6px 0 16px;">해당하는 걸 모두 골라 주세요.</div>' +
            '<div id="sym-chips" style="display:flex;flex-wrap:wrap;gap:8px;"></div>' +
            '<div id="sym-note" class="pg-warn" style="display:none;margin-top:14px;">37주 전에 배가 규칙적으로 뭉치면 바로 병원에 연락하세요.</div>' +
            '<textarea id="sym-memo" placeholder="남겨 두고 싶은 말 (선택)" style="width:100%;box-sizing:border-box;margin-top:16px;min-height:76px;padding:13px 14px;border:1px solid ' + LINE + ';' +
                'border-radius:14px;font-size:15px;font-family:inherit;color:' + INK2 + ';background:#FFF;resize:none;">' + esc(t.memo || "") + '</textarea>' +
            primary("저장", "window.saveSymSheet()"));
        paintSyms();
    };
    function paintSyms() {
        var box = document.getElementById("sym-chips"); if (!box) return;
        box.innerHTML = SYMS.map(function (s) {
            var on = symPick.indexOf(s) > -1;
            return '<span class="pg-chip' + (on ? ' on' : '') + '" onclick="window.__togSym(\'' + s + '\')">' + (on ? '✓ ' : '') + esc(s) + '</span>';
        }).join("");
        var w = weeksFromDue(dueDate());
        var note = document.getElementById("sym-note");
        if (note) note.style.display = (symPick.indexOf("배 뭉침") > -1 && w && w.weeks < 37) ? "flex" : "none";
    }
    window.__togSym = function (s) {
        var i = symPick.indexOf(s); if (i > -1) symPick.splice(i, 1); else symPick.push(s);
        paintSyms();
    };
    window.saveSymSheet = function () {
        var log = pregLog(), k = todayKey(), t = log.days[k] || {};
        t.sym = symPick.slice();
        t.memo = ((document.getElementById("sym-memo") || {}).value || "").trim();
        log.days[k] = t; savePregLog(log); closeSheet(); render();
        toast("오늘 몸 상태를 남겼어요");
    };

    window.openWeightSheet = function () {
        var log = pregLog(), lw = lastWeight(log);
        var hist = lw ? lw.keys.slice(-6).reverse().map(function (k) {
            return '<div><span>' + Number(k.slice(5, 7)) + '월 ' + Number(k.slice(8)) + '일</span><span style="color:' + INK2 + ';">' + Number(log.days[k].w).toFixed(1) + 'kg</span></div>';
        }).join("") : "";
        var diff = lw && lw.keys.length > 1 ? Math.round((lw.w - lw.first) * 10) / 10 : null;
        sheet('<div class="pg-serif" style="font-size:20px;font-weight:700;color:' + INK2 + ';">체중</div>' +
            '<div class="pg-meta" style="margin:6px 0 18px;">아침에 같은 조건으로 재면 비교하기 좋아요.</div>' +
            '<div style="display:flex;align-items:baseline;gap:8px;border-bottom:1.5px solid ' + INK2 + ';padding-bottom:6px;">' +
                '<input type="number" id="pg-weight" inputmode="decimal" step="0.1" min="30" max="200" value="' + (lw ? lw.w : "") + '" placeholder="0.0" ' +
                    'style="flex:1;min-width:0;border:0;outline:0;background:transparent;font-family:' + SERIF + ';font-size:34px;font-weight:700;color:' + INK2 + ';padding:0;">' +
                '<span class="pg-serif" style="font-size:18px;color:' + SUB2 + ';">kg</span></div>' +
            (diff !== null ? '<div class="pg-meta" style="margin-top:10px;">처음 기록보다 ' + (diff > 0 ? "+" : "") + diff.toFixed(1) + 'kg</div>' : '') +
            (hist ? '<div class="pg-list" style="margin-top:16px;">' + hist + '</div>' : '') +
            '<div style="font-size:11px;font-weight:600;color:' + MUTE + ';margin-top:12px;line-height:1.6;">얼마나 느는 게 맞는지는 사람마다 달라요. 병원에서 알려 준 기준을 따르세요.</div>' +
            primary("저장", "window.saveWeightSheet()"));
    };
    window.saveWeightSheet = function () {
        var v = Math.round(parseFloat((document.getElementById("pg-weight") || {}).value) * 10) / 10;
        if (!(v >= 30 && v <= 200)) return toast("체중을 다시 확인해 주세요");
        var log = pregLog(), k = todayKey(), t = log.days[k] || {};
        t.w = v; log.days[k] = t; savePregLog(log); closeSheet(); render();
        toast(v + "kg 남겼어요");
    };

    var kick = null, kickTick = null;
    window.openKickSheet = function () {
        kick = { start: Date.now(), count: 0 };
        var past = pregLog().kicks.slice(-5).reverse().map(function (s) {
            var d = new Date(s.start);
            return '<div><span>' + (d.getMonth() + 1) + '/' + d.getDate() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + '</span>' +
                '<span style="color:' + INK2 + ';">' + s.count + '번 · ' + Math.max(1, Math.round((s.end - s.start) / 60000)) + '분</span></div>';
        }).join("");
        var w = sheet('<div class="pg-serif" style="font-size:20px;font-weight:700;color:' + INK2 + ';">태동 세기</div>' +
            '<div class="pg-meta" style="margin:6px 0 22px;line-height:1.6;word-break:keep-all;">아기가 잘 움직이는 시간에 편하게 누워서, 느낄 때마다 원을 눌러 주세요.</div>' +
            '<div onclick="window.__kickTap()" style="position:relative;width:190px;height:190px;margin:0 auto;cursor:pointer;user-select:none;-webkit-user-select:none;">' +
                '<div id="kick-ring" style="position:absolute;inset:0;border-radius:50%;border:1.5px solid #CBBBA6;"></div>' +
                '<div style="position:absolute;inset:14px;border-radius:50%;background:#FFFAF1;border:1px solid ' + LINE + ';display:flex;flex-direction:column;align-items:center;justify-content:center;">' +
                    '<div id="kick-n" class="pg-serif" style="font-size:58px;font-weight:700;color:' + INK2 + ';line-height:1;">0</div>' +
                    '<div class="pg-meta" style="margin-top:8px;">느낄 때마다 눌러요</div></div></div>' +
            '<div id="kick-t" class="pg-meta" style="text-align:center;margin-top:16px;">0분째</div>' +
            '<div class="pg-warn" style="margin-top:18px;">평소보다 태동이 확 줄었다고 느껴지면, 기다리지 말고 바로 병원에 연락하세요.</div>' +
            (past ? '<div class="pg-list" style="margin-top:16px;">' + past + '</div>' : '') +
            primary("끝내고 저장", "window.__kickDone()"));
        if (kickTick) clearInterval(kickTick);
        kickTick = setInterval(function () {
            var t = document.getElementById("kick-t");
            if (!t || !kick) { clearInterval(kickTick); kickTick = null; return; }
            t.textContent = Math.floor((Date.now() - kick.start) / 60000) + "분째";
        }, 15000);
        w.onclick = function (e) { if (e.target === w) window.__kickDone(true); };
    };
    window.__kickTap = function () {
        if (!kick) return;
        kick.count++;
        var n = document.getElementById("kick-n"); if (n) n.textContent = kick.count;
        var r = document.getElementById("kick-ring");
        if (r) { r.style.animation = "none"; void r.offsetWidth; r.style.animation = "pgRipple .6s ease-out"; }
        if (navigator.vibrate) { try { navigator.vibrate(15); } catch (e) {} }
    };
    window.__kickDone = function (silent) {
        if (kickTick) { clearInterval(kickTick); kickTick = null; }
        if (kick && kick.count > 0) {
            var log = pregLog();
            log.kicks.push({ start: kick.start, end: Date.now(), count: kick.count });
            log.kicks = log.kicks.slice(-200);
            savePregLog(log);
            if (!silent) toast("태동 " + kick.count + "번을 남겼어요");
        }
        kick = null; closeSheet(); render();
    };

    /* ==========================================================
       B-④ 배냇함 '태어나기 전' 장
       배냇함 탭의 날짜 카드 맨 위에 '임신 20주 3일' 표를 단다.
       memorybox.js 는 안 고친다. 카드마다 부르는 renderAnniversary 를 감싼다.
       ========================================================== */
    function beforeBirth(key) {
        if (!dueDate()) return false;
        var born = localStorage.getItem("tosil_startDate");
        if (stage() === "pregnant") return true;
        return !!born && String(key) < born;
    }
    function pregChip(key) {
        if (!beta() || !beforeBirth(key)) return "";
        var w = weeksFromDue(dueDate(), fromKey(key));
        if (!w) return "";
        var first = localStorage.getItem("tosil_preg_since") === key;
        return '<div style="display:flex;gap:6px;flex-wrap:wrap;margin:0 0 10px;">' +
            (first ? '<span style="font-size:11px;font-weight:800;color:#8A5A00;background:#FFF3D6;padding:4px 10px;border-radius:9px;">💛 우리에게 와 준 날</span>' : '') +
            '<span style="font-size:11px;font-weight:800;color:' + GOLD + ';background:rgba(185,138,46,0.10);padding:4px 10px;border-radius:9px;">' +
                '🤰 임신 ' + w.weeks + '주 ' + w.days + '일</span></div>';
    }
    function hookBox() {
        var orig = window.renderAnniversary;
        if (orig && orig.__stage) return;
        var wrapped = function (key) {
            var base = "";
            if (typeof orig === "function") { try { base = orig.apply(this, arguments) || ""; } catch (e) {} }
            return pregChip(key) + base;
        };
        wrapped.__stage = true;
        window.renderAnniversary = wrapped;
    }
    window.__stageTest.pregChip = pregChip;

    /* ---------- 온보딩 첫 질문 ----------
       로그인 뒤 '아기 이름' 칸이 뜨는 순간에 그 위에 덮는다.
       '태어났어요' 를 고르면 덮개만 걷고 원래 온보딩으로 간다. */
    var asked = false, asked2 = false;
    function stageChooser() {
        var ov = document.createElement("div");
        ov.id = "stage-chooser";
        ov.setAttribute("style", "position:fixed;inset:0;z-index:10000000;background:#F6F2EC;display:flex;justify-content:center;");
        var opt = function (icon, t, sub, act, soon) {
            return '<div onclick="' + act + '" style="display:flex;align-items:center;gap:14px;padding:18px;border-radius:18px;background:#FFF;' +
                'border:1px solid #EDE6DE;margin-bottom:10px;cursor:pointer;' + (soon ? 'opacity:0.55;' : '') + '">' +
                
                '<div style="flex:1;"><div style="font-size:16px;font-weight:900;color:' + INK + ';">' + t + '</div>' +
                '<div style="font-size:12.5px;font-weight:600;color:' + SUB + ';margin-top:3px;">' + sub + '</div></div>' +
                (soon ? '<span style="font-size:11px;font-weight:800;color:' + GOLD + ';">곧 열려요</span>' : '<span style="color:#C4B5A9;">›</span>') +
            '</div>';
        };
        ov.innerHTML = '<div style="width:100%;max-width:480px;padding:72px 24px 32px;box-sizing:border-box;">' +
            '<div class="serif-display" style="font-size:25px;font-weight:700;color:' + INK + ';line-height:1.45;margin-bottom:10px;">지금 어디쯤이세요?</div>' +
            '<div style="font-size:13.5px;font-weight:600;color:' + SUB + ';line-height:1.7;margin-bottom:28px;">고르신 때에 맞춰 화면을 준비할게요. 나중에 바꿀 수 있어요.</div>' +
            opt("", "아기를 기다리고 있어요", "임신을 준비하는 중이에요", "window.chooseStage('prep')") +
            opt("", "아기가 찾아왔어요", "임신 중이에요", "window.chooseStage('pregnant')") +
            opt("", "아기가 태어났어요", "출산 후 기록을 시작해요", "window.chooseStage('born')") +
        '</div>';
        document.body.appendChild(ov);
    }
    window.chooseStage = function (s) {
        var ov = document.getElementById("stage-chooser");
        if (s === "prep") {                                    // prepstage.js 의 첫 시작 창
            if (ov) ov.remove();
            if (typeof window.openPrepOnboarding === "function") window.openPrepOnboarding();
            return;
        }
        if (s === "born") { setStage("born"); if (ov) ov.remove(); return; }
        if (ov) ov.remove();
        pregnantOnboarding();
    };
    function pregnantOnboarding() {
        sheet('<div class="pg-serif" style="font-size:20px;font-weight:700;color:#3B322C;margin-bottom:6px;">축하해요</div>' +
            '<div style="font-size:13px;font-weight:600;color:var(--text-sub);margin-bottom:16px;line-height:1.7;">세 가지만 알려 주세요.</div>' +
            '<div style="font-size:12.5px;font-weight:800;color:var(--text-sub);margin-bottom:6px;">태명 (없으면 비워 두세요)</div>' +
            '<input type="text" id="stage-tname" placeholder="예) 콩콩이" value="' + esc(localStorage.getItem("tosil_babyName") || "") + '">' +
            '<div style="font-size:12.5px;font-weight:800;color:var(--text-sub);margin:14px 0 6px;">출산 예정일</div>' +
            '<input type="date" id="stage-due">' +
            '<div style="font-size:12px;font-weight:700;color:var(--text-sub);margin:10px 0 6px;">모르면 마지막 생리 시작일로 계산할게요</div>' +
            '<input type="date" id="stage-lmp" max="' + todayKey() + '" onchange="var d=document.getElementById(\'stage-due\'); if(d) d.value=window.__stageTest.dueFromLmp(this.value);">' +
            consentHTML("preg") +
            primary("시작하기", "window.savePregnantOnboarding()"));
    }
    window.savePregnantOnboarding = function () {
        var c = document.getElementById("sens-consent");
        if (c && !c.checked) return toast("민감정보 동의에 체크해 주세요");
        var due = (document.getElementById("stage-due") || {}).value || "";
        if (!weeksFromDue(due)) return toast("예정일을 다시 확인해 주세요");
        var nm = ((document.getElementById("stage-tname") || {}).value || "").trim() || "우리 아기";
        try {
            localStorage.setItem("tosil_babyName", nm);
            localStorage.setItem("tosil_due_date", due);
            /* 동의 기록은 아래 recordConsent 가 남긴다 */
        } catch (e) {}
        setStage("pregnant");
        recordConsent("preg");
        closeSheet();
        var ov = document.getElementById("onboarding-overlay"); if (ov) ov.style.display = "none";
        setTimeout(function () { location.reload(); }, 300);
    };
    /* 아기를 더할 때(둘째 · 셋째): 이름을 받은 뒤 '생일' 칸이 뜨는 순간에 한 번 묻는다 */
    function watchAddBaby() {
        if (!beta() || asked2) return;
        var s2 = document.getElementById("onboarding-step-2"), ov = document.getElementById("onboarding-overlay");
        if (!s2 || !ov || ov.style.display === "none" || s2.style.display !== "flex") return;
        if (!(window.currentBabySuffix || "") || localStorage.getItem("tosil_startDate") || stage() !== "born") return;
        asked2 = true;
        var opt = function (t, sub, act) {
            return '<div onclick="' + act + '" style="padding:16px;border-radius:16px;background:#FFF;border:1px solid #EDE6DE;margin-top:10px;cursor:pointer;">' +
                '<div style="font-size:15.5px;font-weight:800;color:#3B322C;">' + t + '</div><div style="font-size:12.5px;font-weight:600;color:#8A7F76;margin-top:3px;">' + sub + '</div></div>';
        };
        sheet('<div class="pg-serif" style="font-size:20px;font-weight:700;color:#3B322C;">' + esc(babyName()) + ', 지금 어디쯤이에요?</div>' +
            opt("태어났어요", "생일을 넣고 기록을 시작해요", "document.getElementById('stage-sheet').remove()") +
            opt("아직 배 속에 있어요", "예정일로 주수를 세요", "window.__addAsPregnant()") +
            (typeof window.openPrepOnboarding === "function" ? opt("기다리고 있어요", "임신을 준비하는 중이에요", "document.getElementById('stage-sheet').remove(); window.openPrepOnboarding()") : ''));
    }
    window.__addAsPregnant = function () { closeSheet(); pregnantOnboarding(); };

    function watchOnboarding() {
        watchAddBaby();
        if (!beta() || asked) return;
        var s1 = document.getElementById("onboarding-step-1");
        var ov = document.getElementById("onboarding-overlay");
        if (!s1 || !ov || ov.style.display === "none" || s1.style.display !== "flex") return;
        if (localStorage.getItem("tosil_babyName")) return;          // 다둥이 추가 · 정보 수정 때는 아래에서 따로 묻는다
        asked = true;
        stageChooser();
    }

    /* ---------- 설정 탭: 테스트 카드 ---------- */
    function settingsCard() {
        if (!beta()) return;
        var host = document.getElementById("tab-settings");
        if (!host || document.getElementById("stage-beta-card")) return;
        var s = stage(), t = tester();
        if (!t && s === "born") return;                      // 공개 뒤: 임신 · 준비 중인 아기에게만 관리 카드
        var btn = function (label, act) { return '<div onclick="' + act + '" class="pg-btn" style="flex:1 1 40%;padding:12px;">' + label + '</div>'; };
        var card = document.createElement("div");
        card.id = "stage-beta-card";
        card.setAttribute("style", "background:var(--bg-card);padding:18px 20px;border-radius:16px;border:1px " + (t ? "dashed " + PURPLE : "solid var(--border)") + ";margin-bottom:12px;");
        card.innerHTML = '<div style="font-size:15px;font-weight:900;color:var(--text-m);margin-bottom:4px;">' + (t ? '🧪 단계 미리 써보기' : '임신 · 준비 기록') + '</div>' +
            '<div style="font-size:12px;font-weight:600;color:var(--text-sub);margin-bottom:12px;">' +
                (t ? '시험 스위치가 켜진 폰에서만 보여요. ' : '') + '지금: <b>' + ({ born: "태어났어요", pregnant: "임신 중", paused: "기록 멈춤", prep: "준비" }[s] || s) + '</b></div>' +
            '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
                (t ? btn("준비로 보기", "window.setBabyStage(\'prep\')") + btn("임신 중으로 보기", "window.setBabyStage(\'pregnant\')") + btn("태어남으로 돌아가기", "window.setBabyStage(\'born\')") : '') +
                (s === "pregnant" ? btn("예정일 바꾸기", "window.openDueSheet()") : '') +
                (s === "prep" && typeof window.openPrepSetup === "function" ? btn("주기 · 방식 바꾸기", "window.openPrepSetup()") : '') +
            '</div>' +
            (s === "pregnant" ? '<div onclick="window.openStopSheet()" style="margin-top:14px;font-size:12px;font-weight:700;color:#B5AAA0;text-align:center;cursor:pointer;">임신을 이어가지 못했어요</div>' : '') +
            (s !== "born" ? '<div onclick="window.openWipeSheet()" style="margin-top:10px;font-size:12px;font-weight:700;color:#B5AAA0;text-align:center;cursor:pointer;">임신 · 준비 기록 모두 지우기</div>' : '');
        host.insertBefore(card, host.firstChild);
    }

    /* ---------- 민감정보 별도 동의 (개인정보 보호법 제23조) ----------
       목적 · 항목 · 보유 기간 · 거부할 권리와 그 불이익, 네 가지를 동의 받을 때 같이 알려야 한다.
       동의한 사람 · 때 · 문구 판을 가족 서버(growth_ · 도우미에게는 안 보임)에 남겨 둔다. */
    var CONSENT_VER = "2026-10 v1";
    var CONSENT_ITEMS = {
        preg: "출산 예정일과 주수, 증상 · 체중 · 태동 기록, 초음파 사진 · 심장 소리, 열 달의 문답",
        prep: "생리 시작일과 주기, 기초체온, 배란 테스트 결과, 시술 일정(이식일 · 피검사일), 몸 상태 기록"
    };
    function consentHTML(kind) {
        var row = function (k, v) {
            return '<div style="display:flex;gap:10px;padding:6px 0;"><span style="width:42px;flex-shrink:0;font-weight:800;color:' + INK2 + ';">' + k + '</span>' +
                '<span style="flex:1;word-break:keep-all;">' + v + '</span></div>';
        };
        return '<div style="margin-top:18px;padding:12px 14px;border:1px solid ' + LINE + ';border-radius:14px;background:#FFFAF1;font-size:12px;font-weight:600;color:' + SUB2 + ';line-height:1.6;">' +
                '<div style="font-size:12.5px;font-weight:800;color:' + INK2 + ';margin-bottom:4px;">민감정보 수집 · 이용 동의 (필수)</div>' +
                row("목적", "기록 보관, 엄마 · 아빠 가족 공유, 날짜 계산") +
                row("항목", CONSENT_ITEMS[kind] || CONSENT_ITEMS.preg) +
                row("보유", "회원 탈퇴하거나 기록을 지울 때까지") +
                row("거부", "동의하지 않아도 배냇함의 다른 기능은 그대로 써요. 이 기록만 쓸 수 없어요.") +
                '<div style="margin-top:6px;">돌봄 도우미에게는 보이지 않아요. <a href="privacy.html#sensitive" target="_blank" rel="noopener" style="color:' + INK2 + ';font-weight:800;">자세히 ›</a></div>' +
            '</div>' +
            '<label style="display:flex;gap:10px;align-items:center;margin-top:12px;font-size:13.5px;font-weight:700;color:' + INK2 + ';">' +
                '<input type="checkbox" id="sens-consent" style="width:20px;height:20px;flex-shrink:0;accent-color:' + INK2 + ';">위 내용에 동의해요</label>';
    }
    function recordConsent(kind) {
        var at = new Date().toISOString();
        try { localStorage.setItem("tosil_sensitive_consent", at); localStorage.setItem("tosil_guardian_consent", at); } catch (e) {}
        var uid = window.auth && window.auth.currentUser && window.auth.currentUser.uid, r = stageRef();
        if (uid && r && typeof window.setDoc === "function") {
            var c = {}; c[uid] = { kind: kind, at: at, ver: CONSENT_VER };
            try { window.setDoc(r, { consents: c }, { merge: true }).catch(function () {}); } catch (e) {}
        }
    }

    /* ---------- 다른 파일(heartbeat.js 등)이 같은 모양을 쓰게 ---------- */
    window.stageUI = {
        sheet: sheet, closeSheet: closeSheet, primary: primary, esc: esc,
        todayKey: todayKey, keyOf: keyOf, fromKey: fromKey, weeksFromDue: weeksFromDue,
        dueDate: dueDate, babyName: babyName, ICO: ICO, consentHTML: consentHTML, recordConsent: recordConsent,
        tokens: { PAPER: PAPER, LINE: LINE, INK2: INK2, SUB2: SUB2, MUTE: MUTE, TINT: TINT, SERIF: SERIF, GOLD: GOLD }
    };

    /* ---------- 시작 ---------- */
    function boot() {
        setTimeout(refreshLive, 3500);             // 스위치가 꺼져 있어도 서버 스위치는 확인한다
        if (!beta()) return;                       // 스위치가 꺼져 있으면 아무것도 안 한다
        css();
        render();
        hookBox();
        setTimeout(function () { watchStage(); quiet(); }, 3500);   // 로그인·파이어베이스가 자리 잡은 뒤
        var origin = window.renderSettingsTab;
        window.renderSettingsTab = function () {
            var out; if (typeof origin === "function") out = origin.apply(this, arguments);
            setTimeout(settingsCard, 100);
            return out;
        };
        setInterval(watchOnboarding, 400);
        setTimeout(render, 1500);
        setTimeout(render, 4000);                  // 다른 카드들이 늦게 붙어도 숨김이 따라가게
        document.addEventListener("visibilitychange", function () { if (!document.hidden) render(); });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    window.stageDebug = function () {
        console.log("숨김 스위치:", beta(), "· 단계:", stage(), "· 예정일:", dueDate(), "·", weeksFromDue(dueDate()));
    };
})();