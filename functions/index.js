/**
 * 배냇함 Cloud Functions — 전체 2세대(v2)
 * ------------------------------------------------------------------
 * 📍 리전 배치
 *  - kakaoCustomAuth  : us-central1     (앱의 getFunctions(app) 와 짝)
 *  - sendFamilyPush   : asia-northeast3 (서울)
 *  - deleteUserAccount: asia-northeast3 (서울)  ← 이번에 제대로 다시 씀
 *  - bedtimeReminder  : asia-northeast3 (서울 / 15분마다)   ← 육퇴 알림
 *  - countWaitlist    : asia-northeast3 (대기명단 카운터)
 *  - stageDaily       : asia-northeast3 (서울 / 매일 아침 9시) ← 임신 주차 · 신청 마감
 *  - careReminder     : asia-northeast3 (서울 / 5분마다)    ← 수유 · 기저귀 알림
 *  - pushCheck        : asia-northeast3 (서울)              ← 앱의 '알림 점검'
 *
 * ⚠️ 이 파일을 고치면 꼭 배포해야 서버에 반영된다 (깃허브에 올리는 것과 별개)
 *      functions 폴더가 있는 곳(육아메이트 폴더)에서
 *      firebase deploy --only functions
 *    '지워도 되냐(delete)' 고 물으면 No. 여기 없는 함수를 지우겠다는 뜻이다.
 * ------------------------------------------------------------------
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();

// 서울 리전 옵션 (푸시 / 탈퇴)
const SEOUL = { region: "asia-northeast3", maxInstances: 10 };
// 리전 미지정 = us-central1 (카카오 로그인 — 앱의 getFunctions(app)와 짝이 맞음)
const US = { maxInstances: 10 };

// 스토리지 버킷 (명시해두면 환경이 바뀌어도 안 흔들린다)
const BUCKET = "happybaby-6de42.firebasestorage.app";

// 앱 주소 — 알림을 눌렀을 때 여는 곳 (https 여야 한다)
const APP_URL = "https://happy-baby0303.github.io/";

/* ==================================================================
 * 💛 1. 카카오 로그인 우회 서버 (2세대 / us-central1)
 * ================================================================== */
exports.kakaoCustomAuth = onCall(US, async (request) => {
  const token = request.data && request.data.token;

  if (!token) {
    throw new HttpsError("invalid-argument", "카카오 토큰이 전달되지 않았습니다.");
  }

  try {
    const kakaoResponse = await axios.get("https://kapi.kakao.com/v2/user/me", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const kakaoUser = kakaoResponse.data;
    const uid = `kakao:${kakaoUser.id}`;

    const firebaseToken = await admin.auth().createCustomToken(uid);
    return { customToken: firebaseToken };
  } catch (error) {
    logger.error("카카오 로그인 에러", error);
    throw new HttpsError("internal", "카카오 로그인 처리 중 서버 에러가 발생했습니다.");
  }
});

/* ==================================================================
 * 🔔 2. 가족에게 푸시 알림 보내기 (2세대 / 서울)
 * ================================================================== */
exports.sendFamilyPush = onCall(SEOUL, async (request) => {
  const senderUid = request.auth && request.auth.uid;
  if (!senderUid) return { success: false, error: "로그인이 필요합니다." };

  const { syncCode, title, body, excludeToken, link } = request.data || {};
  if (!syncCode) return { success: false, error: "가족 코드가 없습니다." };

  /* 알림을 누르면 갈 곳 (예: "diary.html", "index.html?go=toolbox")
     우리 앱 안의 상대 주소만 받는다. 바깥 주소는 버린다 — 가짜 링크로 남의 사이트에 보내지 못하게. */
  const path = (typeof link === "string" && /^[a-zA-Z0-9_\-./?=&]{1,80}$/.test(link) &&
                !link.startsWith("/") && !link.includes("..") && !link.includes("//"))
    ? link : "";
  // 링크가 없으면 싣지 않는다 → sw.js 가 제목으로 짐작한다 (바통 → 툴박스)
  const linkData = path ? { data: { link: path } } : {};
  const linkWeb  = path ? { fcmOptions: { link: APP_URL + path } } : {};

  try {
    const db = admin.firestore();

    const familyDoc = await db.collection("families").doc(String(syncCode)).get();
    if (!familyDoc.exists) return { success: false, error: "가족방이 없습니다." };

      // members 는 { uid: "master" } 형태의 객체다. 옛 배열도 받아준다.
    const raw = familyDoc.data().members || {};
    const all = Array.isArray(raw) ? raw : Object.keys(raw);

    /* ⚠️ 이 방 사람인지 아무도 확인하지 않고 있었다.
          가족 코드는 "TS-" + 영숫자 8자다. 남의 코드를 알거나 찍으면
          로그인만 한 상태로 그 집에 아무 제목·본문이나 띄울 수 있었다.
          아기 이름을 넣은 가짜 알림은 부모에게 그대로 먹힌다.
          보내는 사람이 이 방 사람인지부터 본다. */
    if (!all.includes(senderUid)) {
      logger.warn("가족방 밖에서 온 푸시 요청", { syncCode, senderUid });
      return { success: false, error: "이 가족방의 구성원이 아닙니다." };
    }

    const targetUids = all.filter((uid) => uid !== senderUid);
    if (targetUids.length === 0) {
      logger.warn("가족방에 상대가 없음", { syncCode, senderUid, members: all });
      return { success: false, error: "알림을 보낼 가족이 없습니다." };
    }

    const tokenMap = new Map();
    for (let i = 0; i < targetUids.length; i += 10) {
      const chunk = targetUids.slice(i, i + 10);
      const snap = await db
        .collection("users")
        .where("firebase_uid", "in", chunk)
        .get();
      snap.forEach((doc) => {
        const d = doc.data();
        if (d.push_baton === false) return;   // 이 사람은 바통터치 알림을 껐다

        /* ⚠️ 예전엔 fcm_token 하나만 읽어서, 기기 한 대만 알림을 받았다.
              폰·태블릿·컴퓨터를 같이 쓰면 마지막에 연 것만 받는 구조였다.
              이제 fcm_tokens 배열을 읽는다. 옛 필드도 같이 본다 —
              앱을 아직 안 켠 사람은 배열이 없기 때문이다. */
        const list = Array.isArray(d.fcm_tokens) ? d.fcm_tokens.slice() : [];
        if (d.fcm_token && !list.includes(d.fcm_token)) list.push(d.fcm_token);
        list.forEach((t) => { if (t) tokenMap.set(t, doc.id); });
      });
    }

    /* ⚠️ uid 로만 걸러내면 내 알림이 내 폰으로 돌아오는 걸 못 막는다.
          토큰이 어느 user 문서에 적혔는지는 로그인 시점에 따라 어긋날 수 있고
          (firebase_uid 를 localStorage 캐시에서 읽어 저장한 적이 있다),
          한 사람이 계정을 두 번 만들면 uid 가 둘이 된다.

          보낸 기기의 토큰 자체를 뺀다. 이건 어긋날 수가 없다.
          내가 누른 일로 내 폰이 울리는 일은 이제 없다. */
    const drop = new Set(
      (Array.isArray(excludeToken) ? excludeToken : [excludeToken]).filter(Boolean)
    );
    const tokens = [...tokenMap.keys()].filter((t) => !drop.has(t));

    logger.info("푸시 대상", {
      syncCode, targetUids, tokenCount: tokens.length, dropped: drop.size,
    });
    if (tokens.length === 0) {
      logger.warn("푸시 토큰 없음", { syncCode, targetUids });
      return {
        success: false,
        error: "상대방이 알림 허용을 안 했거나 토큰이 저장되지 않았습니다.",
      };
    }

    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: { title, body },
      ...linkData,
      webpush: {
        // ⚠️ '급함' 표시가 없으면 폰이 절전 중일 때 한참 늦게 온다 (아래 '알림 공통' 참고)
        headers: { Urgency: "high", TTL: String(TTL.family) },
        notification: {
          title,
          body,
          icon: "/icon-192x192.png",
          // badge: "/icon-badge.png",   // ⚠️ 컬러 PNG 는 안드로이드 상태바에서 흰 네모가 된다
        },
        // ⚠️ 이게 없어서 알림을 눌러도 어디로 갈지 몰랐다 (sw.js 가 먼저 받아서 이 주소로 보낸다)
        ...linkWeb,
      },
      android: { priority: "high" },
      apns: { payload: { aps: { sound: "default" } } },
    });

    const deadTokens = [];
    response.responses.forEach((r, idx) => {
      if (r.success) return;
      const code = r.error && r.error.code;
      logger.warn("푸시 개별 실패", { code, message: r.error && r.error.message });
      // ⚠️ invalid-argument 는 빼야 한다. 글이 잘못돼도 이 코드가 나오는데, 그걸 죽은 토큰으로 보면 가족 전원의 토큰이 지워진다
      if (DEAD_CODES.has(code)) {
        deadTokens.push(tokens[idx]);
      }
    });

    /* ⚠️ 죽은 토큰만 정확히 뺀다.
          예전엔 fcm_token 필드를 통째로 지워서,
          기기 하나가 죽으면 그 사람 알림이 전부 끊겼다. */
    await Promise.all(
      deadTokens.map((t) => {
        const update = { fcm_tokens: admin.firestore.FieldValue.arrayRemove(t) };
        return db
          .collection("users")
          .doc(tokenMap.get(t))
          .get()
          .then((snap) => {
            // 옛 단일 필드가 마침 그 죽은 토큰이면 그것도 지운다
            if (snap.exists && snap.data().fcm_token === t) {
              update.fcm_token = admin.firestore.FieldValue.delete();
            }
            return db.collection("users").doc(tokenMap.get(t)).update(update);
          })
          .catch(() => {});
      })
    );

    logger.info("푸시 발송 결과", {
      total: tokens.length,
      success: response.successCount,
      fail: response.failureCount,
    });

    return {
      success: response.successCount > 0,
      sent: response.successCount,
      failed: response.failureCount,
    };
  } catch (error) {
    logger.error("푸시 에러", error);
    return { success: false, error: error.message };
  }
});

/* ==================================================================
 * 🧹 3. 회원 탈퇴 (2세대 / 서울)
 *
 *    예전 버전은 users 문서와 인증 계정만 지웠다.
 *    사진·소리·편지·기록은 파이어베이스에 그대로 남아 있었다.
 *    "계정을 지웠는데 아기 사진이 서버에 남아 있다" 는 건
 *    스토어 정책 위반이기도 하고, 무엇보다 약속을 어기는 일이다.
 *
 *    규칙은 단순하다.
 *      · 내가 그 방의 마지막 사람이면  → 방을 통째로 정리한다
 *      · 짝꿍이 남아 있으면            → 나만 빠진다 (짝꿍의 배냇함은 지킨다)
 *      · 내가 올린 파일                → 남겨둘 사람이 없으면 전부 삭제
 *                                        (있으면 사용자가 고른 대로)
 * ================================================================== */

// 가족코드마다 컬렉션이 따로 생기는 구조라 접두어를 모아둔다.
// 새 모듈을 만들면 여기에 한 줄 추가할 것.
const FAMILY_PREFIXES = [
  "tracker", "fever", "growth", "cube", "ledger", "routine", "settings",
  "nightduty", "baton", "photos", "voices", "sealed", "words", "notes",
  "parentNotice", "diary", "letters",
];

/* ⚠️ 다둥이 꼬리표는 "_2" 가 아니다.
      script.js 가 '_' + 시각 (예: _1726712345678) 으로 만든다.
      그래서 둘째·셋째 사진·기록은 탈퇴해도 서버에 그대로 남았다. (스토어 데이터 삭제 정책 위반)
      접두어·꼬리표 목록에 기대지 않는다. 전체 컬렉션을 훑어서
      '두 번째 조각이 이 방 코드' 인 것을 전부 지운다 — 보안 규칙이 방을 가르는 기준과 같다. */
const BABY_SUFFIXES = ["", "_2", "_3", "_4"];

// 내가 올린 파일이 사는 곳 (전부 uid 로 나뉘어 있다)
const STORAGE_ROOTS = ["memories", "voices", "profiles", "mamsuda"];

async function purgeFamilyData(db, code) {
  const names = new Set();
  for (const prefix of FAMILY_PREFIXES) {
    for (const suffix of BABY_SUFFIXES) names.add(`${prefix}_${code}${suffix}`);
  }
  try {
    const cols = await db.listCollections();
    cols.forEach((c) => { if (c.id.split("_")[1] === code) names.add(c.id); });
  } catch (e) {
    logger.warn("컬렉션 목록 실패 — 접두어 목록으로만 정리", { message: e.message });
  }
  for (const name of names) {
    try {
      await db.recursiveDelete(db.collection(name));
    } catch (e) {
      logger.warn("컬렉션 정리 실패", { name, message: e.message });
    }
  }
  // 가족 소식 페이지(news/{긴 번호}) 는 가족 코드 칸에 있지 않다. family 필드로 찾아 지운다
  try {
    const ns = await db.collection("news").where("family", "==", code).get();
    await Promise.all(ns.docs.map((d) => d.ref.delete().catch(() => {})));
  } catch (e) {
    logger.warn("소식 페이지 정리 실패", { code, message: e.message });
  }
  await db.collection("stagepush").doc(code).delete().catch(() => {});   // 임신 · 신청 알림 장부
  await db.collection("reminders").doc(code).delete().catch(() => {});
  await db.collection("families").doc(code).delete().catch(() => {});
}

async function purgeMyStorage(uid) {
  const bucket = admin.storage().bucket(BUCKET);
  for (const root of STORAGE_ROOTS) {
    try {
      await bucket.deleteFiles({ prefix: `${root}/${uid}/`, force: true });
    } catch (e) {
      logger.warn("파일 정리 실패", { root, message: e.message });
    }
  }
}

async function purgeMyPosts(db, uid) {
  const cols = ["community", "community_posts", "community_comments"];
  const fields = ["firebase_uid", "uid", "authorId"];
  for (const col of cols) {
    for (const field of fields) {
      try {
        const snap = await db.collection(col).where(field, "==", uid).get();
        await Promise.all(snap.docs.map((d) => d.ref.delete().catch(() => {})));
      } catch (e) { /* 인덱스 없거나 컬렉션 없음 — 넘어간다 */ }
    }
  }
}

exports.deleteUserAccount = onCall(SEOUL, async (request) => {
  const uid = request.auth && request.auth.uid;
  if (!uid) return { success: false, error: "권한이 없습니다." };

  const kakaoId = request.data && request.data.kakaoId;
  // 짝꿍이 남아 있어도 내가 올린 사진·소리까지 지울지 (앱에서 물어본다)
  const alsoPurgeUploads = !!(request.data && request.data.purgeUploads);

  const db = admin.firestore();
  const report = { rooms: 0, purged: 0, left: 0 };

  try {
    /* 1) 내가 속한 가족방 처리 */
      // members 가 객체라 array-contains 로는 못 찾는다.
    // "members.{uid}" 필드가 있는 방을 찾는 방식으로 바꾼다.
    // 옛 배열 구조 방도 놓치지 않게 두 번 훑는다.
    const famMap = await db
      .collection("families")
      .where(`members.${uid}`, "!=", null)
      .get()
      .catch(() => ({ docs: [] }));

    const famArr = await db
      .collection("families")
      .where("members", "array-contains", uid)
      .get()
      .catch(() => ({ docs: [] }));

    const seen = new Set();
    const famDocs = [];
    [...(famMap.docs || []), ...(famArr.docs || [])].forEach((d) => {
      if (seen.has(d.id)) return;
      seen.add(d.id);
      famDocs.push(d);
    });
    report.rooms = famDocs.length;

    for (const fam of famDocs) {
      const raw = fam.data().members || {};
      const isArr = Array.isArray(raw);
      const count = isArr ? raw.length : Object.keys(raw).length;

      if (count <= 1) {
        await purgeFamilyData(db, fam.id);      // 마지막 사람 → 방 정리
        report.purged++;
      } else if (isArr) {
        await fam.ref.update({                  // 옛 배열 구조
          members: admin.firestore.FieldValue.arrayRemove(uid),
        });
        report.left++;
      } else {
        await fam.ref.update({                  // 객체 구조 — 내 키만 지운다
          [`members.${uid}`]: admin.firestore.FieldValue.delete(),
        });
        report.left++;
      }
      if (count > 1) {
        // 알림 장부에 남은 내 표시 ('밖에 있어요' · 알림 끔) 도 지운다
        await db.collection("reminders").doc(fam.id).update({
          [`away.${uid}`]: admin.firestore.FieldValue.delete(),
          [`mute.${uid}`]: admin.firestore.FieldValue.delete(),
        }).catch(() => {});
      }
    }

    /* 2) 내 명부와 신청 기록 */
    if (kakaoId) {
      await db.collection("users").doc(String(kakaoId)).delete().catch(() => {});
    }
    const mine = await db.collection("users").where("firebase_uid", "==", uid).get();
    await Promise.all(mine.docs.map((d) => d.ref.delete().catch(() => {})));

    await db.collection("waitlist").doc(uid).delete().catch(() => {});
    await db.collection("waitlist_premium").doc(uid).delete().catch(() => {});
    await db.collection("kakao_users").doc(uid).delete().catch(() => {});

    /* 3) 맘수다에 쓴 글과 댓글 */
    await purgeMyPosts(db, uid);

    /* 4) 내가 올린 파일
          남겨둘 사람이 아무도 없으면 전부 삭제.
          짝꿍이 남아 있으면 사용자가 고른 대로. */
    if (report.left === 0 || alsoPurgeUploads) {
      await purgeMyStorage(uid);
      report.filesDeleted = true;
    } else {
      report.filesDeleted = false;
    }

    /* 5) 인증 계정 */
    await admin.auth().deleteUser(uid);

    logger.info("회원 탈퇴 완료", Object.assign({ uid }, report));
    return Object.assign(
      { success: true, message: "계정과 데이터가 삭제되었습니다." },
      report
    );
  } catch (error) {
    logger.error("회원 탈퇴 에러", error);
    return { success: false, error: error.message };
  }
});

/* ==================================================================
 * 🔔 알림 공통 — 서버가 보내는 알림은 전부 이 길로 나간다
 * ------------------------------------------------------------------
 * ⚠️ 서버 알림에 '급함(Urgency: high)' 표시가 없었다.
 *    안드로이드는 화면이 꺼지고 절전(도즈)에 들어가면 보통 알림을 모아 뒀다가
 *    한참 뒤에 한꺼번에 내보낸다. 수유 텀 알림이 30분 늦게 오면 쓸모가 없다.
 *    유효 시간(TTL)도 정한다. 폰이 꺼져 있다 켜졌을 때
 *    어젯밤 육퇴 알림이 다음 날 아침에 뜨는 일이 없게.
 * ⚠️ 죽은 토큰을 고를 때 'invalid-argument' 는 빼야 한다.
 *    알림 글 자체가 잘못되면(너무 길다 등) 모든 토큰이 이 코드로 실패하는데,
 *    그걸 죽은 토큰으로 보고 지우면 가족 전원의 알림 주소가 한 번에 날아간다.
 * ================================================================== */
const SERVER_VERSION = "2026-10-10";   // 앱의 '알림 점검' 이 새 서버 코드가 올라갔는지 이 값으로 본다
const DEAD_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);
const TTL = { care: 2 * 3600, bed: 3 * 3600, stage: 12 * 3600, family: 24 * 3600, check: 600 };

function pad2(n) { return String(n).padStart(2, "0"); }
function kstOf(ms) { return new Date(ms + 9 * 3600 * 1000); }
function dayKeyOf(ms) {
  const k = kstOf(ms);
  return k.getUTCFullYear() + "-" + pad2(k.getUTCMonth() + 1) + "-" + pad2(k.getUTCDate());
}
function hhmmOf(mins) { return pad2(Math.floor(mins / 60)) + ":" + pad2(mins % 60); }

/* 알림에 쓰는 시각 — '14:30' 대신 '오후 2시 30분' (서울 시각) */
function kTime(ts) {
  const k = kstOf(Number(ts));
  const h = k.getUTCHours(), m = k.getUTCMinutes();
  const hh = h % 12 === 0 ? 12 : h % 12;
  return (h < 12 ? "오전 " : "오후 ") + hh + "시" + (m ? " " + m + "분" : "");
}
/* 180 → '3시간', 150 → '2시간 30분', 45 → '45분' */
function hm(mins) {
  const h = Math.floor(mins / 60), mm = mins % 60;
  return h ? (h + "시간" + (mm ? " " + mm + "분" : "")) : (mm + "분");
}

/* 알림에 쓰는 아기 이름 — 받침이 있으면 '이' 를 붙인다 (서준 → 서준이 · 지우 → 지우)
   그래서 뒤에 붙는 말은 늘 '가 · 를 · 는' 쪽이다 (서준이가 · 지우가) */
function pushNick(name) {
  const n = String(name || "우리 아기");
  const c = n.charCodeAt(n.length - 1);
  const jong = c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0;
  return n + (jong && n !== "우리 아기" ? "이" : "");
}

function pushMessage(tokens, { title, body, tag, link, ttl }) {
  const path = link || "index.html";
  const note = { title, body, icon: "/icon-192x192.png" };
  if (tag) { note.tag = tag; note.renotify = true; }
  return {
    tokens,
    notification: { title, body },
    webpush: {
      headers: { Urgency: "high", TTL: String(ttl || TTL.family) },
      notification: note,
      fcmOptions: { link: APP_URL + path },
    },
    data: { link: path },
    android: { priority: "high" },
    apns: { payload: { aps: { sound: "default" } } },
  };
}

/* 가족방 명단 { uid: 역할 } — 옛 배열 구조도 받는다 (역할은 빈칸) */
async function familyRoles(db, code) {
  const fam = await db.collection("families").doc(code).get();
  if (!fam.exists) return null;
  const raw = fam.data().members || {};
  const out = {};
  if (Array.isArray(raw)) raw.forEach((u) => { out[u] = ""; });
  else Object.keys(raw).forEach((u) => { out[u] = String(raw[u] || ""); });
  return out;
}

/* 이 사람들의 알림 주소(토큰) — 폰 · 태블릿을 같이 쓰면 둘 다 받는다 */
async function tokensOf(db, uids) {
  const map = new Map();
  const list = [...new Set(uids)].slice(0, 30);
  for (let i = 0; i < list.length; i += 10) {
    const snap = await db.collection("users").where("firebase_uid", "in", list.slice(i, i + 10)).get();
    snap.forEach((u) => {
      const ud = u.data() || {};
      const arr = Array.isArray(ud.fcm_tokens) ? ud.fcm_tokens.slice() : [];
      if (ud.fcm_token && !arr.includes(ud.fcm_token)) arr.push(ud.fcm_token);
      arr.forEach((t) => { if (t) map.set(t, u.id); });
    });
  }
  return { list: [...map.keys()], map };
}

/* 보내고 나서 죽은 토큰만 정확히 뺀다 (필드를 통째로 지우면 그 사람 알림이 전부 끊긴다) */
async function dropDead(db, map, tokens, res) {
  const dead = [];
  res.responses.forEach((r, i) => {
    if (!r.success && r.error && DEAD_CODES.has(r.error.code)) dead.push(tokens[i]);
  });
  await Promise.all(dead.map(async (t) => {
    const ref = db.collection("users").doc(map.get(t));
    try {
      const snap = await ref.get();
      const update = { fcm_tokens: admin.firestore.FieldValue.arrayRemove(t) };
      if (snap.exists && snap.data().fcm_token === t) update.fcm_token = admin.firestore.FieldValue.delete();
      await ref.update(update);
    } catch (e) { /* 문서가 없으면 넘어간다 */ }
  }));
  return dead.length;
}

async function sendTo(db, tk, msg) {
  if (!tk.list.length) return { sent: 0, failed: 0, dead: 0 };
  const res = await admin.messaging().sendEachForMulticast(pushMessage(tk.list, msg));
  const dead = await dropDead(db, tk.map, tk.list, res);
  res.responses.forEach((r) => {
    if (!r.success && !(r.error && DEAD_CODES.has(r.error.code))) {
      logger.warn("알림 개별 실패", { tag: msg.tag || "", code: r.error && r.error.code, message: r.error && r.error.message });
    }
  });
  return { sent: res.successCount, failed: res.failureCount, dead };
}

/* 정기 작업이 돌았다는 표시 — 앱의 '알림 점검' 이 이걸 보고 서버가 멈췄는지 안다 */
async function beat(db, key, now) {
  try { await db.collection("ops").doc("heartbeat").set({ [key]: now }, { merge: true }); } catch (e) { /* 표시는 못 남겨도 알림은 계속 */ }
}

/* ==================================================================
 * 🌙 4. 육퇴 알림 (2세대 / 서울 / 15분마다)
 *
 *    대형 앱은 저녁 8시에 전체 사용자에게 똑같이 쏜다.
 *    그 집 아이가 아직 안 잤으면 그건 알림이 아니라 방해다.
 *    우리는 bedtime.js 가 배운 그 집 육퇴 시각에만 보낸다.
 *    오늘 사진을 이미 담았으면 안 보낸다. 엄마 · 아빠 폰으로만 (할머니 · 선생님 폰은 뺀다).
 *
 * ⚠️ 예전엔 보낸 횟수만 세서 '3번 보내면 7일 쉰다' 가 됐다.
 *    매일 앱을 쓰는 집도 사흘 오고 일주일 끊기는 게 반복됐다 — 육퇴 알림이 안 온다던 이유다.
 *    이제는 '지난 알림 뒤로 가족 누구도 앱을 안 열었을 때' 만 흘려보낸 걸로 센다.
 *    다섯 번 연달아 그랬을 때만 사흘 쉬고, 그 사이 누가 앱을 열면 바로 다시 보낸다.
 * ⚠️ 정기 작업이 한 번 늦게 깨면 그 15분 칸 집은 그날 알림을 못 받았다. 바로 앞 칸도 같이 본다.
 * ================================================================== */
const BED_WORDS = [
  (n) => ["🌙 오늘도 육퇴 성공", `자는 ${n} 얼굴도 오늘뿐이에요. 한 장 남겨 둘까요?`],
  (n) => [`🌙 ${n} 재우느라 고생했어요`, "오늘 찍은 사진 중에 하나만 배냇함에 넣어 주세요"],
  (n) => ["🌙 이제 진짜 쉬는 시간", `오늘 ${n} 사진이 아직 없어요. 1분이면 돼요`],
  (n) => [`🌙 잘 자, ${n.indexOf("우리 ") === 0 ? n : "우리 " + n}`, "내일이면 또 조금 커 있을 거예요. 오늘 모습 한 장만요"],
  (n) => ["🌙 오늘 하루도 끝", "사진첩에 묻히기 전에, 오늘 한 장만 꺼내 둘까요?"],
  (n) => [`🌙 ${n} 잠들었나요?`, `나중에 ${n}가 오늘을 물어보면 보여 줄 사진, 한 장만요`],
  (n) => ["🌙 수고 많았어요, 오늘도", `오늘의 ${n}를 한 장 담아 두면 하루가 남아요`],
];
function bedWords(name, ms) {
  const k = kstOf(ms);
  const day = Math.floor(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate()) / 86400000);
  return BED_WORDS[day % BED_WORDS.length](pushNick(name));
}

exports.bedtimeReminder = onSchedule(
  {
    schedule: "every 15 minutes",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    maxInstances: 2,
  },
  async () => {
    const db = admin.firestore();
    const now = Date.now();
    const k = kstOf(now);
    const today = dayKeyOf(now);
    const slot = Math.floor((k.getUTCHours() * 60 + k.getUTCMinutes()) / 15) * 15;
    const buckets = slot >= 15 ? [hhmmOf(slot), hhmmOf(slot - 15)] : [hhmmOf(slot)];

    await beat(db, "bed", now);

    // 칸마다 따로 묻는다 (필드 하나짜리 조건이라 색인을 따로 만들 필요가 없다)
    const docs = new Map();
    for (const b of buckets) {
      const s = await db.collection("reminders").where("sendBucket", "==", b).get();
      s.forEach((x) => docs.set(x.id, x));
    }

    let sent = 0, families = 0;
    for (const docSnap of docs.values()) {
      const code = docSnap.id;
      const d = docSnap.data() || {};
      try {
        if (d.enabled !== true) continue;                        // 꺼 둔 집
        if (d.lastSentAt === today) continue;                    // 오늘 이미 보냄
        if (d.lastPhotoAt === today) continue;                   // 오늘 사진을 담음
        if (d.snoozeUntil && today < d.snoozeUntil) continue;    // 쉬는 중

        const roles = await familyRoles(db, code);
        if (!roles) continue;
        const parents = Object.keys(roles).filter((u) => roles[u] !== "viewer");
        const tk = await tokensOf(db, parents);
        if (!tk.list.length) continue;

        const [title, body] = bedWords(d.babyName || "우리 아기", now);
        const r = await sendTo(db, tk, { title, body, tag: "baenaet-bedtime", link: "index.html?go=memorybox", ttl: TTL.bed });

        // 지난 알림 뒤로 사진을 담았거나, 가족 누군가 앱을 열었으면 '본 것' 으로 친다
        const lastTs = Number(d.lastSentTs) || 0;
        const seen = Math.max(Number(d.seenAt) || 0, Number(d.openedAt) || 0, Number(d.updatedAt) || 0);
        const answered = !lastTs || seen >= lastTs || (d.lastPhotoAt && d.lastSentAt && d.lastPhotoAt >= d.lastSentAt);
        const miss = answered ? 0 : (Number(d.missStreak) || 0) + 1;
        const update = { lastSentAt: today, lastSentTs: now, missStreak: miss };
        if (miss >= 5) {
          update.snoozeUntil = dayKeyOf(now + 3 * 86400000);
          update.missStreak = 0;
        }
        await docSnap.ref.update(update);
        sent += r.sent;
        families++;
      } catch (e) {
        logger.warn("육퇴 알림 개별 실패", { code, message: e.message });
      }
    }
    if (docs.size) logger.info("육퇴 알림", { buckets, checked: docs.size, families, sent });
  }
);

const { onDocumentCreated } = require("firebase-functions/v2/firestore");

/* 대기명단에 새 사람이 들어오면 카운터를 올린다 */
exports.countWaitlist = onDocumentCreated(
  { document: "waitlist/{docId}", region: "asia-northeast3" },
  async () => {
    await admin.firestore().collection("app_settings").doc("global_notice").set(
      { waitlist_count: admin.firestore.FieldValue.increment(1) },
      { merge: true }
    );
  }
);

/* ==================================================================
 * 🤰 임신 · 신청 알림 (매일 아침 9시 · 서울)
 *   앱(stage.js)이 stagepush/{가족코드} 에 아기별 예정일 · 마감을 적어 둔다.
 *   · 주가 바뀐 날: "콩콩이 28주가 됐어요" + 그 주에 할 것 (의학 설명 없음)
 *   · 법으로 정해진 마감 3일 전부터: "출생신고 · 3일 남았어요"
 *   같은 주 · 같은 마감은 한 번만 (sent 에 남긴다). 돌봄 도우미 폰으로는 안 보낸다.
 *   ⚠️ WEEK_PUSH 는 앱 stage.js 의 WEEKLY 와 같은 글이다. 고치면 둘 다 고친다.
 * ================================================================== */
const WEEK_PUSH = {
  4: "두 줄을 본 오늘을 편지로 남겨 두세요", 5: "이 소식을 언제, 누구에게 먼저 전할지 둘이 정해 보세요",
  6: "병원에서 심장 소리를 녹음해 두면 엽서로 만들 수 있어요", 7: "태명 후보를 둘이 세 개씩 적어 보세요",
  8: "첫 초음파 사진을 배냇함에 담아 두세요", 9: "양가 부모님께 소식을 전할 날을 정해 보세요",
  10: "이번 주는 둘만의 저녁을 하루 잡아 보세요", 11: "진료비 바우처를 신청했는지 확인해 보세요",
  12: "첫 배 사진을 찍어 두세요. 같은 자리, 같은 옷이면 모았을 때 예뻐요", 13: "이번 주 문답에 둘이 같이 답해 보세요",
  14: "중기에 들어섰어요. 둘이 가 보고 싶던 곳을 하나 정해 보세요", 15: "아빠 목소리로 동화 한 편을 녹음해 보세요",
  16: "유모차를 직접 밀어 보러 가기 좋은 때예요", 17: "아기 자리를 어디에 둘지 같이 정해 보세요",
  18: "태동을 처음 느끼면 그날을 편지로 남겨 두세요", 19: "산후조리원 상담 날짜를 잡아 보세요",
  20: "절반을 왔어요. 반환점 사진을 남겨 두세요", 21: "아기에게 불러 줄 노래를 하나 정해서 녹음해 보세요",
  22: "카시트를 알아보기 좋은 때예요", 23: "부모님께 이번 주 소식을 보내 보세요",
  24: "출산 뒤 첫 한 달, 누가 무엇을 맡을지 이야기해 보세요", 25: "아기가 스무 살에 열 편지를 한 장 써 보세요",
  26: "젖병 · 수유용품 목록을 만들어 보세요", 27: "출산전후휴가와 육아휴직 날짜를 둘이 맞춰 보세요",
  28: "태동 세기를 시작해 보세요. 아기가 잘 움직이는 시간을 찾아요", 29: "만삭 사진을 찍을 날을 정해 보세요",
  30: "지금까지 모은 배 사진을 모아 보세요", 31: "아기 옷과 속싸개를 빨아 둘 준비를 해요",
  32: "임신기 근로시간 단축을 다시 쓸 수 있는 때예요", 33: "출산 가방 목록을 써 보세요",
  34: "병원 가는 길을 한 번 미리 가 보세요", 35: "카시트를 차에 미리 달아 보세요",
  36: "출생신고와 부모급여, 출산 뒤 할 일을 미리 봐 두세요", 37: "둘만의 마지막 외식을 해 보세요",
  38: "아기에게 '곧 만나자'고 목소리를 남겨 보세요", 39: "가족 단톡방에 곧 만난다고 소식을 전해 보세요",
  40: "예정일 주간이에요. 이번 주는 쉬는 게 할 일이에요", 41: "예정일이 지났어요. 병원과 다음 계획을 상의해요",
};

/* 서울 날짜로 하루 번호 (예정일 · 마감을 날짜 단위로 비교) */
function kstDayNum(ms) { return Math.floor((ms + 9 * 3600 * 1000) / 86400000); }
function dayNumOf(key) {
  const p = String(key || "").split("-").map(Number);
  return p.length === 3 ? Math.floor(Date.UTC(p[0], p[1] - 1, p[2]) / 86400000) : NaN;
}

exports.stageDaily = onSchedule(
  { schedule: "0 9 * * *", timeZone: "Asia/Seoul", region: "asia-northeast3", maxInstances: 1 },
  async () => {
    const db = admin.firestore();
    const today = kstDayNum(Date.now());
    const md = (key) => { const p = String(key).split("-").map(Number); return p[1] + "월 " + p[2] + "일"; };
    const snap = await db.collection("stagepush").get();
    for (const docSnap of snap.docs) {
      const code = docSnap.id;
      const d = docSnap.data() || {};
      const babies = d.babies || {}, sent = d.sent || {};
      const updates = {}, jobs = [];
      Object.keys(babies).forEach((key) => {
        const b = babies[key] || {};
        if (b.push === false) return;
        const s = sent[key] || {};
        const nick = pushNick(b.name);
        if (b.stage === "pregnant" && b.due) {
          const ga = 280 - (dayNumOf(b.due) - today);
          if (ga >= 28 && ga <= 287 && ga % 7 === 0 && s.week !== ga / 7) {
            const w = ga / 7;
            jobs.push({ title: `🤰 ${nick} ${w}주가 됐어요`, body: WEEK_PUSH[w] || "이번 주에 할 것을 확인해 보세요", tag: "stage-week" });
            updates[`sent.${key}.week`] = w;
          }
        }
        (Array.isArray(b.deadlines) ? b.deadlines : []).forEach((x) => {
          if (!x || !x.id || !x.date) return;
          const left = dayNumOf(x.date) - today;
          if (!(left >= 0 && left <= 3)) return;
          if ((s.dl || {})[x.id] === x.date) return;
          jobs.push({ title: `📅 ${x.t}`, body: left === 0 ? "오늘까지예요. 배냇함에서 확인해 보세요" : `${md(x.date)}까지예요. ${left}일 남았어요`, tag: "stage-dl-" + x.id });
          updates[`sent.${key}.dl.${x.id}`] = x.date;
        });
      });
      if (!jobs.length) continue;
      try {
        const roles = await familyRoles(db, code);
        if (!roles) continue;
        // 돌봄 도우미(viewer)는 빼고 엄마 · 아빠 폰만 — 예정일 같은 건 가족 이야기다
        const tk = await tokensOf(db, Object.keys(roles).filter((u) => roles[u] !== "viewer"));
        if (!tk.list.length) continue;
        for (const j of jobs) {
          await sendTo(db, tk, { title: j.title, body: j.body, tag: j.tag, link: "index.html", ttl: TTL.stage });
        }
        await docSnap.ref.update(updates);
      } catch (e) {
        logger.error("[stageDaily] 실패", code, e);
      }
    }
  }
);

/* ==================================================================
 * 🍼 수유 · 기저귀 알림 (2세대 / 서울 / 5분마다)
 * ------------------------------------------------------------------
 * 앱(carealarm.js)이 reminders/{가족코드} 에 아기별 '다음 알림 시각' 을 적어 둔다.
 *   care: { main: { feedAt, feedEvery, feedFrom, diaperAt, diaperEvery, diaperFrom, babyName }, _2: {...} }
 *   careNext: 가장 이른 알림 시각
 *   mute: { uid: { feed: true } }   — 이 사람은 수유 알림을 껐다 (텀을 0 으로)
 *   away: { uid: 나간 시각 }         — 이 사람은 '밖에 있어요' (duty.js)
 * 앱이 닫혀 있어도 그 시각이 지나면 여기서 가족 폰으로 보낸다.
 * 같은 기록으로는 한 번만 보낸다 (feedPushed / diaperPushed 에 보낸 시각을 남긴다).
 * 알림 꼬리표(tag)를 앱과 같게 써서, 앱이 이미 띄운 알림 위에 겹쳐 쌓이지 않게 한다.
 *
 * 누구 폰으로 보내나
 *   · 알림을 끈 사람은 뺀다
 *     ⚠️ 예전엔 엄마가 텀을 0 으로 꺼도 아빠 폰이 올린 시각대로 엄마 폰까지 울렸다
 *   · '밖에 있어요' 인 사람은 뺀다 — 아기 곁에 있는 사람한테만
 *     (14시간이 지났으면 돌아와서 안 바꾼 걸로 본다 · 다 밖이면 다 보낸다)
 *   · 밤 10시 ~ 아침 7시엔 할머니 · 돌봄 선생님 폰은 뺀다
 * ⚠️ 6시간 넘게 지난 건 보내지 않는다. 기록을 안 한 것일 수 있다.
 * ⚠️ 문구는 앱 carealarm.js 의 words() 와 같은 표다. 고치면 둘 다 고친다.
 * ================================================================== */
const LATE_MAX = 6 * 3600 * 1000;
const AWAY_MAX = 14 * 3600 * 1000;

function careWords(kind, name, from, every, at) {
  const n = pushNick(name);
  const t = every ? hm(every) : "";
  const when = from ? kTime(from) : "";
  const FEED = [
    ["🍼 슬슬 맘마 시간이에요", t && when ? `${when}에 먹고 ${t}이 지났어요` : `${n}가 곧 배고프다고 할 거예요`],
    [`🍼 ${n} 배꼽시계가 울릴 때예요`, when ? `마지막 맘마는 ${when}${/분$/.test(when) ? "이었어요" : "였어요"}` : "천천히 준비해 주세요"],
    [`🍼 ${n} 곧 맘마 찾을 거예요`, t ? `먹은 지 ${t} 됐어요. 천천히 준비해 주세요` : "천천히 준비해 주세요"],
  ];
  const DIAPER = [
    ["🧷 기저귀 한번 볼까요?", t && when ? `${when}에 갈고 ${t}이 지났어요` : "기저귀 갈 때가 됐어요"],
    [`🧷 ${n} 엉덩이 뽀송한가요?`, t ? `기저귀 간 지 ${t} 됐어요` : "기저귀 갈 때가 됐어요"],
    ["🧷 기저귀 확인할 때예요", when ? `마지막으로 ${when}에 갈았어요` : "기저귀 갈 때가 됐어요"],
  ];
  const list = kind === "feed" ? FEED : DIAPER;
  return list[Math.floor(Number(at) / 3600000) % list.length];
}

/* 이 알림을 받을 사람 */
function careTargets(d, roles, kind, now) {
  const kh = kstOf(now).getUTCHours();
  const night = kh >= 22 || kh < 7;
  const away = d.away || {}, mute = d.mute || {};
  const base = Object.keys(roles).filter((u) => {
    if (night && roles[u] === "viewer") return false;
    const m = mute[u];
    return !(m && m[kind] === true);
  });
  const here = base.filter((u) => {
    const a = Number(away[u]) || 0;
    return !(a && now - a < AWAY_MAX);
  });
  return here.length ? here : base;
}

exports.careReminder = onSchedule(
  {
    schedule: "every 5 minutes",
    timeZone: "Asia/Seoul",
    region: "asia-northeast3",
    maxInstances: 2,
  },
  async () => {
    const db = admin.firestore();
    const now = Date.now();
    await beat(db, "care", now);

    const snap = await db.collection("reminders").where("careNext", "<=", now).get();
    if (snap.empty) return;

    for (const docSnap of snap.docs) {
      const code = docSnap.id;
      const d = docSnap.data() || {};
      const care = d.care || {};
      const updates = {};
      const jobs = [];
      let next = null;

      Object.keys(care).forEach((key) => {
        const c = care[key] || {};
        ["feed", "diaper"].forEach((kind) => {
          const at = Number(c[kind + "At"]) || 0;
          if (!at || Number(c[kind + "Pushed"]) === at) return;   // 없거나 이미 보냄
          if (at > now) { next = next === null ? at : Math.min(next, at); return; }
          updates["care." + key + "." + kind + "Pushed"] = at;
          if (now - at > LATE_MAX) return;                         // 너무 늦었다 — 조용히 넘긴다
          const every = Number(c[kind + "Every"]) || 0;
          jobs.push({
            kind, at, every,
            from: Number(c[kind + "From"]) || (every ? at - every * 60000 : 0),
            name: c.babyName || d.babyName || "우리 아기",
          });
        });
      });

      try {
        if (jobs.length) {
          const roles = await familyRoles(db, code);
          if (roles) {
            for (const j of jobs) {
              const tk = await tokensOf(db, careTargets(d, roles, j.kind, now));
              const [title, body] = careWords(j.kind, j.name, j.from, j.every, j.at);
              await sendTo(db, tk, { title, body, tag: "care-" + j.kind, link: "index.html", ttl: TTL.care });
            }
          }
        }
        updates.careNext = next;                                    // 다음에 볼 시각 (없으면 null)
        await docSnap.ref.update(updates);
      } catch (e) {
        logger.error("[careReminder] 실패", code, e);
      }
    }
  }
);

/* ==================================================================
 * 🩺 알림 점검 (앱 설정 → '알림이 안 오나요?')
 * ------------------------------------------------------------------
 * "알림이 안 와요" 만으로는 어디가 끊겼는지 알 수 없다.
 *   폰 허용 → 이 폰 등록(토큰) → 서버 저장 → 가족방 → 알림 장부 → 정기 작업
 * 서버가 보는 그대로를 돌려주고, 원하면 이 폰으로만 시험 알림을 한 번 보낸다.
 *   · 이 폰 토큰이 서버에 없으면 그 자리에서 넣어 준다 (규칙에 막혀 앱이 못 넣었을 때도)
 *   · 정기 작업이 마지막으로 돈 시각을 알려 준다 (멈췄으면 배포를 다시 해야 한다)
 *   · version 으로 새 서버 코드가 올라갔는지 앱이 안다
 * 가족방 사람이 아니면 그 방 정보는 돌려주지 않는다.
 * ================================================================== */
exports.pushCheck = onCall(SEOUL, async (request) => {
  const uid = request.auth && request.auth.uid;
  if (!uid) return { ok: false, error: "로그인이 아직 안 됐어요" };

  const data = request.data || {};
  const code = typeof data.syncCode === "string" ? data.syncCode.slice(0, 40) : "";
  const token = typeof data.token === "string" && data.token.length > 20 && data.token.length < 400 ? data.token : "";
  const db = admin.firestore();
  const now = Date.now();
  const out = { ok: true, now, version: SERVER_VERSION };

  try {
    /* 0. 정기 작업이 도는가 */
    try {
      const hb = await db.collection("ops").doc("heartbeat").get();
      const h = hb.exists ? (hb.data() || {}) : {};
      out.beat = { care: Number(h.care) || 0, bed: Number(h.bed) || 0 };
    } catch (e) { out.beat = { care: 0, bed: 0 }; }

    /* 1. 이 폰 토큰이 서버에 있나 */
    const mine = await db.collection("users").where("firebase_uid", "==", uid).get();
    const myTokens = new Set();
    let batonOff = false;
    mine.forEach((u) => {
      const ud = u.data() || {};
      (Array.isArray(ud.fcm_tokens) ? ud.fcm_tokens : []).forEach((t) => t && myTokens.add(t));
      if (ud.fcm_token) myTokens.add(ud.fcm_token);
      if (ud.push_baton === false) batonOff = true;
    });
    out.myTokens = myTokens.size;
    out.batonOff = batonOff;
    out.tokenKnown = !!(token && myTokens.has(token));
    if (token && !out.tokenKnown) {
      const docId = mine.size ? mine.docs[0].id : uid;
      await db.collection("users").doc(docId).set({
        firebase_uid: uid,
        fcm_token: token,
        fcm_tokens: admin.firestore.FieldValue.arrayUnion(token),
        token_updated_at: now,
      }, { merge: true });
      out.tokenRepaired = true;
      out.myTokens = myTokens.size + 1;
    }

    /* 2. 가족방 · 다른 가족 폰 */
    let roles = null;
    if (code) {
      roles = await familyRoles(db, code);
      out.family = !!roles;
      if (roles) {
        out.member = Object.prototype.hasOwnProperty.call(roles, uid);
        if (out.member) {
          out.role = roles[uid] || "";
          out.members = Object.keys(roles).length;
          const others = Object.keys(roles).filter((u) => u !== uid);
          out.otherTokens = others.length ? (await tokensOf(db, others)).list.length : 0;
        }
      }
    }

    /* 3. 알림 장부 (육퇴 · 수유 · 기저귀) */
    if (code && out.member) {
      const rem = await db.collection("reminders").doc(code).get();
      out.reminders = rem.exists;
      if (rem.exists) {
        const r = rem.data() || {};
        const today = dayKeyOf(now);
        const k = kstOf(now);
        const nowMin = k.getUTCHours() * 60 + k.getUTCMinutes();
        const bm = /^(\d\d):(\d\d)$/.exec(r.sendBucket || "");
        const bucketMin = bm ? Number(bm[1]) * 60 + Number(bm[2]) : null;
        out.bedtime = {
          enabled: r.enabled === true,
          bucket: r.sendBucket || "",
          lastSentAt: r.lastSentAt || "",
          lastPhotoAt: r.lastPhotoAt || "",
          snoozeUntil: r.snoozeUntil && r.snoozeUntil > today ? r.snoozeUntil : "",
        };
        // 오늘 보낼 시각이 30분 넘게 지났는데 안 보냈다 (사진을 담았거나 쉬는 날도 아닌데)
        out.bedtime.stuck = !!(out.bedtime.enabled && bucketMin !== null && nowMin > bucketMin + 30 &&
          r.lastSentAt !== today && r.lastPhotoAt !== today && !out.bedtime.snoozeUntil);
        const care = r.care || {};
        out.care = Object.keys(care).slice(0, 5).map((key) => {
          const c = care[key] || {};
          return { key, feedAt: Number(c.feedAt) || 0, feedPushed: Number(c.feedPushed) || 0,
                   diaperAt: Number(c.diaperAt) || 0, diaperPushed: Number(c.diaperPushed) || 0 };
        });
        out.careStuck = out.care.some((c) => ["feed", "diaper"].some((kind) => {
          const at = c[kind + "At"];
          return at && at < now - 15 * 60000 && at > now - LATE_MAX && c[kind + "Pushed"] !== at;
        }));
        // 이 폰 주인이 지금 수유 · 기저귀 알림을 받는 사람인가 (껐거나 '밖에 있어요' 면 아니다)
        if (roles) {
          out.careMe = {
            feed: careTargets(r, roles, "feed", now).includes(uid),
            diaper: careTargets(r, roles, "diaper", now).includes(uid),
            away: !!(Number((r.away || {})[uid]) && now - Number((r.away || {})[uid]) < AWAY_MAX),
          };
        }
      }
    }

    /* 4. 시험 알림 — 이 폰으로만 */
    if (data.send && token) {
      try {
        const msg = pushMessage([token], {
          title: "🔔 알림이 잘 와요",
          body: "이 알림이 보이면 배냇함 알림은 잘 오고 있어요",
          tag: "push-check", link: "index.html", ttl: TTL.check,
        });
        delete msg.tokens;
        msg.token = token;
        await admin.messaging().send(msg);
        out.sent = true;
      } catch (e) {
        out.sent = false;
        out.sendError = String(e.code || e.message || e).slice(0, 120);
        if (DEAD_CODES.has(e.code)) {
          const snap = await db.collection("users").where("firebase_uid", "==", uid).get();
          await Promise.all(snap.docs.map((x) => x.ref.update({ fcm_tokens: admin.firestore.FieldValue.arrayRemove(token) }).catch(() => {})));
          out.tokenDead = true;
        }
      }
    }
    return out;
  } catch (e) {
    logger.error("[pushCheck] 실패", e);
    return { ok: false, error: String(e.message || e).slice(0, 160), version: SERVER_VERSION };
  }
});

/* 시험할 때만 꺼내 쓴다 (배포할 때는 이 줄이 아무 일도 안 한다) */
if (process.env.BAENAET_TEST) {
  exports.__test = { pushNick, kTime, hm, careWords, bedWords, careTargets, pushMessage, dayKeyOf };
}
