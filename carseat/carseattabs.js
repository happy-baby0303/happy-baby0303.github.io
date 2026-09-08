/* ============================================================
   배냇함 — 카시트 탭 두 갈래 (carseattabs.js)

   카시트 탭에 흰 패널이 열한 개 쌓였다.
     뒤보기·앞보기 / 3분 점검 / ADAC / 어떤 상황 / 중고
     우리 카시트 / 쿨시트 / 차에서 / 사고 / 세탁 / 상세 조건

   젖병에서 겪은 그 벽이다. 같은 방식으로 나눈다.

       🚘 카시트 고르기     아직 안 샀을 때
       🧰 쓰면서 챙길 것     이미 사고 나서

   \u26a0\ufe0f 유무료로 나누지 않는다.
      PLUS 만 모아둔 탭은 미구독자에게 자물쇠 벽이 된다.
      '살 때 / 쓸 때' 로 나누면 PLUS 는 자연히 뒤쪽에 모이는데,
      그 탭에도 무료 안전 카드가 섞여 있어 벽이 아니다.

   같이 하는 일 넷
     1. '직접 조건 고르기' 를 접을 때 여백까지 줄인다
        (격자만 숨기면 위아래 패딩 28px 이 남아 빈 상자가 크다)
     2. 목록 줄의 이모지를 뺀다
        줄마다 이모지가 있으면 어느 줄이 중요한지 안 보인다
        제목의 이모지는 남긴다 — 그건 패널을 구분해준다

     3. PLUS 를 한 덩어리로 모은다
        ⚠️ 다만 구독 여부에 따라 위아래를 바꾼다.
           구독자는 자기가 산 걸 위에서 바로 보고,
           미구독자는 무료를 먼저 본다.
           미구독자에게 자물쇠부터 보여주면 "다 유료네" 하고 나간다.

     4. 안 급한 무료 카드는 접어둔다
        ⚠️ 3분 점검과 뒤보기·앞보기는 안 접는다. 안전이다.

   index.html 맨 끝, plusmark.js 앞에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var KEY  = "tosil_carseat_tab";
    var BAR  = "carseat-tabbar";
    var PANE = { pick: "view-carseat-pick", use: "view-carseat-use" };

    var TABS = [
        { id: "pick", label: "\uD83D\uDE98 카시트 고르기" },
        { id: "use",  label: "\uD83E\uDDF0 쓰면서 챙길 것" }
    ];

    function cur() {
        var v = localStorage.getItem(KEY);
        return (v === "use") ? "use" : "pick";
    }

    window.switchCarseatTab = function (id) {
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
            var btn = document.getElementById("ctab-" + t.id);
            if (!btn) return;
            var on = (t.id === c);
            btn.style.background = on ? "#FFFFFF" : "transparent";
            btn.style.color = on ? "#191F28" : "#8B95A1";
            btn.style.boxShadow = on ? "0 2px 8px rgba(0,0,0,0.06)" : "none";
        });
        try { if (typeof window.refreshPlusMark === "function") window.refreshPlusMark(); } catch (e) {}
    }

    /* ---------- ① 접힘 여백 ----------
       carseatguide 는 격자만 숨긴다. 패널 위아래 28px + 제목 아래 24px 이
       그대로 남아서, 접어도 빈 상자가 크다. 여백까지 같이 줄인다. -------- */

    function fixFold() {
        var panel = null, host = document.querySelector("main.container");
        if (!host) return;
        for (var i = 0; i < host.children.length; i++) {
            var c = host.children[i];
            if (String(c.className || "").indexOf("matrix-panel") > -1) { panel = c; break; }
        }
        if (!panel || panel.getAttribute("data-slim")) return;

        var grid = panel.querySelector(".matrix-grid");
        var head = panel.querySelector(".matrix-header");
        if (!grid || !head) return;
        panel.setAttribute("data-slim", "1");

        var apply = function (folded) {
            panel.style.padding = folded ? "18px 24px" : "28px 24px";
            panel.style.marginBottom = folded ? "20px" : "32px";
            head.style.marginBottom = folded ? "0" : "24px";
        };
        apply(grid.style.display === "none");

        /* carseatguide 가 head.onclick 을 이미 걸어뒀다. 지우지 않고 뒤에 얹는다. */
        var orig = head.onclick;
        head.onclick = function (e) {
            if (typeof orig === "function") orig.call(this, e);
            setTimeout(function () { apply(grid.style.display === "none"); }, 0);
        };
    }

    /* ---------- ② 목록 줄의 이모지 ----------
       \u26a0\ufe0f 지우지 않고 흐리게만 한다.
          지우면 carseatguide 를 다시 그릴 때 되살아나고, 글자가 밀린다.
          흐리게 두면 눈이 제목으로 먼저 간다. -------- */

    function calmEmoji() {
        var host = document.getElementById("carseat-guide");
        if (!host) return;
        var rows = host.querySelectorAll('div[style*="border-bottom"] > div:first-child');
        for (var i = 0; i < rows.length; i++) {
            var el = rows[i];
            if (el.getAttribute("data-calm")) continue;
            var t = el.textContent || "";
            // 첫 글자가 이모지인 줄만
            if (!/^[\u2190-\u2BFF\uD83C-\uDBFF]/.test(t.trim())) continue;
            el.setAttribute("data-calm", "1");
            el.style.opacity = "0.92";
            var m = el.innerHTML.match(/^\s*([\u2190-\u2BFF\uD83C-\uDBFF][\uDC00-\uDFFF]?\uFE0F?)\s*/);
            if (m) {
                el.innerHTML = '<span style="opacity:0.45; font-size:0.9em;">' + m[1] + '</span> ' +
                               el.innerHTML.slice(m[0].length);
            }
        }
    }

    /* ---------- ③ PLUS 를 한 덩어리로 ----------
       ⚠️ 순서만 바꾼다. 숨기거나 지우지 않는다.
          구독자  : PLUS 를 위로  (산 걸 바로 본다)
          미구독자: 무료를 위로   (자물쇠 벽을 안 만든다)
       -------- */

    var PLUS_IDS  = ["carseat-own", "carseat-cry"];
    /* 접을 무료 카드. ⚠️ 3분 점검과 뒤보기는 넣지 않는다 — 안전이다. */
    var FOLD_KEYS = ["ADAC", "어떤 상황", "중고로", "쿨시트", "차에서 뭘",
                     "사고가 났다면", "토했을 때", "하네스를 스스로", "장거리"];

    function isPlusUser() {
        try { if (typeof window.isPremiumUser === "function") return !!window.isPremiumUser(); } catch (e) {}
        if (!localStorage.getItem("firebase_uid")) return false;
        return localStorage.getItem("tosil_is_founder") === "true"
            || localStorage.getItem("tosil_plan_cache") === "premium"
            || localStorage.getItem("tosil_is_master") === "true";
    }

    var PLUS_TITLE = /우리 카시트|카시트만 타면 울어요|이번 주행 계획/;

    /* \u26a0\ufe0f carseatown.js 와 carseatcry.js 는 한 그릇에 여러 패널을 담는다.
          (우리 카시트 + 쿨시트 + 차에서 + 사고 + 세탁 이 한 덩어리)
          그릇째 옮기면 무료 패널이 PLUS 를 따라다닌다.
          그래서 먼저 패널을 하나씩 꺼내 pane 의 직계로 만든 뒤에 정렬한다. */
    function flatten() {
        var pane = document.getElementById(PANE.use);
        if (!pane) return;
        var kids = Array.prototype.slice.call(pane.children);
        kids.forEach(function (box) {
            if (box.id !== "carseat-own" && box.id !== "carseat-cry") return;
            if (box.getAttribute("data-flat")) return;
            var panels = Array.prototype.slice.call(box.children);
            if (panels.length < 2) return;
            box.setAttribute("data-flat", "1");
            /* 그릇은 남겨둔다 \u2014 모듈이 다시 그릴 자리가 필요하다.
               다만 비어 있으면 자리를 안 먹게 접어둔다. */
            panels.forEach(function (p) { pane.insertBefore(p, box); });
            box.style.display = "none";
        });
    }

    function orderPlus() {
        var pane = document.getElementById(PANE.use);
        if (!pane) return;
        var plusFirst = isPlusUser();

        var kids = Array.prototype.slice.call(pane.children).filter(function (el) {
            return el.style.display !== "none";
        });
        var plus = [], free = [];
        kids.forEach(function (el) {
            var h = el.querySelector ? el.querySelector(".matrix-header") : null;
            var t = h ? (h.textContent || "") : (el.textContent || "").slice(0, 120);
            (PLUS_TITLE.test(t) ? plus : free).push(el);
        });
        if (!plus.length || !free.length) return;

        var want = plusFirst ? plus.concat(free) : free.concat(plus);
        var same = want.every(function (el, i) { return kids[i] === el; });
        if (same) return;
        want.forEach(function (el) { pane.appendChild(el); });
    }

    /* ---------- ④ 안 급한 무료 카드 접기 ---------- */

    function foldExtras() {
        var pane = document.getElementById(PANE.use);
        if (!pane || document.getElementById("carseat-extra")) return;

        var targets = [];
        var scan = function (root) {
            var ps = root.querySelectorAll(".matrix-panel");
            for (var i = 0; i < ps.length; i++) {
                var h = ps[i].querySelector(".matrix-header");
                if (!h) continue;
                var t = h.textContent || "";
                if (h.querySelector(".plus-badge")) continue;          // 유료는 안 접는다
                for (var k = 0; k < FOLD_KEYS.length; k++) {
                    if (t.indexOf(FOLD_KEYS[k]) > -1) { targets.push(ps[i]); break; }
                }
            }
        };
        scan(pane);
        if (targets.length < 3) return;

        var wrap = document.createElement("div");
        wrap.id = "carseat-extra";
        wrap.style.cssText = "margin-bottom:20px;";

        var head = document.createElement("div");
        head.style.cssText =
            "display:flex; align-items:center; gap:8px; background: #FFFFFF; " +
            "border:1px solid #F2F5F8; border-radius:20px; padding:18px 22px; " +
            "cursor:pointer; box-shadow:0 4px 16px rgba(0,0,0,0.04);";
        head.innerHTML =
            '<span style="font-size:15px; font-weight:900; color:#191F28;">' +
                '\uD83D\uDCD6 알아두면 좋은 것</span>' +
            '<span style="font-size:12.5px; font-weight:800; color:#8B95A1;">' + targets.length + '</span>' +
            '<span id="cse-mark" style="margin-left:auto; font-size:13px; font-weight:800; ' +
                'color:#8B95A1;">펼치기 \u25BE</span>';

        var body = document.createElement("div");
        body.style.cssText = "display:none; margin-top:12px;";

        wrap.appendChild(head);
        wrap.appendChild(body);
        pane.insertBefore(wrap, targets[0]);
        targets.forEach(function (el) { body.appendChild(el); });

        head.onclick = function () {
            var on = (body.style.display === "none");
            body.style.display = on ? "block" : "none";
            var mk = document.getElementById("cse-mark");
            if (mk) mk.textContent = on ? "접기 \u25B4" : "펼치기 \u25BE";
        };
    }

    /* ---------- ⑤ 두 갈래로 나누기 ---------- */

    function planOf(host) {
        var byId = function (id) { return document.getElementById(id); };

        var ownPanel = null;
        for (var i = 0; i < host.children.length; i++) {
            var c = host.children[i];
            if (String(c.className || "").indexOf("matrix-panel") > -1) { ownPanel = c; break; }
        }

        /* '고르기' 로 갈 것만 적는다. 나머지는 전부 '쓸 때' 로 간다 —
           그래야 모듈을 하나 더 만들어도 이 파일을 안 고친다. */
        var pick = [
            ownPanel,                                            // 맞춤 카시트 상세 조건
            (byId("btn-show-fav") || {}).parentNode || null,     // 찜 버튼 줄
            byId("vehicle-warning-banner"),
            byId("carseat-result-area")                          // 카시트 14종
        ];

        var KEEP = ["coupang-disclosure", "baby-switch", "auto-sync-banner",
                    "install-guide-modal", BAR, PANE.pick, PANE.use];
        var use = [];
        for (var k = 0; k < host.children.length; k++) {
            var el = host.children[k];
            var cn = String(el.className || "");
            if (KEEP.indexOf(el.id) > -1) continue;
            if (cn.indexOf("hero-title") > -1 || cn.indexOf("legal-footer") > -1) continue;
            if (pick.indexOf(el) > -1) continue;
            use.push(el);
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
        return { pick: clean(pick), use: clean(use) };
    }

    function build() {
        if (document.getElementById(BAR)) return true;

        var host = document.querySelector("main.container") || document.querySelector(".container");
        if (!host) return false;

        var plan = planOf(host);
        if (!plan.pick.length || !plan.use.length) return false;

        var bar = document.createElement("div");
        bar.id = BAR;
        bar.style.cssText =
            "display:flex; gap:4px; background: #F2F4F6; border:1px solid #E5E8EB; " +
            "border-radius:14px; padding:4px; margin:0 0 20px;";
        bar.innerHTML = TABS.map(function (t) {
            return '<div id="ctab-' + t.id + '" onclick="window.switchCarseatTab(\'' + t.id + '\')" ' +
                'style="flex:1; text-align:center; padding:12px 8px; border-radius:11px; ' +
                'cursor:pointer; font-size:13.5px; font-weight:800; white-space:nowrap; ' +
                'transition:0.15s;">' + t.label + '</div>';
        }).join("");

        /* 탭 막대는 두 갈래 중 위에 오는 덩어리 앞에 끼운다 */
        var first = plan.use[0];
        var pi = Array.prototype.indexOf.call(host.children, plan.pick[0]);
        var ui = Array.prototype.indexOf.call(host.children, plan.use[0]);
        if (pi > -1 && (ui === -1 || pi < ui)) first = plan.pick[0];
        host.insertBefore(bar, first);

        TABS.forEach(function (t) {
            var pane = document.createElement("div");
            pane.id = PANE[t.id];
            host.appendChild(pane);
            plan[t.id].forEach(function (el) { pane.appendChild(el); });
        });

        var footer = host.querySelector(".legal-footer");
        if (footer) host.appendChild(footer);

        paint();
        return true;
    }

    function boot() {
        var tries = 0;
        var go = function () {
            fixFold();
            calmEmoji();
            if (build()) {
                setTimeout(function () { calmEmoji(); flatten(); orderPlus(); foldExtras(); }, 400);
                setTimeout(function () { flatten(); orderPlus(); foldExtras(); }, 1400);
                setTimeout(function () { flatten(); orderPlus(); foldExtras(); }, 3000);
                return;
            }
            if (++tries < 12) setTimeout(go, 350);
        };
        setTimeout(go, 1400);
        setInterval(function () { calmEmoji(); flatten(); orderPlus(); }, 4000);   // 다시 그려져도 유지
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    window.carseatTabsDebug = function () {
        var host = document.querySelector("main.container");
        console.log("탭 막대 붙음:", !!document.getElementById(BAR), "· 지금 갈래:", cur());
        TABS.forEach(function (t) {
            var pane = document.getElementById(PANE[t.id]);
            if (!pane) { console.log("   " + t.label + " : 없음"); return; }
            var names = [];
            for (var i = 0; i < pane.children.length; i++) {
                var el = pane.children[i];
                var h = el.querySelectorAll ? el.querySelectorAll(".matrix-header") : [];
                if (h.length) for (var j = 0; j < h.length; j++) names.push(h[j].textContent.trim().slice(0, 24));
                else names.push("#" + (el.id || el.className || "?"));
            }
            console.log("   " + t.label + " (" + names.length + ")");
            names.forEach(function (n) { console.log("      \u00b7 " + n); });
        });
        if (host) {
            var loose = [];
            for (var k = 0; k < host.children.length; k++) {
                var c = host.children[k];
                if (c.id !== BAR && c.id !== PANE.pick && c.id !== PANE.use) {
                    loose.push(c.id || String(c.className).slice(0, 18) || c.tagName);
                }
            }
            console.log("탭 밖에 남은 것:", loose.join(" \u00b7 ") || "없음");
        }
        console.log("흐리게 한 줄 이모지:", document.querySelectorAll("[data-calm]").length + "개");
        console.log("PLUS 구독:", isPlusUser(), "\u2192", isPlusUser() ? "PLUS 를 위로" : "무료를 위로");
        var ex = document.getElementById("carseat-extra");
        console.log("접어둔 무료 카드:", ex ? ex.lastChild.children.length + "개" : "없음");
    };
})();