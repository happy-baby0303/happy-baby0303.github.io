/* ============================================================
   배냇함 — 뒤에 있을 땐 쉬기 (idle.js)

   앱 전체에서 setInterval 이 서른 번 넘게 돌고 있다.
   화면을 다시 그리고, DOM 을 훑고, 시간을 다시 세고.
   각각은 작지만 육아앱은 하루 종일 켜져 있는 앱이다.

   문제는 앱이 뒤로 갔을 때도 그게 다 돈다는 것이다.
   브라우저가 간격을 늘려주긴 하지만 일 자체는 계속 한다.
   보이지도 않는 화면을 다시 그리느라 배터리를 쓰는 셈이다.

   그래서 setInterval 을 한 겹 감싼다.
     앱이 보이면    그대로 돈다
     앱이 뒤에 있으면 콜백을 건너뛴다 (타이머는 살아있다)

   ⚠️ 타이머를 없애지 않는다. 건너뛰기만 한다.
      clearInterval 을 대신 해버리면 그 id 를 들고 있던 코드가
      나중에 clearInterval 을 부를 때 엉뚱한 걸 지운다.

   ⚠️ 예외가 있다. 실제로 뒤에서 돌아야 하는 것들이다.
        · 수면 타이머처럼 시간을 세는 것
        · 녹음 중 경과 시간
      이런 건 id 를 window.keepAliveInterval 로 만들면 안 건드린다.

   ⚠️ 앱으로 돌아오면 각 모듈의 visibilitychange 가 알아서 다시 그린다.
      그건 이 앱에 이미 스무 군데 넘게 붙어 있다. 우리가 또 부를 필요가 없다.

   index.html 맨 앞, script.js 보다도 먼저 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var orig = window.setInterval;
    if (!orig || orig.__idle) return;

    var skipped = 0, ran = 0;

    var wrapped = function (fn, ms) {
        if (typeof fn !== "function") return orig.apply(window, arguments);

        var rest = Array.prototype.slice.call(arguments, 2);
        var guard = function () {
            if (document.hidden) { skipped++; return; }
            ran++;
            return fn.apply(this, rest);
        };
        return orig.call(window, guard, ms);
    };

    wrapped.__idle = true;
    window.setInterval = wrapped;

    /* 뒤에서도 꼭 돌아야 하는 타이머는 이걸로 만든다 */
    window.keepAliveInterval = function () {
        return orig.apply(window, arguments);
    };

    /* 점검용 */
    window.idleDebug = function () {
        console.log("앱이 뒤에 있어서 건너뛴 횟수:", skipped);
        console.log("실제로 돈 횟수:", ran);
        console.log("지금 숨어 있나:", document.hidden);
    };
})();