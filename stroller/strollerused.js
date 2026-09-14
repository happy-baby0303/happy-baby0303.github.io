/* ============================================================
   배냇함 — 유모차 중고 (strollerused.js)

   카시트 큐레이터에는 '중고로 사기 전에' 카드가 있다.
   거기 답은 간단하다 — 사고 이력이 있으면 쓰면 안 된다.

   유모차는 정반대다.

       카시트   중고는 위험하다. 겉이 멀쩡해도 안쪽이 상한다
       유모차   중고가 정상적인 선택이다. 오히려 흔하다

   100만원짜리 디럭스를 1년 쓰고 파는 사람이 널렸고,
   사는 쪽도 파는 쪽도 그게 이상한 일이 아니다.

   그런데 이 앱은 그 얘기를 한 마디도 안 한다.
   카시트 카드만 읽은 부모가 유모차도 중고면 위험한 줄 안다.

   ⚠️ 시세를 적지 않는다.
      우리가 값을 말하면 그건 근거를 대야 하는 숫자가 되고,
      매달 바뀐다. 대신 무엇을 볼지만 알려준다.

   ⚠️ "사세요 / 팔지 마세요" 라고 하지 않는다.
      판단은 부모가 한다. 우리는 볼 것만 짚는다.

   index.html 에서 strollerown.js 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var INK = "#191F28", GRAY = "#8B95A1", RED = "#C62828";
    var ID = "stroller-used";

    /* 살 때 — 눈으로 볼 수 있는 것만 적는다 */
    var BUY = [
        { t: "프레임 이음새에 금이 갔나",
          d: "접히는 관절과 바퀴가 붙는 자리를 손으로 만져보세요. " +
             "<b>금이 간 프레임은 쓰면 안 됩니다.</b> 그건 수리가 아니라 교체입니다." },
        { t: "브레이크가 진짜 잠기나",
          d: "밟아놓고 <b>밀어보세요.</b> 눌리기만 하고 안 잠기는 게 중고에서 제일 흔한 고장입니다." },
        { t: "바퀴가 흔들리나",
          d: "앞바퀴를 잡고 좌우로 흔들어 보세요. 헐거우면 미는 내내 한쪽으로 쏠립니다." },
        { t: "부품을 아직 파나",
          d: "단종된 모델은 <b>바퀴 하나 못 구해서</b> 통째로 버리게 됩니다. " +
             "브랜드 고객센터에 모델명으로 한 번 물어보세요." },
        { t: "리콜된 모델은 아닌가",
          d: "모델명으로 제품안전정보센터에서 확인하세요. 아래 카드에 바로 가는 길이 있습니다." },
        { t: "안전벨트와 차양이 다 있나",
          d: "5점식 벨트, 차양, 아래 바구니. 없으면 따로 사기 어렵고 비쌉니다." }
    ];

    /* 팔 때 */
    var SELL = [
        { t: "시트를 빼서 빨아두세요",
          d: "대부분 시트가 분리됩니다. 세탁 여부 하나로 값이 달라집니다." },
        { t: "부속품을 다 모으세요",
          d: "차양·컵홀더·비닐커버·설명서. 흩어져 있으면 사는 쪽이 깎습니다." },
        { t: "접은 크기를 찍어두세요",
          d: "사는 사람이 제일 먼저 묻는 게 <b>\"내 트렁크에 들어가나\"</b> 입니다. " +
             "접은 상태를 줄자와 같이 찍어두면 질문이 반으로 줍니다." },
        { t: "산 날짜를 적어두세요",
          d: "보증 기간이 남았으면 그대로 넘어갑니다. 그게 값을 올립니다." }
    ];

    function esc(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;")
            .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    var side = "buy";
    window.switchUsedSide = function (v) { side = v; paint(); };

    function rows(list) {
        return list.map(function (r, i) {
            return '<div style="display:flex; gap:11px; padding:13px 0; ' +
                (i < list.length - 1 ? 'border-bottom:1px solid #F2F4F6;' : '') + '">' +
                '<div style="width:20px; flex-shrink:0; font-size:12px; font-weight:900; ' +
                    'color:' + GRAY + '; padding-top:2px;">' + (i + 1) + '</div>' +
                '<div style="flex:1; min-width:0;">' +
                    '<div style="font-size:13.5px; font-weight:900; color:' + INK + '; ' +
                        'margin-bottom:5px; word-break:keep-all;">' + esc(r.t) + '</div>' +
                    '<div style="font-size:12.5px; font-weight:600; color:#4E5968; ' +
                        'line-height:1.75; word-break:keep-all;">' + r.d + '</div>' +
                '</div>' +
            '</div>';
        }).join("");
    }

    function tab(id, label) {
        var on = (side === id);
        return '<div onclick="window.switchUsedSide(\'' + id + '\')" ' +
            'style="flex:1; text-align:center; padding:11px 0; border-radius:11px; cursor:pointer; ' +
            'font-size:13.5px; font-weight:800; transition:0.15s; ' +
            (on ? 'background:#FFFFFF; color:' + INK + '; box-shadow:0 2px 6px rgba(0,0,0,0.07);'
                : 'background:transparent; color:' + GRAY + ';') + '">' + label + '</div>';
    }

    function html() {
        return '<div class="matrix-panel" id="' + ID + '" style="margin-bottom:20px;">' +
            '<div class="matrix-header">🥕 유모차 중고로 사고팔기</div>' +

            /* ⚠️ 카시트와 반대라는 걸 먼저 말한다.
                  카시트 카드만 읽은 부모가 유모차도 위험한 줄 안다. */
            '<div style="font-size:13px; font-weight:600; color:#4E5968; ' +
                'margin:-16px 0 16px; line-height:1.75; word-break:keep-all;">' +
                '유모차는 <b>중고가 흔한 물건</b>입니다. 1년 쓰고 파는 사람이 많아요.<br>' +
                '<span style="color:' + RED + '; font-weight:800;">다만 카시트는 다릅니다 — ' +
                '사고 이력이 있으면 겉이 멀쩡해도 쓰면 안 됩니다.</span>' +
            '</div>' +

            '<div style="display:flex; gap:5px; background:#F2F4F6; border-radius:13px; ' +
                'padding:4px; margin-bottom:6px;">' +
                tab("buy", "살 때 볼 것") + tab("sell", "팔 때 챙길 것") +
            '</div>' +

            rows(side === "buy" ? BUY : SELL) +

            '<div style="margin-top:14px; padding-top:13px; border-top:1px dashed #E5E8EB; ' +
                'font-size:11.5px; font-weight:600; color:' + GRAY + '; line-height:1.7; ' +
                'word-break:keep-all;">' +
                '값은 적지 않았습니다. 모델과 연식마다 달라서, 저희가 숫자를 말하면 ' +
                '그게 기준처럼 읽히거든요. 볼 것만 짚어드립니다.' +
            '</div>' +
        '</div>';
    }

    function paint() {
        var el = document.getElementById(ID);
        if (!el) return;
        var box = document.createElement("div");
        box.innerHTML = html();
        el.parentNode.replaceChild(box.firstChild, el);
    }

    function mount() {
        var h = document.getElementById("view-stroller-use");
        if (!h || document.getElementById(ID)) return;
        var box = document.createElement("div");
        box.innerHTML = html();
        if (box.firstChild) h.appendChild(box.firstChild);
    }

    function boot() {
        setTimeout(mount, 900);
        setTimeout(mount, 2600);
        setInterval(mount, 5000);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();

    window.usedDebug = function () {
        console.log("지금 쪽:", side);
        console.log("붙었나:", !!document.getElementById(ID));
    };
})();