'use strict';

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('card_movements', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER
    },
    cardId: {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'cards', key: 'id' },
      onDelete: 'CASCADE'
    },
    type: {
      type: Sequelize.ENUM('income', 'expense'),
      allowNull: false
    },
    concept: {
      type: Sequelize.STRING(255),
      allowNull: false
    },
    description: {
      type: Sequelize.TEXT,
      allowNull: true
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
  },{
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
  });
  await queryInterface.addIndex('card_movements', ['cardId']);
}
export async function down(queryInterface) {
  await queryInterface.dropTable('card_movements');
}
