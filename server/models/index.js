// .env를 먼저 읽어야 아래의 DB_* 환경변수가 적용됨 (config.js에서 dotenv 실행)
require('../config');

const Sequelize = require('sequelize');
const User = require('./user');
const Perfume = require('./perfume');
const Review = require('./review');
const Favorite = require('./favorite');
const MarketPost = require('./marketPost');
const Order = require('./order');
const Payment = require('./payment');
const RecommendQuestion = require('./recommendQuestion');
const RecommendHistory = require('./recommendHistory');
const RevokedToken = require('./revokedToken');

const env = process.env.NODE_ENV || 'development';
let config = require('../config/config.json')[env] || require('../config/config.json').development;

// .env 환경변수 오버라이드 지원
if (process.env.DB_HOST) config = { ...config, host: process.env.DB_HOST };
if (process.env.DB_PORT) config = { ...config, port: Number(process.env.DB_PORT) };
if (process.env.DB_USER) config = { ...config, username: process.env.DB_USER };
if (process.env.DB_PASSWORD !== undefined) config = { ...config, password: process.env.DB_PASSWORD };
if (env === 'test' && process.env.DB_NAME_TEST) config = { ...config, database: process.env.DB_NAME_TEST };
else if (process.env.DB_NAME) config = { ...config, database: process.env.DB_NAME };

const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  config
);

const db = {
  sequelize,
  Sequelize,
  User,
  Perfume,
  Review,
  Favorite,
  MarketPost,
  Order,
  Payment,
  RecommendQuestion,
  RecommendHistory,
  RevokedToken,
};

User.init(sequelize);
Perfume.init(sequelize);
Review.init(sequelize);
Favorite.init(sequelize);
MarketPost.init(sequelize);
Order.init(sequelize);
Payment.init(sequelize);
RecommendQuestion.init(sequelize);
RecommendHistory.init(sequelize);
RevokedToken.init(sequelize);

User.associate(db);
Perfume.associate(db);
Review.associate(db);
Favorite.associate(db);
MarketPost.associate(db);
Order.associate(db);
Payment.associate(db);
RecommendQuestion.associate(db);
RecommendHistory.associate(db);
RevokedToken.associate(db);

module.exports = db;
