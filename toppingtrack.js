/* ============================================================
   배냇함 — 맘마 기록의 '토핑 이유식' (toppingtrack.js)

   홈 → 맘마 기록 → 이유식 칸 위에 [죽 이유식 | 토핑 이유식] 을 둔다.
     죽 이유식    지금처럼 한 그릇 몇 g (아무것도 안 바뀐다)
     토핑 이유식  재료마다 몇 g + 처음 먹인 재료 (shared/topping.js 의 칸)

   저장하면
     · 맘마 기록: 이유식, 양은 재료를 다 더한 g, parts 에 재료마다 g (가족 폰에도 같이 간다)
     · 이유식 달력: 그날 식단 한 줄 + '처음' 재료는 새 재료 기록(무사 통과)
       → 이유식 큐레이터의 알레르기 달력 · 통과한 재료 목록에 그대로 보인다

   고치기 · 지우기
     맘마 기록을 고치면 달력도 고쳐 적고(같은 trk), 지우면 달력에서도 지운다 (script.js 의 지우기에서 부른다).

   ⚠️ 마지막에 고른 쪽(죽 · 토핑)을 기억한다. 토핑 하는 집은 매번 누를 필요가 없다.
   ============================================================ */
(function () {
    'use strict';
    if (window.__toppingTrack) return;
    window.__toppingTrack = true;

    var ed = null;

    function area() { return document.getElementById('food-input-area'); }

    function setMode(m, save) {
        var a = area();
        if (!a) return;
        a.setAttribute('data-style', m);
        a.querySelectorAll('.tp-seg div').forEach(function (d) { d.classList.toggle('on', d.getAttribute('data-m') === m); });
        a.querySelectorAll('[data-tp-porridge]').forEach(function (k) {
            k.style.display = m === 'topping' ? 'none' : k.getAttribute('data-tp-porridge');
        });
        var box = a.querySelector('.tp-box');
        if (box) box.style.display = m === 'topping' ? '' : 'none';
        if (save && window.Topping) window.Topping.mode(m);
    }

    function mount() {
        var a = area();
        if (!a || !window.Topping) return false;
        if (a.querySelector('.tp-seg')) return true;
        // 지금 있는 칸(한 그릇 몇 g · 늘 먹던 양 · +10/-10)은 '죽 이유식' 쪽이다. 원래 보이던 모양을 적어 두고 숨겼다 켰다 한다
        Array.prototype.forEach.call(a.children, function (k) { k.setAttribute('data-tp-porridge', k.style.display || ''); });
        var seg = document.createElement('div');
        seg.className = 'tp-seg';
        seg.innerHTML = '<div data-m="porridge">죽 이유식</div><div data-m="topping">토핑 이유식</div>';
        a.insertBefore(seg, a.firstChild);
        seg.addEventListener('click', function (e) {
            var m = e.target && e.target.getAttribute('data-m');
            if (m) { setMode(m, true); if (navigator.vibrate) navigator.vibrate(8); }
        });
        var box = document.createElement('div');
        a.appendChild(box);
        ed = new window.Topping.Editor(box);
        setMode(window.Topping.mode(), false);
        return true;
    }

    function editingRecord() {
        var id = window.editingTrackerId;
        if (!id) return null;
        try { return (JSON.parse(localStorage.getItem('tosil_tracker_records')) || []).filter(function (r) { return r.id === id; })[0] || null; }
        catch (e) { return null; }
    }

    /* 이유식 칸이 열릴 때: 고치는 중이면 그 기록 모양대로 (토핑이면 재료 줄까지) */
    function onFoodTab() {
        if (!mount()) return;
        var rec = editingRecord();
        if (rec && rec.subType === '이유식') {
            if (Array.isArray(rec.parts) && rec.parts.length) { setMode('topping', false); ed.set(rec.parts); }
            else setMode('porridge', false);
        }
    }

    function isTopping() {
        var a = area();
        return !!(a && a.style.display !== 'none' && a.getAttribute('data-style') === 'topping' &&
            window.trackerState && window.trackerState.subType === '이유식' && ed);
    }

    function wrap() {
        var open = window.openTrackerSheet, toggle = window.toggleMammaTab, save = window.saveTrackerRecord;
        if (typeof open !== 'function' || typeof toggle !== 'function' || typeof save !== 'function') return false;
        if (open.__topping) return true;

        var w1 = function (type) {
            var out = open.apply(this, arguments);
            if (type === 'feed' || type === 'babyfood') setTimeout(mount, 0);
            return out;
        };
        Object.keys(open).forEach(function (k) { w1[k] = open[k]; });
        w1.__topping = true;
        window.openTrackerSheet = w1;

        var w2 = function (type) {
            var out = toggle.apply(this, arguments);
            if (type === 'food') onFoodTab();
            return out;
        };
        Object.keys(toggle).forEach(function (k) { w2[k] = toggle[k]; });
        window.toggleMammaTab = w2;

        window.saveTrackerRecord = async function () {
            if (!isTopping()) return save.apply(this, arguments);
            var bad = ed.invalid();
            if (bad) { if (typeof window.showToast === 'function') window.showToast(bad); return; }
            var parts = ed.get();
            var fa = document.getElementById('v-food-amount');
            if (fa) fa.value = String(window.Topping.total(parts));   // 원래 저장 코드는 이 칸의 g 을 읽는다
            window.__pendingFoodParts = parts;
            window.__lastFoodRecord = null;
            var out;
            try { out = await save.apply(this, arguments); }
            finally { window.__pendingFoodParts = null; }
            var rec = window.__lastFoodRecord;
            window.__lastFoodRecord = null;
            if (rec && Array.isArray(rec.parts) && rec.parts.length) {
                try {
                    window.Topping.saveToCalendar(window.Topping.dayKey(rec.timestamp), rec.parts, { trk: rec.id, ts: rec.timestamp });
                } catch (e) { console.warn('[토핑] 이유식 달력에 적기 실패', e); }
            }
            return out;
        };
        return true;
    }

    /* script.js 가 다 뜬 뒤에 감싼다 */
    var tries = 0;
    (function go() {
        if (wrap()) return;
        if (++tries < 40) setTimeout(go, 250);
    })();
})();
