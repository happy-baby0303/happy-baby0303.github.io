/* ============================================================
   배냇함 — 우리의 문답 공용 (qacore.js)

   문답 화면(diary.html)과 홈 카드(diary.js)가 같은 일을 따로 하고 있었다.
     누가 답했는지 읽기 · 저장 · 짝꿍에게 알리기 · 코인
   홈에서 바로 쓰게 하려면 저장하는 곳이 두 군데가 된다.
   두 군데면 언젠가 어긋난다. 그래서 여기 하나로 모은다.
   두 화면은 '어디에 그릴지' 만 정한다 (QA.setHost).

   저장 모양 — 예전 그대로에 칸 두 개를 더했다
     day_N_data = { husbandAns, wifeAns, date,
                    husbandAt, wifeAt }      ← 새 칸: 각자 처음 답한 때 (ISO)
     서버: diary_가족코드/day_N  (칸마다 merge — 둘이 동시에 써도 안 지운다)

   ⚠️ 내 답을 먼저 써야 짝꿍 답이 보인다. 먼저 보면 따라 쓰게 된다.
   ⚠️ 재촉은 하루 한 번만. 그 이상은 부부 사이를 상하게 한다.
   ⚠️ 부부 둘만의 알림이다. 할머니 · 시터 선생님에게는 안 보낸다 (skipRoles).

   index.html: data.js 다음, diary.js 앞
   diary.html: data.js 다음
   ============================================================ */
(function () {
    'use strict';
    if (window.QA) return;

    var MAX_DAY = 2000, PER_BOOK = 100;
    var K = {
        pending: 'tosil_diary_pending',     // 저장은 눌렀는데 서버가 아직 못 받은 날
        nudge:   'tosil_diary_nudge',       // 마지막으로 살짝 알린 날
        pushAt:  'tosil_diary_push_at',     // 마지막 '답 남겼어요' 알림 시각
        seen:    'tosil_qa_seen',           // 서로의 답이 열린 걸 본 날들
        seenOld: 'tosil_qa_seen_day',       // (옛 키 — 하나만 기억했다)
        draft:   'tosil_qa_draft',          // 쓰다 만 글
        coins:   'tosil_coins',
        partner: 'tosil_qa_partner'         // 가족방에 짝꿍이 있나 (10분 기억)
    };
    var TITLES = ['처음', '나란히', '깊어지는', '여전히', '오래'];

    /* 열 달의 문답(stage.js)과 같은 종이 · 같은 명조 */
    var T = {
        PAPER: '#FFFDF9', LINE: '#EFE7DC', INK: '#3B322C', SUB: '#8A7F76', MUTE: '#B5AAA0',
        TINT: '#F5EFE6', GOLD: '#B98A2E', BOX: '#FFFAF1', DASH: '#E3D9CC',
        SERIF: "'Gowun Batang', 'Noto Serif KR', 'Noto Serif CJK KR', serif"
    };

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function toast(m) { try { if (typeof window.showToast === 'function') window.showToast(m); } catch (e) {} }
    function today() {
        var t = new Date();
        return t.getFullYear() + '-' + (t.getMonth() + 1) + '-' + t.getDate();
    }
    /* 「처음」이 · 「나란히」가 — 받침에 맞춰 */
    function ig(w) {
        var s = String(w || ''), c = s.charCodeAt(s.length - 1);
        return (c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0) ? '이' : '가';
    }

    /* ---------- 누구인가 ----------
       ⚠️ 키가 둘이다. 앱 본체는 user_role(dad/mom), 문답은 tosil_userRole(husband/wife).
          본체 값이 있으면 그걸 따른다. 도우미(senior)는 문답을 쓰지 않는다. */
    function role() {
        var r = localStorage.getItem('user_role');
        if (r === 'dad') return 'husband';
        if (r === 'mom') return 'wife';
        if (r === 'senior') return '';
        var t = localStorage.getItem('tosil_userRole');
        return (t === 'husband' || t === 'wife') ? t : '';
    }
    function myKey() { var r = role(); return r ? (r === 'husband' ? 'husbandAns' : 'wifeAns') : ''; }
    function otherKey(k) { return k === 'husbandAns' ? 'wifeAns' : 'husbandAns'; }
    function atOf(k) { return k === 'husbandAns' ? 'husbandAt' : 'wifeAt'; }
    function word(k) { return k === 'husbandAns' ? '아빠' : '엄마'; }
    function code() { return localStorage.getItem('family_sync_code') || ''; }

    /* ---------- 읽기 · 쓰기 ---------- */
    var memo = null;
    function bust() { memo = null; }
    function read(day) {
        try { return JSON.parse(localStorage.getItem('day_' + day + '_data')) || {}; } catch (e) { return {}; }
    }
    function write(day, d) {
        try { localStorage.setItem('day_' + day + '_data', JSON.stringify(d)); } catch (e) {}
        bust();
    }

    /* 한 번 훑어서 쓸 것을 다 센다 (2000칸이라 한 번만) */
    function scan() {
        if (memo) return memo;
        var mk = myKey(), done = [], alone = [], last = 0, firstMine = 0;
        for (var i = 1; i <= MAX_DAY; i++) {
            var raw = null;
            try { raw = localStorage.getItem('day_' + i + '_data'); } catch (e) {}
            if (!raw) { if (!firstMine) firstMine = i; continue; }
            var d;
            try { d = JSON.parse(raw) || {}; } catch (e) { d = {}; }
            if (d.husbandAns && d.wifeAns) done.push(i);
            else if (d.husbandAns || d.wifeAns) alone.push(i);
            if (d.husbandAns || d.wifeAns) last = i;
            if (!firstMine && (!mk || !d[mk])) firstMine = i;
        }
        memo = { done: done, alone: alone, last: last, firstMine: firstMine || 1 };
        setTimeout(bust, 0);    // 이번 차례 동안만 쓴다 (다른 곳이 저장할 수 있다)
        return memo;
    }

    function question(day) {
        if (typeof window.diaryQuestion === 'function') return window.diaryQuestion(day);
        return '';
    }
    function echoDay(day) {
        return (typeof window.diaryEchoDay === 'function') ? window.diaryEchoDay(day) : 0;
    }

    /* ---------- 책 ---------- */
    function bookTitle(vol) { return TITLES[vol - 1] || (vol + '권'); }
    function pageOf(day) {
        var p = scan().done, i = p.indexOf(Number(day));
        if (i < 0) return null;
        var n = i + 1, vol = Math.ceil(n / PER_BOOK);
        return { n: n, vol: vol, page: ((n - 1) % PER_BOOK) + 1, title: bookTitle(vol) };
    }
    function bookNow() {
        var n = scan().done.length, full = Math.floor(n / PER_BOOK);
        return { pages: n, full: full, vol: full + 1, inBook: n % PER_BOOK, title: bookTitle(full + 1) };
    }

    /* ---------- 아직 서버에 못 올린 날 ---------- */
    function pendingDays() {
        try { return (JSON.parse(localStorage.getItem(K.pending)) || []).map(Number).filter(Boolean); }
        catch (e) { return []; }
    }
    function isPending(day) { return pendingDays().indexOf(Number(day)) > -1; }
    function markPending(day, on) {
        var l = pendingDays().filter(function (d) { return d !== Number(day); });
        if (on) l.push(Number(day));
        try { localStorage.setItem(K.pending, JSON.stringify(l)); } catch (e) {}
    }

    /* 칸마다 비어 있지 않은 쪽을 쓴다. 둘 다 있으면 서버가 기준이다.
       단, 아직 못 올린 내 글은 이 폰이 맞다 (서버엔 옛 글이 있을 수 있다). */
    var FIELDS = ['husbandAns', 'wifeAns', 'husbandAt', 'wifeAt', 'date'];
    function mergeDay(day, local, server) {
        var out = Object.assign({}, local || {});
        var mk = isPending(day) ? myKey() : '';
        FIELDS.forEach(function (k) {
            if (mk && (k === mk || k === atOf(mk)) && out[k]) return;
            if (server && server[k]) out[k] = server[k];
        });
        return out;
    }

    /* ---------- 서버 ---------- */
    function authed() { return !!(window.auth && window.auth.currentUser); }
    function canWrite() { return !!(window.db && typeof window.doc === 'function' && typeof window.setDoc === 'function'); }
    function waitAuth(ms) {
        return new Promise(function (res) {
            var t0 = Date.now();
            (function tick() {
                if (authed()) return res(true);
                if (Date.now() - t0 > (ms || 3000)) return res(false);
                setTimeout(tick, 150);
            })();
        });
    }

    /* 짝꿍 답은 짝꿍 폰에서 서버로만 올라간다. 그 날 한 칸만 물어본다 */
    function pull(day) {
        var c = code();
        if (!c || !authed() || !window.db || typeof window.getDoc !== 'function') return Promise.resolve(false);
        try {
            return window.getDoc(window.doc(window.db, 'diary_' + c, 'day_' + day)).then(function (snap) {
                if (!snap || !snap.exists()) return false;
                var loc = read(day), m = mergeDay(day, loc, snap.data() || {});
                if (JSON.stringify(m) === JSON.stringify(loc)) return false;
                write(day, m);
                return true;
            }).catch(function () { return false; });
        } catch (e) { return Promise.resolve(false); }
    }

    var flushing = false;
    function flush() {
        if (flushing) return Promise.resolve(0);
        var list = pendingDays(), c = code(), mk = myKey();
        if (!list.length || !c || !mk || !authed() || !canWrite()) return Promise.resolve(0);
        flushing = true;
        var n = 0;
        return list.reduce(function (p, day) {
            return p.then(function () {
                var d = read(day);
                if (!d[mk]) { markPending(day, false); return; }
                var up = {}; up[mk] = d[mk];
                if (d[atOf(mk)]) up[atOf(mk)] = d[atOf(mk)];
                if (d.date) up.date = d.date;
                return window.setDoc(window.doc(window.db, 'diary_' + c, 'day_' + day), up, { merge: true })
                    .then(function () { markPending(day, false); n++; })
                    .catch(function (e) { console.warn('[문답] 못 올린 답 다시 올리기 실패', day, e); });
            });
        }, Promise.resolve()).then(function () { flushing = false; return n; },
                                   function () { flushing = false; return n; });
    }
    window.addEventListener('online', function () { flush(); });

    /* ---------- 코인 ---------- */
    function coins() { return parseInt(localStorage.getItem(K.coins), 10) || 0; }
    function claimCoin(day) {
        var k = 'day_' + day + '_coin_claimed_' + role();
        if (localStorage.getItem(k)) return 0;
        try {
            localStorage.setItem(K.coins, String(coins() + 100));
            localStorage.setItem(k, 'true');
        } catch (e) { return 0; }
        try { window.dispatchEvent(new CustomEvent('qa:coins')); } catch (e) {}
        return 100;
    }

    /* ---------- 쓰다 만 글 ----------
       짝꿍 답이 도착하면 화면이 새로 그려진다. 쓰던 글이 같이 날아가면 안 된다. */
    function drafts() { try { return JSON.parse(localStorage.getItem(K.draft)) || {}; } catch (e) { return {}; } }
    function getDraft(day) { return drafts()[day] || ''; }
    function setDraft(day, t) {
        var d = drafts();
        if (t) d[day] = t; else delete d[day];
        try { localStorage.setItem(K.draft, JSON.stringify(d)); } catch (e) {}
    }

    /* ---------- 열린 걸 봤나 ---------- */
    function seenList() {
        var l = [];
        try { l = (JSON.parse(localStorage.getItem(K.seen)) || []).map(Number); } catch (e) {}
        return l;
    }
    /* 옛 키는 '마지막으로 열어 본 날' 하나만 기억했다. 그 날까지는 다 본 것으로 친다 */
    function isSeen(day) {
        day = Number(day);
        var old = Number(localStorage.getItem(K.seenOld) || 0);
        return (old && day <= old) || seenList().indexOf(day) > -1;
    }
    function markSeen(day) {
        var l = seenList();
        if (l.indexOf(Number(day)) > -1) return;
        l.push(Number(day));
        try { localStorage.setItem(K.seen, JSON.stringify(l.slice(-80))); } catch (e) {}
    }
    /* 방금 열린 날인가 — 안 봤고, 짝꿍 답이 일주일 안쪽이다.
       (업데이트 뒤 옛날 문답을 넘겨 볼 때마다 '열렸어요' 가 뜨면 안 된다) */
    function recentOpen(day) {
        var mk = myKey(), d = read(day);
        if (!mk || !(d.husbandAns && d.wifeAns) || isSeen(day)) return false;
        var t = Date.parse(d[atOf(otherKey(mk))] || d.date || '');
        return !isNaN(t) && Date.now() - t < 7 * 86400000;
    }

    /* ---------- 알림 ---------- */
    function myToken() {
        try { if (typeof window.myPushToken === 'function' && window.myPushToken()) return window.myPushToken(); } catch (e) {}
        return localStorage.getItem('fcm_token') || null;
    }
    function call(payload) {
        if (!code() || !window.functions || typeof window.httpsCallable !== 'function') return Promise.resolve({ notReady: true });
        payload.syncCode = code();
        payload.excludeToken = myToken();
        payload.skipRoles = ['viewer'];     // 할머니 · 시터 선생님에겐 안 간다 (서버가 이 칸을 읽는다)
        try {
            return window.httpsCallable(window.functions, 'sendFamilyPush')(payload)
                .then(function (r) { return (r && r.data) || {}; })
                .catch(function (e) { console.warn('[문답] 알림 실패', e); return { failed: true, error: String((e && e.message) || e) }; });
        } catch (e) { return Promise.resolve({ failed: true }); }
    }
    function pushAfter(day, complete) {
        /* 밀린 날을 몰아 쓰면 알림이 연달아 갔다. 10분에 한 통.
           단 '서로의 답이 열렸어요' 는 짝꿍이 기다리는 소식이라 2분이면 다시 보낸다. */
        var last = Number(localStorage.getItem(K.pushAt) || 0);
        if (Date.now() - last < (complete ? 2 : 10) * 60000) return;
        try { localStorage.setItem(K.pushAt, String(Date.now())); } catch (e) {}
        var me = word(myKey()), q = question(day);
        if (q.length > 46) q = q.slice(0, 45) + '…';
        call(complete
            ? { title: '💌 ' + me + '도 답했어요', body: '서로의 답이 열렸어요. 뭐라고 썼는지 볼까요?', link: 'diary.html?day=' + day }
            : { title: '📖 ' + me + '가 답을 남겼어요', body: (q ? '「' + q + '」 ' : '') + '내 답을 쓰면 서로 보여요', link: 'diary.html?day=' + day });
    }

    function nudge(day) {
        if (localStorage.getItem(K.nudge) === today()) { toast('오늘은 이미 알렸어요. 조금 기다려 볼까요'); return Promise.resolve('already'); }
        if (!code()) { toast('짝꿍과 연결하면 알릴 수 있어요'); return Promise.resolve('nocode'); }
        var me = word(myKey());
        return call({ title: '💌 오늘 질문, 같이 답해 줄래요?', body: me + '는 벌써 적어 뒀어요. 둘 다 쓰면 서로 보여요',
                      link: 'diary.html?day=' + day }).then(function (r) {
            var err = String(r.error || '');
            if (r.notReady) { toast('잠시 뒤 다시 눌러 주세요'); return 'notready'; }
            if (r.success === false && err.indexOf('가족이 없') > -1) {
                setPartner('no'); toast('짝꿍이 아직 가족방에 없어요'); return 'nopartner';
            }
            if (r.failed) { toast('보내지 못했어요. 잠시 뒤 다시 해 주세요'); return 'failed'; }
            try { localStorage.setItem(K.nudge, today()); } catch (e) {}
            if (r.success === false && err.indexOf('토큰') > -1) { toast('짝꿍 폰 알림이 꺼져 있어요. 직접 한마디 건네 볼까요'); return 'notoken'; }
            toast('💌 살짝 알려 드렸어요');
            return 'sent';
        });
    }

    /* ---------- 가족방에 짝꿍이 있나 ----------
       ⚠️ 혼자 쓰는 방에서도 '살짝 알렸어요' 라고 했다. 알림은 아무 데도 안 갔다. */
    function partnerState() {
        try {
            var v = JSON.parse(sessionStorage.getItem(K.partner) || 'null');
            if (v && v.code === code() && Date.now() - v.at < 10 * 60000) return v.s;
        } catch (e) {}
        return '';
    }
    function setPartner(s) {
        try { sessionStorage.setItem(K.partner, JSON.stringify({ s: s, at: Date.now(), code: code() })); } catch (e) {}
    }
    function partnerWrote() {
        var mk = myKey(); if (!mk) return false;
        var yk = otherKey(mk), st = scan();
        return st.done.length > 0 || st.alone.some(function (d) { return !!read(d)[yk]; });
    }
    function checkPartner() {
        var c = code();
        if (!c) return Promise.resolve('');
        if (partnerWrote()) { setPartner('yes'); return Promise.resolve('yes'); }
        var cached = partnerState();
        if (cached) return Promise.resolve(cached);
        return waitAuth(3000).then(function () {
            if (!authed() || !window.db || typeof window.getDoc !== 'function') return '';
            return window.getDoc(window.doc(window.db, 'families', c)).then(function (snap) {
                var m = snap && snap.exists() ? (snap.data() || {}).members : null;
                if (!m) return '';
                var ids = Array.isArray(m) ? m : Object.keys(m).filter(function (u) { return m[u] !== 'viewer'; });
                var s = ids.length >= 2 ? 'yes' : 'no';
                setPartner(s);
                return s;
            }).catch(function () { return ''; });
        });
    }

    /* ---------- 저장 ---------- */
    function save(day, text) {
        day = Number(day);
        var mk = myKey();
        if (!mk) return Promise.reject(new Error('no-role'));
        var d = read(day);
        var wasComplete = !!(d.husbandAns && d.wifeAns);
        var editing = !!d[mk];
        d[mk] = text;
        var up = {}; up[mk] = text;
        if (!editing && !d[atOf(mk)]) { d[atOf(mk)] = new Date().toISOString(); up[atOf(mk)] = d[atOf(mk)]; }
        /* ⚠️ 고칠 때마다 date 를 오늘로 덮어써서 3일째 답을 40일째에 고치면
              배냇함 연대기에서 40일째로 옮겨갔다. date 는 '그 대화가 이뤄진 날' 이다. */
        if (!editing || !d.date) { d.date = new Date().toISOString(); up.date = d.date; }
        write(day, d);
        setDraft(day, '');
        var complete = !!(d.husbandAns && d.wifeAns);
        var coin = editing ? 0 : claimCoin(day);

        /* ⚠️ 서버가 '받았다' 고 할 때까지 기다리면 신호 약한 곳에서 버튼이 안 풀린다.
              내 폰엔 이미 저장됐다. 5초만 기다리고, 못 올린 날은 적어 뒀다가 다음에 올린다. */
        var c = code(), job;
        if (!c) job = Promise.resolve(false);
        else {
            markPending(day, true);
            job = waitAuth(2500).then(function () {
                if (!authed() || !canWrite()) return false;
                return window.setDoc(window.doc(window.db, 'diary_' + c, 'day_' + day), up, { merge: true })
                    .then(function () { markPending(day, false); return true; })
                    .catch(function (e) { console.warn('[문답] 서버 저장 실패 — 폰에는 남았어요', e); return false; });
            });
        }
        var slow = new Promise(function (r) { setTimeout(function () { r('slow'); }, 5000); });
        return Promise.race([job, slow]).then(function (ok) {
            try {
                window.dispatchEvent(new CustomEvent('diary:saved', { detail: {
                    day: day, role: role(), isEditing: editing, complete: complete } }));
            } catch (e) {}
            if (!editing && c) pushAfter(day, complete);
            return { day: day, complete: complete, wasComplete: wasComplete, editing: editing,
                     coin: coin, linked: !!c, queued: !!c && ok !== true };
        });
    }

    /* ============================================================
       그리기 — 질문 아래 몸통 (홈 창과 문답 화면이 같이 쓴다)
       ============================================================ */
    var CSS = '' +
        '.qa-head{display:flex;justify-content:space-between;align-items:baseline;gap:10px;}' +
        '.qa-h{font-family:' + T.SERIF + ';font-size:17px;font-weight:700;color:' + T.INK + ';letter-spacing:-0.3px;}' +
        '.qa-meta{font-size:12px;font-weight:600;color:' + T.SUB + ';letter-spacing:-0.2px;}' +
        '.qa-q{font-family:' + T.SERIF + ';font-size:19px;font-weight:700;color:' + T.INK + ';line-height:1.62;' +
            'word-break:keep-all;overflow-wrap:break-word;letter-spacing:-0.3px;}' +
        '.qa-pills{display:flex;gap:6px;flex-wrap:wrap;margin-top:14px;}' +
        '.qa-pill{font-size:12px;font-weight:700;padding:5px 10px;border-radius:999px;line-height:1.3;' +
            'border:1px dashed ' + T.DASH + ';color:' + T.MUTE + ';}' +
        '.qa-pill.on{border:1px solid ' + T.TINT + ';background:' + T.TINT + ';color:' + T.INK + ';}' +
        '.qa-note{font-size:12.5px;font-weight:600;color:' + T.SUB + ';line-height:1.65;word-break:keep-all;margin:12px 0 10px;}' +
        '.qa-tag{display:inline-block;margin-top:12px;padding:6px 11px;border-radius:10px;background:' + T.TINT + ';' +
            'color:' + T.SUB + ';font-size:12px;font-weight:700;line-height:1.5;word-break:keep-all;}' +
        '.qa-area{display:block;width:100%;box-sizing:border-box;min-height:150px;margin:0;padding:15px 16px;' +
            'border:1px solid ' + T.LINE + ';border-radius:16px;background:#FFF;color:' + T.INK + ';' +
            'font-size:15.5px;font-weight:500;line-height:1.75;font-family:inherit;resize:none;outline:none;' +
            '-webkit-appearance:none;appearance:none;box-shadow:none;}' +
        '.qa-area::placeholder{color:#C4B9AE;}' +
        '.qa-area:focus{border-color:#CBBBA6;}' +
        '.qa-btn{display:block;width:100%;box-sizing:border-box;margin:14px 0 0;padding:15px;border-radius:14px;border:none;' +
            'font-family:inherit;font-size:15px;font-weight:700;letter-spacing:-0.2px;text-align:center;cursor:pointer;' +
            '-webkit-tap-highlight-color:transparent;}' +
        '.qa-btn.solid{background:' + T.INK + ';color:#FFFDF9;}' +
        '.qa-btn.line{background:' + T.PAPER + ';color:' + T.INK + ';border:1px solid ' + T.LINE + ';}' +
        '.qa-btn[disabled]{opacity:.55;cursor:default;}' +
        '.qa-box{margin-top:10px;padding:15px 16px 14px;border-radius:16px;background:' + T.BOX + ';border:1px solid ' + T.LINE + ';text-align:left;}' +
        '.qa-who{font-size:12px;font-weight:600;color:' + T.SUB + ';margin-bottom:7px;}' +
        '.qa-text{font-size:15px;font-weight:500;color:' + T.INK + ';line-height:1.75;white-space:pre-wrap;' +
            'word-break:keep-all;overflow-wrap:anywhere;}' +
        '.qa-box.wait{background:transparent;border:1px dashed ' + T.DASH + ';}' +
        '.qa-box.wait .qa-text{color:' + T.MUTE + ';}' +
        '.qa-chip{display:inline-block;margin-top:12px;padding:9px 14px;border-radius:999px;border:none;font-family:inherit;' +
            'font-size:13px;font-weight:700;cursor:pointer;background:' + T.INK + ';color:#FFFDF9;-webkit-tap-highlight-color:transparent;}' +
        '.qa-chip.done{background:' + T.TINT + ';color:' + T.MUTE + ';cursor:default;}' +
        '.qa-echo{margin-top:12px;padding:16px 16px 4px;border-radius:16px;border:1px dashed ' + T.DASH + ';text-align:left;}' +
        '.qa-echo-h{font-size:12px;font-weight:700;color:' + T.GOLD + ';margin-bottom:10px;}' +
        '.qa-echo .qa-who{margin-bottom:4px;}' +
        '.qa-echo .qa-text{font-size:14.5px;margin-bottom:12px;}' +
        '.qa-gold{margin-top:16px;text-align:center;font-size:12.5px;font-weight:700;color:' + T.GOLD + ';line-height:1.6;word-break:keep-all;}' +
        '.qa-link{display:block;width:100%;margin:6px 0 0;padding:12px;background:none;border:none;font-family:inherit;' +
            'font-size:13.5px;font-weight:700;color:' + T.SUB + ';text-align:center;cursor:pointer;-webkit-tap-highlight-color:transparent;}' +
        '.qa-link + .qa-btn{margin-top:2px;}' +
        '.qa-reveal{animation:qaReveal 1.1s cubic-bezier(.2,.7,.2,1) both;}' +
        '@keyframes qaReveal{0%{filter:blur(9px);opacity:.35;transform:translateY(4px);}100%{filter:blur(0);opacity:1;transform:none;}}' +
        '@media (prefers-reduced-motion:reduce){.qa-reveal{animation:none;}}';

    function injectCSS() {
        if (document.getElementById('qa-core-css')) return;
        var s = document.createElement('style');
        s.id = 'qa-core-css';
        s.textContent = CSS;
        (document.head || document.documentElement).appendChild(s);
    }

    function pill(on, label) {
        return '<span class="qa-pill' + (on ? ' on' : '') + '">' + (on ? '✓ ' : '') + label + '</span>';
    }
    function fmtDate(iso) {
        var t = Date.parse(iso || '');
        if (isNaN(t)) return '';
        var d = new Date(t);
        return (d.getMonth() + 1) + '월 ' + d.getDate() + '일';
    }
    function box(d, k, cls) {
        var when = fmtDate(d[atOf(k)]);
        return '<div class="qa-box' + (cls ? ' ' + cls : '') + '">' +
            '<div class="qa-who">' + word(k) + (when ? ' · ' + when : '') + '</div>' +
            '<div class="qa-text user-text">' + esc(d[k]) + '</div></div>';
    }
    /* ⚠️ '1번째 질문' 은 틀린 말이다. 하나일 때만 '첫 번째' (홈 카드 · 책장 · 문답 화면이 같이 쓴다) */
    function nth(n) { return Number(n) === 1 ? '첫 번째' : n + '번째'; }

    function echoHTML(before) {
        var p = read(before);
        if (!(p.husbandAns && p.wifeAns)) return '';
        return '<div class="qa-echo"><div class="qa-echo-h">' + nth(before) + ' 질문 · 같은 질문, 그때의 우리</div>' +
            '<div class="qa-who">엄마</div><div class="qa-text user-text">' + esc(p.wifeAns) + '</div>' +
            '<div class="qa-who">아빠</div><div class="qa-text user-text">' + esc(p.husbandAns) + '</div></div>';
    }
    function waitBox(day, yk) {
        var you = word(yk), h = '<div class="qa-box wait" id="qa-wait"><div class="qa-who">' + you + '</div>';
        var ps = partnerState() || (partnerWrote() ? 'yes' : '');
        if (!code()) {
            h += '<div class="qa-text">짝꿍과 연결하면 여기에 ' + you + '의 답이 와요</div>';
        } else if (ps === 'no') {
            h += '<div class="qa-text">' + you + '가 아직 가족방에 없어요. 초대하면 여기에 답이 와요</div>' +
                 '<button type="button" class="qa-chip" onclick="QA.__invite()">' + you + ' 초대하기</button>';
        } else {
            var done = localStorage.getItem(K.nudge) === today();
            h += '<div class="qa-text">' + you + '의 답을 기다려요</div>' +
                (done ? '<span class="qa-chip done">💌 오늘은 살짝 알렸어요</span>'
                      : '<button type="button" class="qa-chip" onclick="QA.__nudge(' + day + ', this)">💌 ' + you + '에게 살짝 알리기</button>');
        }
        return h + '</div>';
    }

    var edit = {};
    function notePart(day, d, mk, editing) {
        var yk = otherKey(mk), n;
        if (editing) n = '고친 답은 바로 ' + word(yk) + '에게도 보여요.';
        else if (!code()) n = '짝꿍과 연결하면 서로의 답이 열려요. 지금 쓴 답은 이 폰에 먼저 남아요.';
        else if (d[yk]) n = word(yk) + '는 벌써 답했어요. 내 답을 쓰면 서로의 답이 열려요.';
        else n = '둘 다 쓰면 서로의 답이 열려요.';
        return '<div class="qa-note" id="qa-note">' + n + '</div>';
    }
    function pillsPart(d) {
        return '<div class="qa-pills" id="qa-pills">' + pill(!!d.wifeAns, '엄마') + pill(!!d.husbandAns, '아빠') + '</div>';
    }

    /* o.pills: 누가 답했는지 표시 (홈 창에선 뒤 카드에 이미 있어서 뺀다)
       o.reveal: 방금 열렸다 — 짝꿍 답이 흐림에서 또렷해진다 */
    function bodyHTML(day, o) {
        o = o || {};
        day = Number(day);
        var mk = myKey();
        if (!mk) return '';
        var yk = otherKey(mk), d = read(day), mine = d[mk], yours = d[yk];
        var editing = !!edit[day] && !!mine;
        var before = echoDay(day);
        var h = o.pills === false ? '' : pillsPart(d);

        if (!mine || editing) {
            if (before && !editing) h += '<div class="qa-tag">' + nth(before) + ' 질문과 같은 질문이에요 · 답을 쓰면 그때 우리가 보여요</div>';
            h += notePart(day, d, mk, editing);
            h += '<textarea class="qa-area" id="qa-area" maxlength="1000" placeholder="생각나는 대로 적어 주세요" ' +
                 'oninput="QA.__draft(' + day + ', this.value)">' + esc(getDraft(day) || (editing ? mine : '')) + '</textarea>';
            h += '<button type="button" class="qa-btn solid" id="qa-save" onclick="QA.__save(' + day + ')">' + (editing ? '고친 답 저장' : '저장') + '</button>';
            if (editing) h += '<button type="button" class="qa-link" onclick="QA.__cancel(' + day + ')">그만 고치기</button>';
            return h;
        }

        if (yours) {
            /* 엄마 · 아빠 순서는 어디서나 같다 (책 · 미리보기 · 열 달의 문답) */
            h += box(d, 'wifeAns', o.reveal && yk === 'wifeAns' ? 'qa-reveal' : '') +
                 box(d, 'husbandAns', o.reveal && yk === 'husbandAns' ? 'qa-reveal' : '');
            if (before) h += echoHTML(before);
            var pg = pageOf(day);
            if (pg) h += '<div class="qa-gold">' + (o.reveal ? '💌 서로의 답이 열렸어요 · ' : '') +
                         '「' + pg.title + '」의 ' + pg.page + '쪽이 됐어요</div>';
            h += '<button type="button" class="qa-link" onclick="QA.__edit(' + day + ')">내 답 고치기</button>' +
                 '<button type="button" class="qa-btn line" onclick="QA.__next(' + day + ')">다음 질문 쓰기</button>';
            return h;
        }

        h += box(d, mk) + waitBox(day, yk);
        if (before) h += echoHTML(before);       // 내 답을 쓴 뒤에만 보인다 (먼저 보면 따라 쓰게 된다)
        h += '<button type="button" class="qa-link" onclick="QA.__edit(' + day + ')">내 답 고치기</button>' +
             '<button type="button" class="qa-btn line" onclick="QA.__next(' + day + ')">다음 질문 먼저 쓰기</button>';
        return h;
    }

    /* ---------- 누르기 ---------- */
    var host = null, saving = false;
    function rerender(day, o) { if (host && typeof host.render === 'function') host.render(Number(day), o || {}); }
    function focusArea() {
        setTimeout(function () {
            var a = document.getElementById('qa-area');
            if (!a) return;
            try { a.focus(); a.setSelectionRange(a.value.length, a.value.length); } catch (e) {}
        }, 60);
    }

    var QA = {
        __v: 1, T: T, K: K, MAX_DAY: MAX_DAY, PER_BOOK: PER_BOOK,
        css: injectCSS, esc: esc, ig: ig, fmtDate: fmtDate, today: today,
        role: role, myKey: myKey, otherKey: otherKey, atOf: atOf, word: word, linked: function () { return !!code(); },
        read: read, write: write, scan: scan, bust: bust, mergeDay: mergeDay,
        question: question, echoDay: echoDay, bookTitle: bookTitle, pageOf: pageOf, bookNow: bookNow, nth: nth,
        isPending: isPending, markPending: markPending, pull: pull, flush: flush, save: save,
        coins: coins, isSeen: isSeen, markSeen: markSeen, recentOpen: recentOpen,
        nudge: nudge, checkPartner: checkPartner, partnerState: partnerState,
        bodyHTML: bodyHTML, pillsHTML: pillsPart,
        editing: function (day) { return !!edit[day]; },
        setHost: function (h) { host = h; }
    };

    QA.__draft = function (day, v) { setDraft(day, v); };
    QA.__edit = function (day) { edit[day] = true; setDraft(day, ''); rerender(day, { force: true }); focusArea(); };
    QA.__cancel = function (day) { edit[day] = false; setDraft(day, ''); rerender(day, { force: true }); };
    QA.__next = function (day) {
        edit[day] = false;
        if (host && typeof host.next === 'function') host.next(Number(day) + 1);
    };
    QA.__nudge = function (day, el) {
        if (el) { el.disabled = true; el.textContent = '보내는 중…'; }
        nudge(day).then(function () { rerender(day, { force: true }); });
    };
    QA.__invite = function () {
        var sheet = document.getElementById('invite-bottom-sheet');
        if (sheet) {
            if (typeof window.closeQaSheet === 'function') window.closeQaSheet();
            var nm = document.getElementById('invite-baby-name');
            if (nm) nm.innerText = localStorage.getItem('tosil_babyName') || '우리 아기';
            sheet.style.display = 'flex';
            return;
        }
        location.href = 'index.html?go=invite';
    };
    QA.__save = function (day) {
        var ta = document.getElementById('qa-area'), t = ((ta && ta.value) || '').trim();
        if (!t) { toast('한 줄만 적어도 괜찮아요'); if (ta) ta.focus(); return; }
        if (saving) return;
        saving = true;
        var btn = document.getElementById('qa-save');
        var label = btn ? btn.textContent : '저장';
        if (btn) { btn.disabled = true; btn.textContent = '저장하는 중…'; }
        save(day, t).then(function (r) {
            saving = false;
            edit[day] = false;
            var opened = r.complete && !r.wasComplete;
            if (opened) markSeen(day);
            rerender(day, { reveal: opened, force: true, saved: r });
            if (r.editing) toast('고쳤어요');
            else if (opened) toast('💌 서로의 답이 열렸어요' + (r.coin ? ' · 100코인이 쌓였어요' : ''));
            else toast(r.coin ? '남겼어요 · 100코인이 쌓였어요' : '남겼어요');
            if (r.queued) setTimeout(function () { toast('📶 연결되면 짝꿍에게 바로 보낼게요'); }, 2800);
        }, function () {
            saving = false;
            if (btn) { btn.disabled = false; btn.textContent = label; }
            toast('저장하지 못했어요. 다시 눌러 주세요');
        });
    };

    window.QA = QA;
    injectCSS();

    /* 점검용 */
    window.qaDebug = function () {
        var st = scan();
        console.log('내 역할:', role() || '(없음)', '· 가족 코드:', code() || '(없음)');
        console.log('둘 다 쓴 날:', st.done.length, '· 한 사람만:', st.alone.length, '· 내가 안 쓴 첫 질문:', st.firstMine);
        console.log('못 올린 날:', pendingDays(), '· 코인:', coins(), '· 오늘 재촉:', localStorage.getItem(K.nudge) === today());
        console.log('짝꿍:', partnerState() || '모름');
        return st;
    };
})();
