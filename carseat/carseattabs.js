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
    /* 접을 무료 카드.

       ⚠️ 뒤보기와 3분 점검도 접는다. 다만 조건이 하나 있다.

          뒤보기는 한 번 정하면 한동안 안 바뀌는 결정이다.
          3분 점검도 목록이라 매번 읽는 게 아니라 한 번 익히면 된다.
          그래서 평소엔 접어두는 게 맞다 — 안 그러면 탭이 길어져서
          정작 오늘 볼 것(주행 계획·PLUS)이 아래로 밀린다.

          그런데 15개월 전 아기는 다르다.
          그때 앞을 보게 두면 정면 충돌에서 목에 힘이 그대로 간다.
          그 경우에만 카드 머리말에 '반드시' 가 붙는다(carseatguide.js).
          그때는 접지 않고 밖에 세워둔다. 아래 NEVER_FOLD 가 그 일을 한다. */

    var FOLD_KEYS = ["ADAC", "어떤 상황", "중고로", "쿨시트", "차에서 뭘",
                     "사고가 났다면", "토했을 때", "하네스를 스스로", "장거리",
                     "리콜", "뒤보기", "태우기 전", "3분"];

    /* ⚠️ 머리말 글자로는 급한지 알 수 없다.
          "🔄 뒤보기 · 앞보기" 는 6개월이든 30개월이든 똑같기 때문이다.
          그래서 카드를 만드는 쪽(carseatguide.js)이 급할 때만
          data-never-fold="1" 을 달아준다. 그것만 본다. */
    function neverFoldEl(el) {
        return !!(el && el.getAttribute && el.getAttribute("data-never-fold") === "1");
    }

    var BOXES = ["carseat-own", "carseat-cry"];

    function isPlusUser() {
        try { if (typeof window.isPremiumUser === "function") return !!window.isPremiumUser(); } catch (e) {}
        if (!localStorage.getItem("firebase_uid")) return false;
        return localStorage.getItem("tosil_is_founder") === "true"
            || localStorage.getItem("tosil_plan_cache") === "premium"
            || localStorage.getItem("tosil_is_master") === "true";
    }

    /* ⚠️ '이번 주행 계획' 이라고 적혀 있었다.
          실제 카드 제목은 '이번 주 여행 계획' 이다. 한 글자가 다르다.

              화면   이번 주 여행 계획
              여기   이번 주행 계획        ← 안 맞는다

          그래서 이 카드가 PLUS 로 분류되지 않았고,
          정렬에서 빠져 뒤보기·3분점검 아래에 혼자 남았다.
          plusmark.js 는 '이번 주 여행 계획' 으로 맞게 적혀 있어서
          자물쇠 배지는 붙고 순서만 안 맞는, 찾기 어려운 상태였다.

          ⚠️ 새 PLUS 카드를 만들면 여기와 shared/plusmark.js 둘 다 고칠 것.
             둘 중 하나만 고치면 꼭 이런 일이 난다. */
    var PLUS_TITLE = /우리 카시트|카시트만 타면 울어요|이번 주 여행 계획/;

    /* \u26a0\ufe0f carseatown.js 와 carseatcry.js 는 한 그릇에 여러 패널을 담는다.
          (우리 카시트 + 쿨시트 + 차에서 + 사고 + 세탁 이 한 덩어리)
          그릇째 옮기면 무료 패널이 PLUS 를 따라다닌다.
          그래서 먼저 패널을 하나씩 꺼내 pane 의 직계로 만든 뒤에 정렬한다. */
    /* \u26a0\ufe0f 모듈이 다시 그리면 숨은 그릇 안에 새 패널이 생긴다.
          꺼내둔 옛 패널은 그대로 남아서 화면에 두 벌이 뜬다.
          그래서 다시 꺼낼 때는 '내가 꺼냈던 것' 을 먼저 치운다.
          data-from 으로 표시해두면 누가 꺼낸 건지 알 수 있다. */
    function flatten() {
        var pane = document.getElementById(PANE.use);
        if (!pane) return;
        BOXES.forEach(function (id) {
            var box = document.getElementById(id);
            if (!box || box.parentNode !== pane) return;
            var fresh = Array.prototype.slice.call(box.children);
            if (!fresh.length) return;

            // 지난번에 이 그릇에서 꺼낸 것들을 치운다
            Array.prototype.slice.call(pane.querySelectorAll('[data-from="' + id + '"]'))
                .forEach(function (old) { if (old.parentNode === pane) pane.removeChild(old); });

            fresh.forEach(function (p) {
                p.setAttribute("data-from", id);
                pane.insertBefore(p, box);
            });
            box.style.display = "none";   // 그릇은 남긴다. 모듈이 다시 그릴 자리다
        });
    }

    /* 모듈이 다시 그린 직후에 바로 정리한다. 4초를 기다리면 그동안 화면이 깨진다. */
    function hookRefresh() {
        ["refreshCarseatOwn", "refreshCarseatCry"].forEach(function (n) {
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

    /* 모듈은 자기 앵커 옆에 붙는다. 그 자리가 '고르기' 칸이면 데려와야 한다. */
    function adopt() {
        var use = document.getElementById(PANE.use);
        if (!use) return;
        BOXES.forEach(function (id) {
            var box = document.getElementById(id);
            if (box && box.parentNode !== use) use.appendChild(box);
        });
    }

    function orderPlus() {
        var pane = document.getElementById(PANE.use);
        if (!pane) return;
        var plusFirst = isPlusUser();

        var kids = Array.prototype.slice.call(pane.children).filter(function (el) {
            return el.style.display !== "none";
        });
        /* ⚠️ 뒤보기·3분 점검은 '무료' 로 분류돼서 PLUS 카드 사이에 끼었다.
              접자니 안 펴서 못 보고, 맨 아래 두자니 역시 못 본다.

              이건 자리가 정해져 있는 물건이다 — 맨 위다.
              방향이 틀리면 사고 때 목에 힘이 그대로 가고,
              3분 점검은 태우기 직전에 여는 화면이다.
              PLUS 든 무료든 이 둘보다 위에 올 건 없다. */
        var pin = [];
        kids = kids.filter(function (el) {
            if (el.id === "carseat-guide-use") { pin.push(el); return false; }
            return true;
        });

        var plus = [], free = [];
        kids.forEach(function (el) {
            var h = el.querySelector ? el.querySelector(".matrix-header") : null;
            var t = h ? (h.textContent || "") : (el.textContent || "").slice(0, 120);
            (PLUS_TITLE.test(t) ? plus : free).push(el);
        });
        if (!plus.length && !free.length) return;

        /* ⚠️ '알아두면 좋은 것' 상자는 어느 쪽도 아니다.
              무료로 치면 PLUS 사이에 끼고, 유료로 치면 거짓말이 된다.
              접어둔 것이니 늘 맨 아래로 보낸다. */
        var extra = [];
        free = free.filter(function (el) {
            if (el.id === "carseat-extra") { extra.push(el); return false; }
            return true;
        });

        /* ⚠️ 접힘 상자도 무료다. 무료 유저에게는 무료끼리 묶어서 먼저 보여준다.
              안 그러면 못 쓰는 PLUS 카드가 중간에 벽처럼 서고,
              그 뒤에 있는 무료 내용을 아무도 못 본다.
              PLUS 회원은 반대다 — 돈 낸 것부터 위로. */
        var want = pin.concat(
            plusFirst ? plus.concat(free).concat(extra)
                      : free.concat(extra).concat(plus));

        var now = pin.concat(kids);
        var same = want.every(function (el, i) { return now[i] === el; });
        if (same) return;
        want.forEach(function (el) { pane.appendChild(el); });
    }

    /* ---------- ④ 안 급한 무료 카드 접기 ---------- */

    function foldExtras() {
        var pane = document.getElementById(PANE.use);
        if (!pane) return;

        /* 상태가 바뀌면(15개월이 지나면) 밖에 있던 카드를 안으로 들여야 한다.
           반대로 접혀 있던 게 위험해지면 밖으로 꺼내야 한다. */
        var wrapNow = document.getElementById("carseat-extra");
        if (wrapNow) {
            var b = wrapNow.querySelector(".cs-extra-body");
            if (b) {
                Array.prototype.slice.call(b.children).forEach(function (el) {
                    if (neverFoldEl(el)) pane.insertBefore(el, wrapNow);   // 위험해졌다 → 밖으로
                });
            }
        }

        /* ⚠️ 예전엔 여기서 끝냈다.
                 if (document.getElementById("carseat-extra")) return;

              상자를 한 번 만들고 나면 다시는 안 돌았다.
              그런데 모듈들이 800ms · 2500ms 에도 카드를 붙인다.
              상자가 생긴 뒤에 붙은 카드는 영영 밖에 남는다.
              그래서 어떤 건 접히고 어떤 건 안 접혀 보였던 것이다.

              이제 상자가 있으면 '그 안으로 마저 넣는' 일을 한다. */
        var wrapOld = document.getElementById("carseat-extra");
        if (wrapOld) {
            var body = wrapOld.querySelector(".cs-extra-body");
            if (body) {
                var late = [];
                var ps0 = pane.querySelectorAll(":scope > .matrix-panel");
                for (var z = 0; z < ps0.length; z++) {
                    var h0 = ps0[z].querySelector(".matrix-header");
                    if (!h0) continue;
                    if (h0.querySelector(".plus-badge")) continue;
                    var t0 = h0.textContent || "";
                    if (neverFoldEl(ps0[z])) continue;
                    for (var y = 0; y < FOLD_KEYS.length; y++) {
                        if (t0.indexOf(FOLD_KEYS[y]) > -1) { late.push(ps0[z]); break; }
                    }
                }
                late.forEach(function (el) { body.appendChild(el); });

                /* 개수 표시도 따라가야 한다. '3' 이라 적혀 있는데
                   펼치면 다섯이 나오면 그게 더 이상하다. */
                var n = wrapOld.querySelector(".cs-extra-n");
                if (n) n.textContent = String(body.children.length);
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
                if (h.querySelector(".plus-badge")) continue;          // 유료는 안 접는다
                if (neverFoldEl(ps[i])) continue;                      // 지금 위험한 건 안 접는다
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
            '<span class="cs-extra-n" style="font-size:12.5px; font-weight:800; color:#8B95A1;">' + targets.length + '</span>' +
            '<span id="cse-mark" style="margin-left:auto; font-size:13px; font-weight:800; ' +
                'color:#8B95A1;">펼치기 \u25BE</span>';

        var body = document.createElement("div");
        /* ⚠️ 나중에 붙는 카드를 여기로 마저 넣으려면 찾을 수 있어야 한다. */
        body.className = "cs-extra-body";
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
              있으면 그대로 쓰고, 없을 때만 만든다. */
        if (document.getElementById(PANE.pick) && document.getElementById(PANE.use)) {
            showNow();
            paint();
            /* 칸이 이미 있으면 build 가 곧장 통과해서 아래 정리가 늦게 돈다.
               탭은 떴는데 안이 비어 보이지 않게 여기서 바로 한 번 한다. */
            hookRefresh(); adopt(); flatten(); orderPlus(); foldExtras();
            setTimeout(function () { adopt(); flatten(); orderPlus(); foldExtras(); }, 250);
            setTimeout(function () { adopt(); flatten(); orderPlus(); foldExtras(); }, 700);
            return true;
        }
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
        showNow();
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
        /* ⚠️ foldExtras 도 같이 돌려야 한다.
              늦게 붙은 카드를 상자 안으로 마저 넣는 일을 여기서 한다. */
        setInterval(function () {
            calmEmoji(); hookRefresh(); adopt(); flatten(); foldExtras(); orderPlus();
        }, 4000);   // 다시 그려져도 유지
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