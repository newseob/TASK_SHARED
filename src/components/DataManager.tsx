import { useState, useRef } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

interface DataManagerProps {
  onSave: () => void;
  onLoad: (data: any) => void;
}

export default function DataManager({ onSave, onLoad }: DataManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    try {
      // Firestore에서 직접 원본 데이터 가져오기
      const firestoreData: { [key: string]: any } = {};
      
      // 실제 사용되는 Firestore 경로
      const collections = [
        { name: "todoBoxes", collection: "sharedData", docId: "main" },
        { name: "dietNotes", collection: "sharedData", docId: "main" },
        { name: "routineItems", collection: "routineItems", docId: "config" },
        { name: "moneyData", collection: "moneyData", docId: "main" },
        { name: "kyunginMemo", collection: "memos", docId: "kyunginMemo" },
        { name: "yuseopMemo", collection: "memos", docId: "YuseopMemo" }
      ];

      for (const collection of collections) {
        try {
          const docRef = doc(db, collection.collection, collection.docId);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            firestoreData[collection.name] = docSnap.data();
            console.log(`Loaded ${collection.name}:`, docSnap.data());
          } else {
            console.log(`No data found for ${collection.name}`);
          }
        } catch (error) {
          console.warn(`Failed to load ${collection.name}:`, error);
        }
      }

      // JSON 파일로 다운로드
      const dataStr = JSON.stringify(firestoreData, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement("a");
      link.href = url;
      link.download = `firestore-raw-data-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alert("Firestore 원본 데이터가 성공적으로 저장되었습니다!");
    } catch (error) {
      console.error("Save error:", error);
      alert("데이터 저장 중 오류가 발생했습니다: " + error);
    }
  };

  const handleLoad = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        
        // 확인 다이얼로그
        if (confirm("Firestore 원본 데이터를 불러오면 현재 데이터가 모두 덮어쓰기 됩니다. 계속하시겠습니까?")) {
          // Firestore 데이터 직접 복원
          const collections = [
            { name: "todoBoxes", collection: "sharedData", docId: "main" },
            { name: "dietNotes", collection: "sharedData", docId: "main" },
            { name: "routineItems", collection: "routineItems", docId: "config" },
            { name: "moneyData", collection: "moneyData", docId: "main" },
            { name: "kyunginMemo", collection: "memos", docId: "kyunginMemo" },
            { name: "yuseopMemo", collection: "memos", docId: "YuseopMemo" }
          ];

          for (const collection of collections) {
            if (data[collection.name]) {
              try {
                const docRef = doc(db, collection.collection, collection.docId);
                await setDoc(docRef, data[collection.name], { merge: true });
                console.log(`Restored ${collection.name}`);
              } catch (error) {
                console.warn(`Failed to restore ${collection.name}:`, error);
              }
            }
          }
          
          onLoad(data);
          alert("Firestore 원본 데이터가 성공적으로 불러와졌습니다!");
        }
      } catch (error) {
        console.error("Load error:", error);
        alert("파일 형식이 올바르지 않습니다.");
      }
    };
    reader.readAsText(file);
    
    // 파일 입력 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="ml-2 rounded border border-gray-400 bg-white px-2 py-0.5 text-xs text-black hover:opacity-80 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
        title="Firestore 원본 데이터 관리"
      >
        💾
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 w-96 max-w-[90vw]">
            <h2 className="text-lg font-semibold mb-4 text-black dark:text-white">Firestore 원본 데이터 관리</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2 text-black dark:text-white">Firestore 원본 데이터 저장</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                  Firestore에서 직접 원본 데이터를 가져와 JSON 파일로 저장합니다.
                </p>
                <button
                  onClick={handleSave}
                  className="w-full bg-blue-600 text-white rounded px-4 py-2 text-sm hover:bg-blue-700 transition"
                >
                  💾 Firestore 원본 데이터 저장하기
                </button>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2 text-black dark:text-white">Firestore 원본 데이터 불러오기</h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                  JSON 파일에서 Firestore 원본 데이터를 불러옵니다. 현재 데이터는 덮어쓰기 됩니다.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleLoad}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-green-600 text-white rounded px-4 py-2 text-sm hover:bg-green-700 transition"
                >
                  📁 파일 선택하여 불러오기
                </button>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-100 dark:border-zinc-600 dark:text-white dark:hover:bg-zinc-700"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
