'use strict';

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('credits', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true, type: Sequelize.INTEGER
    },
    name: {
      type: Sequelize.STRING(200),
      allowNull: false
    },
    totalAmount: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false
    },
    months: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    monthlyAmount: {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: false
    },
    startDate: {
      type: Sequelize.DATEONLY,
      allowNull: true
    },
    notes: {
      type: Sequelize.TEXT,
      allowNull: true
    },
    createdAt: {
      allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    },
    updatedAt: {
      allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    }
  }, {
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
  });
}
export async function down(queryInterface) {
  await queryInterface.dropTable('credits');
}
