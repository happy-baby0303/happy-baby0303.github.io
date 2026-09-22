/* ============================================================
   배냇함 — 이미 먹여본 재료 등록 (passedfoods.js) v2

   초기 이유식 식단표는 '아직 안 먹여본 재료'부터 짠다.
   그런데 앱을 오늘 깔았는데 아기는 이미 두 달째 이유식 중이면,
   달력이 비어 있어서 앱은 아무것도 모른다.

   그러면 이미 통과한 소고기를 다시 "새 알레르기 테스트" 로 띄운다.
   부모 입장에서는 앱이 헛소리를 하는 거다.

   그래서 식단표를 만들기 전에 한 번 물어본다.
   "지금까지 먹여본 재료를 골라주세요."

   ⚠️ 초기·중기일 때만 식단표 위에 뜬다. 후기·완료기는 이미 다 먹어봤다.
   ⚠️ 등록은 달력(tosil_food_calendar)에 그대로 들어간다.
      앱 안의 다른 곳과 같은 창고를 쓴다. 따로 만들지 않는다.

   ── v2 (문의: "새 재료 날짜를 넣었더니 전에 먹여본 재료까지 바뀌었어요") ──

   실제로 전에 것이 바뀌지는 않았다. 그런데 창이 그렇게 보이게 만들었다.
     · 이미 등록한 재료가 '새로 고른 것' 과 한 칸에 체크된 채로 섞여 있었고
     · 날짜는 한 번만, 글자로 치게 물었고 (prompt)
     · 끝나면 "2가지를 2026-07-01 로 등록했어요" 라고 전부를 센 숫자를 말했다
   그러니 부모는 전에 것까지 7월 1일로 옮겨졌다고 읽을 수밖에 없었다.

   이제는
     · 이미 등록한 재료는 위에 따로, 날짜와 함께 보여준다.
       여기서 적은 것은 하나씩 날짜를 고치거나 뺄 수 있다.
       (달력에서 테스트로 적은 것은 달력 기록이라 여기서 안 건드린다)
     · 새로 고른 것만 '언제쯤 먹여봤는지' 묻는다 — 빠른 칩 + 달력
     · 끝나면 새로 고른 것만 세서, 앱 안의 짧은 안내로 말한다
     · 목록에 없는 재료는 직접 적는다
     · 같은 재료를 사흘 테스트하면 3가지로 세던 것 → 한 가지로

   index.html 에서 app.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var CAL = "tosil_food_calendar";
    var DONE = "tosil_passed_asked";
    var BLUE = "#3182F6", GRAY = "#8B95A1", DARK = "#191F28", GREEN = "#1F9D6B", RED = "#D32F2F";
    var ID = "passed-foods", SHEET = "passed-sheet";
    var DAY = 86400000;

    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    // onclick="..." 안에 넣을 글자 — 따옴표가 든 재료 이름(직접 적은 것)도 안 깨지게
    function q(s) {
        return esc("'" + String(s == null ? "" : s).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'");
    }

    // 받침이 있으면 '을', 없으면 '를'
    function eulReul(w) {
        var c = String(w || "").charCodeAt(String(w || "").length - 1);
        if (!(c >= 0xAC00 && c <= 0xD7A3)) return "을";
        return (c - 0xAC00) % 28 ? "을" : "를";
    }

    /* ---------- 앱 안의 짧은 안내 ----------
       ⚠️ 이 큐레이터는 끝날 때마다 브라우저 기본 창(alert)을 띄웠다.
          확인을 눌러야 넘어가고, 돈 받는 앱이 싸 보인다.
          이 큐레이터의 알림은 전부 화면 아래 짧은 안내로 바꾼다.
          (지울지 묻는 confirm 은 '예/아니오' 가 필요해서 그대로 둔다) */
    window.foodToast = function (msg) {
        var old = document.getElementById("food-toast");
        if (old) old.remove();
        var t = document.createElement("div");
        t.id = "food-toast";
        t.setAttribute("style",
            "position:fixed; left:50%; bottom:calc(100px + env(safe-area-inset-bottom, 0px)); " +
            "transform:translateX(-50%); z-index:100080; width:max-content; max-width:86%; " +
            "background:rgba(25,31,40,0.93); color:#FFFFFF; padding:13px 17px; border-radius:14px; " +
            "font-size:13px; font-weight:700; line-height:1.55; text-align:center; " +
            "word-break:keep-all; white-space:pre-line; box-shadow:0 8px 22px rgba(0,0,0,0.18); " +
            "transition:opacity .25s;");
        t.textContent = String(msg == null ? "" : msg);
        document.body.appendChild(t);
        var ms = Math.min(5200, 2200 + String(msg || "").length * 35);
        setTimeout(function () { t.style.opacity = "0"; }, ms);
        setTimeout(function () { if (t.parentNode) t.remove(); }, ms + 300);
    };
    window.alert = function (msg) { window.foodToast(msg); };

    /* 초기·중기에 흔히 쓰는 재료. 여기 없는 건 직접 적는다. */
    var FOODS = {
        "곡류":   ["쌀", "찹쌀", "오트밀", "감자", "고구마"],
        "고기·단백": ["소고기", "닭안심", "달걀 노른자", "두부", "대구살"],
        "채소":   ["애호박", "브로콜리", "청경채", "양배추", "당근", "단호박",
                  "시금치", "비타민", "콜리플라워", "무", "양파", "비트", "아욱"],
        "과일":   ["사과", "배", "바나나", "복숭아", "토마토"]
    };

    function cal() {
        try { return JSON.parse(localStorage.getItem(CAL)) || {}; } catch (e) { return {}; }
    }
    function saveCal(db) {
        try { localStorage.setItem(CAL, JSON.stringify(db)); } catch (e) {}
    }
    function nm(s) { return String(s == null ? "" : s).trim(); }

    // 통과한 재료 이름 — 한 재료는 한 번만 (사흘 테스트하면 세 번 세던 것)
    function passed() {
        var db = cal(), out = [];
        Object.keys(db).forEach(function (day) {
            (db[day] || []).forEach(function (r) {
                if (!r || r.type !== "test" || r.status !== "pass" || !r.ingredient) return;
                var n = nm(r.ingredient);
                if (n && out.indexOf(n) === -1) out.push(n);
            });
        });
        return out;
    }

    /* 재료마다 가장 이른 통과 날.
       past  — 이 창에서 적은 것 (날짜를 고치거나 뺄 수 있다)
       fromCal — 달력에서 테스트로 적은 기록이 있다 (여기서 안 건드린다) */
    function entries() {
        var db = cal(), map = {};
        Object.keys(db).sort().forEach(function (day) {
            (db[day] || []).forEach(function (r) {
                if (!r || r.type !== "test" || r.status !== "pass" || !r.ingredient) return;
                var n = nm(r.ingredient);
                if (!n) return;
                if (!map[n]) map[n] = { name: n, day: day, past: false, fromCal: false };
                if (r.past) map[n].past = true; else map[n].fromCal = true;
            });
        });
        return Object.keys(map).map(function (k) { return map[k]; })
            .sort(function (a, b) { return a.day < b.day ? -1 : a.day > b.day ? 1 : 0; });
    }

    function stage() {
        var el = document.getElementById("food-age");
        return el ? el.value : "early";
    }

    /* ---------- 날짜 ---------- */

    function keyOf(d) {
        return d.getFullYear() + "-" +
               String(d.getMonth() + 1).padStart(2, "0") + "-" +
               String(d.getDate()).padStart(2, "0");
    }
    function todayKey() { var t = new Date(); t.setHours(0, 0, 0, 0); return keyOf(t); }
    function birthKey() {
        var s = String(localStorage.getItem("tosil_startDate") || "");
        return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
    }

    function pretty(k) {
        var p = String(k).split("-");
        var y = Number(p[0]), thisY = new Date().getFullYear();
        return (y !== thisY ? y + "년 " : "") + Number(p[1]) + "월 " + Number(p[2]) + "일";
    }

    // 이유식은 대개 6개월쯤 시작 — 그 무렵을 기본으로 (아직 안 왔으면 일주일 전)
    function startGuess() {
        var b = birthKey();
        if (b) {
            var p = b.split("-").map(Number);
            var d = new Date(p[0], p[1] - 1, p[2]);
            d.setMonth(d.getMonth() + 6);
            var t = new Date(); t.setHours(0, 0, 0, 0);
            if (d > t) d = new Date(t.getTime() - 7 * DAY);
            return d;
        }
        var t2 = new Date(); t2.setHours(0, 0, 0, 0); t2.setDate(t2.getDate() - 30);
        return t2;
    }

    // 고른 날짜가 말이 되게 — 미래는 오늘로, 태어나기 전은 태어난 날로
    function validDay(k) {
        var m = String(k || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!m) return "";
        var today = todayKey(), b = birthKey();
        if (k > today) return today;
        if (b && k < b) return b;
        return k;
    }

    function quick() {
        var t = new Date(); t.setHours(0, 0, 0, 0);
        var list = [
            { k: keyOf(startGuess()), label: "이유식 시작 무렵" },
            { k: keyOf(new Date(t.getTime() - 30 * DAY)), label: "한 달 전" },
            { k: keyOf(new Date(t.getTime() - 7 * DAY)), label: "일주일 전" },
            { k: keyOf(t), label: "오늘" }
        ];
        var b = birthKey(), seen = {};
        return list.filter(function (x) {
            if (b && x.k < b) return false;
            if (seen[x.k]) return false;
            seen[x.k] = 1;
            return true;
        });
    }

    /* ---------- 창의 상태 ---------- */

    var picked = [];          // 이번에 새로 고른 것만
    var custom = [];          // 직접 적은 재료
    var pickDay = "";         // 새로 고른 것을 먹여본 날
    var askRemove = "";       // 목록에서 뺄지 묻는 중인 재료

    window.togglePassed = function (name) {
        var i = picked.indexOf(name);
        if (i > -1) picked.splice(i, 1); else picked.push(name);
        paintSheet();
    };

    window.passedSetDay = function (k) {
        var v = validDay(k);
        if (v) pickDay = v;
        paintSheet();
    };

    window.passedAddCustom = function () {
        var inp = document.getElementById("passed-custom");
        if (!inp) return;
        var have = passed(), added = 0;
        String(inp.value || "").split(/[,，、\/\n]+/).forEach(function (raw) {
            var n = nm(raw).slice(0, 20);
            if (!n) return;
            if (have.indexOf(n) > -1) { window.foodToast(n + eulReul(n) + " 이미 등록해 두셨어요"); return; }
            if (custom.indexOf(n) === -1) custom.push(n);
            if (picked.indexOf(n) === -1) { picked.push(n); added++; }
        });
        inp.value = "";
        paintSheet();
        if (added) {
            var again = document.getElementById("passed-custom");
            if (again) again.blur();
        }
    };

    window.passedAskRemove = function (name) {
        askRemove = name || "";
        paintSheet();
    };

    /* 이 창에서 적은 기록(past)만 움직인다. 달력에서 테스트로 적은 기록은 건드리지 않는다. */
    function takePast(db, name) {
        var taken = [];
        Object.keys(db).forEach(function (d) {
            var keep = [];
            (db[d] || []).forEach(function (r) {
                if (r && r.type === "test" && r.past && nm(r.ingredient) === name) taken.push(r);
                else keep.push(r);
            });
            if (keep.length) db[d] = keep; else delete db[d];
        });
        return taken;
    }

    window.passedMove = function (name, k) {
        var day = validDay(k);
        if (!day) return;
        var db = cal();
        var taken = takePast(db, name);
        if (!taken.length) return;
        if (!db[day]) db[day] = [];
        db[day].push(taken[0]);               // 한 재료는 한 줄로
        saveCal(db);
        askRemove = "";
        refreshApp();
        paintSheet();
        window.foodToast(name + " — " + pretty(day) + "로 고쳤어요");
    };

    window.passedRemove = function (name) {
        var db = cal();
        var taken = takePast(db, name);
        askRemove = "";
        if (taken.length) {
            saveCal(db);
            refreshApp();
            window.foodToast(name + eulReul(name) + " 먹여본 재료에서 뺐어요");
        }
        paintSheet();
    };

    window.openPassedSheet = function () {
        picked = [];
        custom = [];
        askRemove = "";
        pickDay = validDay(keyOf(startGuess())) || todayKey();

        var old = document.getElementById(SHEET);
        if (old) old.remove();
        var wrap = document.createElement("div");
        wrap.id = SHEET;
        wrap.setAttribute("style",
            "position:fixed; inset:0; z-index:100030; background:#FFFFFF; " +
            "overflow-y:auto; -webkit-overflow-scrolling:touch; overscroll-behavior:contain;");
        document.body.appendChild(wrap);
        paintSheet();
    };

    window.closePassedSheet = function () {
        var el = document.getElementById(SHEET);
        if (el) el.remove();
        paint();
        paintAllergy();
        if (typeof window.nextFoodRepaint === "function") window.nextFoodRepaint();
    };

    // 달력 · 요약 · 다음 재료를 다시 그린다
    function refreshApp() {
        ["renderCalendar", "renderSelectedDateRecords", "renderTotalSummary"].forEach(function (n) {
            if (typeof window[n] === "function") { try { window[n](); } catch (e) {} }
        });
        /* ⚠️ 여기서 식단표(renderAutoPilotUI)를 늘 다시 불렀다.
              planlock.js 가 그 함수를 PLUS 로 잠가 두어서, 무료 회원은
              먹여본 재료를 저장하는 순간 결제 창이 튀어나왔다. PLUS 일 때만 다시 짠다. */
        var plus = (typeof window.isFoodPlus === "function") ? window.isFoodPlus() : false;
        if (plus && typeof window.renderAutoPilotUI === "function") {
            try { window.renderAutoPilotUI(); } catch (e) {}
        }
        paint();
        paintAllergy();
        if (typeof window.nextFoodRepaint === "function") window.nextFoodRepaint();
    }

    window.savePassed = function () {
        if (!picked.length) {
            if (entries().length) window.closePassedSheet();
            else window.foodToast("먹여본 재료를 하나 이상 골라주세요");
            return;
        }

        var day = validDay(pickDay) || validDay(keyOf(startGuess())) || todayKey();
        var db = cal(), have = passed();
        var add = picked.filter(function (n) { return have.indexOf(n) === -1; });

        if (add.length) {
            if (!db[day]) db[day] = [];
            add.forEach(function (n) {
                // ⚠️ time 은 화면에 그대로 찍힌다. 숫자를 넣으면 일련번호처럼 보인다.
                db[day].push({ type: "test", ingredient: n, status: "pass",
                               memo: "예전에 먹여본 재료", past: true, time: "" });
            });
            saveCal(db);
        }
        try { localStorage.setItem(DONE, "1"); } catch (e) {}

        var el = document.getElementById(SHEET);
        if (el) el.remove();
        refreshApp();

        var names = add.slice(0, 3).join(" · ") + (add.length > 3 ? " 외 " + (add.length - 3) + "가지" : "");
        window.foodToast(add.length
            ? names + "\n" + pretty(day) + "에 먹여본 것으로 적었어요.\n전에 등록한 재료 날짜는 그대로예요."
            : "이미 등록된 재료예요");
    };

    /* ---------- 창 그리기 ---------- */

    function chipCss(on) {
        return "display:inline-flex; align-items:center; gap:4px; padding:10px 13px; border-radius:11px; " +
            "cursor:pointer; font-size:13px; font-weight:800; " +
            (on ? "background:" + GREEN + "; color:#FFFFFF; border:1px solid " + GREEN + ";"
                : "background:#F9FAFB; color:#4E5968; border:1px solid #E5E8EB;");
    }

    function group(title, names) {
        return '<div style="margin-bottom:18px;">' +
            '<div style="font-size:12px; font-weight:900; color:' + GRAY + '; letter-spacing:1px; margin-bottom:9px;">' +
                esc(title) + '</div>' +
            '<div style="display:flex; flex-wrap:wrap; gap:7px;">' +
            names.map(function (n) {
                var on = picked.indexOf(n) > -1;
                return '<div onclick="window.togglePassed(' + q(n) + ')" style="' + chipCss(on) + '">' +
                    (on ? "✓ " : "") + esc(n) + '</div>';
            }).join("") +
            '</div></div>';
    }

    function haveHTML(have) {
        if (!have.length) return "";
        var today = todayKey(), b = birthKey();
        return '<div style="font-size:12px; font-weight:900; color:' + GRAY + '; letter-spacing:1px; margin:2px 0 9px;">' +
                '이미 등록한 재료 ' + have.length + '가지</div>' +
            '<div style="background:#F9FAFB; border:1px solid #E5E8EB; border-radius:14px; padding:2px 14px; margin-bottom:26px;">' +
            have.map(function (e, i) {
                var sep = i ? "border-top:1px solid #EEF0F2;" : "";

                if (askRemove === e.name) {
                    return '<div style="display:flex; align-items:center; gap:8px; padding:12px 0; ' + sep + '">' +
                        '<div style="flex:1; min-width:0; font-size:13.5px; font-weight:800; color:' + RED + '; word-break:keep-all;">' +
                            esc(e.name) + eulReul(e.name) + ' 목록에서 뺄까요?</div>' +
                        '<span onclick="window.passedRemove(' + q(e.name) + ')" style="flex-shrink:0; padding:8px 12px; ' +
                            'border-radius:9px; background:' + RED + '; color:#FFFFFF; font-size:12.5px; font-weight:900; cursor:pointer;">빼기</span>' +
                        '<span onclick="window.passedAskRemove(\'\')" style="flex-shrink:0; padding:8px 10px; ' +
                            'border-radius:9px; background:#FFFFFF; border:1px solid #E5E8EB; color:#4E5968; ' +
                            'font-size:12.5px; font-weight:800; cursor:pointer;">그대로</span>' +
                    '</div>';
                }

                var editable = e.past && !e.fromCal;
                return '<div style="display:flex; align-items:center; gap:9px; padding:12px 0; ' + sep + '">' +
                    '<div style="flex:1; min-width:0; font-size:14px; font-weight:800; color:' + DARK + '; ' +
                        'white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + esc(e.name) + '</div>' +
                    (editable
                        /* 글자처럼 보이는 날짜 위에 투명한 달력 칸을 덮는다 — 누르면 폰의 달력이 뜬다 */
                        ? '<label style="position:relative; flex-shrink:0; display:inline-flex; align-items:center; gap:4px; ' +
                              'font-size:12px; font-weight:800; color:' + GREEN + '; background:#EAF7F1; ' +
                              'border-radius:9px; padding:7px 10px; cursor:pointer; overflow:hidden;">' +
                              esc(pretty(e.day)) + ' <span style="opacity:.7;">✎</span>' +
                              '<input type="date" value="' + esc(e.day) + '" max="' + today + '"' + (b ? ' min="' + b + '"' : '') +
                              ' onchange="window.passedMove(' + q(e.name) + ', this.value)" ' +
                              'style="position:absolute; inset:0; width:100%; height:100%; opacity:0; cursor:pointer; font-size:16px;">' +
                          '</label>' +
                          '<span onclick="window.passedAskRemove(' + q(e.name) + ')" style="flex-shrink:0; font-size:19px; ' +
                              'font-weight:300; color:' + GRAY + '; cursor:pointer; padding:2px 4px; line-height:1;">×</span>'
                        : '<span style="flex-shrink:0; font-size:11.5px; font-weight:700; color:' + GRAY + ';">' +
                              esc(pretty(e.day)) + ' · 달력 기록</span>') +
                '</div>';
            }).join("") +
            '</div>';
    }

    function dayHTML() {
        if (!picked.length) return "";
        var today = todayKey(), b = birthKey();
        var qs = quick();
        var isQuick = qs.some(function (x) { return x.k === pickDay; });

        return '<div style="background:#FFFFFF; border:1.5px solid ' + GREEN + '; border-radius:16px; padding:16px 14px; margin:4px 0 12px;">' +
            '<div style="font-size:14px; font-weight:900; color:' + DARK + '; margin-bottom:4px; word-break:keep-all;">' +
                '새로 고른 ' + picked.length + '가지, 언제쯤 먹여보셨어요?</div>' +
            '<div style="font-size:11.5px; font-weight:600; color:' + GRAY + '; line-height:1.6; margin-bottom:12px; word-break:keep-all;">' +
                '정확하지 않아도 괜찮아요. <b style="color:#4E5968;">이미 등록한 재료 날짜는 바뀌지 않아요.</b></div>' +
            '<div style="display:flex; flex-wrap:wrap; gap:7px;">' +
                qs.map(function (x) {
                    return '<span onclick="window.passedSetDay(\'' + x.k + '\')" style="' + chipCss(x.k === pickDay) + '">' +
                        esc(x.label) + ' <span style="opacity:.72; font-weight:700;">' + esc(pretty(x.k)) + '</span></span>';
                }).join("") +
                '<label style="position:relative; overflow:hidden; ' + chipCss(!isQuick) + '">📅 ' +
                    (isQuick ? "날짜 고르기" : esc(pretty(pickDay))) +
                    '<input type="date" value="' + esc(pickDay) + '" max="' + today + '"' + (b ? ' min="' + b + '"' : '') +
                    ' onchange="window.passedSetDay(this.value)" ' +
                    'style="position:absolute; inset:0; width:100%; height:100%; opacity:0; cursor:pointer; font-size:16px;">' +
                '</label>' +
            '</div>' +
        '</div>';
    }

    function paintSheet() {
        var wrap = document.getElementById(SHEET);
        if (!wrap) return;

        var have = entries();
        var haveNames = have.map(function (e) { return e.name; });

        var groups = Object.keys(FOODS).map(function (g) {
            var names = FOODS[g].filter(function (n) { return haveNames.indexOf(n) === -1; });
            return names.length ? group(g, names) : "";
        }).join("");
        var mine = custom.filter(function (n) { return haveNames.indexOf(n) === -1; });
        if (mine.length) groups += group("직접 적은 재료", mine);

        var btnText = picked.length
            ? "새 재료 " + picked.length + "가지 · " + pretty(pickDay) + "로 등록"
            : (have.length ? "닫기" : "먹여본 재료를 골라주세요");

        var st = wrap.scrollTop;       // ⚠️ 칩 하나 누를 때마다 맨 위로 튀던 것
        wrap.innerHTML =
        '<div style="max-width:480px; margin:0 auto; padding:20px 20px 130px;">' +
            '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">' +
                '<div style="font-size:18px; font-weight:900; color:' + DARK + ';">🥄 지금까지 먹여본 재료</div>' +
                '<span onclick="window.closePassedSheet()" style="font-size:24px; font-weight:300; ' +
                    'color:' + GRAY + '; cursor:pointer; line-height:1; padding:0 4px;">×</span>' +
            '</div>' +
            '<div style="font-size:13px; font-weight:600; color:' + GRAY + '; ' +
                'line-height:1.7; margin-bottom:20px; word-break:keep-all;">' +
                '탈 없이 먹여본 것만 골라주세요. 이미 통과한 재료를 <b>다시 테스트로 띄우지 않기 위해서</b>예요.<br>' +
                '<b>이상이 있었던 재료는 고르지 마세요.</b> 그건 달력에서 따로 기록해 주세요.</div>' +

            haveHTML(have) +

            (groups
                ? '<div style="font-size:14.5px; font-weight:900; color:' + DARK + '; margin:0 0 12px;">' +
                      (have.length ? "새로 더하기" : "먹여본 재료 고르기") + '</div>' + groups
                : '') +

            '<div style="display:flex; gap:8px; margin:2px 0 22px;">' +
                '<input id="passed-custom" type="text" maxlength="60" enterkeyhint="done" ' +
                    'placeholder="목록에 없는 재료 (쉼표로 여러 개)" ' +
                    'onkeydown="if(event.key===\'Enter\'){event.preventDefault(); window.passedAddCustom();}" ' +
                    'style="flex:1; min-width:0; box-sizing:border-box; padding:12px 13px; border:1px solid #E5E8EB; ' +
                    'border-radius:11px; font-size:16px; font-weight:600; color:' + DARK + '; background:#FFFFFF; ' +
                    'outline:none; -webkit-appearance:none;">' +
                '<span onclick="window.passedAddCustom()" style="flex-shrink:0; display:flex; align-items:center; ' +
                    'padding:0 16px; border-radius:11px; background:#F2F4F6; color:#4E5968; font-size:13.5px; ' +
                    'font-weight:900; cursor:pointer;">추가</span>' +
            '</div>' +

            dayHTML() +
        '</div>' +

        '<div style="position:fixed; left:0; right:0; bottom:0; background:#FFFFFF; ' +
            'border-top:1px solid #E5E8EB; padding:14px 20px calc(14px + env(safe-area-inset-bottom, 0px));">' +
            '<div style="max-width:480px; margin:0 auto;">' +
                '<div onclick="window.savePassed()" style="text-align:center; padding:17px; ' +
                    'background:' + (picked.length ? DARK : (have.length ? "#F2F4F6" : "#C9CDD2")) + '; ' +
                    'color:' + (picked.length ? "#FFFFFF" : (have.length ? "#4E5968" : "#FFFFFF")) + '; ' +
                    'border-radius:14px; font-size:15px; font-weight:900; cursor:pointer;">' +
                    esc(btnText) + '</div>' +
            '</div>' +
        '</div>';
        wrap.scrollTop = st;
    }

    /* ---------- 식단표 위의 안내 줄 ---------- */

    function html() {
        var st = stage();
        if (st !== "early" && st !== "mid") return "";       // 후기·완료기는 이미 다 먹어봤다

        var p = passed();
        if (p.length >= 5 || localStorage.getItem(DONE)) {
            if (!p.length) return "";
            return '<div id="' + ID + '" onclick="window.openPassedSheet()" ' +
                'style="background:#EAF7F1; border:1px solid #A7DFC8; border-radius:14px; ' +
                'padding:13px 15px; margin:20px 0 14px; cursor:pointer; ' +
                'display:flex; align-items:center; gap:10px;">' +
                '<div style="font-size:17px; flex-shrink:0;">🥄</div>' +
                '<div style="flex:1; min-width:0;">' +
                    '<div style="font-size:13px; font-weight:900; color:#1F6F52;">' +
                        '먹여본 재료 ' + p.length + '가지</div>' +
                    '<div style="font-size:11px; font-weight:700; color:#4E5968; margin-top:2px; ' +
                        'white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' +
                        esc(p.slice(0, 6).join(" · ")) + (p.length > 6 ? " 외 " + (p.length - 6) + "가지" : "") + '</div>' +
                '</div>' +
                '<div style="font-size:11.5px; font-weight:800; color:#1F6F52; flex-shrink:0;">고치기</div>' +
            '</div>';
        }

        return '<div id="' + ID + '" style="background:#FFF9E6; border:1px solid #FDE68A; ' +
            'border-radius:14px; padding:16px; margin:20px 0 14px;">' +
            '<div style="font-size:14px; font-weight:900; color:#8A6D00; margin-bottom:6px;">' +
                '🥄 지금까지 먹여본 재료가 있나요?</div>' +
            '<div style="font-size:12.5px; font-weight:600; color:#4E5968; ' +
                'line-height:1.7; margin-bottom:12px; word-break:keep-all;">' +
                '식단표는 <b>아직 안 먹여본 재료</b>부터 짭니다. ' +
                '이미 소고기를 먹여보셨는데 앱이 모르면, 소고기를 또 "새 테스트"로 띄워요.<br>' +
                '한 번만 골라주시면 그런 일이 없습니다.</div>' +
            '<div onclick="window.openPassedSheet()" style="text-align:center; padding:14px; ' +
                'background:#8A6D00; color:#FFFFFF; border-radius:12px; ' +
                'font-size:14px; font-weight:900; cursor:pointer;">먹여본 재료 고르기</div>' +
        '</div>';
    }

    function paint() {
        var el = document.getElementById(ID);
        var box = document.createElement("div");
        box.innerHTML = html();
        if (el) {
            if (box.firstChild) el.parentNode.replaceChild(box.firstChild, el);
            else el.remove();
            return;
        }
        if (!box.firstChild) return;

        /* ⚠️ autopilot-result-container 앞에 넣으면, 식단표를 만들 때
              검은 PLUS 카드가 사라지면서 이 카드가 위로 올라가 보인다.
              그래서 검은 카드보다 더 위, 서브탭 바로 아래에 고정한다. */
        var host = document.getElementById("autopilot-result-container");
        if (!host || !host.parentNode) return;

        var anchor = host;
        var sib = host.previousElementSibling;
        for (var i = 0; i < 3 && sib; i++) {
            var t = sib.textContent || "";
            if (t.indexOf("식단표 자동 생성") > -1 || t.indexOf("배냇함 PLUS") > -1) { anchor = sib; break; }
            sib = sib.previousElementSibling;
        }
        anchor.parentNode.insertBefore(box.firstChild, anchor);
    }

    /* ⚠️ 이 카드가 '식단표' 탭에만 붙어 있었다.
          그런데 '먹여본 재료' 는 알레르기 얘기다.
          알레르기 탭에서 달력을 보다가 "아 이거 예전에 먹였는데" 하는 순간이
          제일 많은데, 거기서는 등록할 길이 없었다.
          같은 창(openPassedSheet)을 여는 작은 줄을 하나 더 놓는다. */

    var ID_A = "passed-foods-aller";

    function paintAllergy() {
        var host = document.getElementById("tab-allergy");
        if (!host) return;

        var p = passed();
        var old = document.getElementById(ID_A);

        var inner =
            '<div style="display:flex; align-items:center; gap:11px;">' +
                '<div style="font-size:18px; flex-shrink:0;">🥄</div>' +
                '<div style="flex:1; min-width:0;">' +
                    '<div style="font-size:13.5px; font-weight:900; color:' +
                        (p.length ? "#1F6F52" : DARK) + ';">' +
                        (p.length ? "먹여본 재료 " + p.length + "가지" : "지금까지 먹여본 재료 등록하기") + '</div>' +
                    '<div style="font-size:11px; font-weight:700; color:#4E5968; margin-top:2px; ' +
                        'white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' +
                        (p.length
                            ? esc(p.slice(0, 6).join(" · ")) + (p.length > 6 ? " 외 " + (p.length - 6) + "가지" : "")
                            : "이미 통과한 재료를 다시 테스트로 띄우지 않아요") + '</div>' +
                '</div>' +
                '<div style="font-size:11.5px; font-weight:800; color:' +
                    (p.length ? "#1F6F52" : BLUE) + '; flex-shrink:0;">' +
                    (p.length ? "고치기" : "등록") + '</div>' +
            '</div>';

        var css = p.length
            ? "background:#EAF7F1; border:1px solid #A7DFC8;"
            : "background:#FFFFFF; border:1px solid #E5E8EB;";

        if (old) { old.style.cssText = css + " border-radius:14px; padding:13px 15px; margin-bottom:14px; cursor:pointer;"; old.innerHTML = inner; return; }

        var box = document.createElement("div");
        box.id = ID_A;
        box.onclick = window.openPassedSheet;
        box.style.cssText = css + " border-radius:14px; padding:13px 15px; margin-bottom:14px; cursor:pointer;";
        box.innerHTML = inner;

        /* '다음엔 뭘 먹여볼까' 바로 위. 둘 다 '뭘 먹였나' 얘기다. */
        var nf = document.getElementById("next-food");
        if (nf && nf.parentNode === host) host.insertBefore(box, nf);
        else host.insertBefore(box, host.firstChild);
    }

    function boot() {
        setTimeout(function () { paint(); paintAllergy(); }, 700);
        setTimeout(function () { paint(); paintAllergy(); }, 2000);

        /* ⚠️ 4초마다 다시 그리고 있었다 (하루 종일). 기록이 바뀔 때만 다시 그린다. */
        ["saveTestRecord", "deleteFoodRecord", "saveMealRecord"].forEach(function (n) {
            var f = window[n];
            if (typeof f !== "function" || f.__passed) return;
            var w = function () {
                var o = f.apply(this, arguments);
                setTimeout(function () { paint(); paintAllergy(); }, 80);
                return o;
            };
            w.__passed = true;
            window[n] = w;
        });

        var sel = document.getElementById("food-age");
        if (sel) sel.addEventListener("change", function () { setTimeout(paint, 60); });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    window.passedDebug = function () {
        console.log("단계:", stage());
        var e = entries();
        console.log("통과한 재료:", e.length + "가지");
        e.forEach(function (x) {
            console.log("  " + x.name + "  " + x.day + (x.past ? "  (여기서 적음)" : "") + (x.fromCal ? "  (달력 기록)" : ""));
        });
        console.log("등록 물어봤나:", !!localStorage.getItem(DONE));
    };
})();