/* ============================================================
   배냇함 PLUS — 우리 유모차 (strollerown.js)

   다른 넷은 아기 얘기다. 유모차만 다르다.
   유모차는 미는 사람의 몸이 망가진다.

   엘리베이터 없는 빌라 3층에 사는 사람은
   13.4kg 짜리를 하루에 네 번 들고 계단을 오른다.
   아기 8kg 을 따로 안고서.

   그런데 아무도 그걸 세어주지 않는다.
   필터에 '손목이나 허리가 아파요' 라는 항목까지 있으면서.

   \u26a0\ufe0f 무게는 지어내지 않는다. 50종에 전부 적혀 있다.
   \u26a0\ufe0f "바꾸세요" 라고 하지 않는다. 숫자만 보여주고 판단은 부모가 한다.
   \u26a0\ufe0f 안 사도 되면 안 사도 된다고 말한다.
      두 번째 유모차를 안 사도 되는 사람에게 파는 건 이 앱이 할 일이 아니다.

   index.html 에서 strollerguide.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var KEY  = "tosil_stroller_own";
    var HOST = "stroller-own";

    var BLUE = "#3182F6", GRAY = "#8B95A1", DARK = "#191F28";
    var RED  = "#E32636", GOLD = "#8A6D00", GREEN = "#1F9D6B", PURPLE = "#7F77DD";

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
    function all() {
        try { if (typeof strollerData !== "undefined" && strollerData) return strollerData; } catch (e) {}
        return window.strollerData || [];
    }
    function byName(n) {
        var a = all();
        for (var i = 0; i < a.length; i++) if (a[i].name === n) return a[i];
        return null;
    }
    function monthsOld() {
        var s = localStorage.getItem("tosil_startDate");
        if (!s) return null;
        var p = String(s).split("-").map(Number);
        if (p.length !== 3) return null;
        var b = new Date(p[0], p[1] - 1, p[2]), t = new Date();
        var m = (t.getFullYear() - b.getFullYear()) * 12 + (t.getMonth() - b.getMonth());
        if (t.getDate() < b.getDate()) m--;
        return m < 0 ? 0 : m;
    }
    function today() {
        var t = new Date();
        return t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") +
               "-" + String(t.getDate()).padStart(2, "0");
    }
    function daysSince(k) {
        if (!k) return null;
        var p = String(k).split("-").map(Number);
        if (p.length !== 3) return null;
        var d = new Date(p[0], p[1] - 1, p[2]); d.setHours(0, 0, 0, 0);
        var t = new Date(); t.setHours(0, 0, 0, 0);
        return Math.floor((t - d) / 86400000);
    }

    function own() {
        try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
    }
    function save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }

    function weightOf(s) {
        return (s && s.specs && Number(s.specs.weight)) || 0;
    }

    /* ---------- 조작 ---------- */

    /* \u26a0\ufe0f 두 대를 쓰는 집이 제일 흔하다. 디럭스 + 휴대용.
          한 대만 받으면 '오늘 뭘 갖고 나갈까' 를 답할 수 없다. */
    window.pickMyStroller = function (n) {
        var o = own();
        var slot = o.slot === 2 ? "name2" : "name";
        o[slot] = (o[slot] === n) ? "" : n;
        save(o); paintSheet(); paint();
    };
    window.setStrollerSlot = function (i) {
        var o = own();
        o.slot = (i === 2) ? 2 : 1;
        save(o); paintSheet();
    };
    window.setStrollerField = function (f, v) {
        var o = own();
        if (f === "floor" || f === "trips") {
            var n = parseInt(v, 10);
            o[f] = (n > 0 && n < 30) ? n : "";
        } else if (f === "lift") {
            o.lift = !o.lift;
        } else o[f] = String(v || "").trim();
        save(o); paint();
    };
    /* \u26a0\ufe0f '오늘 봤어요' 만 있으면 오늘 갈아끼운 사람만 쓸 수 있다.
          3주 전에 갈았으면 적을 방법이 없어서 '아직 안 적으셨어요' 가 영영 안 없어진다.
          날짜를 직접 고를 수 있어야 한다. */
    window.markStrollerCare = function (id, when) {
        var o = own();
        o.care = o.care || {};
        var v = String(when || "").trim();
        if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return;      // 이상한 값은 무시
        if (v && daysSince(v) < 0) return;                      // 미래는 안 받는다
        o.care[id] = v || today();
        save(o); paint();
    };
    window.openStrollerSheet = function () {
        var old = document.getElementById("stroller-sheet");
        if (old) old.remove();
        var w = document.createElement("div");
        w.id = "stroller-sheet";
        w.setAttribute("style", "position:fixed; inset:0; z-index:100030; background: #FFFFFF; " +
            "overflow-y:auto; -webkit-overflow-scrolling:touch;");
        document.body.appendChild(w);
        paintSheet();
    };
    window.closeStrollerSheet = function () {
        var el = document.getElementById("stroller-sheet");
        if (el) el.remove();
        paint();
    };

    function paintSheet() {
        var w = document.getElementById("stroller-sheet");
        if (!w) return;
        var o = own();

        var groups = {};
        all().forEach(function (s) { (groups[s.type] = groups[s.type] || []).push(s); });

        w.innerHTML =
        '<div style="max-width:480px; margin:0 auto; padding:20px 20px 40px;">' +
            '<div style="display:flex; justify-content:space-between; align-items:center;">' +
                '<div style="font-size:18px; font-weight:900; color:' + DARK + ';">\uD83C\uDF7C 쓰고 계신 유모차</div>' +
                '<span onclick="window.closeStrollerSheet()" style="font-size:24px; font-weight:300; ' +
                    'color:' + GRAY + '; cursor:pointer; line-height:1; padding:0 4px;">\u00d7</span>' +
            '</div>' +
            '<div style="margin-top:6px; font-size:13px; font-weight:600; color:' + GRAY + '; ' +
                'line-height:1.7; word-break:keep-all;">' +
                '무게를 알아야 <b>손목에 얼마나 실리는지</b> 세어드릴 수 있어요. ' +
                '두 대 쓰시면 <b>둘 다</b> 알려주세요 \u2014 상황마다 뭘 갖고 나갈지 골라드립니다.</div>' +

            '<div style="display:flex; gap:6px; margin-top:16px;">' +
                [1, 2].map(function (i) {
                    var on = ((o.slot || 1) === i);
                    var cur = i === 1 ? (o.name || o.custom) : (o.name2 || "");
                    return '<div onclick="window.setStrollerSlot(' + i + ')" ' +
                        'style="flex:1; text-align:center; padding:13px 8px; border-radius:12px; ' +
                        'cursor:pointer; font-size:12.5px; font-weight:800; ' +
                        (on ? 'background:' + DARK + '; color:#FFFFFF; border:1px solid ' + DARK + ';'
                            : 'background: #F9FAFB; color:#4E5968; border:1px solid #E5E8EB;') + '">' +
                        (i === 1 ? '첫 번째' : '두 번째 (있으면)') +
                        '<div style="margin-top:3px; font-size:10.5px; font-weight:700; opacity:0.75; ' +
                            'white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' +
                            (cur ? esc(cur) : '없음') + '</div></div>';
                }).join("") +
            '</div>' +

            Object.keys(groups).map(function (t) {
                return '<div style="margin-top:20px;">' +
                    '<div style="font-size:12px; font-weight:900; color:' + GRAY + '; ' +
                        'letter-spacing:1px; margin-bottom:8px;">' + esc(t) + '</div>' +
                    groups[t].map(function (s) {
                        var on = (((o.slot || 1) === 2 ? o.name2 : o.name) === s.name);
                        return '<div onclick="window.pickMyStroller(\'' + esc(s.name).replace(/'/g, "") + '\')" ' +
                            'style="display:flex; justify-content:space-between; align-items:center; gap:10px; ' +
                            'padding:12px 14px; margin-bottom:6px; border-radius:12px; cursor:pointer; ' +
                            (on ? 'background:' + DARK + '; color:#FFFFFF; border:1px solid ' + DARK + ';'
                                : 'background: #F9FAFB; color:#4E5968; border:1px solid #E5E8EB;') + '">' +
                            '<span style="flex:1; min-width:0; font-size:13px; font-weight:800; ' +
                                'word-break:keep-all;">' + (on ? "\u2713 " : "") + esc(s.name) + '</span>' +
                            '<span style="flex-shrink:0; font-size:12px; font-weight:800; opacity:0.8;">' +
                                weightOf(s) + 'kg</span>' +
                        '</div>';
                    }).join("") +
                '</div>';
            }).join("") +

            '<div style="margin-top:22px; font-size:12.5px; font-weight:900; color:' + DARK + '; ' +
                'margin-bottom:7px;">목록에 없나요</div>' +
            '<div style="display:flex; gap:8px;">' +
                '<input value="' + esc(o.custom || "") + '" placeholder="유모차 이름" ' +
                    'onchange="window.setStrollerField(\'custom\', this.value)" ' +
                    'style="flex:1; padding:13px; border-radius:12px; border:1px solid #D1D5DB; ' +
                    'background: #FFFFFF; font-size:13.5px; font-weight:700; box-sizing:border-box;">' +
                '<input type="number" value="' + (o.customW || "") + '" placeholder="kg" ' +
                    'onchange="window.setStrollerField(\'customW\', this.value)" ' +
                    'style="width:76px; padding:13px; border-radius:12px; border:1px solid #D1D5DB; ' +
                    'background: #FFFFFF; font-size:13.5px; font-weight:800; text-align:center; ' +
                    'box-sizing:border-box;">' +
            '</div>' +

            '<div onclick="window.closeStrollerSheet()" style="margin-top:22px; text-align:center; ' +
                'padding:17px; background:' + DARK + '; color:#FFFFFF; border-radius:14px; ' +
                'font-size:15.5px; font-weight:900; cursor:pointer;">다 됐습니다</div>' +
        '</div>';
    }

    /* ==========================================================
       1. 미는 사람 — 하루에 몇 kg 을 드나
       ---------------------------------------------------------- */

    function myWeight(o) {
        var s = byName(o.name);
        if (s) return weightOf(s);
        return Number(o.customW) || 0;
    }
    function myTitle(o) {
        return o.name || o.custom || "";
    }

    /* 50종 중 무게 순위. 무거운 순으로 몇 번째인가. */
    function weightRank(kg) {
        var ws = all().map(weightOf).filter(function (x) { return x > 0; })
                      .sort(function (a, b) { return b - a; });
        if (!ws.length || !kg) return null;
        var r = 1;
        for (var i = 0; i < ws.length; i++) if (ws[i] > kg) r++;
        return { rank: r, total: ws.length };
    }

    /* 같은 종류에서 제일 가벼운 것 */
    function lightestSame(o) {
        var s = byName(o.name);
        if (!s) return null;
        var same = all().filter(function (x) {
            return x.type === s.type && weightOf(x) > 0 && x.name !== s.name;
        }).sort(function (a, b) { return weightOf(a) - weightOf(b); });
        return same[0] || null;
    }

    function liftHTML(o) {
        var kg = myWeight(o);
        if (!kg) return "";

        var floor = Number(o.floor) || 0;
        var trips = Number(o.trips) || 2;          // 하루 외출 횟수 (왕복 아님)
        var lifts = trips * 2;                     // 나갈 때 접고, 들어올 때 펴고
        var totalKg = Math.round(kg * lifts * 10) / 10;
        var rk = weightRank(kg);
        var light = lightestSame(o);

        var out = '<div style="margin-top:16px; background: #F9FAFB; border:1px solid #E5E8EB; ' +
            'border-radius:14px; padding:16px;">' +
            '<div style="font-size:13px; font-weight:900; color:' + DARK + '; margin-bottom:10px;">' +
                '\uD83E\uDDB4 하루에 드시는 무게</div>' +

            '<div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:12px;">' +
                '<span style="font-size:12.5px; font-weight:800; color:#4E5968;">하루 외출</span>' +
                '<input type="number" value="' + trips + '" ' +
                    'onchange="window.setStrollerField(\'trips\', this.value)" ' +
                    'style="width:60px; padding:10px; border-radius:10px; border:1px solid #D1D5DB; ' +
                    'background: #FFFFFF; font-size:13px; font-weight:800; text-align:center; box-sizing:border-box;">' +
                '<span style="font-size:12.5px; font-weight:800; color:#4E5968;">번</span>' +
                '<span style="font-size:12.5px; font-weight:800; color:#4E5968; margin-left:8px;">엘베 없이</span>' +
                '<input type="number" value="' + (floor || "") + '" placeholder="0" ' +
                    'onchange="window.setStrollerField(\'floor\', this.value)" ' +
                    'style="width:60px; padding:10px; border-radius:10px; border:1px solid #D1D5DB; ' +
                    'background: #FFFFFF; font-size:13px; font-weight:800; text-align:center; box-sizing:border-box;">' +
                '<span style="font-size:12.5px; font-weight:800; color:#4E5968;">층</span>' +
            '</div>' +

            '<div style="font-size:13px; font-weight:600; color:#4E5968; line-height:1.85; ' +
                'word-break:keep-all;">' +
                '<b style="font-size:15px; color:' + (totalKg >= 60 ? RED : DARK) + ';">' +
                    kg + 'kg \u00d7 ' + lifts + '번 = ' + totalKg + 'kg</b><br>' +
                '접고 펴는 것만요. 트렁크에 넣고 빼는 건 따로고요.' +
                (floor
                    ? '<br><br>여기에 <b>' + floor + '층 계단</b>이 더해집니다. ' +
                      '아기까지 안고 오르시면 실제로는 이보다 훨씬 무거워요.'
                    : '') +
            '</div>';

        if (rk) {
            var heavy = rk.rank <= Math.ceil(rk.total * 0.3);
            out += '<div style="margin-top:12px; padding-top:12px; border-top:1px solid #E5E8EB; ' +
                'font-size:12.5px; font-weight:600; color:#4E5968; line-height:1.8; word-break:keep-all;">' +
                '50종 중 <b>무거운 쪽에서 ' + rk.rank + '번째</b>예요.' +
                (heavy && light
                    ? ' 같은 ' + esc(byName(o.name).type) + ' 중에 제일 가벼운 건 ' +
                      '<b>' + esc(light.name) + ' ' + weightOf(light) + 'kg</b> 입니다. ' +
                      '바꾸시면 하루 <b>' +
                      Math.round((kg - weightOf(light)) * lifts * 10) / 10 + 'kg</b> 이 줄어요.'
                    : '') +
                '<br><span style="color:' + GRAY + ';">무거운 게 나쁜 건 아니에요. ' +
                '대개 <b>안정감과 맞바꾼 것</b>입니다.</span></div>';
        }

        var s = byName(o.name);
        if (s && s.joint) {
            out += '<div style="margin-top:11px; font-size:12px; font-weight:700; color:' + GOLD + '; ' +
                'line-height:1.7;">\u26A0\uFE0F ' + esc(s.joint) + '</div>';
        }

        /* \u26a0\ufe0f 늘 보이면 카드가 무거워진다. 아플 때만 펴보면 되는 내용이다. */
        out += '<details style="margin-top:13px; background: #FFFFFF; border:1px solid #E5E8EB; ' +
            'border-radius:12px; padding:13px 15px;">' +
            '<summary style="font-size:12.5px; font-weight:800; color:#4E5968; cursor:pointer; ' +
                'list-style:none;">\uD83E\uDDB4 손목\u00b7허리가 아프시면</summary>' +
            '<div style="margin-top:10px; font-size:12.5px; font-weight:600; ' +
            'color:#4E5968; line-height:1.9; word-break:keep-all;">' +
            '\u00b7 접기 전에 <b>아래 바구니 짐부터 빼세요.</b> 그 무게가 그대로 손목에 실립니다<br>' +
            '\u00b7 트렁크에 넣을 땐 <b>무릎을 굽히고 몸에 붙여서.</b> 팔만 뻗으면 허리가 갑니다<br>' +
            '\u00b7 <b>한 손으로 들지 마세요.</b> 손목이 제일 먼저 상합니다<br>' +
            '\u00b7 계단에선 뒷바퀴로 <b>쿵쿵 굴리지 말고</b> 들어 올리세요. 프레임이 상합니다' +
        '</div></details>';

        return out + '</div>';
    }

    /* ==========================================================
       2. 오늘은 뭘 갖고 나갈까 \u2014 두 대 쓰는 집이 매번 하는 고민
       ----------------------------------------------------------
       \u26a0\ufe0f 판단은 숫자로만 한다. weight \u00b7 foldedDims \u00b7 type \u00b7 cabin.
          road \u00b7 trunk \u00b7 flight 는 자유 문장이라 우리가 해석하지 않고
          '제조사/조사 기준' 그대로 근거로만 보여준다.
       ---------------------------------------------------------- */

    var GOING = [
        { id: "walk",   icon: "\uD83D\uDEB6", label: "동네 산책",
          want: "comfort", why: "오래 태우고 다니니 <b>승차감과 등받이</b>가 중요합니다" },
        { id: "mart",   icon: "\uD83D\uDED2", label: "마트 \u00b7 쇼핑",
          want: "comfort", why: "짐이 늘어납니다. <b>아래 바구니가 큰 쪽</b>이 편해요" },
        { id: "metro",  icon: "\uD83D\uDE87", label: "지하철 \u00b7 버스",
          want: "light",  why: "계단과 개찰구가 있습니다. <b>가벼운 쪽</b>이 손목을 지킵니다" },
        { id: "car",    icon: "\uD83D\uDE97", label: "차로 이동",
          want: "small",  why: "트렁크에 넣고 빼야 합니다. <b>접었을 때 작은 쪽</b>이 낫습니다" },
        { id: "eat",    icon: "\uD83C\uDF7D\uFE0F", label: "식당 \u00b7 카페",
          want: "small",  why: "테이블 옆에 세워둡니다. <b>덜 차지하는 쪽</b>이 눈치가 덜 보여요" },
        { id: "trip",   icon: "\u2708\uFE0F", label: "여행 \u00b7 비행기",
          want: "cabin",  why: "기내 반입이 되면 <b>수하물로 안 부쳐도</b> 됩니다" }
    ];

    /* 한 대만 쓰실 때 \u2014 그 한 대의 약한 상황을 미리 알려준다.
       \u26a0\ufe0f "사세요" 라고 하지 않는다. "이럴 땐 이렇게 하세요" 까지다. */
    function soloHTML(o, x) {
        var tips = [];
        if (x.kg >= 10) {
            tips.push(["\uD83D\uDE87 지하철 \u00b7 버스",
                "\u26a0\ufe0f " + x.kg + "kg 이라 <b>계단과 개찰구가 힘듭니다.</b> " +
                "엘리베이터 있는 출구를 미리 찾아두시고, 혼자 들지 마세요."]);
        }
        if (x.cabin.indexOf("\u274c") > -1) {
            tips.push(["\u2708\ufe0f 여행 \u00b7 비행기",
                "<b>기내 반입이 안 됩니다.</b> 게이트에서 부치는 방식이라 " +
                "<b>전용 커버</b>를 챙기세요. 그냥 부치면 프레임이 상합니다."]);
        }
        if (x.vol && x.vol > 180) {
            tips.push(["\uD83D\uDE97 차로 이동",
                "접어도 " + x.dims.join("\u00d7") + "cm 예요. " +
                "<b>내 차 트렁크에 들어가는지</b> 위 필터에서 차종을 골라 확인해보세요."]);
        }
        if (x.type === "휴대용") {
            tips.push(["\uD83D\uDE34 낮잠 시간",
                "휴대용은 <b>등받이가 덜 눕는 것</b>이 많습니다. " +
                "잘 시간에 나가시면 각도를 최대한 눕히고 자주 확인해주세요."]);
        }
        if (!tips.length) return "";

        return '<div style="margin-top:16px; background: #F9FAFB; border:1px solid #E5E8EB; ' +
            'border-radius:14px; padding:16px;">' +
            '<div style="font-size:13px; font-weight:900; color:' + DARK + ';">' +
                '\uD83D\uDEB6 ' + esc(x.name) + ' 로 나가실 때</div>' +
            '<div style="margin-top:4px; margin-bottom:11px; font-size:11.5px; font-weight:600; ' +
                'color:' + GRAY + '; line-height:1.7; word-break:keep-all;">' +
                '한 대로 다 하시니까, <b>힘들어지는 상황만</b> 미리 짚어드릴게요.</div>' +
            tips.map(function (t) {
                return '<div style="padding:11px 0; border-bottom:1px solid #F2F4F6;">' +
                    '<div style="font-size:12.5px; font-weight:900; color:#4E5968;">' + t[0] + '</div>' +
                    '<div style="margin-top:4px; font-size:12px; font-weight:600; color:#4E5968; ' +
                        'line-height:1.75; word-break:keep-all;">' + t[1] + '</div>' +
                '</div>';
            }).join("") +
            '<div style="margin-top:10px; font-size:11.5px; font-weight:600; color:' + GRAY + '; ' +
                'line-height:1.7;">두 대 쓰시면 <b>둘 다 등록</b>해주세요. ' +
                '상황마다 뭘 갖고 나갈지 골라드립니다.</div>' +
        '</div>';
    }

    function goingOf(id) {
        for (var i = 0; i < GOING.length; i++) if (GOING[i].id === id) return GOING[i];
        return null;
    }

    window.pickGoing = function (id) {
        var o = own();
        o.going = (o.going === id) ? "" : id;
        save(o); paint();
    };

    /* 등록한 유모차를 {이름, 무게, 부피, 기내, 종류, 원본} 으로 */
    function fleet(o) {
        var out = [];
        [o.name, o.name2].forEach(function (n) {
            if (!n) return;
            var s = byName(n);
            if (!s) return;
            var d = s.foldedDims || [];
            out.push({
                name: n, kg: weightOf(s), type: s.type,
                vol: d.length === 3 ? (d[0] * d[1] * d[2]) / 1000 : null,   // 리터
                dims: d, cabin: String((s.specs && s.specs.cabin) || ""),
                road: s.road || "", trunk: s.trunk || "", flight: s.flight || "", raw: s
            });
        });
        if (!out.length && o.custom && Number(o.customW)) {
            out.push({ name: o.custom, kg: Number(o.customW), type: "", vol: null,
                       dims: [], cabin: "", road: "", trunk: "", flight: "", raw: null });
        }
        return out;
    }

    function goingHTML(o) {
        var f = fleet(o);

        /* 한 대만 쓰시는 분에게는 '그 한 대로 오늘 나가도 되나' 를 말해준다.
           고를 게 없다고 아무 말도 안 하면 그 분에게는 이 칸이 없는 것과 같다. */
        if (f.length === 1) return soloHTML(o, f[0]);
        if (!f.length) return "";

        var g = goingOf(o.going);

        var out = '<div style="margin-top:16px; background: #F9FAFB; border:1px solid #E5E8EB; ' +
            'border-radius:14px; padding:16px;">' +
            '<div style="font-size:13px; font-weight:900; color:' + DARK + ';">' +
                '\uD83D\uDEB6 오늘은 뭘 갖고 나갈까</div>' +
            '<div style="margin-top:4px; margin-bottom:11px; font-size:11.5px; font-weight:600; ' +
                'color:' + GRAY + '; line-height:1.7; word-break:keep-all;">' +
                '두 대를 두고 매번 고민하시죠. 어디 가시는지만 눌러주세요.</div>' +

            '<div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:7px;">' +
            GOING.map(function (x) {
                var on = (o.going === x.id);
                return '<div onclick="window.pickGoing(\'' + x.id + '\')" ' +
                    'style="padding:12px 6px; border-radius:12px; cursor:pointer; text-align:center; ' +
                    'font-size:11.5px; font-weight:800; line-height:1.35; word-break:keep-all; ' +
                    (on ? 'background:' + DARK + '; color:#FFFFFF; border:1px solid ' + DARK + ';'
                        : 'background: #FFFFFF; color:#4E5968; border:1px solid #E5E8EB;') + '">' +
                    '<div style="font-size:17px; margin-bottom:4px;">' + x.icon + '</div>' +
                    esc(x.label) + '</div>';
            }).join("") + '</div>';

        if (!g) return out + '</div>';

        /* 고르기 \u2014 숫자로만 */
        var pick = null, other = null;
        if (g.want === "light") {
            f.sort(function (a, b) { return a.kg - b.kg; });
        } else if (g.want === "small") {
            f.sort(function (a, b) {
                if (a.vol === null) return 1;
                if (b.vol === null) return -1;
                return a.vol - b.vol;
            });
        } else if (g.want === "cabin") {
            f.sort(function (a, b) {
                var ok = function (x) { return x.cabin.indexOf("\u2b55") > -1 ? 0 : x.cabin.indexOf("\u26a0") > -1 ? 1 : 2; };
                return ok(a) - ok(b) || a.kg - b.kg;
            });
        } else {   // comfort \u2014 무거운 쪽이 대개 서스펜션이 좋다. 다만 단정하지 않는다
            f.sort(function (a, b) { return b.kg - a.kg; });
        }
        pick = f[0]; other = f[1];

        var reason = "";
        if (g.want === "light") reason = pick.kg + "kg \u00b7 " + other.name + "보다 " +
            (Math.round((other.kg - pick.kg) * 10) / 10) + "kg 가볍습니다";
        else if (g.want === "small" && pick.vol && other.vol) reason =
            pick.dims.join("\u00d7") + "cm \u00b7 " + other.name + "보다 부피가 " +
            Math.round((1 - pick.vol / other.vol) * 100) + "% 작습니다";
        else if (g.want === "cabin") reason = pick.cabin || "기내 여부는 항공사마다 다릅니다";
        else reason = pick.kg + "kg \u00b7 " + (pick.road || "승차감 정보 없음");

        out += '<div style="margin-top:14px; background: #FFFFFF; border:1.5px solid #CBE0FF; ' +
            'border-radius:14px; padding:16px;">' +
            '<div style="font-size:11.5px; font-weight:800; color:' + BLUE + '; margin-bottom:5px;">' +
                esc(g.icon + " " + g.label) + ' 이면</div>' +
            '<div style="font-size:16px; font-weight:900; color:#191F28;">' + esc(pick.name) + '</div>' +
            '<div style="margin-top:4px; font-size:12.5px; font-weight:800; color:' + BLUE + ';">' +
                esc(reason) + '</div>' +
            '<div style="margin-top:9px; font-size:12.5px; font-weight:600; color:#4E5968; ' +
                'line-height:1.75; word-break:keep-all;">' + g.why + '</div>';

        /* 고른 쪽의 약점도 같이 말한다. 안 그러면 광고가 된다. */
        var weak = "";
        if (g.want === "light" && pick.type === "휴대용")
            weak = "다만 휴대용은 <b>등받이가 덜 눕는 것</b>이 많아요. 낮잠 시간이면 " +
                   esc(other.name) + " 쪽이 낫습니다.";
        else if (g.want === "small" && pick.kg > other.kg)
            weak = "다만 " + esc(other.name) + "보다 <b>" +
                   (Math.round((pick.kg - other.kg) * 10) / 10) + "kg 무겁습니다.</b> 드는 횟수가 많으면 다시 생각해보세요.";
        else if (g.want === "comfort" && pick.kg > other.kg)
            weak = "다만 <b>" + (Math.round((pick.kg - other.kg) * 10) / 10) +
                   "kg 더 무겁습니다.</b> 계단이 있으면 " + esc(other.name) + " 쪽이 몸이 편해요.";
        else if (g.want === "cabin" && pick.cabin.indexOf("\u26a0") > -1)
            weak = "\u26a0\ufe0f 항공사마다 규정이 다릅니다. <b>타시기 전에 꼭 확인</b>하세요.";

        if (weak) {
            out += '<div style="margin-top:10px; padding-top:10px; border-top:1px solid #F2F4F6; ' +
                'font-size:12px; font-weight:600; color:' + GOLD + '; line-height:1.7; ' +
                'word-break:keep-all;">' + weak + '</div>';
        }

        out += '</div>';

        /* 근거는 조사 기준 그대로 */
        var note = (g.want === "car" || g.want === "small") ? pick.trunk
                 : (g.want === "cabin") ? pick.flight : pick.road;
        if (note) {
            out += '<div style="margin-top:10px; font-size:11.5px; font-weight:600; color:' + GRAY + '; ' +
                'line-height:1.7; word-break:keep-all;">\uD83D\uDCCC 조사 기준 \u00b7 ' + esc(note) + '</div>';
        }

        return out + '</div>';
    }

    /* ==========================================================
       3. 두 번째 유모차 — 안 사도 되면 안 사도 된다고 한다
       ---------------------------------------------------------- */

    function secondHTML(o) {
        var s = byName(o.name);
        var m = monthsOld();
        if (!s || m === null) return "";

        var kg = weightOf(s);
        var t = s.type;

        /* 절충형은 대개 하나로 끝난다. 그걸 안 말해주면 앱이 안 사도 될 걸 판다. */
        if (t === "절충형" && kg <= 9) {
            return '<div style="margin-top:16px; background:#EAF7F1; border:1px solid #A7DFC8; ' +
                'border-radius:14px; padding:15px 16px;">' +
                '<div style="font-size:13px; font-weight:900; color:#1F6F52;">' +
                    '\u2705 두 번째 유모차는 안 사셔도 됩니다</div>' +
                '<div style="margin-top:5px; font-size:12.5px; font-weight:600; color:#4E5968; ' +
                    'line-height:1.8; word-break:keep-all;">' +
                    '쓰고 계신 게 ' + kg + 'kg 절충형이라 <b>휴대용만큼 가볍습니다.</b> ' +
                    '두 대 쓰시는 분들 대부분은 디럭스가 무거워서 그런 거예요.</div>' +
            '</div>';
        }

        /* 디럭스 + 걷기 시작 = 두 번째가 실제로 필요해지는 지점 */
        var need = (t === "디럭스" && kg >= 10 && m >= 10);
        if (!need) {
            if (t === "휴대용" && m < 4) {
                return '<div style="margin-top:16px; background:#FFF2F2; border:1px solid #FCA5A5; ' +
                    'border-radius:14px; padding:15px 16px;">' +
                    '<div style="font-size:13px; font-weight:900; color:' + RED + ';">' +
                        '\u26A0\uFE0F ' + esc(nm("는")) + ' 아직 ' + m + '개월이에요</div>' +
                    '<div style="margin-top:5px; font-size:12.5px; font-weight:600; color:#4E5968; ' +
                        'line-height:1.8; word-break:keep-all;">' +
                        '휴대용은 <b>등받이가 충분히 눕지 않는 것</b>이 많습니다. ' +
                        '목을 못 가누는 시기에는 각도가 서면 고개가 앞으로 꺾여요. ' +
                        '<b>지금 쓰시는 것의 등받이 각도를 설명서에서 확인</b>해보세요.</div>' +
                '</div>';
            }
            return "";
        }

        var picks = all().filter(function (x) {
            return (x.type === "휴대용" || x.type === "절충형") && weightOf(x) > 0 &&
                   weightOf(x) <= kg - 4 && x.name !== s.name;
        }).sort(function (a, b) { return weightOf(a) - weightOf(b); }).slice(0, 3);

        return '<div style="margin-top:16px; background: #F9FAFB; border:1px solid #E5E8EB; ' +
            'border-radius:14px; padding:15px 16px;">' +
            '<div style="font-size:13px; font-weight:900; color:' + DARK + ';">' +
                '\uD83D\uDED2 두 번째 유모차를 생각할 때예요</div>' +
            '<div style="margin-top:5px; font-size:12.5px; font-weight:600; color:#4E5968; ' +
                'line-height:1.8; word-break:keep-all;">' +
                esc(nm("가")) + ' ' + m + '개월이라 <b>걷다 안기다를 반복</b>합니다. ' +
                '그때마다 ' + kg + 'kg 을 접었다 폈다 하게 되고요.<br>' +
                '<b>서두르실 필요는 없어요.</b> 지금 것으로 버티다가 진짜 힘들 때 사셔도 됩니다.</div>' +
            (picks.length
                ? '<div style="margin-top:11px;">' +
                  picks.map(function (x) {
                      return '<div style="display:flex; justify-content:space-between; align-items:center; ' +
                          'gap:10px; padding:9px 0; border-bottom:1px solid #F2F4F6;">' +
                          '<div style="flex:1; min-width:0; font-size:12.5px; font-weight:800; ' +
                              'color:' + DARK + '; word-break:keep-all;">' + esc(x.name) + '</div>' +
                          '<div style="flex-shrink:0; font-size:11.5px; font-weight:800; color:' + BLUE + ';">' +
                              weightOf(x) + 'kg \u00b7 \u2212' +
                              (Math.round((kg - weightOf(x)) * 10) / 10) + 'kg</div>' +
                      '</div>';
                  }).join("") + '</div>'
                : '') +
        '</div>';
    }

    /* ==========================================================
       3. 유모차 관리 — 반복되는 것
       ---------------------------------------------------------- */

    var CARE = [
        { id: "brake", label: "브레이크", days: 30,
          why: "양쪽이 다 잠기는지. 한쪽만 걸리면 굴러갑니다" },
        { id: "wheel", label: "바퀴", days: 30,
          why: "머리카락이 감기면 한쪽으로 쏠려 손목에 힘이 더 들어갑니다" },
        { id: "seat",  label: "시트 세탁", days: 90,
          why: "분리 방법은 설명서를 보세요" },
        { id: "belt",  label: "안전벨트", days: 60,
          why: "딸깍 하고 끝까지 잠기는지, 끈이 닳지 않았는지" }
    ];

    /* \u26a0\ufe0f '우리 유모차' 한 카드에 다섯 덩어리를 다 넣으니 1,300자가 됐다.
          관리는 성격이 달라서 따로 뺀다. 카드 하나가 짧아야 읽힌다. */
    function careHTML(o) {
        var c = o.care || {};
        var over = CARE.filter(function (x) {
            var d = daysSince(c[x.id]);
            return d === null || d >= x.days;
        }).length;

        return '<div class="matrix-panel" style="margin-bottom:20px;">' +
            '<div class="matrix-header">' +
                '\uD83E\uDDF9 유모차 볼 때가 된 것' +
                (over ? ' <span style="color:' + GOLD + ';">' + over + '개</span>' : '') + '</div>' +
            '<div style="margin:-16px 0 12px; font-size:12.5px; font-weight:600; ' +
                'color:' + GRAY + '; line-height:1.7; word-break:keep-all;">' +
                '<b>고장은 늘 브레이크와 바퀴에서</b> 시작합니다.<br>' +
                '<span style="font-size:11.5px;">예전에 하셨으면 옆 <b>달력</b>에서 그 날짜를 고르세요.</span></div>' +

            CARE.map(function (x) {
                var d = daysSince(c[x.id]);
                var bad = (d === null || d >= x.days);
                return '<div style="padding:11px 0; border-bottom:1px solid #F2F4F6;">' +
                    '<div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">' +
                        '<div style="min-width:0;">' +
                            '<div style="font-size:13px; font-weight:900; color:' + DARK + ';">' +
                                esc(x.label) +
                                '<span style="font-weight:700; color:' + GRAY + '; font-size:11px;"> \u00b7 ' +
                                (x.days >= 30 ? (x.days / 30) + '달' : x.days + '일') + '마다</span></div>' +
                            '<div style="margin-top:3px; font-size:11.5px; font-weight:800; color:' +
                                (bad ? GOLD : "#4E5968") + ';">' +
                                (d === null ? "아직 안 적으셨어요"
                                            : d + "일 지났어요" + (bad ? " \u2014 볼 때가 됐어요" : "")) + '</div>' +
                        '</div>' +
                        '<div style="flex-shrink:0; display:flex; gap:6px; align-items:center;">' +
                            '<div onclick="window.markStrollerCare(\'' + x.id + '\')" ' +
                                'style="padding:9px 12px; border-radius:10px; cursor:pointer; ' +
                                'font-size:11.5px; font-weight:800; background: #FFFFFF; color:#4E5968; ' +
                                'border:1px solid #D1D5DB; white-space:nowrap;">오늘 봤어요</div>' +
                            '<input type="date" value="' + esc(c[x.id] || "") + '" ' +
                                'max="' + today() + '" ' +
                                'onchange="window.markStrollerCare(\'' + x.id + '\', this.value)" ' +
                                'title="예전에 하셨으면 그 날짜를 고르세요" ' +
                                'style="width:34px; padding:9px 4px; border-radius:10px; ' +
                                'border:1px solid #D1D5DB; background: #FFFFFF; color:#8B95A1; ' +
                                'font-size:11px; cursor:pointer;">' +
                        '</div>' +
                    '</div>' +
                    '<div style="margin-top:4px; font-size:11.5px; font-weight:600; color:' + GRAY + '; ' +
                        'line-height:1.65; word-break:keep-all;">' + x.why + '</div>' +
                '</div>';
            }).join("") +
        '</div>';
    }

    /* ==========================================================
       PLUS 패널
       ---------------------------------------------------------- */

    function ownHTML() {
        var o = own();
        var title = myTitle(o);
        var s = byName(o.name);

        if (!title) {
            return '<div class="matrix-panel" style="margin-bottom:20px;">' +
                '<div class="matrix-header">\uD83C\uDF7C 우리 유모차</div>' +
                '<div style="font-size:13px; font-weight:600; color:' + GRAY + '; ' +
                    'margin:-16px 0 16px; line-height:1.8; word-break:keep-all;">' +
                    '유모차는 아기보다 <b>미는 사람의 몸</b>이 먼저 상합니다. ' +
                    '쓰고 계신 걸 알려주시면 <b>하루에 몇 kg 을 드시는지</b> 세어드릴게요.</div>' +
                '<div onclick="window.openStrollerSheet()" style="text-align:center; padding:16px; ' +
                    'background:' + DARK + '; color:#FFFFFF; border-radius:14px; ' +
                    'font-size:14.5px; font-weight:900; cursor:pointer;">유모차 알려주기</div>' +
            '</div>';
        }

        return '<div class="matrix-panel" style="margin-bottom:20px;">' +
            '<div class="matrix-header">\uD83C\uDF7C 우리 유모차</div>' +
            '<div style="display:flex; justify-content:space-between; align-items:center; ' +
                'gap:10px; margin:-16px 0 4px;">' +
                '<div style="font-size:14px; font-weight:900; color:' + DARK + '; min-width:0; ' +
                    'word-break:keep-all;">' + esc(title) + '</div>' +
                '<div onclick="window.openStrollerSheet()" style="flex-shrink:0; font-size:12.5px; ' +
                    'font-weight:800; color:' + BLUE + '; cursor:pointer;">고치기</div>' +
            '</div>' +
            (s ? '<div style="font-size:11.5px; font-weight:700; color:' + GRAY + ';">' +
                 esc(s.type) + ' \u00b7 ' + weightOf(s) + 'kg' +
                 (s.foldedDims ? ' \u00b7 접으면 ' + s.foldedDims.join('\u00d7') + 'cm' : '') + '</div>'
               : '<div style="font-size:11.5px; font-weight:700; color:' + GRAY + ';">' +
                 (Number(own().customW) || 0) + 'kg</div>') +

            liftHTML(o) + goingHTML(o) + secondHTML(o) +

            '<div style="margin-top:12px; font-size:11.5px; font-weight:600; color:' + GRAY + '; ' +
                'line-height:1.7; word-break:keep-all;">' +
                '여기 숫자는 <b>세어드리는 것</b>일 뿐이에요. ' +
                '최종 기준은 늘 <b>내 유모차 설명서</b>입니다.</div>' +
        '</div>';
    }

    function teaseHTML() {
        return '<div class="matrix-panel" style="margin-bottom:20px;">' +
            '<div class="matrix-header">\uD83C\uDF7C 우리 유모차</div>' +
            '<div style="background:#FFF9E6; border:1px solid #F5E1A4; border-radius:14px; ' +
                'padding:17px 16px; margin-top:-16px;">' +
                '<div style="font-size:13.5px; font-weight:900; color:' + GOLD + ';">' +
                    '하루에 몇 kg 을 드시는지 세어드려요</div>' +
                '<div style="margin-top:6px; font-size:12.5px; font-weight:600; color:' + GOLD + '; ' +
                    'line-height:1.8; word-break:keep-all;">' +
                    '유모차는 아기보다 <b>미는 사람의 몸</b>이 먼저 상합니다. ' +
                    '쓰시는 유모차만 알려주시면 하루 부담을 숫자로 보여드리고, ' +
                    '<b>가벼운 걸로 바꾸면 얼마나 줄어드는지</b>까지 세어드려요.<br>' +
                    '브레이크\u00b7바퀴\u00b7시트는 <b>볼 때가 되면</b> 먼저 말씀드립니다.</div>' +
            '</div>' +
        '</div>';
    }

    /* ==========================================================
       무료 — 안전은 잠그지 않는다
       ---------------------------------------------------------- */

    function rainHTML() {
        return '<div class="matrix-panel" style="margin-bottom:20px;">' +
            '<div class="matrix-header">\u2614 비 오는 날 레인커버</div>' +
            '<div style="background:#FFF2F2; border:1px solid #FCA5A5; border-radius:14px; ' +
                'padding:15px 16px; margin:-16px 0 12px; font-size:12.5px; font-weight:600; ' +
                'color:#4E5968; line-height:1.8; word-break:keep-all;">' +
                '<b style="color:' + RED + ';">\u26A0\uFE0F 레인커버를 씌운 채로 실내에 들어가지 마세요.</b> ' +
                '비닐 안쪽은 <b>공기가 잘 안 통하고 온도가 빠르게 올라갑니다.</b> ' +
                '건물에 들어가거나 비가 그치면 바로 걷어주세요.</div>' +
            '<div style="font-size:12.5px; font-weight:600; color:#4E5968; line-height:1.9; ' +
                'word-break:keep-all;">' +
                '\u00b7 <b>통풍구가 있는 것</b>으로 고르세요. 없는 건 아기 얼굴 쪽이 금방 답답해집니다<br>' +
                '\u00b7 씌운 동안 <b>자주 들여다보세요.</b> 비닐 너머로는 표정이 잘 안 보입니다<br>' +
                '\u00b7 차 안이나 지하철에서는 <b>반드시 걷어주세요</b><br>' +
                '\u00b7 젖은 채로 접어두면 곰팡이가 핍니다. <b>펴서 말린 뒤</b> 접으세요' +
            '</div>' +
        '</div>';
    }

    function sleepHTML() {
        var m = monthsOld();
        return '<div class="matrix-panel" style="margin-bottom:20px;">' +
            '<div class="matrix-header">\uD83D\uDE34 유모차에서 잠들었을 때</div>' +
            '<div style="font-size:12.5px; font-weight:600; color:#4E5968; line-height:1.85; ' +
                'margin:-16px 0 12px; word-break:keep-all;">' +
                '유모차는 <b>잠자리가 아니라 이동 수단</b>입니다. 등받이가 서 있으면 고개가 앞으로 꺾여요. ' +
                '집에 도착하면 <b>평평한 곳에 눕혀주세요.</b>' +
                (m !== null && m < 4
                    ? '<br><br><b style="color:' + RED + ';">' + esc(nm("는")) + ' 아직 ' + m +
                      '개월이에요.</b> 목을 못 가누는 시기라 <b>등받이를 최대한 눕히고</b> 자주 확인해주세요.'
                    : '') +
            '</div>' +
            '<div style="background: #F9FAFB; border:1px solid #E5E8EB; border-radius:13px; ' +
                'padding:14px 15px; font-size:12.5px; font-weight:600; color:#4E5968; ' +
                'line-height:1.9; word-break:keep-all;">' +
                '<b>옮기면 깨서 고민이시라면</b><br>' +
                '\u00b7 도착하기 <b>5분 전에 등받이를 천천히</b> 눕혀두세요. 자세가 이미 바뀌어 있으면 덜 깹니다<br>' +
                '\u00b7 안아 올릴 때 <b>발부터가 아니라 등과 머리를 먼저</b> 받치세요<br>' +
                '\u00b7 유모차에 덮어두던 <b>같은 천을 그대로</b> 들고 옮기면 냄새가 이어집니다<br>' +
                '\u00b7 그래도 깨면 그날은 어쩔 수 없어요. <b>매번 되는 방법은 없습니다</b>' +
            '</div>' +
        '</div>';
    }

    /* ==========================================================
       유모차를 안 타려고 해요 \u2014 매일 겪는 것
       ----------------------------------------------------------
       카시트와 겉모습은 같지만 원인이 다르다.
       카시트는 묶여 있어서 답답한 것이고,
       유모차는 묶여 있지도 않은데 안 탄다.

       특히 돌 무렵 '내가 걸을래' 가 시작되면 유모차가 통째로 무용지물이 된다.
       그때 부모는 13kg 짜리를 빈 채로 밀고 다닌다.
       그게 이 탭의 진짜 고통이다.

       \u26a0\ufe0f 효과를 약속하지 않는다. '해보는 방법' 이다.
       \u26a0\ufe0f 각도\u00b7벨트 조절법은 제품마다 달라 설명서로 보낸다.
       ---------------------------------------------------------- */

    var WHY = [
        { id: "walk", icon: "\uD83D\uDC63", label: "걷겠다고 내려달래요",
          note: "돌 무렵부터 시작됩니다. <b>유모차가 싫은 게 아니라 걷고 싶은 것</b>이라, " +
                "태우려고 애쓰기보다 <b>걷는 시간을 먼저 주는 쪽</b>이 빠릅니다.",
          ways: [
            { t: "가는 길은 걷고, 오는 길은 태우기",
              d: "나갈 때 실컷 걷게 하고 <b>돌아올 때</b> 태우세요. " +
                 "다리가 지쳐 있으면 순순히 앉습니다. 대신 <b>갈 때는 시간이 두 배</b>로 걸리니 그걸 감안해서 나가세요." },
            { t: "유모차를 '쉬는 자리' 로 만들기",
              d: "걷다가 힘들어할 때 <b>먼저 태우지 말고</b> ‘쉴래?’ 하고 물어보세요. " +
                 "자기가 선택해서 앉으면 저항이 확 줄어듭니다." },
            { t: "유모차에 짐을 싣게 하기",
              d: "본인 물병이나 인형을 <b>유모차에 태우게</b> 하세요. " +
                 "‘네가 미는 거야’ 하고 손잡이를 잡게 하면 유모차가 자기 편이 됩니다." },
            { t: "안전벨트는 그래도 채우기",
              d: "\u26a0\ufe0f 앉기 싫어한다고 벨트를 안 채우면 안 됩니다. " +
                 "<b>일어서다 앞으로 고꾸라지는 사고</b>가 이때 제일 많아요. " +
                 "앉는 걸 협상해도 <b>벨트는 협상 대상이 아닙니다.</b>" }
          ] },

        { id: "view", icon: "\uD83D\uDC40", label: "타면 바로 몸을 젖혀요",
          note: "<b>보이는 게 없어서</b>일 때가 많습니다. 앞을 보는 자리인지, " +
                "차양이 시야를 다 가리고 있진 않은지 보세요.",
          ways: [
            { t: "차양을 반만 내리기",
              d: "햇빛 막으려고 끝까지 내리면 <b>아기 눈앞이 캄캄합니다.</b> " +
                 "반만 내리고, 눈부시면 각도를 트세요." },
            { t: "등받이를 세워보기",
              d: "누운 자세로는 하늘밖에 안 보입니다. 목을 가누는 시기라면 " +
                 "<b>등받이를 조금 세워서</b> 앞이 보이게 해주세요. " +
                 "각도 범위는 <b>설명서</b>를 보세요." },
            { t: "마주 보는 자리로 바꾸기",
              d: "양대면이 되는 제품이면 <b>엄마가 보이는 쪽</b>으로 돌려보세요. " +
                 "낯가림이 심한 시기엔 이것만으로 조용해지기도 합니다." },
            { t: "손에 쥘 걸 하나",
              d: "<b>유모차에서만 주는 물건</b>을 하나 정해두세요. " +
                 "매번 같은 걸 주면 ‘이거 타면 저게 나온다’ 가 됩니다." }
          ] },

        { id: "hold", icon: "\uD83E\uDD31", label: "안아달라고만 해요",
          note: "지쳤거나 불안한 겁니다. <b>유모차 문제가 아닐 때</b>가 많아요.",
          ways: [
            { t: "먼저 안아주고 나서 태우기",
              d: "<b>5분만 안아주세요.</b> 채워지고 나면 순순히 앉는 경우가 많습니다. " +
                 "태우려고 실랑이하는 시간이 더 깁니다." },
            { t: "출발 시각을 옮기기",
              d: "<b>배고프거나 졸린 때</b>는 뭘 해도 안 됩니다. " +
                 "먹이고 나서, 또는 낮잠 자고 일어난 뒤에 나가보세요." },
            { t: "아기띠를 같이 챙기기",
              d: "<b>둘 다 갖고 나가는 게</b> 마음이 편합니다. " +
                 "유모차엔 짐을 싣고 아기는 안고 가다가, 잠들면 유모차에 눕히세요." },
            { t: "그날은 접기",
              d: "<b>매번 되는 방법은 없습니다.</b> 오늘 안 되면 오늘은 안 되는 날이에요. " +
                 "실랑이하다 둘 다 지치는 것보다 낫습니다." }
          ] },

        { id: "belt", icon: "\uD83D\uDD13", label: "벨트를 풀고 일어서요",
          note: "<b>제일 위험한 상황</b>입니다. 유모차는 카시트와 달리 " +
                "<b>앞으로 고꾸라지면 바로 바닥</b>이에요.",
          ways: [
            { t: "가랑이 끈부터 확인하기",
              d: "어깨끈만 채우고 <b>다리 사이 끈을 빼먹으면</b> 그대로 미끄러져 내려옵니다. " +
                 "5점식이면 <b>다섯 군데가 다</b> 채워졌는지 보세요." },
            { t: "헐거운지 보기",
              d: "가슴에서 <b>손가락에 집히면 헐거운 겁니다.</b> " +
                 "겉옷을 벗기고 채운 뒤 다시 조여보세요." },
            { t: "일어서면 멈추기",
              d: "일어설 때마다 <b>유모차를 세우고</b> 다시 앉힌 뒤 출발하세요. " +
                 "몇 번 반복하면 ‘일어서면 안 간다’ 가 됩니다. 며칠 걸립니다." },
            { t: "잠금 장치는 사지 마세요",
              d: "\uD83D\uDED1 버클을 못 풀게 막는 부품이 팔립니다. <b>권하지 않습니다.</b> " +
                 "넘어졌을 때 빨리 꺼내야 하는데 그게 막고, " +
                 "제조사가 허가하지 않은 부품을 달면 <b>안전 인증이 깨집니다.</b>" }
          ] }
    ];

    function whyOf(id) {
        for (var i = 0; i < WHY.length; i++) if (WHY[i].id === id) return WHY[i];
        return null;
    }

    window.pickStrollerWhy = function (id) {
        var o = own();
        o.why = (o.why === id) ? "" : id;
        o.wstep = 0;
        save(o); paint();
    };
    window.markStrollerWay = function (ok) {
        var o = own();
        var w = whyOf(o.why);
        if (!w) return;
        o.wlog = o.wlog || {};
        o.wlog[o.why + ":" + (o.wstep || 0)] = { at: today(), ok: !!ok };
        if (!ok && (o.wstep || 0) < w.ways.length - 1) o.wstep = (o.wstep || 0) + 1;
        o.wlast = today();
        save(o); paint();
    };
    window.resetStrollerWhy = function () {
        var o = own();
        o.why = ""; o.wstep = 0; o.wlog = {}; o.wlast = "";
        save(o); paint();
    };

    function refuseHTML() {
        var o = own();
        var w = whyOf(o.why);
        var plus = isPlus();
        var m = monthsOld();

        var out = '<div class="matrix-panel" style="margin-bottom:20px;">' +
            '<div class="matrix-header">\uD83D\uDE2B 유모차를 안 타려고 해요</div>';

        out += '<div style="background:#FFF2F2; border:1px solid #FCA5A5; border-radius:14px; ' +
            'padding:15px 16px; margin:-16px 0 14px; font-size:12.5px; font-weight:600; ' +
            'color:#4E5968; line-height:1.8; word-break:keep-all;">' +
            '<b style="color:' + RED + ';">\u26A0\uFE0F 앉기 싫어해도 벨트는 꼭 채우세요.</b> ' +
            '유모차는 카시트와 달리 <b>앞으로 고꾸라지면 바로 바닥</b>입니다. ' +
            '앉는 건 협상해도 <b>벨트는 협상 대상이 아니에요.</b></div>';

        if (!w) {
            out += '<div style="font-size:13px; font-weight:600; color:' + GRAY + '; ' +
                'line-height:1.75; margin-bottom:14px; word-break:keep-all;">' +
                (m !== null && m >= 11
                    ? '<b>돌 무렵부터는 ‘내가 걸을래’ 가 시작됩니다.</b> 유모차가 싫은 게 아니에요.<br>'
                    : '') +
                '어떤 모습인지에 따라 해볼 게 다릅니다. 골라주시면 <b>하나씩</b> 드릴게요.</div>' +
                '<div style="display:grid; grid-template-columns:1fr 1fr; gap:9px;">' +
                WHY.map(function (x) {
                    return '<div onclick="window.pickStrollerWhy(\'' + x.id + '\')" ' +
                        'style="padding:15px 10px; border-radius:14px; cursor:pointer; text-align:center; ' +
                        'background: #F9FAFB; color:#4E5968; border:1px solid #E5E8EB; ' +
                        'font-size:12.5px; font-weight:800; line-height:1.45; word-break:keep-all;">' +
                        '<div style="font-size:20px; margin-bottom:6px;">' + x.icon + '</div>' +
                        esc(x.label) + '</div>';
                }).join("") + '</div>';
            return out + '</div>';
        }

        var list = w.ways;
        var step = Math.min(o.wstep || 0, list.length - 1);
        var cur = list[step];
        var done = (o.wlast === today());
        var log = o.wlog || {};
        var win = null;
        for (var i = 0; i < list.length; i++) {
            if (log[w.id + ":" + i] && log[w.id + ":" + i].ok) win = list[i];
        }

        out += '<div style="display:flex; justify-content:space-between; align-items:center; ' +
            'gap:10px; margin-bottom:10px;">' +
            '<div style="font-size:13.5px; font-weight:900; color:' + DARK + ';">' +
                w.icon + ' ' + esc(w.label) + '</div>' +
            '<div onclick="window.resetStrollerWhy()" style="flex-shrink:0; font-size:12px; ' +
                'font-weight:800; color:' + BLUE + '; cursor:pointer;">다시 고르기</div>' +
        '</div>' +
        '<div style="background:#E8F3FF; border:1px solid #C9E2FF; border-radius:13px; ' +
            'padding:14px 15px; margin-bottom:14px; font-size:12.5px; font-weight:600; ' +
            'color:#1B64DA; line-height:1.75; word-break:keep-all;">' + w.note + '</div>';

        if (win) {
            out += '<div style="background:#EAF7F1; border:1px solid #A7DFC8; border-radius:14px; ' +
                'padding:16px;">' +
                '<div style="font-size:14px; font-weight:900; color:#1F6F52;">' +
                    '\u2705 ' + esc(win.t) + ' \u2014 이게 통했어요</div>' +
                '<div style="margin-top:6px; font-size:12.5px; font-weight:600; color:#4E5968; ' +
                    'line-height:1.75; word-break:keep-all;">' +
                    '며칠은 같은 방법으로 이어가세요. 한 번 됐다고 바로 자리잡진 않아요.</div>' +
            '</div>';
        } else if (plus) {
            out += '<div style="font-size:11.5px; font-weight:900; color:' + BLUE + '; ' +
                'letter-spacing:0.4px; margin-bottom:7px;">오늘 해볼 것 하나</div>' +
                '<div style="background: #FFFFFF; border:1.5px solid #CBE0FF; border-radius:16px; ' +
                    'padding:17px; box-shadow:0 3px 14px rgba(49,130,246,0.06);">' +
                    '<div style="display:flex; align-items:center; gap:8px;">' +
                        '<span style="flex-shrink:0; width:21px; height:21px; border-radius:7px; ' +
                            'background:' + DARK + '; color:#FFFFFF; font-size:11px; font-weight:900; ' +
                            'display:inline-flex; align-items:center; justify-content:center;">' +
                            (step + 1) + '</span>' +
                        '<span style="font-size:15px; font-weight:900; color:#191F28;">' +
                            esc(cur.t) + '</span>' +
                    '</div>' +
                    '<div style="margin-top:9px; font-size:13px; font-weight:600; color:#4E5968; ' +
                        'line-height:1.8; word-break:keep-all;">' + cur.d + '</div>' +
                    (done
                        ? '<div style="margin-top:14px; text-align:center; padding:13px; ' +
                          'background: #F9FAFB; color:' + GRAY + '; border-radius:12px; ' +
                          'font-size:12.5px; font-weight:800;">오늘 몫은 하셨어요. 내일 또 뵐게요</div>'
                        : '<div style="display:flex; gap:8px; margin-top:15px;">' +
                          '<div onclick="window.markStrollerWay(true)" style="flex:1; text-align:center; ' +
                              'padding:13px; background:' + DARK + '; color:#FFFFFF; border-radius:12px; ' +
                              'font-size:13.5px; font-weight:800; cursor:pointer;">탔어요!</div>' +
                          '<div onclick="window.markStrollerWay(false)" style="flex:1; text-align:center; ' +
                              'padding:13px; background: #FFFFFF; color:#4E5968; border:1px solid #D1D5DB; ' +
                              'border-radius:12px; font-size:13.5px; font-weight:800; cursor:pointer;">' +
                              '그대로예요</div></div>') +
                '</div>';

            var tried = [];
            for (var k = 0; k < list.length; k++) if (log[w.id + ":" + k]) tried.push(list[k].t);
            if (tried.length > 1) {
                out += '<div style="margin-top:13px; font-size:11.5px; font-weight:700; color:' + GRAY + '; ' +
                    'line-height:1.7; word-break:keep-all;">해보신 것 \u00b7 ' + esc(tried.join(" \u00b7 ")) + '</div>';
            }
        } else {
            out += '<div style="background: #FFFFFF; border:1.5px solid #CBE0FF; border-radius:16px; ' +
                'padding:17px;">' +
                '<div style="font-size:15px; font-weight:900; color:#191F28;">1. ' + esc(list[0].t) + '</div>' +
                '<div style="margin-top:9px; font-size:13px; font-weight:600; color:#4E5968; ' +
                    'line-height:1.8; word-break:keep-all;">' + list[0].d + '</div>' +
            '</div>' +
            '<div style="margin-top:13px; background:#FFF9E6; border:1px solid #F5E1A4; ' +
                'border-radius:14px; padding:16px;">' +
                '<div style="font-size:13px; font-weight:900; color:' + GOLD + ';">' +
                    '나머지 ' + (list.length - 1) + '가지는 PLUS에서 하루에 하나씩</div>' +
                '<div style="margin-top:5px; font-size:12px; font-weight:600; color:' + GOLD + '; ' +
                    'line-height:1.75; word-break:keep-all;">' +
                    '뭐가 통했고 뭐가 아니었는지 적어두면 <b>안 된 건 다시 안 권합니다.</b></div>' +
            '</div>';
        }

        return out + '</div>';
    }

    /* ---------- 자리 ---------- */

    function paint() {
        var host = document.getElementById(HOST);
        if (!host) return;
        host.innerHTML = (isPlus() ? ownHTML() : teaseHTML()) +
                         (isPlus() && myTitle(own()) ? careHTML(own()) : "") +
                         refuseHTML() + rainHTML() + sleepHTML();
        try { if (typeof window.refreshPlusMark === "function") window.refreshPlusMark(); } catch (e) {}
    }
    window.refreshStrollerOwn = paint;

    function mount() {
        if (document.getElementById(HOST)) return;
        var anchor = document.getElementById("stroller-guide") ||
                     document.querySelector(".filter-section");
        if (!anchor || !anchor.parentNode) return;
        var box = document.createElement("div");
        box.id = HOST;
        anchor.parentNode.insertBefore(box, anchor.nextSibling);
        paint();
    }

    function boot() {
        /* \u26a0\ufe0f 늦게 붙으면 '쓰면서 챙길 것' 칸이 한동안 비어 보인다.
              바로 시도하고, 앵커가 아직 없으면 촘촘히 다시 본다. */
        mount();
        var t = 0;
        var again = setInterval(function () {
            mount();
            if (document.getElementById(HOST) || ++t > 24) clearInterval(again);
        }, 120);
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    window.strollerOwnDebug = function () {
        var o = own(), s = byName(o.name);
        var kg = myWeight(o);
        console.log("PLUS:", isPlus(), "\u00b7 개월수:", monthsOld());
        console.log("등록한 유모차:", myTitle(o) || "없음", kg ? "(" + kg + "kg)" : "");
        if (s) console.log("종류:", s.type, "\u00b7 접으면", (s.foldedDims || []).join("\u00d7") + "cm");
        var rk = weightRank(kg);
        if (rk) console.log("무게 순위: 무거운 쪽에서", rk.rank, "/", rk.total);
        var l = lightestSame(o);
        if (l) console.log("같은 종류 최경량:", l.name, weightOf(l) + "kg");
        var trips = Number(o.trips) || 2;
        console.log("하루 외출", trips, "번 \u2192 접고 펴기", trips * 2, "번 =",
                    Math.round(kg * trips * 2 * 10) / 10 + "kg");
        console.log("엘베 없이", (o.floor || 0) + "층");
        console.log("--- 관리 ---");
        CARE.forEach(function (x) {
            var d = daysSince((o.care || {})[x.id]);
            console.log("   " + x.label + " " + x.days + "일 \u00b7 " +
                        (d === null ? "기록 없음" : d + "일 지남" + (d >= x.days ? " \u26A0\uFE0F" : "")));
        });
        console.log("붙었나:", !!document.getElementById(HOST));
    };
})();