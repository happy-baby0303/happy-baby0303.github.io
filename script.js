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
let selectedPillType = ''; 
let feverChartObj = null; 
let feverTimerInterval = null; 
let currentDonutChart = null;
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
    
    subRow.style.display = 'flex';
    subRow.style.overflowX = 'auto'; 
    subRow.style.gap = '8px';
    subRow.style.paddingBottom = '8px';

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
    const keyword = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const container = document.getElementById('hotplace-container');
    if(!container) return; 
    container.innerHTML = ''; // 화면 깨짐 방지용 초기화
    
    const todayStr = new Date().toISOString().split('T')[0];
    const todayNum = parseInt(todayStr.replace(/-/g,''));

    if (currentSubTab === 'event') {
        // [1. 이번주 주말 행사 로직 - 기존 코드 완벽하게 100% 유지]
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
        // [2. 검증 육아지도 로직 - 카드형 딥링크 디자인으로 진화!]
        const filteredPlaces = hotplacesData.filter(p => {
            if (p.expiryDate && todayStr > p.expiryDate) return false;
            return !p.isEvent && (currentRegion === 'all' || p.region === currentRegion) && `${p.title} ${p.desc} ${p.locText}`.toLowerCase().includes(keyword);
        });

        if(filteredPlaces.length === 0) { 
            container.innerHTML = `<p style="text-align:center; padding:35px; color:var(--text-sub); font-size:14px; font-weight:700;">🔍 아직 등록된 검증 육아지도가 없습니다.</p>`; 
            return; 
        }

        let htmlString = ''; // 화면 깨짐 방지를 위해 카드를 모아두는 바구니

        filteredPlaces.forEach((p) => {
            // 태그 배열 데이터 안전하게 호환
            let tagsHTML = '';
            if (p.tags && Array.isArray(p.tags)) {
                tagsHTML = p.tags.map(tag => `<span style="background:#F2F5F8; color:#4E5968; padding:4px 8px; border-radius:6px; font-size:11px; font-weight:800; border: 1px solid #E5E8EB; margin-right:4px; display:inline-block; margin-bottom:4px;">#${tag.t || tag}</span>`).join('');
            }
            
            // 카카오맵 딥링크 URL 생성 (검색어 기반)
            let mapUrl = `https://map.kakao.com/link/search/${encodeURIComponent(p.query || p.title)}`;

            htmlString += `
                <div class="box-main" style="border-radius: 20px; padding: 20px; margin-bottom: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); border: 1px solid var(--border); text-align: left; background: var(--bg-card);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="background:#EBF4FF; color:#3182F6; padding:4px 8px; border-radius:6px; font-size:11px; font-weight:900;">${p.locText || '지역'}</span>
                            <div style="font-size: 17px; font-weight: 900; color: var(--text-m);">${p.title} ${p.emoji || '📍'}</div>
                        </div>
                    </div>
                    <div style="font-size: 13.5px; color: var(--text-s); font-weight: 600; margin-bottom: 12px; line-height: 1.5; word-break: keep-all;">
                        ${p.desc || ''}
                    </div>
                    <div style="margin-bottom: 12px;">${tagsHTML}</div>
                    <div class="place-review" style="font-size:12.5px; color:var(--text-s); background:var(--bg-sub); padding:12px; border-radius:10px; margin-bottom:16px;">
                        <strong>💬 토실이 검증:</strong> "${p.review || '유모차와 함께하기 좋은 곳이에요!'}"
                    </div>
                    <a href="${mapUrl}" target="_blank" style="display: block; width: 100%; text-align: center; padding: 14px; background: #FEE500; color: #191F28; border-radius: 12px; font-weight: 900; font-size: 14.5px; text-decoration: none; box-shadow: 0 2px 8px rgba(254, 229, 0, 0.2);">
                        📍 카카오맵으로 위치/길찾기 〉
                    </a>
                </div>
            `;
        });
        
        // 조립된 카드들을 화면에 한 번에 그려주기 (안전!)
        container.innerHTML = htmlString;
    }
}

// ==========================================
// 🎪 행사 모달창 프리미엄 UI 패치 (열기 + 닫기 완벽 세트)
// ==========================================
function openFestivalModal(title, dateText, addr, tel, review, query, image) {
    const body = document.getElementById('modal-dynamic-body');
    if(!body) return;
    const naverUrl = 'https://m.map.naver.com/search2/search.naver?query=' + encodeURIComponent(query);
    const tmapUrl = 'https://search.tmap.co.kr/search.html?keyword=' + encodeURIComponent(query);
    const kakaoUrl = 'https://map.kakao.com/?q=' + encodeURIComponent(query);
    
    // 전화번호 버튼
    const telBtn = tel && tel !== '정보없음' 
        ? `<button onclick="window.location.href='tel:${tel}'" style="flex:1; padding:16px; background:#F2F5F8; color:#4E5968; border-radius:14px; font-weight:900; font-size:15px; border:none; cursor:pointer;">📞 전화 문의</button>` 
        : `<button disabled style="flex:1; padding:16px; background:#F2F5F8; color:#A0AEC0; border-radius:14px; font-weight:900; font-size:15px; border:none; opacity:0.6;">📞 번호 없음</button>`;
        
    // 메인 사진
    const modalImgHtml = (image && !image.startsWith('⚙️')) 
        ? `<div style="width:100%; height:200px; border-radius:18px; overflow:hidden; margin-bottom:20px; box-shadow:0 4px 16px rgba(0,0,0,0.06); position:relative;">
             <img src="${image}" style="width:100%; height:100%; object-fit:cover;" onerror="this.style.display='none'">
             <div style="position:absolute; bottom:10px; right:10px; background:rgba(0,0,0,0.6); color:#FFF; font-size:11px; font-weight:800; padding:4px 8px; border-radius:8px; backdrop-filter:blur(4px);">행사 전경</div>
           </div>` 
        : `<div style="width:100%; height:140px; border-radius:18px; background:linear-gradient(135deg, #EBF4FF, #EAEFF7); margin-bottom:20px; display:flex; align-items:center; justify-content:center; font-size:40px; box-shadow:0 4px 16px rgba(0,0,0,0.06);">🎪</div>`;

    // 토스 스타일 전체 UI 렌더링
    body.innerHTML = `
        <div style="padding: 10px 4px;">
            <!-- 🏷️ 제목 영역 -->
            <div style="display:flex; align-items:flex-start; gap:10px; margin-bottom:16px;">
                <span style="font-size:26px; background:#F2F5F8; padding:8px; border-radius:14px; box-shadow:inset 0 1px 3px rgba(0,0,0,0.05);">🌲</span>
                <div style="font-size:20px; font-weight:900; color:#191F28; letter-spacing:-0.5px; line-height:1.3; word-break:keep-all; margin-top:2px;">${title}</div>
            </div>

            <!-- 📸 메인 이미지 -->
            ${modalImgHtml}

            <!-- 🗓️ 기본 정보 박스 -->
            <div style="background:#F8F9FA; padding:18px; border-radius:16px; margin-bottom:20px; border:1px solid #E5E8EB;">
                <div style="display:flex; gap:12px; margin-bottom:14px; align-items:flex-start;">
                    <span style="font-size:18px; margin-top:2px;">🗓️</span>
                    <div>
                        <div style="font-size:11.5px; font-weight:800; color:#8B95A1; margin-bottom:4px;">행사 기간</div>
                        <div style="font-size:14.5px; font-weight:800; color:#333D4B;">${dateText}</div>
                    </div>
                </div>
                <div style="display:flex; gap:12px; align-items:flex-start;">
                    <span style="font-size:18px; margin-top:2px;">📍</span>
                    <div>
                        <div style="font-size:11.5px; font-weight:800; color:#8B95A1; margin-bottom:4px;">행사 장소</div>
                        <div style="font-size:14.5px; font-weight:800; color:#333D4B; line-height:1.4; word-break:keep-all;">${addr}</div>
                    </div>
                </div>
            </div>

            <!-- 💡 팩트 체크 박스 (보라색 포인트로 시선 집중) -->
            <div style="background:linear-gradient(135deg, #F4F0FF 0%, #F9F7FF 100%); padding:18px; border-radius:16px; margin-bottom:24px; border:1px solid #EBE5FF; display:flex; gap:12px; align-items:flex-start;">
                <span style="font-size:20px; margin-top:2px;">💡</span>
                <div>
                    <div style="font-size:12.5px; font-weight:900; color:#6B4EFF; margin-bottom:6px;">토실이 팩트 체크</div>
                    <div style="font-size:14px; font-weight:800; color:#4E5968; line-height:1.5; word-break:keep-all;">"${review || '맞춤형 주말 안전 인프라입니다.'}"</div>
                </div>
            </div>

            <!-- 🚗 길찾기 영역 -->
            <div style="font-size:13.5px; font-weight:900; color:#191F28; margin-bottom:12px; display:flex; align-items:center; gap:6px;">
                <span>🚗</span> 아기랑 모바일 길찾기
            </div>
            <div style="display:flex; gap:10px; margin-bottom:24px;">
                <a href="${naverUrl}" target="_blank" style="flex:1; padding:12px 0; background:#FFF; border:1px solid #E5E8EB; border-radius:14px; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:8px; box-shadow:0 2px 6px rgba(0,0,0,0.02); text-decoration:none;">
                    <div style="width:36px; height:36px; background:#03C75A; border-radius:10px; display:flex; align-items:center; justify-content:center; color:#FFF; font-weight:900; font-size:18px;">N</div>
                    <span style="font-size:11.5px; font-weight:800; color:#4E5968;">네이버 지도</span>
                </a>
                <a href="${tmapUrl}" target="_blank" style="flex:1; padding:12px 0; background:#FFF; border:1px solid #E5E8EB; border-radius:14px; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:8px; box-shadow:0 2px 6px rgba(0,0,0,0.02); text-decoration:none;">
                    <div style="width:36px; height:36px; background:#111111; border-radius:10px; display:flex; align-items:center; justify-content:center; color:#FFF; font-weight:900; font-size:18px;">T</div>
                    <span style="font-size:11.5px; font-weight:800; color:#4E5968;">티맵</span>
                </a>
                <a href="${kakaoUrl}" target="_blank" style="flex:1; padding:12px 0; background:#FFF; border:1px solid #E5E8EB; border-radius:14px; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:8px; box-shadow:0 2px 6px rgba(0,0,0,0.02); text-decoration:none;">
                    <div style="width:36px; height:36px; background:#FEE500; border-radius:10px; display:flex; align-items:center; justify-content:center; color:#191F28; font-weight:900; font-size:18px;">K</div>
                    <span style="font-size:11.5px; font-weight:800; color:#4E5968;">카카오내비</span>
                </a>
            </div>

            <!-- ✅ 하단 액션 버튼 -->
            <div style="display:flex; gap:10px;">
                ${telBtn}
                <button onclick="closeFestivalModalForce()" style="flex:2; padding:16px; background:#3182F6; color:#FFF; border-radius:14px; font-weight:900; font-size:15px; border:none; box-shadow:0 4px 12px rgba(49,130,246,0.3); cursor:pointer;">확인 완료</button>
            </div>
        </div>
    `;
    const modalWrap = document.getElementById('premium-modal');
    if(modalWrap) modalWrap.style.display = 'flex';
}

// 👇 절대 지우면 안 되는 모달 닫기 함수들! (안전하게 같이 둡니다)
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
            labels: ['기저귀/위생용품', '분유/이유식/식비', '의류/장난감/기타'], 
            datasets: [{ data: [d, f, e], backgroundColor: ['#3182F6', '#10B981', '#FF823A'], borderWidth: 0, hoverOffset: 4 }] 
        }, 
        options: { 
            responsive: true, maintainAspectRatio: false, cutout: '75%', 
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(c) { return ' ' + c.label + ': ' + formatter.format(c.raw) + '원'; } } } }, 
            animation: { animateScale: true, animateRotate: true } 
        } 
    });
}

function analyzeMoney() {
    const budgetInput = document.getElementById('v-budget');
    let userBudget = 500000; 
    if (budgetInput && budgetInput.value) { userBudget = parseInt(budgetInput.value.replace(/,/g, '')) || 500000; }
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
    let insightHtml = `<strong style="font-size:14px; display:block; margin-bottom:8px;">📊 핵심 소비 인사이트</strong>`;
    
    if (detailsTotal > 0) {
        const maxVal = Math.max(d, f, e);
        if (maxVal === d && d > 0) insightHtml += `🧻 <strong>기저귀/위생용품 지출 1위!</strong><br>기저귀는 핫딜 뜰 때 대량 쟁여두는 게 최고입니다!`;
        else if (maxVal === f && f > 0) insightHtml += `🍼 <strong>식비 지출 비중 1위!</strong><br>아이의 성장 속도를 고려하면 정상입니다! 잘 먹는 건 축복입니다 💪`;
        else if (maxVal === e && e > 0) insightHtml += `🧸 <strong>장난감/기타 지출 비중 1위!</strong><br>'당근마켓'을 적절히 섞으면 방어율이 엄청나게 올라갑니다 🥕`;
    } else {
        insightHtml += `💡 <strong>실시간 투트랙 머니로그 사용 중!</strong><br>위의 세부 항목 칸을 채워주시면 월간 정밀 도넛 차트를 확인하실 수 있습니다.`;
    }

    if(percent > 100) insightHtml += `<br><br><span style="color:var(--danger)">🚨 <strong>주의:</strong></span> 이번 달 한도 예산을 초과했습니다!`;
    else if(percent < 80) insightHtml += `<br><br><span style="color:var(--success)">🌿 <strong>우수:</strong></span> 알뜰하게 육아 중입니다! 아주 좋습니다.`;
    else insightHtml += `<br><br>👍 <strong>안정:</strong> 이상적인 육아 소비 패턴입니다.`;
    
    const moneyInsightEl = document.getElementById('money-insight-detail');
    if(moneyInsightEl) moneyInsightEl.innerHTML = insightHtml;
    
    const avgPercentEl = document.getElementById('money-avg-percent');
    if(avgPercentEl) avgPercentEl.innerText = `설정한 한도 예산 대비 ${percent}% 지출`;
    
    // 차트 화면 켜기
    const resBox = document.getElementById('money-result'); 
    if(resBox) resBox.style.display = 'block';
    
    // 차트 렌더링 딜레이
    setTimeout(() => drawDonutChart(d, f, e), 100);
    
    ledger.total = finalTotal;
    saveLedgerToFirebase(ledger);
    updateHomeDashboard(); 
}
window.analyzeMoney = analyzeMoney;
window.toggleHistory = function() {
    const area = document.getElementById('history-list-area');
    if(!area) return;
    
    if(area.style.display === 'block') { 
        area.style.display = 'none'; 
    } else {
        const history = JSON.parse(localStorage.getItem('TosilBabyApp')) || {};
        const items = document.getElementById('history-items'); 
        if(!items) return; 
        
        items.innerHTML = "";
        const sortedKeys = Object.keys(history).sort().reverse();
        
        if(sortedKeys.length === 0) { 
            items.innerHTML = `
                <div style="text-align:center; padding:30px 10px;">
                    <div style="font-size:32px; margin-bottom:10px;">💨</div>
                    <div style="font-size:14.5px; font-weight:800; color:var(--text-m); margin-bottom:6px;">기록이 텅~ 비어있네요!</div>
                    <div style="font-size:12.5px; color:var(--text-s);">아직 지난달에 기록하신 가계부 내역이 없어요.</div>
                </div>`; 
        } else { 
            let html = '<div style="margin-top: 12px;">';
            sortedKeys.forEach(k => { 
                // k는 "2026-7" 형태이므로 연/월로 쪼갭니다.
                const [year, month] = k.split('-');
                html += `
                <div class="history-item" style="display:flex; justify-content:space-between; align-items:center; padding:16px; background:#F8F9FA; border-radius:12px; margin-bottom:8px; border:1px solid #E5E8EB;">
                    <span style="font-weight:900; color:#4E5968; font-size:14px;">📅 ${year}년 ${month}월</span>
                    <span style="font-weight:900; color:#3182F6; font-size:16px;">${history[k].toLocaleString()}원</span>
                </div>`; 
            }); 
            html += '</div>';
            items.innerHTML = html;
        }
        area.style.display = 'block';
    }
};

// 가계부 입력 - ✨ 토스트 팝업 적용 완료 ✨
async function addDailyExpense(isSaving) {
    const input = document.getElementById('v-input-amount');
    const amount = parseInt(input.value.replace(/,/g, '')) || 0;
    
    if(amount <= 0) return showToast("⚠️ 금액을 정확히 입력해주세요!"); // 👈 alert 대신 showToast!

    let ledger = JSON.parse(localStorage.getItem('tosil_ledger_data')) || { total: 0, savedTotal: 0, goal: "", goalAmount: 100000, history: [] };
    
    const now = new Date();
    const timeStr = `${now.getMonth()+1}/${now.getDate()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    if(!ledger.history) ledger.history = [];

    if(isSaving) {
        ledger.savedTotal += amount;
        ledger.history.unshift({ time: timeStr, amount: amount, type: 'saving' });
        showToast(`🎉 대박! ${amount.toLocaleString()}원 절약 및 저금 완료!`); // 👈 alert 대신 showToast!
    } else {
        ledger.total += amount;
        ledger.history.unshift({ time: timeStr, amount: amount, type: 'expense' });
        showToast(`✅ 지출 ${amount.toLocaleString()}원 기록 완료!`); // 👈 alert 대신 showToast!
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

    // 이번 달 예산 불러오기 (v-budget)
    const budgetInput = document.getElementById('v-budget');
    const savedBudget = localStorage.getItem('tosil_budget');
    if (budgetInput && document.activeElement !== budgetInput && savedBudget) {
        budgetInput.value = Number(savedBudget).toLocaleString();
    }

    const targetAmount = ledger.goalAmount || 100000;
    const percent = Math.min(Math.round((ledger.savedTotal / targetAmount) * 100), 100);
    
    const percentEl = document.getElementById('v-goal-percent');
    if(percentEl) percentEl.innerText = percent + "%";

    const listContainer = document.getElementById('ledger-history-list');
    if(listContainer) {
        let html = '';
        if (!ledger.history || ledger.history.length === 0) {
            html = `<div style="text-align:center; padding:20px; font-size:13px; color:#8B95A1;">아직 입력된 머니로그 기록이 없습니다.</div>`;
        } else {
            ledger.history.forEach(h => {
                const isSave = h.type === 'saving';
                const badge = isSave ? `<span style="color:#3182F6; font-weight:800; font-size:12px; background:#E8F3FF; padding:4px 8px; border-radius:6px;">💰 저금</span>` : `<span style="color:#4E5968; font-weight:800; font-size:12px; background:#F2F4F6; padding:4px 8px; border-radius:6px;">💸 지출</span>`;
                const amountColor = isSave ? '#3182F6' : 'var(--text-m)';
                html += `<div style="display:flex; justify-content:space-between; align-items:center; padding:14px; background:#FFF; border-radius:12px; font-size:13.5px; border:1px solid #E5E8EB; margin-bottom:8px;">
                            <div style="display:flex; align-items:center; gap:8px;">${badge} <span style="color:var(--text-s); font-size:12.5px; font-weight:700;">${h.time}</span></div>
                            <span style="font-weight:900; color:${amountColor}; font-size:15px;">${h.amount.toLocaleString()}원</span>
                         </div>`;
            });
        }
        listContainer.innerHTML = html;
    }
}

async function resetMoneyAll() {
    // 1단계: 이번 달 데이터 지우기 확인
    if(!confirm("이번 달 기록된 '지출' 및 '저금' 데이터를 초기화하시겠습니까?\n(설정하신 예산과 목표는 유지됩니다)")) return;
    
    let ledger = JSON.parse(localStorage.getItem('tosil_ledger_data')) || {};
    ledger.total = 0;
    ledger.savedTotal = 0;
    ledger.history = [];
    
    await saveLedgerToFirebase(ledger);
    localStorage.removeItem('tosil_money_total');
    
    // 👇 [버그 수정] 월별 통계에서 '이번 달' 기록 확실하게 지우기
    const date = new Date();
    const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
    let localHistory = JSON.parse(localStorage.getItem('TosilBabyApp')) || {};
    if (localHistory[monthKey]) {
        delete localHistory[monthKey]; 
        localStorage.setItem('TosilBabyApp', JSON.stringify(localHistory));
    }

    // 👇 [추가 기능] 과거 데이터까지 싹 다 날릴지 한 번 더 물어보기! (테스트용)
    if(confirm("입력된 '과거 월별 통계(지난달 등)' 기록까지 전부 다 삭제할까요?")) {
        localStorage.removeItem('TosilBabyApp');
    }
    
    // 화면 입력칸 초기화
    document.getElementById('v-diaper').value = ''; 
    document.getElementById('v-food').value = ''; 
    document.getElementById('v-etc').value = '';
    
    // 차트 화면 및 통계 화면 닫기
    const resBox = document.getElementById('money-result'); 
    if(resBox) resBox.style.display = 'none'; 
    const area = document.getElementById('history-list-area');
    if(area) area.style.display = 'none';
    
    alert("데이터가 깔끔하게 리셋되었습니다! 다시 든든하게 모아봐요! 🌿");
    updateHomeDashboard();
}
window.addDailyExpense = addDailyExpense;
window.saveGoal = saveGoal;
window.resetMoneyAll = resetMoneyAll;

// ==========================================
// 🛍️ 스마트 핫딜 판독기 (나의 역대 최저가 갱신 시스템)
// ==========================================

const ITEM_UNITS = { diaper: '장', wipe: '팩', milk: '통' };

// 카테고리 변경 시 내가 저장한 '최저가' 불러오기 & 수량 단위 텍스트 변경
function loadPastPrice() {
    const cat = document.getElementById('hd-category').value;
    const pastPrice = localStorage.getItem('tosil_hd_best_' + cat);
    const inputEl = document.getElementById('hd-standard-price');
    const badgeEl = document.getElementById('hd-past-badge');
    
    // ✨ [버그 수정 완료] MARKET_STANDARD 대신 ITEM_UNITS 로 정상 호출!
    const unitLabelEl = document.getElementById('hd-unit-label');
    if (unitLabelEl && ITEM_UNITS[cat]) {
        unitLabelEl.innerText = ITEM_UNITS[cat];
    }

    if (pastPrice) {
        inputEl.value = pastPrice;
        badgeEl.style.display = 'inline-block';
    } else {
        inputEl.value = '';
        badgeEl.style.display = 'none';
    }
}
window.loadPastPrice = loadPastPrice; // HTML에서 안전하게 호출되도록 전역 등록

// 앱 켤 때 핫딜 초기값 로딩
document.addEventListener("DOMContentLoaded", () => {
    if(typeof loadPastPrice === 'function') loadPastPrice();
});

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
    const unitName = ITEM_UNITS[cat];

    if (pastPrice > 0) {
        const diffPast = pastPrice - unitPrice;
        
        if (diffPast > 0) {
            verdictEl.innerHTML = `🎉 역대 최저가 갱신! 1${unitName}당 <span style="color:#FFF; font-weight:900;">${diffPast.toLocaleString()}원 더 싸요!</span>`;
            verdictEl.style.backgroundColor = "#00B37A"; 
            commentEl.innerHTML = `기존 내 기록 대비 총 <strong>${(diffPast * count).toLocaleString()}원을 아꼈습니다!</strong> 역대급 핫딜 방어 성공! 👏`;
            // 더 싸게 샀으므로 최저가 기록 갱신!
            localStorage.setItem('tosil_hd_best_' + cat, unitPrice);
        } else if (diffPast < 0) {
            verdictEl.innerHTML = `⚠️ 내 최저가보다 1${unitName}당 <span style="color:#FFF; font-weight:900;">${Math.abs(diffPast).toLocaleString()}원 비싸요.</span>`;
            verdictEl.style.backgroundColor = "#F04452"; 
            commentEl.innerHTML = `이전에 제일 싸게 샀을 때보다 <strong>총 ${(Math.abs(diffPast) * count).toLocaleString()}원 손해</strong>입니다. 수량이 급한 게 아니라면 조금 더 기다려보세요! 🤔`;
            // 비싸게 샀으므로 최저가 기록은 갱신하지 않음
        } else {
            verdictEl.innerHTML = `⚖️ 역대 최저가 방어 성공!`;
            verdictEl.style.backgroundColor = "#3182F6"; 
            commentEl.innerHTML = `이전에 가장 싸게 샀던 그 가격 그대로네요! 이번에도 스마트하게 잘 사셨습니다. 👍`;
        }
    } else {
        // 과거 기록이 아예 없는 첫 계산일 때
        verdictEl.innerHTML = `✅ 첫 핫딜 기준가 등록 완료!`;
        verdictEl.style.backgroundColor = "#3182F6"; 
        commentEl.innerHTML = `복잡한 쿠폰을 다 합친 최종 체감가는 1${unitName}당 <strong>${unitPrice.toLocaleString()}원</strong>입니다. 이 가격을 내 '역대 최저가'로 기록해 둘게요! 📝`;
        // 첫 계산값을 기준 최저가로 등록
        localStorage.setItem('tosil_hd_best_' + cat, unitPrice);
    }
    
    verdictEl.style.color = "#FFF";
    const hdRes = document.getElementById('hd-result'); if(hdRes) hdRes.style.display = 'block';
    
    document.getElementById('hd-action-area').innerHTML = `
        <button class="btn-main" style="margin-top:20px; background:#191F28 !important; color:#FFF !important; border:none !important; box-shadow:none !important; padding:16px; font-size:14.5px; font-weight:800; border-radius:14px; width:100%;" onclick="sendHotdealToLedger(${price}, '${cat}')">
            💰 ${price.toLocaleString()}원 가계부 지출로 연동하기 〉
        </button>
    `;
    
    // 계산 버튼 누르면 배지 띄워서 갱신/저장됐음을 알림
    document.getElementById('hd-past-badge').style.display = 'inline-block';
    loadPastPrice(); // 저장된 최저가로 input 창 최신화
}

// 핫딜을 가계부로 연동 - ✨ 토스트 팝업 적용 완료 ✨
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
    
    showToast(`✅ 핫딜 결제액 ${price.toLocaleString()}원 연동 완료!`); // 👈 엄청 길었던 alert 문구를 깔끔한 토스트로 변경!
    directGoToolbox('money');
}

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

// 해열제 기록 전체 지우기 - ✨ 퀄리티업 완료 ✨
async function clearFeverRecord() {
    showConfirm("전체 투약 기록을 지우시겠습니까?", async function() {
        
        localStorage.removeItem('tosil_fever_records'); 
        
        if (typeof db !== 'undefined' && typeof setDoc === 'function') {
            const syncCode = localStorage.getItem("family_sync_code") || "unlinked_local_diary";
            try { await setDoc(doc(db, "fever_" + syncCode, "status"), { records: [] }); } catch (e) {}
        }
        
        selectPill(''); 
        renderFeverTimeline(); 
        setTimeout(updateHomeDashboard, 100); 
        
        showToast("💊 해열제 투약 기록이 초기화되었습니다!");
        
    }, "🧹", "초기화", "#F04452");
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
// 🚨 7. 아기 발달 센서 엔진 (초압축 한줄 카피)
// ==========================================
function updateMainAISensors(months) {
    const txtStroller = document.getElementById('main-txt-stroller');
    const txtCarseat = document.getElementById('main-txt-carseat');
    const txtBottle = document.getElementById('main-txt-bottle');
    const txtFood = document.getElementById('main-txt-food');
    const txtToy = document.getElementById('main-txt-toy');
    if(!txtStroller) return;

    if (months <= 6) txtStroller.innerText = "👶 디럭스 (안전한 승차감)";
    else if (months <= 12) txtStroller.innerText = "🏃 절충형 (혼자 앉는 시기)";
    else txtStroller.innerText = "⚡ 휴대용 (가벼운 외출용)";

    if (months <= 12) txtCarseat.innerText = "🛡️ 신생아용 (뒤보기 필수)";
    else txtCarseat.innerText = "🧒 토들러용 (앞보기 전환)";

    if (months <= 3) txtBottle.innerText = "🍼 신생아 (배앓이 방지)";
    else if (months <= 5) txtBottle.innerText = "🍼 4~5개월 (젖꼭지 업)";
    else txtBottle.innerText = "🥛 6개월+ (빨대컵 연습)";

    if (months <= 6) txtFood.innerText = "🌾 초기 (쌀미음 스타트)";
    else if (months <= 9) txtFood.innerText = "🥕 중기 (입자 크기 업)";
    else txtFood.innerText = "🍽️ 완료기 (유아식 진화)";

   // 🧸 장난감 센서 (아기 발달 단계 세분화 완벽 적용!)
    if (months <= 4) txtToy.innerText = "💪 터미타임 (고개 가누기)";
    else if (months <= 6) txtToy.innerText = "🐛 배밀기 (전신 근육 발달)";
    else if (months <= 9) txtToy.innerText = "🐾 기어다니기 (활동 반경 확장)";
    else if (months <= 12) txtToy.innerText = "🏃 걸음마 (잡고 일어서기)";
    else txtToy.innerText = "🧩 소근육 놀이 (블록·조작북)";
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

// ==========================================
// 📈 영유아 종합 성장 마스터 (카우프 지수 + 성장 차트 연동)
// ==========================================
let growthChartObj = null;

function calcHealthMaster() {
    const b = document.getElementById('v-birth').value;
    const gender = document.getElementById('v-gender').value;
    const hVal = document.getElementById('v-height').value;
    const wVal = document.getElementById('v-weight-growth').value;
    const h = hVal ? parseFloat(hVal) : null;
    const w = wVal ? parseFloat(wVal) : null;

    if (wVal) localStorage.setItem('tosil_latest_weight', wVal);

    if(!b) return alert("종합 분석을 위해 아기 생년월일을 입력해 주세요!");
    if(!h && !w) return alert("정확한 진단을 위해 키 또는 몸무게를 하나라도 입력해 주세요!");
    
    const birthDate = new Date(b);
    const today = new Date();
    const diffDays = Math.ceil((today - birthDate) / (1000*60*60*24));
    if (diffDays < 0) return alert("미래의 날짜는 입력할 수 없습니다.");
    
    const week = Math.floor(diffDays / 7);
    const month = Math.floor(diffDays / 30.436875); 
    
    document.getElementById('res-dday').innerText = diffDays;
    document.getElementById('res-month').innerText = month;
    document.getElementById('res-week').innerText = week;

   // 원더윅스 로직
    // 💡 도약기는 보통 기준(절정) 주차보다 4주 전부터 시작되므로 범위를 -4로 대폭 넓힙니다.
    let curWW = wwList.find(x => week >= (x.w - 4) && week <= (x.w + 1));
    let nxtWW = wwList.find(x => x.w > week);
    
    let st = document.getElementById('ww-status');
    if(st) {
        if(curWW) { 
            st.className = 'ww-status-box box-tint-red'; // 🚀 스마트 클래스 적용!
            st.removeAttribute('style'); // 촌스러운 인라인 스타일 강제 삭제
            st.style.padding = '20px'; st.style.borderRadius = '16px'; st.style.marginBottom = '12px'; 
            st.innerHTML = `<div style="font-size:14.5px; font-weight:900; color:var(--danger); margin-bottom:6px;">🚨 현재 ${curWW.t} 폭풍우 구간!</div><strong style="color:var(--text-m);">특성:</strong> <span style="color:var(--text-s);">${curWW.d}</span>.<br><span style="color:var(--text-s); margin-top:4px; display:inline-block;">이유 없는 보챔과 수면퇴행이 올 수 있는 도약기입니다. 아기를 많이 안아주세요!</span>`; 
        } else { 
            st.className = 'ww-status-box box-tint-green'; // 🚀 스마트 클래스 적용!
            st.removeAttribute('style');
            st.style.padding = '20px'; st.style.borderRadius = '16px'; st.style.marginBottom = '12px';
            st.innerHTML = `<div style="font-size:14.5px; font-weight:900; color:var(--success); margin-bottom:6px;">☀️ 맑음! 평온기 유지 중</div><span style="font-size:13px; color:var(--text-s);">${nxtWW ? '👉 다음 도약기: <strong style="color:var(--text-m);">' + nxtWW.t + ' (' + nxtWW.w + '주차)</strong> 대기 중' : '모든 도약기를 이수 완료했습니다.'}</span>`; 
        }
    }

    let table = `<tr><th style="padding:10px; background:#F2F4F6;">주차</th><th style="padding:10px; background:#F2F4F6;">진단 단계</th><th style="padding:10px; background:#F2F4F6;">특성 지표</th></tr>`;
    wwList.forEach(x => { let active = (week >= x.w-1 && week <= x.w+1) ? 'style="background:#FFF0F1; color:#D32F2F; font-weight:800;"' : ''; table += `<tr ${active}><td style="padding:10px; border-bottom:1px solid #E5E8EB;">${x.w-1}~${x.w+1}주</td><td style="padding:10px; border-bottom:1px solid #E5E8EB;">${x.t}</td><td style="padding:10px; border-bottom:1px solid #E5E8EB; text-align:left;">${x.d}</td></tr>`; });
    document.getElementById('ww-table').innerHTML = table;

    // 백신
    let vac = vaccineData.find(v => month <= v.maxMonth);
    document.getElementById('vaccine-info').innerHTML = vac ? vac.desc : "해당 월령 접종 정보 없음";
    let nextVacMonth = vac ? vac.maxMonth : 0;
    document.getElementById('vac-dday').innerText = (month === nextVacMonth) ? "이번 달 접종" : (nextVacMonth === 99 ? "기초 접종 완료" : `약 ${nextVacMonth - month}개월 뒤`);

    // 백분위 계산
    let standardArr = growthStandard[gender] || growthStandard['boy'];
    let std = standardArr.slice().reverse().find(x => month >= x.m);
    if(!std) std = standardArr[0]; 

    const sdHeight = std.h * 0.04; 
    const sdWeight = std.w * 0.12;
    const getDesc = (pct) => {
        if(pct >= 95) return `매우 큼 (상위 5%)`;
        if(pct >= 75) return `큰 편 (상위 25%)`;
        if(pct >= 25) return `평균 범위 (정상)`;
        if(pct >= 5) return `작은 편 (하위 25%)`;
        return `매우 작음 (상담 요망)`;
    };

    let pctHeight = null, pctWeight = null;
    if (h) { pctHeight = getPercentile((h - std.h) / sdHeight); document.getElementById('pct-height').innerText = `상위 ${100 - pctHeight}%`; document.getElementById('desc-height').innerText = getDesc(pctHeight); } 
    else { document.getElementById('pct-height').innerText = `-`; document.getElementById('desc-height').innerText = `미입력`; }

    if (w) { pctWeight = getPercentile((w - std.w) / sdWeight); document.getElementById('pct-weight').innerText = `상위 ${100 - pctWeight}%`; document.getElementById('desc-weight').innerText = getDesc(pctWeight); } 
    else { document.getElementById('pct-weight').innerText = `-`; document.getElementById('desc-weight').innerText = `미입력`; }

    // ✨ 카우프 지수 (비만도) 연산 및 친절한 멘트 출력 ✨
    const kaupBadge = document.getElementById('kaup-badge');
    let insightMsg = "";
    
    if (h && w) {
        // 카우프 지수 = 체중 / (키m * 키m)
        const heightM = h / 100;
        const kaup = w / (heightM * heightM);
        kaupBadge.style.display = 'inline-block';
        
        let kaupDesc = "";

        if (kaup < 14) { 
            kaupBadge.innerText = '⚠️ 체중 미달 우려'; kaupBadge.style.background = '#F2F4F6'; kaupBadge.style.color = '#4E5968'; 
            kaupDesc = "키에 비해 몸무게 증가가 다소 정체되어 있어요. 수유량이나 이유식 양을 조금 더 늘려주시고, 영유아 검진 시 의사 선생님과 상담해 보세요!";
        }
        else if (kaup < 16) { 
            kaupBadge.innerText = '🌱 날씬한 모델 체형'; kaupBadge.style.background = '#E8F3FF'; kaupBadge.style.color = '#3182F6'; 
            kaupDesc = "키에 비해 체중이 적게 나가는 날씬한 체형이에요! 활동량이 많거나 기초 대사량이 높은 아기일 수 있습니다. 아주 건강하게 잘 자라고 있어요 🏃‍♂️";
        }
        else if (kaup <= 18) { 
            kaupBadge.innerText = '⚖️ 완벽한 황금 밸런스'; kaupBadge.style.background = '#ECFDF5'; kaupBadge.style.color = '#059669'; 
            kaupDesc = "키와 몸무게의 비율이 교과서처럼 완벽한 황금 밸런스예요! 지금의 식습관과 패턴 그대로 건강하게 키워주시면 됩니다 💯";
        }
        else if (kaup <= 20) { 
            kaupBadge.innerText = '💪 귀여운 통통 우량아'; kaupBadge.style.background = '#FFF9E6'; kaupBadge.style.color = '#B78103'; 
            kaupDesc = "키보다 몸무게가 묵직한 귀여운 통통 우량아예요! 아주 잘 먹고 쑥쑥 크고 있네요. 걷고 뛰기 시작하면 젖살은 자연스럽게 빠진답니다 🧸";
        }
        else { 
            kaupBadge.innerText = '🚨 소아 비만 주의'; kaupBadge.style.background = '#FFF0F1'; kaupBadge.style.color = '#D32F2F'; 
            kaupDesc = "키에 비해 체중이 꽤 많이 나가는 편이에요. 소아 비만으로 이어지지 않도록 간식이나 수유 텀을 한 번 점검해 보시는 걸 권장합니다!";
        }

        insightMsg = `
            <div style="font-size:12px; font-weight:800; color:var(--text-s); margin-bottom:6px;">우리아기 체질량 지수(BMI): <span style="color:var(--text-m);">${kaup.toFixed(1)}</span></div>
            <div style="font-size:14px; font-weight:800; color:var(--text-m); line-height:1.55; word-break:keep-all;">${kaupDesc}</div>
        `;
    } else {
        kaupBadge.style.display = 'none';
        insightMsg = "키와 몸무게를 모두 입력하시면 정확한 체형 밸런스(비만도) 진단과 맞춤 조언을 해드립니다!";
    }

    document.getElementById('growth-insight').innerHTML = insightMsg; 
    
    // 글로벌 윈도우 스코프에 결과값 임시 저장 (저장하기 버튼을 위해)
    window.tempGrowthData = {
        date: new Date().toISOString().split('T')[0],
        month: month,
        height: h || 0,
        weight: w || 0,
        pctHeight: pctHeight ? (100 - pctHeight) : 0,
        pctWeight: pctWeight ? (100 - pctWeight) : 0
    };

    const gRes = document.getElementById('growth-result');
    if(gRes) {
        gRes.style.display = 'block';
        setTimeout(() => { gRes.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);
    }
}
window.calcHealthMaster = calcHealthMaster;

// ✨ 성장 기록 저장 및 파이어베이스 연동 (안전장치 완비)
async function saveGrowthRecord() {
    console.log("1. 저장 버튼 클릭됨! 데이터 확인:", window.tempGrowthData);

    // 🚨 방어 1: 저장할 데이터가 제대로 안 넘어왔을 때
    if (!window.tempGrowthData || (window.tempGrowthData.height === 0 && window.tempGrowthData.weight === 0)) {
        if (typeof showToast === 'function') {
            return showToast("⚠️ 먼저 '분석하기' 버튼을 눌러주세요.");
        } else {
            alert("⚠️ 먼저 '분석하기' 버튼을 눌러주세요.");
            return;
        }
    }
    
    let records = JSON.parse(localStorage.getItem('tosil_growth_records')) || [];
    
    // 같은 날짜 기록 덮어쓰기
    const existIdx = records.findIndex(r => r.date === window.tempGrowthData.date);
    if (existIdx > -1) {
        records[existIdx] = window.tempGrowthData;
    } else {
        records.push(window.tempGrowthData);
    }

    records.sort((a, b) => new Date(a.date) - new Date(b.date)); // 날짜순 정렬
    
    // 🚨 방어 2: 파이어베이스 에러 때문에 로컬 저장까지 멈추는 현상 방지
    if (typeof db !== 'undefined' && typeof setDoc === 'function' && typeof doc === 'function') {
        const syncCode = localStorage.getItem("family_sync_code") || "unlinked_local_diary";
        try { 
            await setDoc(doc(db, "growth_" + syncCode, "status"), { records: records }); 
        } catch (e) { 
            console.warn("파이어베이스 연동 실패 (하지만 기기에는 저장됩니다):", e); 
        }
    }
    
    // 핵심! 로컬 스토리지에 무조건 저장
    localStorage.setItem('tosil_growth_records', JSON.stringify(records));
    console.log("2. 로컬 스토리지 저장 완료:", records);
    
    // 🚨 방어 3: showToast 함수가 없어서 멈추는 현상 방지
    if (typeof showToast === 'function') {
        showToast("🎉 우리 아기 성장 기록이 차트에 안전하게 저장되었습니다!"); 
    } else {
        alert("🎉 우리 아기 성장 기록이 차트에 안전하게 저장되었습니다!");
    }
    
    // 🚨 방어 4: 차트 그리는 함수가 아직 없거나 에러 날 때 방지
    if (typeof renderGrowthHistory === 'function') {
        renderGrowthHistory();
    } else {
        console.warn("renderGrowthHistory 함수가 없습니다. 차트를 갱신하려면 이 함수가 필요합니다.");
    }
}
window.saveGrowthRecord = saveGrowthRecord;

// ✨ 성장 기록 삭제 (모달 적용)
function deleteGrowthRecord(dateStr) {
    showConfirm("이 날의 성장 기록을 삭제할까요?", function() {
        let records = JSON.parse(localStorage.getItem('tosil_growth_records')) || [];
        records = records.filter(r => r.date !== dateStr);
        localStorage.setItem('tosil_growth_records', JSON.stringify(records));
        renderGrowthHistory();
        showToast("🗑️ 성장 기록이 삭제되었습니다!");
    }, "🗑️", "삭제", "#F04452");
}
window.deleteGrowthRecord = deleteGrowthRecord;

// ✨ 저장된 기록으로 차트 & 리스트 그리기
function renderGrowthHistory() {
    let records = JSON.parse(localStorage.getItem('tosil_growth_records')) || [];
    const acc = document.getElementById('growth-history-accordion');
    if (!acc) return;

    if (records.length === 0) {
        acc.style.display = 'none';
        return;
    }
    
    acc.style.display = 'block'; // 기록이 있으면 아코디언 표시!

    // 1. 차트 그리기
    const canvas = document.getElementById('growthChart'); 
    if(canvas && typeof Chart !== 'undefined') {
        const ctx = canvas.getContext('2d'); 
        if(growthChartObj) growthChartObj.destroy(); 
        
        // 데이터 전처리 (0인 값은 차트에서 끊어지게 null 처리)
        const labels = records.map(r => r.date.substring(5)); // MM-DD
        const hData = records.map(r => r.height > 0 ? r.height : null);
        const wData = records.map(r => r.weight > 0 ? r.weight : null);

        growthChartObj = new Chart(ctx, { 
            type: 'line', 
            data: { 
                labels: labels, 
                datasets: [
                    { label: '키(cm)', data: hData, borderColor: '#3182F6', backgroundColor: '#3182F6', yAxisID: 'yHeight', tension: 0.3, spanGaps: true },
                    { label: '몸무게(kg)', data: wData, borderColor: '#10B981', backgroundColor: '#10B981', yAxisID: 'yWeight', tension: 0.3, spanGaps: true }
                ] 
            }, 
            options: { 
                responsive: true, maintainAspectRatio: false, 
                scales: { 
                    yHeight: { type: 'linear', display: true, position: 'left', title: {display: true, text: '키(cm)'} },
                    yWeight: { type: 'linear', display: true, position: 'right', title: {display: true, text: '몸무게(kg)'}, grid: { drawOnChartArea: false } }
                },
                plugins: { legend: { position: 'bottom' } } 
            } 
        });
    }

    // 2. 리스트 그리기
    const listContainer = document.getElementById('growth-history-list');
    if (listContainer) {
        let html = '';
        // 최신 기록이 위로 오게 뒤집어서 렌더링
        [...records].reverse().forEach(r => {
            html += `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; background:#F8F9FA; border-radius:12px; border:1px solid #E5E8EB;">
                    <div>
                        <div style="font-size:12px; color:var(--text-s); font-weight:800;">${r.date} (생후 ${r.month}개월)</div>
                        <div style="font-size:14px; font-weight:900; color:var(--text-m); margin-top:2px;">
                            ${r.height > 0 ? `<span style="color:#3182F6;">키 ${r.height}cm</span> ` : ''} 
                            ${r.weight > 0 ? `<span style="color:#10B981;">몸무게 ${r.weight}kg</span>` : ''}
                        </div>
                    </div>
                    <button onclick="deleteGrowthRecord('${r.date}')" style="background:none; border:none; font-size:14px; color:#D1D6DB; cursor:pointer;">❌</button>
                </div>
            `;
        });
        listContainer.innerHTML = html;
    }
}
window.renderGrowthHistory = renderGrowthHistory;

// 앱 로딩 시(초기화) 성장 기록 불러오기
document.addEventListener("DOMContentLoaded", () => {
    if(typeof window.renderGrowthHistory === 'function') window.renderGrowthHistory();
});

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

// ==========================================
// 🧊 [안심 큐브 냉장고 엔진] (실시간 동기화)
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('cube-date');
    if (dateInput) dateInput.value = todayStr;

    // 🔥 핵심: 이유식 화면에서 남긴 '차감 비밀 메모'가 있는지 확인!
    let pendingSync = localStorage.getItem('tosil_cube_pending_sync');
    if (pendingSync && typeof db !== 'undefined') {
        let records = JSON.parse(pendingSync);
        const syncCode = localStorage.getItem("family_sync_code") || "unlinked_local_diary";
        try {
            // 메모가 있으면 파이어베이스 클라우드 서버에 1개 줄어든 상태를 냅다 덮어씌웁니다!
            await setDoc(doc(db, "cube_" + syncCode, "status"), { records: records });
            // 업로드 완료 후 메모 찢어버리기
            localStorage.removeItem('tosil_cube_pending_sync'); 
        } catch(e) { console.error("차감 동기화 에러:", e); }
    }
});

function getCubeDDayText(madeDateStr) {
    const madeDate = new Date(madeDateStr); madeDate.setHours(0,0,0,0);
    const today = new Date(); today.setHours(0,0,0,0);
    
    const diffDays = Math.floor((today - madeDate) / (1000 * 60 * 60 * 24));
    
    let color = "#3182F6"; 
    let bg = "#EBF4FF";
    let text = `보관 ${diffDays}일차`;
    
    if (diffDays === 0) {
        text = "오늘 얼림";
        color = "#00B37A"; 
        bg = "#E6F7F2";
    } else if (diffDays > 14) {
        color = "#FF823A"; 
        bg = "#FFF0E6";
    } else if (diffDays < 0) {
        text = "날짜 오류";
        color = "#8B95A1";
        bg = "#F2F5F8";
    }
    
    return `<span style="background:${bg}; color:${color}; font-size:11px; font-weight:800; padding:4px 8px; border-radius:6px; border:1px solid ${color};">${text}</span>`;
}

// 🧊 큐브 기록 추가 (토스트 적용)
async function addCubeRecord() {
    const cat = document.getElementById('cube-category').value;
    const name = document.getElementById('cube-name').value.trim();
    const date = document.getElementById('cube-date').value;
    const qty = parseInt(document.getElementById('cube-qty').value);

    if (!name || !date || isNaN(qty) || qty <= 0) {
        return showToast("⚠️ 큐브 이름, 날짜, 수량을 정확히 입력해주세요!"); // 👈 교체
    }

    const newCube = { id: "cube_" + new Date().getTime(), cat: cat, name: name, date: date, qty: qty, timestamp: new Date().getTime() };

    let records = JSON.parse(localStorage.getItem('tosil_cube_records')) || [];
    records.push(newCube);
    
    if (typeof db !== 'undefined') {
        const syncCode = localStorage.getItem("family_sync_code") || "unlinked_local_diary";
        try { await setDoc(doc(db, "cube_" + syncCode, "status"), { records: records }); } catch (e) { console.error(e); }
    }

    localStorage.setItem('tosil_cube_records', JSON.stringify(records));
    document.getElementById('cube-name').value = '';
    document.getElementById('cube-qty').value = '';
    renderCubes();
    showToast("🧊 큐브가 냉장고에 쏙! 저장되었습니다."); // 👈 추가
}

async function useCube(id) {
    let records = JSON.parse(localStorage.getItem('tosil_cube_records')) || [];
    const index = records.findIndex(r => r.id === id);
    if (index === -1) return;

    records[index].qty -= 1;
    
    if (records[index].qty <= 0) {
        records.splice(index, 1); 
    }

    if (typeof db !== 'undefined') {
        const syncCode = localStorage.getItem("family_sync_code") || "unlinked_local_diary";
        try { await setDoc(doc(db, "cube_" + syncCode, "status"), { records: records }); } 
        catch (e) { console.error(e); }
    }

    localStorage.setItem('tosil_cube_records', JSON.stringify(records));
    renderCubes();
}

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

    if (cubeUnsubscribe) cubeUnsubscribe();
    if(typeof window.onSnapshot !== 'function') return;

    cubeUnsubscribe = window.onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            localStorage.setItem('tosil_cube_records', JSON.stringify(data.records || []));
        }
        if (typeof renderCubes === 'function') renderCubes();
    });
}
window.startCubeRealtimeSync = startCubeRealtimeSync;

// ==========================================
// 🧊 [안심 큐브 냉장고] 자주 쓰는 재료 커스텀 편집 엔진
// ==========================================
let isCubeQuickEditMode = false;
const DEFAULT_CUBE_QUICKS = [
    {cat: 'meat', name: '소고기'}, {cat: 'meat', name: '닭고기'},
    {cat: 'veg', name: '애호박'}, {cat: 'veg', name: '브로콜리'}, {cat: 'veg', name: '양배추'}
];

function renderCubeQuicks() {
    const container = document.getElementById('cube-quick-container');
    if(!container) return;
    
    let quicks = JSON.parse(localStorage.getItem('tosil_cube_quicks'));
    if(!quicks || quicks.length === 0) {
        quicks = DEFAULT_CUBE_QUICKS;
        localStorage.setItem('tosil_cube_quicks', JSON.stringify(quicks));
    }

    let html = '';
    quicks.forEach((q, index) => {
        const isMeat = q.cat === 'meat';
        const bg = isMeat ? '#FFF0F1' : '#ECFDF5';
        const color = isMeat ? '#D32F2F' : '#059669';
        const border = isMeat ? '#FFE3E3' : '#A7F3D0';
        const icon = isMeat ? '🥩' : '🥦';

        if (isCubeQuickEditMode) {
            html += `<button onclick="deleteCubeQuick(${index})" style="flex-shrink:0; padding:8px 14px; background:#F2F4F6; color:#8B95A1; border:1px dashed #D1D6DB; border-radius:20px; font-size:13px; font-weight:800; cursor:pointer; transition:0.2s;">${q.name} ❌</button>`;
        } else {
            html += `<button onclick="setCubeQuick('${q.cat}', '${q.name}')" style="flex-shrink:0; padding:8px 14px; background:${bg}; color:${color}; border:1px solid ${border}; border-radius:20px; font-size:13px; font-weight:800; cursor:pointer; transition:0.2s;">${icon} ${q.name}</button>`;
        }
    });

    if (isCubeQuickEditMode) {
        html += `<button onclick="addCubeQuick()" style="flex-shrink:0; padding:8px 14px; background:#E8F3FF; color:#3182F6; border:1px dashed #3182F6; border-radius:20px; font-size:13px; font-weight:800; cursor:pointer;">+ 새 재료 추가</button>`;
    }

    container.innerHTML = html;
}

function toggleCubeQuickEdit() {
    isCubeQuickEditMode = !isCubeQuickEditMode;
    renderCubeQuicks();
}

// 🧊 큐브 퀵버튼 삭제 (모달 적용)
function deleteCubeQuick(index) {
    showConfirm("이 재료를 자주 쓰는 목록에서 삭제할까요?", function() {
        let quicks = JSON.parse(localStorage.getItem('tosil_cube_quicks')) || [];
        quicks.splice(index, 1);
        localStorage.setItem('tosil_cube_quicks', JSON.stringify(quicks));
        renderCubeQuicks();
        showToast("✂️ 삭제되었습니다.");
    }, "✂️", "삭제", "#F04452");
}
window.addCubeRecord = addCubeRecord;
window.deleteCubeQuick = deleteCubeQuick;

function addCubeQuick() {
    const name = prompt("추가할 자주 쓰는 재료의 이름을 입력하세요.\n(예: 단호박, 대구살, 오트밀 등)");
    if(!name || !name.trim()) return;
    
    const isMeat = confirm(`[${name}]\n이 재료는 고기/단백질류 인가요?\n\n- 고기면 [확인]\n- 채소면 [취소]를 눌러주세요.`);
    const cat = isMeat ? 'meat' : 'veg';
    
    let quicks = JSON.parse(localStorage.getItem('tosil_cube_quicks')) || [];
    quicks.push({cat: cat, name: name.trim()});
    localStorage.setItem('tosil_cube_quicks', JSON.stringify(quicks));
    renderCubeQuicks();
}

function setCubeQuick(cat, name) {
    document.getElementById('cube-category').value = cat;
    document.getElementById('cube-name').value = name;
    document.getElementById('cube-qty').focus(); 
}

window.renderCubeQuicks = renderCubeQuicks;
window.toggleCubeQuickEdit = toggleCubeQuickEdit;
window.deleteCubeQuick = deleteCubeQuick;
window.addCubeQuick = addCubeQuick;
window.setCubeQuick = setCubeQuick;

document.addEventListener("DOMContentLoaded", () => {
    setTimeout(renderCubeQuicks, 100);
});

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

// 💌 바통터치 생성 (토스트 적용)
async function createBatonTask(text, reward) {
    let records = JSON.parse(localStorage.getItem('tosil_baton_records')) || [];
    
    const isDuplicate = records.some(r => r.text === text);
    if (isDuplicate) return showToast("🚨 이미 똑같은 부탁이 대기 중입니다!"); // 👈 교체

    const now = new Date(), timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    records.unshift({ id: "baton_"+now.getTime(), text, reward, time: timeStr, status: "requested" });
    await saveBatonToFirebase(records);
    showToast("💌 바통터치 요청이 성공적으로 전달되었습니다!"); // 👈 추가
}

async function acceptBaton(id) {
    let records = JSON.parse(localStorage.getItem('tosil_baton_records')) || [];
    const idx = records.findIndex(r => r.id === id);
    if (idx === -1) return;
    records[idx].status = "accepted";
    await saveBatonToFirebase(records);
}

// 💌 바통터치 완료 (토스트 적용 + 🎮 경험치 획득 추가!)
async function completeBaton(id) {
    let records = JSON.parse(localStorage.getItem('tosil_baton_records')) || [];
    const idx = records.findIndex(r => r.id === id);
    if (idx === -1) return;
    
    const reward = records[idx].reward; 
    records.splice(idx, 1); 
    await saveBatonToFirebase(records);

    if (reward && reward !== "없음") {
        showToast(`🎉 미션 해결!\n약속된 보상 [${reward}]을(를) 당당하게 요구하세요! 👍`);
    } else {
        showToast("🎉 미션 해결 완료! 든든한 육아메이트 최고입니다 👍");
    }

    // 👇 이 마법의 한 줄이 남편의 경험치를 20만큼 올려줍니다!
    if(typeof gainDadExp === 'function') gainDadExp(20); 
}

// 💌 바통터치 취소 (모달 적용)
async function cancelBaton(id) {
    showConfirm("이 부탁을 취소하시겠습니까?", async function() {
        let records = JSON.parse(localStorage.getItem('tosil_baton_records')) || [];
        records = records.filter(r => r.id !== id);
        await saveBatonToFirebase(records);
        showToast("🕊️ 부탁이 취소되었습니다.");
    }, "🤔", "취소", "#8B95A1");
}
window.createBatonTask = createBatonTask;
window.completeBaton = completeBaton;
window.cancelBaton = cancelBaton;

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
// 💌 [바통터치] 실시간 감시 엔진 
// ==========================================
let batonUnsubscribe = null;
function startBatonRealtimeSync() {
    const syncCode = localStorage.getItem("family_sync_code") || "unlinked_local_diary";
    const docRef = typeof doc !== 'undefined' && typeof window.db !== 'undefined' ? doc(window.db, "baton_" + syncCode, "status") : null;
    
    if(!docRef) return; 

    if (batonUnsubscribe) batonUnsubscribe();
    if(typeof window.onSnapshot !== 'function') return;

    batonUnsubscribe = window.onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            localStorage.setItem('tosil_baton_records', JSON.stringify(data.records || []));
            renderBatonTasks(); 
        }
    });
}
window.startBatonRealtimeSync = startBatonRealtimeSync;

// ==========================================
// 🚀 런타임 구동 마스터 마운트 (중복 실행 방지 완벽 패치)
// ==========================================
window.onload = () => { 
    loadAllExternalData(); 
    renderBabyInfo(); 
    loadBabyPhoto(); 
    renderCubes();
    renderBatonTasks();
    updateLedgerUI();
    updateHomeDashboard();
    initDarkMode();
    renderFoodChecklist(); 
    renderMilestones();
    
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
        
    // 🚨 파이어베이스 중복 호출 방지! (리스너는 따로 켜지므로 여기선 기본 화면만 그림)
    renderFeverTimeline();
    updateSyncBadge(); 
};

// ==========================================
// 👨‍👩‍👧 가족 실시간 연동 모달 컨트롤
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

window.openFamilySyncModal = openFamilySyncModal;
window.closeFamilySyncModalForce = closeFamilySyncModalForce;
window.closeFamilySyncModal = closeFamilySyncModal;

function updateSyncBadge() {
    const syncCode = localStorage.getItem('family_sync_code'); 
    const badgeBtn = document.getElementById('sync-badge-btn');
    const badgeText = document.getElementById('sync-status-text');
    const badgeIcon = document.getElementById('sync-status-icon');

    if (!badgeBtn || !badgeText) return; 

    if (syncCode) {
        badgeBtn.style.background = "#E8F0FE";
        badgeBtn.style.color = "#1A73E8";
        badgeText.innerText = "연동완료";
        if(badgeIcon) badgeIcon.innerText = "🔗";
    } else {
        badgeBtn.style.background = "#FFF3CD";
        badgeBtn.style.color = "#856404";
        badgeText.innerText = "연동 필요!";
        if(badgeIcon) badgeIcon.innerText = "🚨";
    }
}
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
// 💡 스마트 홈 배너 엔진 (알람 끄기 + 예쁜 ✕ 버튼 장착)
// ==========================================
window.dismissSmartBanner = function(bannerType) {
    // 오늘 날짜를 기억해서 내일 00시가 되면 다시 뜨게 만듭니다!
    localStorage.setItem('tosil_dismiss_banner_' + bannerType, new Date().toDateString());
    window.updateSmartBanner();
    window.showToast("오늘 하루 이 알림을 보지 않습니다 🤫");
};

function updateSmartBanner() {
    const container = document.getElementById('smart-banner-container');
    if(!container) return;

    container.style.setProperty('border', 'none', 'important');
    container.style.setProperty('outline', 'none', 'important');
    container.style.setProperty('background', 'transparent', 'important');
    container.style.setProperty('box-shadow', 'none', 'important');

    let banners = [];
    const todayStr = new Date().toDateString();
    const isDismissed = (type) => localStorage.getItem('tosil_dismiss_banner_' + type) === todayStr;

    // 1. SOS 바통터치
    const batonRecords = JSON.parse(localStorage.getItem('tosil_baton_records')) || [];
    const urgentBaton = batonRecords.find(r => r.status === 'requested');
    if (urgentBaton && !isDismissed('baton')) {
        banners.push(`
            <div onclick="switchTab('toolbox', document.getElementById('nav-toolbox')); setTimeout(() => switchTool('baton'), 50);" style="position: relative; flex-shrink: 0; width: __WIDTH__; scroll-snap-align: start; background: var(--bg-card); border: 1px solid #6B4EFF; border-radius: 16px; padding: 18px 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.05); box-sizing: border-box;">
                <button onclick="event.stopPropagation(); window.dismissSmartBanner('baton');" style="position:absolute; top:8px; right:8px; background:rgba(0,0,0,0.05); border-radius:50%; border:none; color:#8B95A1; font-size:12px; font-weight:900; width:26px; height:26px; display:flex; align-items:center; justify-content:center; cursor:pointer; z-index:10; backdrop-filter: blur(2px);">✕</button>
                <div style="display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0;">
                    <div style="font-size: 26px; flex-shrink: 0;">💌</div>
                    <div style="flex: 1; min-width: 0; text-align: left;">
                        <div style="font-size: 12px; font-weight: 800; color: #6B4EFF; margin-bottom: 4px;">짝꿍의 SOS 요청!</div>
                        <div style="font-size: 15.5px; font-weight: 900; color: var(--text-m); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: -0.3px;">"${urgentBaton.text}"</div>
                    </div>
                </div>
                <span style="flex-shrink: 0; white-space: nowrap; background: #6B4EFF; color: white; font-size: 13px; font-weight: 900; padding: 8px 14px; border-radius: 12px;">교대하기</span>
            </div>
        `);
    }

    // 2. 주간 리포트 (일, 월요일)
    const dayOfWeek = new Date().getDay();
    if ((dayOfWeek === 0 || dayOfWeek === 1) && !isDismissed('weekly')) {
        banners.push(`
            <div onclick="window.openWeeklyReport()" style="position: relative; flex-shrink: 0; width: __WIDTH__; scroll-snap-align: start; background: var(--bg-card); border: 1px solid #F04452; border-radius: 16px; padding: 18px 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.05); box-sizing: border-box;">
                <button onclick="event.stopPropagation(); window.dismissSmartBanner('weekly');" style="position:absolute; top:8px; right:8px; background:rgba(0,0,0,0.05); border-radius:50%; border:none; color:#8B95A1; font-size:12px; font-weight:900; width:26px; height:26px; display:flex; align-items:center; justify-content:center; cursor:pointer; z-index:10; backdrop-filter: blur(2px);">✕</button>
                <div style="display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0;">
                    <div style="font-size: 26px; flex-shrink: 0;">🎉</div>
                    <div style="flex: 1; min-width: 0; text-align: left;">
                        <div style="font-size: 12px; font-weight: 800; color: #F04452; margin-bottom: 4px;">수고했어요, 짝꿍!</div>
                        <div style="font-size: 15.5px; font-weight: 900; color: var(--text-m); letter-spacing: -0.3px;">이번 주 육아 리포트 발행</div>
                    </div>
                </div>
                <span style="flex-shrink: 0; white-space: nowrap; background: #F04452; color: white; font-size: 13px; font-weight: 900; padding: 8px 14px; border-radius: 12px;">리포트 보기</span>
            </div>
        `);
    }

    try {
        const savedBaby = localStorage.getItem('tosil_baby');
        if (savedBaby) {
            const data = JSON.parse(savedBaby);
            const diffDays = Math.ceil((new Date() - new Date(data.birth)) / (1000 * 60 * 60 * 24));
            const weekAge = Math.floor(diffDays / 7);
            const monthAge = Math.floor(diffDays / 30.436875);

            // 3. 원더윅스
            if (typeof wwList !== 'undefined') {
                const curWW = wwList.find(x => weekAge >= (x.w - 4) && weekAge <= (x.w + 1));
                if (curWW && !isDismissed('wonderweek')) {
                    banners.push(`
                        <div onclick="switchTab('toolbox', document.getElementById('nav-toolbox')); setTimeout(() => switchTool('growth'), 50);" style="position: relative; flex-shrink: 0; width: __WIDTH__; scroll-snap-align: start; background: var(--bg-card); border: 1px solid #F04452; border-radius: 16px; padding: 18px 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; cursor: pointer; box-sizing: border-box;">
                            <button onclick="event.stopPropagation(); window.dismissSmartBanner('wonderweek');" style="position:absolute; top:8px; right:8px; background:rgba(0,0,0,0.05); border-radius:50%; border:none; color:#8B95A1; font-size:12px; font-weight:900; width:26px; height:26px; display:flex; align-items:center; justify-content:center; cursor:pointer; z-index:10; backdrop-filter: blur(2px);">✕</button>
                            <div style="display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0;">
                                <div style="font-size: 26px; flex-shrink: 0;">⛈️</div>
                                <div style="flex: 1; min-width: 0; text-align: left;">
                                    <div style="font-size: 12px; font-weight: 800; color: #D32F2F; margin-bottom: 4px;">원더윅스 경보</div>
                                    <div style="font-size: 15.5px; font-weight: 900; color: var(--text-m); letter-spacing: -0.3px;">현재 ${curWW.t} 구간!</div>
                                </div>
                            </div>
                            <span style="flex-shrink: 0; white-space: nowrap; background: #F04452; color: white; font-size: 13px; font-weight: 900; padding: 8px 14px; border-radius: 12px;">대처법 보기</span>
                        </div>
                    `);
                }
            }

            // 4. 예방접종
            if (typeof vaccineData !== 'undefined') {
                const curVac = vaccineData.find(v => monthAge === v.maxMonth);
                if (curVac && !isDismissed('vaccine')) {
                    banners.push(`
                        <div onclick="switchTab('toolbox', document.getElementById('nav-toolbox')); setTimeout(() => switchTool('growth'), 50);" style="position: relative; flex-shrink: 0; width: __WIDTH__; scroll-snap-align: start; background: var(--bg-card); border: 1px solid #3182F6; border-radius: 16px; padding: 18px 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; cursor: pointer; box-sizing: border-box;">
                            <button onclick="event.stopPropagation(); window.dismissSmartBanner('vaccine');" style="position:absolute; top:8px; right:8px; background:rgba(0,0,0,0.05); border-radius:50%; border:none; color:#8B95A1; font-size:12px; font-weight:900; width:26px; height:26px; display:flex; align-items:center; justify-content:center; cursor:pointer; z-index:10; backdrop-filter: blur(2px);">✕</button>
                            <div style="display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0;">
                                <div style="font-size: 26px; flex-shrink: 0;">💉</div>
                                <div style="flex: 1; min-width: 0; text-align: left;">
                                    <div style="font-size: 12px; font-weight: 800; color: #1967D2; margin-bottom: 4px;">이번 달 필수 접종</div>
                                    <div style="font-size: 15.5px; font-weight: 900; color: var(--text-m); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: -0.3px;">${curVac.desc}</div>
                                </div>
                            </div>
                            <span style="flex-shrink: 0; white-space: nowrap; background: #1A73E8; color: white; font-size: 13px; font-weight: 900; padding: 8px 14px; border-radius: 12px;">확인하기</span>
                        </div>
                    `);
                }
            }
        }
    } catch(e) {}

    // 5. 큐브 알림
    const cubeRecords = JSON.parse(localStorage.getItem('tosil_cube_records')) || [];
    const lowCube = cubeRecords.find(r => r.qty <= 2);
    if (lowCube && !isDismissed('cube')) {
        banners.push(`
            <div onclick="switchTab('toolbox', document.getElementById('nav-toolbox')); setTimeout(() => switchTool('cube'), 50);" style="position: relative; flex-shrink: 0; width: __WIDTH__; scroll-snap-align: start; background: var(--bg-card); border: 1px solid #F59E0B; border-radius: 16px; padding: 18px 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; cursor: pointer; box-sizing: border-box;">
                <button onclick="event.stopPropagation(); window.dismissSmartBanner('cube');" style="position:absolute; top:8px; right:8px; background:rgba(0,0,0,0.05); border-radius:50%; border:none; color:#8B95A1; font-size:12px; font-weight:900; width:26px; height:26px; display:flex; align-items:center; justify-content:center; cursor:pointer; z-index:10; backdrop-filter: blur(2px);">✕</button>
                <div style="display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0;">
                    <div style="font-size: 26px; flex-shrink: 0;">🧊</div>
                    <div style="flex: 1; min-width: 0; text-align: left;">
                        <div style="font-size: 12px; font-weight: 800; color: #B78103; margin-bottom: 4px;">큐브 충전 필요</div>
                        <div style="font-size: 15.5px; font-weight: 900; color: var(--text-m); letter-spacing: -0.3px;">${lowCube.name} 큐브가 ${lowCube.qty}개 남았어요!</div>
                    </div>
                </div>
                <span style="flex-shrink: 0; white-space: nowrap; background: #F59E0B; color: white; font-size: 13px; font-weight: 900; padding: 8px 14px; border-radius: 12px;">채우기</span>
            </div>
        `);
    }

    if (banners.length > 0) {
        const dynamicWidth = banners.length === 1 ? '100%' : '88%';
        const finalBanners = banners.map(b => b.replace(/__WIDTH__/g, dynamicWidth));
        
        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding: 0 4px; border: none !important; outline: none !important; background: transparent !important; box-shadow: none !important;">
                <div style="font-size: 13.5px; font-weight: 800; color: var(--text-s);">🔔 맞춤 알림 <span style="color:#3182F6">${banners.length}</span></div>
                ${banners.length > 1 ? `<div style="font-size: 11px; font-weight: 700; color: var(--text-s); background: var(--bg-sub); padding: 2px 8px; border-radius: 10px;">옆으로 넘겨보세요 👉</div>` : ''}
            </div>
            <div style="display: flex; overflow-x: auto; scroll-snap-type: x mandatory; gap: 12px; padding-bottom: 8px; scrollbar-width: none; border: none !important; outline: none !important; background: transparent !important; box-shadow: none !important;">
                ${finalBanners.join('')}
            </div>
        `;
        container.style.display = 'block';
    } else {
        container.innerHTML = '';
        container.style.display = 'none';
    }
}
window.updateSmartBanner = updateSmartBanner; // 명시적 등록

// ==========================================
// 👨‍⚕️ 소아과 진료 브리핑 리포트 엔진
// ==========================================
function openPediatricianReport() {
    let records = JSON.parse(localStorage.getItem('tosil_fever_records')) || [];
    if(records.length === 0) {
        return alert("아직 기록된 체온/투약 데이터가 없습니다. 건강한 상태네요! 🌿");
    }
    
    let weight = localStorage.getItem('tosil_latest_weight') || '미입력';
    let recordHtml = '<div style="max-height: 350px; overflow-y: auto; background:#F8F9FA; padding:16px; border-radius:12px; border:1px solid #E5E8EB; display:flex; flex-direction:column; gap:12px;">';
    
    records.forEach(r => {
        let pillText = '<span style="color:#8B95A1; font-weight:700;">약 미복용</span>';
        if (r.type === 'red') {
            pillText = '<span style="color:#FF4B2B; font-weight:900;">🔴 아세트아미노펜 (빨강)</span>';
        } else if (r.type === 'blue') {
            pillText = '<span style="color:#3182F6; font-weight:900;">🔵 이부/덱시부프로펜 (파랑)</span>';
        }
        
        let symText = (r.symptoms && r.symptoms.length > 0) ? `<div style="margin-top:6px; font-size:11.5px; color:#6B7684; background:#F2F5F8; padding:4px 8px; border-radius:6px; display:inline-block;">🚨 증상: ${r.symptoms.join(', ')}</div>` : '';
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

    const body = document.getElementById('modal-dynamic-body');
    if(!body) return;

    body.innerHTML = `
        <div style="text-align: center; margin-bottom: 24px;">
            <div style="font-size: 36px; margin-bottom: 8px;">👨‍⚕️</div>
            <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 900; color: #191F28;">소아과 진료 브리핑</h3>
            <p style="margin: 0; font-size: 13px; font-weight: 600; color: #8B95A1; line-height: 1.5;">
                의사 선생님께 스마트폰을 이대로 보여주세요.<br>최근 체중과 투약 기록이 요약되어 있습니다.
            </p>
        </div>
        
        <div style="display: flex; justify-content: space-between; align-items: center; background: #F2F4F6; padding: 18px 20px; border-radius: 16px; margin-bottom: 16px;">
            <span style="color: #4E5968; font-weight: 800; font-size: 14px;"> 최근 계측 체중</span>
            <span style="color: #191F28; font-weight: 900; font-size: 20px;">${weight}${weight !== '미입력' ? ' <span style="font-size:14px; color:#8B95A1;">kg</span>' : ''}</span>
        </div>

        <div style="background: #FFFFFF; border: 1px solid #E5E8EB; border-radius: 16px; padding: 18px 20px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
            <div style="font-size: 13px; font-weight: 800; color: #8B95A1; margin-bottom: 12px; border-bottom: 1px dashed #E5E8EB; padding-bottom: 12px;">
                📊 최근 타임라인 요약
            </div>
            <div style="max-height: 250px; overflow-y: auto;">
                ${recordHtml}
            </div>
        </div>

        <button style="width: 100%; padding: 18px; border-radius: 16px; background: #191F28; color: #FFFFFF; font-weight: 800; font-size: 16px; border: none; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: 0.2s;" onclick="closeFestivalModalForce()">
            확인 완료
        </button>
    `;

    const modalWrap = document.getElementById('premium-modal');
    if(modalWrap) modalWrap.style.display = 'flex';
}
window.openPediatricianReport = openPediatricianReport;


// ==========================================
// 📱 원터치 육아 트래커 엔진 (낮잠/밤잠 기능 분리 완성본)
// ==========================================
window.trackerState = { type: '', subType: '', status: '' };
window.editingTrackerId = null; 

window.selectTrackerBtn = function(btn, category) {
    const siblings = btn.parentElement.children;
    for(let i=0; i<siblings.length; i++) {
        siblings[i].style.setProperty('background', 'var(--bg-card)', 'important');
        siblings[i].style.setProperty('color', 'var(--text-s)', 'important');
        siblings[i].style.setProperty('border', '1px solid var(--border)', 'important');
        if(siblings[i].tagName === 'SPAN') {
            siblings[i].style.setProperty('background', 'var(--bg-sub)', 'important');
        }
    }
    
    if (category === 'feed') {
        btn.style.setProperty('background', '#F0F7FF', 'important');
        btn.style.setProperty('color', '#3182F6', 'important');
        btn.style.setProperty('border', '1px solid #3182F6', 'important');
        window.trackerState.subType = btn.innerText;
    } else if (category === 'diaper_pee') {
        btn.style.setProperty('background', '#F0F7FF', 'important');
        btn.style.setProperty('color', '#3182F6', 'important');
        btn.style.setProperty('border', '1px solid #3182F6', 'important');
        window.trackerState.subType = '소변';
        const statusArea = document.getElementById('diaper-status-area');
        if(statusArea) statusArea.style.display = 'none'; 
    } else if (category === 'diaper_poop') {
        btn.style.setProperty('background', '#FFF0F1', 'important');
        btn.style.setProperty('color', '#D32F2F', 'important');
        btn.style.setProperty('border', '1px solid #F04452', 'important');
        window.trackerState.subType = '대변';
        const statusArea = document.getElementById('diaper-status-area');
        if(statusArea) statusArea.style.display = 'block'; 
    } else if (category === 'diaper_both') {
        // ✨ 아내분 CS 반영: "둘 다" 버튼 동작
        btn.style.setProperty('background', '#F3E8FF', 'important');
        btn.style.setProperty('color', '#7C3AED', 'important');
        btn.style.setProperty('border', '1px solid #C4B5FD', 'important');
        window.trackerState.subType = '소변+대변';
        const statusArea = document.getElementById('diaper-status-area');
        if(statusArea) statusArea.style.display = 'block'; // 대변 포함이므로 상태 확인
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
    else if (category === 'sleep_day') {
        btn.style.setProperty('background', '#FFF9E6', 'important');
        btn.style.setProperty('color', '#B78103', 'important');
        btn.style.setProperty('border', '1px solid #FFE58F', 'important');
        window.trackerState.subType = '낮잠';
    } else if (category === 'sleep_night') {
        btn.style.setProperty('background', '#F3E8FF', 'important');
        btn.style.setProperty('color', '#7C3AED', 'important');
        btn.style.setProperty('border', '1px solid #C4B5FD', 'important');
        window.trackerState.subType = '밤잠';
    }
};

window.openTrackerSheet = function(type, editId = null) {
    window.editingTrackerId = (typeof editId === 'string') ? editId : null;
    window.trackerState.type = type; window.trackerState.subType = ''; window.trackerState.status = '';
    
    const overlay = document.getElementById('tracker-sheet-overlay');
    const content = document.getElementById('tracker-sheet-content');
    const title = document.getElementById('tracker-sheet-title');
    const body = document.getElementById('tracker-sheet-body');
    const saveBtn = document.getElementById('btn-tracker-save');
    
    if (!overlay || !content) return;

    content.style.backgroundColor = 'var(--bg-card)';
    if(title) title.style.color = 'var(--text-m)';
    if(saveBtn) {
        saveBtn.style.backgroundColor = 'var(--primary)';
        saveBtn.style.color = '#FFF';
        saveBtn.style.border = 'none';
    }
    
    overlay.style.display = 'block'; setTimeout(() => { content.style.transform = 'translateY(0)'; }, 10);
    
    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    
    // ✨ 모든 탭 공통: 시간 입력칸 하나로 통일!
    const timeInputHtml = `
        <div style="text-align: center; margin-bottom: 20px;">
            <div style="font-size:12px; font-weight:800; color:var(--text-s); margin-bottom:6px;">언제 기록할까요? (터치하여 시간 수정)</div>
            <input type="time" id="v-tracker-time" value="${currentTimeStr}" style="border:1px solid var(--border); background:var(--bg-sub); padding:8px 16px; border-radius:12px; font-size:18px; font-weight:900; color:var(--text-m); outline:none;">
        </div>
    `;
    
    if (type === 'feed') {
        title.innerHTML = '🍼 수유 기록하기';
        body.innerHTML = timeInputHtml + `
            <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                <button class="btn-main" onclick="window.selectTrackerBtn(this, 'feed')" style="flex: 1; background: var(--bg-card); color: var(--text-s); border: 1px solid var(--border); box-shadow: none; margin:0; transition:0.2s;">분유</button>
                <button class="btn-main" onclick="window.selectTrackerBtn(this, 'feed')" style="flex: 1; background: var(--bg-card); color: var(--text-s); border: 1px solid var(--border); box-shadow: none; margin:0; transition:0.2s;">모유</button>
                <button class="btn-main" onclick="window.selectTrackerBtn(this, 'feed')" style="flex: 1; background: var(--bg-card); color: var(--text-s); border: 1px solid var(--border); box-shadow: none; margin:0; transition:0.2s;">유축</button>
            </div>
            <div style="text-align: center; margin-bottom: 24px;">
                <div style="font-size: 13px; font-weight: 800; color: var(--text-s); margin-bottom: 8px;">먹은 양 (ml)</div>
                <div style="display: flex; justify-content: center; align-items: baseline; gap: 4px;">
                    <input type="number" id="v-feed-amount" placeholder="160" style="font-size: 40px; font-weight: 900; color: var(--text-m); border: none; outline: none; background: transparent; text-align: center; width: 100px; padding: 0; margin: 0; border-bottom: 2px solid var(--border); border-radius: 0;">
                    <span style="font-size: 18px; font-weight: 800; color: var(--text-s);">ml</span>
                </div>
            </div>
        `;
        if(saveBtn) saveBtn.style.display = 'block';

    } else if (type === 'sleep') {
        title.innerHTML = window.editingTrackerId ? '💤 수면 기록 수정' : '💤 수면 기록하기';
        
        body.innerHTML = timeInputHtml + `
            <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                <button class="btn-main" onclick="window.selectTrackerBtn(this, 'sleep_day')" style="flex: 1; background: var(--bg-card); color: var(--text-s); border: 1px solid var(--border); box-shadow: none; margin:0; transition:0.2s;">☀️ 낮잠</button>
                <button class="btn-main" onclick="window.selectTrackerBtn(this, 'sleep_night')" style="flex: 1; background: var(--bg-card); color: var(--text-s); border: 1px solid var(--border); box-shadow: none; margin:0; transition:0.2s;">🌙 밤잠</button>
            </div>

            <!-- 👇 다크모드 대응 완료: 하얀색 박스 대신 어두운 배경(var(--bg-sub)) 적용 -->
            <div style="background:var(--bg-sub); padding:18px; border-radius:16px; margin-bottom:20px; border:1px solid var(--border); text-align:center;">
                <div style="font-size:12.5px; font-weight:800; color:#3182F6; margin-bottom:8px;">아기가 지금 막 일어났나요?</div>
                <button onclick="window.calcSleepToNow()" style="width:100%; padding:14px; background:var(--bg-card); color:#3182F6; border:1px solid var(--border); border-radius:12px; font-size:15px; font-weight:900; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,0.05); transition:0.2s;">
                    ⏰ 방금 깼어요! (알아서 계산)
                </button>
            </div>

            <div style="text-align: center; margin-bottom: 24px;">
                <div style="font-size: 13.5px; font-weight: 800; color: var(--text-s); margin-bottom: 12px;">총 수면 시간 (분)</div>
                <div style="display: flex; justify-content: center; align-items: baseline; gap: 6px;">
                    <input type="number" id="v-sleep-amount" placeholder="0" style="font-size: 44px; font-weight: 900; color: var(--text-m); border: none; outline: none; background: transparent; text-align: center; width: 100px; padding: 0; margin: 0; border-bottom: 3px solid var(--border); border-radius: 0; transition:0.3s;">
                    <span style="font-size: 18px; font-weight: 800; color: var(--text-s);">분</span>
                </div>
                <!-- ✅ 수정된 코드 (다크모드 완벽 호환) -->
                <div style="margin-top: 14px;">
                    <span style="background:var(--bg-sub); color:var(--text-m); font-size:11.5px; font-weight:800; padding:6px 12px; border-radius:20px; border:1px solid var(--border);">💡 자는 중이라면 빈칸으로 두고 [저장] 누르세요!</span>
                </div>
            </div>
        `;
        if(saveBtn) saveBtn.style.display = 'block';

        setTimeout(() => {
            const btns = document.querySelectorAll('#tracker-sheet-body .btn-main');
            btns.forEach(btn => {
               if(btn.innerText.includes('낮잠') && !window.editingTrackerId) window.selectTrackerBtn(btn, 'sleep_day');
            });
        }, 50);

    } else if (type === 'diaper') {

        title.innerHTML = '💩 기저귀 기록하기';
        body.innerHTML = timeInputHtml + `
            <div style="display: flex; gap: 8px; margin-bottom: 20px;">
                <button class="btn-main" onclick="window.selectTrackerBtn(this, 'diaper_pee')" style="flex: 1; background: var(--bg-card); color: var(--text-s); border: 1px solid var(--border); box-shadow: none; margin:0; transition:0.2s; padding:12px 0;">소변</button>
                <button class="btn-main" onclick="window.selectTrackerBtn(this, 'diaper_poop')" style="flex: 1; background: var(--bg-card); color: var(--text-s); border: 1px solid var(--border); box-shadow: none; margin:0; transition:0.2s; padding:12px 0;">대변</button>
                <button class="btn-main" onclick="window.selectTrackerBtn(this, 'diaper_both')" style="flex: 1; background: var(--bg-card); color: var(--text-s); border: 1px solid var(--border); box-shadow: none; margin:0; transition:0.2s; padding:12px 0;">둘 다</button>
            </div>
            <div id="diaper-status-area" style="display:none; margin-bottom:10px;">
                <div style="text-align: center; font-size: 14px; font-weight: 800; color: var(--text-m); margin-bottom: 12px;">변의 상태는 어땠나요?</div>
                <div style="display: flex; justify-content: center; gap: 8px;">
                    <span onclick="window.selectTrackerBtn(this, 'status_yellow')" style="padding: 8px 16px; background: var(--bg-sub); color: var(--text-s); border-radius: 12px; font-weight: 800; font-size: 13px; border: 1px solid var(--border); cursor:pointer; transition:0.2s;">🟨 황금변</span>
                    <span onclick="window.selectTrackerBtn(this, 'status_green')" style="padding: 8px 16px; background: var(--bg-sub); color: var(--text-s); border-radius: 12px; font-weight: 800; font-size: 13px; border: 1px solid var(--border); cursor:pointer; transition:0.2s;">🟩 녹변</span>
                </div>
            </div>
        `;
        if(saveBtn) saveBtn.style.display = 'block';
    }

    if (window.editingTrackerId) {
        title.innerHTML = title.innerHTML.replace('기록하기', '수정하기');
        if(saveBtn) saveBtn.innerText = '수정 완료';
        let records = JSON.parse(localStorage.getItem('tosil_tracker_records')) || [];
        let recordToEdit = records.find(r => r.id === window.editingTrackerId);
        
        if (recordToEdit) {
            setTimeout(() => {
                const timeInput = document.getElementById('v-tracker-time');
                if(timeInput) timeInput.value = recordToEdit.time;

                const buttons = document.querySelectorAll('#tracker-sheet-body .btn-main');
                buttons.forEach(btn => {
                    if (btn.innerText === recordToEdit.subType || 
                       (recordToEdit.subType === '소변' && btn.innerText === '소변') || 
                       (recordToEdit.subType === '대변' && btn.innerText === '대변') ||
                       (recordToEdit.subType === '소변+대변' && btn.innerText === '둘 다')) {
                        let cat = '';
                        if (recordToEdit.type === 'feed') cat = 'feed';
                        else if (recordToEdit.type === 'diaper' && recordToEdit.subType === '소변') cat = 'diaper_pee';
                        else if (recordToEdit.type === 'diaper' && recordToEdit.subType === '대변') cat = 'diaper_poop';
                        else if (recordToEdit.type === 'diaper' && recordToEdit.subType === '소변+대변') cat = 'diaper_both';
                        if(cat) window.selectTrackerBtn(btn, cat);
                    }
                });

                if (recordToEdit.type === 'feed') {
                    const amtInput = document.getElementById('v-feed-amount');
                    if (amtInput) amtInput.value = recordToEdit.amount;
                }
                
                if (recordToEdit.type === 'sleep') {
                    const sleepAmtInput = document.getElementById('v-sleep-amount');
                    if (sleepAmtInput) sleepAmtInput.value = recordToEdit.amount;
                }

                if (recordToEdit.type === 'diaper' && recordToEdit.status) {
                    const spans = document.querySelectorAll('#diaper-status-area span');
                    spans.forEach(span => {
                        if (span.innerText.includes(recordToEdit.status)) {
                            let cat = recordToEdit.status === '황금변' ? 'status_yellow' : 'status_green';
                            window.selectTrackerBtn(span, cat);
                        }
                    });
                }
            }, 50);
        }
    } else {
        if(saveBtn) saveBtn.innerText = '저장하기';
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

window.startSleepTimer = function(sleepType) {
    localStorage.setItem('tosil_sleep_start', new Date().getTime());
    localStorage.setItem('tosil_sleep_type', sleepType || '낮잠'); 
    
    // ✨ 타이머를 켰으니 시트를 닫고 홈 화면 배너를 띄웁니다!
    window.closeTrackerSheet(); 
    if (typeof window.updateTrackerDashboard === 'function') window.updateTrackerDashboard();
    window.showToast("타이머가 시작되었습니다! 푹 자길 🌙");
};

window.stopSleepTimer = function() {
    const start = localStorage.getItem('tosil_sleep_start');
    if(!start) return;
    const end = new Date().getTime();
    const durationMins = Math.floor((end - parseInt(start)) / 60000);
    const sleepType = localStorage.getItem('tosil_sleep_type') || '낮잠'; 
    
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    let record = { id: 'trk_'+now.getTime(), time: timeStr, timestamp: now.getTime(), type: 'sleep', subType: sleepType, amount: durationMins };
    
    let records = JSON.parse(localStorage.getItem('tosil_tracker_records')) || [];
    records.unshift(record);
    if(records.length > 100) records.pop();
    localStorage.setItem('tosil_tracker_records', JSON.stringify(records));
    
    localStorage.removeItem('tosil_sleep_start');
    localStorage.removeItem('tosil_sleep_type'); 
    window.closeTrackerSheet();
    window.updateTrackerDashboard();
};

window.saveTrackerRecord = function() {
    if(!window.trackerState.type) return;

    let records = JSON.parse(localStorage.getItem('tosil_tracker_records')) || [];
    let timeStr = "";
    let timestamp = new Date().getTime();
    const timeInputEl = document.getElementById('v-tracker-time');
    
    if (window.editingTrackerId) {
        const originalRecord = records.find(r => r.id === window.editingTrackerId);
        if (originalRecord) timestamp = originalRecord.timestamp; 
    }

    if(timeInputEl && timeInputEl.value) {
        timeStr = timeInputEl.value; 
        const [hours, minutes] = timeStr.split(':');
        const d = new Date(timestamp); 
        d.setHours(hours); d.setMinutes(minutes); d.setSeconds(0);
        timestamp = d.getTime();
    } else {
        const now = new Date();
        timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    }

    let recordId = window.editingTrackerId ? window.editingTrackerId : 'trk_'+new Date().getTime();
    let record = { id: recordId, time: timeStr, timestamp: timestamp, type: window.trackerState.type };

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
    else if (window.trackerState.type === 'sleep') {
        const amt = document.getElementById('v-sleep-amount');
        if(!amt || !amt.value) return alert('💤 수면 시간(분)을 정확히 입력해주세요!');
        record.amount = parseInt(amt.value);
        if (window.editingTrackerId) {
            const originalRecord = records.find(r => r.id === window.editingTrackerId);
            if (originalRecord) record.subType = originalRecord.subType; 
        } else {
            record.subType = '낮잠'; 
        }
    }

    if (window.editingTrackerId) {
        const idx = records.findIndex(r => r.id === window.editingTrackerId);
        if(idx !== -1) records[idx] = record;
    } else {
        records.push(record);
    }
    
    records.sort((a, b) => b.timestamp - a.timestamp);
    if(records.length > 100) records.pop();
    localStorage.setItem('tosil_tracker_records', JSON.stringify(records));

    window.editingTrackerId = null; 
    window.closeTrackerSheet();
    window.updateTrackerDashboard(); 
};

window.editTrackerRecord = function(id) {
    let records = JSON.parse(localStorage.getItem('tosil_tracker_records')) || [];
    let record = records.find(r => r.id === id);
    if (!record) return;
    
    window.openTrackerSheet(record.type, id); 
};
    
window.deleteTrackerRecord = function(id) {
    showConfirm("이 기록을 정말 삭제하시겠습니까?", async function() {
        let records = JSON.parse(localStorage.getItem('tosil_tracker_records')) || [];
        records = records.filter(r => r.id !== id);
        
        // 👇 파트너님이 걱정하신 그 부분! 여기 안전하게 잘 들어있습니다! 👇
        if (typeof saveTrackerToFirebase === 'function') {
            await saveTrackerToFirebase(records);
            flushTrackerSync(); 
        } else {
            localStorage.setItem('tosil_tracker_records', JSON.stringify(records));
            window.updateTrackerDashboard();
        }
        
        showToast("🗑️ 기록이 깔끔하게 삭제되었습니다!");
    }, "🗑️", "삭제", "#F04452");
};

// 2. 전체 삭제 (모두 싹 지우기) - ✨ 퀄리티업 완료 ✨
window.resetTrackerRecords = function() {
    showConfirm("모든 트래커 기록을 싹 지우시겠습니까?\n(진행 중인 수면 타이머도 리셋됩니다)", async function() {
        
        localStorage.removeItem('tosil_sleep_start');
        localStorage.removeItem('tosil_sleep_type');
        
        if (typeof saveTrackerToFirebase === 'function') {
            await saveTrackerToFirebase([]);
            flushTrackerSync(); 
        } else {
            localStorage.removeItem('tosil_tracker_records');
            window.updateTrackerDashboard();
        }
        
        showToast("🧹 트래커 기록이 싹 비워졌습니다!");
        
    }, "⚠️", "전체 삭제", "#F04452");
};

window.isHistoryView = false;
window.toggleTrackerHistory = function() {
    window.isHistoryView = !window.isHistoryView;
    window.updateTrackerDashboard();
};

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

// 📊 트래커 대시보드 (뱃지 + 알람 끄기 통합)
window.updateTrackerDashboard = function() {
    const container = document.getElementById('tracker-stats-container');
    if(!container) return;

    let records = JSON.parse(localStorage.getItem('tosil_tracker_records')) || [];
    const now = new Date();
    const nowTime = now.getTime(); 
    
    // --- 💡 수면/깨시 카운터 로직 ---
    const lastSleepRecord = records.find(r => r.type === 'sleep'); 
    const sleepStartTime = localStorage.getItem('tosil_sleep_start');
    const isAwake = !sleepStartTime;
    let wakeTimeHtml = "";
    
    if (isAwake) {
        if (lastSleepRecord) {
            const awakeMins = Math.floor((nowTime - Number(lastSleepRecord.timestamp)) / 60000);
            const hours = Math.floor(awakeMins / 60);
            const mins = awakeMins % 60;
            wakeTimeHtml = `<div style="background:#F8F9FA; padding:10px; border-radius:12px; margin-bottom:12px; border:1px solid #E5E8EB; text-align:center;">
                <div style="font-size:12.5px; font-weight:900; color:#3182F6;">⏰ 깨어난 지 ${hours}시간 ${mins}분째</div>
                <div style="font-size:11.5px; font-weight:700; color:#8B95A1; margin-top:4px;">우리 아기만의 졸음 신호를 관찰해 보세요 👀</div>
            </div>`;
        }
    } else {
        const sleepMins = Math.floor((nowTime - Number(sleepStartTime)) / 60000);
        const hours = Math.floor(sleepMins / 60);
        const mins = sleepMins % 60;
        wakeTimeHtml = `<div style="background:#F3F0FF; padding:10px; border-radius:12px; margin-bottom:12px; border:1px solid #D8C6FE; text-align:center;">
            <div style="font-size:12.5px; font-weight:900; color:#6C31F6;">💤 잠든 지 ${hours}시간 ${mins}분째</div>
            <div style="font-size:11.5px; font-weight:700; color:#8B95A1; margin-top:4px;">쉿, 우리 아기가 꿀잠을 자고 있어요 🌙</div>
        </div>`;
    }

    const feedInterval = parseInt(localStorage.getItem('tosil_feed_interval')) || 180;
    const diaperInterval = parseInt(localStorage.getItem('tosil_diaper_interval')) || 180;
    
    // 알림 끈 지 4시간(14400000ms)이 안 지났으면 숨김 처리
    const dismissedFeed = parseInt(localStorage.getItem('tosil_dismiss_alarm_feed')) || 0;
    const dismissedDiaper = parseInt(localStorage.getItem('tosil_dismiss_alarm_diaper')) || 0;
    const isFeedDismissed = (nowTime - dismissedFeed < 14400000);
    const isDiaperDismissed = (nowTime - dismissedDiaper < 14400000);

    const getDiffText = (ts) => {
        if(!ts) return '';
        const mins = Math.floor((nowTime - ts) / 60000);
        return mins >= 60 ? `+ ${Math.floor(mins/60)}시간 ${mins%60}분` : `+ ${mins}분`;
    };

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
                    let icon = r.type==='feed' ? '🍼' : (r.type==='sleep' ? (r.subType==='밤잠' ? '🌙' : '☀️') : '💩');
                    let txt = '';
                    if(r.type === 'feed') txt = `${r.subType} ${r.amount}ml`;
                    else if(r.type === 'sleep') txt = (r.amount === 0) ? `<span style="color:#3182F6">${r.subType || '낮잠'} (자는 중 💤)</span>` : `${r.subType || '낮잠'} ${r.amount}분`; 
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
                            <div style="display:flex; gap:8px;">
                                <button onclick="window.editTrackerRecord('${r.id}')" style="background:none; border:none; font-size:15px; color:#8B95A1; cursor:pointer; padding:0;">✏️</button>
                                <button onclick="window.deleteTrackerRecord('${r.id}')" style="background:none; border:none; font-size:15px; color:#D1D6DB; cursor:pointer; padding:0;">❌</button>
                            </div>
                        </div>
                    `;
                });
            }
            historyHtml += '</div>';
            historyHtml += `<div style="display:flex; gap:8px; margin-top:16px;">
                <button class="btn-main" onclick="window.resetTrackerRecords()" style="flex:1; background:#FFF0F1 !important; color:#F04452 !important; border:1px solid #FFE3E3 !important; box-shadow:none !important; font-size:13px; padding:12px; border-radius:12px; margin:0;">🗑️ 전체 삭제</button>
                <button class="btn-main" onclick="window.toggleTrackerHistory()" style="flex:1; margin:0; font-size:13px; padding:12px; border-radius:12px; box-shadow:none !important;">접기 닫기 〉</button>
            </div>`;
            container.innerHTML = historyHtml;
        }
        return; 
    }

    if(records.length === 0 && !localStorage.getItem('tosil_sleep_start')) {
        container.innerHTML = `<div style="padding:10px 0; text-align:center; font-size:13px; color:var(--text-s); font-weight:700;">아직 기록된 트래커 데이터가 없습니다.</div>`;
        return;
    }

    const todayRecords = records.filter(r => new Date(r.timestamp).getDate() === now.getDate());
    let todayFeedAmt = 0; let todaySleepMins = 0; let todayDiaperCount = 0;
    todayRecords.forEach(r => {
        if(r.type === 'feed') todayFeedAmt += r.amount;
        if(r.type === 'sleep') todaySleepMins += r.amount;
        if(r.type === 'diaper') todayDiaperCount++;
    });

    // ✨ 컬러 뱃지 시스템 도입! ✨
    let fBadge = todayFeedAmt > 0 ? `<span style="background:#E6F7F2; color:#00B37A; padding:2px 6px; border-radius:6px; font-size:10px;">기록중</span>` : '';
    let sBadge = todaySleepMins > 0 ? `<span style="background:#E8F3FF; color:#3182F6; padding:2px 6px; border-radius:6px; font-size:10px;">기록중</span>` : '';
    let dBadge = '';
    if(todayDiaperCount > 0 && todayDiaperCount < 5) dBadge = `<span style="background:#F2F4F6; color:#8B95A1; padding:2px 6px; border-radius:6px; font-size:10px;">부족</span>`;
    else if(todayDiaperCount >= 5 && todayDiaperCount <= 9) dBadge = `<span style="background:#E6F7F2; color:#00B37A; padding:2px 6px; border-radius:6px; font-size:10px;">적정</span>`;
    else if(todayDiaperCount > 9) dBadge = `<span style="background:#FFF4ED; color:#FF823A; padding:2px 6px; border-radius:6px; font-size:10px;">많음</span>`;

    let briefing = "오늘도 평화로운 육아팅! 🤍";
    if (todayFeedAmt > 0) briefing = `오늘 총 ${todayFeedAmt}ml 먹었어요! 튼튼해지는 중 💪`;
    if (todaySleepMins > 120) briefing = `오늘 수면 ${Math.floor(todaySleepMins/60)}시간 돌파! 꿀잠 요정 🌙`;
    if (todayDiaperCount >= 5) briefing = `오늘 기저귀를 ${todayDiaperCount}번 갈았어요! 보송보송 엉덩이 ✨`;

    let htmlStr = wakeTimeHtml + `<div style="text-align:center; font-size:13px; font-weight:800; color:var(--text-m); margin-bottom:14px; background:rgba(49,130,246,0.05); padding:8px; border-radius:12px;">${briefing}</div>`;

    htmlStr += `<div style="display:flex; gap:8px; margin-bottom:12px;">
        <div style="flex:1; background:#F8F9FA; padding:10px; border-radius:12px; text-align:center;">
            <div style="font-size:11px; color:#8B95A1; font-weight:800; margin-bottom:4px; display:flex; justify-content:center; align-items:center; gap:4px;">오늘 수유 ${fBadge}</div>
            <div style="font-size:14px; font-weight:900; color:#3182F6;">${todayFeedAmt}ml</div>
        </div>
        <div style="flex:1; background:#F8F9FA; padding:10px; border-radius:12px; text-align:center;">
            <div style="font-size:11px; color:#8B95A1; font-weight:800; margin-bottom:4px; display:flex; justify-content:center; align-items:center; gap:4px;">오늘 수면 ${sBadge}</div>
            <div style="font-size:14px; font-weight:900; color:#A855F7;">${Math.floor(todaySleepMins/60)}h ${todaySleepMins%60}m</div>
        </div>
        <div style="flex:1; background:#F8F9FA; padding:10px; border-radius:12px; text-align:center;">
            <div style="font-size:11px; color:#8B95A1; font-weight:800; margin-bottom:4px; display:flex; justify-content:center; align-items:center; gap:4px;">기저귀 ${dBadge}</div>
            <div style="font-size:14px; font-weight:900; color:#F04452;">${todayDiaperCount}회</div>
        </div>
    </div>`;

    const latestFeed = records.find(r => r.type === 'feed');
    const latestDiaper = records.find(r => r.type === 'diaper');
    let feedAlarmHtml = ''; let diaperAlarmHtml = '';

    if(latestFeed && !isFeedDismissed) {
        const diffMins = Math.floor((nowTime - latestFeed.timestamp) / 60000);
        if(diffMins >= feedInterval) {
            feedAlarmHtml = `<div style="position:relative; background:#FFF0F1; border:1px solid #FFE3E3; padding:10px 14px; border-radius:12px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; animation:pulseSOS 2s infinite;">
                <span style="font-size:13px; font-weight:800; color:#D32F2F;">🚨 맘마 먹은지 ${Math.floor(diffMins/60)}시간 경과!</span>
                <div style="display:flex; gap:6px;">
                    <button onclick="window.openTrackerSheet('feed')" style="background:#F04452; color:#FFF; border:none; padding:6px 10px; border-radius:8px; font-size:11px; font-weight:800; cursor:pointer;">기록</button>
                    <button onclick="window.dismissTrackerAlarm('feed')" style="background:transparent; color:#F04452; border:none; padding:4px; font-size:14px; font-weight:900; cursor:pointer;" title="알람 끄기">✕</button>
                </div>
            </div>`;
        }
    }
    
    if(latestDiaper && !isDiaperDismissed) {
        const diffMins = Math.floor((nowTime - latestDiaper.timestamp) / 60000);
        if(diffMins >= diaperInterval) {
            diaperAlarmHtml = `<div style="position:relative; background:#F8F9FA; border:1px solid #E5E8EB; padding:10px 14px; border-radius:12px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:13px; font-weight:800; color:#4E5968;">🚨 기저귀 확인한 지 ${Math.floor(diffMins/60)}시간 경과!</span>
                <div style="display:flex; gap:6px;">
                    <button onclick="window.openTrackerSheet('diaper')" style="background:#4E5968; color:#FFF; border:none; padding:6px 10px; border-radius:8px; font-size:11px; font-weight:800; cursor:pointer;">기록</button>
                    <button onclick="window.dismissTrackerAlarm('diaper')" style="background:transparent; color:#8B95A1; border:none; padding:4px; font-size:14px; font-weight:900; cursor:pointer;" title="알람 끄기">✕</button>
                </div>
            </div>`;
        }
    }

    if (feedAlarmHtml || diaperAlarmHtml) {
        htmlStr += feedAlarmHtml + diaperAlarmHtml;
    } else {
        const recent = records[0];
        if(recent) {
            let icon = recent.type==='feed' ? '🍼' : (recent.type==='sleep' ? (recent.subType==='밤잠' ? '🌙' : '☀️') : '💩');
            let txt = '';
            if(recent.type === 'feed') txt = `${recent.subType} ${recent.amount}ml`;
            else if(recent.type === 'sleep') txt = (recent.amount === 0) ? `<span style="color:#3182F6">${recent.subType || '낮잠'} (자는 중 💤)</span>` : `${recent.subType || '낮잠'} ${recent.amount}분`; 
            else if(recent.type === 'diaper') txt = recent.status ? `${recent.subType} / ${recent.status}` : `${recent.subType}`;
            
            htmlStr += `<div style="text-align:center; padding:10px; background:#F8F9FA; border-radius:12px; border:1px dashed #E5E8EB; font-size:12.5px; font-weight:800; color:var(--text-s);">최근 기록: ${icon} ${txt} (${getDiffText(recent.timestamp)})</div>`;
        }
    }

    const sleepStart = localStorage.getItem('tosil_sleep_start');
    if (sleepStart) {
        const sleepType = localStorage.getItem('tosil_sleep_type') || '낮잠';
        const sleepEmoji = sleepType === '낮잠' ? '☀️' : '🌙';
        const sleepColor = sleepType === '낮잠' ? '#F59E0B' : '#A855F7';
        const sleepBg = sleepType === '낮잠' ? '#FEF3C7' : '#F3E8FF';
        
        const diffMins = Math.floor((nowTime - parseInt(sleepStart)) / 60000);
        htmlStr += `<div style="margin-top:8px; display:flex; align-items:center; justify-content:space-between; background:${sleepBg}; padding:10px 14px; border-radius:12px;"><div style="display:flex; align-items:center; gap:8px;"><span style="font-size:16px;">${sleepEmoji}</span><div><div style="font-size:11px; color:${sleepColor}; font-weight:800;">${sleepType} 자는 중</div><div style="font-size:13px; font-weight:900; color:#191F28;">현재 ${diffMins}분 째</div></div></div><button onclick="window.openTrackerSheet('sleep')" style="background:${sleepColor}; color:#FFF; border:none; padding:6px 12px; border-radius:8px; font-weight:800; font-size:12px; cursor:pointer;">종료하기</button></div>`;
    }

    container.innerHTML = htmlStr;
};

// ==========================================
// 💌 부부 소통: 육아문답 작성 상태 감지 엔진 (감성 100% 복구 버전)
// ==========================================
window.updateDiaryCard = function() {
    const card = document.getElementById('home-diary-card');
    if(!card) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const lastWrittenDate = localStorage.getItem('diary_last_written');
    const isWrittenToday = (lastWrittenDate === todayStr);

    if (isWrittenToday) {
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;" onclick="window.location.href='diary.html'">
                <div>
                    <h3 class="diary-card-title" style="margin: 0 0 6px 0;"><span style="font-size: 1.3rem;">💌</span> 육아 문답</h3>
                    <p class="diary-card-desc" style="margin: 0; color: #F04452; font-weight: 800;">오늘 문답 작성 완료! 🤍</p>
                </div>
                <div class="diary-card-btn" style="margin: 0; background: #FFF0F1; color: #F04452; box-shadow: none;">내 답변 보기 ❯</div>
            </div>
            
            <!-- 👇 딱 이 부분만 예쁘게 다듬었습니다! (gap 추가, 텍스트 줄바꿈, 버튼 찌그러짐 방지) -->
            <div style="margin-top: 16px; padding-top: 14px; border-top: 1px dashed rgba(240, 68, 82, 0.2); display: flex; justify-content: space-between; align-items: center; gap: 10px;">
                <div style="font-size: 12.5px; font-weight: 800; color: #D32F2F; opacity: 0.85; line-height: 1.4; word-break: keep-all;">
                    오늘 하루 어땠어?<br>대답 기다릴게 💌"
                </div>
                <button onclick="window.pokePartner(); event.stopPropagation();" style="background: #FEE500; color: #191F28; border: none; padding: 10px 14px; border-radius: 10px; font-size: 12px; font-weight: 900; cursor: pointer; box-shadow: 0 2px 8px rgba(254, 229, 0, 0.2); transition: 0.2s; white-space: nowrap; flex-shrink: 0;">
                    👉 찌르기
                </button>
            </div>
        `;
    } else {
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;" onclick="window.location.href='diary.html'">
                <div>
                    <h3 class="diary-card-title" style="margin: 0 0 6px 0;"><span style="font-size: 1.3rem;">💌</span> 육아 문답</h3>
                    <p class="diary-card-desc" style="margin: 0;">하루 한 줄, 오늘 우리 아기와의 기억</p>
                </div>
                <div class="diary-card-btn" style="margin: 0;">기록하기 ❯</div>
            </div>
        `;
    }
};

window.pokePartner = function() {
    const text = "[육아메이트] 오늘 하루도 정말 고생 많았어 🤍 육아 문답에 내 마음을 남겨뒀으니 얼른 와서 확인해봐!";
    const url = "https://happy-baby0303.github.io/"; 
    if (navigator.share) {
        navigator.share({ title: '육아메이트의 따뜻한 초대', text: text, url: url }).catch(() => {});
    } else {
        prompt("아래 텍스트를 복사해서 카톡으로 보내주세요!", text + " " + url);
    }
};

document.addEventListener("DOMContentLoaded", () => {
    if(typeof window.updateDiaryCard === 'function') window.updateDiaryCard();
});
setInterval(() => {
    if(typeof window.updateDiaryCard === 'function') window.updateDiaryCard();
}, 5000);

// ==========================================
// 🚀 런타임 구동 마스터 마운트 (이부분이 날아갔었음)
// ==========================================
window.onload = () => { 
    loadAllExternalData(); 
    renderBabyInfo(); 
    loadBabyPhoto(); 
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
// 🌤️ [감성 엔진] 시간대별 인사말 & 새벽 이스터에그 통합판
// ==========================================
window.applyTimeBasedGreeting = function(babyName) {
    const currentHour = new Date().getHours();
    const greetingEl = document.getElementById('ai-time-greeting');
    const subEl = document.getElementById('ai-time-sub');
    
    // 1. 🌙 새벽 이스터에그
    if (currentHour >= 2 && currentHour <= 5) {
        const easterEgg = document.getElementById('easter-egg-layer');
        if (easterEgg) {
            easterEgg.style.display = 'flex';
            ['res-baby-dday', 'res-baby-name', 'daily-message'].forEach(id => {
                const el = document.getElementById(id);
                if(el) el.style.display = 'none';
            });
        }
        return; 
    }

    // 2. ☀️ 평상시 시간대별 인사말 (토스 스타일의 큰 헤더)
    if (greetingEl) {
        let title = ""; let sub = "";
        
        if (currentHour >= 6 && currentHour < 11) {
            title = `상쾌한 아침이에요 ☀️`; sub = `간밤에 ${babyName}는 푹 잤나요?`;
        } else if (currentHour >= 11 && currentHour < 17) {
            title = `활기찬 오후네요 🌤️`; sub = `육아 틈틈이 커피 한 잔의 여유를!`;
        } else if (currentHour >= 17 && currentHour < 22) {
            title = `고생 많은 저녁이에요 🌙`; sub = `오늘 하루도 ${babyName} 돌보느라 수고하셨어요 🤍`;
        } else {
            title = `새벽에도 깨어계시군요 🦉`; sub = `늦은 시간까지 아기 곁을 지키는 당신이 최고예요 👍`;
        }
        
        greetingEl.innerText = title;
        if(subEl) subEl.innerText = sub;
    }
};

// ==========================================
// 🚀 앱 자동화 엔진 (새로고침 및 실시간 갱신)
// ==========================================

// 1. 앱 켜지자마자 대시보드 강제 렌더링 (새로고침 시 빈 화면 방지)
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if(window.updateTrackerDashboard) window.updateTrackerDashboard();
        
        // 👇 이 줄을 추가해야 앱이 켜질 때 체크리스트가 화면에 그려집니다!
        if(window.renderRoutineChecklist) window.renderRoutineChecklist(); 
        
    }, 100);
});

// 2. 1분(60,000ms)마다 깨시 타이머 자동 갱신
setInterval(() => {
    // 히스토리(통계) 창을 보고 있지 않을 때만 배경에서 알아서 UI 업데이트
    if(!window.isHistoryView && window.updateTrackerDashboard) {
        window.updateTrackerDashboard();
    }
}, 60000);

// ==========================================
// 💊 데일리 케어 (좌측 정렬 디자인 + 커스텀 설정)
// ==========================================

window.renderRoutineChecklist = function() {
    const container = document.getElementById('routine-checklist-container');
    if(!container) return;

    const todayStr = new Date().toLocaleDateString();
    let savedDate = localStorage.getItem('tosil_routine_date');
    let routineData = JSON.parse(localStorage.getItem('tosil_routine_data')) || { probiotics: false, vitaminD: false, nail: false };
    
    // 유저가 설정한 이름 불러오기 (없으면 기본값)
    let routineNames = JSON.parse(localStorage.getItem('tosil_routine_names')) || ['유산균', '비타민D', '손톱'];

    if (savedDate !== todayStr) {
        routineData = { probiotics: false, vitaminD: false, nail: false };
        localStorage.setItem('tosil_routine_data', JSON.stringify(routineData));
        localStorage.setItem('tosil_routine_date', todayStr);
    }

    const createBtn = (id, label) => {
        const isChecked = routineData[id];
        // 💡 CSS 변수를 활용해 다크모드/라이트모드 자동 대응
        const bg = isChecked ? '#3182F6' : 'var(--bg-sub)';
        const color = isChecked ? '#FFF' : 'var(--text-s)';
        const border = isChecked ? '1px solid #3182F6' : '1px solid var(--border)';
        const shadow = isChecked ? '0 4px 10px rgba(49,130,246,0.2)' : 'none';

        return `<button onclick="window.toggleRoutine('${id}')" style="flex:1; padding:16px 0; border-radius:16px; background:${bg}; color:${color}; font-size:13.5px; font-weight:800; border:${border}; box-shadow:${shadow}; cursor:pointer; transition:all 0.2s ease-in-out; outline:none; margin:0; word-break:keep-all;">
                    ${label}
                </button>`;
    };

    // 💡 제목은 밖으로 빼서 왼쪽 정렬 (육아 트래커랑 똑같이!)
    container.innerHTML = `
        <div style="font-size: 15px; font-weight: 900; color: var(--text-m); margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; padding: 0 4px;">
            <div style="display:flex; align-items:center; gap:6px;">
                <span>✅ 데일리 케어 루틴</span>
                <span onclick="window.openRoutineSettings()" style="font-size:14px; cursor:pointer;" title="항목 설정">⚙️</span>
            </div>
        </div>
        <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: 20px; padding: 18px; margin-bottom: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
            <div style="display: flex; gap: 8px; justify-content: center;">
                ${createBtn('probiotics', routineNames[0])}
                ${createBtn('vitaminD', routineNames[1])}
                ${createBtn('nail', routineNames[2])}
            </div>
        </div>
    `;
};

// ⚙️ 데일리 케어 설정창(모달) 열고 닫고 저장하기 로직
window.openRoutineSettings = function() {
    let names = JSON.parse(localStorage.getItem('tosil_routine_names')) || ['유산균', '비타민D', '손톱'];
    document.getElementById('set-routine-1').value = names[0];
    document.getElementById('set-routine-2').value = names[1];
    document.getElementById('set-routine-3').value = names[2];
    document.getElementById('routine-settings-modal').style.display = 'flex';
};

window.closeRoutineSettingsForce = function() {
    document.getElementById('routine-settings-modal').style.display = 'none';
};

window.closeRoutineSettings = function(e) {
    if(e.target.id === 'routine-settings-modal') window.closeRoutineSettingsForce();
};

window.saveRoutineSettings = function() {
    const n1 = document.getElementById('set-routine-1').value || '항목1';
    const n2 = document.getElementById('set-routine-2').value || '항목2';
    const n3 = document.getElementById('set-routine-3').value || '항목3';
    const newNames = [n1, n2, n3];
    
    localStorage.setItem('tosil_routine_names', JSON.stringify(newNames));
    
    // 서버 연동(부부 공유)
    let routineData = JSON.parse(localStorage.getItem('tosil_routine_data')) || {};
    if (typeof db !== 'undefined' && typeof setDoc === 'function') {
        const syncCode = localStorage.getItem("family_sync_code") || "unlinked_local_diary";
        setDoc(doc(db, "routine_" + syncCode, "status"), { 
            data: routineData, 
            date: new Date().toLocaleDateString(),
            names: newNames // 커스텀 이름도 파이어베이스로 보냄!
        }).catch(e=>{});
    }

    window.closeRoutineSettingsForce();
    window.renderRoutineChecklist();
};

// 👆 체크버튼 누를 때 파이어베이스로 이름도 같이 보내도록 업데이트
window.toggleRoutine = async function(id) {
    let routineData = JSON.parse(localStorage.getItem('tosil_routine_data')) || {};
    routineData[id] = !routineData[id];
    let routineNames = JSON.parse(localStorage.getItem('tosil_routine_names')) || ['유산균', '비타민D', '손톱'];
    
    if (typeof db !== 'undefined' && typeof setDoc === 'function') {
        const syncCode = localStorage.getItem("family_sync_code") || "unlinked_local_diary";
        try { 
            await setDoc(doc(db, "routine_" + syncCode, "status"), { 
                data: routineData, 
                date: new Date().toLocaleDateString(),
                names: routineNames // 항목 이름도 같이 동기화
            }); 
        } catch(e) {}
    }

    localStorage.setItem('tosil_routine_data', JSON.stringify(routineData));
    window.renderRoutineChecklist();
};

// ==========================================
// 🚀 [출시용] 트래커 & 비타민 실시간 연동 패치 (백그라운드 동기화 꼼수 적용!)
// ==========================================

let trackerNeedSync = false; // 전송 대기 깃발
let trackerIdleTimer = null; // 1분 안전 타이머

// 1️⃣    트래커 화면 즉시 갱신 & 전송 대기열 등록 (체감속도 0.1초)
async function saveTrackerToFirebase(records) {
    localStorage.setItem('tosil_tracker_records', JSON.stringify(records));
    if(typeof window.updateTrackerDashboard === 'function') window.updateTrackerDashboard();

    trackerNeedSync = true; //"파이어베이스로 보낼 거 생겼음!" 깃발 꽂기

    // (안전장치) 앱을 안 끄고 1분 동안 가만히 켜두면 한 번 쏴줍니다.
    if (trackerIdleTimer) clearTimeout(trackerIdleTimer);
    trackerIdleTimer = setTimeout(() => {
        flushTrackerSync();
    }, 60000); 
}

// 2️⃣      실제 파이어베이스 전송 (배달부)
async function flushTrackerSync() {
    if (!trackerNeedSync) return; // 보낼 거 없으면 퇴근

    let records = JSON.parse(localStorage.getItem('tosil_tracker_records')) || [];
    if (typeof db !== 'undefined' && typeof setDoc === 'function') {
        const syncCode = localStorage.getItem("family_sync_code") || "unlinked_local_diary";
        try { 
            await setDoc(doc(db, "tracker_" + syncCode, "status"), { records: records }); 
            trackerNeedSync = false; // 전송 성공했으니 깃발 내림
        } catch (e) { 
            console.error("트래커 클라우드 저장 실패", e); 
        }
    }
}

// 3️⃣ 🚨 대망의 핵심 꼼수 (화면 꺼짐 / 앱 전환 감지기)
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === 'hidden') {
        flushTrackerSync(); // 숨겨지는 순간 0.1초 만에 파이어베이스로 슛!
    }
});

// ==========================================
// 4️⃣    트래커 기존 함수들을 '연동형'으로 업그레이드
// ==========================================
window.stopSleepTimer = async function() {
    const start = localStorage.getItem('tosil_sleep_start');
    if(!start) return;
    const end = new Date().getTime();
    const durationMins = Math.floor((end - parseInt(start)) / 60000);
    const sleepType = localStorage.getItem('tosil_sleep_type') || '낮잠'; 
    
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    let record = { id: 'trk_'+now.getTime(), time: timeStr, timestamp: now.getTime(), type: 'sleep', subType: sleepType, amount: durationMins };
    
    let records = JSON.parse(localStorage.getItem('tosil_tracker_records')) || [];
    records.unshift(record);
    if(records.length > 100) records.pop();
    
    // ✨ 클라우드(파이어베이스) 연동 및 화면 자동 갱신
    if (typeof saveTrackerToFirebase === 'function') {
        await saveTrackerToFirebase(records);
    } else {
        localStorage.setItem('tosil_tracker_records', JSON.stringify(records));
        if (typeof window.updateTrackerDashboard === 'function') window.updateTrackerDashboard();
    }
    
    localStorage.removeItem('tosil_sleep_start');
    localStorage.removeItem('tosil_sleep_type'); 
    window.closeTrackerSheet();
    window.showToast(`✅ ${durationMins}분 동안 푹 자고 일어났어요!`);
};

// 💾 트래커 기록 저장 함수 (낮잠/밤잠 선택 및 토스트 팝업 완벽 패치)
window.saveTrackerRecord = async function() {
    if(!window.trackerState.type) return;

    let records = JSON.parse(localStorage.getItem('tosil_tracker_records')) || [];
    let timeStr = "";
    let timestamp = new Date().getTime();
    const timeInputEl = document.getElementById('v-tracker-time');
    
    if (window.editingTrackerId) {
        const originalRecord = records.find(r => r.id === window.editingTrackerId);
        if (originalRecord) timestamp = originalRecord.timestamp; 
    }

    if(timeInputEl && timeInputEl.value) {
        timeStr = timeInputEl.value; 
        const [hours, minutes] = timeStr.split(':');
        const d = new Date(timestamp); 
        d.setHours(hours); d.setMinutes(minutes); d.setSeconds(0);
        timestamp = d.getTime();
    } else {
        const now = new Date();
        timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    }

    let recordId = window.editingTrackerId ? window.editingTrackerId : 'trk_'+new Date().getTime();
    let record = { id: recordId, time: timeStr, timestamp: timestamp, type: window.trackerState.type };

    if (window.trackerState.type === 'feed') {
        if(!window.trackerState.subType) return window.showToast('⚠️ 분유, 모유, 유축 중 하나를 선택해주세요!');
        const amt = document.getElementById('v-feed-amount').value;
        if(!amt) return window.showToast('⚠️ 먹은 양(ml)을 입력해주세요!');
        record.subType = window.trackerState.subType;
        record.amount = parseInt(amt);
    } 
    else if (window.trackerState.type === 'diaper') {
        if(!window.trackerState.subType) return window.showToast('⚠️ 소변인지 대변인지 선택해주세요!');
        record.subType = window.trackerState.subType;
        record.status = (window.trackerState.subType === '소변') ? '' : (window.trackerState.status || '');
    }
    // 👇 여기서부터 덮어쓰기! (빈칸을 허용하고 0으로 알아서 바꿔주는 마법)
    else if (window.trackerState.type === 'sleep') {
        const amt = document.getElementById('v-sleep-amount');
        
        // ✨ 핵심: 빈칸이거나 입력이 없으면 0으로 처리 (자는 중)
        let sleepAmount = 0;
        if (amt && amt.value !== '') {
            sleepAmount = parseInt(amt.value);
        }
        record.amount = sleepAmount;
        
        if (window.editingTrackerId) {
            const originalRecord = records.find(r => r.id === window.editingTrackerId);
            if (originalRecord) record.subType = originalRecord.subType; 
        } else {
            record.subType = window.trackerState.subType || '낮잠'; 
        }
    }

    if (window.editingTrackerId) {
        const idx = records.findIndex(r => r.id === window.editingTrackerId);
        if(idx !== -1) records[idx] = record;
    } else {
        records.push(record);
    }
    
    records.sort((a, b) => b.timestamp - a.timestamp);
    if(records.length > 100) records.pop();
    
    if (typeof saveTrackerToFirebase === 'function') {
        await saveTrackerToFirebase(records);
    } else {
        localStorage.setItem('tosil_tracker_records', JSON.stringify(records));
        if(typeof window.updateTrackerDashboard === 'function') window.updateTrackerDashboard();
    }

    if (window.checkReceiptVisibility) window.checkReceiptVisibility();

    window.editingTrackerId = null; 
    window.closeTrackerSheet();
    window.showToast("💾 기록이 저장되었습니다!");
};

// ==========================================
// 5️⃣    비타민 체크리스트  !!  '실시간 연동형'
// ==========================================
window.toggleRoutine = async function(id) {
    let routineData = JSON.parse(localStorage.getItem('tosil_routine_data')) || {};
    routineData[id] = !routineData[id];
    
    if (typeof db !== 'undefined' && typeof setDoc === 'function') {
        const syncCode = localStorage.getItem("family_sync_code") || "unlinked_local_diary";
        try { 
            await setDoc(doc(db, "routine_" + syncCode, "status"), { 
                data: routineData, 
                date: new Date().toLocaleDateString() 
            }); 
        } catch(e) {}
    }

    localStorage.setItem('tosil_routine_data', JSON.stringify(routineData));
    window.renderRoutineChecklist();
};

// ==========================================
// 6️⃣  파이어베이스 실시간 수신 리스너 (트래커 & 비타민)
// ==========================================
let trackerUnsubscribe = null;
let routineUnsubscribe = null;

window.startTrackerRealtimeSync = function() {
    const syncCode = localStorage.getItem("family_sync_code") || "unlinked_local_diary";
    const docRef = typeof doc !== 'undefined' && typeof window.db !== 'undefined' ? doc(window.db, "tracker_" + syncCode, "status") : null;
    if(!docRef) return; 
    if (trackerUnsubscribe) trackerUnsubscribe();
    if(typeof window.onSnapshot !== 'function') return;

    trackerUnsubscribe = window.onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            localStorage.setItem('tosil_tracker_records', JSON.stringify(data.records || []));
        }
        
        // 🚨 [수정 1] 앞에 window. 를 붙여야 다른 폰에서 화면(대시보드)이 즉시 갱신됩니다!
        if (typeof window.updateTrackerDashboard === 'function') window.updateTrackerDashboard();
        
        // 🎁 [수정 2 - 보너스] 남편분이 3번째 기록을 쓰면, 아내분 폰에도 영수증 버튼이 바로 '짠!' 하고 뜨게 만듭니다.
        if (typeof window.checkReceiptVisibility === 'function') window.checkReceiptVisibility();
    });
};

window.startRoutineRealtimeSync = function() {
    const syncCode = localStorage.getItem("family_sync_code") || "unlinked_local_diary";
    const docRef = typeof doc !== 'undefined' && typeof window.db !== 'undefined' ? doc(window.db, "routine_" + syncCode, "status") : null;
    if(!docRef) return; 
    if (routineUnsubscribe) routineUnsubscribe();
    if(typeof window.onSnapshot !== 'function') return;

    routineUnsubscribe = window.onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const dbData = docSnap.data();
            const todayStr = new Date().toLocaleDateString();
            if (dbData.date === todayStr) {
                localStorage.setItem('tosil_routine_data', JSON.stringify(dbData.data || {}));
                localStorage.setItem('tosil_routine_date', todayStr);
            }
            // 💡 추가된 핵심 로직: 서버에 커스텀 이름이 있으면 내 폰에도 적용!
            if (dbData.names) {
                localStorage.setItem('tosil_routine_names', JSON.stringify(dbData.names));
            }
        }
        if (typeof renderRoutineChecklist === 'function') renderRoutineChecklist();
    });
};

// ==========================================
// 🚀 [최종 통합] 모든 실시간 감시 엔진 일괄 가동 스위치
// ==========================================
window.initRealtimeSync = () => {
    if (typeof startFeverRealtimeSync === 'function') startFeverRealtimeSync();
    if (typeof startCubeRealtimeSync === 'function') startCubeRealtimeSync();
    if (typeof startBatonRealtimeSync === 'function') startBatonRealtimeSync();
    if (typeof startLedgerRealtimeSync === 'function') startLedgerRealtimeSync();
    
    if (typeof startTrackerRealtimeSync === 'function') startTrackerRealtimeSync();
    if (typeof startRoutineRealtimeSync === 'function') startRoutineRealtimeSync();
};

// 앱 로딩 시 리스너 수동 실행 방어 코드
document.addEventListener("DOMContentLoaded", () => {
    if (localStorage.getItem("family_sync_code")) {
        window.initRealtimeSync();
    }
});

// ==========================================
// 🚨 영유아 응급처치(CPR/하임리히) 모달 제어 (실전용 업데이트)
// ==========================================
window.openEmergencyModal = function(type) {
    const header = document.getElementById('em-header');
    const content = document.getElementById('em-content');
    
    if (type === 'heimlich') {
        header.innerHTML = `
            <div style="font-size: 19px; font-weight: 900; color: var(--danger); margin-bottom: 6px; margin-top: 10px;">영아 하임리히법 (1세 미만)</div>
            <div style="font-size: 13.5px; font-weight: 700; color: var(--text-s);">이물질로 인해 숨을 쉬지 못할 때 즉시 실시!</div>
        `;
        content.innerHTML = `
            <!-- 🚨 최우선 행동 지침 -->
            <div style="background:var(--danger); color:#FFF; padding:12px; border-radius:12px; font-weight:900; font-size:14px; text-align:center; margin-bottom:16px; box-shadow: 0 4px 12px rgba(240,68,82,0.3); animation: pulseSOS 1.5s infinite;">
                📞 119에 신고하고 "스피커폰"을 켜세요!
            </div>
            
            <div class="box-sub" style="padding: 16px; border-radius: 16px; border-left: 4px solid var(--danger); margin-bottom: 8px;">
                <div style="font-size: 14.5px; font-weight: 900; color: var(--text-m); margin-bottom: 6px;">1️⃣ 등 압박 5회</div>
                <div style="font-size: 13.5px; color: var(--text-s); line-height: 1.5; word-break: keep-all;">아기 얼굴을 아래로 향하게 엎드려 눕힌 후, 양쪽 날개뼈 사이를 <b>강하고 빠르게 5회</b> 두드립니다.</div>
            </div>
            <div class="box-sub" style="padding: 16px; border-radius: 16px; border-left: 4px solid var(--danger); margin-bottom: 8px;">
                <div style="font-size: 14.5px; font-weight: 900; color: var(--text-m); margin-bottom: 6px;">2️⃣ 가슴 압박 5회</div>
                <div style="font-size: 13.5px; color: var(--text-s); line-height: 1.5; word-break: keep-all;">아기를 앞으로 돌려 눕히고, 양 젖꼭지 정중앙 바로 아래를 <b>두 손가락으로 5회</b> 강하게 누릅니다.</div>
            </div>
            
            <div class="box-tint-red" style="padding: 14px; border-radius: 16px; text-align:center; margin-bottom: 16px;">
                <div style="font-size: 13.5px; font-weight: 800; color: var(--danger);">이물질이 나올 때까지 1, 2번 무한 반복!</div>
            </div>

            <!-- 🎥 평소 학습용 유튜브 링크 -->
            <a href="https://www.youtube.com/results?search_query=영아+하임리히법+소방청" target="_blank" style="display:flex; align-items:center; justify-content:center; gap:8px; background:#FF0000; color:#FFF; padding:14px; border-radius:12px; font-weight:900; font-size:14px; text-decoration:none;">
                <span>▶️</span> 1분 영상으로 정확한 자세 보기
            </a>
        `;
    } else if (type === 'cpr') {
        header.innerHTML = `
            <div style="font-size: 19px; font-weight: 900; color: var(--primary); margin-bottom: 6px; margin-top: 10px;">영아 심폐소생술 (1세 미만)</div>
            <div style="font-size: 13.5px; font-weight: 700; color: var(--text-s);">의식과 호흡이 없을 때 즉시 실시!</div>
        `;
        content.innerHTML = `
            <!-- 🚨 최우선 행동 지침 -->
            <div style="background:var(--primary); color:#FFF; padding:12px; border-radius:12px; font-weight:900; font-size:14px; text-align:center; margin-bottom:16px; box-shadow: 0 4px 12px rgba(49,130,246,0.3); animation: pulseSOS 1.5s infinite;">
                📞 119에 신고하고 "스피커폰"을 켜세요!
            </div>
            
            <div class="box-sub" style="padding: 16px; border-radius: 16px; border-left: 4px solid var(--primary); margin-bottom: 8px;">
                <div style="font-size: 14.5px; font-weight: 900; color: var(--text-m); margin-bottom: 6px;">1️⃣ 의식 확인 (발바닥 때리기)</div>
                <div style="font-size: 13.5px; color: var(--text-s); line-height: 1.5; word-break: keep-all;">아기 <b>발바닥</b>을 때리며 반응 확인. 반응이 없으면 주변에 AED(자동심장충격기)를 요청하세요.</div>
            </div>
            <div class="box-sub" style="padding: 16px; border-radius: 16px; border-left: 4px solid var(--primary); margin-bottom: 8px;">
                <div style="font-size: 14.5px; font-weight: 900; color: var(--text-m); margin-bottom: 6px;">2️⃣ 가슴 압박 30회</div>
                <div style="font-size: 13.5px; color: var(--text-s); line-height: 1.5; word-break: keep-all;">양 젖꼭지 정중앙 <b>바로 아래쪽</b>을 두 손가락으로 <b>4cm 깊이로 빠르고 강하게 30회</b> 누릅니다.</div>
            </div>
            <div class="box-sub" style="padding: 16px; border-radius: 16px; border-left: 4px solid var(--primary); margin-bottom: 16px;">
                <div style="font-size: 14.5px; font-weight: 900; color: var(--text-m); margin-bottom: 6px;">3️⃣ 인공호흡 2회</div>
                <div style="font-size: 13.5px; color: var(--text-s); line-height: 1.5; word-break: keep-all;">아기의 <b>입과 코를 한 번에 덮고</b> 가슴이 부풀어 오를 정도로 1초씩 2회 숨을 불어넣습니다.</div>
            </div>

            <!-- 🎥 평소 학습용 유튜브 링크 -->
            <a href="https://www.youtube.com/results?search_query=영아+심폐소생술+소방청" target="_blank" style="display:flex; align-items:center; justify-content:center; gap:8px; background:#FF0000; color:#FFF; padding:14px; border-radius:12px; font-weight:900; font-size:14px; text-decoration:none;">
                <span>▶️</span> 1분 영상으로 정확한 자세 보기
            </a>
        `;
    }
    
    document.getElementById('emergency-modal').style.display = 'flex';
}

window.closeEmergencyModalForce = function() { document.getElementById('emergency-modal').style.display = 'none'; };
window.closeEmergencyModal = function(e) { if(e.target.id === 'emergency-modal') window.closeEmergencyModalForce(); };

// ==========================================
// 🧾 영수증 띄우기 (데이터 0 방어 + 외부 파일 랜덤 연동 완료!)
// ==========================================
window.openReceiptModal = function() {
    const today = new Date();
    document.getElementById('receipt-date').innerText = `${today.getFullYear()}. ${today.getMonth()+1}. ${today.getDate()}`;
    
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    let records = JSON.parse(localStorage.getItem('tosil_tracker_records')) || [];

    let totalMilk = 0;
    let totalPoop = 0;
    let totalSleepMins = 0;

 // [이 부분만 수정하세요!]
records.forEach(record => {
    if (record.timestamp >= startOfToday) {
        if (record.type === 'feed' && record.amount) {
            totalMilk += parseInt(record.amount);
        } 
        // 🚨 [수정!] === 대신 .includes()를 써서 "대변" 글자가 들어있으면 다 찾게 합니다.
        else if (record.type === 'diaper' && record.subType && record.subType.includes('대변')) {
            totalPoop += 1;
        } 
        else if (record.type === 'sleep' && record.amount) {
            totalSleepMins += parseInt(record.amount);
        }
    }
});

    let totalSleepHours = (totalSleepMins / 60).toFixed(1); 
    if (totalSleepHours.endsWith('.0')) totalSleepHours = parseInt(totalSleepHours);

    document.getElementById('receipt-milk').innerText = `${totalMilk} ml`;
    document.getElementById('receipt-poop').innerText = `${totalPoop} 회`;
    document.getElementById('receipt-sleep').innerText = `${totalSleepHours} 시간`;

    // 2. 랜덤 뽑기 함수 (receiptData 창고에서 무작위로 하나 꺼내기)
    const pickRandom = (array) => array[Math.floor(Math.random() * array.length)];

    let diaryText = "";
    
    // 3. 🚨 기록이 0일 때는 안내 멘트!
    if (totalMilk === 0 && totalPoop === 0 && totalSleepMins === 0) {
        diaryText = "아직 오늘 기록된 데이터가 없어요! 😅\n우리아기가 오늘 얼마나 먹고 잤는지 트래커에 먼저 기록해 주세요 ✍️🤍";
    } else {
        // 4. 🚨 기록이 있으면 receiptData 창고에서 랜덤으로 쏙쏙 뽑아오기!
        diaryText += pickRandom(receiptData.intro); // 오프닝

        if (totalSleepHours >= 3) diaryText += pickRandom(receiptData.sleepGood);
        else diaryText += pickRandom(receiptData.sleepBad);

        if (totalMilk >= 700) diaryText += pickRandom(receiptData.feedMuch);
        else if (totalMilk > 0) diaryText += pickRandom(receiptData.feedLittle);
        else diaryText += pickRandom(receiptData.feedZero);

        if (totalPoop > 0) diaryText += pickRandom(receiptData.poopMuch);
        else diaryText += pickRandom(receiptData.poopZero);

        diaryText += pickRandom(receiptData.outro); // 엔딩
    }

    document.getElementById('receipt-diary').innerText = diaryText;
    document.getElementById('receipt-modal').style.display = 'flex';
}

// 닫기 버튼
window.closeReceiptModal = function() {
    document.getElementById('receipt-modal').style.display = 'none';
}

// 영수증 이미지 저장 함수 (버튼의 onclick 이름과 정확히 일치시켰습니다)
window.downloadReceipt = function() {
    const target = document.getElementById('receipt-content'); 

    if (!target) {
        alert("저장할 영수증 내용을 찾을 수 없습니다. (ID 확인 필요)");
        return;
    }

    html2canvas(target, {
        scale: 2, 
        backgroundColor: '#ffffff' 
    }).then(canvas => {
        // 2. 캔버스를 이미지 파일로 변환하여 다운로드
        const link = document.createElement("a");
        link.download = "우리아기_하루_영수증.png";
        link.href = canvas.toDataURL("image/png");
        link.click();
    });
};

// ==========================================
// 👁️ 영수증 버튼 숨기기/보여주기 검사관 (최종본)
// ==========================================
window.checkReceiptVisibility = function() {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    let records = JSON.parse(localStorage.getItem('tosil_tracker_records')) || [];

    const todayRecordsCount = records.filter(record => record.timestamp >= startOfToday).length;

    const receiptBtn = document.getElementById('receipt-banner-btn');
    if (!receiptBtn) return;

    // 🚨 조건 수정: 기록이 3개 이상 '이면서(AND)' 저녁 8시가 넘었을 때만!
    if (todayRecordsCount >= 3 && today.getHours() >= 20) {
        receiptBtn.style.display = 'flex'; // 보여주기
    } else {
        receiptBtn.style.display = 'none'; // 숨기기
    }
}

// 앱이 켜질 때 & 기록이 저장/삭제될 때마다 검사
window.addEventListener('load', function() {
    window.checkReceiptVisibility();
});

// 🍞 토스트 팝업 띄우기 함수 (alert 대체)
window.showToast = function(message) {
    const container = document.getElementById('toast-container');
    if(!container) return;
    
    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    toast.innerHTML = message;
    
    container.appendChild(toast);
    
    // 2.5초 뒤에 스르륵 사라짐
    setTimeout(() => {
        toast.style.animation = 'toastFadeOut 0.3s ease-in forwards';
        setTimeout(() => { toast.remove(); }, 300);
    }, 2500);
};

// 🚨 커스텀 확인창 띄우기 함수 (타이핑 안전장치 포함!)
window.showConfirm = function(message, onConfirm, icon = '🚨', confirmText = '확인', confirmColor = 'var(--primary)', requireKeyword = null) {
    const modal = document.getElementById('custom-confirm-modal');
    const msgEl = document.getElementById('confirm-message');
    const iconEl = document.getElementById('confirm-icon');
    const btnOk = document.getElementById('btn-confirm-ok');
    const btnCancel = document.getElementById('btn-confirm-cancel');
    const inputArea = document.getElementById('confirm-input-area');
    const inputEl = document.getElementById('confirm-keyword-input');
    
    if(!modal) return;
    
    msgEl.innerHTML = message.replace(/\n/g, '<br>');
    iconEl.innerHTML = icon;
    btnOk.innerText = confirmText;
    btnOk.style.background = confirmColor;
    
    // 안전 키워드가 필요할 때
    if (requireKeyword) {
        inputArea.style.display = 'block';
        inputEl.value = '';
        btnOk.style.opacity = '0.3';
        btnOk.style.pointerEvents = 'none'; // 입력 전엔 클릭 금지!
        
        inputEl.onkeyup = function() {
            if (this.value === requireKeyword) {
                btnOk.style.opacity = '1';
                btnOk.style.pointerEvents = 'auto'; // 똑같이 쳐야만 활성화
            } else {
                btnOk.style.opacity = '0.3';
                btnOk.style.pointerEvents = 'none';
            }
        };
    } else {
        inputArea.style.display = 'none';
        btnOk.style.opacity = '1';
        btnOk.style.pointerEvents = 'auto';
    }
    
    modal.style.display = 'flex';
    
    btnOk.onclick = function() {
        modal.style.display = 'none';
        if(typeof onConfirm === 'function') onConfirm();
    };
    
    btnCancel.onclick = function() {
        modal.style.display = 'none';
    };
};

// 트래커 전체 삭제에 안전장치 걸기!
window.resetTrackerRecords = function() {
    showConfirm("모든 트래커 기록을 싹 지우시겠습니까?\n(진행 중인 수면 타이머도 리셋됩니다)", async function() {
        localStorage.removeItem('tosil_sleep_start');
        localStorage.removeItem('tosil_sleep_type');
        if (typeof saveTrackerToFirebase === 'function') {
            await saveTrackerToFirebase([]);
            flushTrackerSync(); 
        } else {
            localStorage.removeItem('tosil_tracker_records');
            window.updateTrackerDashboard();
        }
        showToast("🧹 트래커 기록이 싹 비워졌습니다!");
    }, "⚠️", "전체 삭제", "#F04452", "삭제"); // 👈 끝에 "삭제" 추가!
};

// (설정 탭) 데이터 관리 전체 삭제
window.clearAllData = function() {
    showConfirm("정말 모든 데이터를 초기화할까요?<br>이 작업은 되돌릴 수 없습니다!", function() {
        localStorage.removeItem('baby_trackers');
        localStorage.removeItem('tosil_tracker_records');
        window.updateTrackerDashboard(); 
        showToast("🗑️ 데이터가 모두 초기화되었습니다.");
    }, "🚨", "초기화", "#F04452", "삭제"); // 👈 끝에 "삭제" 추가!
};

// ❌ 알람 끄기 함수
window.dismissTrackerAlarm = function(type) {
    localStorage.setItem('tosil_dismiss_alarm_' + type, new Date().getTime());
    window.updateTrackerDashboard();
};

// ==========================================
// 💡 수면시간 자동 계산 엔진 (반드시 다른 함수들 바깥 빈 공간에 넣으세요!)
// ==========================================
window.calcSleepToNow = function() {
    // 이제 별도의 수면 시작시간칸 대신, 시트 맨 위의 기록 시간(v-tracker-time)을 사용합니다!
    const startInput = document.getElementById('v-tracker-time');
    const amountInput = document.getElementById('v-sleep-amount');
    if(!startInput || !amountInput) return;

    const [sHour, sMin] = startInput.value.split(':').map(Number);
    const now = new Date();
    let startObj = new Date();
    startObj.setHours(sHour, sMin, 0, 0);

    // 어젯밤에 잤을 경우 날짜 보정
    if (startObj > now) {
        startObj.setDate(startObj.getDate() - 1);
    }

    const diffMins = Math.floor((now - startObj) / 60000);
    
    if (diffMins < 0) {
        return window.showToast("⚠️ 시작 시간이 잘못 설정되었습니다.");
    }

    amountInput.value = diffMins;
    
    amountInput.style.transform = 'scale(1.2)';
    amountInput.style.color = '#3182F6';
    setTimeout(() => { 
        amountInput.style.transform = 'scale(1)'; 
        amountInput.style.color = 'var(--text-m)';
    }, 300);

    window.showToast(`✅ ${diffMins}분 수면으로 계산되었습니다!`);
};

// ==========================================
// 🚀 [온보딩 & 정보수정 엔진] 최종 완성본 (이것만 남기세요!)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const savedName = localStorage.getItem('tosil_babyName');
    const savedDate = localStorage.getItem('tosil_startDate');
    
    // 🔥 무한 반복 버그 해결 완!
    if (savedName && savedDate) {
        document.getElementById('onboarding-overlay').style.display = 'none';
        updateBabyDashboard(); 
    } else {
        document.getElementById('onboarding-overlay').style.display = 'flex';
    }
});

// 🔄 다음/이전 단계 연결
window.nextOnboardingStep = function(step) {
    if (step === 2) {
        const name = document.getElementById('ob-name').value.trim();
        if (!name) return alert('우리 아기의 예쁜 이름을 입력해주세요! 😊');
        
        document.getElementById('ob-greeting-name').innerHTML = `<span style="color:#3182F6;">${name}</span>의 생일은<br>언제인가요?`;
        document.getElementById('onboarding-step-1').style.display = 'none';
        document.getElementById('onboarding-step-2').style.display = 'flex';
        document.getElementById('onboarding-step-3').style.display = 'none';
    } else if (step === 3) {
        const date = document.getElementById('ob-date').value;
        if (!date) return alert('생일(또는 예정일)을 꼭 선택해주세요! 🎂');
        
        const name = document.getElementById('ob-name').value.trim();
        document.getElementById('ob-stage-name').innerText = name; 
        
        document.getElementById('onboarding-step-2').style.display = 'none';
        document.getElementById('onboarding-step-3').style.display = 'flex';
    } else if (step === 1) {
        document.getElementById('onboarding-step-2').style.display = 'none';
        document.getElementById('onboarding-step-1').style.display = 'flex';
        document.getElementById('onboarding-step-3').style.display = 'none';
    }
};

// 🎉 온보딩 완료 및 토스식 로딩 마술 발동! (여기가 핵심!)
window.finishOnboarding = function(feedingStage) {
    const name = document.getElementById('ob-name').value.trim();
    const date = document.getElementById('ob-date').value;
    
    // 1. 기존 화면(3단계)을 숨기고 비밀의 로딩 화면을 켭니다!
    document.getElementById('onboarding-step-3').style.display = 'none';
    document.getElementById('onboarding-step-loading').style.display = 'flex';
    
    const loadingText = document.getElementById('loading-text');

    // ⏱️ 0초: 첫 번째 멘트
    loadingText.innerHTML = `<span style="color:#3182F6">${name}</span>의<br>생일 데이터를 동기화하는 중...`;
    
    // ⏱️ 1.2초 뒤: 두 번째 멘트
    setTimeout(() => {
        loadingText.innerHTML = `현재 월령에 맞는<br>성장 구간 분석 중...`;
    }, 1200);

    // ⏱️ 2.4초 뒤: 세 번째 멘트
    setTimeout(() => {
        loadingText.innerHTML = `[${feedingStage}]에 딱 맞는<br>육아메이트 세팅 완료! 🎉`;
    }, 2400);

    // ⏱️ 3.5초 뒤: 마술이 끝나면 그제야 데이터를 저장하고 새로고침!
    setTimeout(() => {
        localStorage.setItem('tosil_babyName', name);
        localStorage.setItem('tosil_startDate', date);
        localStorage.setItem('tosil_feedingStage', feedingStage);
        localStorage.setItem('tosil_baby', JSON.stringify({name: name, birth: date, stage: feedingStage}));

        document.getElementById('onboarding-overlay').style.display = 'none';
        location.reload(); 
    }, 3500); 
};

// ✏️ 메인화면에서 연필 눌러서 수정할 때
window.promptBabyInfo = function() {
    document.getElementById('ob-name').value = localStorage.getItem('tosil_babyName') || '';
    document.getElementById('ob-date').value = localStorage.getItem('tosil_startDate') || '';
    
    document.getElementById('onboarding-step-1').style.display = 'flex';
    document.getElementById('onboarding-step-2').style.display = 'none';
    document.getElementById('onboarding-step-3').style.display = 'none';
    const loadingObj = document.getElementById('onboarding-step-loading');
    if(loadingObj) loadingObj.style.display = 'none';
    
    document.getElementById('onboarding-overlay').style.display = 'flex';
};


// ==========================================
// 🎣 [바이럴 엔진] 남편 강제 소환 (평생 1번만 등장 + 카카오 찐연동)
// ==========================================

// 1. 카카오톡 통신망 연결
if (typeof Kakao !== 'undefined' && !Kakao.isInitialized()) {
    Kakao.init('68bca10ddfe2ec67112b07eb9a08da2b'); 
}

// 🌟 삭제되었던 바텀시트 띄우기 함수 복구!
window.showInviteNudge = function() {
    // 💡 테스트용: 이 창을 계속 띄워보고 싶다면 아래 줄의 // 를 지우세요!
    // localStorage.removeItem('tosil_has_seen_invite');

    if (!localStorage.getItem('tosil_has_seen_invite')) {
        const babyName = localStorage.getItem('tosil_babyName') || '우리아기';
        const nameEl = document.getElementById('invite-baby-name');
        if(nameEl) nameEl.innerText = babyName;

        // 앱 켜지고 1.5초 뒤에 기습적으로 스르륵 등장!
        setTimeout(() => {
            const sheet = document.getElementById('invite-bottom-sheet');
            if(sheet) sheet.style.display = 'flex';
        }, 1500);
    }
};

// 🌟 삭제되었던 '나중에 할게요' 닫기 기능 복구!
window.closeInviteSheet = function() {
    localStorage.setItem('tosil_has_seen_invite', 'true');
    const sheet = document.getElementById('invite-bottom-sheet');
    if(sheet) sheet.style.display = 'none';
};

// 🌟 카톡 초대 버튼 (완벽 연동)
window.sendKakaoInvite = function() {
    // 초대 버튼을 눌렀으니 다시는 안 뜨게 도장 쾅!
    localStorage.setItem('tosil_has_seen_invite', 'true');
    const sheet = document.getElementById('invite-bottom-sheet');
    if(sheet) sheet.style.display = 'none';
    
    // 카카오톡 공유 API (진짜 예쁜 카톡 템플릿 보내기)
    if (typeof Kakao !== 'undefined' && Kakao.isInitialized()) {
        Kakao.Share.sendDefault({
            objectType: 'feed',
            content: {
                title: '💌 짝꿍의 육아메이트 초대장!',
                description: "여보! 우리 아기 맞춤형 육아 비서 [육아메이트]로 나랑 같이 육아 기록 공유하자 🤍 지금 바로 접속해 봐!",
                imageUrl: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png', // 앱 로고 이미지
                link: {
                    mobileWebUrl: 'https://happy-baby0303.github.io/',
                    webUrl: 'https://happy-baby0303.github.io/',
                },
            },
            buttons: [
                {
                    title: '앱 열고 연동하기 👉',
                    link: {
                        mobileWebUrl: 'https://happy-baby0303.github.io/',
                        webUrl: 'https://happy-baby0303.github.io/',
                    },
                },
            ],
        });
        
        // 카톡 보내고 난 뒤에 연동 모달창 자동으로 띄워주기
        if(typeof openFamilySyncModal === 'function') openFamilySyncModal();
        
    } else {
        // 카카오 실패 시 보험
        const text = "여보! 우리 아기 맞춤형 육아 비서 [육아메이트]로 나랑 같이 육아 기록 공유하자 🤍 지금 바로 접속해 봐!";
        const url = "https://happy-baby0303.github.io/"; 
        
        if (navigator.share) {
            navigator.share({ title: '육아메이트 초대장', text: text, url: url })
            .then(() => { if(typeof openFamilySyncModal === 'function') openFamilySyncModal(); })
            .catch(console.error);
        } else {
            prompt("아래 초대장을 복사해서 카톡으로 보내주세요!", text + " " + url);
            if(typeof openFamilySyncModal === 'function') openFamilySyncModal();
        }
    }
};

// 🌟 홈 화면 방아쇠 (앱 켜질 때 알아서 띄우기)
document.addEventListener("DOMContentLoaded", () => {
    // 온보딩이 끝나서 아기 이름이 있을 때만 띄웁니다!
    if(localStorage.getItem('tosil_babyName')) {
        // 캐시 지우기용 테스트를 원하시면 여기 주석(//)을 해제하고 새로고침하세요!
         //localStorage.removeItem('tosil_has_seen_invite'); 
        
        setTimeout(() => {
            if(typeof window.showInviteNudge === 'function') window.showInviteNudge();
        }, 100);
    }
});

// ==========================================
// 👶 [홈 화면 통합 엔진] 아기 정보 & 맞춤형 큐레이션 & 시간대 인사말
// ==========================================
window.renderBabyInfo = function() {
    const savedName = localStorage.getItem('tosil_babyName');
    const savedDate = localStorage.getItem('tosil_startDate');
    const savedStage = localStorage.getItem('tosil_feedingStage');

    const nameEl = document.getElementById('res-baby-name');
    const ddayEl = document.getElementById('res-baby-dday');
    const msgEl = document.getElementById('daily-message');
    const missionNameEl = document.getElementById('mission-baby-name');

    // 1. 정보가 없을 때 (온보딩 전)
    if (!savedName || !savedDate) {
        if(nameEl) nameEl.innerText = "아기를 등록해주세요"; 
        if(ddayEl) ddayEl.innerText = "등록 전";
        if(typeof setDefaultMainAISensors === 'function') setDefaultMainAISensors();
        return;
    }

    // 2. 날짜 및 D-Day 계산
    const birthDate = new Date(savedDate);
    birthDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - birthDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const monthAge = Math.floor(diffDays / 30.436875);

    // 3. 이름 & D-Day 뿌리기 (뱃지 크기 밸런스 조정)
    if(nameEl) nameEl.innerText = `${savedName}의 공간`; 
    if(missionNameEl) missionNameEl.innerText = savedName;
    if(document.getElementById('play-dday-badge')) document.getElementById('play-dday-badge').innerText = diffDays > 0 ? diffDays : 0;

    let ddayText = diffDays > 0 ? `D+${diffDays}일` : diffDays < 0 ? `D${diffDays}일` : `D-Day`;
    if(ddayEl) ddayEl.innerHTML = `${ddayText} <span style="font-size:14px; background:rgba(0,0,0,0.5); padding:6px 12px; border-radius:12px; vertical-align:middle; margin-left:8px; font-weight:800; text-shadow:none; backdrop-filter:blur(8px); border:1px solid rgba(255,255,255,0.2);">🚀 도약기</span>`; 

    // 4. 시간대별 감성 인사말 띄우기
    if(typeof applyTimeBasedGreeting === 'function') applyTimeBasedGreeting(savedName);

   // 5. 🔥 이유식 뱃지 (단순한 버튼이 아닌, 정보형 카드 UI로 변경)
      if (msgEl) {
        if (savedStage) {
            let stageTitle = ""; let stageSub = ""; let stageIcon = "";
            
            // 👇 3단계였던 걸 7단계로 엄청나게 디테일하게 쪼갰습니다!
            if (savedStage.includes('모유/분유')) { 
                stageTitle = "쑥쑥 크는 수유기!"; stageSub = "오늘도 수유량 꼼꼼히 기록해볼까요?"; stageIcon = "🍼"; 
            }
            else if (savedStage.includes('초기')) { 
                stageTitle = "초기 이유식 시작!"; stageSub = "미음부터 천천히! 알레르기 반응을 꼭 체크해주세요."; stageIcon = "🥄"; 
            }
            else if (savedStage.includes('중기')) { 
                stageTitle = "오물오물 중기 이유식!"; stageSub = "작은 알갱이에 적응하는 시기예요. 큐브를 활용해 보세요!"; stageIcon = "🥄"; 
            }
            else if (savedStage.includes('후기')) { 
                stageTitle = "냠냠 후기 이유식!"; stageSub = "하루 세 끼 연습! 철분 섭취(소고기)에 신경 써주세요."; stageIcon = "🥄"; 
            }
            else if (savedStage.includes('완료기')) { 
                stageTitle = "이유식 완료기 진입!"; stageSub = "진밥과 반찬의 콜라보! 자기 주도 식사를 응원해 주세요."; stageIcon = "🍚"; 
            }
            else if (savedStage.includes('유아식')) { 
                stageTitle = "어엿한 유아식!"; stageSub = "어른 밥과 비슷해졌어요. 다양한 식재료를 경험하게 해주세요!"; stageIcon = "🍚"; 
            }
            else { 
                // 위 항목에 안 걸리는 예외의 경우 (기본값)
                stageTitle = "우리아기 맘마 타임!"; stageSub = "골고루 먹고 튼튼하게 자라렴! 🤍"; stageIcon = "🍎"; 
            }

            msgEl.innerHTML = `
                <div style="font-size:28px; line-height:1; flex-shrink:0;">${stageIcon}</div> 
                <div style="flex:1; min-width:0;">
                    <div style="font-size:14.5px; font-weight:800; color:var(--text-m); margin-bottom:2px;">${stageTitle}</div>
                    <div style="font-size:12.5px; font-weight:600; color:var(--text-s); word-break:keep-all;">${stageSub}</div>
                </div>`;
        } else {
            // (이후 기존 코드와 동일) ...
            const tipObj = typeof babyTips !== 'undefined' ? babyTips.find(item => monthAge >= item.min && monthAge <= item.max) : null;
            msgEl.innerHTML = `
                <div style="font-size:28px; line-height:1; flex-shrink:0;">💡</div> 
                <div style="flex:1; min-width:0;">
                    <div style="font-size:14.5px; font-weight:800; color:var(--text-m); margin-bottom:2px;">오늘의 육아 팁</div>
                    <div style="font-size:12.5px; font-weight:600; color:var(--text-s); word-break:keep-all;">${tipObj ? tipObj.tip : `오늘도 ${savedName}와(과) 행복한 하루 되세요! 🤍`}</div>
                </div>`;
        }
        msgEl.style.display = 'flex'; 
    }

    // 6. 하단 위젯 & 센서 가동
        if(typeof updateMainAISensors === 'function') updateMainAISensors(monthAge); 

    // 7. 예방접종 배너 띄우기
   const bannerContainer = document.getElementById('health-smart-banner');
    if (bannerContainer) {
        bannerContainer.style.display = 'none';
    }
}; // <--- renderBabyInfo 함수 끝나는 곳

// 🚨 온보딩 체크 후 renderBabyInfo 호출 (앱 맨 밑쪽에 있는 DOMContentLoaded 덮어쓰기)
document.addEventListener("DOMContentLoaded", () => {
    const savedName = localStorage.getItem('tosil_babyName');
    const savedDate = localStorage.getItem('tosil_startDate');
    
    if (savedName && savedDate) {
        document.getElementById('onboarding-overlay').style.display = 'none';
        renderBabyInfo(); // 👈 여기서 하나로 통합된 엔진 실행!
    } else {
        document.getElementById('onboarding-overlay').style.display = 'flex';
    }
});

// ✨ 햅틱 진동 모듈 (모바일 기기에서 '톡!' 하는 손맛)
document.addEventListener('DOMContentLoaded', () => {
    // 앱 내의 모든 버튼과 클릭 가능한 카드들을 찾음
    const allButtons = document.querySelectorAll('button, .ai-matrix-card, .sym-btn, select, input[type="checkbox"]');
    
    allButtons.forEach(btn => {
        // 모바일 터치 시작 시 미세 진동 (안드로이드 지원)
        btn.addEventListener('touchstart', () => {
            if (navigator.vibrate) {
                navigator.vibrate(10); // 10ms의 아주 짧고 경쾌한 진동
            }
        }, { passive: true });
    });
});

// ==========================================
// 🍼 [툴박스] 퐁당맘마 (수유량/갈아타기) 모듈
// ==========================================
function calcFormulaAmount() {
    const wVal = document.getElementById('calc-weight').value;
    const cntVal = document.getElementById('calc-count').value;
    
    if (!wVal || !cntVal) return showToast("⚠️ 아기 몸무게와 수유 횟수를 입력해주세요!");

    const weight = parseFloat(wVal);
    const count = parseInt(cntVal);
    
    // ✨ 범위 계산 (몸무게 * 130 ~ 150ml)
    let minMl = Math.round(weight * 130);
    let maxMl = Math.round(weight * 150);
    const warningEl = document.getElementById('formula-warning');
    
    let displayTotal = "";
    let displayOne = "";
    
    // 🚨 1,000ml 안전 잠금장치 및 텍스트 유연화
    if (minMl >= 1000) {
        // 1. 최소량조차 1000을 넘는 우량아 (약 7.7kg 이상) -> 무조건 최대 1000으로 고정
        warningEl.style.display = 'block';
        displayTotal = "최대 1,000";
        displayOne = `최대 ${Math.round(1000 / count).toLocaleString()}`;
    } else if (maxMl > 1000) {
        // 2. 최대량만 1000을 넘는 경우 (약 6.7kg ~ 7.6kg) -> 최소치 ~ 최대 1000
        warningEl.style.display = 'block';
        displayTotal = `${minMl.toLocaleString()} ~ 최대 1,000`;
        displayOne = `${Math.round(minMl / count).toLocaleString()} ~ 최대 ${Math.round(1000 / count).toLocaleString()}`;
    } else {
        // 3. 1000을 넘지 않는 뽀시래기 시절 -> 정상 범위 출력
        warningEl.style.display = 'none';
        displayTotal = `${minMl.toLocaleString()} ~ ${maxMl.toLocaleString()}`;
        displayOne = `${Math.round(minMl / count).toLocaleString()} ~ ${Math.round(maxMl / count).toLocaleString()}`;
    }

    // ✨ 결과 출력
    document.getElementById('res-total-ml').innerText = displayTotal;
    document.getElementById('res-one-ml').innerText = displayOne;
    
    document.getElementById('formula-amount-result').style.display = 'block';
    
    // 몸무게 동기화
    localStorage.setItem('tosil_latest_weight', weight);
}

// 퐁당퐁당 상태 변수
let currentPongMode = 'ratio'; // 'ratio'(비율 섞기) or 'count'(횟수 섞기)

function switchPongTab(mode) {
    currentPongMode = mode;
    const tabRatio = document.getElementById('pong-tab-ratio');
    const tabCount = document.getElementById('pong-tab-count');
    const desc = document.getElementById('pong-desc');
    const label = document.getElementById('pong-input-label');
    const input = document.getElementById('pong-input-val');
    const unit = document.getElementById('pong-input-unit');

    // 🚨 탭 바꿀 때 무조건 입력값 리셋! (200회 버그 해결)
    input.value = '';

    // 탭 디자인 및 안내 문구 변경
    if (mode === 'ratio') {
        tabRatio.style.background = '#FFFFFF'; tabRatio.style.color = '#191F28'; tabRatio.style.boxShadow = '0 2px 6px rgba(0,0,0,0.05)';
        tabCount.style.background = 'transparent'; tabCount.style.color = '#8B95A1'; tabCount.style.boxShadow = 'none';
        
        desc.innerHTML = '💡 <strong>비율 섞기 (조유량이 같을 때)</strong><br>스푼당 물의 양(조유량)이 <b>같은</b> 분유끼리 바꿀 때만 사용하세요!<br>한 젖병에 가루를 비율대로 섞어 먹이는 방식입니다.';
        label.innerText = '1회 총 수유량';
        input.placeholder = '예: 160';
        unit.innerText = 'ml';
    } else {
        tabCount.style.background = '#FFFFFF'; tabCount.style.color = '#191F28'; tabCount.style.boxShadow = '0 2px 6px rgba(0,0,0,0.05)';
        tabRatio.style.background = 'transparent'; tabRatio.style.color = '#8B95A1'; tabRatio.style.boxShadow = 'none';
        
        desc.innerHTML = '🚨 <strong>교차 수유하기 (조유량이 다를 때)</strong><br>조유량이 <b>다른</b> 분유는 가루를 섞으면 농도가 깨져 배앓이를 해요.<br>꼭 젖병 통째로 횟수를 교차해서 먹여주세요!';
        label.innerText = '하루 총 수유 횟수';
        input.placeholder = '예: 5';
        unit.innerText = '회 (병)';
    }

    // 결과창 숨기기 & 칩 리셋
    document.getElementById('pong-result').style.display = 'none';
    document.querySelectorAll('.pong-btn').forEach(b => {
        b.style.background = 'var(--bg-card)';
        b.style.color = 'var(--text-m)';
        b.style.border = '1px solid var(--border)';
    });
}

function calcPong(step, btnEl) {
    // 버튼 UI 업데이트
    document.querySelectorAll('.pong-btn').forEach(b => {
        b.style.background = 'var(--bg-card)';
        b.style.color = 'var(--text-m)';
        b.style.border = '1px solid var(--border)';
    });
    btnEl.style.background = '#F0F7FF';
    btnEl.style.color = '#3182F6';
    btnEl.style.border = '1px solid #3182F6';

    const inputVal = parseInt(document.getElementById('pong-input-val').value);
    
    if (!inputVal) {
        return showToast(currentPongMode === 'ratio' ? "⚠️ 1회 수유량(ml)을 입력해주세요!" : "⚠️ 하루 총 수유 횟수를 입력해주세요!");
    }

    const titleEl = document.getElementById('pong-res-title');
    const oldValEl = document.getElementById('pong-old-val');
    const newValEl = document.getElementById('pong-new-val');
    const oldUnitEl = document.getElementById('pong-old-unit');
    const newUnitEl = document.getElementById('pong-new-unit');

    if (currentPongMode === 'ratio') {
        // [비율 가루 섞기]
        let newRatio = step === 1 ? 0.3 : (step === 2 ? 0.5 : 0.7);
        const newMl = Math.round(inputVal * newRatio);
        const oldMl = inputVal - newMl;

        titleEl.innerText = "한 젖병에 이렇게 가루를 타주세요!";
        oldValEl.innerText = oldMl; newValEl.innerText = newMl;
        oldUnitEl.innerText = 'ml'; newUnitEl.innerText = 'ml';
    } else {
        // [병 횟수 교차하기]
        let newCount = 0;
        if (inputVal === 4) {
            newCount = step === 1 ? 1 : (step === 2 ? 2 : 3);
        } else if (inputVal === 5) {
            newCount = step === 1 ? 1 : (step === 2 ? 2 : 4);
        } else if (inputVal >= 6) {
            newCount = step === 1 ? 2 : (step === 2 ? 3 : inputVal - 1);
        } else {
            newCount = step; // 수유 횟수가 너무 적을 경우 예외처리
        }
        
        const oldCount = Math.max(inputVal - newCount, 0);

        titleEl.innerText = `오늘 하루 총 ${inputVal}회 중, 이렇게 교차로 먹이세요!`;
        oldValEl.innerText = oldCount; newValEl.innerText = newCount;
        oldUnitEl.innerText = '회'; newUnitEl.innerText = '회';
    }

    document.getElementById('pong-result').style.display = 'block';
}

window.calcFormulaAmount = calcFormulaAmount;
window.calcPong = calcPong;
window.switchPongTab = switchPongTab;

// ==========================================
// 🗓️ [툴박스] 언제깠지 (개봉일 추적기) 모듈
// ==========================================
function addOpenRecord() {
    const typeSelect = document.getElementById('open-item-type');
    const dateInput = document.getElementById('open-item-date');
    
    const typeVal = typeSelect.value;
    const typeText = typeSelect.options[typeSelect.selectedIndex].text.split(' ')[1]; 
    const emoji = typeSelect.options[typeSelect.selectedIndex].text.split(' ')[0];
    const dateVal = dateInput.value;
    
    if (!dateVal) return showToast("⚠️ 뜯은 날짜를 선택해주세요!");

    // 권장 유통기한(일수) 맵핑
const limitMap = {
        'formula': 21,    // 분유: 3주
        'fever': 30,      // 시럽약: 1달
        'tub_oint': 30,   // 소분 연고: 1달
        'tube_oint': 180, // 튜브 연고: 6개월
        'eye_drop': 30,   // 안약: 1달
        'cream': 180,     // 로션/크림: 6개월
        'puree': 2,       // 퓨레: 2일
        'wipe': 30        // 소독티슈: 1달
    };

    const newRecord = {
        id: 'open_' + new Date().getTime(),
        type: typeVal,
        name: typeText,
        emoji: emoji,
        openDate: dateVal,
        limitDays: limitMap[typeVal]
    };

    let records = JSON.parse(localStorage.getItem('tosil_open_records')) || [];
    records.push(newRecord);
    localStorage.setItem('tosil_open_records', JSON.stringify(records));
    
    renderOpenRecords();
    showToast("✍️ 라벨 스티커가 등록되었습니다!");
}

function deleteOpenRecord(id) {
    showConfirm("이 품목을 삭제하시겠습니까? (다 썼거나 폐기한 경우)", function() {
        let records = JSON.parse(localStorage.getItem('tosil_open_records')) || [];
        records = records.filter(r => r.id !== id);
        localStorage.setItem('tosil_open_records', JSON.stringify(records));
        renderOpenRecords();
        showToast("🗑️ 삭제 완료!");
    }, "🗑️", "삭제", "#F04452");
}

function renderOpenRecords() {
    const container = document.getElementById('open-list-container');
    if (!container) return;

    let records = JSON.parse(localStorage.getItem('tosil_open_records')) || [];
    
    const dateInput = document.getElementById('open-item-date');
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    if (records.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:30px; background:var(--bg-sub); border-radius:16px; border:1px dashed var(--border);">
                <div style="font-size:24px; margin-bottom:10px;">✨</div>
                <div style="font-size:13.5px; font-weight:800; color:var(--text-s);">아직 기록된 개봉품이 없습니다.<br>통에 적지 말고 여기에 저장하세요!</div>
            </div>`;
        return;
    }

    const today = new Date();
    today.setHours(0,0,0,0);
    
    let html = '';
    
    records.sort((a, b) => {
        const endA = new Date(a.openDate).getTime() + (a.limitDays * 24 * 60 * 60 * 1000);
        const endB = new Date(b.openDate).getTime() + (b.limitDays * 24 * 60 * 60 * 1000);
        return endA - endB;
    });

    records.forEach(r => {
        const openD = new Date(r.openDate);
        openD.setHours(0,0,0,0);
        
        const passedDays = Math.floor((today - openD) / (1000 * 60 * 60 * 24));
        const remainDays = r.limitDays - passedDays;

        let statusHtml = '';
        let borderColor = 'var(--border)';

        if (remainDays < 0) {
            statusHtml = `<span style="color:#F04452; font-weight:900; font-size:12.5px;">🚨 기한 만료 (폐기 권장)</span>`;
            borderColor = '#FCA5A5';
        } else if (remainDays <= 5) {
            statusHtml = `<span style="color:#FF823A; font-weight:800; font-size:12.5px;">⚠️ D-${remainDays} (곧 만료)</span>`;
            borderColor = '#FDBA74';
        } else {
            statusHtml = `<span style="color:#00B37A; font-weight:800; font-size:12.5px;">✅ D-${remainDays} (여유)</span>`;
        }

        html += `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:16px; background:#FFFFFF; border:1px solid ${borderColor}; border-radius:16px; margin-bottom:8px; box-shadow:0 2px 6px rgba(0,0,0,0.02);">
            <div style="display:flex; align-items:center; gap:12px;">
                <div style="font-size:24px; background:var(--bg-sub); width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center;">${r.emoji}</div>
                <div>
                    <div style="font-size:14.5px; font-weight:900; color:var(--text-m); margin-bottom:4px;">${r.name}</div>
                    <div style="display:flex; align-items:center; gap:6px;">
                        ${statusHtml}
                        <span style="font-size:11.5px; color:var(--text-s); font-weight:600;">(오픈: ${r.openDate})</span>
                    </div>
                </div>
            </div>
            <button onclick="deleteOpenRecord('${r.id}')" style="background:#F2F5F8; border:none; border-radius:10px; width:40px; height:40px; color:#8B95A1; cursor:pointer; font-size:15px; display:flex; justify-content:center; align-items:center;">❌</button>
        </div>`;
    });

    container.innerHTML = html;
}

window.addOpenRecord = addOpenRecord;
window.deleteOpenRecord = deleteOpenRecord;
window.renderOpenRecords = renderOpenRecords;

document.addEventListener("DOMContentLoaded", () => {
    setTimeout(renderOpenRecords, 300);
});

// ==========================================
// 💡 언제깠지 - 동적 말풍선 가이드 엔진
// ==========================================
window.updateOpenItemGuide = function() {
    const val = document.getElementById('open-item-type').value;
    const guideEl = document.getElementById('open-item-guide');
    
    const guides = {
        'formula': '💡 습기에 취약해요! 개봉 후 <strong>3주(21일) 이내</strong> 소진을 권장합니다.',
        'fever': '💡 처방받은 약은 1주, 시판 병 시럽은 <strong>1달(30일) 권장</strong>',
        'tub_oint': '💡 약국에서 덜어준 둥근 통 연고는 <strong>1달(30일) 이내</strong>',
        'tube_oint': '💡 밀봉된 튜브형 연고(비판텐 등)는 <strong>6개월(180일)</strong>',
        'eye_drop': '🚨 세균 감염 위험! 개봉 후 무조건 <strong>1달(30일) 이내</strong>',
        'cream': '💡 아기 피부에 직접 닿는 화장품은 개봉 후 <strong>6개월 권장</strong>',
        'puree': '💡 침이 닿지 않게 덜어서 냉장 보관 시 <strong>2일 이내</strong>',
        'wipe': '💡 수분이 마르고 세균 번식 위험이 있어 <strong>1달 권장</strong>'
    };

    if(guideEl && guides[val]) {
        guideEl.innerHTML = guides[val];
        // 위험한 안약이나 퓨레는 빨간색 경고창으로 띄워주기!
        if(val === 'eye_drop' || val === 'puree') {
            guideEl.style.color = '#D32F2F';
            guideEl.style.background = '#FFF0F1';
        } else {
            guideEl.style.color = '#3182F6';
            guideEl.style.background = '#E8F3FF';
        }
    }
};

// 앱 로딩 시 말풍선 한번 띄워두기
document.addEventListener("DOMContentLoaded", () => {
    if(typeof window.updateOpenItemGuide === 'function') window.updateOpenItemGuide();
});


// ==========================================
// 🎮 짝꿍 육아 레벨링 시스템 (부부 공용 + 레벨업 보상)
// ==========================================

// 1. 레벨별 요구 경험치, 공용 칭호, 그리고 🎁[레벨업 보상] 추가!
const mateLevelData = [
    { level: 1, reqExp: 0, title: "초보 육아메이트 🐣", reward: null },
    { level: 2, reqExp: 100, title: "기저귀 교환 요정 🧚", reward: null },
    { level: 3, reqExp: 300, title: "분유 타기 장인 🍼", reward: "☕ 달콤한 커피 타임 (배우자 결제)" },
    { level: 4, reqExp: 600, title: "트림 유도 마스터 🌬️", reward: null },
    { level: 5, reqExp: 1000, title: "수면 의식 지배자 🌙", reward: "💆 시원한 전신 마사지 30분권" },
    { level: 6, reqExp: 1500, title: "이유식 마스터셰프 👨‍🍳", reward: null },
    { level: 7, reqExp: 2200, title: "인간 놀이기구 🎢", reward: "🎮 나만의 힐링/자유시간 2시간!" },
    { level: 8, reqExp: 3000, title: "가족의 든든한 방패 🛡️", reward: null },
    { level: 9, reqExp: 4200, title: "육아의 신 👼", reward: "🍗 오늘 저녁은 내가 원하는 배달 음식!" },
    { level: 10, reqExp: 6000, title: "전설의 빛과 소금 ✨ (MAX)", reward: "🎫 묻지도 따지지도 않는 절대 소원권 1장!" }
];

function updateMateLevelUI() {
    let currentExp = parseInt(localStorage.getItem('tosil_partner_exp')) || parseInt(localStorage.getItem('tosil_dad_exp')) || 0;

    let currentLevelObj = mateLevelData[0];
    let nextLevelObj = null;

    // 현재 경험치로 내 레벨 찾기
    for (let i = 0; i < mateLevelData.length; i++) {
        if (currentExp >= mateLevelData[i].reqExp) {
            currentLevelObj = mateLevelData[i];
            nextLevelObj = mateLevelData[i + 1] || null;
        } else { break; }
    }

    let levelBadge = document.getElementById('dad-level-badge');
    let levelTitle = document.getElementById('dad-level-title');
    let expText = document.getElementById('dad-exp-text');
    let expBar = document.getElementById('dad-exp-bar');

    if(levelBadge) {
        levelBadge.innerText = `Lv.${currentLevelObj.level}`;
        levelTitle.innerText = currentLevelObj.title;

        if (nextLevelObj) {
            let levelExp = currentExp - currentLevelObj.reqExp;
            let reqLevelExp = nextLevelObj.reqExp - currentLevelObj.reqExp;
            let percentExp = Math.floor((levelExp / reqLevelExp) * 100);

            expText.innerText = `${currentExp} / ${nextLevelObj.reqExp} EXP`;
            expBar.style.width = `${percentExp}%`;
        } else {
            expText.innerText = `${currentExp} (MAX)`;
            expBar.style.width = `100%`;
        }
    }
}

function gainMateExp(amount) {
    let currentExp = parseInt(localStorage.getItem('tosil_partner_exp')) || parseInt(localStorage.getItem('tosil_dad_exp')) || 0;
    
    // 🌟 경험치 오르기 전의 '원래 레벨' 계산
    let oldLevel = 1;
    for (let i = 0; i < mateLevelData.length; i++) {
        if (currentExp >= mateLevelData[i].reqExp) oldLevel = mateLevelData[i].level;
    }

    // 경험치 추가!
    currentExp += amount;
    localStorage.setItem('tosil_partner_exp', currentExp);
    localStorage.setItem('tosil_dad_exp', currentExp); // 혹시 모를 호환성 유지
    updateMateLevelUI();

    // 🌟 경험치 오른 후의 '새로운 레벨' 계산
    let newLevel = 1;
    let newReward = null;
    for (let i = 0; i < mateLevelData.length; i++) {
        if (currentExp >= mateLevelData[i].reqExp) {
            newLevel = mateLevelData[i].level;
            if (mateLevelData[i].reward) newReward = mateLevelData[i].reward;
        }
    }

    // 🚀 만약 레벨이 올랐다면 축하 팝업 띄우기!
    if (newLevel > oldLevel) {
        setTimeout(() => {
            let congratsMsg = `🎊 레벨업! [Lv.${newLevel}] 달성! 🎊`;
            if (newReward && (mateLevelData[newLevel-1].reward !== null)) {
                congratsMsg += `\n\n🎁 특별 보상 언락:\n[${newReward}]\n지금 바로 배우자에게 청구하세요!`;
            } else {
                congratsMsg += `\n\n육아 마스터를 향해 한 걸음 더 나아갔습니다!`;
            }
            alert(congratsMsg);
        }, 300); // 게이지 차는 거 보여주고 0.3초 뒤에 팝업 띄움
    }
}

document.addEventListener("DOMContentLoaded", () => { updateMateLevelUI(); });

// ==========================================
// 💌 바통터치 완료 (차등 경험치 + 이스터에그)
// ==========================================
async function completeBaton(id) {
    let records = JSON.parse(localStorage.getItem('tosil_baton_records')) || [];
    const idx = records.findIndex(r => r.id === id);
    if (idx === -1) return;
    
    const taskText = records[idx].text || "";
    const reward = records[idx].reward; 
    records.splice(idx, 1); 
    await saveBatonToFirebase(records);

    let earnedExp = 20; 
    let expMsg = "(+20 EXP 획득!)";

    if (taskText.includes("새벽 수유")) {
        earnedExp = 50; expMsg = "(난이도 극악! +50 EXP 획득🔥)";
    } else if (taskText.includes("아기 재우기")) {
        earnedExp = 40; expMsg = "(체력 소모! +40 EXP 획득💪)";
    } else if (taskText.includes("장보기")) {
        earnedExp = 30; expMsg = "(가족의 식량 보급! +30 EXP 획득🛒)";
    } else if (taskText.includes("기저귀")) {
        earnedExp = 15; expMsg = "(기본 소양! +15 EXP 획득💩)";
    }

    if (taskText.includes("커피") || taskText.includes("마사지") || taskText.includes("자유시간") || taskText.includes("쉬어")) {
        earnedExp = 100;
        expMsg = "(🎉 히든 퀘스트 달성! 짝꿍 감동 보너스 +100 EXP 잭팟!! 🎊)";
    }

    if (reward && reward !== "없음") {
        showToast(`🎉 미션 해결! ${expMsg}\n약속된 보상 [${reward}]을(를) 당당히 요구하세요! 👍`);
    } else {
        showToast(`🎉 미션 해결 완료! ${expMsg}`);
    }

    // 경험치 지급 쏴라!
    gainMateExp(earnedExp); 
}

// ==========================================
// 💌 주간 육아 리포트 열고 닫는 엔진
// ==========================================

function openWeeklyReport() {
    const modal = document.getElementById('weekly-report-modal');
    if(modal) {
        modal.style.display = 'flex';
        // 선택 사항: 폭죽 터지는 효과음이나 애니메이션을 넣으면 더 감동적입니다!
    } else {
        console.error("주간 리포트 모달창을 찾을 수 없습니다.");
    }
}

function closeWeeklyReport() {
    const modal = document.getElementById('weekly-report-modal');
    if(modal) {
        modal.style.display = 'none';
    }
}

// 버튼에서 클릭(onclick)할 때 함수를 잘 찾을 수 있도록 창문에 걸어두기
window.openWeeklyReport = openWeeklyReport;
window.closeWeeklyReport = closeWeeklyReport;

// ==========================================
// 💌 주간 육아 리포트 자동 계산 & 스케줄링 엔진
// ==========================================

function initWeeklyReport() {
    // 1. 일요일(0)과 월요일(1)에만 버튼 짠! 하고 나타나게 하기
    const dayOfWeek = new Date().getDay();
    const reportBtn = document.getElementById('weekly-report-btn');
    
   if (reportBtn) {
        reportBtn.style.display = 'none'; 
    }

    let trackers = JSON.parse(localStorage.getItem('tosil_tracker_records')) || [];
    let oneWeekAgo = new Date().getTime() - (7 * 24 * 60 * 60 * 1000); // 정확히 7일 전 시간
    
    let feedCount = 0;
    let diaperCount = 0;
    
    trackers.forEach(t => {
        if (t.timestamp >= oneWeekAgo) {
            if (t.type === 'feed') feedCount++;
            if (t.type === 'diaper') diaperCount++;
        }
    });

    // 바통터치 완료 횟수 가져오기
    let batonCount = parseInt(localStorage.getItem('tosil_baton_done_count')) || 0;

    // 3. 계산된 숫자를 HTML 이름표(id) 자리에 꽂아 넣기
    const elFeed = document.getElementById('rep-feed');
    const elDiaper = document.getElementById('rep-diaper');
    const elBaton = document.getElementById('rep-baton');

    if(elFeed) elFeed.innerText = feedCount;
    if(elDiaper) elDiaper.innerText = diaperCount;
    if(elBaton) elBaton.innerText = batonCount;
}

// 앱이 처음 켜질 때 자동으로 위 계산을 실행하도록 예약
document.addEventListener("DOMContentLoaded", () => {
    initWeeklyReport();
});

// ==========================================
// 🔐 카카오 로그인 & 로그아웃 엔진 (안드로이드 에러 완벽 해결판!)
// ==========================================
window.loginWithKakao = function() {
    if (typeof Kakao === 'undefined' || !Kakao.isInitialized()) {
        alert("카카오 통신망이 아직 연결되지 않았습니다. 잠시 후 다시 시도해주세요.");
        return;
    }

    Kakao.Auth.login({
        throughTalk: false, // 👈 [핵심 해결책] 카카오톡 앱 전환을 막고 브라우저 내부에서 안전하게 띄웁니다!
        success: function(authObj) {
            // 로그인 성공 시 유저 정보(프로필, 닉네임) 가져오기
            Kakao.API.request({
                url: '/v2/user/me',
                success: function(res) {
                    const nickname = res.properties.nickname;
                    const profileImage = res.properties.profile_image;

                    // 폰에 닉네임과 사진 저장!
                    localStorage.setItem('kakao_nickname', nickname);
                    if (profileImage) {
                        localStorage.setItem('kakao_profile_image', profileImage);
                    }

                    showToast(`🎉 ${nickname}님 환영합니다!`);
                    window.renderSettingsTab(); // 프로필 화면 즉시 새로고침
                },
                fail: function(error) {
                    alert('프로필 정보를 가져오는데 실패했습니다: ' + JSON.stringify(error));
                }
            });
        },
        fail: function(err) {
            alert('로그인에 실패했습니다: ' + JSON.stringify(err));
        }
    });
};

// ==========================================
// ⚙️ [설정 탭] 전체 UI 렌더링 엔진 (풀옵션 장착 🚀)
// ==========================================
window.renderSettingsTab = function() {
    const container = document.getElementById('tab-settings');
    if (!container) return;

    // 🌟 1. 로그인 상태 확인해서 프로필 화면 그리기
    const savedNickname = localStorage.getItem('kakao_nickname');
    const savedProfileImg = localStorage.getItem('kakao_profile_image');
    let profileHtml = '';

    if (savedNickname) {
        // ✅ [로그인 성공] 카톡 프로필 사진과 닉네임 띄워주기
        const imgTag = savedProfileImg 
            ? `<img src="${savedProfileImg}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">` 
            : `👤`;
            
        profileHtml = `
            <div style="display: flex; align-items: center; gap: 16px; background: var(--bg-card); padding: 16px; border-radius: 16px; border: 1px solid var(--border); margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
                <div style="width: 56px; height: 56px; border-radius: 50%; background: #F2F5F8; display: flex; align-items: center; justify-content: center; font-size: 24px; overflow: hidden; border: 1px solid #E5E8EB;">
                    ${imgTag}
                </div>
                <div style="flex: 1;">
                    <div style="font-size: 12px; font-weight: 800; color: #3182F6; margin-bottom: 4px;">✅ 육아메이트 인증 완료</div>
                    <div style="font-size: 16px; font-weight: 900; color: var(--text-m);">${savedNickname} <span style="font-size: 13.5px; font-weight: 600; color: var(--text-s);">님</span></div>
                </div>
                <button onclick="window.logoutKakao()" style="padding: 6px 12px; border-radius: 8px; background: #F2F5F8; color: #8B95A1; font-size: 12px; font-weight: 800; border: none; cursor: pointer; transition: 0.2s;">
                    로그아웃
                </button>
            </div>
        `;
    } else {
        // ❌ [로그인 전] 카카오 로그인 노란색 버튼 띄워주기
        profileHtml = `
            <div style="background: var(--bg-card); padding: 20px 16px; border-radius: 16px; border: 1px solid var(--border); margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); text-align: center;">
                <div style="width: 56px; height: 56px; border-radius: 50%; background: #F2F5F8; display: flex; align-items: center; justify-content: center; font-size: 24px; margin: 0 auto 12px auto;">👤</div>
                <div style="font-size: 12px; font-weight: 800; color: #8B95A1; margin-bottom: 4px;">내 정보 안전하게 보관하기</div>
                <div style="font-size: 15.5px; font-weight: 900; color: var(--text-m); margin-bottom: 16px;">로그인이 필요합니다</div>
                <button onclick="window.loginWithKakao()" style="width: 100%; padding: 14px; border-radius: 12px; background: #FEE500; color: #191F28; font-size: 14.5px; font-weight: 900; border: none; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 8px; box-shadow: 0 2px 6px rgba(254,229,0,0.2);">
                    💬 카카오로 시작하기
                </button>
            </div>
        `;
    }

    // 🌟 2. 가족 연동 섹션
    const syncCode = localStorage.getItem('family_sync_code');
    let syncHtml = '';

    if (syncCode) {
        syncHtml = `
            <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 16px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                    <div style="font-size: 14.5px; font-weight: 900; color: var(--text-m);">👨‍👩‍👧 가족 연동 완료</div>
                    <span style="background: #EBF4FF; color: #3182F6; font-size: 11px; font-weight: 900; padding: 4px 8px; border-radius: 8px;">상태: ON</span>
                </div>
                <div style="font-size: 12.5px; color: var(--text-s); font-weight: 600; margin-bottom: 12px;">현재 가족간 육아 데이터를 공유 중입니다.</div>
                <button onclick="window.unlinkFamilySync()" style="width: 100%; padding: 12px; border-radius: 12px; background: #F2F5F8; color: #8B95A1; font-size: 13.5px; font-weight: 800; border: none; cursor: pointer;">연동 해제하기</button>
            </div>
        `;
    } else {
        syncHtml = `
            <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 16px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.02);">
                <div style="font-size: 14.5px; font-weight: 900; color: var(--text-m); margin-bottom: 8px;">👨‍👩‍👧 짝꿍과 함께 육아하기</div>
                <div style="font-size: 12.5px; color: var(--text-s); font-weight: 600; margin-bottom: 16px; line-height: 1.4;">혼자 하는 육아는 너무 힘들어요.<br>지금 짝꿍을 초대해서 데이터를 공유하세요!</div>
                <button onclick="window.sendKakaoInvite()" style="width: 100%; padding: 14px; border-radius: 12px; background: #FEE500; color: #191F28; font-size: 14.5px; font-weight: 900; border: none; cursor: pointer; box-shadow: 0 2px 6px rgba(254,229,0,0.2); display: flex; justify-content: center; align-items: center; gap: 8px;">
                    💬 카카오톡으로 초대장 보내기
                </button>
            </div>
        `;
    }

    // 🌟 3. 전체 화면 조립하기 (디테일 탭 추가)
    container.innerHTML = `
        <div style="padding: 20px;">
            <div style="font-size: 22px; font-weight: 900; color: var(--text-m); margin-bottom: 24px;">설정</div>

            <!-- 계정 및 프로필 -->
            ${profileHtml}

            <!-- 가족 연동 섹션 -->
            ${syncHtml}

            <!-- 앱 설정 -->
            <div style="font-size: 13.5px; font-weight: 900; color: var(--text-s); margin-bottom: 12px; margin-left: 4px;">앱 설정</div>
            <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; margin-bottom: 24px;">
                <div onclick="window.promptBabyInfo()" style="display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border); cursor: pointer;">
                    <div style="font-size: 14.5px; font-weight: 800; color: var(--text-m);">👶 아기 정보 수정</div>
                    <div style="color: #8B95A1; font-size: 12px;">〉</div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px 20px;">
                    <div style="font-size: 14.5px; font-weight: 800; color: var(--text-m);">🌙 다크 모드 (어두운 화면)</div>
                    <button onclick="window.toggleDarkMode(); window.renderSettingsTab();" style="padding: 6px 16px; border-radius: 20px; border: 1px solid var(--border); background: var(--bg-sub); color: var(--text-m); font-weight: 800; font-size: 12px; cursor: pointer;">
                        ${document.body.classList.contains('dark-mode') ? '켜짐 ON' : '꺼짐 OFF'}
                    </button>
                </div>
            </div>

            <!-- 데이터 관리 -->
            <div style="font-size: 13.5px; font-weight: 900; color: var(--text-s); margin-bottom: 12px; margin-left: 4px;">데이터 관리</div>
            <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; margin-bottom: 24px;">
                <div onclick="window.exportToExcel()" style="display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border); cursor: pointer;">
                    <div style="font-size: 14.5px; font-weight: 800; color: var(--text-m);">📥 기록 데이터 엑셀 내보내기</div>
                </div>
                <div onclick="window.clearAllData()" style="display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; cursor: pointer;">
                    <div style="font-size: 14.5px; font-weight: 800; color: #F04452;">🗑️ 기록 데이터 초기화</div>
                </div>
            </div>

           <!-- 고객 지원 및 약관 (인스타 & 블로그 연결 🚀) -->
            <div style="font-size: 13.5px; font-weight: 900; color: var(--text-s); margin-bottom: 12px; margin-left: 4px;">고객 지원 및 약관</div>
            <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; margin-bottom: 32px;">
                
                <!-- 1. 인스타그램 연결 (ggoom_e2) -->
                <div onclick="window.open('https://www.instagram.com/ggoom_e2', '_blank')" style="display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border); cursor: pointer;">
                    <div style="font-size: 14.5px; font-weight: 800; color: var(--text-m);">💬 인스타그램 DM으로 문의하기</div>
                    <div style="color: #8B95A1; font-size: 12px;">〉</div>
                </div>
                
                <!-- 2. 네이버 블로그 연결 (radiant_ly) -->
                <div onclick="window.open('https://blog.naver.com/radiant_ly', '_blank')" style="display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border); cursor: pointer;">
                    <div style="font-size: 14.5px; font-weight: 800; color: var(--text-m);">📝 육아메이트 블로그 구경하기</div>
                    <div style="color: #8B95A1; font-size: 12px;">〉</div>
                </div>
                
                <!-- 3. 개인정보 처리방침 -->
                <div onclick="location.href='privacy.html'" style="display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--border); cursor: pointer;">
                    <div style="font-size: 14.5px; font-weight: 800; color: var(--text-m);">🛡️ 개인정보 처리방침 및 이용약관</div>
                    <div style="color: #8B95A1; font-size: 12px;">〉</div>
                </div>
                
                <!-- 4. 버전 정보 -->
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px 20px;">
                    <div style="font-size: 14.5px; font-weight: 800; color: var(--text-m);">현재 버전</div>
                    <div style="font-size: 13.5px; font-weight: 800; color: #3182F6;">v1.0.0 최신</div>
                </div>
            </div>

            <!-- 위험 구역 (회원 탈퇴) -->
            ${savedNickname ? `
                <div style="text-align: center; margin-bottom: 40px;">
                    <button onclick="window.unlinkKakao()" style="background: none; border: none; color: #8B95A1; font-size: 12px; font-weight: 700; text-decoration: underline; cursor: pointer;">
                        회원 탈퇴 (카카오 연결 끊기 및 데이터 삭제)
                    </button>
                </div>
            ` : ''}
            
            <div style="text-align: center; color: var(--text-s); font-size: 11px; font-weight: 700; margin-bottom: 40px;">
                Made with 🤍 for our baby
            </div>
        </div>
    `;
};

// ==========================================
// ⚡ 기저귀 [둘 다] 퀵 저장 엔진
// ==========================================
window.saveQuickBoth = async function() {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    
    // '둘 다' 데이터 세팅
    let record = { 
        id: 'trk_' + now.getTime(), 
        time: timeStr, 
        timestamp: now.getTime(), 
        type: 'diaper', 
        subType: '소변+대변', // 통계 화면과 완벽 호환되는 키워드
        status: '' // 퀵 저장이므로 황금변/녹변 상태는 일단 비워둠 (나중에 수정 가능)
    };

    let records = JSON.parse(localStorage.getItem('tosil_tracker_records')) || [];
    records.unshift(record); // 맨 앞에 추가
    if(records.length > 100) records.pop();

    // 🚀 파트너님의 갓벽한 실시간 파이어베이스 연동 로직 태우기!
    if (typeof saveTrackerToFirebase === 'function') {
        await saveTrackerToFirebase(records);
    } else {
        localStorage.setItem('tosil_tracker_records', JSON.stringify(records));
        if(typeof window.updateTrackerDashboard === 'function') window.updateTrackerDashboard();
    }

    // 퀵 모달 닫기 (화면에 떠 있는 모달 강제 종료)
    const activeModals = document.querySelectorAll('[id*="modal"], [id*="sheet"]');
    activeModals.forEach(m => m.style.display = 'none');

    // 성공 메시지 띄우기 및 영수증 버튼 체크
    window.showToast("💧💩 소변과 대변 모두 기록되었습니다!");
    if (typeof window.checkReceiptVisibility === 'function') window.checkReceiptVisibility();
};

// 지금 누른 게 '대변'인지 '둘 다'인지 기억해두는 메모장
window.currentPoopType = '대변'; 

window.openPoopAI = function(type) {
    window.currentPoopType = type; // 누른 버튼 종류 기억하기
    
    // 파트너님이 원래 만들어두신 AI 판독기 여는 함수 그대로 실행!
    if(typeof showPoopAI === 'function') {
        showPoopAI(); 
    }
};

// ==========================================
// 🔗 부부 연동 해지 기능
// ==========================================
window.unlinkFamilySync = function() {
    showConfirm(
        "정말 가족 연동을 해지하시겠습니까?<br><span style='font-size:12px; color:#8B95A1; font-weight:600;'>해지해도 내 폰의 기록은 지워지지 않지만, 더 이상 가족간 실시간으로 공유되지 않습니다.</span>",
        function() {
            // 1. 로컬 스토리지에서 가족 동기화 코드 삭제 (연결 고리 끊기)
            localStorage.removeItem("family_sync_code");
            
            // 2. 알림 띄우기
            window.showToast("💔 가족 연동이 안전하게 해제되었습니다.");
            
            // 3. 1초 뒤에 앱을 새로고침해서 완전 초기화된 상태로 만듦
            setTimeout(() => {
                location.reload(); 
            }, 1000);
        },
        "🔗", // 아이콘
        "해지하기", // 버튼 이름
        "#F04452" // 버튼 색상 (빨간색)
    );
};