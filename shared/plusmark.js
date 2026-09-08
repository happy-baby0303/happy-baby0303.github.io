/* ============================================================
   배냇함 — PLUS 표시 (plusmark.js)

   큐레이터 한 탭에 흰 패널이 열 개씩 쌓여 있는데
   전부 똑같이 생겨서 어디까지가 유료인지 아무도 모른다.
   만든 사람도 모른다.

   그래서 유료 패널 제목 옆에 배지를 하나 붙인다.

       🔁 갈 때가 된 것                        PLUS
       🔁 갈 때가 된 것                     🔒 PLUS      ← 아직 구독 안 하셨으면

   ⚠️ 탭을 따로 빼지 않는다.
      PLUS 만 모아둔 탭은 미구독자에게 자물쇠 벽이 된다.
      지금처럼 무료 기능 사이에 섞여 있어야
      "이건 되는데 저건 안 되네" 가 보이고, 그게 결제로 간다.

   ⚠️ 아래 목록만 고치면 된다. 다섯 폴더가 같은 파일을 쓴다.
      제목이 바뀌면 배지가 안 붙을 뿐, 화면이 깨지지는 않는다.

   각 폴더 index.html 맨 끝에서 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    /* 유료 패널의 제목. 이모지까지 똑같이 적을 필요는 없고, 이 글자가
       제목 안에 들어 있으면 배지가 붙는다.

       ⚠️ 다섯 폴더가 이 파일 한 벌을 같이 쓴다.
          ../shared/plusmark.js 로 두고 각 index.html 에서 불러오세요.
          폴더마다 복사해두면 반드시 어긋납니다. 지금까지 그래 왔습니다. */
    var PLUS_TITLES = [
        /* 젖병
           ⚠️ '우리 집 수유 장비' 는 넣지 않는다. 등록과 조합 경고는 무료다.
              안전에 걸리는 건 잠그지 않기로 했다. */
        "갈 때가 된 것",
        "다음에 준비할 것",
        "젖병을 안 물어요",
        "우리 집 모유 재고",
        "쪽쪽이, 자꾸 뱉나요",     // 무료로 내리시면 이 줄을 지우세요

                        /* 이유식 */
        "맞춤 영양 식단표",
        "완벽한 7일 식단표",
        "몇 개 사면 되나",
        "주간 영양 분석",
        "일주일 식단표 한눈에",

        /* 장난감 */
        "이번 주 놀이",
        "잠자고 있는 장난감",
        "뭐 사줄까 물어보면",

                              /* 카시트
           ⚠️ '하네스를 스스로 풀 때' 와 '장거리·귀성길에 지킬 것' 은 넣지 않는다.
              안전 정보라 무료다. "차에 아이만 두고 내리지 마세요" 를 파는 앱이 되면 안 된다. */
        "우리 카시트",
        "카시트만 타면 울어요",
        "이번 주행 계획",

        /* 유모차는 만들면서 한 줄씩 늘리세요.
           제목 전체가 아니라 '들어 있으면' 걸리므로 짧게 적는 게 낫습니다. */
    ];

    /* 제목을 어디서 찾을지.
       ⚠️ 젖병·이유식은 .matrix-header 를 쓰지만 장난감은 안 쓴다.
          모듈마다 markup 이 달라서, 붙일 자리를 넓게 잡는다.
          새 모듈을 만들 때는 그냥 data-plus-head 를 달아주면 된다. */
    var HEAD_SEL = ".matrix-header, .panel-header-dark, [data-plus-head]";

    var GOLD = "#8A6D00", GOLD_BG = "#FFF9E6", GOLD_BD = "#F5E1A4";

    function isPlus() {
        try { if (typeof window.isPremiumUser === "function") return !!window.isPremiumUser(); } catch (e) {}
        if (!localStorage.getItem("firebase_uid")) return false;
        return localStorage.getItem("tosil_is_founder") === "true"
            || localStorage.getItem("tosil_plan_cache") === "premium"
            || localStorage.getItem("tosil_is_master") === "true";
    }

    function isPlusTitle(t) {
        var s = String(t || "");
        for (var i = 0; i < PLUS_TITLES.length; i++) {
            if (s.indexOf(PLUS_TITLES[i]) > -1) return true;
        }
        return false;
    }

    function badge() {
        var on = isPlus();
        var b = document.createElement("span");
        b.className = "plus-badge";
        b.style.cssText =
            "margin-left:auto; flex-shrink:0; padding:4px 9px; border-radius:7px; " +
            "font-size:10.5px; font-weight:900; letter-spacing:0.4px; white-space:nowrap; " +
            "background:" + GOLD_BG + "; color:" + GOLD + "; border:1px solid " + GOLD_BD + ";";
        b.textContent = on ? "PLUS" : "\uD83D\uDD12 PLUS";
        return b;
    }

    function mark() {
        var heads = document.querySelectorAll(HEAD_SEL);
        var want = isPlus() ? "PLUS" : "\uD83D\uDD12 PLUS";

        for (var i = 0; i < heads.length; i++) {
            var h = heads[i];
            var old = h.querySelector(".plus-badge");

            if (!isPlusTitle(h.textContent)) {
                if (old) old.parentNode.removeChild(old);
                continue;
            }
            /* 이미 붙어 있고 상태도 같으면 건드리지 않는다 */
            if (old && old.textContent === want) continue;
            if (old) old.parentNode.removeChild(old);

            /* \u26a0\ufe0f .matrix-header 는 flex 라 margin-left:auto 로 오른쪽 끝에 붙는데,
                  flex 가 아닌 제목에 그냥 넣으면 글자 바로 뒤에 달라붙는다.
                  그래서 flex 가 아니면 flex 로 만들어준다. */
            try {
                var disp = (window.getComputedStyle ? getComputedStyle(h).display : "");
                               if (disp.indexOf("flex") === -1) {
                    h.style.display = "flex";
                    h.style.alignItems = "center";
                                        h.style.gap = h.style.gap || "8px";
                    /* ⚠️ width:100% 를 넣지 마세요.
                          summary 나 이미 자리를 잡은 제목에 폭을 강제하면
                          부모 레이아웃이 밀려서 옆 칸이 사라집니다.
                          배지를 오른쪽 끝으로 보내는 건 감싼 div 쪽에서 해결합니다. */
                }
            } catch (e) {}

            h.appendChild(badge());
        }
    }
    window.refreshPlusMark = mark;

    /* 패널들이 계속 다시 그려지므로 붙는 것도 계속 지켜본다 */
    function watch() {
        mark();
        try {
            var mo = new MutationObserver(function () {
                clearTimeout(window.__plusMarkT);
                window.__plusMarkT = setTimeout(mark, 120);
            });
            var host = document.querySelector("main.container") || document.body;
            mo.observe(host, { childList: true, subtree: true });
        } catch (e) {
            setInterval(mark, 1500);        // MutationObserver 를 못 쓰면 그냥 주기적으로
        }
    }

    /* 다크모드 (style.css 가 인라인 배경만 반전시켜서 글씨가 묻힌다) */
    (function darkFix() {
        if (document.getElementById("pm-vars")) return;
        var st = document.createElement("style");
        st.id = "pm-vars";
        st.textContent =
            "body.dark-mode .plus-badge{background:#2D2513 !important;" +
            "border-color:#5C4300 !important;color:#F5C542 !important;}";
        (document.head || document.documentElement).appendChild(st);
    })();

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () {
        setTimeout(watch, 400);
    });
    else setTimeout(watch, 400);

    window.plusMarkVersion = '2026-09-07';   // 다섯 폴더가 같은 날짜여야 한다

    window.plusMarkDebug = function () {
        console.log("이 폴더의 plusmark 판:", window.plusMarkVersion);
        console.log("PLUS 구독:", isPlus());
        var heads = document.querySelectorAll(HEAD_SEL);
        console.log("패널 제목 " + heads.length + "개:");
        for (var i = 0; i < heads.length; i++) {
            var t = heads[i].textContent.replace(/\s*(?:\uD83D\uDD12\s*)?PLUS\s*$/, "").trim();
            console.log("   " + (isPlusTitle(t) ? "\uD83D\uDD12 유료" : "   무료") + "  " + t);
        }
        console.log("붙은 배지:", document.querySelectorAll(".plus-badge").length + "개");
    };
})();