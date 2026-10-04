/* ============================================================
   배냇함 — 주수별 준비 순서 (readylist.js)       ※ 숨김 스위치 뒤 (stage.js)

   "뭘 언제 사야 하지?" 에 답한다. 주수에 맞춰 지금 챙길 것만 보여주고,
   살 것은 배냇함 큐레이터(유모차 · 카시트 · 젖병)로 바로 잇는다.
   다 사라고 하지 않는다. "필요한 것만 사도 충분해요" 를 같이 적는다.

   홈의 '챙길 것' 카드 안 [준비] 칸으로 들어간다 (stage.js 의 stageTabs).

   저장: 아기마다 tosil_ready = { 항목id: { done: 시각, at } }
   동기화: growth_가족코드(+꼬리표)/stage 의 ready 칸 (항목마다 따로)

   index.html 에서 stage.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var READY = [
        { id: "stroller", from: 16, to: 24, t: "유모차 고르기",
          d: "디럭스 · 절충형 · 휴대용 중 우리 집 생활에 맞는 걸 골라요. 매장에서 직접 밀어 보면 좋아요.",
          link: "./stroller/index.html", label: "유모차 큐레이터" },
        { id: "carseat", from: 20, to: 28, t: "카시트 고르기",
          d: "신생아는 뒤를 보게 태워요. 우리 차에 맞는지 먼저 확인해요.",
          link: "./carseat/index.html", label: "카시트 큐레이터" },
        { id: "bottle", from: 24, to: 32, t: "젖병 · 수유용품",
          d: "모유든 분유든 젖병 몇 개는 있으면 좋아요. 처음엔 적게 사서 아기에게 맞는 걸 찾아요.",
          link: "./bottle/index.html", label: "젖병 큐레이터" },
        { id: "bed", from: 28, to: 34, t: "아기 잠자리",
          d: "단단하고 평평한 매트리스에 등을 대고 눕혀요. 베개 · 범퍼 · 푹신한 이불은 두지 않아요." },
        { id: "wash", from: 30, to: 35, t: "아기 옷 · 속싸개 미리 빨기",
          d: "새 옷은 한 번 빨아서 말려 두면 좋아요." },
        { id: "bag", from: 34, to: 37, t: "출산 가방 싸기",
          d: "예정일 몇 주 전에 미리 싸 두면 마음이 편해요. 산모수첩 · 신분증 · 아기 옷 한 벌은 꼭 챙겨요." },
        { id: "install", from: 35, to: 38, t: "카시트 차에 미리 달아 보기",
          d: "퇴원하는 날 처음 달면 어려워요. 미리 한 번 달아 보세요.",
          link: "./carseat/index.html", label: "카시트 큐레이터" },
        { id: "route", from: 36, to: 40, t: "병원 가는 길 · 연락할 사람",
          d: "진통이 오면 누가 운전하고 누구에게 연락할지 미리 정해 둬요." }
    ];
    window.readyItems = READY;

    function ui() { return window.stageUI || null; }
    function toast(m) { if (typeof window.showToast === "function") window.showToast(m); }
    function load() { try { var v = JSON.parse(localStorage.getItem("tosil_ready")); return (v && typeof v === "object") ? v : {}; } catch (e) { return {}; } }
    function save(v) { try { localStorage.setItem("tosil_ready", JSON.stringify(v)); } catch (e) {} }
    function ref() {
        var code = localStorage.getItem("family_sync_code");
        if (!code || !window.db || typeof window.doc !== "function") return null;
        return window.doc(window.db, "growth_" + code + (window.currentBabySuffix || ""), "stage");
    }
    function pushOne(id, r) {
        var x = ref(); if (!x || typeof window.setDoc !== "function") return;
        var body = { ready: {} }; body.ready[id] = r;
        try { window.setDoc(x, body, { merge: true }).catch(function (e) { console.warn("[준비 순서] 올리기 실패", e); }); } catch (e) {}
    }
    function watch() {
        var x = ref(); if (!x || typeof window.onSnapshot !== "function") return;
        window.onSnapshot(x, function (snap) {
            if (!snap.exists()) return;
            var remote = (snap.data() || {}).ready, mine = load(), changed = false;
            if (!remote) return;
            Object.keys(remote).forEach(function (id) {
                var r = remote[id]; if (!r) return;
                if (!mine[id] || Number(r.at || 0) > Number(mine[id].at || 0)) { mine[id] = r; changed = true; }
            });
            if (changed) { save(mine); if (typeof window.refreshStageHome === "function") window.refreshStageHome(); }
        }, function () {});
    }

    window.__readyDone = function (id) {
        var a = load(), r = a[id] || {};
        var was = !!r.done;
        r.done = was ? 0 : Date.now(); r.at = Date.now(); a[id] = r; save(a); pushOne(id, r);
        if (!was) toast("하나 준비했어요");
        if (typeof window.refreshStageHome === "function") window.refreshStageHome();
    };
    window.__readyGo = function (href) { if (href) location.href = href; };

    function split(wk) {
        var a = load();
        var now = READY.filter(function (x) { return wk >= x.from && wk <= x.to; });
        var next = READY.filter(function (x) { return x.from > wk; }).slice(0, 2);
        return { now: now, next: next, a: a };
    }

    function body(w) {
        var u = ui(); if (!u) return "";
        var T = u.tokens, wk = w.weeks, s = split(wk);
        var rows = s.now.concat(s.next).map(function (x) {
            var on = !!(s.a[x.id] && s.a[x.id].done), soon = x.from > wk;
            var tick = soon
                ? '<div style="width:22px;height:22px;border-radius:50%;border:1.5px dashed ' + T.LINE + ';flex-shrink:0;margin-top:1px;"></div>'
                : '<div onclick="window.__readyDone(\'' + x.id + '\')" style="width:22px;height:22px;border-radius:50%;flex-shrink:0;margin-top:1px;cursor:pointer;' +
                    'display:flex;align-items:center;justify-content:center;font-size:12px;color:#FFF;' + (on ? 'background:' + T.INK2 + ';' : 'border:1.5px solid #CBBBA6;') + '">' + (on ? '✓' : '') + '</div>';
            return '<div style="display:flex;gap:12px;padding:13px 0;border-top:1px solid ' + T.LINE + ';">' + tick +
                '<div style="flex:1;min-width:0;">' +
                    '<div style="font-size:15px;font-weight:700;color:' + (soon || on ? T.MUTE : T.INK2) + ';' + (on && !soon ? 'text-decoration:line-through;' : '') + '">' + u.esc(x.t) + '</div>' +
                    '<div class="pg-meta" style="margin-top:3px;">' + (soon ? x.from + '주부터' : x.from + '~' + x.to + '주') + '</div>' +
                    (soon || on ? '' : '<div style="font-size:12.5px;font-weight:500;color:' + T.SUB2 + ';line-height:1.65;margin-top:5px;word-break:keep-all;">' + u.esc(x.d) + '</div>' +
                        (x.link ? '<div onclick="window.__readyGo(\'' + x.link + '\')" style="display:inline-block;margin-top:9px;font-size:12.5px;font-weight:700;color:' + T.INK2 + ';' +
                            'padding:7px 12px;border:1px solid ' + T.LINE + ';border-radius:10px;background:' + T.PAPER + ';cursor:pointer;">' + u.esc(x.label) + ' ›</div>' : '')) +
                '</div></div>';
        }).join("");
        return (rows || '<div class="pg-meta" style="padding:12px 0;border-top:1px solid ' + T.LINE + ';">지금 따로 준비할 건 없어요.</div>') +
            '<div style="font-size:11px;font-weight:600;color:' + T.MUTE + ';line-height:1.6;padding-top:10px;border-top:1px solid ' + T.LINE + ';">' +
                '다 살 필요는 없어요. 필요한 것만 사도 충분해요.</div>';
    }
    function count(w) {
        var s = split(w.weeks);
        return s.now.filter(function (x) { return !(s.a[x.id] && s.a[x.id].done); }).length;
    }

    window.stageTabs = window.stageTabs || [];
    window.stageTabs.push({ id: "ready", label: "준비", order: 3, body: body, count: count });
    window.__readyTest = { split: split, READY: READY };

    function boot() {
        try { if (!(localStorage.getItem("tosil_stage_beta") === "1" || localStorage.getItem("tosil_stage_live") === "1")) return; } catch (e) { return; }
        setTimeout(watch, 3900);
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
})();