/* ============================================================
   배냇함 — 키 · 몸무게 (growth.js)

   ⚠️ 예전 성장 도구
      · '또래 100명 중 어디쯤인지 보기' 를 누른 뒤 '저장하기' 를 한 번 더 눌러야 남았다. 계산만 보고 나가면 기록이 없었다
      · 결과의 반이 성장과 상관없었다 — D+ 큰 숫자(홈과 같다) · '🏅 100명 중 우리 아기 등수' · 카우프 지수 · 원더윅스 표 · 접종 안내
      · 카우프 지수는 나이를 안 보는 기준이라(20 넘으면 빨간 '무거운 편') 통통한 게 보통인 6~9개월 아기에게 겁을 줬다
      · 그래프는 접혀 있었고, 날짜 간격과 상관없이 점을 같은 간격으로 찍었다. 또래 곡선이 없어 잘 크고 있는지 볼 수 없었다
      · 백분위는 어림셈이었다 (growthref.js 머리말)
   지금
      · '기록하기' 한 번으로 남는다. 검진 때 잰 걸 나중에 적을 수 있게 '잰 날' 을 고른다
      · 맨 위에 그래프 — 아기 선 뒤에 WHO 또래 곡선 (3 · 15 · 50 · 85 · 97). 가로는 개월 (이른둥이는 교정 개월)
      · 결과는 백분위와 지난번보다 얼마나 달라졌는지만. 형제가 있으면 같은 나이 때 값을 사실대로
      · 두 폰이 같은 기록을 본다 (growthsync.js)
      · 원더윅스 표는 홈 사진의 '원더윅스' 딱지로 옮겼다 (openLeapSheet)
   index.html: growthref.js · growthsync.js 다음
   ============================================================ */
(function () {
    'use strict';
    var HC = '#7F77DD', WC = '#B98A2E', MONTH = 30.4375;
    var VIEW_KEY = 'tosil_growth_view';
    var FOOT = 'WHO 아동 성장 기준으로 계산한 참고값이에요. 질병관리청 성장도표도 36개월 전까지는 이 기준을 써요. 걱정되면 영유아 검진 때 물어봐 주세요.';
    var showAll = false, lastSaved = '';

    function $(id) { return document.getElementById(id); }
    function num(v) { return Number(v) || 0; }
    function esc(t) {
        return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function toast(m) { if (typeof window.showToast === 'function') window.showToast(m); }
    function pad(n) { return String(n).padStart(2, '0'); }
    function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
    function parse(ds) {
        var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(ds || ''));
        if (!m) return null;
        var d = new Date(+m[1], +m[2] - 1, +m[3]);
        return isNaN(d.getTime()) ? null : d;
    }
    function today() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
    function dayDiff(a, b) { return Math.round((b - a) / 86400000); }
    function dayLabel(ds) {
        var d = parse(ds); if (!d) return String(ds || '');
        var md = (d.getMonth() + 1) + '월 ' + d.getDate() + '일';
        return d.getFullYear() === new Date().getFullYear() ? md : d.getFullYear() + '년 ' + md;
    }
    function fmt(v, unit) {
        v = num(v);
        if (unit === 'kg') { var t = (Math.round(v * 100) / 100).toFixed(2); return t.replace(/0$/, '') + unit; }
        return (Math.round(v * 10) / 10).toFixed(1) + unit;
    }
    function babyName() {
        var n = ''; try { n = String(localStorage.getItem('tosil_babyName') || '').trim(); } catch (e) {}
        return n || '우리 아기';
    }

    /* 생일 — 등록한 생일. 없으면 이 화면의 '태어난 날' 칸 */
    function birth() {
        var s = ''; try { s = localStorage.getItem('tosil_startDate') || ''; } catch (e) {}
        var d = parse(s);
        if (d) return d;
        var bi = $('v-birth');
        return bi ? parse(bi.value) : null;
    }
    function hasBirth() { var s = ''; try { s = localStorage.getItem('tosil_startDate') || ''; } catch (e) {} return !!parse(s); }
    /* 이른둥이 교정 (preterm.js · shared/babyage.js). 등록한 생일일 때만 */
    function early() {
        var BA = window.BabyAge;
        try { return (BA && hasBirth() && BA.on && BA.on()) ? num(BA.early()) : 0; } catch (e) { return 0; }
    }
    function sex() { var g = window.GrowthSync ? window.GrowthSync.read() : null; return g ? g.sex : ''; }
    function records() { var g = window.GrowthSync ? window.GrowthSync.read() : null; return g ? g.records : []; }

    /* 한 기록의 나이와 백분위 */
    function info(r, b, sx, e) {
        var d = parse(r.date), o = { days: null, dev: null };
        if (!b || !d) return o;
        o.days = dayDiff(b, d); o.dev = o.days - e; o.x = o.dev / MONTH;
        var G = window.GrowthRef;
        if (G && sx && o.dev >= 0) {
            if (num(r.height) > 0) o.ph = G.pct('h', sx, o.dev, r.height);
            if (num(r.weight) > 0) o.pw = G.pct('w', sx, o.dev, r.weight);
        }
        return o;
    }
    function calAge(b, d) {
        if (!b || !d || d < b) return null;
        var m = (d.getFullYear() - b.getFullYear()) * 12 + (d.getMonth() - b.getMonth());
        if (d.getDate() < b.getDate()) m--;
        var y = b.getFullYear(), mo = b.getMonth() + m, last = new Date(y, mo + 1, 0).getDate();
        return { m: m, d: dayDiff(new Date(y, mo, Math.min(b.getDate(), last)), d), all: dayDiff(b, d) };
    }
    function ageText(b, d) {
        var a = calAge(b, d);
        if (!a) return '';
        if (a.all === 0) return '태어난 날';
        if (a.m < 1) return '생후 ' + a.all + '일';
        return '생후 ' + a.m + '개월' + (a.d ? ' ' + a.d + '일' : '');
    }
    function pctText(p) {
        if (p == null) return '';
        if (p < 1) return '1 미만';
        if (p > 99) return '99 넘음';
        return String(Math.round(p));
    }
    function pctDesc(p, kind) {
        if (p == null) return '';
        var big = kind === 'w' ? '무거운' : '큰', small = kind === 'w' ? '가벼운' : '작은';
        if (p < 3) return '또래보다 많이 ' + small + ' 편이에요 · 검진 때 같이 봐 달라고 하세요';
        if (p < 15) return small + ' 편이에요';
        if (p <= 85) return '또래 가운데쯤이에요';
        if (p <= 97) return big + ' 편이에요';
        return '또래보다 많이 ' + big + ' 편이에요' + (kind === 'w' ? ' · 검진 때 같이 봐 달라고 하세요' : '');
    }

    /* ---------- 스타일 ---------- */
    function css() {
        if ($('gr-style')) return;
        var s = document.createElement('style');
        s.id = 'gr-style';
        s.textContent =
            '#panel-growth .gr-card{border-radius:20px;padding:22px 20px;box-shadow:0 4px 12px rgba(0,0,0,0.03);margin-bottom:14px;}' +
            '#panel-growth .gr-h2{font-size:20px;font-weight:900;margin:0 0 6px;color:var(--text-m);letter-spacing:-0.5px;}' +
            '#panel-growth .gr-who{font-size:13px;font-weight:700;color:var(--text-s);line-height:1.6;word-break:keep-all;}' +
            '#panel-growth .gr-who b{color:var(--text-m);font-weight:800;}' +
            '#panel-growth .gr-sexpick{display:flex;gap:8px;margin-top:10px;}' +
            '#panel-growth .gr-sexpick button{flex:1;padding:11px 0;border-radius:12px;border:1px solid var(--border);background:var(--bg-card);font-size:14px;font-weight:800;color:var(--text-m);cursor:pointer;}' +
            '#panel-growth .gr-corr{margin-top:8px;font-size:12.5px;font-weight:700;color:var(--text-s);line-height:1.6;word-break:keep-all;}' +
            '#panel-growth .gr-nudge{margin-top:12px;padding:10px 12px;border-radius:12px;font-size:12.5px;font-weight:800;line-height:1.5;word-break:keep-all;}' +
            '#panel-growth .gr-seg{display:flex;gap:0;margin:16px 0 6px;background:var(--bg-sub);border-radius:12px;padding:3px;}' +
            '#panel-growth .gr-seg button{flex:1;border:none;background:transparent;padding:9px 0;border-radius:10px;font-size:13.5px;font-weight:800;color:var(--text-s);cursor:pointer;}' +
            '#panel-growth .gr-seg button.on{background:var(--bg-card);color:var(--text-m);box-shadow:0 1px 4px rgba(0,0,0,0.08);}' +
            '#panel-growth .gr-chart{width:100%;min-height:40px;}' +
            '#panel-growth .gr-chart svg{display:block;width:100%;height:auto;overflow:visible;}' +
            '#panel-growth .gr-note{font-size:12px;font-weight:700;color:var(--text-s);line-height:1.6;word-break:keep-all;margin-top:6px;}' +
            '#panel-growth .gr-title{font-size:15px;font-weight:900;color:var(--text-m);margin-bottom:14px;}' +
            '#panel-growth .gr-field{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;}' +
            '#panel-growth .gr-field label,#panel-growth .gr-grid2 label{font-size:13px;font-weight:800;color:var(--text-m);}' +
            '#panel-growth .gr-date{flex:0 0 auto;min-width:150px;padding:11px 12px;border:1px solid var(--border);border-radius:12px;background:var(--bg-card);color:var(--text-m);font-size:14px;font-weight:800;text-align:center;outline:none;}' +
            '#panel-growth .gr-grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px;}' +
            '#panel-growth .gr-grid2 label{display:block;margin-bottom:8px;}' +
            '#panel-growth .gr-num{position:relative;display:flex;align-items:center;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;}' +
            '#panel-growth .gr-num input{width:100%;box-sizing:border-box;padding:14px 34px 14px 12px;border:none;background:transparent;font-size:18px;font-weight:900;text-align:center;color:var(--text-m);outline:none;}' +
            '#panel-growth .gr-num span{position:absolute;right:12px;font-size:13px;font-weight:800;color:var(--text-s);pointer-events:none;}' +
            '#panel-growth .gr-hint{font-size:12px;font-weight:700;color:var(--text-s);margin:10px 2px 14px;line-height:1.5;word-break:keep-all;}' +
            '#panel-growth .gr-save{width:100%;padding:17px;font-size:16px;font-weight:800;border-radius:14px;border:none;background:#B98A2E !important;color:#fff !important;cursor:pointer;}' +
            '#panel-growth .gr-res-head{font-size:13px;font-weight:800;color:var(--text-s);margin-bottom:12px;}' +
            '#panel-growth .gr-res-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}' +
            '#panel-growth .gr-res-box{border-radius:16px;padding:16px 12px;text-align:center;background:var(--bg-sub);}' +
            '#panel-growth .gr-res-k{font-size:12.5px;font-weight:800;color:var(--text-s);}' +
            '#panel-growth .gr-res-v{font-size:24px;font-weight:900;letter-spacing:-0.5px;margin:4px 0 6px;}' +
            '#panel-growth .gr-res-p{font-size:13px;font-weight:800;color:var(--text-m);}' +
            '#panel-growth .gr-res-d{font-size:12px;font-weight:700;color:var(--text-s);line-height:1.5;margin-top:4px;word-break:keep-all;}' +
            '#panel-growth .gr-res-c{font-size:12px;font-weight:800;margin-top:8px;}' +
            '#panel-growth .gr-res-none{font-size:13px;font-weight:700;color:var(--text-sub);padding:18px 0;}' +
            '#panel-growth .gr-sib{margin-top:12px;padding:12px 14px;border-radius:12px;background:var(--bg-sub);font-size:13px;font-weight:700;color:var(--text-m);line-height:1.6;word-break:keep-all;}' +
            '#panel-growth .gr-row{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:12px 14px;background:var(--bg-sub);border-radius:12px;margin-bottom:8px;}' +
            '#panel-growth .gr-row-d{font-size:12px;color:var(--text-s);font-weight:800;}' +
            '#panel-growth .gr-row-v{font-size:14px;font-weight:900;color:var(--text-m);margin-top:2px;}' +
            '#panel-growth .gr-row button{background:none;border:none;font-size:16px;color:var(--text-sub);cursor:pointer;padding:6px 4px;}' +
            '#panel-growth .gr-more{width:100%;padding:11px;border-radius:12px;border:1px dashed var(--border);background:transparent;font-size:13px;font-weight:800;color:var(--text-s);cursor:pointer;}' +
            '#panel-growth .gr-foot{font-size:11.5px;font-weight:600;color:var(--text-sub);line-height:1.7;margin:6px 6px 14px;word-break:keep-all;}';
        document.head.appendChild(s);
    }

    /* ---------- 그래프 (SVG — 그리는 라이브러리 없이) ---------- */
    function niceStep(range, want) {
        var c = [0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10, 20, 25, 50];
        for (var i = 0; i < c.length; i++) if (range / c[i] <= want) return c[i];
        return 100;
    }
    function chart(kind, pts, sx, xNow, W) {
        var G = window.GrowthRef, color = kind === 'w' ? WC : HC, unit = kind === 'w' ? 'kg' : 'cm';
        var Hh = Math.round(Math.min(260, Math.max(210, W * 0.64))), L = 36, R = 16, T = 26, B = 28;
        var xs = pts.map(function (p) { return p.x; }).concat(xNow != null && xNow >= 0 ? [xNow] : []);
        if (!xs.length) xs = [0];
        var lo = Math.min.apply(null, xs), hi = Math.max.apply(null, xs);
        var x0 = lo < 6 ? 0 : Math.max(0, Math.floor(lo) - 1);
        var x1 = Math.min(60, Math.max(x0 + 3, Math.ceil(hi + 0.6)));
        var curves = [];
        if (G && sx) {
            G.LINES.forEach(function (ln) {
                var arr = [];
                for (var i = 0; i <= 60; i++) {
                    var x = x0 + (x1 - x0) * i / 60, v = G.at(kind, sx, x * MONTH, ln.z);
                    if (v != null) arr.push([x, v]);
                }
                curves.push({ p: ln.p, pts: arr });
            });
        }
        var ys = pts.map(function (p) { return p.y; });
        curves.forEach(function (c) { c.pts.forEach(function (q) { ys.push(q[1]); }); });
        if (!ys.length) return '';
        var y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
        var padY = (y1 - y0) * 0.06 || 1; y0 -= padY; y1 += padY;
        var st = niceStep(y1 - y0, 5);
        y0 = Math.floor(y0 / st) * st; y1 = Math.ceil(y1 / st) * st;
        if (y0 < 0) y0 = 0;
        function X(x) { return L + (W - L - R) * (x - x0) / (x1 - x0); }
        function Y(y) { return T + (Hh - T - B) * (1 - (y - y0) / (y1 - y0)); }
        function f1(n) { return Math.round(n * 10) / 10; }
        var o = [];
        o.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + Hh + '" width="' + W + '" height="' + Hh + '" role="img" aria-label="' +
               (kind === 'w' ? '몸무게' : '키') + ' 곡선">');
        /* 가로줄 · 왼쪽 숫자 */
        for (var y = y0; y <= y1 + 1e-9; y += st) {
            var yy = f1(Y(y));
            o.push('<line x1="' + L + '" x2="' + (W - R) + '" y1="' + yy + '" y2="' + yy + '" style="stroke:var(--border);stroke-width:1;opacity:0.7"/>');
            o.push('<text x="' + (L - 6) + '" y="' + (yy + 4) + '" text-anchor="end" style="fill:var(--text-sub);font-size:11px;font-weight:700">' + (Math.round(y * 100) / 100) + '</text>');
        }
        o.push('<text x="' + (L - 6) + '" y="11" text-anchor="end" style="fill:var(--text-sub);font-size:10.5px;font-weight:800">' + unit + '</text>');
        /* 아래 개월 */
        var span = x1 - x0, xs2 = span <= 8 ? 1 : (span <= 16 ? 2 : (span <= 30 ? 3 : 6));
        var ticks = [];
        for (var m = Math.ceil(x0 / xs2) * xs2; m <= x1 + 1e-9; m += xs2) ticks.push(m);
        ticks.forEach(function (m, i) {
            var lastT = i === ticks.length - 1;
            o.push('<text x="' + f1(X(m)) + '" y="' + (Hh - B + 18) + '" text-anchor="' + (lastT ? 'end' : 'middle') + '" style="fill:var(--text-sub);font-size:11px;font-weight:700">' +
                   m + (lastT ? '개월' : '') + '</text>');
        });
        /* 또래 띠 — 3~97 옅게, 15~85 조금 진하게, 50 점선 */
        function path(c) { return c.pts.map(function (q, i) { return (i ? 'L' : 'M') + f1(X(q[0])) + ' ' + f1(Y(q[1])); }).join(' '); }
        function band(a, b, op) {
            if (!a || !b || !a.pts.length) return;
            var d = path(b) + ' ' + a.pts.slice().reverse().map(function (q) { return 'L' + f1(X(q[0])) + ' ' + f1(Y(q[1])); }).join(' ') + ' Z';
            o.push('<path d="' + d + '" style="fill:' + color + ';fill-opacity:' + op + ';stroke:none"/>');
        }
        if (curves.length === 5) {
            band(curves[0], curves[4], 0.08);
            band(curves[1], curves[3], 0.14);
            o.push('<path d="' + path(curves[2]) + '" style="fill:none;stroke:' + color + ';stroke-opacity:0.55;stroke-width:1.4;stroke-dasharray:4 4"/>');
            [0, 2, 4].forEach(function (i) {
                var c = curves[i], q = c.pts[c.pts.length - 1];
                if (q) o.push('<text x="' + (W - R + 2) + '" y="' + f1(Y(q[1]) + 4) + '" text-anchor="start" style="fill:var(--text-sub);font-size:10px;font-weight:800">' + c.p + '</text>');
            });
        }
        /* 아기 선 */
        if (pts.length) {
            if (pts.length > 1) {
                o.push('<path d="' + pts.map(function (p, i) { return (i ? 'L' : 'M') + f1(X(p.x)) + ' ' + f1(Y(p.y)); }).join(' ') +
                       '" style="fill:none;stroke:' + color + ';stroke-width:2.6;stroke-linejoin:round;stroke-linecap:round"/>');
            }
            pts.forEach(function (p, i) {
                var last = i === pts.length - 1;
                o.push('<circle class="gr-pt" data-date="' + esc(p.date) + '" cx="' + f1(X(p.x)) + '" cy="' + f1(Y(p.y)) + '" r="' + (last ? 5 : 3.6) + '" style="fill:' +
                       (last ? color : 'var(--bg-card)') + ';stroke:' + color + ';stroke-width:2"/>');
            });
        }
        o.push('</svg>');
        return o.join('');
    }

    /* ---------- 그리기 ---------- */
    function view(k) {
        if (k === 'h' || k === 'w') { try { localStorage.setItem(VIEW_KEY, k); } catch (e) {} }
        render();
    }
    function curView(recs) {
        var v = ''; try { v = localStorage.getItem(VIEW_KEY) || ''; } catch (e) {}
        var hasH = recs.some(function (r) { return num(r.height) > 0; }), hasW = recs.some(function (r) { return num(r.weight) > 0; });
        if (v === 'h' && (hasH || !hasW)) return 'h';
        if (v === 'w' && (hasW || !hasH)) return 'w';
        return hasW && !hasH ? 'w' : 'h';
    }
    function whoLine(b, sx, e) {
        var el = $('gr-who'); if (!el) return;
        var nm = esc(babyName());
        if (!b) { el.innerHTML = '아래 칸에 <b>' + nm + '</b>의 태어난 날을 넣어 주세요'; return; }
        var days = dayDiff(b, today());
        var bits = ['<b>' + nm + '</b>'];
        if (days >= 0) bits.push(ageText(b, today()));
        if (sx) bits.push('<span onclick="window.Growth.askSex()" style="cursor:pointer; text-decoration:underline; text-underline-offset:3px;">' + (sx === 'girl' ? '여아' : '남아') + '</span>');
        var html = bits.join(' · ');
        if (!sx) {
            html += '<div style="margin-top:6px;">성별을 고르면 또래 곡선과 백분위가 보여요. 엄마 · 아빠 폰에 같이 맞춰져요</div>' +
                '<div class="gr-sexpick"><button type="button" onclick="window.Growth.setSex(\'boy\')">남아</button>' +
                '<button type="button" onclick="window.Growth.setSex(\'girl\')">여아</button></div>';
        }
        el.innerHTML = html;
        /* 이른둥이 교정 나이 (preterm.js) */
        var ce = $('res-corr');
        if (ce) {
            var BA = window.BabyAge, on = false;
            try { on = !!(BA && hasBirth() && BA.on && BA.on()); } catch (er) {}
            if (on) {
                var dev = days - e, cm = Math.floor(dev / MONTH);
                try { if (typeof BA.months === 'function' && BA.months() != null) cm = BA.months(); } catch (er) {}
                ce.innerHTML = '<span class="box-sub" style="display:inline-block; padding:6px 12px; border-radius:10px; font-size:12.5px; font-weight:800; color:#6A61CE;">' +
                    (dev < 0 ? '예정일까지 ' + (-dev) + '일' : '교정 ' + cm + '개월 (' + Math.floor(dev / 7) + '주 차)') + '</span>' +
                    '<div style="margin-top:6px;">' + (dev < 0
                        ? '아직 예정일 전이라 또래 비교가 잘 맞지 않아요. 병원에서 쓰는 이른둥이 성장 곡선을 따라 주세요'
                        : '예정일부터 센 나이예요. 또래 곡선과 백분위는 이 나이로 봤어요') + '</div>';
                ce.style.display = 'block';
            } else {
                ce.style.display = 'none';
            }
        }
        /* 교정 나이를 안 켠 두 돌 전 아기 — 맨 아래 작은 줄 (대부분은 제때 태어나서 위에 둘 일이 아니다) */
        var ft = $('gr-foot');
        if (ft) {
            var BA2 = window.BabyAge, off = false;
            try { off = !!(BA2 && hasBirth() && !(BA2.on && BA2.on()) && days >= 0 && days / MONTH < 24 && typeof window.openPretermSheet === 'function'); } catch (er) {}
            ft.innerHTML = FOOT + (off ? '<br><span onclick="window.openPretermSheet()" style="cursor:pointer; text-decoration:underline; text-underline-offset:3px; color:var(--text-s);">일찍 태어났다면 교정 나이로 볼 수 있어요 ›</span>' : '');
        }
    }
    function nudge(recs, b) {
        var el = $('gr-nudge'); if (!el) return;
        if (!recs.length) { el.innerHTML = ''; return; }
        var last = recs[recs.length - 1], d = parse(last.date);
        var n = d ? dayDiff(d, today()) : 0;
        var age = b ? dayDiff(b, today()) / MONTH : 0;
        var gap = age >= 12 ? 60 : 30;
        if (n <= 0) { el.innerHTML = ''; return; }
        if (n > gap) {
            el.innerHTML = '<div class="gr-nudge" style="background:#FAF7F2; color:#A07722; border:1px dashed #E3D3B1;">키 · 몸무게를 잰 지 ' + n +
                '일 지났어요. <span onclick="window.Growth.focus()" style="cursor:pointer; text-decoration:underline; text-underline-offset:3px;">오늘 잰 걸 적기</span></div>';
        } else {
            el.innerHTML = '<div class="gr-nudge" style="background:var(--bg-sub); color:var(--text-s);">마지막으로 잰 날 · ' + dayLabel(last.date) + ' (' + n + '일 전)</div>';
        }
    }
    function chartBox(recs, b, sx, e) {
        var box = $('gr-chart-box'), el = $('gr-chart'), note = $('gr-chart-note');
        if (!box || !el) return;
        if (!b || (!recs.length && !sx)) {
            box.style.display = recs.length ? 'block' : 'none';
            if (!recs.length) return;
        }
        box.style.display = 'block';
        var k = curView(recs), color = k === 'w' ? WC : HC;
        var seg = $('gr-seg');
        if (seg) [].forEach.call(seg.querySelectorAll('button'), function (bt) {
            var on = bt.getAttribute('data-k') === k;
            bt.classList.toggle('on', on); bt.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        var pts = [], before = 0;
        recs.forEach(function (r) {
            var v = num(k === 'w' ? r.weight : r.height);
            if (!(v > 0)) return;
            var o = info(r, b, sx, e);
            if (o.dev == null) return;
            if (o.dev < 0) { before++; return; }
            pts.push({ x: o.x, y: v, date: r.date });
        });
        var xNow = b ? (dayDiff(b, today()) - e) / MONTH : null;
        var W = Math.max(280, Math.min(520, Math.round(el.clientWidth || (box.clientWidth - 0) || 320)));
        el.innerHTML = chart(k, pts, sx, xNow, W);
        var msg = [];
        if (!recs.length) {
            msg.push('키나 몸무게를 한 번 적으면, 이 또래 곡선 위에 ' + esc(babyName()) + ' 선이 그려져요.');
        }
        if (sx) {
            msg.push('진한 띠 안에 또래 100명 중 70명(15~85), 옅은 띠까지 94명(3~97)이 있어요. 점선이 한가운데(50)예요.');
            if (pts.length >= 2) msg.push('한 번 잰 값보다, 점들이 곡선을 따라 이어지는지가 더 중요해요.');
        } else if (recs.length) {
            msg.push('성별을 고르면 또래 곡선이 같이 보여요.');
        }
        if (before) msg.push('예정일 전에 잰 ' + before + '번은 이 곡선에 안 그렸어요.');
        if (pts.length === 0 && recs.length && !before) msg.push((k === 'w' ? '몸무게' : '키') + '를 적은 기록이 아직 없어요.');
        if (note) { note.innerHTML = msg.join(' '); note.style.color = ''; }
        el.setAttribute('data-kind', k);
        el.style.setProperty('--gr-color', color);
    }
    function prevOf(recs, i, key) {
        for (var j = i - 1; j >= 0; j--) if (num(recs[j][key]) > 0) return recs[j];
        return null;
    }
    function resultBox(recs, b, sx, e) {
        var box = $('growth-result'); if (!box) return;
        if (!recs.length || !b) { box.style.display = 'none'; box.innerHTML = ''; return; }
        var i = recs.length - 1;
        if (lastSaved) { for (var j = 0; j < recs.length; j++) if (recs[j].date === lastSaved) i = j; }
        var r = recs[i], o = info(r, b, sx, e);
        function cell(kind) {
            var key = kind === 'w' ? 'weight' : 'height', unit = kind === 'w' ? 'kg' : 'cm', v = num(r[key]);
            var name = kind === 'w' ? '몸무게' : '키', color = kind === 'w' ? WC : HC;
            if (!(v > 0)) return '<div class="gr-res-box"><div class="gr-res-k">' + name + '</div><div class="gr-res-none">이날은 안 쟀어요</div></div>';
            var p = kind === 'w' ? o.pw : o.ph, h = '<div class="gr-res-box"><div class="gr-res-k">' + name + '</div>' +
                '<div class="gr-res-v" style="color:' + color + ';">' + fmt(v, unit) + '</div>';
            if (p != null) h += '<div class="gr-res-p">백분위 ' + pctText(p) + '</div><div class="gr-res-d">' + pctDesc(p, kind) + '</div>';
            var pv = prevOf(recs, i, key);
            if (pv) {
                var dv = Math.round((v - num(pv[key])) * (kind === 'w' ? 100 : 10)) / (kind === 'w' ? 100 : 10);
                var dd = dayDiff(parse(pv.date), parse(r.date));
                h += '<div class="gr-res-c" style="color:' + (dv > 0 ? color : 'var(--text-s)') + ';">' + (dv === 0 ? '그대로' : (dv > 0 ? '+' : '') + dv + unit) + '</div>' +
                     '<div class="gr-res-d" style="margin-top:2px;">' + dayLabel(pv.date) + '부터 ' + dd + '일 동안</div>';
            }
            return h + '</div>';
        }
        var head = dayLabel(r.date) + (o.days != null && o.days >= 0 ? ' · ' + ageText(b, parse(r.date)) : '') +
            (r.by === 'mom' ? ' · 엄마가 적었어요' : (r.by === 'dad' ? ' · 아빠가 적었어요' : ''));
        var html = '<div class="box-main gr-card"><div class="gr-res-head">' + head + '</div><div class="gr-res-grid">' + cell('h') + cell('w') + '</div>';
        if (!sx) html += '<div class="gr-res-d" style="margin-top:10px;">성별을 고르면 백분위가 같이 보여요</div>';
        else if (o.dev != null && o.dev < 0) html += '<div class="gr-res-d" style="margin-top:10px;">예정일 전이라 또래 백분위는 보지 않았어요</div>';
        else if (o.ph != null || o.pw != null) {
            var ex = o.ph != null ? Math.round(o.ph) : Math.round(o.pw), exk = o.ph != null ? '작다' : '가볍다';
            /* 숫자 뒤 은/는 — 끝자리 읽는 소리로 (2 이 · 4 사 · 5 오 · 9 구 만 받침이 없다) */
            var jo = [2, 4, 5, 9].indexOf(ex % 10) > -1 ? '는' : '은';
            if (ex >= 1 && ex <= 99) html += '<div class="gr-res-d" style="margin-top:10px;">백분위 ' + ex + jo + ' 또래 100명 중 ' + ex + '명이 이보다 ' + exk + '는 뜻이에요</div>';
        }
        html += '<div id="growth-insight">' + siblings(r, o) + '</div></div>';
        box.innerHTML = html;
        box.style.display = 'block';
    }
    /* 형제 · 자매가 같은 나이였을 때 (있으면 사실대로만) */
    function siblings(r, o) {
        if (o.days == null || typeof window.getBabyProfiles !== 'function') return '';
        var raw = (typeof originalGetItem === 'function') ? function (k) { return originalGetItem.call(localStorage, k); } : null;
        if (!raw) return '';
        var me = window.currentBabySuffix || '', out = [];
        (window.getBabyProfiles() || []).forEach(function (p) {
            if (!p || p.id === me) return;
            var sb = parse(raw('tosil_startDate' + p.id)); if (!sb) return;
            var list = []; try { list = JSON.parse(raw('tosil_growth_records' + p.id)) || []; } catch (e) {}
            var best = null;
            list.forEach(function (x) {
                var d = parse(x && x.date); if (!d || !(num(x.height) > 0 || num(x.weight) > 0)) return;
                var gap = Math.abs(dayDiff(sb, d) - o.days);
                if (gap <= 15 && (!best || gap < best.gap)) best = { gap: gap, x: x };
            });
            if (!best) return;
            var vs = [];
            if (num(best.x.height) > 0) vs.push('키 ' + fmt(best.x.height, 'cm'));
            if (num(best.x.weight) > 0) vs.push('몸무게 ' + fmt(best.x.weight, 'kg'));
            var m = Math.floor(o.days / MONTH), when = m < 1 ? '생후 ' + o.days + '일 무렵' : '생후 ' + m + '개월';
            out.push('같은 ' + when + ' 때 <b>' + esc(p.name || '') + '</b> · ' + vs.join(' · '));
        });
        return out.length ? '<div class="gr-sib">' + out.join('<br>') + '</div>' : '';
    }
    function list(recs, b) {
        var card = $('gr-list-card'), el = $('growth-history-list');
        if (!card || !el) return;
        if (!recs.length) { card.style.display = 'none'; el.innerHTML = ''; return; }
        card.style.display = 'block';
        var rows = recs.slice().reverse(), shown = showAll ? rows : rows.slice(0, 5);
        var html = shown.map(function (r) {
            var d = parse(r.date), age = (b && d) ? ageText(b, d) : '';
            var vs = [];
            if (num(r.height) > 0) vs.push('<span style="color:' + HC + ';">키 ' + fmt(r.height, 'cm') + '</span>');
            if (num(r.weight) > 0) vs.push('<span style="color:' + WC + ';">몸무게 ' + fmt(r.weight, 'kg') + '</span>');
            var by = r.by === 'mom' ? ' · 엄마' : (r.by === 'dad' ? ' · 아빠' : '');
            return '<div class="gr-row"><div><div class="gr-row-d">' + dayLabel(r.date) + (age ? ' · ' + age : '') + by + '</div>' +
                '<div class="gr-row-v">' + vs.join(' &nbsp;') + '</div></div>' +
                '<button type="button" aria-label="이 기록 지우기" onclick="window.deleteGrowthRecord(\'' + esc(r.date) + '\')">✕</button></div>';
        }).join('');
        if (rows.length > 5) {
            html += '<button type="button" class="gr-more" onclick="window.Growth.more()">' + (showAll ? '최근 다섯 개만 보기' : '모두 보기 (' + rows.length + ')') + '</button>';
        }
        el.innerHTML = html;
    }
    function inputs(b) {
        var row = $('gr-birth-row');
        if (row) row.style.display = hasBirth() ? 'none' : 'flex';
        var di = $('gr-date');
        if (di) {
            var t = ymd(today());
            di.max = t;
            if (b) di.min = ymd(b); else di.removeAttribute('min');
            if (!di.value || di.value > t) di.value = t;
        }
    }
    function render() {
        if (!$('panel-growth')) return;
        css();
        var b = birth(), sx = sex(), e = early(), recs = records();
        whoLine(b, sx, e);
        nudge(recs, b);
        chartBox(recs, b, sx, e);
        resultBox(recs, b, sx, e);
        list(recs, b);
        inputs(b);
    }

    /* ---------- 기록 ---------- */
    window.growthRecord = function () {
        var b = birth();
        var hv = $('v-height') ? $('v-height').value : '', wv = $('v-weight-growth') ? $('v-weight-growth').value : '';
        var h = parseFloat(String(hv).replace(',', '.')), w = parseFloat(String(wv).replace(',', '.'));
        if (!(h > 0)) h = 0; if (!(w > 0)) w = 0;
        if (!b) return toast('아기 태어난 날을 넣어 주세요');
        if (!h && !w) return toast('키나 몸무게 중 하나는 적어 주세요');
        if (h && (h < 30 || h > 130)) return toast('키는 cm 로 적어 주세요 (예: 68.5)');
        if (w && (w < 0.5 || w > 40)) return toast('몸무게는 kg 로 적어 주세요 (예: 8.2)');
        var di = $('gr-date'), ds = (di && di.value) || ymd(today()), d = parse(ds);
        if (!d) return toast('잰 날을 골라 주세요');
        if (d > today()) return toast('잰 날이 오늘보다 뒤예요');
        if (d < b) return toast('잰 날이 태어난 날보다 앞이에요');
        var days = dayDiff(b, d), sx = sex(), e = early();
        /* 단위를 잘못 적은 것 같은 값 (예: 68 을 6.8) — 한 번 묻는다 */
        var G = window.GrowthRef, odd = [];
        if (G && sx && days - e >= 0) {
            var zh = h ? G.z('h', sx, days - e, h) : null, zw = w ? G.z('w', sx, days - e, w) : null;
            if (zh != null && Math.abs(zh) > 5) odd.push('키 ' + h + 'cm');
            if (zw != null && Math.abs(zw) > 5) odd.push('몸무게 ' + w + 'kg');
        }
        var same = null;
        records().forEach(function (r) { if (r.date === ds) same = r; });
        if (same) { if (!h) h = num(same.height); if (!w) w = num(same.weight); }
        function go() {
            var exists = !!same;
            var recs0 = records(), newest = !recs0.length || ds >= recs0[recs0.length - 1].date;
            lastSaved = ds;
            if (window.GrowthSync) window.GrowthSync.put({ date: ds, month: Math.floor(days / 30.436875), height: h, weight: w });
            try {
                if (newest && w) localStorage.setItem('tosil_latest_weight', String(w));
                if (newest && h) localStorage.setItem('tosil_latest_height', String(h));
            } catch (er) {}
            if ($('v-height')) $('v-height').value = '';
            if ($('v-weight-growth')) $('v-weight-growth').value = '';
            render();
            toast(exists ? dayLabel(ds) + ' 기록을 바꿨어요' : '기록했어요');
            var box = $('growth-result');
            if (box && box.scrollIntoView) setTimeout(function () { try { box.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (er) {} }, 60);
        }
        if (odd.length && typeof window.askChoice === 'function') {
            window.askChoice({
                title: odd.join(' · ') + ' 맞나요?',
                sub: '또래와 차이가 아주 커요. 단위(cm · kg)나 소수점을 한 번 봐 주세요',
                options: [{ label: '맞아요, 기록할게요', value: 'ok' }, { label: '고칠게요', value: 'fix' }]
            }).then(function (v) { if (v === 'ok') go(); });
            return;
        }
        go();
    };
    window.deleteGrowthRecord = function (ds) {
        if (typeof window.askChoice !== 'function') return;
        window.askChoice({
            title: dayLabel(ds) + ' 기록을 지울까요?',
            sub: '엄마 · 아빠 폰 모두에서 지워져요',
            options: [{ label: '지우기', value: 'del', danger: true }]
        }).then(function (v) {
            if (v !== 'del') return;
            if (lastSaved === ds) lastSaved = '';
            if (window.GrowthSync) window.GrowthSync.remove(ds);
            render();
            toast('지웠어요');
        });
    };
    function setSex(s) {
        if (window.GrowthSync) window.GrowthSync.setSex(s);
        render();
    }
    function askSex() {
        if (typeof window.askChoice !== 'function') return;
        var cur = sex();
        window.askChoice({
            title: '성별을 바꿀까요?',
            sub: '또래 곡선과 백분위가 남아 · 여아 기준으로 바뀌어요',
            options: [{ label: '남아' + (cur === 'boy' ? ' (지금)' : ''), value: 'boy' }, { label: '여아' + (cur === 'girl' ? ' (지금)' : ''), value: 'girl' }]
        }).then(function (v) { if (v === 'boy' || v === 'girl') setSex(v); });
    }
    function focus() {
        var i = $('v-height') || $('v-weight-growth');
        if (!i) return;
        try { i.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
        setTimeout(function () { try { i.focus(); } catch (e) {} }, 350);
    }

    /* 옛 이름들 — 다른 곳(preterm.js · 옛 버튼)이 부른다 */
    window.calcHealthMaster = function (quiet) { if (quiet === true) render(); else window.growthRecord(); };
    window.saveGrowthRecord = function () { window.growthRecord(); };
    window.renderGrowthHistory = function () { render(); };

    window.Growth = {
        render: render, open: function () { showAll = false; render(); }, view: view, setSex: setSex, askSex: askSex,
        focus: focus, more: function () { showAll = !showAll; render(); }, chart: chart
    };

    /* ---------- 원더윅스 (홈 사진의 딱지에서 연다) ---------- */
    window.openLeapSheet = function () {
        var old = $('leap-sheet'); if (old) old.remove();
        var list = (typeof wwList !== 'undefined' && Array.isArray(wwList)) ? wwList : [];
        var b = birth();
        if (!b || !list.length) { toast('설정에서 아기 생일을 먼저 넣어 주세요'); return; }
        var e = early(), dev = dayDiff(b, today()) - e, wk = Math.floor(dev / 7), pre = e ? '교정 ' : '';
        var cur = null, nxt = null;
        list.forEach(function (x) {
            if (!cur && wk >= x.w - 1 && wk <= x.w + 1) cur = x;
            if (!nxt && x.w - 1 > wk) nxt = x;
        });
        var status;
        if (dev < 0) {
            status = '<div style="font-size:14.5px; font-weight:900; color:var(--text-m);">예정일부터 세기 시작해요</div>';
        } else if (cur) {
            status = '<div style="font-size:14.5px; font-weight:900; color:#C2410C; margin-bottom:6px;">지금은 ' + esc(cur.t) + ' 도약기예요 (' + pre + wk + '주 차)</div>' +
                '<div style="font-size:13px; font-weight:700; color:var(--text-s); line-height:1.6;">' + esc(cur.d) + '. 이유 없이 보채거나 잠이 흐트러질 수 있는 때예요. 많이 안아 주세요</div>';
        } else {
            status = '<div style="font-size:14.5px; font-weight:900; color:#A07722; margin-bottom:6px;">지금은 비교적 편안한 때예요 (' + pre + wk + '주 차)</div>' +
                '<div style="font-size:13px; font-weight:700; color:var(--text-s); line-height:1.6;">' + (nxt
                    ? '다음 도약기는 <b style="color:var(--text-m);">' + esc(nxt.t) + '</b> · ' + pre + (nxt.w - 1) + '~' + (nxt.w + 1) + '주 무렵 (약 ' + Math.max(1, nxt.w - 1 - wk) + '주 뒤)'
                    : '열 번의 도약기를 모두 지났어요') + '</div>';
        }
        var cell = 'padding:10px 6px; border-bottom:1px solid var(--border);';
        var head = 'padding:10px 2px; background:var(--bg-sub); font-size:12px; white-space:nowrap;';
        var table = '<table style="width:100%; table-layout:fixed; border-collapse:collapse; font-size:13px; text-align:center; color:var(--text-m);">' +
            '<colgroup><col style="width:25%"><col style="width:18%"><col style="width:57%"></colgroup>' +
            '<tr><th style="' + head + '">주차</th><th style="' + head + '">도약기</th><th style="' + head + '">특징</th></tr>' +
            list.map(function (x) {
                var on = dev >= 0 && wk >= x.w - 1 && wk <= x.w + 1;
                return '<tr' + (on ? ' style="background:#FFF3EC; color:#C2410C; font-weight:800;"' : '') + '><td style="' + cell + '">' + (x.w - 1) + '~<wbr>' + (x.w + 1) + '주</td>' +
                    '<td style="' + cell + '">' + esc(String(x.t).replace(/\s*원더윅스/, '')) + '</td>' +
                    '<td style="' + cell + ' text-align:left; overflow-wrap:anywhere;">' + esc(x.d) + '</td></tr>';
            }).join('') + '</table>';
        var wrap = document.createElement('div');
        wrap.id = 'leap-sheet';
        wrap.setAttribute('style', 'position:fixed; inset:0; z-index:100002; background:rgba(35,29,24,0.55); display:flex; align-items:flex-end; justify-content:center;');
        wrap.onclick = function (ev) { if (ev.target === wrap) wrap.remove(); };
        wrap.innerHTML =
            '<div style="width:100%; max-width:520px; max-height:86vh; overflow-y:auto; overscroll-behavior:contain; background:var(--bg-card); border-radius:26px 26px 0 0; padding:22px 20px calc(30px + env(safe-area-inset-bottom, 0px));">' +
                '<div style="display:flex; justify-content:space-between; align-items:center;">' +
                    '<span style="font-size:16.5px; font-weight:900; color:var(--text-m); letter-spacing:-0.4px;">원더윅스</span>' +
                    '<span onclick="document.getElementById(\'leap-sheet\').remove()" style="font-size:22px; font-weight:300; color:var(--text-sub); cursor:pointer; line-height:1; padding:0 6px;">×</span>' +
                '</div>' +
                '<div style="font-size:12px; font-weight:700; color:var(--text-sub); margin-top:5px; line-height:1.6; word-break:keep-all;">아기가 훌쩍 크는 때를 한 육아서(The Wonder Weeks)가 주 단위로 정리한 거예요. 아기마다 한두 주씩 달라요' + (e ? ' · 예정일부터 셌어요' : '') + '</div>' +
                '<div style="margin-top:14px; padding:16px; border-radius:16px; background:var(--bg-sub);">' + status + '</div>' +
                '<div style="margin-top:14px; border:1px solid var(--border); border-radius:12px; overflow-x:auto;">' + table + '</div>' +
            '</div>';
        document.body.appendChild(wrap);
    };
})();
