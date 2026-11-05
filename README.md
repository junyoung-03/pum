# SCENTIQUE — 향수 큐레이션 · 중고거래 웹서비스

React(프론트) + Express·MySQL(백엔드)로 만든 프로젝트입니다.

```
pum-main/
├─ src/        React 화면 (Vite)
├─ public/     향수 이미지
└─ server/     Express API 서버 + MySQL (라우터·API·테스트) → server/README.md
```

## 실행 방법 (터미널 2개)

처음 한 번만:
```bash
# 1) 백엔드
cd server
npm install
copy .env.example .env        # .env를 열어 DB_PASSWORD를 본인 MySQL 비밀번호로 수정
npm run db:init               # MySQL에 scentique DB·테이블·초기 데이터 생성

# 2) 프론트 (프로젝트 최상위 폴더에서)
npm install
```

실행할 때마다:

| 터미널 | 위치 | 명령 |
|---|---|---|
| 1번 (API 서버) | `pum-main/server` | `npm start` |
| 2번 (화면) | `pum-main` | `npm run dev` |

브라우저에서 **http://localhost:5173/pum/** 접속
(화면의 `/api` 요청은 vite.config.ts의 proxy 설정으로 4000번 API 서버에 전달됩니다.)

## 테스트 계정

| 구분 | 이메일 | 비밀번호 |
|---|---|---|
| 회원 | lover@scentique.com | user1234 |
| 회원 | daily@scentique.com | user1234 |
| 관리자 | admin@scentique.com | admin1234 |

## 화면별 기능과 사용하는 API

| 메뉴 | 기능 | API |
|---|---|---|
| HOME | 대표 향수 3종, 인기 찜 TOP 5 | `GET /api/perfumes/featured`, `GET /api/favorites/ranking` |
| COLLECTION | 검색·향 계열·무드·계절 필터 | `GET /api/perfumes` |
| 향수 상세 | 상세 정보, 평균 별점·별점 분포, 리뷰, 비슷한 향수(유사도 점수) | `GET /api/perfumes/:id`, `/:id/similar`, `GET /api/reviews/stats/:id`, `GET /api/reviews` |
| REVIEW | 리뷰 작성·수정·삭제, 향수별 보기, 최신순/별점순 | `GET·POST /api/reviews`, `PUT·DELETE /api/reviews/:id` |
| RECOMMEND | 설문 → 서버가 점수 계산 → 결과, 추천 통계 | `GET /api/recommend/questions`, `POST /api/recommend`, `GET /api/recommend/stats` |
| 내 추천 기록 | 기록 목록·추천 이유·삭제 | `GET /api/recommend/history`, `GET·DELETE /api/recommend/history/:id` |
| FAVORITES | 찜 추가·해제, 내 찜 목록, 전체 비우기 | `POST·DELETE /api/favorites/:id`, `GET·DELETE /api/favorites` |
| MARKET | 판매글 목록(브랜드·계열·상태·가격 필터, 정렬), 상세, 등록·수정, 거래 상태 변경, 삭제, 내 판매글 | `/api/market` 7개 |
| LOGIN · JOIN · 마이페이지 | 로그인·회원가입·로그아웃, 닉네임·비밀번호 변경, 탈퇴 | `/api/users` 6개 |
| ADMIN (관리자) | 컬렉션 향수 등록·수정·삭제, 대표 향수 지정 | `POST /api/perfumes`, `PUT·DELETE /api/perfumes/:id` |

## 참고
- GitHub Pages에는 화면 파일만 올라가고 API 서버는 실행되지 않으므로, 데이터가 필요한 기능은 로컬 실행으로 확인합니다.
- 제출 전 `node_modules` 폴더(최상위, server 둘 다)와 `server/.env`는 삭제합니다.
