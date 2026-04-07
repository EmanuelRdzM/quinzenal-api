import { Model, DataTypes } from 'sequelize';

export default class PersonMovement extends Model {
  static initModel(sequelize) {
    PersonMovement.init(
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
        category: {
          type: DataTypes.ENUM('loan', 'rent'),
          allowNull: false,
          defaultValue: 'loan'
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
        modelName: 'PersonMovement',
        tableName: 'person_movements',
        timestamps: true
      }
    );
    return PersonMovement;
  }

  static associate(models) {
    this.belongsTo(models.Person, {
      foreignKey: 'personId',
      as: 'person'
    });
  }
}
