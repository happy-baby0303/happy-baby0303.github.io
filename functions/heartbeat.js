/* ============================================================
   배냇함 — 심장 소리 엽서 (heartbeat.js)        ※ 숨김 스위치 뒤 (stage.js)

   초음파 영상(병원에서 찍은 것, 초음파 앱에서 저장해 둔 것)이나 녹음 파일을 넣으면
     1. 소리가 제일 또렷한 20초를 골라 주고 (옮겨서 고를 수도 있다)
     2. 그 부분만 작은 소리 파일(16kHz · 모노 · WAV)로 떼어 배냇함에 담고
     3. 파형 엽서(1080×1350)로 만들어 저장 · 공유한다.

   영상은 폰 밖으로 안 나간다. 이 폰에서 소리만 떼고, 올리는 건 20초짜리 소리뿐이다.
   다른 앱의 초음파를 대신하려는 게 아니다. 그 영상을 '아이에게 줄 물건' 으로 바꾸는 것이다.

   ⚠️ 의학 판단은 하지 않는다. 심박수를 세거나 정상 여부를 말하지 않는다.

   index.html 에서 stage.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var WIN = 20;              // 담을 길이 (초)
    var RATE = 16000;          // 담을 때 표본 주파수 — 20초면 약 640KB

    function ui() { return window.stageUI || null; }
    function toast(m) { if (typeof window.showToast === "function") window.showToast(m); }

    /* ---------- 순수 계산 (시험할 수 있게 밖으로 꺼내 둔다) ---------- */

    // 0.5초 칸마다 세기(RMS)를 재고, 창 길이만큼 합이 가장 큰 시작점을 찾는다
    function loudestStart(data, rate, winSec) {
        var step = Math.max(1, Math.floor(rate / 2));
        var cells = [];
        for (var i = 0; i < data.length; i += step) {
            var s = 0, n = 0;
            for (var j = i; j < Math.min(data.length, i + step); j += 4) { s += data[j] * data[j]; n++; }
            cells.push(n ? Math.sqrt(s / n) : 0);
        }
        var w = Math.max(1, Math.round(winSec * 2));
        if (cells.length <= w) return 0;
        var sum = 0, best = 0, bestAt = 0;
        for (var k = 0; k < cells.length; k++) {
            sum += cells[k];
            if (k >= w) sum -= cells[k - w];
            if (k >= w - 1 && sum > best) { best = sum; bestAt = k - w + 1; }
        }
        return bestAt / 2;
    }

    function peaksOf(data, n) {
        var block = Math.max(1, Math.floor(data.length / n)), out = [], max = 0;
        for (var i = 0; i < n; i++) {
            var s = 0, c = 0;
            for (var j = i * block; j < Math.min(data.length, (i + 1) * block); j += 8) { s += Math.abs(data[j]); c++; }
            var v = c ? s / c : 0; out.push(v); if (v > max) max = v;
        }
        return out.map(function (v) { return max ? Math.round(v / max * 100) : 0; });
    }

    // 16비트 PCM WAV 로 싼다. 앞뒤 0.15초는 살짝 줄여서 '딱' 소리가 안 나게, 가장 큰 소리는 0.9 에 맞춘다
    function encodeWav(samples, rate) {
        var n = samples.length, fade = Math.floor(rate * 0.15), peak = 0, i;
        for (i = 0; i < n; i++) { var a = Math.abs(samples[i]); if (a > peak) peak = a; }
        var gain = peak > 0 ? Math.min(8, 0.9 / peak) : 1;
        var buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
        function str(o, s) { for (var k = 0; k < s.length; k++) v.setUint8(o + k, s.charCodeAt(k)); }
        str(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); str(8, "WAVE"); str(12, "fmt ");
        v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
        v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
        str(36, "data"); v.setUint32(40, n * 2, true);
        for (i = 0; i < n; i++) {
            var f = 1;
            if (i < fade) f = i / fade; else if (i > n - fade) f = (n - i) / fade;
            var x = Math.max(-1, Math.min(1, samples[i] * gain * f));
            v.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7FFF, true);
        }
        return new Blob([buf], { type: "audio/wav" });
    }
    window.__heartTest = { loudestStart: loudestStart, peaksOf: peaksOf, encodeWav: encodeWav };

    /* ---------- 상태 ---------- */
    var st = null;            // { buf, start, win, dateKey, peaksAll, src }
    var ac = null;

    function stopPlay() {
        if (st && st.src) { try { st.src.stop(); } catch (e) {} st.src = null; }
        var b = document.getElementById("hb-play"); if (b) b.textContent = "▶ 들어 보기";
    }

    /* ---------- 1. 들어가기 ---------- */
    window.openHeartSheet = function () {
        var u = ui(); if (!u) return;
        var T = u.tokens;
        u.sheet('<div class="pg-serif" style="font-size:20px;font-weight:700;color:' + T.INK2 + ';">심장 소리</div>' +
            '<div class="pg-meta" style="margin:6px 0 18px;line-height:1.7;word-break:keep-all;">' +
                '병원에서 찍은 초음파 영상이나 녹음을 넣으면, 심장 소리만 떼어 배냇함에 담고 엽서로 만들어 드려요. 영상은 이 폰 밖으로 나가지 않아요.</div>' +
            '<label style="display:block;text-align:center;padding:16px;border-radius:14px;background:' + T.INK2 + ';color:#FFFDF9;font-size:15px;font-weight:700;cursor:pointer;">' +
                '영상 · 녹음에서 가져오기' +
                '<input type="file" accept="video/*,audio/*" style="display:none;" onchange="window.__heartPick(this)"></label>' +
            '<div onclick="window.stageUI.closeSheet(); window.openVoiceSheet && window.openVoiceSheet(window.stageUI.todayKey())" ' +
                'style="margin-top:10px;text-align:center;padding:15px;border-radius:14px;border:1px solid ' + T.LINE + ';background:' + T.PAPER + ';' +
                'color:' + T.INK2 + ';font-size:14.5px;font-weight:700;cursor:pointer;">지금 바로 녹음하기</div>' +
            '<div style="font-size:11.5px;font-weight:600;color:' + T.MUTE + ';line-height:1.7;margin-top:14px;word-break:keep-all;">' +
                '초음파 앱에서 받은 영상은 먼저 폰에 저장한 뒤 여기서 고르면 돼요.</div>');
    };

    /* ---------- 2. 파일에서 소리 찾기 ---------- */
    window.__heartPick = async function (input) {
        var u = ui(), T = u.tokens, f = input && input.files && input.files[0];
        if (!f) return;
        if (f.size > 300 * 1024 * 1024) return toast("파일이 너무 커요. 300MB 아래로 골라 주세요");
        u.sheet('<div class="pg-serif" style="font-size:20px;font-weight:700;color:' + T.INK2 + ';">소리를 찾는 중이에요</div>' +
            '<div class="pg-meta" style="margin:8px 0 6px;">영상이 길면 조금 걸려요.</div>');
        try {
            var AC = window.AudioContext || window.webkitAudioContext;
            if (!ac) ac = new AC();
            var raw = await f.arrayBuffer();
            var buf = await new Promise(function (ok, no) {
                var p = ac.decodeAudioData(raw, ok, no);
                if (p && p.then) p.then(ok, no);
            });
            var data = buf.getChannelData(0);
            var win = Math.min(WIN, buf.duration);
            var d = new Date(f.lastModified || Date.now());
            st = { buf: buf, win: win, start: loudestStart(data, buf.sampleRate, win),
                   dateKey: u.keyOf(d), peaksAll: peaksOf(data, 160), src: null, note: "" };
            if (st.dateKey > u.todayKey()) st.dateKey = u.todayKey();
            drawPick();
        } catch (e) {
            console.warn("[심장 소리] 소리를 못 찾음", e);
            u.sheet('<div class="pg-serif" style="font-size:20px;font-weight:700;color:' + T.INK2 + ';">소리를 못 찾았어요</div>' +
                '<div class="pg-meta" style="margin:8px 0 6px;line-height:1.7;word-break:keep-all;">이 파일에서는 소리를 꺼내지 못했어요. 다른 영상이나 녹음을 골라 주세요.</div>' +
                u.primary("다시 고르기", "window.openHeartSheet()"));
        }
    };

    /* ---------- 3. 고르기 · 들어 보기 ---------- */
    function pickBars() {
        var T = ui().tokens, dur = st.buf.duration, n = st.peaksAll.length;
        var a = st.start / dur, b = (st.start + st.win) / dur, out = "";
        for (var i = 0; i < n; i++) {
            var h = Math.max(6, st.peaksAll[i] * 0.56);
            var x = i / n, inWin = x >= a && x <= b;
            out += '<rect x="' + (i * 2) + '" y="' + (30 - h / 2).toFixed(1) + '" width="1.2" height="' + h.toFixed(1) + '" rx="0.6" fill="' + (inWin ? T.INK2 : "#D9CFC2") + '"/>';
        }
        return '<svg viewBox="0 0 ' + (n * 2) + ' 60" preserveAspectRatio="none" style="display:block;width:100%;height:64px;">' +
            '<rect x="' + (a * n * 2).toFixed(1) + '" y="0" width="' + ((b - a) * n * 2).toFixed(1) + '" height="60" rx="3" fill="' + T.TINT + '"/>' + out + '</svg>';
    }

    function drawPick() {
        var u = ui(), T = u.tokens, dur = st.buf.duration;
        var w = u.weeksFromDue(u.dueDate(), u.fromKey(st.dateKey));
        u.sheet('<div class="pg-serif" style="font-size:20px;font-weight:700;color:' + T.INK2 + ';">이 부분을 담을게요</div>' +
            '<div class="pg-meta" style="margin:6px 0 16px;line-height:1.7;">소리가 가장 또렷한 ' + Math.round(st.win) + '초를 골라 뒀어요. 막대를 밀어서 옮길 수 있어요.</div>' +
            '<div id="hb-bars">' + pickBars() + '</div>' +
            (dur > st.win + 0.5 ? '<input id="hb-range" type="range" min="0" max="' + (dur - st.win).toFixed(1) + '" step="0.5" value="' + st.start + '" ' +
                'oninput="window.__heartMove(this.value)" style="width:100%;margin:10px 0 4px;accent-color:' + T.INK2 + ';">' : '') +
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">' +
                '<span id="hb-time" class="pg-meta">' + fmt(st.start) + ' – ' + fmt(st.start + st.win) + '</span>' +
                '<span id="hb-play" onclick="window.__heartPlay()" style="font-size:13.5px;font-weight:700;color:' + T.INK2 + ';cursor:pointer;padding:8px 12px;border:1px solid ' + T.LINE + ';border-radius:10px;background:#FFF;">▶ 들어 보기</span>' +
            '</div>' +
            '<div style="display:flex;gap:10px;margin-top:18px;">' +
                '<div style="flex:1;"><div class="pg-meta" style="margin-bottom:6px;">찍은 날</div>' +
                    '<input type="date" id="hb-date" value="' + st.dateKey + '" max="' + u.todayKey() + '" onchange="window.__heartDate(this.value)"></div>' +
                '<div style="flex:1;"><div class="pg-meta" style="margin-bottom:6px;">그때</div>' +
                    '<div id="hb-week" class="pg-serif" style="padding:13px 2px;font-size:18px;font-weight:700;color:' + T.INK2 + ';">' + (w ? '임신 ' + w.weeks + '주 ' + w.days + '일' : '-') + '</div></div>' +
            '</div>' +
            '<div class="pg-meta" style="margin:14px 0 6px;">엽서에 남길 한 줄 (선택)</div>' +
            '<input type="text" id="hb-note" maxlength="40" placeholder="예) 처음 들은 날, 둘 다 울었어">' +
            (typeof window.publishNewsHeart === "function"
                ? '<label style="display:flex;gap:10px;align-items:center;margin-top:14px;font-size:13px;font-weight:600;color:' + T.SUB2 + ';">' +
                    '<input type="checkbox" id="hb-news" ' + (window.hasNewsPage && window.hasNewsPage() ? 'checked' : '') + ' style="width:18px;height:18px;accent-color:' + T.INK2 + ';">' +
                    '가족 소식 페이지에도 올리기 (할머니 · 할아버지가 들을 수 있어요)</label>' : '') +
            u.primary("배냇함에 담고 엽서 만들기", "window.__heartSave()"));
        var s = document.getElementById("stage-sheet");
        if (s) s.onclick = function (e) { if (e.target === s) { stopPlay(); s.remove(); } };
    }
    function fmt(t) { t = Math.max(0, Math.round(t)); return Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0"); }

    window.__heartMove = function (v) {
        st.start = Math.max(0, Math.min(Number(v) || 0, st.buf.duration - st.win));
        stopPlay();
        var b = document.getElementById("hb-bars"); if (b) b.innerHTML = pickBars();
        var t = document.getElementById("hb-time"); if (t) t.textContent = fmt(st.start) + " – " + fmt(st.start + st.win);
    };
    window.__heartDate = function (v) {
        if (!v) return;
        st.dateKey = v;
        var u = ui(), w = u.weeksFromDue(u.dueDate(), u.fromKey(v)), el = document.getElementById("hb-week");
        if (el) el.textContent = w ? "임신 " + w.weeks + "주 " + w.days + "일" : "-";
    };
    window.__heartPlay = function () {
        if (!st) return;
        if (st.src) return stopPlay();
        try {
            if (ac.state === "suspended") ac.resume();
            var src = ac.createBufferSource();
            src.buffer = st.buf; src.connect(ac.destination);
            src.onended = function () { if (st && st.src === src) stopPlay(); };
            src.start(0, st.start, st.win);
            st.src = src;
            var b = document.getElementById("hb-play"); if (b) b.textContent = "■ 멈추기";
        } catch (e) { toast("소리를 재생하지 못했어요"); }
    };

    /* ---------- 4. 떼어서 담기 ---------- */
    async function cut() {
        var len = Math.floor(st.win * RATE);
        var Off = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        var off = new Off(1, len, RATE);
        var src = off.createBufferSource();
        src.buffer = st.buf; src.connect(off.destination);
        src.start(0, st.start, st.win);
        var out = await off.startRendering();
        return encodeWav(out.getChannelData(0), RATE);
    }

    function heartCount() {
        var n = 0;
        if (typeof window.voiceDays !== "function") return 0;
        window.voiceDays().forEach(function (k) {
            (window.getDayVoices(k) || []).forEach(function (v) { if (v && v.kind === "heart") n++; });
        });
        return n;
    }

    window.__heartSave = async function () {
        var u = ui(), T = u.tokens;
        stopPlay();
        st.note = ((document.getElementById("hb-note") || {}).value || "").trim();
        var first = heartCount() === 0;
        u.sheet('<div class="pg-serif" style="font-size:20px;font-weight:700;color:' + T.INK2 + ';">담는 중이에요</div>' +
            '<div class="pg-meta" style="margin:8px 0 6px;">잠시만요.</div>');
        try {
            var wav = await cut();
            if (typeof window.saveVoiceBlob !== "function") throw new Error("saveVoiceBlob 없음");
            var saved = await window.saveVoiceBlob(st.dateKey, wav, Math.round(st.win), st.note || "심장 소리", { kind: "heart" });
            if (!saved) { u.closeSheet(); return; }
            var toNews = !!(document.getElementById("hb-news") || {}).checked;
            var peaks = (typeof window.peaksFrom === "function") ? await window.peaksFrom(wav) : null;
            if (toNews && typeof window.publishNewsHeart === "function" && typeof window.getDayVoices === "function") {
                var v = (window.getDayVoices(st.dateKey) || []).filter(function (x) { return x && x.id === saved.id; })[0];
                var wk = u.weeksFromDue(u.dueDate(), u.fromKey(st.dateKey));
                if (v && v.url) window.publishNewsHeart({ id: saved.id, url: v.url, key: st.dateKey, week: wk ? wk.weeks : 0, line: st.note });
            }
            u.closeSheet();
            toast("💛 심장 소리를 배냇함에 담았어요");
            if (peaks) makeCard(peaks, st.dateKey, st.note, first);
            if (typeof window.refreshStageHome === "function") window.refreshStageHome();
        } catch (e) {
            console.warn("[심장 소리] 담기 실패", e);
            u.sheet('<div class="pg-serif" style="font-size:20px;font-weight:700;color:' + T.INK2 + ';">담지 못했어요</div>' +
                '<div class="pg-meta" style="margin:8px 0 6px;">연결을 확인하고 다시 해 주세요.</div>' + u.primary("다시 하기", "window.openHeartSheet()"));
        }
    };

    /* ---------- 5. 엽서 ---------- */
    function cardDOM(peaks, key, note, first) {
        var u = ui(), T = u.tokens, w = u.weeksFromDue(u.dueDate(), u.fromKey(key));
        var d = u.fromKey(key), name = u.babyName();
        var wave = (typeof window.renderWave === "function")
            ? window.renderWave(peaks, { w: 880, h: 300, color: "#B98A2E", gap: 3, min: 5 }) : "";
        var stage = document.createElement("div");
        stage.id = "hb-card";
        stage.style.cssText = "position:fixed;top:0;left:0;width:1080px;height:1350px;background:#F6F0E6;padding:56px;box-sizing:border-box;" +
            "font-family:'Pretendard','Noto Sans KR',sans-serif;z-index:-9999;pointer-events:none;";
        stage.innerHTML =
            '<div style="width:100%;height:100%;background:#FFFDF9;border:2px solid #EFE7DC;border-radius:28px;box-sizing:border-box;' +
                'padding:96px 100px 72px;display:flex;flex-direction:column;align-items:center;text-align:center;">' +
                '<div style="font-size:26px;font-weight:700;color:#B98A2E;letter-spacing:6px;">심장 소리</div>' +
                '<div style="font-family:' + T.SERIF + ';font-size:68px;font-weight:700;color:#3B322C;letter-spacing:-2px;line-height:1.3;margin-top:34px;word-break:keep-all;">' +
                    u.esc(name) + '의<br>' + (first ? '첫 ' : '') + '심장 소리</div>' +
                '<div style="margin:auto 0;width:100%;">' + wave + '</div>' +
                (note ? '<div style="font-family:\'Nanum Pen Script\',cursive;font-size:46px;color:#6F645C;margin-bottom:34px;">' + u.esc(note) + '</div>' : '') +
                '<div style="font-family:' + T.SERIF + ';font-size:34px;color:#3B322C;">' + (w ? '임신 ' + w.weeks + '주 ' + w.days + '일' : '') + '</div>' +
                '<div style="font-size:24px;font-weight:600;color:#8A7F76;margin-top:12px;">' + d.getFullYear() + '. ' + (d.getMonth() + 1) + '. ' + d.getDate() + '.</div>' +
                '<div style="width:100%;border-top:1px solid #EFE7DC;margin-top:56px;padding-top:28px;font-size:21px;font-weight:600;color:#B5AAA0;">' +
                    '배냇함 · 아이에게 남기는 상자</div>' +
            '</div>';
        return stage;
    }
    window.__heartCardDOM = cardDOM;     // 미리보기 · 시험용

    function makeCard(peaks, key, note, first) {
        if (typeof html2canvas === "undefined") return toast("엽서 도구를 불러오지 못했어요");
        var stage = cardDOM(peaks, key, note, first);
        document.body.appendChild(stage);
        var go = function () {
            html2canvas(stage, { scale: 1, backgroundColor: "#F6F0E6", useCORS: true, logging: false }).then(function (canvas) {
                canvas.toBlob(function (blob) {
                    stage.remove();
                    if (!blob) return toast("엽서를 만들지 못했어요");
                    var file = new File([blob], ui().babyName() + "_심장소리.png", { type: "image/png" });
                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        navigator.share({ files: [file], title: ui().babyName() + " 심장 소리" }).catch(function () {});
                    } else {
                        var a = document.createElement("a");
                        a.href = URL.createObjectURL(blob); a.download = file.name;
                        document.body.appendChild(a); a.click(); a.remove();
                        toast("엽서를 저장했어요");
                    }
                });
            }).catch(function () { stage.remove(); toast("엽서를 만들지 못했어요"); });
        };
        try {
            Promise.all([document.fonts.load("700 68px 'Gowun Batang'"), document.fonts.load("46px 'Nanum Pen Script'")]).then(function () { setTimeout(go, 150); }, go);
        } catch (e) { setTimeout(go, 400); }
    }
})();