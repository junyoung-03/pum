import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { api, errorMessage } from '../api/client';
import { loginSuccess } from '../data/store';
import type { User } from '../data/perfumeData';
import { Button } from '../components/shared';

// 회원가입: POST /api/users/signup → 가입 후 바로 로그인(POST /api/users/login)
export default function SignupPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [passwordCheck, setPasswordCheck] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !nickname.trim() || !password) {
      setError('모든 항목을 입력해 주세요.');
      return;
    }
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    if (password !== passwordCheck) {
      setError('비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api<User>('/users/signup', 'POST', { email: email.trim(), password, nickname: nickname.trim() });
      const { data } = await api<{ token: string; user: User }>('/users/login', 'POST', {
        email: email.trim(),
        password
      });
      dispatch(loginSuccess(data));
      navigate('/', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="container">
        <form className="auth-card" onSubmit={handleSubmit}>
          <div className="section-title section-title-center">
            <h2>Join</h2>
            <p>회원가입하고 찜·리뷰·추천 기록·중고거래를 이용해 보세요</p>
          </div>

          <div className="form-group">
            <label htmlFor="email">이메일</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@scentique.com" />
          </div>
          <div className="form-group">
            <label htmlFor="nickname">닉네임</label>
            <input id="nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="2~20자" maxLength={20} />
          </div>
          <div className="form-group">
            <label htmlFor="password">비밀번호</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6자 이상" />
          </div>
          <div className="form-group">
            <label htmlFor="passwordCheck">비밀번호 확인</label>
            <input
              id="passwordCheck"
              type="password"
              value={passwordCheck}
              onChange={(e) => setPasswordCheck(e.target.value)}
              placeholder="비밀번호를 한 번 더 입력"
            />
          </div>

          {error && <p className="notice notice-error">{error}</p>}

          <Button type="submit" variant="primary" className="btn-block" disabled={loading}>
            {loading ? '가입 중...' : '회원가입'}
          </Button>

          <p className="auth-switch">
            이미 회원이신가요? <Link to="/login">로그인</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
