import * as personService from '../services/person.service.js';

export async function createPerson(req, res, next) {
  try {
    const created = await personService.createPerson(req.body);
    return res.status(201).json(created);
  } catch (err) { next(err); }
}

export async function listPeople(req, res, next) {
  try {
    const { limit, offset, q } = req.query;
    const rows = await personService.listPeople({
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
      q
    });
    return res.json(rows);
  } catch (err) { next(err); }
}

export async function getPerson(req, res, next) {
  try {
    const id = req.params.id;
    const p = await personService.getPersonById(id);
    return res.json(p);
  } catch (err) { next(err); }
}

export async function updatePerson(req, res, next) {
  try {
    const id = req.params.id;
    const updated = await personService.updatePerson(id, req.body);
    return res.json(updated);
  } catch (err) { next(err); }
}

export async function deletePerson(req, res, next) {
  try {
    const id = req.params.id;
    const ok = await personService.deletePerson(id);
    return res.json({ deleted: ok });
  } catch (err) { next(err); }
}

export async function getPersonSummary(req, res, next) {
  try {
    const id = req.params.id;
    const summary = await personService.getPersonSummary(id);
    return res.json(summary);
  } catch (err) { next(err); }
}
