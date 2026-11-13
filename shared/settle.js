/* ============================================================
   배냇함 큐레이터 — 카드가 자리 잡을 때까지 (settle.js)

   ⚠️ 유모차 '쓰면서 챙길 것' · 놀이 두 탭은 열고 1초 안에 카드가 위아래로 밀렸다.
      카드 7~8장이 모듈마다 따로 붙고, 탭 정리가 그 순서를 다시 맞추면서
      앞에 보이던 카드를 밀어냈다 (유모차 탭은 그 사이 46번 붙었다 떨어졌다).
      화면 흔들림 점수(CLS) 유모차 0.63 · 무료 사용자 1.09 · 놀이 0.70 — 0.25 를 넘으면 '나쁨'.

   그래서 그 탭은 카드가 다 붙을 때까지 자리 표시만 보여 주다가 한 번에 보여 준다.
     · 스크립트가 다 내려온 지 1초가 지났고, 탭 안에서 카드가 더 붙지 않은 지 0.35초가 지나면 보여 준다
     · 스크립트가 다 내려온 지 1.8초면 보여 준다 · 그 사이에 누르거나 넘기면 바로 보여 준다
     · 통신이 아주 느려도 연 지 7초면 보여 준다
     · 이 파일을 못 받으면 바로 보여 주고(script onerror), 무엇이 잘못돼도 8초 뒤에는 CSS 가 보여 준다 (index.html <head>)

   가리는 탭은 <html data-settle="view-…,view-…"> 에 적는다.
   ⚠️ 자리 표시(.cur-skel)는 탭 밖(바로 앞)에 둔다. 탭 안에 넣으면 탭 정리가 카드로 알고 옮긴다.
   ============================================================ */
(function () {
    "use strict";
    var de = document.documentElement;
    if (!de.classList.contains("cur-settle")) return;

    /* ⚠️ 처음엔 '0.28초 조용하면' 만 봤는데, 모듈들이 0.2 · 0.5 · 0.9 · 1.1 · 1.3초에 띄엄띄엄 붙어서
          중간에 생기는 빈틈에서 먼저 보여 주고 그 뒤에 또 밀렸다 (놀이는 0.45초에 열고 1초에 두 번 밀림).
          모듈 대부분이 정해진 시간(setTimeout) 뒤에 붙으니 폰이 빨라도 1초쯤은 걸린다 — 1초는 기다린다. */
    var QUIET = 350, MAX = 1800, MIN = 1000;
    /* ⚠️ 위 시간을 '페이지를 연 때부터' 셌더니 통신이 느린 곳에서 다시 밀렸다.
          요청 하나에 0.4초 걸리면 스크립트가 0.9초에야 다 내려오고, 모듈의 시계는 그때부터 간다.
          그런데 탭은 연 지 1.8초에 열어 버려서 그 뒤에 붙는 카드가 눈앞에서 밀렸다
          (유모차 0.55 · 무료 1.08, 요청 하나에 0.8초면 놀이도 0.73).
          그래서 스크립트가 다 내려온 때(net)부터 센다. 통신이 빠르면 net 이 0.1초 안쪽이라 전과 같다. */
    var HARD = 7000;
    var now0 = function () { try { return performance.now(); } catch (e) { return Date.now() - t0; } };
    var t0 = 0, last = 0, net = 0, done = false, mo = null, iv = null;
    var IDS = String(de.getAttribute("data-settle") || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean);

    /* 스크립트 가운데 가장 늦게 내려온 때 (페이지를 연 때부터, ms). 못 읽는 폰은 0 — 전처럼 연 때부터 센다 */
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

    /* 보이는 탭 앞에만 자리 표시를 둔다. ?tab=use 처럼 조금 뒤에 바뀌어 보이는 탭도 그때 붙인다
       (처음엔 연 순간 보이던 탭에만 붙여서, 뒤에 켜진 탭이 1초 넘게 텅 비어 있었다) */
    function skeleton(p) {
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

    function reveal() {
        if (done) return;
        done = true;
        if (iv) clearInterval(iv);
        if (mo) mo.disconnect();
        de.classList.remove("cur-settle");
        try { window.curSettledAt = Math.round(performance.now()); } catch (e) {}
        var sk = document.querySelectorAll(".cur-skel");
        for (var i = 0; i < sk.length; i++) if (sk[i].parentNode) sk[i].parentNode.removeChild(sk[i]);
        var ps = panes();
        for (var j = 0; j < ps.length; j++) ps[j].removeAttribute("data-skel");
    }
    window.curSettleNow = reveal;          // 탭을 바꾸는 쪽에서 바로 보여 줄 때

    function start() {
        var ps = panes();
        if (!ps.length) { reveal(); return; }
        net = Math.min(netEnd(), now0());
        try { window.curSettleNet = Math.round(net); } catch (e) {}
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
            var now = now0();                       // 페이지를 연 때부터 (performance.now)
            var t = now - net;                      // 스크립트가 다 내려온 때부터
            for (var i = 0; i < ps.length; i++) skeleton(ps[i]);
            if (now >= HARD || t >= MAX || (now - last >= QUIET && t >= MIN)) reveal();
        }, 50);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
    else start();
    /* 그 사이에 누르거나 넘기면 기다리지 않는다 (탭을 바꿨는데 빈 화면이면 안 된다) */
    ["pointerdown", "keydown", "wheel", "touchstart"].forEach(function (ev) {
        window.addEventListener(ev, reveal, { capture: true, passive: true, once: true });
    });
    setTimeout(reveal, Math.max(400, HARD + 300 - now0()));   // 무엇이 잘못돼도
})();
