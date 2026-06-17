// ==========================================
// 🩺 육아메이트 안심 이유식 AI 엔진 (food/app.js)
// ==========================================

// 🚦 기능 1: 식재료 신호등 검색기 (유지)
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

// 🩺 기능 2: 안심 이유식 매칭 (다중 검색 + 셔플 TOP 3 로직 탑재!)
function runFoodEngine() {
    const age = document.getElementById('food-age').value;
    const goal = document.getElementById('food-goal').value;
    const fridgeInput = document.getElementById('fridge-search').value.trim();
    const activeAllergies = Array.from(document.querySelectorAll('#allergy-filters .active')).map(btn => btn.getAttribute('data-allergy'));
    const resultArea = document.getElementById('food-result-area');

    if (!age) {
        resultArea.innerHTML = `<div class="premium-empty-state"><div class="empty-icon">🩺</div><div class="empty-text"><b>아기 월령을 선택해주세요.</b></div></div>`;
        return;
    }

    // 1단계: 기본 필터링
    let filtered = babyFoodData.filter(item => {
        if (item.age !== age) return false;
        if (goal !== 'all' && item.goal !== goal) return false;
        
        // 알레르기 차단
        const hasAllergy = activeAllergies.some(allergy => item.allergens.includes(allergy));
        if (hasAllergy) return false;
        
        // 🚀 킬러 기능 1: 다중 냉장고 파먹기 (띄어쓰기나 쉼표로 여러 개 입력 시 모두 포함된 것만 찾음)
        if (fridgeInput) {
            // 입력값을 쉼표(,)나 띄어쓰기 단위로 쪼개어 배열로 만듦 (예: ["소고기", "고구마"])
            const fridgeItems = fridgeInput.split(/[\s,]+/).filter(i => i !== '');
            // 입력한 모든 단어가 레시피 이름이나 재료에 포함되어 있는지 깐깐하게 검사
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
        // 🚀 킬러 기능 2: 리텐션 극대화 (결과를 무작위로 섞어서 딱 3개만 자름)
        let shuffled = filtered.sort(() => 0.5 - Math.random()); // 배열 마구 섞기
        let top3Results = shuffled.slice(0, 3); // 앞에서부터 딱 3개만 자르기

        // 결과창 제목 추가
        let htmlOutput = `<div style="font-size: 16px; font-weight: 800; color: #191F28; margin-bottom: 16px;">✨ 오늘의 AI 추천 식단 TOP ${top3Results.length}</div>`;

        htmlOutput += top3Results.map(item => `
            <div class="stroller-card" style="border-top: 4px solid #10B981; margin-bottom: 24px;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 8px;">
                    <div style="font-size: 18px; font-weight: 800; color: #191F28;">🍲 ${item.name}</div>
                    <span style="background:#ECFDF5; color:#065F46; font-size:11px; padding:4px 8px; border-radius:12px; font-weight:700;">매칭 성공</span>
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

                <button onclick="shareToHusband('${item.name}', '${item.ingredients}')" style="width:100%; background:#FEE500; color:#191919; border:none; padding:14px; border-radius:12px; font-weight:800; font-size:15px; cursor:pointer; display:flex; justify-content:center; align-items:center; gap:8px;">
                    <span style="font-size:18px;">💬</span> 남편에게 장보기 전송 (쿠팡)
                </button>
            </div>
        `).join('');

        resultArea.innerHTML = htmlOutput;
    }
}

function toggleFoodFilter(btn) {
    btn.classList.toggle('active');
    runFoodEngine();
}

// 🛒 수익 창출을 위한 대표님 전용 쿠팡 파트너스 연동 함수
function shareToHusband(recipeName, ingredients) {
    let firstIngredient = ingredients.split(',')[0];
    let coreKeyword = firstIngredient.replace(/[0-9].*$/, '').trim();

    // 🚨 대표님의 새로운 쿠팡 파트너스 링크 적용 완료!
    const myCoupangLink = "https://link.coupang.com/a/eEtXJsuJxc"; 

    const textToShare = `[육아메이트 AI 식단 알림] 👶\n\n여보! 내일 우리 아기 맘마로 '${recipeName}' 해줄 거야. 퇴근길에 장 봐오거나 아래 링크로 로켓프레시 시켜줘! ❤️\n\n🛒 장보기 리스트:\n${ingredients}\n\n📦 남편 전용 로켓프레시 주문:\n👉 ${myCoupangLink}\n(들어가서 '${coreKeyword} 로켓프레시' 검색해서 담아줘!)\n\n※ 이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.`;
    
    navigator.clipboard.writeText(textToShare).then(() => {
        alert("✅ 장보기 리스트가 복사되었습니다!\n(이제 남편이 링크를 타고 들어가서 결제하면 대표님께 수수료가 적립됩니다 💸)");
    }).catch(err => { alert("복사에 실패했습니다."); });
}

window.onload = () => { runFoodEngine(); };