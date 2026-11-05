// DB의 perfumes 행(row)을 프론트의 Perfume 형태(camelCase)로 바꾸는 함수

// MySQL은 JSON 컬럼을 배열로 돌려주지만, MariaDB는 문자열로 돌려주므로 둘 다 처리
function parseJson(value, fallback = []) {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toPerfume(row) {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    category: row.category,
    noteFamily: row.note_family,
    mood: parseJson(row.mood),
    moodTags: parseJson(row.mood_tags),
    season: parseJson(row.season),
    purpose: parseJson(row.purpose),
    price: row.price_level,
    description: row.description,
    highlight: row.highlight,
    topNote: parseJson(row.top_note),
    middleNote: parseJson(row.middle_note),
    baseNote: parseJson(row.base_note),
    image: row.image,
    color: row.color,
    shortCopy: row.short_copy,
    featured: Boolean(row.is_featured),
    featuredOrder: row.featured_order,
  };
}

// 목록·카드용 요약 정보
const toPerfumeSummary = (row) => ({
  id: row.id,
  brand: row.brand,
  name: row.name,
  image: row.image,
});

module.exports = { parseJson, toPerfume, toPerfumeSummary };
