/* ============================================================
   배냇함 — 역할 자물쇠 (rolelock.js)

   화면에서 가리는 건 잠금이 아니다.
   시터가 설정 탭에서 '엄마'를 누르면 그만이었다.
   그러면 가계부도 문답도 다 보인다. 돈 받고 파는 기능인데.

   진짜 자물쇠는 서버에 있어야 한다.
   families/{코드}.members[내uid] 가 유일한 진실이다.

   하는 일 셋
     1. 앱을 켤 때마다 서버에 내 역할을 다시 묻는다
     2. viewer 면 기기에 자물쇠를 채운다 (앱 데이터를 지워도 다시 채워진다)
     3. 서버에서 역할이 바뀌면 즉시 따라간다 (부모가 권한을 회수할 수 있다)

   ⚠️ 이건 1차 방어선이다.
      진짜 방어는 보안 규칙이 시터에게 데이터를 안 내려주는 것이다.
      화면 잠금은 실수를 막고, 보안 규칙은 고의를 막는다.

   index.html 에서 script.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var LOCK = "tosil_role_locked";

    function syncCode() { return localStorage.getItem("family_sync_code"); }

    function myUid() {
        return (window.auth && window.auth.currentUser && window.auth.currentUser.uid) ||
               localStorage.getItem("firebase_uid") || "";
    }

    /* ---------- 서버가 정한 역할 ---------- */

    function applyRole(serverRole) {
        if (!serverRole) return;

        if (serverRole === "viewer") {
            localStorage.setItem(LOCK, "viewer");

            // 다른 모드로 켜져 있으면 즉시 되돌린다
            if (localStorage.getItem("user_role") !== "senior") {
                localStorage.setItem("user_role", "senior");
                document.body.classList.remove("mode-dad");
                document.body.classList.add("mode-senior");
                if (typeof window.renderSettingsTab === "function") window.renderSettingsTab();
                if (typeof window.showToast === "function") {
                    window.showToast("돌봄 도우미 모드로 연결되어 있어요");
                }
            }
        } else {
            // 부모가 권한을 올려줬으면 자물쇠를 푼다
            if (localStorage.getItem(LOCK)) {
                localStorage.removeItem(LOCK);
                if (typeof window.showToast === "function") {
                    window.showToast("가족 권한이 열렸어요");
                }
                if (typeof window.renderSettingsTab === "function") window.renderSettingsTab();
            }
        }
    }

    /* ---------- 켤 때 한 번 물어본다 ---------- */

    window.verifyMyRole = async function () {
        var code = syncCode(), uid = myUid();
        if (!code || !uid) return null;
        if (!window.db || typeof window.getDoc !== "function") return null;

        try {
            var snap = await window.getDoc(window.doc(window.db, "families", code));
            if (!snap.exists()) return null;

            var m = (snap.data() || {}).members;
            if (!m) return null;

            // 옛 구조(배열)면 아직 이전 전이다. 건드리지 않는다.
            if (Array.isArray(m)) return null;

            var role = m[uid] || null;
            applyRole(role);
            return role;
        } catch (e) {
            console.warn("[역할] 확인 실패", e);
            return null;
        }
    };

    /* ---------- 서버에서 바뀌면 따라간다 ----------
       부모가 시터 권한을 회수하면 그 폰에서 바로 반영된다. -------- */

    var unsub = null;

    window.watchMyRole = function () {
        var code = syncCode(), uid = myUid();
        if (!code || !uid) return;
        if (!window.db || typeof window.onSnapshot !== "function") return;
        if (unsub) { try { unsub(); } catch (e) {} unsub = null; }

        var u = window.onSnapshot(window.doc(window.db, "families", code), function (snap) {
            if (!snap.exists()) return;
            var m = (snap.data() || {}).members;
            if (!m || Array.isArray(m)) return;
            applyRole(m[uid] || null);
        }, function (e) {
            console.warn("[역할] 실시간 확인 에러", e);
        });

        unsub = (typeof window.addLiveListener === "function") ? window.addLiveListener(u) : u;
    };

    /* ---------- 도우미 ---------- */

    window.isViewerLocked = function () {
        return localStorage.getItem(LOCK) === "viewer";
    };

    /* ---------- 엄마 · 아빠 폰을 잠깐 맡길 때 (도우미 화면 잠금) ----------
       서버가 viewer 로 정한 폰은 위 자물쇠가 막는다.
       그런데 엄마 폰을 할머니께 잠깐 맡기며 설정에서 '돌봄 도우미' 를 누른 경우는
       서버 역할이 엄마 그대로라, 설정에서 '엄마' 만 누르면 가계부 · 문답이 다 열렸다.
       → 도우미 화면으로 들어갈 때 숫자 4자리를 정하고, 나올 때 그 숫자를 묻는다.
         잊어버리면 가족 코드(TS-…)로 푼다. 엄마 · 아빠는 설정에서 볼 수 있고, 맡긴 분은 모른다. */
    var PIN = "tosil_sitter_pin";
    async function hash(s) {
        try {
            var b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("baenaet-sitter:" + s));
            return Array.from(new Uint8Array(b)).map(function (x) { return x.toString(16).padStart(2, "0"); }).join("");
        } catch (e) { return "p:" + s; }
    }
    function toast(m) { if (typeof window.showToast === "function") window.showToast(m); }
    function box(inner) {
        var old = document.getElementById("pin-sheet"); if (old) old.remove();
        var w = document.createElement("div");
        w.id = "pin-sheet";
        w.setAttribute("style", "position:fixed;inset:0;z-index:10000002;background:rgba(43,36,30,0.5);display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;");
        w.innerHTML = '<div style="width:100%;max-width:340px;background:var(--bg-card,#FFF);border-radius:22px;padding:26px 22px 20px;box-sizing:border-box;text-align:center;">' + inner + '</div>';
        document.body.appendChild(w);
        var inp = w.querySelector("input"); if (inp) setTimeout(function () { inp.focus(); }, 60);
        return w;
    }
    function close() { var s = document.getElementById("pin-sheet"); if (s) s.remove(); }
    var INPUT = 'style="width:100%;box-sizing:border-box;margin-top:16px;padding:14px;border:1px solid var(--border,#EDE6DE);border-radius:14px;' +
                'font-size:24px;font-weight:800;letter-spacing:12px;text-align:center;font-family:inherit;color:var(--text-m,#4A413C);background:#FFF;"';
    function btns(okLabel, okAct) {
        return '<div style="display:flex;gap:8px;margin-top:16px;">' +
            '<div onclick="window.__pinCancel()" style="flex:1;padding:14px;border-radius:14px;border:1px solid var(--border,#EDE6DE);font-size:14.5px;font-weight:700;color:var(--text-s,#8A7F76);cursor:pointer;">취소</div>' +
            '<div onclick="' + okAct + '" style="flex:1.4;padding:14px;border-radius:14px;background:#4A413C;color:#FFF;font-size:14.5px;font-weight:800;cursor:pointer;">' + okLabel + '</div></div>';
    }
    var MSG = '<div id="pin-msg" style="font-size:12.5px;font-weight:700;color:#B42318;min-height:18px;margin-top:8px;"></div>';
    var pending = null, first = "", tries = 0, waitUntil = 0;

    function askNew(done) {
        pending = done; first = "";
        box('<div style="font-size:18px;font-weight:800;color:var(--text-m,#4A413C);">나올 때 쓸 숫자 4자리</div>' +
            '<div style="font-size:13px;font-weight:600;color:var(--text-sub,#8A7F76);line-height:1.7;margin-top:8px;word-break:keep-all;">' +
                '도우미 화면에서 엄마 · 아빠 화면으로 돌아올 때 물어볼게요. 맡기시는 분이 모르는 숫자로 정해 주세요.</div>' +
            '<input id="pin-in" type="password" inputmode="numeric" maxlength="4" autocomplete="off" ' + INPUT + '>' + MSG +
            btns("다음", "window.__pinNew()"));
    }
    window.__pinNew = async function () {
        var inp = document.getElementById("pin-in"), msg = document.getElementById("pin-msg");
        var v = ((inp || {}).value || "").trim();
        if (!/^\d{4}$/.test(v)) { if (msg) msg.textContent = "숫자 4자리로 정해 주세요"; return; }
        if (!first) {
            first = v; inp.value = ""; inp.focus();
            if (msg) { msg.style.color = "var(--text-sub,#8A7F76)"; msg.textContent = "한 번 더 눌러 주세요"; }
            return;
        }
        if (v !== first) {
            first = ""; inp.value = "";
            if (msg) { msg.style.color = "#B42318"; msg.textContent = "두 번이 달라요. 처음부터 다시 정해 주세요"; }
            return;
        }
        try { localStorage.setItem(PIN, await hash(v)); } catch (e) {}
        close(); var d = pending; pending = null; if (d) d();
    };
    function askPin(done) {
        pending = done;
        box('<div style="font-size:18px;font-weight:800;color:var(--text-m,#4A413C);">엄마 · 아빠 화면으로 돌아가요</div>' +
            '<div style="font-size:13px;font-weight:600;color:var(--text-sub,#8A7F76);line-height:1.7;margin-top:8px;">정해 둔 숫자 4자리를 눌러 주세요.</div>' +
            '<input id="pin-in" type="password" inputmode="numeric" maxlength="4" autocomplete="off" ' + INPUT + '>' + MSG +
            btns("확인", "window.__pinCheck()") +
            '<div onclick="window.__pinForgot()" style="font-size:12.5px;font-weight:700;color:var(--text-sub,#8A7F76);margin-top:14px;cursor:pointer;">숫자를 잊었어요</div>');
    }
    window.__pinCheck = async function () {
        var msg = document.getElementById("pin-msg"), inp = document.getElementById("pin-in");
        if (Date.now() < waitUntil) { if (msg) msg.textContent = "잠시 뒤에 다시 해 주세요"; return; }
        if ((await hash(((inp || {}).value || "").trim())) === localStorage.getItem(PIN)) {
            tries = 0; close(); var d = pending; pending = null; if (d) d(); return;
        }
        tries++;
        if (tries >= 5) { waitUntil = Date.now() + 30000; tries = 0; if (msg) msg.textContent = "다섯 번 틀렸어요. 30초 뒤에 다시 해 주세요"; }
        else if (msg) msg.textContent = "숫자가 달라요";
        if (inp) { inp.value = ""; inp.focus(); }
    };
    window.__pinForgot = function () {
        box('<div style="font-size:18px;font-weight:800;color:var(--text-m,#4A413C);">가족 코드로 풀기</div>' +
            '<div style="font-size:13px;font-weight:600;color:var(--text-sub,#8A7F76);line-height:1.7;margin-top:8px;word-break:keep-all;">' +
                '엄마나 아빠 폰의 설정에 있는 가족 코드(TS-로 시작)를 넣어 주세요.</div>' +
            '<input id="pin-code" type="text" autocomplete="off" autocapitalize="characters" style="width:100%;box-sizing:border-box;margin-top:16px;padding:14px;' +
                'border:1px solid var(--border,#EDE6DE);border-radius:14px;font-size:17px;font-weight:700;text-align:center;font-family:inherit;color:var(--text-m,#4A413C);background:#FFF;">' +
            MSG + btns("풀기", "window.__pinByCode()"));
    };
    window.__pinByCode = function () {
        var v = ((document.getElementById("pin-code") || {}).value || "").trim().toUpperCase().replace(/\s/g, "");
        var code = String(syncCode() || "").toUpperCase();
        if (code && v === code) {
            try { localStorage.removeItem(PIN); } catch (e) {}
            close(); var d = pending; pending = null; if (d) d();
            toast("숫자를 지웠어요. 다음에 맡길 때 새로 정해요");
        } else { var msg = document.getElementById("pin-msg"); if (msg) msg.textContent = "가족 코드가 달라요"; }
    };
    window.__pinCancel = function () { pending = null; first = ""; close(); };

    (function wrapRoleChange() {
        var orig = window.changeUserRole;
        if (typeof orig !== "function" || orig.__pin) return;
        var w = function (role) {
            var self = this, args = arguments, cur = localStorage.getItem("user_role") || "mom";
            if (window.isViewerLocked()) return orig.apply(self, args);               // 서버가 정한 도우미 — script.js 쪽 자물쇠가 막는다
            if (role === "senior" && cur !== "senior") {
                if (typeof window.isPremiumUser === "function" && !window.isPremiumUser()) return orig.apply(self, args);   // 결제 안내가 먼저
                askNew(function () { orig.apply(self, args); });
                return;
            }
            if (cur === "senior" && role !== "senior" && localStorage.getItem(PIN)) {
                askPin(function () { orig.apply(self, args); });
                return;
            }
            return orig.apply(self, args);
        };
        w.__pin = true;
        window.changeUserRole = w;
    })();


    /* ---------- 시작 ---------- */

    function boot() {
        setTimeout(function () {
            window.verifyMyRole();
            window.watchMyRole();
        }, 3000);

        // 앱으로 돌아올 때마다 다시 확인한다
        document.addEventListener("visibilitychange", function () {
            // 실시간 감시(watchMyRole)가 이미 따라간다. 돌아올 때마다 다시 묻지 않고 10분에 한 번만 (읽기 비용)
            if (!document.hidden && Date.now() - (window.__roleCheckedAt || 0) > 10 * 60000) {
                window.__roleCheckedAt = Date.now();
                setTimeout(window.verifyMyRole, 500);
            }
        });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    /* ---------- 점검용 ---------- */
    window.roleDebug = async function () {
        console.log("가족 코드:", syncCode() || "없음");
        console.log("내 uid:", myUid() || "없음");
        console.log("기기의 역할:", localStorage.getItem("user_role") || "없음");
        console.log("자물쇠:", localStorage.getItem(LOCK) || "없음");
        var r = await window.verifyMyRole();
        console.log("서버가 정한 역할:", r === null ? "확인 실패 또는 옛 구조" : r);
    };
})();