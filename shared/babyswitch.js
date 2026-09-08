/* ============================================================
   배냇함 — 큐레이터 다둥이 연결 (babyswitch.js)

   배냇함 본체(script.js)는 아기마다 데이터를 나누려고
   localStorage 자체를 가로채는 프록시를 깔아둔다.

       tosil_babyName   → tosil_babyName_2   (둘째)
       tosil_startDate  → tosil_startDate_2

   그런데 큐레이터 다섯 개는 script.js 를 안 불러온다.
   그래서 꼬리표 없는 원본 키를 읽는다 = 언제나 첫째다.

   둘째로 바꿔놓고 이유식에 들어가도 첫째 이름이 뜨고,
   첫째 개월수로 레시피를 고르고, 첫째 냉장고 큐브를 깎았다.

   이 파일이 그 프록시를 큐레이터에도 똑같이 깔아준다.
   ⚠️ 반드시 data.js · app.js 보다 먼저 로드해야 한다.
      나중에 깔면 이미 읽어간 값은 첫째 것이다.

   그리고 화면 맨 위에 아기 고르는 칩을 하나 놓는다.
   큐레이터 안에서도 아이를 바꿀 수 있어야 하니까.

   <script src="../babyswitch.js"></script>   ← 제일 위
   ============================================================ */
(function () {
    'use strict';

    /* script.js 와 같은 목록이어야 한다. 하나라도 빠지면 그 데이터만 첫째 걸 본다. */
    var BABY_KEYS = [
        'tosil_babyName', 'tosil_startDate', 'tosil_feedingStage', 'tosil_baby_photo',
        'tosil_tracker_records', 'tosil_sleep_start', 'tosil_sleep_type',
        'tosil_fever_records', 'tosil_latest_weight', 'tosil_growth_records',
        'tosil_milestones', 'tosil_routine_data', 'tosil_routine_date',
        'tosil_day_photos', 'tosil_day_voices', 'tosil_sealed', 'tosil_day_notes',
        'tosil_first_words', 'tosil_letters', 'tosil_replies', 'tosil_milestone_dates',
        'tosil_baby', 'tosil_open_records', 'tosil_cube_records', 'tosil_cube_quicks',
        'tosil_parent_notice', 'tosil_baton_records', 'tosil_monthgift_done',
        // 큐레이터가 따로 만드는 것들도 아이마다 달라야 한다
        'tosil_food_calendar', 'tosil_passed_asked', 'tosil_my_toys',
        'tosil_playweek', 'tosil_nipple_changed', 'tosil_food_tool',
        'tosil_bottle_gear', 'tosil_bottle_parts', 'tosil_paci_tried', 'tosil_paci_symptom',
        'tosil_bottle_refuse', 'tosil_milk_stock', 'tosil_carseat_own'
    ];

    if (window.__babySwitchOn) return;
    window.__babySwitchOn = true;

    var rawGet = Storage.prototype.getItem;
    var rawSet = Storage.prototype.setItem;
    var rawDel = Storage.prototype.removeItem;

    // 원본 그대로 읽고 쓰는 문 (프로필 목록처럼 공용인 것에 쓴다)
    window.rawStorage = {
        get: function (k) { return rawGet.call(localStorage, k); },
        set: function (k, v) { rawSet.call(localStorage, k, v); }
    };

    window.currentBabySuffix = rawGet.call(localStorage, 'tosil_active_baby_suffix') || '';

    function keyOf(k) {
        return (window.currentBabySuffix && BABY_KEYS.indexOf(k) > -1)
             ? k + window.currentBabySuffix : k;
    }

    Storage.prototype.getItem = function (k) {
        var v = rawGet.call(this, keyOf(k));
        try { if (v && (v[0] === '[' || v[0] === '{')) JSON.parse(v); }
        catch (e) { rawDel.call(this, keyOf(k)); return null; }   // 깨진 값 자가 치유
        return v;
    };
    Storage.prototype.setItem = function (k, v) { rawSet.call(this, keyOf(k), v); };
    Storage.prototype.removeItem = function (k) { rawDel.call(this, keyOf(k)); };

    /* ---------- 이름 + 조사 ----------
       '지선는' 이 화면에 찍히면 감성 앱이 아니다.
       받침이 있으면 이름 뒤에 '이' 가 붙는다.
           지선 → 지선이는 · 지선이가 · 지선이의
           지수 → 지수는   · 지수가   · 지수의
       다섯 큐레이터가 전부 이걸 쓴다. -------- */

    window.babyNm = function (josa) {
        var n = localStorage.getItem('tosil_babyName') || '우리 아기';
        var c = n.charCodeAt(n.length - 1);
        var jong = (c >= 0xAC00 && c <= 0xD7A3) && ((c - 0xAC00) % 28 !== 0);
        return n + (jong ? '이' : '') + (josa || '');
    };

    /* ---------- 아기 목록 ---------- */

    function profiles() {
        var list;
        try { list = JSON.parse(rawGet.call(localStorage, 'tosil_baby_profiles')); } catch (e) { list = null; }
        if (!Array.isArray(list) || !list.length) {
            list = [{ id: '', name: rawGet.call(localStorage, 'tosil_babyName') || '우리 아기' }];
        }
        return list;
    }

    window.switchCuratorBaby = function (suffix) {
        rawSet.call(localStorage, 'tosil_active_baby_suffix', suffix || '');
        location.reload();          // 이미 읽어간 값이 많아서 다시 그리는 게 안전하다
    };

    /* ---------- 화면 맨 위 아기 칩 ---------- */

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function mount() {
        var list = profiles();
        if (list.length < 2) return;                    // 아기가 하나면 안 띄운다
        if (document.getElementById('baby-switch')) return;

        var host = document.querySelector('main.container') || document.querySelector('.container');
        if (!host) return;

        var cur = window.currentBabySuffix;
        var box = document.createElement('div');
        box.id = 'baby-switch';

        /* ⚠️ 아기를 전부 늘어놓지 않는다. 셋이면 칩이 셋 뜬다.
              지금 보고 있는 아이 하나만 쓰고, 누르면 고르는 창이 열린다.
              이름과 '바꾸기' 를 같은 줄 · 같은 크기로 둬야 정렬이 맞는다. */
        var now = list.filter(function (b) { return (b.id || '') === cur; })[0] || list[0];
        box.style.cssText = 'text-align:center; margin:-8px 0 22px;';
        box.innerHTML =
            '<div onclick="window.openBabyPicker()" style="display:inline-flex; align-items:center; ' +
                'gap:6px; padding:7px 12px; background:#F2F4F6; border-radius:20px; cursor:pointer; ' +
                'font-size:12.5px; line-height:1.4;">' +
                '<span>👶</span>' +
                '<span style="font-weight:800; color:#191F28;">' + esc(now.name || '아기') + '</span>' +
                '<span style="font-weight:700; color:#8B95A1;">바꾸기</span>' +
            '</div>';

        /* ⚠️ 페이지 맨 위가 아니라 '제목 바로 밑' 이다.
              맨 위에 두면 쿠팡 고지보다 위로 올라가고, 다섯 큐레이터가
              서로 다른 자리에 뜬다. 부모는 매번 다른 데를 찾아야 한다. */
        var title = host.querySelector('.hero-title');
        if (title && title.parentNode === host) host.insertBefore(box, title.nextSibling);
        else host.insertBefore(box, host.firstChild);
    }

    /* ---------- 고르는 창 ---------- */

    window.openBabyPicker = function () {
        var old = document.getElementById('baby-picker');
        if (old) old.remove();

        var list = profiles(), cur = window.currentBabySuffix;
        var wrap = document.createElement('div');
        wrap.id = 'baby-picker';
        wrap.setAttribute('style',
            'position:fixed; inset:0; z-index:100060; background:rgba(0,0,0,0.5); ' +
            'display:flex; align-items:flex-end; justify-content:center;');

        wrap.innerHTML =
            '<div style="background: #FFFFFF; width:100%; max-width:480px; ' +
                'border-radius:24px 24px 0 0; padding:24px 20px calc(28px + env(safe-area-inset-bottom,0px));">' +
                '<div style="font-size:17px; font-weight:900; color:#191F28; margin-bottom:14px;">누구 걸 볼까요</div>' +
                list.map(function (b) {
                    var on = ((b.id || '') === cur);
                    return '<div onclick="window.switchCuratorBaby(\'' + (b.id || '') + '\')" ' +
                        'style="display:flex; justify-content:space-between; align-items:center; ' +
                        'padding:15px 16px; margin-bottom:8px; border-radius:14px; cursor:pointer; ' +
                        'font-size:15px; font-weight:800; ' +
                        (on ? 'background:#191F28; color:#FFFFFF;'
                            : 'background: #F9FAFB; color:#4E5968; border:1px solid #E5E8EB;') + '">' +
                        '<span>' + esc(b.name || '아기') + '</span>' +
                        (on ? '<span style="font-size:12.5px; font-weight:700;">보는 중</span>' : '') +
                    '</div>';
                }).join('') +
            '</div>';

        wrap.onclick = function (e) { if (e.target === wrap) wrap.remove(); };
        document.body.appendChild(wrap);
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () {
        setTimeout(mount, 300); setTimeout(mount, 1200);
    });
    else { setTimeout(mount, 300); setTimeout(mount, 1200); }

    window.babySwitchVersion = '2026-09-07';   // 다섯 폴더가 같은 날짜여야 한다

    window.babySwitchDebug = function () {
        console.log('이 폴더의 babyswitch 판:', window.babySwitchVersion);
        console.log('붙은 자리:',
            (document.getElementById('baby-switch') || {}).previousElementSibling
                ? (document.getElementById('baby-switch').previousElementSibling.className || '(제목 밑)')
                : '(안 붙음 · 아기가 하나면 정상)');
        console.log('지금 아기 꼬리표:', JSON.stringify(window.currentBabySuffix), '(빈 값이면 첫째)');
        console.log('아기 목록:', profiles().map(function (b) { return (b.name || '?') + '[' + (b.id || '첫째') + ']'; }).join(' · '));
        console.log('이름:', localStorage.getItem('tosil_babyName'));
        console.log('생년월일:', localStorage.getItem('tosil_startDate'));
        console.log('원본 키(첫째):', window.rawStorage.get('tosil_babyName'));
        console.log('프록시 걸린 키 수:', BABY_KEYS.length);
    };
})();