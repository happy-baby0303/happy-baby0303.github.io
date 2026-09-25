/* ============================================================
   배냇함 — 아기 사진 함께 쓰기 (babyphoto.js)

   지금은 홈의 아기 사진이 각자 폰에만 있다.
   아내가 예쁜 사진으로 바꿔도 남편 폰은 그대로다.
   같은 아기를 보는 앱인데 얼굴이 두 개인 셈이다.

   어렵지 않다. 사진은 이미 서버(Storage)에 올라가 있고
   주소만 로컬에 들고 있을 뿐이다.
   그 주소를 가족방에 적어두면 둘 다 같은 얼굴을 본다.

   저장 위치
     settings_{가족코드}{아기번호} / baby_profile
     → 보안 규칙(settings_ 접두어)과 탈퇴 정리 목록에 이미 들어 있다

   먼저 온 것이 아니라 나중에 바꾼 것이 이긴다.
   둘이 동시에 바꾸는 일은 거의 없고, 있어도 마지막 마음이 맞다.

   index.html 에서 photos.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var KEY = "tosil_baby_photo";

    function syncCode() { return localStorage.getItem("family_sync_code"); }
    function suffix() { return window.currentBabySuffix || ""; }

    function ref() {
        var code = syncCode();
        if (!code || !window.db || typeof window.doc !== "function") return null;
        return window.doc(window.db, "settings_" + code + suffix(), "baby_profile");
    }

    function myUid() {
        return (window.auth && window.auth.currentUser && window.auth.currentUser.uid) ||
               localStorage.getItem("firebase_uid") || "";
    }

    function repaint() {
        if (typeof window.loadBabyPhoto === "function") {
            try { window.loadBabyPhoto(); } catch (e) {}
        }
    }

    /* ---------- 내가 바꾼 사진을 가족방에 알린다 ----------
       script.js 의 업로드가 끝난 자리에서 이걸 불러준다. -------- */

    window.shareBabyPhoto = async function (url) {
        if (!url) return;
        localStorage.setItem(KEY, url);

        var r = ref();
        if (!r || typeof window.setDoc !== "function") return;

        try {
            await window.setDoc(r, {
                photoUrl: url,
                by: myUid(),
                at: Date.now()
            }, { merge: true });
        } catch (e) {
            console.warn("[아기 사진] 가족방에 알리기 실패", e);
        }
    };

    /* ---------- 짝꿍이 바꾸면 내 폰도 따라 바뀐다 ---------- */

    var unsub = null;
    var lastSeen = "";

    window.startBabyPhotoSync = function () {
        var r = ref();
        if (!r || typeof window.onSnapshot !== "function") return;
        if (unsub) { try { unsub(); } catch (e) {} unsub = null; }

        var u = window.onSnapshot(r, function (snap) {
            if (!snap.exists()) return;
            var d = snap.data() || {};
            var url = d.photoUrl;
            if (!url || url === lastSeen) return;

            lastSeen = url;
            if (localStorage.getItem(KEY) === url) return;

            localStorage.setItem(KEY, url);
            repaint();

            // 내가 바꾼 게 아니면 살짝 알려준다
                        if (d.by && d.by !== myUid() && typeof window.showToast === "function") {
                var who = localStorage.getItem("user_role") === "dad" ? "엄마" : "아빠";
                window.showToast("📸 " + who + "가 아기 사진을 바꿨어요");
            }
        }, function (e) {
            console.warn("[아기 사진] 실시간 연동 에러", e);
        });

        unsub = (typeof window.addLiveListener === "function") ? window.addLiveListener(u) : u;
    };

    /* ---------- 연동 직후 한 번 맞춰준다 ----------
       새로 합류한 사람은 짝꿍이 이미 올려둔 얼굴을 바로 봐야 한다. -------- */

    window.pullBabyPhotoOnce = async function () {
        var r = ref();
        if (!r || typeof window.getDoc !== "function") return;
        try {
            var snap = await window.getDoc(r);
            if (!snap.exists()) return;
            var url = (snap.data() || {}).photoUrl;
            if (url && localStorage.getItem(KEY) !== url) {
                localStorage.setItem(KEY, url);
                repaint();
            }
        } catch (e) {}
    };

    /* ---------- 시작 ---------- */

    function boot() {
        setTimeout(preloadSiblings, 2500);   // 첫 화면이 다 뜬 뒤에 조용히
        setTimeout(function () {
            window.pullBabyPhotoOnce();
            window.startBabyPhotoSync();
        }, 3000);
    }

    /* ---------- 다른 아이 사진 미리 받아두기 ----------
       아이를 바꾸면 앱이 통째로 새로고침된다. 그때 사진을 처음부터 다시 받아서
       회색 칸이 잠깐 보였다 (문의 들어온 것).
       한가할 때 형제 사진을 미리 받아 브라우저에 넣어둔다. 바꾸면 바로 뜬다.
       ⚠️ 화면에 붙이지 않는다. 받아두기만 한다. */
    function preloadSiblings() {
        var list = [];
        try { list = JSON.parse(localStorage.getItem("tosil_baby_profiles")) || []; } catch (e) {}
        if (!list || list.length < 2) return;

        var now = window.currentBabySuffix || "";
        list.forEach(function (p) {
            var id = p && p.id ? p.id : "";
            if (id === now) return;                       // 지금 보고 있는 아이는 이미 떠 있다
            var url = null;
            try { url = localStorage.getItem("tosil_baby_photo" + id); } catch (e) {}
            if (!url || String(url).indexOf("http") !== 0) return;
            var im = new Image();
            im.decoding = "async";
            im.src = url;
        });
    }
    window.preloadBabyPhotos = preloadSiblings;

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    /* ---------- 점검용 ---------- */
    window.babyPhotoDebug = function () {
        console.log("가족 코드:", syncCode() || "없음");
        console.log("내 폰의 사진 주소:", (localStorage.getItem(KEY) || "없음").slice(0, 60));
        console.log("실시간 연동:", unsub ? "켜짐" : "꺼짐");
        console.log("getDoc 사용 가능:", typeof window.getDoc === "function");
    };
})();