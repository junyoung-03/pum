import { FormEvent, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { api, errorMessage } from '../api/client';
import type { RootState } from '../data/store';
import {
  CATEGORIES,
  MOODS,
  PRICE_LEVELS,
  PURPOSES,
  SEASONS,
  Category,
  Mood,
  Order,
  Perfume,
  PriceLevel,
  Purpose,
  Season
} from '../data/perfumeData';
import { Button } from '../components/shared';
import LoginRequired from '../components/LoginRequired';
import AdminOrdersPanel, { AdminOrderTab, countPending } from './AdminOrdersPanel';

interface FormState {
  id: string;
  name: string;
  brand: string;
  category: Category;
  price: PriceLevel;
  noteFamily: string;
  mood: Mood[];
  season: Season[];
  purpose: Purpose[];
  moodTags: string;
  topNote: string;
  middleNote: string;
  baseNote: string;
  shortCopy: string;
  highlight: string;
  description: string;
  image: string;
  color: string;
  featured: boolean;
  featuredOrder: string;
}

const emptyForm: FormState = {
  id: '',
  name: '',
  brand: '',
  category: 'Floral',
  price: 'Premium',
  noteFamily: '',
  mood: [],
  season: [],
  purpose: [],
  moodTags: '',
  topNote: '',
  middleNote: '',
  baseNote: '',
  shortCopy: '',
  highlight: '',
  description: '',
  image: '',
  color: '#F5EFE7',
  featured: false,
  featuredOrder: ''
};

const toForm = (p: Perfume): FormState => ({
  id: p.id,
  name: p.name,
  brand: p.brand,
  category: p.category,
  price: p.price,
  noteFamily: p.noteFamily,
  mood: p.mood,
  season: p.season,
  purpose: p.purpose,
  moodTags: p.moodTags.join(', '),
  topNote: p.topNote.join(', '),
  middleNote: p.middleNote.join(', '),
  baseNote: p.baseNote.join(', '),
  shortCopy: p.shortCopy,
  highlight: p.highlight,
  description: p.description ?? '',
  image: p.image,
  color: p.color,
  featured: Boolean(p.featured),
  featuredOrder: p.featuredOrder ? String(p.featuredOrder) : ''
});

const splitList = (text: string) =>
  text
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

function toggleValue<T>(list: T[], value: T) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

type AdminTab = 'perfume' | AdminOrderTab;

const ADMIN_TABS: { key: AdminTab; label: string }[] = [
  { key: 'perfume', label: '향수 관리' },
  { key: 'receive', label: '물품 인수' },
  { key: 'deliver', label: '물품 인계' }
];

const TAB_DESCRIPTION: Record<AdminTab, string> = {
  perfume: '컬렉션 향수 등록·수정·삭제 (관리자 전용)',
  receive: '판매자가 보낸 물품과 구매자의 대금을 받았는지 확인합니다',
  deliver: '인수가 끝난 물품을 구매자의 배송 정보로 보냅니다'
};

// 관리자 페이지
// - 향수 관리: POST /api/perfumes, PUT /api/perfumes/:id, DELETE /api/perfumes/:id
// - 물품 인수·물품 인계: AdminOrdersPanel (/api/orders)
export default function AdminPerfumePage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab: AdminTab = tabParam === 'receive' || tabParam === 'deliver' ? tabParam : 'perfume';
  const [pending, setPending] = useState<Record<AdminOrderTab, number>>({ receive: 0, deliver: 0 });
  const [perfumes, setPerfumes] = useState<Perfume[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'info' | 'error'; text: string } | null>(null);

  const load = () =>
    api<Perfume[]>('/perfumes?limit=50')
      .then(({ data }) => setPerfumes(data))
      .catch((err) => setMessage({ type: 'error', text: errorMessage(err) }));

  useEffect(() => {
    if (user?.role === 'admin') load();
  }, [user]);

  // 탭에 처리 대기 건수 표시
  useEffect(() => {
    if (user?.role !== 'admin') return;
    api<Order[]>('/orders')
      .then(({ data }) => setPending(countPending(data)))
      .catch(() => undefined);
  }, [user]);

  if (!user) {
    return (
      <div className="page-section">
        <div className="container">
          <LoginRequired message="관리자 로그인이 필요합니다" />
        </div>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="page-section">
        <div className="container">
          <div className="empty-state">
            <div className="empty-state-icon">🔒</div>
            <h3>관리자만 사용할 수 있는 페이지입니다</h3>
            <Link to="/" className="btn btn-secondary btn-medium">
              홈으로
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const startEdit = (p: Perfume) => {
    setEditingId(p.id);
    setForm(toForm(p));
    setMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const body = {
      name: form.name.trim(),
      brand: form.brand.trim(),
      category: form.category,
      price: form.price,
      noteFamily: form.noteFamily.trim(),
      mood: form.mood,
      season: form.season,
      purpose: form.purpose,
      moodTags: splitList(form.moodTags),
      topNote: splitList(form.topNote),
      middleNote: splitList(form.middleNote),
      baseNote: splitList(form.baseNote),
      shortCopy: form.shortCopy.trim(),
      highlight: form.highlight.trim(),
      description: form.description.trim(),
      image: form.image.trim(),
      color: form.color,
      featured: form.featured,
      featuredOrder: form.featured && form.featuredOrder ? Number(form.featuredOrder) : null
    };
    try {
      if (editingId) {
        await api<Perfume>(`/perfumes/${editingId}`, 'PUT', body);
        setMessage({ type: 'info', text: `${body.brand} ${body.name} 정보를 수정했습니다.` });
      } else {
        await api<Perfume>('/perfumes', 'POST', { id: form.id.trim(), ...body });
        setMessage({ type: 'info', text: `${body.brand} ${body.name}을(를) 등록했습니다.` });
      }
      cancelEdit();
      load();
    } catch (err) {
      setMessage({ type: 'error', text: errorMessage(err) });
    }
  };

  const handleDelete = async (p: Perfume) => {
    if (!window.confirm(`${p.brand} ${p.name}을(를) 삭제할까요? 관련 리뷰와 찜도 함께 삭제됩니다.`)) return;
    try {
      await api(`/perfumes/${p.id}`, 'DELETE');
      setMessage({ type: 'info', text: `${p.brand} ${p.name}을(를) 삭제했습니다.` });
      if (editingId === p.id) cancelEdit();
      load();
    } catch (err) {
      setMessage({ type: 'error', text: errorMessage(err) });
    }
  };

  return (
    <div className="page-section">
      <div className="container">
        <div className="section-title section-title-center">
          <h2>Admin</h2>
          <p>{TAB_DESCRIPTION[tab]}</p>
        </div>

        <div className="admin-tabs">
          <div className="sort-toggle" role="tablist" aria-label="관리자 메뉴">
            {ADMIN_TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                className={tab === t.key ? 'active' : ''}
                onClick={() => setSearchParams(t.key === 'perfume' ? {} : { tab: t.key })}
              >
                {t.label}
                {t.key !== 'perfume' && pending[t.key] > 0 && <span className="tab-count">{pending[t.key]}</span>}
              </button>
            ))}
          </div>
        </div>

        {tab !== 'perfume' && <AdminOrdersPanel key={tab} tab={tab} onCountChange={setPending} />}

        {tab === 'perfume' && message && <p className={`notice notice-${message.type}`}>{message.text}</p>}

        {tab === 'perfume' && (
        <div className="admin-layout">
          <form className="panel admin-form" onSubmit={handleSubmit}>
            <h3 className="panel-title">{editingId ? `향수 수정: ${editingId}` : '새 향수 등록'}</h3>

            <div className="form-grid">
              <div className="form-group">
                <label>향수 id (영문 소문자·숫자·-)</label>
                <input value={form.id} onChange={(e) => set('id', e.target.value)} disabled={Boolean(editingId)} placeholder="예: chanel-no5" required />
              </div>
              <div className="form-group">
                <label>이름</label>
                <input value={form.name} onChange={(e) => set('name', e.target.value)} required />
              </div>
              <div className="form-group">
                <label>브랜드</label>
                <input value={form.brand} onChange={(e) => set('brand', e.target.value)} required />
              </div>
              <div className="form-group">
                <label>향 계열 표기</label>
                <input value={form.noteFamily} onChange={(e) => set('noteFamily', e.target.value)} placeholder="예: 플로럴 / 프루티" />
              </div>
              <div className="form-group">
                <label>카테고리</label>
                <select value={form.category} onChange={(e) => set('category', e.target.value as Category)}>
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>가격대</label>
                <select value={form.price} onChange={(e) => set('price', e.target.value as PriceLevel)}>
                  {PRICE_LEVELS.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>무드</label>
              <div className="check-group">
                {MOODS.map((m) => (
                  <label key={m} className={form.mood.includes(m) ? 'checked' : ''}>
                    <input type="checkbox" checked={form.mood.includes(m)} onChange={() => set('mood', toggleValue(form.mood, m))} />
                    {m}
                  </label>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>계절</label>
              <div className="check-group">
                {SEASONS.map((s) => (
                  <label key={s} className={form.season.includes(s) ? 'checked' : ''}>
                    <input type="checkbox" checked={form.season.includes(s)} onChange={() => set('season', toggleValue(form.season, s))} />
                    {s}
                  </label>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>추천 상황</label>
              <div className="check-group">
                {PURPOSES.map((p) => (
                  <label key={p} className={form.purpose.includes(p) ? 'checked' : ''}>
                    <input type="checkbox" checked={form.purpose.includes(p)} onChange={() => set('purpose', toggleValue(form.purpose, p))} />
                    {p}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>무드 태그 (쉼표로 구분)</label>
                <input value={form.moodTags} onChange={(e) => set('moodTags', e.target.value)} placeholder="로맨틱, 데일리" />
              </div>
              <div className="form-group">
                <label>탑 노트</label>
                <input value={form.topNote} onChange={(e) => set('topNote', e.target.value)} placeholder="자몽, 베르가못" />
              </div>
              <div className="form-group">
                <label>미들 노트</label>
                <input value={form.middleNote} onChange={(e) => set('middleNote', e.target.value)} />
              </div>
              <div className="form-group">
                <label>베이스 노트</label>
                <input value={form.baseNote} onChange={(e) => set('baseNote', e.target.value)} />
              </div>
              <div className="form-group">
                <label>이미지 경로</label>
                <input value={form.image} onChange={(e) => set('image', e.target.value)} placeholder="/images/perfumes/파일명.png" />
              </div>
              <div className="form-group">
                <label>대표 색상</label>
                <input type="color" value={form.color} onChange={(e) => set('color', e.target.value)} className="color-input" />
              </div>
            </div>

            <div className="form-group">
              <label>한 줄 소개</label>
              <input value={form.shortCopy} onChange={(e) => set('shortCopy', e.target.value)} />
            </div>
            <div className="form-group">
              <label>하이라이트</label>
              <input value={form.highlight} onChange={(e) => set('highlight', e.target.value)} />
            </div>
            <div className="form-group">
              <label>설명</label>
              <textarea value={form.description} onChange={(e) => set('description', e.target.value)} />
            </div>

            <div className="form-group featured-row">
              <label className="inline-check">
                <input type="checkbox" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} />
                대표 향수(Best Collection)로 노출
              </label>
              {form.featured && (
                <input
                  type="number"
                  min={1}
                  value={form.featuredOrder}
                  onChange={(e) => set('featuredOrder', e.target.value)}
                  placeholder="노출 순서"
                  className="order-input"
                />
              )}
            </div>

            <div className="inline-actions">
              <Button type="submit" variant="primary">
                {editingId ? '수정 저장' : '향수 등록'}
              </Button>
              {editingId && (
                <Button type="button" variant="ghost" onClick={cancelEdit}>
                  취소
                </Button>
              )}
            </div>
          </form>

          <div className="panel">
            <h3 className="panel-title">등록된 향수 {perfumes.length}개</h3>
            <ul className="admin-list">
              {perfumes.map((p) => (
                <li key={p.id} className={editingId === p.id ? 'editing' : ''}>
                  <div>
                    <p className="admin-item-name">
                      {p.brand} {p.name} {p.featured && <span className="admin-featured">대표 {p.featuredOrder}</span>}
                    </p>
                    <p className="admin-item-id">
                      {p.id} · {p.category}
                    </p>
                  </div>
                  <div className="admin-item-actions">
                    <button type="button" onClick={() => startEdit(p)}>
                      수정
                    </button>
                    <button type="button" onClick={() => handleDelete(p)}>
                      삭제
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
