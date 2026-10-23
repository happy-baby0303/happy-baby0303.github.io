/* ============================================================
   배냇함 — 하루 끝, 짝꿍 폰으로 (daysend.js)

   밤에 영수증(오늘 하루)을 열면 아래에 '짝꿍 폰에도 보내기' 가 붙는다.
   누르면 짝꿍 폰에 알림이 간다.

       🧾 꿈이의 오늘 하루가 왔어요
       맘마 8번 · 잠 12시간 40분 · 기저귀 7개

   알림만 봐도 하루가 보이고, 누르면 그날 영수증이 열린다 (?go=receipt&d=날짜 — 다음 날 아침에 눌러도 그날 것).
   회사에 있던 사람이 '오늘 어땠어?' 를 묻기 전에 먼저 아는 것. 그게 짝꿍 고리다.

   ⚠️ 제목을 '엄마가 꿈이의 오늘 하루를 보냈어요' 로 쓰면 '하루를 지냈다' 로도 읽힌다. 이번 주 꿈이처럼 '… 왔어요' 로 쓴다.
   ⚠️ 저절로 보내지 않는다. 누른 사람이 보낸다 (밤마다 알림이 오면 그건 소음이다).
   ⚠️ 가족방에 나밖에 없으면 '보냈어요' 가 거짓말이 된다. 그때는 짝꿍 초대를 연다 (weekly.js 와 같은 확인).
   ⚠️ 짝꿍 폰 알림이 꺼져 있어도 서버는 오류 없이 { success:false } 로 답한다. 그건 보낸 게 아니다 (weekly.js familyPushResult).
   ⚠️ 돌봄 도우미 폰에는 보내지 않는다 (skipRoles — 서버 함수 배포 뒤부터 걸러진다).

   저장: tosil_day_sent (아기마다 · script.js BABY_SPECIFIC_KEYS) = 보낸 날 'YYYY-MM-DD'
   index.html 에서 bedtime.js · weekly.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';
    if (window.__daySendOn) return;
    window.__daySendOn = true;

    var KEY = "tosil_day_sent", BTN = "rc-send";
    var INK = "#3B322C", LINE = "#EFE7DC", SUB = "#8A7F76";

    /* 알림을 눌러 들어왔으면 그날 영수증을 연다. ⚠️ script.js 가 DOMContentLoaded 에서 ?go= 를 지우니 지금 적어 둔다 */
    var GO = null;
    try {
        var q = new URLSearchParams(location.search);
        if (q.get("go") === "receipt") GO = /^\d{4}-\d{2}-\d{2}$/.test(q.get("d") || "") ? q.get("d") : "";
    } catch (e) {}

    function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function toast(m) { if (typeof window.showToast === "function") window.showToast(m); }
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    function keyOf(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
    function babyName() { return String(get("tosil_babyName") || "").trim() || "우리 아기"; }
    function hm(mins) {
        mins = Math.round(mins);
        var h = Math.floor(mins / 60), m = mins % 60;
        return h ? h + "시간" + (m ? " " + m + "분" : "") : m + "분";
    }
    function canTell() {
        var c = get("family_sync_code");
        return !!(c && c.indexOf("unlinked") < 0 && get("tosil_role_locked") !== "viewer" && get("user_role") !== "senior");
    }

    /* 그날 숫자 — 영수증과 같은 셈 (잠은 그날 0시~24시 안에 든 만큼) */
    function dayLine(k) {
        var p = String(k).split("-").map(Number);
        var s0 = new Date(p[0], p[1] - 1, p[2]).getTime(), e0 = s0 + 86400000;
        var recs = [];
        try { recs = JSON.parse(localStorage.getItem("tosil_tracker_records")) || []; } catch (e) {}
        var feed = 0, food = 0, diaper = 0, sleep = 0;
        recs.forEach(function (r) {
            var ts = Number(r && r.timestamp) || 0;
            if (r && r.type === "sleep") {
                var sr = window.getSleepRange ? window.getSleepRange(r)
                       : { start: ts, end: r.endTs ? Number(r.endTs) : ts + (Number(r.amount) || 0) * 60000 };
                if (sr.end - sr.start <= 20 * 3600000 && typeof window.minsInRange === "function") sleep += window.minsInRange(sr.start, sr.end, s0, e0);
                return;
            }
            if (ts < s0 || ts >= e0) return;
            if (r.type === "feed") { if (r.subType === "이유식") food++; else feed++; }
            else if (r.type === "diaper") diaper++;
        });
        var since = Number(get("tosil_sleep_start")) || 0;
        if (since && keyOf(new Date()) === k && typeof window.minsInRange === "function") sleep += window.minsInRange(since, Date.now(), s0, e0);
        var bits = [];
        if (feed) bits.push("맘마 " + feed + "번");
        if (food) bits.push("이유식 " + food + "번");
        if (sleep >= 1) bits.push("잠 " + hm(sleep));
        if (diaper) bits.push("기저귀 " + diaper + "개");
        return bits.join(" · ");
    }

    /* ---------- 영수증 아래 단추 ---------- */
    var DAY = null;    // 지금 열린 영수증의 날
    function paintButton() {
        var modal = document.getElementById("receipt-modal");
        if (!modal || modal.style.display === "none") return;
        var box = modal.firstElementChild, row = box && box.lastElementChild;
        if (!row || row.id === "receipt-content") return;
        var old = document.getElementById(BTN);
        if (!canTell() || !dayLine(DAY)) { if (old) old.remove(); return; }
        /* ⚠️ 영수증을 화면 높이에 맞추는 fitReceipt 는 '맨 아래 단추 줄' 의 높이를 뺀다.
              그 줄 안에 넣어야(한 줄 더 차지) 계산이 맞는다. 밖에 붙이면 영수증이 단추에 가려졌다. */
        row.style.flexWrap = "wrap";
        var sent = get(KEY) === DAY;
        var b = old || document.createElement("button");
        b.id = BTN;
        b.type = "button";
        b.setAttribute("style", "flex:1 0 100%; padding:13px; border-radius:12px; font-size:14px; font-weight:800; cursor:" + (sent ? "default" : "pointer") + "; " +
            "border:1px solid " + LINE + "; background:" + (sent ? "#F5EFE6" : "#FFFFFF") + "; color:" + (sent ? SUB : INK) + "; font-family:inherit;");
        b.textContent = sent ? "짝꿍 폰에 보냈어요" : "짝꿍 폰에도 보내기";
        b.onclick = sent ? null : window.__daySend;
        if (!old) row.appendChild(b);
        if (typeof window.fitReceipt === "function") { try { window.fitReceipt(); } catch (e) {} }
        if (!sent && typeof window.familyHasPartner === "function") {
            window.familyHasPartner().then(function (has) {
                if (has === false && document.getElementById(BTN) === b) inviteInstead(b);
            });
        }
    }

    function inviteInstead(b) {
        if (!b) return;
        b.textContent = "짝꿍을 초대하면 짝꿍 폰에도 가요";
        b.onclick = function () {
            var m = document.getElementById("receipt-modal"); if (m) m.style.display = "none";
            var nm = document.getElementById("invite-baby-name"); if (nm) nm.innerText = babyName();
            var sh = document.getElementById("invite-bottom-sheet"); if (sh) sh.style.display = "flex";
        };
    }

    window.__daySend = function () {
        var k = DAY, line = dayLine(k);
        if (!k || !line) return;
        if (!canTell() || !window.functions || typeof window.httpsCallable !== "function") return toast("가족 연결을 하면 짝꿍 폰에도 보낼 수 있어요");
        var b = document.getElementById(BTN);
        if (b) { b.style.opacity = "0.5"; b.onclick = null; }
        var isToday = keyOf(new Date()) === k;
        window.httpsCallable(window.functions, "sendFamilyPush")({
            syncCode: get("family_sync_code"),
            excludeUid: (typeof window.myUid === "function") ? window.myUid() : null,
            excludeToken: (typeof window.myPushToken === "function") ? window.myPushToken() : null,
            title: "🧾 " + babyName() + "의 " + (isToday ? "오늘" : Number(k.slice(5, 7)) + "월 " + Number(k.slice(8)) + "일") + " 하루가 왔어요",
            body: line,
            link: "index.html?go=receipt&d=" + k,
            skipRoles: ["viewer"]
        }).then(function (r) {
            var how = (typeof window.familyPushResult === "function") ? window.familyPushResult(r)
                    : ((r && r.data && r.data.success === false) ? "failed" : "sent");
            if (how === "sent") {
                try { localStorage.setItem(KEY, k); } catch (e) {}
                paintButton();
                return toast("짝꿍 폰에 보냈어요");
            }
            if (b) { b.style.opacity = ""; b.onclick = window.__daySend; }
            if (how === "nopartner") { inviteInstead(b); return toast("짝꿍이 아직 가족방에 없어요"); }
            if (how === "notoken") {
                if (b) b.textContent = "짝꿍 폰 알림이 꺼져 있어요 · 다시 보내기";
                return toast("짝꿍 폰 알림이 꺼져 있어요. '이미지 저장' 으로 보내 볼까요");
            }
            toast("알림을 못 보냈어요. 잠시 뒤에 다시 눌러 주세요");
        }).catch(function (e) {
            console.warn("[하루 끝] 알림 실패", e);
            if (b) { b.style.opacity = ""; b.onclick = window.__daySend; }
            toast("알림을 못 보냈어요. 잠시 뒤에 다시 눌러 주세요");
        });
    };

    /* 영수증을 열 때마다 (bedtime.js 가 이미 감싼 것 위에 한 겹 더 — 원본은 안 고친다) */
    var tries = 0;
    (function hook() {
        var f = window.openReceiptModal;
        if (typeof f !== "function") { if (++tries < 30) setTimeout(hook, 500); return; }
        if (f.__daySend) return;
        var w = function (dayKey) {
            DAY = (typeof dayKey === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dayKey)) ? dayKey : keyOf(new Date());
            var out = f.apply(this, arguments);
            try { paintButton(); } catch (e) {}
            return out;
        };
        w.__daySend = true;
        window.openReceiptModal = w;
    })();

    function boot() {
        if (GO === null) return;
        setTimeout(function () {
            try { if (typeof window.switchTab === "function") window.switchTab("home", document.getElementById("nav-home")); } catch (e) {}
            if (typeof window.openReceiptModal === "function") window.openReceiptModal(GO || keyOf(new Date()));
        }, 1600);
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    window.daySendDebug = function (k) { k = k || keyOf(new Date()); console.log(k, "·", dayLine(k) || "(기록 없음)", "· 보낸 날:", get(KEY) || "없음"); };
})();
