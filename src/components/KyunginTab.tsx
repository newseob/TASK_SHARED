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
      setColor("black");
      setFontSize("18px");
    }
  }, [editor, isLoaded]);

  return (
    <div className="w-full h-full flex flex-col">
      {/* 상단 메뉴 고정 */}
      <div className="sticky top-0 z-10 bg-white py-2 border-b">
        <div className="flex gap-4 items-center px-1">
          <button
            onClick={setBold}
            className="px-3 py-1 text-sm bg-white border rounded font-semibold"
            title="굵게"
          >
            굵게
          </button>

          <select
            onChange={(e) => setColor(e.target.value)}
            defaultValue=""
            className="px-2 py-1 bg-white border rounded text-sm"
          >
            <option value="" disabled>색상 선택</option>
            <option value="black">검정</option>
            <option value="red">빨강</option>
            <option value="blue">파랑</option>
            <option value="green">초록</option>
          </select>

          <select
            onChange={(e) => setFontSize(e.target.value)}
            defaultValue=""
            className="px-2 py-1 bg-white border rounded text-sm"
          >
            <option value="" disabled>글자 크기</option>
            <option value="14px">작게</option>
            <option value="18px">중간</option>
            <option value="24px">크게</option>
            <option value="32px">매우 크게</option>
          </select>
        </div>
      </div>

      {/* 에디터 영역만 스크롤 */}
      <div className="flex-1 overflow-auto">
        <EditorContent
          editor={editor}
          className="tiptap px-4 py-2 focus:outline-none focus:ring-0 focus:border-transparent"
          />
      </div>
    </div>
  );

}
