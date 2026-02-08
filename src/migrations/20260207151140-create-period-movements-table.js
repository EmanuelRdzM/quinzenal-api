'use strict';

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('period_movements', {
    id: { 
      allowNull: false, 
      autoIncrement: true, 
      primaryKey: true, 
      type: Sequelize.INTEGER 
    },
    periodId: { 
      type: Sequelize.INTEGER, 
      allowNull: false, 
      references: { model: 'periods', key: 'id' }, 
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
    amount: { 
      type: Sequelize.DECIMAL(12, 2), 
      allowNull: false 
    },
    paymentMethod: { 
      type: Sequelize.ENUM('cash', 'card'), 
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
  await queryInterface.addIndex('period_movements', ['periodId']);
}
export async function down(queryInterface) {
  await queryInterface.dropTable('period_movements');
  await queryInterface.sequelize.query("DROP TYPE IF EXISTS enum_period_movements_type;").catch(() => { });
  await queryInterface.sequelize.query("DROP TYPE IF EXISTS enum_period_movements_paymentMethod;").catch(() => { });
}
