let isFavViewMode = false; 

if (!Kakao.isInitialized()) {
    Kakao.init('68bca10ddfe2ec67112b07eb9a08da2b');
}

// 🚀 글로벌 데이터 자동 동기화 (모바일 글씨 찢어짐 완벽 방어 패치)
function applyGlobalBabyProfile() {
    const birthStr = localStorage.getItem('tosil_startDate');
    const babyName = localStorage.getItem('tosil_babyName') || '우리 아기';
    const banner = document.getElementById('auto-sync-banner');
    
    let autoMilestone = 'all'; 

    if(birthStr) {
        const birthDate = new Date(birthStr);
        const today = new Date();
        let months = (today.getFullYear() - birthDate.getFullYear()) * 12 + (today.getMonth() - birthDate.getMonth());
        if (months < 0) months = 0;

        // 🔥 핵심 수정: flex를 버리고 block으로 강제 지정, 글자 안 찢어지게 nowrap 적용
        banner.style.display = 'block';
        banner.style.textAlign = 'center';
        banner.style.lineHeight = '1.6';
        banner.style.wordBreak = 'keep-all';
        
        const safeText = `<span style="white-space: nowrap; display: inline-block;">${babyName} 아기(생후 ${months}개월)</span>`;
        banner.innerHTML = `✨ <b>${safeText}</b>의 월령에 맞춰 AI가 매칭 센서를 조율했어요!`;

        if (months <= 3) autoMilestone = 'tummy';
        else if (months <= 6) autoMilestone = 'flip';
        else if (months <= 9) autoMilestone = 'crawl';
        else autoMilestone = 'stand';
    }

    const targetChip = document.querySelector(`.ms-chip[data-milestone="${autoMilestone}"]`);
    if (targetChip) {
        document.querySelectorAll('.ms-chip').forEach(c => c.classList.remove('active'));
        targetChip.classList.add('active');
    }

    const initialData = autoMilestone === 'all' 
        ? toyData 
        : toyData.filter(t => t.milestone === autoMilestone || t.milestone === 'all');
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

function toggleFavView() {
    isFavViewMode = !isFavViewMode;
    const btn = document.getElementById('btn-show-fav');
    if (isFavViewMode) {
        btn.innerHTML = '🔙 검색 화면으로 돌아가기';
        btn.style.background = '#4E5968'; btn.style.color = '#FFFFFF';
        renderFavorites();
    } else {
        btn.innerHTML = '❤️ 내가 찜한 장난감 모아보기';
        btn.style.background = '#333D4B'; btn.style.color = '#FFFFFF';
        
        const activeChip = document.querySelector('.ms-chip.active');
        const ms = activeChip ? activeChip.getAttribute('data-milestone') : 'all';
        const filteredData = ms === 'all' ? toyData : toyData.filter(t => t.milestone === ms || t.milestone === 'all');
        renderToys(filteredData);
    }
}

function renderFavorites() {
    const resultArea = document.getElementById('toy-result-area');
    const favs = JSON.parse(localStorage.getItem('favToys')) || [];
    if (favs.length === 0) {
        resultArea.innerHTML = `<div style="text-align:center; padding:40px; color:#8B95A1;">아직 찜한 장난감이 없어요!</div>`;
        return;
    }
    const favItems = toyData.filter(item => favs.includes(item.id));
    resultArea.innerHTML = `<div style="font-weight:800; color:#E32636; margin-bottom:16px;">❤️ 내 찜 보관함 (${favItems.length}개)</div>` 
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

    // 🔋 건전지 크로스셀링 로직
    let batteryHtml = toy.battery !== "건전지 필요 없음" ? `
        <div style="background:#FFFBEB; padding:12px; border-radius:8px; font-size:13px; color:#8A6D3B; margin-top:12px;">
            <b style="color:#D97706;">⚡ 앗! 건전지 잊지 않으셨죠? (${toy.battery})</b><br>
            <a href="${toy.batteryLink}" target="_blank" style="color:#D97706; font-weight:800; text-decoration:underline;">👉 로켓배송 건전지 같이 담기</a>
        </div>` : '';

    // 🚀 [핵심] 빈 링크 방어(Fallback) 및 UX 텍스트 동적 변환 로직
    const fallbackLink = "https://link.coupang.com/a/eH6x2qqnMy"; // 대표님의 쿠팡 홈 메인 링크
    const isFallback = (!toy.coupangLink || toy.coupangLink === '#' || toy.coupangLink.trim() === '');
    
    const finalLink = isFallback ? fallbackLink : toy.coupangLink;
    const btnText = isFallback 
        ? `🔍 쿠팡에서 '${toy.name}' 검색해보기` 
        : `🚀 로켓배송 최저가 확인하기`;

    return `
        <div class="report-card">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px;">
                <div style="display:flex; gap:16px; align-items:center;">
                    <div class="toy-img-placeholder">${toy.imgIcon}</div>
                    <div>
                        <div style="font-size:20px; font-weight:900;">${toy.name}</div>
                        <div style="font-size:13px; font-weight:800; color:#3182F6; margin-top:4px;">${toy.tags}</div>
                    </div>
                </div>
                <button id="fav-btn-${toy.id}" onclick="toggleFavorite(${toy.id})" style="background:${hBg}; color:${hCol}; border:1px solid ${hBor}; padding:6px 12px; border-radius:8px; font-weight:800; font-size:12px; cursor:pointer;">${hIcon}</button>
            </div>

            <div style="background:#FFF2F2; padding:12px; border-radius:8px; border:1px solid #FCA5A5; margin-bottom:12px;">
                <span style="font-weight:900; color:#E32636; font-size:13px;">🚨 AI 팩트폭격</span>
                <div style="font-size:13px; color:#333D4B; margin-top:4px; font-weight:700;">${toy.fomo}</div>
            </div>
            
            <div class="safety-box">
                <div style="font-weight:800; color:#2F9E44; margin-bottom:8px; font-size:14px;">⏳ 시간 확보 리포트</div>
                <div style="font-size:14px; color:#333D4B;">✅ <b>자유시간:</b> 약 ${toy.freeTime} 확보</div>
            </div>

            <a href="${finalLink}" target="_blank" style="display:block; width:100%; padding:14px; background:#3182F6; color:white; border:none; border-radius:10px; font-weight:800; font-size:15px; cursor:pointer; text-align:center; text-decoration:none;">${btnText}</a>
            
            <button onclick="shareToHusband(${toy.id})" style="width:100%; padding:14px; background:#FEE500; color:#3C1E1E; border:none; border-radius:10px; font-weight:900; font-size:14px; cursor:pointer; margin-top:8px;">💬 남편에게 내 '자유시간' 사달라고 톡 보내기</button>
            ${batteryHtml}
        </div>`;
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