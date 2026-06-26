// ==========================================
// 🚘 육아메이트 카시트 AI 큐레이터 엔진 V4.0 (carseat/app.js)
// (강력한 감점 AI 탑재 + 조잡한 하드코딩 배너 제거 및 개별 리포트화)
// ==========================================

let isFavViewMode = false; 

// 🚀 1. 글로벌 데이터 자동 동기화 (파트너님 UI 패치 보존)
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
        banner.style.display = 'block'; 
        banner.style.textAlign = 'center';
        banner.style.lineHeight = '1.6';
        banner.style.wordBreak = 'keep-all';
        banner.style.padding = '16px';
        
        const safeText = `<span style="white-space: nowrap; display: inline-block; font-weight: 800;">✨ ${babyName} 아기(생후 ${months}개월)</span>`;
        banner.innerHTML = `${safeText}의 안전을 위해 연령 필터가 자동 세팅되었습니다!`;
    }
}

// 🚀 2. 찜하기 기능
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

    if (isFavViewMode) {
        btn.innerHTML = '🔙 검색 화면으로 돌아가기';
        btn.style.background = '#F2F4F6';
        btn.style.color = '#4E5968';
        btn.style.borderColor = '#D1D5DB';
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
        resultArea.innerHTML = `<div class="premium-empty-state" style="padding:40px; text-align:center; background:#FFF; border-radius:16px;"><div class="empty-icon" style="font-size:40px; margin-bottom:12px;">💔</div><div class="empty-text"><b>아직 찜한 카시트가 없어요!</b><br><span style="font-size:13px; color:#8B95A1;">마음에 드는 모델에 하트(❤️)를 눌러보세요.</span></div></div>`;
        return;
    }

    let favItems = carseatData.filter(item => favorites.includes(item.id));
    let htmlOutput = `<div style="font-size: 16px; font-weight: 800; color: #E32636; margin-bottom: 16px;">❤️ 내 찜 보관함 (${favItems.length}개)</div>`;
    htmlOutput += favItems.map(item => generateReportHTML({ ...item, matchRate: null })).join('');
    resultArea.innerHTML = htmlOutput;
}

// 🚀 3. 강력해진 AI 카드 렌더링 엔진
function generateReportHTML(item) {
    const favorites = JSON.parse(localStorage.getItem('favCarseats')) || [];
    const isFav = favorites.includes(item.id);
    const heartIcon = isFav ? '❤️ 찜 해제' : '🤍 찜하기';
    const heartColor = isFav ? '#FFF2F2' : '#F2F4F6';
    const heartText = isFav ? '#E32636' : '#4E5968';
    const heartBorder = isFav ? '#FCA5A5' : '#E5E8EB';

    // ✨ AI 매칭률 점수 및 컬러 세팅
    let cardBorderColor = '#D1D5DB'; 
    let scoreHtml = "";
    let aiReportHtml = '';

    if (item.matchRate !== null && !isFavViewMode && item.matchRate !== undefined) {
        let titleColor, bgColor, borderColor, titleText;
        
        if (item.matchRate === 100) {
            titleColor = '#1B64DA'; bgColor = '#F0F7FF'; borderColor = '#3182F6';
            cardBorderColor = '#3182F6'; titleText = '🟢 최적합 (Premium Match)';
        } else if (item.matchRate >= 80) {
            titleColor = '#059669'; bgColor = '#ECFDF5'; borderColor = '#10B981';
            cardBorderColor = '#10B981'; titleText = '🍀 우수 (Good Match)';
        } else if (item.matchRate >= 50) {
            titleColor = '#B78103'; bgColor = '#FFF9E6'; borderColor = '#F59E0B';
            cardBorderColor = '#F59E0B'; titleText = '⚠️ 장착 주의 (Conditional)';
        } else {
            titleColor = '#D32F2F'; bgColor = '#FFF0F1'; borderColor = '#F04452';
            cardBorderColor = '#F04452'; titleText = '❌ 호환 불가/비추천 (Mismatch)';
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

    if (isFavViewMode) cardBorderColor = '#E32636';

    const safetyChecks = item.safety.map(s => `✅ ${s.toUpperCase()} 최고 등급 인증`).join('<br>');
    const adacText = item.specs.adacScore.includes('미참여') 
        ? `✅ ${item.specs.adacScore}` 
        : `✅ ADAC 테스트: ${item.specs.adacScore}`;

    const reportBtn = item.reportUrl !== "#" 
        ? `<a href="${item.reportUrl}" target="_blank" style="display:inline-block; margin-top:8px; font-size:12px; color:#3182F6; text-decoration:underline; font-weight:700;">🔗 ADAC 충돌 테스트 원문 보기 ➔</a>` 
        : '';
        
    let purchaseBtn = item.purchasePlatform === 'coupang' 
        ? `<a href="${item.linkUrl}" target="_blank" style="display:block; width:100%; padding:14px; background:#0073e9; color:white; border:none; border-radius:10px; font-weight:800; font-size:15px; cursor:pointer; text-align:center; margin-bottom:12px; text-decoration:none;">🚀 로켓배송 최저가 확인하기</a>`
        : `<a href="${item.linkUrl}" target="_blank" style="display:block; width:100%; padding:14px; background:#191F28; color:white; border:none; border-radius:10px; font-weight:800; font-size:15px; cursor:pointer; text-align:center; margin-bottom:12px; text-decoration:none;">👑 브랜드 공식 스토어 가기</a>`;

    const techSpecHTML = item.specs.sideProtection ? `✅ <b>기술 스펙:</b> ${item.specs.sideProtection}<br>` : ``;

    return `
        <div class="report-card" style="border-top: 4px solid ${cardBorderColor}; padding: 20px; background:#FFF; border-radius:16px; margin-bottom:24px; box-shadow:0 4px 12px rgba(0,0,0,0.03);">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 6px;">
                <div>
                    <div style="font-size: 20px; font-weight: 900; color: #191F28;">[${item.brand}] ${item.name}</div>
                    ${scoreHtml}
                </div>
                <button id="fav-btn-${item.id}" onclick="toggleFavorite('${item.id}')" style="background:${heartColor}; color:${heartText}; border:1px solid ${heartBorder}; padding:6px 12px; border-radius:8px; font-weight:800; font-size:12px; cursor:pointer; transition:0.2s;">
                    ${heartIcon}
                </button>
            </div>
            
            ${aiReportHtml}

            <div style="font-size: 13px; font-weight: 800; color: #3182F6; margin-bottom: 16px;">
                ${item.bodySpec}
            </div>
            
            <div class="safety-box" style="background:#F8F9FA; padding:16px; border-radius:10px; margin-bottom:16px;">
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
                새 카시트 장착 시 <b>차량 가죽시트 눌림 및 영구 파손</b>이 100% 발생합니다. 카시트 도착 전, 후방거울과 보호매트를 꼭 미리 세팅해 두세요!<br>
                <a href="https://link.coupang.com/a/eEtXJsuJxc" target="_blank" style="display:inline-block; margin-top:8px; color: #D97706; font-weight: 800; text-decoration: underline;">👉 보호매트+거울 세트 로켓배송 담기</a>
            </div>
        </div>
    `;
}

// ----------------------------------------------------
// 🚀 4. 핵심: 깐깐한 감점(Penalty) AI 엔진 도입!
// ----------------------------------------------------
function runCarseatEngine() {
    if (isFavViewMode) return; 

    const age = document.getElementById('filter-age').value;
    const carSize = document.getElementById('filter-car').value;
    const install = document.getElementById('filter-install').value; 
    const safety = document.getElementById('filter-safety').value;
    
    // 조잡했던 전역 배너는 이제 삭제! (개별 AI 리포트에서 처리합니다)
    const warningBanner = document.getElementById('vehicle-warning-banner');
    if(warningBanner) warningBanner.style.display = 'none';

    const resultArea = document.getElementById('carseat-result-area');
    const isFilterActive = (age !== 'all' || carSize !== 'all' || install !== 'all' || safety !== 'all');

    let processedData = carseatData.map(item => {
        if (!isFilterActive) return { ...item, matchRate: null, matchReasons: [] };

        let score = 100;
        let reasons = [];

        // 1. 👶 연령 조건 (안전 직결 - 불일치 시 대폭 감점)
        if (age !== 'all' && !item.age.includes(age)) { 
            score -= 60; reasons.push('선택하신 아기 탑승 연령대와 규격이 맞지 않아 극히 위험합니다.'); 
        }

        // 2. 🛠️ 장착 방식 (차량 호환성 - 불일치 시 가차없이 탈락)
        if (install !== 'all' && !item.install.includes(install)) { 
            score -= 50; reasons.push('요청하신 고정 방식(ISOFIX/벨트)으로 장착할 수 없는 모델입니다.'); 
        }

        // 3. 🛡️ 안전 인증
        if (safety !== 'all' && !item.safety.includes(safety)) { 
            score -= 20; reasons.push('요청하신 최상위 안전 인증/테스트 기준을 충족하지 않습니다.'); 
        }

        // 4. 🚙 차량 크기 & 특수 조건 (AI의 소름 돋는 디테일!)
        if (carSize === 'carnival' && item.install.includes('isofix_leg')) {
            score -= 50; reasons.push('카니발 2열 바닥 수납함이 서포팅 레그 하중으로 인해 파손될 위험이 큽니다! (탑테더 방식 권장)');
        }
        if (carSize === 'compact') {
            if (item.age.includes('toddler')) { // 회전형/토들러 모델의 경우
                score -= 20; reasons.push('소형/준중형 차량 장착 시 조수석 탑승자가 매우 좁아질 수 있습니다.');
            }
        }
        if (carSize !== 'all' && !item.carSize.includes(carSize)) {
            score -= 10; reasons.push('선택하신 차량 크기에 장착 시 공간 효율이 떨어질 수 있습니다.');
        }

        if(score < 0) score = 0;
        if(score === 100) reasons.push('✨ 우리 아기의 생명과 차량 호환성을 완벽하게 충족합니다!');

        return { ...item, matchRate: score, matchReasons: reasons };
    });

    if (isFilterActive) processedData.sort((a, b) => b.matchRate - a.matchRate);

    if (processedData.length === 0) {
        resultArea.innerHTML = `<div class="premium-empty-state"><div class="empty-icon">🚘</div><div class="empty-text"><b>조건에 완벽하게 맞는 카시트가 없습니다.</b><span>차량 고정 방식 등을 한 번 더 확인해 주세요!</span></div></div>`;
        return;
    }

    let htmlOutput = `<div style="font-size: 16px; font-weight: 800; color: #191F28; margin-bottom: 16px;">✨ AI 안전성/호환성 검증 리포트</div>`;
    
    let top3Results = processedData.slice(0, 3); 
    let otherResults = processedData.slice(3); 
    
    htmlOutput += top3Results.map(item => generateReportHTML(item)).join('');

    if (otherResults.length > 0) {
        htmlOutput += `
            <button id="carseat-show-more-btn" onclick="toggleCarseatOthers()" style="display: block; width: 100%; padding: 16px; margin-top: 8px; margin-bottom: 24px; background: #FFFFFF; border: 1px solid #D1D5DB; border-radius: 14px; font-size: 14px; font-weight: 700; color: #4E5968; cursor: pointer;">
                나머지 ${otherResults.length}개 결과 보기 ▾
            </button>
            <div id="carseat-other-area" style="display:none; flex-direction: column;">
                ${otherResults.map(item => generateReportHTML(item)).join('')}
            </div>
        `;
    }
    resultArea.innerHTML = htmlOutput;
}

function toggleCarseatOthers() {
    const otherArea = document.getElementById('carseat-other-area');
    const btn = document.getElementById('carseat-show-more-btn');
    if (otherArea.style.display === 'none') {
        otherArea.style.display = 'flex';
        btn.innerText = '나머지 결과 접기 ▴';
    } else {
        otherArea.style.display = 'none';
        btn.innerText = `나머지 결과 보기 ▾`;
    }
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

// 🚀 [추가] 장착 방식 가이드 모달 열기/닫기 함수
window.openInstallGuide = function() { document.getElementById('install-guide-modal').style.display = 'flex'; };
window.closeInstallGuide = function() { document.getElementById('install-guide-modal').style.display = 'none'; };