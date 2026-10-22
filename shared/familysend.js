/* ============================================================
   배냇함 큐레이터 — 짝꿍에게 보내기 (shared/familysend.js)

   왜 필요한가
     큐레이터(이유식 · 카시트 …)는 본 앱과 다른 페이지라 파이어베이스가 없다.
     그래서 '여보한테 장볼 거 보내기' 는 카톡으로만 보낼 수 있었고,
     받은 사람은 카톡 대화창 어딘가에 묻힌 목록을 마트에서 다시 찾아야 했다.

   하는 일
     짝꿍의 배냇함 '바통터치' 에 부탁 하나를 올리고, 짝꿍 폰에 알림을 보낸다.
     짝꿍은 홈 · 툴박스의 바통터치에서 보고 '접수' → '해결' 을 누른다. 다 하면 보낸 사람에게 알림이 간다.
     (본 앱의 바통터치와 같은 칸 · 같은 모양이다. 새로 만드는 저장소는 없다)

   ⚠️ 파이어베이스는 '보내기' 를 누를 때만 불러온다. 큐레이터를 여는 것만으로는 아무것도 안 읽는다.
   ⚠️ 로그인 · 가족 연결이 안 돼 있으면 보내지 않고 이유를 돌려준다 (카톡으로 보내면 된다).

   쓰는 법
     FamilySend.ready()   → Promise<{ ok, why, partner }>   보낼 수 있나 (짝꿍이 연결돼 있나)
     FamilySend.baton({ text, kind, items, title, body, link })  → Promise<{ ok, why }>

   각 큐레이터 index.html 에서 favsync.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var V = '10.12.2';
    var BASE = 'https://www.gstatic.com/firebasejs/' + V + '/';
    var CONFIG = {
        apiKey: "AIzaSyDyXVAf-uiqutmfCd5Bhh34bQmbnFynpas",
        authDomain: "happybaby-6de42.firebaseapp.com",
        projectId: "happybaby-6de42",
        storageBucket: "happybaby-6de42.firebasestorage.app",
        messagingSenderId: "1075311024495",
        appId: "1:1075311024495:web:b9212eab58802dabf9709a"
    };

    function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function code() { return get('family_sync_code') || ''; }

    var fb = null;
    function load() {
        if (fb) return fb;
        fb = Promise.all([
            import(BASE + 'firebase-app.js'),
            import(BASE + 'firebase-auth.js'),
            import(BASE + 'firebase-firestore.js'),
            import(BASE + 'firebase-functions.js')
        ]).then(function (m) {
            var A = m[0], U = m[1], F = m[2], N = m[3];
            var app = (A.getApps && A.getApps().length) ? A.getApp() : A.initializeApp(CONFIG);
            var auth = U.getAuth(app);
            return new Promise(function (ok) {
                var done = false;
                var un = U.onAuthStateChanged(auth, function (user) {
                    if (done) return; done = true;
                    try { un && un(); } catch (e) {}
                    ok({ user: user, F: F, db: F.getFirestore(app), fn: N.getFunctions(app, 'asia-northeast3'), call: N.httpsCallable });
                });
                setTimeout(function () { if (!done) { done = true; ok({ user: auth.currentUser, F: F, db: F.getFirestore(app), fn: N.getFunctions(app, 'asia-northeast3'), call: N.httpsCallable }); } }, 6000);
            });
        });
        fb.catch(function () { fb = null; });
        return fb;
    }

    /* 보낼 수 있나 — 로그인 · 가족방 · 짝꿍(엄마 아빠 중 다른 한 사람) */
    function ready() {
        if (!code()) return Promise.resolve({ ok: false, why: 'nofamily' });
        if (!get('kakao_id') && !get('firebase_uid')) return Promise.resolve({ ok: false, why: 'login' });
        return load().then(function (x) {
            if (!x.user) return { ok: false, why: 'login' };
            return x.F.getDoc(x.F.doc(x.db, 'families', code())).then(function (s) {
                var m = s.exists() ? (s.data() || {}).members : null;
                if (!m) return { ok: false, why: 'nofamily' };
                var ids = Array.isArray(m) ? m : Object.keys(m);
                if (ids.indexOf(x.user.uid) < 0) return { ok: false, why: 'nofamily' };
                var partner = ids.some(function (u) { return u !== x.user.uid && (Array.isArray(m) || m[u] !== 'viewer'); });
                return { ok: partner, why: partner ? '' : 'nopartner', partner: partner };
            });
        }).catch(function (e) {
            console.warn('[짝꿍에게 보내기]', e);
            return { ok: false, why: 'offline' };
        });
    }

    function hhmm() {
        var d = new Date();
        return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    }
    function myWord() { return get('user_role') === 'dad' ? '아빠' : '엄마'; }

    /* 바통터치에 하나 올리고 짝꿍에게 알림 */
    function baton(o) {
        o = o || {};
        var text = String(o.text || '').trim().slice(0, 300);
        if (!text) return Promise.resolve({ ok: false, why: 'empty' });
        return ready().then(function (r) {
            if (!r.ok) return r;
            return load().then(function (x) {
                var F = x.F, ref = F.doc(x.db, 'baton_' + code(), 'status');
                var rec = {
                    id: 'baton_' + Date.now(), text: text, reward: '없음', time: hhmm(), status: 'requested',
                    by: x.user.uid, byRole: myWord(), kind: o.kind || '', from: o.from || ''
                };
                if (Array.isArray(o.items)) rec.items = o.items.slice(0, 30);
                /* ⚠️ 본 앱도 같은 칸(records 목록)을 통째로 쓴다. 짝꿍이 그 사이에 올린 부탁이 지워지지 않게 읽고-붙이고-쓰기를 한 번에 */
                var write = F.runTransaction
                    ? F.runTransaction(x.db, function (t) {
                        return t.get(ref).then(function (s) {
                            var list = s.exists() ? ((s.data() || {}).records || []) : [];
                            list = [rec].concat(list).slice(0, 50);
                            t.set(ref, { records: list });
                            return list;
                        });
                    })
                    : F.getDoc(ref).then(function (s) {
                        var list = s.exists() ? ((s.data() || {}).records || []) : [];
                        list = [rec].concat(list).slice(0, 50);
                        return F.setDoc(ref, { records: list }).then(function () { return list; });
                    });
                return write.then(function (list) {
                    try { localStorage.setItem('tosil_baton_records', JSON.stringify(list)); } catch (e) {}
                    // 알림은 실패해도 부탁은 올라갔다 (짝꿍이 앱을 열면 보인다)
                    try {
                        x.call(x.fn, 'sendFamilyPush')({
                            syncCode: code(),
                            title: o.title || ('💌 ' + myWord() + '가 부탁을 보냈어요'),
                            body: o.body || text.slice(0, 60),
                            excludeToken: get('fcm_token') || null,
                            link: o.link || 'index.html?go=baton',
                            skipRoles: ['viewer']
                        }).catch(function () {});
                    } catch (e) {}
                    return { ok: true };
                });
            });
        }).catch(function (e) {
            console.warn('[짝꿍에게 보내기] 실패', e);
            return { ok: false, why: 'offline' };
        });
    }

    window.FamilySend = { ready: ready, baton: baton };
})();
