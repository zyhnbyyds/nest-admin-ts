import { describe, expect, it } from 'vitest';
import { legacy, mapMenuType, mapStatus, slugify } from './legacy.js';

describe('legacy compatibility helpers', () => {
  it('wraps data in the legacy envelope', () => {
    expect(legacy({ id: 1 })).toEqual({
      code: 200,
      data: { id: 1 },
      message: 'success',
    });
    expect(legacy(null, '创建成功')).toEqual({
      code: 200,
      data: null,
      message: '创建成功',
    });
  });

  it('maps legacy numeric status to the new enum', () => {
    expect(mapStatus(0)).toBe('active');
    expect(mapStatus(1)).toBe('disabled');
    expect(mapStatus(undefined)).toBe('active');
  });

  it('maps legacy menu types', () => {
    expect(mapMenuType('T')).toBe('M');
    expect(mapMenuType('M')).toBe('C');
    expect(mapMenuType('B')).toBe('F');
    expect(mapMenuType(undefined)).toBe('M');
  });

  it('slugifies role names into stable keys', () => {
    expect(slugify('System Admin')).toBe('system_admin');
    expect(slugify('')).toBe('role');
  });
});
