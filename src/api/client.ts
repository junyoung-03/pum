// 서버 API 호출 함수
// 개발 서버(vite)가 /api 요청을 http://localhost:4000 (server 폴더의 Express 서버)으로 넘겨줍니다. → vite.config.ts의 proxy
import { store, logout } from '../data/store';
import type { Pagination } from '../data/perfumeData';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface ApiResult<T> {
  data: T;
  pagination?: Pagination;
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export async function api<T>(path: string, method: Method = 'GET', body?: unknown): Promise<ApiResult<T>> {
  const token = store.getState().auth.token;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new ApiError(0, '서버에 연결할 수 없습니다. server 폴더에서 npm start로 서버를 켜 주세요.');
  }

  const json = await res.json().catch(() => null);
  if (!res.ok || !json || !json.success) {
    // 로그인 토큰이 만료·로그아웃된 경우 자동으로 로그아웃 처리
    if (res.status === 401 && token) store.dispatch(logout());
    const message =
      json?.message ||
      (res.status >= 500 || !json
        ? '서버에 연결할 수 없습니다. server 폴더에서 npm start로 서버를 켜 주세요.'
        : '요청을 처리하지 못했습니다.');
    throw new ApiError(res.status, message);
  }
  return { data: json.data as T, pagination: json.pagination };
}

// 화면에 보여줄 에러 문구
export const errorMessage = (err: unknown) =>
  err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';

// 쿼리스트링 만들기 (빈 값은 제외)
export function toQuery(params: Record<string, string | number | undefined | null>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  });
  const text = search.toString();
  return text ? `?${text}` : '';
}

// 날짜·가격 표시
export const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

export const formatPrice = (value: number) => `${value.toLocaleString('ko-KR')}원`;
