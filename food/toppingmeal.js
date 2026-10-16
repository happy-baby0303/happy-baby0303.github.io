/* ============================================================
   배냇함 이유식 — 식단 기록의 '토핑 이유식' (food/toppingmeal.js)

   알레르기 달력 → 식단 기록 창 맨 위에 [죽 이유식 | 토핑 이유식] 을 둔다.
     죽 이유식    지금처럼 메뉴 이름 + 섭취량 + 아기 반응
     토핑 이유식  재료마다 몇 g + 처음 먹인 재료 + 아기 반응 (shared/topping.js 의 칸)

   토핑으로 저장하면
     · 그날 식단 한 줄 (재료마다 g)
     · '처음' 을 누른 재료는 새 재료 기록(무사 통과)도 같이 → 통과한 재료 목록 · 레시피 거르기에 그대로 쓰인다
     · 냉동실 큐브 빼기는 지금처럼 묻는다 (재료 이름으로 큐브를 찾는다)

   재료 기록의 '무사 통과 / 알레르기 반응' 은 눌러서 바꿀 수 있다.
     토핑으로 처음 먹인 재료는 일단 '무사 통과' 로 적히니까, 나중에 반응이 보이면 바꿀 길이 있어야 한다.

   ⚠️ app.js 의 selectedDateStr · editingDate · editingIndex 를 같이 쓴다 (같은 페이지의 전역 변수).
   ============================================================ */
(function () {
    'use strict';
    if (!window.Topping || window.__toppingMeal) return;
    window.__toppingMeal = true;

    var ed = null, seg = null, box = null, menuBlock = null, amountBlock = null;

    function sheet() { return document.getElementById('meal-bottom-sheet'); }

    function setMode(m, save) {
        if (!seg) return;
        seg.querySelectorAll('div').forEach(function (d) { d.classList.toggle('on', d.getAttribute('data-m') === m); });
        if (menuBlock) menuBlock.style.display = m === 'topping' ? 'none' : '';
        if (amountBlock) amountBlock.style.display = m === 'topping' ? 'none' : '';
        if (box) box.style.display = m === 'topping' ? '' : 'none';
        seg.setAttribute('data-style', m);
        if (save) window.Topping.mode(m);
    }

    function mount() {
        var sh = sheet();
        if (!sh) return false;
        if (seg) return true;
        var menu = document.getElementById('meal-menu-input');
        var amount = document.getElementById('meal-amount-input');
        if (!menu || !amount) return false;
        menuBlock = menu.parentElement;
        amountBlock = amount.parentElement;

        // 재료 줄이 늘면 창이 화면보다 길어진다. 창 안에서 내려 보게
        var panel = sh.firstElementChild;
        if (panel) { panel.style.maxHeight = '90vh'; panel.style.overflowY = 'auto'; panel.style.boxSizing = 'border-box'; }

        seg = document.createElement('div');
        seg.className = 'tp-seg';
        seg.innerHTML = '<div data-m="porridge">죽 이유식</div><div data-m="topping">토핑 이유식</div>';
        menuBlock.parentNode.insertBefore(seg, menuBlock);
        seg.addEventListener('click', function (e) {
            var m = e.target && e.target.getAttribute('data-m');
            if (m) setMode(m, true);
        });

        box = document.createElement('div');
        box.style.marginBottom = '18px';
        menuBlock.parentNode.insertBefore(box, menuBlock.nextSibling);
        ed = new window.Topping.Editor(box);
        return true;
    }

    function isTopping() {
        var sh = sheet();
        return !!(ed && seg && seg.getAttribute('data-style') === 'topping' && sh && sh.style.display !== 'none');
    }

    /* 식단표가 넣어 둔 계획('소고기 애호박 죽')을 토핑 줄로: 죽 · 미음 같은 말은 빼고 재료 이름만 */
    function partsFromMenu(menu) {
        var skip = { '죽': 1, '미음': 1, '진밥': 1, '무른밥': 1, '이유식': 1, '퓨레': 1, '스프': 1 };
        return String(menu || '').split(/[\s,·+]+/).map(function (w) { return w.replace(/(죽|미음)$/, ''); })
            .filter(function (w) { return w && !skip[w]; }).slice(0, 6)
            .map(function (w) { return { n: w, g: 0 }; });
    }

    function wrap() {
        if (typeof window.openMealSheet !== 'function' || typeof window.saveMealRecord !== 'function' ||
            typeof window.triggerAutoDeduction !== 'function') return false;
        if (window.openMealSheet.__topping) return true;

        var open = window.openMealSheet;
        window.openMealSheet = function () {
            var out = open.apply(this, arguments);
            if (mount()) { ed.set([]); setMode(window.Topping.mode(), false); }
            return out;
        };
        window.openMealSheet.__topping = true;

        var openUpd = window.openMealSheetForUpdate;
        if (typeof openUpd === 'function') {
            window.openMealSheetForUpdate = function (dateStr, index, menuName) {
                var out = openUpd.apply(this, arguments);
                if (mount()) { ed.set(partsFromMenu(menuName)); setMode(window.Topping.mode(), false); }
                return out;
            };
        }

        // 저장 단추 → 큐브 빼기 확인 → saveMealRecord. 토핑이면 재료 이름으로 큐브를 찾게 메뉴 칸을 채워 둔다
        var trig = window.triggerAutoDeduction;
        window.triggerAutoDeduction = function () {
            if (isTopping()) {
                var bad = ed.invalid();
                if (bad) return alert(bad);
                var menu = document.getElementById('meal-menu-input');
                if (menu) menu.value = ed.get().map(function (p) { return p.n; }).join(' ');
            }
            return trig.apply(this, arguments);
        };

        var save = window.saveMealRecord;
        window.saveMealRecord = function () {
            if (!isTopping()) return save.apply(this, arguments);
            var parts = ed.get();
            var reaction = (document.getElementById('meal-reaction-input') || {}).value || '';
            /* eslint-disable no-undef */
            var updating = (typeof editingIndex !== 'undefined' && editingIndex !== -1 && typeof editingDate !== 'undefined' && editingDate);
            var date = updating ? editingDate : selectedDateStr;
            window.Topping.saveToCalendar(date, parts, { reaction: reaction, replaceIndex: updating ? editingIndex : null });
            if (updating) { editingIndex = -1; editingDate = null; }
            /* eslint-enable no-undef */
            if (typeof closeSheets === 'function') closeSheets();
            if (typeof renderCalendar === 'function') renderCalendar();
            if (typeof renderSelectedDateRecords === 'function') renderSelectedDateRecords();
            if (typeof renderTotalSummary === 'function') renderTotalSummary();
        };
        return true;
    }

    /* 재료 기록의 '무사 통과 / 알레르기 반응' 바꾸기 */
    window.toggleTestStatus = function (dateStr, index) {
        var db = {};
        try { db = JSON.parse(localStorage.getItem('tosil_food_calendar')) || {}; } catch (e) {}
        var r = (db[dateStr] || [])[index];
        if (!r || !r.ingredient) return;
        var toFail = r.status !== 'fail';
        var name = window.Topping.josa(r.ingredient, '을', '를');
        var msg = toFail
            ? name + ' 알레르기 반응으로 바꿀까요?\n반응이 있었던 재료는 레시피 추천에서 빠져요.'
            : name + ' 무사 통과로 바꿀까요?';
        if (!confirm(msg)) return;
        r.status = toFail ? 'fail' : 'pass';
        try { localStorage.setItem('tosil_food_calendar', JSON.stringify(db)); } catch (e) {}
        if (typeof renderCalendar === 'function') renderCalendar();
        if (typeof renderSelectedDateRecords === 'function') renderSelectedDateRecords();
        if (typeof renderTotalSummary === 'function') renderTotalSummary();
    };

    var tries = 0;
    (function go() {
        if (wrap()) return;
        if (++tries < 40) setTimeout(go, 250);
    })();
})();
