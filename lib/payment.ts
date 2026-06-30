// NOTE: Re-exports from @/lib/paystack.ts for backward compatibility.
// Prefer importing from @/lib/paystack.ts directly.

export { createCheckout as createPaymentLink, verifyTransaction } from '@/lib/paystack';

export async function sendReceipt(
  phone: string,
  amount: number,
  newBalance: number
) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID!;
  const authToken = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_WHATSAPP_NUMBER!;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const body = new URLSearchParams({
    To: `whatsapp:${phone}`,
    From: from,
    Body: `✅ Payment received: ₦${amount.toFixed(2)}\nNew balance: ₦${newBalance.toFixed(2)}`,
  });

  await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa(`${accountSid}:${authToken}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
}
