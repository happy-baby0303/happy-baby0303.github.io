/* ============================================================
   배냇함 — 유모차 탭 두 갈래 (strollertabs.js)

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

    /* \u26a0\ufe0f 유모차 index.html 은 <main><div class="container"> 로
          한 겹 더 감싸져 있다. 다른 폴더는 <main class="container"> 라서
          querySelector("main.container") 가 여기서만 null 을 돌려준다.
          그러면 정렬\u00b7접기가 조용히 아무것도 안 하고 끝난다.
          어느 구조든 카드가 실제로 담긴 칸을 찾는다. */
    function strollerHost() {
        return document.querySelector("main.container") ||
               document.querySelector("main > .container") ||
               document.querySelector(".container") ||
               document.querySelector("main");
    }


    var KEY  = "tosil_stroller_tab";
    var BAR  = "stroller-tabbar";
    var PANE = { pick: "view-stroller-pick", use: "view-stroller-use" };

    var TABS = [
        { id: "pick", label: "\uD83C\uDF7C 유모차 고르기" },
        { id: "use",  label: "\uD83E\uDDF0 쓰면서 챙길 것" }
    ];

    function cur() {
        var v = localStorage.getItem(KEY);
        return (v === "use") ? "use" : "pick";
    }

    window.switchStrollerTab = function (id) {
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
            var btn = document.getElementById("stab-" + t.id);
            if (!btn) return;
            var on = (t.id === c);
            btn.style.background = on ? "#FFFFFF" : "transparent";
            btn.style.color = on ? "#191F28" : "#8B95A1";
            btn.style.boxShadow = on ? "0 2px 8px rgba(0,0,0,0.06)" : "none";
        });
        try { if (typeof window.refreshPlusMark === "function") window.refreshPlusMark(); } catch (e) {}
    }

    /* ---------- ① 접힘 여백 ----------
       strollerguide 는 격자만 숨긴다. 패널 위아래 28px + 제목 아래 24px 이
       그대로 남아서, 접어도 빈 상자가 크다. 여백까지 같이 줄인다. -------- */

    function fixFold() {
        var panel = null, host = strollerHost();
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

        /* ⚠️ 젖병·카시트는 '직접 조건 고르기' 를 접을 수 있는데 유모차만 늘 펼쳐져 있었다.
              그쪽은 안내 파일이 제목에 접기를 걸어두는데 유모차엔 그게 없다.
              걸려 있는 게 없으면 여기서 직접 단다. 처음엔 접어둔다 (젖병·카시트와 같게). */
        if (typeof head.onclick !== "function") {
            var mark = document.createElement("span");
            mark.id = "sf-mark";
            mark.style.cssText = "margin-left:auto; font-size:13px; font-weight:800; color:#8B95A1;";
            try {
                var disp = window.getComputedStyle ? getComputedStyle(head).display : "";
                if (String(disp).indexOf("flex") === -1) {
                    head.style.display = "flex";
                    head.style.alignItems = "center";
                    head.style.gap = "8px";
                }
            } catch (e) {}
            head.appendChild(mark);
            head.style.cursor = "pointer";

            var setFold = function (folded) {
                grid.style.display = folded ? "none" : "";
                mark.textContent = folded ? "펼치기 \u25BE" : "접기 \u25B4";
                apply(folded);
            };
            setFold(true);
            head.onclick = function () { setFold(grid.style.display !== "none"); };
            return;
        }

        /* strollerguide 가 head.onclick 을 이미 걸어뒀다. 지우지 않고 뒤에 얹는다. */
        var orig = head.onclick;
        head.onclick = function (e) {
            if (typeof orig === "function") orig.call(this, e);
            setTimeout(function () { apply(grid.style.display === "none"); }, 0);
        };
    }

    /* ---------- ② 목록 줄의 이모지 ----------
       \u26a0\ufe0f 지우지 않고 흐리게만 한다.
          지우면 strollerguide 를 다시 그릴 때 되살아나고, 글자가 밀린다.
          흐리게 두면 눈이 제목으로 먼저 간다. -------- */

    function calmEmoji() {
        var host = document.getElementById("stroller-guide");
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

        /* 접을 무료 카드. ⚠️ 3분 점검과 뒤보기는 넣지 않는다 — 안전이다. */
    /* \u26a0\ufe0f '이 시기엔 이렇게' 와 '유모차 안전' 은 넣지 않는다 \u2014 안전이다. */
    /* ⚠️ '최대 몇 kg' 은 한 번 적어두면 끝나는 것이다.
          매일 볼 카드가 아니라 접힘 상자가 맞다.
          다만 한도를 넘었을 때는 접히면 안 된다 — 그건 아래에서 따로 뺀다. */
    var FOLD_KEYS = ["기내 반입", "비 오는 날", "유모차에서 잠들었을 때",
                     "숨은 비용", "A/S", "중고", "최대 "];

    function isPlusUser() {
        try { if (typeof window.isPremiumUser === "function") return !!window.isPremiumUser(); } catch (e) {}
        if (!localStorage.getItem("firebase_uid")) return false;
        return localStorage.getItem("tosil_is_founder") === "true"
            || localStorage.getItem("tosil_plan_cache") === "premium"
            || localStorage.getItem("tosil_is_master") === "true";
    }

    var PLUS_TITLE = /우리 유모차/;

    /* \u26a0\ufe0f strollerown.js 는 한 그릇에 여러 패널을 담는다.
          (우리 유모차 + 비 오는 날 + 잠들었을 때 가 한 덩어리)
          그릇째 옮기면 무료 패널이 PLUS 를 따라다닌다.
          그래서 먼저 패널을 하나씩 꺼내 pane 의 직계로 만든 뒤에 정렬한다. */
    var BOXES = ["stroller-own"];

    /* \u26a0\ufe0f 모듈이 다시 그리면 숨은 그릇 안에 새 패널이 생기고,
          꺼내둔 옛 패널은 남아서 화면에 두 벌이 뜬다.
          data-from 으로 표시해두고, 다시 꺼낼 때 옛것을 먼저 치운다. */
    function flatten() {
        var pane = document.getElementById(PANE.use);
        if (!pane) return;
        BOXES.forEach(function (id) {
            var box = document.getElementById(id);
            if (!box || box.parentNode !== pane) return;
            var fresh = Array.prototype.slice.call(box.children);
            if (!fresh.length) return;
            var olds = Array.prototype.slice.call(pane.querySelectorAll('[data-from="' + id + '"]'));
            /* ⚠️ 새로 그린 카드를 늘 '그릇 자리'(대개 맨 아래)에 놓고, 그 다음 정렬이 위로 올렸다.
                  그래서 누를 때마다 카드가 아래에서 위로 튀어 올랐다.
                  지난번에 있던 그 자리에 그대로 놓는다. 그러면 움직이지 않는다. */
            var ref = olds.length ? olds[olds.length - 1].nextSibling : box;
            olds.forEach(function (old) { if (old.parentNode === pane) pane.removeChild(old); });
            if (ref && ref.parentNode !== pane) ref = box;
            fresh.forEach(function (p) {
                p.setAttribute("data-from", id);
                pane.insertBefore(p, ref);
            });
            box.style.display = "none";
        });
    }

    function hookRefresh() {
        ["refreshStrollerOwn"].forEach(function (n) {
            var f = window[n];
            if (typeof f !== "function" || f.__tabs) return;
            var w = function () {
                var r = f.apply(this, arguments);
                setTimeout(function () { hookRefresh(); adopt(); flatten(); orderPlus(); }, 40);
                return r;
            };
            w.__tabs = true;
            window[n] = w;
        });
    }

    /* strollerown.js 는 #stroller-guide 옆에 붙는다.
       그 자리는 '고르기' 칸 안이라, 쓸 때 칸으로 데려와야 한다. */
    function adopt() {
        var use = document.getElementById(PANE.use);
        if (!use) return;
        BOXES.forEach(function (id) {
            var box = document.getElementById(id);
            if (box && box.parentNode !== use) use.appendChild(box);
        });
    }

    function orderPlus() {
            /* ⚠️ 여기서 PLUS_TITLE 로 다시 판단하면 안 된다.
                     plusmark.js 도 자기 목록으로 같은 판단을 하는데,
                     두 목록이 어긋나면 '배지는 붙었는데 정렬은 무료' 가 된다.
                     카시트('이번 주행 계획' 오타)와 유모차('카시트를 얹을 수 있나요')가
                     둘 다 그렇게 됐다. 목록을 두 벌 두면 반드시 어긋난다.

                     plusmark 가 붙인 배지를 그대로 믿는다. 진실은 하나여야 한다.
                     배지가 아직 안 붙었을 때만 제목으로 짐작한다. */
            var isPlusCard = function (el) {
                if (el.querySelector && el.querySelector(".plus-badge")) return true;
                var h = el.querySelector ? el.querySelector(".matrix-header, [data-plus-head]") : null;
                var t = h ? (h.textContent || "") : (el.textContent || "").slice(0, 120);
                return PLUS_TITLE.test(t);
            };

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
            (isPlusCard(el) ? plus : free).push(el);
        });
        if (!plus.length || !free.length) return;

        /* ⚠️ 접힘 상자도 무료다. 무료 유저에게는 무료끼리 묶어서 먼저.
              안 그러면 못 쓰는 PLUS 카드가 중간에 벽처럼 서고,
              그 뒤에 있는 무료 내용을 아무도 못 본다. */
        var extra = [];
        free = free.filter(function (el) {
            if (el.id === "stroller-extra") { extra.push(el); return false; }
            return true;
        });

        var want = plusFirst
            ? plus.concat(free).concat(extra)
            : free.concat(extra).concat(plus);
        var same = want.every(function (el, i) { return kids[i] === el; });
        if (same) return;
        want.forEach(function (el) { pane.appendChild(el); });
    }

    /* ---------- ④ 안 급한 무료 카드 접기 ---------- */

    function foldExtras() {
        var pane = document.getElementById(PANE.use);
        if (!pane) return;

        /* ⚠️ 예전엔 상자가 있으면 그냥 돌아갔다.
              그런데 모듈들이 뒤늦게도 카드를 붙인다.
              상자가 생긴 뒤에 붙은 건 영영 밖에 남아서
              '어떤 건 접히고 어떤 건 안 접힌' 상태가 된다.
              이제 있으면 '그 안으로 마저 넣는' 일을 한다. */
        var wrapOld = document.getElementById("stroller-extra");
        if (wrapOld) {
            var body0 = wrapOld.querySelector(".st-extra-body");
            if (body0) {
                var ps0 = pane.querySelectorAll(".matrix-panel");
                for (var z = 0; z < ps0.length; z++) {
                    var h0 = ps0[z].querySelector(".matrix-header");
                    if (!h0 || h0.querySelector(".plus-badge")) continue;
                    if (ps0[z].parentNode === body0) continue;
                    var t0 = h0.textContent || "";
                    for (var y = 0; y < FOLD_KEYS.length; y++) {
                        if (t0.indexOf(FOLD_KEYS[y]) > -1) { body0.appendChild(ps0[z]); break; }
                    }
                }
                var n0 = wrapOld.querySelector(".st-extra-n");
                if (n0) n0.textContent = String(body0.children.length);
            }
            return;
        }

        var targets = [];
        var scan = function (root) {
            var ps = root.querySelectorAll(".matrix-panel");
            for (var i = 0; i < ps.length; i++) {
                var h = ps[i].querySelector(".matrix-header");
                if (!h) continue;
                var t = h.textContent || "";
                /* ⚠️ 배지가 붙기 전에 이 검사가 돌면 유료 카드가 접기 상자로 들어간다.
                      그 다음에 배지가 붙으면 정렬이 다시 위로 올려서, 카드가 혼자 자리를 옮긴 것처럼 보였다
                      (밑에 있던 '쪽쪽이' 카드가 누르면 맨 위로 올라온 것이 이것이다).
                      배지가 없으면 제목으로 판단한다 — orderPlus 와 같은 기준. */
                if (h.querySelector(".plus-badge")) continue;
                if (PLUS_TITLE.test(h.textContent || "")) continue;          // 유료는 안 접는다
                for (var k = 0; k < FOLD_KEYS.length; k++) {
                    if (t.indexOf(FOLD_KEYS[k]) > -1) { targets.push(ps[i]); break; }
                }
            }
        };
        scan(pane);
        if (targets.length < 3) return;

        var wrap = document.createElement("div");
        wrap.id = "stroller-extra";
        wrap.style.cssText = "margin-bottom:20px;";

        var head = document.createElement("div");
        head.style.cssText =
            "display:flex; align-items:center; gap:8px; background: #FFFFFF; " +
            "border:1px solid #F2F5F8; border-radius:20px; padding:18px 22px; " +
            "cursor:pointer; box-shadow:0 4px 16px rgba(0,0,0,0.04);";
        head.innerHTML =
            '<span style="font-size:15px; font-weight:900; color:#191F28;">' +
                '\uD83D\uDCD6 알아두면 좋은 것</span>' +
            '<span class="st-extra-n" style="font-size:12.5px; font-weight:800; color:#8B95A1;">' + targets.length + '</span>' +
            '<span id="sse-mark" style="margin-left:auto; font-size:13px; font-weight:800; ' +
                'color:#8B95A1;">펼치기 \u25BE</span>';

        var body = document.createElement("div");
        /* 나중에 붙는 카드를 여기로 마저 넣으려면 찾을 수 있어야 한다 */
        body.className = "st-extra-body";
        body.style.cssText = "display:none; margin-top:12px;";

        wrap.appendChild(head);
        wrap.appendChild(body);
        /* ⚠️ targets[0] 가 pane 의 직계가 아니면 insertBefore 가 터진다.
              그러면 여기서 멈춰서 접기도 정렬도 다 안 된다.
              직계인 조상을 찾아서 그 앞에 끼운다. */
        var ref = targets[0];
        while (ref && ref.parentNode !== pane) ref = ref.parentNode;
        if (ref) pane.insertBefore(wrap, ref); else pane.appendChild(wrap);
        targets.forEach(function (el) { body.appendChild(el); });

        head.onclick = function () {
            var on = (body.style.display === "none");
            body.style.display = on ? "block" : "none";
            var mk = document.getElementById("sse-mark");
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
        /* \u26a0\ufe0f main 의 '직계 자식' 만 옮길 수 있다.
              #vs-result 는 .matrix-panel 안에 있어서 여기 적으면 안 된다.
              반대로 .filter-section 과 #show-more-btn 은 직계인데
              빠뜨리면 '쓰면서 챙길 것' 으로 넘어가버린다. */
        var scoped = function (cls) {
            for (var q = 0; q < host.children.length; q++) {
                var c = host.children[q];
                if (String(c.className || "").indexOf(cls) > -1) return c;
            }
            return null;
        };

        var pick = [
            ownPanel,                                            // 맞춤 유모차 상세 조건 (+비교표)
            scoped("filter-section"),                            // 조건 고르기
            (byId("btn-show-fav") || {}).parentNode || null,     // 찜 버튼 줄
            byId("result-top-title"),
            byId("result-top-area"),                             // 1순위 추천
            byId("show-more-btn"),
            byId("result-other-area")                            // 나머지 50종
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

    /* 탭이 붙기 전 1.4초 동안 원래 배치가 보였다가 확 바뀐다.
       그 사이를 부드럽게 만든다. 완전히 가리면 느려 보이니 살짝만. */
    /* \u26a0\ufe0f 흐림을 JS 로 켜면 이미 늦다. 그때는 원래 배치가 벌써 보인 뒤다.
          그래서 CSS 가 처음부터 감춰두고, 여기서는 걷어내기만 한다.
          index.html <style> 에 아래가 있어야 한다.

            main.container { animation: tabReady .2s ease-out 1.2s forwards; opacity: 0; }
            main.container.tabs-on { animation: none; opacity: 1; transition: opacity .2s; }
            @keyframes tabReady { to { opacity: 1; } }

          CSS 를 안 넣었어도 화면이 안 깨진다. 클래스만 붙고 끝난다. */
    function showNow() {
        var h = document.querySelector("main.container") || document.querySelector(".container");
        if (h) h.classList.add("tabs-on");
    }

    function build() {
        /* \u26a0\ufe0f 탭 칸은 index.html 에 박아뒀다.
              JS 가 만들어서 옮기면 그 사이 원래 배치가 보였다가 확 바뀐다.
              여기서는 '있으면 그대로 쓰고', 없을 때만 만든다. */
        var host = strollerHost();
        if (!host) return false;

        if (document.getElementById(PANE.pick) && document.getElementById(PANE.use)) {
            showNow();
            paint();
            /* \u26a0\ufe0f 칸이 이미 있으면 build 가 곧장 통과한다.
                  그러면 아래 setTimeout 정리가 1.4초 뒤에나 돌아서
                  탭은 떴는데 안이 비어 보인다. 여기서 바로 한 번 정리한다. */
            hookRefresh(); adopt(); flatten(); orderPlus(); foldExtras();
            setTimeout(function () { adopt(); flatten(); orderPlus(); foldExtras(); }, 250);
            setTimeout(function () { adopt(); flatten(); orderPlus(); foldExtras(); }, 700);
            return true;
        }

        /* --- 여기서부터는 index.html 에 칸이 없을 때의 대비책 --- */
        if (document.getElementById(BAR)) return true;

        var plan = planOf(host);
        if (!plan.pick.length) return false;

        var bar = document.createElement("div");
        bar.id = BAR;
        bar.style.cssText =
            "display:flex; gap:4px; background: #F2F4F6; border:1px solid #E5E8EB; " +
            "border-radius:14px; padding:4px; margin:0 0 20px;";
        bar.innerHTML = TABS.map(function (t) {
            return '<div id="stab-' + t.id + '" onclick="window.switchStrollerTab(\'' + t.id + '\')" ' +
                'style="flex:1; text-align:center; padding:12px 8px; border-radius:11px; ' +
                'cursor:pointer; font-size:13.5px; font-weight:800; white-space:nowrap; ' +
                'transition:0.15s;">' + t.label + '</div>';
        }).join("");
        host.insertBefore(bar, plan.pick[0]);

        TABS.forEach(function (t) {
            var pane = document.createElement("div");
            pane.id = PANE[t.id];
            host.appendChild(pane);
            plan[t.id].forEach(function (el) { pane.appendChild(el); });
        });

        var footer = host.querySelector(".legal-footer");
        if (footer) host.appendChild(footer);

        showNow();
        paint();
        return true;
    }

    function boot() {
        var tries = 0;
        var go = function () {
            fixFold();
            calmEmoji();
            if (build()) {
                setTimeout(function () { hookRefresh(); calmEmoji(); flatten(); orderPlus(); foldExtras(); }, 400);
                setTimeout(function () { hookRefresh(); adopt(); flatten(); orderPlus(); foldExtras(); }, 1400);
                setTimeout(function () { hookRefresh(); adopt(); flatten(); orderPlus(); foldExtras(); }, 3000);
                return;
            }
            if (++tries < 20) setTimeout(go, 150);
        };
        setTimeout(go, 120);
        /* 탭이 못 붙어도 화면은 반드시 보여야 한다 */
        setTimeout(showNow, 2000);
        setTimeout(function () { showNow(); }, 2500);

        /* ⚠️ 모듈이 카드를 다시 그리면 그릇(box) 안에 새로 만들어진다.
              그런데 그 그릇은 flatten() 이 숨겨둔 상태라, 4초짜리 타이머가 돌아
              꺼내줄 때까지 화면이 안 바뀌었다. 누르고 몇 초 뒤에 반응하는 것처럼
              느껴진 게 이것이다. 그릇이 바뀌는 즉시 꺼낸다. */
        if (window.MutationObserver) {
            var qt = null;
            var mo = new MutationObserver(function () {
                if (qt) return;
                qt = setTimeout(function () {
                    qt = null;
                    flatten();
                /* 카드를 다시 그리면 PLUS 배지도 같이 지워진다. 배지 담당(plusmark)은
                   0.4초 뒤에야 다시 붙여서, 누를 때마다 배지가 사라졌다 생겼다 했다.
                   여기서 바로 붙여준다. */
                if (window.refreshPlusMark) window.refreshPlusMark();
                foldExtras(); orderPlus();
                }, 60);
            });
            var watchBoxes = function () {
                BOXES.forEach(function (id) {
                    var b = document.getElementById(id);
                    if (b) mo.observe(b, { childList: true });
                });
            };
            watchBoxes();
            setTimeout(watchBoxes, 1200);     // 늦게 생기는 그릇도 있다
            setTimeout(watchBoxes, 3000);
        }

        setInterval(function () { if (document.hidden) return;   /* 다른 앱을 보는 동안은 쉰다 (배터리) */
            calmEmoji(); hookRefresh(); adopt(); flatten();
                /* 카드를 다시 그리면 PLUS 배지도 같이 지워진다. 배지 담당(plusmark)은
                   0.4초 뒤에야 다시 붙여서, 누를 때마다 배지가 사라졌다 생겼다 했다.
                   여기서 바로 붙여준다. */
                if (window.refreshPlusMark) window.refreshPlusMark();
                foldExtras(); orderPlus(); }, 4000);   // 다시 그려져도 유지
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    window.strollerTabsDebug = function () {
        var host = strollerHost();
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
        var ex = document.getElementById("stroller-extra");
        console.log("접어둔 무료 카드:", ex ? ex.lastChild.children.length + "개" : "없음");
    };
})();