'use strict';

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  await queryInterface.addColumn('cards', 'cardType', {
    type: Sequelize.ENUM('debit', 'credit'),
    allowNull: false,
    defaultValue: 'debit'
  });

  await queryInterface.addColumn('cards', 'creditLimit', {
    type: Sequelize.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: null
  });

  await queryInterface.addColumn('cards', 'statementCutoffDay', {
    type: Sequelize.INTEGER,
    allowNull: true,
    defaultValue: null
  });

  await queryInterface.addColumn('cards', 'paymentDueDay', {
    type: Sequelize.INTEGER,
    allowNull: true,
    defaultValue: null
  });

  await queryInterface.addColumn('cards', 'annualInterestRate', {
    type: Sequelize.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0
  });

  await queryInterface.addColumn('cards', 'minimumPaymentRate', {
    type: Sequelize.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 100
  });

  await queryInterface.addColumn('cards', 'latePaymentFee', {
    type: Sequelize.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  });

  await queryInterface.addColumn('cards', 'msiEnabled', {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false
  });

  await queryInterface.addColumn('cards', 'availableMsiTerms', {
    type: Sequelize.JSON,
    allowNull: true,
    defaultValue: null
  });

  await queryInterface.addColumn('card_movements', 'operationType', {
    type: Sequelize.ENUM('purchase', 'payment', 'refund', 'interest', 'late_fee', 'cash_advance'),
    allowNull: true,
    defaultValue: null
  });

  await queryInterface.addColumn('card_movements', 'msiGroupId', {
    type: Sequelize.STRING(36),
    allowNull: true,
    defaultValue: null
  });

  await queryInterface.addColumn('card_movements', 'installmentNumber', {
    type: Sequelize.INTEGER,
    allowNull: true,
    defaultValue: null
  });

  await queryInterface.addColumn('card_movements', 'installments', {
    type: Sequelize.INTEGER,
    allowNull: true,
    defaultValue: null
  });

  await queryInterface.addColumn('card_movements', 'originalPurchaseDate', {
    type: Sequelize.DATEONLY,
    allowNull: true,
    defaultValue: null
  });

  await queryInterface.addIndex('card_movements', ['cardId', 'operationType', 'date'], {
    name: 'idx_card_movements_card_operation_date'
  });

  await queryInterface.addIndex('card_movements', ['msiGroupId'], {
    name: 'idx_card_movements_msi_group_id'
  });
}

export async function down(queryInterface) {
  await queryInterface.removeIndex('card_movements', 'idx_card_movements_msi_group_id');
  await queryInterface.removeIndex('card_movements', 'idx_card_movements_card_operation_date');

  await queryInterface.removeColumn('card_movements', 'originalPurchaseDate');
  await queryInterface.removeColumn('card_movements', 'installments');
  await queryInterface.removeColumn('card_movements', 'installmentNumber');
  await queryInterface.removeColumn('card_movements', 'msiGroupId');
  await queryInterface.removeColumn('card_movements', 'operationType');

  await queryInterface.removeColumn('cards', 'availableMsiTerms');
  await queryInterface.removeColumn('cards', 'msiEnabled');
  await queryInterface.removeColumn('cards', 'latePaymentFee');
  await queryInterface.removeColumn('cards', 'minimumPaymentRate');
  await queryInterface.removeColumn('cards', 'annualInterestRate');
  await queryInterface.removeColumn('cards', 'paymentDueDay');
  await queryInterface.removeColumn('cards', 'statementCutoffDay');
  await queryInterface.removeColumn('cards', 'creditLimit');
  await queryInterface.removeColumn('cards', 'cardType');
}
