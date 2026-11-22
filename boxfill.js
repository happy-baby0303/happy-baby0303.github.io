/* ============================================================
   배냇함 — 이달의 함 (boxfill.js)

   배냇함은 '담는' 곳인데, 담을수록 무엇이 차오르는지가 안 보였다.
   맨 위에 숫자 세 개(함께한 날 · 처음 해낸 일 · 받은 편지)만 있었다.

   한 달을 칸이 그 달 날수만큼 있는 함 하나로 본다. 그날 우리가 하나라도 담으면 그 칸이 찬다.
     · 사진이 있으면 그 사진이 칸을 덮는다 — 한 달이 지나면 그대로 사진 달력이 된다
     · 사진이 없으면 담은 것의 모양 — 처음 해낸 일(별) · 소리(물결) · 문답(말풍선 둘) · 한 줄(종이) · 키와 몸무게(자)
   달이 끝나면 함을 닫아 선반에 올린다. 열두 개가 모이면 첫 해 책이 된다.

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
            '.bf-shelf{display:flex;gap:12px;overflow-x:auto;padding:2px 4px 4px;-webkit-overflow-scrolling:touch;scrollbar-width:none;}' +
            '.bf-shelf::-webkit-scrollbar{display:none;}' +
            '.bf-mini{flex-shrink:0;width:54px;text-align:center;cursor:pointer;}' +
            '.bf-mbox{position:relative;width:50px;height:38px;margin:0 auto 6px;border-radius:6px 6px 7px 7px;background:#FBF6EC;' +
                'box-shadow:0 3px 6px rgba(110,80,40,.16),inset 0 -2px 0 rgba(110,80,40,.08);}' +
            '.bf-mbox::before{content:"";position:absolute;left:-2px;right:-2px;top:-3px;height:10px;border-radius:5px;background:#F3E8D6;box-shadow:0 1px 2px rgba(110,80,40,.18);}' +
            '.bf-mbox::after{content:"";position:absolute;left:50%;top:-3px;bottom:0;width:6px;margin-left:-3px;background:linear-gradient(180deg,#D7B26A,#C49A45);}' +
            '.bf-pic{position:absolute;left:50%;top:13px;width:20px;height:20px;margin-left:-10px;border-radius:50%;border:2px solid #FFF;z-index:1;' +
                'background:#EFE3CF center/cover;box-shadow:0 1px 2px rgba(0,0,0,.18);font-size:9px;font-weight:900;color:#A28457;display:flex;align-items:center;justify-content:center;}' +
            '.bf-mini-0 .bf-mbox{opacity:.55;}' +
            '.bf-mini-0 .bf-mn{color:#C2B29F;}' +
            '.bf-mbox-open{background:transparent;box-shadow:none;border:1.5px dashed #C9A253;display:flex;align-items:center;justify-content:center;' +
                'font-size:18px;font-weight:600;color:#B98A2E;}' +
            '.bf-mbox-open::before,.bf-mbox-open::after{display:none;}' +
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
            '.bf-new::after{content:"";position:absolute;inset:-2px;border-radius:10px;box-shadow:0 0 0 2px rgba(201,162,83,.9);animation:bfRing 1.4s ease .35s both;}' +
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
            var minis = shown.map(function (p) {
                var ym = p.y + '-' + p.m;
                return '<div class="bf-mini' + (p.n ? '' : ' bf-mini-0') + '" onclick="window.mbGoMonth && window.mbGoMonth(\'' + ym + '\')" role="button" aria-label="' + p.m + '월의 함 보기">' +
                    '<div class="bf-mbox"><div class="bf-pic"' + (p.pic ? ' style="background-image:url(\'' + esc(p.pic) + '\')"' : '') + '>' + (p.pic ? '' : p.m) + '</div></div>' +
                    '<div class="bf-ml">' + ymLabel(p) + '</div>' +
                    '<div class="bf-mn">' + p.n + '칸</div></div>';
            }).join('');
            if (older.length) {
                var o1 = older[older.length - 1], o2 = older[0];      // 가장 옛날 ~ 가장 최근
                var span = older.length === 1 ? ymLabel(o2)
                         : (o1.y === o2.y ? (o1.y !== y ? String(o1.y).slice(2) + '년 ' : '') + o1.m + '~' + o2.m + '월'
                                          : String(o1.y).slice(2) + '년 ' + o1.m + '월~');
                minis += '<div class="bf-mini bf-mini-old" onclick="window.mbGoMonth && window.mbGoMonth(\'' + o2.y + '-' + o2.m + '\')" role="button" aria-label="' + esc(span) + ' 지난 사진으로 채우기">' +
                    '<div class="bf-mbox bf-mbox-open">+</div>' +
                    '<div class="bf-ml">' + esc(span) + '</div><div class="bf-mn">지난 사진</div></div>';
            }
            shelfHTML = '<div class="bf-shelf-t"><span>닫은 함</span><span>' + (shown.length ? shown.length + '개' : '') + '</span></div>' +
                '<div class="bf-shelf">' + minis + '</div>';
        }
        /* 열두 달이 한 해 책 — 돌이 지나면 두 번째 해 함을 센다 */
        var yearIdx = Math.floor((boxNo - 1) / 12), inYear = (boxNo - 1) % 12 + 1;
        var yearName = ['첫 해', '두 번째 해', '세 번째 해', '네 번째 해'][yearIdx] || (yearIdx + 1) + '번째 해';
        var dots = '';
        for (var g = 1; g <= 12; g++) dots += '<i' + (g < inYear ? ' class="on"' : (g === inYear ? ' class="on" style="opacity:.55"' : '')) + '></i>';
        var goal = '<div class="bf-goal">열두 달의 함이 모이면 ' + esc(babyName()) + '의 ' + yearName + ' 책이 돼요 · 지금 ' + inYear + '번째 함' +
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

    /* 오늘 칸 — 사진이 칸을 제일 예쁘게 채운다. 소리 · 한 줄은 바로 아래 '오늘 담기' 에 있다 */
    window.bfFillToday = function () {
        var t = new Date();
        var key = keyOf(t.getFullYear(), t.getMonth() + 1, t.getDate());
        if (typeof window.addDayPhoto === 'function') window.addDayPhoto(key);
    };
})();
