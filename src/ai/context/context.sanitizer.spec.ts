import { describe, expect, it } from 'vitest';
import { ContextSanitizer } from './context.sanitizer';

describe('ContextSanitizer', () => {
  const sanitizer = new ContextSanitizer();

  it('过滤敏感字段', () => {
    const result = sanitizer.sanitize({
      id: 1,
      username: 'admin',
      passwordHash: 'hashed',
      refreshToken: 'token',
      nested: {
        accessToken: 'token',
        email: 'a@b.com',
      },
    });
    expect(result).toEqual({
      id: 1,
      username: 'admin',
      nested: { email: 'a@b.com' },
    });
  });

  it('处理数组', () => {
    const result = sanitizer.sanitize([
      { id: 1, secret: 's' },
      { id: 2, password: 'p' },
    ]);
    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('保留非敏感原始值', () => {
    expect(sanitizer.sanitize('hello')).toBe('hello');
    expect(sanitizer.sanitize(42)).toBe(42);
    expect(sanitizer.sanitize(null)).toBe(null);
  });
});
