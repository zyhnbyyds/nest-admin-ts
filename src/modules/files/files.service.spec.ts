import { describe, expect, it, vi } from 'vitest';
import { NotFoundException, BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { FilesService } from './files.service.js';

vi.mock('node:fs', () => ({
  createReadStream: vi.fn().mockReturnValue('stream-object'),
}));

vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  unlink: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('node:crypto', () => ({
  randomUUID: vi.fn().mockReturnValue('abc-def-ghi'),
}));

function buildChain(offsetResult: unknown = []) {
  const offsetMock = vi.fn().mockResolvedValue(offsetResult);
  // limit returns a thenable that also has .offset() for chaining
  const limitImpl = () => Object.assign(Promise.resolve([]), { offset: offsetMock });

  const chain: any = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockImplementation(limitImpl),
    offset: offsetMock,
  };
  return chain;
}

function buildDb(offsetResult?: unknown) {
  const chain = buildChain(offsetResult);
  return {
    db: {
      select: vi.fn().mockReturnValue(chain),
      insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue([{ insertId: 15 }]) }),
      delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]) }),
    },
    chain,
  };
}

function buildConfig() {
  return {
    uploadDir: 'uploads',
    apiPrefix: 'api/v1',
  };
}

function mockMultipartFile(overrides = {}) {
  return {
    filename: 'test.png',
    mimetype: 'image/png',
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('fake-image-data')),
    ...overrides,
  };
}

describe('FilesService', () => {
  describe('list', () => {
    it('returns paginated files', async () => {
      const { db } = buildDb([{ id: 1, name: 'abc.png', originalName: 'test.png', path: '/uploads/abc.png', mime: 'image/png', ext: '.png', size: 100, createdBy: null, createdAt: new Date() }]);
      const service = new FilesService({ db } as any, buildConfig() as any);
      const result = await service.list(1, 20);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toHaveProperty('url');
    });
  });

  describe('detail', () => {
    it('returns file detail', async () => {
      const { db, chain } = buildDb([]);
      chain.limit.mockImplementation(() =>
        Object.assign(Promise.resolve([{ id: 1, name: 'abc.png', originalName: 'test.png', path: '/uploads/abc.png', mime: 'image/png', ext: '.png', size: 100, createdBy: null, createdAt: new Date() }]), { offset: chain.offset })
      );
      const service = new FilesService({ db } as any, buildConfig() as any);
      const result = await service.detail(1);
      expect(result.originalName).toBe('test.png');
    });
  });

  describe('save', () => {
    it('saves an uploaded file', async () => {
      const { db } = buildDb();
      const file = mockMultipartFile();
      const service = new FilesService({ db } as any, buildConfig() as any);
      const result = await service.save(file as any, 1);
      expect(result).toHaveProperty('id', 15);
      expect(result).toHaveProperty('url');
    });

    it('throws BadRequestException for disallowed extension', async () => {
      const { db } = buildDb();
      const file = mockMultipartFile({ filename: 'evil.exe' });
      const service = new FilesService({ db } as any, buildConfig() as any);
      await expect(service.save(file as any, 1)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for empty file', async () => {
      const { db } = buildDb();
      const file = mockMultipartFile({ toBuffer: vi.fn().mockResolvedValue(Buffer.from([])) });
      const service = new FilesService({ db } as any, buildConfig() as any);
      await expect(service.save(file as any, 1)).rejects.toThrow(BadRequestException);
    });

    it('throws PayloadTooLargeException for oversized file', async () => {
      const { db } = buildDb();
      const file = mockMultipartFile({ toBuffer: vi.fn().mockResolvedValue(Buffer.alloc(11 * 1024 * 1024)) });
      const service = new FilesService({ db } as any, buildConfig() as any);
      await expect(service.save(file as any, 1)).rejects.toThrow(PayloadTooLargeException);
    });

    it('handles undefined actor id', async () => {
      const { db } = buildDb();
      const file = mockMultipartFile({ filename: 'doc.pdf' });
      const service = new FilesService({ db } as any, buildConfig() as any);
      const result = await service.save(file as any, undefined);
      expect(result).toHaveProperty('id', 15);
    });
  });

  describe('open', () => {
    it('returns file stream', async () => {
      const { db, chain } = buildDb([]);
      chain.limit.mockImplementation(() =>
        Object.assign(Promise.resolve([{ id: 1, name: 'abc.png', originalName: 'test.png', path: '/uploads/abc.png', mime: 'image/png', ext: '.png', size: 100, createdBy: null, createdAt: new Date() }]), { offset: chain.offset })
      );
      const service = new FilesService({ db } as any, buildConfig() as any);
      const result = await service.open(1);
      expect(result).toHaveProperty('stream');
      expect(result.mime).toBe('image/png');
    });
  });

  describe('remove', () => {
    it('deletes file from db and disk', async () => {
      const { db, chain } = buildDb([]);
      chain.limit.mockImplementation(() =>
        Object.assign(Promise.resolve([{ id: 1, name: 'abc.png', originalName: 'test.png', path: '/uploads/abc.png', mime: 'image/png', ext: '.png', size: 100, createdBy: null, createdAt: new Date() }]), { offset: chain.offset })
      );
      const service = new FilesService({ db } as any, buildConfig() as any);
      await expect(service.remove(1)).resolves.toBeUndefined();
    });

    it('throws NotFoundException', async () => {
      const { db, chain } = buildDb([]);
      chain.limit.mockImplementation(() =>
        Object.assign(Promise.resolve([]), { offset: chain.offset })
      );
      const service = new FilesService({ db } as any, buildConfig() as any);
      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});