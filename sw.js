// PWA 앱 설치 자격을 얻기 위한 최소한의 통과 스크립트 (깡통 서비스 워커)
self.addEventListener('install', (e) => {
    console.log('[Service Worker] 설치 완료!');
    self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
    // 네트워크 통신은 건드리지 않고 그대로 통과시킵니다.
});