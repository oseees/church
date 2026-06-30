import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import twilio from 'twilio';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);
const FROM = process.env.TWILIO_WHATSAPP_NUMBER!;

async function sendWA(to: string, body: string) {
  await twilioClient.messages.create({ body, from: FROM, to: `whatsapp:${to}` });
}

async function helpText(balance: number) {
  const products = await prisma.product.findMany({ where: { stock: { gt: 0 } } });
  const list = products.map((p) => `${p.name} @ ₦${Number(p.pricePerKg).toFixed(0)}/kg (${p.stock} left)`).join('\n');
  return `🐔 *Chicken Sales*\nBalance: ₦${balance.toFixed(2)}\n\n📦 *Available:*\n${list || '(none)'}\n\n📋 Commands:\n- *balance* — Check balance\n- *order <qty> <product>* — Place order`;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const params = new URLSearchParams(body);
  const from = params.get('From')?.replace('whatsapp:', '').trim() || '';
  const msgBody = params.get('Body')?.trim() || '';
  const messageSid = params.get('MessageSid') || '';

  if (!from) return NextResponse.json({ success: true });

  const existing = await prisma.webhookLog.findUnique({ where: { messageSid } }).catch(() => null);
  if (existing) return NextResponse.json({ success: true });

  await prisma.webhookLog.create({ data: { messageSid, status: 'success' } }).catch(() => {});

  (async () => {
    try {
      let customer = await prisma.customer.findUnique({ where: { phone: from } });
      if (!customer) {
        customer = await prisma.customer.create({
          data: { phone: from, name: from, balance: 0, creditLimit: 0 },
        });
      }

      const msg = msgBody.toLowerCase();
      let reply = '';

      if (msg === 'balance') {
        reply = `💰 Your balance: ₦${Number(customer.balance).toFixed(2)}`;
      } else if (msg.startsWith('order')) {
        const parts = msg.split(/\s+/);
        const qty = parseInt(parts[1], 10);
        const productName = parts.slice(2).join(' ');

        if (isNaN(qty) || qty <= 0 || !productName) {
          reply = '❌ Format: *order <quantity> <product>*\nExample: order 2 chicken wings';
        } else {
          const product = await prisma.product.findFirst({
            where: { name: { contains: productName, mode: 'insensitive' } },
          });

          if (!product) {
            reply = `❌ Product *"${productName}"* not found. Send any message for help.`;
          } else if (product.stock < qty) {
            reply = `❌ Only ${product.stock}kg of ${product.name} left.`;
          } else {
            const total = Number(product.pricePerKg) * qty;
            const newBalance = Number(customer.balance) + total;

            const order = await prisma.order.create({
              data: { customerId: customer.id, productId: product.id, quantity: qty, total, status: 'Confirmed' },
            });

            await prisma.transaction.create({
              data: { customerId: customer.id, type: 'SALE', amount: total, balanceAfter: newBalance, orderId: order.id },
            });

            await prisma.customer.update({ where: { id: customer.id }, data: { balance: newBalance } });
            await prisma.product.update({ where: { id: product.id }, data: { stock: { decrement: qty } } });

            reply = `✅ *Order Confirmed!*\n${qty}kg ${product.name} @ ₦${Number(product.pricePerKg).toFixed(0)}/kg\nTotal: ₦${total.toFixed(2)}\nNew balance: ₦${newBalance.toFixed(2)}`;
          }
        }
      } else {
        reply = await helpText(Number(customer.balance));
      }

      await sendWA(from, reply);
      console.log(`[${from}] ${msgBody} → replied`);
    } catch (err) {
      console.error('webhook async error:', err);
      await prisma.webhookLog.update({ where: { messageSid }, data: { status: 'failed' } }).catch(() => {});
    }
  })();

  return NextResponse.json({ success: true });
}
