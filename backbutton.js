/* ============================================================
   배냇함 — 뒤로가기 (backbutton.js)

   앱 전체에 popstate 를 다루는 코드가 한 줄도 없었다.

   웹에서는 별일 아니다. 브라우저 뒤로가기를 잘 안 누르니까.
   그런데 이걸 플레이스토어에 올리면 얘기가 달라진다.

       엽서 고르기를 열고 → 뒤로가기 → 앱이 그냥 닫힌다

   안드로이드에서 뒤로가기는 '한 단계 취소' 다. 사람들이 ✕ 대신 그걸 쓴다.
   심사자가 앱을 열고 제일 먼저 눌러보는 것도 그 버튼이다.
   덮은 화면을 열어둔 채 뒤로가기를 눌렀는데 앱이 죽으면
   그건 기능 결함으로 잡힌다.

   고치는 방법.
     덮는 화면이 열리면   주소 기록을 한 칸 쌓는다
     뒤로가기를 누르면    그 칸이 소비되면서 화면만 닫힌다
     쌓인 게 없으면       평소대로 (홈에서 누르면 앱이 닫힌다)

   ⚠️ 화면을 여는 코드는 한 줄도 안 고친다.
      파일이 스무 개인데 전부 손대면 반드시 하나를 빠뜨린다.
      화면이 나타나는 걸 지켜보다가 알아서 붙는다.

   ⚠️ 닫는 방법은 그 화면이 원래 쓰던 것을 그대로 쓴다.
      우리가 remove() 로 없애면 body 스크롤 잠금이 안 풀려서
      그 뒤로 화면이 안 움직이는 사고가 난다.

   index.html 맨 마지막, fit.js 앞에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    /* ----------------------------------------------------------
       덮는 화면 목록 — id 와, 그 화면이 원래 쓰던 닫는 함수
       ---------------------------------------------------------- */

    var LAYERS = [
        { id: "diary-box",              close: "closeDiaryBox" },
        { id: "letterbox-modal",        close: "closeLetterBox" },
        { id: "sleepmap-modal",         close: "closeSleepMap" },
        { id: "tracker-sheet-overlay",  close: "closeTrackerSheet" },
        { id: "stats-sheet-overlay",    close: "closeStatsSheet" },
        { id: "custom-confirm-modal",   close: null },
        { id: "premium-paywall-modal",  close: "closePaywall" },
        { id: "upsell-sheet",           close: null },
        { id: "postcard-picker",        close: null },
        { id: "book-preview",           close: null },
        { id: "export-sheet",           close: null },
        { id: "bs-sheet",               close: null },
        { id: "iospush-sheet",          close: null },
        { id: "invite-bottom-sheet",    close: null },
        { id: "milestone-bottom-sheet", close: null },
        { id: "mb-photo-viewer",        close: "closePhotoViewer" },
        { id: "note-sheet",             close: "closeNoteSheet" },
        { id: "seal-sheet",             close: "closeSealSheet" },
        { id: "voice-sheet",            close: "closeVoiceSheet" },
        { id: "words-sheet",            close: "closeWordsSheet" },
        { id: "kiosk-modal",            close: "closeKiosk" },

        /* 이번 검수에서 더 찾은 것들 */
        { id: "firstfill",              close: "closeFirstFill" },   // 첫 담기 — 여기서 앱이 꺼지면 최악이다
        { id: "sos-modal",              close: "closeSOS" },
        { id: "emergency-card",         close: null },
        { id: "milestone-list-container", close: null },
        { id: "edit-baby-modal",        close: null },
        { id: "sheet-counter",          close: null },

        /* 이번 배치에서 더 찾은 것 */
        { id: "nursing-sheet",          close: null },   // 수유실 — 급할 때 여는 화면
        { id: "bedtime-sheet",          close: null },   // 육퇴 시간 고르기
    ];

    /* 진행 중인 작업은 뒤로가기로 닫으면 안 된다.
       포토북을 굽는 중에 창이 사라지면 다 날아간 줄 안다. */
    var NEVER_CLOSE = ["book-progress", "export-progress"];

    var MARK = "baenat-layer";
    var stack = [];        // 지금 열려 있는 것들 (나중에 열린 게 뒤)

    function byId(id) { return document.getElementById(id); }

    function visible(el) {
        if (!el) return false;
        if (!el.isConnected) return false;
        var st = window.getComputedStyle(el);
        return st.display !== "none" && st.visibility !== "hidden" && st.opacity !== "0";
    }

    /* ----------------------------------------------------------
       닫기 — 그 화면이 원래 쓰던 방법을 먼저 쓴다
       ---------------------------------------------------------- */

    function closeLayer(entry) {
        var el = byId(entry.id);

        if (entry.close && typeof window[entry.close] === "function") {
            try { window[entry.close](); } catch (e) {}
        } else if (el) {
            /* 원래 닫는 함수가 없는 화면들.
               열 때 innerHTML 로 만들고 remove() 로 없애던 것들이라
               우리도 똑같이 없앤다. */
            try { el.remove(); } catch (e) {}
        }

        /* ⚠️ 화면을 덮을 때 body 스크롤을 잠그는 곳이 여럿이다.
              닫았는데 안 풀면 그 뒤로 화면이 안 움직인다.
              덮은 게 하나도 안 남았을 때만 푼다. */
        setTimeout(function () {
            if (!anyOpen()) document.body.style.overflow = "";
        }, 60);
    }

    function anyOpen() {
        for (var i = 0; i < LAYERS.length; i++) {
            if (visible(byId(LAYERS[i].id))) return true;
        }
        return false;
    }

    /* ----------------------------------------------------------
       화면이 뜨면 주소 기록을 한 칸 쌓는다
       ---------------------------------------------------------- */

    function push(entry) {
        for (var i = 0; i < stack.length; i++) {
            if (stack[i].id === entry.id) return;      // 이미 쌓아둔 것
        }
        stack.push(entry);
        try {
            history.pushState({ baenat: MARK, id: entry.id }, "", location.href);
        } catch (e) {}
    }

    function scan() {
        // 새로 뜬 것 쌓기
        for (var i = 0; i < LAYERS.length; i++) {
            if (visible(byId(LAYERS[i].id))) push(LAYERS[i]);
        }

        // ✕ 로 닫은 것은 목록에서 빼준다 (주소 칸은 그대로 두고 소비되게)
        for (var j = stack.length - 1; j >= 0; j--) {
            if (!visible(byId(stack[j].id))) stack.splice(j, 1);
        }
    }

    /* ----------------------------------------------------------
       뒤로가기
       ---------------------------------------------------------- */

    window.addEventListener("popstate", function () {
        scan();
        if (!stack.length) return;        // 덮은 게 없으면 평소대로

        var top = stack[stack.length - 1];
        if (NEVER_CLOSE.indexOf(top.id) > -1) {
            // 진행 중인 작업. 칸을 도로 쌓아서 앱이 닫히지 않게만 한다.
            try { history.pushState({ baenat: MARK, id: top.id }, "", location.href); } catch (e) {}
            return;
        }

        stack.pop();
        closeLayer(top);
    });

    /* ----------------------------------------------------------
       지켜보기 — 여는 코드는 안 건드린다
       ---------------------------------------------------------- */

    function boot() {
        scan();

        if (window.MutationObserver) {
            var pending = null;
            new MutationObserver(function () {
                if (pending) return;
                pending = setTimeout(function () { pending = null; scan(); }, 80);
            }).observe(document.body, {
                childList: true, subtree: true,
                attributes: true, attributeFilter: ["style", "class"]
            });
        }

        setInterval(scan, 3000);   // 관찰자가 놓친 것 줍기 (잦을 필요 없다)
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }

    /* 점검용 */
    window.backDebug = function () {
        scan();
        console.log("지금 덮여 있는 화면:", stack.map(function (x) { return x.id; }).join(", ") || "없음");
        console.log("쌓인 주소 칸:", stack.length);
        console.log("history.state:", history.state);
    };
})();