// [1] Firebase 메시징을 위한 필수 스크립트 로드
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

// [2] Firebase 초기화 (기존 설정값 유지)
firebase.initializeApp({
  apiKey: "AIzaSyDyXVAf-uiqutmfCd5Bhh34bQmbnFynpas",
  authDomain: "happybaby-6de42.firebaseapp.com",
  projectId: "happybaby-6de42",
  storageBucket: "happybaby-6de42.firebasestorage.app",
  messagingSenderId: "1075311024495",
  appId: "1:1075311024495:web:b9212eab58802dabf9709a"
});

const messaging = firebase.messaging();

// [3] 푸시 알림 수신 코드 (기존 로직 유지)
messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] 백그라운드 메시지 수신:', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192x192.png' // 리사이징한 그 곰돌이 아이콘 파일명입니다!
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// [4] PWA 설치를 위한 서비스 워커 코드 (기존 로직 유지)
self.addEventListener('install', (e) => {
    console.log('[Service Worker] 설치 완료!');
    self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
    // 네트워크 통신은 건드리지 않고 그대로 통과
    return;
});