# TASK_SHARED 작업 노트

## 개요

- 이 프로젝트는 `React + Vite + TypeScript + Tailwind CSS` 기반의 공유 작업 웹앱이다.
- 주요 목적은 할일, 루틴, 메모, 링크, 금전, 개인 메모를 한 화면에서 빠르게 관리하는 것이다.
- 공용 데이터는 주로 `Firestore`에 저장되고, UI 상태 일부는 `localStorage`를 사용한다.

## 실행

- 개발 서버: `npm run dev`
- 프로덕션 빌드: `npm run build`
- 미리보기: `npm run preview`

## 주요 화면 구조

### TodoTab

- 상단 주요 박스 순서는 `todo / routine / diet` 내부 키로 관리한다.
- 화면 표시용 텍스트는 현재 `할일 / 루틴 / 메모`로 보인다.
- 순서 변경 UI는 하단에 있으며 `위 / 아래` 버튼으로 위치를 바꾼다.
- 순서 값은 `localStorage.todoTabOrder`에 저장된다.

### TodoBoxSection

- 여러 개의 할일 박스를 만들고 관리하는 영역이다.
- 박스 추가, 삭제, 이름 변경, 위치 이동을 지원한다.
- 내부 아이템도 정렬과 편집이 가능하다.
- 공용 undo 흐름과 연결되어 있다.

### Routine 영역

- `TodayRoutine`, `CycleRoutine`, `DateReference` 3개 박스로 구성된다.
- `TodayRoutine`은 일일 루틴,
- `CycleRoutine`은 주기 루틴,
- `DateReference`는 날짜 참고용 항목을 다룬다.

### Memo Box

- 화면에는 `메모`로 보이지만 내부 구현 이름은 여전히 `DietBox`, `dietNotes` 계열이다.
- 이 기준은 유지해야 한다.
- 메모 데이터는 `sharedData/main.dietNotes`에 Firestore 실시간 동기화된다.
- 기존 `localStorage` 데이터는 Firestore가 비어 있을 때 1회 이관된다.
- `showList`, `selectedId` 같은 UI 상태는 로컬에 남아 있다.

### LinkBox

- 링크를 카테고리별로 묶어 관리한다.
- 항목 추가, 수정, 삭제, 카테고리 이동, 드래그 정렬을 지원한다.
- 링크 데이터는 `links/main.links`를 사용한다.

### MoneyBox

- 예산/지출 관리 영역이다.
- 합계와 사용자별 지출 흐름을 관리한다.

### 개인 메모

- 경인, 유섭 메모는 Tiptap 기반 에디터로 동작한다.
- Firestore에 각각 저장된다.

## 데이터 저장 구조

### Firestore

- `sharedData/main.todoBoxes`
- `sharedData/main.dietNotes`
- `routineItems/config.items`
- `moneyData/main`
- `links/main.links`
- `memos/kyunginMemo`
- `memos/YuseopMemo`

### localStorage

- `isAuthenticated`
- `theme`
- `todoTabOrder`
- `dietBox_showList`
- `dietBox_selectedId_v1`
- 기타 접힘 상태, 선택 상태 등 UI 상태

## 최근 반영 사항

### 메모 박스

- 화면 라벨을 `식단`에서 `메모`로 변경했다.
- `+ 새 메모` 버튼으로 신규 항목을 만든다.
- 바깥 레이아웃은 `기본 1열 -> xs 2열 -> md 1열`이다.
- 리스트 내부 메모 아이템은 현재 항상 1열이다.
- 리스트 높이는 현재 `기본 42px -> xs 300px -> md 42px`다.
- 리스트 영역은 스크롤 가능하지만 스크롤바는 숨긴 상태다.
- 리스트와 메모 편집 박스 사이 간격은 최근 줄여서 더 붙어 보이게 조정했다.
- 리스트 액션 버튼은 현재 `pin / edit title / delete` 툴팁을 사용한다.
- 제목 수정 버튼은 리스트 액션 줄에 다시 복원되어 있다.
- 하단 메모 편집부는 제목 입력 없이 내용만 수정한다.
- 하단 편집부는 하나의 배경 박스 안에 내용 입력만 보이도록 정리했다.
- 저장은 내부적으로 여전히 `draft.title`과 `draft.content` 조건을 사용한다.

### 링크 박스

- 링크 항목 액션 버튼은 현재 이모지 기준이다.
- 투명: `◼️`
- 수정: `✏️`
- 삭제: `🗑️`
- 버튼 툴팁은 `transparent / edit / delete`로 맞췄다.
- 버튼 가시성은 `xs` 기준으로 동작한다.
  - `xs` 미만: 항상 보임
  - `xs` 이상: hover 시 보임
- 링크 그룹 바깥 레이아웃은 현재 `기본 1열 -> xs 2열 -> md 1열`이다.

### TodoTab 순서 변경 UI

- 순서 변경 항목 표시 텍스트는 `루틴 / 할일 / 메모`
- 이동 버튼 텍스트는 `위 / 아래`
- 토글 버튼 텍스트는 `순서 수정 / 순서 닫기`

## 반응형 기준

- `xs`: `510px` 이상
- `md`: `768px` 이상
- `lg`: `1024px` 이상

현재 자주 쓰는 패턴:

- `grid-cols-1 xs:grid-cols-2 md:grid-cols-1`
- 최상위 3개 주요 박스는 `md:grid-cols-3`

## 공용 동작

### Undo

- `useGlobalUndoScope`와 `useFirestoreHistory`를 통해 공용 undo 흐름이 연결된다.
- 입력 중인 일반 텍스트 필드가 아닐 때 `Ctrl/Cmd + Z`가 공용 undo로 연결될 수 있다.

### Firestore 실시간 반영

- `useFirestoreHistory` 사용 영역은 onSnapshot 기반으로 동기화된다.
- 메모 박스도 이 흐름에 맞춰 동작한다.

## 주의 사항

- 메모 박스는 화면 이름과 내부 구현 이름이 다르다.
  - 화면: `메모`
  - 내부: `DietBox`, `dietNotes`
- 최근 작업 중 문자 인코딩 깨짐 이슈가 반복되었다.
- 한글이 포함된 파일은 가능하면 `apply_patch`로 좁게 수정하고,
- 파일 전체를 콘솔 경유로 다시 쓰는 방식은 피하는 것이 안전하다.

## 다음 작업 시 참고

- `DietBox` 이름을 실제 `MemoBox` 계열로 바꿀지 결정이 필요하다.
- 저장 키와 Firestore 필드까지 바꾸려면 마이그레이션 설계가 필요하다.
- 인코딩이 깨진 문자열이 남아 있으면 부분적으로 정리하는 것이 안전하다.
