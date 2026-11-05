import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { api, errorMessage, formatDate } from '../api/client';
import { logout, setUser } from '../data/store';
import type { RootState } from '../data/store';
import type { User } from '../data/perfumeData';
import { Button } from '../components/shared';
import LoginRequired from '../components/LoginRequired';

// 내 정보: GET /api/users/me, PUT /api/users/me, DELETE /api/users/me
export default function MyPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const favoriteCount = useSelector((state: RootState) => state.favorite.ids.length);

  const [nickname, setNickname] = useState(user?.nickname ?? '');
  const [password, setPassword] = useState('');
  const [passwordCheck, setPasswordCheck] = useState('');
  const [message, setMessage] = useState<{ type: 'info' | 'error'; text: string } | null>(null);

  if (!user) {
    return (
      <div className="page-section">
        <div className="container">
          <LoginRequired />
        </div>
      </div>
    );
  }

  const handleNickname = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await api<User>('/users/me', 'PUT', { nickname: nickname.trim() });
      dispatch(setUser(data));
      setMessage({ type: 'info', text: '닉네임이 변경되었습니다.' });
    } catch (err) {
      setMessage({ type: 'error', text: errorMessage(err) });
    }
  };

  const handlePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setMessage({ type: 'error', text: '비밀번호는 6자 이상이어야 합니다.' });
      return;
    }
    if (password !== passwordCheck) {
      setMessage({ type: 'error', text: '비밀번호 확인이 일치하지 않습니다.' });
      return;
    }
    try {
      await api<User>('/users/me', 'PUT', { password });
      setPassword('');
      setPasswordCheck('');
      setMessage({ type: 'info', text: '비밀번호가 변경되었습니다.' });
    } catch (err) {
      setMessage({ type: 'error', text: errorMessage(err) });
    }
  };

  const handleWithdraw = async () => {
    if (!window.confirm('정말 탈퇴하시겠어요? 작성한 리뷰·찜·판매글이 모두 삭제됩니다.')) return;
    try {
      await api('/users/me', 'DELETE');
      dispatch(logout());
      navigate('/', { replace: true });
    } catch (err) {
      setMessage({ type: 'error', text: errorMessage(err) });
    }
  };

  return (
    <div className="page-section">
      <div className="container">
        <div className="section-title section-title-center">
          <h2>My Page</h2>
          <p>내 정보와 활동을 관리하세요</p>
        </div>

        <div className="mypage-layout">
          <div className="panel">
            <h3 className="panel-title">내 정보</h3>
            <dl className="info-list">
              <dt>이메일</dt>
              <dd>{user.email}</dd>
              <dt>닉네임</dt>
              <dd>{user.nickname}</dd>
              <dt>회원 구분</dt>
              <dd>{user.role === 'admin' ? '관리자' : '일반 회원'}</dd>
              {user.createdAt && (
                <>
                  <dt>가입일</dt>
                  <dd>{formatDate(user.createdAt)}</dd>
                </>
              )}
            </dl>

            <div className="quick-links">
              <Link to="/cart">찜한 향수 {favoriteCount}개</Link>
              <Link to="/recommend/history">내 추천 기록</Link>
              <Link to="/market?mine=1">내 판매글</Link>
              <Link to="/review">리뷰 보러가기</Link>
            </div>
          </div>

          <div className="panel">
            {message && <p className={`notice notice-${message.type}`}>{message.text}</p>}

            <form onSubmit={handleNickname}>
              <h3 className="panel-title">닉네임 변경</h3>
              <div className="form-group">
                <input value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={20} />
              </div>
              <Button type="submit" variant="secondary" size="small">
                닉네임 저장
              </Button>
            </form>

            <form onSubmit={handlePassword} className="panel-block">
              <h3 className="panel-title">비밀번호 변경</h3>
              <div className="form-group">
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="새 비밀번호 (6자 이상)" />
              </div>
              <div className="form-group">
                <input
                  type="password"
                  value={passwordCheck}
                  onChange={(e) => setPasswordCheck(e.target.value)}
                  placeholder="새 비밀번호 확인"
                />
              </div>
              <Button type="submit" variant="secondary" size="small">
                비밀번호 저장
              </Button>
            </form>

            <div className="panel-block danger-zone">
              <h3 className="panel-title">회원 탈퇴</h3>
              <p>탈퇴하면 작성한 리뷰, 찜, 판매글이 모두 삭제됩니다.</p>
              <button type="button" className="btn btn-small btn-danger" onClick={handleWithdraw}>
                회원 탈퇴
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
