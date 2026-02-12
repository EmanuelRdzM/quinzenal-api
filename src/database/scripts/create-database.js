import {Sequelize} from 'sequelize';
import {env} from '../../shared/env.js';

const dbName = env('DB_NAME');
const dbUser = env('DB_USER');
const dbPass = env('DB_PASS');
const dbHost = env('DB_HOST');
const dbDialect = env('DB_CONNECTION');

const connection = new Sequelize('', dbUser, dbPass, {
    host: dbHost,
    dialect: dbDialect,
    logging: false,
});

const createDbQuery = () => {
    switch (dbDialect) {
        case 'mysql':
        case 'mariadb':
            return `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`;
        case 'postgres':
            return `CREATE DATABASE "${dbName}" WITH ENCODING 'UTF8' LC_COLLATE='en_US.utf8' LC_CTYPE='en_US.utf8' TEMPLATE template0;`;
        case 'mssql':
            return `IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'${dbName}') CREATE DATABASE [${dbName}]`;
        case 'sqlite':
            console.log('⚠️ SQLite no requiere creación manual.');
            return null;
        default:
            throw new Error(`❌ Dialecto no soportado: ${dbDialect}`);
    }
};

try {
    const query = createDbQuery();

    if (query) {
        await connection.query(query);
        console.log(`✅ Base de datos "${dbName}" creada o ya existente.`);
    }

    await connection.close();
} catch (error) {
    console.error('❌ Error al crear la base de datos:', error.message);
    process.exit(1);
}