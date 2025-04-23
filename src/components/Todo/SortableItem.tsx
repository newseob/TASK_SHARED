import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ✅ 인터페이스 선언
interface TodoItem {
  id: string;
  text: string;
  count?: string;
  unit?: string;
  status?: string;
}

export default function SortableItem({
  item,
  boxId,
  isSelected,
  isLowCount,
  onToggle,
  boxMode,
  onChangeItem,
  onRemoveItem,
  editingItemId,
  setEditingItemId,
  editingCountId,
  setEditingCountId,
  editingUnitId,
  setEditingUnitId,
}: {
  item: TodoItem;
  boxId: string;
  boxMode: "default" | "shopping";
  isSelected: boolean;
  isLowCount: boolean;
  onToggle: (boxId: string, itemId: string) => void;
  onChangeItem: (
    boxId: string,
    itemId: string,
    value: string,
    field?: "text" | "count" | "unit" | "status"
  ) => void;
  onRemoveItem: (boxId: string, itemId: string) => void;
  editingItemId: string | null;
  setEditingItemId: (id: string | null) => void;
  editingCountId: string | null;
  setEditingCountId: (id: string | null) => void;
  editingUnitId: string | null;
  setEditingUnitId: (id: string | null) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const baseBg =
    item.status === "blue"
      ? "bg-blue-50 text-blue-800"
      : item.status === "red"
        ? "bg-red-50 text-red-800"
        : "bg-white text-black";

  const textColorClass =
    item.status === "blue"
      ? "text-blue-600"
      : item.status === "red"
        ? "text-red-600"
        : isLowCount
          ? "text-red-600"
          : "text-gray-500";

  const borderColorClass =
    item.status === "blue"
      ? "border-blue-400"
      : item.status === "red"
        ? "border-red-400"
        : "border-gray-300";

  const handleToggleStatus = () => {
    const nextStatus =
      item.status === "none" ? "red" : item.status === "red" ? "blue" : "none";

    onChangeItem(boxId, item.id, nextStatus, "status");
  };

  return (
    <li
      {...attributes}
      ref={setNodeRef}
      style={style}
      className={`p-1 mb-1 rounded-md border border-gray-300 flex items-center justify-between transition-colors duration-300 ${baseBg} ${borderColorClass}`}
    >
      {/* ✅ 왼쪽 체크 버튼 */}
      <button
        {...listeners}
        onClick={(e) => {
          e.stopPropagation();
          onToggle(boxId, item.id); // ① 선택 토글
          handleToggleStatus(); // ② 상태 토글(기존 로직)
        }}
        className={`mr-2 w-5 h-5 rounded-full border flex items-center justify-center text-xs shrink-0 transition-colors ${item.status === "blue"
            ? "bg-blue-500 text-white border-blue-500"
            : item.status === "red"
              ? "bg-white text-white border-red-400"
              : "bg-white text-gray-400 border-gray-400"
          }`}
      ></button>

      {/* ✅ 장보기 모드일 때 텍스트 + 개수 + 단위 간격을 입력창과 동일하게 맞춤 */}
      <div className="flex-1 flex items-center gap-2 overflow-hidden leading-none min-w-0">
        {boxMode === "shopping" ? (
          <>
            {/* 텍스트 */}
            <div className="flex-[6] min-w-0 truncate">
              {editingItemId === item.id ? (
                <input
                  type="text"
                  value={item.text}
                  onChange={(e) => onChangeItem(boxId, item.id, e.target.value)}
                  onBlur={() => setEditingItemId(null)}
                  className="text-sm font-normal bg-transparent border-none outline-none w-full truncate"
                  autoFocus
                />
              ) : (
                <span
                  className="text-sm truncate cursor-text inline-block w-full"
                  onClick={() => setEditingItemId(item.id)}
                >
                  {item.text}
                </span>
              )}
            </div>

            {/* 개수 */}
            <div className="flex-[2] text-xs text-right font-mono truncate">
              {editingCountId === item.id ? (
                <input
                  type="text"
                  value={item.count}
                  onChange={(e) =>
                    onChangeItem(boxId, item.id, e.target.value, "count")
                  }
                  onBlur={() => setEditingCountId(null)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setEditingCountId(null);
                  }}
                  className={`w-full text-right bg-transparent outline-none border-none ${textColorClass}`}
                  autoFocus
                />
              ) : (
                <span
                  className={`cursor-text ${textColorClass}`}
                  onClick={() => setEditingCountId(item.id)}
                >
                  {item.count}
                </span>
              )}
            </div>

            {/* 단위 */}
            <div className="flex-[2] text-xs text-left font-mono truncate">
              {editingUnitId === item.id ? (
                <input
                  type="text"
                  value={item.unit}
                  onChange={(e) =>
                    onChangeItem(boxId, item.id, e.target.value, "unit")
                  }
                  onBlur={() => setEditingUnitId(null)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setEditingUnitId(null);
                  }}
                  className={`w-full text-left bg-transparent outline-none border-none ${textColorClass}`}
                  autoFocus
                />
              ) : (
                <span
                  className={`cursor-text ${textColorClass}`}
                  onClick={() => setEditingUnitId(item.id)}
                >
                  {item.unit}
                </span>
              )}
            </div>
          </>
        ) : (
          // ✅ 일반 텍스트 모드
          <div className="flex-1 min-w-0 truncate">
            {editingItemId === item.id ? (
              <input
                type="text"
                value={item.text}
                onChange={(e) => onChangeItem(boxId, item.id, e.target.value)}
                onBlur={() => setEditingItemId(null)}
                className="text-sm font-normal bg-transparent border-none outline-none w-full truncate"
                autoFocus
              />
            ) : (
              <span
                className="text-sm truncate cursor-text inline-block w-full"
                onClick={() => setEditingItemId(item.id)}
              >
                {item.text}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ✅ 삭제 버튼 */}
      <button
        onClick={() => onRemoveItem(boxId, item.id)}
        className="ml-2 px-2 text-gray rounded hover:bg-gray-200 transition text-sm shrink-0"
        title="삭제"
      >
        X
      </button>
    </li>
  );
}
