// ==========================================
// 🍼 육아메이트 플랫폼 엔진 V3.2 (bottle/app.js)
// (메인화면 글로벌 데이터 자동 동기화 적용)
// ==========================================

let isFavViewMode = false; 

// 🚀 1. 메인 화면 데이터(tosil_startDate) 자동 동기화 로직
function applyGlobalBabyProfile() {
    // 대표님의 메인 로직에서 저장한 Key 값 불러오기
    const birthStr = localStorage.getItem('tosil_startDate');
    const babyName = localStorage.getItem('tosil_babyName') || '우리 아기';
    
    if(!birthStr) return; // 저장된 데이터가 없으면 그냥 패스 (기본 전체 검색)
    
    const birthDate = new Date(birthStr);
    const today = new Date();
    
    let months = (today.getFullYear() - birthDate.getFullYear()) * 12;
    months -= birthDate.getMonth();
    months += today.getMonth();
    if (months < 0) months = 0; // 출산 예정일인 경우 0개월 처리

    // 👶 개월 수에 따른 젖병 월령 필터 매핑
    let ageFilter = 'all';
    if (months <= 3) { ageFilter = 'newborn'; }
    else if (months <= 6) { ageFilter = 'infant'; }
    else { ageFilter = 'toddler'; }

    // HTML 필터 강제 변경
    const ageSelect = document.getElementById('filter-age');
    if(ageSelect) ageSelect.value = ageFilter;

    // 성공 알림 배너 띄우기
    const banner = document.getElementById('auto-sync-banner');
    if(banner) {
        banner.style.display = 'flex';
        banner.innerHTML = `<span style="font-size:18px; margin-right:8px;">✨</span> <div><b>${babyName}</b> 아기(생후 ${months}개월)의 월령에 맞춰 AI가 젖병 필터를 자동 세팅했어요!</div>`;
    }
}

// 🚀 2. 찜하기 기능 
function toggleFavorite(id) {
    let favorites = JSON.parse(localStorage.getItem('favBottles')) || [];
    let isFav = false; 

    if(favorites.includes(id)) {
        favorites = favorites.filter(fav => fav !== id); 
        isFav = false;
    } else {
        favorites.push(id); 
        isFav = true;
    }
    localStorage.setItem('favBottles', JSON.stringify(favorites));
    
    if (isFavViewMode) {
        renderFavorites(); 
    } else {
        const btn = document.getElementById(`fav-btn-${id}`);
        if (btn) {
            btn.innerHTML = isFav ? '❤️ 찜 해제' : '🤍 찜하기';
            btn.style.background = isFav ? '#FFF2F2' : '#F2F4F6';
            btn.style.color = isFav ? '#E32636' : '#4E5968';
            btn.style.borderColor = isFav ? '#FCA5A5' : '#E5E8EB';
        }
    }
}

// 🚀 3. 찜 보관함 토글
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
        btn.innerHTML = '❤️ 내가 찜한 젖병 모아보기';
        btn.style.background = '#FFF2F2';
        btn.style.color = '#E32636';
        btn.style.borderColor = '#FCA5A5';
        runBottleEngine(); 
    }
}

function renderFavorites() {
    const resultArea = document.getElementById('bottle-result-area');
    const favorites = JSON.parse(localStorage.getItem('favBottles')) || [];

    if (favorites.length === 0) {
        resultArea.innerHTML = `<div class="premium-empty-state"><div class="empty-icon">💔</div><div class="empty-text"><b>아직 찜한 젖병이 없어요!</b><span>마음에 드는 젖병에 하트(❤️)를 눌러보세요.</span></div></div>`;
        return;
    }

    let favItems = bottleData.filter(item => favorites.includes(item.id));
    let htmlOutput = `<div style="font-size: 16px; font-weight: 800; color: #E32636; margin-bottom: 16px;">❤️ 내 찜 보관함 (${favItems.length}개)</div>`;
    htmlOutput += favItems.map(item => generateCardHTML(item, favorites)).join('');
    resultArea.innerHTML = htmlOutput;
}

function generateCardHTML(item, favorites) {
    const isFav = favorites.includes(item.id);
    const heartIcon = isFav ? '❤️ 찜 해제' : '🤍 찜하기';
    const heartColor = isFav ? '#FFF2F2' : '#F2F4F6';
    const heartText = isFav ? '#E32636' : '#4E5968';
    const heartBorder = isFav ? '#FCA5A5' : '#E5E8EB';

    return `
        <div class="stroller-card" style="border-top: 4px solid ${isFavViewMode ? '#E32636' : '#3182F6'}; margin-bottom: 24px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 8px;">
                <div style="font-size: 18px; font-weight: 900; color: #191F28;">${item.brand} ${item.name}</div>
                <button id="fav-btn-${item.id}" onclick="toggleFavorite('${item.id}')" style="background:${heartColor}; color:${heartText}; border:1px solid ${heartBorder}; padding:6px 12px; border-radius:8px; font-weight:800; font-size:12px; cursor:pointer; transition:0.2s;">
                    ${heartIcon}
                </button>
            </div>
            
            <div style="background: #F2F4F6; padding: 14px; border-radius: 8px; font-size: 13px; color: #333D4B; margin-bottom: 16px; line-height: 1.5;">
                <b style="color:#191F28;">💡 AI 큐레이션 포인트:</b><br>${item.desc}
            </div>
            
            <ul style="margin: 0 0 16px 0; padding-left: 20px; font-size: 13px; color: #4E5968; line-height: 1.8; font-weight: 600;">
                <li><b>거부 극복:</b> ${item.rejection === 'super' ? '🔥 최우수' : '⭐ 일반적임'}</li>
                <li><b>젖꼭지 호환:</b> ${item.compatible === 'yes' ? '🟢 호환 가능' : '❌ 전용 젖꼭지 사용'}</li>
                <li><b>소독 세척:</b> ${item.sterilization}</li>
            </ul>

            <button onclick="shareToHusband('${item.searchKeyword}')" style="width:100%; background:#FEE500; color:#191919; border:none; padding:14px; border-radius:12px; font-weight:800; font-size:15px; cursor:pointer; display:flex; justify-content:center; align-items:center; gap:8px; margin-bottom: 8px;">
                <span style="font-size:18px;">💬</span> 남편에게 [세트] 장바구니 전송
            </button>

            <a href="../food/index.html" style="display:block; width:100%; background:#FFF; border:1px solid #3182F6; color:#3182F6; padding:14px; border-radius:12px; font-weight:800; font-size:14px; text-align:center; text-decoration:none; transition:0.2s;">
                🍲 이 젖병 떼면 먹일 [이유식 식단] 미리보기 ➔
            </a>
        </div>
    `;
}

// ----------------------------------------------------
// 기존 젖병 필터 엔진 로직
// ----------------------------------------------------
function runBottleEngine() {
    if (isFavViewMode) return; 

    const age = document.getElementById('filter-age')?.value || 'all';
    const rejection = document.getElementById('filter-rejection')?.value || 'all';
    const material = document.getElementById('filter-material')?.value || 'all';
    const antiColic = document.getElementById('filter-anticolic')?.value || 'all';
    const compatible = document.getElementById('filter-compatible')?.value || 'all';
    const price = document.getElementById('filter-price')?.value || 'all';
    const sterilization = document.getElementById('filter-sterilization')?.value || 'all';
    
    const resultArea = document.getElementById('bottle-result-area');
    const favorites = JSON.parse(localStorage.getItem('favBottles')) || []; 

    let filtered = bottleData.filter(item => {
        if (age !== 'all' && (!item.age || !item.age.includes(age))) return false;
        if (rejection === 'super' && item.rejection !== 'super') return false;
        if (material !== 'all' && item.material !== material) return false;
        if (antiColic !== 'all') {
            if (antiColic === 'yes' && item.antiColic === 'normal') return false; 
            if (antiColic === 'super' && item.antiColic !== 'super') return false; 
        }
        if (compatible !== 'all' && item.compatible !== compatible) return false;
        if (price !== 'all' && item.price !== price) return false;
        if (sterilization !== 'all' && item.wash !== sterilization) return false;
        return true;
    });

    if (filtered.length === 0) {
        resultArea.innerHTML = `<div class="premium-empty-state"><div class="empty-icon">🍼</div><div class="empty-text"><b>조건에 완벽하게 맞는 젖병이 없습니다.</b><span>초기화 버튼을 누르거나 필터를 완화해 보세요!</span></div></div>`;
    } else {
        let shuffled = filtered.sort(() => 0.5 - Math.random()); 
        let top3Results = shuffled.slice(0, 3); 
        let otherResults = shuffled.slice(3); 

        let htmlOutput = `<div style="font-size: 16px; font-weight: 800; color: #191F28; margin-bottom: 16px;">✨ AI 맞춤 젖병 세트 추천 TOP ${top3Results.length}</div>`;
        htmlOutput += top3Results.map(item => generateCardHTML(item, favorites)).join('');

        if (otherResults.length > 0) {
            htmlOutput += `
                <button id="bottle-show-more-btn" onclick="toggleBottleOthers()" style="display: block; width: 100%; padding: 16px; margin-top: 8px; margin-bottom: 24px; background: #FFFFFF; border: 1px solid #D1D5DB; border-radius: 14px; font-size: 14px; font-weight: 700; color: #4E5968; cursor: pointer;">
                    나머지 ${otherResults.length}개 결과 보기 ▾
                </button>
                <div id="bottle-other-area" style="display:none; flex-direction: column;">
                    ${otherResults.map(item => generateCardHTML(item, favorites)).join('')}
                </div>
            `;
        }
        resultArea.innerHTML = htmlOutput;
    }
}

function toggleBottleOthers() {
    const otherArea = document.getElementById('bottle-other-area');
    const btn = document.getElementById('bottle-show-more-btn');
    if (otherArea.style.display === 'none') {
        otherArea.style.display = 'flex';
        btn.innerText = '나머지 결과 접기 ▴';
    } else {
        otherArea.style.display = 'none';
        btn.innerText = `나머지 결과 보기 ▾`;
    }
}

function resetBottleFilters() {
    let isChanged = false;
    document.querySelectorAll('.matrix-panel select').forEach(select => {
        if (select.value !== 'all') { select.value = 'all'; isChanged = true; }
    });
    if (isChanged && !isFavViewMode) runBottleEngine();
}

// 🚀 카카오 SDK 초기화
if (!Kakao.isInitialized()) {
    Kakao.init('68bca10ddfe2ec67112b07eb9a08da2b');
}

function shareToHusband(searchKeyword) {
    // 🍼 프레시 링크 삭제! -> 누르면 해당 '젖병 이름'으로 쿠팡 자동 검색되도록 똑똑하게 변경!
    const myCoupangLink = `https://www.coupang.com/np/search?q=${encodeURIComponent(searchKeyword + ' 젖병')}`; 
    
    Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
            title: '여보! 우리 아기 젖병 이걸로 결정했어 🍼',
            description: `배앓이 오기 전에 세트로 쟁여놔줘! ❤️\n👉 추천 모델: ${searchKeyword}`,
            imageUrl: 'https://happy-baby0303.github.io/baby-master/stroller/og-image.png', // 썸네일 이미지
            link: { mobileWebUrl: myCoupangLink, webUrl: myCoupangLink },
        },
        buttons: [
            { title: '📦 남편 전용 결제링크 (쿠팡)', link: { mobileWebUrl: myCoupangLink, webUrl: myCoupangLink } }
        ],
    });
}

document.querySelectorAll('.matrix-panel select').forEach(select => {
    select.addEventListener('change', runBottleEngine);
});

// 🚀 페이지 로드 시: 동기화(applyGlobalBabyProfile) 먼저 하고 -> 엔진 실행!
window.onload = () => { 
    applyGlobalBabyProfile(); 
    runBottleEngine(); 
};
