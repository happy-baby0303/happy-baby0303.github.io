/* ============================================================
   배냇함 — 재우기 소리 (sleepsound.js)

   왜
     아기를 재울 때 백색소음 · 빗소리 · 배 속 소리 · 자장가를 트는 집이 많다.
     그러려고 유튜브나 다른 앱을 따로 켜면, 화면이 밝고 광고가 나오고, 잠든 시각은 또 배냇함에 따로 적어야 한다.
     틀고 → 화면은 까맣게 → 잠들면 한 번 누르기. 이 흐름을 배냇함 안에서 끝낸다.

   하는 일
     소리 고르기 창 (잠 기록 창 · 홈 '다시 졸려할 거예요' 줄에서 연다)
       🌀 백색소음   🌧️ 빗소리   🤰 엄마 배 속 소리   🎵 오르골 자장가
       칸을 누르면 바로 나온다 (한 번 더 누르면 끈다). 15분 · 30분 · 1시간 · 계속.
       끝날 땐 30초 동안 천천히 작아진다 — 뚝 끊기면 아기가 깬다.
     밤 화면 — 까만 화면에 남은 시간 · '잠들었어요' · '끄기'. 10초 안 건드리면 글씨도 흐려진다.
       화면이 저절로 꺼지지 않게 잡아 두고(Wake Lock), 소리가 끝나면 놓는다 (그 뒤엔 폰이 알아서 꺼진다).
       흐려진 화면을 처음 건드리면 밝히기만 한다 — 어두운 데서 더듬다 '끄기' 를 누르지 않게.
       '잠들었어요' = 잠 기록 창의 시작 단추와 같다 (startSleepTimer). 낮잠 · 밤잠은 빠른 기록과 같은 셈.
       소리가 끝나도 밝은 화면으로 돌아가지 않는다 — 한밤에 방이 환해지면 안 된다.
       홈 화면 앱(크롬)의 맨 위 상태 줄 색(theme-color)도 밤 화면 동안만 까맣게.
     창을 닫아도 소리는 계속 — 아래 탭 위에 작은 줄 (소리 이름 · 남은 시간 · 밤 화면 · 끄기).

   어떻게 — 소리 파일이 없다
     네 소리 모두 폰이 직접 만든다 (32 kHz 스테레오). 받아 오는 파일이 없어 저작권 걱정이 없고 앱도 안 무거워진다.
     씨앗을 정해 두어 언제 어디서 만들어도 같은 소리다 (노드 · 크롬에서 같은 결과를 확인했다).
     한 바퀴(백색소음 30초 · 비 · 배 속 40초 · 오르골 81초)의 끝과 처음이 맞물리게 만들어서 이음매 없이 돌려 튼다.
       필터는 끝 1초로 데운 뒤 처음부터 거르고, 빗방울 · 심장 소리 · 오르골 음은 끝을 넘어가면 처음으로 감는다.
     크기는 BS.1770 크기(LUFS)와 '폰 스피커로 들을 때' 크기를 반반 섞어 맞춘다 — 소리를 바꿔도 폰에서 갑자기 커지거나 작아지지 않게.
     만드는 일은 따로 일꾼(Worker)에서 한다. 느린 폰에선 몇 초 걸리는데 그동안 화면이 멈추면 안 된다.
       창을 열면 마지막에 고른 소리를 미리 만들어 둔다. 만든 소리는 두 개까지만 들고 있는다 (메모리).

   소리 하나하나
     백색소음 쏴— 하고 고르게. 핑크 · 브라운 소리를 섞고 7.5 kHz 위를 깎았다 (흰 소리 그대로는 치익 하고 날카롭다). 세기는 일정.
     비      멀리 깔린 비(핑크 소리) + 가까운 잔 방울 · 굵은 방울 '톡' + 가끔 고인 물 '퐁'. 바람결 따라 조금씩 굵어졌다 가늘어진다.
     배 속   낮게 웅— (브라운 소리) + 엄마 숨결(4초) + 엄마 심장 1분 66번 '쿵-쿵' + 그때마다 '쉭—'.
             폰 스피커는 400 Hz 아래가 거의 안 나와서, 심장 소리에 300~560 Hz 를 조금 넣어 폰에서도 박동이 들리게 했다.
     오르골  브람스 자장가 → 반짝반짝 작은 별. 쇠 살 소리 (기본음 + 6.27배 · 17.55배 울림) + 방 울림.
             저작권: 원곡은 브람스(1897년 사망) · 작자 미상 프랑스 민요(1761년 출판) — 저작권법 39조 사후 70년이 지났다.
             원곡 음표만 코드에 적어 쓴다 · 가사 없음(한국어 번안 가사는 따로 권리가 있다) · 녹음 · 미디 악기 소리 없음
             (시중 음원의 연주자 · 음반 제작자 권리와 무관) · 반주는 도 · 파 · 솔 기본 화음만 (남의 편곡을 따르지 않았다).
     소리 분류 모델(AudioSet 527가지)로 들어 보면 백색소음은 '핑크 · 백색 소음', 비는 '비 · 빗방울', 배 속은 '심장 박동',
     오르골은 '글로켄슈필' 이 1등.
     쉬— 소리는 뺐다. 두 판을 만들어 들어 봤는데 사람 소리로 안 들렸다 (증기 · 바람 소리 같았다).
     넣는다면 만든 소리가 아니라 직접 녹음한 소리로 (남의 녹음은 저작권 때문에 안 된다).

   안전
     창 맨 위에 늘 — 폰은 아기 머리맡에서 멀찍이(2m쯤), 소리는 조용히 말하는 소리보다 작게.
     (2014년 소아과 학술지 Pediatrics 연구와 미국소아과학회 안내 — 아기 침대에서 2m 넘게 · 작게 · 오래 틀지 않기)
     처음 고르는 시간은 30분. '계속' 을 고르면 '잠들고 나면 꺼 주세요' 를 붙인다.

   바깥과 잇는 곳
     window.openSleepSounds()   소리 고르기 창
     window.closeSleepSounds() · window.closeSleepNight()   backbutton.js 가 뒤로가기로 닫는다
     window.__sleepSoundRender(kind) → Promise<{ sr, L, R, sec }>   (시험 · 미리 듣기 파일 만들 때)
   ============================================================ */
(function (root) {
  'use strict';

  /* ═══════════ 소리 만드는 곳 — 이 함수 통째로 일꾼(Worker)에도 보낸다. 바깥 변수를 쓰면 안 된다 ═══════════ */
  function ENGINE(root) {
    'use strict';
    var SR = 32000, TAU = Math.PI * 2;

    /* ───────── 바탕 연장 ───────── */
    function rnd(seed) {
      var s = (seed >>> 0) || 1;
      return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    }
    function tick() { return new Promise(function (r) { setTimeout(r, 0); }); }

    // 2차 필터 계수 (RBJ). 선반(hs/ls)은 q 0.7071 을 쓴다.
    function coef(type, f, q, db) {
      var w = TAU * f / SR, cw = Math.cos(w), sw = Math.sin(w), al = sw / (2 * q), A = Math.pow(10, (db || 0) / 40), sa = 2 * Math.sqrt(A) * al;
      var b0, b1, b2, a0, a1, a2;
      if (type === 'lp') { b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = b0; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; }
      else if (type === 'hp') { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = b0; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; }
      else if (type === 'bp') { b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * cw; a2 = 1 - al; }
      else if (type === 'pk') { b0 = 1 + al * A; b1 = -2 * cw; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * cw; a2 = 1 - al / A; }
      else if (type === 'hs') {
        b0 = A * ((A + 1) + (A - 1) * cw + sa); b1 = -2 * A * ((A - 1) + (A + 1) * cw); b2 = A * ((A + 1) + (A - 1) * cw - sa);
        a0 = (A + 1) - (A - 1) * cw + sa; a1 = 2 * ((A - 1) - (A + 1) * cw); a2 = (A + 1) - (A - 1) * cw - sa;
      } else {  // ls
        b0 = A * ((A + 1) - (A - 1) * cw + sa); b1 = 2 * A * ((A - 1) - (A + 1) * cw); b2 = A * ((A + 1) - (A - 1) * cw - sa);
        a0 = (A + 1) + (A - 1) * cw + sa; a1 = -2 * ((A - 1) + (A + 1) * cw); a2 = (A + 1) + (A - 1) * cw - sa;
      }
      return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
    }
    // 고리 거르기 — 끝 1초로 필터를 데운 뒤 처음부터 거른다. 그래서 거른 뒤에도 끝과 처음이 이어진다.
    function cf(x, c) {
      var n = x.length, b0 = c[0], b1 = c[1], b2 = c[2], a1 = c[3], a2 = c[4], z1 = 0, z2 = 0, i, v, y, w = Math.min(n, SR);
      for (i = n - w; i < n; i++) { v = x[i]; y = b0 * v + z1; z1 = b1 * v - a1 * y + z2; z2 = b2 * v - a2 * y; }
      for (i = 0; i < n; i++) { v = x[i]; y = b0 * v + z1; z1 = b1 * v - a1 * y + z2; z2 = b2 * v - a2 * y; x[i] = y; }
      return x;
    }
    function chain(x, list) { for (var k = 0; k < list.length; k++) cf(x, list[k]); return x; }
    function white(n, r) { var x = new Float32Array(n); for (var i = 0; i < n; i++) x[i] = r() * 2 - 1; return x; }
    function pink(n, r) {   // Kellet 의 핑크 — 이것도 끝으로 데우고 처음부터
      var w = white(n, r), x = new Float32Array(n), b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, i, k, v, m = Math.min(n, SR);
      for (k = -m; k < n; k++) {
        i = k < 0 ? n + k : k; v = w[i];
        b0 = 0.99886 * b0 + v * 0.0555179; b1 = 0.99332 * b1 + v * 0.0750759; b2 = 0.969 * b2 + v * 0.153852;
        b3 = 0.8665 * b3 + v * 0.3104856; b4 = 0.55 * b4 + v * 0.5329522; b5 = -0.7616 * b5 - v * 0.016898;
        if (k >= 0) x[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + v * 0.5362) * 0.11;
        b6 = v * 0.115926;
      }
      return x;
    }
    function brown(n, r) {
      var w = white(n, r), x = new Float32Array(n), y = 0, i, k, m = Math.min(n, SR);
      for (k = -m; k < n; k++) { i = k < 0 ? n + k : k; y = 0.996 * y + w[i] * 0.06; if (k >= 0) x[i] = y; }
      return x;
    }
    function rms(x) { var s = 0; for (var i = 0; i < x.length; i++) s += x[i] * x[i]; return Math.sqrt(s / x.length) || 1e-9; }
    function addTo(d, s, g) { for (var i = 0; i < d.length; i++) d[i] += s[i] * g; }
    // 고리 한 바퀴에 k0~k1 번 도는 느린 물결을 겹친 것 (표준편차 1) — 바람결 · 숨결
    function slow(n, r, k0, k1) {
      var K = [], i, k, m = Math.ceil(n / 64) + 2, c = new Float64Array(m), out = new Float32Array(n), v = 0;
      for (k = k0; k <= k1; k++) { K.push([k, 1 / Math.sqrt(k), r() * TAU]); v += 1 / k / 2; }
      v = 1 / Math.sqrt(v);
      for (i = 0; i < m; i++) { var t = i * 64 / n, a = 0; for (k = 0; k < K.length; k++) a += K[k][1] * Math.sin(TAU * K[k][0] * t + K[k][2]); c[i] = a * v; }
      for (i = 0; i < n; i++) { var p = i / 64, j = p | 0; out[i] = c[j] + (c[j + 1] - c[j]) * (p - j); }
      return out;
    }
    // 빠른 떨림 (fc Hz 아래, 표준편차 1)
    function wobble(n, r, fc) {
      var x = white(n, r); chain(x, [coef('lp', fc, 0.7071), coef('lp', fc, 0.7071)]);
      var s = 1 / rms(x); for (var i = 0; i < n; i++) x[i] *= s; return x;
    }
    // 포아송 — 세기(g²)에 따라 많아졌다 적어졌다
    function poisson(r, sec, rate, g, fn) {
      var lmax = rate * 2.4, t = 0, n = g.length, gg;
      for (;;) { t += -Math.log(1 - r()) / lmax; if (t >= sec) break; gg = g[Math.floor(t * SR) % n]; if (r() * lmax < rate * gg * gg) fn(t); }
    }
    // 짧은 부딪힘 — 아주 짧은 잡음을 공명(f, Q)에 통과. 고리를 넘어가면 처음으로 감는다.
    function hit(L, R, s0, f, q, amp, pan, r, exMs) {
      var n = L.length, tau = q / (Math.PI * f), len = Math.min(n, Math.ceil((tau * 7 + exMs / 1000) * SR)), tmp = new Float32Array(len);
      var rr = Math.exp(-1 / (tau * SR)), w = TAU * f / SR, c1 = 2 * rr * Math.cos(w), c2 = -rr * rr, y1 = 0, y2 = 0, ex = Math.max(4, Math.round(exMs / 1000 * SR)), pk = 1e-9, j, y, e;
      for (j = 0; j < len; j++) {
        e = j < ex ? (r() * 2 - 1) * (0.5 - 0.5 * Math.cos(TAU * (j + 0.5) / ex)) : 0;
        y = e + c1 * y1 + c2 * y2; y2 = y1; y1 = y; tmp[j] = y; if (y > pk) pk = y; else if (-y > pk) pk = -y;
      }
      var gl = Math.cos(pan * Math.PI / 2) * amp / pk, gr = Math.sin(pan * Math.PI / 2) * amp / pk, idx = s0 % n;
      for (j = 0; j < len; j++) { L[idx] += tmp[j] * gl; R[idx] += tmp[j] * gr; if (++idx >= n) idx = 0; }
    }
    // 물방울 '퐁' — 소리가 짧게 올라가며 사라진다 (공기방울 울림)
    function bubble(L, R, s0, f0, amp, pan) {
      var n = L.length, d = 0.13 * f0 + 0.0072 * Math.pow(f0, 1.5), len = Math.min(n, Math.ceil(7 / d * SR)), sg = 0.1 * d;
      var gl = Math.cos(pan * Math.PI / 2) * amp, gr = Math.sin(pan * Math.PI / 2) * amp, idx = s0 % n, ph = 0, j, t, v;
      for (j = 0; j < len; j++) {
        t = j / SR; v = Math.sin(ph) * Math.exp(-d * t) * (1 - Math.exp(-t / 0.0004));
        L[idx] += v * gl; R[idx] += v * gr; ph += TAU * f0 * (1 + sg * t) / SR; if (++idx >= n) idx = 0;
      }
    }

    /* ───────── ① 백색소음 ─────────
       쏴— 하고 고르게 깔리는 소리. 집 안 잡소리(문 닫는 소리 · 말소리)를 덮어 준다.
       흰 소리 그대로는 치익 하고 날카로워서, 핑크 소리(고음이 조금씩 줄어드는)와 브라운 소리(더 낮고 둥근)를 섞고
       7.5 kHz 위를 깎았다. 왼쪽 · 오른쪽을 반쯤 다르게 해서 방에 넓게 퍼지는 느낌. 세기는 일정하다 (출렁이면 오히려 신경 쓰인다). */
    async function makeWhite() {
      var r = rnd(3030), sec = 30, n = sec * SR, i;
      var c = pink(n, r), pl = pink(n, r), pr = pink(n, r), bc = brown(n, r), L = new Float32Array(n), R = new Float32Array(n);
      var gp = 1 / rms(c), gb = 1 / rms(bc);
      for (i = 0; i < n; i++) { var cm = 0.7 * c[i] * gp + 0.55 * bc[i] * gb; L[i] = cm + 0.45 * pl[i] * gp; R[i] = cm + 0.45 * pr[i] * gp; }
      c = pl = pr = bc = null;
      var f = [coef('hp', 40, 0.7071), coef('lp', 7500, 0.7071), coef('hs', 4000, 0.7071, -3)];
      chain(L, f); chain(R, f);
      return { L: L, R: R, sec: sec };
    }

    /* ───────── ② 빗소리 ─────────
       멀리서 쏴— 깔리는 비(핑크) + 가까이 떨어지는 잔 방울 · 굵은 방울 + 가끔 고인 물에 '퐁'. 바람결 따라 조금씩 굵어졌다 가늘어진다. */
    async function makeRain() {
      var r = rnd(4402), sec = 40, n = sec * SR, i;
      var g = slow(n, r, 2, 9); for (i = 0; i < n; i++) g[i] = 1 + 0.14 * g[i];
      var c = pink(n, r), pl = pink(n, r), pr = pink(n, r), L = new Float32Array(n), R = new Float32Array(n);
      for (i = 0; i < n; i++) { L[i] = (0.75 * c[i] + 0.66 * pl[i]) * g[i]; R[i] = (0.75 * c[i] + 0.66 * pr[i]) * g[i]; }
      c = pl = pr = null;
      var wash = [coef('hp', 250, 0.7071), coef('lp', 7000, 0.7071), coef('pk', 2200, 0.7, 2)];
      chain(L, wash); chain(R, wash);
      await tick();
      var dl = new Float32Array(n), dr = new Float32Array(n), tl = new Float32Array(n), tr = new Float32Array(n), bl = new Float32Array(n), br = new Float32Array(n);
      poisson(r, sec, 420, g, function (t) { hit(dl, dr, Math.floor(t * SR), 2000 * Math.pow(3, r()), 1.5 + r() * 2.5, Math.pow(10, -1.5 * r()), r(), r, 0.6); });
      poisson(r, sec, 26, g, function (t) { hit(tl, tr, Math.floor(t * SR), 420 * Math.pow(4.3, r()), 2 + r() * 4, Math.pow(10, -1.2 * r()), r(), r, 1.2); });
      poisson(r, sec, 3.5, g, function (t) { bubble(bl, br, Math.floor(t * SR), 900 * Math.pow(2.4, r()), Math.pow(10, -0.8 * r()), r()); });
      await tick();
      var w0 = rms(L), gd = w0 / rms(dl) * Math.pow(10, -7 / 20), gt = w0 / rms(tl) * Math.pow(10, -11 / 20), gb = w0 / rms(bl) * Math.pow(10, -17 / 20);
      for (i = 0; i < n; i++) { L[i] += dl[i] * gd + tl[i] * gt + bl[i] * gb; R[i] += dr[i] * gd + tr[i] * gt + br[i] * gb; }
      var fin = [coef('hp', 110, 0.7071), coef('lp', 9500, 0.7071)];
      chain(L, fin); chain(R, fin);
      return { L: L, R: R, sec: sec };
    }

    /* ───────── ③ 엄마 배 속 소리 ─────────
       배 속에서 듣던 소리: 낮게 웅— 깔린 소리, 엄마 숨결(4초에 한 번) 따라 아주 조금 출렁,
       엄마 심장 1분 66번 '쿵-쿵' 과 그때마다 피가 밀려오는 '쉭—'. 폰 스피커로도 들리게 300~500 Hz 를 조금 살렸다. */
    async function makeWomb() {
      var r = rnd(5180), N = 44, sec = 40, n = sec * SR, i, k;
      var iv = [], s = 0; for (k = 0; k < N; k++) { var v0 = 1 + (r() - 0.5) * 0.05; iv.push(v0); s += v0; }
      var bt = [], t = 0; for (k = 0; k < N; k++) { iv[k] *= sec / s; bt.push(t); t += iv[k]; }
      var c = brown(n, r), bl = brown(n, r), br = brown(n, r), L = new Float32Array(n), R = new Float32Array(n), ph = r() * TAU;
      for (i = 0; i < n; i++) { var br_ = 1 + 0.1 * Math.sin(TAU * 10 * i / n + ph); L[i] = (0.85 * c[i] + 0.53 * bl[i]) * br_; R[i] = (0.85 * c[i] + 0.53 * br[i]) * br_; }
      c = bl = br = null;
      var bedF = [coef('hp', 80, 0.7071), coef('ls', 150, 0.7071, -4), coef('lp', 1000, 0.7071), coef('pk', 380, 0.8, 4)];
      chain(L, bedF); chain(R, bedF);
      await tick();
      var w = pink(n, r); chain(w, [coef('bp', 300, 0.9), coef('lp', 900, 0.7071)]);
      var B = 32, nb = Math.ceil(n / B), pe = new Float32Array(nb + 1), fl = 0.22;
      function h(x) { return x < 0 ? 0 : x < 0.08 ? 0.5 - 0.5 * Math.cos(Math.PI * x / 0.08) : Math.exp(-(x - 0.08) / 0.22); }
      for (var b = 0, kk = 0; b <= nb; b++) {
        var tb = Math.min(b * B, n) / SR;
        while (kk < N - 1 && bt[kk + 1] <= tb) kk++;
        var prev = kk > 0 ? bt[kk - 1] : bt[N - 1] - sec;
        pe[b] = fl + (1 - fl) * Math.min(1, h(tb - bt[kk] - 0.03) + h(tb - prev - 0.03));
      }
      var hl = new Float32Array(n);
      var S1 = [[58, 1, 0.032], [115, 0.65, 0.024], [190, 0.45, 0.016], [310, 0.32, 0.012], [480, 0.16, 0.008]];
      var S2 = [[72, 1, 0.026], [140, 0.6, 0.019], [235, 0.4, 0.013], [380, 0.25, 0.009], [560, 0.12, 0.006]];
      function thump(t0, parts, amp) {
        var s0 = Math.round(t0 * SR), len = Math.round(0.3 * SR), idx = ((s0 % n) + n) % n;
        for (var j = 0; j < len; j++) {
          var tt = j / SR, on = 1 - Math.exp(-tt / 0.008), gl = 0.3 * 0.015 * (1 - Math.exp(-tt / 0.015)), v = 0;
          for (var p = 0; p < parts.length; p++) v += parts[p][1] * Math.exp(-tt / parts[p][2]) * Math.sin(TAU * parts[p][0] * (tt + gl));
          hl[idx] += v * on * amp; if (++idx >= n) idx = 0;
        }
      }
      for (k = 0; k < N; k++) { thump(bt[k], S1, 1); thump(bt[k] + 0.3 * iv[k], S2, 0.65); }
      var w0 = rms(L), gw = w0 / rms(w) * Math.pow(10, -2 / 20), gh = w0 / rms(hl);
      for (i = 0; i < n; i++) {
        var q = i / B, jj = q | 0, e = pe[jj] + (pe[jj + 1] - pe[jj]) * (q - jj), add = w[i] * gw * e + hl[i] * gh;
        L[i] += add; R[i] += add;
      }
      var fin = [coef('lp', 1100, 0.7071)]; chain(L, fin); chain(R, fin);
      return { L: L, R: R, sec: sec };
    }

    /* ───────── ④ 오르골 자장가 ─────────
       브람스 자장가 → 반짝반짝 작은 별 (둘 다 저작권이 끝난 곡). 오르골 쇠 살 소리: 기본음 + 아주 조금 어긋난 쌍둥이 음(느린 울렁임)
       + 2·3배음 조금 + 쇠 살 특유의 6.27배 '팅' (금방 사라짐). 낮은 반주는 작게. 방 울림을 얹는다. */
    var SONGS = [
      { u: 0.39, beat: 2, m: 'EE|G3EE2|G4EG|c2B3A|A2G2DE|F2D2DE|F4DF|BAG2B2|c4CC|c4AF|G4EC|F2G2A2|G4CC|c4AF|G4EC|F2E2D2|C6',
        h: '-|C|C|G|G|G7|G7|G7|C|F|C|G7|C|F|C|G7|C', bar: 6 },
      { u: 0.75, beat: 1, m: 'CCGG|AAG2|FFEE|DDC2|GGFF|EED2|GGFF|EED2|CCGG|AAG2|FFEE|DDC2',
        h: 'C C|F C|F C|G C|C F|C G|C F|C G|C C|F C|F C|G C', bar: 4 }
    ];
    var CH = { C: [60, 64, 67], F: [53, 65, 69], G: [55, 62, 67], G7: [55, 62, 65] };
    var SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    function tine(m) {
      var f = 440 * Math.pow(2, (m - 69) / 12), t1 = 1.45 * Math.pow(523.25 / f, 0.45), len = Math.ceil(t1 * 4.6 * SR), x = new Float32Array(len), r = rnd(m * 977 + 13);
      var P = [[1, 1, t1], [1.0011, 0.15, t1 * 0.92], [2, 0.03, t1 * 0.3], [6.27, f < 400 ? 0.13 : 0.42, Math.min(0.3, t1 * 0.22)], [17.55, 0.08, 0.05]];
      for (var p = 0; p < P.length; p++) {
        var fr = f * P[p][0]; if (fr > SR * 0.45) continue;
        var w = TAU * fr / SR, d = Math.exp(-1 / (P[p][2] * SR)), c1 = 2 * d * Math.cos(w), c2 = -d * d, y2 = 0, y1 = P[p][1] * d * Math.sin(w), j;
        x[1] += y1;
        for (j = 2; j < len; j++) { var y = c1 * y1 + c2 * y2; y2 = y1; y1 = y; x[j] += y; }
      }
      var on = Math.round(0.0004 * SR), fade = Math.round(0.03 * SR), k;
      for (k = 0; k < on; k++) x[k] *= k / on;
      for (k = 0; k < fade; k++) x[len - 1 - k] *= k / fade;
      for (k = 0; k < 24; k++) x[k] += (r() * 2 - 1) * 0.025 * Math.sin(Math.PI * k / 24);   // 핀이 살을 튕기는 '틱'
      return x;
    }
    function score(r) {
      var notes = [], t = 1;
      SONGS.forEach(function (S) {
        var bars = S.m.split('|'), hs = S.h.split('|'), units = 0, total = 0, rit0;
        bars.forEach(function (b) { b.replace(/([A-Ga-g])(\d*)/g, function (_, l, d) { total += +(d || 1); }); });
        rit0 = total - S.bar * 2;
        function at(u) {   // 마지막 두 마디는 조금씩 느려진다
          if (u <= rit0) return t + u * S.u;
          var x = u - rit0, span = total - rit0; return t + rit0 * S.u + S.u * (x + 0.3 * x * x / (2 * span));
        }
        bars.forEach(function (b, bi) {
          var start = units, len = 0;
          b.replace(/([A-Ga-g])(\d*)/g, function (_, l, d) {
            var m = 72 + SEMI[l.toUpperCase()] + (l === l.toLowerCase() ? 12 : 0), du = +(d || 1);
            notes.push({ t: at(units) + (r() - 0.5) * 0.01, m: m, v: (0.78 + r() * 0.08) * (len === 0 ? 1.06 : 1) });
            units += du; len += du;
          });
          var hh = (hs[bi] || '-').trim();
          if (hh !== '-') {
            var parts = hh.split(' '), seg = S.bar / parts.length;
            parts.forEach(function (cn, pi) {
              var c = CH[cn]; if (!c) return; var u0 = start + pi * seg;
              if (S.bar === 6) {
                notes.push({ t: at(u0) + (r() - 0.5) * 0.008, m: c[0], v: 0.5 });
                notes.push({ t: at(u0 + 2) + (r() - 0.5) * 0.008, m: c[1], v: 0.26 });
                notes.push({ t: at(u0 + 4) + (r() - 0.5) * 0.008, m: c[2], v: 0.24 });
              } else {
                notes.push({ t: at(u0) + (r() - 0.5) * 0.008, m: c[0], v: 0.5 });
                notes.push({ t: at(u0 + 1) + (r() - 0.5) * 0.008, m: c[1], v: 0.2 });
                notes.push({ t: at(u0 + 1) + (r() - 0.5) * 0.008, m: c[2], v: 0.2 });
              }
            });
          }
        });
        t = at(total) + 2.8;
      });
      return { notes: notes, sec: t - 1 };   // 처음 1초 비워 둔 만큼 끝 쉼을 줄여 한 바퀴 길이는 그대로
    }
    function reverb(dry, rt, damp) {   // 8줄 되먹임 지연망 + 입력 확산. 고리라서 끝(울림 길이 3배, 1.5~6초)으로 데운 뒤 처음부터.
      var n = dry.length, Lw = new Float32Array(n), Rw = new Float32Array(n);
      var D = [1031, 1153, 1301, 1433, 1559, 1693, 1811, 1949], g = D.map(function (d) { return Math.pow(10, -3 * d / (rt * SR)); });
      var bufs = D.map(function (d) { return new Float32Array(d); }), wp = [0, 0, 0, 0, 0, 0, 0, 0], lp = [0, 0, 0, 0, 0, 0, 0, 0], o = [0, 0, 0, 0, 0, 0, 0, 0], v = [0, 0, 0, 0, 0, 0, 0, 0];
      var AD = [113, 162, 241, 337], ab = AD.map(function (d) { return new Float32Array(d); }), ap = [0, 0, 0, 0], ag = 0.62;
      var pre = new Float32Array(Math.round(0.012 * SR)), pp = 0, warm = Math.min(n, Math.ceil(Math.min(6, Math.max(1.5, rt * 3)) * SR)), s8 = 1 / Math.sqrt(8), k, i, a, j;
      for (k = -warm; k < n; k++) {
        i = k < 0 ? n + k : k;
        var x = pre[pp]; pre[pp] = dry[i]; if (++pp >= pre.length) pp = 0;
        for (a = 0; a < 4; a++) { var bf = ab[a], bo = bf[ap[a]], ww = x + ag * bo; x = bo - ag * ww; bf[ap[a]] = ww; if (++ap[a] >= bf.length) ap[a] = 0; }
        for (j = 0; j < 8; j++) { o[j] = bufs[j][wp[j]]; lp[j] = o[j] + damp * (lp[j] - o[j]); v[j] = lp[j] * g[j]; }
        var a0 = v[0] + v[1], a1 = v[0] - v[1], a2 = v[2] + v[3], a3 = v[2] - v[3], a4 = v[4] + v[5], a5 = v[4] - v[5], a6 = v[6] + v[7], a7 = v[6] - v[7];
        var b0 = a0 + a2, b1 = a1 + a3, b2 = a0 - a2, b3 = a1 - a3, b4 = a4 + a6, b5 = a5 + a7, b6 = a4 - a6, b7 = a5 - a7;
        v[0] = (b0 + b4) * s8; v[1] = (b1 + b5) * s8; v[2] = (b2 + b6) * s8; v[3] = (b3 + b7) * s8;
        v[4] = (b0 - b4) * s8; v[5] = (b1 - b5) * s8; v[6] = (b2 - b6) * s8; v[7] = (b3 - b7) * s8;
        for (j = 0; j < 8; j++) { bufs[j][wp[j]] = v[j] + x * (j & 1 ? -0.35 : 0.35); if (++wp[j] >= D[j]) wp[j] = 0; }
        if (k >= 0) { Lw[i] = o[0] - o[1] + o[2] - o[3] + o[4] - o[5] + o[6] - o[7]; Rw[i] = o[0] + o[1] - o[2] - o[3] + o[4] + o[5] - o[6] - o[7]; }
      }
      return [Lw, Rw];
    }
    async function makeMusicBox() {
      var r = rnd(9090), sc = score(r), n = Math.round(sc.sec * SR), dry = new Float32Array(n), cache = {}, i;
      sc.notes.forEach(function (nt) {
        var tp = cache[nt.m] || (cache[nt.m] = tine(nt.m)), s0 = Math.round(nt.t * SR), idx = ((s0 % n) + n) % n;
        for (var j = 0; j < tp.length; j++) { dry[idx] += tp[j] * nt.v; if (++idx >= n) idx = 0; }
      });
      await tick();
      var rv = reverb(dry, 2.1, 0.35), d0 = rms(dry), gw = d0 / rms(rv[0]) * Math.pow(10, -2 / 20);
      var L = new Float32Array(n), R = new Float32Array(n);
      for (i = 0; i < n; i++) { L[i] = dry[i] + rv[0][i] * gw; R[i] = dry[i] + rv[1][i] * gw; }
      var fin = [coef('hp', 90, 0.7071)]; chain(L, fin); chain(R, fin);
      return { L: L, R: R, sec: sc.sec };
    }

    /* ───────── 마무리: 크기 맞추기 + 봉우리 누르기 ─────────
       크기는 BS.1770 K 가중 크기(LUFS)를 쓰되, 폰 스피커(400 Hz 아래가 거의 안 나옴)로 들을 때의 크기와 반반 섞어 맞춘다.
       그래야 낮은 소리가 많은 '배 속 소리' 로 바꿔도 폰에서 갑자기 작아지지 않는다. */
    function lufs(L, R, phone) {
      var k = [coef('hs', 1681.97, 0.7071, 4), coef('hp', 38.13, 0.5)], s = 0;
      if (phone) k = k.concat([coef('hp', 400, 0.541), coef('hp', 400, 1.307), coef('lp', 7000, 0.7071)]);
      [L, R].forEach(function (x) { var y = new Float32Array(x); chain(y, k); for (var i = 0; i < y.length; i++) s += y[i] * y[i]; });
      return -0.691 + 10 * Math.log10(s / L.length);
    }
    var TARGET = { white: -20, rain: -20, womb: -20.75, musicbox: -21.5 };
    function finish(kind, o) {
      var L = o.L, R = o.R === o.L ? new Float32Array(o.L) : o.R, th = 0.8, i, x, a;
      var g = Math.pow(10, (TARGET[kind] - (lufs(L, R) + lufs(L, R, true)) / 2) / 20);
      for (i = 0; i < L.length; i++) {
        x = L[i] * g; a = x < 0 ? -x : x; L[i] = a > th ? (x < 0 ? -1 : 1) * (th + (1 - th) * Math.tanh((a - th) / (1 - th))) : x;
        x = R[i] * g; a = x < 0 ? -x : x; R[i] = a > th ? (x < 0 ? -1 : 1) * (th + (1 - th) * Math.tanh((a - th) / (1 - th))) : x;
      }
      return { sr: SR, L: L, R: R, sec: L.length / SR };
    }
    var MAKE = { white: makeWhite, rain: makeRain, womb: makeWomb, musicbox: makeMusicBox };
    function render(kind) {
      var f = MAKE[kind] || makeWhite;
      return f().then(function (o) { return finish(MAKE[kind] ? kind : 'white', o); });
    }
    root.__sleepSoundRender = render;
  }
  ENGINE(root);
  if (typeof document === 'undefined') return;
  if (root.__sleepSoundUI) return;
  root.__sleepSoundUI = true;

  /* ═══════════ 트는 곳 ═══════════ */
  var KINDS = [
    { k: 'white',    icon: '🌀', name: '백색소음',        sub: '잡소리를 덮어 주는 쏴— 소리' },
    { k: 'rain',     icon: '🌧️', name: '빗소리',          sub: '창밖에 조용히 내리는 비' },
    { k: 'womb',     icon: '🤰', name: '엄마 배 속 소리', sub: '배 속에서 듣던 쿵쿵 · 쉭쉭' },
    { k: 'musicbox', icon: '🎵', name: '오르골 자장가',   sub: '브람스 자장가 · 작은 별' }
  ];
  var TIMES = [[15, '15분'], [30, '30분'], [60, '1시간'], [0, '계속']];
  var K_KIND = 'tosil_sleepsound_kind', K_MIN = 'tosil_sleepsound_min', FADE = 30;
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function info(k) { for (var i = 0; i < KINDS.length; i++) if (KINDS[i].k === k) return KINDS[i]; return null; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function hm(ms) { var d = new Date(ms); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function toast(m) { try { if (window.showToast) window.showToast(m); } catch (e) {} }
  var S = { kind: (info(lsGet(K_KIND)) || KINDS[1]).k, min: (function () { var m = parseInt(lsGet(K_MIN), 10); return [15, 30, 60, 0].indexOf(m) > -1 ? m : 30; })(), loading: null };

  /* ── 소리 만들기: 일꾼에서 (없으면 이 화면에서). 두 개까지만 들고 있는다 ── */
  // 소리 하나에 일꾼 하나 — 미리 만들던 소리가 있어도 새로 누른 소리가 줄 서지 않는다 (폰은 코어가 여럿). 다 만들면 내보낸다
  var W = null, cache = {}, used = [];
  function viaWorker(kind) {
    if (W === false || typeof Worker === 'undefined' || !window.URL || !window.Blob) return null;
    try {
      if (!W) {
        var src = '(' + ENGINE.toString() + ')(self);\n' +
          'self.onmessage = function (e) { self.__sleepSoundRender(e.data).then(function (o) {' +
          ' self.postMessage({ sr: o.sr, L: o.L, R: o.R }, [o.L.buffer, o.R.buffer]); },' +
          ' function (er) { self.postMessage({ err: String(er && er.message || er) }); }); };';
        W = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
      }
      var wk = new Worker(W);
      return new Promise(function (res, rej) {
        wk.onmessage = function (e) { wk.terminate(); if (e.data && e.data.err) rej(new Error(e.data.err)); else res(e.data); };
        wk.onerror = function (e) { try { e.preventDefault(); } catch (x) {} wk.terminate(); W = false; rej(new Error('worker')); };
        wk.postMessage(kind);
      });
    } catch (e) { W = false; return null; }
  }
  function pcm(kind) {
    var c = cache[kind] || (cache[kind] = {});
    if (c.buf) return Promise.resolve(null);
    if (!c.pcm) {
      var p = viaWorker(kind);
      c.pcm = (p || root.__sleepSoundRender(kind)).catch(function () { return root.__sleepSoundRender(kind); });
      used = used.filter(function (x) { return x !== kind; }); used.push(kind);
      for (var i = 0; used.length > 2 && i < used.length; i++) {
        var o = used[i]; if (o === kind || (cur && cur.kind === o)) continue;
        delete cache[o]; used.splice(i, 1); i--;
      }
    }
    return c.pcm;
  }
  function buffer(kind) {
    var c = cache[kind];
    if (c && c.buf) return Promise.resolve(c.buf);
    return pcm(kind).then(function (o) {
      var c2 = cache[kind] || (cache[kind] = {});
      if (c2.buf) return c2.buf;
      var b = ctx.createBuffer(2, o.L.length, o.sr);
      if (b.copyToChannel) { b.copyToChannel(o.L, 0); b.copyToChannel(o.R, 1); } else { b.getChannelData(0).set(o.L); b.getChannelData(1).set(o.R); }
      c2.buf = b; c2.pcm = null;          // 소리 판에만 남긴다 (메모리 반)
      return b;
    });
  }
  function canPrepare() { return W !== false && typeof Worker !== 'undefined'; }   // 일꾼이 없으면 미리 만들지 않는다 (화면이 멈춘다)

  /* ── 틀기 · 끄기 — 세기는 오디오 시계로 미리 적어 둔다 (화면이 꺼져 자바스크립트가 느려져도 제때 작아진다) ── */
  var ctx = null, master = null, cur = null, seq = 0, CURVE = (function () {
    var c = new Float32Array(65); for (var i = 0; i < 65; i++) { var x = Math.cos(i / 64 * Math.PI / 2); c[i] = x * x; } return c;
  })();
  function ensureCtx() {
    try {
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
        ctx = new AC(); master = ctx.createGain(); master.connect(ctx.destination);
      }
      try { if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback'; } catch (e) {}   // 아이폰 무음 스위치
      if (ctx.state !== 'running' && ctx.resume) ctx.resume().catch(function () {});
      return ctx;
    } catch (e) { return null; }
  }
  function gainAt(t) {
    if (!cur) return 0;
    var v = cur.v0 + (1 - cur.v0) * (cur.fin > 0 ? Math.min(1, Math.max(0, (t - cur.t0) / cur.fin)) : 1);
    if (cur.end && t > cur.end - FADE) { var x = Math.cos(Math.min(1, (t - (cur.end - FADE)) / FADE) * Math.PI / 2); v *= x * x; }
    return v;
  }
  function schedule() {
    if (!cur) return;
    var g = cur.g.gain, now = ctx.currentTime, v = gainAt(now);
    try {
      g.cancelScheduledValues(now); g.setValueAtTime(v, now);
      cur.t0 = now; cur.v0 = v; cur.fin = v < 1 ? Math.max(0.3, (1 - v) * cur.fadeIn) : 0; cur.end = 0;
      if (cur.fin) g.linearRampToValueAtTime(1, now + cur.fin);
      if (S.min > 0) {
        cur.end = now + S.min * 60;
        g.setValueCurveAtTime(CURVE, cur.end - FADE, FADE);
      }
      // 멈추는 때도 오디오 시계에 적는다 (stop 은 다시 부르면 마지막 것이 산다 — 웹 오디오 규격). '계속' 으로 바꾸면 아주 먼 뒤로
      if (cur.end || cur.stopSet) { try { cur.src.stop(cur.end ? cur.end + 0.1 : now + 1e7); cur.stopSet = true; } catch (e2) {} }
    } catch (e) {   // 사파리는 작아지는 중에 시간을 바꾸면 '곡선이 겹친다' 며 거절한다 → 같은 소리를 새로 튼다
      var k = cur.kind; fadeOut(0.4); play(k);
    }
  }
  function play(kind) {
    if (!ensureCtx()) { toast('이 폰에서는 소리를 틀 수 없어요'); return; }
    var my = ++seq;
    S.kind = kind; lsSet(K_KIND, kind); S.loading = kind; paint(); ticking();
    buffer(kind).then(function (b) {
      if (my !== seq) return;
      S.loading = null; fadeOut(0.6);
      var g = ctx.createGain(), s = ctx.createBufferSource(), t = ctx.currentTime + 0.05, fi = kind === 'musicbox' ? 1 : 2.5;
      s.buffer = b; s.loop = true; s.connect(g); g.connect(master);
      g.gain.setValueAtTime(0, t);
      s.start(t);
      s.onended = function () {      // 정해 둔 시간에 멈췄다 (화면이 꺼져 있어도 이 알림은 온다)
        try { g.disconnect(); } catch (e) {}
        if (cur && cur.src === s) { cur = null; ended = true; unlockWake(); rest(); paint(); }
      };
      cur = { kind: kind, src: s, g: g, t0: t, v0: 0, fin: fi, fadeIn: fi, end: 0, started: Date.now() };
      schedule(); ended = false; paint(); lockWake();
    }, function () {
      if (my !== seq) return;
      S.loading = null; paint(); toast('소리를 만들지 못했어요. 한 번 더 눌러 주세요');
    });
  }
  function fadeOut(sec) {
    if (!cur) return;
    var c = cur, now = ctx.currentTime, v = gainAt(now);
    cur = null;
    try { c.g.gain.cancelScheduledValues(now); c.g.gain.setValueAtTime(v, now); c.g.gain.linearRampToValueAtTime(0, now + sec); c.src.stop(now + sec + 0.05); } catch (e) {}
  }
  function stop() { seq++; S.loading = null; fadeOut(0.8); paint(); unlockWake(); rest(); }
  // 아무것도 안 나오면 오디오 장치를 쉬게 한다 (밤새 '조용한 소리' 를 내느라 배터리를 쓰지 않게). 다음에 틀 때 ensureCtx 가 깨운다
  function rest() { setTimeout(function () { if (!cur && !S.loading && ctx && ctx.state === 'running' && ctx.suspend) ctx.suspend().catch(function () {}); }, 1500); }

  /* ── 1초마다: 남은 시간 · 다 됐으면 정리 ── */
  var iv = null, ended = false;
  function ticking() { if (!iv) iv = setInterval(onTick, 1000); }
  function onTick() {
    if (cur && cur.end && ctx.currentTime >= cur.end) {
      var c = cur; cur = null; try { c.src.stop(); c.g.disconnect(); } catch (e) {}
      ended = true; unlockWake(); rest();
    }
    if (!cur && !S.loading && iv) { clearInterval(iv); iv = null; }
    paint();
  }
  function left() {
    if (S.loading) return { big: '--:--', bar: '소리 만드는 중…', sub: '처음 한 번은 몇 초 걸려요' };
    if (!cur) return null;
    if (!cur.end) { var m = Math.floor((Date.now() - cur.started) / 60000); return { big: '계속', bar: '끌 때까지 나와요', sub: m ? '튼 지 ' + m + '분 · 잠들고 나면 꺼 주세요' : '잠들고 나면 꺼 주세요' }; }
    var r = Math.max(0, cur.end - ctx.currentTime), mm = Math.floor(r / 60), ss = Math.floor(r % 60);
    return { big: mm + ':' + pad(ss), bar: r < 60 ? '곧 꺼져요' : Math.ceil(r / 60) + '분 남았어요', sub: r <= FADE ? '천천히 작아지는 중이에요' : '남았어요 · 끝날 땐 천천히 작아져요' };
  }

  /* ── 화면 꺼짐 막기 — 밤 화면이 떠 있고 소리가 나는 동안만 ── */
  var wl = null, wlAsk = false;
  function lockWake() {
    if (!night() || !cur || wl || wlAsk || !navigator.wakeLock || document.visibilityState !== 'visible') return;
    wlAsk = true;   // 묻는 사이에 한 번 더 부르면 잠금이 두 개 잡혀 하나는 안 풀린다
    navigator.wakeLock.request('screen').then(function (l) {
      wlAsk = false;
      if (!night() || !cur) { try { l.release(); } catch (e) {} return; }   // 그 사이 밤 화면을 닫았다
      wl = l; l.addEventListener('release', function () { if (wl === l) wl = null; });
    }, function () { wlAsk = false; });
  }
  function unlockWake() { var l = wl; wl = null; if (l) { try { l.release(); } catch (e) {} } }
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible') return;
    if (cur && ctx && ctx.state !== 'running') { try { ctx.resume(); } catch (e) {} }   // 전화 · 다른 앱 뒤에 멈췄던 것
    if (cur || S.loading) { ticking(); onTick(); }
    lockWake();
  });

  /* ── 낮잠 · 밤잠 — 빠른 기록(quickrec.js)과 같은 셈: 지난 2주 그 시간 ±90분에 잔 잠이 많은 쪽, 없으면 저녁 7시~새벽 6시는 밤잠 ── */
  function sleepKind(now) {
    var mod = function (ms) { var d = new Date(ms); return d.getHours() * 60 + d.getMinutes(); };
    var at = mod(now), n = { '낮잠': 0, '밤잠': 0 }, list = [];
    try { list = JSON.parse(lsGet('tosil_tracker_records')) || []; } catch (e) {}
    (Array.isArray(list) ? list : []).forEach(function (r) {
      if (!r || r.type !== 'sleep' || !(r.subType in n) || now - Number(r.timestamp) > 14 * 864e5) return;
      var d = Math.abs(mod(Number(r.timestamp)) - at); if (Math.min(d, 1440 - d) <= 90) n[r.subType]++;
    });
    if (n['낮잠'] + n['밤잠'] >= 2 && n['낮잠'] !== n['밤잠']) return n['밤잠'] > n['낮잠'] ? '밤잠' : '낮잠';
    var h = new Date(now).getHours(); return (h >= 19 || h < 6) ? '밤잠' : '낮잠';
  }

  /* ═══════════ 화면 ═══════════ */
  var BTN = 'font-family:inherit; cursor:pointer; -webkit-tap-highlight-color:transparent;';
  function $(id) { return document.getElementById(id); }
  function night() { return !!$('sleepsound-night'); }

  /* ── 소리 고르기 창 ── */
  function sheetHTML() {
    return '<div role="dialog" aria-modal="true" aria-labelledby="ss-title" style="width:100%; max-width:500px; max-height:92vh; overflow-y:auto; overscroll-behavior:contain; background-color:var(--bg-card); border-radius:20px 20px 0 0; padding:12px 20px calc(22px + env(safe-area-inset-bottom)); box-sizing:border-box;">' +
      '<div style="width:40px; height:5px; background:var(--border); border-radius:3px; margin:0 auto 18px;"></div>' +
      '<div style="display:flex; justify-content:space-between; align-items:center;">' +
        '<h3 id="ss-title" style="font-size:18px; font-weight:900; color:var(--text-m); margin:0; letter-spacing:-0.3px;">재우기 소리</h3>' +
        '<button type="button" data-ss="close" aria-label="닫기" style="' + BTN + ' background:none; border:none; font-size:20px; color:var(--text-s); padding:0 2px;">✕</button>' +
      '</div>' +
      '<div style="font-size:12.5px; font-weight:600; color:var(--text-s); line-height:1.6; margin-top:6px; word-break:keep-all;">폰은 아기 머리맡에서 멀찍이(2m쯤) 두고, 소리는 조용히 말하는 소리보다 작게 틀어 주세요.</div>' +
      '<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:16px;">' + KINDS.map(function (o) {
        return '<button type="button" data-kind="' + o.k + '" aria-pressed="false" style="' + BTN + ' position:relative; text-align:left; padding:14px 12px 13px; border-radius:16px; min-height:98px;">' +
          '<div style="font-size:20px; line-height:1;">' + o.icon + '</div>' +
          '<div data-t="1" style="font-size:14.5px; font-weight:900; margin-top:9px; letter-spacing:-0.3px;">' + esc(o.name) + '</div>' +
          '<div style="font-size:11.5px; font-weight:700; color:var(--text-s); margin-top:3px; line-height:1.4; word-break:keep-all;">' + esc(o.sub) + '</div>' +
          '<div data-st="1" style="position:absolute; top:13px; right:12px; font-size:11px; font-weight:800; color:#7F77DD;"></div>' +
        '</button>';
      }).join('') + '</div>' +
      '<div style="font-size:13px; font-weight:800; color:var(--text-m); margin-top:20px;">언제까지 틀까요</div>' +
      '<div style="display:flex; gap:8px; margin-top:8px;">' + TIMES.map(function (t) {
        return '<button type="button" data-min="' + t[0] + '" aria-pressed="false" style="' + BTN + ' flex:1; padding:11px 4px; border-radius:12px; font-size:13px; font-weight:800; white-space:nowrap;">' + t[1] + '</button>';
      }).join('') + '</div>' +
      '<div data-ss="note" style="font-size:12px; font-weight:600; color:var(--text-s); margin-top:8px; min-height:18px; line-height:1.5; word-break:keep-all;"></div>' +
      '<button type="button" data-ss="night" style="' + BTN + ' width:100%; margin-top:12px; padding:16px; border-radius:16px; border:none; background:#4A413C; color:#FFF; font-size:15.5px; font-weight:800;"></button>' +
    '</div>';
  }
  window.openSleepSounds = function () {
    var tr = $('tracker-sheet-overlay');
    if (tr && tr.style.display !== 'none' && typeof window.closeTrackerSheet === 'function') { try { window.closeTrackerSheet(); } catch (e) {} }
    var old = $('sleepsound-sheet'); if (old) old.remove();
    var w = document.createElement('div');
    w.id = 'sleepsound-sheet';
    w.setAttribute('style', 'position:fixed; inset:0; z-index:7100; background:rgba(0,0,0,0.45); display:flex; align-items:flex-end; justify-content:center;');
    w.innerHTML = sheetHTML();
    w.addEventListener('click', function (e) { if (e.target === w) window.closeSleepSounds(); });
    w.querySelector('[data-ss="close"]').onclick = window.closeSleepSounds;
    [].forEach.call(w.querySelectorAll('[data-kind]'), function (b) {
      b.onclick = function () { var k = b.getAttribute('data-kind'); if ((cur && cur.kind === k) || S.loading === k) stop(); else play(k); };
    });
    [].forEach.call(w.querySelectorAll('[data-min]'), function (b) {
      b.onclick = function () { S.min = Number(b.getAttribute('data-min')); lsSet(K_MIN, String(S.min)); if (cur) schedule(); paint(); };
    });
    w.querySelector('[data-ss="night"]').onclick = function () { if (!cur && !S.loading) play(S.kind); openNight(); };
    document.body.appendChild(w);
    var card = w.firstElementChild;
    if (card.animate) card.animate([{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }], { duration: 280, easing: 'cubic-bezier(0.1, 1, 0.2, 1)' });
    paint();
    if (!cur && !S.loading && canPrepare()) pcm(S.kind).catch(function () {});   // 누르면 바로 나오게 미리
  };
  window.closeSleepSounds = function () { var w = $('sleepsound-sheet'); if (w) w.remove(); paint(); };
  function paintSheet() {
    var w = $('sleepsound-sheet'); if (!w) return;
    [].forEach.call(w.querySelectorAll('[data-kind]'), function (b) {
      var k = b.getAttribute('data-kind'), on = !!(cur && cur.kind === k), ld = S.loading === k, pick = !cur && !S.loading && S.kind === k;
      b.style.backgroundColor = on || ld ? '#F4F2FC' : 'var(--bg-sub)';
      b.style.border = on || ld ? '1.5px solid #7F77DD' : pick ? '1.5px solid #D9D5F3' : '1.5px solid transparent';
      b.querySelector('[data-t]').style.color = on || ld ? '#4F47A5' : 'var(--text-m)';
      b.querySelector('[data-st]').textContent = on ? '나오는 중' : ld ? '만드는 중…' : '';
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    [].forEach.call(w.querySelectorAll('[data-min]'), function (b) {
      var on = Number(b.getAttribute('data-min')) === S.min;
      b.style.backgroundColor = on ? '#F0EEFB' : 'var(--bg-sub)';
      b.style.color = on ? '#7F77DD' : 'var(--text-s)';
      b.style.border = on ? '1px solid #7F77DD' : '1px solid transparent';
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    var l = left(), note = w.querySelector('[data-ss="note"]');
    note.textContent = S.min === 0 ? '끌 때까지 계속 나와요. 잠들고 나면 꺼 주세요.'
      : cur && l ? l.bar + ' · 끝날 땐 30초 동안 천천히 작아져요' : '끝날 땐 30초 동안 천천히 작아져요. 뚝 끊기면 깰 수 있어서요.';
    w.querySelector('[data-ss="night"]').textContent = cur || S.loading ? '밤 화면으로' : info(S.kind).name + ' 틀고 밤 화면으로';
  }

  /* ── 밤 화면 ── */
  var dimT = null, dimmed = false, woke = 0;
  function openNight() {
    var sh = $('sleepsound-sheet'); if (sh) sh.remove();
    var old = $('sleepsound-night'); if (old) old.remove();
    var n = document.createElement('div');
    n.id = 'sleepsound-night';
    n.setAttribute('role', 'dialog'); n.setAttribute('aria-modal', 'true'); n.setAttribute('aria-label', '재우기 소리 밤 화면');
    n.setAttribute('style', 'position:fixed; inset:0; z-index:10000005; background-color:#000; display:flex; align-items:center; justify-content:center; padding:24px; box-sizing:border-box; -webkit-user-select:none; user-select:none; touch-action:manipulation;');
    n.innerHTML = '<div data-ss="wrap" style="width:100%; max-width:320px; text-align:center; transition:opacity 1.2s ease;">' +
        '<div data-ss="name" style="font-size:15px; font-weight:800; color:#7D77A8;"></div>' +
        '<div data-ss="big" style="font-size:54px; font-weight:900; color:#B3ADDB; letter-spacing:-1px; margin-top:8px; font-variant-numeric:tabular-nums;"></div>' +
        '<div data-ss="sub" style="font-size:12.5px; font-weight:700; color:#5F5A84; margin-top:6px; min-height:18px; line-height:1.5; word-break:keep-all;"></div>' +
        '<div data-ss="slot" style="margin-top:40px; min-height:54px;"></div>' +
        '<button type="button" data-ss="off" style="' + BTN + ' width:100%; margin-top:10px; padding:15px; border-radius:16px; border:none; background:transparent; color:#6E6895; font-size:15px; font-weight:800;"></button>' +
      '</div>';
    // 흐려진 화면을 처음 건드리면 밝히기만 (어둠 속에서 더듬다 '끄기' 를 누르지 않게)
    n.addEventListener('pointerdown', function () { if (dimmed) woke = Date.now(); wakeUp(); }, true);
    n.addEventListener('click', function (e) { if (Date.now() - woke < 700) { e.stopPropagation(); e.preventDefault(); } }, true);
    n.querySelector('[data-ss="off"]').onclick = function () { if (cur || S.loading) stop(); window.closeSleepNight(); };
    document.body.appendChild(n);
    themeDark(true);
    ended = false; wakeUp(); lockWake(); paint();
  }
  // 홈 화면 앱(크롬)에서는 맨 위 상태 줄 색도 이 값을 따른다 — 밤 화면 동안만 까맣게
  var themeWas = null;
  function themeDark(on) {
    var m = document.querySelector('meta[name="theme-color"]'); if (!m) return;
    if (on) { if (themeWas === null) themeWas = m.getAttribute('content'); m.setAttribute('content', '#000000'); }
    else if (themeWas !== null) { m.setAttribute('content', themeWas); themeWas = null; }
  }
  function wakeUp() {
    var w = $('sleepsound-night'); w = w && w.querySelector('[data-ss="wrap"]'); if (!w) return;
    dimmed = false; w.style.opacity = '1';
    clearTimeout(dimT); dimT = setTimeout(function () { if (!w.isConnected) return; dimmed = true; w.style.opacity = '0.14'; }, 10000);
  }
  window.closeSleepNight = function () { var n = $('sleepsound-night'); if (n) n.remove(); clearTimeout(dimT); dimmed = false; themeDark(false); unlockWake(); paint(); };
  function paintNight() {
    var n = $('sleepsound-night'); if (!n) return;
    var l = left(), it = info(S.kind) || KINDS[0], q = function (k) { return n.querySelector('[data-ss="' + k + '"]'); };
    q('name').textContent = it.name;
    q('big').textContent = l ? l.big : '끝';
    q('sub').textContent = l ? l.sub : ended ? '소리를 껐어요. 화면은 곧 저절로 꺼져요' : '소리가 꺼져 있어요';
    q('off').textContent = l ? '끄기' : '닫기';
    var st = lsGet('tosil_sleep_start'), slot = q('slot'), key = st ? 'z' + st : 'b';
    if (slot.getAttribute('data-k') === key) return;
    slot.setAttribute('data-k', key);
    if (st) {
      slot.innerHTML = '<div style="font-size:13.5px; font-weight:800; color:#6E6895; padding-top:16px;">' + esc(hm(Number(st))) + '부터 ' + esc(lsGet('tosil_sleep_type') || '') + ' 자는 중이에요</div>';
    } else {
      slot.innerHTML = '<button type="button" style="' + BTN + ' width:100%; padding:16px; border-radius:16px; border:1px solid #26243A; background:#121119; color:#B3ADDB; font-size:15.5px; font-weight:800;">잠들었어요</button>';
      slot.firstChild.onclick = function () {
        try { window.startSleepTimer(sleepKind(Date.now())); } catch (e) {}
        var t = $('super-toast-msg'); if (t) t.remove();      // 까만 화면 위에 밝은 안내가 뜨지 않게 (자는 중이라고 이 화면에 적는다)
        paint();
      };
    }
  }

  /* ── 창을 닫아도 나오는 중이면 — 아래 탭 위 작은 줄 ── */
  function paintBar() {
    var b = $('sleepsound-bar'), show = !!(cur || S.loading) && !night() && !$('sleepsound-sheet');
    if (!show) { if (b) b.remove(); return; }
    if (!b) {
      b = document.createElement('div');
      b.id = 'sleepsound-bar';
      b.setAttribute('role', 'status');
      b.setAttribute('style', 'position:fixed; left:0; right:0; margin:0 auto; width:calc(100% - 24px); max-width:456px; bottom:84px; z-index:2900; background-color:#2F2B45; border-radius:16px; padding:9px 8px 9px 14px; box-sizing:border-box; display:flex; align-items:center; gap:6px; box-shadow:0 8px 24px rgba(0,0,0,0.18);');
      b.innerHTML = '<div data-ss="open" style="flex:1; min-width:0; cursor:pointer;">' +
          '<div data-ss="bn" style="font-size:13.5px; font-weight:800; color:#EEEBFF; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;"></div>' +
          '<div data-ss="bt" style="font-size:11.5px; font-weight:700; color:#B3ADDB; margin-top:2px;"></div>' +
        '</div>' +
        '<button type="button" data-ss="bnight" style="' + BTN + ' flex-shrink:0; padding:9px 11px; border-radius:11px; border:none; background:#47416A; color:#EEEBFF; font-size:12.5px; font-weight:800;">밤 화면</button>' +
        '<button type="button" data-ss="boff" style="' + BTN + ' flex-shrink:0; padding:9px 10px; border-radius:11px; border:none; background:transparent; color:#B3ADDB; font-size:12.5px; font-weight:800;">끄기</button>';
      b.querySelector('[data-ss="open"]').onclick = window.openSleepSounds;
      b.querySelector('[data-ss="bnight"]').onclick = openNight;
      b.querySelector('[data-ss="boff"]').onclick = stop;
      document.body.appendChild(b);
    }
    var nav = document.querySelector('.bottom-nav'), r = nav && getComputedStyle(nav).display !== 'none' ? nav.getBoundingClientRect() : null;
    b.style.bottom = Math.round((r && r.height > 0 ? Math.max(0, innerHeight - r.top) : 0) + 10) + 'px';   // 탭 줄은 fixed 라 offsetParent 가 늘 null
    var it = info(S.kind) || KINDS[0], l = left();
    b.querySelector('[data-ss="bn"]').textContent = it.icon + ' ' + it.name;
    b.querySelector('[data-ss="bt"]').textContent = l ? l.bar : '';
  }
  function paint() { try { paintSheet(); paintNight(); paintBar(); } catch (e) {} }

  /* 시험용 들여다보기 — { endIn: 초 } 를 주면 그만큼 뒤에 끝나게 (끝날 때 작아지는 길이도 그 안으로) */
  window.__sleepSoundState = function (o) {
    if (o && o.endIn && cur) {
      var now = ctx.currentTime, f = Math.min(FADE, o.endIn);
      cur.g.gain.cancelScheduledValues(now); cur.g.gain.setValueAtTime(gainAt(now), now); cur.g.gain.linearRampToValueAtTime(0, now + f);
      cur.end = now + o.endIn; cur.fin = 0; cur.v0 = 1; cur.t0 = now;
      try { cur.src.stop(cur.end + 0.1); cur.stopSet = true; } catch (e) {}
    }
    return { playing: cur ? cur.kind : null, loading: S.loading, kind: S.kind, min: S.min, left: cur && cur.end ? Math.round(cur.end - ctx.currentTime) : null,
             ctx: ctx ? ctx.state : null, worker: W ? 'on' : W === false ? 'off' : 'none', wake: !!wl, cached: used.slice() };
  };
})(typeof window !== 'undefined' ? window : globalThis);
