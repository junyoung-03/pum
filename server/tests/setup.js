// 모든 테스트 파일 공통 설정
// - 테스트 파일마다 시작 전에 테스트용 DB(DB_NAME_TEST)를 초기 데이터로 되돌림
// - 끝나면 커넥션 풀을 닫아 Jest가 정상 종료되게 함
const initDb = require('../db/init');
const pool = require('../db/pool');

beforeAll(async () => {
  await initDb({ silent: true });
});

afterAll(async () => {
  await pool.end();
});
