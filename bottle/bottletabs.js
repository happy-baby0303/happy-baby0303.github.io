/* ============================================================
   배냇함 — 젖병 탭 두 갈래 (bottletabs.js)

   젖병 탭 하나에 흰 패널이 열 개 쌓여 있었다.
   상황으로 묻기 / 개수 계산 / 젖꼭지 단계 / 장비 / 소모품 /
   로드맵 / 쪽쪽이 둘 / 직접 조건 / 젖병 40종.

   부모는 스크롤을 열 번 내리면서 "이게 뭐지" 를 열 번 한다.

   장난감 탭은 이미 답을 갖고 있다.
       놀이 처방전  /  장난감 추천
   유무료로 나눈 게 아니라 '쓸 때 / 살 때' 로 나눈 것이다.

   젖병도 똑같이 나눈다.
       🍼 젖병 고르기      아직 안 샀을 때
       🧰 쓰면서 챙길 것    이미 사고 나서

   ⚠️ 만들어진 패널을 옮기기만 한다. index.html 은 한 줄도 안 고친다.
   ⚠️ 각 모듈이 자기 그릇 안을 다시 그리는 건 그대로 돌아간다.
      그릇째 옮기는 것이라 다시 그려도 자리를 안 잃는다.

   index.html 맨 끝, plusmark.js 앞에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var KEY = "tosil_bottle_tab";
    var BAR = "bottle-tabbar";
    var PANE = { pick: "view-bottle-pick", tools: "view-bottle-tools" };

    var TABS = [
        { id: "pick",  label: "\uD83C\uDF7C 젖병 고르기" },
        { id: "tools", label: "\uD83E\uDDF0 쓰면서 챙길 것" }
    ];

    function cur() {
        var v = localStorage.getItem(KEY);
        return (v === "tools") ? "tools" : "pick";
    }

    window.switchBottleTab = function (id) {
        try { localStorage.setItem(KEY, id); } catch (e) {}
        paint();
        var bar = document.getElementById(BAR);
        if (bar) try { bar.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (e) {}
    };

    function paint() {
        var c = cur();
        TABS.forEach(function (t) {
            var pane = document.getElementById(PANE[t.id]);
            if (pane) pane.style.display = (t.id === c) ? "block" : "none";
            var btn = document.getElementById("btab-" + t.id);
            if (!btn) return;
            var on = (t.id === c);
            btn.style.background = on ? "#FFFFFF" : "transparent";
            btn.style.color = on ? "#191F28" : "#8B95A1";
            btn.style.boxShadow = on ? "0 2px 8px rgba(0,0,0,0.06)" : "none";
        });
        /* 옮기고 나면 배지를 다시 붙여준다 */
        try { if (typeof window.refreshPlusMark === "function") window.refreshPlusMark(); } catch (e) {}
    }

    /* 어느 갈래로 보낼지 — 위에서부터 찾아서 있는 것만 옮긴다 */
    function planOf(host) {
        var byId = function (id) { return document.getElementById(id); };

        /* ⚠️ host.querySelector('.matrix-panel') 를 쓰면 안 된다.
              bottleguide 가 만든 패널이 #bottle-guide 안에 먼저 걸려서
              정작 index.html 의 '직접 조건 고르기' 는 영영 안 옮겨진다.
              host 의 바로 아래 자식 중에서만 찾는다. */
        var ownPanel = null;
        for (var i = 0; i < host.children.length; i++) {
            var c = host.children[i];
            if (c.className && String(c.className).indexOf("matrix-panel") > -1) { ownPanel = c; break; }
        }

        var pick = [
            byId("bottle-guide"),                                   // 상황 묻기 · 개수 · 젖꼭지 단계
            ownPanel,                                               // 직접 조건 고르기
            (byId("btn-show-fav") || {}).parentNode || null,        // 찜 버튼 줄
            byId("bottle-result-area")                              // 젖병 40종
        ];
        /* ⚠️ tools 는 목록으로 적지 않는다.
              모듈을 하나 더 만들 때마다 이 파일을 고쳐야 하면 언젠가 빠뜨린다.
              '고르기' 로 지정한 것과 머리·꼬리를 뺀 나머지가 전부 여기로 온다. */
        var KEEP = ["coupang-disclosure", "baby-switch", "auto-sync-banner", BAR,
                    PANE.pick, PANE.tools];
        var tools = [];
        for (var k = 0; k < host.children.length; k++) {
            var el = host.children[k];
            var cn = String(el.className || "");
            if (KEEP.indexOf(el.id) > -1) continue;
            if (cn.indexOf("hero-title") > -1 || cn.indexOf("legal-footer") > -1) continue;
            if (pick.indexOf(el) > -1) continue;
            tools.push(el);
        }

        var seen = [];
        var clean = function (arr) {
            return arr.filter(function (el) {
                if (!el || el.parentNode !== host) return false;
                if (seen.indexOf(el) > -1) return false;
                seen.push(el);
                return true;
            });
        };
        return { pick: clean(pick), tools: clean(tools) };
    }

    function build() {
        if (document.getElementById(BAR)) return true;

        var host = document.querySelector("main.container") || document.querySelector(".container");
        if (!host) return false;

        var plan = planOf(host);
        /* 양쪽에 담을 게 없으면 아직 모듈이 안 붙은 것이다. 다음 시도를 기다린다. */
        if (!plan.pick.length || !plan.tools.length) return false;

        /* 탭 막대 */
        var bar = document.createElement("div");
        bar.id = BAR;
        bar.style.cssText =
            "display:flex; gap:4px; background: #F2F4F6; border:1px solid #E5E8EB; " +
            "border-radius:14px; padding:4px; margin:0 0 20px;";
        bar.innerHTML = TABS.map(function (t) {
            return '<div id="btab-' + t.id + '" onclick="window.switchBottleTab(\'' + t.id + '\')" ' +
                'style="flex:1; text-align:center; padding:12px 8px; border-radius:11px; ' +
                'cursor:pointer; font-size:13.5px; font-weight:800; white-space:nowrap; ' +
                'transition:0.15s;">' + t.label + '</div>';
        }).join("");

        /* 첫 덩어리 자리에 탭 막대를 끼운다 */
        var first = plan.pick[0];
        host.insertBefore(bar, first);

        TABS.forEach(function (t) {
            var pane = document.createElement("div");
            pane.id = PANE[t.id];
            host.insertBefore(pane, null);       // 일단 맨 뒤에 두고
            plan[t.id].forEach(function (el) { pane.appendChild(el); });
        });

        /* 법적 고지는 항상 맨 아래여야 한다 */
        var footer = host.querySelector(".legal-footer");
        if (footer) host.appendChild(footer);

        paint();
        return true;
    }

    function boot() {
        var tries = 0;
        var go = function () {
            if (build()) return;
            if (++tries < 12) setTimeout(go, 350);
        };
        setTimeout(go, 1400);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    window.bottleTabsDebug = function () {
        var host = document.querySelector("main.container");
        console.log("탭 막대 붙음:", !!document.getElementById(BAR), "· 지금 갈래:", cur());
        TABS.forEach(function (t) {
            var pane = document.getElementById(PANE[t.id]);
            if (!pane) { console.log("   " + t.label + " : 없음"); return; }
            var names = [];
            for (var i = 0; i < pane.children.length; i++) {
                var el = pane.children[i];
                var h = el.querySelectorAll ? el.querySelectorAll(".matrix-header") : [];
                if (h.length) for (var j = 0; j < h.length; j++) names.push(h[j].textContent.trim());
                else names.push("#" + (el.id || el.className || "?"));
            }
            console.log("   " + t.label + " (" + names.length + ")");
            names.forEach(function (n) { console.log("      · " + n); });
        });
        if (host) {
            var loose = [];
            for (var k = 0; k < host.children.length; k++) {
                var c = host.children[k];
                if (c.id !== BAR && c.id !== PANE.pick && c.id !== PANE.tools) {
                    loose.push(c.id || c.className || c.tagName);
                }
            }
            console.log("탭 밖에 남은 것:", loose.join(" · ") || "없음");
        }
    };
})();