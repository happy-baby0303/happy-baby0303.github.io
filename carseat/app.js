// ==========================================
// 🚘 배냇함 카시트 큐레이터 (carseat/app.js)
// 조건 점수 계산 · 카시트 카드 · 찜 · 카톡 공유
// ※ GitHub Pages 라 이 파일은 누구나 열어볼 수 있다. 주석도 화면 문구처럼 쓴다.
// ==========================================


// 🚀 카카오 SDK 초기화 (안전 보호막)
try {
    if (typeof Kakao !== 'undefined' && !Kakao.isInitialized()) {
        Kakao.init('68bca10ddfe2ec67112b07eb9a08da2b');
    }
} catch (e) {
    console.warn("카카오 SDK 초기화 지연", e);
}

// 버튼 끝 화살표. '〉' 글자는 글꼴마다 높이가 달라 줄이 어긋난다.
const CS_CHEVRON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="margin-left:4px; flex-shrink:0;" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
// 장착 방식 이름. 카드 제목엔 '장착 방식' 이라고 써놓고 정작 방식은 안 보여줬다.
const CS_INSTALL = { isofix_leg: 'ISOFIX + 지지대(레그)', isofix_tether: 'ISOFIX + 탑테더(끈)', belt: '안전벨트' };
// '📏 40~105cm / ⚖️ 최대 19kg' → ['키 40~105cm', '몸무게 최대 19kg']
function csSpecParts(item) {
    return String(item.bodySpec || '').split('/').map(s => {
        let t = s.replace(/\uD83D\uDCCF|\u2696\uFE0F?/g, '').replace(/체중\s*:\s*/, '').trim();
        if (/cm/.test(t) && !/개월|세/.test(t)) t = '키 ' + t;
        else if (/kg/.test(t) && !/개월|세/.test(t)) t = '몸무게 ' + t;
        return t;
    }).filter(Boolean);
}

let isFavViewMode = false; 

// 🚀 1. 글로벌 데이터 자동 동기화 (다이어트 & 뱃지 동기화 완료)
function applyGlobalBabyProfile() {
    const birthStr = localStorage.getItem('tosil_startDate');
    const babyName = localStorage.getItem('tosil_babyName') || '우리 아기';
    if(!birthStr) return; 
    
    const [y, m, d] = birthStr.split('-').map(Number);
    const birthDate = new Date(y, m - 1, d);
    const today = new Date();
    
    let months = (today.getFullYear() - birthDate.getFullYear()) * 12 + (today.getMonth() - birthDate.getMonth());
    if (today.getDate() < birthDate.getDate()) months--; // 아직 이번 달 생일이 안 지났으면 1개월 차감
    if (months < 0) months = 0;

    let ageFilter = 'all';
    if (months <= 11) ageFilter = 'newborn';
    else if (months <= 48) ageFilter = 'toddler';
    else ageFilter = 'junior';

    const ageSelect = document.getElementById('filter-age');
    if(ageSelect) ageSelect.value = ageFilter;

    // ✂️ 1. 촌스러운 파란색 대형 배너는 과감히 숨김 (다이어트!)
    const banner = document.getElementById('auto-sync-banner');
    if(banner) {
        banner.style.display = 'none'; 
    }

    // ✨ 2. 화면에 있는 모든 쿨한 뱃지(class)를 싹 다 찾아서 개월 수 쏴주기!
    const badges = document.querySelectorAll('.dynamic-age-badge');
    badges.forEach(b => {
        b.innerText = `생후 ${months}개월 맞춤`;
    });
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
            btn.style.background = isFav ? '#FFF2F2' : '#F6F2EC';
            btn.style.color = isFav ? '#E32636' : '#7A6F68';
            btn.style.borderColor = isFav ? '#FCA5A5' : '#EDE6DE';
        }
    }
}

function toggleFavView() {
    isFavViewMode = !isFavViewMode;
    const btn = document.getElementById('btn-show-fav');

    if (isFavViewMode) {
        btn.innerHTML = '← 전체 카시트로 돌아가기';
        btn.style.background = '#F6F2EC';
        btn.style.color = '#7A6F68';
        btn.style.borderColor = '#DCD3C8';
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

    // 찜 목록에 지금 데이터에 없는 id 만 남아 있으면 '0개' 보관함이 떴다. 실제로 찾은 것 기준으로 본다.
    const favItems = carseatData.filter(item => favorites.includes(item.id));

    if (favItems.length === 0) {
        resultArea.innerHTML = `<div class="premium-empty-state" style="padding:40px; text-align:center; background:#FFF; border-radius:16px;"><div class="empty-text"><b>아직 찜한 카시트가 없어요</b><br><span style="font-size:13px; color:#A3958A;">마음에 드는 카시트에서 찜하기를 눌러보세요.</span></div></div>`;
        return;
    }

    let htmlOutput = `<div style="font-size: 16px; font-weight: 800; color: #4A413C; margin-bottom: 16px;">❤️ 찜한 카시트 ${favItems.length}개</div>`;
    htmlOutput += favItems.map(item => generateReportHTML({ ...item, matchRate: null })).join('');
    resultArea.innerHTML = htmlOutput;
}

// 3. 카시트 카드
function generateReportHTML(item) {
    const favorites = JSON.parse(localStorage.getItem('favCarseats')) || [];
    const isFav = favorites.includes(item.id);
    const heartIcon = isFav ? '❤️ 찜 해제' : '🤍 찜하기';
    const heartColor = isFav ? '#FFF2F2' : '#F6F2EC';
    const heartText = isFav ? '#E32636' : '#7A6F68';
    const heartBorder = isFav ? '#FCA5A5' : '#EDE6DE';

    let scoreHtml = "";
    let aiReportHtml = '';

    if (item.matchRate !== null && !isFavViewMode && item.matchRate !== undefined) {
        let titleColor, bgColor, borderColor, titleText;
        
        if (item.matchRate === 100) {
            titleColor = '#7F77DD'; bgColor = '#FBF8F3'; borderColor = '#EDE6DE'; titleText = '고르신 조건에 다 맞아요';
        } else if (item.matchRate >= 80) {
            titleColor = '#059669'; bgColor = '#FBF8F3'; borderColor = '#EDE6DE'; titleText = '거의 맞아요';
        } else if (item.matchRate >= 50) {
            titleColor = '#F59E0B'; bgColor = '#FBF8F3'; borderColor = '#EDE6DE'; titleText = '안 맞는 조건이 있어요';
        } else {
            titleColor = '#E32636'; bgColor = '#FBF8F3'; borderColor = '#EDE6DE'; titleText = '잘 안 맞아요';
        }

        scoreHtml = `<div style="text-align: right; line-height: 1.1;"><div style="font-size: 22px; font-weight: 900; color: ${titleColor}; letter-spacing: -0.5px;">${item.matchRate}%</div><div style="font-size: 11px; font-weight: 800; color: #A3958A; margin-top: 4px;">조건 매칭</div></div>`;

        // 다 맞으면 제목이 곧 이유라 목록을 안 붙인다. 안 맞는 이유 앞 🚨 는 응급처럼 보여서 뺐다.
        let reasonLi = item.matchRate === 100
            ? ''
            : item.matchReasons.map(r => `<li style="margin-bottom:4px; color:#7A6F68;">${r}</li>`).join('');

        aiReportHtml = `
            <div style="background:${bgColor}; border:1px solid ${borderColor}; padding:16px; border-radius:14px; margin-bottom:16px;">
                <h4 style="color:${titleColor}; margin:0${reasonLi ? ' 0 10px 0' : ''}; font-size:14px; font-weight:800;">${titleText}</h4>
                ${reasonLi ? `<ul style="margin:0; padding-left:20px; font-size:13px; color:#7A6F68; line-height:1.5; font-weight: 600;">${reasonLi}</ul>` : ''}
            </div>`;
    }

    /* 인증 · 시험 줄.
       ⚠️ 예전엔 ADAC 을 받은 제품이면 점수와 상관없이 '(좋음 등급)' 을 한 번 더 붙였고,
          미참여 제품에도 초록 체크(✅)를 달아 좋은 뜻처럼 보였다. '(2025년 기준)' 도 확인한 적 없는 연도였다.
          데이터에 있는 값만 적는다. */
    const certLines = [];
    if (item.safety.includes('isize')) certLines.push('i-Size(R129) 인증');
    if (item.safety.includes('kc')) certLines.push('KC 안전인증');
    const adacJoined = !item.specs.adacScore.includes('미참여');
    const adacText = adacJoined ? `ADAC 점수 ${item.specs.adacScore}` : 'ADAC 시험 미참여';
    const installText = (item.install || []).map(k => CS_INSTALL[k] || k).join(' · ');

    const isOfficial = (item.reportUrl && item.reportUrl !== "#" && item.reportUrl.trim() !== "");
    const labelText = isOfficial ? "ADAC 시험 결과 원문 보기" : "ADAC 시험 결과 찾아보기";
    const targetUrl = isOfficial ? item.reportUrl : `https://www.google.com/search?q=ADAC+${encodeURIComponent(item.brand)}+${encodeURIComponent(item.name)}`;
    // 시험을 안 받은 제품에 '결과 찾아보기' 를 달면 없는 결과를 찾게 된다
    const reportBtn = adacJoined ? `<a href="${targetUrl}" target="_blank" style="display:inline-block; margin-top:8px; font-size:12px; color:#7F77DD; text-decoration:underline; font-weight:700;">${labelText}</a>` : '';
        
    // 쿠팡 검색 링크 (파트너스 코드 포함)
    const partnerCode = "AF9932454";
    const coupangSearchUrl = `https://www.coupang.com/np/search?q=${encodeURIComponent(item.brand + ' ' + item.name)}&lptag=${partnerCode}`;

    // data.js 에 쿠팡 딥링크가 있으면 그걸, 없으면 검색 링크
    const buyUrl = (item.linkUrl && item.linkUrl.startsWith('https://link.coupang.com/a/') && !item.linkUrl.includes('여기에'))
        ? item.linkUrl
        : coupangSearchUrl;

    // 구매 버튼. '최저가' 는 입증할 수 없는 말이라 쓰지 않는다.
    let purchaseBtn = item.purchasePlatform === 'coupang' 
        ? `<div style="margin-top: 24px;">
               <a href="${buyUrl}" target="_blank" class="buy-btn coupang" style="display: flex; justify-content: center; align-items: center; width: 100%; margin-top: 0; background: #4A413C; color: #FFF; border: 1px solid #4A413C; box-shadow: 0 4px 14px rgba(0,0,0,0.1); font-size: 15px; padding: 18px 0; border-radius: 14px; font-weight: 900; text-decoration: none; transition: 0.2s;">
                   ${buyUrl === item.linkUrl ? '쿠팡에서 이 제품 보기' : '쿠팡에서 가격 비교하기'}${CS_CHEVRON}
               </a>
           </div>
           <div class="coupang-safety-guard" style="font-size: 11.5px; color: #A3958A; font-weight: 600; text-align: center; margin-top: 10px; line-height: 1.5; word-break: keep-all;">
               ※ 해외 직구 카시트는 KC 인증 표시가 없을 수 있어요. 국내 정식 수입품인지 확인하세요.
           </div>`
        : `<div style="margin-top: 24px;">
               <a href="${item.linkUrl}" target="_blank" class="buy-btn official" style="display: flex; justify-content: center; align-items: center; width: 100%; margin-top: 0; background: #FBF8F3; color: #4A413C; border: 1px solid #DCD3C8; font-size: 15px; padding: 18px 0; border-radius: 14px; font-weight: 900; text-decoration: none; transition: 0.2s;">
                   공식 스토어에서 보기${CS_CHEVRON}
               </a>
           </div>`;

    const techSpecHTML = item.specs.sideProtection ? `· <b>기술:</b> ${item.specs.sideProtection}<br>` : ``;

    const specBadges = csSpecParts(item).map(t => `<span style="background: #F6F2EC; color: #7A6F68; font-size: 11.5px; font-weight: 700; padding: 6px 10px; border-radius: 8px; white-space: nowrap;">${t}</span>`).join('');

    return `
        <div class="report-card" id="card-${item.id}" style="border-top: 4px solid ${isFavViewMode ? '#E32636' : 'transparent'};">
            
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; gap: 12px;">
                <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px;">
                        ${specBadges}
                    </div>
                    <div style="font-size:22px; font-weight:900; letter-spacing:-0.5px; color:#4A413C; word-break:keep-all; line-height:1.4;">
                        <span style="color:#A3958A; font-weight:800;">${item.brand}</span> ${item.name}
                    </div>
                </div>
                
                <div style="display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0;">
                    <button id="fav-btn-${item.id}" onclick="toggleFavorite('${item.id}')" style="background:${heartColor}; color:${heartText}; border:1px solid ${heartBorder}; padding:8px 12px; border-radius:8px; font-weight:800; font-size:12px; cursor:pointer; transition:0.2s; white-space:nowrap;">
                        ${heartIcon}
                    </button>
                </div>
            </div>
            
            ${aiReportHtml}

            <div style="background: #FBF8F3; padding: 16px; border-radius: 14px; border: 1px solid #EDE6DE; margin-bottom: 16px;">
                <div style="font-weight: 800; color: #4A413C; margin-bottom: 8px;">인증 · 장착 방식</div>
                <div style="font-size: 13.5px; line-height: 1.6; color: #7A6F68; font-weight: 600;">
                    ${certLines.map(t => `· ${t}<br>`).join('')}
                    · ${adacText}<br>
                    · <b>장착:</b> ${installText}<br>
                    · <b>특징:</b> ${item.specs.reboundStopper}<br>
                    ${techSpecHTML}${reportBtn}
                </div>
            </div>

            <div class="insight-box" style="background: #FBF8F3; padding: 16px; border-radius: 14px; border: 1px solid #EDE6DE; margin-bottom: 16px;">
                <div style="font-size: 13px; font-weight: 800; color: #4A413C; margin-bottom: 6px;">이 카시트는요</div>
                <div style="font-size: 13.5px; color: #7A6F68; line-height: 1.5; font-weight: 600; word-break: keep-all;">${item.desc}</div>
            </div>

            ${purchaseBtn}

            <button onclick="shareToHusband('${item.id}')" style="display:block; width:100%; background:#FBF8F3; border:1px solid #EDE6DE; color:#7A6F68; padding:16px; border-radius:14px; font-weight:800; font-size:14px; text-align:center; transition:0.2s; margin-top:16px; cursor:pointer;">
                여보한테 이 카시트 보내기
            </button>

        </div>
    `;
}

// ----------------------------------------------------
// 4. 조건 점수 계산 (안 맞는 조건마다 감점)
// ----------------------------------------------------
function runCarseatEngine() {
    if (isFavViewMode) return; 

    const age = document.getElementById('filter-age').value;
    const carSize = document.getElementById('filter-car').value;
    const install = document.getElementById('filter-install').value; 
    const safety = document.getElementById('filter-safety').value;
    
    const warningBanner = document.getElementById('vehicle-warning-banner');
    
    // 바닥 수납함이 있는 차를 고르면 지지대 주의 안내
    if (carSize === 'carnival') {
        warningBanner.innerHTML = `
            <div style="background: #FFF0F1; border: 1px solid #F04452; border-radius: 12px; padding: 16px; margin-bottom: 24px; display: flex; align-items: flex-start; gap: 10px;">
                <span style="font-size: 18px;">⚠️</span>
                <div>
                    <div style="font-size: 14px; font-weight: 900; color: #D32F2F; margin-bottom: 4px;">바닥 수납함이 있는 자리 주의</div>
                    <div style="font-size: 12.5px; font-weight: 600; color: #7A6F68; line-height: 1.4;">
                        카니발처럼 바닥에 수납함이 있는 자리는 뚜껑 위에 지지대(레그)를 세우면 충돌 때 받쳐주지 못해요. <b>탑테더(끈으로 묶는 방식)</b>로 다시고, 차 설명서에서 카시트를 달 수 있는 자리를 먼저 확인하세요.
                    </div>
                </div>
            </div>
        `;
        warningBanner.style.display = 'block';
    } else {
        if(warningBanner) warningBanner.style.display = 'none';
    }

    const resultArea = document.getElementById('carseat-result-area');
    const isFilterActive = (age !== 'all' || carSize !== 'all' || install !== 'all' || safety !== 'all');

    let processedData = carseatData.map(item => {
        if (!isFilterActive) return { ...item, matchRate: null, matchReasons: [] };

        let score = 100;
        let reasons = [];

        // 🚨 1. 👶 연령 & 장착 방식 (안 맞으면 목록에서 뺀다)
        if (age !== 'all' && !item.age.includes(age)) return null; 
        if (install !== 'all' && !item.install.includes(install)) return null; 

        // 3. 🛡️ 안전 인증
        if (safety !== 'all' && !item.safety.includes(safety)) { 
            score -= 20; reasons.push('고르신 안전 인증이 없어요'); 
        }

        // 4. 🚙 차량 크기 & 특수 조건
        if (carSize === 'carnival' && item.install.includes('isofix_leg')) {
            score -= 50; reasons.push('지지대(레그)형이라 바닥 수납함이 있는 자리에는 맞지 않아요 (탑테더 방식 권장)');
        }
        if (carSize === 'compact') {
            if (item.age.includes('toddler') && !item.compactOk) { 
                score -= 20; reasons.push('작은 차에 달면 앞좌석이 많이 좁아질 수 있어요');
            }
        }
        if (carSize !== 'all' && !item.carSize.includes(carSize)) {
            score -= 10; reasons.push('고르신 차 크기에서는 자리가 빠듯할 수 있어요');
        }

        if(score < 0) score = 0;
        if(score === 100) reasons.push('고르신 조건에 다 맞아요');

        return { ...item, matchRate: score, matchReasons: reasons };
    }).filter(Boolean);

    if (isFilterActive) processedData.sort((a, b) => b.matchRate - a.matchRate);

    if (processedData.length === 0 || (isFilterActive && processedData[0].matchRate < 50)) {
        resultArea.innerHTML = `<div class="premium-empty-state"><div class="empty-text"><b>고르신 조건을 다 맞추는 카시트가 없어요</b><span>장착 방식이나 인증 조건을 하나 풀어보세요.</span></div><button onclick="resetFilters()" style="margin-top:16px; padding:13px 22px; background:#4A413C; color:#FFF; border:none; border-radius:12px; font-weight:800; font-size:14px; cursor:pointer;">조건 지우기</button></div>`;
        return;
    }

    let htmlOutput = `<div style="font-size: 16px; font-weight: 800; color: #4A413C; margin-bottom: 16px;">${isFilterActive ? '조건에 맞는 카시트' : '카시트 전체'}</div>`;
    
    let top3Results = processedData.slice(0, 3); 
    let otherResults = processedData.slice(3); 
    
    htmlOutput += top3Results.map(item => generateReportHTML(item)).join('');

    if (otherResults.length > 0) {
        htmlOutput += `
            <button id="carseat-show-more-btn" onclick="toggleCarseatOthers()" style="display: block; width: 100%; padding: 16px; margin-top: 8px; margin-bottom: 24px; background: #FFFFFF; border: 1px solid #DCD3C8; border-radius: 14px; font-size: 14px; font-weight: 700; color: #7A6F68; cursor: pointer;">
                나머지 ${otherResults.length}개 더 보기 ▾
            </button>
            <div id="carseat-other-area" style="display:none; flex-direction: column;">
                ${otherResults.map(item => generateReportHTML(item)).join('')}
            </div>
        `;
    }
    resultArea.innerHTML = htmlOutput;

    /* ⚠️ 여기서 첫 번째 흰 카드로 스크롤했다. 월령이 자동으로 들어가 있어서 페이지를 열 때마다
          화면이 혼자 내려갔고, 조건을 하나 바꿀 때마다 맨 위 '어떤 상황' 카드로 튀었다. 뺀다.
          (상황 칸을 누르면 carseatguide.js 가 결과로 데려간다) */
}

function toggleCarseatOthers() {
    const otherArea = document.getElementById('carseat-other-area');
    const btn = document.getElementById('carseat-show-more-btn');
    const n = otherArea.children.length;   // 접었다 펴도 개수가 남게
    if (otherArea.style.display === 'none') {
        otherArea.style.display = 'flex';
        btn.innerText = '접기 ▴';
    } else {
        otherArea.style.display = 'none';
        btn.innerText = `나머지 ${n}개 더 보기 ▾`;
        // 👇 이 한 줄을 추가해 주세요! (리스트가 접힐 때 시선을 버튼 위치로 부드럽게 올려줌)
        btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function resetFilters() {
    document.querySelectorAll('.matrix-panel select').forEach(select => {
        if (select.value !== 'all') select.value = 'all';
    });
    // 아기 월령은 '고른 조건' 이 아니라 사실이다. 같이 지우면 월령에 안 맞는 카시트까지 섞여 나온다.
    applyGlobalBabyProfile();
    if (!isFavViewMode) runCarseatEngine();
}

// 🚀 카카오톡 공유 시에도 '자동 검색 링크' 및 '정상 딥링크' 적용!
function shareToHusband(id) {
    const item = carseatData.find(d => d.id === id);
    if(!item) return;

    /* 공유는 쿠팡 주소가 아니라 이 화면 주소로 보낸다.
       카톡 공유 링크는 카카오 개발자 콘솔에 등록한 도메인만 열린다. 쿠팡 주소를 넣으면 버튼이 안 먹는다.
       받는 사람도 카드를 보고 판단할 수 있어야 한다. */
    const appUrl = window.location.href;
        
    // 🚨 [추가된 안전 보험] 카카오가 안 될 경우를 대비한 텍스트 복사 팝업
    if (typeof Kakao === 'undefined' || !Kakao.isInitialized()) {
        navigator.clipboard.writeText(appUrl)
            .then(() => alert('링크를 복사했어요. 보내고 싶은 분께 붙여 넣어 주세요.'))
            .catch(() => prompt("아래 주소를 복사해 주세요", appUrl));
        return;
    }
        
    Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
            title: `여보, 이 카시트 어때? ${item.brand} ${item.name}`,
            description: `${csSpecParts(item).join(' · ')}\n배냇함에서 골라봤어.`,
            imageUrl: 'https://happy-baby0303.github.io/baby-master/carseat/og-image.png',
            link: { mobileWebUrl: appUrl, webUrl: appUrl },
        },
        buttons: [
            { title: '카시트 보러 가기', link: { mobileWebUrl: appUrl, webUrl: appUrl } }
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