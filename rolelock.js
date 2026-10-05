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
                    var lb = window.helperLabel ? window.helperLabel() : "";
                    window.showToast(isFamilyLabel(lb) ? lb + " 화면으로 연결됐어요" : "돌봄 화면으로 연결됐어요");
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

            if (checkRemoved(m, uid)) return null;
            rememberMyLabel(snap.data() || {});
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
            if (checkRemoved(m, uid)) return;
            rememberMyLabel(snap.data() || {});
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



    /* ---------- 같은 권한, 다른 이름 (조부모 · 시터) ----------
       할머니 · 할아버지와 시터 선생님은 권한이 같다(둘 다 viewer). 그런데 화면이 둘을 똑같이
       '돌봄 도우미' 라고 부르고, 출근 도장('왔어요')까지 찍게 하면 할머니는 남 취급받는 기분이 든다.
       → 초대할 때 누구인지 고르고(inviteLabel), 가족 문서 labels[uid] 에 이름을 남긴다.
         이름에 따라 말투와 카드가 달라진다. 권한(보안 규칙)은 그대로다. */
    var LABELS = ["할머니", "할아버지", "시터 선생님", "가족"];
    var ICON = { "할머니": "👵", "할아버지": "👴", "시터 선생님": "🧑‍🍼", "가족": "🏠" };   // 시터: 아기를 돌보는 사람
    function isFamilyLabel(l) { return l === "할머니" || l === "할아버지" || l === "가족"; }
    window.helperLabel = function () { return localStorage.getItem("tosil_helper_label") || ""; };
    window.helperIsFamily = function () { return isFamilyLabel(window.helperLabel()); };
    function rememberMyLabel(fam) {
        var me = myUid(), l = fam && fam.labels && fam.labels[me];
        if (l && LABELS.indexOf(l) > -1) { try { localStorage.setItem("tosil_helper_label", l); } catch (e) {} }
    }
    window.__rememberMyLabel = rememberMyLabel;

    /* ---------- 우리 가족 (설정) — 누가 들어와 있는지 보고, 돌봄 도우미를 내보낸다 ----------
       ⚠️ 시터 일이 끝나도 내보낼 방법이 없었다. 그 폰은 계속 기록을 보고 남길 수 있었고,
          무료는 도우미 한 명이라 새 분을 초대할 수도 없었다.
       엄마 · 아빠(보호자)는 서로 못 내보낸다. 도우미만 내보낸다 (실수로 짝꿍을 잠그지 않게). */
    var famCache = null, famAt = 0;
    function roleName(r) { return r === "viewer" ? "돌봄 도우미" : (r === "member" ? "가족" : "보호자"); }
    async function loadFamily(force) {
        var code = syncCode();
        if (!code || !window.db || typeof window.getDoc !== "function") return null;
        if (!force && famCache && Date.now() - famAt < 60000) return famCache;
        try {
            var s = await window.getDoc(window.doc(window.db, "families", code));
            famCache = s.exists() ? (s.data() || {}) : null; famAt = Date.now();
        } catch (e) { famCache = null; }
        return famCache;
    }
    async function paintMembers() {
        var card = document.getElementById("family-members-card");
        if (!card) return;
        var fam = await loadFamily(false), m = fam && fam.members;
        if (!m || Array.isArray(m)) { card.style.display = "none"; return; }
        var labels = Object.assign({}, fam.labels || {});
        /* 방금 초대한 사람(이름표 없는 도우미가 딱 한 명)에게 초대할 때 고른 이름을 붙인다 */
        var unnamed = Object.keys(m).filter(function (u) { return m[u] === "viewer" && !labels[u]; });
        if (fam.inviteLabel && unnamed.length === 1 && typeof window.updateDoc === "function") {
            labels[unnamed[0]] = fam.inviteLabel;
            try { await window.updateDoc(window.doc(window.db, "families", syncCode()), { labels: labels, inviteLabel: "" }); famCache = null; } catch (e) {}
        }
        card.style.display = "";
        var me = myUid(), ids = Object.keys(m), helpers = 0;
        var rows = ids.sort(function (a, b) { return (m[a] === "viewer") - (m[b] === "viewer") || (a === me ? -1 : b === me ? 1 : 0); }).map(function (uid) {
            var r = m[uid], isMe = uid === me, n = r === "viewer" ? ++helpers : 0, lb = r === "viewer" ? (labels[uid] || "") : "";
            return '<div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-top:1px solid var(--border);">' +
                '<span style="width:34px;height:34px;border-radius:12px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:16px;background:' +
                    (r === "viewer" ? "#F3EFE9" : "#EFEDFB") + ';">' + (r === "viewer" ? (ICON[lb] || "🤝") : "🏠") + '</span>' +
                '<div style="flex:1;min-width:0;font-size:14.5px;font-weight:700;color:var(--text-m);">' + (lb || roleName(r)) + (!lb && n && helpers > 1 ? ' ' + n : '') +
                    (r === "viewer" ? ' <span onclick="window.__nameHelper(\'' + uid + '\')" style="font-size:11.5px;font-weight:700;color:var(--text-sub);cursor:pointer;margin-left:4px;">' + (lb ? '바꾸기' : '이름 붙이기') + '</span>' : '') +
                    (isMe ? ' <span style="font-size:11.5px;font-weight:800;color:#7F77DD;background:#EFEDFB;padding:2px 7px;border-radius:7px;margin-left:4px;">나</span>' : '') + '</div>' +
                (r === "viewer" && !isMe ? '<span onclick="window.__kickHelper(\'' + uid + '\')" style="font-size:12.5px;font-weight:800;color:var(--text-sub);' +
                    'border:1px solid var(--border);padding:7px 11px;border-radius:10px;cursor:pointer;">' + (isFamilyLabel(lb) ? '연결 끊기' : '내보내기') + '</span>' : '') +
            '</div>';
        }).join("");
        card.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;">' +
                '<span style="font-size:16px;font-weight:900;color:var(--text-m);">우리 가족</span>' +
                '<span style="font-size:12.5px;font-weight:700;color:var(--text-sub);">' + ids.length + '명</span></div>' + rows +
            (helpers ? '<div style="font-size:12px;font-weight:600;color:var(--text-sub);line-height:1.6;margin-top:10px;word-break:keep-all;">' +
                '돌봄이 끝나면 연결을 끊어 주세요. 그 폰에서는 더 이상 기록을 보거나 남길 수 없어요. 엄마 아빠 둘만의 기록(가계부 · 문답 · 편지)은 처음부터 보이지 않아요.</div>' : '');
        card.setAttribute("data-labels", JSON.stringify(labels));
    }
    window.__nameHelper = function (uid) {
        var b = LABELS.map(function (l) {
            return '<div onclick="window.__setHelperName(\'' + uid + '\',\'' + l + '\')" style="padding:13px;border-radius:13px;border:1px solid var(--border,#EDE6DE);' +
                'font-size:15px;font-weight:700;color:var(--text-m,#4A413C);cursor:pointer;">' + ICON[l] + ' ' + l + '</div>';
        }).join("");
        box('<div style="font-size:18px;font-weight:800;color:var(--text-m,#4A413C);margin-bottom:14px;">누구신가요?</div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' + b + '</div>' +
            '<div onclick="window.__pinCancel()" style="margin-top:14px;font-size:13.5px;font-weight:700;color:var(--text-sub,#8A7F76);cursor:pointer;">취소</div>');
    };
    window.__setHelperName = async function (uid, l) {
        close();
        var fam = await loadFamily(true); if (!fam || typeof window.updateDoc !== "function") return toast("지금은 바꿀 수 없어요");
        var labels = Object.assign({}, fam.labels || {}); labels[uid] = l;
        try { await window.updateDoc(window.doc(window.db, "families", syncCode()), { labels: labels }); famCache = null; paintMembers(); toast(l + "(으)로 바꿨어요"); }
        catch (e) { toast("바꾸지 못했어요"); }
    };
    window.__kickHelper = function (uid) {
        var card = document.getElementById("family-members-card"), labels = {};
        try { labels = JSON.parse(card.getAttribute("data-labels") || "{}"); } catch (e) {}
        var lb = labels[uid] || "", fam = isFamilyLabel(lb);
        box('<div style="font-size:18px;font-weight:800;color:var(--text-m,#4A413C);">' + (fam ? lb + ' 폰 연결을 끊을까요?' : '돌봄 도우미를 내보낼까요?') + '</div>' +
            '<div style="font-size:13px;font-weight:600;color:var(--text-sub,#8A7F76);line-height:1.7;margin-top:8px;word-break:keep-all;">' +
                '그 폰에서는 바로 더 이상 기록을 보거나 남길 수 없어요. 다시 도와주실 땐 새 초대 링크를 보내면 돼요.</div>' +
            '<div style="display:flex;gap:8px;margin-top:18px;">' +
                '<div onclick="window.__pinCancel()" style="flex:1;padding:14px;border-radius:14px;border:1px solid var(--border,#EDE6DE);font-size:14.5px;font-weight:700;color:var(--text-s,#8A7F76);cursor:pointer;">취소</div>' +
                '<div onclick="window.__kickConfirm(\'' + uid + '\')" style="flex:1.4;padding:14px;border-radius:14px;background:#4A413C;color:#FFF;font-size:14.5px;font-weight:800;cursor:pointer;">' + (fam ? '연결 끊기' : '내보내기') + '</div></div>');
    };
    window.__kickConfirm = async function (uid) {
        close();
        var code = syncCode(), fam = await loadFamily(true), m = fam && fam.members;
        if (!code || !m || Array.isArray(m) || m[uid] !== "viewer" || typeof window.updateDoc !== "function") return toast("지금은 내보낼 수 없어요. 연결을 확인해 주세요");
        var next = {}; Object.keys(m).forEach(function (k) { if (k !== uid) next[k] = m[k]; });
        try {
            await window.updateDoc(window.doc(window.db, "families", code), { members: next });   // members 칸만 통째로 바꾼다
            var nextLabels = Object.assign({}, fam.labels || {}); var was = nextLabels[uid] || ""; delete nextLabels[uid];
            try { await window.updateDoc(window.doc(window.db, "families", code), { labels: nextLabels }); } catch (e) {}
            famCache = null; toast(isFamilyLabel(was) ? was + " 폰 연결을 끊었어요" : "돌봄 도우미를 내보냈어요"); paintMembers();
        } catch (e) { console.warn("[가족] 내보내기 실패", e); toast("내보내지 못했어요. 다시 해 주세요"); }
    };
    (function hookMembersCard() {
        var orig = window.renderSettingsTab;
        if (typeof orig !== "function" || orig.__members) return;
        var w = function () {
            var out = orig.apply(this, arguments);
            try {
                var host = document.getElementById("tab-settings");
                var senior = localStorage.getItem("user_role") === "senior";
                var old = document.getElementById("family-members-card");
                if (senior) { if (old) old.remove(); }
                else if (host && syncCode() && !old) {
                    var card = document.createElement("div");
                    card.id = "family-members-card";
                    card.style.cssText = "background:var(--bg-card); padding:18px 20px 12px; border-radius:16px; border:1px solid var(--border); margin-bottom:12px; box-sizing:border-box; width:100%; display:none;";
                    var after = document.getElementById("parent-notice-card") || document.getElementById("parent-phone-card");
                    if (after && after.parentNode === host) host.insertBefore(card, after.nextSibling); else host.appendChild(card);
                    paintMembers();
                }
            } catch (e) {}
            return out;
        };
        w.__members = true;
        window.renderSettingsTab = w;
    })();

    /* 내보내진 도우미 폰: 서버 명단에서 빠지면 이 폰에 남은 아기 기록을 지운다 */
    function removedNotice() {
        if (document.getElementById("pin-sheet")) return;
        var lb = window.helperLabel ? window.helperLabel() : "";
        box('<div style="font-size:18px;font-weight:800;color:var(--text-m,#4A413C);">' + (isFamilyLabel(lb) ? '연결이 끝났어요' : '돌봄 연결이 끝났어요') + '</div>' +
            '<div style="font-size:13px;font-weight:600;color:var(--text-sub,#8A7F76);line-height:1.7;margin-top:8px;word-break:keep-all;">' +
                '엄마 아빠가 이 폰의 돌봄 연결을 끝냈어요. 이 폰에 남은 아기 기록은 지울게요. 다시 도와주실 땐 새 초대 링크를 받아 주세요.</div>' +
            '<div onclick="window.__removedOk()" style="margin-top:18px;padding:14px;border-radius:14px;background:#4A413C;color:#FFF;font-size:14.5px;font-weight:800;cursor:pointer;">확인</div>');
    }
    window.__removedOk = function () { try { localStorage.clear(); } catch (e) {} location.reload(); };
    function checkRemoved(m, uid) {
        // 도우미로 잠긴 폰만. 엄마 · 아빠 폰은 절대 여기 안 온다 (잠겨 있지 않으니까)
        if (localStorage.getItem(LOCK) !== "viewer" || !m || Array.isArray(m) || !uid) return false;
        if (Object.keys(m).length && !(uid in m)) { removedNotice(); return true; }
        return false;
    }
    window.__checkRemoved = checkRemoved;

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