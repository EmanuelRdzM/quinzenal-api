import { Op } from 'sequelize';
import { parseISO, isValid } from 'date-fns';
import models, { sequelize } from '../database/models/associateModels.js';
import ApiError from '../shared/errors/ApiError.js';

const { Person, PersonMovement } = models;

function validateDate(date) {
  if (!date) throw new ApiError('date is required (YYYY-MM-DD)', 400);
  const parsed = parseISO(date);
  if (!isValid(parsed)) throw new ApiError('date must be a valid YYYY-MM-DD', 400);
}

function validatePayload({ personId, category, type, amount, date }) {
  if (!personId) throw new ApiError('personId is required', 400);
  if (!['loan', 'rent'].includes(category)) {
    throw new ApiError('category must be "loan" or "rent"', 400);
  }
  if (!['lend', 'payment'].includes(type)) {
    throw new ApiError('type must be "lend" or "payment"', 400);
  }
  if (category === 'rent' && type === 'lend') {
    throw new ApiError('rent category only supports "payment" movements', 400);
  }

  const parsedAmount = parseFloat(amount);
  if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
    throw new ApiError('amount must be a positive number', 400);
  }

  validateDate(date);
}

export async function createPersonMovement(payload) {
  validatePayload(payload);

  return sequelize.transaction(async (t) => {
    const person = await Person.findByPk(payload.personId, { transaction: t });
    if (!person) throw new ApiError('Person not found', 404);

    return PersonMovement.create(
      {
        personId: payload.personId,
        category: payload.category,
        type: payload.type,
        amount: parseFloat(payload.amount),
        date: payload.date,
        notes: payload.notes || null
      },
      { transaction: t }
    );
  });
}

export async function listPersonMovements({
  personId,
  category = null,
  fromDate = null,
  toDate = null,
  limit = 500,
  offset = 0
} = {}) {
  const where = {};
  if (personId) where.personId = personId;
  if (category) where.category = category;

  if (fromDate || toDate) {
    where.date = {};
    if (fromDate) where.date[Op.gte] = fromDate;
    if (toDate) where.date[Op.lte] = toDate;
  }

  return PersonMovement.findAll({
    where,
    include: [{ model: Person, as: 'person' }],
    order: [['date', 'DESC'], ['id', 'DESC']],
    limit,
    offset
  });
}

export async function getPersonMovementById(id) {
  return PersonMovement.findByPk(id, {
    include: [{ model: Person, as: 'person' }]
  });
}

export async function updatePersonMovement(id, payload) {
  return sequelize.transaction(async (t) => {
    const movement = await PersonMovement.findByPk(id, { transaction: t });
    if (!movement) return null;

    if (payload.personId && payload.personId !== movement.personId) {
      const person = await Person.findByPk(payload.personId, { transaction: t });
      if (!person) throw new ApiError('Target personId not found', 404);
      movement.personId = payload.personId;
    }

    const allowed = ['category', 'type', 'amount', 'date', 'notes'];
    allowed.forEach((key) => {
      if (payload[key] !== undefined) movement[key] = payload[key];
    });

    validatePayload({
      personId: movement.personId,
      category: movement.category,
      type: movement.type,
      amount: movement.amount,
      date: movement.date
    });

    movement.amount = parseFloat(movement.amount);
    await movement.save({ transaction: t });
    return movement;
  });
}

export async function deletePersonMovement(id) {
  return sequelize.transaction(async (t) => {
    const movement = await PersonMovement.findByPk(id, { transaction: t });
    if (!movement) return null;
    await movement.destroy({ transaction: t });
    return true;
  });
}
