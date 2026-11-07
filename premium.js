/* ============================================================
   배냇함 — 프리미엄 (premium.js)  [기준 확정본 v3]

   기준이 파일마다 달라서 헷갈렸다. 이제 여기 하나만 본다.
   다른 파일은 숫자를 직접 쓰지 말고 window.PLAN 을 읽는다.

   ─────────────────────────────────────────────
   ⚠️ 아래 목록과 밑의 PLAN 표가 서로 달랐다.
      "기준은 여기 하나" 라고 적어놓고 머리말과 표가 어긋나 있었으니
      헷갈리지 말라고 만든 파일이 헷갈리게 만들고 있었다.
      돌아가는 건 표다. 표에 맞춰 목록을 고쳤다.

   무료 (영원히)
     · 기록 전부 — 수유 · 수면 · 기저귀 · 체온 · 성장 · 가계부 · 다이어리
     · 도감 100가지와 그 사진 100장        ← 이 앱의 이유. 절대 안 잠근다
     · 하루 사진 3장
     · 목소리 10개
     · 봉인 편지 3통
     · 가족 3명 + 바통터치 알림            ← 막으면 유입이 죽는다
     · 추억 엽서 · 파형 엽서 저장
     · 배냇함 통째로 내려받기               ← 신뢰의 근간. 절대 안 잠근다
     · 기념일 · 육퇴 편지 · 놀이 처방전

   프리미엄
     · 하루 사진 무제한
     · 목소리 무제한
     · 봉인 편지 무제한
     · 가족 5명까지 (조부모 초대)
     · 배냇함 포토북 내보내기
     · 아기 프로필 3명까지                 ← '무제한' 아니다. script.js 가 3에서 막는다

   따로 파는 것
     · 실물 포토북 (물리 상품 — 앱 밖 결제 가능)
   ─────────────────────────────────────────────

   판별은 script.js 의 window.isPremiumUser() 하나만 쓴다.
   index.html 에서 photobook.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    /* ==========================================================
       ⭐ 여기가 유일한 기준표. 숫자를 바꾸려면 여기만 고친다.
       ========================================================== */
       var PLAN = {
        free: {
            photoPerDay: 3,
            voiceTotal:  10,
            sealedTotal: 3,
            familySize:  3,
            babies:      1
        },
        pro: {
            photoPerDay: Infinity,
            voiceTotal:  Infinity,
            sealedTotal: Infinity,
            familySize:  5,      // 보안 규칙도 5로 막혀 있다. 같이 움직여야 한다
            babies:      3
        },
        // 예정 가격 — 아직 정한 값이 아니다. 지금은 결제를 받지 않는다 (PLUS 안내 아래에 그대로 나간다)
        price: { month: 4900, year: 39000 },
        // 돈으로 잠그지 않는 것들 — 판단이 흔들릴 때 여기를 본다
        alwaysFree: [
            "도감 100가지와 그 사진",
            "수유·수면·기저귀·체온·성장·가계부·다이어리",
            "가족 3명 연동과 바통터치 알림",   // 표(free.familySize: 3)와 같게. "2인" 이라고 적혀 있었다
            "추억 엽서와 파형 엽서 저장",
            "배냇함 통째로 내려받기"
        ]
    };
    window.PLAN = PLAN;

    var GOLD    = "#B98A2E";
    var GOLD_BG = "rgba(185,138,46,0.12)";
    var PURPLE  = "#7F77DD";

    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    function babyName() { return localStorage.getItem("tosil_babyName") || "우리 아기"; }

    function todayKey() {
        var d = new Date();
        return d.getFullYear() + "-" +
               String(d.getMonth() + 1).padStart(2, "0") + "-" +
               String(d.getDate()).padStart(2, "0");
    }

    function toast(m) { if (typeof window.showToast === "function") window.showToast(m); }

    /* ---------- 판별은 하나만 ---------- */

    window.isPremium = function () {
        if (typeof window.isPremiumUser === "function") {
            try { return !!window.isPremiumUser(); } catch (e) {}
        }
        return false;
    };

    function cap(name) {
        return (window.isPremium() ? PLAN.pro : PLAN.free)[name];
    }

    window.photoCapPerDay = function () { return cap("photoPerDay"); };
    window.voiceCapTotal  = function () { return cap("voiceTotal");  };
    window.sealedCapTotal = function () { return cap("sealedTotal"); };
    window.familyCapTotal = function () { return cap("familySize");  };
    window.babyCapTotal   = function () { return cap("babies");      };

    /* ---------- 안내 문구 ----------
       문구는 실제 동작과 한 글자도 어긋나면 안 된다.

       ⚠️ PLUS 를 말하는 목록은 여기 하나다. 기능에서 막혔을 때도, 설정의 PLUS 칸을 눌렀을 때도 이 표로 그린다.
          예전엔 결제 화면(script.js showPaywall)에 목록이 따로 적혀 있었다. 이 시트와 줄 수도 내용도 달랐고,
          '큐레이터 다섯 곳 전부 보기'(고르는 건 무료다) · '그날의 목소리 녹음'(10개까지 무료다)처럼 사실과 다른 줄이 있었다.
       ⚠️ 돌봄 도우미(sitterplus.js)가 표에 없어서, 도우미 칸의 PLUS 를 누르면 '하루 사진 무제한' 이 떴다.
       ⚠️ medical: true 는 플레이 앱(playlite.js)에서 뺀다. 의료 기능을 거기서 숨기기 때문이다.
       ⚠️ 아기 이름은 처음 켤 때 아직 없을 수 있어서, 열 때마다 새로 만든다. -------- */

    function features() {
        var F = {
            photo: {
                title: "하루 사진 무제한",
                free:  "하루 " + PLAN.free.photoPerDay + "장",
                line:  "무료도 하루 " + PLAN.free.photoPerDay + "장까지 담겨요. PLUS는 장수를 세지 않아요."
            },
            voice: {
                title: "목소리 무제한",
                free:  PLAN.free.voiceTotal + "개까지",
                // '옹알이는 두 달이면 사라져요' 라고 적혀 있었다. 근거 없는 숫자라 뺐다
                line:  "무료로 " + PLAN.free.voiceTotal + "개까지 담을 수 있어요. 옹알이 소리는 금방 바뀌어요."
            },
            seal: {
                title: "봉인 편지 무제한",
                free:  PLAN.free.sealedTotal + "통까지",
                line:  "무료로 " + PLAN.free.sealedTotal + "통까지 봉인할 수 있어요. 지금의 마음은 지금밖에 못 써요."
            },
            book: {
                title: "배냇함 포토북",
                free:  "미리보기",        // 무료는 앞 세 쪽을 구워서 보여 준다 (photobook.js). '무료 —' 로 떠 있었다
                line:  "지금까지 담긴 걸 A5 한 권으로 묶어요. 앞 세 쪽은 무료로 미리 보고, 다 된 책은 인쇄소에 그대로 넘길 수 있어요."
            },
            month: {
                title: "이달의 배냇함",
                free:  "한 장",
                line:  "달이 바뀌면 지난달이 카드 한 장으로 도착해요. 첫 장은 선물이고, 그 뒤로는 매달이에요."
            },
            reel: {
                title: "소리 모아듣기",
                free:  "처음과 마지막",
                line:  "담긴 소리를 처음부터 끝까지 이어서 들어요. 목소리는 나란히 놓기 전에는 변한 걸 못 알아채요."
            },
            /* ⚠️ 큐레이터 다섯 곳의 PLUS 가 여기 빠져 있었다.
                  열아홉 개를 만들어놓고 안내 시트에는 한 줄도 없었다.
                  결제 화면에서 안 보이면 만든 적 없는 것과 같다. */
            curator: {
                title: "큐레이터 다섯 곳",
                free:  "고르기까지",      // '무료 고르는 건 무료' 로 읽혔다
                line:  "이유식 7일 식단표, 일주일 놀이 계획, 젖병 소모품, 카시트·유모차 관리까지. " +
                       "고르는 건 원래 무료예요. PLUS는 대신 세고, 대신 짜 드려요."
            },
            family: {
                title: "가족 " + PLAN.pro.familySize + "명까지",
                free:  "가족 " + PLAN.free.familySize + "명",   // 부모 둘 + 한 명. "부모 3명" 이라고 적혀 있었다
                line:  PLAN.free.familySize + "명까지는 무료예요. 할머니 할아버지까지 " + babyName() + "의 배냇함을 보려면 다섯 자리가 필요해요."
            },
            baby: {
                title: "아기 " + PLAN.pro.babies + "명까지",
                free:  "아기 " + PLAN.free.babies + "명",
                line:  "둘째, 셋째의 배냇함을 따로 만들 수 있어요."
            },
            sitter: {
                title: "돌봄 도우미 관리",
                free:  "도우미 1명",
                line:  "도우미 한 명은 무료로 연결돼요. PLUS는 둘째 도우미부터 연결하고, " +
                       "'오늘 다 봤어요' 하루 요약과 이번 주 · 이번 달 근무 시간을 보여 드려요."
            },
            report: {
                title: "소아과 리포트",
                free:  "한 번",           // 처음 한 번은 '체험판' 표시를 달고 나온다 (script.js downloadPediatricianPDF)
                medical: true,
                line:  "열 · 약 · 키 · 몸무게와 지난 7일 먹고 잔 기록을 A4 한 장으로 묶어요. 진료 때 그대로 보여 주시면 돼요."
            }
        };
        var lite = false;
        try { lite = typeof window.isPlayLite === "function" && !!window.isPlayLite(); } catch (e) {}
        if (lite) Object.keys(F).forEach(function (k) { if (F[k].medical) delete F[k]; });
        return F;
    }

       window.lockChip = function (label) {
        // 이름은 여기 한 곳에서만 정한다.
        // 부르는 쪽이 뭘 넘기든 화면에는 'PLUS'로 나간다 (설정 · 큐레이터 · 안내 창과 같은 이름).
        label = "PLUS";
        return '<span style="display:inline-flex; align-items:center; gap:3px; font-size:10px; font-weight:800; ' +
            'color:' + GOLD + '; background:' + GOLD_BG + '; padding:3px 8px; border-radius:8px; ' +
            'letter-spacing:0.2px; white-space:nowrap; vertical-align:middle;">' +
            '🔒 ' + esc(label || "프리미엄") + '</span>';
    };

    window.requirePremium = function (key) {
        if (window.isPremium()) return true;
        window.openUpsell(key);
        return false;
    };

    // 한도형 게이트 — 남은 자리가 있으면 그냥 통과
    function gate(key, have, capName) {
        var limit = cap(capName);
        if (have < limit) return true;
        if (window.isPremium()) { toast("여기는 이미 가득 찼어요"); return false; }
        window.openUpsell(key);
        return false;
    }

    /* ---------- PLUS 안내 — 창은 하나 ----------
       무료로 되는 것과 PLUS 를 나란히 보여준다.
       "뭐가 공짜인지" 를 먼저 알려야 값을 믿는다.

       ⚠️ 예전엔 두 장이었다. 이 시트 → '플러스 보러가기' → 결제 화면(script.js 의 어두운 창).
          같은 PLUS 를 두 번, 서로 다른 목록으로 말했다. 이제 한 장에서 끝낸다.
          누른 기능 → 무료와 PLUS → 앞으로도 무료인 것 → 예정 가격 → 알림 신청.
       ⚠️ 결제 화면은 목록이 길어서 단추가 화면 밖으로 밀렸다. 단추는 창 아래에 붙여 둔다.
       key 가 없으면 (설정의 PLUS 칸 · showPaywall) 전체 안내로 연다. -------- */

    function won(n) { return "₩" + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }

    /* ⚠️ 창을 style.transform 으로 올리고 내렸더니, 브라우저가 style 글자를 'background: var(--bg-card)' 로
          다시 써서 index.html 의 공통 카드 규칙(흰 바탕 · 테두리 · 네 모서리 둥글게, 전부 !important)에 걸렸다.
          어두운 화면에서 창이 하얗게 떴다. 움직임은 animate() 로만 준다 — style 글자를 건드리지 않는다. */
    function slide(card, from, to, ms, done) {
        try {
            if (card && card.animate) {
                var a = card.animate([{ transform: from }, { transform: to }], { duration: ms, easing: "ease-out", fill: "forwards" });
                if (done) { a.onfinish = done; setTimeout(done, ms + 200); }   // 끝 소식이 안 와도 닫는다
                return;
            }
        } catch (e) {}
        if (done) done();
    }

    window.closeUpsell = function () {
        var s = document.getElementById("upsell-sheet");
        if (!s) return;
        s.removeAttribute("id");            // 닫히는 동안 새 창이 바로 열릴 수 있게
        slide(s.firstElementChild, "translateY(0)", "translateY(100%)", 200, function () {
            if (s.parentNode) s.parentNode.removeChild(s);
        });
    };

    /* 아래 단추. 지금 PLUS 를 쓰는 사람(출시 기념 · 처음 14일 · 결제)에게는 신청을 받지 않는다.
       ⚠️ 출시 기념으로 다 열려 있는데 '열리면 제일 먼저 알려주세요' 가 떠 있었다. */
    function footState() {
        var month = won(PLAN.price.month);
        if (window.isPremium()) return { btn: "알겠어요", act: "window.closeUpsell()", note: "", quiet: true };
        var applied = false;
        try { applied = !!localStorage.getItem("tosil_premium_applied"); } catch (e) {}
        if (applied) return { btn: "신청해 두셨어요", act: "window.applyPremiumWaitlist(this)",
                              note: "여는 날 먼저 알려 드릴게요 · 예정 가격 달마다 " + month, quiet: true };
        return { btn: "열리면 제일 먼저 알려 주세요", act: "window.applyPremiumWaitlist(this)",
                 note: "지금은 결제를 받지 않아요 · 예정 가격 달마다 " + month, quiet: false };
    }

    window.openUpsell = function (key) {
        var F = features();
        var f = (key && F[key]) ? F[key] : null;

        var old = document.getElementById("upsell-sheet");
        if (old) old.remove();

        var wrap = document.createElement("div");
        wrap.id = "upsell-sheet";
        wrap.setAttribute("style", "position:fixed; inset:0; z-index:100002; background:rgba(35,29,24,0.55); display:flex; align-items:flex-end; justify-content:center;");
        wrap.onclick = function (e) { if (e.target === wrap) window.closeUpsell(); };

        // 누른 기능을 맨 위에 — 열 줄 가운데 어디에 있는지 찾지 않게
        var order = Object.keys(F);
        if (f) order = [key].concat(order.filter(function (k) { return k !== key; }));

        var rows = order.map(function (k) {
            var it = F[k], dim = f && k !== key;
            return '<div data-plus="' + k + '" style="display:flex; gap:12px; align-items:center; justify-content:space-between; padding:11px 0;' + (dim ? ' opacity:0.48;' : '') + '">' +
                '<div style="min-width:0; font-size:13.5px; font-weight:800; color:var(--text-m); letter-spacing:-0.3px; word-break:keep-all;">' + esc(it.title) + '</div>' +
                '<div style="flex-shrink:0; font-size:11px; font-weight:700; color:var(--text-sub); white-space:nowrap;">무료 ' + esc(it.free) + '</div>' +
            '</div>';
        }).join('<div style="height:1px; background:var(--border); opacity:0.5;"></div>');

        var freeList = PLAN.alwaysFree.map(function (t) {
            return '<div style="font-size:11.5px; font-weight:700; color:var(--text-sub); line-height:1.75;">· ' + esc(t) + '</div>';
        }).join("");

        var head = f || {
            title: "PLUS에서 더 쓸 수 있는 것들",
            line:  "기록하고 꺼내 보는 건 계속 무료예요. PLUS는 더 많이 담고, 모인 걸 한데 묶어 드려요."
        };

        var save = Math.round((1 - PLAN.price.year / (PLAN.price.month * 12)) * 100);
        var price =
            '<div style="border:1px solid var(--border); border-radius:16px; padding:15px 16px;">' +
                '<div style="font-size:11.5px; font-weight:900; color:var(--text-sub); margin-bottom:11px;">예정 가격</div>' +
                '<div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:8px;">' +
                    '<span style="font-size:13.5px; font-weight:700; color:var(--text-m);">달마다</span>' +
                    '<span style="font-size:15px; font-weight:900; color:var(--text-m);">' + won(PLAN.price.month) + '</span>' +
                '</div>' +
                '<div style="display:flex; justify-content:space-between; align-items:baseline;">' +
                    '<span style="font-size:13.5px; font-weight:700; color:var(--text-m);">1년치 한 번에' +
                        '<span style="font-size:11px; font-weight:800; color:' + PURPLE + '; margin-left:6px;">' + save + '% 저렴</span></span>' +
                    '<span style="font-size:15px; font-weight:900; color:var(--text-m);">' + won(PLAN.price.year) + '</span>' +
                '</div>' +
                '<div style="font-size:11.5px; font-weight:600; color:var(--text-sub); line-height:1.6; margin-top:11px; word-break:keep-all;">' +
                    '아직 정한 값은 아니고, 지금은 결제를 받지 않아요.</div>' +
            '</div>';

        var promo = "";   // 출시 기념 · 처음 14일 안내 (plusfree.js)
        try { promo = (typeof window.plusFreeBanner === "function") ? (window.plusFreeBanner() || "") : ""; } catch (e) {}

        var st = footState();

        wrap.innerHTML =
        '<div style="width:100%; max-width:480px; max-height:88vh; display:flex; flex-direction:column; background-color:var(--bg-card); border-radius:26px 26px 0 0;">' +
            '<div style="flex:1 1 auto; min-height:0; overflow-y:auto; -webkit-overflow-scrolling:touch; padding:20px 20px 16px;">' +
                '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">' +
                    '<span style="padding:4px 9px; border-radius:7px; background:' + GOLD_BG + '; color:' + GOLD + '; font-size:10.5px; font-weight:900; letter-spacing:0.4px;">PLUS</span>' +
                    '<span onclick="window.closeUpsell()" role="button" aria-label="닫기" style="font-size:24px; font-weight:300; color:var(--text-sub); cursor:pointer; line-height:1; padding:0 4px;">×</span>' +
                '</div>' +
                promo +
                '<div style="margin-bottom:18px;">' +
                    '<div style="font-size:20px; font-weight:800; color:var(--text-m); letter-spacing:-0.5px; line-height:1.35; word-break:keep-all;">' + esc(head.title) + '</div>' +
                    '<div style="font-size:13px; font-weight:600; color:var(--text-sub); line-height:1.7; margin-top:8px; word-break:keep-all;">' + esc(head.line) + '</div>' +
                '</div>' +
                '<div style="background:var(--bg-sub); border-radius:18px; padding:4px 16px; margin-bottom:14px;">' + rows + '</div>' +
                '<div style="background:rgba(127,119,221,0.08); border-radius:16px; padding:14px 16px; margin-bottom:14px;">' +
                    '<div style="font-size:11.5px; font-weight:900; color:' + PURPLE + '; margin-bottom:6px; letter-spacing:0.2px;">이건 앞으로도 무료예요</div>' +
                    freeList +
                '</div>' +
                price +
            '</div>' +
            '<div style="flex-shrink:0; padding:12px 20px calc(16px + env(safe-area-inset-bottom, 0px)); border-top:1px solid var(--border);">' +
                '<button type="button" id="upsell-go" onclick="' + st.act + '" style="display:block; width:100%; border:none; font-family:inherit; text-align:center; padding:15px; border-radius:15px; font-size:15px; font-weight:800; cursor:pointer; ' +
                    (st.quiet ? 'background:var(--bg-sub); color:var(--text-m);' : 'background:' + GOLD + '; color:#FFFFFF;') + '">' + esc(st.btn) + '</button>' +
                (st.note ? '<div style="text-align:center; font-size:11.5px; font-weight:700; color:var(--text-sub); margin-top:9px; word-break:keep-all;">' + esc(st.note) + '</div>' : '') +
            '</div>' +
        '</div>';

        document.body.appendChild(wrap);
        slide(wrap.firstElementChild, "translateY(100%)", "translateY(0)", 260);
        return true;   // 열었다 — openPlus 가 다른 창을 겹쳐 열지 않게
    };

    /* ---------- 결제 안내도 같은 창 ----------
       ⚠️ 여기서 결제 화면(showPaywall)을 하나 더 열었고, 그게 없으면 옛 안내창(vip-modal-overlay —
          '가족 초대 무제한' · '다둥이 프로필 무제한' 처럼 지금과 다른 말이 적힌)을 열었다. 이제 이 창 하나다. */

    window.startPremium = function () { return window.openUpsell(); };

    /* ---------- 사진 : 하루 장수 ---------- */

    var origAddDay = window.addDayPhoto;
    window.addDayPhoto = function (key) {
        var k = key || todayKey();
        var have = (typeof window.getLoosePhotos === "function") ? window.getLoosePhotos(k).length : 0;
        if (!gate("photo", have, "photoPerDay")) return;
        if (typeof origAddDay === "function") return origAddDay.apply(this, arguments);
    };

    var origAddRow = window.renderPhotoAdd;
    window.renderPhotoAdd = function (key) {
        var n = (typeof window.getLoosePhotos === "function") ? window.getLoosePhotos(key).length : 0;
        if (n < window.photoCapPerDay()) {
            return (typeof origAddRow === "function") ? origAddRow.apply(this, arguments) : "";
        }
        if (window.isPremium()) return "";
        return '<div onclick="event.stopPropagation(); window.openUpsell(\'photo\')" ' +
            'style="margin-top:14px; padding-top:13px; border-top:1px dashed var(--border); ' +
            'display:flex; align-items:center; gap:8px; cursor:pointer;">' +
            '<span style="font-size:12px; font-weight:700; color:var(--text-sub);">이 날 사진 더 담기</span>' +
            window.lockChip("프리미엄") +
        '</div>';
    };

    // 도감 사진은 잠그지 않는다. 그게 이 앱의 이유니까.

    /* ---------- 봉인 편지 : 무료 3통 ---------- */

    var origSeal = window.openSealSheet;
    window.openSealSheet = function () {
        var have = (typeof window.sealedCount === "function") ? window.sealedCount() : 0;
        if (!gate("seal", have, "sealedTotal")) return;
        if (typeof origSeal === "function") return origSeal.apply(this, arguments);
    };

    /* ---------- 포토북 : 덮어쓰지 않고 감싼다 ---------- */

    var origBook = window.exportMemoryBook;
    window.exportMemoryBook = function () {
        if (!window.requirePremium("book")) return;
        if (typeof origBook === "function") return origBook.apply(this, arguments);
        toast("포토북을 준비하고 있어요");
    };

    /* ---------- 다둥이 ---------- */

    var origBaby = window.addNewBabyProfile;
    window.addNewBabyProfile = function () {
        var have = 1;
        try { have = (JSON.parse(localStorage.getItem("tosil_baby_profiles")) || []).length || 1; } catch (e) {}
        if (!gate("baby", have, "babies")) return;
        if (typeof origBaby === "function") return origBaby.apply(this, arguments);
    };

    /* ---------- 가족 : 부모 둘은 무료 ----------
       짝꿍 연동을 막으면 바통터치 푸시가 통째로 죽는다.
       초대는 매출이 아니라 유입이다. -------- */

    window.requireFamilySlot = function (currentCount) {
        return gate("family", Number(currentCount) || 0, "familySize");
    };

    /* ---------- 배냇함 내려받기는 잠그지 않는다 ----------
       20년을 맡기는 앱에서, 꺼내갈 수 있다는 사실이 곧 신뢰다.
       탈출구가 보이면 사람은 나가지 않는다. -------- */

    /* ---------- 배냇함 두 자리 ---------- */

    window.renderPremiumRow = function () {
        var pro = window.isPremium();
        var voiceN = (typeof window.voiceCount === "function") ? window.voiceCount() : 0;
        var voiceLeft = Math.max(0, PLAN.free.voiceTotal - voiceN);
        var voiceLocked = !pro && voiceLeft <= 0;

        var tile = function (act, icon, label, sub, locked) {
            return '<div onclick="' + act + '" ' +
                'style="flex:1; background:var(--bg-card); border:1px solid var(--border); border-radius:18px; ' +
                'padding:15px 12px; text-align:center; cursor:pointer;' + (locked ? ' opacity:0.88;' : '') + '">' +
                '<div style="font-size:21px; margin-bottom:7px;">' + icon + '</div>' +
                '<div style="font-size:12.5px; font-weight:800; color:var(--text-m); letter-spacing:-0.3px; margin-bottom:5px;">' + esc(label) + '</div>' +
                (locked ? window.lockChip("프리미엄")
                        : '<div style="font-size:10.5px; font-weight:700; color:var(--text-sub);">' + esc(sub) + '</div>') +
            '</div>';
        };

        return '<div style="display:flex; gap:10px; margin-bottom:14px;">' +
            tile("window.openVoiceSheet()", "🎙️", "목소리",
                 pro ? "옹알이 담기" : voiceLeft + "개 더 담을 수 있어요", voiceLocked) +
            tile("window.exportMemoryBook()", "📖", "포토북", "한 권으로 내보내기", !pro) +
        '</div>';
    };

    /* ---------- 점검용 ---------- */
    window.premiumDebug = function () {
        console.log("프리미엄:", window.isPremium());
        console.log("  얼리버드:", localStorage.getItem("tosil_is_founder"));
        console.log("  요금제 캐시:", localStorage.getItem("tosil_plan_cache"));
        console.log("  마스터:", localStorage.getItem("tosil_is_master"));
        console.table({
            "하루 사진": window.photoCapPerDay(),
            "목소리":    window.voiceCapTotal(),
            "봉인 편지": window.sealedCapTotal(),
            "가족":      window.familyCapTotal(),
            "아기":      window.babyCapTotal()
        });
        console.log("무조건 무료:", PLAN.alwaysFree);
    };
})();