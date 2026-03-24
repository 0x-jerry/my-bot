import type { SessionCronJobModel } from "../generated/prisma/models";
import { Cron, CronPattern } from "croner";
import { gv } from "../global";
import { chatWithSession } from "./chat";

export interface CronJob {
  job: Cron;
  config: SessionCronJobModel;
}

export class SessionCronJobManager {
  jobs = new Map<string, CronJob>();

  /**
   * Load all cron jobs from the database and initialize them.
   */
  async initialize() {
    const cronJobs = await gv.db.sessionCronJob.findMany();

    for (const job of cronJobs) {
      if (!this.jobs.has(job.id)) {
        const cronJob = new Cron(job.cron, () => this._cronCallback(job.id));

        this.jobs.set(job.id, {
          job: cronJob,
          config: job,
        });
      }
    }
  }

  async add(cron: string, reason: string, sessionId: string) {
    const exist = await gv.db.sessionCronJob.findFirst({
      where: {
        sessionId,
        cron,
        reason,
      },
    });

    if (exist) {
      return exist;
    }

    // Check cron pattern, failed will throw an error
    new CronPattern(cron);

    const job = await gv.db.sessionCronJob.create({
      data: {
        sessionId,
        cron,
        reason,
      },
    });

    const cronJob = new Cron(job.cron, () => this._cronCallback(job.id));

    this.jobs.set(job.id, {
      job: cronJob,
      config: job,
    });

    return job;
  }

  async _cronCallback(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) {
      return;
    }

    const sessionId = job.config.sessionId;

    const session = await gv.db.session.findFirst({
      where: {
        id: sessionId,
      },
    });

    if (!session) {
      gv.sessionCronJobs.remove(job.config.id);
      return;
    }

    const newSession = await gv.db.session.create({
      data: {
        title: `Cron task for session ${session.id}`,
        agentProfile: session.agentProfile,
        metadata: JSON.stringify({ sessionId: session.id }),
        cronTask: true,
      },
    });

    const streamResult = await chatWithSession(newSession.id, [
      {
        role: "system",
        content: `You are invoked by a cron job created by yourself. The reason is: ${job.config.reason}`,
      },
    ]);

    const resp = await streamResult.response;
    const lastMsgContent = resp.messages.at(-1)?.content;

    const msg = {
      type: "message",
      sessionId: session.id,
      data: lastMsgContent || {},
    };

    gv.connectedWebsockets.forEach((ws) => {
      ws.send(JSON.stringify(msg));
    });
  }

  async remove(jobId: string) {
    const job = this.jobs.get(jobId);

    job?.job.stop();
    this.jobs.delete(jobId);

    await gv.db.sessionCronJob.delete({
      where: {
        id: jobId,
      },
    });
  }
}
