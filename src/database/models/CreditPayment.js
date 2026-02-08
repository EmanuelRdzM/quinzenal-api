import { Model, DataTypes } from 'sequelize';

export default class CreditPayment extends Model {
  static initModel(sequelize) {
    CreditPayment.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        creditId: {
          type: DataTypes.INTEGER,
          allowNull: false
        },
        paymentNumber: {
          type: DataTypes.INTEGER,
          allowNull: false
        },
        amount: {
          type: DataTypes.DECIMAL(12, 2),
          allowNull: false
        },
        date: {
          type: DataTypes.DATEONLY,
          allowNull: false
        }
      },
      {
        sequelize,
        modelName: 'CreditPayment',
        tableName: 'credit_payments',
        timestamps: true
      }
    );
    return CreditPayment;
  }

  static associate(models) {
    this.belongsTo(models.Credit, {
      foreignKey: 'creditId',
      as: 'credit'
    });
  }
}
