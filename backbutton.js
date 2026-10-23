/* ============================================================
   배냇함 — 뒤로가기 (backbutton.js)

   안드로이드에서 뒤로가기는 '한 단계 취소' 다. 사람들이 ✕ 대신 그걸 쓴다.
   덮은 화면을 열어둔 채 뒤로가기를 눌렀는데 앱이 꺼지면 그건 사고다.

   세 단계로 받는다.
       1  덮은 화면(영수증 · 기록 입력 · 편지 …)이 있으면   →  그것만 닫는다
       2  홈이 아닌 탭(툴박스 · 나들이 · 설정 …)이면         →  홈으로
       3  홈에서 눌렀다                                    →  "한 번 더 누르면 닫혀요", 2초 안에 또 누르면 닫는다

   두 길로 들어온다.
     웹(크롬 · 홈 화면 앱)   덮는 화면이 열리면 주소 기록을 한 칸 쌓아 두고, 뒤로가기(popstate)가 그 칸을 쓴다.
     플레이 앱(캐패시터)      앱 껍데기가 뒤로가기를 누를 때마다 window.__baenaetBack() 을 부른다.
                             "handled" 를 돌려주면 껍데기는 아무것도 안 하고, "exit" 면 앱을 내린다 (끄지 않는다).
     ⚠️ 앱 껍데기 1.1.1 전에는 뒤로가기를 사이트에 넘기지 않아서, 어디서 눌러도 앱이 바로 꺼졌다.

   ⚠️ 화면을 여는 코드는 한 줄도 안 고친다. 화면이 나타나는 걸 지켜보다가 알아서 붙는다.
   ⚠️ 닫는 방법은 그 화면이 원래 쓰던 것을 그대로 쓴다.
      우리가 remove() 로 없애면 body 스크롤 잠금이 안 풀리거나, index.html 에 박힌 화면은 다시 못 연다.

   index.html 맨 마지막, fit.js 앞에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    /* ----------------------------------------------------------
       덮는 화면 목록 — id 와, 그 화면을 닫는 방법
         "함수이름"  그 화면이 원래 쓰던 닫는 함수
         "hide"     index.html 에 박혀 있는 화면 — 지우면 다시 못 연다. 숨기기만
         "-active"  class="active" 를 붙였다 떼는 화면 — 그 이름표만 뗀다
         null       열 때 만들고 ✕ 가 remove() 로 없애던 화면 — 우리도 없앤다

       ⚠️ 덮는 화면이 아닌 것을 넣으면 안 된다.
          '첫 순간 도감' 안쪽의 숫자(sheet-counter)와 목록 칸(milestone-list-container)이 여기 있었다.
          도감을 닫아 둬도 늘 '보이는 것' 으로 잡혀서, 홈에서 뒤로가기를 두 번 누르면
          그 둘이 지워졌다. 그 뒤로 도감을 열면 빈 창이 떴다.
       ---------------------------------------------------------- */

    var LAYERS = [
        { id: "diary-box",              close: "closeDiaryBox" },
        { id: "qa-sheet",               close: "closeQaSheet" },    // 우리의 문답 — 홈에서 바로 쓰는 창
        { id: "stage-sheet",            close: null },              // 열 달의 문답 · 임신 기록 창 (열 때 만들고 닫을 때 지운다)
        { id: "pt-sheet",               close: null },              // 이른둥이 예정일 넣기 (정보 수정 창 위에 뜬다 — 이게 먼저 닫혀야 한다)
        { id: "week-sheet",             close: null },              // 이번 주 한 장
        { id: "letterbox-modal",        close: "closeLetterBox" },
        { id: "sleepmap-modal",         close: "closeSleepMap" },
        { id: "tracker-sheet-overlay",  close: "closeTrackerSheet" },   // 기록 입력
        { id: "stats-sheet-overlay",    close: "closeStatsSheet" },
        { id: "custom-confirm-modal",   close: "hide" },   // ⚠️ index.html 에 박힌 확인 창. 지워 버려서 그 뒤로 '지울까요?' 가 안 떴다
        { id: "premium-paywall-modal",  close: null },
        { id: "upsell-sheet",           close: null },
        { id: "postcard-picker",        close: null },
        { id: "book-preview",           close: null },
        { id: "export-sheet",           close: null },
        { id: "iospush-sheet",          close: null },
        { id: "invite-bottom-sheet",    close: "hide" },   // ⚠️ index.html 에 박힌 창이다. 뒤로가기가 지워 버려서 다시 못 열었다
        { id: "milestone-bottom-sheet", close: "closeMilestoneModal" },   // 첫 순간 도감 (지우면 다시 못 연다)
        { id: "mb-photo-viewer",        close: "closePhotoViewer" },
        { id: "note-sheet",             close: "closeNoteSheet" },
        { id: "seal-sheet",             close: "closeSealSheet" },
        { id: "voice-sheet",            close: "closeVoiceSheet" },
        { id: "words-sheet",            close: null },
        { id: "kiosk-modal",            close: "hide" },   // 키오스크 연습 — index.html 에 박힌 화면
        { id: "firstfill",              close: "closeFirstFill" },   // 첫 담기 — 여기서 앱이 꺼지면 최악이다
        { id: "sos-modal",              close: "closeSOS" },
        { id: "edit-baby-modal",        close: null },
        { id: "nursing-sheet",          close: null },   // 수유실 — 급할 때 여는 화면
        { id: "bedtime-sheet",          close: null },   // 육퇴 시간 고르기
        { id: "e119-card",              close: "close119Card" },           // 119에 읽어줄 카드 — 급할 때 여는 화면
        { id: "receipt-modal",          close: "closeReceiptModal" },      // 오늘의 영수증 (육퇴 배너)
        { id: "global-image-viewer",    close: "closeImageViewer" },
        { id: "family-sync-modal",      close: "closeFamilySyncModalForce" },
        { id: "premium-modal",          close: "closeFestivalModalForce" },
        { id: "checklist-modal",        close: "closeChecklistForce" },
        { id: "emergency-modal",        close: "closeEmergencyModalForce" },
        { id: "routine-settings-modal", close: "closeRoutineSettingsForce" },
        { id: "tracker-settings-modal", close: "closeTrackerSettingsForce" },
        { id: "diaper-bottom-sheet",    close: "closeDiaperSheet" },
        { id: "notice-controller-overlay", close: "closeNoticeController" },
        { id: "vip-modal-overlay",      close: "hide" },
        { id: "kiosk-option-modal",     close: "hide" },
        { id: "baby-mgmt-modal",        close: null },     // ✕ 가 remove() 로 닫는 화면
        { id: "sync-ticket-modal",      close: null },
        { id: "ms-date-sheet",          close: "closeMilestoneDate" },     // 도감 날짜 고르기
        { id: "word-input-sheet",       close: null },                     // 첫 단어 담기
        { id: "voice-box",              close: "closeVoiceBox" },          // 소리함
        { id: "sealed-box",             close: "closeSealedBox" },         // 봉인함
        { id: "sealed-view",            close: "closeSealedView" },        // 봉인 편지 읽기
        { id: "vaccine-sheet",          close: null },                     // 예방접종 일정표
        { id: "voice-reel",             close: "closeVoiceReel" },         // 소리 모아듣기
        { id: "navi-nudge",             close: null },                     // 내비 켜기 전 '기저귀 가방' 확인

        /* 목록에 없어서 뒤로가기를 누르면 그 밑 화면까지 같이 넘어가던 것들 */
        { id: "duty-sheet",             close: null },          // 오늘 당번
        { id: "who-sheet",              close: null },          // 누구를 초대할까요
        { id: "pin-sheet",              close: "__pinCancel" }, // 도우미 화면 숫자 4자리
        { id: "pushask-sheet",          close: null },          // 알림 켜기
        { id: "pushcheck-sheet",        close: null },          // 알림 점검
        { id: "post-action-sheet",      close: null },
        { id: "comment-action-sheet",   close: null },
        { id: "admin-secret-dashboard", close: null },
        { id: "commSearchOverlay",      close: "-active" },
        { id: "commNotiOverlay",        close: "-active" },
        { id: "commBlockOverlay",       close: "-active" },
        { id: "commActivityOverlay",    close: "-active" },

        /* 진행 중인 작업 — NEVER_CLOSE 에 있어도 이 목록에 없으면 지켜지지 않았다.
           내려받는 도중 뒤로가기 두 번이면 앱이 꺼졌다. */
        { id: "export-progress",        close: null },
        { id: "book-progress",          close: null }
    ];

    /* 진행 중인 작업은 뒤로가기로 닫으면 안 된다.
       포토북을 굽는 중에 창이 사라지면 다 날아간 줄 안다. */
    var NEVER_CLOSE = ["book-progress", "export-progress"];

    /* 홈이 아닌 탭에서 뒤로가기를 누르면 홈으로 간다. 마이페이지만 맘수다로 */
    var BACK_TO = { mypage: "community" };

    var MARK = "baenat-layer";
    var stack = [];        // 지금 열려 있는 것들 (나중에 열린 게 뒤)

    var EXIT_WINDOW = 2000;   // 이 시간 안에 한 번 더 누르면 진짜 종료
    var lastAsk = 0;          // 마지막으로 "한 번 더" 를 띄운 시각
    var nativeAt = 0;         // 앱 껍데기가 마지막으로 뒤로가기를 물어본 시각

    /* ----------------------------------------------------------
       지금 어느 탭인가

       ⚠️ 아래 탭 단추(.nav-item.active)만 봤다.
          설정 · 마이페이지는 아래 단추가 없어서 '모름' 이 되고,
          설정에서 뒤로가기를 누르면 홈으로 가는 대신 "한 번 더 누르면 닫혀요" 가 떴다.
          지금 보이는 탭(.tab-content.active)을 먼저 본다.
       ---------------------------------------------------------- */

    function currentTab() {
        var t = document.querySelector(".tab-content.active");
        if (t && t.id && t.id.indexOf("tab-") === 0) return t.id.slice(4);
        var el = document.querySelector(".nav-item.active");
        if (!el || !el.id) return null;
        return el.id.replace(/^nav-/, "");
    }

    function goTab(id) {
        var el = document.getElementById("nav-" + id);
        if (typeof window.switchTab === "function") {
            try { window.switchTab(id, el); return true; } catch (e) {}
        }
        if (el) { try { el.click(); return true; } catch (e) {} }
        return false;
    }

    function say(m) {
        if (typeof window.showToast === "function") window.showToast(m);
    }

    function byId(id) { return document.getElementById(id); }

    /* 화면에 정말 떠 있나.
       ⚠️ 부모가 숨겨져 있어도 자기 스타일만 보면 '보인다' 로 나온다 (도감 안쪽 칸이 그랬다).
          그래서 화면에 차지한 자리(getClientRects)가 있는지도 본다. */
    function visible(entry) {
        var el = byId(entry.id);
        if (!el || !el.isConnected) return false;
        if (entry.close === "-active") return el.classList.contains("active");
        var st = window.getComputedStyle(el);
        if (st.display === "none" || st.visibility === "hidden") return false;
        if (parseFloat(st.opacity || "1") < 0.05) return false;
        return el.getClientRects().length > 0;
    }

    /* ----------------------------------------------------------
       닫기 — 그 화면이 원래 쓰던 방법을 먼저 쓴다
       ---------------------------------------------------------- */

    function closeLayer(entry) {
        var el = byId(entry.id);

        if (entry.close === "hide") {
            // index.html 에 박혀 있는 화면 — 지우면 다음에 못 연다. 숨기기만.
            if (el) el.style.display = "none";
        } else if (entry.close === "-active") {
            if (el) el.classList.remove("active");
        } else if (entry.close) {
            var fn = window[entry.close];
            var ok = false;
            if (typeof fn === "function") {
                try { fn(); ok = true; } catch (e) { console.warn("[뒤로가기] 닫는 함수 실패:", entry.close, e); }
            }
            // 닫는 함수가 없거나 실패했다. 지우지 않고 숨긴다 (박혀 있는 화면일 수 있다)
            if (!ok && el) el.style.display = "none";
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
            if (visible(LAYERS[i])) return true;
        }
        return false;
    }

    /* ----------------------------------------------------------
       화면이 뜨면 주소 기록을 한 칸 쌓는다 (웹의 뒤로가기가 쓴다)
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
            if (visible(LAYERS[i])) push(LAYERS[i]);
        }

        // ✕ 로 닫은 것은 목록에서 빼준다 (주소 칸은 그대로 두고 소비되게)
        for (var j = stack.length - 1; j >= 0; j--) {
            if (!visible(stack[j])) stack.splice(j, 1);
        }
    }

    function guard() {
        try { history.pushState({ baenat: MARK, id: "guard" }, "", location.href); } catch (e) {}
    }

    /* ----------------------------------------------------------
       뒤로가기 한 번 — 웹과 앱이 같이 쓴다
       "handled" 처리했다 / "exit" 홈에서 두 번 눌렀다
       ---------------------------------------------------------- */

    function backOnce(fromApp) {
        scan();

        /* 1단계 — 덮은 화면이 있으면 그것부터 닫는다 */
        if (stack.length) {
            var top = stack[stack.length - 1];
            if (NEVER_CLOSE.indexOf(top.id) > -1) {
                say("다 만들 때까지 잠깐만 기다려 주세요");
                return "handled";
            }
            stack.pop();
            closeLayer(top);
            return "handled";
        }

        /* 2단계 — 홈이 아니면 홈으로 (마이페이지는 맘수다로).
                  이게 안드로이드에서 뒤로가기가 원래 하는 일이다. */
        var tab = currentTab();
        if (tab && tab !== "home") {
            if (goTab(BACK_TO[tab] || "home")) return "handled";
        }

        /* 3단계 — 홈에서 눌렀다.
                  한 번은 붙잡고, 2초 안에 또 누르면 보내드린다.

           ⚠️ 한 번에 꺼지면 아기 안고 한 손으로 쓰다가
              잘못 누른 사람이 그대로 쫓겨난다.
              기록을 쓰다 만 상태였으면 그게 다 날아간다. */
        if (Date.now() - lastAsk < EXIT_WINDOW) {
            if (fromApp) lastAsk = 0;   // 앱은 내려갔다가 다시 열린다. 다음엔 처음부터 다시 묻는다
            return "exit";
        }

        lastAsk = Date.now();
        say("👋 한 번 더 누르면 배냇함이 닫혀요");
        return "handled";
    }

    /* 플레이 앱 껍데기가 부른다 (MainActivity.handleBackButton) */
    window.__baenaetBack = function () {
        nativeAt = Date.now();
        try {
            return backOnce(true);
        } catch (e) {
            console.warn("[뒤로가기]", e);
            return "exit";      // 먹통보다는 앱을 내리는 게 낫다 (다시 열면 보던 화면 그대로)
        }
    };

    window.addEventListener("popstate", function () {
        /* 앱 껍데기가 방금 같은 뒤로가기를 이미 처리했다 (답이 늦어 껍데기가 웹뷰도 한 칸 물렸을 때).
           두 번 물러나지 않게 칸만 도로 쌓는다. */
        if (Date.now() - nativeAt < 1500) { guard(); return; }

        if (backOnce(false) === "exit") {
            /* 칸을 다시 안 쌓는다. 그리고 한 칸 더 물러난다.
               첫 진입 기록보다 뒤로 가면 앱이 닫힌다. */
            try { history.back(); } catch (e) {}
            return;
        }
        guard();
    });

    /* ----------------------------------------------------------
       지켜보기 — 여는 코드는 안 건드린다
       ---------------------------------------------------------- */

    function boot() {
        scan();

        /* ⚠️ 시작할 때 칸을 하나 쌓아둔다.
              이게 없으면 첫 뒤로가기가 곧바로 앱 밖으로 나가서
              우리가 붙잡을 기회조차 없다. */
        guard();

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
        console.log("지금 탭:", currentTab() || "모름");
        console.log("종료 확인 대기중:", Date.now() - lastAsk < EXIT_WINDOW);
        return { layers: stack.map(function (x) { return x.id; }), tab: currentTab() };
    };
})();
