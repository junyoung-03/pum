const Sequelize = require('sequelize');
const { HttpError } = require('../utils/http');
const bcrypt = require('bcryptjs');


module.exports = class User extends Sequelize.Model {
  static init(sequelize) {
    return super.init(
      {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        email: {
          type: Sequelize.STRING(100),
          allowNull: false,
          unique: true,
        },
        password: {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        nickname: {
          type: Sequelize.STRING(30),
          allowNull: false,
          unique: true,
        },
        role: {
          type: Sequelize.ENUM('user', 'admin'),
          allowNull: false,
          defaultValue: 'user',
        },
      },
      {
        sequelize,
        timestamps: true,
        underscored: true,
        modelName: 'User',
        tableName: 'users',
        paranoid: false,
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
      }
    );
  }

  toJSON() {
    const data = super.toJSON();
    delete data.password;
    delete data.updatedAt;
    return data;
  }

  static async register({ email, password, nickname }) {
    if (await this.findOne({ where: { email } })) throw new HttpError(409, '이미 가입된 이메일입니다.');
    if (await this.findOne({ where: { nickname } })) throw new HttpError(409, '이미 사용 중인 닉네임입니다.');
    return this.create({ email, nickname, password: await bcrypt.hash(password, 10) });
  }

  static async authenticate(email, password) {
    const user = await this.findOne({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new HttpError(401, '이메일 또는 비밀번호가 올바르지 않습니다.');
    }
    return user;
  }

  static async findProfile(id) {
    const user = await this.findByPk(id);
    if (!user) throw new HttpError(404, '회원을 찾을 수 없습니다.');
    return user;
  }

  static async changeProfile(id, { nickname, password, currentPassword }) {
    const user = await this.findProfile(id);
    if (nickname !== undefined) {
      const duplicate = await this.findOne({ where: { nickname, id: { [Sequelize.Op.ne]: id } } });
      if (duplicate) throw new HttpError(409, '이미 사용 중인 닉네임입니다.');
      user.nickname = nickname;
    }
    if (password !== undefined) {
      if (!(await bcrypt.compare(currentPassword, user.password))) throw new HttpError(400, '현재 비밀번호가 일치하지 않습니다.');
      user.password = await bcrypt.hash(password, 10);
    }
    await user.save();
    return user;
  }

  static async removeProfile(id) {
    const user = await this.findByPk(id);
    if (user) await user.destroy();
  }

  static associate(db) {
    db.User.hasMany(db.Review, { foreignKey: 'userId', as: 'reviews', onDelete: 'CASCADE' });
    db.User.hasMany(db.Favorite, { foreignKey: 'userId', as: 'favorites', onDelete: 'CASCADE' });
    db.User.hasMany(db.MarketPost, { foreignKey: 'userId', as: 'marketPosts', onDelete: 'CASCADE' });
    db.User.hasMany(db.Order, { foreignKey: 'buyerId', as: 'boughtOrders', onDelete: 'CASCADE' });
    db.User.hasMany(db.RecommendHistory, { foreignKey: 'userId', as: 'recommendHistories', onDelete: 'SET NULL' });
  }
};
