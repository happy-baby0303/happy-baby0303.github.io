// [4] PWA 설치를 위한 서비스 워커 코드 (기존 로직 유지)
self.addEventListener('install', (e) => {
    console.log('[Service Worker] 설치 완료!');
    self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
    // 네트워크 통신은 건드리지 않고 그대로 통과
    return;
});