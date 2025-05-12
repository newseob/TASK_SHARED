// saveDataToFirestore.ts
import { db } from "./firebase";
import { collection, doc, setDoc, onSnapshot } from "firebase/firestore";

const docRef = doc(collection(db, "sharedData"), "main");

// 1. todoBoxes와 lastCheckedDate를 함께 저장
export const saveTodoBoxes = async (todoBoxes: any[], lastCheckedDate: string) => {
  await setDoc(docRef, { todoBoxes, lastCheckedDate });
};

// 2. todoBoxes와 lastCheckedDate를 함께 불러오기
export const listenTodoBoxes = (callback: (data: { todoBoxes: any[]; lastCheckedDate: string }) => void) => {
  return onSnapshot(docRef, (snapshot) => {
    const data = snapshot.data();
    if (data && data.todoBoxes) {
      callback({
        todoBoxes: data.todoBoxes,
        lastCheckedDate: data.lastCheckedDate || "",
      });
    }
  });
};
