/* ============================================================
   배냇함 — 잊은 잠 타이머 (sleepguard.js)

   왜
     낮잠 타이머를 끄는 걸 잊고 다음 날 '방금 깼어요' 를 누르면 '낮잠 17시간' 이 그대로 남았다.
     하루 잠 · 편지의 '잘 잔 날' · 일주일 잠 지도 · 밤사이 카드가 다 틀어진다.
     지금까지는 24시간이 넘을 때만 막았다 (recordguard.js).

   하는 일 — 낮잠 4시간 반 · 밤잠 14시간이 넘게 켜진 타이머만
     1. 홈 '지금 꿈이' 의 '자는 중' 칸을 '타이머 확인' 으로 바꾸고, 누르면 수면 창을 연다
     2. 수면 창 맨 위에 알려 준다
          ⏰ 낮잠 타이머가 17시간째 켜져 있어요
          깼다면 자고 깬 만큼을 골라 주세요   [1시간] [1시간 반] [2시간] [3시간]   (밤잠은 10 · 11 · 12시간)
        누르면 깬 시간이 '잠든 시간 + 그만큼' 으로 들어가고 저장 버튼이 '☀️ 낮잠 1시간 30분 남기기' 가 된다
        (바퀴로 직접 돌려도 된다)
     3. 그래도 길게 저장하려 하면 한 번 묻는다
          낮잠이 17시간이에요. 타이머를 끄는 걸 잊었다면 깬 시간을 돌려 주세요   [취소] [이대로 남기기]
        ⚠️ 24시간이 넘는 건 recordguard.js 가 이미 막는다 → 여기서는 24시간까지만 묻는다 (두 번 묻지 않게)
     ⚠️ 고치기(예전 기록 수정) 창에서는 묻지 않는다. 신생아는 낮잠이 길 수 있어서 '막지' 않고 '묻기' 만 한다.

   index.html 에서 quickrec.js 다음에 로드하세요 (저장 버튼 글씨는 quickrec.js 가 같은 기준으로 쓴다).
   ============================================================ */
(function () {
    'use strict';
    if (window.__sleepGuard) return;
    window.__sleepGuard = true;

    var MIN = 60000;
    var LIMIT = { '낮잠': 270, '밤잠': 840 };            // 분 — 낮잠 4시간 반, 밤잠 14시간
    var CHIPS = { '낮잠': [60, 90, 120, 180], '밤잠': [600, 660, 720] };
    var NOTE = 'sg-note';

    function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function pad(n) { return String(n).padStart(2, '0'); }
    function dur(m) { m = Math.max(0, Math.round(m)); var h = Math.floor(m / 60), r = m % 60; return h ? h + '시간' + (r ? (r === 30 ? ' 반' : ' ' + r + '분') : '') : r + '분'; }
    function durExact(m) { m = Math.max(0, Math.round(m)); var h = Math.floor(m / 60), r = m % 60; return h ? h + '시간' + (r ? ' ' + r + '분' : '') : r + '분'; }
    function kind(t) { return t === '밤잠' ? '밤잠' : '낮잠'; }
    function limitOf(t) { return LIMIT[kind(t)]; }
    function val(id) { var e = document.getElementById(id); return e ? e.value : ''; }

    /* 지금 켜진 타이머가 너무 오래됐나 → { type, mins } */
    function longTimer() {
        var s = Number(get('tosil_sleep_start')) || 0;
        if (!s) return null;
        var mins = Math.floor((Date.now() - s) / MIN), t = kind(get('tosil_sleep_type'));
        return mins > limitOf(t) ? { type: t, mins: mins, start: s } : null;
    }
    window.sleepTimerTooLong = function (type, mins) { return mins > limitOf(type); };   // quickrec.js 가 같은 기준을 쓴다

    /* ---------- 1. 홈 '지금 꿈이' 의 잠 칸 ---------- */
    function markHome() {
        var lab = document.getElementById('now-sleep-label'), st = document.getElementById('now-sleep-state');
        if (!lab || !st) return;
        var col = lab.parentElement;
        var lt = longTimer();
        if (!lt) {
            if (col && col.__sg) {
                col.onclick = null; col.style.cursor = ''; col.__sg = false; col.removeAttribute('aria-label');
                lab.style.color = '#A3958A';                  // index.html 의 원래 색
            }
            return;
        }
        lab.textContent = '타이머 확인';
        lab.style.color = '#A07722';
        st.style.color = '#A07722';
        if (col) {
            col.__sg = true;
            col.style.cursor = 'pointer';
            col.setAttribute('aria-label', (lt.type) + ' 타이머가 오래 켜져 있어요. 눌러서 깬 시간을 남겨요');
            col.onclick = function () { if (typeof window.openTrackerSheet === 'function') window.openTrackerSheet('sleep'); };
        }
    }

    /* ---------- 2. 수면 창 맨 위 ---------- */
    function noteHTML(lt) {
        var chips = CHIPS[lt.type].map(function (m) {
            return '<span onclick="window.__sleepWokeAfter(' + m + ')" style="flex:1;min-width:0;text-align:center;padding:10px 0;border-radius:11px;background:#FFFFFF;border:1px solid rgba(185,138,46,0.30);' +
                'font-size:13.5px;font-weight:800;color:#7A5A12;cursor:pointer;white-space:nowrap;">' + dur(m) + '</span>';
        }).join('');
        return '<div id="' + NOTE + '" style="background:#FAF4E6;border:1px solid rgba(185,138,46,0.25);border-radius:16px;padding:14px 14px 12px;margin-bottom:18px;text-align:left;">' +
            '<div style="font-size:14.5px;font-weight:900;color:#7A5A12;">⏰ ' + lt.type + ' 타이머가 ' + durExact(lt.mins) + '째 켜져 있어요</div>' +
            '<div style="font-size:12.5px;font-weight:700;color:#A07722;margin:5px 0 11px;line-height:1.5;word-break:keep-all;">깼다면 자고 깬 만큼을 골라 주세요. 바퀴로 직접 돌려도 돼요.</div>' +
            '<div style="display:flex;gap:6px;">' + chips + '</div></div>';
    }
    function showNote() {
        var body = document.getElementById('tracker-sheet-body');
        if (!body || document.getElementById(NOTE)) return;
        if (!window.trackerState || window.trackerState.type !== 'sleep' || window.editingTrackerId) return;
        var lt = longTimer();
        if (!lt) return;
        var box = document.createElement('div');
        box.innerHTML = noteHTML(lt);
        body.insertBefore(box.firstChild, body.firstChild);
    }
    function hideNote() { var n = document.getElementById(NOTE); if (n) n.remove(); }

    /* 칩: 깬 시간 = 잠든 시간 + 그만큼 → '깬' 화면으로 (수면 바퀴도 따라 맞춘다 · sleeppicker.js) */
    window.__sleepWokeAfter = function (mins) {
        var d = val('v-sleep-start-date'), t = val('v-sleep-start-time');
        if (!d || !t) return;
        var e = new Date(new Date(d + 'T' + t + ':00').getTime() + mins * MIN);
        if (e.getTime() > Date.now()) e = new Date();
        var ed = document.getElementById('v-sleep-end-date'), et = document.getElementById('v-sleep-end-time');
        if (ed) ed.value = e.getFullYear() + '-' + pad(e.getMonth() + 1) + '-' + pad(e.getDate());
        if (et) et.value = pad(e.getHours()) + ':' + pad(e.getMinutes());
        if (typeof window.toggleIsSleeping === 'function') window.toggleIsSleeping(false);
        else if (typeof window.calcSleepRange === 'function') window.calcSleepRange();
        if (navigator.vibrate) { try { navigator.vibrate(10); } catch (x) {} }
        hideNote();
    };

    /* ---------- 3. 그래도 길게 남기려 하면 한 번 묻기 ---------- */
    var passing = false;
    function wrapSave() {
        var o = window.saveTrackerRecord;
        if (typeof o !== 'function') return false;
        if (o.__sleepGuard) return true;
        var w = async function () {
            var st = window.trackerState || {};
            if (!passing && st.type === 'sleep' && !st.isSleeping && !window.editingTrackerId && typeof window.showConfirm === 'function') {
                var amt = parseInt(val('v-sleep-amount'), 10);
                if (amt > limitOf(st.subType) && amt <= 24 * 60) {
                    var self = this, args = arguments, tp = kind(st.subType);
                    window.showConfirm(tp + '이 ' + durExact(amt) + '이에요.<br>타이머를 끄는 걸 잊었다면 깬 시간을 돌려 주세요', function () {
                        passing = true;
                        Promise.resolve(o.apply(self, args)).finally(function () { passing = false; });
                    }, '⏰', '이대로 남기기', 'var(--primary)');
                    return;
                }
            }
            return o.apply(this, arguments);
        };
        Object.keys(o).forEach(function (k) { try { w[k] = o[k]; } catch (e) {} });
        w.__sleepGuard = true;
        window.saveTrackerRecord = w;
        return true;
    }

    function wrapOpen() {
        var o = window.openTrackerSheet;
        if (typeof o !== 'function') return false;
        if (o.__sleepGuard) return true;
        var w = function (type) {
            var out = o.apply(this, arguments);
            if (type === 'sleep') setTimeout(showNote, 70);      // 원래 창 · 수면 바퀴(30ms)가 다 그린 뒤
            return out;
        };
        Object.keys(o).forEach(function (k) { try { w[k] = o[k]; } catch (e) {} });
        w.__sleepGuard = true;
        window.openTrackerSheet = w;
        return true;
    }

    function wrapDash() {
        var d = window.updateTrackerDashboard;
        if (typeof d !== 'function') return false;
        if (d.__sleepGuard) return true;
        var w = function () {
            var out;
            try { out = d.apply(this, arguments); } finally { try { markHome(); } catch (e) {} }
            return out;
        };
        Object.keys(d).forEach(function (k) { try { w[k] = d[k]; } catch (e) {} });
        w.__sleepGuard = true;
        window.updateTrackerDashboard = w;
        return true;
    }

    var tries = 0;
    (function go() {
        var ok = wrapSave() & wrapOpen() & wrapDash();
        if (!ok && ++tries < 40) setTimeout(go, 250);
    })();
    window.addEventListener('load', function () { setTimeout(function () { wrapOpen(); markHome(); }, 0); });
    setInterval(markHome, 60000);                           // 타이머가 기준을 넘는 순간에도 바뀌게
    setTimeout(markHome, 1500);

    window.sleepGuardDebug = function () {
        var lt = longTimer();
        console.log(lt ? lt.type + ' 타이머 ' + durExact(lt.mins) + ' (기준 ' + durExact(limitOf(lt.type)) + ')' : '오래된 타이머 없음');
        return lt;
    };
})();
