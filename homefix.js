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
    var BLUE = "#7F77DD", GRAY = "#8B95A1", DARK = "#191F28";
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

    /* ⚠️ 위치를 숫자 하나로만 저장해서, 사진을 바꿔도 예전 사진에 맞춘 위치가 그대로 적용됐다.
          새 사진의 얼굴이 엉뚱하게 잘렸다. 어느 사진에 맞춘 위치인지 같이 적는다.
          (아기마다 따로 — script.js 의 BABY_SPECIFIC_KEYS 에 tosil_hero_pos 를 넣었다) */
    function srcOf(img) { return (img && (img.getAttribute("src") || "")) || ""; }
    function savedPos(img) {
        var raw = get(POS_KEY);
        if (raw == null || raw === "") return null;
        var o = null;
        try { o = JSON.parse(raw); } catch (e) {}
        if (typeof o === "number") return (o >= 0 && o <= 100) ? o : null;       // 예전 방식 (숫자만)
        if (!o || typeof o !== "object") return null;
        if (o.src && img && o.src !== srcOf(img)) return null;                     // 다른 사진에 맞춘 위치
        var y = Number(o.y);
        return (y >= 0 && y <= 100) ? y : null;
    }
    function storePos(img, y) {
        try { localStorage.setItem(POS_KEY, JSON.stringify({ y: y, src: srcOf(img) })); } catch (e) {}
    }

    function applyPos() {
        var img = heroImg();
        if (!img) return;
        var y = savedPos(img);
        if (y === null) y = 30;
        img.style.objectPosition = "center " + y + "%";
    }
    window.refreshHeroPos = applyPos;

    /* 카드를 위아래로 끌면 보이는 지점이 바뀐다.
       \u26a0\ufe0f 원본은 안 건드린다. 보는 위치만 저장한다. */
    /* ⚠️ 카드 위에서 손가락을 조금만 움직여도 사진 위치가 바뀌었다.
          홈에서 제일 큰 게 이 사진 카드라, 화면을 내리려고 사진 위를 쓸면
          스크롤은 안 되고 얼굴 위치만 움직이고 '위치를 저장했어요' 가 떴다.
          길게 눌렀을 때(0.35초)만 맞추기 모드로 들어간다. 그냥 쓸면 스크롤이다. */
    function makeDraggable() {
        var card = heroCard(), img = heroImg();
        if (!card || !img || card.getAttribute("data-drag")) return;
        card.setAttribute("data-drag", "1");
        try { img.setAttribute("draggable", "false"); } catch (e) {}

        var startY = 0, startX = 0, startPos = 30, moved = false, dragging = false;
        var armed = false, holdTimer = null, HOLD_MS = 350;

        var cur = function () {
            var y = savedPos(img);
            return (y === null) ? 30 : y;
        };
        var begin = function (y) {
            dragging = true; moved = false; startY = y; startPos = cur();
            card.style.cursor = "grabbing";
        };
        var move = function (y) {
            if (!dragging) return;
            var dy = y - startY;
            if (Math.abs(dy) > 4) moved = true;
            /* 카드 높이만큼 끌면 0~100% 를 다 훑는다 */
            var next = Math.max(0, Math.min(100, startPos - (dy / (card.offsetHeight || 220)) * 100));
            img.style.objectPosition = "center " + Math.round(next) + "%";
        };
        var end = function () {
            if (!dragging) return;
            dragging = false;
            card.style.cursor = "pointer";
            if (!moved) return;
            var m = (img.style.objectPosition || "").match(/(\d+)%/);
            if (m) storePos(img, Number(m[1]));
            var tip = document.getElementById("hero-drag-tip");
            if (tip) tip.style.display = "none";
            hint("위치를 저장했어요");
        };

        card.addEventListener("touchstart", function (e) {
            var t = e.touches && e.touches[0];
            if (!t) return;
            startX = t.clientX; startY = t.clientY; armed = false;
            clearTimeout(holdTimer);
            holdTimer = setTimeout(function () {
                holdTimer = null;
                armed = true;
                begin(startY);
                moved = true;                 // 손을 떼도 사진 바꾸기 창이 안 뜨게
                card.classList.add("hero-armed");
                if (navigator.vibrate) { try { navigator.vibrate(12); } catch (e2) {} }
                hint("위아래로 움직여 얼굴을 맞춰보세요");
            }, HOLD_MS);
        }, { passive: true });

        card.addEventListener("touchmove", function (e) {
            var t = e.touches && e.touches[0];
            if (!t) return;
            if (!armed) {
                // 길게 누르기 전에 움직이면 그냥 스크롤이다
                if (holdTimer && (Math.abs(t.clientY - startY) > 8 || Math.abs(t.clientX - startX) > 8)) {
                    clearTimeout(holdTimer); holdTimer = null;
                }
                return;
            }
            move(t.clientY);
            e.preventDefault();
        }, { passive: false });

        var finish = function () {
            if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
            if (!armed) return;
            armed = false;
            card.classList.remove("hero-armed");
            end();
        };
        card.addEventListener("touchend", finish);
        card.addEventListener("touchcancel", finish);

        // 길게 누르면 뜨는 '이미지 저장' 메뉴는 여기선 필요 없다
        card.addEventListener("contextmenu", function (e) { e.preventDefault(); });

        // 컴퓨터에서는 마우스로 바로 끈다 (스크롤과 안 겹친다)
        card.addEventListener("mousedown", function (e) { begin(e.clientY); });
        document.addEventListener("mousemove", function (e) { move(e.clientY); });
        document.addEventListener("mouseup", end);

        /* \u26a0\ufe0f 끌고 나서 손을 떼면 원래 onclick(사진 바꾸기)이 같이 터진다.
              끈 경우 · 길게 누른 경우에는 막는다. 안 그러면 위치만 맞추려다 파일 선택창이 뜬다. */
        card.addEventListener("click", function (e) {
            if (moved) {
                e.stopImmediatePropagation(); e.stopPropagation(); e.preventDefault();
                moved = false;
            }
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
        tip.innerHTML = "\u2195\uFE0E 사진을 길게 누른 채 움직이면 얼굴 위치를 맞출 수 있어요";
        tip.style.cssText =
            "position:absolute; left:0; right:0; bottom:0; padding:9px 14px; " +
            "background:linear-gradient(to top, rgba(0,0,0,0.45), rgba(0,0,0,0)); " +
            "color:rgba(255,255,255,0.92); font-size:11.5px; font-weight:700; text-align:center; " +
            "pointer-events:none;";
        card.appendChild(tip);
        /* 이 사진을 한 번 맞춰본 사람에게는 안 띄운다 */
        if (savedPos(heroImg()) !== null) tip.style.display = "none";

        if (!document.getElementById("hero-drag-css")) {
            var st = document.createElement("style");
            st.id = "hero-drag-css";
            st.textContent =
                "#baby-dashboard{-webkit-touch-callout:none;-webkit-user-select:none;user-select:none;}" +
                "#baby-dashboard img{-webkit-user-drag:none;}" +
                "#baby-dashboard.hero-armed{transform:scale(.985);transition:transform .15s ease;" +
                    "box-shadow:0 0 0 3px rgba(127,119,221,.55) !important;}";
            document.head.appendChild(st);
        }
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
                          '젖꼭지 · 어깨끈 · 모유 기한을 <b>대신 세어드립니다.</b> ' +
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

        /* \u26a0\ufe0f #191F28 은 차가운 남색이라 이 앱의 따뜻한 배경과 안 어울린다.
              premium.js 가 쓰는 rgba(35,29,24) 와 같은 갈색 계열로 맞춘다. */
        return '<div id="home-plus" style="background:#2A231D; border-radius:20px; ' +
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

            /* \u26a0\ufe0f 이름을 또 짐작해서 썼다가 또 안 눌렸다.
                  openUpsell 도 startPremium 도 어느 파일에도 없다.
                  실제로 있는 건 script.js 의 showPaywall 하나뿐이다.
                  이제 창구(window.openPlus)를 거친다. 이름을 여기서 짐작하지 않는다. */
            '<div onclick="window.openPlus && window.openPlus(\'curator\')" ' +
                'style="margin-top:15px; text-align:center; padding:15px; background:#FFFFFF; ' +
                'color:#191F28; border-radius:13px; font-size:14px; font-weight:900; cursor:pointer;">' +
                'PLUS 둘러보기</div>' +
        '</div>';
    }

    /* ==========================================================
       4. 돌봄 도우미 화면의 '엄마에게 / 아빠에게 전화'
       ----------------------------------------------------------
       ⚠️ index.html 에 010-0000-0000 이 박혀 있었다.
          할머니·시터가 급할 때 누르면 없는 번호로 걸렸다.
          엄마·아빠 폰의 설정에서 번호를 넣으면 가족 보관함(settings_코드 / family_names)에
          올라가고, 도우미 폰은 거기서 받아서 건다. 번호가 없으면 걸지 않고 알려준다.
       ---------------------------------------------------------- */

    var PHONE_KEY = "tosil_parent_phones";
    function phones() { var o = getJSON(PHONE_KEY, {}); return (o && typeof o === "object") ? o : {}; }
    function cleanPhone(v) {
        var t = String(v || "").replace(/[^\d+]/g, "");
        return /^\+?\d{9,13}$/.test(t) ? t : "";
    }
    function prettyPhone(t) { return String(t || "").replace(/^(\d{3})(\d{3,4})(\d{4})$/, "$1-$2-$3"); }

    function familyRef() {
        var code = get("family_sync_code");
        if (!code || !window.db || typeof window.doc !== "function") return null;
        return window.doc(window.db, "settings_" + code, "family_names");
    }

    var phonesPulledAt = 0;
    function pullPhones() {
        if (Date.now() - phonesPulledAt < 60000) return;
        phonesPulledAt = Date.now();
        var ref = familyRef();
        if (!ref || typeof window.getDoc !== "function") return;
        window.getDoc(ref).then(function (snap) {
            if (!snap || !snap.exists()) return;
            var d = snap.data() || {}, o = phones(), changed = false;
            ["mom", "dad"].forEach(function (k) {
                var v = cleanPhone(d[k + "Phone"]);
                if (v && v !== o[k]) { o[k] = v; changed = true; }
            });
            if (changed) {
                try { localStorage.setItem(PHONE_KEY, JSON.stringify(o)); } catch (e) {}
                paintSeniorCalls();
            }
        }).catch(function () {});
    }

    function paintSeniorCalls() {
        var block = document.querySelector(".show-on-senior-block");
        if (!block) return;
        var links = block.querySelectorAll('a[href^="tel:"], a[data-parent-call]');
        var o = phones();
        for (var i = 0; i < links.length; i++) {
            var a = links[i];
            var txt = a.textContent || "";
            var who = txt.indexOf("엄마") > -1 ? "mom" : (txt.indexOf("아빠") > -1 ? "dad" : null);
            if (!who) continue;
            a.setAttribute("data-parent-call", who);
            var num = o[who];
            if (num) {
                a.setAttribute("href", "tel:" + num);
                a.onclick = null;
                a.style.opacity = "";
            } else {
                a.setAttribute("href", "#");
                a.style.opacity = "0.55";
                a.onclick = (function (w) {
                    return function (e) {
                        e.preventDefault();
                        hint((w === "mom" ? "엄마" : "아빠") + " 번호가 아직 없어요 · 엄마·아빠 폰의 설정에서 넣을 수 있어요");
                    };
                })(who);
            }
        }
        // 도우미 폰이면 가족 보관함에서 최신 번호를 받아온다 (1분에 한 번)
        if (document.body && document.body.classList.contains("mode-senior")) pullPhones();
    }

    function phoneCardHTML() {
        var o = phones();
        var input = function (k, label) {
            return '<div style="flex:1; min-width:0;">' +
                '<div style="font-size:11.5px; font-weight:800; color:var(--text-sub); margin-bottom:6px;">' + label + '</div>' +
                '<input id="pp-' + k + '" type="tel" inputmode="tel" autocomplete="tel" placeholder="010-1234-5678" ' +
                    'value="' + esc(o[k] ? prettyPhone(o[k]) : "") + '" ' +
                    'style="width:100%; box-sizing:border-box; padding:12px; border-radius:12px; border:1px solid var(--border); ' +
                    'background:var(--bg-sub); font-size:14px; font-weight:700; color:var(--text-m); outline:none;">' +
            '</div>';
        };
        return '<div style="font-size:15px; font-weight:900; color:var(--text-m);">📞 도우미가 걸 번호</div>' +
            '<div style="font-size:12px; font-weight:600; color:var(--text-sub); margin:4px 0 14px; line-height:1.6; word-break:keep-all;">' +
                '할머니·시터 화면의 \'엄마에게 전화 / 아빠에게 전화\' 가 이 번호로 걸려요. 우리 가족에게만 보여요.</div>' +
            '<div style="display:flex; gap:8px;">' + input("mom", "엄마") + input("dad", "아빠") + '</div>' +
            '<div onclick="window.saveParentPhones()" style="margin-top:12px; text-align:center; padding:13px; background:#7F77DD; ' +
                'color:#FFF; border-radius:12px; font-size:14px; font-weight:800; cursor:pointer;">저장하기</div>';
    }

    window.refreshSeniorCalls = paintSeniorCalls;

    window.saveParentPhones = function () {
        var o = phones(), bad = false;
        ["mom", "dad"].forEach(function (k) {
            var el = document.getElementById("pp-" + k);
            if (!el) return;
            var raw = String(el.value || "").trim();
            if (!raw) { delete o[k]; return; }
            var v = cleanPhone(raw);
            if (!v) { bad = true; return; }
            o[k] = v;
        });
        if (bad) return hint("번호를 다시 확인해주세요 (숫자 9~13자리)");
        try { localStorage.setItem(PHONE_KEY, JSON.stringify(o)); } catch (e) {}
        var ref = familyRef();
        if (ref && typeof window.setDoc === "function") {
            window.setDoc(ref, { momPhone: o.mom || "", dadPhone: o.dad || "" }, { merge: true })
                .catch(function (e) { console.warn("[도우미 번호] 올리기 실패", e); });
        }
        hint("저장했어요. 도우미 폰에서 바로 걸 수 있어요");
        paintSeniorCalls();
    };

    function hookSettings() {
        var orig = window.renderSettingsTab;
        if (typeof orig !== "function" || orig.__phones) return;
        var w = function () {
            var out = orig.apply(this, arguments);
            try {
                var host = document.getElementById("tab-settings");
                var senior = document.body && document.body.classList.contains("mode-senior");
                if (host && !senior && !document.getElementById("parent-phone-card")) {
                    var card = document.createElement("div");
                    card.id = "parent-phone-card";
                    card.style.cssText = "background:var(--bg-card); padding:18px 20px; border-radius:16px; " +
                        "border:1px solid var(--border); margin-bottom:12px; box-sizing:border-box; width:100%;";
                    card.innerHTML = phoneCardHTML();
                    var after = document.getElementById("push-permission-card");
                    if (after && after.parentNode === host) host.insertBefore(card, after.nextSibling);
                    else host.insertBefore(card, host.firstChild);
                }
            } catch (e) {}
            return out;
        };
        w.__phones = true;
        window.renderSettingsTab = w;
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

        /* ⚠️ 매번 지우고 새로 꽂았다. 그러면 homelayout.js 가 정해둔 자리가 흔들리고
              부팅 6초 동안 카드가 위아래로 튀었다. 있으면 그 자리에서 내용만 바꾼다. */

        /* 오늘 챙길 것 — 기록 버튼 위 */
        var todo = todoHTML();
        var old = document.getElementById("home-todo");
        if (!todo) { if (old) old.remove(); }
        else {
            var box = document.createElement("div");
            box.innerHTML = todo;
            if (old && old.parentNode) old.parentNode.replaceChild(box.firstChild, old);
            else if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(box.firstChild, anchor);
        }

        /* PLUS 안내 — 아래쪽, 닫는 인상이 되지 않게 */
        var ph = plusHTML();
        var oldp = document.getElementById("home-plus");
        if (!ph) { if (oldp) oldp.remove(); }
        else {
            var box2 = document.createElement("div");
            box2.innerHTML = ph;
            if (oldp && oldp.parentNode) oldp.parentNode.replaceChild(box2.firstChild, oldp);
            else {
                var tail = document.getElementById("routine-checklist-container") || host.lastElementChild;
                if (tail && tail.parentNode) tail.parentNode.insertBefore(box2.firstChild, tail);
            }
        }

        paintSeniorCalls();
    }
    window.refreshHomeFix = paint;

    function boot() {
        hookSettings();
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
        console.log("PLUS:", isPlus(), "\u00b7 사진 위치:", savedPos(heroImg()) !== null ? savedPos(heroImg()) + "%" : "기본 30%");
        console.log("도우미 비상 연락처:", JSON.stringify(phones()));
        var l = collect();
        console.log("오늘 챙길 것:", l.length + "개");
        l.forEach(function (x) { console.log("   " + x.icon + " " + x.text + "  \u00b7 " + x.sub); });
        console.log("사진 칸:", (heroCard() || {}).offsetHeight + "px");
        console.log("붙었나 \u2014 오늘 챙길 것:", !!document.getElementById("home-todo"),
                    "\u00b7 PLUS 안내:", !!document.getElementById("home-plus"));
    };
})();