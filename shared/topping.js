/* ============================================================
   배냇함 — 토핑 이유식 (shared/topping.js)

   왜 필요한가
     토핑 이유식은 베이스(쌀죽 · 밥)에 재료(토핑)를 따로따로 곁들여 먹인다.
     그래서 '한 그릇에 몇 g' 하나로는 못 적는다.
     테스터 엄마 말: "알레르기 테스트 통과랑 먹은 양 기록은 죽 이유식만 된다."

     이 파일은 '재료마다 몇 g' 을 적는 칸 하나를 만든다. 두 군데가 같은 칸을 쓴다.
       · 홈 → 맘마 기록 → 이유식      (toppingtrack.js)
       · 이유식 큐레이터 → 알레르기 달력 → 식단 기록   (food/toppingmeal.js)

   이유식 달력(tosil_food_calendar)에 남기는 모양
     식단          { type:'meal', style:'topping', menu:'쌀죽 · 소고기', parts:[{n,g,first}], amount:'55g', reaction, time, trk }
     처음 먹인 재료  { type:'test', ingredient, status:'pass', time, trk, from:'topping' }
     · trk 는 홈 맘마 기록의 id. 그 기록을 고치거나 지우면 달력에서도 같이 고치고 지운다.
     · 처음 먹인 재료는 '무사 통과' 로 적는다 (재료 기록 창과 같은 기본값).
       반응이 보이면 달력에서 눌러서 '알레르기 반응' 으로 바꾼다.

   ⚠️ 이 파일은 화면도 데이터도 '더하기만' 한다. 죽 이유식 기록은 하나도 안 건드린다.
   ============================================================ */
(function () {
    'use strict';
    if (window.Topping) return;

    var CAL = 'tosil_food_calendar';
    var MODE = 'tosil_food_style';          // 'porridge' | 'topping' (마지막에 고른 쪽을 기억한다)
    var RECENT = 'tosil_topping_recent';    // 최근에 쓴 재료 이름
    var LASTG = 'tosil_topping_lastg';      // 재료마다 마지막에 먹은 양
    var STEP = 5;
    var FIRST_TIME = ['쌀죽', '소고기', '닭고기', '애호박', '브로콜리', '단호박', '당근', '양배추'];

    function read(k, d) {
        try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; }
    }
    function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function clean(n) { return String(n || '').replace(/\s+/g, ' ').trim().slice(0, 20); }
    function grams(v) { v = parseInt(v, 10); return isNaN(v) || v < 0 ? 0 : Math.min(v, 999); }
    function pad(n) { return String(n).padStart(2, '0'); }
    function dayKey(ts) { var d = new Date(ts); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
    function hm(ts) { var d = new Date(ts); return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }); }
    /* 받침이 있으면 앞말, 없으면 뒷말 (달걀은 · 소고기는) */
    function josa(word, withJong, without) {
        var w = String(word || ''), c = w.charCodeAt(w.length - 1);
        var jong = c >= 0xAC00 && c <= 0xD7A3 ? (c - 0xAC00) % 28 !== 0 : false;
        return w + (jong ? withJong : without);
    }

    function total(parts) {
        return (parts || []).reduce(function (s, p) { return s + grams(p && p.g); }, 0);
    }
    function summary(parts) {
        return (parts || []).map(function (p) { return clean(p.n) + ' ' + grams(p.g); }).join(' · ');
    }

    /* 달력에 적힌 재료 기록: 통과한 것 · 반응이 있었던 것 */
    function tested() {
        var pass = {}, fail = {};
        var db = read(CAL, {});
        Object.keys(db).forEach(function (d) {
            (db[d] || []).forEach(function (r) {
                if (!r || !(r.type === 'test' || (r.ingredient && !r.menu))) return;
                var n = clean(r.ingredient);
                if (!n) return;
                if (r.status === 'fail') fail[n] = 1; else pass[n] = 1;
            });
        });
        return { pass: pass, fail: fail };
    }

    /* 고를 거리: 최근에 쓴 재료 → 냉동실 큐브 → (처음 쓰는 사람이면) 흔한 재료 */
    function suggestions(skip) {
        var out = [], seen = {};
        (skip || []).forEach(function (n) { seen[clean(n)] = 1; });
        function add(n) { n = clean(n); if (n && !seen[n]) { seen[n] = 1; out.push(n); } }
        read(RECENT, []).forEach(add);
        read('tosil_cube_records', []).forEach(function (c) { if (c && (parseInt(c.qty, 10) || 0) > 0) add(c.name); });
        if (!read(RECENT, []).length) FIRST_TIME.forEach(add);
        return out.slice(0, 10);
    }

    function remember(parts) {
        var names = read(RECENT, []), lastg = read(LASTG, {});
        parts.slice().reverse().forEach(function (p) {
            names = [p.n].concat(names.filter(function (x) { return x !== p.n; }));
            lastg[p.n] = grams(p.g);
        });
        write(RECENT, names.slice(0, 16));
        write(LASTG, lastg);
    }

    function mode(m) {
        if (m === 'topping' || m === 'porridge') { try { localStorage.setItem(MODE, m); } catch (e) {} return m; }
        try { return localStorage.getItem(MODE) === 'topping' ? 'topping' : 'porridge'; } catch (e) { return 'porridge'; }
    }

    /* ---------- 달력에 적기 ---------- */

    function saveToCalendar(dateStr, parts, meta) {
        meta = meta || {};
        parts = (parts || []).filter(function (p) { return p && clean(p.n) && grams(p.g) > 0; })
            .map(function (p) { var o = { n: clean(p.n), g: grams(p.g) }; if (p.first) o.first = true; return o; });
        if (!parts.length) return false;

        var db = read(CAL, {});
        var trk = meta.trk || null;
        var keep = {};   // 고쳐 저장할 때: 달력에서 '반응' 으로 바꿔 둔 건 그대로 둔다
        if (trk) {
            Object.keys(db).forEach(function (d) {
                db[d] = (db[d] || []).filter(function (r) {
                    if (!(r && r.trk === trk)) return true;
                    if (r.type === 'test') keep[clean(r.ingredient)] = r.status;
                    return false;
                });
                if (!db[d].length) delete db[d];
            });
        }
        var list = db[dateStr] || (db[dateStr] = []);
        var time = meta.time || hm(meta.ts || Date.now());   // 달력의 다른 기록과 같은 모양 (오후 03:24)
        var meal = {
            type: 'meal', style: 'topping',
            menu: parts.map(function (p) { return p.n; }).join(' · '),
            parts: parts, amount: total(parts) + 'g',
            reaction: meta.reaction || '', time: time
        };
        if (trk) meal.trk = trk;
        if (meta.replaceIndex != null && list[meta.replaceIndex]) list[meta.replaceIndex] = meal;
        else list.push(meal);

        parts.forEach(function (p) {
            if (!p.first) return;
            var dup = list.some(function (r) { return r && r.type === 'test' && clean(r.ingredient) === p.n; });
            if (dup) return;   // 같은 날 같은 재료는 한 번만
            var t = { type: 'test', ingredient: p.n, status: keep[p.n] === 'fail' ? 'fail' : 'pass', time: time, from: 'topping' };
            if (trk) t.trk = trk;
            list.push(t);
        });
        write(CAL, db);
        remember(parts);
        return true;
    }

    /* 홈 맘마 기록을 지우면 달력에서도 지운다 */
    function forgetTrk(trk) {
        if (!trk) return;
        var db = read(CAL, {}), changed = false;
        Object.keys(db).forEach(function (d) {
            var before = (db[d] || []).length;
            db[d] = (db[d] || []).filter(function (r) { return !(r && r.trk === trk); });
            if (db[d].length !== before) changed = true;
            if (!db[d].length) delete db[d];
        });
        if (changed) write(CAL, db);
    }

    /* ---------- 화면: 재료마다 몇 g ---------- */

    function css() {
        if (document.getElementById('tp-css')) return;
        var s = document.createElement('style');
        s.id = 'tp-css';
        s.textContent =
            '.tp-seg{display:flex;gap:4px;padding:3px;background:var(--bg-sub,#F6F2EC);border-radius:12px;margin:0 auto 16px;max-width:280px;}' +
            '.tp-seg div{flex:1;text-align:center;padding:9px 0;border-radius:9px;font-size:13.5px;font-weight:800;color:var(--text-sub,#A3958A);cursor:pointer;}' +
            '.tp-seg div.on{background:var(--bg-card,#FFF);color:var(--text-m,#4A413C);box-shadow:0 1px 3px rgba(59,50,44,.12);}' +
            '.tp-box{text-align:left;}' +
            '.tp-row{display:flex;align-items:center;gap:6px;padding:7px 0;border-bottom:1px solid var(--border,#EDE6DE);}' +
            '.tp-name{flex:1;min-width:0;width:0;padding:10px;border-radius:10px;border:1px solid var(--border,#EDE6DE);background:var(--bg-card,#FFF);' +
                'font-size:14.5px;font-weight:700;color:var(--text-m,#4A413C);outline:none;box-sizing:border-box;font-family:inherit;}' +
            '.tp-first{flex-shrink:0;padding:8px 7px;border-radius:8px;border:1px solid var(--border,#DCD3C8);background:transparent;font-size:12px;' +
                'font-weight:800;color:var(--text-sub,#A3958A);cursor:pointer;white-space:nowrap;font-family:inherit;}' +
            '.tp-first.on{background:#F0EEFB;border-color:#7F77DD;color:#5B53B8;}' +
            '.tp-amt{flex-shrink:0;display:flex;align-items:center;}' +
            '.tp-amt button{width:30px;height:36px;border:none;border-radius:9px;background:var(--bg-sub,#F6F2EC);color:var(--text-m,#4A413C);' +
                'font-size:18px;font-weight:800;cursor:pointer;padding:0;font-family:inherit;line-height:1;}' +
            '.tp-g{width:38px;padding:8px 0;border:none;background:transparent;text-align:right;font-size:16px;font-weight:900;color:var(--text-m,#4A413C);' +
                'outline:none;-moz-appearance:textfield;font-family:inherit;}' +
            '.tp-g::-webkit-outer-spin-button,.tp-g::-webkit-inner-spin-button{-webkit-appearance:none;margin:0;}' +
            '.tp-unit{font-size:12.5px;font-weight:800;color:var(--text-sub,#A3958A);margin:0 4px 0 1px;}' +
            '.tp-del{flex-shrink:0;width:24px;height:36px;border:none;background:transparent;color:var(--text-sub,#B5AAA0);font-size:14px;cursor:pointer;padding:0;}' +
            '.tp-warn{font-size:12px;font-weight:700;color:#D32F2F;padding:4px 2px 2px;line-height:1.5;word-break:keep-all;}' +
            '.tp-chips{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0 2px;}' +
            '.tp-chip{padding:7px 11px;border-radius:999px;background:var(--bg-sub,#F6F2EC);color:var(--text-s,#5A4D44);font-size:13px;font-weight:700;' +
                'cursor:pointer;border:none;font-family:inherit;}' +
            '.tp-add{width:100%;margin-top:10px;padding:11px;border-radius:12px;border:1px dashed var(--border,#DCD3C8);background:transparent;' +
                'color:var(--text-s,#7A6F68);font-size:13.5px;font-weight:800;cursor:pointer;font-family:inherit;}' +
            '.tp-sum{display:flex;justify-content:space-between;align-items:baseline;margin-top:14px;font-size:13px;font-weight:800;color:var(--text-s,#7A6F68);}' +
            '.tp-sum b{font-size:18px;font-weight:900;color:var(--text-m,#4A413C);}' +
            '.tp-note{font-size:11.5px;font-weight:600;color:var(--text-sub,#A3958A);line-height:1.6;margin-top:8px;word-break:keep-all;}';
        document.head.appendChild(s);
    }

    function Editor(host) {
        css();
        var rows = [{ n: '', g: 0, first: false }];
        var t = tested();
        host.classList.add('tp-box');

        function warnHTML(r) {
            var n = clean(r.n);
            return n && t.fail[n] ? '<div class="tp-warn">' + esc(josa(n, '은', '는')) + ' 전에 알레르기 반응이 있었던 재료예요. 먹이기 전에 한 번 더 확인해 주세요.</div>' : '';
        }
        function rowHTML(r, i) {
            return '<div class="tp-row" data-i="' + i + '">' +
                '<input class="tp-name" data-k="n" value="' + esc(r.n) + '" placeholder="재료 (예: 소고기)" maxlength="20" enterkeyhint="done">' +
                '<button type="button" class="tp-first' + (r.first ? ' on' : '') + '" data-act="first" aria-pressed="' + (r.first ? 'true' : 'false') + '">처음</button>' +
                '<div class="tp-amt">' +
                    '<button type="button" data-act="minus" aria-label="' + STEP + 'g 빼기">−</button>' +
                    '<input class="tp-g" data-k="g" type="number" inputmode="numeric" min="0" max="999" value="' + (r.g ? r.g : '') + '" placeholder="0">' +
                    '<span class="tp-unit">g</span>' +
                    '<button type="button" data-act="plus" aria-label="' + STEP + 'g 더하기">+</button>' +
                '</div>' +
                '<button type="button" class="tp-del" data-act="del" aria-label="이 재료 빼기">✕</button>' +
            '</div><div class="tp-w" data-w="' + i + '">' + warnHTML(r) + '</div>';
        }
        function render(focusLast) {
            var used = rows.map(function (r) { return r.n; });
            var sug = suggestions(used);
            host.innerHTML =
                '<div class="tp-rows">' + rows.map(rowHTML).join('') + '</div>' +
                (sug.length ? '<div class="tp-chips">' + sug.map(function (n) {
                    return '<button type="button" class="tp-chip" data-add="' + esc(n) + '">+ ' + esc(n) + '</button>';
                }).join('') + '</div>' : '') +
                '<button type="button" class="tp-add" data-act="add">+ 재료 하나 더</button>' +
                '<div class="tp-sum"><span>모두</span><span><b class="tp-total">0</b> g</span></div>' +
                '<div class="tp-note">처음 먹인 재료는 \'처음\'을 눌러 주세요. 이유식 달력의 새 재료 기록에도 \'무사 통과\'로 남아요. 반응이 보이면 달력에서 눌러 바꿀 수 있어요.</div>';
            paintTotal();
            if (focusLast) {
                var ins = host.querySelectorAll('.tp-name');
                if (ins.length) { try { ins[ins.length - 1].focus(); } catch (e) {} }
            }
        }
        function paintTotal() {
            var el = host.querySelector('.tp-total');
            if (el) el.textContent = String(total(rows));
        }
        function idx(el) {
            var row = el.closest('.tp-row');
            return row ? parseInt(row.getAttribute('data-i'), 10) : -1;
        }

        host.addEventListener('input', function (e) {
            var el = e.target, i = idx(el);
            if (i < 0 || !rows[i]) return;
            if (el.getAttribute('data-k') === 'n') {
                rows[i].n = el.value;
                var w = host.querySelector('[data-w="' + i + '"]');
                if (w) w.innerHTML = warnHTML(rows[i]);
            } else if (el.getAttribute('data-k') === 'g') {
                rows[i].g = grams(el.value);
                paintTotal();
            }
        });
        host.addEventListener('click', function (e) {
            var chip = e.target.closest('[data-add]');
            if (chip) {
                var n = chip.getAttribute('data-add');
                var g = read(LASTG, {})[n] || 10;
                var empty = rows.filter(function (r) { return !clean(r.n); })[0];
                if (empty) { empty.n = n; if (!empty.g) empty.g = g; }
                else rows.push({ n: n, g: g, first: false });
                render(false);
                return;
            }
            var btn = e.target.closest('[data-act]');
            if (!btn) return;
            var act = btn.getAttribute('data-act'), i = idx(btn);
            if (act === 'add') { rows.push({ n: '', g: 0, first: false }); render(true); return; }
            if (i < 0 || !rows[i]) return;
            if (act === 'first') {
                rows[i].first = !rows[i].first;
                btn.classList.toggle('on', rows[i].first);
                btn.setAttribute('aria-pressed', rows[i].first ? 'true' : 'false');
            } else if (act === 'minus' || act === 'plus') {
                rows[i].g = Math.max(0, Math.min(999, grams(rows[i].g) + (act === 'plus' ? STEP : -STEP)));
                var gi = host.querySelector('.tp-row[data-i="' + i + '"] .tp-g');
                if (gi) gi.value = rows[i].g ? rows[i].g : '';
                paintTotal();
            } else if (act === 'del') {
                rows.splice(i, 1);
                if (!rows.length) rows.push({ n: '', g: 0, first: false });
                render(false);
            }
        });

        this.get = function () {
            return rows.filter(function (r) { return clean(r.n) && grams(r.g) > 0; })
                .map(function (r) { var o = { n: clean(r.n), g: grams(r.g) }; if (r.first) o.first = true; return o; });
        };
        this.set = function (parts) {
            rows = (parts && parts.length ? parts : [{ n: '', g: 0 }]).map(function (p) {
                return { n: clean(p.n), g: grams(p.g), first: !!p.first };
            });
            t = tested();
            render(false);
        };
        this.total = function () { return total(rows); };
        /* 저장 전에 확인: 고칠 게 있으면 그 말을 돌려준다 */
        this.invalid = function () {
            var named = rows.filter(function (r) { return clean(r.n); });
            if (rows.some(function (r) { return !clean(r.n) && grams(r.g) > 0; })) return '먹은 양을 적은 칸에 재료 이름도 적어 주세요';
            if (!named.length) return '먹인 재료를 하나 이상 적어 주세요';
            var zero = named.filter(function (r) { return !grams(r.g); })[0];
            if (zero) return clean(zero.n) + ' 먹은 양(g)을 적어 주세요. 안 먹었으면 그 줄을 지워 주세요';
            return '';
        };
        render(false);
    }

    window.Topping = {
        Editor: Editor,
        mode: mode,
        total: total,
        summary: summary,
        dayKey: dayKey,
        tested: tested,
        saveToCalendar: saveToCalendar,
        forgetTrk: forgetTrk,
        josa: josa,
        esc: esc
    };
})();
