/* ============================================================
   배냇함 — 매주 가족 소식 (familynews.js)        ※ 숨김 스위치 뒤 (stage.js)

   임신한 사람의 진짜 곤란함 하나: 양가 부모님께 소식을 어떻게 전하나.
   한 주에 배 사진 한 장 → "콩콩이 23주 소식" 카드 → 가족 단톡방으로.

     · 할머니 · 할아버지는 이걸 매주 기다린다
     · 카드 맨 아래 '배냇함' 과 주소가 들어간다. 보는 사람이 다음 사용자가 된다
     · 사진이 모이면 40칸 모아 보기, 아기가 태어나면 출생 카드로 끝난다

   저장: 아기마다 tosil_preg_weeks = { "23": { key, id, url, line, at } }
   동기화: growth_가족코드(+꼬리표)/stage 의 weeks 칸 — 주마다 따로 덮어쓴다(merge)

   ⚠️ 출시 뒤 스토어 주소가 생기면 APP_LINK 만 바꾸면 된다.

   index.html 에서 stage.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var APP_LINK = "https://happy-baby0303.github.io/";

    function ui() { return window.stageUI || null; }
    function toast(m) { if (typeof window.showToast === "function") window.showToast(m); }
    function load() { try { var v = JSON.parse(localStorage.getItem("tosil_preg_weeks")); return (v && typeof v === "object") ? v : {}; } catch (e) { return {}; } }
    function save(v) { try { localStorage.setItem("tosil_preg_weeks", JSON.stringify(v)); } catch (e) {} }
    function wkNow() {
        var u = ui(); if (!u) return null;
        var w = u.weeksFromDue(u.dueDate());
        return w ? { wk: Math.max(1, Math.min(42, w.weeks)), w: w } : null;
    }
    /* 받침 있는 이름은 '이' 를 붙인다 — 서준 → 서준이를 · 서준이가 (앱의 babyCall 과 같은 규칙) */
    function call(n, j) {
        var c = n.charCodeAt(n.length - 1), jong = c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0;
        return n + (jong && n !== "우리 아기" ? "이" : "") + (j || "");
    }
    function pretty(k) { var d = ui().fromKey(k); return d.getFullYear() + ". " + (d.getMonth() + 1) + ". " + d.getDate() + "."; }

    /* ---------- 동기화 (주마다 따로) ---------- */
    function ref() {
        var code = localStorage.getItem("family_sync_code");
        if (!code || !window.db || typeof window.doc !== "function") return null;
        return window.doc(window.db, "growth_" + code + (window.currentBabySuffix || ""), "stage");
    }
    function pushWeek(wk, rec) {
        var r = ref(); if (!r || typeof window.setDoc !== "function") return;
        var body = { weeks: {} }; body.weeks[wk] = rec;
        try { window.setDoc(r, body, { merge: true }).catch(function (e) { console.warn("[가족 소식] 올리기 실패", e); }); } catch (e) {}
    }
    function merge(remote) {
        if (!remote || typeof remote !== "object") return false;
        var mine = load(), changed = false;
        Object.keys(remote).forEach(function (wk) {
            var r = remote[wk]; if (!r || !r.url) return;
            if (!mine[wk] || Number(r.at || 0) > Number(mine[wk].at || 0)) { mine[wk] = r; changed = true; }
        });
        if (changed) save(mine);
        return changed;
    }
    function watch() {
        var r = ref(); if (!r || typeof window.onSnapshot !== "function") return;
        window.onSnapshot(r, function (snap) {
            if (!snap.exists()) return;
            var data = snap.data() || {};
            if (data.newsId && !newsId()) { try { localStorage.setItem("tosil_news_id", data.newsId); } catch (e) {} }
            if (merge(data.weeks) && typeof window.refreshStageHome === "function") window.refreshStageHome();
        }, function (e) { console.warn("[가족 소식] 실시간 연동 에러", e); });
    }

    /* ---------- 가족 소식 페이지 (news.html) ----------
       할머니 · 할아버지는 앱 없이 카톡 링크로 본다. 엄마 아빠가 '보낸' 것만 올라간다.
       news/{긴 번호} 문서 — 링크를 바꾸면 예전 문서는 비워서 닫는다. */
    var NEWS_PAGE = APP_LINK + "news.html?n=";
    function newsId() { return localStorage.getItem("tosil_news_id") || ""; }
    function makeId() {
        var a = new Uint8Array(20), c = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789", s = "";
        (window.crypto || window.msCrypto).getRandomValues(a);
        for (var i = 0; i < a.length; i++) s += c[a[i] % c.length];
        return s;
    }
    function ensureNewsId() {
        var id = newsId();
        if (!id) {
            id = makeId();
            try { localStorage.setItem("tosil_news_id", id); } catch (e) {}
            var r = ref();
            if (r && typeof window.setDoc === "function") window.setDoc(r, { newsId: id }, { merge: true }).catch(function () {});
        }
        return id;
    }
    function newsLink() { return NEWS_PAGE + ensureNewsId(); }
    function publish(patch, id) {
        var code = localStorage.getItem("family_sync_code");
        if (!code || !window.db || typeof window.doc !== "function" || typeof window.setDoc !== "function") return Promise.resolve(false);
        id = id || ensureNewsId();
        var body = { family: code, name: ui().babyName(), due: localStorage.getItem("tosil_due_date") || "", updatedAt: Date.now(), off: false };
        Object.keys(patch || {}).forEach(function (k) { body[k] = patch[k]; });
        return window.setDoc(window.doc(window.db, "news", id), body, { merge: true })
            .then(function () { return true; }, function (e) { console.warn("[가족 소식] 페이지 올리기 실패", e); return false; });
    }
    function weekEntry(rec) { return { url: rec.url, line: rec.line || "", key: rec.key, at: rec.at || Date.now() }; }
    window.hasNewsPage = function () { return !!newsId(); };
    window.publishNewsHeart = function (h) {
        var o = {}; o[h.id] = { url: h.url, key: h.key, week: h.week || 0, line: h.line || "", at: Date.now() };
        return publish({ hearts: o });
    };

    window.openNewsLink = function () {
        var u = ui(), T = u.tokens, link = newsLink();
        u.sheet('<div class="pg-serif" style="font-size:20px;font-weight:700;color:' + T.INK2 + ';">가족 소식 페이지</div>' +
            '<div class="pg-meta" style="margin:6px 0 16px;line-height:1.7;word-break:keep-all;">할머니 · 할아버지가 앱 없이 카톡 링크로 볼 수 있어요. ' +
                '보낸 사진과 한 줄, 심장 소리, 출생 소식만 보여요. 몸 상태나 문답은 절대 안 올라가요.</div>' +
            '<div style="font-size:13px;font-weight:600;color:' + T.SUB2 + ';background:#FFF;border:1px solid ' + T.LINE + ';border-radius:12px;padding:12px 14px;word-break:break-all;">' + u.esc(link) + '</div>' +
            '<div style="display:flex;gap:8px;margin-top:12px;">' +
                '<div onclick="window.__newsCopy()" style="flex:1;text-align:center;padding:14px;border-radius:14px;border:1px solid ' + T.LINE + ';background:' + T.PAPER + ';color:' + T.INK2 + ';font-size:14px;font-weight:700;cursor:pointer;">링크 복사</div>' +
                '<div onclick="window.__newsShare()" style="flex:1;text-align:center;padding:14px;border-radius:14px;background:' + T.INK2 + ';color:#FFFDF9;font-size:14px;font-weight:700;cursor:pointer;">가족에게 보내기</div>' +
            '</div>' +
            '<div onclick="window.__newsRotate()" style="text-align:center;margin-top:18px;font-size:12.5px;font-weight:700;color:' + T.MUTE + ';cursor:pointer;">링크 바꾸기 · 지금 링크는 닫혀요</div>');
    };
    window.__newsCopy = function () {
        var link = newsLink();
        try { navigator.clipboard.writeText(link).then(function () { toast("링크를 복사했어요"); }, function () { toast(link); }); } catch (e) { toast(link); }
    };
    window.__newsShare = function () {
        var name = ui().babyName(), link = newsLink();
        var text = name + " 소식을 여기서 볼 수 있어요";
        if (navigator.share) navigator.share({ title: name + " 소식", text: text, url: link }).catch(function () {});
        else window.__newsCopy();
    };
    window.__newsRotate = function () {
        if (!confirm("지금 링크를 닫고 새 링크를 만들까요?\n예전 링크로는 더 이상 볼 수 없어요.")) return;
        var old = newsId(), code = localStorage.getItem("family_sync_code");
        if (old && code && window.db && typeof window.setDoc === "function") {
            window.setDoc(window.doc(window.db, "news", old), { family: code, off: true, updatedAt: Date.now() }).catch(function () {});   // 비워서 닫는다
        }
        try { localStorage.removeItem("tosil_news_id"); } catch (e) {}
        var id = ensureNewsId(), all = load(), weeks = {};
        Object.keys(all).forEach(function (wk) { if (all[wk] && all[wk].sent) weeks[wk] = weekEntry(all[wk]); });
        publish({ weeks: weeks }, id).then(function () { toast("새 링크를 만들었어요"); window.openNewsLink(); });
    };

    /* ---------- 홈 카드 ---------- */
    function cardHTML(w) {
        var u = ui(); if (!u) return "";
        var T = u.tokens, wk = Math.max(1, Math.min(42, w.weeks)), all = load(), rec = all[wk];
        var n = Object.keys(all).length;
        var head = '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px;">' +
            '<span class="pg-h">' + wk + '주 소식</span>' +
            (n ? '<span onclick="window.openWeekCollage()" class="pg-meta" style="cursor:pointer;color:' + T.INK2 + ';">' + n + '주 모아 보기 ›</span>' : '<span class="pg-meta">한 주에 한 장</span>') + '</div>';
        if (!rec) {
            return '<div class="pg-paper">' + head +
                '<div onclick="window.takeWeekPhoto()" style="height:210px;border:1.5px dashed #DCCFBE;border-radius:16px;background:#FFFAF1;cursor:pointer;' +
                    'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:' + T.INK2 + ';">' +
                    '<span style="width:26px;height:26px;display:block;">' + (u.ICO ? u.ICO.camera : '') + '</span>' +
                    '<span style="font-size:15px;font-weight:700;">이번 주 배 사진 한 장</span>' +
                    '<span class="pg-meta">같은 자리, 같은 옷이면 모았을 때 더 예뻐요</span></div>' +
                '<div class="pg-meta" style="margin-top:12px;line-height:1.7;word-break:keep-all;">찍으면 가족 단톡방에 보낼 \'' + wk + '주 소식\' 카드가 만들어져요.</div>' +
            '</div>';
        }
        var src = (typeof window.photoThumb === "function") ? window.photoThumb(rec) : rec.url;
        return '<div class="pg-paper">' + head +
            '<div style="position:relative;width:100%;height:320px;border-radius:16px;overflow:hidden;background:' + T.TINT + ';">' +
                '<img src="' + u.esc(src || rec.url) + '" alt="" style="width:100%;height:100%;object-fit:cover;display:block;"></div>' +
            (rec.line ? '<div class="pg-serif" style="font-size:16px;color:' + T.INK2 + ';line-height:1.7;margin-top:12px;word-break:keep-all;">' + u.esc(rec.line) + '</div>' : '') +
            '<div style="display:flex;gap:8px;margin-top:14px;">' +
                '<div onclick="window.openWeekSend(' + wk + ')" style="flex:2;text-align:center;padding:14px;border-radius:14px;background:' + T.INK2 + ';color:#FFFDF9;font-size:14.5px;font-weight:700;cursor:pointer;">가족에게 보내기</div>' +
                '<div onclick="window.takeWeekPhoto()" style="flex:1;text-align:center;padding:14px;border-radius:14px;border:1px solid ' + T.LINE + ';background:' + T.PAPER + ';color:' + T.INK2 + ';font-size:14px;font-weight:700;cursor:pointer;">다시 찍기</div>' +
            '</div>' +
            '<div onclick="window.openNewsLink()" class="pg-meta" style="margin-top:14px;cursor:pointer;color:' + T.INK2 + ';">할머니 · 할아버지가 앱 없이 보는 페이지 ›</div>' +
        '</div>';
    }

    /* ---------- 사진 찍기 — 배냇함 사진 담기를 그대로 쓰고, 담기면 이번 주 사진으로 표시 ---------- */
    var polling = null;
    window.takeWeekPhoto = function () {
        var u = ui(), now = wkNow();
        if (!u || !now) return;
        if (typeof window.addDayPhoto !== "function" || typeof window.getDayPhotos !== "function") return toast("사진 담기를 불러오지 못했어요");
        var key = u.todayKey(), before = (window.getDayPhotos(key) || []).length, tries = 0;
        if (polling) clearInterval(polling);
        polling = setInterval(function () {
            var list = window.getDayPhotos(key) || [];
            if (list.length > before) {
                clearInterval(polling); polling = null;
                var p = list[list.length - 1], all = load();
                var rec = { key: key, id: p.id || "", url: p.url || "", thumb: p.thumb || "", line: (all[now.wk] && all[now.wk].line) || "", at: Date.now() };
                all[now.wk] = rec; save(all); pushWeek(now.wk, rec);
                if (typeof window.refreshStageHome === "function") window.refreshStageHome();
                setTimeout(function () { window.openWeekSend(now.wk); }, 400);
            } else if (++tries > 240) { clearInterval(polling); polling = null; }
        }, 500);
        window.addDayPhoto(key);
    };

    /* ---------- 보내기 ---------- */
    window.openWeekSend = function (wk) {
        var u = ui(), T = u.tokens, rec = load()[wk];
        if (!rec) return;
        u.sheet('<div class="pg-serif" style="font-size:20px;font-weight:700;color:' + T.INK2 + ';">' + wk + '주 소식 보내기</div>' +
            '<div class="pg-meta" style="margin:6px 0 16px;line-height:1.7;">카드로 만들어 가족 단톡방에 보낼 수 있어요.</div>' +
            '<div class="pg-meta" style="margin-bottom:6px;">카드에 남길 한 줄 (선택)</div>' +
            '<input type="text" id="wk-line" maxlength="40" value="' + u.esc(rec.line || "") + '" placeholder="예) 요즘 발차기가 부쩍 세졌어요">' +
            u.primary("카드 만들어 보내기", "window.__sendWeek(" + wk + ")"));
    };
    window.__sendWeek = function (wk) {
        var all = load(), rec = all[wk]; if (!rec) return;
        rec.line = ((document.getElementById("wk-line") || {}).value || "").trim();
        rec.at = Date.now(); rec.sent = 1; all[wk] = rec; save(all); pushWeek(wk, rec);
        var pw = {}; pw[wk] = weekEntry(rec);
        publish({ weeks: pw });                                       // 가족 소식 페이지에도
        ui().closeSheet();
        if (typeof window.refreshStageHome === "function") window.refreshStageHome();
        var name = ui().babyName();
        shareCard(weekCardDOM(wk, rec), name + "_" + wk + "주.png",
            name + " " + wk + "주 소식", name + " " + wk + "주 소식이에요. 지난 소식도 여기서 볼 수 있어요 " + newsLink());
    };

    /* ---------- 카드 그리기 ---------- */
    function shell(inner) {
        var el = document.createElement("div");
        el.style.cssText = "position:fixed;top:0;left:0;width:1080px;background:#F6F0E6;padding:56px;box-sizing:border-box;" +
            "font-family:'Pretendard','Noto Sans KR',sans-serif;z-index:-9999;pointer-events:none;";
        el.innerHTML = '<div style="background:#FFFDF9;border:2px solid #EFE7DC;border-radius:28px;box-sizing:border-box;padding:72px 80px 60px;' +
            'display:flex;flex-direction:column;">' + inner +
            '<div style="border-top:1px solid #EFE7DC;margin-top:48px;padding-top:26px;text-align:center;font-size:21px;font-weight:600;color:#B5AAA0;">' +
                '배냇함 · 아이에게 남기는 상자</div></div>';
        return el;
    }
    function weekCardDOM(wk, rec) {
        var u = ui(), T = u.tokens, w = u.weeksFromDue(u.dueDate(), u.fromKey(rec.key));
        var el = shell(
            '<div style="display:flex;justify-content:space-between;align-items:baseline;">' +
                '<span style="font-size:26px;font-weight:700;color:#B98A2E;letter-spacing:5px;">' + u.esc(u.babyName()) + ' 소식</span>' +
                '<span style="font-size:22px;font-weight:600;color:#8A7F76;">' + pretty(rec.key) + '</span></div>' +
            '<div style="font-family:' + T.SERIF + ';font-size:96px;font-weight:700;color:#3B322C;letter-spacing:-3px;line-height:1;margin:34px 0 34px;">' +
                wk + '<span style="font-size:44px;margin-left:8px;">주</span>' +
                '</div>' +
            '<div style="width:100%;height:720px;border-radius:22px;overflow:hidden;background:#EFE7DC;">' +
                '<img src="' + u.esc(rec.url) + '" crossorigin="anonymous" style="width:100%;height:100%;object-fit:cover;display:block;"></div>' +
            (rec.line ? '<div style="font-family:\'Nanum Pen Script\',cursive;font-size:48px;color:#6F645C;text-align:center;margin-top:34px;">' + u.esc(rec.line) + '</div>' : '') +
            (w && w.left > 0 ? '<div style="font-family:' + T.SERIF + ';font-size:32px;color:#3B322C;text-align:center;margin-top:' + (rec.line ? 18 : 36) + 'px;">만나기까지 ' + w.left + '일</div>' : ''));
        el.style.height = "1350px";
        el.firstChild.style.height = "100%";
        return el;
    }
    window.__weekCardDOM = weekCardDOM;

    window.openWeekCollage = function () {
        var all = load(), weeks = Object.keys(all).map(Number).sort(function (a, b) { return a - b; });
        if (!weeks.length) return toast("아직 모은 사진이 없어요");
        shareCard(collageDOM(weeks, all), ui().babyName() + "_모아보기.png", ui().babyName() + " " + weeks.length + "주",
            call(ui().babyName(), "를") + " 기다린 " + weeks.length + "주예요. 배냇함에서 같이 봐요 " + APP_LINK);
    };
    function collageDOM(weeks, all) {
        var u = ui(), T = u.tokens;
        var cells = weeks.map(function (wk) {
            return '<div><div style="width:100%;aspect-ratio:4/5;border-radius:14px;overflow:hidden;background:#EFE7DC;">' +
                '<img src="' + u.esc(all[wk].url) + '" crossorigin="anonymous" style="width:100%;height:100%;object-fit:cover;display:block;"></div>' +
                '<div style="font-family:' + T.SERIF + ';font-size:26px;font-weight:700;color:#3B322C;text-align:center;margin-top:10px;">' + wk + '주</div></div>';
        }).join("");
        var first = all[weeks[0]].key, last = all[weeks[weeks.length - 1]].key;
        return shell(
            '<div style="font-size:26px;font-weight:700;color:#B98A2E;letter-spacing:5px;">' + u.esc(call(u.babyName(), "를")) + ' 기다린 시간</div>' +
            '<div style="font-family:' + T.SERIF + ';font-size:72px;font-weight:700;color:#3B322C;letter-spacing:-2px;margin:26px 0 8px;">' + weeks.length + '주의 기록</div>' +
            '<div style="font-size:24px;font-weight:600;color:#8A7F76;margin-bottom:40px;">' + pretty(first) + ' – ' + pretty(last) + '</div>' +
            '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:22px 18px;">' + cells + '</div>');
    }
    window.__collageDOM = collageDOM;

    /* ---------- 출생 카드 (stage.js 의 '아기가 태어났어요' 가 부른다) ---------- */
    window.makeBirthCard = function (b) {
        var u = ui(); if (!u) return Promise.resolve();
        if (newsId()) publish({ name: b.name, born: { name: b.name, date: b.date, time: b.time || "", weight: b.weight || "", height: b.height || "", line: b.line || "" } });
        return shareCard(birthCardDOM(b), b.name + "_출생.png", call(b.name, "가") + " 태어났어요",
            call(b.name, "가") + " 태어났어요. " + (newsId() ? "소식은 여기서 " + newsLink() : "배냇함에서 같이 봐요 " + APP_LINK));
    };
    function birthCardDOM(b) {
        var u = ui(), T = u.tokens, d = u.fromKey(b.date);
        var stats = [b.weight ? b.weight + "kg" : "", b.height ? b.height + "cm" : ""].filter(Boolean).join(" · ");
        var tm = "";
        if (b.time) { var p = b.time.split(":"), h = Number(p[0]); tm = (h < 12 ? "오전 " : "오후 ") + ((h % 12) || 12) + ":" + p[1]; }
        var el = shell(
            '<div style="font-size:26px;font-weight:700;color:#B98A2E;letter-spacing:6px;text-align:center;margin-top:60px;">태어났어요</div>' +
            '<div style="font-family:' + T.SERIF + ';font-size:150px;font-weight:700;color:#3B322C;letter-spacing:-4px;line-height:1.1;text-align:center;margin:60px 0 50px;">' + u.esc(b.name) + '</div>' +
            '<div style="font-family:' + T.SERIF + ';font-size:40px;color:#3B322C;text-align:center;">' + d.getFullYear() + '. ' + (d.getMonth() + 1) + '. ' + d.getDate() + '.' + (tm ? '  ' + tm : '') + '</div>' +
            (stats ? '<div style="font-size:30px;font-weight:600;color:#8A7F76;text-align:center;margin-top:20px;">' + stats + '</div>' : '') +
            (b.line ? '<div style="font-family:\'Nanum Pen Script\',cursive;font-size:52px;color:#6F645C;text-align:center;margin-top:90px;">' + u.esc(b.line) + '</div>' : '<div style="height:120px;"></div>'));
        el.style.height = "1350px";
        el.firstChild.style.height = "100%";
        el.firstChild.style.justifyContent = "flex-start";
        return el;
    }
    window.__birthCardDOM = birthCardDOM;

    /* ---------- 그림으로 굽고 보내기 ---------- */
    function shareCard(dom, filename, title, text) {
        return new Promise(function (done) {
            if (typeof html2canvas === "undefined") { toast("카드 도구를 불러오지 못했어요"); return done(); }
            document.body.appendChild(dom);
            var go = function () {
                html2canvas(dom, { scale: 1, backgroundColor: "#F6F0E6", useCORS: true, logging: false }).then(function (canvas) {
                    canvas.toBlob(function (blob) {
                        dom.remove();
                        if (!blob) { toast("카드를 만들지 못했어요"); return done(); }
                        var file = new File([blob], filename, { type: "image/png" });
                        if (navigator.canShare && navigator.canShare({ files: [file] })) {
                            navigator.share({ files: [file], title: title, text: text }).catch(function () {}).then(done);
                        } else {
                            var a = document.createElement("a");
                            a.href = URL.createObjectURL(blob); a.download = filename;
                            document.body.appendChild(a); a.click(); a.remove();
                            toast("카드를 저장했어요"); done();
                        }
                    });
                }).catch(function () { dom.remove(); toast("카드를 만들지 못했어요"); done(); });
            };
            try {
                Promise.all([document.fonts.load("700 96px 'Gowun Batang'"), document.fonts.load("48px 'Nanum Pen Script'")]).then(function () { setTimeout(go, 150); }, go);
            } catch (e) { setTimeout(go, 400); }
        });
    }

    /* ---------- stage.js 홈 맨 위(주수 바로 아래)에 끼우기 ---------- */
    window.stageCardHooks = window.stageCardHooks || {};
    (window.stageCardHooks["after-hero"] = window.stageCardHooks["after-hero"] || []).push(cardHTML);

    window.__famTest = { merge: merge, load: load };

    function boot() {
        try { if (!(localStorage.getItem("tosil_stage_beta") === "1" || localStorage.getItem("tosil_stage_live") === "1")) return; } catch (e) { return; }
        setTimeout(watch, 3700);
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
})();