/* ============================================================
   배냇함 — 기록 날짜 한 번 더 보기 (recordguard.js)

   왜 필요한가
     시간 바퀴를 상자 전체로 넓혔다 (36px 띠만 쓸리던 것 → 어디를 쓸어도 그 자리 바퀴가 돈다).
     대신 '월' · '일' 바퀴도 넓어져서, 시간을 고치다 손가락이 날짜 쪽을 스치면
     맘마 기록이 다른 달로 가 버릴 수 있다 (오늘 목록에서 사라져 '기록이 없어졌다' 고 느낀다).
     수면은 잠든 날짜가 몇 달 앞으로 가서 '총 6424시간 수면' 같은 기록이 저장될 수 있었다.

   하는 일 (저장 단추를 눌렀을 때만)
     · 맘마 · 기저귀 · 약: 고른 날짜가 오늘에서 3일 넘게 떨어져 있으면 '이 날짜로 남길까요?' 를 한 번 묻는다
     · 수면: 잠든 때부터 깬 때까지 24시간이 넘으면 저장하지 않고 날짜를 확인해 달라고 한다
     ⚠️ 이미 있는 기록을 고칠 때(예전 기록 수정)는 묻지 않는다. 그 날짜가 맞아서 고치는 거다.
     ⚠️ 저장하는 코드는 하나도 안 고친다. 앞에서 한 번 거르기만 한다.

   index.html 에서 toppingtrack.js 다음에 (토핑 저장보다 바깥에서 먼저 본다).
   ============================================================ */
(function () {
    'use strict';
    if (window.__recordGuard) return;
    window.__recordGuard = true;

    var FAR = 3 * 86400000, AHEAD = 30 * 60000, DAY_MIN = 24 * 60;

    function val(id) { var e = document.getElementById(id); return e ? e.value : ''; }
    function pad(n) { return String(n).padStart(2, '0'); }

    /* 원래 저장 코드와 같은 방법으로 '언제' 를 계산한다 */
    function when() {
        var st = window.trackerState || {};
        if (st.type === 'sleep') {
            var d = val('v-sleep-start-date'), t = val('v-sleep-start-time');
            return d && t ? new Date(d + 'T' + t + ':00').getTime() : NaN;
        }
        var cd = val('v-tracker-custom-date'), tm = val('v-tracker-time');
        if (!cd || !tm) return NaN;
        var dt = new Date(cd), hm = tm.split(':');
        dt.setHours(parseInt(hm[0], 10), parseInt(hm[1], 10), 0, 0);
        return dt.getTime();
    }

    var passing = false;

    function wrap() {
        var orig = window.saveTrackerRecord;
        if (typeof orig !== 'function') return false;
        if (orig.__guard) return true;
        var w = async function () {
            var st = window.trackerState || {};
            if (passing || !st.type || window.editingTrackerId) return orig.apply(this, arguments);

            // 수면: 24시간이 넘는 잠은 날짜가 잘못 잡힌 것
            if (st.type === 'sleep' && !st.isSleeping) {
                var amt = parseInt(val('v-sleep-amount'), 10);
                if (amt > DAY_MIN) {
                    if (typeof window.showToast === 'function') window.showToast('잠든 때부터 깬 때까지 24시간이 넘어요.<br>잠든 날짜를 한 번 확인해 주세요');
                    return;
                }
            }

            var ts = when(), now = Date.now();
            var odd = !isNaN(ts) && (now - ts > FAR || ts - now > AHEAD) && !(st.type === 'sleep' && st.isSleeping);
            if (odd && typeof window.showConfirm === 'function') {
                var d = new Date(ts);
                var label = (d.getMonth() + 1) + '월 ' + d.getDate() + '일 ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
                var self = this, args = arguments;
                window.showConfirm(label + ' 기록으로 남길까요?<br>오늘과 날짜가 많이 달라요', function () {
                    passing = true;
                    Promise.resolve(orig.apply(self, args)).finally(function () { passing = false; });
                }, '🕒', '이 날짜로 남기기', 'var(--primary)');
                return;
            }
            return orig.apply(this, arguments);
        };
        w.__guard = true;
        window.saveTrackerRecord = w;
        return true;
    }

    var tries = 0;
    (function go() { if (!wrap() && ++tries < 40) setTimeout(go, 250); })();
})();
