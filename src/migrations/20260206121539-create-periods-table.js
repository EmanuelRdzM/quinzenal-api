'use strict';

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('periods', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER
    },
    startDate: {
      type: Sequelize.DATEONLY,
      allowNull: false
    },
    endDate: {
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
}

export async function down(queryInterface) {
  await queryInterface.dropTable('periods');
}
