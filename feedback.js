/* ============================================================
   배냇함 — 의견 보내기 (feedback.js)

   설정 → 고객 지원 및 약관 → '의견 보내기'
     글을 쓰면 서버(functions 의 sendFeedback)가 feedback 에 남기고 관리자 폰으로 바로 알린다.
     답장 받을 이메일은 적은 사람만.
     앱 버전 · 플레이 앱인지 웹인지 · 폰 종류가 같이 간다 (아기 이름 · 사진은 보내지 않는다)
   못 보내면 쓰던 글을 이 폰에 남겨 둔다 (다시 열면 그대로 있다)

   index.html 에서 pushcheck.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';
    var DRAFT = "tosil_feedback_draft";
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
            '</div>';
        document.body.appendChild(w);
        var t = document.getElementById("fb-text"), m = document.getElementById("fb-mail");
        function keep() { put(DRAFT, (t.value || m.value) ? JSON.stringify({ text: t.value, email: m.value }) : ""); }
        t.oninput = keep;
        m.oninput = keep;
        document.getElementById("fb-x").onclick = close;
        document.getElementById("fb-send").onclick = send;
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
