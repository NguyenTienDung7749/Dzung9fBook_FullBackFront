import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PrismaClient } from '@prisma/client';

export const ROOT_DIR = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
export const CATALOG_ROOT = path.join(ROOT_DIR, 'assets', 'data', 'catalog');
export const CATALOG_BOOKS_ROOT = path.join(CATALOG_ROOT, 'books');
export const USERS_FILE = path.join(ROOT_DIR, 'server', 'data', 'users.json');

export const BASE_ROLES = [
  { code: 'customer', label: 'Customer' },
  { code: 'admin', label: 'Admin' }
];

export const createPrismaClient = function () {
  return new PrismaClient();
};

export const readJsonFile = async function (filePath) {
  const rawValue = await fs.readFile(filePath, 'utf8');
  return JSON.parse(rawValue);
};

export const readCategoriesJson = function () {
  return readJsonFile(path.join(CATALOG_ROOT, 'categories.json'));
};

export const readUsersJson = async function () {
  try {
    const parsed = await readJsonFile(USERS_FILE);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
};

export const listBookDetailPaths = async function () {
  const entries = await fs.readdir(CATALOG_BOOKS_ROOT, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === '.json')
    .map((entry) => path.join(CATALOG_BOOKS_ROOT, entry.name))
    .sort((first, second) => first.localeCompare(second));
};

export const readBookDetails = async function () {
  const detailPaths = await listBookDetailPaths();
  const books = await Promise.all(detailPaths.map((detailPath) => readJsonFile(detailPath)));
  return books;
};

export const seedBaseRoles = async function (prisma) {
  const roles = await Promise.all(BASE_ROLES.map((role) => {
    return prisma.role.upsert({
      where: { code: role.code },
      update: { label: role.label },
      create: role
    });
  }));

  return new Map(roles.map((role) => [role.code, role]));
};

export const toOptionalString = function (value) {
  const normalizedValue = String(value ?? '').trim();
  return normalizedValue ? normalizedValue : null;
};

export const toPathKey = function (...segments) {
  return segments
    .map((segment) => String(segment || '').trim())
    .filter(Boolean)
    .join('/');
};

export const isDirectRun = function (metaUrl) {
  const entryPoint = process.argv[1];

  if (!entryPoint) {
    return false;
  }

  return pathToFileURL(path.resolve(entryPoint)).href === metaUrl;
};
