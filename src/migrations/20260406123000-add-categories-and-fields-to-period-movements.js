'use strict';

const DEFAULT_CATEGORIES = [
  { name: 'General', slug: 'general' },
  { name: 'Comida', slug: 'comida' },
  { name: 'Transporte', slug: 'transporte' },
  { name: 'Ocio', slug: 'ocio' },
  { name: 'Entretenimiento', slug: 'entretenimiento' },
  { name: 'Estudios', slug: 'estudios' },
  { name: 'Servicios', slug: 'servicios' },
  { name: 'Salud', slug: 'salud' },
  { name: 'Hogar', slug: 'hogar' },
  { name: 'Inversion', slug: 'inversion' },
  { name: 'Ahorro', slug: 'ahorro' },
  { name: 'Trabajo', slug: 'trabajo' },
  { name: 'Otros', slug: 'otros' }
];

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    await queryInterface.createTable(
      'transaction_categories',
      {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER
        },
        name: {
          type: Sequelize.STRING(80),
          allowNull: false
        },
        slug: {
          type: Sequelize.STRING(80),
          allowNull: false,
          unique: true
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
        }
      },
      { transaction }
    );

    const now = new Date();
    await queryInterface.bulkInsert(
      'transaction_categories',
      DEFAULT_CATEGORIES.map(item => ({
        ...item,
        isActive: true,
        createdAt: now,
        updatedAt: now
      })),
      { transaction }
    );

    await queryInterface.addColumn('period_movements', 'categoryId', {
      type: Sequelize.INTEGER,
      allowNull: true
    }, { transaction });

    await queryInterface.addColumn('period_movements', 'movementDate', {
      type: Sequelize.DATEONLY,
      allowNull: true
    }, { transaction });

    await queryInterface.addColumn('period_movements', 'description', {
      type: Sequelize.TEXT,
      allowNull: true
    }, { transaction });

    const [generalRows] = await queryInterface.sequelize.query(
      "SELECT id FROM transaction_categories WHERE slug = 'general' LIMIT 1",
      { transaction }
    );

    const generalCategoryId = generalRows?.[0]?.id;

    if (!generalCategoryId) {
      throw new Error('Default category "general" was not created.');
    }

    await queryInterface.sequelize.query(
      'UPDATE period_movements SET categoryId = :generalCategoryId WHERE categoryId IS NULL',
      {
        replacements: { generalCategoryId },
        transaction
      }
    );

    await queryInterface.sequelize.query(
      'UPDATE period_movements SET movementDate = DATE(createdAt) WHERE movementDate IS NULL',
      { transaction }
    );

    await queryInterface.changeColumn('period_movements', 'categoryId', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'transaction_categories', key: 'id' },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    }, { transaction });

    await queryInterface.changeColumn('period_movements', 'movementDate', {
      type: Sequelize.DATEONLY,
      allowNull: false
    }, { transaction });

    await queryInterface.addIndex('period_movements', ['categoryId'], { transaction });
    await queryInterface.addIndex('period_movements', ['movementDate'], { transaction });
    await queryInterface.addIndex('period_movements', ['type'], { transaction });

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function down(queryInterface) {
  const transaction = await queryInterface.sequelize.transaction();

  try {
    await queryInterface.removeIndex('period_movements', ['type'], { transaction }).catch(() => {});
    await queryInterface.removeIndex('period_movements', ['movementDate'], { transaction }).catch(() => {});
    await queryInterface.removeIndex('period_movements', ['categoryId'], { transaction }).catch(() => {});

    await queryInterface.removeColumn('period_movements', 'description', { transaction });
    await queryInterface.removeColumn('period_movements', 'movementDate', { transaction });
    await queryInterface.removeColumn('period_movements', 'categoryId', { transaction });

    await queryInterface.dropTable('transaction_categories', { transaction });

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
