import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { and, desc, eq, isNotNull, isNull, lt, ne, or } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service.js';
import { jobLogs, jobs, refreshTokens } from '../../database/schema/index.js';

export type CreateJobInput = { name: string; handler: string; cron: string; status?: 'active' | 'disabled' | undefined; concurrent?: boolean | undefined; remark?: string | undefined };
export type UpdateJobInput = { name?: string | undefined; handler?: string | undefined; cron?: string | undefined; status?: 'active' | 'disabled' | undefined; concurrent?: boolean | undefined; remark?: string | null | undefined };

type JobRow = typeof jobs.$inferSelect;
type JobHandler = () => Promise<void>;

@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobsService.name);
  private readonly handlers = new Map<string, JobHandler>();
  private readonly running = new Set<number>();

  constructor(private readonly database: DatabaseService, private readonly scheduler: SchedulerRegistry) {
    this.handlers.set('noop', async () => {});
    this.handlers.set('cleanExpiredRefreshTokens', async () => {
      await this.database.db.delete(refreshTokens).where(or(lt(refreshTokens.expiresAt, new Date()), isNotNull(refreshTokens.revokedAt)));
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      const rows = await this.database.db.select().from(jobs).where(and(eq(jobs.status, 'active'), isNull(jobs.deletedAt)));
      for (const job of rows) this.schedule(job);
    } catch (error) {
      this.logger.warn(`Unable to load scheduled jobs: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    for (const name of [...this.scheduler.getCronJobs().keys()]) {
      try { this.scheduler.getCronJob(name).stop(); } catch { /* ignore */ }
      this.scheduler.deleteCronJob(name);
    }
  }

  async list(page: number, pageSize: number) {
    const items = await this.database.db.select().from(jobs).where(isNull(jobs.deletedAt)).orderBy(desc(jobs.id)).limit(pageSize).offset((page - 1) * pageSize);
    return { items, page, pageSize };
  }

  async findOne(id: number): Promise<JobRow> {
    const [job] = await this.database.db.select().from(jobs).where(and(eq(jobs.id, id), isNull(jobs.deletedAt))).limit(1);
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  async create(input: CreateJobInput, actorId: number): Promise<{ id: number }> {
    this.assertHandler(input.handler);
    this.assertCron(input.cron);
    await this.assertHandlerUnique(input.handler);
    const result = await this.database.db.insert(jobs).values({ ...withoutUndefined(input), createdBy: actorId, updatedBy: actorId });
    const id = Number(result[0].insertId);
    this.schedule(await this.findOne(id));
    return { id };
  }

  async update(id: number, input: UpdateJobInput, actorId: number): Promise<void> {
    const existing = await this.findOne(id);
    const patch = withoutUndefined(input);
    if (patch.handler) {
      this.assertHandler(patch.handler);
      if (patch.handler !== existing.handler) await this.assertHandlerUnique(patch.handler, id);
    }
    if (patch.cron) this.assertCron(patch.cron);
    await this.database.db.update(jobs).set({ ...patch, updatedBy: actorId }).where(and(eq(jobs.id, id), isNull(jobs.deletedAt)));
    this.schedule(await this.findOne(id));
  }

  async remove(id: number, actorId: number): Promise<void> {
    await this.findOne(id);
    this.unschedule(id);
    await this.database.db.update(jobs).set({ deletedAt: new Date(), updatedBy: actorId }).where(and(eq(jobs.id, id), isNull(jobs.deletedAt)));
  }

  async runNow(id: number): Promise<{ success: true }> {
    const job = await this.findOne(id);
    const handler = this.handlers.get(job.handler);
    if (!handler) throw new BadRequestException('Unknown job handler');
    await this.execute(job, handler);
    return { success: true };
  }

  async listLogs(jobId: number, page: number, pageSize: number) {
    const items = await this.database.db.select().from(jobLogs).where(eq(jobLogs.jobId, jobId)).orderBy(desc(jobLogs.id)).limit(pageSize).offset((page - 1) * pageSize);
    return { items, page, pageSize };
  }

  async clearLogs(): Promise<void> {
    await this.database.db.delete(jobLogs);
  }

  private schedule(job: JobRow): void {
    this.unschedule(job.id);
    if (job.status !== 'active') return;
    const handler = this.handlers.get(job.handler);
    if (!handler) return;
    const cronJob = new CronJob(job.cron, () => { void this.execute(job, handler); });
    this.scheduler.addCronJob(this.cronName(job.id), cronJob);
    cronJob.start();
  }

  private unschedule(id: number): void {
    const name = this.cronName(id);
    if (this.scheduler.doesExist('cron', name)) {
      try { this.scheduler.getCronJob(name).stop(); } catch { /* ignore */ }
      this.scheduler.deleteCronJob(name);
    }
  }

  private cronName(id: number): string { return `job:${id}`; }

  private async execute(job: JobRow, handler: JobHandler): Promise<void> {
    if (!job.concurrent && this.running.has(job.id)) return;
    this.running.add(job.id);
    const startedAt = new Date();
    try {
      await handler();
      await this.recordLog(job, 'success', null, startedAt, new Date());
    } catch (error) {
      await this.recordLog(job, 'failure', messageOf(error), startedAt, new Date());
    } finally {
      this.running.delete(job.id);
    }
  }

  private async recordLog(job: JobRow, status: 'success' | 'failure', message: string | null, startedAt: Date, finishedAt: Date): Promise<void> {
    try {
      await this.database.db.insert(jobLogs).values({ jobId: job.id, jobName: job.name, handler: job.handler, status, message, startedAt, finishedAt, durationMs: finishedAt.getTime() - startedAt.getTime() });
    } catch (error) {
      this.logger.warn(`Failed to record job log: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private assertHandler(handler: string): void {
    if (!this.handlers.has(handler)) throw new BadRequestException(`Unknown job handler: ${handler}`);
  }

  private assertCron(cron: string): void {
    try { new CronJob(cron, () => {}); } catch { throw new BadRequestException('Invalid cron expression'); }
  }

  private async assertHandlerUnique(handler: string, excludeId?: number): Promise<void> {
    const conditions = [eq(jobs.handler, handler), isNull(jobs.deletedAt)];
    if (excludeId !== undefined) conditions.push(ne(jobs.id, excludeId));
    const [duplicate] = await this.database.db.select({ id: jobs.id }).from(jobs).where(and(...conditions)).limit(1);
    if (duplicate) throw new ConflictException('Job handler already exists');
  }
}

function withoutUndefined<T extends object>(value: T): { [K in keyof T]: Exclude<T[K], undefined> } { return Object.fromEntries(Object.entries(value).filter(([, field]) => field !== undefined)) as { [K in keyof T]: Exclude<T[K], undefined> }; }
function messageOf(error: unknown): string { const message = error instanceof Error ? error.message : String(error); return message.slice(0, 2000); }
