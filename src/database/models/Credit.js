import { Model, DataTypes } from 'sequelize';

export default class Credit extends Model {
  static initModel(sequelize) {
    Credit.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        name: {
          type: DataTypes.STRING(200),
          allowNull: false
        },
        totalAmount: {
          type: DataTypes.DECIMAL(12, 2),
          allowNull: false
        },
        months: {
          type: DataTypes.INTEGER,
          allowNull: false
        },
        monthlyAmount: {
          type: DataTypes.DECIMAL(12, 2),
          allowNull: false
        },
        startDate: {
          type: DataTypes.DATEONLY,
          allowNull: true
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true
        }
      },
      {
        sequelize,
        modelName: 'Credit',
        tableName: 'credits',
        timestamps: true
      }
    );
    return Credit;
  }

  static associate(models) {
    this.hasMany(models.CreditPayment, {
      foreignKey: 'creditId',
      as: 'payments'
    });
  }
}
