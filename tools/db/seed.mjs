import { createPrismaClient, isDirectRun, seedBaseRoles } from './shared.mjs';
import { importCatalog } from './import-catalog.mjs';
import { importUsers } from './import-users.mjs';

export const seedDatabase = async function (prisma) {
  const rolesByCode = await seedBaseRoles(prisma);
  const catalogResult = await importCatalog(prisma);
  const usersResult = await importUsers(prisma);

  return {
    roleCount: rolesByCode.size,
    categoryCount: catalogResult.categoryCount,
    bookCount: catalogResult.bookCount,
    userCount: usersResult.userCount
  };
};

const main = async function () {
  const prisma = createPrismaClient();

  try {
    const result = await seedDatabase(prisma);
    console.log(
      `Seeded ${result.roleCount} roles, ${result.categoryCount} categories, ${result.bookCount} books, and ${result.userCount} users.`
    );
  } catch (error) {
    console.error(error.message || error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
};

if (isDirectRun(import.meta.url)) {
  await main();
}
