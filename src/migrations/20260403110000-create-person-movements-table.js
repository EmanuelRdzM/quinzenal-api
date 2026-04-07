'use strict';

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('person_movements', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER
    },
    personId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'people', key: 'id' },
      onDelete: 'CASCADE'
    },
    category: {
      type: Sequelize.ENUM('loan', 'rent'),
      allowNull: false,
      defaultValue: 'loan'
    },
    type: {
      type: Sequelize.ENUM('lend', 'payment'),
      allowNull: false
    },
    amount: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false
    },
    date: {
      type: Sequelize.DATEONLY,
      allowNull: false
    },
    notes: {
      type: Sequelize.TEXT,
      allowNull: true
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
  }, {
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
  });

  await queryInterface.addIndex('person_movements', ['personId']);
  await queryInterface.addIndex('person_movements', ['personId', 'category']);
  await queryInterface.addIndex('person_movements', ['date']);

  // Migrate existing debt movements to the new direct person movement model.
  await queryInterface.sequelize.query(`
    INSERT INTO person_movements (personId, category, type, amount, date, notes, createdAt, updatedAt)
    SELECT d.personId, d.type, dm.type, dm.amount, dm.date, dm.notes, dm.createdAt, dm.updatedAt
    FROM debt_movements dm
    INNER JOIN debts d ON d.id = dm.debtId
  `);
}

export async function down(queryInterface) {
  await queryInterface.dropTable('person_movements');
}
