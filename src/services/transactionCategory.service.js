import models from '../database/models/associateModels.js';

const { TransactionCategory, PeriodMovement } = models;

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function listCategories({ activeOnly = true } = {}) {
  const where = activeOnly ? { isActive: true } : {};
  return TransactionCategory.findAll({
    where,
    order: [['name', 'ASC']]
  });
}

export async function createCategory({ name }) {
  if (!name || typeof name !== 'string') {
    throw new Error('name is required');
  }

  const cleanName = name.trim();
  if (!cleanName) {
    throw new Error('name is required');
  }

  const baseSlug = slugify(cleanName);
  if (!baseSlug) {
    throw new Error('invalid category name');
  }

  let slug = baseSlug;
  let counter = 1;
  while (await TransactionCategory.findOne({ where: { slug } })) {
    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }

  return TransactionCategory.create({
    name: cleanName,
    slug,
    isActive: true
  });
}

export async function updateCategory(id, payload = {}) {
  const category = await TransactionCategory.findByPk(id);
  if (!category) return null;

  if (payload.name !== undefined) {
    const cleanName = String(payload.name || '').trim();
    if (!cleanName) throw new Error('name is required');

    const baseSlug = slugify(cleanName);
    if (!baseSlug) throw new Error('invalid category name');

    let slug = baseSlug;
    let counter = 1;
    while (true) {
      const existing = await TransactionCategory.findOne({ where: { slug } });
      if (!existing || existing.id === category.id) break;
      counter += 1;
      slug = `${baseSlug}-${counter}`;
    }

    category.name = cleanName;
    category.slug = slug;
  }

  if (payload.isActive !== undefined) {
    category.isActive = Boolean(payload.isActive);
  }

  await category.save();
  return category;
}

export async function deleteCategory(id) {
  const category = await TransactionCategory.findByPk(id);
  if (!category) return null;

  const usageCount = await PeriodMovement.count({ where: { categoryId: id } });
  if (usageCount > 0) {
    throw new Error('Category has related movements. Deactivate it to keep historical records.');
  }

  await category.destroy();
  return true;
}
