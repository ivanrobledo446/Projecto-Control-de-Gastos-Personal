import { prisma } from '@/lib/prisma';
import { createCategoryHandlers } from '../_handlers';

const handlers = createCategoryHandlers(
  'EXPENSE',
  {
    hasTransactions: 'No se puede eliminar: tiene gastos asociados.',
    childrenHasTransactions:
      'No se puede eliminar: alguna subcategoría tiene gastos.',
  },
  async (categoryIds) => {
    return prisma.transaction.count({
      where: {
        categoryId: { in: categoryIds },
        category: { kind: 'EXPENSE' },
      },
    });
  }
);

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
