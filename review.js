/* ============================================================
   배냇함 — 플레이 별점 창 (review.js)

   왜 필요한가
     플레이 스토어에서 처음 보는 사람은 별점부터 본다.
     그런데 잘 쓰는 사람일수록 스토어에 다시 가서 별점을 남기지 않는다.
     구글의 '앱 내 리뷰' 창을 띄우면 앱을 떠나지 않고 그 자리에서 별을 누를 수 있다.

   언제 띄우나 (전부 맞을 때만)
     · 플레이 앱 1.1.4 이상 (껍데기에 BaenaetReview 가 있을 때). 웹 · 아이폰 · 1.1.3 은 아무 일도 안 한다
     · 엄마 · 아빠 (돌봄 도우미 화면은 아니다)
     · 쓴 지 7일이 넘었고, 기록이 30개가 넘었다 (써 보고 나서 묻는다)
     · 편지함을 열어 편지를 8초 넘게 읽고 닫았을 때 (기록하던 손을 멈춰 세우지 않는다)
     · 이 폰에서 마지막으로 부른 지 넉 달이 지났다

   하지 않는 것 (구글 규칙)
     · "별 다섯 개 주실래요?" 같은 질문을 먼저 띄우지 않는다
     · 별을 준 사람에게 무엇을 주지 않는다
     · 단추로 부르지 않는다. 창이 실제로 뜰지는 구글이 정한다 (너무 자주면 안 뜬다)

   index.html 맨 아래쪽, emotion.js 다음에 한 줄:
     <script src="./review.js?v=1"></script>
   ============================================================ */
(function () {
    'use strict';

    var K_ASKED = 'baenaet_review_asked';      // 이 폰에서 마지막으로 부른 때 (ms)
    var GAP = 120 * 86400000;                  // 넉 달
    var MIN_DAYS = 7, MIN_RECS = 30;
    var READ_MS = 8000;                         // 편지를 이만큼은 읽고 닫았을 때

    function plugin() {
        var C = window.Capacitor;
        return C && C.Plugins ? C.Plugins.BaenaetReview : null;
    }
    function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

    function ready() {
        var P = plugin();
        if (!P || typeof P.ask !== 'function') return false;
        if (typeof window.isPlayApp === 'function' && !window.isPlayApp()) return false;
        if (lsGet('user_role') === 'senior') return false;
        if (Date.now() - (Number(lsGet(K_ASKED)) || 0) < GAP) return false;

        var recs = [];
        try { recs = JSON.parse(lsGet('tosil_tracker_records')) || []; } catch (e) {}
        if (recs.length < MIN_RECS) return false;
        var oldest = Infinity;
        recs.forEach(function (r) { var t = Number(r && r.timestamp); if (t && t < oldest) oldest = t; });
        return Date.now() - oldest >= MIN_DAYS * 86400000;
    }

    // 다른 곳(나중에 기념일 · 문답 등)에서도 부를 수 있게 열어 둔다
    window.baenaetMaybeAskReview = function (why) {
        if (!ready()) return false;
        try { localStorage.setItem(K_ASKED, String(Date.now())); } catch (e) {}
        // 닫히는 창이 다 사라진 뒤에
        setTimeout(function () {
            try { plugin().ask().catch(function () {}); } catch (e) {}
        }, 700);
        return true;
    };

    /* ---------- 편지함을 읽고 닫았을 때 ----------
       openLetterBox(true) 는 답장을 저장하거나 가족 기록이 들어와서 다시 그리는 것이다. 사람이 연 것만 센다 */
    var openedAt = 0;
    function hook() {
        var open = window.openLetterBox, close = window.closeLetterBox;
        if (typeof open !== 'function' || typeof close !== 'function' || open.__review) return false;
        window.openLetterBox = function (fromSync) {
            if (!fromSync && !document.getElementById('letterbox-modal')) openedAt = Date.now();
            return open.apply(this, arguments);
        };
        window.openLetterBox.__review = true;
        window.closeLetterBox = function () {
            var read = openedAt && Date.now() - openedAt >= READ_MS;
            openedAt = 0;
            var r = close.apply(this, arguments);
            if (read) window.baenaetMaybeAskReview('letter');
            return r;
        };
        return true;
    }
    if (!hook()) {
        var tries = 0, t = setInterval(function () { if (hook() || ++tries > 20) clearInterval(t); }, 500);
    }
})();
