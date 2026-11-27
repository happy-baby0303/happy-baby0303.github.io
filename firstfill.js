/* ============================================================
   배냇함 — 첫 담기 (firstfill.js)

   기능이 백 개여도 3주 동안 아무것도 안 쌓이면 앱을 지운다.
   반대로 첫날 세 개가 쌓이면 안 지운다. 버릴 게 생겼으니까.

   그래서 가입하고 3분 안에 배냇함에 세 개를 넣는다.
     사진 한 장  — 오늘의 얼굴
     소리 30초   — 두 달 뒤엔 안 나는 소리
     봉인 편지   — 스무 살에 열리는 것

   마지막이 핵심이다. 7,138 이라는 숫자를 본 사람은 그날 앱을 안 지운다.

   기존 온보딩은 손대지 않는다. 저장과 새로고침이 끝난 뒤에 뜬다.
   index.html 에서 sealed.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var FLAG = "tosil_firstfill";
    var GOLD = "#B98A2E";
    var PURPLE = "#7F77DD";
    var DAY = 86400000;

    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    function babyName() { return localStorage.getItem("tosil_babyName") || "우리 아기"; }

    /* 세 칸의 그림 — 배냇함 그림(box.webp)과 같은 결: 갈색 선 · 크림 · 금색 · 연보라.
       ⚠️ 예전엔 📷 🎙️ 🕯️ 이모지를 크게 띄웠다. 가입하고 처음 보는 화면인데 어느 앱에나 있는 그림이었고,
          폰마다 모양도 달랐다 (삼성 · 아이폰 이모지가 다르다).
       사진은 테이프로 붙인 사진 한 장 (배냇함 탭 '함에 붙일 사진' 과 같은 모양),
       소리는 카세트테이프 (목소리를 담아 두는 것), 편지는 봉인 도장을 찍은 봉투. */
    var INK = "#5B4636";
    var ART = {
        photo: '<svg viewBox="0 0 120 120" width="96" height="96" aria-hidden="true"><g transform="rotate(-6 60 62)">' +
            '<rect x="22" y="16" width="76" height="90" rx="4" fill="#FFFFFF" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
            '<rect x="30" y="24" width="60" height="58" rx="2" fill="#DCD6F7"/>' +
            '<circle cx="74" cy="40" r="7" fill="#E3BE6A"/>' +
            '<path d="M30 82 L30 66 Q46 52 60 64 Q72 56 90 66 L90 82 Z" fill="#CFE2C6"/>' +
            '<rect x="30" y="24" width="60" height="58" rx="2" fill="none" stroke="' + INK + '" stroke-width="3"/>' +
            '<rect x="45" y="8" width="30" height="13" rx="2" fill="#E3BE6A" fill-opacity=".85" transform="rotate(4 60 14)"/></g></svg>',
        voice: '<svg viewBox="0 0 120 120" width="96" height="96" aria-hidden="true">' +
            '<rect x="12" y="28" width="96" height="66" rx="9" fill="#FFF8EA" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
            '<rect x="24" y="38" width="72" height="28" rx="5" fill="#DCD6F7" stroke="' + INK + '" stroke-width="3"/>' +
            '<circle cx="44" cy="52" r="8" fill="#FFFFFF" stroke="' + INK + '" stroke-width="3"/>' +
            '<circle cx="76" cy="52" r="8" fill="#FFFFFF" stroke="' + INK + '" stroke-width="3"/>' +
            '<path d="M52 52 L68 52" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
            '<path d="M36 94 L42 78 L78 78 L84 94" fill="#E3BE6A" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
            '<path d="M14 20 Q20 14 26 20 M94 20 Q100 14 106 20" fill="none" stroke="#C9A253" stroke-width="3" stroke-linecap="round"/></svg>',
        seal: '<svg viewBox="0 0 120 120" width="96" height="96" aria-hidden="true">' +
            '<rect x="12" y="30" width="96" height="66" rx="7" fill="#FFF8EA" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
            '<path d="M16 34 L60 66 L104 34" fill="none" stroke="' + INK + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>' +
            '<circle cx="60" cy="70" r="15" fill="#D99A3D" stroke="' + INK + '" stroke-width="3.5"/>' +
            '<path d="M60 77 c-4 -3 -9 -6 -9 -10 c0 -3 3 -5 5 -5 c2 0 3 1 4 3 c1 -2 2 -3 4 -3 c2 0 5 2 5 5 c0 4 -5 7 -9 10 z" fill="#FFF3DA"/>' +
            '<path d="M92 12 L94 20 L102 22 L94 24 L92 32 L90 24 L82 22 L90 20 Z" fill="#E3BE6A"/></svg>'
    };
    /* 끝 화면 칩에 붙는 작은 그림 (위 그림을 16px 로) */
    function mini(k) { return ART[k].replace('width="96" height="96"', 'width="18" height="18" style="vertical-align:-4px;"'); }

    /* ⚠️ 가입하고 제일 먼저 보는 화면인데 "서준를", "서준가 꺼내 볼" 이 나왔다.
          받침이 있으면 '이' 를 붙인다 (data.js 의 babyCall). */
    function callName(j) {
        try { if (typeof window.babyCall === "function") return window.babyCall(j || ""); } catch (e) {}
        var n = babyName(), c = n.charCodeAt(n.length - 1);
        var jong = c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0;
        return n + (jong && n !== "우리 아기" ? "이" : "") + (j || "");
    }

    function todayKey() {
        var d = new Date();
        return d.getFullYear() + "-" +
               String(d.getMonth() + 1).padStart(2, "0") + "-" +
               String(d.getDate()).padStart(2, "0");
    }

    function comma(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }

    // 스무 살까지 며칠 남았나 — 이 숫자가 이 화면의 전부다
    function daysToTwenty() {
        var s = localStorage.getItem("tosil_startDate");
        if (!s) return null;
        var p = s.split("-");
        var b = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
        if (isNaN(b.getTime())) return null;
        var at = new Date(b.getFullYear() + 20, b.getMonth(), b.getDate());
        var t = new Date(); t.setHours(0, 0, 0, 0);
        return Math.max(0, Math.ceil((at - t) / DAY));
    }

    /* ---------- 지금 몇 개나 담겼나 ---------- */

    function counts() {
        return {
            photo: (typeof window.photoCount === "function") ? window.photoCount() : 0,
            voice: (typeof window.voiceCount === "function") ? window.voiceCount() : 0,
            seal:  (typeof window.sealedCount === "function") ? window.sealedCount() : 0
        };
    }

    function has(kind) { return counts()[kind] > 0; }

    /* ---------- 화면 ---------- */

    var step = 0;          // 0 인사 · 1 사진 · 2 소리 · 3 편지 · 4 완료
    var poll = null;

    function stopPoll() {
        if (poll) { clearInterval(poll); poll = null; }
    }

    // 시트에서 담기가 끝나면 알아서 다음으로 넘어간다
    function waitFor(kind, then) {
        stopPoll();
        var before = counts()[kind];
        var tries = 0;
        poll = setInterval(function () {
            tries++;
            if (counts()[kind] > before) { stopPoll(); then(); return; }
            if (tries > 240) stopPoll();          // 2분이면 그만 기다린다
        }, 500);
    }

    window.closeFirstFill = function () {
        stopPoll();
        try { localStorage.setItem(FLAG, "done"); } catch (e) {}
        var el = document.getElementById("firstfill");
        if (el) el.remove();
        document.body.style.overflow = "";
        if (typeof window.renderMemoryBox === "function") {
            try { window.renderMemoryBox(); } catch (e) {}
        }
    };

    /* ⚠️ '배냇함 열어보기' 를 눌러도 닫히기만 하고 홈에 남았다. 이름대로 배냇함 탭을 연다 */
    window.firstFillOpenBox = function () {
        window.closeFirstFill();
        try { if (typeof window.switchTab === "function") window.switchTab("memorybox", document.getElementById("nav-memorybox")); } catch (e) {}
    };

    window.firstFillNext = function () {
        stopPoll();
        step++;
        if (step > 4) return window.closeFirstFill();
        draw();
    };

    window.firstFillSkip = function () {
        stopPoll();
        step = (step >= 3) ? 4 : step + 1;
        draw();
    };

    window.firstFillPhoto = function () {
        if (typeof window.addDayPhoto !== "function") return window.firstFillSkip();
        waitFor("photo", function () { step = 2; draw(); });
        window.addDayPhoto(todayKey());
    };

    window.firstFillVoice = function () {
        if (typeof window.openVoiceSheet !== "function") return window.firstFillSkip();
        waitFor("voice", function () { step = 3; draw(); });
        window.openVoiceSheet(todayKey());
    };

    window.firstFillSeal = function () {
        if (typeof window.openSealSheet !== "function") return window.firstFillSkip();
        waitFor("seal", function () { step = 4; draw(); });

        // 화면이 '스무 살'이라고 약속했으니 그대로 연다.
        // 여기서 다섯 개 중에 고르게 하면 약속이 깨지고, 고민이 이탈이 된다.
        var fixed = (typeof window.sealPresetBy === "function") ? window.sealPresetBy("스무 살") : null;
        window.openSealSheet(fixed || undefined);
    };

    /* ---------- 그리기 ---------- */

    function shell(inner) {
        var el = document.getElementById("firstfill");
        if (!el) {
            el = document.createElement("div");
            el.id = "firstfill";
            // 시트(z-index 100002~3)보다 아래. 시트가 이 위에 떠야 한다.
            el.setAttribute("style", "position:fixed; inset:0; z-index:99990; background:var(--bg-main); " +
                "overflow-y:auto; -webkit-overflow-scrolling:touch;");
            document.body.appendChild(el);
            document.body.style.overflow = "hidden";
        }
        el.innerHTML =
            '<div style="max-width:460px; margin:0 auto; min-height:100%; padding:0 26px ' +
                'calc(40px + env(safe-area-inset-bottom, 0px)); box-sizing:border-box; ' +
                'display:flex; flex-direction:column;">' + inner + '</div>';
    }

    function stepMark(n) {
        return '<div style="display:flex; gap:5px; justify-content:center; padding:28px 0 0;">' +
            [1, 2, 3].map(function (i) {
                return '<div style="width:' + (i === n ? 20 : 6) + 'px; height:6px; border-radius:3px; ' +
                    'background:' + (i <= n ? PURPLE : "var(--border)") + '; transition:0.25s;"></div>';
            }).join("") +
        '</div>';
    }

    function ask(n, icon, title, body, cta, act, skipLabel) {
        return stepMark(n) +
            '<div style="flex:1; display:flex; flex-direction:column; justify-content:center; text-align:center; padding:24px 0;">' +
                '<div style="display:flex; justify-content:center; margin-bottom:22px;">' + icon + '</div>' +
                '<div class="serif-display" style="font-size:23px; font-weight:700; color:var(--text-title); ' +
                    'letter-spacing:-0.6px; line-height:1.45; word-break:keep-all;">' + title + '</div>' +
                '<div style="font-size:13.5px; font-weight:600; color:var(--text-sub); line-height:1.85; ' +
                    'margin-top:16px; word-break:keep-all;">' + body + '</div>' +
            '</div>' +
            '<div>' +
                '<div onclick="' + act + '" style="text-align:center; padding:17px; background:' + PURPLE + '; ' +
                    'color:#FFF; border-radius:16px; font-size:15.5px; font-weight:800; cursor:pointer;">' + esc(cta) + '</div>' +
                '<div onclick="window.firstFillSkip()" style="text-align:center; padding:15px; font-size:13px; ' +
                    'font-weight:700; color:var(--text-sub); cursor:pointer;">' + esc(skipLabel || "나중에 담을게요") + '</div>' +
            '</div>';
    }

    function draw() {
        var name = esc(babyName());

        if (step === 0) {
            // 짝꿍 초대로 들어온 폰은 상자를 '연' 게 아니라 '들어온' 것이다 (connectSyncCode 가 tosil_joined_at 을 남긴다)
            var joined = !!localStorage.getItem("tosil_joined_at");
            shell(
                '<div style="flex:1; display:flex; flex-direction:column; justify-content:center; text-align:center;">' +
                    '<img src="./box.webp" alt="" width="132" height="103" style="display:block; width:132px; height:auto; margin:0 auto 22px;">' +
                    '<div class="serif-display" style="font-size:25px; font-weight:700; color:var(--text-title); ' +
                        'letter-spacing:-0.6px; line-height:1.45;">' + name + (joined ? '의 배냇함에<br>들어왔어요' : '의 배냇함을<br>열었어요') + '</div>' +
                    '<div style="font-size:14px; font-weight:600; color:var(--text-sub); line-height:1.9; margin-top:20px; word-break:keep-all;">' +
                        '여기 담긴 건 나중에<br>' + esc(callName("가")) + ' 꺼내 볼 것들이에요.<br><br>' +
                        '3분이면 첫 세 가지를 담을 수 있어요.' +
                    '</div>' +
                '</div>' +
                '<div>' +
                    '<div onclick="window.firstFillNext()" style="text-align:center; padding:17px; background:' + PURPLE + '; ' +
                        'color:#FFF; border-radius:16px; font-size:15.5px; font-weight:800; cursor:pointer;">첫 담기 시작하기</div>' +
                    '<div onclick="window.closeFirstFill()" style="text-align:center; padding:15px; font-size:13px; ' +
                        'font-weight:700; color:var(--text-sub); cursor:pointer;">그냥 둘러볼게요</div>' +
                '</div>'
            );

        } else if (step === 1) {
            shell(ask(1, ART.photo,
                unborn() ? "기다리는 지금을<br>한 장만" : "오늘의 " + esc(callName("를")) + "<br>한 장만",
                unborn() ? "초음파 사진도, 배 사진도 좋아요.<br>잘 찍을 필요 없어요."
                         : "잘 찍을 필요 없어요.<br>자는 얼굴 한 장이면 충분해요.",
                "사진 고르기", "window.firstFillPhoto()"));

        } else if (step === 2) {
            var g = (typeof window.guideWhat === "function") ? window.guideWhat() : "";
            shell(ask(2, ART.voice,
                unborn() ? esc(callName("에게")) + " 들려줄<br>목소리를 30초만" : "지금 나는 소리를<br>30초만",
                unborn() ? "인사 한마디도, 자장가 한 소절도 좋아요."
                         : (g ? esc(g) + "도 좋고, " : "") + "옹알이도, 숨소리도, 하품도 좋아요.<br>두 달 뒤엔 다른 소리를 내요.",
                "녹음하기", "window.firstFillVoice()"));

        } else if (step === 3) {
            var left = daysToTwenty();
            shell(ask(3, ART.seal,
                "스무 살 " + esc(callName("에게")) + "<br>한 줄만 남겨두기",
                "지금 마음은 지금만 쓸 수 있어요.<br>" +
                (left ? '<span style="color:' + GOLD + '; font-weight:800;">' + comma(left) + '일</span> 뒤에 ' + esc(callName("가")) + ' 읽게 돼요.'
                      : esc(callName("가")) + " 언젠가 읽게 돼요."),
                "편지 남기기", "window.firstFillSeal()"));

        } else {
            var c = counts();
            var got = [];
            if (c.photo) got.push({ i: mini("photo"), t: "사진 " + c.photo });
            if (c.voice) got.push({ i: mini("voice"), t: "소리 " + c.voice });
            if (c.seal)  got.push({ i: mini("seal"), t: "편지 " + c.seal });

            var chips = got.length
                ? '<div style="display:flex; gap:8px; justify-content:center; margin-top:26px;">' +
                    got.map(function (x) {
                        return '<div style="padding:11px 15px; background:var(--bg-card); border:1px solid var(--border); ' +
                            'border-radius:14px; font-size:12.5px; font-weight:800; color:var(--text-s);">' +
                            x.i + ' ' + esc(x.t) + '</div>';      // x.i 는 위의 그림 (글자 아님)
                    }).join("") +
                  '</div>'
                : "";

            var tail;
            if (c.seal) {
                var d = daysToTwenty();
                tail = d ? comma(d) + '일 뒤에<br>' + esc(callName("가")) + ' 그 편지를 열어요.'
                         : esc(callName("가")) + ' 언젠가 그 편지를 열어요.';
            } else if (got.length) {
                tail = '오늘부터 하나씩 쌓여요.';
            } else {
                tail = '아무 때나 담기 시작하면 돼요.<br>배냇함은 언제든 열려 있어요.';
            }

            shell(
                '<div style="flex:1; display:flex; flex-direction:column; justify-content:center; text-align:center;">' +
                    '<img src="./box.webp" alt="" width="132" height="103" style="display:block; width:132px; height:auto; margin:0 auto 20px;">' +
                    '<div class="serif-display" style="font-size:24px; font-weight:700; color:var(--text-title); ' +
                        'letter-spacing:-0.6px; line-height:1.45;">' +
                        (got.length ? '배냇함에 ' + got.length + '가지가<br>담겼어요' : name + '의 배냇함이<br>준비됐어요') + '</div>' +
                    chips +
                    '<div style="font-size:14px; font-weight:600; color:var(--text-sub); line-height:1.9; margin-top:26px; word-break:keep-all;">' +
                        tail + '</div>' +
                '</div>' +
                '<div onclick="window.firstFillOpenBox()" style="text-align:center; padding:17px; background:' + PURPLE + '; ' +
                    'color:#FFF; border-radius:16px; font-size:15.5px; font-weight:800; cursor:pointer;">배냇함 열어보기</div>'
            );
        }
    }

    /* ---------- 언제 뜨나 ---------- */

    window.openFirstFill = function (from) {
        step = from || 0;
        draw();
    };

    // 할머니 · 시터 선생님 폰 — 봉인 편지 · 소리 칸은 엄마 아빠 것이다 (돌봄 도우미는 서버에서 못 읽는다)
    function isHelper() {
        return localStorage.getItem("tosil_role_locked") === "viewer" || localStorage.getItem("user_role") === "senior";
    }

    /* 예정일을 넣은 집 (배 속 아기) */
    function unborn() {
        var s = localStorage.getItem("tosil_startDate");
        if (!s) return false;
        var d = new Date(), k = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
        return s > k;
    }

    function shouldShow() {
        if (localStorage.getItem(FLAG)) return false;          // 한 번 보면 다시 안 뜬다
        if (isHelper()) return false;
        if (!localStorage.getItem("tosil_babyName")) return false;  // 온보딩 전
        if (!localStorage.getItem("tosil_startDate")) return false;
        var c = counts();
        return (c.photo + c.voice + c.seal) === 0;              // 이미 담은 게 있으면 필요 없다
    }

    /* ⚠️ '이 폰은 누구 폰인가요?' 보다 먼저 떠서, 역할을 고르기 전에 스무 살 편지를 썼다.
          편지에는 '엄마가 쓰는 편지' 가 붙는다 (역할이 없으면 엄마로 친다). 아빠가 먼저 깔면 아빠 편지가 엄마 이름으로 봉인됐다.
          역할이 정해질 때까지 기다린다 (초대 링크로 들어온 짝꿍도 같다). */
    function roleReady() {
        return !!(localStorage.getItem("user_role") || localStorage.getItem("tosil_role_locked"));
    }

    function boot() {
        // 앱이 자리를 잡고 나서. 로그인·동기화가 끝나야 업로드가 된다.
        var tries = 0;
        setTimeout(function wait() {
            if (!roleReady()) { if (++tries < 240) setTimeout(wait, 1000); return; }   // 역할 창에 답할 때까지 (4분)
            setTimeout(function () { if (shouldShow()) window.openFirstFill(0); }, tries ? 700 : 0);
        }, 2200);
    }

    /* 역할을 고른 직후 첫 담기가 뜰 차례인가 (script.js selectRoleOnboarding — 그때는 알림을 띄우지 않는다) */
    window.firstFillPending = function () { try { return shouldShow(); } catch (e) { return false; } };

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    /* ---------- 점검용 ---------- */
    window.firstFillDebug = function (reset) {
        if (reset) { localStorage.removeItem(FLAG); console.log("첫 담기 초기화 — 새로고침하면 다시 뜹니다"); }
        console.log("본 적 있음:", !!localStorage.getItem(FLAG));
        console.log("담긴 것:", counts());
        console.log("스무 살까지:", comma(daysToTwenty() || 0) + "일");
    };
})();