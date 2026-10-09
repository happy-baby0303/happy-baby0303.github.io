/* 육아문답 질문 — 짧고, 한 번에 하나만 묻는다.
   '벅찬 · 몽글몽글 · 찰나 · 우주 · 압도적' 같은 말을 겹쳐 쓰면 읽는 순간 사람이 쓴 글 같지 않다.
   답은 부부가 쓰는 것이니, 질문은 말 거는 정도면 충분하다.
   ⚠️ {babyName} 뒤에는 가 · 의 · 는 · 를 · 와 · 라 만 쓴다 (받침에 맞춰 '이' 가 붙는다). */
const questionDB = [
    { id: 1, context: "육아", category: "위로", question: "오늘 고생한 서로에게, 지금 가장 먼저 해주고 싶은 말은?" },
    { id: 2, context: "부부", category: "추억", question: "처음 만난 날, 서로의 어떤 모습이 가장 먼저 눈에 들어왔어요?" },
    { id: 3, context: "육아", category: "사랑", question: "잠든 {babyName}의 손을 잡고 있으면 어떤 생각이 들어요?" },
    { id: 4, context: "부부", category: "일상", question: "딱 하루, 부모가 아니라 둘이서만 보낼 수 있다면 뭘 하고 싶어요?" },
    { id: 5, context: "육아", category: "성장", question: "아이가 태어나고 가장 크게 달라진 내 생각 하나는?" },
    { id: 6, context: "부부", category: "감사", question: "내가 제일 못난 모습일 때도 받아줘서 고마웠던 날이 있어요?" },
    { id: 7, context: "육아", category: "미래", question: "{babyName}가 처음 어린이집에 가는 날, 우리는 어떤 얼굴일까요?" },
    { id: 8, context: "부부", category: "사랑", question: "처음 손잡던 날과 지금, 서로의 손이 어떻게 다르게 느껴져요?" },
    { id: 9, context: "육아", category: "일상", question: "정신없는 하루 중에 둘이 잠깐 숨 돌리는 시간은 언제예요?" },
    { id: 10, context: "부부", category: "추억", question: "반지를 나눠 끼던 날, 그때 기분을 한 문장으로 적는다면?" },
    { id: 11, context: "육아", category: "성장", question: "{babyName}가 걷게 되면 제일 먼저 같이 걷고 싶은 길은 어디예요?" },
    { id: 12, context: "부부", category: "위로", question: "피곤해서 날 선 말을 했던 날, 늦었지만 지금 하고 싶은 말은?" },
    { id: 13, context: "육아", category: "감사", question: "아침에 눈 떴을 때 옆에 잠든 가족을 보면 무슨 생각이 들어요?" },
    { id: 14, context: "부부", category: "사랑", question: "연애할 때와 비교해서, 요즘 짝꿍이 더 멋있어 보이는 점은?" },
    { id: 15, context: "육아", category: "위로", question: "부족한 부모 같아서 속상할 때, 서로에게 해주고 싶은 말은?" },
    { id: 16, context: "부부", category: "일상", question: "하루 끝에 소파에 나란히 누워 있을 때, 제일 좋은 건 뭐예요?" },
    { id: 17, context: "육아", category: "추억", question: "{babyName}가 태어나던 날, 가장 또렷하게 기억나는 장면은?" },
    { id: 18, context: "부부", category: "사랑", question: "짝꿍이 나를 볼 때 '사랑받고 있구나' 싶은 순간은 언제예요?" },
    { id: 19, context: "육아", category: "미래", question: "{babyName}가 커서 우리를 어떤 엄마 아빠로 기억해 주면 좋겠어요?" },
    { id: 20, context: "부부", category: "추억", question: "첫 데이트 날, 아직도 기억나는 장면 하나는?" },
    { id: 21, context: "육아", category: "일상", question: "오늘 {babyName} 때문에 제일 크게 웃은 순간은?" },
    { id: 22, context: "부부", category: "위로", question: "밖에서 힘든 날, 짝꿍의 어떤 말이나 행동이 제일 힘이 돼요?" },
    { id: 23, context: "육아", category: "성장", question: "부모가 되고 나서 내 부모님이 새삼 이해된 순간이 있어요?" },
    { id: 24, context: "부부", category: "미래", question: "우리 가족 저축 목표를 이루면, 둘이서 뭘 하며 축하할까요?" },
    { id: 25, context: "육아", category: "감동", question: "{babyName}가 잠결에 품으로 파고들 때, 어떤 기분이 들어요?" },
    { id: 26, context: "부부", category: "사랑", question: "연애할 때 서로를 부르던 애칭, 기억나요?" },
    { id: 27, context: "육아", category: "감사", question: "짝꿍이 말없이 집안일이나 목욕을 맡아줬을 때, 고마웠던 날은?" },
    { id: 28, context: "부부", category: "추억", question: "신혼여행 얘기 중에 지금 꺼내도 웃긴 일은?" },
    { id: 29, context: "육아", category: "미래", question: "{babyName}가 열 살이 되면, 주말마다 같이 하고 싶은 게 있어요?" },
    { id: 30, context: "부부", category: "일상", question: "서로 달라서 부딪혔지만, 이제는 잘 맞춰진 부분이 있어요?" },
    { id: 31, context: "육아", category: "사랑", question: "{babyName}가 짝꿍을 꼭 닮았으면 하는 점 하나는?" },
    { id: 32, context: "부부", category: "위로", question: "완전히 지친 날, 짝꿍이 해주면 제일 위로가 되는 건 뭐예요?" },
    { id: 33, context: "육아", category: "성장", question: "아이를 키우며 처음 알게 된 내 다정한 모습이 있어요?" },
    { id: 34, context: "부부", category: "감사", question: "나를 쉬게 해주려고 짝꿍이 애써준 아침이 있었어요?" },
    { id: 35, context: "육아", category: "추억", question: "{babyName}라는 이름을 지을 때, 우리가 나눴던 얘기 기억나요?" },
    { id: 36, context: "부부", category: "사랑", question: "짝꿍이 어른으로서 가장 존경스러웠던 순간은?" },
    { id: 37, context: "육아", category: "미래", question: "훗날 {babyName}가 이 문답을 읽는다면, 어떤 걸 알아주면 좋겠어요?" },
    { id: 38, context: "부부", category: "일상", question: "요즘 우리 집에서 들리는 소리 중에 제일 좋은 소리는?" },
    { id: 39, context: "육아", category: "일상", question: "요즘 제일 힘든 육아 일과 하나, 제일 기다려지는 순간 하나는?" },
    { id: 40, context: "부부", category: "위로", question: "오늘 밤 둘이 먹을 야식을 하나 고른다면?" },
    { id: 41, context: "육아", category: "사랑", question: "{babyName} 얼굴에서 짝꿍 어릴 때 모습이 보일 때가 있어요?" },
    { id: 42, context: "부부", category: "추억", question: "연애 시절로 딱 하루 돌아간다면, 어느 날로 가고 싶어요?" },
    { id: 43, context: "육아", category: "위로", question: "혼자 울고 싶을 만큼 힘들었던 날, 어떻게 버텼어요?" },
    { id: 44, context: "부부", category: "감사", question: "짝꿍만의 작지만 다정한 습관 하나는?" },
    { id: 45, context: "육아", category: "성장", question: "'부모가 되길 참 잘했다' 싶었던 순간은?" },
    { id: 46, context: "부부", category: "미래", question: "우리 가족을 영화로 만든다면 무슨 장르일까요?" },
    { id: 47, context: "육아", category: "추억", question: "아이가 생긴 걸 처음 알았던 날, 서로 어떤 표정이었어요?" },
    { id: 48, context: "부부", category: "사랑", question: "짝꿍의 표정 중에 제일 좋아하는 표정은?" },
    { id: 49, context: "육아", category: "감동", question: "우리 가족이 내 전부라고 느낀 순간이 있어요?" },
    { id: 50, context: "부부", category: "위로", question: "짝꿍을 만나기로 한 그때의 나에게, 한마디 해준다면?" },
    { id: 51, context: "육아", category: "일상", question: "밖에 못 나가는 주말, 집에서 제일 재밌게 노는 방법은?" },
    { id: 52, context: "부부", category: "추억", question: "같이 찍은 사진 중에 제일 좋아하는 한 장은?" },
    { id: 53, context: "육아", category: "미래", question: "{babyName}가 처음 ‘엄마’ ‘아빠’를 부르는 날, 뭐라고 대답해 줄 거예요?" },
    { id: 54, context: "부부", category: "사랑", question: "말 안 해도 서로 같은 생각을 하고 있었던 적 있어요?" },
    { id: 55, context: "육아", category: "감사", question: "{babyName}가 오고 나서 좋게 달라진 내 모습 하나는?" },
    { id: 56, context: "부부", category: "위로", question: "해결책보다 '내 편'이 되어줘서 위로받았던 대화가 있어요?" },
    { id: 57, context: "육아", category: "성장", question: "{babyName}가 넘어지고 속상해할 때, 우리는 어떤 부모이고 싶어요?" },
    { id: 58, context: "부부", category: "미래", question: "일흔 살의 우리는 어떤 모습일까요?" },
    { id: 59, context: "육아", category: "일상", question: "별거 아닌데 유난히 좋았던 주말 하루가 있어요?" },
    { id: 60, context: "부부", category: "감사", question: "같이 산다는 게 실감 났던 사소한 장면이 있어요?" },
    { id: 61, context: "육아", category: "추억", question: "아픈 {babyName}를 번갈아 안고 버틴 밤, 기억나요?" },
    { id: 62, context: "부부", category: "성장", question: "요즘 서로 닮아간다고 느낀 점은?" },
    { id: 63, context: "육아", category: "사랑", question: "{babyName}와 놀다가 짝꿍이 더 신나 보였던 순간은?" },
    { id: 64, context: "부부", category: "위로", question: "우리 가족을 지키려고 요즘 서로 애쓰는 것 하나는?" },
    { id: 65, context: "육아", category: "미래", question: "{babyName}가 좀 더 크면, 가족이 같이 해보고 싶은 첫 번째 일은?" },
    { id: 66, context: "부부", category: "일상", question: "요즘 우리 밥상에서 제일 자주 나오는 얘기는?" },
    { id: 67, context: "육아", category: "감사", question: "{babyName}가 무사히 잠든 것만으로도 고마웠던 날이 있어요?" },
    { id: 68, context: "부부", category: "추억", question: "들으면 연애 시절이 떠오르는 우리 노래는?" },
    { id: 69, context: "육아", category: "사랑", question: "품에 안긴 {babyName}의 숨소리를 듣고 있으면 어떤 기분이에요?" },
    { id: 70, context: "부부", category: "성장", question: "막막할 때 우리를 붙잡아 주는 약속이 있다면?" },
    { id: 71, context: "육아", category: "미래", question: "{babyName}가 어떤 친구들을 만나면 좋겠어요?" },
    { id: 72, context: "부부", category: "일상", question: "오늘 가장 나다웠던 순간은 언제였어요?" },
    { id: 73, context: "육아", category: "위로", question: "아기띠 메고 걸었던 산책길, 그때 무슨 생각을 했어요?" },
    { id: 74, context: "부부", category: "사랑", question: "결혼을 결심하게 만든 짝꿍의 모습, 지금도 그대로예요?" },
    { id: 75, context: "육아", category: "감사", question: "요즘 우리 육아를 도와준 고마운 사람은 누구예요?" },
    { id: 76, context: "부부", category: "추억", question: "결혼 준비하며 다퉜는데 지금은 웃긴 일이 있어요?" },
    { id: 77, context: "육아", category: "성장", question: "요즘 {babyName}가 마음으로 자랐다고 느낀 순간은?" },
    { id: 78, context: "부부", category: "위로", question: "일과 육아를 같이 해내는 서로에게, 오늘 한 줄 응원을 보낸다면?" },
    { id: 79, context: "육아", category: "미래", question: "{babyName}와 단둘이 데이트한다면 어디서 무슨 얘기를 하고 싶어요?" },
    { id: 80, context: "부부", category: "일상", question: "바쁜 와중에 둘만의 시간이 가장 필요한 때는 언제예요?" },
    { id: 81, context: "육아", category: "감동", question: "주말 아침, 옆에서 자는 {babyName}를 보며 행복했던 순간이 있어요?" },
    { id: 82, context: "부부", category: "사랑", question: "연애와 결혼을 통틀어, 다시 펼쳐보고 싶은 한 장면은?" },
    { id: 83, context: "육아", category: "추억", question: "{babyName}가 처음 우리를 보고 웃어준 날, 기억나요?" },
    { id: 84, context: "부부", category: "감사", question: "외출하고 돌아와 '역시 집이 최고다' 싶었던 날이 있어요?" },
    { id: 85, context: "육아", category: "성장", question: "부모가 되면서 나도 자라고 있다고 느낀 때는 언제예요?" },
    { id: 86, context: "부부", category: "미래", question: "주말 아침에 편하게 가는 가족 단골집이 생긴다면, 어떤 곳이면 좋겠어요?" },
    { id: 87, context: "육아", category: "일상", question: "{babyName}와 숨바꼭질하며 둘이 웃었던 순간이 있어요?" },
    { id: 88, context: "부부", category: "위로", question: "오늘 하루 잘 버틴 서로에게, 고마운 점 하나씩 적어볼까요?" },
    { id: 89, context: "육아", category: "사랑", question: "짝꿍이 {babyName}에게 책 읽어주는 목소리를 들으면 어떤 기분이에요?" },
    { id: 90, context: "부부", category: "감사", question: "오늘 '이 사람이라 다행이다' 싶었던 순간은?" },
    { id: 91, context: "육아", category: "추억", question: "처음 가족 여행 가던 날, 기억에 남는 장면은?" },
    { id: 92, context: "부부", category: "성장", question: "연애 때보다 느려졌지만 더 단단해진 게 있다면?" },
    { id: 93, context: "육아", category: "위로", question: "육아가 뜻대로 안 될 때, 짝꿍의 어떤 말이 힘이 돼요?" },
    { id: 94, context: "부부", category: "사랑", question: "먼저 잠든 짝꿍을 보고 있으면 어떤 마음이 들어요?" },
    { id: 95, context: "육아", category: "미래", question: "우리 가족을 색 하나로 칠한다면 무슨 색일까요?" },
    { id: 96, context: "부부", category: "일상", question: "나중에 {babyName}와 맞춰 입고 싶은 옷이 있어요?" },
    { id: 97, context: "육아", category: "감동", question: "{babyName}의 첫 신발을 샀을 때, 어떤 마음이었어요?" },
    { id: 98, context: "부부", category: "추억", question: "연애할 때 처음 같이 본 영화나 드라마는 뭐였어요?" },
    { id: 99, context: "육아", category: "감사", question: "아무 일 없는 하루가 고맙게 느껴졌던 날이 있어요?" },
    { id: 100, context: "부부", category: "사랑", question: "{day}번째 문답이에요. 지금까지 서로에게 가장 하고 싶었던 말은?" }
];

/* ============================================================
   질문 꺼내는 창구 — 문답·책장·배냇함·포토북이 전부 이것 하나를 쓴다

   ⚠️ const 는 window 에 안 붙는다.
      bookshelf.js 가 window.questionDB 로 찾다가 못 찾아서
      책을 펼치면 질문 없이 답만 나왔다.

   ⚠️ 이름 뒤 조사를 받침에 맞춘다.
      "{babyName}가" 를 그냥 바꾸면 "서준가 처음으로…" 가 된다.
      받침이 있으면 '이' 를 붙인다  →  서준이가 · 지우가

   ⚠️ 100일이 지나면 질문이 처음부터 다시 돈다.
      100번 질문에 "100번째 일기" 가 박혀 있어서
      200일째에도 "100번째" 라고 나왔다. {day} 로 바꿨다.
   ============================================================ */
window.questionDB = questionDB;

(function () {
    function rawName() {
        return (localStorage.getItem("tosil_babyName") || "").trim() || "우리 아기";
    }
    function hasJong(s) {
        var c = s.charCodeAt(s.length - 1);
        return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0;
    }
    /* 조사는 받침 없는 꼴로 받는다. 받침 있는 이름엔 '이' 가 앞에 붙는다.
       babyCall("가") → 서준이가 / 지우가      babyCall("") → 서준이 / 지우 */
    window.babyCall = window.babyCall || function (josa) {
        try { if (typeof window.babyNm === "function") return window.babyNm(josa || ""); } catch (e) {}
        var n = rawName();
        if (n === "우리 아기") return n + (josa || "");
        return n + (hasJong(n) ? "이" : "") + (josa || "");
    };

    var SOFT = { "이가": "가", "가": "가", "은": "는", "는": "는", "을": "를", "를": "를",
                 "과": "와", "와": "와", "이라": "라", "라": "라", "아": "야", "야": "야", "의": "의" };

    window.diaryQuestion = function (day) {
        var list = questionDB;
        if (!list || !list.length) return "";
        day = Math.max(1, parseInt(day, 10) || 1);
        var it = list[(day - 1) % list.length];
        if (!it) return "";
        var named = rawName() !== "우리 아기";
        return String(it.question)
            // 이름을 아직 안 정했으면 "아기 이름(우리 아기)을" 이 된다 → 괄호째 뺀다
            .replace(/\(\{babyName\}\)/g, named ? "(" + rawName() + ")" : "")
            .replace(/\{babyName\}(이가|이라|가|은|는|을|를|과|와|라|아|야|의)?/g, function (m, j) {
                return j ? window.babyCall(SOFT[j] || j) : rawName();
            })
            .replace(/\{day\}/g, String(day));
    };

    /* 같은 질문을 다시 만나는 날인가 (101일째 = 1일째 질문) */
    window.diaryEchoDay = function (day) {
        var n = questionDB.length;
        day = parseInt(day, 10) || 0;
        return day > n ? day - n : 0;
    };
})();