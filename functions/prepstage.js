/* ============================================================
   배냇함 — 준비 단계 (prepstage.js)              ※ 숨김 스위치 뒤 (stage.js)

   "아기를 기다리고 있어요" 를 고른 집의 홈.
   예전 준비 모드에서 쓸 만한 것만 골라 새로 지었다.
     · 이번 주기: 점 하나가 하루. 가임기 예상은 금색으로
     · 오늘: 기초체온 · 배테기 · 몸 상태
     · 이번 주기 체온 그래프
     · 둘이 챙길 것 (엄마 · 아빠 따로, 남편 폰과 같이)
     · 기다리는 날 — 결과보다 마음을 먼저
     · 시술 중이면: 이식 후 며칠, 피검사까지 며칠
     · '두 줄 봤어요' → 마지막 생리일로 예정일을 계산해 임신 중으로 넘어간다

   ⚠️ 날짜는 지난 주기로 계산한 '예상' 이다. 피임 목적으로 쓰면 안 된다고 늘 적는다.
      약 · 영양제 용량은 말하지 않는다. 남편 등급 · 경험치 같은 건 없다.
      생리가 다시 시작돼도 '실패' 라고 하지 않는다.

   저장: 아기마다 tosil_prep = { mode, cycle, periods{날짜:1}, days{날짜:{bbt,lh,sym,at}},
                               ivf{transfer,beta,at}, items{mom[],dad[]}, routine{날짜:{mom[],dad[],at}} }
   동기화: growth_가족코드(+꼬리표)/stage 의 prep 칸 — 날짜마다 따로 덮어쓴다

   index.html 에서 stage.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var DAY = 86400000;
    function ui() { return window.stageUI || null; }
    function toast(m) { if (typeof window.showToast === "function") window.showToast(m); }
    function pad(n) { return String(n).padStart(2, "0"); }
    function keyOf(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
    function fromKey(k) { var p = String(k || "").split("-"); return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2])); }
    function today0() { var t = new Date(); t.setHours(0, 0, 0, 0); return t; }
    function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
    function diffDays(a, b) { return Math.round((a - b) / DAY); }
    function md(d) { return (d.getMonth() + 1) + "월 " + d.getDate() + "일"; }

    var DEF_ITEMS = { mom: [{ id: "m1", t: "엽산 챙기기" }], dad: [{ id: "d1", t: "30분 걷기" }] };

    /* ---------- 저장 ---------- */
    function load() {
        var v = null;
        try { v = JSON.parse(localStorage.getItem("tosil_prep")); } catch (e) {}
        v = (v && typeof v === "object") ? v : {};
        v.mode = v.mode || "natural"; v.cycle = Number(v.cycle) || 0;
        v.periods = v.periods || {}; v.days = v.days || {}; v.ivf = v.ivf || {};
        v.items = v.items || JSON.parse(JSON.stringify(DEF_ITEMS)); v.routine = v.routine || {};
        return v;
    }
    function save(v) { try { localStorage.setItem("tosil_prep", JSON.stringify(v)); } catch (e) {} }

    /* ---------- 동기화 (칸마다 따로) ---------- */
    function ref() {
        var code = localStorage.getItem("family_sync_code");
        if (!code || !window.db || typeof window.doc !== "function") return null;
        return window.doc(window.db, "growth_" + code + (window.currentBabySuffix || ""), "stage");
    }
    function push(patch) {
        var r = ref(); if (!r || typeof window.setDoc !== "function") return;
        try { window.setDoc(r, { prep: patch }, { merge: true }).catch(function (e) { console.warn("[준비] 올리기 실패", e); }); } catch (e) {}
    }
    function newer(a, b) { return Number((a || {}).at || 0) > Number((b || {}).at || 0); }
    function merge(remote) {
        if (!remote || typeof remote !== "object") return false;
        var p = load(), ch = false;
        Object.keys(remote.periods || {}).forEach(function (k) { if (p.periods[k] !== remote.periods[k]) { p.periods[k] = remote.periods[k]; ch = true; } });
        ["days", "routine"].forEach(function (box) {
            Object.keys(remote[box] || {}).forEach(function (k) { if (newer(remote[box][k], p[box][k])) { p[box][k] = remote[box][k]; ch = true; } });
        });
        if (remote.ivf && newer(remote.ivf, p.ivf)) { p.ivf = remote.ivf; ch = true; }
        if (remote.setup && newer(remote.setup, p.setup)) { p.setup = remote.setup; p.mode = remote.setup.mode || p.mode; p.cycle = remote.setup.cycle || p.cycle; ch = true; }
        if (remote.itemsAt && Number(remote.itemsAt) > Number(p.itemsAt || 0) && remote.items) { p.items = remote.items; p.itemsAt = remote.itemsAt; ch = true; }
        if (ch) save(p);
        return ch;
    }
    function watch() {
        var r = ref(); if (!r || typeof window.onSnapshot !== "function") return;
        window.onSnapshot(r, function (snap) {
            if (snap.exists() && merge((snap.data() || {}).prep)) refresh();
        }, function () {});
    }
    function refresh() { if (typeof window.refreshStageHome === "function") window.refreshStageHome(); }

    /* ---------- 주기 계산 ---------- */
    function periodList(p) { return Object.keys(p.periods).filter(function (k) { return p.periods[k]; }).sort(); }
    function avgCycle(p) {
        var L = periodList(p), gaps = [];
        for (var i = 1; i < L.length; i++) { var g = diffDays(fromKey(L[i]), fromKey(L[i - 1])); if (g >= 20 && g <= 45) gaps.push(g); }
        gaps = gaps.slice(-3);
        if (gaps.length) return Math.round(gaps.reduce(function (a, b) { return a + b; }, 0) / gaps.length);
        return p.cycle >= 20 && p.cycle <= 45 ? p.cycle : 28;
    }
    function cycleInfo(p) {
        var L = periodList(p); if (!L.length) return null;
        var last = fromKey(L[L.length - 1]), len = avgCycle(p), t = today0();
        var day = diffDays(t, last) + 1, next = addDays(last, len), ov = addDays(next, -14);
        return { last: last, lastKey: L[L.length - 1], len: len, day: day, next: next, ov: ov,
                 fFrom: addDays(ov, -5), fTo: addDays(ov, 1), late: diffDays(t, next) };
    }
    window.__prepTest = { cycleInfo: cycleInfo, avgCycle: avgCycle, load: load };

    /* ---------- 작은 아이콘 (stage.js 와 같은 선) ---------- */
    function svg(p) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>'; }
    var IC = {
        temp: svg('<path d="M10 14.5V5a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0z"/><path d="M12 9v6.5"/>'),
        strip: svg('<rect x="9" y="3" width="6" height="18" rx="2"/><path d="M9 9h6M9 13h6"/>'),
        pen: svg('<path d="M4 20h4L19.2 8.8a2 2 0 0 0 0-2.8l-1.2-1.2a2 2 0 0 0-2.8 0L4 16v4z"/><path d="M13.5 6.5l4 4"/>')
    };

    /* ---------- 홈 ---------- */
    function heroNatural(p, T, u) {
        var ci = cycleInfo(p);
        if (!ci) {
            return '<div class="pg-paper" style="text-align:center;padding:30px 22px;">' +
                '<div class="pg-serif" style="font-size:20px;font-weight:700;color:' + T.INK2 + ';margin-bottom:8px;">마지막 생리 시작일을 알려 주세요</div>' +
                '<div class="pg-meta" style="margin-bottom:18px;line-height:1.7;">그날부터 이번 주기를 셀게요.</div>' +
                u.primary("날짜 넣기", "window.openPeriodSheet()") + '</div>';
        }
        var n = Math.min(45, Math.max(ci.len, ci.day)), dots = "";
        for (var i = 1; i <= n; i++) {
            var d = addDays(ci.last, i - 1), fertile = d >= ci.fFrom && d <= ci.fTo, isOv = diffDays(d, ci.ov) === 0;
            var st = i < ci.day ? "background:" + (fertile ? "#E2C989" : "#D9CBB6") + ";"
                   : i === ci.day ? "border:2px solid " + T.INK2 + ";" + (fertile ? "background:#F3E4BE;" : "")
                   : fertile ? "background:#F3E4BE;" + (isOv ? "border:2px solid " + T.GOLD + ";" : "") : "border:1.5px solid " + T.LINE + ";";
            dots += '<span class="pg-dot" style="' + st + '"></span>';
        }
        var t = today0(), lines;
        if (ci.late > 0) lines = '예정일이 ' + ci.late + '일 지났어요 · 테스트해 볼 수 있어요';
        else if (t < ci.fFrom) lines = '가임기 예상 ' + md(ci.fFrom) + ' ~ ' + md(ci.fTo);
        else if (t <= ci.fTo) lines = '지금이 가임기 예상 기간이에요 · ' + md(ci.fTo) + '까지';
        else lines = '다음 생리 예정 ' + md(ci.next);
        return '<div class="pg-paper" style="padding:24px 22px 20px;">' +
            '<div style="display:flex;justify-content:space-between;align-items:baseline;">' +
                '<span class="pg-serif" style="font-size:20px;font-weight:700;color:' + T.INK2 + ';">이번 주기</span>' +
                '<span class="pg-meta">' + ci.len + '일 주기로 계산</span></div>' +
            '<div class="pg-serif" style="font-size:46px;font-weight:700;color:' + T.INK2 + ';letter-spacing:-1.5px;line-height:1;margin:16px 0 20px;">' +
                ci.day + '<span style="font-size:20px;margin-left:4px;">일째</span></div>' +
            '<div class="pg-dots">' + dots + '</div>' +
            '<div class="pg-meta" style="margin-top:14px;color:' + (ci.late > 0 ? '#9A6B12' : T.SUB2) + ';">' + lines + '</div>' +
            '<div style="display:flex;gap:14px;margin-top:10px;font-size:11.5px;font-weight:600;color:' + T.MUTE + ';">' +
                '<span><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#F3E4BE;margin-right:5px;"></span>가임기 예상</span>' +
                '<span onclick="window.openPrepSetup()" style="margin-left:auto;cursor:pointer;color:' + T.INK2 + ';">주기 · 방식 바꾸기 ›</span></div>' +
        '</div>';
    }
    function heroIVF(p, T, u) {
        var tr = p.ivf.transfer ? fromKey(p.ivf.transfer) : null, be = p.ivf.beta ? fromKey(p.ivf.beta) : null, t = today0();
        var big = tr ? (diffDays(t, tr) >= 0 ? diffDays(t, tr) + '<span style="font-size:20px;margin-left:4px;">일째</span>' : 'D-' + diffDays(tr, t)) : '—';
        return '<div class="pg-paper" style="padding:24px 22px 20px;">' +
            '<div style="display:flex;justify-content:space-between;align-items:baseline;">' +
                '<span class="pg-serif" style="font-size:20px;font-weight:700;color:' + T.INK2 + ';">' + (tr && diffDays(t, tr) >= 0 ? '이식 후' : '이식까지') + '</span>' +
                '<span onclick="window.openPrepSetup()" class="pg-meta" style="cursor:pointer;color:' + T.INK2 + ';">날짜 바꾸기 ›</span></div>' +
            '<div class="pg-serif" style="font-size:46px;font-weight:700;color:' + T.INK2 + ';letter-spacing:-1.5px;line-height:1;margin:16px 0 14px;">' + big + '</div>' +
            '<div class="pg-meta">' + (be ? '피검사 ' + md(be) + (diffDays(be, t) > 0 ? ' · D-' + diffDays(be, t) : diffDays(be, t) === 0 ? ' · 오늘' : '') : '피검사 날짜를 넣으면 남은 날을 세 드려요') + '</div>' +
            '<div style="font-size:11.5px;font-weight:600;color:' + T.MUTE + ';margin-top:12px;line-height:1.6;">약과 주사는 병원 안내대로 해 주세요. 배냇함은 날짜만 세요.</div>' +
        '</div>';
    }
    function todayHTML(p, T, u) {
        var d = p.days[keyOf(today0())] || {};
        var LH = { neg: "한 줄", faint: "희미해요", pos: "진해요" };
        var row = function (ico, label, val, on, act) {
            return '<div class="pg-row" onclick="' + act + '"><div class="pg-ico">' + ico + '</div>' +
                '<div style="flex:1;font-size:15px;font-weight:700;color:' + T.INK2 + ';">' + label + '</div>' +
                '<div style="max-width:48%;text-align:right;font-size:13.5px;font-weight:600;color:' + (on ? T.INK2 : T.MUTE) + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + u.esc(val) + '</div>' +
                '<span style="color:' + T.MUTE + ';font-size:15px;margin-left:2px;">›</span></div>';
        };
        var now = new Date();
        return '<div class="pg-paper" style="padding:10px 20px 4px;">' +
            '<div style="display:flex;justify-content:space-between;align-items:baseline;padding:12px 0;">' +
                '<span class="pg-h">오늘</span><span class="pg-meta">' + (now.getMonth() + 1) + '월 ' + now.getDate() + '일</span></div>' +
            row(IC.temp, "기초체온", d.bbt ? Number(d.bbt).toFixed(2) + "℃" : "남기기", !!d.bbt, "window.openBbtSheet()") +
            (p.mode === "natural" ? row(IC.strip, "배테기", d.lh ? LH[d.lh] : "남기기", !!d.lh, "window.openLhSheet()") : "") +
            row(IC.pen, "몸 상태", (d.sym && d.sym.length) ? d.sym.join(", ") : "남기기", !!(d.sym && d.sym.length), "window.openPrepSymSheet()") +
        '</div>';
    }
    function chartHTML(p, T) {
        var ci = cycleInfo(p); if (!ci || p.mode !== "natural") return "";
        var pts = [];
        for (var i = 0; i < Math.max(ci.len, ci.day); i++) {
            var k = keyOf(addDays(ci.last, i)), d = p.days[k];
            if (d && d.bbt) pts.push({ i: i, v: Number(d.bbt), lh: d.lh === "pos" });
        }
        if (pts.length < 2) return "";
        var W = 300, H = 120, n = Math.max(ci.len, ci.day), lo = Math.min.apply(null, pts.map(function (x) { return x.v; })) - 0.1, hi = Math.max.apply(null, pts.map(function (x) { return x.v; })) + 0.1;
        var X = function (i) { return 8 + i * (W - 16) / Math.max(1, n - 1); }, Y = function (v) { return 10 + (hi - v) * (H - 20) / Math.max(0.2, hi - lo); };
        var fx1 = X(diffDays(ci.fFrom, ci.last)), fx2 = X(diffDays(ci.fTo, ci.last));
        var line = pts.map(function (q) { return X(q.i).toFixed(1) + "," + Y(q.v).toFixed(1); }).join(" ");
        var dots = pts.map(function (q) { return '<circle cx="' + X(q.i).toFixed(1) + '" cy="' + Y(q.v).toFixed(1) + '" r="' + (q.lh ? 4.5 : 3) + '" fill="' + (q.lh ? T.GOLD : T.INK2) + '"/>'; }).join("");
        return '<div class="pg-paper">' +
            '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;"><span class="pg-h">이번 주기 체온</span>' +
                '<span class="pg-meta">' + lo.toFixed(1) + '~' + hi.toFixed(1) + '℃</span></div>' +
            '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;display:block;">' +
                '<rect x="' + Math.max(0, fx1).toFixed(1) + '" y="0" width="' + Math.max(0, fx2 - fx1).toFixed(1) + '" height="' + H + '" fill="#F8EDD3" rx="4"/>' +
                '<polyline points="' + line + '" fill="none" stroke="' + T.INK2 + '" stroke-width="1.6" stroke-linejoin="round"/>' + dots + '</svg>' +
            '<div style="display:flex;gap:14px;margin-top:8px;font-size:11.5px;font-weight:600;color:' + T.MUTE + ';">' +
                '<span>■ <span style="color:#E2C989;">가임기 예상</span></span><span><span style="color:' + T.GOLD + ';">●</span> 배테기 진함</span></div>' +
        '</div>';
    }
    function routineHTML(p, T, u) {
        var k = keyOf(today0()), r = p.routine[k] || {};
        var col = function (slot, label) {
            return '<div style="flex:1;min-width:0;">' +
                '<div class="pg-meta" style="margin-bottom:8px;color:' + T.INK2 + ';font-weight:800;">' + label + '</div>' +
                (p.items[slot] || []).map(function (it) {
                    var on = (r[slot] || []).indexOf(it.id) > -1;
                    return '<div onclick="window.__prepTick(\'' + slot + '\',\'' + it.id + '\')" style="display:flex;gap:9px;align-items:center;padding:8px 0;cursor:pointer;">' +
                        '<span style="width:20px;height:20px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;color:#FFF;' +
                            (on ? 'background:' + T.INK2 + ';' : 'border:1.5px solid #CBBBA6;') + '">' + (on ? '✓' : '') + '</span>' +
                        '<span style="font-size:14px;font-weight:600;color:' + (on ? T.MUTE : T.INK2) + ';' + (on ? 'text-decoration:line-through;' : '') + 'word-break:keep-all;">' + u.esc(it.t) + '</span></div>';
                }).join("") +
                '<div onclick="window.__prepAddItem(\'' + slot + '\')" class="pg-meta" style="padding:6px 0;cursor:pointer;">+ 더하기</div></div>';
        };
        return '<div class="pg-paper">' +
            '<div class="pg-h" style="margin-bottom:12px;">둘이 챙길 것</div>' +
            '<div style="display:flex;gap:16px;">' + col("mom", "엄마") + '<div style="width:1px;background:' + T.LINE + ';"></div>' + col("dad", "아빠") + '</div>' +
        '</div>';
    }
    function waitHTML(p, T, u) {
        var t = today0(), dayN = 0, show = false, late = 0;
        if (p.mode === "ivf" && p.ivf.transfer) { dayN = diffDays(t, fromKey(p.ivf.transfer)); show = dayN >= 1; }
        else { var ci = cycleInfo(p); if (ci) { dayN = diffDays(t, ci.ov); show = dayN >= 1; late = ci.late; } }
        if (!show) return "";
        return '<div class="pg-paper" style="background:#FFFAF1;">' +
            '<div class="pg-h">기다리는 날</div>' +
            '<div style="font-size:14px;font-weight:500;color:' + T.INK2 + ';line-height:1.8;margin-top:10px;word-break:keep-all;">' +
                (late > 0 ? '생리 예정일이 지났어요. 테스트해 볼 수 있어요. 결과가 어떻든, 여기까지 둘이 함께 왔어요.'
                          : '결과를 기다리는 날들이에요. 몸의 작은 변화에 너무 마음 쓰지 않아도 괜찮아요. 오늘은 둘이 좋아하는 걸 하나 해 보세요.') + '</div>' +
        '</div>';
    }
    function footHTML(p, T) {
        return '<div style="display:flex;gap:8px;margin:4px 0 12px;">' +
            '<div onclick="window.__prepPositive()" style="flex:1;text-align:center;padding:15px;border-radius:14px;background:' + T.INK2 + ';color:#FFFDF9;font-size:14.5px;font-weight:700;cursor:pointer;">두 줄 봤어요</div>' +
            (p.mode === "natural" ? '<div onclick="window.openPeriodSheet()" style="flex:1;text-align:center;padding:15px;border-radius:14px;border:1px solid ' + T.LINE + ';background:' + T.PAPER + ';color:' + T.INK2 + ';font-size:14.5px;font-weight:700;cursor:pointer;">생리 시작했어요</div>' : '') +
        '</div>' +
        '<div style="font-size:11px;font-weight:600;color:' + T.MUTE + ';line-height:1.7;margin:0 4px 26px;word-break:keep-all;">' +
            '날짜는 지난 주기로 계산한 예상이라 실제와 다를 수 있어요. 피임 목적으로 쓰지 마세요. ' +
            '피임 없이 1년이 지나도 소식이 없으면 병원과 상의해 보세요. 모자보건법은 이때를 난임으로 봐요.</div>';
    }
    window.stagePrepHTML = function () {
        var u = ui(); if (!u) return "";
        var T = u.tokens, p = load();
        return (p.mode === "ivf" ? heroIVF(p, T, u) : heroNatural(p, T, u)) + todayHTML(p, T, u) + waitHTML(p, T, u) +
            chartHTML(p, T) + routineHTML(p, T, u) + footHTML(p, T);
    };

    /* ---------- 기록 시트 ---------- */
    function setDay(patch) {
        var p = load(), k = keyOf(today0()), d = p.days[k] || {};
        Object.keys(patch).forEach(function (x) { d[x] = patch[x]; });
        d.at = Date.now(); p.days[k] = d; save(p);
        var o = { days: {} }; o.days[k] = d; push(o);
        refresh();
    }
    window.openBbtSheet = function () {
        var u = ui(), T = u.tokens, d = load().days[keyOf(today0())] || {};
        u.sheet('<div class="pg-serif" style="font-size:20px;font-weight:700;color:' + T.INK2 + ';">기초체온</div>' +
            '<div class="pg-meta" style="margin:6px 0 18px;">아침에 눈 뜨자마자, 움직이기 전에 같은 시간에 재면 좋아요.</div>' +
            '<div style="display:flex;align-items:baseline;gap:8px;border-bottom:1.5px solid ' + T.INK2 + ';padding-bottom:6px;">' +
                '<input type="number" id="pp-bbt" inputmode="decimal" step="0.01" min="35" max="38" value="' + (d.bbt || "") + '" placeholder="36.50" ' +
                    'style="flex:1;min-width:0;border:0;outline:0;background:transparent;font-family:' + T.SERIF + ';font-size:34px;font-weight:700;color:' + T.INK2 + ';padding:0;">' +
                '<span class="pg-serif" style="font-size:18px;color:' + T.SUB2 + ';">℃</span></div>' +
            u.primary("저장", "window.__saveBbt()"));
    };
    window.__saveBbt = function () {
        var v = Math.round(parseFloat((document.getElementById("pp-bbt") || {}).value) * 100) / 100;
        if (!(v >= 35 && v <= 38)) return toast("체온을 다시 확인해 주세요");
        setDay({ bbt: v }); ui().closeSheet(); toast(v.toFixed(2) + "℃ 남겼어요");
    };
    window.openLhSheet = function () {
        var u = ui(), T = u.tokens;
        var b = function (k, t, s) {
            return '<div onclick="window.__saveLh(\'' + k + '\')" style="padding:16px;border-radius:14px;border:1px solid ' + T.LINE + ';background:#FFF;margin-top:8px;cursor:pointer;">' +
                '<div style="font-size:15px;font-weight:700;color:' + T.INK2 + ';">' + t + '</div><div class="pg-meta" style="margin-top:3px;">' + s + '</div></div>';
        };
        u.sheet('<div class="pg-serif" style="font-size:20px;font-weight:700;color:' + T.INK2 + ';">배테기 결과</div>' +
            '<div class="pg-meta" style="margin:6px 0 8px;">검사선이 대조선과 비교해 어땠나요?</div>' +
            b("neg", "한 줄", "검사선이 안 보여요") + b("faint", "희미해요", "검사선이 대조선보다 옅어요") + b("pos", "진해요", "검사선이 대조선만큼 또는 더 진해요"));
    };
    window.__saveLh = function (k) { setDay({ lh: k }); ui().closeSheet(); toast("배테기를 남겼어요"); };
    var SYM = ["배란통", "냉 변화", "가슴이 아파요", "피곤해요", "예민해요", "출혈이 비쳐요", "괜찮아요"];
    var pick = [];
    window.openPrepSymSheet = function () {
        var u = ui(), T = u.tokens, d = load().days[keyOf(today0())] || {};
        pick = (d.sym || []).slice();
        u.sheet('<div class="pg-serif" style="font-size:20px;font-weight:700;color:' + T.INK2 + ';">오늘 몸 상태</div>' +
            '<div class="pg-meta" style="margin:6px 0 16px;">해당하는 걸 모두 골라 주세요.</div>' +
            '<div id="pp-chips" style="display:flex;flex-wrap:wrap;gap:8px;"></div>' + u.primary("저장", "window.__savePrepSym()"));
        paint();
    };
    function paint() {
        var box = document.getElementById("pp-chips"); if (!box) return;
        box.innerHTML = SYM.map(function (s) {
            var on = pick.indexOf(s) > -1;
            return '<span class="pg-chip' + (on ? ' on' : '') + '" onclick="window.__togPrepSym(\'' + s + '\')">' + (on ? '✓ ' : '') + s + '</span>';
        }).join("");
    }
    window.__togPrepSym = function (s) { var i = pick.indexOf(s); if (i > -1) pick.splice(i, 1); else pick.push(s); paint(); };
    window.__savePrepSym = function () { setDay({ sym: pick.slice() }); ui().closeSheet(); toast("오늘 몸 상태를 남겼어요"); };

    /* ---------- 둘이 챙길 것 ---------- */
    window.__prepTick = function (slot, id) {
        var p = load(), k = keyOf(today0()), r = p.routine[k] || {};
        var a = r[slot] || []; var i = a.indexOf(id); if (i > -1) a.splice(i, 1); else a.push(id);
        r[slot] = a; r.at = Date.now(); p.routine[k] = r; save(p);
        var o = { routine: {} }; o.routine[k] = r; push(o); refresh();
    };
    window.__prepAddItem = function (slot) {
        var t = prompt((slot === "dad" ? "아빠" : "엄마") + "가 챙길 것 (예: 일찍 자기)");
        if (!t || !t.trim()) return;
        var p = load(); p.items[slot] = (p.items[slot] || []).concat([{ id: slot[0] + Date.now().toString(36), t: t.trim().slice(0, 20) }]);
        p.itemsAt = Date.now(); save(p); push({ items: p.items, itemsAt: p.itemsAt }); refresh();
    };

    /* ---------- 생리 시작 · 두 줄 ---------- */
    window.openPeriodSheet = function () {
        var u = ui(), T = u.tokens;
        u.sheet('<div class="pg-serif" style="font-size:20px;font-weight:700;color:' + T.INK2 + ';">생리 시작일</div>' +
            '<div class="pg-meta" style="margin:6px 0 16px;">이날부터 새 주기를 셀게요.</div>' +
            '<input type="date" id="pp-period" value="' + keyOf(today0()) + '" max="' + keyOf(today0()) + '">' +
            u.primary("저장", "window.__savePeriod()"));
    };
    window.__savePeriod = function () {
        var v = (document.getElementById("pp-period") || {}).value; if (!v) return;
        var p = load(), had = periodList(p).length > 0;
        p.periods[v] = 1; save(p);
        var o = { periods: {} }; o.periods[v] = 1; push(o);
        ui().closeSheet(); refresh();
        toast(had ? "새 주기를 시작했어요. 이번에도 같이 해요" : "주기를 세기 시작했어요");
    };
    window.__prepPositive = function () {
        var p = load(), L = periodList(p), u = ui();
        if (p.mode === "natural" && L.length && u) {
            var lmp = fromKey(L[L.length - 1]);
            try { localStorage.setItem("tosil_due_date", keyOf(addDays(lmp, 280))); } catch (e) {}
        }
        if (typeof window.setBabyStage === "function") window.setBabyStage("pregnant");
        setTimeout(function () { if (typeof window.openDueSheet === "function") window.openDueSheet(); }, 350);
        toast("축하해요. 예정일을 확인해 주세요");
    };

    /* ---------- 처음 시작 · 바꾸기 ---------- */
    function setupSheet(first) {
        var u = ui(), T = u.tokens, p = load(), L = periodList(p);
        var seg = function (k, t) {
            return '<div onclick="window.__prepMode(\'' + k + '\')" id="pp-m-' + k + '" style="flex:1;text-align:center;padding:11px 0;border-radius:11px;cursor:pointer;font-size:14px;font-weight:700;"></div>';
        };
        u.sheet('<div class="pg-serif" style="font-size:20px;font-weight:700;color:' + T.INK2 + ';">' + (first ? '기다리는 시간, 같이 할게요' : '주기 · 방식') + '</div>' +
            '<div class="pg-meta" style="margin:6px 0 16px;">어떻게 준비하고 있나요?</div>' +
            '<div style="display:flex;gap:4px;padding:4px;background:' + T.TINT + ';border-radius:14px;">' + seg("natural") + seg("ivf") + '</div>' +
            '<div id="pp-natural" style="margin-top:16px;">' +
                '<div class="pg-meta" style="margin-bottom:6px;">마지막 생리 시작일</div>' +
                '<input type="date" id="pp-lmp" value="' + (L.length ? L[L.length - 1] : "") + '" max="' + keyOf(today0()) + '">' +
                '<div class="pg-meta" style="margin:14px 0 6px;">보통 주기 (모르면 28일)</div>' +
                '<input type="number" id="pp-cycle" min="20" max="45" inputmode="numeric" value="' + (p.cycle || 28) + '"></div>' +
            '<div id="pp-ivf" style="margin-top:16px;display:none;">' +
                '<div class="pg-meta" style="margin-bottom:6px;">이식일 (정해졌으면)</div><input type="date" id="pp-tr" value="' + (p.ivf.transfer || "") + '">' +
                '<div class="pg-meta" style="margin:14px 0 6px;">피검사일 (정해졌으면)</div><input type="date" id="pp-beta" value="' + (p.ivf.beta || "") + '"></div>' +
            (first && u.consentHTML ? u.consentHTML("prep") : '') +
            u.primary(first ? "시작하기" : "저장", "window.__savePrepSetup(" + (first ? 1 : 0) + ")"));
        window.__prepMode(p.mode);
    }
    window.__prepMode = function (k) {
        var T = ui().tokens;
        ["natural", "ivf"].forEach(function (m) {
            var el = document.getElementById("pp-m-" + m); if (!el) return;
            el.textContent = m === "natural" ? "자연 임신 준비" : "시술 중이에요";
            el.style.background = m === k ? T.INK2 : "transparent"; el.style.color = m === k ? "#FFFDF9" : T.SUB2;
        });
        var a = document.getElementById("pp-natural"), b = document.getElementById("pp-ivf");
        if (a) a.style.display = k === "natural" ? "block" : "none";
        if (b) b.style.display = k === "ivf" ? "block" : "none";
        window.__prepModeNow = k;
    };
    window.openPrepSetup = function () { setupSheet(false); };
    window.openPrepOnboarding = function () { setupSheet(true); };
    window.__savePrepSetup = function (first) {
        if (first) { var c = document.getElementById("sens-consent"); if (c && !c.checked) return toast("민감정보 동의에 체크해 주세요"); }
        var p = load(), mode = window.__prepModeNow || p.mode;
        p.mode = mode;
        if (mode === "natural") {
            var lmp = (document.getElementById("pp-lmp") || {}).value, cyc = parseInt((document.getElementById("pp-cycle") || {}).value, 10);
            if (lmp) { p.periods[lmp] = 1; var o = { periods: {} }; o.periods[lmp] = 1; push(o); }
            p.cycle = (cyc >= 20 && cyc <= 45) ? cyc : 28;
        } else {
            p.ivf = { transfer: (document.getElementById("pp-tr") || {}).value || "", beta: (document.getElementById("pp-beta") || {}).value || "", at: Date.now() };
            push({ ivf: p.ivf });
        }
        p.setup = { mode: p.mode, cycle: p.cycle, at: Date.now() };
        save(p); push({ setup: p.setup });
        if (first) {
            try {
                if (!localStorage.getItem("tosil_babyName")) localStorage.setItem("tosil_babyName", "우리 아기");
                /* 동의 기록은 stage.js 의 recordConsent 가 서버에도 남긴다 */
            } catch (e) {}
            if (typeof window.setBabyStage === "function") window.setBabyStage("prep");
            if (ui().recordConsent) ui().recordConsent("prep");
            ui().closeSheet();
            var ov = document.getElementById("onboarding-overlay"); if (ov) ov.style.display = "none";
            setTimeout(function () { location.reload(); }, 300);
            return;
        }
        ui().closeSheet(); refresh(); toast("저장했어요");
    };

    function boot() {
        try { if (!(localStorage.getItem("tosil_stage_beta") === "1" || localStorage.getItem("tosil_stage_live") === "1")) return; } catch (e) { return; }
        setTimeout(watch, 4000);
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
})();