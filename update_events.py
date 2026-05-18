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

# ❌ 아이랑 가기엔 부적절한 축제 키워드 리스트 (맥주, 치맥, 와인, 야시장 기습 추가!)
BAD_KEYWORDS = ["산업", "포럼", "세미나", "주류", "막걸리", "노인", "실버", "심포지엄", "맥주", "치맥", "와인", "야시장", "포차"]

def download_filtered_festival_data():
    today = datetime.date.today().strftime("%Y%m%d")
    url = "http://apis.data.go.kr/B551011/KorService2/searchFestival2"
    
    # 🛠️ 에러의 원인이었던 "listYN" 항목을 깨끗하게 삭제했습니다!
    params = {
        "serviceKey": encoding_key,
        "MobileOS": "ETC",
        "MobileApp": "TosilmomsMate",
        "_type": "json",
        "arrange": "A",
        "eventStartDate": today,
        "numOfRows": "1000",  # 👈 기존 200에서 1000으로 늘려 전국 데이터 확보!
        "pageNo": "1"
    }
    
    print("🤖 [토실이 로봇] 걸림돌을 제거하고 정부 서버로 당당하게 출격합니다...")
    
    try:
        response = requests.get(url, params=params, timeout=10)
        if response.status_code == 200:
            raw_data = response.json()
            
            try:
                all_items = raw_data['response']['body']['items']['item']
                
                # 데이터가 1개만 올 경우를 대비한 안전장치
                if isinstance(all_items, dict):
                    all_items = [all_items]
                    
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
