/* ============================================================
   배냇함 — 바꿀 때 알림 (nextstep.js)

   왜 필요한가
     큐레이터는 '고를 때' 한 번 열고 끝나는 기능이었다 (물건은 한두 번 산다).
     그런데 큐레이터가 진짜 도움이 되는 순간은 그 다음이다 —
     이유식 중기로 넘어갈 때, 컵을 쥐여 줄 때, 젖꼭지를 바꿀 때, 카시트 어깨끈을 올릴 때.
     홈 '오늘 챙길 것'(homefix.js)이 이걸 모아 보여 주지만, 앱을 열어야 보인다.
     새벽 세 시에 아기를 안고 있는 사람은 그걸 보러 앱을 열지 않는다.
     그래서 그날 아침에 폰으로 한 번 알려 준다.

   이 파일이 하는 일
     1. 지금 아기의 '바꿀 때' 를 날짜와 함께 미리 센다 (앞으로 120일 · 지난 10일)
     2. 그 목록을 가족 서버 문서(reminders/가족코드)의 next 칸에 적는다
          next.{아기}.u.{이 폰 uid} = { at, items: [{ id, at, t, b, link }], skip: [id] }
          nextAt = 아직 안 보낸 것 중 가장 이른 시각
          mute.{uid}.next = 이 폰은 껐다
     3. 서버(functions 의 nextStepDaily)가 매일 아침 10시에 보고, 하루 하나 · 이틀 간격으로 보낸다

   ⚠️ 폰마다 따로 적는다. 큐레이터 기록(젖꼭지 바꾼 날 · 우리 카시트)은 그 기록을 남긴 폰에만 있다.
      한 칸에 같이 적으면 기록이 없는 짝꿍 폰이 열 때마다 목록을 덮어 지운다. 서버가 합친다.
   ⚠️ 홈 '오늘 챙길 것' 과 같은 이름(id)을 쓴다. 거기서 한 번 눌러 본 줄(tosil_todo_seen)은 보내지 않는다 (skip).
   ⚠️ 없는 걸 지어내지 않는다. 기록이 없으면 그 줄은 없다 (homefix.js 와 같은 원칙).
   ⚠️ 건강 · 의료 판단은 하지 않는다. '볼 때가 됐어요' 까지다 (플레이 앱 의료 기능 규칙).
   ⚠️ 할머니 · 돌봄 선생님 폰(senior)은 적지 않는다. 서버도 그 폰으로는 보내지 않는다.
   ⚠️ 아직 태어나기 전(생일 칸에 예정일)이면 아무것도 적지 않는다.

   켜고 끄기: 알림 설정 창의 '바꿀 때 알림' (tosil_next_push · 처음엔 켜져 있다)
   index.html 에서 carealarm.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var ON_KEY = "tosil_next_push";        // 'off' 면 이 폰은 바꿀 때 알림을 안 받는다
    var UP_KEY = "tosil_next_up";          // 마지막으로 서버에 적은 값 (같으면 다시 안 적는다)
    var SENT_KEY = "tosil_next_sent";      // 서버가 이미 보낸 것 (서버 문서를 읽을 때마다 옮겨 둔다 · 설정 창 '다음 알림' 줄에 쓴다)
    var DAY = 86400000;
    var AHEAD = 120 * DAY;                 // 이만큼 앞까지만 적는다 (넉 달 동안 아무도 안 열면 알림도 멈춘다)
    var LATE = 10 * DAY;                   // 이보다 오래 지난 건 적지 않는다 (서버와 같다)

    function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function getJSON(k, d) {
        try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; }
    }
    function on() { return get(ON_KEY) !== "off"; }
    window.nextPushOn = on;

    function myUid() { return (window.auth && window.auth.currentUser && window.auth.currentUser.uid) || get("firebase_uid") || ""; }
    function babyKey() { return window.currentBabySuffix || "main"; }
    function babyName() { return String(get("tosil_babyName") || "").trim() || "우리 아기"; }
    function josa(w, a, b) {   // 받침 있으면 a, 없으면 b
        var s = String(w || ""), c = s.charCodeAt(s.length - 1);
        return (c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0) ? a : b;
    }
    /* '꿈이가' · '서준이가' — 받침이 있으면 '이' 를 붙여 부르고 '가' */
    function nameGa() {
        var n = babyName();
        if (n === "우리 아기") return "우리 아기가";
        return n + (josa(n, "이", "") ) + "가";
    }

    /* 'YYYY-MM-DD' → 그날 0시 (이 폰 시각) */
    function parseDay(k) {
        var m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(k || ""));
        if (!m) return null;
        var d = new Date(+m[1], +m[2] - 1, +m[3]);
        return isNaN(d.getTime()) ? null : d;
    }
    /* 그 날짜의 아침 10시 (한국 시각) — 서버가 매일 10시에 본다 */
    function at10(y, m0, d) { return Date.UTC(y, m0, d, 1, 0, 0); }
    function at10Of(date, plusDays) {
        return at10(date.getFullYear(), date.getMonth(), date.getDate() + (plusDays || 0));
    }

    /* 발달을 세는 날 — 이른둥이는 예정일부터 (shared/babyage.js). 카시트는 태어난 날 그대로 */
    function realBirth() { return parseDay(get("tosil_startDate")); }
    function devStart() {
        try { if (window.BabyAge && window.BabyAge.on && window.BabyAge.on() && window.BabyAge.start) return window.BabyAge.start(); } catch (e) {}
        return realBirth();
    }
    function corrected() { try { return !!(window.BabyAge && window.BabyAge.on && window.BabyAge.on()); } catch (e) { return false; } }
    /* 그 날부터 N개월 되는 날 (+며칠) 아침 10시 */
    function monthAt(start, n, plus) {
        return at10(start.getFullYear(), start.getMonth() + n, start.getDate() + (plus || 0));
    }

    /* 이유식을 이미 시작했나 — homefix.js startedSolids 와 같은 기준 */
    function startedSolids() {
        if (/이유식|유아식/.test(String(get("tosil_feedingStage") || ""))) return true;
        var cal = getJSON("tosil_food_calendar", {});
        if (cal && typeof cal === "object" && Object.keys(cal).length) return true;
        var recs = getJSON("tosil_tracker_records", []);
        return Array.isArray(recs) && recs.some(function (r) { return r && r.type === "feed" && r.subType === "이유식"; });
    }
    /* 도감에 발달 도장(뒤집기 · 배밀이 · 서기 …)을 찍는 집인가 — 그러면 놀이 시기는 도장을 따른다 (homefix.js 와 같게) */
    var MS_IDS = ["m17", "m21", "m28", "m29", "m30", "m34", "m35", "m42"];
    function hasStamps() {
        var raw = getJSON("tosil_milestones", []);
        return Array.isArray(raw) && raw.some(function (a) {
            var id = typeof a === "string" ? a : (a && a.id);
            return MS_IDS.indexOf(id) > -1;
        });
    }
    function seenMap() { var o = getJSON("tosil_todo_seen", {}); return (o && typeof o === "object") ? o : {}; }

    /* ==========================================================
       바꿀 때 목록
       ---------------------------------------------------------- */
    function plan() {
        var out = [];
        var now = Date.now();
        var born = realBirth();
        if (!born) return out;
        var t0 = new Date(); t0.setHours(0, 0, 0, 0);
        if (born > t0) return out;                                   // 아직 태어나기 전
        var dev = devStart() || born;
        var pre = corrected() ? "교정 " : "";
        var fs = String(get("tosil_feedingStage") || "");
        var ga = nameGa();
        var add = function (id, at, t, b, link) {
            if (!(at > 0) || at < now - LATE || at > now + AHEAD) return;
            out.push({ id: id, at: at, t: t, b: b, link: link });
        };

        /* ── 지금 시기 (발달 나이) — homefix.js SOON 과 같은 이름 · 같은 날 ── */
        if (!startedSolids())
            add("food_start", monthAt(dev, 5), "🥄 이유식 준비를 시작해 볼 때예요",
                ga + " " + pre + "5개월이 됐어요. 보통 6개월 무렵 쌀미음부터 시작해요", "food/index.html");
        add("cup_6", monthAt(dev, 6), "🥤 컵을 처음 쥐여 줄 때예요",
            "이유식을 시작하면서 컵도 같이 쥐어 보게 하는 집이 많아요", "bottle/index.html?tab=tools");
        if (!/중후기|유아식/.test(fs))
            add("food_mid", monthAt(dev, 7), "🥣 이유식 중기로 넘어갈 때예요",
                pre + "7~9개월이에요. 알갱이를 조금씩 키워요", "food/index.html");
        if (!get("tosil_bottle_cup"))
            add("cup_9", monthAt(dev, 9), "🥤 빨대컵으로 물을 줘 볼 때예요",
                "흘리는 게 당연한 시기예요. 처음엔 몇 모금이면 충분해요", "bottle/index.html?tab=tools");
        if (!/유아식/.test(fs)) {
            add("food_late", monthAt(dev, 10), "🍚 이유식 후기로 넘어갈 때예요",
                pre + "10~11개월이에요. 진밥 쪽으로 조금씩 되게 지어요", "food/index.html");
            add("food_done", monthAt(dev, 12), "🍽️ 이유식 완료기예요",
                "진밥과 하루 세 끼로 천천히 넘어가요", "food/index.html");
        }
        /* 완료기와 같은 날 겹치지 않게 닷새 뒤 */
        add("milk_12", monthAt(dev, 12, 5), "🥛 생우유를 시작해도 되는 때예요",
            "한 번에 바꾸지 말고 천천히 바꿔 가요", "bottle/index.html?tab=tools");

        /* 놀이 시기 — 도장을 안 찍는 집만 (찍는 집은 도장을 찍는 순간 앱이 열려 있다). 이유식과 겹치지 않게 사흘 뒤 */
        if (!hasStamps()) {
            [2, 4, 7, 10].forEach(function (n) {
                add("toy_m" + n, monthAt(dev, n, 3), "🧸 " + pre + n + "개월, 놀이를 바꿔 줄 때예요",
                    "이맘때 맞는 놀이를 모아 뒀어요. 이번 주 놀이를 새로 짜 볼까요?", "toy/index.html");
            });
        }

        /* ── 카시트 15개월 (태어난 날 그대로 — 카시트는 법 · 안전 기준이라 교정 나이를 안 쓴다) ── */
        add("carseat_15", monthAt(born, 15), "🚘 15개월, 카시트 앞보기를 고민할 때예요",
            "i-Size 기준으로는 이제 돌려도 되지만, 카시트 한도까지 뒤보기가 더 안전해요", "carseat/index.html?tab=use");

        /* ── 쓰고 있는 물건 — 날짜를 적어 둔 것만 ── */
        var nip = parseDay(get("tosil_nipple_changed"));
        if (nip) add("nipple", at10Of(nip, 60), "🍼 젖꼭지 바꾼 지 두 달 됐어요",
                     "늘어났거나 끈적이면 바꿀 때예요", "bottle/index.html?tab=tools");
        var parts = getJSON("tosil_bottle_parts", {}) || {};
        var paci = parseDay(parts.paci);
        if (paci) add("paci", at10Of(paci, 45), "🍼 쪽쪽이 바꾼 지 한 달 반 됐어요",
                      "찢어졌거나 늘어났는지 한번 봐 주세요", "bottle/index.html?tab=tools");
        var straw = parseDay(parts.straw);
        if (straw) add("straw", at10Of(straw, 60), "🥤 빨대컵 빨대 바꾼 지 두 달 됐어요",
                       "갈라졌거나 물때가 끼었는지 봐 주세요", "bottle/index.html?tab=tools");

        var cs = getJSON("tosil_carseat_own", {}) || {};
        var hasSeat = !!(cs.id || cs.name);
        var harness = parseDay(cs.harnessAt);
        if (hasSeat && harness) add("harness", at10Of(harness, 60), "🚘 카시트 어깨끈 높이 볼 때예요",
                                    "맞춘 지 두 달 됐어요. 크는 만큼 끈 높이도 맞춰 줘야 해요", "carseat/index.html?go=own");
        var ex = /^(\d{4})-(\d{1,2})/.exec(String(cs.expireAt || ""));
        if (hasSeat && ex) add("seat_expire", at10(+ex[1], +ex[2] - 1, 1 - 30), "🚘 카시트 유효기간이 한 달 남았어요",
                               "다음 카시트를 볼 때예요. 기한이 지난 건 중고로도 팔지 마세요", "carseat/index.html?go=own");

        /* 겨울 패딩 — 카시트를 적어 뒀거나 카시트 큐레이터를 열어 본 집. 해마다 11월 15일, 큐레이터에서 겨울 안내를 봤으면 뺀다 */
        if (hasSeat || get("tosil_carseat_tab")) {
            var y = t0.getFullYear();
            var winter = at10(y, 10, 15);
            if (winter < now - LATE) { y += 1; winter = at10(y, 10, 15); }
            if (get("tosil_carseat_winter_seen") !== y + "-" + (y + 1))
                add("winter_" + y, winter, "🧥 겨울엔 패딩 벗기고 카시트에 태워요",
                    "두꺼운 외투는 하네스를 헐겁게 해요. 담요는 하네스를 채운 뒤 위에 덮어 주세요", "carseat/index.html?tab=use");
        }

        var st = getJSON("tosil_stroller_own", {}) || {};
        var seatWash = parseDay(st.care && st.care.seat);
        if (seatWash) add("stroller_seat", at10Of(seatWash, 90), "👶 유모차 시트 빨 때예요",
                          "마지막으로 빤 지 석 달 됐어요", "stroller/index.html?tab=use");

        out.sort(function (a, b) { return a.at - b.at; });
        return out.slice(0, 20);
    }
    window.nextStepPlan = plan;

    /* 홈 '오늘 챙길 것' 에서 이미 눌러 본 줄 — 보내지 않는다 */
    function skipList(items) {
        var seen = seenMap();
        return items.filter(function (x) { return !!seen[x.id]; }).map(function (x) { return x.id; });
    }

    /* 아직 안 간 것 (이 폰 목록에서 본 것 · 서버가 이미 보낸 것을 뺀다) — 설정 창 '다음 알림' 줄 */
    function keepSent(srv) { try { localStorage.setItem(SENT_KEY, JSON.stringify((srv && srv.nextSent) || {})); } catch (e) {} }
    function upcoming() {
        var seen = seenMap(), sent = (getJSON(SENT_KEY, {}) || {})[babyKey()] || {};
        return plan().filter(function (x) { return !seen[x.id] && Number(sent[x.id]) !== x.at; });
    }
    window.nextStepUpcoming = upcoming;
    /* 서버 문서를 한 번 읽어 보낸 것 장부를 새로 한 뒤 다음 것 (설정 창을 열 때) */
    window.nextStepPeek = async function () {
        var code = get("family_sync_code");
        if (code && !/unlinked/.test(code) && window.db && typeof window.getDoc === "function" && typeof window.doc === "function") {
            try {
                var snap = await window.getDoc(window.doc(window.db, "reminders", code));
                if (snap && snap.exists()) keepSent(snap.data() || {});
            } catch (e) {}
        }
        return upcoming()[0] || null;
    };
    /* 그 알림이 가는 날 — '곧'(지났는데 아직 안 간 것: 다음 아침 10시) · 오늘 · 내일 · 11월 9일 */
    window.nextStepWhen = function (x) {
        if (!x || !(x.at > Date.now())) return "곧";
        var d = new Date(x.at), a = new Date(x.at), t = new Date();
        a.setHours(0, 0, 0, 0); t.setHours(0, 0, 0, 0);
        var n = Math.round((a - t) / DAY);
        return n === 0 ? "오늘" : n === 1 ? "내일" : (d.getMonth() + 1) + "월 " + d.getDate() + "일";
    };

    /* ==========================================================
       서버에 적기 (carealarm.js 와 같은 문서 · 같은 방식)
       ---------------------------------------------------------- */
    var busy = false, again = false;
    async function upload(force) {
        var code = get("family_sync_code");
        if (!code || /unlinked/.test(code)) return { ok: false, code: "no-family" };
        if (get("user_role") === "senior") return { ok: false, code: "senior" };   // 할머니 · 돌봄 선생님 폰은 적지 않는다
        if (!window.db || typeof window.setDoc !== "function" || typeof window.doc !== "function") return { ok: false, code: "not-ready" };
        var uid = myUid();
        if (!uid) return { ok: false, code: "no-uid" };
        var key = babyKey();
        var items = plan();
        var skip = skipList(items);
        var sig = JSON.stringify([key, uid, on(), items.map(function (x) { return x.id + "@" + x.at; }), skip, babyName()]);
        if (!force && get(UP_KEY) === sig) return { ok: true, same: true };
        if (busy) { again = true; return { ok: true, queued: true }; }
        busy = true;
        try {
            var ref = window.doc(window.db, "reminders", code);
            var srv = {};
            if (typeof window.getDoc === "function") {
                try { var snap = await window.getDoc(ref); if (snap && snap.exists()) srv = snap.data() || {}; keepSent(srv); } catch (e) {}
            }
            var mine = { at: Date.now(), items: items, skip: skip };
            var body = { next: {}, mute: {} };
            body.next[key] = { name: babyName(), u: {} };
            body.next[key].u[uid] = mine;
            body.mute[uid] = { next: !on() };

            /* nextAt — 서버가 이 시각이 지난 문서만 본다. 모든 아기 · 모든 폰 목록 중 아직 안 보낸 가장 이른 것 */
            var all = JSON.parse(JSON.stringify(srv.next || {}));
            all[key] = all[key] || {};
            all[key].u = all[key].u || {};
            all[key].u[uid] = mine;
            var sent = srv.nextSent || {};
            var now = Date.now(), best = null;
            Object.keys(all).forEach(function (bk) {
                var us = (all[bk] && all[bk].u) || {}, sk = {};
                Object.keys(us).forEach(function (u) { ((us[u] && us[u].skip) || []).forEach(function (id) { sk[id] = 1; }); });
                Object.keys(us).forEach(function (u) {
                    ((us[u] && us[u].items) || []).forEach(function (x) {
                        var at = Number(x && x.at) || 0;
                        if (!at || sk[x.id] || Number((sent[bk] || {})[x.id]) === at || now - at > LATE) return;
                        if (best === null || at < best) best = at;
                    });
                });
            });
            body.nextAt = best;

            await window.setDoc(ref, body, { merge: true });
            try { localStorage.setItem(UP_KEY, sig); } catch (e) {}
            return { ok: true, items: items.length, nextAt: best };
        } catch (e) {
            console.warn("[바꿀 때 알림] 서버에 적기 실패", e);
            return { ok: false, code: (e && (e.code || e.message)) || String(e) };
        } finally {
            busy = false;
            if (again) { again = false; setTimeout(function () { upload(false); }, 400); }
        }
    }
    window.refreshNextStep = function (force) { return upload(!!force); };

    /* 앱을 열 때 · 다시 볼 때 (여섯 시간에 한 번이면 충분하다. 바뀐 게 없으면 서버엔 안 적는다) */
    var lastTry = 0;
    function maybe() {
        if (Date.now() - lastTry < 6 * 3600000) return;
        lastTry = Date.now();
        upload(false);
    }
    function boot() {
        setTimeout(maybe, 4000);
        document.addEventListener("visibilitychange", function () {
            if (document.visibilityState === "visible") { lastTry = 0; setTimeout(maybe, 2500); }
        });
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    window.nextStepDebug = function () {
        var p = plan();
        console.log("바꿀 때 알림:", on() ? "켜짐" : "꺼짐", "· 아기", babyKey(), "· 목록", p.length + "개");
        p.forEach(function (x) { console.log(new Date(x.at).toLocaleString("ko-KR"), x.id, "·", x.t, "—", x.b, "→", x.link); });
        return p;
    };
})();
