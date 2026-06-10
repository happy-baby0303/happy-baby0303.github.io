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
    if(el) el.classList.add('active');
    
    document.querySelectorAll('.panel-block').forEach(p => {
        p.classList.remove('active');
        p.style.display = 'none'; 
    });
    
    const targetPanel = document.getElementById('panel-' + panelId);
    if(targetPanel) {
        targetPanel.classList.add('active');
        targetPanel.style.display = 'block'; 
    }
}

function getV(id) { 
    const el = document.getElementById(id);
    if(!el) return 0;
    return Number(el.value.replace(/,/g,'')) || 0; 
}

function formatNum(el) {
    let v = el.value.replace(/[^0-9]/g, '');
    if(v) el.value = Number(v).toLocaleString();
}

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

function setRegion(region, btn) {
    currentRegion = region;
    const buttons = document.querySelectorAll('.filter-wrap .filter-btn');
    buttons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (currentSubTab === 'event') {
        generateSubFilters(region);
        currentSubRegion = 'all';
    }
    filterPlaces();
}

function toggleAccordion(index) {
    const body = document.getElementById('acc-body-' + index);
    const arrow = document.getElementById('acc-arrow-' + index);
    if(body.style.display === 'block') {
        body.style.display = 'none';
        arrow.style.transform = 'rotate(0deg)';
    } else {
        body.style.display = 'block';
        arrow.style.transform = 'rotate(180deg)';
    }
}

function downloadImg() {
    html2canvas(document.getElementById('capture-area')).then(canvas => {
        const link = document.createElement('a');
        link.download = '토실이네_가계부_진단.png';
        link.href = canvas.toDataURL();
        link.click();
    });
}

function openGoogleForm() {
    window.open('https://forms.gle/YOUR_FORM_ID', '_blank'); 
}

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

const formatter = new Intl.NumberFormat('ko-KR'); 
let currentDonutChart = null; 

function drawDonutChart(d, f, e) {
    const ctx = document.getElementById('donutChart').getContext('2d');
    if(currentDonutChart) {
        currentDonutChart.destroy(); 
    }
    
    currentDonutChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['기저귀/위생', '분유/이유식', '장난감/기타'],
            datasets: [{
                data: [d, f, e],
                backgroundColor: ['#3182F6', '#56D364', '#FFCF54'],
                borderWidth: 0, 
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '72%', 
            plugins: {
                legend: { display: false }, 
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ' ' + context.label + ': ' + formatter.format(context.raw) + '원';
                        }
                    }
                }
            },
            animation: { animateScale: true, animateRotate: true }
        }
    });
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

function promptBabyInfo() {
    const name = prompt("우리아기 이름(태명)을 알려주세요!", "우리아기");
    if(!name) return;
    
    const input = prompt("아기 생년월일을 입력하세요 (예: 20260303)", "20260303");
    if(!input) return;
    
    let formattedDate = input;
    const clean = input.replace(/[^0-9]/g, ''); 
    if (clean.length === 8) {
        formattedDate = `${clean.substring(0,4)}-${clean.substring(4,6)}-${clean.substring(6,8)}`;
    }
    
    const testDate = new Date(formattedDate);
    if (isNaN(testDate.getTime())) { 
        alert("날짜 형식이 올바르지 않습니다."); 
        return; 
    }
    
    localStorage.setItem('tosil_baby', JSON.stringify({name: name, birth: formattedDate}));
    localStorage.setItem('tosil_babyName', name);
    localStorage.setItem('tosil_startDate', formattedDate);
    
    alert("아기 정보가 찰떡같이 저장되었습니다! 🤍");
    location.reload(); 
}

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

function renderBabyInfo() {
    const saved = localStorage.getItem('tosil_baby');
    const nameEl = document.getElementById('res-baby-name');
    const ddayEl = document.getElementById('res-baby-dday');
    const msgEl = document.getElementById('daily-message'); 

    if(!saved) {
        if(nameEl) nameEl.innerText = "이름을 눌러 등록해주세요";
        if(ddayEl) ddayEl.innerText = "D+0일";
        initPlayWidget(null, 0); 
        return;
    }

    try {
        const data = JSON.parse(saved);
        const birthDate = new Date(data.birth);
        const today = new Date();
        const diffDays = Math.ceil((today - birthDate) / (1000*60*60*24));
        const monthAge = Math.floor(diffDays / 30.436875);
        
        if(nameEl) nameEl.innerText = data.name + "의 공간";
        if(ddayEl) ddayEl.innerText = "D+" + diffDays + "일";
        
        const tipObj = babyTips.find(item => monthAge >= item.min && monthAge <= item.max);
        const tipText = tipObj ? tipObj.tip : `오늘도 ${data.name}와(과) 행복한 하루 되세요! 🤍`;
        
        if(msgEl) msgEl.innerText = tipText;

        initPlayWidget(monthAge, diffDays);

    } catch (e) {
        console.error("데이터 오류:", e);
    }
}

const playDB = [
    { minM: 0, maxM: 2, title: "흑백 초점책 눈맞춤", desc: "초점책을 아기 눈에서 20cm 거리에 두고 천천히 좌우로 움직여주세요.", effect: "👀 시각 발달 및 초점 맞추기" },
    { minM: 0, maxM: 2, title: "엄마아빠 인간 오르골", desc: "아기와 눈을 맞추고 부드러운 목소리로 노래를 불러주며 가슴을 살살 토닥여주세요.", effect: "👂 청각 발달 및 애착 형성" },
    { minM: 0, maxM: 2, title: "로션 촵촵 마사지", desc: "목욕 후 로션을 바르며 '우리 아기 다리 길어져라 얍!' 하고 부드럽게 주물러주세요.", effect: "💆 정서 안정 및 혈액순환" },
    { minM: 0, maxM: 2, title: "입술 푸르르~ 진동 놀이", desc: "아기 배나 볼에 입술 대고 '푸르르~' 소리를 내며 간지럼을 태워주세요.", effect: "😊 스킨십 및 정서적 안정감" },
    { minM: 0, maxM: 2, title: "손수건 엄마 냄새 킁킁", desc: "엄마 냄새가 밴 깨끗한 손수건을 아기 코 근처에서 살랑살랑 흔들어주세요.", effect: "👃 후각 자극 및 심리적 안정" },
    { minM: 0, maxM: 2, title: "딸랑이 시선 추적", desc: "딸랑이를 천천히 흔들며 아기 시선이 소리를 따라가도록 유도해 보세요.", effect: "👀 시청각 연합 능력 발달" },

    { minM: 3, maxM: 5, title: "비닐봉지 바스락바스락", desc: "깨끗한 비닐봉지를 아기 귀 옆에서 구겨서 바스락 소리를 들려주세요. (입 주의!)", effect: "👂 청각 자극 및 두뇌 발달" },
    { minM: 3, maxM: 5, title: "으쌰으쌰 터미타임 비행기", desc: "엄마 배 위에 아기를 엎드려 놓고 비행기 소리를 내며 흔들어주세요.", effect: "💪 목/허리(코어) 근육 발달" },
    { minM: 3, maxM: 5, title: "거울 속 까꿍 놀이", desc: "거울 앞에 아기를 안고 서서 '우리 아기 어디 있지?' 하고 놀아주세요.", effect: "🪞 자아 인식 및 호기심 자극" },
    { minM: 3, maxM: 5, title: "딸랑이 양말 팡팡", desc: "아기 발목에 소리 나는 양말이나 방울을 달아주고 발차기를 유도해 보세요.", effect: "🦵 대근육 및 인과관계 인지" },
    { minM: 3, maxM: 5, title: "다양한 수건 촉감 놀이", desc: "부드러운 천, 거친 수건 등을 번갈아가며 아기 손과 발에 문질러주세요.", effect: "🖐 다양한 촉각 자극" },
    { minM: 3, maxM: 5, title: "옹알이 폭풍 통역사", desc: "아기가 옹알이할 때마다 과장되게 대답해 주세요.", effect: "🗣️ 상호작용 및 언어 발달 기초" },
    { minM: 3, maxM: 5, title: "알록달록 공 굴러가유", desc: "아기가 엎드려 있을 때 눈앞에서 색깔 공을 천천히 굴려 시선을 끌어주세요.", effect: "👀 동체 시력 및 목 가누기" },

    { minM: 6, maxM: 8, title: "수건으로 까꿍!", desc: "엄마 얼굴이나 장난감 위에 얇은 손수건을 올렸다가 '까꿍!' 하며 치워주세요.", effect: "🧠 대상 영속성(기억력) 발달" },
    { minM: 6, maxM: 8, title: "물티슈 캡 쏙쏙 뽑기", desc: "다 쓴 물티슈 통 안에 자투리 천이나 끈을 넣고 아기가 마음껏 뽑게 해주세요.", effect: "🤏 소근육 조작 및 성취감" },
    { minM: 6, maxM: 8, title: "이유식 용기 난타 밴드", desc: "플라스틱 용기를 엎어두고 나무 숟가락으로 신나게 두드리며 놀게 해주세요.", effect: "🥁 인과관계 이해 및 스트레스 해소" },
    { minM: 6, maxM: 8, title: "포스트잇 떼기", desc: "바닥이나 팝업 높이에 포스트잇을 붙여두고 아기가 직접 떼보게 하세요.", effect: "🖐 손끝 소근육(잡기) 발달" },
    { minM: 6, maxM: 8, title: "종이컵 성 무너뜨리기", desc: "종이컵을 높이 쌓아준 뒤, 아기가 손으로 쳐서 와르르 무너뜨리게 해주세요.", effect: "💥 스트레스 해소 및 시각적 자극" },
    { minM: 6, maxM: 8, title: "지퍼백 촉감 봉투", desc: "지퍼백 안에 물감이나 밀가루 반죽을 밀봉하고 꾹꾹 누르거나 밟게 해주세요.", effect: "🎨 안전한 오감 촉각 발달" },
    { minM: 6, maxM: 8, title: "거실 텐트 숨바꼭질", desc: "식탁 밑이나 소파 뒤에 숨어서 아기가 기어 와서 찾게 유도해 보세요.", effect: "🏃‍♂️ 대근육 및 공간 지각 능력" },

    { minM: 9, maxM: 12, title: "이불 속 장난감 구출 작전", desc: "아기가 보는 앞에서 최애 장난감을 이불 밑에 숨기고 찾아보게 하세요.", effect: "🕵️‍♂️ 문제 해결 능력 및 공간 지각" },
    { minM: 9, maxM: 12, title: "휴지심 터널 통과하기", desc: "다 쓴 휴지심 안으로 작은 공이나 장난감을 통과시키며 '슝~' 소리를 내주세요.", effect: "👁️ 눈-손 협응력 발달" },
    { minM: 9, maxM: 12, title: "스티커 떼기 놀이", desc: "엄마 손등이나 바닥에 큰 스티커를 살짝 붙여두고 아기가 엄지와 검지로 떼게 해주세요.", effect: "🖐 정교한 소근육 발달" },
    { minM: 9, maxM: 12, title: "통 안에 쏙쏙", desc: "빈 분유통이나 바구니에 작은 블록이나 공을 '쏙!' 소리와 함께 넣고 빼보세요.", effect: "🗑️ 공간 개념 및 조작 능력" },
    { minM: 9, maxM: 12, title: "거실 이불 썰매 타기", desc: "도톰한 담요 위에 아기를 앉히고 바닥에서 천천히 슝~ 썰매처럼 끌어주세요.", effect: "🎢 균형 감각 및 전정기관 자극" },
    { minM: 9, maxM: 12, title: "맘마 먹여주기 코스프레", desc: "애착 인형을 가져와서 아기가 직접 숟가락으로 밥을 먹여주는 흉내를 내게 하세요.", effect: "🧸 모방 행동 및 사회성 발달" },
    { minM: 9, maxM: 12, title: "그림책 스스로 넘기기", desc: "두꺼운 보드북을 주고 아기가 직접 책장을 넘길 때마다 크게 칭찬해 주세요.", effect: "📖 소근육 및 책과 친해지기" },

    { minM: 13, maxM: 24, title: "신문지 마구 찢기 놀이", desc: "다 쓴 신문지나 이면지를 아기와 함께 북북 찢으며 종이 비를 내려주세요.", effect: "💥 대소근육 발달 및 스트레스 팡팡" },
    { minM: 13, maxM: 24, title: "종이컵 볼링 게임", desc: "종이컵을 쌓아두고 부드러운 공을 굴려서 쓰러뜨리며 환호해 주세요.", effect: "🎳 방향 감각 및 성취감" },
    { minM: 13, maxM: 24, title: "이불 돌돌 김밥 말기", desc: "아기를 이불 위에 눕히고 '김밥 말자~' 하며 돌돌 말았다가 간지럼 태우며 풀어주세요.", effect: "🍙 스킨십 및 신체 인지 능력" },
    { minM: 13, maxM: 24, title: "마스킹 테이프 징검다리", desc: "바닥에 테이프로 선을 붙여두고, 선을 따라 걷거나 점프하는 놀이를 해보세요.", effect: "👣 대근육 및 신체 조절력" },
    { minM: 13, maxM: 24, title: "동물농장 흉내 내기", desc: "아빠가 먼저 '사자 어흥!', '토끼 깡총!' 흉내를 내고 아기가 따라 하게 해보세요.", effect: "🦁 모방 능력 및 언어 표현력" },
    { minM: 13, maxM: 24, title: "상자 구멍에 빨대 꽂기", desc: "구멍 뚫린 상자나 스티로폼에 아기가 직접 빨대를 콕콕 꽂게 유도해 보세요.", effect: "🎯 집중력 및 정교한 눈-손 협응" },
    { minM: 13, maxM: 24, title: "안전 풍선 배구", desc: "가벼운 풍선을 불어 거실에서 떨어지지 않게 톡톡 치며 배구 놀이를 해보세요.", effect: "🎈 순발력 및 대근육 발달" },

    { minM: 25, maxM: 36, title: "색깔 요정 분류하기", desc: "색깔이 다른 블록이나 장난감을 섞어두고 '빨간색은 어디 있을까?' 하며 모아보세요.", effect: "🎨 인지 능력 및 논리적 사고" },
    { minM: 25, maxM: 36, title: "병원 놀이 / 마트 놀이", desc: "아기가 의사 선생님이나 계산원이 되어 부모님과 상황극을 해보세요.", effect: "🗣️ 사회성 및 언어 능력 발달" },
    { minM: 25, maxM: 36, title: "식탁 밑 나만의 비밀기지", desc: "식탁이나 의자 위에 큰 담요를 덮어 텐트를 만들어주고 그 안에서 랜턴을 켜주세요.", effect: "⛺ 독립심 및 상상력 자극" },
    { minM: 25, maxM: 36, title: "불 끄고 그림자 극장", desc: "방 불을 끄고 휴대폰 손전등으로 벽에 강아지, 새 등 손 그림자를 만들어 보세요.", effect: "🦅 시각적 상상력 및 창의력" },
    { minM: 25, maxM: 36, title: "현관 신발 짝꿍 찾기", desc: "아빠, 엄마, 아기 신발을 섞어두고 '엄마 신발 짝꿍 찾아주세요!' 하고 미션을 주세요.", effect: "👟 짝 맞추기(인지) 및 성취감" },
    { minM: 25, maxM: 36, title: "휴지심 망원경 탐험", desc: "휴지심 2개를 이어 붙여 망원경을 만들고 '저기 뭐가 보이나요?' 하며 탐험해보세요.", effect: "🔭 상상력 및 관찰력 향상" },
    { minM: 25, maxM: 36, title: "눈 감고 과일 맛 맞추기", desc: "아기 눈을 가리고 과일 조각을 입에 쏙 넣어준 뒤 무슨 맛인지 맞춰보게 하세요.", effect: "👅 미각 자극 및 어휘력 발달" },
    { minM: 25, maxM: 36, title: "빨래 개기 보조 요원", desc: "수건이나 양말을 같이 개면서 '이건 아빠 거, 이건 하윤이 거!' 하고 분류해 보세요.", effect: "👕 일상생활 참여 및 소속감" }
];

let currentAvailablePlays = [];
let currentDday = 0;

function initPlayWidget(months, dday) {
    const badgeEl = document.getElementById('play-dday-badge');
    const titleEl = document.getElementById('play-title');
    const descEl = document.getElementById('play-desc');
    const effectEl = document.getElementById('play-effect');

    if (months === null || isNaN(months) || !titleEl) {
        if(badgeEl) badgeEl.innerText = "0";
        if(titleEl) titleEl.innerText = "아기 정보를 등록해주세요!";
        if(descEl) descEl.innerText = "상단 연필 버튼을 눌러 생일을 입력하면 놀이가 추천됩니다.";
        if(effectEl) effectEl.style.display = "none";
        currentAvailablePlays = [];
        return;
    }

    if(badgeEl) badgeEl.innerText = dday > 0 ? dday : 0;
    currentDday = dday > 0 ? dday : 0;
    
    currentAvailablePlays = playDB.filter(p => months >= p.minM && months <= p.maxM);
    renderPlay(currentDday);
}

function renderPlay(index) {
    const titleEl = document.getElementById('play-title');
    const descEl = document.getElementById('play-desc');
    const effectEl = document.getElementById('play-effect');

    if(!titleEl) return;

    if(currentAvailablePlays.length > 0) {
        const play = currentAvailablePlays[index % currentAvailablePlays.length];
        titleEl.innerText = play.title;
        descEl.innerText = play.desc;
        if(effectEl) {
            effectEl.innerText = play.effect;
            effectEl.style.display = "inline-block";
        }
    } else {
        titleEl.innerText = "온 집안이 놀이터! 🏃‍♂️";
        descEl.innerText = "오늘은 아기가 좋아하는 장난감으로 맘껏 놀아주세요!";
        if(effectEl) effectEl.style.display = "none";
    }
}

function shufflePlay() {
    if(currentAvailablePlays.length > 0) {
        const randomIndex = Math.floor(Math.random() * currentAvailablePlays.length);
        renderPlay(randomIndex);
        
        const btn = document.getElementById('btn-shuffle-play');
        if(btn) {
            btn.style.transform = 'rotate(180deg)';
            btn.style.transition = 'transform 0.3s ease';
            setTimeout(() => { btn.style.transform = 'rotate(0deg)'; btn.style.transition = 'none'; }, 300);
        }
    }
}

function filterPlaces() {
    const keyword = document.getElementById('spot-search').value.toLowerCase().trim();
    const container = document.getElementById('hotplace-container');
    container.innerHTML = ''; 
    
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    const todayNum = parseInt(`${yyyy}${mm}${dd}`);

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

            let rawEndDate = p.eventenddate || p.endDate || '';
            if (rawEndDate) {
                let endStr = String(rawEndDate).replace(/[^0-9]/g, '');
                if (endStr.length >= 8) {
                    let endNum = parseInt(endStr.substring(0, 8));
                    if (endNum < todayNum) return false; 
                }
            }

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
        
        if(filteredEvents.length === 0) { 
            container.innerHTML = `<p style="text-align:center; padding:50px 0; color:var(--text-sub); font-size:14px; font-weight:700;">🔍 예정된 주말 아동 친화 행사가 없습니다.</p>`; 
            return; 
        }
        
        const gridEl = document.createElement('div');
        gridEl.className = 'festival-grid';
        
        filteredEvents.forEach(item => {
            const title = item.title || '';
            const addr = item.addr1 || item.addr || item.locText || '';
            const rawImg = item.firstimage || '';
            let startDate = item.eventstartdate || item.datetime || '';
            if(startDate.length >= 8) startDate = `${startDate.substring(4,6)}.${startDate.substring(6,8)}`;
            let endDate = item.eventenddate || '';
            if(endDate.length >= 8) endDate = `${endDate.substring(4,6)}.${endDate.substring(6,8)}`;
            
            const dateText = endDate ? `${startDate} ~ ${endDate}` : startDate;
            const tel = item.tel || '정보없음';
            const review = item.review || '';
            const addrParts = addr.split(' ');
            const shortAddr = `${addrParts[0] || ''} ${addrParts[1] || ''}`.replace('특별', '').replace('광역', '');
            const card = document.createElement('div');
            
            card.className = 'fest-card';
            let imgHtml = '';
            let modalImgParam = rawImg;
            
            if (rawImg) { 
                imgHtml = `<img src="${rawImg}" alt="${title}" onerror="this.style.display='none'; this.parentNode.innerHTML += '<div style=\'width:100%; height:100%; background:linear-gradient(135deg, #EBF4FF, #EAEFF7); display:flex; align-items:center; justify-content:center; font-size:32px;\'>🎈</div>';">`; 
            } else { 
                imgHtml = `<div style="width:100%; height:100%; background:linear-gradient(135deg, #EBF4FF, #EAEFF7); display:flex; align-items:center; justify-content:center; font-size:32px;">🎪</div>`; 
                modalImgParam = '⚙️GRAPHIC'; 
            }
            
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
        
        if(filteredPlaces.length === 0) { 
            container.innerHTML = `<p style="text-align:center; padding:35px; color:var(--text-sub); font-size:14px; font-weight:700;">🔍 아직 등록된 검증 육아지도가 없습니다. 첫 제보자가 되어주세요!</p>`; 
            return; 
        }
        
        filteredPlaces.forEach((p, index) => {
            let tagsHTML = p.tags.map(tag => `<span class="tag ${tag.c}">${tag.t}</span>`).join('');
            let timeHTML = p.datetime ? `<div style="font-size: 12.5px; color: var(--primary); font-weight: 800; margin-bottom: 8px; background: rgba(49,130,246,0.06); padding: 6px 10px; border-radius: 8px; display: inline-block;">⏰ ${p.datetime}</div>` : '';
            let accordionHTML = `<div class="accordion-item"><div class="accordion-header" onclick="toggleAccordion(${index})"><div class="accordion-title-wrap"><span class="place-loc">${p.locText}</span><strong style="color:var(--text-m); font-weight:800; font-size:15px;">${p.title}</strong><span style="font-size: 14.5px;">${p.emoji}</span></div><span id="acc-arrow-${index}" class="accordion-arrow">▼</span></div><div id="acc-body-${index}" class="accordion-body">${timeHTML}<div class="place-desc">${p.desc}</div><div>${tagsHTML}</div><div class="place-review"><strong>💬 팩트 검증 피드:</strong> "${p.review}"</div><button class="btn-main" style="margin-top:16px; font-size:14px; padding:12px;" onclick="openFestivalModal('${p.title}', '${p.datetime || '상시 운영'}', '${p.locText}', '정보없음', '${p.review}', '${p.query}', '')">🚗 내비게이션 길찾기 및 상세 정보 열기 〉</button></div></div>`;
            container.innerHTML += accordionHTML;
        });
    }
}

function uploadPhoto(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
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

                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                localStorage.setItem('tosil_baby_photo', dataUrl);
                
                const imgEl = document.querySelector('.home-hero-img');
                imgEl.src = dataUrl;
                imgEl.style.display = 'block';
                imgEl.parentNode.style.background = 'none';
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function loadBabyPhoto() {
    const savedPhoto = localStorage.getItem('tosil_baby_photo');
    if (savedPhoto) {
        const imgEl = document.querySelector('.home-hero-img');
        imgEl.src = savedPhoto;
        imgEl.style.display = 'block';
        imgEl.parentNode.style.background = 'none';
    }
}

function toggleDarkMode() {
    const body = document.body;
    body.classList.toggle('dark-mode');
    const isDark = body.classList.contains('dark-mode');
    
    document.getElementById('dark-mode-toggle').innerText = isDark ? '☀️' : '🌙';
    localStorage.setItem('tosil_dark_mode', isDark ? 'on' : 'off');
}

function initDarkMode() {
    const savedMode = localStorage.getItem('tosil_dark_mode');
    if (savedMode === 'on') {
        document.body.classList.add('dark-mode');
        document.getElementById('dark-mode-toggle').innerText = '☀️';
    }
}

window.selectedPillType = ''; 
window.feverChartObj = null; 
window.feverTimerInterval = null; 

function checkPillLock(type) {
    let records = JSON.parse(localStorage.getItem('tosil_fever_records')) || [];
    if (records.length === 0) return { locked: false };

    const now = new Date().getTime();
    const CROSS_INTERVAL = 2 * 60 * 60 * 1000;
    const SAME_INTERVAL = 4 * 60 * 60 * 1000;

    if (!records[0].timestamp) return { locked: false };

    const lastAny = records[0];
    const lastSame = records.find(r => r.type === type);

    if (now - lastAny.timestamp < CROSS_INTERVAL) {
        const min = Math.floor((CROSS_INTERVAL - (now - lastAny.timestamp)) / 60000);
        return { locked: true, reason: `어떤 약이든 최소 2시간(교차복용)이 지나야 합니다.\n(약 ${min}분 남음)` };
    }

    if (lastSame && (now - lastSame.timestamp < SAME_INTERVAL)) {
        const min = Math.floor((SAME_INTERVAL - (now - lastSame.timestamp)) / 60000);
        return { locked: true, reason: `같은 약은 최소 4시간 간격이 필요합니다.\n(약 ${min}분 남음)` };
    }

    return { locked: false };
}

function selectPill(type) {
    if (!type) {
        window.selectedPillType = '';
        return;
    }

    const lockStatus = checkPillLock(type);
    if (lockStatus.locked) {
        alert('🚨 [투약 불가] ' + lockStatus.reason);
        return; 
    }

    window.selectedPillType = type;

    const redBtn = document.getElementById('btn-pill-red');
    const blueBtn = document.getElementById('btn-pill-blue');

    if(redBtn) {
        redBtn.style.background = '#FFF';
        redBtn.style.border = '1px solid #E5E8EB';
        redBtn.style.opacity = '0.4';
    }
    if(blueBtn) {
        blueBtn.style.background = '#FFF';
        blueBtn.style.border = '1px solid #E5E8EB';
        blueBtn.style.opacity = '0.4';
    }

    if (type === 'red' && redBtn) {
        redBtn.style.background = 'rgba(255, 75, 43, 0.1)';
        redBtn.style.border = '2px solid #FF4B2B';
        redBtn.style.opacity = '1';
    } else if (type === 'blue' && blueBtn) {
        blueBtn.style.background = 'rgba(49, 130, 246, 0.1)';
        blueBtn.style.border = '2px solid #3182F6';
        blueBtn.style.opacity = '1';
    }
}

function addFeverRecord() {
    const temp = parseFloat(document.getElementById('v-temp').value);
    if(!temp || !window.selectedPillType) {
        alert('체온과 먹인 약의 종류를 모두 선택해주세요!');
        return;
    }
    
    const lockStatus = checkPillLock(window.selectedPillType);
    if (lockStatus.locked) {
        alert('🚨 [저장 실패] ' + lockStatus.reason);
        return;
    }
    
    const s1 = document.getElementById('sym-cough').checked ? '🤧기침/콧물' : '';
    const s2 = document.getElementById('sym-vomit').checked ? '🤮구토' : '';
    const s3 = document.getElementById('sym-diarrhea').checked ? '💩설사' : '';
    const s4 = document.getElementById('sym-nofood').checked ? '😰밥거부' : '';
    const symptoms = [s1, s2, s3, s4].filter(Boolean);
    
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    
    const record = { 
        time: timeStr, 
        temp: temp, 
        type: window.selectedPillType, 
        timestamp: now.getTime(),
        symptoms: symptoms 
    };
    
    let records = JSON.parse(localStorage.getItem('tosil_fever_records')) || [];
    records.unshift(record); 
    if(records.length > 10) records.pop(); 
    
    localStorage.setItem('tosil_fever_records', JSON.stringify(records));
    
    document.getElementById('v-temp').value = '';
    window.selectedPillType = '';
    document.getElementById('sym-cough').checked = false;
    document.getElementById('sym-vomit').checked = false;
    document.getElementById('sym-diarrhea').checked = false;
    document.getElementById('sym-nofood').checked = false;
    
    const redBtn = document.getElementById('btn-pill-red');
    const blueBtn = document.getElementById('btn-pill-blue');
    if(redBtn) { redBtn.style.background='#FFF'; redBtn.style.border='1px solid #E5E8EB'; redBtn.style.opacity='1'; }
    if(blueBtn) { blueBtn.style.background='#FFF'; blueBtn.style.border='1px solid #E5E8EB'; blueBtn.style.opacity='1'; }
    
    renderFeverTimeline();
    setTimeout(updateHomeDashboard, 100); 
}

function renderFeverTimeline() {
    const container = document.getElementById('fever-timeline');
    if(!container) return; 

    let records = JSON.parse(localStorage.getItem('tosil_fever_records')) || [];
    
    if(records.length === 0) {
        container.innerHTML = '<div style="text-align:center; font-size:13px; opacity:0.6; padding:20px;">아직 기록된 투약 내역이 없습니다.</div>';
        document.getElementById('fever-timer-box').style.display = 'none';
        document.getElementById('fever-chart-container').style.display = 'none';
        document.getElementById('fever-alert').style.display = 'none';
        
        if(window.feverTimerInterval) clearInterval(window.feverTimerInterval);
        return;
    }
    
    let html = '';
    records.forEach(r => {
        const pillLabel = r.type === 'red' ? '🔴 아세트 (빨강)' : '🔵 이부 (파랑)'; 
        const tempStyle = r.temp >= 38.5 ? 'color:#FF4B2B; font-weight:900;' : 'font-weight:800;';
        
        let symHtml = '';
        if (r.symptoms && r.symptoms.length > 0) {
            symHtml = `<div style="margin-top:8px; font-size:11.5px; color:var(--text-s); background:#F9FAFB; padding:6px 10px; border-radius:8px; display:inline-block; font-weight:700;">🚨 동반증상: ${r.symptoms.join(', ')}</div>`;
        }
        
        html += `
        <div class="timeline-item" style="padding:16px 12px; border-bottom:1px solid #E5E8EB;">
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:14px;">
                <span style="font-weight:800; opacity:0.7; width:45px;">${r.time}</span>
                <span style="flex:1; text-align:center; font-weight:800;">${pillLabel}</span>
                <span style="${tempStyle}">${r.temp}℃</span>
            </div>
            ${symHtml}
        </div>`;
    });
    container.innerHTML = html;

    document.getElementById('fever-chart-container').style.display = 'block';
    document.getElementById('fever-timer-box').style.display = 'block'; 
    
    if(typeof drawFeverChart === "function") drawFeverChart(records);

    if(window.feverTimerInterval) clearInterval(window.feverTimerInterval);
    updateFeverTimer(records); 
    window.feverTimerInterval = setInterval(() => updateFeverTimer(records), 1000);
}

function updateFeverTimer(records) {
    if (!records || records.length === 0) return;

    const redLock = checkPillLock('red');
    const blueLock = checkPillLock('blue');

    const redBtn = document.getElementById('btn-pill-red');
    const blueBtn = document.getElementById('btn-pill-blue');
    const timerRedEl = document.getElementById('timer-red');
    const timerBlueEl = document.getElementById('timer-blue');

    if (redBtn) {
        if (redLock.locked) {
            redBtn.style.background = 'var(--bg-sub, #F2F5F8)';
            redBtn.style.border = '1px solid var(--border)';
            redBtn.style.opacity = '0.3';
            redBtn.style.cursor = 'not-allowed';
        } else if (window.selectedPillType !== 'red') {
            redBtn.style.background = '#FFF';
            redBtn.style.border = '1px solid #E5E8EB';
            redBtn.style.opacity = '1';
            redBtn.style.cursor = 'pointer';
        }
    }

    if (blueBtn) {
        if (blueLock.locked) {
            blueBtn.style.background = 'var(--bg-sub, #F2F5F8)';
            blueBtn.style.border = '1px solid var(--border)';
            blueBtn.style.opacity = '0.3';
            blueBtn.style.cursor = 'not-allowed';
        } else if (window.selectedPillType !== 'blue') {
            blueBtn.style.background = '#FFF';
            blueBtn.style.border = '1px solid #E5E8EB';
            blueBtn.style.opacity = '1';
            blueBtn.style.cursor = 'pointer';
        }
    }

    if (timerRedEl) {
        timerRedEl.innerText = redLock.locked ? redLock.reason.split('\n')[1] : "✅ 즉시 복용 가능";
        timerRedEl.style.color = redLock.locked ? "var(--danger)" : "#2ECC71";
    }
    if (timerBlueEl) {
        timerBlueEl.innerText = blueLock.locked ? blueLock.reason.split('\n')[1] : "✅ 즉시 복용 가능";
        timerBlueEl.style.color = blueLock.locked ? "var(--danger)" : "#2ECC71";
    }
}

function clearFeverRecord() {
    if(!confirm('전체 투약 기록을 지우시겠습니까?')) return;
    localStorage.removeItem('tosil_fever_records');
    window.selectedPillType = '';
    
    const redBtn = document.getElementById('btn-pill-red');
    const blueBtn = document.getElementById('btn-pill-blue');
    
    if(redBtn) { 
        redBtn.style.opacity = '1'; 
        redBtn.style.background = '#FFF'; 
        redBtn.style.border = '1px solid #E5E8EB'; 
        redBtn.style.cursor = 'pointer';
    }
    if(blueBtn) { 
        blueBtn.style.opacity = '1'; 
        blueBtn.style.background = '#FFF'; 
        blueBtn.style.border = '1px solid #E5E8EB'; 
        blueBtn.style.cursor = 'pointer';
    }
    
    renderFeverTimeline();
    setTimeout(updateHomeDashboard, 100);
}

function drawFeverChart(records) {
    const ctx = document.getElementById('feverChart').getContext('2d');
    if(window.feverChartObj) window.feverChartObj.destroy(); 

    const chartData = [...records].reverse(); 
    const labels = chartData.map(r => r.time);
    const temps = chartData.map(r => r.temp);

    window.feverChartObj = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '체온 변화 (℃)',
                data: temps,
                borderColor: '#FF4B2B',
                backgroundColor: 'rgba(255, 75, 43, 0.1)',
                borderWidth: 3,
                pointBackgroundColor: temps.map(t => t >= 38.5 ? '#FF4B2B' : '#3182F6'),
                pointRadius: 5,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { 
                y: { min: 36.5, max: 40.5 },
                x: { grid: { display: false } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

let checklistData = [];

function openChecklistModal() {
    let months = 0;
    let targetDate = localStorage.getItem('tosil_startDate'); 
    
    if (!targetDate) {
        let savedBabyJSON = localStorage.getItem('tosil_baby');
        if (savedBabyJSON) {
            try {
                const data = JSON.parse(savedBabyJSON);
                if (data.date) targetDate = data.date;
                if (data.birth) targetDate = data.birth;
            } catch(e) {}
        }
    }

    if (targetDate) {
        const today = new Date();
        const bDate = new Date(targetDate);
        const dday = Math.ceil(Math.abs(today - bDate) / (1000 * 60 * 60 * 24));
        months = Math.floor(dday / 30); 
    }

    checklistData = [
        { id: 'c_diaper', label: '기저귀 (넉넉하게 4~5장)', checked: false },
        { id: 'c_wipe', label: '물티슈 & 건티슈', checked: false },
        { id: 'c_cloth', label: '여벌옷 1벌 & 가제 손수건 3장', checked: false },
        { id: 'c_plastic', label: '기저귀 버릴 냄새차단 비닐팩', checked: false }
    ];

    if (months <= 5) {
        checklistData.push({ id: 'c_milk', label: '🍼 분유/모유 & 깨끗한 젖병', checked: false });
        checklistData.push({ id: 'c_thermos', label: '🌡️ 보온병 (분유물)', checked: false });
        checklistData.push({ id: 'c_paci', label: '쪽쪽이 & 쪽쪽이 클립', checked: false });
    } else if (months <= 12) {
        checklistData.push({ id: 'c_food', label: '🥣 이유식 & 전용 숟가락', checked: false });
        checklistData.push({ id: 'c_cup', label: '🥤 빨대컵 (마실 물)', checked: false });
        checklistData.push({ id: 'c_snack', label: '🍘 떡뻥 등 간단한 아기 간식', checked: false });
        checklistData.push({ id: 'c_bib', label: '턱받이 & 아기 수첩', checked: false });
    } else {
        checklistData.push({ id: 'c_meal', label: '🍱 유아식 반찬 & 수저세트', checked: false });
        checklistData.push({ id: 'c_drink', label: '🧃 유아용 음료/물', checked: false });
        checklistData.push({ id: 'c_toy', label: '🧸 간단한 장난감/애착인형', checked: false });
        checklistData.push({ id: 'c_band', label: '🩹 밴드 및 가벼운 구급약', checked: false });
    }

    const savedChecks = JSON.parse(localStorage.getItem('tosil_checklist') || '{}');
    checklistData.forEach(item => {
        if (savedChecks[item.id]) item.checked = true;
    });

    renderChecklist();
    document.getElementById('checklist-modal').style.display = 'flex';
}

function renderChecklist() {
    const container = document.getElementById('checklist-items');
    let htmlString = ""; 
    let checkedCount = 0; 

    checklistData.forEach((item, index) => {
        if(item.checked) checkedCount++;

        const isChecked = item.checked ? 'checked' : '';
        const checkMark = item.checked ? '✔' : '';
        
        htmlString += `
            <div class="check-item ${isChecked}" onclick="toggleCheckItem(${index})" style="cursor:pointer;">
                <div class="check-box">${checkMark}</div>
                <div class="check-text">${item.label}</div>
            </div>
        `;
    });

    if(checkedCount === checklistData.length && checklistData.length > 0) {
        let babyName = "우리아기"; 
        let savedBabyJSON = localStorage.getItem('tosil_baby');
        
        if (savedBabyJSON) {
            try {
                const data = JSON.parse(savedBabyJSON);
                if (data.name) babyName = data.name;
            } catch(e) {}
        } else if (localStorage.getItem('tosil_babyName')) {
            babyName = localStorage.getItem('tosil_babyName');
        }

        if (!babyName || babyName.trim() === "") babyName = "우리아기";

        const lastChar = babyName.charCodeAt(babyName.length - 1);
        const hasBatchim = (lastChar - 44032) % 28 > 0;
        const particle = hasBatchim ? '이랑' : '랑';

        htmlString += `
            <div style="text-align:center; padding: 24px 10px; animation: scaleUp 0.4s ease;">
                <div style="font-size:45px; margin-bottom:10px;">🎉</div>
                <div style="font-size:17px; font-weight:900; color:var(--success, #4A635D);">외출 준비 완벽하게 끝!</div>
                <div style="font-size:13.5px; color:var(--text-s, #888); margin-top:6px;">${babyName}${particle} 잊지 못할 행복한 주말 보내세요 🤍</div>
            </div>
        `;
    }
    
    container.innerHTML = htmlString;
}

function toggleCheckItem(index) {
    checklistData[index].checked = !checklistData[index].checked;
    
    const saveObj = {};
    checklistData.forEach(item => { saveObj[item.id] = item.checked; });
    localStorage.setItem('tosil_checklist', JSON.stringify(saveObj));
    
    renderChecklist();
}

function resetChecklist() {
    if(confirm("모든 준비물 체크를 초기화하시겠습니까?")) {
        localStorage.removeItem('tosil_checklist');
        openChecklistModal(); 
    }
}

function closeChecklistForce() { document.getElementById('checklist-modal').style.display = 'none'; }
function closeChecklist(e) { if (e.target.id === 'checklist-modal') closeChecklistForce(); }

function navigateToPanel(targetPanel) {
    if (targetPanel === 'hotplace') {
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        document.getElementById('nav-hotplace').classList.add('active');

        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        document.getElementById('tab-hotplace').classList.add('active');

    } else {
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        const toolboxNav = document.getElementById('nav-toolbox');
        if(toolboxNav) toolboxNav.classList.add('active');

        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        const toolboxTab = document.getElementById('tab-toolbox');
        if(toolboxTab) toolboxTab.classList.add('active');

        let actualPanelId = targetPanel === 'ledger' ? 'money' : targetPanel; 

        document.querySelectorAll('.tool-chip').forEach(el => el.classList.remove('active'));
        const targetChip = document.getElementById('btn-tool-' + actualPanelId);
        if(targetChip) targetChip.classList.add('active');

        document.querySelectorAll('.panel-block').forEach(el => {
            el.classList.remove('active');
            el.style.display = 'none';
        });
        const targetBlock = document.getElementById('panel-' + actualPanelId);
        if(targetBlock) {
            targetBlock.classList.add('active');
            targetBlock.style.display = 'block';
        }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateHomeDashboard() {
    const feverRecords = JSON.parse(localStorage.getItem('tosil_fever_records')) || [];
    const feverCard = document.getElementById('db-fever-card');
    
    if (feverCard) {
        if (feverRecords.length > 0) {
            const lastRecord = feverRecords[0];
            const isHighFever = lastRecord.temp >= 38.5; 
            
            if (isHighFever) {
                feverCard.style.background = 'linear-gradient(135deg, #FF4B2B 0%, #FF416C 100%)';
                feverCard.style.color = 'white';
                feverCard.style.border = 'none';
                const pillLabel = lastRecord.type === 'red' ? '🔴 아세트' : '🔵 이부/덱시';
                feverCard.innerHTML = `
                    <div style="width:100%;">
                        <div style="font-size:13px; font-weight:700; opacity:0.9; margin-bottom:6px;">🚨 고열 상태 (${lastRecord.time} 측정)</div>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div style="font-size:20px; font-weight:900; color:#FFF;">${lastRecord.temp}℃ <span style="font-size:14px; font-weight:700; margin-left:4px; opacity:0.9;">(${pillLabel} 복용)</span></div>
                            <span style="font-size:24px;">🔥</span>
                        </div>
                    </div>
                `;
            } else {
                feverCard.style.background = 'var(--bg-card, #FFF)';
                feverCard.style.color = 'var(--text-m)';
                feverCard.style.border = '1px solid var(--border)';
                feverCard.innerHTML = `
                    <div style="width:100%;">
                        <div style="font-size:13px; font-weight:700; color:var(--text-s); margin-bottom:6px;">최근 체온 기록 (${lastRecord.time} 측정)</div>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div style="font-size:20px; font-weight:900; color:#2ECC71;">${lastRecord.temp}℃ <span style="font-size:14px; font-weight:700; margin-left:4px; color:var(--text-s);">정상범위</span></div>
                            <span style="font-size:24px;">👍</span>
                        </div>
                    </div>
                `;
            }
        } else {
            feverCard.style.background = 'var(--bg-card, #FFF)';
            feverCard.style.color = 'var(--text-m)';
            feverCard.style.border = '1px solid var(--border)';
            feverCard.innerHTML = `
                <div>
                    <div style="font-size:13px; font-weight:700; color:var(--text-s); margin-bottom:4px;">스마트 해열 타이머</div>
                    <div style="font-size:14.5px; font-weight:800; opacity:0.8;">현재 등록된 실시간 체온 기록이 없습니다.</div>
                </div>
                <span style="font-size:24px;">💚</span>
            `;
        }
    }

    const ledgerCard = document.getElementById('db-ledger-card');
    if (ledgerCard) {
        let totalExpense = parseInt(localStorage.getItem('tosil_money_total')) || 0;
        const budget = parseInt(localStorage.getItem('tosil_budget')) || 500000;
        
        if (totalExpense > 0) {
            const percent = Math.min(Math.round((totalExpense / budget) * 100), 100);
            ledgerCard.innerHTML = `
                <div style="width: 100%;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:12px;">
                        <div style="font-size:13px; font-weight:700; color:var(--text-s);">이번 달 육아 소비</div>
                        <div style="font-size:20px; font-weight:900; color:var(--primary); letter-spacing:-0.5px;">${totalExpense.toLocaleString()}원</div>
                    </div>
                    <div style="width:100%; height:10px; background:var(--bg-sub, #F2F5F8); border-radius:6px; overflow:hidden;">
                        <div style="width:${percent}%; height:100%; background:var(--primary); border-radius:6px; transition:width 0.5s ease;"></div>
                    </div>
                </div>
            `;
        } else {
            ledgerCard.innerHTML = `
                <div>
                    <div style="font-size:13px; font-weight:700; color:var(--text-s); margin-bottom:4px;">이번 달 육아 소비 진단</div>
                    <div style="font-size:14.5px; font-weight:800; opacity:0.8;">가계부를 작성하고 실시간 게이지를 확인하세요.</div>
                </div>
                <span style="font-size:24px;">📊</span>
            `;
        }
    }
}

function analyzeMoney() {
    const budgetInput = document.getElementById('v-budget');
    let userBudget = 500000; 
    if (budgetInput && budgetInput.value) {
        userBudget = parseInt(budgetInput.value.replace(/,/g, '')) || 500000;
    }
    localStorage.setItem('tosil_budget', userBudget);

    const d = getV('v-diaper');
    const f = getV('v-food');
    const e = getV('v-etc');
    const total = d + f + e;
    
    if(total === 0) {
        alert("지출하신 금액을 1원이라도 입력해 주세요! 💰");
        return;
    }

    localStorage.setItem('tosil_money_total', total); 

    const history = JSON.parse(localStorage.getItem('TosilBabyApp')) || {};
    const date = new Date();
    const curY = date.getFullYear();
    const curM = date.getMonth() + 1;
    const monthKey = `${curY}-${curM}`;
    
    history[monthKey] = total;
    localStorage.setItem('TosilBabyApp', JSON.stringify(history));
    
    document.getElementById('money-total').innerText = formatter.format(total);
    
    const lastM = curM === 1 ? 12 : curM - 1;
    const lastY = curM === 1 ? curY - 1 : curY;
    const lastKey = `${lastY}-${lastM}`;
    
    let diffMsg = "";
    if(history[lastKey]) {
        const diff = total - history[lastKey];
        if (diff > 0) {
            diffMsg = `지난달보다 <span style="color:var(--danger)">${formatter.format(diff)}원 더 썼어요! 💸</span>`;
        } else if (diff < 0) {
            diffMsg = `지난달보다 <span style="color:var(--success)">${formatter.format(Math.abs(diff))}원 아꼈어요! 🎉</span>`;
        } else {
            diffMsg = `지난달과 지출액이 완벽히 똑같습니다! ⚖️`;
        }
    } else {
        diffMsg = "첫 분석 시작! 이번 달이 기준점이 됩니다.";
    }
    document.getElementById('money-diff').innerHTML = diffMsg;

    const maxVal = Math.max(d, f, e);
    const percent = Math.round((total / userBudget) * 100);
    
    let insightHtml = `<strong style="font-size:15px; display:block; margin-bottom:8px;">📊 소비 인사이트</strong>`;
    
    if (maxVal === d && d > 0) {
        insightHtml += `🧻 <strong>기저귀/위생용품 비중이 1위!</strong><br>기저귀는 핫딜 뜰 때 박스 떼기로 쟁여두는 게 최고입니다. 맘카페 알림을 꼭 켜두세요!`;
    } else if (maxVal === f && f > 0) {
        insightHtml += `🍼 <strong>식비 비중이 1위!</strong><br>아이의 성장 속도를 고려하면 매우 정상입니다! 잘 먹는 건 축복이니 먹는 돈은 절대 아끼지 맙시다 💪`;
    } else if (maxVal === e && e > 0) {
        insightHtml += `🧸 <strong>장난감/기타 비중이 1위!</strong><br>육아의 활력소인 소비입니다! 다만 '새 제품'보다는 '당근마켓'을 적절히 섞으면 효율이 배가 됩니다 🥕`;
    }

    if(percent > 100) {
        insightHtml += `<br><br><span style="color:var(--danger)">🚨 <strong>주의:</strong></span> 목표 예산을 초과했습니다! 충동구매가 없었는지 장바구니를 한 번 더 점검해 보아요!`;
    } else if(percent < 80) {
        insightHtml += `<br><br><span style="color:var(--success)">🌿 <strong>우수:</strong></span> 목표 예산 내에서 아주 알뜰하게 육아 중입니다! 남는 예산으로 아기 통장에 쏙 넣어주는 건 어떨까요?`;
    } else {
        insightHtml += `<br><br>👍 <strong>안정:</strong> 목표 예산에 알맞은 이상적인 육아 소비 패턴입니다. 지금처럼 유지하세요!`;
    }

    document.getElementById('money-insight').innerHTML = insightHtml;
    document.getElementById('money-avg-percent').innerText = `설정한 목표 예산 대비 ${percent}% 수준`;
    
    const resBox = document.getElementById('money-result');
    resBox.style.display = 'block';
    resBox.style.animation = "none"; 
    setTimeout(() => resBox.style.animation = "scaleUp 0.4s ease", 10); 

    setTimeout(() => drawDonutChart(d, f, e), 100);
    
    updateHomeDashboard(); 
}

// ==========================================
// 📈 소아청소년 성장도표 정밀 백분위(Z-score) 및 디데이 위젯 엔진
// ==========================================

const wwList = [{w:5, t:"1차 원더윅스", d:"감각 발달 (모든 것이 낯선 시기)"}, {w:8, t:"2차 원더윅스", d:"패턴 인지 (밤낮 구분 시작)"}, {w:12, t:"3차 원더윅스", d:"부드러운 움직임 (목 가누기)"}, {w:19, t:"4차 원더윅스", d:"변화 인지 (마의 구간-수면퇴행)"}, {w:26, t:"5차 원더윅스", d:"관계 인지 (분리불안 시작)"}, {w:37, t:"6차 원더윅스", d:"분류 인지 (저지레의 시작)"}, {w:46, t:"7차 원더윅스", d:"순서 인지 (조립/쌓기)"}, {w:55, t:"8차 원더윅스", d:"목적 인지 (1주년 폭풍우)"}, {w:64, t:"9차 원더윅스", d:"원칙 인지 (떼쓰기 최고조)"}, {w:75, t:"10차 원더윅스", d:"시스템 인지 (자아 형성)"}];

const vaccineData = [{ maxMonth: 1, desc: "✅ BCG(결핵) 1회<br>✅ B형간염 1차" }, { maxMonth: 2, desc: "✅ B형간염 2차" }, { maxMonth: 3, desc: "✅ DTaP 1차<br>✅ 폴리오(소아마비) 1차<br>✅ 폐렴구균 1차<br>✅ 로타바이러스 1차" }, { maxMonth: 5, desc: "✅ DTaP 2차<br>✅ 폴리오 2차<br>✅ 폐렴구균 2차<br>✅ 로타바이러스 2차" }, { maxMonth: 7, desc: "✅ B형간염 3차<br>✅ DTaP 3차<br>✅ 폴리오 3차<br>✅ 폐렴구균 3차<br>✅ 로타바이러스 3차" }, { maxMonth: 11, desc: "※ 현재(7~11개월)는 <strong>필수 신규 접종이 쉬어가는 달</strong>입니다.<br>독감 시즌일 경우 소아과 상담을 권장합니다." }, { maxMonth: 16, desc: "✅ MMR 1차<br>✅ 수두 1차<br>✅ 일본뇌염 1차<br>✅ 폐렴구균 4차<br>✅ 뇌수막염(Hib) 4차" }, { maxMonth: 24, desc: "✅ DTaP 4차<br>✅ 일본뇌염 2차<br>✅ A형간염 4차" }, { maxMonth: 99, desc: "✅ 영유아 주요 기초 접종 완료 구간" }];

const growthStandard = {
    boy: [ {m:0, h:49.9, w:3.3}, {m:1, h:54.7, w:4.5}, {m:2, h:58.4, w:5.6}, {m:3, h:61.4, w:6.4}, {m:4, h:63.9, w:7.0}, {m:5, h:65.9, w:7.5}, {m:6, h:67.6, w:7.9}, {m:7, h:69.2, w:8.3}, {m:8, h:70.6, w:8.6}, {m:9, h:72.0, w:8.9}, {m:10, h:73.3, w:9.2}, {m:11, h:74.5, w:9.4}, {m:12, h:75.7, w:9.6}, {m:15, h:79.1, w:10.3}, {m:18, h:82.3, w:10.9}, {m:24, h:87.1, w:12.2}, {m:36, h:96.1, w:14.3} ],
    girl: [ {m:0, h:49.1, w:3.2}, {m:1, h:53.7, w:4.2}, {m:2, h:57.1, w:5.1}, {m:3, h:59.8, w:5.8}, {m:4, h:62.1, w:6.4}, {m:5, h:64.0, w:6.9}, {m:6, h:65.7, w:7.3}, {m:7, h:67.3, w:7.6}, {m:8, h:68.7, w:7.9}, {m:9, h:70.1, w:8.2}, {m:10, h:71.5, w:8.5}, {m:11, h:72.8, w:8.7}, {m:12, h:74.0, w:8.9}, {m:15, h:77.5, w:9.6}, {m:18, h:80.7, w:10.2}, {m:24, h:85.5, w:11.5}, {m:36, h:95.0, w:13.9} ]
};

function getPercentile(z) {
    if (z < -3) return 1;
    if (z > 3) return 99;
    let p = 1 / (1 + Math.exp(-z * 1.702));
    return Math.round(p * 100);
}

function calcHealthMaster() {
    const b = document.getElementById('v-birth').value;
    const gender = document.getElementById('v-gender').value;
    
    const hVal = document.getElementById('v-height').value;
    const wVal = document.getElementById('v-weight-growth').value;
    const h = hVal ? parseFloat(hVal) : null;
    const w = wVal ? parseFloat(wVal) : null;

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
    if(curWW) { 
        st.style.background = '#FFF0F1'; st.style.borderColor = '#FFE3E3';
        st.innerHTML = `<div style="font-size:15px; font-weight:900; color:#D32F2F; margin-bottom:6px;">🚨 현재 ${curWW.t} 폭풍우 구간!</div><strong style="color:var(--text-m);">특성:</strong> ${curWW.d}.<br>이유 없는 보챔과 수면퇴행이 올 수 있는 도약기입니다. 엄빠의 멘탈을 꽉 잡고 아기를 많이 안아주세요!`; 
    } else { 
        st.style.background = '#E6F7F2'; st.style.borderColor = '#00B37A';
        st.innerHTML = `<div style="font-size:15px; font-weight:900; color:#00B37A; margin-bottom:6px;">☀️ 맑음! 평온기 유지 중</div>현재 정신 도약 마진이 안정적인 비보챔 시기입니다.<br><span style="font-size:13px; color:var(--text-s);">${nxtWW ? '👉 다음 도약기: <strong>' + nxtWW.t + ' (' + nxtWW.w + '주차)</strong> 대기 중' : '모든 발달 도약 임계 매트릭스를 이수 완료했습니다.'}</span>`; 
    }

    let table = `<tr><th>주차</th><th>진단 단계</th><th>특성 지표</th></tr>`;
    wwList.forEach(x => { let active = (week >= x.w-1 && week <= x.w+1) ? 'class="active" style="background:#FFF0F1; color:#D32F2F;"' : ''; table += `<tr ${active}><td>${x.w-1}~${x.w+1}주</td><td>${x.t}</td><td>${x.d}</td></tr>`; });
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

    const getDesc = (pct, type) => {
        if(pct >= 95) return `매우 큼 (상위 5%)`;
        if(pct >= 75) return `큰 편 (상위 25%)`;
        if(pct >= 25) return `평균 범위 (정상)`;
        if(pct >= 5) return `작은 편 (하위 25%)`;
        return `매우 작음 (소아과 상담 요망)`;
    };

    let pctHeight = null;
    let pctWeight = null;

    if (h) {
        const zHeight = (h - std.h) / sdHeight;
        pctHeight = getPercentile(zHeight);
        document.getElementById('pct-height').innerText = `상위 ${100 - pctHeight}%`;
        document.getElementById('desc-height').innerText = getDesc(pctHeight, '키');
    } else {
        document.getElementById('pct-height').innerText = `-`;
        document.getElementById('desc-height').innerText = `미입력`;
    }

    if (w) {
        const zWeight = (w - std.w) / sdWeight;
        pctWeight = getPercentile(zWeight);
        document.getElementById('pct-weight').innerText = `상위 ${100 - pctWeight}%`;
        document.getElementById('desc-weight').innerText = getDesc(pctWeight, '몸무게');
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

    document.getElementById('growth-result').style.display = 'block';
    
    setTimeout(() => {
        document.getElementById('growth-result').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}

window.onload = () => { 
    loadAllExternalData(); 
    renderBabyInfo(); 
    loadBabyPhoto(); 
    initDarkMode();
    
    document.querySelectorAll('.panel-block').forEach(p => {
        if(!p.classList.contains('active')) p.style.display = 'none';
    });
    
    renderFeverTimeline();
    updateHomeDashboard();
};