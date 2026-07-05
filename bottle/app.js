// ==========================================
// 🍼 육아메이트 플랫폼 엔진 V3.6 (bottle/app.js)
// (매칭률에 따른 카드 테두리 및 뱃지 컬러 차등 적용)
// ==========================================

let isFavViewMode = false; 

// 🚀 1. 메인 화면 데이터 자동 동기화
function applyGlobalBabyProfile() {
    const birthStr = localStorage.getItem('tosil_startDate');
    const babyName = localStorage.getItem('tosil_babyName') || '우리 아기';
    if(!birthStr) return; 
    
    const birthDate = new Date(birthStr);
    const today = new Date();
    let months = (today.getFullYear() - birthDate.getFullYear()) * 12 + (today.getMonth() - birthDate.getMonth());
    if (months < 0) months = 0; 

    let ageFilter = 'all';
    if (months <= 3) { ageFilter = 'newborn'; }
    else if (months <= 6) { ageFilter = 'infant'; }
    else { ageFilter = 'toddler'; }

    const ageSelect = document.getElementById('filter-age');
    if(ageSelect) ageSelect.value = ageFilter;

    // ✂️ 기존 파란색 큰 배너는 꼴도 보기 싫으니 숨김 처리!
    const banner = document.getElementById('auto-sync-banner');
    if(banner) {
        banner.style.display = 'none'; 
    }

    // ✨ 대신 새로 만든 '쿨한 뱃지'에 아기 개월 수를 꽂아줍니다!
    const badge = document.getElementById('dynamic-age-badge');
    if(badge) {
        badge.innerText = `생후 ${months}개월 맞춤`;
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
            
            // 🔥 글자가 두 줄로 깨지는 현상 완벽 방어!
            btn.style.whiteSpace = 'nowrap'; 
            btn.style.flexShrink = '0';
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
        resultArea.innerHTML = `<div class="premium-empty-state" style="padding:40px; text-align:center; background:#FFF; border-radius:16px;"><div class="empty-icon" style="font-size:40px; margin-bottom:12px;">💔</div><div class="empty-text"><b>아직 찜한 젖병이 없어요!</b><br><span style="font-size:13px; color:#8B95A1;">마음에 드는 젖병에 하트(❤️)를 눌러보세요.</span></div></div>`;
        return;
    }

    let favItems = bottleData.filter(item => favorites.includes(item.id));
    let htmlOutput = `<div style="font-size: 16px; font-weight: 900; color: #E32636; margin-bottom: 16px;">❤️ 내 찜 보관함 (${favItems.length}개)</div>`;
    htmlOutput += favItems.map(item => generateCardHTML({ ...item, matchRate: null })).join('');
    resultArea.innerHTML = htmlOutput;
}

// 🚀 4. 카드 생성 (✨ 매칭률에 따른 컬러 완전 분리 ✨)
function generateCardHTML(item) {
    const favorites = JSON.parse(localStorage.getItem('favBottles')) || [];
    const isFav = favorites.includes(item.id);
    const heartIcon = isFav ? '❤️ 찜 해제' : '🤍 찜하기';
    const heartColor = isFav ? '#FFF2F2' : '#F2F4F6';
    const heartText = isFav ? '#E32636' : '#4E5968';
    const heartBorder = isFav ? '#FCA5A5' : '#E5E8EB';

    // ✨ 동적 컬러 변수 세팅
    let cardBorderColor = '#D1D5DB'; // 기본 회색
    let scoreHtml = "";
    let aiReportHtml = '';

    if (item.matchRate !== null && !isFavViewMode && item.matchRate !== undefined) {
        let titleColor, bgColor, borderColor, titleText;
        
        // 100점: 파란색 (Premium)
        if (item.matchRate === 100) {
            titleColor = '#1B64DA'; bgColor = '#F0F7FF'; borderColor = '#3182F6';
            cardBorderColor = '#3182F6';
            titleText = '🟢 최적합 (Premium Match)';
        // 80점 이상: 녹색 (Good)
        } else if (item.matchRate >= 80) {
            titleColor = '#059669'; bgColor = '#ECFDF5'; borderColor = '#10B981';
            cardBorderColor = '#10B981';
            titleText = '🍀 우수 (Good Match)';
        // 50점 이상: 주황색 (Warning)
        } else if (item.matchRate >= 50) {
            titleColor = '#B78103'; bgColor = '#FFF9E6'; borderColor = '#F59E0B';
            cardBorderColor = '#F59E0B';
            titleText = '⚠️ 타협 필요 (Conditional)';
        // 50점 미만: 빨간색 (Danger)
        } else {
            titleColor = '#D32F2F'; bgColor = '#FFF0F1'; borderColor = '#F04452';
            cardBorderColor = '#F04452';
            titleText = '❌ 비추천 (Mismatch)';
        }

        scoreHtml = `<div style="font-size:14px; font-weight:800; color:${titleColor}; margin-top:4px;">매칭률 ${item.matchRate}%</div>`;

        let reasonLi = item.matchRate === 100 
            ? `<li style="margin-bottom:4px;">✨ ${item.matchReasons[0]}</li>`
            : item.matchReasons.map(r => `<li style="margin-bottom:4px;">🚨 <b>${r}</b></li>`).join('');

        aiReportHtml = `
            <div style="background:${bgColor}; border:1px solid ${borderColor}; padding:14px; border-radius:8px; margin-bottom:16px;">
                <h4 style="color:${titleColor}; margin:0 0 6px 0; font-size:13px;">${titleText}</h4>
                <ul style="margin:0; padding-left:20px; font-size:12.5px; color:${titleColor}; line-height:1.5;">${reasonLi}</ul>
            </div>`;
    }

    // 찜 화면일 때는 테두리를 빨간색으로 고정
    if (isFavViewMode) cardBorderColor = '#E32636';

    return `
        <div class="stroller-card" style="border-top: 4px solid ${cardBorderColor}; margin-bottom: 24px; padding: 20px; background:#FFF; border-radius:16px; box-shadow:0 4px 12px rgba(0,0,0,0.03);">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 8px;">
                <div>
                    <div style="font-size: 18px; font-weight: 900; color: #191F28;">${item.brand} ${item.name}</div>
                    ${scoreHtml}
                </div>
                <button id="fav-btn-${item.id}" onclick="toggleFavorite('${item.id}')" style="background:${heartColor}; color:${heartText}; border:1px solid ${heartBorder}; padding:6px 12px; border-radius:8px; font-weight:800; font-size:12px; cursor:pointer; transition:0.2s;">
                    ${heartIcon}
                </button>
            </div>
            
            ${aiReportHtml}

            <div style="background: #F2F4F6; padding: 14px; border-radius: 8px; font-size: 13px; color: #333D4B; margin-bottom: 16px; line-height: 1.5;">
                <b style="color:#191F28;">💡 큐레이션 포인트:</b><br>${item.desc}
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
// 🚀 5. 강력한 AI 감점 엔진
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
    const isFilterActive = (age !== 'all' || rejection !== 'all' || material !== 'all' || antiColic !== 'all' || compatible !== 'all' || price !== 'all' || sterilization !== 'all');

    let processedData = bottleData.map(item => {
        if (!isFilterActive) return { ...item, matchRate: null, matchReasons: [] };

        let score = 100;
        let reasons = [];

        if (age !== 'all' && (!item.age || !item.age.includes(age))) { 
            score -= 30; reasons.push('선택하신 아기 월령에 부적합합니다.'); 
        }
        if (rejection === 'super' && item.rejection !== 'super') { 
            score -= 40; reasons.push('젖꼭지 거부가 심한 아기에게는 추천하지 않습니다.'); 
        }
        if (material !== 'all' && item.material !== material) { 
            score -= 20; reasons.push('선호하시는 젖병 소재와 일치하지 않습니다.'); 
        }
        if (antiColic === 'super' && item.antiColic !== 'super') { 
            score -= 40; reasons.push('영아산통(배앓이) 완벽 차단 기능이 부족합니다.'); 
        } else if (antiColic === 'yes' && item.antiColic === 'normal') {
            score -= 20; reasons.push('일반적인 젖병으로 배앓이 특화 구조가 아닙니다.'); 
        }
        if (compatible === 'yes' && item.compatible !== 'yes') { 
            score -= 30; reasons.push('더블하트/모유실감 젖꼭지와 호환되지 않습니다.'); 
        }
        if (sterilization === 'uv' && item.wash === 'normal') { 
            score -= 20; reasons.push('UV 소독기 지속 사용 시 변색이나 균열 위험이 있습니다.'); 
        }
        if (sterilization === 'easy' && item.wash === 'uv') { 
            score -= 15; reasons.push('입구가 좁거나 부품이 많아 설거지가 번거로운 편입니다.'); 
        }
        if (price !== 'all' && item.price !== price) { 
            score -= 20; reasons.push('선택하신 가격대와 일치하지 않습니다.'); 
        }

        if(score < 0) score = 0;
        if(score === 100) reasons.push('✨ 선택하신 모든 조건에 완벽하게 부합합니다!');

        return { ...item, matchRate: score, matchReasons: reasons };
    });

    if (isFilterActive) processedData.sort((a, b) => b.matchRate - a.matchRate);

    if (processedData.length === 0) {
        resultArea.innerHTML = `<div class="premium-empty-state"><div class="empty-icon">🍼</div><div class="empty-text"><b>조건에 완벽하게 맞는 젖병이 없습니다.</b><span>초기화 버튼을 누르거나 필터를 완화해 보세요!</span></div></div>`;
        return;
    }

    let htmlOutput = `<div style="font-size: 16px; font-weight: 800; color: #191F28; margin-bottom: 16px;">✨ AI 맞춤 젖병 리포트</div>`;
    
    let top3Results = processedData.slice(0, 3); 
    let otherResults = processedData.slice(3); 
    
    htmlOutput += top3Results.map(item => generateCardHTML(item)).join('');

    if (otherResults.length > 0) {
        htmlOutput += `
            <button id="bottle-show-more-btn" onclick="toggleBottleOthers()" style="display: block; width: 100%; padding: 16px; margin-top: 8px; margin-bottom: 24px; background: #FFFFFF; border: 1px solid #D1D5DB; border-radius: 14px; font-size: 14px; font-weight: 700; color: #4E5968; cursor: pointer;">
                나머지 ${otherResults.length}개 결과 보기 ▾
            </button>
            <div id="bottle-other-area" style="display:none; flex-direction: column;">
                ${otherResults.map(item => generateCardHTML(item)).join('')}
            </div>
        `;
    }
    resultArea.innerHTML = htmlOutput;
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
    const myCoupangLink = `https://www.coupang.com/np/search?q=${encodeURIComponent(searchKeyword + ' 젖병')}`; 
    
    Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
            title: '여보! 우리 아기 젖병 이걸로 결정했어 🍼',
            description: `배앓이 오기 전에 세트로 쟁여놔줘! ❤️\n👉 추천 모델: ${searchKeyword}`,
            imageUrl: 'https://happy-baby0303.github.io/baby-master/stroller/og-image.png',
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

window.onload = () => { 
    applyGlobalBabyProfile(); 
    runBottleEngine(); 
};