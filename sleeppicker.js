/* ============================================================
   배냇함 — 수면 기록 시간 바퀴 (sleeppicker.js)

   왜 필요한가
     맘마 · 기저귀 기록 창은 시간을 바퀴처럼 돌려서 고른다.
     수면 기록 창만 폰의 달력 · 시계 입력칸(2026. 10. 16. / 오후 2:27)이 떠서
     같은 앱 안에서 고르는 방식이 둘이었다.

   하는 일
     잠든 시간 · 일어난 시간 칸을 같은 바퀴(월 · 일 | 시 : 분)로 바꿔 보여 준다.
     ⚠️ 저장 · 계산은 지금처럼 원래 입력칸(v-sleep-start-date … v-sleep-end-time)이 한다.
        바퀴는 그 칸에 값을 넣어 주기만 한다. 그래서 저장 코드는 하나도 안 바뀐다.
     ⚠️ '방금 깼어요' 처럼 다른 코드가 입력칸을 바꾸면 바퀴도 따라 맞춘다.

   index.html 에서 script.js 뒤에 로드한다.
   ============================================================ */
(function () {
    'use strict';

    var ROW = 38;          // 한 칸 높이 (맘마 창보다 조금 낮게: 바퀴가 둘이라 창이 길어진다)
    var REPEAT = 21;       // 끝없이 도는 것처럼 보이게 같은 숫자를 여러 벌
    var CENTER = 10;

    function pad(n) { return String(n).padStart(2, '0'); }
    function daysIn(y, m) { return new Date(y, m, 0).getDate(); }

    function css() {
        if (document.getElementById('sleep-picker-css')) return;
        var st = document.createElement('style');
        st.id = 'sleep-picker-css';
        st.textContent =
            '.sp-row{display:flex;align-items:center;gap:8px;}' +
            '.sp-label{width:46px;flex-shrink:0;text-align:center;font-size:13px;font-weight:800;color:#A3958A;line-height:1.35;}' +
            '.sp-wrap{flex:1;display:flex;justify-content:center;align-items:center;height:114px;position:relative;overflow:hidden;background:var(--bg-sub);border-radius:16px;}' +
            '.sp-band{position:absolute;top:50%;left:8px;right:8px;height:38px;transform:translateY(-50%);background:rgba(127,119,221,0.08);border:1px solid rgba(127,119,221,0.15);border-radius:12px;pointer-events:none;}' +
            /* ⚠️ 바퀴가 36px 띠라서, 손가락이 조금만 벗어나도(월 · 일 글자 · 빈칸) 아무것도 안 움직였다 (아이폰 쓰는 분 문의: 스크롤이 잘 안 된다).
                  이제 바퀴 넷이 상자를 4등분한다. 글자(월 · 일 · :)와 가운데 선은 위에 얹기만 하고 손가락은 통과한다. */
            '.sp-cells{display:flex;width:100%;height:100%;position:relative;z-index:1;}' +
            '.sp-cell{flex:1;min-width:0;position:relative;height:100%;}' +
            '.sp-col{height:100%;width:100%;overflow-y:auto;scroll-snap-type:y mandatory;overscroll-behavior:contain;-ms-overflow-style:none;scrollbar-width:none;}' +
            '.sp-col::-webkit-scrollbar{display:none;}' +
            '.sp-item{height:38px;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#C4B5A9;scroll-snap-align:center;flex-shrink:0;box-sizing:border-box;transition:all .2s cubic-bezier(.2,.8,.2,1);}' +
            '.sp-item.on{font-size:22px;font-weight:900;color:var(--text-m);}' +
            '.sp-date .sp-item{justify-content:flex-end;padding-right:24px;}' +
            '.sp-hour .sp-item{justify-content:flex-end;padding-right:11px;}' +
            '.sp-min .sp-item{justify-content:flex-start;padding-left:11px;}' +
            '.sp-unit{position:absolute;top:50%;right:6px;transform:translateY(-50%);font-size:14px;font-weight:800;color:var(--text-m);pointer-events:none;}';
        document.head.appendChild(st);
    }

    /* 바퀴 하나 (월 · 일 · 시 · 분 중 하나)
       ⚠️ 브라우저 스크롤로 돌리던 바퀴가 아이폰에서 잘 안 돌았다 (아이폰 쓰는 분 문의, 두 번째).
          이제 손가락을 직접 따라가는 바퀴(timewheel.js)를 쓴다. 아이폰 · 갤럭시가 똑같이 돈다.
          timewheel.js 가 없을 때(옛 저장본)만 아래 ScrollColumn 으로 돈다. */
    function Column(el, min, max, value, onPick) {
        if (!window.TimeWheel) return new ScrollColumn(el, min, max, value, onPick);
        var self = this;
        var w = window.TimeWheel(el, {
            min: min, max: max, value: value, row: ROW,
            itemClass: 'sp-item', activeClass: 'on',
            onChange: function (v) { self.value = v; onPick(); }
        });
        self.el = el; self.min = min; self.max = max; self.value = w.value;
        self.build = function (mn, mx, v) { self.min = mn; self.max = mx; w.setRange(mn, mx, v); self.value = w.value; };
        self.set = function (v) { w.set(v); self.value = w.value; };
    }

    /* 옛 바퀴 (브라우저 스크롤) — timewheel.js 를 못 읽었을 때만 */
    function ScrollColumn(el, min, max, value, onPick) {
        var self = this;
        self.el = el; self.min = min; self.max = max; self.onPick = onPick;
        self.build = function (mn, mx, v) {
            self.min = mn; self.max = mx;
            var count = mx - mn + 1, html = ['<div style="height:38px;flex-shrink:0;"></div>'];
            for (var k = 0; k < REPEAT; k++) for (var i = mn; i <= mx; i++) html.push('<div class="sp-item" data-v="' + i + '">' + pad(i) + '</div>');
            html.push('<div style="height:38px;flex-shrink:0;"></div>');
            el.innerHTML = html.join('');
            self.items = el.querySelectorAll('.sp-item');
            self.set(v);
        };
        self.set = function (v) {
            var count = self.max - self.min + 1;
            v = Math.min(self.max, Math.max(self.min, v));
            var idx = (v - self.min) + count * CENTER;
            el.style.scrollBehavior = 'auto';
            el.scrollTop = idx * ROW;
            self.mark(idx);
            self.value = v;
        };
        self.mark = function (idx) {
            for (var i = 0; i < self.items.length; i++) self.items[i].classList.remove('on');
            if (self.items[idx]) self.items[idx].classList.add('on');
        };
        // 위 · 아래 칸을 누르면 그 숫자로 굴러간다
        el.addEventListener('click', function (e) {
            var it = e.target.closest('.sp-item');
            if (!it) return;
            var idx = Array.prototype.indexOf.call(self.items, it);
            if (idx < 0) return;
            el.style.scrollBehavior = 'smooth';
            el.scrollTop = idx * ROW;
        });
        el.addEventListener('scroll', function () {
            clearTimeout(self.t);
            self.t = setTimeout(function () {
                var count = self.max - self.min + 1;
                var idx = Math.round(el.scrollTop / ROW);
                if (idx < count * 4 || idx > count * (REPEAT - 4)) {   // 끝에 가까우면 몰래 가운데 벌로
                    idx = (idx % count) + count * CENTER;
                    el.style.scrollBehavior = 'auto';
                    el.scrollTop = idx * ROW;
                }
                self.mark(idx);
                var it = self.items[idx];
                if (!it) return;
                var v = parseInt(it.getAttribute('data-v'), 10);
                if (v !== self.value) { self.value = v; self.onPick(); }
            }, 90);
        }, { passive: true });
        self.build(min, max, value);
    }

    /* 입력칸 두 개(날짜 · 시각) 위에 바퀴를 붙인다 */
    function mount(dateId, timeId, key) {
        var dIn = document.getElementById(dateId), tIn = document.getElementById(timeId);
        if (!dIn || !tIn || document.getElementById('sp-' + key)) return null;
        var row = tIn.parentNode;                                   // 두 칸이 나란히 들어 있는 줄
        var title = row.previousElementSibling;                     // '잠든 시간' · '일어난 시간'
        var line = document.createElement('div');
        line.className = 'sp-row';
        var label = document.createElement('div');
        label.className = 'sp-label';
        label.innerHTML = key === 'start' ? '잠든<br>시간' : '깬<br>시간';
        var box = document.createElement('div');
        box.id = 'sp-' + key;
        box.className = 'sp-wrap';
        line.appendChild(label);
        line.appendChild(box);
        box.innerHTML = '<div class="sp-band"></div>' +
            '<div class="sp-cells">' +
                '<div class="sp-cell sp-date"><div class="sp-col" data-k="m"></div><span class="sp-unit">월</span></div>' +
                '<div class="sp-cell sp-date"><div class="sp-col" data-k="d"></div><span class="sp-unit">일</span></div>' +
                '<div class="sp-cell sp-hour"><div class="sp-col" data-k="h"></div></div>' +
                '<div class="sp-cell sp-min"><div class="sp-col" data-k="i"></div></div>' +
                '<div style="position:absolute;left:50%;top:50%;width:2px;height:22px;transform:translate(-50%,-50%);background:var(--border);border-radius:1px;opacity:.6;pointer-events:none;"></div>' +
                '<div style="position:absolute;left:75%;top:50%;transform:translate(-50%,-55%);font-size:21px;font-weight:900;color:var(--text-m);pointer-events:none;">:</div>' +
            '</div>';
        row.parentNode.insertBefore(line, row);
        row.style.display = 'none';                                 // 원래 칸은 숨겨 두고 값만 쓴다
        if (title) title.style.display = 'none';                    // 이름표는 바퀴 왼쪽으로 옮겼다
        // 바퀴가 둘이라 창이 길어진다 → 여백을 줄여 '총 몇 시간' 과 '자는 중' 버튼이 한 화면에 보이게
        var section = line.parentNode;
        if (key === 'start' && section) {
            section.style.marginBottom = '12px';
            var card = section.parentNode;
            if (card && card.style) card.style.padding = '14px 12px';
        }
        if (key === 'end' && section) section.style.paddingTop = '12px';

        var st = { year: 0, baseMonth: 0 };
        function read() {
            var d = (dIn.value || '').split('-').map(Number), t = (tIn.value || '').split(':').map(Number);
            var now = new Date();
            return { y: d[0] || now.getFullYear(), m: d[1] || now.getMonth() + 1, d: d[2] || now.getDate(), h: isNaN(t[0]) ? now.getHours() : t[0], i: isNaN(t[1]) ? now.getMinutes() : t[1] };
        }
        var cols = {};
        function write() {
            var m = cols.m.value, y = st.year;
            if (st.baseMonth === 1 && m === 12) y = st.year - 1;           // 1월에서 12월로 넘기면 작년
            else if (st.baseMonth === 12 && m === 1) y = st.year + 1;      // 12월에서 1월로 넘기면 내년
            var maxD = daysIn(y, m);
            if (cols.d.max !== maxD) cols.d.build(1, maxD, Math.min(cols.d.value, maxD));
            dIn.value = y + '-' + pad(m) + '-' + pad(cols.d.value);
            tIn.value = pad(cols.h.value) + ':' + pad(cols.i.value);
            try { if (typeof window.calcSleepRange === 'function') window.calcSleepRange(); } catch (e) {}
        }
        var v = read();
        st.year = v.y; st.baseMonth = v.m;
        var el = function (k) { return box.querySelector('.sp-col[data-k="' + k + '"]'); };
        cols.m = new Column(el('m'), 1, 12, v.m, write);
        cols.d = new Column(el('d'), 1, daysIn(v.y, v.m), v.d, write);
        cols.h = new Column(el('h'), 0, 23, v.h, write);
        cols.i = new Column(el('i'), 0, 59, v.i, write);

        var api = {
            /* 다른 코드가 입력칸을 바꿨거나(방금 깼어요), 숨어 있다 보이게 됐을 때 자리를 다시 맞춘다 */
            sync: function () {
                var r = read();
                st.year = r.y; st.baseMonth = r.m;
                if (cols.d.max !== daysIn(r.y, r.m)) cols.d.build(1, daysIn(r.y, r.m), r.d);
                cols.m.set(r.m); cols.d.set(r.d); cols.h.set(r.h); cols.i.set(r.i);
            }
        };
        // ⚠️ 숨어 있을 때(display:none) 맞춘 스크롤 자리는 보이는 순간 0 으로 돌아간다 → 보이면 다시 맞춘다
        if (window.ResizeObserver) {
            var last = 0;
            new ResizeObserver(function () {
                var h = box.offsetHeight;
                if (h && !last) api.sync();
                last = h;
            }).observe(box);
        }
        return api;
    }

    var pickers = {};
    function enhance() {
        css();
        pickers.start = mount('v-sleep-start-date', 'v-sleep-start-time', 'start');
        pickers.end = mount('v-sleep-end-date', 'v-sleep-end-time', 'end');
    }
    function resync() {
        if (pickers.start) pickers.start.sync();
        if (pickers.end) pickers.end.sync();
    }

    function wrap() {
        var orig = window.openTrackerSheet;
        if (typeof orig !== 'function' || orig.__sleepPicker) return false;
        var w = function (type) {
            var out = orig.apply(this, arguments);
            if (type === 'sleep') {
                pickers = {};
                setTimeout(enhance, 30);            // 시트가 그려지고(10ms) 자는 중/깬 상태가 정해진 뒤
            }
            return out;
        };
        w.__sleepPicker = true;
        Object.keys(orig).forEach(function (k) { try { w[k] = orig[k]; } catch (e) {} });
        window.openTrackerSheet = w;

        var tog = window.toggleIsSleeping;
        if (typeof tog === 'function' && !tog.__sleepPicker) {
            var t2 = function () {
                var out = tog.apply(this, arguments);
                setTimeout(resync, 0);
                return out;
            };
            t2.__sleepPicker = true;
            window.toggleIsSleeping = t2;
        }
        return true;
    }

    if (!wrap()) document.addEventListener('DOMContentLoaded', wrap);
    // 다른 파일이 나중에 openTrackerSheet 를 다시 감쌀 수 있다 → 한 번 더 확인
    window.addEventListener('load', function () { setTimeout(wrap, 0); });
})();
