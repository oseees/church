import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { enqueueJob } from '@/lib/queue';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { status } = await request.json();

  const validStatuses = ['Pending', 'Confirmed', 'Delivered'];
  if (!validStatuses.includes(status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
      { status: 400 }
    );
  }

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { customer: { select: { phone: true } } },
  });

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const updated = await prisma.order.update({
    where: { id: params.id },
    data: {
      status,
      notificationStatus: 'pending',
    },
  });

  // Enqueue WhatsApp notification via BullMQ — returns 200 instantly
  enqueueJob('order_update', {
    type: 'order_update',
    phone: order.customer.phone,
    payload: {
      orderId: order.id,
      status,
      message: `📋 Order #${order.id.substring(0, 8)} → ${status}`,
    },
  }).catch((err) => console.error('Queue enqueue failed:', err));

  return NextResponse.json({ id: updated.id, status: updated.status });
}
