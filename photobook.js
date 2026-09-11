/* ============================================================
   배냇함 — 배냇함 포토북 (photobook.js)

   서버비가 0원인 프리미엄. 브라우저에서 만들어 바로 내려받는다.
   파일도, 변환 서버도, 저장소도 안 쓴다.

   책의 순서는 이렇다.
     표지 → 태어난 날 → (시간순) 기념일·첫 순간·사진·편지 → 담긴 목소리 → 맺음

   A5 판형(1240×1754)으로 굽는다. A4 는 무겁고, 배냇함은 손에 드는 크기다.

   index.html 에서 voice.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var PW = 1240, PH = 1754;          // A5 @ 210dpi
    var MAX_PAGES = 80;                // 그 이상은 책이 아니라 로그다
    var JSPDF_CDN = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";

    var INK   = "#4A413C";
    var INK_S = "#7A6F68";
    var INK_L = "#A3958A";
    var GOLD  = "#B98A2E";
    var PAPER = "#FDFBF7";
    var LINE  = "#EBE3D9";

    /* ---------- 작은 도구들 ---------- */

    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    function babyName() { return localStorage.getItem("tosil_babyName") || "우리 아기"; }
    function toast(m) { if (typeof window.showToast === "function") window.showToast(m); }

    function birth() {
        var s = localStorage.getItem("tosil_startDate");
        if (!s) return null;
        var p = s.split("-");
        var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
        return isNaN(d.getTime()) ? null : d;
    }

    /* ⚠️ 날짜가 한 가지 모양으로만 들어오지 않는다.
          도감(script.js toggleMilestone)은 "2026. 09. 11" 로 저장하고,
          아주 옛 기록은 "예전 기록 \uD83E\uDD0D" 같은 글자였다.
          그걸 "-" 로 쪼개니 Number() 가 전부 NaN 이 되고
          new Date(NaN, NaN, NaN) → NaN년 NaN월 NaN일 이 찍혔다.

          게다가 "2026. 09. 11" 은 "2026-09-08" 보다 뒤로 정렬된다(. > -).
          그래서 책의 마지막 날짜가 도감 키로 잡히고,
          dday() 가 빈 값을 내서 맺음말이 "여기까지가 0일입니다" 가 됐다.

          들어오는 모양을 여기서 전부 한 줄로 편다. */

    function normKey(v) {
        if (v == null) return null;
        if (v instanceof Date) {
            if (isNaN(v.getTime())) return null;
            return v.getFullYear() + "-" +
                   String(v.getMonth() + 1).padStart(2, "0") + "-" +
                   String(v.getDate()).padStart(2, "0");
        }
        if (typeof v === "number") {
            var dn = new Date(v);
            return isNaN(dn.getTime()) ? null : normKey(dn);
        }
        var t = String(v).trim();
        if (!t) return null;

        // 숫자만 있으면 밀리초 시각으로 본다
        if (/^\d{10,}$/.test(t)) return normKey(Number(t));

        // 2026-09-11 / 2026. 09. 11 / 2026.9.11 / 2026/9/11 / 2026년 9월 11일
        var m = t.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
        if (!m) return null;

        var y = Number(m[1]), mo = Number(m[2]), da = Number(m[3]);
        if (mo < 1 || mo > 12 || da < 1 || da > 31) return null;

        return y + "-" + String(mo).padStart(2, "0") + "-" + String(da).padStart(2, "0");
    }

    function fromKey(k) {
        var key = normKey(k);
        if (!key) return null;
        var p = key.split("-");
        var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
        return isNaN(d.getTime()) ? null : d;
    }

    function pretty(k) {
        var d = fromKey(k);
        if (!d) return "";                 // 모르면 아무 말도 안 한다. NaN 은 절대 안 찍는다.
        return d.getFullYear() + "년 " + (d.getMonth() + 1) + "월 " + d.getDate() + "일";
    }

    function ddayNum(k) {
        var b = birth(), d = fromKey(k);
        if (!b || !d) return null;
        var n = Math.floor((d.getTime() - b.getTime()) / 86400000);
        return n >= 0 ? n : null;
    }

    function dday(k) {
        var n = ddayNum(k);
        return n === null ? "" : ("D+" + n);
    }

    function milestoneList() {
        var l = null;
        try { if (typeof MILESTONE_DATA !== "undefined" && MILESTONE_DATA) l = MILESTONE_DATA; } catch (e) {}
        return l || window.MILESTONE_DATA || [];
    }

    function msItem(id) {
        return milestoneList().filter(function (m) { return m.id === id; })[0] || null;
    }

    /* ---------- 사진을 데이터로 ----------
       html2canvas 에 URL 을 그냥 넘기면 페이지마다 다시 받아오고
       한 장이라도 늦으면 빈칸으로 굳는다. 미리 다 데이터로 바꿔둔다. -------- */

    function toDataUrl(src, maxSide) {
        return new Promise(function (res) {
            if (!src) return res(null);
            var img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = function () {
                try {
                    var w = img.naturalWidth, h = img.naturalHeight;
                    var k = Math.min(1, (maxSide || 1000) / Math.max(w, h));
                    var c = document.createElement("canvas");
                    c.width = Math.round(w * k); c.height = Math.round(h * k);
                    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
                    res(c.toDataURL("image/jpeg", 0.86));
                } catch (e) { res(null); }
            };
            img.onerror = function () { res(null); };
            img.src = src;
        });
    }

    async function photoData(p) {
        if (typeof window.getCachedPhotoData === "function") {
            try {
                var c = await window.getCachedPhotoData(p.id);
                if (c) { var d = await toDataUrl(c, 1400); if (d) return d; }
            } catch (e) {}
        }
        return await toDataUrl(p.url, 1400);   // 도감 사진이 1600px 이라 책에서도 살린다
    }

    /* ---------- 재료 모으기 ---------- */

    function collect() {
        var days = {};

        /* ⚠️ 들어오는 키를 여기서 전부 편다.
              날짜로 못 읽는 키는 아예 안 받는다. 받으면 NaN 쪽이 생긴다. */
        var touch = function (k) {
            var key = normKey(k);
            if (!key) return null;
            if (!days[key]) days[key] = { key: key, ms: [], photos: [], letter: null, anni: [], diary: [] };
            return days[key];
        };

        // 사진
        if (typeof window.photoDays === "function") {
            window.photoDays().forEach(function (k) {
                var t = touch(k);
                if (t) t.photos = window.getDayPhotos(k) || [];
            });
        }

        // 처음 해낸 일
        var msDates = {};
        try { msDates = JSON.parse(localStorage.getItem("tosil_milestone_dates")) || {}; } catch (e) {}

        var raw = [];
        try { raw = JSON.parse(localStorage.getItem("tosil_milestones")) || []; } catch (e) {}
        raw.forEach(function (a) {
            var id = typeof a === "string" ? a : (a && a.id);
            if (!id) return;

            /* 날짜를 세 번 찾아본다.
                 ① 도감이 적어둔 날짜
                 ② 예전 버전이 남긴 밀리초 시각
               둘 다 못 읽으면 책에 넣지 않는다.
               날짜 없는 기록을 억지로 끼우면 엉뚱한 날에 박힌다. */
            var date = normKey(a && a.date) || normKey(msDates[id]);
            if (!date) return;

            var it = msItem(id);
            var t = touch(date);
            if (it && t) t.ms.push({ id: id, title: it.title, desc: it.desc });
        });

        /* ⚠️ 부부 문답은 이 책에 넣지 않는다.
              이건 아이의 배냇함이고, 문답은 부부 둘의 책이다.
              성격이 다르고, 따로 묶어서 팔 물건이다.
              (diaryPage 는 그 책을 만들 때 그대로 쓴다) */

        // 편지 — 전부 넣으면 책이 아니라 일지가 된다.
        // 사진이나 첫 순간이 있는 날은 그날 편지를, 그 외에는 달마다 한 통만.
        var letters = {};
        try { letters = JSON.parse(localStorage.getItem("tosil_letters")) || {}; } catch (e) {}
        var monthTaken = {};
        Object.keys(letters).sort().forEach(function (k) {
            var key = normKey(k);
            if (!key) return;
            var d = days[key];
            var rich = d && (d.photos.length || d.ms.length);
            var ym = key.slice(0, 7);
            if (rich || !monthTaken[ym]) {
                var t = touch(key);
                if (t) { t.letter = letters[k]; if (!rich) monthTaken[ym] = 1; }
            }
        });

        // 기념일 (큰 것만)
        if (typeof window.anniversaryDays === "function") {
            window.anniversaryDays().forEach(function (k) {
                var list = (window.anniversariesOn(k) || []).filter(function (a) { return a.tier === 1; });
                var t = list.length ? touch(k) : null;
                if (t) t.anni = list;
            });
        }

        return Object.keys(days).sort().map(function (k) { return days[k]; });
    }

    /* ---------- 페이지 판 ---------- */

    function shell(inner, folio) {
        return '<div style="width:' + PW + 'px; height:' + PH + 'px; background:' + PAPER + '; ' +
            'box-sizing:border-box; padding:120px 100px; position:relative; ' +
            'font-family:\'Pretendard\',sans-serif; color:' + INK + '; overflow:hidden;">' +
            inner +
            (folio ? '<div style="position:absolute; left:0; right:0; bottom:64px; text-align:center; ' +
                'font-size:19px; font-weight:600; color:' + INK_L + '; letter-spacing:2px;">' + esc(folio) + '</div>' : '') +
        '</div>';
    }

    function coverPage(cov, span) {
        return '<div style="width:' + PW + 'px; height:' + PH + 'px; background:linear-gradient(170deg,#FFFFFF 0%,' + PAPER + ' 55%,#F6EFE2 100%); ' +
            'box-sizing:border-box; padding:130px 100px; display:flex; flex-direction:column; align-items:center; ' +
            'font-family:\'Pretendard\',sans-serif; text-align:center;">' +

            '<div style="font-size:20px; font-weight:600; color:' + GOLD + '; letter-spacing:11px; margin-bottom:44px;">MEMORY BOX</div>' +

            (cov ? '<div style="width:640px; height:640px; border-radius:50%; overflow:hidden; background:#F1ECE8; margin-bottom:56px;">' +
                       '<img src="' + cov + '" style="width:100%; height:100%; object-fit:cover; display:block;">' +
                   '</div>'
                 : '<div style="width:1px; height:180px; background:' + LINE + '; margin-bottom:56px;"></div>') +

            '<div style="font-family:\'Gowun Batang\',serif; font-size:76px; font-weight:700; color:' + INK + '; letter-spacing:-3px; line-height:1.25;">' +
                esc(babyName()) + '의<br>배냇함</div>' +

            '<div style="font-size:24px; font-weight:500; color:' + INK_S + '; margin-top:38px; letter-spacing:-0.5px;">' + esc(span) + '</div>' +

            '<div style="margin-top:auto; font-size:19px; font-weight:600; color:' + INK_L + '; letter-spacing:3px;">배냇함</div>' +
        '</div>';
    }

    function openingPage() {
        var b = birth();
        var when = b ? (b.getFullYear() + "년 " + (b.getMonth() + 1) + "월 " + b.getDate() + "일") : "";
        return shell(
            '<div style="height:100%; display:flex; flex-direction:column; justify-content:center; text-align:center;">' +
                '<div style="font-size:19px; font-weight:800; color:' + GOLD + '; letter-spacing:6px; margin-bottom:40px;">D + 0</div>' +
                '<div style="font-family:\'Gowun Batang\',serif; font-size:54px; font-weight:700; letter-spacing:-2px; line-height:1.4;">' +
                    esc(babyName()) + '가<br>세상에 온 날</div>' +
                '<div style="font-size:25px; font-weight:500; color:' + INK_S + '; margin-top:34px;">' + esc(when) + '</div>' +
                '<div style="width:1px; height:120px; background:' + LINE + '; margin:56px auto 0;"></div>' +
                '<div style="font-size:22px; font-weight:400; color:' + INK_L + '; margin-top:48px; line-height:1.9;">' +
                    '여기서부터<br>하루씩 쌓인 기록입니다</div>' +
            '</div>', ""
        );
    }

    function anniPage(a, key, folio) {
        return shell(
            '<div style="height:100%; display:flex; flex-direction:column; justify-content:center; text-align:center;">' +
                '<div style="font-size:17px; font-weight:800; color:' + GOLD + '; letter-spacing:6px; margin-bottom:36px;">기념일</div>' +
                '<div style="font-family:\'Gowun Batang\',serif; font-size:64px; font-weight:700; letter-spacing:-2px;">' + esc(a.label) + '</div>' +
                (a.sub ? '<div style="font-size:24px; font-weight:400; color:' + INK_S + '; margin-top:28px; line-height:1.8;">' + esc(a.sub) + '</div>' : '') +
                '<div style="font-size:20px; font-weight:600; color:' + INK_L + '; margin-top:44px;">' + esc(pretty(key)) + '  ·  ' + esc(dday(key)) + '</div>' +
            '</div>', folio
        );
    }

    function scenePage(o, folio) {
        // o = { img, kicker, title, desc, note, key }
        return shell(
            '<div style="height:100%; display:flex; flex-direction:column;">' +
                (o.kicker ? '<div style="font-size:16px; font-weight:800; color:' + GOLD + '; letter-spacing:5px; margin-bottom:26px;">' + esc(o.kicker) + '</div>' : '') +

                (o.img ? '<div style="width:100%; height:790px; overflow:hidden; background:' + PAPER + '; ' +
                            'display:flex; align-items:center; justify-content:center;">' +
                            '<img src="' + o.img + '" style="max-width:100%; max-height:100%; object-fit:contain; ' +
                                'display:block; box-shadow:0 3px 16px rgba(96,78,60,0.13);">' +
                         '</div>' : '') +

                '<div style="margin-top:' + (o.img ? 52 : 0) + 'px;">' +
                    (o.title ? '<div style="font-family:\'Gowun Batang\',serif; font-size:46px; font-weight:700; letter-spacing:-2px; line-height:1.35; word-break:keep-all;">' + esc(o.title) + '</div>' : '') +
                    (o.desc ? '<div style="font-size:23px; font-weight:400; color:' + INK_S + '; margin-top:20px; line-height:1.75; word-break:keep-all;">' + esc(o.desc) + '</div>' : '') +
                    (o.note ? '<div style="font-family:\'Nanum Pen Script\',cursive; font-size:38px; color:' + INK_S + '; margin-top:30px; line-height:1.5; word-break:keep-all;">' + esc(o.note) + '</div>' : '') +
                '</div>' +

                '<div style="margin-top:auto; padding-top:34px; border-top:1px solid ' + LINE + '; display:flex; justify-content:space-between; font-size:19px; font-weight:600; color:' + INK_L + ';">' +
                    '<span>' + esc(pretty(o.key)) + '</span><span>' + esc(dday(o.key)) + '</span>' +
                '</div>' +
            '</div>', folio
        );
    }

    /* ==========================================================
       하루를 한 장에 \u2014 사진 + 그날 편지 + 그날 숫자
       ----------------------------------------------------------
       \u26a0\ufe0f 예전엔 같은 날인데 사진 쪽과 편지 쪽이 따로 만들어졌다.
          사진 쪽은 사진만, 편지 쪽은 글만 있어서
          42쪽 중 절반이 거의 빈 종이였다. 인쇄하면 종이가 그만큼 낭비된다.

       \u26a0\ufe0f 사진을 object-fit:cover 로 높이 790px 에 욱여넣고 있었다.
          세로 사진은 위아래가 잘리고 가로 사진은 옆으로 늘어났다.
          contain 으로 바꿔 원본 비율을 지킨다. 남는 자리는 여백으로 둔다.

       \u26a0\ufe0f 글 길이에 따라 사진 높이를 바꾼다.
          글이 짧은 날은 사진을 크게, 긴 날은 작게. 어느 쪽도 넘치지 않는다.
       ---------------------------------------------------------- */

    function statLine(l) {
        var stat = [];
        if (!l) return stat;
        if (l.milk) stat.push("수유 " + l.milk + "ml");
        if (l.breastMins) stat.push("모유 " + l.breastMins + "분");
        if (l.sleepMins) {
            var h = Math.floor(l.sleepMins / 60), m = l.sleepMins % 60;
            stat.push("수면 " + (h ? h + "시간 " : "") + (m ? m + "분" : ""));
        }
        if (l.dawn) stat.push("새벽 " + l.dawn + "번");
        return stat;
    }

    function dayPage(o, folio) {
        // o = { key, img, caption, kicker, title, desc, letter }
        var l = o.letter || null;
        var text = l ? String(l.text || "") : "";
        var chars = text.length + String(o.desc || "").length + String(o.caption || "").length;

        /* 글 길이로 사진 칸을 정한다. 종이 높이는 shell 이 잡아준다. */
        var imgH = 820;
        if (chars > 320) imgH = 480;
        else if (chars > 180) imgH = 620;
        else if (chars > 80) imgH = 720;
        if (!o.img) imgH = 0;

        /* ⚠️ 글이 한 줄도 없는 날이 있다. 사진만 있는 날이다.
              그런 쪽은 사진 밑이 통째로 빈 종이였다.
              돈 받고 파는 책에서 반 장이 비면 그건 낭비로 보인다.
              글이 없으면 사진에게 남은 자리를 전부 준다. */
        var hasText = !!(o.title || o.desc || o.caption || text || (l && l.ms));
        var photoBox = o.img
            ? (hasText
                ? 'height:' + imgH + 'px;'
                : 'flex:1; min-height:0; margin-bottom:10px;')
            : '';

        var stat = statLine(l);

        return shell(
            '<div style="height:100%; display:flex; flex-direction:column;">' +

                '<div style="font-size:16px; font-weight:800; color:' + GOLD + '; ' +
                    'letter-spacing:5px; margin-bottom:12px;">' + esc(o.kicker || "그날") + '</div>' +
                '<div style="font-size:21px; font-weight:600; color:' + INK_L + '; ' +
                    'margin-bottom:34px;">' + esc(pretty(o.key)) + '  \u00b7  ' + esc(dday(o.key)) + '</div>' +

                /* ⚠️ 사진 칸 바탕이 #F7F4F1 이었다. 종이색(#FDFBF7)과 달라서
                      세로 사진 양옆에 회색 띠가 그어진 것처럼 보였다.
                      바탕을 종이와 같게 해서 띠를 없애고,
                      대신 사진 자체에 아주 옅은 그림자를 준다.
                      상자 안에 갇힌 그림이 아니라 종이에 놓인 인화지로 보이게. */
                (o.img
                    ? '<div style="width:100%; ' + photoBox + ' background:' + PAPER + '; ' +
                          'overflow:hidden; display:flex; ' +
                          'align-items:center; justify-content:center;">' +
                          '<img src="' + o.img + '" style="max-width:100%; max-height:100%; ' +
                              'width:auto; height:auto; object-fit:contain; display:block; ' +
                              'box-shadow:0 3px 16px rgba(96,78,60,0.13);">' +
                      '</div>'
                    : '') +

                '<div style="margin-top:' + (o.img ? 40 : 0) + 'px;">' +
                    (o.title ? '<div style="font-family:\'Gowun Batang\',serif; font-size:46px; ' +
                        'font-weight:700; letter-spacing:-2px; line-height:1.35; ' +
                        'word-break:keep-all; margin-bottom:18px;">' + esc(o.title) + '</div>' : '') +

                    (o.desc ? '<div style="font-size:23px; font-weight:400; color:' + INK_S + '; ' +
                        'line-height:1.75; word-break:keep-all; margin-bottom:18px;">' +
                        esc(o.desc) + '</div>' : '') +

                    (o.caption ? '<div style="font-family:\'Nanum Pen Script\',cursive; ' +
                        'font-size:36px; color:' + INK_S + '; line-height:1.5; ' +
                        'word-break:keep-all; margin-bottom:18px;">' + esc(o.caption) + '</div>' : '') +

                    (text ? '<div style="font-family:\'Nanum Pen Script\',cursive; ' +
                        'font-size:' + (chars > 320 ? 38 : 44) + 'px; color:' + INK + '; ' +
                        'line-height:1.7; white-space:pre-wrap; word-break:keep-all;">' +
                        esc(text) + '</div>' : '') +

                    (l && l.ms ? '<div style="font-family:\'Nanum Pen Script\',cursive; font-size:40px; ' +
                        'color:' + GOLD + '; margin-top:26px; line-height:1.6;">' + esc(l.ms) + '</div>' : '') +
                '</div>' +

                '<div style="margin-top:auto; padding-top:30px; border-top:1px solid ' + LINE + '; ' +
                    'display:flex; justify-content:space-between; align-items:center; ' +
                    'font-size:19px; font-weight:600; color:' + INK_L + '; letter-spacing:0.5px;">' +
                    '<span>' + esc(stat.join("   \u00b7   ")) + '</span>' +
                    '<span>' + esc(dday(o.key)) + '</span>' +
                '</div>' +
            '</div>', folio
        );
    }

    function letterPage(l, key, folio) {
        var stat = [];
        if (l.milk) stat.push("수유 " + l.milk + "ml");
        if (l.breastMins) stat.push("모유 " + l.breastMins + "분");
        if (l.sleepMins) {
            var h = Math.floor(l.sleepMins / 60), m = l.sleepMins % 60;
            stat.push("수면 " + (h ? h + "시간 " : "") + (m ? m + "분" : ""));
        }
        if (l.dawn) stat.push("새벽 " + l.dawn + "번");

        return shell(
            '<div style="height:100%; display:flex; flex-direction:column;">' +
                '<div style="font-size:16px; font-weight:800; color:' + GOLD + '; letter-spacing:5px; margin-bottom:14px;">그날의 편지</div>' +
                '<div style="font-size:21px; font-weight:600; color:' + INK_L + '; margin-bottom:46px;">' + esc(pretty(key)) + '  ·  ' + esc(dday(key)) + '</div>' +

                '<div style="font-family:\'Nanum Pen Script\',cursive; font-size:46px; color:' + INK + '; line-height:1.75; white-space:pre-wrap; word-break:keep-all;">' +
                    esc(l.text || "") + '</div>' +

                (l.ms ? '<div style="font-family:\'Nanum Pen Script\',cursive; font-size:42px; color:' + GOLD + '; margin-top:30px; line-height:1.6;">' + esc(l.ms) + '</div>' : '') +

                (stat.length ? '<div style="margin-top:auto; padding-top:34px; border-top:1px solid ' + LINE + '; font-size:19px; font-weight:600; color:' + INK_L + '; letter-spacing:0.5px;">' +
                    esc(stat.join("   ·   ")) + '</div>' : '') +
            '</div>', folio
        );
    }

    function voicePage(list, folio) {
        var rows = list.map(function (v) {
            var wave = (typeof window.renderWave === "function" && v.peaks)
                ? window.renderWave(v.peaks, { w: 900, h: 74, color: "#C69A3C", gap: 2.2, min: 3 })
                : "";
            return '<div style="padding:26px 0; border-bottom:1px solid ' + LINE + ';">' +
                '<div style="display:flex; align-items:baseline; gap:16px; margin-bottom:' + (wave ? 14 : 0) + 'px;">' +
                    '<span style="flex:1; font-size:26px; font-weight:600;">' + esc(v.label) + '</span>' +
                    '<span style="font-size:19px; font-weight:600; color:' + INK_L + ';">' + esc(v.when) + '  ·  ' + v.sec + '초</span>' +
                '</div>' +
                wave +
            '</div>';
        }).join("");

        return shell(
            '<div style="height:100%; display:flex; flex-direction:column;">' +
                '<div style="font-size:16px; font-weight:800; color:' + GOLD + '; letter-spacing:5px; margin-bottom:14px;">담긴 목소리</div>' +
                '<div style="font-family:\'Gowun Batang\',serif; font-size:44px; font-weight:700; letter-spacing:-2px; margin-bottom:36px;">' +
                    '소리의 모양</div>' +
                '<div>' + rows + '</div>' +
                '<div style="margin-top:40px; font-size:22px; font-weight:400; color:' + INK_S + '; line-height:1.8;">' +
                    '소리는 종이에 담기지 않지만,<br>그 모양은 이렇게 남길 수 있습니다.</div>' +
            '</div>', folio
        );
    }

    function diaryPage(e, folio) {
        return shell(
            '<div style="height:100%; display:flex; flex-direction:column;">' +
                '<div style="font-size:16px; font-weight:800; color:' + GOLD + '; letter-spacing:5px; margin-bottom:26px;">우리의 문답</div>' +
                '<div style="font-family:\'Gowun Batang\',serif; font-size:38px; font-weight:700; letter-spacing:-1.5px; line-height:1.5; word-break:keep-all;">' +
                    esc(e.q) + '</div>' +
                '<div style="width:1px; height:60px; background:' + LINE + '; margin:44px 0;"></div>' +

                '<div style="font-size:17px; font-weight:800; color:' + GOLD + '; letter-spacing:3px; margin-bottom:14px;">아빠</div>' +
                '<div style="font-size:24px; font-weight:400; color:' + INK_S + '; line-height:1.8; word-break:keep-all; white-space:pre-wrap;">' + esc(e.husband) + '</div>' +

                '<div style="font-size:17px; font-weight:800; color:' + GOLD + '; letter-spacing:3px; margin:38px 0 14px;">엄마</div>' +
                '<div style="font-size:24px; font-weight:400; color:' + INK_S + '; line-height:1.8; word-break:keep-all; white-space:pre-wrap;">' + esc(e.wife) + '</div>' +

                '<div style="margin-top:auto; padding-top:34px; border-top:1px solid ' + LINE + '; display:flex; justify-content:space-between; font-size:19px; font-weight:600; color:' + INK_L + ';">' +
                    '<span>문답 ' + e.day + '일차</span><span>' + esc(pretty(e.key)) + '</span>' +
                '</div>' +
            '</div>', folio
        );
    }

    function endPage(n, sum) {
        /* 총계 한 줄이 있으면 '책' 이 되고, 없으면 '출력물' 로 끝난다. */
        var tail = "";
        if (sum) {
            var bits = [];
            if (sum.photos) bits.push("사진 " + sum.photos + "장");
            if (sum.letters) bits.push("편지 " + sum.letters + "통");
            if (sum.ms) bits.push("처음 해낸 일 " + sum.ms + "가지");
            if (bits.length) {
                tail = '<div style="margin-top:46px; font-size:21px; font-weight:600; color:' + INK_L + '; ' +
                       'letter-spacing:0.5px; line-height:1.9;">' + esc(bits.join("   \u00b7   ")) + '</div>';
            }
        }
        /* ⚠️ n 을 못 구하는 날이 있다(생일 미입력 등).
              그때 예전 코드는 "0" 을 넣어 "여기까지가 0일입니다" 로 끝났다.
              책의 마지막 장이다. 숫자가 없으면 숫자를 빼고 말한다. */
        var head = (n === "" || n === null || n === undefined || String(n) === "0")
            ? '여기까지<br>담았습니다'
            : '여기까지가<br>' + esc(String(n)) + '일입니다';

        return shell(
            '<div style="height:100%; display:flex; flex-direction:column; justify-content:center; text-align:center;">' +
                '<div style="font-family:\'Gowun Batang\',serif; font-size:50px; font-weight:700; letter-spacing:-2px; line-height:1.45;">' +
                    head + '</div>' +
                '<div style="width:1px; height:110px; background:' + LINE + '; margin:52px auto;"></div>' +
                '<div style="font-size:23px; font-weight:400; color:' + INK_S + '; line-height:1.9;">' +
                    '다음 장은 아직 비어 있어요.<br>내일 또 한 줄이 쌓입니다.</div>' +
                tail +
                '<div style="margin-top:auto; font-size:19px; font-weight:600; color:' + INK_L + '; letter-spacing:3px;">배냇함</div>' +
            '</div>', ""
        );
    }

    /* ---------- 굽기 ---------- */

    function ensureJsPDF() {
        return new Promise(function (res, rej) {
            if (window.jspdf && window.jspdf.jsPDF) return res();
            var s = document.createElement("script");
            s.src = JSPDF_CDN;
            s.onload = function () { res(); };
            s.onerror = function () { rej(new Error("jsPDF 로드 실패")); };
            document.head.appendChild(s);
        });
    }

    function progress(now, total, label) {
        var el = document.getElementById("book-progress");
        if (!el) {
            el = document.createElement("div");
            el.id = "book-progress";
            el.setAttribute("style", "position:fixed; inset:0; z-index:100004; background:rgba(35,29,24,0.72); display:flex; align-items:center; justify-content:center;");
            document.body.appendChild(el);
        }
        var pct = total ? Math.round((now / total) * 100) : 0;
        el.innerHTML =
            '<div style="width:280px; text-align:center; color:#FFF;">' +
                '<div style="font-size:34px; margin-bottom:18px;">📖</div>' +
                '<div style="font-size:15px; font-weight:800; letter-spacing:-0.3px;">' + esc(label) + '</div>' +
                '<div style="height:5px; background:rgba(255,255,255,0.18); border-radius:3px; margin-top:18px; overflow:hidden;">' +
                    '<div style="height:100%; width:' + pct + '%; background:#D2A340; transition:width .25s;"></div>' +
                '</div>' +
                '<div style="font-size:12px; font-weight:700; opacity:0.7; margin-top:10px;">' + pct + '%</div>' +
            '</div>';
    }

    function closeProgress() {
        var el = document.getElementById("book-progress");
        if (el) el.remove();
    }

    async function shoot(html) {
        var stage = document.createElement("div");
        stage.style.cssText = "position:fixed; top:0; left:0; z-index:-9999; pointer-events:none; opacity:1;";
        stage.innerHTML = html;
        document.body.appendChild(stage);
        await new Promise(function (r) { setTimeout(r, 120); });
        try {
            var canvas = await html2canvas(stage.firstChild, {
                scale: 1, backgroundColor: PAPER, useCORS: true, logging: false,
                width: PW, height: PH, windowWidth: PW, windowHeight: PH
            });
            return canvas.toDataURL("image/jpeg", 0.88);
        } finally {
            stage.remove();       // 한 장씩 지운다. 안 그러면 폰이 죽는다.
            // 브라우저가 방금 캔버스를 회수할 틈을 준다.
            // 이게 없으면 구형 폰에서 열 장쯤 굽다가 튕긴다.
            await new Promise(function (r) { setTimeout(r, 160); });
        }
    }

    window.makeMemoryBook = function () {
        // 조용히 끝나는 게 제일 나쁘다. 뭐가 됐든 흔적을 남긴다.
        return bakeBook().catch(function (e) {
            console.error("[포토북] 실패", e);
            closeProgress();
            toast("책을 만들지 못했어요: " + (e && e.message ? e.message : "알 수 없는 오류"));
        });
    };

    async function bakeBook(opts) {
        opts = opts || {};
        var previewOnly = !!opts.preview;      // 앞 몇 쪽만 굽고 화면에 보여준다
        if (typeof html2canvas === "undefined") return toast("이미지 라이브러리를 불러오지 못했어요");

        var data = collect();
        if (!data.length) return toast("아직 책으로 묶을 기록이 없어요");

        progress(0, 1, "재료를 모으는 중이에요");
        try { await ensureJsPDF(); }
        catch (e) { closeProgress(); return toast("책 만들기 도구를 불러오지 못했어요"); }

        // 1) 페이지 목록부터 짠다
        var pages = [];
        var b = birth();
        var last = data[data.length - 1].key;
        var span = b ? (b.getFullYear() + "." + String(b.getMonth() + 1).padStart(2, "0") +
                        "  —  " + last.slice(0, 4) + "." + last.slice(5, 7)) : "";

        var covSrc = null;
        for (var i = data.length - 1; i >= 0 && !covSrc; i--) {
            if (data[i].photos.length) covSrc = data[i].photos[data[i].photos.length - 1];
        }

        pages.push({ type: "cover", src: covSrc, span: span });
        pages.push({ type: "opening" });

        /* \u26a0\ufe0f 예전엔 사진 쪽, 편지 쪽을 따로 만들어서 절반이 빈 종이였다.
              하루를 한 장에 담는다. 사진이 여러 장인 날만 장수가 늘어나고,
              편지는 그 날의 첫 장에 같이 실린다. */
        data.forEach(function (d) {
            d.anni.forEach(function (a) { pages.push({ type: "anni", a: a, key: d.key }); });

            var letter = d.letter || null;   // 그 날 첫 장에만 싣는다

            d.ms.forEach(function (m) {
                var found = (typeof window.getMilestonePhoto === "function") ? window.getMilestonePhoto(m.id) : null;
                pages.push({
                    type: "day", key: d.key, src: found ? found.photo : null,
                    kicker: "처음 해낸 일", title: m.title, desc: m.desc,
                    caption: found ? (found.photo.caption || "") : "",
                    letter: letter
                });
                letter = null;
            });

            d.photos.filter(function (p) { return !p.msId; }).forEach(function (p) {
                pages.push({
                    type: "day", key: d.key, src: p,
                    kicker: "그날의 사진", title: "", desc: "",
                    caption: p.caption || "",
                    letter: letter
                });
                letter = null;
            });

            /* 부부 문답은 collect() 에서 아예 안 담는다. 여기도 만들지 않는다. */

            /* 사진도 도감도 없는 날은 편지만 한 장으로 */
            if (letter) pages.push({
                type: "day", key: d.key, src: null,
                kicker: "그날의 편지", title: "", desc: "", caption: "",
                letter: letter
            });
        });

        // 목소리 목록
        if (typeof window.voiceDays === "function") {
            var vs = [];
            window.voiceDays().sort().forEach(function (k) {
                (window.getDayVoices(k) || []).forEach(function (v) {
                    var t = v.msId && typeof msItem === "function" && msItem(v.msId) ? msItem(v.msId).title : (v.note || "그날의 소리");
                    vs.push({ label: t, when: pretty(k), sec: v.sec || 0, peaks: v.peaks || null });
                });
            });
            if (vs.length) pages.push({ type: "voice", list: vs });
        }

        /* 이 책에 실제로 담긴 것들을 센다 */
        var sum = { photos: 0, letters: 0, ms: 0 };
        pages.forEach(function (p) {
            if (p.type !== "day") return;
            if (p.src) sum.photos++;
            if (p.letter) sum.letters++;
            if (p.kicker === "처음 해낸 일") sum.ms++;
        });
        /* ⚠️ 마지막 날짜로 일수를 센다.
              예전엔 도감 키("2026. 09. 11")가 정렬상 맨 뒤로 가서
              그게 last 가 되고, 날짜로 못 읽혀 "0일" 이 찍혔다.
              이제 키가 전부 펴져 있지만, 그래도 한 번 더 막아둔다. */
        var endN = ddayNum(last);
        if (endN === null) {
            for (var q = data.length - 1; q >= 0 && endN === null; q--) endN = ddayNum(data[q].key);
        }
        pages.push({ type: "end", n: endN === null ? "" : endN, sum: sum });

        if (pages.length > MAX_PAGES) {
            pages = pages.slice(0, MAX_PAGES - 1).concat(pages[pages.length - 1]);
            toast("기록이 많아 " + MAX_PAGES + "쪽까지만 담았어요");
        }

        // 2) 사진을 미리 전부 데이터로 바꾼다
        progress(0, pages.length, "사진을 옮기는 중이에요");
        for (var j = 0; j < pages.length; j++) {
            if (pages[j].src) pages[j].img = await photoData(pages[j].src);
        }

        // 3) 한 장씩 굽는다
        var total = pages.length;
        if (previewOnly) pages = pages.slice(0, 3);      // 표지 · 태어난 날 · 첫 장면

        var jsPDF = window.jspdf.jsPDF;
        var pdf = previewOnly ? null
            : new jsPDF({ orientation: "portrait", unit: "px", format: [PW, PH], compress: true });
        var shots = [];
        var folioNo = 0;

        for (var n = 0; n < pages.length; n++) {
            var p = pages[n], html;
            progress(n, pages.length, (n + 1) + " / " + pages.length + "쪽을 굽는 중");

            if (p.type === "cover")        html = coverPage(p.img, p.span);
            else if (p.type === "opening") html = openingPage();
            else if (p.type === "end")     html = endPage(p.n, p.sum);
            else {
                folioNo++;
                if (p.type === "anni")        html = anniPage(p.a, p.key, String(folioNo));
                else if (p.type === "letter") html = letterPage(p.l, p.key, String(folioNo));
                else if (p.type === "voice")  html = voicePage(p.list, String(folioNo));
                else if (p.type === "diary")  html = diaryPage(p.e, String(folioNo));
                else if (p.type === "day") html = dayPage({
                    img: p.img, kicker: p.kicker, title: p.title,
                    desc: p.desc, caption: p.caption, key: p.key, letter: p.letter
                }, String(folioNo));
                else html = scenePage({
                    img: p.img, kicker: p.kicker, title: p.title,
                    desc: p.desc, note: p.note, key: p.key
                }, String(folioNo));
            }

            var jpg = await shoot(html);
            if (previewOnly) { shots.push(jpg); continue; }
            if (n > 0) pdf.addPage([PW, PH], "portrait");
            pdf.addImage(jpg, "JPEG", 0, 0, PW, PH, undefined, "FAST");
        }

        closeProgress();

        if (previewOnly) { showPreview(shots, total); return; }

        progress(pages.length, pages.length, "책을 묶는 중이에요");
        pdf.save(babyName() + "의 배냇함.pdf");
        closeProgress();
        toast("📖 " + pages.length + "쪽짜리 책이 만들어졌어요");
    };

    /* ---------- 미리보기 ----------
       잠긴 문 앞에서 파는 것과, 열어보고 나서 파는 것은 다르다.
       앞 세 쪽은 무료로 구워서 손에 쥐여준다. -------- */

    function showPreview(shots, total) {
        var old = document.getElementById("book-preview");
        if (old) old.remove();

        var pro = (typeof window.isPremium !== "function") || window.isPremium();

        var wrap = document.createElement("div");
        wrap.id = "book-preview";
        wrap.setAttribute("style", "position:fixed; inset:0; z-index:100004; background:#241E19; " +
            "overflow-y:auto; -webkit-overflow-scrolling:touch;");

        wrap.innerHTML =
        '<div style="max-width:520px; margin:0 auto; padding:0 20px calc(40px + env(safe-area-inset-bottom, 0px));">' +

            '<div style="display:flex; justify-content:space-between; align-items:flex-start; padding:22px 2px 18px;">' +
                '<div>' +
                    '<div style="font-family:\'Gowun Batang\',serif; font-size:21px; font-weight:700; color:#FFF; letter-spacing:-0.5px;">' +
                        esc(babyName()) + '의 배냇함</div>' +
                    '<div style="font-size:12px; font-weight:600; color:#A3958A; margin-top:6px;">' +
                        '전부 ' + total + '쪽 · 앞 ' + shots.length + '쪽 미리보기</div>' +
                '</div>' +
                '<span onclick="document.getElementById(\'book-preview\').remove(); document.body.style.overflow=\'\';" ' +
                    'style="font-size:24px; font-weight:300; color:#A3958A; cursor:pointer; line-height:1;">×</span>' +
            '</div>' +

            shots.map(function (src, i) {
                return '<div style="margin-bottom:14px; border-radius:6px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.35);">' +
                    '<img src="' + src + '" style="width:100%; display:block;">' +
                '</div>' +
                '<div style="text-align:center; font-size:11px; font-weight:700; color:#7A6F68; margin-bottom:22px;">' +
                    (i + 1) + ' / ' + total + '</div>';
            }).join("") +

            '<div style="background:rgba(185,138,46,0.12); border:1px solid rgba(185,138,46,0.3); border-radius:20px; ' +
                'padding:22px 20px; margin-top:8px; text-align:center;">' +
                '<div style="font-size:15px; font-weight:800; color:#D2A340; letter-spacing:-0.3px;">' +
                    '나머지 ' + Math.max(0, total - shots.length) + '쪽이 남아 있어요</div>' +
                '<div style="font-size:12.5px; font-weight:600; color:#A3958A; line-height:1.7; margin-top:9px; word-break:keep-all;">' +
                    '사진과 첫 순간, 그날의 편지, 담긴 목소리까지<br>한 권으로 묶여 있습니다.</div>' +
                '<div onclick="window.bookFromPreview()" style="margin-top:18px; padding:16px; background:#B98A2E; ' +
                    'color:#FFF; border-radius:15px; font-size:15px; font-weight:800; cursor:pointer;">' +
                    (pro ? '전체 ' + total + '쪽 내려받기' : '전체 ' + total + '쪽 뽑기') + '</div>' +
            '</div>' +

            '<div style="text-align:center; font-size:11px; font-weight:600; color:#7A6F68; margin-top:20px; line-height:1.8;">' +
                'A5 판형으로 인쇄소에 그대로 넘길 수 있어요' +
            '</div>' +
        '</div>';

        document.body.appendChild(wrap);
        document.body.style.overflow = "hidden";
    }

    window.bookFromPreview = function () {
        var el = document.getElementById("book-preview");
        if (el) { el.remove(); document.body.style.overflow = ""; }

        var pro = (typeof window.isPremium !== "function") || window.isPremium();
        if (!pro) {
            if (typeof window.openUpsell === "function") return window.openUpsell("book");
            return toast("프리미엄에서 전체를 뽑을 수 있어요");
        }
        window.makeMemoryBook();
    };

    window.previewMemoryBook = function () {
        return bakeBook({ preview: true }).catch(function (e) {
            console.error("[포토북 미리보기] 실패", e);
            closeProgress();
            toast("미리보기를 만들지 못했어요: " + (e && e.message ? e.message : "알 수 없는 오류"));
        });
    };

    /* ---------- 프리미엄 문 ----------
       requirePremium('book') 은 프리미엄 사용자에게 true 만 돌려주고
       아무것도 안 한다. 그래서 눌러도 조용했다.
       여기서 가로채서, 통과한 사람은 실제로 책이 나오게 한다. -------- */

    window.exportMemoryBook = function () {
        // 무료 사용자에게 잠금창부터 들이밀지 않는다.
        // 앞 세 쪽을 굽어서 보여주고, 그 다음에 나머지를 판다.
        if (typeof window.isPremium === "function" && !window.isPremium()) {
            return window.previewMemoryBook();
        }
        window.makeMemoryBook();
    };

    /* 로드 순서에 기대지 않는 방법.
       premium.js 가 나중에 로드되면 window.exportMemoryBook 을 자기 껍데기로
       덮어쓴다. 그 껍데기는 프리미엄 사용자에게 아무것도 안 한다.
       그래서 두 겹으로 막는다.
         1) 클릭을 문서에서 캡처 단계로 먼저 잡고, 내부 함수를 직접 부른다
         2) 로드가 끝난 뒤 이름을 다시 가져온다 */

    var realExport = window.exportMemoryBook;

    document.addEventListener("click", function (e) {
        if (!e.target || !e.target.closest) return;
        var el = e.target.closest('[onclick*="MemoryBook"], [onclick*="requirePremium"]');
        if (!el) return;

        var oc = el.getAttribute("onclick") || "";
        var wantBook  = oc.indexOf("MemoryBook") > -1 || oc.indexOf("'book'") > -1 || oc.indexOf('"book"') > -1;
        var wantVoice = oc.indexOf("'voice'") > -1 || oc.indexOf('"voice"') > -1;
        if (!wantBook && !wantVoice) return;

        e.preventDefault();
        e.stopPropagation();

        var pro = (typeof window.isPremium !== "function") || window.isPremium();

        if (wantBook) {
            if (!pro && typeof window.openUpsell === "function") return window.openUpsell("book");
            window.makeMemoryBook();          // 내부에서 다시 잡아둔 이름
        } else {
            if (!pro && typeof window.openUpsell === "function") return window.openUpsell("voice");
            if (typeof window.openVoiceSheet === "function") window.openVoiceSheet();
        }
    }, true);

    // 누가 덮어썼든 되찾는다
    function claim() {
        if (window.exportMemoryBook !== realExport) window.exportMemoryBook = realExport;
    }
    setTimeout(claim, 0);
    setTimeout(claim, 1200);
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", claim);

    var origRequire = window.requirePremium;
    window.requirePremium = function (key) {
        var pro = (typeof window.isPremium !== "function") || window.isPremium();
        if (pro) {
            if (key === "book") { window.exportMemoryBook(); return true; }
            if (key === "voice" && typeof window.openVoiceSheet === "function") {
                window.openVoiceSheet(); return true;
            }
        }
        return (typeof origRequire === "function") ? origRequire.apply(this, arguments) : false;
    };

    /* ---------- 점검용 ---------- */
    window.bookDebug = function () {
        var d = collect();
        var pages = 2;
        d.forEach(function (x) {
            pages += (x.diary || []).length + x.anni.length + x.ms.length +
                     x.photos.filter(function (p) { return !p.msId; }).length +
                     (x.letter ? 1 : 0);
        });
        console.log("담긴 날:", d.length + "일");
        console.log("예상 쪽수:", (pages + 1) + "쪽");
        return d;
    };
})();