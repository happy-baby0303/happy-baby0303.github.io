/* ============================================================
   배냇함 — 이 폰에서 다른 카카오 계정으로 바꿔 들어왔을 때 (accountswitch.js)

   로그아웃은 이 폰과 계정의 연결만 끊고 기록은 이 폰에 남겨 둔다
   (인터넷이 끊긴 사이에 적어서 아직 서버에 못 올라간 기록이 사라지지 않게).
   ⚠️ 그런데 이 폰에서 '다른' 카카오 계정으로 로그인하면, 앞 계정의 아기 이름 · 생일 · 기록이
      새 계정이 만드는 가족방으로 그대로 옮겨 갔다 (앞 계정의 가족방에 들어가는 것만은 막혀 있었다).

   이제 로그인한 계정이 이 폰에서 마지막으로 쓰던 계정과 다르고 이 폰에 기록이 있으면 한 번 묻는다.
     이어서 쓰기        이 폰의 기록으로 이어서 쓴다 (엄마 폰으로 아빠가 들어온 경우 등)
     비우고 새로 시작   이 폰의 기록을 앞 계정 몫으로 이 폰에 보관해 두고 비운다.
                        새 계정이 전에 이 폰에 보관해 둔 기록이 있으면 그걸 되살린다.
     로그인 그만두기    방금 한 로그인을 취소한다 (이 폰은 그대로)
   같은 계정이면 아무것도 묻지 않는다.

   보관은 이 폰의 IndexedDB 'baenaet-accounts' 에 계정마다 하나씩 (최근 3개까지).
   못 올린 사진 · 목소리(tosil-photos 의 pending)도 같이 보관한다 — 남겨 두면 새 계정 가족방으로 올라간다.
   탈퇴하면 그 계정 몫은 지운다 (dropAccountBackup).

   그리고 로그아웃할 때 이 폰의 알림 주소를 그 계정에서 뺀다 (forgetThisDeviceForPush).
   ⚠️ 빼지 않아서, 로그아웃한 폰에 그 가족의 알림이 계속 왔다.

   index.html 의 로그인 감지(onAuthStateChanged)가 맨 먼저 checkAccountSwitch(user) 를 부른다.
   ============================================================ */
(function () {
    'use strict';

    var LAST = 'tosil_last_uid';
    var DB_NAME = 'baenaet-accounts', STORE = 'snapshots', KEEP_MAX = 3;
    var PHOTO_DB = 'tosil-photos', PHOTO_STORES = ['thumbs', 'pending'];
    /* 보관하지 않고 이 폰에 그대로 두는 것: 계정을 가리키는 값(새 로그인이 다시 적는다) · 이 기기의 알림 주소 · 초대 링크로 들어오는 중 */
    var NOT_SAVED = ['tosil_last_uid', 'firebase_uid', 'kakao_id', 'kakao_nickname', 'kakao_profile_image',
                     'tosil_is_master', 'tosil_is_subadmin', 'fcm_token', 'tosil_native_push_only', 'pending_invite_code'];
    var STAY = ['fcm_token', 'tosil_native_push_only', 'pending_invite_code'];

    function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
    function del(k) { try { localStorage.removeItem(k); } catch (e) {} }

    /* 이 페이지가 열릴 때 이 폰을 쓰던 계정 — 로그인보다 먼저 읽어 둔다 (로그인하면 firebase_uid 가 새 계정으로 바뀐다).
       이 파일이 들어오기 전에 로그아웃한 폰은 tosil_last_uid 가 없어서 firebase_uid 로 본다 (로그아웃은 그걸 지우지 않는다) */
    var prevAtLoad = get(LAST) || get('firebase_uid') || '';

    /* 이 폰에 앞 계정의 기록이 있나 — 아기를 등록했거나 가족방에 들어 있으면 */
    function hasRecords() {
        return !!(get('tosil_babyName') || get('tosil_baby') || get('family_sync_code'));
    }

    /* ---------- IndexedDB ---------- */
    function open(name, version, stores) {
        return new Promise(function (res, rej) {
            if (!window.indexedDB) return rej(new Error('no indexedDB'));
            var req = indexedDB.open(name, version);
            req.onupgradeneeded = function () {
                var db = req.result;
                stores.forEach(function (s) { if (!db.objectStoreNames.contains(s)) db.createObjectStore(s); });
            };
            req.onsuccess = function () { res(req.result); };
            req.onerror = function () { rej(req.error); };
        });
    }
    function done(tx) { return new Promise(function (res, rej) { tx.oncomplete = res; tx.onerror = function () { rej(tx.error); }; tx.onabort = function () { rej(tx.error); }; }); }
    function snapshotsDB() { return open(DB_NAME, 1, [STORE]); }
    function photosDB() { return open(PHOTO_DB, 3, PHOTO_STORES); }   // photos.js 와 같은 판 · 같은 칸

    async function readAll(db, store) {
        var tx = db.transaction(store, 'readonly'), os = tx.objectStore(store);
        var keys = await new Promise(function (res, rej) { var r = os.getAllKeys(); r.onsuccess = function () { res(r.result || []); }; r.onerror = function () { rej(r.error); }; });
        var vals = await new Promise(function (res, rej) { var r = os.getAll(); r.onsuccess = function () { res(r.result || []); }; r.onerror = function () { rej(r.error); }; });
        return keys.map(function (k, i) { return [k, vals[i]]; });
    }

    async function takePendingPhotos() {
        try {
            var db = await photosDB();
            var pending = await readAll(db, 'pending');
            var tx = db.transaction(PHOTO_STORES, 'readwrite');
            PHOTO_STORES.forEach(function (s) { tx.objectStore(s).clear(); });
            await done(tx);
            db.close();
            return pending;
        } catch (e) { console.warn('[계정 바꾸기] 사진 칸을 못 비웠어요', e); return []; }
    }

    async function putPendingPhotos(list) {
        if (!list || !list.length) return;
        try {
            var db = await photosDB();
            var tx = db.transaction('pending', 'readwrite'), os = tx.objectStore('pending');
            list.forEach(function (kv) { os.put(kv[1], kv[0]); });
            await done(tx);
            db.close();
        } catch (e) { console.warn('[계정 바꾸기] 못 올린 사진을 못 되살렸어요', e); }
    }

    async function saveSnapshot(uid, snap) {
        var db = await snapshotsDB();
        var all = await readAll(db, STORE);
        var tx = db.transaction(STORE, 'readwrite'), os = tx.objectStore(STORE);
        os.put(snap, uid);
        /* 최근 KEEP_MAX 개만 (이번 것 포함) */
        var others = all.filter(function (kv) { return kv[0] !== uid; })
                        .sort(function (a, b) { return ((b[1] || {}).at || 0) - ((a[1] || {}).at || 0); });
        others.slice(KEEP_MAX - 1).forEach(function (kv) { os.delete(kv[0]); });
        await done(tx);
        db.close();
    }

    async function takeSnapshot(uid) {
        try {
            var db = await snapshotsDB();
            var tx = db.transaction(STORE, 'readwrite'), os = tx.objectStore(STORE);
            var snap = await new Promise(function (res) { var r = os.get(uid); r.onsuccess = function () { res(r.result || null); }; r.onerror = function () { res(null); }; });
            if (snap) os.delete(uid);
            await done(tx);
            db.close();
            return snap;
        } catch (e) { return null; }
    }

    /* 탈퇴할 때: 그 계정 몫으로 이 폰에 보관해 둔 기록과 사진 칸을 지운다 */
    window.dropAccountBackup = async function (uid) {
        if (uid) await takeSnapshot(String(uid));
        await takePendingPhotos();
    };

    /* ---------- 이 폰의 기록을 보관하고 비운다 ---------- */
    function lsDump() {
        var out = {};
        try {
            for (var i = 0; i < localStorage.length; i++) {
                var k = localStorage.key(i);
                if (k && NOT_SAVED.indexOf(k) < 0 && k.indexOf('firebase:') !== 0) out[k] = localStorage.getItem(k);
            }
        } catch (e) {}
        return out;
    }

    function lsClearKeep(keep) {
        var stay = {};
        keep.forEach(function (k) { var v = get(k); if (v !== null) stay[k] = v; });
        try { localStorage.clear(); } catch (e) {}
        Object.keys(stay).forEach(function (k) { set(k, stay[k]); });
    }

    async function startFresh(prev, user, kakaoSub) {
        var uid = user.uid;
        var dump = lsDump();
        var pending = await takePendingPhotos();
        try {
            await saveSnapshot(String(prev), { uid: String(prev), at: Date.now(), ls: dump, pending: pending });
        } catch (e) {
            /* 보관을 못 했으면 비우지 않는다 — 기록이 사라지면 안 된다. 사진도 제자리에 둔다 */
            console.warn('[계정 바꾸기] 보관을 못 해서 비우지 않아요', e);
            await putPendingPhotos(pending);
            if (window.showToast) window.showToast('이 폰에 보관할 자리가 없어서 비우지 못했어요');
            return false;
        }

        lsClearKeep(STAY);
        var back = await takeSnapshot(String(uid));
        if (back && back.ls) {
            Object.keys(back.ls).forEach(function (k) { if (NOT_SAVED.indexOf(k) < 0) set(k, back.ls[k]); });
            await putPendingPhotos(back.pending);
        }
        set('firebase_uid', uid);
        set('kakao_id', kakaoSub || uid);
        set(LAST, uid);
        prevAtLoad = uid;
        if (window.showToast) window.showToast(back ? '이 폰에 보관해 둔 기록을 되살렸어요' : '새로 시작해요');
        return true;
    }

    async function cancelLogin(prev) {
        try { if (window.auth && typeof window.auth.signOut === 'function') await window.auth.signOut(); } catch (e) {}
        ['kakao_id', 'kakao_nickname', 'kakao_profile_image', 'tosil_is_master', 'tosil_is_subadmin'].forEach(del);
        set('firebase_uid', prev);       // 이 폰은 앞 계정이 쓰던 그대로 (다음에 다시 물을 수 있게)
        if (window.showToast) window.showToast('로그인을 그만뒀어요');
    }

    function reloadSoon() { setTimeout(function () { try { location.reload(); } catch (e) {} }, 900); }

    /* 로그인 감지가 맨 먼저 부른다.
       'go'   — 그대로 이어서 (같은 계정 · 처음 로그인 · 이어서 쓰기)
       'stop' — 여기서 멈춘다 (비우고 새로 시작 → 다시 열린다 · 그만두기 → 로그아웃 상태로 다시 열린다) */
    window.checkAccountSwitch = async function (user, kakaoSub) {
        var uid = user && user.uid ? String(user.uid) : '';
        if (!uid) return 'go';
        var prev = prevAtLoad;
        if (!prev || prev === uid || !hasRecords() || typeof window.askChoice !== 'function') {
            set(LAST, uid);
            prevAtLoad = uid;
            return 'go';
        }
        /* 로그인하는 동안 덮어 둔 화면(로딩 · 이름 묻기)이 있으면 고르는 창이 그 위에 뜬다 */
        var pick = await window.askChoice({
            title: '이 폰에 다른 카카오 계정의\n기록이 있어요',
            sub: '가족이 같이 쓰는 폰이면 이어서 쓰고, 다른 사람이면 비우고 새로 시작하세요. 비워도 앞 계정의 기록은 지우지 않고 보관해요',
            options: [
                { label: '이어서 쓰기', value: 'keep' },
                { label: '비우고 새로 시작', value: 'fresh' }
            ],
            no: '로그인 그만두기'
        });
        if (pick === 'keep') {
            set(LAST, uid);
            prevAtLoad = uid;
            return 'go';
        }
        if (pick === 'fresh') {
            var ok = await startFresh(prev, user, kakaoSub);
            if (!ok) { await cancelLogin(prev); }
            reloadSoon();
            return 'stop';
        }
        await cancelLogin(prev);
        reloadSoon();
        return 'stop';
    };

    /* 로그아웃할 때 부른다 (script.js logoutKakao) — 이 폰의 알림 주소를 이 계정에서 뺀다 */
    /* ⚠️ 인터넷이 끊겨 있으면 서버에 쓰기가 끝나지 않고 기다린다 → 로그아웃이 멈추지 않게 3초까지만 기다린다
          (못 끝낸 쓰기는 파이어베이스가 쥐고 있다가 그 계정으로 다시 들어오면 마저 보낸다) */
    function within(ms, p) { return Promise.race([p, new Promise(function (res) { setTimeout(function () { res('timeout'); }, ms); })]); }

    window.forgetThisDeviceForPush = async function () {
        var tk = get('fcm_token'), kid = get('kakao_id');
        if (!tk || !kid || !window.db || !window.doc || !window.updateDoc || !window.arrayRemove) return false;
        try {
            var ref = window.doc(window.db, 'users', String(kid));
            var patch = { fcm_tokens: window.arrayRemove(tk) };
            try {
                var snap = window.getDoc ? await within(2000, window.getDoc(ref)) : null;
                if (snap && snap !== 'timeout' && snap.exists() && (snap.data() || {}).fcm_token === tk && window.deleteField) patch.fcm_token = window.deleteField();
            } catch (e) {}
            var r = await within(3000, window.updateDoc(ref, patch));
            return r !== 'timeout';
        } catch (e) {
            console.warn('[로그아웃] 이 폰의 알림 주소를 못 뺐어요', e);
            return false;
        }
    };
})();
