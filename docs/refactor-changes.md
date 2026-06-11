# SCENTIQUE 1~4번 리팩터 변경 사항

## 한 줄 요약

**화면·기능은 그대로**이고, **코드 구조만** BookStore에 가깝게 바뀌었습니다.  
사용자가 보는 UI/동작은 동일하고, **누가 Redux를 쓰는지, 파일이 어디에 있는지**가 달라졌습니다.

---

## 1번 — PerfumeItem (Redux → props)

| 구분 | 기존 (수정 전) | 지금 (수정 후) |
|------|----------------|----------------|
| **PerfumeItem** | 안에서 `useSelector`, `useDispatch` 사용 | 훅 없음. `isFavorite`, `onToggleFavorite` **props**로 받음 |
| **ListPage / CartPage** | `<PerfumeItem perfume={...} />` 만 전달 | Redux 읽기·`dispatch` 후 props로 전달 |
| **화면** | 동일 | 동일 |
| **찜 기능** | 동일 | 동일 |

**의미:** BookStore `BookItem`처럼 **카드는 UI만**, 상태 처리는 **페이지**가 담당.

### 코드 변화 예시

**기존 (PerfumeItem 내부)**

```tsx
const dispatch = useDispatch();
const favoriteIds = useSelector((state: RootState) => state.favorite.ids);
const isFavorite = favoriteIds.includes(perfume.id);
// onClick={() => dispatch(toggleFavorite(perfume.id))}
```

**지금 (ListPage에서)**

```tsx
const dispatch = useDispatch();
const favoriteIds = useSelector((state: RootState) => state.favorite.ids);

<PerfumeItem
  perfume={perfume}
  isFavorite={favoriteIds.includes(perfume.id)}
  onToggleFavorite={(id) => dispatch(toggleFavorite(id))}
/>
```

---

## 2번 — ListPage `useMemo` 제거

| 구분 | 기존 (수정 전) | 지금 (수정 후) |
|------|----------------|----------------|
| **필터 결과** | `useMemo(() => perfumeData.filter(...), [deps])` | `perfumeData.filter(...)` **바로 계산** |
| **화면** | 동일 | 동일 |
| **필터 동작** | 동일 | 동일 |

**의미:** 향수 데이터가 8개뿐이라 `useMemo` 없이도 충분. 교재 ListPage처럼 **단순한 코드**.

**추가 변화:** 1번과 함께 ListPage에 **`useDispatch` + `useSelector`** 가 추가됨 (찜을 페이지에서 처리).

---

## 3번 — ScrollToTop → Content 안으로

| 구분 | 기존 (수정 전) | 지금 (수정 후) |
|------|----------------|----------------|
| **파일** | `layout/ScrollToTop.tsx` 별도 존재 | **삭제**, `Content.tsx` 안에 통합 |
| **코드** | `<ScrollToTop />` 컴포넌트 | `Content`에서 `useLocation` + `useEffect` |
| **동작** | 페이지 이동 시 스크롤 맨 위 | **동일** |

**의미:** 파일 하나 줄이고, 스크롤 처리를 **레이아웃(Content)** 에 모음.

### 코드 변화 예시

**기존**

```tsx
// Content.tsx
<ScrollToTop />

// ScrollToTop.tsx
useEffect(() => {
  window.scrollTo(0, 0);
}, [pathname]);
```

**지금 (Content.tsx 안)**

```tsx
const { pathname } = useLocation();

useEffect(() => {
  window.scrollTo(0, 0);
}, [pathname]);
```

---

## 4번 — `shared.tsx` 축소

| 구분 | 기존 (수정 전) | 지금 (수정 후) |
|------|----------------|----------------|
| **shared.tsx** | Button, Badge, SectionTitle, EmptyState, PerfumeImage, NoteList (6개) | **Button, Badge, PerfumeImage** (3개만) |
| **SectionTitle** | `<SectionTitle title="..." subtitle="..." />` | 각 페이지에 `<div className="section-title">` **직접 작성** |
| **EmptyState** | `<EmptyState ... onAction={...} />` | `<div className="empty-state">` **직접 작성** |
| **NoteList** | `<NoteList topNote={...} />` | Detail/Result에 `note-list` 마크업 **직접 작성** |
| **화면** | 동일 (className 동일) | 동일 |

**의미:** UI 헬퍼를 한 파일에 몰아두지 않고, **페이지에 마크업을 직접** 두는 교재 스타일.

### 영향 받은 파일

- `HomePage.tsx`
- `ListPage.tsx`
- `CartPage.tsx`
- `DetailPage.tsx`
- `ResultPage.tsx`
- `ReviewPage.tsx`

---

## 바뀌지 않은 것

| 항목 | 상태 |
|------|------|
| 페이지 경로 (`/list`, `/detail/:id` 등) | 동일 |
| Redux slice (favorite, review, recommend) | 동일 |
| `App.css` 디자인 | 동일 |
| RecommendPage, ResultPage, DetailPage 핵심 로직 | 동일 |
| Home Best Collection UI | 동일 (5번 미적용) |
| SPA 구조 (Content + Routes) | 동일 |

---

## 파일 구조 변화

```
기존                              지금
├── layout/                       ├── layout/
│   ├── Content.tsx               │   ├── Content.tsx  (+ useEffect 스크롤)
│   ├── Footer.tsx                │   └── Footer.tsx
│   └── ScrollToTop.tsx  (삭제)   │
├── components/                   ├── components/
│   ├── PerfumeItem.tsx (Redux)   │   ├── PerfumeItem.tsx (props만)
│   └── shared.tsx (6개 export)   │   └── shared.tsx (3개 export)
```

---

## BookStore와 비교 (리팩터 후)

| 항목 | BookStore | SCENTIQUE (지금) |
|------|-----------|------------------|
| Item 컴포넌트에 훅 | 없음 | 없음 (1번 적용 후) |
| Redux 사용 위치 | 페이지 (Detail, Cart) | 페이지 (List, Cart, Detail 등) |
| List 필터 | useState + map | useState + filter (memo 없음) |
| UI 헬퍼 | Bootstrap 직접 사용 | shared.tsx 최소 (Button, Badge, Image) |
| 스크롤 처리 | 없음 | Content useEffect |

---

## 발표 시 한 줄 설명

> PerfumeItem에서 Redux를 빼고 페이지로 옮겼고, List의 useMemo와 ScrollToTop 파일을 없애고, shared UI 헬퍼를 줄여서 **교수님 BookStore와 같은 코드 습관**에 맞췄습니다. **화면과 기능은 그대로**입니다.
