import { Queue, Worker, Job } from 'bullmq';
import prisma from '@/lib/prisma';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL!;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;

const connection = { url: REDIS_URL, ...(REDIS_TOKEN ? { password: REDIS_TOKEN } : {}) };

const queue = new Queue('wa-jobs', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

export interface WaJobData {
  type: 'wa_notification' | 'order_update' | 'statement_generate';
  phone: string;
  payload: {
    message: string;
    orderId?: string;
    status?: string;
    customerId?: string;
    startDate?: string;
    endDate?: string;
    period?: string;
  };
}

export async function enqueueJob(name: string, data: WaJobData): Promise<string> {
  const job = await queue.add(name, data);
  return job.id!;
}

let workerStarted = false;

export async function startWorker(): Promise<void> {
  if (workerStarted) return;
  workerStarted = true;

  const worker = new Worker<WaJobData>(
    'wa-jobs',
    async (job: Job<WaJobData>) => {
      const { phone, payload } = job.data;
      const accountSid = process.env.TWILIO_ACCOUNT_SID!;
      const authToken = process.env.TWILIO_AUTH_TOKEN!;
      const from = process.env.TWILIO_WHATSAPP_NUMBER!;

      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const body = new URLSearchParams({
        To: `whatsapp:${phone}`,
        From: from,
        Body: payload.message,
      });

      const res = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + btoa(`${accountSid}:${authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!res.ok) throw new Error(`Twilio API error ${res.status}: ${await res.text()}`);

      if (payload.orderId && payload.status) {
        await prisma.order
          .update({
            where: { id: payload.orderId },
            data: { notificationStatus: 'sent' },
          })
          .catch(() => {});
      }

      console.log(`[queue] Job ${job.id} delivered to ${phone}`);
    },
    { connection, concurrency: 5 }
  );

  console.log('[queue] Worker started');
}
