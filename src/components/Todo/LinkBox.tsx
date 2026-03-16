import { useState, useEffect } from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";

interface LinkData {
  title: string;
  url: string;
  id: string;
  category: string;
}

export default function LinkBox() {
  const [showList, setShowList] = useState(() => {
    const saved = localStorage.getItem("linkBox_showList");
    return saved !== null ? JSON.parse(saved) : false;
  });

  const [links, setLinks] = useState<LinkData[]>([]);
  const [newLink, setNewLink] = useState({ title: "", url: "", category: "" });
  const [isAdding, setIsAdding] = useState(false);

  // 그룹별 숨김 상태 관리
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem("linkBox_collapsedGroups");
    return saved !== null ? JSON.parse(saved) : {};
  });

  // showList 상태 변경 시 localStorage에 저장
  useEffect(() => {
    localStorage.setItem("linkBox_showList", JSON.stringify(showList));
  }, [showList]);

  // 그룹 숨김 상태 변경 시 localStorage에 저장
  useEffect(() => {
    localStorage.setItem("linkBox_collapsedGroups", JSON.stringify(collapsedGroups));
  }, [collapsedGroups]);

  // Firestore에서 링크 데이터 불러오기
  useEffect(() => {
    const loadLinks = async () => {
      try {
        const docRef = doc(db, "links", "main");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.links) {
            setLinks(data.links);
          }
        }
      } catch (e) {
        console.error("[LinkBox] 🔴 Load failed:", e);
      }
    };

    loadLinks();
  }, []);

  // 링크 추가
  const handleAdd = async () => {
    if (!newLink.title.trim() || !newLink.url.trim()) return;

    const linkData: LinkData = {
      id: Date.now().toString(),
      title: newLink.title.trim(),
      url: newLink.url.trim(),
      category: newLink.category.trim() || "기타"
    };

    try {
      const docRef = doc(db, "links", "main");
      await setDoc(docRef, {
        links: [...links, linkData]
      }, { merge: true });

      setLinks([...links, linkData]);
      setNewLink({ title: "", url: "", category: "" });
      setIsAdding(false);
    } catch (e) {
      console.error("[LinkBox] ❌ Add failed:", e);
    }
  };

  // 링크 삭제
  const handleDelete = async (id: string) => {
    try {
      const docRef = doc(db, "links", "main");
      await setDoc(docRef, {
        links: links.filter(link => link.id !== id)
      }, { merge: true });

      setLinks(links.filter(link => link.id !== id));
    } catch (e) {
      console.error("[LinkBox] ❌ Delete failed:", e);
    }
  };

  // 그룹 토글 함수
  const toggleGroup = (category: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const groupedLinks = links.reduce((acc: any, link) => {
    if (!acc[link.category]) {
      acc[link.category] = [];
    }
    acc[link.category].push(link);
    return acc;
  }, {});
  return (

    <div className="rounded shadow-none bg-transparent w-full transition-opacity">
      {/* 헤더 */}
      <div className="flex items-center justify-between mt-[3px]">
        <button
          className="mx-1 text-zinc-400 hover:text-white text-xs"
          onClick={() => setShowList(!showList)}
        >
          {showList ? "▽" : "▷"}

        </button>
        <h2 className="flex-1 text-blue-600 dark:text-blue-300 truncate text-xs">
          링크
        </h2>
      </div>

      {/* 내용 */}
      {showList && (
        <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400, py-2">

          {/* 링크 목록 */}
          <div className="space-y-4">
            {Object.keys(groupedLinks).map((category) => (
              <div key={category} className="mb-4">

                {/* 분류 제목 */}
                <div className="flex items-center gap-1 mb-2">
                  <h3 
                    onClick={() => toggleGroup(category)}
                    className="text-xs font-semibold text-zinc-500 cursor-pointer hover:text-zinc-300 transition"
                  >
                    {category}
                  </h3>
                </div>

                {/* 해당 분류 링크 */}
                {!collapsedGroups[category] && (
                <div className="grid grid-cols-6 gap-2">
                  {groupedLinks[category].map((link: LinkData) => (
                    <div
                      key={link.id}
                      className="group p-2 border border-zinc-200 dark:border-zinc-600 rounded text-xs flex justify-between"
                    >
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate flex-1"
                      >
                        {link.title}
                      </a>

                      <button
                        onClick={() => handleDelete(link.id)}
                        className="text-red-500 ml-2 opacity-0 sm:opacity-0 sm:group-hover:opacity-100 opacity-100 transition-opacity"
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
                )}
              </div>
            ))}

            {links.length === 0 && (
              <div className="text-zinc-400 text-xs text-center py-2">
                저장된 링크가 없습니다
              </div>
            )}
          </div>

          {/* 추가 버튼 */}
          {!isAdding ? (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full py-2 text-xs bg-transparent rounded transition"
            >
              + 링크 추가
            </button>
          ) : (
            <div className="space-y-2 mt-4">
              <input
                type="text"
                placeholder="제목"
                value={newLink.title}
                onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
                className="w-full px-2 py-1 text-xs border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 select-auto"
              />
              <input
                type="url"
                placeholder="URL (https://...)"
                value={newLink.url}
                onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                className="w-full px-2 py-1 text-xs border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 select-auto"
              />
              <input
                type="text"
                placeholder="분류"
                value={newLink.category}
                onChange={(e) =>
                  setNewLink({ ...newLink, category: e.target.value })
                }
                className="w-full px-2 py-1 text-xs border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 select-auto"
              />
              <div className="flex justify-center gap-2">
                <button
                  onClick={handleAdd}
                  className="px-3 py-1 text-xs rounded bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 transition"
                >
                  저장
                </button>
                <button
                  onClick={() => {
                    setIsAdding(false);
                    setNewLink({ title: "", url: "", category: "" });
                  }}
                  className="px-3 py-1 text-xs rounded bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 transition"
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
