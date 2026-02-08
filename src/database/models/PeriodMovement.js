import { Model, DataTypes } from 'sequelize';

export default class PeriodMovement extends Model {
    static initModel(sequelize) {
        PeriodMovement.init(
            {
                id: {
                    type: DataTypes.INTEGER,
                    autoIncrement: true,
                    primaryKey: true
                },
                periodId: {
                    type: DataTypes.INTEGER,
                    allowNull: false
                },
                type: {
                    type: DataTypes.ENUM('income', 'expense'),
                    allowNull: false
                },
                concept: {
                    type: DataTypes.STRING(255),
                    allowNull: false
                },
                amount: {
                    type: DataTypes.DECIMAL(12, 2),
                    allowNull: false,
                    get() {
                        const value = this.getDataValue('amount');
                        return value === null ? null : parseFloat(value);
                    }
                },
                paymentMethod: {
                    type: DataTypes.ENUM('cash', 'card'),
                    allowNull: false
                }
            },
            {
                sequelize,
                modelName: 'PeriodMovement',
                tableName: 'period_movements',
                timestamps: true
            }
        );
        return PeriodMovement;
    }

    static associate(models) {
        this.belongsTo(models.Period, {
            foreignKey: 'periodId',
            as: 'period'
        });
    }
}