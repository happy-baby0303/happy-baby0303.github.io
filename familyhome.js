/* ============================================================
   배냇함 — 내 가족방 기억하기 (familyhome.js)

   왜 필요한가
     새 폰에서, 또는 새 앱에서 카카오로 로그인하면 그 폰에는 '가족 코드' 가 없다.
     (플레이 앱이 크롬 대신 직접 화면을 그리게 바뀌면 저장 공간도 새로 시작한다)
     그러면 예전엔 빈 새 방을 만들어 버렸다.
     기록은 원래 방에 그대로 있는데, 쓰는 사람 눈에는 전부 날아간 것처럼 보였다.

   하는 일 둘
     1. rememberFamilyHome — 지금 가족방 코드를 내 문서(users/{카카오 ID})에 적어 둔다.
        내 문서는 나만 읽고 쓴다 (보안 규칙 users: ownsUserDoc).
        바뀌었을 때만 적는다 (앱을 열 때마다 쓰지 않는다).
     2. restoreFamilyHome — 이 폰에 코드가 없으면, 적어 둔 방으로 돌아간다.
        ⚠️ 내가 아직 그 방 사람일 때만. 방에서 나갔거나 방이 없어졌으면 돌아가지 않는다.
        ⚠️ 인터넷이 끊겨 확인을 못 했으면, 그날은 기억을 덮어쓰지 않는다
           (빈 새 방이 만들어져도 다음에 원래 방으로 돌아올 수 있게).

   index.html 의 로그인 감지(onAuthStateChanged)가 부른다.
   ============================================================ */
(function () {
    'use strict';

    var MARK = 'tosil_home_saved';   // 마지막으로 서버에 적은 값 (같으면 다시 안 적는다)

    function lsGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
    function lsSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }

    function ready() {
        return !!(window.db && window.doc && window.getDoc && window.setDoc);
    }

    function userDocId(user, kakaoId) {
        return String(kakaoId || lsGet('kakao_id') || (user && user.uid) || '');
    }

    /* 방 명단에서 내 역할. 옛 배열 구조는 전부 master 로 본다. 없으면 null */
    function roleIn(room, uid) {
        var m = room && room.members;
        if (!m || !uid) return null;
        if (Array.isArray(m)) return m.indexOf(uid) >= 0 ? 'master' : null;
        return Object.prototype.hasOwnProperty.call(m, uid) ? String(m[uid] || 'member') : null;
    }

    var restoreFailed = false;

    window.rememberFamilyHome = function (user, kakaoId) {
        if (!ready() || !user || restoreFailed) return Promise.resolve(false);
        var code = lsGet('family_sync_code');
        if (!code || code.indexOf('TS-') !== 0) return Promise.resolve(false);

        var role = lsGet('user_role') || '';
        var label = lsGet('tosil_helper_label') || '';
        var sig = code + '|' + role + '|' + label + '|' + user.uid;
        if (lsGet(MARK) === sig) return Promise.resolve(false);

        var data = { firebase_uid: user.uid, family_code: code, family_code_at: Date.now() };
        if (role) data.family_role = role;
        if (label) data.family_label = label;

        return window.setDoc(window.doc(window.db, 'users', userDocId(user, kakaoId)), data, { merge: true })
            .then(function () { lsSet(MARK, sig); return true; })
            .catch(function (e) { console.warn('[가족방 기억] 못 적었어요', e); return false; });
    };

    window.restoreFamilyHome = async function (user, kakaoId) {
        if (!ready() || !user) return null;
        if (lsGet('family_sync_code')) return null;

        try {
            var me = await window.getDoc(window.doc(window.db, 'users', userDocId(user, kakaoId)));
            var mine = me && me.exists() ? (me.data() || {}) : {};
            var code = mine.family_code;
            if (typeof code !== 'string' || code.indexOf('TS-') !== 0) return null;

            var snap = await window.getDoc(window.doc(window.db, 'families', code));
            if (!snap || !snap.exists()) return null;
            var room = snap.data() || {};
            var role = roleIn(room, user.uid);
            if (!role) return null;                       // 그 방에서 나갔다 → 돌아가지 않는다

            lsSet('family_sync_code', code);
            if (room.babyName) lsSet('tosil_babyName', room.babyName);
            if (room.babyBirth) lsSet('tosil_startDate', room.babyBirth);
            if (!lsGet('tosil_baby')) {
                lsSet('tosil_baby', JSON.stringify({ name: room.babyName || '우리아기', birth: room.babyBirth || '' }));
            }
            // 가족방 사진은 칸이 하나뿐이다. 첫째를 볼 때, 이 폰에 사진이 없을 때만 받는다 (connectSyncCode 와 같은 기준)
            if (room.babyPhoto && !window.currentBabySuffix && !lsGet('tosil_baby_photo')) {
                lsSet('tosil_baby_photo', room.babyPhoto);
            }

            // 역할: 돌봄 도우미(viewer)는 서버가 정한 대로 잠근다. 엄마·아빠는 적어 둔 대로.
            if (role === 'viewer') {
                lsSet('user_role', 'senior');
                lsSet('tosil_role_locked', 'viewer');
                if (mine.family_label) lsSet('tosil_helper_label', mine.family_label);
            } else if (!lsGet('user_role') && /^(mom|dad)$/.test(mine.family_role || '')) {
                lsSet('user_role', mine.family_role);
            }

            lsSet(MARK, code + '|' + (lsGet('user_role') || '') + '|' + (lsGet('tosil_helper_label') || '') + '|' + user.uid);
            console.log('✅ 원래 가족방으로 돌아왔어요:', code);
            return code;
        } catch (e) {
            // 인터넷이 끊겼거나 서버가 막았다. 오늘은 기억을 덮어쓰지 않는다.
            restoreFailed = true;
            console.warn('[가족방 찾기] 확인 못 했어요 (기억은 그대로 둬요)', e);
            return null;
        }
    };
})();
