import { prisma } from '@/lib/prisma';
import { createCategoryHandlers } from '../_handlers';

const handlers = createCategoryHandlers(
  'INCOME',
  {
    hasTransactions: 'No se puede eliminar: tiene transacciones asociadas.',
    childrenHasTransactions:
      'No se puede eliminar: alguna subcategoría tiene transacciones.',
  },
  async (categoryIds) => {
    return prisma.transaction.count({
      where: {
        categoryId: { in: categoryIds },
        category: { kind: 'INCOME' },
      },
    });
  }
);

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
