/* ============================================================
   배냇함 — 예방접종 일정 (vaccine.js)

   다른 육아앱엔 다 있는데 이 앱에만 없었다.
   infopick.js 는 "다음 접종까지 며칠" 을 띄우려고 vacSoon 을 읽는데,
   그 값을 만들어주는 곳이 어디에도 없었다. 이 파일이 그걸 만든다.

   ⚠️ 우리가 정하는 게 아니다.
      질병관리청 표준예방접종일정표(국가예방접종·NIP)를 그대로 옮긴다.
      시기를 우리가 계산해서 바꾸지 않는다.

   ⚠️ "맞아야 한다" 고 말하지 않는다.
      아이마다 사정이 다르고, 정하는 건 소아과다.
      우리는 "표준일정상 이때쯤" 까지만 말하고 확인은 병원에 맡긴다.

   ⚠️ 지나간 접종을 빨간색으로 만들지 않는다.
      늦은 접종은 흔하고, 늦었다고 겁주면 부모가 앱을 닫는다.
      지난 건 조용히 회색으로 두고, 체크만 할 수 있게 둔다.

   왜 이 앱이 이걸 제일 잘할 수 있나
     다른 앱은 일정만 알려주고 끝난다.
     배냇함은 접종 다음에 오는 것까지 갖고 있다.

       D-7 알림  →  당일  →  접종 후 48시간 열 지켜보기
                            →  열나면 해열제 안전장치(feverguard)
                            →  이틀 가면 진료 브리핑(emergency119)

   index.html 에서 feverguard.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var KEY   = "tosil_vaccines";        // { 접종id: "2026-09-12" }
    var CARD  = "home-vaccine-card";
    var DAY   = 86400000;

    var PURPLE = "#7F77DD";
    var GOLD   = "#B98A2E";
    var INK_S  = "#7A6F68";

    /* ==========================================================
       ⭐ 질병관리청 표준예방접종일정표 — 만 2세까지
          months = 권장 시작 월령. 바꾸려면 반드시 고시를 확인할 것.
       ========================================================== */

    var SCHEDULE = [
        { id: "bcg",     months: 0,  name: "BCG (결핵)",        dose: "1회",   note: "생후 4주 이내" },
        { id: "hepb1",   months: 0,  name: "B형간염 1차",        dose: "1/3",   note: "출생 직후" },
        { id: "hepb2",   months: 1,  name: "B형간염 2차",        dose: "2/3",   note: "" },

        { id: "dtap1",   months: 2,  name: "DTaP 1차",          dose: "1/5",   note: "디프테리아·파상풍·백일해" },
        { id: "ipv1",    months: 2,  name: "폴리오 1차",         dose: "1/4",   note: "" },
        { id: "hib1",    months: 2,  name: "Hib 1차",           dose: "1/4",   note: "뇌수막염" },
        { id: "pcv1",    months: 2,  name: "폐렴구균 1차",       dose: "1/4",   note: "" },
        { id: "rv1",     months: 2,  name: "로타바이러스 1차",    dose: "1/2~3", note: "먹는 백신" },

        { id: "dtap2",   months: 4,  name: "DTaP 2차",          dose: "2/5",   note: "" },
        { id: "ipv2",    months: 4,  name: "폴리오 2차",         dose: "2/4",   note: "" },
        { id: "hib2",    months: 4,  name: "Hib 2차",           dose: "2/4",   note: "" },
        { id: "pcv2",    months: 4,  name: "폐렴구균 2차",       dose: "2/4",   note: "" },
        { id: "rv2",     months: 4,  name: "로타바이러스 2차",    dose: "2/2~3", note: "" },

        { id: "dtap3",   months: 6,  name: "DTaP 3차",          dose: "3/5",   note: "" },
        { id: "hepb3",   months: 6,  name: "B형간염 3차",        dose: "3/3",   note: "" },
        { id: "hib3",    months: 6,  name: "Hib 3차",           dose: "3/4",   note: "" },
        { id: "pcv3",    months: 6,  name: "폐렴구균 3차",       dose: "3/4",   note: "" },
        { id: "ipv3",    months: 6,  name: "폴리오 3차",         dose: "3/4",   note: "6~18개월 사이" },
        { id: "rv3",     months: 6,  name: "로타바이러스 3차",    dose: "3/3",   note: "로타텍만 해당" },
        { id: "flu1",    months: 6,  name: "인플루엔자",         dose: "매년",  note: "생후 6개월부터, 해마다" },

        { id: "mmr1",    months: 12, name: "MMR 1차",           dose: "1/2",   note: "홍역·볼거리·풍진" },
        { id: "var1",    months: 12, name: "수두",              dose: "1회",   note: "" },
        { id: "hib4",    months: 12, name: "Hib 4차",           dose: "4/4",   note: "12~15개월" },
        { id: "pcv4",    months: 12, name: "폐렴구균 4차",       dose: "4/4",   note: "12~15개월" },
        { id: "hepa1",   months: 12, name: "A형간염 1차",        dose: "1/2",   note: "12~23개월" },
        { id: "je1",     months: 12, name: "일본뇌염 1차",       dose: "1/2~3", note: "12~23개월" },
        { id: "je2",     months: 13, name: "일본뇌염 2차",       dose: "2/2~3", note: "1차 뒤 1개월(불활성화)" },

        { id: "dtap4",   months: 15, name: "DTaP 4차",          dose: "4/5",   note: "15~18개월" },
        { id: "hepa2",   months: 18, name: "A형간염 2차",        dose: "2/2",   note: "1차 뒤 6~12개월" }
    ];

    /* ---------- 작은 도구 ---------- */

    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    function pad(n) { return String(n).padStart(2, "0"); }
    function toast(m) { if (typeof window.showToast === "function") window.showToast(m); }

    function birth() {
        var s = localStorage.getItem("tosil_startDate");
        if (!s) return null;
        var p = String(s).split("-");
        var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
        return isNaN(d.getTime()) ? null : d;
    }

    function todayStart() {
        var d = new Date(); d.setHours(0, 0, 0, 0);
        return d;
    }

    function keyOf(d) {
        return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
    }

    // 태어난 날 + N개월. 말일이 넘치면 그 달 마지막 날로 당긴다.
    function plusMonths(d, n) {
        var y = d.getFullYear(), m = d.getMonth() + n, day = d.getDate();
        var last = new Date(y, m + 1, 0).getDate();
        return new Date(y, m, Math.min(day, last));
    }

    /* ---------- 맞은 기록 ---------- */

    function done() {
        try {
            var v = JSON.parse(localStorage.getItem(KEY));
            return (v && typeof v === "object" && !Array.isArray(v)) ? v : {};
        } catch (e) { return {}; }
    }

    function saveDone(o) {
        try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {}
        sync();
    }

    window.toggleVaccine = function (id) {
        var o = done();
        if (o[id]) delete o[id];
        else o[id] = keyOf(new Date());
        saveDone(o);
        paint();
        mount();
        toast(o[id] ? "맞은 것으로 표시했어요" : "표시를 지웠어요");
    };

    /* ---------- 가족과 함께 보기 ----------
       접종은 부부 둘 다 알아야 하는 일이다.
       다른 동기화 파일들과 같은 모양을 쓴다. -------- */

    function ref() {
        var code = localStorage.getItem("family_sync_code");
        if (!code || !window.db || typeof window.doc !== "function") return null;
        return window.doc(window.db, "settings_" + code + (window.currentBabySuffix || ""), "vaccines");
    }

    function sync() {
        var r = ref();
        if (!r || typeof window.setDoc !== "function") return;
        try { window.setDoc(r, { list: done(), at: Date.now() }, { merge: true }); }
        catch (e) {}
    }

    var unsub = null;
    function watch() {
        var r = ref();
        if (!r || typeof window.onSnapshot !== "function") return;
        if (unsub) { try { unsub(); } catch (e) {} }
        var u = window.onSnapshot(r, function (snap) {
            if (!snap.exists()) return;
            var remote = (snap.data() || {}).list || {};
            var local = done(), merged = {}, changed = false;
            Object.keys(local).concat(Object.keys(remote)).forEach(function (k) {
                if (merged[k]) return;
                // 둘 다 있으면 먼저 적은 날을 남긴다 (진짜 맞은 날이 이긴다)
                var a = local[k], b = remote[k];
                merged[k] = (a && b) ? (a <= b ? a : b) : (a || b);
            });
            if (JSON.stringify(merged) !== JSON.stringify(local)) changed = true;
            if (!changed) return;
            try { localStorage.setItem(KEY, JSON.stringify(merged)); } catch (e) {}
            paint(); mount();
        }, function () {});
        unsub = (typeof window.addLiveListener === "function") ? window.addLiveListener(u) : u;
    }

    /* ==========================================================
       계산 — 각 접종의 권장일과 남은 날
       ========================================================== */

    window.vaccineList = function () {
        var b = birth();
        if (!b) return [];
        var d = done();
        var t = todayStart().getTime();

        return SCHEDULE.map(function (v) {
            var at = plusMonths(b, v.months);
            var left = Math.round((at.getTime() - t) / DAY);
            return {
                id: v.id, name: v.name, dose: v.dose, note: v.note,
                months: v.months,
                at: keyOf(at),
                left: left,
                done: !!d[v.id],
                doneAt: d[v.id] || null
            };
        });
    };

    // 다음에 맞을 것 (아직 안 맞은 것 중 가장 가까운 날)
    window.nextVaccine = function () {
        var list = window.vaccineList().filter(function (v) { return !v.done; });
        if (!list.length) return null;

        // 아직 안 온 것 중 제일 가까운 것
        var future = list.filter(function (v) { return v.left >= 0; });
        if (future.length) {
            future.sort(function (a, b) { return a.left - b.left; });
            return future[0];
        }
        // 전부 지났으면 가장 최근에 지난 것
        list.sort(function (a, b) { return b.left - a.left; });
        return list[0];
    };

    /* infopick.js 가 읽으려던 값. 이제 진짜로 만들어준다. */
    Object.defineProperty(window, "vacSoon", {
        configurable: true,
        get: function () {
            var n = window.nextVaccine();
            return (n && n.left >= 0) ? n.left : 0;
        }
    });

    /* ==========================================================
       홈 카드 — 일주일 안으로 들어왔을 때만
       ========================================================== */

    function cardHTML(v) {
        var when = v.left === 0 ? "오늘이에요"
                 : v.left === 1 ? "내일이에요"
                 : v.left + "일 남았어요";

        return '<div id="' + CARD + '" onclick="window.openVaccineSheet()" ' +
            'style="display:flex; align-items:center; gap:13px; ' +
            'background:rgba(127,119,221,0.07); border:1px solid rgba(127,119,221,0.20); ' +
            'border-radius:20px; padding:15px 16px; margin-bottom:24px; cursor:pointer;">' +

            '<div style="font-size:20px; flex-shrink:0;">💉</div>' +

            '<div style="flex:1; min-width:0;">' +
                '<div style="font-size:14px; font-weight:900; color:' + PURPLE + '; ' +
                    'letter-spacing:-0.3px; word-break:keep-all; line-height:1.4;">' +
                    esc(v.name) + ' · ' + when + '</div>' +
                '<div style="font-size:11.5px; font-weight:700; color:var(--text-sub); ' +
                    'margin-top:3px; word-break:keep-all;">표준일정 기준이에요. 병원에 미리 확인해 주세요</div>' +
            '</div>' +

            '<div style="font-size:12px; color:' + PURPLE + '; flex-shrink:0;">〉</div>' +
        '</div>';
    }

    function mount() {
        var old = document.getElementById(CARD);
        var v = window.nextVaccine();

        // 일주일 안쪽일 때만. 매일 뜨면 그냥 벽지가 된다.
        if (!v || v.left < 0 || v.left > 7) { if (old) old.remove(); return; }

        var anchor = document.getElementById("baby-dashboard") ||
                     document.getElementById("now-status-card");
        if (!anchor) return;

        var home = document.getElementById("tab-home");
        var block = anchor;
        while (block && block.parentNode && block.parentNode !== home) block = block.parentNode;
        if (!block || block.parentNode !== home) block = anchor;

        var box = document.createElement("div");
        box.innerHTML = cardHTML(v);
        var el = box.firstChild;

        if (old) old.parentNode.replaceChild(el, old);
        else block.parentNode.insertBefore(el, block.nextSibling);
    }

    window.refreshVaccineCard = mount;

    /* ==========================================================
       전체 일정표
       ========================================================== */

    function rowHTML(v) {
        var late = !v.done && v.left < 0;

        var right = v.done
            ? '<span style="font-size:11px; font-weight:800; color:' + GOLD + '; ' +
                  'background:rgba(185,138,46,0.12); padding:5px 10px; border-radius:9px; ' +
                  'flex-shrink:0; white-space:nowrap;">맞았어요</span>'
            : '<span style="font-size:11.5px; font-weight:800; flex-shrink:0; white-space:nowrap; ' +
                  'color:' + (v.left >= 0 && v.left <= 7 ? PURPLE : "var(--text-sub)") + ';">' +
                  (v.left >= 0 ? "D-" + v.left : Math.abs(v.left) + "일 지남") + '</span>';

        return '<div onclick="window.toggleVaccine(\'' + v.id + '\')" ' +
            'style="display:flex; align-items:center; gap:11px; padding:13px 2px; cursor:pointer; ' +
            'opacity:' + (late ? "0.62" : "1") + ';">' +

            '<span style="width:19px; height:19px; border-radius:6px; flex-shrink:0; ' +
                'display:flex; align-items:center; justify-content:center; font-size:11px; ' +
                (v.done
                    ? 'background:' + GOLD + '; color:#FFF;'
                    : 'border:1.5px solid var(--border);') + '">' +
                (v.done ? "✓" : "") + '</span>' +

            '<div style="flex:1; min-width:0;">' +
                '<div style="font-size:13.5px; font-weight:800; color:var(--text-m); ' +
                    'letter-spacing:-0.2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' +
                    esc(v.name) + '</div>' +
                '<div style="font-size:11px; font-weight:700; color:var(--text-sub); margin-top:2px; ' +
                    'white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' +
                    esc(v.dose) + (v.note ? "  ·  " + esc(v.note) : "") + '</div>' +
            '</div>' +

            right +
        '</div>';
    }

    window.openVaccineSheet = function () {
        var old = document.getElementById("vaccine-sheet");
        if (old) old.remove();

        var b = birth();
        if (!b) return toast("설정에서 아기 생일을 먼저 넣어주세요");

        var list = window.vaccineList();
        var groups = {};
        list.forEach(function (v) {
            var k = v.months;
            if (!groups[k]) groups[k] = [];
            groups[k].push(v);
        });

        var body = Object.keys(groups).map(Number).sort(function (a, c) { return a - c; })
            .map(function (m) {
                return '<div style="margin-top:22px;">' +
                    '<div style="font-size:11.5px; font-weight:900; color:' + PURPLE + '; ' +
                        'margin-bottom:4px;">' + (m === 0 ? "태어나고 바로" : "생후 " + m + "개월") + '</div>' +
                    groups[m].map(rowHTML).join(
                        '<div style="height:1px; background:var(--border); opacity:0.5;"></div>') +
                '</div>';
            }).join("");

        var wrap = document.createElement("div");
        wrap.id = "vaccine-sheet";
        wrap.setAttribute("style", "position:fixed; inset:0; z-index:100002; " +
            "background:rgba(35,29,24,0.55); display:flex; align-items:flex-end; justify-content:center;");
        wrap.onclick = function (e) { if (e.target === wrap) wrap.remove(); };

        var n = list.filter(function (v) { return v.done; }).length;

        wrap.innerHTML =
        '<div style="width:100%; max-width:520px; max-height:86vh; overflow-y:auto; ' +
            'overscroll-behavior:contain; background:var(--bg-card); border-radius:26px 26px 0 0; ' +
            'padding:22px 20px calc(34px + env(safe-area-inset-bottom, 0px));">' +

            '<div style="display:flex; justify-content:space-between; align-items:center;">' +
                '<span style="font-size:16.5px; font-weight:900; color:var(--text-m); ' +
                    'letter-spacing:-0.4px;">💉 예방접종</span>' +
                '<span onclick="document.getElementById(\'vaccine-sheet\').remove()" ' +
                    'style="font-size:22px; font-weight:300; color:var(--text-sub); ' +
                    'cursor:pointer; line-height:1; padding:0 6px;">×</span>' +
            '</div>' +

            '<div style="font-size:12px; font-weight:700; color:var(--text-sub); margin-top:5px;">' +
                n + ' / ' + list.length + '  ·  눌러서 맞은 것을 표시하세요</div>' +

            /* ⚠️ 이 두 줄이 이 화면의 법적 안전선이다. 지우지 말 것. */
            '<div style="margin-top:14px; padding:13px 15px; background:var(--bg-sub); ' +
                'border-radius:13px; font-size:11.5px; font-weight:700; color:' + INK_S + '; ' +
                'line-height:1.65; word-break:keep-all;">' +
                '질병관리청 표준예방접종일정표를 생일에 맞춰 계산한 것이에요.<br>' +
                '아이마다 시기가 다를 수 있으니 <b>실제 접종일은 병원에서 정합니다.</b></div>' +

            body +

            '<div style="text-align:center; font-size:11px; font-weight:600; color:var(--text-sub); ' +
                'margin-top:26px; line-height:1.7;">' +
                '늦어진 접종은 흔한 일이에요<br>남은 일정은 병원에서 다시 잡아줍니다</div>' +
        '</div>';

        document.body.appendChild(wrap);
    };

    /* ---------- 육아정보 탭 입구 ---------- */

    function mountEntry() {
        var box = document.getElementById("tab-info");
        if (!box || document.getElementById("vaccine-entry")) return;
        if (!birth()) return;

        var v = window.nextVaccine();
        if (!v) return;

        var el = document.createElement("div");
        el.id = "vaccine-entry";
        el.onclick = window.openVaccineSheet;
        el.style.cssText = "display:flex; align-items:center; gap:12px; " +
            "background:rgba(127,119,221,0.06); border:1px solid rgba(127,119,221,0.18); " +
            "border-radius:18px; padding:16px 18px; margin-bottom:20px; cursor:pointer;";
        el.innerHTML =
            '<span style="font-size:20px; flex-shrink:0;">💉</span>' +
            '<div style="flex:1; min-width:0;">' +
                '<div style="font-size:14.5px; font-weight:900; color:var(--text-m); ' +
                    'letter-spacing:-0.3px;">예방접종 일정</div>' +
                '<div style="font-size:11.5px; font-weight:700; color:var(--text-sub); margin-top:3px; ' +
                    'white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' +
                    (v.left >= 0
                        ? "다음은 " + esc(v.name) + " · D-" + v.left
                        : esc(v.name) + " 부터 남아 있어요") + '</div>' +
            '</div>' +
            '<span style="font-size:12px; color:' + PURPLE + '; flex-shrink:0;">〉</span>';

        box.insertBefore(el, box.firstChild);
    }

    function paint() {
        var e = document.getElementById("vaccine-entry");
        if (e) { e.remove(); mountEntry(); }
    }

    /* ---------- 시작 ---------- */

    function boot() {
        setTimeout(function () { mount(); mountEntry(); }, 1600);
        setTimeout(function () { mount(); mountEntry(); watch(); }, 4000);
        setInterval(function () { mount(); mountEntry(); }, 10 * 60000);

        document.addEventListener("visibilitychange", function () {
            if (!document.hidden) setTimeout(function () { mount(); mountEntry(); }, 500);
        });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    /* ---------- 점검용 ---------- */
    window.vaccineDebug = function () {
        var b = birth();
        if (!b) return console.log("생일이 없습니다");
        console.log("생일:", keyOf(b));
        var list = window.vaccineList();
        console.log("맞은 것:", list.filter(function (v) { return v.done; }).length + " / " + list.length);
        var n = window.nextVaccine();
        console.log("다음:", n ? (n.name + " · " + n.at + " · " + (n.left >= 0 ? "D-" + n.left : Math.abs(n.left) + "일 지남")) : "없음");
        console.log("window.vacSoon =", window.vacSoon);
        console.log("홈 카드:", !!document.getElementById(CARD), "(7일 안쪽일 때만 뜹니다)");
        return list;
    };
})();