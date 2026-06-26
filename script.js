// ==========================================
// 1. 전역 상태 변수 및 통합 데이터 베이스
// ==========================================
let trendChart = null;
let currentRegion = 'all'; 
let currentSubTab = 'event'; 
let apiFestivals = []; 
let hotplacesData = []; 
let currentSubRegion = 'all'; 

let checklistData = [];
let currentAvailablePlays = [];
let currentDday = 0;
let selectedPillType = ''; 
let feverChartObj = null; 
let feverTimerInterval = null; 
let currentDonutChart = null; 
let playTimerInterval = null;

const PLAY_TIME_SEC = 300; // 5분 = 300초
const babyTips = [
    { min: 0, max: 1, tip: "지금은 아이와 눈 맞춤을 연습할 시간이에요! 🤍" }, 
    { min: 2, max: 3, tip: "목 가누기 연습! 하루 5분 터미타임을 시도해보세요. 💪" }, 
    { min: 4, max: 6, tip: "뒤집기 시작! 주변에 위험한 물건이 없는지 꼼꼼히 확인해주세요." }, 
    { min: 7, max: 9, tip: "분리불안 시작! 화장실 갈 때도 '엄마 곧 올게'라고 꼭 말해주세요!" }, 
    { min: 10, max: 12, tip: "잡고 서기 시작! 집안 모서리 보호대를 다시 한번 점검할 시기예요. 🚧" }, 
    { min: 13, max: 18, tip: "자아 형성기! '안 돼'라는 말보다 '이거 해볼까?' 하고 대안을 제시해 주세요. 🗣️" }, 
    { min: 19, max: 24, tip: "에너지 폭발! 대근육 발달을 위해 안전한 놀이터 바깥놀이를 추천해요. 🏃‍♂️" }, 
    { min: 25, max: 36, tip: "언어 폭발기! 아이의 엉뚱한 말에도 귀 기울이고 풍부하게 리액션 해주세요. 💬" }
];

// ==========================================
// 2. 화면 내비게이션 엔진
// ==========================================
function switchTab(id, el) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const targetTab = document.getElementById('tab-' + id);
    if(targetTab) targetTab.classList.add('active');
    if (el) el.classList.add('active'); 
    else { const navEl = document.getElementById('nav-' + id); if (navEl) navEl.classList.add('active'); }
    window.scrollTo(0,0);
}

function directGoOuting(subType) {
    switchTab('hotplace', document.getElementById('nav-hotplace'));
    switchOutingSubTab(subType);
}

function directGoToolbox(toolType) {
    switchTab('toolbox', document.getElementById('nav-toolbox'));
    const targetChip = document.getElementById('btn-tool-' + toolType);
    switchTool(toolType, targetChip);
}

function switchOutingSubTab(type) {
    document.querySelectorAll('.segment-btn').forEach(b => b.classList.remove('active'));
    const segBtn = document.getElementById('seg-' + type);
    if(segBtn) segBtn.classList.add('active');
    currentSubTab = type; currentSubRegion = 'all';
    const subRow = document.getElementById('sub-filter-row');
    if (type === 'event' && currentRegion !== 'all') { generateSubFilters(currentRegion); } 
    else { if(subRow) subRow.style.display = 'none'; }
    filterPlaces();
}

function switchTool(panelId, el) {
    document.querySelectorAll('.tool-chip').forEach(c => c.classList.remove('active'));
    if(el) el.classList.add('active');
    else { const targetChip = document.getElementById('btn-tool-' + panelId); if(targetChip) targetChip.classList.add('active'); }
    
    const toolboxTab = document.getElementById('tab-toolbox');
    if(toolboxTab) {
        toolboxTab.querySelectorAll('.panel-block').forEach(p => { p.classList.remove('active'); p.style.display = 'none'; });
    }
    
    const targetPanel = document.getElementById('panel-' + panelId);
    if(targetPanel) { targetPanel.classList.add('active'); targetPanel.style.display = 'block'; }

    if (panelId === 'fever') {
        const wInput = document.getElementById('v-weight');
        const savedW = localStorage.getItem('tosil_latest_weight');
        if (wInput && savedW && !wInput.value) {
            wInput.value = savedW;
            const label = wInput.parentElement ? wInput.parentElement.previousElementSibling : null;
            if (label && !label.innerText.includes('자동입력')) {
                label.innerHTML += ' <span style="font-size:11px; color:var(--primary); background:rgba(49,130,246,0.1); padding:2px 6px; border-radius:6px; margin-left:6px;">성장기록 자동입력</span>';
            }
        }
    }
}

function navigateToPanel(targetPanel) {
    if (targetPanel === 'hotplace') { switchTab('hotplace'); } 
    else { switchTab('toolbox'); switchTool(targetPanel === 'ledger' ? 'money' : targetPanel); }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function initQuickScrollDrag() {
    const slider = document.querySelector('.quick-scroll-wrap');
    if(!slider) return;
    let isDown = false, startX, scrollLeft;
    slider.addEventListener('mousedown', (e) => { isDown = true; slider.style.cursor = 'grabbing'; startX = e.pageX - slider.offsetLeft; scrollLeft = slider.scrollLeft; });
    slider.addEventListener('mouseleave', () => { isDown = false; slider.style.cursor = 'auto'; });
    slider.addEventListener('mouseup', () => { isDown = false; slider.style.cursor = 'auto'; });
    slider.addEventListener('mousemove', (e) => { if(!isDown) return; e.preventDefault(); slider.scrollLeft = scrollLeft - (e.pageX - slider.offsetLeft - startX) * 2; });
}

function getV(id) { const el = document.getElementById(id); return !el ? 0 : Number(el.value.replace(/,/g,'')) || 0; }
function formatNum(el) { let v = el.value.replace(/[^0-9]/g, ''); if(v) el.value = Number(v).toLocaleString(); }

async function loadAllExternalData() {
    filterPlaces();
    try {
        if (window.location.protocol !== 'file:') {
            const resFest = await fetch('festivals.json?v=' + new Date().getTime());
            if (resFest.ok) { apiFestivals = await resFest.json(); filterPlaces(); }
            const resPlaces = await fetch('places.json?v=' + new Date().getTime());
            if (resPlaces.ok) { hotplacesData = await resPlaces.json(); filterPlaces(); }
        }
    } catch (e) { console.warn("데이터 로드 실패 - 앱은 정상 작동 중"); }
}

function setRegion(region, btn) {
    currentRegion = region;
    document.querySelectorAll('.filter-wrap .filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (currentSubTab === 'event') { generateSubFilters(region); currentSubRegion = 'all'; }
    filterPlaces();
}

function toggleAccordion(index) {
    const body = document.getElementById('acc-body-' + index), arrow = document.getElementById('acc-arrow-' + index);
    if(!body) return;
    if(body.style.display === 'block') { body.style.display = 'none'; if(arrow) arrow.style.transform = 'rotate(0deg)'; } 
    else { body.style.display = 'block'; if(arrow) arrow.style.transform = 'rotate(180deg)'; }
}

function openGoogleForm() { window.open('https://forms.gle/gWYhuNrwiKNvyCEQA', '_blank'); }
function generateSubFilters(mainRegion) {
    const subRow = document.getElementById('sub-filter-row'), subRegions = new Set();
    if(!subRow) return;

    let source = [...apiFestivals, ...hotplacesData.filter(p => p.isEvent)];
    source.forEach(item => {
        const addr = item.addr1 || item.addr || ''; let isMatched = false;
        if (mainRegion === 'seoul' && addr.includes('서울')) isMatched = true;
        if (mainRegion === 'gyeonggi' && (addr.includes('경기') || addr.includes('인천'))) isMatched = true;
        if (mainRegion === 'chungcheong' && (addr.includes('충청') || addr.includes('충북') || addr.includes('충남') || addr.includes('대전') || addr.includes('세종'))) isMatched = true;
        if (mainRegion === 'gangwon' && addr.includes('강원')) isMatched = true;
        if (mainRegion === 'jeolla' && (addr.includes('전라') || addr.includes('전북') || addr.includes('전남') || addr.includes('광주'))) isMatched = true;
        if (mainRegion === 'gyeongsang' && (addr.includes('경상') || addr.includes('경북') || addr.includes('경남') || addr.includes('부산') || addr.includes('대구') || addr.includes('울산'))) isMatched = true;
        if (mainRegion === 'jeju' && addr.includes('제주')) isMatched = true;
        if (isMatched) { const parts = addr.split(' '); if (parts[1]) subRegions.add(parts[1]); }
    });

    if (subRegions.size === 0) { subRow.style.display = 'none'; return; }
    
    // ✨ [수정된 부분] 가로 스크롤 & 버튼 사이 간격 적용
    subRow.style.display = 'flex';
    subRow.style.overflowX = 'auto'; 
    subRow.style.gap = '8px';
    subRow.style.paddingBottom = '8px';

    // ✨ [수정된 부분] 버튼이 찌그러지지 않도록 flex-shrink:0; white-space:nowrap; 추가
    let html = `<button class="filter-btn ${currentSubRegion === 'all' ? 'active' : ''}" style="padding:6px 12px; font-size:12px; flex-shrink:0; white-space:nowrap;" onclick="setSubRegion('all', this)">시·군·구 전체</button>`;
    
    subRegions.forEach(sub => { 
        html += `<button class="filter-btn ${currentSubRegion === sub ? 'active' : ''}" style="padding:6px 12px; font-size:12px; flex-shrink:0; white-space:nowrap;" onclick="setSubRegion('${sub}', this)">${sub}</button>`; 
    });
    
    subRow.innerHTML = html;
}

function setSubRegion(sub, btn) {
    document.querySelectorAll('#sub-filter-row .filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active'); currentSubRegion = sub; filterPlaces();
}

function filterPlaces() {
    const searchInput = document.getElementById('spot-search');
    const keyword = searchInput ? searchInput.value.toLowerCase().trim() : '', container = document.getElementById('hotplace-container');
    if(!container) return; container.innerHTML = ''; 
    const todayStr = new Date().toISOString().split('T')[0], todayNum = parseInt(todayStr.replace(/-/g,''));

    if (currentSubTab === 'event') {
        let eventSource = Array.from(new Map([...apiFestivals, ...hotplacesData.filter(p => p.isEvent)].map(i => [i.title, i])).values());
        const filteredEvents = eventSource.filter(p => {
            let addr = p.addr1 || p.addr || p.locText || '', title = p.title || '';
            if (p.expiryDate && todayStr > p.expiryDate) return false; 
            let rawEndDate = p.eventenddate || p.endDate || '';
            if (rawEndDate) { let endStr = String(rawEndDate).replace(/[^0-9]/g, ''); if (endStr.length >= 8 && parseInt(endStr.substring(0, 8)) < todayNum) return false; }
            let matchesRegion = false;
            if (currentRegion === 'all') { matchesRegion = true; } 
            else {
                if (currentRegion === 'seoul') matchesRegion = addr.includes('서울');
                if (currentRegion === 'gyeonggi') matchesRegion = addr.includes('경기') || addr.includes('인천');
                if (currentRegion === 'chungcheong') matchesRegion = addr.includes('충청') || addr.includes('충북') || addr.includes('충남') || addr.includes('대전') || addr.includes('세종');
                if (currentRegion === 'gangwon') matchesRegion = addr.includes('강원');
                if (currentRegion === 'jeolla') matchesRegion = addr.includes('전라') || addr.includes('전북') || addr.includes('전남') || addr.includes('광주');
                if (currentRegion === 'gyeongsang') matchesRegion = addr.includes('경상') || addr.includes('경북') || addr.includes('경남') || addr.includes('부산') || addr.includes('대구') || addr.includes('울산');
                if (currentRegion === 'jeju') matchesRegion = addr.includes('제주');
            }
            return matchesRegion && (currentSubRegion === 'all' || addr.includes(currentSubRegion)) && `${title} ${addr}`.toLowerCase().includes(keyword);
        });
        
        if(filteredEvents.length === 0) { container.innerHTML = `<p style="text-align:center; padding:50px 0; color:var(--text-sub); font-size:14px; font-weight:700;">🔍 예정된 주말 행사가 없습니다.</p>`; return; }
        const gridEl = document.createElement('div'); gridEl.className = 'festival-grid';
        filteredEvents.forEach(item => {
            const title = item.title || '', addr = item.addr1 || item.addr || item.locText || '', rawImg = item.firstimage || '';
            let sd = item.eventstartdate || item.datetime || '', ed = item.eventenddate || '';
            if(sd.length >= 8) sd = `${sd.substring(4,6)}.${sd.substring(6,8)}`; if(ed.length >= 8) ed = `${ed.substring(4,6)}.${ed.substring(6,8)}`;
            const dateText = ed ? `${sd} ~ ${ed}` : sd, shortAddr = `${addr.split(' ')[0] || ''} ${addr.split(' ')[1] || ''}`.replace('특별', '').replace('광역', '');
            const card = document.createElement('div'); card.className = 'fest-card';
            let imgHtml = rawImg ? `<img src="${rawImg}" onerror="this.style.display='none';">` : `<div style="width:100%; height:100%; background:linear-gradient(135deg, #EBF4FF, #EAEFF7); display:flex; align-items:center; justify-content:center; font-size:32px;">🎪</div>`;
            card.onclick = () => openFestivalModal(title, dateText, addr, item.tel || '정보없음', item.review || '', title, rawImg || '⚙️GRAPHIC');
            card.innerHTML = `<div class="fest-card-img-wrap"><span class="fest-dday-tag">🎉 축제</span>${imgHtml}</div><div class="fest-card-info"><div class="fest-card-title">${title}</div><div class="fest-card-meta">${shortAddr}</div></div>`;
            gridEl.appendChild(card);
        }); container.appendChild(gridEl);
    } else {
        const filteredPlaces = hotplacesData.filter(p => {
            if (p.expiryDate && todayStr > p.expiryDate) return false;
            return !p.isEvent && (currentRegion === 'all' || p.region === currentRegion) && `${p.title} ${p.desc} ${p.locText}`.toLowerCase().includes(keyword);
        });
        if(filteredPlaces.length === 0) { container.innerHTML = `<p style="text-align:center; padding:35px; color:var(--text-sub); font-size:14px; font-weight:700;">🔍 아직 등록된 검증 육아지도가 없습니다.</p>`; return; }
        filteredPlaces.forEach((p, index) => {
            let tagsHTML = p.tags ? p.tags.map(tag => `<span class="tag ${tag.c}">${tag.t}</span>`).join('') : '';
            let timeHTML = p.datetime ? `<div style="font-size: 12.5px; color: var(--primary); font-weight: 800; margin-bottom: 8px; background: rgba(49,130,246,0.06); padding: 6px 10px; border-radius: 8px; display: inline-block;">⏰ ${p.datetime}</div>` : '';
            container.innerHTML += `<div class="accordion-item"><div class="accordion-header" onclick="toggleAccordion(${index})"><div class="accordion-title-wrap"><span class="place-loc">${p.locText}</span><strong style="color:var(--text-m); font-weight:800; font-size:15px;">${p.title}</strong><span style="font-size: 14.5px;">${p.emoji || '📍'}</span></div><span id="acc-arrow-${index}" class="accordion-arrow">▼</span></div><div id="acc-body-${index}" class="accordion-body">${timeHTML}<div class="place-desc">${p.desc}</div><div>${tagsHTML}</div><div class="place-review"><strong>💬 팩트 검증 피드:</strong> "${p.review}"</div><button class="btn-main" style="margin-top:16px; font-size:14px; padding:12px;" onclick="openFestivalModal('${p.title}', '${p.datetime || '상시 운영'}', '${p.locText}', '정보없음', '${p.review}', '${p.query}', '')">🚗 내비게이션 길찾기 및 상세 정보 열기 〉</button></div></div>`;
        });
    }
}

function openFestivalModal(title, dateText, addr, tel, review, query, image) {
    const body = document.getElementById('modal-dynamic-body');
    if(!body) return;
    const naverUrl = 'https://m.map.naver.com/search2/search.naver?query=' + encodeURIComponent(query);
    const tmapUrl = 'https://search.tmap.co.kr/search.html?keyword=' + encodeURIComponent(query);
    const kakaoUrl = 'https://map.kakao.com/?q=' + encodeURIComponent(query);
    
    const telLink = tel && tel !== '정보없음' 
        ? `<a href="tel:${tel}" style="flex:1; display:flex; justify-content:center; align-items:center; background:#F2F5F8; color:#4E5968; border-radius:14px; font-size:14px; font-weight:800; text-decoration:none; white-space:nowrap;">📞 전화 문의</a>` 
        : `<div style="flex:1; display:flex; justify-content:center; align-items:center; background:#F2F5F8; color:#A0AEC0; border-radius:14px; font-size:14px; font-weight:800; white-space:nowrap; opacity:0.6;">📞 번호 없음</div>`;
        
    const modalImgHtml = (image && !image.startsWith('⚙️')) ? `<img src="${image}" style="width:100%; height:160px; object-fit:cover; border-radius:18px; margin-bottom:16px;" onerror="this.style.display='none'">` : '';

    body.innerHTML = `
        <div class="modal-header-wrap"><span class="modal-emoji">🌲</span><div class="modal-title">${title}</div></div>
        ${modalImgHtml}
        <div class="modal-meta-box">
            <div class="modal-meta-row"><span class="modal-meta-label">🗓️ 기간</span><span class="modal-meta-value">${dateText}</span></div>
            <div class="modal-meta-row"><span class="modal-meta-label">📍 장소</span><span class="modal-meta-value">${addr}</span></div>
        </div>
        <div class="place-review" style="margin-top:0; margin-bottom:20px; background:#F2F5F8; border-radius:14px;"><strong>💬 토실이 팩트 체크:</strong> "${review || '맞춤형 주말 안전 인프라입니다.'}"</div>
        <div style="font-size:12px; font-weight:800; color:var(--text-s); margin-bottom:8px;">🚗 아기랑 모바일 길찾기 서비스</div>
        <div class="modal-navi-container">
            <a href="${naverUrl}" target="_blank" class="modal-navi-item"><div class="navi-badge-icon naver">N</div><span>네이버 지도</span></a>
            <a href="${tmapUrl}" target="_blank" class="modal-navi-item"><div class="navi-badge-icon tmap">T</div><span>티맵(TMap)</span></a>
            <a href="${kakaoUrl}" target="_blank" class="modal-navi-item"><div class="navi-badge-icon kakao">K</div><span>카카오내비</span></a>
        </div>
        <div class="modal-action-grid" style="display:flex; gap:10px;">
            ${telLink}
            <button class="btn-main" style="flex:1; margin-top:0; padding:16px; border-radius:14px; background:#3182F6 !important; color:#FFF !important; font-weight:900; border:none; white-space:nowrap; cursor:pointer;" onclick="closeFestivalModalForce()">확인 완료</button>
        </div>
    `;
    const modalWrap = document.getElementById('premium-modal');
    if(modalWrap) modalWrap.style.display = 'flex';
}

function closeFestivalModalForce() { const m = document.getElementById('premium-modal'); if(m) m.style.display = 'none'; }
function closeFestivalModal(e) { if(e.target.className === 'modal-overlay') closeFestivalModalForce(); }

// ==========================================
// 🚨 3. 119 SOS 센터 모달
// ==========================================
window.openSOSModal = function() {
    const modal = document.getElementById('sos-modal'); if(!modal) return;
    const medStep = document.getElementById('sos-step-medical'); if(medStep) medStep.style.setProperty('display', 'none', 'important');
    const cryStep = document.getElementById('sos-step-cry'); if(cryStep) cryStep.style.setProperty('display', 'none', 'important');
    const backBtn = document.getElementById('btn-sos-back'); if(backBtn) backBtn.style.setProperty('display', 'none', 'important');
    const choiceStep = document.getElementById('sos-step-choice'); if(choiceStep) choiceStep.style.setProperty('display', 'block', 'important');
    
    const medBtn = document.querySelector('.sos-btn-medical');
    const cryBtn = document.querySelector('.sos-btn-cry');
    if(medBtn) medBtn.style.setProperty('display', 'flex', 'important');
    if(cryBtn) cryBtn.style.setProperty('display', 'flex', 'important');
    modal.style.display = 'flex';
};
window.showSosMedical = function() { 
    const choiceStep = document.getElementById('sos-step-choice'); if(choiceStep) choiceStep.style.setProperty('display', 'none', 'important');
    const medBtn = document.querySelector('.sos-btn-medical');
    const cryBtn = document.querySelector('.sos-btn-cry');
    if(medBtn) medBtn.style.setProperty('display', 'none', 'important');
    if(cryBtn) cryBtn.style.setProperty('display', 'none', 'important');
    const medStep = document.getElementById('sos-step-medical'); if(medStep) medStep.style.setProperty('display', 'block', 'important');
    const backBtn = document.getElementById('btn-sos-back'); if(backBtn) backBtn.style.setProperty('display', 'flex', 'important');
};
window.showSosChecklist = function() { 
    const choiceStep = document.getElementById('sos-step-choice'); if(choiceStep) choiceStep.style.setProperty('display', 'none', 'important');
    const medBtn = document.querySelector('.sos-btn-medical');
    const cryBtn = document.querySelector('.sos-btn-cry');
    if(medBtn) medBtn.style.setProperty('display', 'none', 'important');
    if(cryBtn) cryBtn.style.setProperty('display', 'none', 'important');
    const cryStep = document.getElementById('sos-step-cry'); if(cryStep) cryStep.style.setProperty('display', 'block', 'important');
    const backBtn = document.getElementById('btn-sos-back'); if(backBtn) backBtn.style.setProperty('display', 'flex', 'important');
};
window.closeSOSForce = function() { const modal = document.getElementById('sos-modal'); if(modal) modal.style.display = 'none'; };
window.closeSOS = function(e) { if(e.target.id === 'sos-modal') closeSOSForce(); };

// ==========================================
// 💰 [가계부 업그레이드] 투트랙 실시간 저금통 엔진 병합
// ==========================================
async function saveLedgerToFirebase(data) {
    if (typeof db !== 'undefined' && typeof setDoc === 'function') {
        const syncCode = localStorage.getItem("family_sync_code") || "unlinked_local_diary";
        try { await setDoc(doc(db, "ledger_" + syncCode, "status"), data); } catch (e) { console.error(e); }
    }
    localStorage.setItem('tosil_ledger_data', JSON.stringify(data));
    updateLedgerUI();
}

const formatter = new Intl.NumberFormat('ko-KR'); 
function drawDonutChart(d, f, e) {
    const canvas = document.getElementById('donutChart');
    if(!canvas || typeof Chart === 'undefined') return;
    const ctx = canvas.getContext('2d');
    if(currentDonutChart) { currentDonutChart.destroy(); }
    currentDonutChart = new Chart(ctx, { 
        type: 'doughnut', 
        data: { 
            labels: ['기저귀/위생', '분유/이유식', '장난감/기타'], 
            datasets: [{ data: [d, f, e], backgroundColor: ['#3182F6', '#56D364', '#FFCF54'], borderWidth: 0, hoverOffset: 6 }] 
        }, 
        options: { 
            responsive: true, maintainAspectRatio: false, cutout: '72%', 
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(c) { return ' ' + c.label + ': ' + formatter.format(c.raw) + '원'; } } } }, 
            animation: { animateScale: true, animateRotate: true } 
        } 
    });
}

function analyzeMoney() {
    const budgetInput = document.getElementById('v-budget');
    let userBudget = 500000; if (budgetInput && budgetInput.value) { userBudget = parseInt(budgetInput.value.replace(/,/g, '')) || 500000; }
    localStorage.setItem('tosil_budget', userBudget);
    
    const d = getV('v-diaper'), f = getV('v-food'), e = getV('v-etc');
    const detailsTotal = d + f + e;
    
    let ledger = JSON.parse(localStorage.getItem('tosil_ledger_data')) || { total: 0, savedTotal: 0, goal: "", goalAmount: 100000, history: [] };
    
    const finalTotal = detailsTotal > 0 ? detailsTotal : ledger.total;
    if(finalTotal === 0 && ledger.savedTotal === 0) return alert("지출하신 금액을 1원이라도 입력해 주세요! 💰");
    
    localStorage.setItem('tosil_money_total', finalTotal); 
    const history = JSON.parse(localStorage.getItem('TosilBabyApp')) || {};
    const date = new Date(), curY = date.getFullYear(), curM = date.getMonth() + 1, monthKey = `${curY}-${curM}`;
    history[monthKey] = finalTotal; 
    localStorage.setItem('TosilBabyApp', JSON.stringify(history));
    
    const moneyTotalEl = document.getElementById('money-total');
    if(moneyTotalEl) moneyTotalEl.innerText = formatter.format(finalTotal);
    
    const lastM = curM === 1 ? 12 : curM - 1, lastY = curM === 1 ? curY - 1 : curY, lastKey = `${lastY}-${lastM}`;
    let diffMsg = "";
    if(history[lastKey]) {
        const diff = finalTotal - history[lastKey];
        if (diff > 0) diffMsg = `지난달보다 <span style="color:var(--danger)">${formatter.format(diff)}원 더 썼어요! 💸</span>`;
        else if (diff < 0) diffMsg = `지난달보다 <span style="color:var(--success)">${formatter.format(Math.abs(diff))}원 아꼈어요! 🎉</span>`;
        else diffMsg = `지난달과 지출액이 완벽히 똑같습니다! ⚖️`;
    } else { diffMsg = "첫 분석 시작! 이번 달이 기준점이 됩니다."; }
    
    const moneyDiffEl = document.getElementById('money-diff');
    if(moneyDiffEl) moneyDiffEl.innerHTML = diffMsg;
    
    const percent = Math.round((finalTotal / userBudget) * 100);
    let insightHtml = `<strong style="font-size:15px; display:block; margin-bottom:8px;">📊 소비 인사이트</strong>`;
    
    if (detailsTotal > 0) {
        const maxVal = Math.max(d, f, e);
        if (maxVal === d && d > 0) insightHtml += `🧻 <strong>기저귀/위생용품 비중이 1위!</strong><br>기저귀는 핫딜 뜰 때 쟁여두는 게 최고입니다!`;
        else if (maxVal === f && f > 0) insightHtml += `🍼 <strong>식비 비중이 1위!</strong><br>아이의 성장 속도를 고려하면 정상입니다! 잘 먹는 건 축복입니다 💪`;
        else if (maxVal === e && e > 0) insightHtml += `🧸 <strong>장난감/기타 비중이 1위!</strong><br>'당근마켓'을 적절히 섞으면 효율이 배가 됩니다 🥕`;
    } else {
        insightHtml += `💡 <strong>실시간 투트랙 머니로그 사용 중!</strong><br>아래 세부 항목을 입력하시면 월간 소비 정밀 도넛 차트를 확인하실 수 있습니다.`;
    }

    if(percent > 100) insightHtml += `<br><br><span style="color:var(--danger)">🚨 <strong>주의:</strong></span> 목표 예산을 초과했습니다!`;
    else if(percent < 80) insightHtml += `<br><br><span style="color:var(--success)">🌿 <strong>우수:</strong></span> 알뜰하게 육아 중입니다!`;
    else insightHtml += `<br><br>👍 <strong>안정:</strong> 이상적인 육아 소비 패턴입니다.`;
    
    const moneyInsightEl = document.getElementById('money-insight-detail');
    if(moneyInsightEl) moneyInsightEl.innerHTML = insightHtml;
    
    const avgPercentEl = document.getElementById('money-avg-percent');
    if(avgPercentEl) avgPercentEl.innerText = `설정한 목표 예산 대비 ${percent}% 수준`;
    
    const resBox = document.getElementById('money-result'); 
    if(resBox) resBox.style.display = 'block';
    
    setTimeout(() => drawDonutChart(d, f, e), 100);
    
    ledger.total = finalTotal;
    saveLedgerToFirebase(ledger);
    updateHomeDashboard(); 
}
window.analyzeMoney = analyzeMoney;

function toggleHistory() {
    const area = document.getElementById('history-list-area');
    if(!area) return;
    if(area.style.display === 'block') { area.style.display = 'none'; } 
    else {
        const history = JSON.parse(localStorage.getItem('TosilBabyApp')) || {};
        const items = document.getElementById('history-items'); if(!items) return; items.innerHTML = "";
        const sortedKeys = Object.keys(history).sort().reverse();
        if(sortedKeys.length === 0) { 
            items.innerHTML = `
                <div style="text-align:center; padding:30px 10px;">
                    <div style="font-size:32px; margin-bottom:10px;">💨</div>
                    <div style="font-size:14.5px; font-weight:800; color:var(--text-m); margin-bottom:6px;">텅~ 비어있네요! 지출 방어 성공?</div>
                    <div style="font-size:12.5px; color:var(--text-s);">아직 지난달에 기록하신 가계부 내역이 없어요.</div>
                </div>`; 
        } 
        else { sortedKeys.forEach(k => { items.innerHTML += `<div class="history-item" style="display:flex; justify-content:space-between; font-size:14px; border-bottom:1px dashed var(--border); padding:10px 2px;"><span>${k}</span><span style="font-weight:800; color:var(--text-m);">${history[k].toLocaleString()}원</span></div>`; }); }
        area.style.display = 'block';
    }
}
window.toggleHistory = toggleHistory;

// 🚨 차트 닫기 로직 복구
function closeMoneyChart() {
    const resBox = document.getElementById('money-result');
    if(resBox) resBox.style.display = 'none';
}
window.closeMoneyChart = closeMoneyChart;

async function addDailyExpense(isSaving) {
    const input = document.getElementById('v-input-amount');
    const amount = parseInt(input.value.replace(/,/g, '')) || 0;
    if(amount <= 0) return alert("금액을 정확히 입력해주세요!");

    let ledger = JSON.parse(localStorage.getItem('tosil_ledger_data')) || { total: 0, savedTotal: 0, goal: "", goalAmount: 100000, history: [] };
    
    const now = new Date();
    const timeStr = `${now.getMonth()+1}/${now.getDate()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    if(!ledger.history) ledger.history = [];

    if(isSaving) {
        ledger.savedTotal += amount;
        ledger.history.unshift({ time: timeStr, amount: amount, type: 'saving' });
        alert(`🎉 대박! ${amount.toLocaleString()}원 절약 및 저금 완료!`);
    } else {
        ledger.total += amount;
        ledger.history.unshift({ time: timeStr, amount: amount, type: 'expense' });
        alert(`✅ 지출 ${amount.toLocaleString()}원 기록 완료!`);
    }
    
    if(ledger.history.length > 20) ledger.history.pop(); 
    await saveLedgerToFirebase(ledger);
    
    localStorage.setItem('tosil_money_total', ledger.total); 
    const date = new Date(), curY = date.getFullYear(), curM = date.getMonth() + 1, monthKey = `${curY}-${curM}`;
    const localHistory = JSON.parse(localStorage.getItem('TosilBabyApp')) || {};
    localHistory[monthKey] = ledger.total;
    localStorage.setItem('TosilBabyApp', JSON.stringify(localHistory));

    input.value = '';
    updateHomeDashboard();
}

function saveGoal() {
    let ledger = JSON.parse(localStorage.getItem('tosil_ledger_data')) || { total: 0, savedTotal: 0, goal: "", goalAmount: 100000, history: [] };
    ledger.goal = document.getElementById('v-goal-text').value;
    
    const amountVal = document.getElementById('v-goal-amount').value.replace(/,/g, '');
    ledger.goalAmount = parseInt(amountVal) || 100000;

    saveLedgerToFirebase(ledger);
}

function updateLedgerUI() {
    const ledger = JSON.parse(localStorage.getItem('tosil_ledger_data')) || { total: 0, savedTotal: 0, goal: "", goalAmount: 100000, history: [] };
    
    const goalInput = document.getElementById('v-goal-text');
    if(goalInput && document.activeElement !== goalInput && ledger.goal) goalInput.value = ledger.goal;

    const amountInput = document.getElementById('v-goal-amount');
    if(amountInput && document.activeElement !== amountInput && ledger.goalAmount) amountInput.value = ledger.goalAmount.toLocaleString();

    const targetAmount = ledger.goalAmount || 100000;
    const percent = Math.min(Math.round((ledger.savedTotal / targetAmount) * 100), 100);
    
    const percentEl = document.getElementById('v-goal-percent');
    if(percentEl) percentEl.innerText = percent + "%";

    const insight = document.getElementById('money-insight');
    if(insight) {
        insight.innerHTML = `이번 달 빠른 지출: <strong>${(ledger.total || 0).toLocaleString()}원</strong> | 모은 절약금: <strong style="color:#3182F6;">${(ledger.savedTotal || 0).toLocaleString()}원</strong>`;
    }

    const listContainer = document.getElementById('ledger-history-list');
    if(listContainer) {
        let html = '';
        (ledger.history || []).forEach(h => {
            const badge = h.type === 'saving' ? `<span style="color:#3182F6; font-weight:800;">[💰저금]</span>` : `<span style="color:var(--text-s);">[💸지출]</span>`;
            html += `<div style="display:flex; justify-content:space-between; padding:12px 16px; background:#F8F9FA; border-radius:12px; font-size:13.5px; border:1px solid #E5E8EB;"><div>${badge} <span style="color:var(--text-s); margin-left:4px;">${h.time}</span></div><span style="font-weight:900; color:var(--text-m);">${h.amount.toLocaleString()}원</span></div>`;
        });
        listContainer.innerHTML = html;
    }
}

async function resetMoneyAll() {
    if(confirm("이번 달 기록된 모든 지출 및 저금 데이터를 리셋할까요?")) {
        let ledger = { total: 0, savedTotal: 0, goal: document.getElementById('v-goal-text').value, goalAmount: 100000, history: [] };
        await saveLedgerToFirebase(ledger);
        localStorage.removeItem('tosil_money_total');
        document.getElementById('v-diaper').value = ''; 
        document.getElementById('v-food').value = ''; 
        document.getElementById('v-etc').value = '';
        const resBox = document.getElementById('money-result'); if(resBox) resBox.style.display = 'none'; 
        alert("처음부터 다시 든든하게 모아봐요! 🌿");
        updateHomeDashboard();
    }
}
window.addDailyExpense = addDailyExpense;
window.saveGoal = saveGoal;
window.resetMoneyAll = resetMoneyAll;

function calcHotDeal() {
    const cat = document.getElementById('hd-category').value;
    const price = Number(document.getElementById('hd-total-price').value.replace(/,/g,''));
    const count = Number(document.getElementById('hd-count').value);
    const pastPrice = Number(document.getElementById('hd-standard-price').value); 
    
    if(!price || !count) return alert("최종 결제액과 총 수량을 정확히 입력해주세요!");
    
    const unitPrice = Math.round(price / count);
    document.getElementById('hd-unit-price').innerText = unitPrice.toLocaleString() + "원";
    
    const verdictEl = document.getElementById('hd-verdict');
    const commentEl = document.getElementById('hd-comment');
    
    let unitName = "장";
    if (cat === 'wipe') unitName = "팩";
    else if (cat === 'milk') unitName = "통";
    
    if (pastPrice > 0) {
        const diff = pastPrice - unitPrice;
        if (diff > 0) {
            verdictEl.innerText = `🎉 지난번보다 ${unitName}당 ${diff.toLocaleString()}원 저렴해요!`;
            verdictEl.style.backgroundColor = "#00B37A"; 
            commentEl.innerText = `총 ${count}${unitName}를 사니까, 지난번 구매할 때보다 총 ${(diff * count).toLocaleString()}원 아끼는 셈이에요. 아주 훌륭한 소비입니다!`;
        } else if (diff < 0) {
            verdictEl.innerText = `⚠️ 지난번보다 ${unitName}당 ${Math.abs(diff).toLocaleString()}원 비싸요.`;
            verdictEl.style.backgroundColor = "#F04452"; 
            commentEl.innerText = `이번에 사면 지난번보다 총 ${(Math.abs(diff) * count).toLocaleString()}원 더 지출하게 됩니다. 급한 게 아니라면 조금 더 기다려보는 건 어떨까요?`;
        } else {
            verdictEl.innerText = `⚖️ 지난번 구매가와 완벽히 똑같아요!`;
            verdictEl.style.backgroundColor = "#3182F6"; 
            commentEl.innerText = "평소 사시던 가격 그대로네요. 필요하다면 지금 구매하셔도 좋습니다.";
        }
    } else {
        verdictEl.innerText = `✅ 정확한 단가 계산 완료!`;
        verdictEl.style.backgroundColor = "#3182F6"; 
        commentEl.innerText = `복잡한 쿠폰/할인 다 합쳐서 결국 1${unitName}당 ${unitPrice.toLocaleString()}원에 사시는 겁니다!`;
    }
    
    verdictEl.style.color = "#FFF";
    const hdRes = document.getElementById('hd-result'); if(hdRes) hdRes.style.display = 'block';
    document.getElementById('hd-action-area').innerHTML = `<button class="btn-main" style="margin-top:16px; background:#3182F6 !important; color:#FFF !important; border:none !important; box-shadow:0 6px 16px rgba(49,130,246,0.2) !important; padding:14px; font-size:14.5px; font-weight:800; border-radius:12px;" onclick="sendHotdealToLedger(${price}, '${cat}')">💰 이번 핫딜 지출 (${price.toLocaleString()}원) 가계부로 보내기 〉</button>`;
}

async function sendHotdealToLedger(price, cat) {
    let targetId = 'v-etc';
    if(cat === 'diaper' || cat === 'wipe') targetId = 'v-diaper';
    if(cat === 'milk') targetId = 'v-food';

    const inputEl = document.getElementById(targetId);
    if(inputEl) {
        const currentVal = Number(inputEl.value.replace(/,/g, '')) || 0;
        inputEl.value = (currentVal + price).toLocaleString();
    }
    
    let ledger = JSON.parse(localStorage.getItem('tosil_ledger_data')) || { total: 0, savedTotal: 0, goal: "", goalAmount: 100000, history: [] };
    ledger.total += price;
    const now = new Date();
    const timeStr = `${now.getMonth()+1}/${now.getDate()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    if(!ledger.history) ledger.history = [];
    ledger.history.unshift({ time: timeStr, amount: price, type: 'expense' });
    
    await saveLedgerToFirebase(ledger);
    alert(`✅ 핫딜 결제액 ${price.toLocaleString()}원이 가계부에 자동 연동되었습니다!\n가계부 패널 하단의 [소비 패턴 팩트 체크] 버튼을 눌러 정밀 차트를 갱신하세요.`);
    directGoToolbox('money');
}
window.calcHotDeal = calcHotDeal;
window.sendHotdealToLedger = sendHotdealToLedger;

// ==========================================
// 5. 스마트 해열제 타이머 엔진 (실시간 연동형)
// ==========================================
function checkPillLock(type) {
    // 1. ✨ 로컬 스토리지에서 기록 가져오기 (이 줄이 빠졌었습니다!)
    let currentFeverRecords = JSON.parse(localStorage.getItem('tosil_fever_records')) || [];

    // 2. 기록이 없으면 둘 다 즉시 복용 가능
    if (currentFeverRecords.length === 0) {
        return { locked: false, reason: "" };
    }

    // 3. 가장 최근에 먹인 약 기록 가져오기
    const lastRecord = currentFeverRecords[0]; 
    
    // 4. ✨ 시간 계산 (글씨가 아니라 저장해둔 timestamp 숫자로 정확히 계산!)
    const lastTime = lastRecord.timestamp; 
    const now = new Date().getTime();
    let diffMinutes = Math.floor((now - lastTime) / (1000 * 60));

    // (혹시 폰 시간 오류로 음수가 나오면 0으로 보정)
    if (diffMinutes < 0) diffMinutes = 0;

    // 5. ✨ 핵심 로직: 같은 약인지 다른 약인지 판별 ✨
    let requiredWaitMins = 0;
    if (lastRecord.type === type) {
        requiredWaitMins = 240; // 🔴 같은 약이면 4시간(240분) 대기
    } else {
        requiredWaitMins = 120; // 🔵 다른 약(교차복용)이면 2시간(120분) 대기
    }

    // 6. 대기 시간이 아직 안 지났다면 잠금!
    if (diffMinutes < requiredWaitMins) {
        const remain = requiredWaitMins - diffMinutes;
        return { locked: true, reason: `투약 잠금\n(약 ${remain}분 남음)` };
    }

    // 시간이 다 지났으면 잠금 해제
    return { locked: false, reason: "" };
}

function selectPill(type) {
    const redBtn = document.getElementById('btn-pill-red'), blueBtn = document.getElementById('btn-pill-blue');
    if(redBtn) redBtn.classList.remove('active');
    if(blueBtn) blueBtn.classList.remove('active');
    if (!type) { selectedPillType = ''; return; }
    const lockStatus = checkPillLock(type);
    if (lockStatus.locked) { alert('🚨 [투약 불가] ' + lockStatus.reason); return; }
    selectedPillType = type;
    if (type === 'red' && redBtn) redBtn.classList.add('active');
    else if (type === 'blue' && blueBtn) blueBtn.classList.add('active');
}

function toggleCheck(e) { if(e.target.tagName !== 'INPUT') { const cb = document.getElementById('agree-check'); if(cb) cb.checked = !cb.checked; } }

function calcFever() {
    const agreeCb = document.getElementById('agree-check');
    if(agreeCb && !agreeCb.checked) return alert("⚠️ 위험 고지 및 면책조항 동의 확인이 필요합니다.");
    const w = Number(document.getElementById('v-weight').value);
    if(!w) return alert("체중 값을 계측하여 정확히 입력하십시오.");
    document.getElementById('dose-red').innerText = `${(w*0.3).toFixed(1)} ~ ${(w*0.38).toFixed(1)}`;
    document.getElementById('dose-blue').innerText = `${(w*0.4).toFixed(1)} ~ ${(w*0.5).toFixed(1)}`;
    const fRes = document.getElementById('fever-result'); if(fRes) fRes.style.display = 'block';
}

async function addFeverRecord() {
    const temp = parseFloat(document.getElementById('v-temp').value);
    if(!temp || !selectedPillType) return alert('체온 and 약 종류를 명확히 지정해주세요!');
    const lockStatus = checkPillLock(selectedPillType);
    if (lockStatus.locked) return alert('🚨 [저장 실패] ' + lockStatus.reason);
    
    const symptoms = [
        document.getElementById('sym-cough').checked ? '🤧기침' : '', 
        document.getElementById('sym-vomit').checked ? '🤮구토' : '',
        document.getElementById('sym-diarrhea').checked ? '💩설사' : '', 
        document.getElementById('sym-nofood').checked ? '😰밥거부' : ''
    ].filter(Boolean);
    
    const now = new Date(), timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const record = { time: timeStr, temp: temp, type: selectedPillType, timestamp: now.getTime(), symptoms: symptoms };
    
    let records = JSON.parse(localStorage.getItem('tosil_fever_records')) || [];
    records.unshift(record); if(records.length > 10) records.pop(); 
    
    if (typeof db !== 'undefined' && typeof setDoc === 'function') {
        const syncCode = localStorage.getItem("family_sync_code") || "unlinked_local_diary";
        const docRef = doc(db, "fever_" + syncCode, "status");
        try { await setDoc(docRef, { records: records }, { merge: true }); } catch (e) {}
    }
    
    localStorage.setItem('tosil_fever_records', JSON.stringify(records));
    document.getElementById('v-temp').value = '';
    ['sym-cough','sym-vomit','sym-diarrhea','sym-nofood'].forEach(id => { const cb = document.getElementById(id); if(cb) cb.checked = false; });
    selectPill(''); renderFeverTimeline(); setTimeout(updateHomeDashboard, 100); 
}

function renderFeverTimeline() {
    const container = document.getElementById('fever-timeline'); if(!container) return; 
    let records = JSON.parse(localStorage.getItem('tosil_fever_records')) || [];
    if(records.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:40px 20px; background:var(--bg-sub, #F8F9FA); border-radius:16px; border:1px dashed #E5E8EB;">우리 아기가 아프지 않아서 기록이 텅 비어있네요. 💚</div>`;
        ['fever-timer-box','fever-chart-container','fever-alert'].forEach(id => { const el = document.getElementById(id); if(el) el.style.display='none'; });
        if(feverTimerInterval) clearInterval(feverTimerInterval);
        return;
    }
    
    let html = '';
    records.forEach(r => {
        const pillLabel = r.type === 'red' ? '🔴 아세트 (빨강)' : '🔵 이부 (파랑)'; 
        const tempStyle = r.temp >= 38.5 ? 'color:#FF4B2B; font-weight:900;' : 'font-weight:800;';
        let symHtml = r.symptoms && r.symptoms.length > 0 ? `<div style="margin-top:8px; font-size:11.5px; color:var(--text-m); background:var(--bg-sub); padding:6px 10px; border-radius:8px; display:inline-block; border:1px solid var(--border);">🚨 동반증상: ${r.symptoms.join(', ')}</div>` : '';
        html += `<div class="timeline-item" style="padding:16px 12px; border-bottom:1px solid var(--border);"><div style="display:flex; justify-content:space-between; align-items:center; font-size:14px;"><span style="font-weight:800; opacity:0.7; width:45px;">${r.time}</span><span style="flex:1; text-align:center; font-weight:800;">${pillLabel}</span><span style="${tempStyle}">${r.temp}℃</span></div>${symHtml}</div>`;
    });
    container.innerHTML = html;
    
    const fChart = document.getElementById('fever-chart-container'); if(fChart) fChart.style.display = 'block';
    const fTimer = document.getElementById('fever-timer-box'); if(fTimer) fTimer.style.display = 'block'; 
    
    drawFeverChart(records);
    if(feverTimerInterval) clearInterval(feverTimerInterval); 
    updateFeverTimer(records); feverTimerInterval = setInterval(() => updateFeverTimer(records), 1000);
}

function updateFeverTimer(records) {
    if (!records || records.length === 0) return;
    const redLock = checkPillLock('red'), blueLock = checkPillLock('blue');
    const redBtn = document.getElementById('btn-pill-red'), blueBtn = document.getElementById('btn-pill-blue');
    const timerRedEl = document.getElementById('timer-red'), timerBlueEl = document.getElementById('timer-blue');
    if (timerRedEl) { timerRedEl.innerText = redLock.locked ? redLock.reason.split('\n')[1] : "✅ 즉시 복용 가능"; timerRedEl.style.color = redLock.locked ? "var(--danger)" : "#2ECC71"; }
    if (timerBlueEl) { timerBlueEl.innerText = blueLock.locked ? blueLock.reason.split('\n')[1] : "✅ 즉시 복용 가능"; timerBlueEl.style.color = blueLock.locked ? "var(--danger)" : "#2ECC71"; }
    if (redBtn) { redBtn.style.cursor = 'pointer'; redBtn.style.opacity = redLock.locked ? '0.3' : '1'; }
    if (blueBtn) { blueBtn.style.cursor = 'pointer'; blueBtn.style.opacity = blueLock.locked ? '0.3' : '1'; }
}

async function clearFeverRecord() {
    if(!confirm('전체 투약 기록을 지우시겠습니까?')) return;
    localStorage.removeItem('tosil_fever_records'); 
    
    if (typeof db !== 'undefined' && typeof setDoc === 'function') {
        const syncCode = localStorage.getItem("family_sync_code") || "unlinked_local_diary";
        try { await setDoc(doc(db, "fever_" + syncCode, "status"), { records: [] }); } catch (e) {}
    }
    selectPill(''); 
    renderFeverTimeline(); 
    setTimeout(updateHomeDashboard, 100);
}

window.addFeverRecord = addFeverRecord;
window.clearFeverRecord = clearFeverRecord;
window.selectPill = selectPill;
window.calcFever = calcFever;

function drawFeverChart(records) {
    const canvas = document.getElementById('feverChart'); if(!canvas || typeof Chart === 'undefined') return; 
    const ctx = canvas.getContext('2d'); if(feverChartObj) feverChartObj.destroy(); 
    const chartData = [...records].reverse(), labels = chartData.map(r => r.time), temps = chartData.map(r => r.temp);
    feverChartObj = new Chart(ctx, { type: 'line', data: { labels: labels, datasets: [{ label: '체온 변화 (℃)', data: temps, borderColor: '#FF4B2B', backgroundColor: 'rgba(255, 75, 43, 0.1)', borderWidth: 3, pointBackgroundColor: temps.map(t => t >= 38.5 ? '#FF4B2B' : '#3182F6'), pointRadius: 5, fill: true, tension: 0.3 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 36.5, max: 40.5 }, x: { grid: { display: false } } }, plugins: { legend: { display: false } } } });
}

function downloadFeverReport() {
    const target = document.getElementById('fever-timeline');
    if(!target || !target.innerHTML.trim() || target.innerText.includes("기록이 없습니다")) return alert("캡처할 기록이 없어요!");
    if(typeof html2canvas === 'undefined') return alert("이미지 변환 라이브러리가 준비되지 않았습니다.");
    html2canvas(target, { backgroundColor: '#ffffff', scale: 2 }).then(canvas => {
        const link = document.createElement('a'); link.download = '해열제_기록.png'; link.href = canvas.toDataURL("image/png"); link.click();
        alert("📸 캡처가 저장되었습니다!");
    });
}
window.downloadFeverReport = downloadFeverReport;

// ==========================================
// 🌡️ [해열제] 파이어베이스 실시간 수신 리스너
// ==========================================
let feverUnsubscribe = null;
function startFeverRealtimeSync() {
    const syncCode = localStorage.getItem("family_sync_code") || "unlinked_local_diary";
    const docRef = typeof doc !== 'undefined' && typeof window.db !== 'undefined' ? doc(window.db, "fever_" + syncCode, "status") : null;
    
    if(!docRef) return; 

    // 기존 감시 중단
    if (feverUnsubscribe) feverUnsubscribe();
    if(typeof window.onSnapshot !== 'function') return;

    // 서버 변화 실시간 감시
    feverUnsubscribe = window.onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            localStorage.setItem('tosil_fever_records', JSON.stringify(data.records || []));
        }
        // 서버에서 데이터가 오면 즉시 화면 갱신
        if (typeof renderFeverTimeline === 'function') renderFeverTimeline();
        if (typeof updateHomeDashboard === 'function') updateHomeDashboard();
    });
}
window.startFeverRealtimeSync = startFeverRealtimeSync;

// ==========================================
// 6. 외출 준비물 체크리스트 
// ==========================================
function openChecklistModal() {
    let months = 99, targetDate = localStorage.getItem('tosil_startDate'); 
    if (targetDate) {
        const dday = Math.ceil(Math.abs(new Date() - new Date(targetDate)) / (1000 * 60 * 60 * 24));
        months = Math.floor(dday / 30);
    }
    checklistData = [
        { id: 'c_diaper', label: '기저귀 (넉넉하게 4~5장)', checked: false }, { id: 'c_wipe', label: '물티슈 & 건티슈', checked: false },
        { id: 'c_cloth', label: '여벌옷 1벌 & 가제 손수건 3장', checked: false }, { id: 'c_plastic', label: '기저귀 버릴 냄새차단 비닐팩', checked: false }
    ];
    if (months <= 5) checklistData.push({ id: 'c_milk', label: '🍼 분유/모유 & 깨끗한 젖병', checked: false }, { id: 'c_thermos', label: '🌡️ 보온병 (분유물)', checked: false });
    else checklistData.push({ id: 'c_food', label: '🥣 이유식 & 전용 숟가락', checked: false }, { id: 'c_cup', label: '🥤 빨대컵 (마실 물)', checked: false });

    let savedChecks = {}; try { savedChecks = JSON.parse(localStorage.getItem('tosil_checklist')) || {}; } catch(e){}
    checklistData.forEach(item => { if (savedChecks[item.id]) item.checked = true; });
    renderChecklist();
    document.getElementById('checklist-modal').style.display = 'flex';
}

function renderChecklist() {
    const container = document.getElementById('checklist-items'); if(!container) return; 
    let htmlString = "", checkedCount = 0; 
    checklistData.forEach((item, index) => {
        if(item.checked) checkedCount++;
        htmlString += `<div class="check-item ${item.checked?'checked':''}" onclick="toggleCheckItem(${index})" style="cursor:pointer; padding:12px; border-bottom:1px solid #EEE; display:flex; gap:10px;"><div class="check-box">${item.checked?'✔':'⬜'}</div><div class="check-text">${item.label}</div></div>`;
    });
    container.innerHTML = htmlString;
}

function toggleCheckItem(index) {
    checklistData[index].checked = !checklistData[index].checked;
    const saveObj = {}; checklistData.forEach(item => { saveObj[item.id] = item.checked; });
    localStorage.setItem('tosil_checklist', JSON.stringify(saveObj)); renderChecklist();
}
function resetChecklist() { localStorage.removeItem('tosil_checklist'); openChecklistModal(); }
function closeChecklistForce() { document.getElementById('checklist-modal').style.display = 'none'; }
function closeChecklist(e) { if (e.target.id === 'checklist-modal') closeChecklistForce(); }
window.openChecklistModal = openChecklistModal;
window.toggleCheckItem = toggleCheckItem;
window.resetChecklist = resetChecklist;
window.closeChecklistForce = closeChecklistForce;
window.closeChecklist = closeChecklist;

// ==========================================
// 🚨 7. 아기 발달 센서 엔진 & 대시보드 갱신
// ==========================================
function updateMainAISensors(months) {
    const txtStroller = document.getElementById('main-txt-stroller');
    const txtCarseat = document.getElementById('main-txt-carseat');
    const txtBottle = document.getElementById('main-txt-bottle');
    const txtFood = document.getElementById('main-txt-food');
    const txtToy = document.getElementById('main-txt-toy');
    if(!txtStroller) return;

    if (months <= 6) txtStroller.innerText = "👶 [디럭스] 흔들림 없는 안전 승차감";
    else if (months <= 12) txtStroller.innerText = "🏃 [절충형] 혼자 앉는 시기 가성비템";
    else txtStroller.innerText = "⚡ [휴대용] 가볍고 신속한 외출 전용";

    if (months <= 12) txtCarseat.innerText = "🛡️ [신생아] 뒤보기 필수, 목 보호 안전";
    else txtCarseat.innerText = "🧒 [토들러] 앞보기 전환, 체형 맞춤형";

    if (months <= 3) txtBottle.innerText = "🍼 [신생아] 배앓이 방지, 젖꼭지 매칭";
    else txtBottle.innerText = "🥛 [6개월+] 빨대컵 연습, 스스로 마시기";

    if (months <= 6) txtFood.innerText = "🌾 [초기] 쌀미음 스타트, 식단 매칭";
    else if (months <= 9) txtFood.innerText = "🥕 [중기] 입자 업그레이드, 재료 신호등";
    else txtFood.innerText = "🍽️ [완료기] 유아식 진화, 영양소 체크";

    if (months <= 5) txtToy.innerText = "💪 [터미타임] 고개 가누기 완구";
    else txtToy.innerText = "🏃 [걸음마] 잡고 일어서는 완구";
}

function setDefaultMainAISensors() {
    if(document.getElementById('main-txt-stroller')) {
        document.getElementById('main-txt-stroller').innerText = "아기 맞춤형 유모차 매칭 센서 가동대기";
        document.getElementById('main-txt-carseat').innerText = "단계별 안전 규격 카시트 큐레이션 보기";
        document.getElementById('main-txt-bottle').innerText = "배앓이 방지 젖병 및 젖꼭지 스펙 확인";
        document.getElementById('main-txt-food').innerText = "월령별 안심 이유식 레시피 및 재료 매칭";
        document.getElementById('main-txt-toy').innerText = "부모의 자유시간 확보용 장난감";
    }
}

function getPercentile(z) {
    if (z < -3) return 1; if (z > 3) return 99;
    return Math.round((1 / (1 + Math.exp(-z * 1.702))) * 100);
}

// 🔥 성장 진단 엔진 로직 완전 복구
function calcHealthMaster() {
    const b = document.getElementById('v-birth').value;
    const gender = document.getElementById('v-gender').value;
    const hVal = document.getElementById('v-height').value;
    const wVal = document.getElementById('v-weight-growth').value;
    const h = hVal ? parseFloat(hVal) : null;
    const w = wVal ? parseFloat(wVal) : null;

    if (wVal) localStorage.setItem('tosil_latest_weight', wVal);

    if(!b) return alert("종합 분석을 위해 아기 생년월일을 입력해 주세요!");
    if(!h && !w) return alert("정확한 백분위 진단을 위해 키 또는 몸무게 중 하나 이상을 입력해 주세요!");
    
    const birthDate = new Date(b);
    const today = new Date();
    const diffDays = Math.ceil((today - birthDate) / (1000*60*60*24));
    if (diffDays < 0) return alert("미래의 날짜는 입력할 수 없습니다.");
    
    const week = Math.floor(diffDays / 7);
    const month = Math.floor(diffDays / 30.436875); 
    
    document.getElementById('res-dday').innerText = diffDays;
    document.getElementById('res-month').innerText = month;
    document.getElementById('res-week').innerText = week;

    let curWW = wwList.find(x => week >= x.w-1 && week <= x.w+1);
    let nxtWW = wwList.find(x => x.w > week);
    let st = document.getElementById('ww-status');
    if(!st) return;

    if(curWW) { 
        st.style.background = 'rgba(253, 104, 104, 0.1)'; st.style.borderColor = 'rgba(253, 104, 104, 0.2)';
        st.innerHTML = `<div style="font-size:15px; font-weight:900; color:var(--danger); margin-bottom:6px;">🚨 현재 ${curWW.t} 폭풍우 구간!</div><strong style="color:var(--text-m);">특성:</strong> ${curWW.d}.<br>이유 없는 보챔과 수면퇴행이 올 수 있는 도약기입니다. 엄빠의 멘탈을 꽉 잡고 아기를 많이 안아주세요!`; 
    } else { 
        st.style.background = 'rgba(0, 179, 122, 0.1)'; st.style.borderColor = 'rgba(0, 179, 122, 0.2)';
        st.innerHTML = `<div style="font-size:15px; font-weight:900; color:var(--success); margin-bottom:6px;">☀️ 맑음! 평온기 유지 중</div><br><span style="font-size:13px; color:var(--text-s);">${nxtWW ? '👉 다음 도약기: <strong>' + nxtWW.t + ' (' + nxtWW.w + '주차)</strong> 대기 중' : '모든 발달 도약 임계 매트릭스를 이수 완료했습니다.'}</span>`; 
    }

    let table = `<tr><th>주차</th><th>진단 단계</th><th>특성 지표</th></tr>`;
    wwList.forEach(x => { let active = (week >= x.w-1 && week <= x.w+1) ? 'class="active" style="background:rgba(253, 104, 104, 0.1);"' : ''; table += `<tr ${active}><td>${x.w-1}~${x.w+1}주</td><td>${x.t}</td><td>${x.d}</td></tr>`; });
    document.getElementById('ww-table').innerHTML = table;

    let vac = vaccineData.find(v => month <= v.maxMonth);
    document.getElementById('vaccine-info').innerHTML = vac ? vac.desc : "해당 월령의 접종 정보가 없습니다.";
    
    let nextVacMonth = vac ? vac.maxMonth : 0;
    let vacDdayText = "";
    if (month === nextVacMonth) vacDdayText = "이번 달 접종 필요";
    else if (nextVacMonth === 99) vacDdayText = "기초 접종 완료";
    else vacDdayText = `약 ${nextVacMonth - month}개월 뒤 접종`;
    document.getElementById('vac-dday').innerText = vacDdayText;

    let standardArr = growthStandard[gender];
    let std = standardArr.slice().reverse().find(x => month >= x.m);
    if(!std) std = standardArr[0]; 

    const sdHeight = std.h * 0.04; 
    const sdWeight = std.w * 0.12;

    const getDesc = (pct) => {
        if(pct >= 95) return `매우 큼 (상위 5%)`;
        if(pct >= 75) return `큰 편 (상위 25%)`;
        if(pct >= 25) return `평균 범위 (정상)`;
        if(pct >= 5) return `작은 편 (하위 25%)`;
        return `매우 작음 (소아과 상담 요망)`;
    };

    let pctHeight = null;
    let pctWeight = null;

    if (h) {
        pctHeight = getPercentile((h - std.h) / sdHeight);
        document.getElementById('pct-height').innerText = `상위 ${100 - pctHeight}%`;
        document.getElementById('desc-height').innerText = getDesc(pctHeight);
    } else {
        document.getElementById('pct-height').innerText = `-`;
        document.getElementById('desc-height').innerText = `미입력`;
    }

    if (w) {
        pctWeight = getPercentile((w - std.w) / sdWeight);
        document.getElementById('pct-weight').innerText = `상위 ${100 - pctWeight}%`;
        document.getElementById('desc-weight').innerText = getDesc(pctWeight);
    } else {
        document.getElementById('pct-weight').innerText = `-`;
        document.getElementById('desc-weight').innerText = `미입력`;
    }

    let insightMsg = "";
    if (w && !h) {
        if (pctWeight > 90) insightMsg = "💪 몸무게가 10등 안에 드는 튼튼한 우량아예요! 잘 먹는 건 축복입니다.";
        else if (pctWeight < 10) insightMsg = "🌱 체중 증가가 조금 더딘 편입니다. 영유아 검진 시 원장님과 상담해 보세요.";
        else insightMsg = "⚖️ 몸무게가 아주 안정적인 평균 범위에서 쑥쑥 자라고 있어요!";
    } else if (h && !w) {
        if (pctHeight > 90) insightMsg = "🦒 키가 또래 10% 안에 들 정도로 훤칠하게 자라고 있어요!";
        else if (pctHeight < 10) insightMsg = "🌱 키 성장이 다소 느린 편입니다. 꾸준히 지켜봐 주세요.";
        else insightMsg = "⚖️ 키가 안정적인 평균 범위에서 건강하게 자라고 있어요!";
    } else if (h && w) {
        if (pctWeight > 90) insightMsg = "💪 아기는 또래 100명 중 몸무게가 10등 안에 드는 튼튼한 우량아예요! 잘 먹는 건 축복입니다.";
        else if (pctWeight < 10) insightMsg = "🌱 몸무게 증가가 다소 느린 편입니다. 영유아 검진 시 소아과 원장님과 식단/수유량을 상담해 보시면 좋아요.";
        else if (pctHeight > 80 && pctWeight < 50) insightMsg = "🦒 키에 비해 날씬한 모델 체형이네요! 균형 있게 아주 잘 자라고 있습니다.";
        else insightMsg = "⚖️ 키와 몸무게 모두 완벽한 황금 밸런스로 아주 건강하게 쑥쑥 크고 있어요!";
    }

    let babyNameText = "아기";
    const genderSelect = document.getElementById('v-gender');
    if (genderSelect && genderSelect.options.length > 0) {
        babyNameText = genderSelect.options[genderSelect.selectedIndex].text.split(' ')[1] + ' 아기';
    }
    document.getElementById('growth-insight').innerText = insightMsg.replace('아기', babyNameText); 

    const gRes = document.getElementById('growth-result');
    if(gRes) {
        gRes.style.display = 'block';
        setTimeout(() => { gRes.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);
    }
}
window.calcHealthMaster = calcHealthMaster;

function promptBabyInfo() {
    const name = prompt("우리아기 이름(태명)을 알려주세요!", "우리아기"); if(!name) return;
    const input = prompt("아기 생년월일을 입력하세요 (예: 20260303)", "20260303"); if(!input) return;
    const clean = input.replace(/[^0-9]/g, ''); const formattedDate = clean.length === 8 ? `${clean.substring(0,4)}-${clean.substring(4,6)}-${clean.substring(6,8)}` : input;
    if (isNaN(new Date(formattedDate).getTime())) return alert("날짜 형식이 올바르지 않습니다."); 
    localStorage.setItem('tosil_baby', JSON.stringify({name: name, birth: formattedDate}));
    localStorage.setItem('tosil_babyName', name); localStorage.setItem('tosil_startDate', formattedDate);
    alert("아기 정보가 찰떡같이 저장되었습니다! 🤍"); location.reload(); 
}
window.promptBabyInfo = promptBabyInfo;

function renderBabyInfo() {
    const saved = localStorage.getItem('tosil_baby'), nameEl = document.getElementById('res-baby-name'), ddayEl = document.getElementById('res-baby-dday'), msgEl = document.getElementById('daily-message'); 
    const goalInput = document.getElementById('v-goal-text');
    const missionNameEl = document.getElementById('mission-baby-name');
    
    if(!saved) {
        if(nameEl) nameEl.innerText = "이름을 눌러 등록해주세요"; 
        if(ddayEl) ddayEl.innerText = "D+0일";
        initPlayWidget(null, 0);
        setDefaultMainAISensors();
        return;
    }
    try {
        const data = JSON.parse(saved);
        const diffDays = Math.ceil((new Date() - new Date(data.birth)) / (1000*60*60*24));
        const monthAge = Math.floor(diffDays / 30.436875);
        
        if(nameEl) nameEl.innerText = data.name + "의 공간"; 
        if(ddayEl) ddayEl.innerText = "D+" + diffDays + "일";
        if(goalInput && !goalInput.value) goalInput.placeholder = `예: ${data.name} 코코지하우스 구매`;
        if(missionNameEl) missionNameEl.innerText = data.name;

        const tipObj = babyTips.find(item => monthAge >= item.min && monthAge <= item.max);
        if(msgEl) msgEl.innerText = tipObj ? tipObj.tip : `오늘도 ${data.name}와(과) 행복한 하루 되세요! 🤍`;
        
        initPlayWidget(monthAge, diffDays);
        updateMainAISensors(monthAge); 
    } catch (e) {
        console.error(e);
    }
}

function initPlayWidget(months, dday) {
    const badgeEl = document.getElementById('play-dday-badge'), titleEl = document.getElementById('play-title'), descEl = document.getElementById('play-desc'), effectEl = document.getElementById('play-effect');
    if (months === null || isNaN(months) || !titleEl) {
        if(badgeEl) badgeEl.innerText = "0"; if(titleEl) titleEl.innerText = "아기 정보를 등록해주세요!";
        if(descEl) descEl.innerText = "상단 연필 버튼을 눌러 생일을 입력하면 놀이가 추천됩니다.";
        if(effectEl) effectEl.style.display = "none";
        currentAvailablePlays = []; return;
    }
    if(badgeEl) badgeEl.innerText = dday > 0 ? dday : 0; currentDday = dday > 0 ? dday : 0;
    currentAvailablePlays = playDB.filter(p => months >= p.minM && months <= p.maxM);
    renderPlay(0); 
}

function renderPlay(index) {
    const titleEl = document.getElementById('play-title'), descEl = document.getElementById('play-desc'), effectEl = document.getElementById('play-effect');
    if(!titleEl) return;
    if(currentAvailablePlays.length > 0) {
        const play = currentAvailablePlays[index % currentAvailablePlays.length];
        titleEl.innerText = play.title; descEl.innerText = play.desc;
        if(effectEl) { effectEl.innerText = play.effect; effectEl.style.display = "inline-block"; }
    } else {
        titleEl.innerText = "온 집안이 놀이터! 🏃‍♂️"; descEl.innerText = "오늘은 아기가 좋아하는 장난감으로 맘껏 놀아주세요!";
        if(effectEl) effectEl.style.display = "none";
    }
}

function shufflePlay() {
    if(currentAvailablePlays.length > 1) {
        const titleEl = document.getElementById('play-title');
        let newIndex;
        let attempts = 0;
        do {
            newIndex = Math.floor(Math.random() * currentAvailablePlays.length);
            attempts++;
        } while (currentAvailablePlays[newIndex].title === titleEl.innerText && attempts < 10);
        renderPlay(newIndex);
        const btn = document.getElementById('btn-shuffle-play');
        if(btn) { btn.style.transform = 'rotate(180deg)'; btn.style.transition = 'transform 0.3s ease'; setTimeout(() => { btn.style.transform = 'rotate(0deg)'; btn.style.transition = 'none'; }, 300); }
    }
}
window.shufflePlay = shufflePlay;

// ==========================================
// ✨ 5분 집중 놀이 타이머 엔진
// ==========================================
// ==========================================
// ✨ 5분 집중 놀이 타이머 엔진
// ==========================================
function startPlayTimer() {
    // 0. ✨ 시작 버튼을 누를 때, 현재 놀이 정보를 타이머 화면으로 복사
    const currentTitle = document.getElementById('play-title').innerText;
    const currentDesc = document.getElementById('play-desc').innerText;
    
    const activeTitleEl = document.getElementById('active-play-title');
    const activeDescEl = document.getElementById('active-play-desc');
    
    if(activeTitleEl) activeTitleEl.innerText = '🧸 ' + currentTitle;
    if(activeDescEl) activeDescEl.innerText = currentDesc;

    // 1. UI 구역 교체 (A 숨기고, B/C 보이기)
    document.getElementById('play-info-zone').style.display = 'none';
    document.getElementById('play-timer-zone').style.display = 'block';
    
    const progressBar = document.getElementById('play-progress-bar');
    if(progressBar) progressBar.style.display = 'block';
    
    // 2. 타이머 초기화 (초기 텍스트 세팅)
    let timeLeft = PLAY_TIME_SEC;
    updateTimerDisplay(timeLeft); // 👈 여기서 에러가 났던 겁니다! 이제 해결!
    
    // 3. 진행률 바 애니메이션 (100% -> 0% 스르륵 줄어듦)
    setTimeout(() => {
        if(progressBar) {
            progressBar.style.transition = `width ${PLAY_TIME_SEC}s linear`;
            progressBar.style.width = '0%';
        }
    }, 50);

    // 4. 1초마다 타이머 숫자 감소
    playTimerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay(timeLeft);

        // 5분이 다 지나면 종료 처리
        if (timeLeft <= 0) {
            clearInterval(playTimerInterval);
            completePlayTimer();
        }
    }, 1000);
}

// 👇👇 아까 빼먹으신 필수 세트 메뉴 함수들입니다! 👇👇

function updateTimerDisplay(seconds) {
    const min = String(Math.floor(seconds / 60)).padStart(2, '0');
    const sec = String(seconds % 60).padStart(2, '0');
    const display = document.getElementById('play-timer-display');
    if(display) display.innerText = `${min}:${sec}`;
}

function stopPlayTimer() {
    clearInterval(playTimerInterval);
    resetPlayUI();
}

function completePlayTimer() {
    alert("🎉 5분 놀이 완료! 오늘도 아기에게 즐거운 시간을 선물하셨네요!");
    resetPlayUI();
}

function resetPlayUI() {
    document.getElementById('play-info-zone').style.display = 'block';
    document.getElementById('play-timer-zone').style.display = 'none';
    
    const progressBar = document.getElementById('play-progress-bar');
    if(progressBar) {
        progressBar.style.display = 'none';
        progressBar.style.transition = 'none'; // 애니메이션 초기화
        progressBar.style.width = '100%';      // 게이지 꽉 찬 상태로 복구
    }
}

window.startPlayTimer = startPlayTimer;
window.stopPlayTimer = stopPlayTimer;

function uploadPhoto(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas'), maxSize = 600; 
                let width = img.width, height = img.height;
                if (width > maxSize) { height *= maxSize / width; width = maxSize; }
                canvas.width = width; canvas.height = height; 
                const ctx = canvas.getContext('2d'); 
                ctx.drawImage(img, 0, 0, width, height);
                
                // 화질을 0.5에서 0.85로 상향 조정했습니다!
                const dataUrl = canvas.toDataURL('image/jpeg', 0.85); 
                
                try { 
                    localStorage.setItem('tosil_baby_photo', dataUrl); 
                    loadBabyPhoto(); 
                } catch(err) { 
                    alert("사진 용량이 너무 큽니다. 화면을 캡처해서 올려주세요!"); 
                }
            }; 
            img.src = e.target.result;
        }; 
        reader.readAsDataURL(input.files[0]);
    }
}
window.uploadPhoto = uploadPhoto;

function loadBabyPhoto() {
    const savedPhoto = localStorage.getItem('tosil_baby_photo'), imgEl = document.querySelector('.home-hero-img');
    if (savedPhoto && imgEl) { imgEl.src = savedPhoto; imgEl.style.display = 'block'; imgEl.parentNode.style.background = 'none'; }
}

function updateHomeDashboard() {
    const feverRecords = JSON.parse(localStorage.getItem('tosil_fever_records')) || [];
    const feverText = document.getElementById('db-fever-text');
    
// 🌡️ 해열제 위젯 로직 교체
    if (feverRecords.length > 0) {
        const latest = feverRecords[0];
        let color = "#191F28";
        let subText = "정상 체온";
        
        if (latest.temp >= 38.0) { color = "#E32636"; subText = "고열 주의"; } 
        else if (latest.temp >= 37.5) { color = "#F59E0B"; subText = "미열"; }

        feverText.innerHTML = `
            <div style="font-size:24px; font-weight:900; color:${color}; letter-spacing:-0.5px;">${latest.temp}<span style="font-size:16px; margin-left:2px;">℃</span></div>
            <div style="font-size:12px; font-weight:800; color:var(--text-s); margin-top:4px;">${subText} <span style="opacity:0.6; font-weight:600;">(${latest.time})</span></div>
        `;
    } else {
        feverText.innerHTML = `<div style="font-size:13px; font-weight:800; color:#8B95A1;">체온을<br>기록해주세요</div>`;
    }

    // 💰 목표 저금통 위젯 로직 교체
    const ledgerCard = document.getElementById('db-ledger-card');
    if (ledgerCard) {
        const ledger = JSON.parse(localStorage.getItem('tosil_ledger_data')) || { total: 0, savedTotal: 0, goal: "목표 설정하기", goalAmount: 100000 };
        const targetAmount = ledger.goalAmount || 100000;
        const percent = Math.min(Math.round((ledger.savedTotal / targetAmount) * 100), 100);
        const goalName = ledger.goal || '공동 목표';
        
        const textEl = document.getElementById('db-ledger-text');
        const progressWrap = document.getElementById('db-ledger-progress-wrap');
        const progressBar = document.getElementById('db-ledger-progress-bar');
        
        if(textEl) {
            textEl.innerHTML = `
                <div style="font-size:22px; font-weight:900; color:#191F28; letter-spacing:-0.5px; margin-bottom:4px;">${percent}%</div>
                <div style="font-size:12px; font-weight:800; color:var(--text-s); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${goalName}</div>
            `;
        }
        if(progressWrap && progressBar) {
            progressWrap.style.display = 'block';
            progressBar.style.width = percent + "%";
        }
    }

    // ✨✨ 여기서 방금 만든 스마트 배너를 호출합니다! ✨✨
    if (typeof updateSmartBanner === 'function') updateSmartBanner();
}

function initDarkMode() {
    const savedMode = localStorage.getItem('tosil_dark_mode');
    if (savedMode === 'on') { document.body.classList.add('dark-mode'); const toggleBtn = document.getElementById('dark-mode-toggle'); if(toggleBtn) toggleBtn.innerText = '☀️'; }
}
function toggleDarkMode() {
    const body = document.body; body.classList.toggle('dark-mode');
    const toggleBtn = document.getElementById('dark-mode-toggle');
    if(toggleBtn) toggleBtn.innerText = body.classList.contains('dark-mode') ? '☀️' : '🌙';
    localStorage.setItem('tosil_dark_mode', body.classList.contains('dark-mode') ? 'on' : 'off');
}
window.toggleDarkMode = toggleDarkMode;

/// ==========================================
// 🧊 [안심 큐브 냉장고 엔진] (실시간 동기화)
// ==========================================
// 페이지 로드 시 날짜 입력칸을 '오늘'로 자동 세팅
document.addEventListener("DOMContentLoaded", () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('cube-date');
    if (dateInput) dateInput.value = todayStr;
});

// 유통기한 D-Day 계산 (얼린 날로부터 14일 기준)
// 유통기한 압박 대신 '보관일수'를 보여주는 따뜻한 로직으로 변경
function getCubeDDayText(madeDateStr) {
    const madeDate = new Date(madeDateStr); madeDate.setHours(0,0,0,0);
    const today = new Date(); today.setHours(0,0,0,0);
    
    // 얼린 날로부터 오늘까지 며칠 지났는지 계산
    const diffDays = Math.floor((today - madeDate) / (1000 * 60 * 60 * 24));
    
    let color = "#3182F6"; // 기본 파란색 (신선)
    let bg = "#EBF4FF";
    let text = `보관 ${diffDays}일차`;
    
    if (diffDays === 0) {
        text = "오늘 얼림";
        color = "#00B37A"; // 초록색
        bg = "#E6F7F2";
    } else if (diffDays > 14) {
        // 2주가 넘어가면 조심하라는 의미로 주황색 정도로만 부드럽게 표현 (빨간색 금지)
        color = "#FF823A"; 
        bg = "#FFF0E6";
    } else if (diffDays < 0) {
        // 혹시 미래 날짜를 잘못 입력했을 경우
        text = "날짜 오류";
        color = "#8B95A1";
        bg = "#F2F5F8";
    }
    
    return `<span style="background:${bg}; color:${color}; font-size:11px; font-weight:800; padding:4px 8px; border-radius:6px; border:1px solid ${color};">${text}</span>`;
}

// 큐브 추가하기
async function addCubeRecord() {
    const cat = document.getElementById('cube-category').value;
    const name = document.getElementById('cube-name').value.trim();
    const date = document.getElementById('cube-date').value;
    const qty = parseInt(document.getElementById('cube-qty').value);

    if (!name || !date || isNaN(qty) || qty <= 0) {
        return alert("큐브 이름, 날짜, 수량을 정확히 입력해주세요!");
    }

    const newCube = {
        id: "cube_" + new Date().getTime(),
        cat: cat,
        name: name,
        date: date,
        qty: qty,
        timestamp: new Date().getTime()
    };

    let records = JSON.parse(localStorage.getItem('tosil_cube_records')) || [];
    records.push(newCube);
    
    // 파이어베이스에 쏘기
    if (typeof db !== 'undefined') {
        const syncCode = localStorage.getItem("family_sync_code") || "unlinked_local_diary";
        try {
            await setDoc(doc(db, "cube_" + syncCode, "status"), { records: records });
        } catch (e) { console.error(e); }
    }

    localStorage.setItem('tosil_cube_records', JSON.stringify(records));
    document.getElementById('cube-name').value = '';
    document.getElementById('cube-qty').value = '';
    renderCubes();
}

// 큐브 1개 사용하기 (-1 차감)
async function useCube(id) {
    let records = JSON.parse(localStorage.getItem('tosil_cube_records')) || [];
    const index = records.findIndex(r => r.id === id);
    if (index === -1) return;

    records[index].qty -= 1;
    
    if (records[index].qty <= 0) {
        records.splice(index, 1); // 0개 되면 자동 삭제
    }

    if (typeof db !== 'undefined') {
        const syncCode = localStorage.getItem("family_sync_code") || "unlinked_local_diary";
        try { await setDoc(doc(db, "cube_" + syncCode, "status"), { records: records }); } 
        catch (e) { console.error(e); }
    }

    localStorage.setItem('tosil_cube_records', JSON.stringify(records));
    renderCubes();
}

// 큐브 화면에 그리기
function renderCubes() {
    const container = document.getElementById('cube-list-container');
    if (!container) return;

    let records = JSON.parse(localStorage.getItem('tosil_cube_records')) || [];
    
    if (records.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:30px; background:var(--bg-sub); border-radius:16px; border:1px dashed var(--border);">
                <div style="font-size:24px; margin-bottom:10px;">🌬️</div>
                <div style="font-size:13.5px; font-weight:800; color:var(--text-s);">냉동실이 텅 비어있어요!<br>이유식 재료를 얼리고 기록해보세요.</div>
            </div>`;
        return;
    }

    // 날짜 임박순 정렬
    records.sort((a, b) => new Date(a.date) - new Date(b.date));

    let html = '';
    records.forEach(r => {
        const icon = r.cat === 'meat' ? '🥩' : '🥦';
        const dDayHtml = getCubeDDayText(r.date);
        
        html += `
        <div style="background:var(--bg-card); border:1px solid var(--border); padding:16px; border-radius:16px; display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:12px;">
                <div style="font-size:24px; background:var(--bg-sub); width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center;">${icon}</div>
                <div>
                    <div style="font-size:15px; font-weight:900; color:var(--text-m); margin-bottom:4px;">${r.name}</div>
                    <div style="display:flex; align-items:center; gap:6px; font-size:12px; color:var(--text-s);">
                        ${dDayHtml} <span style="opacity:0.7;">(${r.date} 제조)</span>
                    </div>
                </div>
            </div>
            <div style="display:flex; align-items:center; gap:12px;">
                <div style="font-size:18px; font-weight:900; color:var(--primary);">${r.qty}<span style="font-size:12px; color:var(--text-s);">개</span></div>
                <button onclick="useCube('${r.id}')" style="background:#F2F5F8; color:#4E5968; border:none; border-radius:10px; width:44px; height:44px; font-size:20px; cursor:pointer; display:flex; align-items:center; justify-content:center;">🥄</button>
            </div>
        </div>`;
    });

    container.innerHTML = html;
}

window.addCubeRecord = addCubeRecord;
window.useCube = useCube;

// ==========================================
// 🧊 [냉장고] 파이어베이스 실시간 수신 리스너
// ==========================================
let cubeUnsubscribe = null;
function startCubeRealtimeSync() {
    const syncCode = localStorage.getItem("family_sync_code") || "unlinked_local_diary";
    const docRef = typeof doc !== 'undefined' && typeof window.db !== 'undefined' ? doc(window.db, "cube_" + syncCode, "status") : null;
    
    if(!docRef) return; 

    // 기존 연결 끄기 (중복 방지)
    if (cubeUnsubscribe) cubeUnsubscribe();
    if(typeof window.onSnapshot !== 'function') return;

    // 서버에 변화가 생기면 실시간으로 감지해서 화면을 다시 그림
    cubeUnsubscribe = window.onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            localStorage.setItem('tosil_cube_records', JSON.stringify(data.records || []));
        }
        if (typeof renderCubes === 'function') renderCubes();
    });
}

// 전역에 연결해두어 window.onload에서 실행되게 만듦
window.startCubeRealtimeSync = startCubeRealtimeSync;

// ==========================================
// 💌 [부부 육아 바통터치 엔진] (버그 완벽 수정본)
// ==========================================
async function saveBatonToFirebase(records) {
    if (typeof db !== 'undefined' && typeof setDoc === 'function') {
        const syncCode = localStorage.getItem("family_sync_code") || "unlinked_local_diary";
        try { await setDoc(doc(db, "baton_" + syncCode, "status"), { records }); } catch (e) {}
    }
    localStorage.setItem('tosil_baton_records', JSON.stringify(records));
    renderBatonTasks();
}

async function addQuickBaton(text) {
    const rewardSelect = document.getElementById('baton-reward');
    const customInput = document.getElementById('baton-reward-custom');
    let reward = "없음";
    if (rewardSelect) {
        if (rewardSelect.value === 'custom' && customInput && customInput.value.trim() !== '') {
            reward = "✨ " + customInput.value.trim();
        } else if (rewardSelect.value !== 'custom') {
            reward = rewardSelect.value;
        }
    }
    await createBatonTask(text, reward);
}

async function addCustomBaton() {
    const input = document.getElementById('baton-text');
    const rewardSelect = document.getElementById('baton-reward');
    const customInput = document.getElementById('baton-reward-custom');
    if (!input || !input.value.trim()) return alert("부탁할 내용을 입력해 주세요!");
    
    let reward = "없음";
    if (rewardSelect) {
        if (rewardSelect.value === 'custom' && customInput && customInput.value.trim() !== '') {
            reward = "✨ " + customInput.value.trim();
        } else if (rewardSelect.value !== 'custom') {
            reward = rewardSelect.value;
        }
    }
    await createBatonTask(input.value.trim(), reward);
    
    input.value = '';
    if(rewardSelect) {
        rewardSelect.value = "없음";
        if(customInput) customInput.style.display = 'none';
    }
}

async function createBatonTask(text, reward) {
    let records = JSON.parse(localStorage.getItem('tosil_baton_records')) || [];
    
    // 중복 방지 (도배 막기)
    const isDuplicate = records.some(r => r.text === text);
    if (isDuplicate) return alert("🚨 이미 똑같은 부탁이 대기 중입니다! (중복 입력 방지)");

    const now = new Date(), timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    records.unshift({ id: "baton_"+now.getTime(), text, reward, time: timeStr, status: "requested" });
    await saveBatonToFirebase(records);
}

async function acceptBaton(id) {
    let records = JSON.parse(localStorage.getItem('tosil_baton_records')) || [];
    const idx = records.findIndex(r => r.id === id);
    if (idx === -1) return;
    records[idx].status = "accepted";
    await saveBatonToFirebase(records);
}

async function completeBaton(id) {
    let records = JSON.parse(localStorage.getItem('tosil_baton_records')) || [];
    const idx = records.findIndex(r => r.id === id);
    if (idx === -1) return;
    
    const reward = records[idx].reward; 
    records.splice(idx, 1); 
    await saveBatonToFirebase(records);

    // 🎁 미션 완료 팡파르 알림
    if (reward && reward !== "없음") {
        alert(`🎉 미션 해결 완료!\n\n약속된 보상 [${reward}]을(를) 당당하게 요구하세요! ㅋㅋㅋ 👍`);
    } else {
        alert("🎉 미션 해결 완료! 든든한 육아메이트 최고입니다 👍");
    }
}

async function cancelBaton(id) {
    if (!confirm("이 부탁을 취소하시겠습니까?")) return;
    let records = JSON.parse(localStorage.getItem('tosil_baton_records')) || [];
    records = records.filter(r => r.id !== id);
    await saveBatonToFirebase(records);
}

function renderBatonTasks() {
    const container = document.getElementById('baton-list-container');
    if (!container) return;
    let records = JSON.parse(localStorage.getItem('tosil_baton_records')) || [];
    
    if (records.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:30px; background:var(--bg-sub); border-radius:16px; border:1px dashed var(--border);">
                <div style="font-size:24px; margin-bottom:10px;">🕊️</div>
                <div style="font-size:13.5px; font-weight:800; color:var(--text-s);">현재 대기 중인 SOS 요청이 없습니다.<br>평화로운 공동 육아 중! 🤍</div>
            </div>`;
        return;
    }

    let html = '';
    records.forEach(r => {
        let statusHtml = '';
        let actionBtn = '';
        
        if (r.status === 'requested') {
            statusHtml = `<span style="background:#FFF0F1; color:#F04452; font-size:11px; font-weight:800; padding:4px 8px; border-radius:6px; border:1px solid #F04452; white-space:nowrap; display:inline-block; flex-shrink:0;">⏳ 요청중</span>`;
            actionBtn = `<button onclick="acceptBaton('${r.id}')" style="padding:10px 14px; background:#3182F6; color:#FFF; border:none; border-radius:10px; font-size:12.5px; font-weight:800; cursor:pointer; flex-shrink:0; white-space:nowrap;">🫡 미션접수</button>`;
        } else if (r.status === 'accepted') {
            statusHtml = `<span style="background:#EBF4FF; color:#3182F6; font-size:11px; font-weight:800; padding:4px 8px; border-radius:6px; border:1px solid #3182F6; white-space:nowrap; display:inline-block; flex-shrink:0;">🏃‍♂️ 처리중</span>`;
            actionBtn = `<button onclick="completeBaton('${r.id}')" style="padding:10px 14px; background:#00B37A; color:#FFF; border:none; border-radius:10px; font-size:12.5px; font-weight:800; cursor:pointer; flex-shrink:0; white-space:nowrap;">✅ 해결완료</button>`;
        }

        let cancelBtn = `<button onclick="cancelBaton('${r.id}')" style="padding:10px 12px; background:#F2F5F8; color:#8B95A1; border:none; border-radius:10px; font-size:12.5px; font-weight:800; cursor:pointer; flex-shrink:0; white-space:nowrap; margin-right:6px;">취소</button>`;
        let rewardHtml = (r.reward && r.reward !== "없음") ? `<div style="display:inline-block; margin-top:8px; background:#FFF9E6; color:#B78103; font-size:11.5px; font-weight:800; padding:5px 10px; border-radius:8px; border:1px solid #FFE58F;">🎁 약속된 보상: ${r.reward}</div>` : '';

        html += `
        <div class="timeline-item" style="background:#FFFFFF; border:1px solid var(--border); padding:16px; border-radius:16px; display:flex; justify-content:space-between; align-items:center; box-shadow:0 2px 8px rgba(0,0,0,0.01); margin-bottom:8px;">
            <div style="display:flex; align-items:center; gap:12px; flex:1;">
                <div style="flex:1;">
                    <div style="font-size:14.5px; font-weight:800; color:var(--text-m); margin-bottom:6px; line-height:1.4;">${r.text}</div>
                    <div style="display:flex; align-items:center; gap:6px; font-size:12px; color:var(--text-s);">
                        ${statusHtml} <span style="opacity:0.6; white-space:nowrap;">⏱️ ${r.time}</span>
                    </div>
                    ${rewardHtml}
                </div>
            </div>
            <div style="margin-left:12px; display:flex; align-items:center;">
                ${cancelBtn}
                ${actionBtn}
            </div>
        </div>`;
    });
    container.innerHTML = html;
}

window.addQuickBaton = addQuickBaton;
window.addCustomBaton = addCustomBaton;
window.acceptBaton = acceptBaton;
window.completeBaton = completeBaton;
window.cancelBaton = cancelBaton;

// ==========================================
// 🍽️ 8. 이유식 알레르기 체크리스트 엔진
// ==========================================
function renderFoodChecklist() {
    const container = document.getElementById('food-list-container');
    if (!container) return;
    
    let savedFoods = {};
    try { savedFoods = JSON.parse(localStorage.getItem('tosil_food_test')) || {}; } catch (e) { savedFoods = {}; }

    let passedCount = 0;
    let totalCount = 0;
    let html = '';
    
    foodCategories.forEach(cat => {
        html += `<div><div style="font-size:14px; font-weight:800; color:var(--text-m); margin-bottom:10px;">${cat.name}</div><div style="display:flex; flex-wrap:wrap; gap:8px;">`;
        cat.items.forEach(item => {
            totalCount++;
            const status = savedFoods[item] || 0; 
            let btnStyle = "background:#F2F5F8; color:var(--text-s); border:1px solid var(--border);";
            let icon = "⬜ ";
            
            if (status === 1) {
                btnStyle = "background:#E6F7F2; color:#00B37A; border:1px solid #00B37A; font-weight:800;";
                icon = "✅ ";
                passedCount++;
            } else if (status === 2) {
                btnStyle = "background:#FFF0F1; color:#F04452; border:1px solid #F04452; font-weight:800;";
                icon = "🚨 ";
            }

            html += `<button onclick="toggleFoodStatus('${item}')" style="padding:10px 14px; border-radius:12px; font-size:13.5px; cursor:pointer; transition:all 0.2s; ${btnStyle}">${icon}${item}</button>`;
        });
        html += `</div></div>`;
    });

    container.innerHTML = html;
    
    const countEl = document.getElementById('food-passed-count');
    if(countEl) {
        countEl.innerText = passedCount;
        if(countEl.nextElementSibling) countEl.nextElementSibling.innerText = `/${totalCount}`;
    }
}

function toggleFoodStatus(itemName) {
    let savedFoods = JSON.parse(localStorage.getItem('tosil_food_test')) || {};
    let currentStatus = savedFoods[itemName] || 0;
    currentStatus = (currentStatus + 1) % 3;
    savedFoods[itemName] = currentStatus;
    localStorage.setItem('tosil_food_test', JSON.stringify(savedFoods));
    renderFoodChecklist(); 
}

// ==========================================
// 💌 [바통터치] 실시간 감시 엔진 (이게 있어야 양방향 동기화됩니다)
// ==========================================
let batonUnsubscribe = null;
function startBatonRealtimeSync() {
    const syncCode = localStorage.getItem("family_sync_code") || "unlinked_local_diary";
    const docRef = typeof doc !== 'undefined' && typeof window.db !== 'undefined' ? doc(window.db, "baton_" + syncCode, "status") : null;
    
    if(!docRef) return; 

    // 기존 감시 중단
    if (batonUnsubscribe) batonUnsubscribe();
    if(typeof window.onSnapshot !== 'function') return;

    // 서버 변화 실시간 감시
    batonUnsubscribe = window.onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            localStorage.setItem('tosil_baton_records', JSON.stringify(data.records || []));
            renderBatonTasks(); // 서버 데이터가 바뀌면 즉시 화면 갱신!
        }
    });
}
window.startBatonRealtimeSync = startBatonRealtimeSync;

// ==========================================
// 🚀 런타임 구동 마스터 마운트 (사진 로딩 버그 수정)
// ==========================================
window.onload = () => { 
    loadAllExternalData(); 
    renderBabyInfo(); 
    loadBabyPhoto(); // 🔥 여기서 사진 잊지 않고 불러옵니다!
    renderCubes();
    renderBatonTasks();
    updateLedgerUI();
    updateHomeDashboard();
    initDarkMode();
    renderFoodChecklist(); 
    
    const toolboxTab = document.getElementById('tab-toolbox');
    if(toolboxTab) {
        toolboxTab.querySelectorAll('.panel-block').forEach(p => { 
            if(!p.classList.contains('active')) p.style.display = 'none'; 
        });
    }
    
    document.querySelectorAll('.sym-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const cb = this.previousElementSibling;
            setTimeout(() => {
                if (cb && cb.checked) {
                    this.style.background = 'rgba(49, 130, 246, 0.15)'; this.style.border = '1px solid #3182F6'; this.style.color = '#3182F6';
                } else {
                    this.style.background = ''; this.style.border = ''; this.style.color = '';
                }
            }, 10);
        });
    });
        
    if (typeof startFeverRealtimeSync === 'function') { startFeverRealtimeSync(); } else { renderFeverTimeline(); updateHomeDashboard(); }
    if (typeof startCubeRealtimeSync === 'function') { startCubeRealtimeSync(); } else { renderCubes(); }
    if (typeof startBatonRealtimeSync === 'function') { startBatonRealtimeSync(); } else { renderBatonTasks(); }
    if (typeof startLedgerRealtimeSync === 'function') { startLedgerRealtimeSync(); } else { updateLedgerUI(); }

updateSyncBadge(); 

};

// ==========================================
// 👨‍👩‍👧 가족 실시간 연동 모달 컨트롤 (복구 완료)
// ==========================================
function openFamilySyncModal() {
    const m = document.getElementById('family-sync-modal'); 
    if(m) m.style.display = 'flex';
}

function closeFamilySyncModalForce() {
    const m = document.getElementById('family-sync-modal'); 
    if(m) m.style.display = 'none';
}

function closeFamilySyncModal(e) {
    if (e.target.id === 'family-sync-modal') {
        closeFamilySyncModalForce();
    }
}

// HTML에서 클릭 시 무조건 인식하도록 전역(window) 연결
window.openFamilySyncModal = openFamilySyncModal;
window.closeFamilySyncModalForce = closeFamilySyncModalForce;
window.closeFamilySyncModal = closeFamilySyncModal;

function updateSyncBadge() {
    // Firebase에서 연동 코드를 저장하는 키 이름('family_sync_code')에 맞췄습니다.
    const syncCode = localStorage.getItem('family_sync_code'); 
    
    const badgeBtn = document.getElementById('sync-badge-btn');
    const badgeText = document.getElementById('sync-status-text');
    const badgeIcon = document.getElementById('sync-status-icon');

    if (!badgeBtn || !badgeText) return; // 요소가 없으면 에러 안 나게 패스

    if (syncCode) {
        // 연동 되었을 때: 눈에 덜 띄는 시원한 파란색
        badgeBtn.style.background = "#E8F0FE";
        badgeBtn.style.color = "#1A73E8";
        badgeText.innerText = "연동완료";
        if(badgeIcon) badgeIcon.innerText = "🔗";
    } else {
        // 연동 안 되었을 때: 눈에 확 띄게 경고 (주황/빨강)
        badgeBtn.style.background = "#FFF3CD";
        badgeBtn.style.color = "#856404";
        badgeText.innerText = "연동 필요!";
        if(badgeIcon) badgeIcon.innerText = "🚨";
    }
}
// 전역에 연결해두기
window.updateSyncBadge = updateSyncBadge;

// ==========================================
// 💰 [가계부 리스너] 파이어베이스 연동 연결고리
// ==========================================
let ledgerUnsubscribe = null;
function startLedgerRealtimeSync() {
    const syncCode = localStorage.getItem("family_sync_code") || "unlinked_local_diary";
    const docRef = typeof doc !== 'undefined' && typeof window.db !== 'undefined' ? doc(window.db, "ledger_" + syncCode, "status") : null;
    if(!docRef) return; 

    if (ledgerUnsubscribe) ledgerUnsubscribe();
    if(typeof window.onSnapshot !== 'function') return;

    ledgerUnsubscribe = window.onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            localStorage.setItem('tosil_ledger_data', JSON.stringify(data));
        }
        if (typeof updateLedgerUI === 'function') updateLedgerUI();
        if (typeof updateHomeDashboard === 'function') updateHomeDashboard();
    });
}
window.startLedgerRealtimeSync = startLedgerRealtimeSync;

// ==========================================
// 💡 스마트 홈 배너 엔진 (우선순위: 바통터치 > 큐브)
// ==========================================
function updateSmartBanner() {
    const container = document.getElementById('smart-banner-container');
    if(!container) return;

    // 💌 1순위: 바통터치 SOS 확인
    const batonRecords = JSON.parse(localStorage.getItem('tosil_baton_records')) || [];
    const urgentBaton = batonRecords.find(r => r.status === 'requested');

    if (urgentBaton) {
        container.innerHTML = `
            <div onclick="switchTab('toolbox', document.getElementById('nav-toolbox')); setTimeout(() => switchTool('baton'), 50);" style="background: linear-gradient(135deg, #F4F0FF 0%, #EBE5FF 100%); border: 1px solid #D9CFFF; border-radius: 16px; padding: 16px 20px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; gap: 12px; cursor: pointer; box-shadow: 0 4px 12px rgba(107,78,255,0.12);">
                <div style="display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0;">
                    <div style="font-size: 26px; flex-shrink: 0;">💌</div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 12px; font-weight: 800; color: #6B4EFF; margin-bottom: 4px;">아내의 바통터치 요청!</div>
                        <div style="font-size: 14.5px; font-weight: 900; color: #191F28; line-height: 1.4; word-break: keep-all;">"${urgentBaton.text}"</div>
                    </div>
                </div>
                <span style="flex-shrink: 0; white-space: nowrap; background: #6B4EFF; color: white; font-size: 13px; font-weight: 900; padding: 8px 14px; border-radius: 12px;">교대하기</span>
            </div>
        `;
        container.style.display = 'block';
        return; 
    }

    // ⚠️ 2순위: 큐브 재고 확인
    const cubeRecords = JSON.parse(localStorage.getItem('tosil_cube_records')) || [];
    const lowCube = cubeRecords.find(r => r.qty <= 2);

    if (lowCube) {
        container.innerHTML = `
            <div onclick="switchTab('toolbox', document.getElementById('nav-toolbox')); setTimeout(() => switchTool('cube'), 50);" style="background: linear-gradient(135deg, #FFF9E6 0%, #FFF3C4 100%); border: 1px solid #FFE58F; border-radius: 16px; padding: 16px 20px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; gap: 12px; cursor: pointer; box-shadow: 0 4px 12px rgba(245,158,11,0.08);">
                <div style="display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0;">
                    <div style="font-size: 26px; flex-shrink: 0;">🧊</div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 12px; font-weight: 800; color: #B78103; margin-bottom: 4px;">이유식 큐브 충전 필요</div>
                        <div style="font-size: 14.5px; font-weight: 900; color: #191F28; line-height: 1.4; word-break: keep-all;">${lowCube.name} 큐브가 ${lowCube.qty}개 남았어요!</div>
                    </div>
                </div>
                <span style="flex-shrink: 0; white-space: nowrap; background: #F59E0B; color: white; font-size: 13px; font-weight: 900; padding: 8px 14px; border-radius: 12px;">채우기</span>
            </div>
        `;
        container.style.display = 'block';
        return;
    }

    // 🌿 3순위: 아무 이슈가 없으면 빈칸으로 만들고 숨기기
    container.innerHTML = '';
    container.style.display = 'none';
}
window.updateSmartBanner = updateSmartBanner;

// ==========================================
// 💩 기저귀 일기 (배변 기록기) 엔진 (완전체)
// ==========================================
let currentPoopColor = '';
let currentPoopTexture = '';

// 입력창 열고 닫기
function togglePoopForm() {
    const area = document.getElementById('poop-input-area');
    if(area) area.style.display = (area.style.display === 'none') ? 'block' : 'none';
}

// 색깔 선택
function selectPoopColor(color, btn) {
    currentPoopColor = color;
    document.querySelectorAll('.poop-color-btn').forEach(b => {
        b.style.border = '1px solid #ddd'; b.style.fontWeight = 'normal'; b.style.boxShadow = 'none';
    });
    btn.style.border = '2px solid #3182F6'; btn.style.fontWeight = '900'; btn.style.boxShadow = '0 2px 4px rgba(49,130,246,0.2)';
}

// 상태 선택
function selectPoopTexture(tex, btn) {
    currentPoopTexture = tex;
    document.querySelectorAll('.poop-tex-btn').forEach(b => {
        b.style.border = '1px solid #ddd'; b.style.fontWeight = 'normal'; b.style.boxShadow = 'none';
    });
    btn.style.border = '2px solid #3182F6'; btn.style.fontWeight = '900'; btn.style.boxShadow = '0 2px 4px rgba(49,130,246,0.2)';
}

// 저장 및 파이어베이스 연동 로직
async function savePoopRecord() {
    if(!currentPoopColor || !currentPoopTexture) return alert("색깔과 상태를 모두 선택해주세요!");

    const now = new Date();
    // 날짜와 시간을 보기 좋게 포맷팅 (예: 6/23 14:30)
    const timeStr = `${now.getMonth()+1}/${now.getDate()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    
    const record = {
        id: "poop_" + now.getTime(),
        time: timeStr,
        color: currentPoopColor,
        texture: currentPoopTexture
    };

    let records = JSON.parse(localStorage.getItem('tosil_poop_records')) || [];
    records.unshift(record); // 최신 기록이 위로 오게
    if(records.length > 20) records.pop(); // 최대 20개만 보관 (최적화)

    // 파이어베이스 동기화 (가족 연동)
    if (typeof db !== 'undefined' && typeof setDoc === 'function') {
        const syncCode = localStorage.getItem("family_sync_code") || "unlinked_local_diary";
        try { await setDoc(doc(db, "poop_" + syncCode, "status"), { records: records }); } catch(e){}
    }

    localStorage.setItem('tosil_poop_records', JSON.stringify(records));
    
    // 초기화 및 화면 닫기
    currentPoopColor = ''; currentPoopTexture = '';
    document.querySelectorAll('.poop-color-btn, .poop-tex-btn').forEach(b => {
        b.style.border = '1px solid #ddd'; b.style.fontWeight = 'normal'; b.style.boxShadow = 'none';
    });
    togglePoopForm();
    renderPoopTimeline(); // 즉시 화면에 그리기
}

// 화면에 타임라인 그리기
// 화면에 타임라인 그리기 (❌ 삭제 버튼 추가)
function renderPoopTimeline() {
    const container = document.getElementById('poop-timeline');
    if(!container) return;

    let records = JSON.parse(localStorage.getItem('tosil_poop_records')) || [];
    
    if(records.length === 0) {
        container.innerHTML = `<div style="font-size:12px; color:#8B95A1; text-align:center; padding:20px 10px;">아직 기록된 배변 일기가 없습니다.</div>`;
        return;
    }

    let html = '';
    records.forEach(r => {
        html += `
        <div style="display:flex; justify-content:space-between; align-items:center; background:#FFFFFF; border:1px solid #E5E8EB; padding:12px; border-radius:12px;">
            <div style="font-size:12px; color:#8B95A1; font-weight:800;">${r.time}</div>
            <div style="display:flex; align-items:center; gap:8px;">
                <span style="background:#F2F5F8; padding:4px 8px; border-radius:6px; font-size:12.5px; font-weight:800;">${r.color}</span>
                <span style="background:#F2F5F8; padding:4px 8px; border-radius:6px; font-size:12.5px; font-weight:800;">${r.texture}</span>
                <button onclick="deletePoopRecord('${r.id}')" style="background:none; border:none; color:#B0B8C1; font-size:14px; cursor:pointer; padding:0 0 0 4px; margin-top:2px;">❌</button>
            </div>
        </div>`;
    });
    container.innerHTML = html;
}
window.renderPoopTimeline = renderPoopTimeline;

// 🗑️ 배변 기록 삭제 함수 새로 추가!
async function deletePoopRecord(id) {
    if(!confirm("이 배변 기록을 삭제하시겠습니까?")) return;

    let records = JSON.parse(localStorage.getItem('tosil_poop_records')) || [];
    records = records.filter(r => r.id !== id);

    // 파이어베이스 동기화
    if (typeof db !== 'undefined' && typeof setDoc === 'function') {
        const syncCode = localStorage.getItem("family_sync_code") || "unlinked_local_diary";
        try { await setDoc(doc(db, "poop_" + syncCode, "status"), { records: records }); } catch(e){}
    }

    localStorage.setItem('tosil_poop_records', JSON.stringify(records));
    renderPoopTimeline(); // 지우고 나서 화면 즉시 새로고침
}
window.deletePoopRecord = deletePoopRecord;

// 앱 켜질 때 자동으로 그려주기 위해 window.onload 안이나 바깥에 연결
document.addEventListener("DOMContentLoaded", () => {
    setTimeout(renderPoopTimeline, 300); // UI 렌더링 후 안전하게 호출
});

// ==========================================
// 👨‍⚕️ 소아과 진료 브리핑 리포트 엔진
// ==========================================
function openPediatricianReport() {
    let records = JSON.parse(localStorage.getItem('tosil_fever_records')) || [];
    if(records.length === 0) {
        return alert("아직 기록된 체온/투약 데이터가 없습니다. 건강한 상태네요! 🌿");
    }
    
    // 체중 정보 가져오기 (약 용량 계산용)
    let weight = localStorage.getItem('tosil_latest_weight') || '미입력';
    
    // 기록을 타임라인 UI로 변환
    let recordHtml = '<div style="max-height: 350px; overflow-y: auto; background:#F8F9FA; padding:16px; border-radius:12px; border:1px solid #E5E8EB; display:flex; flex-direction:column; gap:12px;">';
    
    records.forEach(r => {
        // 약 종류에 따른 텍스트 및 색상 세팅
        let pillText = '<span style="color:#8B95A1; font-weight:700;">약 미복용</span>';
        if (r.type === 'red') {
            pillText = '<span style="color:#FF4B2B; font-weight:900;">🔴 아세트아미노펜 (빨강)</span>';
        } else if (r.type === 'blue') {
            pillText = '<span style="color:#3182F6; font-weight:900;">🔵 이부/덱시부프로펜 (파랑)</span>';
        }
        
        // 동반 증상 세팅
        let symText = (r.symptoms && r.symptoms.length > 0) ? `<div style="margin-top:6px; font-size:11.5px; color:#6B7684; background:#F2F5F8; padding:4px 8px; border-radius:6px; display:inline-block;">🚨 증상: ${r.symptoms.join(', ')}</div>` : '';
        
        // 체온에 따른 색상 (38도 이상이면 빨간색 강조)
        let tempStyle = r.temp >= 38.0 ? 'color:#E32636; font-weight:900; font-size:16px;' : 'color:#191F28; font-weight:800; font-size:15px;';
        
        recordHtml += `
            <div style="border-bottom:1px dashed #D1D6DB; padding-bottom:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                    <span style="color:#4E5968; font-weight:800; font-size:13px;">⏱️ ${r.time}</span>
                    <span style="${tempStyle}">${r.temp}℃</span>
                </div>
                <div style="font-size:13px;">${pillText}</div>
                ${symText}
            </div>
        `;
    });
    recordHtml += '</div>';

    // 우리가 만들어둔 공용 프리미엄 모달을 불러와서 내용물만 싹 갈아끼웁니다
    const body = document.getElementById('modal-dynamic-body');
    if(!body) return;

    body.innerHTML = `
        <div class="modal-header-wrap" style="margin-bottom:8px;">
            <span class="modal-emoji">👨‍⚕️</span>
            <div class="modal-title">소아과 진료 브리핑</div>
        </div>
        <div style="font-size:13px; color:#6B7684; margin-bottom:20px; line-height:1.5;">
            의사 선생님께 스마트폰을 이대로 보여주세요.<br>최근 체중과 투약 기록이 시간순으로 정리되어 있습니다.
        </div>
        
        <div style="display:flex; justify-content:space-between; align-items:center; background:#EBF4FF; padding:16px; border-radius:12px; margin-bottom:16px; border:1px solid #D3E4FD;">
            <span style="color:#1A73E8; font-weight:800; font-size:14px;">⚖️ 최근 계측 체중</span>
            <span style="color:#1A73E8; font-weight:900; font-size:18px;">${weight}${weight !== '미입력' ? ' kg' : ''}</span>
        </div>

        <div style="font-size:14px; font-weight:800; color:#191F28; margin-bottom:10px;">📊 최근 타임라인 요약</div>
        ${recordHtml}

        <button class="btn-main" style="width:100%; margin-top:20px; padding:16px; border-radius:14px; background:#3182F6 !important; color:#FFF !important; font-weight:900; font-size:15px; border:none; cursor:pointer;" onclick="closeFestivalModalForce()">확인 완료</button>
    `;

    const modalWrap = document.getElementById('premium-modal');
    if(modalWrap) modalWrap.style.display = 'flex';
}
window.openPediatricianReport = openPediatricianReport;

// [실시간 감시 엔진 일괄 가동 스위치]
window.initRealtimeSync = () => {
    // 1. 여기서 각 기능의 실시간 동기화 함수를 호출합니다.
    // ※ 주의: 파트너님 코드에 있는 실제 함수 이름으로 맞춰주세요!
    
    if (typeof startFeverRealtimeSync === 'function') startFeverRealtimeSync();
    if (typeof startCubeRealtimeSync === 'function') startCubeRealtimeSync();
    if (typeof startBatonRealtimeSync === 'function') startBatonRealtimeSync();
    if (typeof startLedgerRealtimeSync === 'function') startLedgerRealtimeSync();
    
    console.log("🔥 실시간 감시 엔진 가동 완료!");
};

// ==========================================
// 📱 원터치 육아 트래커 엔진 (맞춤형 알람 + 삭제 + 그룹핑 완결판)
// ==========================================

window.trackerState = { type: '', subType: '', status: '' };

window.selectTrackerBtn = function(btn, category) {
    const siblings = btn.parentElement.children;
    for(let i=0; i<siblings.length; i++) {
        siblings[i].style.setProperty('background', '#FFF', 'important');
        siblings[i].style.setProperty('color', '#8B95A1', 'important');
        siblings[i].style.setProperty('border', '1px solid #E5E8EB', 'important');
        if(siblings[i].tagName === 'SPAN') siblings[i].style.setProperty('background', '#F8F9FA', 'important');
    }
    
    if (category === 'feed' || category === 'diaper_pee') {
        btn.style.setProperty('background', '#F0F7FF', 'important');
        btn.style.setProperty('color', '#3182F6', 'important');
        btn.style.setProperty('border', '1px solid #3182F6', 'important');
        window.trackerState.subType = btn.innerText;
        if(category === 'diaper_pee') {
            const statusArea = document.getElementById('diaper-status-area');
            if(statusArea) statusArea.style.display = 'none';
        }
    } else if (category === 'diaper_poop') {
        btn.style.setProperty('background', '#FFF0F1', 'important');
        btn.style.setProperty('color', '#D32F2F', 'important');
        btn.style.setProperty('border', '1px solid #F04452', 'important');
        window.trackerState.subType = '대변';
        const statusArea = document.getElementById('diaper-status-area');
        if(statusArea) statusArea.style.display = 'block';
    } else if (category === 'status_yellow') {
        btn.style.setProperty('background', '#FFF9E6', 'important');
        btn.style.setProperty('color', '#B78103', 'important');
        btn.style.setProperty('border', '1px solid #FFE58F', 'important');
        window.trackerState.status = '황금변';
    } else if (category === 'status_green') {
        btn.style.setProperty('background', '#ECFDF5', 'important');
        btn.style.setProperty('color', '#10B981', 'important');
        btn.style.setProperty('border', '1px solid #10B981', 'important');
        window.trackerState.status = '녹변';
    }
};

window.openTrackerSheet = function(type) {
    window.trackerState.type = type; window.trackerState.subType = ''; window.trackerState.status = '';
    const overlay = document.getElementById('tracker-sheet-overlay');
    const content = document.getElementById('tracker-sheet-content');
    const title = document.getElementById('tracker-sheet-title');
    const body = document.getElementById('tracker-sheet-body');
    const saveBtn = document.getElementById('btn-tracker-save');
    
    if (!overlay || !content) return;
    
    overlay.style.display = 'block'; setTimeout(() => { content.style.transform = 'translateY(0)'; }, 10);
    
    // ✨ 핵심: 현재 시간을 가져와서 시간 수정 입력창 만들기
    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const timeInputHtml = `
        <div style="text-align: center; margin-bottom: 20px;">
            <div style="font-size:12px; font-weight:800; color:var(--text-s); margin-bottom:6px;">언제 기록할까요? (터치하여 시간 수정)</div>
            <input type="time" id="v-tracker-time" value="${currentTimeStr}" style="border:none; background:#F2F5F8; padding:8px 16px; border-radius:12px; font-size:18px; font-weight:900; color:var(--primary); outline:none;">
        </div>
    `;
    
    if (type === 'feed') {
        title.innerHTML = '🍼 수유 기록하기';
        // ✨ 수유창에 시간 입력창 추가
        body.innerHTML = timeInputHtml + `
            <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                <button class="btn-main" onclick="window.selectTrackerBtn(this, 'feed')" style="flex: 1; background: #FFF; color: #8B95A1; border: 1px solid #E5E8EB; box-shadow: none; margin:0; transition:0.2s;">분유</button>
                <button class="btn-main" onclick="window.selectTrackerBtn(this, 'feed')" style="flex: 1; background: #FFF; color: #8B95A1; border: 1px solid #E5E8EB; box-shadow: none; margin:0; transition:0.2s;">모유</button>
                <button class="btn-main" onclick="window.selectTrackerBtn(this, 'feed')" style="flex: 1; background: #FFF; color: #8B95A1; border: 1px solid #E5E8EB; box-shadow: none; margin:0; transition:0.2s;">유축</button>
            </div>
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="font-size: 13px; font-weight: 800; color: var(--text-s); margin-bottom: 8px;">먹은 양 (ml)</div>
                <div style="display: flex; justify-content: center; align-items: baseline; gap: 4px;">
                    <input type="number" id="v-feed-amount" placeholder="160" style="font-size: 40px; font-weight: 900; color: var(--text-m); border: none; outline: none; background: transparent; text-align: center; width: 100px; padding: 0; margin: 0; border-bottom: 2px solid #E5E8EB; border-radius: 0;">
                    <span style="font-size: 18px; font-weight: 800; color: var(--text-s);">ml</span>
                </div>
            </div>
        `;
        if(saveBtn) saveBtn.style.display = 'block';

    } else if (type === 'sleep') {
        // 수면 코드는 기존과 동일 (실시간 타이머라 시간 수정 불필요)
        title.innerHTML = '💤 수면 기록하기';
        const sleepStart = localStorage.getItem('tosil_sleep_start');
        if (sleepStart) {
            body.innerHTML = `
                <div style="text-align:center; padding:20px 0;">
                    <div style="font-size: 14px; font-weight: 800; color: #4E5968; margin-bottom: 12px;">우리아기 자는 중 🤫</div>
                    <div id="sleep-timer-display" style="font-size: 48px; font-weight: 900; color: #A855F7; letter-spacing: 2px; font-variant-numeric: tabular-nums;">00:00:00</div>
                </div>
                <button class="btn-main" onclick="window.stopSleepTimer()" style="background: #191F28 !important; color: white !important; font-size: 16px; padding: 16px; width:100%; border-radius:16px;">수면 종료 및 저장</button>
            `;
            if(saveBtn) saveBtn.style.display = 'none';
            
            window.sleepInterval = setInterval(() => {
                const diff = Math.floor((new Date().getTime() - parseInt(sleepStart)) / 1000);
                const h = String(Math.floor(diff / 3600)).padStart(2,'0');
                const m = String(Math.floor((diff % 3600)/60)).padStart(2,'0');
                const s = String(diff % 60).padStart(2,'0');
                const el = document.getElementById('sleep-timer-display');
                if(el) el.innerText = `${h}:${m}:${s}`;
            }, 1000);
        } else {
            body.innerHTML = `
                <div style="background: #F8F9FA; border-radius: 16px; padding: 30px 20px; text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 15px; font-weight: 800; color: #4E5968; margin-bottom: 16px;">우리아기 꿀잠 타이머</div>
                    <button class="btn-main" onclick="window.startSleepTimer()" style="background: #A855F7 !important; color: white !important; font-size: 16px; padding: 14px 30px; box-shadow: 0 4px 12px rgba(168,85,247,0.3) !important; margin:0; border-radius:14px;">▶ 낮잠 시작</button>
                </div>
            `;
            if(saveBtn) saveBtn.style.display = 'none';
        }
    } else if (type === 'diaper') {
        title.innerHTML = '💩 기저귀 기록하기';
        // ✨ 기저귀 창에도 시간 입력창 추가
        body.innerHTML = timeInputHtml + `
            <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                <button class="btn-main" onclick="window.selectTrackerBtn(this, 'diaper_pee')" style="flex: 1; background: #FFF; color: #8B95A1; border: 1px solid #E5E8EB; box-shadow: none; margin:0; transition:0.2s;">소변</button>
                <button class="btn-main" onclick="window.selectTrackerBtn(this, 'diaper_poop')" style="flex: 1; background: #FFF; color: #8B95A1; border: 1px solid #E5E8EB; box-shadow: none; margin:0; transition:0.2s;">대변</button>
            </div>
            <div id="diaper-status-area" style="display:none; margin-bottom:10px;">
                <div style="text-align: center; font-size: 14px; font-weight: 800; color: #4E5968; margin-bottom: 12px;">변의 상태는 어땠나요?</div>
                <div style="display: flex; justify-content: center; gap: 8px;">
                    <span onclick="window.selectTrackerBtn(this, 'status_yellow')" style="padding: 8px 16px; background: #F8F9FA; color: #8B95A1; border-radius: 12px; font-weight: 800; font-size: 13px; border: 1px solid #E5E8EB; cursor:pointer; transition:0.2s;">🟨 황금변</span>
                    <span onclick="window.selectTrackerBtn(this, 'status_green')" style="padding: 8px 16px; background: #F8F9FA; color: #8B95A1; border-radius: 12px; font-weight: 800; font-size: 13px; border: 1px solid #E5E8EB; cursor:pointer; transition:0.2s;">🟩 녹변</span>
                </div>
            </div>
        `;
        if(saveBtn) saveBtn.style.display = 'block';
    }
};

window.closeTrackerSheet = function() {
    const overlay = document.getElementById('tracker-sheet-overlay');
    const content = document.getElementById('tracker-sheet-content');
    if (!overlay || !content) return;
    content.style.transform = 'translateY(100%)';
    setTimeout(() => { overlay.style.display = 'none'; }, 300);
    if(window.sleepInterval) clearInterval(window.sleepInterval);
};

window.startSleepTimer = function() {
    localStorage.setItem('tosil_sleep_start', new Date().getTime());
    window.openTrackerSheet('sleep'); 
    window.updateTrackerDashboard();
};

window.stopSleepTimer = function() {
    const start = localStorage.getItem('tosil_sleep_start');
    if(!start) return;
    const end = new Date().getTime();
    const durationMins = Math.floor((end - parseInt(start)) / 60000);
    
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    let record = { id: 'trk_'+now.getTime(), time: timeStr, timestamp: now.getTime(), type: 'sleep', amount: durationMins };
    
    let records = JSON.parse(localStorage.getItem('tosil_tracker_records')) || [];
    records.unshift(record);
    if(records.length > 100) records.pop();
    localStorage.setItem('tosil_tracker_records', JSON.stringify(records));
    
    localStorage.removeItem('tosil_sleep_start');
    window.closeTrackerSheet();
    window.updateTrackerDashboard();
};

window.saveTrackerRecord = function() {
    if(!window.trackerState.type) return;

    // ✨ 핵심: 사용자가 팝업에서 수정한 시간을 긁어옵니다!
    let timeStr = "";
    let timestamp = new Date().getTime();
    const timeInputEl = document.getElementById('v-tracker-time');
    
    if(timeInputEl && timeInputEl.value) {
        timeStr = timeInputEl.value; // "14:30" 형태
        const [hours, minutes] = timeStr.split(':');
        const d = new Date();
        d.setHours(hours); d.setMinutes(minutes); d.setSeconds(0);
        timestamp = d.getTime(); // 수정한 시간의 timestamp를 저장!
    } else {
        // 수면 타이머처럼 시간 수정창이 없는 경우 현재 시간
        const now = new Date();
        timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    }

    let record = { id: 'trk_'+new Date().getTime(), time: timeStr, timestamp: timestamp, type: window.trackerState.type };

    if (window.trackerState.type === 'feed') {
        if(!window.trackerState.subType) return alert('🍼 분유, 모유, 유축 중 하나를 선택해주세요!');
        const amt = document.getElementById('v-feed-amount').value;
        if(!amt) return alert('🍼 먹은 양(ml)을 입력해주세요!');
        record.subType = window.trackerState.subType;
        record.amount = parseInt(amt);
    } 
    else if (window.trackerState.type === 'diaper') {
        if(!window.trackerState.subType) return alert('💩 소변인지 대변인지 선택해주세요!');
        record.subType = window.trackerState.subType;
        record.status = (window.trackerState.subType === '소변') ? '' : (window.trackerState.status || '');
    }

    let records = JSON.parse(localStorage.getItem('tosil_tracker_records')) || [];
    records.push(record);
    
    // ✨ 핵심: 과거 시간을 입력했을 수도 있으니, 시간(timestamp) 순서대로 타임라인을 예쁘게 재정렬!
    records.sort((a, b) => b.timestamp - a.timestamp);
    
    if(records.length > 100) records.pop();
    localStorage.setItem('tosil_tracker_records', JSON.stringify(records));

    window.closeTrackerSheet();
    window.updateTrackerDashboard(); 
};

// 🗑 단일 기록 삭제
window.deleteTrackerRecord = function(id) {
    if(!confirm("이 기록을 삭제하시겠습니까?")) return;
    let records = JSON.parse(localStorage.getItem('tosil_tracker_records')) || [];
    records = records.filter(r => r.id !== id);
    localStorage.setItem('tosil_tracker_records', JSON.stringify(records));
    window.updateTrackerDashboard();
};

// 💣 전체 초기화
window.resetTrackerRecords = function() {
    if(!confirm("모든 트래커 기록을 싹 지우시겠습니까?\n(진행 중인 수면 타이머도 리셋됩니다)")) return;
    localStorage.removeItem('tosil_tracker_records');
    localStorage.removeItem('tosil_sleep_start');
    window.updateTrackerDashboard();
};

window.isHistoryView = false;
window.toggleTrackerHistory = function() {
    window.isHistoryView = !window.isHistoryView;
    window.updateTrackerDashboard();
};

// ⚙️ 설정 열고 닫고 저장하기 기능
window.openTrackerSettings = function() {
    const feedMins = localStorage.getItem('tosil_feed_interval') || 180;
    const diaperMins = localStorage.getItem('tosil_diaper_interval') || 180;
    document.getElementById('set-feed-interval').value = Math.floor(feedMins / 60);
    document.getElementById('set-diaper-interval').value = Math.floor(diaperMins / 60);
    document.getElementById('tracker-settings-modal').style.display = 'flex';
};
window.closeTrackerSettingsForce = function() { document.getElementById('tracker-settings-modal').style.display = 'none'; };
window.closeTrackerSettings = function(e) { if(e.target.id === 'tracker-settings-modal') window.closeTrackerSettingsForce(); };

window.saveTrackerSettings = function() {
    const fHour = parseFloat(document.getElementById('set-feed-interval').value) || 3;
    const dHour = parseFloat(document.getElementById('set-diaper-interval').value) || 3;
    localStorage.setItem('tosil_feed_interval', fHour * 60);
    localStorage.setItem('tosil_diaper_interval', dHour * 60);
    window.closeTrackerSettingsForce();
    window.updateTrackerDashboard();
    alert("✅ 우리 아기 맞춤형 텀이 저장되었습니다!");
};

// 📊 대시보드 메인 렌더링 함수
window.updateTrackerDashboard = function() {
    const container = document.getElementById('tracker-stats-container');
    if(!container) return;

    let records = JSON.parse(localStorage.getItem('tosil_tracker_records')) || [];
    const now = new Date().getTime();
    
    // 유저가 설정한 맞춤형 알림 텀 가져오기 (기본값: 180분)
    const feedInterval = parseInt(localStorage.getItem('tosil_feed_interval')) || 180;
    const diaperInterval = parseInt(localStorage.getItem('tosil_diaper_interval')) || 180;
    
    const getDiffText = (ts) => {
        if(!ts) return '';
        const mins = Math.floor((now - ts) / 60000);
        return mins >= 60 ? `+ ${Math.floor(mins/60)}시간 ${mins%60}분` : `+ ${mins}분`;
    };

    // ----------------------------------------------------
    // 1️⃣ [통계 보기 모드]: 날짜별 그룹핑 + 삭제버튼 + 전체초기화
    // ----------------------------------------------------
    if (window.isHistoryView) {
        if(records.length === 0) {
            container.innerHTML = `<div style="padding:20px 0; text-align:center; font-size:13px; color:var(--text-s);">기록된 데이터가 없습니다.</div><button class="btn-main" onclick="window.toggleTrackerHistory()" style="width:100%; margin-top:10px; padding:12px; font-size:13.5px; border-radius:12px;">닫기</button>`;
        } else {
            let grouped = {};
            records.forEach(r => {
                const d = new Date(r.timestamp);
                const dateKey = `${d.getMonth()+1}월 ${d.getDate()}일`;
                if(!grouped[dateKey]) grouped[dateKey] = [];
                grouped[dateKey].push(r);
            });

            let historyHtml = '<div style="max-height:300px; overflow-y:auto; padding-right:4px;">';
            for(let date in grouped) {
                historyHtml += `<div style="font-size:12.5px; font-weight:900; color:#8B95A1; margin:16px 0 8px 0; border-bottom:1px solid #F2F5F8; padding-bottom:6px;">📅 ${date}</div>`;
                grouped[date].forEach(r => {
                    let icon = r.type==='feed' ? '🍼' : (r.type==='sleep' ? '💤' : '💩');
                    let txt = '';
                    if(r.type === 'feed') txt = `${r.subType} ${r.amount}ml`;
                    else if(r.type === 'sleep') txt = `${r.amount}분 잠`;
                    else if(r.type === 'diaper') txt = r.status ? `${r.subType} / ${r.status}` : `${r.subType}`;
                    
                    historyHtml += `
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; border:1px solid #E5E8EB; border-radius:12px; margin-bottom:8px; background:#FFF; box-shadow:0 2px 4px rgba(0,0,0,0.02);">
                            <div style="display:flex; gap:10px; align-items:center;">
                                <span style="font-size:18px;">${icon}</span>
                                <div>
                                    <div style="font-weight:900; color:var(--text-m); font-size:13.5px; margin-bottom:2px;">${txt}</div>
                                    <div style="color:#8B95A1; font-weight:700; font-size:11.5px;">${r.time}</div>
                                </div>
                            </div>
                            <button onclick="window.deleteTrackerRecord('${r.id}')" style="background:none; border:none; font-size:14px; color:#D1D6DB; cursor:pointer;">❌</button>
                        </div>
                    `;
                });
            }
            historyHtml += '</div>';
            historyHtml += `<div style="display:flex; gap:8px; margin-top:16px;">
                <button class="btn-main" onclick="window.resetTrackerRecords()" style="flex:1; background:#FFF0F1 !important; color:#F04452 !important; border:1px solid #FFE3E3 !important; box-shadow:none !important; font-size:13px; padding:12px; border-radius:12px; margin:0;">🗑️ 전체 삭제</button>
                <button class="btn-main" onclick="window.toggleTrackerHistory()" style="flex:1; margin:0; font-size:13px; padding:12px; border-radius:12px; box-shadow:none !important;"> 닫기 〉</button>
            </div>`;
            container.innerHTML = historyHtml;
        }
        return; 
    }

    // ----------------------------------------------------
    // 2️⃣ [대시보드 모드]: 맞춤형 스마트 알람 + 요약 카드
    // ----------------------------------------------------
    const latestFeed = records.find(r => r.type === 'feed');
    const latestDiaper = records.find(r => r.type === 'diaper');
    let htmlStr = '';

    // 🚨 맞춤형 수유 알람
    if(latestFeed) {
        const diffMins = Math.floor((now - latestFeed.timestamp) / 60000);
        if(diffMins >= feedInterval) {
            htmlStr += `<div style="background:#FFF0F1; border:1px solid #FFE3E3; padding:12px 14px; border-radius:14px; margin-bottom:12px; display:flex; align-items:center; justify-content:space-between; animation:pulseSOS 2s infinite;"><div style="display:flex; align-items:center; gap:8px;"><span style="font-size:18px;">🍼</span><div><div style="font-size:11px; color:#D32F2F; font-weight:800; margin-bottom:2px;">수유 알람</div><div style="font-size:13.5px; font-weight:900; color:#191F28;">맘마 먹은지 ${Math.floor(diffMins/60)}시간 ${diffMins%60}분 경과!</div></div></div><button onclick="window.openTrackerSheet('feed')" style="background:#F04452; color:#FFF; border:none; border-radius:10px; font-size:12px; font-weight:800; padding:8px 12px; cursor:pointer; flex-shrink:0;">기록하기</button></div>`;
        }
    }
    
    // 🚨 맞춤형 기저귀 알람
    if(latestDiaper) {
        const diffMins = Math.floor((now - latestDiaper.timestamp) / 60000);
        if(diffMins >= diaperInterval) {
            htmlStr += `<div style="background:#F8F9FA; border:1px solid #E5E8EB; padding:12px 14px; border-radius:14px; margin-bottom:12px; display:flex; align-items:center; justify-content:space-between;"><div style="display:flex; align-items:center; gap:8px;"><span style="font-size:18px;">💩</span><div><div style="font-size:11px; color:#4E5968; font-weight:800; margin-bottom:2px;">기저귀 알림</div><div style="font-size:13.5px; font-weight:900; color:#191F28;">확인한지 ${Math.floor(diffMins/60)}시간 ${diffMins%60}분 경과!</div></div></div><button onclick="window.openTrackerSheet('diaper')" style="background:#4E5968; color:#FFF; border:none; border-radius:10px; font-size:12px; font-weight:800; padding:8px 12px; cursor:pointer; flex-shrink:0;">기록하기</button></div>`;
        }
    }

    if(records.length === 0 && !localStorage.getItem('tosil_sleep_start')) {
        container.innerHTML = `<div style="padding:10px 0; text-align:center; font-size:13px; color:var(--text-s); font-weight:700;">아직 기록된 트래커 데이터가 없습니다.</div>`;
        return;
    }

    htmlStr += `<div style="display:flex; gap:12px;">`;
    
    if (latestFeed) {
        htmlStr += `<div style="flex:1; background:#F0F7FF; padding:12px; border-radius:14px; text-align:center;"><div style="font-size:11px; color:#3182F6; font-weight:800;">마지막 수유</div><div style="font-size:13px; font-weight:900; color:#191F28; margin:4px 0;">${latestFeed.subType} ${latestFeed.amount}ml</div><div style="font-size:11px; color:#3182F6; font-weight:700;">${getDiffText(latestFeed.timestamp)}</div></div>`;
    } else {
        htmlStr += `<div style="flex:1; background:#F8F9FA; padding:12px; border-radius:14px; text-align:center; color:#A0AEC0; font-size:11px; font-weight:700;">수유기록 없음</div>`;
    }

    if (latestDiaper) {
        const diaperDisplay = latestDiaper.status ? `${latestDiaper.subType} / ${latestDiaper.status}` : latestDiaper.subType;
        htmlStr += `<div style="flex:1; background:#FFF0F1; padding:12px; border-radius:14px; text-align:center;"><div style="font-size:11px; color:#F04452; font-weight:800;">마지막 배변</div><div style="font-size:13px; font-weight:900; color:#191F28; margin:4px 0;">${diaperDisplay}</div><div style="font-size:11px; color:#F04452; font-weight:700;">${getDiffText(latestDiaper.timestamp)}</div></div>`;
    } else {
        htmlStr += `<div style="flex:1; background:#F8F9FA; padding:12px; border-radius:14px; text-align:center; color:#A0AEC0; font-size:11px; font-weight:700;">배변기록 없음</div>`;
    }
    
    htmlStr += `</div>`;

    const sleepStart = localStorage.getItem('tosil_sleep_start');
    if (sleepStart) {
        const diffMins = Math.floor((now - parseInt(sleepStart)) / 60000);
        htmlStr += `<div style="margin-top:12px; display:flex; align-items:center; justify-content:space-between; background:#F3E8FF; padding:12px 16px; border-radius:14px;"><div style="display:flex; align-items:center; gap:8px;"><span style="font-size:20px;">💤</span><div><div style="font-size:11px; color:#A855F7; font-weight:800;">우리아기 꿀잠 중</div><div style="font-size:13px; font-weight:900; color:#191F28;">현재 ${diffMins}분 째</div></div></div><button onclick="window.openTrackerSheet('sleep')" style="background:#A855F7; color:#FFF; border:none; padding:6px 12px; border-radius:8px; font-weight:800; font-size:12px; cursor:pointer;">종료하기</button></div>`;
    }

    container.innerHTML = htmlStr;
};

document.addEventListener("DOMContentLoaded", () => {
    if(typeof window.updateTrackerDashboard === 'function') window.updateTrackerDashboard();
});
setInterval(() => {
    if (typeof window.updateTrackerDashboard === 'function') window.updateTrackerDashboard();
}, 60000);