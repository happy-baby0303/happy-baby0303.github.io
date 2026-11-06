/* ============================================================
   배냇함 — 큐레이터의 말풍선 · 묻는 창 (shared/curatorui.js)

   왜 필요한가
     큐레이터는 본 앱(script.js)과 다른 페이지라 showToast · showConfirm 이 없었다.
     그래서 '메뉴 이름을 적어 주세요' · '이 기록을 지울까요?' 가 브라우저 기본 창(alert · confirm · prompt)으로 떴다.
     아이폰에서는 창 맨 위에 'happy-baby0303.github.io' 주소가 찍히고, 회색 시스템 창이라 다른 앱처럼 보였다.
     본 앱 말풍선 · 아래에서 올라오는 창과 같은 모양으로 바꾼다.

   쓰는 법
     showToast('냉장고 큐브 1개를 뺐어요')
     askConfirm({ text: '이 기록을 지울까요?', yes: '지우기', danger: true, onYes: function () { … } })
     askNumber({ title: '한 번에 몇 g 정도 먹나요?', sub: '…', value: 120, unit: 'g', min: 10, max: 400,
                 onDone: function (v) { … } })     // v 가 null 이면 비워서 저장한 것
                                                    // decimal: true 면 17.5 같은 소수도 받는다 (유모차 최대 체중)
     showCopySheet('복사할 글')                     // 클립보드가 막혔을 때 — 길게 눌러 복사
     sendLabel('이 젖병')                           // '남편한테 이 젖병 보내기' · '아내한테 …' · '이 젖병 보내기' 
     paintAgeBadge(real, '이유식 중기')             // 맨 위 보라 뱃지 — '생후 7개월 맞춤' · '출산 준비' · '신생아 맞춤'

   ⚠️ 뒤로가기는 curatorback.js 의 cur-ask-sheet 칸이 닫는다 (closeCurAsk).
   각 큐레이터 index.html 에서 curatorlite.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';
    if (window.__curatorUI) return;
    window.__curatorUI = true;

    var DARK = '#4A413C', GRAY = '#7A6F68', LINE = '#EDE6DE', RED = '#D64A5A';

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function lines(s) { return esc(s).replace(/\n/g, '<br>'); }

    /* ---------- 보내기 단추에 적는 받는 사람 ----------
       테스터 문의: "남편한테 보내기 · 아내한테 보내기 이렇게 거치면 어떨까".
       엄마 폰이면 '남편한테', 아빠 폰이면 '아내한테', 할머니 · 시터 폰이면 받는 사람 없이 '보내기'.
       젖병 · 유모차 · 장난감 · 카시트가 같은 말을 쓴다 (이유식 장보기는 shoplist.js 의 shopPartnerWord). */
    window.partnerWord = function () {
        var r = '';
        try { r = localStorage.getItem('user_role') || ''; } catch (e) {}
        return r === 'mom' ? '남편' : (r === 'dad' ? '아내' : '');
    };
    window.sendLabel = function (what) {
        var w = window.partnerWord();
        return (w ? w + '한테 ' : '') + (what ? what + ' ' : '') + '보내기';
    };

    /* ---------- 맨 위 보라 뱃지에 적는 나이 ----------
       '생후 0개월 맞춤' 이 두 집에서 나왔다 — 배 속 아기(생일 칸에 예정일을 넣은 집)와 태어난 지 한 달이 안 된 아기.
         배 속 아기 → '출산 준비' · 한 달 전 → '신생아' · 이른둥이 → 교정 나이(BabyAge.label) · 그 밖 → '생후 N개월'
       real 이 true 면 실제 나이로 센다 — 카시트는 법 · 안전 기준이라 교정 나이를 쓰지 않는다.
       생일이 없으면(카톡으로 받은 링크를 배냇함 없이 연 사람) 뱃지를 숨긴다.
       빈 뱃지가 보라색 작은 네모(16×8)로 제목 옆에 남아 있었다.
       extra 는 이유식처럼 나이 뒤에 붙일 말 ('생후 7개월 · 이유식 중기'). 없으면 '맞춤'. */
    window.curatorAgeText = function (real) {
        var k = '';
        try { k = localStorage.getItem('tosil_startDate') || ''; } catch (e) {}
        var p = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(k);
        if (!p) return '';
        var b = new Date(+p[1], +p[2] - 1, +p[3]), t = new Date();
        if (isNaN(b.getTime())) return '';
        t.setHours(0, 0, 0, 0);
        if (b > t) return '출산 준비';
        if (!real && window.BabyAge && window.BabyAge.on()) {
            var l = window.BabyAge.label();
            if (l) return l;
        }
        var m = (t.getFullYear() - b.getFullYear()) * 12 + (t.getMonth() - b.getMonth());
        if (t.getDate() < b.getDate()) m--;
        return m < 1 ? '신생아' : '생후 ' + m + '개월';
    };
    window.paintAgeBadge = function (real, extra) {
        var a = window.curatorAgeText(real);
        var age = /^(생후|교정) |^신생아$/.test(a);   // '출산 준비' · '예정일까지 12일' 은 뒤에 아무것도 안 붙인다
        var text = !a ? '' : (!age ? a : a + (extra ? ' · ' + extra : ' 맞춤'));
        var els = document.querySelectorAll('.dynamic-age-badge, #dynamic-age-badge');
        for (var i = 0; i < els.length; i++) {
            els[i].textContent = text;
            els[i].style.display = text ? '' : 'none';
        }
        return text;
    };

    /* ---------- 말풍선 (본 앱 showToast 와 같은 모양) ---------- */
    var toastTimer = null;
    if (typeof window.showToast !== 'function') {
        window.showToast = function (message) {
            try {
                var old = document.getElementById('cur-toast');
                if (old) old.remove();
                var t = document.createElement('div');
                t.id = 'cur-toast';
                t.setAttribute('role', 'status');
                t.textContent = String(message == null ? '' : message);
                /* 아래 오른쪽의 '맨 위로' 단추를 가리지 않게 그보다 위에 띄운다 */
                t.style.cssText = 'position:fixed; left:50%; bottom:-60px; transform:translateX(-50%); width:85%; max-width:400px; ' +
                    'box-sizing:border-box; background:rgba(49,51,63,0.95); color:#FFFFFF; padding:14px 24px; border-radius:20px; ' +
                    'font-size:14px; font-weight:800; line-height:1.5; text-align:center; white-space:pre-wrap; word-break:keep-all; ' +
                    'box-shadow:0 8px 24px rgba(0,0,0,0.2); z-index:10000010; opacity:0; pointer-events:none; font-family:inherit; ' +
                    'transition:opacity 0.3s ease, bottom 0.3s cubic-bezier(0.175,0.885,0.32,1.275);';
                (document.body || document.documentElement).appendChild(t);
                requestAnimationFrame(function () {
                    t.style.opacity = '1';
                    t.style.bottom = 'calc(96px + env(safe-area-inset-bottom, 0px))';
                });
                clearTimeout(toastTimer);
                toastTimer = setTimeout(function () {
                    t.style.opacity = '0'; t.style.bottom = '-60px';
                    setTimeout(function () { if (t.parentNode) t.remove(); }, 320);
                }, 2600);
            } catch (e) {}
        };
    }

    /* ---------- 아래에서 올라오는 창 ---------- */
    var current = null;   // { onNo }

    window.closeCurAsk = function (silent) {
        var s = document.getElementById('cur-ask-sheet');
        if (s) s.remove();
        document.body.style.overflow = '';
        var c = current; current = null;
        if (!silent && c && typeof c.onNo === 'function') { try { c.onNo(); } catch (e) {} }
    };

    function sheet(inner, opts) {
        window.closeCurAsk(true);
        var tt = document.getElementById('cur-toast');      // 앞에 뜬 말풍선이 창 제목을 가리지 않게
        if (tt) tt.remove();
        current = { onNo: opts && opts.onNo };
        var w = document.createElement('div');
        w.id = 'cur-ask-sheet';
        w.setAttribute('style', 'position:fixed; inset:0; z-index:100006; background:rgba(43,36,30,0.45); display:flex; align-items:flex-end; justify-content:center;');
        w.onclick = function (e) { if (e.target === w) window.closeCurAsk(); };
        w.innerHTML = '<div style="width:100%; max-width:480px; background:#FFFFFF; border-radius:24px 24px 0 0; ' +
                'padding:20px 20px calc(20px + env(safe-area-inset-bottom, 0px)); box-sizing:border-box; font-family:inherit;">' +
            '<div style="width:40px; height:5px; background:' + LINE + '; border-radius:3px; margin:0 auto 18px;"></div>' +
            inner + '</div>';
        document.body.appendChild(w);
        document.body.style.overflow = 'hidden';
        return w;
    }
    function buttons(noLabel, yesLabel, danger) {
        return '<div style="display:flex; gap:8px; margin-top:20px;">' +
            '<button type="button" data-cur="no" style="flex:1; padding:15px; border-radius:14px; border:1px solid ' + LINE + '; background:#FFFFFF; ' +
                'color:' + GRAY + '; font-size:14.5px; font-weight:800; cursor:pointer; font-family:inherit;">' + esc(noLabel) + '</button>' +
            '<button type="button" data-cur="yes" style="flex:1.4; padding:15px; border-radius:14px; border:none; background:' + (danger ? RED : DARK) + '; ' +
                'color:#FFFFFF; font-size:14.5px; font-weight:800; cursor:pointer; font-family:inherit;">' + esc(yesLabel) + '</button>' +
        '</div>';
    }

    /* 묻기 — 예전 confirm() 자리 */
    window.askConfirm = function (o) {
        o = o || {};
        var w = sheet(
            '<div style="font-size:16.5px; font-weight:900; color:' + DARK + '; line-height:1.55; word-break:keep-all;">' + lines(o.text) + '</div>' +
            (o.sub ? '<div style="font-size:13px; font-weight:600; color:' + GRAY + '; line-height:1.6; margin-top:6px; word-break:keep-all;">' + lines(o.sub) + '</div>' : '') +
            buttons(o.no || '그대로 둘게요', o.yes || '확인', !!o.danger), o);
        w.querySelector('[data-cur="no"]').onclick = function () { window.closeCurAsk(); };
        w.querySelector('[data-cur="yes"]').onclick = function () {
            window.closeCurAsk(true);
            if (typeof o.onYes === 'function') o.onYes();
        };
    };

    /* 숫자 하나 받기 — 예전 prompt() 자리 */
    window.askNumber = function (o) {
        o = o || {};
        var w = sheet(
            '<div style="font-size:16.5px; font-weight:900; color:' + DARK + '; word-break:keep-all;">' + esc(o.title) + '</div>' +
            (o.sub ? '<div style="font-size:12.5px; font-weight:600; color:' + GRAY + '; line-height:1.6; margin-top:6px; word-break:keep-all;">' + lines(o.sub) + '</div>' : '') +
            '<div style="display:flex; align-items:center; gap:8px; margin-top:14px;">' +
                '<input id="cur-ask-num" type="number"' + (o.decimal ? ' step="any" inputmode="decimal"' : ' inputmode="numeric"') + ' value="' + esc(o.value == null ? '' : o.value) + '" ' +
                    'style="flex:1; min-width:0; box-sizing:border-box; padding:14px 16px; border-radius:14px; border:1px solid ' + LINE + '; ' +
                    'background:#FBF8F3; color:' + DARK + '; font-size:17px; font-weight:800; font-family:inherit;">' +
                (o.unit ? '<span style="font-size:15px; font-weight:800; color:' + GRAY + ';">' + esc(o.unit) + '</span>' : '') +
            '</div>' +
            '<div id="cur-ask-err" style="display:none; font-size:12.5px; font-weight:700; color:' + RED + '; margin-top:8px;"></div>' +
            buttons(o.no || '닫기', o.yes || '저장하기', false), o);
        var input = w.querySelector('#cur-ask-num'), err = w.querySelector('#cur-ask-err');
        w.querySelector('[data-cur="no"]').onclick = function () { window.closeCurAsk(); };
        w.querySelector('[data-cur="yes"]').onclick = function () {
            var raw, v;
            if (o.decimal) {
                raw = String(input.value || '').replace(/[^0-9.]/g, '');
                var dot = raw.indexOf('.');
                if (dot > -1) raw = raw.slice(0, dot + 1) + raw.slice(dot + 1).replace(/\./g, '');
                v = (raw === '' || raw === '.') ? null : parseFloat(raw);
            } else {
                raw = String(input.value || '').replace(/[^0-9]/g, '');
                v = raw === '' ? null : parseInt(raw, 10);
            }
            if (v !== null && ((o.min != null && v < o.min) || (o.max != null && v > o.max))) {
                err.textContent = o.min + '~' + o.max + ' 사이로 넣어 주세요';
                err.style.display = 'block';
                return;
            }
            window.closeCurAsk(true);
            if (typeof o.onDone === 'function') o.onDone(v);
        };
        setTimeout(function () { try { input.focus(); input.select(); } catch (e) {} }, 60);
    };

    /* 복사 — 클립보드가 막힌 폰에서 예전 prompt('아래 내용을 복사해 주세요') 자리 */
    window.showCopySheet = function (text, title) {
        var w = sheet(
            '<div style="font-size:16.5px; font-weight:900; color:' + DARK + ';">' + esc(title || '길게 눌러 복사해 주세요') + '</div>' +
            '<textarea id="cur-copy-text" readonly rows="8" style="width:100%; box-sizing:border-box; margin-top:12px; padding:14px; border-radius:14px; ' +
                'border:1px solid ' + LINE + '; background:#FBF8F3; color:' + DARK + '; font-size:14px; line-height:1.6; font-family:inherit; resize:none;">' +
                esc(text) + '</textarea>' +
            '<button type="button" data-cur="yes" style="width:100%; margin-top:14px; padding:15px; border-radius:14px; border:none; background:' + DARK + '; ' +
                'color:#FFFFFF; font-size:14.5px; font-weight:800; cursor:pointer; font-family:inherit;">닫기</button>', null);
        w.querySelector('[data-cur="yes"]').onclick = function () { window.closeCurAsk(true); };
        setTimeout(function () { try { var t = w.querySelector('#cur-copy-text'); t.focus(); t.select(); } catch (e) {} }, 60);
    };
})();

/* ============================================================
   보낸 링크(?pick=)로 연 카드에 데려다 놓기 — curLand(찾기, 위 여백)

   ⚠️ 카톡으로 받은 유모차 · 카시트 링크가 조금 느린 폰(CPU 2배)에서 카드에 한 번도 닿지 못했다.
      · 유모차: 카드로 내려간 직후, 카드를 다시 그리는 쪽(strollerown.js)이 '화면이 튀지 않게' 스크롤을 0으로 되돌렸다.
      · 카시트: 카드로 내려간 뒤에 위쪽 카드들이 늦게 붙어서 카드가 3,000px 아래로 밀려났다.
      젖병은 CPU 4배에서 같은 일이 났다. 빠른 폰에서는 순서가 맞아서 안 보였다.
   그래서 한 번 내려가고 끝내지 않는다. 6초 동안 0.25초마다 카드가 제자리에 있는지 보고, 벗어났으면 다시 맞춘다.
   손가락을 대거나 휠을 굴리면 그 순간 손을 뗀다 (사람이 움직이는 화면을 끌어당기지 않는다).
   그동안은 window.__curLandUntil 이 켜져 있어서, 스크롤을 되돌리는 코드들이 이걸 보고 물러선다.
   ============================================================ */
(function () {
    'use strict';
    window.curLand = function (find, offOf) {
        var get = typeof find === 'function' ? find : function () { return find; };
        var off = typeof offOf === 'function' ? offOf : function () { return offOf || 0; };
        var until = Date.now() + 6000, stop = false;
        window.__curLandUntil = until;
        var quit = function () { stop = true; window.__curLandUntil = 0; };
        ['touchstart', 'wheel', 'keydown', 'pointerdown'].forEach(function (ev) {
            try { window.addEventListener(ev, quit, { passive: true, once: true, capture: true }); } catch (e) {}
        });
        var fit = function () {
            var el = get();
            if (!el || !el.isConnected) return;
            var top = el.getBoundingClientRect().top, want = off();
            if (Math.abs(top - want) > 24) window.scrollTo(0, Math.max(0, (window.scrollY || 0) + top - want));
        };
        fit();
        (function check() {
            if (stop) return;
            if (Date.now() > until) { if (window.__curLandUntil === until) window.__curLandUntil = 0; return; }
            fit();
            setTimeout(check, 250);
        })();
    };
})();
