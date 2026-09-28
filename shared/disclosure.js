/* ============================================================
   배냇함 — 제휴 고지 (disclosure.js)

   쿠팡 파트너스는 대가성 문구를 "소비자가 쉽게 알아볼 수 있는 곳"에
   두라고 한다. 공정거래위원회 추천·보증 심사지침도 같은 말이다.

   지금 다섯 큐레이터는 전부 이렇게 돼 있다.

       · 페이지 제일 아래
       · 12.5px 회색 글씨
       · 면책 조항과 한 덩어리로 묶여 있음

   스크롤을 끝까지 내려야 보이고, 내려도 눈에 안 들어온다.
   카시트만 걸린 게 아니라 다섯 개가 다 같은 구조다.
   먼저 걸렸을 뿐이다.

   그래서 맨 위에 둔다. 아래쪽 고지는 각 index.html 에서 뺐다 (한 화면에 한 번이면 된다).

   ⚠️ 문구를 흐리게 하거나 접어두지 않는다.
      그렇게 하면 넣으나 마나다.

   ⚠️ 그렇다고 경고창처럼 칠하지도 않는다.
      주황 테두리 + 진한 빨강 굵은 글씨 세 군데라 매 탭 맨 위에 사고 경고가 뜬 것처럼 보였다.
      지침이 요구하는 건 '쉽게 알아볼 수 있게' 다. 맨 위 · 본문과 같은 크기 · 충분한 대비 · 안 접힘.
      '제휴' 표시를 앞에 붙여 한눈에 무슨 글인지 보이게 한다.

   ⚠️ '배냇함은 객관적 데이터를 바탕으로' 는 뺐다. 고지에 꼭 필요한 말이 아니고,
      '객관적' 은 우리가 입증해야 하는 표현이다.

   ../shared/disclosure.js 한 벌을 다섯 큐레이터가 같이 쓴다.
   index.html 에서 app.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var ID = "coupang-disclosure";

    function mount() {
        if (document.getElementById(ID)) return;

        // 헤더 바로 다음, 본문 맨 위
        var host = document.querySelector("main.container") ||
                   document.querySelector(".container");
        if (!host) return;

        var box = document.createElement("div");
        box.id = ID;
        box.style.cssText =
            "display:flex; align-items:flex-start; gap:8px; " +
            "background:#FBF8F3; border:1px solid #EDE6DE; border-radius:12px; " +
            "padding:12px 14px; margin:16px 0 20px; box-sizing:border-box;";

        box.innerHTML =
            '<span style="flex-shrink:0; margin-top:2px; padding:2px 7px; border-radius:6px; ' +
                'background:#7A6F68; color:#FFFFFF; font-size:11px; font-weight:900; line-height:1.5;">제휴</span>' +
            '<span style="font-size:13px; font-weight:600; color:#7A6F68; ' +
                'line-height:1.65; word-break:keep-all; text-wrap:pretty;">' +
                '이 페이지는 <b style="color:#4A413C;">쿠팡 파트너스 활동의 일환</b>으로, 구매가 일어나면 ' +
                '이에 따른 일정액의 수수료를 제공받습니다. ' +
                '추천 순서와는 관계없습니다.' +
            '</span>';

        host.insertBefore(box, host.firstChild);
    }

    /* 다크모드에서도 읽히게 (style.css 가 인라인 배경만 반전시켜서 글씨가 묻힌다) */
    (function darkFix() {
        if (document.getElementById("cd-vars")) return;
        var st = document.createElement("style");
        st.id = "cd-vars";
        st.textContent =
            "body.dark-mode #" + ID + "{background:#3A2410 !important;border-color:#A85C1E !important;}" +
            "body.dark-mode #" + ID + " span{color:#FFD9AE !important;}";
        (document.head || document.documentElement).appendChild(st);
    })();

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
    else mount();
    setTimeout(mount, 600);
    setTimeout(mount, 2500);        // 모듈이 화면을 다시 그린 뒤에도 남아 있게
    document.addEventListener("visibilitychange", function () {
        if (!document.hidden) setTimeout(mount, 300);
    });

    window.disclosureVersion = '2026-09-28';   // 다섯 폴더가 같은 날짜여야 한다

    window.disclosureDebug = function () {
        console.log('이 폴더의 disclosure 판:', window.disclosureVersion);
        var el = document.getElementById(ID);
        console.log("고지 배너 붙음:", !!el);
        if (el) {
            var r = el.getBoundingClientRect();
            console.log("위치: 문서 상단에서", Math.round(r.top + window.scrollY) + "px");
            console.log("글자 크기: 13px · 배경 있음 · 접히지 않음");
        }
    };
})();