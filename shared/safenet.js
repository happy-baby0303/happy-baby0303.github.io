/* ============================================================
   배냇함 — 안전망 (shared/safenet.js)

   어제 이런 일이 있었다.

       strollerown.js 에서 없는 변수(bad)를 쓰는 코드가 한 줄 들어갔다
       → 그 파일이 그리는 카드 다섯 개가 통째로 안 그려졌다
       → 그런데 앱은 아무 말도 안 했다. 화면만 조용히 비었다

   만든 사람은 콘솔을 열어보고 알았지만, 쓰는 사람은 모른다.
   "왜 없어졌지" 하고 지운다. 그게 제일 무서운 실패다.

   이 파일이 하는 일 셋

     1. 화면 그리는 함수(refresh… render… paint… mount…)를 감싼다.
        한 곳이 죽어도 그 카드만 비고, 나머지 화면은 그대로 산다.

     2. 오류를 폰에 적어둔다. 마지막 30건.
        같은 오류가 반복되면 줄을 늘리지 않고 횟수만 센다.

     3. 설정 탭에 '문제 기록' 칸을 띄운다 (오류가 있을 때만).
        누르면 내용이 복사돼서, 사용자가 개발자에게 그대로 보낼 수 있다.

   ⚠️ 사용자에게 오류창을 띄우지 않는다.
      새벽에 아기 보는 사람에게 "TypeError" 를 보여주는 건 도움이 아니다.
      조용히 적어두고, 화면은 최대한 살려둔다.

   ⚠️ 서버로 보내지 않는다. 폰 안에만 남는다.
      오류 메시지에 아기 이름이나 기록이 섞여 들어갈 수 있다.

   ⚠️ 제일 먼저 로드해야 한다.
      본 앱     : <head> 안, theme.js 다음
      큐레이터  : index.html 의 첫 번째 <script>
   ============================================================ */
(function () {
    'use strict';

    if (window.__safeNetOn) return;
    window.__safeNetOn = true;

    var KEY  = "tosil_errlog";
    var MAX  = 30;
    var CARD = "safenet-card";

    function pageName() {
        var p = String(location.pathname || "").split("/").filter(Boolean);
        var last = p[p.length - 1] || "index.html";
        var dir  = p[p.length - 2] || "";
        return (dir && last === "index.html") ? dir : last;
    }

    function load() {
        try {
            var v = JSON.parse(localStorage.getItem(KEY));
            return Array.isArray(v) ? v : [];
        } catch (e) { return []; }
    }

    function save(list) {
        try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
    }

    function push(kind, msg, where) {
        try {
            var list = load();
            var sig  = kind + "|" + String(msg).slice(0, 120) + "|" + where;

            /* 같은 오류가 1초에 수십 번 나는 경우가 있다 (타이머 안에서 나면).
               줄을 늘리지 않고 횟수만 센다. */
            for (var i = 0; i < list.length; i++) {
                if (list[i].sig === sig) {
                    list[i].n  = (list[i].n || 1) + 1;
                    list[i].at = Date.now();
                    var hit = list.splice(i, 1)[0];
                    list.unshift(hit);
                    save(list);
                    return;
                }
            }

            list.unshift({
                sig: sig, kind: kind,
                msg: String(msg == null ? "" : msg).slice(0, 300),
                where: String(where || "").slice(0, 140),
                page: pageName(), at: Date.now(), n: 1
            });
            if (list.length > MAX) list.pop();
            save(list);
        } catch (e) {}
    }
    window.noteAppError = push;

    /* ---------- 1. 받아 적기 ---------- */

    window.addEventListener("error", function (e) {
        if (!e) return;
        var where = String((e.filename || "")).split("/").pop();
        if (e.lineno) where += ":" + e.lineno;
        push("오류", (e.message || "알 수 없는 오류"), where);
    });

    window.addEventListener("unhandledrejection", function (e) {
        var r = e && e.reason;
        push("약속", (r && (r.message || r.code || r)) || "처리 못 한 약속", "");
    });

    /* ---------- 2. 화면 그리는 함수 감싸기 ----------
       한 카드가 죽어도 그 카드만 비고 나머지는 그려지게. -------- */

    var RE = /^(refresh|render|update|paint|draw|mount|tidy|open|close|switch)[A-Z]/;

    function guard(name) {
        var f = window[name];
        if (typeof f !== "function" || f.__safe) return;

        var wrapped = function () {
            try {
                return f.apply(this, arguments);
            } catch (err) {
                push("화면", name + " — " + ((err && err.message) || err), (err && err.stack || "").split("\n")[1] || "");
                if (window.console && console.warn) console.warn("[안전망] " + name + " 에서 멈췄습니다", err);
                return null;
            }
        };
        wrapped.__safe = true;

        /* ⚠️ 다른 파일들이 '이미 감쌌나' 를 표시로 확인한다 (__cook · __lay · __gift …).
              그 표시를 그대로 옮겨야 두 번 감싸지 않는다. */
        try {
            Object.keys(f).forEach(function (k) { wrapped[k] = f[k]; });
        } catch (e) {}

        try { window[name] = wrapped; } catch (e) {}
    }

    function guardAll() {
        var n = 0;
        for (var k in window) {
            try {
                if (RE.test(k) && typeof window[k] === "function" && !window[k].__safe) { guard(k); n++; }
            } catch (e) {}
        }
        return n;
    }
    window.guardAppRenders = guardAll;

    /* 모듈이 늦게 붙는 것도 있어서 몇 번 나눠 훑는다 */
    [400, 1500, 3500, 7000].forEach(function (t) { setTimeout(guardAll, t); });
    document.addEventListener("visibilitychange", function () {
        if (!document.hidden) setTimeout(guardAll, 400);
    });

    /* ---------- 3. 설정 탭의 '문제 기록' ----------
       오류가 있을 때만 뜬다. 평소엔 아무것도 안 보인다. -------- */

    function when(ts) {
        var d = new Date(ts);
        return (d.getMonth() + 1) + "/" + d.getDate() + " " +
               String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    }

    window.appErrorText = function () {
        var list = load();
        if (!list.length) return "문제 기록이 없습니다.";
        return "배냇함 문제 기록 " + list.length + "건\n" +
            "(" + new Date().toLocaleString() + " 기준)\n\n" +
            list.map(function (x) {
                return "· " + when(x.at) + " [" + x.page + "] " + x.kind +
                       (x.n > 1 ? " ×" + x.n : "") + "\n  " + x.msg + (x.where ? "\n  " + x.where : "");
            }).join("\n\n");
    };

    window.copyAppErrors = function () {
        var txt = window.appErrorText();
        var done = function () {
            if (typeof window.showToast === "function") window.showToast("문제 기록을 복사했어요");
            else if (typeof window.foodToast === "function") window.foodToast("문제 기록을 복사했어요");
        };
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(txt).then(done).catch(function () { prompt("아래 내용을 복사해 주세요", txt); });
                return;
            }
        } catch (e) {}
        prompt("아래 내용을 복사해 주세요", txt);
    };

    window.clearAppErrors = function () {
        try { localStorage.removeItem(KEY); } catch (e) {}
        var el = document.getElementById(CARD);
        if (el) el.remove();
        if (typeof window.showToast === "function") window.showToast("문제 기록을 지웠어요");
    };

    function cardHTML(n) {
        return '<div style="display:flex; align-items:center; gap:13px;">' +
            '<div style="font-size:20px; flex-shrink:0;">🧰</div>' +
            '<div style="flex:1; min-width:0;">' +
                '<div style="font-size:14px; font-weight:900; color:var(--text-m);">문제 기록 ' + n + '건</div>' +
                '<div style="font-size:11.5px; font-weight:600; color:var(--text-sub); margin-top:2px; ' +
                    'word-break:keep-all; line-height:1.55;">' +
                    '화면이 비거나 이상했던 순간이 적혀 있어요. 눌러서 복사한 뒤 보내주시면 고치는 데 큰 도움이 됩니다.</div>' +
            '</div>' +
            '<div onclick="event.stopPropagation(); window.clearAppErrors()" ' +
                'style="flex-shrink:0; font-size:11.5px; font-weight:800; color:var(--text-sub); ' +
                'padding:8px 10px; cursor:pointer;">지우기</div>' +
        '</div>';
    }

    function mountCard() {
        var host = document.getElementById("tab-settings");
        if (!host) return;                       // 큐레이터에는 설정 탭이 없다
        var list = load();
        var old = document.getElementById(CARD);

        if (!list.length) { if (old) old.remove(); return; }

        if (old) { old.innerHTML = cardHTML(list.length); return; }

        var box = document.createElement("div");
        box.id = CARD;
        box.className = "bnh-settings-card";
        box.style.cssText = "display:block; background:var(--bg-card); padding:18px 20px; border-radius:16px; " +
            "border:1px solid var(--border); margin-bottom:12px; box-sizing:border-box; width:100%; cursor:pointer;";
        box.innerHTML = cardHTML(list.length);
        box.onclick = window.copyAppErrors;
        host.appendChild(box);
    }
    window.refreshErrorCard = mountCard;

    (function hookSettings() {
        var origin = window.renderSettingsTab;
        window.renderSettingsTab = function () {
            var out;
            if (typeof origin === "function") out = origin.apply(this, arguments);
            setTimeout(mountCard, 60);
            return out;
        };
    })();

    setTimeout(mountCard, 2500);

    /* ---------- 점검용 ---------- */
    window.safeNetDebug = function () {
        var list = load();
        console.log("감싼 화면 함수:", (function () {
            var n = 0;
            for (var k in window) { try { if (RE.test(k) && window[k] && window[k].__safe) n++; } catch (e) {} }
            return n;
        })() + "개");
        console.log("문제 기록:", list.length + "건");
        list.forEach(function (x) {
            console.log("   " + when(x.at) + " [" + x.page + "] " + x.kind + (x.n > 1 ? " ×" + x.n : "") + " — " + x.msg);
        });
        console.log("복사하려면: copyAppErrors()  ·  지우려면: clearAppErrors()");
    };
})();