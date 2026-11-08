/* ============================================================
   배냇함 — 창 맞춤 (sheetfit.js)

   화면을 덮는 창(시트 · 모달)이 화면보다 길어지면, 창 안에서 스크롤되게 한다.

   ⚠️ 나들이 행사 창에서 '더 보기' 를 누르면 창이 화면보다 길어져서
      닫기 단추가 화면 밖으로 밀렸고, 창이 스크롤도 안 돼서 닫을 수가 없었다.
      행사 창은 직접 고쳤다 (script.js openFestivalModal). 이 파일은 마지막 안전망이다.
      폰 글자 크기를 크게 해 둔 분(할머니 · 할아버지 폰), 작은 폰, 가로 화면에서는
      다른 창도 같은 일이 난다 — '매일 챙길 것' 창은 위아래가 잘렸고,
      외출 체크리스트는 '초기화' 단추가 화면 밖에 있었다.
   ⚠️ 이미 다 보이는 창은 건드리지 않는다. 화면보다 긴 창에만 '최대 높이 + 안에서 스크롤' 을 준다.
   ⚠️ 언제 재나: 창이 열리고 닫힐 때(body 바로 아래가 바뀔 때), 열린 창 안의 내용이 바뀔 때,
      화면 크기가 바뀔 때(키보드 · 가로). 탭 화면 안에서 숫자가 바뀌는 건 보지 않는다 (배터리).

   맨 마지막 쪽에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var queued = false;
    var open = [];          // 지난번에 잰 '열린 창' 들

    // 화면을 덮는 창인가 (body 바로 아래의 position: fixed · 화면 대부분)
    function cover(el, vw, vh) {
        if (el.nodeType !== 1) return null;
        var t = el.tagName;
        if (t === 'SCRIPT' || t === 'STYLE' || t === 'LINK' || t === 'NAV' || t === 'HEADER') return null;
        if (el.style && el.style.display === 'none') return null;             // 숨긴 창은 계산 없이 지나간다
        var s = getComputedStyle(el);
        if (s.position !== 'fixed' || s.display === 'none' || s.visibility === 'hidden') return null;
        var r = el.getBoundingClientRect();
        return (r.width >= vw * 0.85 && r.height >= vh * 0.6) ? s : null;
    }

    function fitOne(ov, s, vh) {
        // 덮개가 이미 스크롤되면 그대로 둔다
        if (/(auto|scroll)/.test(s.overflowY) && ov.scrollHeight > ov.clientHeight + 1) return;
        for (var i = 0; i < ov.children.length; i++) {
            var card = ov.children[i];
            var c = getComputedStyle(card);
            if (c.display === 'none' || c.position === 'fixed' || c.position === 'absolute') continue;
            var tall = card.getBoundingClientRect().height > vh + 1;           // 화면보다 길다
            var spill = !/(auto|scroll|hidden)/.test(c.overflowY) &&
                        card.scrollHeight > card.clientHeight + 1;            // 내용이 창 밖으로 넘친다
            if (!tall && !spill) continue;
            card.style.setProperty('max-height', '100%', 'important');
            card.style.setProperty('overflow-y', 'auto', 'important');
            card.style.setProperty('overscroll-behavior', 'contain');
            card.setAttribute('data-sheetfit', '1');
        }
    }

    function scan() {
        queued = false;
        if (!document.body) return;
        var vw = window.innerWidth, vh = window.innerHeight, now = [];
        var kids = document.body.children;
        for (var i = 0; i < kids.length; i++) {
            var s = cover(kids[i], vw, vh);
            if (!s) continue;
            now.push(kids[i]);
            try { fitOne(kids[i], s, vh); } catch (e) {}
        }
        open = now;
    }

    function queue() {
        if (queued) return;
        queued = true;
        (window.requestAnimationFrame || setTimeout)(scan);
    }

    function relevant(list) {
        var body = document.body;
        for (var i = 0; i < list.length; i++) {
            var t = list[i].target;
            if (t === body || t.parentNode === body) return true;              // 창이 열리고 닫힘
            for (var j = 0; j < open.length; j++) {
                if (open[j] !== t && open[j].contains(t)) return true;          // 열린 창 안이 바뀜 (더 보기 등)
            }
        }
        return false;
    }

    function boot() {
        if (!document.body || !window.MutationObserver) return;
        new MutationObserver(function (list) { if (relevant(list)) queue(); }).observe(document.body, {
            childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class']
        });
        window.addEventListener('resize', queue);
        window.addEventListener('orientationchange', queue);
        queue();
    }

    window.fitOpenSheets = queue;   // 직접 부르고 싶을 때

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
