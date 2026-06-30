// ==========================================
// 🛒 육아메이트 유모차 AI 엔진 V16.0 (강력한 감점 페널티 엔진 탑재!)
// ==========================================

let isFavViewMode = false;

// 🚀 글로벌 데이터 자동 동기화
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
    if (months <= 6) ageFilter = 'newborn';
    else if (months > 12) ageFilter = 'giant';

    const matBaby = document.getElementById('mat-baby');
    if(matBaby && ageFilter !== 'all') matBaby.value = ageFilter;

    const banner = document.getElementById('auto-sync-banner');
    if(banner) {
        banner.style.display = 'flex';
        banner.innerHTML = `<span style="font-size:18px; margin-right:8px;">✨</span> <div><b>${babyName}</b> 아기(생후 ${months}개월)의 월령에 맞춰 AI가 매칭 센서를 조율했어요!</div>`;
    }
}

// 🚀 찜하기 (하트 토글)
function toggleFavorite(id) {
    let favorites = JSON.parse(localStorage.getItem('favStrollers')) || [];
    let isFav = false;

    if(favorites.includes(id)) {
        favorites = favorites.filter(fav => fav !== id);
        isFav = false;
    } else {
        favorites.push(id);
        isFav = true;
    }
    localStorage.setItem('favStrollers', JSON.stringify(favorites));

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

// 🚀 찜 보관함 화면 전환
function toggleFavView() {
    isFavViewMode = !isFavViewMode;
    const btn = document.getElementById('btn-show-fav');
    const matrixPanel = document.querySelector('.matrix-panel');
    const filterSection = document.querySelector('.filter-section');

    if (isFavViewMode) {
        btn.innerHTML = '🔙 5D 매칭 화면으로 돌아가기';
        btn.style.background = '#F2F4F6';
        btn.style.color = '#4E5968';
        btn.style.borderColor = '#D1D5DB';
        if(matrixPanel) matrixPanel.style.display = 'none';
        if(filterSection) filterSection.style.display = 'none';
        renderFavorites();
    } else {
        btn.innerHTML = '❤️ 내가 찜한 유모차 모아보기';
        btn.style.background = '#FFF2F2';
        btn.style.color = '#E32636';
        btn.style.borderColor = '#FCA5A5';
        if(matrixPanel) matrixPanel.style.display = 'block';
        if(filterSection) filterSection.style.display = 'flex';
        renderList(false);
    }
}

function renderFavorites() {
    const topArea = document.getElementById('result-top-area');
    const otherArea = document.getElementById('result-other-area');
    const topTitle = document.getElementById('result-top-title');
    const showMoreBtn = document.getElementById('show-more-btn');

    const favorites = JSON.parse(localStorage.getItem('favStrollers')) || [];

    topTitle.style.display = 'none';
    if(showMoreBtn) showMoreBtn.style.display = 'none';
    if(otherArea) otherArea.style.display = 'none';

    if (favorites.length === 0) {
        topArea.innerHTML = `<div class="premium-empty-state" style="justify-content:center; padding: 40px;"><div class="empty-icon">💔</div><div class="empty-text" style="text-align:center;"><b>아직 찜한 유모차가 없어요!</b><span>마음에 드는 유모차에 하트(❤️)를 눌러보세요.</span></div></div>`;
        return;
    }

    let favItems = strollerData.filter(item => favorites.includes(item.id || item.name));

    let htmlOutput = `<div style="font-size: 18px; font-weight: 900; color: #E32636; margin-bottom: 16px;">❤️ 내 찜 보관함 (${favItems.length}개)</div>`;
    htmlOutput += favItems.map(item => generateCardHtml(item)).join('');
    topArea.innerHTML = htmlOutput;

    setTimeout(() => { document.querySelectorAll('.meter-fill, .v-bar-fill').forEach(el => { const height = el.getAttribute('data-height'); if(height) el.style.height = height; const width = el.getAttribute('data-width'); if(width) el.style.width = width; }); }, 50);
}

function runMatrixEngine(isUserAction = false) { renderList(isUserAction); }

function forceSwitchTab(cId, tabName) {
    const tabs = ['spec', 'fact', 'sim'];
    tabs.forEach(t => {
        const btn = document.getElementById(`btn-${cId}-${t}`);
        const content = document.getElementById(`content-${cId}-${t}`);
        if(btn && content) {
            if(t === tabName) { btn.classList.add('active'); content.style.display = 'block'; }
            else { btn.classList.remove('active'); content.style.display = 'none'; }
        }
    });
}

function renderVS() {
    const v1 = document.getElementById('vs-1').value, v2 = document.getElementById('vs-2').value, res = document.getElementById('vs-result');
    if (v1==="" || v2==="") { res.style.display='none'; return; }
    if (v1===v2) { res.innerHTML='<div style="color:#E32636; padding:12px; background:#FEECEF; border-radius:8px; text-align:center; font-weight:700;">서로 다른 모델을 선택해주세요.</div>'; res.style.display='block'; return; }

    const i1 = strollerData[v1], i2 = strollerData[v2];
    res.innerHTML = `
        <table class="vs-table" style="table-layout: fixed; word-break: keep-all; width: 100%;">
            <tr><th class="vs-label">대조항목</th><th style="color:#3182F6; font-weight:800;">${i1.name}</th><th style="color:#6B31F6; font-weight:800;">${i2.name}</th></tr>
            <tr><td class="vs-label">💰 공식가</td><td>${i1.price.toLocaleString()}원</td><td>${i2.price.toLocaleString()}원</td></tr>
            <tr><td class="vs-label">💸 부대비용</td><td style="color:#E32636; font-size:11px;">+${(i1.hiddenTax?.cost || 0).toLocaleString()}원</td><td style="color:#E32636; font-size:11px;">+${(i2.hiddenTax?.cost || 0).toLocaleString()}원</td></tr>
            <tr><td class="vs-label">🪶 무게</td><td>${i1.specs.weight}kg</td><td>${i2.specs.weight}kg</td></tr>
            <tr><td class="vs-label">👶 2인확장</td><td>${i1.expand.includes('⭕')?'가능':'불가'}</td><td>${i2.expand.includes('⭕')?'가능':'불가'}</td></tr>
        </table>
    `;
    res.style.display = 'block';
}

function getVolume(dims) { return (dims[0] * dims[1] * dims[2]) / 1000; }

function renderAdapterCard(brandName, textData) {
    if(!textData) return '';
    let statusClass = "good"; let icon = "✅"; let badgeText = "호환 완벽";
    if (textData.includes("❌")) { statusClass = "bad"; icon = "🚨"; badgeText = "호환 불가"; }
    else if (textData.includes("필요") || textData.includes("주의") || textData.includes("필수!")) { statusClass = "warn"; icon = "⚠️"; badgeText = "조건부 호환"; }
    let mainText = textData, subText = "";
    if(textData.includes("(")) { let parts = textData.split("("); mainText = parts[0].trim(); subText = "(" + parts[1]; }
    return `<div class="adapter-card"><div class="adapter-header"><div class="adapter-brand">${brandName}</div><div class="adapter-badge ${statusClass}">${icon} ${badgeText}</div></div><div class="adapter-main-desc">${mainText.replace(/[❌⭕🚨⚠️]/g, '')}</div>${subText ? `<div class="adapter-sub-desc">${subText.replace(/[❌⭕🚨⚠️]/g, '')}</div>` : ''}</div>`;
}

function toggleOthers() {
    const otherArea = document.getElementById('result-other-area');
    const btn = document.getElementById('show-more-btn');
    if (otherArea.style.display === 'none') {
        otherArea.style.display = 'flex'; btn.innerText = '나머지 결과 접기 ▴';
    } else {
        otherArea.style.display = 'none'; btn.innerText = '나머지 결과 보기 ▾';
    }
}

// 🌟 카드 렌더링 엔진 (디자인 겹침 해결 & AI 감점 리포트 추가)
function generateCardHtml(item) {
    const cId = item.originalIndex !== undefined ? item.originalIndex : Math.floor(Math.random() * 10000);
    const itemId = item.id || item.name; 

    const favorites = JSON.parse(localStorage.getItem('favStrollers')) || [];
    const isFav = favorites.includes(itemId);
    const heartIcon = isFav ? '❤️ 찜 해제' : '🤍 찜하기';
    const heartColor = isFav ? '#FFF2F2' : '#F2F4F6';
    const heartText = isFav ? '#E32636' : '#4E5968';
    const heartBorder = isFav ? '#FCA5A5' : '#E5E8EB';

let scoreHtml = "";
    if (item.matchRate !== null && !isFavViewMode) {
        let sColor = item.matchRate >= 80 ? "#3182F6" : (item.matchRate >= 50 ? "#F59E0B" : "#E32636");
        // ✨ top: 60px 삭제! 원래 예쁜 우측 상단 자리로 돌아가되, 버튼 뒤에 깔리도록 설정!
        scoreHtml = `<div class="match-score" style="color:${sColor}; pointer-events: none; z-index: 0;">${item.matchRate}%<span>AI 매칭</span></div>`;
    }
    const weightPercent = Math.min((item.specs.weight / 15) * 100, 100);
    const weightColor = item.specs.weight > 10 ? '#E32636' : (item.specs.weight > 6.5 ? '#F59E0B' : '#3182F6');
    let cabinStyle = item.specs.cabin.includes('⭕') ? 'color:#1B64DA; background:#E8F3FF;' : (item.specs.cabin.includes('⚠️') ? 'color:#C46C00; background:#FFF9E6;' : 'color:#E32636; background:#FEECEF;');

    const maxStrollerDim = Math.max(...item.foldedDims);
    let targetName = "20인치 기내용"; let targetDim = 55;
    if (maxStrollerDim > 70) { targetName = "28인치 캐리어"; targetDim = 75; }
    else if (maxStrollerDim > 55) { targetName = "24인치 캐리어"; targetDim = 65; }
    const maxGraphHeight = Math.max(maxStrollerDim, targetDim) + 10;
    const strollerHeightPct = (maxStrollerDim / maxGraphHeight) * 100;
    const carrierHeightPct = (targetDim / maxGraphHeight) * 100;
    let diffDesc = maxStrollerDim > targetDim ? `<div class="size-visual-desc warn">${targetName}보다 <b>${maxStrollerDim - targetDim}cm 더 큼</b></div>` : `<div class="size-visual-desc">${targetName}보다 <b>${targetDim - maxStrollerDim}cm 더 작음!</b></div>`;
    const visualGraphHtml = `<div class="size-visual-box"><div class="size-visual-title">📐 캐리어 대비 체감 크기</div><div class="visual-chart"><div class="v-bar-group"><div class="v-bar-bg"><div class="v-bar-fill carrier-color" data-height="${carrierHeightPct}%" style="height:0%;"></div></div><div class="v-bar-label">🧳 ${targetName}<br><b>${targetDim}cm</b></div></div><div class="v-bar-group"><div class="v-bar-bg"><div class="v-bar-fill stroller-color" data-height="${strollerHeightPct}%" style="height:0%;"></div></div><div class="v-bar-label">🛒 이 모델<br><b>${maxStrollerDim}cm</b></div></div></div>${diffDesc}</div>`;

    // 💡 ✨ 여기서부터 AI 감점 사유 리포트 출력! ✨
    let aiReportHtml = `<div class="premium-empty-state"><div class="empty-icon">💡</div><div class="empty-text"><b>AI 매칭 리포트 대기 중</b><span>가족 상황을 선택하시면 분석서가 출력됩니다.</span></div></div>`;
    if (!isFavViewMode && item.matchRate !== null) {
        let reasonLi = '';
        if (item.matchRate === 100) {
            reasonLi = `<li style="margin-bottom:4px;">✨ ${item.matchReasons[0]}</li>`;
        } else if (item.matchReasons && item.matchReasons.length > 0) {
            reasonLi = item.matchReasons.map(r => `<li style="margin-bottom:4px;">🚨 <b>${r}</b></li>`).join('');
        }

        if (item.matchRate >= 80) {
            aiReportHtml = `<div class="ai-sim-report" style="background:#F0F7FF; border:1px solid #3182F6; padding:16px; border-radius:14px; margin-bottom:12px;"><h4 style="color:#1B64DA; margin:0 0 8px 0; font-size:14px;">🟢 최적합 (Premium Match)</h4><ul style="margin:0; padding-left:20px; font-size:13px; color:#1B64DA; line-height:1.5;">${reasonLi}</ul></div>`;
        } else if (item.matchRate >= 50) {
            aiReportHtml = `<div class="ai-sim-report" style="background:#FFF9E6; border:1px solid #F59E0B; padding:16px; border-radius:14px; margin-bottom:12px;"><h4 style="color:#B78103; margin:0 0 8px 0; font-size:14px;">⚠️ 타협 필요 (Conditional)</h4><ul style="margin:0; padding-left:20px; font-size:13px; color:#B78103; line-height:1.5;">${reasonLi}</ul></div>`;
        } else {
            aiReportHtml = `<div class="ai-sim-report" style="background:#FFF0F1; border:1px solid #F04452; padding:16px; border-radius:14px; margin-bottom:12px;"><h4 style="color:#D32F2F; margin:0 0 8px 0; font-size:14px;">❌ 비추천 (Mismatch)</h4><ul style="margin:0; padding-left:20px; font-size:13px; color:#D32F2F; line-height:1.5;">${reasonLi}</ul></div>`;
        }
    }

    let ktxAlertHtml = '';
    const car = document.getElementById('mat-car') ? document.getElementById('mat-car').value : 'all';
    if (car === 'flight') {
        const minDim = Math.min(...item.foldedDims);
        if (minDim <= 25) ktxAlertHtml = `<div class="ktx-alert-box pass"><div class="ktx-icon">🚄</div><div><b>KTX/LCC 좌석 발밑 보관 ⭕</b><br>두께 ${minDim}cm로 앞좌석 발밑에 쏙 들어갑니다.</div></div>`;
        else ktxAlertHtml = `<div class="ktx-alert-box fail"><div class="ktx-icon">🚨</div><div><b>KTX/LCC 좌석 보관 불가 ❌</b><br>두께 ${minDim}cm. 짐칸 보관 필수.</div></div>`;
    } else if (car && car !== 'all' && typeof carDB !== 'undefined' && carDB[car]) {
        const carData = carDB[car];
        const dims = [...item.foldedDims].sort((a, b) => a - b);
        const minDim = dims[0], midDim = dims[1];
        const ratio = Math.round((getVolume(item.foldedDims) / carData.vol) * 100);
        if (minDim > carData.limitDepth) ktxAlertHtml = `<div class="ktx-alert-box fail"><div class="ktx-icon">🚨</div><div><b>테트리스 불가</b><br>${carData.name} 허용 깊이 초과. 뒷좌석 폴딩 필수.</div></div>`;
        else if (midDim > carData.limitHeight) ktxAlertHtml = `<div class="ktx-alert-box warn"><div class="ktx-icon">⚠️</div><div><b>입구 걸림 주의</b><br>${carData.name} 입구 높이 초과. 비틀어 넣어야 함.</div></div>`;
        else ktxAlertHtml = `<div class="ktx-alert-box pass"><div class="ktx-icon">🟢</div><div><b>${carData.name} 트렁크 프리패스</b><br>적재율 ${ratio}%. 여유 공간 남음.</div></div>`;
    }

    let gateHtml = '';
    if (item.width >= 65) { gateHtml = `<div class="gate-alert fail" style="margin-bottom:12px;">🚨 너비 ${item.width}cm: 일반 개찰구 불가. 휠체어 게이트 필수</div>`; } 
    else { gateHtml = `<div class="gate-alert pass" style="margin-bottom:12px;">🟢 너비 ${item.width}cm: 일반 개찰구/구형 엘베 프리패스</div>`; }

    const tabsHtml = `<div class="card-tabs"><div id="btn-${cId}-spec" class="tab-btn active" onclick="forceSwitchTab(${cId}, 'spec')">📊 기본스펙</div><div id="btn-${cId}-fact" class="tab-btn" onclick="forceSwitchTab(${cId}, 'fact')">🚨 실전팩트</div><div id="btn-${cId}-sim" class="tab-btn sim-tab-btn" onclick="forceSwitchTab(${cId}, 'sim')">🧬 AI리포트</div></div>`;

    const realPrice = item.price + (item.hiddenTax?.cost || 0);
    let taxHtml = (item.hiddenTax?.cost > 0) 
        ? `<div class="receipt-box"><div class="receipt-row"><span>공식 출고가</span><span>${item.price.toLocaleString()}원</span></div><div class="receipt-row tax"><span>+ 옵션추가</span><span>+${item.hiddenTax.cost.toLocaleString()}원</span></div><div class="receipt-desc">※ ${item.hiddenTax.items}</div><div class="receipt-total"><span>💸 체감 결제액</span><span>${realPrice.toLocaleString()}원</span></div></div>`
        : `<div class="receipt-box" style="border-color:#A7F3D0; background:#ECFDF5;"><div class="receipt-row" style="color:#065F46;"><span>공식 출고가</span><span>${item.price.toLocaleString()}원</span></div><div class="receipt-desc" style="color:#059669;">※ ${item.hiddenTax?.items || '추가비용 없음'} (옵션질 없음 쾌적!)</div><div class="receipt-total" style="color:#065F46; border-top-color:#A7F3D0;"><span>💸 체감 결제액</span><span>${realPrice.toLocaleString()}원</span></div></div>`;

    const asClass = item.asInfo?.status === 'good' ? 'as-good' : (item.asInfo?.status === 'warn' ? 'as-warn' : 'as-bad');
    const asTitle = item.asInfo?.status === 'good' ? 'A/S 안심 보장' : (item.asInfo?.status === 'warn' ? 'A/S 체크포인트' : 'A/S 리스크 경고');
    const asIcon = item.asInfo?.status === 'good' ? '🛡️' : (item.asInfo?.status === 'warn' ? '👀' : '🚨');

    let naverSearchUrl = `https://search.naver.com/search.naver?query=${encodeURIComponent(item.name + ' 유모차')}`;
    let buyBtnHtml = `<a href="${naverSearchUrl}" target="_blank" class="buy-btn naver">네이버 최저가 검색 〉</a>`;
    let safetyGuardHtml = '';

    if (item.affiliate) {
        let finalUrl = item.affiliate.url;
        if (item.affiliate.type === 'naver' || !finalUrl || finalUrl === '') finalUrl = naverSearchUrl;
        buyBtnHtml = `<a href="${finalUrl}" target="_blank" class="buy-btn ${item.affiliate.type}">${item.affiliate.label} 〉</a>`;
        if (item.affiliate.type === 'coupang') {
            safetyGuardHtml = `<div class="coupang-safety-guard">※ 육아메이트는 본사 A/S가 보장되는 로켓배송 링크를 우선 제공합니다.<br>단품 구매 시 반드시 <b>[로켓배송] 마크</b>를 확인하세요.</div>`;
        }
    }

    const crossSellHtml = `
        <a href="../carseat/index.html" style="display:block; width:100%; background:#FFF; border:1px solid #3182F6; color:#3182F6; padding:14px; border-radius:12px; font-weight:800; font-size:14px; text-align:center; text-decoration:none; transition:0.2s; margin-top:12px;">
            🚘 이 유모차와 어울리는 [안전 카시트] 알아보기 ➔
        </a>
    `;

    return `
    <div class="stroller-card" id="card-${cId}" style="border-top: 4px solid ${isFavViewMode ? '#E32636' : 'transparent'};">
        <div style="position:relative;">
            <span style="background:#F2F4F6; color:#4E5968; font-size:11px; font-weight:800; padding:6px 12px; border-radius:20px;">${item.type}</span>
            ${scoreHtml}
            
            <div style="display:flex; align-items:center; gap:10px; margin:14px 0 6px;">
                <div style="font-size:22px; font-weight:900; letter-spacing:-0.5px; color:#191F28;">${item.name}</div>
                <button id="fav-btn-${itemId}" onclick="toggleFavorite('${itemId}')" style="background:${heartColor}; color:${heartText}; border:1px solid ${heartBorder}; padding:6px 10px; border-radius:8px; font-weight:800; font-size:12px; cursor:pointer; transition:0.2s;">
                    ${heartIcon}
                </button>
            </div>
        </div>
        ${taxHtml}
        ${tabsHtml}
        <div style="min-height: 250px;">
            <div id="content-${cId}-spec" class="tab-content" style="display:block;">
                <div class="spec-list">
                    <div class="spec-row"><span class="spec-label">👶 2인 확장성</span><span class="spec-val" style="color:#3182F6;">${item.expand}</span></div>
                    <div class="spec-row"><span class="spec-label">본체 실측 무게</span><div style="text-align:right; width:60%;"><div class="spec-val" style="color:${weightColor};">${item.specs.weight}kg</div><div class="meter-container"><div class="meter-fill" data-width="${weightPercent}%" style="width:0%; background:${weightColor};"></div></div></div></div>
                    <div class="spec-row"><span class="spec-label">폴딩 메커니즘</span><span class="spec-val">${item.specs.folding}</span></div>
                    <div class="spec-row"><span class="spec-label">정규 기내반입</span><span style="${cabinStyle} padding:6px 10px; border-radius:8px; font-size:12px; font-weight:800;">${item.specs.cabin}</span></div>
                    ${gateHtml}
                    ${visualGraphHtml}
                </div>
            </div>
            <div id="content-${cId}-fact" class="tab-content" style="display:none;">
                <div class="fact-list">
                    <div class="fact-item"><div class="fact-icon">🛣️</div><div class="fact-info"><div class="fact-title">보도블럭 주행 지수</div><div class="fact-desc">${item.road}</div></div></div>
                    <div class="fact-item"><div class="fact-icon">🧼</div><div class="fact-info"><div class="fact-title">분리 세척 난이도</div><div class="fact-desc">${item.wash}</div></div></div>
                    <div class="fact-item"><div class="fact-icon">✈️</div><div class="fact-info"><div class="fact-title">인프라 피팅 (항공/카페)</div><div class="fact-desc">${item.flight}</div></div></div>
                    <div class="fact-item"><div class="fact-icon">🦴</div><div class="fact-info"><div class="fact-title">양육자 관절 타격 지수</div><div class="fact-desc">${item.joint}</div></div></div>
                    <div class="fact-item ${asClass}"><div class="fact-icon">${asIcon}</div><div class="fact-info"><div class="fact-title">${asTitle}</div><div class="fact-desc">${item.asInfo?.text || ''}</div></div></div>
                </div>
            </div>
            <div id="content-${cId}-sim" class="tab-content" style="display:none;">
                ${aiReportHtml}
                ${ktxAlertHtml}
                <div class="adapter-container">
                    <div class="adapter-title">🔩 카시트 트래블 호환 부품</div>
                    <div class="adapter-list">
                        ${renderAdapterCard('싸이벡스/뉴나 규격', item.adapter.maxi)}
                        ${renderAdapterCard('스토케 비세이프 규격', item.adapter.stokke)}
                    </div>
                </div>
            </div>
        </div>
        <div class="insight-box"><div class="title">💡 단점 & 아쉬운 점 팩트체크</div><div class="text" style="word-break: keep-all; line-height: 1.5;">${item.flaw}</div></div>
        ${buyBtnHtml}
        ${safetyGuardHtml}
        ${crossSellHtml}
    </div>
    `;
}

// 🧠 깐깐한 감점(Penalty) AI 리포팅 엔진 (예산 칼각 패치 완료!)
function renderList(isUserAction = false) {
    const topArea = document.getElementById('result-top-area');
    const otherArea = document.getElementById('result-other-area');
    const topTitle = document.getElementById('result-top-title');
    const showMoreBtn = document.getElementById('show-more-btn');
    if (!topArea) return;

    const env = document.getElementById('mat-env').value;
    const car = document.getElementById('mat-car').value;
    const baby = document.getElementById('mat-baby').value;
    const parent = document.getElementById('mat-parent').value;
    const budget = document.getElementById('mat-budget').value;
    const isMatrixActive = (env !== 'all' || car !== 'all' || baby !== 'all' || parent !== 'all' || budget !== 'all');

    if (isUserAction) {
        const urlParams = new URLSearchParams(window.location.search);
        if(env !== 'all') urlParams.set('env', env); else urlParams.delete('env');
        if(car !== 'all') urlParams.set('car', car); else urlParams.delete('car');
        if(baby !== 'all') urlParams.set('baby', baby); else urlParams.delete('baby');
        if(parent !== 'all') urlParams.set('parent', parent); else urlParams.delete('parent');
        if(budget !== 'all') urlParams.set('budget', budget); else urlParams.delete('budget');
        const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
        window.history.replaceState({}, '', newUrl);
    }

    // 💡 강력한 감점 알고리즘 적용
    let processedData = strollerData.map((item, index) => {
        if (!isMatrixActive) return { ...item, originalIndex: index, matchRate: null, matchReasons: [] };

        let score = 100;
        let reasons = [];

        // 1. 💰 절대 조건: 예산 (자비 없는 칼각 컷팅!)
        if (budget === 'under40' && item.price > 400000) {
            score -= 50; reasons.push(`예산 초과 (공식가 ${(item.price/10000).toFixed(0)}만 원)`);
        } else if (budget === 'under100' && item.price > 1000000) {
            // ✨ 110만 원에서 100만 원으로 엄격하게 수정! 100만 원 넘으면 무조건 -50점!
            score -= 50; reasons.push(`예산 초과 (공식가 ${(item.price/10000).toFixed(0)}만 원)`);
        }

        // 2. 🏡 환경: 계단 없는 빌라면 무게가 깡패
        if (env === 'stairs' && item.specs.weight > 8.5) {
            score -= 40; reasons.push(`계단 운반에 치명적인 무게 (${item.specs.weight}kg)`);
        } else if (env === 'mall' && item.width >= 60) {
            score -= 15; reasons.push(`실내 주행 시 좁은 길 불편 (너비 ${item.width}cm)`);
        }

        // 3. 🚗 차/비행기 물리적 한계
        if (car === 'flight') {
            if (item.specs.cabin.includes('❌')) { 
                score -= 50; reasons.push('기내 반입 불가 (무조건 화물 위탁)'); 
            } else if (item.specs.cabin.includes('⚠️')) { 
                score -= 15; reasons.push('항공사(LCC) 규정에 따라 기내 반입 거절 위험'); 
            }
        } else if (car === 'ray' || car === 'casper') {
            const vol = getVolume(item.foldedDims);
            if (vol > 100) { score -= 30; reasons.push('경차 트렁크 적재 시 뒷좌석 폴딩 필수'); }
        } else if (car !== 'all' && car !== 'flight') {
            const vol = getVolume(item.foldedDims);
            if (vol > 200) { score -= 20; reasons.push('세단/SUV 트렁크 공간을 과도하게 차지함'); }
        }

        // 4. 👶 아기 성장 / 뼈대
        if (baby === 'newborn' && (item.type === '휴대용' || item.type === '트라이크')) {
            score -= 30; reasons.push('디럭스/절충형에 비해 신생아 머리 흔들림 위험 노출');
        } else if (baby === 'giant' && item.backrest < 50) {
            score -= 15; reasons.push('우량아에게는 등받이나 시트가 좁게 느껴질 수 있음');
        } else if (baby === 'twins' && !item.expand.includes('⭕') && item.type !== '쌍둥이' && item.type !== '웨건') {
            score -= 60; reasons.push('쌍둥이/연년생 동반 탑승 절대 불가');
        }

        // 5. 🦴 부모 관절
        if (parent === 'joint' && item.specs.weight >= 9.0) {
            score -= 30; reasons.push(`약해진 손목에 무리가 가는 무게 (${item.specs.weight}kg)`);
        }

        // 결과 합산
        if (score === 100) reasons.push('선택하신 모든 라이프스타일 조건에 완벽히 부합합니다!');
        if (score < 0) score = 0; // 최소 0점 방어

        return { ...item, originalIndex: index, matchRate: score, matchReasons: reasons };
    });

    const activeFilters = Array.from(document.querySelectorAll('.stroller-filt-btn.active')).map(btn => btn.getAttribute('data-filter'));
    if (activeFilters.length > 0) {
        processedData = processedData.filter(item => {
            const typeFilters = activeFilters.filter(f => f.startsWith('type-'));
            if (typeFilters.length > 0) {
                const matchesType = typeFilters.some(f => {
                    if (f === 'type-디럭스') return item.type === '디럭스';
                    if (f === 'type-절충형') return item.type === '절충형';
                    if (f === 'type-휴대용') return item.type === '휴대용';
                    if (f === 'type-쌍둥이') return item.type === '쌍둥이' || item.type === '웨건';
                    if (f === 'type-트라이크') return item.type === '트라이크';
                    return false;
                });
                if (!matchesType) return false;
            }
            if (activeFilters.includes('spec-autofold') && !item.specs.folding.includes('오토')) return false;
            if (activeFilters.includes('spec-cabin') && !item.specs.cabin.includes('⭕')) return false;
            if (activeFilters.includes('spec-light') && item.specs.weight > 6.5) return false;
            if (activeFilters.includes('spec-heavy') && item.specs.weight < 10) return false;
            if (activeFilters.includes('price-under50') && item.price > 500000) return false;
            if (activeFilters.includes('price-over100') && item.price < 1000000) return false;
            return true;
        });
    }

    if (isMatrixActive) processedData.sort((a, b) => b.matchRate - a.matchRate);

    if(processedData.length === 0) { 
        topArea.innerHTML = `<div class="premium-empty-state" style="justify-content:center; padding: 40px;"><div class="empty-text" style="text-align:center;"><b>조건에 맞는 모델이 없습니다.</b><span>필터나 선택 사항을 조금 완화해 보세요.</span></div></div>`; 
        otherArea.innerHTML = ''; topTitle.style.display = 'none'; showMoreBtn.style.display = 'none'; return; 
    }

    if (isMatrixActive && processedData.length > 3) {
        topTitle.style.display = 'flex'; showMoreBtn.style.display = 'block'; showMoreBtn.innerText = `나머지 ${processedData.length - 3}개 분석 결과 보기 ▾`; otherArea.style.display = 'none';
        topArea.innerHTML = processedData.slice(0, 3).map(generateCardHtml).join('');
        otherArea.innerHTML = processedData.slice(3).map(generateCardHtml).join('');
    } else {
        topTitle.style.display = 'none'; showMoreBtn.style.display = 'none'; otherArea.innerHTML = '';
        topArea.innerHTML = processedData.map(generateCardHtml).join('');
    }

    setTimeout(() => { document.querySelectorAll('.meter-fill, .v-bar-fill').forEach(el => { const height = el.getAttribute('data-height'); if(height) el.style.height = height; const width = el.getAttribute('data-width'); if(width) el.style.width = width; }); }, 50);
}

document.addEventListener('click', function(e) {
    if (e.target.classList.contains('stroller-filt-btn')) { const btn = e.target; btn.classList.toggle('active'); renderList(); }
});

function scrollToResults() {
    const titleEl = document.getElementById('result-top-title');
    if (titleEl && titleEl.style.display !== 'none') {
        const y = titleEl.getBoundingClientRect().top + window.pageYOffset - 80;
        window.scrollTo({ top: y, behavior: 'smooth' });
    } else {
        const filterEl = document.querySelector('.filter-section');
        if (filterEl) {
            const y = filterEl.getBoundingClientRect().top + window.pageYOffset - 80;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    }
}

function resetAll() {
    document.getElementById('mat-env').value = 'all';
    document.getElementById('mat-car').value = 'all';
    document.getElementById('mat-baby').value = 'all';
    document.getElementById('mat-parent').value = 'all';
    document.getElementById('mat-budget').value = 'all';

    document.querySelectorAll('.stroller-filt-btn').forEach(btn => btn.classList.remove('active'));
    window.history.replaceState({}, '', window.location.pathname);

    if(!isFavViewMode) renderList(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.addEventListener('scroll', () => {
    const upBtn = document.getElementById('scrollTopBtn');
    if (upBtn) {
        if (window.scrollY > 400) {
            upBtn.style.display = 'flex';
        } else {
            upBtn.style.display = 'none';
        }
    }
});

// 🚀 페이지 로드 시: 동기화(applyGlobalBabyProfile) 실행!
window.onload = () => {
    const sel1 = document.getElementById('vs-1'), sel2 = document.getElementById('vs-2');
    let opt = '<option value="">선택</option>';
    if (typeof strollerData !== 'undefined') { strollerData.forEach((s, i) => { opt += `<option value="${i}">${s.name}</option>`; }); }
    if(sel1) sel1.innerHTML = opt; if(sel2) sel2.innerHTML = opt;

    const urlParams = new URLSearchParams(window.location.search);
    if(urlParams.has('env')) document.getElementById('mat-env').value = urlParams.get('env');
    if(urlParams.has('car')) document.getElementById('mat-car').value = urlParams.get('car');
    if(urlParams.has('baby')) document.getElementById('mat-baby').value = urlParams.get('baby');
    if(urlParams.has('parent')) document.getElementById('mat-parent').value = urlParams.get('parent');
    if(urlParams.has('budget')) document.getElementById('mat-budget').value = urlParams.get('budget');

    applyGlobalBabyProfile(); 
    renderList(false);
};

function trackClick(itemName, actionType) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ 'event': 'btn_click', 'click_type': actionType, 'item_name': itemName });
}

document.addEventListener('click', function(e) {
    if (e.target.classList.contains('buy-btn')) {
        const card = e.target.closest('.stroller-card');
        if (card) {
            const itemName = card.querySelector('div[style*="font-size:22px"]').innerText;
            trackClick(itemName, 'PURCHASE_CLICK');
        }
    }
});

function showComingSoon(category) {
    alert(`💡 ${category} AI 분석 엔진은 현재 딥러닝 학습 중입니다!\n(다음 업데이트를 기대해 주세요)`);
}

// 🚀 카카오 SDK 초기화
if (!Kakao.isInitialized()) {
    Kakao.init('68bca10ddfe2ec67112b07eb9a08da2b');
}

function shareResult() {
    const shareUrl = window.location.href; 
    Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
            title: '육아메이트 AI 5D 유모차 매칭 🛒',
            description: '우리 가족 라이프스타일과 트렁크 크기에 딱 맞는 유모차를 AI로 찾아보세요!',
            imageUrl: 'https://happy-baby0303.github.io/baby-master/stroller/og-image.png',
            link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
        },
        buttons: [
            { title: '🔍 AI 매칭 결과 확인하기', link: { mobileWebUrl: shareUrl, webUrl: shareUrl } }
        ],
    });
}