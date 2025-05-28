import { useEffect, useState } from "react";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Color from "@tiptap/extension-color";
import TextStyle from "@tiptap/extension-text-style";

// ✅ fontSize까지 지원하는 커스텀 TextStyle 확장
const CustomTextStyle = TextStyle.extend({
  addAttributes() {
    return {
      fontSize: {
        default: null,
        parseHTML: (element) => element.style.fontSize || null,
        renderHTML: (attributes) => {
          if (!attributes.fontSize) return {};
          return { style: `font-size: ${attributes.fontSize}` };
        },
      },
      color: {
        default: null,
        parseHTML: (element) => element.style.color || null,
        renderHTML: (attributes) => {
          if (!attributes.color) return {};
          return { style: `color: ${attributes.color}` };
        },
      },
    };
  },
});


export default function KyunginTab() {
  const [isLoaded, setIsLoaded] = useState(false);
  const MEMO_DOC_ID = "kyunginMemo";

  const editor = useEditor({
    extensions: [StarterKit, CustomTextStyle, Color],
    content: "<p>경인 메모를 입력하세요...</p>",
    onUpdate: ({ editor }) => {
      if (!isLoaded) return;
      const json = editor.getJSON();
      saveMemo(json);
    },
  });

  const loadMemo = async () => {
    const docRef = doc(db, "memos", MEMO_DOC_ID);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      const data = snapshot.data();
      if (data.content) {
        editor?.commands.setContent(data.content);
      }
    }
    setIsLoaded(true);
  };

  const saveMemo = async (content: any) => {
    const docRef = doc(db, "memos", MEMO_DOC_ID);
    await setDoc(docRef, { content });
    console.log("✅ 저장됨");
  };

  const handleManualLoad = () => {
    if (editor) loadMemo();
  };

  const handleManualSave = () => {
    if (editor) saveMemo(editor.getJSON());
  };

  useEffect(() => {
    if (editor) {
      loadMemo();
    }
  }, [editor]);

  const setBold = () => editor?.chain().focus().toggleBold().run();
  const setColor = (color: string) =>
    editor?.chain().focus().setColor(color).run();
  const setFontSize = (size: string) =>
    editor?.chain().focus().setMark("textStyle", { fontSize: size }).run();

  // 초기 스타일 적용
  useEffect(() => {
    if (editor && isLoaded) {
      //setColor("black");
      setFontSize("18px");
    }
  }, [editor, isLoaded]);

  return (
    <div className="w-full h-full flex flex-col bg-white text-black dark:bg-zinc-900 dark:text-white">
      {/* 상단 메뉴 고정 */}
      <div className="sticky top-0 z-10 bg-gray-100 dark:bg-zinc-800 py-2 border-b border-gray-300 dark:border-zinc-700">
        <div className="flex gap-4 items-center px-1">
          <button
            onClick={setBold}
            className="px-3 py-1 text-sm bg-gray-200 dark:bg-zinc-700 text-black dark:text-white border border-gray-300 dark:border-zinc-600 rounded font-semibold hover:bg-gray-300 dark:hover:bg-zinc-600"
            title="굵게"
          >
            굵게
          </button>

          <select
            onChange={(e) => setColor(e.target.value)}
            defaultValue=""
            className="px-3 py-1 text-sm bg-gray-200 dark:bg-zinc-700 text-black dark:text-white border border-gray-300 dark:border-zinc-600 rounded font-semibold hover:bg-gray-300 dark:hover:bg-zinc-600"
          >
            <option value="" disabled>색상 선택</option>
            <option value="default">기본</option> {/* ✅ 자동 색상 */}
            <option value="red">빨강</option>
            <option value="blue">파랑</option>
            <option value="green">초록</option>
          </select>

          <select
            onChange={(e) => setFontSize(e.target.value)}
            defaultValue=""
            className="px-3 py-1 text-sm bg-gray-200 dark:bg-zinc-700 text-black dark:text-white border border-gray-300 dark:border-zinc-600 rounded font-semibold hover:bg-gray-300 dark:hover:bg-zinc-600"
          >
            <option value="" disabled>글자 크기</option>
            <option value="14px">작게</option>
            <option value="18px">중간</option>
            <option value="24px">크게</option>
            <option value="32px">매우 크게</option>
          </select>

          <button
            onClick={handleManualSave}
            className="px-3 py-1 text-sm bg-gray-200 dark:bg-zinc-700 text-black dark:text-white border border-gray-300 dark:border-zinc-600 rounded font-semibold hover:bg-gray-300 dark:hover:bg-zinc-600"
          >
            저장
          </button>

          <button
            onClick={handleManualLoad}
            className="px-3 py-1 text-sm bg-gray-200 dark:bg-zinc-700 text-black dark:text-white border border-gray-300 dark:border-zinc-600 rounded font-semibold hover:bg-gray-300 dark:hover:bg-zinc-600"
          >
            불러오기
          </button>

        </div>
      </div>

      {/* 에디터 영역만 스크롤 */}
      <div className="flex-1 overflow-auto">
        <EditorContent
          editor={editor}
          className="tiptap px-4 py-2 text-black dark:text-white bg-white dark:bg-zinc-900 focus:outline-none"
        />
      </div>
    </div>
  );

}
