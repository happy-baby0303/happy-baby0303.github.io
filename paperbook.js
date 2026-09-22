/* ============================================================
   배냇함 — 종이책 알림 신청 (paperbook.js)

   diary.html 의 버튼이 alert() 하나였다.

       [실물 양장본 출판 사전 안내 신청하기]
       → "오픈 시 가장 먼저 안내해 드릴게요"
       → 실제로는 어디에도 안 남는다

   정작 종이책을 열었을 때 누구에게 알려야 할지 모른다.
   "알려드릴게요" 가 지킬 수 없는 말이 되어 있었다.

   여기서는 진짜로 남긴다. 이미 쓰고 있는 waitlist 컬렉션에 붙인다.
   (functions/index.js 의 countWaitlist 가 그 컬렉션을 세고 있다.)

   ⚠️ 결제도 예약도 아니라고 화면에 적는다.
      돈을 받지 않는데 '예약' 이라고 하면 그건 청약 유인이 된다.
      값도 제작처도 아직 없다. 있는 그대로 말한다.

   ⚠️ 한 번 신청했으면 버튼을 눌러도 또 안 보낸다.
      대신 "이미 신청했어요" 라고 알려준다.

   diary.html 맨 아래, bookshelf.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var KEY = "tosil_paperbook_notify";

    function toast(m) {
        if (typeof window.showToast === "function") window.showToast(m);
        else alert(m);
    }

    function uid() {
        return (window.auth && window.auth.currentUser && window.auth.currentUser.uid) ||
               localStorage.getItem("firebase_uid") || "";
    }

    function done() { return localStorage.getItem(KEY) === "1"; }

    function paint() {
        var b = document.getElementById("book-notify-btn");
        if (!b) return;
        if (done()) {
            b.textContent = "신청해 두었어요";
            b.style.background = "#EDE6DE";
            b.style.color = "#7A6F68";
            b.style.boxShadow = "none";
        }
    }

    window.notifyPaperBook = function () {
        if (done()) {
            toast("이미 신청해 두었어요. 열리면 알려드릴게요");
            return;
        }

        /* 서버가 없어도 신청은 폰에 남긴다.
           나중에 앱이 서버에 붙으면 그때 올라간다. */
        try { localStorage.setItem(KEY, "1"); } catch (e) {}
        paint();
        toast("\uD83D\uDCD6 열리면 제일 먼저 알려드릴게요");

        var id = uid();
        if (!id || !window.db || typeof window.setDoc !== "function") return;

        try {
            window.setDoc(
                window.doc(window.db, "waitlist_paperbook", id),
                {
                    at: Date.now(),
                    syncCode: localStorage.getItem("family_sync_code") || null,
                    /* 몇 쪽까지 썼는지도 같이 남긴다.
                       정작 열었을 때 '누구부터' 연락할지 정하는 기준이 된다. */
                    pages: (typeof window.bookshelfPages === "function")
                        ? window.bookshelfPages() : null
                },
                { merge: true }
            ).catch(function (e) {   // 서버가 거절해도 '처리 안 된 에러' 로 새지 않게
                console.warn("[종이책] 신청 올리기 실패 — 폰에는 남았습니다", e);
            });
        } catch (e) {
            console.warn("[종이책] 신청 올리기 실패 — 폰에는 남았습니다", e);
        }
    };

    function boot() {
        paint();
        setTimeout(paint, 1200);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    /* 점검용 */
    window.paperBookDebug = function () {
        console.log("신청함:", done());
        console.log("uid:", uid() || "없음");
        console.log("취소하려면: localStorage.removeItem('" + KEY + "')");
    };
})();