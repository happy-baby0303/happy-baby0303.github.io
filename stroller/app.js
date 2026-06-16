// ==========================================
// ⚙️ 육아메이트 엔진 (로직 전담 파일 V15.5 - 수동 검색 & 오토스크롤 제거)
// ==========================================

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
        <table class="vs-table">
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

function generateCardHtml(item) {
    const cId = item.originalIndex;
    let scoreHtml = "";
    if (item.matchRate !== null) {
        let sColor = item.matchRate >= 80 ? "#3182F6" : (item.matchRate >= 40 ? "#F59E0B" : "#8B95A1");
        scoreHtml = `<div class="match-score" style="color:${sColor};">${item.matchRate}%<span>AI 매칭</span></div>`;
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

    const env = document.getElementById('mat-env').value;
    const car = document.getElementById('mat-car').value;
    const baby = document.getElementById('mat-baby').value;
    const parent = document.getElementById('mat-parent').value;
    const budget = document.getElementById('mat-budget').value;

    let aiReportHtml = `<div class="premium-empty-state"><div class="empty-icon">💡</div><div class="empty-text"><b>AI 매칭 리포트 대기 중</b><span>가족 상황을 선택하시면 분석서가 출력됩니다.</span></div></div>`;
    if (env !== 'all' || car !== 'all' || baby !== 'all' || parent !== 'all' || budget !== 'all') {
        if (item.matchRate >= 80) aiReportHtml = `<div class="ai-sim-report match-100"><h4>🟢 최적합 (Premium Match)</h4><p>조건에 80% 이상 완벽히 부합합니다.</p></div>`;
        else if (item.matchRate >= 40) aiReportHtml = `<div class="ai-sim-report match-warn"><h4>⚠️ 타협 필요 (Conditional)</h4><p>리프팅 하중 및 부피 등 일부 타협이 필요합니다.</p></div>`;
        else aiReportHtml = `<div class="ai-sim-report match-danger"><h4>🚨 비추천 (Mismatch)</h4><p>특수 상황과 충돌하여 당근마켓 처분 확률이 매우 높습니다.</p></div>`;
    }
    
    let ktxAlertHtml = '';
    if (car === 'flight') {
        const minDim = Math.min(...item.foldedDims);
        if (minDim <= 25) ktxAlertHtml = `<div class="ktx-alert-box pass"><div class="ktx-icon">🚄</div><div><b>KTX/LCC 좌석 발밑 보관 ⭕</b><br>두께 ${minDim}cm로 앞좌석 발밑에 쏙 들어갑니다.</div></div>`;
        else ktxAlertHtml = `<div class="ktx-alert-box fail"><div class="ktx-icon">🚨</div><div><b>KTX/LCC 좌석 보관 불가 ❌</b><br>두께 ${minDim}cm. 짐칸 보관 필수.</div></div>`;
    } else if (car && car !== 'all' && carDB[car]) {
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

    return `
    <div class="stroller-card" id="card-${cId}">
        <div style="position:relative;">
            <span style="background:#F2F4F6; color:#4E5968; font-size:11px; font-weight:800; padding:6px 12px; border-radius:20px;">${item.type}</span>
            ${scoreHtml}
            <div style="font-size:22px; font-weight:900; margin:14px 0 6px; letter-spacing:-0.5px; color:#191F28;">${item.name}</div>
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
        <div class="insight-box"><div class="title">💡 단점 & 아쉬운 점 팩트체크</div><div class="text">${item.flaw}</div></div>
        ${buyBtnHtml}
        ${safetyGuardHtml}
    </div>
    `;
}

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

    // URL 실시간 업데이트 (자동 스크롤은 제거됨)
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

    let processedData = strollerData.map((item, index) => {
        let matched = 0, total = 0;
        if (env !== 'all') { total++; if (item.tags.env === env) matched++; if (env === 'stairs' && item.specs.weight > 9) matched--; }
        if (car !== 'all') { total++; const isCompactOrFlight = ['ray', 'casper', 'carnival', 'flight'].includes(car); const isSedan = ['avante', 'sonata', 'grandeur'].includes(car); if (isCompactOrFlight && (item.foldedDims[0] <= 24 || item.type === '휴대용' || item.type === '트라이크')) matched++; else if (isSedan && item.foldedDims[0] <= 35) matched++; else if (!isCompactOrFlight && !isSedan) matched++; }
        if (baby !== 'all') { total++; if (baby === 'twins' && item.expand.includes('⭕')) matched += 2; else if (baby === 'newborn' && item.type === '디럭스') matched++; else if (baby === 'giant' && item.backrest >= 52) matched++; }
        if (parent !== 'all') { total++; if (parent === 'joint' && item.specs.weight <= 8.7) matched++; else if (parent === 'strong' && (item.type === '디럭스' || item.type === '쌍둥이' || item.type === '웨건')) matched++; }
        if (budget !== 'all') { total++; if (budget === 'under40' && item.price <= 400000) matched++; else if (budget === 'under100' && item.price <= 1100000) matched++; else if (budget === 'all') matched++; }
        let matchRate = total > 0 ? Math.max(5, Math.min(100, Math.round((matched / total) * 100))) : null;
        return { ...item, originalIndex: index, matchRate: matchRate };
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

    const isMatrixActive = (env !== 'all' || car !== 'all' || baby !== 'all' || parent !== 'all' || budget !== 'all');
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

// 🌟 [추가됨] 검색 버튼 클릭 시 부드럽게 결과로 이동
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

// 🌟 [추가됨] 전체 초기화 함수
function resetAll() {
    document.getElementById('mat-env').value = 'all';
    document.getElementById('mat-car').value = 'all';
    document.getElementById('mat-baby').value = 'all';
    document.getElementById('mat-parent').value = 'all';
    document.getElementById('mat-budget').value = 'all';

    document.querySelectorAll('.stroller-filt-btn').forEach(btn => btn.classList.remove('active'));
    window.history.replaceState({}, '', window.location.pathname);

    renderList(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 🌟 [추가됨] 맨 위로 스크롤 함수
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 🌟 [추가됨] 스크롤 내리면 '↑ 버튼' 나타나게 하기
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

    renderList(false);
};

function trackClick(itemName, actionType) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ 'event': 'btn_click', 'click_type': actionType, 'item_name': itemName });
    console.log("📈 [GTM 데이터레이어 전송 완료]:", itemName, actionType);
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

function shareResult() {
    const shareUrl = window.location.href;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile && navigator.share) {
        navigator.share({
            title: '육아메이트 AI 유모차 매칭',
            text: '우리 가족에게 딱 맞는 유모차를 AI로 찾아보세요!',
            url: shareUrl
        }).catch((err) => console.log('유저가 공유 창을 닫았습니다.'));
    } else {
        navigator.clipboard.writeText(shareUrl).then(() => {
            alert('🔗 육아메이트 접속 링크가 복사되었습니다!\n카톡이나 맘카페에 붙여넣기(Ctrl+V) 해주세요.');
        }).catch(err => {
            alert('링크 복사에 실패했습니다. 인터넷 창 상단의 주소를 직접 복사해주세요.');
        });
    }
}