/* ============================================================
   배냇함 — 이유식 화면 정리 (foodlayout.js)  v4

   v3 의 사고 원인은 딱 한 줄이었다.

       el.style.display = "";      // 보이게 하려고

   이게 인라인 display:none 을 지워버린다.
   그런데 .container 안에는 이런 것들이 숨어 있다.

       meal-bottom-sheet     position:fixed; display:none
       test-bottom-sheet     position:fixed; display:none
       ai-deduction-modal    position:fixed; display:none
       cooking-mode-modal    position:fixed; display:none
       auto-sync-banner      display:none  (앱이 필요할 때만 켠다)

   그래서 냉장고 큐브 차감 창과 식재료 테스트 창이 계속 떠 있었다.
   내가 연 것이다.

   v4 의 규칙 두 가지
     1. 뜬 창(position:fixed)과 원래 숨어 있던 것은 아예 안 건드린다.
     2. 보이게 할 때 "" 로 비우지 않고, 처음에 적어둔 값으로 되돌린다.

   ============================================================ */
(function () {
    'use strict';

    var GRAY = "#8B95A1", DARK = "#191F28";
    var KEY = "tosil_food_view", NAV = "food-nav3";
    var MARK = "data-food-tab", ORIG = "data-food-orig";

    var TABS = [
        { id: "cook",  icon: "🍚", name: "레시피" },
        { id: "week",  icon: "📅", name: "식단표" },
        { id: "aller", icon: "🚦", name: "알레르기" }
    ];

    var RULES = [
        { tab: "always", ids: ["coupang-disclosure"],
                         texts: ["의학적 면책", "쿠팡 파트너스 안내", "안심 이유식 식단"] },

        { tab: "week",   ids: ["autopilot-master-container", "autopilot-result-container",
                               "passed-foods", "shop-list"],
                         texts: ["식단표 이미지로 저장", "우리 아기 맞춤 영양 식단표", "먹여본 재료"] },

        { tab: "aller",  ids: ["traffic-light-result", "cal-month-title", "cal-detail-area",
                               "cal-total-summary-area", "cal-record-list"],
                         texts: ["이 식재료 먹여도 될까", "알레르기 이상 신호", "우리 아기 식재료 도감",
                                 "식재료 탐험", "무사 통과한 재료"] },

        { tab: "cook",   ids: ["food-result-area", "btn-show-fav", "food-calc-body"],
                         texts: ["안심 식단 고르기", "이유식 계량 계산기", "미음 만들기 기본",
                                 "쌀가루 1술", "찜한 식단"] }
    ];

    function $(id) { return document.getElementById(id); }
    function container() {
        return document.querySelector("main.container") || document.querySelector(".container");
    }
    function now() {
        var v = localStorage.getItem(KEY);
        for (var i = 0; i < TABS.length; i++) if (TABS[i].id === v) return v;
        return "cook";
    }

    /* ⚠️ 손대면 안 되는 것 —
          뜬 창(fixed·sticky)과, 처음부터 숨어 있던 것(앱이 켜고 끈다) */
    function untouchable(el) {
        if (el.id === NAV) return true;
        var s;
        try { s = window.getComputedStyle(el); } catch (e) { return true; }
        if (s.position === "fixed" || s.position === "sticky") return true;
        if ((el.style.display || "").trim() === "none") return true;
        if (/sheet|modal|popup|overlay|toast/i.test(el.id || "")) return true;
        return false;
    }

    function tabOf(el) {
        var txt = (el.textContent || "");
        for (var i = 0; i < RULES.length; i++) {
            var r = RULES[i];
            for (var k = 0; k < r.ids.length; k++) {
                var t = $(r.ids[k]);
                if (t && (el === t || el.contains(t))) return r.tab;
            }
            for (var m = 0; m < r.texts.length; m++) {
                if (txt.indexOf(r.texts[m]) > -1) return r.tab;
            }
        }
        return "cook";
    }

    /* ---------- 딱지 붙이기 ---------- */

    function tagOne(el) {
        if (el.hasAttribute(MARK)) return;
        if (untouchable(el)) { el.setAttribute(MARK, "skip"); return; }

        var t = (el.textContent || "").trim();
        if (!t && !el.querySelector("img, canvas, input, button, svg, select")) {
            el.setAttribute(MARK, "skip");                 // 빈 껍데기는 그냥 둔다
            return;
        }
        el.setAttribute(ORIG, el.style.display || "");     // 원래 값을 적어둔다
        el.setAttribute(MARK, tabOf(el));
    }

    function tagAll() {
        var c = container();
        if (!c) return;
        Array.prototype.slice.call(c.children).forEach(tagOne);
        ["view-curation", "view-calendar"].forEach(function (vid) {
            var v = $(vid);
            if (!v) return;
            Array.prototype.slice.call(v.children).forEach(tagOne);
        });
    }

    function openOldViews() {
        var btn = $("tab-btn-curation");
        if (btn) {
            var c = container(), p = btn;
            while (p && p.parentNode && p.parentNode !== c) p = p.parentNode;
            if (p && p.parentNode === c) { p.style.display = "none"; p.setAttribute(MARK, "skip"); }
        }
        ["view-curation", "view-calendar"].forEach(function (vid) {
            var v = $(vid);
            if (v) { v.style.display = "block"; v.setAttribute(MARK, "skip"); }
        });
    }

    /* ---------- 보이기 / 감추기 ---------- */

    function show(el, on) {
        var m = el.getAttribute(MARK);
        if (!m || m === "skip") return;                    // ⚠️ 뜬 창은 절대 안 건드린다
        if (on) el.style.display = el.getAttribute(ORIG) || "";
        else el.style.display = "none";
    }

    function apply(id) {
        var c = container();
        if (!c) return;

        Array.prototype.slice.call(c.children).forEach(function (el) {
            var m = el.getAttribute(MARK);
            if (!m || m === "skip") return;
            show(el, m === "always" || m === id);
        });

        ["view-curation", "view-calendar"].forEach(function (vid) {
            var v = $(vid);
            if (!v) return;
            var any = false;
            Array.prototype.slice.call(v.children).forEach(function (el) {
                var m = el.getAttribute(MARK);
                if (!m || m === "skip") { if (el.style.display !== "none") any = true; return; }
                var on = (m === "always" || m === id);
                show(el, on);
                if (on) any = true;
            });
            v.style.display = any ? "block" : "none";
        });
    }

    window.switchFoodView3 = function (id) {
        try { localStorage.setItem(KEY, id); } catch (e) {}
        apply(id);
        paintNav();
        window.scrollTo({ top: 0, behavior: "smooth" });
        if (id === "cook" && typeof window.runFoodEngine === "function") {
            setTimeout(function () { try { window.runFoodEngine(); } catch (e) {} }, 60);
        }
    };

    function paintNav() {
        var nav = $(NAV);
        if (!nav) return;
        var cur = now();
        nav.innerHTML = TABS.map(function (t) {
            var on = (t.id === cur);
            return '<div onclick="window.switchFoodView3(\'' + t.id + '\')" ' +
                'style="flex:1; text-align:center; padding:10px 4px; border-radius:11px; cursor:pointer; ' +
                (on ? 'background:#FFFFFF; box-shadow:0 2px 6px rgba(0,0,0,0.07);' : '') + '">' +
                '<span style="font-size:14px;">' + t.icon + '</span> ' +
                '<span style="font-size:13px; font-weight:' + (on ? '900' : '700') + '; ' +
                    'color:' + (on ? DARK : GRAY) + ';">' + t.name + '</span>' +
            '</div>';
        }).join("");
    }

    function makeNav() {
        var c = container();
        if (!c || $(NAV)) return;
        var nav = document.createElement("div");
        nav.id = NAV;
        nav.setAttribute(MARK, "skip");
        nav.style.cssText =
            "display:flex; gap:6px; background:#F2F4F6; border-radius:14px; " +
            "padding:5px; margin:2px 0 16px;";
        c.insertBefore(nav, c.firstChild);
    }

    /* ---------- 7일 식단을 세로로 ---------- */

    function verticalPlan() {
        var box = $("autopilot-result-container");
        if (!box) return;
        var row = box.querySelector(".hide-scroll");
        if (!row) return;
        row.style.display = "flex";
        row.style.flexDirection = "column";
        row.style.overflowX = "visible";
        row.style.gap = "10px";
        var kids = row.children;
        for (var i = 0; i < kids.length; i++) {
            kids[i].style.minWidth = "0";
            kids[i].style.maxWidth = "100%";
            kids[i].style.width = "100%";
            kids[i].style.height = "auto";
        }
    }

    function slimHero() {
        var c = container();
        if (!c) return;
        var all = c.querySelectorAll("div, p, span");
        for (var i = 0; i < all.length; i++) {
            var t = (all[i].textContent || "").trim();
            if (t === "전문의 가이드라인 기반 알레르기 철벽 방어" && all[i].children.length === 0) {
                all[i].textContent = "레시피 135종 · 알레르기 기록과 함께";
                all[i].style.fontSize = "12.5px";
                return;
            }
        }
    }

    /* ---------- 시작 ---------- */

    function run() {
        makeNav();
        openOldViews();
        tagAll();
        apply(now());
        paintNav();
        verticalPlan();
        slimHero();
    }

    function boot() {
        setTimeout(run, 350);
        setTimeout(run, 1100);
        setTimeout(run, 2400);

        ["drawAutoPilotUI", "runFoodEngine", "renderCalendar",
         "renderSelectedDateRecords", "saveMealRecord", "saveTestRecord"].forEach(function (n) {
            var f = window[n];
            if (typeof f !== "function" || f.__lay) return;
            var w = function () {
                var o = f.apply(this, arguments);
                setTimeout(function () { tagAll(); apply(now()); verticalPlan(); }, 60);
                return o;
            };
            w.__lay = true;
            window[n] = w;
        });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    /* ---------- 점검용 ---------- */
    window.foodLayoutDebug = function () {
        console.log("지금 탭:", now());
        var cnt = {}, list = [];
        function scan(p, where) {
            if (!p) return;
            Array.prototype.slice.call(p.children).forEach(function (el) {
                var m = el.getAttribute(MARK) || "없음";
                cnt[m] = (cnt[m] || 0) + 1;
                var vis = (window.getComputedStyle(el).display !== "none");
                var t = (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 24);
                list.push("  " + (vis ? "👁" : "  ") + " " + m.padEnd(6) + " " + where +
                          (el.id || "") + "  " + t);
            });
        }
        scan(container(), "");
        scan($("view-curation"), "(cur)");
        scan($("view-calendar"), "(cal)");
        console.log("딱지:", cnt);
        list.forEach(function (x) { console.log(x); });

        console.log("── 뜬 창이 열려 있나 ──");
        ["meal-bottom-sheet", "test-bottom-sheet", "ai-deduction-modal", "cooking-mode-modal"].forEach(function (id) {
            var el = $(id);
            if (!el) return;
            var open = window.getComputedStyle(el).display !== "none";
            console.log("   " + (open ? "🔴 열림" : "✅ 닫힘") + "  " + id);
        });
    };
})();