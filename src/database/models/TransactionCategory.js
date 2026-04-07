import { Model, DataTypes } from 'sequelize';

export default class TransactionCategory extends Model {
  static initModel(sequelize) {
    TransactionCategory.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        name: {
          type: DataTypes.STRING(80),
          allowNull: false
        },
        slug: {
          type: DataTypes.STRING(80),
          allowNull: false,
          unique: true
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true
        }
      },
      {
        sequelize,
        modelName: 'TransactionCategory',
        tableName: 'transaction_categories',
        timestamps: true
      }
    );

    return TransactionCategory;
  }

  static associate(models) {
    this.hasMany(models.PeriodMovement, {
      foreignKey: 'categoryId',
      as: 'movements'
    });
  }
}