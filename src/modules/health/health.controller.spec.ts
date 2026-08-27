import { describe, expect, it } from 'vitest';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  it('returns health status', () => {
    const controller = new HealthController();
    const result = controller.getHealth();
    expect(result).toEqual({ code: 0, data: { status: 'ok' }, message: 'ok' });
  });
});