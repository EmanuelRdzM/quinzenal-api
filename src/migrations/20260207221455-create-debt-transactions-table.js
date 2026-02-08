'use strict';

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('debt_movements', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER
    },
    debtId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'debts', key: 'id' }, 
      onDelete: 'CASCADE'
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
      type: Sequelize.TEXT, allowNull: true
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
  await queryInterface.addIndex('debt_movements', ['debtId']);
}
export async function down(queryInterface) {
  await queryInterface.dropTable('debt_movements');
}
