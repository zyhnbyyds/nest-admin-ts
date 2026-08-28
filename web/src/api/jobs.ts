import type { CreateJobBody, Job, JobLog, PageResult, UpdateJobBody } from "~/types/api";
import { del, get, patch, post } from "~/request";

/** 任务列表（分页） */
export function listJobs(page = 1, pageSize = 20) {
  return get<PageResult<Job>>("/system/jobs", { page, pageSize });
}

/** 任务执行日志（分页） */
export function listJobLogs(jobId: number, page = 1, pageSize = 20) {
  return get<PageResult<JobLog>>(`/system/jobs/${jobId}/logs`, { page, pageSize });
}

/** 新增任务 */
export function createJob(body: CreateJobBody) {
  return post<{ id: number }>("/system/jobs", body);
}

/** 手动执行任务 */
export function runJob(id: number) {
  return post<void>(`/system/jobs/${id}/run`);
}

/** 修改任务 */
export function updateJob(id: number, body: UpdateJobBody) {
  return patch<void>(`/system/jobs/${id}`, body);
}

/** 清空任务日志 */
export function clearJobLogs() {
  return del<void>("/system/jobs/logs");
}

/** 删除任务 */
export function deleteJob(id: number) {
  return del<void>(`/system/jobs/${id}`);
}
