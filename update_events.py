"""
주말 행사 목록 만들기 (festivals.json) — 매주 GitHub Actions 가 돌린다 (.github/workflows/auto_update.yml)

자료: 한국관광공사 국문 관광정보 서비스 (TourAPI, KorService2)
  1) searchFestival2 — 오늘 이후 행사 목록 (이름 · 기간 · 주소 · 전화 · 사진)
  2) detailIntro2    — 행사마다 이용 요금 · 관람 가능 연령 · 행사 시간 · 행사장 · 부대 행사
  3) detailCommon2   — 행사마다 소개 글(overview)

⚠️ 앱의 행사 상세 창에 소개 글이 비어 있어서, 모든 행사에 똑같은 지어낸 문장이 떴다.
   목록만 받아 와서 그랬다. 2) · 3) 을 같이 받아서 주최 측이 적은 공식 정보를 그대로 보여 준다.
   사진 · 글은 공공누리 제3유형(출처 표시 · 변경 금지)이라 글을 줄이거나 고쳐 쓰지 않는다.
   HTML 태그만 걷어 내고 줄바꿈은 살린다.

⚠️ 인증키는 코드에 적지 않는다. 저장소의 Actions Secret(DATA_GO_KR_KEY)에서 읽는다.
   키가 없으면 실패로 끝내고 festivals.json 을 건드리지 않는다 (지난주 목록이 그대로 남는다).
"""
import html
import json
import os
import re
import sys
import time
import datetime

import requests

BASE = "https://apis.data.go.kr/B551011/KorService2/"
APP = {"MobileOS": "ETC", "MobileApp": "Baenaet", "_type": "json"}

# 아기랑 갈 곳이 아닌 행사 — 제목에 이 말이 있으면 뺀다
BAD_TITLE = ["산업", "포럼", "세미나", "심포지엄", "콘퍼런스", "컨퍼런스", "학술",
             "주류", "막걸리", "맥주", "치맥", "와인", "야시장", "포차",
             "노인", "실버", "스타트업", "창업", "채용", "취업", "마라톤", "기념품"]

# 관람 가능 연령이 성인만인 행사
ADULT_ONLY = re.compile(r"(19|20)\s*세\s*이상|성인\s*(만|전용|관람)")
ALL_AGES = re.compile(r"누구나|전\s*연령|제한\s*없|연령\s*무관")

# 상세 창에 쓰는 칸 (TourAPI 이름 그대로 저장한다)
INTRO_KEYS = ["usetimefestival", "agelimit", "playtime", "eventplace", "placeinfo", "subevent"]


def clean(text):
    """API 글의 HTML 태그를 걷어 내고 줄바꿈만 남긴다. 내용은 바꾸지 않는다."""
    if not text:
        return ""
    t = str(text)
    t = re.sub(r"(?i)<br\s*/?>", "\n", t)
    t = re.sub(r"<[^>]+>", "", t)
    t = html.unescape(t).replace(" ", " ")
    t = re.sub(r"[ \t]+\n", "\n", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t.strip()


def items_of(data):
    """response.body.items.item 이 목록 · 한 개짜리 dict · 빈 문자열로 올 수 있다."""
    body = (data or {}).get("response", {}).get("body", {}) or {}
    box = body.get("items", "")
    if not isinstance(box, dict):
        return []
    its = box.get("item", [])
    if isinstance(its, dict):
        its = [its]
    return its or []


def call(key, op, **params):
    """한 번 실패하면 잠깐 쉬고 한 번 더. 실패 이유(응답 첫머리)를 로그에 남긴다 — 키는 Actions 가 *** 로 가린다."""
    p = dict(APP)
    p.update(params)
    p["serviceKey"] = key
    last = None
    for attempt in range(2):
        try:
            r = requests.get(BASE + op, params=p, timeout=20)
        except requests.RequestException as e:
            last = "%s 연결 실패: %s" % (op, type(e).__name__)
        else:
            if r.status_code == 200:
                try:
                    return r.json()
                except ValueError:
                    # 키 · 신청 문제는 JSON 대신 XML 오류문으로 온다
                    last = "%s 응답이 JSON 이 아님: %s" % (op, " ".join(r.text.split())[:200])
            else:
                last = "%s HTTP %s: %s" % (op, r.status_code, " ".join(r.text.split())[:200])
        time.sleep(1.5)
    raise RuntimeError(last)


def fetch_list(key):
    today = datetime.date.today().strftime("%Y%m%d")
    out = []
    for page in range(1, 4):            # 200개씩 세 번 — 전국 행사가 보통 300~500개
        data = call(key, "searchFestival2", arrange="A", eventStartDate=today, numOfRows="200", pageNo=str(page))
        its = items_of(data)
        if not its:
            break
        out.extend(its)
        print("목록 %d쪽: %d개" % (page, len(its)))
        if len(its) < 200:
            break
    return out


def add_details(key, item):
    """행사 하나에 소개 글 · 요금 · 연령 · 시간 · 행사장을 붙인다. 실패하면 목록 정보만 남긴다."""
    cid, ctype = item.get("contentid"), item.get("contenttypeid") or "15"
    if not cid:
        return item
    try:
        intro = items_of(call(key, "detailIntro2", contentId=cid, contentTypeId=ctype))
        if intro:
            for k in INTRO_KEYS:
                v = clean(intro[0].get(k))
                if v:
                    item[k] = v
    except Exception as e:
        print("  상세(요금 · 연령) 실패 %s: %s" % (item.get("title"), e))
    time.sleep(0.35)
    try:
        common = items_of(call(key, "detailCommon2", contentId=cid))
        if common:
            ov = clean(common[0].get("overview"))
            if ov:
                item["overview"] = ov
    except Exception as e:
        print("  상세(소개 글) 실패 %s: %s" % (item.get("title"), e))
    time.sleep(0.35)
    return item


def keep(item):
    title = item.get("title", "")
    if any(w in title for w in BAD_TITLE):
        return False
    age = item.get("agelimit", "")
    if age and ADULT_ONLY.search(age) and not ALL_AGES.search(age):
        return False
    return True


def main():
    key = os.environ.get("DATA_GO_KR_KEY", "").strip()
    if not key:
        print("DATA_GO_KR_KEY 가 없어서 행사를 새로 받지 않았어요. festivals.json 은 지난번 그대로 둡니다.")
        print("저장소 Settings > Secrets and variables > Actions 에 DATA_GO_KR_KEY 를 넣어 주세요.")
        sys.exit(1)

    items = fetch_list(key)
    if not items:
        print("행사 목록을 하나도 못 받았어요. festivals.json 은 지난번 그대로 둡니다.")
        sys.exit(1)

    first = [it for it in items if not any(w in it.get("title", "") for w in BAD_TITLE)]
    print("전국 %d개 중 제목으로 거른 뒤 %d개 — 상세 정보를 받습니다" % (len(items), len(first)))
    # 상세가 연달아 실패하면(신청 · 한도 · 서버 문제) 나머지는 묻지 않는다 — 목록 정보만으로 저장한다
    detailed, fails_in_row = [], 0
    for it in first:
        if fails_in_row >= 6:
            detailed.append(it)
            continue
        before = len(it)
        it = add_details(key, it)
        fails_in_row = fails_in_row + 1 if len(it) == before else 0
        if fails_in_row == 6:
            print("상세 정보가 여섯 번 연달아 비어서 나머지 행사는 목록 정보만 저장합니다.")
        detailed.append(it)
    final = [it for it in detailed if keep(it)]
    with_overview = sum(1 for it in final if it.get("overview"))
    print("최종 %d개 (소개 글 있는 행사 %d개)" % (len(final), with_overview))

    with open("festivals.json", "w", encoding="utf-8") as f:
        json.dump(final, f, ensure_ascii=False, indent=4)
    print("festivals.json 저장")


if __name__ == "__main__":
    main()
