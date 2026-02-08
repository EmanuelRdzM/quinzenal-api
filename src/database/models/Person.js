import { Model, DataTypes } from 'sequelize';

export default class Person extends Model {
  static initModel(sequelize) {
    Person.init(
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
        notes: {
          type: DataTypes.TEXT,
          allowNull: true
        }
      },
      {
        sequelize,
        modelName: 'Person',
        tableName: 'people',
        timestamps: true
      }
    );
    return Person;
  }

  static associate(models) {
    this.hasMany(models.Debt, {
      foreignKey: 'personId',
      as: 'debts'
    });
  }
}
