/* ============================================================
   배냇함 — 다음엔 뭘 먹여볼까 (nextfood.js)

   알레르기 탭에는 검색·달력·도감이 다 있다.
   그런데 부모가 매번 검색하는 건 이거다.

       "이제 뭘 줘야 하지?"

   앱은 이미 답을 낼 재료를 갖고 있다.
       · 아기가 몇 개월인지
       · 지금까지 뭘 통과했는지
       · 어떤 재료에서 탈이 났는지
       · 마지막 테스트가 며칠째인지

   그래서 다음 재료 하나를 골라주고, 왜 그건지 말해준다.
   그리고 사흘 규칙을 여기서 지켜준다 —
   아직 사흘이 안 지났으면 다음 걸 권하지 않는다.

   ⚠️ 무료다. 알레르기는 안전이라 잠그지 않는다.
      PLUS 는 '일주일치를 대신 짜주는 수고' 뿐이다.

   index.html 에서 app.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var BLUE = "#3182F6", GRAY = "#8B95A1", DARK = "#191F28", GREEN = "#1F9D6B";
    var CAL = "tosil_food_calendar";
    var ID = "next-food";

    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    function babyName() { return localStorage.getItem("tosil_babyName") || "우리 아기"; }

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

    /* ---------- 순서 ----------
       흔히 권하는 차례를 따른다.
       쌀 → 채소 → 소고기(철분) → 닭 → 과일 → 흰살생선 → 노른자 → 두부
       위험한 것(계란·생선·두부)은 뒤에 두되 너무 늦추지는 않는다.
       ⚠️ 이건 일반적인 안내다. 가족력이 있으면 소아과 상의가 먼저다.
       -------- */

    var ORDER = [
        { n: "쌀",       m: 4,  why: "제일 순해서 첫 이유식은 쌀미음으로 시작합니다" },
        { n: "애호박",    m: 4,  why: "부드럽고 소화가 잘돼 첫 채소로 많이 씁니다" },
        { n: "감자",     m: 4,  why: "단맛이 순해서 잘 받아들입니다" },
        { n: "브로콜리",  m: 5,  why: "꽃송이만 데쳐 곱게 갈면 초기에도 됩니다" },
        { n: "청경채",    m: 5,  why: "질긴 줄기를 빼고 잎만 쓰면 부드럽습니다" },
        { n: "소고기",    m: 5,  why: "생후 6개월쯤부터 철분이 부족해집니다. 늦지 않게 시작하세요" },
        { n: "고구마",    m: 5,  why: "변비가 있으면 특히 도움이 됩니다" },
        { n: "양배추",    m: 5,  why: "심을 빼고 잎만 쓰세요" },
        { n: "단호박",    m: 5,  why: "달아서 거부가 적습니다" },
        { n: "당근",     m: 5,  why: "푹 익혀 곱게 갈아주세요" },
        { n: "닭안심",    m: 6,  why: "소고기를 통과했다면 다음 단백질로 좋습니다" },
        { n: "시금치",    m: 6,  why: "잎만 살짝 데쳐서 쓰세요" },
        { n: "사과",     m: 6,  why: "과일은 채소를 몇 가지 통과한 뒤가 좋습니다" },
        { n: "배",       m: 6,  why: "기침이나 변비가 있을 때 잘 씁니다" },
        { n: "오트밀",    m: 6,  why: "밀 교차오염 표시가 있는 제품이 많아 조심해서 시작하세요" },
        { n: "대구살",    m: 7,  why: "흰살생선부터 시작합니다. 가시를 꼼꼼히 발라주세요" },
        { n: "두부",     m: 7,  why: "대두라 반응이 나올 수 있으니 아침에 소량으로" },
        { n: "달걀 노른자", m: 7, why: "흰자보다 노른자가 먼저입니다. 완전히 익혀서 조금씩" },
        { n: "바나나",    m: 7,  why: "달아서 잘 먹지만 변이 단단해질 수 있어요" },
        { n: "가자미",    m: 8,  why: "흰살생선 두 번째로 무난합니다" },
        { n: "콩나물",    m: 9,  why: "대두라 두부를 통과한 뒤가 좋습니다" },
        { n: "토마토",    m: 9,  why: "입 주변이 빨개지는 건 흔합니다. 먹인 뒤 닦아주세요" }
    ];

    function records() {
        var db = {};
        try { db = JSON.parse(localStorage.getItem(CAL)) || {}; } catch (e) {}
        var out = [];
        Object.keys(db).forEach(function (day) {
            (db[day] || []).forEach(function (r) {
                if (r && r.type === "test" && r.ingredient)
                    out.push({ day: day, name: String(r.ingredient).trim(), status: r.status || "pass" });
            });
        });
        out.sort(function (a, b) { return a.day < b.day ? 1 : -1; });
        return out;
    }

    function daysSince(day) {
        var p = String(day).split("-").map(Number);
        if (p.length !== 3) return null;
        var d = new Date(p[0], p[1] - 1, p[2]); d.setHours(0, 0, 0, 0);
        var t = new Date(); t.setHours(0, 0, 0, 0);
        return Math.floor((t - d) / 86400000);
    }

    function pick() {
        var m = monthsOld();
        var recs = records();
        var pass = {}, fail = {};
        recs.forEach(function (r) {
            if (r.status === "fail") fail[r.name] = 1; else pass[r.name] = 1;
        });

        var known = function (n) {
            var keys = Object.keys(pass).concat(Object.keys(fail));
            for (var i = 0; i < keys.length; i++) {
                if (keys[i].indexOf(n) > -1 || n.indexOf(keys[i]) > -1) return true;
            }
            return false;
        };

        var pool = ORDER.filter(function (x) {
            if (known(x.n)) return false;
            if (m !== null && m + 1 < x.m) return false;      // 아직 이른 것
            return true;
        });

        return { next: pool[0] || null, left: pool.length, pass: Object.keys(pass), last: recs[0] || null };
    }

    /* ---------- 화면 ---------- */

    window.startNextFood = function (name) {
        if (typeof window.openTestSheet === "function") {
            window.openTestSheet();
            setTimeout(function () {
                var inp = document.getElementById("test-ing-input");
                if (inp) { inp.value = name; inp.focus(); }
            }, 120);
        } else {
            alert("아래 달력에서 '재료 테스트' 를 눌러 " + name + " 을(를) 기록해 주세요.");
        }
    };

    function html() {
        var r = pick();
        var m = monthsOld();
        var name = esc(babyName());

        // 사흘이 안 지났으면 다음을 권하지 않는다
        if (r.last && r.last.status !== "fail") {
            var d = daysSince(r.last.day);
            if (d !== null && d < 3) {
                return '<div id="' + ID + '" style="background:#FFF9E6; border:1px solid #FDE68A; ' +
                    'border-radius:16px; padding:16px; margin-bottom:14px;">' +
                    '<div style="font-size:14px; font-weight:900; color:#8A6D00; margin-bottom:5px;">' +
                        '⏳ ' + esc(r.last.name) + ' 시작한 지 ' + (d + 1) + '일째</div>' +
                    '<div style="font-size:12.5px; font-weight:600; color:#4E5968; line-height:1.7; ' +
                        'word-break:keep-all;"><b>' + (3 - d) + '일 더</b> 지켜본 뒤에 다음 재료를 시작하세요. ' +
                        '지금 새 걸 같이 주면 둘 중 뭐가 문제였는지 알 수 없습니다.</div>' +
                '</div>';
            }
        }

        if (!r.next) {
            return '<div id="' + ID + '" style="background:#EAF7F1; border:1px solid #A7DFC8; ' +
                'border-radius:16px; padding:16px; margin-bottom:14px; font-size:13px; ' +
                'font-weight:700; color:#1F6F52; line-height:1.7;">' +
                '✅ 여기 담아둔 재료는 다 해보셨어요. 이제 아래 <b>재료 테스트</b>로 직접 적어주세요.</div>';
        }

        var x = r.next;
        return '<div id="' + ID + '" style="background:#FFFFFF; border:1px solid #E5E8EB; ' +
            'border-radius:16px; padding:18px 16px; margin-bottom:14px;">' +

            '<div style="font-size:11.5px; font-weight:900; color:' + GRAY + '; ' +
                'letter-spacing:1px; margin-bottom:8px;">다음엔 뭘 먹여볼까요</div>' +

            '<div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">' +
                '<div style="font-size:19px; font-weight:900; color:' + DARK + '; letter-spacing:-0.5px;">' +
                    esc(x.n) + '</div>' +
                (m !== null ? '<span style="font-size:11px; font-weight:800; color:' + GREEN + '; ' +
                    'background:#EAF7F1; border-radius:7px; padding:4px 8px;">' +
                    m + '개월이면 괜찮아요</span>' : '') +
            '</div>' +

            '<div style="font-size:13px; font-weight:600; color:#4E5968; line-height:1.7; ' +
                'word-break:keep-all; margin-bottom:12px;">' + x.why + '<br>' +
                '<span style="color:' + GRAY + '; font-size:12px;">아침에 소량으로 시작해서 <b>사흘</b> 지켜보세요.</span></div>' +

            '<div onclick="window.startNextFood(\'' + esc(x.n).replace(/'/g, "") + '\')" ' +
                'style="text-align:center; padding:14px; background:' + DARK + '; color:#FFFFFF; ' +
                'border-radius:13px; font-size:14px; font-weight:900; cursor:pointer;">' +
                esc(x.n) + ' 오늘 먹여봤어요 기록하기</div>' +

            '<div style="font-size:11.5px; font-weight:700; color:' + GRAY + '; ' +
                'margin-top:10px; text-align:center;">' +
                '통과 ' + r.pass.length + '가지 · 남은 순서 ' + r.left + '가지</div>' +
        '</div>';
    }

    function paint() {
        var old = document.getElementById(ID);
        var box = document.createElement("div");
        box.innerHTML = html();
        if (old) { old.parentNode.replaceChild(box.firstChild, old); return; }

        var host = document.getElementById("tab-allergy");
        if (!host) return;
        var anchor = document.getElementById("ingredient-search");
        while (anchor && anchor.parentNode !== host) anchor = anchor.parentNode;
        if (anchor) host.insertBefore(box.firstChild, anchor);
        else host.insertBefore(box.firstChild, host.firstChild);
    }

    function boot() {
        setTimeout(paint, 500);
        setTimeout(paint, 1600);
        ["saveTestRecord", "deleteFoodRecord", "renderSelectedDateRecords"].forEach(function (n) {
            var f = window[n];
            if (typeof f !== "function" || f.__next) return;
            var w = function () { var o = f.apply(this, arguments); setTimeout(paint, 80); return o; };
            w.__next = true;
            window[n] = w;
        });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    window.nextFoodDebug = function () {
        var r = pick();
        console.log("개월수:", monthsOld());
        console.log("통과한 재료:", r.pass.join(", ") || "없음");
        console.log("마지막 기록:", r.last ? (r.last.name + " " + r.last.day + " " + r.last.status) : "없음");
        console.log("다음 권하는 재료:", r.next ? r.next.n : "없음");
        console.log("남은 순서:", r.left + "가지");
    };
})();