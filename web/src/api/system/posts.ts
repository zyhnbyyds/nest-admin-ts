import type { CreatePostBody, PageResult, Post, UpdatePostBody } from "~/types/api";
import { del, get, patch, post } from "~/request";

/** 岗位列表（分页） */
export function listPosts(page = 1, pageSize = 20) {
  return get<PageResult<Post>>("/system/posts", { page, pageSize });
}

/** 新增岗位 */
export function createPost(body: CreatePostBody) {
  return post<{ id: number }>("/system/posts", body);
}

/** 修改岗位 */
export function updatePost(id: number, body: UpdatePostBody) {
  return patch<void>(`/system/posts/${id}`, body);
}

/** 删除岗位 */
export function deletePost(id: number) {
  return del<void>(`/system/posts/${id}`);
}
