/* ============================================================
   배냇함 — 아이폰 알림 안내 (iospush.js)

   왜 이 파일이 필요한가.

   애플은 웹앱(PWA)에 알림을 줄 때 조건을 하나 겁니다.
   "사파리 탭에서 열어놓은 것"에는 절대 알림을 주지 않습니다.
   반드시 공유 → 홈 화면에 추가 → 그 아이콘으로 연 상태여야
   Push API 자체가 브라우저에 존재합니다.

   그래서 아내분 아이폰에서는
     getToken()  →  애초에 실행조차 안 됨  →  토큰 등록 0건
                 →  보내는 쪽은 멀쩡한데 받을 주소가 없음
   이 됩니다. 우리 코드 잘못이 아니라 애플의 설계입니다.

   조건이 하나 더 있습니다.
   알림 권한 창은 반드시 "사용자가 버튼을 누른 직후"에만 뜹니다.
   화면 뜨자마자 requestPermission() 을 부르면 iOS는 조용히 무시합니다.
   그래서 이 파일은 안내문이 아니라 '버튼'을 띄웁니다.

   index.html 에서 script.js 뒤에 한 줄 넣으세요.
     <script src="iospush.js?v=1"></script>
   ============================================================ */

(function () {
    "use strict";

    /* ----------------------------------------------------------
       1. 아이폰인가
       ---------------------------------------------------------- */

    var ua = navigator.userAgent || "";

    // 아이패드는 iPadOS 13부터 자기를 맥이라고 소개한다. 터치 여부로 걸러낸다.
    var isIOS =
        /iPad|iPhone|iPod/.test(ua) ||
        (ua.indexOf("Mac") > -1 && "ontouchend" in document);

    if (!isIOS) return;   // 안드로이드·PC는 이 파일이 아무 일도 안 한다

    /* ----------------------------------------------------------
       1-2. 나중에 앱스토어용 껍데기 안에서 돌 때는 입을 다문다

       앱으로 감싸면 화면은 그대로인데 standalone 판정이 false 로 나온다.
       그대로 두면 앱 안에서 "홈 화면에 추가하세요" 가 뜬다.
       이미 앱인데 앱을 설치하라는 소리라 그대로 리뷰 반려감이다.

       껍데기 만들 때 둘 중 하나만 해두세요.
         ① 웹뷰 UA 뒤에 BaenatApp 을 붙이거나
         ② 페이지 뜨자마자 window.__NATIVE_APP__ = true 를 넣거나
       ---------------------------------------------------------- */

    var isNativeShell =
        window.__NATIVE_APP__ === true ||
        !!window.Capacitor ||
        !!window.ReactNativeWebView ||
        !!(window.webkit && window.webkit.messageHandlers &&
           window.webkit.messageHandlers.baenat) ||
        /BaenatApp/i.test(ua);

    if (isNativeShell) return;   // 알림은 껍데기가 네이티브(APNs)로 처리한다

    /* ----------------------------------------------------------
       2. 홈 화면 아이콘으로 연 상태인가
       ---------------------------------------------------------- */

    var isStandalone =
        window.navigator.standalone === true ||
        (window.matchMedia &&
         window.matchMedia("(display-mode: standalone)").matches);

    /* ----------------------------------------------------------
       3. iOS 버전 (16.4 미만은 웹푸시 자체가 없다)
       ---------------------------------------------------------- */

    function iosVersion() {
        var m = ua.match(/OS (\d+)[_.](\d+)/);
        if (!m) return null;
        return Number(m[1]) + Number(m[2]) / 10;
    }
    var ver = iosVersion();
    var tooOld = ver !== null && ver < 16.4;

    /* ----------------------------------------------------------
       4. 지금 어떤 상태인가 — 넷 중 하나
       ---------------------------------------------------------- */

    var perm = (typeof Notification !== "undefined")
        ? Notification.permission
        : "unsupported";

    var state;
    if (tooOld)               state = "old";        // iOS 업데이트 필요
    else if (!isStandalone)   state = "install";    // 홈 화면에 추가해야 함
    else if (perm === "granted") state = "done";    // 끝. 아무것도 안 띄운다
    else if (perm === "denied")  state = "blocked"; // 설정에서 되살려야 함
    else                      state = "ask";        // 버튼만 누르면 됨

    if (state === "done") return;

    /* ----------------------------------------------------------
       5. 너무 자주 띄우지 않는다 — 닫으면 3일
          단, '버튼만 누르면 되는' 상태는 매번 띄운다. 한 번이면 끝나니까.
       ---------------------------------------------------------- */

    var KEY = "baenat_iospush_hide";
    if (state !== "ask") {
        var until = Number(localStorage.getItem(KEY) || 0);
        if (until && Date.now() < until) return;
    }

    function snooze() {
        localStorage.setItem(KEY, String(Date.now() + 3 * 24 * 60 * 60 * 1000));
    }

    /* ----------------------------------------------------------
       6. 문구
       ---------------------------------------------------------- */

    var COPY = {
        old: {
            icon: "🍎",
            title: "아이폰을 업데이트해 주세요",
            body:
                "iOS 16.4부터 아이폰도 알림을 받을 수 있어요.<br>" +
                "설정 → 일반 → 소프트웨어 업데이트에서 올려주세요.",
            steps: null,
            cta: null
        },
        install: {
            icon: "💌",
            title: "아이폰은 한 번만 더 해주셔야 해요",
            body:
                "아이폰은 홈 화면에 담아둔 앱에만 알림을 보내줍니다.<br>" +
                "30초면 끝나고, 다음부턴 바통터치가 바로 울려요.",
            steps: [
                "아래 <b>공유 버튼</b>을 누르고",
                "<b>홈 화면에 추가</b>를 고른 뒤",
                "<b>홈 화면의 배냇함 아이콘</b>으로 다시 들어와 주세요"
            ],
            cta: null
        },
        ask: {
            icon: "🔔",
            title: "알림을 켤까요",
            body:
                "짝꿍이 바통을 넘기면 바로 알려드릴게요.<br>" +
                "이것 말고는 울리지 않습니다.",
            steps: null,
            cta: "알림 켜기"
        },
        blocked: {
            icon: "🔕",
            title: "알림이 꺼져 있어요",
            body:
                "아이폰 <b>설정 → 알림 → 배냇함</b>에서<br>" +
                "알림 허용을 켜주시면 바통터치가 울립니다.",
            steps: null,
            cta: null
        }
    };

    var c = COPY[state];

    /* ----------------------------------------------------------
       7. 화면 — 아래에서 올라오는 쪽지
       ---------------------------------------------------------- */

    function build() {
        var wrap = document.createElement("div");
        wrap.id = "iospush-sheet";
        wrap.setAttribute("role", "dialog");
        wrap.setAttribute("aria-modal", "true");
        wrap.setAttribute("aria-label", c.title);

        var stepsHTML = "";
        if (c.steps) {
            stepsHTML = '<ol class="iospush-steps">';
            for (var i = 0; i < c.steps.length; i++) {
                stepsHTML += "<li>" + c.steps[i] + "</li>";
            }
            stepsHTML += "</ol>";
        }

        var ctaHTML = c.cta
            ? '<button type="button" class="iospush-go">' + c.cta + "</button>"
            : "";

        wrap.innerHTML =
            '<div class="iospush-dim"></div>' +
            '<div class="iospush-card">' +
                '<div class="iospush-icon">' + c.icon + "</div>" +
                '<h3 class="iospush-title">' + c.title + "</h3>" +
                '<p class="iospush-body">' + c.body + "</p>" +
                stepsHTML +
                ctaHTML +
                '<button type="button" class="iospush-later">나중에 할게요</button>' +
            "</div>";

        document.body.appendChild(wrap);

        // 닫기
        function close() {
            snooze();
            wrap.classList.remove("on");
            setTimeout(function () {
                if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
            }, 260);
        }
        wrap.querySelector(".iospush-later").addEventListener("click", close);
        wrap.querySelector(".iospush-dim").addEventListener("click", close);

        // 알림 켜기 — 반드시 이 클릭 '안'에서 불러야 iOS가 창을 띄운다
        var go = wrap.querySelector(".iospush-go");
        if (go) {
            go.addEventListener("click", function () {
                go.disabled = true;
                go.textContent = "여는 중…";

                Notification.requestPermission().then(function (res) {
                    if (res === "granted") {
                        go.textContent = "켜졌어요";
                        localStorage.removeItem(KEY);

                        /* 토큰 등록은 페이지가 뜰 때 도는 기존 코드에 맡긴다.
                           함수 이름을 여기서 추측하면 나중에 이름이 바뀔 때 조용히 깨진다.
                           새로고침 한 번이 가장 안전하다. */
                        setTimeout(function () { location.reload(); }, 700);
                    } else {
                        go.textContent = "알림 켜기";
                        go.disabled = false;
                        close();
                    }
                })["catch"](function () {
                    go.textContent = "알림 켜기";
                    go.disabled = false;
                });
            });
        }

        requestAnimationFrame(function () { wrap.classList.add("on"); });
    }

    /* ----------------------------------------------------------
       8. 모양 — 앱의 크림·연보라를 그대로 쓴다
          색이 안 맞으면 아래 두 값만 바꾸세요.
       ---------------------------------------------------------- */

    var CREAM  = "#FBF8F3";
    var PURPLE = "#8E7CF0";

    var css = document.createElement("style");
    css.textContent =
    "#iospush-sheet{position:fixed;inset:0;z-index:99999;opacity:0;" +
      "transition:opacity .26s ease;pointer-events:none}" +
    "#iospush-sheet.on{opacity:1;pointer-events:auto}" +

    "#iospush-sheet .iospush-dim{position:absolute;inset:0;" +
      "background:rgba(60,50,40,.34)}" +

    "#iospush-sheet .iospush-card{position:absolute;left:0;right:0;bottom:0;" +
      "background:" + CREAM + ";border-radius:26px 26px 0 0;" +
      "padding:30px 24px calc(24px + env(safe-area-inset-bottom));" +
      "text-align:center;transform:translateY(18px);" +
      "transition:transform .3s cubic-bezier(.22,1,.36,1);" +
      "box-shadow:0 -10px 40px rgba(90,70,50,.16)}" +
    "#iospush-sheet.on .iospush-card{transform:translateY(0)}" +

    "#iospush-sheet .iospush-icon{font-size:34px;line-height:1;margin-bottom:12px}" +
    "#iospush-sheet .iospush-title{margin:0 0 10px;font-size:19px;font-weight:800;" +
      "color:#3E3730;letter-spacing:-.4px}" +
    "#iospush-sheet .iospush-body{margin:0;font-size:14px;line-height:1.72;" +
      "color:#7C7268}" +

    "#iospush-sheet .iospush-steps{margin:18px 0 0;padding:16px 18px 16px 40px;" +
      "background:#fff;border-radius:16px;text-align:left;" +
      "font-size:14px;line-height:1.9;color:#4A423A}" +
    "#iospush-sheet .iospush-steps li{padding-left:2px}" +
    "#iospush-sheet .iospush-steps b{color:" + PURPLE + ";font-weight:700}" +

    "#iospush-sheet .iospush-go{display:block;width:100%;margin-top:20px;" +
      "padding:16px;border:0;border-radius:16px;background:" + PURPLE + ";" +
      "color:#fff;font-size:16px;font-weight:800;font-family:inherit;cursor:pointer}" +
    "#iospush-sheet .iospush-go:disabled{opacity:.6}" +

    "#iospush-sheet .iospush-later{display:block;width:100%;margin-top:10px;" +
      "padding:13px;border:0;background:none;color:#A79C90;" +
      "font-size:14px;font-family:inherit;cursor:pointer}" +

    "@media (prefers-reduced-motion:reduce){" +
      "#iospush-sheet,#iospush-sheet .iospush-card{transition:none}}";

    document.head.appendChild(css);

    /* ----------------------------------------------------------
       9. 화면이 다 그려진 뒤에 띄운다 — 로딩 중에 덮으면 놀란다

          그리고 아무에게나 부탁하지 않는다.
          짝꿍이 연결 안 된 사람은 알림이 올 일 자체가 없다.
          그런 사람에게 "홈 화면에 추가하세요" 는 그냥 귀찮은 팝업이다.

            짝꿍 있음   바통터치·문답이 오가는 사이 → 알림 없으면 기능이 반쪽
            짝꿍 없음   부탁할 이유가 없다 → 조용히 있는다
       ---------------------------------------------------------- */

    function hasPartner() {
        try {
            if (typeof window.getSyncCode === "function" && window.getSyncCode()) {
                return true;
            }
            return !!localStorage.getItem("family_sync_code");
        } catch (e) {
            return false;
        }
    }

    function start() {
        setTimeout(function () {
            if (!hasPartner()) return;
            build();
        }, 1200);
    }

    if (document.readyState === "complete") start();
    else window.addEventListener("load", start);

})();