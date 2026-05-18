import requests
import json
import datetime

# 🔑 파트너님의 마스터 인증키
encoding_key = "94f9282c8ce5e8396c03a89e610a18ae71fb9f149b08a8c7d81c4e359e6e14bd"

# 👶 아이 친화형 핵심 키워드 리스트
KID_FRIENDLY_KEYWORDS = [
    "어린이", "아이", "아동", "가족", "패밀리", "체험", "놀이", "캐릭터", 
    "애니메이션", "토이", "키즈", "문화제", "빛축제", "불빛", "꽃축제", 
    "물놀이", "페스티벌", "공원", "자연", "생태", "인형극", "뮤지컬"
]

# ❌ 아이랑 가기엔 부적절한 축제 키워드 리스트
BAD_KEYWORDS = ["산업", "포럼", "세미나", "주류", "막걸리", "노인", "실버", "심포지엄"]

def download_filtered_festival_data():
    today = datetime.date.today().strftime("%Y%m%d")
    
    # 🟢 팩트체크: KorService1이 아니라 KorService2가 진짜 최신 정답 주소입니다!
    url = "http://apis.data.go.kr/B551011/KorService2/searchFestival2"
    
    params = {
        "serviceKey": encoding_key,
        "MobileOS": "ETC",
        "MobileApp": "TosilmomsMate",
        "_type": "json",
        "listYN": "Y",
        "arrange": "A",
        "eventStartDate": today,
        "numOfRows": "200",  
        "pageNo": "1"
    }
    
    print("🤖 [토실이 로봇] 올바른 주소로 공공기관 서버에 재접속 중입니다...")
    
    try:
        response = requests.get(url, params=params, timeout=10)
        if response.status_code == 200:
            raw_data = response.json()
            
            # 서버에서 정상 데이터를 줬는지 확인
            try:
                all_items = raw_data['response']['body']['items']['item']
                filtered_festivals = []
                
                for item in all_items:
                    title = item.get('title', '')
                    if any(bad_word in title for bad_word in BAD_KEYWORDS):
                        continue
                    if any(good_word in title for good_word in KID_FRIENDLY_KEYWORDS):
                        filtered_festivals.append(item)
                
                print(f"🎯 필터링 완료! 총 {len(all_items)}개 중 육아 맞춤 축제 {len(filtered_festivals)}개 엄선!")
                
                with open("festivals.json", "w", encoding="utf-8") as f:
                    json.dump(filtered_festivals, f, ensure_ascii=False, indent=4)
                    
                print("💾 'festivals.json' 파일이 창고에 정상적으로 생성되었습니다!")
                
            except (KeyError, TypeError):
                print("❌ 서버 응답은 정상(200)이나 데이터 구조가 비어있습니다.")
                print("👉 서버 메시지:", raw_data)
        else:
            print(f"❌ 서버 연결 실패 (에러 코드: {response.status_code})")
    except Exception as e:
        print(f"❌ 에러 발생: {e}")

if __name__ == "__main__":
    download_filtered_festival_data()
