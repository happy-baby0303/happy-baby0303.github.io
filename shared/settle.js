/* ============================================================
   배냇함 큐레이터 — 카드가 자리 잡을 때까지 (settle.js)

   ⚠️ 큐레이터 다섯 곳 모두 느린 폰에서 열면 처음 1~2초 동안 화면이 위아래로 크게 밀렸다.
      스크립트가 돌기 전에 그려진 화면(접기 전 조건표 · 고지 없는 맨 위 · 지난번과 다른 탭)이 먼저 보이고,
      카드들이 0.2 ~ 2.6초 타이머로 따로 붙고, 탭 정리가 그 순서를 다시 맞췄다.
      CPU 6배 느린 폰에서 화면 흔들림 점수(CLS) 유모차 0.42 · 카시트 0.53 · 젖병 1.43 · 이유식 0.94 · 놀이 0.70 (0.25 를 넘으면 '나쁨').

   이제 이렇게 한다.
     · 처음 그리는 화면을 마지막 화면과 같게 둔다 — 고지 · 접힌 조건표 · 지난번 탭 · 카드 자리를 index.html 에 박는다
     · 카드는 타이머 없이 DOMContentLoaded 에 제자리에 그린다
     · 탭 정리가 첫 정리를 마치면 curSettleReady() 를 부르고, 그때 한 번에 보여 준다 (그 사이엔 자리 표시)
       — 빠른 폰은 기다림이 거의 없고, 느린 폰도 스크립트가 다 돈 바로 뒤에 보인다 (예전처럼 1초를 더 기다리지 않는다)

   안전장치
     · curSettleReady 가 안 오면(옛 화면 · 스크립트 오류) 예전 방식: 조용해지면 · 스크립트가 다 내려온 지 1.8초면 · 7초면
     · 그 사이에 누르거나 넘기면 바로 보여 준다
     · 이 파일을 못 받으면 바로 보여 주고(script onerror), 무엇이 잘못돼도 8초 뒤에는 CSS 가 보여 준다 (index.html <head>)

   가리는 탭은 <html data-settle="view-…,view-…"> 에 적는다.
   ⚠️ 자리 표시(.cur-skel)는 index.html 에 탭 막대 바로 밑에 둔다 (처음 그리는 순간부터 있어야 한다).
      없으면(옛 화면) 여기서 보이는 탭 앞에 붙인다. 탭 안에 넣으면 탭 정리가 카드로 알고 옮긴다.
   ============================================================ */
(function () {
    "use strict";
    var de = document.documentElement;
    if (!de.classList.contains("cur-settle")) return;

    /* 예전 방식(안전장치)의 시간 — curSettleReady 가 오면 쓰지 않는다 */
    var QUIET = 350, MAX = 1800, MIN = 1000, HARD = 7000;
    var now0 = function () { try { return performance.now(); } catch (e) { return Date.now() - t0; } };
    var t0 = Date.now(), last = 0, net = 0, done = false, mo = null, iv = null, ready = false;
    var IDS = String(de.getAttribute("data-settle") || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean);

    /* 스크립트 가운데 가장 늦게 내려온 때 (페이지를 연 때부터, ms). 못 읽는 폰은 0 */
    function netEnd() {
        var m = 0;
        try {
            var rs = performance.getEntriesByType("resource");
            for (var i = 0; i < rs.length; i++) {
                if (rs[i].initiatorType === "script" && rs[i].responseEnd > m) m = rs[i].responseEnd;
            }
        } catch (e) {}
        return m;
    }

    function panes() {
        var out = [];
        for (var i = 0; i < IDS.length; i++) { var p = document.getElementById(IDS[i]); if (p) out.push(p); }
        return out;
    }

    /* 옛 화면용 — index.html 에 자리 표시가 없을 때만 보이는 탭 앞에 붙인다 */
    function skeleton(p) {
        if (document.querySelector(".cur-skel[data-static]")) return;
        if (p.getAttribute("data-skel") || p.offsetParent === null) return;
        p.setAttribute("data-skel", "1");
        var s = document.createElement("div");
        s.className = "cur-skel";
        s.setAttribute("aria-hidden", "true");
        var hs = [210, 150, 240];
        var html = "";
        for (var i = 0; i < hs.length; i++) html += '<div class="cur-skel-b" style="height:' + hs[i] + 'px"></div>';
        s.innerHTML = '<div class="cur-skel-in">' + html + "</div>";
        p.parentNode.insertBefore(s, p);
    }

    function reveal(why) {
        if (done) return;
        done = true;
        if (iv) clearInterval(iv);
        if (mo) mo.disconnect();
        de.classList.remove("cur-settle");
        try { window.curSettledAt = Math.round(performance.now()); window.curSettleWhy = typeof why === "string" ? why : "input"; } catch (e) {}
        var sk = document.querySelectorAll(".cur-skel");
        for (var i = 0; i < sk.length; i++) if (sk[i].parentNode) sk[i].parentNode.removeChild(sk[i]);
        var ps = panes();
        for (var j = 0; j < ps.length; j++) ps[j].removeAttribute("data-skel");
    }
    window.curSettleNow = function () { reveal("now"); };          // 탭을 바꾸는 쪽에서 바로 보여 줄 때

    /* 탭 정리가 첫 정리를 마쳤다 — 바로 보여 준다.
       같은 DOMContentLoaded 에 붙는 나머지(다 쓴 물건 카드 · PLUS 표시)는 이 일이 다 끝난 뒤 같은 그림에 함께 그려진다
       (한 이벤트 안에서는 화면을 그리지 않는다). ⚠️ setTimeout(0) 으로 미뤘더니 느린 폰에서 0.2 ~ 0.5초를 더 기다렸다 */
    window.curSettleReady = function () {
        if (ready || done) return;
        ready = true;
        reveal("ready");
    };

    function start() {
        var ps = panes();
        if (!ps.length) { reveal("none"); return; }
        net = Math.min(netEnd(), now0());
        try { window.curSettleNet = Math.round(net); } catch (e) {}
        if (ready || done) return;
        for (var i = 0; i < ps.length; i++) skeleton(ps[i]);
        mo = new MutationObserver(function (ms) {
            for (var k = 0; k < ms.length; k++) {
                var t = ms[k].target;
                for (var j = 0; j < ps.length; j++) {
                    if (t === ps[j] || (t && t.parentNode === ps[j])) { last = now0(); return; }
                }
            }
        });
        mo.observe(document.body, { childList: true, subtree: true });
        last = now0();
        iv = setInterval(function () {
            if (ready) return;
            var now = now0();                       // 페이지를 연 때부터 (performance.now)
            var t = now - net;                      // 스크립트가 다 내려온 때부터
            for (var i = 0; i < ps.length; i++) skeleton(ps[i]);
            if (now >= HARD) reveal("hard");
            else if (t >= MAX) reveal("max");
            else if (now - last >= QUIET && t >= MIN) reveal("quiet");
        }, 50);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
    else start();
    /* 그 사이에 누르거나 넘기면 기다리지 않는다 (탭을 바꿨는데 빈 화면이면 안 된다) */
    ["pointerdown", "keydown", "wheel", "touchstart"].forEach(function (ev) {
        window.addEventListener(ev, function () { reveal("input"); }, { capture: true, passive: true, once: true });
    });
    setTimeout(function () { reveal("hard"); }, Math.max(400, HARD + 300 - now0()));   // 무엇이 잘못돼도
})();
