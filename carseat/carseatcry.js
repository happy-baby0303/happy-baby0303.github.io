/* ============================================================
   배냇함 PLUS — 카시트만 타면 울어요 (carseatcry.js)

   carseatown.js 는 '한 달에 한 번 열 이유' 를 만든다.
   키, 어깨끈, 유효기간, 계절.

   그런데 부모가 카시트 때문에 괴로운 건 매일이다.
   태우면 몸을 활처럼 젖히고 소리를 지른다.
   그러다 지친 부모가 결국 안고 탄다 — 이 탭이 막아야 할 제일 위험한 순간이
   바로 그거고, 지금 앱은 그 얘기를 한 마디도 안 한다.

   세 가지를 넣는다.
     1. 카시트 거부   증상마다 시도 순서가 다르다. 하루에 하나씩
     2. 하네스 탈출   두 살 넘으면 갑자기 시작된다. 진짜 위험하다
     3. 하네스 탈출   두 살 넘으면 갑자기 시작된다 (무료 — 안전 정보다)
     4. 장거리 안전   귀성길에 지킬 것 (무료 — 안전 정보다)
     5. 이번 주행 계획 몇 시에 쉴지 계산해준다 (PLUS — 계산이다)

   ⚠️ 3·4 를 잠그면 안 된다.
      "차에 아이만 두고 내리지 마세요" 를 유료로 파는 앱이 되면 안 된다.
      잠그는 건 '수고' 지 '정보' 가 아니고, 안전은 절대 안 잠근다.
      대신 '내 여정에 맞춘 쉬는 시각' 은 계산이라 PLUS 로 둔다.

   \u26a0\ufe0f 효과를 약속하지 않는다. '해보는 방법' 이다.
   \u26a0\ufe0f 각도\u00b7설치\u00b7배치는 건드리지 않는다. 차종과 제품마다 다르다.
      우리가 말하면 그 순간 우리 책임이 된다.
   \u26a0\ufe0f 우는 게 방법의 문제가 아닐 수 있다. 병원 신호를 먼저 말한다.

   index.html 에서 carseatown.js 다음, carseattabs.js 앞에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var KEY  = "tosil_carseat_cry";
    var HOST = "carseat-cry";

    var BLUE = "#3182F6", GRAY = "#8B95A1", DARK = "#191F28";
    var RED  = "#E32636", GOLD = "#8A6D00", GREEN = "#1F9D6B";

    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }
    function babyName() { return localStorage.getItem("tosil_babyName") || "우리 아기"; }
    function nm(j) {
        try { if (typeof window.babyNm === "function") return window.babyNm(j); } catch (e) {}
        var n = babyName(), c = n.charCodeAt(n.length - 1);
        var jong = (c >= 0xAC00 && c <= 0xD7A3) && ((c - 0xAC00) % 28 !== 0);
        return n + (jong ? "이" : "") + (j || "");
    }
    function isPlus() {
        try { if (typeof window.isPremiumUser === "function") return !!window.isPremiumUser(); } catch (e) {}
        if (!localStorage.getItem("firebase_uid")) return false;
        return localStorage.getItem("tosil_is_founder") === "true"
            || localStorage.getItem("tosil_plan_cache") === "premium"
            || localStorage.getItem("tosil_is_master") === "true";
    }
    function monthsOld() {
        var s = localStorage.getItem("tosil_startDate");
        if (!s) return null;
        var p = String(s).split("-").map(Number);
        if (p.length !== 3) return null;
        var b = new Date(p[0], p[1] - 1, p[2]), t = new Date();
        var m = (t.getFullYear() - b.getFullYear()) * 12 + (t.getMonth() - b.getMonth());
        if (t.getDate() < b.getDate()) m--;
        return m < 0 ? 0 : m;
    }
    function today() {
        var t = new Date();
        return t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") +
               "-" + String(t.getDate()).padStart(2, "0");
    }
    function st() {
        try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
    }
    function save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }

    /* ==========================================================
       1. 카시트 거부 — 증상마다 순서가 다르다
       ---------------------------------------------------------- */

    var WAYS = {
        start: [
            { t: "차에 시동 끄고 앉혀보기",
              d: "달리지 않는 차에서 <b>몇 분만</b> 앉아 있어 보세요. " +
                 "간식이나 좋아하는 걸 들고 옆에 같이 앉아 계시고요. " +
                 "카시트가 <b>'출발 신호' 가 아니라 그냥 의자</b>가 되는 게 첫걸음입니다." },
            { t: "집 안에 며칠 두기",
              d: "카시트를 거실에 내려놓고 며칠 두세요. " +
                 "만지고 올라타고 놀게요. <b>낯선 물건이 아니게</b> 만드는 겁니다." },
            { t: "탈 때마다 같은 말을 하기",
              d: "\"이제 안전벨트 하자\" 같은 <b>짧은 말 하나를 정해서</b> 매번 똑같이 하세요. " +
                 "무슨 일이 일어날지 알면 아기가 덜 놀랍니다." },
            { t: "짧은 거리부터 늘려가기",
              d: "5분 거리를 며칠, 그다음 10분. " +
                 "<b>도착지가 즐거운 곳</b>이면 더 좋아요. 놀이터나 할머니 댁처럼요." }
        ],
        bored: [
            { t: "손에 쥘 걸 바꿔보기",
              d: "급정거하면 딱딱한 건 위험합니다. <b>천이나 말랑한 것</b>만 주세요. " +
                 "그리고 <b>차에서만 주는 물건</b>을 하나 정해두면 훨씬 오래 갑니다." },
            { t: "볼 게 있게 해주기",
              d: "창밖이 안 보이면 지루합니다. " +
                 "창문 쪽 그늘막을 <b>반만</b> 내리거나, 시야가 트이는 자리인지 보세요." },
            { t: "소리를 바꿔보기",
              d: "늘 틀던 동요 말고 <b>부모 목소리</b>가 통하는 아기가 많습니다. " +
                 "노래를 불러주거나 계속 말을 걸어보세요." },
            { t: "옷을 얇게",
              d: "차 안은 생각보다 덥습니다. " +
                 "<b>등에 손을 넣어 땀이 나면</b> 더워서 우는 거예요. 한 겹 벗기세요." }
        ],
        time: [
            { t: "출발 시각을 옮겨보기",
              d: "<b>배고프거나 졸린 때</b>에 태우면 무조건 웁니다. " +
                 "먹이고 나서, 또는 낮잠 시간에 맞춰 출발해보세요." },
            { t: "타기 전에 실컷 움직이게",
              d: "차에 앉기 전 <b>10분만</b> 걷거나 기어다니게 하세요. " +
                 "몸을 쓰고 타면 훨씬 오래 버팁니다." },
            { t: "기저귀를 새것으로",
              d: "타기 직전에 갈아주세요. 젖은 채로 묶여 있으면 아무도 못 버팁니다." }
        ],
        sudden: [
            { t: "어깨끈 높이부터 보기",
              d: "갑자기 싫어하기 시작했다면 <b>몸이 자란 것</b>일 수 있습니다. " +
                 "끈이 어깨를 파고들면 아픕니다. 위쪽 <b>우리 카시트</b>에서 마지막으로 맞춘 날을 보세요." },
            { t: "옷 두께 되짚어보기",
              d: "계절이 바뀌면서 옷이 두꺼워졌다면 그것부터입니다. " +
                 "<b>겉옷을 벗기고</b> 태워보세요." },
            { t: "버클이나 끈이 살에 닿는지",
              d: "여름엔 반팔이라 <b>버클 금속이나 끈이 맨살에 닿습니다.</b> " +
                 "얇은 천을 덧대거나 긴소매를 입혀보세요." },
            { t: "카시트 안을 손으로 훑어보기",
              d: "과자 부스러기, 장난감 조각이 등에 배기는 경우가 많습니다. " +
                 "손을 넣어 <b>등판과 엉덩이 쪽</b>을 쓸어보세요." }
        ]
    };

    var CASES = [
        { id: "start",  icon: "\uD83D\uDE2D", label: "태우자마자 울어요",
          note: "카시트 자체가 아직 낯선 겁니다. <b>익숙해지는 게 먼저</b>고, 며칠 걸립니다." },
        { id: "bored",  icon: "\uD83D\uDE29", label: "5분쯤 뒤부터 울어요",
          note: "지루하거나 불편한 쪽입니다. <b>시야\u00b7소리\u00b7옷</b> 순서로 하나씩 바꿔보세요." },
        { id: "time",   icon: "\uD83D\uDD5B", label: "탈 때마다는 아니에요",
          note: "카시트가 아니라 <b>시간대</b> 문제일 수 있습니다. 배고프거나 졸린 때가 아닌지 보세요." },
        { id: "sudden", icon: "\u2049\uFE0F", label: "잘 타다가 갑자기 그래요",
          note: "<b>뭔가 바뀐 겁니다.</b> 몸이 자랐거나, 옷이 두꺼워졌거나, 뭐가 배기거나." }
    ];

    function caseOf(id) {
        for (var i = 0; i < CASES.length; i++) if (CASES[i].id === id) return CASES[i];
        return null;
    }

    window.pickCryCase = function (id) {
        var o = st();
        o.c = (o.c === id) ? "" : id;
        o.step = 0;
        save(o); paint();
        var el = document.getElementById("cry-answer");
        if (el) setTimeout(function () {
            try { el.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (e) {}
        }, 120);
    };
    window.markCryWay = function (ok) {
        var o = st();
        if (!o.c) return;
        var list = WAYS[o.c] || [];
        o.log = o.log || {};
        o.log[o.c + ":" + (o.step || 0)] = { at: today(), ok: !!ok };
        if (!ok && (o.step || 0) < list.length - 1) o.step = (o.step || 0) + 1;
        o.lastAt = today();
        save(o); paint();
    };
    window.resetCry = function () {
        var o = st();
        o.c = ""; o.step = 0; o.log = {}; o.lastAt = "";
        save(o); paint();
    };

    function cryHTML() {
        var o = st();
        var c = caseOf(o.c);
        var plus = isPlus();

        var out = '<div class="matrix-panel" style="margin-bottom:20px;">' +
            '<div class="matrix-header">\uD83D\uDE2D 카시트만 타면 울어요</div>';

        /* 병원 신호를 먼저. 우는 게 방법 문제가 아닐 수도 있다. */
        out += '<div style="background:#FFF2F2; border:1px solid #FCA5A5; border-radius:14px; ' +
            'padding:15px 16px; margin:-16px 0 14px; font-size:12.5px; font-weight:600; ' +
            'color:#4E5968; line-height:1.8; word-break:keep-all;">' +
            '<b style="color:' + RED + ';">\u26A0\uFE0F 먼저 봐주세요.</b> ' +
            '차에서만이 아니라 <b>평소에도 눕히면 심하게 울거나</b>, ' +
            '<b>토를 자주 하거나</b>, 우는 소리가 평소와 다르면 방법의 문제가 아닙니다. ' +
            '<b>소아과에서 먼저 보세요.</b></div>';

        if (!c) {
            out += '<div style="font-size:13px; font-weight:600; color:' + GRAY + '; ' +
                'line-height:1.75; margin-bottom:14px; word-break:keep-all;">' +
                '<b>언제 우는지에 따라 해볼 게 다릅니다.</b> ' +
                '한꺼번에 다 하시면 뭐가 통했는지 모르니까, 골라주시면 <b>하나씩</b> 드릴게요.</div>' +
                '<div style="display:grid; grid-template-columns:1fr 1fr; gap:9px;">' +
                CASES.map(function (x) {
                    return '<div onclick="window.pickCryCase(\'' + x.id + '\')" ' +
                        'style="padding:15px 10px; border-radius:14px; cursor:pointer; text-align:center; ' +
                        'background: #F9FAFB; color:#4E5968; border:1px solid #E5E8EB; ' +
                        'font-size:12.5px; font-weight:800; line-height:1.45; word-break:keep-all;">' +
                        '<div style="font-size:20px; margin-bottom:6px;">' + x.icon + '</div>' +
                        esc(x.label) + '</div>';
                }).join("") + '</div>';
            return out + '</div>';
        }

        var list = WAYS[c.id] || [];
        var step = Math.min(o.step || 0, list.length - 1);
        var w = list[step];
        var done = (o.lastAt === today());
        var log = o.log || {};
        var win = null;
        for (var i = 0; i < list.length; i++) {
            if (log[c.id + ":" + i] && log[c.id + ":" + i].ok) win = { i: i, w: list[i] };
        }

        out += '<div id="cry-answer">' +
            '<div style="display:flex; justify-content:space-between; align-items:center; gap:10px; ' +
                'margin-bottom:10px;">' +
                '<div style="font-size:13.5px; font-weight:900; color:' + DARK + ';">' +
                    c.icon + ' ' + esc(c.label) + '</div>' +
                '<div onclick="window.resetCry()" style="flex-shrink:0; font-size:12px; ' +
                    'font-weight:800; color:' + BLUE + '; cursor:pointer;">다시 고르기</div>' +
            '</div>' +
            '<div style="background:#E8F3FF; border:1px solid #C9E2FF; border-radius:13px; ' +
                'padding:14px 15px; margin-bottom:14px; font-size:12.5px; font-weight:600; ' +
                'color:#1B64DA; line-height:1.75; word-break:keep-all;">' + c.note + '</div>';

        if (win) {
            out += '<div style="background:#EAF7F1; border:1px solid #A7DFC8; border-radius:14px; ' +
                'padding:16px;">' +
                '<div style="font-size:14px; font-weight:900; color:#1F6F52;">' +
                    '\u2705 ' + esc(win.w.t) + ' \u2014 이게 통했어요</div>' +
                '<div style="margin-top:6px; font-size:12.5px; font-weight:600; color:#4E5968; ' +
                    'line-height:1.75; word-break:keep-all;">' +
                    '며칠은 같은 방법으로 이어가세요. 한 번 됐다고 바로 자리잡진 않아요.</div>' +
            '</div>';
        } else if (plus) {
            out += '<div style="font-size:11.5px; font-weight:900; color:' + BLUE + '; ' +
                'letter-spacing:0.4px; margin-bottom:7px;">오늘 해볼 것 하나</div>' +
                '<div style="background: #FFFFFF; border:1.5px solid #CBE0FF; border-radius:16px; ' +
                    'padding:17px; box-shadow:0 3px 14px rgba(49,130,246,0.06);">' +
                    '<div style="display:flex; align-items:center; gap:8px;">' +
                        '<span style="flex-shrink:0; width:21px; height:21px; border-radius:7px; ' +
                            'background:' + DARK + '; color:#FFFFFF; font-size:11px; font-weight:900; ' +
                            'display:inline-flex; align-items:center; justify-content:center;">' +
                            (step + 1) + '</span>' +
                        '<span style="font-size:15px; font-weight:900; color:#191F28;">' +
                            esc(w.t) + '</span>' +
                    '</div>' +
                    '<div style="margin-top:9px; font-size:13px; font-weight:600; color:#4E5968; ' +
                        'line-height:1.8; word-break:keep-all;">' + w.d + '</div>' +
                    (done
                        ? '<div style="margin-top:14px; text-align:center; padding:13px; ' +
                          'background: #F9FAFB; color:' + GRAY + '; border-radius:12px; ' +
                          'font-size:12.5px; font-weight:800;">오늘 몫은 하셨어요. 내일 또 뵐게요</div>'
                        : '<div style="display:flex; gap:8px; margin-top:15px;">' +
                          '<div onclick="window.markCryWay(true)" style="flex:1; text-align:center; ' +
                              'padding:13px; background:' + DARK + '; color:#FFFFFF; border-radius:12px; ' +
                              'font-size:13.5px; font-weight:800; cursor:pointer;">덜 울었어요!</div>' +
                          '<div onclick="window.markCryWay(false)" style="flex:1; text-align:center; ' +
                              'padding:13px; background: #FFFFFF; color:#4E5968; border:1px solid #D1D5DB; ' +
                              'border-radius:12px; font-size:13.5px; font-weight:800; cursor:pointer;">' +
                              '그대로예요</div></div>') +
                '</div>';

            var tried = [];
            for (var k = 0; k < list.length; k++) if (log[c.id + ":" + k]) tried.push(list[k].t);
            if (tried.length > 1) {
                out += '<div style="margin-top:13px; font-size:11.5px; font-weight:700; color:' + GRAY + '; ' +
                    'line-height:1.7; word-break:keep-all;">해보신 것 \u00b7 ' + esc(tried.join(" \u00b7 ")) + '</div>';
            }
        } else {
            out += '<div style="background: #FFFFFF; border:1.5px solid #CBE0FF; border-radius:16px; ' +
                'padding:17px;">' +
                '<div style="font-size:15px; font-weight:900; color:#191F28;">1. ' + esc(list[0].t) + '</div>' +
                '<div style="margin-top:9px; font-size:13px; font-weight:600; color:#4E5968; ' +
                    'line-height:1.8; word-break:keep-all;">' + list[0].d + '</div>' +
            '</div>' +
            '<div style="margin-top:13px; background:#FFF9E6; border:1px solid #F5E1A4; ' +
                'border-radius:14px; padding:16px;">' +
                '<div style="font-size:13px; font-weight:900; color:' + GOLD + ';">' +
                    '나머지 ' + (list.length - 1) + '가지는 PLUS에서 하루에 하나씩</div>' +
                '<div style="margin-top:5px; font-size:12px; font-weight:600; color:' + GOLD + '; ' +
                    'line-height:1.75; word-break:keep-all;">' +
                    '뭐가 통했고 뭐가 아니었는지 적어두면 <b>안 된 건 다시 안 권합니다.</b></div>' +
            '</div>';
        }

        return out + '</div></div>';
    }

    /* ==========================================================
       2. 하네스 탈출 — 두 살 넘으면 갑자기 시작된다
       ---------------------------------------------------------- */

    function escapeHTML() {
        var m = monthsOld();
        if (m !== null && m < 14) return "";        // 아직 못 푸는 나이면 안 띄운다

        return '<div class="matrix-panel" style="margin-bottom:20px;">' +
            '<div class="matrix-header">\uD83D\uDD13 하네스를 스스로 풀 때</div>' +

            '<div style="background:#FFF2F2; border:1px solid #FCA5A5; border-radius:14px; ' +
                'padding:15px 16px; margin:-16px 0 14px; font-size:12.5px; font-weight:600; ' +
                'color:#4E5968; line-height:1.8; word-break:keep-all;">' +
                '<b style="color:' + RED + ';">달리는 중에 풀렸다면 갓길이라도 세우세요.</b> ' +
                '운전하면서 뒤로 손을 뻗어 채우는 게 <b>더 위험합니다.</b> ' +
                '한 번 세우는 게 제일 빠른 길이에요.</div>' +

            '<div style="font-size:12.5px; font-weight:600; color:#4E5968; line-height:1.9; ' +
                'word-break:keep-all;">' +
                '<b>\u2460 먼저 헐거운지 보세요.</b><br>' +
                '팔이 빠지는 건 대개 <b>끈이 느슨해서</b>입니다. ' +
                '쇄골에서 하네스가 손가락에 집히면 헐거운 거예요.<br><br>' +

                '<b>\u2461 가슴 클립 위치를 보세요.</b><br>' +
                '배 쪽으로 내려와 있으면 어깨끈이 벗겨집니다. ' +
                '<b>겨드랑이 높이</b>가 맞습니다.<br><br>' +

                '<b>\u2462 매번 같은 말로 짧게.</b><br>' +
                '\"안전벨트는 도착할 때까지\" 같은 <b>한 문장을 정해서</b> 똑같이 말하세요. ' +
                '길게 설명하거나 화내면 <b>관심을 끄는 놀이</b>가 됩니다.<br><br>' +

                '<b>\u2463 풀면 차가 선다는 걸 알려주세요.</b><br>' +
                '풀 때마다 <b>안전한 곳에 차를 세우고</b> 다시 채운 뒤 출발하세요. ' +
                '몇 번 반복하면 \"풀면 재미없다\" 가 됩니다. 며칠 걸립니다.' +
            '</div>' +

            '<div style="margin-top:14px; background:#FFF9E6; border:1px solid #F5E1A4; ' +
                'border-radius:13px; padding:14px 15px; font-size:12px; font-weight:600; ' +
                'color:' + GOLD + '; line-height:1.8; word-break:keep-all;">' +
                '\uD83D\uDED1 시중에 <b>버클을 못 풀게 막는 잠금 장치</b>가 팔립니다. ' +
                '<b>권하지 않습니다.</b> 사고가 났을 때 아이를 빨리 꺼내야 하는데 그게 막습니다. ' +
                '그리고 제조사가 허가하지 않은 부품을 달면 <b>안전 인증이 깨집니다.</b></div>' +
        '</div>';
    }

    /* ==========================================================
       3. 장거리 · 귀성길
       ---------------------------------------------------------- */

    function longDriveHTML() {
        var m = monthsOld();
        var young = (m !== null && m < 4);

        return '<div class="matrix-panel" style="margin-bottom:20px;">' +
            '<div class="matrix-header">\uD83D\uDEE3\uFE0F 장거리 \u00b7 귀성길에 지킬 것</div>' +

            '<div style="background:' + (young ? "#FFF2F2" : "#FFF9E6") + '; ' +
                'border:1px solid ' + (young ? "#FCA5A5" : "#F5E1A4") + '; border-radius:14px; ' +
                'padding:15px 16px; margin:-16px 0 14px; font-size:12.5px; font-weight:600; ' +
                'color:#4E5968; line-height:1.8; word-break:keep-all;">' +
                '<b style="color:' + (young ? RED : GOLD) + ';">\u23F1\uFE0F 두 시간마다 한 번은 세우세요.</b> ' +
                '카시트는 <b>몸이 반쯤 접힌 자세</b>라 오래 있으면 호흡이 얕아질 수 있습니다. ' +
                '휴게소에서 <b>안아서 눕혀 펴주는</b> 시간이 필요해요.' +
                (young
                    ? '<br><br><b>' + esc(nm("는")) + ' 아직 목을 잘 못 가눕니다.</b> ' +
                      '어린 아기일수록 더 자주 쉬어야 하고, ' +
                      '가능하면 <b>어른 한 명이 뒷자리에 같이</b> 타는 게 낫습니다.'
                    : '') +
            '</div>' +

            '<div style="font-size:12.5px; font-weight:600; color:#4E5968; line-height:1.9; ' +
                'word-break:keep-all;">' +
                '<b>\uD83D\uDE97 출발 전</b><br>' +
                '\u00b7 겉옷 벗기고 태운 뒤 <b>담요를 위에</b> 덮기<br>' +
                '\u00b7 기저귀 새것으로 갈고 출발<br>' +
                '\u00b7 카시트 안에 <b>부스러기나 장난감 조각</b>이 없는지 손으로 훑기<br><br>' +

                '<b>\uD83D\uDEE0\uFE0F 차 안에서</b><br>' +
                '\u00b7 딱딱한 건 손에 쥐여주지 않기 \u2014 급정거하면 흉기가 됩니다<br>' +
                '\u00b7 <b>운전 중에는 먹이지 않기</b> \u2014 뒤보기면 백미러로도 안 보입니다<br>' +
                '\u00b7 조용해지면 자는 건지 <b>한 번씩 확인하기</b><br><br>' +

                '<b>\uD83C\uDD98 도착해서</b><br>' +
                '\u00b7 <b>차에 아이만 두고 내리지 않기.</b> 잠깐도 안 됩니다<br>' +
                '\u00b7 카시트에 그대로 재우지 않기 \u2014 잘 때는 평평한 곳에 눕혀주세요' +
            '</div>' +
        '</div>';
    }

    /* ==========================================================
       5. 이번 주행 계획 — 여기만 PLUS
       ----------------------------------------------------------
       안전 수칙은 위 카드에 무료로 다 있다.
       여기서 파는 건 '내 여정에 맞춘 쉬는 시각' 이라는 계산이다.

       \u26a0\ufe0f 쉬는 간격을 우리가 의학적으로 정하지 않는다.
          '두 시간마다' 는 널리 쓰이는 일반 지침이고, 그걸 그대로 나눠줄 뿐이다.
          어린 아기일수록 짧게 잡되, 그것도 '더 자주 쉬시라' 는 보수적인 방향이다.
       ---------------------------------------------------------- */

    /* \u26a0\ufe0f 개월수별 간격표를 우리가 만들지 않는다.
          찾아봐도 '몇 개월엔 몇 분' 이라는 근거를 못 찾았다.
          없는 숫자를 표로 만들면 정확한 척하는 것이고, 그게 제일 나쁘다.

          우리가 아는 건 둘뿐이다.
            \u00b7 '두 시간마다' 가 널리 쓰이는 기준이다
            \u00b7 어린 아기일수록 위험이 크다 (연구에서 1개월 미만이 가장 많았다)

          그래서 기본값만 두고, 어린 아기면 '더 짧게 잡으시라' 고 권하기만 한다.
          실제 간격은 부모가 정한다. */
    var GAP_CHOICES = [60, 90, 120, 150];
    function gapMinutes() {
        var d = (st().drive) || {};
        var g = Number(d.gap);
        return (GAP_CHOICES.indexOf(g) > -1) ? g : 120;
    }
    function youngWarn() {
        var m = monthsOld();
        return (m !== null && m < 4);
    }

    /* ---------- 마지막 수유 ----------
       \u26a0\ufe0f 이건 지어낸 값이 아니라 이 앱이 실제로 아는 사실이다.
          { type:'feed', subType:'모유'|'분유'|'이유식', amount, timestamp } */
    function lastFeed() {
        var recs = [];
        try { recs = JSON.parse(localStorage.getItem("tosil_tracker_records")) || []; }
        catch (e) { return null; }
        var f = recs.filter(function (r) {
            return r && r.type === "feed" && r.subType !== "이유식" && Number(r.timestamp) > 0;
        });
        if (!f.length) return null;
        f.sort(function (a, b) { return Number(b.timestamp) - Number(a.timestamp); });
        return f[0];
    }

    /* 수유 간격 — 최근 기록으로 이 아이의 실제 텀을 잰다.
       평균 텀을 지어내지 않고, 있는 기록만 본다. */
    function feedGapMin() {
        var recs = [];
        try { recs = JSON.parse(localStorage.getItem("tosil_tracker_records")) || []; }
        catch (e) { return null; }
        var f = recs.filter(function (r) {
            return r && r.type === "feed" && r.subType !== "이유식" && Number(r.timestamp) > 0;
        }).sort(function (a, b) { return Number(b.timestamp) - Number(a.timestamp); }).slice(0, 6);
        if (f.length < 3) return null;
        var gaps = [];
        for (var i = 0; i < f.length - 1; i++) {
            var g = (Number(f[i].timestamp) - Number(f[i + 1].timestamp)) / 60000;
            if (g > 40 && g < 480) gaps.push(g);          // 말이 되는 것만
        }
        if (gaps.length < 2) return null;
        gaps.sort(function (a, b) { return a - b; });
        return Math.round(gaps[Math.floor(gaps.length / 2)]);   // 가운데값
    }

    window.setDrive = function (f, v) {
        var o = st();
        o.drive = o.drive || {};
        if (f === "h" || f === "m") {
            var n = parseInt(v, 10);
            o.drive[f] = (n >= 0 && n < 24) ? n : "";
        } else o.drive[f] = String(v || "").trim();
        save(o); paint();
    };

    function pad2(n) { return String(n).padStart(2, "0"); }

    /* 쉬는 데 걸리는 시간. 이것도 더해야 '실제로 몇 시간' 이 나온다.
       부모는 네비 시간만 보고 나갔다가 매번 늦는다. */
    var SHORT_MIN = 5, LONG_MIN = 20;

    function drivePlan() {
        var d = (st().drive) || {};
        var drive = (Number(d.h) || 0) * 60 + (Number(d.m) || 0);
        if (drive < 30) return null;

        var start = String(d.at || "09:00").split(":");
        var sh = Number(start[0]) || 9, sm = Number(start[1]) || 0;
        var gap = gapMinutes();
        var half = Math.round(gap / 2);

        var lf = lastFeed();
        var fg = feedGapMin();
        /* 다음 수유 예정 시각 (분 단위, 출발 기준). 기록이 없으면 안 쓴다. */
        var nextFeedAt = null;
        if (lf && fg) {
            var startMs = new Date(); startMs.setHours(sh, sm, 0, 0);
            nextFeedAt = Math.round((Number(lf.timestamp) + fg * 60000 - startMs.getTime()) / 60000);
        }

        /* 짧게 · 길게를 번갈아 놓는다.
           길게는 gap 마다, 짧게는 그 중간에. */
        var stops = [], driven = 0, elapsed = 0, guard = 0, n = 0;
        while (driven < drive && guard++ < 24) {
            var step = Math.min(half, drive - driven);
            driven += step; elapsed += step;
            if (driven >= drive) break;
            n++;
            var long = (n % 2 === 0);                       // 두 번에 한 번은 길게
            var rest = long ? LONG_MIN : SHORT_MIN;
            stops.push({ at: elapsed, driven: driven, long: long, rest: rest });
            elapsed += rest;
        }

        /* \u26a0\ufe0f stops 를 다 만든 뒤에 붙인다.
              그리고 수유 한 번당 '가장 가까운 쉼 하나' 에만 붙인다.
              범위로 잡으면 연달아 두 곳에 붙어서 두 번 먹이라는 말이 된다.
              긴 여정이면 수유가 두 번 이상 필요하니 텀만큼 반복한다. */
        if (nextFeedAt !== null && fg > 0 && stops.length) {
            var ft = nextFeedAt, g2 = 0;
            while (ft < elapsed && g2++ < 8) {
                if (ft > 0) {
                    var best = null, bestD = 1e9;
                    for (var si = 0; si < stops.length; si++) {
                        var x = stops[si];
                        var raw = Math.abs(x.at - ft);
                        if (raw > gap) continue;
                        var score = raw - (x.long ? 10 : 0);   // 길게 쉬는 곳을 조금 더 좋아한다
                        if (score < bestD) { bestD = score; best = x; }
                    }
                    if (best) best.feed = true;
                }
                ft += fg;
            }
        }

        return {
            drive: drive, total: elapsed, sh: sh, sm: sm, gap: gap,
            stops: stops, nextFeedAt: nextFeedAt, lastFeed: lf, feedGap: fg
        };
    }

    function clock(sh, sm, addMin) {
        var tot = sh * 60 + sm + addMin;
        return pad2(Math.floor(tot / 60) % 24) + ":" + pad2(tot % 60);
    }

    window.shareDrivePlan = function () {
        var p = drivePlan();
        if (!p) return;
        var d = (st().drive) || {};
        var lines = ["\uD83D\uDE97 " + nm("의") + " 주행 계획" +
                     (d.to ? " \u00b7 " + d.to : ""), ""];
        lines.push("출발  " + clock(p.sh, p.sm, 0) + "   타기 전 수유 · 기저귀 · 겉옷 벗기기");
        p.stops.forEach(function (x) {
            lines.push((x.long ? "길게  " : "짧게  ") + clock(p.sh, p.sm, x.at) +
                       "   " + x.rest + "분 · " +
                       (x.long ? "안아서 눕혀 펴주기" : "다리 펴주기 · 땀 확인") +
                       (x.feed ? " · 수유" : ""));
        });
        lines.push("도착  " + clock(p.sh, p.sm, p.total) + "   바로 카시트에서 꺼내기");
        lines.push("");
        lines.push("\u23F0 실제로는 " + Math.floor(p.total / 60) + "시간 " +
                   (p.total % 60 ? (p.total % 60) + "분" : "") + " 걸립니다.");
        lines.push("(운전 " + Math.floor(p.drive / 60) + "시간 " +
                   (p.drive % 60 ? (p.drive % 60) + "분" : "") +
                   " + 쉬는 시간 " + (p.total - p.drive) + "분)");
        lines.push("");
        lines.push("카시트는 몸이 반쯤 접힌 자세라 오래 있으면 힘듭니다.");
        lines.push("막히면 시각보다 '얼마마다' 를 지켜주세요.");

        var text = lines.join("\n");
        if (typeof Kakao !== "undefined" && Kakao.isInitialized && Kakao.isInitialized()) {
            try {
                Kakao.Share.sendDefault({ objectType: "text", text: text,
                    link: { mobileWebUrl: location.href, webUrl: location.href } });
                return;
            } catch (e) {}
        }
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text)
                .then(function () { alert("주행 계획을 복사했어요! 운전하실 분께 보내주세요 \uD83E\uDD0D"); })
                .catch(function () { prompt("아래 내용을 복사해 주세요", text); });
        } else prompt("아래 내용을 복사해 주세요", text);
    };

    function driveHTML() {
        var plus = isPlus();
        var d = (st().drive) || {};
        var gap = gapMinutes();
        var m = monthsOld();

        var out = '<div class="matrix-panel" style="margin-bottom:20px;">' +
            '<div class="matrix-header">\uD83D\uDDD3\uFE0F 이번 주행 계획</div>';

        if (!plus) {
            return out +
                '<div style="background:#FFF9E6; border:1px solid #F5E1A4; border-radius:14px; ' +
                    'padding:17px 16px; margin-top:-16px;">' +
                    '<div style="font-size:13.5px; font-weight:900; color:' + GOLD + ';">' +
                        '몇 시에 쉴지 계산해드려요</div>' +
                    '<div style="margin-top:6px; font-size:12.5px; font-weight:600; color:' + GOLD + '; ' +
                        'line-height:1.8; word-break:keep-all;">' +
                        '출발 시각과 걸리는 시간만 넣으면 <b>쉬는 시각을 시간표로</b> 만들어드립니다. ' +
                        esc(nm("의")) + ' 개월수에 맞춰 간격도 달라져요.<br>' +
                        '<b>카톡으로 보내면 운전하시는 분이 봅니다</b> \u2014 뒷자리에서 말로 하는 것보다 확실해요.<br><br>' +
                        '<span style="font-weight:800;">지켜야 할 안전 수칙은 위 카드에 전부 열려 있습니다.</span></div>' +
                '</div></div>';
        }

        out += '<div style="font-size:12.5px; font-weight:600; color:' + GRAY + '; ' +
            'margin:-16px 0 12px; line-height:1.75; word-break:keep-all;">' +
            '카시트는 몸이 반쯤 접힌 자세라 오래 있으면 힘듭니다. ' +
            '<b>두 시간마다</b>가 널리 쓰이는 기준이에요.</div>';

        if (youngWarn()) {
            out += '<div style="background:#FFF2F2; border:1px solid #FCA5A5; border-radius:13px; ' +
                'padding:13px 15px; margin-bottom:12px; font-size:12.5px; font-weight:600; ' +
                'color:#4E5968; line-height:1.75; word-break:keep-all;">' +
                '\u26A0\uFE0F ' + esc(nm("는")) + ' 아직 ' + m + '개월이에요. ' +
                '<b>더 짧게 잡으시길 권합니다.</b> 어린 아기일수록 이 자세가 힘들고, ' +
                '가능하면 <b>어른 한 명이 뒷자리에 같이</b> 타주세요.</div>';
        }

        /* \u26a0\ufe0f 간격은 부모가 정한다. 우리가 개월수별로 정해주지 않는다. */
        out += '<div style="font-size:12px; font-weight:900; color:' + DARK + '; margin-bottom:7px;">' +
            '\u23F1\uFE0F 얼마마다 쉴까요</div>' +
            '<div style="display:flex; gap:6px; margin-bottom:14px; flex-wrap:wrap;">' +
            GAP_CHOICES.map(function (g) {
                var on = (g === gap);
                return '<div onclick="window.setDrive(\'gap\', \'' + g + '\')" ' +
                    'style="flex:1; min-width:64px; text-align:center; padding:11px 6px; ' +
                    'border-radius:11px; cursor:pointer; font-size:12.5px; font-weight:800; ' +
                    (on ? 'background:' + DARK + '; color:#FFFFFF; border:1px solid ' + DARK + ';'
                        : 'background: #F9FAFB; color:#4E5968; border:1px solid #E5E8EB;') + '">' +
                    (g >= 60 ? (g % 60 ? (g / 60).toFixed(1) : g / 60) + '시간' : g + '분') + '</div>';
            }).join("") + '</div>';

        out += '<div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:12px;">' +
            '<input value="' + esc(d.to || "") + '" placeholder="어디로 (예: 부산 할머니 댁)" ' +
                'onchange="window.setDrive(\'to\', this.value)" ' +
                'style="flex:1; min-width:150px; padding:12px; border-radius:11px; border:1px solid #D1D5DB; ' +
                'background: #FFFFFF; font-size:13px; font-weight:700; color:#191F28; box-sizing:border-box;">' +
        '</div>' +
        '<div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">' +
            '<span style="font-size:12.5px; font-weight:800; color:#4E5968;">출발</span>' +
            '<input type="time" value="' + esc(d.at || "09:00") + '" ' +
                'onchange="window.setDrive(\'at\', this.value)" ' +
                'style="padding:11px; border-radius:11px; border:1px solid #D1D5DB; background: #FFFFFF; ' +
                'font-size:13px; font-weight:800; color:#191F28; box-sizing:border-box;">' +
            '<span style="font-size:12.5px; font-weight:800; color:#4E5968; margin-left:6px;">걸리는 시간</span>' +
            '<input type="number" value="' + (d.h === 0 || d.h ? d.h : "") + '" placeholder="4" ' +
                'onchange="window.setDrive(\'h\', this.value)" ' +
                'style="width:62px; padding:11px; border-radius:11px; border:1px solid #D1D5DB; ' +
                'background: #FFFFFF; font-size:13px; font-weight:800; text-align:center; box-sizing:border-box;">' +
            '<span style="font-size:12.5px; font-weight:800; color:#4E5968;">시간</span>' +
            '<input type="number" value="' + (d.m === 0 || d.m ? d.m : "") + '" placeholder="30" ' +
                'onchange="window.setDrive(\'m\', this.value)" ' +
                'style="width:62px; padding:11px; border-radius:11px; border:1px solid #D1D5DB; ' +
                'background: #FFFFFF; font-size:13px; font-weight:800; text-align:center; box-sizing:border-box;">' +
            '<span style="font-size:12.5px; font-weight:800; color:#4E5968;">분</span>' +
        '</div>';

        var p = drivePlan();
        if (!p) {
            out += '<div style="margin-top:14px; font-size:12.5px; font-weight:700; color:' + GRAY + '; ' +
                'line-height:1.7;">걸리는 시간을 넣으면 시간표를 만들어드릴게요.</div>';
            return out + '</div>';
        }

        var rowOf = function (mins, big, title, sub, color) {
            return '<div style="display:flex; align-items:flex-start; gap:11px; padding:13px 0; ' +
                'border-bottom:1px solid #F2F4F6;">' +
                '<div style="flex-shrink:0; width:46px; font-size:13.5px; font-weight:900; ' +
                    'color:' + (color || DARK) + '; line-height:1.5;">' + clock(p.sh, p.sm, mins) + '</div>' +
                '<div style="flex:1; min-width:0;">' +
                    '<div style="font-size:12.5px; font-weight:' + (big ? "900" : "800") + '; ' +
                        'color:' + (color || "#4E5968") + ';">' + title + '</div>' +
                    (sub ? '<div style="margin-top:3px; font-size:11.5px; font-weight:700; ' +
                           'color:' + GRAY + '; line-height:1.6; word-break:keep-all;">' + sub + '</div>' : '') +
                '</div>' +
            '</div>';
        };

        out += '<div style="margin-top:16px; background: #F9FAFB; border:1px solid #E5E8EB; ' +
            'border-radius:14px; padding:6px 16px;">' +
            rowOf(0, true, (d.to ? esc(d.to) + ' 로 출발' : '출발'),
                  '\uD83C\uDF7C 타기 직전에 수유하고 기저귀 새것으로. 겉옷은 벗기고 담요를 위에.') +
            p.stops.map(function (x, i) {
                /* 이 쉼이 다음 수유 때와 겹치나 \u2014 기록이 있을 때만 말한다 */
                var feedHere = !!x.feed;
                var title = x.long
                    ? '\uD83D\uDECC 길게 ' + x.rest + '분 \u00b7 안아서 눕혀 펴주기'
                    : '\uD83D\uDEB6 짧게 ' + x.rest + '분 \u00b7 다리 펴주기';
                var sub = x.long
                    ? '카시트에서 꺼내 <b>몸을 쭉 펴게</b> 해주세요. 기저귀도 같이.'
                    : '등에 손을 넣어 <b>땀이 찼는지</b> 보세요. 더우면 한 겹 벗기시고요.';
                if (feedHere) {
                    title += '  \u00b7  \uD83C\uDF7C 수유';
                    sub = '<b style="color:' + BLUE + ';">다음 수유 때가 이쯤이에요.</b> ' + sub;
                }
                return rowOf(x.at, x.long, title, sub, x.long ? BLUE : null);
            }).join("") +
            '<div style="display:flex; align-items:flex-start; gap:11px; padding:13px 0;">' +
                '<div style="flex-shrink:0; width:46px; font-size:13.5px; font-weight:900; color:' + DARK + ';">' +
                    clock(p.sh, p.sm, p.total) + '</div>' +
                '<div style="flex:1; min-width:0;">' +
                    '<div style="font-size:12.5px; font-weight:900; color:#4E5968;">도착</div>' +
                    '<div style="margin-top:3px; font-size:11.5px; font-weight:700; color:' + GRAY + '; ' +
                        'line-height:1.6;">\uD83D\uDE97 도착하면 <b>바로 카시트에서 꺼내주세요.</b> ' +
                        '잘 때는 평평한 곳에 눕혀야 합니다.</div>' +
                '</div>' +
            '</div>' +
        '</div>';

        /* \u2b50 실제 소요 \u2014 부모가 네비 시간만 보고 나갔다 매번 늦는 지점 */
        var extra = p.total - p.drive;
        out += '<div style="margin-top:13px; background:#FFF9E6; border:1px solid #F5E1A4; ' +
            'border-radius:13px; padding:14px 15px;">' +
            '<div style="font-size:13.5px; font-weight:900; color:' + GOLD + ';">' +
                '\u23F0 실제로는 ' + Math.floor(p.total / 60) + '시간 ' +
                (p.total % 60 ? (p.total % 60) + '분' : '') + ' 걸립니다</div>' +
            '<div style="margin-top:5px; font-size:12px; font-weight:600; color:' + GOLD + '; ' +
                'line-height:1.75; word-break:keep-all;">' +
                '운전 ' + Math.floor(p.drive / 60) + '시간 ' + (p.drive % 60 ? (p.drive % 60) + '분' : '') +
                ' + 쉬는 시간 ' + extra + '분이에요.<br>' +
                '<b>네비가 알려준 시간으로 잡고 나가면 늦습니다.</b></div>' +
        '</div>';

        if (p.lastFeed && p.feedGap) {
            var ago = Math.round((Date.now() - Number(p.lastFeed.timestamp)) / 60000);
            out += '<div style="margin-top:11px; font-size:11.5px; font-weight:700; color:' + GRAY + '; ' +
                'line-height:1.7; word-break:keep-all;">' +
                '\uD83C\uDF7C 마지막 수유는 ' +
                (ago < 120 ? ago + '분 전' : Math.round(ago / 60) + '시간 전') +
                '이고, 요즘 <b>' + (p.feedGap >= 60 ? Math.round(p.feedGap / 60 * 10) / 10 + '시간' : p.feedGap + '분') +
                '마다</b> 드시네요. 그걸로 수유 때를 표시했어요.</div>';
        } else {
            out += '<div style="margin-top:11px; font-size:11.5px; font-weight:700; color:' + GRAY + '; ' +
                'line-height:1.7; word-break:keep-all;">' +
                '\uD83C\uDF7C 수유를 세 번 이상 기록해두시면 <b>어느 쉼이 수유 때인지</b>까지 표시해드려요.</div>';
        }

        out += '<div style="margin-top:12px; font-size:12px; font-weight:600; color:' + GRAY + '; ' +
            'line-height:1.7; word-break:keep-all;">' +
            '막히면 계획은 밀립니다. <b>시각보다 \'얼마마다\' 를 지키세요.</b> ' +
            '그리고 아기가 힘들어하면 <b>계획보다 먼저</b> 세우시고요. ' +
            '이 시간표는 <b>세어드리는 것</b>일 뿐이에요.</div>' +

            '<div onclick="window.shareDrivePlan()" style="margin-top:13px; text-align:center; ' +
                'padding:15px; background:#FEE500; color:#191919; border-radius:13px; ' +
                'font-size:13.5px; font-weight:900; cursor:pointer;">' +
                '\uD83D\uDCAC 운전하실 분께 카톡으로 보내기</div>';

        return out + '</div>';
    }

    /* ---------- 자리 ---------- */

    function paint() {
        var host = document.getElementById(HOST);
        if (!host) return;
        host.innerHTML = cryHTML() + driveHTML() + escapeHTML() + longDriveHTML();
        try { if (typeof window.refreshPlusMark === "function") window.refreshPlusMark(); } catch (e) {}
    }
    window.refreshCarseatCry = paint;

    function mount() {
        if (document.getElementById(HOST)) return;
        var anchor = document.getElementById("carseat-own") ||
                     document.getElementById("carseat-guide");
        if (!anchor || !anchor.parentNode) return;
        var box = document.createElement("div");
        box.id = HOST;
        anchor.parentNode.insertBefore(box, anchor.nextSibling);
        paint();
    }

    function boot() { setTimeout(mount, 460); setTimeout(mount, 1300); }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    window.carseatCryDebug = function () {
        var o = st(), c = caseOf(o.c);
        console.log("PLUS:", isPlus(), "\u00b7 개월수:", monthsOld());
        console.log("고른 상황:", c ? c.label : "없음");
        if (c) {
            var list = WAYS[c.id] || [];
            console.log("지금 단계:", (o.step || 0) + 1, "/", list.length);
            list.forEach(function (w, i) {
                var r = (o.log || {})[c.id + ":" + i];
                console.log("   " + (i + 1) + ". " + w.t +
                    (r ? "   \u2192 " + (r.ok ? "\u2705 덜 울었어요" : "\u274C 그대로") + " (" + r.at + ")" : ""));
            });
        }
        var p = drivePlan();
        console.log("쉬는 간격:", gapMinutes() + "분", monthsOld() !== null && monthsOld() < 4 ? "(4개월 미만이라 짧게)" : "");
        if (p) {
            console.log("주행 계획: 쉼 " + p.stops.length + "번 (길게 " +
                p.stops.filter(function (x) { return x.long; }).length + ") \u00b7 운전 " +
                Math.floor(p.drive/60) + "시간 " + (p.drive%60) + "분 \u2192 실제 " +
                Math.floor(p.total/60) + "시간 " + (p.total%60) + "분");
            p.stops.forEach(function (x) {
                console.log("   " + clock(p.sh, p.sm, x.at) + "  " +
                    (x.long ? "길게 " : "짧게 ") + x.rest + "분" +
                    (x.feed ? "  \uD83C\uDF7C 수유" : ""));
            });
        } else console.log("주행 계획: 시간 안 넣음");
        console.log("마지막 수유:", (function(){var l=lastFeed();return l?new Date(Number(l.timestamp)).toLocaleString():"기록 없음";})());
        console.log("수유 텀(가운데값):", feedGapMin() ? feedGapMin() + "분" : "기록 3번 이상 필요");
        console.log("하네스 탈출 카드:", (monthsOld() === null || monthsOld() >= 14) ? "뜸" : "안 뜸 (14개월 미만)");
        console.log("붙었나:", !!document.getElementById(HOST));
    };
})();