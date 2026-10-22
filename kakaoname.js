/* ============================================================
   배냇함 — 카카오 이름 (kakaoname.js)

   ⚠️ 카카오로 로그인하면 이름 자리에 늘 '육아동지' 가 들어갔다.
      index.html 이 로그인 직후 기본값을 박아 넣고, 카카오에 진짜 이름을 묻지 않았다.
      그래서 설정에는 '육아동지 님', 문답 책 표지에는 '엄마 육아동지 · 아빠 육아동지' 가 찍혔다.

   카카오에 내 이름을 묻는다.
     로그인할 때   서버(kakaoCustomAuth)가 이름을 같이 돌려주면 그걸 쓴다
     플레이 앱     카카오 SDK 에 묻는다 (KakaoLogin.me — 앱 1.1.2 부터)
     웹           카카오 JS SDK 로 /v2/user/me
   못 받으면(동의 항목이 꺼져 있거나, 토큰이 지났거나) 이름을 비워 둔다.
     화면은 비어 있으면 '꿈이 아빠' 처럼 부른다 (myDisplayName).
     책 표지는 [아빠 이름] 칸으로 둔다 — 가짜 이름을 책에 찍지 않는다.

   이미 '육아동지' 로 저장된 사람은 앱을 열 때 하루 한 번 다시 묻는다.

   index.html <head>, familyhome.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var PLACEHOLDER = '육아동지';
    var TRIED = 'tosil_kname_tried';      // 마지막으로 물어본 날 (하루 한 번만)

    function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function put(k, v) {
        try {
            if (v === null || v === undefined || v === '') localStorage.removeItem(k);
            else localStorage.setItem(k, String(v));
        } catch (e) {}
    }
    function today() {
        var d = new Date();
        return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    }

    /* 카카오에서 받은 진짜 이름. 없거나 '육아동지' 면 빈칸 */
    window.realKakaoName = function () {
        var n = String(get('kakao_nickname') || '').trim();
        return n && n !== PLACEHOLDER ? n : '';
    };

    /* 화면에 부를 이름. 카카오 이름 → 없으면 '꿈이 아빠' */
    window.myDisplayName = function () {
        var n = window.realKakaoName();
        if (n) return n;
        var baby = String(get('tosil_babyName') || '').trim();
        var r = get('user_role');
        var who = r === 'dad' ? '아빠' : (r === 'mom' ? '엄마' : (r === 'senior' ? (get('tosil_helper_label') || '') : ''));
        if (baby && who) return baby + ' ' + who;
        return who || '배냇함 가족';
    };

    function cleanImg(u) {
        u = String(u || '');
        if (!u) return '';
        if (u.indexOf('http://') === 0) u = 'https://' + u.slice(7);    // 앱 안에서는 http 그림이 막힌다
        return u.indexOf('https://') === 0 ? u : '';
    }

    /* 받은 이름을 적는다. 이름이 없으면 '육아동지' 만 지운다 (다른 이름은 그대로) */
    window.saveKakaoProfile = function (p) {
        p = p || {};
        var name = String(p.nickname || '').trim().slice(0, 30);
        if (name && name !== PLACEHOLDER) {
            put('kakao_nickname', name);
            var img = cleanImg(p.thumbnail);
            if (img) put('kakao_profile_image', img);
        } else if (get('kakao_nickname') === PLACEHOLDER) {
            put('kakao_nickname', '');
        }
        return window.realKakaoName();
    };

    function fromApp() {
        var C = window.Capacitor, P = C && C.Plugins && C.Plugins.KakaoLogin;
        if (!P || typeof P.me !== 'function') return Promise.resolve(null);     // 앱 1.1.2 전에는 없다
        return P.me().then(function (r) {
            return { nickname: r && r.nickname, thumbnail: r && r.thumbnail };
        }).catch(function () { return null; });
    }

    function fromWeb() {
        var K = window.Kakao;
        if (!K || !K.API || typeof K.API.request !== 'function') return Promise.resolve(null);
        try { if (K.Auth && typeof K.Auth.getAccessToken === 'function' && !K.Auth.getAccessToken()) return Promise.resolve(null); } catch (e) {}
        return new Promise(function (ok) {
            var done = false;
            function fin(v) { if (!done) { done = true; ok(v); } }
            setTimeout(function () { fin(null); }, 8000);
            try {
                K.API.request({
                    url: '/v2/user/me',
                    data: { secure_resource: true },
                    success: function (res) {
                        var acc = (res && res.kakao_account) || {}, prof = acc.profile || {}, props = (res && res.properties) || {};
                        fin({
                            nickname: prof.nickname || props.nickname || '',
                            thumbnail: prof.is_default_image ? '' : (prof.thumbnail_image_url || props.thumbnail_image || '')
                        });
                    },
                    fail: function () { fin(null); }
                });
            } catch (e) { fin(null); }
        });
    }

    /* 카카오에 이름 묻기. force 가 아니면 하루 한 번, 이름이 없을 때만 */
    window.fetchKakaoName = function (force) {
        if (!force) {
            if (window.realKakaoName()) return Promise.resolve(window.realKakaoName());
            if (get(TRIED) === today()) return Promise.resolve('');
        }
        put(TRIED, today());
        var ask = window.__NATIVE_APP__ ? fromApp() : fromWeb();
        return ask.then(function (p) {
            var before = get('kakao_nickname') || '';
            var name = window.saveKakaoProfile(p);
            if ((get('kakao_nickname') || '') !== before) {
                repaint();
                // 가족 명단(우리 가족)에 내 이름도 바로 (rolelock.js)
                if (typeof window.__registerDevice === 'function') window.__registerDevice();
            }
            return name;
        });
    };

    /* 설정 탭이 열려 있으면 새 이름으로 다시 그린다 */
    function repaint() {
        var tab = document.getElementById('tab-settings');
        if (tab && tab.classList.contains('active') && typeof window.renderSettingsTab === 'function') {
            try { window.renderSettingsTab(); } catch (e) {}
        }
    }

    /* 로그인한 사람인데 이름이 없거나 '육아동지' 면 한 번 묻는다 */
    function boot() {
        setTimeout(function () {
            if (get('kakao_id') && !window.realKakaoName()) window.fetchKakaoName(false);
        }, 4000);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
