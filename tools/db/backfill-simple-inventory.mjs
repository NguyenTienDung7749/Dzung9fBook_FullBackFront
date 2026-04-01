import { createPrismaClient, isDirectRun } from './shared.mjs';

const IN_STOCK_QUANTITY = 500;

const normalizeArguments = function (argv = []) {
  return new Set((Array.isArray(argv) ? argv : []).map((value) => String(value || '').trim()).filter(Boolean));
};

const summarizeBooks = function (books = []) {
  return (Array.isArray(books) ? books : []).reduce(function (summary, book) {
    if (book?.isSoldOut) {
      summary.soldOut += 1;
      return summary;
    }

    summary.inStock += 1;
    return summary;
  }, {
    soldOut: 0,
    inStock: 0
  });
};

const buildInventoryPatch = function (isSoldOut) {
  return {
    isSoldOut: Boolean(isSoldOut),
    trackInventory: true,
    stockQuantity: isSoldOut ? 0 : IN_STOCK_QUANTITY,
    allowBackorder: false
  };
};

export const backfillSimpleInventory = async function (prisma, options = {}) {
  const apply = Boolean(options.apply);
  const books = await prisma.book.findMany({
    orderBy: {
      id: 'asc'
    },
    select: {
      id: true,
      handle: true,
      title: true,
      isSoldOut: true,
      trackInventory: true,
      stockQuantity: true,
      allowBackorder: true
    }
  });
  const summary = summarizeBooks(books);
  const changes = books.reduce(function (items, book) {
    const nextState = buildInventoryPatch(Boolean(book.isSoldOut));
    const willChange = (
      Boolean(book.trackInventory) !== nextState.trackInventory
      || Number.isInteger(book.stockQuantity) !== Number.isInteger(nextState.stockQuantity)
      || Number(book.stockQuantity) !== Number(nextState.stockQuantity)
      || Boolean(book.allowBackorder) !== nextState.allowBackorder
    );

    if (willChange) {
      items.push({
        id: book.id,
        handle: book.handle,
        title: book.title,
        current: {
          isSoldOut: Boolean(book.isSoldOut),
          trackInventory: Boolean(book.trackInventory),
          stockQuantity: Number.isInteger(book.stockQuantity) ? book.stockQuantity : null,
          allowBackorder: Boolean(book.allowBackorder)
        },
        next: nextState
      });
    }

    return items;
  }, []);

  if (apply && changes.length > 0) {
    await prisma.$transaction(changes.map(function (change) {
      return prisma.book.update({
        where: {
          id: change.id
        },
        data: change.next
      });
    }));
  }

  return {
    apply,
    totalBooks: books.length,
    soldOutCount: summary.soldOut,
    inStockCount: summary.inStock,
    changedCount: changes.length,
    unchangedCount: books.length - changes.length,
    sample: changes.slice(0, 10)
  };
};

const printResult = function (result) {
  console.log(result.apply ? 'Simple inventory backfill applied.' : 'Simple inventory backfill dry-run.');
  console.log(`Total books: ${result.totalBooks}`);
  console.log(`Sold-out books: ${result.soldOutCount}`);
  console.log(`In-stock books: ${result.inStockCount}`);
  console.log(`Books that need changes: ${result.changedCount}`);
  console.log(`Books already matching rule: ${result.unchangedCount}`);

  if (!result.sample.length) {
    console.log('No sample changes to show.');
    return;
  }

  console.log('Sample changes:');
  result.sample.forEach(function (item) {
    console.log(`- #${item.id} ${item.handle}: ${JSON.stringify(item.current)} -> ${JSON.stringify(item.next)}`);
  });
};

const main = async function () {
  const prisma = createPrismaClient();
  const flags = normalizeArguments(process.argv.slice(2));

  try {
    const result = await backfillSimpleInventory(prisma, {
      apply: flags.has('--apply')
    });
    printResult(result);
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
