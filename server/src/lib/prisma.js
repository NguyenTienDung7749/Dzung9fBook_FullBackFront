const { PrismaClient } = require('@prisma/client');

const prisma = globalThis.__dzung9fbookPrisma || new PrismaClient();

if (!globalThis.__dzung9fbookPrisma) {
  globalThis.__dzung9fbookPrisma = prisma;
}

module.exports = prisma;
