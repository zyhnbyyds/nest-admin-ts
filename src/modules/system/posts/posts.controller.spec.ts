import { describe, expect, it, vi } from 'vitest';
import { PostsController } from './posts.controller';
import type { PostsService } from './posts.service';

function mockPostsService(): Partial<PostsService> {
  return {
    list: vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 20 }),
    findOne: vi
      .fn()
      .mockResolvedValue({ id: 1, name: 'Engineer', key: 'engineer' }),
    create: vi.fn().mockResolvedValue({ id: 1 }),
    update: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  };
}

describe('PostsController', () => {
  it('list returns paginated posts', async () => {
    const service = mockPostsService();
    const controller = new PostsController(service as PostsService);
    await controller.list('1', '20');
    expect(service.list).toHaveBeenCalledWith(1, 20);
  });

  it('findOne returns a post', async () => {
    const service = mockPostsService();
    const controller = new PostsController(service as PostsService);
    const result = await controller.findOne(1);
    expect(result).toHaveProperty('name', 'Engineer');
  });

  it('create creates a post', async () => {
    const service = mockPostsService();
    const controller = new PostsController(service as PostsService);
    await controller.create(
      { name: 'Engineer', key: 'engineer' },
      { user: { id: 1 } },
    );
    expect(service.create).toHaveBeenCalled();
  });

  it('update updates a post', async () => {
    const service = mockPostsService();
    const controller = new PostsController(service as PostsService);
    await controller.update(1, { name: 'Updated' }, { user: { id: 1 } });
    expect(service.update).toHaveBeenCalledWith(1, { name: 'Updated' }, 1);
  });

  it('remove deletes a post', async () => {
    const service = mockPostsService();
    const controller = new PostsController(service as PostsService);
    await controller.remove(1, { user: { id: 1 } });
    expect(service.remove).toHaveBeenCalledWith(1, 1);
  });
});
