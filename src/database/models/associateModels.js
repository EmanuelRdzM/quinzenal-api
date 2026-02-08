import sequelize from '../index.js'

// Include de los Modelos
import Period from './Period.js';
import PeriodMovement from './PeriodMovement.js';
import Card from './Card.js';
import CardMovement from './CardMovement.js';
import Person from './Person.js';
import Debt from './Debt.js';
import DebtMovement from './DebtMovement.js';
import Credit from './Credit.js';
import CreditPayment from './CreditPayment.js';

const models = {};

// Inicializar modelos
models.Period = Period.initModel(sequelize);
models.PeriodMovement = PeriodMovement.initModel(sequelize);
models.Card = Card.initModel(sequelize);
models.CardMovement = CardMovement.initModel(sequelize);
models.Person = Person.initModel(sequelize);
models.Debt = Debt.initModel(sequelize);
models.DebtMovement = DebtMovement.initModel(sequelize);
models.Credit = Credit.initModel(sequelize);
models.CreditPayment = CreditPayment.initModel(sequelize);

// Crear asociaciones
Object.values(models).forEach(model => {
  if (model.associate) {
    model.associate(models);
  }
});

models.sequelize = sequelize;
models.Sequelize = sequelize.Sequelize;

export default models;
export { sequelize };