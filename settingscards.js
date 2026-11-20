/* ============================================================
   배냇함 — 설정 카드 제자리 (settingscards.js) v4

   설정 탭은 묶음 일곱이다 (script.js 의 renderSettingsTab):
     우리 아기 · 가족 · 알림 · PLUS · 기록 보관 · 도움 · 계정

   다른 파일들이 붙이는 카드를 제 묶음(#st-…)으로 옮긴다.
     가족      settings-cloud-card · st-together-card (script.js) · family-members-card (rolelock.js)
               st-role-card (script.js) · gh-helper-row (grandhome.js) · parent-phone-card · parent-notice-card (homefix.js, 줄 밑에 접혀 있다)
     알림      remind-card (remind.js) · care-alarm-card · pushcheck-card (pushcheck.js) · push-permission-card (script.js)
               widget-card (widget.js, 앱 1.1.4 · 바탕화면에 위젯을 아직 안 놓았을 때만)
     PLUS      st-plus-banner (script.js) · plusfree-card (plusfree.js)
     기록 보관 export-card (export.js) · st-report-card (script.js, 플레이 앱에선 숨는다)
   묶음 안에 보이는 카드가 하나도 없으면 묶음째 숨긴다 (돌봄 화면 · 플레이 앱).

   붙는 그 순간에 옮긴다 — MutationObserver 는 화면을 그리기 전에 돈다. 그래서 카드가 엉뚱한 데 잠깐 보였다가
   옮겨지는 일이 없다.
   ⚠️ v3 까지는 '알림 · 가족 · 보관' 한 상자에 담았다 (이름부터 세 가지였다). 그리고 20 · 120 · 400ms 타이머로 다시 담았다.

   index.html 에서 설정 탭을 감싸는 파일들(rolelock · plusfree · homefix · export · remind · pushcheck · feedback)
   다음, 맨 끝에 로드한다 — 그래야 이 파일의 '다 그린 뒤' 가 맨 마지막에 돈다.
   ============================================================ */
(function () {
    'use strict';

    var SLOTS = [
        ["st-family", ["settings-cloud-card", "st-together-card", "family-members-card", "st-role-card", "gh-helper-row", "parent-phone-card", "parent-notice-card"]],
        ["st-alarm",  ["remind-card", "care-alarm-card", "push-permission-card", "widget-card", "pushcheck-card"]],
        ["st-plus",   ["st-plus-banner", "plusfree-card"]],
        ["st-keep",   ["export-card", "st-report-card"]]
    ];

    function tab() { return document.getElementById("tab-settings"); }

    function visible(el) {
        if (!el || el.nodeType !== 1) return false;
        try { return getComputedStyle(el).display !== "none"; } catch (e) { return true; }
    }

    var busy = false;
    function tidy() {
        var host = tab();
        if (!host || busy) return;
        busy = true;
        try {
            SLOTS.forEach(function (pair) {
                var slot = document.getElementById(pair[0]);
                if (!slot) return;
                var want = [];
                pair[1].forEach(function (id) {
                    var el = document.getElementById(id);
                    /* 설정 탭 안에 있는 것만 — 도우미 칸은 '돌봄 도우미' 창이 열려 있으면 그 창 안에 가 있다 */
                    if (el && el.closest && el.closest("#tab-settings") && !el.contains(slot)) want.push(el);
                });
                Array.prototype.forEach.call(slot.children, function (el) { if (want.indexOf(el) < 0) want.push(el); });
                var same = want.length === slot.children.length;
                for (var i = 0; same && i < want.length; i++) if (slot.children[i] !== want[i]) same = false;
                if (!same) want.forEach(function (el) { slot.appendChild(el); });
            });
            /* 묶음 안이 비면 묶음째 숨긴다 */
            var secs = host.querySelectorAll(".st-sec[data-sec]");
            for (var k = 0; k < secs.length; k++) {
                var sl = document.getElementById(secs[k].getAttribute("data-sec"));
                var any = false;
                if (sl) for (var m = 0; m < sl.children.length; m++) if (visible(sl.children[m])) { any = true; break; }
                var d = any ? "" : "none";
                if (secs[k].style.display !== d) secs[k].style.display = d;
            }
        } catch (e) {}
        busy = false;
    }
    window.tidySettingsCards = tidy;

    /* 붙는 그 순간에 — 다른 파일이 setTimeout 으로 늦게 붙여도 */
    var mo = null;
    function watch() {
        var host = tab();
        if (!host || mo) return;
        mo = new MutationObserver(function () { tidy(); });
        mo.observe(host, { childList: true, subtree: true });
    }

    /* 설정 탭을 다시 그릴 때마다 (innerHTML 을 통째로 갈아 끼운다) — 다른 파일들이 카드를 붙인 바로 뒤 */
    (function hook() {
        var _origin = window.renderSettingsTab;
        window.renderSettingsTab = function () {
            var out;
            if (typeof _origin === "function") out = _origin.apply(this, arguments);
            watch();
            tidy();
            return out;
        };
    })();

    function boot() {
        watch();
        tidy();
        /* 돌봄 화면으로 바뀌면 숨는 카드가 있다 (body.mode-senior) — 묶음째 숨길지 다시 본다 */
        try {
            new MutationObserver(function () { tidy(); }).observe(document.body, { attributes: true, attributeFilter: ["class"] });
        } catch (e) {}
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    /* ---------- 점검용 ---------- */
    window.settingsDebug = function () {
        SLOTS.forEach(function (pair) {
            var slot = document.getElementById(pair[0]);
            console.log(pair[0] + ":", slot ? Array.prototype.map.call(slot.children, function (c) { return c.id || c.className || c.tagName; }).join(" · ") : "없음");
        });
    };
})();
