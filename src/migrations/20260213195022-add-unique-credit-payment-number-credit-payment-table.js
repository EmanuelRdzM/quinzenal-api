'use strict';

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface) {
  await queryInterface.addConstraint('credit_payments', {
    fields: ['creditId', 'paymentNumber'],
    type: 'unique',
    name: 'uq_credit_payments_creditId_paymentNumber'
  });
}

export async function down(queryInterface) {
  await queryInterface.removeConstraint(
    'credit_payments',
    'uq_credit_payments_creditId_paymentNumber'
  );
}