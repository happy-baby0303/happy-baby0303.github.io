/* ============================================================
   배냇함 — 홈 화면 위젯 자료 (widget.js)

   왜 필요한가
     폰 바탕화면 위젯(앱 1.1.4 부터)은 앱 밖에서 그려진다. 기록은 사이트 안에 있다.
     그래서 기록이 바뀔 때마다 위젯이 볼 시각 몇 개만 앱 껍데기(BaenaetWidget)에 넘긴다.
       마지막 맘마 (홈 '지금 꿈이' 와 같은 규칙 — 아주 조금 먹은 건 빼고, 이유식은 넣는다)
       마지막 기저귀, 깬 때 또는 재우기 시작한 때, 아기 이름 · 태어난 날

   언제 넘기나
     · 홈 기록판이 다시 그려질 때 (기록 · 고치기 · 지우기 · 가족 기록이 들어올 때 · 재우기 시작 · 끝)
     · 앱을 내릴 때 (위젯의 '○:○○ 기준' 을 새로)
     같은 값이면 다시 안 넘긴다.

   설정 → 알림 묶음의 '바탕화면 위젯' 칸
     위젯을 아직 안 놓았고 폰이 '바탕화면에 놓기' 를 받아 줄 때만 보인다. 누르면 놓기 창이 뜬다.

   웹 · 아이폰 · 앱 1.1.3 에서는 아무 일도 안 한다.

   index.html 맨 아래쪽, review.js 다음에 한 줄:
     <script src="./widget.js?v=1"></script>
   ============================================================ */
(function () {
    'use strict';

    if (!/BaenatApp/i.test(navigator.userAgent || '')) return;          // 앱 껍데기가 아니면 끝
    function plugin() {
        var C = window.Capacitor;
        return C && C.Plugins ? C.Plugins.BaenaetWidget : null;
    }
    if (!plugin()) return;                                               // 1.1.3 이하

    function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

    /* ---------- 1. 위젯이 볼 시각들 ---------- */
    function summary() {
        var recs = [];
        try { recs = JSON.parse(lsGet('tosil_tracker_records')) || []; } catch (e) {}
        var birth = 0, m = /^(\d{4})-(\d{2})-(\d{2})/.exec(lsGet('tosil_startDate') || '');
        if (m) birth = new Date(+m[1], +m[2] - 1, +m[3]).getTime();
        var days = birth ? Math.floor((Date.now() - birth) / 86400000) : 9999;
        // script.js latestMeal 과 같은 기준: 모유 몇 분 · 분유 몇 ml 아래는 '맘마' 로 안 센다
        var minFormula = days <= 30 ? 10 : (days <= 100 ? 20 : 40);
        var minBreast = days <= 30 ? 2 : (days <= 100 ? 3 : 5);
        var feed = 0, diaper = 0, limit = Date.now() + 5 * 60000;
        recs.forEach(function (r) {
            var t = Number(r && r.timestamp);
            if (!t || t > limit) return;
            if (r.type === 'feed') {
                var ok = r.subType === '이유식' ||
                    (parseInt(r.amount, 10) || 0) >= (r.subType === '모유' ? minBreast : minFormula);
                if (ok && t > feed) feed = t;
            } else if (r.type === 'diaper' && t > diaper) diaper = t;
        });
        // 깬 때 · 자는 중은 홈 기록판이 셈해 둔 것을 그대로 쓴다 (script.js updateTrackerDashboard)
        var sleep = Number(window._activeSleepStart) || 0;
        var wake = sleep ? 0 : (Number(window._lastWakeTime) || 0);
        return { name: lsGet('tosil_babyName') || '', birth: birth, feed: feed, diaper: diaper, wake: wake, sleep: sleep };
    }

    var last = '', timer = null;
    function push(force) {
        var s;
        try { s = summary(); } catch (e) { return; }
        var key = JSON.stringify(s);
        if (!force && key === last) return;
        last = key;
        try { plugin().update(s).catch(function () {}); } catch (e) {}
    }
    function soon() { clearTimeout(timer); timer = setTimeout(push, 600); }

    function hookDashboard() {
        var f = window.updateTrackerDashboard;
        if (typeof f !== 'function' || f.__widget) return false;
        window.updateTrackerDashboard = function () {
            var r = f.apply(this, arguments);
            soon();
            return r;
        };
        window.updateTrackerDashboard.__widget = true;
        return true;
    }
    if (!hookDashboard()) {
        var tries = 0, iv = setInterval(function () { if (hookDashboard() || ++tries > 40) clearInterval(iv); }, 500);
    }
    setTimeout(push, 2500);   // 처음 열 때 한 번
    document.addEventListener('visibilitychange', function () { if (document.hidden) push(true); });

    /* ---------- 2. 설정 → 알림 묶음의 '바탕화면 위젯' 칸 ---------- */
    var CARD_ID = 'widget-card';
    var CARD = 'display:flex; align-items:center; gap:14px; background:var(--bg-card); padding:18px 20px; border-radius:16px; ' +
               'border:1px solid var(--border); margin-bottom:12px; box-sizing:border-box; width:100%; cursor:pointer;';

    function toast(msg) { if (typeof window.showToast === 'function') window.showToast(msg); }

    function paintCard() {
        var P = plugin();
        if (!P || typeof P.status !== 'function') return;
        P.status().then(function (st) {
            var old = document.getElementById(CARD_ID);
            var want = st && st.canPin && !st.widgets;
            if (!want) { if (old) old.remove(); return; }
            var host = document.getElementById('tab-settings');
            if (old || !host) return;
            var c = document.createElement('div');
            c.id = CARD_ID;
            c.className = 'bnh-settings-card';
            c.style.cssText = CARD;
            c.innerHTML =
                '<div style="font-size:22px;">📱</div>' +
                '<div style="flex:1; min-width:0;">' +
                    '<div style="font-size:15px; font-weight:900; color:var(--text-m);">바탕화면 위젯</div>' +
                    '<div style="font-size:12px; font-weight:600; color:var(--text-sub); margin-top:2px; word-break:keep-all;">' +
                        '맘마 · 기저귀 · 잠 시간을 바탕화면에서 봐요</div>' +
                '</div>' +
                '<div style="font-size:13px; font-weight:800; color:#7F77DD; flex-shrink:0;">놓기 ›</div>';
            c.onclick = function () {
                P.pin().then(function (r) {
                    if (!r || !r.ok) { toast('바탕화면을 길게 누른 뒤 \'위젯\'에서 배냇함을 골라 주세요'); return; }
                    push(true);
                    setTimeout(paintCard, 4000);   // 놓았으면 이 칸은 사라진다
                }).catch(function () {});
            };
            host.appendChild(c);   // settingscards.js 가 알림 묶음으로 옮긴다
        }).catch(function () {});
    }

    var _render = window.renderSettingsTab;
    window.renderSettingsTab = function () {
        var out = typeof _render === 'function' ? _render.apply(this, arguments) : undefined;
        paintCard();
        return out;
    };
    document.addEventListener('visibilitychange', function () { if (!document.hidden) paintCard(); });
})();
