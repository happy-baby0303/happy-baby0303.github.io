const toyData = [
    // 🍼 터미타임 지옥 & 누워있는 시기 (0~4개월)
    { id: 1, name: "타이니러브 모빌", imgIcon: "🎠", freeTime: "40분", milestone: "all", theme: "sos-meal", tags: "#신생아필수 #모빌계의_샤넬", battery: "C형 건전지 3개", fomo: "뒤집기 시작하면 늦습니다. 조리원 퇴소 직후가 뽕 뽑는 골든타임!", coupangLink: "#" },
    { id: 2, name: "블루래빗 꼬꼬맘", imgIcon: "🐔", freeTime: "20분", milestone: "tummy", theme: "sos-meal", tags: "#터미타임_지옥탈출", battery: "AA 건전지 3개", fomo: "터미타임 할 때 안 사면 후회합니다. 길어야 3개월 쓰는 템, 빨리 들이세요!", coupangLink: "#" },
    { id: 3, name: "피셔프라이스 피아노 아기체육관", imgIcon: "🎹", freeTime: "30분", milestone: "tummy", theme: "sos-shower", tags: "#발차기달인 #안전화장실", battery: "AA 건전지 3개", fomo: "타이니모빌 다음 타자! 누워서 발차기 시작하는 50일 경부터가 피크입니다.", coupangLink: "#" },
    { id: 4, name: "라마즈 전신발달 애벌레", imgIcon: "🐛", freeTime: "15분", milestone: "tummy", theme: "sos-out", tags: "#국민애벌레 #바스락바스락", battery: "건전지 필요 없음", fomo: "유모차, 카시트, 침대 어디든 매달아주세요. 시각/촉각 발달의 기본템입니다.", coupangLink: "#" },
    { id: 5, name: "애플비 초점책 세트", imgIcon: "📖", freeTime: "10분", milestone: "tummy", theme: "sos-meal", tags: "#신생아시각발달", battery: "건전지 필요 없음", fomo: "흑백에서 컬러로 넘어가는 시기, 아기 침대 옆에 병풍처럼 둘러주세요.", coupangLink: "#" },
    { id: 6, name: "뽀로로 오뚝이", imgIcon: "🐧", freeTime: "20분", milestone: "tummy", theme: "sos-shower", tags: "#시선고정 #터미타임친구", battery: "건전지 필요 없음", fomo: "엎드려서 고개 들기 힘들어할 때, 눈앞에서 흔들거리면 기를 쓰고 쳐다봅니다.", coupangLink: "#" },

    // 🔄 엎드려 뒤집기 & 앉기 시작 (4~7개월)
    { id: 7, name: "코니스 에듀테이블", imgIcon: "🧮", freeTime: "50분", milestone: "flip", theme: "sos-meal", tags: "#국밥템 #뽕뽑는장난감", battery: "AA 건전지 4개", fomo: "누워있을 때부터 짚고 일어설 때까지! 이거 하나면 1년은 든든합니다.", coupangLink: "#" },
    { id: 8, name: "회전 팝투브 흡착 스피너", imgIcon: "🌀", freeTime: "20분", milestone: "flip", theme: "sos-out", tags: "#식당평화 #유리창착붙", battery: "건전지 필요 없음", fomo: "이유식 시작하셨나요? 하이체어 트레이에 이거 안 붙이면 식사 시간은 전쟁입니다.", coupangLink: "#" },
    { id: 9, name: "튤립 사운드북 (노란색)", imgIcon: "🌷", freeTime: "15분", milestone: "flip", theme: "sos-out", tags: "#외출필수품 #카시트_눈물뚝", battery: "AAA 건전지 2개", fomo: "외출 시 카시트에서 악쓰며 울기 전에 쟁여두세요. 엄마 고막 생명줄입니다.", coupangLink: "#" },
    { id: 10, name: "윈켈 치발기", imgIcon: "🥨", freeTime: "15분", milestone: "flip", theme: "sos-sleep", tags: "#구강기필수 #소근육발달", battery: "건전지 필요 없음", fomo: "손에 잡히는 건 다 입으로 가는 시기, 안전하게 씹고 뜯고 맛보게 해주세요.", coupangLink: "#" },
    { id: 11, name: "하바(HABA) 원목 딸랑이", imgIcon: "🪵", freeTime: "10분", milestone: "flip", theme: "sos-out", tags: "#독일국민템 #안전소재", battery: "건전지 필요 없음", fomo: "플라스틱이 찝찝하다면 무조건 이거! 입에 넣어도 안전한 천연 원목입니다.", coupangLink: "#" },
    { id: 12, name: "젤리캣 버니 애착인형", imgIcon: "🐰", freeTime: "30분", milestone: "all", theme: "sos-sleep", tags: "#수면의식 #국민애착인형", battery: "건전지 필요 없음", fomo: "분리수면 준비하시나요? 엄마 냄새 묻혀서 안겨주면 통잠의 기적이 시작됩니다.", coupangLink: "#" },

    // 🏃 배밀이/기어가기 (7~10개월)
    { id: 13, name: "브이텍 스스로 굴러가는 깜짝볼", imgIcon: "⚽", freeTime: "20분", milestone: "crawl", theme: "sos-sleep", tags: "#기어가기유도 #체력방전", battery: "AA 건전지 3개", fomo: "배밀이 시작할 때 이 공 굴려주면 잡으려고 기어가다가 꿀잠 잡니다.", coupangLink: "#" },
    { id: 14, name: "오볼(O-ball) 오리지널", imgIcon: "🕸️", freeTime: "15분", milestone: "crawl", theme: "sos-out", tags: "#소근육발달 #유모차평화", battery: "건전지 필요 없음", fomo: "손에 힘 생겨서 물건 쥐기 시작할 때 안 사주면 늦습니다!", coupangLink: "#" },
    { id: 15, name: "개구리 연못", imgIcon: "🐸", freeTime: "30분", milestone: "crawl", theme: "sos-shower", tags: "#공놀이 #시선강탈", battery: "C형 건전지 4개", fomo: "공이 톡톡 튀어 오를 때마다 아기 웃음소리 폭발! 엄마 씻을 시간 확보 완료.", coupangLink: "#" },
    { id: 16, name: "타요 빙글빙글 컨트롤 주차타워", imgIcon: "🚌", freeTime: "40분", milestone: "crawl", theme: "sos-meal", tags: "#자동차입문 #아빠도같이", battery: "AAA 건전지 2개", fomo: "자동차 장난감의 끝판왕. 이거 하나면 아빠한테 애 맡기고 외출 가능합니다.", coupangLink: "#" },
    { id: 17, name: "어스본 사운드북 (동물농장)", imgIcon: "🐮", freeTime: "20분", milestone: "crawl", theme: "sos-out", tags: "#청각발달 #외출템", battery: "LR1130 건전지 3개", fomo: "버튼 누르는 재미에 빠진 아기들, 책상에 앉혀두고 이것만 줘도 조용해집니다.", coupangLink: "#" },
    { id: 18, name: "립프로그 에듀튜브 (알파벳)", imgIcon: "🔤", freeTime: "25분", milestone: "crawl", theme: "sos-meal", tags: "#이중언어노출 #버튼지옥", battery: "AA 건전지 2개", fomo: "의미 없이 누르기만 해도 영어가 쏙쏙! 조기 교육과 시간 확보를 동시에.", coupangLink: "#" },

    // 🧗 잡고 일어서기 & 걸음마 (10개월 이상)
    { id: 19, name: "오리지널 졸리점퍼", imgIcon: "🦘", freeTime: "30분", milestone: "stand", theme: "sos-sleep", tags: "#꿀잠_방전용 #엄마_커피타임", battery: "건전지 필요 없음", fomo: "아기 몸무게 13kg 넘어가면 못 탑니다. 허벅지 힘 생기는 딱 '지금' 사야 해요!", coupangLink: "#" },
    { id: 20, name: "이븐플로 아마존 엑서쏘서", imgIcon: "🌴", freeTime: "40분", milestone: "stand", theme: "sos-shower", tags: "#가둬두기최고 #안전제일", battery: "AAA 건전지 9개", fomo: "엄마 화장실 갈 때 안전하게 가둬둘(?) 유일한 구원처입니다. 당장 들이세요.", coupangLink: "#" },
    { id: 21, name: "뽀로로 문짝 (뮤직플레이하우스)", imgIcon: "🚪", freeTime: "60분", milestone: "stand", theme: "sos-meal", tags: "#국민문짝 #까꿍놀이", battery: "AA 건전지 3개", fomo: "하루 종일 문 열고 닫고 까꿍놀이 삼매경. 부피가 커도 포기할 수 없는 마약템!", coupangLink: "#" },
    { id: 22, name: "리틀타익스 액티비티 가든", imgIcon: "🏡", freeTime: "50분", milestone: "stand", theme: "sos-shower", tags: "#아기아지트 #변형가능", battery: "AAA 건전지 2개", fomo: "기어 다니고 잡고 일어서는 시기, 안전한 아기만의 요새를 만들어주세요.", coupangLink: "#" },
    { id: 23, name: "브이텍 걸음마 보조기", imgIcon: "🚶", freeTime: "30분", milestone: "stand", theme: "sos-sleep", tags: "#걸음마연습 #체력소모", battery: "AA 건전지 2개", fomo: "첫걸음마 뗄 때 필수! 밀고 다니느라 체력 방전돼서 밤에 기절 꿀잠 잡니다.", coupangLink: "#" },
    { id: 24, name: "립프로그 아이스크림 카트", imgIcon: "🍦", freeTime: "45분", milestone: "stand", theme: "sos-meal", tags: "#역할놀이 #돌아기선물", battery: "AA 건전지 3개", fomo: "돌 지나면 무조건 사야 하는 국민템. 아이스크림 푸느라 엄마 밥 먹을 시간 벌어줍니다.", coupangLink: "#" },
    { id: 25, name: "핑크퐁 상어가족 펜", imgIcon: "🦈", freeTime: "30분", milestone: "stand", theme: "sos-out", tags: "#단어학습 #차량용", battery: "AAA 건전지 2개", fomo: "말귀 알아들을 때쯤 쥐여주면 혼자 콕콕 찍으면서 단어 천재가 됩니다.", coupangLink: "#" },
    { id: 26, name: "숲소리 영유아 블럭 22P", imgIcon: "🧱", freeTime: "25분", milestone: "stand", theme: "sos-meal", tags: "#천연원목 #창의력", battery: "건전지 필요 없음", fomo: "플라스틱 블럭 전에 입에 넣어도 안전한 원목으로 소근육과 창의력을 키워주세요.", coupangLink: "#" },
    { id: 27, name: "야마토야 하이체어용 장난감", imgIcon: "🪑", freeTime: "20분", milestone: "stand", theme: "sos-meal", tags: "#이유식전쟁 #식탁착붙", battery: "건전지 필요 없음", fomo: "이유식 거부 오기 전에 식탁에 붙여두세요. 밥 먹는 시간이 즐거워집니다.", coupangLink: "#" },
    { id: 28, name: "스텝2 지붕차", imgIcon: "🚗", freeTime: "30분", milestone: "stand", theme: "sos-sleep", tags: "#다리힘기르기 #아빠세차", battery: "건전지 필요 없음", fomo: "발로 구르며 온 집안을 누비는 시기. 층간소음 걱정 없이 에너지 빼기 최고!", coupangLink: "#" },
    { id: 29, name: "콩순이 말하는 냉장고", imgIcon: "🧊", freeTime: "40분", milestone: "stand", theme: "sos-shower", tags: "#소꿉놀이 #리얼리티", battery: "AAA 건전지 2개", fomo: "엄마 주방 일할 때 옆에서 조용히 자기 냉장고 정리하게 만드는 마법의 템.", coupangLink: "#" },
    { id: 30, name: "비지베어(Bizzy Bear) 조작북 세트", imgIcon: "🐻", freeTime: "20분", milestone: "stand", theme: "sos-out", tags: "#영국국민책 #손가락운동", battery: "건전지 필요 없음", fomo: "밀고 당기고 돌리면서 책에 푹 빠집니다. 외출할 때 가방에 2권만 챙기면 든든해요.", coupangLink: "#" }
];