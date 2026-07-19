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
        cardType: {
          type: DataTypes.ENUM('debit', 'credit'),
          allowNull: false,
          defaultValue: 'debit'
        },
        initialBalance: {
          type: DataTypes.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0
        },
        creditLimit: {
          type: DataTypes.DECIMAL(12, 2),
          allowNull: true,
          defaultValue: null
        },
        statementCutoffDay: {
          type: DataTypes.INTEGER,
          allowNull: true,
          defaultValue: null
        },
        paymentDueDay: {
          type: DataTypes.INTEGER,
          allowNull: true,
          defaultValue: null
        },
        annualInterestRate: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: false,
          defaultValue: 0
        },
        minimumPaymentRate: {
          type: DataTypes.DECIMAL(5, 2),
          allowNull: false,
          defaultValue: 100
        },
        latePaymentFee: {
          type: DataTypes.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0
        },
        annualFee: {
          type: DataTypes.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0
        },
        annualFeeMonth: {
          type: DataTypes.INTEGER,
          allowNull: true,
          defaultValue: null
        },
        msiEnabled: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        availableMsiTerms: {
          type: DataTypes.JSON,
          allowNull: true,
          defaultValue: []
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
