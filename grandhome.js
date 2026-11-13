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
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function baby() { return get('tosil_babyName') || '우리 아기'; }

    var css = document.createElement('style');
    css.id = 'grandhome-css';
    css.textContent =
        'body.mode-senior .show-on-senior-block{zoom:1.1;}' +
        'body.mode-senior #wonderweek-badge,body.mode-senior #sync-badge-btn{display:none !important;}' +
        'body.mode-senior .bottom-nav{display:none !important;}' +
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

    function paint() { try { paintDday(); paintPhotos(); paintCare(); } catch (e) { console.warn('[grandhome]', e); } }

    window.GrandHome = {
        family: family, paint: paint,
        open: function (i) { at = i; viewer(); },
        step: function (d) { at = Math.max(0, Math.min(list.length - 1, at + d)); viewer(); },
        close: function () { var w = document.getElementById('gh-viewer'); if (w) w.remove(); },
        more: function () { more = true; paintPhotos(); },
        care: function (on) { try { localStorage.setItem(OPEN_KEY, on ? '1' : '0'); } catch (e) {} paintCare(); }
    };
    window.closeGrandViewer = window.GrandHome.close;

    function boot() { paint(); setInterval(paint, 3000); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
    document.addEventListener('visibilitychange', function () { if (!document.hidden) paint(); });
})();
