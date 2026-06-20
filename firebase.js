// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

// 하윤이네 앱 접속 열쇠
const firebaseConfig = {
  apiKey: "AIzaSyCx-Jd-6S05a_xY0ZbT8SjpH0vPWIhSDd4",
  authDomain: "diray-8c002.firebaseapp.com",
  projectId: "diray-8c002",
  storageBucket: "diray-8c002.firebasestorage.app",
  messagingSenderId: "340346494414",
  appId: "1:340346494414:web:47fac2e3e76ebd141f9f9f"
};

// 파이어베이스 엔진 시동 켜기
const app = initializeApp(firebaseConfig);

// 데이터베이스(Firestore) 빼오기 - 이제 다른 파일에서 이걸 가져다 씁니다!
export const db = getFirestore(app);