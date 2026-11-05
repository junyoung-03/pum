// 공통 응답 형식과 에러 처리 도우미

// 라우터에서 throw new HttpError(400, '메시지') 하면 에러 핸들러가 JSON으로 응답
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// async 라우트 핸들러의 에러를 Express 에러 핸들러로 넘겨주는 래퍼
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// 성공 응답: { success: true, data, ...extra }
const ok = (res, data, status = 200, extra = {}) =>
  res.status(status).json({ success: true, data, ...extra });

// 쿼리스트링 page, limit 검사
function parsePaging(query, defaultLimit = 10, maxLimit = 50) {
  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? defaultLimit : Number(query.limit);
  if (!Number.isInteger(page) || page < 1) throw new HttpError(400, 'page는 1 이상의 정수여야 합니다.');
  if (!Number.isInteger(limit) || limit < 1 || limit > maxLimit) {
    throw new HttpError(400, `limit은 1~${maxLimit} 사이의 정수여야 합니다.`);
  }
  return { page, limit, offset: (page - 1) * limit };
}

const pagination = (page, limit, total) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});

// 정수 검사 도우미 (범위 밖이면 400)
function toInt(value, name, { min = -Infinity, max = Infinity } = {}) {
  const n = Number(value);
  if (value === '' || value === null || !Number.isInteger(n) || n < min || n > max) {
    const range = [min !== -Infinity ? `${min} 이상` : '', max !== Infinity ? `${max} 이하` : '']
      .filter(Boolean)
      .join(' ');
    throw new HttpError(400, `${name}은(는) ${range ? range + '의 ' : ''}정수여야 합니다.`);
  }
  return n;
}

// 문자열 필수 값 검사
function requireText(value, name, maxLength = 255) {
  if (typeof value !== 'string' || value.trim() === '') throw new HttpError(400, `${name}을(를) 입력해 주세요.`);
  if (value.trim().length > maxLength) throw new HttpError(400, `${name}은(는) ${maxLength}자 이하로 입력해 주세요.`);
  return value.trim();
}

module.exports = { HttpError, asyncHandler, ok, parsePaging, pagination, toInt, requireText };
