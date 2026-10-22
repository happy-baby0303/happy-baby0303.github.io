/* ============================================================
   배냇함 — 시간 바퀴 (timewheel.js)

   왜 새로 만들었나
     맘마 · 기저귀 · 수면 기록의 월 · 일 · 시 · 분 바퀴는 '브라우저 스크롤 + 자석(scroll-snap)' 이었다.
     같은 숫자를 수십 벌 이어 붙여(분 바퀴 하나에 1,800칸) 끝없이 도는 척을 하고,
     멈추면 몰래 가운데 벌로 순간이동시켰다.
     갤럭시(크롬)에서는 잘 돌았는데 아이폰(사파리)에서는 잘 안 돌았다 (아이폰 쓰는 분 문의, 두 번째).
     사파리는 스크롤 안의 스크롤 · 자석 · 관성을 크롬과 다르게 다룬다. 같은 코드가 폰마다 다르게 굴렀다.

   이제 바퀴가 손가락을 직접 따라간다.
     · 브라우저 스크롤을 쓰지 않는다. 손가락이 움직인 만큼 숫자를 옮기고,
       놓으면 빠르기만큼 더 굴러가다 칸에 딱 멈춘다. 아이폰 · 갤럭시 · 컴퓨터에서 똑같이 돈다.
     · 숫자는 보이는 몇 칸만 그린다 (1,800칸 → 9칸). 끝이 없다 (59 다음 00).
     · 위 · 아래 숫자를 톡 누르면 그 숫자로 굴러간다. 컴퓨터는 마우스로 끌거나 휠로 돌린다.
     · 손을 떼는 순간 멈출 숫자가 정해진다. 굴러가는 동안 '저장' 을 눌러도 그 숫자로 저장된다.

   쓰는 법
     var w = TimeWheel(el, { min: 0, max: 59, value: 30, row: 38,
                             itemClass: 'sp-item', activeClass: 'on',
                             onChange: function (v) { ... } });   // 값이 바뀌면
     w.value                지금 값
     w.set(v)               바로 그 값으로 (onChange 안 부름)
     w.setRange(1, 30, v)   칸 수 바꾸기 (달마다 다른 '일')
   칸마다 itemClass 와 data-v(숫자) · data-val(두 자리 글자)이 붙고, 가운데 칸에 activeClass 가 붙는다.

   index.html 에서 script.js · sleeppicker.js 보다 먼저 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    function pad2(v) { return String(v).padStart(2, '0'); }
    function mod(a, n) { return ((a % n) + n) % n; }
    function now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }
    var raf = window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function (f) { return setTimeout(f, 16); };
    var caf = window.cancelAnimationFrame ? window.cancelAnimationFrame.bind(window) : clearTimeout;

    var FLING = 300;     // 튕긴 뒤 굴러가는 느낌 (ms). 클수록 멀리 · 오래
    var TAP = 110;       // 톡 눌러 옮길 때
    var STEP = 90;       // 휠 한 칸

    function TimeWheel(el, o) {
        if (!(this instanceof TimeWheel)) return new TimeWheel(el, o);
        o = o || {};
        var self = this;
        var ROW = o.row || 38;
        var HALF = o.half || 3;                       // 가운데 위 · 아래로 그릴 칸 수
        var itemClass = o.itemClass || 'tw-item';
        var activeClass = o.activeClass || 'on';
        var fmt = o.format || pad2;

        self.min = o.min; self.max = o.max;
        self.onChange = o.onChange || function () {};
        var count = self.max - self.min + 1;
        var pos = 0;                                  // 칸 단위 위치 (소수). 반올림한 칸이 가운데
        var anim = null;                              // 굴러가는 중
        var slots = [];

        /* 브라우저 스크롤을 끈다 — 손가락은 우리가 받는다 */
        el.innerHTML = '';
        try { el.scrollTop = 0; } catch (e) {}
        var st = el.style;
        st.overflow = 'hidden';
        st.position = 'relative';
        st.touchAction = 'none';
        st.scrollSnapType = 'none';
        st.webkitUserSelect = 'none'; st.userSelect = 'none';
        st.webkitTouchCallout = 'none';
        st.webkitTapHighlightColor = 'transparent';
        st.cursor = 'grab';
        el.setAttribute('role', 'spinbutton');

        for (var i = -HALF - 1; i <= HALF + 1; i++) {
            var s = document.createElement('div');
            s.className = itemClass + (i === 0 ? ' ' + activeClass : '');
            s.style.position = 'absolute';
            s.style.left = '0'; s.style.right = '0'; s.style.top = '0';
            s.style.height = ROW + 'px';
            s.style.margin = '0';
            s.style.willChange = 'transform';
            s.style.pointerEvents = 'none';
            // ⚠️ 원래 칸 스타일의 'transition: all' 이 위치 이동까지 늦춰서 숫자가 손가락보다 늦게 따라온다. 끈다
            s.style.transition = 'none';
            el.appendChild(s);
            slots.push(s);
        }

        function height() { return el.clientHeight || o.height || ROW * 3; }

        /* 가운데 칸(slots[HALF+1])은 늘 '고른 숫자' 자리다. 숫자만 갈아 끼우며 위치를 옮긴다 */
        function render() {
            var center = height() / 2;
            var base = Math.round(pos);
            for (var k = 0; k < slots.length; k++) {
                var idx = base + (k - HALF - 1);
                var v = self.min + mod(idx, count);
                var y = center + (idx - pos) * ROW - ROW / 2;
                var s = slots[k];
                s.style.transform = 'translate3d(0,' + y.toFixed(2) + 'px,0)';
                var txt = fmt(v);
                if (s.textContent !== txt) {
                    s.textContent = txt;
                    s.setAttribute('data-v', v);
                    s.setAttribute('data-val', txt);
                }
            }
            el.setAttribute('aria-valuenow', self.min + mod(base, count));
        }

        function valueAt(p) { return self.min + mod(Math.round(p), count); }

        function commit(v) {
            if (v === self.value) return;
            self.value = v;
            try { self.onChange(v); } catch (e) { console.warn('[시간 바퀴]', e); }
        }

        function stop() { if (anim) { caf(anim.id); anim = null; } }

        /* target 칸까지 굴러간다. 처음엔 손을 뗄 때 빠르기로, 끝으로 갈수록 천천히 (아이폰 관성과 같은 꼴) */
        function rollTo(target, tau) {
            stop();
            target = Math.round(target);
            commit(valueAt(target));                  // 멈출 숫자는 지금 정해진다
            var from = pos;
            if (Math.abs(target - from) < 0.002) { pos = target; render(); return; }
            tau = tau || FLING;
            var t0 = now();
            anim = { id: 0, target: target };
            var step = function () {
                if (!anim) return;
                pos = target - (target - from) * Math.exp(-(now() - t0) / tau);
                if (Math.abs(target - pos) < 0.004) { pos = target; render(); anim = null; return; }
                render();
                anim.id = raf(step);
            };
            anim.id = raf(step);
        }

        /* ---------- 손가락 ---------- */
        var drag = null;

        function startAt(y) {
            stop();
            drag = { y0: y, p0: pos, moved: false, pts: [{ t: now(), y: y }] };
            st.cursor = 'grabbing';
        }
        function moveTo(y) {
            if (!drag) return;
            var dy = y - drag.y0;
            if (!drag.moved && Math.abs(dy) > 4) drag.moved = true;
            pos = drag.p0 - dy / ROW;
            drag.pts.push({ t: now(), y: y });
            if (drag.pts.length > 10) drag.pts.shift();
            render();
        }
        function endAt(clientY) {
            if (!drag) return;
            var d = drag; drag = null;
            st.cursor = 'grab';
            if (!d.moved) {
                /* 톡 눌렀다 — 위 · 아래 숫자면 그 숫자로 */
                var r = el.getBoundingClientRect();
                var k = Math.round((clientY - r.top - height() / 2) / ROW);
                rollTo(Math.round(pos) + k, TAP);
                return;
            }
            /* 놓기 직전 0.1초 동안의 빠르기 */
            var t1 = now(), last = d.pts[d.pts.length - 1], first = last;
            for (var i = d.pts.length - 1; i >= 0; i--) {
                if (t1 - d.pts[i].t <= 100) first = d.pts[i]; else break;
            }
            var v = first === last ? 0 : (last.y - first.y) / Math.max(1, last.t - first.t);   // px/ms (아래로 +)
            if (t1 - last.t > 120) v = 0;                        // 멈췄다가 놓았다
            var speed = Math.abs(v), extra = 0;
            if (speed > 0.2) extra = -(v / ROW) * FLING * (1 + 0.5 * Math.min(speed, 3));   // 세게 튕길수록 더 멀리
            rollTo(pos + extra, FLING);
        }

        el.addEventListener('touchstart', function (e) {
            if (e.touches.length !== 1) return;
            startAt(e.touches[0].clientY);
        }, { passive: true });
        el.addEventListener('touchmove', function (e) {
            if (!drag) return;
            // ⚠️ 이게 없으면 아이폰이 바퀴 대신 창 전체를 끌어 올린다
            if (e.cancelable) e.preventDefault();
            moveTo(e.touches[0].clientY);
        }, { passive: false });
        el.addEventListener('touchend', function (e) {
            if (!drag) return;
            var t = e.changedTouches && e.changedTouches[0];
            endAt(t ? t.clientY : drag.y0);
            if (e.cancelable) e.preventDefault();          // 손을 뗀 뒤 따라오는 '가짜 클릭' 을 막는다
        }, { passive: false });
        el.addEventListener('touchcancel', function () {
            if (!drag) return;
            drag = null; st.cursor = 'grab';
            rollTo(pos, TAP);
        });

        // 컴퓨터: 마우스로 끌기
        el.addEventListener('mousedown', function (e) {
            if (e.button !== 0) return;
            e.preventDefault();
            startAt(e.clientY);
            var mm = function (ev) { moveTo(ev.clientY); };
            var mu = function (ev) {
                window.removeEventListener('mousemove', mm);
                window.removeEventListener('mouseup', mu);
                endAt(ev.clientY);
            };
            window.addEventListener('mousemove', mm);
            window.addEventListener('mouseup', mu);
        });
        // 컴퓨터: 휠
        var wheelAcc = 0;
        el.addEventListener('wheel', function (e) {
            e.preventDefault();
            wheelAcc += e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
            if (Math.abs(wheelAcc) < 24) return;
            var steps = Math.max(-5, Math.min(5, Math.round(wheelAcc / 50) || (wheelAcc > 0 ? 1 : -1)));
            wheelAcc = 0;
            var base = anim ? anim.target : Math.round(pos);
            rollTo(base + steps, STEP);
        }, { passive: false });

        /* ---------- 밖에서 쓰는 것 ---------- */
        self.set = function (v) {
            stop();
            v = Number(v);
            if (isNaN(v)) v = self.min;
            v = Math.min(self.max, Math.max(self.min, v));
            // 지금 자리에서 가장 가까운 같은 숫자 칸으로 (끝없이 도니까 어느 바퀴든 같다)
            var cur = Math.round(pos), half = Math.floor(count / 2);
            pos = cur + (mod(v - self.min - cur + half, count) - half);
            self.value = v;
            render();
        };
        self.setRange = function (mn, mx, v) {
            stop();
            self.min = mn; self.max = mx; count = mx - mn + 1;
            pos = 0;
            self.set(v === undefined ? mn : v);
        };
        self.refresh = render;

        // 숨어 있다가(창이 열리기 전) 보이게 되면 가운데를 다시 잰다
        if (window.ResizeObserver) {
            try { new ResizeObserver(function () { render(); }).observe(el); } catch (e) {}
        }

        self.set(o.value === undefined ? self.min : o.value);
    }

    window.TimeWheel = TimeWheel;
})();
