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

// 🌟 공통 카드 렌더링 함수 (요리 모드 버튼 추가!)
function generateCardHTML(item) {
    const itemId = item.name;
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

            <!-- ✨ 요리 모드 시작 버튼 ✨ -->
            <button onclick="openCookingMode('${item.name}')" style="width:100%; background:#191F28; color:#FFFFFF; border:none; padding:16px; border-radius:12px; font-weight:900; font-size:15px; cursor:pointer; display:flex; justify-content:center; align-items:center; gap:8px; margin-bottom:16px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                <span style="font-size:20px;">👨‍🍳</span> 스마트 요리 모드 시작
            </button>
            
            <div class="recipe-box" style="background: #FFF; border: 1px solid #E5E8EB; padding: 16px; border-radius: 8px; margin-bottom:16px;">
                <div style="font-weight: 800; font-size: 14px; margin-bottom: 8px;">조리 순서 미리보기</div>
                <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #4E5968; line-height: 1.6;">
                    ${item.recipe.map(step => `<li>${step}</li>`).join('')}
                </ul>
            </div>

            <button onclick="shareToHusband('${item.name}', '${item.ingredients}')" style="width:100%; background:#FEE500; color:#191919; border:none; padding:14px; border-radius:12px; font-weight:800; font-size:15px; cursor:pointer; display:flex; justify-content:center; align-items:center; gap:8px; margin-bottom:8px;">
                <span style="font-size:18px;">💬</span> 남편에게 장보기 전송 (쿠팡)
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
        
        // 1. 알레르기 차단
        if (customAllergies.length > 0) {
            const hasCustomAllergy = customAllergies.some(customItem => 
                item.name.includes(customItem) || 
                item.ingredients.includes(customItem) ||
                (item.allergens && item.allergens.some(a => a.includes(customItem)))
            );
            if (hasCustomAllergy) return false;
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

// 🛒 남편 아바타 조종기 (파트너스 링크 자동 결합 버전)
function shareToHusband(recipeName, ingredients) {
    // 파트너님의 고유 파트너스 코드 (주신 링크에서 추출)
    const partnerCode = "e2f58ZVlhQ"; 
    
    const items = ingredients.split(',').map(i => i.trim());
    let shareText = `여보! 오늘 우리 아기 맘마는 [${recipeName}] 해줄 거야 👶❤️\n\n퇴근길에 장 좀 봐줘! 아래 링크 클릭하면 바로 살 수 있어!\n\n`;

    items.forEach(item => {
        const cleanName = item.replace(/[0-9]+(g|ml|T|t|개|장|마리|쪽|알|스푼|분|방울).*/g, '').replace(/\(.*\)/g, '').trim();
        
        if(cleanName) {
            // 핵심: 쿠팡 검색 결과 뒤에 파트너스 코드(?afag=...)를 붙여서 수익 링크로 변환!
            const baseUrl = `https://www.coupang.com/np/search?q=${encodeURIComponent('로켓프레시 ' + cleanName)}`;
            const partnerLink = `${baseUrl}&afag=${partnerCode}`; // 파트너스 추적 코드 결합
            
            shareText += `🛒 ${item}\n👉 ${partnerLink}\n\n`;
        }
    });

    shareText += `고마워 내사랑! 알라뷰 🥰`;

    if (navigator.share) {
        navigator.share({
            title: '여보 장보기 부탁해!',
            text: shareText
        }).catch(console.error);
    } else {
        navigator.clipboard.writeText(shareText).then(() => {
            alert("✅ 수익 생성용 쿠팡 링크가 복사되었습니다!\n남편 카톡에 붙여넣기 해주세요.");
        });
    }
}

// 🚀 페이지 로드 시 글로벌 동기화 후 엔진 실행
window.onload = () => { 
    applyGlobalBabyProfile();
    runFoodEngine(); 
};

// 🚀 [NEW 4] 이유식 탭 전환 로직 (식단 추천 vs 캘린더)
function switchFoodTab(tabName) {
    const btnCuration = document.getElementById('tab-btn-curation');
    const btnCalendar = document.getElementById('tab-btn-calendar');
    const viewCuration = document.getElementById('view-curation');
    const viewCalendar = document.getElementById('view-calendar');

    if (tabName === 'curation') {
        btnCuration.style.background = '#FFFFFF';
        btnCuration.style.color = '#191F28';
        btnCuration.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
        btnCalendar.style.background = 'transparent';
        btnCalendar.style.color = '#8B95A1';
        btnCalendar.style.boxShadow = 'none';

        viewCuration.style.display = 'block';
        viewCalendar.style.display = 'none';
    } else {
        btnCalendar.style.background = '#FFFFFF';
        btnCalendar.style.color = '#191F28';
        btnCalendar.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
        btnCuration.style.background = 'transparent';
        btnCuration.style.color = '#8B95A1';
        btnCuration.style.boxShadow = 'none';

        viewCalendar.style.display = 'block';
        viewCuration.style.display = 'none';
    }
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
                dotsHtml += `<div class="cal-dot ${r.status}"></div>`;
                if(r.status === 'pass') monthPass++;
                else monthFail++;
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
    const [y, m, d] = selectedDateStr.split('-');
    const titleEl = document.getElementById('cal-selected-date-text');
    if(titleEl) titleEl.innerText = `${parseInt(m)}월 ${parseInt(d)}일 식재료 기록`;
    
    const records = JSON.parse(localStorage.getItem('tosil_food_calendar')) || {};
    const dailyRecords = records[selectedDateStr] || [];
    const listArea = document.getElementById('cal-record-list');
    if(!listArea) return;
    
    if (dailyRecords.length === 0) {
        listArea.innerHTML = `<div style="text-align: center; color: #8B95A1; font-size: 13.5px; padding: 30px 0; background: #FFF; border-radius: 14px; border: 1px dashed #D1D5DB;">아직 기록된 식재료가 없어요.<br>위의 [+ 재료 테스트]를 눌러 추가해보세요!</div>`;
        return;
    }
    
    listArea.innerHTML = dailyRecords.map((r, index) => {
        const emoji = getFoodEmoji(r.ingredient);
        return `
        <div style="display: flex; justify-content: space-between; align-items: center; background: #FFF; padding: 16px; border-radius: 16px; border: 1px solid #E5E8EB; box-shadow: 0 4px 10px rgba(0,0,0,0.02);">
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="font-size: 24px; background: #F8F9FA; width: 44px; height: 44px; display: flex; justify-content: center; align-items: center; border-radius: 12px; border: 1px solid #F2F4F6;">${emoji}</div>
                <div>
                    <div style="font-size: 15.5px; font-weight: 900; color: #191F28; margin-bottom: 2px;">${r.ingredient}</div>
                    <div style="font-size: 12px; font-weight: 700; color: #8B95A1;">${r.status === 'pass' ? '알레르기 없음' : '발진/거부 반응'}</div>
                </div>
            </div>
            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">
                <span style="font-size: 11.5px; font-weight: 900; color: ${r.status === 'pass' ? '#059669' : '#D32F2F'}; background: ${r.status === 'pass' ? '#ECFDF5' : '#FFF0F1'}; padding: 6px 10px; border-radius: 8px;">${r.status === 'pass' ? '🟢 안심 통과' : '🚨 주의 요망'}</span>
                <button onclick="deleteFoodRecord('${selectedDateStr}', ${index})" style="background: none; border: none; color: #D1D5DB; font-size: 12px; font-weight: 800; cursor: pointer; text-decoration: underline;">삭제</button>
            </div>
        </div>
    `}).join('');
}

function openFoodSheet() {
    document.getElementById('food-bottom-sheet').style.display = 'flex';
    document.getElementById('food-ing-input').value = '';
    document.getElementById('food-ing-input').focus();
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

// 🚀 [NEW 5] 전체 누적 식재료 도감 렌더링 (안전망 포함)
function renderTotalSummary() {
    const records = JSON.parse(localStorage.getItem('tosil_food_calendar')) || {};
    const passedSet = new Set();
    const failedSet = new Set();

    // 1. 모든 날짜의 기록을 싹 뒤집니다
    Object.values(records).forEach(dailyList => {
        dailyList.forEach(r => {
            // 양쪽 끝 공백 제거 (소고기 띄어쓰기 방지)
            const cleanName = r.ingredient.trim(); 
            if (r.status === 'fail') {
                failedSet.add(cleanName);
            } else {
                passedSet.add(cleanName);
            }
        });
    });

    // 2. 🚨 가장 중요한 안전 장치!
    // 한 번이라도 알레르기(fail)가 났던 재료는 통과(pass) 리스트에서 강제로 삭제합니다.
    failedSet.forEach(item => passedSet.delete(item));

    const passListEl = document.getElementById('summary-pass-list');
    const failListEl = document.getElementById('summary-fail-list');
    const passCntEl = document.getElementById('summary-pass-cnt');
    const failCntEl = document.getElementById('summary-fail-cnt');

    if(passCntEl) passCntEl.innerText = passedSet.size;
    if(failCntEl) failCntEl.innerText = failedSet.size;

    // 3. 예쁜 둥근 칩(Chip) 모양으로 그려주기
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
            failListEl.innerHTML = '<span style="font-size:12.5px; color:#8B95A1;">알레르기 반응이 나타난 재료가 없어요! (다행이네요 😊)</span>';
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