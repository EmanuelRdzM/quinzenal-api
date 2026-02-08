'use strict';

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('credit_payments', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER
    },
    creditId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'credits', key: 'id' },
      onDelete: 'CASCADE'
    },
    paymentNumber: {
      type: Sequelize.INTEGER,
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
  await queryInterface.addIndex('credit_payments', ['creditId']);
}
export async function down(queryInterface) {
  await queryInterface.dropTable('credit_payments');
}
