/* ============================================================
   배냇함 — 들어왔어요 (joinhello.js)

   짝꿍 · 할머니 · 시터 선생님이 초대 링크로 가족방에 들어와도, 초대한 사람은 몰랐다.
   '링크 눌렀어? 들어왔어?' 를 따로 물어봐야 알았다.

   새로 들어온 폰이 한 번, 엄마 · 아빠 폰에 알린다.
       💛 아빠가 가족방에 들어왔어요
       이제 꿈이 기록이 두 폰에 같이 떠요
   엄마 · 아빠로 들어온 폰은 '이 폰은 누구 폰인가요?' 에 답한 뒤에 보낸다 (누가 들어왔는지 말해야 해서).
   할머니 · 시터 선생님은 초대할 때 고른 이름(tosil_helper_label)으로 바로 보낸다.

   표시: tosil_join_hello = '1' (index.html connectSyncCode 가 남긴다) → 보내면 지운다. 세 번까지 해 본다.
   index.html 에서 weekly.js 다음에 로드하세요 (familyPushResult 를 쓴다).
   ============================================================ */
(function () {
    'use strict';
    if (window.__joinHelloOn) return;
    window.__joinHelloOn = true;

    var FLAG = "tosil_join_hello", TRIES = "tosil_join_hello_n";

    function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function josa(w, a, b) {
        var c = String(w || "").charCodeAt(String(w || "").length - 1);
        return (c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0) ? a : b;
    }
    function helper() { return get("tosil_role_locked") === "viewer" || get("user_role") === "senior"; }
    function who() {
        if (helper()) return String(get("tosil_helper_label") || "").trim() || "돌봄 도우미";
        var r = get("user_role");
        if (r === "dad") return "아빠";
        if (r === "mom") return "엄마";
        return null;                       // 아직 안 골랐다 — 역할 창에 답하면 보낸다
    }
    function ready() {
        return !!(window.functions && typeof window.httpsCallable === "function" &&
                  window.auth && window.auth.currentUser && get("family_sync_code"));
    }
    function clear() { try { localStorage.removeItem(FLAG); localStorage.removeItem(TRIES); } catch (e) {} }

    var busy = false;
    function hello() {
        if (busy || get(FLAG) !== "1") return;
        var w = who();
        if (!w || !ready()) return;
        var n = Number(get(TRIES) || 0);
        if (n >= 3) return clear();
        busy = true;
        try { localStorage.setItem(TRIES, String(n + 1)); } catch (e) {}
        var baby = String(get("tosil_babyName") || "").trim() || "우리 아기";
        window.httpsCallable(window.functions, "sendFamilyPush")({
            syncCode: get("family_sync_code"),
            excludeUid: window.auth.currentUser.uid,
            excludeToken: (typeof window.myPushToken === "function") ? window.myPushToken() : null,
            title: "💛 " + w + josa(w, "이", "가") + " 가족방에 들어왔어요",
            body: helper() ? "이제 " + baby + " 기록을 같이 봐요" : "이제 " + baby + " 기록이 두 폰에 같이 떠요",
            link: "index.html",
            skipRoles: ["viewer"]
        }).then(function (r) {
            var how = (typeof window.familyPushResult === "function") ? window.familyPushResult(r)
                    : ((r && r.data && r.data.success === false) ? "failed" : "sent");
            // 갔거나, 받을 폰이 알림을 꺼 둬서 다시 해도 같은 거면 그만
            if (how !== "failed") clear();
        }).catch(function (e) {
            console.warn("[들어왔어요] 알림 실패", e);
        }).then(function () { busy = false; });
    }

    // 로그인이 붙을 때까지 몇 번 본다
    [4000, 10000, 25000, 60000].forEach(function (t) { setTimeout(hello, t); });

    // 역할을 고르는 순간 (script.js selectRoleOnboarding)
    var orig = window.selectRoleOnboarding;
    if (typeof orig === "function" && !orig.__hello) {
        var wrapped = function () {
            var out = orig.apply(this, arguments);
            setTimeout(hello, 800);
            return out;
        };
        wrapped.__hello = true;
        window.selectRoleOnboarding = wrapped;
    }

    window.joinHelloDebug = function () {
        console.log("보낼 차례:", get(FLAG) === "1", "· 누구:", who(), "· 준비:", ready(), "· 해 본 횟수:", get(TRIES) || 0);
    };
})();
