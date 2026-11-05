import { useLocation, useNavigate } from 'react-router-dom';

// 로그인이 필요한 화면에서 비로그인 상태일 때 보여주는 안내
export default function LoginRequired({ message = '로그인이 필요한 페이지입니다.' }: { message?: string }) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="empty-state">
      <div className="empty-state-icon">🔒</div>
      <h3>{message}</h3>
      <p>로그인하면 이용할 수 있어요.</p>
      <div className="inline-actions">
        <button
          type="button"
          className="btn btn-primary btn-medium"
          onClick={() => navigate('/login', { state: { from: location.pathname } })}
        >
          로그인
        </button>
        <button type="button" className="btn btn-secondary btn-medium" onClick={() => navigate('/signup')}>
          회원가입
        </button>
      </div>
    </div>
  );
}
