/* ============================================================
   배냇함 — 인스타 · 페북 · 네이버 앱 안에서 열렸을 때 (inapp.js)

   인스타 프로필 링크를 누르면 인스타 앱 안의 작은 브라우저에서 열린다.
   거기서는 카카오 로그인 창이 막히거나, 로그인해도 다음에 사파리 · 크롬에서
   다시 로그인해야 한다. 홈 화면에 앱처럼 깔 수도 없다.
   그래서 시작 화면에서 한 번, 바깥 브라우저로 여는 길을 보여 준다. 막지는 않는다.

   ⚠️ 카카오톡 안은 건드리지 않는다. 카카오 로그인이 잘 되고, 가족 초대 링크가 카톡으로 온다.
   ⚠️ 플레이 앱(껍데기)도 건드리지 않는다.

   index.html 에서 feedback.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';
    var ua = navigator.userAgent || '';
    if (window.__NATIVE_APP__ === true || /KAKAOTALK/i.test(ua)) return;

    // [알아보는 표시, 이름, 메뉴(⋯)가 있는 곳]
    var APPS = [
        [/Instagram/i, '인스타그램', '오른쪽 위'],
        [/Barcelona|Threads/i, '스레드', '오른쪽 위'],
        [/FBAN|FBAV|FB_IAB|FBIOS/i, '페이스북', '오른쪽 위'],
        [/NAVER\(inapp/i, '네이버', '오른쪽 아래'],
        [/\bLine\//i, '라인', '오른쪽 위'],
        [/DaumApps/i, '다음', '오른쪽 아래'],
        [/BAND\//i, '밴드', '오른쪽 위']
    ];
    var where = null, menuAt = '';
    for (var i = 0; i < APPS.length; i++) if (APPS[i][0].test(ua)) { where = APPS[i][1]; menuAt = APPS[i][2]; break; }
    if (!where) return;

    var IOS = /iPhone|iPad|iPod/i.test(ua);
    var BROWSER = IOS ? '사파리' : '크롬';
    var SHOWN = 'tosil_inapp_shown';
    window.inAppWhere = where;

    function toast(m) { if (typeof window.showToast === 'function') window.showToast(m); }
    function get(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }

    // 바깥에서 열 주소. 초대 링크로 들어왔으면 초대 코드를 다시 붙인다 (여기 저장한 건 바깥 브라우저가 모른다)
    function target() {
        var code = get('pending_invite_code'), name = get('pending_invite_name');
        var q = code ? '?code=' + encodeURIComponent(code) + (name ? '&n=' + encodeURIComponent(name) : '') : '';
        return { host: location.host, path: '/' + q, url: 'https://' + location.host + '/' + q };
    }

    function copy(text) {
        var ok = function () { toast('주소를 복사했어요. ' + BROWSER + ' 주소창에 붙여 넣어 주세요'); };
        var old = function () {
            var t = document.createElement('textarea');
            t.value = text; t.setAttribute('readonly', '');
            t.style.cssText = 'position:fixed; top:-200px; opacity:0;';
            document.body.appendChild(t); t.select();
            var done = false;
            try { done = document.execCommand('copy'); } catch (e) {}
            t.remove();
            if (done) ok(); else toast('길게 눌러 주소를 복사해 주세요: ' + text);
        };
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, old);
            else old();
        } catch (e) { old(); }
    }

    function close() {
        var w = document.getElementById('inapp-sheet');
        if (w) w.remove();
    }

    function openChrome() {
        var t = target();
        var go = 'intent://' + t.host + t.path + '#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=' + encodeURIComponent(t.url) + ';end';
        window.__inappLastGo = go;   // 시험용 (어디로 보냈는지)
        location.href = go;
        // 인스타가 바깥으로 못 보내게 막아 둔 폰도 있다. 그대로 남아 있으면 다른 길을 알려 준다
        setTimeout(function () {
            if (document.hidden) return;
            var h = document.getElementById('inapp-hint');
            if (h) h.style.display = 'block';
        }, 1600);
    }

    function show() {
        if (document.getElementById('inapp-sheet')) return;
        try { sessionStorage.setItem(SHOWN, '1'); } catch (e) {}
        var t = target();
        var btn = 'width:100%; padding:16px; border-radius:14px; font-size:15.5px; font-weight:900; font-family:inherit; cursor:pointer; box-sizing:border-box;';
        var step = IOS
            ? '<div style="background:#FBF8F3; border-radius:14px; padding:14px 16px; margin-bottom:12px; font-size:13.5px; font-weight:700; color:#7A6F68; line-height:1.6; word-break:keep-all;">' +
                  menuAt + ' <b style="color:#4A413C;">⋯</b> 를 누르고, 외부 브라우저(사파리)로 여는 메뉴를 눌러 주세요.<br>메뉴가 안 보이면 주소를 복사해서 사파리에 붙여 넣으면 돼요.</div>' +
              '<button id="inapp-copy" style="' + btn + ' background:#7F77DD; color:#FFFFFF; border:none;">주소 복사하기</button>'
            : '<button id="inapp-chrome" style="' + btn + ' background:#7F77DD; color:#FFFFFF; border:none;">크롬에서 열기</button>' +
              '<div id="inapp-hint" style="display:none; margin-top:10px; font-size:12.5px; font-weight:700; color:#7A6F68; line-height:1.55; word-break:keep-all;">안 열리면 ' + menuAt + ' <b style="color:#4A413C;">⋮</b> 를 눌러 다른 브라우저로 열거나, 주소를 복사해 주세요.</div>' +
              '<button id="inapp-copy" style="' + btn + ' margin-top:10px; background:#FFFFFF; color:#4A413C; border:1.5px solid #EDE6DE;">주소 복사하기</button>';

        var w = document.createElement('div');
        w.id = 'inapp-sheet';
        w.setAttribute('style', 'position:fixed; inset:0; z-index:10000001; background:rgba(43,36,30,0.5); display:flex; align-items:flex-end; justify-content:center; font-family:inherit;');
        w.innerHTML =
            '<div style="width:100%; max-width:480px; background:#FFFFFF; border-radius:24px 24px 0 0; padding:26px 20px calc(18px + env(safe-area-inset-bottom, 0px)); box-sizing:border-box;">' +
                '<div style="font-size:19px; font-weight:900; color:#4A413C; letter-spacing:-0.4px; margin-bottom:8px;">' + where + ' 안에서 열렸어요</div>' +
                '<div style="font-size:14px; font-weight:600; color:#7A6F68; line-height:1.6; word-break:keep-all; margin-bottom:18px;">' +
                    '여기서는 카카오 로그인이 막히거나, 다음에 다시 로그인해야 할 수 있어요. ' + BROWSER + '에서 열면 바로 시작할 수 있어요.</div>' +
                step +
                '<button id="inapp-stay" style="width:100%; margin-top:6px; padding:14px; background:none; border:none; font-size:13.5px; font-weight:800; color:#A3958A; font-family:inherit; cursor:pointer;">그냥 여기서 할게요</button>' +
            '</div>';
        w.onclick = function (e) { if (e.target === w) close(); };
        document.body.appendChild(w);

        var c = document.getElementById('inapp-chrome');
        if (c) c.onclick = openChrome;
        document.getElementById('inapp-copy').onclick = function () { copy(t.url); };
        document.getElementById('inapp-stay').onclick = close;
    }
    window.openInAppNotice = show;

    // 시작 화면(로그인 전)일 때만, 이번 방문에 한 번
    function startVisible() {
        var o = document.getElementById('onboarding-overlay'), s = document.getElementById('onboarding-step-0');
        if (!o || !s) return false;
        return getComputedStyle(o).display !== 'none' && getComputedStyle(s).display !== 'none';
    }
    function watch() {
        try { if (sessionStorage.getItem(SHOWN)) return; } catch (e) {}
        var n = 0;
        var t = setInterval(function () {
            if (startVisible()) { clearInterval(t); show(); }
            else if (++n > 25) clearInterval(t);   // 10초 안에 시작 화면이 아니면 (이미 로그인한 사람) 그만
        }, 400);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch);
    else watch();
})();
