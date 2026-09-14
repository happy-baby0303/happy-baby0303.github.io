/* ============================================================
   배냇함 — 사고가 났다면 (carseatcrash.js)

   카시트 탭을 통째로 읽어봤다. 빠진 게 둘 있었다.

     ① 사고 후 교체
        '중고로 사기 전에' 카드에 "사고 이력이 있는 카시트는 쓰면 안 됩니다"
        라고 써 있다. 남의 사고 얘기다.
        정작 '내 차가 사고 났을 때 내 카시트를 바꿔야 하나' 는 없다.
        부모가 진짜 검색하는 건 이쪽이다.

     ② 리콜
        카시트 리콜은 실제로 일어난다. 그런데 어디서 확인하는지
        앱에서 한 번도 말해주지 않는다.

   ⚠️ 기준을 우리가 만들지 않는다.
      아래 다섯 가지는 미국 도로교통안전국(NHTSA)이 정한
      '경미한 사고' 조건 그대로다. 다섯 개를 전부 만족할 때만
      계속 써도 된다고 본다. 하나라도 아니면 교체다.
      우리가 항목을 빼거나 느슨하게 고치지 않는다.

   ⚠️ "괜찮습니다" 라고 단정하지 않는다.
      겉으로 멀쩡해도 안쪽 구조가 상했을 수 있다.
      다섯 개를 다 만족해도 마지막엔 제조사에 물어보라고 한다.

   ⚠️ 보험 이야기는 '될 수도 있다' 까지만 한다.
      약관과 사고 유형에 따라 다르다. 된다고 하면 그건 거짓말이 된다.

   carseat/index.html 에서 carseatguide.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var RED   = "#D32F2F";
    var GREEN = "#2E7D57";
    var GRAY  = "#8B95A1";
    var INK   = "#191F28";

    var KEY = "tosil_crash_check";

    /* ⭐ NHTSA 경미한 사고 기준. 다섯 개를 전부 만족해야 한다. */
    var CHECKS = [
        { id: "drive",  q: "사고 난 자리에서 차를 몰고 나올 수 있었나요?",
                        no: "견인했다면 가벼운 사고가 아닙니다" },
        { id: "door",   q: "카시트가 있던 쪽 문이 멀쩡한가요?",
                        no: "그쪽 문이 찌그러졌다면 충격이 카시트까지 갑니다" },
        { id: "injury", q: "차에 탄 사람 모두 다친 데가 없나요?",
                        no: "누군가 다쳤다면 그만한 충격이 있었다는 뜻입니다" },
        { id: "airbag", q: "에어백이 안 터졌나요?",
                        no: "에어백이 터졌다면 교체 대상입니다" },
        { id: "damage", q: "카시트에 눈에 보이는 흠이 없나요?",
                        no: "금·눌림·틀어짐이 보이면 바로 교체하세요" }
    ];

    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    function state() {
        try {
            var v = JSON.parse(localStorage.getItem(KEY));
            return (v && typeof v === "object") ? v : {};
        } catch (e) { return {}; }
    }

    function save(o) {
        try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {}
    }

    window.crashAnswer = function (id, yes) {
        var o = state();
        o[id] = !!yes;
        save(o);
        paint();
    };

    window.crashReset = function () {
        try { localStorage.removeItem(KEY); } catch (e) {}
        paint();
    };

    /* ---------- 판정 ---------- */

    function verdict() {
        var o = state();
        var answered = 0, allYes = true;
        for (var i = 0; i < CHECKS.length; i++) {
            var v = o[CHECKS[i].id];
            if (v === undefined) continue;
            answered++;
            if (v === false) allYes = false;
        }
        if (answered === 0) return null;
        if (!allYes) return { ok: false };
        if (answered < CHECKS.length) return { partial: true, left: CHECKS.length - answered };
        return { ok: true };
    }

    /* ---------- 화면 ---------- */

    function rowHTML(c) {
        var o = state();
        var v = o[c.id];

        function btn(label, yes) {
            var on = (v === yes);
            var bg = on ? (yes ? GREEN : RED) : "#F2F4F6";
            var fg = on ? "#FFFFFF" : "#4E5968";
            return '<div onclick="window.crashAnswer(\'' + c.id + '\',' + (yes ? 'true' : 'false') + ')" ' +
                'style="flex:1; text-align:center; padding:11px 0; border-radius:11px; cursor:pointer; ' +
                'font-size:13.5px; font-weight:800; background:' + bg + '; color:' + fg + '; ' +
                'transition:0.15s;">' + label + '</div>';
        }

        return '<div style="padding:14px 0; border-bottom:1px solid #F2F4F6;">' +
            '<div style="font-size:14px; font-weight:800; color:' + INK + '; ' +
                'line-height:1.5; word-break:keep-all; margin-bottom:10px;">' + esc(c.q) + '</div>' +
            '<div style="display:flex; gap:8px;">' + btn("예", true) + btn("아니오", false) + '</div>' +
            (v === false
                ? '<div style="margin-top:9px; font-size:12.5px; font-weight:700; color:' + RED + '; ' +
                      'line-height:1.6; word-break:keep-all;">' + esc(c.no) + '</div>'
                : '') +
        '</div>';
    }

    function resultHTML() {
        var r = verdict();
        if (!r) return "";

        if (r.partial) {
            return '<div style="margin-top:16px; padding:16px; background:#F9FAFB; ' +
                'border:1px solid #E5E8EB; border-radius:14px; text-align:center; ' +
                'font-size:13px; font-weight:700; color:' + GRAY + ';">' +
                r.left + '개만 더 답해주세요</div>';
        }

        if (!r.ok) {
            return '<div style="margin-top:16px; padding:18px; background:#FFF2F2; ' +
                'border:1px solid #FCA5A5; border-radius:14px;">' +
                '<div style="font-size:15px; font-weight:900; color:' + RED + '; ' +
                    'margin-bottom:8px;">새 카시트로 바꾸세요</div>' +
                '<div style="font-size:13px; font-weight:600; color:' + RED + '; ' +
                    'line-height:1.75; word-break:keep-all;">' +
                    '겉이 멀쩡해도 안쪽 뼈대가 상했을 수 있습니다. ' +
                    '한 번 충격을 받은 카시트는 다음 사고에서 제 힘을 못 냅니다.' +
                '</div>' +
                /* ⚠️ '받을 수 있다' 고 단정하지 않는다. 약관마다 다르다. */
                '<div style="margin-top:12px; padding-top:12px; border-top:1px solid #FCA5A5; ' +
                    'font-size:12.5px; font-weight:700; color:#B45309; line-height:1.7; ' +
                    'word-break:keep-all;">' +
                    '💡 보험으로 교체비를 받을 수 있는 경우가 있습니다. ' +
                    '사고 접수할 때 <b>카시트도 같이 신고</b>했는지 확인해 보세요. ' +
                    '(약관과 사고 유형에 따라 다릅니다)' +
                '</div>' +
            '</div>';
        }

        /* 다섯 개를 다 만족해도 '괜찮다' 고 단정하지 않는다 */
        return '<div style="margin-top:16px; padding:18px; background:#F1F8F4; ' +
            'border:1px solid #BFE0CC; border-radius:14px;">' +
            '<div style="font-size:15px; font-weight:900; color:' + GREEN + '; ' +
                'margin-bottom:8px;">계속 써도 되는 쪽에 가깝습니다</div>' +
            '<div style="font-size:13px; font-weight:600; color:#3C6442; ' +
                'line-height:1.75; word-break:keep-all;">' +
                '다섯 가지를 모두 만족했습니다. 다만 이건 <b>겉으로 본 판단</b>이에요.<br>' +
                '마음에 걸리면 제조사 고객센터에 모델명과 사고 상황을 말하고 물어보세요. ' +
                '대부분 무료로 봐줍니다.' +
            '</div>' +
        '</div>';
    }

    function cardHTML() {
        var any = Object.keys(state()).length > 0;

        return '<div class="matrix-panel" id="crash-card" style="margin-bottom:20px;">' +
            '<div class="matrix-header">🚨 사고가 났다면</div>' +
            '<div style="font-size:13px; font-weight:600; color:' + GRAY + '; ' +
                'margin:-16px 0 16px; line-height:1.6; word-break:keep-all;">' +
                '가벼운 접촉사고였어도 카시트는 바꿔야 할 수 있습니다.<br>' +
                '다섯 가지만 답해주세요' +
            '</div>' +

            CHECKS.map(rowHTML).join("") +
            resultHTML() +

            (any
                ? '<div onclick="window.crashReset()" style="margin-top:14px; text-align:center; ' +
                      'font-size:12.5px; font-weight:700; color:' + GRAY + '; cursor:pointer; ' +
                      'padding:10px;">다시 답하기</div>'
                : '') +

            /* ⚠️ 기준의 출처를 밝힌다. 우리가 정한 게 아니다. */
            '<div style="margin-top:14px; padding-top:14px; border-top:1px dashed #E5E8EB; ' +
                'font-size:11.5px; font-weight:600; color:' + GRAY + '; line-height:1.7; ' +
                'word-break:keep-all;">' +
                '미국 도로교통안전국(NHTSA)의 \u2018경미한 사고\u2019 기준을 그대로 옮겼습니다. ' +
                '제조사가 더 엄격한 기준을 두는 경우가 있으니, 설명서에 적힌 안내가 우선입니다.' +
            '</div>' +
        '</div>';
    }

    /* ---------- 리콜 ---------- */

    function recallHTML() {
        return '<div class="matrix-panel" id="recall-card" style="margin-bottom:20px;">' +
            '<div class="matrix-header">📢 리콜된 제품인지 확인하기</div>' +
            '<div style="font-size:13px; font-weight:600; color:' + GRAY + '; ' +
                'margin:-16px 0 16px; line-height:1.7; word-break:keep-all;">' +
                '카시트도 리콜이 나옵니다. 사고 나서 아는 것보다 지금 한 번 보는 게 낫습니다.<br>' +
                '모델명으로 찾으면 바로 나와요.' +
            '</div>' +
            '<a href="https://www.safetykorea.kr" target="_blank" rel="noopener" ' +
                'class="buy-btn official" style="display:flex; justify-content:center; ' +
                'align-items:center; width:100%; margin-top:0; background:#F9FAFB; color:' + INK + '; ' +
                'border:1px solid #D1D5DB; font-size:14.5px; padding:16px 0; border-radius:14px; ' +
                'font-weight:900; text-decoration:none;">' +
                '제품안전정보센터에서 찾아보기 〉</a>' +
            '<div style="margin-top:10px; font-size:11.5px; font-weight:600; color:' + GRAY + '; ' +
                'text-align:center; line-height:1.6;">' +
                '국가기술표준원이 운영하는 곳입니다 · 배냇함과 관련 없습니다' +
            '</div>' +
        '</div>';
    }

    /* ---------- 자리 잡기 ----------
       '쓰면서 챙길 것' 탭에 들어간다. 이미 산 사람의 얘기다. -------- */

    function mount() {
        /* carseattabs.js 가 만드는 '쓰면서 챙길 것' 칸이다.
           탭이 아직 안 만들어졌으면 다음 차례에 다시 시도한다. */
        var host = document.getElementById("view-carseat-use");
        if (!host) return;
        if (document.getElementById("crash-card")) { repaint(); return; }

        var box = document.createElement("div");
        box.innerHTML = cardHTML() + recallHTML();
        while (box.firstChild) host.appendChild(box.firstChild);
    }

    function repaint() {
        var el = document.getElementById("crash-card");
        if (!el) return;
        var box = document.createElement("div");
        box.innerHTML = cardHTML();
        el.parentNode.replaceChild(box.firstChild, el);
    }

    function paint() { repaint(); }

    window.refreshCrashCard = mount;

    function boot() {
        setTimeout(mount, 800);
        setTimeout(mount, 2500);
        setInterval(mount, 4000);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    /* 점검용 */
    window.crashDebug = function () {
        console.log("답한 것:", state());
        console.log("판정:", verdict());
    };
})();