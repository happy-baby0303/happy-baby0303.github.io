/* ============================================================
   배냇함 — 기저귀 시트 정리 (diapersheet.js)

   같은 일을 하는 시트가 두 개였다.

     ① #diaper-bottom-sheet   index.html 에 화면만 있던 옛 시트
        openDiaperSheet / closeDiaperSheet / showPoopAI /
        analyzePoop / saveAiPoopRecord
        → 다섯 개 전부 어디에도 정의가 없었다. 열리지도 않았다.

     ② #tracker-sheet         실제로 쓰이는 것
        시간 스와이프 · 소변/대변/둘 다 · 색깔 여섯 · 경고문 · 저장
        → ①이 하려던 걸 전부, 더 잘 하고 있다.

   그래서 ①을 살리지 않고 들어냈다.
   화면이 두 개면 둘 다 관리해야 하고, 둘은 반드시 어긋난다.

   남은 문제는 하나였다.
   index.html 의 "홈 화면에서 기저귀 기록하기" 버튼이
   아직 openDiaperSheet() 를 부른다. 그 이름을 ②로 보내준다.

   ⚠️ 옛 이름들도 빈 함수로 남겨둔다.
      혹시 어딘가에서 아직 부르고 있어도 조용히 죽지 않고,
      콘솔에 어디서 불렀는지 남긴다.

   index.html 에서 script.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    function realSheet(preSelect) {
        if (typeof window.openTrackerSheet !== "function") {
            console.warn("[기저귀] openTrackerSheet 이 아직 없습니다.");
            return false;
        }
        window.openTrackerSheet("diaper", null, preSelect || null);
        return true;
    }

    /* ---------- 옛 이름 → 진짜 시트 ---------- */

    window.openDiaperSheet = function (preSelect) {
        return realSheet(preSelect);
    };

    window.closeDiaperSheet = function () {
        if (typeof window.closeTrackerSheet === "function") {
            window.closeTrackerSheet();
        }
    };

    /* ---------- 들어낸 화면의 함수들 ----------
       이제 부르는 곳이 없다. 그래도 남겨둔다.
       없는 함수는 조용히 아무 일도 안 해서 원인을 못 찾는다.
       있는 함수는 최소한 어디서 불렸는지 말해준다. -------- */

    window.showPoopAI = function () {
        console.warn("[기저귀] 옛 시트는 들어냈습니다. 기록 시트로 보냅니다.");
        realSheet(window.currentPoopType || "대변");
    };

    window.analyzePoop = function (color) {
        console.warn("[기저귀] 색깔 고르기는 이제 기록 시트 안에 있습니다.", color);
        realSheet("대변");
    };

    window.saveAiPoopRecord = function () {
        console.warn("[기저귀] 저장도 기록 시트에서 합니다.");
        realSheet("대변");
    };

    /* 점검용 */
    window.diaperDebug = function () {
        console.log("openTrackerSheet :", typeof window.openTrackerSheet);
        console.log("옛 시트 남아있나  :", !!document.getElementById("diaper-bottom-sheet"));
    };
})();