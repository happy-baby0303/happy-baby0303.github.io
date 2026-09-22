/* ============================================================
   배냇함 — 묘비 (graveyard.js)

   지운 것은 지워진 채로 있어야 한다.

   지금까지의 동기화는 합집합이었다.
   내 폰에서 사진을 빼내도, 짝꿍 폰에는 아직 남아 있으니
   다음 동기화 때 그대로 되살아났다.

   그래서 "지웠다"는 사실도 같이 동기화한다.
   지운 id에 묘비를 세우고, 그 묘비를 서버에 함께 올린다.
   병합할 때 묘비가 있는 id는 되살리지 않는다.

   묘비는 90일 뒤에 치운다. 그쯤이면 모든 기기가 이미 알고 있다.

   index.html 에서 script.js 바로 다음에 로드하세요.
   ============================================================ */
(function () {
    'use strict';

    var TTL = 90 * 86400000;   // 묘비 유효기간 90일

    function suffix() { return window.currentBabySuffix || ""; }

    function key(kind) { return "tosil_grave_" + kind + suffix(); }

    function load(kind) {
        try {
            var v = JSON.parse(localStorage.getItem(key(kind)));
            return (v && typeof v === "object" && !Array.isArray(v)) ? v : {};
        } catch (e) { return {}; }
    }

    function save(kind, obj) {
        try { localStorage.setItem(key(kind), JSON.stringify(obj)); } catch (e) {}
    }

    // 오래된 묘비 정리
    function prune(obj) {
        var now = Date.now(), out = {};
        Object.keys(obj).forEach(function (id) {
            if (now - (Number(obj[id]) || 0) < TTL) out[id] = obj[id];
        });
        return out;
    }

    window.Grave = {

        // 지울 때 부른다
        add: function (kind, id) {
            if (!id) return;
            var o = prune(load(kind));
            o[String(id)] = Date.now();
            save(kind, o);
        },

        // 병합할 때 "이거 지워진 건가?" 물어본다
        has: function (kind, id) {
            if (!id) return false;
            return !!load(kind)[String(id)];
        },

        // 서버에 같이 올릴 묘비 목록
        list: function (kind) {
            var o = prune(load(kind));
            save(kind, o);
            return o;
        },

        // 서버에서 받은 묘비를 내 것과 합친다 (짝꿍이 지운 것)
        merge: function (kind, remote) {
            if (!remote || typeof remote !== "object") return;
            var o = load(kind), changed = false;
            Object.keys(remote).forEach(function (id) {
                if (!o[id]) { o[id] = Number(remote[id]) || Date.now(); changed = true; }
            });
            if (changed) save(kind, prune(o));
        },

        // 여러 개를 물어볼 때 — 한 번만 읽는다 (고치지도, 저장하지도 않는다)
        peek: function (kind) { return load(kind); },

        // 되돌리기가 필요할 때 (실수로 지웠을 때 대비)
        forgive: function (kind, id) {
            var o = load(kind);
            delete o[String(id)];
            save(kind, o);
        },

        /* ---------- 점검용 ---------- */
        debug: function () {
                       ["photo", "voice", "seal", "note", "word", "trk"].forEach(function (k) {
                var o = load(k);
                console.log("[묘비] " + k + ": " + Object.keys(o).length + "개");
            });
        }
    };

    /* ==========================================================
       합친 뒤 다시 올려야 하나 — 사진 · 목소리 · 한 줄 · 봉인 편지가 같이 쓴다
       ----------------------------------------------------------
       ⚠️ 동기화가 '통째로 올리기' 라서, 두 폰이 비슷한 때에 올리면
          나중에 올린 폰의 옛 사본이 서버에 남았다.
          그러면 방금 담은 사진·한 줄이 짝꿍 폰에 끝내 안 갔다
          (이 폰에서 뭔가를 새로 담아야 그제야 같이 올라갔다).
          합칠 때 서버에 없는 게 이 폰에 있으면(새로 담은 것 · 고친 것 · 지운 표시)
          한 번 더 올린다. 서버가 다 가지면 멈춘다 — 무한히 주고받지 않는다.
          서버는 열쇠 순서를 바꿔서 돌려주므로 순서와 상관없이 비교한다.
       ---------------------------------------------------------- */
    function sig(v) {
        if (Array.isArray(v)) return "[" + v.map(sig).join(",") + "]";
        if (v && typeof v === "object") {
            return "{" + Object.keys(v).sort()
                .filter(function (k) { return v[k] !== undefined; })
                .map(function (k) { return JSON.stringify(k) + ":" + sig(v[k]); }).join(",") + "}";
        }
        return JSON.stringify(v === undefined ? null : v);
    }

    // { 날짜: [항목] } 이든 [항목] 이든 → { id: 내용 }
    function flat(x) {
        var out = {};
        var add = function (it) { if (it && it.id) out[it.id] = sig(it); };
        if (Array.isArray(x)) x.forEach(add);
        else if (x && typeof x === "object") {
            Object.keys(x).forEach(function (k) { if (Array.isArray(x[k])) x[k].forEach(add); });
        }
        return out;
    }

    window.syncNeedsPush = function (remote, merged, remoteDeleted, kind) {
        var r = flat(remote), m = flat(merged);
        var ids = Object.keys(m);
        for (var i = 0; i < ids.length; i++) if (r[ids[i]] !== m[ids[i]]) return true;
        if (kind) {
            var mine = load(kind), theirs = (remoteDeleted && typeof remoteDeleted === "object") ? remoteDeleted : {};
            var gs = Object.keys(mine);
            for (var g = 0; g < gs.length; g++) {
                if (!(gs[g] in theirs) && Date.now() - (Number(mine[gs[g]]) || 0) < TTL) return true;
            }
        }
        return false;
    };
    window.syncSig = sig;
})();