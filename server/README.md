# SCENTIQUE 백엔드 API 서버

Express + MySQL로 만든 SCENTIQUE(향수 큐레이션·중고거래) 백엔드입니다.
프론트(React)는 상위 폴더의 `src/`에 있고, 이 `server/` 폴더는 API 서버만 담당합니다.

## 실행 방법

### 1. 준비
- Node.js 18 이상
- MySQL 8 (MySQL Workbench 등으로 접속 가능한 상태)

### 2. 패키지 설치
```bash
cd server
npm install
```

### 3. 환경 변수 파일 만들기
`.env.example`을 복사해서 `.env`를 만들고 `DB_PASSWORD`를 본인 MySQL 비밀번호로 바꿉니다.
```bash
copy .env.example .env      # Windows
cp .env.example .env        # macOS / Linux
```

### 4. DB 만들기 (테이블 + 초기 데이터)
```bash
npm run db:init
```
`scentique` 데이터베이스를 만들고 `db/schema.sql` → `db/seed.sql` 순서로 실행합니다.
다시 실행하면 모든 데이터가 초기 상태로 돌아갑니다.

### 5. 서버 실행
```bash
npm start          # 또는 npm run dev (코드 수정 시 자동 재시작)
```
→ `http://localhost:4000/api/health` 에서 `{"success":true,...}`가 나오면 성공

### 6. 테스트 실행
```bash
npm test
```
테스트는 `scentique_test` 데이터베이스를 따로 만들어서 사용하므로 실제 데이터에는 영향이 없습니다.
(테스트 파일마다 시작 전에 테스트 DB를 초기 데이터로 되돌립니다.)

## 테스트 계정 (seed.sql)

| 구분 | 이메일 | 비밀번호 | 닉네임 |
|---|---|---|---|
| 관리자 | admin@scentique.com | admin1234 | 관리자 |
| 회원 | lover@scentique.com | user1234 | 향수러버 |
| 회원 | daily@scentique.com | user1234 | 데일리향수 |

로그인 API(`POST /api/users/login`)로 받은 토큰을 요청 헤더에 넣어 사용합니다.
```
Authorization: Bearer <토큰>
```

## 폴더 구조

```
server/
├─ app.js              라우터 연결 (app만 export → 테스트에서 사용)
├─ server.js           서버 실행 (app.listen)
├─ config.js           .env 읽기 (테스트 시 DB_NAME_TEST 사용)
├─ db/
│  ├─ pool.js          MySQL 커넥션 풀
│  ├─ init.js          DB 초기화 스크립트
│  ├─ schema.sql       테이블 생성
│  └─ seed.sql         초기 데이터 (향수 8종, 설문, 테스트 계정, 샘플 리뷰·찜·판매글·거래)
├─ middlewares/
│  └─ auth.js          auth(로그인 필수), optionalAuth(로그인 선택), adminOnly(관리자)
├─ routes/
│  ├─ users.js         회원 (라우터 개수 제외)
│  ├─ perfumes.js      1. 향수
│  ├─ reviews.js       2. 리뷰
│  ├─ favorites.js     3. 찜
│  ├─ recommend.js     4. 추천
│  ├─ market.js        5. 중고 판매글
│  └─ orders.js        6. 거래 (관리자 중개 안전거래)
├─ utils/              공통 응답·검사 함수, 상수
└─ tests/              라우터별 테스트 (Jest + Supertest)
```

## API 목록 (★ = 핵심 API, 테스트 대상)

### 회원 `/api/users` — 6개 (라우터 개수 제외)
| 메서드 | URL | 기능 | 인증 |
|---|---|---|---|
| POST | /signup | 회원가입 | – |
| POST | /login | 로그인, 토큰 발급 | – |
| POST | /logout | 로그아웃 | 로그인 |
| GET | /me | 내 정보 조회 | 로그인 |
| PUT | /me | 닉네임·비밀번호 수정 | 로그인 |
| DELETE | /me | 회원 탈퇴 | 로그인 |

### 1. 향수 `/api/perfumes` — 7개
| 메서드 | URL | 기능 | 인증 |
|---|---|---|---|
| GET | / ★ | 목록 (q, category, mood, season, page, limit) | – |
| GET | /featured | 대표 향수 3종 | – |
| GET | /:id ★ | 상세 | – |
| GET | /:id/similar | 비슷한 향수 (limit, 기본 3) | – |
| POST | / | 향수 등록 | 관리자 |
| PUT | /:id | 향수 수정 | 관리자 |
| DELETE | /:id | 향수 삭제 | 관리자 |

### 2. 리뷰 `/api/reviews` — 6개
| 메서드 | URL | 기능 | 인증 |
|---|---|---|---|
| GET | / | 목록 (perfumeId, sort=latest/rating, page, limit) | – |
| GET | /stats/:perfumeId | 평균 별점, 리뷰 수, 별점 분포 | – |
| GET | /:id | 상세 | – |
| POST | / ★ | 작성 { perfumeId, rating, content } | 로그인 |
| PUT | /:id | 수정 (본인만) | 로그인 |
| DELETE | /:id | 삭제 (본인만) | 로그인 |

### 3. 찜 `/api/favorites` — 6개
| 메서드 | URL | 기능 | 인증 |
|---|---|---|---|
| GET | /ranking | 찜 많은 향수 순위 (limit) | – |
| GET | / | 내 찜 목록 | 로그인 |
| GET | /:perfumeId/check | 찜 여부 | 로그인 |
| POST | /:perfumeId ★ | 찜 추가 (중복 시 409) | 로그인 |
| DELETE | /:perfumeId ★ | 찜 해제 | 로그인 |
| DELETE | / | 찜 전체 비우기 | 로그인 |

### 4. 추천 `/api/recommend` — 6개
| 메서드 | URL | 기능 | 인증 |
|---|---|---|---|
| GET | /questions | 설문 질문과 보기 | – |
| GET | /stats | 많이 고른 답변, 많이 추천된 향수 | – |
| POST | / ★ | 추천 요청 { mood, season, category, purpose } | 선택 |
| GET | /history | 내 추천 기록 | 로그인 |
| GET | /history/:id | 기록 상세 (본인만) | 로그인 |
| DELETE | /history/:id | 기록 삭제 (본인만) | 로그인 |

### 5. 중고 판매글 `/api/market` — 7개
| 메서드 | URL | 기능 | 인증 |
|---|---|---|---|
| GET | / | 목록 (brand, category, minPrice, maxPrice, status, sort=latest/priceAsc/priceDesc) | – |
| GET | /my | 내 판매글 | 로그인 |
| GET | /:id | 상세 | – |
| POST | / ★ | 등록 { title, perfumeId?, brand?, category?, volumeMl, remainPercent, price, content? } | 로그인 |
| PUT | /:id | 수정 (본인만) | 로그인 |
| PATCH | /:id/status | 거래 상태 변경 { status: 판매중/예약중/판매완료 } | 로그인 |
| DELETE | /:id | 삭제 (본인만) | 로그인 |

구매 신청이 들어온 판매글(`order`가 있는 글)은 수정·상태 변경·삭제가 막힙니다(409). 상태는 거래 단계에 따라 자동으로 바뀝니다.

### 6. 거래 `/api/orders` — 11개
판매자와 구매자가 직접 만나지 않고 관리자(SCENTIQUE)가 물품을 받아 확인한 뒤 구매자에게 보내는 안전거래입니다.

```
구매신청 ──(판매자 발송)──▶ 판매자발송 ──(관리자 물품 인수)──▶ 인수완료 ──(관리자 물품 인계)──▶ 인계완료
판매글: 판매중 → 예약중                                                                      → 판매완료
```

| 메서드 | URL | 기능 | 인증 |
|---|---|---|---|
| POST | / ★ | 구매 신청 { postId, name, phone, address } → 판매글 예약중 | 로그인 |
| GET | /my | 내 구매 목록 (배송 정보 포함) | 로그인 |
| GET | /sales | 내 판매 거래 목록 (구매자 개인정보 제외) | 로그인 |
| GET | / | 전체 거래 목록 (stage 필터) | 관리자 |
| GET | /:id | 거래 상세 (구매자·판매자·관리자, 개인정보는 구매자·관리자만) | 로그인 |
| PATCH | /:id/ship | 판매자 발송: 물품을 관리자에게 보냄 (구매신청 → 판매자발송) | 로그인 (판매자) |
| PATCH | /:id/receive ★ | 물품 인수: 물품·대금 수령 확인 (판매자발송 → 인수완료) | 관리자 |
| PATCH | /:id/deliver ★ | 물품 인계: 구매자에게 발송 (인수완료 → 인계완료, 판매글 판매완료) | 관리자 |
| DELETE | /:id/receive | 물품 인수 취소 (인수완료 → 판매자발송) | 관리자 |
| DELETE | /:id/deliver | 물품 인계 취소 (인계완료 → 인수완료, 판매글 판매완료 → 예약중) | 관리자 |
| DELETE | /:id | 거래 취소 → 거래 삭제, 판매글 다시 판매중 (구매자: 구매신청 단계만 / 관리자: 인계 전까지) | 로그인 (구매자·관리자) |

**합계:** 라우터 6개 × 6~11개 = 43개 (회원 6개 별도)

## 응답 형식과 상태코드

```json
{ "success": true, "data": { ... } }
{ "success": false, "message": "오류 내용" }
```

| 코드 | 의미 |
|---|---|
| 200 / 201 | 조회·수정 성공 / 생성 성공 |
| 400 | 입력값 오류 |
| 401 | 로그인 필요 (토큰 없음·만료·로그아웃) |
| 403 | 권한 없음 (남의 글, 관리자 전용) |
| 404 | 대상 없음 |
| 409 | 중복·순서 오류 (이미 가입된 이메일, 이미 찜한 향수, 이미 거래 중인 판매글, 거래 단계가 맞지 않음 등) |

## 제출 전 확인
- `server/node_modules`와 상위 폴더의 `node_modules`를 모두 삭제
- `.env`는 제출하지 않고 `.env.example`만 포함
