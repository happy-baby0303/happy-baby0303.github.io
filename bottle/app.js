// ==========================================
// 🍼 배냇함 젖병 큐레이터 (bottle/app.js)
// 조건 점수 계산 · 젖병 카드 · 찜 · 카톡 공유
// ※ GitHub Pages 라 이 파일은 누구나 열어볼 수 있다. 주석도 화면 문구처럼 쓴다.
// ==========================================

let isFavViewMode = false; 

// 버튼 끝 화살표. '〉' 글자는 글꼴마다 높이가 달라서 글자와 줄이 어긋난다.
const BOTTLE_CHEVRON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="margin-left:4px; flex-shrink:0;" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';

// 소재는 한글로. 예전엔 GLASS · SILICONE 처럼 영어 대문자로 나왔다.
const BOTTLE_MATERIAL_LABEL = { glass: '유리', silicone: '실리콘', ppsu: 'PPSU', pp: 'PP', pesu: 'PESU', tritan: '트라이탄', stainless: '스테인리스' };
function bottleMaterialLabel(m) {
    const k = String(m || '').toLowerCase();
    return BOTTLE_MATERIAL_LABEL[k] || String(m || '').toUpperCase();
}

// data.js 의 배앓이 방지 값은 normal · strong · super 세 가지다. ('yes' 는 필터 쪽 값)
// 예전 코드가 제품 값도 'yes' 라고 보고 짜여 있어서, 방지 구조가 있는 strong 11종이 '일반 젖병'으로 나왔다.
function bottleColicMid(v) { return v === 'strong' || v === 'yes'; }

// 🧼 sterilization 문구를 읽어서 UV 소독 안전도를 자동 판정
function getUvSafety(item) {
    const t = item.sterilization || '';
    if (t.includes('금지') || t.includes('비권장')) return 'no';
    if (t.includes('주의') || t.includes('변색') || t.includes('끈적')) return 'caution';
    if (t.includes('UV')) return 'yes';
    return 'unknown';   // UV 언급 자체가 없는 제품
}

function applyGlobalBabyProfile() {
    const birthStr = localStorage.getItem('tosil_startDate');
    if(!birthStr) return; 
    
    const [y, m, d] = birthStr.split('-').map(Number);
    const birthDate = new Date(y, m - 1, d);
    const today = new Date();
    let months = (today.getFullYear() - birthDate.getFullYear()) * 12 + (today.getMonth() - birthDate.getMonth());
    if (today.getDate() < birthDate.getDate()) months--;   // 아직 생일 안 지났으면 -1
    if (months < 0) months = 0;

    let ageFilter = 'all';
    if (months <= 3) { ageFilter = 'newborn'; }
    else if (months <= 6) { ageFilter = 'infant'; }
    else { ageFilter = 'toddler'; }

    const ageSelect = document.getElementById('filter-age');
    if(ageSelect) ageSelect.value = ageFilter;

    const banner = document.getElementById('auto-sync-banner');
    if(banner) banner.style.display = 'none'; 

    const badge = document.getElementById('dynamic-age-badge');
    if(badge) badge.innerText = `생후 ${months}개월 맞춤`;
}

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
        btn.innerHTML = '← 전체 젖병으로 돌아가기';
        btn.style.background = '#F6F2EC';
        btn.style.color = '#7A6F68';
        btn.style.borderColor = '#DCD3C8';
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

    // 찜 목록에 지금 데이터에 없는 id 만 남아 있으면 빈 표와 '0개'가 떴다. 실제로 찾은 것 기준으로 본다.
    const favItems = bottleData.filter(item => favorites.includes(item.id));

    if (favItems.length === 0) {
        resultArea.innerHTML = `<div class="premium-empty-state" style="padding:40px; text-align:center; background:#FFF; border-radius:16px; border:1px dashed #DCD3C8;"><div class="empty-text"><b>아직 찜한 젖병이 없어요</b><br><span style="font-size:13px; color:#A3958A;">마음에 드는 젖병에서 찜하기를 눌러보세요.</span></div></div>`;
        return;
    }

    
    // 🚨 [신규 패치] 찜한 목록 상단에 '비교 요약 표' 제공
    let summaryTable = `
        <div style="background: #FBF8F3; padding: 16px; border-radius: 16px; margin-bottom: 24px; border: 1px solid #EDE6DE; overflow-x: auto;">
            <div style="font-size: 13px; font-weight: 800; color: #7A6F68; margin-bottom: 10px;">찜한 젖병 비교</div>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: center; min-width: 300px;">
                <thead>
                    <tr style="background: #F7F3ED; color: #A3958A;">
                        <th style="padding: 8px; border-radius: 8px 0 0 8px;">브랜드</th>
                        <th style="padding: 8px;">소재</th>
                        <th style="padding: 8px;">가격대</th>
                        <th style="padding: 8px; border-radius: 0 8px 8px 0;">배앓이 방지</th>
                    </tr>
                </thead>
                <tbody>
                    ${favItems.map(i => `
                        <tr style="border-bottom: 1px solid #EDE6DE;">
                            <td style="padding: 8px; font-weight: 700;">${i.brand}</td>
                            <td style="padding: 8px; color: #7F77DD;">${bottleMaterialLabel(i.material)}</td>
                            <td style="padding: 8px;">${i.price === 'low' ? '가성비' : (i.price === 'mid' ? '보통' : '고급')}</td>
                            <td style="padding: 8px;">${i.antiColic === 'super' ? '전용 설계' : (bottleColicMid(i.antiColic) ? '있음' : '기본')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    let htmlOutput = `<div style="font-size: 16px; font-weight: 900; color: #4A413C; margin-bottom: 16px;">❤️ 찜한 젖병 ${favItems.length}개</div>`;
    htmlOutput += summaryTable;
    // 찜한 화면에서는 쿠팡 링크 무조건 보여주기 (rank = 1 부여)
    htmlOutput += favItems.map(item => generateCardHTML({ ...item, matchRate: null }, 1)).join('');
    
    resultArea.innerHTML = htmlOutput;
}

// rank: 1~3등과 찜 목록 카드에만 쿠팡 링크를 붙인다 (아래 purchaseBtn)
function generateCardHTML(item, rank) {
    const favorites = JSON.parse(localStorage.getItem('favBottles')) || [];
    const isFav = favorites.includes(item.id);
    const heartIcon = isFav ? '❤️ 찜 해제' : '🤍 찜하기';
    const heartColor = isFav ? '#FFF2F2' : '#F6F2EC';
    const heartText = isFav ? '#E32636' : '#7A6F68';
    const heartBorder = isFav ? '#FCA5A5' : '#EDE6DE';

    let cardBorderColor = '#DCD3C8';
    let aiReportHtml = '';

    if (item.matchRate !== null && !isFavViewMode && item.matchRate !== undefined) {
        let titleColor, bgColor, borderColor, titleText;
        if (item.matchRate === 100) {
            titleColor = '#7F77DD'; bgColor = '#F2F0FC'; borderColor = '#7F77DD';
            cardBorderColor = '#7F77DD'; titleText = '고르신 조건에 다 맞아요';
        } else if (item.matchRate >= 80) {
            titleColor = '#059669'; bgColor = '#ECFDF5'; borderColor = '#10B981';
            cardBorderColor = '#10B981'; titleText = '거의 맞아요';
        } else if (item.matchRate >= 50) {
            titleColor = '#B78103'; bgColor = '#FFF9E6'; borderColor = '#F59E0B';
            cardBorderColor = '#F59E0B'; titleText = '안 맞는 조건이 있어요';
        } else {
            titleColor = '#D32F2F'; bgColor = '#FFF0F1'; borderColor = '#F04452';
            cardBorderColor = '#F04452'; titleText = '잘 안 맞아요';
        }

        // 다 맞으면 제목이 곧 이유라 목록을 안 붙인다.
        // 안 맞는 이유 앞에 🚨 를 달면 응급 경고처럼 보인다. 🚨 는 응급 안내에만 쓴다.
        let reasonLi = item.matchRate === 100
            ? ''
            : item.matchReasons.map(r => `<li style="margin-bottom:4px; color:#7A6F68;">${r}</li>`).join('');

        aiReportHtml = `
            <div style="background:${bgColor}; border:1px solid ${borderColor}; padding:14px; border-radius:8px; margin-bottom:16px;">
                <h4 style="color:${titleColor}; margin:0${reasonLi ? ' 0 6px 0' : ''}; font-size:13px;">${titleText}</h4>
                ${reasonLi ? `<ul style="margin:0; padding-left:20px; font-size:12.5px; color:${titleColor}; line-height:1.5;">${reasonLi}</ul>` : ''}
            </div>`;
    }

    if (isFavViewMode) cardBorderColor = '#E32636';

    // 💰 [핵심 패치] data.js에 넣은 딥링크(coupangLink)를 최우선으로 가져오게 수정!
    let myCoupangLink = "";
    if (item.coupangLink && item.coupangLink.trim() !== "") {
        myCoupangLink = item.coupangLink;
    } else {
        const searchKeyword = `${item.brand} ${item.name}`; 
        const partnerCode = "AF9932454"; // 대표님 파트너스 코드
        myCoupangLink = `https://www.coupang.com/np/search?q=${encodeURIComponent(searchKeyword)}&lptag=${partnerCode}`;
    }
    
  // 딥링크는 상품 하나로, 검색 링크는 목록으로 간다.
    // 가는 곳이 다른데 버튼 글씨가 같으면 "최저가라더니 하나만 뜨네"가 된다.
    const isDeepLink = (item.coupangLink && item.coupangLink.trim() !== "");
    const buyLabel = (isDeepLink ? "쿠팡에서 이 제품 보기" : "쿠팡에서 가격 비교하기") + BOTTLE_CHEVRON;

    let purchaseBtn = '';
    
    // 쿠팡 링크는 1~3등과 찜 목록에만 붙인다. 4등부터는 네이버 스펙 검색.
    if (rank <= 3 || isFavViewMode) {
        purchaseBtn = `
            <div style="margin-top: 24px;">
                <a href="${myCoupangLink}" target="_blank" class="buy-btn" style="display: flex; justify-content: center; align-items: center; width: 100%; margin-top: 0; background: #4A413C; color: #FFF; border: 1px solid #4A413C; box-shadow: 0 4px 14px rgba(0,0,0,0.1); font-size: 15px; padding: 18px 0; border-radius: 14px; font-weight: 900; text-decoration: none; transition: 0.2s;">
                   ${buyLabel}
                </a>
            </div>
            
            <div class="coupang-safety-guard" style="font-size: 11px; color: #A3958A; font-weight: 600; text-align: center; margin-top: 12px; line-height: 1.5; word-break: keep-all;">
                ※ 해외 직구 상품은 교환·환불이 까다로울 수 있어요. 주문 전에 판매자를 확인하세요.
            </div>
        `;
    } else {
        // 4등 이하는 정보성 버튼만 노출 (네이버 검색)
        const searchKeyword = `${item.brand} ${item.name}`; 
        let naverSearchLink = `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(searchKeyword)}`;
        purchaseBtn = `
            <div style="margin-top: 24px;">
                <a href="${naverSearchLink}" target="_blank" class="buy-btn" style="display: flex; justify-content: center; align-items: center; width: 100%; margin-top: 0; background: #F7F3ED; color: #7A6F68; border: 1px solid #EDE6DE; font-size: 14px; padding: 14px 0; border-radius: 14px; font-weight: 800; text-decoration: none; transition: 0.2s;">
                    네이버에서 스펙 찾아보기${BOTTLE_CHEVRON}
                </a>
            </div>
        `;
    }

    return `
        <div class="stroller-card" style="border-top: 4px solid ${cardBorderColor}; margin-bottom: 24px; padding: 28px 24px; background:#FFF; border-radius:24px; box-shadow:0 4px 16px rgba(0,0,0,0.04); border:1px solid #F7F3ED;">
            
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 24px; gap: 12px;">
                <div style="flex: 1; min-width: 0;">
                    <div style="margin-bottom: 16px;">
                        <span style="background:#F7F3ED; color:#7A6F68; font-size:12.5px; font-weight:800; padding:6px 12px; border-radius:8px;">${item.brand}</span>
                    </div>
                    <div style="font-size:22px; font-weight:900; letter-spacing:-0.5px; color:#4A413C; word-break:keep-all; line-height:1.4;">
                        ${item.name}
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0;">
                    <button id="fav-btn-${item.id}" onclick="toggleFavorite('${item.id}')" style="background:${heartColor}; color:${heartText}; border:1px solid ${heartBorder}; padding:8px 12px; border-radius:8px; font-weight:800; font-size:12px; cursor:pointer; transition:0.2s; white-space:nowrap;">
                        ${heartIcon}
                    </button>
                </div>
            </div>
            
            ${aiReportHtml}

            <!-- 제품 설명 -->
            <div class="insight-box">
                <div class="title">이 젖병은요</div>
                <div class="text">${item.desc}</div>
            </div>
            
            <!-- 세부 스펙 스탯 -->
            <div style="background: #FBF8F3; padding: 16px; border-radius: 14px; border: 1px solid #EDE6DE; margin-bottom: 16px;">
                <ul style="margin: 0; padding-left: 20px; font-size: 13.5px; color: #7A6F68; line-height: 1.6; font-weight: 600;">
                    <li style="margin-bottom:6px;"><b>젖병 거부:</b> ${item.rejection === 'super' ? '거부가 심할 때 많이 바꿔보는 제품이에요' : '무난한 편이에요'}</li>
                    <li style="margin-bottom:6px;"><b>젖꼭지 호환:</b> ${item.compatible === 'yes' ? '더블하트·모유실감 젖꼭지와 맞아요' : '전용 젖꼭지를 쓰세요'}</li>
                    <li><b>소독·세척:</b> ${item.sterilization}</li>
                </ul>
            </div>

            ${purchaseBtn}

            <button onclick="shareToHusband('${item.id}')" style="display:block; width:100%; background:#FBF8F3; border:1px solid #EDE6DE; color:#7A6F68; padding:16px; border-radius:14px; font-weight:800; font-size:14px; text-align:center; transition:0.2s; margin-top:16px; cursor:pointer;">
                여보한테 이 젖병 보내기
            </button>
        </div>
    `;
}

// ----------------------------------------------------
// 5. 조건 점수 계산 (안 맞는 조건마다 감점)
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
            score -= 30; reasons.push('지금 월령에는 잘 안 맞아요'); 
        }
        if (rejection === 'super' && item.rejection !== 'super') { 
            score -= 40; reasons.push('젖병 거부가 심한 아기용은 아니에요'); 
        }
        if (material !== 'all' && item.material !== material) { 
            score -= 20; reasons.push('고르신 소재가 아니에요'); 
        }
        if (antiColic === 'super' && item.antiColic !== 'super') { 
            // 배앓이 방지 구조가 '있음'인 제품을 일반 젖병과 똑같이 깎고 똑같이 '일반 젖병'이라 부르던 것 수정
            score -= (bottleColicMid(item.antiColic) ? 20 : 40);
            reasons.push(bottleColicMid(item.antiColic) ? '배앓이 방지 구조는 있지만 전용 설계는 아니에요' : '배앓이 방지 설계가 따로 없는 일반 젖병이에요');
        } else if (antiColic === 'yes' && item.antiColic === 'normal') {
            score -= 20; reasons.push('배앓이 방지 설계가 따로 없는 일반 젖병이에요'); 
        }
        if (compatible === 'yes' && item.compatible !== 'yes') { 
            score -= 30; reasons.push('더블하트·모유실감 젖꼭지와 안 맞아요'); 
        }
        if (sterilization === 'uv') {
            const uv = getUvSafety(item);
            if (uv === 'no') {
                score -= 30; reasons.push('제조사가 UV 소독을 권하지 않는 제품이에요');
            } else if (uv === 'caution') {
                score -= 15; reasons.push('UV 소독기를 오래 쓰면 변색되거나 끈적해질 수 있어요');
            } else if (uv === 'unknown') {
                score -= 5; reasons.push('제조사가 UV 소독 가능 여부를 밝히지 않았어요');
            }
        }
        if (sterilization === 'easy' && item.wash !== 'easy') { 
            score -= 15; reasons.push('입구가 좁거나 부품이 많아 설거지가 번거로운 편이에요'); 
        }
        if (price !== 'all' && item.price !== price) { 
            score -= 20; reasons.push('고르신 가격대가 아니에요'); 
        }

        if(score < 0) score = 0;
        if(score === 100) reasons.push('고르신 조건에 다 맞아요');

        return { ...item, matchRate: score, matchReasons: reasons };
    });

    if (isFilterActive) processedData.sort((a, b) => b.matchRate - a.matchRate);

    if (processedData.length === 0 || (isFilterActive && processedData[0].matchRate < 40)) {
        const keepAge = !!localStorage.getItem('tosil_startDate');
        resultArea.innerHTML = `
            <div class="premium-empty-state" style="padding:40px; text-align:center; background:#FFF; border-radius:16px; border:1px dashed #DCD3C8; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
                <div class="empty-text" style="margin-bottom: 20px;">
                    <b style="font-size: 15px; color: #4A413C;">고르신 조건을 다 맞추는 젖병이 없어요</b><br>
<span style="font-size:13px; color:#A3958A; line-height: 1.5; display: inline-block; margin-top: 4px;">조건을 한두 개 풀면 가까운 제품이 나와요.${keepAge ? '<br>아기 월령은 그대로 두고 나머지만 지울게요.' : ''}</span>
                </div>
                <button onclick="resetBottleFilters()" style="padding: 14px 24px; background: #4A413C; color: #FFF; border: none; border-radius: 12px; font-weight: 800; font-size: 14px; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: 0.2s;">
                    조건 지우기
                </button>
            </div>`;
        return;
    }

    // 🍼 1등 점수가 낮으면 "완벽한 매칭은 없지만 차선책은 있어요"로 안내
    const bestScore = isFilterActive ? processedData[0].matchRate : 100;
    let htmlOutput = '';

    if (isFilterActive && bestScore < 70) {
        htmlOutput = `
            <div style="background:#FFF9E6; border:1px solid #FDE68A; border-radius:14px; padding:16px; margin-bottom:16px;">
                <div style="font-size:14px; font-weight:900; color:#B78103; margin-bottom:4px;">조건을 모두 맞추는 젖병은 없었어요</div>
                <div style="font-size:13px; font-weight:600; color:#7A6F68; line-height:1.5;">
                    가장 가까운 순서로 보여드릴게요. 조건을 한두 개 풀면 더 잘 맞는 게 나올 수 있어요.
                </div>
            </div>
            <div style="font-size: 16px; font-weight: 800; color: #4A413C; margin-bottom: 16px;">가장 가까운 3개</div>`;
    } else {
        htmlOutput = `<div style="font-size: 16px; font-weight: 800; color: #4A413C; margin-bottom: 16px;">${isFilterActive ? '조건에 맞는 젖병' : '젖병 전체'}</div>`;
    }
    
    let top3Results = processedData.slice(0, 3); 
    let otherResults = processedData.slice(3); 
    
    // 🚨 1~3등까지 랭크(rank) 정보 넘겨서 쿠팡 링크 달기!
    htmlOutput += top3Results.map((item, index) => generateCardHTML(item, index + 1)).join('');

    if (otherResults.length > 0) {
        htmlOutput += `
            <button id="bottle-show-more-btn" onclick="toggleBottleOthers()" style="display: block; width: 100%; padding: 16px; margin-top: 8px; margin-bottom: 24px; background: #FFFFFF; border: 1px solid #DCD3C8; border-radius: 14px; font-size: 14px; font-weight: 800; color: #7A6F68; cursor: pointer; transition:0.2s;">
                나머지 ${otherResults.length}개 더 보기 ▾
            </button>
            <div id="bottle-other-area" style="display:none; flex-direction: column;">
                ${otherResults.map((item, index) => generateCardHTML(item, index + 4)).join('')}
            </div>
        `;
    }
    resultArea.innerHTML = htmlOutput;
}

function toggleBottleOthers() {
    const otherArea = document.getElementById('bottle-other-area');
    const btn = document.getElementById('bottle-show-more-btn');
    const n = otherArea.children.length;   // 접었다 다시 접어도 개수가 남게
    if (otherArea.style.display === 'none') {
        otherArea.style.display = 'flex';
        btn.innerText = '접기 ▴';
    } else {
        otherArea.style.display = 'none';
        btn.innerText = `나머지 ${n}개 더 보기 ▾`;
        // 접을 때 살짝 위로 스크롤 올려주는 디테일
        document.getElementById('bottle-show-more-btn').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function resetBottleFilters() {
    document.querySelectorAll('.matrix-panel select').forEach(select => {
        if (select.value !== 'all') select.value = 'all';
    });
    // 아기 월령은 '고른 조건'이 아니라 사실이다. 같이 지우면 신생아용까지 섞여 나온다.
    applyGlobalBabyProfile();
    if (!isFavViewMode) runBottleEngine();
}

if (typeof Kakao !== 'undefined' && !Kakao.isInitialized()) {
    Kakao.init('68bca10ddfe2ec67112b07eb9a08da2b');
}

function shareToHusband(id, brand, name) {
    // 이름에 ' 가 든 제품(예: Dr. Brown's)은 onclick 문자열이 깨져 버튼이 먹통이 된다.
    // 그래서 카드에서는 id 만 넘기고 이름은 여기서 찾는다. 예전처럼 셋 다 넘겨도 동작한다.
    const found = (typeof bottleData !== 'undefined') ? bottleData.find(x => String(x.id) === String(id)) : null;
    if (found) { brand = found.brand; name = found.name; }
    const appUrl = window.location.href;
    
    if (typeof Kakao === 'undefined' || !Kakao.isInitialized()) {
        navigator.clipboard.writeText(appUrl)
            .then(() => alert('링크를 복사했어요. 보내고 싶은 분께 붙여 넣어 주세요.'))
            .catch(() => prompt("아래 주소를 복사해 주세요", appUrl));
        return;
    }

    Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
            title: `여보, 이 젖병 어때? ${brand || ''} ${name || ''}`.trim(),
            description: `배냇함에서 골라봤어. 이걸로 두 개만 사보자 🤍`,
            imageUrl: 'https://happy-baby0303.github.io/baby-master/stroller/og-image.png',
            link: { mobileWebUrl: appUrl, webUrl: appUrl },
        },
        buttons: [
            { title: '젖병 보러 가기', link: { mobileWebUrl: appUrl, webUrl: appUrl } }
        ],
    });
}

// ==========================================
// 필터를 바꾸면 짧은 진동 + 결과 쪽으로 스크롤
// ==========================================
document.querySelectorAll('.matrix-panel select').forEach(select => {
    select.addEventListener('change', () => {
        runBottleEngine();
        
        if (navigator.vibrate) navigator.vibrate(10);
        
        // 🚨 필터 누르면 부드럽게 결과창 쪽으로 화면을 끌어올려줌 (버그 수정 완료)
        const resultHeader = document.getElementById('bottle-result-area');
        if(resultHeader && window.scrollY < 200) { 
             const yOffset = resultHeader.getBoundingClientRect().top + window.pageYOffset - 100;
             window.scrollTo({top: yOffset, behavior: 'smooth'});
        }
    });
});

window.onload = () => { 
    applyGlobalBabyProfile(); 
    runBottleEngine(); 

    /* ⚠️ 헤더의 "젖병 40종" 이 글자로 박혀 있었다.
          data.js 에 한 종 더 넣는 날 여기를 같이 안 고치면 그대로 거짓말이 된다.
          수수료를 받는 화면이라 숫자 하나도 맞아야 한다. 세어서 적는다. */
    try {
        var badge = document.getElementById("bottle-count-badge");
        if (badge && typeof bottleData !== "undefined" && bottleData.length) {
            badge.textContent = "젖병 " + bottleData.length + "종";
        }
    } catch (e) {}
};