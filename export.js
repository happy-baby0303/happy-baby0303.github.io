/* ============================================================
   배냇함 — 배냇함 내려받기 (export.js)

   "스무 살에 열립니다" 는 이 앱에서 가장 무거운 약속이다.
   20년 뒤에 이 앱이 있을지 사용자는 모른다.

   그래서 역설적으로, 언제든 통째로 꺼내갈 수 있어야 안 떠난다.
   탈출구가 보이면 사람은 나가지 않는다.

   사진 · 소리 · 편지 · 도감을 ZIP 한 개로 묶는다.
   JSZip 은 누를 때만 불러온다. 평소 로딩을 늦추지 않기 위해서.

   index.html 에서 postcard.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var JSZIP_CDN = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
    var BIG_WARN  = 350 * 1024 * 1024;   // 이만큼 넘으면 PC 를 권한다
    var GOLD      = "#B98A2E";
    var PURPLE    = "#7F77DD";

    var busy = false, cancelled = false;

    /* ---------- 작은 도구들 ---------- */

    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    function babyName() { return localStorage.getItem("tosil_babyName") || "우리아기"; }

    // 하윤 + 가 → 하윤이가 (data.js 의 babyCall 과 같은 규칙)
    function callName(j) {
        try { if (typeof window.babyCall === "function") return window.babyCall(j || ""); } catch (e) {}
        var n = babyName(), c = n.charCodeAt(n.length - 1);
        var jong = c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0;
        return n + (jong ? "이" : "") + (j || "");
    }

    // 이 폰 시계 기준 날짜 (toISOString 은 영국 시각이라 오전 9시 전엔 하루 전으로 찍힌다)
    function localKey(ts) {
        var d = new Date(ts);
        if (isNaN(d.getTime())) return "";
        return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    }

    function toast(m) { if (typeof window.showToast === "function") window.showToast(m); }

    function todayStr() {
        var d = new Date();
        return d.getFullYear() +
               String(d.getMonth() + 1).padStart(2, "0") +
               String(d.getDate()).padStart(2, "0");
    }

    function pretty(k) {
        var p = String(k).split("-");
        return p.length === 3 ? (p[0] + "년 " + Number(p[1]) + "월 " + Number(p[2]) + "일") : String(k);
    }

    function dday(k) {
        var s = localStorage.getItem("tosil_startDate");
        if (!s || !k) return "";
        var b = new Date(s + "T00:00:00").getTime();
        var t = new Date(String(k) + "T00:00:00").getTime();
        if (isNaN(b) || isNaN(t)) return "";
        var n = Math.floor((t - b) / 86400000);
        return n >= 0 ? "D+" + n : "";
    }

    // 파일 이름에 못 쓰는 글자 정리
    function safe(name) {
        return String(name || "").replace(/[\\/:*?"<>|]/g, "_").slice(0, 60);
    }

    function mb(bytes) { return (bytes / 1048576).toFixed(1) + "MB"; }

    /* ---------- JSZip 은 누를 때만 ---------- */

    function loadJSZip() {
        return new Promise(function (resolve, reject) {
            if (window.JSZip) return resolve(window.JSZip);
            var s = document.createElement("script");
            s.src = JSZIP_CDN;
            s.onload = function () { window.JSZip ? resolve(window.JSZip) : reject(new Error("JSZip 없음")); };
            s.onerror = function () { reject(new Error("JSZip 로드 실패")); };
            document.head.appendChild(s);
        });
    }

    /* ---------- 데이터 모으기 ---------- */

    function milestoneList() {
        var list = null;
        try { if (typeof MILESTONE_DATA !== "undefined" && MILESTONE_DATA) list = MILESTONE_DATA; } catch (e) {}
        return list || window.MILESTONE_DATA || [];
    }

    function achievedMilestones() {
        var raw = [];
        try { raw = JSON.parse(localStorage.getItem("tosil_milestones")) || []; } catch (e) {}
        var all = milestoneList(), out = [];
        raw.forEach(function (a) {
            var id = (typeof a === "string") ? a : (a && a.id);
            if (!id) return;
            var m = all.filter(function (x) { return x.id === id; })[0];
            out.push({
                id: id,
                title: m ? m.title : id,
                desc: m ? m.desc : "",
                date: (a && a.date) || ""
            });
        });
        return out;
    }

    function allPhotos() {
        if (typeof window.photoDays !== "function") return [];
        var out = [];
        window.photoDays().sort().forEach(function (k) {
            (window.getDayPhotos(k) || []).forEach(function (p) { out.push({ key: k, p: p }); });
        });
        return out;
    }

    function allVoices() {
        if (typeof window.voiceDays !== "function") return [];
        var out = [];
        window.voiceDays().sort().forEach(function (k) {
            (window.getDayVoices(k) || []).forEach(function (v) { out.push({ key: k, v: v }); });
        });
        return out;
    }

    function allLetters() {
        if (typeof window.sealedLetters === "function") return window.sealedLetters();
        try { return JSON.parse(localStorage.getItem("tosil_sealed")) || []; } catch (e) { return []; }
    }

    /* ⚠️ '통째로 꺼내 간다' 고 해놓고 두 가지가 빠져 있었다.
          · 우리 둘의 문답 (육아문답) — 부부가 매일 쓴 글. 종이책으로 팔 계획인 그것
          · 아기가 쓴 편지와 엄마·아빠의 답장 (편지함)
          떠날 때 제일 아까운 게 이 둘이다. */

    // 문답 — 둘 다 쓴 날은 둘 다, 나만 쓴 날은 내 것만.
    //        짝꿍만 쓴 날은 담지 않는다 (앱에서도 내 답을 써야 열리는 글이다)
    function diaryPages() {
        var role = localStorage.getItem("user_role");
        var mine = role === "dad" ? "husbandAns" : role === "mom" ? "wifeAns"
                 : ((localStorage.getItem("tosil_userRole") || "husband") === "husband" ? "husbandAns" : "wifeAns");
        var out = [];
        for (var i = 1; i <= 2000; i++) {
            var raw = localStorage.getItem("day_" + i + "_data");
            if (!raw) continue;
            var d;
            try { d = JSON.parse(raw) || {}; } catch (e) { continue; }
            if (!d[mine]) continue;
            var both = !!(d.husbandAns && d.wifeAns);
            out.push({
                day: i,
                q: (typeof window.diaryQuestion === "function") ? window.diaryQuestion(i) : "",
                date: d.date ? localKey(d.date) : "",
                dad: (both || mine === "husbandAns") ? (d.husbandAns || "") : "",
                mom: (both || mine === "wifeAns") ? (d.wifeAns || "") : ""
            });
        }
        return out;
    }

    // 편지함 — 아기 시점 편지 + 엄마·아빠 답장
    function babyLetters() {
        var L = {}, R = {};
        try { L = JSON.parse(localStorage.getItem("tosil_letters")) || {}; } catch (e) {}
        try { R = JSON.parse(localStorage.getItem("tosil_replies")) || {}; } catch (e) {}
        return Object.keys(L).sort().map(function (k) {
            var l = L[k] || {}, r = R[k] || {};
            // 배냇함에서 남긴 한 줄도 그날 편지에 같이 (편지함 화면과 같게)
            var lines = [];
            if (r.mom && r.mom.text) lines.push({ who: "엄마", text: r.mom.text });
            if (r.dad && r.dad.text) lines.push({ who: "아빠", text: r.dad.text });
            dayNotes(k).forEach(function (n) { if (n && n.text) lines.push({ who: n.who || "", text: n.text }); });
            return { date: k, ms: l.ms || "", text: l.text || "", lines: lines };
        }).filter(function (x) { return x.text; });
    }

    // 부모의 한 줄 (notes.js) — 편지가 없는 날에 쓴 것도 빠짐없이
    function dayNotes(k) {
        try { if (typeof window.getDayNotes === "function") return window.getDayNotes(k) || []; } catch (e) {}
        return [];
    }
    function allNotes() {
        var days = [];
        try { if (typeof window.noteDays === "function") days = window.noteDays() || []; } catch (e) {}
        return days.slice().sort().map(function (k) {
            return { date: k, lines: dayNotes(k).filter(function (n) { return n && n.text; })
                                   .map(function (n) { return { who: n.who || "", text: n.text }; }) };
        }).filter(function (d) { return d.lines.length; });
    }

    var RULE_LINE = "\n────────────────────────────\n\n";

    function diaryText(pages) {
        return "우리 둘의 문답 — " + callName("를") + " 키우며\n\n" +
            pages.map(function (p) {
                return "DAY " + p.day + (p.date ? "  ·  " + pretty(p.date) : "") + "\n" +
                       (p.q ? "Q. " + p.q + "\n\n" : "\n") +
                       (p.dad ? "아빠\n" + p.dad + "\n\n" : "") +
                       (p.mom ? "엄마\n" + p.mom + "\n\n" : "") +
                       ((p.dad && p.mom) ? "" : "(짝꿍의 답은 아직이에요)\n");
            }).join(RULE_LINE);
    }

    function lettersByYear(list) {
        var by = {};
        list.forEach(function (l) {
            var y = String(l.date).slice(0, 4);
            (by[y] = by[y] || []).push(
                pretty(l.date) + (dday(l.date) ? "  " + dday(l.date) : "") + "\n\n" +
                (l.ms ? l.ms + "\n\n" : "") + l.text + "\n\n— " + callName("가") + "\n" +
                (l.lines || []).map(function (x) {
                    return "\n" + (x.who ? x.who + "의 한 줄" : "한 줄") + "\n" + x.text + "\n";
                }).join("")
            );
        });
        return by;
    }

    /* ---------- 파일 가져오기 ----------
       1) 이 기기에 캐시된 원본 → 항상 된다
       2) 없으면 스토리지 URL   → 버킷에 CORS 가 열려 있어야 한다 -------- */

    function dataUrlToBlob(dataUrl) {
        try {
            var parts = String(dataUrl).split(",");
            var mime = (parts[0].match(/:(.*?);/) || [])[1] || "application/octet-stream";
            var bin = atob(parts[1]);
            var arr = new Uint8Array(bin.length);
            for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
            return new Blob([arr], { type: mime });
        } catch (e) { return null; }
    }

    async function grabPhoto(p) {
        if (typeof window.getCachedPhotoData === "function") {
            try {
                var cached = await window.getCachedPhotoData(p.id);
                if (cached) { var b = dataUrlToBlob(cached); if (b) return b; }
            } catch (e) {}
        }
        if (!p.url) return null;
        try {
            var res = await fetch(p.url, { mode: "cors" });
            if (!res.ok) return null;
            return await res.blob();
        } catch (e) { return null; }
    }

    async function grabVoice(v) {
        if (!v.url) return null;
        try {
            var res = await fetch(v.url, { mode: "cors" });
            if (!res.ok) return null;
            return await res.blob();
        } catch (e) { return null; }
    }

    function extOf(blob, fallback) {
        var t = (blob && blob.type) || "";
        if (t.indexOf("jpeg") > -1) return "jpg";
        if (t.indexOf("png") > -1)  return "png";
        if (t.indexOf("webp") > -1) return "webp";
        if (t.indexOf("webm") > -1) return "webm";
        if (t.indexOf("mp4") > -1)  return "m4a";
        if (t.indexOf("mpeg") > -1) return "mp3";
        if (t.indexOf("wav") > -1)  return "wav";
        return fallback;
    }

    /* ---------- 진행 화면 ---------- */

    function openProgress() {
        var old = document.getElementById("export-progress");
        if (old) old.remove();

        var el = document.createElement("div");
        el.id = "export-progress";
        el.setAttribute("style", "position:fixed; inset:0; z-index:100005; background:rgba(35,29,24,0.62); display:flex; align-items:center; justify-content:center; padding:26px;");
        el.innerHTML =
            '<div style="width:100%; max-width:330px; background:var(--bg-card); border-radius:24px; padding:30px 24px 24px; text-align:center;">' +
                '<div style="font-size:38px; margin-bottom:16px;">🧺</div>' +
                '<div style="font-size:16px; font-weight:900; color:var(--text-m); letter-spacing:-0.4px;">배냇함을 싸는 중이에요</div>' +
                '<div id="export-msg" style="font-size:12.5px; font-weight:700; color:var(--text-sub); margin-top:9px; line-height:1.6; word-break:keep-all;">준비하고 있어요…</div>' +
                '<div style="height:7px; background:var(--bg-sub); border-radius:4px; margin:20px 0 6px; overflow:hidden;">' +
                    '<div id="export-bar" style="height:100%; width:2%; background:' + PURPLE + '; border-radius:4px; transition:width 0.25s;"></div>' +
                '</div>' +
                '<div id="export-pct" style="font-size:11px; font-weight:800; color:var(--text-sub);">2%</div>' +
                '<div onclick="window.cancelMemoryExport()" style="margin-top:20px; font-size:12.5px; font-weight:700; color:var(--text-sub); cursor:pointer;">그만두기</div>' +
            '</div>';
        document.body.appendChild(el);
    }

    function setProgress(pct, msg) {
        var bar = document.getElementById("export-bar");
        var p   = document.getElementById("export-pct");
        var m   = document.getElementById("export-msg");
        var v = Math.max(2, Math.min(100, Math.round(pct)));
        if (bar) bar.style.width = v + "%";
        if (p) p.textContent = v + "%";
        if (m && msg) m.textContent = msg;
    }

    function closeProgress() {
        var el = document.getElementById("export-progress");
        if (el) el.remove();
    }

    window.cancelMemoryExport = function () {
        cancelled = true;
        closeProgress();
        toast("내려받기를 멈췄어요");
    };

    /* ---------- 사람이 읽는 목차 ---------- */

    function readmeHtml(d) {
        var rows = function (title, items) {
            if (!items.length) return "";
            return '<h2>' + esc(title) + ' <small>' + items.length + '</small></h2><ul>' +
                items.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join("") + '</ul>';
        };

        return '<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8">' +
            '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
            '<title>' + esc(babyName()) + '의 배냇함</title><style>' +
            'body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#FAF7F2;color:#4A413C;' +
            'max-width:640px;margin:0 auto;padding:40px 24px 80px;line-height:1.75;}' +
            'h1{font-size:26px;letter-spacing:-1px;margin:0 0 6px;}' +
            'h2{font-size:15px;color:' + GOLD + ';margin:34px 0 10px;letter-spacing:-0.3px;}' +
            'h2 small{color:#A3958A;font-weight:400;}' +
            '.sub{color:#A3958A;font-size:13px;margin-bottom:30px;}' +
            'ul{padding-left:18px;margin:0;} li{font-size:14px;margin-bottom:5px;}' +
            '.box{background:#FFF;border:1px solid #EDE6DE;border-radius:16px;padding:18px 20px;margin-top:34px;font-size:13px;color:#7A6F68;}' +
            '</style></head><body>' +
            '<h1>' + esc(babyName()) + '의 배냇함</h1>' +
            '<div class="sub">' + esc(d.stamp) + '에 꺼냈어요' +
                (d.birth ? ' · 태어난 날 ' + esc(pretty(d.birth)) : '') + '</div>' +
            rows("처음 해낸 일", d.milestones.map(function (m) {
                return m.title + (m.date ? "  (" + pretty(m.date) + ")" : "");
            })) +
            rows("봉인 편지", d.letters.map(function (l) {
                return l.label + " · " + (l.opened ? "열어봤어요" : "개봉일 " + pretty(l.openAt));
            })) +
            (d.diaryN ? '<h2>우리 둘의 문답 <small>' + d.diaryN + '쪽</small></h2><ul><li>우리 둘의 문답.txt 에 날짜순으로 들어 있어요</li></ul>' : '') +
            (d.babyN ? '<h2>아기가 쓴 편지 <small>' + d.babyN + '통</small></h2><ul><li>아기가 쓴 편지 폴더에 해마다 한 파일씩, 엄마·아빠의 한 줄과 함께 들어 있어요</li></ul>' : '') +
            (d.noteN ? '<h2>부모의 한 줄 <small>' + d.noteN + '줄</small></h2><ul><li>부모의 한 줄.txt 에 날짜순으로 들어 있어요</li></ul>' : '') +
            '<h2>사진 <small>' + d.photoN + '장</small></h2><ul><li>사진 폴더에 날짜순으로 들어 있어요</li></ul>' +
            '<h2>소리 <small>' + d.voiceN + '개</small></h2><ul><li>소리 폴더에 날짜순으로 들어 있어요</li></ul>' +
            '<div class="box">이 폴더는 배냇함 없이도 열립니다.<br>' +
            '기록.json 에는 여기 담긴 기록이 앱에 저장된 모양 그대로 들어 있어요. 다른 프로그램으로도 열 수 있어요.<br>' +
            '어디에 두시든, 이건 온전히 ' + esc(babyName()) + '의 것입니다.</div>' +
            '</body></html>';
    }

    /* ---------- 본체 ---------- */

    window.exportMemoryBox = async function (withMedia) {
        if (busy) return toast("이미 싸고 있어요");
        busy = true; cancelled = false;

        var photos  = withMedia ? allPhotos() : [];
        var voices  = withMedia ? allVoices() : [];
        var letters = allLetters();
        var stones  = achievedMilestones();
        var pages   = diaryPages();
        var baby    = babyLetters();
        var notes   = allNotes();

        openProgress();

        try {
            setProgress(3, "도구를 준비하고 있어요…");
            var JSZip = await loadJSZip();
            if (cancelled) return;

            var zip = new JSZip();
            var stamp = todayStr();
            // ⚠️ "배냇함_하윤_배냇함_20260919" — 앱 이름을 바꾸면서 두 번 들어갔다
            var rootName = "배냇함_" + safe(babyName()) + "_" + stamp;
            var root = zip.folder(rootName);

            var failed = [];
            var bytes = 0;

            /* 1. 글자로 된 것들 — 항상 담긴다 */
            setProgress(6, "기록을 옮기고 있어요…");

            root.file("기록.json", JSON.stringify({
                내보낸날: new Date().toISOString(),
                아기이름: babyName(),
                태어난날: localStorage.getItem("tosil_startDate") || "",
                처음해낸일: stones,
                봉인편지: letters,
                우리둘의문답: pages,
                아기가쓴편지: baby,
                부모의한줄: notes,
                사진목록: allPhotos().map(function (x) {
                    return { 날짜: x.key, id: x.p.id, 한마디: x.p.caption || "", 도감: x.p.msId || "", 주소: x.p.url || "" };
                }),
                소리목록: allVoices().map(function (x) {
                    return { 날짜: x.key, id: x.v.id, 길이초: x.v.sec || 0, 메모: x.v.note || "", 주소: x.v.url || "" };
                })
            }, null, 2));

            if (stones.length) {
                root.file("도감.txt", stones.map(function (m, i) {
                    return (i + 1) + ". " + m.title +
                           (m.date ? "  —  " + pretty(m.date) + " " + dday(m.date) : "") +
                           (m.desc ? "\n   " + m.desc : "");
                }).join("\n\n"));
            }

            if (letters.length) {
                var lf = root.folder("편지");
                letters.forEach(function (l, i) {
                    var head =
                        "받는 사람 : " + (l.to || "") + " " + babyName() + "\n" +
                        "쓴 사람   : " + (l.who || "") + "\n" +
                        "봉인한 날 : " + pretty(l.at || l.createdAt || "") + "\n" +
                        "여는 날   : " + pretty(l.openAt || "") + "\n" +
                        "상태      : " + (l.opened ? "열어봤어요" : "아직 봉인 중") + "\n" +
                        "\n────────────────────────────\n\n";
                    lf.file(safe((l.openAt || "언젠가") + "_" + (l.label || ("편지" + (i + 1)))) + ".txt",
                            head + (l.body || l.text || l.message || ""));
                });
            }

            if (pages.length) root.file("우리 둘의 문답.txt", diaryText(pages));

            if (notes.length) {
                root.file("부모의 한 줄.txt", "엄마 · 아빠가 " + callName("에게") + " 남긴 한 줄\n\n" +
                    notes.map(function (d) {
                        return pretty(d.date) + (dday(d.date) ? "  " + dday(d.date) : "") + "\n" +
                            d.lines.map(function (x) { return (x.who ? x.who + " — " : "") + x.text; }).join("\n");
                    }).join(RULE_LINE));
            }

            if (baby.length) {
                var byY = lettersByYear(baby), bf = root.folder("아기가 쓴 편지");
                Object.keys(byY).sort().forEach(function (y) {
                    bf.file(y + "년.txt", callName("가") + " 쓴 편지 — " + y + "년\n\n" + byY[y].join(RULE_LINE));
                });
            }

            /* 2. 사진 */
            var total = photos.length + voices.length;
            var done = 0;

            if (photos.length) {
                var pf = root.folder("사진");
                var perDay = {};
                for (var i = 0; i < photos.length; i++) {
                    if (cancelled) return;
                    var it = photos[i];
                    setProgress(8 + (done / Math.max(1, total)) * 72,
                                "사진을 담는 중  " + (i + 1) + " / " + photos.length);

                    var blob = await grabPhoto(it.p);
                    if (blob) {
                        perDay[it.key] = (perDay[it.key] || 0) + 1;
                        var nm = it.key + (perDay[it.key] > 1 ? "_" + perDay[it.key] : "") +
                                 (it.p.caption ? "_" + safe(it.p.caption) : "") + "." + extOf(blob, "jpg");
                        pf.file(nm, blob);
                        bytes += blob.size;
                    } else {
                        failed.push("사진  " + it.key + "  " + (it.p.url || it.p.id));
                    }
                    done++;
                }
            }

            /* 3. 소리 */
            if (voices.length) {
                var vf = root.folder("소리");
                var perDayV = {};
                for (var j = 0; j < voices.length; j++) {
                    if (cancelled) return;
                    var iv = voices[j];
                    setProgress(8 + (done / Math.max(1, total)) * 72,
                                "소리를 담는 중  " + (j + 1) + " / " + voices.length);

                    var vb = await grabVoice(iv.v);
                    if (vb) {
                        perDayV[iv.key] = (perDayV[iv.key] || 0) + 1;
                        var vn = iv.key + (perDayV[iv.key] > 1 ? "_" + perDayV[iv.key] : "") +
                                 (iv.v.note ? "_" + safe(iv.v.note) : "") + "." + extOf(vb, "webm");
                        vf.file(vn, vb);
                        bytes += vb.size;
                    } else {
                        failed.push("소리  " + iv.key + "  " + (iv.v.url || iv.v.id));
                    }
                    done++;
                }
            }

            if (cancelled) return;

            /* 4. 목차와 실패 목록 */
            root.file("읽어주세요.html", readmeHtml({
                stamp: pretty(localKey(Date.now())),   // ⚠️ toISOString 은 오전 9시 전이면 어제 날짜였다
                diaryN: pages.length,
                babyN: baby.length,
                noteN: notes.reduce(function (n, d) { return n + d.lines.length; }, 0),
                birth: localStorage.getItem("tosil_startDate") || "",
                milestones: stones,
                letters: letters,
                photoN: photos.length,
                voiceN: voices.length
            }));

            if (failed.length) {
                root.file("못담은것.txt",
                    "아래 파일은 이 기기에서 받아오지 못했어요.\n" +
                    "다른 기기(사진을 처음 담은 기기)에서 다시 시도하면 담깁니다.\n\n" +
                    failed.join("\n"));
            }

            /* 5. 묶기 */
            setProgress(82, "파일 하나로 묶는 중이에요…");

            var out = await zip.generateAsync(
                { type: "blob", compression: "DEFLATE", compressionOptions: { level: 3 } },
                function (meta) { setProgress(82 + meta.percent * 0.17); }
            );

            if (cancelled) return;
            closeProgress();

            /* 6. 내보내기 */
            var filename = rootName + ".zip";
            var file = null;
            try { file = new File([out], filename, { type: "application/zip" }); } catch (e) {}

            if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({ files: [file], title: babyName() + "의 배냇함" });
                } catch (e) { /* 사용자가 닫은 것 — 조용히 */ }
            } else {
                var url = URL.createObjectURL(out);
                var a = document.createElement("a");
                a.href = url; a.download = filename;
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
            }

            toast("🧺 배냇함을 꺼냈어요  ·  " + mb(out.size) +
                  (failed.length ? "  (" + failed.length + "개는 못 담았어요)" : ""));

        } catch (e) {
            console.error("[내려받기] 실패", e);
            closeProgress();
            toast("내려받는 중 문제가 생겼어요. 잠시 뒤 다시 해주세요");
        } finally {
            busy = false;
            closeProgress();
        }
    };

    /* ---------- 무엇까지 담을지 먼저 묻는다 ---------- */

    window.openExportSheet = function () {
        var pN = allPhotos().length, vN = allVoices().length;
        var lN = allLetters().length, mN = achievedMilestones().length;
        var dN = diaryPages().length, bN = babyLetters().length;
        var heavy = pN > 120;

        var old = document.getElementById("export-sheet");
        if (old) old.remove();

        var wrap = document.createElement("div");
        wrap.id = "export-sheet";
        wrap.setAttribute("style", "position:fixed; inset:0; z-index:100004; background:rgba(35,29,24,0.55); display:flex; align-items:flex-end; justify-content:center;");
        wrap.onclick = function (e) { if (e.target === wrap) wrap.remove(); };

        var btn = function (act, title, sub, main) {
            return '<div onclick="document.getElementById(\'export-sheet\').remove(); ' + act + '" ' +
                'style="padding:16px 18px; border-radius:16px; margin-bottom:10px; cursor:pointer; ' +
                (main ? 'background:' + PURPLE + '; color:#FFF;' : 'background:var(--bg-sub); color:var(--text-m);') + '">' +
                '<div style="font-size:14.5px; font-weight:800; letter-spacing:-0.3px;">' + esc(title) + '</div>' +
                '<div style="font-size:11.5px; font-weight:600; margin-top:3px;' + (main ? ' opacity:0.85;' : ' color:var(--text-sub);') + '">' + esc(sub) + '</div>' +
            '</div>';
        };

        wrap.innerHTML =
        '<div style="width:100%; max-width:480px; background:var(--bg-card); border-radius:26px 26px 0 0; padding:22px 20px calc(30px + env(safe-area-inset-bottom, 0px));">' +
            '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">' +
                '<span style="font-size:16.5px; font-weight:900; color:var(--text-m); letter-spacing:-0.4px;">🧺 배냇함 내려받기</span>' +
                '<span onclick="document.getElementById(\'export-sheet\').remove()" style="font-size:22px; font-weight:300; color:var(--text-sub); cursor:pointer; line-height:1;">×</span>' +
            '</div>' +
            '<div style="font-size:12.5px; font-weight:600; color:var(--text-sub); line-height:1.7; margin-bottom:18px; word-break:keep-all;">' +
                                '앱이 없어도 열리는 폴더 하나로 만들어 드려요.<br>' +
                '어디에 두시든 이건 온전히 우리 아기 것입니다.' +
            '</div>' +
                                   btn("window.exportMemoryBox(true)", "전부 받기",
                "사진 " + pN + "장 · 소리 " + vN + "개 · 글 전부" + (heavy ? " · 와이파이에서 받으세요" : ""), true) +
            btn("window.exportMemoryBox(false)", "사진 빼고 받기",
                "봉인 편지 " + lN + " · 아기 편지 " + bN + " · 문답 " + dN + "쪽 · 도감 " + mN) +
            '<div style="text-align:center; font-size:11px; font-weight:600; color:var(--text-sub); margin-top:10px; line-height:1.6;">' +
                '이 파일은 어디에도 올라가지 않아요. 이 기기에서 바로 만들어집니다.</div>' +
        '</div>';

        document.body.appendChild(wrap);
    };

    /* ---------- 설정 탭에 자리 만들기 ----------
       기존 renderSettingsTab 은 건드리지 않고 맨 위에 카드만 얹는다. -------- */

    (function mountCard() {
        var _origin = window.renderSettingsTab;
        window.renderSettingsTab = function () {
            if (typeof _origin === "function") _origin.apply(this, arguments);

            var container = document.getElementById("tab-settings");
            if (!container || document.getElementById("export-card")) return;

            var card = document.createElement("div");
            card.id = "export-card";
            card.style.cssText = "display:flex; align-items:center; gap:14px; background:var(--bg-card); padding:18px 20px; border-radius:16px; border:1px solid var(--border); margin-bottom:16px; box-sizing:border-box; width:100%; cursor:pointer;";
            card.onclick = function () { window.openExportSheet(); };
            card.innerHTML =
                '<div style="font-size:22px;">🧺</div>' +
                '<div style="flex:1; min-width:0;">' +
                    '<div style="font-size:15px; font-weight:900; color:var(--text-m);">배냇함 내려받기</div>' +
                    '<div style="font-size:12px; font-weight:600; color:var(--text-sub); margin-top:2px;">사진 · 소리 · 편지를 통째로 보관하세요</div>' +
                '</div>' +
                '<div style="font-size:12px; color:var(--text-sub);">〉</div>';

            container.prepend(card);
        };
    })();

    /* ---------- 점검용 ---------- */
    window.exportDebug = function () {
        console.log("사진:", allPhotos().length);
        console.log("소리:", allVoices().length);
        console.log("편지:", allLetters().length);
        console.log("도감:", achievedMilestones().length);
        console.log("문답:", diaryPages().length + "쪽 (짝꿍만 쓴 날은 뺌)");
        console.log("아기 편지:", babyLetters().length + "통");
        console.log("부모의 한 줄:", allNotes().length + "일");
    };
})();