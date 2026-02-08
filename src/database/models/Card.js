import { Model, DataTypes } from 'sequelize';

export default class Card extends Model {
  static initModel(sequelize) {
    Card.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        name: {
          type: DataTypes.STRING(100),
          allowNull: false
        },
        initialBalance: {
          type: DataTypes.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: true
        }
      },
      {
        sequelize,
        modelName: 'Card',
        tableName: 'cards',
        timestamps: true
      }
    );
    return Card;
  }

  static associate(models) {
    this.hasMany(models.CardMovement, {
      foreignKey: 'cardId',
      as: 'card_movements'
    });
  }
}
