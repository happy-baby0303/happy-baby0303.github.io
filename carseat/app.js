let isFavViewMode = false; 

function applyGlobalBabyProfile() {
    const birthStr = localStorage.getItem('tosil_startDate');
    const babyName = localStorage.getItem('tosil_babyName') || '우리 아기';
    if(!birthStr) return;
    
    const birthDate = new Date(birthStr);
    const today = new Date();
    let months = (today.getFullYear() - birthDate.getFullYear()) * 12;
    months -= birthDate.getMonth();
    months += today.getMonth();
    if (months < 0) months = 0;

    let ageFilter = 'all';
    if (months <= 11) ageFilter = 'newborn';
    else if (months <= 48) ageFilter = 'toddler';
    else ageFilter = 'junior';

    const ageSelect = document.getElementById('filter-age');
    if(ageSelect) ageSelect.value = ageFilter;

    const banner = document.getElementById('auto-sync-banner');
    if(banner) {
        // 🔥 여기서부터가 고쳐진 부분입니다 (flex 제거, block 적용, 줄바꿈 방지)
        banner.style.display = 'block'; 
        banner.style.textAlign = 'center';
        banner.style.lineHeight = '1.6';
        banner.style.wordBreak = 'keep-all';
        banner.style.padding = '16px';
        
        const safeText = `<span style="white-space: nowrap; display: inline-block; font-weight: 800;">✨ ${babyName} 아기(생후 ${months}개월)</span>`;
        banner.innerHTML = `${safeText}의 안전을 위해 연령 필터가 자동 세팅되었습니다!`;
    }
}

function toggleFavorite(id) {
    let favorites = JSON.parse(localStorage.getItem('favCarseats')) || [];
    let isFav = false; 
    if(favorites.includes(id)) {
        favorites = favorites.filter(fav => fav !== id); 
        isFav = false;
    } else {
        favorites.push(id); 
        isFav = true;
    }
    localStorage.setItem('favCarseats', JSON.stringify(favorites));
    
    if (isFavViewMode) renderFavorites(); 
    else {
        const btn = document.getElementById(`fav-btn-${id}`);
        if (btn) {
            btn.innerHTML = isFav ? '❤️ 찜 해제' : '🤍 찜하기';
            btn.style.background = isFav ? '#FFF2F2' : '#F2F4F6';
            btn.style.color = isFav ? '#E32636' : '#4E5968';
            btn.style.borderColor = isFav ? '#FCA5A5' : '#E5E8EB';
        }
    }
}

function toggleFavView() {
    isFavViewMode = !isFavViewMode;
    const btn = document.getElementById('btn-show-fav');
    const warningBanner = document.getElementById('vehicle-warning-banner');

    if (isFavViewMode) {
        btn.innerHTML = '🔙 검색 화면으로 돌아가기';
        btn.style.background = '#F2F4F6';
        btn.style.color = '#4E5968';
        btn.style.borderColor = '#D1D5DB';
        if(warningBanner) warningBanner.style.display = 'none';
        renderFavorites();
    } else {
        btn.innerHTML = '❤️ 내가 찜한 카시트 모아보기';
        btn.style.background = '#FFF2F2';
        btn.style.color = '#E32636';
        btn.style.borderColor = '#FCA5A5';
        runCarseatEngine(); 
    }
}

function renderFavorites() {
    const resultArea = document.getElementById('carseat-result-area');
    const favorites = JSON.parse(localStorage.getItem('favCarseats')) || [];

    if (favorites.length === 0) {
        resultArea.innerHTML = `<div class="empty-state"><b>아직 찜한 카시트가 없어요!</b><br>마음에 드는 모델에 하트(❤️)를 눌러보세요.</div>`;
        return;
    }

    let favItems = carseatData.filter(item => favorites.includes(item.id));
    let htmlOutput = `<div style="font-size: 16px; font-weight: 800; color: #E32636; margin-bottom: 16px;">❤️ 내 찜 보관함 (${favItems.length}개)</div>`;
    htmlOutput += favItems.map(item => generateReportHTML(item, favorites)).join('');
    resultArea.innerHTML = htmlOutput;
}

function runCarseatEngine() {
    if (isFavViewMode) return; 

    const age = document.getElementById('filter-age').value;
    const carSize = document.getElementById('filter-car').value;
    const install = document.getElementById('filter-install').value; 
    const safety = document.getElementById('filter-safety').value;
    
    const warningBanner = document.getElementById('vehicle-warning-banner');
    
    if (carSize === 'carnival' && install === 'isofix_leg') {
        warningBanner.style.display = 'block';
        warningBanner.style.background = '#FFF0F0';
        warningBanner.style.color = '#E32636';
        warningBanner.style.border = '1px solid #FCA5A5';
        warningBanner.innerHTML = `🚨 <b>바닥 파손 주의:</b> 카니발 등 바닥에 수납함이 있는 차량에 '바닥 지지대(레그)'를 설치하면 파손 위험이 있습니다. <b>'탑테더' 방식</b> 혹은 <b>'벨트 고정형 바구니 카시트'</b>를 권장합니다.`;
    } else if (carSize === 'compact') {
        warningBanner.style.display = 'block';
        warningBanner.style.background = '#FFF0F0';
        warningBanner.style.color = '#E32636';
        warningBanner.style.border = '1px solid #FCA5A5';
        warningBanner.innerHTML = `🚨 <b>조수석 간섭 주의:</b> 소형/준중형 차량은 대형 회전형 장착 시 조수석이 좁아집니다. 슬림형 모델이나 <b>'컴팩트 바구니형'</b> 제품을 우선 검토하세요.`;
    } else {
        warningBanner.style.display = 'none';
    }

    const resultArea = document.getElementById('carseat-result-area');
    const favorites = JSON.parse(localStorage.getItem('favCarseats')) || [];

    let filtered = carseatData.filter(item => {
        if (age !== 'all' && !item.age.includes(age)) return false;
        if (carSize !== 'all' && !item.carSize.includes(carSize)) return false;
        if (install !== 'all' && !item.install.includes(install)) return false; 
        if (safety !== 'all' && !item.safety.includes(safety)) return false;
        return true;
    });

    if (filtered.length === 0) {
        resultArea.innerHTML = `<div class="empty-state"><b>조건을 완벽히 충족하는 모델이 없습니다.</b><br>장착 방식이나 연령 필터를 조금 완화해 보세요!</div>`;
        return;
    }

    let htmlOutput = `<div style="font-size: 16px; font-weight: 800; color: #191F28; margin-bottom: 16px;">✨ 안전/호환성 검증 통과 모델 (${filtered.length}개)</div>`;
    htmlOutput += filtered.map(item => generateReportHTML(item, favorites)).join('');
    resultArea.innerHTML = htmlOutput;
}

function generateReportHTML(item, favorites) {
    const isFav = favorites ? favorites.includes(item.id) : false;
    const heartIcon = isFav ? '❤️ 찜 해제' : '🤍 찜하기';
    const heartColor = isFav ? '#FFF2F2' : '#F2F4F6';
    const heartText = isFav ? '#E32636' : '#4E5968';
    const heartBorder = isFav ? '#FCA5A5' : '#E5E8EB';

    const safetyChecks = item.safety.map(s => `✅ ${s.toUpperCase()} 최고 등급 인증 획득`).join('<br>');
    const adacText = item.specs.adacScore.includes('미참여') 
        ? `✅ ${item.specs.adacScore}` 
        : `✅ ADAC 테스트: ${item.specs.adacScore}`;

    const reportBtn = item.reportUrl !== "#" 
        ? `<a href="${item.reportUrl}" target="_blank" style="display:inline-block; margin-top:8px; font-size:12px; color:#3182F6; text-decoration:underline; font-weight:700;">🔗 ADAC 충돌 테스트 원문 보기 ➔</a>` 
        : '';
        
    let purchaseBtn = '';
    if (item.purchasePlatform === 'coupang') {
        purchaseBtn = `
            <a href="${item.linkUrl}" target="_blank" style="display:block; width:100%; padding:14px; background:#0073e9; color:white; border:none; border-radius:10px; font-weight:800; font-size:15px; cursor:pointer; text-align:center; margin-bottom:12px; text-decoration:none;">
                🚀 로켓배송 최저가 확인하기
            </a>
        `;
    } else {
        purchaseBtn = `
            <a href="${item.linkUrl}" target="_blank" style="display:block; width:100%; padding:14px; background:#191F28; color:white; border:none; border-radius:10px; font-weight:800; font-size:15px; cursor:pointer; text-align:center; margin-bottom:12px; text-decoration:none;">
                👑 브랜드 공식 스토어 가기
            </a>
        `;
    }

    const techSpecHTML = item.specs.sideProtection 
        ? `✅ <b>기술 스펙:</b> ${item.specs.sideProtection}<br>` 
        : ``;

    return `
        <div class="report-card">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 6px;">
                <div style="font-size: 20px; font-weight: 900; color: #191F28;">[${item.brand}] ${item.name}</div>
                <button id="fav-btn-${item.id}" onclick="toggleFavorite('${item.id}')" style="background:${heartColor}; color:${heartText}; border:1px solid ${heartBorder}; padding:6px 12px; border-radius:8px; font-weight:800; font-size:12px; cursor:pointer; transition:0.2s;">
                    ${heartIcon}
                </button>
            </div>
            
            <div style="font-size: 13px; font-weight: 800; color: #3182F6; margin-bottom: 16px;">
                ${item.bodySpec}
            </div>
            
            <div class="safety-box">
                <div style="font-weight: 800; color: #2F9E44; margin-bottom: 8px;">🛡️ 인증 리포트 & 장착 방식</div>
                <div style="font-size: 14px; line-height: 1.6; color: #333D4B;">
                    ${safetyChecks}<br>
                    ${adacText}<br>
                    ✅ <b>안전 장치:</b> ${item.specs.reboundStopper}<br>
                    ${techSpecHTML}${reportBtn}
                </div>
            </div>

            <div style="font-size: 14px; color: #4E5968; margin-bottom: 20px; line-height: 1.5;">
                <b style="color: #191F28;">💡 전문가 소견:</b><br>${item.desc}
            </div>

            ${purchaseBtn}

            <button onclick="shareToHusband('${item.id}')" style="width:100%; padding:14px; background:#2F9E44; color:white; border:none; border-radius:10px; font-weight:800; font-size:15px; cursor:pointer; margin-bottom: 12px;">
                🟢 남편에게 이 '안전 리포트' 전송하기
            </button>

            <div style="background: #FFFBEB; padding: 14px; border-radius: 10px; font-size: 13px; color: #8A6D3B; border: 1px dashed #FDE68A; line-height: 1.5;">
                <b style="color: #D97706;">💡 AI 카시트 설치 필수 꿀팁:</b><br>
                새 카시트 장착 시 <b>차량 가죽시트 눌림 및 영구 파손</b>이 100% 발생합니다. 카시트가 도착하기 전, 뒤보기 시 아기 상태를 볼 수 있는 <b>'후방거울'과 '보호매트'</b>를 꼭 미리 세팅해 두세요!<br>
                <a href="https://link.coupang.com/a/eEtXJsuJxc" target="_blank" style="display:inline-block; margin-top:8px; color: #D97706; font-weight: 800; text-decoration: underline;">👉 차박살 방지! 보호매트+거울 세트 로켓배송 담기</a>
            </div>
        </div>
    `;
}

function resetFilters() {
    let isChanged = false;
    document.querySelectorAll('.matrix-panel select').forEach(select => {
        if (select.value !== 'all') { select.value = 'all'; isChanged = true; }
    });
    if (isChanged && !isFavViewMode) runCarseatEngine();
}

if (!Kakao.isInitialized()) {
    Kakao.init('68bca10ddfe2ec67112b07eb9a08da2b');
}

function shareToHusband(id) {
    const item = carseatData.find(d => d.id === id);
    if(!item) return;

    const myLink = item.linkUrl.includes("여기에") 
        ? `https://www.coupang.com/np/search?q=${encodeURIComponent(item.searchKeyword)}`
        : item.linkUrl; 
        
    Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
            title: `여보! 우리 아기 카시트는 [${item.brand} ${item.name}] 제품으로 사자 💺❤️`,
            description: `${item.bodySpec}\n우리아이 생명이 달린 거니까 호환성 리포트 확인하고 이 링크로 결제해줘 🥰`, 
            imageUrl: 'https://happy-baby0303.github.io/baby-master/stroller/og-image.png',
            link: { mobileWebUrl: myLink, webUrl: myLink },
        },
        buttons: [
            { title: `💳 여보 전용 결제 및 상세정보 확인`, link: { mobileWebUrl: myLink, webUrl: myLink } }
        ],
    });
}

document.querySelectorAll('.matrix-panel select').forEach(select => {
    select.addEventListener('change', runCarseatEngine);
});

window.onload = () => { 
    applyGlobalBabyProfile(); 
    runCarseatEngine(); 
};