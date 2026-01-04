import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { CategoryKind } from '@prisma/client';

type Messages = {
  hasTransactions: string;
  childrenHasTransactions: string;
};

type CountTxFn = (categoryIds: string[]) => Promise<number>;

export function createCategoryHandlers(
  kind: CategoryKind,
  msgs: Messages,
  countTxByCategoryIds: CountTxFn
) {
  const GET = async (req: Request) => {
    const { searchParams } = new URL(req.url);
    const tree = searchParams.get('tree') === '1';

    if (tree) {
      const parents = await prisma.category.findMany({
        where: { parentId: null, kind },
        orderBy: { name: 'asc' },
        include: { children: { orderBy: { name: 'asc' } } },
      });
      return NextResponse.json(parents);
    }

    const categories = await prisma.category.findMany({
      where: { kind },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(categories);
  };

  const POST = async (req: Request) => {
    const body = await req.json();
    const { name, parentId, bgColor, childrenBgColor } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    // PADRE
    if (!parentId) {
      if (!bgColor || !childrenBgColor) {
        return NextResponse.json(
          {
            error:
              'bgColor and childrenBgColor are required for parent categories',
          },
          { status: 400 }
        );
      }

      const parent = await prisma.category.create({
        data: { name, parentId: null, bgColor, childrenBgColor, kind },
      });

      return NextResponse.json(parent, { status: 201 });
    }

    // SUBCATEGORÍA: validar parent del mismo kind
    const parent = await prisma.category.findFirst({
      where: { id: parentId, kind, parentId: null },
      include: { children: { select: { id: true } } },
    });

    if (!parent) {
      return NextResponse.json(
        { error: 'Parent category not found' },
        { status: 404 }
      );
    }

    const isFirstChild = parent.children.length === 0;
    let chipsColor = parent.childrenBgColor ?? null;

    if (!chipsColor) {
      if (!isFirstChild) {
        return NextResponse.json(
          { error: 'Parent has no childrenBgColor configured' },
          { status: 400 }
        );
      }
      if (!childrenBgColor) {
        return NextResponse.json(
          {
            error:
              'childrenBgColor is required for the first subcategory of this parent',
          },
          { status: 400 }
        );
      }

      chipsColor = childrenBgColor;

      await prisma.category.update({
        where: { id: parentId },
        data: { childrenBgColor: chipsColor },
      });
    }

    const child = await prisma.category.create({
      data: { name, parentId, bgColor: chipsColor, kind },
    });

    return NextResponse.json(child, { status: 201 });
  };

  const PATCH = async (req: Request) => {
    const body = await req.json();
    const { id, name, bgColor, childrenBgColor } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const category = await prisma.category.findFirst({
      where: { id, kind },
      select: { id: true, parentId: true },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    if (category.parentId) {
      const updated = await prisma.category.update({
        where: { id },
        data: {
          ...(name ? { name } : {}),
          ...(bgColor ? { bgColor } : {}),
        },
      });
      return NextResponse.json(updated);
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(bgColor ? { bgColor } : {}),
        ...(childrenBgColor ? { childrenBgColor } : {}),
      },
    });

    if (childrenBgColor) {
      await prisma.category.updateMany({
        where: { parentId: id, kind },
        data: { bgColor: childrenBgColor },
      });
    }

    return NextResponse.json(updated);
  };

  const DELETE = async (req: Request) => {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const category = await prisma.category.findFirst({
      where: { id, kind },
      select: { id: true, parentId: true },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    // ✅ bloquea si esta categoría tiene transacciones
    const txCount = await countTxByCategoryIds([id]);
    if (txCount > 0) {
      return NextResponse.json(
        { error: msgs.hasTransactions },
        { status: 400 }
      );
    }

    // ✅ si es padre, validar hijos
    if (!category.parentId) {
      const children = await prisma.category.findMany({
        where: { parentId: id, kind },
        select: { id: true },
      });

      const childIds = children.map((c) => c.id);

      if (childIds.length > 0) {
        const txChildren = await countTxByCategoryIds(childIds);
        if (txChildren > 0) {
          return NextResponse.json(
            { error: msgs.childrenHasTransactions },
            { status: 400 }
          );
        }

        await prisma.category.deleteMany({ where: { parentId: id, kind } });
      }
    }

    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  };

  return { GET, POST, PATCH, DELETE };
}
