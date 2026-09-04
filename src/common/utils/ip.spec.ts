import { describe, expect, it } from 'vitest';
import { resolveClientIp } from './ip';

describe('resolveClientIp', () => {
  it('优先取 x-forwarded-for 最左侧地址', () => {
    expect(
      resolveClientIp({
        ip: '10.0.0.1',
        headers: { 'x-forwarded-for': '203.0.113.9, 10.0.0.1' },
      }),
    ).toBe('203.0.113.9');
  });

  it('x-forwarded-for 为空时回退 request.ip', () => {
    expect(
      resolveClientIp({
        ip: '127.0.0.1',
        headers: { 'x-forwarded-for': '  ' },
      }),
    ).toBe('127.0.0.1');
  });

  it('无 x-forwarded-for 但有 x-real-ip 时使用 x-real-ip', () => {
    expect(
      resolveClientIp({
        ip: '127.0.0.1',
        headers: { 'x-real-ip': '198.51.100.7' },
      }),
    ).toBe('198.51.100.7');
  });

  it('无任何转发头时回退 request.ip', () => {
    expect(resolveClientIp({ ip: '192.168.1.5', headers: {} })).toBe('192.168.1.5');
  });

  it('x-forwarded-for 为数组时取第一个元素', () => {
    expect(
      resolveClientIp({
        ip: '10.0.0.1',
        headers: { 'x-forwarded-for': ['2001:db8::1', '10.0.0.1'] },
      }),
    ).toBe('2001:db8::1');
  });

  it('超过 45 字符时截断（兼容 IPv6 加端口）', () => {
    const long = '2001:0db8:85a3:0000:0000:8a2e:0370:7334:8080';
    expect(
      resolveClientIp({
        ip: '10.0.0.1',
        headers: { 'x-forwarded-for': long },
      }),
    ).toBe(long.slice(0, 45));
  });

  it('request 缺少 ip 与头时返回 undefined', () => {
    expect(resolveClientIp({})).toBeUndefined();
  });
});