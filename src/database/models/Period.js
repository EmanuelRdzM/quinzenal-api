import { Model, DataTypes } from 'sequelize';

export default class Period extends Model {
    static initModel(sequelize) {
        Period.init(
            {
                id: {
                    type: DataTypes.INTEGER,
                    autoIncrement: true,
                    primaryKey: true
                },
                startDate: {
                    type: DataTypes.DATEONLY,
                    allowNull: false
                },
                endDate: {
                    type: DataTypes.DATEONLY,
                    allowNull: false
                },
                notes: DataTypes.TEXT
            },
            {
                sequelize,
                modelName: 'Period',
                tableName: 'periods',
                timestamps: true
            }
        );
        return Period;
    }

    static associate(models) {
        this.hasMany(models.PeriodMovement, { foreignKey: 'periodId', as: 'period_movements' });
    }
};