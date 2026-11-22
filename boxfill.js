/* ============================================================
   배냇함 — 이달의 함 (boxfill.js)

   배냇함은 '담는' 곳인데, 담을수록 무엇이 차오르는지가 안 보였다.
   맨 위에 숫자 세 개(함께한 날 · 처음 해낸 일 · 받은 편지)만 있었다.

   한 달을 칸이 그 달 날수만큼 있는 함 하나로 본다. 그날 우리가 하나라도 담으면 그 칸이 찬다.
     · 사진이 있으면 그 사진이 칸을 덮는다 — 한 달이 지나면 그대로 사진 달력이 된다
     · 사진이 없으면 담은 것의 모양 — 처음 해낸 일(별) · 소리(물결) · 문답(말풍선 둘) · 한 줄(종이) · 키와 몸무게(자)
   달이 끝나면 그 달을 배냇함에 담아 선반에 올린다. 열두 개가 모이면 첫 해 책이 된다.

   ⚠️ 아기 시점 편지(그날의 편지)는 세지 않는다. 기록만 해도 저절로 오는 거라
      세면 아무것도 안 담아도 칸이 다 찬다. '우리가 담은 날' 만 센다.
   ⚠️ 칸 그림은 이모지가 아니라 작은 SVG 다. 칸이 작아서 이모지는 뭉개지고 앱 아이콘처럼 보인다.
   ⚠️ 새로 찬 칸만 한 번 '툭' 떨어지는 움직임을 준다 (본 칸은 tosil_bf_seen 에 적어 둔다).

   memorybox.js 의 renderMemoryBox 가 머리 바로 아래에 부른다 — window.renderBoxFill()
   ============================================================ */
(function () {
    'use strict';

    var SEEN = 'tosil_bf_seen';
    var WEEK = ['일', '월', '화', '수', '목', '금', '토'];

    function pad(n) { return String(n).padStart(2, '0'); }
    function keyOf(y, m, d) { return y + '-' + pad(m) + '-' + pad(d); }
    function esc(s) {
        return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    function readJSON(k, f) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? f : v; } catch (e) { return f; } }
    function setOf(fn) {
        var s = {};
        try { if (typeof window[fn] === 'function') (window[fn]() || []).forEach(function (k) { s[k] = 1; }); } catch (e) {}
        return s;
    }
    function dateKey(v) {          // 'YYYY-MM-DD…' 또는 시각(숫자 · 글)
        if (!v) return '';
        if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
        var t = (typeof v === 'number') ? v : Date.parse(v);
        if (!t || isNaN(t)) return '';
        var d = new Date(t);
        return keyOf(d.getFullYear(), d.getMonth() + 1, d.getDate());
    }
    function birth() {
        var s = localStorage.getItem('tosil_startDate');
        if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
        var p = s.split('-');
        return new Date(+p[0], +p[1] - 1, +p[2]);
    }
    function babyName() { return localStorage.getItem('tosil_babyName') || '우리 아기'; }
    /* 이름 + 조사 — 서준 → '서준이가' · '서준이의' (앱 전체와 같은 셈, data.js babyCall) */
    function callName(j) {
        try { if (typeof window.babyCall === 'function') return window.babyCall(j || ''); } catch (e) {}
        var n = babyName(), c = n.charCodeAt(n.length - 1);
        var jong = c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0;
        return n + (jong && n !== '우리 아기' ? '이' : '') + (j || '');
    }

    /* ---------- 그날 우리가 담은 것 ---------- */
    function collect() {
        var c = {
            photos: setOf('photoDays'), voices: setOf('voiceDays'), notes: setOf('noteDays'), qa: setOf('diaryDays'),
            firsts: {}, growth: {}, replies: {}
        };
        var ms = readJSON('tosil_milestones', []);
        if (Array.isArray(ms)) ms.forEach(function (a) { var k = a && typeof a === 'object' ? dateKey(a.date) : ''; if (k) c.firsts[k] = 1; });
        var md = readJSON('tosil_milestone_dates', {}) || {};
        Object.keys(md).forEach(function (id) { var k = dateKey(Number(md[id])); if (k) c.firsts[k] = 1; });
        var gr = readJSON('tosil_growth_records', []);
        if (Array.isArray(gr)) gr.forEach(function (g) { if (g && g.date && (g.height || g.weight)) { var k = dateKey(g.date); if (k) c.growth[k] = 1; } });
        var rp = readJSON('tosil_replies', {}) || {};
        Object.keys(rp).forEach(function (k) { var r = rp[k]; if (r && ((r.mom && r.mom.text) || (r.dad && r.dad.text))) c.replies[k] = 1; });
        return c;
    }
    function thumb(key) {
        var list = [];
        try { list = window.getDayPhotos(key) || []; } catch (e) {}
        if (!list.length) return '';
        var p = list.filter(function (x) { return x && !x.msId; })[0] || list[0];
        try { return (typeof window.photoThumb === 'function') ? (window.photoThumb(p) || '') : (p.url || ''); } catch (e) { return ''; }
    }
    function itemOf(c, key) {
        if (c.photos[key]) { var src = thumb(key); if (src) return { kind: 'photo', src: src }; }
        if (c.firsts[key]) return { kind: 'first' };
        if (c.voices[key]) return { kind: 'voice' };
        if (c.qa[key]) return { kind: 'qa' };
        if (c.notes[key] || c.replies[key]) return { kind: 'note' };
        if (c.growth[key]) return { kind: 'growth' };
        if (c.photos[key]) return { kind: 'photo', src: '' };
        return null;
    }
    function monthCount(c, y, m) {
        var n = 0, last = new Date(y, m, 0).getDate();
        for (var d = 1; d <= last; d++) if (itemOf(c, keyOf(y, m, d))) n++;
        return n;
    }
    // 오늘까지(오늘이 비었으면 어제까지) 하루도 안 빠지고 담은 날 수
    function streak(c, today) {
        var n = 0, t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        if (!itemOf(c, keyOf(t.getFullYear(), t.getMonth() + 1, t.getDate()))) t.setDate(t.getDate() - 1);
        for (var i = 0; i < 400; i++) {
            if (!itemOf(c, keyOf(t.getFullYear(), t.getMonth() + 1, t.getDate()))) break;
            n++; t.setDate(t.getDate() - 1);
        }
        return n;
    }

    /* ---------- 칸 그림 (SVG) ---------- */
    var ICON = {
        first: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3.2l1.9 4.1 4.4.5-3.3 3 .9 4.4L10 13l-3.9 2.2.9-4.4-3.3-3 4.4-.5z" fill="currentColor"/></svg>',
        voice: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3.6" y="7.5" width="2.4" height="5" rx="1.2" fill="currentColor"/><rect x="8.8" y="4" width="2.4" height="12" rx="1.2" fill="currentColor"/><rect x="14" y="6.2" width="2.4" height="7.6" rx="1.2" fill="currentColor"/></svg>',
        qa: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3.5 5.5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3.4a2 2 0 0 1-2 2H8.2L5.6 12.8v-1.9a2 2 0 0 1-2.1-2z" fill="currentColor" opacity=".55"/><path d="M8.5 10.4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2.6a2 2 0 0 1-2 2h-.3v1.8l-2.4-1.8h-1.3a2 2 0 0 1-2-2z" fill="currentColor"/></svg>',
        note: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="4.6" y="3.4" width="10.8" height="13.2" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M7.4 8h5.2M7.4 10.8h5.2M7.4 13.6h3.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
        growth: '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="7.4" y="2.8" width="5.2" height="14.4" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M7.6 6.2h2.4M7.6 9h1.6M7.6 11.8h2.4M7.6 14.6h1.6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>'
    };

    /* ---------- 배냇함 그림 ----------
       상자는 브랜드 그림(box.webp)을 그대로 쓴다. 코드로 그린 상자는 아무리 다듬어도 '그냥 상자' 였다 —
       배냇저고리 · 쪽쪽이 · 양말 · 편지가 담기고 나무 뚜껑이 기대 선 이 그림이 배냇함이다.
       ⚠️ 그림이 300×234 라 180px 넘게 키우면 흐려진다.
       그 달 첫 사진은 작은 사진 한 장으로 왼쪽 금색 띠 위에 테이프로 붙인다 — 그림 좌표 (64, 150).
       ⚠️ 처음엔 동그란 봉인 스티커였는데 무엇인지 한눈에 안 읽혔다. 선반 크기(17px)에선 사진인지도 안 보였다.
          흰 테두리 + 테이프 = 누가 봐도 '붙여 둔 사진'. 사진이 없는 달은 같은 쪽지에 달 숫자. */
    var BOX_IMG = './box.webp';
    var SEAL_IMG = [64, 150];
    var SEAL_AT = [r1(SEAL_IMG[0] / 300 * 100), r1(SEAL_IMG[1] / 234 * 100)];          // % (그림 기준)
    function r1(n) { return Math.round(n * 10) / 10; }
    function sealHTML(cls, src, label) {
        return '<div class="' + cls + '" style="left:' + SEAL_AT[0] + '%;top:' + SEAL_AT[1] + '%">' +
            (src ? '<i style="background-image:url(\'' + esc(src) + '\')"></i>' : '<i>' + esc(label) + '</i>') + '</div>';
    }
    var KIND_BG = { first: '#F8E7BE', voice: '#E4E1F8', qa: '#F7DFE2', note: '#F1E6D2', growth: '#DDEEE3' };
    var KIND_FG = { first: '#C29233', voice: '#7F77DD', qa: '#C98089', note: '#A28457', growth: '#6E9C80' };

    /* ---------- 선반 위 지난 함 ---------- */
    function shelf(c, b, today) {
        var out = [], y = today.getFullYear(), m = today.getMonth() + 1;
        for (var i = 0; i < 36; i++) {
            m--; if (m < 1) { m = 12; y--; }
            if (y < b.getFullYear() || (y === b.getFullYear() && m < b.getMonth() + 1)) break;
            var n = monthCount(c, y, m), pic = '';
            for (var d = 1; d <= new Date(y, m, 0).getDate() && !pic; d++) { var k = keyOf(y, m, d); if (c.photos[k]) pic = thumb(k); }
            out.push({ y: y, m: m, n: n, pic: pic });
        }
        return out;
    }

    function css() {
        if (document.getElementById('bf-css')) return;
        var st = document.createElement('style');
        st.id = 'bf-css';
        st.textContent =
            '.bf-tray{position:relative;background:linear-gradient(180deg,#F5ECDD 0%,#EFE2CC 100%);border-radius:24px;padding:16px 14px 14px;margin:0 0 14px;' +
                'box-shadow:inset 0 1px 0 rgba(255,255,255,.75),0 8px 22px rgba(120,90,50,.10);}' +
            '.bf-head{display:flex;align-items:center;gap:10px;margin:0 2px 12px;}' +
            '.bf-ico{width:34px;height:auto;flex-shrink:0;filter:drop-shadow(0 2px 3px rgba(120,90,50,.18));}' +
            '.bf-title{font-family:var(--serif, serif);font-size:17px;font-weight:700;color:#4A3B2C;letter-spacing:-.3px;}' +
            '.bf-sub{font-size:11.5px;font-weight:700;color:#9A8670;margin-top:2px;}' +
            '.bf-count{margin-left:auto;text-align:right;line-height:1;}' +
            '.bf-count b{font-family:var(--serif, serif);font-size:26px;font-weight:700;color:#B98A2E;}' +
            '.bf-count span{font-size:12px;font-weight:800;color:#B5A089;margin-left:2px;}' +
            '.bf-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;background:#E5D3B6;padding:8px;border-radius:17px;' +
                'box-shadow:inset 0 2px 5px rgba(110,80,40,.20),inset 0 -1px 0 rgba(255,255,255,.5);}' +
            '.bf-c{position:relative;aspect-ratio:1/1;border-radius:9px;background:#FBF7F0;overflow:hidden;display:flex;align-items:center;justify-content:center;' +
                'box-shadow:inset 0 1px 2px rgba(110,80,40,.18);-webkit-tap-highlight-color:transparent;}' +
            '.bf-c svg{width:52%;height:52%;}' +
            '.bf-n{position:absolute;left:5px;top:3px;font-size:9px;font-weight:800;color:rgba(120,95,70,.42);line-height:1;}' +
            '.bf-none{background:transparent;box-shadow:none;}' +
            '.bf-none::after{content:"";width:4px;height:4px;border-radius:50%;background:rgba(150,120,85,.22);}' +
            '.bf-future{background:rgba(251,247,240,.42);box-shadow:none;}' +
            '.bf-future .bf-n{color:rgba(120,95,70,.28);}' +
            '.bf-on{cursor:pointer;box-shadow:0 1px 2px rgba(110,80,40,.16);}' +
            '.bf-photo{background-size:cover;background-position:center;}' +
            '.bf-photo .bf-n{color:#FFF;text-shadow:0 1px 2px rgba(0,0,0,.45);}' +
            '.bf-k-first{background:#FBF1DA;color:#B98A2E;}' +
            '.bf-k-voice{background:#EEEDFB;color:#7F77DD;}' +
            '.bf-k-qa{background:#FBEDEE;color:#C98089;}' +
            '.bf-k-note{background:#F5EEE2;color:#A28457;}' +
            '.bf-k-growth{background:#E9F3EC;color:#6E9C80;}' +
            '.bf-today{cursor:pointer;background:#FFFDF8;box-shadow:inset 0 0 0 1.5px #C9A253;}' +
            '.bf-today .bf-plus{font-size:17px;font-weight:600;color:#B98A2E;line-height:1;margin-top:3px;}' +
            '.bf-today .bf-n{color:#B98A2E;}' +
            '.bf-on.bf-is-today{box-shadow:0 0 0 2px #B98A2E;}' +
            '.bf-foot{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:12px 4px 0;font-size:12px;font-weight:700;color:#8C7860;}' +
            '.bf-foot b{color:#B98A2E;font-weight:800;}' +
            '.bf-shelf-t{display:flex;justify-content:space-between;align-items:baseline;margin:16px 4px 9px;font-size:11.5px;font-weight:800;color:#9A8670;letter-spacing:.2px;}' +
            /* 선반 — 나무 판 위에 지난 달 배냇함이 줄지어 선다. 판은 끝까지 이어져 '앞으로 올라올 자리' 가 보인다 */
            '.bf-shelf{display:flex;overflow-x:auto;padding:4px 0 2px;-webkit-overflow-scrolling:touch;scrollbar-width:none;}' +
            '.bf-shelf::-webkit-scrollbar{display:none;}' +
            '.bf-mini{flex-shrink:0;width:68px;text-align:center;cursor:pointer;-webkit-tap-highlight-color:transparent;}' +
            '.bf-mart{position:relative;width:58px;height:45px;margin:0 auto;}' +
            '.bf-mart img{display:block;width:58px;height:45px;}' +
            '.bf-seal{position:absolute;width:16px;height:19px;box-sizing:border-box;padding:1.5px 1.5px 4.5px;background:#FFF;border-radius:1px;' +
                'box-shadow:0 1px 2px rgba(40,25,10,.32);transform:translate(-50%,-50%) rotate(-8deg);}' +
            '.bf-seal i{display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:#EFE3CF center/cover;font-style:normal;' +
                'font-family:var(--serif, serif);font-size:7.5px;font-weight:800;color:#A28457;line-height:1;}' +
            '.bf-seal::before{content:"";position:absolute;left:50%;top:-2.5px;width:10px;height:4.5px;margin-left:-5px;background:rgba(232,208,150,.88);transform:rotate(5deg);}' +
            '.bf-addp{position:absolute;left:50%;top:48%;width:24px;height:24px;margin:-12px 0 0 -12px;border-radius:50%;background:#FFFDF8;border:1.5px dashed #C9A253;' +
                'box-sizing:border-box;color:#B98A2E;font-size:16px;font-weight:700;line-height:1;display:flex;align-items:center;justify-content:center;}' +
            '.bf-mini-old .bf-mart img{opacity:.4;}' +
            '.bf-plank{height:6px;margin:-3px 0 8px;background:linear-gradient(180deg,#ECD5A9,#DCBC86);border-top:1px solid #CDAA74;border-bottom:1.5px solid #BD9660;}' +
            '.bf-mini:first-child .bf-plank{border-left:1.5px solid #BD9660;border-radius:3px 0 0 3px;margin-left:3px;}' +
            '.bf-shelf-end{flex:1 0 16px;}' +
            '.bf-shelf-end .bf-plank{margin-top:42px;margin-right:3px;border-right:1.5px solid #BD9660;border-radius:0 3px 3px 0;}' +
            '.bf-mini-0 .bf-mart{opacity:.55;}' +
            '.bf-mini-0 .bf-mn{color:#C2B29F;}' +
            '.bf-ml{font-size:11px;font-weight:800;color:#6E5A45;white-space:nowrap;}' +
            '.bf-mn{font-size:10px;font-weight:700;color:#A8957F;margin-top:1px;}' +
            '.bf-goal{margin:12px 4px 0;font-size:11.5px;font-weight:700;color:#9A8670;line-height:1.6;}' +
            '.bf-dots{display:flex;gap:4px;margin-top:6px;}' +
            '.bf-dots i{flex:1;height:4px;border-radius:2px;background:rgba(185,138,46,.18);}' +
            '.bf-dots i.on{background:#C9A253;}' +
            '.bf-in{animation:bfIn .38s ease both;}' +
            '@keyframes bfIn{from{opacity:0;transform:scale(.86);}to{opacity:1;transform:none;}}' +
            '.bf-new{animation:bfDrop .75s cubic-bezier(.2,.9,.3,1.25) both;}' +
            '@keyframes bfDrop{0%{opacity:0;transform:translateY(-16px) scale(1.22);}55%{opacity:1;}100%{transform:none;}}' +
            '.bf-new::after{content:"";position:absolute;left:-2px;top:-2px;right:-2px;bottom:-2px;border-radius:10px;box-shadow:0 0 0 2px rgba(201,162,83,.9);animation:bfRing 1.4s ease .35s both;}' +
            '@keyframes bfRing{0%{opacity:1;}100%{opacity:0;transform:scale(1.25);}}' +
            '.mb-flash{animation:mbFlash 1.6s ease;}' +
            '@keyframes mbFlash{0%,100%{box-shadow:0 4px 16px rgba(0,0,0,.03);}30%{box-shadow:0 0 0 3px rgba(201,162,83,.55),0 8px 22px rgba(185,138,46,.18);}}' +
            '@media (prefers-reduced-motion: reduce){.bf-in,.bf-new,.bf-new::after,.mb-flash{animation:none;}}';
        document.head.appendChild(st);
    }

    var firstPaint = true;

    window.renderBoxFill = function () {
        var b = birth();
        var today = new Date();
        if (!b || b > today) return '';           // 태어나기 전엔 열 달 기능이 따로 있다
        css();

        var c = collect();
        var y = today.getFullYear(), m = today.getMonth() + 1, last = new Date(y, m, 0).getDate();
        var tKey = keyOf(y, m, today.getDate());
        var bornHere = (b.getFullYear() === y && b.getMonth() + 1 === m);

        /* 새로 찬 칸 — 지난번에 본 것과 비교 */
        var seen = readJSON(SEEN, null);
        var seenOk = seen && seen.ym === y + '-' + m && Array.isArray(seen.keys);
        var seenSet = {};
        if (seenOk) seen.keys.forEach(function (k) { seenSet[k] = 1; });
        var filledKeys = [];

        var cells = '', n = 0, i = 0;
        for (var d = 1; d <= last; d++, i++) {
            var key = keyOf(y, m, d);
            var delay = firstPaint ? ' style="animation-delay:' + (i * 14) + 'ms"' : '';
            var anim = firstPaint ? ' bf-in' : '';
            if (bornHere && d < b.getDate()) { cells += '<div class="bf-c bf-none"></div>'; continue; }
            if (d > today.getDate()) { cells += '<div class="bf-c bf-future"><span class="bf-n">' + d + '</span></div>'; continue; }
            var it = itemOf(c, key), isToday = (key === tKey);
            if (!it) {
                cells += isToday
                    ? '<div class="bf-c bf-today' + anim + '"' + delay + ' onclick="window.bfFillToday()" role="button" aria-label="오늘 칸 채우기">' +
                          '<span class="bf-n">오늘</span><span class="bf-plus">+</span></div>'
                    : '<div class="bf-c' + anim + '"' + delay + '><span class="bf-n">' + d + '</span></div>';
                continue;
            }
            n++; filledKeys.push(key);
            var fresh = seenOk && !seenSet[key];
            var cls = 'bf-c bf-on' + (isToday ? ' bf-is-today' : '') + (fresh ? ' bf-new' : anim);
            var go = ' onclick="window.mbGoDay && window.mbGoDay(\'' + key + '\')" role="button" aria-label="' + m + '월 ' + d + '일 보기"';
            if (it.kind === 'photo' && it.src) {
                cells += '<div class="' + cls + ' bf-photo"' + go + ' style="background-image:url(\'' + esc(it.src) + '\');' +
                         (firstPaint && !fresh ? 'animation-delay:' + (i * 14) + 'ms;' : '') + '"><span class="bf-n">' + d + '</span></div>';
            } else {
                var k = it.kind === 'photo' ? 'note' : it.kind;
                cells += '<div class="' + cls + ' bf-k-' + k + '"' + (fresh ? '' : delay) + go + '>' + ICON[k] + '<span class="bf-n">' + d + '</span></div>';
            }
        }

        // 본 칸 적어 두기 (다음에 그릴 때 '새 칸' 판단). 움직임이 끝난 뒤에.
        setTimeout(function () {
            try { localStorage.setItem(SEEN, JSON.stringify({ ym: y + '-' + m, keys: filledKeys })); } catch (e) {}
        }, 1600);
        firstPaint = false;

        var days = bornHere ? (today.getDate() - b.getDate() + 1) : today.getDate();
        // 배냇함 달 서랍과 같은 이름 — 그 달에 N개월이 되면 'N개월 되는 달'
        var monthsOld = (y - b.getFullYear()) * 12 + (m - 1 - b.getMonth());
        var sub = (monthsOld <= 0 ? '태어난 달' : monthsOld + '개월 되는 달') + ' · ' + days + '일 중 ' + n + '일 담았어요';

        var todayOn = !!itemOf(c, tKey), st = streak(c, today);
        var foot = todayOn
            ? (st >= 2 ? '<span><b>' + st + '일째</b> 이어서 담고 있어요</span>' : '<span>오늘 칸도 채웠어요</span>')
            : '<span>오늘 하나 담으면 <b>' + (n + 1) + '칸</b>이 돼요</span>' + (st >= 2 ? '<span>' + st + '일째 이어 담는 중</span>' : '');

        /* 선반 — 지난 달 함들. 열두 달이 모이면 첫 해 책 */
        var past = shelf(c, b, today);
        var boxNo = past.length + 1;              // 지금 함이 몇 번째인지 (태어난 달이 첫 번째)
        /* ⚠️ 앱을 6개월째에 깐 엄마에게 '3월 비었어요 · 4월 비었어요 …' 를 줄줄이 보여 주면 시작부터 진 기분이 든다.
              처음 담은 달보다 앞의 달들은 상자 하나로 묶고 '지난 사진으로 채우기' 로 부른다 (그 달 기념일 카드에 + 사진이 있다).
              처음 담은 달부터는 빈 달도 그대로 보여 준다 — 다만 '비었어요' 대신 0칸으로, 흐리게. */
        var lastAt = -1;
        past.forEach(function (p, idx) { if (p.n) lastAt = idx; });
        var shown = past.slice(0, lastAt + 1), older = past.slice(lastAt + 1);
        function ymLabel(p) { return (p.y !== y ? String(p.y).slice(2) + '년 ' : '') + p.m + '월'; }
        var shelfHTML = '';
        if (past.length) {
            var boxImg = '<img src="' + BOX_IMG + '" alt="" width="58" height="45" decoding="async">';
            var minis = shown.map(function (p) {
                var ym = p.y + '-' + p.m;
                return '<div class="bf-mini' + (p.n ? '' : ' bf-mini-0') + '" onclick="window.mbGoMonth && window.mbGoMonth(\'' + ym + '\')" role="button" aria-label="' + p.m + '월의 함 보기">' +
                    '<div class="bf-mart">' + boxImg + sealHTML('bf-seal', p.pic, p.m) + '</div><div class="bf-plank"></div>' +
                    '<div class="bf-ml">' + ymLabel(p) + '</div>' +
                    '<div class="bf-mn">' + p.n + '칸</div></div>';
            }).join('');
            if (older.length) {
                var o1 = older[older.length - 1], o2 = older[0];      // 가장 옛날 ~ 가장 최근
                var span = older.length === 1 ? ymLabel(o2)
                         : (o1.y === o2.y ? (o1.y !== y ? String(o1.y).slice(2) + '년 ' : '') + o1.m + '~' + o2.m + '월'
                                          : String(o1.y).slice(2) + '년 ' + o1.m + '월~');
                minis += '<div class="bf-mini bf-mini-old" onclick="window.mbGoMonth && window.mbGoMonth(\'' + o2.y + '-' + o2.m + '\')" role="button" aria-label="' + esc(span) + ' 지난 사진으로 채우기">' +
                    '<div class="bf-mart">' + boxImg + '<span class="bf-addp">+</span></div><div class="bf-plank"></div>' +
                    '<div class="bf-ml">' + esc(span) + '</div><div class="bf-mn">지난 사진</div></div>';
            }
            shelfHTML = '<div class="bf-shelf-t"><span>모은 함</span><span>' + (shown.length ? shown.length + '개' : '') + '</span></div>' +
                '<div class="bf-shelf">' + minis + '<div class="bf-shelf-end"><div class="bf-plank"></div></div></div>';
        }
        /* 열두 달이 한 해 책 — 돌이 지나면 두 번째 해 함을 센다 */
        var yearIdx = Math.floor((boxNo - 1) / 12), inYear = (boxNo - 1) % 12 + 1;
        var yName = ['첫 해', '두 번째 해', '세 번째 해', '네 번째 해'][yearIdx] || (yearIdx + 1) + '번째 해';
        var dots = '';
        for (var g = 1; g <= 12; g++) dots += '<i' + (g < inYear ? ' class="on"' : (g === inYear ? ' class="on" style="opacity:.55"' : '')) + '></i>';
        var goal = '<div class="bf-goal">열두 달의 함이 모이면 ' + esc(callName('의')) + ' ' + yName + ' 책이 돼요 · 지금 ' + inYear + '번째 함' +
                   '<div class="bf-dots">' + dots + '</div></div>';

        return '<div class="bf-tray" id="bf">' +
            '<div class="bf-head">' +
                '<img class="bf-ico" src="./box.webp" alt="" width="34" height="27">' +
                '<div><div class="bf-title">' + m + '월의 함</div><div class="bf-sub">' + esc(sub) + '</div></div>' +
                '<div class="bf-count"><b>' + n + '</b><span>/' + last + '</span></div>' +
            '</div>' +
            '<div class="bf-grid">' + cells + '</div>' +
            '<div class="bf-foot">' + foot + '</div>' +
            shelfHTML + goal +
        '</div>';
    };

    /* ---------- 숫자만 — 홈 카드(home.js)와 달을 담는 장면이 쓴다 ----------
       y, m 을 안 주면 이번 달. days[i].st = none(태어나기 전) · future · empty · today(비어 있는 오늘) · on */
    window.boxFillStats = function (y, m) {
        var b = birth(), today = new Date();
        if (!b || b > today) return null;
        var c = collect();
        y = y || today.getFullYear(); m = m || (today.getMonth() + 1);
        var last = new Date(y, m, 0).getDate();
        var isCur = (y === today.getFullYear() && m === today.getMonth() + 1);
        var upto = isCur ? today.getDate() : last;
        var bornHere = (b.getFullYear() === y && b.getMonth() + 1 === m);
        var days = [], n = 0, pics = 0, firstPic = '';
        for (var d = 1; d <= last; d++) {
            var key = keyOf(y, m, d), st, it = null;
            if (bornHere && d < b.getDate()) st = 'none';
            else if (d > upto) st = 'future';
            else {
                it = itemOf(c, key);
                st = it ? 'on' : ((isCur && d === upto) ? 'today' : 'empty');
                if (it) { n++; if (it.kind === 'photo' && it.src) { pics++; if (!firstPic) firstPic = it.src; } }
            }
            days.push({ d: d, key: key, st: st, kind: it ? it.kind : '', src: it && it.src ? it.src : '' });
        }
        var monthsOld = (y - b.getFullYear()) * 12 + (m - 1 - b.getMonth());
        return {
            y: y, m: m, last: last, upto: upto, n: n, pics: pics, firstPic: firstPic, days: days,
            todayOn: isCur ? !!itemOf(c, keyOf(y, m, upto)) : null,
            streak: isCur ? streak(c, today) : 0,
            monthsOld: monthsOld, boxNo: monthsOld + 1
        };
    };

    /* ---------- 달이 바뀌면 지난달을 배냇함에 담는다 ----------
       매달 1일 무렵 처음 열 때 한 번. 배냇함 그림 위에 그 달 사진이 떠 있다가 하나씩 함 속으로 들어가고 (톡 · 톡 · 톡),
       왼쪽 금색 띠에 그 달 첫 사진이 봉인 스티커로 붙는다. 그 함은 선반에 올라간다.
       ⚠️ 빈 달은 장면 없이 지나간다 (빈 함을 보여 주는 장면은 슬프기만 하다).
       ⚠️ 첫 주(1 ~ 7일)에만. 몇 달 만에 열었거나 이 기능이 처음 들어온 날이 달 중간이면 조용히 넘긴다.
       ⚠️ 다른 창(처음 시작 · 역할 고르기 · 안내)이 떠 있으면 기다렸다가 띄운다. 할머니 · 시터 화면엔 안 띄운다. */
    var CLOSED = 'tosil_bf_closed';
    function yearName(boxNo) {
        var i = Math.floor((boxNo - 1) / 12);
        return ['첫 해', '두 번째 해', '세 번째 해', '네 번째 해'][i] || (i + 1) + '번째 해';
    }
    /* 다른 창이 화면 한가운데를 덮고 있나.
       ⚠️ 글쓰기 창 · 맘수다 글 화면처럼 늘 깔려 있지만 화면 밖(아래 · 오른쪽)으로 밀어 둔 창이 있다.
          크기만 보면 늘 '바쁨' 이라 장면이 영영 안 떴다 — 화면 한가운데를 덮는지로 본다. */
    function busy() {
        var W = window.innerWidth, H = window.innerHeight, cx = W / 2, cy = H / 2, els = document.querySelectorAll('body *');
        for (var i = 0; i < els.length; i++) {
            var e = els[i];
            if (e.id === 'bf-close') continue;
            var s = window.getComputedStyle(e);
            if (s.position !== 'fixed' || s.display === 'none' || s.visibility === 'hidden' || s.pointerEvents === 'none' || Number(s.opacity) < 0.1) continue;
            var r = e.getBoundingClientRect();
            if (r.width >= W * 0.6 && r.height >= H * 0.5 && r.left <= cx && r.right >= cx && r.top <= cy && r.bottom >= cy) return true;
        }
        return false;
    }
    function closeCss() {
        if (document.getElementById('bf-close-css')) return;
        var st = document.createElement('style');
        st.id = 'bf-close-css';
        st.textContent =
            '#bf-close{position:fixed;left:0;top:0;right:0;bottom:0;z-index:9600;background:rgba(58,44,30,.46);display:flex;align-items:center;justify-content:center;padding:24px;' +
                'opacity:0;transition:opacity .35s ease;-webkit-tap-highlight-color:transparent;}' +
            '#bf-close.on{opacity:1;}' +
            '.bfc-card{width:100%;max-width:340px;background:#FCF8F1;border-radius:26px;padding:26px 22px 20px;text-align:center;' +
                'box-shadow:0 20px 50px rgba(40,28,16,.28);transform:translateY(14px);transition:transform .45s cubic-bezier(.2,.9,.3,1.1);}' +
            '#bf-close.on .bfc-card{transform:none;}' +
            /* 배냇함 그림 위에 그 달 사진이 떠 있다가 → 하나씩 함 속으로 (그때마다 함이 톡) → 왼쪽 띠에 사진 봉인 → 반짝 */
            '.bfc-stage{position:relative;width:240px;height:184px;margin:0 auto 14px;}' +
            '.bfc-box{position:absolute;left:30px;bottom:0;width:180px;height:140.4px;transform-origin:50% 95%;}' +
            '.bfc-box img{display:block;width:180px;height:140.4px;}' +
            '.bfc-pols{position:absolute;left:0;top:0;width:240px;height:184px;}' +
            '.bfc-pol{position:absolute;width:58px;height:68px;margin:-34px 0 0 -29px;}' +
            '.bfc-pin{width:100%;height:100%;opacity:0;}' +
            '.bfc-card2{width:100%;height:100%;box-sizing:border-box;padding:4px 4px 14px;background:#FFF;border-radius:3px;box-shadow:0 2px 6px rgba(60,40,20,.22);}' +
            '.bfc-card2 i{display:flex;align-items:center;justify-content:center;width:100%;height:100%;border-radius:1px;background:#F1E6D2 center/cover;}' +
            '.bfc-card2 i svg{width:56%;height:56%;}' +
            '.bfc-seal{position:absolute;width:34px;height:40px;box-sizing:border-box;padding:3px 3px 10px;background:#FFF;border-radius:2px;' +
                'box-shadow:0 2px 6px rgba(40,25,10,.3);transform:translate(-50%,-50%) scale(0) rotate(-8deg);}' +
            '.bfc-seal i{display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:#EFE3CF center/cover;font-style:normal;' +
                'font-family:var(--serif, serif);font-size:10.5px;font-weight:700;color:#A28457;line-height:1;}' +
            '.bfc-seal::before{content:"";position:absolute;left:50%;top:-4px;width:20px;height:8px;margin-left:-10px;background:rgba(232,208,150,.88);transform:rotate(5deg);}' +
            '.bfc-spark{position:absolute;width:18px;height:18px;margin:-9px 0 0 -9px;opacity:0;color:#D3A541;}' +
            '.bfc-spark svg{display:block;width:100%;height:100%;}' +
            '#bf-close.play .bfc-pin{animation:bfcIn .32s ease-out calc(.25s + var(--k, 0) * .08s) forwards;}' +
            '#bf-close.play .bfc-pol{animation:bfcDrop .5s cubic-bezier(.5,0,.9,.55) calc(.8s + var(--k, 0) * .28s) forwards;}' +
            '#bf-close.play .bfc-box{animation:bfcBump .28s ease-out 1.28s;animation-iteration-count:var(--n, 1);}' +
            '#bf-close.play .bfc-seal{animation:bfcSeal .46s cubic-bezier(.2,.9,.3,1.35) var(--ts, 2s) forwards;}' +
            '#bf-close.play .bfc-spark{animation:bfcSpark .7s ease-out calc(var(--ts, 2s) + .3s + var(--k, 0) * .1s) forwards;}' +
            '@keyframes bfcIn{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:none;}}' +
            '@keyframes bfcDrop{0%{transform:none;}18%{transform:translateY(-7px);}100%{transform:translate(var(--dx),var(--dy)) scale(.6);}}' +
            '@keyframes bfcBump{0%,100%{transform:none;}35%{transform:scale(1.035,.955);}}' +
            '@keyframes bfcSeal{0%{transform:translate(-50%,-50%) scale(0) rotate(-30deg);}100%{transform:translate(-50%,-50%) scale(1) rotate(-8deg);}}' +
            '@keyframes bfcSpark{0%{opacity:0;transform:scale(.2) rotate(0);}35%{opacity:1;transform:scale(1) rotate(25deg);}100%{opacity:0;transform:scale(.6) rotate(60deg);}}' +
            '.bfc-txt{opacity:0;transform:translateY(6px);transition:opacity .4s ease,transform .4s ease;}' +
            '#bf-close.done .bfc-txt{opacity:1;transform:none;}' +
            '.bfc-t{font-family:var(--serif, serif);font-size:20px;font-weight:700;color:#3F3226;letter-spacing:-.4px;margin-bottom:8px;}' +
            '.bfc-s{font-size:13px;font-weight:600;color:#8C7860;line-height:1.7;}' +
            '.bfc-s b{color:#B98A2E;font-weight:800;}' +
            '.bfc-dots{display:flex;gap:4px;margin:16px 6px 4px;}' +
            '.bfc-dots i{flex:1;height:4px;border-radius:2px;background:rgba(185,138,46,.18);}' +
            '.bfc-dots i.on{background:#C9A253;}' +
            '.bfc-g{font-size:11.5px;font-weight:700;color:#A8957F;margin-top:6px;}' +
            '.bfc-ok{display:block;width:100%;margin-top:20px;padding:15px 0;border:0;border-radius:15px;background:#4A3B2C;color:#FFF;font-size:15px;font-weight:800;cursor:pointer;}' +
            '.bfc-see{display:block;width:100%;margin-top:6px;padding:11px 0;border:0;background:none;color:#9A8670;font-size:13px;font-weight:700;cursor:pointer;}' +
            '#bf-close.leave .bfc-stage{transition:transform .5s cubic-bezier(.5,0,.75,0),opacity .5s ease;transform:translateY(60px) scale(.35);opacity:0;}' +
            '@media (prefers-reduced-motion: reduce){#bf-close .bfc-pols,#bf-close .bfc-spark{display:none;}#bf-close .bfc-box{animation:none!important;}' +
                '#bf-close .bfc-seal{animation:none!important;transform:translate(-50%,-50%) rotate(-8deg)!important;}}';
        document.head.appendChild(st);
    }
    function showClose(s) {
        closeCss();
        var old = document.getElementById('bf-close');
        if (old) old.parentNode.removeChild(old);
        /* 함에 꽂을 사진 셋 — 그 달의 처음 · 가운데 · 마지막 사진. 모자라면 담은 것의 모양(별 · 소리 · 문답 …)으로 */
        var on = s.days.filter(function (d) { return d.st === 'on'; });
        var ph = on.filter(function (d) { return d.kind === 'photo' && d.src; });
        var pics = (ph.length >= 3 ? [ph[0], ph[Math.floor(ph.length / 2)], ph[ph.length - 1]] : ph).map(function (d) { return { src: d.src }; });
        var rest = on.filter(function (d) { return !(d.kind === 'photo' && d.src); });
        ['first', 'voice', 'qa', 'note', 'growth', 'photo'].forEach(function (k) {          // 처음 해낸 일이 먼저
            if (pics.length < 3 && rest.some(function (d) { return d.kind === k; })) pics.push({ kind: k });
        });
        rest.forEach(function (d) { if (pics.length < Math.min(3, on.length)) pics.push({ kind: d.kind }); });   // 한 가지만 담은 달도 두세 장
        /* 사진이 함 속으로 들어가 보이게 — 앞 테두리 선(그림 좌표) 아래는 사진 층에서 잘라 낸다.
           그림은 무대(240×184) 바닥 가운데에 0.6 배 (300×234 → 180×140.4), 왼쪽 위가 (30, 43.6) */
        function st(x, y) { return [r1(30 + x * 0.6), r1(43.6 + y * 0.6)]; }
        var RIM = [[2, 96], [70, 121], [135, 140], [180, 118], [232, 90]];
        var rim = RIM.map(function (q) { return st(q[0], q[1]); });
        var clip = 'polygon(0 0,240px 0,240px ' + rim[4][1] + 'px,' +
            rim.slice().reverse().map(function (q) { return q[0] + 'px ' + q[1] + 'px'; }).join(',') + ',0 ' + rim[0][1] + 'px)';
        var FLOAT = { 1: [[120, 36, -3]], 2: [[92, 38, -8], [150, 38, 8]], 3: [[66, 40, -12], [120, 32, 2], [174, 42, 12]] }[pics.length] || [];
        var DROP = { 1: [100], 2: [84, 114], 3: [72, 96, 120] }[pics.length] || [];
        var cards = pics.map(function (p, k) {
            var f = FLOAT[k], kind = KIND_BG[p.kind] ? p.kind : 'note';
            var face = p.src ? '<i style="background-image:url(\'' + esc(p.src) + '\')"></i>'
                             : '<i style="background:' + KIND_BG[kind] + ';color:' + KIND_FG[kind] + '">' + ICON[kind] + '</i>';
            return '<div class="bfc-pol" style="left:' + f[0] + 'px;top:' + f[1] + 'px;--k:' + k + ';--dx:' + (DROP[k] - f[0]) + 'px;--dy:' + (156 - f[1]) + 'px">' +
                '<div class="bfc-pin"><div class="bfc-card2" style="transform:rotate(' + f[2] + 'deg)">' + face + '</div></div></div>';
        }).join('');
        var ts = r1(1.3 + Math.max(0, pics.length - 1) * 0.28 + 0.2);       // 마지막 사진이 들어간 뒤 봉인
        var STAR = '<svg viewBox="0 0 20 20"><path d="M10 1.5c.5 4.6 3.9 8 8.5 8.5-4.6.5-8 3.9-8.5 8.5-.5-4.6-3.9-8-8.5-8.5 4.6-.5 8-3.9 8.5-8.5z" fill="currentColor"/></svg>';
        var at = st(SEAL_IMG[0], SEAL_IMG[1]);
        var sp = [[-26, -20], [28, -26], [24, 18]].map(function (o, k) {
            return '<i class="bfc-spark" style="--k:' + k + ';left:' + r1(at[0] + o[0]) + 'px;top:' + r1(at[1] + o[1]) + 'px">' + STAR + '</i>';
        }).join('');
        var age = s.monthsOld <= 0 ? '태어난 달' : s.monthsOld + '개월 되던 달';
        var inYear = (s.boxNo - 1) % 12 + 1, left = 12 - inYear, dots = '';
        for (var g = 1; g <= 12; g++) dots += '<i' + (g <= inYear ? ' class="on"' : '') + '></i>';
        var goal = left > 0 ? esc(callName('의')) + ' ' + yearName(s.boxNo) + ' 책까지 함 ' + left + '개 남았어요'
                            : esc(callName('의')) + ' ' + yearName(s.boxNo) + ' 함 열두 개가 다 모였어요';
        var w = document.createElement('div');
        w.id = 'bf-close';
        w.setAttribute('role', 'dialog');
        w.setAttribute('aria-label', s.m + '월을 배냇함에 담았어요');
        w.style.setProperty('--n', String(Math.max(1, pics.length)));
        w.style.setProperty('--ts', ts + 's');
        w.innerHTML =
            '<div class="bfc-card" onclick="event.stopPropagation()">' +
                '<div class="bfc-stage">' +
                    '<div class="bfc-box"><img src="' + BOX_IMG + '" alt="" width="180" height="140">' + sealHTML('bfc-seal', s.firstPic, s.m + '월') + '</div>' +
                    '<div class="bfc-pols" style="-webkit-clip-path:' + clip + ';clip-path:' + clip + '">' + cards + '</div>' + sp +
                '</div>' +
                '<div class="bfc-txt">' +
                    '<div class="bfc-t">' + s.m + '월을 배냇함에 담았어요</div>' +
                    '<div class="bfc-s">' + esc(callName('가')) + ' ' + age + ' · <b>' + s.n + '일</b>이 들어 있어요' + (s.pics ? '<br>그중 사진이 있는 날은 ' + s.pics + '일이에요' : '') + '</div>' +
                    '<div class="bfc-dots">' + dots + '</div>' +
                    '<div class="bfc-g">' + goal + '</div>' +
                    '<button type="button" class="bfc-ok" id="bfc-ok">선반에 올리기</button>' +
                    '<button type="button" class="bfc-see" id="bfc-see">' + s.m + '월 다시 보기</button>' +
                '</div>' +
            '</div>';
        document.body.appendChild(w);
        function leave(after) {
            if (w.__leaving) return; w.__leaving = 1;
            w.classList.add('leave');
            setTimeout(function () { w.classList.remove('on'); }, 380);
            setTimeout(function () { if (w.parentNode) w.parentNode.removeChild(w); if (after) after(); }, 760);
        }
        w.addEventListener('click', function () { leave(); });
        w.querySelector('#bfc-ok').addEventListener('click', function () { leave(); });
        w.querySelector('#bfc-see').addEventListener('click', function () {
            leave(function () {
                if (typeof window.goToMemoryBox === 'function') window.goToMemoryBox();
                setTimeout(function () { if (window.mbGoMonth) window.mbGoMonth(s.y + '-' + s.m); }, 350);
            });
        });
        requestAnimationFrame(function () { w.classList.add('on'); setTimeout(function () { w.classList.add('play'); }, 60); });
        var still = false;
        try { still = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
        setTimeout(function () { w.classList.add('done'); }, still ? 250 : Math.round((ts + 0.45) * 1000));      // 움직임 줄이기면 글도 바로
    }
    var closeTries = 0;
    window.bfMaybeCloseMonth = function (force) {
        var role = localStorage.getItem('user_role');
        if (role !== 'mom' && role !== 'dad') return;
        var b = birth(), today = new Date();
        if (!b || b > today) return;
        var py = today.getFullYear(), pm = today.getMonth();      // 지난달 (getMonth 는 0 부터라 그대로 지난달 번호)
        if (pm === 0) { py--; pm = 12; }
        var ym = py + '-' + pm;
        if (!force && localStorage.getItem(CLOSED) === ym) return;
        function mark() { try { localStorage.setItem(CLOSED, ym); } catch (e) {} }
        if (py < b.getFullYear() || (py === b.getFullYear() && pm < b.getMonth() + 1)) { mark(); return; }
        if (!force && today.getDate() > 7) { mark(); return; }
        var s = window.boxFillStats(py, pm);
        if (!s || !s.n) { mark(); return; }
        if (busy()) {
            if (++closeTries < 8) setTimeout(function () { window.bfMaybeCloseMonth(force); }, 4500);
            return;
        }
        mark();
        showClose(s);
    };
    function kick() { setTimeout(function () { try { window.bfMaybeCloseMonth(); } catch (e) {} }, 2600); }
    if (document.readyState === 'complete') kick(); else window.addEventListener('load', kick);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') { closeTries = 0; kick(); } });

    /* 오늘 칸 — 사진이 칸을 제일 예쁘게 채운다. 소리 · 한 줄은 바로 아래 '오늘 담기' 에 있다 */
    window.bfFillToday = function () {
        var t = new Date();
        var key = keyOf(t.getFullYear(), t.getMonth() + 1, t.getDate());
        if (typeof window.addDayPhoto === 'function') window.addDayPhoto(key);
    };
})();
