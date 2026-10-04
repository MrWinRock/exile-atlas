import { Queue, Worker } from "bullmq";
import { completedHour } from "../lib/currency";
import { getCurrency } from "../server/public-data";
import { putRecord, getRecord, closeDatabase } from "../server/storage";
import { logger } from "../server/logger";
import { ApiError } from "../server/responses";
if (!process.env.REDIS_URL || !process.env.DATABASE_URL)
  throw new Error("Set REDIS_URL and DATABASE_URL before starting the history worker");
const redisUrl = new URL(process.env.REDIS_URL);
const connection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port) || 6379,
  username: redisUrl.username || undefined,
  password: redisUrl.password ? decodeURIComponent(redisUrl.password) : undefined,
  db: Number(redisUrl.pathname.slice(1)) || 0,
  ...(redisUrl.protocol === "rediss:" ? { tls: {} } : {}),
};
const queue = new Queue("atlas-history", { connection });
await queue.upsertJobScheduler(
  "currency-hourly",
  { pattern: "5 * * * *" },
  {
    name: "currency",
    data: {},
    opts: {
      attempts: 3,
      backoff: { type: "exponential", delay: 60000 },
      removeOnComplete: 48,
      removeOnFail: 100,
    },
  },
);
await queue.add("currency", {}, { jobId: "startup-" + completedHour(), removeOnComplete: true });
const worker = new Worker(
  "atlas-history",
  async () => {
    const latest = completedHour();
    for (let i = 0; i < 24; i++) {
      const hour = latest - i * 3600;
      if (await getRecord("currency:" + hour)) continue;
      try {
        const data = await getCurrency(hour);
        await putRecord("currency:" + hour, data, 90 * 86400);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          logger.warn({ hour }, "Currency digest no longer available");
          continue;
        }
        throw error;
      }
    }
    logger.info("Currency history collected");
  },
  { connection, concurrency: 1 },
);
worker.on("failed", (_job, error) =>
  logger.error({ message: error.message }, "History job failed"),
);
logger.info("Bun history worker started");
for (const signal of ["SIGTERM", "SIGINT"] as const)
  process.on(signal, async () => {
    await worker.close();
    await queue.close();
    await closeDatabase();
    process.exit(0);
  });
