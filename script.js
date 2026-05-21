// 1. 상태 변수
let trendChart = null;
let currentRegion = 'all'; 
let currentSubTab = 'event'; 
let apiFestivals = []; 
let hotplacesData = []; 
let currentSubRegion = 'all'; 

// 2. 기본 함수들
function switchTab(id, el) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('tab-' + id).classList.add('active');
    el.classList.add('active');
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
    document.getElementById('seg-' + type).classList.add('active');
    currentSubTab = type;
    currentSubRegion = 'all';
    const subRow = document.getElementById('sub-filter-row');
    if (type === 'event' && currentRegion !== 'all') { generateSubFilters(currentRegion); } 
    else { subRow.style.display = 'none'; }
    filterPlaces();
}

function switchTool(panelId, el) {
    document.querySelectorAll('.tool-chip').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.panel-block').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
    document.getElementById('panel-' + panelId).classList.add('active');
}

function formatNum(el) {
    let v = el.value.replace(/[^0-9]/g, '');
    if(v) el.value = Number(v).toLocaleString();
}

function getV(id) { return Number(document.getElementById(id).value.replace(/,/g,'')) || 0; }

async function loadAllExternalData() {
    try {
        const resFest = await fetch('festivals.json');
        if (resFest.ok) apiFestivals = await resFest.json();
    } catch (e) { console.log(e); }
    try {
        const resPlaces = await fetch('places.json');
        if (resPlaces.ok) hotplacesData = await resPlaces.json();
    } catch (e) { console.log(e); }
    filterPlaces();
}

// 3. 필터링 함수
function generateSubFilters(mainRegion) {
    const subRow = document.getElementById('sub-filter-row');
    const subRegions = new Set();
    let manualEvents = hotplacesData.filter(p => p.isEvent);
    let source = [...apiFestivals, ...manualEvents];

    source.forEach(item => {
        const addr = item.addr1 || item.addr || '';
        let isMatched = false;
        if (mainRegion === 'seoul' && addr.includes('서울')) isMatched = true;
        if (mainRegion === 'gyeonggi' && (addr.includes('경기') || addr.includes('인천'))) isMatched = true;
        if (mainRegion === 'chungcheong' && (addr.includes('충청') || addr.includes('충북') || addr.includes('충남') || addr.includes('대전') || addr.includes('세종'))) isMatched = true;
        if (mainRegion === 'gangwon' && addr.includes('강원')) isMatched = true;
        if (mainRegion === 'jeolla' && (addr.includes('전라') || addr.includes('전북') || addr.includes('전남') || addr.includes('광주'))) isMatched = true;
        if (mainRegion === 'gyeongsang' && (addr.includes('경상') || addr.includes('경북') || addr.includes('경남') || addr.includes('부산') || addr.includes('대구') || addr.includes('울산'))) isMatched = true;
        if (mainRegion === 'jeju' && addr.includes('제주')) isMatched = true;
        if (isMatched) {
            const parts = addr.split(' ');
            if (parts[1]) subRegions.add(parts[1]); 
        }
    });

    if (subRegions.size === 0) { subRow.style.display = 'none'; return; }
    subRow.style.display = 'flex';
    let html = `<button class="filter-btn ${currentSubRegion === 'all' ? 'active' : ''}" style="padding:6px 12px; font-size:12px;" onclick="setSubRegion('all', this)">시·군·구 전체</button>`;
    subRegions.forEach(sub => {
        html += `<button class="filter-btn ${currentSubRegion === sub ? 'active' : ''}" style="padding:6px 12px; font-size:12px;" onclick="setSubRegion('${sub}', this)">${sub}</button>`;
    });
    subRow.innerHTML = html;
}

function setSubRegion(sub, btn) {
    const buttons = document.querySelectorAll('#sub-filter-row .filter-btn');
    buttons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentSubRegion = sub;
    filterPlaces();
}

// 4. 기능 함수들
function openFestivalModal(title, dateText, addr, tel, review, query, image) {
    const body = document.getElementById('modal-dynamic-body');
    const naverUrl = 'https://m.map.naver.com/search2/search.naver?query=' + encodeURIComponent(query);
    const tmapUrl = 'https://search.tmap.co.kr/search.html?keyword=' + encodeURIComponent(query);
    const kakaoUrl = 'https://map.kakao.com/?q=' + encodeURIComponent(query);
    const telLink = tel && tel !== '정보없음' ? `<a href="tel:${tel}" class="modal-call-btn">📞 전화 문의</a>` : `<button class="modal-call-btn" disabled style="opacity:0.4;">📞 번호 없음</button>`;
    const isGraphicPlaceholder = !image || image.startsWith('⚙️');
    const modalImgHtml = (!isGraphicPlaceholder && image) ? `<img src="${image}" style="width:100%; height:160px; object-fit:cover; border-radius:18px; margin-bottom:16px;" onerror="this.style.display='none'">` : '';

    body.innerHTML = `<div class="modal-header-wrap"><span class="modal-emoji">🌲</span><div class="modal-title">${title}</div></div>${modalImgHtml}<div class="modal-meta-box"><div class="modal-meta-row"><span class="modal-meta-label">🗓️ 기간</span><span class="modal-meta-value">${dateText}</span></div><div class="modal-meta-row"><span class="modal-meta-label">📍 장소</span><span class="modal-meta-value">${addr}</span></div></div><div class="place-review" style="margin-top:0; margin-bottom:20px; background:#F2F5F8; border-radius:14px;"><strong>💬 토실이 팩트 체크:</strong> "${review || '공식 지자체 엄선 아동 가족 맞춤형 주말 안전 인프라 축제입니다.'}"</div><div style="font-size:12px; font-weight:800; color:var(--text-s); margin-bottom:8px;">🚗 원클릭 아기랑 모바일 길찾기 서비스</div><div class="modal-navi-container"><a href="${naverUrl}" target="_blank" class="modal-navi-item"><div class="navi-badge-icon naver">N</div><span>네이버 지도</span></a><a href="${tmapUrl}" target="_blank" class="modal-navi-item"><div class="navi-badge-icon tmap">TMAP</div><span>티맵(TMap)</span></a><a href="${kakaoUrl}" target="_blank" class="modal-navi-item"><div class="navi-badge-icon kakao">K</div><span>카카오내비</span></a></div><div class="modal-action-grid">${telLink}<button class="btn-main" style="margin-top:0; padding:16px; border-radius:14px; background:var(--text-m) !important;" onclick="closeFestivalModalForce()">확인 완료</button></div>`;
    document.getElementById('premium-modal').style.display = 'flex';
}

function closeFestivalModal(e) { if(e.target.className === 'modal-overlay') closeFestivalModalForce(); }
function closeFestivalModalForce() { document.getElementById('premium-modal').style.display = 'none'; }
function openSOSModal() {
    document.getElementById('sos-step-choice').style.display = 'block';
    document.getElementById('sos-step-medical').style.display = 'none';
    document.getElementById('sos-step-cry').style.display = 'none';
    document.getElementById('btn-sos-back').style.display = 'none';
    document.getElementById('sos-modal').style.display = 'flex';
}
function closeSOS(e) { if(e.target.id === 'sos-modal') closeSOSForce(); }
function closeSOSForce() { document.getElementById('sos-modal').style.display = 'none'; }
function showSosMedical() { document.getElementById('sos-step-choice').style.display = 'none'; document.getElementById('sos-step-medical').style.display = 'block'; document.getElementById('btn-sos-back').style.display = 'flex'; }
function showSosChecklist() { document.getElementById('sos-step-choice').style.display = 'none'; document.getElementById('sos-step-cry').style.display = 'block'; document.getElementById('btn-sos-back').style.display = 'flex'; }
function toggleHistory() {
    const area = document.getElementById('history-list-area');
    if(area.style.display === 'block') { area.style.display = 'none'; } 
    else {
        const history = JSON.parse(localStorage.getItem('TosilBabyApp')) || {};
        const items = document.getElementById('history-items');
        items.innerHTML = "";
        const sortedKeys = Object.keys(history).sort().reverse();
        if(sortedKeys.length === 0) { items.innerHTML = "<p style='color:#aaa; text-align:center; padding:15px; font-size:13.5px; font-weight:600;'>기록된 지출 인덱스가 없습니다.</p>"; } 
        else {
            sortedKeys.forEach(k => {
                const [y, m] = k.split('-');
                items.innerHTML += `<div class="history-item" style="display:flex; justify-content:space-between; font-size:14px; border-bottom:1px dashed var(--border); padding:10px 2px;"><span>${y}년 ${m}월</span><span style="font-weight:800; color:var(--text-m);">${history[k].toLocaleString()}원</span></div>`;
            });
        }
        area.style.display = 'block';
    }
}
function analyzeMoney() {
    const d = getV('v-diaper'), f = getV('v-food'), e = getV('v-etc');
    const total = d + f + e;
    if(total === 0) return alert("금액을 정확히 입력해주세요.");
    const history = JSON.parse(localStorage.getItem('TosilBabyApp')) || {};
    const date = new Date();
    const curY = date.getFullYear();
    const curM = date.getMonth() + 1;
    const monthKey = `${curY}-${curM}`;
    const lastM = curM === 1 ? 12 : curM - 1;
    const lastY = curM === 1 ? curY - 1 : curY;
    const lastKey = `${lastY}-${lastM}`;
    let diffMsg = "";
    if(history[lastKey]) {
        const diff = total - history[lastKey];
        if(diff > 0) diffMsg = `지난달 대비 <span style="color:var(--danger)">${diff.toLocaleString()}원 증가</span> 🚨`;
        else if(diff < 0) diffMsg = `지난달 대비 <span style="color:var(--success)">${Math.abs(diff).toLocaleString()}원 절감</span> 🎉`;
        else diffMsg = "지난달 대조 평형 상태 유지 ⚖️";
    } else { diffMsg = "첫 세션 벤치마크 데이터 저장 완료."; }
    document.getElementById('money-diff').innerHTML = diffMsg;
    history[monthKey] = total;
    localStorage.setItem('TosilBabyApp', JSON.stringify(history));
    const avgBase = 280000; 
    const percent = Math.round((total / avgBase) * 100);
    document.getElementById('money-total').innerText = total.toLocaleString() + "원";
    document.getElementById('money-avg-percent').innerText = `대한민국 가구 평균 소비치 대비 ${percent}% 수준`;
    const coffee = Math.floor(total / 4500);
    let msg = `☕ 분석 데이터: 당월 지출 총액은 스타벅스 Tall 아메리카노 ${coffee}잔 분량입니다.<br><br>`;
    if(percent > 120) msg += "<span style='color:var(--danger)'>⚠️ 경고:</span> 전국 평균치를 초과했습니다. 소모품 단가 재정비가 요구됩니다.<br><br>";
    else if(percent < 80) msg += "<span style='color:var(--success)'>🌿 안정:</span> 고효율 알뜰 육아 재무 흐름을 보이고 계십니다.<br><br>";
    else msg += "👍 대한민국 표준 통계 가구 집단 스케일 범위 내의 안정적 지출입니다.<br><br>";
    let max = Math.max(d, f, e);
    if(max === d && d > 0) msg += "👉 주 집중 소모 섹터: <strong>기저귀 및 위생용품</strong>";
    else if(max === f && f > 0) msg += "👉 주 집중 소모 섹터: <strong>분유 및 이유식 기본 식재료</strong>";
    else if(max === e && e > 0) msg += "👉 주 집중 소모 섹터: <strong>완구류, 피복 및 기타 아이템</strong>";
    document.getElementById('money-insight').innerHTML = msg;
    document.getElementById('money-result').style.display = 'block';
    setTimeout(() => drawChart(history), 100);
}
function deleteOldChart() { if(trendChart) trendChart.destroy(); }
function drawChart(history) {
    const keys = Object.keys(history).sort();
    const labels = keys.slice(-5).map(k => k.split('-')[1] + "월");
    const vals = keys.slice(-5).map(k => history[k]);
    const ctx = document.getElementById('trendChart').getContext('2d');
    deleteOldChart();
    trendChart = new Chart(ctx, {
        type: 'bar',
        data: { labels: labels, datasets: [{ data: vals, backgroundColor: '#3182F6', borderRadius: 6, barPercentage: 0.5 }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { display: false }, x: { grid: { display: false }, border: { display: false } } }, plugins: { legend: { display: false } } }
    });
}
function toggleCheck(e) { if(e.target.tagName !== 'INPUT') { const cb = document.getElementById('agree-check'); cb.checked = !cb.checked; } }
function calcFever() {
    if(!document.getElementById('agree-check').checked) return alert("⚠️ 위험 고지 및 면책조항 동의 확인이 필요합니다.");
    const w = Number(document.getElementById('v-weight').value);
    if(!w) return alert("체중 값을 계측하여 정확히 입력하십시오.");
    document.getElementById('dose-red').innerText = `${(w*0.3).toFixed(1)} ~ ${(w*0.38).toFixed(1)}`;
    document.getElementById('dose-blue').innerText = `${(w*0.4).toFixed(1)} ~ ${(w*0.5).toFixed(1)}`;
    document.getElementById('fever-result').style.display = 'block';
}

// [아기 기능]
function promptBabyInfo() {
    const name = prompt("우리아기 이름(태명)을 알려주세요!");
    if(!name) return;
    const input = prompt("아기 생년월일을 입력하세요 (예: 20260303)", "20260303");
    if(!input) return;
    let formattedDate = input;
    const clean = input.replace(/[^0-9]/g, ''); 
    if (clean.length === 8) {
        formattedDate = `${clean.substring(0,4)}-${clean.substring(4,6)}-${clean.substring(6,8)}`;
    }
    const testDate = new Date(formattedDate);
    if (isNaN(testDate.getTime())) { alert("날짜 형식이 올바르지 않습니다."); return; }
    localStorage.setItem('tosil_baby', JSON.stringify({name, birth: formattedDate}));
    renderBabyInfo();
}
// [데이터]
const babyTips = [
    { min: 0, max: 1, tip: "지금은 아이와 눈 맞춤을 연습할 시간이에요! 🤍" },
    { min: 2, max: 3, tip: "목 가누기 연습! 하루 5분 터미타임을 시도해보세요. 💪" },
    { min: 4, max: 6, tip: "뒤집기 시작! 주변에 위험한 물건이 없는지 꼭 확인해주세요." },
    { min: 7, max: 12, tip: "분리불안이 생길 수 있어요. '엄마 곧 올게'라고 꼭 말해주세요!" }
];

// [통합 아기 정보 렌더링]
function renderBabyInfo() {
    const saved = localStorage.getItem('tosil_baby');
    const nameEl = document.getElementById('res-baby-name');
    const ddayEl = document.getElementById('res-baby-dday');
    const msgEl = document.getElementById('daily-message'); // 이게 HTML에 있어야 함!

    if(!saved) {
        if(nameEl) nameEl.innerText = "이름을 눌러 등록해주세요";
        if(ddayEl) ddayEl.innerText = "D+0일";
        return;
    }

    try {
        const data = JSON.parse(saved);
        const birthDate = new Date(data.birth);
        const today = new Date();
        
        // 날짜 계산
        const diffDays = Math.ceil((today - birthDate) / (1000*60*60*24));
        const monthAge = Math.floor(diffDays / 30.436875);
        
        // 화면 업데이트
        if(nameEl) nameEl.innerText = data.name + "의 공간";
        if(ddayEl) ddayEl.innerText = "D+" + diffDays + "일";
        
        // 맞춤 조언 찾기
        const tipObj = babyTips.find(item => monthAge >= item.min && monthAge <= item.max);
        const tipText = tipObj ? tipObj.tip : "오늘도 하윤이와 행복한 하루 되세요! 🤍";
        
        // 조언 출력 (HTML에 <div id="daily-message">가 있어야 함)
        if(msgEl) msgEl.innerText = tipText;
    } catch (e) {
        console.error("데이터 오류:", e);
    }
}
function formatDate(str) { if (!str || str.length !== 8) return str; return `${str.substring(4,6)}.${str.substring(6,8)}`; }

// [데이터들]
const wwList = [{w:5, t:"1차 원더윅스", d:"감각 발달 (모든 것이 낯선 시기)"}, {w:8, t:"2차 원더윅스", d:"패턴 인지 (밤낮 구분 시작)"}, {w:12, t:"3차 원더윅스", d:"부드러운 움직임 (목 가누기)"}, {w:19, t:"4차 원더윅스", d:"변화 인지 (마의 구간-수면퇴행)"}, {w:26, t:"5차 원더윅스", d:"관계 인지 (분리불안 시작)"}, {w:37, t:"6차 원더윅스", d:"분류 인지 (저지레의 시작)"}, {w:46, t:"7차 원더윅스", d:"순서 인지 (조립/쌓기)"}, {w:55, t:"8차 원더윅스", d:"목적 인지 (1주년 폭풍우)"}, {w:64, t:"9차 원더윅스", d:"원칙 인지 (떼쓰기 최고조)"}, {w:75, t:"10차 원더윅스", d:"시스템 인지 (자아 형성)"}];
const vaccineData = [{ maxMonth: 1, desc: "✅ BCG(결핵) 1회<br>✅ B형간염 1차" }, { maxMonth: 2, desc: "✅ B형간염 2차" }, { maxMonth: 3, desc: "✅ DTaP 1차<br>✅ 폴리오(소아마비) 1차<br>✅ 폐렴구균 1차<br>✅ 로타바이러스 1차" }, { maxMonth: 5, desc: "✅ DTaP 2차<br>✅ 폴리오 2차<br>✅ 폐렴구균 2차<br>✅ 로타바이러스 2차" }, { maxMonth: 7, desc: "✅ B형간염 3차<br>✅ DTaP 3차<br>✅ 폴리오 3차<br>✅ 폐렴구균 3차<br>✅ 로타바이러스 3차(선택)" }, { maxMonth: 11, desc: "※ 현재(7~11개월)는 <strong>국가 지정 필수 신규 접종이 쉬어가는 달</strong>입니다.<br>독감(인플루엔자) 시즌일 경우 소아과 상담을 권장합니다." }, { maxMonth: 16, desc: "✅ MMR 1차<br>✅ 수두 1차<br>✅ 일본뇌염 1차<br>✅ 폐렴구균 4차<br>✅ 뇌수막염(Hib) 4차" }, { maxMonth: 24, desc: "✅ DTaP 4차<br>✅ 일본뇌염 2차<br>✅ A형간염 4차" }, { maxMonth: 99, desc: "✅ 영유아 주요 기초 접종 완료 구간<br>(독감 등 계절성 질환 및 만 4세 이후 추가 접종은 소아과 문의 요망)" }];
const weightData = [{ m: 0, boy: "3.3", girl: "3.2" }, { m: 1, boy: "4.5", girl: "4.2" }, { m: 2, boy: "5.6", girl: "5.1" }, { m: 3, boy: "6.4", girl: "5.8" }, { m: 4, boy: "7.0", girl: "6.4" }, { m: 5, boy: "7.5", girl: "6.9" }, { m: 6, boy: "7.9", girl: "7.3" }, { m: 7, boy: "8.3", girl: "7.6" }, { m: 8, boy: "8.6", girl: "7.9" }, { m: 9, boy: "8.9", girl: "8.2" }, { m: 10, boy: "9.2", girl: "8.5" }, { m: 11, boy: "9.4", girl: "8.7" }, { m: 12, boy: "9.6", girl: "8.9" }, { m: 15, boy: "10.3", girl: "9.6" }, { m: 18, boy: "10.9", girl: "10.2" }, { m: 24, boy: "12.2", girl: "11.5" }, { m: 36, boy: "14.3", girl: "13.9" }];

function calcHealthMaster() {
    const b = document.getElementById('v-birth').value;
    if(!b) return alert("종합 분석을 위해 기준 출산(예정)일을 입력하세요.");
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
    if(curWW) { st.innerHTML = `<div style="font-size:15px; font-weight:800; color:#B78103; margin-bottom:6px;">🚨 현재 ${curWW.t} 진행 레이어</div><strong>특성 지표:</strong> ${curWW.d}. 영유아 주기성 보챔 패턴이 가중되는 시점이므로 세심한 정서 케어가 요구됩니다.`; } 
    else { st.innerHTML = `<div style="font-size:15px; font-weight:800; color:var(--success); margin-bottom:6px;">☀️ 평온기 유지 레이어</div>정신 도약 발달 마진이 안정적인 비보챔 시기입니다.<br>${nxtWW ? '👉 차기 임계 도약 주기: <strong>' + nxtWW.t + ' (' + nxtWW.w + '주차)</strong> 진입 대기.' : '모든 발달 도약 임계 매트릭스를 이수 완료했습니다.'}`; }
    let table = `<tr><th>주차</th><th>진단 단계</th><th>특성 지표</th></tr>`;
    wwList.forEach(x => { let active = (week >= x.w-1 && week <= x.w+1) ? 'class="active"' : ''; table += `<tr ${active}><td>${x.w-1}~${x.w+1}주</td><td>${x.t}</td><td>${x.d}</td></tr>`; });
    document.getElementById('ww-table').innerHTML = table;
    let vac = vaccineData.find(v => month <= v.maxMonth);
    document.getElementById('vaccine-info').innerHTML = vac ? vac.desc : "해당 월령의 기초 접종 정보가 없습니다.";
    let wInfo = weightData.slice().reverse().find(w => month >= w.m);
    if(!wInfo) wInfo = weightData[0]; 
    document.getElementById('weight-month-label').innerText = wInfo.m;
    document.getElementById('weight-boy').innerText = wInfo.boy + " kg";
    document.getElementById('weight-girl').innerText = wInfo.girl + " kg";
    document.getElementById('growth-result').style.display = 'block';
}

function filterPlaces() {
    const keyword = document.getElementById('spot-search').value.toLowerCase().trim();
    const container = document.getElementById('hotplace-container');
    container.innerHTML = ''; 
    const todayStr = new Date().toISOString().split('T')[0];
    if (currentSubTab === 'event') {
        let manualEvents = hotplacesData.filter(p => p.isEvent);
        let combined = [...apiFestivals, ...manualEvents];
        let uniqueMap = new Map();
        combined.forEach(item => { if(item.title) uniqueMap.set(item.title, item); });
        let eventSource = Array.from(uniqueMap.values());
        const filteredEvents = eventSource.filter(p => {
            let addr = p.addr1 || p.addr || p.locText || '';
            let title = p.title || '';
            if (p.expiryDate && todayStr > p.expiryDate) return false;
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
            let matchesSubRegion = (currentSubRegion === 'all' || addr.includes(currentSubRegion));
            let searchPool = `${title} ${addr}`.toLowerCase();
            let matchesKeyword = searchPool.includes(keyword);
            return matchesRegion && matchesSubRegion && matchesKeyword;
        });
        if(filteredEvents.length === 0) { container.innerHTML = `<p style="text-align:center; padding:50px 0; color:var(--text-sub); font-size:14px; font-weight:700;">🔍 예정된 주말 아동 친화 행사가 없습니다.</p>`; return; }
        const gridEl = document.createElement('div');
        gridEl.className = 'festival-grid';
        filteredEvents.forEach(item => {
            const title = item.title || '';
            const addr = item.addr1 || item.addr || item.locText || '';
            const rawImg = item.firstimage || '';
            const startDate = item.eventstartdate ? formatDate(item.eventstartdate) : (item.datetime ? item.datetime : '');
            const endDate = item.eventenddate ? formatDate(item.eventenddate) : '';
            const dateText = endDate ? `${startDate} ~ ${endDate}` : startDate;
            const tel = item.tel || '정보없음';
            const review = item.review || '';
            const addrParts = addr.split(' ');
            const shortAddr = `${addrParts[0] || ''} ${addrParts[1] || ''}`.replace('특별', '').replace('광역', '');
            const card = document.createElement('div');
            card.className = 'fest-card';
            let imgHtml = '';
            let modalImgParam = rawImg;
            if (rawImg) { imgHtml = `<img src="${rawImg}" alt="${title}" onerror="this.style.display='none'; this.parentNode.innerHTML += '<div style=\'width:100%; height:100%; background:linear-gradient(135deg, #EBF4FF, #EAEFF7); display:flex; align-items:center; justify-content:center; font-size:32px;\'>🎈</div>';">`; } 
            else { imgHtml = `<div style="width:100%; height:100%; background:linear-gradient(135deg, #EBF4FF, #EAEFF7); display:flex; align-items:center; justify-content:center; font-size:32px;">🎪</div>`; modalImgParam = '⚙️GRAPHIC'; }
            card.onclick = () => openFestivalModal(title, dateText, addr, tel, review, title, modalImgParam);
            card.innerHTML = `<div class="fest-card-img-wrap"><span class="fest-dday-tag">🎉 축제</span>${imgHtml}</div><div class="fest-card-info"><div class="fest-card-title">${title}</div><div class="fest-card-meta">${shortAddr}</div></div>`;
            gridEl.appendChild(card);
        });
        container.appendChild(gridEl);
    } else {
        const filteredPlaces = hotplacesData.filter(p => {
            if (p.expiryDate && todayStr > p.expiryDate) return false;
            const matchesType = (p.isEvent === false);
            const matchesRegion = (currentRegion === 'all' || p.region === currentRegion);
            const tagString = p.tags.map(t => t.t).join(' ');
            const searchPool = `${p.title} ${p.desc} ${p.locText} ${tagString}`.toLowerCase();
            const matchesKeyword = searchPool.includes(keyword);
            return matchesType && matchesRegion && matchesKeyword;
        });
        if(filteredPlaces.length === 0) { container.innerHTML = `<p style="text-align:center; padding:35px; color:var(--text-sub); font-size:14px; font-weight:700;">🔍 아직 등록된 검증 육아지도가 없습니다. 첫 제보자가 되어주세요!</p>`; return; }
        filteredPlaces.forEach((p, index) => {
            let tagsHTML = p.tags.map(tag => `<span class="tag ${tag.c}">${tag.t}</span>`).join('');
            let timeHTML = p.datetime ? `<div style="font-size: 12.5px; color: var(--primary); font-weight: 800; margin-bottom: 8px; background: rgba(49,130,246,0.06); padding: 6px 10px; border-radius: 8px; display: inline-block;">⏰ ${p.datetime}</div>` : '';
            let accordionHTML = `<div class="accordion-item"><div class="accordion-header" onclick="toggleAccordion(${index})"><div class="accordion-title-wrap"><span class="place-loc">${p.locText}</span><strong style="color:var(--text-m); font-weight:800; font-size:15px;">${p.title}</strong><span style="font-size: 14.5px;">${p.emoji}</span></div><span id="acc-arrow-${index}" class="accordion-arrow">▼</span></div><div id="acc-body-${index}" class="accordion-body">${timeHTML}<div class="place-desc">${p.desc}</div><div>${tagsHTML}</div><div class="place-review"><strong>💬 팩트 검증 피드:</strong> "${p.review}"</div><button class="btn-main" style="margin-top:16px; font-size:14px; padding:12px;" onclick="openFestivalModal('${p.title}', '${p.datetime || '상시 운영'}', '${p.locText}', '정보없음', '${p.review}', '${p.query}', '')">🚗 내비게이션 길찾기 및 상세 정보 열기 〉</button></div></div>`;
            container.innerHTML += accordionHTML;
        });
    }
}

// 1. 사진 업로드 및 저장 함수
function uploadPhoto(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                // 사진 크기를 가로 800px로 줄이는 캔버스 작업
                const canvas = document.createElement('canvas');
                const maxSize = 800;
                let width = img.width;
                let height = img.height;

                if (width > maxSize) {
                    height *= maxSize / width;
                    width = maxSize;
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // 압축된 데이터를 base64로 변환해서 저장
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7); // 70% 퀄리티로 압축
                localStorage.setItem('tosil_baby_photo', dataUrl);
                
                // 화면 즉시 반영
                document.querySelector('.home-hero-img').src = dataUrl;
                document.querySelector('.home-hero-img').style.display = 'block';
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// 2. 페이지 열릴 때 저장된 사진 불러오기 (window.onload 안에 추가)
function loadBabyPhoto() {
    const savedPhoto = localStorage.getItem('tosil_baby_photo');
    if (savedPhoto) {
        const imgEl = document.querySelector('.home-hero-img');
        imgEl.src = savedPhoto;
        imgEl.style.display = 'block';
        imgEl.parentNode.style.background = 'none';
    }
}

// 최종 실행
window.onload = () => { 
    loadAllExternalData(); 
    renderBabyInfo(); 
    loadBabyPhoto(); //
};