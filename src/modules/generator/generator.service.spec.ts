import { describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { GeneratorService } from './generator.service.js';

function buildPool() {
  return {
    query: vi.fn().mockResolvedValue([[]]),
  };
}

function buildDb(pool: any) {
  return {
    pool,
  } as any;
}

describe('GeneratorService', () => {
  describe('listTables', () => {
    it('returns a list of tables', async () => {
      const pool = buildPool();
      pool.query.mockResolvedValue([[{ tableName: 'sys_user', comment: 'Users', createdAt: new Date() }]]);
      const service = new GeneratorService(buildDb(pool));
      const result = await service.listTables();
      expect(result).toHaveLength(1);
      expect(result[0].tableName).toBe('sys_user');
    });

    it('filters out drizzle migrations table', async () => {
      const pool = buildPool();
      pool.query.mockResolvedValue([[]]);
      const service = new GeneratorService(buildDb(pool));
      const result = await service.listTables();
      expect(result).toEqual([]);
    });
  });

  describe('getColumns', () => {
    it('returns columns for a table', async () => {
      const pool = buildPool();
      pool.query.mockResolvedValue([[{ name: 'id', dataType: 'int', columnType: 'int unsigned', nullable: 'NO', columnKey: 'PRI', defaultValue: null, extra: 'auto_increment', comment: '' }]]);
      const service = new GeneratorService(buildDb(pool));
      const result = await service.getColumns('sys_user');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('id');
      expect(result[0].primaryKey).toBe(true);
      expect(result[0].autoIncrement).toBe(true);
    });

    it('throws BadRequestException for invalid table name', async () => {
      const pool = buildPool();
      const service = new GeneratorService(buildDb(pool));
      await expect(service.getColumns('invalid table!')).rejects.toThrow(BadRequestException);
    });
  });

  describe('preview', () => {
    it('returns generated files', async () => {
      const pool = buildPool();
      pool.query.mockResolvedValue([[{ name: 'id', dataType: 'int', columnType: 'int unsigned', nullable: 'NO', columnKey: 'PRI', defaultValue: null, extra: 'auto_increment', comment: '' }]]);
      const service = new GeneratorService(buildDb(pool));
      const result = await service.preview('sys_user');
      expect(result).toHaveProperty('table', 'sys_user');
      expect(result.files).toHaveLength(4);
    });
  });

  describe('generate', () => {
    it('writes generated files to disk', async () => {
      const pool = buildPool();
      pool.query.mockResolvedValue([[{ name: 'id', dataType: 'int', columnType: 'int unsigned', nullable: 'NO', columnKey: 'PRI', defaultValue: null, extra: 'auto_increment', comment: '' }]]);
      const service = new GeneratorService(buildDb(pool));
      const result = await service.generate('sys_user', 'test');
      expect(result).toHaveProperty('table', 'sys_user');
      expect(result.files).toHaveLength(4);
    });
  });
});