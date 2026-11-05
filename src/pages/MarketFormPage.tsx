import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { api, errorMessage } from '../api/client';
import type { RootState } from '../data/store';
import { CATEGORIES, MarketPost, Perfume } from '../data/perfumeData';
import { Button } from '../components/shared';
import LoginRequired from '../components/LoginRequired';

// 판매글 등록: POST /api/market, 수정: PUT /api/market/:id (본인만)
export default function MarketFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);

  const [perfumes, setPerfumes] = useState<Perfume[]>([]);
  const [title, setTitle] = useState('');
  const [perfumeId, setPerfumeId] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [volumeMl, setVolumeMl] = useState('50');
  const [remainPercent, setRemainPercent] = useState('80');
  const [price, setPrice] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [notOwner, setNotOwner] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api<Perfume[]>('/perfumes?limit=50')
      .then(({ data }) => setPerfumes(data))
      .catch(() => undefined);
  }, []);

  // 수정이면 기존 내용 불러오기
  useEffect(() => {
    if (!id || !user) return;
    api<MarketPost>(`/market/${id}`)
      .then(({ data }) => {
        if (data.seller.id !== user.id) {
          setNotOwner(true);
          return;
        }
        setTitle(data.title);
        setPerfumeId(data.perfumeId ?? '');
        setBrand(data.brand);
        setCategory(data.category ?? '');
        setVolumeMl(String(data.volumeMl));
        setRemainPercent(String(data.remainPercent));
        setPrice(String(data.price));
        setContent(data.content ?? '');
      })
      .catch((err) => setError(errorMessage(err)));
  }, [id, user]);

  if (!user) {
    return (
      <div className="page-section">
        <div className="container">
          <LoginRequired message="판매글을 올리려면 로그인이 필요합니다" />
        </div>
      </div>
    );
  }

  if (notOwner) {
    return (
      <div className="page-section">
        <div className="container">
          <div className="empty-state">
            <div className="empty-state-icon">!</div>
            <h3>본인이 작성한 판매글만 수정할 수 있습니다</h3>
            <button type="button" className="btn btn-secondary btn-medium" onClick={() => navigate(`/market/${id}`)}>
              판매글로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 컬렉션 향수를 고르면 브랜드·향 계열 자동 입력
  const selectPerfume = (value: string) => {
    setPerfumeId(value);
    const selected = perfumes.find((p) => p.id === value);
    if (selected) {
      setBrand(selected.brand);
      setCategory(selected.category);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError('제목을 입력해 주세요.');
    if (!brand.trim()) return setError('브랜드를 입력하거나 컬렉션 향수를 선택해 주세요.');
    if (!price) return setError('가격을 입력해 주세요.');

    const body = {
      title: title.trim(),
      perfumeId: perfumeId || null,
      brand: brand.trim(),
      category: category || null,
      volumeMl: Number(volumeMl),
      remainPercent: Number(remainPercent),
      price: Number(price),
      content: content.trim()
    };

    setSubmitting(true);
    setError('');
    try {
      const { data } = isEdit
        ? await api<MarketPost>(`/market/${id}`, 'PUT', body)
        : await api<MarketPost>('/market', 'POST', body);
      navigate(`/market/${data.id}`, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-section">
      <div className="container narrow-container">
        <div className="section-title section-title-center">
          <h2>{isEdit ? 'Edit Post' : 'Sell Your Perfume'}</h2>
          <p>{isEdit ? '판매글 내용을 수정합니다' : '안 쓰는 향수를 다른 회원에게 판매해 보세요'}</p>
        </div>

        <form className="panel" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">제목</label>
            <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="예: 르라보 상탈 33 50ml 잔량 80%" />
          </div>

          <div className="form-group">
            <label htmlFor="perfumeId">컬렉션 향수 연결 (선택)</label>
            <select id="perfumeId" value={perfumeId} onChange={(e) => selectPerfume(e.target.value)}>
              <option value="">연결 안 함 (직접 입력)</option>
              {perfumes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.brand} - {p.name}
                </option>
              ))}
            </select>
            <span className="form-help">고르면 브랜드와 향 계열이 자동으로 채워지고, 상세 화면에 향수 정보가 연결됩니다.</span>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="brand">브랜드</label>
              <input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} maxLength={50} placeholder="예: LE LABO" />
            </div>
            <div className="form-group">
              <label htmlFor="category">향 계열</label>
              <select id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">선택 안 함</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="volumeMl">용량 (ml)</label>
              <input id="volumeMl" type="number" min={1} max={1000} value={volumeMl} onChange={(e) => setVolumeMl(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="price">가격 (원)</label>
              <input id="price" type="number" min={0} step={1000} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="예: 150000" />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="remainPercent">남은 양: {remainPercent}%</label>
            <input
              id="remainPercent"
              type="range"
              min={1}
              max={100}
              value={remainPercent}
              onChange={(e) => setRemainPercent(e.target.value)}
              className="range-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="content">설명</label>
            <textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} maxLength={2000} placeholder="구매 시기, 보관 상태, 박스 유무 등을 적어 주세요" />
          </div>

          {error && <p className="notice notice-error">{error}</p>}

          <div className="inline-actions">
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? '저장 중...' : isEdit ? '수정 완료' : '판매글 등록'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
              취소
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
