/* ============================================================
   배냇함 큐레이터 — 찜을 같이 보기 (shared/favsync.js)

   본 앱은 거의 전부를 부부가 같이 본다.
   사진·소리·편지·한 줄·도감·수면 상태·기저귀·바통터치까지
   열다섯 개 파일이 가족 동기화를 하고 있다.

   그런데 큐레이터의 '찜' 만 각자 폰에 갇혀 있었다.

       아내가 젖병 세 개를 찜해둠
       남편이 큐레이터를 염  →  빈 목록
       "어떤 거 찜했어?"  →  카톡으로 캡처를 보냄

   젖병·유모차·카시트는 부부가 제일 오래 같이 고민하는 물건이다.
   여기가 안 붙어 있으면 이 앱을 둘이 쓰는 이유가 반으로 준다.

   ⚠️ 새로 만드는 게 거의 없다.
      본 앱이 이미 쓰는 방식(settings_{가족코드}) 을 그대로 쓴다.

   ⚠️ 합칠 때 합집합으로 간다.
      찜은 '지운 것' 보다 '담은 것' 이 중요하다.
      한쪽이 실수로 지워도 상대 목록에서 사라지면 안 된다.
      정말 빼고 싶으면 양쪽이 각자 빼면 된다.

   ⚠️ 큐레이터는 본 앱과 별개 페이지라 파이어베이스가 없을 수 있다.
      없으면 조용히 아무 일도 안 한다. 지금과 똑같이 동작한다.

   각 큐레이터 index.html 에서 plusgate.js 다음에 로드하세요.
     <script src="../shared/favsync.js"></script>
   ============================================================ */
(function () {
    'use strict';

    /* 큐레이터마다 찜 키가 다르다. 주소로 어디인지 알아낸다. */
    var WHERE = (function () {
        var p = location.pathname;
        if (p.indexOf("/bottle") > -1)   return { key: "favBottles",   slug: "bottle" };
        if (p.indexOf("/stroller") > -1) return { key: "favStrollers", slug: "stroller" };
        if (p.indexOf("/carseat") > -1)  return { key: "favCarseats",  slug: "carseat" };
        if (p.indexOf("/food") > -1)     return { key: "favFoods",     slug: "food" };
        if (p.indexOf("/toy") > -1)      return { key: "favToys",      slug: "toy" };
        return null;
    })();

    if (!WHERE) return;

    function code() { return localStorage.getItem("family_sync_code"); }
    function suffix() { return window.currentBabySuffix || ""; }

    function ref() {
        if (!code() || !window.db || typeof window.doc !== "function") return null;
        return window.doc(window.db, "settings_" + code() + suffix(), "curator_favs");
    }

    function mine() {
        try {
            var v = JSON.parse(localStorage.getItem(WHERE.key));
            return Array.isArray(v) ? v : [];
        } catch (e) { return []; }
    }

    function put(list) {
        try { localStorage.setItem(WHERE.key, JSON.stringify(list)); } catch (e) {}
    }

    function same(a, b) {
        return a.length === b.length && a.every(function (x, i) { return x === b[i]; });
    }

    /* ---------- 올리기 ---------- */

    var timer = null;

    function pushSoon() {
        if (timer) clearTimeout(timer);
        timer = setTimeout(pushNow, 500);      // 연달아 찜해도 한 번만 올린다
    }

    function pushNow() {
        var r = ref();
        if (!r || typeof window.setDoc !== "function") return;
        var body = {};
        body[WHERE.slug] = mine();
        body.at = Date.now();
        try { window.setDoc(r, body, { merge: true }); } catch (e) {}
    }

    /* ---------- 내려받기 ---------- */

    function apply(remote) {
        if (!Array.isArray(remote)) return;

        /* 합집합. 찜은 담은 쪽이 이긴다. */
        var out = mine().slice();
        var seen = {};
        out.forEach(function (x) { seen[x] = 1; });
        remote.forEach(function (x) { if (x && !seen[x]) { seen[x] = 1; out.push(x); } });

        if (same(out, mine())) return;
        put(out);
        repaint();
    }

    function repaint() {
        ["renderBottleList", "renderList", "applyFilters", "filterAndRender",
         "renderResults", "refreshList"].forEach(function (n) {
            if (typeof window[n] === "function") { try { window[n](); return; } catch (e) {} }
        });
    }

    /* ---------- localStorage 가로채기 ----------
       각 큐레이터의 찜 함수를 고치지 않는다.
       이름이 파일마다 다르고, 다섯 곳을 다 고치면 하나는 반드시 빠뜨린다.
       키가 바뀌는 순간을 붙잡는 게 확실하다. -------- */

    (function hook() {
        var proto = window.Storage && window.Storage.prototype;
        if (!proto || proto.__favHooked) return;

        var origSet = proto.setItem;
        proto.setItem = function (k, v) {
            var out = origSet.apply(this, arguments);
            if (this === window.localStorage && k === WHERE.key) pushSoon();
            return out;
        };
        proto.__favHooked = true;
    })();

    /* ---------- 시작 ---------- */

    var unsub = null;

    function boot() {
        setTimeout(function () {
            var r = ref();
            if (!r) return;                      // 파이어베이스가 없는 페이지 — 조용히 끝

            if (typeof window.getDoc === "function") {
                window.getDoc(r).then(function (snap) {
                    if (snap.exists()) apply((snap.data() || {})[WHERE.slug]);
                    else if (mine().length) pushNow();
                }).catch(function () {});
            }

            if (typeof window.onSnapshot === "function") {
                try {
                    unsub = window.onSnapshot(r, function (snap) {
                        if (snap.exists()) apply((snap.data() || {})[WHERE.slug]);
                    }, function () {});
                } catch (e) {}
            }
        }, 2500);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    /* 점검용 */
    window.favSyncDebug = function () {
        console.log("여기는:", WHERE.slug, "· 키:", WHERE.key);
        console.log("내 찜:", mine());
        console.log("가족 코드:", code() || "없음");
        console.log("파이어베이스:", ref() ? "연결됨" : "없음 (이 페이지에선 동기화 안 함)");
        console.log("실시간 연동:", unsub ? "켜짐" : "꺼짐");
    };
})();