import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <h3>SCENTIQUE</h3>
          <p>Find Your Signature Scent</p>
          <p className="footer-description">
            당신의 분위기를 완성하는 프리미엄 향수 큐레이션 서비스
          </p>
        </div>
        <div className="footer-links">
          <div className="footer-column">
            <h4>Service</h4>
            <Link to="/recommend">향수 추천</Link>
            <Link to="/list">컬렉션</Link>
            <Link to="/review">리뷰</Link>
          </div>
          <div className="footer-column">
            <h4>Support</h4>
            <Link to="/">고객센터</Link>
            <Link to="/">이용약관</Link>
            <Link to="/">개인정보처리방침</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2024 SCENTIQUE. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
