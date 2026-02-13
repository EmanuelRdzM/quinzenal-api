// src/services/person.service.js
import models, { sequelize } from '../database/models/associateModels.js';
import { Op } from 'sequelize';
import ApiError from '../shared/errors/ApiError.js';

const { Person, Debt } = models;

export async function createPerson({ name, notes = null }) {
  if (!name || typeof name !== 'string') throw new ApiError('name is required', 400);
  return Person.create({ name, notes });
}

export async function listPeople({ limit = 50, offset = 0, q = null } = {}) {
  const where = {};
  if (q) where.name = { [Op.like]: `%${q}%` };
  return Person.findAll({ where, order: [['name', 'ASC']], limit, offset });
}

export async function getPersonById(id) {
  const p = await Person.findByPk(id, {
    include: [{ model: Debt, as: 'debts', include: [{ all: true }] }]
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

  // Traer deudas de la persona
  const debts = await Debt.findAll({ where: { personId } });

  // Para cada deuda sumar movimientos (se podría optimizar con agregación SQL)
  const summaries = await Promise.all(debts.map(async (d) => {
    // sumar movimientos por tipo
    const rows = await models.DebtMovement.findAll({
      where: { debtId: d.id },
      attributes: [
        'type',
        [sequelize.fn('SUM', sequelize.col('amount')), 'total']
      ],
      group: ['type'],
      raw: true
    });

    let totalLend = 0, totalPayment = 0;
    rows.forEach(r => {
      const v = parseFloat(r.total || 0);
      if (r.type === 'lend') totalLend += v;
      if (r.type === 'payment') totalPayment += v;
    });

    return {
      debtId: d.id,
      type: d.type,
      description: d.description,
      totalLend,
      totalPayment,
      balance: totalLend - totalPayment
    };
  }));

  const totalLend = summaries.reduce((s, x) => s + x.totalLend, 0);
  const totalPayment = summaries.reduce((s, x) => s + x.totalPayment, 0);
  const totalBalance = totalLend - totalPayment;

  return {
    personId,
    name: person.name,
    totals: { totalLend, totalPayment, totalBalance },
    debts: summaries
  };
}
