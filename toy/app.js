// ==========================================
// 🧸 배냇함 장난감 · 놀이 큐레이터 (toy/app.js)
// ==========================================
let isFavViewMode = false; 

try {
    if (typeof Kakao !== 'undefined' && !Kakao.isInitialized()) {
        Kakao.init('68bca10ddfe2ec67112b07eb9a08da2b');
    }
} catch (e) {
    console.warn("카카오 SDK 초기화 에러", e);
}

/* 🔀 뺀 장난감 번호 → 같은 상품 번호. 25번은 74번과 같은 쿠팡 상품이라 뺐다.
   찜(favToys) · 우리 집 장난감(tosil_my_toys) 에 남은 25 는 74 로 옮기고, 예전에 보낸 링크(?toy=25)도 74 로 간다.
   TOY_GONE 은 옮길 곳 없이 뺀 번호 — 75번(무게로 눌러 재우는 신생아 이불, 아기 잠 안전 기준에 어긋남).
   남겨 두면 찜 보관함이 '(0개)' 로 비어 보이거나 우리 집 장난감에 빈 칸이 생긴다. */
const TOY_MOVED = { 25: 74 };
const TOY_GONE = [75];
(function () {
    ['favToys', 'tosil_my_toys'].forEach(function (key) {
        try {
            const a = JSON.parse(localStorage.getItem(key) || 'null');
            if (!Array.isArray(a) || !a.some(x => TOY_MOVED[Number(x)] || TOY_GONE.indexOf(Number(x)) > -1)) return;
            const out = [];
            a.forEach(x => {
                if (TOY_GONE.indexOf(Number(x)) > -1) return;
                const n = TOY_MOVED[Number(x)] || Number(x);
                if (out.indexOf(n) === -1) out.push(n);
            });
            localStorage.setItem(key, JSON.stringify(out));
        } catch (e) {}
    });
})();

// ✨ 통합 필터링을 위한 전역 상태 관리
let globalMilestone = 'all'; 
let currentToyTheme = 'all';

document.addEventListener('DOMContentLoaded', () => {
    applyGlobalBabyProfile(); // 아기 개월수 세팅 및 초기 렌더링
    
    // (장난감 탭) 마일스톤 칩 클릭 이벤트
    const msChips = document.querySelectorAll('.ms-chip');
    const themeCards = document.querySelectorAll('.theme-card');

    msChips.forEach(chip => {
        chip.addEventListener('click', (e) => {
            msChips.forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            
            globalMilestone = e.target.getAttribute('data-milestone');
            updateToyView(); // ✨ 통합 필터링 함수 호출
            
            document.getElementById('view-toy-gear').scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    // (장난감 탭) SOS 테마 카드 클릭 이벤트
    themeCards.forEach(card => {
        card.addEventListener('click', (e) => {
            // 이미 선택된 테마를 다시 누르면 선택 해제 (전체보기)
            if (e.currentTarget.classList.contains('active')) {
                e.currentTarget.classList.remove('active');
                currentToyTheme = 'all';
            } else {
                themeCards.forEach(c => c.classList.remove('active'));
                e.currentTarget.classList.add('active');
                currentToyTheme = e.currentTarget.getAttribute('data-theme');
            }
            
            updateToyView(); // ✨ 통합 필터링 함수 호출
            document.getElementById('view-toy-gear').scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
});

function applyGlobalBabyProfile() {
    const birthStr = window.BabyAge ? window.BabyAge.key() : localStorage.getItem('tosil_startDate');   // 이른둥이는 교정 나이로 (shared/babyage.js)
    let autoMilestone = 'all'; 
    /* 맨 위 뱃지 — 배 속 아기는 '출산 준비', 한 달 전은 '신생아 맞춤', 생일이 없으면 숨김 (shared/curatorui.js) */
    if (window.paintAgeBadge) window.paintAgeBadge(false);

    if (birthStr) {
        const [by, bm, bd] = birthStr.split('-').map(Number);
        const birthDate = new Date(by, bm - 1, bd);
        const today = new Date();
        let months = (today.getFullYear() - birthDate.getFullYear()) * 12
                   + (today.getMonth() - birthDate.getMonth());
        if (today.getDate() < birthDate.getDate()) months--;
        if (months < 0) months = 0;

        if (!window.paintAgeBadge) document.querySelectorAll('.dynamic-age-badge').forEach(b => {
            b.innerText = `${window.BabyAge ? window.BabyAge.pre('생후 ') : '생후 '}${months}개월 맞춤`;
        });

               /* ⚠️ 놀이 탭(playweek·playlog)과 같은 기준이어야 한다.
              여기만 newborn 을 안 고르면 신생아템 17개가 안 보인다. */
        if (months < 2) autoMilestone = 'newborn';
        else if (months < 4) autoMilestone = 'tummy';
        else if (months < 7) autoMilestone = 'flip';
        else if (months < 10) autoMilestone = 'crawl';
        else autoMilestone = 'stand';
        
        globalMilestone = autoMilestone;

        const targetChip = document.querySelector(`.ms-chip[data-milestone="${autoMilestone}"]`);
        if (targetChip) {
            document.querySelectorAll('.ms-chip').forEach(c => c.classList.remove('active'));
            targetChip.classList.add('active');
        }
    }

    // 초기 화면 렌더링
    renderPlays(); 
    updateToyView(); 
}

// ✨ 테마 + 발달단계 교집합 통합 필터링 함수
window.moreToys = function () { window.__toyShow = (window.__toyShow || 8) + 8; updateToyView(); };

function updateToyView() {
    if (isFavViewMode) return;
    // 발달 단계 · 테마를 바꾸면 처음 8개부터
    const key = currentToyTheme + '|' + globalMilestone;
    if (window.__toyKey !== key) { window.__toyKey = key; window.__toyShow = 8; }

    const filteredData = toyData.filter(t => {
        const themeMatch = currentToyTheme === 'all' || t.theme === currentToyTheme;
        const msMatch = globalMilestone === 'all' || t.milestone === globalMilestone || t.milestone === 'all';
        return themeMatch && msMatch;
    });

    renderToys(filteredData);
}

// ==========================================
// 🔀 투 트랙 UI 스위치 로직
// ==========================================
function switchToyMainTab(tabId) {
    if (navigator.vibrate) navigator.vibrate(10);

    const btnPlay = document.getElementById('tab-btn-play');
    const btnGear = document.getElementById('tab-btn-gear');
    const viewPlay = document.getElementById('view-toy-play');
    const viewGear = document.getElementById('view-toy-gear');

    if (tabId === 'play') {
        btnPlay.classList.add('tab-on');    btnPlay.classList.remove('tab-off');
        btnGear.classList.add('tab-off');   btnGear.classList.remove('tab-on');
        viewPlay.style.display = 'block';
        viewGear.style.display = 'none';
    } else {
        btnGear.classList.add('tab-on');    btnGear.classList.remove('tab-off');
        btnPlay.classList.add('tab-off');   btnPlay.classList.remove('tab-on');
        viewPlay.style.display = 'none';
        viewGear.style.display = 'block';
        const row = document.getElementById('milestone-filters'), on = row && row.querySelector('.ms-chip.active');
        if (row && on) row.scrollLeft = Math.max(0, on.offsetLeft - row.offsetLeft - (row.clientWidth - on.offsetWidth) / 2);
    }
}

// ==========================================
// 🎈 놀이 처방전 렌더링 및 찜하기 로직
// ==========================================
let currentPlayCategory = 'all';

function togglePlayFavorite(id, btn, event) {
    if (event) event.stopPropagation();
    let favs = JSON.parse(localStorage.getItem('favPlays')) || [];
    
    if (favs.includes(id)) {
        favs = favs.filter(f => f !== id);
        btn.innerHTML = '🤍';
        window.showToast('찜을 풀었어요');
    } else {
        favs.push(id);
        btn.innerHTML = '❤️';
        window.showToast('❤️ 찜했어요. 위의 \'찜한 놀이\'에서 모아 볼 수 있어요');
    }
    localStorage.setItem('favPlays', JSON.stringify(favs));
    
    // 찜 필터 모드일 때 하트 해제하면 화면에서 즉시 사라지게!
    if (currentPlayCategory === 'fav') renderPlays();
}

function filterPlays(category, btnEl) {
    document.querySelectorAll('.play-filter-btn').forEach(btn => btn.classList.remove('active'));
    btnEl.classList.add('active');
    currentPlayCategory = category;
    window.__playShow = PLAY_STEP;
    renderPlays();
    document.getElementById('view-toy-play').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------- 놀이 목록 ----------
   ⚠️ 놀이 예순 개가 순서 · 아빠 역할 · 단추까지 다 펼쳐져 있어서 이 탭이 5만 px 였다.
      카드에는 제목 · 한 줄 설명 · 시간 · 준비물만 두고, '어떻게 놀아요' 를 누르면 펼친다.
      처음엔 10개, '더 보기' 로 10개씩 더 그린다. */
var PLAY_STEP = 10;
window.__playShow = window.__playShow || PLAY_STEP;
window.__playOpen = window.__playOpen || {};

/* '보내기' 받는 사람: 엄마가 쓰면 아빠에게, 아빠가 쓰면 엄마에게, 할머니 · 시터는 엄마 아빠에게 */
function playShareTo() {
    const role = localStorage.getItem('user_role') || '';
    return role === 'dad' ? '엄마' : role === 'senior' ? '엄마 아빠' : '아빠';
}

window.togglePlayCard = function (id) {
    window.__playOpen[id] = !window.__playOpen[id];
    const more = document.getElementById('play-more-' + id);
    const btn = document.getElementById('play-open-' + id);
    if (more) more.style.display = window.__playOpen[id] ? 'block' : 'none';
    if (btn) btn.textContent = window.__playOpen[id] ? '접기 ▴' : '어떻게 놀아요 ▾';
};

window.morePlays = function () {
    window.__playShow = (window.__playShow || PLAY_STEP) + PLAY_STEP;
    renderPlays();
};

function renderPlays() {
    const container = document.getElementById('play-result-area');
    const favs = JSON.parse(localStorage.getItem('favPlays')) || [];

    const filtered = playData.filter(p => {
        // 🚨 리뷰어님 피드백 반영: 찜 필터일 땐 찜한 것만! 아닐 땐 월령(globalMilestone) 필터 무조건 적용!
        const ageMatch = globalMilestone === 'all' || (p.targetAge && p.targetAge.includes(globalMilestone));

        if (currentPlayCategory === 'fav') return favs.includes(p.id);

        const catMatch = currentPlayCategory === 'all' || p.category === currentPlayCategory;
        return catMatch && ageMatch;
    });
    window.__playList = filtered;

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="premium-empty-state" style="padding:40px; text-align:center; background:#FFF; border-radius:16px; border:1px dashed #DCD3C8; margin-top: 16px;">
                <div class="empty-icon" style="font-size:40px; margin-bottom:12px;">🥲</div>
                <div class="empty-text">
                    <b style="font-size:16px; color:#4A413C; font-weight:800; display:block; margin-bottom:6px;">조건에 맞는 놀이가 없어요</b>
                    <span style="font-size:13px; color:#A3958A;">다른 놀이 테마나 찜 목록을 확인해 보세요.</span>
                </div>
            </div>`;
        return;
    }

    const shareTo = playShareTo();
    const show = Math.min(window.__playShow || PLAY_STEP, filtered.length);
    let html = '';
    filtered.slice(0, show).forEach(p => {
        let badgeColor = '#7F77DD', badgeBg = '#F0EEFB', badgeText = '🧸 장난감으로';
        if (p.category === 'zero') { badgeColor = '#059669'; badgeBg = '#ECFDF5'; badgeText = '🏠 집에 있는 걸로'; }
        else if (p.category === 'dad') { badgeColor = '#E32636'; badgeBg = '#FFF2F2'; badgeText = '🏋️ 몸으로 크게'; }
        else if (p.category === 'lieDown') { badgeColor = '#7F77DD'; badgeBg = '#F3F0FC'; badgeText = '🛌 누워서 하는'; }
        else if (p.category === 'poop') { badgeColor = '#D97706'; badgeBg = '#FFFBEB'; badgeText = '💩 배 마사지'; }
        else if (p.category === 'sick') { badgeColor = '#EA580C'; badgeBg = '#FFEDD5'; badgeText = '🤒 차분한 놀이'; }
        else if (p.category === 'bath-care') { badgeColor = '#2563EB'; badgeBg = '#EFF6FF'; badgeText = '🛁 목욕하면서'; }

        const isFav = favs.includes(p.id);
        const open = !!window.__playOpen[p.id];
        /* '(안전)' '(주의)' 는 짧은 '주의' 표시로 (이유식·요리 모드와 같은 말) */
        const stepsHtml = p.steps.map(step => `<li style="margin-bottom: 8px;">${String(step).replace(/\((안전 필수|안전|주의)\)\s*(⚠️\s*)?/g, '<b style="color:#B42318;">주의</b> ')}</li>`).join('');

        // 🔗 [크로스셀링] 장난감으로 넘어가는 버튼
        /* ⚠️ 모든 놀이에 '🛒 이 놀이에 쓰는 장난감' 이라고 붙어 있었다.
              그런데 장난감 놀이(toy) 말고는 엄마 등 · 이불 · 페트병으로 하는 놀이다.
              '엄마 등 북치기' 에 15만 원짜리 쏘서가 '쓰는 장난감' 으로 붙어 있었다.
              장난감 놀이만 '쓰는 장난감', 나머지는 '좋아하면' 으로 — 무엇인지 이름도 같이. */
        let linkToToyHtml = '';
        const relToy = p.relatedToyId ? toyData.find(t => String(t.id) === String(p.relatedToyId)) : null;
        if (relToy) {
            linkToToyHtml = `
                <div onclick="jumpToToy('${relToy.id}')" style="background:#FAF7F2; border:1px solid #EDE6DE; padding:14px; border-radius:12px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; transition:0.2s;">
                    <div style="flex:1; min-width:0; word-break:keep-all;"><div style="font-size:13px; font-weight:800; color:#7A6F68;">🛒 ${p.category === 'toy' ? '이 놀이에 쓰는 장난감' : '이 놀이를 좋아하면'}</div><div style="margin-top:3px; font-size:12px; font-weight:700; color:#A3958A;">${relToy.name}</div></div>
                    <div style="flex-shrink:0; font-size:13px; font-weight:900; color:#7F77DD; white-space:nowrap; margin-left:10px;">보러 가기<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px; margin-left:2px;" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></div>
                </div>
            `;
        }

        html += `
        <div id="play-card-${p.id}" style="background: #FFFFFF; border-radius: 20px; padding: 22px 22px 18px; border: 1px solid #EDE6DE; box-shadow: 0 4px 12px rgba(0,0,0,0.02); margin-bottom: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                <div style="display: inline-block; padding: 6px 10px; border-radius: 8px; background: ${badgeBg}; color: ${badgeColor}; font-size: 12px; font-weight: 800;">${badgeText}</div>
                <button onclick="togglePlayFavorite('${p.id}', this, event)" style="background:none; border:none; font-size:24px; cursor:pointer; padding:0;">${isFav ? '❤️' : '🤍'}</button>
            </div>

            <h3 style="margin: 0 0 6px 0; font-size: 17.5px; font-weight: 900; color: #4A413C; word-break: keep-all;">${p.title}</h3>
            <p style="margin: 0 0 10px 0; font-size: 13.5px; font-weight: 600; color: #A3958A; line-height: 1.5; word-break: keep-all;">${p.desc}</p>
            <div style="font-size: 12.5px; font-weight: 700; color: #7A6F68; line-height: 1.6; word-break: keep-all;">⏱️ ${p.playTime}분 · ${p.targetItem}</div>

            <div id="play-more-${p.id}" style="display: ${open ? 'block' : 'none'}; margin-top: 14px;">
                <div style="background: #FBF8F3; border-radius: 12px; padding: 12px 14px; margin-bottom: 14px; border: 1px solid #F7F3ED; font-size: 13px; color: #7A6F68;"><b>체력 소모</b> ${p.energyDrain}</div>

                <ul style="margin: 0 0 16px 0; padding-left: 0; list-style: none; font-size: 14.5px; font-weight: 700; color: #4A413C; line-height: 1.6;">
                    ${stepsHtml}
                </ul>

                <div style="background: #FFFBEB; border: 1px solid #FDE68A; padding: 14px; border-radius: 12px; margin-bottom: 16px;">
                    <div style="font-size: 12px; font-weight: 900; color: #D97706; margin-bottom: 4px;">👨‍🔧 아빠의 역할</div>
                    <div style="font-size: 13px; font-weight: 700; color: #B45309;">${p.dadRole}</div>
                </div>

                ${linkToToyHtml}

                <div style="display: flex; gap: 8px;">
                    <button id="timer-btn-${p.id}" onclick="startPlayTimer('${p.id}', ${p.playTime})" style="flex: 1; padding: 14px 8px; border-radius: 12px; background: #4A413C; color: #FFF; font-weight: 800; font-size: 13.5px; border: none; cursor: pointer; transition: 0.2s; white-space: nowrap;">
                        ⏱️ ${p.playTime}분 타이머
                    </button>
                    <button onclick="sharePlayMission('${p.id}')" style="flex: 1; padding: 14px 8px; border-radius: 12px; background: #FFFFFF; color: #7A6F68; font-weight: 800; font-size: 13.5px; border: 1px solid #EDE6DE; cursor: pointer; white-space: nowrap;">
                        ${shareTo}에게 보내기
                    </button>
                </div>
            </div>

            <!-- ⚠️ 기록은 무료여야 한다. 이게 없으면 무료 사용자는
                 '이번 달 놀이 기록' 과 도감을 영영 못 채운다.
                 그러면 사라지는 놀이도, 취향 학습도 통째로 멈춘다. -->
            <div style="display: flex; gap: 8px; margin-top: 14px;">
                <div id="play-open-${p.id}" onclick="togglePlayCard('${p.id}')"
                     style="flex: 1; text-align: center; padding: 13px 6px; border-radius: 12px; font-size: 13.5px; font-weight: 800; cursor: pointer; background: #F6F2EC; color: #4A413C;">
                    ${open ? '접기 ▴' : '어떻게 놀아요 ▾'}
                </div>
                <div id="playdone-${p.id}" onclick="window.togglePlayDone && window.togglePlayDone('${p.id}')"
                     style="flex: 1; text-align: center; padding: 13px 6px; border-radius: 12px; font-size: 13.5px; font-weight: 800; cursor: pointer; background: #FFFFFF; color: #7A6F68; border: 1px solid #DCD3C8;">
                    오늘 놀았어요
                </div>
            </div>
        </div>`;
    });

    const left = filtered.length - show;
    if (left > 0) {
        html += `<button onclick="morePlays()" style="display:block; width:100%; padding:16px; margin:4px 0 24px; background:#FFFFFF; border:1px solid #DCD3C8; border-radius:14px; font-size:14px; font-weight:800; color:#7A6F68; cursor:pointer;">놀이 ${Math.min(left, PLAY_STEP)}개 더 보기 <span style="color:#A3958A; font-weight:700;">· 남은 ${left}개</span></button>`;
    }

    // 🚨 버튼들을 덮어쓰기 직전에 좀비 타이머들 싹 정리!
    if (typeof playTimers !== 'undefined') {
        Object.keys(playTimers).forEach(id => clearInterval(playTimers[id].id));
        playTimers = {};
    }

    container.innerHTML = html;
}

/* 장난감 카드 · 이번 주 놀이 · 보낸 링크에서 그 놀이로 갈 때: 거기까지 그리고, 펼치고, 데려간다 */
window.revealPlay = function (playId) {
    const list = window.__playList || [];
    const at = list.findIndex(p => String(p.id) === String(playId));
    window.__playOpen[playId] = true;
    if (at >= (window.__playShow || PLAY_STEP)) window.__playShow = at + 1;
    renderPlays();
    setTimeout(() => {
        const card = document.getElementById('play-card-' + playId);
        if (!card) return;
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        card.style.transition = 'box-shadow 0.3s';
        card.style.boxShadow = '0 0 0 3px #7F77DD';
        setTimeout(() => { card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.02)'; }, 1600);
    }, 120);
};

let playTimers = {};

function startPlayTimer(playId, minutes) {
    const btn = document.getElementById(`timer-btn-${playId}`);
    const p = playData.find(x => x.id === playId);
    if (!btn) return;

    // 이미 돌고 있으면 정지
    if (playTimers[playId]) {
        clearInterval(playTimers[playId].id);
        delete playTimers[playId];
        btn.innerHTML = `⏱️ ${minutes}분 타이머`;   // 처음 단추와 같은 말 ('버티기 시작' 이었다)
        btn.style.background = '#4A413C'; btn.style.color = '#FFF';
        btn.style.border = 'none'; btn.style.boxShadow = 'none'; btn.style.opacity = '1';
        return;
    }

    // 🚨 끝나는 시각을 미리 못박아둔다 (화면 잠가도 정확)
    const endAt = Date.now() + minutes * 60 * 1000;

    btn.style.background = '#F2F0FC';
    btn.style.color = '#7F77DD';
    btn.style.border = '1px solid #7F77DD';

    const tick = () => {
        const liveBtn = document.getElementById(`timer-btn-${playId}`);
        if (!liveBtn) {                       // 버튼이 사라졌으면 좀비 방지
            clearInterval(playTimers[playId].id);
            delete playTimers[playId];
            return;
        }

        const secondsLeft = Math.max(0, Math.round((endAt - Date.now()) / 1000));
        const m = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
        const s = (secondsLeft % 60).toString().padStart(2, '0');

        if (secondsLeft <= 60 && secondsLeft > 0) {
            liveBtn.style.background = '#FFF2F2';
            liveBtn.style.color = '#E32636';
            liveBtn.style.border = '1px solid #FCA5A5';
        }

        liveBtn.innerHTML = `⏳ <b>${m}:${s}</b> 남았어요 · 누르면 멈춰요`;

        if (secondsLeft <= 0) {
            clearInterval(playTimers[playId].id);
            delete playTimers[playId];

            /* ⚠️ '오늘 미션 끝 · 아빠 체력 대단하세요 💪' · '눕육아 성공 엄마 체력 충전 완료 🔋' ·
                  '미션 완료 쾌변 기저귀 확인 요망 💩' · '미션 완료 아기 컨디션 회복 💖' 이었다.
                  놀이를 숙제처럼 부르고, 아픈 날 놀이가 컨디션을 되찾아 준다고 말하고 있었다. */
            const successText = '✓ 다 놀았어요 · 수고하셨어요';

            liveBtn.innerHTML = successText;
            liveBtn.style.background = '#059669';
            liveBtn.style.color = '#FFF';
            liveBtn.style.border = 'none';
            liveBtn.style.boxShadow = '0 0 15px rgba(5, 150, 105, 0.4)';

            let blink = false;
            const blinkInterval = setInterval(() => {
                liveBtn.style.opacity = blink ? '1' : '0.8';
                blink = !blink;
            }, 500);
            setTimeout(() => { clearInterval(blinkInterval); liveBtn.style.opacity = '1'; }, 3000);
        }
    };

    playTimers[playId] = { id: setInterval(tick, 1000), endAt, minutes };
    tick();   // 즉시 1회 실행해서 00:00 깜빡임 방지
}

/* ⚠️ "🚨 [긴급 육아 미션 도착] 여보, 오늘 퇴근하고…" + "미션 수락하기 🫡" 였다.
      놀이 하나 같이 하자는 말에 경보 이모지를 달 이유가 없고, '퇴근하고' 는 집마다 다르다.
      무엇을 하는지와 맡아줄 일만 적고, 링크를 열면 그 놀이 카드로 간다 (?play=번호). */
function sharePlayMission(playId) {
    const p = playData.find(x => x.id === playId);
    if (!p) return;
    const link = 'https://happy-baby0303.github.io/toy/index.html?play=' + encodeURIComponent(p.id);
    const toDad = playShareTo() === '아빠';
    const shareText = `오늘 아기랑 이 놀이 같이 해요.\n\n🎈 ${p.title} (${p.playTime}분)` +
        (toDad && p.dadRole ? `\n🙋 맡아줄 것: ${p.dadRole}` : '') + `\n\n${link}`;
    if (typeof Kakao === 'undefined' || !Kakao.isInitialized()) {
        navigator.clipboard.writeText(shareText)
            .then(() => window.showToast('복사했어요. 카톡에 붙여 넣어 보내세요.'))
            .catch(() => window.showCopySheet(shareText));
        return;
    }
    Kakao.Share.sendDefault({
        objectType: 'text',
        text: shareText,
        link: { mobileWebUrl: link, webUrl: link },
        buttons: [{ title: '배냇함에서 보기', link: { mobileWebUrl: link, webUrl: link } }],
    });
}

/* 보낸 링크(?play=번호)를 열면 그 놀이로 데려간다 (장난감 카드의 '이 장난감으로 하는 놀이' 와 같은 길) */
(function () {
    var id = new URLSearchParams(location.search).get('play');
    if (!id) return;
    setTimeout(function () {
        try { if (typeof jumpToPlay === 'function') jumpToPlay(id); } catch (e) {}
        try { var u = new URL(location.href); u.searchParams.delete('play'); history.replaceState(history.state, '', u.toString()); } catch (e) {}
    }, 1300);
})();

// ==========================================
// 🛒 TRACK 2: 육아는 템빨 (장난감 렌더링)
// ==========================================
function toggleFavView() {
    isFavViewMode = !isFavViewMode;
    const btn = document.getElementById('btn-show-fav');
    
    if (isFavViewMode) {
        btn.innerHTML = '← 추천 목록으로 돌아가기';
        btn.style.background = '#F6F2EC'; btn.style.color = '#7A6F68'; btn.style.borderColor = '#DCD3C8';
        renderFavorites();
    } else {
        btn.innerHTML = '❤️ 찜한 장난감 모아보기';
        btn.style.background = '#FFFFFF'; btn.style.color = '#4A413C'; btn.style.borderColor = '#EDE6DE';
        updateToyView(); // ✨ 에러가 나던 renderList(false)를 올바른 함수로 수정
    }
}

function toggleFavorite(id) {
    let favs = JSON.parse(localStorage.getItem('favToys')) || [];
    // 숫자로 변환하여 비교 (데이터의 id가 숫자이므로)
    const numericId = parseInt(id, 10);
    
    if(favs.includes(numericId)) {
        favs = favs.filter(f => f !== numericId);
    } else {
        favs.push(numericId);
    }
    localStorage.setItem('favToys', JSON.stringify(favs));
    
    if (isFavViewMode) {
        renderFavorites(); 
    } else {
        const btn = document.getElementById(`fav-btn-${numericId}`);
        if (btn) {
            const isFav = favs.includes(numericId);
            btn.innerHTML = isFav ? '❤️ 찜 해제' : '🤍 찜하기';
            btn.style.background = isFav ? '#FFF2F2' : '#F6F2EC';
            btn.style.color = isFav ? '#E32636' : '#7A6F68';
            btn.style.borderColor = isFav ? '#FCA5A5' : '#EDE6DE';
        }
    }
}

function renderFavorites() {
    const resultArea = document.getElementById('toy-result-area');
    const favs = JSON.parse(localStorage.getItem('favToys')) || [];
    
    if (favs.length === 0) {
        resultArea.innerHTML = `
            <div class="premium-empty-state" style="padding:40px; text-align:center; background:#FFF; border-radius:16px; border:1px dashed #DCD3C8; margin-top: 16px;">
                <div class="empty-icon" style="font-size:40px; margin-bottom:12px;">💔</div>
                <div class="empty-text">
                    <b style="font-size:16px; color:#4A413C; font-weight:800; display:block; margin-bottom:6px;">아직 찜한 장난감이 없어요</b>
                    <span style="font-size:13px; color:#A3958A;">마음에 드는 장난감에 하트(❤️)를 눌러보세요.</span>
                </div>
            </div>`;
        return;
    }
    const favItems = toyData.filter(item => favs.includes(item.id));
    resultArea.innerHTML = `<div style="font-weight:800; color:#4A413C; margin-bottom:16px; margin-top:16px; font-size:16px;">❤️ 찜한 장난감 ${favItems.length}개</div>` 
                           + favItems.map(item => generateToyHTML(item, favs)).join('');
}

function renderToys(filteredData) {
    if(isFavViewMode) return;
    const resultArea = document.getElementById('toy-result-area');
    const favs = JSON.parse(localStorage.getItem('favToys')) || [];
    
    if (filteredData.length === 0) {
        resultArea.innerHTML = `
            <div class="premium-empty-state" style="padding:40px; text-align:center; background:#FFF; border-radius:16px; border:1px dashed #DCD3C8; margin-top: 16px;">
                <div class="empty-icon" style="font-size:40px; margin-bottom:12px;">🥲</div>
                <div class="empty-text">
                    <b style="font-size:16px; color:#4A413C; font-weight:800; display:block; margin-bottom:6px;">이 상황에 맞는 장난감이 없어요</b>
                    <span style="font-size:13px; color:#A3958A;">발달 단계나 테마를 바꿔 보세요</span>
                </div>
            </div>`;
        return;
    }
    window.__toyList = filteredData;
    const show = Math.min(window.__toyShow || 8, filteredData.length);
    const left = filteredData.length - show;
    /* 식당 · 외출 테마에는 사운드북 · 핸들처럼 딱딱한 것도 있다.
       카시트 큐레이터가 '차 안에서는 천 · 말랑한 것만' 이라고 하는데, 이 테마 이름이 '식당·카시트' 였다. */
    const carNote = currentToyTheme === 'sos-out'
        ? `<div style="background:#FBF8F3; border:1px solid #EDE6DE; border-radius:12px; padding:11px 13px; margin:-6px 0 16px; font-size:12.5px; font-weight:600; color:#7A6F68; line-height:1.7; word-break:keep-all;">🚘 차 안에서는 <b>천이나 말랑한 것</b>만 손에 쥐여 주세요. 급정거하면 딱딱한 장난감이 날아올 수 있어요.</div>`
        : '';
    resultArea.innerHTML = `<div style="font-weight:800; color:#4A413C; margin-bottom:16px;">지금 맞는 장난감 ${filteredData.length}개</div>` 
                           + carNote
                           + filteredData.slice(0, show).map(item => generateToyHTML(item, favs)).join('')
                           + (left > 0 ? `<button onclick="moreToys()" style="display:block; width:100%; padding:16px; margin:4px 0 24px; background:#FFFFFF; border:1px solid #DCD3C8; border-radius:14px; font-size:14px; font-weight:800; color:#7A6F68; cursor:pointer;">장난감 ${Math.min(left, 8)}개 더 보기 <span style="color:#A3958A; font-weight:700;">· 남은 ${left}개</span></button>` : '');
}

/* ⏳ 혼자 노는 시간 — '20분' 처럼 놀이 시간이 적힌 장난감만 값이 있다.
   ⚠️ 목욕 · 위생 · 살림 용품은 이 칸(freeTime)에 '상시' · '목욕 시간' · '엄마 손목 구원' 같은 말이 들어 있다.
      그대로 '⏳ 혼자 노는 시간 — 보통 상시쯤 · 아이마다 달라요' 로 떴다 (체온계 · 욕조 · 변기 · 아기띠 …).
      손톱 갈이 · 콧물 흡입기 · 칫솔의 '5분' · '3분' 은 하는 데 걸리는 시간이지 혼자 노는 시간이 아니다.
   카시트 후방 거울의 '30분' 도 혼자 노는 시간이 아니다 (차에 다는 물건).
   선물 카드(toygift.js)도 이걸로 '장난감인가' 를 가른다. */
const TOY_NOT_PLAY = [56, 57, 58, 77];   // 전동 손톱 갈이 · 콧물 흡입기 · 첫 칫솔 · 카시트 후방 거울
function toyPlayTime(toy) {
    const v = String((toy && toy.freeTime) || '').trim();
    if (!/^\d+분$/.test(v)) return '';
    if (TOY_NOT_PLAY.indexOf(Number(toy.id)) > -1) return '';
    return v;
}
window.toyPlayTime = toyPlayTime;

// ==========================================
// 🛒 장난감 카드 렌더링 (장난감 -> 놀이 연결 추가)
// ==========================================
function generateToyHTML(toy, favs) {
    const isFav = favs ? favs.includes(toy.id) : false;
    const hIcon = isFav ? '❤️ 찜 해제' : '🤍 찜하기';
    const hBg = isFav ? '#FFF2F2' : '#F6F2EC';
    const hCol = isFav ? '#E32636' : '#7A6F68';
    const hBor = isFav ? '#FCA5A5' : '#EDE6DE';

    const partnerCode = "AF9932454"; 

    // ⚡ 한눈에 — 혼자 노는 시간 · 건전지 (큰 상자 두 개였던 것을 이름 밑 한 줄로)
    /* ⚠️ 여기 '쿠팡에서 건전지 보기' 가 있었다. 장난감 하나에 쿠팡 링크가 둘이었다 — 상품마다 가격 링크 하나만 둔다.
          '유선' · '유선 충전' (콧물흡입기 · 코코지) 에도 '건전지가 따로 필요해요 (유선)' 이 떴다. */
    const chips = [];
    if (toyPlayTime(toy)) chips.push(`<span class="toy-chip toy-chip-time">혼자 노는 시간 보통 ${toyPlayTime(toy)}쯤</span>`);
    if (toy.battery && !/없음|유선/.test(toy.battery)) chips.push(`<span class="toy-chip toy-chip-batt">건전지 따로 · ${toy.battery}</span>`);
    const chipsHtml = chips.length ? `<div class="toy-chips">${chips.join('')}</div>` : '';

    // 🔗 2. 이 장난감으로 하는 놀이로 넘어가는 단추
    /* ⚠️ 모든 카드에 '이 장난감으로 하는 놀이' 라고 붙어 있었는데, 98개 중 그 장난감을 정말 쓰는 놀이는 다섯 개뿐이다.
          체온계 → '창밖 자동차 카운팅', 콧물 흡입기 → '목욕 끝 로션 마사지' 가 '이 장난감으로 하는 놀이' 였다.
          장난감 놀이가 이 장난감을 가리킬 때만 그 말을 쓰고, 나머지는 '같이 해 볼 놀이' — 놀이 이름도 같이 보여 준다. */
    let linkToPlayHtml = '';
    const relPlay = (toy.relatedPlayIds && toy.relatedPlayIds.length > 0) ? playData.find(p => p.id === toy.relatedPlayIds[0]) : null;
    if (relPlay) {
        const usesToy = relPlay.category === 'toy' && String(relPlay.relatedToyId) === String(toy.id);
        linkToPlayHtml = `
            <div onclick="jumpToPlay('${relPlay.id}')" style="background:#F2F0FC; border:1px solid #DDD9F5; padding:14px; border-radius:12px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; transition:0.2s;">
                <div style="flex:1; min-width:0; word-break:keep-all;"><div style="font-size:13px; font-weight:800; color:#6A61CE;">${usesToy ? '이 장난감으로 하는 놀이' : '같이 해 볼 놀이'}</div><div style="margin-top:3px; font-size:12px; font-weight:700; color:#8C84D9;">${relPlay.title}</div></div>
                <div style="flex-shrink:0; font-size:13px; font-weight:900; color:#7F77DD; white-space:nowrap; margin-left:10px;">보러 가기<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px; margin-left:2px;" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></div>
            </div>
        `;
    }

    // 🛒 장난감 쿠팡 링크
    const autoSearchLink = `https://www.coupang.com/np/search?q=${encodeURIComponent(toy.name)}&lptag=${partnerCode}`;
    const isFallback = (!toy.coupangLink || toy.coupangLink.trim() === '');
    const finalLink = isFallback ? autoSearchLink : toy.coupangLink;
    const btnText = (isFallback ? '쿠팡에서 찾아보기' : '쿠팡에서 보기') + '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px; margin-left:2px;" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';   // '최저가' 는 입증할 수 없는 말이라 쓰지 않는다

    return `
        <div id="toy-card-${toy.id}" class="stroller-card" style="border-top: 4px solid transparent; margin-bottom: 24px; padding: 28px 24px; background:#FFF; border-radius:24px; box-shadow:0 4px 16px rgba(0,0,0,0.04); border:1px solid #F7F3ED;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 16px; gap: 12px;">
                <div style="display: flex; gap: 14px; align-items: center; flex: 1; min-width: 0;">
                    <div class="toy-img-placeholder" style="flex-shrink: 0; font-size: 32px;">${toy.imgIcon}</div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-size:20px; font-weight:900; letter-spacing:-0.5px; color:#4A413C; word-break:keep-all; line-height:1.4;">${toy.name}</div>
                        <!-- 태그 하나씩 묶는다 — '#스마트폰도둑 #' 다음 줄에 '안전대체재' 로 '#' 만 떨어져 남았다 -->
                        <div style="color: #7F77DD; font-size: 13px; font-weight: 700; margin-top: 6px; word-break:keep-all;">${String(toy.tags || '').split(/\s+/).filter(Boolean).map(t => `<span style="white-space:nowrap;">${t}</span>`).join(' ')}</div>
                    </div>
                </div>
                <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px; flex-shrink:0;">
<button id="fav-btn-${toy.id}" onclick="toggleFavorite('${toy.id}')" style="background:${hBg}; color:${hCol}; border:1px solid ${hBor}; padding:8px 12px; border-radius:8px; font-weight:800; font-size:12px; cursor:pointer; white-space:nowrap; flex-shrink:0;">
                    ${hIcon}
                </button>
            <!-- 보내기: 찜하기 바로 밑, 같은 모양 (유모차와 같은 방식) -->
            <button onclick="shareToHusbandToy('${toy.id}')" style="background:#FFFFFF; color:#7A6F68; border:1px solid #EDE6DE; padding:8px 12px; border-radius:8px; font-weight:800; font-size:12px; cursor:pointer; display:inline-flex; align-items:center; gap:5px; white-space:nowrap;"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/></svg>${window.sendLabel ? window.sendLabel() : '보내기'}</button>
            </div>
            </div>

            ${chipsHtml}
            <!-- 설명 — 안전 경고(⚠️ 자석 · 삼킴)도 여기 있어서 접지 않는다 -->
            <div class="toy-desc">${toy.fomo}</div>

            <button type="button" class="toy-more-btn" aria-expanded="false" onclick="toggleToyMore(this)"><span class="more-label">자세히 보기</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>

            <!-- 자세히 보기: 같이 해 볼 놀이 · 가격 보기 · KC 안내 -->
            <div class="toy-more" hidden>
            ${linkToPlayHtml}

            <a href="${finalLink}" target="_blank" style="display:flex; justify-content:center; align-items:center; gap:8px; width:100%; background:#4A413C; color:#FFFFFF; border:none; padding:18px 16px; border-radius:14px; font-weight:900; font-size:15px; cursor:pointer; box-shadow: 0 4px 14px rgba(0,0,0,0.1); margin-bottom: 12px; text-decoration: none; transition: 0.2s;">
                ${btnText}
            </a>

            <div style="font-size: 11.5px; color: #A3958A; font-weight: 600; text-align: center; margin-top: 16px; line-height: 1.5; word-break: keep-all;">
                ※ 입에 들어가는 장난감은 <b>KC 마크와 사용 연령</b>을 꼭 확인하세요.
            </div>
            </div>
        </div>
    `;
}

/* 장난감 카드도 유모차처럼 — 이름 · 혼자 노는 시간 · 건전지 · 설명만 보이고 나머지는 '자세히 보기' 안에.
   ⚠️ 카드 한 장이 평균 660px, '장난감 고르기' 탭이 화면 8.9장이었다.
      '혼자 노는 시간' 하나에 큰 상자, 건전지에 또 상자, 카드마다 같은 KC 안내 문장. */
function toggleToyMore(btn, open) {
    const card = btn && btn.closest('[id^="toy-card-"]');
    const box = card && card.querySelector('.toy-more');
    if (!box) return;
    const willOpen = typeof open === 'boolean' ? open : box.hidden;
    box.hidden = !willOpen;
    btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    const label = btn.querySelector('.more-label');
    if (label) label.textContent = willOpen ? '접기' : '자세히 보기';
}
window.toggleToyMore = toggleToyMore;
function openToyCard(card) {
    const b = card && card.querySelector('.toy-more-btn');
    if (b && b.getAttribute('aria-expanded') !== 'true') toggleToyMore(b, true);
}
window.openToyCard = openToyCard;

// ==========================================
// 🚀 매직 점프 엔진 (놀이 ↔ 장난감 무한 횡단)
// ==========================================
window.jumpToToy = function(toyId) {
    if (TOY_MOVED[Number(toyId)]) toyId = TOY_MOVED[Number(toyId)];
    if (navigator.vibrate) navigator.vibrate(10);
    // 1. 탭을 장난감(템빨) 탭으로 스위치
    switchToyMainTab('gear');
    
    // 2. 필터를 강제로 "전체보기"로 풀어서 무조건 보이게 만듦
    currentToyTheme = 'all';
    globalMilestone = 'all';
    document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.ms-chip').forEach(c => c.classList.remove('active'));
    document.querySelector('.ms-chip[data-milestone="all"]').classList.add('active');
    
    // 3. 그 장난감까지 그린 뒤 부드럽게 스크롤 (목록은 8개씩만 그린다)
    window.__toyKey = 'all|all';
    window.__toyShow = Math.max(8, toyData.findIndex(t => String(t.id) === String(toyId)) + 1);
    updateToyView();
    setTimeout(() => {
        const targetCard = document.getElementById(`toy-card-${toyId}`);
        if(targetCard) {
            openToyCard(targetCard);
            targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // 번쩍! 하이라이트 효과
            targetCard.style.transition = 'box-shadow 0.3s, transform 0.3s';
            targetCard.style.boxShadow = '0 0 0 3px #7F77DD';
            targetCard.style.transform = 'scale(1.02)';
            setTimeout(() => { 
                targetCard.style.boxShadow = '0 4px 16px rgba(0,0,0,0.04)'; 
                targetCard.style.transform = 'scale(1)'; 
            }, 800);
        }
    }, 100);
};

window.jumpToPlay = function(playId) {
    if (navigator.vibrate) navigator.vibrate(10);
    // 1. 탭을 놀이 처방전 탭으로 스위치
    switchToyMainTab('play');
    
    // 2. 필터를 강제로 "전체보기"로 풀어서 무조건 보이게 만듦
    filterPlays('all', document.querySelector('.play-filter-btn'));
    
    // 3. 그 놀이까지 그리고 펼쳐서 데려간다 (목록은 10개씩만 그린다)
    setTimeout(() => window.revealPlay(playId), 60);
};

/* ⚠️ 예전 메시지: "🚨 [긴급 육아 미션 도착] 여보, 오늘 퇴근하고…" + "여보 나 오늘 너무 힘들어 😭 이거 하나만 로켓으로 쏴줘"
      + 쿠팡 파트너스 구매 링크. 받는 사람은 수수료 링크인 줄 모르고, 문구도 앱이 대신 조르는 말이었다.
      이유식·유모차와 같게, 무엇인지와 배냇함 링크만 보낸다. 링크를 열면 그 장난감 카드로 간다 (?toy=번호). */
function shareToHusbandToy(id) {
    const toy = toyData.find(t => t.id == id);
    if (!toy) return;
    const link = 'https://happy-baby0303.github.io/toy/index.html?toy=' + encodeURIComponent(toy.id);
    const sub = toyPlayTime(toy) ? `혼자 노는 시간 보통 ${toyPlayTime(toy)}쯤` : '';   // '보통 상시쯤' 이 가지 않게
    const shareText = `이 장난감 어때?\n${toy.name}${sub ? '\n' + sub : ''}\n${link}`;
    if (typeof Kakao === 'undefined' || !Kakao.isInitialized()) {
        navigator.clipboard.writeText(shareText)
            .then(() => window.showToast('복사했어요. 카톡에 붙여 넣어 보내세요.'))
            .catch(() => window.showCopySheet(shareText));
        return;
    }
    Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
            title: `이 장난감 어때? ${toy.name}`,
            description: sub,
            imageUrl: 'https://happy-baby0303.github.io/icon-512.png',
            link: { mobileWebUrl: link, webUrl: link },
        },
        buttons: [{ title: '배냇함에서 보기', link: { mobileWebUrl: link, webUrl: link } }],
    });
}

/* 보낸 링크(?toy=번호)를 열면 장난감 탭의 그 카드로 데려가 잠깐 테두리를 칠한다. 한 번 가면 주소에서 뺀다. */
(function () {
    var id = new URLSearchParams(location.search).get('toy');
    if (!id) return;
    function go(tries) {
        if (tries === 8 && typeof window.jumpToToy === 'function') {
            try { window.jumpToToy(id); } catch (e) {}
            try { var u0 = new URL(location.href); u0.searchParams.delete('toy'); history.replaceState(history.state, '', u0.toString()); } catch (e) {}
            return;
        }
        try { if (typeof window.switchToyMainTab === 'function' && tries === 8) window.switchToyMainTab('gear'); } catch (e) {}
        var hit = document.getElementById('toy-card-' + id);
        if (!hit && tries === 5) {
            var all = [].slice.call(document.querySelectorAll('#view-toy-gear button, #view-toy-gear [onclick]'))
                .filter(function (b) { return (b.textContent || '').trim() === '전체보기'; })[0];
            if (all) all.click();
        }
        if (!hit) { if (tries > 0) setTimeout(function () { go(tries - 1); }, 450); return; }
        try { window.openToyCard(hit); } catch (e) {}
        setTimeout(function () {
            var head = document.querySelector('.app-header');
            var off = (head ? head.getBoundingClientRect().height : 0) + 12;
            window.scrollTo({ top: hit.getBoundingClientRect().top + window.scrollY - off, behavior: 'smooth' });
            hit.style.transition = 'box-shadow .3s'; hit.style.boxShadow = '0 0 0 3px #7F77DD';
            setTimeout(function () { hit.style.boxShadow = ''; }, 2600);
        }, 150);
        try { var u = new URL(location.href); u.searchParams.delete('toy'); history.replaceState(history.state, '', u.toString()); } catch (e) {}
    }
    setTimeout(function () { go(8); }, 1000);
})();

// 페이지 열릴 때 탭 기본 상태
document.addEventListener('DOMContentLoaded', () => {
    /* 놀이 필터 줄은 화면 위에 붙어 있어야 하는데, 위쪽 머리(제목 · 큐레이터 탭) 밑에 깔려서 안 보였다.
       머리 높이만큼 내려서 붙인다 (아이폰 노치 높이가 달라서 숫자로 박지 않는다). */
    const bar = document.getElementById('play-filter-bar'), head = document.querySelector('.app-header');
    const fit = () => { if (bar && head) bar.style.top = head.getBoundingClientRect().height + 'px'; };
    fit(); window.addEventListener('resize', fit); setTimeout(fit, 800);
    const btnPlay = document.getElementById('tab-btn-play');
    const btnGear = document.getElementById('tab-btn-gear');
    if (btnPlay) btnPlay.classList.add('tab-on');
    if (btnGear) btnGear.classList.add('tab-off');
});