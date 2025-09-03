// TodoTab.tsx

import TodoBoxSection from "./Todo/TodoBoxSection.tsx";
import TodayRoutine from "./Todo/TodayRoutine.tsx";

export default function TodoTab() {
  return (
    <div className="bg-white text-black dark:bg-zinc-900 dark:text-white">
      {/* 페이지 폭 제한 + 가운데 정렬 + 좌우 패딩 */}
      <div className="mx-auto w-full max-w-screen-2xl">
        {/* 기본 1열, 화면이 충분히 넓으면 3열.
            3열에서는 각 열을 max-content로 잡아 칸이 과하게 커지지 않게 하고,
            전체 그리드는 가운데 정렬 */}
        <div className="grid grid-cols-1 lg:[grid-template-columns:repeat(3,max-content)] gap-6 justify-center">
          {/* 각 카드(열) 최대폭 제한: 필요 시 숫자 조절 (예: 560px) */}
          <section className="w-full max-w-[560px]">
            <TodayRoutine />
          </section>

          <section className="w-full max-w-[560px]">
            <TodoBoxSection />
          </section>

          {/* 3열 레이아웃을 유지하면서도 비어있을 수 있는 3번째 칼럼은
              추후 위젯/섹션을 넣을 때 사용. 지금은 생략해도 되고,
              placeholder가 필요하면 아래 주석 해제. */}
          {/* <section className="w-full max-w-[560px]">
            <SomeFutureWidget />
          </section> */}
        </div>
      </div>
    </div>
  );
}
