// saveDataToFirestore.ts
import { db } from "./firebase"; // Firebase 설정 파일
import { collection, doc, setDoc, onSnapshot } from "firebase/firestore";

export const saveTodoBoxes = async (data: any[]) => {
  const docRef = doc(collection(db, "sharedData"), "main");
  await setDoc(docRef, { todoBoxes: data });
};

export const listenTodoBoxes = (callback: (data: any[]) => void) => {
  const docRef = doc(collection(db, "sharedData"), "main");
  return onSnapshot(docRef, (snapshot) => {
    const data = snapshot.data();
    if (data && data.todoBoxes) {
      callback(data.todoBoxes);
    }
  });
};
