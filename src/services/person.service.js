// src/services/person.service.js
import models, { sequelize } from '../database/models/associateModels.js';
import { Op } from 'sequelize';
import ApiError from '../shared/errors/ApiError.js';

const { Person, Debt, PersonMovement } = models;

export async function createPerson({ name, notes = null }) {
  if (!name || typeof name !== 'string') throw new ApiError('name is required', 400);
  return Person.create({ name, notes });
}

export async function listPeople({ limit = 50, offset = 0, q = null, category = null } = {}) {
  const where = {};
  if (q) where.name = { [Op.like]: `%${q}%` };

  if (category) {
    where[Op.and] = [
      sequelize.literal(`(
        EXISTS (
          SELECT 1
          FROM person_movements pm
          WHERE pm.personId = Person.id
            AND pm.category = ${sequelize.escape(category)}
        )
        OR NOT EXISTS (
          SELECT 1
          FROM person_movements pm2
          WHERE pm2.personId = Person.id
        )
      )`)
    ];
  }

  return Person.findAll({ where, order: [['name', 'ASC']], limit, offset });
}

export async function getPersonById(id) {
  const p = await Person.findByPk(id, {
    include: [
      { model: Debt, as: 'debts', include: [{ all: true }] },
      { model: PersonMovement, as: 'person_movements' }
    ]
  });
  return p;
}

export async function updatePerson(id, payload) {
  return sequelize.transaction(async (t) => {
    const p = await Person.findByPk(id, { transaction: t });
    if (!p) return null;

    const allowed = ['name', 'notes'];
    allowed.forEach(k => { if (payload[k] !== undefined) p[k] = payload[k]; });

    await p.save({ transaction: t });
    return p;
  });
}

export async function deletePerson(id) {
  return sequelize.transaction(async (t) => {
    const p = await Person.findByPk(id, { transaction: t });
    if (!p) return null;

    // opción: bloquear eliminación si tiene deudas; ahora dejamos eliminar (cascade según fk)
    await p.destroy({ transaction: t });
    return true;
  });
}

/**
 * getPersonSummary:
 * - devuelve resumen agregado: totalLent, totalPaid, balance por persona (suma de sus deudas)
 */
export async function getPersonSummary(personId) {
  const person = await Person.findByPk(personId);
  if (!person) throw new ApiError('Person not found', 404);

  const rows = await PersonMovement.findAll({
    where: { personId },
    attributes: [
      'category',
      'type',
      [sequelize.fn('SUM', sequelize.col('amount')), 'total']
    ],
    group: ['category', 'type'],
    raw: true
  });

  const buckets = {
    loan: { totalLend: 0, totalPayment: 0, balance: 0 },
    rent: { totalLend: 0, totalPayment: 0, balance: 0 }
  };

  rows.forEach((row) => {
    const category = row.category;
    if (!buckets[category]) return;

    const value = parseFloat(row.total || 0);
    if (row.type === 'lend') buckets[category].totalLend += value;
    if (row.type === 'payment') buckets[category].totalPayment += value;
  });

  buckets.loan.balance = buckets.loan.totalLend - buckets.loan.totalPayment;
  buckets.rent.balance = buckets.rent.totalLend - buckets.rent.totalPayment;

  const totalLend = buckets.loan.totalLend + buckets.rent.totalLend;
  const totalPayment = buckets.loan.totalPayment + buckets.rent.totalPayment;
  const totalBalance = totalLend - totalPayment;

  return {
    personId,
    name: person.name,
    totals: { totalLend, totalPayment, totalBalance },
    byCategory: buckets,
    debts: []
  };
}
