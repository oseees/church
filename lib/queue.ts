import { Queue, Worker, Job } from 'bullmq';
import prisma from '@/lib/prisma';

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

// ── Lazy Redis connection ──────────────────────────────────────────────────
// The Queue and connection are only created on first use, so builds and
// static page generation (where REDIS_URL isn't available) don't fail.

let _queue: Queue | null = null;
let _connection: { url: string; password?: string } | null = null;

function getConnection() {
  if (!_connection) {
    const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL!;
    const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;
    _connection = { url: REDIS_URL, ...(REDIS_TOKEN ? { password: REDIS_TOKEN } : {}) };
  }
  return _connection;
}

function getQueue(): Queue {
  if (!_queue) {
    _queue = new Queue('wa-jobs', {
      connection: getConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });
  }
  return _queue;
}

export async function enqueueJob(name: string, data: WaJobData): Promise<string> {
  const job = await getQueue().add(name, data);
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
    { connection: getConnection(), concurrency: 5 }
  );

  console.log('[queue] Worker started');
}
