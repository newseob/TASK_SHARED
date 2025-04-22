import { useState, useEffect, useRef } from "react";
import { db } from "../firebase"; // Firestore 초기화한 db
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function KyunginTab() {
  const [content, setContent] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const MEMO_DOC_ID = "kyunginMemo";

  const loadMemo = async () => {
    const docRef = doc(db, "memos", MEMO_DOC_ID);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      setContent(snapshot.data().content || "");
    }
    setIsLoaded(true);
  };

  const saveMemo = async () => {
    const docRef = doc(db, "memos", MEMO_DOC_ID);
    await setDoc(docRef, { content });
    console.log("✅ 저장됨");
  };

  useEffect(() => {
    if (!isLoaded) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      saveMemo();
    }, 1000);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [content]);

  useEffect(() => {
    loadMemo();
  }, []);

  return (
    <div className="w-full h-full">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="경인 메모를 입력하세요..."
        className="w-full h-full p-0 m-0 border-none resize-none outline-none text-base leading-relaxed whitespace-pre-wrap bg-white box-border"
      />
    </div>
  );
}
