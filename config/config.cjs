const { env } = require("../src/shared/env");

function safeTypeCast(field, next) {
  try {
    const t = (field.type || "").toString();
    if (/VAR_STRING|STRING|BLOB|TEXT|VARBINARY|BINARY/i.test(t)) {
      return field.string();
    }
  } catch (e) {}
  return next();
}

module.exports = {
  development: {
    username: env('DB_USER') || 'root',
    password: env('DB_PASS') || null,
    database: env('DB_NAME') || 'quinzenal_cash_flow_test',
    host: env('DB_HOST') || '127.0.0.1',
    dialect: 'mysql',
    port: env('DB_PORT'),
    logging: false,
    dialectOptions: {
      timezone: "local",
      typeCast: safeTypeCast
    }
  },
  test: {
    username: 'root',
    password: null,
    database: 'quinzenal_cash_flow_test',
    host: '127.0.0.1',
    dialect: 'mysql',
    port: env('DB_PORT'),
    logging: false
  },
  production: {
    username: env('DB_USER'),
    password: env('DB_PASS'),
    database: env('DB_NAME'),
    host: env('DB_HOST'),
    dialect: 'mysql',
    port: env('DB_PORT'),
    logging: false
  }
};
