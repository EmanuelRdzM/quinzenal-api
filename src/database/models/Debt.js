import { Model, DataTypes } from 'sequelize';

export default class Debt extends Model {
  static initModel(sequelize) {
    Debt.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        personId: {
          type: DataTypes.INTEGER,
          allowNull: false
        },
        type: {
          type: DataTypes.ENUM('loan', 'rent'),
          allowNull: false,
          defaultValue: 'loan'
        },
        description: {
          type: DataTypes.STRING(255),
          allowNull: true
        }
      },
      {
        sequelize,
        modelName: 'Debt',
        tableName: 'debts',
        timestamps: true
      }
    );
    return Debt;
  }

  static associate(models) {
    this.belongsTo(models.Person, {
      foreignKey: 'personId',
      as: 'person'
    });

    this.hasMany(models.DebtMovement, {
      foreignKey: 'debtId',
      as: 'debt_movements'
    });
  }
}