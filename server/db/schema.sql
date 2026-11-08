-- SCENTIQUE 데이터베이스 스키마
-- 실행: npm run db:init  (db/init.js가 이 파일과 seed.sql을 순서대로 실행)
-- 다시 실행하면 모든 테이블을 지우고 새로 만듭니다.

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS revoked_tokens;
DROP TABLE IF EXISTS market_posts;
DROP TABLE IF EXISTS recommend_history;
DROP TABLE IF EXISTS recommend_questions;
DROP TABLE IF EXISTS favorites;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS perfumes;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- 폐기된 JWT 토큰 (로그아웃·탈퇴 토큰의 jti 보관)
CREATE TABLE revoked_tokens (
  token_id    VARCHAR(100) PRIMARY KEY,
  expires_at  DATETIME NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 회원
CREATE TABLE users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  email       VARCHAR(100) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,              -- bcrypt 해시
  nickname    VARCHAR(30)  NOT NULL UNIQUE,
  role        ENUM('user', 'admin') NOT NULL DEFAULT 'user',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 향수 (id는 프론트와 같은 문자열 id 사용: 'chanel-chance-eau-tendre')
CREATE TABLE perfumes (
  id              VARCHAR(50)  PRIMARY KEY,
  name            VARCHAR(100) NOT NULL,
  brand           VARCHAR(50)  NOT NULL,
  category        ENUM('Floral', 'Woody', 'Musk', 'Citrus', 'Amber') NOT NULL,
  note_family     VARCHAR(100) NOT NULL DEFAULT '',
  mood            JSON NOT NULL,                  -- ["로맨틱한", "상큼한"]
  mood_tags       JSON NOT NULL,
  season          JSON NOT NULL,                  -- ["봄", "여름"]
  purpose         JSON NOT NULL,                  -- ["데일리", "데이트"]
  price_level     ENUM('Premium', 'Luxury', 'Niche') NOT NULL DEFAULT 'Premium',
  description     TEXT,
  highlight       VARCHAR(255) NOT NULL DEFAULT '',
  top_note        JSON NOT NULL,
  middle_note     JSON NOT NULL,
  base_note       JSON NOT NULL,
  image           VARCHAR(255) NOT NULL DEFAULT '',
  color           VARCHAR(20)  NOT NULL DEFAULT '#FFFFFF',
  short_copy      VARCHAR(255) NOT NULL DEFAULT '',
  is_featured     TINYINT(1) NOT NULL DEFAULT 0,  -- 대표 향수 여부
  featured_order  INT NULL,                       -- 대표 향수 노출 순서 (1, 2, 3)
  sort_order      INT NOT NULL DEFAULT 0,         -- 컬렉션 기본 정렬 순서
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 리뷰
CREATE TABLE reviews (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  perfume_id  VARCHAR(50) NOT NULL,
  rating      TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  content     TEXT NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_review (user_id, perfume_id),
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (perfume_id) REFERENCES perfumes(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 찜 (한 사람이 같은 향수를 두 번 찜할 수 없음)
CREATE TABLE favorites (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  perfume_id  VARCHAR(50) NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_favorite (user_id, perfume_id),
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (perfume_id) REFERENCES perfumes(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 추천 설문 질문
CREATE TABLE recommend_questions (
  id          INT PRIMARY KEY,
  q_key       VARCHAR(20)  NOT NULL UNIQUE,       -- mood / season / category / purpose
  title       VARCHAR(100) NOT NULL,
  subtitle    VARCHAR(100) NOT NULL DEFAULT '',
  options     JSON NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 추천 기록 (비로그인 요청도 통계용으로 저장, user_id는 NULL)
CREATE TABLE recommend_history (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  user_id           INT NULL,
  mood              VARCHAR(20) NOT NULL DEFAULT '',
  season            VARCHAR(20) NOT NULL DEFAULT '',
  category          VARCHAR(20) NOT NULL DEFAULT '',
  purpose           VARCHAR(20) NOT NULL DEFAULT '',
  perfume_id        VARCHAR(50) NULL,
  score             INT NOT NULL,
  matched_criteria  JSON NOT NULL,
  reason            TEXT NOT NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE SET NULL,
  FOREIGN KEY (perfume_id) REFERENCES perfumes(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 중고 판매글
CREATE TABLE market_posts (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL,
  perfume_id      VARCHAR(50) NULL,               -- 컬렉션 향수와 연결 (선택)
  title           VARCHAR(100) NOT NULL,
  brand           VARCHAR(50)  NOT NULL,
  category        ENUM('Floral', 'Woody', 'Musk', 'Citrus', 'Amber') NULL,
  volume_ml       INT NOT NULL CHECK (volume_ml > 0),
  remain_percent  TINYINT NOT NULL CHECK (remain_percent BETWEEN 1 AND 100),
  price           INT NOT NULL CHECK (price >= 0),
  content         TEXT,
  status          ENUM('판매중', '예약중', '판매완료') NOT NULL DEFAULT '판매중',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (perfume_id) REFERENCES perfumes(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
