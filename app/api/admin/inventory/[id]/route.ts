import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { stock } = await request.json();

  if (typeof stock !== 'number' || stock < 0 || !Number.isInteger(stock)) {
    return NextResponse.json(
      { error: 'stock must be a non-negative integer' },
      { status: 400 }
    );
  }

  const product = await prisma.product.findUnique({
    where: { id: params.id },
  });

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  const updated = await prisma.product.update({
    where: { id: params.id },
    data: { stock },
  });

  return NextResponse.json({ id: updated.id, stock: updated.stock });
}
