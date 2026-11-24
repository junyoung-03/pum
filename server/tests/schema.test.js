// 모델 정의(models/)와 실제 테이블(db/schema.sql)의 외래키·중복 제약이 같은지 확인
// 테스트용 DB에서 schema.sql로 만든 제약과 sequelize.sync()로 만든 제약을 비교합니다.
const initDb = require('../db/init');
const { sequelize, Sequelize, Review, MarketPost } = require('../models');

const select = (sql) => sequelize.query(sql, { type: Sequelize.QueryTypes.SELECT });

// 외래키: 테이블.컬럼 → 참조 테이블.컬럼, 삭제·수정 규칙
const foreignKeys = () =>
  select(`
    SELECT k.TABLE_NAME AS tableName, k.COLUMN_NAME AS columnName,
           k.REFERENCED_TABLE_NAME AS refTable, k.REFERENCED_COLUMN_NAME AS refColumn,
           r.DELETE_RULE AS onDelete, r.UPDATE_RULE AS onUpdate
    FROM information_schema.KEY_COLUMN_USAGE k
    JOIN information_schema.REFERENTIAL_CONSTRAINTS r
      ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
    WHERE k.TABLE_SCHEMA = DATABASE() AND k.REFERENCED_TABLE_NAME IS NOT NULL
    ORDER BY tableName, columnName`);

// 기본키와 중복(UNIQUE) 제약
const uniqueKeys = () =>
  select(`
    SELECT TABLE_NAME AS tableName, INDEX_NAME AS indexName,
           GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columnNames
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND NON_UNIQUE = 0
    GROUP BY TABLE_NAME, INDEX_NAME
    ORDER BY tableName, indexName`);

// 컬럼 자료형과 NULL 허용 여부
const columns = () =>
  select(`
    SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName, COLUMN_TYPE AS columnType, IS_NULLABLE AS nullable
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    ORDER BY tableName, columnName`);

const readConstraints = async () => ({
  foreignKeys: await foreignKeys(),
  uniqueKeys: await uniqueKeys(),
  columns: await columns(),
});

describe('모델과 schema.sql 일치', () => {
  let bySchema;
  let byModels;

  beforeAll(async () => {
    bySchema = await readConstraints();
    await sequelize.sync({ force: true });
    byModels = await readConstraints();
    await initDb({ silent: true });
  });

  test('외래키 (참조 대상, ON DELETE, ON UPDATE)', () => {
    expect(bySchema.foreignKeys).toHaveLength(10);
    expect(byModels.foreignKeys).toEqual(bySchema.foreignKeys);
  });

  test('중복 제약 (PRIMARY KEY, UNIQUE)', () => {
    expect(byModels.uniqueKeys).toEqual(bySchema.uniqueKeys);
  });

  test('컬럼 자료형과 NULL 허용 여부', () => {
    expect(byModels.columns).toEqual(bySchema.columns);
  });
});

test('CHECK 제약 범위는 모델 validate에서도 거부된다', async () => {
  const post = { userId: 2, title: '테스트', brand: 'TEST', volumeMl: 30, remainPercent: 50, price: 1000 };
  const invalid = { name: 'SequelizeValidationError' };
  await expect(Review.create({ userId: 2, perfumeId: 'tom-ford-oud-wood', rating: 6, content: '테스트' })).rejects.toMatchObject(invalid);
  await expect(MarketPost.create({ ...post, volumeMl: 0 })).rejects.toMatchObject(invalid);
  await expect(MarketPost.create({ ...post, remainPercent: 101 })).rejects.toMatchObject(invalid);
  await expect(MarketPost.create({ ...post, price: -1 })).rejects.toMatchObject(invalid);
});
