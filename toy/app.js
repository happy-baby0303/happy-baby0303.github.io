let isFavViewMode = false; 

if (!Kakao.isInitialized()) {
    Kakao.init('68bca10ddfe2ec67112b07eb9a08da2b');
}

// 🚀 장난감 데이터 자동 동기화 (단발성 땜질 NO, 완벽한 구조화)
function applyGlobalBabyProfile() {
    const birthStr = localStorage.getItem('tosil_startDate');
    
    // 🛡️ 야무진 포인트 1: 아기 생일 정보가 없을 때의 완벽 방어!
    // (기존엔 정보가 없으면 함수가 그냥 죽어버려서 리스트가 안 떴습니다)
    if (!birthStr) {
        renderToys(toyData); // 정보가 없으면 일단 '전체 장난감'을 다 띄워줌
        return; 
    }

    // 1. 개월 수 정밀 계산
    const birthDate = new Date(birthStr);
    const today = new Date();
    let months = (today.getFullYear() - birthDate.getFullYear()) * 12 + (today.getMonth() - birthDate.getMonth());
    if (months < 0) months = 0;

    // 2. 불필요한 UI 숨김 및 뱃지 업데이트
    const banner = document.getElementById('auto-sync-banner');
    if (banner) banner.style.display = 'none';

    document.querySelectorAll('.dynamic-age-badge').forEach(b => {
        b.innerText = `생후 ${months}개월 맞춤`;
    });

    // 3. 개월 수에 따른 AI 마일스톤(단계) 판별
    let autoMilestone = 'all'; 
    if (months <= 3) autoMilestone = 'tummy';
    else if (months <= 6) autoMilestone = 'flip';
    else if (months <= 9) autoMilestone = 'crawl';
    else autoMilestone = 'stand';

    // 4. 화면 위쪽 '발달 상태 칩(버튼)' UI 활성화 변경
    const targetChip = document.querySelector(`.ms-chip[data-milestone="${autoMilestone}"]`);
    if (targetChip) {
        document.querySelectorAll('.ms-chip').forEach(c => c.classList.remove('active'));
        targetChip.classList.add('active');
    }

    // 🛡️ 야무진 포인트 2: 계산된 결과에 맞춰 정확하게 데이터 추려내기
    const initialData = autoMilestone === 'all' 
        ? toyData 
        : toyData.filter(t => t.milestone === autoMilestone || t.milestone === 'all');
        
    // 5. 최종적으로 추려낸 데이터를 화면에 그리기 (엔진 가동!)
    renderToys(initialData); 
}

function toggleFavorite(id) {
    let favs = JSON.parse(localStorage.getItem('favToys')) || [];
    if(favs.includes(id)) favs = favs.filter(f => f !== id);
    else favs.push(id);
    localStorage.setItem('favToys', JSON.stringify(favs));
    
    if (isFavViewMode) renderFavorites(); 
    else {
        const btn = document.getElementById(`fav-btn-${id}`);
        if (btn) {
            const isFav = favs.includes(id);
            btn.innerHTML = isFav ? '❤️ 찜 해제' : '🤍 찜하기';
            btn.style.background = isFav ? '#FFF2F2' : '#F2F4F6';
            btn.style.color = isFav ? '#E32636' : '#4E5968';
            btn.style.borderColor = isFav ? '#FCA5A5' : '#E5E8EB';
        }
    }
}

// 🚀 장난감 전용 찜 보관함 전환 (오류 완벽 해결 & 핑크색 버튼 변환)
function toggleFavView() {
    isFavViewMode = !isFavViewMode;
    const btn = document.getElementById('btn-show-fav');
    
    if (isFavViewMode) {
        btn.innerHTML = '🔙 검색 화면으로 돌아가기';
        btn.style.background = '#F2F4F6'; 
        btn.style.color = '#4E5968'; 
        btn.style.borderColor = '#D1D5DB';
        renderFavorites();
    } else {
        btn.innerHTML = '❤️ 내가 찜한 장난감 모아보기';
        btn.style.background = '#FFF2F2'; 
        btn.style.color = '#E32636'; 
        btn.style.borderColor = '#FCA5A5';
        
        // 🔥 파트너님 원본 로직: 검색 화면으로 돌아갈 때 발달단계 다시 그리기
        const activeChip = document.querySelector('.ms-chip.active');
        const ms = activeChip ? activeChip.getAttribute('data-milestone') : 'all';
        const filteredData = ms === 'all' ? toyData : toyData.filter(t => t.milestone === ms || t.milestone === 'all');
        renderToys(filteredData);
    }
}

// 🚀 장난감 전용 찜 보관함 렌더링 (이유식과 100% 동일한 귀여운 빈 화면 적용!)
function renderFavorites() {
    const resultArea = document.getElementById('toy-result-area');
    const favs = JSON.parse(localStorage.getItem('favToys')) || [];
    
    if (favs.length === 0) {
        resultArea.innerHTML = `
            <div class="premium-empty-state" style="padding:40px; text-align:center; background:#FFF; border-radius:16px; border:1px dashed #D1D5DB; margin-top: 16px;">
                <div class="empty-icon" style="font-size:40px; margin-bottom:12px;">💔</div>
                <div class="empty-text">
                    <b style="font-size:16px; color:#191F28; font-weight:800; display:block; margin-bottom:6px;">아직 찜한 장난감이 없어요!</b>
                    <span style="font-size:13px; color:#8B95A1;">마음에 드는 장난감에 하트(❤️)를 눌러보세요.</span>
                </div>
            </div>`;
        return;
    }
    
    const favItems = toyData.filter(item => favs.includes(item.id));
    resultArea.innerHTML = `<div style="font-weight:900; color:#E32636; margin-bottom:16px; margin-top:16px; font-size:16px;">❤️ 내 찜 보관함 (${favItems.length}개)</div>` 
                           + favItems.map(item => generateToyHTML(item, favs)).join('');
}

function renderToys(filteredData) {
    if(isFavViewMode) return;
    const resultArea = document.getElementById('toy-result-area');
    const favs = JSON.parse(localStorage.getItem('favToys')) || [];
    
    if (filteredData.length === 0) {
        resultArea.innerHTML = `<div style="text-align:center; padding:40px; color:#8B95A1;">해당 상황에 맞는 구원템이 없습니다.</div>`;
        return;
    }
    resultArea.innerHTML = `<div style="font-weight:800; color:#191F28; margin-bottom:16px;">✨ 시간 확보 추천 라인업 (${filteredData.length}개)</div>` 
                           + filteredData.map(item => generateToyHTML(item, favs)).join('');
}

function generateToyHTML(toy, favs) {
    const isFav = favs ? favs.includes(toy.id) : false;
    const hIcon = isFav ? '❤️ 찜 해제' : '🤍 찜하기';
    const hBg = isFav ? '#FFF2F2' : '#F2F4F6';
    const hCol = isFav ? '#E32636' : '#4E5968';
    const hBor = isFav ? '#FCA5A5' : '#E5E8EB';

    // 🔋 건전지 크로스셀링 로직 (프리미엄 박스로 업그레이드)
    let batteryHtml = toy.battery !== "건전지 필요 없음" ? `
        <div style="background:#FFFBEB; padding:16px; border-radius:14px; font-size:13px; color:#B45309; border: 1px solid #FDE68A; line-height: 1.5; margin-top:20px;">
            <b style="color:#D97706; font-size: 13.5px; display:block; margin-bottom:4px;">⚡ 앗! 건전지 잊지 않으셨죠? (${toy.battery})</b>
            <a href="${toy.batteryLink}" target="_blank" style="display:inline-block; margin-top:4px; color:#D97706; font-weight:800; text-decoration:underline;">👉 로켓배송 건전지 같이 담기</a>
        </div>` : '';

    // 🚀 [핵심] 빈 링크 방어(Fallback) 및 UX 텍스트 동적 변환 로직 (파트너스 링크로 업데이트)
    const fallbackLink = "https://link.coupang.com/a/fjYmJ0ojVk"; 
    const isFallback = (!toy.coupangLink || toy.coupangLink === '#' || toy.coupangLink.trim() === '');
    
    const finalLink = isFallback ? fallbackLink : toy.coupangLink;
    const btnText = isFallback 
        ? `🔍 쿠팡에서 '${toy.name}' 검색해보기 〉` 
        : `🚀 로켓배송 최저가 확인하기 〉`;

    return `
        <div class="stroller-card" style="border-top: 4px solid transparent; margin-bottom: 24px; padding: 28px 24px; background:#FFF; border-radius:24px; box-shadow:0 4px 16px rgba(0,0,0,0.04); border:1px solid #F2F5F8;">
            
            <!-- 타이틀 및 찜하기 영역 -->
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 24px; gap: 12px;">
                <div style="display: flex; gap: 14px; align-items: center; flex: 1; min-width: 0;">
                    <div class="toy-img-placeholder" style="flex-shrink: 0;">${toy.imgIcon}</div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-size:20px; font-weight:900; letter-spacing:-0.5px; color:#191F28; word-break:keep-all; line-height:1.4;">${toy.name}</div>
                        <div style="color: #3182F6; font-size: 13px; font-weight: 700; margin-top: 6px; word-break:keep-all;">${toy.tags}</div>
                    </div>
                </div>
                <button id="fav-btn-${toy.id}" onclick="toggleFavorite(${toy.id})" style="background:${hBg}; color:${hCol}; border:1px solid ${hBor}; padding:8px 12px; border-radius:8px; font-weight:800; font-size:12px; cursor:pointer; white-space:nowrap; flex-shrink:0;">
                    ${hIcon}
                </button>
            </div>

            <!-- 🚨 AI 팩트폭격 (여백 늘리고 깔끔하게 분리) -->
            <div style="background: #FFF0F1; border: 1px solid #FECACA; padding: 18px; border-radius: 14px; margin-bottom: 16px;">
                <div style="font-weight: 900; color: #E32636; font-size: 13.5px; margin-bottom: 8px;">🚨 AI 팩트폭격</div>
                <div style="font-size: 13.5px; color: #D32F2F; line-height: 1.5; font-weight: 600;">${toy.fomo}</div>
            </div>

            <!-- ✨ 시간 확보 리포트 (연회색 수납 박스 + 초록색 뱃지) -->
            <div style="background: #F9FAFB; padding: 20px 18px; border-radius: 14px; border: 1px solid #E5E8EB; margin-bottom: 24px;">
                <div style="font-weight: 900; color: #191F28; font-size: 14.5px; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
                    <span>⏳</span> 시간 확보 리포트
                </div>
                <div style="font-size: 14px; color: #059669; font-weight: 800; background: #ECFDF5; display: inline-block; padding: 8px 14px; border-radius: 10px; border: 1px solid #A7F3D0;">
                    ✅ 자유시간: 약 ${toy.freeTime} 확보
                </div>
            </div>

            <!-- 🛒 수익화 버튼 1: 까만색 쿠팡 집중 버튼 -->
            <a href="${finalLink}" target="_blank" style="display:flex; justify-content:center; align-items:center; gap:8px; width:100%; background:#191F28; color:#FFFFFF; border:none; padding:18px 16px; border-radius:14px; font-weight:900; font-size:15px; cursor:pointer; box-shadow: 0 4px 14px rgba(0,0,0,0.1); margin-bottom: 12px; text-decoration: none; transition: 0.2s;">
                ${btnText}
            </a>

            <!-- 💬 수익화 버튼 2: 노란색 카톡 공유 버튼 -->
            <button onclick="shareToHusband(${toy.id})" style="display:flex; justify-content:center; align-items:center; gap:8px; width:100%; background:#FEE500; color:#191919; border:none; padding:16px; border-radius:14px; font-weight:900; font-size:15px; cursor:pointer; box-shadow: 0 4px 12px rgba(254, 229, 0, 0.2); transition:0.2s;">
                <span style="font-size:18px;">💬</span> 남편에게 내 '자유시간' 사달라고 톡 보내기
            </button>

            ${batteryHtml}
        </div>
    `;
}

function shareToHusband(id) {
    const toy = toyData.find(t => t.id === id);
    if(!toy) return;

    const fallbackLink = "https://link.coupang.com/a/eH6x2qqnMy";
    const isFallback = (!toy.coupangLink || toy.coupangLink === '#' || toy.coupangLink.trim() === '');
    const finalLink = isFallback ? fallbackLink : toy.coupangLink;

    Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
            title: `여보 나 오늘 너무 힘들어 😭`,
            description: `[${toy.name}] 이거 하나만 로켓으로 쏴줘. 나 ${toy.freeTime} 쉴 수 있대!`,
            imageUrl: 'https://happy-baby0303.github.io/baby-master/toy/og-image.png',
            link: { mobileWebUrl: finalLink, webUrl: finalLink },
        },
        buttons: [{ title: `💳 여보 찬스로 바로 결제하기`, link: { mobileWebUrl: finalLink, webUrl: finalLink } }]
    });
}

document.addEventListener('DOMContentLoaded', () => {
    applyGlobalBabyProfile();

    const msChips = document.querySelectorAll('.ms-chip');
    const themeCards = document.querySelectorAll('.theme-card');

    msChips.forEach(chip => {
        chip.addEventListener('click', (e) => {
            msChips.forEach(c => c.classList.remove('active'));
            themeCards.forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            
            const ms = e.target.getAttribute('data-milestone');
            renderToys(ms === 'all' ? toyData : toyData.filter(t => t.milestone === ms || t.milestone === 'all'));
        });
    });

    themeCards.forEach(card => {
        card.addEventListener('click', (e) => {
            themeCards.forEach(c => c.classList.remove('active'));
            msChips.forEach(c => c.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            const theme = e.currentTarget.getAttribute('data-theme');
            renderToys(toyData.filter(t => t.theme === theme));
        });
    });
});