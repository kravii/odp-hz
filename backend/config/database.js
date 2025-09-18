const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

const sequelize = new Sequelize({
  dialect: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME || 'dc_management',
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'rootpassword',
  logging: (msg) => logger.debug(msg),
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

module.exports = sequelize;