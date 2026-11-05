-- SCENTIQUE 초기 데이터
-- 향수 8종과 설문 질문은 기존 프론트(src/data)에 하드코딩되어 있던 데이터를 옮긴 것입니다. 이제 프론트는 이 DB 데이터를 API로 받아 씁니다.
-- 테스트 계정 (비밀번호는 bcrypt로 해시되어 저장)
--   관리자: admin@scentique.com / admin1234
--   회원1 : lover@scentique.com / user1234   (닉네임 향수러버)
--   회원2 : daily@scentique.com / user1234   (닉네임 데일리향수)

INSERT INTO users (id, email, password, nickname, role) VALUES
  (1, 'admin@scentique.com', '$2a$10$MbZgv05yVxaS.ZcqVpBDmu57q6pSHiyk2zZXFYaJXQz5quNgf5NWy', '관리자', 'admin'),
  (2, 'lover@scentique.com', '$2a$10$Q9N4OWtryJs6aiTu6/ibyeEg5BuDQ0sohD9hYH9EZUBm7pTiJqnGe', '향수러버', 'user'),
  (3, 'daily@scentique.com', '$2a$10$tqEzcfx5pq5UDTsmMYGbWu0HXxHPKr8eN4I581G36Vhum73TUjL9q', '데일리향수', 'user');

INSERT INTO perfumes (id, name, brand, category, note_family, mood, mood_tags, season, purpose, price_level, description, highlight, top_note, middle_note, base_note, image, color, short_copy, is_featured, featured_order, sort_order) VALUES
  ('chanel-chance-eau-tendre', 'Chance Eau Tendre', 'CHANEL', 'Floral', '플로럴 / 프루티', '["로맨틱한","상큼한","우아한"]', '["로맨틱","데일리","부드러운"]', '["봄","여름"]', '["데일리","데이트"]', 'Premium', '자스민과 화이트 머스크가 어우러진 부드럽고 여성스러운 플로럴 향수입니다. 플로럴과 프루티 노트가 조화를 이루며, 로맨틱하고 데일리하게 사용하기 좋은 대중적인 베스트셀러입니다.', '여성스럽고 대중적인 베스트 향수', '["자몽","퀸스"]', '["히아신스","자스민"]', '["화이트 머스크","아이리스","앰버"]', '/images/perfumes/chanel-chance-eau-tendre.png', '#FFE4E8', '여성스럽고 대중적인 베스트 향수', 1, 2, 1),
  ('dior-sauvage-edp', 'Sauvage Eau de Parfum', 'DIOR', 'Citrus', '시트러스 / 바닐라 / 스파이시', '["고급스러운","세련된"]', '["강렬한","세련된","남성적인"]', '["가을","겨울"]', '["출근","특별한 날"]', 'Premium', '베르가못의 상쾌한 시트러스와 바닐라, 스파이시 노트가 어우러진 강렬하고 세련된 남성 향수입니다. 남성 향수의 대표 상품으로, 도시적이고 카리스마 있는 인상을 완성합니다.', '남성 향수 대표 상품', '["베르가못","페퍼"]', '["시쿠안 페퍼","라벤더","핑크 페퍼"]', '["앰브록산","바닐라","라브다넘"]', '/images/perfumes/dior-sauvage-edp.png', '#2C3E50', '남성 향수 대표 상품', 1, 1, 2),
  ('jo-malone-english-pear', 'English Pear & Freesia', 'JO MALONE', 'Floral', '프루티 / 플로럴', '["상큼한","우아한","차분한"]', '["산뜻한","깨끗한","가을 느낌"]', '["봄","가을"]', '["데일리","출근"]', 'Premium', '잘 익은 배의 프루티함과 프리지아의 플로럴 향이 만나 산뜻하고 깨끗한 무드를 연출합니다. 가을에 특히 잘 어울리며, 누구나 좋아할 만한 데일리 향수입니다.', '누구나 좋아할 만한 데일리 향', '["킹 윌리엄 배","멜론"]', '["프리지아","장미"]', '["패출리","앰버","화이트 머스크"]', '/images/perfumes/jo-malone-english-pear.png', '#D4E6B5', '누구나 좋아할 만한 데일리 향', 1, 3, 3),
  ('le-labo-santal-33', 'Santal 33', 'LE LABO', 'Woody', '우디 / 스모키', '["고급스러운","차분한","세련된"]', '["감각적인","도시적인","유니섹스"]', '["가을","겨울"]', '["출근","특별한 날"]', 'Niche', '샌달우드와 스모키 노트가 어우러진 감각적이고 도시적인 유니섹스 향수입니다. 니치 향수의 정수를 담아, 세련된 도시인의 시그니처 향으로 사랑받고 있습니다.', '니치 향수 느낌을 주는 핵심 상품', '["카다몬","아이리스","바이올렛"]', '["앰브록스","호주 샌달우드","파피루스"]', '["시더우드","가죽","스모키"]', '/images/perfumes/le-labo-santal-33.png', '#C9B896', '니치 향수 느낌을 주는 핵심 상품', 0, NULL, 4),
  ('diptyque-do-son', 'Do Son Eau de Parfum', 'DIPTYQUE', 'Floral', '튜베로즈 / 화이트 플로럴', '["로맨틱한","우아한","고급스러운"]', '["우아한","여성스러운","고급스러운"]', '["봄","여름"]', '["데이트","특별한 날"]', 'Niche', '베트남 해변의 튜베로즈와 화이트 플로럴이 어우러진 우아하고 여성스러운 향수입니다. 고급스러운 플로럴 계열의 대표 상품으로, 관능적이면서도 세련된 무드를 선사합니다.', '플로럴 계열 대표 상품', '["오렌지 블라썸","핑크 페퍼"]', '["튜베로즈","자스민","장미"]', '["벤조인","머스크"]', '/images/perfumes/diptyque-do-son.png', '#F8F4E3', '플로럴 계열 대표 상품', 0, NULL, 5),
  ('mfk-baccarat-rouge-540', 'Baccarat Rouge 540', 'Maison Francis Kurkdjian', 'Amber', '앰버 / 우디 / 플로럴', '["고급스러운","로맨틱한","세련된"]', '["화려한","고급스러운","특별한 날"]', '["가을","겨울"]', '["특별한 날","데이트"]', 'Niche', '사프란과 앰버, 우디·플로럴 노트가 빛나는 아우라처럼 어우러진 화려하고 고급스러운 향수입니다. 특별한 날을 위한 프리미엄 이미지를 가장 잘 보여주는 시그니처 향입니다.', '프리미엄 이미지를 가장 잘 보여줌', '["사프란","자스민"]', '["앰버그리스","시더우드"]', '["퍼 발삼","앰버","머스크"]', '/images/perfumes/mfk-baccarat-rouge-540.png', '#E8D4C4', '프리미엄 이미지를 가장 잘 보여줌', 0, NULL, 6),
  ('byredo-mojave-ghost', 'Mojave Ghost', 'BYREDO', 'Musk', '우디 / 플로럴 / 머스크', '["차분한","세련된","우아한"]', '["신비로운","부드러운","유니섹스"]', '["봄","가을"]', '["데일리","출근"]', 'Niche', '우디, 플로럴, 머스크가 신비롭고 부드럽게 어우러진 유니섹스 향수입니다. 감성적인 브랜드 무드를 연출하기에 좋으며, 미니멀하고 몽환적인 아름다움을 표현합니다.', '감성적인 브랜드 무드 연출에 좋음', '["암브렛","자몽","사포딜라"]', '["마그놀리아","바이올렛","샌달우드"]', '["시더우드","머스크","앰버우드"]', '/images/perfumes/byredo-mojave-ghost.png', '#F5EEE6', '감성적인 브랜드 무드 연출에 좋음', 0, NULL, 7),
  ('tom-ford-oud-wood', 'Oud Wood', 'TOM FORD', 'Woody', '오드 / 우디 / 스파이시', '["고급스러운","차분한","세련된"]', '["깊은","고급스러운","성숙한"]', '["가을","겨울"]', '["특별한 날","출근"]', 'Niche', '오드, 우디, 스파이시 노트가 깊고 고급스럽게 어우러진 성숙한 럭셔리 향수입니다. 프리미엄·럭셔리 분위기를 강화하며, 관능적이고 세련된 인상을 완성합니다.', '프리미엄·럭셔리 분위기 강화', '["로즈우드","카다몬","중국 후추"]', '["오드","샌달우드","베티버"]', '["통카빈","바닐라","앰버"]', '/images/perfumes/tom-ford-oud-wood.png', '#3D2B1F', '프리미엄·럭셔리 분위기 강화', 0, NULL, 8);

INSERT INTO recommend_questions (id, q_key, title, subtitle, options, sort_order) VALUES
  (1, 'mood', '어떤 분위기의 향수를 찾고 계신가요?', '오늘 연출하고 싶은 무드를 선택해주세요', '["고급스러운","상큼한","차분한","로맨틱한"]', 1),
  (2, 'season', '주로 어느 계절에 사용하실 예정인가요?', '계절에 따라 어울리는 향이 달라집니다', '["봄","여름","가을","겨울"]', 2),
  (3, 'category', '선호하는 향 계열을 선택해주세요', '가장 끌리는 향의 특성을 골라주세요', '["Floral","Woody","Musk","Citrus","Amber"]', 3),
  (4, 'purpose', '향수를 어떤 상황에서 주로 사용하실 건가요?', 'TPO에 맞는 향수를 추천해드릴게요', '["데일리","데이트","출근","특별한 날"]', 4);

-- 기존 프론트의 기본 리뷰 2개
INSERT INTO reviews (user_id, perfume_id, rating, content, created_at) VALUES
  (2, 'mfk-baccarat-rouge-540', 5, '정말 환상적인 향입니다. 처음 맡았을 때 감동받아서 바로 구매했어요. 잔향도 오래가고, 어디서나 칭찬받는 향수입니다. 특별한 날에 뿌리면 하루종일 기분이 좋아져요.', '2024-01-15 09:30:00'),
  (3, 'jo-malone-english-pear', 4, '일상에서 쓰기 정말 좋은 향수예요. 너무 강하지 않고 은은하게 퍼져서 오피스에서도 부담없이 사용할 수 있어요. 배와 프리지아 향이 정말 청초해요.', '2024-01-10 14:20:00');

-- 찜 샘플 (인기 순위 확인용)
INSERT INTO favorites (user_id, perfume_id) VALUES
  (2, 'mfk-baccarat-rouge-540'),
  (2, 'le-labo-santal-33'),
  (3, 'mfk-baccarat-rouge-540'),
  (3, 'jo-malone-english-pear');

-- 중고 판매글 샘플
INSERT INTO market_posts (user_id, perfume_id, title, brand, category, volume_ml, remain_percent, price, content, status) VALUES
  (2, 'le-labo-santal-33', '르라보 상탈 33 50ml 잔량 80%', 'LE LABO', 'Woody', 50, 80, 150000, '작년 백화점 구매, 실내 보관했습니다. 박스 있어요.', '판매중'),
  (3, 'jo-malone-english-pear', '조말론 잉글리쉬 페어 30ml', 'JO MALONE', 'Floral', 30, 60, 45000, '선물받았는데 취향이 아니라 판매합니다.', '예약중'),
  (2, NULL, '바이레도 블랑쉬 미니어처 5ml', 'BYREDO', 'Musk', 5, 100, 25000, '미개봉 미니어처입니다.', '판매중');
