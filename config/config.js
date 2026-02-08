import { env } from "../src/shared/env.js";

function safeTypeCast(field, next) {
    try {
        const t = (field.type || "").toString();

        // si el driver entrega nombres tipo VAR_STRING, STRING, BLOB, TEXT, VARBINARY...
        if (/VAR_STRING|STRING|BLOB|TINY_BLOB|MEDIUM_BLOB|LONG_BLOB|TEXT|TINY_TEXT|MEDIUM_TEXT|LONG_TEXT|VARBINARY|BINARY/i.test(t)) {
            // field.string() devuelve el valor como string (o null)
            return field.string();
        }
    } catch (err) {
        // si algo falla, dejamos que el driver haga el casteo por defecto
    }

    // next() delega al casteo por defecto
    return next();
}

const dialectOptions = {
    mysql: {
        timezone: "local",
        dateStrings: false,
        typeCast: safeTypeCast
    },
    mariadb: {
        timezone: "local",
        typeCast: safeTypeCast
    },
    postgres: {
        useUTC: false
    },
    mssql: {
        options: { useUTC: false }
    },
    sqlite: {}
}['mysql'] || {};

export default {
    development: {
        username: env('DB_USER') || 'root',
        password: env('DB_PASS') || null,
        database: env('DB_NAME') || 'quinzenal_cash_flow',
        host: env('DB_HOST') || '127.0.0.1',
        dialect: 'mysql',
        port: env('DB_PORT'),
        logging: false,
        dialectOptions
    },
    test: {
        username: 'root',
        password: null,
        database: 'quinzenal_cash_flow_test',
        host: '127.0.0.1',
        dialect: 'mysql',
        port: env('DB_PORT'),
        logging: false,
        dialectOptions
    },
    production: {
        username: env('DB_USER'),
        password: env('DB_PASS'),
        database: env('DB_NAME'),
        host: env('DB_HOST'),
        dialect: 'mysql',
        port: env('DB_PORT'),
        logging: false,
        dialectOptions
    }
}