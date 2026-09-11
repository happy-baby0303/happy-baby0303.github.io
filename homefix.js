/* ============================================================
   배냇함 — 홈 화면 세 가지 (homefix.js)

   1. 사진이 뭉개진다        CS 로 계속 들어오는 문제
   2. 오늘 챙길 것            PLUS 19개가 문 뒤에 숨어 있다
   3. PLUS 한눈에             열아홉 개를 보여줄 자리가 없다

   ── 1. 사진 ──
   높이가 220px 로 고정돼 있고 object-fit:cover 라 세로 사진은 위아래가 크게 잘린다.
   그런데 얼굴 위치는 사진마다 다르다. 하나의 값으로는 절대 못 맞춘다.

   \u26a0\ufe0f 사진을 다시 자르지 않는다. 원본은 그대로 두고
      '어디를 보여줄지(object-position)' 만 저장한다.
      용량도 안 늘고 화질도 안 깎인다.

   ── 2. 오늘 챙길 것 ──
   큐레이터 다섯 곳에 PLUS 19개를 만들어뒀는데 전부 '부모가 먼저 열어야' 보인다.
   새벽 세 시에 애 안고 있는 사람이 "젖꼭지 갈 때 됐나" 하고 앱을 열 리가 없다.
   그래서 홈에서 모아 보여준다. 날짜는 각 모듈이 이미 세고 있어서 읽기만 하면 된다.

   \u26a0\ufe0f 없는 걸 지어내지 않는다. 기록이 없으면 그 줄은 안 뜬다.
   \u26a0\ufe0f 건강\u00b7안전으로 겁주지 않는다. 담담하게 '볼 때가 됐어요' 까지다.

   index.html 에서 home.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var POS_KEY = "tosil_hero_pos";       // 사진 세로 위치 (%)
    var BLUE = "#3182F6", GRAY = "#8B95A1", DARK = "#191F28";
    var GOLD = "#8A6D00", RED = "#E32636";

    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }
    function babyName() { return localStorage.getItem("tosil_babyName") || "우리 아기"; }
    function nm(j) {
        try { if (typeof window.babyNm === "function") return window.babyNm(j); } catch (e) {}
        var n = babyName(), c = n.charCodeAt(n.length - 1);
        var jong = (c >= 0xAC00 && c <= 0xD7A3) && ((c - 0xAC00) % 28 !== 0);
        return n + (jong ? "이" : "") + (j || "");
    }
    function isPlus() {
        try { if (typeof window.isPremiumUser === "function") return !!window.isPremiumUser(); } catch (e) {}
        if (!localStorage.getItem("firebase_uid")) return false;
        return localStorage.getItem("tosil_is_founder") === "true"
            || localStorage.getItem("tosil_plan_cache") === "premium"
            || localStorage.getItem("tosil_is_master") === "true";
    }
    function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function getJSON(k, d) {
        try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; }
        catch (e) { return d; }
    }
    function daysSince(k) {
        if (!k) return null;
        var p = String(k).split("-").map(Number);
        if (p.length < 3) return null;
        var d = new Date(p[0], p[1] - 1, p[2]); d.setHours(0, 0, 0, 0);
        var t = new Date(); t.setHours(0, 0, 0, 0);
        var n = Math.floor((t - d) / 86400000);
        return isNaN(n) ? null : n;
    }
    function monthsOld() {
        var s = get("tosil_startDate");
        if (!s) return null;
        var p = String(s).split("-").map(Number);
        if (p.length !== 3) return null;
        var b = new Date(p[0], p[1] - 1, p[2]), t = new Date();
        var m = (t.getFullYear() - b.getFullYear()) * 12 + (t.getMonth() - b.getMonth());
        if (t.getDate() < b.getDate()) m--;
        return m < 0 ? 0 : m;
    }

    /* ==========================================================
       1. 사진 위치 맞추기
       ---------------------------------------------------------- */

    function heroImg() { return document.querySelector(".home-hero-img"); }
    function heroCard() { return document.getElementById("baby-dashboard"); }

    function applyPos() {
        var img = heroImg();
        if (!img) return;
        var y = Number(get(POS_KEY));
        if (!(y >= 0 && y <= 100)) y = 30;
        img.style.objectPosition = "center " + y + "%";
    }
    window.refreshHeroPos = applyPos;

    /* 카드를 위아래로 끌면 보이는 지점이 바뀐다.
       \u26a0\ufe0f 원본은 안 건드린다. 보는 위치만 저장한다. */
    function makeDraggable() {
        var card = heroCard(), img = heroImg();
        if (!card || !img || card.getAttribute("data-drag")) return;
        card.setAttribute("data-drag", "1");

        var startY = 0, startPos = 30, moved = false, dragging = false;

        var cur = function () {
            var y = Number(get(POS_KEY));
            return (y >= 0 && y <= 100) ? y : 30;
        };
        var begin = function (y) {
            dragging = true; moved = false; startY = y; startPos = cur();
            card.style.cursor = "grabbing";
        };
        var move = function (y) {
            if (!dragging) return;
            var dy = y - startY;
            if (Math.abs(dy) > 4) moved = true;
            /* 카드 높이의 절반을 끌면 0~100% 를 다 훑는다 */
            var next = Math.max(0, Math.min(100, startPos - (dy / (card.offsetHeight || 220)) * 100));
            img.style.objectPosition = "center " + Math.round(next) + "%";
        };
        var end = function () {
            if (!dragging) return;
            dragging = false;
            card.style.cursor = "pointer";
            if (!moved) return;
            var m = (img.style.objectPosition || "").match(/(\d+)%/);
            if (m) { try { localStorage.setItem(POS_KEY, m[1]); } catch (e) {} }
            hint("위치를 저장했어요");
        };

        card.addEventListener("touchstart", function (e) {
            if (e.touches && e.touches[0]) begin(e.touches[0].clientY);
        }, { passive: true });
        card.addEventListener("touchmove", function (e) {
            if (e.touches && e.touches[0]) { move(e.touches[0].clientY); if (moved) e.preventDefault(); }
        }, { passive: false });
        card.addEventListener("touchend", end);

        card.addEventListener("mousedown", function (e) { begin(e.clientY); });
        document.addEventListener("mousemove", function (e) { move(e.clientY); });
        document.addEventListener("mouseup", end);

        /* \u26a0\ufe0f 끌고 나서 손을 떼면 원래 onclick(사진 바꾸기)이 같이 터진다.
              끈 경우에는 막는다. 안 그러면 위치만 맞추려다 파일 선택창이 뜬다. */
        card.addEventListener("click", function (e) {
            if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; }
        }, true);
    }

    function hint(msg) {
        var old = document.getElementById("hero-hint");
        if (old) old.remove();
        var d = document.createElement("div");
        d.id = "hero-hint";
        d.textContent = msg;
        d.style.cssText =
            "position:fixed; left:50%; bottom:90px; transform:translateX(-50%); z-index:99999; " +
            "background:rgba(25,31,40,0.92); color:#FFFFFF; padding:11px 18px; border-radius:22px; " +
            "font-size:13px; font-weight:800; pointer-events:none;";
        document.body.appendChild(d);
        setTimeout(function () { if (d.parentNode) d.remove(); }, 1600);
    }

    /* 사진 칸을 키우고, 끌 수 있다는 걸 알려준다 */
    function growHero() {
        var card = heroCard();
        if (!card || card.getAttribute("data-grown")) return;
        card.setAttribute("data-grown", "1");
        /* \u26a0\ufe0f 높이는 index.html 의 CSS 가 정한다.
              여기서 또 정하면 두 값이 부딪혀서 어느 쪽이 이길지 헷갈린다.
              한 군데서만 고치면 되게 CSS 에 맡긴다. */

        if (document.getElementById("hero-drag-tip")) return;
        var tip = document.createElement("div");
        tip.id = "hero-drag-tip";
        tip.innerHTML = "\u2195\uFE0E 위아래로 끌면 얼굴 위치를 맞출 수 있어요";
        tip.style.cssText =
            "position:absolute; left:0; right:0; bottom:0; padding:9px 14px; " +
            "background:linear-gradient(to top, rgba(0,0,0,0.45), rgba(0,0,0,0)); " +
            "color:rgba(255,255,255,0.92); font-size:11.5px; font-weight:700; text-align:center; " +
            "pointer-events:none;";
        card.appendChild(tip);
        /* 한 번 맞춰본 사람에게는 안 띄운다 */
        if (get(POS_KEY)) tip.style.display = "none";
    }

    /* ==========================================================
       2. 오늘 챙길 것 — 다섯 큐레이터에서 모은다
       ---------------------------------------------------------- */

    var TODO = [];

    function push(icon, text, sub, href, urgent) {
        TODO.push({ icon: icon, text: text, sub: sub || "", href: href, urgent: !!urgent });
    }

    function collect() {
        TODO = [];

        /* ── 젖병 : 소모품 ── */
        var PARTS = [
            { id: "nipple", label: "젖꼭지", days: 60, key: "tosil_nipple_changed" },
            { id: "paci", label: "쪽쪽이", days: 45 },
            { id: "brush", label: "젖병솔", days: 30 },
            { id: "straw", label: "빨대컵 빨대", days: 60 },
            { id: "gasket", label: "빨대컵 패킹", days: 90 }
        ];
        var parts = getJSON("tosil_bottle_parts", {});
        PARTS.forEach(function (p) {
            var d = p.key ? get(p.key) : parts[p.id];
            var n = daysSince(d);
            if (n === null) return;                       // 안 적었으면 말 안 한다
            if (n < p.days) return;
            push("\uD83C\uDF7C", p.label + " 볼 때가 됐어요", n + "일 지났어요",
                 "bottle/index.html");
        });

        /* ── 젖병 : 모유 재고 ── */
        var stock = getJSON("tosil_milk_stock", []);
        if (Array.isArray(stock) && stock.length) {
            var LIM = { fridge: 3, freeze: 90, thaw: 1 };
            var soon = 0, over = 0;
            stock.forEach(function (r) {
                var base = (r.place === "thaw") ? (r.thawAt || r.at) : r.at;
                var left = (LIM[r.place] || 3) - (daysSince(base) || 0);
                if (left < 0) over += (r.n || 1);
                else if (left === 0) soon += (r.n || 1);
            });
            if (over) push("\uD83E\uDDCA", "기한이 지난 모유 " + over + "팩",
                           "열어서 냄새를 맡아보세요", "bottle/index.html", true);
            else if (soon) push("\uD83E\uDDCA", "오늘까지인 모유 " + soon + "팩",
                                "먼저 쓰시면 좋아요", "bottle/index.html");
        }

        /* ── 카시트 : 어깨끈 ── */
        var cs = getJSON("tosil_carseat_own", {});
        if (cs.harnessAt) {
            var hd = daysSince(cs.harnessAt);
            if (hd !== null && hd >= 60) {
                var grew = (cs.harnessH && cs.height) ? (cs.height - Number(cs.harnessH)) : null;
                if (grew !== null && (grew <= 0 || grew > Math.max(4, hd * 0.15))) grew = null;
                push("\uD83D\uDE98", "카시트 어깨끈 높이",
                     (grew ? "그동안 " + grew + "cm 자랐어요" : hd + "일 지났어요"),
                     "carseat/index.html");
            }
        }
        /* ── 카시트 : 유효기간 ── */
        if (cs.expireAt) {
            var p2 = String(cs.expireAt).split("-");
            var ed = new Date(Number(p2[0]), Number(p2[1]) - 1, 1);
            var dl = Math.round((ed - new Date()) / 86400000);
            if (dl <= 180) {
                push("\uD83D\uDE98", dl > 0 ? "카시트 유효기간 D-" + dl : "카시트 유효기간이 지났어요",
                     dl > 0 ? "슬슬 다음 것을 보셔도 돼요" : "쓰지 마시고 중고로도 팔지 마세요",
                     "carseat/index.html", dl <= 0);
            }
        }

        /* ── 유모차 : 관리 ── */
        var st = getJSON("tosil_stroller_own", {});
        var CARE = [["brake", "브레이크", 30], ["wheel", "바퀴", 30],
                    ["seat", "시트 세탁", 90], ["belt", "안전벨트", 60]];
        var care = st.care || {};
        CARE.forEach(function (c) {
            var n = daysSince(care[c[0]]);
            if (n === null || n < c[2]) return;
            push("\uD83D\uDEBC", "유모차 " + c[1] + " 볼 때가 됐어요", n + "일 지났어요",
                 "stroller/index.html");
        });

        /* ── 장난감 : 이번 주 처방전이 지난주 것 ── */
        var wk = getJSON("tosil_playweek", null);
        if (wk && wk.at) {
            var wd = Math.floor((Date.now() - Number(wk.at)) / 86400000);
            if (wd >= 7) push("\uD83E\uDDF8", "이번 주 놀이를 다시 짤 때예요",
                              "지난주에 짠 거예요", "toy/index.html");
        }

        /* ── 이유식 : 생우유 ── */
        var m = monthsOld();
        if (m !== null && m === 12) {
            push("\uD83E\uDD5B", "이제 생우유를 시작하셔도 되는 때예요",
                 "한 번에 바꾸지 말고 천천히", "bottle/index.html");
        }

        return TODO;
    }

    function todoHTML() {
        var list = collect();
        if (!list.length) return "";

        var plus = isPlus();
        var show = plus ? list.slice(0, 6) : list.slice(0, 1);
        var hidden = list.length - show.length;

        return '<div id="home-todo" style="background: #FFFFFF; border:1px solid #F2F5F8; ' +
            'border-radius:20px; padding:18px; margin-bottom:20px; ' +
            'box-shadow:0 4px 16px rgba(0,0,0,0.04);">' +

            '<div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">' +
                '<div style="font-size:15px; font-weight:900; color:' + DARK + ';">오늘 챙길 것</div>' +
                '<div style="font-size:12.5px; font-weight:900; color:' + BLUE + ';">' + list.length + '</div>' +
            '</div>' +
            '<div style="font-size:11.5px; font-weight:600; color:' + GRAY + '; ' +
                'line-height:1.6; margin-bottom:12px;">' +
                '다섯 큐레이터에서 모았어요. 급한 건 아니에요.</div>' +

            show.map(function (x) {
                return '<div onclick="location.href=\'' + x.href + '\'" ' +
                    'style="display:flex; align-items:center; gap:11px; padding:12px 0; ' +
                    'border-bottom:1px solid #F2F4F6; cursor:pointer;">' +
                    '<div style="flex-shrink:0; font-size:17px;">' + x.icon + '</div>' +
                    '<div style="flex:1; min-width:0;">' +
                        '<div style="font-size:13.5px; font-weight:800; color:' +
                            (x.urgent ? RED : DARK) + '; word-break:keep-all;">' + esc(x.text) + '</div>' +
                        (x.sub ? '<div style="margin-top:2px; font-size:11.5px; font-weight:700; ' +
                                 'color:' + GRAY + ';">' + esc(x.sub) + '</div>' : '') +
                    '</div>' +
                    '<div style="flex-shrink:0; font-size:12px; color:#C4CAD2;">\u3009</div>' +
                '</div>';
            }).join("") +

            (hidden > 0
                ? (plus
                    ? '<div style="padding-top:11px; font-size:11.5px; font-weight:700; ' +
                      'color:' + GRAY + ';">외 ' + hidden + '개</div>'
                    : '<div style="margin-top:12px; background:#FFF9E6; border:1px solid #F5E1A4; ' +
                      'border-radius:13px; padding:14px 15px;">' +
                      '<div style="font-size:12.5px; font-weight:900; color:' + GOLD + ';">' +
                          '나머지 ' + hidden + '개는 PLUS에서 보여요</div>' +
                      '<div style="margin-top:4px; font-size:11.5px; font-weight:600; color:' + GOLD + '; ' +
                          'line-height:1.7; word-break:keep-all;">' +
                          '젖꼭지\\u00b7어깨끈\\u00b7모유 기한을 <b>대신 세어드립니다.</b> ' +
                          '기억하고 계실 필요가 없어요.</div></div>')
                : '') +
        '</div>';
    }

    /* ==========================================================
       3. PLUS 한눈에
       ---------------------------------------------------------- */

    var PLUS_LIST = [
        ["\uD83E\uDD5A", "이유식", "7일 식단표 · 장보기 목록 · 영양 리포트"],
        ["\uD83E\uDDF8", "놀이·장난감", "이번 주 놀이 · 잠자는 장난감 · 선물 목록"],
        ["\uD83C\uDF7C", "수유·젖병", "젖병 거부 · 모유 재고 · 소모품 · 컵 로드맵"],
        ["\uD83D\uDE98", "카시트", "우리 카시트 · 울 때 · 여행 계획"],
        ["\uD83D\uDEBC", "유모차", "드는 무게 · 안 타려고 할 때 · 관리"]
    ];

    function plusHTML() {
        if (isPlus()) return "";        // 이미 쓰시는 분께는 안 판다

        return '<div id="home-plus" style="background:#191F28; border-radius:20px; ' +
            'padding:20px 18px; margin-bottom:20px;">' +
            '<div style="display:flex; align-items:center; gap:7px; margin-bottom:5px;">' +
                '<span style="padding:3px 8px; border-radius:6px; background:#FFF9E6; ' +
                    'color:' + GOLD + '; font-size:10.5px; font-weight:900;">PLUS</span>' +
                '<span style="font-size:15px; font-weight:900; color:#FFFFFF;">' +
                    '큐레이터 다섯 곳이 같이 열려요</span>' +
            '</div>' +
            '<div style="font-size:12px; font-weight:600; color:rgba(255,255,255,0.6); ' +
                'line-height:1.6; margin-bottom:14px; word-break:keep-all;">' +
                '고르는 건 원래 무료예요. PLUS는 <b style="color:rgba(255,255,255,0.85);">' +
                '대신 세고 대신 짜드리는 것</b>입니다.</div>' +

            PLUS_LIST.map(function (x) {
                return '<div style="display:flex; gap:10px; padding:9px 0; ' +
                    'border-bottom:1px solid rgba(255,255,255,0.08);">' +
                    '<div style="flex-shrink:0; font-size:14px;">' + x[0] + '</div>' +
                    '<div style="flex:1; min-width:0;">' +
                        '<div style="font-size:12.5px; font-weight:900; color:#FFFFFF;">' + x[1] + '</div>' +
                        '<div style="margin-top:1px; font-size:11px; font-weight:600; ' +
                            'color:rgba(255,255,255,0.55); word-break:keep-all;">' + x[2] + '</div>' +
                    '</div>' +
                '</div>';
            }).join("") +

            '<div onclick="window.openPremiumModal && window.openPremiumModal()" ' +
                'style="margin-top:15px; text-align:center; padding:15px; background:#FFFFFF; ' +
                'color:#191F28; border-radius:13px; font-size:14px; font-weight:900; cursor:pointer;">' +
                'PLUS 둘러보기</div>' +
        '</div>';
    }

    /* ==========================================================
       붙이기
       ---------------------------------------------------------- */

    function paint() {
        var host = document.getElementById("tab-home");
        if (!host) return;

        applyPos(); growHero(); makeDraggable();

        var anchor = document.getElementById("now-status-card") ||
                     document.getElementById("home-expiry-alert");

        /* 오늘 챙길 것 — 사진 바로 아래 */
        var todo = todoHTML();
        var old = document.getElementById("home-todo");
        if (old) old.remove();
        if (todo && anchor && anchor.parentNode) {
            var box = document.createElement("div");
            box.innerHTML = todo;
            anchor.parentNode.insertBefore(box.firstChild, anchor);
        }

        /* PLUS 안내 — 아래쪽, 닫는 인상이 되지 않게 */
        var ph = plusHTML();
        var oldp = document.getElementById("home-plus");
        if (oldp) oldp.remove();
        if (ph) {
            var tail = document.getElementById("routine-checklist-container") ||
                       host.lastElementChild;
            var box2 = document.createElement("div");
            box2.innerHTML = ph;
            if (tail && tail.parentNode) tail.parentNode.insertBefore(box2.firstChild, tail);
        }
    }
    window.refreshHomeFix = paint;

    function boot() {
        paint();
        var t = 0;
        var again = setInterval(function () {
            paint();
            if (++t > 20) clearInterval(again);
        }, 300);

        ["switchCuratorBaby", "renderHome", "renderAll"].forEach(function (n) {
            var f = window[n];
            if (typeof f !== "function" || f.__hf) return;
            var w = function () { var r = f.apply(this, arguments); setTimeout(paint, 120); return r; };
            w.__hf = true;
            window[n] = w;
        });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    window.homeFixDebug = function () {
        console.log("PLUS:", isPlus(), "\u00b7 사진 위치:", get(POS_KEY) || "기본 30%");
        var l = collect();
        console.log("오늘 챙길 것:", l.length + "개");
        l.forEach(function (x) { console.log("   " + x.icon + " " + x.text + "  \u00b7 " + x.sub); });
        console.log("사진 칸:", (heroCard() || {}).offsetHeight + "px");
        console.log("붙었나 \u2014 오늘 챙길 것:", !!document.getElementById("home-todo"),
                    "\u00b7 PLUS 안내:", !!document.getElementById("home-plus"));
    };
})();