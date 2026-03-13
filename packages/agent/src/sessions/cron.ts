import type { SeesionCronJobModel } from "../generated/prisma/models";
import { Cron } from "croner";
import { gv } from "../global";

export interface CronJob {
  job: Cron;
  config: SeesionCronJobModel;
}

export class SessionCronJobManager {
  jobs = new Map<string, CronJob>();

  async add(cron: string, reason: string, sessionId: string) {
    const exist = await gv.db.seesionCronJob.findFirst({
      where: {
        sessionId,
        cron,
        reason,
      },
    });

    if (exist) {
      return exist
    }

    const job = await gv.db.seesionCronJob.create({
      data: {
        sessionId,
        cron,
        reason,
      },
    });

    const cronJob = new Cron(job.cron, async () => {
      // todo
    });

    this.jobs.set(job.id, {
      job: cronJob,
      config: job,
    });

    return job
  }

  async remove(jobId: string) {
    const job = this.jobs.get(jobId);

    job?.job.stop();
    this.jobs.delete(jobId);

    await gv.db.seesionCronJob.delete({
      where: {
        id: jobId,
      },
    });
  }
}
