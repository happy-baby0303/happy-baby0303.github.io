/* ============================================================
   배냇함 — 할머니 · 할아버지 화면 (grandhome.js)

   ⚠️ 도우미 화면은 '아기를 맡은 사람이 기록하는 화면' 하나뿐이었다.
      할머니 · 할아버지는 손주를 보러 들어오는데 볼 것이 없었고, 처음 화면엔 '오늘 기록이 없어요' 세 줄만 있었다.
      초대할 때 고른 이름(tosil_helper_label)이 할머니 · 할아버지 · 가족이면:
        · 맨 위에 아기 사진 (엄마 · 아빠가 배냇함에 담은 것 — 보기만, 지우거나 고칠 수 없다)
        · 기록 단추는 '아기 봐 주시는 날' 에만 편다 (한 번 펴면 그대로)
      시터 선생님은 예전 그대로 — 사진은 보이지 않는다.

   도우미 화면 모두에게:
        · 글씨를 한 단계 크게 · 'D+256일' → '태어난 지 256일' · 원더윅스 딱지 · 연동 딱지 · 탭 하나짜리 아래 줄은 뺀다

   index.html: photos.js · rolelock.js 다음
   ============================================================ */
(function () {
    'use strict';
    var FAMILY = ['할머니', '할아버지', '가족'], OPEN_KEY = 'tosil_gh_care_open', SHOW = 6, MORE = 30;
    function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function senior() { return get('user_role') === 'senior'; }
    function family() { return senior() && FAMILY.indexOf(get('tosil_helper_label') || '') > -1; }
    function sitter() { return senior() && !family(); }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function baby() { return get('tosil_babyName') || '우리 아기'; }

    var css = document.createElement('style');
    css.id = 'grandhome-css';
    css.textContent =
        'body.mode-senior .show-on-senior-block{zoom:1.1;}' +
        'body.mode-senior #wonderweek-badge,body.mode-senior #sync-badge-btn{display:none !important;}' +
        'body.mode-senior .bottom-nav{display:none !important;}' +
        'body.gh-nophoto .home-hero-img{display:none !important;}' +
        'body.gh-nophoto #baby-dashboard{background:linear-gradient(160deg,#F6EFE6,#EDE3D6) url(./box.webp) center 34%/120px no-repeat !important;}' +
        '.gh-card{background:#fff;border-radius:24px;padding:22px 20px 20px;box-shadow:0 4px 12px rgba(0,0,0,0.04);margin-bottom:16px;}' +
        '.gh-k{font-size:12px;font-weight:800;color:#B98A2E;margin-bottom:4px;}' +
        '.gh-h{font-size:19px;font-weight:900;color:var(--text-m,#4A413C);margin:0 0 14px;letter-spacing:-0.5px;}' +
        '.gh-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}' +
        '.gh-ph{display:block;width:100%;aspect-ratio:1;border:none;padding:0;border-radius:14px;overflow:hidden;background:#F4EFE8;cursor:pointer;}' +
        '.gh-ph img{width:100%;height:100%;object-fit:cover;display:block;}' +
        '.gh-empty{font-size:14.5px;font-weight:700;color:#8A7F76;line-height:1.6;word-break:keep-all;}' +
        '.gh-more,.gh-toggle{display:block;width:100%;margin-top:12px;padding:15px;border-radius:14px;border:1px solid var(--border,#EDE6DE);background:#FAF7F2;' +
            'font-family:inherit;font-size:15px;font-weight:800;color:var(--text-m,#4A413C);cursor:pointer;}' +
        '.gh-toggle{margin-top:0;}' +
        '.gh-sub{font-size:13px;font-weight:600;color:#8A7F76;margin-top:10px;line-height:1.55;word-break:keep-all;text-align:center;}' +
        '#gh-viewer{position:fixed;inset:0;z-index:99990;background:#111;display:flex;flex-direction:column;}' +
        '#gh-viewer .gv-img{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;}' +
        '#gh-viewer img{max-width:100%;max-height:100%;object-fit:contain;}' +
        '#gh-viewer .gv-cap{color:#EDE6DE;font-size:16px;font-weight:700;text-align:center;padding:14px 20px 4px;line-height:1.5;word-break:keep-all;}' +
        '#gh-viewer .gv-bar{display:flex;gap:10px;padding:12px 16px calc(16px + env(safe-area-inset-bottom));}' +
        '#gh-viewer button{flex:1;padding:16px 0;border-radius:14px;border:1px solid #3A3632;background:#1D1B19;color:#EDE6DE;font-family:inherit;font-size:16px;font-weight:800;cursor:pointer;}' +
        '#gh-viewer button[disabled]{opacity:.35;}';
    (document.head || document.documentElement).appendChild(css);

    /* ---------- 사진 (배냇함 사진 목록 — photos.js 가 가족방에서 받아 둔다) ---------- */
    function photos() {
        var idx = {}; try { idx = JSON.parse(get('tosil_day_photos')) || {}; } catch (e) {}
        var out = [];
        Object.keys(idx).forEach(function (k) {
            (Array.isArray(idx[k]) ? idx[k] : []).forEach(function (p) { if (p && p.id && (p.url || p.thumb)) out.push({ key: k, p: p }); });
        });
        out.sort(function (a, b) { return (b.p.ts || 0) - (a.p.ts || 0) || (a.key < b.key ? 1 : -1); });
        return out;
    }
    function dayLabel(key) {
        var m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(key || '');
        if (!m) return '';
        return (Number(m[1]) === new Date().getFullYear() ? '' : m[1] + '년 ') + Number(m[2]) + '월 ' + Number(m[3]) + '일';
    }
    var list = [], at = 0, more = false, sig = '';
    function cardHTML() {
        var n = baby(), show = list.slice(0, more ? MORE : SHOW);
        var h = '<div class="gh-k">엄마 · 아빠가 담은 사진이에요</div><h2 class="gh-h">' + esc(n) + ' 사진</h2>';
        if (!list.length) return h + '<div class="gh-empty">아직 올라온 사진이 없어요.<br>엄마 · 아빠가 사진을 담으면 여기에 보여요.</div>';
        h += '<div class="gh-grid">';
        show.forEach(function (x, i) {
            h += '<button type="button" class="gh-ph" onclick="GrandHome.open(' + i + ')" aria-label="' + esc(dayLabel(x.key)) + ' 사진 크게 보기">' +
                 '<img src="' + esc(x.p.thumb || x.p.url) + '" alt="" loading="lazy"></button>';
        });
        h += '</div>';
        if (!more && list.length > SHOW) h += '<button type="button" class="gh-more" onclick="GrandHome.more()">사진 더 보기</button>';
        return h;
    }
    function paintPhotos() {
        var block = document.querySelector('.show-on-senior-block');
        if (!block) return;
        var card = document.getElementById('gh-photos');
        if (!family()) { if (card) card.remove(); sig = ''; return; }
        list = photos();
        var s = JSON.stringify([baby(), more, list.slice(0, MORE).map(function (x) { return x.p.id; })]);
        if (card && s === sig) return;
        sig = s;
        if (!card) { card = document.createElement('div'); card.id = 'gh-photos'; card.className = 'gh-card'; block.insertBefore(card, block.firstChild); }
        card.innerHTML = cardHTML();
    }
    function viewer() {
        var x = list[at]; if (!x) return;
        var w = document.getElementById('gh-viewer');
        if (!w) { w = document.createElement('div'); w.id = 'gh-viewer'; document.body.appendChild(w); }
        var cap = dayLabel(x.key) + (x.p.caption ? ' · ' + x.p.caption : '');
        w.innerHTML = '<div class="gv-cap">' + esc(cap) + '</div><div class="gv-img"><img src="' + esc(x.p.url || x.p.thumb) + '" alt=""></div>' +
            '<div class="gv-bar"><button type="button" onclick="GrandHome.step(-1)"' + (at <= 0 ? ' disabled' : '') + '>‹ 앞 사진</button>' +
            '<button type="button" onclick="GrandHome.close()">닫기</button>' +
            '<button type="button" onclick="GrandHome.step(1)"' + (at >= list.length - 1 ? ' disabled' : '') + '>다음 사진 ›</button></div>';
    }

    /* ---------- 기록 단추 — 아기 봐 주시는 날에만 ---------- */
    function paintCare() {
        var block = document.querySelector('.show-on-senior-block');
        if (!block) return;
        var board = document.getElementById('senior-status-board');
        var box = board ? board.nextElementSibling : null;
        while (box && !(box.classList && box.classList.contains('box-main'))) box = box.nextElementSibling;
        var t = document.getElementById('gh-care');
        if (!box) return;
        if (!family()) { if (t) t.remove(); box.style.display = ''; return; }
        var open = get(OPEN_KEY) === '1';
        if (!t) { t = document.createElement('div'); t.id = 'gh-care'; t.className = 'gh-card'; block.insertBefore(t, box); }
        var want = open ? 'open' : 'shut';
        if (t.getAttribute('data-s') !== want) {
            t.setAttribute('data-s', want);
            t.innerHTML = open
                ? '<button type="button" class="gh-toggle" onclick="GrandHome.care(false)">기록 단추 접어 두기</button>'
                : '<button type="button" class="gh-toggle" onclick="GrandHome.care(true)">오늘 ' + esc(baby()) + ' 봐 주시나요? 기록 단추 펴기</button>' +
                  '<div class="gh-sub">먹이고 재운 걸 누르면 엄마 · 아빠 폰에 바로 보여요</div>';
        }
        box.style.display = open ? '' : 'none';
    }

    /* 'D+256일' 은 어르신에게 낯선 말이다 */
    function paintDday() {
        var el = document.getElementById('res-baby-dday');
        if (!el || !senior()) return;
        var m = /^D\+(\d+)일$/.exec((el.textContent || '').trim());
        if (m) el.textContent = '태어난 지 ' + m[1] + '일';
    }

    /* ---------- 사진 목록 받기 — 이름(할머니 · 시터)이 나중에 도착해도 맞춘다 (photos.js photoSyncAllowed) ---------- */
    function syncGate() {
        if (!senior() || typeof window.startPhotoRealtimeSync !== 'function' || typeof window.photoSyncAllowed !== 'function') return;
        var ok = window.photoSyncAllowed();
        if (ok !== !!window.__photoSyncOn || (!ok && get('tosil_day_photos'))) window.startPhotoRealtimeSync();
    }

    /* ---------- 시터 선생님 화면의 아기 사진 — 엄마 · 아빠가 끌 수 있다 (가족 문서 sitterPhoto === false) ---------- */
    var famAt = 0, famPhoto = null;
    function famRef() {
        var code = get('family_sync_code');
        if (!code || !window.db || typeof window.doc !== 'function') return null;
        return window.doc(window.db, 'families', code);
    }
    function pullFam(force) {
        var ref = famRef();
        if (!ref || typeof window.getDoc !== 'function') return Promise.resolve(null);
        if (!force && Date.now() - famAt < 60000) return Promise.resolve(famPhoto);
        famAt = Date.now();
        return window.getDoc(ref).then(function (snap) {
            famPhoto = (snap && snap.exists() && (snap.data() || {}).sitterPhoto === false) ? false : true;
            try { localStorage.setItem('tosil_sitter_photo', famPhoto ? '1' : '0'); } catch (e) {}
            return famPhoto;
        }).catch(function () { return famPhoto; });
    }
    function paintSitterPhoto() {
        var hide = senior() && !family() && get('tosil_sitter_photo') === '0';
        if (document.body) document.body.classList.toggle('gh-nophoto', hide);
        if (senior() && !family()) pullFam().then(function () {
            var h = get('tosil_sitter_photo') === '0';
            if (document.body) document.body.classList.toggle('gh-nophoto', senior() && !family() && h);
        });
    }

    /* ---------- 설정: 도우미 칸 셋(걸 번호 · 남길 말 · 사진)을 한 줄로 접는다 ----------
       ⚠️ 설정 탭에 저장 단추가 달린 큰 칸 둘이 늘 펼쳐져 있었다. 도우미가 없는 집에도. 한 줄로 두고 누르면 연다. */
    function helperRow() {
        var host = document.getElementById('tab-settings');
        if (!host || senior()) { var r0 = document.getElementById('gh-helper-row'); if (r0 && senior()) r0.remove(); return; }
        var pc = document.getElementById('parent-phone-card'), nc = document.getElementById('parent-notice-card');
        if (!pc && !nc) return;
        var sheetOpen = !!document.getElementById('gh-helper-sheet');
        [pc, nc].forEach(function (el) { if (el && !sheetOpen) el.style.display = 'none'; });
        var first = pc || nc, old = document.getElementById('gh-helper-row');
        /* 다른 파일(settingscards.js)이 칸을 옮겨 놓는다 — 줄은 늘 그 칸 바로 앞에 둔다 */
        if (old) { if (!sheetOpen && old.nextElementSibling !== first) first.parentNode.insertBefore(old, first); return; }
        var row = document.createElement('div');
        row.id = 'gh-helper-row';
        row.setAttribute('role', 'button');
        row.style.cssText = 'background:var(--bg-card); padding:18px 20px; border-radius:16px; border:1px solid var(--border); margin-bottom:12px; box-sizing:border-box; width:100%; display:flex; align-items:center; justify-content:space-between; gap:12px; cursor:pointer;';
        row.innerHTML = '<div><div style="font-size:15px; font-weight:900; color:var(--text-m);">돌봄 도우미</div>' +
            '<div style="font-size:12px; font-weight:600; color:var(--text-sub); margin-top:3px; line-height:1.5;">걸 번호 · 남길 말 · 시터 선생님께 보이는 사진</div></div>' +
            '<span style="color:var(--text-sub); font-size:16px;">›</span>';
        row.onclick = function () { window.GrandHome.helperSheet(true); };
        first.parentNode.insertBefore(row, first);
    }
    function helperSheet(open) {
        var host = document.getElementById('tab-settings');
        var w = document.getElementById('gh-helper-sheet');
        var pc = document.getElementById('parent-phone-card'), nc = document.getElementById('parent-notice-card');
        var row = document.getElementById('gh-helper-row');
        if (!open) {
            if (!w) return;
            [nc, pc].forEach(function (el) { if (el && row && row.parentNode) { el.style.display = 'none'; row.parentNode.insertBefore(el, row.nextSibling); } });
            w.remove(); document.body.style.overflow = '';
            return;
        }
        if (w || !host) return;
        w = document.createElement('div');
        w.id = 'gh-helper-sheet';
        w.style.cssText = 'position:fixed; inset:0; z-index:9500; background:rgba(43,36,30,0.45); display:flex; align-items:flex-end; justify-content:center;';
        w.innerHTML = '<div id="gh-helper-body" style="width:100%; max-width:480px; max-height:88vh; overflow-y:auto; box-sizing:border-box; background:var(--bg-main,#FAF7F2); border-radius:24px 24px 0 0; padding:20px 16px calc(24px + env(safe-area-inset-bottom));">' +
            '<div style="display:flex; align-items:center; justify-content:space-between; margin:0 4px 14px;"><div style="font-size:19px; font-weight:900; color:var(--text-m); letter-spacing:-0.5px;">돌봄 도우미</div>' +
            '<button type="button" onclick="GrandHome.helperSheet(false)" aria-label="닫기" style="border:none; background:none; font-size:22px; color:var(--text-sub); padding:6px 10px; cursor:pointer;">✕</button></div>' +
            '<div id="gh-helper-slot"></div>' +
            '<div style="background:var(--bg-card); padding:18px 20px; border-radius:16px; border:1px solid var(--border); box-sizing:border-box;">' +
                '<div style="display:flex; align-items:center; justify-content:space-between; gap:14px;"><div><div style="font-size:15px; font-weight:900; color:var(--text-m);">시터 선생님 화면에 아기 사진 보이기</div>' +
                '<div style="font-size:12px; font-weight:600; color:var(--text-sub); margin-top:4px; line-height:1.6; word-break:keep-all;">홈 맨 위 사진 한 장이에요. 끄면 그림만 보여요. 배냇함 사진은 시터 선생님께 원래 안 보여요.</div></div>' +
                '<button type="button" id="gh-sp-toggle" role="switch" aria-checked="true" onclick="GrandHome.toggleSitterPhoto()" style="flex-shrink:0; width:50px; height:30px; border-radius:999px; border:none; background:#8E7BD8; position:relative; cursor:pointer; transition:background .15s;">' +
                '<span style="position:absolute; top:3px; left:23px; width:24px; height:24px; border-radius:50%; background:#fff; transition:left .15s;"></span></button></div></div></div>';
        w.addEventListener('click', function (e) { if (e.target === w) helperSheet(false); });
        document.body.appendChild(w); document.body.style.overflow = 'hidden';
        var slot = document.getElementById('gh-helper-slot');
        [pc, nc].forEach(function (el) { if (el) { slot.appendChild(el); el.style.display = ''; } });
        paintSwitch(get('tosil_sitter_photo') !== '0');
        pullFam(true).then(function (v) { paintSwitch(v !== false); });
    }
    function paintSwitch(on) {
        var b = document.getElementById('gh-sp-toggle'); if (!b) return;
        b.setAttribute('aria-checked', on ? 'true' : 'false');
        b.style.background = on ? '#8E7BD8' : '#D8D0C6';
        b.firstChild.style.left = on ? '23px' : '3px';
    }
    function toggleSitterPhoto() {
        var b = document.getElementById('gh-sp-toggle'); if (!b) return;
        var on = b.getAttribute('aria-checked') !== 'true', ref = famRef();
        paintSwitch(on);
        try { localStorage.setItem('tosil_sitter_photo', on ? '1' : '0'); } catch (e) {}
        famPhoto = on;
        var say = function (m) { if (typeof window.showToast === 'function') window.showToast(m); };
        if (!ref || typeof window.updateDoc !== 'function') { say('가족과 연결되면 시터 선생님 폰에도 맞춰져요'); return; }
        window.updateDoc(ref, { sitterPhoto: on }).then(function () { say(on ? '시터 선생님 화면에 아기 사진이 보여요' : '시터 선생님 화면에서 아기 사진을 가렸어요'); })
            .catch(function () { paintSwitch(!on); try { localStorage.setItem('tosil_sitter_photo', on ? '0' : '1'); } catch (e) {} say('바꾸지 못했어요. 잠시 뒤 다시 해 주세요'); });
    }

    function paint() { try { paintDday(); syncGate(); paintPhotos(); paintCare(); paintSitterPhoto(); helperRow(); } catch (e) { console.warn('[grandhome]', e); } }

    window.GrandHome = {
        family: family, paint: paint,
        open: function (i) { at = i; viewer(); },
        step: function (d) { at = Math.max(0, Math.min(list.length - 1, at + d)); viewer(); },
        close: function () { var w = document.getElementById('gh-viewer'); if (w) w.remove(); },
        more: function () { more = true; paintPhotos(); },
        sitter: sitter, helperSheet: helperSheet, toggleSitterPhoto: toggleSitterPhoto,
        care: function (on) { try { localStorage.setItem(OPEN_KEY, on ? '1' : '0'); } catch (e) {} paintCare(); }
    };
    window.closeGrandViewer = window.GrandHome.close;
    window.closeHelperSheet = function () { helperSheet(false); };

    function boot() {
        paint(); setInterval(paint, 3000);
        /* 설정 탭이 다시 그려지면 도우미 칸이 다시 펼쳐진다 — 그려지는 그 순간에 접는다 */
        var host = document.getElementById('tab-settings');
        if (host && window.MutationObserver) new MutationObserver(function () { try { helperRow(); } catch (e) {} }).observe(host, { childList: true, subtree: true });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
    document.addEventListener('visibilitychange', function () { if (!document.hidden) paint(); });
})();
