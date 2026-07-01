import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, pricePerKg, stock } = body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
  }
  if (typeof pricePerKg !== 'number' || pricePerKg <= 0) {
    return NextResponse.json({ error: 'Price per kg must be a positive number' }, { status: 400 });
  }
  if (typeof stock !== 'number' || stock < 0 || !Number.isInteger(stock)) {
    return NextResponse.json({ error: 'Stock must be a non-negative integer' }, { status: 400 });
  }

  const product = await prisma.product.create({
    data: {
      name: name.trim(),
      pricePerKg,
      stock,
    },
  });

  return NextResponse.json({
    id: product.id,
    name: product.name,
    pricePerKg: Number(product.pricePerKg),
    stock: product.stock,
  }, { status: 201 });
}
