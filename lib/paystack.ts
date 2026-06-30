const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!;
const PAYSTACK_API = 'https://api.paystack.co';

export async function createCheckout(
  amountNaira: number,
  phone: string,
  email: string
): Promise<{ authorization_url: string; reference: string }> {
  const res = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, amount: Math.round(amountNaira * 100), currency: 'NGN', metadata: { phone } }),
  });
  if (!res.ok) throw new Error(`Paystack initialize failed: ${await res.text()}`);
  const data = await res.json();
  if (!data.status) throw new Error(`Paystack error: ${data.message}`);
  return { authorization_url: data.data.authorization_url, reference: data.data.reference };
}

export async function verifyTransaction(reference: string) {
  const res = await fetch(`${PAYSTACK_API}/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
  });
  if (!res.ok) throw new Error(`Paystack verify failed: ${await res.text()}`);
  const data = await res.json();
  if (!data.status) throw new Error(`Paystack verify error: ${data.message}`);
  return data.data;
}
