'use strict';

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  await queryInterface.changeColumn('cards', 'minimumPaymentRate', {
    type: Sequelize.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 100
  });

  await queryInterface.changeColumn('cards', 'msiEnabled', {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.changeColumn('cards', 'minimumPaymentRate', {
    type: Sequelize.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 10
  });

  await queryInterface.changeColumn('cards', 'msiEnabled', {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: true
  });
}
