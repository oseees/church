import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const { customerId, pdfUrl, channel } = await request.json();

  if (!customerId || !pdfUrl || !channel) {
    return NextResponse.json({ error: 'customerId, pdfUrl, and channel required' }, { status: 400 });
  }

  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { phone: true, name: true },
    });
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const period = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const caption = `📄 Your statement for ${period}`;

    if (channel === 'whatsapp') {
      const accountSid = process.env.TWILIO_ACCOUNT_SID!;
      const authToken = process.env.TWILIO_AUTH_TOKEN!;
      const from = process.env.TWILIO_WHATSAPP_NUMBER!;

      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const body = new URLSearchParams({
        To: `whatsapp:${customer.phone}`,
        From: from,
        Body: caption,
        MediaUrl: pdfUrl,
      });

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + btoa(`${accountSid}:${authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Twilio send failed: ${errText}`);
      }
    } else if (channel === 'email') {
      const resendKey = process.env.RESEND_API_KEY!;
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'statements@churchchicken.com';

      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: customer.phone,
          subject: `Your Statement — ${period}`,
          html: `<h2>🐔 Church Chicken Sales</h2><p>Your statement for <strong>${period}</strong> is ready.</p><p><a href="${pdfUrl}">Download PDF</a></p>`,
          attachments: [{ filename: 'statement.pdf', path: pdfUrl }],
        }),
      });

      if (!emailRes.ok) {
        const errText = await emailRes.text();
        throw new Error(`Resend send failed: ${errText}`);
      }
    } else {
      return NextResponse.json({ error: 'Invalid channel. Use "whatsapp" or "email"' }, { status: 400 });
    }

    // Log delivery to Notification table
    await prisma.notification.create({
      data: {
        customerId,
        channel,
        type: 'statement',
        status: 'sent',
        detail: pdfUrl,
      },
    });

    return NextResponse.json({ ok: true, channel, pdfUrl });
  } catch (err) {
    console.error('[statements/send] error:', err);

    // Log failure
    await prisma.notification.create({
      data: {
        customerId,
        channel,
        type: 'statement',
        status: 'failed',
        detail: String(err),
      },
    }).catch(() => {});

    return NextResponse.json({ error: 'Send failed' }, { status: 500 });
  }
}
