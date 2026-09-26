/* ============================================================
   배냇함 — 해열제 안전장치 (feverguard.js)

   ⚠️ 이 파일은 아기 목숨과 직결된다. 규칙 둘만 지킨다.
      "확실하지 않으면 크게 경고한다." 어떤 경우에도 기존보다 느슨해지지 않는다.
      "기록은 막지 않는다." 이미 먹인 약을 못 적으면 마지막 투약 시각이 틀리게 남고,
      그러면 몇 시간 뒤 앱이 초록불을 켠다. 경고 → 확인 → 사실대로 기록 (script.js 가 묻는다).

   기존 checkPillLock 이 하던 일
     · 직전 1회와의 간격만 확인 (같은 약 4시간 / 다른 약 2시간)

   여기서 더하는 것 넷
     1. 24시간 총 횟수 상한        — 없으면 하루 6회도 통과했다
     2. 약별로 자기 간격을 따로 계산 — 이부프로펜은 6시간이 맞다
     3. 월령 — 이부프로펜 6개월 미만 금기 · 아세트아미노펜 4개월 미만은 처방 있을 때만
        (script.js 의 PILL_RULES 와 같은 기준. 여기만 빠져 있어서 두 달 아기에게 '줄 수 있어요' 가 떴다)
     4. 다음 투약 가능 시각을 항상 화면에 — 저장 눌러야 알던 걸 미리 보여준다
     5. 생후 3개월 미만 — 38℃ 이상이면 해열제보다 진료가 먼저라는 안내

   근거
     · 아세트아미노펜 10~15mg/kg, 4~6시간, 24시간 5회 이내, 하루 75mg/kg 이내
     · 이부프로펜 5~10mg/kg, 6~8시간, 6개월 미만 금기
     · 교차투여 시에도 각 약의 자기 간격은 그대로 지킨다

   ❗ 용량(mL) 계산은 script.js 에서 걷어냈다. 제품마다 농도가 달라 앱이 답을 낼 수 없다.
      그래서 '32mg/mL 기준' 같은 농도 표시도 이제 뜻이 없다 — 화면에서 뺐다.
      용량은 약 상자의 몸무게별 표를 본다. 이 파일은 '지금 줘도 되나' 만 답한다.

   ❗ 기준 숫자는 출시 전 약사 · 소아과 확인을 받는다.

   index.html 에서 script.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    /* ==========================================================
       ⭐ 기준값. 바꾸려면 반드시 약사·소아과 확인 후에.
       ========================================================== */
    var RULE = {
        red: {                       // 아세트아미노펜 (타이레놀·챔프·세토펜)
            name: "아세트아미노펜",
            gapMin: 240,             // 같은 약 최소 4시간
            maxPerDay: 5,            // 24시간 5회 이내
            minMonths: 4,            // 4개월 미만은 의사 처방이 있을 때만 (script.js PILL_RULES 와 같게)
            head: "진료가 먼저예요",
            ageWhy: "의사가 처방했을 때만 주세요.\n처방 없이 열이 나면 먼저 소아과로 가세요."
        },
        blue: {                      // 이부프로펜 (부루펜) · 덱시부프로펜 (챔프 파랑 · 맥시부펜)
            name: "이부프로펜",
            gapMin: 360,             // 같은 약 최소 6시간  ← 기존 4시간에서 강화
            maxPerDay: 4,            // 24시간 4회 이내
            minMonths: 6,            // 6개월 미만 금기
            head: "먹이면 안 돼요",
            ageWhy: "6개월 미만은 금기예요.\n의사 처방 없이는 절대 먹이지 마세요."
        },
        crossMin: 120                // 다른 약으로 바꿔 줄 때 최소 2시간
    };

    var DAY = 86400000;

    /* ---------- 기록 읽기 ---------- */

    function records() {
        try { return JSON.parse(localStorage.getItem("tosil_fever_records")) || []; }
        catch (e) { return []; }
    }

    // 그 약의 마지막 투약 시각
    function lastOf(type) {
        var best = 0;
        records().forEach(function (r) {
            if (!r || r.type !== type) return;
            var t = Number(r.timestamp) || 0;
            if (t > best) best = t;
        });
        return best;
    }

    // 종류 상관없이 마지막 투약
    function lastAny() {
        var best = 0;
        records().forEach(function (r) {
            var t = Number(r && r.timestamp) || 0;
            if (t > best) best = t;
        });
        return best;
    }

    // 최근 24시간 안에 그 약을 몇 번 줬나
    function countIn24h(type) {
        var floor = Date.now() - DAY;
        return records().filter(function (r) {
            return r && r.type === type && (Number(r.timestamp) || 0) >= floor;
        }).length;
    }

    /* ---------- 아기 월령 ----------
       모르면 "모른다"고 답한다. 넘겨짚지 않는다. -------- */

    function ageMonths() {
        var s = localStorage.getItem("tosil_startDate");
        if (!s) return null;
        var b = new Date(s + "T00:00:00").getTime();
        if (isNaN(b)) return null;
        return (Date.now() - b) / DAY / 30.44;
    }

    function hhmm(ts) {
        var d = new Date(ts);
        return String(d.getHours()).padStart(2, "0") + ":" +
               String(d.getMinutes()).padStart(2, "0");
    }

    function leftText(ms) {
        var m = Math.ceil(ms / 60000);
        if (m <= 0) return "";
        var h = Math.floor(m / 60), mm = m % 60;
        return h ? (h + "시간" + (mm ? " " + mm + "분" : "")) : (mm + "분");   // "3시간  남음" 겹공백 없이
    }

    /* ==========================================================
       판단 — 지금 이 약을 줘도 되는가
       막을 이유가 하나라도 있으면 막는다.
       ========================================================== */

    window.feverCheck = function (type) {
        var rule = RULE[type];
        if (!rule) return { ok: false, why: "약 종류를 확인할 수 없어요" };

        var now = Date.now();

        // 1) 월령 — 모르면 모른다고 하고 크게 경고한다 (넘겨짚지 않는다)
        if (rule.minMonths) {
            var m = ageMonths();
            if (m === null) {
                return {
                    ok: false, hard: true, short: "생일 미등록",
                    why: "생일이 없어 월령을 확인할 수 없어요.\n설정에서 아기 생일을 먼저 등록해주세요."
                };
            }
            if (m < rule.minMonths) {
                return {
                    ok: false, hard: true, head: rule.head,
                    short: rule.minMonths + "개월 미만",
                    why: "생후 " + rule.minMonths + "개월 미만이에요 (지금 " + Math.floor(m) + "개월).\n" + rule.ageWhy
                };
            }
        }

        // 2) 24시간 총 횟수
        var n = countIn24h(type);
        if (n >= rule.maxPerDay) {
            return {
                ok: false, hard: true, short: "하루 " + rule.maxPerDay + "회 채움",
                why: "최근 24시간 안에 " + rule.name + "을 " + n + "번 줬어요.\n" +
                     "하루 " + rule.maxPerDay + "회가 상한입니다.\n" +
                     "더 필요하면 소아과에 연락해주세요."
            };
        }

        // 3) 같은 약 간격
        var lastSame = lastOf(type);
        if (lastSame) {
            var openAt = lastSame + rule.gapMin * 60000;
            if (now < openAt) {
                return {
                    ok: false,
                    why: rule.name + "은 " + (rule.gapMin / 60) + "시간 간격이 필요해요.\n" +
                         hhmm(openAt) + "부터 (" + leftText(openAt - now) + " 남음)",
                    openAt: openAt
                };
            }
        }

        // 4) 다른 약으로 바꿔 줄 때 최소 간격
        var any = lastAny();
        if (any && any !== lastSame) {
            var crossAt = any + RULE.crossMin * 60000;
            if (now < crossAt) {
                return {
                    ok: false,
                    why: "다른 약을 준 지 얼마 안 됐어요.\n" +
                         hhmm(crossAt) + "부터 (" + leftText(crossAt - now) + " 남음)",
                    openAt: crossAt
                };
            }
        }

        return { ok: true, why: "", left: rule.maxPerDay - n };
    };

/* ==========================================================
       기존 잠금에 얹기 — 더 엄격해지기만 한다
       원래 막던 건 그대로 막고, 우리가 찾은 이유를 더한다.
       ========================================================== */
    (function hookLock() {
        var orig = window.checkPillLock;
        if (typeof orig !== "function" || orig.__guarded) return;

        var wrapped = function (type) {
            // 🚨 [핵심 패치] 월령 제한 등 '절대 불가(hard)' 사유를 제일 먼저 검사해서 차단!
            var v = window.feverCheck(type);
            if (!v.ok && v.hard) return { locked: true, reason: v.why };

            // 원래 판단이 막으면 막는다 (기존 시간 타이머 로직)
            var base;
            try { base = orig.apply(this, arguments); } catch (e) { base = { locked: false, reason: "" }; }
            if (base && base.locked) return base;

            // 원래는 통과했어도 우리가 막을 이유(기타 사유)가 있으면 막는다
            if (!v.ok) return { locked: true, reason: v.why };

            return { locked: false, reason: "" };
        };
        wrapped.__guarded = true;
        window.checkPillLock = wrapped;
    })();

    /* ==========================================================
       화면 — 저장을 눌러야 알던 걸 미리 보여준다
       새벽 두 시에 부모가 묻는 건 "몇 ml" 가 아니라
       "아까 줬는데 지금 또 줘도 되나" 이다.
       ========================================================== */

    var CARD_ID = "fever-guard-card";

    function row(type) {
        var rule = RULE[type];
        var v = window.feverCheck(type);
        var n = countIn24h(type);
        var color = v.ok ? "#00B37A" : "#F04452";
        var head = v.ok ? "지금 줄 수 있어요" : (v.head || "지금은 안 돼요");

        /* ⚠️ 막힌 이유를 첫 줄을 뗀 나머지만 보여줬다.
              간격 이유는 첫 줄이 제목이라 괜찮았지만, 월령 · 생일 이유는 첫 줄이 '왜' 였다.
              "생후 6개월 미만(현재 3개월)" 이 잘리고 "전문의 상담 전에는…" 만 남았다.
              큰 이유(hard)는 통째로 보여준다. */
        var sub = v.ok ? ("24시간 안에 " + n + "번 줬어요 (상한 " + rule.maxPerDay + "회)")
                       : (v.hard ? v.why : (v.why.split("\n").slice(1).join("\n") || v.why));

        return '<div style="flex:1; min-width:0; background:var(--bg-card); border:1px solid var(--border); ' +
                'border-left:3px solid ' + (type === "red" ? "#F04452" : "#7F77DD") + '; ' +
                'border-radius:12px; padding:12px 13px;">' +
            '<div style="font-size:11.5px; font-weight:900; color:var(--text-m); margin-bottom:7px;">' +
                (type === "red" ? "빨간약" : "파란약") + ' · ' + rule.name + '</div>' +
            '<div style="font-size:13px; font-weight:900; color:' + color + '; line-height:1.4; word-break:keep-all;">' +
                head + '</div>' +
            '<div style="font-size:11px; font-weight:700; color:var(--text-sub); margin-top:5px; line-height:1.5; white-space:pre-line; word-break:keep-all;">' +
                sub +
            '</div>' +
        '</div>';
    }

    /* 생후 3개월 미만의 열은 해열제로 버틸 일이 아니다. 진료가 먼저다.
       (막지는 않는다 — 의사가 처방했을 수 있다. 다만 제일 먼저 보이게 둔다) */
    function youngBanner() {
        var m = ageMonths();
        if (m === null || m >= 3) return "";
        return '<div style="background:rgba(211,46,46,0.08); border:1px solid rgba(211,46,46,0.28); border-radius:12px; ' +
                'padding:12px 14px; margin:0 0 10px; font-size:12.5px; font-weight:800; color:#C62828; line-height:1.6; word-break:keep-all;">' +
                '생후 3개월 미만이에요. 38.0℃ 이상이면 해열제보다 진료가 먼저예요.<br>' +
                '<span style="font-weight:700;">바로 소아과나 응급실로 가세요.</span></div>';
    }

function cardHTML() {
        return youngBanner() +
            '<div style="font-size:12px; font-weight:900; color:var(--text-sub); margin:0 2px 8px;">지금 줘도 되나요</div>' +
            '<div style="display:flex; gap:8px;">' + row("red") + row("blue") + '</div>' +
            '<div style="font-size:12.5px; font-weight:600; color:var(--text-sub); line-height:1.6; ' +
                'margin-top:9px; padding:14px 16px; background:var(--bg-sub); border-radius:12px; word-break:keep-all;">' +
                /* ⚠️ '교차 복용 팁' 이라고 쓰고 '최소 2시간은 필수' 라고 단정했다.
                      식약처는 교차 복용을 '의사의 지시에 따라 2~3시간 간격' 으로 안내한다.
                      우리가 권하는 방법처럼 말하면 안 된다. 순서를 바꾸고 출처를 밝힌다. */
                '<span style="font-weight:900; color:var(--text-m); font-size:13px;">💡 열이 안 떨어질 때</span><br>' +
                '• <b>같은 성분(색깔)의 약</b>은 최소 4~6시간 간격을 두어야 합니다.<br>' +
                '• <b>성분이 다른 약을 번갈아 주는 것(교차 복용)은 의사·약사와 상의한 뒤에</b> 하세요. ' +
                '꼭 써야 한다면 <b>2~3시간</b>을 띄웁니다.<br>' +
                '• <b>덱시부프로펜(맥시부펜·파랑 챔프)은 이부프로펜과 같은 계열</b>이라 서로 번갈아 주면 안 됩니다.<br>' +
                '<div style="margin-top:8px; color:var(--danger); font-weight:800;">※ 투약 전, 약 상자의 몸무게별 권장 용량을 꼭 확인하세요</div>' +
                '<div style="margin-top:6px; font-size:11px; font-weight:700; opacity:0.75;">식품의약품안전처 어린이 해열제 안내(2025.12.)를 따랐습니다</div>' +
            '</div>';
    }

    function mount() {
        var anchor = document.getElementById("fever-result") ||
                     document.getElementById("v-temp") ||
                     document.getElementById("btn-pill-red");
        if (!anchor || !anchor.parentNode) return;

        var host = anchor.parentNode;
        var old = document.getElementById(CARD_ID);

        var el = old || document.createElement("div");
        el.id = CARD_ID;
        el.style.cssText = "margin:14px 0;";
        el.innerHTML = cardHTML();

        if (!old) host.insertBefore(el, anchor);
    }

    window.refreshFeverGuard = mount;

    /* ---------- 기록이 바뀌면 바로 갱신 ---------- */

    (function hookRecord() {
        ["addFeverRecord", "clearFeverRecord"].forEach(function (name) {
            var orig = window[name];
            if (typeof orig !== "function" || orig.__guarded) return;
            var wrapped = async function () {
                var out = await orig.apply(this, arguments);
                setTimeout(mount, 60);
                return out;
            };
            wrapped.__guarded = true;
            window[name] = wrapped;
        });
    })();

    function boot() {
        setTimeout(mount, 1200);
        setInterval(function () {
            if (document.getElementById(CARD_ID)) mount();   // 남은 시간이 줄어드는 걸 보여준다
        }, 60000);

        document.addEventListener("visibilitychange", function () {
            if (!document.hidden) setTimeout(mount, 200);
        });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    /* ---------- 점검용 ---------- */
    window.feverDebug = function () {
        ["red", "blue"].forEach(function (t) {
            var v = window.feverCheck(t);
            console.log("[" + RULE[t].name + "]");
            console.log("  줄 수 있나:", v.ok ? "예" : "아니오");
            if (!v.ok) console.log("  이유:", v.why.replace(/\n/g, " / "));
            console.log("  24시간 횟수:", countIn24h(t) + " / " + RULE[t].maxPerDay);
            var l = lastOf(t);
            console.log("  마지막 투약:", l ? new Date(l).toLocaleString() : "없음");
        });
        var m = ageMonths();
        console.log("아기 월령:", m === null ? "모름 (생년월일 없음)" : Math.floor(m) + "개월");
        console.log("잠금 함수 감쌈:", !!(window.checkPillLock && window.checkPillLock.__guarded));
    };
})();