export async function sendWAWithRetry(
  phone: string,
  msg: string
): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID!;
  const authToken = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_WHATSAPP_NUMBER!;

  const to = phone === 'admin'
    ? process.env.ADMIN_WHATSAPP_NUMBER || from
    : phone;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const body = new URLSearchParams({ To: `whatsapp:${to}`, From: from, Body: msg });

  const delays = [1000, 3000, 5000];

  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + btoa(`${accountSid}:${authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });
      if (res.ok) return;
      console.warn(
        `WA send attempt ${attempt + 1} failed (${res.status}): ${await res.text()}`
      );
    } catch (err) {
      console.warn(`WA send attempt ${attempt + 1} error:`, err);
    }
    if (attempt < delays.length) {
      await new Promise((r) => setTimeout(r, delays[attempt]));
    }
  }
  console.error(`WA send failed after ${delays.length + 1} attempts for ${to}`);
}
