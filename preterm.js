/* ============================================================
   배냇함 — 이른둥이 교정 나이 (preterm.js)

   일찍 태어난 아기의 엄마 아빠가 '출산 예정일' 을 넣으면
   원더윅스 · 또래 키 몸무게 비교 · 육아정보 추천 · 큐레이터(이유식 · 젖병 · 장난감 · 유모차)를
   예정일부터 센 교정 나이로 맞춘다. D+ · 백일 · 돌 · 예방접종 · 카시트는 태어난 날 그대로다.
   (셈은 shared/babyage.js — 이 파일은 넣는 창 · 홈 표시 · 가족 폰과 맞추기)

   넣는 곳
     · 설정 → 아기 정보 관리 → 정보 수정 → '일찍 태어났나요?'
     · 성장 도구 결과 아래 '일찍 태어났다면 교정 나이로 보기'
     · 홈 사진 위 '교정 3개월' 을 누르면 고치거나 끌 수 있다

   ⚠️ 예정일은 태어난 주수를 알 수 있는 건강 정보다 (개인정보 보호법 제23조 민감정보).
      처음 넣을 때 따로 동의를 받고, 가족 서버의 growth_ 칸(돌봄 도우미에게는 안 내려가는 칸)에 둔다.
        growth_{가족코드}{아기 꼬리표}/babyage = { due, at, by, consents: { uid: { at, ver } } }
      나중에 고친 쪽(at)이 이긴다. 끄면 due 를 비운다.
   ⚠️ 진단하지 않는다. 늦다 · 빠르다를 말하지 않는다. 날짜만 센다.

   index.html 에서 stage.js 다음 어디든 한 줄 (shared/babyage.js 는 script.js 앞).
   ============================================================ */
(function () {
    'use strict';
    if (window.__pretermOn) return;
    window.__pretermOn = true;

    var KEY = 'tosil_preterm', DOC = 'babyage', VER = '2026-10 v1';
    var PAPER = '#FFFDF9', LINE = '#EFE7DC', INK = '#3B322C', SUB = '#8A7F76', MUTE = '#B5AAA0', GOLD = '#B98A2E';
    var SERIF = "'Gowun Batang', 'Noto Serif KR', 'Noto Serif CJK KR', serif";

    function A() { return window.BabyAge || null; }
    function esc(s) {
        return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function toast(m) { if (typeof window.showToast === 'function') window.showToast(m); }

    /* 아기마다 따로인 칸을 '지금 보는 아기' 가 아니어도 읽고 쓸 수 있게 (프록시를 거치지 않는다) */
    function rawGet(k) {
        try { if (typeof originalGetItem === 'function') return originalGetItem.call(localStorage, k); } catch (e) {}
        try { return localStorage.getItem(k); } catch (e) { return null; }
    }
    function rawSet(k, v) {
        try { if (typeof originalSetItem === 'function') { originalSetItem.call(localStorage, k, v); return; } } catch (e) {}
        try { localStorage.setItem(k, v); } catch (e) {}
    }
    function cur() { return window.currentBabySuffix || ''; }
    function recOf(sfx) {
        try { var v = JSON.parse(rawGet(KEY + sfx) || 'null'); return (v && typeof v === 'object') ? v : {}; } catch (e) { return {}; }
    }
    function saveRec(sfx, r) { rawSet(KEY + sfx, JSON.stringify(r)); }
    function birthOf(sfx) { return rawGet('tosil_startDate' + sfx) || ''; }
    function nameOf(sfx) { return String(rawGet('tosil_babyName' + sfx) || '').trim() || '아기'; }

    /* ---------- 날짜 말 ---------- */
    function md(k) { var d = A() && A().parse(k); return d ? (d.getMonth() + 1) + '월 ' + d.getDate() + '일' : ''; }
    function wk(n) { var w = Math.floor(n / 7), d = n % 7; return (w ? w + '주' : '') + (d ? (w ? ' ' : '') + d + '일' : ''); }
    function gaText(g) { return g.w + '주' + (g.d ? ' ' + g.d + '일' : ''); }

    /* 어떤 아기든 생일 · 예정일로 오늘 나이를 센다 (BabyAge 는 '지금 보는 아기' 만 센다) */
    function ageFor(birthKey, dueKey) {
        var BA = A(); if (!BA) return null;
        var b = BA.parse(birthKey);
        if (!b) return null;
        var t = new Date(); t.setHours(0, 0, 0, 0);
        var real = BA.monthsBetween(b, t);
        var out = { real: Math.max(0, real), realDays: BA.between(b, t), on: false };
        var c = dueKey ? BA.check(birthKey, dueKey) : { ok: false };
        if (c.ok && real < BA.UNTIL) {
            var d = BA.parse(dueKey);
            out.on = true; out.n = c.n; out.ga = c.ga;
            out.days = BA.between(d, t);
            out.months = Math.max(0, BA.monthsBetween(d, t));
            out.label = out.days < 0 ? '예정일까지 ' + (-out.days) + '일'
                      : (out.months < 1 ? '교정 ' + Math.floor(out.days / 7) + '주' : '교정 ' + out.months + '개월');
        }
        return out;
    }

    /* 정보 수정 창의 한 줄 */
    window.pretermStatus = function (sfx, birthKey) {
        sfx = (sfx == null) ? cur() : String(sfx);
        var r = recOf(sfx), a = ageFor(birthKey || birthOf(sfx), r.due);
        if (a && a.on) return '예정일 ' + md(r.due) + ' · ' + a.label + '로 보는 중';
        if (r.due && a && a.real >= 24 && A() && A().check(birthKey || birthOf(sfx), r.due).ok) return '두 돌이 지나 태어난 날로 세요';
        return '예정일을 넣으면 교정 나이로 봐요';
    };

    /* ---------- 모양 ---------- */
    function css() {
        if (document.getElementById('preterm-css')) return;
        var s = document.createElement('style');
        s.id = 'preterm-css';
        s.textContent =
            '#pt-sheet{position:fixed;inset:0;z-index:10000001;background:rgba(43,36,30,0.45);display:flex;align-items:flex-end;justify-content:center;}' +
            '#pt-sheet .pt-box{width:100%;max-width:480px;max-height:90vh;overflow-y:auto;background:' + PAPER + ';border-radius:24px 24px 0 0;' +
                'padding:12px 22px calc(24px + env(safe-area-inset-bottom, 0px));box-sizing:border-box;color:' + INK + ';text-align:left;}' +
            '#pt-sheet .pt-grab{width:36px;height:4px;border-radius:4px;background:#E5DDD2;margin:0 auto 18px;}' +
            '#pt-sheet .pt-title{font-family:' + SERIF + ';font-size:20px;font-weight:700;color:' + INK + ';letter-spacing:-0.3px;margin-bottom:6px;}' +
            '#pt-sheet .pt-sub{font-size:13px;font-weight:600;color:' + SUB + ';line-height:1.7;word-break:keep-all;}' +
            '#pt-sheet .pt-label{font-size:12.5px;font-weight:800;color:' + SUB + ';margin:18px 0 6px;}' +
            '#pt-sheet input[type=date]{display:block;width:100%;box-sizing:border-box;padding:14px 15px;border:1px solid ' + LINE + ';border-radius:14px;' +
                'font-size:16px;font-weight:600;font-family:inherit;color:' + INK + ';background:#FFF;min-height:52px;margin:0;}' +
            '#pt-sheet .pt-prev{margin-top:10px;font-size:13px;font-weight:700;line-height:1.65;word-break:keep-all;min-height:21px;}' +
            '#pt-sheet .pt-what{margin-top:14px;border-top:1px solid ' + LINE + ';}' +
            '#pt-sheet .pt-what div{display:flex;gap:10px;padding:10px 0;border-bottom:1px solid ' + LINE + ';font-size:12.5px;font-weight:600;color:' + SUB + ';line-height:1.6;word-break:keep-all;}' +
            '#pt-sheet .pt-what b{flex-shrink:0;width:72px;color:' + INK + ';font-weight:800;}' +
            '#pt-sheet .pt-consent{margin-top:16px;padding:12px 14px;border:1px solid ' + LINE + ';border-radius:14px;background:#FFFAF1;' +
                'font-size:12px;font-weight:600;color:' + SUB + ';line-height:1.6;}' +
            '#pt-sheet .pt-go{margin-top:18px;text-align:center;padding:16px;border-radius:14px;background:' + INK + ';color:#FFFDF9;' +
                'font-size:15px;font-weight:700;cursor:pointer;letter-spacing:-0.2px;transition:opacity .15s;}' +
            '#pt-sheet .pt-go.off{opacity:0.35;}' +
            '#pt-sheet .pt-off{text-align:center;padding:14px 0 2px;font-size:13px;font-weight:700;color:' + SUB + ';cursor:pointer;}' +
            '#pt-sheet .pt-foot{margin-top:12px;font-size:11.5px;font-weight:600;color:' + MUTE + ';line-height:1.6;text-align:center;word-break:keep-all;}' +
            /* 홈 사진 위 — 이름 옆에 작게 (원더윅스 뱃지와 같은 모양) */
            '#baby-dashboard #res-baby-name{display:inline-block;vertical-align:middle;}' +
            '#preterm-chip{display:inline-block;vertical-align:middle;margin-left:8px;padding:4px 10px;border-radius:10px;' +
                'background:rgba(0,0,0,0.38);border:1px solid rgba(255,255,255,0.22);color:#FFF;font-size:11.5px;font-weight:800;' +
                'letter-spacing:-0.2px;line-height:1.4;cursor:pointer;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);}' +
            '#baby-dashboard.hero-empty #preterm-chip{background:rgba(255,255,255,0.8);color:#7A6F68;border-color:rgba(74,65,60,0.08);}';
        document.head.appendChild(s);
    }

    /* ---------- 홈 사진 위 '교정 3개월' ---------- */
    function chip() {
        var nm = document.getElementById('res-baby-name');
        if (!nm || !nm.parentNode) return;
        var el = document.getElementById('preterm-chip');
        var t = (A() && localStorage.getItem('tosil_startDate')) ? A().label() : '';
        if (!t) { if (el) el.remove(); return; }
        css();
        if (!el) {
            el = document.createElement('span');
            el.id = 'preterm-chip';
            el.onclick = function (e) { e.stopPropagation(); window.openPretermSheet(); };
            nm.parentNode.insertBefore(el, nm.nextSibling);
        }
        if (el.textContent !== t) el.textContent = t;
    }

    /* ---------- 예정일 넣는 창 ---------- */
    var S = null;   // 지금 열린 창이 보는 아기
    function consentHTML() {
        var row = function (k, v) {
            return '<div style="display:flex;gap:10px;padding:5px 0;"><span style="width:34px;flex-shrink:0;font-weight:800;color:' + INK + ';">' + k + '</span>' +
                '<span style="flex:1;word-break:keep-all;">' + v + '</span></div>';
        };
        return '<div class="pt-consent">' +
                '<div style="font-size:12.5px;font-weight:800;color:' + INK + ';margin-bottom:4px;">민감정보 수집 · 이용 동의 (필수)</div>' +
                row('목적', '교정 나이 계산, 엄마 · 아빠 가족 공유') +
                row('항목', '출산 예정일 (태어난 주수를 알 수 있어요)') +
                row('보유', '회원 탈퇴하거나 교정 나이를 끌 때까지') +
                row('거부', '동의하지 않아도 배냇함은 그대로 써요. 교정 나이만 볼 수 없어요.') +
                '<div style="margin-top:6px;">돌봄 도우미에게는 보이지 않아요. <a href="privacy.html#sensitive" target="_blank" rel="noopener" style="color:' + INK + ';font-weight:800;">자세히 ›</a></div>' +
            '</div>' +
            '<label style="display:flex;gap:10px;align-items:center;margin-top:12px;font-size:13.5px;font-weight:700;color:' + INK + ';">' +
                '<input type="checkbox" id="pt-ok" style="width:20px;height:20px;flex-shrink:0;margin:0;accent-color:' + INK + ';">위 내용에 동의해요</label>';
    }

    function close() { var w = document.getElementById('pt-sheet'); if (w) w.remove(); S = null; }

    window.openPretermSheet = function (sfx, birthKey) {
        var BA = A(); if (!BA) return;
        sfx = (sfx == null) ? cur() : String(sfx);
        var bk = birthKey || birthOf(sfx);
        var b = BA.parse(bk);
        if (!b) return toast('먼저 아기 생일을 넣어 주세요');
        var r = recOf(sfx), pre = r.due || '';
        /* 임신 중에 배냇함에 넣어 둔 예정일이 있으면 미리 채워 둔다 (저장은 눌러야 된다) */
        if (!pre) { var pd = rawGet('tosil_due_date' + sfx) || ''; if (pd && BA.check(bk, pd).ok) pre = pd; }
        close();
        S = { sfx: sfx, birth: bk, had: !!(r.due && BA.check(bk, r.due).ok), needOk: !r.ok, ok: false };
        css();
        var min = BA.keyOf(new Date(b.getFullYear(), b.getMonth(), b.getDate() + 1));
        var max = BA.keyOf(new Date(b.getFullYear(), b.getMonth(), b.getDate() + BA.MAX_EARLY));
        var w = document.createElement('div');
        w.id = 'pt-sheet';
        w.onclick = function (e) { if (e.target === w) close(); };
        w.innerHTML = '<div class="pt-box"><div class="pt-grab"></div>' +
            '<div class="pt-title">예정일보다 일찍 태어났나요?</div>' +
            '<div class="pt-sub">37주가 되기 전에 태어난 아기는 두 돌까지 예정일부터 센 <b style="color:' + INK + ';">교정 나이</b>로 발달을 봐요.</div>' +
            '<div class="pt-label">' + esc(nameOf(sfx)) + ' 출산 예정일</div>' +
            '<input type="date" id="pt-due" value="' + esc(pre) + '" min="' + min + '" max="' + max + '" oninput="window.__ptPreview()" onchange="window.__ptPreview()">' +
            '<div class="pt-prev" id="pt-prev"></div>' +
            '<div class="pt-what">' +
                '<div><b>교정 나이로</b><span>원더윅스, 또래 키 · 몸무게 비교, 육아정보 추천, 이유식 · 젖병 · 장난감 · 유모차</span></div>' +
                '<div><b>태어난 날로</b><span>D+, 백일 · 돌, 예방접종, 카시트</span></div>' +
            '</div>' +
            (S.needOk ? consentHTML() : '') +
            '<div class="pt-go off" id="pt-go" onclick="window.__ptSave()">교정 나이로 보기</div>' +
            (S.had ? '<div class="pt-off" onclick="window.__ptClear()">교정 나이 끄기</div>' : '') +
            '<div class="pt-foot">날짜만 세어 드려요. 발달이 걱정되면 다니는 소아과 선생님과 이야기해 보세요.</div>' +
        '</div>';
        document.body.appendChild(w);
        window.__ptPreview();
    };

    window.__ptPreview = function () {
        var el = document.getElementById('pt-prev'), go = document.getElementById('pt-go'), inp = document.getElementById('pt-due');
        if (!el || !S || !inp || !A()) return;
        var v = inp.value, c = v ? A().check(S.birth, v) : { ok: false, why: 'empty' };
        var t = '', ok = false;
        if (c.ok) {
            var a = ageFor(S.birth, v);
            if (a && a.on) {
                ok = true;
                t = '<span style="color:' + INK + ';">' + wk(c.n) + ' 일찍, ' + gaText(c.ga) + '에 태어났어요</span><br>' +
                    '<span style="color:' + GOLD + ';">오늘 ' + a.label + '</span>' +
                    '<span style="color:' + SUB + ';"> · 생후 ' + (a.real < 1 ? a.realDays + '일' : a.real + '개월') + '</span>';
            } else {
                t = '두 돌이 지나서 이제는 태어난 날로 세요.';
            }
        } else if (c.why === 'term') t = '37주가 지나 태어났으면 태어난 날로 세요. 교정 나이가 필요 없어요.';
        else if (c.why === 'before') t = '예정일은 태어난 날보다 뒤여야 해요.';
        else if (c.why === 'far') t = '날짜를 다시 확인해 주세요.';
        el.innerHTML = t;
        if (!ok) el.style.color = SUB; else el.style.color = '';
        if (go) go.classList.toggle('off', !ok);
        S.ok = ok;
    };

    window.__ptSave = function () {
        if (!S) return;
        var v = (document.getElementById('pt-due') || {}).value || '';
        window.__ptPreview();
        if (!S.ok) return toast(v ? '날짜를 다시 확인해 주세요' : '예정일을 넣어 주세요');
        var box = document.getElementById('pt-ok');
        if (S.needOk && !(box && box.checked)) return toast('민감정보 동의에 체크해 주세요');
        var old = recOf(S.sfx), okAt = old.ok || (S.needOk ? new Date().toISOString() : '');
        var r = { due: v, at: Date.now() };
        if (okAt) r.ok = okAt;
        saveRec(S.sfx, r);
        push(S.sfx, r, S.needOk ? okAt : '');
        var sfx = S.sfx;
        close();
        repaint(sfx);
        var lb = (sfx === cur() && A()) ? A().label() : '';
        toast(lb ? '이제 ' + lb + '로 볼게요' : '교정 나이로 볼게요');
    };

    window.__ptClear = function () {
        if (!S) return;
        var r = { due: '', at: Date.now() };
        saveRec(S.sfx, r);
        push(S.sfx, r, '');
        var sfx = S.sfx;
        close();
        repaint(sfx);
        toast('교정 나이를 껐어요. 태어난 날로 셀게요');
    };

    /* 바뀐 걸 화면에 */
    function repaint(sfx) {
        if (sfx == null || sfx === cur()) {
            try { if (typeof window.renderBabyInfo === 'function') window.renderBabyInfo(); } catch (e) {}
            try { if (typeof window.refreshInfoPick === 'function') window.refreshInfoPick(); } catch (e) {}
            chip();
            var gr = document.getElementById('growth-result');
            if (gr && gr.style.display !== 'none' && typeof window.calcHealthMaster === 'function') {
                try { window.calcHealthMaster(true); } catch (e) {}
            }
        }
        var sub = document.getElementById('edit-preterm-sub');
        if (sub && sub.getAttribute('data-sfx') === String(sfx == null ? cur() : sfx)) {
            var di = document.getElementById('edit-date');
            sub.textContent = window.pretermStatus(sub.getAttribute('data-sfx'), di && di.value);
        }
    }

    /* ---------- 가족 폰과 맞추기 ---------- */
    function code() { var c = localStorage.getItem('family_sync_code'); return c && c.indexOf('unlinked') === -1 ? c : ''; }
    function me() { return (window.auth && window.auth.currentUser && window.auth.currentUser.uid) || ''; }
    function viewer() { return localStorage.getItem('tosil_role_locked') === 'viewer'; }   // 서버가 growth_ 칸을 안 준다
    function ref(sfx) {
        var c = code();
        if (!c || !window.db || typeof window.doc !== 'function') return null;
        return window.doc(window.db, 'growth_' + c + sfx, DOC);
    }
    function push(sfx, r, okAt) {
        if (viewer()) return;
        var rf = ref(sfx), uid = me();
        if (!rf || !uid || typeof window.setDoc !== 'function') return;     // 연결이 없으면 다음에 맞출 때 올린다
        var body = { due: r.due || '', at: Number(r.at) || Date.now(), by: uid };
        if (okAt) { body.consents = {}; body.consents[uid] = { at: okAt, ver: VER }; }
        try { window.setDoc(rf, body, { merge: true }).catch(function (e) { console.warn('[교정 나이] 올리기 실패', e && e.code); }); } catch (e) {}
    }
    function reconcile(sfx, d) {
        var mine = recOf(sfx), mt = Number(mine.at) || 0, st = d ? (Number(d.at) || 0) : 0;
        if (mt > st) {                       // 이 폰에서 더 나중에 고쳤다 (연결이 없을 때 고친 것)
            if (mine.due || d) push(sfx, mine, mine.ok || '');
            return;
        }
        if (!d || st === mt) return;
        var next = { due: String(d.due || ''), at: st };
        if (mine.ok) next.ok = mine.ok;
        saveRec(sfx, next);
        repaint(sfx);
    }
    var unwatch = null;
    function watch() {
        if (viewer() || !code() || !me()) return false;
        var sfx = cur(), rf = ref(sfx);
        if (!rf || typeof window.onSnapshot !== 'function') return false;
        if (unwatch) { try { unwatch(); } catch (e) {} unwatch = null; }
        var u = window.onSnapshot(rf, function (snap) {
            reconcile(sfx, snap.exists() ? (snap.data() || {}) : null);
        }, function (e) { console.warn('[교정 나이] 연동 에러', e && e.code); });
        unwatch = u;
        /* 앱이 숨으면 본 앱이 모든 연결을 한 번에 끊는다 (stopAllListeners). 같이 끊기게 바구니에 넣는다 */
        if (typeof window.addLiveListener === 'function') {
            window.addLiveListener(function () { try { u(); } catch (e) {} if (unwatch === u) unwatch = null; });
        }
        return true;
    }

    /* ---------- 시작 ---------- */
    var tries = 0;
    (function wait() {
        if (watch()) return;
        if (++tries < 30) setTimeout(wait, 2000);
    })();
    /* 로그인 · 가족 합류 · 앱으로 돌아올 때 본 앱이 initRealtimeSync 를 부른다. 그때 같이 다시 건다 */
    var initTries = 0;
    (function hookInit() {
        var f = window.initRealtimeSync;
        if (typeof f !== 'function') { if (++initTries < 30) setTimeout(hookInit, 1500); return; }
        if (f.__preterm) return;
        var w = function () { var o = f.apply(this, arguments); setTimeout(watch, 300); return o; };
        w.__preterm = true;
        window.initRealtimeSync = w;
    })();
    /* 홈 사진 위 표시는 아기 정보를 그릴 때마다 같이 */
    var renderTries = 0;
    (function hookRender() {
        var f = window.renderBabyInfo;
        if (typeof f !== 'function') { if (++renderTries < 30) setTimeout(hookRender, 500); return; }
        if (f.__preterm) return;
        var w = function () { var o = f.apply(this, arguments); try { chip(); } catch (e) {} return o; };
        w.__preterm = true;
        window.renderBabyInfo = w;
    })();
    function boot() { chip(); setTimeout(chip, 1500); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
    document.addEventListener('visibilitychange', function () { if (!document.hidden) chip(); });

    /* ---------- 점검용 ---------- */
    window.pretermDebug = function () {
        var BA = A(), r = recOf(cur());
        console.log('저장:', JSON.stringify(r), '· 생일:', birthOf(cur()));
        if (BA) console.log('교정 중:', BA.on(), '· 일찍:', BA.early() + '일', '· 주수:', JSON.stringify(BA.ga()),
            '· 실제', BA.months('real') + '개월', '· 발달', BA.months() + '개월', '·', BA.label() || '(표시 없음)');
        console.log('연결:', !!unwatch, '· 가족:', code() || '없음');
    };
})();
