import type { SeesionCronJobModel } from "../generated/prisma/models";
import { Cron } from "croner";
import { gv } from "../global";

export interface CronJob {
  job: Cron
  config: SeesionCronJobModel
}

export class SessionCronJobManager {
  jobs = new Map<string, CronJob>();

  add(job: SeesionCronJobModel) {
    const cronJob = new Cron(job.cron, async () => {
      await gv.db.seesionCronJob.update({
        where: {
          id: job.id,
        },
        data: {
          lastInvokedAt: new Date(),
        },
      });
    });

    this.jobs.set(job.id, {
      job: cronJob,
      config: job,
    });
  }
}
