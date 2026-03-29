import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  mealPlanSlots,
  pantryItems,
  recipes,
  type MealPlanSlot,
  type PantryStatus,
  type Recipe,
} from "./mockData";

const detailLayoutClassName =
  "grid gap-4 md:[grid-template-columns:minmax(18rem,22rem)_minmax(0,1fr)]";

const panelClassName =
  "rounded-3xl border border-zinc-200 bg-white/90 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/90";

const statusClassNameMap: Record<PantryStatus, string> = {
  충분:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  부족:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
  "주문 필요":
    "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300",
};

type PlannedMealSlot = MealPlanSlot & {
  recipeId: string | null;
};

export default function MealPlannerPage() {
  const [planSlots, setPlanSlots] = useState<PlannedMealSlot[]>(() =>
    mealPlanSlots.map((slot) => ({
      ...slot,
      recipeId: null,
    }))
  );
  const [selectedMealPlanId, setSelectedMealPlanId] = useState(
    mealPlanSlots[0]?.id ?? ""
  );
  const [selectedRecipeId, setSelectedRecipeId] = useState(recipes[0]?.id ?? "");
  const [activeRecipeId, setActiveRecipeId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 160, tolerance: 5 },
    })
  );

  const selectedMealPlan =
    planSlots.find((mealPlan) => mealPlan.id === selectedMealPlanId) ?? null;
  const selectedRecipe =
    recipes.find((recipe) => recipe.id === selectedRecipeId) ?? null;
  const activeRecipe =
    recipes.find((recipe) => recipe.id === activeRecipeId) ?? null;

  const relatedPlans = useMemo(
    () =>
      planSlots.filter(
        (mealPlan) =>
          selectedRecipeId.length > 0 && mealPlan.recipeId === selectedRecipeId
      ),
    [planSlots, selectedRecipeId]
  );

  const requiredIngredients = useMemo(() => {
    if (!selectedRecipe) {
      return [];
    }

    return selectedRecipe.requiredIngredients.map((ingredient) => {
      const pantryItem =
        pantryItems.find((item) => item.id === ingredient.ingredientId) ?? null;

      return {
        ...ingredient,
        pantryItem,
      };
    });
  }, [selectedRecipe]);

  const handleAssignRecipe = (slotId: string, recipeId: string) => {
    setPlanSlots((current) =>
      current.map((slot) =>
        slot.id === slotId
          ? {
              ...slot,
              recipeId,
            }
          : slot
      )
    );
    setSelectedMealPlanId(slotId);
    setSelectedRecipeId(recipeId);
  };

  const handleClearSlot = (slotId: string) => {
    setPlanSlots((current) =>
      current.map((slot) =>
        slot.id === slotId
          ? {
              ...slot,
              recipeId: null,
            }
          : slot
      )
    );

    if (selectedMealPlanId === slotId) {
      setSelectedMealPlanId(slotId);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const recipeId = event.active.data.current?.recipeId;

    if (typeof recipeId === "string") {
      setActiveRecipeId(recipeId);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveRecipeId(null);

    const recipeId = event.active.data.current?.recipeId;
    const slotId = event.over?.data.current?.slotId;

    if (typeof recipeId !== "string" || typeof slotId !== "string") {
      return;
    }

    handleAssignRecipe(slotId, recipeId);
  };

  return (
    <div className="min-h-full bg-stone-100 text-zinc-950 dark:bg-black dark:text-white">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-4 px-3 py-3">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className={detailLayoutClassName}>
            <div className="grid min-w-0 gap-4">
              <section className={panelClassName}>
                <PanelHeading
                  number="1"
                  title="식단계획 리스트"
                  description="빈 슬롯에 레시피를 끌어와 등록"
                />
                <div className="mt-3 flex flex-col gap-2">
                  {planSlots
                    .filter((mealPlan) => mealPlan.mealType !== "아침")
                    .map((mealPlan) => {
                      const recipe =
                        recipes.find(
                          (recipeItem) => recipeItem.id === mealPlan.recipeId
                        ) ?? null;
                      const isSelected = mealPlan.id === selectedMealPlanId;

                      return (
                        <MealPlanDropSlot
                          key={mealPlan.id}
                          mealPlan={mealPlan}
                          recipe={recipe}
                          isSelected={isSelected}
                          onSelect={() => {
                            setSelectedMealPlanId(mealPlan.id);

                            if (mealPlan.recipeId) {
                              setSelectedRecipeId(mealPlan.recipeId);
                            }
                          }}
                          onClear={() => handleClearSlot(mealPlan.id)}
                        />
                      );
                    })}
                </div>
              </section>

              <section className={panelClassName}>
                <PanelHeading
                  number="2"
                  title="레시피 리스트"
                  description="드래그해서 식단 슬롯에 배치"
                />
                <div className="mt-3 flex flex-col gap-2">
                  {recipes.map((recipe) => (
                    <DraggableRecipeCard
                      key={recipe.id}
                      recipe={recipe}
                      isSelected={recipe.id === selectedRecipeId}
                      onSelect={() => setSelectedRecipeId(recipe.id)}
                    />
                  ))}
                </div>
              </section>

              <section className={panelClassName}>
                <PanelHeading
                  number="3"
                  title="레시피 필수 재료"
                  description="선택 레시피 기준"
                />
                <div className="mt-3 flex flex-col gap-2">
                  {selectedRecipe ? (
                    requiredIngredients.map((ingredient) => {
                      const status =
                        ingredient.pantryItem?.status ?? ("주문 필요" as const);

                      return (
                        <div
                          key={ingredient.ingredientId}
                          className="rounded-2xl border border-zinc-200 bg-zinc-50/80 px-3 py-3 dark:border-zinc-800 dark:bg-zinc-950/70"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold">
                                {ingredient.pantryItem?.name ??
                                  ingredient.ingredientId}
                              </p>
                              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                필요량 {ingredient.amount}
                                {ingredient.note ? ` · ${ingredient.note}` : ""}
                              </p>
                            </div>
                            <span
                              className={`rounded-full border px-2 py-1 text-[11px] font-medium ${statusClassNameMap[status]}`}
                            >
                              {status}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <EmptyState text="먼저 레시피를 선택하거나 슬롯에 드롭해 주세요." />
                  )}
                </div>
              </section>

              <section className={panelClassName}>
                <PanelHeading
                  number="4"
                  title="주요 식재료 현황"
                  description="재고 스냅샷"
                />
                <div className="mt-3 flex flex-col gap-2">
                  {pantryItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-zinc-200 bg-zinc-50/80 px-3 py-3 dark:border-zinc-800 dark:bg-zinc-950/70"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{item.name}</p>
                          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            현재 {item.stock}
                            {item.unit} · {item.updatedAt}
                          </p>
                          {item.note ? (
                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                              {item.note}
                            </p>
                          ) : null}
                        </div>
                        <span
                          className={`rounded-full border px-2 py-1 text-[11px] font-medium ${statusClassNameMap[item.status]}`}
                        >
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <section className={`${panelClassName} min-w-0`}>
              <PanelHeading
                number="5"
                title="레시피 상세"
                description="오른쪽 패널은 여유 폭만큼 확장"
              />

              {selectedRecipe ? (
                <div className="mt-4 flex flex-col gap-5">
                  <div className="rounded-[1.75rem] bg-zinc-950 px-5 py-5 text-white dark:bg-zinc-900">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">
                          {selectedRecipe.category}
                        </p>
                        <h2 className="mt-2 text-2xl font-semibold">
                          {selectedRecipe.name}
                        </h2>
                        <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300">
                          {selectedRecipe.summary}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                        <MetricChip label="조리시간" value={selectedRecipe.cookTime} />
                        <MetricChip
                          label="기본 인분"
                          value={`${selectedRecipe.servings}인분`}
                        />
                        <MetricChip
                          label="연결 식단"
                          value={`${relatedPlans.length}건`}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
                    <div className="rounded-3xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/70">
                      <h3 className="text-sm font-semibold">조리 순서</h3>
                      <div className="mt-4 flex flex-col gap-3">
                        {selectedRecipe.steps.map((step, index) => (
                          <div
                            key={`${selectedRecipe.id}-step-${index + 1}`}
                            className="flex gap-3 rounded-2xl bg-white px-3 py-3 dark:bg-zinc-900"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                              {index + 1}
                            </div>
                            <p className="text-sm leading-6 text-zinc-700 dark:text-zinc-200">
                              {step}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-4">
                      <div className="rounded-3xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/70">
                        <h3 className="text-sm font-semibold">연결된 식단계획</h3>
                        <div className="mt-3 flex flex-col gap-2">
                          {relatedPlans.length > 0 ? (
                            relatedPlans.map((mealPlan) => (
                              <div
                                key={mealPlan.id}
                                className="rounded-2xl bg-white px-3 py-3 dark:bg-zinc-900"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-sm font-semibold">
                                    {mealPlan.dayLabel} {mealPlan.mealType}
                                  </p>
                                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                    {mealPlan.servings}인분
                                  </span>
                                </div>
                                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                  {mealPlan.goal}
                                </p>
                                <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">
                                  {mealPlan.memo}
                                </p>
                              </div>
                            ))
                          ) : (
                            <EmptyState text="이 레시피와 연결된 식단계획이 아직 없습니다." />
                          )}
                        </div>
                      </div>

                      <div className="rounded-3xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/70">
                        <h3 className="text-sm font-semibold">장보기 메모</h3>
                        <div className="mt-3 flex flex-col gap-2">
                          {requiredIngredients
                            .filter(
                              (ingredient) =>
                                !ingredient.pantryItem ||
                                ingredient.pantryItem.status !== "충분"
                            )
                            .map((ingredient) => (
                              <div
                                key={`${ingredient.ingredientId}-memo`}
                                className="rounded-2xl bg-white px-3 py-3 text-sm text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                              >
                                {ingredient.pantryItem?.name ??
                                  ingredient.ingredientId}
                                <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                                  {ingredient.amount}
                                </span>
                              </div>
                            ))}
                          {requiredIngredients.length > 0 &&
                          requiredIngredients.every(
                            (ingredient) =>
                              ingredient.pantryItem?.status === "충분"
                          ) ? (
                            <EmptyState text="현재 재고 기준으로 추가 구매가 필요하지 않습니다." />
                          ) : null}
                        </div>
                      </div>

                      {selectedMealPlan ? (
                        <div className="rounded-3xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-950/70">
                          <h3 className="text-sm font-semibold">현재 선택한 식단 메모</h3>
                          <p className="mt-3 text-sm leading-6 text-zinc-700 dark:text-zinc-200">
                            {selectedMealPlan.dayLabel} {selectedMealPlan.mealType} ·{" "}
                            {selectedMealPlan.goal}
                          </p>
                          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                            {selectedMealPlan.memo}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4">
                  <EmptyState text="레시피를 선택하거나 식단 슬롯에 드롭해 주세요." />
                </div>
              )}
            </section>
          </div>

          <DragOverlay>
            {activeRecipe ? (
              <div className="w-[240px]">
                <RecipeCardShell recipe={activeRecipe} isDragging />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}

function MealPlanDropSlot(props: {
  mealPlan: PlannedMealSlot;
  recipe: Recipe | null;
  isSelected: boolean;
  onSelect: () => void;
  onClear: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: props.mealPlan.id,
    data: {
      slotId: props.mealPlan.id,
    },
  });

  const slotClassName = props.recipe
    ? props.isSelected
      ? "border-amber-400 bg-amber-50 dark:border-amber-500 dark:bg-amber-500/10"
      : "border-zinc-200 bg-zinc-50/70 hover:border-zinc-300 hover:bg-white dark:border-zinc-800 dark:bg-zinc-950/70 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
    : isOver
      ? "border-lime-400 bg-lime-50 dark:border-lime-500 dark:bg-lime-500/10"
      : props.isSelected
        ? "border-amber-300 bg-amber-50/80 dark:border-amber-500 dark:bg-amber-500/10"
        : "border-dashed border-zinc-300 bg-transparent hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500";

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={props.onSelect}
      className={`rounded-2xl border px-3 py-3 text-left transition ${slotClassName}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">
              {props.mealPlan.mealType}
            </span>
            <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
              {props.mealPlan.servings}인분
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {props.mealPlan.goal}
          </p>
        </div>

        {props.recipe ? (
          <span
            onClick={(event) => {
              event.stopPropagation();
              props.onClear();
            }}
            className="rounded-full border border-zinc-300 px-2 py-1 text-[11px] text-zinc-500 hover:border-rose-300 hover:text-rose-600 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-rose-700 dark:hover:text-rose-300"
          >
            해제
          </span>
        ) : (
          <span className="rounded-full border border-dashed border-zinc-300 px-2 py-1 text-[11px] text-zinc-400 dark:border-zinc-700 dark:text-zinc-500">
            비어 있음
          </span>
        )}
      </div>

      {props.recipe ? (
        <>
          <p className="mt-3 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
            {props.recipe.name}
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {props.recipe.category} · {props.recipe.cookTime}
          </p>
        </>
      ) : (
        <div className="mt-3 rounded-2xl border border-dashed border-zinc-300 px-3 py-4 text-center text-xs text-zinc-400 dark:border-zinc-700 dark:text-zinc-500">
          여기에 레시피를 끌어와 등록
        </div>
      )}
    </button>
  );
}

function DraggableRecipeCard(props: {
  recipe: Recipe;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: props.recipe.id,
      data: {
        recipeId: props.recipe.id,
      },
    });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={props.onSelect}
      style={{
        transform: CSS.Translate.toString(transform),
      }}
      className={isDragging ? "opacity-50" : ""}
      {...listeners}
      {...attributes}
    >
      <RecipeCardShell
        recipe={props.recipe}
        isSelected={props.isSelected}
        isDragging={isDragging}
      />
    </button>
  );
}

function RecipeCardShell(props: {
  recipe: Recipe;
  isSelected?: boolean;
  isDragging?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border px-3 py-3 text-left transition ${
        props.isSelected
          ? "border-lime-400 bg-lime-50 text-zinc-950 shadow-sm dark:border-lime-500 dark:bg-lime-500/10 dark:text-white"
          : "border-zinc-200 bg-zinc-50/70 hover:border-zinc-300 hover:bg-white dark:border-zinc-800 dark:bg-zinc-950/70 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
      } ${props.isDragging ? "shadow-xl" : ""}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold">{props.recipe.name}</span>
        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
          {props.recipe.cookTime}
        </span>
      </div>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        {props.recipe.category} · {props.recipe.tags.join(" · ")}
      </p>
      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        드래그해서 식단 슬롯에 등록
      </p>
    </div>
  );
}

function PanelHeading(props: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
            {props.number}
          </span>
          <h2 className="text-sm font-semibold">{props.title}</h2>
        </div>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          {props.description}
        </p>
      </div>
    </div>
  );
}

function MetricChip(props: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-400">
        {props.label}
      </p>
      <p className="mt-1 text-sm font-semibold text-white">{props.value}</p>
    </div>
  );
}

function EmptyState(props: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 px-3 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
      {props.text}
    </div>
  );
}
