import { Model, DataTypes } from 'sequelize';

export default class DebtMovement extends Model {
  static initModel(sequelize) {
    DebtMovement.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        debtId: {
          type: DataTypes.INTEGER,
          allowNull: false
        },
        type: {
          type: DataTypes.ENUM('lend', 'payment'),
          allowNull: false
        },
        amount: {
          type: DataTypes.DECIMAL(12, 2),
          allowNull: false
        },
        date: {
          type: DataTypes.DATEONLY,
          allowNull: false
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true
        }
      },
      {
        sequelize,
        modelName: 'DebtMovement',
        tableName: 'debt_movements',
        timestamps: true
      }
    );
    return DebtMovement;
  }

  static associate(models) {
    this.belongsTo(models.Debt, {
      foreignKey: 'debtId',
      as: 'debt'
    });
  }
}
