import requests
import json
import datetime

encoding_key = "94f9282c8ce5e8396c03a89e610a18ae71fb9f149b08a8c7d81c4e359e6e14bd"

# 👶 맘카페 엄마들이 환장하는 '아이 친화형' 핵심 키워드 리스트 (화이트리스트)
KID_FRIENDLY_KEYWORDS = [
    "어린이", "아이", "아동", "가족", "패밀리", "체험", "놀이", "캐릭터", 
    "애니메이션", "토이", "키즈", "문화제", "빛축제", "불빛", "꽃축제", 
    "물놀이", "페스티벌", "공원", "자연", "생태", "인형극", "뮤지컬"
]

# ❌ 아이랑 가기엔 부적절하거나 지루한 축제 키워드 리스트 (블랙리스트)
BAD_KEYWORDS = ["산업", "포럼", "세미나", "주류", "막걸리", "노인", "실버", "심포지엄"]

def download_filtered_festival_data():
    today = datetime.date.today().strftime("%Y%m%d")
    url = "http://apis.data.go.kr/B551011/KorService1/searchFestival2"
    
    params = {
        "serviceKey": encoding_key,
        "MobileOS": "ETC",
        "MobileApp": "TosilmomsMate",
        "_type": "json",
        "listYN": "Y",
        "arrange": "A",
        "eventStartDate": today,
        "numOfRows": "200",  # 필터링으로 걸러질 것을 대비해 넉넉히 200개 겟!
        "pageNo": "1"
    }
    
    print("🤖 [토실이 로봇] 공공기관 서버에서 전국 축제를 수집 중입니다...")
    
    try:
        response = requests.get(url, params=params, timeout=10)
        if response.status_code == 200:
            raw_data = response.json()
            all_items = raw_data['response']['body']['items']['item']
            
            filtered_festivals = []
            
            # 🔍 수집된 축제들을 하나씩 검사하는 지능형 루프
            for item in all_items:
                title = item.get('title', '')
                
                # 1단계: 블랙리스트 키워드가 있으면 무조건 탈락!
                if any(bad_word in title for bad_word in BAD_KEYWORDS):
                    continue
                    
                # 2단계: 화이트리스트(아이 친화형) 키워드가 하나라도 포함되면 합격!
                if any(good_word in title for good_word in KID_FRIENDLY_KEYWORDS):
                    filtered_festivals.append(item)
            
            print(f"🎯 필터링 완료! 총 {len(all_items)}개 중 육아 맞춤 축제 {len(filtered_festivals)}개 엄선 완료!")
            
            # 💾 엄선된 청정 데이터만 저장
            with open("festivals.json", "w", encoding="utf-8") as f:
                json.dump(filtered_festivals, f, ensure_ascii=False, indent=4)
                
            print("💾 'festivals.json' 파일에 안심 저장을 완료했습니다.")
            
        else:
            print(f"❌ 서버 연결 실패 ({response.status_code})")
    except Exception as e:
        print(f"❌ 에러 발생: {e}")

if __name__ == "__main__":
    download_filtered_festival_data()
