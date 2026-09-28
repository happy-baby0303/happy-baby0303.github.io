// ==========================================
// 🍼 배냇함 젖병 통합 데이터베이스 V2.1 (bottle/data.js)
// (총 40종: 열탕/UV 소독 정보 및 쿠팡 파트너스 딥링크 내장)
//
// ⚠️ 소독 방법은 제조사가 정한 것을 그대로 옮긴다. 우리가 판단하지 않는다.
//
//    예전에 이렇게 적혀 있었다.
//      "UV(공식금지, 현실은 변색 감수하고 씀)"
//
//    이건 제조사가 하지 말라는 걸 해도 된다고 읽힌다.
//    아기가 입에 무는 물건이고, 변색은 소재가 상하고 있다는 신호다.
//    앱을 보고 그렇게 했다가 탈이 나면 그건 우리 책임이 된다.
//    "제조사 비권장" 까지만 적고, 할지 말지는 부모가 정한다.
//
// ⚠️ 제품을 치켜세우는 말을 쓰지 않는다.
//    수수료를 받는 링크가 달린 화면이다.
//    "가장 잘 맞아" · "예술적으로" 같은 말은 근거를 대야 하는 표현이고,
//    근거 없이 쓰면 표시광고법 문제가 된다. 사실만 적는다.
// ==========================================

const bottleData = [
    // ---------------- [기존 메이저 20종] ----------------
    { 
        id: "b01", brand: "더블하트", name: "모유실감 3세대 PPSU", 
        age: ["newborn", "infant", "toddler"], rejection: "super", wash: "normal",
        material: "ppsu", price: "mid", antiColic: "normal", compatible: "yes", 
        sterilization: "열탕(권장) / UV(제조사 비권장)",
        desc: "국내에서 오래 팔린 제품이라 젖꼭지 거부가 적다는 후기가 많습니다. 제조사는 열탕 소독만 권장합니다.",
        searchKeyword: "더블하트 3세대 젖병 트윈팩",
        coupangLink: "https://link.coupang.com/a/gB3IhV0bsW"
    },
    { 
        id: "b02", brand: "헤겐", name: "사각 젖병 PPSU", 
        age: ["newborn", "infant"], rejection: "normal", wash: "easy",
        material: "ppsu", price: "high", antiColic: "strong", compatible: "no", 
        sterilization: "열탕(O) / 식세기(O) / UV(변색주의)",
        desc: "입구가 넓어 손이 들어가서 세척이 수월합니다. 뚜껑을 바꿔 이유식 용기로도 쓸 수 있어요.",
        searchKeyword: "헤겐 신생아 젖병 스타터 세트",
        coupangLink: "https://link.coupang.com/a/gB5YIbpDvE"
    },
    { 
        id: "b03", brand: "닥터브라운", name: "옵션스플러스 내열유리", 
        age: ["newborn"], rejection: "normal", wash: "uv",
        material: "glass", price: "mid", antiColic: "super", compatible: "no", 
        sterilization: "열탕(O) / 식세기(O) / UV(O)",
        desc: "통기 부품이 들어 있어 공기를 덜 삼키게 만든 젖병입니다. 부품이 많아서 세척에 손이 더 갑니다.",
        searchKeyword: "닥터브라운 유리 젖병 세트",
        coupangLink: "https://link.coupang.com/a/gB34zzE06K"
    },
    { 
        id: "b04", brand: "코모토모", name: "실리콘 젖병", 
        age: ["newborn", "infant"], rejection: "super", wash: "easy",
        material: "silicone", price: "high", antiColic: "strong", compatible: "no", 
        sterilization: "열탕(O) / 전자레인지(O) / UV(오래 돌리면 끈적해짐)",
        desc: "젖꼭지가 말랑해 혼합수유나 젖병 거부에 많이 찾는 제품입니다. 제조사는 UV 소독을 권하지 않습니다.",
        searchKeyword: "코모토모 실리콘 젖병 2팩",
        coupangLink: "https://link.coupang.com/a/gB4byGHwf6"
    },
    { 
        id: "b05", brand: "모윰", name: "리얼핏 PPSU 젖병", 
        age: ["newborn", "infant", "toddler"], rejection: "super", wash: "normal",
        material: "ppsu", price: "mid", antiColic: "normal", compatible: "yes", 
        sterilization: "열탕(O) / UV(가능하나 변색 올 수 있음)",
        desc: "더블하트 모유실감 젖꼭지와 호환됩니다. 디자인이 깔끔한 편입니다.",
        searchKeyword: "모윰 리얼핏 젖병 세트",
        coupangLink: "https://link.coupang.com/a/gB4c9LyIai"
    },
    { 
        id: "b06", brand: "스펙트라", name: "PA 젖병", 
        age: ["infant", "toddler"], rejection: "normal", wash: "uv",
        material: "pa", price: "low", antiColic: "normal", compatible: "yes", 
        sterilization: "열탕(O) / UV(특화-변색 거의 없음)",
        desc: "유리처럼 투명하면서 가볍고, 흠집이 잘 안 나는 편인 PA 소재입니다. 제조사는 UV 소독에도 변색이 거의 없다고 밝힙니다.",
        searchKeyword: "스펙트라 pa 젖병 세트",
        coupangLink: "https://link.coupang.com/a/gB4fvRSfim"
    },
    { 
        id: "b07", brand: "그로미미", name: "PPSU 와이드넥 젖병", 
        age: ["toddler"], rejection: "normal", wash: "normal",
        material: "ppsu", price: "mid", antiColic: "normal", compatible: "yes", 
        sterilization: "열탕(O) / UV(변색주의)",
        desc: "6개월 이후 아기가 쥐고 먹기 편한 모양입니다. 같은 브랜드 빨대를 꽂아 빨대컵으로 이어 쓸 수 있어요.",
        searchKeyword: "그로미미 젖병 트윈팩",
        coupangLink: "https://link.coupang.com/a/gB4kuzQ8hE"
    },
    { 
        id: "b08", brand: "스와비넥스", name: "제로제로 실리콘 젖병", 
        age: ["newborn"], rejection: "super", wash: "normal",
        material: "silicone", price: "high", antiColic: "super", compatible: "no", 
        sterilization: "열탕(O)",
        desc: "안에 실리콘 백이 들어 있어 공기가 거의 안 들어가게 만든 구조입니다.",
        searchKeyword: "스와비넥스 제로제로 스타터",
        coupangLink: "https://link.coupang.com/a/gB4o0VMNR6"
    },
    { 
        id: "b09", brand: "마더케이", name: "베이직 PPSU 젖병", 
        age: ["newborn", "infant"], rejection: "normal", wash: "normal",
        material: "ppsu", price: "low", antiColic: "normal", compatible: "yes", 
        sterilization: "열탕(O) / UV(O)",
        desc: "가격이 낮은 편이고, 모유실감 계열 젖꼭지와 호환돼 부담 없이 쓰기 좋습니다.",
        searchKeyword: "마더케이 ppsu 젖병 더블팩",
        coupangLink: "https://link.coupang.com/a/gB4qL8IWaW"
    },
    { 
        id: "b10", brand: "베베그로우", name: "PPSU 젖병", 
        age: ["infant", "toddler"], rejection: "super", wash: "normal",
        material: "ppsu", price: "mid", antiColic: "strong", compatible: "yes", 
        sterilization: "열탕(O) / UV(O)",
        desc: "유한킴벌리(더블하트 수입사였던 곳)에서 만든 젖병입니다. 양쪽에 공기 밸브가 있어 공기를 덜 삼키게 만들었습니다.",
        searchKeyword: "베베그로우 젖병 세트",
        coupangLink: "https://link.coupang.com/a/gB4sFm81g4"
    },
    { 
        id: "b11", brand: "유미", name: "유미(Umee) 배앓이방지 PPSU", 
        age: ["newborn", "infant"], rejection: "normal", wash: "normal",
        material: "ppsu", price: "mid", antiColic: "super", compatible: "no", 
        sterilization: "열탕(O) / UV(변색주의)",
        desc: "공기가 빠지는 링('에어벤트')이 달린 젖병입니다. 조립할 때 딸깍 소리가 나게 끼워야 새지 않습니다.",
        searchKeyword: "유미 배앓이 젖병 스타터",
        coupangLink: ""
    },
    { 
        id: "b12", brand: "란시노", name: "내열유리 젖병", 
        age: ["newborn"], rejection: "super", wash: "uv",
        material: "glass", price: "high", antiColic: "normal", compatible: "yes", 
        sterilization: "열탕(O) / 식세기(O) / UV(O)",
        desc: "모유실감과 비슷한 느낌의 젖꼭지로 알려진 유리 젖병입니다. 해외 직구로 많이 찾던 제품입니다.",
        searchKeyword: "란시노 유리 젖병 세트",
        coupangLink: "https://link.coupang.com/a/gB4znK36GW"
    },
    { 
        id: "b13", brand: "아벤트", name: "내추럴 유리 젖병", 
        age: ["newborn", "infant"], rejection: "normal", wash: "uv",
        material: "glass", price: "mid", antiColic: "strong", compatible: "no", 
        sterilization: "열탕(O) / UV(O)",
        desc: "여러 나라에서 오래 팔린 제품입니다. 꽃잎 모양 젖꼭지가 함몰을 줄이도록 설계돼 있습니다.",
        searchKeyword: "아벤트 내추럴 유리젖병 세트",
        coupangLink: "https://link.coupang.com/a/gB4EFMKPJc"
    },
    { 
        id: "b14", brand: "닥터브라운", name: "옵션스플러스 PP 젖병", 
        age: ["infant", "toddler"], rejection: "normal", wash: "normal",
        material: "pp", price: "low", antiColic: "super", compatible: "no", 
        sterilization: "열탕(O) / UV(소재 특성상 비권장)",
        desc: "닥터브라운 통기 구조를 가벼운 PP 소재로 만든 제품입니다. PP는 긁히기 쉬워서, 뿌옇게 되거나 흠집이 나면 바로 바꾸세요.",
        searchKeyword: "닥터브라운 pp 젖병 더블팩",
        coupangLink: "https://link.coupang.com/a/gB4F867ZYq"
    },
    { 
        id: "b15", brand: "엠마요", name: "프리미엄 실리콘 젖병", 
        age: ["infant", "toddler"], rejection: "super", wash: "easy",
        material: "silicone", price: "high", antiColic: "normal", compatible: "no", 
        sterilization: "열탕(O)",
        desc: "실리콘 소재라 떨어뜨려도 깨지지 않습니다.",
        searchKeyword: "엠마요 실리콘 젖병 세트",
        coupangLink: ""
    },
    { 
        id: "b16", brand: "누크", name: "네이처센스 유리 젖병", 
        age: ["newborn"], rejection: "super", wash: "uv",
        material: "glass", price: "mid", antiColic: "strong", compatible: "no", 
        sterilization: "열탕(O) / 식세기(O) / UV(O)",
        desc: "젖꼭지에 유출공이 여러 개라 모유가 나오는 방식에 가깝게 설계돼 있습니다.",
        searchKeyword: "누크 네이처센스 유리 젖병 세트",
        coupangLink: "https://link.coupang.com/a/gB4LP4K2Wi"
    },
    { 
        id: "b17", brand: "마마치", name: "100% 실리콘 젖병", 
        age: ["newborn", "infant"], rejection: "super", wash: "easy",
        material: "silicone", price: "high", antiColic: "strong", compatible: "no", 
        sterilization: "열탕(O) / UV(장기사용시 끈적임 주의)",
        desc: "몸통 전체가 말랑한 실리콘입니다. 젖병 거부가 있을 때 많이 시도하는 편이지만, 무겁고 먼지가 잘 붙습니다.",
        searchKeyword: "마마치 실리콘 젖병 세트",
        coupangLink: ""
    },
    { 
        id: "b18", brand: "피프", name: "베이비 내열유리 젖병", 
        age: ["newborn"], rejection: "normal", wash: "uv",
        material: "glass", price: "mid", antiColic: "normal", compatible: "yes", 
        sterilization: "열탕(O) / UV(O)",
        desc: "비교적 가벼운 일본산 내열유리 젖병입니다. 더블하트 젖꼭지와 호환됩니다.",
        searchKeyword: "피프 베이비 유리 젖병",
        coupangLink: ""
    },
    { 
        id: "b19", brand: "트위스트쉐이크", name: "안티콜릭 젖병", 
        age: ["infant", "toddler"], rejection: "normal", wash: "easy",
        material: "pp", price: "mid", antiColic: "strong", compatible: "no", 
        sterilization: "열탕(O)",
        desc: "안에 분유 섞는 망이 들어 있어 덩어리가 덜 지고, 입구가 넓어 씻기 편합니다.",
        searchKeyword: "트위스트쉐이크 젖병 세트",
        coupangLink: "https://link.coupang.com/a/gB4QNEofue"
    },
    { 
        id: "b20", brand: "더블하트", name: "내열유리 젖병", 
        age: ["newborn"], rejection: "super", wash: "uv",
        material: "glass", price: "high", antiColic: "normal", compatible: "yes", 
        sterilization: "열탕(O) / UV(O)",
        desc: "모유실감 젖꼭지를 쓰는 유리 젖병입니다. 유리라 무겁지만 UV 소독을 할 수 있습니다.",
        searchKeyword: "더블하트 유리 젖병 세트",
        coupangLink: ""
    },

    // ---------------- [신규 벌크업 20종: 세트/에디션/서브브랜드] ----------------
    { 
        id: "b21", brand: "더블하트", name: "디즈니 에디션 PPSU", 
        age: ["infant", "toddler"], rejection: "super", wash: "normal",
        material: "ppsu", price: "high", antiColic: "normal", compatible: "yes", 
        sterilization: "열탕(권장) / UV(변색주의)",
        desc: "기존 모유실감과 같은 제품에 곰돌이 푸 같은 캐릭터가 그려져 있습니다.",
        searchKeyword: "더블하트 디즈니 젖병",
        coupangLink: "https://link.coupang.com/a/gB4WclfS1Y"
    },
    { 
        id: "b22", brand: "헤겐", name: "트리플 세트 (150+240ml)", 
        age: ["newborn", "infant"], rejection: "normal", wash: "easy",
        material: "ppsu", price: "high", antiColic: "strong", compatible: "no", 
        sterilization: "열탕(O) / 식세기(O)",
        desc: "신생아부터 영아기까지 쓸 수 있는 용량별 세트입니다. 출산 준비물이나 선물로 많이 찾습니다.",
        searchKeyword: "헤겐 젖병 150 240 세트",
        coupangLink: "https://link.coupang.com/a/gB4ZRsUkOy"
    },
    { 
        id: "b23", brand: "토미티피", name: "클로저투네이쳐 배앓이 젖병", 
        age: ["newborn", "infant"], rejection: "super", wash: "easy",
        material: "pp", price: "low", antiColic: "super", compatible: "no", 
        sterilization: "열탕(O)",
        desc: "영국에서 오래 팔린 젖병입니다. 젖꼭지가 넓은 모양이고, 온도를 색으로 보여주는 튜브가 달려 있습니다.",
        searchKeyword: "토미티피 배앓이 젖병",
        coupangLink: ""
    },
    { 
        id: "b24", brand: "모윰", name: "마카롱 에디션 PPSU", 
        age: ["infant", "toddler"], rejection: "super", wash: "normal",
        material: "ppsu", price: "mid", antiColic: "normal", compatible: "yes", 
        sterilization: "열탕(O) / UV(변색주의)",
        desc: "기존 모윰 젖병에 파스텔 색을 입힌 제품입니다. 뚜껑 색으로 쌍둥이나 첫째·둘째 젖병을 구분하기 좋습니다.",
        searchKeyword: "모윰 마카롱 젖병",
        coupangLink: ""
    },
    { 
        id: "b25", brand: "닥터브라운", name: "내로우넥 (좁은입구) 유리젖병", 
        age: ["newborn"], rejection: "normal", wash: "uv",
        material: "glass", price: "mid", antiColic: "super", compatible: "no", 
        sterilization: "열탕(O) / 식세기(O) / UV(O)",
        desc: "와이드넥보다 입구가 좁아 분유를 넣고 씻기는 불편하지만, 입이 작은 신생아나 이른둥이가 물기에는 편한 편입니다.",
        searchKeyword: "닥터브라운 내로우넥 유리젖병",
        coupangLink: "https://link.coupang.com/a/gB42fMNi5k"
    },
    { 
        id: "b26", brand: "유피스 (Upis)", name: "소프트크린 PPSU", 
        age: ["infant", "toddler"], rejection: "normal", wash: "normal",
        material: "ppsu", price: "low", antiColic: "normal", compatible: "yes", 
        sterilization: "열탕(O)",
        desc: "오래된 국내 브랜드입니다. 가격이 낮은 편이라 모유실감 젖꼭지를 끼워 여분 젖병으로 많이 씁니다.",
        searchKeyword: "유피스 ppsu 젖병",
        coupangLink: ""
    },
    { 
        id: "b27", brand: "MAM (맘)", name: "이지스타트 안티콜릭", 
        age: ["newborn", "infant"], rejection: "super", wash: "easy",
        material: "pp", price: "mid", antiColic: "super", compatible: "no", 
        sterilization: "전자레인지(O, 물 넣고 3분)",
        desc: "바닥이 통째로 열려 세척이 편합니다. 물을 넣고 전자레인지에 3분 돌려 소독하는 방식을 제조사가 안내합니다.",
        searchKeyword: "맘 이지스타트 젖병",
        coupangLink: ""
    },
    { 
        id: "b28", brand: "스펙트라", name: "올뉴 내열유리 젖병", 
        age: ["newborn"], rejection: "normal", wash: "uv",
        material: "glass", price: "mid", antiColic: "normal", compatible: "yes", 
        sterilization: "열탕(O) / UV(O)",
        desc: "유축기로 알려진 스펙트라의 유리 젖병입니다. 눈금이 잘 안 지워지는 편이고, 더블하트 젖꼭지와 호환됩니다.",
        searchKeyword: "스펙트라 유리 젖병",
        coupangLink: ""
    },
    { 
        id: "b29", brand: "아벤트", name: "안티콜릭 에어프리", 
        age: ["newborn"], rejection: "normal", wash: "easy",
        material: "pa", price: "mid", antiColic: "super", compatible: "no", 
        sterilization: "열탕(O)",
        desc: "젖병 안에 숟가락 모양 밸브가 있어, 눕혀서 먹여도 젖꼭지 쪽에 우유가 차도록 만든 구조입니다.",
        searchKeyword: "아벤트 에어프리 젖병",
        coupangLink: ""
    },
    { 
        id: "b30", brand: "마더케이", name: "디아 (DIA) PPSU", 
        age: ["toddler"], rejection: "normal", wash: "normal",
        material: "ppsu", price: "mid", antiColic: "normal", compatible: "yes", 
        sterilization: "열탕(O) / UV(O)",
        desc: "마더케이의 상위 라인입니다. 베이직보다 손에 쥐기 편한 모양입니다.",
        searchKeyword: "마더케이 디아 젖병",
        coupangLink: ""
    },
    { 
        id: "b31", brand: "미니노어", name: "안심 유리 젖병", 
        age: ["newborn", "infant"], rejection: "normal", wash: "uv",
        material: "glass", price: "high", antiColic: "normal", compatible: "no", 
        sterilization: "열탕(O) / UV(O)",
        desc: "덴마크 브랜드의 유리 젖병입니다. 유리가 두꺼운 편입니다.",
        searchKeyword: "미니노어 유리 젖병",
        coupangLink: ""
    },
    { 
        id: "b32", brand: "치코", name: "퍼펙트5 (Perfect5)", 
        age: ["newborn", "infant"], rejection: "super", wash: "easy",
        material: "pp", price: "mid", antiColic: "super", compatible: "no", 
        sterilization: "열탕(O)",
        desc: "바닥 밸브('이퀼리브리엄 멤브레인')가 빠는 힘에 맞춰 공기가 들어오게 만든 배앓이 방지 구조입니다.",
        searchKeyword: "치코 퍼펙트5 젖병",
        coupangLink: ""
    },
    { 
        id: "b33", brand: "에브리데이베이비", name: "온도감지 유리 젖병", 
        age: ["infant"], rejection: "normal", wash: "uv",
        material: "glass", price: "high", antiColic: "normal", compatible: "no", 
        sterilization: "열탕(O) / UV(O)",
        desc: "뜨거우면 겉면 색이 하얗게 바뀌어 온도를 눈으로 가늠할 수 있습니다. 먹이기 전에 손목에 한 방울 떨어뜨려 보는 건 그대로 하세요.",
        searchKeyword: "에브리데이베이비 유리젖병",
        coupangLink: "https://link.coupang.com/a/gB5diAePJI"
    },
    { 
        id: "b34", brand: "쁘띠아띠", name: "소프트 실리콘 젖병", 
        age: ["newborn", "infant"], rejection: "super", wash: "easy",
        material: "silicone", price: "high", antiColic: "strong", compatible: "no", 
        sterilization: "열탕(O)",
        desc: "국산 실리콘 젖병입니다. 이음부도 실리콘 이중 구조라, 실리콘 젖병에서 흔한 새는 문제를 줄이도록 만들었습니다.",
        searchKeyword: "쁘띠아띠 실리콘 젖병",
        coupangLink: "https://link.coupang.com/a/gB5fuQ2oNM"
    },
    { 
        id: "b35", brand: "베베리쉬", name: "PPSU 와이드 젖병", 
        age: ["infant", "toddler"], rejection: "normal", wash: "normal",
        material: "ppsu", price: "low", antiColic: "normal", compatible: "yes", 
        sterilization: "열탕(O)",
        desc: "아가방에서 만든 젖병입니다. 가격이 낮은 편이고, 입구가 넓으며 더블하트 젖꼭지와 호환됩니다.",
        searchKeyword: "베베리쉬 젖병",
        coupangLink: ""
    },
    { 
        id: "b36", brand: "그로미미", name: "다크시티 에디션 PPSU", 
        age: ["toddler"], rejection: "normal", wash: "normal",
        material: "ppsu", price: "mid", antiColic: "normal", compatible: "yes", 
        sterilization: "열탕(O)",
        desc: "육아용품에서는 드문 블랙·차콜 색을 입힌 그로미미 에디션입니다.",
        searchKeyword: "그로미미 다크시티",
        coupangLink: ""
    },
    { 
        id: "b37", brand: "누비 (Nuby)", name: "컴포트 실리콘 젖병", 
        age: ["infant", "toddler"], rejection: "super", wash: "easy",
        material: "silicone", price: "mid", antiColic: "strong", compatible: "no", 
        sterilization: "열탕(O)",
        desc: "몸통이 말랑한 실리콘 젖병입니다. 몸통을 누르면 흐름이 빨라지니, 누를 때는 조금씩만 하세요.",
        searchKeyword: "누비 실리콘 젖병",
        coupangLink: ""
    },
    { 
        id: "b38", brand: "비박스", name: "PPSU 와이드 젖병", 
        age: ["toddler"], rejection: "normal", wash: "easy",
        material: "ppsu", price: "mid", antiColic: "normal", compatible: "yes", 
        sterilization: "열탕(O)",
        desc: "빨대컵으로 알려진 비박스의 젖병입니다. 나중에 비박스 빨대를 끼워 빨대컵으로 이어 쓸 수 있습니다.",
        searchKeyword: "비박스 ppsu 젖병",
        coupangLink: ""
    },
    { 
        id: "b39", brand: "더블하트", name: "160ml 신생아 스타터 세트", 
        age: ["newborn"], rejection: "super", wash: "normal",
        material: "ppsu", price: "mid", antiColic: "normal", compatible: "yes", 
        sterilization: "열탕(권장) / UV(제조사 비권장)",
        desc: "작은 160ml 병과 SS 젖꼭지가 들어 있는 신생아용 세트입니다.",
        searchKeyword: "더블하트 160 젖병 세트",
        coupangLink: "https://link.coupang.com/a/gB5kMCp7oO"
    },
    { 
        id: "b40", brand: "헤겐", name: "330ml 대용량 젖병", 
        age: ["toddler"], rejection: "normal", wash: "easy",
        material: "ppsu", price: "high", antiColic: "strong", compatible: "no", 
        sterilization: "열탕(O) / 식세기(O)",
        desc: "240ml로 모자랄 때 쓰는 큰 용량입니다. 나중에 간식 통이나 물통으로도 쓸 수 있습니다.",
        searchKeyword: "헤겐 330 젖병",
        coupangLink: "https://link.coupang.com/a/gB5mYuObhk"
    }
];