import { JobsOptions, WorkerOptions } from 'bullmq';

export const BULLMQ_DEFAULT_QUEUE = 'nue-base-cron';
export const BULLMQ_EMAIL_QUEUE = 'email_queue';
export const BULLMQ_LIEN_QUEUE = 'lien_queue';
export const BULLMQ_CONFIG_KEY = 'nue_mq';

export const BULLMQ_DEFAULT_QUEUE_JOB_OPTION: JobsOptions = {
  removeOnComplete: {
    count: 1000, // to keep last 1000 successful jobs for debugging...
    age: 24 * 3600, // or expire/remove after 24h...
  },
  removeOnFail: {
    count: 5000, // keep failed jobs longer to investigate errors...
  },
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 3000,
  },
};

const BULLMQ_LOCK_DURATION = 60 * 1000; // 1min, bull default is 30 seconds

export const BULLMQ_DEFAULT_QUEUE_SETTING: Omit<WorkerOptions, 'connection'> = {
  lockDuration: BULLMQ_LOCK_DURATION, // 30000
  maxStalledCount: 1,
  lockRenewTime: BULLMQ_LOCK_DURATION / 2,
  stalledInterval: BULLMQ_LOCK_DURATION,
  //guardInterval: 50000, // 5000
};
