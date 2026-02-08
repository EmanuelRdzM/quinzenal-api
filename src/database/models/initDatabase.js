import models, { sequelize } from './associateModels.js';

export async function initDatabase() {
    try {

        await sequelize.authenticate();

        console.log('✅ Database connected');

        // NO usar sync en producción si usas migraciones
        await sequelize.sync();

        return models;

    } catch (error) {

        console.error('❌ Database connection error:', error);

        process.exit(1);

    }
}
