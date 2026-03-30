import { createPrismaClient, isDirectRun, readUsersJson, seedBaseRoles, toOptionalString } from './shared.mjs';

export const importUsers = async function (prisma) {
  const rolesByCode = await seedBaseRoles(prisma);
  const customerRole = rolesByCode.get('customer');

  if (!customerRole) {
    throw new Error('Missing customer role.');
  }

  const users = await readUsersJson();

  for (const user of users) {
    const email = String(user.email || '').trim().toLowerCase();

    if (!email) {
      continue;
    }

    await prisma.user.upsert({
      where: { email },
      update: {
        roleId: customerRole.id,
        passwordHash: String(user.passwordHash || '').trim(),
        name: String(user.name || '').trim(),
        phone: toOptionalString(user.phone),
        isActive: true,
        createdAt: user.createdAt ? new Date(user.createdAt) : undefined
      },
      create: {
        id: String(user.id || '').trim(),
        roleId: customerRole.id,
        email,
        passwordHash: String(user.passwordHash || '').trim(),
        name: String(user.name || '').trim(),
        phone: toOptionalString(user.phone),
        isActive: true,
        createdAt: user.createdAt ? new Date(user.createdAt) : undefined
      }
    });
  }

  return {
    userCount: users.length
  };
};

const main = async function () {
  const prisma = createPrismaClient();

  try {
    const result = await importUsers(prisma);
    console.log(`Imported ${result.userCount} users.`);
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
