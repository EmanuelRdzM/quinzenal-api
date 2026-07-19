'use strict';

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn('cards', 'annualFee', {
    type: Sequelize.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  });

  await queryInterface.addColumn('cards', 'annualFeeMonth', {
    type: Sequelize.INTEGER,
    allowNull: true,
    defaultValue: null
  });
}

export async function down(queryInterface) {
  await queryInterface.removeColumn('cards', 'annualFeeMonth');
  await queryInterface.removeColumn('cards', 'annualFee');
}
