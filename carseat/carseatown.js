/* ============================================================
   배냇함 PLUS — 우리 카시트 (carseatown.js)

   carseatguide.js 는 '사기 전' 과 '태울 때' 를 다 덮는다.
   후향/전향, 3분 점검, ADAC, 중고까지.
   빠진 건 '산 다음 3년' 이다.

   카시트는 30~50만원짜리인데, 부모가 제일 크게 묻는
   "이거 언제까지 쓰나" 에 아무도 답을 안 해준다.
   그리고 카시트는 나이가 아니라 키가 기준인데 그걸 모른다.

   ⚠️ 매뉴얼을 우리가 갖지 않는다.
      제조사 설명서는 제조사 저작물이다. 모아서 올리면 안 된다.
      부모가 한 장씩 찍어 올리는 것도 아무도 안 한다.
      대신 설명서에서 '숫자 서너 개' 만 옮겨 적게 한다.
      어깨끈 어느 칸, 뒤보기 몇 cm 까지, 만료 언제 — 실제로 찾는 건 이것뿐이다.

   ⚠️ 우리가 숫자를 정하지 않는다.
      유효기간은 제조사마다 6~10년으로 다르고, 뒤보기 상한도 제품마다 다르다.
      우리가 정하면 틀릴 숫자가 생긴다. 부모가 적고, 우리는 센다.

   ⚠️ 안전 지침은 전부 무료다.
      어깨끈을 어떻게 맞추는지는 무료고,
      '4cm 자랐으니 지금 맞출 때' 라고 세어주는 것이 PLUS다.

   index.html 에서 carseatguide.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var KEY  = "tosil_carseat_own";
    var HOST = "carseat-own";
    var HARNESS_DAYS = 60;          // 이만큼 지나면 어깨끈을 한 번 보시라고 한다
    var HEIGHT_DAYS  = 45;          // 키를 다시 재보시라고 하는 주기

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
    function seats() {
        try { if (typeof carseatData !== "undefined" && carseatData) return carseatData; } catch (e) {}
        return window.carseatData || [];
    }
    function seatById(id) {
        var a = seats();
        for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i];
        return null;
    }
    function today() {
        var t = new Date();
        return t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") +
               "-" + String(t.getDate()).padStart(2, "0");
    }
    function daysSince(k) {
        if (!k) return null;
        var p = String(k).split("-").map(Number);
        if (p.length < 3) return null;
        var d = new Date(p[0], p[1] - 1, p[2]); d.setHours(0, 0, 0, 0);
        var t = new Date(); t.setHours(0, 0, 0, 0);
        return Math.floor((t - d) / 86400000);
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

    function own() {
        try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
    }
    function save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }

    /* bodySpec 에서 키 상한을 뽑는다. 14종 중 10종은 나오고 4종은 없다.
       없는 건 부모가 설명서를 보고 적는다. 우리가 지어내지 않는다. */
    function maxCmOf(seat) {
        if (!seat || !seat.bodySpec) return null;
        var all = String(seat.bodySpec).match(/(\d+)\s*cm/g);
        if (!all || !all.length) return null;
        return parseInt(all[all.length - 1], 10) || null;
    }

    /* ---------- 조작 ---------- */

    window.pickMySeat = function (id) {
        var o = own();
        o.id = (o.id === id) ? "" : id;
        save(o); paintSheet(); paint();
    };
    window.setSeatField = function (f, v) {
        var o = own();
        v = String(v || "").trim();
        if (f === "height" || f === "rearMax") {
            var n = parseInt(v, 10);
            o[f] = (n > 0 && n < 200) ? n : "";
            if (f === "height" && o[f]) {
                o.heightAt = today();
                /* \u26a0\ufe0f 잰 값을 남겨둔다.
                      이게 있어야 '몇 개월 뒤' 를 이 아이의 실제 속도로 셀 수 있다.
                      평균 성장 속도를 지어내면 틀린 달수가 나온다. */
                o.hist = Array.isArray(o.hist) ? o.hist : [];
                if (!o.hist.length || o.hist[o.hist.length - 1].cm !== o[f]) {
                    o.hist.push({ cm: o[f], at: today() });
                    if (o.hist.length > 8) o.hist = o.hist.slice(-8);
                }
            }
        } else o[f] = v;
        save(o); paint();
    };
    /* \u26a0\ufe0f '오늘 맞췄어요' 만 있으면 오늘 맞춘 사람만 쓸 수 있다.
          지난달에 맞췄으면 적을 방법이 없어서 '아직 안 적음' 이 영영 안 없어진다. */
    window.markHarness = function (when) {
        var o = own();
        var v = String(when || "").trim();
        if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return;
        if (v && daysSince(v) < 0) return;                 // 미래는 안 받는다
        o.harnessAt = v || today();
        o.harnessH = o.height || "";      // 그때 키를 같이 적어둔다
        save(o); paint();
    };
    window.openSeatSheet = function () {
        var old = document.getElementById("seat-sheet");
        if (old) old.remove();
        var w = document.createElement("div");
        w.id = "seat-sheet";
        w.setAttribute("style", "position:fixed; inset:0; z-index:100030; background: #FFFFFF; " +
            "overflow-y:auto; -webkit-overflow-scrolling:touch;");
        document.body.appendChild(w);
        paintSheet();
    };
    window.closeSeatSheet = function () {
        var el = document.getElementById("seat-sheet");
        if (el) el.remove();
        paint();
    };

    function paintSheet() {
        var w = document.getElementById("seat-sheet");
        if (!w) return;
        var o = own();

        w.innerHTML =
        '<div style="max-width:480px; margin:0 auto; padding:20px 20px 40px;">' +
            '<div style="display:flex; justify-content:space-between; align-items:center;">' +
                '<div style="font-size:18px; font-weight:900; color:' + DARK + ';">\uD83D\uDE98 쓰고 계신 카시트</div>' +
                '<span onclick="window.closeSeatSheet()" style="font-size:24px; font-weight:300; ' +
                    'color:' + GRAY + '; cursor:pointer; line-height:1; padding:0 4px;">\u00d7</span>' +
            '</div>' +
            '<div style="margin-top:6px; font-size:13px; font-weight:600; color:' + GRAY + '; ' +
                'line-height:1.7; word-break:keep-all;">' +
                '목록에 없으면 아래 칸에 이름만 적어주셔도 됩니다.</div>' +

            '<div style="margin-top:20px; display:flex; flex-direction:column; gap:7px;">' +
                seats().map(function (s) {
                    var on = (o.id === s.id);
                    var cm = maxCmOf(s);
                    return '<div onclick="window.pickMySeat(\'' + s.id + '\')" ' +
                        'style="padding:13px 15px; border-radius:13px; cursor:pointer; ' +
                        (on ? 'background:' + DARK + '; color:#FFFFFF; border:1px solid ' + DARK + ';'
                            : 'background: #F9FAFB; color:#4E5968; border:1px solid #E5E8EB;') + '">' +
                        '<div style="font-size:13.5px; font-weight:800;">' +
                            (on ? "\u2713 " : "") + esc(s.brand) + ' ' + esc(s.name) + '</div>' +
                        '<div style="margin-top:2px; font-size:11.5px; font-weight:700; opacity:0.75;">' +
                            esc(s.bodySpec || "") + (cm ? "" : "  \u00b7 키 기준 없음") + '</div>' +
                    '</div>';
                }).join("") +
            '</div>' +

            '<div style="margin-top:20px; font-size:12.5px; font-weight:900; color:' + DARK + '; ' +
                'margin-bottom:7px;">목록에 없나요</div>' +
            '<input value="' + esc(o.name || "") + '" placeholder="예) 조이 스핀 360" ' +
                'onchange="window.setSeatField(\'name\', this.value)" ' +
                'style="width:100%; padding:14px; border-radius:12px; border:1px solid #D1D5DB; ' +
                'background: #FFFFFF; font-size:14px; font-weight:700; color:#191F28; box-sizing:border-box;">' +

            '<div onclick="window.closeSeatSheet()" style="margin-top:22px; text-align:center; ' +
                'padding:17px; background:' + DARK + '; color:#FFFFFF; border-radius:14px; ' +
                'font-size:15.5px; font-weight:900; cursor:pointer;">다 됐습니다</div>' +
        '</div>';
    }

    /* 이 아이의 실제 성장 속도 (cm/월). 두 번 이상 재야 나온다.
       \u26a0\ufe0f 평균값을 쓰지 않는다. 아기마다 크게 다르고, 틀리면
          '몇 개월 뒤' 가 통째로 틀린다. 모르면 안 말하는 게 낫다. */
    function cmPerMonth(o) {
        var h = o.hist;
        if (!Array.isArray(h) || h.length < 2) return null;
        var a = h[0], b = h[h.length - 1];
        var days = daysSince(a.at) - daysSince(b.at);
        var dcm = Number(b.cm) - Number(a.cm);
        if (!(days >= 30) || !(dcm > 0)) return null;      // 한 달은 지나야 의미가 있다
        var v = dcm / (days / 30.4);
        return (v > 0.05 && v < 5) ? v : null;             // 말이 안 되는 값은 버린다
    }

    /* ==========================================================
       계절 — 매년 두 번 오는 것
       \u26a0\ufe0f 겨울 패딩은 실제로 사고가 나는 항목이다. 크게 띄운다.
       ---------------------------------------------------------- */

    function seasonHTML() {
        var m = new Date().getMonth() + 1;

        if (m >= 11 || m <= 2) {
            return '<div style="background:#FFF2F2; border:1px solid #FCA5A5; border-radius:14px; ' +
                'padding:15px 16px; margin-bottom:14px;">' +
                '<div style="font-size:13.5px; font-weight:900; color:' + RED + '; margin-bottom:5px;">' +
                    '\uD83E\uDDE5 겨울이에요 \u00b7 패딩 벗기고 태우세요</div>' +
                '<div style="font-size:12.5px; font-weight:600; color:#4E5968; line-height:1.8; ' +
                    'word-break:keep-all;">' +
                    '두꺼운 외투를 입은 채 채우면, 충돌 순간 옷이 납작해지면서 ' +
                    '<b>하네스가 그만큼 헐거워집니다.</b> 벗겨서 태우고 <b>담요를 위에 덮어</b> 주세요. ' +
                    '차 안이 따뜻해지면 담요만 걷으면 되고요.</div>' +
            '</div>';
        }
        if (m >= 6 && m <= 8) {
            var o = own(), seat = seatById(o.id);
            var q = (seat ? seat.brand + " " : "") + "정품 쿨시트";
            return '<div style="background:#F0F7FF; border:1px solid #C9E2FF; border-radius:14px; ' +
                'padding:15px 16px; margin-bottom:14px;">' +
                '<div style="font-size:13.5px; font-weight:900; color:#1B64DA; margin-bottom:5px;">' +
                    '\u2600\uFE0F 여름이에요 \u00b7 쿨시트는 순정부터</div>' +
                '<div style="font-size:12.5px; font-weight:600; color:#4E5968; line-height:1.8; ' +
                    'word-break:keep-all;">' +
                    '두꺼운 패드는 겨울 패딩과 <b>같은 이유로</b> 하네스를 헐겁게 만듭니다. ' +
                    '아래 <b>쿨시트 사기 전에</b> 카드를 먼저 보세요. ' +
                    '<a href="https://www.google.com/search?q=' + encodeURIComponent(q) + '" ' +
                    'target="_blank" rel="noopener" style="color:#1B64DA; font-weight:800;">' +
                    esc(q) + ' 찾아보기 \u3009</a></div>' +
            '</div>';
        }
        return "";
    }

    /* ==========================================================
       다음 카시트 — 카시트는 두 번 산다
       ---------------------------------------------------------- */

    function nextSeatHTML(o, autoMax) {
        var h = Number(o.height) || 0;
        if (!h || !autoMax) return "";
        var leftCm = autoMax - h;
        if (leftCm > 40) return "";                 // 아직 한참이면 말 안 한다

        var v = cmPerMonth(o);
        var when = "";
        if (leftCm <= 0) when = "지금이 그때예요";
        else if (v) {
            var mo = Math.round(leftCm / v);
            when = mo <= 1 ? "한 달쯤 뒤" : "약 " + mo + "개월 뒤";
        }

        var seat = seatById(o.id);
        var isJunior = seat && seat.age && seat.age.indexOf("junior") > -1;

        /* 지금 쓰는 게 이미 주니어까지 되면 새로 살 필요가 없다.
           그걸 안 알려주면 앱이 안 사도 될 걸 팔게 된다. */
        if (isJunior) {
            return '<div style="margin-top:16px; background:#EAF7F1; border:1px solid #A7DFC8; ' +
                'border-radius:14px; padding:15px 16px;">' +
                '<div style="font-size:13px; font-weight:900; color:#1F6F52;">' +
                    '\u2705 다음 카시트는 안 사셔도 됩니다</div>' +
                '<div style="margin-top:5px; font-size:12.5px; font-weight:600; color:#4E5968; ' +
                    'line-height:1.75; word-break:keep-all;">' +
                    '쓰고 계신 게 주니어까지 되는 제품이에요. ' +
                    '헤드레스트와 어깨끈 위치만 그때그때 맞춰주시면 됩니다.</div>' +
            '</div>';
        }

        var picks = seats().filter(function (x) {
            return x.age && x.age.indexOf("junior") > -1 && x.id !== o.id;
        }).slice(0, 3);

        return '<div style="margin-top:16px; background: #F9FAFB; border:1px solid #E5E8EB; ' +
            'border-radius:14px; padding:15px 16px;">' +
            '<div style="font-size:13px; font-weight:900; color:' + DARK + ';">' +
                '\uD83D\uDD1C 다음 카시트' +
                (when ? ' <span style="font-weight:800; color:' + PURPLE + ';">\u00b7 ' + when + '</span>' : '') +
            '</div>' +
            '<div style="margin-top:5px; font-size:12.5px; font-weight:600; color:#4E5968; ' +
                'line-height:1.75; word-break:keep-all;">' +
                (leftCm > 0 ? '키 상한까지 <b>' + leftCm + 'cm</b> 남았어요. ' : '') +
                '그다음은 <b>주니어 카시트</b>이고, 한 번 사면 대개 <b>만 12세까지</b> 씁니다.' +
                (v ? '' : '<br><span style="color:' + GRAY + ';">키를 한 번 더 재서 적어주시면 ' +
                          '<b>몇 개월 뒤인지</b>까지 세어드릴게요.</span>') +
            '</div>' +
            '<div style="margin-top:11px;">' +
                picks.map(function (x) {
                    return '<div style="display:flex; justify-content:space-between; align-items:center; ' +
                        'gap:10px; padding:9px 0; border-bottom:1px solid #F2F4F6;">' +
                        '<div style="flex:1; min-width:0; font-size:12.5px; font-weight:800; ' +
                            'color:' + DARK + '; word-break:keep-all;">' +
                            esc(x.brand) + ' ' + esc(x.name) + '</div>' +
                        '<div style="flex-shrink:0; font-size:11px; font-weight:700; color:' + GRAY + ';">' +
                            esc(String(x.bodySpec || "").replace(/[^0-9~cm세]/g, " ").trim().slice(0, 14)) + '</div>' +
                    '</div>';
                }).join("") +
            '</div>' +
            '<div style="margin-top:9px; font-size:11.5px; font-weight:600; color:' + GRAY + '; ' +
                'line-height:1.7;">서두르실 필요는 없어요. <b>키 상한에 닿을 때</b> 사시면 됩니다.</div>' +
        '</div>';
    }

    /* ==========================================================
       차를 바꿨을 때 — 몇 년에 한 번이지만 그 순간이 제일 위험하다
       ---------------------------------------------------------- */

    var INSTALL_NOTE = {
        isofix_leg: {
            name: "ISOFIX + 바닥 기둥 (서포트 레그)",
            warn: "새 차 뒷좌석 <b>바닥에 수납함이 있으면 기둥을 쓰면 안 됩니다.</b> " +
                  "뚜껑이 부서지면서 카시트가 내려앉아요. 카니발\u00b7팰리세이드 같은 차가 그렇습니다."
        },
        isofix_tether: {
            name: "ISOFIX + 탑테더",
            warn: "새 차 뒷좌석 <b>등받이 뒤에 탑테더 고리가 있는지</b> 확인하세요. " +
                  "트렁크 쪽 천장이나 바닥에 있는 차도 있습니다."
        },
        belt: {
            name: "안전벨트 고정",
            warn: "새 차에 <b>ISOFIX 고리가 있으면</b> 그쪽이 더 단단합니다. " +
                  "등받이와 방석 사이를 손으로 더듬어 쇠고리가 잡히는지 보세요."
        }
    };

    window.markCarChanged = function () {
        var o = own();
        o.carChangedAt = o.carChangedAt ? "" : today();
        save(o); paint();
    };

    function carChangeHTML(o) {
        var seat = seatById(o.id);
        var ins = (seat && seat.install && seat.install[0]) || "";
        var note = INSTALL_NOTE[ins];

        if (!o.carChangedAt) {
            return '<div onclick="window.markCarChanged()" style="margin-top:12px; ' +
                'display:flex; justify-content:space-between; align-items:center; gap:10px; ' +
                'padding:13px 15px; background: #F9FAFB; border:1px solid #E5E8EB; ' +
                'border-radius:13px; cursor:pointer;">' +
                '<div style="font-size:12.5px; font-weight:800; color:#4E5968;">' +
                    '\uD83D\uDE97 차를 바꾸셨나요?</div>' +
                '<div style="flex-shrink:0; font-size:12px; font-weight:800; color:' + BLUE + ';">' +
                    '네 \u3009</div>' +
            '</div>';
        }

        return '<div style="margin-top:12px; background:#FFF9E6; border:1px solid #F5E1A4; ' +
            'border-radius:14px; padding:15px 16px;">' +
            '<div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">' +
                '<div style="font-size:13px; font-weight:900; color:' + GOLD + ';">' +
                    '\uD83D\uDE97 차를 바꾸셨다면 이것부터</div>' +
                '<div onclick="window.markCarChanged()" style="flex-shrink:0; font-size:16px; ' +
                    'font-weight:300; color:' + GRAY + '; cursor:pointer; line-height:1;">\u00d7</div>' +
            '</div>' +
            '<div style="margin-top:6px; font-size:12.5px; font-weight:600; color:#4E5968; ' +
                'line-height:1.8; word-break:keep-all;">' +
                (note
                    ? '지금 카시트는 <b>' + note.name + '</b> 방식이에요.<br>' + note.warn
                    : '카시트 장착 방식이 새 차에 맞는지 확인하세요.') +
                '<br><br><b>차가 바뀌면 장착도 처음부터 다시입니다.</b> ' +
                '아래 <b>태우기 전 3분 점검</b>을 한 번 훑어보세요.' +
            '</div>' +
        '</div>';
    }

    /* ==========================================================
       PLUS — 우리 카시트
       ---------------------------------------------------------- */

    function seatTitle(o) {
        var s = seatById(o.id);
        if (s) return s.brand + " " + s.name;
        return o.name || "";
    }

    function manualLink(o) {
        var q = seatTitle(o);
        if (!q) return "";
        return "https://www.google.com/search?q=" + encodeURIComponent(q + " 카시트 설명서");
    }

    function bar(now, max) {
        var pct = Math.max(4, Math.min(100, Math.round(now / max * 100)));
        var near = pct >= 90;
        return '<div style="height:9px; background:#F2F4F6; border-radius:5px; overflow:hidden;">' +
            '<div style="width:' + pct + '%; height:100%; border-radius:5px; background:' +
            (near ? RED : PURPLE) + ';"></div></div>';
    }

    function row(label, value, sub, color) {
        return '<div style="padding:14px 0; border-bottom:1px solid #F2F4F6;">' +
            '<div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">' +
                '<div style="font-size:12.5px; font-weight:800; color:#4E5968;">' + label + '</div>' +
                '<div style="flex-shrink:0; font-size:14px; font-weight:900; color:' +
                    (color || DARK) + ';">' + value + '</div>' +
            '</div>' +
            (sub ? '<div style="margin-top:5px; font-size:11.5px; font-weight:600; color:' + GRAY + '; ' +
                   'line-height:1.65; word-break:keep-all;">' + sub + '</div>' : '') +
        '</div>';
    }

    function ownHTML() {
        var o = own();
        var title = seatTitle(o);

        if (!title) {
            return '<div class="matrix-panel" style="margin-bottom:20px;">' +
                '<div class="matrix-header">\uD83D\uDE98 우리 카시트</div>' +
                '<div style="font-size:13px; font-weight:600; color:' + GRAY + '; ' +
                    'margin:-16px 0 16px; line-height:1.75; word-break:keep-all;">' +
                    '쓰고 계신 카시트를 알려주시면 <b>언제까지 쓸 수 있는지</b> 세어드립니다. ' +
                    '카시트는 나이가 아니라 <b>키</b>가 기준이라, 개월수만으로는 알 수 없어요.</div>' +
                '<div onclick="window.openSeatSheet()" style="text-align:center; padding:16px; ' +
                    'background:' + DARK + '; color:#FFFFFF; border-radius:14px; ' +
                    'font-size:14.5px; font-weight:900; cursor:pointer;">카시트 알려주기</div>' +
            '</div>';
        }

        var seat = seatById(o.id);
        var autoMax = maxCmOf(seat);
        var h = Number(o.height) || 0;
        var hAge = daysSince(o.heightAt);
        var rear = Number(o.rearMax) || 0;
        var m = monthsOld();

        var out = '<div class="matrix-panel" style="margin-bottom:20px;">' +
            '<div class="matrix-header">\uD83D\uDE98 우리 카시트</div>' +

            /* 계절 경고는 제일 위. 겨울 패딩은 실제로 사고가 나는 항목이다. */
            '<div style="margin-top:-16px;"></div>' + seasonHTML() +

            '<div style="display:flex; justify-content:space-between; align-items:center; ' +
                'gap:10px; margin:0 0 6px;">' +
                '<div style="font-size:14px; font-weight:900; color:' + DARK + '; min-width:0; ' +
                    'word-break:keep-all;">' + esc(title) + '</div>' +
                '<div onclick="window.openSeatSheet()" style="flex-shrink:0; font-size:12.5px; ' +
                    'font-weight:800; color:' + BLUE + '; cursor:pointer;">고치기</div>' +
            '</div>' +
            (seat ? '<div style="font-size:11.5px; font-weight:700; color:' + GRAY + '; ' +
                    'margin-bottom:14px;">' + esc(seat.bodySpec || "") + '</div>' : '<div style="height:8px;"></div>') +

            '<a href="' + manualLink(o) + '" target="_blank" rel="noopener" ' +
                'style="display:block; text-align:center; padding:12px; background: #F9FAFB; ' +
                'border:1px solid #E5E8EB; border-radius:12px; font-size:12.5px; font-weight:800; ' +
                'color:#4E5968; text-decoration:none; margin-bottom:6px;">' +
                '\uD83D\uDCD6 설명서 찾기 \u3009</a>';

        /* ── 키 ── */
        out += '<div style="margin-top:14px; font-size:12.5px; font-weight:900; color:' + DARK + '; ' +
            'margin-bottom:8px;">' + esc(nm("의")) + ' 키</div>' +
            '<div style="display:flex; gap:8px; align-items:center; margin-bottom:10px;">' +
                '<input type="number" value="' + (h || "") + '" placeholder="78" ' +
                    'onchange="window.setSeatField(\'height\', this.value)" ' +
                    'style="width:92px; padding:12px; border-radius:11px; border:1px solid #D1D5DB; ' +
                    'background: #FFFFFF; font-size:15px; font-weight:900; color:#191F28; ' +
                    'text-align:center; box-sizing:border-box;">' +
                '<span style="font-size:13px; font-weight:800; color:#4E5968;">cm</span>' +
                '<span style="flex:1; text-align:right; font-size:11.5px; font-weight:700; color:' +
                    (hAge !== null && hAge >= HEIGHT_DAYS ? GOLD : GRAY) + ';">' +
                    (hAge === null ? "재보고 적어주세요"
                        : hAge === 0 ? "오늘 적으셨어요"
                        : hAge + "일 전 기록" + (hAge >= HEIGHT_DAYS ? " \u00b7 다시 재보실래요?" : "")) +
                '</span>' +
            '</div>';

        if (h && autoMax) {
            var leftCm = autoMax - h;
            out += bar(h, autoMax) +
                '<div style="margin-top:8px; font-size:12.5px; font-weight:600; color:#4E5968; ' +
                    'line-height:1.7; word-break:keep-all;">' +
                    '<b>' + h + " / " + autoMax + 'cm</b> \u00b7 ' +
                    (leftCm <= 0
                        ? '<b style="color:' + RED + ';">키 기준을 넘었어요. 바꾸실 때입니다.</b>'
                        : '앞으로 <b>' + leftCm + 'cm</b> 남았어요' +
                          (function () {
                              var v = cmPerMonth(o);
                              if (!v) return '.';
                              var mo = Math.round(leftCm / v);
                              return ' \u00b7 <b>약 ' + (mo < 1 ? 1 : mo) + '개월</b> 더 씁니다. ' +
                                     '<span style="color:' + GRAY + '; font-weight:600;">(한 달에 ' +
                                     v.toFixed(1) + 'cm씩 자라고 계세요)</span>';
                          })()) +
                    '<br>몸무게가 남아도 <b>키가 먼저 차면 바꿔야 합니다.</b> ' +
                    '머리 윗부분이 등받이 위로 2.5cm 안쪽까지 오면 그때예요.</div>';
        } else if (h && !autoMax) {
            out += '<div style="font-size:12px; font-weight:600; color:' + GRAY + '; line-height:1.7; ' +
                'word-break:keep-all;">이 제품은 키 기준이 안 적혀 있어요. ' +
                '<b>설명서에서 상한 키를 보고</b> 아래에 적어주시면 남은 기간을 세어드립니다.</div>';
        }

        /* ── 설명서에서 옮겨 적는 칸 ── */
        out += '<div style="margin-top:18px; background: #F9FAFB; border:1px solid #E5E8EB; ' +
            'border-radius:14px; padding:15px 16px;">' +
            '<div style="font-size:12.5px; font-weight:900; color:' + DARK + ';">' +
                '\uD83D\uDCD6 설명서에서 옮겨 적기</div>' +
            '<div style="margin-top:5px; font-size:11.5px; font-weight:600; color:' + GRAY + '; ' +
                'line-height:1.7; word-break:keep-all; margin-bottom:12px;">' +
                '제품마다 달라서 <b>우리가 정할 수 없는 숫자</b>예요. ' +
                '한 번만 옮겨 적어두시면 다시 설명서를 찾을 일이 없습니다.</div>' +

            '<div style="display:flex; align-items:center; gap:8px; margin-bottom:9px;">' +
                '<span style="flex:1; font-size:12px; font-weight:800; color:#4E5968;">뒤보기 상한 키</span>' +
                '<input type="number" value="' + (rear || "") + '" placeholder="87" ' +
                    'onchange="window.setSeatField(\'rearMax\', this.value)" ' +
                    'style="width:78px; padding:10px; border-radius:10px; border:1px solid #D1D5DB; ' +
                    'background: #FFFFFF; font-size:13.5px; font-weight:800; text-align:center; ' +
                    'box-sizing:border-box;">' +
                '<span style="font-size:12px; font-weight:800; color:' + GRAY + ';">cm</span>' +
            '</div>' +

            '<div style="display:flex; align-items:center; gap:8px;">' +
                '<span style="flex:1; font-size:12px; font-weight:800; color:#4E5968;">만료일 (옆면 스티커)</span>' +
                '<input type="month" value="' + esc(o.expireAt || "") + '" ' +
                    'onchange="window.setSeatField(\'expireAt\', this.value)" ' +
                    'style="padding:10px; border-radius:10px; border:1px solid #D1D5DB; ' +
                    'background: #FFFFFF; font-size:12.5px; font-weight:800; color:#4E5968; ' +
                    'box-sizing:border-box;">' +
            '</div>' +
        '</div>';

        /* ── 세어주는 것들 ── */
        out += '<div style="margin-top:16px;">';

        // 뒤보기
        if (rear && h) {
            var rleft = rear - h;
            out += row("뒤보기로 더 쓸 수 있는 키",
                rleft > 0 ? rleft + "cm 남음" : "상한을 넘었어요",
                rleft > 0
                    ? "<b>더 오래 뒤를 볼수록 안전합니다.</b> 다리가 접히는 건 문제가 안 돼요."
                    : "이제 앞보기로 돌리셔도 되는 키입니다. 그래도 서두르실 필요는 없어요.",
                rleft > 0 ? GREEN : GOLD);
        } else if (m !== null && m < 15) {
            out += row("앞보기 전환",
                (15 - m) + "개월 남음",
                "15개월 전에는 반드시 뒤보기입니다. 그리고 <b>15개월은 최소한이지 권장이 아니에요.</b> " +
                "위에 뒤보기 상한 키를 적어주시면 더 정확히 세어드립니다.",
                RED);
        }

        // 어깨끈
        var hd = daysSince(o.harnessAt);
        var grew = (o.harnessH && h) ? (h - Number(o.harnessH)) : null;
        /* \u26a0\ufe0f 두 달 만에 20cm 가 자랄 수는 없다.
              카시트를 바꿨거나 잘못 적은 것이다. 그럴 땐 말을 안 한다.
              틀린 숫자를 자신 있게 말하면 나머지 숫자까지 안 믿게 된다.
              (하루 0.15cm = 두 달에 9cm 쯤이 상한선) */
        if (grew !== null && hd !== null && grew > Math.max(4, hd * 0.15)) grew = null;
        out += row("어깨끈 높이 확인",
            hd === null ? "아직 안 적음" : hd + "일 전",
            (hd === null
                ? "아이가 크면 어깨끈을 다시 맞춰야 하는데, 대부분 그냥 씁니다. 맞추신 날을 눌러두세요."
                : (grew !== null && grew > 0 ? "그동안 <b>" + grew + "cm</b> 자랐어요. " : "") +
                  (hd >= HARNESS_DAYS
                      ? "<b>한 번 보실 때가 됐습니다.</b> 뒤보기는 어깨보다 아래, 앞보기는 어깨 높이나 그 위예요."
                      : "다음에 볼 때는 " + (HARNESS_DAYS - hd) + "일쯤 뒤입니다.")),
            hd !== null && hd >= HARNESS_DAYS ? GOLD : "#4E5968");

        // 유효기간
        if (o.expireAt) {
            var p = String(o.expireAt).split("-");
            var ed = new Date(Number(p[0]), Number(p[1]) - 1, 1);
            var dleft = Math.round((ed - new Date()) / 86400000);
            out += row("유효기간",
                dleft > 0 ? "D-" + dleft : "지났어요",
                dleft > 0
                    ? "플라스틱이 삭습니다. <b>중고로 넘기실 때도 이 날짜를 알려주세요.</b>"
                    : "<b>만료된 카시트는 쓰지 마시고 중고로 팔지도 마세요.</b>",
                dleft > 180 ? "#4E5968" : RED);
        }

        out += '</div>' + nextSeatHTML(o, autoMax) + carChangeHTML(o) +
            '<div style="display:flex; gap:8px; align-items:center; margin-top:14px;">' +
                '<div onclick="window.markHarness()" style="flex:1; text-align:center; ' +
                    'padding:15px; background:' + DARK + '; color:#FFFFFF; border-radius:13px; ' +
                    'font-size:13.5px; font-weight:900; cursor:pointer;">오늘 어깨끈 맞췄어요</div>' +
                '<input type="date" value="' + esc(o.harnessAt || "") + '" max="' + today() + '" ' +
                    'onchange="window.markHarness(this.value)" ' +
                    'title="예전에 맞췄으면 그 날짜를 고르세요" ' +
                    'style="flex-shrink:0; width:44px; padding:15px 6px; border-radius:13px; ' +
                    'border:1px solid #D1D5DB; background: #FFFFFF; color:' + GRAY + '; ' +
                    'font-size:11px; cursor:pointer;">' +
            '</div>' +

            '<div style="margin-top:11px; font-size:11.5px; font-weight:600; color:' + GRAY + '; ' +
                'line-height:1.7; word-break:keep-all;">' +
                '여기 숫자는 <b>세어드리는 것</b>일 뿐이에요. ' +
                '최종 기준은 늘 <b>내 카시트 설명서</b>와 <b>내 차 설명서</b>입니다.</div>' +
        '</div>';

        return out;
    }

    function teaseHTML() {
        return '<div class="matrix-panel" style="margin-bottom:20px;">' +
            '<div class="matrix-header">\uD83D\uDE98 우리 카시트</div>' +
            '<div style="background:#FFF9E6; border:1px solid #F5E1A4; border-radius:14px; ' +
                'padding:17px 16px; margin-top:-16px;">' +
                '<div style="font-size:13.5px; font-weight:900; color:' + GOLD + ';">' +
                    '언제까지 쓸 수 있는지 세어드려요</div>' +
                '<div style="margin-top:6px; font-size:12.5px; font-weight:600; color:' + GOLD + '; ' +
                    'line-height:1.8; word-break:keep-all;">' +
                    '카시트는 나이가 아니라 <b>키</b>가 기준입니다. ' +
                    esc(nm("의")) + ' 키를 넣으면 남은 기간을, ' +
                    '설명서에서 숫자 두 개만 옮겨 적으면 <b>뒤보기 여유와 만료일</b>까지 세어드려요.<br>' +
                    '어깨끈은 얼마나 자랐는지, <b>다음 카시트는 몇 개월 뒤</b>인지, ' +
                    '겨울엔 패딩\u00b7여름엔 쿨시트까지 <b>때가 되면 먼저</b> 말씀드립니다.</div>' +
            '</div>' +
        '</div>';
    }

    /* ==========================================================
       무료 — 안전은 잠그지 않는다
       ---------------------------------------------------------- */

    function coolHTML() {
        var o = own(), seat = seatById(o.id);
        var brand = seat ? seat.brand : "";
        var q = brand ? (brand + " 정품 쿨시트") : "카시트 순정 쿨시트";

        return '<div class="matrix-panel" style="margin-bottom:20px;">' +
            '<div class="matrix-header">\u2744\uFE0F 쿨시트 · 방한커버 사기 전에</div>' +

            '<div style="background:#FFF2F2; border:1px solid #FCA5A5; border-radius:14px; ' +
                'padding:15px 16px; margin:-16px 0 12px; font-size:13px; font-weight:600; ' +
                'color:#4E5968; line-height:1.8; word-break:keep-all;">' +
                '\u26A0\uFE0F <b>두꺼운 패드는 하네스를 헐겁게 만듭니다.</b> ' +
                '충돌 순간 그 두께가 눌리면서 끈에 여유가 생겨요. ' +
                '패딩을 벗기고 태우라는 것과 <b>같은 이유</b>입니다.</div>' +

            '<div style="font-size:13px; font-weight:600; color:#4E5968; line-height:1.8; ' +
                'word-break:keep-all; margin-bottom:12px;">' +
                '\u2705 <b>' + (brand ? esc(brand) + ' 순정' : '먼저 순정') + '부터 찾아보세요.</b> ' +
                '제조사가 만든 건 두께와 버클 구멍 위치를 맞춰서 냅니다.</div>' +

            '<a href="https://www.google.com/search?q=' + encodeURIComponent(q) + '" ' +
                'target="_blank" rel="noopener" style="display:block; text-align:center; padding:13px; ' +
                'background: #F9FAFB; border:1px solid #E5E8EB; border-radius:12px; ' +
                'font-size:12.5px; font-weight:800; color:#4E5968; text-decoration:none; ' +
                'margin-bottom:14px;">' + esc(q) + ' 찾아보기 \u3009</a>' +

            '<div style="font-size:12.5px; font-weight:900; color:' + DARK + '; margin-bottom:7px;">' +
                '순정이 없어서 다른 걸 사셨다면, 깔고 나서 이 셋을 보세요</div>' +
            '<div style="font-size:12.5px; font-weight:600; color:#4E5968; line-height:1.9; ' +
                'word-break:keep-all;">' +
                '\u2460 버클이 <b>딸깍 소리 나게 끝까지</b> 채워지나<br>' +
                '\u2461 채운 뒤 쇄골에서 하네스가 <b>손가락에 집히나</b> (집히면 헐거운 겁니다)<br>' +
                '\u2462 어깨끈 구멍 위치가 <b>원래 자리와 같나</b>' +
            '</div>' +
            '<div style="margin-top:11px; font-size:12px; font-weight:800; color:' + RED + '; ' +
                'line-height:1.7;">하나라도 아니면 반품하세요. 아까워하지 마시고요.</div>' +
        '</div>';
    }

    function carRideHTML() {
        return '<div class="matrix-panel" style="margin-bottom:20px;">' +
            '<div class="matrix-header">\uD83E\uDDF8 차에서 뭘 쥐여줄까</div>' +

            '<div style="background:#FFF2F2; border:1px solid #FCA5A5; border-radius:14px; ' +
                'padding:15px 16px; margin:-16px 0 12px;">' +
                '<div style="font-size:13.5px; font-weight:900; color:' + RED + '; margin-bottom:6px;">' +
                    '\uD83D\uDEA8 운전 중에는 먹이지 마세요</div>' +
                '<div style="font-size:12.5px; font-weight:600; color:#4E5968; line-height:1.8; ' +
                    'word-break:keep-all;">' +
                    '뒤보기라 백미러로도 안 보입니다. ' +
                    '<b>조용해지면 잘 먹는 게 아니라 막힌 걸 수도 있어요.</b><br>' +
                    '배고파서 우는 거면 <b>차를 세우세요.</b> 5분 서는 게 제일 빠른 길입니다.</div>' +
            '</div>' +

            '<div style="font-size:12.5px; font-weight:600; color:#4E5968; line-height:1.8; ' +
                'word-break:keep-all; margin-bottom:12px;">' +
                '\u26A0\uFE0F 급정거하면 <b>딱딱한 건 흉기가 됩니다.</b> ' +
                '플라스틱 사운드북, 태블릿 거치대는 빼세요. ' +
                '천이나 말랑한 것만 손에 쥐여주시고요.</div>' +

            '<a href="../toy/index.html" style="display:block; text-align:center; padding:13px; ' +
                'background: #F9FAFB; border:1px solid #E5E8EB; border-radius:12px; ' +
                'font-size:12.5px; font-weight:800; color:#4E5968; text-decoration:none;">' +
                '\uD83E\uDDF8 놀이 탭에 카시트에서 버티는 것들을 모아뒀어요 \u3009</a>' +
        '</div>';
    }

    function crashHTML() {
        return '<div class="matrix-panel" style="margin-bottom:20px;">' +
            '<div class="matrix-header">\uD83D\uDE97 사고가 났다면</div>' +
            '<div style="font-size:13px; font-weight:600; color:#4E5968; line-height:1.8; ' +
                'margin:-16px 0 12px; word-break:keep-all;">' +
                '\u26A0\uFE0F <b>가벼운 접촉사고라도 카시트는 교체 대상일 수 있습니다.</b> ' +
                '겉이 멀쩡해도 안쪽 구조가 상해요. 눈에 안 보입니다.</div>' +

            '<div style="background: #F9FAFB; border:1px solid #E5E8EB; border-radius:14px; ' +
                'padding:15px 16px; font-size:12.5px; font-weight:600; color:#4E5968; ' +
                'line-height:2; word-break:keep-all;">' +
                '\u25A1 카시트 사진을 찍어두세요 <b>(장착된 그대로)</b><br>' +
                '\u25A1 사고 접수 번호를 적어두세요<br>' +
                '\u25A1 보험사에 <b>카시트 교체 청구가 되는지</b> 물어보세요<br>' +
                '\u25A1 제조사 고객센터에 사고 사실을 알리세요<br>' +
                '\u25A1 그 카시트는 <b>다시 쓰지 마시고, 중고로 팔지도 마세요</b>' +
            '</div>' +

            '<div style="margin-top:11px; font-size:11.5px; font-weight:600; color:' + GRAY + '; ' +
                'line-height:1.7; word-break:keep-all;">' +
                '보상 여부는 보험사와 약관이 정합니다. ' +
                '우리는 <b>물어볼 것만</b> 정리해드려요.</div>' +
        '</div>';
    }

    function washHTML() {
        return '<div class="matrix-panel" style="margin-bottom:20px;">' +
            '<div class="matrix-header">\uD83E\uDDFC 토했을 때</div>' +
            '<div style="font-size:13px; font-weight:600; color:#4E5968; line-height:1.8; ' +
                'margin:-16px 0 12px; word-break:keep-all;">' +
                '<b>하네스에 세제를 쓰지 마세요.</b> 세제나 유연제가 닿으면 섬유가 약해집니다. ' +
                '충돌 때 아이를 붙잡아야 하는 그 끈이에요.</div>' +
            '<div style="font-size:12.5px; font-weight:600; color:#4E5968; line-height:2; ' +
                'word-break:keep-all;">' +
                '\u2705 미지근한 물에 적신 천으로 <b>닦기만</b> 하세요<br>' +
                '\u274C 세탁기 \u00b7 세제 \u00b7 유연제 \u00b7 표백제 \u00b7 건조기<br>' +
                '\u2705 커버는 분리해서 세탁 (방법은 설명서 확인)' +
            '</div>' +
        '</div>';
    }

    /* ---------- 자리 ---------- */

    function paint() {
        var host = document.getElementById(HOST);
        if (!host) return;
        host.innerHTML = (isPlus() ? ownHTML() : teaseHTML()) +
                         coolHTML() + carRideHTML() + crashHTML() + washHTML();
        try { if (typeof window.refreshPlusMark === "function") window.refreshPlusMark(); } catch (e) {}
    }
    window.refreshCarseatOwn = paint;

    function mount() {
        if (document.getElementById(HOST)) return;
        var anchor = document.getElementById("carseat-guide") ||
                     document.querySelector(".matrix-panel");
        if (!anchor || !anchor.parentNode) return;
        var box = document.createElement("div");
        box.id = HOST;
        anchor.parentNode.insertBefore(box, anchor.nextSibling);
        paint();
    }

    function boot() {
        /* \u26a0\ufe0f 늦게 붙으면 그 칸이 한동안 비어 보인다.
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

    window.carseatOwnDebug = function () {
        var o = own(), seat = seatById(o.id);
        console.log("PLUS:", isPlus(), "· 개월수:", monthsOld());
        console.log("등록한 카시트:", seatTitle(o) || "없음");
        console.log("데이터의 키 상한:", seat ? (maxCmOf(seat) || "없음 (설명서에서 적어야 함)") : "-");
        console.log("아기 키:", o.height || "없음",
                    o.heightAt ? "(" + daysSince(o.heightAt) + "일 전 기록)" : "");
        console.log("뒤보기 상한(적어둔 것):", o.rearMax || "없음");
        console.log("만료일(적어둔 것):", o.expireAt || "없음");
        console.log("어깨끈 마지막 확인:", o.harnessAt || "없음",
                    o.harnessH ? "(그때 키 " + o.harnessH + "cm)" : "");
        console.log("성장 속도:", (function () { var v = cmPerMonth(o); return v ? v.toFixed(2) + "cm/월" : "잰 값이 두 번 이상 있어야 나옴"; })());
        console.log("키 기록:", (o.hist || []).map(function (x) { return x.at + " " + x.cm + "cm"; }).join(" \u2192 ") || "없음");
        console.log("이번 달 계절 안내:", (function () { var m = new Date().getMonth() + 1; return (m >= 11 || m <= 2) ? "겨울 패딩" : (m >= 6 && m <= 8) ? "여름 쿨시트" : "없음"; })());
        console.log("차 바꿈 표시:", own().carChangedAt || "꺼짐");
        console.log("키 상한이 데이터에 있는 제품:",
            seats().filter(function (s) { return maxCmOf(s); }).length + " / " + seats().length);
        console.log("붙었나:", !!document.getElementById(HOST));
    };
})();