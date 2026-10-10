/* ============================================================
   배냇함 — 플레이 앱 라이트 (playlite.js)

   왜 필요한가
     구글 플레이는 '의료' 기능이 있는 앱을 조직(사업자) 계정만 올리게 한다.
     (약 관리 · 예방접종 · 응급 처치 · 의료 정보 · 임신)
     지금 배냇함 플레이 계정은 개인 계정이다.
     그래서 플레이 앱 안에서만 그 기능들을 숨긴다.
     웹(아이폰 홈 화면 포함)은 지금처럼 전부 그대로 된다.

   언제 켜지나
     · 플레이 앱으로 열렸을 때
       (첫 화면의 referrer 가 android-app://com.baenaet.app 이다. 한 번 보면 이 폰에 적어 둔다)
     · 미리보기: 주소 끝에 ?playlite=1 → 이 탭에서만 라이트로 보인다. ?playlite=0 이면 끈다.

   언제 꺼지나 (조직 계정으로 바꾼 뒤)
     파이어스토어 app_settings/flags 문서에 playMedical: true (불리언) 를 넣으면
     플레이 앱도 다음에 열 때부터 다 보인다.
     ⚠️ 순서를 지킨다: 조직 계정 전환 → 플레이 콘솔 건강 신고에 의료 항목 추가 → 심사 통과 → 그다음에 스위치.
        순서가 바뀌면 그게 진짜 정책 위반이다.

   숨기는 것
     해열제(도구 · 홈 카드 · 지금 챙길 것), 약/비타민 기록, 예방접종,
     응급(SOS · 열경련 · 등 두드리기 · 심폐소생 · 119 카드 · 삼켰어요 · 알레르기),
     소아과 진료 브리핑, 의료 글 열두 편, 기저귀 똥 색 풀이, 임신 · 임신 준비

   지우지 않는다. 숨긴다.
     기록과 데이터는 그대로다. 가족 동기화도 그대로다.
     스위치만 켜면 다시 보인다.

   index.html <head> 위쪽, safenet.js 바로 다음에 한 줄:
     <script src="./playlite.js?v=2"></script>
   (화면이 그려지기 전에 켜져야 해서 맨 아래가 아니라 위에 둔다)
   ============================================================ */

(function () {
    'use strict';

    var PKG    = 'android-app://com.baenaet.app';
    var K_PLAY = 'baenaet_play_app';       // 이 폰에서 플레이 앱으로 연 적 있다 (localStorage)
    var K_SESS = 'baenaet_play_sess';      // 이 창은 플레이 앱이다 (sessionStorage)
    var K_PREV = 'baenaet_play_preview';   // ?playlite=1 미리보기 (sessionStorage)
    var K_MED  = 'baenaet_play_medical';   // 서버 스위치 playMedical 이 켜져 있다 (localStorage)

    function lsGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
    function lsSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }
    function lsDel(k) { try { window.localStorage.removeItem(k); } catch (e) {} }
    function ssGet(k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } }
    function ssSet(k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) {} }
    function ssDel(k) { try { window.sessionStorage.removeItem(k); } catch (e) {} }

    /* ==========================================================
       1. 지금 플레이 앱인가
       ---------------------------------------------------------- */
    try {
        var q = new URLSearchParams(location.search).get('playlite');
        if (q === '1') ssSet(K_PREV, '1');
        if (q === '0') ssDel(K_PREV);   // 미리보기만 끈다. 플레이 앱 표시는 서버 스위치로만 풀린다.
    } catch (e) {}

    var fromPlay = String(document.referrer || '').indexOf(PKG) === 0;
    if (fromPlay) { lsSet(K_PLAY, '1'); ssSet(K_SESS, '1'); }

    // 크롬 탭(브라우저)으로 연 웹은 라이트가 아니다. 같은 폰이라도.
    // ⚠️ 플레이 앱과 크롬은 저장소를 같이 쓴다. 그래서 '앱 창으로 열렸을 때' 만 본다.
    var inBrowserTab = false;
    try { inBrowserTab = !!(window.matchMedia && window.matchMedia('(display-mode: browser)').matches); } catch (e) {}

    var preview = ssGet(K_PREV) === '1';
    var playCtx = fromPlay || ssGet(K_SESS) === '1' || (lsGet(K_PLAY) === '1' && !inBrowserTab);
    var medicalOn = lsGet(K_MED) === '1';
    var lite = preview || (playCtx && !medicalOn);

    window.isPlayLite = function () { return lite; };
    window.isPlayApp = function () { return playCtx; };

    /* ---------- 점검용 (폰에서 확인할 때) ---------- */
    window.playLiteDebug = function () {
        console.log('[playlite] 라이트:', lite, '· 플레이 앱:', playCtx, '· 미리보기:', preview,
                    '· 처음 연 곳:', document.referrer || '(없음)', '· 의료 스위치:', medicalOn);
        return { lite: lite, playApp: playCtx, preview: preview, medicalOn: medicalOn };
    };

    /* ==========================================================
       2. 서버 스위치 읽기 (플레이 앱에서만)
          다음에 열 때부터 반영한다. 지금 화면을 갑자기 바꾸지 않는다.
       ---------------------------------------------------------- */
    function readSwitch(tries) {
        if (!playCtx) return;
        if (!window.db || typeof window.getDoc !== 'function' || typeof window.doc !== 'function') {
            if (tries < 20) setTimeout(function () { readSwitch(tries + 1); }, 1500);
            return;
        }
        try {
            window.getDoc(window.doc(window.db, 'app_settings', 'flags')).then(function (s) {
                var on = !!(s && s.exists && s.exists() && (s.data() || {}).playMedical === true);
                if (on) lsSet(K_MED, '1'); else lsDel(K_MED);
            }).catch(function () {});
        } catch (e) {}
    }
    function startSwitchWatch() {
        setTimeout(function () { readSwitch(0); }, 2500);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startSwitchWatch);
    else startSwitchWatch();

    if (!lite) return;   // 웹 · 아이폰 · 스위치 켜진 플레이 앱은 여기서 끝. 아무것도 안 건드린다.

    /* ==========================================================
       3. 화면이 그려지기 전에 숨긴다 (CSS)
       ---------------------------------------------------------- */
    document.documentElement.classList.add('play-lite');

    var HIDE = [
        // 해열제
        '#btn-tool-fever', '#panel-fever',
        '[onclick*="directGoToolbox(\'fever\')"]', '[onclick*="switchTool(\'fever\')"]',
        '[onclick*="openPediatricianReport"]', '[onclick*="downloadFeverReport"]',
        // 약/비타민 기록
        '[onclick*="openTrackerSheet(\'med\')"]', '#btn-sub-med',
        // 응급
        '[onclick*="openSOSModal"]', '[onclick*="openEmergencyModal"]', '[onclick*="open119Card"]',
        '#sos-modal', '#emergency-modal', '#sos-row-plus', '.sos-btn-medical', '#sos-step-medical',
        '#home-e119', '#info-e119', '#e119-card',
        // 예방접종
        '[onclick*="openVaccineSheet"]', '[onclick*="goVaccineSchedule"]',
        '#home-vaccine-card', '#vaccine-entry', '#vaccine-sheet', '#info-vaccine', '#vac-dday',
        // 열날 때 '이 아기 기준' 칸
        '#info-fever-guide',
        // 기저귀 똥 색 풀이 (담도폐쇄 · 혈변 같은 말)
        '#poop-warning-msg',
        // 이 파일이 표시해 두는 것
        '.pl-hide'
    ];
    var css =
        HIDE.map(function (s) { return 'html.play-lite ' + s; }).join(',\n') +
        ' { display: none !important; }\n' +
        // 홈 '챙겨두기' — 해열제 자리는 성장 기록이 채운다. 못 채우면 저금통이 한 줄을 다 쓴다
        'html.play-lite #db-ledger-card.pl-wide { grid-column: 1 / -1; }\n' +
        // 툴박스 일곱 칸 — 둘째 줄 세 칸을 가운데로 (오른쪽 끝 빈칸이 구멍처럼 보였다)
        'html.play-lite .toolbox-grid { display: flex !important; flex-wrap: wrap !important; justify-content: center !important; }\n' +
        'html.play-lite .toolbox-grid > .tool-chip { flex: 0 0 calc((100% - 24px) / 4) !important; box-sizing: border-box !important; }\n' +
        // 기록하기 네 칸 중 약이 빠지면 세 칸
        'html.play-lite .pl-grid3 { grid-template-columns: repeat(3, 1fr) !important; }\n' +
        // 글을 빼고 나면 마지막 글 밑줄이 남는다
        'html.play-lite .library-container details.lib-item:last-of-type { border-bottom: none !important; }\n';
    try {
        var st = document.createElement('style');
        st.id = 'playlite-css';
        st.textContent = css;
        (document.head || document.documentElement).appendChild(st);
    } catch (e) {}

    /* ==========================================================
       4. 임신 · 임신 준비는 꺼 둔다
          stage.js 와 친구들이 이 두 칸을 읽고 켜질지 정한다.
          이 화면에서만 '없음' 으로 읽히게 한다. 저장된 값은 건드리지 않는다.
       ---------------------------------------------------------- */
    try {
        var BLOCK = { tosil_stage_beta: 1, tosil_stage_live: 1 };
        var origGet = Storage.prototype.getItem;
        Storage.prototype.getItem = function (k) {
            try { if (BLOCK[k] && this === window.localStorage) return null; } catch (e) {}
            return origGet.apply(this, arguments);
        };
    } catch (e) {}

    /* ==========================================================
       5. 여는 함수 막기
          버튼은 위에서 숨겼다. 그래도 알림 · 마지막에 쓴 도구 · 다른 파일이
          직접 부르는 길이 있어서 함수 쪽도 막는다.
       ---------------------------------------------------------- */
    var FALLBACK_TOOL = 'growth';

    function mark(fn) { try { fn.__pl = true; } catch (e) {} return fn; }

    // 해열제 도구로 가려 하면 성장 도구로
    function toolGuard(orig) {
        return function (panelId, el) {
            if (panelId === 'fever') return orig.call(this, FALLBACK_TOOL, null);
            return orig.apply(this, arguments);
        };
    }
    function goGuard(orig) {
        return function (toolType) {
            if (toolType === 'fever') return orig.call(this, FALLBACK_TOOL);
            return orig.apply(this, arguments);
        };
    }
    function sheetGuard(orig) {
        return function (type) {
            if (type === 'med') return;
            return orig.apply(this, arguments);
        };
    }
    function block() { return function () { return undefined; }; }

    var GUARDS = {
        switchTool: toolGuard,
        directGoToolbox: goGuard,
        openTrackerSheet: sheetGuard,
        openSOSModal: block, showSosMedical: block, showSosSwallow: block, showSosAnaphylaxis: block,
        markSwallowTime: block,
        openEmergencyModal: block,
        open119Card: block, copy119: block,
        openVaccineSheet: block, goVaccineSchedule: block, toggleVaccine: block,
        openPediatricianReport: block, downloadFeverReport: block,
        openHeartSheet: block
    };

    function install(name) {
        var make = GUARDS[name];
        var cur = window[name];
        var desc = null;
        try { desc = Object.getOwnPropertyDescriptor(window, name); } catch (e) {}

        // function 으로 선언된 것(script.js 의 switchTool 같은)은 지울 수 없어서 덮어쓰기만 한다
        if (desc && desc.configurable === false) {
            if (typeof cur === 'function' && !cur.__pl) {
                try { window[name] = mark(make(cur)); } catch (e) {}
            }
            return;
        }
        if (desc && desc.get && desc.get.__pl) return;   // 이미 감쌌다

        // window.x = function 으로 만든 것은 나중에 누가 다시 덮어써도 감싼 채로 남게 한다
        var wrapped = (typeof cur === 'function') ? (cur.__pl ? cur : mark(make(cur))) : cur;
        var getter = mark(function () { return wrapped; });
        try {
            Object.defineProperty(window, name, {
                configurable: true,
                enumerable: true,
                get: getter,
                set: function (v) {
                    wrapped = (typeof v === 'function') ? (v.__pl ? v : mark(make(v))) : v;
                }
            });
        } catch (e) {
            if (typeof cur === 'function' && !cur.__pl) { try { window[name] = mark(make(cur)); } catch (e2) {} }
        }
    }
    function installAll() {
        Object.keys(GUARDS).forEach(install);
    }

    /* ==========================================================
       6. 그려진 뒤에 고치는 것
       ---------------------------------------------------------- */
    // 의료 글 — 제목에 든 낱말로 찾는다 (infopick.js 와 같은 방식)
    var MED_ARTICLES = [
        '열날 때', '분수토', '똥 색깔', '개봉 후', '떨어졌어요', '화상', '두드러기',
        '체온, 어디서', '약 먹이기', '코막힘', '안 쌌어요', '예방접종 하고'
    ];

    function titleOf(d) {
        var sum = d.querySelector('summary');
        if (!sum) return '';
        var head = sum.firstElementChild;
        return String((head ? head.textContent : sum.textContent) || '').trim();
    }

    var pickTimer = null;
    function removeArticles() {
        var removed = false;
        var items = document.querySelectorAll('#tab-info details.lib-item');
        for (var i = 0; i < items.length; i++) {
            var t = titleOf(items[i]);
            for (var j = 0; j < MED_ARTICLES.length; j++) {
                if (t.indexOf(MED_ARTICLES[j]) > -1) {
                    if (items[i].parentNode) items[i].parentNode.removeChild(items[i]);
                    removed = true;
                    break;
                }
            }
        }
        // 맞춤 글 세 편을 남은 글로 다시 고르게 한다
        if (removed && typeof window.refreshInfoPick === 'function') {
            clearTimeout(pickTimer);
            pickTimer = setTimeout(function () { try { window.refreshInfoPick(); } catch (e) {} }, 40);
        }
    }

    // 육아정보 탭 맨 위 '위급 상황 대처' 네 칸
    function hideEmergencyBlock() {
        var tab = document.getElementById('tab-info');
        var shell = tab && tab.firstElementChild;
        if (!shell) return;
        var cell = shell.querySelector('[onclick*="openEmergencyModal"]');
        if (!cell) return;
        var b = cell;
        while (b && b.parentNode && b.parentNode !== shell) b = b.parentNode;
        if (b && b.parentNode === shell) b.classList.add('pl-hide');
    }

    // 성장 도구 안 '다음 예방접종 브리핑' 상자
    function hideVaccineBox() {
        var vi = document.getElementById('vaccine-info');
        if (!vi) return;
        var box = (vi.closest && vi.closest('.box-tint-blue')) || vi.parentNode;
        if (box) box.classList.add('pl-hide');
    }

    // 기록하기: 맘마 · 수면 · 기저귀 세 칸으로
    function trackerGrid() {
        var b = document.querySelector('[onclick*="openTrackerSheet(\'med\')"]');
        if (b && b.parentNode && b.parentNode.classList) b.parentNode.classList.add('pl-grid3');
    }

    // 홈 '챙겨두기' — 해열제 자리에 성장 기록 (새 기능이 아니라 툴박스에 있는 걸 꺼내 둔다)
    var TXT_STYLE = 'position:absolute; top:56%; left:0; width:100%; transform:translateY(-50%); ' +
                    'display:flex; flex-direction:column; justify-content:center; align-items:center; ' +
                    'text-align:center; margin:0;';
    function growthHTML() {
        var recs = [];
        try { recs = JSON.parse(lsGet('tosil_growth_records')) || []; } catch (e) {}
        var last = null;
        for (var i = 0; i < recs.length; i++) {
            var r = recs[i];
            if (!r || !(Number(r.weight) || Number(r.height))) continue;
            if (!last || String(r.date || '') >= String(last.date || '')) last = r;
        }
        if (!last) {
            return '<div style="font-size:13px; font-weight:800; color:#B3A498;">터치해서<br>키·몸무게를 적어요</div>';
        }
        var w = Number(last.weight), h = Number(last.height);
        var big = w ? (+w.toFixed(1)) + 'kg' : (+h.toFixed(1)) + 'cm';
        var sub = [];
        if (w && h) sub.push((+h.toFixed(1)) + 'cm');
        var d = String(last.date || '').split('-');
        if (d.length === 3) sub.push(Number(d[1]) + '월 ' + Number(d[2]) + '일');
        return '<div style="font-size:22px; font-weight:900; color:#4A413C; letter-spacing:-0.5px; margin-bottom:4px;">' + big + '</div>' +
               '<div style="font-size:12px; font-weight:800; color:var(--text-s); white-space:nowrap;">' + sub.join(' · ') + '</div>';
    }
    function growthCard() {
        var ledger = document.getElementById('db-ledger-card');
        if (!ledger || !ledger.parentNode) return;
        var card = document.getElementById('db-growth-card');
        if (!card) {
            var fever = ledger.parentNode.querySelector('[onclick*="directGoToolbox(\'fever\')"]');
            if (!fever) { ledger.classList.add('pl-wide'); return; }
            // 해열제 카드와 똑같은 모양으로 만든다 (복사해서 글자만 바꾼다)
            card = fever.cloneNode(true);
            // ⚠️ theme.js 는 처음 본 style 을 data-theme-src 에 적어 두고 그걸로 다시 칠한다.
            //    복사하면 해열제 카드의 옛 style 까지 따라와서, 여기서 준 position 이 지워졌다 (글자가 카드 밖으로 나갔다).
            [card].concat([].slice.call(card.querySelectorAll('[data-theme-src]'))).forEach(function (n) {
                n.removeAttribute('data-theme-src');
                n.removeAttribute('data-theme-applied');
            });
            card.id = 'db-growth-card';
            card.setAttribute('onclick', "directGoToolbox('growth')");
            card.style.position = 'relative';
            card.style.display = 'block';
            var head = card.firstElementChild;
            var spans = head ? head.querySelectorAll('span') : [];
            if (spans[0]) spans[0].textContent = '📈';
            if (spans[1]) spans[1].textContent = '성장 기록';
            var old = card.querySelector('#db-fever-text');
            var box = document.createElement('div');
            box.id = 'db-growth-text';
            box.style.cssText = TXT_STYLE;
            if (old && old.parentNode) old.parentNode.replaceChild(box, old); else card.appendChild(box);
            ledger.parentNode.insertBefore(card, ledger);
        }
        // ⚠️ 같은 글이면 다시 넣지 않는다. 넣을 때마다 화면이 바뀐 걸로 잡혀서 끝없이 돈다.
        var t = document.getElementById('db-growth-text');
        var html = growthHTML();
        if (t && t.getAttribute('data-k') !== html) {
            t.innerHTML = html;
            t.setAttribute('data-k', html);
        }
    }

    // 언제깠지 — 약국 약 · 안약은 고르는 칸에서 뺀다 (분유 · 연고 · 로션 · 퓨레 · 물티슈는 그대로)
    function trimOpenItems() {
        var sel = document.getElementById('open-item-type');
        if (!sel) return;
        ['fever', 'tub_oint', 'eye_drop'].forEach(function (v) {
            var o = sel.querySelector('option[value="' + v + '"]');
            if (!o) return;
            var was = o.selected;
            o.parentNode.removeChild(o);
            if (was) {
                sel.selectedIndex = 0;
                try { if (typeof window.updateOpenItemGuide === 'function') window.updateOpenItemGuide(); } catch (e) {}
            }
        });
    }

    // 기록 목록에 가족 폰에서 온 약 기록이 섞여 있으면 숨긴다
    function hideMedRows() {
        var rows = document.querySelectorAll('.swipe-list-item');
        for (var i = 0; i < rows.length; i++) {
            if (rows[i].classList.contains('pl-hide')) continue;
            if (String(rows[i].textContent || '').indexOf('💊') > -1) rows[i].classList.add('pl-hide');
        }
    }

    // 툴박스 '지금 챙길 것' — 해열제 · 소아과 줄만 뺀다
    function isSep(el) {
        return !!(el && !el.hasAttribute('onclick') && el.style && el.style.height === '1px');
    }
    function cleanBrief() {
        var card = document.getElementById('tool-brief');
        if (!card) return;
        var rows = [], med = [];
        for (var i = 0; i < card.children.length; i++) {
            var c = card.children[i];
            if (!c.hasAttribute('onclick')) continue;
            rows.push(c);
            var o = c.getAttribute('onclick') || '';
            if (o.indexOf("'fever'") > -1 || o.indexOf('Pediatrician') > -1) med.push(c);
        }
        if (!med.length) return;
        med.forEach(function (r) {
            var prev = r.previousElementSibling, next = r.nextElementSibling;
            if (isSep(prev)) prev.parentNode.removeChild(prev);
            else if (isSep(next)) next.parentNode.removeChild(next);
            r.parentNode.removeChild(r);
        });
        var left = rows.length - med.length;
        if (!left) { card.classList.add('pl-hide'); return; }
        // 맨 위에 남은 구분선 · '지금 챙길 것 N건' 머리말 다듬기
        var first = card.firstElementChild;
        if (first && !first.hasAttribute('onclick') && /지금 챙길 것/.test(first.textContent || '')) {
            if (left === 1) first.parentNode.removeChild(first);
            else first.textContent = '지금 챙길 것 ' + left + '건';
            first = card.firstElementChild;
        }
        while (isSep(card.firstElementChild)) card.removeChild(card.firstElementChild);
        while (isSep(card.lastElementChild)) card.removeChild(card.lastElementChild);
    }

    // 말 바꾸기 — 없는 기능을 말하지 않게
    var textDone = {};
    function retext() {
        if (!textDone.desc) {
            var d = document.querySelector('#tab-info .app-desc');
            if (d) {
                if (String(d.textContent).indexOf('위급') > -1) d.textContent = '월령에 맞는 육아 정보';
                textDone.desc = true;
            }
        }
        if (!textDone.disclaimer) {
            var divs = document.querySelectorAll('#tab-info .library-container div');
            for (var i = 0; i < divs.length; i++) {
                var el = divs[i];
                if (el.querySelector('div')) continue;   // 글이 직접 들어 있는 칸만 (바깥 상자 말고)
                if (String(el.textContent).indexOf('의학적 지침(응급처치, 해열제 등)') > -1) {
                    el.innerHTML =
                        '본 앱의 육아 정보와 제품 사용 기한은 전문 기관의 일반적인 가이드라인을 요약한 것입니다.<br><br>' +
                        '아기마다 다를 수 있으니 <strong>참고용</strong>으로만 사용해 주세요. ' +
                        '아기가 평소와 다르거나 걱정되면 소아과 의료진과 상담해 주세요.';
                    var t = el.previousElementSibling;
                    if (t && String(t.textContent).indexOf('면책') > -1) t.textContent = '⚠️ 배냇함 안내';
                    textDone.disclaimer = true;
                    break;
                }
            }
        }
        // 시터 화면 '도움이 필요할 때' 머리말 — SOS 를 숨겼으니 '응급 상황' 은 뺀다
        if (!textDone.help) {
            var heads = document.querySelectorAll('#tab-home div');
            for (var k = 0; k < heads.length; k++) {
                if (heads[k].children.length === 0 && String(heads[k].textContent).trim() === '엄마·아빠 연락 · 응급 상황') {
                    heads[k].textContent = '엄마·아빠 연락';
                    break;
                }
            }
            textDone.help = true;   // 처음부터 있는 글이라 한 번만 본다
        }
        if (!textDone.plan && window.PLAN && Array.isArray(window.PLAN.alwaysFree)) {
            window.PLAN.alwaysFree = window.PLAN.alwaysFree.map(function (s) {
                return String(s).replace('기저귀·체온·성장', '기저귀·성장');
            });
            textDone.plan = true;
        }
    }

    // 새로 붙은 덩어리 안의 글자만 고친다 (화면 전체를 매번 훑지 않는다)
    function retextNode(root) {
        if (!root || root.nodeType !== 1) return;
        var text = root.textContent || '';
        // 설정의 PLUS 약속 — '해열제 간격, 응급 처치 같은 안전 정보는 계속 무료'
        if (text.indexOf('해열제 간격, 응급 처치') > -1) {
            var targets = root.querySelectorAll('div');
            for (var i = 0; i < targets.length; i++) {
                var h = targets[i].innerHTML;
                if (h.indexOf('해열제 간격, 응급 처치') > -1 && targets[i].querySelectorAll('div').length === 0) {
                    targets[i].innerHTML = h.replace(/(<br\s*\/?>\s*)?·\s*해열제 간격, 응급 처치 같은 <b>안전 정보는 계속 무료<\/b>입니다/, '');
                }
            }
        }
        // 시터 화면 '오늘 약·영양제'
        if (text.indexOf('오늘 약·영양제') > -1) {
            var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
            var n;
            while ((n = w.nextNode())) {
                if (n.nodeValue.indexOf('오늘 약·영양제') > -1) n.nodeValue = n.nodeValue.replace('오늘 약·영양제', '오늘 영양제');
            }
        }
    }

    function scrub() {
        try { hideEmergencyBlock(); } catch (e) {}
        try { hideVaccineBox(); } catch (e) {}
        try { trackerGrid(); } catch (e) {}
        try { growthCard(); } catch (e) {}
        try { trimOpenItems(); } catch (e) {}
        try { removeArticles(); } catch (e) {}
        try { cleanBrief(); } catch (e) {}
        try { hideMedRows(); } catch (e) {}
        try { retext(); } catch (e) {}
    }

    var scrubTimer = null;
    function scrubSoon() {
        if (scrubTimer) return;
        scrubTimer = setTimeout(function () { scrubTimer = null; scrub(); }, 30);
    }

    /* ==========================================================
       7. 시작
       ---------------------------------------------------------- */
    function boot() {
        installAll();
        scrub();
        try { retextNode(document.body); } catch (e) {}

        // 늦게 붙는 카드 · 다시 그려지는 카드
        try {
            new MutationObserver(function (list) {
                var touched = false;
                for (var i = 0; i < list.length; i++) {
                    var added = list[i].addedNodes;
                    for (var j = 0; j < added.length; j++) {
                        if (added[j].nodeType === 1) { touched = true; try { retextNode(added[j]); } catch (e) {} }
                    }
                }
                if (touched) scrubSoon();
            }).observe(document.body, { childList: true, subtree: true });
        } catch (e) {}

        // 다른 파일이 함수를 나중에 다시 덮어쓰는 경우가 있다 (sosplus.js · feverguard.js 같은)
        [1000, 3000, 6000, 12000].forEach(function (ms) { setTimeout(installAll, ms); });
        document.addEventListener('visibilitychange', function () {
            if (!document.hidden) { installAll(); scrubSoon(); }
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();