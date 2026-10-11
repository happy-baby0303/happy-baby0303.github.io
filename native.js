/* ============================================================
   배냇함 — 앱 껍데기 연결 (native.js)

   왜 필요한가
     플레이 앱이 크롬(TWA) 대신 우리 앱 껍데기(캐패시터) 안에서 사이트를 띄운다.
     그래서 'Chrome에서 실행 중' 이 안 뜬다.
     대신 크롬이 해 주던 일 몇 가지를 껍데기가 맡는다. 이 파일이 그 둘을 잇는다.

       카카오 로그인   크롬: 새 창(팝업)        → 앱: 카카오 SDK (카톡으로 한 번에)
       푸시 알림       크롬: 웹 푸시           → 앱: 안드로이드 푸시 (같은 서버, 같은 토큰 자리)
       저장 · 공유     크롬: 다운로드 · 공유 창 → 앱: 사진첩 저장 · 안드로이드 공유 창
       앱 안 알림      크롬: 브라우저 알림      → 앱: 화면 위 안내(토스트)

   언제 켜지나
     앱 껍데기의 웹뷰 이름표(user agent)에 BaenatApp 이 붙어 있을 때만.
     웹(크롬 · 사파리 · 아이폰 홈 화면)에서는 첫 줄에서 바로 빠져나간다. 아무것도 안 바꾼다.

   index.html <head> 위쪽, playlite.js 바로 다음에 한 줄:
     <script src="./native.js?v=1"></script>
   (사이트 스크립트들이 푸시 · 로그인 함수를 만들기 전에 자리를 잡아야 해서 위에 둔다)
   ============================================================ */

(function () {
    'use strict';

    var UA = navigator.userAgent || '';
    if (!/BaenatApp/i.test(UA)) return;          // 웹이면 여기서 끝

    window.__NATIVE_APP__ = true;                // iospush.js 등이 '이미 앱이다' 를 안다
    try { document.documentElement.classList.add('in-app'); } catch (e) {}

    function plugin(name) {
        var C = window.Capacitor;
        return C && C.Plugins ? C.Plugins[name] : null;
    }
    function toast(msg) {
        try {
            if (typeof window.showToast === 'function') window.showToast(msg);
            else console.log('[앱]', msg);
        } catch (e) {}
    }

    /* ==========================================================
       1. 카카오 로그인 — Kakao.Auth.login 을 앱 로그인으로 바꿔 끼운다
          index.html 의 loginWithKakao 는 그대로 둔다. 받는 토큰 모양이 같다.
       ---------------------------------------------------------- */
    function patchKakao() {
        var K = window.Kakao;
        if (!K || !K.Auth) return false;
        if (K.Auth.__native) return true;

        K.Auth.login = function (opts) {
            opts = opts || {};
            var P = plugin('KakaoLogin');
            if (!P) {
                if (opts.fail) opts.fail({ error: 'no_native_login' });
                return;
            }
            P.login().then(function (r) {
                if (opts.success) opts.success({ access_token: r.accessToken, token_type: 'bearer' });
            }).catch(function (e) {
                // 취소는 조용히 (웹처럼 '실패했습니다' 를 띄우지 않는다)
                if (e && e.code === 'CANCELLED') return;
                if (opts.fail) opts.fail({ error: (e && e.message) || 'kakao_login_failed' });
            });
        };

        // 로그아웃 · 탈퇴: script.js 는 getAccessToken() 이 있을 때만 카카오 쪽도 정리한다
        K.Auth.getAccessToken = function () { return 'app'; };
        K.Auth.logout = function (cb) {
            var P = plugin('KakaoLogin');
            var done = function () { if (typeof cb === 'function') cb(); };
            if (P) P.logout().then(done, done); else done();
        };
        if (K.API && K.API.request && !K.API.__native) {
            var origRequest = K.API.request;
            K.API.request = function (opts) {
                if (opts && opts.url === '/v1/user/unlink') {
                    var P = plugin('KakaoLogin');
                    if (!P) return;
                    return P.unlink().then(function (r) {
                        if (opts.success) opts.success(r || {});
                    }).catch(function (e) {
                        if (opts.fail) opts.fail(e);
                    });
                }
                return origRequest.apply(this, arguments);
            };
            K.API.__native = true;
        }
        K.Auth.__native = true;
        return true;
    }

    /* ==========================================================
       2. 푸시 알림 — 안드로이드 푸시로 토큰을 받아 웹과 같은 자리에 적는다
          서버(sendFamilyPush · careReminder …)는 바꿀 것 없다. 토큰 모양만 다르다.
       ---------------------------------------------------------- */
    var tokenWaiters = [];
    var lastToken = null;

    // 웹 코드는 'Notification' in window 로 알림 지원을 본다. 앱에도 자리를 만들어 둔다.
    function AppNotification(title, opts) {
        var body = (opts && opts.body) || '';
        toast(body ? title + '\n' + body : title);
    }
    AppNotification.permission = 'default';
    AppNotification.requestPermission = function (cb) {
        return window.requestPushPermission().then(function (ok) {
            var p = ok ? 'granted' : (AppNotification.permission === 'denied' ? 'denied' : 'default');
            if (typeof cb === 'function') cb(p);
            return p;
        });
    };
    try { window.Notification = AppNotification; } catch (e) {}

    // 서비스워커가 띄우던 앱 안 알림도 화면 위 안내로
    try {
        if (window.ServiceWorkerRegistration && window.ServiceWorkerRegistration.prototype) {
            window.ServiceWorkerRegistration.prototype.showNotification = function (title, opts) {
                AppNotification(title, opts);
                return Promise.resolve();
            };
        }
    } catch (e) {}

    function mapPerm(receive) {
        return receive === 'granted' ? 'granted' : (receive === 'denied' ? 'denied' : 'default');
    }

    var listening = false;
    function listenPush() {
        var P = plugin('PushNotifications');
        if (!P || listening) return;
        listening = true;

        P.addListener('registration', function (t) {
            lastToken = t && t.value;
            tokenWaiters.splice(0).forEach(function (w) { w.ok(lastToken); });
        });
        P.addListener('registrationError', function (e) {
            tokenWaiters.splice(0).forEach(function (w) { w.fail(e); });
        });

        // 앱을 보고 있을 때 온 푸시: 웹(onMessage)처럼 화면 위 안내. 10분 안 같은 제목은 건너뛴다
        P.addListener('pushNotificationReceived', function (n) {
            var t = (n && n.title) || '배냇함';
            var b = (n && n.body) || '';
            var seen = window.__pushSeen || (window.__pushSeen = {});
            if (seen[t] && Date.now() - seen[t] < 10 * 60000) return;
            seen[t] = Date.now();
            toast(b ? t + '\n' + b : t);
        });

        // 알림을 눌러 들어왔을 때: 서버가 넣어 준 link 로 간다 (diary.html?day=12 같은)
        P.addListener('pushNotificationActionPerformed', function (a) {
            var data = (a && a.notification && a.notification.data) || {};
            var link = data.link || data.url;
            if (!link) return;
            try {
                var to = new URL(link, location.href);
                if (to.origin === location.origin && to.href !== location.href) location.href = to.href;
            } catch (e) {}
        });

        P.checkPermissions().then(function (st) {
            AppNotification.permission = mapPerm(st && st.receive);
        }).catch(function () {});
    }

    function nativeToken() {
        var P = plugin('PushNotifications');
        if (!P) return Promise.reject(new Error('no_push_plugin'));
        if (lastToken) return Promise.resolve(lastToken);
        return new Promise(function (ok, fail) {
            var timer = setTimeout(function () { fail(new Error('timeout')); }, 20000);
            tokenWaiters.push({
                ok: function (v) { clearTimeout(timer); ok(v); },
                fail: function (e) { clearTimeout(timer); fail(e); }
            });
            P.register().catch(function (e) { clearTimeout(timer); fail(e); });
        });
    }

    /* index.html 의 requestPushPermission 과 같은 자리에 같은 모양으로 적는다
       (users/{카카오 ID} 의 fcm_token · fcm_tokens) */
    function saveToken(token) {
        try { localStorage.setItem('fcm_token', token); } catch (e) {}
        var user = window.auth && window.auth.currentUser;
        if (!user || !window.setDoc || !window.doc || !window.db || !window.arrayUnion) {
            console.warn('[앱 푸시] 로그인이 아직 안 잡혀 토큰 저장을 미룹니다.');
            return Promise.resolve(false);
        }
        try { localStorage.setItem('firebase_uid', user.uid); } catch (e) {}
        var kid = localStorage.getItem('kakao_id') || user.uid;
        return window.setDoc(window.doc(window.db, 'users', String(kid)), {
            fcm_token: token,
            fcm_tokens: window.arrayUnion(token),
            firebase_uid: user.uid,
            token_updated_at: Date.now()
        }, { merge: true }).then(function () { return true; });
    }

    var impl = {
        requestPushPermission: function () {
            var P = plugin('PushNotifications');
            if (!P) return Promise.resolve(false);
            listenPush();
            return P.checkPermissions().then(function (st) {
                if (st && st.receive === 'granted') return st;
                return P.requestPermissions();
            }).then(function (st) {
                AppNotification.permission = mapPerm(st && st.receive);
                if (!st || st.receive !== 'granted') return false;
                return nativeToken().then(saveToken);
            }).catch(function (e) {
                console.error('[앱 푸시] 권한/토큰 에러:', e);
                return false;
            });
        },
        // 이미 켠 사람은 켤 때마다 조용히 토큰 갱신 (권한은 다시 묻지 않는다)
        syncPushToken: function () {
            var P = plugin('PushNotifications');
            if (!P) return Promise.resolve();
            listenPush();
            return P.checkPermissions().then(function (st) {
                AppNotification.permission = mapPerm(st && st.receive);
                if (!st || st.receive !== 'granted') return;
                return nativeToken().then(saveToken);
            }).catch(function () {});
        },
        // 알림 점검(pushcheck.js)이 쓴다
        getPushToken: function () {
            var P = plugin('PushNotifications');
            if (!P) return Promise.resolve({ error: 'unsupported' });
            return P.checkPermissions().then(function (st) {
                AppNotification.permission = mapPerm(st && st.receive);
                if (!st || st.receive !== 'granted') return { error: 'permission' };
                return nativeToken().then(function (token) {
                    try { localStorage.setItem('fcm_token', token); } catch (e) {}
                    return { token: token };
                });
            }).catch(function (e) {
                return { error: (e && (e.code || e.message)) || String(e) };
            });
        }
    };

    // ⚠️ index.html 의 모듈이 나중에 window.requestPushPermission = … 으로 웹 방식을 덮어쓴다.
    //    앱에서는 그 덮어쓰기를 받지 않는다 (받으면 웹 푸시를 시도하다 조용히 실패한다).
    Object.keys(impl).forEach(function (name) {
        try {
            Object.defineProperty(window, name, {
                configurable: true,
                get: function () { return impl[name]; },
                set: function () { /* 웹 방식은 앱에서 쓰지 않는다 */ }
            });
        } catch (e) { window[name] = impl[name]; }
    });

    /* ==========================================================
       3. 저장 · 공유 — 크롬 대신 사진첩 저장, 안드로이드 공유 창
       ---------------------------------------------------------- */
    function blobToBase64(blob) {
        return new Promise(function (ok, fail) {
            var r = new FileReader();
            r.onload = function () { ok(String(r.result).split(',')[1] || ''); };
            r.onerror = function () { fail(r.error); };
            r.readAsDataURL(blob);
        });
    }

    var Files = function () { return plugin('BaenaetFiles'); };

    try {
        navigator.canShare = function (data) { return !!data && !!Files(); };
        navigator.share = function (data) {
            var F = Files();
            if (!F) return Promise.reject(new DOMException('공유를 쓸 수 없어요', 'NotAllowedError'));
            data = data || {};
            var text = [data.text, data.url].filter(Boolean).join('\n');
            var file = data.files && data.files[0];
            if (!file) return F.share({ title: data.title || '', text: text });
            return blobToBase64(file).then(function (b64) {
                return F.share({
                    base64: b64,
                    name: file.name || 'baenaet',
                    mime: file.type || 'application/octet-stream',
                    title: data.title || '',
                    text: text
                });
            });
        };
    } catch (e) {}

    function saveFromLink(a) {
        var F = Files();
        if (!F) return false;
        var href = a.href || '';
        if (href.indexOf('blob:') !== 0 && href.indexOf('data:') !== 0) return false;
        var name = a.getAttribute('download') || 'baenaet';
        fetch(href).then(function (r) { return r.blob(); }).then(function (blob) {
            return blobToBase64(blob).then(function (b64) {
                return F.save({ base64: b64, name: name, mime: blob.type || 'application/octet-stream' });
            });
        }).then(function (r) {
            toast((r && r.where ? r.where : '폰') + '에 저장했어요');
        }).catch(function (e) {
            console.error('[앱 저장]', e);
            toast('저장하지 못했어요. 잠시 뒤 다시 해 주세요');
        });
        return true;
    }

    // 사이트는 a.download 를 만들어 .click() 한다 → 그 순간을 가로채 사진첩에 저장
    try {
        var origClick = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = function () {
            if (this.hasAttribute && this.hasAttribute('download') && saveFromLink(this)) return;
            return origClick.apply(this, arguments);
        };
    } catch (e) {}
    // 손가락으로 누른 다운로드 링크도
    document.addEventListener('click', function (ev) {
        var a = ev.target && ev.target.closest ? ev.target.closest('a[download]') : null;
        if (a && saveFromLink(a)) { ev.preventDefault(); ev.stopPropagation(); }
    }, true);

    /* ==========================================================
       4. 준비되면 바로 연결
       ---------------------------------------------------------- */
    function boot() {
        listenPush();
        if (!patchKakao()) {
            // 카카오 SDK 가 늦게 뜨는 화면 대비: 잠깐 기다렸다 다시
            var n = 0, t = setInterval(function () {
                if (patchKakao() || ++n > 40) clearInterval(t);
            }, 250);
        }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
