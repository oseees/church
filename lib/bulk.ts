import { Customer } from '@prisma/client';
import prisma from '@/lib/prisma';
import { enqueueJob } from '@/lib/queue';

interface SegmentFilters {
  minBalance?: number;
  maxBalance?: number;
  lastOrderAfter?: Date;
  minOrders?: number;
}

interface BulkResult {
  queuedCount: number;
  skippedCount: number;
  estimatedCompletion: string;
  customerIds: string[];
}

export async function enqueueBulkStatement(
  period: string,
  segment?: SegmentFilters
): Promise<BulkResult> {
  // ── Build customer query based on segment filters ──────────────────────
  const where: Record<string, unknown> = {};

  if (segment?.minBalance !== undefined) {
    where.balance = { ...(where.balance as object || {}), gte: segment.minBalance };
  }
  if (segment?.maxBalance !== undefined) {
    where.balance = { ...(where.balance as object || {}), lte: segment.maxBalance };
  }

  // For lastOrderAfter, we join via orders relation
  let customers: Pick<Customer, 'id' | 'phone'>[];

  if (segment?.lastOrderAfter) {
    // Find customers with orders after the given date
    const rawCustomers = await prisma.customer.findMany({
      where: {
        ...(where as any),
        orders: { some: { createdAt: { gte: segment.lastOrderAfter } } },
      },
      select: { id: true, phone: true },
    });
    customers = rawCustomers;
  } else {
    customers = await prisma.customer.findMany({
      where: where as any,
      select: { id: true, phone: true },
    });
  }

  // Further filter by minOrders if specified
  if (segment?.minOrders && segment.minOrders > 0) {
    const orderCounts = await prisma.order.groupBy({
      by: ['customerId'],
      _count: { id: true },
      having: { id: { _count: { gte: segment.minOrders } } },
    });
    const eligibleIds = new Set(orderCounts.map((o) => o.customerId));
    customers = customers.filter((c) => eligibleIds.has(c.id));
  }

  // ── Parse period for date range ──────────────────────────────────────────
  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  if (period === 'monthly') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = now;
  } else if (typeof period === 'object') {
    const p = period as any;
    startDate = new Date(p.start);
    endDate = new Date(p.end);
  } else {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = now;
  }

  // ── Enqueue generate + send jobs per customer ───────────────────────────
  let queuedCount = 0;
  const queuedIds: string[] = [];

  for (const customer of customers) {
    try {
      // Step 1: Enqueue PDF generation
      await enqueueJob('statement_generate', {
        type: 'statement_generate',
        phone: customer.phone,
        payload: {
          message: `Statement generation for ${customer.phone}`,
          customerId: customer.id,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          period: `${startDate.toLocaleDateString()} – ${endDate.toLocaleDateString()}`,
        },
      });
      queuedIds.push(customer.id);
      queuedCount++;
    } catch (err) {
      console.error(`[bulk] Failed to enqueue for customer ${customer.id}:`, err);
    }
  }

  // ── Estimate completion: ~5s per job (PDF gen + upload + send) ─────────
  const totalSeconds = queuedCount * 5;
  const estimatedCompletion = new Date(Date.now() + totalSeconds * 1000).toISOString();

  return {
    queuedCount,
    skippedCount: customers.length - queuedCount,
    estimatedCompletion,
    customerIds: queuedIds,
  };
}