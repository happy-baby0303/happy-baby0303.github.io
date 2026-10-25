/* ============================================================
   배냇함 — 의견 보내기 (feedback.js)

   설정 → 고객 지원 및 약관 → '의견 보내기'
     글을 쓰면 서버(functions 의 sendFeedback)가 feedback 에 남기고 관리자 폰으로 바로 알린다.
     답장 받을 이메일은 적은 사람만.
     앱 버전 · 플레이 앱인지 웹인지 · 폰 종류가 같이 간다 (아기 이름 · 사진은 보내지 않는다)
   못 보내면 쓰던 글을 이 폰에 남겨 둔다 (다시 열면 그대로 있다)
   창 아래에 '보낸 의견' — 관리자가 답장하면 여기 보이고, 폰으로도 알림이 온다
     (알림을 누르면 index.html?go=feedback → 이 창이 열린다)
   관리자 화면 '의견함' (window.openFeedbackInbox) — 읽고 답장한다
     ('📮 새 의견' 알림을 누르면 index.html?go=inbox → 의견함이 바로 열린다)
   새 답장을 아직 안 봤으면 설정 '의견 보내기' 줄 오른쪽에 '답장 왔어요'
     (의견을 보낸 적이 있는 폰만 확인한다 · 창을 열어 보면 사라진다)

   index.html 에서 pushcheck.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';
    var DRAFT = "tosil_feedback_draft";
    var SENT = "tosil_feedback_sent";        // 이 폰에서 의견을 보낸 적이 있다
    var SEEN = "tosil_feedback_seen";        // 여기까지 답장은 봤다 (답장 시각)
    var INK = "#4A413C";

    function get(k) { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } }
    function put(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) {} }
    function toast(m) { if (typeof window.showToast === "function") window.showToast(m); }
    function esc(s) {
        return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }
    function appKind() {
        if (window.__NATIVE_APP__ === true) return "play";
        var sa = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
        return sa ? "pwa" : "web";
    }
    function version() {
        var el = document.querySelector('script[src*="script.js?v="]');
        var m = el && /v=([\w.-]+)/.exec(el.getAttribute("src") || "");
        return m ? m[1] : "";
    }
    function close() { var w = document.getElementById("fb-sheet"); if (w) w.remove(); }

    window.openFeedback = function () {
        close();
        var draft = {};
        try { draft = JSON.parse(get(DRAFT) || "{}") || {}; } catch (e) {}
        var field = "width:100%; box-sizing:border-box; border:1.5px solid var(--border); border-radius:14px; background:transparent; " +
                    "color:var(--text-m); font-size:16px; font-weight:600; font-family:inherit; outline:none;";   // 16px 보다 작으면 아이폰이 확대한다
        var w = document.createElement("div");
        w.id = "fb-sheet";
        w.setAttribute("style", "position:fixed; inset:0; z-index:100004; background:rgba(43,36,30,0.5); display:flex; align-items:flex-end; justify-content:center;");
        w.onclick = function (e) { if (e.target === w) close(); };
        w.innerHTML =
            '<div style="width:100%; max-width:480px; max-height:90vh; overflow-y:auto; background:var(--bg-card); border-radius:24px 24px 0 0; ' +
                'padding:22px 20px calc(22px + env(safe-area-inset-bottom, 0px)); box-sizing:border-box;">' +
                '<div style="display:flex; justify-content:space-between; align-items:center;">' +
                    '<div style="font-size:18px; font-weight:900; color:var(--text-m);">의견 보내기</div>' +
                    '<div id="fb-x" style="font-size:24px; font-weight:300; color:var(--text-sub); cursor:pointer; line-height:1; padding:0 0 6px 12px;">×</div>' +
                '</div>' +
                '<div style="font-size:13px; font-weight:600; color:var(--text-sub); margin:6px 0 14px; line-height:1.6; word-break:keep-all;">불편한 점, 바라는 점 무엇이든 적어 주세요. 하나하나 읽어 볼게요.</div>' +
                '<textarea id="fb-text" rows="5" maxlength="1000" placeholder="예: 잠 기록을 고치는 곳을 못 찾겠어요" style="' + field + ' padding:14px 16px; resize:none; line-height:1.55;">' + esc(draft.text || "") + '</textarea>' +
                '<div style="font-size:12.5px; font-weight:800; color:var(--text-s); margin:14px 2px 6px;">답장 받을 이메일 (선택)</div>' +
                '<input id="fb-mail" type="email" inputmode="email" autocomplete="email" placeholder="적으면 이 주소로 답장해 드려요" value="' + esc(draft.email || "") + '" style="' + field + ' padding:12px 16px;">' +
                '<div style="font-size:12px; font-weight:600; color:var(--text-sub); margin:10px 2px 16px; line-height:1.55; word-break:keep-all;">앱 버전과 폰 종류가 같이 가요. 아기 이름이나 사진은 보내지 않아요.</div>' +
                '<div id="fb-send" style="text-align:center; padding:15px; border-radius:14px; background:' + INK + '; color:#FFFFFF; font-size:15px; font-weight:900; cursor:pointer;">보내기</div>' +
                '<div id="fb-mine"></div>' +
            '</div>';
        document.body.appendChild(w);
        var t = document.getElementById("fb-text"), m = document.getElementById("fb-mail");
        function keep() { put(DRAFT, (t.value || m.value) ? JSON.stringify({ text: t.value, email: m.value }) : ""); }
        t.oninput = keep;
        m.oninput = keep;
        document.getElementById("fb-x").onclick = close;
        document.getElementById("fb-send").onclick = send;
        loadMine();
    };

    /* ---------- 보낸 의견과 답장 ---------- */
    function day(ms) { var d = new Date(ms); return (d.getMonth() + 1) + "월 " + d.getDate() + "일"; }
    var CLAMP = "display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;";
    async function loadMine() {
        if (!window.functions || typeof window.httpsCallable !== "function") return;
        try {
            var r = await window.httpsCallable(window.functions, "myFeedback")({});
            var list = ((r && r.data && r.data.list) || []).slice(0, 5);
            var box = document.getElementById("fb-mine");
            if (!box || !list.length) return;
            put(SENT, "1");
            markSeen(list);
            box.innerHTML = '<div style="font-size:12.5px; font-weight:800; color:var(--text-s); margin:24px 2px 8px;">보낸 의견</div>' +
                list.map(function (x) {
                    return '<div style="border:1px solid var(--border); border-radius:14px; padding:12px 14px; margin-bottom:8px;">' +
                        '<div style="font-size:11.5px; font-weight:700; color:var(--text-sub);">' + day(x.at) + '</div>' +
                        '<div style="font-size:13.5px; font-weight:600; color:var(--text-m); margin-top:3px; line-height:1.5; word-break:keep-all; white-space:pre-wrap; ' + CLAMP + '">' + esc(x.text) + '</div>' +
                        (x.reply
                            ? '<div style="margin-top:10px; padding:10px 12px; border-radius:10px; background:#F4F2FC;">' +
                                  '<div style="font-size:11.5px; font-weight:800; color:#6A61CE;">💌 답장 · ' + day(x.repliedAt || x.at) + '</div>' +
                                  '<div style="font-size:13.5px; font-weight:600; color:#4F47A5; margin-top:3px; line-height:1.55; word-break:keep-all; white-space:pre-wrap;">' + esc(x.reply) + '</div>' +
                              '</div>'
                            : '<div style="font-size:11.5px; font-weight:700; color:var(--text-sub); margin-top:6px;">읽고 답장해 드릴게요</div>') +
                    '</div>';
                }).join("");
        } catch (e) { /* 못 불러오면 보내기만 쓴다 */ }
    }

    /* ---------- 새 답장 표시 (설정 '의견 보내기' 줄) ---------- */
    function newest(list) { return list.reduce(function (m, x) { return Math.max(m, Number(x.repliedAt) || 0); }, 0); }
    function paintRow(on) {
        var row = document.getElementById("feedback-row");
        var tail = row && row.lastElementChild;
        if (!tail) return;
        tail.innerHTML = on ? '<span style="display:inline-block; padding:3px 8px; border-radius:8px; background:#F0EEFB; color:#6A61CE; font-size:11.5px; font-weight:900;">답장 왔어요</span>' : "›";
    }
    function markSeen(list) {
        var n = newest(list);
        if (n > (Number(get(SEEN)) || 0)) put(SEEN, String(n));
        paintRow(false);
    }
    async function checkReplies() {
        if (get(SENT) !== "1" || !window.functions || typeof window.httpsCallable !== "function") return;
        try {
            var r = await window.httpsCallable(window.functions, "myFeedback")({});
            var list = (r && r.data && r.data.list) || [];
            paintRow(newest(list) > (Number(get(SEEN)) || 0));
        } catch (e) { /* 못 보면 그냥 둔다 */ }
    }
    (function hookSettings() {
        var orig = window.renderSettingsTab;
        if (typeof orig !== "function") { if (!hookSettings.n) { hookSettings.n = 1; window.addEventListener("load", hookSettings); } return; }
        if (orig.__fb) return;
        var w = function () { var out = orig.apply(this, arguments); setTimeout(checkReplies, 300); return out; };
        Object.keys(orig).forEach(function (k) { try { w[k] = orig[k]; } catch (e) {} });
        w.__fb = true;
        window.renderSettingsTab = w;
    })();

    /* 알림을 눌러 들어왔으면 그 창을 연다 (주소는 script.js 가 곧 지운다 — 불러올 때 미리 본다)
       ?go=feedback — 답장 알림 → 의견 보내기 창 · ?go=inbox — 새 의견 알림(관리자) → 의견함 */
    var GO = (/[?&]go=(feedback|inbox)\b/.exec(location.search) || [])[1];
    if (GO) {
        window.addEventListener("load", function () {
            setTimeout(function () {
                if (GO === "inbox") return window.openFeedbackInbox();
                try { if (typeof window.switchTab === "function") window.switchTab("settings", document.getElementById("nav-settings")); } catch (e) {}
                window.openFeedback();
            }, 1500);
        });
    }

    /* ---------- 의견함 (관리자 화면) ---------- */
    var APP = { play: "플레이 앱", pwa: "홈 화면 앱", web: "웹" };
    var ROLE = { mom: "엄마", dad: "아빠", senior: "도우미" };
    function inboxCard(x) {
        var meta = [day(x.at), ROLE[x.role] || x.role, APP[x.app] || x.app, x.version, x.email].filter(Boolean).map(esc).join(" · ");
        var id = /^[A-Za-z0-9]{1,40}$/.test(x.id || "") ? x.id : "";
        return '<div style="background:#27272A; border:1px solid #3F3F46; border-radius:16px; padding:14px 16px; margin-bottom:12px;">' +
            '<div style="font-size:11.5px; font-weight:700; color:#A1A1AA; word-break:break-all;">' + meta + '</div>' +
            '<div style="font-size:14.5px; font-weight:600; color:#FFFFFF; margin-top:6px; line-height:1.55; white-space:pre-wrap; word-break:keep-all;">' + esc(x.text) + '</div>' +
            '<div style="font-size:11px; color:#71717A; margin-top:6px; word-break:break-all;">' + esc(x.device || "") + '</div>' +
            '<div id="fb-r-' + id + '" style="margin-top:12px;">' +
                (x.reply
                    ? '<div style="padding:10px 12px; border-radius:10px; background:#3B3655; color:#DCD8F5; font-size:13.5px; line-height:1.55; white-space:pre-wrap;">💌 ' + esc(x.reply) + '</div>'
                    : (id ? '<textarea id="fb-rt-' + id + '" rows="3" placeholder="답장을 쓰면 보낸 사람 폰으로 알림이 가요" style="width:100%; box-sizing:border-box; border-radius:12px; border:1px solid #52525B; background:#18181B; color:#FFFFFF; font-size:16px; padding:10px 12px; font-family:inherit; resize:none;"></textarea>' +
                           '<div onclick="window.__fbReply(\'' + id + '\')" style="margin-top:8px; text-align:center; padding:11px; border-radius:12px; background:#7F77DD; color:#FFFFFF; font-size:14px; font-weight:900; cursor:pointer;">답장 보내기</div>' : '')) +
            '</div>' +
        '</div>';
    }
    window.openFeedbackInbox = async function () {
        var old = document.getElementById("fb-inbox");
        if (old) old.remove();
        var w = document.createElement("div");
        w.id = "fb-inbox";
        w.setAttribute("style", "position:fixed; inset:0; z-index:10000000; background:#18181B; overflow-y:auto; padding:22px 18px 40px; box-sizing:border-box;");
        w.innerHTML = '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">' +
                '<div style="font-size:20px; font-weight:900; color:#FFFFFF;">📮 의견함</div>' +
                '<div id="fb-inbox-x" style="font-size:22px; color:#FFFFFF; cursor:pointer; padding:4px 8px;">✕</div>' +
            '</div>' +
            '<div id="fb-inbox-list" style="font-size:13.5px; font-weight:600; color:#A1A1AA;">불러오는 중…</div>';
        document.body.appendChild(w);
        document.getElementById("fb-inbox-x").onclick = function () { w.remove(); };
        var list = document.getElementById("fb-inbox-list");
        try {
            var r = await window.httpsCallable(window.functions, "feedbackInbox")({});
            var d = (r && r.data) || {};
            if (!d.ok) { list.textContent = d.error === "admin" ? "관리자 계정이 아니에요" : "불러오지 못했어요"; return; }
            list.innerHTML = (d.list || []).length ? d.list.map(inboxCard).join("") : "아직 온 의견이 없어요";
        } catch (e) {
            list.textContent = "불러오지 못했어요. 서버(functions)를 새로 올렸는지 확인해 주세요";
        }
    };
    window.__fbReply = async function (id) {
        var t = document.getElementById("fb-rt-" + id), box = document.getElementById("fb-r-" + id);
        var reply = ((t && t.value) || "").trim();
        if (!reply) { toast("답장을 적어 주세요"); return; }
        try {
            var r = await window.httpsCallable(window.functions, "replyFeedback")({ id: id, reply: reply });
            var d = (r && r.data) || {};
            if (!d.ok) { toast("보내지 못했어요 (" + (d.error || "?") + ")"); return; }
            if (box) box.innerHTML = '<div style="padding:10px 12px; border-radius:10px; background:#3B3655; color:#DCD8F5; font-size:13.5px; line-height:1.55; white-space:pre-wrap;">💌 ' + esc(reply) + '</div>';
            toast(d.sent ? "답장을 보냈어요" : "답장을 남겼어요. 그 사람 폰 알림은 꺼져 있어서 다음에 창을 열면 보여요");
        } catch (e) {
            toast("보내지 못했어요. 잠시 뒤 다시 눌러 주세요");
        }
    };

    var busy = false;
    async function send() {
        if (busy) return;
        var t = document.getElementById("fb-text"), m = document.getElementById("fb-mail"), b = document.getElementById("fb-send");
        var text = ((t && t.value) || "").trim(), email = ((m && m.value) || "").trim();
        if (text.length < 2) { toast("하고 싶은 말을 적어 주세요"); if (t) t.focus(); return; }
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { toast("이메일 주소를 다시 봐 주세요"); if (m) m.focus(); return; }
        if (!window.functions || typeof window.httpsCallable !== "function") { toast("아직 준비 중이에요. 잠시 뒤 다시 보내 주세요"); return; }
        busy = true;
        if (b) { b.style.opacity = "0.5"; b.textContent = "보내는 중…"; }
        var fail = "보내지 못했어요. 쓴 글은 남겨 둘게요. 잠시 뒤 다시 보내 주세요";
        try {
            var r = await window.httpsCallable(window.functions, "sendFeedback")({
                text: text, email: email,
                family: get("family_sync_code"), role: get("user_role"),
                version: version(), app: appKind(), device: (navigator.userAgent || "").slice(0, 160)
            });
            var d = (r && r.data) || {};
            if (d.ok) {
                put(DRAFT, "");
                put(SENT, "1");
                close();
                toast("보내 주셔서 고마워요. 꼭 읽어 볼게요");
                return;
            }
            toast(d.error === "too-many" ? "오늘은 더 보낼 수 없어요. 내일 다시 보내 주세요"
                : d.error === "login" ? "로그인이 풀려 있어요. 앱을 다시 열어 주세요" : fail);
        } catch (e) {
            toast(fail);
        } finally {
            busy = false;
            if (b && document.body.contains(b)) { b.style.opacity = "1"; b.textContent = "보내기"; }
        }
    }
})();
