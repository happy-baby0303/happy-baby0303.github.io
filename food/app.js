// ==========================================
// 🩺 배냇함 이유식 큐레이터 (food/app.js)
// ※ GitHub Pages 라 이 파일은 누구나 열어볼 수 있다. 주석도 화면 문구처럼 쓴다.
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
            btn.style.background = isFav ? '#FFF2F2' : '#F6F2EC';
            btn.style.color = isFav ? '#E32636' : '#7A6F68';
            btn.style.borderColor = isFav ? '#FCA5A5' : '#EDE6DE';
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
        btn.style.background = '#F6F2EC';
        btn.style.color = '#7A6F68';
        btn.style.borderColor = '#DCD3C8';
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
        resultArea.innerHTML = `<div class="premium-empty-state"><div class="empty-icon">💔</div><div class="empty-text"><b>아직 찜한 식단이 없어요</b><span>마음에 드는 레시피에 하트(❤️)를 눌러보세요.</span></div></div>`;
        return;
    }

    // 이유식은 데이터에 고유 id가 없을 수 있으므로 name을 고유 식별자로 사용합니다.
    let favItems = babyFoodData.filter(item => favorites.includes(item.name));
    
    let htmlOutput = `<div style="font-size: 16px; font-weight: 800; color: #E32636; margin-bottom: 16px;">❤️ 내 찜 보관함 (${favItems.length}개)</div>`;
    htmlOutput += favItems.map(item => generateCardHTML(item)).join('');
    resultArea.innerHTML = htmlOutput;
}


// 🚦 1. 이 재료, 먹여도 될까요? (식재료 신호등)
//   ⚠️ 예전엔 여기 '👩‍⚕️ 영양학 팩트체크 · 주의궁합' 이 붙었다.
//      "시금치와 두부는 결석을 만들어 절대 피해야 해요" 같은 민간 속설이었고,
//      반대 방향으로 찾을 때는 다른 재료의 이유를 그대로 붙여서
//      '소고기 + 두부 → 두부와 해조류는 같이 쓰기 좋은 조합이에요' 처럼 엉뚱한 말이 나왔다.
//      이제는 확실한 것만: 언제부터 · 어떻게 손질 · 같이 쓰기 좋은 재료 · 이 재료가 들어간 레시피.
//   ⚠️ '완두콩 넣은 레시피가 안 떠요' 라는 문의 — 재료도 레시피도 없었다. 둘 다 채웠고,
//      여기서 바로 그 재료가 들어간 레시피로 건너갈 수 있게 했다.
const FOOD_STAGE = { early: "초기(4~6개월)부터", mid: "중기(7~9개월)부터", late: "후기(10~11개월)부터", done: "돌 지나서" };
const FOOD_STAGE_SHORT = { early: "초기", mid: "중기", late: "후기", done: "완료기" };
const FOOD_STAGE_ORDER = { early: 0, mid: 1, late: 2, done: 3 };
const FOOD_SHOW = { "계란흰자": "달걀", "계란노른자": "달걀노른자" };   // 칩에 보일 이름
const FOOD_TONE = {
    red:    { dot: "#D9534F", ink: "#B42318", bg: "#FFF5F3", line: "#F6CFC8", label: "돌 전엔 안 줘요" },
    yellow: { dot: "#E0A100", ink: "#8A5A00", bg: "#FFF9EC", line: "#F3DFA8", label: "조심해서 시작해요" },
    green:  { dot: "#3BA776", ink: "#1F7A52", bg: "#F3FAF6", line: "#C9E8D7", label: "편하게 시작해요" }
};

function foodEsc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
// onclick="..." 안에 넣을 글자
function foodArg(s) { return foodEsc("'" + String(s == null ? "" : s).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'"); }

// 받침 있으면 '은', 없으면 '는'
function foodEunNeun(w) {
    const c = String(w || "").charCodeAt(String(w || "").length - 1);
    return (c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0) ? "은" : "는";
}
// 받침 있으면 '이', 없으면 '가'
function foodIga(w) {
    const c = String(w || "").charCodeAt(String(w || "").length - 1);
    return (c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0) ? "이" : "가";
}

/* 검색 — 이름이 딱 맞는 것 > 다른 이름(키워드)이 딱 맞는 것 > 이름으로 시작 > 이름에 들어 있음 > 키워드 일부
   점수가 같으면 편하게 시작하는 재료(초록)가 먼저 ('고기' → 돼지고기가 아니라 소고기) */
function foodSearch(query) {
    const q = String(query || "").replace(/\s+/g, "");
    if (!q) return [];
    const scored = [];
    ingredientDB.forEach((item, idx) => {
        const name = item.name.replace(/\s+/g, "");
        const kws = item.keywords || [];
        let sc = 0;
        if (name === q) sc = 100;
        else if (kws.indexOf(q) > -1) sc = 90;
        else if (name.indexOf(q) === 0) sc = 80;
        else if (name.indexOf(q) > -1) sc = 60;
        if (sc < 50) kws.forEach(k => {
            if (k.indexOf(q) === 0) sc = Math.max(sc, 40);
            else if (q.length >= 2 && k.indexOf(q) > -1) sc = Math.max(sc, 30);
        });
        if (!sc && q.length >= 2 && q.indexOf(name) > -1) sc = 20;   // '소고기안심' → 소고기
        if (sc) scored.push({ item, sc, idx });
    });
    const tone = { green: 0, yellow: 1, red: 2 };
    scored.sort((a, b) => b.sc - a.sc || (tone[a.item.status] - tone[b.item.status]) || a.idx - b.idx);
    foodSearch.lastScores = scored.map(x => x.sc);
    return scored.map(x => x.item);
}

/* 레시피를 찾을 말 — 이름과, 다른 재료와 헷갈리지 않는 키워드만
   ('안심' 은 닭안심에도 있고 '콩' 은 완두콩에도 있어서 빼야 한다) */
let _foodTermsCache = null;
function foodRecipeTerms(item) {
    if (!_foodTermsCache) {
        _foodTermsCache = new Map();
        const all = [];
        ingredientDB.forEach(i => { all.push([i, i.name]); (i.keywords || []).forEach(k => all.push([i, k])); });
        ingredientDB.forEach(i => {
            const terms = [i.name.replace(/·.*/, "")];
            (i.keywords || []).forEach(k => {
                if (k.length < 2) return;
                const clash = all.some(([o, w]) => o !== i && w !== k && w.indexOf(k) > -1);
                if (!clash && terms.indexOf(k) < 0) terms.push(k);
            });
            _foodTermsCache.set(i.name, terms);
        });
    }
    return _foodTermsCache.get(item.name) || [item.name];
}
function foodRecipesWith(item) {
    const terms = foodRecipeTerms(item);
    const out = [];
    babyFoodData.forEach(r => {
        const text = r.name + " " + r.ingredients;
        const t = terms.find(w => text.indexOf(w) > -1);
        if (t) out.push({ r, term: t });
    });
    return out;
}

function foodPairsOf(item) {
    const out = [];
    (typeof pairDB !== "undefined" ? pairDB : []).forEach(p => {
        if (p.a === item.name) out.push({ names: p.with, why: p.why });
        else if (p.with.indexOf(item.name) > -1) out.push({ names: [p.a], why: p.why });
    });
    return out;
}

function foodNowStage() {
    const el = document.getElementById('food-age');
    return (el && el.value) || 'early';
}

function foodIngredientCard(found) {
    const tone = FOOD_TONE[found.status] || FOOD_TONE.green;
    const when = found.fromText || (found.from ? FOOD_STAGE[found.from] : "");
    const now = foodNowStage();
    const early = found.status !== "red" && found.from && FOOD_STAGE_ORDER[found.from] > FOOD_STAGE_ORDER[now];
    let html = `
        <div style="background:${tone.bg}; border:1px solid ${tone.line}; padding:16px 16px 15px; border-radius:16px;">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
                <div style="display:flex; align-items:center; gap:8px; min-width:0;">
                    <span style="width:11px; height:11px; border-radius:50%; background:${tone.dot}; flex-shrink:0;"></span>
                    <span style="font-weight:900; font-size:17px; color:#4A413C; word-break:keep-all;">${foodEsc(found.name)}</span>
                </div>
                <span style="flex-shrink:0; font-size:12px; font-weight:800; color:${tone.ink}; background:#FFFFFF; border:1px solid ${tone.line}; padding:5px 9px; border-radius:999px;">${foodEsc(found.label || tone.label)}</span>
            </div>
            <div style="display:flex; flex-wrap:wrap; gap:6px; margin:10px 0 8px;">
                ${when ? `<span style="font-size:12.5px; font-weight:800; color:#4A413C; background:#FFFFFF; border:1px solid #EDE6DE; padding:4px 9px; border-radius:8px;">${foodEsc(when)}</span>` : ''}
                ${found.why ? `<span style="font-size:12.5px; font-weight:800; color:${tone.ink}; background:#FFFFFF; border:1px solid ${tone.line}; padding:4px 9px; border-radius:8px;">${foodEsc(found.why)} 주의</span>` : ''}
            </div>
            <div style="font-size:14px; color:#6F645D; line-height:1.65; font-weight:600; word-break:keep-all;">${foodEsc(found.desc)}</div>
            ${early ? `<div style="margin-top:10px; font-size:12.5px; font-weight:700; color:#8A7F76;">지금(${FOOD_STAGE_SHORT[now]})은 조금 이른 재료예요.</div>` : ''}
        </div>`;

    const pairs = foodPairsOf(found);
    if (pairs.length) {
        html += `<div style="margin-top:18px;">
            <div style="font-size:14.5px; font-weight:900; color:#4A413C; margin-bottom:10px;">같이 쓰기 좋은 재료</div>` +
            pairs.slice(0, 5).map(p => `
            <div style="padding:11px 13px; border:1px solid #EDE6DE; background:#FFFFFF; border-radius:12px; margin-bottom:7px;">
                <div style="display:flex; flex-wrap:wrap; gap:5px; margin-bottom:5px;">
                    ${p.names.map(n => `<span onclick="foodLookup(${foodArg(n)})" style="cursor:pointer; font-size:13px; font-weight:800; color:#5B53B8; background:#F0EEFB; padding:3px 9px; border-radius:7px;">${foodEsc(FOOD_SHOW[n] || n)}</span>`).join('')}
                </div>
                <div style="font-size:13px; font-weight:600; color:#7A6F68; line-height:1.55; word-break:keep-all;">${foodEsc(p.why)}</div>
            </div>`).join('') + `</div>`;
    }

    const list = foodRecipesWith(found);
    if (list.length && found.status !== "red") {
        list.sort((a, b) => {
            const da = Math.abs(FOOD_STAGE_ORDER[a.r.age] - FOOD_STAGE_ORDER[now]) + (FOOD_STAGE_ORDER[a.r.age] > FOOD_STAGE_ORDER[now] ? 0.5 : 0);
            const db = Math.abs(FOOD_STAGE_ORDER[b.r.age] - FOOD_STAGE_ORDER[now]) + (FOOD_STAGE_ORDER[b.r.age] > FOOD_STAGE_ORDER[now] ? 0.5 : 0);
            return da - db;
        });
        const shown = list.slice(0, 6);
        html += `<div style="margin-top:18px;">
            <div style="font-size:14.5px; font-weight:900; color:#4A413C; margin-bottom:10px;">${foodEsc(found.name)}${foodIga(found.name)} 들어간 레시피 <span style="color:#7F77DD;">${list.length}</span></div>` +
            shown.map(x => `
            <div onclick="foodGoRecipe(${foodArg(x.r.name)}, ${foodArg(x.term)})" style="cursor:pointer; display:flex; align-items:center; gap:10px; padding:12px 13px; border:1px solid #EDE6DE; background:#FFFFFF; border-radius:12px; margin-bottom:7px;">
                <span style="flex-shrink:0; font-size:11.5px; font-weight:800; color:${x.r.age === now ? '#FFFFFF' : '#7A6F68'}; background:${x.r.age === now ? '#7F77DD' : '#F6F2EC'}; padding:3px 8px; border-radius:6px;">${FOOD_STAGE_SHORT[x.r.age]}</span>
                <span style="flex:1; min-width:0; font-size:14px; font-weight:800; color:#4A413C; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${foodEsc(x.r.name)}</span>
                <span style="flex-shrink:0; color:#B5AAA0; font-size:13px; font-weight:800;">›</span>
            </div>`).join('') +
            (list.length > shown.length ? `<div onclick="foodGoRecipe('', ${foodArg(list[0].term)})" style="cursor:pointer; text-align:center; font-size:13px; font-weight:800; color:#7F77DD; padding:8px 0 2px;">레시피 탭에서 ${list.length}개 다 보기 ›</div>` : '') +
            `</div>`;
    }
    return html;
}

function checkIngredient() {
    const input = document.getElementById('ingredient-search');
    const query = (input ? input.value : '').trim();
    const resultArea = document.getElementById('traffic-light-result');
    if (!resultArea) return;

    if (!query) {
        resultArea.style.display = 'none';
        resultArea.innerHTML = '';
        return;
    }

    const hits = foodSearch(query);
    resultArea.style.display = 'block';
    if (!hits.length) {
        resultArea.innerHTML = `<div style="padding:16px; font-size:14px; color:#8A7F76; font-weight:600; line-height:1.65; text-align:center; background:#FAF7F2; border:1px solid #EDE6DE; border-radius:14px; word-break:keep-all;">
            아직 정리하지 않은 재료예요.<br>처음 주는 재료는 아침에 조금만 먹여 보고 사흘 동안 지켜봐 주세요.</div>`;
        return;
    }
    let html = foodIngredientCard(hits[0]);
    // 다른 결과 — 첫 결과가 이름으로 딱 맞으면, 키워드 일부만 겹치는 것('꿀' → 꿀고구마)은 보이지 않는다
    const sc = foodSearch.lastScores || [];
    const others = hits.slice(1).filter((h, i) => sc[0] >= 80 ? sc[i + 1] >= 55 : sc[i + 1] >= 30);
    if (others.length) {
        html += `<div style="margin-top:14px; display:flex; flex-wrap:wrap; align-items:center; gap:6px;">
            <span style="font-size:12.5px; font-weight:700; color:#A3958A;">다른 결과</span>` +
            others.slice(0, 5).map(h => `<span onclick="foodLookup(${foodArg(h.name)})" style="cursor:pointer; font-size:12.5px; font-weight:800; color:#4A413C; background:#FFFFFF; border:1px solid #EDE6DE; padding:5px 10px; border-radius:999px;">${foodEsc(h.name)}</span>`).join('') +
            `</div>`;
    }
    resultArea.innerHTML = html;
}

// 결과 안의 재료 이름을 누르면 그 재료로 다시 찾는다
window.foodLookup = function (name) {
    const input = document.getElementById('ingredient-search');
    if (input) input.value = name;
    checkIngredient();
    const box = document.getElementById('traffic-light-result');
    if (box && box.scrollIntoView) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// 레시피를 누르면 레시피 탭으로 — 그 재료가 들어간 것만 보이게 하고, 누른 레시피로 내려간다
window.foodGoRecipe = function (recipeName, term) {
    const r = recipeName ? babyFoodData.find(x => x.name === recipeName) : null;
    if (typeof window.foodTabGo === 'function') window.foodTabGo('recipe');
    setTimeout(function () {
        if (typeof isFavViewMode !== 'undefined' && isFavViewMode && typeof toggleFavView === 'function') toggleFavView();
        const age = document.getElementById('food-age');
        if (age && r) age.value = r.age;
        const goal = document.getElementById('food-goal');
        if (goal) goal.value = 'all';
        const fridge = document.getElementById('fridge-search');
        if (fridge) fridge.value = term || '';
        runFoodEngine();
        if (!r) return;
        setTimeout(function () {
            const cards = document.querySelectorAll('[data-recipe]');
            let card = null;
            cards.forEach(function (c) { if (!card && c.getAttribute('data-recipe') === r.name) card = c; });
            if (!card) return;
            const more = document.getElementById('food-other-area');
            if (more && more.contains(card) && more.style.display === 'none' && typeof toggleFoodOthers === 'function') toggleFoodOthers();
            card.scrollIntoView({ behavior: 'smooth', block: 'start' });
            card.style.transition = 'box-shadow 0.4s';
            card.style.boxShadow = '0 0 0 3px rgba(127,119,221,0.35)';
            setTimeout(function () { card.style.boxShadow = ''; }, 1600);
        }, 350);
    }, 120);
};

// 레시피 카드
// 조리 순서 한 줄을 화면용으로 다듬는다. '(안전)' 은 짧은 '주의' 표시로 (요리 모드와 같은 말).
function foodStepHTML(step) {
    return String(step || '')
        .replace(/\(안전\)\s*/g, '<b style="color:#B42318;">주의</b> ');
}
function generateCardHTML(item) {
    const itemId = item.name;
    const favorites = JSON.parse(localStorage.getItem('favFoods')) || [];
    const isFav = favorites.includes(itemId);
    const heartIcon = isFav ? '❤️ 찜 해제' : '🤍 찜하기';
    const heartColor = isFav ? '#FFF2F2' : '#F6F2EC';
    const heartText = isFav ? '#E32636' : '#7A6F68';
    const heartBorder = isFav ? '#FCA5A5' : '#EDE6DE';

    return `
        <div class="stroller-card" data-recipe="${foodEsc(item.name)}" style="border-top: 4px solid ${isFavViewMode ? '#E32636' : 'transparent'}; margin-bottom: 24px; padding: 28px 24px; background:#FFF; border-radius:24px; box-shadow:0 4px 16px rgba(0,0,0,0.04); border:1px solid #F7F3ED;">
            
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 20px; gap: 12px;">
                <div style="flex: 1; min-width: 0;">
                    <div style="font-size:22px; font-weight:900; letter-spacing:-0.5px; color:#4A413C; word-break:keep-all; line-height:1.4;">
                        🍲 ${item.name}
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; gap: 10px;">
                    <button id="fav-btn-${itemId}" onclick="toggleFavorite('${itemId}')" style="background:${heartColor}; color:${heartText}; border:1px solid ${heartBorder}; padding:8px 12px; border-radius:8px; font-weight:800; font-size:12px; cursor:pointer; transition:0.2s; white-space:nowrap;">
                        ${heartIcon}
                    </button>
                </div>
            </div>
            
            <div style="font-size: 13.5px; color: #7A6F68; margin-bottom: 20px; font-weight: 600; line-height: 1.5;">${item.desc}</div>
            
            <div style="background: #FBF8F3; padding: 16px; border-radius: 14px; border: 1px solid #EDE6DE; margin-bottom: 16px;">
                <div style="font-size: 13.5px; color: #7A6F68; line-height: 1.6; font-weight: 600;">
                    <span style="display:block; margin-bottom:6px;"><b>입자:</b> ${item.texture}</span>
                    <span style="display:block;"><b>필요 재료:</b> ${item.ingredients}</span>
                </div>
            </div>

            <button onclick="openCookingMode('${item.name}')" style="display:flex; justify-content:center; align-items:center; gap:8px; width:100%; background:#4A413C; color:#FFFFFF; border:none; padding:18px 16px; border-radius:14px; font-weight:900; font-size:15px; cursor:pointer; box-shadow: 0 4px 14px rgba(0,0,0,0.1); margin-bottom: 16px; transition: 0.2s;">
                따라 만들기<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="margin-left:4px; flex-shrink:0;" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
            </button>
            
            <div class="recipe-box" style="background: #FFF; border: 1px solid #EDE6DE; padding: 16px; border-radius: 14px; margin-bottom:16px;">
                <div style="font-weight: 800; font-size: 13.5px; color: #4A413C; margin-bottom: 8px;">조리 순서 미리보기</div>
                <ul style="margin: 0; padding-left: 0; list-style: none; font-size: 13px; color: #7A6F68; line-height: 1.6;">
                    ${item.recipe.map(step => `<li style="margin-bottom:6px;">${foodStepHTML(step)}</li>`).join('')}
                </ul>
            </div>

            <button onclick="shareToHusband('${item.name}', '${item.ingredients}')" style="display:block; width:100%; background:#FEE500; border:none; color:#191919; padding:16px; border-radius:14px; font-weight:900; font-size:15px; text-align:center; transition:0.2s; cursor:pointer; box-shadow: 0 4px 12px rgba(254, 229, 0, 0.2);">
                여보한테 장볼 거 보내기
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
        resultArea.innerHTML = `<div class="premium-empty-state"><div class="empty-icon">🥄</div><div class="empty-text"><b>아기 월령을 골라 주세요.</b></div></div>`;
        return;
    }

    let filtered = babyFoodData.filter(item => {
        if (item.age !== age) return false;
        if (goal !== 'all' && item.goal !== goal) return false;
        
        // 1. ✨ 알레르기 철벽 차단 (스마트 한영 매핑 로직)
        if (customAllergies.length > 0) {
            // 엄마들이 자주 입력하는 한글 알레르기 키워드를 영어 DB(allergens)와 매핑
            /* ⚠️ 부모가 적은 말을 레시피 재료명과 맞춰보는 사전이다.
                  여기 없는 말은 '이름에 들어있나 / 재료에 들어있나' 로만 걸러진다.
                  그래서 표기가 다르면 통째로 새어나간다.

                      "소고기" 라고 적음  →  소고기 레시피가 걸러짐        ✅
                      "쇠고기" 라고 적음  →  120개가 그대로 추천됨         🔴

                  부모는 둘 중 뭘 적든 같은 뜻으로 쓴다.
                  알레르기 있는 아기에게 그 재료가 든 레시피를 추천하는 건
                  이 앱에서 제일 위험한 실수다.

                  같은 것을 다르게 부르는 말을 채워 넣는다.
                  ⚠️ 새 재료를 넣을 때 여기도 같이 채울 것. */
            const SAME_AS = {
                "쇠고기": "소고기", "한우": "소고기", "소": "소고기",
                "닭": "닭고기", "닭가슴살": "닭고기", "계육": "닭고기",
                "돼지": "돼지고기", "돈육": "돼지고기",
                "달걀흰자": "흰자", "계란흰자": "흰자",
                "방울토마토": "토마토", "대추토마토": "토마토",
                "참깨": "깨", "들깨": "깨", "참기름": "깨", "들기름": "깨",
                "감자전분": "감자", "고구마전분": "고구마",
                "찹쌀가루": "찹쌀", "쌀가루": "쌀",
                "브로컬리": "브로콜리", "부로콜리": "브로콜리",
                "단호박": "호박", "애호박": "호박",
                // ⚠️ 완두콩은 대두가 아니다. 예전엔 '완두' 를 적으면 두부·콩나물 레시피까지 빠졌다
                "그린피스": "완두콩", "완두": "완두콩",
                "알배추": "배추", "초당옥수수": "옥수수", "스위트콘": "옥수수"
            };

            const allergyDictionary = {
        '계란': 'egg', '달걀': 'egg', '흰자': 'egg', '노른자': 'egg', '메추리알': 'egg',
        '우유': 'dairy', '치즈': 'dairy', '유제품': 'dairy', '요거트': 'dairy',
        '요구르트': 'dairy', '버터': 'dairy', '생크림': 'dairy', '분유': 'dairy',
        '밀가루': 'flour', '밀': 'flour', '면': 'flour', '빵': 'flour', '국수': 'flour',
        '파스타': 'flour', '소면': 'flour', '오트밀': 'flour', '귀리': 'flour',
        '콩': 'soy', '대두': 'soy', '두부': 'soy', '된장': 'soy', '간장': 'soy',
        '두유': 'soy', '순두부': 'soy', '콩나물': 'soy', '서리태': 'soy', '검은콩': 'soy',
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
                const word = String(customItem || "").trim();
                if (!word) return false;

                /* 같은 뜻의 다른 이름까지 같이 본다.
                   "쇠고기" 로 적어도 "소고기" 레시피가 걸러지도록. */
                const words = [word];
                if (SAME_AS[word]) words.push(SAME_AS[word]);
                Object.keys(SAME_AS).forEach(k => {
                    if (SAME_AS[k] === word && words.indexOf(k) === -1) words.push(k);
                });

                const mappedEng = allergyDictionary[word] || allergyDictionary[SAME_AS[word]];

                return words.some(w =>
                           item.name.includes(w) ||
                           item.ingredients.includes(w)
                       ) ||
                       (mappedEng && item.allergens && item.allergens.includes(mappedEng));
            });
            if (hasCustomAllergy) return false; // 하나라도 걸리면 즉시 아웃
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
        /* ⚠️ '완두콩' 을 적었는데 초기라서 하나도 안 나오면, 앱에 완두콩 레시피가 없는 줄 알았다.
              다른 단계에 있으면 거기로 가는 길을 보여 준다. */
        let other = null;
        if (fridgeInput) {
            const fItems = fridgeInput.split(/[\s,]+/).filter(i => i !== '');
            const elsewhere = babyFoodData.filter(r => r.age !== age && fItems.every(f => r.name.includes(f) || r.ingredients.includes(f)));
            if (elsewhere.length) {
                const order = ['early', 'mid', 'late', 'done'];
                const stages = order.filter(a => elsewhere.some(r => r.age === a));
                const firstAge = stages.find(a => order.indexOf(a) > order.indexOf(age)) || stages[0];
                other = { age: firstAge, n: elsewhere.filter(r => r.age === firstAge).length };
            }
        }
        const STAGE_KO = { early: '초기', mid: '중기', late: '후기', done: '완료기' };
        let headline = `${STAGE_KO[age]}에 맞는 레시피는 아직 없어요.`;
        if (other && fridgeInput) {
            const ing = foodSearch(fridgeInput.split(/[\s,]+/)[0])[0];
            if (ing && ing.from && FOOD_STAGE_ORDER[ing.from] > FOOD_STAGE_ORDER[age]) {
                headline = `${ing.name}${foodEunNeun(ing.name)} ${FOOD_STAGE[ing.from].replace(/부터$/, '')}부터 쓰는 재료예요.`;
            }
        }
        resultArea.innerHTML = other
            ? `<div class="premium-empty-state"><div class="empty-text"><b>${headline}</b><span>${STAGE_KO[other.age]} 레시피에 ${other.n}개 있어요.</span></div>
               <button onclick="document.getElementById('food-age').value='${other.age}'; runFoodEngine();" style="margin-top:14px; padding:12px 18px; border:none; border-radius:12px; background:#4A413C; color:#FFF; font-size:14px; font-weight:800; cursor:pointer;">${STAGE_KO[other.age]} 레시피 보기</button></div>`
            : `<div class="premium-empty-state"><div class="empty-text"><b>조건에 맞는 레시피가 없어요.</b><span>냉장고 재료나 필터를 바꿔 보세요.</span></div></div>`;
    } else {
        // ✨ 수정한 부분: 타자 칠 때마다 섞이는 랜덤 로직을 완전히 삭제했습니다! ✨
        // 이제 결과가 고정되어 타자를 쳐도 요동치지 않습니다.
        let top3Results = filtered.slice(0, 3); 
        let otherResults = filtered.slice(3); 

        let htmlOutput = `<div style="font-size: 16px; font-weight: 800; color: #4A413C; margin-bottom: 16px;">✨ 오늘의 추천 식단 TOP ${top3Results.length}</div>`;
        htmlOutput += top3Results.map(item => generateCardHTML(item)).join('');

        if (otherResults.length > 0) {
            htmlOutput += `
                <button id="food-show-more-btn" onclick="toggleFoodOthers()" style="display: block; width: 100%; padding: 16px; margin-top: 8px; margin-bottom: 24px; background: #FFFFFF; border: 1px solid #DCD3C8; border-radius: 14px; font-size: 14px; font-weight: 700; color: #7A6F68; cursor: pointer; transition: 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
                    나머지 ${otherResults.length}개 레시피 더보기 ▾
                </button>
                <div id="food-other-area" style="display:none; flex-direction: column;">
                    <div style="font-size: 14px; font-weight: 800; color: #A3958A; margin-bottom: 16px;">🔍 추가 매칭 리스트</div>
                    ${otherResults.map(item => generateCardHTML(item)).join('')}
                </div>
            `;
        }

        resultArea.innerHTML = htmlOutput; // 👈 2개 중 여기가 맞습니다 (runFoodEngine 안쪽)

        /* ⚠️ 무조건 스크롤하면 안 된다.
              탭을 누를 때도 runFoodEngine 이 다시 돌아서,
              가만히 있고 싶은데 화면이 저절로 내려간다.
              사용자가 '필터를 직접 바꿨을 때' 만 올려준다. */
        if (window.__foodUserFiltered) {
            window.__foodUserFiltered = false;
            var mp = document.querySelector('.matrix-panel');
            if (mp) mp.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
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

// 장볼 거 보내기
/* ⚠️ 예전에는 메시지 끝에 쿠팡 파트너스 링크 하나를 몰래 붙이고
      "아래 링크 눌러서 쿠팡 장바구니에 싹 담아주면 돼" 라고 적었다.
      그 링크는 이 재료들과 상관없는 링크였고(쿠팡은 여러 개를 밖에서 한 번에 못 담는다),
      받는 사람은 그게 수수료 링크인 줄 모른다. 공정위 지침상 대가성을 알리지 않은 추천이 된다.
      재료 목록만 보낸다. */
function shareToHusband(recipeName, ingredients) {
    const items = String(ingredients || '').split(',').map(i => i.trim()).filter(Boolean);
    let shareText = `여보, 오늘 이유식은 [${recipeName}] 할게요.\n장볼 거 적어서 보내요.\n\n`;
    items.forEach(item => { shareText += `· ${item}\n`; });
    shareText += `\n(배냇함 이유식에서 보냄)`;

    if (typeof Kakao === 'undefined' || !Kakao.isInitialized()) {
        navigator.clipboard.writeText(shareText).then(() => {
            alert("장볼 거 목록을 복사했어요. 카톡에 붙여 넣어 보내세요.");
        }).catch(() => prompt("아래 내용을 복사해 주세요", shareText));
        return;
    }

    Kakao.Share.sendDefault({
        objectType: 'text',
        text: shareText,
        link: { mobileWebUrl: 'https://happy-baby0303.github.io/', webUrl: 'https://happy-baby0303.github.io/' },
        buttons: [{ title: '배냇함에서 보기', link: { mobileWebUrl: 'https://happy-baby0303.github.io/', webUrl: 'https://happy-baby0303.github.io/' } }]
    });
}

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
    const foodGuide = document.getElementById('food-guide'); // ✨ 달력 탭에서 방해되는 녀석 숨기기용

    if (tabName === 'curation') {
        btnCuration.style.background = '#FFFFFF';
        btnCuration.style.color = '#4A413C';
        btnCuration.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
        btnCalendar.style.background = 'transparent';
        btnCalendar.style.color = '#A3958A';
        btnCalendar.style.boxShadow = 'none';

        viewCuration.style.display = 'block';
        viewCalendar.style.display = 'none';
        if (foodGuide) foodGuide.style.display = 'block'; // 레시피 탭에서는 가이드 보이기
    } else {
        btnCalendar.style.background = '#FFFFFF';
        btnCalendar.style.color = '#4A413C';
        btnCalendar.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
        btnCuration.style.background = 'transparent';
        btnCuration.style.color = '#A3958A';
        btnCuration.style.boxShadow = 'none';

        viewCalendar.style.display = 'block';
        viewCuration.style.display = 'none'; 
        if (foodGuide) foodGuide.style.display = 'none'; // ✨ 달력 탭에서는 가이드 완벽히 숨기기
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
                /* ⚠️ '이미 먹여본 재료' 로 한꺼번에 적은 것(past)은 그날 새로 먹인 게 아니다.
                      같은 날짜로 넷을 적으면 달력엔 '하루에 새 재료 넷' 으로 찍히고, 이번 달 개수에도 들어갔다.
                      사흘 규칙을 알려주는 앱이 스스로 그 반대를 보여주는 꼴이라 점에서 뺀다. */
                if (r.past) return;
                // 식단 기록은 보라 점 (개수에는 안 넣는다)
                if (r.type === 'meal' || (r.menu && !r.ingredient)) {
                    dotsHtml += `<div class="cal-dot" style="background:#7F77DD;"></div>`;
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
        listArea.innerHTML = `<div style="text-align: center; padding: 30px 0; color: #A3958A; font-size: 14px; font-weight: 600; background:#FFF; border-radius:14px; border:1px dashed #DCD3C8;">아직 기록이 없어요.</div>`;
        return;
    }

    listArea.innerHTML = dailyRecords.map((r, i) => {
        let contentHtml = '';

        if (r.type === 'meal' || (r.menu && !r.ingredient)) {
            let amountHtml = ''; let reactionHtml = ''; let actionBtnHtml = '';

            // 💡 [핵심 디테일] 계획됨 상태면 '기록 완료' 파란 버튼 띄우기 (문자열 포함 여부로 확실히 체크!)
            if (r.amount && r.amount.includes('계획됨')) {
                amountHtml = `<span style="background:#FFF7ED; border:1px solid #FDBA74; padding:4px 8px; border-radius:6px; font-size:11px; font-weight:800; color:#9A3412; cursor:pointer;" onclick="openMealSheetForUpdate('${selectedDateStr}', ${i}, '${r.menu}')">⏳ 아직 안 먹었어요 · 눌러서 기록</span>`;
                /* ⚠️ '계획됨' 일 때는 [기록하기] 만 있고 삭제가 없었다.
                   식단표가 자동으로 넣어준 계획인데, 그날 안 먹이기로 했거나
                   메뉴를 바꿨으면 지울 방법이 없다. 달력에 영영 남는다.
                   이미 먹은 기록에는 삭제가 있는데 계획에만 없었다. */
                actionBtnHtml = `<button onclick="openMealSheetForUpdate('${selectedDateStr}', ${i}, '${r.menu}')" style="background:#7F77DD; color:#FFF; border:none; border-radius:8px; font-size:12px; font-weight:800; padding:8px 12px; cursor:pointer; box-shadow:0 2px 4px rgba(127, 119, 221,0.2); transition:0.2s;">기록 완료 ✏️</button>`;
                actionBtnHtml += `<button onclick="deleteFoodRecord('${selectedDateStr}', ${i})" style="background:#FBF8F3; border:1px solid #EDE6DE; border-radius:8px; font-size:12px; font-weight:700; color:#A3958A; cursor:pointer; padding:6px 10px; margin-left:6px;">삭제</button>`;
            } else {
                // 이미 먹은 기록일 경우 (기존)
                amountHtml = `<span style="background:#F2F0FC; padding:4px 8px; border-radius:6px; font-size:12px; font-weight:800; color:#7F77DD;">${r.amount}</span>`;
                reactionHtml = `<span style="background:#F6F2EC; padding:4px 8px; border-radius:6px; font-size:12px; font-weight:800; color:#7A6F68;">${r.reaction}</span>`;
                actionBtnHtml = `<button onclick="deleteFoodRecord('${selectedDateStr}', ${i})" style="background:#FBF8F3; border:1px solid #EDE6DE; border-radius:8px; font-size:12px; font-weight:700; color:#A3958A; cursor:pointer; padding:6px 10px;">삭제</button>`;
            }

            contentHtml = `
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                    <span style="font-size:12px; color:#A3958A; font-weight:700;">${(typeof r.time === 'string' && !/^\d{6,}$/.test(r.time)) ? r.time : ''}</span>
                    <span style="font-weight: 900; font-size: 16px; color: #4A413C; letter-spacing:-0.5px;">${getFoodEmoji(r.menu)} ${r.menu}</span>
                </div>
                <div style="display:flex; gap:6px; align-items:center;">
                    ${amountHtml} ${reactionHtml}
                </div>
            `;
            
            return `
                <div style="background: #FFF; border: 1px solid #EDE6DE; padding: 18px 16px; border-radius: 16px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; box-shadow:0 2px 8px rgba(0,0,0,0.02);">
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
                    <span style="font-size:12px; color:#A3958A; font-weight:700;">${(typeof r.time === 'string' && !/^\d{6,}$/.test(r.time)) ? r.time : ''}</span>
                    <span style="font-weight: 900; font-size: 15px; color: ${isPass ? '#059669' : '#D32F2F'};">${getFoodEmoji(r.ingredient)} ${r.ingredient} 먹여봤어요</span>
                </div>
                <span style="display:inline-block; font-size:12px; font-weight:800; padding:4px 8px; border-radius:6px; background:${isPass ? '#ECFDF5' : '#FFF0F1'}; color:${isPass ? '#059669' : '#D32F2F'};">
                    ${icon} ${isPass ? '무사 통과' : '알레르기 반응'}
                </span>
            `;
            return `
                <div style="background: #FFF; border: 1px solid #EDE6DE; padding: 16px; border-radius: 14px; display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <div style="display:flex; flex-direction:column;">${contentHtml}</div>
                    <button onclick="deleteFoodRecord('${selectedDateStr}', ${i})" style="background: #FBF8F3; border: 1px solid #EDE6DE; border-radius: 8px; font-size: 12px; font-weight:700; color: #A3958A; cursor: pointer; padding:6px 10px;">삭제</button>
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
    if (!ingredient) return alert("급여한 식재료를 입력해주세요 (예: 소고기)");
    
    let records = JSON.parse(localStorage.getItem('tosil_food_calendar')) || {};
    if (!records[selectedDateStr]) records[selectedDateStr] = [];
    
    records[selectedDateStr].push({ ingredient, status });
    localStorage.setItem('tosil_food_calendar', JSON.stringify(records));
    
    closeFoodSheet();
    renderCalendar();
}

function deleteFoodRecord(dateStr, index) {
    /* ⚠️ 예전엔 첫 줄에서 바로 .ingredient 를 읽었다. 두 가지가 터졌다.

         ① 식단 기록(type:'meal')에는 ingredient 가 없다. menu 다.
            그래서 "undefined 기록을 삭제할까요?" 가 떴다.
         ② 그 칸이 이미 비었으면 [dateStr][index] 가 undefined 라
            읽는 순간 통째로 죽었다. 버튼이 아무 반응도 안 한다.

       먼저 꺼내서 확인하고, 이름은 있는 것으로 고른다. */
    let records = {};
    try { records = JSON.parse(localStorage.getItem('tosil_food_calendar')) || {}; } catch (e) {}

    const row = (records[dateStr] || [])[index];
    if (!row) { renderSelectedDateRecords(); return; }

    const label = row.ingredient || row.menu || '이 기록';
    if (!confirm(`'${label}' 기록을 삭제할까요?`)) return;
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
            passListEl.innerHTML = '<span style="font-size:12.5px; color:#A3958A;">아직 통과한 재료가 없어요.</span>';
        } else {
            passListEl.innerHTML = Array.from(passedSet).map(ing => 
                `<span style="background:#ECFDF5; color:#059669; border:1px solid #A7F3D0; padding:6px 14px; border-radius:20px; font-size:13.5px; font-weight:800; display:inline-flex; align-items:center; gap:4px;">${getFoodEmoji(ing)} ${ing}</span>`
            ).join('');
        }
    }

    if(failListEl) {
        if(failedSet.size === 0) {
            failListEl.innerHTML = '<span style="font-size:12.5px; color:#A3958A;">알레르기 반응이 나타난 재료가 없어요</span>';
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
                <div class="step-box" style="min-width:24px; height:24px; border-radius:6px; border:2px solid #DCD3C8; display:flex; justify-content:center; align-items:center; font-size:12px; font-weight:900; flex-shrink:0;">${index + 1}</div>
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
        display.style.color = '#4A413C';
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
        btn.style.background = '#7F77DD';
    } else {
        if (cookTimeRemaining <= 0) return alert('먼저 시간을 세팅해주세요');
        
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
                btn.style.background = '#7F77DD';
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
        btn.style.background = '#7F77DD';
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
            bar.style.background = '#EDE6DE';
            display.style.color = '#4A413C';
        } else {
            const percent = (cookTimeRemaining / cookTimeTotal) * 100;
            bar.style.width = `${percent}%`;
            
            // 10초 남았을 때 아드레날린 솟구치는 빨간색으로 변경!
            if(cookTimeRemaining <= 10 && cookTimeRemaining > 0) {
                bar.style.background = '#D32F2F';
                display.style.color = '#D32F2F';
            } else {
                bar.style.background = '#7F77DD';
                display.style.color = '#4A413C';
            }
        }
    }
}

// (같이 쓰기 좋은 재료는 data.js 의 pairDB 로 옮겼다)

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
    
    if (!menu) return alert('메뉴 이름은 꼭 입력해주세요 (예: 소고기 미음)');

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
    if (!ingredient) return alert('테스트한 식재료를 입력해주세요');

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
        listArea.innerHTML = `<div style="text-align:center; padding:30px 0; color:#A3958A; font-size:14px; font-weight:600; background:#FFF; border-radius:14px; border:1px dashed #DCD3C8;">아직 기록이 없어요.</div>`;
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
                : `<span style="background:#F2F0FC; padding:4px 8px; border-radius:6px; font-size:12px; font-weight:800; color:#7F77DD;">${r.amount || ''}</span>
                   <span style="background:#F6F2EC; padding:4px 8px; border-radius:6px; font-size:12px; font-weight:800; color:#7A6F68;">${r.reaction || ''}</span>`;

            const btn = planned
                ? `<button onclick="${open}" style="background:#7F77DD; color:#FFF; border:none; border-radius:9px; font-size:12px; font-weight:800; padding:9px 12px; cursor:pointer; white-space:nowrap;">기록하기 ✏️</button>`
                : `<button onclick="deleteFoodRecord('${selectedDateStr}', ${i})" style="background:#FBF8F3; border:1px solid #EDE6DE; border-radius:8px; font-size:12px; font-weight:700; color:#A3958A; cursor:pointer; padding:6px 10px;">삭제</button>`;

            return `
                <div style="background:#FFF; border:1px solid ${planned ? '#FDBA74' : '#EDE6DE'}; padding:16px; border-radius:16px; display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:8px;">
                    <div style="flex:1; min-width:0;">
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                            <span style="font-size:12px; color:#A3958A; font-weight:700;">${showTime(r.time)}</span>
                            <span style="font-weight:900; font-size:15.5px; color:#4A413C; letter-spacing:-0.4px;">${getFoodEmoji(r.menu)} ${r.menu}</span>
                        </div>
                        <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">${chips}</div>
                    </div>
                    <div style="flex-shrink:0;">${btn}</div>
                </div>`;
        }

        // ── 재료 먹여본 기록 ──
        const isPass = r.status === 'pass';
        return `
            <div style="background:#FFF; border:1px solid #EDE6DE; padding:16px; border-radius:14px; display:flex; justify-content:space-between; align-items:flex-start; gap:10px; margin-bottom:8px;">
                <div style="flex:1; min-width:0;">
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                        <span style="font-size:12px; color:#A3958A; font-weight:700;">${showTime(r.time)}</span>
                        <span style="font-weight:900; font-size:15px; color:${isPass ? '#059669' : '#D32F2F'};">${getFoodEmoji(r.ingredient)} ${r.ingredient} 먹여봤어요</span>
                    </div>
                    <span style="display:inline-block; font-size:12px; font-weight:800; padding:4px 8px; border-radius:6px; background:${isPass ? '#ECFDF5' : '#FFF0F1'}; color:${isPass ? '#059669' : '#D32F2F'};">
                        ${isPass ? '🟢 무사 통과' : '🚨 알레르기 반응'}
                    </span>
                </div>
                <button onclick="deleteFoodRecord('${selectedDateStr}', ${i})" style="background:#FBF8F3; border:1px solid #EDE6DE; border-radius:8px; font-size:12px; font-weight:700; color:#A3958A; cursor:pointer; padding:6px 10px;">삭제</button>
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
        passListEl.innerHTML = passedSet.size === 0 ? '<span style="font-size:12.5px; color:#A3958A;">아직 통과한 재료가 없어요.</span>' 
            : Array.from(passedSet).map(ing => `<span style="background:#ECFDF5; color:#059669; border:1px solid #A7F3D0; padding:6px 14px; border-radius:20px; font-size:13.5px; font-weight:800; display:inline-flex; align-items:center; gap:4px;">${getFoodEmoji(ing)} ${ing}</span>`).join('');
    }

    if(failListEl) {
        failListEl.innerHTML = failedSet.size === 0 ? '<span style="font-size:12.5px; color:#A3958A;">알레르기 반응이 나타난 재료가 없어요</span>' 
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
        return alert('어떤 메뉴를 먹였는지 입력해주세요');
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

        /* ⚠️ 글자가 그대로 들어있어야만 차감됐다.
              큐브에 '쇠고기' 라고 적어두면 '소고기 가지 죽' 을 만들어도
              차감이 안 된다. 같은 재료인데 표기만 다른 것이다.
              알레르기 필터에서 쓰는 것과 같은 표를 여기서도 쓴다. */
        const SAME = { '쇠고기': '소고기', '한우': '소고기', '닭': '닭고기',
                       '닭가슴살': '닭고기', '돼지': '돼지고기', '참깨': '깨',
                       '방울토마토': '토마토', '단호박': '호박', '애호박': '호박' };
        const alt = SAME[safeCubeName];

        return rawQty > 0 && (
            safeMenuName.includes(safeCubeName) ||
            (alt && safeMenuName.includes(alt))
        );
    });

    if(matchedCubesForDeduction.length > 0) {
        let listHtml = '';
        matchedCubesForDeduction.forEach(cube => {
            const rawName = getCubeName(cube);
            const rawQty = getCubeQty(cube);
            const icon = (String(rawName).includes('고기') || String(rawName).includes('소') || String(rawName).includes('닭') || cube.cat === 'meat') ? '🥩' : '🥦';
            
            listHtml += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px; background: #FAF7F2; border-radius: 12px; border: 1px solid #EDE6DE; margin-bottom: 8px;">
                <div style="font-size: 14.5px; font-weight: 800; color: #4A413C;">${icon} ${rawName}</div>
                <div style="font-size: 14px; font-weight: 800; color: #A3958A;">
                    잔여 <span style="text-decoration: line-through;">${rawQty}개</span> 👉 <span style="color: #7F77DD; font-size: 16px;">${parseInt(rawQty) - 1}개</span>
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
    setTimeout(() => { alert("냉장고 큐브 1개를 뺐어요"); }, 300);
};

// [건너뛰기] 눌렀을 때
window.skipDeduction = function() {
    document.getElementById('ai-deduction-modal').style.display = 'none';
    saveMealRecord();
};

// ==========================================
// 📸 달력 이미지로 저장 (view-calendar 전체를 찍는다)
// ==========================================
window.downloadCalendarImage = function() {
    // 1. 찰칵! 소리와 함께 캡처 중이라는 걸 보여줍니다.
    const btn = event.currentTarget;
    const originalText = btn.innerHTML;
    btn.innerHTML = '이미지 만드는 중…';
    btn.style.background = '#A3958A';
    btn.disabled = true;

    // 2. 캡처할 타겟: 캘린더 전체 화면!
    const targetEl = document.getElementById('view-calendar');

    // 3. 카메라(html2canvas) 작동!
    html2canvas(targetEl, {
        scale: 2, // 화질 2배 뻥튀기 (인스타/카페 업로드용 고화질)
        backgroundColor: "#F6F2EC", // 배경색 예쁘게 깔아주기
        useCORS: true 
    }).then(canvas => {
        // ✨ 마케팅 핵심: 캡처된 사진 우측 하단에 '워터마크' 강제 삽입!
        const ctx = canvas.getContext('2d');
        ctx.font = "900 24px 'Malgun Gothic', sans-serif";
        ctx.fillStyle = "#A3958A";
        ctx.textAlign = "right";
        ctx.fillText("✨ Designed by 배냇함", canvas.width - 30, canvas.height - 30);

        // 4. 이미지 다운로드 실행
        const link = document.createElement('a');
        link.download = `배냇함_우리아기_식단표_${new Date().getTime()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        // 5. 버튼 원상복구
        btn.innerHTML = originalText;
        btn.style.background = '#4A413C';
        btn.disabled = false;
        
        setTimeout(() => { alert("📸 갤러리에 식단표가 저장되었습니다"); }, 300);
    }).catch(err => {
        console.error("캡처 실패:", err);
        alert("🚨 앗, 이미지 저장에 실패했어요. 다시 시도해주세요");
        btn.innerHTML = originalText;
        btn.style.background = '#4A413C';
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
        btnReverse.style.background = '#FFFFFF'; btnReverse.style.color = '#4A413C'; btnReverse.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
        btnForward.style.background = 'transparent'; btnForward.style.color = '#A3958A'; btnForward.style.boxShadow = 'none';
        viewReverse.style.display = 'block'; viewForward.style.display = 'none';
    } else {
        btnForward.style.background = '#FFFFFF'; btnForward.style.color = '#4A413C'; btnForward.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
        btnReverse.style.background = 'transparent'; btnReverse.style.color = '#A3958A'; btnReverse.style.boxShadow = 'none';
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
        alert("⚠️ 투입할 베이스 재료의 무게를 숫자로 입력해주세요");
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
        : `(아직 한 끼 분량(${mealSize}g)이 안 돼요 재료를 조금 더 늘려볼까요?)`;

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
        statusEl.innerText = '⚠️ 절반 이상이 날아갔어요. 불이 너무 셌거나 계량 오류일 수 있어요';
        return;
    }

    localStorage.setItem('tosil_food_yield', rate.toFixed(3));
    statusEl.style.color = '#7F77DD';
    statusEl.innerHTML = `우리 집 냄비에 맞췄어요. 끓이고 나면 넣은 양의 <b>${Math.round(rate * 100)}%</b>가 남아요.`;
    
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
        alert("⚠️ 만들고 싶은 총량(g)을 숫자로 입력해주세요");
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
        noteEl.style.cssText = 'font-size:12.5px; color:#7F77DD; font-weight:800; margin-top:16px; background:#F0EEFB; padding:12px; border-radius:12px; border:1px dashed #D5D1F4; text-align:center; word-break:keep-all; line-height:1.4;';
        resultBox.appendChild(noteEl);
    }

    // 🚨 [현실 패치 2] 육수 큐브(채수/소고기 육수) 사용자 배려 기능!
    let brothTip = '';
    if (realisticWaterG >= 40) {
        brothTip = `<div style="margin-top:8px; font-size:11.5px; color:#7A6F68; background:#FFF; padding:8px; border-radius:8px; border:1px solid #D5D1F4; box-shadow:0 2px 4px rgba(127, 119, 221,0.05);">🍲 <b>육수 큐브(30ml) 1개</b>를 쓰신다면 맹물은 <b>${realisticWaterG - 30}ml</b>만 부어주세요</div>`;
    }

    noteEl.innerHTML = `💡 젖병 눈금에 맞춘 <b>현실 레시피</b>예요<br>이렇게 끓이면 약 <b>${finalYieldG.toLocaleString()}g</b> 정도 완성돼요.${brothTip}`;
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
        if (untestedDangers.some(u => r.name.includes(u) || r.ingredients.includes(u))) return false; // 아직 안 먹어본 위험재료 철벽 차단
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
        <div style="text-align:center; padding: 60px 20px; background:#FBF8F3; border-radius:16px; border:1px solid #EDE6DE;">
            <div style="color:#4A413C; font-weight:900; font-size:16px; margin-bottom:8px;">우리아기 식단 설계 중...</div>
            <div style="color:#A3958A; font-weight:600; font-size:13.5px;">아기의 취향과 알레르기 데이터를 분석하고 있습니다.</div>
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
    if (!plan || plan.length === 0) return alert("먼저 식단표를 생성해주세요");

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
    
    alert("🎉 성공 오늘부터 7일간의 달력에 식단이 자동으로 등록되었습니다.");
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
            @keyframes cardPulse { 0% { transform: scale(1); background-color: #FFFFFF; } 50% { transform: scale(0.97); background-color: #F7F5FD; } 100% { transform: scale(1); background-color: #FFFFFF; } }
            .swapped-card { animation: cardPulse 0.4s ease-out forwards; }
            details > summary::-webkit-details-marker { display: none; }
            details[open] summary .arrow { transform: rotate(180deg); }
            /* 💡 장바구니 체크리스트용 CSS */
            .shop-tag { display:inline-block; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); padding:6px 12px; border-radius:20px; color:#FFF; font-weight:700; font-size:13px; margin-bottom:6px; margin-right:6px; cursor:pointer; transition:0.2s; }
            .shop-tag.checked { background:rgba(255,255,255,0.05); color:#A3958A; text-decoration:line-through; border-color:transparent; }
        </style>

                      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 16px; padding: 0 4px;">
            <div style="flex: 1; min-width: 0;">
                <div style="font-size: 13px; font-weight: 800; color: #7F77DD; margin-bottom: 4px;">이번 주 맞춤형 식단</div>
                <div data-plus-head style="font-size: 18px; font-weight: 900; color: #4A413C; letter-spacing: -0.5px;">우리 아기 7일 식단표</div>
            </div>
        </div>
        
        <div class="hide-scroll" style="display: flex; gap: 12px; overflow-x: auto; padding-bottom: 16px; padding-top: 4px; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch;">
    `;

    plan.forEach((day, index) => {
        let bg = '#FFFFFF'; let border = '#EDE6DE'; let badgeBg = '#F2F0FC'; let badgeColor = '#7F77DD';
        if (day.type.includes('냉장고')) { bg = '#FFF5F5'; border = '#FECACA'; badgeBg = '#FFF0F1'; badgeColor = '#D32F2F'; }
        if (day.type.includes('테스트')) { bg = '#FFFAF0'; border = '#FDE68A'; badgeBg = '#FFF9E6'; badgeColor = '#B45309'; }
        if (day.type.includes('변경됨')) { bg = '#FFFFFF'; border = '#DDD9F5'; badgeBg = '#F0EEFB'; badgeColor = '#6A61CE'; }

        let cookTime = 0;
        if(day.recipe.recipe) {
            day.recipe.recipe.forEach(step => {
                const match = step.match(/(\d+)분/);
                if(match) cookTime += parseInt(match[1]);
            });
        }
        let timeTag = cookTime > 0 ? `<span style="font-size:11.5px; font-weight:800; color:#A3958A;">⏳ 약 ${cookTime + 5}분</span>` : '';

        // 💡 [디테일 1] 철분 듬뿍을 빨간색 ➔ 파란색(#7F77DD)으로 변경하여 경고와 차별화!
        let goalBadge = '';
        if (day.recipe.goal === 'iron') goalBadge = '<span style="color:#7F77DD; font-weight:900; font-size:11.5px;">#철분듬뿍</span>';
        else if (day.recipe.goal === 'poop') goalBadge = '<span style="color:#B45309; font-weight:900; font-size:11.5px;">#장튼튼</span>';
        else if (day.recipe.goal === 'weight') goalBadge = '<span style="color:#059669; font-weight:900; font-size:11.5px;">#체중쑥쑥</span>';
        else goalBadge = '<span style="color:#7A6F68; font-weight:900; font-size:11.5px;">#영양만점</span>';

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
                    <div style="font-size: 13px; font-weight: 900; color: #A3958A;">Day ${index + 1}</div>
                    <button onclick="event.stopPropagation(); swapDailyRecipe(${index})" style="font-size: 11.5px; font-weight: 800; color: #7A6F68; background: #FFFFFF; border:1px solid #DCD3C8; padding: 4px 10px; border-radius: 8px; cursor:pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.02); transition: 0.2s;">
                        교체
                    </button>
                </div>
                
                <div style="display:flex; align-items:center; gap:6px; margin-bottom: 8px;">
                    <div style="font-weight: 900; font-size: 18px; color: #4A413C; letter-spacing: -0.5px;">${day.day}요일</div>
                    ${allergenBadge}
                </div>
                
                <div style="display: inline-block; align-self: flex-start; color: ${badgeColor}; font-size: 11px; font-weight: 800; margin-bottom: 12px;">
                    ${day.type === '안전 밸런스 식단' ? '• 안전 식단' : `• ${day.type}`}
                </div>
                
                <div style="flex: 1; display: flex; align-items: flex-start;">
                    <div style="font-size: 14.5px; font-weight: 900; color: #4A413C; line-height: 1.4; word-break: keep-all; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                        ${day.recipe.name}
                    </div>
                </div>

                <div style="margin-top: auto; padding-top: 12px; border-top: 1px dashed ${border === '#EDE6DE' ? '#EDE6DE' : border}; display:flex; justify-content:space-between; align-items:center;">
                    ${timeTag}
                    ${goalBadge}
                </div>
            </div>
        `;
    });
    html += `</div>`;

    html += `
        <button onclick="applyPlanToCalendar()" style="width: 100%; background: #4A413C; color: #FFF; border: none; padding: 16px; border-radius: 14px; font-size: 15.5px; font-weight: 900; margin-bottom: 24px; cursor: pointer; box-shadow: 0 6px 16px rgba(0,0,0,0.1); transition: 0.2s; display:flex; align-items:center; justify-content:center; gap:8px;">
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
    if (ironCnt >= 3) { reportTitle = "소고기 듬뿍 철분 집중 보충 식단"; reportColor = "#7F77DD"; reportBg = "#F2F0FC"; } 
    else if (weightCnt >= 3) { reportTitle = "포만감 든든 체중 증량 식단"; reportColor = "#059669"; reportBg = "#ECFDF5"; }
    else if (poopCnt >= 3) { reportTitle = "속이 편안한 황금똥 식단"; reportColor = "#B45309"; reportBg = "#FFF9E6"; }

    // 아코디언(details)으로 깔끔하게 접어두면서, 누르면 상세 횟수가 나오도록!
    html += `
        <details style="background: #FFFFFF; border: 1px solid #EDE6DE; border-radius: 16px; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
            <summary style="padding: 16px 20px; font-size: 14px; font-weight: 800; color: #4A413C; cursor: pointer; display: flex; justify-content: space-between; align-items: center; outline:none;">
                               <div data-plus-head style="display:flex; align-items:center; gap:8px;"><span style="font-size:16px;">📊</span> 주간 영양 분석 리포트</div>
                <span class="arrow" style="font-size: 12px; color: #A3958A; transition:0.3s;">▼</span>
            </summary>
            <div style="padding: 0 20px 20px; border-top: 1px dashed #EDE6DE; margin-top: 4px; padding-top: 16px;">
                <div style="font-size: 14.5px; font-weight: 800; color: ${reportColor}; line-height: 1.4; margin-bottom: 8px;">
                    이번 주는 [${reportTitle}]으로 설계되었어요
                </div>
                <div style="font-size: 13px; font-weight: 600; color: #7A6F68;">
                    철분 특화 ${ironCnt}회 · 소화/배변 ${poopCnt}회 · 체중/골격 ${weightCnt}회
                </div>
            </div>
        </details>
    `;

    html += `
        <details style="background: #FFFFFF; border: 1px solid #EDE6DE; border-radius: 16px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
            <summary style="padding: 16px 20px; font-size: 14px; font-weight: 800; color: #4A413C; cursor: pointer; display: flex; justify-content: space-between; align-items: center; outline:none;">
               <div data-plus-head style="display:flex; align-items:center; gap:8px;"><span style="font-size:16px;">📋</span> 일주일 식단표 한눈에 보기</div>
                <span class="arrow" style="font-size: 12px; color: #A3958A; transition:0.3s;">▼</span>
            </summary>
            <div style="padding: 0 20px 20px; border-top: 1px dashed #EDE6DE; margin-top: 4px; padding-top: 12px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 13.5px; text-align: left;">
                    <tbody>
                        ${plan.map((p, idx) => `
                            <tr style="border-bottom: 1px solid #F6F2EC;">
                                <td style="padding: 12px 4px; font-weight: 900; color: #4A413C; width: 40px;">${p.day}</td>
                                <td style="padding: 12px 4px; font-weight: 700; color: #7A6F68;">
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
        : '<div style="color:#4ADE80; font-size:14px; font-weight:800; text-align:center; padding:10px 0;">필요한 재료가 냉장고에 모두 있습니다 🎉</div>';

    html += `
        <div style="background: #4A413C; border-radius: 16px; padding: 24px; text-align: left; box-shadow: 0 4px 16px rgba(0,0,0,0.05); position: relative; overflow: hidden; margin-bottom: 32px;">
            <div style="font-size: 12px; font-weight: 900; color: #7F77DD; margin-bottom: 8px;">스마트 장보기 비서</div>
            <div style="font-size: 15.5px; font-weight: 800; color: #FFFFFF; margin-bottom: 6px; line-height:1.4;">
                이번 주 식단을 완성하려면<br><span style="color:#4ADE80;">총 ${missingCount}개의 식재료</span>가 부족합니다.
            </div>
            <div style="font-size: 12px; color: #A3958A; font-weight: 600; margin-bottom: 20px;">
                💡 장 보실 때 재료를 터치해서 하나씩 지워보세요
            </div>
            
            <div style="margin-bottom: 24px;">
                ${missingTagsHtml}
            </div>
            
            <a href="https://link.coupang.com/a/e2f58ZVlhQ" target="_blank" style="display: flex; justify-content:center; align-items:center; gap:8px; width: 100%; background: #7F77DD; color: #FFFFFF; padding: 16px 0; border-radius: 12px; font-weight: 900; font-size: 15px; text-decoration: none; transition: 0.2s;">
                부족한 재료 로켓프레시로 한 번에 담기 〉
            </a>
        </div>
    `;

    container.innerHTML = html;
};