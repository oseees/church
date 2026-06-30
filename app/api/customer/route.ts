import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const phone = request.nextUrl.searchParams.get('phone');
  if (!phone) return NextResponse.json({ error: 'phone required' }, { status: 400 });

  const customer = await prisma.customer.findUnique({ where: { phone } });
  if (!customer) return NextResponse.json({ error: 'not found' }, { status: 404 });

  return NextResponse.json({
    id: customer.id,
    phone: customer.phone,
    name: customer.name,
    balance: Number(customer.balance),
  });
}
