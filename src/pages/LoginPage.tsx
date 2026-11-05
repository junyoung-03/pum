import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { api, errorMessage } from '../api/client';
import { loginSuccess } from '../data/store';
import type { User } from '../data/perfumeData';
import { Button } from '../components/shared';

// 로그인: POST /api/users/login
export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { from?: string; message?: string } | null;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('이메일과 비밀번호를 입력해 주세요.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await api<{ token: string; user: User }>('/users/login', 'POST', {
        email: email.trim(),
        password
      });
      dispatch(loginSuccess(data));
      navigate(state?.from && state.from !== '/login' ? state.from : '/', { replace: true });
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
            <h2>Login</h2>
            <p>SCENTIQUE에 오신 것을 환영합니다</p>
          </div>

          {state?.message && <p className="notice notice-info">{state.message}</p>}

          <div className="form-group">
            <label htmlFor="email">이메일</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@scentique.com"
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">비밀번호</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              autoComplete="current-password"
            />
          </div>

          {error && <p className="notice notice-error">{error}</p>}

          <Button type="submit" variant="primary" className="btn-block" disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </Button>

          <p className="auth-switch">
            아직 회원이 아니신가요? <Link to="/signup">회원가입</Link>
          </p>

          <div className="auth-hint">
            <p>시연용 테스트 계정</p>
            <ul>
              <li>회원: lover@scentique.com / user1234</li>
              <li>회원: daily@scentique.com / user1234</li>
              <li>관리자: admin@scentique.com / admin1234</li>
            </ul>
          </div>
        </form>
      </div>
    </div>
  );
}
