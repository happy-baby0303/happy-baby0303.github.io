// 🔔 파이어베이스 백그라운드 푸시 알림 수신기 (우렁각시)
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyDyXVAf-uiqutmfCd5Bhh34bQmbnFynpas",
    authDomain: "happybaby-6de42.firebaseapp.com",
    projectId: "happybaby-6de42",
    storageBucket: "happybaby-6de42.firebasestorage.app",
    messagingSenderId: "1075311024495",
    appId: "1:1075311024495:web:b9212eab58802dabf9709a"
});

const messaging = firebase.messaging();

// 🚨 여기를 수정했습니다! (중복 알림 방지)
messaging.onBackgroundMessage((payload) => {
    // 구글 파이어베이스가 알아서 알림을 띄우므로 우렁각시는 조용히 로그만 남깁니다!
    console.log('[SW] 백그라운드 푸시 수신 성공!');
});

// 🔔 알림을 터치하면 배냇함 앱이 짠! 하고 열리게 해주는 마법
self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    /* ⚠️ 예전에는 창이 이미 열려 있으면 focus() 만 하고 끝냈다.
          그래서 바통터치 알림을 눌러도 보던 화면 그대로였다.
          알림을 눌렀다는 건 '그걸 보러 가겠다' 는 뜻이다. 데려다준다. */
    var t = (event.notification && event.notification.title) || '';
    var go = './index.html';
    if (t.indexOf('바통') > -1)      go = './index.html?go=toolbox';
    else if (t.indexOf('문답') > -1) go = './diary.html';
    else if (t.indexOf('답') > -1)   go = './diary.html';

    var target = new URL(go, self.location.href).href;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
            for (var i = 0; i < list.length; i++) {
                var c = list[i];
                if ('navigate' in c) {
                    return c.navigate(target).then(function (x) { return (x || c).focus(); })
                            .catch(function () { return c.focus(); });
                }
            }
            return clients.openWindow(target);
        })
    );
});

/* ============================================================
   💾 오프라인 엔진 — 다시 씀

   전에는 두 군데서 막혀 있었다.

     ① 파이어베이스 SDK 를 캐시에서 통째로 뺐다
        gstatic / googleapis 를 전부 return 시켰는데,
        거기엔 '움직이는 통신'(firestore 읽기·쓰기)만 있는 게 아니라
        '고정된 파일'(firebase-app.js 같은 SDK)도 같이 있었다.
        오프라인에서 SDK 를 못 받으니 window.db · window.auth 가
        아예 안 만들어지고, 앱은 켜져도 속이 빈 껍데기가 됐다.

     ② res.type === 'basic' 만 저장했다
        basic = 우리 서버 파일. CDN 에서 온 건 전부 'cors' 라 탈락.
        프리텐다드 폰트 · chart.js · html2canvas 가 하나도 안 담겼다.

   그래서 기준을 바꾼다. '어디서 왔나' 가 아니라 '움직이는 것인가' 로 나눈다.

       고정된 파일   담는다   SDK · 폰트 · 차트 · 우리 js 전부
       움직이는 통신  안 담는다 firestore 읽기 · 로그인 · 함수 호출 · 카카오

   ⚠️ 움직이는 통신은 캐시하면 안 된다.
      어제 수유 기록이 오늘 기록인 척 나오면 그게 더 위험하다.
      그쪽은 파이어베이스가 자기 오프라인 저장소(persistentLocalCache)로
      이미 처리하고 있다. 우리가 끼어들 자리가 아니다.
   ============================================================ */

const CACHE = 'baenaet-v7';

/* 우리 서버 파일 */
const ASSETS = [
    './',
    './index.html',
    './diary.html',
    './manifest.json',

    /* ⚠️ 자료 파일 셋이 빠져 있었다. 합쳐서 1.2MB 다.
          수유실 1,100곳 · 나들이 장소 · 축제 일정이 전부 여기 들어 있고,
          없으면 나들이 탭이 통째로 빈 화면이 된다.
          '데이터 안 터지면 못 쓴다' 던 것의 나머지 절반이 이거다. */
    './nursing.json',
    './places.json',
    './festivals.json',
    './style.css',
    './tune.css',        /* ⚠️ 빠져 있었다. 없으면 오프라인에서 글자 크기·모서리가 통째로 어긋난다 */
    './icon-512.png',
    './icon-192x192.png',
    './icon-maskable-512.png',
    './apple-touch-icon.png',
    './anniversaries.js',
    './babyphoto.js',
    './backbutton.js',
    './babytab.js',
    './bedtime.js',
    './bookshelf.js',
    './data.js',
    './diapersheet.js',
    './diary.js',
    './diarylock.js',
    './emergency119.js',
    './emoji.js',
    './emotion.js',
    './expiryalert.js',
    './export.js',
    './feverguard.js',
    './firstfill.js',
    './firstwords.js',
    './fit.js',
    './graveyard.js',
    './home.js',
    './homefix.js',
    './icons.js',
    './idle.js',
    './sealsoon.js',
    './vaccine.js',
    './homelayout.js',
    './infopick.js',
    './iospush.js',
    './libraryplus.js',
    './memories.js',
    './memorybox.js',
    './milestonebook.js',
    './milestonesync.js',
    './mobile.js',
    './monthcard.js',
    './monthgift.js',
    './newbadge.js',
    './notes.js',
    './nursing.js',
    './outingreturn.js',
    './outingsmart.js',
    './photobook.js',
    './photos.js',
    './placefilter.js',
    './playdata.js',
    './postcard.js',
    './premium.js',
    './receiptData.js',
    './remind.js',
    './rolelock.js',
    './script.js',
    './sealed.js',
    './settingscards.js',
    './sleepsync.js',
    './sosplus.js',
    './theme.js',
    './toolbrief.js',
    './voice.js',
    './voicereel.js',
    './waveform.js'
];

/* 바깥에서 오는데 '고정된' 것들 — 이게 없으면 오프라인에서 앱이 안 산다 */
const VENDOR = [
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js',
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js',
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js',
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js',
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js',
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js',
    'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.8/dist/web/static/pretendard.css',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
];

/* 움직이는 통신 — 손대지 않고 그냥 흘려보낸다 */
function isLive(url) {
    return /firestore\.googleapis\.com/.test(url)
        || /identitytoolkit\.googleapis\.com/.test(url)
        || /securetoken\.googleapis\.com/.test(url)
        || /firebasestorage\.googleapis\.com/.test(url)
        || /firebaseinstallations\.googleapis\.com/.test(url)
        || /fcmregistrations\.googleapis\.com/.test(url)
        || /\.firebaseio\.com/.test(url)
        || /cloudfunctions\.net/.test(url)
        || /kakao(cdn)?\.(com|net)/.test(url)
        || /kapi\.kakao\.com/.test(url)
        || /googletagmanager\.com/.test(url)
        || /google-analytics\.com/.test(url);
}

self.addEventListener('install', (e) => {
    e.waitUntil((async () => {
        const c = await caches.open(CACHE);

        // 한 개가 실패해도 나머지는 담는다. 하나 때문에 전부 날리지 않는다.
        await Promise.all(ASSETS.map(u =>
            c.add(u).catch(err => console.warn('[SW] 우리 파일 캐시 실패(무시):', u))
        ));

        await Promise.all(VENDOR.map(u =>
            c.add(new Request(u, { mode: 'cors' }))
             .catch(err => console.warn('[SW] 외부 파일 캐시 실패(무시):', u))
        ));
    })());
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ));
    self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    if (e.request.method !== 'GET') return;

    const url = e.request.url;
    if (!/^https?:/.test(url)) return;
    if (isLive(url)) return;                 // 움직이는 통신은 그대로 통과

    e.respondWith((async () => {
        try {
            const res = await fetch(e.request);

            /* basic(우리 서버) 과 cors(CDN) 둘 다 담는다.
               opaque 는 내용을 볼 수 없어 담아도 쓸모가 없으니 뺀다. */
            if (res && res.ok && (res.type === 'basic' || res.type === 'cors')) {
                const clone = res.clone();
                caches.open(CACHE).then(c => c.put(e.request, clone)).catch(() => {});
            }
            return res;

        } catch (err) {
            const cached = await caches.match(e.request, { ignoreSearch: true });
            if (cached) return cached;

            if (e.request.mode === 'navigate') {
                const home = await caches.match('./index.html', { ignoreSearch: true });
                if (home) return home;
            }

            return new Response('', { status: 503, statusText: 'Offline' });
        }
    })());
});

/* 새 버전이 준비되면 앱이 바로 갈아탈 수 있게 */
self.addEventListener('message', (e) => {
    if (e.data === 'skipWaiting') self.skipWaiting();
});