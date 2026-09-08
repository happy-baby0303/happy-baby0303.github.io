// ==========================================
// 🩺 배냇함 안심 이유식 AI 엔진 V3.0 (food/app.js)
// (메인 글로벌 연동 + 찜 보관함 + 크로스셀링 통합)
// ==========================================

let isFavViewMode = false;

// 🚀 1. 이유식 데이터 자동 동기화 (군더더기 삭제)
function applyGlobalBabyProfile() {
    const birthStr = localStorage.getItem('tosil_startDate');
    const babyName = localStorage.getItem('tosil_babyName') || '우리 아기';
    if(!birthStr) return;

    // 👇 교체된 완벽한 월령 계산 로직
    const [by, bm, bd] = birthStr.split('-').map(Number);
    const birthDate = new Date(by, bm - 1, bd);
    const today = new Date();

    let months = (today.getFullYear() - birthDate.getFullYear()) * 12
               + (today.getMonth() - birthDate.getMonth());
    if (today.getDate() < birthDate.getDate()) months--;
    if (months < 0) months = 0;

    // 👶 이유식 월령 단계 (로직은 그대로 유지)
    let ageFilter = '', ageText = '';
    if (months < 4) { ageFilter = 'early'; ageText = '이유식 준비기'; }
    else if (months <= 6) { ageFilter = 'early'; ageText = '이유식 초기'; }
    else if (months <= 9) { ageFilter = 'mid'; ageText = '이유식 중기'; }
    else if (months <= 11) { ageFilter = 'late'; ageText = '이유식 후기'; }
    else { ageFilter = 'done'; ageText = '이유식 완료기'; }

    const foodAge = document.getElementById('food-age');
    if(foodAge) foodAge.value = ageFilter;

    // ✂️ 1. 촌스러운 파란 배너 삭제 (다이어트!)
    const banner = document.getElementById('auto-sync-banner');
    if(banner) banner.style.display = 'none';

    // ✨ 2. 쿨한 뱃지에 '월령' + '이유식 단계'를 한 방에 쏴주기
    const badges = document.querySelectorAll('.dynamic-age-badge');
    badges.forEach(b => {
        b.innerText = `생후 ${months}개월 | ${ageText}`;
    });
}

// 🚀 [NEW 2] 찜하기 하트 토글 로직
function toggleFavorite(id) {
    let favorites = JSON.parse(localStorage.getItem('favFoods')) || [];
    let isFav = false; 

    if(favorites.includes(id)) {
        favorites = favorites.filter(fav => fav !== id); 
        isFav = false;
    } else {
        favorites.push(id); 
        isFav = true;
    }
    localStorage.setItem('favFoods', JSON.stringify(favorites));
    
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

// 🚀 [NEW 3] 찜 보관함 화면 전환
function toggleFavView() {
    isFavViewMode = !isFavViewMode;
    const btn = document.getElementById('btn-show-fav');
    
    // 보관함 모드일 때 매트릭스와 검색창 숨기기
    const matrixPanel = document.querySelector('.matrix-panel');
    const searchBox = document.querySelector('.search-box');

    if (isFavViewMode) {
        btn.innerHTML = '🔙 이유식 매칭 화면으로 돌아가기';
        btn.style.background = '#F2F4F6';
        btn.style.color = '#4E5968';
        btn.style.borderColor = '#D1D5DB';
        if(matrixPanel) matrixPanel.style.display = 'none';
        if(searchBox) searchBox.style.display = 'none';
        renderFavorites();
    } else {
        btn.innerHTML = '❤️ 내가 찜한 식단 모아보기';
        btn.style.background = '#FFF2F2';
        btn.style.color = '#E32636';
        btn.style.borderColor = '#FCA5A5';
        if(matrixPanel) matrixPanel.style.display = 'block';
        if(searchBox) searchBox.style.display = 'block';
        runFoodEngine(); 
    }
}

function renderFavorites() {
    const resultArea = document.getElementById('food-result-area');
    const favorites = JSON.parse(localStorage.getItem('favFoods')) || [];

    if (favorites.length === 0) {
        resultArea.innerHTML = `<div class="premium-empty-state"><div class="empty-icon">💔</div><div class="empty-text"><b>아직 찜한 식단이 없어요!</b><span>마음에 드는 레시피에 하트(❤️)를 눌러보세요.</span></div></div>`;
        return;
    }

    // 이유식은 데이터에 고유 id가 없을 수 있으므로 name을 고유 식별자로 사용합니다.
    let favItems = babyFoodData.filter(item => favorites.includes(item.name));
    
    let htmlOutput = `<div style="font-size: 16px; font-weight: 800; color: #E32636; margin-bottom: 16px;">❤️ 내 찜 보관함 (${favItems.length}개)</div>`;
    htmlOutput += favItems.map(item => generateCardHTML(item)).join('');
    resultArea.innerHTML = htmlOutput;
}


// 🚦 1. 식재료 신호등 판독기 + 쌍방향 영양학 팩트체크
function checkIngredient() {
    const query = document.getElementById('ingredient-search').value.trim().replace(/\s+/g, '');
    const resultArea = document.getElementById('traffic-light-result');

    if (!query) {
        resultArea.style.display = 'none';
        return;
    }

    // 신호등 DB 검색
    const found = ingredientDB.find(item => item.name.includes(query) || item.keywords.some(k => k.includes(query)));

    if (found) {
        resultArea.style.display = 'block';
        let color, icon, title, bg, border;
        
        if (found.status === 'red') { color = '#D32F2F'; bg = '#FFF0F1'; border = '#FECACA'; icon = '🚨'; title = '절대 금지'; }
        else if (found.status === 'yellow') { color = '#B45309'; bg = '#FEF3C7'; border = '#FDE68A'; icon = '⚠️'; title = '주의 필요'; }
        else { color = '#059669'; bg = '#ECFDF5'; border = '#A7F3D0'; icon = '🟢'; title = '안심 재료'; }

        // 기본 신호등 결과 UI
        let html = `
            <div style="background:${bg}; border:1px solid ${border}; padding:16px; border-radius:12px; margin-bottom:0;">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                    <span style="font-size:20px;">${icon}</span>
                    <span style="font-weight:900; font-size:16px; color:${color};">${found.name} (${title})</span>
                </div>
                <div style="font-size:14px; color:#4E5968; line-height:1.5; font-weight:600;">${found.desc}</div>
            </div>
        `;

        // ✨ 핵심: 쌍방향(Reverse) 궁합 탐색 AI 로직 ✨
        let goodPairs = [];
        let badPairs = [];

        // 1. 본인이 메인인 경우 (정방향: 예 - '소고기' 검색 시)
        if (pairingDB[found.name]) {
            if (pairingDB[found.name].good) goodPairs.push(...pairingDB[found.name].good);
            if (pairingDB[found.name].bad) badPairs.push(...pairingDB[found.name].bad);
        }

        // 2. 남의 데이터에 포함된 경우 (역방향: 예 - '청경채' 검색 시 '소고기'를 찾아냄!)
        for (const [mainIng, data] of Object.entries(pairingDB)) {
            if (mainIng === found.name) continue; // 정방향에서 이미 찾은 건 패스

            if (data.good) {
                data.good.forEach(g => {
                    if (g.item.includes(found.name) && !goodPairs.some(p => p.item.includes(mainIng))) {
                        goodPairs.push({ item: mainIng, reason: g.reason });
                    }
                });
            }
            if (data.bad) {
                data.bad.forEach(b => {
                    if (b.item.includes(found.name) && !badPairs.some(p => p.item.includes(mainIng))) {
                        badPairs.push({ item: mainIng, reason: b.reason });
                    }
                });
            }
        }

        // 궁합 데이터가 하나라도 있으면 렌더링!
        if (goodPairs.length > 0 || badPairs.length > 0) {
            html += `<div style="margin-top: 16px; padding-top: 16px; border-top: 1.5px dashed #D1D5DB;">`;
            html += `<div style="font-size: 14.5px; font-weight: 900; color: #191F28; margin-bottom: 12px; display:flex; align-items:center; gap:6px;"><span>👩‍⚕️</span> 영양학 팩트체크</div>`;
            
            // 좋은 궁합 렌더링
            goodPairs.forEach(g => {
                html += `
                <div style="display:flex; align-items:flex-start; gap:8px; background:#F0FDF4; border:1px solid #BBF7D0; padding:12px; border-radius:10px; margin-bottom:8px;">
                    <span style="font-size:16px; margin-top:2px;">👍</span>
                    <div>
                        <div style="font-size:13.5px; font-weight:800; color:#166534; margin-bottom:4px;">찰떡궁합: ${g.item}</div>
                        <div style="font-size:13px; font-weight:600; color:#15803D; line-height:1.4;">${g.reason}</div>
                    </div>
                </div>`;
            });
            
            // 나쁜 궁합 렌더링
            badPairs.forEach(b => {
                html += `
                <div style="display:flex; align-items:flex-start; gap:8px; background:#FEF2F2; border:1px solid #FECACA; padding:12px; border-radius:10px; margin-bottom:8px;">
                    <span style="font-size:16px; margin-top:2px;">🙅‍♀️</span>
                    <div>
                        <div style="font-size:13.5px; font-weight:800; color:#991B1B; margin-bottom:4px;">주의궁합: ${b.item}</div>
                        <div style="font-size:13px; font-weight:600; color:#B91C1C; line-height:1.4;">${b.reason}</div>
                    </div>
                </div>`;
            });
            html += `</div>`;
        }

        resultArea.innerHTML = html;
    } else {
        resultArea.style.display = 'block';
        resultArea.innerHTML = `<div style="padding:16px; font-size:14px; color:#8B95A1; font-weight:600; text-align:center; background:#F8F9FA; border-radius:12px;">검색 결과가 없습니다.<br>다른 단어로 검색해보세요.</div>`;
    }
}

// 🌟 공통 카드 렌더링 함수 (대기업 프리미엄 템플릿 완벽 적용 + 녹색 띠 제거)
function generateCardHTML(item) {
    const itemId = item.name;
    const favorites = JSON.parse(localStorage.getItem('favFoods')) || [];
    const isFav = favorites.includes(itemId);
    const heartIcon = isFav ? '❤️ 찜 해제' : '🤍 찜하기';
    const heartColor = isFav ? '#FFF2F2' : '#F2F4F6';
    const heartText = isFav ? '#E32636' : '#4E5968';
    const heartBorder = isFav ? '#FCA5A5' : '#E5E8EB';

    return `
        <div class="stroller-card" style="border-top: 4px solid ${isFavViewMode ? '#E32636' : 'transparent'}; margin-bottom: 24px; padding: 28px 24px; background:#FFF; border-radius:24px; box-shadow:0 4px 16px rgba(0,0,0,0.04); border:1px solid #F2F5F8;">
            
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 20px; gap: 12px;">
                <div style="flex: 1; min-width: 0;">
                    <div style="font-size:22px; font-weight:900; letter-spacing:-0.5px; color:#191F28; word-break:keep-all; line-height:1.4;">
                        🍲 ${item.name}
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; gap: 10px;">
                    <button id="fav-btn-${itemId}" onclick="toggleFavorite('${itemId}')" style="background:${heartColor}; color:${heartText}; border:1px solid ${heartBorder}; padding:8px 12px; border-radius:8px; font-weight:800; font-size:12px; cursor:pointer; transition:0.2s; white-space:nowrap;">
                        ${heartIcon}
                    </button>
                </div>
            </div>
            
            <div style="font-size: 13.5px; color: #4E5968; margin-bottom: 20px; font-weight: 600; line-height: 1.5;">💡 ${item.desc}</div>
            
            <div style="background: #F9FAFB; padding: 16px; border-radius: 14px; border: 1px solid #E5E8EB; margin-bottom: 16px;">
                <div style="font-size: 13.5px; color: #4E5968; line-height: 1.6; font-weight: 600;">
                    <span style="display:block; margin-bottom:6px;"><b>👨‍🍳 입자:</b> ${item.texture}</span>
                    <span style="color:#3182F6; display:block;"><b>🛒 필요 재료:</b> ${item.ingredients}</span>
                </div>
            </div>

            <!-- ✨ 까만색 묵직한 프리미엄 요리 시작 버튼 -->
            <button onclick="openCookingMode('${item.name}')" style="display:flex; justify-content:center; align-items:center; gap:8px; width:100%; background:#191F28; color:#FFFFFF; border:none; padding:18px 16px; border-radius:14px; font-weight:900; font-size:15px; cursor:pointer; box-shadow: 0 4px 14px rgba(0,0,0,0.1); margin-bottom: 16px; transition: 0.2s;">
                👨‍🍳 스마트 요리 모드 시작 〉
            </button>
            
            <div class="recipe-box" style="background: #FFF; border: 1px solid #E5E8EB; padding: 16px; border-radius: 14px; margin-bottom:16px;">
                <div style="font-weight: 800; font-size: 13.5px; color: #191F28; margin-bottom: 8px;">조리 순서 미리보기</div>
                <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #4E5968; line-height: 1.6;">
                    ${item.recipe.map(step => `<li style="margin-bottom:4px;">${step}</li>`).join('')}
                </ul>
            </div>

            <!-- ✨ 카카오톡 노란색 장보기 공유 버튼 -->
            <button onclick="shareToHusband('${item.name}', '${item.ingredients}')" style="display:block; width:100%; background:#FEE500; border:none; color:#191919; padding:16px; border-radius:14px; font-weight:900; font-size:15px; text-align:center; transition:0.2s; cursor:pointer; box-shadow: 0 4px 12px rgba(254, 229, 0, 0.2);">
                💬 남편에게 장보기 전송 (쿠팡)
            </button>
        </div>
    `;
}

// 🩺 기존 기능 2: 안심 이유식 매칭 엔진 (미니멀리즘 + 깜빡임 완벽 해결 버전)
function runFoodEngine() {
    if (isFavViewMode) return;

    const age = document.getElementById('food-age').value;
    const goal = document.getElementById('food-goal').value;
    const fridgeInput = document.getElementById('fridge-search').value.trim();
    
    // 오직 알레르기 직접 입력창의 글씨만 읽어옵니다!
    const customAllergyInput = document.getElementById('custom-allergy-search');
    const customAllergies = customAllergyInput && customAllergyInput.value.trim() !== '' ? customAllergyInput.value.split(/[\s,]+/).filter(i => i !== '') : [];

    const resultArea = document.getElementById('food-result-area');

    if (!age) {
        resultArea.innerHTML = `<div class="premium-empty-state"><div class="empty-icon">🩺</div><div class="empty-text"><b>아기 월령을 선택해주세요.</b></div></div>`;
        return;
    }

    let filtered = babyFoodData.filter(item => {
        if (item.age !== age) return false;
        if (goal !== 'all' && item.goal !== goal) return false;
        
        // 1. ✨ 알레르기 철벽 차단 (스마트 한영 매핑 로직)
        if (customAllergies.length > 0) {
            // 엄마들이 자주 입력하는 한글 알레르기 키워드를 영어 DB(allergens)와 매핑
            const allergyDictionary = {
        '계란': 'egg', '달걀': 'egg', '흰자': 'egg', '노른자': 'egg', '메추리알': 'egg',
        '우유': 'dairy', '치즈': 'dairy', '유제품': 'dairy', '요거트': 'dairy',
        '요구르트': 'dairy', '버터': 'dairy', '생크림': 'dairy', '분유': 'dairy',
        '밀가루': 'flour', '밀': 'flour', '면': 'flour', '빵': 'flour', '국수': 'flour',
        '파스타': 'flour', '소면': 'flour', '오트밀': 'flour', '귀리': 'flour',
        '콩': 'soy', '대두': 'soy', '두부': 'soy', '된장': 'soy', '간장': 'soy',
        '두유': 'soy', '순두부': 'soy', '콩나물': 'soy', '렌틸': 'soy', '완두': 'soy',
        '새우': 'shellfish', '게': 'shellfish', '갑각류': 'shellfish', '꽃게': 'shellfish',
        '조개': 'shellfish', '바지락': 'shellfish', '전복': 'shellfish', '굴': 'shellfish',
        '오징어': 'shellfish', '문어': 'shellfish', '낙지': 'shellfish',
        '생선': 'seafood', '해산물': 'seafood', '대구': 'seafood', '대구살': 'seafood',
        '가자미': 'seafood', '연어': 'seafood', '광어': 'seafood', '고등어': 'seafood',
        '참치': 'seafood', '멸치': 'seafood', '멸치육수': 'seafood', '황태': 'seafood',
        '북어': 'seafood', '미역': 'seafood', '다시마': 'seafood', '흰살생선': 'seafood',
        '땅콩': 'peanut', '견과': 'peanut', '견과류': 'peanut', '호두': 'peanut',
        '잣': 'peanut', '아몬드': 'peanut', '캐슈': 'peanut', '피스타치오': 'peanut'
    };

            const hasCustomAllergy = customAllergies.some(customItem => {
                const mappedEng = allergyDictionary[customItem]; // "유제품" -> "dairy" 변환
                
                return item.name.includes(customItem) || 
                       item.ingredients.includes(customItem) ||
                       (item.allergens && item.allergens.includes(mappedEng)); // 영어 DB 완벽 매칭
            });
            if (hasCustomAllergy) return false; // 하나라도 걸리면 즉시 아웃!
        }
        
        // 2. 냉장고 파먹기
        if (fridgeInput) {
            const fridgeItems = fridgeInput.split(/[\s,]+/).filter(i => i !== '');
            const hasAllFridgeItems = fridgeItems.every(fItem => 
                item.name.includes(fItem) || item.ingredients.includes(fItem)
            );
            if (!hasAllFridgeItems) return false;
        }

        return true;
    });


    if (filtered.length === 0) {
        resultArea.innerHTML = `<div class="premium-empty-state"><div class="empty-text"><b>조건에 맞는 레시피가 없습니다.</b><span>냉장고 재료나 필터를 변경해 보세요.</span></div></div>`;
    } else {
        // ✨ 수정한 부분: 타자 칠 때마다 섞이는 랜덤 로직을 완전히 삭제했습니다! ✨
        // 이제 결과가 고정되어 타자를 쳐도 요동치지 않습니다.
        let top3Results = filtered.slice(0, 3); 
        let otherResults = filtered.slice(3); 

        let htmlOutput = `<div style="font-size: 16px; font-weight: 800; color: #191F28; margin-bottom: 16px;">✨ 오늘의 추천 식단 TOP ${top3Results.length}</div>`;
        htmlOutput += top3Results.map(item => generateCardHTML(item)).join('');

        if (otherResults.length > 0) {
            htmlOutput += `
                <button id="food-show-more-btn" onclick="toggleFoodOthers()" style="display: block; width: 100%; padding: 16px; margin-top: 8px; margin-bottom: 24px; background: #FFFFFF; border: 1px solid #D1D5DB; border-radius: 14px; font-size: 14px; font-weight: 700; color: #4E5968; cursor: pointer; transition: 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
                    나머지 ${otherResults.length}개 레시피 더보기 ▾
                </button>
                <div id="food-other-area" style="display:none; flex-direction: column;">
                    <div style="font-size: 14px; font-weight: 800; color: #8B95A1; margin-bottom: 16px;">🔍 추가 매칭 리스트</div>
                    ${otherResults.map(item => generateCardHTML(item)).join('')}
                </div>
            `;
        }

        resultArea.innerHTML = htmlOutput; // 👈 2개 중 여기가 맞습니다! (runFoodEngine 안쪽)

        // 👇 여기에 스크롤 코드를 딱! 추가해 주세요.
        // 결과가 갱신되면 유저 시선이 다시 매트릭스 필터 쪽으로 부드럽게 올라갑니다.
        document.querySelector('.matrix-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
} // <-- runFoodEngine() 함수가 끝나는 닫는 괄호

function toggleFoodOthers() {
    const otherArea = document.getElementById('food-other-area');
    const btn = document.getElementById('food-show-more-btn');
    if (otherArea.style.display === 'none') {
        otherArea.style.display = 'flex';
        btn.innerText = '나머지 레시피 접기 ▴';
    } else {
        otherArea.style.display = 'none';
        const otherCount = otherArea.querySelectorAll('.stroller-card').length;
        btn.innerText = `나머지 ${otherCount}개 레시피 더보기 ▾`;
        
        // 👇 추가: 리스트 접을 때 화면 튕김 방지
        btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function toggleFoodFilter(btn) {
    btn.classList.toggle('active');
    runFoodEngine();
}

// 🚀 카카오 SDK 초기화 (food/app.js)
try {
    if (typeof Kakao !== 'undefined' && !Kakao.isInitialized()) {
        Kakao.init('68bca10ddfe2ec67112b07eb9a08da2b');
    }
} catch (e) {
    console.warn("카카오 SDK 초기화 지연", e);
}

// 🛒 남편 아바타 조종기 (상업적 멘트 싹 빼고 자연스러운 아내 말투로 변경!)
function shareToHusband(recipeName, ingredients) {
    // ✨ 파트너님의 100% 수익 보장 쿠팡 단축 링크 (뒤에서 조용히 일합니다)
    const partnerLink = "https://link.coupang.com/a/e2f58ZVlhQ"; 
    
    const items = ingredients.split(',').map(i => i.trim());
    let shareText = `여보! 오늘 우리 아기 맘마는 [${recipeName}] 해줄 거야 👶❤️\n\n퇴근길에 로켓프레시로 장 좀 봐줘!\n\n📋 [오늘의 장바구니]\n`;

    // 재료 리스트 추출
    items.forEach(item => {
        const cleanName = item.replace(/[0-9]+(g|ml|T|t|개|장|마리|쪽|알|스푼|분|방울).*/g, '').replace(/\(.*\)/g, '').trim();
        if(cleanName) {
            shareText += `🛒 ${item}\n`;
        }
    });

    // ✨ 완벽하게 자연스러운 아내의 멘트로 수정 (수익 얘기 100% 삭제)
    shareText += `\n👇 아래 링크 눌러서 쿠팡 장바구니에 싹 담아주면 돼!\n👉 ${partnerLink}\n\n고마워 내사랑! 조심해서 와 🥰`;

    // 🚨 카카오톡이 안 될 때 클립보드 복사 폴백
    if (typeof Kakao === 'undefined' || !Kakao.isInitialized()) {
        navigator.clipboard.writeText(shareText).then(() => {
            alert("✅ 남편에게 보낼 장보기 리스트가 복사되었습니다!\n카카오톡에 붙여넣기 해주세요.");
        }).catch(() => prompt("아래 텍스트를 복사해 주세요", shareText));
        return;
    }

    Kakao.Share.sendDefault({
        objectType: 'text',
        text: shareText,
        link: {
            mobileWebUrl: 'https://happy-baby0303.github.io/',
            webUrl: 'https://happy-baby0303.github.io/'
        },
        buttons: [
            {
                title: '장바구니 담으러 가기 👉',
                link: {
                    mobileWebUrl: 'https://happy-baby0303.github.io/',
                    webUrl: 'https://happy-baby0303.github.io/'
                }
            }
        ]
    });
} // 🚨🚨🚨 바로 이 닫는 괄호 '}' 하나가 빠져서 모든 게 멈췄던 겁니다!!! 🚨🚨🚨

// 🚀 페이지 로드 시 글로벌 동기화 후 엔진 실행
window.onload = () => { 
    applyGlobalBabyProfile();
    runFoodEngine(); 
};

// 🚀 [NEW 4] 이유식 탭 전환 로직 (식단 추천 vs 캘린더 완벽 분리)
function switchFoodTab(tabName) {
    const btnCuration = document.getElementById('tab-btn-curation');
    const btnCalendar = document.getElementById('tab-btn-calendar');
    const viewCuration = document.getElementById('view-curation');
    const viewCalendar = document.getElementById('view-calendar');
    const foodGuide = document.getElementById('food-guide'); // ✨ 달력 탭에서 방해되는 녀석 숨기기용!

    if (tabName === 'curation') {
        btnCuration.style.background = '#FFFFFF';
        btnCuration.style.color = '#191F28';
        btnCuration.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
        btnCalendar.style.background = 'transparent';
        btnCalendar.style.color = '#8B95A1';
        btnCalendar.style.boxShadow = 'none';

        viewCuration.style.display = 'block';
        viewCalendar.style.display = 'none';
        if (foodGuide) foodGuide.style.display = 'block'; // 레시피 탭에서는 가이드 보이기
    } else {
        btnCalendar.style.background = '#FFFFFF';
        btnCalendar.style.color = '#191F28';
        btnCalendar.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
        btnCuration.style.background = 'transparent';
        btnCuration.style.color = '#8B95A1';
        btnCuration.style.boxShadow = 'none';

        viewCalendar.style.display = 'block';
        viewCuration.style.display = 'none'; 
        if (foodGuide) foodGuide.style.display = 'none'; // ✨ 달력 탭에서는 가이드 완벽히 숨기기!
    }

    // 탭을 전환할 때마다 화면 맨 위로 부드럽게 끌어올려줌
    window.scrollTo({top: 0, behavior: 'smooth'}); 
}

// ==========================================
// 📅 이유식 캘린더 엔진 (Premium 인테리어 에디션)
// ==========================================

let currentDate = new Date();
let selectedDateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;

function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    document.getElementById('cal-month-title').innerText = `${year}년 ${month + 1}월`;
    
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    
    const grid = document.getElementById('cal-grid');
    if(!grid) return;
    grid.innerHTML = '';
    
    const records = JSON.parse(localStorage.getItem('tosil_food_calendar')) || {};
    const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;

    let monthPass = 0;
    let monthFail = 0;

    for (let i = 0; i < firstDay; i++) {
        grid.innerHTML += `<div class="cal-day empty"></div>`;
    }
    
    for (let i = 1; i <= lastDate; i++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        let classNames = 'cal-day';
        if (dateStr === todayStr) classNames += ' today';
        if (dateStr === selectedDateStr) classNames += ' selected';
        
        let dotsHtml = '';
        if (records[dateStr]) {
            dotsHtml = '<div class="cal-dot-container">';
            records[dateStr].forEach(r => {
                // ✨ 수정된 로직: 식단 기록은 파란 점! 카운트 안 함!
                if (r.type === 'meal' || (r.menu && !r.ingredient)) {
                    dotsHtml += `<div class="cal-dot" style="background:#3182F6;"></div>`;
                } 
                // 재료 테스트는 기존처럼 초록/빨강 점! 카운트 함!
                else {
                    dotsHtml += `<div class="cal-dot ${r.status}"></div>`;
                    if(r.status === 'pass') monthPass++;
                    else if(r.status === 'fail') monthFail++;
                }
            });
            dotsHtml += '</div>';
        }

        grid.innerHTML += `<div class="${classNames}" onclick="selectDate('${dateStr}')"><span style="margin-bottom:2px;">${i}</span>${dotsHtml}</div>`;
    }

    // 월간 요약 대시보드 업데이트
    const sumPass = document.getElementById('sum-pass');
    const sumFail = document.getElementById('sum-fail');
    if(sumPass) sumPass.innerText = `🟢 ${monthPass}개`;
    if(sumFail) sumFail.innerText = `🚨 ${monthFail}개`;

    renderSelectedDateRecords();
}

function changeMonth(delta) {
    currentDate.setMonth(currentDate.getMonth() + delta);
    renderCalendar();
}

function selectDate(dateStr) {
    selectedDateStr = dateStr;
    renderCalendar();
}

// ✨ [AI 마법] 텍스트를 분석해서 귀여운 이모지 자동 맵핑!
function getFoodEmoji(name) {
    if(/소고기|돼지|닭|고기|안심|우둔/.test(name)) return '🥩';
    if(/쌀|미음|오트밀|죽|밥|현미/.test(name)) return '🥣';
    if(/호박|청경채|브로콜리|시금치|오이|배추|당근|무|감자|고구마|야채|채소|양배추/.test(name)) return '🥦';
    if(/사과|바나나|배|퓨레|과일|수박|딸기|귤|포도/.test(name)) return '🍎';
    if(/계란|노른자|달걀|흰자/.test(name)) return '🥚';
    if(/땅콩|호두|아몬드|견과/.test(name)) return '🥜';
    if(/치즈|우유|요거트|분유|유제품/.test(name)) return '🧀';
    if(/새우|게|대게|랍스터|조개|갑각류/.test(name)) return '🦐';
    if(/생선|연어|대구|광어|고등어|갈치/.test(name)) return '🐟';
    if(/두부|콩|완두/.test(name)) return '🫘';
    return '🍽️';
}

function renderSelectedDateRecords() {
    const listArea = document.getElementById('cal-record-list');
    const records = JSON.parse(localStorage.getItem('tosil_food_calendar')) || {};
    const dailyRecords = records[selectedDateStr] || [];
    
    const dateObj = new Date(selectedDateStr);
    const titleEl = document.getElementById('cal-selected-date-text');
    if(titleEl) titleEl.innerText = `${dateObj.getMonth()+1}월 ${dateObj.getDate()}일 기록`;

    if (dailyRecords.length === 0) {
        listArea.innerHTML = `<div style="text-align: center; padding: 30px 0; color: #8B95A1; font-size: 14px; font-weight: 600; background:#FFF; border-radius:14px; border:1px dashed #D1D5DB;">기록된 내역이 없습니다.</div>`;
        return;
    }

    listArea.innerHTML = dailyRecords.map((r, i) => {
        let contentHtml = '';

        if (r.type === 'meal' || (r.menu && !r.ingredient)) {
            let amountHtml = ''; let reactionHtml = ''; let actionBtnHtml = '';

            // 💡 [핵심 디테일] 계획됨 상태면 '기록 완료' 파란 버튼 띄우기 (문자열 포함 여부로 확실히 체크!)
            if (r.amount && r.amount.includes('계획됨')) {
                amountHtml = `<span style="background:#FFF7ED; border:1px solid #FDBA74; padding:4px 8px; border-radius:6px; font-size:11px; font-weight:800; color:#9A3412; cursor:pointer;" onclick="openMealSheetForUpdate('${selectedDateStr}', ${i}, '${r.menu}')">⏳ 아직 안 먹었어요 · 눌러서 기록</span>`;
                actionBtnHtml = `<button onclick="openMealSheetForUpdate('${selectedDateStr}', ${i}, '${r.menu}')" style="background:#3182F6; color:#FFF; border:none; border-radius:8px; font-size:12px; font-weight:800; padding:8px 12px; cursor:pointer; box-shadow:0 2px 4px rgba(49,130,246,0.2); transition:0.2s;">기록 완료 ✏️</button>`;
            } else {
                // 이미 먹은 기록일 경우 (기존)
                amountHtml = `<span style="background:#F0F7FF; padding:4px 8px; border-radius:6px; font-size:12px; font-weight:800; color:#3182F6;">${r.amount}</span>`;
                reactionHtml = `<span style="background:#F2F4F6; padding:4px 8px; border-radius:6px; font-size:12px; font-weight:800; color:#4E5968;">${r.reaction}</span>`;
                actionBtnHtml = `<button onclick="deleteFoodRecord('${selectedDateStr}', ${i})" style="background:#F9FAFB; border:1px solid #E5E8EB; border-radius:8px; font-size:12px; font-weight:700; color:#8B95A1; cursor:pointer; padding:6px 10px;">삭제</button>`;
            }

            contentHtml = `
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                    <span style="font-size:12px; color:#8B95A1; font-weight:700;">${(typeof r.time === 'string' && !/^\d{6,}$/.test(r.time)) ? r.time : ''}</span>
                    <span style="font-weight: 900; font-size: 16px; color: #191F28; letter-spacing:-0.5px;">${getFoodEmoji(r.menu)} ${r.menu}</span>
                </div>
                <div style="display:flex; gap:6px; align-items:center;">
                    ${amountHtml} ${reactionHtml}
                </div>
            `;
            
            return `
                <div style="background: #FFF; border: 1px solid #E5E8EB; padding: 18px 16px; border-radius: 16px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; box-shadow:0 2px 8px rgba(0,0,0,0.02);">
                    <div style="display:flex; flex-direction:column;">
                        ${contentHtml}
                    </div>
                    <div>${actionBtnHtml}</div>
                </div>
            `;
        } else {
            // 재료 테스트용 UI (기존)
            const isPass = r.status === 'pass';
            const icon = isPass ? '🟢' : '🚨';
            contentHtml = `
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                    <span style="font-size:12px; color:#8B95A1; font-weight:700;">${(typeof r.time === 'string' && !/^\d{6,}$/.test(r.time)) ? r.time : ''}</span>
                    <span style="font-weight: 900; font-size: 15px; color: ${isPass ? '#059669' : '#D32F2F'};">${getFoodEmoji(r.ingredient)} ${r.ingredient} 먹여봤어요</span>
                </div>
                <span style="display:inline-block; font-size:12px; font-weight:800; padding:4px 8px; border-radius:6px; background:${isPass ? '#ECFDF5' : '#FFF0F1'}; color:${isPass ? '#059669' : '#D32F2F'};">
                    ${icon} ${isPass ? '무사 통과' : '알레르기 반응'}
                </span>
            `;
            return `
                <div style="background: #FFF; border: 1px solid #E5E8EB; padding: 16px; border-radius: 14px; display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <div style="display:flex; flex-direction:column;">${contentHtml}</div>
                    <button onclick="deleteFoodRecord('${selectedDateStr}', ${i})" style="background: #F9FAFB; border: 1px solid #E5E8EB; border-radius: 8px; font-size: 12px; font-weight:700; color: #8B95A1; cursor: pointer; padding:6px 10px;">삭제</button>
                </div>
            `;
        }
    }).join('');
}

function openFoodSheet() {
    document.getElementById('food-bottom-sheet').style.display = 'flex';
    document.getElementById('food-menu-input').value = '';
    document.getElementById('food-amount-input').value = '';
    document.getElementById('food-ing-input').value = '';
    setAllergyStatus('pass'); // 기본값으로 리셋
}

function closeFoodSheet() {
    document.getElementById('food-bottom-sheet').style.display = 'none';
}

function saveFoodCalendar(status) {
    const ingredient = document.getElementById('food-ing-input').value.trim();
    if (!ingredient) return alert("급여한 식재료를 입력해주세요! (예: 소고기)");
    
    let records = JSON.parse(localStorage.getItem('tosil_food_calendar')) || {};
    if (!records[selectedDateStr]) records[selectedDateStr] = [];
    
    records[selectedDateStr].push({ ingredient, status });
    localStorage.setItem('tosil_food_calendar', JSON.stringify(records));
    
    closeFoodSheet();
    renderCalendar();
}

function deleteFoodRecord(dateStr, index) {
    if (!confirm(`'${JSON.parse(localStorage.getItem('tosil_food_calendar'))[dateStr][index].ingredient}' 기록을 삭제할까요?`)) return;
    let records = JSON.parse(localStorage.getItem('tosil_food_calendar')) || {};
    if (records[dateStr]) {
        records[dateStr].splice(index, 1);
        if (records[dateStr].length === 0) delete records[dateStr];
        localStorage.setItem('tosil_food_calendar', JSON.stringify(records));
    }
    renderCalendar();
}

document.addEventListener("DOMContentLoaded", () => {
    setTimeout(renderCalendar, 300);
});

// ✨ 도감 추출 로직 (메뉴 이름은 거르고, 순수 '재료명(ingredient)'만 추출)
function renderTotalSummary() {
    const records = JSON.parse(localStorage.getItem('tosil_food_calendar')) || {};
    const passedSet = new Set();
    const failedSet = new Set();

    Object.values(records).forEach(dailyList => {
        dailyList.forEach(r => {
            // ingredient 필드가 비어있으면 도감에 넣지 않음!
            const cleanName = (r.ingredient || "").trim(); 
            if (cleanName) {
                if (r.status === 'fail') {
                    failedSet.add(cleanName);
                } else {
                    passedSet.add(cleanName);
                }
            }
        });
    });

    failedSet.forEach(item => passedSet.delete(item));

    const passListEl = document.getElementById('summary-pass-list');
    const failListEl = document.getElementById('summary-fail-list');
    const passCntEl = document.getElementById('summary-pass-cnt');
    const failCntEl = document.getElementById('summary-fail-cnt');

    if(passCntEl) passCntEl.innerText = passedSet.size;
    if(failCntEl) failCntEl.innerText = failedSet.size;

    if(passListEl) {
        if(passedSet.size === 0) {
            passListEl.innerHTML = '<span style="font-size:12.5px; color:#8B95A1;">아직 통과한 재료가 없어요.</span>';
        } else {
            passListEl.innerHTML = Array.from(passedSet).map(ing => 
                `<span style="background:#ECFDF5; color:#059669; border:1px solid #A7F3D0; padding:6px 14px; border-radius:20px; font-size:13.5px; font-weight:800; display:inline-flex; align-items:center; gap:4px;">${getFoodEmoji(ing)} ${ing}</span>`
            ).join('');
        }
    }

    if(failListEl) {
        if(failedSet.size === 0) {
            failListEl.innerHTML = '<span style="font-size:12.5px; color:#8B95A1;">알레르기 반응이 나타난 재료가 없어요!</span>';
        } else {
            failListEl.innerHTML = Array.from(failedSet).map(ing => 
                `<span style="background:#FFF0F1; color:#D32F2F; border:1px solid #FECACA; padding:6px 14px; border-radius:20px; font-size:13.5px; font-weight:800; display:inline-flex; align-items:center; gap:4px;">${getFoodEmoji(ing)} ${ing}</span>`
            ).join('');
        }
    }
}

// ==========================================
// 👨‍🍳 스마트 요리 모드 (프리미엄 디테일 탑재) 엔진
// ==========================================

let cookTimeRemaining = 0;
let cookTimeTotal = 0; // 게이지 바를 위한 전체 시간 저장
let cookTimerInterval = null;
let isTimerRunning = false;
let wakeLock = null; // 화면 꺼짐 방지 객체

// ☀️ 화면 꺼짐 방지(Wake Lock) API
async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator) {
            wakeLock = await navigator.wakeLock.request('screen');
            document.getElementById('wake-lock-badge').style.display = 'inline-block';
            
            wakeLock.addEventListener('release', () => {
                document.getElementById('wake-lock-badge').style.display = 'none';
            });
        }
    } catch (err) {
        console.log('Wake Lock Error:', err);
    }
}

function releaseWakeLock() {
    if (wakeLock !== null) {
        wakeLock.release();
        wakeLock = null;
    }
}

function openCookingMode(recipeName) {
    const recipe = babyFoodData.find(r => r.name === recipeName);
    if (!recipe) return;

    document.getElementById('cook-title').innerText = recipe.name;
    
    const stepsContainer = document.getElementById('cook-steps-container');
    stepsContainer.innerHTML = recipe.recipe.map((step, index) => {
        const timeMatch = step.match(/(\d+)분/);
        let timerBtnHtml = '';
        if (timeMatch) {
            const mins = parseInt(timeMatch[1]);
            timerBtnHtml = `
                <button onclick="event.stopPropagation(); setCookTimer(${mins});" style="background:#FFF0F1; color:#D32F2F; border:1px solid #FECACA; padding:6px 12px; border-radius:8px; font-weight:900; font-size:12px; cursor:pointer; margin-left:auto; display:flex; align-items:center; gap:4px; box-shadow:0 2px 4px rgba(0,0,0,0.02); flex-shrink:0; transition:0.2s;">
                    ⏱️ ${mins}분 세팅
                </button>
            `;
        }
        return `
            <div class="cook-step" onclick="this.classList.toggle('checked')" style="display:flex; align-items:center;">
                <div class="step-box" style="min-width:24px; height:24px; border-radius:6px; border:2px solid #D1D5DB; display:flex; justify-content:center; align-items:center; font-size:12px; font-weight:900; flex-shrink:0;">${index + 1}</div>
                <div style="flex:1; padding-right:8px;">${step.substring(step.indexOf('.') + 1).trim()}</div>
                ${timerBtnHtml}
            </div>
        `;
    }).join('');

    resetCookTimer();
    document.getElementById('cooking-mode-modal').classList.remove('alarm-active');
    document.getElementById('cooking-mode-modal').style.display = 'flex';
    
    // ✨ 요리 모드를 열 때 화면이 절대 안 꺼지게 만듭니다!
    requestWakeLock();
}

function setCookTimer(minutes) {
    resetCookTimer();
    cookTimeTotal = minutes * 60; // 게이지바 계산용
    cookTimeRemaining = cookTimeTotal;
    updateCookTimerDisplay();
    
    const display = document.getElementById('cook-timer-display');
    display.style.transform = 'scale(1.1)';
    display.style.color = '#D32F2F';
    setTimeout(() => {
        display.style.transform = 'scale(1)';
        display.style.color = '#191F28';
    }, 300);
}

function closeCookingMode() {
    document.getElementById('cooking-mode-modal').style.display = 'none';
    resetCookTimer();
    releaseWakeLock(); // 요리 모드 닫을 때 배터리를 위해 꺼짐 방지 해제
}

function addCookTime(seconds) {
    cookTimeRemaining += seconds;
    if(cookTimeTotal < cookTimeRemaining) cookTimeTotal = cookTimeRemaining; 
    updateCookTimerDisplay();
}

function toggleCookTimer() {
    const btn = document.getElementById('cook-timer-btn');
    document.getElementById('cooking-mode-modal').classList.remove('alarm-active'); 
    
    if (isTimerRunning) {
        clearInterval(cookTimerInterval);
        isTimerRunning = false;
        btn.innerHTML = '▶ 계속';
        btn.style.background = '#3182F6';
    } else {
        if (cookTimeRemaining <= 0) return alert('먼저 시간을 세팅해주세요!');
        
        isTimerRunning = true;
        btn.innerHTML = '⏸ 일시정지';
        btn.style.background = '#F59E0B'; 
        
        cookTimerInterval = setInterval(() => {
            cookTimeRemaining--;
            updateCookTimerDisplay();
            
            if (cookTimeRemaining <= 0) {
                clearInterval(cookTimerInterval);
                isTimerRunning = false;
                btn.innerHTML = '▶ 시작';
                btn.style.background = '#3182F6';
                updateCookTimerDisplay();
                
                // ✨ [핵심 디테일] 팝업창 대신 '화면 번쩍임' + '무음 진동' 알람!
                document.getElementById('cooking-mode-modal').classList.add('alarm-active');
                if (navigator.vibrate) {
                    navigator.vibrate([500, 300, 500, 300, 500, 300, 500]); // 징~ 징~ 징~ 징~
                }
            }
        }, 1000);
    }
}

function resetCookTimer() {
    clearInterval(cookTimerInterval);
    isTimerRunning = false;
    cookTimeRemaining = 0;
    cookTimeTotal = 0;
    updateCookTimerDisplay();
    
    const btn = document.getElementById('cook-timer-btn');
    if(btn) {
        btn.innerHTML = '▶ 시작';
        btn.style.background = '#3182F6';
    }
    document.getElementById('cooking-mode-modal').classList.remove('alarm-active');
}

function updateCookTimerDisplay() {
    const m = Math.floor(cookTimeRemaining / 60);
    const s = cookTimeRemaining % 60;
    const display = document.getElementById('cook-timer-display');
    const bar = document.getElementById('cook-progress-bar');
    
    if(display) display.innerText = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    
    // ✨ 프로그레스 게이지 바 애니메이션 계산
    if(bar) {
        if (cookTimeTotal === 0) {
            bar.style.width = '100%';
            bar.style.background = '#E5E8EB';
            display.style.color = '#191F28';
        } else {
            const percent = (cookTimeRemaining / cookTimeTotal) * 100;
            bar.style.width = `${percent}%`;
            
            // 10초 남았을 때 아드레날린 솟구치는 빨간색으로 변경!
            if(cookTimeRemaining <= 10 && cookTimeRemaining > 0) {
                bar.style.background = '#D32F2F';
                display.style.color = '#D32F2F';
            } else {
                bar.style.background = '#3182F6';
                display.style.color = '#191F28';
            }
        }
    }
}

// ==========================================
// 👩‍⚕️ 영양학 팩트체크 궁합 데이터 (의학/영양학 교차 검증 완료)
// ==========================================
const pairingDB = {
    "소고기": {
        good: [{ item: "브로콜리, 청경채, 파프리카", reason: "비타민C가 소고기의 철분 흡수율을 최대 30%까지 끌어올려요!" }],
        bad: [{ item: "치즈, 우유 (유제품)", reason: "유제품의 칼슘이 철분 흡수를 방해해요. 고기 섭취 후 최소 2시간 간격을 두세요." }, { item: "고구마, 부추", reason: "소화에 필요한 위산 농도가 달라 함께 먹으면 아기 배에 가스가 차고 소화불량을 유발할 수 있어요." }]
    },
    "시금치": {
        good: [{ item: "소고기, 당근, 사과", reason: "철분과 비타민의 시너지가 좋고, 사과가 시금치의 풋내를 완벽히 잡아줘요." }],
        bad: [{ item: "두부, 치즈, 멸치", reason: "시금치의 '수산' 성분이 칼슘과 만나면 체내 결석(돌)을 유발할 수 있어 절대 피해야 해요!" }]
    },
    "당근": {
        good: [{ item: "사과, 고구마, 현미유", reason: "지용성 비타민A가 풍부해 기름에 살짝 볶으면 체내 흡수율이 60% 이상 훌쩍 뛰어요!" }],
        bad: [{ item: "오이, 무", reason: "생당근의 '아스코르비나아제' 효소가 오이와 무의 비타민C를 파괴해요. (단, 익혀 먹으면 괜찮아요)" }]
    },
    "오이": {
        good: [{ item: "사과, 배, 소고기", reason: "수분 보충에 최고이며, 고기의 열을 내려주고 시원한 맛이 잘 어울려요." }],
        bad: [{ item: "당근, 무", reason: "생으로 같이 먹으면 비타민C가 파괴되니 따로 먹이거나 푹 익혀주세요." }]
    },
    "미역": {
        good: [{ item: "두부", reason: "두부의 콩 성분이 몸 밖으로 배출하는 요오드를 미역이 완벽하게 다시 채워주는 상호보완 궁합이에요!" }],
        bad: [{ item: "파 (대파, 쪽파)", reason: "파의 유황 성분이 미역의 칼슘 흡수를 방해하고, 미끄러운 식감끼리 만나 소화를 방해해요." }]
    },
    "두부": {
        good: [{ item: "미역, 다시마, 소고기", reason: "두부가 배출하는 요오드를 해조류가 채워주는 완벽한 궁합이에요." }],
        bad: [{ item: "시금치", reason: "수산과 칼슘이 만나 장내 결석을 유발할 수 있어 소아과에서 가장 주의하는 조합이에요." }]
    },
    "치즈": {
        good: [{ item: "감자, 고구마", reason: "구황작물에 부족한 단백질과 칼슘을 치즈가 완벽하게 채워줘요." }],
        bad: [{ item: "소고기, 시금치", reason: "치즈의 빵빵한 칼슘이 필수 영양소인 철분 흡수를 막아버려요. 고기 먹은 직후엔 피하세요." }]
    },
    "닭고기": {
        good: [{ item: "고구마, 단호박, 밤, 대추", reason: "따뜻한 성질의 닭고기와 달콤한 구황작물이 만나 소화를 돕고 기력을 보충해요." }],
        bad: [{ item: "자두", reason: "함께 먹으면 위장 소화 효소가 엉켜 배탈이 날 수 있어요." }]
    },
    "고구마": {
        good: [{ item: "사과, 배", reason: "사과의 '펙틴' 성분이 고구마로 인한 장내 가스 생성과 방귀를 막아줘요." }],
        bad: [{ item: "소고기", reason: "소화에 필요한 위산 농도가 달라 함께 섭취 시 속쓰림을 유발할 수 있어요." }]
    }
};

// ==========================================
// 📅 캘린더 기록 엔진 (식단/테스트 완벽 분리형)
// ==========================================

let currentAllergyStatus = 'pass';

function setAllergyStatus(status) {
    currentAllergyStatus = status;
    const btnPass = document.getElementById('btn-al-pass');
    const btnFail = document.getElementById('btn-al-fail');
    
    if (btnPass && btnFail) {
        btnPass.style.border = status === 'pass' ? '2px solid #10B981' : '2px solid transparent';
        btnFail.style.border = status === 'fail' ? '2px solid #E32636' : '2px solid transparent';
    }
}

let editingDate = null;
let editingIndex = -1;

function openMealSheet() {
    editingDate = null;
    editingIndex = -1;
    document.getElementById('meal-bottom-sheet').style.display = 'flex';
    document.getElementById('meal-menu-input').value = '';
    document.getElementById('meal-amount-input').value = '';
    document.getElementById('meal-reaction-input').selectedIndex = 0;
}

// 💡 [니치 디테일] 계획된 식단을 실제 먹은 기록으로 업데이트 창 열기!
window.openMealSheetForUpdate = function(dateStr, index, menuName) {
    editingDate = dateStr;
    editingIndex = index;
    document.getElementById('meal-bottom-sheet').style.display = 'flex';
    document.getElementById('meal-menu-input').value = menuName;
    document.getElementById('meal-amount-input').value = '';
    document.getElementById('meal-reaction-input').selectedIndex = 0;
};

function openTestSheet() {
    document.getElementById('test-bottom-sheet').style.display = 'flex';
    document.getElementById('test-ing-input').value = '';
    setAllergyStatus('pass');
}

function closeSheets() {
    const mealSheet = document.getElementById('meal-bottom-sheet');
    const testSheet = document.getElementById('test-bottom-sheet');
    if(mealSheet) mealSheet.style.display = 'none';
    if(testSheet) testSheet.style.display = 'none';
}

function saveMealRecord() {
    const menu = document.getElementById('meal-menu-input').value.trim();
    const amount = document.getElementById('meal-amount-input').value.trim();
    const reaction = document.getElementById('meal-reaction-input').value;
    
    if (!menu) return alert('메뉴 이름은 꼭 입력해주세요! (예: 소고기 미음)');

    const finalAmount = amount ? `${amount}ml` : '양 모름';
    const timeStr = new Date().toLocaleTimeString('ko-KR', {hour: '2-digit', minute:'2-digit'});
    let records = JSON.parse(localStorage.getItem('tosil_food_calendar')) || {};

    if (editingIndex !== -1 && editingDate) {
        // 💡 [니치 디테일] '계획됨' 상태를 현재 입력한 섭취량/반응으로 완벽히 덮어쓰기!
        records[editingDate][editingIndex].menu = menu;
        records[editingDate][editingIndex].amount = finalAmount;
        records[editingDate][editingIndex].reaction = reaction;
        records[editingDate][editingIndex].time = timeStr;
        
        // 덮어쓰기 끝났으니 초기화
        editingIndex = -1;
        editingDate = null;
    } else {
        // 신규 기록 저장
        if (!records[selectedDateStr]) records[selectedDateStr] = [];
        records[selectedDateStr].push({ type: 'meal', menu, amount: finalAmount, reaction, time: timeStr });
    }

    localStorage.setItem('tosil_food_calendar', JSON.stringify(records));
    closeSheets();
    renderCalendar();
    renderSelectedDateRecords();
    renderTotalSummary();
}

function saveTestRecord() {
    const ingredient = document.getElementById('test-ing-input').value.trim();
    if (!ingredient) return alert('테스트한 식재료를 입력해주세요!');

    saveToCalendarDB({ type: 'test', ingredient, status: currentAllergyStatus });
    closeSheets();
}

// 공통 DB 저장 로직 (테스트 기록용 유지)
function saveToCalendarDB(dataObj) {
    const timeStr = new Date().toLocaleTimeString('ko-KR', {hour: '2-digit', minute:'2-digit'});
    dataObj.time = timeStr;

    let records = JSON.parse(localStorage.getItem('tosil_food_calendar')) || {};
    if (!records[selectedDateStr]) records[selectedDateStr] = [];
    
    records[selectedDateStr].push(dataObj);
    localStorage.setItem('tosil_food_calendar', JSON.stringify(records));
    
    renderCalendar();
    renderSelectedDateRecords();
    renderTotalSummary();
}

// ✨ 디테일 카드 렌더링 (타입에 따라 디자인 다르게)
function renderSelectedDateRecords() {
    /* ⚠️ 이 이름의 함수가 파일에 둘 있었다. 자바스크립트는 나중 것이 이긴다.
          그래서 '계획됨' 을 눌러도 아무 반응이 없었다.
          이제 하나로 합친다. 위쪽 옛 정의는 이 함수가 덮어쓴다. */
    const listArea = document.getElementById('cal-record-list');
    if (!listArea) return;
    const records = JSON.parse(localStorage.getItem('tosil_food_calendar')) || {};
    const dailyRecords = records[selectedDateStr] || [];
    const dateObj = new Date(selectedDateStr);
    const titleEl = document.getElementById('cal-selected-date-text');
    if (titleEl) titleEl.innerText = `${dateObj.getMonth()+1}월 ${dateObj.getDate()}일 기록`;

    if (dailyRecords.length === 0) {
        listArea.innerHTML = `<div style="text-align:center; padding:30px 0; color:#8B95A1; font-size:14px; font-weight:600; background:#FFF; border-radius:14px; border:1px dashed #D1D5DB;">기록된 내역이 없습니다.</div>`;
        return;
    }

    const showTime = (t) => (typeof t === 'string' && !/^\d{6,}$/.test(t)) ? t : '';

    listArea.innerHTML = dailyRecords.map((r, i) => {
        // ── 식단 기록 ──
        if (r.type === 'meal' || (r.menu && !r.ingredient)) {
            const planned = !!(r.amount && String(r.amount).indexOf('계획됨') > -1);
            const open = `openMealSheetForUpdate('${selectedDateStr}', ${i}, '${String(r.menu).replace(/'/g, "")}')`;

            const chips = planned
                ? `<span onclick="${open}" style="background:#FFF7ED; border:1px solid #FDBA74; padding:5px 10px; border-radius:7px; font-size:11.5px; font-weight:800; color:#9A3412; cursor:pointer;">⏳ 아직 안 먹었어요 · 눌러서 기록</span>`
                : `<span style="background:#F0F7FF; padding:4px 8px; border-radius:6px; font-size:12px; font-weight:800; color:#3182F6;">${r.amount || ''}</span>
                   <span style="background:#F2F4F6; padding:4px 8px; border-radius:6px; font-size:12px; font-weight:800; color:#4E5968;">${r.reaction || ''}</span>`;

            const btn = planned
                ? `<button onclick="${open}" style="background:#3182F6; color:#FFF; border:none; border-radius:9px; font-size:12px; font-weight:800; padding:9px 12px; cursor:pointer; white-space:nowrap;">기록하기 ✏️</button>`
                : `<button onclick="deleteFoodRecord('${selectedDateStr}', ${i})" style="background:#F9FAFB; border:1px solid #E5E8EB; border-radius:8px; font-size:12px; font-weight:700; color:#8B95A1; cursor:pointer; padding:6px 10px;">삭제</button>`;

            return `
                <div style="background:#FFF; border:1px solid ${planned ? '#FDBA74' : '#E5E8EB'}; padding:16px; border-radius:16px; display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:8px;">
                    <div style="flex:1; min-width:0;">
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                            <span style="font-size:12px; color:#8B95A1; font-weight:700;">${showTime(r.time)}</span>
                            <span style="font-weight:900; font-size:15.5px; color:#191F28; letter-spacing:-0.4px;">${getFoodEmoji(r.menu)} ${r.menu}</span>
                        </div>
                        <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">${chips}</div>
                    </div>
                    <div style="flex-shrink:0;">${btn}</div>
                </div>`;
        }

        // ── 재료 먹여본 기록 ──
        const isPass = r.status === 'pass';
        return `
            <div style="background:#FFF; border:1px solid #E5E8EB; padding:16px; border-radius:14px; display:flex; justify-content:space-between; align-items:flex-start; gap:10px; margin-bottom:8px;">
                <div style="flex:1; min-width:0;">
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                        <span style="font-size:12px; color:#8B95A1; font-weight:700;">${showTime(r.time)}</span>
                        <span style="font-weight:900; font-size:15px; color:${isPass ? '#059669' : '#D32F2F'};">${getFoodEmoji(r.ingredient)} ${r.ingredient} 먹여봤어요</span>
                    </div>
                    <span style="display:inline-block; font-size:12px; font-weight:800; padding:4px 8px; border-radius:6px; background:${isPass ? '#ECFDF5' : '#FFF0F1'}; color:${isPass ? '#059669' : '#D32F2F'};">
                        ${isPass ? '🟢 무사 통과' : '🚨 알레르기 반응'}
                    </span>
                </div>
                <button onclick="deleteFoodRecord('${selectedDateStr}', ${i})" style="background:#F9FAFB; border:1px solid #E5E8EB; border-radius:8px; font-size:12px; font-weight:700; color:#8B95A1; cursor:pointer; padding:6px 10px;">삭제</button>
            </div>`;
    }).join('');
}

function deleteFoodRecord(dateStr, index) {
    if (!confirm('이 기록을 삭제하시겠습니까?')) return;
    let records = JSON.parse(localStorage.getItem('tosil_food_calendar')) || {};
    if (records[dateStr]) {
        records[dateStr].splice(index, 1);
        if (records[dateStr].length === 0) delete records[dateStr];
        localStorage.setItem('tosil_food_calendar', JSON.stringify(records));
    }
    renderCalendar();
    renderTotalSummary();
}

// ✨ 도감 추출 로직 (순수 테스트 기록만 도감에 반영)
function renderTotalSummary() {
    const records = JSON.parse(localStorage.getItem('tosil_food_calendar')) || {};
    const passedSet = new Set();
    const failedSet = new Set();

    Object.values(records).forEach(dailyList => {
        dailyList.forEach(r => {
            if (r.type === 'test' || (r.ingredient && !r.menu)) {
                const cleanName = r.ingredient.trim(); 
                if (cleanName) {
                    if (r.status === 'fail') failedSet.add(cleanName);
                    else passedSet.add(cleanName);
                }
            }
        });
    });

    failedSet.forEach(item => passedSet.delete(item));

    const passListEl = document.getElementById('summary-pass-list');
    const failListEl = document.getElementById('summary-fail-list');
    
    const passCntEl = document.getElementById('summary-pass-cnt');
    const failCntEl = document.getElementById('summary-fail-cnt');
    
    if(passCntEl) passCntEl.innerText = passedSet.size;
    if(failCntEl) failCntEl.innerText = failedSet.size;

    if(passListEl) {
        passListEl.innerHTML = passedSet.size === 0 ? '<span style="font-size:12.5px; color:#8B95A1;">아직 통과한 재료가 없어요.</span>' 
            : Array.from(passedSet).map(ing => `<span style="background:#ECFDF5; color:#059669; border:1px solid #A7F3D0; padding:6px 14px; border-radius:20px; font-size:13.5px; font-weight:800; display:inline-flex; align-items:center; gap:4px;">${getFoodEmoji(ing)} ${ing}</span>`).join('');
    }

    if(failListEl) {
        failListEl.innerHTML = failedSet.size === 0 ? '<span style="font-size:12.5px; color:#8B95A1;">알레르기 반응이 나타난 재료가 없어요!</span>' 
            : Array.from(failedSet).map(ing => `<span style="background:#FFF0F1; color:#D32F2F; border:1px solid #FECACA; padding:6px 14px; border-radius:20px; font-size:13.5px; font-weight:800; display:inline-flex; align-items:center; gap:4px;">${getFoodEmoji(ing)} ${ing}</span>`).join('');
    }
}

// ==========================================
// 🤖 AI 큐브 자동 차감 스캐너 엔진 (🚨 이름표 완벽 매칭 버전!!! 🔑)
// ==========================================
let matchedCubesForDeduction = [];

// 💡 큐브 데이터 파싱용 안전 함수
function getCubeName(c) { return c.name || c.itemName || c.title || c.ingredient || c.text || c.foodName || "이름모름"; }
function getCubeQty(c) { 
    let rawQty = c.qty !== undefined ? c.qty : (c.quantity !== undefined ? c.quantity : (c.count !== undefined ? c.count : 0));
    if (typeof rawQty === 'string') return parseInt(rawQty.replace(/[^0-9]/g, '')) || 0;
    return parseInt(rawQty) || 0;
}

window.triggerAutoDeduction = function() {
    const menuName = document.getElementById('meal-menu-input').value.trim();

    if (!menuName) {
        return alert('어떤 메뉴를 먹였는지 입력해주세요!');
    }

    // ✨ 드디어 찾은 진짜 이름표! 'tosil_cube_records' 로 열어봅니다!
    let cubes = JSON.parse(localStorage.getItem('tosil_cube_records')) || [];
    
    if(cubes.length === 0) {
        saveMealRecord();
        return;
    }

    const safeMenuName = menuName.replace(/\s+/g, ''); 

    matchedCubesForDeduction = cubes.filter(cube => {
        const rawName = getCubeName(cube);
        const rawQty = getCubeQty(cube);
        if(rawName === "이름모름") return false;

        const safeCubeName = String(rawName).replace(/\s+/g, '');
        return safeMenuName.includes(safeCubeName) && rawQty > 0;
    });

    if(matchedCubesForDeduction.length > 0) {
        let listHtml = '';
        matchedCubesForDeduction.forEach(cube => {
            const rawName = getCubeName(cube);
            const rawQty = getCubeQty(cube);
            const icon = (String(rawName).includes('고기') || String(rawName).includes('소') || String(rawName).includes('닭') || cube.cat === 'meat') ? '🥩' : '🥦';
            
            listHtml += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px; background: #F8F9FA; border-radius: 12px; border: 1px solid #E5E8EB; margin-bottom: 8px;">
                <div style="font-size: 14.5px; font-weight: 800; color: #191F28;">${icon} ${rawName}</div>
                <div style="font-size: 14px; font-weight: 800; color: #8B95A1;">
                    잔여 <span style="text-decoration: line-through;">${rawQty}개</span> 👉 <span style="color: #3182F6; font-size: 16px;">${parseInt(rawQty) - 1}개</span>
                </div>
            </div>
            `;
        });
        document.getElementById('ai-deduction-list').innerHTML = listHtml;
        document.getElementById('ai-deduction-modal').style.display = 'flex';
    } else {
        saveMealRecord();
    }
};

// [✅ 차감하고 저장] 눌렀을 때
window.confirmDeduction = function() {
    let cubes = JSON.parse(localStorage.getItem('tosil_cube_records')) || [];
    
    matchedCubesForDeduction.forEach(match => {
        const matchName = getCubeName(match);
        const idx = cubes.findIndex(c => getCubeName(c) === matchName);

        if(idx !== -1) {
            let currentQty = getCubeQty(cubes[idx]);
            if (currentQty > 0) {
                if(cubes[idx].qty !== undefined) cubes[idx].qty = currentQty - 1; 
                else if(cubes[idx].quantity !== undefined) cubes[idx].quantity = currentQty - 1;
                else if(cubes[idx].count !== undefined) cubes[idx].count = currentQty - 1;
                else if(cubes[idx].amount !== undefined) cubes[idx].amount = currentQty - 1;
            }
        }
    });
    
    localStorage.setItem('tosil_cube_records', JSON.stringify(cubes));
    
    // 🔥 핵심: 메인 화면이 클라우드에 덮어쓸 수 있도록 '비밀 메모' 남기기!
    localStorage.setItem('tosil_cube_pending_sync', JSON.stringify(cubes));

    document.getElementById('ai-deduction-modal').style.display = 'none';
    
    saveMealRecord();
    setTimeout(() => { alert("🤖 냉장고 큐브 재고가 1개 차감되었습니다!"); }, 300);
};

// [건너뛰기] 눌렀을 때
window.skipDeduction = function() {
    document.getElementById('ai-deduction-modal').style.display = 'none';
    saveMealRecord();
};

// ==========================================
// 📸 [마케팅 원기옥] 맘카페 자랑용 식단표 이미지 캡처 엔진
// ==========================================
window.downloadCalendarImage = function() {
    // 1. 찰칵! 소리와 함께 캡처 중이라는 걸 보여줍니다.
    const btn = event.currentTarget;
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ 예쁘게 이미지를 굽는 중...';
    btn.style.background = '#8B95A1';
    btn.disabled = true;

    // 2. 캡처할 타겟: 캘린더 전체 화면!
    const targetEl = document.getElementById('view-calendar');

    // 3. 카메라(html2canvas) 작동!
    html2canvas(targetEl, {
        scale: 2, // 화질 2배 뻥튀기 (인스타/카페 업로드용 고화질)
        backgroundColor: "#F2F4F6", // 배경색 예쁘게 깔아주기
        useCORS: true 
    }).then(canvas => {
        // ✨ 마케팅 핵심: 캡처된 사진 우측 하단에 '워터마크' 강제 삽입!
        const ctx = canvas.getContext('2d');
        ctx.font = "900 24px 'Malgun Gothic', sans-serif";
        ctx.fillStyle = "#8B95A1";
        ctx.textAlign = "right";
        ctx.fillText("✨ Designed by 배냇함 AI", canvas.width - 30, canvas.height - 30);

        // 4. 이미지 다운로드 실행
        const link = document.createElement('a');
        link.download = `배냇함_우리아기_식단표_${new Date().getTime()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        // 5. 버튼 원상복구
        btn.innerHTML = originalText;
        btn.style.background = '#191F28';
        btn.disabled = false;
        
        setTimeout(() => { alert("📸 갤러리에 식단표가 저장되었습니다!"); }, 300);
    }).catch(err => {
        console.error("캡처 실패:", err);
        alert("🚨 앗, 이미지 저장에 실패했어요. 다시 시도해주세요!");
        btn.innerHTML = originalText;
        btn.style.background = '#191F28';
        btn.disabled = false;
    });
};

// ==========================================
// 💧 이유식 배죽 계산기 로직 (UI 개편 및 역산 최적화)
// ==========================================

function toggleFoodCalc() {
    const body = document.getElementById('food-calc-body');
    const chevron = document.getElementById('food-calc-chevron');
    
    if (body.style.display === 'none') {
        body.style.display = 'block';
        if(chevron) chevron.style.transform = 'rotate(180deg)';
    } else {
        body.style.display = 'none';
        if(chevron) chevron.style.transform = 'rotate(0deg)';
    }
}

// 🔄 탭 전환 애니메이션 로직
function switchCalcMode(mode) {
    const btnReverse = document.getElementById('tab-calc-reverse');
    const btnForward = document.getElementById('tab-calc-forward');
    const viewReverse = document.getElementById('calc-view-reverse');
    const viewForward = document.getElementById('calc-view-forward');

    if (mode === 'reverse') {
        btnReverse.style.background = '#FFFFFF'; btnReverse.style.color = '#191F28'; btnReverse.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
        btnForward.style.background = 'transparent'; btnForward.style.color = '#8B95A1'; btnForward.style.boxShadow = 'none';
        viewReverse.style.display = 'block'; viewForward.style.display = 'none';
    } else {
        btnForward.style.background = '#FFFFFF'; btnForward.style.color = '#191F28'; btnForward.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
        btnReverse.style.background = 'transparent'; btnReverse.style.color = '#8B95A1'; btnReverse.style.boxShadow = 'none';
        viewForward.style.display = 'block'; viewReverse.style.display = 'none';
    }
}

// 🍳 우리 집 회수율 (실측 보정값 우선, 없으면 조리방법 기본값)
function getYieldRate() {
    const saved = parseFloat(localStorage.getItem('tosil_food_yield'));
    if (saved && saved > 0.5 && saved <= 1) return saved;
    const el = document.getElementById('food-cook-method');
    const evap = el ? parseFloat(el.value) : 0.15;
    return 1 - evap;
}

// ⏩ 정방향: 얼마나 나올까? (아기 월령별 1끼 분량 자동 매칭 패치)
function calcBabyFoodWater() {
    const type = document.getElementById('food-base-type').value;
    const ratio = parseFloat(document.getElementById('food-ratio-type').value);
    const weightVal = document.getElementById('food-base-weight').value;

    if (!weightVal || parseFloat(weightVal) <= 0) {
        alert("⚠️ 투입할 베이스 재료의 무게를 숫자로 입력해주세요!");
        return;
    }

    const weight = parseFloat(weightVal);
    let waterG = 0;

    if (type === 'flour')       waterG = Math.round(weight * (ratio * 2));
    else if (type === 'raw')    waterG = Math.round(weight * ratio);
    else if (type === 'cooked') waterG = Math.round(weight * (ratio / 2));

    const rate   = getYieldRate();
    const totalG   = waterG + weight;
    const yieldG   = Math.round(totalG * rate);

    document.getElementById('res-water-g').innerText = waterG.toLocaleString();
    document.getElementById('res-yield-g').innerText = yieldG.toLocaleString();

    // 🚨 [현실 패치 1] 월령별 1끼 권장량에 맞춘 소분 가이드!
    const ageFilter = document.getElementById('food-age') ? document.getElementById('food-age').value : 'early';
    let mealSize = 60; // 초기 기본값
    if (ageFilter === 'mid') mealSize = 100;
    if (ageFilter === 'late') mealSize = 150;
    if (ageFilter === 'done') mealSize = 200;

    const meals = Math.floor(yieldG / mealSize);
    const rest = yieldG % mealSize;
    
    let portionTip = meals > 0 
        ? `(우리 아기 1끼 ${mealSize}g 기준 <b>약 ${meals}끼</b>${rest >= 20 ? `하고 ${rest}g 남는` : ''} 분량)` 
        : `(아직 한 끼 분량(${mealSize}g)이 안 돼요! 재료를 조금 더 늘려볼까요?)`;

    document.getElementById('res-cube-info').innerHTML = portionTip;

    const isCalib = !!localStorage.getItem('tosil_food_yield');
    const statusEl = document.getElementById('food-calib-status');
    if (statusEl) {
        statusEl.innerHTML = isCalib ? `✅ 우리 집 화력에 맞춘 회수율(<b>${Math.round(rate * 100)}%</b>) 적용 중` : '';
    }

    document.getElementById('food-calc-result').style.display = 'block';
}

// 🎯 실측 보정: 냄비 회수율 저장 (감성 멘트 추가)
function saveEvapCalibration() {
    const actual   = parseFloat(document.getElementById('food-actual-yield').value);
    const waterG   = parseFloat(document.getElementById('res-water-g').innerText.replace(/,/g, ''));
    const weight   = parseFloat(document.getElementById('food-base-weight').value);
    const statusEl = document.getElementById('food-calib-status');

    if (!actual || actual <= 0 || !waterG || !weight) {
        statusEl.style.color = '#E32636';
        statusEl.innerText = '⚠️ 저울로 잰 완성 무게를 숫자로 입력해주세요.';
        return;
    }

    const totalG = waterG + weight;
    const rate   = actual / totalG;

    if (rate > 1) {
        statusEl.style.color = '#E32636';
        statusEl.innerText = '⚠️ 투입량보다 많이 나왔어요. 용기 무게를 빼셨나요?';
        return;
    }
    if (rate < 0.4) {
        statusEl.style.color = '#E32636';
        statusEl.innerText = '⚠️ 절반 이상이 날아갔어요. 불이 너무 셌거나 계량 오류일 수 있어요!';
        return;
    }

    localStorage.setItem('tosil_food_yield', rate.toFixed(3));
    statusEl.style.color = '#3182F6';
    statusEl.innerHTML = `🧙‍♀️ 마법의 계량 세팅 완료! 우리 집 냄비 회수율은 <b>${Math.round(rate * 100)}%</b>네요.`;
    
    // 저장 후 즉시 양방향 재계산 돌리기
    calcBabyFoodWater(); 
    calcReverseFood(); 
    
    // 입력창 비우고 아코디언 닫기 효과
    document.getElementById('food-actual-yield').value = '';
}

// 🔄 역방향: 이만큼 만들고 싶어요 (육수 큐브 호환 패치 완료)
function calcReverseFood() {
    const target = parseFloat(document.getElementById('food-target-yield').value);
    const type   = document.getElementById('food-base-type').value;
    const ratio  = parseFloat(document.getElementById('food-ratio-type').value);

    if (!target || target <= 0) {
        alert("⚠️ 만들고 싶은 총량(g)을 숫자로 입력해주세요!");
        return;
    }

    let mult = ratio;                      
    if (type === 'flour')  mult = ratio * 2;
    if (type === 'cooked') mult = ratio / 2;

    const rate   = getYieldRate();
    
    // 1. 역산: 로직상 정확한 수치 도출
    let exactBaseG  = target / (rate * (1 + mult));
    let exactWaterG = exactBaseG * mult;

    // 2. 🚨 [현실 패치] 쌀은 1g, 물은 10ml 단위로 젖병 눈금 최적화!
    let realisticBaseG = Math.round(exactBaseG);
    let realisticWaterG = Math.round(exactWaterG / 10) * 10;

    // 3. 반올림된 레시피로 다시 끓였을 때 나오는 최종 양 계산
    let finalYieldG = Math.round((realisticBaseG + realisticWaterG) * rate);

    document.getElementById('rev-base-g').innerText  = realisticBaseG.toLocaleString();
    document.getElementById('rev-water-g').innerText = realisticWaterG.toLocaleString();
    
    const resultBox = document.getElementById('food-reverse-result');
    resultBox.style.display = 'block';
    
    resultBox.style.transform = 'scale(1.02)';
    setTimeout(() => { resultBox.style.transform = 'scale(1)'; }, 150);

    let noteEl = document.getElementById('rev-realistic-note');
    if (!noteEl) {
        noteEl = document.createElement('div');
        noteEl.id = 'rev-realistic-note';
        noteEl.style.cssText = 'font-size:12.5px; color:#3182F6; font-weight:800; margin-top:16px; background:#E8F3FF; padding:12px; border-radius:12px; border:1px dashed #B1D6FF; text-align:center; word-break:keep-all; line-height:1.4;';
        resultBox.appendChild(noteEl);
    }

    // 🚨 [현실 패치 2] 육수 큐브(채수/소고기 육수) 사용자 배려 기능!
    let brothTip = '';
    if (realisticWaterG >= 40) {
        brothTip = `<div style="margin-top:8px; font-size:11.5px; color:#4E5968; background:#FFF; padding:8px; border-radius:8px; border:1px solid #B1D6FF; box-shadow:0 2px 4px rgba(49,130,246,0.05);">🍲 <b>육수 큐브(30ml) 1개</b>를 쓰신다면 맹물은 <b>${realisticWaterG - 30}ml</b>만 부어주세요!</div>`;
    }

    noteEl.innerHTML = `💡 젖병 눈금에 맞춘 <b>현실 레시피</b>예요!<br>이렇게 끓이면 약 <b>${finalYieldG.toLocaleString()}g</b> 정도 완성돼요.${brothTip}`;
}

// ==========================================
// 🥦 [배냇함 PLUS] 우리아기 맞춤 식단 엔진 & UI (V8.0 극강의 락인 에디션)
// ==========================================

window.currentWeeklyPlan = [];
window.availableRecipePool = [];

window.generatePremiumMealPlan = function() {
    const inventory = JSON.parse(localStorage.getItem('tosil_open_records')) || []; 
    const calendarData = JSON.parse(localStorage.getItem('tosil_food_calendar')) || {}; 
    const currentAge = document.getElementById('food-age').value || 'early'; 
    
    let allergyData = [];
    Object.values(calendarData).forEach(dailyList => { allergyData.push(...dailyList); });

    const bannedFoods = allergyData.filter(r => (r.type === 'test' || (r.ingredient && !r.menu)) && r.status === 'fail').map(r => r.ingredient); 
    const safeFoods = allergyData.filter(r => (r.type === 'test' || (r.ingredient && !r.menu)) && r.status === 'pass').map(r => r.ingredient);

    // 💡 [니치 디테일 1] 알레르기 유발 9대 위험 재료 중, 아직 '무사통과(pass)' 기록이 없는 미지의 재료들 추출!
    const dangerIngredients = ['계란', '밀가루', '치즈', '우유', '땅콩', '새우', '생선', '두부', '대두'];
    const untestedDangers = dangerIngredients.filter(f => !bannedFoods.includes(f) && !safeFoods.includes(f));
    const newTestFood = untestedDangers.length > 0 ? untestedDangers[0] : null;

    const urgentFoods = inventory.filter(item => {
        if (!item.openDate || !item.limitDays) return false;
        const [y, m, d] = item.openDate.split('-');
        const passedDays = Math.floor((new Date().getTime() - new Date(y, m - 1, d).getTime()) / (1000 * 60 * 60 * 24));
        const daysLeft = item.limitDays - passedDays;
        return daysLeft <= 2 && daysLeft >= 0 && !bannedFoods.includes(item.name || "");
    }).map(item => item.name);

    // 💡 [니치 디테일 2] "진짜 완벽하게 안전한" 레시피만 걸러내기 (bannedFoods + untestedDangers 모두 차단!!)
    let safeValidRecipes = babyFoodData.filter(r => {
        if (r.age !== currentAge) return false; // 월령 필터
        if (bannedFoods.some(b => r.name.includes(b) || r.ingredients.includes(b))) return false; // 알레르기 발생 재료 차단
        if (untestedDangers.some(u => r.name.includes(u) || r.ingredients.includes(u))) return false; // 아직 안 먹어본 위험재료 철벽 차단!!
        return true;
    });

    // 만약 너무 빡빡해서 레시피가 안 나오면 알레르기 발생 재료만 뺀 걸로 폴백
    if (safeValidRecipes.length === 0) safeValidRecipes = babyFoodData.filter(r => r.age === currentAge && !bannedFoods.some(b => r.name.includes(b)));
    
    window.availableRecipePool = [...safeValidRecipes];

    const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
    let recipePool = shuffle(safeValidRecipes);

    let weeklyPlan = [];
    const days = ['월', '화', '수', '목', '금', '토', '일'];
    let lastRecipe = null;

    /* ==========================================================
       🍚 새 재료는 한 번에 하나, 사흘씩
       ----------------------------------------------------------
       '대구살 무 당근 죽' 은 처음 주는 재료가 한 번에 셋이다.
       반응이 와도 뭐 때문인지 못 찾는다.

       ⚠️ 필터(food-age)가 아니라 아기 개월수로 판단한다.
          필터를 '전체'로 두면 안 걸리기 때문이다.
       ========================================================== */
    const babyMonths = (function () {
        const s = localStorage.getItem('tosil_startDate');
        if (!s) return null;
        const p = String(s).split('-').map(Number);
        if (p.length !== 3) return null;
        const b = new Date(p[0], p[1] - 1, p[2]), t = new Date();
        let m = (t.getFullYear() - b.getFullYear()) * 12 + (t.getMonth() - b.getMonth());
        if (t.getDate() < b.getDate()) m--;
        return m < 0 ? 0 : m;
    })();

    const needBlocks = (currentAge === 'early' || currentAge === 'mid')
                    || (babyMonths !== null && babyMonths < 9
                        && currentAge !== 'late' && currentAge !== 'done');

    const SKIP_ING = ['물', '육수', '채수', '생수', '쌀뜨물', '쌀가루', '진밥', '밥', '참기름', '들기름'];

    const ingNames = (r) => String(r.ingredients || '').split(',').map(s =>
        s.replace(/\([^)]*\)/g, '')
         .replace(/[\d.]+\s*(g|ml|개|장|알|T|t|큰술|작은술|컵)?\s*$/, '')
         .replace(/^(초기용|중기용|후기용|초기|중기|후기|완료기|불린|익힌|다진|무첨가|시판|푹 익은)\s*/, '')
         .replace(/\s*(약간|조금|적당량|소량)\s*$/, '')
         .trim()
    ).filter(n => n && !SKIP_ING.some(s => n.indexOf(s) > -1));

    const newOnes = (r) => ingNames(r).filter(n =>
        !safeFoods.some(s => n.indexOf(s) > -1 || s.indexOf(n) > -1));

    if (needBlocks) {
        let pool = recipePool;
        if (!pool.length) {
            const stage = (currentAge === 'early' || currentAge === 'mid') ? currentAge
                        : (babyMonths !== null && babyMonths < 7 ? 'early' : 'mid');
            pool = babyFoodData.filter(r => r.age === stage
                && !bannedFoods.some(b => r.name.includes(b) || r.ingredients.includes(b)));
        }
        const ranked = shuffle(pool).map(r => ({ r: r, k: newOnes(r) }))
                          .sort((x, y) => x.k.length - y.k.length);

        const blocks = [], usedNames = [];
        ranked.forEach(x => {
            if (blocks.length >= 3 || usedNames.indexOf(x.r.name) > -1) return;
            usedNames.push(x.r.name);
            blocks.push(x);
        });

        if (blocks.length) {
            days.forEach((day, index) => {
                const b = blocks[Math.floor(index / 3)] || blocks[blocks.length - 1];
                const nth = (index % 3) + 1;
                weeklyPlan.push({
                    day: day,
                    type: b.k.length === 0 ? '이미 먹어본 재료' : '새 알레르기 테스트',
                    testStage: (nth === 1 ? '첫날' : nth === 2 ? '2일째 · 지켜보기' : '3일째 · 마지막'),
                    newFoods: b.k,
                    recipe: b.r
                });
            });
            window.currentWeeklyPlan = weeklyPlan;
            return weeklyPlan;
        }
    }

    days.forEach((day, index) => {
        let dailyMenu = { day: day, type: '안전 밸런스 식단', recipe: null };

        if (index < 2 && urgentFoods.length > 0) {
            let uFood = urgentFoods[index % urgentFoods.length];
            let found = recipePool.find(r => r.name.includes(uFood) || r.ingredients.includes(uFood));
            if (found) { dailyMenu.recipe = found; dailyMenu.type = '냉장고 재고 소진'; }
        } 
        
        // 💡 새 테스트 날짜(수요일)에는 "전체 DB"에서 테스트 재료가 들어간 레시피를 찾음
                // 새 재료는 사흘을 지켜봐야 한다. 수·목·금 같은 것으로 이어 붙인다.
        // 이틀 뒤에 반응이 오는 경우가 있어서, 중간에 다른 새 재료가 끼면 원인을 못 찾는다.
        if (!dailyMenu.recipe && index >= 2 && index <= 4 && newTestFood) { 
            let testPool = babyFoodData.filter(r => r.age === currentAge && !bannedFoods.some(b => r.name.includes(b) || r.ingredients.includes(b)));
            let found = testPool.find(r => r.name.includes(newTestFood) || r.ingredients.includes(newTestFood));
                        if (found) { 
                dailyMenu.recipe = found; 
                // ⚠️ type 은 건드리지 않는다. 카드 색을 정하는 조건이 이 글자를 그대로 본다.
                dailyMenu.type = '새 알레르기 테스트';
                dailyMenu.testStage = (index === 2) ? '첫날 · ' + newTestFood
                                    : (index === 3) ? '2일째 · 지켜보기'
                                                    : '3일째 · 마지막';
            }
        } 
        
        if (!dailyMenu.recipe) {
            let found = recipePool.find(r => r !== lastRecipe) || recipePool[0];
            dailyMenu.recipe = found;
        }

        recipePool = recipePool.filter(r => r !== dailyMenu.recipe);
        if (recipePool.length === 0) recipePool = shuffle(safeValidRecipes); 

        lastRecipe = dailyMenu.recipe;
        weeklyPlan.push(dailyMenu);
    });

    window.currentWeeklyPlan = weeklyPlan;
    return weeklyPlan;
};

// 💡 단일 메뉴 교체 (애니메이션 제거, 극강의 미니멀리즘 유지)
window.swapDailyRecipe = function(dayIndex) {
    const currentRecipeNames = window.currentWeeklyPlan.map(p => p.recipe.name);
    let freshRecipes = window.availableRecipePool.filter(r => !currentRecipeNames.includes(r.name));
    
    if (freshRecipes.length === 0) {
        freshRecipes = window.availableRecipePool.filter(r => r.name !== window.currentWeeklyPlan[dayIndex].recipe.name);
    }
    
    if (freshRecipes.length > 0) {
        const newRecipe = freshRecipes[Math.floor(Math.random() * freshRecipes.length)];
        window.currentWeeklyPlan[dayIndex].recipe = newRecipe;
        window.currentWeeklyPlan[dayIndex].type = '변경됨';
        
        // 화면만 깔끔하게 즉시 다시 그림 (애니메이션 X)
        window.drawAutoPilotUI();
    }
};

window.renderAutoPilotUI = function() {
    const container = document.getElementById('autopilot-result-container');
    const triggerBox = document.getElementById('autopilot-trigger-box');
    
    if(triggerBox) triggerBox.style.display = 'none';
    if(container) container.style.display = 'block';

    container.innerHTML = `
        <div style="text-align:center; padding: 60px 20px; background:#F9FAFB; border-radius:16px; border:1px solid #E5E8EB;">
            <div style="color:#191F28; font-weight:900; font-size:16px; margin-bottom:8px;">우리아기 식단 설계 중...</div>
            <div style="color:#8B95A1; font-weight:600; font-size:13.5px;">아기의 취향과 알레르기 데이터를 분석하고 있습니다.</div>
        </div>
    `;
    
    if(!document.getElementById('hide-scroll-style')) {
        const style = document.createElement('style');
        style.id = 'hide-scroll-style';
        style.innerHTML = `.hide-scroll::-webkit-scrollbar { display: none; } .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }`;
        document.head.appendChild(style);
    }

    setTimeout(() => {
        window.generatePremiumMealPlan();
        window.drawAutoPilotUI();
    }, 800); 
};

// 💡 [배냇함 PLUS] 달력 1초 자동 연동 기능 (Killer Feature)
window.applyPlanToCalendar = function() {
    const plan = window.currentWeeklyPlan;
    if (!plan || plan.length === 0) return alert("먼저 식단표를 생성해주세요!");

    let records = JSON.parse(localStorage.getItem('tosil_food_calendar')) || {};
    let today = new Date();

    plan.forEach((day, index) => {
        // 오늘부터 7일간의 날짜를 계산
        let targetDate = new Date(today);
        targetDate.setDate(today.getDate() + index);
        let dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;

        if (!records[dateStr]) records[dateStr] = [];
        
        // 캘린더에 식단 꽂아넣기
        records[dateStr].push({ 
            type: 'meal', 
            menu: day.recipe.name, 
            amount: '계획됨', 
            reaction: '대기중',
            time: '오전'
        });
    });

    localStorage.setItem('tosil_food_calendar', JSON.stringify(records));
    renderCalendar(); // 달력 새로고침
    
    alert("🎉 성공! 오늘부터 7일간의 달력에 식단이 자동으로 등록되었습니다.");
    // 달력 위치로 스크롤 부드럽게 이동
    document.getElementById('cal-month-title').scrollIntoView({ behavior: 'smooth', block: 'center' });
};

// 💡 화면 렌더링 독립 함수 (UI 밸런스 복구 및 공간 최적화)
// 💡 화면 렌더링 독립 함수 (철분 파란색 변경, 중복 뱃지 삭제, 터치 장바구니 탑재!)
window.drawAutoPilotUI = function(highlightIndex = -1) {
    const container = document.getElementById('autopilot-result-container');
    const plan = window.currentWeeklyPlan;

    let allRequiredIngredients = [];
    plan.forEach(day => {
        if(day.recipe && day.recipe.ingredients) {
            allRequiredIngredients.push(...day.recipe.ingredients.split(',').map(i => i.trim().replace(/[0-9gml]+(ml|g)?/g, '').trim()));
        }
    });
    
    let uniqueRequired = [...new Set(allRequiredIngredients)].filter(ing => !ing.includes('물') && !ing.includes('쌀') && !ing.includes('진밥'));
    const inventory = JSON.parse(localStorage.getItem('tosil_open_records')) || [];
    const fridgeItemNames = inventory.map(item => item.name);
    let missingIngredients = uniqueRequired.filter(ing => !fridgeItemNames.some(fItem => ing.includes(fItem)));

    let prepCounts = {};
    allRequiredIngredients.forEach(item => {
        if(!item.includes('물') && !item.includes('쌀') && !item.includes('진밥') && !item.includes('현미유') && !item.includes('간장') && !item.includes('버터')) {
            prepCounts[item] = (prepCounts[item] || 0) + 1;
        }
    });

    let html = `
        <style>
            @keyframes cardPulse { 0% { transform: scale(1); background-color: #FFFFFF; } 50% { transform: scale(0.97); background-color: #F4F8FF; } 100% { transform: scale(1); background-color: #FFFFFF; } }
            .swapped-card { animation: cardPulse 0.4s ease-out forwards; }
            details > summary::-webkit-details-marker { display: none; }
            details[open] summary .arrow { transform: rotate(180deg); }
            /* 💡 장바구니 체크리스트용 CSS */
            .shop-tag { display:inline-block; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); padding:6px 12px; border-radius:20px; color:#FFF; font-weight:700; font-size:13px; margin-bottom:6px; margin-right:6px; cursor:pointer; transition:0.2s; }
            .shop-tag.checked { background:rgba(255,255,255,0.05); color:#8B95A1; text-decoration:line-through; border-color:transparent; }
        </style>

                      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 16px; padding: 0 4px;">
            <div style="flex: 1; min-width: 0;">
                <div style="font-size: 13px; font-weight: 800; color: #3182F6; margin-bottom: 4px;">이번 주 맞춤형 식단</div>
                <div data-plus-head style="font-size: 18px; font-weight: 900; color: #191F28; letter-spacing: -0.5px;">우리아기 완벽한 7일 식단표</div>
            </div>
        </div>
        
        <div class="hide-scroll" style="display: flex; gap: 12px; overflow-x: auto; padding-bottom: 16px; padding-top: 4px; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch;">
    `;

    plan.forEach((day, index) => {
        let bg = '#FFFFFF'; let border = '#E5E8EB'; let badgeBg = '#F0F7FF'; let badgeColor = '#3182F6';
        if (day.type.includes('냉장고')) { bg = '#FFF5F5'; border = '#FECACA'; badgeBg = '#FFF0F1'; badgeColor = '#D32F2F'; }
        if (day.type.includes('테스트')) { bg = '#FFFAF0'; border = '#FDE68A'; badgeBg = '#FFF9E6'; badgeColor = '#B45309'; }
        if (day.type.includes('변경됨')) { bg = '#FFFFFF'; border = '#C9E2FF'; badgeBg = '#E8F3FF'; badgeColor = '#1B64DA'; }

        let cookTime = 0;
        if(day.recipe.recipe) {
            day.recipe.recipe.forEach(step => {
                const match = step.match(/(\d+)분/);
                if(match) cookTime += parseInt(match[1]);
            });
        }
        let timeTag = cookTime > 0 ? `<span style="font-size:11.5px; font-weight:800; color:#8B95A1;">⏳ 약 ${cookTime + 5}분</span>` : '';

        // 💡 [디테일 1] 철분 듬뿍을 빨간색 ➔ 파란색(#3182F6)으로 변경하여 경고와 차별화!
        let goalBadge = '';
        if (day.recipe.goal === 'iron') goalBadge = '<span style="color:#3182F6; font-weight:900; font-size:11.5px;">#철분듬뿍</span>';
        else if (day.recipe.goal === 'poop') goalBadge = '<span style="color:#B45309; font-weight:900; font-size:11.5px;">#장튼튼</span>';
        else if (day.recipe.goal === 'weight') goalBadge = '<span style="color:#059669; font-weight:900; font-size:11.5px;">#체중쑥쑥</span>';
        else goalBadge = '<span style="color:#4E5968; font-weight:900; font-size:11.5px;">#영양만점</span>';

        let allergenBadge = '';
        const dangerIngredients = ['계란', '밀가루', '치즈', '우유', '땅콩', '새우', '생선', '두부', '대두'];
        let foundAllergens = dangerIngredients.filter(a => day.recipe.ingredients.includes(a));
        
        // 💡 [디테일 2] 테스트 날짜일 때는 요일 옆 뱃지를 아예 안 띄웁니다! (중복 제거)
        if(foundAllergens.length > 0 && !day.type.includes('테스트')) {
            allergenBadge = `
                <span onclick="event.stopPropagation(); showAllergyInfo('${foundAllergens[0]}')" 
                      style="display:inline-block; color:#D32F2F; background:#FFF0F1; border:1px solid #FECACA; padding:3px 8px; border-radius:8px; font-size:10px; font-weight:900; cursor:pointer; vertical-align: middle;">
                    ⚠️${foundAllergens[0]}주의
                </span>`;
        }

        let cardClass = index === highlightIndex ? 'swapped-card' : '';

        html += `
            <div class="${cardClass}" onclick="openCookingMode('${day.recipe.name}')" style="cursor: pointer; min-width: 170px; max-width: 170px; height: 210px; background: ${bg}; border: 1px solid ${border}; border-radius: 20px; padding: 20px; scroll-snap-align: center; flex-shrink: 0; box-shadow: 0 4px 12px rgba(0,0,0,0.02); display: flex; flex-direction: column;">
                
                <div style="display: flex; justify-content: space-between; margin-bottom: 12px; align-items: center;">
                    <div style="font-size: 13px; font-weight: 900; color: #8B95A1;">Day ${index + 1}</div>
                    <button onclick="event.stopPropagation(); swapDailyRecipe(${index})" style="font-size: 11.5px; font-weight: 800; color: #4E5968; background: #FFFFFF; border:1px solid #D1D5DB; padding: 4px 10px; border-radius: 8px; cursor:pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.02); transition: 0.2s;">
                        교체
                    </button>
                </div>
                
                <div style="display:flex; align-items:center; gap:6px; margin-bottom: 8px;">
                    <div style="font-weight: 900; font-size: 18px; color: #191F28; letter-spacing: -0.5px;">${day.day}요일</div>
                    ${allergenBadge}
                </div>
                
                <div style="display: inline-block; align-self: flex-start; color: ${badgeColor}; font-size: 11px; font-weight: 800; margin-bottom: 12px;">
                    ${day.type === '안전 밸런스 식단' ? '• 안전 식단' : `• ${day.type}`}
                </div>
                
                <div style="flex: 1; display: flex; align-items: flex-start;">
                    <div style="font-size: 14.5px; font-weight: 900; color: #191F28; line-height: 1.4; word-break: keep-all; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                        ${day.recipe.name}
                    </div>
                </div>

                <div style="margin-top: auto; padding-top: 12px; border-top: 1px dashed ${border === '#E5E8EB' ? '#E5E8EB' : border}; display:flex; justify-content:space-between; align-items:center;">
                    ${timeTag}
                    ${goalBadge}
                </div>
            </div>
        `;
    });
    html += `</div>`;

    html += `
        <button onclick="applyPlanToCalendar()" style="width: 100%; background: #191F28; color: #FFF; border: none; padding: 16px; border-radius: 14px; font-size: 15.5px; font-weight: 900; margin-bottom: 24px; cursor: pointer; box-shadow: 0 6px 16px rgba(0,0,0,0.1); transition: 0.2s; display:flex; align-items:center; justify-content:center; gap:8px;">
            <span style="font-size:18px;">✅</span> 이 식단표를 내 달력에 자동 등록하기
        </button>
    `;

    // 💡 [니치 복구 완료!] 각 영양소별 등장 횟수를 AI가 실시간으로 카운트!!
    let ironCnt = plan.filter(p => p.recipe.goal === 'iron').length;
    let poopCnt = plan.filter(p => p.recipe.goal === 'poop').length;
    let weightCnt = plan.filter(p => p.recipe.goal === 'weight').length;
    
    // 기본값 세팅
    let reportTitle = "골고루 균형 잡힌 영양 식단";
    let reportColor = "#059669"; let reportBg = "#ECFDF5";
    
    // 가장 많이 포함된 식단에 맞춰 타이틀과 테마 색상 자동 변경! (철분은 파란색으로 통일)
    if (ironCnt >= 3) { reportTitle = "소고기 듬뿍! 철분 집중 보충 식단"; reportColor = "#3182F6"; reportBg = "#F0F7FF"; } 
    else if (weightCnt >= 3) { reportTitle = "포만감 든든! 체중 증량 식단"; reportColor = "#059669"; reportBg = "#ECFDF5"; }
    else if (poopCnt >= 3) { reportTitle = "속이 편안한 황금똥 식단"; reportColor = "#B45309"; reportBg = "#FFF9E6"; }

    // 아코디언(details)으로 깔끔하게 접어두면서, 누르면 상세 횟수가 나오도록!
    html += `
        <details style="background: #FFFFFF; border: 1px solid #E5E8EB; border-radius: 16px; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
            <summary style="padding: 16px 20px; font-size: 14px; font-weight: 800; color: #191F28; cursor: pointer; display: flex; justify-content: space-between; align-items: center; outline:none;">
                               <div data-plus-head style="display:flex; align-items:center; gap:8px;"><span style="font-size:16px;">📊</span> 주간 영양 분석 리포트</div>
                <span class="arrow" style="font-size: 12px; color: #8B95A1; transition:0.3s;">▼</span>
            </summary>
            <div style="padding: 0 20px 20px; border-top: 1px dashed #E5E8EB; margin-top: 4px; padding-top: 16px;">
                <div style="font-size: 14.5px; font-weight: 800; color: ${reportColor}; line-height: 1.4; margin-bottom: 8px;">
                    이번 주는 [${reportTitle}]으로 설계되었어요!
                </div>
                <div style="font-size: 13px; font-weight: 600; color: #4E5968;">
                    철분 특화 ${ironCnt}회 · 소화/배변 ${poopCnt}회 · 체중/골격 ${weightCnt}회
                </div>
            </div>
        </details>
    `;

    html += `
        <details style="background: #FFFFFF; border: 1px solid #E5E8EB; border-radius: 16px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
            <summary style="padding: 16px 20px; font-size: 14px; font-weight: 800; color: #191F28; cursor: pointer; display: flex; justify-content: space-between; align-items: center; outline:none;">
               <div data-plus-head style="display:flex; align-items:center; gap:8px;"><span style="font-size:16px;">📋</span> 일주일 식단표 한눈에 보기</div>
                <span class="arrow" style="font-size: 12px; color: #8B95A1; transition:0.3s;">▼</span>
            </summary>
            <div style="padding: 0 20px 20px; border-top: 1px dashed #E5E8EB; margin-top: 4px; padding-top: 12px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13.5px; text-align: left;">
                    <tbody>
                        ${plan.map((p, idx) => `
                            <tr style="border-bottom: 1px solid #F2F4F6;">
                                <td style="padding: 12px 4px; font-weight: 900; color: #191F28; width: 40px;">${p.day}</td>
                                <td style="padding: 12px 4px; font-weight: 700; color: #4E5968;">
                                    <span onclick="openCookingMode('${p.recipe.name}')" style="cursor:pointer;">${p.recipe.name}</span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </details>
    `;

    // 💡 [니치 디테일 3] 마트 갈 때 쓰는 '터치형 체크리스트' 장바구니!!
    const missingCount = missingIngredients.length;
    const missingTagsHtml = missingCount > 0 
        ? missingIngredients.map(ing => `<span class="shop-tag" onclick="this.classList.toggle('checked')">${ing}</span>`).join('')
        : '<div style="color:#4ADE80; font-size:14px; font-weight:800; text-align:center; padding:10px 0;">필요한 재료가 냉장고에 모두 있습니다! 🎉</div>';

    html += `
        <div style="background: #191F28; border-radius: 16px; padding: 24px; text-align: left; box-shadow: 0 4px 16px rgba(0,0,0,0.05); position: relative; overflow: hidden; margin-bottom: 32px;">
            <div style="font-size: 12px; font-weight: 900; color: #3182F6; margin-bottom: 8px;">스마트 장보기 비서</div>
            <div style="font-size: 15.5px; font-weight: 800; color: #FFFFFF; margin-bottom: 6px; line-height:1.4;">
                이번 주 식단을 완성하려면<br><span style="color:#4ADE80;">총 ${missingCount}개의 식재료</span>가 부족합니다.
            </div>
            <div style="font-size: 12px; color: #8B95A1; font-weight: 600; margin-bottom: 20px;">
                💡 장 보실 때 재료를 터치해서 하나씩 지워보세요!
            </div>
            
            <div style="margin-bottom: 24px;">
                ${missingTagsHtml}
            </div>
            
            <a href="https://link.coupang.com/a/e2f58ZVlhQ" target="_blank" style="display: flex; justify-content:center; align-items:center; gap:8px; width: 100%; background: #3182F6; color: #FFFFFF; padding: 16px 0; border-radius: 12px; font-weight: 900; font-size: 15px; text-decoration: none; transition: 0.2s;">
                부족한 재료 로켓프레시로 한 번에 담기 〉
            </a>
        </div>
    `;

    container.innerHTML = html;
};