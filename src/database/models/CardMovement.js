import { Model, DataTypes } from 'sequelize';

export default class CardMovement extends Model {
  static initModel(sequelize) {
    CardMovement.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        cardId: {
          type: DataTypes.INTEGER,
          allowNull: false
        },
        type: {
          type: DataTypes.ENUM('income', 'expense'),
          allowNull: false
        },
        operationType: {
          type: DataTypes.ENUM('purchase', 'payment', 'refund', 'interest', 'late_fee', 'cash_advance'),
          allowNull: true,
          defaultValue: null
        },
        concept: {
          type: DataTypes.STRING(255),
          allowNull: false
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        amount: {
          type: DataTypes.DECIMAL(12, 2),
          allowNull: false
        },
        msiGroupId: {
          type: DataTypes.STRING(36),
          allowNull: true,
          defaultValue: null
        },
        installmentNumber: {
          type: DataTypes.INTEGER,
          allowNull: true,
          defaultValue: null
        },
        installments: {
          type: DataTypes.INTEGER,
          allowNull: true,
          defaultValue: null
        },
        originalPurchaseDate: {
          type: DataTypes.DATEONLY,
          allowNull: true,
          defaultValue: null
        },
        date: {
          type: DataTypes.DATEONLY,
          allowNull: false
        }
      },
      {
        sequelize,
        modelName: 'CardMovement',
        tableName: 'card_movements',
        timestamps: true
      }
    );
    return CardMovement;
  }

  static associate(models) {
    this.belongsTo(models.Card, {
      foreignKey: 'cardId',
      as: 'card'
    });
  }
}
