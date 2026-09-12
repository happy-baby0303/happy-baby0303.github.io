/* ============================================================
   배냇함 — 아이콘 (icons.js)

   하단 탭이 이모지였다.  🏠 🧰 🗺️ 📚 🧺

   이모지는 우리가 그리는 게 아니라 OS 가 그린다.
   갤럭시에서 본 🧺 와 아이폰에서 본 🧺 는 다른 그림이다.
   앱의 얼굴을 삼성과 애플이 정하고 있었던 셈이다.

   색도 제각각이다. 앱은 크림·보라·금색인데
   🧰 는 갈색, 🗺️ 는 파랑, 📚 는 빨강·초록·파랑이 섞여 있다.
   화면이 정돈돼 보이지 않는 이유의 절반이 이거다.

   그래서 다섯 개를 직접 그린다. 한 가지 색만 쓰고,
   선택된 탭은 보라로 켜진다. 어느 기기에서든 같은 얼굴이다.

   ⚠️ index.html 을 안 고친다.
      <span class="icon"> 안의 글자만 SVG 로 갈아끼운다.
      나중에 마음이 바뀌면 이 파일 한 줄만 빼면 원래대로 돌아온다.

   ⚠️ 배냇함 탭은 아이 이름으로 바뀐다(babytab.js).
      글자만 바꾸고 아이콘은 안 건드리니 서로 안 부딪힌다.

   index.html 에서 babytab.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var OFF = "#B3A79C";   // 안 켜진 탭
    var ON  = "#7F77DD";   // 켜진 탭

    /* ---------- 그림 ----------
       전부 24×24, 선 두께 1.8, 끝은 둥글게.
       한 벌로 보이려면 이 세 가지가 같아야 한다. -------- */

    function svg(inner) {
        return '<svg viewBox="0 0 24 24" width="23" height="23" fill="none" ' +
            'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" ' +
            'stroke-linejoin="round" style="display:block;">' + inner + '</svg>';
    }

    var ART = {
        /* 홈 — 지붕과 문. 창문은 뺐다. 작을 때 점으로 뭉친다 */
        home: svg(
            '<path d="M3.5 10.2 12 3.6l8.5 6.6V20a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1z"/>' +
            '<path d="M9.6 21v-5.6h4.8V21"/>'
        ),

        /* 툴박스 — 손잡이 달린 가방 */
        toolbox: svg(
            '<rect x="3" y="8" width="18" height="12" rx="2.4"/>' +
            '<path d="M8.6 8V6.2a1.6 1.6 0 0 1 1.6-1.6h3.6a1.6 1.6 0 0 1 1.6 1.6V8"/>' +
            '<path d="M3 13.4h18"/>'
        ),

        /* 나들이 — 접힌 지도. 세 폭이 접힌 모양 */
        hotplace: svg(
            '<path d="M3.4 6.4 9 4.3v13.3l-5.6 2.1z"/>' +
            '<path d="M9 4.3l6 2.1v13.3L9 17.6z"/>' +
            '<path d="M15 6.4l5.6-2.1v13.3L15 19.7z"/>'
        ),

        /* 육아정보 — 펼친 책 */
        info: svg(
            '<path d="M12 6.6C10.4 5.2 8.3 4.5 5.6 4.5H3.6v13.2h2q3.8 0 6.4 2.1"/>' +
            '<path d="M12 6.6c1.6-1.4 3.7-2.1 6.4-2.1h2v13.2h-2q-3.8 0-6.4 2.1z"/>' +
            '<path d="M12 6.6v13.2"/>'
        ),

        /* 배냇함 — 뚜껑이 살짝 열린 함.
           이 앱의 이름이 이거다. 다섯 중 여기만 뚜껑이 떠 있다 */
        memorybox: svg(
            '<path d="M4.4 10.8h15.2v8.2a1.4 1.4 0 0 1-1.4 1.4H5.8a1.4 1.4 0 0 1-1.4-1.4z"/>' +
            '<path d="M3.2 7.4 20.4 5.2l.5 3.1L3.7 10.5z"/>' +
            '<path d="M12 11v9.4"/>'
        )
    };

    var MAP = {
        "nav-home":      "home",
        "nav-toolbox":   "toolbox",
        "nav-hotplace":  "hotplace",
        "nav-info":      "info",
        "nav-memorybox": "memorybox"
    };

    /* ---------- 갈아끼우기 ---------- */

    function paint() {
        Object.keys(MAP).forEach(function (id) {
            var tab = document.getElementById(id);
            if (!tab) return;

            var slot = tab.querySelector(".icon");
            if (!slot) return;

            var on = tab.classList.contains("active");

            if (slot.getAttribute("data-bnh-icon") !== MAP[id]) {
                slot.setAttribute("data-bnh-icon", MAP[id]);
                slot.innerHTML = ART[MAP[id]];

                /* style.css 가 이모지용으로 걸어둔 것들을 끈다.
                   grayscale·opacity 는 이모지를 흐리게 만드는 장치인데
                   선 그림에는 오히려 지저분해 보인다. */
                slot.style.filter = "none";
                slot.style.opacity = "1";
                slot.style.fontSize = "0";
                slot.style.display = "flex";
                slot.style.justifyContent = "center";
                slot.style.marginBottom = "3px";
            }

            slot.style.color = on ? ON : OFF;
            var svgEl = slot.firstElementChild;
            if (svgEl) svgEl.style.transform = on ? "translateY(-1px)" : "";
        });
    }

    window.repaintNavIcons = paint;

    /* ---------- 탭을 옮기면 따라간다 ---------- */

    function hookSwitch() {
        var orig = window.switchTab;
        if (typeof orig !== "function" || orig.__icons) return false;
        var w = function () {
            var out = orig.apply(this, arguments);
            setTimeout(paint, 20);
            return out;
        };
        w.__icons = true;
        window.switchTab = w;
        return true;
    }

    function boot() {
        paint();

        var n = 0;
        var t = setInterval(function () {
            if (hookSwitch() || ++n > 30) clearInterval(t);
            paint();
        }, 200);

        setTimeout(paint, 1200);
        setTimeout(paint, 3000);

        /* 다른 모듈이 탭을 다시 그리면 아이콘이 이모지로 되돌아온다.
           active 클래스가 바뀌는 것만 지켜본다. */
        if (window.MutationObserver) {
            var nav = document.querySelector(".bottom-nav");
            if (nav) {
                new MutationObserver(function () { paint(); })
                    .observe(nav, { subtree: true, childList: true,
                                    attributes: true, attributeFilter: ["class"] });
            }
        }
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    /* ---------- 점검용 ---------- */
    window.iconDebug = function () {
        Object.keys(MAP).forEach(function (id) {
            var tab = document.getElementById(id);
            var slot = tab && tab.querySelector(".icon");
            console.log("  " + id + ":", !slot ? "칸 없음"
                : (slot.getAttribute("data-bnh-icon") ? "SVG ✅" : "아직 이모지"));
        });
    };
})();