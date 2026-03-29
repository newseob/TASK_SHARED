export type PantryStatus = "충분" | "부족" | "주문 필요";

export type MealPlanSlot = {
  id: string;
  dayLabel: string;
  mealType: string;
  servings: number;
  goal: string;
  memo: string;
};

export type RecipeIngredient = {
  ingredientId: string;
  amount: string;
  note?: string;
};

export type Recipe = {
  id: string;
  name: string;
  category: string;
  summary: string;
  cookTime: string;
  servings: number;
  tags: string[];
  requiredIngredients: RecipeIngredient[];
  steps: string[];
};

export type PantryItem = {
  id: string;
  name: string;
  stock: string;
  unit: string;
  status: PantryStatus;
  updatedAt: string;
  note?: string;
};

export const mealPlanSlots: MealPlanSlot[] = [
  {
    id: "slot-mon-lunch",
    dayLabel: "월요일",
    mealType: "점심",
    servings: 2,
    goal: "단백질 보충",
    memo: "외출 전 빠르게 준비 가능한 메뉴 우선",
  },
  {
    id: "slot-tue-dinner",
    dayLabel: "화요일",
    mealType: "저녁",
    servings: 3,
    goal: "채소 소진",
    memo: "냉장 채소를 먼저 소진하는 구성",
  },
  {
    id: "slot-wed-breakfast",
    dayLabel: "수요일",
    mealType: "아침",
    servings: 2,
    goal: "빠른 준비",
    memo: "조리 시간을 짧게 유지",
  },
  {
    id: "slot-thu-dinner",
    dayLabel: "목요일",
    mealType: "기타",
    servings: 4,
    goal: "간편식",
    memo: "여럿이 먹기 쉬운 메뉴 배치",
  },
];

export const recipes: Recipe[] = [
  {
    id: "recipe-bulgogi-salad",
    name: "불고기 샐러드볼",
    category: "메인",
    summary:
      "불고기와 채소를 한 그릇에 담아 점심으로 먹기 좋은 샐러드볼입니다.",
    cookTime: "25분",
    servings: 2,
    tags: ["고단백", "점심", "한그릇"],
    requiredIngredients: [
      { ingredientId: "beef", amount: "300g", note: "불고기용" },
      { ingredientId: "lettuce", amount: "1통" },
      { ingredientId: "paprika", amount: "1개" },
      { ingredientId: "onion", amount: "1/2개" },
      { ingredientId: "sesame-dressing", amount: "80ml" },
    ],
    steps: [
      "불고기를 양념해 중불에서 빠르게 볶습니다.",
      "상추, 파프리카, 양파를 먹기 좋은 크기로 썹니다.",
      "그릇에 채소를 담고 불고기를 올린 뒤 드레싱을 곁들입니다.",
    ],
  },
  {
    id: "recipe-doenjang-bowl",
    name: "된장 채소 덮밥",
    category: "메인",
    summary:
      "남은 채소와 된장 소스를 활용해 만드는 든든한 저녁 식사입니다.",
    cookTime: "20분",
    servings: 3,
    tags: ["저녁", "채소", "밥"],
    requiredIngredients: [
      { ingredientId: "zucchini", amount: "1개" },
      { ingredientId: "mushroom", amount: "200g" },
      { ingredientId: "tofu", amount: "1모", note: "300g 기준" },
      { ingredientId: "doenjang", amount: "2Tbsp" },
      { ingredientId: "rice", amount: "3공기" },
    ],
    steps: [
      "애호박과 버섯을 볶아 수분을 먼저 날립니다.",
      "된장을 물에 풀어 두부와 함께 넣고 졸입니다.",
      "밥 위에 소스를 올리고 참기름을 약간 더합니다.",
    ],
  },
  {
    id: "recipe-yogurt-bowl",
    name: "과일 요거트볼",
    category: "아침",
    summary:
      "준비 시간이 짧고 냉장고 과일 소진에도 좋은 아침 메뉴입니다.",
    cookTime: "10분",
    servings: 2,
    tags: ["아침", "간편", "차갑게"],
    requiredIngredients: [
      { ingredientId: "greek-yogurt", amount: "400g" },
      { ingredientId: "banana", amount: "2개" },
      { ingredientId: "berry", amount: "150g" },
      { ingredientId: "granola", amount: "100g" },
      { ingredientId: "honey", amount: "2Tbsp" },
    ],
    steps: [
      "그릭요거트를 두 개의 볼에 나눠 담습니다.",
      "바나나와 베리를 얹고 그래놀라를 뿌립니다.",
      "먹기 직전에 꿀을 한 바퀴 둘러 마무리합니다.",
    ],
  },
  {
    id: "recipe-chicken-wrap",
    name: "치킨 또띠아랩",
    category: "브런치",
    summary:
      "구운 닭가슴살과 야채를 넣어 이동하면서 먹기 쉬운 랩 메뉴입니다.",
    cookTime: "18분",
    servings: 4,
    tags: ["간편", "휴대용", "브런치"],
    requiredIngredients: [
      { ingredientId: "chicken-breast", amount: "2팩", note: "총 400g" },
      { ingredientId: "tortilla", amount: "4장" },
      { ingredientId: "lettuce", amount: "1/2통" },
      { ingredientId: "tomato", amount: "2개" },
      { ingredientId: "mustard-sauce", amount: "60ml" },
    ],
    steps: [
      "닭가슴살을 구워 한입 크기로 썹니다.",
      "또띠아에 채소와 닭가슴살, 소스를 올립니다.",
      "속이 빠지지 않게 단단히 말아 반으로 자릅니다.",
    ],
  },
];

export const pantryItems: PantryItem[] = [
  {
    id: "beef",
    name: "소고기 불고기용",
    stock: "450",
    unit: "g",
    status: "충분",
    updatedAt: "오늘 09:00",
    note: "냉장 2일 이내 사용",
  },
  {
    id: "lettuce",
    name: "상추",
    stock: "0.7",
    unit: "통",
    status: "부족",
    updatedAt: "오늘 08:30",
    note: "샐러드 1회분 정도 남음",
  },
  {
    id: "paprika",
    name: "파프리카",
    stock: "2",
    unit: "개",
    status: "충분",
    updatedAt: "어제 20:10",
  },
  {
    id: "onion",
    name: "양파",
    stock: "3",
    unit: "개",
    status: "충분",
    updatedAt: "어제 20:10",
  },
  {
    id: "sesame-dressing",
    name: "참깨 드레싱",
    stock: "40",
    unit: "ml",
    status: "주문 필요",
    updatedAt: "오늘 07:40",
    note: "다음 주문에 포함",
  },
  {
    id: "zucchini",
    name: "애호박",
    stock: "1",
    unit: "개",
    status: "충분",
    updatedAt: "오늘 07:20",
  },
  {
    id: "mushroom",
    name: "버섯",
    stock: "120",
    unit: "g",
    status: "부족",
    updatedAt: "오늘 07:20",
  },
  {
    id: "tofu",
    name: "두부",
    stock: "1",
    unit: "모",
    status: "충분",
    updatedAt: "어제 18:00",
  },
  {
    id: "doenjang",
    name: "된장",
    stock: "1",
    unit: "통",
    status: "충분",
    updatedAt: "어제 18:00",
  },
  {
    id: "rice",
    name: "밥",
    stock: "5",
    unit: "공기분",
    status: "충분",
    updatedAt: "오늘 06:40",
  },
  {
    id: "greek-yogurt",
    name: "그릭요거트",
    stock: "500",
    unit: "g",
    status: "충분",
    updatedAt: "오늘 06:10",
  },
  {
    id: "banana",
    name: "바나나",
    stock: "1",
    unit: "개",
    status: "부족",
    updatedAt: "오늘 06:10",
  },
  {
    id: "berry",
    name: "베리 믹스",
    stock: "180",
    unit: "g",
    status: "충분",
    updatedAt: "어제 19:40",
  },
  {
    id: "granola",
    name: "그래놀라",
    stock: "80",
    unit: "g",
    status: "부족",
    updatedAt: "어제 19:40",
  },
  {
    id: "honey",
    name: "꿀",
    stock: "1",
    unit: "병",
    status: "충분",
    updatedAt: "어제 19:40",
  },
  {
    id: "chicken-breast",
    name: "닭가슴살",
    stock: "3",
    unit: "팩",
    status: "충분",
    updatedAt: "오늘 08:10",
  },
  {
    id: "tortilla",
    name: "또띠아",
    stock: "3",
    unit: "장",
    status: "부족",
    updatedAt: "오늘 08:10",
    note: "랩 4개 기준 1장 부족",
  },
  {
    id: "tomato",
    name: "토마토",
    stock: "4",
    unit: "개",
    status: "충분",
    updatedAt: "어제 22:00",
  },
  {
    id: "mustard-sauce",
    name: "머스터드 소스",
    stock: "90",
    unit: "ml",
    status: "충분",
    updatedAt: "어제 22:00",
  },
];
