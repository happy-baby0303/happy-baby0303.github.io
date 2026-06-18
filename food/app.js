// ==========================================
// 🩺 육아메이트 안심 이유식 AI 엔진 V3.0 (food/app.js)
// (메인 글로벌 연동 + 찜 보관함 + 크로스셀링 통합)
// ==========================================

let isFavViewMode = false;

// 🚀 [NEW 1] 글로벌 데이터 자동 동기화
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

    // 👶 이유식 월령 매핑 로직
    let ageFilter = '';
    let ageText = '';
    
    if (months < 4) {
        ageFilter = 'early'; ageText = '이유식 준비기(초기)'; // 아직 시기가 안됐지만 미리보기로 초기 세팅
    } else if (months >= 4 && months <= 6) {
        ageFilter = 'early'; ageText = '이유식 초기(4~6개월)';
    } else if (months >= 7 && months <= 9) {
        ageFilter = 'mid'; ageText = '이유식 중기(7~9개월)';
    } else if (months >= 10 && months <= 11) {
        ageFilter = 'late'; ageText = '이유식 후기(10~11개월)';
    } else {
        ageFilter = 'done'; ageText = '이유식 완료기(12개월 이상)';
    }

    const foodAge = document.getElementById('food-age');
    if(foodAge) foodAge.value = ageFilter;

    const banner = document.getElementById('auto-sync-banner');
    if(banner) {
        banner.style.display = 'flex';
        banner.innerHTML = `<span style="font-size:18px; margin-right:8px;">✨</span> <div><b>${babyName}</b> 아기(생후 ${months}개월)의 월령에 맞춰 AI가 <b>${ageText}</b> 식단으로 세팅했어요!</div>`;
    }
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


// 🚦 기존 기능 1: 식재료 신호등 검색기
function checkIngredient() {
    const input = document.getElementById('ingredient-search').value.trim();
    const resultBox = document.getElementById('traffic-light-result');
    
    if (!input) { resultBox.style.display = 'none'; return; }

    const foundItems = ingredientDB.filter(item => 
        item.name.includes(input) || 
        input.includes(item.name) ||
        (item.keywords && item.keywords.some(kw => kw.includes(input) || input.includes(kw)))
    );

    resultBox.style.display = 'block';
    if (foundItems.length > 0) {
        resultBox.innerHTML = foundItems.map(found => {
            let colorHex = found.status === 'red' ? '#E32636' : (found.status === 'yellow' ? '#F59E0B' : '#10B981');
            let icon = found.status === 'red' ? '🚨 절대 금지' : (found.status === 'yellow' ? '⚠️ 주의 요망' : '🟢 안심 급여');
            
            return `
                <div style="border-left: 4px solid ${colorHex}; background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 8px;">
                    <div style="font-weight: 800; color: ${colorHex}; margin-bottom: 6px;">${icon} : ${found.name}</div>
                    <div style="font-size: 14px; color: #4E5968;">${found.desc}</div>
                </div>
            `;
        }).join('');
    } else {
        resultBox.innerHTML = `<div style="padding: 16px; color: #8B95A1; font-size:14px;">검색 결과가 없습니다. 소량 테스트 후 급여해 보세요.</div>`;
    }
}

// 🌟 공통 카드 렌더링 함수 (찜 기능 & 크로스셀링 통합)
function generateCardHTML(item) {
    const itemId = item.name; // 이유식은 이름이 고유값
    const favorites = JSON.parse(localStorage.getItem('favFoods')) || [];
    const isFav = favorites.includes(itemId);
    const heartIcon = isFav ? '❤️ 찜 해제' : '🤍 찜하기';
    const heartColor = isFav ? '#FFF2F2' : '#F2F4F6';
    const heartText = isFav ? '#E32636' : '#4E5968';
    const heartBorder = isFav ? '#FCA5A5' : '#E5E8EB';

    return `
        <div class="stroller-card" style="border-top: 4px solid ${isFavViewMode ? '#E32636' : '#10B981'}; margin-bottom: 24px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 8px;">
                <div style="font-size: 18px; font-weight: 800; color: #191F28;">🍲 ${item.name}</div>
                
                <button id="fav-btn-${itemId}" onclick="toggleFavorite('${itemId}')" style="background:${heartColor}; color:${heartText}; border:1px solid ${heartBorder}; padding:6px 12px; border-radius:8px; font-weight:800; font-size:12px; cursor:pointer; transition:0.2s;">
                    ${heartIcon}
                </button>
            </div>
            <div style="font-size: 13.5px; color: #4E5968; margin-bottom: 16px; font-weight: 600;">💡 ${item.desc}</div>
            
            <div style="background: #F2F4F6; padding: 12px; border-radius: 8px; font-size: 13px; color: #333D4B; margin-bottom: 12px;">
                <b>👨‍🍳 입자:</b> ${item.texture}<br>
                <b style="color:#3182F6; display:inline-block; margin-top:6px;">🛒 필요 재료:</b> ${item.ingredients}
            </div>
            
            <div class="recipe-box" style="background: #FFF; border: 1px solid #E5E8EB; padding: 16px; border-radius: 8px; margin-bottom:16px;">
                <div style="font-weight: 800; font-size: 14px; margin-bottom: 8px;">조리 순서</div>
                <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #4E5968; line-height: 1.6;">
                    ${item.recipe.map(step => `<li>${step}</li>`).join('')}
                </ul>
            </div>

            <button onclick="shareToHusband('${item.name}', '${item.ingredients}')" style="width:100%; background:#FEE500; color:#191919; border:none; padding:14px; border-radius:12px; font-weight:800; font-size:15px; cursor:pointer; display:flex; justify-content:center; align-items:center; gap:8px; margin-bottom:8px;">
                <span style="font-size:18px;">💬</span> 남편에게 장보기 전송 (쿠팡)
            </button>

            <a href="../stroller/index.html" style="display:block; width:100%; background:#FFF; border:1px solid #10B981; color:#059669; padding:14px; border-radius:12px; font-weight:800; font-size:14px; text-align:center; text-decoration:none; transition:0.2s;">
                🛒 밥 잘 먹는 우리 아기, [산책용 유모차] 알아보기 ➔
            </a>
        </div>
    `;
}

// 🩺 기존 기능 2: 안심 이유식 매칭 엔진
function runFoodEngine() {
    if (isFavViewMode) return;

    const age = document.getElementById('food-age').value;
    const goal = document.getElementById('food-goal').value;
    const fridgeInput = document.getElementById('fridge-search').value.trim();
    const activeAllergies = Array.from(document.querySelectorAll('#allergy-filters .active')).map(btn => btn.getAttribute('data-allergy'));
    const resultArea = document.getElementById('food-result-area');

    if (!age) {
        resultArea.innerHTML = `<div class="premium-empty-state"><div class="empty-icon">🩺</div><div class="empty-text"><b>아기 월령을 선택해주세요.</b></div></div>`;
        return;
    }

    let filtered = babyFoodData.filter(item => {
        if (item.age !== age) return false;
        if (goal !== 'all' && item.goal !== goal) return false;
        
        const hasAllergy = activeAllergies.some(allergy => item.allergens.includes(allergy));
        if (hasAllergy) return false;
        
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
        let shuffled = filtered.sort(() => 0.5 - Math.random()); 
        let top3Results = shuffled.slice(0, 3); 
        let otherResults = shuffled.slice(3); 

        let htmlOutput = `<div style="font-size: 16px; font-weight: 800; color: #191F28; margin-bottom: 16px;">✨ 오늘의 AI 추천 식단 TOP ${top3Results.length}</div>`;
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

        resultArea.innerHTML = htmlOutput;
    }
}

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
    }
}

function toggleFoodFilter(btn) {
    btn.classList.toggle('active');
    runFoodEngine();
}

// 🚀 카카오 SDK 초기화 (food/app.js)
if (!Kakao.isInitialized()) {
    Kakao.init('68bca10ddfe2ec67112b07eb9a08da2b');
}

function shareToHusband(recipeName, ingredients) {
    let firstIngredient = ingredients.split(',')[0].replace(/[0-9].*$/, '').trim();
    const myCoupangLink = "https://link.coupang.com/a/eEtXJsuJxc"; 
    
    Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
            // 💡 1. 넉넉한 제목 영역에 메뉴 이름과 애교 멘트를 두 줄로 몰아넣습니다!
            title: `여보! 낼 맘마는 [${recipeName}]야 👶❤️\n퇴근길 픽업이나 로켓프레시 부탁해 🥰`,
            
            // 💡 2. 설명 영역은 오직 재료 리스트만 넣어서 절대 잘리지 않게 공간 확보!
            description: `🛒 필요 식재료:\n${ingredients}`, 
            
            imageUrl: 'https://happy-baby0303.github.io/baby-master/stroller/og-image.png',
            link: { mobileWebUrl: myCoupangLink, webUrl: myCoupangLink },
        },
        buttons: [
            // 💡 3. 버튼 1: 프레시 주문 버튼 (제일 급한 메인 재료)
            { title: `🚀 '${firstIngredient}' 로켓프레시 주문`, link: { mobileWebUrl: myCoupangLink, webUrl: myCoupangLink } },
            
            // 💡 4. (보너스) 버튼 2: 남편이 헷갈릴 때를 대비해 우리 웹사이트로 다시 돌아오는 버튼 추가!
            { title: `📝 전체 레시피/재료 다시 보기`, link: { mobileWebUrl: 'https://happy-baby0303.github.io/food/index.html', webUrl: 'https://happy-baby0303.github.io/food/index.html' } }
        ],
    });
}

// 🚀 페이지 로드 시 글로벌 동기화 후 엔진 실행
window.onload = () => { 
    applyGlobalBabyProfile();
    runFoodEngine(); 
};