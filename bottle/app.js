// ==========================================
// 🍼 육아메이트 젖병 AI 큐레이터 엔진 (bottle/app.js)
// (네이버+쿠팡 위장 전술 및 카톡 앱 유도 탑재 완결판)
// ==========================================

let isFavViewMode = false; 

function applyGlobalBabyProfile() {
    const birthStr = localStorage.getItem('tosil_startDate');
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
            btn.style.background = isFav ? '#FFF2F2' : '#F2F4F6';
            btn.style.color = isFav ? '#E32636' : '#4E5968';
            btn.style.borderColor = isFav ? '#FCA5A5' : '#E5E8EB';
            btn.style.whiteSpace = 'nowrap'; 
            btn.style.flexShrink = '0';
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
        resultArea.innerHTML = `<div class="premium-empty-state" style="padding:40px; text-align:center; background:#FFF; border-radius:16px; border:1px dashed #D1D5DB;"><div class="empty-icon" style="font-size:40px; margin-bottom:12px;">💔</div><div class="empty-text"><b>아직 찜한 젖병이 없어요!</b><br><span style="font-size:13px; color:#8B95A1;">마음에 드는 젖병에 하트(❤️)를 눌러보세요.</span></div></div>`;
        return;
    }

    let favItems = bottleData.filter(item => favorites.includes(item.id));
    let htmlOutput = `<div style="font-size: 16px; font-weight: 900; color: #E32636; margin-bottom: 16px;">❤️ 내 찜 보관함 (${favItems.length}개)</div>`;
    htmlOutput += favItems.map(item => generateCardHTML({ ...item, matchRate: null })).join('');
    resultArea.innerHTML = htmlOutput;
}

function generateCardHTML(item) {
    const favorites = JSON.parse(localStorage.getItem('favBottles')) || [];
    const isFav = favorites.includes(item.id);
    const heartIcon = isFav ? '❤️ 찜 해제' : '🤍 찜하기';
    const heartColor = isFav ? '#FFF2F2' : '#F2F4F6';
    const heartText = isFav ? '#E32636' : '#4E5968';
    const heartBorder = isFav ? '#FCA5A5' : '#E5E8EB';

    let cardBorderColor = '#D1D5DB';
    let aiReportHtml = '';

    if (item.matchRate !== null && !isFavViewMode && item.matchRate !== undefined) {
        let titleColor, bgColor, borderColor, titleText;
        if (item.matchRate === 100) {
            titleColor = '#3182F6'; bgColor = '#F0F7FF'; borderColor = '#3182F6';
            cardBorderColor = '#3182F6'; titleText = '🟢 최적합 (Premium Match)';
        } else if (item.matchRate >= 80) {
            titleColor = '#059669'; bgColor = '#ECFDF5'; borderColor = '#10B981';
            cardBorderColor = '#10B981'; titleText = '🍀 우수 (Good Match)';
        } else if (item.matchRate >= 50) {
            titleColor = '#B78103'; bgColor = '#FFF9E6'; borderColor = '#F59E0B';
            cardBorderColor = '#F59E0B'; titleText = '⚠️ 타협 필요 (Conditional)';
        } else {
            titleColor = '#D32F2F'; bgColor = '#FFF0F1'; borderColor = '#F04452';
            cardBorderColor = '#F04452'; titleText = '❌ 비추천 (Mismatch)';
        }

        // ✨ scoreHtml(100% 매칭 변수) 삭제 완료!

        let reasonLi = item.matchRate === 100 
            ? `<li style="margin-bottom:4px;"> ${item.matchReasons[0]}</li>`
            : item.matchReasons.map(r => `<li style="margin-bottom:4px; color:#4E5968;">🚨 <b>${r}</b></li>`).join('');

        aiReportHtml = `
            <div style="background:${bgColor}; border:1px solid ${borderColor}; padding:14px; border-radius:8px; margin-bottom:16px;">
                <h4 style="color:${titleColor}; margin:0 0 6px 0; font-size:13px;">${titleText}</h4>
                <ul style="margin:0; padding-left:20px; font-size:12.5px; color:${titleColor}; line-height:1.5;">${reasonLi}</ul>
            </div>`;
    }

    if (isFavViewMode) cardBorderColor = '#E32636';

 // ✨ 젖병 전용: 유저가 누른 젖병(브랜드+제품명)으로 알아서 검색해주는 다이렉트 링크!
   const searchKeyword = `${item.brand} ${item.name}`; 
   let myCoupangLink = `https://www.coupang.com/np/search?q=${encodeURIComponent(searchKeyword)}`;
   
   let purchaseBtn = `
       <div style="margin-top: 24px;">
           <a href="${myCoupangLink}" target="_blank" class="buy-btn" style="display: flex; justify-content: center; align-items: center; width: 100%; margin-top: 0; background: #191F28; color: #FFF; border: 1px solid #000; box-shadow: 0 4px 14px rgba(0,0,0,0.1); font-size: 15px; padding: 18px 0; border-radius: 14px; font-weight: 900; text-decoration: none; transition: 0.2s;">
               🚀 쿠팡 최저가 검색하기 〉
           </a>
       </div>
       
       <div class="coupang-safety-guard" style="font-size: 11.5px; color: #8B95A1; font-weight: 600; text-align: center; margin-top: 12px; line-height: 1.5; word-break: keep-all;">
           ※ 안전하고 빠른 교환/환불을 위해 구매 시 가급적 <b>[로켓배송]</b> 마크가 있는 상품을 선택하시길 권장합니다.<br>
           (A/S 및 교환/환불 규정은 해당 판매처 및 제조사 정책을 따릅니다)
       </div>
   `;

    return `
        <div class="stroller-card" style="border-top: 4px solid ${cardBorderColor}; margin-bottom: 24px; padding: 28px 24px; background:#FFF; border-radius:24px; box-shadow:0 4px 16px rgba(0,0,0,0.04); border:1px solid #F2F5F8;">
            
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 24px; gap: 12px;">
                <div style="flex: 1; min-width: 0;">
                    <!-- ✨ margin-bottom 16px로 변경해서 뱃지와 제목 사이 간격 넓힘! -->
                    <div style="margin-bottom: 16px;">
                        <span style="background:#F2F5F8; color:#4E5968; font-size:12.5px; font-weight:800; padding:6px 12px; border-radius:8px;">${item.brand}</span>
                    </div>
                    <div style="font-size:22px; font-weight:900; letter-spacing:-0.5px; color:#191F28; word-break:keep-all; line-height:1.4;">
                        ${item.name}
                    </div>
                </div>
                <!-- ✨ 100% 삭제 완료! 오직 찜하기 버튼만 우측에 깔끔하게 배치! -->
                <div style="display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0;">
                    <button id="fav-btn-${item.id}" onclick="toggleFavorite('${item.id}')" style="background:${heartColor}; color:${heartText}; border:1px solid ${heartBorder}; padding:8px 12px; border-radius:8px; font-weight:800; font-size:12px; cursor:pointer; transition:0.2s; white-space:nowrap;">
                        ${heartIcon}
                    </button>
                </div>
            </div>
            
            ${aiReportHtml}

            <!-- 큐레이션 포인트 (통일된 연회색 인사이트 박스) -->
            <div class="insight-box">
                <div class="title">💡 큐레이션 포인트</div>
                <div class="text">${item.desc}</div>
            </div>
            
            <!-- 세부 스펙 스탯 (깔끔한 리스트) -->
            <div style="background: #F9FAFB; padding: 16px; border-radius: 14px; border: 1px solid #E5E8EB; margin-bottom: 16px;">
                <ul style="margin: 0; padding-left: 20px; font-size: 13.5px; color: #4E5968; line-height: 1.6; font-weight: 600;">
                    <li style="margin-bottom:6px;"><b>거부 극복:</b> ${item.rejection === 'super' ? '🔥 젖꼭지 거부 심한 아이 추천' : '⭐ 무난하게 잘 무는 젖꼭지'}</li>
                    <li style="margin-bottom:6px;"><b>젖꼭지 호환:</b> ${item.compatible === 'yes' ? '🟢 더블하트/모유실감 호환 가능' : '❌ 전용 젖꼭지 권장'}</li>
                    <li><b>소독 세척:</b> ${item.sterilization}</li>
                </ul>
            </div>

            ${purchaseBtn}

            <button onclick="shareToHusband('${item.id}', '${item.brand}', '${item.name}')" style="display:block; width:100%; background:#F9FAFB; border:1px solid #E5E8EB; color:#4E5968; padding:16px; border-radius:14px; font-weight:800; font-size:14px; text-align:center; transition:0.2s; margin-top:16px; cursor:pointer;">
                💬 남편에게 이 [AI 분석 리포트] 공유하기
            </button>

            <a href="../food/index.html" style="display:block; width:100%; background:#F9FAFB; border:1px solid #E5E8EB; color:#4E5968; padding:16px; border-radius:14px; font-weight:800; font-size:14px; text-align:center; text-decoration:none; transition:0.2s; margin-top:12px;">
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
        resultArea.innerHTML = `<div class="premium-empty-state" style="padding:40px; text-align:center; background:#FFF; border-radius:16px; border:1px dashed #D1D5DB;"><div class="empty-icon" style="font-size:40px; margin-bottom:12px;">🍼</div><div class="empty-text"><b>조건에 완벽하게 맞는 젖병이 없습니다.</b><br><span style="font-size:13px; color:#8B95A1;">초기화 버튼을 누르거나 필터를 완화해 보세요!</span></div></div>`;
        return;
    }

    let htmlOutput = `<div style="font-size: 16px; font-weight: 800; color: #191F28; margin-bottom: 16px;">✨ AI 맞춤 젖병 리포트</div>`;
    
    let top3Results = processedData.slice(0, 3); 
    let otherResults = processedData.slice(3); 
    
    htmlOutput += top3Results.map(item => generateCardHTML(item)).join('');

    if (otherResults.length > 0) {
        htmlOutput += `
            <button id="bottle-show-more-btn" onclick="toggleBottleOthers()" style="display: block; width: 100%; padding: 16px; margin-top: 8px; margin-bottom: 24px; background: #FFFFFF; border: 1px solid #D1D5DB; border-radius: 14px; font-size: 14px; font-weight: 800; color: #4E5968; cursor: pointer; transition:0.2s;">
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

if (!Kakao.isInitialized()) {
    Kakao.init('68bca10ddfe2ec67112b07eb9a08da2b');
}

// 🚀 남편 카톡 공유 기능 (쿠팡 대신 육아메이트 앱으로 유도!)
function shareToHusband(id, brand, name) {
    const appUrl = window.location.href; // 유저가 보고 있는 이 앱 주소를 전달!
    
    Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
            title: `여보! 우리 아기 젖병 [${brand}] 제품이 좋대 🍼`,
            description: `AI가 분석한 배앓이 방지 리포트 확인해보고 이걸로 세트 쟁여놔줘! ❤️`,
            imageUrl: 'https://happy-baby0303.github.io/baby-master/stroller/og-image.png',
            link: { mobileWebUrl: appUrl, webUrl: appUrl },
        },
        buttons: [
            { title: '📊 AI 분석 리포트 확인하기', link: { mobileWebUrl: appUrl, webUrl: appUrl } }
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
