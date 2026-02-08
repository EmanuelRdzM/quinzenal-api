'use strict';

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('debts', {
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
    type: {
      type: Sequelize.ENUM('loan', 'rent'),
      allowNull: false,
      defaultValue: 'loan'
    },
    description: {
      type: Sequelize.STRING(255),
      allowNull: true
    },
    createdAt: {
      allowNull: false, type: Sequelize.DATE,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
    },
    updatedAt: {
      allowNull: false, type: Sequelize.DATE,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
    }
  }, {
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
  });
  await queryInterface.addIndex('debts', ['personId']);
}
export async function down(queryInterface) {
  await queryInterface.dropTable('debts');
}
