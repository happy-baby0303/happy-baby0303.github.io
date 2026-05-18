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
BAD_KEYWORDS = ["산업", "포럼", "세미나", "주류", "막걸리", "노인", "실버", "심포지엄", "맥주", "치맥", "와인", "야시장", "포차"]

def download_filtered_festival_data():
    today = datetime.date.today().strftime("%Y%m%d")
    url = "http://apis.data.go.kr/B551011/KorService2/searchFestival2"
    
    all_collected_items = []
    
    for page in range(1, 4):
        params = {
            "serviceKey": encoding_key,
            "MobileOS": "ETC",
            "MobileApp": "TosilmomsMate",
            "_type": "json",
            "arrange": "A",
            "eventStartDate": today,
            "numOfRows": "200",  
            "pageNo": str(page)
        }
        
        print(f"🤖 [토실이 로봇] {page}페이지 전국 데이터 수집 노크 중...")
        try:
            response = requests.get(url, params=params, timeout=10)
            if response.status_code == 200:
                raw_data = response.json()
                
                # 🛡️ [핵심 패치] 정부 서버가 빈 글자("")를 주든 상자를 주든 안전하게 분해합니다.
                body = raw_data.get('response', {}).get('body', {})
                if not body:
                    print(f"   ℹ️ {page}페이지에 바디 데이터가 없습니다.")
                    break
                    
                items_container = body.get('items', '')
                
                # TourAPI 특유의 기괴한 꼼수(데이터 없으면 items를 dict가 아닌 str ""로 줌) 방어
                if isinstance(items_container, dict):
                    items = items_container.get('item', [])
                else:
                    print(f"   ℹ️ {page}페이지 구조가 비어있습니다. (수집 종료)")
                    break
                
                if isinstance(items, dict):
                    items = [items]
                    
                if items:
                    all_collected_items.extend(items)
                    print(f"   ▶ {page}페이지에서 {len(items)}개 수집 완료!")
                else:
                    break
            else:
                print(f"   ❌ {page}페이지 연결 실패 (에러 코드: {response.status_code})")
                break
        except Exception as e:
            print(f"   ❌ {page}페이지 연동 중 예외 발생: {e}")
            break

    # 🎯 육아 맞춤형 정밀 필터링
    filtered_festivals = []
    for item in all_collected_items:
        title = item.get('title', '')
        if any(bad_word in title for bad_word in BAD_KEYWORDS):
            continue
        if any(good_word in title for good_word in KID_FRIENDLY_KEYWORDS):
            filtered_festivals.append(item)
    
    print(f"\n🎯 [최종 결과] 전국 {len(all_collected_items)}개 축제 중 육아 맞춤 축제 {len(filtered_festivals)}개 최종 엄선!")
    
    with open("festivals.json", "w", encoding="utf-8") as f:
        json.dump(filtered_festivals, f, ensure_ascii=False, indent=4)
    print("💾 'festivals.json' 파일 창고 저장 완료!")

if __name__ == "__main__":
    download_filtered_festival_data()
