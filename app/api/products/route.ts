import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
export const dynamic = 'force-dynamic';

export async function GET() {
  const products = await prisma.product.findMany({
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(
    products.map((p) => ({
      id: p.id,
      name: p.name,
      pricePerKg: Number(p.pricePerKg),
      stock: p.stock,
    }))
  );
}
