import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { api, errorMessage, formatDate, formatPrice, toQuery } from '../api/client';
import type { RootState } from '../data/store';
import { CATEGORIES, MARKET_STATUS, MarketPost, Perfume } from '../data/perfumeData';
import { Button } from '../components/shared';

type Sort = 'latest' | 'priceAsc' | 'priceDesc';

export const statusClass = (status: string) =>
  status === '판매중' ? 'status-on' : status === '예약중' ? 'status-reserved' : 'status-sold';

// 중고거래 목록
//   GET /api/market?brand=&category=&status=&minPrice=&maxPrice=&sort=&page=
//   GET /api/market/my  (내 판매글만 보기)
export default function MarketListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isLoggedIn = useSelector((state: RootState) => Boolean(state.auth.token));

  const mine = searchParams.get('mine') === '1' && isLoggedIn;
  const [brand, setBrand] = useState(searchParams.get('brand') ?? '');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [priceFilter, setPriceFilter] = useState({ min: '', max: '' });
  const [sort, setSort] = useState<Sort>('latest');
  const [page, setPage] = useState(1);

  const [brands, setBrands] = useState<string[]>([]);
  const [posts, setPosts] = useState<MarketPost[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 브랜드 선택지는 컬렉션 향수의 브랜드 목록
  useEffect(() => {
    api<Perfume[]>('/perfumes?limit=50')
      .then(({ data }) => setBrands([...new Set(data.map((p) => p.brand))].sort()))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    setLoading(true);
    const path = mine
      ? '/market/my'
      : `/market${toQuery({
          brand,
          category,
          status,
          minPrice: priceFilter.min,
          maxPrice: priceFilter.max,
          sort,
          page,
          limit: 9
        })}`;
    api<MarketPost[]>(path)
      .then(({ data, pagination }) => {
        setPosts((prev) => (page === 1 || mine ? data : [...prev, ...data]));
        setTotal(pagination?.total ?? data.length);
        setTotalPages(pagination?.totalPages ?? 1);
        setError('');
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [mine, brand, category, status, priceFilter, sort, page]);

  // 필터를 바꾸면 1페이지부터 다시
  const change = <T,>(setter: (v: T) => void) => (value: T) => {
    setPage(1);
    setter(value);
  };

  const applyPrice = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
    setPriceFilter({ min: minPrice, max: maxPrice });
  };

  const resetFilters = () => {
    setPage(1);
    setBrand('');
    setCategory('');
    setStatus('');
    setMinPrice('');
    setMaxPrice('');
    setPriceFilter({ min: '', max: '' });
    setSort('latest');
    setSearchParams({});
  };

  const toggleMine = () => {
    setPage(1);
    setSearchParams(mine ? {} : { mine: '1' });
  };

  return (
    <div className="page-section market-page">
      <div className="container">
        <div className="section-title section-title-center">
          <h2>Market</h2>
          <p>회원끼리 사고파는 향수 중고거래</p>
        </div>

        <div className="market-toolbar">
          <div className="sort-toggle">
            <button type="button" className={!mine ? 'active' : ''} onClick={() => mine && toggleMine()}>
              전체 판매글
            </button>
            {isLoggedIn && (
              <button type="button" className={mine ? 'active' : ''} onClick={() => !mine && toggleMine()}>
                내 판매글
              </button>
            )}
          </div>
          <Button
            variant="primary"
            size="small"
            onClick={() =>
              isLoggedIn
                ? navigate('/market/new')
                : navigate('/login', { state: { from: '/market/new', message: '판매글을 올리려면 로그인이 필요합니다.' } })
            }
          >
            + 판매글 등록
          </Button>
        </div>

        {!mine && (
          <div className="collection-filters market-filters">
            <div className="filter-row">
              <label>
                브랜드
                <select value={brand} onChange={(e) => change(setBrand)(e.target.value)}>
                  <option value="">전체</option>
                  {brands.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                정렬
                <select value={sort} onChange={(e) => change(setSort)(e.target.value as Sort)}>
                  <option value="latest">최신순</option>
                  <option value="priceAsc">낮은 가격순</option>
                  <option value="priceDesc">높은 가격순</option>
                </select>
              </label>
              <form className="price-filter" onSubmit={applyPrice}>
                <span>가격</span>
                <input type="number" min={0} placeholder="최소" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
                <span>~</span>
                <input type="number" min={0} placeholder="최대" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
                <button type="submit" className="filter-btn">
                  적용
                </button>
              </form>
            </div>

            <div className="filter-group">
              <label>향 계열</label>
              <div className="filter-buttons">
                {['', ...CATEGORIES].map((c) => (
                  <button key={c || 'all'} className={`filter-btn ${category === c ? 'active' : ''}`} onClick={() => change(setCategory)(c)}>
                    {c || 'All'}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <label>거래 상태</label>
              <div className="filter-buttons">
                {['', ...MARKET_STATUS].map((s) => (
                  <button key={s || 'all'} className={`filter-btn ${status === s ? 'active' : ''}`} onClick={() => change(setStatus)(s)}>
                    {s || '전체'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {error && <p className="notice notice-error">{error}</p>}

        <p className="results-count">
          총 <strong>{total}</strong>개의 판매글 {loading && <span className="loading-text">불러오는 중...</span>}
        </p>

        {posts.length > 0 ? (
          <div className="market-grid">
            {posts.map((post) => (
              <Link key={post.id} to={`/market/${post.id}`} className="market-card">
                <div className="market-card-top">
                  <span className={`status-badge ${statusClass(post.status)}`}>{post.status}</span>
                  <span className="market-date">{formatDate(post.createdAt)}</span>
                </div>
                <p className="market-brand">
                  {post.brand}
                  {post.category && ` · ${post.category}`}
                </p>
                <h3 className="market-title">{post.title}</h3>
                <div className="market-specs">
                  <span>{post.volumeMl}ml</span>
                  <span>잔량 {post.remainPercent}%</span>
                </div>
                <div className="remain-bar">
                  <div className="remain-bar-fill" style={{ width: `${post.remainPercent}%` }} />
                </div>
                <div className="market-card-bottom">
                  <strong className="market-price">{formatPrice(post.price)}</strong>
                  <span className="market-seller">{post.seller.nickname}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          !loading &&
          !error && (
            <div className="empty-state">
              <div className="empty-state-icon">🧴</div>
              <h3>{mine ? '아직 올린 판매글이 없습니다' : '조건에 맞는 판매글이 없습니다'}</h3>
              <p>{mine ? '안 쓰는 향수를 판매해 보세요.' : '다른 조건으로 찾아보세요.'}</p>
              {!mine && (
                <button type="button" className="btn btn-secondary btn-medium" onClick={resetFilters}>
                  필터 초기화
                </button>
              )}
            </div>
          )
        )}

        {!mine && page < totalPages && (
          <div className="load-more">
            <Button variant="secondary" size="small" onClick={() => setPage((p) => p + 1)}>
              더 보기
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
