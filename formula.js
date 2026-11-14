/* ============================================================
   배냇함 — 퐁당맘마 (formula.js) : 하루 분유 얼마나 · 분유 갈아타기

   ⚠️ 예전
      · 하루 양을 몸무게 × 130~150ml 하나로만 셌다. 나이를 안 봐서, 이유식을 먹는 9개월 아기(9kg)에게도
        '최대 1,000ml' 와 '1,000ml 넘기지 마세요' 가 나왔다. 그 무렵엔 하루 600ml 안팎이 기준이다
      · 몸무게 · 하루 몇 번을 매번 손으로 적었다 (성장 기록 · 맘마 기록에 다 있는데)
      · 어제 실제로 먹은 양과 견주지 못했다
      · 갈아타기는 '바꾼 지 며칠째' 를 사람이 기억해서 눌러야 했고, 밤에 타는 짝꿍은 오늘 비율을 몰랐다
   지금
      · 나이(이른둥이는 교정 나이)에 맞는 기준 — 출처를 같이 적는다
          6개월 전  몸무게 1kg에 하루 150~200ml (영국 NHS), 하루 960ml 는 넘기지 않게 (미국소아과학회)
          6개월     180~240ml 씩 하루 4~5번 (미국소아과학회)
          7~9개월   하루 600ml 안팎 (영국 NHS)
          10~11개월 하루 400ml 안팎, 3번쯤 (영국 NHS)
          돌 지나면 생우유로, 하루 400~500ml 쯤
      · 몸무게는 마지막 성장 기록, 하루 몇 번은 최근 사흘 맘마 기록으로 먼저 채운다
      · 어제 젖병으로 먹은 양(분유 · 유축)을 같이 보여 준다
      · 갈아타기는 '시작한 날' 을 남긴다 → 오늘이 며칠째인지, 오늘 비율이 저절로. 엄마 · 아빠 폰이 같이 본다
        (formula_가족코드[_아기]/status — 나중에 고친 쪽)
   ============================================================ */
(function () {
    'use strict';
    var PLAN_KEY = 'tosil_pong_plan', MONTH = 30.4375, CAP = 960;
    var STEPS = [{ r: 0.25, t: '3:1' }, { r: 0.5, t: '1:1' }, { r: 0.75, t: '1:3' }];

    function $(id) { return document.getElementById(id); }
    function num(v) { return Number(String(v == null ? '' : v).replace(/,/g, '')) || 0; }
    function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function toast(m) { if (typeof window.showToast === 'function') window.showToast(m); }
    function pad(n) { return String(n).padStart(2, '0'); }
    function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
    function parse(s) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
    function today() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
    function dayDiff(a, b) { return Math.round((b - a) / 86400000); }
    function ml(n) { return Math.round(n).toLocaleString() + 'ml'; }
    function role() { var r = ''; try { r = localStorage.getItem('user_role') || ''; } catch (e) {} return r === 'dad' ? 'dad' : (r === 'mom' ? 'mom' : ''); }
    function babyName() { var n = ''; try { n = String(localStorage.getItem('tosil_babyName') || '').trim(); } catch (e) {} return n || '우리 아기'; }

    /* ---------- 아기 나이 · 몸무게 · 맘마 기록 ---------- */
    function ageDays() {
        var b = null; try { b = parse(localStorage.getItem('tosil_startDate')); } catch (e) {}
        if (!b) return null;
        var d = dayDiff(b, today()), BA = window.BabyAge;
        try { if (BA && BA.on && BA.on()) d -= Number(BA.early()) || 0; } catch (e) {}
        return d;
    }
    function lastWeight() {
        var recs = []; try { recs = JSON.parse(localStorage.getItem('tosil_growth_records')) || []; } catch (e) {}
        for (var i = recs.length - 1; i >= 0; i--) if (num(recs[i] && recs[i].weight) > 0) return { w: num(recs[i].weight), date: recs[i].date };
        var w = 0; try { w = num(localStorage.getItem('tosil_latest_weight')); } catch (e) {}
        return w > 0 ? { w: w, date: '' } : null;
    }
    function bottles() {
        var recs = []; try { recs = JSON.parse(localStorage.getItem('tosil_tracker_records')) || []; } catch (e) {}
        return recs.filter(function (r) { return r && r.type === 'feed' && r.subType !== '모유' && r.subType !== '이유식' && num(r.amount) > 0 && num(r.timestamp) > 0; });
    }
    function dayStat(off) {
        var t = today(), a = new Date(t.getTime() - off * 86400000), b = new Date(a.getTime() + 86400000), n = 0, sum = 0;
        bottles().forEach(function (r) { var ts = num(r.timestamp); if (ts >= a.getTime() && ts < b.getTime()) { n++; sum += num(r.amount); } });
        return { n: n, ml: sum };
    }
    /* 최근 사흘(어제부터) 하루 평균 몇 번 · 한 번에 얼마 */
    function habit() {
        var days = 0, n = 0, sum = 0;
        for (var i = 1; i <= 3; i++) { var s = dayStat(i); if (s.n) { days++; n += s.n; sum += s.ml; } }
        return days ? { perDay: Math.round(n / days), perFeed: Math.round(sum / n / 10) * 10 } : null;
    }

    /* ---------- 나이에 맞는 하루 기준 ---------- */
    function guide(days, w, count) {
        var m = days == null ? null : days / MONTH;
        if (m != null && m >= 12) return { kind: 'milk', text: '돌이 지나면 분유 대신 생우유로 바꿔 가요', range: [400, 500], src: '흔히 권하는 양' };
        if (m != null && m >= 10) return { kind: 'band', range: [350, 450], about: 400, text: '하루 3번쯤 · 이유식을 세 끼 먹는 때예요', src: '영국 NHS' };
        if (m != null && m >= 7) return { kind: 'band', range: [500, 700], about: 600, text: '이유식을 먹으면서 조금씩 줄어요', src: '영국 NHS' };
        if (m != null && m >= 6) return { kind: 'band', range: [720, 960], text: '180~240ml 씩 하루 4~5번 · 이유식을 먹으면서 조금씩 줄어요', src: '미국소아과학회' };
        if (!(w > 0)) return { kind: 'need-w' };
        var lo = Math.round(w * 150), hi = Math.round(w * 200), capped = hi > CAP;
        return { kind: 'weight', range: [Math.min(lo, CAP), Math.min(hi, CAP)], capped: capped, src: '영국 NHS · 미국소아과학회' };
    }
    function paintGuide() {
        var box = $('fm-guide'); if (!box) return;
        var days = ageDays(), wi = $('calc-weight'), ci = $('calc-count');
        var w = num(wi && wi.value), cnt = Math.round(num(ci && ci.value));
        var g = guide(days, w, cnt);
        var m = days == null ? null : Math.floor(days / MONTH);
        var who = $('fm-who');
        if (who) {
            var bits = ['<b>' + esc(babyName()) + '</b>'];
            if (days != null) bits.push((window.BabyAge && window.BabyAge.on && window.BabyAge.on() ? '교정 ' : '생후 ') + (m < 1 ? Math.max(0, days) + '일' : m + '개월'));
            who.innerHTML = bits.join(' · ');
        }
        var wrow = $('fm-w-row');
        if (wrow) wrow.style.display = (g.kind === 'weight' || g.kind === 'need-w') ? 'block' : 'none';
        if (g.kind === 'need-w') { box.innerHTML = '<div class="fm-note">몸무게를 적으면 하루 양을 알려 드려요.</div>'; paintYesterday(null); return; }
        var big, sub = '', foot = '';
        if (g.kind === 'milk') {
            big = '생우유 하루 400~500ml';
            sub = g.text;
            foot = '분유를 언제 끊을지는 아기마다 달라요. 밥을 잘 먹는지 보면서 천천히요.';
        } else {
            big = '하루 ' + g.range[0].toLocaleString() + '~' + ml(g.range[1]);
            if (g.kind === 'band' && g.about) big = '하루 ' + ml(g.about) + ' 안팎';
            if (g.kind === 'band') sub = g.text;
            if (g.kind === 'weight') sub = '몸무게 ' + w + 'kg × 1kg에 150~200ml' + (g.capped ? ' — 하루 960ml 는 넘기지 않는 게 좋다고 해요' : '');
            if (cnt > 0) {
                var lo = g.kind === 'band' && g.about ? g.about : g.range[0], hi = g.kind === 'band' && g.about ? g.about : g.range[1];
                var a = Math.round(lo / cnt / 10) * 10, b = Math.round(hi / cnt / 10) * 10;
                foot = '하루 ' + cnt + '번이면 한 번에 ' + (a === b ? a + 'ml' : a + '~' + b + 'ml') + '쯤이에요.';
            }
        }
        box.innerHTML = '<div class="fm-big">' + big + '</div>' + (sub ? '<div class="fm-sub">' + esc(sub) + '</div>' : '') +
            (foot ? '<div class="fm-foot">' + esc(foot) + '</div>' : '') +
            '<div class="fm-src">기준: ' + esc(g.src) + '. 아기마다 먹는 양이 달라서 참고로만 봐 주세요.</div>';
        paintYesterday(g);
    }
    function paintYesterday(g) {
        var el = $('fm-yesterday'); if (!el) return;
        var y = dayStat(1), t = dayStat(0);
        if (!y.n && !t.n) { el.innerHTML = ''; el.style.display = 'none'; return; }
        el.style.display = 'block';
        var html = '';
        if (y.n) {
            html += '<div class="fm-y"><span>어제 젖병으로</span><b>' + y.n + '번 · ' + ml(y.ml) + '</b></div>';
            if (g && g.range && g.kind !== 'milk') {
                var lo = g.range[0], hi = g.range[1];
                var say = y.ml < lo * 0.8 ? '기준보다 적게 먹었어요. 아기마다 다르니, 며칠 계속 적으면 소아과에서 물어봐 주세요.'
                    : (y.ml > hi * 1.15 ? '기준보다 많이 먹었어요. 며칠 계속 많으면 소아과에서 물어봐 주세요.' : '기준 안쪽이에요.');
                html += '<div class="fm-say">' + say + '</div>';
            }
        }
        if (t.n) html += '<div class="fm-y" style="margin-top:6px;"><span>오늘 지금까지</span><b>' + t.n + '번 · ' + ml(t.ml) + '</b></div>';
        el.innerHTML = html;
    }
    function prefill() {
        var wi = $('calc-weight'), ci = $('calc-count'), hint = $('fm-w-hint');
        var lw = lastWeight();
        if (wi && !wi.value && lw) { wi.value = String(lw.w); }
        var ld = lw && parse(lw.date);
        if (hint) hint.textContent = ld ? (ld.getMonth() + 1) + '월 ' + ld.getDate() + '일 성장 기록' : '';
        var h = habit();
        if (ci && !ci.value && h) ci.value = String(h.perDay);
    }

    /* ---------- 분유 갈아타기 계획 (두 폰이 같이) ---------- */
    function readPlan() { var p = null; try { p = JSON.parse(localStorage.getItem(PLAN_KEY)); } catch (e) {} return p && typeof p === 'object' ? p : { plan: null, at: 0 }; }
    function writePlan(o) { try { localStorage.setItem(PLAN_KEY, JSON.stringify(o)); } catch (e) {} }
    function ref() {
        var c = (typeof window.getSyncCode === 'function') ? window.getSyncCode() : null;
        if (!c || !window.db || typeof window.doc !== 'function') return null;
        return window.doc(window.db, 'formula_' + c + (window.currentBabySuffix || ''), 'status');
    }
    function push(o) {
        var r = ref();
        if (!r || typeof window.setDoc !== 'function') return Promise.resolve(false);
        return window.setDoc(r, { plan: o.plan || null, at: Number(o.at) || 0 }).then(function () { return true; }, function (e) { console.warn('[퐁당] 올리기 실패', e); return false; });
    }
    var unsub = null;
    function listen() {
        var r = ref();
        if (!r || typeof window.onSnapshot !== 'function') return;
        if (unsub) { try { unsub(); } catch (e) {} unsub = null; }
        var u = window.onSnapshot(r, function (snap) {
            var loc = readPlan(), sv = snap.exists() ? (snap.data() || {}) : null;
            if (sv && num(sv.at) > num(loc.at)) { writePlan({ plan: sv.plan || null, at: num(sv.at) }); paintPlan(); }
            else if (num(loc.at) > (sv ? num(sv.at) : 0)) push(loc);
        }, function (e) { console.warn('퐁당 계획 실시간 연동 에러 (오프라인 모드)', e); });
        unsub = (typeof window.addLiveListener === 'function') ? window.addLiveListener(u) : u;
    }
    function setPlan(plan) { var o = { plan: plan, at: Date.now() }; writePlan(o); push(o); paintPlan(); }

    function stepOf(plan) {
        var s = parse(plan.start), pace = plan.pace === 2 ? 2 : 1;
        if (!s) return null;
        var d = dayDiff(s, today()) + 1, total = 3 * pace;
        return { day: d, total: total, step: d < 1 ? 0 : Math.ceil(d / pace), done: d > total, pace: pace };
    }
    function bottlesOf(n, k) {
        var out = [];
        for (var i = 0; i < n; i++) out.push(Math.floor((i + 1) * k / n) > Math.floor(i * k / n));
        return out;
    }
    function todayHTML(plan, st) {
        if (st.done) return '<div class="fm-big">새 분유만 먹여요</div><div class="fm-sub">' + st.total + '일 동안 잘 바꿨어요.</div>';
        if (st.step < 1) return '<div class="fm-big">' + (1 - st.day) + '일 뒤에 시작해요</div>';
        var S = STEPS[st.step - 1];
        if (plan.method === 'alt') {
            var n = Math.max(2, Math.round(num(plan.count))), k = Math.min(n - 1, Math.max(1, Math.round(n * S.r)));
            var row = bottlesOf(n, k).map(function (isNew, i) {
                return '<span class="fm-b' + (isNew ? ' on' : '') + '">' + (i + 1) + '<i>' + (isNew ? '새' : '기존') + '</i></span>';
            }).join('');
            return '<div class="fm-big">하루 ' + n + '병 중 새 분유 ' + k + '병</div><div class="fm-bottles">' + row + '</div>' +
                '<div class="fm-sub">병째로 번갈아 먹여요 (한 병에 섞지 않아요)</div>';
        }
        var a = Math.round(num(plan.amount)), nw = Math.round(a * S.r / 10) * 10, od = a - nw;
        return '<div class="fm-big">기존 ' + od + 'ml + 새 ' + nw + 'ml</div>' +
            '<div class="fm-sub">한 병(' + a + 'ml)에 두 분유를 ' + S.t + ' 로 타요 · 스푼 수는 분유통에 적힌 대로</div>';
    }
    function paintPlan() {
        var box = $('fm-plan'); if (!box) return;
        var o = readPlan(), plan = o.plan, st = plan ? stepOf(plan) : null;
        var start = $('fm-start-box');
        if (!plan || !st || st.day > st.total + 3) {
            if (plan && st && st.day > st.total + 3) { writePlan({ plan: null, at: o.at }); }
            box.innerHTML = ''; box.style.display = 'none';
            if (start) start.style.display = 'block';
            paintStartForm();
            return;
        }
        if (start) start.style.display = 'none';
        box.style.display = 'block';
        var days = '';
        for (var d = 1; d <= st.total; d++) {
            var sIdx = Math.ceil(d / st.pace) - 1;
            days += '<span class="fm-d' + (d === st.day ? ' now' : (d < st.day ? ' past' : '')) + '">' + d + '일<i>' + STEPS[sIdx].t + '</i></span>';
        }
        days += '<span class="fm-d' + (st.done ? ' now' : '') + '">' + (st.total + 1) + '일~<i>새 분유</i></span>';
        var by = plan.by === 'mom' ? ' · 엄마가 시작' : (plan.by === 'dad' ? ' · 아빠가 시작' : '');
        box.innerHTML =
            '<div class="fm-plan-head">' + (st.done ? '갈아타기 끝' : '오늘은 ' + st.day + '일째 · ' + st.total + '일 중') + '<span>' + (plan.method === 'alt' ? '번갈아' : '섞어서') + by + '</span></div>' +
            todayHTML(plan, st) +
            '<div class="fm-days">' + days + '</div>' +
            '<div class="fm-caution">토하거나 두드러기 · 설사가 이어지면 멈추고 소아과에 물어봐 주세요.</div>' +
            '<button type="button" class="fm-stop" onclick="window.Formula.stop()">' + (st.done ? '끝내기' : '그만하기') + '</button>';
    }
    function paintStartForm() {
        var alt = $('fm-m-alt') && $('fm-m-alt').classList.contains('on');
        var lab = $('pong-input-label'), inp = $('pong-input-val'), unit = $('pong-input-unit'), desc = $('pong-desc');
        if (lab) lab.textContent = alt ? '하루 몇 병 먹나요' : '한 번에 먹는 양';
        if (unit) unit.textContent = alt ? '병' : 'ml';
        if (desc) desc.innerHTML = alt
            ? '<b>스푼당 물 양(조유량)이 다른 분유</b>끼리 바꿀 때예요. 한 병에 섞으면 농도가 안 맞아서, 병째로 번갈아 먹여요.'
            : '<b>스푼당 물 양(조유량)이 같은 분유</b>끼리 바꿀 때예요. 한 병에 두 분유를 비율대로 타요.';
        var h = habit();
        if (inp) {
            inp.placeholder = alt ? (h ? String(h.perDay) : '6') : (h ? String(h.perFeed) : '160');
            if (inp.getAttribute('data-m') !== (alt ? 'alt' : 'mix')) { inp.value = h ? String(alt ? h.perDay : h.perFeed) : ''; inp.setAttribute('data-m', alt ? 'alt' : 'mix'); }
        }
        var sd = $('fm-start-date');
        if (sd) { var t = ymd(today()); sd.max = t; if (!sd.value) sd.value = t; }
    }
    function method(m) {
        if ($('fm-m-mix')) $('fm-m-mix').classList.toggle('on', m !== 'alt');
        if ($('fm-m-alt')) $('fm-m-alt').classList.toggle('on', m === 'alt');
        paintStartForm();
    }
    function pace(p) {
        if ($('fm-p-1')) $('fm-p-1').classList.toggle('on', p !== 2);
        if ($('fm-p-2')) $('fm-p-2').classList.toggle('on', p === 2);
    }
    function start() {
        var alt = $('fm-m-alt') && $('fm-m-alt').classList.contains('on');
        var v = Math.round(num($('pong-input-val') && $('pong-input-val').value));
        if (alt ? !(v >= 2 && v <= 12) : !(v >= 20 && v <= 360)) return toast(alt ? '하루 몇 병인지 적어 주세요 (2~12병)' : '한 번에 먹는 양을 ml 로 적어 주세요');
        var sd = ($('fm-start-date') && $('fm-start-date').value) || ymd(today());
        if (sd > ymd(today())) sd = ymd(today());
        var plan = { start: sd, method: alt ? 'alt' : 'mix', pace: ($('fm-p-2') && $('fm-p-2').classList.contains('on')) ? 2 : 1 };
        if (alt) plan.count = v; else plan.amount = v;
        var by = role(); if (by) plan.by = by;
        setPlan(plan);
        toast('갈아타기를 시작했어요 · 짝꿍 폰에도 보여요');
    }
    function stop() {
        var o = readPlan(), st = o.plan ? stepOf(o.plan) : null;
        if (st && st.done) { setPlan(null); return; }
        if (typeof window.askChoice !== 'function') { setPlan(null); return; }
        window.askChoice({ title: '갈아타기를 그만할까요?', sub: '엄마 · 아빠 폰 모두에서 멈춰요', options: [{ label: '그만하기', value: 'stop', danger: true }] })
            .then(function (v) { if (v === 'stop') { setPlan(null); toast('그만했어요'); } });
    }

    function css() {
        if ($('fm-style')) return;
        var s = document.createElement('style');
        s.id = 'fm-style';
        s.textContent =
            '#panel-formula .fm-who{font-size:13px;font-weight:700;color:var(--text-s);margin:-12px 0 16px;}' +
            '#panel-formula .fm-who b{color:var(--text-m);font-weight:800;}' +
            '#panel-formula .fm-card-in{background:#FBF8F3;border:1px solid #EDE6DE;border-radius:18px;padding:18px 16px;text-align:center;margin-top:16px;}' +
            '#panel-formula .fm-big{font-size:22px;font-weight:900;color:#4A413C;letter-spacing:-0.5px;line-height:1.35;word-break:keep-all;}' +
            '#panel-formula .fm-sub{font-size:13px;font-weight:700;color:#7A6F68;margin-top:6px;line-height:1.55;word-break:keep-all;}' +
            '#panel-formula .fm-foot{font-size:13.5px;font-weight:800;color:#6A61CE;margin-top:10px;word-break:keep-all;}' +
            '#panel-formula .fm-src,#panel-formula .fm-note{font-size:11.5px;font-weight:700;color:#A3958A;margin-top:12px;line-height:1.55;word-break:keep-all;}' +
            '#panel-formula .fm-y{display:flex;justify-content:space-between;align-items:center;font-size:13px;font-weight:700;color:#7A6F68;}' +
            '#panel-formula .fm-y b{font-size:15px;color:#4A413C;font-weight:900;}' +
            '#panel-formula .fm-say{font-size:12.5px;font-weight:700;color:#7A6F68;margin-top:6px;line-height:1.5;text-align:left;word-break:keep-all;}' +
            '#panel-formula .fm-seg{display:flex;gap:0;background:#F3EEE7;border-radius:12px;padding:3px;margin-bottom:12px;}' +
            '#panel-formula .fm-seg button{flex:1;border:none;background:transparent;padding:10px 0;border-radius:10px;font-size:13.5px;font-weight:800;color:#8A7F78;cursor:pointer;font-family:inherit;}' +
            '#panel-formula .fm-seg button.on{background:#FFF;color:#4A413C;box-shadow:0 1px 4px rgba(0,0,0,0.08);}' +
            '#panel-formula .fm-plan-head{display:flex;justify-content:space-between;align-items:center;font-size:15px;font-weight:900;color:#4A413C;margin-bottom:12px;}' +
            '#panel-formula .fm-plan-head span{font-size:12px;font-weight:800;color:#8A7F78;}' +
            '#panel-formula .fm-days{display:flex;gap:6px;flex-wrap:wrap;margin-top:16px;justify-content:center;}' +
            '#panel-formula .fm-d{display:inline-flex;flex-direction:column;align-items:center;min-width:44px;padding:7px 6px;border-radius:10px;background:#F6F2EC;font-size:12px;font-weight:800;color:#8A7F78;}' +
            '#panel-formula .fm-d i{font-style:normal;font-size:11px;font-weight:700;margin-top:2px;}' +
            '#panel-formula .fm-d.past{opacity:0.55;}' +
            '#panel-formula .fm-d.now{background:#7F77DD;color:#FFF;}' +
            '#panel-formula .fm-bottles{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-top:12px;}' +
            '#panel-formula .fm-b{display:inline-flex;flex-direction:column;align-items:center;width:40px;padding:6px 0;border-radius:10px;background:#F6F2EC;font-size:12px;font-weight:900;color:#8A7F78;}' +
            '#panel-formula .fm-b i{font-style:normal;font-size:10.5px;font-weight:800;margin-top:2px;}' +
            '#panel-formula .fm-b.on{background:#F0EEFB;color:#6A61CE;}' +
            '#panel-formula .fm-caution{font-size:12px;font-weight:700;color:#A3958A;margin-top:14px;line-height:1.5;word-break:keep-all;}' +
            '#panel-formula .fm-stop{margin-top:12px;width:100%;padding:12px;border-radius:12px;border:1px solid #EDE6DE;background:#FFF;font-size:13.5px;font-weight:800;color:#7A6F68;cursor:pointer;font-family:inherit;}';
        document.head.appendChild(s);
    }
    function render() { if (!$('panel-formula')) return; css(); prefill(); paintGuide(); paintPlan(); }

    /* 옛 이름 */
    window.calcFormulaAmount = function () { paintGuide(); };
    window.switchPongTab = function (m) { method(m === 'count' ? 'alt' : 'mix'); };
    window.calcPong = function () { start(); };

    window.Formula = { render: render, open: render, guide: guide, method: method, pace: pace, start: start, stop: stop, listen: listen, paintGuide: paintGuide, stepOf: stepOf, bottlesOf: bottlesOf };
})();
