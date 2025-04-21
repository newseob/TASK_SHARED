// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // Firestore 연동 추가

const firebaseConfig = {
  apiKey: "AIzaSyDzwKpnaZevRcXrY1FUQVfK0cnZuE33qR8",
  authDomain: "sharedmemo-81d89.firebaseapp.com",
  projectId: "sharedmemo-81d89",
  storageBucket: "sharedmemo-81d89.appspot.com", // ← 여기에 `.app` 제거된 올바른 값으로 수정했음
  messagingSenderId: "722325793086",
  appId: "1:722325793086:web:3916c716d0ff7d06d3646f",
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Firestore 인스턴스 반환
export const db = getFirestore(app);
